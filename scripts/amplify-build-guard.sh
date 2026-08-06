#!/usr/bin/env bash
# Skip expensive Amplify build steps when this app's appRoot (and shared deps) are unchanged.
# AMPLIFY_DIFF_DEPLOY in the Console often skips deploy only — this guard runs before npm ci / compile.
#
# Requires AMPLIFY_MONOREPO_APP_ROOT (set per Amplify app in Console).
# Set AMPLIFY_FORCE_BUILD=true on a one-off deploy to bypass (env-only redeploys, manual rebuilds).
set -euo pipefail

MARKER="/tmp/amplify-should-build"
LOG_PREFIX="[amplify-build-guard]"

# Repo-relative paths that should rebuild every connected Amplify app when changed.
SHARED_PATHS=(
  package.json
  package-lock.json
  amplify.yml
  scripts/amplify-install.sh
  scripts/amplify-build-guard.sh
  packages/db-types
)

log() {
  echo "${LOG_PREFIX} $*"
}

cache_key() {
  echo "build-guard-sha-${AMPLIFY_MONOREPO_APP_ROOT:-unknown}"
}

ensure_git_history() {
  local current="${1:-HEAD}"
  local branch="${AWS_BRANCH:-main}"

  if git cat-file -e "${current}^" 2>/dev/null; then
    return 0
  fi

  log "Shallow clone — fetching recent ${branch} history for change detection..."
  git fetch origin "${branch}" --depth=50 2>/dev/null || true

  if ! git cat-file -e "${current}^" 2>/dev/null; then
    git fetch origin "${branch}" --depth=2 2>/dev/null || true
  fi
}

should_skip() {
  [[ -f "$MARKER" ]] && [[ "$(cat "$MARKER")" == "skip" ]]
}

run_check() {
  if [[ "${AMPLIFY_FORCE_BUILD:-}" == "true" ]]; then
    log "AMPLIFY_FORCE_BUILD=true — will build"
    echo "build" >"$MARKER"
    return 0
  fi

  local app_root="${AMPLIFY_MONOREPO_APP_ROOT:-}"
  if [[ -z "$app_root" ]]; then
    log "AMPLIFY_MONOREPO_APP_ROOT unset — will build (set it per Amplify app to enable skip)"
    echo "build" >"$MARKER"
    return 0
  fi

  local current="${AWS_COMMIT_ID:-HEAD}"
  local baseline
  baseline="$(envCache --get "$(cache_key)" 2>/dev/null || true)"

  if [[ -z "$baseline" ]]; then
    ensure_git_history "$current"
    baseline="${current}^"
    log "No cached baseline for ${app_root} — comparing ${baseline}..${current}"
  else
    log "Cached baseline for ${app_root}: ${baseline} → ${current}"
  fi

  if ! git cat-file -e "$baseline" 2>/dev/null; then
    ensure_git_history "$current"
    if ! git cat-file -e "$baseline" 2>/dev/null; then
      baseline="${current}^"
    fi
  fi

  if ! git cat-file -e "$baseline" 2>/dev/null; then
    log "Cannot resolve baseline commit — will build"
    echo "build" >"$MARKER"
    return 0
  fi

  local watch_paths=("$app_root")
  watch_paths+=("${SHARED_PATHS[@]}")

  local changed
  changed="$(git diff --name-only "$baseline" "$current" -- "${watch_paths[@]}" 2>/dev/null || true)"

  if [[ -z "$changed" ]]; then
    log "No changes under ${app_root} or shared paths — skipping npm ci and compile"
    echo "skip" >"$MARKER"
    return 0
  fi

  log "Changes detected — will build:"
  echo "$changed" | sed "s/^/${LOG_PREFIX}   /"
  echo "build" >"$MARKER"
}

run_if_needed() {
  if should_skip; then
    log "Skipping: $*"
    return 0
  fi
  log "Running: $*"
  "$@"
}

record_baseline() {
  if should_skip; then
    log "Skip build — baseline unchanged"
    return 0
  fi

  local app_root="${AMPLIFY_MONOREPO_APP_ROOT:-}"
  local current="${AWS_COMMIT_ID:-HEAD}"
  if [[ -z "$app_root" ]]; then
    return 0
  fi

  envCache --set "$(cache_key)" "$current"
  log "Recorded baseline ${current} for ${app_root}"
}

case "${1:-check}" in
  check) run_check ;;
  run)
    shift
    run_if_needed "$@"
    ;;
  record) record_baseline ;;
  *)
    echo "Usage: $0 check|run <command...>|record" >&2
    exit 1
    ;;
esac
