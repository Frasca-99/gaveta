/**
 * Builds the Gaveta landing into site/index.html: one self-contained page.
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
const SITE = (process.env.SITE_URL || "").replace(/\/$/, "");
const SHARE = `${SITE}${SITE ? "/" : ""}assets/compartilhar.png`;

const body = read("mesa/pagina.html")
  .replaceAll("{{REPO}}", REPO)
  .replace("{{ANATOMIA}}", machine.html);

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Gaveta: seus prints numa gaveta, no Mac</title>
<meta name="description" content="Cada print que você tira cai numa gaveta na borda da tela do Mac. Escolha vários e cole todos de uma vez. Grátis e de código aberto.">
<meta property="og:title" content="Gaveta: seus prints numa gaveta, no Mac">
<meta property="og:description" content="Cada print que você tira cai numa gaveta na borda da tela. Escolha vários e cole todos de uma vez.">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:image" content="${SHARE}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="A mesa de um Mac com a gaveta de fichário aberta na borda direita, cheia de prints.">
<meta name="twitter:card" content="summary_large_image">${SITE ? `
<meta property="og:url" content="${SITE}/">
<link rel="canonical" href="${SITE}/">` : ""}
<meta name="theme-color" content="#eee8dc">
<link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32.png">
<link rel="apple-touch-icon" href="assets/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap">
<!-- Figures drawn with Hairline (github.com/lucasmarkes/hairline) and the Anatomy kit (github.com/wheresryan22/anatomy), both MIT. -->
<style>${machine.css}${read("mesa/mesa.css")}</style>
</head>
<body>
${body}
<script>${inline(kernel)}</script>
<script>
// The host for the drawer drawn in fichario.svg: it mounts the figure, shows
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
</script>
<script type="module">${inline(fichario)}</script>
<script type="module">${inline(machine.script)}</script>
<script>${inline(read("mesa/mesa.js"))}</script>
</body>
</html>
`;

writeFileSync(join(HERE, "index.html"), html);
console.log("wrote site/index.html", Math.round(html.length / 1024), "KB");
