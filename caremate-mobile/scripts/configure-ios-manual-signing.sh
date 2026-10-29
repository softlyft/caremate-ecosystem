#!/usr/bin/env bash
# After expo prebuild: force Manual signing on the app target so xcodebuild
# does not ignore installed provisioning profiles (Xcode 26 CI).
set -euo pipefail

: "${PROFILE_NAME:?PROFILE_NAME is required}"
: "${PROFILE_TEAM:?PROFILE_TEAM is required}"
: "${APPLE_TEAM_ID:?APPLE_TEAM_ID is required}"

APPLE_TEAM_ID="$(printf '%s' "$APPLE_TEAM_ID" | tr -d '[:space:]')"
PROFILE_TEAM="$(printf '%s' "$PROFILE_TEAM" | tr -d '[:space:]')"

if [ "$APPLE_TEAM_ID" != "$PROFILE_TEAM" ]; then
  echo "ERROR: APPLE_TEAM_ID ($APPLE_TEAM_ID) does not match the provisioning"
  echo "profile team ($PROFILE_TEAM). Xcode then reports:"
  echo "  No profile for team '…' matching '$PROFILE_NAME' found"
  echo "Fix: set GitHub Environment secret APPLE_TEAM_ID to $PROFILE_TEAM"
  exit 1
fi

ROOT="${1:-.}"
PBXPROJ="$(find "$ROOT/ios" -maxdepth 2 -name project.pbxproj ! -path '*/Pods/*' | head -1)"
if [ -z "$PBXPROJ" ]; then
  echo "No ios/*.xcodeproj/project.pbxproj found under $ROOT"
  exit 1
fi

echo "Configuring manual signing in $PBXPROJ"
echo "  DEVELOPMENT_TEAM=$APPLE_TEAM_ID"
echo "  PROVISIONING_PROFILE_SPECIFIER=$PROFILE_NAME"

python3 - "$PBXPROJ" "$APPLE_TEAM_ID" "$PROFILE_NAME" <<'PY'
import pathlib
import re
import sys

path = pathlib.Path(sys.argv[1])
team, profile_name = sys.argv[2], sys.argv[3]
text = path.read_text()

replacements = {
    "CODE_SIGN_STYLE": "Manual",
    "DEVELOPMENT_TEAM": team,
    "PROVISIONING_PROFILE_SPECIFIER": profile_name,
    "CODE_SIGN_IDENTITY": "Apple Distribution",
}


def upsert_setting(block: str, key: str, value: str) -> str:
    line = f"\t\t\t\t{key} = {value};"
    # Quoted keys like "CODE_SIGN_IDENTITY[sdk=iphoneos*]"
    pattern = re.compile(
        rf'^[ \t]*(?:{re.escape(key)}|"{re.escape(key)}") = .*?;[ \t]*$',
        re.M,
    )
    if pattern.search(block):
        return pattern.sub(line, block)
    return block.rstrip() + "\n" + line + "\n"


def patch_build_settings(body: str) -> str:
    if "PRODUCT_BUNDLE_IDENTIFIER" not in body:
        return body
    for key, value in replacements.items():
        quoted = value if value.startswith('"') else value
        # Non-identifier values that need quotes
        if key in ("CODE_SIGN_IDENTITY", "PROVISIONING_PROFILE_SPECIFIER") or " " in value:
            quoted = f'"{value}"'
        body = upsert_setting(body, key, quoted)
    # Force iphoneos identity away from "iPhone Developer"
    body = re.sub(
        r'^[ \t]*"CODE_SIGN_IDENTITY\[sdk=iphoneos\*\]" = .*?;[ \t]*$',
        '\t\t\t\t"CODE_SIGN_IDENTITY[sdk=iphoneos*]" = "Apple Distribution";',
        body,
        flags=re.M,
    )
    if '"CODE_SIGN_IDENTITY[sdk=iphoneos*]"' not in body:
        body = body.rstrip() + '\n\t\t\t\t"CODE_SIGN_IDENTITY[sdk=iphoneos*]" = "Apple Distribution";\n'
    return body


out = []
last = 0
for m in re.finditer(r"buildSettings = \{", text):
    out.append(text[last : m.end()])
    start = m.end()
    # Find matching closing }; for this buildSettings dict (brace depth).
    depth = 1
    i = start
    while i < len(text) and depth:
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
        i += 1
    body = text[start : i - 1]
    out.append(patch_build_settings(body))
    out.append(text[i - 1 : i])  # closing }
    last = i
out.append(text[last:])
path.write_text("".join(out))
print("Manual signing settings applied.")
PY
