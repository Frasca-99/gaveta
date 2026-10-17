#!/bin/bash
# grava.sh <cena>: records the whole screen at 60 fps while Roteiro plays cenas/<cena>.json, then
# prints when each marked moment happened. The take goes to .build/<cena>.mov.
set -uo pipefail
G="$(cd "$(dirname "$0")" && pwd)"
B="$G/.build"
c="$1"
tela=$(ffmpeg -hide_banner -f avfoundation -list_devices true -i "" 2>&1 | sed -n 's/.*\[\([0-9]*\)\] Capture screen 0.*/\1/p' | head -1)
python3 -c 'import time; print(time.time())' > "$B/marcas/$c.inicio"
ffmpeg -hide_banner -loglevel error -f avfoundation -capture_cursor 1 -framerate 60 -pixel_format nv12 -i "${tela:-1}:none" \
  -c:v h264_videotoolbox -b:v 45M -realtime 1 -y "$B/$c.mov" > "$B/marcas/$c.ffmpeg.log" 2>&1 &
sleep 1.5
open -W --env PALCO_MAPA="$B/palco.json" "$HOME/Applications/Roteiro.app" --args "$G/cenas/$c.json" "$B/marcas/$c.json"
sleep 1.2
pkill -INT -x ffmpeg
sleep 2.5
python3 - "$B/marcas/$c" <<'PY'
import json, sys
base = sys.argv[1]
ini = float(open(base + ".inicio").read())
m = json.load(open(base + ".json"))
for k in m["marcas"]:
    print(f"{k['t'] + m['inicio'] - ini:7.2f}s  {k['nome']}")
PY
