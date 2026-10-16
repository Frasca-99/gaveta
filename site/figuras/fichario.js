/**
 * Fichário: a card catalog cabinet with its bottom drawer pulled out, and
 * seven index cards standing in the drawer, each holding a capture, the
 * newest at the front. The card under the pointer rises out of the drawer and
 * the others lean away from it, staggered outwards. The read-out says how long
 * ago that capture was taken. The slider is how high the card rises.
 *
 * The riffle pattern: discrete items, tweens, a stagger by distance, and a hit
 * test on static bands along the cards' resting top edges, so a card rising
 * out from under the pointer cannot flip the choice.
 */
const {
  Cam, clamp, facing, fillet, fit, hull, open, poly, prism, proj, put, rad, rings, ringAt, rrect, run, seg,
  solid, tdone, tset, tval, tween, disposer, mk, pointer, register,
} = HL;

const N = 7, W = 76, H = 46, G = 11, TW = 20, TH = 7, TABS = [6, 28, 50], TK = 1.4;
const REST = -12, BACK = -22, FWD = 18, STAG = 40;
const X0 = -6, X1 = W + 6, Y0 = -8, Y1 = (N - 1) * G + 9, WH = 18, WR = 5, WT = 2.4;
// The drawer's front, a board taller than its sides; the cabinet it came out of, behind it.
const FD = 5, FH = 30, CX0 = X0 - 4, CX1 = X1 + 4, CY0 = Y0 - 66, CY1 = Y0 - 6, CH = 96;
const HX = (X0 + X1) / 2;
const AGES = ["há 2 h", "há 40 min", "há 12 min", "há 5 min", "há 2 min", "há 1 min", "agora"];

/** A run of points ordered left to right on screen. */
const LR = (pts) => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());

/** The cabinet: a tall block whose face holds three drawer fronts, the foot one open where the drawer came out. */
function cabinet(P, front, g) {
  const [ring, inner] = rings(CX0, CY0, CX1, CY1, 5, 1.6);
  put(solid(g), prism(P, front, ring, inner, 0, CH));
  const face = (r) => poly(r.map((q) => P(q.u, CY1, q.v)));
  mk("path", { d: face(rrect(X0, 3, X1, 31, 3, 4)), class: "nf" }, g);
  mk("path", { d: face(rrect(X0 + 3, 6, X1 - 3, 28, 2, 4)), class: "nf lo" }, g);
  for (const z of [35, 66]) {
    mk("path", { d: face(rrect(X0, z, X1, z + 28, 3, 4)), class: "nf lo" }, g);
    mk("path", { d: face(rrect(HX - 11, z + 16, HX + 11, z + 23, 1.5, 4)), class: "nf lo" }, g);
    mk("path", { d: face(rrect(HX - 8, z + 6, HX + 8, z + 10, 2, 4)), class: "nf lo" }, g);
  }
}

/** The drawer's box, which never moves: `far` is painted before the cards, `near` after them; each entry is [d, class]. */
function tray(P, front, outer, inner) {
  const far = [
    [poly(hull(ringAt(P, outer, 0).concat(ringAt(P, outer, WH)))), "sil"],
    [poly(ringAt(P, inner, WH)), "nf"],
    [open(ringAt(P, run(inner, (q) => !front(q)), 2.5)), "nf lo"],
  ];
  const iF = LR(ringAt(P, run(inner, front), WH)), oT = LR(ringAt(P, run(outer, front), WH));
  const oB = LR(ringAt(P, run(outer, front), 0));
  const near = [
    [poly([...iF, oT[oT.length - 1], ...oB.slice().reverse(), oT[0]]), "fo"],
    [open(oT), "nf lo"],
    [open(iF), "nf"],
    [open([oT[0], ...oB, oT[oT.length - 1]]), "nf sil"],
  ];
  return { far, near };
}

/** The drawer's front: a board taller than the sides, with a label holder and a cup pull on its face. */
function drawerFront(P, front, g) {
  const [ring, inner] = rings(X0 - 2, Y1, X1 + 2, Y1 + FD, 2, 0.8);
  put(solid(g), prism(P, front, ring, inner, 0, FH));
  const face = (r) => poly(r.map((q) => P(q.u, Y1 + FD, q.v)));
  mk("path", { d: face(rrect(HX - 13, 17, HX + 13, 26, 1.5, 4)), class: "nf" }, g);
  mk("path", { d: face(rrect(HX - 11, 18.6, HX + 11, 24.4, 1, 4)), class: "nf lo" }, g);
  mk("path", { d: face(rrect(HX - 10, 6, HX + 10, 12, 3, 5)), class: "nf" }, g);
  mk("path", { d: face(rrect(HX - 8.4, 7.5, HX + 8.4, 10.5, 1.5, 5)), class: "nf lo" }, g);
}

/** Card i, back to front: its filleted outline, upright in its own plane, with its tab in one of three places. */
function card(i) {
  const t0 = TABS[i % 3];
  return fillet(
    [[0, 0], [W, 0], [W, H], [t0 + TW, H], [t0 + TW, H + TH], [t0, H + TH], [t0, H], [0, H]],
    [1, 1, 3.2, 1.8, 2.4, 2.4, 1.8, 3.2],
  );
}

/** Card i leaning th degrees (negative leans back) and lifted by `lift`: its outline, and the capture on its face. */
function pose(P, i, shape, th, lift) {
  const yb = i * G, s = Math.sin(rad(th)), c = Math.cos(rad(th));
  const w = (u, v) => P(u, yb + v * s, v * c + lift);
  const wb = (u, v) => P(u, yb + v * s - TK * c, v * c + TK * s + lift);
  return {
    back: poly(shape.map((p) => wb(p[0], p[1]))),
    face: poly(shape.map((p) => w(p[0], p[1]))),
    // the capture: a window, with its title bar, and a typed line under it
    shot: poly(rrect(8, 13, W - 8, H - 6, 1.6, 3).map((q) => w(q.u, q.v))),
    marks: seg(w(8, H - 11), w(W - 8, H - 11)) + seg(w(8, 7), w(36, 7)),
  };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let rise = value;

  // Fitted to the cabinet and to a card at its highest, so nothing leaves the frame in any pose.
  const C = Cam(45, 0.5, 1.45);
  fit(C, [[CX0, CY0, CH], [CX1, CY0, 0], [CX0, CY1, 0], [X0 - 2, Y1 + FD, 0], [X1 + 2, Y1 + FD, 0], [X1, Y1, H + TH + 34]], 200, 166);
  const P = proj(C), front = facing(C);
  const outer = rrect(X0, Y0, X1, Y1, WR, 6), inner = rrect(X0 + WT, Y0 + WT, X1 - WT, Y1 - WT, WR - WT, 6);
  const paths = tray(P, front, outer, inner);

  const g = mk("g", {}, svg);
  cabinet(P, front, g);
  for (const [d, cls] of paths.far) mk("path", { d, class: cls }, g);

  const cards = [];
  for (let i = 0; i < N; i++) {
    const grp = mk("g", {}, g);
    const back = mk("path", { class: "lo" }, grp), face = mk("path", { class: "sil" }, grp);
    const shot = mk("path", { class: "nf" }, grp), marks = mk("path", { class: "nf lo" }, grp);
    cards.push({ shape: card(i), back, face, shot, marks, a: tween(REST), z: tween(0) });
  }

  for (const [d, cls] of paths.near) mk("path", { d, class: cls }, g);
  drawerFront(P, front, g);

  // hit bands: oblique strips along the RESTING top edges. They never move, and nothing draws them.
  const top = (i) => P(W / 2, i * G + H * Math.sin(rad(REST)), H * Math.cos(rad(REST)));
  const c0 = top(0), c1 = top(1), d = [c1[0] - c0[0], c1[1] - c0[1]];
  const px0 = P(0, 0, 0), px1 = P(1, 0, 0), ex = [px1[0] - px0[0], px1[1] - px0[1]];
  const HALF = W / 2 + 6, det = d[0] * ex[1] - d[1] * ex[0];

  /** The card whose band holds the point, in the band's own (s, r) coordinates; -1 outside. */
  function hit([x, y]) {
    const qx = x - c0[0], qy = y - c0[1];
    const s = (qx * ex[1] - qy * ex[0]) / det, r = (d[0] * qy - d[1] * qx) / det;
    if (Math.abs(r) > HALF || s < -0.5 || s > N + 1) return -1;
    return clamp(Math.round(s), 0, N - 1);
  }

  function draw(i, th, lift) {
    const cd = cards[i], q = pose(P, i, cd.shape, th, lift);
    cd.back.setAttribute("d", q.back);
    cd.face.setAttribute("d", q.face);
    cd.shot.setAttribute("d", q.shot);
    cd.marks.setAttribute("d", q.marks);
  }

  const B = register(stage, (_dt, now) => {
    let moving = false;
    cards.forEach((cd, i) => { draw(i, tval(cd.a, now), tval(cd.z, now)); if (!tdone(cd.a, now) || !tdone(cd.z, now)) moving = true; });
    return moving;
  });
  bag.add(B.unregister);

  // At rest the newest capture, at the front, is where the eye starts.
  cards[N - 1].shot.classList.add("hi");

  let act = -1;
  /** Pulls card a (-1 puts them all back). The stagger spreads out from the card pulled, or the one let go. */
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act;
    act = a;
    cards.forEach((cd, i) => {
      const delay = Math.abs(i - from) * STAG;
      const th = a < 0 ? REST : i < a ? BACK : i > a ? FWD : 0;
      tset(cd.a, th, now, delay); tset(cd.z, a === i ? rise : 0, now, delay);
      cd.face.classList.toggle("hi", i === a);
      cd.shot.classList.toggle("hi", a < 0 ? i === N - 1 : i === a);
    });
    read.textContent = a < 0 ? "rest" : AGES[a];
    B.wake();
  }

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => {
      rise = v;
      if (act >= 0) { tset(cards[act].z, rise, performance.now(), 0); B.wake(); }
    },
    destroy: bag.dispose,
  };
}

hairline({
  name: "fichario",
  means: "Uma gaveta de fichário aberta: a ficha sob o ponteiro sobe com o seu print, e as outras se afastam em sequência.",
  rules: [1, 2, 5, 10],
  range: [10, 22, 34],
  tour: [[104, 180], [145, 162], [181, 150], null],
  mount,
});
