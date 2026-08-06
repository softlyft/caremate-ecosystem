#!/usr/bin/env bash
# Shared Amplify preBuild install — run from repo root (buildPath: /).
# Skips npm ci when Amplify's node_modules cache matches package-lock.json.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

LOCKFILE="$ROOT/package-lock.json"
STAMP="$ROOT/node_modules/.amplify-lock-stamp"

if [[ ! -f "$LOCKFILE" ]]; then
  echo "package-lock.json missing — cannot install"
  exit 1
fi

if [[ -d "$ROOT/node_modules" ]] && [[ -f "$STAMP" ]] && ! [[ "$LOCKFILE" -nt "$STAMP" ]]; then
  echo "node_modules cache hit (lockfile unchanged) — skipping npm ci"
  exit 0
fi

echo "Running npm ci (cold cache or lockfile changed)..."
npm ci --include=optional
touch "$STAMP"
