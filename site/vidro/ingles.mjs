/**
 * The page in English: each pair is a piece of the Portuguese source and what
 * it becomes. site/build.mjs swaps them into its own copy for /en/, and stops
 * if a piece is no longer found, so a change to the Portuguese text that
 * forgets the English one does not go out unnoticed. Longer pieces come
 * before the shorter ones they contain.
 */

export const head = {
  lang: "en",
  locale: "en_US",
  title: "Gaveta: your screenshots in a drawer, on the Mac",
  description: "Every screenshot you take lands in a drawer at the edge of your Mac's screen. Pick several and paste them all at once. Free and open source.",
  ogDescription: "Every screenshot you take lands in a drawer at the edge of the screen. Pick several and paste them all at once.",
  imageAlt: "A Mac desk with Gaveta's glass drawer open at the right edge, full of screenshots.",
};

/** site/vidro/pagina.html */
export const pagina = [
  ["Pular para o conteúdo", "Skip to content"],
  ['aria-label="Abrir ou fechar a gaveta"', 'aria-label="Open or close the drawer"'],
  ["qui 14:32", "Thu 2:32 PM"],

  ["App para Mac · grátis · código aberto", "Mac app · free · open source"],
  ['<h1 class="titulo" id="titulo">Seus prints,<br><span>numa gaveta.</span></h1>', '<h1 class="titulo" id="titulo">Your screenshots,<br><span>in a drawer.</span></h1>'],
  ["Cada print que você tira cai numa gaveta na borda da tela. Escolha vários e cole todos de uma vez.",
    "Every screenshot you take lands in a drawer at the edge of the screen. Pick several and paste them all at once."],
  ["macOS 14 ou mais novo · Apple silicon e Intel", "macOS 14 or later · Apple silicon and Intel"],

  // the shop
  ['data-app="Navegador" aria-label="Navegador: a loja deu erro no pagamento"', 'data-app="Browser" aria-label="Browser: the shop failed to take the payment"'],
  ["loja.exemplo/checkout", "shop.example/checkout"],
  [">Loja Exemplo<", ">Example Shop<"],
  [">Finalizar compra<", ">Checkout<"],
  ["<li><span>Tênis de corrida</span><span>R$&nbsp;399,90</span></li>", "<li><span>Running shoes</span><span>$79.90</span></li>"],
  ["<li><span>Meias, 3 pares</span><span>R$&nbsp;59,90</span></li>", "<li><span>Socks, 3 pairs</span><span>$12.00</span></li>"],
  ['<li class="total"><span>Total</span><span>R$&nbsp;459,80</span></li>', '<li class="total"><span>Total</span><span>$91.90</span></li>'],
  ["Não foi possível concluir o pagamento. <b>Erro 500</b>", "The payment could not go through. <b>Error 500</b>"],
  [">Pagar R$&nbsp;459,80<", ">Pay $91.90<"],

  // the ticket
  ['data-app="Chamados" aria-label="Chamados: o chamado #482"', 'data-app="Tickets" aria-label="Tickets: ticket #482"'],
  ['<span class="janela-nome">Chamados</span>', '<span class="janela-nome">Tickets</span>'],
  ['<span class="chamado-estado">Aberto</span>', '<span class="chamado-estado">Open</span>'],
  [">O checkout não finaliza a compra<", ">Checkout won't complete the order<"],
  ["Ao clicar em Pagar, aparece um erro e o pedido some. Prints abaixo.", "Clicking Pay shows an error and the order disappears. Screenshots below."],
  ["Anexos <span", "Attachments <span"],
  ["Cole aqui com <kbd>⌘V</kbd>, ou arraste da gaveta.", "Paste here with <kbd>⌘V</kbd>, or drag from the drawer."],
  ['type="button" hidden>Colar<', 'type="button" hidden>Paste<'],
  ['Feita por Luiz Paulo Frasca Neto · <a href="{{REPO}}">código aberto, MIT</a>', 'Made by Luiz Paulo Frasca Neto · <a href="{{REPO}}">open source, MIT</a>'],

  // the guide and the bar
  ['<p class="guia-passo" id="guia-passo">1 de 3 · Tirar</p>', '<p class="guia-passo" id="guia-passo">1 of 3 · Take</p>'],
  ['Tire um print desta mesa: escolha <b>Seleção</b> e arraste sobre a loja.</p>', 'Take a screenshot of this desk: choose <b>Selection</b> and drag over the shop.</p>'],
  ['aria-label="Fechar as dicas"', 'aria-label="Close the tips"'],
  ['role="toolbar" aria-label="Tirar print"', 'role="toolbar" aria-label="Take a screenshot"'],
  ["\n    Tela\n", "\n    Screen\n"],
  ["\n    Janela\n", "\n    Window\n"],
  ["\n    Seleção\n", "\n    Selection\n"],

  // the drawer
  ['aria-label="Alargar a gaveta. Clique duplo volta ao normal."', 'aria-label="Widen the drawer. A double-click sets it back."'],
  ['aria-label="Prints na gaveta"', 'aria-label="Screenshots in the drawer"'],
  [">Gaveta vazia<", ">Empty drawer<"],
  ["Tire um print com a barra lá embaixo.", "Take a screenshot with the bar below."],
  ['aria-label="Abrir a gaveta"', 'aria-label="Open the drawer"'],
  ['aria-label="Gaveta"', 'aria-label="Drawer"'],
];

/** site/vidro/vidro.js */
export const vidro = [
  ['return "agora";', 'return "now";'],
  ["`há ${Math.floor(s / 60)} min`", "`${Math.floor(s / 60)} min ago`"],
  ["`há ${Math.floor(s / 3600)} h`", "`${Math.floor(s / 3600)} h ago`"],
  ['<span class="tipo">Print</span>', '<span class="tipo">Screenshot</span>'],
  ['<span class="ficha-copiado">✓ Copiado</span>', '<span class="ficha-copiado">✓ Copied</span>'],
  ["`Print · ${print.w} × ${print.h}`", "`Screenshot · ${print.w} × ${print.h}`"],
  ['", escolhido"', '", selected"'],
  ["Selecionar todos</button>", "Select all</button>"],
  ['"⌘-clique escolhe vários"', '"⌘-click picks several"'],
  ['"toque nos círculos"', '"tap the circles"'],
  ['"Clique para copiar"', '"Click to copy"'],
  ['"Toque para copiar"', '"Tap to copy"'],
  ["${count} de ${total}</span>", "${count} of ${total}</span>"],
  ["${CIRCLE}Todos</button>", "${CIRCLE}All</button>"],
  ['"Copiar" : "Copiar todos"', '"Copy" : "Copy all"'],
  ['"Limpar seleção"', '"Clear selection"'],
  ["`${drawer.selection.size} escolhidos.`", "`${drawer.selection.size} selected.`"],
  ['"Copie na gaveta e toque em Colar, ou arraste da gaveta."', '"Copy in the drawer and tap Paste, or drag from the drawer."'],
  ["`Colar ${prints.length} prints` : \"Colar\"", "`Paste ${prints.length} screenshots` : \"Paste\""],
  ['"Print copiado. Cole no chamado com ⌘V."', '"Screenshot copied. Paste it into the ticket with ⌘V."'],
  ["`${prints.length} prints copiados. Um ⌘V no chamado cola todos.`", "`${prints.length} screenshots copied. One ⌘V in the ticket pastes them all.`"],
  ['"1 print colado no chamado."', '"1 screenshot pasted into the ticket."'],
  ["`${prints.length} prints colados no chamado, de uma vez.`", "`${prints.length} screenshots pasted into the ticket, at once.`"],
  ['"Print na lixeira."', '"Screenshot in the Trash."'],
  ['"Print guardado na gaveta."', '"Screenshot kept in the drawer."'],

  // the guide
  ['"1 de 3 · Tirar"', '"1 of 3 · Take"'],
  ['"Tire um print desta mesa: escolha <b>Seleção</b> e arraste sobre a loja."', '"Take a screenshot of this desk: choose <b>Selection</b> and drag over the shop."'],
  ['"Tire um print: toque em <b>Seleção</b> e arraste o dedo sobre a loja."', '"Take a screenshot: tap <b>Selection</b> and drag your finger over the shop."'],
  ['"2 de 3 · Copiar"', '"2 of 3 · Copy"'],
  ['"Clique no print na gaveta para copiar. <b>⌘-clique</b> escolhe vários."', '"Click the screenshot in the drawer to copy it. <b>⌘-click</b> picks several."'],
  ['"Toque no print na gaveta para copiar, ou nos círculos para escolher vários."', '"Tap the screenshot in the drawer to copy it, or the circles to pick several."'],
  ['"3 de 3 · Colar"', '"3 of 3 · Paste"'],
  ['"Cole no chamado com <b>⌘V</b>, ou arraste o print da gaveta até ele."', '"Paste into the ticket with <b>⌘V</b>, or drag the screenshot from the drawer onto it."'],
  ['"Toque em <b>Colar</b> no chamado."', '"Tap <b>Paste</b> in the ticket."'],
  ['mode === "janela" ? "Janela" : "Seleção"', 'mode === "janela" ? "Window" : "Selection"'],
  ['"Clique numa janela para fotografá-la. <b>Esc</b> cancela."', '"Click a window to take it. <b>Esc</b> cancels."'],
  ['"Arraste sobre qualquer coisa. <b>Esc</b> cancela."', '"Drag over anything. <b>Esc</b> cancels."'],
  ['"Arraste o dedo sobre o que quer guardar."', '"Drag your finger over what you want to keep."'],
  ['step.textContent = "Pronto";', 'step.textContent = "Done";'],
  ['"É assim no seu Mac: cada print cai na gaveta, e um <b>⌘V</b> cola todos."', '"That is how it goes on your Mac: every screenshot lands in the drawer, and one <b>⌘V</b> pastes them all."'],
];
