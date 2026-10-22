#!/usr/bin/env bash
# Shows the first few COPY/ADD lines of every service Dockerfile so you can
# confirm the build context in release.yml / bootstrap.sh matches reality.
set -euo pipefail

for f in account-service/Dockerfile bill-service/Dockerfile deposit-service/Dockerfile \
         notification-service/Dockerfile gateway-service/Dockerfile frontend/Dockerfile; do
  echo "== $f =="
  grep -nE '^(COPY|ADD)' "$f" || echo "  (no COPY/ADD found)"
  echo
done
