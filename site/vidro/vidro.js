// The Gaveta landing: one screen, a Mac desk where the glass drawer works as
// the app does. The bar below takes a screenshot of the desk (all of it, a
// window, or a selection): a still copy of what is there, which flies into the
// drawer at the right edge, laid out the way the app lays its cards out. Pick,
// copy, throw out, widen the drawer by its elastic grip, and paste into the
// ticket with ⌘V or by dragging a card onto it.
(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const wait = (ms) => new Promise((done) => setTimeout(done, ms));
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  const phone = () => innerWidth <= 760;
  const ROOT = document.documentElement.dataset.raiz || "";
  const aviso = $("#aviso");
  const announce = (text) => {
    aviso.textContent = "";
    requestAnimationFrame(() => { aviso.textContent = text; });
  };

  $("[data-idioma]").addEventListener("click", (event) => {
    try { localStorage.setItem("gaveta-idioma", event.currentTarget.dataset.idioma); } catch {}
  });

  // The install command: the button copies all of it; where the clipboard is
  // out of reach, the command is selected for ⌘C instead.
  const comando = $("#comando-texto");
  const fades = () => comando.classList.toggle("continua", comando.scrollLeft + comando.clientWidth < comando.scrollWidth - 2);
  comando.addEventListener("scroll", fades, { passive: true });
  addEventListener("resize", fades);
  fades();
  for (const button of $$("[data-copiar]")) {
    let timer = 0;
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copiar);
        button.classList.add("copiado");
        announce("Comando copiado. Cole no Terminal.");
      } catch {
        getSelection()?.selectAllChildren(comando);
        announce("Comando selecionado. Copie com ⌘C e cole no Terminal.");
      }
      clearTimeout(timer);
      timer = setTimeout(() => button.classList.remove("copiado"), 1600);
    });
  }

  const relogio = $("#relogio");
  const tick = () => {
    relogio.textContent = new Intl.DateTimeFormat(document.documentElement.lang, { weekday: "short", hour: "2-digit", minute: "2-digit" })
      .format(new Date()).replace(/\.,?/g, "");
  };
  tick();
  setInterval(tick, 20000);

  // ── the desk ────────────────────────────────────────────────────────────

  const mesa = $("#mesa");
  const mesaBox = () => mesa.getBoundingClientRect();
  /** A rectangle on the screen, in the desk's own coordinates. */
  const onDesk = (rect) => {
    const m = mesaBox();
    return { x: rect.left - m.left, y: rect.top - m.top, w: rect.width, h: rect.height };
  };
  const onScreen = (area) => {
    const m = mesaBox();
    return { left: area.x + m.left, top: area.y + m.top, width: area.w, height: area.h };
  };
  const shown = (el) => !el.hidden && el.getClientRects().length > 0;
  /** While something is being dragged, no text on the page gets selected on the way. */
  const noSelecting = (on) => {
    document.documentElement.classList.toggle("sem-selecao", on);
    if (on) getSelection()?.removeAllRanges();
  };

  // Windows come to the front when touched, and move by their title bars.
  const appName = $("#app-da-frente");
  const windows = $$(".janela");
  let stacking = 10;
  function activate(win) {
    for (const w of windows) w.classList.toggle("ativa", w === win);
    if (win) win.style.zIndex = String(++stacking);
    appName.textContent = win ? win.dataset.app : "Finder";
  }
  for (const win of windows) {
    win.addEventListener("pointerdown", () => activate(win));
    const handle = $(".janela-barra", win) || win;
    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || phone()) return;
      event.preventDefault();
      const start = onDesk(win.getBoundingClientRect());
      const x0 = event.clientX;
      const y0 = event.clientY;
      handle.setPointerCapture(event.pointerId);
      handle.style.cursor = "grabbing";
      const move = (e) => {
        const m = mesaBox();
        win.style.right = "auto";
        win.style.bottom = "auto";
        win.style.left = `${clamp(start.x + e.clientX - x0, 90 - win.offsetWidth, m.width - 90)}px`;
        win.style.top = `${clamp(start.y + e.clientY - y0, 30, m.height - 40)}px`;
      };
      const up = () => {
        handle.style.cursor = "";
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", up);
        handle.removeEventListener("pointercancel", up);
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", up);
      handle.addEventListener("pointercancel", up);
    });
  }
  activate($("#loja"));

  // The shop still fails, every time.
  const lojaErro = $("#loja-erro");
  $("#loja-pagar").addEventListener("click", () => {
    lojaErro.classList.remove("de-novo");
    void lojaErro.offsetWidth;
    lojaErro.classList.add("de-novo");
  });

  // ── prints ──────────────────────────────────────────────────────────────

  let serial = 0;
  /** Every print by id, the thrown-out ones too, for what was copied before. */
  const everyPrint = new Map();
  const SAMPLES = {
    canvas: { src: "assets/prints/canvas.png", w: 1380, h: 360 },
    paleta: { src: "assets/prints/paleta.png", w: 520, h: 640 },
    painel: { src: "assets/prints/painel.png", w: 980, h: 560 },
  };
  function sample(name, age) {
    const print = { ...SAMPLES[name], id: ++serial, date: Date.now() - age * 1000 };
    print.src = ROOT + print.src;
    everyPrint.set(print.id, print);
    return print;
  }

  /** A still copy of the desk, cut to `area`. */
  function snapshot(area) {
    const m = mesaBox();
    const copy = mesa.cloneNode(false);
    copy.removeAttribute("id");
    copy.classList.add("mesa-copia");
    copy.style.width = `${m.width}px`;
    copy.style.height = `${m.height}px`;
    copy.style.transform = `translate(${-area.x}px, ${-area.y}px)`;
    for (const child of mesa.children) if (shown(child)) copy.append(child.cloneNode(true));
    // a scroll position is not cloned: the command keeps the slice that was on screen as an indent
    const line = copy.querySelector(".comando-texto");
    if (line && comando.scrollLeft) line.style.textIndent = `${-comando.scrollLeft}px`;
    for (const el of [copy, ...copy.querySelectorAll("*")]) {
      el.removeAttribute("id");
      el.removeAttribute("aria-live");
      el.removeAttribute("role");
      if (el.matches("a, button")) el.setAttribute("tabindex", "-1");
    }
    copy.setAttribute("inert", "");
    copy.setAttribute("aria-hidden", "true");
    const frame = document.createElement("span");
    frame.className = "retrato";
    frame.style.width = `${area.w}px`;
    frame.style.height = `${area.h}px`;
    frame.append(copy);
    return frame;
  }
  function takePrint(area) {
    const print = { id: ++serial, w: Math.round(area.w), h: Math.round(area.h), date: Date.now(), portrait: snapshot(area) };
    everyPrint.set(print.id, print);
    return print;
  }

  /** Puts the print into `box`, `width` × `height`, filling it or, with `fit`, whole inside it. */
  function paint(box, print, width, height, fit = false) {
    let inner = box.firstElementChild;
    if (!inner) {
      inner = print.src ? Object.assign(document.createElement("img"), { src: print.src, alt: "", draggable: false }) : document.createElement("span");
      if (!print.src) {
        inner.className = "foto-escala";
        inner.append(print.portrait.cloneNode(true));
      }
      box.append(inner);
    }
    box.style.width = `${width}px`;
    box.style.height = `${height}px`;
    if (print.src) {
      inner.style.cssText = `width:100%;height:100%;object-fit:${fit ? "contain" : "fill"}`;
      return;
    }
    const k = fit ? Math.min(width / print.w, height / print.h) : width / print.w;
    inner.style.transform = `translate(${fit ? (width - print.w * k) / 2 : 0}px, ${fit ? (height - print.h * k) / 2 : 0}px) scale(${k})`;
  }
  function picture(print, width, height, fit) {
    const box = document.createElement("span");
    box.className = "foto";
    paint(box, print, width, height, fit);
    return box;
  }

  // ── the drawer ──────────────────────────────────────────────────────────

  const gaveta = $("#gaveta");
  const painel = $("#painel");
  const fichas = $("#fichas");
  const barra = $("#barra");
  const conta = $("#conta");
  const quedas = $("#quedas");
  const alca = $("#alca");
  const borda = $("#borda-alca");
  const trayButton = $("#menus-gaveta");
  const pilha = document.createElement("div");
  pilha.className = "pilha";
  fichas.append(pilha);

  const drawer = {
    prints: [sample("canvas", 2 * 3600), sample("paleta", 37 * 60), sample("painel", 12 * 60)], // back (oldest) to front (newest)
    selection: new Set(),
    copied: new Set(),
    arriving: new Set(),
    hovered: null,
    open: false,
    pinned: false,
    width: 300,            // the box the cards stand in
    stretch: 0,            // pulled past a limit
  };
  const CAPACITY = 9;

  const S = { left: 30, right: 14, border: 8, meta: 24, top: 18, bottom: 12, minReveal: 76, gap: 12, words: 96, slot: 96 };
  const L = { rail: 10, footer: 44, top: 44 };
  const front = () => (phone() ? 50 : 58);
  /** On a phone the tip floats over the drawer's bottom, so the drawer ends above it. */
  const guideRoom = () => {
    const tip = $("#guia");
    return tip.hidden || getComputedStyle(tip).display === "none" ? 0 : tip.offsetHeight + 10;
  };
  const bottomRoom = () => (phone() ? 84 + guideRoom() : 16);
  /** The width the drawer opens at: the app's 300, or less on a screen too narrow for it. */
  const standard = () => clamp(innerWidth - front() - 26, 220, 300);
  const widest = () => Math.max(standard(), Math.min(600, innerWidth / 2 - front()));

  /** The card's measures for a box this wide, as CardStack has them. */
  function measures(box) {
    const cardW = box - S.left - S.right;
    const photoW = cardW - S.border * 2;
    const photoH = Math.round((photoW * 10) / 16);
    const cardH = S.border + photoH + S.meta;
    const bandW = Math.min(150, cardW - S.border * 2 - 10 - S.words);
    return { cardW, photoW, photoH, cardH, full: cardH + 4, bandW, wordsX: S.border + bandW + 10, wordsW: cardW - (S.border + bandW + 10) - S.border };
  }
  const slotFor = (m, reveal) => {
    const room = Math.min(m.photoH, reveal - S.border - S.meta);
    return room >= Math.min(S.slot, m.photoH) ? room : null;
  };
  function photoSize(m, print, reveal) {
    const slot = slotFor(m, reveal);
    const maxW = slot === null ? m.bandW : m.photoW;
    const maxH = slot ?? Math.max(28, reveal - S.border - 4);
    const aspect = print.w / print.h;
    let w = maxW;
    let h = w / aspect;
    if (h > maxH) { h = maxH; w = h * aspect; }
    return { w: Math.max(1, Math.round(w)), h: Math.max(1, Math.round(h)), slot };
  }
  /** Where each card stands, from the back: the front ones whole, the older ones giving up room down to a band. */
  function stackOf(m, count, hovered, room) {
    const reveals = Array(count).fill(m.full);
    if (count > 1) {
      const behind = count - 1;
      let budget = room - S.top - m.cardH - S.bottom;
      for (let distance = 1; distance <= behind; distance++) {
        const index = count - 1 - distance;
        const kept = (behind - distance) * S.minReveal;
        const share = Math.min(m.full, Math.max(S.minReveal, budget - kept));
        reveals[index] = share;
        budget -= share;
      }
    }
    if (hovered !== null && hovered < count - 1) reveals[hovered] = Math.max(reveals[hovered], m.cardH + S.gap);
    const tops = [];
    let y = S.top;
    for (const r of reveals) { tops.push(y); y += r; }
    const reveal = (i) => (i === count - 1 ? m.cardH : reveals[i]);
    return { tops, reveal, height: count ? tops[count - 1] + m.cardH + S.bottom : 0 };
  }

  const shiftOf = (hovered, selected) => (selected ? (hovered ? -26 : -22) : hovered ? -10 : 0);
  const ago = (date) => {
    const s = (Date.now() - date) / 1000;
    if (s < 60) return "agora";
    if (s < 3600) return `há ${Math.floor(s / 60)} min`;
    return `há ${Math.floor(s / 3600)} h`;
  };

  const CROSS = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';
  const cards = new Map();
  function cardFor(print) {
    let card = cards.get(print.id);
    if (card) return card;
    card = document.createElement("div");
    card.className = "ficha";
    card.setAttribute("role", "listitem");
    card.innerHTML = `<span class="ficha-foto"></span>
      <div class="ficha-legenda"><span class="o-que"></span><span class="idade"></span></div>
      <div class="ficha-faixa"><span class="tipo">Print</span><span class="tamanho"></span><span class="idade"></span></div>
      <span class="ficha-bolinha"></span><span class="ficha-x">${CROSS}</span><span class="ficha-copiado">✓ Copiado</span>`;
    cards.set(print.id, card);
    pilha.append(card);
    return card;
  }

  let layout = null;
  let measure = measures(300);
  let placement = { top: L.top, height: 200 };
  /** Where each card's picture stands inside its card, from the last render. */
  const geometry = new Map();

  function render() {
    const list = drawer.prints;
    const box = drawer.width + drawer.stretch;
    measure = measures(box);
    const most = innerHeight - L.top - bottomRoom();
    const hoveredIndex = list.findIndex((p) => p.id === drawer.hovered);
    const room = most - L.rail * 2 - L.footer;
    const rest = stackOf(measure, list.length, null, room);
    layout = stackOf(measure, list.length, hoveredIndex >= 0 ? hoveredIndex : null, room);
    const restHeight = list.length ? Math.min(L.rail * 2 + rest.height + L.footer, most) : 200;
    const top = L.top + Math.max(0, (most - restHeight) / 2);
    const height = list.length ? Math.min(L.rail * 2 + layout.height + L.footer, innerHeight - top - bottomRoom()) : 200;
    placement = { top, height };
    gaveta.style.setProperty("--frente", `${front()}px`);
    gaveta.style.setProperty("--largura", `${box}px`);
    gaveta.style.setProperty("--topo", `${top}px`);
    gaveta.style.setProperty("--altura", `${height}px`);
    gaveta.classList.toggle("esta-vazia", list.length === 0);
    gaveta.classList.toggle("escolhendo", drawer.selection.size > 0);
    conta.textContent = String(list.length);
    pilha.style.height = `${layout.height}px`;
    pilha.style.width = `${box}px`;

    const keep = new Set(list.map((p) => p.id));
    for (const [id, card] of cards) if (!keep.has(id)) { card.remove(); cards.delete(id); }
    list.forEach((print, index) => {
      const card = cardFor(print);
      const hovered = drawer.hovered === print.id;
      const selected = drawer.selection.has(print.id);
      const reveal = layout.reveal(index);
      const photo = photoSize(measure, print, reveal);
      const whole = photo.slot !== null;
      const slotW = whole ? measure.photoW : measure.bandW;
      const photoTop = whole ? S.border + Math.round((photo.slot - photo.h) / 2) : S.border;
      card.style.width = `${measure.cardW}px`;
      card.style.height = `${measure.cardH}px`;
      card.style.zIndex = String(index + 1);
      card.style.transform = `translate(${S.left + shiftOf(hovered, selected)}px, ${layout.tops[index]}px)${hovered ? " scale(1.012)" : ""}`;
      card.classList.toggle("aberta", hovered);
      card.classList.toggle("escolhida", selected);
      card.classList.toggle("copiada", drawer.copied.has(print.id));
      card.classList.toggle("chegando", drawer.arriving.has(print.id));
      const foto = $(".ficha-foto", card);
      paint(foto, print, photo.w, photo.h);
      foto.style.transform = `translate(${S.border + (slotW - photo.w) / 2}px, ${photoTop}px)`;
      geometry.set(print.id, { x: S.border + (slotW - photo.w) / 2, y: photoTop, w: photo.w, h: photo.h });
      const legenda = $(".ficha-legenda", card);
      const faixa = $(".ficha-faixa", card);
      legenda.style.display = whole ? "flex" : "none";
      faixa.style.display = whole ? "none" : "grid";
      const what = `Print · ${print.w} × ${print.h}`;
      if (whole) {
        legenda.style.left = `${S.border + 2}px`;
        legenda.style.top = `${S.border + photo.slot + 6}px`;
        legenda.style.width = `${measure.photoW - 4}px`;
        $(".o-que", legenda).textContent = what;
        $(".idade", legenda).textContent = ago(print.date);
      } else {
        faixa.style.left = `${measure.wordsX}px`;
        faixa.style.top = `${S.border + 3}px`;
        faixa.style.width = `${measure.wordsW}px`;
        $(".tamanho", faixa).textContent = `${print.w} × ${print.h}`;
        $(".idade", faixa).textContent = ago(print.date);
      }
      const badge = $(".ficha-copiado", card);
      badge.style.left = `${S.border + slotW / 2}px`;
      badge.style.top = `${photoTop + photo.h / 2}px`;
      card.setAttribute("aria-label", `${what}, ${ago(print.date)}${selected ? ", escolhido" : ""}`);
    });
    renderBar();
  }
  setInterval(() => { if (drawer.open) render(); }, 30000);

  const CIRCLE = '<svg viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.9" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M3.8 6.1 5.3 7.6 8.3 4.5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const COPY = '<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="3.6" y="3.6" width="6.4" height="6.9" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M2 8V2.6A.9.9 0 0 1 2.9 1.7h4.6" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';
  const SMALL_CROSS = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3 3 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
  function renderBar() {
    const count = drawer.selection.size;
    const total = drawer.prints.length;
    const key = `${count}/${total}`;
    if (barra.dataset.chave === key) return;
    barra.dataset.chave = key;
    barra.innerHTML = count === 0
      ? (total > 1
        ? `<button class="pilula-barra" type="button" data-acao="todos">${CIRCLE}Selecionar todos</button><span class="espaco"></span><span>${fine.matches ? "⌘-clique escolhe vários" : "toque nos círculos"}</span>`
        : `<span>${fine.matches ? "Clique para copiar" : "Toque para copiar"}</span>`)
      : `<span class="quantos">${count} de ${total}</span><span class="espaco"></span>
        ${count < total ? `<button class="pilula-barra" type="button" data-acao="todos">${CIRCLE}Todos</button>` : ""}
        <button class="pilula-barra principal" type="button" data-acao="copiar">${COPY}${count === 1 ? "Copiar" : "Copiar todos"}</button>
        <button class="pilula-barra so-icone" type="button" data-acao="limpar" aria-label="Limpar seleção">${SMALL_CROSS}</button>`;
  }
  barra.addEventListener("click", (event) => {
    const action = event.target.closest("[data-acao]")?.dataset.acao;
    if (action === "todos") { drawer.prints.forEach((p) => drawer.selection.add(p.id)); render(); }
    if (action === "copiar") copy([...drawer.selection]);
    if (action === "limpar") { drawer.selection.clear(); render(); }
  });

  // ── finding the card under the pointer: tested against where cards are headed ──

  function hitAt(clientX, clientY, wide) {
    if (!layout || !drawer.open) return null;
    const r = pilha.getBoundingClientRect();
    const box = fichas.getBoundingClientRect();
    if (clientY < box.top || clientY > box.bottom || clientX < box.left - 12) return null;
    const x = clientX - r.left;
    const y = clientY - r.top;
    const list = drawer.prints;
    for (let i = list.length - 1; i >= 0; i--) {
      const print = list[i];
      const left = S.left + shiftOf(drawer.hovered === print.id, drawer.selection.has(print.id));
      const top = layout.tops[i];
      if (y < top || y >= top + measure.cardH) continue;
      if (!wide && (x < left || x > left + measure.cardW)) continue;
      const lx = x - left;
      const ly = y - top;
      if (lx >= 4 && lx < 42 && ly >= 4 && ly < 42) return { print, part: "bolinha" };
      if (lx >= measure.cardW - 42 && lx < measure.cardW - 4 && ly >= 4 && ly < 42) return { print, part: "x" };
      return { print, part: "ficha" };
    }
    const hi = list.findIndex((p) => p.id === drawer.hovered);
    if (hi >= 0 && hi < list.length - 1) {
      const top = layout.tops[hi] + measure.cardH;
      if (y >= top && y < layout.tops[hi + 1]) return { print: list[hi], part: "ficha" };
    }
    return null;
  }

  // Hover takes the card's whole row, and lets go only a moment after the
  // pointer left every card, as the app does.
  const pointer = { x: -1, y: -1 };
  let letGo = 0;
  function hover(clientX, clientY) {
    if (resizing || dragging) return;
    const found = hitAt(clientX, clientY, true);
    if (found) {
      clearTimeout(letGo);
      letGo = 0;
      if (drawer.hovered !== found.print.id) { drawer.hovered = found.print.id; render(); }
      return;
    }
    if (drawer.hovered !== null && !letGo) {
      letGo = setTimeout(() => {
        letGo = 0;
        const again = hitAt(pointer.x, pointer.y, true);
        const id = again ? again.print.id : null;
        if (drawer.hovered !== id) { drawer.hovered = id; render(); }
      }, 300);
    }
  }
  fichas.addEventListener("pointermove", (event) => { if (event.pointerType === "mouse") hover(event.clientX, event.clientY); });
  fichas.addEventListener("scroll", () => hover(pointer.x, pointer.y), { passive: true });

  let dragged = false;
  pilha.addEventListener("click", (event) => {
    if (dragged) { dragged = false; return; }
    const found = hitAt(event.clientX, event.clientY, false);
    if (!found) return;
    const { print, part } = found;
    const marks = drawer.hovered === print.id || !fine.matches;
    if (part === "x" && marks) return discard(print.id);
    if ((part === "bolinha" && (marks || drawer.selection.size)) || event.metaKey || event.ctrlKey) return toggle(print.id);
    if (event.shiftKey && drawer.selection.size) return extend(print.id);
    if (drawer.selection.size > 1 && drawer.selection.has(print.id)) return copy([...drawer.selection]);
    copy([print.id]);
  });

  let anchor = null;
  function toggle(id) {
    if (drawer.selection.has(id)) drawer.selection.delete(id); else drawer.selection.add(id);
    anchor = id;
    announce(`${drawer.selection.size} escolhidos.`);
    render();
  }
  function extend(id) {
    const list = drawer.prints.map((p) => p.id);
    const from = list.indexOf(anchor ?? [...drawer.selection].pop());
    const to = list.indexOf(id);
    for (let i = Math.min(from, to); i <= Math.max(from, to); i++) drawer.selection.add(list[i]);
    render();
  }

  // ── copying and pasting: one item per print, oldest first, as in the app ──

  let clipboard = [];
  let copiedTimer = 0;
  const colar = $("#colar");
  const anexos = $("#anexos");
  const anexosVazio = $("#anexos-vazio");
  const anexosConta = $("#anexos-conta");
  const chamado = $("#chamado");
  if (!fine.matches) anexosVazio.textContent = "Copie na gaveta e toque em Colar, ou arraste da gaveta.";

  function copy(ids) {
    const prints = drawer.prints.filter((p) => ids.includes(p.id));
    if (!prints.length) return;
    clipboard = prints.map((p) => p.id);
    drawer.copied = new Set(clipboard);
    render();
    clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => { drawer.copied.clear(); render(); }, 1200);
    colar.hidden = false;
    colar.textContent = prints.length > 1 ? `Colar ${prints.length} prints` : "Colar";
    anexos.classList.add("com-copia");
    guide.done("copiar");
    announce(prints.length === 1 ? "Print copiado. Cole no chamado com ⌘V." : `${prints.length} prints copiados. Um ⌘V no chamado cola todos.`);
  }

  let attached = 0;
  function attach(prints) {
    if (!prints.length) return;
    activate(chamado);
    anexosVazio.hidden = true;
    const width = Math.max(56, (anexos.clientWidth - 16 - 16) / 3);
    for (const print of prints) {
      const figure = document.createElement("figure");
      figure.className = "anexo chegou";
      figure.append(picture(print, width, (width * 3) / 4, true));
      anexos.insertBefore(figure, colar);
    }
    attached += prints.length;
    anexosConta.textContent = `· ${attached}`;
    anexos.scrollTop = anexos.scrollHeight;
    guide.done("colar");
    announce(prints.length === 1 ? "1 print colado no chamado." : `${prints.length} prints colados no chamado, de uma vez.`);
  }
  function paste() {
    const prints = clipboard.map((id) => everyPrint.get(id)).filter(Boolean);
    if (!prints.length) return;
    clipboard = [];
    colar.hidden = true;
    anexos.classList.remove("com-copia");
    if (drawer.open && !drawer.hovered) close();
    attach(prints);
  }
  colar.addEventListener("click", paste);
  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "v" && clipboard.length) {
      event.preventDefault();
      paste();
    }
  });

  // Dragging cards out of the drawer: onto the ticket they go in, as attachments.
  let dragging = false;
  pilha.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.pointerType !== "mouse" || event.metaKey || event.ctrlKey || event.shiftKey) return;
    const found = hitAt(event.clientX, event.clientY, false);
    if (!found || found.part !== "ficha") return;
    event.preventDefault(); // a press that may become a drag never starts a text selection
    const x0 = event.clientX;
    const y0 = event.clientY;
    let ghost = null;
    let over = false;
    const ids = drawer.selection.has(found.print.id) ? drawer.prints.filter((p) => drawer.selection.has(p.id)).map((p) => p.id) : [found.print.id];
    const move = (e) => {
      if (!ghost) {
        if (Math.hypot(e.clientX - x0, e.clientY - y0) < 6) return;
        dragging = true;
        noSelecting(true);
        dragged = true;
        drawer.hovered = null;
        render();
        const print = found.print;
        const w = 150;
        const h = Math.max(30, Math.min(150, (w * print.h) / print.w));
        ghost = document.createElement("div");
        ghost.className = "arrasto";
        ghost.style.width = `${w}px`;
        ghost.style.height = `${h}px`;
        const shot = document.createElement("span");
        shot.className = "retrato";
        shot.style.cssText = `width:${w}px;height:${h}px`;
        shot.append(picture(print, w, h, true));
        ghost.append(shot);
        if (ids.length > 1) ghost.insertAdjacentHTML("beforeend", `<span class="arrasto-conta">${ids.length}</span>`);
        quedas.append(ghost);
      }
      ghost.style.transform = `translate(${e.clientX - 40}px, ${e.clientY - 24}px) rotate(-3deg)`;
      const r = chamado.getBoundingClientRect();
      over = shown(chamado) && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      anexos.classList.toggle("alvo", over);
    };
    const up = () => {
      removeEventListener("pointermove", move, true);
      removeEventListener("pointerup", up, true);
      removeEventListener("pointercancel", up, true);
      anexos.classList.remove("alvo");
      dragging = false;
      noSelecting(false);
      if (!ghost) return;
      ghost.remove();
      if (over) attach(ids.map((id) => everyPrint.get(id)).filter(Boolean));
    };
    addEventListener("pointermove", move, true);
    addEventListener("pointerup", up, true);
    addEventListener("pointercancel", up, true);
  });

  /** Thrown out: pulled by the corner, eased as it clears the drawer, then falling, turning over. */
  function discard(id) {
    const index = drawer.prints.findIndex((p) => p.id === id);
    if (index < 0) return;
    const card = cards.get(id);
    if (card && !still.matches) {
      const at = card.getBoundingClientRect();
      const flyer = card.cloneNode(true);
      flyer.classList.remove("aberta", "copiada");
      flyer.style.cssText = `width:${at.width}px;height:${at.height}px;left:${at.left}px;top:${at.top}px;transform:none;z-index:1`;
      quedas.append(flyer);
      const fall = innerHeight - at.top + 40;
      flyer.animate([
        { transform: "none", opacity: 1 },
        { transform: "translate(-90px, -30px) rotate(-6deg) scale(1.04)", opacity: 1, offset: 0.3, easing: "cubic-bezier(.55,0,.9,.6)" },
        { transform: `translate(-190px, ${fall}px) rotate(-37deg) scale(0.9)`, opacity: 0.6 },
      ], { duration: 640, easing: "ease-out" }).finished.then(() => flyer.remove());
    }
    drawer.prints.splice(index, 1);
    drawer.selection.delete(id);
    drawer.copied.delete(id);
    if (drawer.hovered === id) drawer.hovered = null;
    render();
    announce("Print na lixeira.");
    // the card now under the pointer opens at once
    setTimeout(() => hover(pointer.x, pointer.y), 20);
  }

  // ── taking a screenshot ─────────────────────────────────────────────────

  const camada = $("#camada");
  const retangulo = $("#retangulo");
  const medida = $("#medida");
  const destaque = $("#destaque");
  const clarao = $("#clarao");
  const modos = $$(".captura-modo");
  const sombras = Object.fromEntries($$(".sombra").map((el) => [el.dataset.lado, el]));
  let mode = null;
  let dragStart = null;

  function enterMode(next) {
    if (mode === next) return leaveMode();
    mode = next;
    for (const button of modos) if (button.hasAttribute("aria-pressed")) button.setAttribute("aria-pressed", String(button.dataset.modo === next));
    if (drawer.open) close();
    camada.hidden = false;
    camada.classList.toggle("janelas", next === "janela");
    camada.classList.remove("escolhendo");
    destaque.style.display = "none";
    guide.show();
  }
  function leaveMode() {
    mode = null;
    dragStart = null;
    for (const button of modos) if (button.hasAttribute("aria-pressed")) button.setAttribute("aria-pressed", "false");
    camada.hidden = true;
    guide.show();
  }
  for (const button of modos) {
    button.addEventListener("click", () => {
      if (button.dataset.modo !== "tela") return enterMode(button.dataset.modo);
      leaveMode();
      const m = mesaBox();
      const x = Math.max(0, -m.left);
      const y = Math.max(0, -m.top);
      capture({ x, y, w: Math.min(innerWidth, m.right) - Math.max(0, m.left), h: Math.min(innerHeight, m.bottom) - Math.max(0, m.top) });
    });
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && mode) { event.stopImmediatePropagation(); leaveMode(); }
  }, true);

  /** The window under a point, topmost first. */
  function windowAt(clientX, clientY) {
    return windows.filter(shown)
      .sort((a, b) => (+b.style.zIndex || 0) - (+a.style.zIndex || 0))
      .find((win) => {
        const r = win.getBoundingClientRect();
        return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
      });
  }
  function selection(a, b) {
    const m = mesaBox();
    const x = clamp(Math.min(a.x, b.x), 0, m.width);
    const y = clamp(Math.min(a.y, b.y), 0, m.height);
    return { x, y, w: clamp(Math.max(a.x, b.x), 0, m.width) - x, h: clamp(Math.max(a.y, b.y), 0, m.height) - y };
  }
  function drawSelection(point) {
    const r = selection(dragStart, point);
    const s = onScreen(r);
    const W = innerWidth;
    const H = innerHeight;
    const top = clamp(s.top, 0, H);
    const bottom = clamp(s.top + s.height, 0, H);
    sombras.cima.style.transform = `scale(1, ${top / H})`;
    sombras.baixo.style.transform = `translate(0, ${bottom}px) scale(1, ${(H - bottom) / H})`;
    sombras.esquerda.style.transform = `translate(0, ${top}px) scale(${s.left / W}, ${(bottom - top) / H})`;
    sombras.direita.style.transform = `translate(${s.left + s.width}px, ${top}px) scale(${(W - s.left - s.width) / W}, ${(bottom - top) / H})`;
    retangulo.style.transform = `translate(${s.left}px, ${s.top}px)`;
    retangulo.style.width = `${s.width}px`;
    retangulo.style.height = `${s.height}px`;
    medida.textContent = `${Math.round(r.w)} × ${Math.round(r.h)}`;
    const p = onScreen({ x: point.x, y: point.y, w: 0, h: 0 });
    medida.style.transform = `translate(${clamp(p.left + 14, 4, W - 90)}px, ${clamp(p.top + 14, 4, H - 24)}px)`;
  }

  camada.addEventListener("pointerdown", (event) => {
    if (mode === "janela") {
      const win = windowAt(event.clientX, event.clientY);
      // a click on the bare desk leaves the mode, so it never holds you
      if (!win) return leaveMode();
      const area = onDesk(win.getBoundingClientRect());
      leaveMode();
      capture(area);
      return;
    }
    const m = mesaBox();
    event.preventDefault();
    dragStart = { x: event.clientX - m.left, y: event.clientY - m.top };
    camada.setPointerCapture(event.pointerId);
    camada.classList.add("escolhendo");
    drawSelection(dragStart);
  });
  camada.addEventListener("pointermove", (event) => {
    const m = mesaBox();
    if (mode === "janela") {
      const win = windowAt(event.clientX, event.clientY);
      if (!win) { destaque.style.display = "none"; return; }
      const r = win.getBoundingClientRect();
      destaque.style.cssText = `display:block;transform:translate(${r.left}px, ${r.top}px);width:${r.width}px;height:${r.height}px`;
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

  /** The shutter: a flash over what was taken, then the print flies into the drawer. */
  function capture(area) {
    const from = onScreen(area);
    const print = takePrint(area);
    if (!still.matches) {
      Object.assign(clarao.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` });
      clarao.animate([{ opacity: 0.9 }, { opacity: 0 }], { duration: 320, easing: "ease-out" });
    }
    guide.done("tirar");
    requestAnimationFrame(() => setTimeout(() => receive(print, from), 0));
  }

  async function receive(print, from) {
    if (drawer.prints.length >= CAPACITY) drawer.prints.splice(0, drawer.prints.length - CAPACITY + 1);
    drawer.prints.push(print);
    drawer.hovered = null;
    announce("Print guardado na gaveta.");
    if (still.matches) {
      open(true);
      render();
      return;
    }
    drawer.arriving.add(print.id);
    open(true);
    render();
    fichas.scrollTop = fichas.scrollHeight;
    // Where the front card's picture will stand once the drawer has slid out:
    // from the layout, since the drawer is still on its way there.
    const at = geometry.get(print.id);
    const index = drawer.prints.indexOf(print);
    const scroll = Math.max(0, layout.height - (placement.height - L.rail * 2 - L.footer));
    const target = {
      left: document.documentElement.clientWidth - 10 - drawer.width + S.left + at.x,
      top: placement.top + L.rail + layout.tops[index] - scroll + at.y,
      width: at.w,
      height: at.h,
    };
    const flyer = picture(print, from.width, from.height);
    flyer.className = "voando";
    quedas.append(flyer);
    const k = target.width / from.width;
    const ky = target.height / from.height;
    await flyer.animate([
      { transform: `translate(${from.left}px, ${from.top}px)`, opacity: 1 },
      { transform: `translate(${from.left + (target.left - from.left) * 0.3}px, ${from.top - 24}px) scale(${0.55 + k * 0.45}, ${0.55 + ky * 0.45})`, offset: 0.35 },
      { transform: `translate(${target.left}px, ${target.top}px) scale(${k}, ${ky})`, opacity: 1 },
    ], { duration: 640, easing: "cubic-bezier(.3,.7,.2,1)" }).finished;
    flyer.remove();
    drawer.arriving.delete(print.id);
    render();
    gaveta.classList.remove("tranco");
    void gaveta.offsetWidth;
    gaveta.classList.add("tranco");
  }

  // ── opening and closing ─────────────────────────────────────────────────

  let visited = false;
  let away = 0;
  function open(pinned = false) {
    drawer.pinned = drawer.pinned || pinned;
    visited = false;
    clearTimeout(away);
    trayButton.setAttribute("aria-pressed", "true");
    if (drawer.open) return;
    drawer.open = true;
    render();
    gaveta.dataset.estado = "aberta";
    letBorderGo();
    requestAnimationFrame(() => { fichas.scrollTop = fichas.scrollHeight; });
  }
  function close() {
    if (!drawer.open) return;
    drawer.open = false;
    drawer.pinned = false;
    drawer.hovered = null;
    drawer.selection.clear();
    gaveta.dataset.estado = "fechada";
    trayButton.setAttribute("aria-pressed", "false");
    render();
  }
  borda.addEventListener("click", () => open(true));
  trayButton.addEventListener("click", () => (drawer.open ? close() : open(true)));

  // The pointer resting on the screen's right edge pulls the handle taut, then the drawer springs out.
  const DWELL = 260;
  let dwellSince = 0;
  let pull = 0;
  function letBorderGo() {
    dwellSince = 0;
    borda.classList.remove("visivel");
    borda.style.top = "";
    springTo(bordaBend, 0);
  }
  function pullLoop(now) {
    pull = 0;
    if (!dwellSince || drawer.open) return;
    const tension = clamp((now - dwellSince) / DWELL, 0, 1);
    springTo(bordaBend, tension * 7);
    if (tension >= 1) return open();
    pull = requestAnimationFrame(pullLoop);
  }

  addEventListener("pointermove", (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    if (event.pointerType !== "mouse" || resizing || dragging || mode) return;
    if (!drawer.open) {
      if (event.clientX >= innerWidth - 4 && event.clientY > L.top) {
        borda.style.top = `${clamp(event.clientY, 100, innerHeight - 100)}px`;
        if (!dwellSince) {
          dwellSince = performance.now();
          borda.classList.add("visivel");
          if (!pull) pull = requestAnimationFrame(pullLoop);
        }
      } else if (dwellSince) letBorderGo();
      return;
    }
    const r = painel.getBoundingClientRect();
    const inside = event.clientX >= r.left - 24 && event.clientY >= r.top - 24 && event.clientY <= r.bottom + 24;
    if (inside) { visited = true; clearTimeout(away); away = 0; return; }
    if (drawer.pinned) return;
    if (!away) away = setTimeout(() => { away = 0; close(); }, 500);
  }, { passive: true });
  document.addEventListener("pointerdown", (event) => {
    if (!drawer.open || gaveta.contains(event.target)) return;
    if (event.target.closest(".captura, #menus-gaveta, .borda-alca, .guia, .colar")) return;
    close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && drawer.open) close();
    if (event.ctrlKey && event.altKey && event.code === "KeyG") { event.preventDefault(); drawer.open ? close() : open(true); }
  });

  // ── the elastic grip: wider drawer, bigger cards ────────────────────────

  /** A line that bends like an elastic band, its middle ahead of its ends. */
  const elastic = (path, length, centre) => ({ path, length, centre, value: 0, speed: 0, target: 0, frame: 0 });
  const gripBend = elastic($("#alca-linha"), 40, 13);
  const bordaBend = elastic($("#borda-linha"), 72, 13);
  function drawBend(b) {
    b.path.setAttribute("d", `M${b.centre} 2 Q${(b.centre + b.value * 2).toFixed(2)} ${b.length / 2} ${b.centre} ${b.length - 2}`);
  }
  /** A springy return to `target`: it overshoots a little and settles, the wobble of the app. */
  function springTo(b, target) {
    b.target = target;
    if (still.matches) { b.value = target; drawBend(b); return; }
    if (b.frame) return;
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      const force = -420 * (b.value - b.target) - 16 * b.speed;
      b.speed += force * dt;
      b.value += b.speed * dt;
      drawBend(b);
      if (Math.abs(b.value - b.target) < 0.02 && Math.abs(b.speed) < 0.05) {
        b.value = b.target;
        b.speed = 0;
        drawBend(b);
        b.frame = 0;
        return;
      }
      b.frame = requestAnimationFrame(step);
    };
    b.frame = requestAnimationFrame(step);
  }

  const rubber = (beyond, most) => (beyond > 0 ? (1 - 1 / ((beyond * 0.55) / most + 1)) * most : 0);
  let resizing = false;
  let grip = null;
  let stillTimer = 0;
  const cornerFor = (stretch) => (stretch >= 0 ? Math.max(5, 26 - stretch * 0.6) : Math.min(38, 26 - stretch * 0.3));
  alca.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    alca.setPointerCapture(event.pointerId);
    resizing = true;
    gaveta.classList.add("puxando");
    gaveta.classList.remove("voltando");
    grip = { x: event.clientX, width: drawer.width, lastX: event.clientX, lastT: event.timeStamp };
  });
  alca.addEventListener("pointermove", (event) => {
    if (!grip) return;
    const speed = (event.clientX - grip.lastX) / Math.max((event.timeStamp - grip.lastT) / 1000, 1 / 240);
    grip.lastX = event.clientX;
    grip.lastT = event.timeStamp;
    const wanted = grip.width - (event.clientX - grip.x);
    const low = standard();
    const high = widest();
    drawer.width = Math.round(clamp(wanted, low, high));
    drawer.stretch = rubber(wanted - high, 44) - rubber(low - wanted, 24);
    gaveta.style.setProperty("--raio-esq", `${cornerFor(drawer.stretch)}px`);
    render();
    gripBend.value = clamp(speed / 70 - drawer.stretch / 5, -7, 7);
    gripBend.speed = 0;
    drawBend(gripBend);
    clearTimeout(stillTimer);
    stillTimer = setTimeout(() => springTo(gripBend, clamp(-drawer.stretch / 5, -7, 7)), 80);
  });
  function letGrip() {
    if (!grip) return;
    grip = null;
    resizing = false;
    clearTimeout(stillTimer);
    gaveta.classList.remove("puxando");
    gaveta.classList.add("voltando");
    drawer.stretch = 0;
    gaveta.style.setProperty("--raio-esq", "26px");
    render();
    springTo(gripBend, 0);
    setTimeout(() => gaveta.classList.remove("voltando"), 500);
  }
  alca.addEventListener("pointerup", letGrip);
  alca.addEventListener("pointercancel", letGrip);
  alca.addEventListener("dblclick", () => {
    gaveta.classList.add("voltando");
    drawer.width = standard();
    render();
    setTimeout(() => gaveta.classList.remove("voltando"), 500);
  });

  addEventListener("resize", () => {
    drawer.width = clamp(drawer.width, standard(), widest());
    render();
  });

  // ── the guide: take, copy, paste ────────────────────────────────────────

  const guide = (() => {
    const box = $("#guia");
    const icon = $("#guia-icone");
    const title = $("#guia-titulo");
    const text = $("#guia-texto");
    const dots = $("#guia-passos");
    const stepText = $(".so-leitor", dots);
    const dotList = $$("i", dots);
    const done = new Set();
    let off = false;
    let finished = false;
    let hideTimer = 0;
    let shown = "";
    let last = "";
    const ICONS = {
      selecao: '<svg viewBox="0 0 16 16"><rect x="2" y="3" width="12" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2 2"/></svg>',
      janela: '<svg viewBox="0 0 16 16"><rect x="1.5" y="2.5" width="13" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M1.5 5.5h13" stroke="currentColor" stroke-width="1.4"/></svg>',
      copiar: '<svg viewBox="0 0 16 16"><rect x="5" y="5" width="8.5" height="9" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M2.5 10.5V3.6A1.1 1.1 0 0 1 3.6 2.5h6.9" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
      colar: '<svg viewBox="0 0 16 16"><path d="M5.5 3H4.2A1.2 1.2 0 0 0 3 4.2v9.6A1.2 1.2 0 0 0 4.2 15h7.6a1.2 1.2 0 0 0 1.2-1.2V4.2A1.2 1.2 0 0 0 11.8 3h-1.3" fill="none" stroke="currentColor" stroke-width="1.4"/><rect x="5.5" y="1.5" width="5" height="3" rx="1" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
      pronto: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="m5.2 8.2 1.9 1.9 3.7-3.9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    };
    const STEPS = [
      ["tirar", "janela", "Tire um print", fine.matches
        ? "Escolha <b>Janela</b> e clique em qualquer janela."
        : "Toque em <b>Janela</b> e depois em qualquer janela."],
      ["copiar", "copiar", "Copie ou arraste", fine.matches
        ? "Clique para copiar, ou arraste até o chamado. <b>⌘-clique</b> escolhe vários."
        : "Toque no print para copiar, ou nos círculos para escolher vários."],
      ["colar", "colar", "Cole no chamado", fine.matches
        ? "Um <b>⌘V</b> cola tudo no chamado, de uma vez."
        : "Toque em <b>Colar</b> no chamado."],
    ];
    /** On a phone the drawer makes room for the tip, so it follows every change in the tip's size. */
    const reflow = () => { if (drawer.open && phone()) render(); };
    /**
     * Writes one tip, only when something in it changed, so the live region does
     * not repeat itself. A new tip comes in with a short fade; the dots show what
     * is done, in whatever order it was done.
     */
    function write(key, svg, heading, words, step) {
      const sig = `${key}|${step}|${words}|${[...done].join()}`;
      if (sig === last) return;
      last = sig;
      if (shown !== key) {
        box.classList.remove("troca");
        void box.offsetWidth;
        if (shown && !still.matches) box.classList.add("troca");
        shown = key;
      }
      icon.innerHTML = ICONS[svg];
      title.textContent = heading;
      text.innerHTML = words;
      dots.hidden = step < 0;
      if (step >= 0) {
        stepText.textContent = `Passo ${step + 1} de ${STEPS.length}`;
        dotList.forEach((dot, i) => { dot.className = i === step ? "atual" : done.has(STEPS[i][0]) ? "feito" : ""; });
      }
    }
    function put(...tip) {
      box.hidden = false;
      write(...tip);
      reflow();
    }
    /** Hides the tip, taking the keys out of it first if they were on its close button. */
    function hide() {
      if (box.contains(document.activeElement)) $(".captura-modo").focus();
      box.hidden = true;
      reflow();
    }
    function show() {
      clearTimeout(hideTimer);
      if (off) return hide();
      if (mode === "janela") {
        return put("janela", "janela", "Escolha a janela", fine.matches
          ? "Clique numa janela e o print dela cai na gaveta. <b>Esc</b> cancela."
          : "Toque numa janela e o print dela cai na gaveta. Toque em <b>Janela</b> de novo para cancelar.", -1);
      }
      if (mode) {
        return put("selecao", "selecao", "Marque a área do print", fine.matches
          ? "Clique e arraste sobre o que quer no print. Ao soltar, ele cai na gaveta."
          : "Arraste o dedo sobre o que quer no print. Ao soltar, ele cai na gaveta.", -1);
      }
      const index = STEPS.findIndex(([key]) => !done.has(key));
      if (index < 0) {
        // "Pronto" shows once; after that, the tip only comes back for the capture modes
        if (finished) return hide();
        finished = true;
        put("pronto", "pronto", "Pronto", "É assim no seu Mac: cada print cai na gaveta, e um <b>⌘V</b> cola todos.", -1);
        hideTimer = setTimeout(hide, 7000);
        return;
      }
      const [key, svg, heading, words] = STEPS[index];
      put(key, svg, heading, words, index);
    }
    $("#guia-fechar").addEventListener("click", () => { off = true; show(); });
    return {
      show,
      done(key) {
        if (key === "colar" && !done.has("copiar")) done.add("copiar");
        if (key === "copiar" && !done.has("tirar")) done.add("tirar");
        done.add(key);
        show();
      },
    };
  })();

  drawBend(gripBend);
  drawBend(bordaBend);
  drawer.width = standard();
  render();
  guide.show();
  // The drawer slides out a moment after the page shows, with three prints already in it;
  // on a phone it would cover the page, so there it waits at the edge.
  if (!phone()) setTimeout(() => { if (!mode) open(true); }, still.matches ? 0 : 700);
})();
