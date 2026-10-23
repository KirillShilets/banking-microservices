#!/usr/bin/env bash
# Pins every `uses: owner/repo@vX` in .github/workflows to its commit SHA,
# keeping the version as a trailing comment so Dependabot can still bump it.
#
# Resolution:
#   - frizbee (https://github.com/stacklok/frizbee) if installed.
#   - otherwise `git ls-remote` — no authentication, no API rate limits.
#     `refs/tags/<ref>^{}` yields the (peeled) commit object the tag points to,
#     which is what GitHub Actions actually runs.
# Idempotent: already-pinned lines no longer match the `@vX` pattern.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

if command -v frizbee >/dev/null 2>&1; then
  frizbee actions .github/workflows --quiet
  exit 0
fi

echo "frizbee not found; resolving SHAs via git ls-remote" >&2

resolve() {
    local repo="$1" ref="$2"
    # GitHub Action refs are owner/repo/action@tag: the tag lives on the
    # owner/repo part, the action name is a directory within it.
    local owner_repo
    owner_repo="$(printf '%s' "$repo" | cut -d/ -f1-2)"
    git ls-remote "https://github.com/${owner_repo}" "refs/tags/${ref}^{}" \
        2>/dev/null | awk -F'\t' '/refs\/tags\//{print $1}' | head -n 1 || true
}

for f in .github/workflows/*.yml; do
    # `|| true` keeps `set -euo pipefail` happy when a file is already fully
    # pinned (grep exits 1 with zero matches — must not abort the script).
    refs="$(grep -oE 'uses: [^@[:space:]]+@v[0-9]+(\.[0-9]+)*' "$f" | sed 's/^uses: //' | sort -u || true)"
    [[ -n "$refs" ]] || continue
    while IFS= read -r ref; do
        repo="${ref%@*}"; tag="${ref#*@}"
        sha="$(resolve "$repo" "$tag")"
        if [[ -z "$sha" ]]; then
            echo "WARN: could not resolve $ref" >&2
            continue
        fi
        sed -i "s|uses: ${repo}@${tag}|uses: ${repo}@${sha} # ${tag}|g" "$f"
        echo "  pinned $repo@$tag -> ${sha:0:12}"
    done <<< "$refs"
done
