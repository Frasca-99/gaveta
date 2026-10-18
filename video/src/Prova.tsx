import type { CSSProperties } from "react";
import { AbsoluteFill, Easing, Freeze, interpolate, OffthreadVideo, staticFile, useCurrentFrame } from "remotion";

/**
 * Gaveta in English, laid out like a lab figure: the real app, recorded on a
 * Mac in one take, sits in a card on a light page, with small mono labels in
 * the card's corners (the figure, what it shows, what to do, a live readout)
 * and the link below it. Emma wants proof at 3 am; Jake takes two
 * screenshots, picks both in the drawer and drags them into the chat.
 *
 * The take is public/ingles/traicao.mp4 (video/gravacao, cenas/traicao.json,
 * PALCO_CENARIO=traicao on a Mac in English): 1470 × 956 points at 2×. Times
 * below are the take's own seconds, read off its frames.
 */

export const FPS = 60;
const CARD = { x: 200, y: 44, w: 1520, h: 937, raio: 16 };
/** The screen inside the card, between the top labels and the bottom ones. */
const PLACA = { x: 16, y: 50, w: 1488, h: 837, raio: 8 };
/** The screen in points; the menu bar and the Dock stay out of the shot. */
const SCREEN = { w: 1470, h: 956, top: 36, bottom: 886 };
const INICIO = 1.2;
const FIM_DO_TAKE = 37.2;
const FIM = 40.4;
const TROCA = 0.35;

const SANS = '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';
const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';
const COR = { cartao: "#F7F7F6", rotulo: "#8E8D88", texto: "#3E3D3A" };
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const suave = Easing.inOut(Easing.cubic);

// ── the camera, in the take's seconds and the screen's points ────────────

type Cam = { t: number; cx: number; cy: number; w: number };
const CENA = { cx: 550, cy: 440, w: 1070 };
const CHAT = { cx: 770, cy: 398, w: 680 };
const LOJA = { cx: 360, cy: 345, w: 720 };
const VOO = { cx: 800, cy: 450, w: 1340 };
const GAVETA = { cx: 1008, cy: 622, w: 925 };
const CARTOES = { cx: 1070, cy: 661, w: 800 };
const TOPO = { cx: 1090, cy: 300, w: 760 };
const ARRASTE = { cx: 1020, cy: 600, w: 900 };
const RESPOSTA = { cx: 770, cy: 477, w: 720 };
const CAMERA: Cam[] = [
  { t: 0, ...CENA },
  { t: 1.5, ...CENA },
  { t: 2.8, ...CHAT },
  { t: 6.9, ...CHAT },
  { t: 8.2, ...CENA },
  { t: 9.5, ...CENA },
  { t: 10.3, ...LOJA },
  { t: 11.2, ...LOJA },
  { t: 11.9, ...VOO },
  { t: 12.7, ...VOO },
  { t: 13.7, ...LOJA },
  { t: 15.2, ...LOJA },
  { t: 15.9, ...VOO },
  { t: 17.5, ...VOO },
  { t: 18.6, ...GAVETA },
  { t: 19.7, ...GAVETA },
  { t: 20.5, ...CARTOES },
  { t: 23.2, ...CARTOES },
  { t: 24.4, ...TOPO },
  { t: 26.1, ...TOPO },
  { t: 27.3, ...ARRASTE },
  { t: 29.6, ...ARRASTE },
  { t: 30.8, ...RESPOSTA },
  { t: 36.5, ...RESPOSTA },
  { t: 38.4, ...CENA },
];

function camera(t: number): Cam {
  if (t <= CAMERA[0].t) return CAMERA[0];
  for (let i = 0; i < CAMERA.length - 1; i++) {
    const a = CAMERA[i];
    const b = CAMERA[i + 1];
    if (t <= b.t) {
      const k = suave((t - a.t) / (b.t - a.t));
      return { t, cx: a.cx + (b.cx - a.cx) * k, cy: a.cy + (b.cy - a.cy) * k, w: a.w + (b.w - a.w) * k };
    }
  }
  return CAMERA[CAMERA.length - 1];
}
/** Keeps the shot on the screen, between the menu bar and the Dock. */
function limite({ cx, cy, w, t }: Cam): Cam {
  const h = (w * PLACA.h) / PLACA.w;
  return {
    t, w,
    cx: Math.min(SCREEN.w - w / 2, Math.max(w / 2, cx)),
    cy: Math.min(SCREEN.bottom - h / 2, Math.max(SCREEN.top + h / 2, cy)),
  };
}

// ── the labels: [from when, what it says] ────────────────────────────────

type Marca = [number, string];
const FIG: Marca[] = [
  [0, "Fig 1.1"], [9.4, "Fig 1.2"], [17.6, "Fig 1.3"], [20.3, "Fig 1.4"], [23.3, "Fig 1.5"], [27.7, "Fig 1.6"], [30.3, "Fig 1.7"],
];
const TITULO: Marca[] = [
  [0, "THE ACCUSATION"], [9.4, "SCREENSHOT"], [17.6, "THE DRAWER"], [20.3, "PICK"], [23.3, "BROWSE"], [27.7, "DRAG"], [30.3, "THE PROOF"],
];
const GESTO: Marca[] = [
  [0, "SHE WANTS PROOF"],
  [9.4, "⌘ ⇧ 4 · DRAG A REGION"],
  [11.5, "IT FLIES INTO THE DRAWER →"],
  [13.2, "⌘ ⇧ 4 · ONE MORE"],
  [15.6, "IT FLIES INTO THE DRAWER →"],
  [17.6, "TOUCH THE RIGHT EDGE →"],
  [20.3, "⌘ CLICK · PICK BOTH"],
  [23.3, "HOVER TO OPEN · ↑ ↓"],
  [27.7, "← DRAG BOTH INTO THE CHAT"],
  [30.3, "SENT IN ORDER"],
];
/** A live readout, like an instrument's: what the drawer holds, picks, files. */
const LEITURA: Marca[] = [
  [0, "drawer 3"], [12.3, "drawer 4"], [16.4, "drawer 5"],
  [20.3, "0 of 5"], [20.75, "1 of 5"], [22.3, "2 of 5"],
  [23.3, "rest"], [25.55, "open"], [26.5, "rest"],
  [27.7, "2 files"], [30.3, "sent 2"], [32.3, "alibi weak"],
];

// ── pieces ───────────────────────────────────────────────────────────────

function useT() {
  return INICIO + useCurrentFrame() / FPS;
}

function Tela() {
  const frame = useCurrentFrame();
  const t = INICIO + frame / FPS;
  const cam = limite(camera(t));
  const zoom = PLACA.w / cam.w;
  const ultimo = Math.round((FIM_DO_TAKE - INICIO) * FPS);
  const video = (
    <OffthreadVideo
      src={staticFile("ingles/traicao.mp4")}
      startFrom={Math.round(INICIO * FPS)}
      muted
      style={{
        position: "absolute", maxWidth: "none",
        width: SCREEN.w * zoom, height: SCREEN.h * zoom,
        left: PLACA.w / 2 - cam.cx * zoom, top: PLACA.h / 2 - cam.cy * zoom,
      }}
    />
  );
  return (
    <div style={{
      position: "absolute", left: CARD.x + PLACA.x, top: CARD.y + PLACA.y, width: PLACA.w, height: PLACA.h,
      overflow: "hidden", borderRadius: PLACA.raio, background: "#fff",
    }}>
      {frame >= ultimo ? <Freeze frame={ultimo}>{video}</Freeze> : video}
      <div style={{ position: "absolute", inset: 0, borderRadius: PLACA.raio, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.07)" }} />
    </div>
  );
}

function Cartao() {
  return (
    <div style={{
      position: "absolute", left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h, borderRadius: CARD.raio,
      background: COR.cartao,
      boxShadow: "0 0 0 1px rgba(40,30,20,.05), 0 1px 2px rgba(40,30,20,.04), 0 18px 40px -22px rgba(60,45,30,.22)",
    }} />
  );
}

/** Keys and arrows come from the sans face: the mono one draws them too small. */
function Texto({ children }: { children: string }) {
  return (
    <>
      {children.split(/([⌘⇧→←↑↓])/).map((parte, i) =>
        i % 2 ? <span key={i} style={{ fontFamily: SANS, fontSize: "1.1em", fontWeight: 500 }}>{parte}</span> : parte,
      )}
    </>
  );
}

/** One corner label; when its text changes the old one blurs out as the new one comes in. */
function Rotulo({ marcas, lado, topo, style }: { marcas: Marca[]; lado: "left" | "right"; topo: number; style?: CSSProperties }) {
  const t = useT();
  let i = 0;
  while (i + 1 < marcas.length && t >= marcas[i + 1][0]) i++;
  const [desde, texto] = marcas[i];
  const anterior = i > 0 ? marcas[i - 1][1] : null;
  const k = anterior === null ? 1 : suave(interpolate(t - desde, [0, TROCA], [0, 1], clamp));
  const base: CSSProperties = {
    position: "absolute", top: topo, [lado]: 22, whiteSpace: "nowrap",
    fontFamily: MONO, fontSize: 15, letterSpacing: "0.06em", color: COR.rotulo, fontVariantNumeric: "tabular-nums",
    ...style,
  };
  return (
    <>
      {anterior !== null && k < 1 && (
        <div style={{ ...base, opacity: 1 - k, filter: `blur(${k * 3}px)`, transform: `translateY(${-k * 5}px)` }}><Texto>{anterior}</Texto></div>
      )}
      <div style={{ ...base, opacity: k, filter: `blur(${(1 - k) * 3}px)`, transform: `translateY(${(1 - k) * 5}px)` }}><Texto>{texto}</Texto></div>
    </>
  );
}

function Rotulos() {
  const alto = 16;
  const baixo = CARD.h - 34;
  return (
    <div style={{ position: "absolute", left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h, pointerEvents: "none" }}>
      <Rotulo marcas={FIG} lado="left" topo={alto} style={{ letterSpacing: "0.02em" }} />
      <Rotulo marcas={TITULO} lado="right" topo={alto} />
      <Rotulo marcas={GESTO} lado="left" topo={baixo} />
      <Rotulo marcas={LEITURA} lado="right" topo={baixo} style={{ letterSpacing: "0.02em" }} />
    </div>
  );
}

/** How wide "Use it for free ·" is in the pill, measured on a render. */
const GRATIS = 130;

/** The link below the card; at the end it makes room and "Use it for free" comes in front of it. */
function Link() {
  const t = useT();
  const k = suave(interpolate(t, [37.8, 38.45], [0, 1], clamp));
  const aparece = suave(interpolate(t, [38.3, 38.85], [0, 1], clamp));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: CARD.y + CARD.h + 18, display: "flex", justifyContent: "center" }}>
      <div style={{
        display: "flex", alignItems: "center", padding: "9px 16px", borderRadius: 10, whiteSpace: "nowrap",
        background: "#F4F3EF", boxShadow: "0 0 0 1px rgba(40,30,20,.06), 0 6px 16px -10px rgba(60,45,30,.25)",
        fontFamily: SANS, fontSize: 17, fontWeight: 500, letterSpacing: "-0.005em", color: COR.texto,
      }}>
        <span style={{
          display: "inline-block", overflow: "hidden", maxWidth: k * GRATIS, opacity: aparece, filter: `blur(${(1 - aparece) * 3}px)`,
        }}>
          Use it for free<span style={{ color: COR.rotulo, padding: "0 10px" }}>·</span>
        </span>
        github.com/Frasca-99/gaveta
      </div>
    </div>
  );
}

function Papel() {
  return (
    <AbsoluteFill style={{
      background: "radial-gradient(120% 95% at 12% 0%, #F8F8F4 0%, #EFEDE8 55%, #E8E5E0 100%)",
    }} />
  );
}

// ── the film ─────────────────────────────────────────────────────────────

export const DURACAO_PROVA = Math.round((FIM - INICIO) * FPS);

export function Prova() {
  return (
    <AbsoluteFill>
      <Papel />
      <Cartao />
      <Tela />
      <Rotulos />
      <Link />
    </AbsoluteFill>
  );
}
