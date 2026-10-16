# Landing 2: a Gaveta funcionando de verdade

A página inteira é a mesa de um Mac, e a Gaveta funciona nela. Quem visita tira um print ali mesmo, vê o print voar para a gaveta na borda direita, abre a gaveta, escolhe vários e cola todos de uma vez num chamado. Ninguém precisa ler como funciona: usa.

A landing 1 (minimalista, com as duas figuras de linha) continua na branch `landing`. Esta é a branch `landing-2`.

## A mesa

```
 Chamados  Arquivo  Editar  Visualizar  Janela  Ajuda        [gaveta] [wi-fi] [bateria]  sex. 16 de out. 12:15
┌──────────────────────┐                                                   ▫ fichario.svg   ▫ por-dentro.png
│ ● ● ●  loja.exemplo  │          [ícone]
│  Finalizar compra    │     Seus prints,                                                        ▌
│  ⚠ Erro 500 ...      │     numa gaveta.                          ┌──────────────────┐          ▌ ← borda de
└──────────────────────┘     Cada print que você tira cai          │ COMO USAR (ficha)│          ▌   carvalho
┌──────────────────────┐     numa gaveta na borda da tela...       │ clique copia ... │          ▌   da gaveta
│ ● ● ●  Chamados      │     [Baixar para Mac]  [GitHub]           └──────────────────┘          ▌
│ #482 O checkout não… │
│ Anexos: [cole ⌘V]    │              [ Tela | Janela | Seleção ]
└──────────────────────┘         [ navegador  chamados  pré-visualização │ lixo ]
```

- **Barra de menus:** o nome do app da frente (muda quando você clica numa janela), menus em português, o ícone da Gaveta, Wi-Fi, bateria e o relógio de verdade.
- **Navegador:** uma loja com o erro "não foi possível concluir o pagamento". É o que se fotografa.
- **Chamados:** o chamado #482, com a área de anexos, logo abaixo da loja, para a gaveta aberta nunca cobri-lo. É onde se cola.
- **Ficha "Como usar":** uma ficha de fichário pautada, datilografada, com os gestos, à direita.
- **Ícones no canto:** `fichario.svg` e `por-dentro.png`. Clicar abre a Pré-Visualização com a figura da Hairline (a gaveta que responde ao mouse) ou a da Anatomy (a máquina). É o lugar sutil das duas.
- **Barra de captura:** Tela, Janela e Seleção, como a do ⌘⇧5.
- **Dock:** os apps da mesa e o Lixo (arrastar uma ficha até ele joga fora).

## A gaveta (igual ao app)

Mesmas medidas, cores e tempos do app nativo:

- Fechada, só a borda da frente de carvalho aparece. Encostar o ponteiro na borda direita (ou ⌃⌥G) abre.
- Print novo: um flash, o print voa do lugar onde foi tirado até a fresta, a gaveta se abre um pouco para receber e dá um tranco.
- Fichas com aba datilografada ("agora", "há 5 min"), a foto inteira e "Print · 1440 × 900". A mais nova na frente; as de trás viram faixas.
- Clique copia (carimbo COPIADO). ⌘-clique e ⇧-clique selecionam vários (o círculo da ficha também). Barra de baixo: Selecionar todos, Copiar todos.
- ⌘V com o chamado na frente cola tudo de uma vez. Arrastar uma ficha (ou as escolhidas) até o chamado também anexa.
- X, ou arrastar até o Lixo: a ficha é puxada para fora e cai.
- Arrastar uma ficha para a mesa: ela sai da gaveta e fica na mesa como arquivo, com a miniatura e o nome. Dali vai para o chamado (é copiada e continua na mesa), para o Lixo ou de volta à gaveta pela borda direita. Clique duplo abre na Pré-Visualização.

## Dicas

Um balão discreto diz o próximo passo, calculado a partir do que está na mesa naquele momento (e não de um roteiro fixo): tirar um print (aponta a barra), abrir a gaveta (encostado na frente de madeira, empurrado por ela quando abre), selecionar vários com ⌘-clique ou Selecionar todos, Copiar todos, colar no chamado com ⌘V, e o que fazer com prints deixados na mesa. O botão de que a dica fala brilha por alguns segundos. Some durante a captura e os arrastos, e dá para fechar.

## Celular

Sem janelas soltas: a barra de menus, o título, o botão, a gaveta na borda e a barra de captura (Tela tira o print da tela toda). Tocar na borda de madeira abre a gaveta; depois de Copiar todos, ela se fecha sozinha e o chamado aparece com o botão Colar.

## Acessibilidade

Tudo também pelo teclado: a barra de captura, ⌃⌥G para a gaveta, setas entre as fichas, Espaço escolhe, Enter copia, Delete joga fora, ⌘V cola. Um aviso para leitores de tela diz o que aconteceu ("print guardado na gaveta", "3 prints colados no chamado"). Com "reduzir movimento", nada voa: tudo aparece e some.

## Técnica

- Página estática em `site/`, sem framework. `node site/build.mjs` junta `site/mesa/` e as figuras num `site/index.html`.
- O print é uma cópia da própria mesa recortada no retângulo escolhido, então ele mostra de verdade o que você selecionou.
