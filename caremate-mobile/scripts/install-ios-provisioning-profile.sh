#!/usr/bin/env bash
# Decode IOS_PROVISIONING_PROFILE_BASE64, install for Xcode 15 + 16/26, verify
# the imported Apple Distribution identity is embedded in the profile.
set -euo pipefail

: "${IOS_PROVISIONING_PROFILE_BASE64:?IOS_PROVISIONING_PROFILE_BASE64 is required}"

TMP_DIR="${RUNNER_TEMP:-${TMPDIR:-/tmp}}"
PROFILE_PATH="${TMP_DIR}/CareMate.mobileprovision"
PLIST_PATH="${TMP_DIR}/CareMate.mobileprovision.plist"

echo "$IOS_PROVISIONING_PROFILE_BASE64" | base64 --decode >"$PROFILE_PATH"
test -s "$PROFILE_PATH"

security cms -D -i "$PROFILE_PATH" >"$PLIST_PATH"
PROFILE_UUID="$(/usr/libexec/PlistBuddy -c 'Print UUID' "$PLIST_PATH")"
PROFILE_NAME="$(/usr/libexec/PlistBuddy -c 'Print Name' "$PLIST_PATH")"
PROFILE_TEAM="$(/usr/libexec/PlistBuddy -c 'Print TeamIdentifier:0' "$PLIST_PATH")"
PROFILE_APP_ID="$(/usr/libexec/PlistBuddy -c 'Print Entitlements:application-identifier' "$PLIST_PATH")"
PROFILE_EXPIRY="$(/usr/libexec/PlistBuddy -c 'Print ExpirationDate' "$PLIST_PATH" 2>/dev/null || true)"

PROFILE_DESTS=(
  "$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles"
  "$HOME/Library/MobileDevice/Provisioning Profiles"
)
for dest in "${PROFILE_DESTS[@]}"; do
  mkdir -p "$dest"
  cp "$PROFILE_PATH" "$dest/${PROFILE_UUID}.mobileprovision"
  test -f "$dest/${PROFILE_UUID}.mobileprovision"
done

echo "Installed provisioning profile: $PROFILE_NAME ($PROFILE_UUID)"
echo "  team=$PROFILE_TEAM appId=$PROFILE_APP_ID expiry=$PROFILE_EXPIRY"
echo "  locations:"
for dest in "${PROFILE_DESTS[@]}"; do
  ls -la "$dest/${PROFILE_UUID}.mobileprovision"
done

# SHA-1 fingerprints of certificates embedded in the profile (uppercase hex).
PROFILE_CERT_SHAS="$(
  python3 - "$PLIST_PATH" <<'PY'
import hashlib, plistlib, sys
with open(sys.argv[1], "rb") as f:
    plist = plistlib.load(f)
for cert in plist.get("DeveloperCertificates", []):
    der = bytes(cert)
    print(hashlib.sha1(der).hexdigest().upper())
PY
)"
if [ -z "$PROFILE_CERT_SHAS" ]; then
  echo "Provisioning profile embeds no DeveloperCertificates."
  exit 1
fi
echo "Profile certificate SHA-1(s):"
echo "$PROFILE_CERT_SHAS" | sed 's/^/  /'

# Identities currently available to codesign (from import-codesign-certs keychain).
IDENTITY_OUT="$(security find-identity -v -p codesigning 2>/dev/null || true)"
echo "Available codesigning identities:"
echo "$IDENTITY_OUT" | sed 's/^/  /' || true

MATCHED=0
while IFS= read -r sha; do
  [ -z "$sha" ] && continue
  if echo "$IDENTITY_OUT" | grep -qi -- "$sha"; then
    MATCHED=1
    echo "Matched profile cert $sha to a local codesigning identity."
  fi
done <<<"$PROFILE_CERT_SHAS"

if [ "$MATCHED" -ne 1 ]; then
  echo "ERROR: None of the certificates in this provisioning profile match an"
  echo "imported Apple Distribution identity in the keychain."
  echo "Xcode then reports: No profile matching '$PROFILE_NAME' found."
  echo "Fix: In Apple Developer → Profiles, regenerate the App Store profile for"
  echo "  $PROFILE_APP_ID"
  echo "selecting the same Distribution certificate you exported as the .p12,"
  echo "then update IOS_PROVISIONING_PROFILE_BASE64 on this GitHub Environment."
  exit 1
fi

{
  echo "PROFILE_UUID=$PROFILE_UUID"
  echo "PROFILE_NAME=$PROFILE_NAME"
  echo "PROFILE_TEAM=$PROFILE_TEAM"
  echo "PROFILE_APP_ID=$PROFILE_APP_ID"
} >>"$GITHUB_ENV"
