// The Gaveta landing: copy buttons, the language link, and a Mac screen where
// the glass drawer works as the app does: take a screenshot and it flies into
// the drawer at the screen's right edge, laid out the way the app lays its
// cards out; pick, copy, throw out, widen it by its elastic grip.
(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const wait = (ms) => new Promise((done) => setTimeout(done, ms));
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  const ROOT = document.documentElement.dataset.raiz || "";
  const aviso = $("#aviso");
  const announce = (text) => {
    aviso.textContent = "";
    requestAnimationFrame(() => { aviso.textContent = text; });
  };

  // ── the page around it ──────────────────────────────────────────────────

  $("[data-idioma]").addEventListener("click", (event) => {
    try { localStorage.setItem("gaveta-idioma", event.currentTarget.dataset.idioma); } catch {}
  });

  const topo = $(".topo");
  const scrolled = () => topo.classList.toggle("rolou", scrollY > 8);
  addEventListener("scroll", scrolled, { passive: true });
  scrolled();

  for (const button of $$("[data-copiar]")) {
    const label = $("[data-rotulo]", button);
    const original = label.textContent;
    const short = button.classList.contains("copiar");
    let timer = 0;
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copiar);
        label.textContent = short ? "Copiado" : "Copiado: cole no Terminal";
        announce("Comando copiado. Cole no Terminal.");
      } catch {
        label.textContent = "Copie à mão";
      }
      clearTimeout(timer);
      timer = setTimeout(() => { label.textContent = original; }, 2000);
    });
  }

  const relogio = $("#relogio");
  const tick = () => {
    relogio.textContent = new Intl.DateTimeFormat(document.documentElement.lang, { weekday: "short", hour: "2-digit", minute: "2-digit" })
      .format(new Date()).replace(/\.,?/g, "");
  };
  tick();
  setInterval(tick, 20000);

  // ── the drawer ──────────────────────────────────────────────────────────

  const SAMPLES = {
    canvas: { src: "assets/prints/canvas.png", w: 1380, h: 360 },
    paleta: { src: "assets/prints/paleta.png", w: 520, h: 640 },
    codigo: { src: "assets/prints/codigo.png", w: 1160, h: 520 },
    painel: { src: "assets/prints/painel.png", w: 980, h: 560 },
    erro: { src: "assets/prints/erro.png", w: 560, h: 470 },
  };
  const CAPACITY = 8;
  let serial = 0;
  const printOf = (name, age = 0) => ({ ...SAMPLES[name], id: ++serial, date: Date.now() - age * 1000 });

  const palco = $("#palco");
  const gaveta = $("#gaveta");
  const painel = $("#painel");
  const fichas = $("#fichas");
  const barra = $("#barra");
  const conta = $("#conta");
  const quedas = $("#quedas");
  const alca = $("#alca");
  const alcaLinha = $("#alca-linha");
  const borda = $("#borda-alca");
  const bordaLinha = $("#borda-linha");
  const pilha = document.createElement("div");
  pilha.className = "pilha";
  fichas.append(pilha);

  const drawer = {
    prints: [printOf("canvas", 2 * 3600), printOf("paleta", 37 * 60), printOf("codigo", 12 * 60)], // back (oldest) to front (newest)
    selection: new Set(),
    copied: new Set(),
    arriving: new Set(),
    hovered: null,
    open: false,
    pinned: false,
    width: 300,            // the box the cards stand in
    stretch: 0,            // pulled past a limit
  };

  const S = { left: 30, right: 14, border: 8, meta: 24, top: 18, bottom: 12, minReveal: 76, gap: 12, words: 96, slot: 96 };
  const L = { rail: 10, footer: 44, menus: 28, margin: 14 };
  const front = () => (innerWidth <= 760 ? 50 : 58);
  /** The width the drawer opens at: the app's 300, or less on a screen too narrow for it. */
  const standard = () => clamp(palco.clientWidth - front() - 26, 220, 300);
  const widest = () => Math.max(standard(), Math.min(600, palco.clientWidth - front() - 120));

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
    return { w: Math.round(w), h: Math.round(h), slot };
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
    card.innerHTML = `<img class="ficha-foto" alt="" draggable="false">
      <div class="ficha-legenda"><span class="o-que"></span><span class="idade"></span></div>
      <div class="ficha-faixa"><span class="tipo">Print</span><span class="tamanho"></span><span class="idade"></span></div>
      <span class="ficha-bolinha"></span><span class="ficha-x">${CROSS}</span><span class="ficha-copiado">✓ Copiado</span>`;
    $("img", card).src = ROOT + print.src;
    cards.set(print.id, card);
    pilha.append(card);
    return card;
  }

  let layout = null;
  let measure = measures(300);

  function render() {
    const list = drawer.prints;
    const box = drawer.width + drawer.stretch;
    const tall = palco.clientHeight;
    const most = tall - L.menus - L.margin * 2 - 64; // leaves the capture button its room
    measure = measures(box);
    const hoveredIndex = list.findIndex((p) => p.id === drawer.hovered);
    const room = most - L.rail * 2 - L.footer;
    const rest = stackOf(measure, list.length, null, room);
    layout = stackOf(measure, list.length, hoveredIndex >= 0 ? hoveredIndex : null, room);
    const restHeight = list.length ? Math.min(L.rail * 2 + rest.height + L.footer, most) : 200;
    const top = Math.max(L.menus + L.margin, L.menus + (tall - L.menus - 64 - restHeight) / 2);
    const height = list.length ? Math.min(L.rail * 2 + layout.height + L.footer, tall - top - L.margin) : 200;
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
      const img = $("img", card);
      img.style.width = `${photo.w}px`;
      img.style.height = `${photo.h}px`;
      img.style.transform = `translate(${S.border + (slotW - photo.w) / 2}px, ${photoTop}px)`;
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
    if (clientY < box.top || clientY > box.bottom) return null;
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
    if (resizing) return;
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

  pilha.addEventListener("click", (event) => {
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

  let copiedTimer = 0;
  async function copy(ids) {
    const prints = drawer.prints.filter((p) => ids.includes(p.id));
    if (!prints.length) return;
    drawer.copied = new Set(prints.map((p) => p.id));
    render();
    clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => { drawer.copied.clear(); render(); }, 1200);
    // One print goes to the clipboard for real; in the app, one ⌘V pastes them all.
    if (prints.length === 1 && navigator.clipboard && window.ClipboardItem) {
      try {
        const blob = fetch(ROOT + prints[0].src).then((r) => r.blob());
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        announce("Print copiado. Cole com ⌘V.");
        return;
      } catch {}
    }
    announce(prints.length === 1 ? "Print copiado." : `${prints.length} prints copiados. No app, um ⌘V cola todos, na ordem.`);
  }

  /** Where something on the screen stands, in the screen's own coordinates. */
  const within = (rect) => {
    const p = palco.getBoundingClientRect();
    return { left: rect.left - p.left, top: rect.top - p.top, width: rect.width, height: rect.height };
  };

  /** Thrown out: pulled by the corner, eased as it clears the drawer, then falling, turning over. */
  function discard(id) {
    const index = drawer.prints.findIndex((p) => p.id === id);
    if (index < 0) return;
    const card = cards.get(id);
    if (card && !still.matches) {
      const at = within(card.getBoundingClientRect());
      const flyer = card.cloneNode(true);
      flyer.classList.remove("aberta", "copiada");
      flyer.style.cssText = `width:${at.width}px;height:${at.height}px;left:${at.left}px;top:${at.top}px;transform:none;z-index:1`;
      quedas.append(flyer);
      const fall = palco.clientHeight - at.top + 40;
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

  // ── taking a screenshot: the window is picked out, a flash, and it flies in ──

  const captura = $("#captura");
  const selecao = $("#selecao");
  const clarao = $("#clarao");
  const janelas = $$(".janela");
  let shots = 0;
  let busy = false;
  captura.classList.add("chama");
  captura.addEventListener("click", async () => {
    if (busy) return;
    busy = true;
    captura.classList.remove("chama");
    const win = janelas[shots++ % janelas.length];
    const at = within(win.getBoundingClientRect());
    const print = printOf(win.dataset.print);

    if (!still.matches) {
      selecao.style.cssText = `left:${at.left}px;top:${at.top}px;width:${at.width}px;height:${at.height}px`;
      await selecao.animate([{ opacity: 0, transform: "scale(1.04)" }, { opacity: 1, transform: "none" }], { duration: 220, easing: "ease-out", fill: "forwards" }).finished;
      await wait(160);
      selecao.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: "forwards" });
      clarao.animate([{ opacity: 0 }, { opacity: 0.85 }, { opacity: 0 }], { duration: 260, easing: "ease-out" });
    }

    if (drawer.prints.length >= CAPACITY) drawer.prints.splice(0, drawer.prints.length - CAPACITY + 1);
    drawer.prints.push(print);
    drawer.arriving.add(print.id);
    drawer.hovered = null;
    const wasOpen = drawer.open;
    if (!wasOpen) open(true); else render();
    fichas.scrollTop = fichas.scrollHeight;

    if (!still.matches) {
      if (!wasOpen) await wait(380);
      render();
      fichas.scrollTop = fichas.scrollHeight;
      const target = within($("img", cards.get(print.id)).getBoundingClientRect());
      const flyer = $("img", win).cloneNode();
      flyer.className = "voando";
      flyer.style.cssText = `width:${at.width}px;height:${at.height}px`;
      quedas.append(flyer);
      const scale = target.width / at.width;
      await flyer.animate([
        { transform: `translate(${at.left}px, ${at.top}px)`, borderRadius: "10px" },
        { transform: `translate(${at.left + (target.left - at.left) * 0.35}px, ${at.top - 30}px) scale(${0.5 + scale * 0.5})`, offset: 0.4 },
        { transform: `translate(${target.left}px, ${target.top}px) scale(${scale})`, borderRadius: `${6 / scale}px` },
      ], { duration: 620, easing: "cubic-bezier(.3,.7,.2,1)" }).finished;
      flyer.remove();
    }
    drawer.arriving.delete(print.id);
    render();
    announce("Print na gaveta.");
    busy = false;
  });

  // ── opening and closing ─────────────────────────────────────────────────

  let visited = false;
  let away = 0;
  function open(pinned = false) {
    drawer.pinned = drawer.pinned || pinned;
    visited = false;
    clearTimeout(away);
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
    render();
  }
  borda.addEventListener("click", () => open(true));

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
    if (event.pointerType !== "mouse" || resizing) return;
    const screen = palco.getBoundingClientRect();
    const onScreen = event.clientX >= screen.left && event.clientX <= screen.right && event.clientY >= screen.top + L.menus && event.clientY <= screen.bottom;
    if (!drawer.open) {
      if (onScreen && event.clientX >= screen.right - 8) {
        borda.style.top = `${clamp(event.clientY - screen.top, 90, screen.height - 90)}px`;
        if (!dwellSince) {
          dwellSince = performance.now();
          borda.classList.add("visivel");
          if (!pull) pull = requestAnimationFrame(pullLoop);
        }
      } else if (dwellSince) letBorderGo();
      return;
    }
    const r = painel.getBoundingClientRect();
    const inside = event.clientX >= r.left - 24 && event.clientX <= r.right + 8 && event.clientY >= r.top - 24 && event.clientY <= r.bottom + 24;
    if (inside) { visited = true; clearTimeout(away); away = 0; return; }
    if (drawer.pinned) return;
    if (!away) away = setTimeout(() => { away = 0; close(); }, 500);
  }, { passive: true });
  palco.addEventListener("pointerdown", (event) => {
    if (drawer.open && !gaveta.contains(event.target) && !captura.contains(event.target)) close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && drawer.open) close();
    if (event.ctrlKey && event.altKey && event.code === "KeyG") { event.preventDefault(); drawer.open ? close() : open(true); }
  });

  // ── the elastic grip: wider drawer, bigger cards ────────────────────────

  /** A line that bends like an elastic band, its middle ahead of its ends. */
  const elastic = (path, length, centre) => ({ path, length, centre, value: 0, speed: 0, target: 0, frame: 0 });
  const gripBend = elastic(alcaLinha, 40, 13);
  const bordaBend = elastic(bordaLinha, 72, 13);
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

  drawBend(gripBend);
  drawBend(bordaBend);
  drawer.width = standard();
  render();

  // The drawer slides out the first time the screen comes into view.
  const shown = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    shown.disconnect();
    setTimeout(() => open(true), still.matches ? 0 : 500);
  }, { threshold: 0.45 });
  shown.observe(palco);
})();
