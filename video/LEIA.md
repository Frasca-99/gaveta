# Vídeo da Gaveta

A Gaveta de verdade, gravada num Mac e montada no Remotion como um reel de design: palco escuro, a tela num quadro arredondado, uma câmera que se aproxima de cada interação, capítulos numerados, câmera lenta onde o movimento é o assunto e as teclas apertadas mostradas na tela.

Os capítulos: 01 Captura, 02 Na borda, 03 Fichas inteiras, 04 Vários de uma vez, 05 Alça elástica, 06 Sem atrito, 07 Arraste. A conversa da Bia, que quer provas, atravessa o vídeo e termina com "É a Gaveta, amor.".

## Montar

```bash
cd video
npm install
npm run estudio   # abre o Remotion Studio para ver e ajustar
npm run render    # gera out/gaveta-app.mp4 (1920 × 1080, 60 fps)
```

Os cortes, a câmera, as legendas e as teclas ficam em `src/Filme.tsx`. Os tempos de cada plano são os das gravações, lidos nos quadros (quando uma tecla foi apertada, uma ficha escolhida, a gaveta aberta). As gravações ficam em `public/app/cena1.mp4` a `cena5.mp4`, fora do git.

## Gravar de novo

As gravações são o app de verdade no Mac, com o cursor movido por um roteiro. Durante a gravação o Mac fica ocupado: não mexa no mouse nem no teclado.

1. Na primeira vez, dê permissão de **Acessibilidade** ao `~/Applications/Roteiro.app` (Ajustes do Sistema → Privacidade e Segurança → Acessibilidade). Ele é criado pelo `preparar.sh` e é o que move o cursor. Quando o `Roteiro.swift` muda, o `preparar.sh` recompila o Roteiro e o macOS esquece a permissão: tire o Roteiro da lista e ponha de novo. O Terminal precisa de permissão para **Gravar a Tela**.
2. Prepare o palco: guarda a área de transferência e os ajustes da Gaveta, põe três prints de exemplo na gaveta e abre o palco (um papel de parede por cima de tudo, a loja e a conversa):

   ```bash
   video/gravacao/preparar.sh
   ```

3. Grave as cenas, uma de cada vez. Cada uma vai para `video/gravacao/.build/cenaN.mov`:

   ```bash
   video/gravacao/grava.sh cena1
   ```

   A ordem importa: a cena 1 tira os prints da loja, a 2 cola na conversa, a 3 alarga e estreita a gaveta, a 4 joga dois prints fora com o X, a 5 arrasta um print para a conversa. Antes da cena 3, volte a gaveta à largura normal.
4. Devolva o Mac como estava:

   ```bash
   video/gravacao/desfazer.sh
   ```

5. Converta as gravações para `public/app/` e confira os tempos dos planos em `src/Filme.tsx`, porque uma gravação nova nunca tem os mesmos tempos:

   ```bash
   for c in 1 2 3 4 5; do ffmpeg -i video/gravacao/.build/cena$c.mov -vf "fps=60,format=yuv420p" -c:v libx264 -crf 15 -g 30 -movflags +faststart -an video/public/app/cena$c.mp4; done
   ```

Os prints jogados fora com o X durante a gravação vão para a Lixeira.
