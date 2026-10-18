import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame,
} from "remotion";

/**
 * Gaveta in everyday use, in one real-time take: support asks for
 * screenshots of a failed payment; two screenshots go into the drawer, the
 * two are picked and dragged into the chat together, and support has what it
 * needed. Light, no slow motion, a camera that follows the hands, and a short
 * caption with the keys for each step.
 *
 * The take is public/uso/uso.mp4 (video/gravacao, cenas/uso.json): the real
 * app on a Mac, 1470 × 956 points at 2×. Times below are the take's own
 * seconds, read off its frames.
 */

export const FPS = 60;
const FRAME = { x: 80, y: 60, w: 1760, h: 990 };
/** The screen in points; the menu bar and the Dock stay out of the shot. */
const SCREEN = { w: 1470, h: 956, top: 36, bottom: 886 };
const INICIO = 1.3;
const FIM_DO_TAKE = 29.2;
const ENCERRAMENTO = 4.0;
const CRUZA = 0.45;

const SANS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif';
const COR = { fundo: "#eef0f3", texto: "#111113", suave: "#5f6168" };

// ── the camera, in the take's seconds and the screen's points ────────────

type Cam = { t: number; cx: number; cy: number; w: number };
const CHAT = { cx: 770, cy: 400, w: 720 };
const LOJA = { cx: 360, cy: 380, w: 760 };
const ERRO = { cx: 345, cy: 430, w: 620 };
const TELA = { cx: 735, cy: 461, w: 1470 };
const GAVETA = { cx: 1110, cy: 620, w: 900 };
const CARTOES = { cx: 1150, cy: 640, w: 820 };
const CAMINHO = { cx: 1000, cy: 560, w: 1100 };
const ENVIADO = { cx: 770, cy: 540, w: 820 };
const CAMERA: Cam[] = [
  { t: 0, ...CHAT },
  { t: 5.0, ...CHAT },
  { t: 6.3, ...LOJA },
  { t: 8.6, ...LOJA },
  { t: 9.6, ...ERRO },
  { t: 10.9, ...ERRO },
  { t: 11.7, ...TELA },
  { t: 12.7, ...TELA },
  { t: 13.6, ...LOJA },
  { t: 15.5, ...LOJA },
  { t: 16.3, ...TELA },
  { t: 17.2, ...TELA },
  { t: 18.3, ...GAVETA },
  { t: 19.6, ...GAVETA },
  { t: 20.3, ...CARTOES },
  { t: 22.5, ...CARTOES },
  { t: 23.4, ...CAMINHO },
  { t: 24.7, ...CAMINHO },
  { t: 25.6, ...ENVIADO },
  { t: 40, ...ENVIADO },
];

const suave = Easing.inOut(Easing.cubic);
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
  const h = (w * FRAME.h) / FRAME.w;
  return {
    t, w,
    cx: Math.min(SCREEN.w - w / 2, Math.max(w / 2, cx)),
    cy: Math.min(SCREEN.bottom - h / 2, Math.max(SCREEN.top + h / 2, cy)),
  };
}

// ── what each step says ──────────────────────────────────────────────────

type Passo = { de: number; ate: number; teclas?: string[]; texto: string };
const PASSOS: Passo[] = [
  { de: 8.2, ate: 11.1, teclas: ["⌘", "⇧", "4"], texto: "Um print do erro" },
  { de: 11.1, ate: 12.8, texto: "Ele vai direto para a gaveta" },
  { de: 12.8, ate: 15.8, teclas: ["⌘", "⇧", "4"], texto: "Outro, do pedido" },
  { de: 17.3, ate: 19.7, texto: "Na borda da tela, os dois esperam" },
  { de: 19.7, ate: 22.6, teclas: ["⌘", "clique"], texto: "Escolha os dois" },
  { de: 22.6, ate: 24.9, texto: "Arraste juntos para a conversa" },
  { de: 24.9, ate: FIM_DO_TAKE, texto: "Enviados, na ordem" },
];

// ── pieces ───────────────────────────────────────────────────────────────

function Tela() {
  const frame = useCurrentFrame();
  const t = INICIO + frame / FPS;
  const cam = limite(camera(t));
  const zoom = FRAME.w / cam.w;
  return (
    <div style={{ position: "absolute", left: FRAME.x, top: FRAME.y, width: FRAME.w, height: FRAME.h, overflow: "hidden", borderRadius: 22, background: "#fff" }}>
      <OffthreadVideo
        src={staticFile("uso/uso.mp4")}
        startFrom={Math.round(INICIO * FPS)}
        muted
        style={{
          position: "absolute", maxWidth: "none",
          width: SCREEN.w * zoom, height: SCREEN.h * zoom,
          left: FRAME.w / 2 - cam.cx * zoom, top: FRAME.h / 2 - cam.cy * zoom,
        }}
      />
    </div>
  );
}

function Moldura() {
  return (
    <div style={{
      position: "absolute", left: FRAME.x, top: FRAME.y, width: FRAME.w, height: FRAME.h, borderRadius: 22, pointerEvents: "none",
      boxShadow: "inset 0 0 0 1px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.05), 0 40px 90px -30px rgba(30,40,80,.35), 0 12px 30px -12px rgba(30,40,80,.2)",
    }} />
  );
}

function Fundo() {
  return (
    <AbsoluteFill style={{
      background: [
        "radial-gradient(60% 50% at 20% 15%, rgba(150,180,255,.35), rgba(150,180,255,0) 70%)",
        "radial-gradient(50% 45% at 85% 85%, rgba(255,170,140,.30), rgba(255,170,140,0) 70%)",
        `linear-gradient(180deg, #f6f7f9 0%, ${COR.fundo} 100%)`,
      ].join(", "),
    }} />
  );
}

function Tecla({ children }: { children: ReactNode }) {
  const longa = typeof children === "string" && children.length > 1;
  return (
    <span style={{
      display: "inline-grid", placeItems: "center", minWidth: 44, height: 44, padding: "0 12px", borderRadius: 11,
      fontFamily: SANS, fontSize: longa ? 19 : 23, fontWeight: 500, color: COR.texto,
      background: "linear-gradient(180deg, #ffffff, #f1f2f4)",
      boxShadow: "inset 0 0 0 1px rgba(0,0,0,.10), 0 2px 0 rgba(0,0,0,.08), 0 6px 14px -8px rgba(0,0,0,.25)",
    }}>
      {children}
    </span>
  );
}

/** A floating caption at the bottom of the frame, with the keys of the step. */
function Legenda() {
  const frame = useCurrentFrame();
  const t = INICIO + frame / FPS;
  const passo = PASSOS.find((p) => t >= p.de && t < p.ate);
  if (!passo) return null;
  const desde = Math.round((passo.de - INICIO) * FPS);
  const ate = Math.round((passo.ate - INICIO) * FPS);
  const entra = spring({ frame: frame - desde, fps: FPS, config: { damping: 200, mass: 0.6 } });
  const sai = interpolate(frame, [ate - 10, ate], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const estilo: CSSProperties = {
    position: "absolute", left: FRAME.x, width: FRAME.w, top: FRAME.y + FRAME.h - 112, display: "flex", justifyContent: "center", pointerEvents: "none",
    opacity: entra * sai, transform: `translateY(${(1 - entra) * 12}px)`,
  };
  return (
    <div style={estilo}>
      <div style={{
        display: "flex", alignItems: "center", gap: 14, padding: passo.teclas ? "10px 26px 10px 12px" : "16px 28px", borderRadius: 999,
        background: "rgba(255,255,255,.88)", backdropFilter: "blur(18px) saturate(1.6)",
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,.06), 0 18px 40px -16px rgba(20,30,60,.35)",
        fontFamily: SANS, fontSize: 28, fontWeight: 500, letterSpacing: "-0.01em", color: COR.texto,
      }}>
        {passo.teclas && <span style={{ display: "flex", gap: 6 }}>{passo.teclas.map((k, i) => <Tecla key={i}>{k}</Tecla>)}</span>}
        <span>{passo.texto}</span>
      </div>
    </div>
  );
}

function Marca() {
  return (
    <div style={{ position: "absolute", left: FRAME.x + 4, top: 18, display: "flex", alignItems: "center", gap: 9, fontFamily: SANS, fontSize: 19, fontWeight: 600, color: "#2a2b30", letterSpacing: "-0.01em" }}>
      <Img src={staticFile("icone.png")} style={{ width: 24, height: 24 }} />
      Gaveta
    </div>
  );
}

function Encerramento() {
  const frame = useCurrentFrame();
  const entra = spring({ frame, fps: FPS, config: { damping: 200 } });
  const link = spring({ frame: frame - 14, fps: FPS, config: { damping: 18 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: SANS, opacity: entra }}>
      <Img src={staticFile("icone.png")} style={{ width: 132, height: 132, filter: "drop-shadow(0 22px 40px rgba(30,40,80,.25))" }} />
      <div style={{ marginTop: 22, fontSize: 84, fontWeight: 600, letterSpacing: "-0.04em", color: COR.texto }}>Gaveta</div>
      <div style={{ marginTop: 4, fontSize: 34, fontWeight: 500, letterSpacing: "-0.015em", color: COR.suave }}>Tire os prints. Arraste todos de uma vez.</div>
      <div style={{
        marginTop: 36, padding: "14px 26px", borderRadius: 999, fontSize: 28, fontWeight: 500, color: "#fff", background: "#111113",
        opacity: link, transform: `translateY(${(1 - link) * 12}px)`,
      }}>
        github.com/Frasca-99/gaveta
      </div>
      <div style={{ marginTop: 18, fontSize: 20, color: COR.suave }}>Grátis · macOS 14+</div>
    </AbsoluteFill>
  );
}

// ── the film ─────────────────────────────────────────────────────────────

const TAKE = Math.round((FIM_DO_TAKE - INICIO) * FPS);
const CRUZA_Q = Math.round(CRUZA * FPS);
export const DURACAO_USO = TAKE - CRUZA_Q + Math.round(ENCERRAMENTO * FPS);

export function NaPratica() {
  const frame = useCurrentFrame();
  const entra = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const sai = interpolate(frame, [TAKE - CRUZA_Q, TAKE], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: COR.fundo }}>
      <Fundo />
      <Sequence durationInFrames={TAKE}>
        <AbsoluteFill style={{ opacity: entra * sai }}>
          <Tela />
          <Moldura />
          <Legenda />
          <Marca />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={TAKE - CRUZA_Q}>
        <Encerramento />
      </Sequence>
    </AbsoluteFill>
  );
}

