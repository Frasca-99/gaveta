# Gaveta

Seus prints guardados como fichas numa gaveta de fichário, na borda direita da tela do Mac. Tire um print com o atalho de sempre e ele voa para a gaveta na hora. Selecione vários e cole todos de uma vez, num chat, num chamado ou num e-mail.

App nativo para macOS 14+, em Swift (AppKit + SwiftUI), sem dependências e sem acesso à rede.

## Uso

| Gesto | O que faz |
|---|---|
| Encostar o ponteiro na borda direita, ou ⌃⌥G | Abre a gaveta |
| Clique | Copia o print |
| Bolinha no canto, ⌘-clique ou ⇧-clique | Seleciona vários |
| Copiar todos | Um único ⌘V cola os prints selecionados |
| Arrastar um selecionado | Leva todos os selecionados juntos |
| Duplo clique | Abre no Pré-Visualização |
| Clicar e segurar | Abre na Marcação |
| Clique forte | Visualização Rápida |
| Arrastar para uma pasta | Guarda o arquivo ali |
| X, ou arrastar para o Lixo | Descarta |

Na primeira vez, a Gaveta pergunta se pode mostrar os prints na hora. Se você aceitar, ela desliga a miniatura flutuante do macOS e guarda os prints numa pasta própria, para a Mesa não encher; seus ajustes voltam quando a Gaveta é encerrada.

## Compilar e instalar

Precisa do Swift (Xcode ou as Command Line Tools).

```bash
scripts/install.sh
```

Compila, instala em `/Applications/Gaveta.app` e abre. Para só compilar: `scripts/build-app.sh`.

## Licença

MIT. Veja [LICENSE](LICENSE).
