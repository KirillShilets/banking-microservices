#!/usr/bin/env bash
# =============================================================================
# bootstrap.sh — bash port of deploy/kind/bootstrap.ps1 for CI/e2e environments.
# Versions must stay in sync with bootstrap.ps1.
#
# Environment variables (all optional):
#   CLUSTER_NAME  (default: bank-local)   IMAGE_TAG     (default: 1.0-SNAPSHOT)
#   RELEASE_NAME  (default: bank)         ENV_FILE      (default: .env)
#   REALM_FILE    (default: keycloak/import/bank-realm-realm.json)
#   SKIP_CLUSTER / SKIP_IMAGES / SKIP_SECRETS  (set any non-empty value to skip)
# =============================================================================
set -euo pipefail

CLUSTER_NAME="${CLUSTER_NAME:-bank-local}"
# kind config: kind-cluster.yaml maps host ports 80/443 for local dev; e2e
# passes kind-cluster-ci.yaml (smoke port-forwards instead of host ports) so
# it can run alongside a local cluster that already holds 80/443.
CLUSTER_CONFIG="${CLUSTER_CONFIG:-kind-cluster.yaml}"
RELEASE_NAME="${RELEASE_NAME:-bank}"
IMAGE_TAG="${IMAGE_TAG:-1.0-SNAPSHOT}"
ENV_FILE="${ENV_FILE:-.env}"
REALM_FILE="${REALM_FILE:-keycloak/import/bank-realm-realm.json}"
SKIP_CLUSTER="${SKIP_CLUSTER:-}"
SKIP_IMAGES="${SKIP_IMAGES:-}"
SKIP_SECRETS="${SKIP_SECRETS:-}"

# Fixed versions — keep in sync with bootstrap.ps1
INGRESS_NGINX_VERSION="v1.11.3"
CERT_MANAGER_VERSION="v1.21.2"
CNPG_VERSION="0.29.1"
BARMAN_PLUGIN_VERSION="0.8.1"
RABBITMQ_OPERATOR_VERSION="v2.22.3"
RABBITMQ_TOPOLOGY_VERSION="v1.20.0"
MINIO_INIT_IMAGE="bank/minio-mc-init:RELEASE.2025-08-13T08-35-41Z"

# pwd -W yields a native Windows path on git-bash/MSYS (needed because native
# tools like kind/docker/kubectl receive these paths as arguments and MSYS path
# conversion is not applied); plain pwd keeps the POSIX form on Linux CI.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -W 2>/dev/null || pwd)"
CHART_PATH="${REPO_ROOT}/helm/bank-platform"
INFRA_PATH="${REPO_ROOT}/deploy/k8s/infra"
NAMESPACE="bank"

fail() { echo "ERROR: $1" >&2; exit 1; }

# --- Load .env into associative map (mirrors create-secrets.ps1 parsing) ---
declare -A ENV_MAP=()
if [[ -f "$ENV_FILE" ]]; then
    while IFS= read -r line || [[ -n "$line" ]]; do
        line="$(printf '%s' "$line" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
        [[ -z "$line" || "$line" == \#* ]] && continue
        key="${line%%=*}"
        value="${line#*=}"
        # strip surrounding quotes
        value="${value%\"}"; value="${value#\"}"
        value="${value%\'}"; value="${value#\'}"
        ENV_MAP["$key"]="$value"
    done < "$ENV_FILE"
else
    echo "WARNING: $ENV_FILE not found at $REPO_ROOT; continuing with empty env. Set ENV_FILE to the generated CI .env." >&2
fi

env_required() {
    local key="$1"
    local val="${ENV_MAP[$key]:-}"
    if [[ -z "$val" ]]; then
        fail ".env is missing a value for '$key'."
    fi
    printf '%s' "$val"
}

# --- Random value helper (matches PowerShell New-RandomSecretValue) ---
random_value() {
    local n="${1:-40}"
    openssl rand -hex $(( (n + 1) / 2 )) | cut -c1-"$n"
}

# --- kubectl apply a generated object (client-side dry-run -> apply) ---
apply_yaml() {
    kubectl apply -f -
}

secret_exists() {
    kubectl get secret "$1" -n "$NAMESPACE" >/dev/null 2>&1
}

apply_generic_secret() {
    local name="$1" type="$2"
    shift 2
    local args=()

    if [[ "$type" == "kubernetes.io/basic-auth" ]]; then
        args+=(--type=kubernetes.io/basic-auth)
    else
        args+=(--type=Opaque)
    fi

    # remaining args are KEY=VALUE pairs
    local kv
    local literals=()
    for kv in "$@"; do
        literals+=("--from-literal=$kv")
    done

    kubectl create secret generic "$name" -n "$NAMESPACE" "${args[@]}" \
        "${literals[@]}" --dry-run=client -o yaml | apply_yaml >/dev/null
}

ensure_generated_secret() {
    local name="$1" type="$2"
    shift 2
    if ! secret_exists "$name"; then
        apply_generic_secret "$name" "$type" "$@"
    fi
}

require_command() {
    command -v "$1" >/dev/null 2>&1 || fail "Required command '$1' not found in PATH"
}

# =============================================================================
echo "==> Validating prerequisites"
for cmd in docker kind kubectl helm; do
    require_command "$cmd"
done
require_command openssl
require_command jq
require_command sed

# =============================================================================
if [[ -z "$SKIP_CLUSTER" ]]; then
    echo "==> Creating or reusing the kind cluster '$CLUSTER_NAME'"
    if ! kind get clusters 2>/dev/null | grep -q "^${CLUSTER_NAME}$"; then
        kind create cluster --name "$CLUSTER_NAME" --config "${REPO_ROOT}/deploy/kind/${CLUSTER_CONFIG}"
    fi

    echo "==> Installing ingress-nginx"
    kubectl apply --server-side --force-conflicts \
        -f "https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-${INGRESS_NGINX_VERSION}/deploy/static/provider/kind/deploy.yaml"
    # Wait for the controller rollout, not for selector-matched pods: right
    # after the server-side apply no pods exist yet and 'kubectl wait' fails
    # immediately with 'no matching resources found'.
    kubectl rollout status deployment/ingress-nginx-controller \
        -n ingress-nginx --timeout=300s
fi

# =============================================================================
if ! kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
    kubectl create namespace "$NAMESPACE"
fi

# Pod Security Admission in kind: warn/audit only — plus explicit removal of the
# enforce label, because a prior run may have set it and reruns reuse the same
# namespace (labels persist). enforce=restricted is reserved for staging/prod
# (deploy/k8s/namespaces/namespaces.yaml): upstream operator manifests
# (keycloak, rabbitmq, minio init) are not restricted-compatible and would be
# blocked.
kubectl label namespace "$NAMESPACE" \
    pod-security.kubernetes.io/enforce- \
    pod-security.kubernetes.io/warn=restricted \
    pod-security.kubernetes.io/audit=restricted \
    --overwrite >/dev/null || true

# =============================================================================
if [[ -z "$SKIP_SECRETS" ]]; then
    echo "==> Creating application and infrastructure Secrets"

    ACCOUNT_DB_PASSWORD="$(env_required ACCOUNT_DB_PASSWORD)"
    BILL_DB_PASSWORD="$(env_required BILL_DB_PASSWORD)"
    DEPOSIT_DB_PASSWORD="$(env_required DEPOSIT_DB_PASSWORD)"
    NOTIFICATION_DB_PASSWORD="$(env_required NOTIFICATION_DB_PASSWORD)"
    KEYCLOAK_DB_PASSWORD="$(env_required KEYCLOAK_DB_PASSWORD)"
    RABBITMQ_PASSWORD="$(env_required RABBITMQ_PASSWORD)"
    MAIL_PASSWORD="$(env_required MAIL_PASSWORD)"
    RABBITMQ_USERNAME="${ENV_MAP[RABBITMQ_USERNAME]:-bankmq}"
    MAIL_USERNAME="${ENV_MAP[MAIL_USERNAME]:-}"

    for password in "$ACCOUNT_DB_PASSWORD" "$BILL_DB_PASSWORD" "$DEPOSIT_DB_PASSWORD" \
        "$NOTIFICATION_DB_PASSWORD" "$KEYCLOAK_DB_PASSWORD" "$RABBITMQ_PASSWORD" "$MAIL_PASSWORD"; do
        if [[ "$password" == "change-me" ]]; then
            fail ".env still contains the example password. Set a unique value before deployment."
        fi
    done

    echo "==> Applying secret 'bank-app-secrets' in namespace '$NAMESPACE'"
    apply_generic_secret bank-app-secrets Opaque \
        "ACCOUNT_DB_USER=account_service_admin" "ACCOUNT_DB_PASSWORD=${ACCOUNT_DB_PASSWORD}" \
        "BILL_DB_USER=bill_service_admin" "BILL_DB_PASSWORD=${BILL_DB_PASSWORD}" \
        "DEPOSIT_DB_USER=deposit_service_admin" "DEPOSIT_DB_PASSWORD=${DEPOSIT_DB_PASSWORD}" \
        "NOTIFICATION_DB_USER=notification_service_admin" "NOTIFICATION_DB_PASSWORD=${NOTIFICATION_DB_PASSWORD}" \
        "RABBITMQ_USERNAME=${RABBITMQ_USERNAME}" "RABBITMQ_PASSWORD=${RABBITMQ_PASSWORD}" \
        "MAIL_USERNAME=${MAIL_USERNAME}" "MAIL_PASSWORD=${MAIL_PASSWORD}"

    echo "==> Applying database and infra credentials"
    for entry in \
        "account-db-credentials account_service_admin ${ACCOUNT_DB_PASSWORD}" \
        "bill-db-credentials bill_service_admin ${BILL_DB_PASSWORD}" \
        "deposit-db-credentials deposit_service_admin ${DEPOSIT_DB_PASSWORD}" \
        "notification-db-credentials notification_service_admin ${NOTIFICATION_DB_PASSWORD}" \
        "keycloak-db-credentials keycloak_admin ${KEYCLOAK_DB_PASSWORD}"; do
        read -r name user pass <<< "$entry"
        apply_generic_secret "$name" kubernetes.io/basic-auth \
            "username=${user}" "password=${pass}"
        kubectl label secret "$name" -n "$NAMESPACE" 'cnpg.io/reload=true' --overwrite >/dev/null
    done

    apply_generic_secret rabbitmq-app-credentials Opaque \
        "username=${RABBITMQ_USERNAME}" "password=${RABBITMQ_PASSWORD}"
    kubectl label secret rabbitmq-app-credentials -n "$NAMESPACE" \
        'rabbitmq.com/topology-operator=true' --overwrite >/dev/null

    ensure_generated_secret postgres-admin-credentials Opaque \
        "username=bank_admin" "password=$(random_value 48)"
    kubectl label secret postgres-admin-credentials -n "$NAMESPACE" 'cnpg.io/reload=true' --overwrite >/dev/null || true

    ensure_generated_secret minio-root-credentials Opaque \
        "username=$(random_value 20)" "password=$(random_value 40)"
    ensure_generated_secret postgres-backup-credentials Opaque \
        "ACCESS_KEY_ID=$(random_value 20)" "ACCESS_SECRET_KEY=$(random_value 40)"

    echo "Done. Secret contents were not printed."
fi

# =============================================================================
echo "==> Installing cert-manager and CloudNativePG"
helm repo add jetstack https://charts.jetstack.io --force-update
helm repo add cnpg https://cloudnative-pg.github.io/charts --force-update
helm repo update

helm upgrade --install cert-manager jetstack/cert-manager \
    --namespace cert-manager --create-namespace \
    --version "$CERT_MANAGER_VERSION" --set crds.enabled=true \
    --wait --timeout 300s
kubectl rollout status deployment/cert-manager -n cert-manager --timeout=300s
kubectl rollout status deployment/cert-manager-cainjector -n cert-manager --timeout=300s
kubectl rollout status deployment/cert-manager-webhook -n cert-manager --timeout=300s

helm upgrade --install cloudnative-pg cnpg/cloudnative-pg \
    --namespace cnpg-system --create-namespace \
    --version "$CNPG_VERSION" --wait --timeout 300s
kubectl rollout status deployment/cloudnative-pg -n cnpg-system --timeout=300s

helm upgrade --install plugin-barman-cloud cnpg/plugin-barman-cloud \
    --namespace cnpg-system --version "$BARMAN_PLUGIN_VERSION" \
    --wait --timeout 300s
kubectl rollout status deployment/plugin-barman-cloud -n cnpg-system --timeout=300s

# =============================================================================
echo "==> Installing RabbitMQ operators"
kubectl apply --server-side --force-conflicts \
    -f "https://github.com/rabbitmq/cluster-operator/releases/download/${RABBITMQ_OPERATOR_VERSION}/cluster-operator.yml"
kubectl rollout status deployment/rabbitmq-cluster-operator -n rabbitmq-system --timeout=300s

kubectl apply --server-side --force-conflicts \
    -f "https://github.com/rabbitmq/messaging-topology-operator/releases/download/${RABBITMQ_TOPOLOGY_VERSION}/messaging-topology-operator-with-certmanager.yaml"
kubectl rollout status deployment/messaging-topology-operator -n rabbitmq-system --timeout=300s

# =============================================================================
echo "==> Installing Keycloak Operator in the application namespace"
kubectl apply --server-side --force-conflicts -k "${INFRA_PATH}/keycloak/operator"
kubectl rollout status deployment/keycloak-operator -n "$NAMESPACE" --timeout=300s

# =============================================================================
echo "==> Deploying MinIO and creating the backup bucket"
docker build -f "${INFRA_PATH}/minio/init.Dockerfile" -t "$MINIO_INIT_IMAGE" "$REPO_ROOT"
kind load docker-image "$MINIO_INIT_IMAGE" --name "$CLUSTER_NAME"
kubectl apply -f "${INFRA_PATH}/minio/statefulset.yaml"
kubectl rollout status statefulset/minio -n "$NAMESPACE" --timeout=600s
kubectl delete job minio-bootstrap -n "$NAMESPACE" --ignore-not-found=true
kubectl apply -f "${INFRA_PATH}/minio/bucket-job.yaml"
kubectl wait --for=condition=complete job/minio-bootstrap -n "$NAMESPACE" --timeout=300s

# =============================================================================
echo "==> Deploying PostgreSQL cluster and backup schedule"
kubectl apply -f "${INFRA_PATH}/postgres/object-store.yaml"
kubectl apply -f "${INFRA_PATH}/postgres/cluster.yaml"
kubectl wait --for=condition=Ready cluster.postgresql.cnpg.io/postgres -n "$NAMESPACE" --timeout=900s
kubectl apply -f "${INFRA_PATH}/postgres/databases.yaml"

# CNPG reconciles the Database CRs asynchronously; a Helm pre-install hook
# (bank-*-migrate) runs immediately afterwards, so block until every managed
# database actually exists before installing the chart.
PG_ADMIN_USER="$(kubectl get secret postgres-admin-credentials -n "$NAMESPACE" -o jsonpath='{.data.username}' | base64 -d)"
PG_ADMIN_PASSWORD="$(kubectl get secret postgres-admin-credentials -n "$NAMESPACE" -o jsonpath='{.data.password}' | base64 -d)"

kubectl wait --for=condition=Ready pod -l cnpg.io/cluster=postgres -n "$NAMESPACE" --timeout=900s

wait_for_database() {
    local db="$1" pod attempt=0 last_err=""
    while (( attempt < 120 )); do
        pod="$(kubectl get pods -n "$NAMESPACE" -l cnpg.io/cluster=postgres -o name | sed -n 's|^pod/||p' | grep '^postgres-[0-9]' | head -n1 || true)"
        if [[ -n "$pod" ]]; then
            # Probe over the cluster-internal TCP service (postgres) instead of
            # the pod-local unix socket: socket auth is peer/trust-bound and can
            # reject non-superuser roles, while TCP uses the managed roles'
            # password credentials.
            if kubectl exec -n "$NAMESPACE" "$pod" -- env \
                    PGPASSWORD="$PG_ADMIN_PASSWORD" psql -U "$PG_ADMIN_USER" \
                    -h postgres -d bank_control -tAc \
                    "SELECT 1 FROM pg_database WHERE datname='${db}'" \
                    2>/dev/null | grep -q "^ *1$"; then
                return 0
            fi
            last_err="$(kubectl exec -n "$NAMESPACE" "$pod" -- env \
                    PGPASSWORD="$PG_ADMIN_PASSWORD" psql -U "$PG_ADMIN_USER" \
                    -h postgres -d bank_control -tAc \
                    "SELECT 1 FROM pg_database WHERE datname='${db}'" \
                    2>&1 >/dev/null | head -n1 || true)"
        fi
        attempt=$((attempt + 1))
        (( attempt % 12 == 0 )) && echo "... still waiting for CNPG database '${db}' (${attempt}/120 probes)"
        sleep 5
    done
    fail "CNPG database '${db}' was not created within 600s. Last probe error: ${last_err}"
}

for db in account_service_database bill_service_database deposit_service_database notification_service_database keycloak_database; do
    echo "==> Waiting for CNPG database '${db}'"
    wait_for_database "$db"
done

kubectl apply -f "${INFRA_PATH}/postgres/scheduled-backup.yaml"

# =============================================================================
echo "==> Deploying RabbitMQ cluster and application user"
kubectl apply -f "${INFRA_PATH}/rabbitmq/cluster.yaml"
rabbitUser="$(kubectl get secret bank-app-secrets -n "$NAMESPACE" -o jsonpath='{.data.RABBITMQ_USERNAME}' | base64 -d)"
if [[ ! "$rabbitUser" =~ ^[A-Za-z0-9._-]+$ ]]; then
    fail "RABBITMQ_USERNAME must contain only letters, numbers, dots, underscores or hyphens."
fi
sed -e "s/name: bankmq/name: ${rabbitUser}/" \
    -e "s/user: bankmq/user: ${rabbitUser}/" \
    "${INFRA_PATH}/rabbitmq/user.yaml" | kubectl apply -f -
kubectl wait --for=condition=AllReplicasReady rabbitmqcluster.rabbitmq.com/rabbitmq -n "$NAMESPACE" --timeout=900s

# =============================================================================
echo "==> Deploying Keycloak, ingress and realm import"
kubectl apply -f "${INFRA_PATH}/keycloak/keycloak.yaml"
kubectl apply -f "${INFRA_PATH}/keycloak/ingress.yaml"
kubectl wait --for=condition=Ready keycloak.k8s.keycloak.org/keycloak -n "$NAMESPACE" --timeout=1200s

# Accept both repo-relative and absolute REALM_FILE paths.
REALM_PATH="$REALM_FILE"
[[ -f "$REALM_PATH" ]] || REALM_PATH="${REPO_ROOT}/${REALM_FILE}"
if [[ ! -f "$REALM_PATH" ]]; then
    fail "Realm file not found at $REALM_PATH (set REALM_FILE)."
fi
jq -n \
    --slurpfile realm "$REALM_PATH" \
    --arg ns "$NAMESPACE" \
    '{"apiVersion":"k8s.keycloak.org/v2beta1","kind":"KeycloakRealmImport","metadata":{"name":"bank-realm","namespace":$ns},"spec":{"keycloakCRName":"keycloak","realm":$realm[0]}}' \
    | kubectl apply -f -
kubectl wait --for=condition=Done keycloakrealmimport.k8s.keycloak.org/bank-realm -n "$NAMESPACE" --timeout=600s

# =============================================================================
if [[ -z "$SKIP_IMAGES" ]]; then
    echo "==> Building application images"
    # shellcheck disable=SC2164
    pushd "$REPO_ROOT" >/dev/null
    for svc in account-service bill-service deposit-service notification-service gateway-service; do
        echo "==> building bank/${svc}:${IMAGE_TAG}"
        docker build -f "${svc}/Dockerfile" -t "bank/${svc}:${IMAGE_TAG}" .
    done
    echo "==> building bank/frontend:${IMAGE_TAG}"
    # Runtime config is injected via the frontendConfig ConfigMap (config.js),
    # so no VITE_* build args are needed in the image (see Stage 2/3).
    docker build -f frontend/Dockerfile -t "bank/frontend:${IMAGE_TAG}" frontend
    # shellcheck disable=SC2164
    popd >/dev/null

    echo "==> Loading images into kind"
    for svc in account-service bill-service deposit-service notification-service gateway-service frontend; do
        kind load docker-image "bank/${svc}:${IMAGE_TAG}" --name "$CLUSTER_NAME"
    done
fi

# =============================================================================
echo "==> Deploying application tier with Helm"
helm upgrade --install "$RELEASE_NAME" "$CHART_PATH" \
    --namespace "$NAMESPACE" \
    --create-namespace \
    --values "${CHART_PATH}/values-kind.yaml" \
    --wait --timeout 15m

echo "==> Waiting for application rollouts"
for svc in account-service bill-service deposit-service notification-service gateway-service frontend; do
    kubectl -n "$NAMESPACE" rollout status "deploy/bank-${svc}" --timeout=300s
done

echo ""
echo "Deployment complete."
echo "Smoke test requires BANK_SMOKE_TEST_JWT; see deploy/README.md."
echo "Open the local endpoints:"
echo "    Frontend: http://app.localhost"
echo "    Gateway:  http://api.localhost"
echo "    Keycloak: http://keycloak.localhost"
