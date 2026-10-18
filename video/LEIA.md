# Vídeos da Gaveta

Três vídeos da Gaveta de verdade, gravados num Mac e montados no Remotion (1920 × 1080, 60 fps):

- **Reel** (`src/Filme.tsx`, `out/gaveta-reel.mp4`): o que o app tem de bonito, em capítulos. Palco escuro, a tela num quadro arredondado, câmera que se aproxima de cada gesto, câmera lenta onde o movimento é o assunto e as teclas na tela. Os capítulos: 01 Captura, 02 Na borda, 03 Fichas inteiras, 04 Vários de uma vez, 05 Alça elástica, 06 Sem atrito, 07 Arraste. A conversa da Bia, que quer provas, atravessa o vídeo e termina com "É a Gaveta, amor.".
- **Na prática** (`src/Uso.tsx`, `out/gaveta-na-pratica.mp4`): um uso de verdade, num take só e em tempo real. O suporte pede prints de um pagamento que falhou; a pessoa clica em Pagar, tira um print do erro e outro do pedido, encosta na borda, escolhe os dois e arrasta os dois juntos para a conversa. Visual claro, câmera que acompanha as mãos e uma legenda curta com as teclas de cada passo.
- **Prova** (`src/Prova.tsx`, `out/gaveta-proof.mp4`): em inglês, montado como uma figura de laboratório. A tela fica num cartão claro sobre uma página clara, com rótulos pequenos em fonte mono nos cantos (a figura, o que ela mostra, o gesto e uma leitura ao vivo, como quantos prints a gaveta guarda) e o link embaixo. A Emma quer provas às 3 da manhã; o Jake tira dois prints, escolhe os dois na gaveta e arrasta para a conversa. No fim, o link ganha "Use it for free", sem cartão de encerramento.

## Montar

```bash
cd video
npm install
npm run estudio       # abre o Remotion Studio para ver e ajustar
npm run render:reel   # gera out/gaveta-reel.mp4
npm run render:uso    # gera out/gaveta-na-pratica.mp4
npm run render:prova  # gera out/gaveta-proof.mp4
```

A câmera, as legendas e as teclas ficam em `src/Filme.tsx`, `src/Uso.tsx` e `src/Prova.tsx`. Os tempos são os das gravações, lidos nos quadros (quando uma tecla foi apertada, uma ficha escolhida, a gaveta aberta). As gravações ficam fora do git: `public/app/cena1.mp4` a `cena5.mp4` (Reel), `public/uso/uso.mp4` (Na prática) e `public/ingles/traicao.mp4` (Prova).

## Gravar de novo

As gravações são o app de verdade no Mac, com o cursor movido por um roteiro. Durante a gravação o Mac fica ocupado: não mexa no mouse nem no teclado.

1. Na primeira vez, dê permissão de **Acessibilidade** ao `~/Applications/Roteiro.app` (Ajustes do Sistema → Privacidade e Segurança → Acessibilidade). Ele é criado pelo `preparar.sh` e é o que move o cursor. A permissão vale enquanto o Roteiro não for recompilado; ele só é recompilado com `RECOMPILAR_ROTEIRO=1`, e aí é preciso tirar o Roteiro da lista e pôr de novo. O Terminal precisa de permissão para **Gravar a Tela**.
2. Prepare o palco: guarda a área de transferência e os ajustes da Gaveta, põe três prints de exemplo na gaveta e abre o palco (um papel de parede por cima de tudo, a loja e a conversa). Para o vídeo Na prática, com o suporte e a loja que falha ao pagar, use `PALCO_CENARIO=uso`. Para a Prova, `PALCO_CENARIO=traicao` põe a loja e a conversa da Emma em inglês; a Gaveta segue o idioma do Mac, então o Mac precisa estar em inglês:

   ```bash
   video/gravacao/preparar.sh                         # Reel
   PALCO_CENARIO=uso video/gravacao/preparar.sh       # Na prática
   PALCO_CENARIO=traicao video/gravacao/preparar.sh   # Prova
   ```

   Rodar o `preparar.sh` de novo entre um take e outro só recomeça o palco e a gaveta; o que é devolvido no fim continua sendo o de antes da primeira vez.
3. Grave. Cada take vai para `video/gravacao/.build/<nome>.mov`:

   ```bash
   video/gravacao/grava.sh cena1   # Reel: cena1 a cena5, nessa ordem
   video/gravacao/grava.sh uso     # Na prática
   video/gravacao/grava.sh traicao # Prova
   ```

   No Reel, a cena 1 tira os prints da loja, a 2 cola na conversa, a 3 alarga e estreita a gaveta, a 4 joga dois prints fora com o X e a 5 arrasta um print para a conversa. Antes da cena 3, volte a gaveta à largura normal.
4. Devolva o Mac como estava:

   ```bash
   video/gravacao/desfazer.sh
   ```

5. Converta as gravações e confira os tempos em `src/Filme.tsx`, `src/Uso.tsx` ou `src/Prova.tsx`, porque um take novo nunca tem os mesmos tempos:

   ```bash
   for c in 1 2 3 4 5; do ffmpeg -i video/gravacao/.build/cena$c.mov -vf "fps=60,format=yuv420p" -c:v libx264 -crf 15 -g 30 -movflags +faststart -an video/public/app/cena$c.mp4; done
   ffmpeg -i video/gravacao/.build/uso.mov -vf "fps=60,format=yuv420p" -c:v libx264 -crf 15 -g 30 -movflags +faststart -an video/public/uso/uso.mp4
   ffmpeg -i video/gravacao/.build/traicao.mov -vf "fps=60,format=yuv420p" -c:v libx264 -crf 15 -g 30 -movflags +faststart -an video/public/ingles/traicao.mp4
   ```

Os prints tirados durante a gravação saem da pasta da Gaveta e ficam em `video/gravacao/.build/capturas/`; os jogados fora com o X vão para a Lixeira.
