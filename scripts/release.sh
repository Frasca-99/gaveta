#!/bin/bash
# Builds the Gaveta people download: one app for Apple silicon and Intel,
# zipped for GitHub Releases as build/Gaveta.zip.
# It is signed only locally (no Apple Developer account), so on the first
# open macOS asks the user to confirm; the README explains how.
# Usage: scripts/release.sh
set -euo pipefail
cd "$(dirname "$0")/.."

UNIVERSAL=1 scripts/build-app.sh release
rm -f build/Gaveta.zip
ditto -c -k --sequesterRsrc --keepParent build/Gaveta.app build/Gaveta.zip
echo "build/Gaveta.zip ($(lipo -archs build/Gaveta.app/Contents/MacOS/Gaveta), $(du -h build/Gaveta.zip | cut -f1))"
