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

  ['<h1 class="titulo" id="titulo">Seus prints,<br><span>numa gaveta.</span></h1>', '<h1 class="titulo" id="titulo">Your screenshots,<br><span>in a drawer.</span></h1>'],
  ["Cada print que você tira cai numa gaveta na borda da tela. Escolha vários e cole todos de uma vez.",
    "Every screenshot you take lands in a drawer at the edge of the screen. Pick several and paste them all at once."],
  ["Grátis · macOS 14+", "Free · macOS 14+"],

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

  // the guide and the bar
  ['<p class="guia-titulo" id="guia-titulo">Tire um print</p>', '<p class="guia-titulo" id="guia-titulo">Take a screenshot</p>'],
  ['<p class="guia-texto" id="guia-texto">Escolha <b>Seleção</b> e arraste sobre a loja.</p>', '<p class="guia-texto" id="guia-texto">Choose <b>Selection</b> and drag over the shop.</p>'],
  ['<span class="so-leitor">Passo 1 de 3</span>', '<span class="so-leitor">Step 1 of 3</span>'],
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
  ['"Tire um print", fine.matches', '"Take a screenshot", fine.matches'],
  ['"Escolha <b>Seleção</b> e arraste sobre a loja."', '"Choose <b>Selection</b> and drag over the shop."'],
  ['"Toque em <b>Seleção</b> e arraste o dedo sobre a loja."', '"Tap <b>Selection</b> and drag your finger over the shop."'],
  ['"Copie ou arraste"', '"Copy or drag"'],
  ['"Clique para copiar, ou arraste até o chamado. <b>⌘-clique</b> escolhe vários."', '"Click to copy, or drag it onto the ticket. <b>⌘-click</b> picks several."'],
  ['"Toque no print para copiar, ou nos círculos para escolher vários."', '"Tap a screenshot to copy it, or the circles to pick several."'],
  ['"Cole no chamado"', '"Paste into the ticket"'],
  ['"Um <b>⌘V</b> cola tudo no chamado, de uma vez."', '"One <b>⌘V</b> pastes them all into the ticket, at once."'],
  ['"Toque em <b>Colar</b> no chamado."', '"Tap <b>Paste</b> in the ticket."'],
  ["`Passo ${step + 1} de ${STEPS.length}`", "`Step ${step + 1} of ${STEPS.length}`"],
  ['"Clique numa janela para fotografá-la. <b>Esc</b> cancela."', '"Click a window to take it. <b>Esc</b> cancels."'],
  ['"Toque numa janela para fotografá-la, ou em <b>Janela</b> de novo para cancelar."', '"Tap a window to take it, or <b>Window</b> again to cancel."'],
  ['put("janela", "janela", "Janela", fine.matches', 'put("janela", "janela", "Window", fine.matches'],
  ['"Seleção", fine.matches ? "Arraste sobre qualquer coisa. <b>Esc</b> cancela." : "Arraste o dedo sobre o que quer guardar."', '"Selection", fine.matches ? "Drag over anything. <b>Esc</b> cancels." : "Drag your finger over what you want to keep."'],
  ['"Pronto", "É assim no seu Mac: cada print cai na gaveta, e um <b>⌘V</b> cola todos."', '"Done", "That is how it goes on your Mac: every screenshot lands in the drawer, and one <b>⌘V</b> pastes them all."'],
];
