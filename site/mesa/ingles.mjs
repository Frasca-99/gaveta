/**
 * The page in English: each pair is a piece of the Portuguese source and what
 * it becomes. site/build.mjs swaps them into its own copy for /en/, and stops
 * if a piece is no longer found, so a change to the Portuguese text that
 * forgets the English one does not go out unnoticed.
 */

export const head = {
  lang: "en",
  locale: "en_US",
  title: "Gaveta: your screenshots in a drawer, on the Mac",
  description: "Every screenshot you take lands in a drawer at the edge of your Mac's screen. Pick several and paste them all at once. Free and open source.",
  ogDescription: "Every screenshot you take lands in a drawer at the edge of the screen. Pick several and paste them all at once.",
  imageAlt: "A Mac desk with the card-catalog drawer open at its right edge, full of screenshots.",
};

/** site/mesa/pagina.html */
export const pagina = [
  ["Pular para a gaveta", "Skip to the drawer"],
  ['<h1 id="titulo">Seus prints, <span>numa&nbsp;gaveta.</span></h1>', '<h1 id="titulo">Your screenshots, <span>in&nbsp;a&nbsp;drawer.</span></h1>'],
  ["Cada print que você tira cai numa gaveta na borda da tela. Escolha vários e cole todos de uma vez.",
    "Every screenshot you take lands in a drawer at the edge of the screen. Pick several and paste them all at once."],
  ["Grátis e de código aberto · macOS&nbsp;14 ou mais novo · download em breve", "Free and open source · macOS&nbsp;14 or later · download coming soon"],
  ["Esta mesa funciona: tire um print com a barra lá embaixo.", "This desk works: take a screenshot with the bar below."],
  ['aria-label="Arquivos na mesa"', 'aria-label="Files on the desk"'],
  ["Fechar fichario.svg", "Close drawer.svg"],
  ["Fechar por-dentro.png", "Close inside.png"],
  ["fichario.svg", "drawer.svg"],
  ["por-dentro.png", "inside.png"],

  // the browser, with the shop's failed payment
  ['data-app="Navegador"', 'data-app="Browser"'],
  ['aria-label="Navegador: a loja deu erro no pagamento"', 'aria-label="Browser: the shop failed to take the payment"'],
  ["Fechar o navegador", "Close the browser"],
  ["loja.exemplo/checkout", "shop.example/checkout"],
  [">Loja Exemplo<", ">Example Shop<"],
  [">Finalizar compra<", ">Checkout<"],
  ["<li><span>Tênis de corrida</span><span>R$&nbsp;399,90</span></li>", "<li><span>Running shoes</span><span>$79.90</span></li>"],
  ["<li><span>Meias, 3 pares</span><span>R$&nbsp;59,90</span></li>", "<li><span>Socks, 3 pairs</span><span>$12.00</span></li>"],
  ['<li class="total"><span>Total</span><span>R$&nbsp;459,80</span></li>', '<li class="total"><span>Total</span><span>$91.90</span></li>'],
  ["Não foi possível concluir o pagamento. <b>Erro&nbsp;500</b>", "We couldn't complete your payment. <b>Error&nbsp;500</b>"],
  ["Pagar R$&nbsp;459,80", "Pay $91.90"],

  // the how-to card
  ['aria-label="Ficha: como usar a Gaveta"', 'aria-label="Card: how to use Gaveta"'],
  ['<p class="ficha-uso-titulo">Como usar</p>', '<p class="ficha-uso-titulo">How to use</p>'],
  ["<li><b>Clique</b> copia o print.</li>", "<li><b>Click</b> copies it.</li>"],
  ["<li><b>⌘-clique</b> seleciona vários.</li>", "<li><b>⌘-click</b> selects several.</li>"],
  ["<li><b>Arraste</b> para a mesa.</li>", "<li><b>Drag</b> it to the desk.</li>"],
  ["<li><b>X</b> ou o Lixo: joga fora.</li>", "<li><b>X</b> or the Trash: away.</li>"],
  ["<li><b>⌃⌥G</b> abre e fecha a gaveta.</li>", "<li><b>⌃⌥G</b> opens the drawer.</li>"],

  // the ticket
  ['data-app="Chamados"', 'data-app="Tickets"'],
  ['aria-label="Chamados: o chamado 482"', 'aria-label="Tickets: ticket 482"'],
  ["Fechar os chamados", "Close Tickets"],
  ['<span class="janela-titulo">Chamados</span>', '<span class="janela-titulo">Tickets</span>'],
  ['<span class="selo">Aberto</span>', '<span class="selo">Open</span>'],
  ["O checkout não finaliza a compra", "Checkout doesn't complete the order"],
  ["Ao clicar em Pagar, aparece um erro e o pedido some. Prints abaixo.", "Clicking Pay shows an error and the order disappears. Screenshots below."],
  ["<span>Anexos</span>", "<span>Attachments</span>"],
  ["Cole aqui com ⌘V, ou arraste da gaveta.", "Paste here with ⌘V, or drag from the drawer."],
  ['id="colar">Colar</button>', 'id="colar">Paste</button>'],

  // previews and the Trash
  ['"Pré-Visualização"', '"Preview"'],
  ["Fechar o print", "Close the screenshot"],
  ['aria-label="Print" hidden', 'aria-label="Screenshot" hidden'],
  ['id="previa-print-titulo">Print<', 'id="previa-print-titulo">Screenshot<'],
  ['aria-label="Lixo" hidden', 'aria-label="Trash" hidden'],
  ["Fechar o Lixo", "Close the Trash"],
  ['<span class="janela-titulo">Lixo</span>', '<span class="janela-titulo">Trash</span>'],
  ['id="esvaziar" disabled>Esvaziar<', 'id="esvaziar" disabled>Empty<'],
  ['aria-label="Prints no Lixo"', 'aria-label="Screenshots in the Trash"'],
  ["O Lixo está vazio. O X de cada ficha manda o print para cá, e daqui ele pode voltar para a gaveta.",
    "The Trash is empty. The X on each card sends a screenshot here, and from here it can go back to the drawer."],

  // the Dock and the menu bar
  ['aria-label="Navegador"', 'aria-label="Browser"'],
  ['aria-label="Chamados"', 'aria-label="Tickets"'],
  ['data-abre="lixeira" aria-label="Lixo"', 'data-abre="lixeira" aria-label="Trash"'],
  ['aria-label="Menu da Gaveta"', 'aria-label="Gaveta menu"'],
  ['aria-label="Idioma: português"', 'aria-label="Language: English"'],
  ['aria-label="Idioma"', 'aria-label="Language"'],
  ["Abrir a gaveta <kbd>", "Open the drawer <kbd>"],
  ["Código no GitHub", "Code on GitHub"],

  // the capture bar and the drawer
  ['aria-label="Captura de tela"', 'aria-label="Screenshot"'],
  ["<span>Tela</span>", "<span>Screen</span>"],
  ["<span>Janela</span>", "<span>Window</span>"],
  ["<span>Seleção</span>", "<span>Selection</span>"],
  ['aria-label="Prints na gaveta"', 'aria-label="Screenshots in the drawer"'],
  ['<p class="vazia-titulo">Gaveta vazia</p><p>Tire um print com a barra lá embaixo e ele cai aqui.</p>',
    '<p class="vazia-titulo">Empty drawer</p><p>Take a screenshot with the bar below and it lands here.</p>'],
  ['id="captura-cancelar">Cancelar<', 'id="captura-cancelar">Cancel<'],
  ["Fechar o guia", "Close the guide"],

  // the foot of the desk
  ['<p>Feita por Luiz Paulo Frasca Neto · <a href="https://github.com/Frasca-99/gaveta">código aberto, MIT</a></p>',
    '<p>Made by Luiz Paulo Frasca Neto · <a href="https://github.com/Frasca-99/gaveta">open source, MIT</a></p>'],
  ["<p>Desenhos em <a", "<p>Drawings in <a"],
  ["</a> e <a href=\"https://github.com/wheresryan22/anatomy\"", "</a> and <a href=\"https://github.com/wheresryan22/anatomy\""],
];

/** site/mesa/mesa.js */
export const mesa = [
  // the menu bar
  ['drawer.open ? "Fechar a gaveta " : "Abrir a gaveta "', 'drawer.open ? "Close the drawer " : "Open the drawer "'],
  ['new Intl.DateTimeFormat("pt-BR", { weekday: "short" })', 'new Intl.DateTimeFormat("en-US", { weekday: "short" })'],
  ['new Intl.DateTimeFormat("pt-BR", { month: "short" })', 'new Intl.DateTimeFormat("en-US", { month: "short" })'],
  ['new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" })', 'new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" })'],
  ["relogio.textContent = `${day} ${now.getDate()} de ${month} ${time}`;", "relogio.textContent = `${day} ${month} ${now.getDate()} ${time}`;"],

  // a print's name and age
  ["name: `Captura ${pad(", "name: `Screenshot ${pad("],
  ['if (seconds < 60) return "agora";', 'if (seconds < 60) return "now";'],
  ["return `há ${Math.floor(seconds / 60)} min`;", "return `${Math.floor(seconds / 60)} min ago`;"],
  ["return `há ${Math.floor(seconds / 3600)} h`;", "return `${Math.floor(seconds / 3600)} h ago`;"],

  // the cards and the drawer's bar
  ["Print · ${print.pixels[0]}", "Screenshot · ${print.pixels[0]}"],
  ["<b>Print</b>${print.pixels[0]}", "<b>Screenshot</b>${print.pixels[0]}"],
  ['`Print de ${ago(print.date)}, ${print.pixels[0]} por ${print.pixels[1]}${selected ? ", escolhido" : ""}`',
    '`Screenshot, ${ago(print.date)}, ${print.pixels[0]} by ${print.pixels[1]}${selected ? ", selected" : ""}`'],
  ["${CIRCLE}Selecionar todos</button>", "${CIRCLE}Select all</button>"],
  ['"ou toque nos círculos" : "⌘-clique seleciona vários"', '"or tap the circles" : "⌘-click selects several"'],
  ['<span class="dica">Clique para copiar</span>', '<span class="dica">Click to copy</span>'],
  ['<span class="quantos">${count} de ${total}</span>', '<span class="quantos">${count} of ${total}</span>'],
  ["${CIRCLE}Todos</button>", "${CIRCLE}All</button>"],
  ['count === 1 ? "Copiar" : "Copiar todos"', 'count === 1 ? "Copy" : "Copy all"'],
  ['aria-label="Limpar seleção" title="Limpar seleção"', 'aria-label="Clear selection" title="Clear selection"'],

  // what a screen reader hears
  ["announce(`${drawer.prints.length} prints escolhidos.`);", "announce(`${drawer.prints.length} screenshots selected.`);"],
  ['announce(one ? "Print copiado. Cole no chamado com ⌘V." : `${prints.length} prints copiados. Um ⌘V no chamado cola todos.`);',
    'announce(one ? "Screenshot copied. Paste it in the ticket with ⌘V." : `${prints.length} screenshots copied. One ⌘V in the ticket pastes them all.`);'],
  ['announce(ids.length === 1 ? "Print jogado no Lixo." : `${ids.length} prints jogados no Lixo.`);',
    'announce(ids.length === 1 ? "Screenshot moved to the Trash." : `${ids.length} screenshots moved to the Trash.`);'],
  ['announce("Print de volta na gaveta.");', 'announce("Screenshot back in the drawer.");'],
  ['announce(count === 1 ? "Lixo esvaziado: 1 print apagado." : `Lixo esvaziado: ${count} prints apagados.`);',
    'announce(count === 1 ? "Trash emptied: 1 screenshot deleted." : `Trash emptied: ${count} screenshots deleted.`);'],
  ['announce("Print guardado na gaveta.");', 'announce("Screenshot saved in the drawer.");'],
  ['announce(ids.length === 1 ? "Print deixado na mesa." : `${ids.length} prints deixados na mesa.`);',
    'announce(ids.length === 1 ? "Screenshot left on the desk." : `${ids.length} screenshots left on the desk.`);'],
  ['announce("Print jogado no Lixo.");', 'announce("Screenshot moved to the Trash.");'],
  ['announce("Nada copiado ainda: clique num print na gaveta para copiar.");', 'announce("Nothing copied yet: click a screenshot in the drawer to copy it.");'],
  ['announce(prints.length === 1 ? "1 print colado no chamado." : `${prints.length} prints colados no chamado, de uma vez.`);',
    'announce(prints.length === 1 ? "1 screenshot pasted in the ticket." : `${prints.length} screenshots pasted in the ticket, at once.`);'],
  ['"Enter copia, Espaço escolhe, Delete joga fora, setas passam de uma ficha para outra."',
    '"Enter copies, Space selects, Delete throws away, the arrows move from card to card."'],

  // the Trash
  ['`Lixo, ${trash.length === 1 ? "1 print" : `${trash.length} prints`}` : "Lixo, vazio"',
    '`Trash, ${trash.length === 1 ? "1 screenshot" : `${trash.length} screenshots`}` : "Trash, empty"'],
  ['trash.length === 1 ? "1 item" : `${trash.length} itens`', 'trash.length === 1 ? "1 item" : `${trash.length} items`'],
  ['back.textContent = "Devolver";', 'back.textContent = "Put Back";'],
  ["`Devolver ${print.name}.png para a gaveta`", "`Put ${print.name}.png back in the drawer`"],

  // the capture and the ticket
  ['"Clique numa janela para fotografá-la. Esc cancela."', '"Click a window to capture it. Esc cancels."'],
  ['"Arraste o dedo sobre o que quer guardar." : "Arraste sobre qualquer coisa. Esc cancela."',
    '"Drag your finger over what you want to keep." : "Drag over anything. Esc cancels."'],
  ["`${print.name}.png, na mesa. Enter abre, Delete joga no Lixo.`", "`${print.name}.png, on the desk. Enter opens it, Delete moves it to the Trash.`"],
  ['"Copie na gaveta e toque em Colar, ou arraste da gaveta."', '"Copy in the drawer and tap Paste, or drag from the drawer."'],
  ['`Colar ${clipboard.length} prints` : "Colar"', '`Paste ${clipboard.length} screenshots` : "Paste"'],
  ['attached === 1 ? "1 print" : `${attached} prints`', 'attached === 1 ? "1 screenshot" : `${attached} screenshots`'],

  // the guide
  ['passo: "Pronto",', 'passo: "Done",'],
  ['texto: `<b>${n === 1 ? "1 print colado" : `${n} prints colados`} de uma vez</b>, na ordem em que foram tirados. É isso que a Gaveta faz no seu Mac.`,',
    'texto: `<b>${n === 1 ? "1 screenshot pasted" : `${n} screenshots pasted`} at once</b>, in the order they were taken. That is what Gaveta does on your Mac.`,'],
  ['const what = n === 1 ? "<b>Print copiado.</b>" : `<b>${n} prints copiados.</b>`;',
    'const what = n === 1 ? "<b>Screenshot copied.</b>" : `<b>${n} screenshots copied.</b>`;'],
  ['passo: "3 de 3 · Colar",', 'passo: "3 of 3 · Paste",'],
  ['? `${what} Toque em <b>${n === 1 ? "Colar" : `Colar ${n} prints`}</b> no chamado.`',
    '? `${what} Tap <b>${n === 1 ? "Paste" : `Paste ${n} screenshots`}</b> in the ticket.`'],
  [': `${what} Cole no chamado com <b>⌘V</b>${n === 1 ? "." : ", todos de uma vez."}`,',
    ': `${what} Paste in the ticket with <b>⌘V</b>${n === 1 ? "." : ", all at once."}`,'],
  ['passo: "Na mesa",', 'passo: "On the desk",'],
  ['texto: `<b>${onDeskNow.size === 1 ? "Seu print está" : "Seus prints estão"} na mesa.</b> Arraste até o chamado para anexar, ou até a borda direita para guardar de volta na gaveta.`,',
    'texto: `<b>${onDeskNow.size === 1 ? "Your screenshot is" : "Your screenshots are"} on the desk.</b> Drag to the ticket to attach, or to the right edge to put back in the drawer.`,'],
  ['return { passo: "1 de 3 · Tirar", texto: "<b>A gaveta está vazia.</b> Tire um print com a barra aqui embaixo.",',
    'return { passo: "1 of 3 · Capture", texto: "<b>The drawer is empty.</b> Take a screenshot with the bar down here.",'],
  ['passo: "2 de 3 · Selecionar",', 'passo: "2 of 3 · Select",'],
  ['? "<b>Toque num print</b> para copiar só ele. Para selecionar vários, toque no círculo de cada um ou em <b>Selecionar todos</b>."',
    '? "<b>Tap a screenshot</b> to copy just that one. To select several, tap the circle on each, or <b>Select all</b>."'],
  [': "<b>Clique num print</b> para copiar só ele. Para selecionar vários, use <b>⌘-clique</b> ou <b>Selecionar todos</b>, lá embaixo.",',
    ': "<b>Click a screenshot</b> to copy just that one. To select several, use <b>⌘-click</b> or <b>Select all</b>, below.",'],
  ['texto: `<b>1 print selecionado.</b> ${touch() ? "Toque no círculo de outros" : "Use <b>⌘-clique</b> em outros"} para selecionar mais, ou ${touch() ? "toque" : "clique"} em <b>Copiar</b>.`,',
    'texto: `<b>1 screenshot selected.</b> ${touch() ? "Tap the circle on others" : "<b>⌘-click</b> others"} to select more, or ${touch() ? "tap" : "click"} <b>Copy</b>.`,'],
  ['passo: "2 de 3 · Copiar",', 'passo: "2 of 3 · Copy",'],
  ['texto: `<b>${n} prints selecionados.</b> ${touch() ? "Toque" : "Clique"} em <b>Copiar todos</b> para levar os ${n} de uma vez.`,',
    'texto: `<b>${n} screenshots selected.</b> ${touch() ? "Tap" : "Click"} <b>Copy all</b> to take all ${n} at once.`,'],
  ['passo: "1 de 3 · Tirar",', 'passo: "1 of 3 · Capture",'],
  ['? "<b>Tire um print desta mesa.</b> Toque em <b>Tela</b>, ou em <b>Seleção</b> e arraste o dedo."',
    '? "<b>Take a screenshot of this desk.</b> Tap <b>Screen</b>, or <b>Selection</b> and drag your finger."'],
  [': "<b>Tire um print desta mesa.</b> Escolha <b>Seleção</b> na barra e arraste sobre a loja, ou sobre qualquer coisa.",',
    ': "<b>Take a screenshot of this desk.</b> Choose <b>Selection</b> in the bar and drag over the shop, or over anything.",'],
  ['passo: "2 de 3 · Abrir",', 'passo: "2 of 3 · Open",'],
  ['(fresh ? "<b>Seu print caiu na gaveta.</b> " : "<b>Seus prints estão na gaveta.</b> ")',
    '(fresh ? "<b>Your screenshot landed in the drawer.</b> " : "<b>Your screenshots are in the drawer.</b> ")'],
  ['(touch() ? "Toque na borda de madeira, à direita, para abrir." : "Encoste o ponteiro na borda direita da tela para abrir.")',
    '(touch() ? "Tap the wooden edge, on the right, to open it." : "Rest the pointer on the right edge of the screen to open it.")'],
];

/** The figure in por-dentro.png: its words in the page, and the ones its script writes. */
export const maquina = [
  ["Como a Gaveta funciona", "How Gaveta works"],
  ["Passe o mouse nas fichas · clique para colar", "Hover over the cards · click to paste"],
  ["nenhuma ficha escolhida", "no cards chosen"],
  ["As fichas escolhidas: sobem juntas", "The chosen cards rise together"],
  ["As cópias que vão para o ⌘V", "The copies that go to ⌘V"],
  ["Cada print vira uma ficha na frente da gaveta. O separador escolhe quantas fichas, da mais nova para trás, e um único ⌘V cola todas, na ordem em que foram tiradas. As fichas continuam na gaveta: colar copia, não tira.",
    "Each screenshot becomes a card at the front of the drawer. The divider picks how many cards, newest first, and a single ⌘V pastes them all, in the order they were taken. The cards stay in the drawer: pasting copies, it doesn't take them out."],
  ["Gaveta: setas escolhem quantas fichas, Enter cola todas", "Gaveta: the arrows pick how many cards, Enter pastes them all"],
  ["Uma gaveta de fichário numa bancada. Uma câmera num suporte solta cada print novo como uma ficha na frente da gaveta. Um bloco separador desliza entre as fichas: as que ficam na frente dele sobem, e são as escolhidas. Um clique manda cópias de todas elas, de uma vez, para a bandeja do ⌘V na frente da bancada.",
    "A card-catalog drawer on a workbench. A camera on a stand drops each new screenshot as a card at the front of the drawer. A divider block slides between the cards: the ones in front of it rise, and they are the chosen ones. One click sends copies of all of them, at once, to the ⌘V tray at the front of the bench."],
  ['"Toque nas fichas para colar"', '"Tap the cards to paste"'],
  ['"print novo na gaveta"', '"new screenshot in the drawer"'],
  ['"colando "', '"pasting "'],
  ['" print" : " prints") + " de uma vez"', '" screenshot" : " screenshots") + " at once"'],
  ['"1 ficha · ⌘V cola 1"', '"1 card · ⌘V pastes 1"'],
  ['" fichas · um ⌘V cola as "', '" cards · one ⌘V pastes all "'],
];

/** The figure in fichario.svg, and the few words its host on the page writes. */
export const fichario = [
  ['["há 2 h", "há 40 min", "há 12 min", "há 5 min", "há 2 min", "há 1 min", "agora"]',
    '["2 h ago", "40 min ago", "12 min ago", "5 min ago", "2 min ago", "1 min ago", "now"]'],
  ['"Uma gaveta de fichário aberta: a ficha sob o ponteiro sobe com o seu print, e as outras se afastam em sequência."',
    '"An open card-catalog drawer: the card under the pointer rises with its screenshot, and the others move aside in turn."'],
  ['"toque nas fichas" : "passe o mouse nas fichas"', '"tap the cards" : "hover over the cards"'],
];
