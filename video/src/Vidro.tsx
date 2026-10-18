import type { CSSProperties, ReactNode } from "react";
import { Fragment, useEffect, useMemo, useState } from "react";
import {
  AbsoluteFill, continueRender, delayRender, Easing, Img, interpolate, spring, staticFile, useCurrentFrame,
} from "remotion";

/**
 * Gaveta, exaggerated: the same flow as the real app (a screenshot flies into
 * the drawer at the edge of the screen, two are picked and dragged into the
 * chat), rebuilt as a design piece. The screen floats in the dark as an
 * object, the camera moves around it in 3D, and the drawer is glass that
 * bends the wallpaper at its edges. The opening still and the wallpaper were
 * made with Higgsfield; the Moments window and the screenshots are the real
 * ones from the English take.
 *
 * Everything below is in screen points (the Mac is 1470 × 956), drawn at K
 * pixels per point so the camera can come close and stay sharp.
 */

export const FPS = 60;
const K = 2;
const s = (v: number) => v * K;
const TELA = { w: 1470, h: 956 };
/** The wallpaper covers the screen: 2048 × 1152 scaled to 1700 × 956, centred. */
const PAPEL = { x: -115, y: 0, w: 1700, h: 956 };
const DURACAO = 31;
export const DURACAO_VIDRO = Math.round(DURACAO * FPS);

const SANS = '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';
const DISPLAY = '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif';
const AZUL = "#0A84FF";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const suave = Easing.inOut(Easing.cubic);
const sai = Easing.out(Easing.cubic);

function rampa(t: number, a: number, b: number, e: (n: number) => number = suave) {
  return interpolate(t, [a, b], [0, 1], { ...clamp, easing: e });
}
function useT() {
  return useCurrentFrame() / FPS;
}
/** A spring that starts at a time, in seconds; bouncy by default, because this film exaggerates. */
function mola(frame: number, inicio: number, config: { damping?: number; stiffness?: number; mass?: number } = {}) {
  return spring({ frame: frame - Math.round(inicio * FPS), fps: FPS, config: { damping: 13, stiffness: 150, mass: 0.9, ...config } });
}
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// ── the story, in seconds ────────────────────────────────────────────────

const T = {
  aberturaSai: 3.0, mundo: 3.9,
  teclas1: 6.0, aperta1: 6.5,
  sel1: [6.95, 8.2] as const, flash1: 8.32, ergue1: 8.5, voa1: [9.1, 10.3] as const, pousa1: 10.3,
  abre1: 9.5, fecha1: 10.75,
  sel2: [11.05, 11.65] as const, flash2: 11.72, ergue2: 11.8, voa2: [12.05, 12.85] as const, pousa2: 12.85,
  abre2: 12.3, fecha2: 13.35,
  borda: [13.6, 14.3] as const, abre3: 14.35,
  camadas: [15.3, 17.6] as const, luz: [15.4, 16.9] as const,
  teclas2: 18.45, marca1: 19.05, marca2: 19.65,
  aperta: 20.4, empilha: [20.5, 20.95] as const, leva: [21.1, 22.3] as const, solta: 22.35, fecha3: 22.7,
  falas: [
    { quando: 24.1, digita: 23.5 as number | null, texto: "Ok… you're right.", dele: false },
    { quando: 25.0, digita: 24.45 as number | null, texto: "But how did you send them so fast?", dele: false },
    { quando: 25.8, digita: null as number | null, texto: "Simple, babe. I'm using Gaveta.", dele: true },
    { quando: 26.8, digita: 26.2 as number | null, texto: "Nice. I'm trying it too.", dele: false },
  ],
  fim: 27.6, pilula: 28.5,
};

// ── the camera: the point of the screen at the centre, zoom (px per point) and tilt ──

type Cam = { t: number; cx: number; cy: number; z: number; rx: number; ry: number };
const CAMERA: Cam[] = [
  { t: 0, cx: 735, cy: 478, z: 0.84, rx: 16, ry: -22 },
  { t: 3.0, cx: 735, cy: 478, z: 0.84, rx: 16, ry: -22 },
  { t: 4.8, cx: 735, cy: 478, z: 1.0, rx: 8, ry: -10 },
  { t: 6.1, cx: 360, cy: 350, z: 1.85, rx: 4, ry: -7 },
  { t: 8.3, cx: 350, cy: 330, z: 2.0, rx: 2, ry: -4 },
  { t: 8.6, cx: 350, cy: 330, z: 2.0, rx: 2, ry: -4 },
  { t: 9.4, cx: 800, cy: 430, z: 1.15, rx: 6, ry: 6 },
  { t: 10.4, cx: 1150, cy: 470, z: 1.45, rx: 4, ry: 10 },
  { t: 11.0, cx: 790, cy: 450, z: 1.06, rx: 6, ry: 0 },
  { t: 12.6, cx: 900, cy: 470, z: 1.12, rx: 5, ry: 4 },
  { t: 13.5, cx: 1000, cy: 480, z: 1.22, rx: 4, ry: 6 },
  { t: 14.4, cx: 1250, cy: 480, z: 1.6, rx: 3, ry: 10 },
  { t: 15.3, cx: 1235, cy: 480, z: 1.12, rx: 9, ry: 34 },
  { t: 17.1, cx: 1235, cy: 480, z: 1.18, rx: -5, ry: -26 },
  { t: 18.4, cx: 1300, cy: 610, z: 2.15, rx: 0, ry: -3 },
  { t: 18.7, cx: 1300, cy: 620, z: 2.2, rx: 0, ry: 0 },
  { t: 20.3, cx: 1300, cy: 620, z: 2.2, rx: 0, ry: 0 },
  { t: 21.0, cx: 1100, cy: 560, z: 1.6, rx: 2, ry: 4 },
  { t: 22.3, cx: 820, cy: 500, z: 1.7, rx: 2, ry: -4 },
  { t: 23.3, cx: 770, cy: 470, z: 2.25, rx: 0, ry: -6 },
  { t: 27.2, cx: 770, cy: 480, z: 2.3, rx: 0, ry: 3 },
  { t: 28.8, cx: 735, cy: 478, z: 0.92, rx: 12, ry: 16 },
  { t: DURACAO, cx: 735, cy: 478, z: 0.88, rx: 13, ry: 19 },
];
function camera(t: number): Cam {
  if (t <= CAMERA[0].t) return CAMERA[0];
  for (let i = 0; i < CAMERA.length - 1; i++) {
    const a = CAMERA[i];
    const b = CAMERA[i + 1];
    if (t <= b.t) {
      const k = suave((t - a.t) / (b.t - a.t));
      return { t, cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), z: lerp(a.z, b.z, k), rx: lerp(a.rx, b.rx, k), ry: lerp(a.ry, b.ry, k) };
    }
  }
  return CAMERA[CAMERA.length - 1];
}

// ── glass: the wallpaper behind, bent at the edges, split into colours, frosted ──

/** A map that pushes what is behind the glass toward its edges, strongest at the rim. */
function mapaDeLente(w: number, h: number, m: number, r: number, faixa: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) { d[i] = 128; d[i + 1] = 128; d[i + 2] = 128; d[i + 3] = 255; }
  const cx = w / 2, cy = h / 2, hw = w / 2 - m, hh = h / 2 - m;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const qx = Math.abs(x - cx) - (hw - r);
      const qy = Math.abs(y - cy) - (hh - r);
      const fora = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
      const dentro = -fora;
      if (dentro < 0 || dentro > faixa) continue;
      const k = Math.pow(1 - dentro / faixa, 2);
      let nx = 0, ny = 0;
      if (qx > 0 && qy > 0) { const l = Math.hypot(qx, qy) || 1; nx = qx / l; ny = qy / l; }
      else if (qx > qy) nx = 1; else ny = 1;
      nx *= Math.sign(x - cx); ny *= Math.sign(y - cy);
      const o = (y * w + x) * 4;
      d[o] = 128 + 127 * k * nx;
      d[o + 1] = 128 + 127 * k * ny;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL("image/png");
}

const mapas = new Map<string, string>();
function useMapa(w: number, h: number, m: number, r: number, faixa: number) {
  const chave = [w, h, m, r, faixa].map(Math.round).join("x");
  const url = useMemo(() => {
    if (!mapas.has(chave)) mapas.set(chave, mapaDeLente(Math.round(w), Math.round(h), m, r, faixa));
    return mapas.get(chave)!;
  }, [chave]);
  const [espera] = useState(() => delayRender("mapa de lente"));
  useEffect(() => {
    const i = new Image();
    i.src = url;
    i.decode().then(() => continueRender(espera), () => continueRender(espera));
  }, [url, espera]);
  return url;
}

/**
 * A pane of glass at (x, y) on the screen, in points: the wallpaper behind it
 * is bent at the rim, split into colours there and frosted, with a tint, a
 * rim of light, and a highlight that can sweep across (luz 0 → 1).
 */
function Vidro({ id, x, y, w, h, r, luz = -1, lente = 38, tinta = 0.035, sombra = true, style }: {
  id: string; x: number; y: number; w: number; h: number; r: number; luz?: number; lente?: number; tinta?: number; sombra?: boolean; style?: CSSProperties;
}) {
  const M = s(40);
  const W = s(w) + 2 * M, H = s(h) + 2 * M;
  const mapa = useMapa(W, H, M, s(r), s(26));
  const esc = s(lente);
  return (
    <div style={{
      position: "absolute", left: s(x), top: s(y), width: s(w), height: s(h), borderRadius: s(r), overflow: "hidden",
      boxShadow: sombra ? `0 ${s(18)}px ${s(50)}px rgba(25,10,45,.32), 0 ${s(2)}px ${s(6)}px rgba(25,10,45,.18)` : undefined,
      ...style,
    }}>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse">
            <feImage href={mapa} x="0" y="0" width={W} height={H} preserveAspectRatio="none" result="mapa" />
            {[["1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0", 1, "r"], ["0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0", 1.03, "g"], ["0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0", 1.06, "b"]].map(([m, f, n]) => (
              <Fragment key={n as string}>
                <feDisplacementMap in="SourceGraphic" in2="mapa" scale={-esc * (f as number)} xChannelSelector="R" yChannelSelector="G" result={`d${n}`} />
                <feColorMatrix in={`d${n}`} type="matrix" values={m as string} result={n as string} />
              </Fragment>
            ))}
            <feComposite in="r" in2="g" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="rg" />
            <feComposite in="rg" in2="b" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
          </filter>
        </defs>
      </svg>
      <div style={{
        position: "absolute", left: -M, top: -M, width: W, height: H,
        backgroundImage: `url(${staticFile("vidro/fundo.jpg")})`,
        backgroundSize: `${s(PAPEL.w)}px ${s(PAPEL.h)}px`,
        backgroundPosition: `${s(PAPEL.x) - s(x) + M}px ${s(PAPEL.y) - s(y) + M}px`,
        filter: `url(#${id}) blur(${s(3.5)}px) saturate(1.5)`,
      }} />
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, rgba(255,255,255,${tinta + 0.08}), rgba(255,255,255,${tinta}) 40%, rgba(255,255,255,${tinta * 0.6}))` }} />
      {luz >= 0 && luz <= 1 && (
        <div style={{
          position: "absolute", inset: 0, mixBlendMode: "screen",
          background: `linear-gradient(115deg, transparent ${lerp(-40, 100, luz)}%, rgba(255,255,255,.55) ${lerp(-30, 110, luz)}%, transparent ${lerp(-20, 120, luz)}%)`,
        }} />
      )}
      <div style={{
        position: "absolute", inset: 0, borderRadius: s(r),
        boxShadow: `inset 0 0 0 ${s(1)}px rgba(255,255,255,.55), inset ${s(1)}px ${s(1.5)}px 0 rgba(255,255,255,.9), inset 0 -${s(1)}px 0 rgba(255,255,255,.3), inset 0 0 ${s(34)}px rgba(70,20,90,.16)`,
      }} />
    </div>
  );
}

// ── the screen and what is on it ─────────────────────────────────────────

function Papel() {
  return <Img src={staticFile("vidro/fundo.jpg")} style={{ position: "absolute", left: s(PAPEL.x), top: s(PAPEL.y), width: s(PAPEL.w), height: s(PAPEL.h) }} />;
}

function Moments() {
  return (
    <div style={{
      position: "absolute", left: s(150), top: s(117.5), width: s(380), height: s(441), borderRadius: s(13), overflow: "hidden",
      boxShadow: `0 ${s(22)}px ${s(60)}px rgba(20,10,40,.35), 0 0 0 ${s(0.5)}px rgba(0,0,0,.18)`,
    }}>
      <Img src={staticFile("vidro/moments.png")} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}

/** The ⌘⇧4 selection, drawn by the crosshair: dim around, a bright frame, the size beside it. */
function Selecao({ t, de, ate, x0, y0, x1, y1, flash }: { t: number; de: number; ate: number; x0: number; y0: number; x1: number; y1: number; flash: number }) {
  const aparece = rampa(t, de - 0.25, de);
  const some = 1 - rampa(t, flash + 0.05, flash + 0.35);
  if (aparece <= 0 || some <= 0) return null;
  const k = rampa(t, de, ate, Easing.inOut(Easing.quad));
  const x = x0, y = y0, w = (x1 - x0) * k, h = (y1 - y0) * k;
  const brilho = Math.max(0, 1 - Math.abs(t - flash) / 0.12);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: aparece * some }}>
      <div style={{ position: "absolute", left: s(x), top: s(y), width: s(w), height: s(h), boxShadow: `0 0 0 ${s(2000)}px rgba(10,8,30,.28)` }} />
      <div style={{
        position: "absolute", left: s(x), top: s(y), width: s(w), height: s(h),
        background: `rgba(255,255,255,${0.12 + brilho * 0.7})`,
        boxShadow: `0 0 0 ${s(1.5)}px rgba(255,255,255,.95), 0 0 ${s(18)}px rgba(255,255,255,.55)`,
      }} />
      {[[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([cx, cy], i) => (
        <div key={i} style={{ position: "absolute", left: s(cx - 4), top: s(cy - 4), width: s(8), height: s(8), borderRadius: s(2), background: "#fff", boxShadow: `0 0 ${s(8)}px rgba(255,255,255,.9)` }} />
      ))}
      {k > 0.05 && (
        <div style={{
          position: "absolute", left: s(x + w + 12), top: s(y + h + 10), padding: `${s(4)}px ${s(9)}px`, borderRadius: s(8),
          background: "rgba(20,20,28,.72)", color: "#fff", fontFamily: SANS, fontSize: s(12), fontWeight: 600, fontVariantNumeric: "tabular-nums",
          boxShadow: `0 ${s(6)}px ${s(16)}px rgba(0,0,0,.25)`, whiteSpace: "nowrap",
        }}>
          {Math.round((x1 - x0) * k)} × {Math.round((y1 - y0) * k)}
        </div>
      )}
    </div>
  );
}

// ── the chat ─────────────────────────────────────────────────────────────

type Fala = { dela: boolean; texto?: string; imagens?: boolean; quando: number };
const FALAS: Fala[] = [
  { dela: true, texto: "Why did you like Chloe's photo at 3 am?", quando: -1 },
  { dela: true, texto: "And you texted her??", quando: -1 },
  { dela: false, texto: "Babe, I never texted her", quando: -1 },
  { dela: false, texto: "I can prove it. Sending screenshots", quando: -1 },
  { dela: true, texto: "Go on.", quando: -1 },
  { dela: false, imagens: true, quando: T.solta + 0.05 },
  ...T.falas.map((f) => ({ dela: !f.dele, texto: f.texto, quando: f.quando })),
];
const ALTURA_FALA = 36;
const ALTURA_IMAGENS = 230 * 622 / 706 + 4 + 230 * 148 / 706 + 5;
const DIGITANDO = T.falas.filter((f) => f.digita !== null).map((f) => [f.digita as number, f.quando] as const);
const VISTA = 371;

/** How far the messages have scrolled at t: each new message pushes the list up, eased. */
function rolagem(t: number) {
  const eventos: [number, number][] = [];
  for (const f of FALAS) if (f.quando > 0) eventos.push([f.quando, f.imagens ? ALTURA_IMAGENS : ALTURA_FALA]);
  for (const [a, b] of DIGITANDO) { eventos.push([a, 32]); eventos.push([b, -32]); }
  eventos.sort((a, b) => a[0] - b[0]);
  let altura = 12 + 22 + FALAS.filter((f) => f.quando < 0).length * ALTURA_FALA + 7;
  let antes = Math.max(0, altura - VISTA);
  let total = antes;
  for (const [quando, dh] of eventos) {
    altura += dh;
    const alvo = Math.max(0, altura - VISTA);
    total += (alvo - antes) * rampa(t, quando, quando + 0.38, sai);
    antes = alvo;
  }
  return total;
}

function Bolha({ fala, t }: { fala: Fala; t: number }) {
  const frame = useCurrentFrame();
  const entra = fala.quando < 0 ? 1 : mola(frame, fala.quando, { damping: 11, stiffness: 170 });
  if (fala.quando > 0 && t < fala.quando) return null;
  const estilo: CSSProperties = {
    transform: `scale(${lerp(0.4, 1, entra)})`, opacity: Math.min(1, entra * 1.6),
    transformOrigin: fala.dela ? "left bottom" : "right bottom",
  };
  return (
    <div style={{ display: "flex", justifyContent: fala.dela ? "flex-start" : "flex-end", marginBottom: s(5) }}>
      {fala.imagens ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: s(4), ...estilo }}>
          {["post.png", "conversa.png"].map((f) => (
            <Img key={f} src={staticFile(`vidro/${f}`)} style={{ width: s(230), borderRadius: s(12), boxShadow: `0 0 0 ${s(0.5)}px rgba(0,0,0,.12)`, display: "block" }} />
          ))}
        </div>
      ) : (
        <div style={{
          ...estilo, fontFamily: SANS, fontSize: s(14), lineHeight: `${s(17)}px`, whiteSpace: "nowrap",
          padding: `${s(7)}px ${s(12)}px`, borderRadius: s(17),
          background: fala.dela ? "#E9E9EB" : AZUL, color: fala.dela ? "#111" : "#fff",
        }}>
          {fala.texto}
        </div>
      )}
    </div>
  );
}

function Digitando({ t }: { t: number }) {
  const ativo = DIGITANDO.find(([a, b]) => t >= a && t < b);
  if (!ativo) return null;
  const k = rampa(t, ativo[0], ativo[0] + 0.15);
  return (
    <div style={{ display: "flex", marginBottom: s(5), opacity: k }}>
      <div style={{ display: "flex", gap: s(4), padding: `${s(10)}px ${s(12)}px`, borderRadius: s(17), background: "#E9E9EB" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: s(7), height: s(7), borderRadius: "50%", background: "#8e8e93", opacity: 0.35 + 0.65 * Math.max(0, Math.sin((t - ativo[0]) * 9 - i * 0.9)) }} />
        ))}
      </div>
    </div>
  );
}

function Chat({ t }: { t: number }) {
  const alvo = rampa(t, T.leva[1] - 0.4, T.leva[1] - 0.1) * (1 - rampa(t, T.solta, T.solta + 0.25));
  return (
    <div style={{
      position: "absolute", left: s(590), top: s(220), width: s(360), height: s(500), borderRadius: s(13), overflow: "hidden", background: "#fff",
      boxShadow: `0 ${s(22)}px ${s(60)}px rgba(20,10,40,.35), 0 0 0 ${s(0.5)}px rgba(0,0,0,.18), 0 0 0 ${s(3) * alvo}px rgba(10,132,255,${0.6 * alvo})`,
      fontFamily: SANS,
    }}>
      <div style={{ height: s(30), display: "flex", alignItems: "center", gap: s(8), padding: `0 ${s(12)}px`, borderBottom: `${s(0.5)}px solid #e4e4e7`, background: "#f6f6f6" }}>
        {["#FF5F57", "#FEBC2E", "#D9D9D9"].map((c) => <div key={c} style={{ width: s(12), height: s(12), borderRadius: "50%", background: c }} />)}
        <div style={{ marginLeft: s(10), fontSize: s(13), fontWeight: 600, color: "#3a3a3c" }}>Chat</div>
      </div>
      <div style={{ height: s(45), display: "flex", alignItems: "center", justifyContent: "center", gap: s(8), borderBottom: `${s(0.5)}px solid #e4e4e7` }}>
        <div style={{ width: s(26), height: s(26), borderRadius: "50%", background: "linear-gradient(180deg, #F7A8C4, #DE6399)", color: "#fff", fontSize: s(12), fontWeight: 600, display: "grid", placeItems: "center" }}>E</div>
        <div style={{ fontSize: s(14), fontWeight: 600 }}>Emma</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: s(75), height: s(VISTA), overflow: "hidden", background: `rgba(10,132,255,${0.07 * alvo})` }}>
        <div style={{ padding: `${s(12)}px ${s(14)}px`, transform: `translateY(${-s(rolagem(t))}px)` }}>
          <div style={{ textAlign: "center", fontSize: s(11), fontWeight: 500, color: "#8e8e93", height: s(17), marginBottom: s(5) }}>Today 3:12 AM</div>
          {FALAS.map((f, i) => <Bolha key={i} fala={f} t={t} />)}
          <Digitando t={t} />
        </div>
      </div>
      <div style={{ position: "absolute", left: s(10), right: s(10), bottom: s(10), height: s(34), borderRadius: s(17), border: `${s(1)}px solid #d9d9dc`, display: "flex", alignItems: "center", padding: `0 ${s(14)}px`, fontSize: s(13), color: "#b0b0b5" }}>
        Message
      </div>
    </div>
  );
}

// ── the drawer ───────────────────────────────────────────────────────────

const GAVETA = { x: 1112, y: 70, w: 352, h: 826, r: 30 };
type Ficha = { img: string; titulo: string; tamanho: string; quando: string; y: number; h: number; compacta?: boolean; nova?: number; caixa?: number };
const FICHAS: Ficha[] = [
  { img: "painel.png", titulo: "Screenshot", tamanho: "980 × 560", quando: "2 h ago", y: 26, h: 66, compacta: true },
  { img: "paleta.png", titulo: "Screenshot", tamanho: "520 × 640", quando: "38 min ago", y: 98, h: 66, compacta: true },
  { img: "codigo.png", titulo: "Screenshot", tamanho: "1160 × 520", quando: "12 min ago", y: 170, h: 196 },
  { img: "post.png", titulo: "Screenshot", tamanho: "706 × 622", quando: "now", y: 372, h: 196, nova: T.pousa1 },
  { img: "conversa.png", titulo: "Screenshot", tamanho: "706 × 148", quando: "now", y: 574, h: 98, nova: T.pousa2, caixa: 53 },
];
/** Where the image of a full card sits on the screen, for the screenshots that fly in. */
function caixaDaImagem(f: Ficha, iw: number, ih: number) {
  const bw = 268 - 16, bh = f.caixa ?? 150;
  const k = Math.min(bw / iw, bh / ih);
  const w = iw * k, h = ih * k;
  return { x: GAVETA.x + 68 + 8 + (bw - w) / 2, y: GAVETA.y + f.y + 8 + (bh - h) / 2, w, h };
}

/** How open the drawer is, 0 → 1, with an overshoot when it springs out. */
function abertura(frame: number, t: number) {
  const abre = (a: number) => mola(frame, a, { damping: 11, stiffness: 120 });
  const fecha = (a: number) => rampa(t, a, a + 0.42, Easing.in(Easing.cubic));
  if (t < T.fecha1) return abre(T.abre1);
  if (t < T.abre2) return 1 - fecha(T.fecha1);
  if (t < T.fecha2) return abre(T.abre2);
  if (t < T.abre3) return 1 - fecha(T.fecha2);
  if (t < T.fecha3) return abre(T.abre3);
  return 1 - fecha(T.fecha3);
}

function Marca({ t, quando }: { t: number; quando?: number }) {
  const frame = useCurrentFrame();
  const k = quando === undefined ? 0 : mola(frame, quando, { damping: 9, stiffness: 220 });
  const onda = quando === undefined ? 0 : rampa(t, quando, quando + 0.5, sai);
  return (
    <div style={{ position: "absolute", left: s(9), top: s(9), width: s(19), height: s(19) }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#fff", boxShadow: `inset 0 0 0 ${s(1.5)}px #c7c7cc, 0 ${s(1)}px ${s(3)}px rgba(0,0,0,.15)` }} />
      {quando !== undefined && t >= quando && (
        <>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `${s(2)}px solid ${AZUL}`, transform: `scale(${1 + onda * 1.8})`, opacity: 0.7 * (1 - onda) }} />
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: AZUL, transform: `scale(${k})`, display: "grid", placeItems: "center", boxShadow: `0 0 ${s(10)}px rgba(10,132,255,.6)` }}>
            <svg width={s(11)} height={s(11)} viewBox="0 0 12 12"><path d="M2.5 6.3 L5 8.6 L9.6 3.6" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        </>
      )}
    </div>
  );
}

function CartaoFicha({ f, t, marcada }: { f: Ficha; t: number; marcada?: number }) {
  const escolhida = marcada !== undefined && t >= marcada;
  const borda = escolhida ? `0 0 0 ${s(2)}px ${AZUL}, 0 0 ${s(18)}px rgba(10,132,255,.45)` : `0 0 0 ${s(0.5)}px rgba(0,0,0,.08)`;
  const base: CSSProperties = {
    position: "absolute", inset: 0, background: "#fff", borderRadius: s(f.compacta ? 12 : 14), fontFamily: SANS,
    boxShadow: `${borda}, 0 ${s(6)}px ${s(18)}px rgba(40,20,60,.16)`,
  };
  if (f.compacta) {
    return (
      <div style={{ ...base, display: "flex", alignItems: "center", gap: s(10), padding: s(7) }}>
        <div style={{ width: s(96), height: s(52), borderRadius: s(7), overflow: "hidden", background: "#f2f2f4", flexShrink: 0 }}>
          <Img src={staticFile(`vidro/${f.img}`)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>
        <div style={{ lineHeight: 1.25 }}>
          <div style={{ fontSize: s(12), fontWeight: 600, color: "#1d1d1f" }}>{f.titulo}</div>
          <div style={{ fontSize: s(11), color: "#8a8a8e" }}>{f.tamanho}</div>
          <div style={{ fontSize: s(11), color: "#8a8a8e" }}>{f.quando}</div>
        </div>
        <Marca t={t} />
      </div>
    );
  }
  return (
    <div style={{ ...base, padding: s(8) }}>
      <div style={{ height: s(f.caixa ?? 150), borderRadius: s(9), background: "#f4f4f6", display: "grid", placeItems: "center", overflow: "hidden" }}>
        <Img src={staticFile(`vidro/${f.img}`)} style={{ maxWidth: "100%", maxHeight: "100%", display: "block" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: s(9), fontSize: s(11.5), color: "#8a8a8e" }}>
        <span>{f.titulo} · {f.tamanho}</span><span>{f.quando}</span>
      </div>
      <Marca t={t} quando={marcada} />
      {escolhida && (
        <div style={{ position: "absolute", right: s(9), top: s(9), width: s(19), height: s(19), borderRadius: "50%", background: "#1d1d1f", display: "grid", placeItems: "center" }}>
          <svg width={s(9)} height={s(9)} viewBox="0 0 10 10"><path d="M2.5 2.5 L7.5 7.5 M7.5 2.5 L2.5 7.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </div>
      )}
    </div>
  );
}

function Barra({ t, dx }: { t: number; dx: number }) {
  const k1 = rampa(t, T.marca1, T.marca1 + 0.25);
  const contagem = t < T.marca2 ? "1 of 5" : "2 of 5";
  const pilula: CSSProperties = {
    height: s(28), padding: `0 ${s(11)}px`, borderRadius: s(14), display: "flex", alignItems: "center", gap: s(5),
    background: "rgba(255,255,255,.42)", boxShadow: `inset 0 0 0 ${s(0.75)}px rgba(255,255,255,.75), 0 ${s(2)}px ${s(6)}px rgba(40,20,60,.12)`,
    fontSize: s(12), fontWeight: 600, color: "#1d1d1f",
  };
  return (
    <div style={{ position: "absolute", left: s(GAVETA.x + 68), top: s(GAVETA.y + 784), width: s(268), height: s(30), fontFamily: SANS, clipPath: corte(GAVETA.x + 68, 268, dx) }}>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between", opacity: 1 - k1 }}>
        <div style={pilula}>◎ Select all</div>
        <div style={{ fontSize: s(11.5), color: "rgba(40,30,50,.6)" }}>or ⌘-click</div>
      </div>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", gap: s(6), opacity: k1 }}>
        <div style={{ fontSize: s(13), fontWeight: 600, color: "#1d1d1f", marginRight: "auto", fontVariantNumeric: "tabular-nums" }}>{contagem}</div>
        <div style={pilula}>All</div>
        <div style={{ ...pilula, background: AZUL, color: "#fff", boxShadow: `0 ${s(3)}px ${s(10)}px rgba(10,132,255,.4)` }}>{t < T.marca2 ? "Copy" : "Copy all"}</div>
        <div style={{ ...pilula, padding: 0, width: s(28), justifyContent: "center" }}>×</div>
      </div>
    </div>
  );
}

/**
 * The drawer lives outside the screen's clip so its cards can float in 3D; each piece is cut
 * where it passes the edge of the screen instead, given its left and width and how far the
 * drawer has slid out (dx).
 */
function corte(x: number, w: number, dx: number, r = 0) {
  const fora = Math.max(0, Math.min(w, x + dx + w - TELA.w));
  return `inset(0 ${s(fora)}px 0 0${r ? ` round ${s(r)}px` : ""})`;
}

function Gaveta({ t }: { t: number }) {
  const frame = useCurrentFrame();
  const a = abertura(frame, t);
  const dx = (1 - a) * (GAVETA.w + 30);
  const camadas = rampa(t, T.camadas[0], T.camadas[0] + 0.9) * (1 - rampa(t, T.camadas[1] - 0.8, T.camadas[1]));
  const luz = interpolate(t, [T.luz[0], T.luz[1]], [0, 1], clamp);
  const contagem = t < T.pousa1 ? 3 : t < T.pousa2 ? 4 : 5;
  const arrastando = t >= T.aperta;
  return (
    <>
      {/* the handle at the edge, while the drawer is shut */}
      <div style={{
        position: "absolute", left: s(TELA.w - 12), top: s(440), width: s(7), height: s(80), borderRadius: s(4),
        background: "rgba(255,255,255,.55)", boxShadow: `0 0 ${s(10)}px rgba(255,255,255,.6), inset 0 0 0 ${s(0.75)}px rgba(255,255,255,.8)`,
        opacity: 1 - a, transform: `scaleY(${1 + 0.5 * rampa(t, T.borda[1] - 0.25, T.borda[1]) * (1 - a)})`,
      }} />
      <div style={{ position: "absolute", left: 0, top: 0, transform: `translateX(${s(dx)}px)`, transformStyle: "preserve-3d" }}>
        {/* the thickness of the glass, seen when the camera turns */}
        {[3, 2, 1].map((i) => (
          <div key={i} style={{
            position: "absolute", left: s(GAVETA.x), top: s(GAVETA.y), width: s(GAVETA.w), height: s(GAVETA.h), borderRadius: s(GAVETA.r),
            transform: `translateZ(${-s(i * 3)}px)`, border: `${s(1)}px solid rgba(255,255,255,${0.2 - i * 0.05})`, background: "rgba(255,220,240,.03)",
            clipPath: corte(GAVETA.x, GAVETA.w, dx, GAVETA.r),
          }} />
        ))}
        <Vidro id="vidro-gaveta" x={GAVETA.x + dx} y={GAVETA.y} w={GAVETA.w} h={GAVETA.h} r={GAVETA.r} luz={luz} style={{ left: s(GAVETA.x), top: s(GAVETA.y), clipPath: corte(GAVETA.x, GAVETA.w, dx, GAVETA.r) }} />
        {/* the count and the handle in the gutter */}
        <div style={{ position: "absolute", left: s(GAVETA.x + 28), top: s(GAVETA.y + 370), transform: "translateX(-50%)", fontFamily: SANS, fontSize: s(13), fontWeight: 600, color: "rgba(40,20,50,.75)", opacity: dx < 1 ? 1 : 0 }}>{contagem}</div>
        <div style={{ position: "absolute", left: s(GAVETA.x + 26), top: s(GAVETA.y + 396), width: s(4), height: s(44), borderRadius: s(2), background: "rgba(40,20,50,.28)", clipPath: corte(GAVETA.x + 26, 4, dx) }} />
        <div style={{ position: "absolute", left: s(GAVETA.x + 56), top: s(GAVETA.y + 24), width: s(0.75), height: s(GAVETA.h - 48), background: "rgba(255,255,255,.45)", clipPath: corte(GAVETA.x + 56, 1, dx) }} />
        {FICHAS.map((f, i) => {
          if (f.nova !== undefined && t < f.nova) return null;
          const pousa = f.nova === undefined ? 1 : mola(frame, f.nova, { damping: 12, stiffness: 200 });
          const levanta = arrastando && f.nova !== undefined ? 1 : 0;
          const marcada = f.img === "post.png" ? T.marca1 : f.img === "conversa.png" ? T.marca2 : undefined;
          return (
            <div key={f.img} style={{
              position: "absolute", left: s(GAVETA.x + 68), top: s(GAVETA.y + f.y), width: s(268), height: s(f.h),
              transform: `translateZ(${s(camadas * (8 + i * 16))}px) scale(${lerp(0.92, 1, pousa)})`,
              opacity: Math.min(1, pousa * 1.5) * (levanta ? 0.35 : 1),
              clipPath: corte(GAVETA.x + 68, 268, dx, 14),
            }}>
              <CartaoFicha f={f} t={t} marcada={marcada} />
            </div>
          );
        })}
        <Barra t={t} dx={dx} />
      </div>
    </>
  );
}

// ── the screenshots in flight ────────────────────────────────────────────

/** A screenshot lifting off the screen as a slab and flying in an arc into its card. */
function Lamina({ t, img, x0, y0, w0, h0, ergue, voa, destino }: {
  t: number; img: string; x0: number; y0: number; w0: number; h0: number; ergue: number; voa: readonly [number, number]; destino: { x: number; y: number; w: number; h: number };
}) {
  if (t < ergue - 0.02 || t > voa[1] + 0.12) return null;
  const sobe = rampa(t, ergue, voa[0], sai);
  const k = rampa(t, voa[0], voa[1], Easing.inOut(Easing.quad));
  const x = lerp(x0, destino.x, k);
  const y = lerp(y0, destino.y, k) - Math.sin(Math.PI * k) * 140;
  const w = lerp(w0, destino.w, k);
  const h = lerp(h0, destino.h, k);
  const z = sobe * 160 * (1 - k) + Math.sin(Math.PI * k) * 120;
  const rotY = lerp(-14 * sobe, 0, k) + Math.sin(Math.PI * k) * 22;
  const rotX = 9 * sobe * (1 - k);
  const fim = 1 - rampa(t, voa[1], voa[1] + 0.12);
  const brilho = rampa(t, ergue, voa[1]);
  const quadro = (atraso: number, op: number, key: string) => {
    const ka = rampa(t - atraso, voa[0], voa[1], Easing.inOut(Easing.quad));
    if (atraso > 0 && (t - atraso < voa[0] || ka >= 1)) return null;
    const xa = atraso ? lerp(x0, destino.x, ka) : x;
    const ya = atraso ? lerp(y0, destino.y, ka) - Math.sin(Math.PI * ka) * 140 : y;
    const wa = atraso ? lerp(w0, destino.w, ka) : w;
    const ha = atraso ? lerp(h0, destino.h, ka) : h;
    return (
      <div key={key} style={{
        position: "absolute", left: s(xa), top: s(ya), width: s(wa), height: s(ha), borderRadius: s(12), overflow: "hidden",
        transform: `translateZ(${s(z)}px) rotateY(${rotY}deg) rotateX(${rotX}deg)`, opacity: op * fim, filter: atraso ? `blur(${s(3)}px)` : undefined,
        boxShadow: atraso ? undefined : `0 ${s(30 * sobe)}px ${s(60)}px rgba(20,8,40,${0.35 * sobe}), 0 0 0 ${s(1)}px rgba(255,255,255,.7)`,
      }}>
        <Img src={staticFile(`vidro/${img}`)} style={{ width: "100%", height: "100%", display: "block" }} />
        {!atraso && <div style={{
          position: "absolute", inset: 0, mixBlendMode: "screen",
          background: `linear-gradient(120deg, transparent ${lerp(-30, 90, brilho)}%, rgba(255,255,255,.6) ${lerp(-20, 100, brilho)}%, transparent ${lerp(-10, 110, brilho)}%)`,
        }} />}
      </div>
    );
  };
  return (
    <div style={{ position: "absolute", left: 0, top: 0, transformStyle: "preserve-3d" }}>
      {quadro(0.1, 0.14, "b")}
      {quadro(0.05, 0.26, "a")}
      {quadro(0, 1, "0")}
    </div>
  );
}

/** The two picked cards, stacked with a badge, carried to the chat. */
function Pilha({ t }: { t: number }) {
  const frame = useCurrentFrame();
  if (t < T.aperta || t > T.solta + 0.3) return null;
  const junta = rampa(t, T.empilha[0], T.empilha[1], sai);
  const k = rampa(t, T.leva[0], T.leva[1], Easing.inOut(Easing.quad));
  const some = 1 - rampa(t, T.solta, T.solta + 0.25);
  const encolhe = rampa(t, T.solta - 0.05, T.solta + 0.25);
  const base = { x: GAVETA.x + 68, y: GAVETA.y + 574 };
  const alvo = { x: 640, y: 440 };
  const x = lerp(base.x, alvo.x, k);
  const y = lerp(base.y, alvo.y, k) - Math.sin(Math.PI * k) * 120;
  const z = 70 * junta + Math.sin(Math.PI * k) * 90;
  const selo = mola(frame, T.empilha[1], { damping: 9, stiffness: 240 });
  const mais = mola(frame, T.leva[1] - 0.35, { damping: 9, stiffness: 240 });
  const ficha = (f: Ficha, rot: number, dy: number) => (
    <div style={{
      position: "absolute", left: 0, top: s(dy), width: s(268), height: s(f.h),
      transform: `rotate(${rot}deg)`,
    }}>
      <CartaoFicha f={f} t={t} marcada={f.img === "post.png" ? T.marca1 : T.marca2} />
    </div>
  );
  return (
    <div style={{
      position: "absolute", left: s(x), top: s(y), width: s(268), height: s(196),
      transform: `translateZ(${s(z)}px) scale(${lerp(1, 0.55, k) * (1 - 0.4 * encolhe)}) rotateZ(${-6 * Math.sin(Math.PI * k)}deg)`,
      transformOrigin: "0 0", opacity: some,
      filter: `drop-shadow(0 ${s(24)}px ${s(30)}px rgba(20,8,40,.35))`,
    }}>
      {ficha(FICHAS[4], lerp(0, 5, junta), lerp(0, 60, junta))}
      {ficha(FICHAS[3], lerp(0, -4, junta), lerp(-202, 0, junta))}
      <div style={{
        position: "absolute", left: s(-10), top: s(-10), width: s(26), height: s(26), borderRadius: "50%", background: "#FF3B30", color: "#fff",
        fontFamily: SANS, fontSize: s(14), fontWeight: 700, display: "grid", placeItems: "center", transform: `scale(${selo})`,
        boxShadow: `0 ${s(4)}px ${s(10)}px rgba(255,59,48,.45)`,
      }}>2</div>
      <div style={{
        position: "absolute", left: s(22), top: s(-10), width: s(26), height: s(26), borderRadius: "50%", background: "#34C759", color: "#fff",
        fontFamily: SANS, fontSize: s(18), fontWeight: 700, display: "grid", placeItems: "center", transform: `scale(${t > T.leva[1] - 0.35 ? mais : 0})`,
      }}>+</div>
    </div>
  );
}

// ── the cursor ───────────────────────────────────────────────────────────

const ROTA: [number, number, number][] = [
  [0, 760, 700], [6.5, 600, 600], [6.95, 164, 164], [8.2, 517, 475], [10.9, 517, 475], [11.05, 164, 472.5], [11.65, 517, 546.5],
  [13.6, 517, 546.5], [14.3, 1466, 480], [18.5, 1466, 480], [19.0, 1300, 520], [19.3, 1300, 520], [19.6, 1300, 720],
  [20.4, 1300, 720], [T.leva[0], 1300, 720], [T.leva[1], 760, 520],
];
function Cursor({ t }: { t: number }) {
  const mira = (t >= 6.5 && t < T.flash1 + 0.1) || (t >= 10.9 && t < T.flash2 + 0.1);
  const visivel = rampa(t, 5.6, 6.0) * (1 - rampa(t, T.solta + 0.5, T.solta + 0.8));
  if (visivel <= 0) return null;
  let x = ROTA[0][1], y = ROTA[0][2];
  for (let i = 0; i < ROTA.length - 1; i++) {
    const [ta, xa, ya] = ROTA[i];
    const [tb, xb, yb] = ROTA[i + 1];
    if (t >= ta && t <= tb) { const k = suave((t - ta) / Math.max(0.001, tb - ta)); x = lerp(xa, xb, k); y = lerp(ya, yb, k) - Math.sin(Math.PI * k) * (Math.abs(xb - xa) > 300 ? 60 : 0); break; }
    if (t > tb) { x = xb; y = yb; }
  }
  const clique = [T.marca1, T.marca2, T.aperta].some((c) => t >= c - 0.08 && t < c + 0.08) ? 0.86 : 1;
  return (
    <div style={{ position: "absolute", left: s(x), top: s(y), transform: `translateZ(${s(2)}px) scale(${clique})`, transformOrigin: "0 0", opacity: visivel }}>
      {mira ? (
        <svg width={s(30)} height={s(30)} viewBox="-15 -15 30 30" style={{ position: "absolute", left: -s(15), top: -s(15), overflow: "visible" }}>
          <path d="M-14 0 H-4 M4 0 H14 M0 -14 V-4 M0 4 V14" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M-14 0 H-4 M4 0 H14 M0 -14 V-4 M0 4 V14" stroke="#111" strokeWidth="1.2" strokeLinecap="round" />
          <circle r="3" fill="none" stroke="#111" strokeWidth="1.2" />
        </svg>
      ) : (
        <svg width={s(20)} height={s(28)} viewBox="0 0 20 28" style={{ filter: `drop-shadow(0 ${s(2)}px ${s(3)}px rgba(0,0,0,.35))` }}>
          <path d="M1.5 1.5 L1.5 22 L6.6 17.4 L10.2 25.6 L13.6 24.1 L10.1 16.1 L17 16.1 Z" fill="#111" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

// ── the world, the camera, and what floats over it ───────────────────────

function Mundo() {
  const t = useT();
  const cam = camera(t);
  const aparece = rampa(t, T.aberturaSai, T.mundo);
  const escurece = rampa(t, T.fim, T.fim + 1.2);
  const post = { x: 164, y: 164, w: 353, h: 311 };
  const conversa = { x: 164, y: 472.5, w: 353, h: 74 };
  return (
    <AbsoluteFill style={{ perspective: 2200, perspectiveOrigin: "50% 50%", opacity: aparece, filter: `blur(${(1 - aparece) * 14}px)` }}>
      <div style={{
        position: "absolute", left: 0, top: 0, width: s(TELA.w), height: s(TELA.h), transformOrigin: "0 0", transformStyle: "preserve-3d",
        transform: `translate(960px, 540px) rotateX(${cam.rx}deg) rotateY(${cam.ry}deg) scale(${cam.z / K}) translate(${-s(cam.cx)}px, ${-s(cam.cy)}px)`,
      }}>
        <div style={{
          position: "absolute", inset: 0, borderRadius: s(22), overflow: "hidden",
          boxShadow: `0 0 0 ${s(9)}px #0d0d12, 0 0 0 ${s(10)}px rgba(255,255,255,.12), 0 ${s(70)}px ${s(140)}px rgba(0,0,0,.65)`,
        }}>
          <Papel />
          <Moments />
          <Chat t={t} />
          <Selecao t={t} de={T.sel1[0]} ate={T.sel1[1]} x0={post.x} y0={post.y} x1={post.x + post.w} y1={post.y + post.h} flash={T.flash1} />
          <Selecao t={t} de={T.sel2[0]} ate={T.sel2[1]} x0={conversa.x} y0={conversa.y} x1={conversa.x + conversa.w} y1={conversa.y + conversa.h} flash={T.flash2} />
          <div style={{ position: "absolute", inset: 0, background: `rgba(6,4,16,${0.45 * escurece})` }} />
        </div>
        <Gaveta t={t} />
        <Lamina t={t} img="post.png" {...{ x0: post.x, y0: post.y, w0: post.w, h0: post.h }} ergue={T.ergue1} voa={T.voa1} destino={caixaDaImagem(FICHAS[3], 706, 622)} />
        <Lamina t={t} img="conversa.png" {...{ x0: conversa.x, y0: conversa.y, w0: conversa.w, h0: conversa.h }} ergue={T.ergue2} voa={T.voa2} destino={caixaDaImagem(FICHAS[4], 706, 148)} />
        <Pilha t={t} />
        <Cursor t={t} />
      </div>
    </AbsoluteFill>
  );
}

/** Behind the floating screen: dark, lit by the wallpaper's colours. */
function Ambiente() {
  const t = useT();
  return (
    <AbsoluteFill style={{ background: "radial-gradient(70% 70% at 50% 45%, #1a1430 0%, #0b0a14 55%, #050508 100%)" }}>
      <Img src={staticFile("vidro/fundo.jpg")} style={{
        position: "absolute", left: "10%", top: "12%", width: "80%", height: "76%", objectFit: "cover",
        filter: "blur(90px) saturate(1.4)", opacity: 0.45 * rampa(t, T.aberturaSai, T.mundo),
      }} />
    </AbsoluteFill>
  );
}

function Tecla({ children, aperto, largura = 120 }: { children: ReactNode; aperto: number; largura?: number }) {
  return (
    <div style={{
      width: largura, height: 120, borderRadius: 30, display: "grid", placeItems: "center",
      fontFamily: DISPLAY, fontSize: 56, fontWeight: 500, color: "#fff",
      background: "linear-gradient(180deg, rgba(40,36,60,.58), rgba(14,12,24,.72))",
      backdropFilter: "blur(24px) saturate(1.6)",
      boxShadow: `inset 0 0 0 1.5px rgba(255,255,255,.3), inset 0 2px 0 rgba(255,255,255,.4), 0 ${20 - aperto * 14}px ${40 - aperto * 24}px rgba(5,2,20,.5)`,
      transform: `translateY(${aperto * 8}px)`, textShadow: "0 1px 8px rgba(0,0,0,.25)",
    }}>
      {children}
    </div>
  );
}

/** The keys on screen, big and made of glass, pressed in turn. */
function Teclas({ inicio, aperta, teclas }: { inicio: number; aperta: number; teclas: ReactNode[] }) {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const fim = aperta + 1.0;
  if (t < inicio - 0.1 || t > fim + 0.3) return null;
  const sai = 1 - rampa(t, fim, fim + 0.3);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 80, opacity: sai }}>
      <div style={{ display: "flex", gap: 18 }}>
        {teclas.map((k, i) => {
          const entra = mola(frame, inicio + i * 0.09, { damping: 12, stiffness: 180 });
          const aperto = Math.max(0, 1 - Math.abs(t - (aperta + i * 0.05)) / 0.12);
          return (
            <div key={i} style={{ transform: `translateY(${(1 - entra) * 60}px) scale(${lerp(0.6, 1, entra)})`, opacity: Math.min(1, entra * 1.5) }}>
              <Tecla aperto={aperto} largura={typeof k === "string" && k.length > 2 ? 210 : 120}>{k}</Tecla>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/** The opening: Higgsfield's still of a slab of glass, pushed in slowly, with light running along its edge. */
function Abertura() {
  const t = useT();
  if (t > T.mundo) return null;
  const empurra = lerp(1, 1.09, rampa(t, 0, T.mundo, Easing.out(Easing.quad)));
  const luz = rampa(t, 0.5, 2.6);
  const some = 1 - rampa(t, T.aberturaSai, T.mundo);
  return (
    <AbsoluteFill style={{ opacity: some, background: "#000" }}>
      <Img src={staticFile("vidro/abertura.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${empurra})`, transformOrigin: "78% 60%" }} />
      <AbsoluteFill style={{
        mixBlendMode: "screen",
        background: `linear-gradient(100deg, transparent ${lerp(40, 95, luz)}%, rgba(255,255,255,.22) ${lerp(46, 101, luz)}%, transparent ${lerp(52, 107, luz)}%)`,
      }} />
      <AbsoluteFill style={{ mixBlendMode: "overlay", opacity: 0.5, background: `linear-gradient(${lerp(80, 140, luz)}deg, rgba(90,120,255,.0), rgba(255,120,200,.35), rgba(255,190,120,.0))` }} />
    </AbsoluteFill>
  );
}

/** The end: the world steps back and a pill of glass says where to get it. */
function Fim() {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (t < T.pilula - 0.1) return null;
  const entra = mola(frame, T.pilula, { damping: 14, stiffness: 120 });
  const texto = rampa(t, T.pilula + 0.2, T.pilula + 0.7);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 18, padding: "26px 44px", borderRadius: 999,
        fontFamily: DISPLAY, fontSize: 38, fontWeight: 500, letterSpacing: "-0.01em", color: "#fff", whiteSpace: "nowrap",
        background: "linear-gradient(180deg, rgba(255,255,255,.26), rgba(255,255,255,.08))",
        backdropFilter: "blur(26px) saturate(1.9)",
        boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,.5), inset 0 2px 0 rgba(255,255,255,.7), 0 30px 70px rgba(5,2,20,.5)",
        transform: `scale(${lerp(0.7, 1, entra)})`, opacity: Math.min(1, entra * 1.4), textShadow: "0 1px 10px rgba(0,0,0,.25)",
      }}>
        <span style={{ opacity: texto }}>Use it for free</span>
        <span style={{ opacity: 0.55 * texto }}>·</span>
        <span style={{ opacity: texto, fontWeight: 400 }}>github.com/Frasca-99/gaveta</span>
      </div>
    </AbsoluteFill>
  );
}

export function Vidro2() {
  return (
    <AbsoluteFill style={{ background: "#050508" }}>
      <Ambiente />
      <Mundo />
      <Teclas inicio={T.teclas1} aperta={T.aperta1} teclas={["⌘", "⇧", "4"]} />
      <Teclas inicio={T.teclas2} aperta={T.marca1} teclas={["⌘", "click"]} />
      <Abertura />
      <Fim />
    </AbsoluteFill>
  );
}
