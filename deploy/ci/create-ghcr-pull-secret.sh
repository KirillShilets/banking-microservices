#!/usr/bin/env bash
# Creates/updates an imagePullSecret for GHCR in the given namespace.
# Usage: GHCR_USER=... GHCR_TOKEN=... bash create-ghcr-pull-secret.sh bank-staging
set -euo pipefail

NS="${1:?usage: create-ghcr-pull-secret.sh <namespace>}"
: "${GHCR_USER:?set GHCR_USER}"
: "${GHCR_TOKEN:?set GHCR_TOKEN (PAT with read:packages)}"

kubectl create namespace "$NS" --dry-run=client -o yaml | kubectl apply -f -
kubectl create secret docker-registry ghcr-pull \
  --docker-server=ghcr.io \
  --docker-username="$GHCR_USER" \
  --docker-password="$GHCR_TOKEN" \
  --namespace "$NS" \
  --dry-run=client -o yaml | kubectl apply -f -
