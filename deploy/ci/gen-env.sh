#!/usr/bin/env bash
# =============================================================================
# gen-env.sh — generate a .env for CI/e2e with random secrets for all DB
# passwords and fixed non-secret values for RabbitMQ username.
#
# Authored for GitHub Actions: key=value entries below use ::add-mask:: so
# the real passwords are never printed to the transcript.log
# =============================================================================
set -euo pipefail

DEST_FILE="${1:-.env}"

# Eagerly fail when running in git-bash without openssl
if ! command -v openssl >/dev/null 2>&1; then
    echo "ERROR: openssl is required" >&2
    exit 1
fi

random_hex() { openssl rand -hex "${1:-16}"; }

mask() {
    # GitHub Actions: register the value as secret so it is not leaked in logs.
    if [[ -n "${GITHUB_ACTIONS:-}" ]]; then
        echo "::add-mask::$1"
    fi
}

ACCOUNT_DB_PASSWORD="$(random_hex 16)"
BILL_DB_PASSWORD="$(random_hex 16)"
DEPOSIT_DB_PASSWORD="$(random_hex 16)"
NOTIFICATION_DB_PASSWORD="$(random_hex 16)"
KEYCLOAK_DB_PASSWORD="$(random_hex 16)"
RABBITMQ_PASSWORD="$(random_hex 16)"
MAIL_PASSWORD="$(random_hex 16)"

for v in "$ACCOUNT_DB_PASSWORD" "$BILL_DB_PASSWORD" "$DEPOSIT_DB_PASSWORD" \
    "$NOTIFICATION_DB_PASSWORD" "$KEYCLOAK_DB_PASSWORD" "$RABBITMQ_PASSWORD" "$MAIL_PASSWORD"; do
    mask "$v"
done

cat > "$DEST_FILE" <<EOF
KEYCLOAK_DB_PASSWORD=${KEYCLOAK_DB_PASSWORD}

BILL_DB_PASSWORD=${BILL_DB_PASSWORD}

ACCOUNT_DB_PASSWORD=${ACCOUNT_DB_PASSWORD}

DEPOSIT_DB_PASSWORD=${DEPOSIT_DB_PASSWORD}

NOTIFICATION_DB_PASSWORD=${NOTIFICATION_DB_PASSWORD}

RABBITMQ_USERNAME=bankmq
RABBITMQ_PASSWORD=${RABBITMQ_PASSWORD}
MAIL_USERNAME=
MAIL_PASSWORD=${MAIL_PASSWORD}
EOF

chmod 600 "$DEST_FILE"

echo "Wrote $DEST_FILE with random secrets (mode 600)."
