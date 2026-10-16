/**
 * Fig 1 of the Gaveta landing: how it works, as a machine on a bench.
 *
 * A card catalog drawer stands on rails. A camera on a stand, its arm over
 * the drawer's front, drops each new capture into the front of the drawer as
 * an index card. A follower block slides along the drawer: the cards in front
 * of it rise, and that is the selection. A click sends copies of the raised
 * cards, all at once, into the ⌘V tray in front: one paste, every card. The
 * originals stay in the drawer, because pasting copies.
 *
 * The model is one number, k: how many cards are chosen, counted from the
 * front. The follower, the raised cards, the copies and the readout all come
 * from it.
 *
 * Built with the Anatomy kit (MIT, github.com/wheresryan22/anatomy), read from
 * the skill's folder. `node build.mjs` writes como-funciona.html, and
 * `--light` writes como-funciona-light.html.
 */
import { writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const KIT = process.env.ANATOMY_DIR || join(homedir(), ".claude/skills/anatomy");
const k = await import(pathToFileURL(join(KIT, "kit/iso-kit.mjs")).href);
const { kitScript } = await import(pathToFileURL(join(KIT, "scripts/inline-kit.mjs")).href);

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 600;
const HEIGHT = 400;

// The bench.
const PLATE = { x: -122, y: -80, w: 234, d: 214, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;

// The drawer: a floor on two rails, three walls and a taller front.
const DRAWER = { x: -66, y: -60, w: 96, d: 112, r: 3 };
const FLOOR_Z = 3;
const FLOOR_TOP = 5;
const WALL_H = 24;
const WALL_T = 3;
const FRONT = { x: -68, y: 52, w: 100, d: 5, r: 1.5 };
const FRONT_TOP = 36;

// The cards, back (oldest) to front (newest), and their tabs in three places.
const N = 6;
const CARD_X = -58;
const CARD_W = 76;
const CARD_T = 1.4;
const CARD_H = 38;
const GAP = 13;
const FIRST = 40;
const SLOTS = Array.from({ length: N }, (_, i) => FIRST - GAP * (N - 1 - i));
const TAB_W = 16;
const TAB_H = 6;
const TAB_X = [6, 30, 54];
const LIFT = 34;
const CARD_TOP = FLOOR_TOP + CARD_H;

// The follower block that rides between the cards, and where it stands for k.
const followerY = (chosen) => FIRST - GAP * chosen + 6.5;
const FOLLOWER = { x: -63, y: followerY(0) - 1.5, w: 90, d: 3, r: 1 };
const FOLLOWER_TOP = 33;

// The ⌘V tray in front, where the copies land as a stack of sheets.
const TRAY = { x: -64, y: 70, w: 92, d: 50, r: 3 };
const TRAY_FLOOR = 1.5;
const TRAY_H = 7;
const SHEET = { w: 70, d: 38, t: 0.7 };
const sheetAt = (j) => ({ x: -57 + 1.4 * j, y: 78 - 1.2 * j, w: SHEET.w, d: SHEET.d, r: 0.8 });
// Where the flying copies head, over the middle of the tray.
const LAND_Y = 97;

// The camera on its stand, its head over the front slot.
const POST = [61, 40];
const STAND = { x: 48, y: 27, w: 26, d: 26, r: 4 };
const ARM = { x: -6, y: 36, w: 71, d: 8, r: 2 };
const ARM_Z = 122;
const HEAD = { x: -38, y: 28, w: 36, d: 24, r: 3 };
const HEAD_Z = 112;
const DROP = HEAD_Z - 4 - CARD_TOP;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    ...k.boxCorners(HEAD, HEAD_Z, ARM_Z + 6),
    [POST[0], POST[1], ARM_Z + 8],
    [CARD_X, FIRST, CARD_TOP + TAB_H + LIFT],
    [CARD_X + CARD_W, SLOTS[0], CARD_TOP + TAB_H + LIFT],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 55 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
/** A closed rectangle on a face that looks along +y, at depth y. */
const faceRect = (x0, x1, z0, z1, y) => k.pathOf([at([x0, y, z0]), at([x1, y, z0]), at([x1, y, z1]), at([x0, y, z1])], true);
/** One segment across a +y face. */
const faceLine = (x0, x1, z, y) => k.segment([x0, y, z], [x1, y, z], P);

function bench() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));

  // A ruler along the drawer, a major tick at every card's slot.
  const strip = { x: 35, y: SLOTS[0] - 9, w: 7, d: GAP * (N - 1) + 18, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(SLOTS[0] - 6.5, FIRST + 6.5, GAP / 2, 2, strip.x + 0.8, 0.6, [2, 3.6], P, "y");
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 3.5, strip.y + 2, 0.6]), at([strip.x + 3.5, strip.y + strip.d - 2, 0.6])], { size: 0.45 }));

  // The maker's label plate.
  const label = { x: 54, y: 90, w: 36, d: 20, r: 2 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 4), { tone: "faint" }));
  [24, 18, 12].forEach((w, row) => {
    out.push(L(k.lineOnTop([label.x + 5, label.y + 6 + row * 4], [label.x + 5 + w, label.y + 6 + row * 4], 0.8, P), { tone: "lo", free: true }));
  });
  out.push(D([at([label.x + label.w - 3.5, label.y + 3.5, 0.8]), at([label.x + label.w - 3.5, label.y + label.d - 3.5, 0.8])], { size: 0.45 }));
  return out.join("");
}

function rails() {
  const out = [];
  for (const x of [-60, 18]) {
    out.push(S(k.slabOf({ x, y: -64, w: 6, d: 120, r: 1 }, 0, FLOOR_Z, P, 3, 0.4), { tone: "mid" }));
    out.push(S(k.slabOf({ x: x - 1, y: -70, w: 8, d: 6, r: 1.2 }, 0, 7, P, 3, 0.5), { tone: "mid" }));
    out.push(D([at([x + 3, -67, 7])], { size: 0.45 }));
  }
  return out.join("");
}

/** The floor and the walls behind the cards: back and far side. */
function drawerBack() {
  const out = [`<path class="iso-halo" d="${k.haloOf(DRAWER, FLOOR_Z, 0.1, P)}" style="filter:blur(4px)"/>`];
  out.push(S(k.slabOf(DRAWER, FLOOR_Z, FLOOR_TOP - FLOOR_Z, P, 4), { tone: "lo" }));
  out.push(S(k.slabOf({ x: DRAWER.x, y: DRAWER.y, w: DRAWER.w, d: WALL_T, r: 1 }, FLOOR_TOP, WALL_H, P, 3, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf({ x: DRAWER.x, y: DRAWER.y, w: WALL_T, d: DRAWER.d, r: 1 }, FLOOR_TOP, WALL_H, P, 3, 0.5), { tone: "mid" }));
  return out.join("");
}

/** The near side wall, painted over the cards' feet. */
function drawerSide() {
  const side = { x: DRAWER.x + DRAWER.w - WALL_T, y: DRAWER.y, w: WALL_T, d: DRAWER.d, r: 1 };
  const out = [S(k.slabOf(side, FLOOR_TOP, WALL_H, P, 3, 0.5), { tone: "mid" })];
  out.push(D([-50, 0, 44].map((y) => at([side.x + WALL_T / 2, y, FLOOR_TOP + WALL_H])), { size: 0.4 }));
  return out.join("");
}

/** The drawer's front: a board taller than the walls, with a label holder and a pull. */
function drawerFront() {
  const face = FRONT.y + FRONT.d;
  const out = [S(k.slabOf(FRONT, FLOOR_Z, FRONT_TOP - FLOOR_Z, P, 3, 0.8), { tone: "mid" })];
  const cx = FRONT.x + FRONT.w / 2;
  out.push(L(faceRect(cx - 15, cx + 15, 21, 31, face), { tone: "mid" }));
  out.push(L(faceRect(cx - 13, cx + 13, 22.6, 29.4, face), { tone: "faint" }));
  out.push(D([at([cx - 13.8, face, 26]), at([cx + 13.8, face, 26])], { size: 0.45 }));
  for (const x of [cx - 11, cx + 8]) {
    out.push(S(k.slabOf({ x, y: face, w: 3, d: 3, r: 0.6 }, 10, 4, P, 2), { tone: "mid", crease: "none" }));
  }
  out.push(S(k.slabOf({ x: cx - 13, y: face + 3, w: 26, d: 2.4, r: 1 }, 9.4, 5.2, P, 3, 0.4), { tone: "mid" }));
  return out.join("");
}

/** Card i, built at rest in its slot: the card, its tab, and the capture printed on its face. */
function card(i, lit = false) {
  const y = SLOTS[i];
  const face = y + CARD_T;
  const x0 = CARD_X + 6;
  const x1 = CARD_X + CARD_W - 6;
  const out = [S(k.slabOf({ x: CARD_X, y, w: CARD_W, d: CARD_T, r: 0.5 }, FLOOR_TOP, CARD_H, P, 2), { tone: "hi", crease: "lo", lit })];
  out.push(S(k.slabOf({ x: CARD_X + TAB_X[i % 3], y, w: TAB_W, d: CARD_T, r: 0.4 }, CARD_TOP, TAB_H, P, 2), { tone: "hi", crease: "lo", lit }));
  // the capture: a window with its title bar and three lights, and a typed line under it
  out.push(L(faceRect(x0, x1, FLOOR_TOP + 11, CARD_TOP - 5, face), { tone: "mid" }));
  out.push(L(faceLine(x0, x1, CARD_TOP - 9.5, face), { tone: "lo" }));
  out.push(D([0, 1, 2].map((n) => at([x0 + 2.6 + n * 2.6, face, CARD_TOP - 7.2])), { size: 0.4, tone: "mid" }));
  out.push(L(faceLine(x0, x0 + 30, FLOOR_TOP + 6, face), { tone: "lo", free: true }));
  return out.join("");
}

function follower() {
  const out = [S(k.slabOf(FOLLOWER, FLOOR_TOP, FOLLOWER_TOP - FLOOR_TOP, P, 3, 0.5), { tone: "mid" })];
  // The knob stands at the right end, clear of the cards, where it always shows.
  const [cx, cy] = [22.5, followerY(0)];
  out.push(S(k.cylinder(cx, cy, 3.6, FOLLOWER_TOP, 6, P, 24), { tone: "mid" }));
  out.push(L(k.knurl(cx, cy, 3.6, FOLLOWER_TOP, FOLLOWER_TOP + 6, 20, P), { tone: "lo" }));
  out.push(D([at([FOLLOWER.x + 4, cy, FOLLOWER_TOP]), at([FOLLOWER.x + 40, cy, FOLLOWER_TOP])], { size: 0.4 }));
  return out.join("");
}

function trayBack() {
  const out = [S(k.slabOf(TRAY, 0, TRAY_FLOOR, P, 4), { tone: "lo" })];
  out.push(L(k.planOutline(k.insetPlan(TRAY, 4), TRAY_FLOOR, P, 4), { tone: "faint" }));
  out.push(S(k.slabOf({ x: TRAY.x, y: TRAY.y, w: TRAY.w, d: 2.4, r: 1 }, TRAY_FLOOR, TRAY_H, P, 3, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf({ x: TRAY.x, y: TRAY.y, w: 2.4, d: TRAY.d, r: 1 }, TRAY_FLOOR, TRAY_H, P, 3, 0.4), { tone: "mid" }));
  return out.join("");
}

function trayFront() {
  const out = [S(k.slabOf({ x: TRAY.x + TRAY.w - 2.4, y: TRAY.y, w: 2.4, d: TRAY.d, r: 1 }, TRAY_FLOOR, TRAY_H, P, 3, 0.4), { tone: "mid" })];
  const lip = { x: TRAY.x, y: TRAY.y + TRAY.d - 2.4, w: TRAY.w, d: 2.4, r: 1 };
  out.push(S(k.slabOf(lip, TRAY_FLOOR, TRAY_H, P, 3, 0.4), { tone: "mid" }));
  // The one engraved word in the drawing: what the tray is for.
  out.push(k.faceTextSvg(k.sideMatrix([TRAY.x + TRAY.w / 2, TRAY.y + TRAY.d], 3.2, P, "left"), "⌘V", { size: 4.4, tone: "lo", anchor: "middle" }));
  return out.join("");
}

/** Sheet j in the tray: a pasted copy lying flat, with the same capture printed on it. */
function sheet(j) {
  const plan = sheetAt(j);
  const z = TRAY_FLOOR + SHEET.t * j;
  const top = z + SHEET.t;
  const out = [S(k.slabOf(plan, z, SHEET.t, P, 2), { tone: "hi", crease: "lo" })];
  const win = { x: plan.x + 5, y: plan.y + 4, w: plan.w - 10, d: 24, r: 0.6 };
  out.push(L(k.planOutline(win, top, P, 2), { tone: "mid" }));
  out.push(L(k.lineOnTop([win.x, win.y + 4], [win.x + win.w, win.y + 4], top, P), { tone: "lo" }));
  out.push(L(k.lineOnTop([win.x, plan.y + 33], [win.x + 28, plan.y + 33], top, P), { tone: "lo", free: true }));
  return out.join("");
}

function stand() {
  const out = [`<path class="iso-halo" d="${k.haloOf(STAND, 0, 0.1, P)}" style="filter:blur(3px)"/>`];
  out.push(S(k.slabOf(STAND, 0, 8, P, 4, 0.8), { tone: "mid" }));
  out.push(D(k.corners(STAND, 4).map(([x, y]) => at([x, y, 8])), { size: 0.45 }));
  out.push(S(k.cylinder(POST[0], POST[1], 5.2, 8, 4, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(POST[0], POST[1], 3.4, 12, ARM_Z - 12, P, 28), { tone: "mid", crease: "none" }));
  out.push(L([40, 70].map((z) => k.sideArc(POST[0], POST[1], 3.4, z, P, 16)).join(""), { tone: "faint" }));
  out.push(S(k.slabOf(ARM, ARM_Z, 4, P, 3, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf({ x: POST[0] - 6, y: POST[1] - 6, w: 12, d: 12, r: 2.4 }, ARM_Z - 4, 12, P, 4, 0.6), { tone: "mid" }));
  out.push(S(k.cylinder(POST[0] + 8, POST[1], 2.4, ARM_Z + 1, 5, P, 18), { tone: "mid" }));
  out.push(L(k.knurl(POST[0] + 8, POST[1], 2.4, ARM_Z + 1, ARM_Z + 6, 16, P), { tone: "lo" }));
  return out.join("");
}

/** The camera head over the front slot: an iris on its face and the shutter button on top. */
function head() {
  const face = HEAD.y + HEAD.d;
  const out = [S(k.slabOf(HEAD, HEAD_Z, ARM_Z - HEAD_Z, P, 4, 0.8), { tone: "mid" })];
  const centre = [HEAD.x + HEAD.w / 2, face, HEAD_Z + 5];
  out.push(L(k.sideRing(centre, 4.2, "y", P, 32), { tone: "mid" }));
  out.push(L(k.sideRing(centre, 1.6, "y", P, 16), { tone: "lo" }));
  const blades = [];
  for (let n = 0; n < 6; n++) {
    const a = (n / 6) * Math.PI * 2;
    blades.push(k.segment([centre[0] + 1.6 * Math.cos(a), face, centre[2] + 1.6 * Math.sin(a)], [centre[0] + 4.2 * Math.cos(a + 0.7), face, centre[2] + 4.2 * Math.sin(a + 0.7)], P));
  }
  out.push(L(blades.join(""), { tone: "faint" }));
  out.push(`<g data-part="shutter">${S(k.cylinder(HEAD.x + 8, HEAD.y + 7, 2.6, ARM_Z, 3, P, 18), { tone: "mid" })}</g>`);
  out.push(L(k.knurl(HEAD.x + 8, HEAD.y + 7, 2.6, ARM_Z, ARM_Z + 3, 16, P), { tone: "lo" }));
  return out.join("");
}

const cards = SLOTS.map((_, i) => `<g data-card="${i}">${card(i)}</g>`).join("");
const copies = SLOTS.map((_, i) => `<g data-copy="${i}" style="opacity:0">${card(i)}</g>`).join("");
const sheets = SLOTS.map((_, j) => `<g data-sheet="${j}" style="opacity:0">${sheet(j)}</g>`).join("");

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "Uma gaveta de fichário numa bancada. Uma câmera num suporte solta cada print novo como uma ficha na frente da gaveta. Um bloco separador desliza entre as fichas: as que ficam na frente dele sobem, e são as escolhidas. Um clique manda cópias de todas elas, de uma vez, para a bandeja do ⌘V na frente da bancada.",
  body: [
    bench(),
    rails(),
    drawerBack(),
    `<g data-part="cards">${cards}<g data-part="follower">${follower()}</g></g>`,
    drawerSide(),
    drawerFront(),
    trayBack(),
    `<g data-part="sheets">${sheets}</g>`,
    `<g data-part="copies">${copies}</g>`,
    trayFront(),
    stand(),
    head(),
  ],
});

const TOPS = SLOTS.map((y) => at([CARD_X + CARD_W / 2, y + CARD_T / 2, CARD_TOP]));

const live = `
const P = ${JSON.stringify(P)};
const N = ${N}, LIFT = ${LIFT}, DROP = ${DROP}, FIRST = ${FIRST}, GAP = ${GAP};
const SLOTS = ${JSON.stringify(SLOTS)};
const TOPS = ${JSON.stringify(TOPS)};
const LAND_Y = ${LAND_Y};
const followerY = ${followerY.toString()};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const layer = svg.querySelector('[data-part="cards"]');
const cards = [...layer.querySelectorAll("[data-card]")];
const follower = layer.querySelector('[data-part="follower"]');
const copies = [...svg.querySelectorAll("[data-copy]")];
const sheets = [...svg.querySelectorAll("[data-sheet]")];
const shutter = svg.querySelector('[data-part="shutter"] .iso-solid');
const readout = document.querySelector("[data-readout]");
if (matchMedia("(hover: none)").matches) document.querySelector('[data-corner="hint"]').textContent = "Toque nas fichas para colar";
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// The model: how many cards are chosen, from the front.
let chosen = 0;
const lifts = cards.map(() => ({ at: 0, rate: 0 }));
let fy = followerY(0);
let paste = null;   // { start, ids } while copies fly to the tray
let drop = null;    // { start } while a new card falls from the camera
let frame = 0, last = 0, visible = false, touring = !still.matches, step = 0, stepAt = 0, dropped = false;

const picked = (i) => i >= N - chosen;
const say = () => {
  let text;
  if (drop) text = "print novo na gaveta";
  else if (paste) text = "colando " + paste.ids.length + (paste.ids.length === 1 ? " print" : " prints") + " de uma vez";
  else if (chosen === 0) text = "nenhuma ficha escolhida";
  else if (chosen === 1) text = "1 ficha · ⌘V cola 1";
  else text = chosen + " fichas · um ⌘V cola as " + chosen;
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(chosen));
  stage.setAttribute("aria-valuetext", text);
};

function startPaste() {
  if (paste || chosen === 0) return;
  paste = { start: performance.now(), ids: cards.map((_, i) => i).filter(picked) };
  run();
}

function startDrop() {
  drop = { start: performance.now() };
  lifts[N - 1].at = DROP;
  lifts[N - 1].rate = 0;
  run();
}

/** Keeps the follower painted between the cards behind it and the ones in front. */
function order() {
  const next = cards.find((_, i) => SLOTS[i] > fy) || null;
  if (follower.nextSibling !== next) layer.insertBefore(follower, next);
}

function draw(now) {
  cards.forEach((el, i) => {
    el.setAttribute("transform", translateAlong(P, [0, 0, lifts[i].at]));
    const on = picked(i) || (drop && i === N - 1);
    el.querySelectorAll(".iso-solid").forEach((s) => (on ? s.setAttribute("data-lit", "") : s.removeAttribute("data-lit")));
  });
  follower.setAttribute("transform", translateAlong(P, [0, fy - followerY(0), 0]));
  order();
  if (shutter) (drop ? shutter.setAttribute("data-lit", "") : shutter.removeAttribute("data-lit"));
  // The copies fly forward over the drawer's front and fade as they reach the
  // tray, where they land as a stack of sheets: one paste, every card.
  const time = paste ? (still.matches ? 1.2 : (now - paste.start) / 1000) : 0;
  copies.forEach((el, i) => {
    if (!paste || !paste.ids.includes(i) || still.matches) { el.style.opacity = "0"; return; }
    const t = clamp(time / 1.0, 0, 1);
    const along = ease(clamp(t / 0.7, 0, 1));
    const down = ease(clamp((t - 0.6) / 0.4, 0, 1));
    el.setAttribute("transform", translateAlong(P, [0, (LAND_Y - SLOTS[i]) * along, LIFT - 22 * down]));
    el.style.opacity = String(clamp(1 - (t - 0.75) / 0.25, 0, 1));
  });
  sheets.forEach((el, j) => {
    if (!paste || j >= paste.ids.length) { el.style.opacity = "0"; return; }
    const arrive = clamp((time - 0.8 - j * 0.07) / 0.3, 0, 1);
    const leave = clamp((time - 2.5) / 0.4, 0, 1);
    el.setAttribute("transform", translateAlong(P, [0, 0, 8 * (1 - ease(arrive))]));
    el.style.opacity = String(arrive * (1 - leave));
  });
  say();
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) tour(now);
  // each card rises on a spring when chosen; the new one falls from the camera
  lifts.forEach((lift, i) => {
    const want = picked(i) ? LIFT : 0;
    if (calm) { lift.at = want; lift.rate = 0; return; }
    for (let s = 0; s < 4; s++) { lift.rate += ((want - lift.at) * 170 - lift.rate * 20) * dt / 4; lift.at += lift.rate * dt / 4; }
    if (Math.abs(want - lift.at) < 0.01 && Math.abs(lift.rate) < 0.01) { lift.at = want; lift.rate = 0; }
  });
  const fyWant = followerY(chosen);
  fy = calm ? fyWant : fy + (fyWant - fy) * (1 - Math.exp(-dt / 0.22));
  if (Math.abs(fyWant - fy) < 0.01) fy = fyWant;
  if (drop && (calm || now - drop.start > 1100)) drop = null;
  if (paste && now - paste.start > 3000) paste = null;
  draw(now);
  const settled = !touring && !paste && !drop && fy === fyWant && lifts.every((l) => l.rate === 0);
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}

// The idle tour: a print arrives, then a few choices, each pasted. It runs
// once, the first time the figure is seen, and then the figure rests.
const STEPS = [3, "paste", 1, 5, "paste", 2, "paste", 0];
function tour(now) {
  if (!dropped) { dropped = true; startDrop(); stepAt = now + 1500; return; }
  if (paste || now < stepAt) return;
  if (step === STEPS.length) { touring = false; return; }
  const s = STEPS[step];
  step += 1;
  if (s === "paste") { startPaste(); stepAt = now + 3000; }
  else { chosen = s; stepAt = now + 2000; }
}

const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
// A hand, or a key, ends the tour for good: from then on the figure is theirs.
const hold = () => { touring = false; run(); };
const choose = (n) => { chosen = clamp(n, 0, N); hold(); };

new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);

// The card top nearest the pointer chooses it and every card in front of it.
// A finger has no hover, so on touch the press chooses and the click pastes.
const pick = (event) => {
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
  let best = -1, near = 46;
  TOPS.forEach(([x, y], i) => { const d = Math.hypot(point.x - x, point.y - (y - 12)); if (d < near) { near = d; best = i; } });
  if (best >= 0) choose(N - best);
};
stage.addEventListener("pointermove", pick);
stage.addEventListener("pointerdown", pick);
stage.addEventListener("click", () => { hold(); startPaste(); });
// Reaching the figure with Tab stops the tour too, so the keys start from a still drawer.
stage.addEventListener("focus", hold);
stage.addEventListener("keydown", (event) => {
  let to = null;
  if (event.key === "ArrowLeft" || event.key === "ArrowUp") to = chosen + 1;
  if (event.key === "ArrowRight" || event.key === "ArrowDown") to = chosen - 1;
  if (event.key === "Home") to = 0;
  if (event.key === "End") to = N;
  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); hold(); startPaste(); return; }
  if (to === null) return;
  event.preventDefault();
  choose(to);
});
if (still.matches) { touring = false; dropped = true; chosen = 3; }
draw(performance.now());
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Como a Gaveta funciona",
  hint: "Passe o mouse nas fichas · clique para colar",
  readout: "nenhuma ficha escolhida",
  keys: [
    { mark: "lit", label: "As fichas escolhidas: sobem juntas" },
    { mark: "raised", label: "As cópias que vão para o ⌘V" },
  ],
  caption:
    "Cada print vira uma ficha na frente da gaveta. O separador escolhe quantas fichas, da mais nova para trás, e um único ⌘V cola todas, na ordem em que foram tiradas. As fichas continuam na gaveta: colar copia, não tira.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Gaveta: setas escolhem quantas fichas, Enter cola todas" aria-valuemin="0" aria-valuemax="${N}" aria-valuenow="0">${svg}</div>`,
});

// The pieces the landing embeds: the card, the kit's styles and the live script.
if (theme === "light") {
  writeFileSync(join(HERE, "como-funciona.parts.json"), JSON.stringify({
    css: k.ISO_CSS,
    html: `<div class="iso" data-theme="light">${body}</div>`,
    script: kitScript() + live,
  }));
}

const name = theme === "light" ? "como-funciona-light.html" : "como-funciona.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "Como a Gaveta funciona", theme, body, script: kitScript() + live }));
console.log("wrote", name);
