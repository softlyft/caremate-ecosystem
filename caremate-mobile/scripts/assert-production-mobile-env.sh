#!/usr/bin/env bash
# Fail closed for CareMate store / production native builds.
# Usage: source env first, then:
#   ./caremate-mobile/scripts/assert-production-mobile-env.sh
set -euo pipefail

SAMPLE_PREFIX='ca-app-pub-3940256099942544'
missing=0
warn=0

require_nonempty() {
  local name="$1"
  local value="${!name:-}"
  if [ -z "$value" ]; then
    echo "Missing required production env: $name"
    missing=1
  fi
}

reject_sample_admob() {
  local name="$1"
  local value="${!name:-}"
  if [ -z "$value" ]; then
    echo "Missing required production AdMob id: $name"
    missing=1
    return
  fi
  if [[ "$value" == "$SAMPLE_PREFIX"* ]]; then
    echo "Refusing Google sample AdMob id in production: $name=$value"
    missing=1
  fi
}

if [ "${EXPO_PUBLIC_APP_ENV:-}" != "production" ]; then
  echo "EXPO_PUBLIC_APP_ENV must be 'production' (got '${EXPO_PUBLIC_APP_ENV:-}')."
  exit 1
fi

require_nonempty EXPO_PUBLIC_SUPABASE_URL
require_nonempty EXPO_PUBLIC_SUPABASE_ANON_KEY
require_nonempty EXPO_PUBLIC_WEBSITE_URL
require_nonempty EXPO_PUBLIC_PAYMENT_URL
require_nonempty EXPO_PUBLIC_COMMUNITY_PORTAL_URL

reject_sample_admob EXPO_PUBLIC_ADMOB_APP_ID_ANDROID
reject_sample_admob EXPO_PUBLIC_ADMOB_APP_ID_IOS

if [[ "${EXPO_PUBLIC_SUPABASE_URL:-}" == *"eybakmhqtotoywwgwgjy"* ]]; then
  echo "Refusing caremate-dev Supabase project in a production store build."
  missing=1
fi

if [ -z "${EXPO_PUBLIC_HEALTH_DATA_GATEWAY_URL:-}" ]; then
  echo "Warning: EXPO_PUBLIC_HEALTH_DATA_GATEWAY_URL is empty — PHI may sync plaintext to Supabase."
  warn=1
fi

if [ -z "${EXPO_PUBLIC_SENTRY_DSN:-}" ]; then
  echo "Warning: EXPO_PUBLIC_SENTRY_DSN is empty — crash reporting disabled in this binary."
  warn=1
fi

if [ "$missing" -ne 0 ]; then
  echo "See caremate-mobile/docs/mobile-release.md and docs/play-android-release.md / ios-app-store-release.md"
  exit 1
fi

echo "Production mobile env checks passed${warn:+ (with warnings)}."
