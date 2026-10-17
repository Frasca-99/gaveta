/**
 * Builds the Gaveta landing: site/index.html in Portuguese and site/en/index.html
 * in English (its words in vidro/ingles.mjs), each one self-contained page.
 *
 * The page (site/vidro/) is one screen: a white Mac desk, in the Mac's own
 * type, where the glass drawer works. A screenshot taken of the desk flies
 * into the drawer at the right edge and pastes into the ticket.
 *
 *   node site/build.mjs
 *   SITE_URL=https://… node site/build.mjs   (for the link preview's absolute URLs)
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as ingles from "./vidro/ingles.mjs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(join(HERE, path), "utf8");
/** A script's text can't hold a closing script tag. */
const inline = (code) => code.replace(/<\/(script)/gi, "<\\/$1");

const REPO = "https://github.com/Frasca-99/gaveta";
const RELEASES = `${REPO}/releases/latest`;
const INSTALL = "curl -fsSL https://raw.githubusercontent.com/Frasca-99/gaveta/main/scripts/get.sh | bash";
const SITE = (process.env.SITE_URL || "").replace(/\/$/, "");

/** The Portuguese page and its English copy, /en/: same page, same script, the words swapped. */
const PT = {
  lang: "pt-BR",
  locale: "pt_BR",
  title: "Gaveta: seus prints numa gaveta, no Mac",
  description: "Pare de procurar seus prints. No Mac, eles ficam numa gaveta na borda da tela, prontos para colar: um ou vários de uma vez. Grátis e de código aberto.",
  ogDescription: "Pare de procurar seus prints. Eles ficam numa gaveta na borda da tela, prontos para colar: um ou vários de uma vez.",
  imageAlt: "A Gaveta aberta na borda da tela de um Mac, uma gaveta de vidro cheia de prints.",
};

/**
 * Swaps the Portuguese pieces for the English ones. Each piece must still be
 * in one of the texts: if not, the Portuguese changed and the English did not.
 */
function translate(texts, pairs, where) {
  for (const [pt] of pairs) {
    if (!texts.some((text) => text.includes(pt))) throw new Error(`${where}: "${pt.slice(0, 70)}" is gone from the Portuguese, update site/vidro/ingles.mjs`);
  }
  return texts.map((text) => pairs.reduce((out, [pt, en]) => out.replaceAll(pt, en), text));
}

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

  let body = read("vidro/pagina.html");
  let script = read("vidro/vidro.js");
  if (en) {
    [body] = translate([body], ingles.pagina, "vidro/pagina.html");
    [script] = translate([script], ingles.vidro, "vidro/vidro.js");
  }
  body = body
    .replaceAll("{{REPO}}", REPO)
    .replaceAll("{{RELEASES}}", RELEASES)
    .replaceAll("{{INSTALAR}}", INSTALL)
    .replace("{{URL_OUTRO}}", en ? "../" : "en/")
    .replaceAll("{{OUTRO_LANG}}", en ? "pt-BR" : "en")
    .replace("{{OUTRO}}", en ? "pt" : "en")
    .replace("{{OUTRO_NOME}}", en ? "Ler em português" : "Read in English")
    .replace("{{OUTRO_SIGLA}}", en ? "PT" : "EN")
    .replaceAll('src="assets/', `src="${up}assets/`);
  const leftover = body.match(/\{\{[A-Z_]+\}\}/);
  if (leftover) throw new Error(`vidro/pagina.html: ${leftover[0]} was never filled in`);
  const share = `${SITE ? `${SITE}/` : up}assets/${en ? "compartilhar-en.png" : "compartilhar.png"}`;

  return `<!doctype html>
<html lang="${words.lang}" data-raiz="${up}">
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
<meta name="theme-color" content="#ffffff">
<link rel="icon" type="image/png" sizes="32x32" href="${up}assets/favicon-32.png">
<link rel="apple-touch-icon" href="${up}assets/apple-touch-icon.png">
<style>${read("vidro/vidro.css")}</style>
</head>
<body>
${body}
<script>${inline(script)}</script>
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
