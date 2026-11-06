#!/usr/bin/env bash
# Populate App Store Connect TestFlight Test Information before IPA upload.
# apple-actions/upload-testflight-build@v5 refuses upload when Beta App Description,
# Feedback Email, or primary locale are missing.
#
# Required env:
#   APP_STORE_CONNECT_ISSUER_ID
#   APP_STORE_CONNECT_KEY_ID
#   APP_STORE_CONNECT_API_KEY_P8
#
# Optional env:
#   TEST_INFORMATION_CONFIG  path to JSON (default: caremate-mobile/.apple-actions/test-information.json)
#   APP_DIR                  app directory scanned by the discoverer (default: caremate-mobile)
#   UPLOAD_TESTFLIGHT_BUILD_REF  git ref of apple-actions/upload-testflight-build (default: v5)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP_DIR="${APP_DIR:-$ROOT/caremate-mobile}"
CONFIG="${TEST_INFORMATION_CONFIG:-$APP_DIR/.apple-actions/test-information.json}"
ACTION_REF="${UPLOAD_TESTFLIGHT_BUILD_REF:-v5}"

for name in APP_STORE_CONNECT_ISSUER_ID APP_STORE_CONNECT_KEY_ID APP_STORE_CONNECT_API_KEY_P8; do
  if [ -z "${!name:-}" ]; then
    echo "Missing required env: $name" >&2
    exit 1
  fi
done

if [ ! -f "$CONFIG" ]; then
  echo "Missing Test Information config: $CONFIG" >&2
  exit 1
fi

TMP="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP"
}
trap cleanup EXIT

KEY_PATH="$TMP/AuthKey.p8"
# ASC accepts PEM with or without a trailing newline; keep the secret verbatim.
printf '%s' "$APP_STORE_CONNECT_API_KEY_P8" >"$KEY_PATH"
if ! grep -q "BEGIN PRIVATE KEY" "$KEY_PATH"; then
  echo "APP_STORE_CONNECT_API_KEY_P8 does not look like a .p8 private key" >&2
  exit 1
fi
# Ensure file ends with a newline for OpenSSL.
printf '\n' >>"$KEY_PATH"

echo "Cloning apple-actions/upload-testflight-build@$ACTION_REF (scripts only)…"
git clone --depth 1 --branch "$ACTION_REF" \
  https://github.com/apple-actions/upload-testflight-build.git \
  "$TMP/upload-testflight-build"

SCRIPT="$TMP/upload-testflight-build/scripts/populate-test-information.sh"
chmod +x "$SCRIPT"

echo "Applying TestFlight Test Information from $CONFIG…"
"$SCRIPT" \
  --dir "$APP_DIR" \
  --config "$CONFIG" \
  --apply \
  --issuer-id "$APP_STORE_CONNECT_ISSUER_ID" \
  --api-key-id "$APP_STORE_CONNECT_KEY_ID" \
  --api-private-key-path "$KEY_PATH"

echo "TestFlight Test Information is ready."
