#!/bin/bash
# Sets the stage for recording: builds the stage and the cursor player, keeps the clipboard and
# Gaveta's settings, puts three sample prints in the drawer, and opens the stage over everything.
# PALCO_CENARIO=uso sets the everyday-use story, PALCO_CENARIO=traicao the English joke; the
# reel's is the default. Run it again between takes to start over. desfazer.sh puts it all back.
# See video/LEIA.md.
set -uo pipefail
G="$(cd "$(dirname "$0")" && pwd)"
B="$G/.build"
mkdir -p "$B/demo" "$B/marcas"
cd "$G"

# the stage, the cursor player and the helpers
if [ ! -x "$B/Palco.app/Contents/MacOS/Palco" ] || [ Palco.swift -nt "$B/Palco.app/Contents/MacOS/Palco" ]; then
  mkdir -p "$B/Palco.app/Contents/MacOS" "$B/src/palco"
  cp Palco.swift "$B/src/palco/main.swift"
  swiftc -O -o "$B/Palco.app/Contents/MacOS/Palco" "$B/src/palco/main.swift"
  printf '%s' '<?xml version="1.0" encoding="UTF-8"?><plist version="1.0"><dict><key>CFBundleIdentifier</key><string>local.gaveta.palco</string><key>CFBundleName</key><string>Conversa</string><key>CFBundleExecutable</key><string>Palco</string><key>CFBundlePackageType</key><string>APPL</string><key>NSHighResolutionCapable</key><true/></dict></plist>' > "$B/Palco.app/Contents/Info.plist"
fi
# Roteiro keeps its Accessibility permission only while its binary stays the same, so it is
# built once and rebuilt only on request: RECOMPILAR_ROTEIRO=1 (then allow it again).
ROTEIRO="$HOME/Applications/Roteiro.app"
if [ ! -x "$ROTEIRO/Contents/MacOS/roteiro" ] || [ "${RECOMPILAR_ROTEIRO:-0}" = 1 ]; then
  mkdir -p "$ROTEIRO/Contents/MacOS" "$B/src/roteiro"
  cp Roteiro.swift "$B/src/roteiro/main.swift"
  swiftc -O -o "$ROTEIRO/Contents/MacOS/roteiro" "$B/src/roteiro/main.swift"
  printf '%s' '<?xml version="1.0" encoding="UTF-8"?><plist version="1.0"><dict><key>CFBundleIdentifier</key><string>local.gaveta.roteiro</string><key>CFBundleName</key><string>Roteiro</string><key>CFBundleExecutable</key><string>roteiro</string><key>CFBundlePackageType</key><string>APPL</string><key>LSUIElement</key><true/></dict></plist>' > "$ROTEIRO/Contents/Info.plist"
  codesign --force --sign - "$ROTEIRO" >/dev/null 2>&1
fi
if [ ! -x "$B/apoio" ] || [ Apoio.swift -nt "$B/apoio" ]; then
  mkdir -p "$B/src/apoio"; cp Apoio.swift "$B/src/apoio/main.swift"
  swiftc -O -o "$B/apoio" "$B/src/apoio/main.swift"
fi

# three sample prints, a couple of hours old, from the landing's own
P="$G/../../site/assets/prints"
cp "$P/painel.png" "$B/demo/Captura de Tela 2026-10-17 às 14.02.11.png"
cp "$P/paleta.png" "$B/demo/Captura de Tela 2026-10-17 às 15.40.27.png"
cp "$P/codigo.png" "$B/demo/Captura de Tela 2026-10-17 às 16.05.52.png"
"$B/apoio" data "$B/demo/Captura de Tela 2026-10-17 às 14.02.11.png" 125 >/dev/null
"$B/apoio" data "$B/demo/Captura de Tela 2026-10-17 às 15.40.27.png" 38 >/dev/null
"$B/apoio" data "$B/demo/Captura de Tela 2026-10-17 às 16.05.52.png" 12 >/dev/null

# what is put back afterwards, kept once per session: running this again between takes only
# resets the drawer and the stage
if [ ! -f "$B/sessao" ]; then
  touch "$B/inicio.ref"
  "$B/apoio" prancheta-salvar "$B/prancheta.plist"
  defaults export com.neto.Gaveta "$B/gaveta-antes.plist"
  touch "$B/sessao"
fi
[ -f "$B/palco.pid" ] && kill "$(cat "$B/palco.pid")" >/dev/null 2>&1 || true

osascript -e 'tell application id "com.neto.Gaveta" to quit' >/dev/null 2>&1 || true
for _ in $(seq 1 50); do pgrep -x Gaveta >/dev/null || break; sleep 0.2; done
defaults write com.neto.Gaveta pinPaths -array \
  "$B/demo/Captura de Tela 2026-10-17 às 16.05.52.png" \
  "$B/demo/Captura de Tela 2026-10-17 às 15.40.27.png" \
  "$B/demo/Captura de Tela 2026-10-17 às 14.02.11.png"
defaults write com.neto.Gaveta glassWidth -float 300
open -a Gaveta
sleep 2.5
PALCO_CENARIO="${PALCO_CENARIO:-bia}" PALCO_MAPA="$B/palco.json" "$B/Palco.app/Contents/MacOS/Palco" >/dev/null 2>&1 &
echo $! > "$B/palco.pid"
sleep 3
echo "Palco pronto (${PALCO_CENARIO:-bia}). Grave com: video/gravacao/grava.sh cena1 (até cena5), grava.sh uso ou grava.sh traicao"
