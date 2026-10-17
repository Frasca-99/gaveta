// The desk: windows that move, the capture bar, the drawer at the right edge
// with the app's own sizes, colours and timings, and a ticket to paste into.
// A print is a copy of the desk itself, cut to the rectangle you chose, so it
// shows exactly what you captured.
(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const finger = matchMedia("(hover: none)");

  const mesa = $("#mesa");
  const palco = $("#palco");
  // Every print holds a copy of the desk, dock and all: the real ones are kept here, never looked up again.
  const realDock = $("#palco > .dock");
  const menus = $("#menus");
  const voos = $("#voos");
  const aviso = $("#aviso");

  /** Says what just happened, for screen readers. */
  let avisoTimer = 0;
  function announce(text) {
    clearTimeout(avisoTimer);
    aviso.textContent = "";
    avisoTimer = setTimeout(() => { aviso.textContent = text; }, 60);
  }

  // ── motion ──────────────────────────────────────────────────────────────

  /** A CSS cubic-bezier as a function of time. */
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const curveX = (t) => ((ax * t + bx) * t + cx) * t;
    const curveY = (t) => ((ay * t + by) * t + cy) * t;
    const slope = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (x) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 8; i++) {
        const error = curveX(t) - x;
        const d = slope(t);
        if (Math.abs(error) < 1e-5 || Math.abs(d) < 1e-6) break;
        t -= error / d;
      }
      if (Math.abs(curveX(t) - x) > 1e-4) {
        let low = 0, high = 1;
        t = x;
        while (high - low > 1e-5) {
          if (curveX(t) < x) low = t; else high = t;
          t = (low + high) / 2;
        }
      }
      return curveY(t);
    };
  }
  const easeOut = bezier(0, 0, 0.58, 1);
  const easeInOut = bezier(0.42, 0, 0.58, 1);
  const flightEase = bezier(0.45, 0, 0.2, 1);
  const fallEase = bezier(0.55, 0, 0.9, 0.6);

  /** Interpolates keyframes the way Core Animation does: values at key times, each segment with its own easing. */
  function keyed(times, values, eases, t) {
    if (t <= times[0]) return values[0];
    for (let i = 0; i < times.length - 1; i++) {
      if (t <= times[i + 1] || i === times.length - 2) {
        const span = times[i + 1] - times[i];
        const local = span > 0 ? clamp((t - times[i]) / span, 0, 1) : 1;
        const eased = eases && eases[i] ? eases[i](local) : local;
        return lerp(values[i], values[i + 1], eased);
      }
    }
    return values[values.length - 1];
  }

  /** Runs `frame(t)` for t from 0 to 1 over `seconds`, after `delay` seconds. */
  function play(seconds, frame, done, delay = 0) {
    let start = 0;
    let raf = 0;
    const step = (now) => {
      if (!start) start = now + delay * 1000;
      const t = clamp((now - start) / (seconds * 1000), 0, 1);
      if (now >= start) frame(t);
      if (t < 1) raf = requestAnimationFrame(step);
      else if (done) done();
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }

  /** The app's SwiftUI springs, as CSS linear() curves where the browser has them. */
  function spring(response, damping) {
    const w = (2 * Math.PI) / response;
    const wd = w * Math.sqrt(1 - damping * damping);
    const x = (t) => 1 - Math.exp(-damping * w * t) * (Math.cos(wd * t) + ((damping * w) / wd) * Math.sin(wd * t));
    let end = 0.1;
    while (end < 2 && !(Math.abs(1 - x(end)) < 0.002 && Math.abs(1 - x(end + 0.05)) < 0.002)) end += 0.01;
    const points = [];
    for (let i = 0; i <= 48; i++) points.push(+x((i / 48) * end).toFixed(4));
    points[48] = 1;
    return { seconds: end, curve: `linear(${points.join(", ")})` };
  }
  if (window.CSS && CSS.supports("transition-timing-function", "linear(0, 1)")) {
    const drawer = spring(0.42, 0.8);
    const card = spring(0.34, 0.85);
    const style = document.documentElement.style;
    style.setProperty("--mola-gaveta", drawer.curve);
    style.setProperty("--dur-gaveta", `${drawer.seconds.toFixed(2)}s`);
    style.setProperty("--mola-ficha", card.curve);
    style.setProperty("--dur-ficha", `${card.seconds.toFixed(2)}s`);
  }

  // ── geometry ────────────────────────────────────────────────────────────

  const mesaBox = () => mesa.getBoundingClientRect();
  const narrow = () => mesaBox().width < 700;
  /** A rectangle on the screen, in the desk's own coordinates. */
  function onDesk(rect) {
    const m = mesaBox();
    return { x: rect.left - m.left, y: rect.top - m.top, w: rect.width, h: rect.height };
  }
  const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const shown = (el) => !el.hidden && el.getClientRects().length > 0;

  /**
   * Follows one pointer gesture on the whole window until it ends. A release
   * the page never saw (outside the window, or after the browser dropped the
   * capture) is caught by the next move with no button down, by the window
   * losing focus, or by the tab hiding: no gesture is ever left half done.
   */
  let gestureEnd = null;
  function gesture(pointerId, { move, up, cancel }) {
    if (gestureEnd) gestureEnd(true);
    const done = (cancelled, event) => {
      removeEventListener("pointermove", onMove, true);
      removeEventListener("pointerup", onUp, true);
      removeEventListener("pointercancel", onCancel, true);
      removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onBlur);
      gestureEnd = null;
      if (cancelled) cancel?.();
      else up(event);
    };
    const onMove = (event) => {
      if (event.pointerId !== pointerId) return;
      if (event.pointerType === "mouse" && event.buttons === 0) done(false, event);
      else move(event);
    };
    const onUp = (event) => { if (event.pointerId === pointerId) done(false, event); };
    const onCancel = (event) => { if (event.pointerId === pointerId) done(true); };
    const onBlur = () => done(true);
    addEventListener("pointermove", onMove, true);
    addEventListener("pointerup", onUp, true);
    addEventListener("pointercancel", onCancel, true);
    addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onBlur);
    gestureEnd = (cancelled) => done(cancelled);
  }

  // ── windows ─────────────────────────────────────────────────────────────

  const appName = $("#app-da-frente");
  const windows = $$(".janela, .ficha-uso");
  let stacking = 20;

  function activate(win) {
    for (const w of windows) w.classList.toggle("ativa", w === win);
    if (win) win.style.zIndex = String(++stacking);
    appName.textContent = win ? win.dataset.app || "Finder" : "Finder";
    updateDock();
  }

  function openWindow(win) {
    win.hidden = false;
    win.classList.add("aberta");
    activate(win);
  }

  function closeWindow(win) {
    win.classList.remove("aberta");
    if (win.classList.contains("previa")) win.hidden = true;
    else win.classList.add("fechada");
    if (win.classList.contains("ativa")) activate(null);
    updateDock();
  }

  function updateDock() {
    for (const button of $$("#palco > .dock > .dock-app[data-abre]")) {
      const win = document.getElementById(button.dataset.abre);
      button.classList.toggle("aberto", !!win && shown(win));
    }
  }

  // A window comes to the front when touched, and moves by its title bar.
  for (const win of windows) {
    win.addEventListener("pointerdown", () => activate(win));
    const handle = win.classList.contains("ficha-uso") ? win : $(".janela-barra", win);
    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.target.closest("button")) return;
      const tilted = win.classList.contains("ficha-uso");
      const box = tilted ? { x: win.offsetLeft, y: win.offsetTop } : onDesk(win.getBoundingClientRect());
      const startX = event.clientX, startY = event.clientY;
      let moved = false;
      try { handle.setPointerCapture(event.pointerId); } catch {}
      const move = (e) => {
        const dx = e.clientX - startX, dy = e.clientY - startY;
        if (!moved && Math.hypot(dx, dy) < 3) return;
        if (!moved) {
          moved = true;
          win.style.right = "auto";
          win.style.bottom = "auto";
          win.style.transform = tilted ? "rotate(-2.2deg)" : "none";
          win.style.margin = "0";
        }
        const m = mesaBox();
        const x = clamp(box.x + dx, -win.offsetWidth + 90, m.width - 90);
        const y = clamp(box.y + dy, parseFloat(getComputedStyle(mesa).getPropertyValue("--menus")) || 28, m.height - 40);
        win.style.left = `${x}px`;
        win.style.top = `${y}px`;
      };
      gesture(event.pointerId, { move, up: () => {}, cancel: () => {} });
    });
  }
  for (const button of $$("[data-fecha]")) {
    button.addEventListener("click", () => closeWindow(button.closest(".janela")));
  }
  palco.addEventListener("pointerdown", (event) => {
    if (event.target === palco || event.target.closest(".abertura")) activate(null);
  });

  for (const button of $$("#palco > .dock > .dock-app[data-abre]")) {
    button.addEventListener("click", () => {
      const win = document.getElementById(button.dataset.abre);
      if (!win) return;
      // the Trash opens and closes from the Dock, without going to its red button
      if (button === $("#lixo") && shown(win)) return closeWindow(win);
      win.classList.remove("fechada");
      openWindow(win);
    });
  }

  // Files on the desk: a click picks one, a double click opens it; a tap or a key opens it at once.
  for (const file of $$(".arquivo")) {
    const open = () => openWindow(document.getElementById(file.dataset.abre));
    file.addEventListener("click", (event) => {
      for (const other of $$("#palco > .arquivos > .arquivo, #palco > .solto")) other.classList.toggle("escolhido", other === file);
      if (event.detail === 0 || finger.matches) open();
    });
    file.addEventListener("dblclick", open);
  }

  // ── the menu bar ────────────────────────────────────────────────────────

  const relogio = $("#relogio");
  function tick() {
    const now = new Date();
    const day = new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(now);
    const month = new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(now);
    const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(now);
    relogio.textContent = `${day} ${now.getDate()} de ${month} ${time}`;
    relogio.dateTime = now.toISOString();
  }
  tick();
  setInterval(tick, 15000);

  const menuIcon = $("#icone-gaveta");
  const menuGaveta = $("#menu-gaveta");
  function showMenu(open) {
    menuGaveta.hidden = !open;
    menuIcon.setAttribute("aria-expanded", String(open));
    if (open) {
      const icon = onDesk(menuIcon.getBoundingClientRect());
      menuGaveta.style.left = `${clamp(icon.x - 8, 8, mesaBox().width - menuGaveta.offsetWidth - 8)}px`;
      $("[data-acao='alternar']", menuGaveta).firstChild.textContent = drawer.open ? "Fechar a gaveta " : "Abrir a gaveta ";
      $("[role='menuitem']", menuGaveta).focus({ preventScroll: true });
    }
  }
  menuIcon.addEventListener("click", () => showMenu(menuGaveta.hidden));
  $("[data-acao='alternar']", menuGaveta).addEventListener("click", () => {
    showMenu(false);
    toggleDrawer(true);
  });
  document.addEventListener("pointerdown", (event) => {
    if (!menuGaveta.hidden && !menuGaveta.contains(event.target) && !menuIcon.contains(event.target)) showMenu(false);
  });

  // ── the download: the zip comes straight from GitHub, and a card says how to open it the first time ──

  const install = $("#como-instalar");
  if (install.showPopover) {
    // under the buttons, wherever the opening stands at this width
    const placeInstall = () => {
      const buttons = $(".acoes").getBoundingClientRect();
      install.style.setProperty("--x", `${buttons.left + buttons.width / 2}px`);
      install.style.setProperty("--y", `${buttons.bottom + 12}px`);
    };
    install.addEventListener("beforetoggle", (event) => {
      if (event.newState === "open") placeInstall();
      else $("#como-instalar-baixando").hidden = true;
    });
    addEventListener("resize", () => { if (install.matches(":popover-open")) placeInstall(); });
    for (const link of $$("[data-baixar]")) {
      link.addEventListener("click", () => {
        if (!menuGaveta.hidden) showMenu(false);
        if (!install.matches(":popover-open")) install.showPopover();
        $("#como-instalar-baixando").hidden = false;
      });
    }
  } else {
    // without popovers the zip still downloads; the release page has the same steps
    const release = $(".como-instalar-nota a").href;
    install.remove();
    $(".nota-link").replaceWith(Object.assign(document.createElement("a"), { href: release, textContent: "Como instalar" }));
  }

  // ── prints ──────────────────────────────────────────────────────────────

  let serial = 0;
  /** Every print by id, also the ones thrown away, for the ones already copied or pasted. */
  const everyPrint = new Map();

  /** A copy of the desk, cut to `area`: only what stands in it, made inert. */
  function snapshot(area) {
    const desk = mesaBox();
    const copy = document.createElement("div");
    copy.className = "mesa-copia";
    copy.style.width = `${desk.width}px`;
    copy.style.height = `${desk.height}px`;
    copy.style.transform = `translate(${-area.x}px, ${-area.y}px)`;
    const floor = palco.cloneNode(false);
    floor.removeAttribute("id");
    copy.append(floor);
    for (const child of palco.children) {
      if (!shown(child)) continue;
      if (!overlaps(onDesk(child.getBoundingClientRect()), area)) continue;
      floor.append(inert(child.cloneNode(true)));
    }
    if (overlaps(onDesk(menus.getBoundingClientRect()), area)) copy.append(inert(menus.cloneNode(true)));
    const portrait = document.createElement("div");
    portrait.className = "retrato";
    portrait.style.width = `${area.w}px`;
    portrait.style.height = `${area.h}px`;
    portrait.append(copy);
    portrait.setAttribute("aria-hidden", "true");
    return portrait;
  }

  function inert(node) {
    for (const el of [node, ...node.querySelectorAll("*")]) {
      el.removeAttribute("id");
      el.removeAttribute("aria-live");
      if (el.matches("button, a, [tabindex]")) el.setAttribute("tabindex", "-1");
    }
    node.setAttribute("inert", "");
    return node;
  }

  const pad = (n) => String(n).padStart(2, "0");
  function makePrint(area, date = Date.now()) {
    const ratio = window.devicePixelRatio || 1;
    const when = new Date(date);
    const print = {
      id: ++serial,
      w: area.w,
      h: area.h,
      pixels: [Math.round(area.w * ratio), Math.round(area.h * ratio)],
      date,
      name: `Captura ${pad(when.getHours())}.${pad(when.getMinutes())}.${pad(when.getSeconds())}`,
      portrait: snapshot(area),
    };
    everyPrint.set(print.id, print);
    return print;
  }

  /** The print, drawn at `width` × `height` (fitted whole inside that box with `fit`). */
  function photo(print, width, height, fit = false) {
    const box = document.createElement("span");
    box.className = "foto";
    const scale = document.createElement("span");
    scale.className = "foto-escala";
    scale.append(print.portrait.cloneNode(true));
    box.append(scale);
    sizePhoto(box, print, width, height, fit);
    return box;
  }

  function sizePhoto(box, print, width, height, fit) {
    const k = fit ? Math.min(width / print.w, height / print.h) : width / print.w;
    const x = fit ? (width - print.w * k) / 2 : 0;
    const y = fit ? (height - print.h * k) / 2 : 0;
    box.style.width = `${width}px`;
    box.style.height = `${height}px`;
    box.firstElementChild.style.transform = `translate(${x}px, ${y}px) scale(${k})`;
  }

  /**
   * Writes a style, an attribute or a text only when it changes. A card that
   * did not move costs the browser nothing, and nothing set on a card is
   * inherited by the copy of the desk inside it.
   */
  const written = new WeakMap();
  function write(el, key, value) {
    let seen = written.get(el);
    if (!seen) written.set(el, (seen = {}));
    if (seen[key] === value) return;
    seen[key] = value;
    if (key === "text") el.textContent = value;
    else if (key.startsWith("aria-") || key.startsWith("data-")) el.setAttribute(key, value);
    else el.style[key] = value;
  }

  /** "agora", "há 5 min", "há 2 h", as the card's tab says it. */
  function ago(date) {
    const seconds = (Date.now() - date) / 1000;
    if (seconds < 60) return "agora";
    if (seconds < 3600) return `há ${Math.floor(seconds / 60)} min`;
    return `há ${Math.floor(seconds / 3600)} h`;
  }

  // ── the drawer: the layout from DrawerView and CardStack ─────────────────

  const L = { front: 58, box: 300, rail: 10, footer: 44, empty: 230, peek: 120, edge: 8, edgeTouch: 16 };
  const S = { left: 30, right: 14, border: 8, meta: 24, topInset: 26, bottomInset: 12, minReveal: 76, gap: 12, tabW: 74, tabH: 18, band: 150 };
  S.cardW = L.box - S.left - S.right;
  S.photoW = S.cardW - S.border * 2;
  S.photoH = Math.round((S.photoW * 10) / 16);
  S.cardH = S.border + S.photoH + S.meta;
  S.fullReveal = S.cardH + 4;
  S.tabX = S.cardW - S.tabW - 8;
  const drawerWidth = L.front + L.box;

  /** Where each card stands, back to front, and how much of it shows. */
  function stackOf(count, hovered, room) {
    const reveals = Array(count).fill(S.fullReveal);
    if (count > 1) {
      const behind = count - 1;
      let budget = room - S.topInset - S.cardH - S.bottomInset;
      for (let distance = 1; distance <= behind; distance++) {
        const index = count - 1 - distance;
        const kept = (behind - distance) * S.minReveal;
        const share = Math.min(S.fullReveal, Math.max(S.minReveal, budget - kept));
        reveals[index] = share;
        budget -= share;
      }
    }
    // A band opens up whole under the pointer; a card already whole stays put, so the stack never jiggles.
    if (hovered != null && hovered < count - 1 && reveals[hovered] < S.cardH) reveals[hovered] = S.cardH + S.gap;
    const tops = [];
    let y = S.topInset;
    for (const reveal of reveals) {
      tops.push(y);
      y += reveal;
    }
    return {
      tops,
      reveal: (i) => (i === count - 1 ? S.cardH : reveals[i]),
      height: count ? tops[count - 1] + S.cardH + S.bottomInset : 0,
    };
  }

  /** The whole capture, as large as the shown part of its card allows; never cropped. */
  function photoSize(print, reveal) {
    const whole = reveal >= S.cardH;
    const maxW = whole ? S.photoW : S.band;
    const maxH = whole ? S.photoH : Math.max(28, reveal - S.border - 4);
    const aspect = print.w / print.h || 16 / 10;
    let w = maxW, h = maxW / aspect;
    if (h > maxH) { h = maxH; w = maxH * aspect; }
    return { w: Math.round(w), h: Math.round(h) };
  }

  const shiftOf = (hovered, selected) => (selected ? (hovered ? -26 : -22) : hovered ? -10 : 0);

  const gaveta = $("#gaveta");
  const corpo = $("#gaveta-corpo");
  const pilha = $("#pilha");
  const fichas = $("#gaveta-fichas");
  const barra = $("#gaveta-barra");
  const conta = $("#conta");
  const borda = $("#borda");

  const drawer = {
    prints: [], // newest first
    open: false,
    pinned: false, // opened on purpose: stays open until closed on purpose
    peeking: false,
    hovered: null,
    selection: new Set(),
    copied: new Set(),
    dragging: new Set(),
    landing: new Set(),
    anchor: null,
  };
  const cards = new Map();
  const parts = new Map();
  let clipboard = [];
  let layout = stackOf(0, null, 0);
  let placement = { top: 0, height: L.empty };

  const backToFront = () => [...drawer.prints].reverse();
  const printOf = (id) => drawer.prints.find((p) => p.id === id);
  const selectedPrints = () => backToFront().filter((p) => drawer.selection.has(p.id));

  function maximum() {
    return Math.min(gaveta.clientHeight - 40, 900);
  }
  const stackRoom = () => maximum() - L.rail * 2 - L.footer;
  function drawerHeight(count, hovered) {
    if (!count) return L.empty;
    return L.rail * 2 + stackOf(count, hovered, stackRoom()).height + L.footer;
  }

  function slide() {
    if (drawer.open) return 0;
    if (drawer.peeking) return drawerWidth - L.peek;
    return drawerWidth - (finger.matches ? L.edgeTouch : L.edge);
  }

  const CHECK = '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9.5" fill="#007aff"/><path d="M5.8 10.3 8.6 13l5.6-6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const CROSS = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 2l6 6M8 2l-6 6" stroke="#fff" stroke-width="1.9" stroke-linecap="round"/></svg>';

  function cardFor(print) {
    let card = cards.get(print.id);
    if (card) return card;
    card = document.createElement("div");
    card.className = "ficha";
    card.setAttribute("role", "listitem");
    card.dataset.id = String(print.id);
    card.innerHTML = `<div class="ficha-papel"></div><div class="aba"></div>
      <span class="legenda legenda-inteira">Print · ${print.pixels[0]} × ${print.pixels[1]}</span>
      <span class="legenda legenda-faixa"><b>Print</b>${print.pixels[0]} × ${print.pixels[1]}</span>
      <button class="ficha-botao" type="button" tabindex="-1" aria-describedby="gaveta-teclas"></button>
      <span class="bolinha" aria-hidden="true">${CHECK}</span>
      <span class="fechar" aria-hidden="true">${CROSS}</span>
      <span class="carimbo" aria-hidden="true">COPIADO</span>`;
    const whole = photoSize(print, S.cardH);
    const box = photo(print, whole.w, whole.h);
    card.insertBefore(box, $(".legenda", card));
    // Under a whole picture one line, beside a band two: the two captions cross-fade, as in the app.
    $(".legenda-inteira", card).style.transform = `translate(${S.border}px, ${S.border + whole.h + 6}px)`;
    parts.set(print.id, {
      whole, foto: box, aba: $(".aba", card), botao: $(".ficha-botao", card), carimbo: $(".carimbo", card),
    });
    cards.set(print.id, card);
    return card;
  }

  function render() {
    const list = backToFront();
    const count = list.length;
    const hoveredIndex = drawer.hovered == null ? -1 : list.findIndex((p) => p.id === drawer.hovered);
    layout = stackOf(count, hoveredIndex >= 0 ? hoveredIndex : null, stackRoom());

    gaveta.classList.toggle("vazia", count === 0);
    gaveta.classList.toggle("escolhendo", drawer.selection.size > 0);
    gaveta.classList.toggle("tocar", finger.matches);
    write(gaveta, "data-estado", drawer.open ? "aberta" : drawer.peeking ? "fresta" : "fechada");
    write(conta, "text", String(count));

    // Centred for its height at rest; a card opening up under the pointer grows it downwards only.
    const available = gaveta.clientHeight;
    const max = maximum();
    const rest = Math.min(drawerHeight(count, null), max);
    const region = (available - max) / 2;
    const top = region + (max - rest) / 2;
    const current = drawerHeight(count, hoveredIndex >= 0 ? hoveredIndex : null);
    placement = { top: Math.round(top), height: Math.round(Math.min(current, max - (top - region))) };
    write(corpo, "top", `${placement.top}px`);
    write(corpo, "height", `${placement.height}px`);
    write(corpo, "transform", `translateX(${slide()}px)`);
    write(pilha, "height", `${layout.height}px`);

    list.forEach((print, i) => {
      // A print in flight has its place kept, but its card is built only when it lands.
      if (drawer.landing.has(print.id) && !cards.has(print.id)) return;
      const card = cardFor(print);
      if (!card.parentNode) {
        // in order, back to front, so the newer card paints over the older
        const after = list.slice(i + 1).map((p) => cards.get(p.id)).find((c) => c && c.parentNode);
        pilha.insertBefore(card, after || null);
      }
      const part = parts.get(print.id);
      const reveal = layout.reveal(i);
      const whole = reveal >= S.cardH;
      const selected = drawer.selection.has(print.id);
      const hovered = drawer.hovered === print.id && !drawer.dragging.size;
      // The picture is laid out whole once; in a band it is the same picture, scaled down: only transforms move.
      const size = whole ? part.whole : photoSize(print, reveal);
      const slot = whole ? S.photoW : S.band;
      write(card, "transform", `translate(${S.left + shiftOf(hovered, selected)}px, ${layout.tops[i]}px)`);
      write(part.foto, "transform", `translate(${S.border + (slot - size.w) / 2}px, ${S.border}px) scale(${size.w / part.whole.w})`);
      write(part.carimbo, "left", `${S.border + slot / 2}px`);
      write(part.carimbo, "top", `${S.border + size.h / 2}px`);
      write(card, "zIndex", String(i + 1));
      card.classList.toggle("faixa", !whole);
      card.classList.toggle("pairando", hovered);
      card.classList.toggle("escolhida", selected);
      card.classList.toggle("copiada", drawer.copied.has(print.id));
      card.classList.toggle("arrastando", drawer.dragging.has(print.id));
      card.classList.toggle("oculta", drawer.landing.has(print.id));
      write(part.aba, "text", ago(print.date));
      write(part.botao, "aria-label", `Print de ${ago(print.date)}, ${print.pixels[0]} por ${print.pixels[1]}${selected ? ", escolhido" : ""}`);
    });
    for (const [id, card] of cards) {
      if (!printOf(id)) {
        card.remove();
        cards.delete(id);
        parts.delete(id);
      }
    }
    rovingFocus();
    renderBar();
    guide.update();
  }

  /** The selection bar: with nothing chosen it offers to choose everything; with some, to copy them. */
  function renderBar() {
    const count = drawer.selection.size;
    const total = drawer.prints.length;
    const key = `${count}/${total}`;
    if (barra.dataset.chave === key) return;
    barra.dataset.chave = key;
    if (count === 0) {
      barra.innerHTML = total > 1
        ? `<button class="pilula" type="button" data-acao="todos">${CIRCLE}Selecionar todos</button><span class="espaco"></span><span class="dica">${finger.matches ? "ou toque nos círculos" : "⌘-clique seleciona vários"}</span>`
        : `<span class="dica">Clique para copiar</span><span class="espaco"></span>`;
    } else {
      barra.innerHTML = `<span class="quantos">${count} de ${total}</span><span class="espaco"></span>
        ${count < total ? `<button class="pilula" type="button" data-acao="todos">${CIRCLE}Todos</button>` : ""}
        <button class="pilula principal" type="button" data-acao="copiar">${COPY}${count === 1 ? "Copiar" : "Copiar todos"}</button>
        <button class="pilula so-icone" type="button" data-acao="limpar" aria-label="Limpar seleção" title="Limpar seleção">${SMALL_CROSS}</button>`;
    }
  }
  const CIRCLE = '<svg viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.9" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M3.8 6.1 5.3 7.6 8.3 4.5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const COPY = '<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="3.6" y="3.6" width="6.4" height="6.9" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M2 8V2.6A.9.9 0 0 1 2.9 1.7h4.6" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';
  const SMALL_CROSS = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3 3 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

  barra.addEventListener("click", (event) => {
    const action = event.target.closest("[data-acao]")?.dataset.acao;
    if (action === "todos") selectAll();
    if (action === "copiar") copySelection();
    if (action === "limpar") clearSelection();
  });

  // ── opening and closing ─────────────────────────────────────────────────

  let peekTimer = 0;
  let awayTimer = 0;
  let dwellTimer = 0;

  function openDrawer(pinned = false) {
    clearTimeout(peekTimer);
    drawer.peeking = false;
    drawer.pinned = drawer.pinned || pinned;
    if (!drawer.open) {
      drawer.open = true;
      render();
      fichas.scrollTop = fichas.scrollHeight;
      guide.drawerOpened();
    } else {
      render();
    }
  }

  function closeDrawer() {
    if (!drawer.open && !drawer.peeking) return;
    drawer.open = false;
    drawer.pinned = false;
    drawer.peeking = false;
    drawer.hovered = null;
    clearSelection(false);
    render();
  }

  function toggleDrawer(pinned) {
    if (drawer.open) closeDrawer();
    else openDrawer(pinned);
  }

  function peek() {
    if (drawer.open) return;
    drawer.peeking = true;
    clearTimeout(peekTimer);
    render();
    fichas.scrollTop = fichas.scrollHeight;
  }

  function endPeekSoon() {
    clearTimeout(peekTimer);
    peekTimer = setTimeout(() => {
      if (!drawer.peeking) return;
      drawer.peeking = false;
      render();
    }, 1800);
  }

  /** Slides the drawer back in a moment from now, unless the pointer is back on it by then. Only one is ever pending. */
  function closeSoon() {
    clearTimeout(awayTimer);
    awayTimer = setTimeout(() => {
      if (drawer.dragging.size || pointerOnDrawer()) return;
      closeDrawer();
    }, 450);
  }

  // Where the pointer really is: :hover lags behind after a captured drag, this does not.
  const lastPointer = { x: -1, y: -1, mouse: false };
  for (const type of ["pointermove", "pointerdown", "pointerup"]) {
    addEventListener(type, (event) => {
      lastPointer.x = event.clientX;
      lastPointer.y = event.clientY;
      lastPointer.mouse = event.pointerType === "mouse";
    }, true);
  }
  function pointerOnDrawer() {
    if (!lastPointer.mouse) return false;
    const box = corpo.getBoundingClientRect();
    return lastPointer.x >= box.left - 24 && lastPointer.y >= box.top - 24 && lastPointer.y <= box.bottom + 24;
  }

  // The pointer resting on the right edge opens it, like the app's edge trigger.
  const startDwell = () => {
    if (drawer.open || dwellTimer) return;
    dwellTimer = setTimeout(() => {
      dwellTimer = 0;
      openDrawer();
    }, 200);
  };
  const stopDwell = () => {
    clearTimeout(dwellTimer);
    dwellTimer = 0;
  };
  // Resting on the edge counts even if the pointer got there while the drawer was still out.
  for (const edge of [borda, corpo]) {
    edge.addEventListener("pointermove", (event) => {
      if (event.pointerType === "mouse" && !drawer.open && !press) startDwell();
    });
  }
  borda.addEventListener("pointerenter", (event) => { if (event.pointerType === "mouse") startDwell(); });
  borda.addEventListener("pointerleave", stopDwell);
  corpo.addEventListener("pointerenter", (event) => {
    clearTimeout(awayTimer);
    if (event.pointerType === "mouse" && !drawer.open) startDwell();
  });
  corpo.addEventListener("pointerleave", (event) => {
    stopDwell();
    if (event.pointerType !== "mouse" || !drawer.open || drawer.pinned || drawer.dragging.size) return;
    if (gaveta.contains(document.activeElement) && document.activeElement !== document.body) return;
    closeSoon();
  });
  // A finger opens it with a tap on the oak, and closes it with a tap anywhere else.
  corpo.addEventListener("click", (event) => {
    if (!drawer.open && event.target.closest(".frente, .gaveta-corpo")) openDrawer(true);
  });
  document.addEventListener("pointerdown", (event) => {
    if (!drawer.open || event.pointerType === "mouse") return;
    if (corpo.contains(event.target) || event.target.closest(".menus, .menu-gaveta")) return;
    closeDrawer();
  });
  gaveta.addEventListener("focusin", () => { if (!drawer.open) openDrawer(true); });

  // ── the cards under the pointer: tested against where they are headed, never where an animation has them ──

  function hitTest(clientX, clientY) {
    const box = pilha.getBoundingClientRect();
    const x = clientX - box.left, y = clientY - box.top;
    const list = backToFront();
    for (let i = list.length - 1; i >= 0; i--) {
      const print = list[i];
      const x0 = S.left + shiftOf(drawer.hovered === print.id, drawer.selection.has(print.id));
      const y0 = layout.tops[i];
      if (x >= x0 && x < x0 + S.cardW && y >= y0 && y < y0 + S.cardH) {
        const lx = x - x0, ly = y - y0;
        if (lx >= 4 && lx < 42 && ly >= 4 && ly < 42) return { print, part: "bolinha" };
        if (lx >= S.cardW - 42 && lx < S.cardW - 4 && ly >= 4 && ly < 42) return { print, part: "fechar" };
        return { print, part: "ficha" };
      }
      const tx = x0 + S.tabX, ty = y0 - S.tabH;
      if (x >= tx && x < tx + S.tabW && y >= ty && y < y0) return { print, part: "ficha" };
    }
    const hovered = list.findIndex((p) => p.id === drawer.hovered);
    if (hovered >= 0 && hovered < list.length - 1) {
      const x0 = S.left + shiftOf(true, drawer.selection.has(drawer.hovered));
      const bottom = layout.tops[hovered] + S.cardH;
      const gap = layout.reveal(hovered) - S.cardH;
      if (x >= x0 && x < x0 + S.cardW && y >= bottom && y < bottom + gap) return { print: list[hovered], part: "ficha" };
    }
    return null;
  }

  function setHovered(id) {
    if (drawer.hovered === id) return;
    drawer.hovered = id;
    render();
  }

  let press = null;
  let lastClick = { id: 0, at: 0 };

  pilha.addEventListener("pointermove", (event) => {
    if (press) return;
    if (event.pointerType === "mouse") setHovered(hitTest(event.clientX, event.clientY)?.print.id ?? null);
  });
  pilha.addEventListener("pointerleave", (event) => {
    if (!press && event.pointerType === "mouse") setHovered(null);
  });
  pilha.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const hit = hitTest(event.clientX, event.clientY);
    if (!hit) return;
    endPress();
    press = { hit, pointerId: event.pointerId, x: event.clientX, y: event.clientY, dragging: false, event };
    try { pilha.setPointerCapture(event.pointerId); } catch {}
    // The gesture is followed on the whole window, so it ends even if the browser lets go of the capture.
    gesture(event.pointerId, { move: pressMove, up: pressUp, cancel: endPress });
    // no text selection or native drag of a picture inside the card can steal the gesture
    event.preventDefault();
  });

  function pressMove(event) {
    if (press) followPress(event);
  }
  function pressUp(event) {
    if (!press) return;
    const current = press;
    press = null;
    if (current.dragging) {
      endDrag(event);
      return;
    }
    // a press that moved is never a click: letting go over the cross must not throw the card away
    if (Math.hypot(event.clientX - current.x, event.clientY - current.y) >= 5) return;
    clickCard(current.hit, current.event);
  }
  /** Drops whatever gesture is half done: its ghost, the dimmed cards. */
  function endPress() {
    if (press?.dragging || drag) cancelDrag();
    press = null;
  }
  // nothing in the drawer is dragged by the browser itself
  gaveta.addEventListener("dragstart", (event) => event.preventDefault());

  function clickCard({ print, part }, event) {
    const marks = drawer.hovered === print.id || finger.matches;
    if (part === "fechar" && marks) {
      discard([print.id], true);
      return;
    }
    if ((part === "bolinha" && (marks || drawer.selection.size)) || event.metaKey || event.ctrlKey) {
      toggleSelection(print.id);
      return;
    }
    if (event.shiftKey) {
      extendSelection(print.id);
      return;
    }
    const now = performance.now();
    if (lastClick.id === print.id && now - lastClick.at < 400) {
      lastClick = { id: 0, at: 0 };
      showPrint(print);
      return;
    }
    lastClick = { id: print.id, at: now };
    copy(print.id);
  }

  // ── choosing and copying ────────────────────────────────────────────────

  function toggleSelection(id) {
    if (drawer.selection.has(id)) drawer.selection.delete(id);
    else drawer.selection.add(id);
    drawer.anchor = id;
    render();
    guide.update();
  }

  function extendSelection(id) {
    const list = drawer.prints;
    const from = list.findIndex((p) => p.id === drawer.anchor);
    const to = list.findIndex((p) => p.id === id);
    if (from < 0 || to < 0) {
      toggleSelection(id);
      return;
    }
    for (const p of list.slice(Math.min(from, to), Math.max(from, to) + 1)) drawer.selection.add(p.id);
    render();
    guide.update();
  }

  function selectAll() {
    for (const p of drawer.prints) drawer.selection.add(p.id);
    render();
    guide.update();
    announce(`${drawer.prints.length} prints escolhidos.`);
  }

  function clearSelection(redraw = true) {
    drawer.selection.clear();
    drawer.anchor = null;
    if (redraw) render();
  }

  let copiedTimer = 0;
  function copy(id) {
    if (drawer.selection.size > 1 && drawer.selection.has(id)) {
      copySelection();
      return;
    }
    clearSelection(false);
    copyPrints([printOf(id)]);
  }

  function copySelection() {
    copyPrints(selectedPrints());
  }

  /** One item per capture, oldest first, so a single ⌘V pastes them in the order they were taken. */
  function copyPrints(prints) {
    if (!prints.length) return;
    clipboard = prints.map((p) => p.id);
    drawer.copied = new Set(clipboard);
    render();
    clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => {
      drawer.copied.clear();
      render();
    }, 1200);
    updatePaste();
    // On a phone the open drawer covers the desk: once the stamp is down it slides away and the ticket comes up.
    if (narrow()) {
      setTimeout(() => {
        closeDrawer();
        chamado.classList.remove("fechada");
        openWindow(chamado);
      }, 700);
    }
    const one = prints.length === 1;
    announce(one ? "Print copiado. Cole no chamado com ⌘V." : `${prints.length} prints copiados. Um ⌘V no chamado cola todos.`);
    guide.update();
  }

  // ── throwing away ───────────────────────────────────────────────────────

  const lixo = $("#lixo");

  function discard(ids, thrown) {
    ids.forEach((id, order) => {
      const print = printOf(id);
      if (!print) return;
      trash.unshift(print);
      if (thrown && order < 6 && !still.matches) toss(print, order * 0.05);
      drawer.prints = drawer.prints.filter((p) => p.id !== id);
      drawer.selection.delete(id);
      drawer.copied.delete(id);
      if (drawer.hovered === id) drawer.hovered = null;
    });
    render();
    renderTrash();
    announce(ids.length === 1 ? "Print jogado no Lixo." : `${ids.length} prints jogados no Lixo.`);
  }

  // The Trash keeps what was thrown away, as the Mac's does: a print can go back, until it is emptied.
  const trash = [];
  const lixeira = $("#lixeira");
  const lixeiraLista = $("#lixeira-lista");
  const lixeiraRodape = $("#lixeira-rodape");
  const esvaziar = $("#esvaziar");

  function renderTrash() {
    lixo.classList.toggle("cheio", trash.length > 0);
    lixo.setAttribute("aria-label", trash.length ? `Lixo, ${trash.length === 1 ? "1 print" : `${trash.length} prints`}` : "Lixo, vazio");
    esvaziar.disabled = trash.length === 0;
    lixeiraRodape.textContent = trash.length === 0 ? "" : trash.length === 1 ? "1 item" : `${trash.length} itens`;
    const rows = new Map([...lixeiraLista.children].map((row) => [Number(row.dataset.id), row]));
    for (const [id, row] of rows) if (!trash.some((p) => p.id === id) && !row.classList.contains("saindo")) row.remove();
    trash.forEach((print, index) => {
      let row = rows.get(print.id);
      if (!row) {
        row = document.createElement("li");
        row.dataset.id = String(print.id);
        const name = document.createElement("span");
        name.className = "lixeira-nome";
        name.textContent = `${print.name}.png`;
        const size = document.createElement("small");
        size.textContent = `${print.pixels[0]} × ${print.pixels[1]}`;
        name.append(size);
        const back = document.createElement("button");
        back.type = "button";
        back.className = "lixeira-devolver";
        back.textContent = "Devolver";
        back.setAttribute("aria-label", `Devolver ${print.name}.png para a gaveta`);
        back.addEventListener("click", () => putBack(print, row));
        row.append(photo(print, 56, 40, true), name, back);
      }
      if (lixeiraLista.children[index] !== row) lixeiraLista.insertBefore(row, lixeiraLista.children[index] || null);
    });
  }

  /** Back from the Trash into the drawer, in its place by date, and the drawer peeks to show it arrived. */
  function putBack(print, row) {
    const at = trash.indexOf(print);
    if (at < 0) return;
    trash.splice(at, 1);
    const next = row.nextElementSibling?.querySelector(".lixeira-devolver") || row.previousElementSibling?.querySelector(".lixeira-devolver");
    const leave = () => { row.remove(); renderTrash(); };
    if (still.matches) leave();
    else {
      row.classList.add("saindo");
      setTimeout(leave, 240);
    }
    if (row.contains(document.activeElement)) (next || esvaziar).focus({ preventScroll: true });
    drawer.prints.push(print);
    drawer.prints.sort((a, b) => b.date - a.date);
    if (!drawer.open) peek();
    render();
    if (!drawer.open) endPeekSoon();
    announce("Print de volta na gaveta.");
    guide.update();
    renderTrash();
  }

  esvaziar.addEventListener("click", () => {
    if (!trash.length) return;
    const count = trash.length;
    trash.length = 0;
    for (const row of lixeiraLista.children) row.classList.add("saindo");
    setTimeout(() => { lixeiraLista.replaceChildren(); renderTrash(); }, still.matches ? 0 : 240);
    renderTrash();
    announce(count === 1 ? "Lixo esvaziado: 1 print apagado." : `Lixo esvaziado: ${count} prints apagados.`);
  });

  /** A card standing whole, for the flights: its paper, shadow, picture and words, each on its own layer. */
  function cardFace(print) {
    const face = document.createElement("div");
    face.className = "voo";
    face.innerHTML = `<div class="voo-sombra"></div><div class="voo-papel"></div><div class="aba">${ago(print.date)}</div>
      <span class="legenda">Print · ${print.pixels[0]} × ${print.pixels[1]}</span>`;
    const size = photoSize(print, S.cardH);
    const box = photo(print, size.w, size.h);
    box.style.transform = `translate(${S.border + (S.photoW - size.w) / 2}px, ${S.border}px)`;
    $(".voo-papel", face).after(box);
    $(".legenda", face).style.transform = `translate(${S.border}px, ${S.border + size.h + 6}px)`;
    return {
      face, size, paper: $(".voo-papel", face), shadow: $(".voo-sombra", face), words: [$(".aba", face), $(".legenda", face)],
    };
  }

  /** The card is pulled out by its tab, eases as it clears the drawer, then falls, turning over. */
  function toss(print, delay) {
    const card = cards.get(print.id);
    if (!card) return;
    const from = onDesk(card.getBoundingClientRect());
    const { face: flyer } = cardFace(print);
    flyer.classList.add("inteira");
    voos.append(flyer);
    const deskHeight = mesaBox().height;
    const start = { x: from.x + from.w / 2, y: from.y + from.h / 2 };
    const pulled = { x: start.x - 90, y: start.y - 30 };
    const gone = { x: start.x - 190, y: deskHeight + S.cardH };
    const place = (t) => {
      const along = (key) => keyed([0, 0.3, 1], [start[key], pulled[key], gone[key]], [easeOut, fallEase], t);
      const turn = keyed([0, 0.3, 1], [0, -0.1, -0.65], null, t);
      const scale = keyed([0, 0.3, 1], [1, 1.04, 0.9], null, t);
      flyer.style.transform = `translate(${along("x") - S.cardW / 2}px, ${along("y") - S.cardH / 2}px) rotate(${turn}rad) scale(${scale})`;
      flyer.style.opacity = String(keyed([0, 0.72, 1], [1, 1, 0], null, t));
    };
    place(0);
    play(0.64, place, () => flyer.remove(), delay);
  }

  // ── capture ─────────────────────────────────────────────────────────────

  const camada = $("#captura-camada");
  const retangulo = $("#captura-retangulo");
  const medida = $("#captura-medida");
  const destaque = $("#captura-janela");
  const dica = $("#captura-dica");
  const dicaTexto = $("#captura-dica-texto");
  const flash = $("#flash");
  const modos = $$(".captura-modo");
  let mode = null;
  let dragStart = null;

  function enterMode(next) {
    if (mode === next) {
      leaveMode();
      return;
    }
    mode = next;
    for (const button of modos) {
      if (button.hasAttribute("aria-pressed")) button.setAttribute("aria-pressed", String(button.dataset.modo === next));
    }
    showMenu(false);
    if (drawer.open) closeDrawer();
    camada.hidden = false;
    camada.classList.toggle("janelas", next === "janela");
    camada.classList.remove("escolhendo");
    write(destaque, "display", "none");
    dicaTexto.textContent = next === "janela"
      ? "Clique numa janela para fotografá-la. Esc cancela."
      : finger.matches ? "Arraste o dedo sobre o que quer guardar." : "Arraste sobre qualquer coisa. Esc cancela.";
    dica.hidden = false;
    guide.update();
  }

  function leaveMode() {
    mode = null;
    dragStart = null;
    for (const button of modos) if (button.hasAttribute("aria-pressed")) button.setAttribute("aria-pressed", "false");
    camada.hidden = true;
    dica.hidden = true;
    guide.update();
  }

  for (const button of modos) {
    button.addEventListener("click", () => {
      if (button.dataset.modo === "tela") {
        leaveMode();
        const desk = mesaBox();
        capture({ x: 0, y: 0, w: desk.width, h: desk.height });
      } else {
        enterMode(button.dataset.modo);
      }
    });
  }
  $("#captura-cancelar").addEventListener("click", leaveMode);

  /** The window under a point on the desk, topmost first. */
  function windowAt(clientX, clientY) {
    const open = windows.filter(shown).sort((a, b) => (+b.style.zIndex || 0) - (+a.style.zIndex || 0));
    return open.find((win) => {
      const r = win.getBoundingClientRect();
      return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
    });
  }

  camada.addEventListener("pointerdown", (event) => {
    if (mode === "janela") {
      const win = windowAt(event.clientX, event.clientY);
      if (!win) return;
      const area = onDesk(win.getBoundingClientRect());
      leaveMode();
      capture(area);
      return;
    }
    const m = mesaBox();
    dragStart = { x: event.clientX - m.left, y: event.clientY - m.top };
    camada.setPointerCapture(event.pointerId);
    camada.classList.add("escolhendo");
    drawSelection(dragStart);
  });
  camada.addEventListener("pointermove", (event) => {
    const m = mesaBox();
    if (mode === "janela") {
      const win = windowAt(event.clientX, event.clientY);
      if (!win) {
        write(destaque, "display", "none");
        return;
      }
      const r = onDesk(win.getBoundingClientRect());
      write(destaque, "display", "block");
      write(destaque, "transform", `translate(${r.x}px, ${r.y}px)`);
      write(destaque, "width", `${r.w}px`);
      write(destaque, "height", `${r.h}px`);
      return;
    }
    if (dragStart) {
      // one drawing per frame, however many pointer events arrive
      pendingPoint = { x: event.clientX - m.left, y: event.clientY - m.top };
      if (!selectionFrame) selectionFrame = requestAnimationFrame(() => {
        selectionFrame = 0;
        if (dragStart && pendingPoint) drawSelection(pendingPoint);
      });
    }
  });
  camada.addEventListener("pointerup", (event) => {
    if (mode !== "selecao" || !dragStart) return;
    const m = mesaBox();
    const area = selection(dragStart, { x: event.clientX - m.left, y: event.clientY - m.top });
    leaveMode();
    if (area.w >= 10 && area.h >= 10) capture(area);
  });

  function selection(a, b) {
    const m = mesaBox();
    const x = clamp(Math.min(a.x, b.x), 0, m.width), y = clamp(Math.min(a.y, b.y), 0, m.height);
    return { x, y, w: clamp(Math.max(a.x, b.x), 0, m.width) - x, h: clamp(Math.max(a.y, b.y), 0, m.height) - y };
  }

  let pendingPoint = null;
  let selectionFrame = 0;
  const sombras = Object.fromEntries($$(".captura-sombra").map((el) => [el.dataset.lado, el]));

  function drawSelection(point) {
    const r = selection(dragStart, point);
    const m = mesaBox();
    const W = m.width, H = m.height;
    sombras.cima.style.transform = `scale(1, ${r.y / H})`;
    sombras.baixo.style.transform = `translate(0, ${r.y + r.h}px) scale(1, ${(H - r.y - r.h) / H})`;
    sombras.esquerda.style.transform = `translate(0, ${r.y}px) scale(${r.x / W}, ${r.h / H})`;
    sombras.direita.style.transform = `translate(${r.x + r.w}px, ${r.y}px) scale(${(W - r.x - r.w) / W}, ${r.h / H})`;
    retangulo.style.transform = `translate(${r.x}px, ${r.y}px)`;
    retangulo.style.width = `${r.w}px`;
    retangulo.style.height = `${r.h}px`;
    write(medida, "text", `${Math.round(r.w)} × ${Math.round(r.h)}`);
    medida.style.transform = `translate(${clamp(point.x + 14, 4, W - 90)}px, ${clamp(point.y + 14, 4, H - 24)}px)`;
  }

  /** The shutter: a flash over what was taken, then the print flies into the drawer. */
  function capture(area) {
    Object.assign(flash.style, { left: `${area.x}px`, top: `${area.y}px`, width: `${area.w}px`, height: `${area.h}px` });
    const print = makePrint(area);
    guide.captured();
    if (!still.matches) {
      flash.animate([{ opacity: 0.85 }, { opacity: 0 }], { duration: 320, easing: "ease-out" });
    }
    // The flash and the closing of the capture layer get a frame to themselves; the flight starts on the next.
    requestAnimationFrame(() => setTimeout(() => receive(print, area), 0));
  }

  function receive(print, from) {
    drawer.prints.unshift(print);
    // the newest card is the one Tab reaches, unless the keys are already in the drawer
    if (!gaveta.contains(document.activeElement)) focusedId = print.id;
    announce("Print guardado na gaveta.");
    if (still.matches || !from) {
      if (!drawer.open) peek();
      render();
      if (!drawer.open) endPeekSoon();
      guide.captured();
      return;
    }
    drawer.landing.add(print.id);
    if (!drawer.open) peek();
    else {
      render();
      fichas.scrollTop = fichas.scrollHeight;
    }
    fly(print, from, () => {
      drawer.landing.delete(print.id);
      render();
      corpo.classList.remove("tranco");
      void corpo.offsetWidth;
      corpo.classList.add("tranco");
      if (!drawer.open) endPeekSoon();
      guide.captured();
    });
  }

  /** Where the front card's picture will stand once the drawer has slid to where it is going. */
  function frontPhotoTarget(print) {
    const desk = mesaBox();
    const g = gaveta.getBoundingClientRect();
    const corpoTop = placement.top;
    const visible = placement.height - L.rail * 2 - L.footer;
    const scroll = Math.max(0, layout.height - visible);
    const front = drawer.prints.length - 1;
    const size = photoSize(print, S.cardH);
    const x = desk.width - drawerWidth + slide() + L.front + S.left + S.border + (S.photoW - size.w) / 2;
    const y = g.top - desk.top + corpoTop + L.rail + layout.tops[front] - scroll + S.border;
    return { x, y, w: size.w, h: size.h };
  }

  /** The capture lifts off the screen, shrinks to a card while tilting through the turn, and lands upright. */
  function fly(print, from, landed) {
    const target = frontPhotoTarget(print);
    const { face: flyer, paper, shadow: halo, words } = cardFace(print);
    voos.append(flyer);

    // the card is laid out around its picture: the picture's centre is what travels
    const cx = S.border + (S.photoW - target.w) / 2 + target.w / 2;
    const cy = S.border + target.h / 2;
    flyer.style.transformOrigin = `${cx}px ${cy}px`;
    const p0 = { x: from.x + from.w / 2, y: from.y + from.h / 2 };
    const p1 = { x: target.x + target.w / 2, y: target.y + target.h / 2 };
    const control = { x: p0.x + (p1.x - p0.x) * 0.55, y: Math.min(p0.y, p1.y) - 140 };
    // A print of the whole screen would make the browser draw a screen-sized picture before the first frame:
    // the flight starts at most 2.6 cards wide, fading in under the flash, which covers the difference.
    const fullScale = from.w / target.w;
    const startScale = Math.min(fullScale, 2.6);
    const fadeIn = fullScale > startScale;

    const frame = (t) => {
      const e = flightEase(t);
      const x = (1 - e) * (1 - e) * p0.x + 2 * (1 - e) * e * control.x + e * e * p1.x;
      const y = (1 - e) * (1 - e) * p0.y + 2 * (1 - e) * e * control.y + e * e * p1.y;
      const scale = keyed([0, 0.14, 0.72, 1], [startScale, startScale * 1.04, 1.12, 1], [easeOut, easeInOut, easeOut], t);
      const turn = keyed([0, 0.14, 0.72, 1], [0, 0, 0.07, 0], [easeOut, easeInOut, easeOut], t);
      flyer.style.transform = `translate(${x - cx}px, ${y - cy}px) rotate(${turn}rad) scale(${scale})`;
      paper.style.opacity = String(keyed([0, 0.45, 0.8], [0, 0, 1], null, t));
      halo.style.opacity = String(keyed([0, 0.14, 1], [0, 1, 0.7], null, t));
      const ink = String(keyed([0, 0.7, 1], [0, 0, 1], null, t));
      for (const part of words) part.style.opacity = ink;
      if (fadeIn) flyer.style.opacity = String(keyed([0, 0.12], [0, 1], null, t));
    };
    frame(0);
    play(0.78, frame, () => {
      landed();
      flyer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: "forwards" }).onfinish = () => flyer.remove();
    });
  }

  // ── dragging cards out: to the ticket, or to the Trash ───────────────────

  const chamado = $("#chamado");
  const anexos = $("#anexos");
  let drag = null;

  function followPress(event) {
    if (!press.dragging) {
      if (Math.hypot(event.clientX - press.x, event.clientY - press.y) < 5) return;
      // A card is taken by any part of it, its corners too: the circle and the cross only act on a click.
      startDrag(press.hit.print);
      press.dragging = true;
    }
    moveDrag(event);
  }

  function startDrag(print) {
    if (drag) cancelDrag();
    const ids = drawer.selection.has(print.id) ? selectedPrints().map((p) => p.id) : [print.id];
    drawer.dragging = new Set(ids);
    drawer.hovered = null;
    const ghost = document.createElement("div");
    ghost.className = "fantasma";
    const size = deskSize(print);
    const box = photo(print, size.w, size.h);
    box.style.left = `${-size.w / 2}px`;
    box.style.top = `${-size.h / 2}px`;
    ghost.append(box);
    if (ids.length > 1) {
      const badge = document.createElement("span");
      badge.className = "fantasma-conta";
      badge.textContent = String(ids.length);
      badge.style.left = `${size.w / 2 - 14}px`;
      badge.style.top = `${-size.h / 2 - 10}px`;
      ghost.append(badge);
    }
    voos.append(ghost);
    drag = { ids, ghost, over: null };
    render();
  }

  function dropTarget(clientX, clientY) {
    for (const target of [lixo, chamado]) {
      if (!shown(target)) continue;
      const r = target.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) return target;
    }
    return null;
  }

  function moveDrag(event) {
    const m = mesaBox();
    drag.ghost.style.transform = `translate(${event.clientX - m.left}px, ${event.clientY - m.top}px)`;
    const over = dropTarget(event.clientX, event.clientY);
    if (over !== drag.over) {
      lixo.classList.toggle("alvo", over === lixo);
      anexos.classList.toggle("alvo", over === chamado);
      drag.over = over;
    }
  }

  function endDrag(event) {
    const over = dropTarget(event.clientX, event.clientY);
    const { ids, ghost } = drag;
    // Let go away from the drawer: it slides back in, as it would after the pointer left it.
    const box = corpo.getBoundingClientRect();
    const away = event.clientX < box.left - 24 || event.clientY < box.top - 24 || event.clientY > box.bottom + 24;
    if (away && event.pointerType === "mouse" && !drawer.pinned) {
      closeSoon();
    }
    lixo.classList.remove("alvo");
    anexos.classList.remove("alvo");
    drawer.dragging.clear();
    drag = null;
    if (over === lixo) {
      ghost.remove();
      discard(ids, false);
      clearSelection();
    } else if (over === chamado) {
      ghost.remove();
      activate(chamado);
      attach(ids.map((id) => everyPrint.get(id)));
      clearSelection();
    } else if (onTheDesk(event.clientX, event.clientY)) {
      ghost.remove();
      const m = mesaBox();
      ids.forEach((id, k) => putOnDesk(everyPrint.get(id), event.clientX - m.left + k * 18, event.clientY - m.top + k * 18));
      takeOut(ids);
      announce(ids.length === 1 ? "Print deixado na mesa." : `${ids.length} prints deixados na mesa.`);
    } else {
      ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: "forwards" }).onfinish = () => ghost.remove();
      render();
    }
  }

  /** On the desk itself: not over the drawer, the menu bar or the dock. */
  function onTheDesk(clientX, clientY) {
    const inside = (el) => {
      const r = el.getBoundingClientRect();
      return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
    };
    const m = mesaBox();
    if (clientX < m.left || clientX > m.right || clientY < m.top + 28 || clientY > m.bottom) return false;
    return !inside(corpo) && !inside(realDock) && !inside($(".captura"));
  }

  /** The prints leave the drawer: they were moved, not copied. */
  function takeOut(ids) {
    for (const id of ids) {
      drawer.prints = drawer.prints.filter((p) => p.id !== id);
      drawer.selection.delete(id);
      drawer.copied.delete(id);
      if (drawer.hovered === id) drawer.hovered = null;
    }
    render();
  }

  // ── prints left on the desk ─────────────────────────────────────────────

  const DESK = { w: 104, h: 78, item: 128 };
  function deskSize(print) {
    let w = DESK.w, h = (DESK.w * print.h) / print.w;
    if (h > DESK.h) { h = DESK.h; w = (DESK.h * print.w) / print.h; }
    return { w: Math.round(w), h: Math.round(h) };
  }
  const onDeskNow = new Map();
  let deskDrag = false;

  /** A print as a file on the desk, its picture centred where it was let go. */
  function putOnDesk(print, x, y) {
    const size = deskSize(print);
    const item = document.createElement("button");
    item.type = "button";
    item.className = "solto chegando";
    item.setAttribute("aria-label", `${print.name}.png, na mesa. Enter abre, Delete joga no Lixo.`);
    const name = document.createElement("span");
    name.className = "solto-nome";
    name.textContent = `${print.name}.png`;
    item.append(photo(print, size.w, size.h), name);
    palco.insertBefore(item, realDock);
    const m = mesaBox();
    const spot = {
      x: clamp(x - DESK.item / 2, 6, m.width - DESK.item - 6),
      y: clamp(y - size.h / 2 - 4, 34, m.height - size.h - 40),
    };
    item.style.transform = `translate(${spot.x}px, ${spot.y}px)`;
    item.addEventListener("animationend", () => item.classList.remove("chegando"), { once: true });
    onDeskNow.set(print.id, { item, spot, print });
    handleDeskItem(item, print);
  }

  function handleDeskItem(item, print) {
    let lastTap = 0;
    item.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      const entry = onDeskNow.get(print.id);
      for (const other of $$("#palco > .arquivos > .arquivo, #palco > .solto")) other.classList.toggle("escolhido", other === item);
      activate(null);
      try { item.setPointerCapture(event.pointerId); } catch {}
      const startX = event.clientX, startY = event.clientY;
      let moving = false, over = null, frame = 0, last = event;
      const follow = () => {
        frame = 0;
        const dx = last.clientX - startX, dy = last.clientY - startY;
        item.style.transform = `translate(${entry.spot.x + dx}px, ${entry.spot.y + dy}px)`;
        const box = corpo.getBoundingClientRect();
        const overDrawer = drawer.open && last.clientX >= box.left && last.clientY >= box.top && last.clientY <= box.bottom;
        const target = dropTarget(last.clientX, last.clientY) || (overDrawer ? corpo : null);
        if (target !== over) {
          lixo.classList.toggle("alvo", target === lixo);
          anexos.classList.toggle("alvo", target === chamado);
          over = target;
        }
        // brought to the right edge, the drawer opens to take it back
        if (!drawer.open && last.clientX >= mesaBox().right - 10) openDrawer();
      };
      const move = (e) => {
        last = e;
        if (!moving && Math.hypot(e.clientX - startX, e.clientY - startY) < 4) return;
        if (!moving) {
          moving = true;
          deskDrag = true;
          item.classList.add("movendo");
          guide.update();
        }
        if (!frame) frame = requestAnimationFrame(follow);
      };
      const up = (e) => {
        cancelAnimationFrame(frame);
        if (deskDrag) {
          deskDrag = false;
          queueMicrotask(() => guide.update());
        }
        lixo.classList.remove("alvo");
        anexos.classList.remove("alvo");
        if (!moving) {
          const now = performance.now();
          if (now - lastTap < 400 || finger.matches) showPrint(print);
          lastTap = now;
          return;
        }
        item.classList.remove("movendo");
        const dx = e.clientX - startX, dy = e.clientY - startY;
        // opened by bringing the file to the edge and let go elsewhere: the drawer slides back in
        if (over !== corpo && drawer.open && !drawer.pinned) {
          closeSoon();
        }
        if (over === lixo) return trashFromDesk(print);
        if (over === corpo) return backToDrawer(print);
        if (over === chamado) {
          // let go on the ticket, the file goes into it and leaves the desk
          activate(chamado);
          onDeskNow.delete(print.id);
          item.remove();
          attach([print]);
          guide.update();
          return;
        }
        const m = mesaBox();
        entry.spot = {
          x: clamp(entry.spot.x + dx, -DESK.item / 2, m.width - DESK.item / 2),
          y: clamp(entry.spot.y + dy, 30, m.height - 60),
        };
        item.style.transform = `translate(${entry.spot.x}px, ${entry.spot.y}px)`;
      };
      const cancel = () => {
        cancelAnimationFrame(frame);
        deskDrag = false;
        queueMicrotask(() => guide.update());
        lixo.classList.remove("alvo");
        anexos.classList.remove("alvo");
        item.classList.remove("movendo");
        item.style.transform = `translate(${entry.spot.x}px, ${entry.spot.y}px)`;
      };
      gesture(event.pointerId, { move, up, cancel });
    });
    item.addEventListener("click", (event) => { if (event.detail === 0) showPrint(print); });
    item.addEventListener("keydown", (event) => {
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        trashFromDesk(print);
      }
    });
  }

  function trashFromDesk(print) {
    const entry = onDeskNow.get(print.id);
    if (!entry) return;
    onDeskNow.delete(print.id);
    entry.item.classList.add("saindo");
    setTimeout(() => entry.item.remove(), 260);
    trash.unshift(print);
    renderTrash();
    announce("Print jogado no Lixo.");
    guide.update();
  }

  function backToDrawer(print) {
    const entry = onDeskNow.get(print.id);
    if (!entry) return;
    onDeskNow.delete(print.id);
    entry.item.remove();
    drawer.prints.push(print);
    drawer.prints.sort((a, b) => b.date - a.date);
    render();
    announce("Print de volta na gaveta.");
  }

  function cancelDrag() {
    if (!drag) return;
    drag.ghost.remove();
    lixo.classList.remove("alvo");
    anexos.classList.remove("alvo");
    drawer.dragging.clear();
    drag = null;
    render();
  }

  // ── the ticket: ⌘V pastes everything copied, at once ─────────────────────

  const colar = $("#colar");
  const anexosVazio = $("#anexos-vazio");
  if (finger.matches) anexosVazio.textContent = "Copie na gaveta e toque em Colar, ou arraste da gaveta.";
  const anexosConta = $("#anexos-conta");
  let attached = 0;

  function updatePaste() {
    anexos.classList.toggle("com-copia", clipboard.length > 0);
    colar.textContent = clipboard.length > 1 ? `Colar ${clipboard.length} prints` : "Colar";
  }
  colar.addEventListener("click", paste);

  function paste() {
    if (!clipboard.length) {
      announce("Nada copiado ainda: clique num print na gaveta para copiar.");
      return;
    }
    chamado.classList.remove("fechada");
    openWindow(chamado);
    // The paste lands in the ticket: the drawer gets out of the way.
    if (drawer.open) closeDrawer();
    attach(clipboard.map((id) => everyPrint.get(id)));
  }

  function attach(prints) {
    anexosVazio.hidden = true;
    const width = Math.max(60, (anexos.clientWidth - 16 - 16) / 3);
    const height = Math.round(width * 10 / 16);
    prints.forEach((print, order) => {
      const figure = document.createElement("figure");
      figure.className = "anexo";
      figure.style.setProperty("--ordem", String(order));
      const box = photo(print, width, height, true);
      box.dataset.id = String(print.id);
      const caption = document.createElement("figcaption");
      caption.textContent = `${print.name}.png`;
      figure.append(box, caption);
      anexos.insertBefore(figure, colar);
    });
    attached += prints.length;
    anexosConta.textContent = attached === 1 ? "1 print" : `${attached} prints`;
    announce(prints.length === 1 ? "1 print colado no chamado." : `${prints.length} prints colados no chamado, de uma vez.`);
    guide.pasted(prints.length);
  }

  // Thumbnails keep their picture fitted as the window changes width.
  new ResizeObserver(() => {
    const width = Math.max(60, (anexos.clientWidth - 16 - 16) / 3);
    const height = Math.round(width * 10 / 16);
    for (const box of $$(".anexo .foto", anexos)) {
      const print = everyPrint.get(+box.dataset.id);
      if (print) sizePhoto(box, print, width, height, true);
    }
  }).observe(anexos);

  // ── a print opened large, with a double click ────────────────────────────

  const previaPrint = $("#previa-print");
  function showPrint(print) {
    const content = $("#previa-print-conteudo");
    content.replaceChildren();
    $("#previa-print-titulo").textContent = `${print.name}.png`;
    openWindow(previaPrint);
    const room = { w: Math.min(520, mesaBox().width - 80), h: Math.min(340, mesaBox().height - 200) };
    const k = Math.min(room.w / print.w, room.h / print.h, 1.5);
    content.append(photo(print, Math.round(print.w * k), Math.round(print.h * k)));
  }

  // ── keys ────────────────────────────────────────────────────────────────

  /** One card at a time is in the tab order; the arrows move between them. */
  let focusedId = null;
  function rovingFocus() {
    const list = backToFront();
    if (!list.some((p) => p.id === focusedId)) focusedId = list.length ? list[list.length - 1].id : null;
    for (const [id] of cards) {
      const button = parts.get(id)?.botao;
      const index = id === focusedId ? 0 : -1;
      if (button && button.tabIndex !== index) button.tabIndex = index;
    }
  }
  function focusCard(id) {
    focusedId = id;
    rovingFocus();
    const card = cards.get(id);
    if (!card) return;
    $(".ficha-botao", card).focus({ preventScroll: true });
    const top = parseFloat(card.style.getPropertyValue("--y")) || 0;
    if (top < fichas.scrollTop || top + S.cardH > fichas.scrollTop + fichas.clientHeight) {
      fichas.scrollTop = top - 20;
    }
  }

  pilha.addEventListener("keydown", (event) => {
    const button = event.target.closest(".ficha-botao");
    if (!button) return;
    const id = +button.closest(".ficha").dataset.id;
    const list = backToFront();
    const index = list.findIndex((p) => p.id === id);
    if (event.key === "ArrowUp") focusCard(list[Math.max(0, index - 1)].id);
    else if (event.key === "ArrowDown") focusCard(list[Math.min(list.length - 1, index + 1)].id);
    else if (event.key === "Home") focusCard(list[0].id);
    else if (event.key === "End") focusCard(list[list.length - 1].id);
    else if (event.key === " ") toggleSelection(id);
    else if (event.key === "Enter") copy(id);
    else if (event.key === "Delete" || event.key === "Backspace") {
      const next = list[index + 1] || list[index - 1];
      discard([id], true);
      if (next) focusCard(next.id);
      else fichas.focus();
    } else return;
    event.preventDefault();
  });

  document.addEventListener("keydown", (event) => {
    const command = event.metaKey || event.ctrlKey;
    if (event.key === "Escape") {
      if (mode) leaveMode();
      else if (!menuGaveta.hidden) {
        showMenu(false);
        menuIcon.focus();
      } else if (drawer.open) {
        const inside = gaveta.contains(document.activeElement);
        closeDrawer();
        if (inside) menuIcon.focus();
      }
      return;
    }
    if (event.ctrlKey && event.altKey && event.code === "KeyG") {
      event.preventDefault();
      toggleDrawer(true);
      if (drawer.open && focusedId) focusCard(focusedId);
      return;
    }
    if (command && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "v") {
      event.preventDefault();
      paste();
      return;
    }
    if (command && event.key.toLowerCase() === "a" && gaveta.contains(document.activeElement)) {
      event.preventDefault();
      selectAll();
      return;
    }
    if (command && event.key.toLowerCase() === "c" && drawer.selection.size && gaveta.contains(document.activeElement)) {
      event.preventDefault();
      copySelection();
    }
  });

  // ── the guide: a tip that reads the desk and says the next thing to do ──

  const guide = (() => {
    const box = $("#guia");
    const step = $("#guia-passo");
    const text = $("#guia-texto");
    const history = { captured: false, opened: false, pasted: 0 };
    let started = false;
    let off = false;
    let anchor = "";
    let wording = "";
    let size = { w: 0, h: 0 };
    let hideTimer = 0;
    const captura = $(".captura");
    const touch = () => finger.matches;

    /** What to say now, and where to point: worked out from the desk as it is, never from a fixed script. */
    function hint() {
      if (!started || off) return null;
      if (mode || drag || deskDrag) return null; // the capture bar and a drag have the stage
      if (history.pasted) {
        const n = history.pasted;
        return {
          passo: "Pronto",
          texto: `<b>${n === 1 ? "1 print colado" : `${n} prints colados`} de uma vez</b>, na ordem em que foram tirados. É isso que a Gaveta faz no seu Mac.`,
          alvo: chamado, onde: "chamado",
        };
      }
      if (narrow() && drawer.open) return null; // on a phone the drawer's own bar says it
      if (clipboard.length) {
        const n = clipboard.length;
        const what = n === 1 ? "<b>Print copiado.</b>" : `<b>${n} prints copiados.</b>`;
        return {
          passo: "3 de 3 · Colar",
          texto: touch()
            ? `${what} Toque em <b>${n === 1 ? "Colar" : `Colar ${n} prints`}</b> no chamado.`
            : `${what} Cole no chamado com <b>⌘V</b>${n === 1 ? "." : ", todos de uma vez."}`,
          alvo: chamado, onde: "chamado", realce: touch() ? colar : anexos,
        };
      }
      if (!drawer.prints.length) {
        if (onDeskNow.size) {
          return {
            passo: "Na mesa",
            texto: `<b>${onDeskNow.size === 1 ? "Seu print está" : "Seus prints estão"} na mesa.</b> Arraste até o chamado para anexar, ou até a borda direita para guardar de volta na gaveta.`,
            alvo: chamado, onde: "chamado", realce: anexos,
          };
        }
        return { passo: "1 de 3 · Tirar", texto: "<b>A gaveta está vazia.</b> Tire um print com a barra aqui embaixo.", alvo: captura, onde: "barra-captura" };
      }
      if (drawer.open) {
        const n = drawer.selection.size;
        if (n === 0) {
          return {
            passo: "2 de 3 · Selecionar",
            texto: touch()
              ? "<b>Toque num print</b> para copiar só ele. Para selecionar vários, toque no círculo de cada um ou em <b>Selecionar todos</b>."
              : "<b>Clique num print</b> para copiar só ele. Para selecionar vários, use <b>⌘-clique</b> ou <b>Selecionar todos</b>, lá embaixo.",
            alvo: corpo, onde: "frente", realce: $("[data-acao='todos']", barra),
          };
        }
        if (n === 1) {
          return {
            passo: "2 de 3 · Selecionar",
            texto: `<b>1 print selecionado.</b> ${touch() ? "Toque no círculo de outros" : "Use <b>⌘-clique</b> em outros"} para selecionar mais, ou ${touch() ? "toque" : "clique"} em <b>Copiar</b>.`,
            alvo: corpo, onde: "barra", realce: $("[data-acao='copiar']", barra),
          };
        }
        return {
          passo: "2 de 3 · Copiar",
          texto: `<b>${n} prints selecionados.</b> ${touch() ? "Toque" : "Clique"} em <b>Copiar todos</b> para levar os ${n} de uma vez.`,
          alvo: corpo, onde: "barra", realce: $("[data-acao='copiar']", barra),
        };
      }
      if (!history.captured && !history.opened) {
        return {
          passo: "1 de 3 · Tirar",
          texto: touch()
            ? "<b>Tire um print desta mesa.</b> Toque em <b>Tela</b>, ou em <b>Seleção</b> e arraste o dedo."
            : "<b>Tire um print desta mesa.</b> Escolha <b>Seleção</b> na barra e arraste sobre a loja, ou sobre qualquer coisa.",
          alvo: captura, onde: "barra-captura", realce: $(".captura-modo[data-modo='selecao']"),
        };
      }
      const fresh = history.captured && !history.opened;
      return {
        passo: "2 de 3 · Abrir",
        texto: (fresh ? "<b>Seu print caiu na gaveta.</b> " : "<b>Seus prints estão na gaveta.</b> ")
          + (touch() ? "Toque na borda de madeira, à direita, para abrir." : "Encoste o ponteiro na borda direita da tela para abrir."),
        alvo: corpo, onde: "frente",
      };
    }

    /** Where the tip stands for a hint, and which way its arrow points. */
    function spot(h, w, hh) {
      const m = mesaBox();
      if (h.onde === "barra-captura") {
        const r = onDesk(captura.getBoundingClientRect());
        const x = r.x + r.w / 2 - w / 2;
        const cx = clamp(x, 10, m.width - w - 10);
        return { x: cx, y: r.y - hh - 14, seta: cx === x ? "baixo" : "nenhuma" };
      }
      if (h.onde === "chamado") {
        if (narrow() || !shown(chamado)) return { x: (m.width - w) / 2, y: onDesk(captura.getBoundingClientRect()).y - hh - 12, seta: "nenhuma" };
        const r = onDesk(chamado.getBoundingClientRect());
        const shelf = onDesk(anexos.getBoundingClientRect());
        return { x: r.x + r.w + 16, y: shelf.y + shelf.h / 2 - hh / 2, seta: "esquerda" };
      }
      // Beside the drawer, on its spring: opening it pushes the tip aside, shutting it brings the tip back.
      const top = (parseFloat(getComputedStyle(gaveta).top) || 28) + placement.top;
      const scroll = Math.max(0, layout.height - (placement.height - L.rail * 2 - L.footer));
      const x = m.width - drawerWidth + slide() - w - 16;
      let y = h.onde === "barra"
        ? top + placement.height - L.rail - L.footer / 2 - hh / 2
        : top + L.rail + (layout.tops[drawer.prints.length - 1] ?? 0) - scroll + 24 - hh / 2;
      // never over the page's words or the capture bar, judged where the open drawer puts it, so the height never jumps
      const pushed = m.width - drawerWidth - w - 16;
      for (const el of [$("#palco > .abertura"), captura]) {
        const r = onDesk(el.getBoundingClientRect());
        if (overlaps({ x: pushed, y, w, h: hh }, { x: r.x - 12, y: r.y - 12, w: r.w + 24, h: r.h + 24 })) {
          y = el === captura ? r.y - hh - 14 : r.y + r.h + 14;
        }
      }
      return { x, y, seta: "direita" };
    }

    let lit = null;
    function update() {
      const h = hint();
      const want = h?.realce || null;
      if (want !== lit) {
        lit?.classList.remove("realce");
        lit = want;
        // a fresh element each time the bar is redrawn: the light starts over only when the subject changes
        lit?.classList.add("realce");
      } else if (lit && !lit.classList.contains("realce")) {
        lit.classList.add("realce");
      }
      mesa.classList.toggle("guia-no-inicio", !!h && h.passo.startsWith("1 de 3"));
      if (!h) {
        if (!box.hidden && !box.classList.contains("saindo")) {
          box.classList.add("saindo");
          clearTimeout(hideTimer);
          hideTimer = setTimeout(() => { if (box.classList.contains("saindo")) box.hidden = true; }, 250);
        }
        return;
      }
      clearTimeout(hideTimer);
      const appearing = box.hidden || box.classList.contains("saindo");
      box.hidden = false;
      box.classList.remove("saindo");
      const words = h.passo + h.texto;
      if (words !== wording) {
        wording = words;
        step.textContent = h.passo;
        text.innerHTML = h.texto;
        size = { w: box.offsetWidth, h: box.offsetHeight };
      }
      const m = mesaBox();
      const where = spot(h, size.w, size.h);
      box.dataset.seta = where.seta;
      const place = `translate(${Math.round(clamp(where.x, 10, m.width - size.w - 10))}px, ${Math.round(clamp(where.y, 40, m.height - size.h - 10))}px)`;
      // A new subject fades in where it belongs; the same subject rides along with what it points at.
      const key = h.onde;
      if (appearing || key !== anchor) {
        anchor = key;
        box.classList.add("sem-mola");
        box.style.transform = place;
        void box.offsetWidth;
        box.classList.remove("sem-mola");
        if (!still.matches) box.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: "ease-out" });
      } else if (box.style.transform !== place) {
        box.style.transform = place;
      }
    }

    const api = {
      start: () => setTimeout(() => { started = true; update(); }, 900),
      captured: () => { history.captured = true; update(); },
      drawerOpened: () => { history.opened = true; update(); },
      pasted: (count) => {
        if (!count || off) return;
        history.pasted = count;
        update();
        setTimeout(() => { off = true; update(); }, 8000);
      },
      update,
    };
    $("#guia-fechar").addEventListener("click", () => { off = true; update(); });
    addEventListener("resize", () => update());
    return api;
  })();

  // ── felt, grain, and the first prints ───────────────────────────────────

  /** Green baize with a faint weave: specks of light and dark from a fixed seed, as in the app. */
  function feltTile() {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const c = canvas.getContext("2d");
    let seed = 0x9e3779b9;
    const next = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return (seed >>> 8) / (1 << 24);
    };
    for (let i = 0; i < 320; i++) {
      const light = next() > 0.5;
      c.fillStyle = light ? `rgba(255,255,255,${0.025 + next() * 0.04})` : `rgba(0,0,0,${0.025 + next() * 0.04})`;
      c.fillRect(Math.floor(next() * 64), Math.floor(next() * 64), 1, 1);
    }
    return `url(${canvas.toDataURL()})`;
  }

  /** Grain running across the oak front. */
  function grain() {
    let paths = "";
    let y = 4, line = 0;
    while (y < 120) {
      paths += `<path d="M0 ${y}Q29 ${y + (line % 2 === 0 ? -2 : 4)} 58 ${y + 3}" />`;
      y += 7 + (line % 3) * 2;
      line++;
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="58" height="120" fill="none" stroke="rgba(89,51,20,0.13)" stroke-width="1">${paths}</svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  $(".feltro-fundo").style.backgroundImage = `radial-gradient(320px 320px at 30% 10%, rgba(255, 255, 255, 0.07), transparent 100%), ${feltTile()}`;
  $(".frente").style.setProperty("--veio", grain());

  // A short note for keyboard users, read with each card.
  const keysNote = document.createElement("p");
  keysNote.id = "gaveta-teclas";
  keysNote.className = "so-leitor";
  keysNote.textContent = "Enter copia, Espaço escolhe, Delete joga fora, setas passam de uma ficha para outra.";
  gaveta.append(keysNote);

  function firstPrints() {
    const now = Date.now();
    const seeds = narrow()
      ? [[$(".abertura h1"), 2 * 60 * 60 * 1000], [$(".acoes"), 12 * 60 * 1000], [$(".dock"), 5 * 60 * 1000]]
      : [[$(".abertura h1"), 2 * 60 * 60 * 1000], [$("#ficha-uso"), 12 * 60 * 1000], [$("#navegador"), 5 * 60 * 1000]];
    for (const [el, age] of seeds) {
      const target = el && shown(el) ? el : $(".abertura");
      const r = onDesk(target.getBoundingClientRect());
      const area = { x: Math.max(0, r.x - 12), y: Math.max(0, r.y - 10), w: r.w + 24, h: r.h + 20 };
      drawer.prints.unshift(makePrint(area, now - age));
    }
  }

  // Tabs say how long ago, and stay right as time passes.
  setInterval(() => {
    for (const p of drawer.prints) {
      const part = parts.get(p.id);
      if (part) write(part.aba, "text", ago(p.date));
    }
  }, 30000);

  addEventListener("resize", () => render());
  finger.addEventListener("change", () => render());

  const begin = () => {
    firstPrints();
    activate($("#chamado"));
    render();
    guide.start();
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(begin);
  else begin();
})();
