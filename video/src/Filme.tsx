import type { CSSProperties } from "react";
import {
  AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig,
} from "remotion";

/**
 * Gaveta at work, the real app on a Mac, in the manner of a design
 * engineer's reel: a dark stage, the screen in a rounded frame, a camera
 * that leans in on each interaction, numbered chapters, slow motion where
 * the motion is the point, and the keys pressed shown as keycaps.
 *
 * The footage is video/gravacao/ played on a Mac (see video/LEIA.md):
 * five takes, 1470 × 956 points at 2×, in public/app/. Every time and
 * camera position below is in a take's own seconds and screen points.
 */

export const FPS = 60;
const W = 1920;
const H = 1080;
/** The screen's frame on the stage. */
const FRAME = { x: 160, y: 72, w: 1600, h: 900 };
/** The screen, in points; the menu bar and the Dock stay out of the shot. */
const SCREEN = { w: 1470, h: 956, top: 36, bottom: 886 };
const TITULO = 2.6;
const FIM = 4.0;
const CRUZA = 0.35;

const SANS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif';
const MONO = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, monospace';
const COR = {
  fundo: "#09090b",
  texto: "#f2f2f3",
  suave: "#a1a1aa",
  mudo: "#71717a",
  linha: "rgba(255,255,255,.09)",
};

// ── the chapters and the shots ───────────────────────────────────────────

const CAPITULOS = [
  { nome: "Captura", legenda: ["Tire o print do jeito de sempre.", "Ele voa para a gaveta."] },
  { nome: "Na borda", legenda: ["Encoste o cursor na borda:", "a alça estica e a gaveta abre."] },
  { nome: "Fichas inteiras", legenda: ["Cada print aparece inteiro.", "A ficha sob o cursor se abre."] },
  { nome: "Vários de uma vez", legenda: ["⌘-clique escolhe vários.", "Um ⌘V cola todos, na ordem."] },
  { nome: "Alça elástica", legenda: ["Arraste a alça para alargar.", "No limite ela cede, e volta com um balanço."] },
  { nome: "Sem atrito", legenda: ["O X joga fora.", "A próxima já está pronta."] },
  { nome: "Arraste", legenda: ["Arraste para qualquer app.", ""] },
];

/** A camera position at a take's time: the point in the middle of the shot, and how wide the shot is, in points. */
type Cam = { t: number; cx: number; cy: number; w: number };
type Teclas = { t: number; teclas: string[] };
type Plano = { cena: number; de: number; ate: number; ritmo?: number; capitulo: number; cam: Cam[]; teclas?: Teclas[] };

const LARGO = 1000;
// Times are the takes' own, read off their frames: when a key was pressed,
// a card picked, the drawer opened, a print pasted.
const PLANOS: Plano[] = [
  // 01 ⌘⇧4 over the shop: the screenshot flies into the drawer (the flight slowed down)
  {
    cena: 1, de: 1.5, ate: 5.3, capitulo: 0, teclas: [{ t: 2.0, teclas: ["⌘", "⇧", "4"] }],
    cam: captura(),
  },
  { cena: 1, de: 5.3, ate: 6.5, ritmo: 0.5, capitulo: 0, cam: captura() },
  { cena: 1, de: 6.5, ate: 7.2, capitulo: 0, cam: captura() },
  // 02 the pointer rests on the edge: the handle pulls taut and the drawer springs out
  { cena: 4, de: 3.5, ate: 4.2, capitulo: 1, cam: borda() },
  { cena: 4, de: 4.2, ate: 5.1, ritmo: 0.4, capitulo: 1, cam: borda() },
  { cena: 4, de: 5.1, ate: 5.7, capitulo: 1, cam: borda() },
  // 03 through the cards, each whole under the pointer
  {
    cena: 2, de: 5.1, ate: 11.1, capitulo: 2,
    cam: [
      { t: 5.1, cx: 1110, cy: 600, w: 720 },
      { t: 5.7, cx: 1110, cy: 684, w: 720 },
      { t: 6.6, cx: 1110, cy: 620, w: 720 },
      { t: 7.7, cx: 1110, cy: 430, w: 720 },
      { t: 8.8, cx: 1110, cy: 300, w: 720 },
      { t: 9.8, cx: 1110, cy: 240, w: 720 },
      { t: 11.1, cx: 1110, cy: 240, w: 720 },
    ],
  },
  // 04 two picked with ⌘-click, copied together, one ⌘V pastes both into the chat
  {
    cena: 2, de: 11.1, ate: 16.0, capitulo: 3,
    teclas: [{ t: 12.3, teclas: ["⌘", "clique"] }, { t: 13.9, teclas: ["⌘", "clique"] }],
    cam: [
      { t: 11.1, cx: 1110, cy: 240, w: 720 },
      { t: 11.9, cx: 1110, cy: 560, w: 720 },
      { t: 13.4, cx: 1110, cy: 640, w: 720 },
      { t: 14.8, cx: 1110, cy: 684, w: 720 },
    ],
  },
  {
    cena: 2, de: 16.0, ate: 18.8, ritmo: 1.6, capitulo: 3,
    cam: [
      { t: 16.0, cx: 1110, cy: 684, w: 720 },
      { t: 17.2, cx: 960, cy: 520, w: LARGO },
      { t: 18.8, cx: 790, cy: 545, w: 680 },
    ],
  },
  {
    cena: 2, de: 18.8, ate: 22.2, capitulo: 3, teclas: [{ t: 18.95, teclas: ["⌘", "V"] }],
    cam: [
      { t: 18.8, cx: 790, cy: 545, w: 680 },
      { t: 19.6, cx: 775, cy: 550, w: 640 },
      { t: 22.2, cx: 775, cy: 560, w: 640 },
    ],
  },
  // 05 the elastic grip: wider, the give at the limit and the swing back (slowed down), then narrower
  { cena: 3, de: 6.2, ate: 9.8, capitulo: 4, cam: alca() },
  { cena: 3, de: 9.8, ate: 10.9, ritmo: 0.4, capitulo: 4, cam: alca() },
  { cena: 3, de: 12.8, ate: 16.2, capitulo: 4, cam: alca() },
  // 06 the X throws one out (slowed down), and the next one is already there
  { cena: 4, de: 8.3, ate: 8.6, capitulo: 5, cam: lixo() },
  { cena: 4, de: 8.6, ate: 9.3, ritmo: 0.4, capitulo: 5, cam: lixo() },
  { cena: 4, de: 9.3, ate: 10.6, capitulo: 5, cam: lixo() },
  // 07 dragged out of the drawer into the chat, and the end of the joke
  {
    cena: 5, de: 7.3, ate: 16.0, capitulo: 6,
    cam: [
      { t: 7.3, cx: 1000, cy: 520, w: LARGO },
      { t: 9.9, cx: 1000, cy: 520, w: LARGO },
      { t: 10.9, cx: 775, cy: 565, w: 620 },
      { t: 16.0, cx: 775, cy: 580, w: 600 },
    ],
  },
];

function captura(): Cam[] {
  return [
    { t: 1.5, cx: 560, cy: 455, w: LARGO },
    { t: 5.4, cx: 560, cy: 455, w: LARGO },
    { t: 6.4, cx: 970, cy: 470, w: LARGO },
  ];
}
function borda(): Cam[] {
  return [
    { t: 3.5, cx: 1150, cy: 520, w: 640 },
    { t: 4.15, cx: 1250, cy: 520, w: 480 },
    { t: 4.7, cx: 1250, cy: 520, w: 480 },
    { t: 5.5, cx: 1060, cy: 480, w: 860 },
  ];
}
function alca(): Cam[] {
  return [
    { t: 6.2, cx: 1050, cy: 480, w: 840 },
    { t: 9.3, cx: 1050, cy: 480, w: 840 },
    { t: 9.9, cx: 920, cy: 490, w: 640 },
    { t: 10.9, cx: 920, cy: 490, w: 640 },
    { t: 12.8, cx: 1050, cy: 480, w: 840 },
    { t: 16.2, cx: 1110, cy: 480, w: 780 },
  ];
}
function lixo(): Cam[] {
  return [
    { t: 8.3, cx: 1120, cy: 640, w: 700 },
    { t: 10.6, cx: 1120, cy: 630, w: 700 },
  ];
}

// ── the timeline ─────────────────────────────────────────────────────────

type Trecho = Plano & { inicio: number; frames: number; ritmo: number; emenda: boolean };

/** Frames of each shot; a shot that goes on where the last one stopped follows it with no crossing. */
function linhaDoTempo(): Trecho[] {
  const trechos: Trecho[] = [];
  let quadro = Math.round(TITULO * FPS) - Math.round(CRUZA * FPS);
  PLANOS.forEach((p, i) => {
    const ritmo = p.ritmo ?? 1;
    const frames = Math.round(((p.ate - p.de) / ritmo) * FPS);
    const antes = PLANOS[i - 1];
    const emenda = !!antes && antes.cena === p.cena && Math.abs(antes.ate - p.de) < 1e-6;
    if (i > 0 && !emenda) quadro -= Math.round(CRUZA * FPS);
    trechos.push({ ...p, ritmo, inicio: quadro, frames, emenda });
    quadro += frames;
  });
  return trechos;
}
const TRECHOS = linhaDoTempo();
const FIM_DOS_PLANOS = TRECHOS[TRECHOS.length - 1].inicio + TRECHOS[TRECHOS.length - 1].frames;
export const DURACAO = FIM_DOS_PLANOS - Math.round(CRUZA * FPS) + Math.round(FIM * FPS);

// ── the camera ───────────────────────────────────────────────────────────

const suave = Easing.inOut(Easing.cubic);
function camera(cams: Cam[], t: number): Cam {
  if (t <= cams[0].t) return cams[0];
  for (let i = 0; i < cams.length - 1; i++) {
    const a = cams[i];
    const b = cams[i + 1];
    if (t <= b.t) {
      const k = suave((t - a.t) / (b.t - a.t));
      return { t, cx: a.cx + (b.cx - a.cx) * k, cy: a.cy + (b.cy - a.cy) * k, w: a.w + (b.w - a.w) * k };
    }
  }
  return cams[cams.length - 1];
}
/** Keeps the shot on the screen, between the menu bar and the Dock. */
function limite({ cx, cy, w, t }: Cam): Cam {
  const h = (w * FRAME.h) / FRAME.w;
  return {
    t, w,
    cx: Math.min(SCREEN.w - w / 2, Math.max(w / 2, cx)),
    cy: Math.min(SCREEN.bottom - h / 2, Math.max(SCREEN.top + h / 2, cy)),
  };
}

// ── pieces ───────────────────────────────────────────────────────────────

function Tela({ trecho }: { trecho: Trecho }) {
  const frame = useCurrentFrame();
  const t = trecho.de + (frame / FPS) * trecho.ritmo;
  const cam = limite(camera(trecho.cam, t));
  const zoom = FRAME.w / cam.w;
  const dentro = trecho.emenda ? 1 : interpolate(frame, [0, CRUZA * FPS], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ opacity: dentro }}>
      <div style={{ position: "absolute", left: FRAME.x, top: FRAME.y, width: FRAME.w, height: FRAME.h, overflow: "hidden", borderRadius: 26, background: "#000" }}>
        <OffthreadVideo
          src={staticFile(`app/cena${trecho.cena}.mp4`)}
          startFrom={Math.round(trecho.de * FPS)}
          playbackRate={trecho.ritmo}
          muted
          style={{
            position: "absolute",
            width: SCREEN.w * zoom,
            height: SCREEN.h * zoom,
            left: FRAME.w / 2 - cam.cx * zoom,
            top: FRAME.h / 2 - cam.cy * zoom,
            maxWidth: "none",
          }}
        />
      </div>
    </AbsoluteFill>
  );
}

/** The rim of the frame, over every shot. */
function Moldura() {
  return (
    <div style={{
      position: "absolute", left: FRAME.x, top: FRAME.y, width: FRAME.w, height: FRAME.h, borderRadius: 26, pointerEvents: "none",
      boxShadow: "inset 0 0 0 1px rgba(255,255,255,.10), 0 0 0 1px rgba(0,0,0,.6), 0 50px 140px -30px rgba(0,0,0,.9)",
    }} />
  );
}

function Fundo() {
  return (
    <AbsoluteFill style={{
      background: [
        "radial-gradient(70% 60% at 50% 52%, rgba(118,108,255,.16), rgba(118,108,255,0) 70%)",
        "radial-gradient(45% 40% at 78% 70%, rgba(255,130,100,.10), rgba(255,130,100,0) 70%)",
        `radial-gradient(120% 90% at 50% 0%, #17171b 0%, ${COR.fundo} 60%)`,
      ].join(", "),
    }} />
  );
}

/** The chapter's number and name, typed in, and a chip while the take runs slower. */
function Rotulo({ trecho, desde }: { trecho: Trecho; desde: number }) {
  const frame = useCurrentFrame();
  const { nome } = CAPITULOS[trecho.capitulo];
  const texto = `${String(trecho.capitulo + 1).padStart(2, "0")} — ${nome.toUpperCase()}`;
  const letras = Math.floor(interpolate(frame - desde, [0, 0.45 * FPS], [0, texto.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const lento = trecho.ritmo < 1;
  const chip = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: FRAME.x, top: 26, display: "flex", alignItems: "center", gap: 14, fontFamily: MONO, fontSize: 15, letterSpacing: "0.16em", color: COR.suave }}>
      <span><span style={{ color: COR.mudo }}>{texto.slice(0, 2)}</span>{texto.slice(2, letras)}</span>
      {lento && (
        <span style={{
          opacity: chip, padding: "3px 9px", borderRadius: 999, letterSpacing: "0.06em", fontSize: 13,
          color: "#c4b5fd", background: "rgba(139,92,246,.14)", boxShadow: "inset 0 0 0 1px rgba(167,139,250,.35)",
        }}>
          {String(trecho.ritmo).replace(".", ",")}×
        </span>
      )}
    </div>
  );
}

function Legenda({ capitulo, desde }: { capitulo: number; desde: number }) {
  const frame = useCurrentFrame();
  const [a, b] = CAPITULOS[capitulo].legenda;
  const entra = spring({ frame: frame - desde - 6, fps: FPS, config: { damping: 200 } });
  return (
    <div style={{
      position: "absolute", left: 0, right: 0, top: FRAME.y + FRAME.h + 30, textAlign: "center",
      fontFamily: SANS, fontSize: 31, fontWeight: 500, letterSpacing: "-0.01em",
      opacity: entra, transform: `translateY(${(1 - entra) * 10}px)`,
    }}>
      <span style={{ color: COR.texto }}>{a}</span> <span style={{ color: COR.suave }}>{b}</span>
    </div>
  );
}

/** The keys pressed, as keycaps at the bottom of the frame. */
function Teclado({ teclas, desde, dura }: { teclas: string[]; desde: number; dura: number }) {
  const frame = useCurrentFrame() - desde;
  if (frame < 0 || frame > dura) return null;
  const pop = spring({ frame, fps: FPS, config: { damping: 14, mass: 0.6 } });
  const sai = interpolate(frame, [dura - 12, dura], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tecla: CSSProperties = {
    minWidth: 64, height: 64, padding: "0 18px", borderRadius: 16, display: "grid", placeItems: "center",
    fontFamily: SANS, fontSize: 30, fontWeight: 500, color: "#fff",
    background: "linear-gradient(180deg, rgba(58,58,64,.92), rgba(28,28,32,.92))",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.18), inset 0 0 0 1px rgba(255,255,255,.10), 0 10px 30px -8px rgba(0,0,0,.7)",
  };
  return (
    <div style={{
      position: "absolute", left: FRAME.x, width: FRAME.w, top: FRAME.y + FRAME.h - 110, display: "flex", justifyContent: "center", gap: 10,
      opacity: Math.min(1, pop * 1.4) * sai, transform: `translateY(${(1 - pop) * 16}px) scale(${0.9 + pop * 0.1})`,
    }}>
      {teclas.map((k, i) => <div key={i} style={{ ...tecla, fontSize: k.length > 1 ? 22 : 30 }}>{k}</div>)}
    </div>
  );
}

function Marca() {
  return (
    <div style={{ position: "absolute", right: W - FRAME.x - FRAME.w, top: 26, display: "flex", alignItems: "center", gap: 10, fontFamily: MONO, fontSize: 15, letterSpacing: "0.16em", color: COR.mudo }}>
      <Img src={staticFile("icone.png")} style={{ width: 20, height: 20 }} />
      GAVETA
    </div>
  );
}

function Abertura() {
  const frame = useCurrentFrame();
  const icone = spring({ frame, fps: FPS, config: { damping: 14, mass: 0.7 } });
  const nome = spring({ frame: frame - 9, fps: FPS, config: { damping: 200 } });
  const linha = spring({ frame: frame - 20, fps: FPS, config: { damping: 200 } });
  const sai = interpolate(frame, [(TITULO - CRUZA) * FPS, TITULO * FPS], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: sai, fontFamily: SANS }}>
      <Img src={staticFile("icone.png")} style={{ width: 150, height: 150, opacity: icone, transform: `translateY(${(1 - icone) * 26}px) scale(${0.85 + icone * 0.15})`, filter: "drop-shadow(0 24px 50px rgba(0,0,0,.6))" }} />
      <div style={{ marginTop: 26, fontSize: 96, fontWeight: 600, letterSpacing: "-0.04em", color: COR.texto, opacity: nome, transform: `translateY(${(1 - nome) * 14}px)` }}>Gaveta</div>
      <div style={{ marginTop: 6, fontSize: 36, fontWeight: 500, letterSpacing: "-0.015em", color: COR.suave, opacity: linha, transform: `translateY(${(1 - linha) * 10}px)` }}>
        Seus prints, numa gaveta.
      </div>
    </AbsoluteFill>
  );
}

function Encerramento() {
  const frame = useCurrentFrame();
  const entra = spring({ frame, fps: FPS, config: { damping: 200 } });
  const link = spring({ frame: frame - 14, fps: FPS, config: { damping: 18 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: SANS, opacity: entra }}>
      <Img src={staticFile("icone.png")} style={{ width: 128, height: 128, filter: "drop-shadow(0 24px 50px rgba(0,0,0,.6))" }} />
      <div style={{ marginTop: 22, fontSize: 84, fontWeight: 600, letterSpacing: "-0.04em", color: COR.texto }}>Gaveta</div>
      <div style={{ marginTop: 4, fontSize: 32, fontWeight: 500, color: COR.suave }}>Seus prints, numa gaveta.</div>
      <div style={{ marginTop: 18, fontFamily: MONO, fontSize: 16, letterSpacing: "0.16em", color: COR.mudo }}>GRÁTIS · CÓDIGO ABERTO · MACOS 14+</div>
      <div style={{
        marginTop: 34, padding: "14px 26px", borderRadius: 999, fontSize: 28, fontWeight: 500, color: "#0b0b0d", background: "#f4f4f5",
        opacity: link, transform: `translateY(${(1 - link) * 12}px)`,
      }}>
        github.com/Frasca-99/gaveta
      </div>
    </AbsoluteFill>
  );
}

// ── the film ─────────────────────────────────────────────────────────────

export function Filme() {
  const { durationInFrames } = useVideoConfig();
  const fimDe = FIM_DOS_PLANOS - Math.round(CRUZA * FPS);
  // where each chapter starts, for its label and caption
  const comeco = new Map<number, number>();
  for (const t of TRECHOS) if (!comeco.has(t.capitulo)) comeco.set(t.capitulo, t.inicio);
  return (
    <AbsoluteFill style={{ background: COR.fundo }}>
      <Fundo />
      <Sequence durationInFrames={Math.round(TITULO * FPS)}><Abertura /></Sequence>
      {TRECHOS.map((t, i) => {
        const proximo = TRECHOS[i + 1];
        // a crossing shot plays on under the next one while it fades in
        const dura = t.frames + (proximo && !proximo.emenda ? Math.round(CRUZA * FPS) : 0);
        return (
          <Sequence key={i} from={t.inicio} durationInFrames={dura}>
            <Tela trecho={t} />
          </Sequence>
        );
      })}
      <Sequence from={Math.round(TITULO * FPS) - Math.round(CRUZA * FPS)} durationInFrames={fimDe - Math.round(TITULO * FPS) + Math.round(2 * CRUZA * FPS)}>
        <Cromo />
      </Sequence>
      <Sequence from={fimDe} durationInFrames={durationInFrames - fimDe}><Encerramento /></Sequence>
    </AbsoluteFill>
  );
}

/** The frame's rim, the label, the caption and the keycaps, over the shots. */
function Cromo() {
  const frame = useCurrentFrame();
  const base = Math.round(TITULO * FPS) - Math.round(CRUZA * FPS);
  const agora = frame + base;
  const atual = [...TRECHOS].reverse().find((t) => agora >= t.inicio) ?? TRECHOS[0];
  const inicioDoCapitulo = TRECHOS.find((t) => t.capitulo === atual.capitulo)!.inicio - base;
  const entra = interpolate(frame, [0, CRUZA * FPS], [0, 1], { extrapolateRight: "clamp" });
  const total = TRECHOS[TRECHOS.length - 1].inicio + TRECHOS[TRECHOS.length - 1].frames - base;
  const sai = interpolate(frame, [total - CRUZA * FPS, total], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ opacity: entra * sai }}>
      <Moldura />
      <Marca />
      <Rotulo key={`r${atual.capitulo}`} trecho={atual} desde={inicioDoCapitulo} />
      <Legenda key={`l${atual.capitulo}`} capitulo={atual.capitulo} desde={inicioDoCapitulo} />
      {TRECHOS.flatMap((t) => (t.teclas ?? []).map((k, j) => {
        const desde = t.inicio - base + Math.round(((k.t - t.de) / t.ritmo) * FPS);
        return <Teclado key={`${t.inicio}-${j}`} teclas={k.teclas} desde={desde} dura={Math.round(1.15 * FPS)} />;
      }))}
    </AbsoluteFill>
  );
}
