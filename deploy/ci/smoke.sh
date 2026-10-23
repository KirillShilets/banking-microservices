#!/usr/bin/env bash
# =============================================================================
# smoke.sh — end-to-end smoke test for the kind/CI deployment.
#
# Preconditions (set by the e2e GitHub Actions workflow):
#   - a kind cluster with the full platform deployed (bootstrap.sh)
#   - ENV_FILE with CI realm creds: CI_USER (default customer.kira),
#     CI_PASS (the realm user's temporary=false password, from the realm file)
#   - kubectl, curl, jq, yq available
#
# Exits non-zero on any failed assertion.
# =============================================================================
set -euo pipefail

NAMESPACE="${NAMESPACE:-bank}"
CI_USER="${CI_USER:-customer.kira}"
CI_PASS="${CI_PASS:?set CI_PASS (password of $CI_USER in the CI realm)}"
REALM="${REALM:-bank-realm}"
LOCAL_PORT="${LOCAL_PORT:-18080}"
# Ingress hostnames (see helm ingress rules). curl resolves them to the
# local port-forward instead of relying on external DNS or /etc/hosts.
APP_URL="http://app.localhost:${LOCAL_PORT}"
API_URL="http://api.localhost:${LOCAL_PORT}"
KEYCLOAK_URL="${KEYCLOAK_URL:-http://keycloak.localhost:${LOCAL_PORT}}"
RESOLVE=(
    --resolve "app.localhost:${LOCAL_PORT}:127.0.0.1"
    --resolve "api.localhost:${LOCAL_PORT}:127.0.0.1"
    --resolve "keycloak.localhost:${LOCAL_PORT}:127.0.0.1"
)

echo "==> Checking deployments are ready (readyReplicas == replicas)"
DEPLOYMENTS="bank-account-service bank-bill-service bank-deposit-service bank-notification-service bank-gateway-service bank-frontend"
for dep in $DEPLOYMENTS; do
    desired=$(kubectl -n "$NAMESPACE" get deploy "$dep" -o jsonpath='{.spec.replicas}')
    ready=$(kubectl -n "$NAMESPACE" get deploy "$dep" -o jsonpath='{.status.readyReplicas}')
    echo "  $dep: ready $ready / $desired"
    [[ "${ready:-0}" -ge "${desired:-1}" ]] || { echo "FAIL: $dep not ready"; exit 1; }
done

echo "==> Checking backend Services exist"
for svc in bank-account-service bank-bill-service bank-deposit-service; do
    kubectl -n "$NAMESPACE" get svc "$svc" >/dev/null || { echo "FAIL: service $svc missing"; exit 1; }
    echo "  $svc OK"
done

echo "==> Checking no pod restarts"
for dep in $DEPLOYMENTS; do
    restarts=$(kubectl -n "$NAMESPACE" get pods -l "app.kubernetes.io/name=${dep#bank-}" -o jsonpath='{.items[*].status.containerStatuses[*].restartCount}' 2>/dev/null || echo 0)
    total=0
    for r in $restarts; do total=$((total + r)); done
    echo "  $dep restarts: $total"
    [[ "$total" -eq 0 ]] || { echo "FAIL: $dep has pod restarts"; exit 1; }
done

# If another port-forward is already serving on LOCAL_PORT, reuse it
# instead of spawning a duplicate (avoids "bind: address already in use").
# Detect whether a port-forward is already listening.
# We cannot use `if curl ... | grep` under set -e: any curl failure (exit
# 7 connection refused, exit 23 on msys2/git-bash) would abort the script
# before we get a chance to start the port-forward. The probe therefore
# always prints an HTTP code, mapping failures to 000.
probe_health() {
    curl -s -o /dev/null -w '%{http_code}' \
        "http://127.0.0.1:${LOCAL_PORT}/healthz" 2>/dev/null || echo 000
}

case "$(probe_health)" in
    200)
        echo "==> Using existing port-forward on :${LOCAL_PORT}"
        PF_PID=""
        ;;
    *)
        echo "==> Port-forwarding ingress-nginx controller :${LOCAL_PORT} -> 80"
        kubectl -n ingress-nginx port-forward svc/ingress-nginx-controller "${LOCAL_PORT}:80" >/tmp/port-forward.log 2>&1 &
        PF_PID=$!
        trap 'kill "$PF_PID" 2>/dev/null || true' EXIT
        for i in $(seq 1 20); do
            [[ "$(probe_health)" == "200" ]] && break
            [[ "$i" -lt 20 ]] || { echo "FAIL: port-forward not serving"; cat /tmp/port-forward.log; exit 1; }
            sleep 1
        done
        ;;
esac

echo "==> Frontend serves 200 on /"
HTTP_CODE=$(curl -s -o NUL -w '%{http_code}' "${RESOLVE[@]}" "${APP_URL}/")
echo "  GET / -> $HTTP_CODE"
[[ "$HTTP_CODE" == "200" ]] || { echo "FAIL: frontend returned $HTTP_CODE"; exit 1; }

echo "==> /config.js carries injected runtime config"
CONFIG_JS=$(curl -s "${RESOLVE[@]}" "${APP_URL}/config.js")
echo "  $CONFIG_JS"
echo "$CONFIG_JS" | grep -q "__APP_CONFIG__" || { echo "FAIL: /config.js missing __APP_CONFIG__"; exit 1; }

echo "==> Gateway rejects unauthenticated /accounts/me with 401"
HTTP_CODE=$(curl -s -o NUL -w '%{http_code}' "${RESOLVE[@]}" "${API_URL}/accounts/me")
echo "  GET /accounts/me (no token) -> $HTTP_CODE"
[[ "$HTTP_CODE" == "401" ]] || { echo "FAIL: expected 401, got $HTTP_CODE"; exit 1; }

echo "==> Obtaining token from Keycloak (client ci-smoke, user $CI_USER)"
# The ci-smoke client is created by realm-overlay.jq as a copy of banking-frontend
# with Direct Access Grant enabled. Keycloak ingress is also on the same port-forward.
TOKEN_RESP=$(curl -s -X POST \
    "${RESOLVE[@]}" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data "grant_type=password&client_id=ci-smoke&username=${CI_USER}&password=${CI_PASS}" \
    "${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token")
TOKEN=$(echo "$TOKEN_RESP" | jq -r '.access_token' 2>/dev/null || true)
if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then
    echo "FAIL: could not obtain token"; echo "$TOKEN_RESP" | jq . 2>/dev/null || echo "$TOKEN_RESP"; exit 1
fi
echo "  token obtained"

echo "==> Authenticated /accounts/me returns 2xx or 404"
HTTP_CODE=$(curl -s -o NUL -w '%{http_code}' \
    "${RESOLVE[@]}" \
    -H "Authorization: Bearer ${TOKEN}" \
    "${API_URL}/accounts/me")
echo "  GET /accounts/me (auth) -> $HTTP_CODE"
if [[ "$HTTP_CODE" != "200" && "$HTTP_CODE" != "404" ]]; then
    echo "FAIL: expected 2xx/404, got $HTTP_CODE"; cat /tmp/auth.json; exit 1
fi

echo ""
echo "SMOKE PASSED"
