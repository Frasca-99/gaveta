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
  description: "Every screenshot you take lands in a glass drawer at the edge of your Mac's screen. Pick several and paste them all at once. Free and open source.",
  ogDescription: "Every screenshot you take lands in a glass drawer at the edge of the screen. Pick several and paste them all at once.",
  imageAlt: "Gaveta open at the edge of a Mac's screen, a glass drawer full of screenshots.",
};

/** site/vidro/pagina.html */
export const pagina = [
  ["Pular para o conteúdo", "Skip to content"],
  ['aria-label="Seções"', 'aria-label="Sections"'],
  [">Como funciona<", ">How it works<"],
  [">Detalhes<", ">Details<"],
  [">Instalar<", ">Install<"],

  ["App para Mac · grátis · código aberto", "Mac app · free · open source"],
  ['<h1 class="titulo" id="titulo">Seus prints,<br><span>numa gaveta de vidro.</span></h1>', '<h1 class="titulo" id="titulo">Your screenshots,<br><span>in a glass drawer.</span></h1>'],
  ["Cada print que você tira cai numa gaveta na borda da tela. Escolha vários e cole todos de uma vez, com um único <kbd>⌘V</kbd>.",
    "Every screenshot you take lands in a drawer at the edge of the screen. Pick several and paste them all at once, with a single <kbd>⌘V</kbd>."],
  ["<span data-rotulo>Instalar pelo Terminal</span>", "<span data-rotulo>Install with Terminal</span>"],
  [">Outras formas de instalar<", ">Other ways to install<"],
  ["macOS 14 ou mais novo · Apple silicon e Intel", "macOS 14 or later · Apple silicon and Intel"],

  // the screen
  ['aria-label="A Gaveta funcionando"', 'aria-label="Gaveta at work"'],
  ["qui 14:32", "Thu 2:32 PM"],
  ["Tirar print\n", "Take a screenshot\n"],
  ['aria-label="Alargar a gaveta. Clique duplo volta ao normal."', 'aria-label="Widen the drawer. A double-click sets it back."'],
  ['aria-label="Prints na gaveta"', 'aria-label="Screenshots in the drawer"'],
  [">Gaveta vazia<", ">Empty drawer<"],
  ["Tire um print com o botão lá embaixo.", "Take a screenshot with the button below."],
  ['aria-label="Abrir a gaveta"', 'aria-label="Open the drawer"'],
  ['aria-label="O que testar"', 'aria-label="What to try"'],
  ["<li><span>01</span>Tire um print</li>", "<li><span>01</span>Take a screenshot</li>"],
  ["<li><span>02</span>Passe o mouse nas fichas</li>", "<li><span>02</span>Hover over the cards</li>"],
  ["<li><span>03</span>Clique para copiar, <kbd>⌘</kbd>-clique para escolher</li>", "<li><span>03</span>Click to copy, <kbd>⌘</kbd>-click to pick</li>"],
  ["<li><span>04</span>Arraste a alça</li>", "<li><span>04</span>Drag the handle</li>"],

  // how it works
  ["Do print ao <kbd>⌘V</kbd>,<br><span>sem passar pela Mesa.</span>", "From screenshot to <kbd>⌘V</kbd>,<br><span>never touching the Desktop.</span>"],
  ["01 · Tirar", "01 · Take"],
  [">Tire o print<", ">Take a screenshot<"],
  ["Do jeito de sempre, com <kbd>⌘⇧4</kbd>. Ele voa para a gaveta, na borda da tela, em vez de encher a Mesa.",
    "The usual way, with <kbd>⌘⇧4</kbd>. It flies into the drawer at the edge of the screen instead of piling up on the Desktop."],
  ["02 · Abrir", "02 · Open"],
  [">Encoste na borda<", ">Touch the edge<"],
  ["O ponteiro na borda direita puxa uma alça, e a gaveta de vidro sai, tomando a cor do que está atrás. Ou <kbd>⌃⌥G</kbd>.",
    "The pointer at the right edge pulls a handle, and the glass drawer slides out, taking the color of what is behind it. Or <kbd>⌃⌥G</kbd>."],
  ["03 · Escolher", "03 · Pick"],
  [">Escolha vários<", ">Pick several<"],
  ["Um clique copia um print. <kbd>⌘</kbd>-clique, <kbd>⇧</kbd>-clique ou Selecionar todos escolhem vários.",
    "A click copies one screenshot. <kbd>⌘</kbd>-click, <kbd>⇧</kbd>-click or Select all pick several."],
  ["04 · Colar", "04 · Paste"],
  [">Cole tudo de uma vez<", ">Paste them all at once<"],
  ["Copiar todos, e um único <kbd>⌘V</kbd> cola os prints na ordem em que foram tirados: no chat, no e-mail, no chamado.",
    "Copy all, and a single <kbd>⌘V</kbd> pastes them in the order you took them: into a chat, an email, a ticket."],

  // details
  ["Pequenos cuidados,<br><span>do jeito do Mac.</span>", "Small touches,<br><span>the Mac way.</span>"],
  [">Vidro<", ">Glass<"],
  ["O Liquid Glass do macOS 26: a gaveta toma a cor do que está atrás e quase some sobre o seu trabalho.",
    "The Liquid Glass of macOS 26: the drawer takes the color of what is behind it and all but disappears over your work."],
  [">Alça elástica<", ">Elastic handle<"],
  ["Arraste a alça para alargar a gaveta. Ela entorta com a velocidade, cede no limite e volta com um balanço.",
    "Drag the handle to widen the drawer. It bends with your speed, gives at the limit and swings back."],
  [">Fichas inteiras<", ">Whole cards<"],
  ["Cada print aparece inteiro, nunca cortado. A ficha sob o ponteiro se abre para você ver.",
    "Every screenshot shows whole, never cropped. The card under the pointer opens up for you to see."],
  [">Sem atrito<", ">No friction<"],
  ["Apagar com o X não trava nada: a ficha cai e a próxima já está pronta.",
    "Deleting with the X never stalls: the card falls and the next one is already there."],
  [">Arraste<", ">Drag<"],
  ["Leve um ou vários prints para qualquer app ou pasta.", "Take one or several screenshots to any app or folder."],
  [">Só no seu Mac<", ">Only on your Mac<"],
  ["Sem internet e sem conta. Os prints ficam no seu Mac.", "No internet, no account. Your screenshots stay on your Mac."],

  // install
  ["Instale em um minuto.", "Install it in a minute."],
  ["Pelo Terminal · recomendado", "With Terminal · recommended"],
  ['aria-label="Copiar o comando"', 'aria-label="Copy the command"'],
  ["<span data-rotulo>Copiar</span>", "<span data-rotulo>Copy</span>"],
  ["Baixa a última versão, coloca em Aplicativos e abre, sem o aviso do macOS.",
    "Downloads the latest version, puts it in Applications and opens it, without the macOS warning."],
  ["Baixando o zip", "Downloading the zip"],
  ['Baixe o <a href="{{RELEASES}}">Gaveta.zip</a> e arraste para Aplicativos. Na primeira vez: Ajustes do Sistema → Privacidade e Segurança → Abrir Mesmo Assim.',
    'Download <a href="{{RELEASES}}">Gaveta.zip</a> and drag it to Applications. The first time: System Settings → Privacy &amp; Security → Open Anyway.'],
  [">Compilando<", ">Building it<"],
  ["Com o Swift instalado. Um app compilado no seu Mac abre sem aviso.", "With Swift installed. An app built on your Mac opens without a warning."],
  ['Feita por Luiz Paulo Frasca Neto · <a href="{{REPO}}">código aberto, MIT</a>', 'Made by Luiz Paulo Frasca Neto · <a href="{{REPO}}">open source, MIT</a>'],
  ["macOS 14+ · sem internet, sem conta", "macOS 14+ · no internet, no account"],
];

/** site/vidro/vidro.js */
export const vidro = [
  ['"Copiado: cole no Terminal"', '"Copied: paste it in Terminal"'],
  ['short ? "Copiado"', 'short ? "Copied"'],
  ['"Comando copiado. Cole no Terminal."', '"Command copied. Paste it in Terminal."'],
  ['"Copie à mão"', '"Copy it by hand"'],
  ['return "agora";', 'return "now";'],
  ["`há ${Math.floor(s / 60)} min`", "`${Math.floor(s / 60)} min ago`"],
  ["`há ${Math.floor(s / 3600)} h`", "`${Math.floor(s / 3600)} h ago`"],
  ['<span class="tipo">Print</span>', '<span class="tipo">Screenshot</span>'],
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
  ['"Print copiado. Cole com ⌘V."', '"Screenshot copied. Paste it with ⌘V."'],
  ['"Print copiado."', '"Screenshot copied."'],
  ["`${prints.length} prints copiados. No app, um ⌘V cola todos, na ordem.`", "`${prints.length} screenshots copied. In the app, one ⌘V pastes them all, in order.`"],
  ['"Print na lixeira."', '"Screenshot in the Trash."'],
  ['"Print na gaveta."', '"Screenshot in the drawer."'],
  ['<span class="ficha-copiado">✓ Copiado</span>', '<span class="ficha-copiado">✓ Copied</span>'],
];
