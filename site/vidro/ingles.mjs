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
  ['aria-label="Copiar o comando de instalação"', 'aria-label="Copy the install command"'],

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

  // the chat
  ["data-app=\"Mensagens\" aria-label=\"Mensagens: conversa com a Bia\"", "data-app=\"Messages\" aria-label=\"Messages: chat with Emma\""],
  ["<span class=\"janela-nome\">Mensagens</span>", "<span class=\"janela-nome\">Messages</span>"],
  ["<span class=\"conversa-avatar\" aria-hidden=\"true\">B</span>", "<span class=\"conversa-avatar\" aria-hidden=\"true\">E</span>"],
  ["<span class=\"conversa-nome\">Bia</span>", "<span class=\"conversa-nome\">Emma</span>"],
  ["aria-label=\"Conversa com a Bia\"", "aria-label=\"Chat with Emma\""],
  [">Hoje 03:12<", ">Today 3:12 AM<"],
  [">Por que você curtiu a foto da Camila às 3&nbsp;da manhã?<", ">Why did you like Chloe's photo at 3&nbsp;am?<"],
  [">E ainda mandou mensagem pra ela??<", ">And you texted her??<"],
  [">Amor, eu não mandei mensagem pra ela<", ">Babe, I never texted her<"],
  [">Posso provar. Vou te mandar um print<", ">I can prove it. Sending you a screenshot<"],
  ["</span>Manda.</li>", "</span>Go on.</li>"],
  ["<span class=\"aviso\">Bia: </span>", "<span class=\"aviso\">Emma: </span>"],
  ["<span class=\"aviso\">Você: </span>", "<span class=\"aviso\">You: </span>"],
  ["Cole o print com <kbd>⌘V</kbd>", "Paste the screenshot with <kbd>⌘V</kbd>"],
  ['type="button" hidden>Colar<', 'type="button" hidden>Paste<'],

  // the guide and the bar
  ['<p class="guia-titulo" id="guia-titulo">Tire um print</p>', '<p class="guia-titulo" id="guia-titulo">Take a screenshot</p>'],
  ['<p class="guia-texto" id="guia-texto">Escolha <b>Janela</b> e clique em qualquer janela.</p>', '<p class="guia-texto" id="guia-texto">Choose <b>Window</b> and click the shop.</p>'],
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
  ["`Colar ${prints.length} prints` : \"Colar\"", "`Paste ${prints.length} screenshots` : \"Paste\""],
  ['"Print na lixeira."', '"Screenshot in the Trash."'],
  ['"Comando copiado. Cole no Terminal."', '"Command copied. Paste it in Terminal."'],
  ['"Comando selecionado. Copie com ⌘C e cole no Terminal."', '"Command selected. Copy it with ⌘C and paste it in Terminal."'],
  ['"Print guardado na gaveta."', '"Screenshot kept in the drawer."'],

  // the chat
  ["\"Copie um print na gaveta.\"", "\"Copy a screenshot from the drawer.\""],
  ["`${prints.length} prints copiados` : \"Print copiado\"", "`${prints.length} copied` : \"Copied\""],
  ["dela: \"Bia: \", minha: \"Você: \"", "dela: \"Emma: \", minha: \"You: \""],
  ["\"Já baixei. Tá perdoado.\"", "\"Already downloaded it. You're forgiven.\""],
  ["\"Para de me mandar print, Lucas. Tô testando aqui.\"", "\"Stop sending me screenshots, Jake. I'm trying it out.\""],
  ["\"Print copiado. Cole na conversa com ⌘V.\"", "\"Screenshot copied. Paste it into the chat with ⌘V.\""],
  ["`${prints.length} prints copiados. Um ⌘V na conversa cola todos.`", "`${prints.length} screenshots copied. One ⌘V in the chat pastes them all.`"],
  ["\"1 print enviado na conversa.\"", "\"1 screenshot sent in the chat.\""],
  ["`${prints.length} prints enviados na conversa, de uma vez.`", "`${prints.length} screenshots sent in the chat, at once.`"],
  ["<span class=\"aviso\">Print</span>", "<span class=\"aviso\">Screenshot</span>"],
  ["\"Isso é a sua tela inteira. Cadê a conversa com ela?\"", "\"That's your whole screen. Where's the chat with her?\""],
  ["\"Isso é a tela de uma loja, Lucas.\"", "\"That's a checkout page, Jake.\""],
  ["\"Você tava comprando tênis em vez de me responder?\"", "\"You were shopping instead of answering me?\""],
  ["\"Você mandou print da nossa própria conversa??\"", "\"You screenshotted our own chat??\""],
  ["\"Isso é código. Não prova nada.\"", "\"That's code. It proves nothing.\""],
  ["\"“Seus prints, numa gaveta”? Que gaveta, Lucas?\"", "\"“Your screenshots, in a drawer”? What drawer, Jake?\""],
  ["\"Que print é esse? Não prova nada.\"", "\"What even is that? It proves nothing.\""],
  ["\"Continua não provando nada.\"", "\"Still proves nothing.\""],
  ["`Mandou ${prints.length} prints de uma vez?`", "`${prints.length} screenshots at once?`"],
  ["\"Pera. Como você manda tanto print tão rápido?\"", "\"Wait. How are you sending screenshots this fast?\""],
  ["\"É a Gaveta, amor.\"", "\"It's Gaveta, babe.\""],
  ["\"Me manda o link.\"", "\"Send me the link.\""],
  ["\"Manda outro.\"", "\"Send another one.\""],
  ["\"Clique para copiar, ou arraste até a conversa. <b>⌘-clique</b> escolhe vários.\"", "\"Click to copy, or drag it onto the chat. <b>⌘-click</b> picks several.\""],
  ["\"Mande na conversa\"", "\"Send it in the chat\""],
  ["\"Cole na conversa com <b>⌘V</b>. Ela quer provas.\"", "\"Paste into the chat with <b>⌘V</b>. She wants proof.\""],
  ["\"Ela quer outro print\"", "\"She wants another one\""],
  ["\"Tire outro print e cole com <b>⌘V</b>. Ou escolha vários na gaveta: um <b>⌘V</b> cola todos.\"", "\"Take another screenshot and paste it with <b>⌘V</b>. Or pick several in the drawer: one <b>⌘V</b> pastes them all.\""],
  ["\"Tire outro print e toque em <b>Colar</b>. Ou escolha vários na gaveta e cole todos de uma vez.\"", "\"Take another screenshot and tap <b>Paste</b>. Or pick several in the drawer and paste them all at once.\""],
  ["\"Toque em <b>Colar</b> na conversa. Ela quer provas.\"", "\"Tap <b>Paste</b> in the chat. She wants proof.\""],
  // the guide
  ['"Tire um print", fine.matches', '"Take a screenshot", fine.matches'],
  ['"Escolha <b>Janela</b> e clique em qualquer janela."', '"Choose <b>Window</b> and click the shop."'],
  ['"Toque em <b>Janela</b> e depois em qualquer janela."', '"Tap <b>Window</b>, then the shop."'],
  ['"Copie ou arraste"', '"Copy or drag"'],
  ['"Toque no print para copiar, ou nos círculos para escolher vários."', '"Tap a screenshot to copy it, or the circles to pick several."'],
  ["`Passo ${step + 1} de ${STEPS.length}`", "`Step ${step + 1} of ${STEPS.length}`"],
  ['"Escolha a janela"', '"Pick a window"'],
  ['"Clique numa janela e o print dela cai na gaveta. <b>Esc</b> cancela."', '"Click a window and its screenshot lands in the drawer. <b>Esc</b> cancels."'],
  ['"Toque numa janela e o print dela cai na gaveta. Toque em <b>Janela</b> de novo para cancelar."', '"Tap a window and its screenshot lands in the drawer. Tap <b>Window</b> again to cancel."'],
  ['"Marque a área do print"', '"Mark the area"'],
  ['"Clique e arraste sobre o que quer no print. Ao soltar, ele cai na gaveta."', '"Click and drag over what you want. Let go and it lands in the drawer."'],
  ['"Arraste o dedo sobre o que quer no print. Ao soltar, ele cai na gaveta."', '"Drag your finger over what you want. Let go and it lands in the drawer."'],
  ['"Pronto", "É assim no seu Mac: cada print cai na gaveta, e um <b>⌘V</b> cola todos."', '"Done", "That is how it goes on your Mac: every screenshot lands in the drawer, and one <b>⌘V</b> pastes them all."'],
];
