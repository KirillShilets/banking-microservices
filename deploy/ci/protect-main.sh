#!/usr/bin/env bash
# =============================================================================
# protect-main.sh — apply branch protection to the default branch via the
# GitHub REST API (requires `gh` CLI authenticated with admin rights on the
# repository). Idempotent: safe to run repeatedly.
#
# Contexts: requires the "CI gate" check (the ci-success job in ci.yml) plus
# any other status checks already configured on the branch.
#
# Usage: bash deploy/ci/protect-main.sh
# =============================================================================
set -euo pipefail

REPO="${1:-$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo kirillshilets/spring-cloud-banking-system)}"
BRANCH="${2:-main}"

if ! command -v gh >/dev/null 2>&1; then
    echo "ERROR: gh CLI is required" >&2
    exit 1
fi

echo "Configuring branch protection for '$REPO' on '$BRANCH'"

# Read currently configured checks so we don't wipe any manually added contexts.
CURRENT_CONTEXTS="$(gh api "repos/${REPO}/branches/${BRANCH}/protection" --jq '.required_status_checks.contexts // []' 2>/dev/null || echo '[]')"
CONTEXTS="$(echo "$CURRENT_CONTEXTS" | jq -c '. + ["CI gate"] | unique')"

read -r -d '' BODY <<EOF || true
{
  "required_status_checks": {
    "strict": true,
    "contexts": ${CONTEXTS}
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
EOF

gh api \
    --method PUT \
    "repos/${REPO}/branches/${BRANCH}/protection" \
    --input - <<<"$BODY"

echo "Branch protection applied."
