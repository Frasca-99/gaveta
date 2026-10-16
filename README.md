# Gaveta

Seus prints guardados como fichas numa gaveta de fichário, na borda direita da tela do Mac. Tire um print com o atalho de sempre e ele voa para a gaveta na hora. Selecione vários e cole todos de uma vez, num chat, num chamado ou num e-mail.

App nativo para macOS 14+, em Swift (AppKit + SwiftUI), sem dependências e sem acesso à rede.

## Uso

| Gesto | O que faz |
|---|---|
| Encostar o ponteiro na borda direita, ou ⌃⌥G | Abre a gaveta |
| Clique | Copia o print |
| ⌘-clique, ⇧-clique ou o círculo no canto | Seleciona vários |
| Copiar todos | Um único ⌘V cola os prints selecionados |
| Arrastar um selecionado | Leva todos os selecionados juntos |
| Duplo clique | Abre no Pré-Visualização |
| Clicar e segurar | Abre na Marcação |
| Clique forte | Visualização Rápida |
| Arrastar para uma pasta | Guarda o arquivo ali |
| X, ou arrastar para o Lixo | Descarta |

Na primeira vez, a Gaveta pergunta se pode mostrar os prints na hora. Se você aceitar, ela desliga a miniatura flutuante do macOS e guarda os prints numa pasta própria, para a Mesa não encher; seus ajustes voltam quando a Gaveta é encerrada.

## Instalar

1. Baixe o **Gaveta.zip** da [última versão](https://github.com/Frasca-99/gaveta/releases/latest) e abra o arquivo: sai o `Gaveta.app`.
2. Arraste o `Gaveta.app` para a pasta **Aplicativos**.
3. Abra a Gaveta.

A Gaveta é gratuita e não é assinada com uma conta de desenvolvedor da Apple, então na primeira vez o macOS avisa que não conseguiu verificá-la. Para abrir mesmo assim, uma vez só:

- **macOS 15 ou mais novo:** tente abrir a Gaveta e feche o aviso. Vá em **Ajustes do Sistema → Privacidade e Segurança**, role até o fim e clique em **Abrir Mesmo Assim** ao lado da Gaveta. Confirme com a sua senha.
- **macOS 14:** clique com o botão direito (ou Control-clique) no `Gaveta.app`, escolha **Abrir** e confirme em **Abrir**.

Depois disso ela abre normalmente. Quem preferir o Terminal libera com:

```bash
xattr -dr com.apple.quarantine /Applications/Gaveta.app
```

Funciona em Macs com Apple silicon e Intel, com macOS 14 ou mais novo, sem internet e sem conta.

### Compilar você mesmo

Um app compilado no seu próprio Mac abre sem aviso nenhum. Precisa do Swift (Xcode ou as Command Line Tools):

```bash
git clone https://github.com/Frasca-99/gaveta.git
cd gaveta
scripts/install.sh
```

Compila, instala em `/Applications/Gaveta.app` e abre. Para só compilar: `scripts/build-app.sh`. Para gerar o `Gaveta.zip` de uma versão (Apple silicon e Intel juntos): `scripts/release.sh`.

## Licença

MIT. Veja [LICENSE](LICENSE).
