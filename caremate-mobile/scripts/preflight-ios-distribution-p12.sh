#!/usr/bin/env bash
# Validate IOS_DISTRIBUTION_CERTIFICATE_* before apple-actions/import-codesign-certs.
# Reproduces the same PKCS#12 decode path as `security import` so bad base64/password
# fail with an actionable message instead of a late SecKeychainItemImport error.
set -euo pipefail

: "${IOS_DISTRIBUTION_CERTIFICATE_BASE64:?IOS_DISTRIBUTION_CERTIFICATE_BASE64 is required}"
: "${IOS_DISTRIBUTION_CERTIFICATE_PASSWORD:?IOS_DISTRIBUTION_CERTIFICATE_PASSWORD is required}"

ENV_LABEL="${GITHUB_ENVIRONMENT:-GitHub Environment}"
TMP_DIR="${RUNNER_TEMP:-${TMPDIR:-/tmp}}"
P12_PATH="${TMP_DIR}/caremate-distribution-preflight.p12"
KEYCHAIN_PATH="${TMP_DIR}/caremate-p12-preflight.keychain-db"
KEYCHAIN_PASSWORD="preflight"

cleanup() {
  rm -f "$P12_PATH" 2>/dev/null || true
  security delete-keychain "$KEYCHAIN_PATH" 2>/dev/null || true
}
trap cleanup EXIT

echo "$IOS_DISTRIBUTION_CERTIFICATE_BASE64" | base64 --decode >"$P12_PATH"
if [ ! -s "$P12_PATH" ]; then
  echo "IOS_DISTRIBUTION_CERTIFICATE_BASE64 on ${ENV_LABEL} decoded to an empty file."
  echo "Re-encode the .p12 with: base64 -i CareMate-Distribution.p12 | tr -d '\\n' | pbcopy"
  echo "See caremate-mobile/docs/ios-app-store-release.md"
  exit 1
fi

rm -f "$KEYCHAIN_PATH"
security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH" >/dev/null
security set-keychain-settings -lut 21600 "$KEYCHAIN_PATH" >/dev/null
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH" >/dev/null

if ! security import "$P12_PATH" \
  -k "$KEYCHAIN_PATH" \
  -f pkcs12 \
  -P "$IOS_DISTRIBUTION_CERTIFICATE_PASSWORD" \
  -T /usr/bin/codesign \
  -T /usr/bin/security >/dev/null 2>&1; then
  echo "Invalid IOS_DISTRIBUTION_CERTIFICATE_* on ${ENV_LABEL}."
  echo "security import failed (same as: Unable to decode the provided data)."
  echo "Fix: copy the working certificate + password from the development environment,"
  echo "or re-export CareMate-Distribution.p12 and update both BASE64 and PASSWORD secrets."
  echo "See caremate-mobile/docs/ios-app-store-release.md / ios-testflight-release.md"
  exit 1
fi

echo "PKCS#12 preflight OK (${ENV_LABEL})."
