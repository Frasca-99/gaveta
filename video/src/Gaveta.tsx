import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig,
} from "remotion";
import roteiro from "../public/roteiro.json";

/**
 * The Gaveta's launch film: a title, the desk recorded by gravar.mjs with a
 * camera that leans in where the action is and a caption for each step, and
 * an end card with where to get it. "largo" is 16:9; "quadrado" is 1:1, the
 * desk in a band with the captions above it.
 */

export const FPS = 60;
const ABERTURA = 2.6;
const ENCERRAMENTO = 3.8;
const CRUZA = 0.45;
export const duracao = (mesa: number) => Math.round((ABERTURA + mesa + ENCERRAMENTO - 2 * CRUZA) * FPS);

const COR = {
  tinta: "#1b1b19",
  grafite: "#5f5f59",
  feltro: "#1f4a3a",
  latao: "#c9a24b",
  fundo: "linear-gradient(165deg, #f5f0e6 0%, #eee8dc 48%, #e2e9e3 100%)",
};
const SANS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif';
const MAQUINA = '"American Typewriter", "Courier Prime", ui-monospace, monospace';

type Formato = "largo" | "quadrado";
type Passo = { name: string; t: number };
const passos = roteiro.steps as Passo[];
const quando = (nome: string) => passos.find((p) => p.name === nome)?.t ?? 0;

// ── what each step says ──────────────────────────────────────────────────

/** In the wide cut the caption stands on the side away from the action, so it never covers it. */
type Lado = "esquerda" | "centro" | "direita";
const LEGENDAS: { passo: string; atraso?: number; texto: string; lado: Lado }[] = [
  { passo: "tirar", texto: "Tire um print, como sempre", lado: "direita" },
  { passo: "voou", texto: "Ele voa para a gaveta, na borda da tela", lado: "centro" },
  { passo: "janela", texto: "Ou fotografe só uma janela", lado: "esquerda" },
  { passo: "abrir", texto: "Encoste na borda: a gaveta abre", lado: "esquerda" },
  { passo: "folhear", texto: "Cada print vira uma ficha, inteira", lado: "esquerda" },
  { passo: "selecionar", texto: "Selecione vários com ⌘-clique", lado: "esquerda" },
  { passo: "copiar", texto: "Copie todos de uma vez", lado: "esquerda" },
  { passo: "colar", atraso: 0.6, texto: "Um ⌘V cola todos, na ordem", lado: "direita" },
  { passo: "mesa", texto: "Arraste para a mesa: o arquivo fica lá", lado: "centro" },
  // the drawer closes after the drag and takes a moment to open again
  { passo: "lixo", atraso: 1.2, texto: "O X joga fora", lado: "esquerda" },
];

// ── the camera, in the desk's own CSS pixels (1440 × 810) ────────────────

type Camera = { cx: number; cy: number; z: number };
const LARGA: Camera = { cx: 720, cy: 405, z: 1 };
const GAVETA_ALTA: Camera = { cx: 1100, cy: 400, z: 1.45 };
const GAVETA_FRENTE: Camera = { cx: 1100, cy: 580, z: 1.75 };
const CAMERA: { t: number; cam: Camera }[] = [
  { t: 0, cam: LARGA },
  { t: quando("tirar") + 1.1, cam: { cx: 420, cy: 300, z: 1.5 } },
  { t: quando("voou") - 0.1, cam: LARGA },
  { t: quando("janela") + 0.5, cam: { cx: 480, cy: 520, z: 1.5 } },
  { t: quando("janela") + 2.05, cam: LARGA },
  { t: quando("abrir") + 0.4, cam: GAVETA_ALTA },
  { t: quando("selecionar"), cam: GAVETA_FRENTE },
  { t: quando("colar"), cam: { cx: 330, cy: 560, z: 1.7 } },
  { t: quando("mesa"), cam: { cx: 900, cy: 405, z: 1.12 } },
  { t: quando("lixo") + 0.9, cam: GAVETA_FRENTE },
  { t: quando("fim") - 0.3, cam: LARGA },
];
const VIAGEM = 0.95;
const suave = Easing.inOut(Easing.cubic);
const mistura = (a: Camera, b: Camera, k: number): Camera => ({
  cx: a.cx + (b.cx - a.cx) * k, cy: a.cy + (b.cy - a.cy) * k, z: a.z + (b.z - a.z) * k,
});
function camera(t: number): Camera {
  let estado = CAMERA[0].cam;
  for (let i = 0; i < CAMERA.length; i++) {
    const { t: ti, cam } = CAMERA[i];
    const proximo = CAMERA[i + 1]?.t ?? Infinity;
    if (t < ti) return estado;
    const k = suave(Math.min(1, (Math.min(t, proximo) - ti) / VIAGEM));
    const valor = mistura(estado, cam, k);
    if (t < proximo) return valor;
    estado = valor;
  }
  return estado;
}
/** Keeps the view inside the desk. */
function limite({ cx, cy, z }: Camera): Camera {
  const meiaL = 720 / z, meiaA = 405 / z;
  return { z, cx: Math.min(1440 - meiaL, Math.max(meiaL, cx)), cy: Math.min(810 - meiaA, Math.max(meiaA, cy)) };
}

// ── pieces ───────────────────────────────────────────────────────────────

const Icone = ({ tamanho, style }: { tamanho: number; style?: CSSProperties }) => (
  <Img src={staticFile("icone.png")} style={{ width: tamanho, height: tamanho, filter: "drop-shadow(0 18px 30px rgba(58,42,20,.28))", ...style }} />
);

function Abertura({ formato }: { formato: Formato }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entra = spring({ frame, fps, config: { damping: 16, mass: 0.8 } });
  const titulo = spring({ frame: frame - 8, fps, config: { damping: 18 } });
  const linha = spring({ frame: frame - 18, fps, config: { damping: 20 } });
  const quadrado = formato === "quadrado";
  return (
    <AbsoluteFill style={{ background: COR.fundo, alignItems: "center", justifyContent: "center", fontFamily: SANS, color: COR.tinta }}>
      <Icone tamanho={quadrado ? 200 : 230} style={{ transform: `translateY(${(1 - entra) * 40}px) scale(${0.86 + entra * 0.14})`, opacity: entra }} />
      <div style={{ marginTop: 34, fontSize: quadrado ? 104 : 120, fontWeight: 700, letterSpacing: "-0.035em", opacity: titulo, transform: `translateY(${(1 - titulo) * 24}px)` }}>
        Gaveta
      </div>
      <div style={{ marginTop: 6, fontSize: quadrado ? 50 : 56, fontWeight: 600, letterSpacing: "-0.02em", opacity: titulo, transform: `translateY(${(1 - titulo) * 24}px)` }}>
        Seus prints, <span style={{ color: COR.feltro }}>numa gaveta.</span>
      </div>
      <div style={{ marginTop: 26, fontFamily: MAQUINA, fontSize: quadrado ? 28 : 30, color: COR.grafite, opacity: linha }}>
        App para Mac · grátis · código aberto
      </div>
    </AbsoluteFill>
  );
}

function Encerramento({ formato }: { formato: Formato }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entra = spring({ frame, fps, config: { damping: 18 } });
  const link = spring({ frame: frame - 14, fps, config: { damping: 16 } });
  const quadrado = formato === "quadrado";
  return (
    <AbsoluteFill style={{ background: COR.fundo, alignItems: "center", justifyContent: "center", fontFamily: SANS, color: COR.tinta }}>
      <Icone tamanho={quadrado ? 170 : 180} style={{ opacity: entra, transform: `scale(${0.9 + entra * 0.1})` }} />
      <div style={{ marginTop: 26, fontSize: quadrado ? 92 : 100, fontWeight: 700, letterSpacing: "-0.035em", opacity: entra }}>Gaveta</div>
      <div style={{ marginTop: 4, fontSize: quadrado ? 42 : 46, fontWeight: 600, letterSpacing: "-0.015em", opacity: entra }}>
        Grátis e de código aberto
      </div>
      <div style={{ marginTop: 14, fontFamily: MAQUINA, fontSize: quadrado ? 26 : 28, color: COR.grafite, opacity: entra }}>
        macOS 14 ou mais novo · Apple silicon e Intel
      </div>
      <div style={{
        marginTop: 40, padding: quadrado ? "16px 30px" : "18px 34px", borderRadius: 999, background: COR.feltro, color: "#fff",
        fontSize: quadrado ? 36 : 40, fontWeight: 600, letterSpacing: "-0.01em",
        opacity: link, transform: `translateY(${(1 - link) * 16}px)`,
      }}>
        github.com/Frasca-99/gaveta
      </div>
    </AbsoluteFill>
  );
}

function Legenda({ formato }: { formato: Formato }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const lista = LEGENDAS.map((l) => ({ ...l, t: quando(l.passo) + (l.atraso ?? 0) }));
  const atual = [...lista].reverse().find((l) => t >= l.t);
  if (!atual) return null;
  const i = lista.indexOf(atual);
  const fim = i + 1 < lista.length ? lista[i + 1].t : quando("fim");
  const entra = interpolate(t, [atual.t, atual.t + 0.28], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const sai = interpolate(t, [fim - 0.2, fim], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const quadrado = formato === "quadrado";
  const lado = { esquerda: "flex-start", centro: "center", direita: "flex-end" }[atual.lado];
  const estilo: CSSProperties = quadrado
    ? { top: 0, height: 236, alignItems: "center", justifyContent: "center" }
    : { top: "auto", bottom: 64, height: "auto", padding: "0 64px", alignItems: lado, justifyContent: "flex-end" };
  return (
    <AbsoluteFill style={{ ...estilo, display: "flex", flexDirection: "column", pointerEvents: "none" }}>
      <div style={{
        maxWidth: quadrado ? 960 : 1500, padding: quadrado ? "0 40px" : "18px 34px", borderRadius: 22, textAlign: "center",
        background: quadrado ? "transparent" : "rgba(27,27,25,.88)", color: quadrado ? COR.tinta : "#fff",
        fontFamily: SANS, fontSize: quadrado ? 54 : 46, fontWeight: 650, letterSpacing: "-0.02em", lineHeight: 1.15,
        boxShadow: quadrado ? "none" : "0 18px 40px -16px rgba(0,0,0,.45)",
        opacity: entra * sai, transform: `translateY(${(1 - entra) * 18}px)`,
      }}>
        {atual.texto}
      </div>
    </AbsoluteFill>
  );
}

/** ⌘ and V pressed, shown for a moment as keycaps. */
function Teclas({ formato }: { formato: Formato }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t0 = quando("colado") - 0.12;
  const t = frame / fps;
  if (t < t0 || t > t0 + 1.25) return null;
  const pop = spring({ frame: frame - Math.round(t0 * fps), fps, config: { damping: 12, mass: 0.6 } });
  const sai = interpolate(t, [t0 + 1, t0 + 1.25], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const quadrado = formato === "quadrado";
  const tecla: CSSProperties = {
    minWidth: quadrado ? 96 : 116, height: quadrado ? 96 : 116, padding: "0 22px", borderRadius: 22, display: "grid", placeItems: "center",
    background: "linear-gradient(#ffffff, #ecebe6)", color: COR.tinta, fontFamily: SANS, fontSize: quadrado ? 52 : 62, fontWeight: 600,
    boxShadow: "0 2px 0 #c9c7bf, 0 12px 28px -10px rgba(0,0,0,.45), inset 0 0 0 1px rgba(0,0,0,.08)",
  };
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
      <div style={{ display: "flex", gap: 18, transform: `translateY(${quadrado ? 60 : -40}px) scale(${0.7 + pop * 0.3})`, opacity: Math.min(pop * 1.4, 1) * sai }}>
        <div style={tecla}>⌘</div>
        <div style={tecla}>V</div>
      </div>
    </AbsoluteFill>
  );
}

function Mesa({ formato }: { formato: Formato }) {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const quadrado = formato === "quadrado";
  const largura = width;
  const altura = (largura * 810) / 1440;
  const k = largura / 1440;
  const cam = limite(camera(frame / fps));
  // the desk's point (cx, cy) goes to the middle of the frame, at z
  const transform = `translate(${largura / 2}px, ${altura / 2}px) scale(${cam.z}) translate(${-cam.cx * k}px, ${-cam.cy * k}px)`;
  const faixa: CSSProperties = quadrado
    ? { top: 236, height: altura, overflow: "hidden", borderRadius: 0, boxShadow: "0 0 0 1px rgba(0,0,0,.06)" }
    : { top: 0, height: altura, overflow: "hidden" };
  return (
    <AbsoluteFill style={{ background: COR.fundo }}>
      <div style={{ position: "absolute", left: 0, width: largura, ...faixa }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: largura, height: altura, transformOrigin: "0 0", transform }}>
          <OffthreadVideo src={staticFile("mesa.mp4")} muted style={{ width: largura, height: altura, display: "block" }} />
        </div>
      </div>
      <Legenda formato={formato} />
      <Teclas formato={formato} />
      {quadrado && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 236 + altura, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 18, fontFamily: SANS, color: COR.tinta }}>
          <Icone tamanho={64} style={{ filter: "none" }} />
          <span style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.03em" }}>Gaveta</span>
          <span style={{ fontFamily: MAQUINA, fontSize: 24, color: COR.grafite }}>seus prints numa gaveta, no Mac</span>
        </div>
      )}
    </AbsoluteFill>
  );
}

/** A segment that fades in and out over the crossings (the first does not fade in, the last does not fade out). */
function Cena({ dura, entra = true, sai = true, children }: { dura: number; entra?: boolean; sai?: boolean; children: ReactNode }) {
  const frame = useCurrentFrame();
  const cruza = Math.round(CRUZA * FPS);
  const dentro = entra ? interpolate(frame, [0, cruza], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  const fora = sai ? interpolate(frame, [dura - cruza, dura], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  return <AbsoluteFill style={{ opacity: Math.min(dentro, fora) }}>{children}</AbsoluteFill>;
}

export function Gaveta({ formato }: { formato: Formato }) {
  const abertura = Math.round(ABERTURA * FPS);
  const mesa = Math.round(roteiro.duration * FPS);
  const encerramento = Math.round(ENCERRAMENTO * FPS);
  const cruza = Math.round(CRUZA * FPS);
  const mesaDe = abertura - cruza;
  const fimDe = mesaDe + mesa - cruza;
  return (
    <AbsoluteFill style={{ background: COR.fundo }}>
      <Sequence durationInFrames={abertura}>
        <Cena dura={abertura} entra={false}><Abertura formato={formato} /></Cena>
      </Sequence>
      <Sequence from={mesaDe} durationInFrames={mesa}>
        <Cena dura={mesa}><Mesa formato={formato} /></Cena>
      </Sequence>
      <Sequence from={fimDe} durationInFrames={encerramento}>
        <Cena dura={encerramento} sai={false}><Encerramento formato={formato} /></Cena>
      </Sequence>
    </AbsoluteFill>
  );
}
