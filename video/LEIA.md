# Vídeo da Gaveta

O vídeo de lançamento, para o X e o LinkedIn. A mesa da landing 2 é gravada por um roteiro e montada no Remotion com abertura, legendas, uma câmera que se aproxima de onde está a ação e um encerramento com o link.

## Gravar a mesa

Com a landing servida em `http://127.0.0.1:4321/`:

```bash
python3 -m http.server 4321 --bind 127.0.0.1 --directory site
node video/gravar.mjs
```

Leva uns 7 minutos: o tempo da página corre 10 vezes mais devagar para cada quadro sair nítido. Gera `video/public/mesa.mp4` e `video/public/roteiro.json` (quando cada passo acontece). Para ensaiar o roteiro sem tirar as fotos: `GAVETA_ENSAIO=1 node video/gravar.mjs`.

## Montar

```bash
cd video
npm install
npm run estudio   # abre o Remotion Studio para ver e ajustar
npm run render    # gera out/gaveta-16x9.mp4 e out/gaveta-1x1.mp4
```

As legendas, os enquadramentos da câmera e os tempos de abertura e encerramento ficam em `src/Gaveta.tsx`.
