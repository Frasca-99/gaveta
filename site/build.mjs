/**
 * Builds the Gaveta landing: site/index.html in Portuguese and site/en/index.html
 * in English (its words in mesa/ingles.mjs), each one self-contained page.
 *
 * The page is a Mac's desk where the Gaveta works (site/mesa/): you take a
 * print right there, it flies into the drawer, you choose several and paste
 * them all into a ticket. Two files on the desk open the figures: the card
 * catalog drawer drawn with Hairline (its kernel is in vendor/, MIT) and the
 * machine drawn with the Anatomy kit (MIT), built by
 * figuras/como-funciona/build.mjs into como-funciona.parts.json.
 *
 *   node site/build.mjs
 *   SITE_URL=https://… node site/build.mjs   (for the link preview's absolute URLs)
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as ingles from "./mesa/ingles.mjs";
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
const SITE = (process.env.SITE_URL || "").replace(/\/$/, "");

/** The Portuguese page and its English copy, /en/: same desk, same script, the words swapped. */
const PT = {
  lang: "pt-BR",
  locale: "pt_BR",
  title: "Gaveta: seus prints numa gaveta, no Mac",
  description: "Cada print que você tira cai numa gaveta na borda da tela do Mac. Escolha vários e cole todos de uma vez. Grátis e de código aberto.",
  ogDescription: "Cada print que você tira cai numa gaveta na borda da tela. Escolha vários e cole todos de uma vez.",
  imageAlt: "A mesa de um Mac com a gaveta de fichário aberta na borda direita, cheia de prints.",
};

/**
 * Swaps the Portuguese pieces for the English ones. Each piece must still be
 * in one of the texts: if not, the Portuguese changed and the English did not.
 */
function translate(texts, pairs, where) {
  for (const [pt] of pairs) {
    if (!texts.some((text) => text.includes(pt))) throw new Error(`${where}: "${pt.slice(0, 70)}" is gone from the Portuguese, update site/mesa/ingles.mjs`);
  }
  return texts.map((text) => pairs.reduce((out, [pt, en]) => out.replaceAll(pt, en), text));
}

/** The host for the drawer in fichario.svg, inlined on the page. */
const HOST = `// The host for the drawer drawn in fichario.svg: it mounts the figure, shows
// what is under the pointer, and walks it once when the window first opens.
(() => {
  const stage = document.getElementById("fichario");
  const out = document.getElementById("fichario-leitura");
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
    const real = (figure.tour || HL.LAP).filter(Boolean);
    const stops = [real[0], real[real.length - 1], null];
    const tour = HL.tour(stage, stops, (i) => { if (i === stops.length - 1) tour.stop(); });
  };
})();
`;

/**
 * Before anything is drawn: a visitor whose browser is not in Portuguese goes
 * to the English page, unless they chose a language here before.
 */
const goes = (en) => en
  ? `try { if (localStorage.getItem("gaveta-idioma") === "pt") location.replace("../" + location.hash); } catch {}`
  : `try {
  const chosen = localStorage.getItem("gaveta-idioma");
  const robot = /bot|crawl|spider|preview|facebookexternalhit|embedly|slurp/i.test(navigator.userAgent);
  const portuguese = (navigator.languages || [navigator.language]).some((code) => /^pt(-|$)/i.test(code));
  if (chosen === "en" || (!chosen && !robot && !portuguese)) location.replace("en/" + location.hash);
} catch {}`;

function page(en) {
  const words = en ? ingles.head : PT;
  const up = en ? "../" : "";
  const here = `${SITE}/${en ? "en/" : ""}`;

  let body = read("mesa/pagina.html")
    .replaceAll("{{REPO}}", REPO)
    .replace("{{SIGLA}}", en ? "EN" : "PT")
    .replace("{{URL_PT}}", en ? "../" : "./")
    .replace("{{URL_EN}}", en ? "./" : "en/")
    .replace("{{EM_PT}}", String(!en))
    .replace("{{EM_EN}}", String(en));
  let [figureHtml, figureScript] = [machine.html, machine.script];
  let [host, fichas, desk] = [HOST, fichario, read("mesa/mesa.js")];
  if (en) {
    [body] = translate([body], ingles.pagina, "mesa/pagina.html");
    [figureHtml, figureScript] = translate([figureHtml, figureScript], ingles.maquina, "como-funciona.parts.json");
    [host, fichas] = translate([host, fichas], ingles.fichario, "fichario.js");
    [desk] = translate([desk], ingles.mesa, "mesa/mesa.js");
  }
  body = body.replace("{{ANATOMIA}}", figureHtml).replaceAll('src="assets/', `src="${up}assets/`);
  const share = SITE ? `${SITE}/assets/compartilhar.png` : `${up}assets/compartilhar.png`;

  return `<!doctype html>
<html lang="${words.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<script>${goes(en)}</script>
<title>${words.title}</title>
<meta name="description" content="${words.description}">
<meta property="og:title" content="${words.title}">
<meta property="og:description" content="${words.ogDescription}">
<meta property="og:type" content="website">
<meta property="og:locale" content="${words.locale}">
<meta property="og:locale:alternate" content="${en ? PT.locale : ingles.head.locale}">
<meta property="og:image" content="${share}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${words.imageAlt}">
<meta name="twitter:card" content="summary_large_image">${SITE ? `
<meta property="og:url" content="${here}">
<link rel="canonical" href="${here}">
<link rel="alternate" hreflang="pt-BR" href="${SITE}/">
<link rel="alternate" hreflang="en" href="${SITE}/en/">
<link rel="alternate" hreflang="x-default" href="${SITE}/">` : ""}
<meta name="theme-color" content="#eee8dc">
<link rel="icon" type="image/png" sizes="32x32" href="${up}assets/favicon-32.png">
<link rel="apple-touch-icon" href="${up}assets/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap">
<!-- Figures drawn with Hairline (github.com/lucasmarkes/hairline) and the Anatomy kit (github.com/wheresryan22/anatomy), both MIT. -->
<style>${machine.css}${read("mesa/mesa.css")}</style>
</head>
<body>
${body}
<script>${inline(kernel)}</script>
<script>${host}</script>
<script type="module">${inline(fichas)}</script>
<script type="module">${inline(figureScript)}</script>
<script>${inline(desk)}</script>
</body>
</html>
`;
}

for (const en of [false, true]) {
  const html = page(en);
  const file = en ? "en/index.html" : "index.html";
  mkdirSync(join(HERE, dirname(file)), { recursive: true });
  writeFileSync(join(HERE, file), html);
  console.log(`wrote site/${file}`, Math.round(html.length / 1024), "KB");
}
