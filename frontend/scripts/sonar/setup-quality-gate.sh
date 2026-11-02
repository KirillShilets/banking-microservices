#!/usr/bin/env bash
# Creates (or updates) and binds the "Banking Frontend" quality gate on SonarCloud.
#
# Requirements: SONAR_TOKEN, SONAR_ORGANIZATION (or ORG) in the environment.
# Run from the frontend/ directory: scripts/sonar/setup-quality-gate.sh
#
# The script is idempotent: an existing gate with the same name is updated in
# place, so it can be re-run after changing a threshold below.
set -euo pipefail

: "${SONAR_TOKEN:?SONAR_TOKEN is required}"
ORG="${SONAR_ORGANIZATION:-${ORG:-kirillshilets}}"
PROJECT_KEY="${PROJECT_KEY:-spring-cloud-banking-system-frontend}"
HOST="${SONAR_HOST:-https://sonarcloud.io}"
GATE_NAME="${GATE_NAME:-Banking Frontend}"

api() {
  local method="$1" path="$2"
  shift 2
  curl -sS -X "$method" \
    -H "Authorization: Bearer ${SONAR_TOKEN}" \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode "organization=${ORG}" \
    "$@" \
    "${HOST}${path}"
}

# metric | op | error (threshold value). Ratings use op=GT and error=1, which
# means "worse than A". Violations for ratings are critical-level.
CONDITIONS=(
  "new_violations|GT|0"
  "new_coverage|LT|70"
  "new_duplicated_lines_density|GT|3"
  "new_security_hotspots_reviewed|LT|100"
  "new_security_rating|GT|1"
  "new_reliability_rating|GT|1"
  "new_maintainability_rating|GT|1"
)

gate_id="$(api GET "/api/qualitygates/show" --data-urlencode "name=${GATE_NAME}" \
  | sed -n 's/.*"id":\([0-9]\+\).*/\1/p' | head -n1 || true)"

if [[ -z "${gate_id}" ]]; then
  echo "Creating quality gate '${GATE_NAME}'"
  gate_id="$(api POST "/api/qualitygates/create" --data-urlencode "name=${GATE_NAME}" \
    | sed -n 's/.*"id":\([0-9]\+\).*/\1/p' | head -n1)"
  if [[ -z "${gate_id}" ]]; then
    echo "Failed to create the gate" >&2
    exit 1
  fi
else
  echo "Reusing quality gate '${GATE_NAME}' (id=${gate_id})"
fi

# Reset the conditions so a re-run converges to the list above.
existing="$(api GET "/api/qualitygates/show" --data-urlencode "id=${gate_id}")"
while read -r condition_id; do
  [[ -z "${condition_id}" ]] && continue
  api POST "/api/qualitygates/delete_condition" --data-urlencode "id=${condition_id}" >/dev/null \
    || echo "  (condition ${condition_id} already removed)"
done < <(printf '%s' "${existing}" | grep -o '"id":"[^"]*"' | sed 's/.*:"//; s/"$//')

for condition in "${CONDITIONS[@]}"; do
  IFS='|' read -r metric op error <<<"${condition}"
  api POST "/api/qualitygates/create_condition" \
    --data-urlencode "gateId=${gate_id}" \
    --data-urlencode "metric=${metric}" \
    --data-urlencode "op=${op}" \
    --data-urlencode "error=${error}" >/dev/null \
    || echo "  (condition ${metric} already present, skipped)"
  echo "  condition ${metric} ${op} ${error}"
done

# Bind the gate to the project (no-op when it is already selected).
api POST "/api/qualitygates/select" \
  --data-urlencode "gateId=${gate_id}" \
  --data-urlencode "projectKey=${PROJECT_KEY}" >/dev/null || true

echo "Quality gate '${GATE_NAME}' is bound to ${PROJECT_KEY}"
echo "Verify: curl -s -H 'Authorization: Bearer \$SONAR_TOKEN' '${HOST}/api/qualitygates/get_by_project?organization=${ORG}&project=${PROJECT_KEY}'"
