#!/usr/bin/env bash
# Remove stale DMG artifacts left by failed or interrupted macOS bundles.
# Tauri writes the DMG in bundle/macos/ before moving it to bundle/dmg/;
# leftover files cause "hdiutil: convert failed - File exists".

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUNDLE_MACOS="$ROOT/src-tauri/target/release/bundle/macos"

if [[ -d "$BUNDLE_MACOS" ]]; then
  rm -f "$BUNDLE_MACOS"/*.dmg
fi
