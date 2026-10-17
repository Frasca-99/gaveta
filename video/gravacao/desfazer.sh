#!/bin/bash
# Puts the Mac back as it was: closes the stage, gives Gaveta its settings and drawer back, moves
# the screenshots taken while recording out of Gaveta's folder, and restores the clipboard.
set -uo pipefail
G="$(cd "$(dirname "$0")" && pwd)"
B="$G/.build"
pkill -INT -x ffmpeg >/dev/null 2>&1 || true
[ -f "$B/palco.pid" ] && kill "$(cat "$B/palco.pid")" >/dev/null 2>&1 || true
osascript -e 'tell application id "com.neto.Gaveta" to quit' >/dev/null 2>&1 || true
for _ in $(seq 1 50); do pgrep -x Gaveta >/dev/null || break; sleep 0.2; done
mkdir -p "$B/capturas"
find "$HOME/Library/Application Support/Gaveta/Capturas" -type f -newer "$B/inicio.ref" -exec mv {} "$B/capturas/" \; 2>/dev/null || true
defaults import com.neto.Gaveta "$B/gaveta-antes.plist"
open -a Gaveta
"$B/apoio" prancheta-restaurar "$B/prancheta.plist" >/dev/null
echo "Mac devolvido. Prints jogados fora com o X durante a gravação ficam na Lixeira."
