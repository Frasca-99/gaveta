/**
 * Records the Gaveta at work, on the landing's desk, for the launch video.
 *
 * Headless Chrome opens the desk and a script moves the mouse like a person
 * would (a macOS cursor is drawn on the page so it shows). To get sharp,
 * evenly spaced frames, the page's time runs ten times slower while it is
 * recorded (its clocks, timers and CSS animations alike) and a full
 * resolution screenshot is taken one after another; each keeps the page time
 * it shows. ffmpeg puts them back at real speed in video/public/mesa.mp4, at
 * 60 fps, and video/public/roteiro.json says when each step happens and which
 * part of the desk to look at, for the captions and the camera in the
 * Remotion composition.
 *
 *   python3 -m http.server 4321 --directory site   (in another terminal)
 *   node video/gravar.mjs [http://127.0.0.1:4321/]
 */
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const URL_ = process.argv[2] || "http://127.0.0.1:4321/";
const W = 1440, H = 810, SCALE = 2;
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** How fast the page's time runs while recording: 0.1 is ten times slower. */
const RATE = 0.1;
let rate = 1;
let realStart = 0;
/** The page's own time since the recording began, in seconds. */
const pageNow = () => ((Date.now() - realStart) / 1000) * rate;
/** Waits `ms` of the page's time. */
const wait = (ms) => sleep(ms / rate);

const port = 9400 + Math.floor(Math.random() * 400);
const profile = mkdtempSync(join(tmpdir(), "gaveta-video-"));
const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, `--window-size=${W},${H}`,
  "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--force-color-profile=srgb", "about:blank",
], { stdio: "ignore" });

async function pageSocket() {
  for (let i = 0; i < 80; i++) {
    try {
      const page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(150);
  }
  throw new Error("Chrome did not start");
}

const ws = new WebSocket(await pageSocket());
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const pending = new Map();
const frames = [];
const frameDir = mkdtempSync(join(tmpdir(), "gaveta-quadros-"));
let recording = false;
ws.addEventListener("message", (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});
const rawSend = (method, params = {}) => new Promise((resolve) => {
  const n = ++id;
  pending.set(n, resolve);
  ws.send(JSON.stringify({ id: n, method, params }));
});
// While Chrome takes a screenshot it can lay the page out at another scale for an instant: a
// click or a measurement landing then goes astray. So pictures, input and measurements take turns.
let turn = Promise.resolve();
const send = (method, params = {}) => {
  const next = turn.then(() => rawSend(method, params));
  turn = next.catch(() => {});
  return next;
};
const run = async (expression) => {
  const r = (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result;
  if (r?.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
  return r?.result?.value;
};

/** Screenshots, one after another, each with the page time it shows. */
async function shoot() {
  // GAVETA_ENSAIO=1 rehearses the script without taking pictures, logging the drawer at each step
  if (process.env.GAVETA_ENSAIO) return;
  while (recording) {
    const t = pageNow();
    // only what is on screen: capturing beyond it would resize the page for an instant
    const shot = await send("Page.captureScreenshot", { format: "jpeg", quality: 92, captureBeyondViewport: false, fromSurface: true });
    if (!shot.result) continue;
    const file = join(frameDir, `q${String(frames.length).padStart(5, "0")}.jpg`);
    writeFileSync(file, Buffer.from(shot.result.data, "base64"));
    frames.push({ file, t });
  }
}

/** An element's box on the desk, in CSS pixels. */
const box = (selector) => run(`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })()`);

// ── the mouse, moved like a hand moves it ──────────────────────────────────

const pointer = { x: W * 0.55, y: H * 0.55, buttons: 0 };
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
async function moveTo(x, y, ms = 700, modifiers = 0) {
  const from = { ...pointer };
  const steps = Math.max(2, Math.round(ms / 16));
  // a slight arc, as a wrist draws it
  const bend = Math.min(60, Math.hypot(x - from.x, y - from.y) * 0.08);
  for (let i = 1; i <= steps; i++) {
    const e = ease(i / steps);
    const lift = Math.sin(Math.PI * e) * bend;
    pointer.x = from.x + (x - from.x) * e;
    pointer.y = from.y + (y - from.y) * e - lift;
    await send("Input.dispatchMouseEvent", {
      type: "mouseMoved", x: pointer.x, y: pointer.y, modifiers,
      button: pointer.buttons ? "left" : "none", buttons: pointer.buttons,
    });
    await wait(16);
  }
}
async function press(modifiers = 0) {
  pointer.buttons = 1;
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: pointer.x, y: pointer.y, button: "left", buttons: 1, clickCount: 1, modifiers });
}
async function release(modifiers = 0) {
  pointer.buttons = 0;
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: pointer.x, y: pointer.y, button: "left", buttons: 0, clickCount: 1, modifiers });
}
async function click(x, y, ms = 650, modifiers = 0) {
  await moveTo(x, y, ms);
  await wait(120);
  await press(modifiers);
  await wait(90);
  await release(modifiers);
}
async function key(keyName, code, keyCode, modifiers) {
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: keyName, code, windowsVirtualKeyCode: keyCode, modifiers });
  await wait(80);
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: keyName, code, windowsVirtualKeyCode: keyCode, modifiers });
}
const centre = (b, fx = 0.5, fy = 0.5) => [b.x + b.w * fx, b.y + b.h * fy];

// ── the page, its clocks, and a cursor ─────────────────────────────────────

const steps = [];
/** A step of the story: when it starts, and the part of the desk worth looking at. */
function mark(name, focus) {
  steps.push({ name, t: pageNow(), focus: focus || { x: 0, y: 0, w: W, h: H } });
  if (process.env.GAVETA_ENSAIO) {
    run(`document.querySelector('.gaveta').dataset.estado + ' fichas ' + document.querySelectorAll('.ficha').length + ' escolhidas ' + document.querySelectorAll('.ficha.escolhida').length + ' camada ' + !document.getElementById('captura-camada').hidden`)
      .then((state) => console.log(`${pageNow().toFixed(2)} ${name}: ${state}`));
  }
}

await send("Page.enable");
await send("Animation.enable");
await send("Page.addScriptToEvaluateOnNewDocument", { source: `(() => {
  // One clock for the page, which the recorder can slow down: performance.now, Date.now,
  // requestAnimationFrame and the timers all follow it.
  const realPerf = performance.now.bind(performance), realDate = Date.now, realRaf = requestAnimationFrame.bind(window);
  const realTimeout = setTimeout.bind(window), realInterval = setInterval.bind(window);
  let base = realPerf(), virt = base, speed = 1;
  const now = () => virt + (realPerf() - base) * speed;
  const dateBase = realDate(), perfBase = now();
  performance.now = now;
  Date.now = () => dateBase + (now() - perfBase);
  window.requestAnimationFrame = (fn) => realRaf(() => fn(now()));
  window.setTimeout = (fn, ms = 0, ...a) => realTimeout(fn, ms / speed, ...a);
  window.setInterval = (fn, ms = 0, ...a) => realInterval(fn, ms / speed, ...a);
  window.__ritmo = (r) => { virt = now(); base = realPerf(); speed = r; };
})();` });
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: SCALE, mobile: false });
await send("Page.navigate", { url: URL_ });
await sleep(3000); // fonts, the first prints in the drawer

// The video tells its own story: the page's words, footer and tips step aside; a cursor joins.
await run(`(() => {
  document.getElementById('guia-fechar').click();
  // the menu bar's clock stops where it is: a recording made in slow time would see minutes pass
  const relogio = document.getElementById('relogio');
  relogio.replaceWith(relogio.cloneNode(true));
  const style = document.createElement('style');
  style.textContent = '.abertura, .mesa-rodape, #guia { visibility: hidden !important; } #cursor-video { position: fixed; left: 0; top: 0; z-index: 99999; pointer-events: none; will-change: transform; } #cursor-video svg { position: absolute; left: 0; top: 0; overflow: visible; } #cursor-video .mira { display: none; left: -12px; top: -12px; } #cursor-video.mira-on .seta { display: none; } #cursor-video.mira-on .mira { display: block; } #cursor-video .toque { position: absolute; left: -16px; top: -16px; width: 32px; height: 32px; border-radius: 50%; border: 2px solid rgba(0,122,255,.7); opacity: 0; }';
  document.head.append(style);
  const c = document.createElement('div');
  c.id = 'cursor-video';
  c.innerHTML = '<span class="toque"></span><svg class="seta" width="22" height="30" viewBox="0 0 22 30"><path d="M2 1.5v23.2l5.6-5.4 3.6 8.3 3.6-1.6-3.6-8.1h7.8z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg><svg class="mira" width="24" height="24" viewBox="-12 -12 24 24"><path d="M0-11v22M-11 0h22" stroke="#fff" stroke-width="3"/><path d="M0-11v22M-11 0h22" stroke="#111" stroke-width="1.2"/></svg>';
  document.body.append(c);
  const camada = document.getElementById('captura-camada');
  const aim = () => c.classList.toggle('mira-on', !camada.hidden && !camada.classList.contains('janelas'));
  const place = (e) => { c.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)'; aim(); };
  addEventListener('pointermove', place, true);
  addEventListener('pointerdown', (e) => { place(e); c.querySelector('.toque').animate([{ opacity: .9, transform: 'scale(.4)' }, { opacity: 0, transform: 'scale(1.3)' }], { duration: 380, easing: 'ease-out' }); }, true);
  addEventListener('pointerup', place, true);
  new MutationObserver(aim).observe(camada, { attributes: true });
  c.style.transform = 'translate(${pointer.x}px, ${pointer.y}px)';
  return true;
})()`);

// From here on the page's time runs slow, and every frame is a screenshot.
await run(`__ritmo(${RATE})`);
await send("Animation.setPlaybackRate", { playbackRate: RATE });
rate = RATE;
realStart = Date.now();
recording = true;
const shooting = shoot();

// ── the script ─────────────────────────────────────────────────────────────

await moveTo(W * 0.52, H * 0.5, 300);
mark("inicio");
await wait(900);

// 1. A print of the shop, taken with the selection
const shop = await box("#navegador");
mark("tirar");
await click(...centre(await box(".captura-modo[data-modo='selecao']")), 800);
await wait(250);
await moveTo(shop.x - 8, shop.y - 8, 700);
await press();
await moveTo(shop.x + shop.w + 8, shop.y + shop.h + 8, 900);
await wait(150);
await release();
mark("voou");
await wait(2200);

// 2. A second one: the ticket's window, with the window mode
mark("janela");
await click(...centre(await box(".captura-modo[data-modo='janela']")), 700);
await wait(200);
const ticket = await box("#chamado");
await moveTo(ticket.x + ticket.w * 0.5, ticket.y + ticket.h * 0.35, 650);
await wait(300);
await click(pointer.x, pointer.y, 10);
await wait(2300);

// 3. The pointer rests on the right edge: the drawer opens
const drawerFocus = { x: W - 470, y: 40, w: 470, h: H - 60 };
mark("abrir", drawerFocus);
await moveTo(W - 1, H * 0.5, 900);
await wait(1100);

// 4. Through the cards, each whole under the pointer
const cards = await run(`[...document.querySelectorAll('.ficha')].map((c) => { const r = c.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })`);
mark("folhear", drawerFocus);
for (const card of cards.slice(0, 3)) {
  await moveTo(card.x + card.w * 0.55, card.y + 36, 420);
  await wait(380);
}

// 5. Several selected with ⌘-click: the two new ones
mark("selecionar", drawerFocus);
const latest = (n) => run(`(() => { const all = [...document.querySelectorAll('.ficha')]; const r = all[all.length - ${n}].getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })()`);
// Each card is measured only after the pointer rests on it and the stack has settled.
const chosen = () => run(`document.querySelectorAll('.ficha.escolhida').length`);
let card = await latest(1);
await moveTo(card.x + card.w * 0.5, card.y + 50, 600);
await wait(700);
card = await latest(1);
await click(card.x + card.w * 0.5, card.y + 50, 120, 4);
await wait(500);
card = await latest(2);
await moveTo(card.x + card.w * 0.5, card.y + 34, 500);
await wait(700);
card = await latest(2);
await click(card.x + card.w * 0.5, card.y + 34, 120, 4);
await wait(700);
const picked = await chosen();
if (picked !== 2) {
  console.error(`atenção: ${picked} fichas selecionadas em vez de 2`);
  process.exit(1);
}

// 6. Copy them all
mark("copiar", { x: W - 420, y: H - 330, w: 420, h: 330 });
await click(...centre(await box(".gaveta-barra [data-acao='copiar']")), 650);
await wait(1100);

// 7. One ⌘V in the ticket pastes both
const pasteFocus = { x: 0, y: ticket.y - 20, w: 620, h: ticket.h + 40 };
mark("colar", pasteFocus);
await moveTo(ticket.x + ticket.w * 0.55, ticket.y + ticket.h * 0.62, 900);
await wait(500);
await key("v", "KeyV", 86, 4);
mark("colado", pasteFocus);
await wait(1800);

// 8. Out of the drawer, onto the desk: the file stays there
mark("mesa", { x: W * 0.28, y: 40, w: W * 0.72, h: H - 60 });
await moveTo(W - 1, H * 0.45, 900);
await wait(1000);
card = await latest(1);
await moveTo(card.x + card.w * 0.5, card.y + 50, 500);
await wait(200);
await press();
await moveTo(W * 0.48, H * 0.42, 1100);
await wait(150);
await release();
await wait(1300);

// 9. The cross throws one away
mark("lixo", drawerFocus);
await moveTo(W - 1, H * 0.45, 800);
await wait(1000);
card = await latest(1);
await moveTo(card.x + card.w * 0.55, card.y + 40, 450);
await wait(450);
await click(card.x + card.w - 24, card.y + 24, 300);
await wait(1200);
await moveTo(W * 0.5, H * 0.45, 900);
mark("fim");
await wait(1600);

recording = false;
await shooting;
ws.close();
chrome.kill();

// ── frames to a steady 60 fps video ────────────────────────────────────────

const out = join(HERE, "public");
mkdirSync(out, { recursive: true });
const start = frames[0].t;
const end = steps[steps.length - 1].t + 1.6;
const list = frames.map((f, i) => {
  const next = i + 1 < frames.length ? frames[i + 1].t : end;
  return `file '${f.file}'\nduration ${Math.max(0.001, next - f.t).toFixed(4)}`;
});
list.push(`file '${frames[frames.length - 1].file}'`);
const listFile = join(frameDir, "lista.txt");
writeFileSync(listFile, list.join("\n"));
execFileSync("ffmpeg", [
  "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", listFile,
  "-vf", "fps=60,format=yuv420p", "-c:v", "libx264", "-crf", "16", "-preset", "slow", "-movflags", "+faststart",
  join(out, "mesa.mp4"),
]);
const roteiro = {
  width: W, height: H, duration: +(end - start).toFixed(3),
  steps: steps.map((s) => ({ ...s, t: +(s.t - start).toFixed(3) })),
};
writeFileSync(join(out, "roteiro.json"), JSON.stringify(roteiro, null, 2));
rmSync(frameDir, { recursive: true, force: true });
rmSync(profile, { recursive: true, force: true });
console.log(`video/public/mesa.mp4: ${frames.length} frames, ${roteiro.duration.toFixed(1)} s`);
console.log(roteiro.steps.map((s) => `${s.t.toFixed(2)} ${s.name}`).join("\n"));
