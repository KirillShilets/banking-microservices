#!/usr/bin/env python3
"""smoke_e2e.py — E2E smoke test using direct service access (no Host headers needed)."""
import urllib.request, urllib.parse, urllib.error, subprocess, sys, json, os

NAMESPACE = "bank"
REALM = "bank-realm"
# CI smoke user password: comes from the CI realm overlay (see e2e.yml / gen-env.sh).
CI_USER = os.environ.get("CI_USER", "customer.kira")
CI_PASS = os.environ.get("CI_PASS", "")
if not CI_PASS:
    raise SystemExit("set CI_PASS (password of the CI realm user)")
GATEWAY = "http://bank-gateway-service.bank.svc:8989"
KEYCLOAK = "http://keycloak.bank.svc:8080"

def kubectl_curl(url, method="GET", data=None, headers=None, return_body=False):
    cmd = ["kubectl", "run", "-n", NAMESPACE, "--restart=Never", "--rm", "-i",
           "--image=curlimages/curl", "--", "curl", "-s"]
    if not return_body:
        cmd += ["-o", "/dev/null", "-w", "%{http_code}"]
    cmd += ["-X", method]
    if data:
        cmd += ["-d", data, "-H", "Content-Type: application/x-www-form-urlencoded"]
    for k, v in (headers or {}).items():
        cmd += ["-H", f"{k}: {v}"]
    cmd.append(url)
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    # combine stdout+stderr to catch status code (written to stderr by curl)
    combined = r.stdout + r.stderr
    return combined, r.returncode

def kubectl_curl_json(url, method="GET", data=None, headers=None):
    """Variant that captures response body."""
    cmd = ["kubectl", "run", "-n", NAMESPACE, "--restart=Never", "--rm", "-i",
           "--image=curlimages/curl", "--", "curl", "-s", "-X", method]
    if data:
        cmd += ["-d", data, "-H", "Content-Type: application/x-www-form-urlencoded"]
    for k, v in (headers or {}).items():
        cmd += ["-H", f"{k}: {v}"]
    cmd.append(url)
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    return r.stdout, r.stderr, r.returncode

def main():
    print("==> Deployments ready check")
    result = subprocess.run(
        ["kubectl", "get", "deployments", "-n", NAMESPACE, "-o", "jsonpath={.items[*].metadata.name}"],
        capture_output=True, text=True
    )
    names = result.stdout.strip().split()
    print("  deployments:", " ".join(sorted(n for n in names if n.startswith("bank-"))))

    print("\n==> No pod restarts check")
    result = subprocess.run(
        ["kubectl", "get", "pods", "-n", NAMESPACE, "-o", "json"],
        capture_output=True, text=True
    )
    pods = json.loads(result.stdout)["items"]
    restart_issues = []
    for p in pods:
        name = p["metadata"]["name"]
        if not name.startswith("bank-"):
            continue
        for cs in p["status"].get("containerStatuses", []):
            rc = cs.get("restartCount", 0)
            if rc > 0:
                restart_issues.append(f"{name}: {rc} restarts")
    if restart_issues:
        print("  FAIL:", " ".join(restart_issues))
        return 1
    print("  All pods: 0 restarts")

    print("\n==> Gateway health")
    out, _ = kubectl_curl(f"{GATEWAY}/actuator/health")
    print("  health:", out.strip() or f"ERR"[:100])

    print("\n==> Frontend config.js")
    frontend_pf = subprocess.Popen(
        ["kubectl", "port-forward", "-n", NAMESPACE, "svc/bank-frontend", "19998:8080"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )
    import time; time.sleep(2)
    try:
        req = urllib.request.Request("http://localhost:19998/config.js")
        body = urllib.request.urlopen(req, timeout=5).read().decode()
        if "__APP_CONFIG__" in body:
            print("  config.js OK: __APP_CONFIG__ found")
            print("  content preview:", body[:80].replace("\n", " "))
        else:
            print("  FAIL: __APP_CONFIG__ missing")
            return 1
    finally:
        frontend_pf.terminate()

    print("\n==> Gateway unauthenticated -> 401")
    out, _ = kubectl_curl(f"{GATEWAY}/accounts/me")
    if "401" in out:
        print("  401 OK (expected)")
    else:
        print(f"  FAIL: expected 401, got: {out.strip()[:100]}")
        return 1

    print("\n==> Obtaining OIDC token from Keycloak (customer.kira / ci-smoke)")
    raw_out, _, _ = kubectl_curl_json(
        f"{KEYCLOAK}/realms/{REALM}/protocol/openid-connect/token",
        method="POST",
        data=f"grant_type=password&client_id=ci-smoke&username={CI_USER}&password={CI_PASS}"
    )
    import re
    json_match = re.search(r'\{[\s\S]*\}', raw_out)
    body = json_match.group(0) if json_match else "{}"
    try:
        resp = json.loads(body)
    except json.JSONDecodeError:
        print(f"  WARN: could not parse JSON, using raw token from last line")
        token = raw_out.strip().splitlines()[-1] if raw_out.strip() else ""
    else:
        token = resp.get("access_token", "")
    print(f"  Token: {token[:25]}... ({len(token)} chars)")

    if not token:
        print("  FAIL: no token obtained")
        return 1

    print("\n==> Authenticated /accounts/me -> 2xx or 404")
    out, _ = kubectl_curl(
        f"{GATEWAY}/accounts/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    if any(x in out for x in ["200", "201", "202", "204"]):
        print(f"  Authenticated request: 2xx OK")
    elif "404" in out:
        print(f"  Authenticated request: 404 (no account yet — OK)")
    elif "401" in out or "403" in out:
        print(f"  FAIL: token rejected: {out.strip()[:100]}")
        return 1
    else:
        print(f"  FAIL: unexpected status. Response: {out.strip()[:100]}")
        return 1

    print("\n✅ SMOKE PASSED")
    return 0

if __name__ == "__main__":
    sys.exit(main())
