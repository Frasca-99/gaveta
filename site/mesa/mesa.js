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
    for (const button of $$(".dock-app[data-abre]")) {
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
      handle.setPointerCapture(event.pointerId);
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
      const up = () => {
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", up);
        handle.removeEventListener("pointercancel", up);
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", up);
      handle.addEventListener("pointercancel", up);
    });
  }
  for (const button of $$("[data-fecha]")) {
    button.addEventListener("click", () => closeWindow(button.closest(".janela")));
  }
  palco.addEventListener("pointerdown", (event) => {
    if (event.target === palco || event.target.closest(".abertura")) activate(null);
  });

  for (const button of $$(".dock-app[data-abre]")) {
    button.addEventListener("click", () => {
      const win = document.getElementById(button.dataset.abre);
      if (!win) return;
      win.classList.remove("fechada");
      openWindow(win);
    });
  }

  // Files on the desk: a click picks one, a double click opens it; a tap or a key opens it at once.
  for (const file of $$(".arquivo")) {
    const open = () => openWindow(document.getElementById(file.dataset.abre));
    file.addEventListener("click", (event) => {
      for (const other of $$(".arquivo")) other.classList.toggle("escolhido", other === file);
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
      const card = cardFor(print);
      if (!card.parentNode) pilha.append(card);
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
        ? `<button class="pilula" type="button" data-acao="todos">${CIRCLE}Selecionar todos</button><span class="espaco"></span><span class="dica">ou use a bolinha</span>`
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

  // The pointer resting on the right edge opens it, like the app's edge trigger.
  const startDwell = () => {
    if (drawer.open || !drawer.prints.length) return;
    clearTimeout(dwellTimer);
    dwellTimer = setTimeout(() => openDrawer(), 200);
  };
  borda.addEventListener("pointerenter", (event) => { if (event.pointerType === "mouse") startDwell(); });
  borda.addEventListener("pointerleave", () => clearTimeout(dwellTimer));
  corpo.addEventListener("pointerenter", (event) => {
    clearTimeout(awayTimer);
    if (event.pointerType === "mouse" && !drawer.open) startDwell();
  });
  corpo.addEventListener("pointerleave", (event) => {
    clearTimeout(dwellTimer);
    if (event.pointerType !== "mouse" || !drawer.open || drawer.pinned || drawer.dragging.size) return;
    if (gaveta.contains(document.activeElement) && document.activeElement !== document.body) return;
    awayTimer = setTimeout(closeDrawer, 450);
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
    if (press && press.pointerId === event.pointerId) {
      followPress(event);
      return;
    }
    if (event.pointerType === "mouse") setHovered(hitTest(event.clientX, event.clientY)?.print.id ?? null);
  });
  pilha.addEventListener("pointerleave", (event) => {
    if (!press && event.pointerType === "mouse") setHovered(null);
  });
  pilha.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const hit = hitTest(event.clientX, event.clientY);
    if (!hit) return;
    press = { hit, pointerId: event.pointerId, x: event.clientX, y: event.clientY, dragging: false, event };
    pilha.setPointerCapture(event.pointerId);
    if (event.pointerType !== "mouse") event.preventDefault();
  });
  pilha.addEventListener("pointerup", (event) => {
    if (!press || press.pointerId !== event.pointerId) return;
    const current = press;
    press = null;
    if (current.dragging) {
      endDrag(event);
      return;
    }
    clickCard(current.hit, current.event);
  });
  pilha.addEventListener("pointercancel", () => {
    if (press?.dragging) cancelDrag();
    press = null;
  });

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
    guide.chose();
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
    guide.chose();
  }

  function selectAll() {
    for (const p of drawer.prints) drawer.selection.add(p.id);
    render();
    guide.chose();
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
    guide.copied(prints.length);
  }

  // ── throwing away ───────────────────────────────────────────────────────

  const lixo = $("#lixo");

  function discard(ids, thrown) {
    ids.forEach((id, order) => {
      const print = printOf(id);
      if (!print) return;
      if (thrown && order < 6 && !still.matches) toss(print, order * 0.05);
      drawer.prints = drawer.prints.filter((p) => p.id !== id);
      drawer.selection.delete(id);
      drawer.copied.delete(id);
      if (drawer.hovered === id) drawer.hovered = null;
    });
    lixo.classList.add("cheio");
    render();
    announce(ids.length === 1 ? "Print jogado no Lixo." : `${ids.length} prints jogados no Lixo.`);
  }

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
    destaque.style.display = "none";
    dicaTexto.textContent = next === "janela"
      ? "Clique numa janela para fotografá-la. Esc cancela."
      : finger.matches ? "Arraste o dedo sobre o que quer guardar." : "Arraste sobre qualquer coisa. Esc cancela.";
    dica.hidden = false;
    guide.hide();
  }

  function leaveMode() {
    mode = null;
    dragStart = null;
    for (const button of modos) if (button.hasAttribute("aria-pressed")) button.setAttribute("aria-pressed", "false");
    camada.hidden = true;
    dica.hidden = true;
    guide.resume();
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
        destaque.style.display = "none";
        return;
      }
      const r = onDesk(win.getBoundingClientRect());
      Object.assign(destaque.style, { display: "block", left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
      return;
    }
    if (dragStart) drawSelection({ x: event.clientX - m.left, y: event.clientY - m.top });
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

  function drawSelection(point) {
    const r = selection(dragStart, point);
    Object.assign(retangulo.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
    medida.textContent = `${Math.round(r.w)} × ${Math.round(r.h)}`;
    const m = mesaBox();
    medida.style.left = `${clamp(point.x + 14, 4, m.width - 90)}px`;
    medida.style.top = `${clamp(point.y + 14, 4, m.height - 24)}px`;
  }

  /** The shutter: a flash over what was taken, then the print flies into the drawer. */
  function capture(area) {
    Object.assign(flash.style, { left: `${area.x}px`, top: `${area.y}px`, width: `${area.w}px`, height: `${area.h}px` });
    const print = makePrint(area);
    if (!still.matches) {
      flash.animate([{ opacity: 0.85 }, { opacity: 0 }], { duration: 320, easing: "ease-out" });
    }
    receive(print, area);
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
    const startScale = from.w / target.w;

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
      if (press.hit.part !== "ficha") return;
      startDrag(press.hit.print);
      press.dragging = true;
    }
    moveDrag(event);
  }

  function startDrag(print) {
    const ids = drawer.selection.has(print.id) ? selectedPrints().map((p) => p.id) : [print.id];
    drawer.dragging = new Set(ids);
    drawer.hovered = null;
    const ghost = document.createElement("div");
    ghost.className = "fantasma";
    const size = { w: 132, h: Math.round((132 * print.h) / print.w) };
    if (size.h > 110) { size.h = 110; size.w = Math.round((110 * print.w) / print.h); }
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
      clearTimeout(awayTimer);
      awayTimer = setTimeout(closeDrawer, 450);
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
    } else {
      ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: "forwards" }).onfinish = () => ghost.remove();
      render();
    }
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

  // ── the guide: three small steps, the first time ─────────────────────────

  const guide = (() => {
    const box = $("#guia");
    const step = $("#guia-passo");
    const text = $("#guia-texto");
    let current = 0;
    let off = false;
    let paused = false;
    let hideTimer = 0;
    const steps = {
      1: () => ({
        passo: "1 de 3",
        texto: finger.matches
          ? "<b>Tire um print.</b> Toque em <b>Tela</b>, ou em <b>Seleção</b> e arraste o dedo sobre o que quiser."
          : "<b>Tire um print.</b> Escolha <b>Seleção</b> e arraste sobre a loja, ou sobre qualquer coisa.",
        alvo: $(".captura"),
        seta: "baixo",
      }),
      2: () => ({
        passo: "2 de 3",
        texto: finger.matches
          ? "<b>Ele caiu na gaveta.</b> Toque na borda de madeira, à direita, para abrir."
          : "<b>Ele caiu na gaveta.</b> Encoste o ponteiro na borda direita da tela para abrir.",
        alvo: corpo,
        seta: "direita",
      }),
      3: () => ({
        passo: "3 de 3",
        texto: finger.matches
          ? "<b>Escolha vários</b> pela bolinha e toque em <b>Copiar todos</b>. Depois, <b>Colar</b> no chamado."
          : "<b>Escolha vários</b> pela bolinha e clique em <b>Copiar todos</b>. Depois, <b>⌘V</b> no chamado.",
        alvo: corpo,
        seta: "direita",
      }),
      4: () => ({
        passo: "Pronto",
        texto: `${finger.matches ? "Um toque" : "Um ⌘V"}, todos os prints, na ordem em que foram tirados. É isso que a Gaveta faz no seu Mac.`,
        alvo: chamado,
        seta: "esquerda",
      }),
    };

    function place() {
      mesa.classList.toggle("guia-no-inicio", !off && !paused && current === 1);
      if (off || paused || !current) return;
      const s = steps[current]();
      step.textContent = s.passo;
      text.innerHTML = s.texto;
      box.hidden = false;
      box.classList.remove("saindo");
      box.dataset.seta = s.seta;
      const m = mesaBox();
      const target = s.alvo && shown(s.alvo) ? onDesk(s.alvo.getBoundingClientRect()) : null;
      const w = box.offsetWidth, h = box.offsetHeight;
      let x, y;
      if (narrow() && current === 4) {
        box.dataset.seta = "nenhuma";
        x = (m.width - w) / 2;
        y = onDesk($(".captura").getBoundingClientRect()).y - h - 12;
      } else if (!target) {
        box.dataset.seta = "nenhuma";
        x = (m.width - w) / 2;
        y = m.height - h - 170;
      } else if (s.seta === "baixo") {
        x = target.x + target.w / 2 - w / 2;
        y = target.y - h - 14;
      } else if (s.seta === "esquerda") {
        // beside the ticket, level with its attachments
        const shelf = onDesk(anexos.getBoundingClientRect());
        x = target.x + target.w + 16;
        y = shelf.y + shelf.h / 2 - h / 2;
      } else {
        // beside the drawer: by its top for the edge, by the front card's circle for choosing
        const visibleLeft = m.width - drawerWidth + slide();
        const top = (parseFloat(getComputedStyle(gaveta).top) || 28) + placement.top;
        const scroll = Math.max(0, layout.height - (placement.height - L.rail * 2 - L.footer));
        const frontDot = top + L.rail + (layout.tops[drawer.prints.length - 1] ?? 0) - scroll + 24;
        x = visibleLeft - w - 16;
        y = current === 3 ? frontDot - h / 2 : top + Math.min(150, placement.height / 2) - h / 2;
        // never over the page's own words: below them, still beside the drawer
        const words = onDesk($(".abertura").getBoundingClientRect());
        if (overlaps({ x, y, w, h }, { x: words.x - 12, y: words.y - 12, w: words.w + 24, h: words.h + 24 })) {
          y = words.y + words.h + 14;
        }
      }
      const cx = clamp(x, 10, m.width - w - 10);
      if (s.seta === "baixo" && cx !== x) box.dataset.seta = "nenhuma";
      box.style.left = `${cx}px`;
      box.style.top = `${clamp(y, 40, m.height - h - 10)}px`;
    }

    function go(next) {
      if (off || next <= current) return;
      current = next;
      paused = false;
      clearTimeout(hideTimer);
      place();
      if (next === 4) hideTimer = setTimeout(() => api.hide(true), 8000);
    }

    const api = {
      start: () => setTimeout(() => go(1), 900),
      captured: () => {
        if (!drawer.open) go(2);
        else if (!narrow()) go(3);
      },
      // On a phone the drawer covers the desk: the bar at its foot says what to do, and the guide waits.
      drawerOpened: () => {
        if (narrow()) api.hide();
        else if (current >= 1 && current < 3) go(3);
      },
      chose: () => {},
      copied: () => {},
      pasted: (count) => { if (count > 0) go(4); },
      hide: (forever) => {
        if (forever) off = true;
        paused = !forever;
        mesa.classList.remove("guia-no-inicio");
        if (box.hidden) return;
        box.classList.add("saindo");
        setTimeout(() => { if (off || paused) box.hidden = true; }, 250);
      },
      resume: () => {
        paused = false;
        place();
      },
      place,
    };
    $("#guia-fechar").addEventListener("click", () => api.hide(true));
    // The drawer slides and grows: the arrow follows it.
    corpo.addEventListener("transitionend", (event) => { if (event.target === corpo) place(); });
    addEventListener("resize", () => place());
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
