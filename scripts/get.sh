#!/bin/bash
# Installs the latest Gaveta from GitHub Releases into /Applications and opens it.
# Usage: curl -fsSL https://raw.githubusercontent.com/Frasca-99/gaveta/main/scripts/get.sh | bash
#
# A file fetched by curl carries no quarantine mark, so macOS opens the app
# without the "could not verify" warning that a browser download brings.
set -euo pipefail

ZIP_URL="${GAVETA_ZIP_URL:-https://github.com/Frasca-99/gaveta/releases/latest/download/Gaveta.zip}"
APPS="${GAVETA_APPS:-/Applications}"

if [ "$(uname)" != Darwin ]; then
  echo "A Gaveta é um app para Mac." >&2
  exit 1
fi
if [ "$(sw_vers -productVersion | cut -d. -f1)" -lt 14 ]; then
  echo "A Gaveta precisa do macOS 14 ou mais novo." >&2
  exit 1
fi
# Without permission to write in /Applications, it goes to the user's own.
if [ ! -w "$APPS" ]; then
  APPS="$HOME/Applications"
  mkdir -p "$APPS"
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

echo "Baixando a Gaveta..."
curl -fsSL "$ZIP_URL" -o "$tmp/Gaveta.zip"
ditto -x -k "$tmp/Gaveta.zip" "$tmp"
if [ ! -d "$tmp/Gaveta.app" ]; then
  echo "O download não trouxe o Gaveta.app." >&2
  exit 1
fi

# An older copy running is closed first: quitting puts the screenshot settings back.
if pgrep -x Gaveta >/dev/null; then
  osascript -e 'tell application id "com.neto.Gaveta" to quit' >/dev/null 2>&1 || pkill -x Gaveta || true
  for _ in $(seq 1 50); do
    pgrep -x Gaveta >/dev/null || break
    sleep 0.2
  done
fi

rm -rf "$APPS/Gaveta.app"
ditto "$tmp/Gaveta.app" "$APPS/Gaveta.app"
xattr -dr com.apple.quarantine "$APPS/Gaveta.app" 2>/dev/null || true

open "$APPS/Gaveta.app"
echo "Pronto: a Gaveta está em $APPS e já abriu."
