# realm-overlay.jq — transform the bank realm for CI smoke tests.
#
# Applied by .github/workflows/e2e.yml with:
#   jq -f deploy/ci/realm-overlay.jq keycloak/import/bank-realm-realm.json > "$RUNNER_TEMP/bank-realm-ci.json"
#
# Changes:
#   - sslRequired = "none"              (kind serves plain http)
#   - all requiredActions cleared       (no forced password reset in CI)
#   - user credentials temporary=false  (users log in right away)
#   - adds a public client "ci-smoke": a copy of "banking-frontend" with
#     Direct Access Grant enabled and its .id removed (Keycloak assigns a new id)
#   - resets the password of the smoke-test user "customer.kira" to the value
#     of $ENV.REALM_USER_PASSWORD (required; generated per-run by the CI
#     workflow, never a checked-in demo credential)
(
    .sslRequired = "none"
)
| (
    .requiredActions = []
)
| (
    .users[]?.requiredActions = []
)
| (
    .users[]?.credentials[]?.temporary = false
)
| (
    .users[]?
    | select(.username == "customer.kira")
    | .credentials = [
        {
          type: "password",
          value: ($ENV.REALM_USER_PASSWORD // error("REALM_USER_PASSWORD env var is required")),
          temporary: false
        }
      ]
)
| (
    .clients += [
        .clients[]
        | select(.clientId == "banking-frontend")
        | .clientId = "ci-smoke"
        | .directAccessGrantsEnabled = true
        | .publicClient = true
        | del(.id, .secret)
    ]
)
