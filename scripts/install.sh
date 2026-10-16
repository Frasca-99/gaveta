#!/bin/bash
# Builds Gaveta and installs it in /Applications, replacing the running copy.
# Usage: scripts/install.sh
set -euo pipefail
cd "$(dirname "$0")/.."

scripts/build-app.sh release

# Quitting puts the screenshot settings back; the new copy applies them again.
if pgrep -x Gaveta >/dev/null; then
  osascript -e 'tell application id "com.neto.Gaveta" to quit' >/dev/null 2>&1 || pkill -x Gaveta || true
  while pgrep -x Gaveta >/dev/null; do sleep 0.2; done
fi

rm -rf /Applications/Gaveta.app
cp -R build/Gaveta.app /Applications/Gaveta.app
open /Applications/Gaveta.app
echo "Installed /Applications/Gaveta.app"
