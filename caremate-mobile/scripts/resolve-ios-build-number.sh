#!/usr/bin/env bash
# Resolve CFBundleVersion for CareMate iOS CI (TestFlight + App Store).
#
# Usage (prints the build number on stdout):
#   INPUT_BUILD_NUMBER=… OFFSET=… GITHUB_RUN_ID=… ./resolve-ios-build-number.sh
#
# Priority:
#   1. Explicit INPUT_BUILD_NUMBER (workflow_dispatch / workflow_call override)
#   2. OFFSET + GITHUB_RUN_ID
#
# github.run_id is unique across every workflow in the repository, so TestFlight
# (main) and App Store (prod) cannot collide the way per-workflow run_number can.
# OFFSET (vars.IOS_BUILD_NUMBER_OFFSET) is an optional additive bump when App Store
# Connect already has a higher build than recent run IDs (rare).

set -euo pipefail

if [ -n "${INPUT_BUILD_NUMBER:-}" ]; then
  BUILD_NUMBER="${INPUT_BUILD_NUMBER}"
else
  if [ -z "${GITHUB_RUN_ID:-}" ]; then
    echo "GITHUB_RUN_ID is required when INPUT_BUILD_NUMBER is empty" >&2
    exit 1
  fi
  if ! [[ "$GITHUB_RUN_ID" =~ ^[1-9][0-9]*$ ]]; then
    echo "Invalid GITHUB_RUN_ID: $GITHUB_RUN_ID" >&2
    exit 1
  fi
  BASE="${OFFSET:-0}"
  if ! [[ "$BASE" =~ ^[0-9]+$ ]]; then
    echo "Invalid IOS_BUILD_NUMBER_OFFSET: $BASE" >&2
    exit 1
  fi
  BUILD_NUMBER=$((BASE + GITHUB_RUN_ID))
fi

if ! [[ "$BUILD_NUMBER" =~ ^[1-9][0-9]*$ ]]; then
  echo "Invalid IOS_BUILD_NUMBER: $BUILD_NUMBER" >&2
  exit 1
fi

echo "$BUILD_NUMBER"
