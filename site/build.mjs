/**
 * Builds the Gaveta landing into site/index.html: one self-contained page.
 *
 * It inlines the two figures: the card catalog drawer at the top, drawn with
 * Hairline (its kernel is in vendor/, MIT), and the machine in "Como
 * funciona", drawn with the Anatomy kit (MIT) and built by
 * figuras/como-funciona/build.mjs into como-funciona.parts.json.
 *
 *   node site/build.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(join(HERE, path), "utf8");
/** A script's text can't hold a closing script tag. */
const inline = (code) => code.replace(/<\/(script)/gi, "<\\/$1");

/** Both drawing tools are MIT: their notices travel with the code inlined from them. */
const notice = (path) => `/*!\n${read(path).trim()}\n*/\n`;
const kernel = notice("vendor/LICENSE-hairline.txt") + read("vendor/hairline-kernel.js");
const fichario = read("figuras/fichario.js");
const machine = JSON.parse(read("figuras/como-funciona/como-funciona.parts.json"));
machine.script = notice("vendor/LICENSE-anatomy.txt") + machine.script;

const REPO = "https://github.com/Frasca-99/gaveta";
const DOWNLOAD = `${REPO}/releases/latest`;
// Where the page will live, for the link preview on LinkedIn and X, which
// want absolute URLs: SITE_URL=https://… node site/build.mjs
const SITE = (process.env.SITE_URL || "").replace(/\/$/, "");
const SHARE = `${SITE}${SITE ? "/" : ""}assets/compartilhar.png`;

const steps = [
  ["Tire o print.", "Com ⌘⇧4, como sempre."],
  ["Ele cai na gaveta.", "Na hora, sem a miniatura no canto e sem encher a Mesa."],
  ["Escolha vários.", "Pela bolinha de cada ficha, ou em Selecionar todos."],
  ["Copie e cole todos.", "Um clique em Copiar todos e um único ⌘V."],
];

const gestures = [
  ["Ponteiro na borda direita, ou ⌃⌥G", "Abre a gaveta"],
  ["Clique", "Copia o print"],
  ["Bolinha, <span class=\"junto\">⌘-clique</span> ou <span class=\"junto\">⇧-clique</span>", "Escolhe vários"],
  ["Arrastar", "Leva para um app ou uma pasta"],
  ["Clique duplo", "Abre na Pré-Visualização"],
  ["Clicar e segurar", "Abre na Marcação"],
  ["Clique forte", "Mostra na Visualização Rápida"],
  ["X, ou arrastar até o Lixo", "Manda para o Lixo"],
];

const css = `
:root {
  color-scheme: light;
  --pagina: oklch(1 0 0);
  --tinta: oklch(0.221 0.004 106.7);
  --grafite: oklch(0.526 0.008 106.7);
  --linha: oklch(0.893 0.008 106.6);
  --feltro: oklch(0.373 0.056 166.5);
  --feltro-fundo: oklch(0.31 0.05 166.5);
  --sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --titulo: -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --maquina: "Courier Prime", ui-monospace, "SF Mono", Menlo, monospace;
  /* the type scale: small print, body, lead, and the two headings */
  --t-pequeno: 14px;
  --t-corpo: 17px;
  --t-chamada: clamp(1.125rem, 1rem + 0.5vw, 1.3rem);
  --t-h2: clamp(1.9rem, 1.2rem + 2.4vw, 2.8rem);
  --t-h1: clamp(2.6rem, 1.5rem + 4.4vw, 4.4rem);
  --margem: clamp(20px, 5vw, 48px);
  --largura: 1120px;
  /* the drawer's one bright stroke is the felt green */
  --hairline-hi: var(--feltro);
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
body {
  margin: 0; background: var(--pagina); color: var(--tinta);
  font: 400 var(--t-corpo)/1.55 var(--sans);
  -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
}
a { color: inherit; text-underline-offset: 0.2em; text-decoration-thickness: from-font; }
::selection { background: oklch(0.9 0.035 166.5); color: var(--tinta); }
:focus-visible { outline: 2px solid var(--feltro); outline-offset: 3px; }
.pular {
  position: absolute; inset-inline-start: var(--margem); top: -100px; z-index: 2;
  padding: 10px 14px; border-radius: 8px; background: var(--tinta); color: var(--pagina); text-decoration: none;
}
.pular:focus { top: 12px; }
.envolve { max-width: var(--largura); margin-inline: auto; padding-inline: var(--margem); }

/* top */
.topo { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding-block: 18px; }
.marca { display: inline-flex; align-items: center; gap: 10px; padding-block: 6px; font-weight: 600; text-decoration: none; }
.marca img { width: 30px; height: 30px; display: block; }
.topo nav { display: flex; gap: 8px 24px; flex-wrap: wrap; justify-content: flex-end; font-size: var(--t-pequeno); }
.topo nav a { color: var(--grafite); text-decoration: none; padding-block: 10px; }
.topo nav a:hover { color: var(--tinta); }

/* opening */
.abertura {
  display: grid; gap: 32px; align-items: center;
  padding-block: clamp(28px, 6vw, 80px) clamp(40px, 7vw, 96px);
}
@media (min-width: 900px) { .abertura { grid-template-columns: minmax(0, 5fr) minmax(0, 6fr); gap: 48px; } }
h1 {
  margin: 0; font: 650 var(--t-h1)/1.02 var(--titulo);
  letter-spacing: -0.034em; text-wrap: balance;
}
.chamada {
  margin: 22px 0 0; max-width: 34ch; color: var(--grafite);
  font-size: var(--t-chamada); line-height: 1.5; text-wrap: pretty;
}
.acoes { display: flex; flex-wrap: wrap; align-items: center; gap: 14px 20px; margin-top: 32px; }
.botao {
  display: inline-flex; align-items: center; gap: 10px; min-height: 48px; padding-inline: 18px 22px;
  border-radius: 12px; background: var(--feltro); color: oklch(1 0 0);
  font-weight: 600; font-size: var(--t-corpo); text-decoration: none;
  transition: background-color 160ms ease, transform 120ms ease;
}
.botao:hover { background: var(--feltro-fundo); }
.botao:active { transform: scale(0.96); }
.botao svg { width: 18px; height: 18px; }
.nota { font-size: var(--t-pequeno); color: var(--grafite); }
.figura-abertura [data-hairline] { width: 100%; -webkit-tap-highlight-color: transparent; }
.leitura {
  min-height: 1.4em; margin: 2px 0 0; text-align: center;
  font: 400 var(--t-pequeno)/1.4 var(--maquina); color: var(--grafite); font-variant-numeric: tabular-nums;
}

/* sections open with a tab, like a guide card in a card catalog */
.secao { --respiro: clamp(56px, 9vw, 112px); padding-block: var(--respiro) 0; scroll-margin-top: calc(32px - var(--respiro)); }
.aba { border-bottom: 1px solid var(--linha); }
.etiqueta {
  display: inline-block; margin-bottom: -1px; padding: 6px 14px 5px;
  border: 1px solid var(--linha); border-bottom: 0; border-radius: 9px 9px 0 0;
  background: var(--pagina); color: var(--grafite); font: 400 var(--t-pequeno)/1.3 var(--maquina);
}
h2 {
  margin: 40px 0 0; max-width: 22ch; font: 600 var(--t-h2)/1.1 var(--titulo);
  letter-spacing: -0.026em; text-wrap: balance;
}
.texto { margin: 20px 0 0; max-width: 52ch; color: var(--grafite); font-size: var(--t-chamada); line-height: 1.5; text-wrap: pretty; }

/* steps and gestures share one grid: one column on a phone, then two, then four */
.passos, .gestos { display: grid; gap: 28px 32px; margin: 28px 0 0; padding: 0; }
@media (min-width: 560px) { .passos, .gestos { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 900px) { .passos, .gestos { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.passos { list-style: none; counter-reset: passo; }
.passos li { counter-increment: passo; }
.passos li::before {
  content: counter(passo); display: block; margin-bottom: 10px;
  font: 400 var(--t-pequeno)/1 var(--maquina); color: var(--feltro);
}
.passos strong { display: block; font-weight: 600; }
.passos span { display: block; margin-top: 4px; color: var(--grafite); text-wrap: pretty; }
.figura-maquina { margin-top: 56px; }

.gestos dt { font-weight: 600; }
.gestos dd { margin: 4px 0 0; color: var(--grafite); text-wrap: pretty; }

.rodape {
  margin-top: clamp(80px, 12vw, 144px); padding-block: 28px 40px; border-top: 1px solid var(--linha);
  display: flex; flex-wrap: wrap; gap: 16px 24px; justify-content: space-between;
  font-size: var(--t-pequeno); color: var(--grafite);
}
.rodape p { margin: 0; }
.rodape a { display: inline-block; padding-block: 8px; margin-block: -8px; }
.rodape a:hover { color: var(--tinta); }
.rodape .creditos { flex-basis: 100%; }

/* The machine speaks the page's language: its one lit part is the felt green,
   its small print is the page's grafite in the page's typewriter face. */
.figura-maquina .iso[data-theme="light"] {
  --anatomy-lit: var(--feltro); --anatomy-muted: var(--grafite); --anatomy-mono: var(--maquina);
}
.figura-maquina .iso-figure { margin: 0; }
.figura-maquina .iso-stage { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
.figura-maquina .iso-legend { font-size: var(--t-pequeno); }
.figura-maquina .iso-caption { max-width: 70ch; text-wrap: pretty; }
@media (min-width: 640px) { .figura-maquina .iso-plate-corner { font-size: 12px; } }
.junto { white-space: nowrap; }
`;

const icon = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3v10M5.5 8.5 10 13l4.5-4.5M4 16.5h12"/></svg>`;

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Gaveta: seus prints numa gaveta, no Mac</title>
<meta name="description" content="Cada print que você tira cai numa gaveta na borda da tela do Mac. Escolha vários e cole todos de uma vez. Grátis e de código aberto.">
<meta property="og:title" content="Gaveta: seus prints numa gaveta, no Mac">
<meta property="og:description" content="Cada print que você tira cai numa gaveta na borda da tela. Escolha vários e cole todos de uma vez.">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:image" content="${SHARE}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Uma gaveta de fichário aberta, desenhada em linhas finas, ao lado do título: Seus prints, numa gaveta.">
<meta name="twitter:card" content="summary_large_image">${SITE ? `
<meta property="og:url" content="${SITE}/">
<link rel="canonical" href="${SITE}/">` : ""}
<meta name="theme-color" content="#ffffff">
<link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32.png">
<link rel="apple-touch-icon" href="assets/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Courier+Prime&display=swap">
<!-- Figures drawn with Hairline (github.com/lucasmarkes/hairline) and the Anatomy kit (github.com/wheresryan22/anatomy), both MIT. -->
<style>${machine.css}${css}</style>
</head>
<body>
<a class="pular" href="#conteudo">Pular para o conteúdo</a>
<header class="envolve topo">
  <a class="marca" href="/" translate="no"><img src="assets/icone-128.png" alt="" width="30" height="30">Gaveta</a>
  <nav aria-label="Principal">
    <a href="#como-funciona">Como funciona</a>
    <a href="${REPO}">GitHub</a>
  </nav>
</header>
<main id="conteudo">
  <section class="envolve abertura" aria-labelledby="titulo">
    <div>
      <h1 id="titulo">Seus prints, numa&nbsp;gaveta.</h1>
      <p class="chamada">Cada print que você tira cai numa gaveta na borda da tela. Escolha vários e cole todos de uma vez, num chat, num chamado ou <span class="junto">num e-mail.</span></p>
      <div class="acoes">
        <a class="botao" href="${DOWNLOAD}">${icon}Baixar para Mac</a>
        <span class="nota">macOS&nbsp;14 ou mais novo · grátis · código aberto</span>
      </div>
    </div>
    <div class="figura-abertura">
      <div id="fichario"></div>
      <p class="leitura" id="fichario-leitura" aria-hidden="true">passe o mouse nas fichas</p>
    </div>
  </section>

  <section class="envolve secao" id="como-funciona" aria-labelledby="como-titulo">
    <div class="aba"><span class="etiqueta">Como funciona</span></div>
    <h2 id="como-titulo">Do print ao ⌘V, em quatro passos.</h2>
    <ol class="passos">
      ${steps.map(([title, text]) => `<li><strong>${title}</strong><span>${text}</span></li>`).join("\n      ")}
    </ol>
    <div class="figura-maquina">${machine.html}</div>
  </section>

  <section class="envolve secao" aria-labelledby="gestos-titulo">
    <div class="aba"><span class="etiqueta">Gestos</span></div>
    <h2 id="gestos-titulo">Um gesto para cada coisa.</h2>
    <dl class="gestos">
      ${gestures.map(([gesture, what]) => `<div><dt>${gesture}</dt><dd>${what}</dd></div>`).join("\n      ")}
    </dl>
  </section>

  <section class="envolve secao" aria-labelledby="privado-titulo">
    <div class="aba"><span class="etiqueta">Só no seu Mac</span></div>
    <h2 id="privado-titulo">Sem conta. Sem internet.</h2>
    <p class="texto">Seus prints não saem do seu computador. A <span translate="no">Gaveta</span> não pede login, não envia nada para lugar nenhum e funciona sem conexão.</p>
    <div class="acoes">
      <a class="botao" href="${DOWNLOAD}">${icon}Baixar para Mac</a>
      <span class="nota">macOS&nbsp;14 ou mais novo · grátis · código aberto</span>
    </div>
  </section>
</main>
<footer class="envolve">
  <div class="rodape">
    <p>Feita por Luiz Paulo Frasca Neto. Código aberto, licença MIT.</p>
    <p><a href="${REPO}">Código no GitHub</a></p>
    <p class="creditos">Figuras desenhadas com <a href="https://github.com/lucasmarkes/hairline" translate="no">Hairline</a> e <a href="https://github.com/wheresryan22/anatomy" translate="no">Anatomy</a>.</p>
  </div>
</footer>

<script>${inline(kernel)}</script>
<script>
// The host for the drawer at the top: it mounts the figure, shows what is
// under the pointer, and walks it once on its own.
(() => {
  const stage = document.getElementById("fichario");
  const out = document.getElementById("fichario-leitura");
  // a finger has no hover, so on a touch screen the invitation is to touch
  const rest = matchMedia("(hover: none)").matches ? "toque nas fichas" : "passe o mouse nas fichas";
  window.hairline = (figure) => {
    HL.inject(document);
    stage.setAttribute("data-hairline", figure.name);
    stage.setAttribute("role", "img");
    stage.setAttribute("aria-label", figure.means);
    const svg = HL.mk("svg", { viewBox: "0 0 400 320", "aria-hidden": "true" }, stage);
    let text = null;
    const read = {
      get textContent() { return text; },
      set textContent(value) {
        text = value == null ? "" : String(value);
        out.textContent = text === "rest" ? rest : text;
      },
    };
    figure.mount({ stage, svg, read }, figure.range[1]);
    if (text === null) read.textContent = "rest";
    // The tour walks the drawer once, front card to back card (the cards between
    // rise on the way), in under five seconds; then the figure rests until a hand arrives.
    const real = (figure.tour || HL.LAP).filter(Boolean);
    const stops = [real[0], real[real.length - 1], null];
    const tour = HL.tour(stage, stops, (i) => { if (i === stops.length - 1) tour.stop(); });
  };
})();
</script>
<script type="module">${inline(fichario)}</script>
<script type="module">${inline(machine.script)}</script>
</body>
</html>
`;

writeFileSync(join(HERE, "index.html"), html);
console.log("wrote site/index.html", Math.round(html.length / 1024), "KB");
