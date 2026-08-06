#!/usr/bin/env bash
# Skip expensive Amplify build steps when this app's appRoot (and shared deps) are unchanged.
# AMPLIFY_DIFF_DEPLOY in the Console often skips deploy only — this guard runs before npm ci / compile.
#
# Requires AMPLIFY_MONOREPO_APP_ROOT (set per Amplify app in Console).
# Set AMPLIFY_FORCE_BUILD=true on a one-off deploy to bypass (env-only redeploys, manual rebuilds).
set -euo pipefail

MARKER="/tmp/amplify-should-build"

# Repo-relative paths that should rebuild every connected Amplify app when changed.
SHARED_PATHS=(
  package.json
  package-lock.json
  amplify.yml
  scripts/amplify-install.sh
  scripts/amplify-build-guard.sh
  packages/db-types
)

run_check() {
  if [[ "${AMPLIFY_FORCE_BUILD:-}" == "true" ]]; then
    echo "AMPLIFY_FORCE_BUILD=true — will build"
    echo "build" >"$MARKER"
    return 0
  fi

  local app_root="${AMPLIFY_MONOREPO_APP_ROOT:-}"
  if [[ -z "$app_root" ]]; then
    echo "AMPLIFY_MONOREPO_APP_ROOT unset — will build (configure it per Amplify app to enable skip)"
    echo "build" >"$MARKER"
    return 0
  fi

  local current="${AWS_COMMIT_ID:-HEAD}"
  local previous="${current}^"
  if ! git cat-file -e "$previous" 2>/dev/null; then
    echo "No parent commit in clone — will build"
    echo "build" >"$MARKER"
    return 0
  fi

  local watch_paths=("$app_root")
  watch_paths+=("${SHARED_PATHS[@]}")

  local changed
  changed="$(git diff --name-only "$previous" "$current" -- "${watch_paths[@]}" 2>/dev/null || true)"

  if [[ -z "$changed" ]]; then
    echo "No changes under ${app_root} or shared monorepo paths — skipping build (deploy unchanged)"
    echo "skip" >"$MARKER"
    return 0
  fi

  echo "Changes detected — will build:"
  echo "$changed" | sed 's/^/  /'
  echo "build" >"$MARKER"
}

skip_if_marked() {
  if [[ -f "$MARKER" ]] && [[ "$(cat "$MARKER")" == "skip" ]]; then
    echo "Build skipped (no relevant file changes since previous commit)."
    exit 0
  fi
}

case "${1:-check}" in
  check) run_check ;;
  skip_if_marked) skip_if_marked ;;
  *)
    echo "Usage: $0 check|skip_if_marked" >&2
    exit 1
    ;;
esac
