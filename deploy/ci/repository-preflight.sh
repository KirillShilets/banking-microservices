#!/usr/bin/env bash
# Validate repository invariants before CI starts expensive jobs.
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
readonly SCRIPT_DIR
REPO_ROOT="$(cd -- "$SCRIPT_DIR/../.." && (pwd -W 2>/dev/null || pwd -P))"
readonly REPO_ROOT

fail() {
    printf 'ERROR: %s\n' "$*" >&2
    exit 1
}

require_file() {
    local path="$1"
    [[ -f "$REPO_ROOT/$path" ]] || fail "required file is missing: $path"
}

validate_workflow_actions() {
    local workflow record line_number content stripped
    local violation_count=0

    while IFS= read -r workflow; do
        while IFS= read -r record; do
            line_number="${record%%:*}"
            content="${record#*:}"
            stripped="${content%%#*}"

            if [[ ! "$stripped" =~ ^[[:space:]-]*uses:[[:space:]]+[^[:space:]]+@([[:xdigit:]]{40})([[:space:]]|$) ]]; then
                printf 'ERROR: action is not pinned to a full commit SHA: %s:%s:%s\n' \
                    "${workflow#"$REPO_ROOT/"}" "$line_number" "$content" >&2
                violation_count=$((violation_count + 1))
            fi
        done < <(grep -nE '^[[:space:]-]*uses:' "$workflow" || true)
    done < <(git -C "$REPO_ROOT" ls-files '.github/workflows/*.yml' '.github/workflows/*.yaml')

    (( violation_count == 0 )) || fail "found $violation_count unpinned workflow action reference(s)"
}

validate_workflow_shape() {
    local workflow
    while IFS= read -r workflow; do
        grep -Eq '^name:[[:space:]]*[^[:space:]].*$' "$workflow" \
            || fail "workflow has no top-level name: ${workflow#"$REPO_ROOT/"}"
        grep -Eq '^(on:|"on":|on[[:space:]]*:)' "$workflow" \
            || fail "workflow has no top-level on trigger: ${workflow#"$REPO_ROOT/"}"
    done < <(git -C "$REPO_ROOT" ls-files '.github/workflows/*.yml' '.github/workflows/*.yaml')
}

validate_tracked_environment_files() {
    local path
    while IFS= read -r path; do
        [[ "$path" == '.env.example' ]] \
            || fail "environment file with possible secrets is tracked: $path"
    done < <(git -C "$REPO_ROOT" ls-files | grep -E '(^|/)\.env($|\.)' || true)
}

validate_shell_scripts() {
    local script
    while IFS= read -r script; do
        bash -n "$REPO_ROOT/$script" \
            || fail "shell syntax validation failed: $script"
    done < <(git -C "$REPO_ROOT" ls-files '*.sh')
}

validate_powershell_scripts() {
    # GitHub-hosted runners (ubuntu-latest) ship with PowerShell; locally the
    # check degrades gracefully when pwsh is not installed.
    if ! command -v pwsh >/dev/null 2>&1; then
        echo "INFO: pwsh not found; skipping PowerShell syntax validation" >&2
        return 0
    fi

    local script
    while IFS= read -r script; do
        (
            cd "$REPO_ROOT"
            pwsh -NoProfile -NonInteractive -Command "
                \$tokens = \$null
                \$errors = \$null
                [void][System.Management.Automation.Language.Parser]::ParseFile('$script', [ref]\$tokens, [ref]\$errors)
                if (\$errors.Count -gt 0) {
                    \$errors | ForEach-Object { Write-Error \$_.Message }
                    exit 1
                }
            "
        ) || fail "PowerShell syntax validation failed: $script"
    done < <(git -C "$REPO_ROOT" ls-files '*.ps1')
}

cd "$REPO_ROOT"

for required in \
    '.github/workflows/ci.yml' \
    '.github/workflows/release.yml' \
    '.github/workflows/promote.yml' \
    'deploy/ci/check-dockerfile-context.sh' \
    'deploy/kind/bootstrap.sh' \
    'helm/bank-platform/Chart.yaml' \
    'helm/bank-platform/values.yaml'; do
    require_file "$required"
done

validate_tracked_environment_files
validate_shell_scripts
validate_powershell_scripts
validate_workflow_shape
validate_workflow_actions
bash deploy/ci/check-dockerfile-context.sh
git diff --check

printf 'repository-preflight: PASS\n'
