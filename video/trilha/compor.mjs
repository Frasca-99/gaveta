// Composes the soundtrack for the glass film (src/Vidro.tsx): an electronic
// track at 120 BPM whose sections follow the cuts, and the interface's sounds
// on the film's own times. Everything is synthesised here, so it stays in
// sync and needs no licence.
//
//   node video/trilha/compor.mjs            writes video/trilha/.build/trilha.wav
//   then ffmpeg (see video/LEIA.md) makes video/public/vidro/trilha.m4a
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SR = 48000;
const DUR = 31;
const N = Math.round(SR * DUR);
const BPM = 120;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const TAU = Math.PI * 2;

// ── basics ───────────────────────────────────────────────────────────────

const bus = () => [new Float32Array(N), new Float32Array(N)];
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
let semente = 7;
const ruido = () => {
  semente = (semente + 0x6d2b79f5) | 0;
  let t = Math.imul(semente ^ (semente >>> 15), 1 | semente);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
};
function polyblep(t, dt) {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}
class Biquad {
  constructor() { this.x1 = this.x2 = this.y1 = this.y2 = 0; this.set("lp", 1000, 0.707); }
  set(tipo, f, q) {
    const w = (TAU * Math.min(f, SR * 0.45)) / SR, c = Math.cos(w), a = Math.sin(w) / (2 * q);
    let b0, b1, b2;
    if (tipo === "lp") { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
    else if (tipo === "hp") { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
    else { b0 = a; b1 = 0; b2 = -a; }
    const a0 = 1 + a;
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = (-2 * c) / a0; this.a2 = (1 - a) / a0;
  }
  run(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}
const s2i = (t) => Math.round(t * SR);
function soma(b, i, l, r) { if (i >= 0 && i < N) { b[0][i] += l; b[1][i] += r; } }
const pan = (p) => [Math.cos(((p + 1) * Math.PI) / 4), Math.sin(((p + 1) * Math.PI) / 4)];

// ── the song: A minor, Am – F – C – G, two seconds a bar ──────────────────

const ACORDES = [
  { baixo: 45, notas: [57, 60, 64, 67] },  // Am7
  { baixo: 41, notas: [53, 57, 60, 64] },  // Fmaj7
  { baixo: 48, notas: [55, 60, 64, 71] },  // Cmaj7
  { baixo: 43, notas: [55, 59, 62, 69] },  // G6/9
];
const acorde = (t) => ACORDES[Math.floor(t / BAR) % 4];
/** How much of each part plays, by time: the sections follow the film's cuts. */
function secao(t) {
  if (t < 4) return { kick: 0, hats: 0, palmas: 0, baixo: 0, pad: 1, arpejo: 0.5, corte: 500 + 900 * (t / 4) };
  if (t < 8) return { kick: 0.85, hats: 0.6, palmas: 0, baixo: 0.8, pad: 0.9, arpejo: 0.8, corte: 1800 };
  if (t < 14) return { kick: 1, hats: 1, palmas: 1, baixo: 1, pad: 0.8, arpejo: 1, corte: 3200 };
  if (t < 16) return { kick: 0, hats: 0.45, palmas: 0, baixo: 0.35, pad: 1.1, arpejo: 1, corte: 2400 };
  if (t < 18) return { kick: 0.9, hats: 0.8, palmas: 0.5, baixo: 0.8, pad: 1, arpejo: 1, corte: 2800 };
  if (t < 28) return { kick: 1, hats: 1, palmas: 1, baixo: 1, pad: 0.8, arpejo: 1, corte: 3400 };
  return { kick: 0, hats: 0, palmas: 0, baixo: 0, pad: 1, arpejo: 0.4, corte: 1600 };
}

const kicks = [];
for (let t = 4; t < 28; t += BEAT) if (secao(t).kick > 0) kicks.push(t);
/** The pump: everything but the drums ducks under each kick. */
const bomba = new Float32Array(N).fill(1);
for (const k of kicks) {
  const a = s2i(k), prof = 0.62 * secao(k).kick;
  for (let i = 0; i < s2i(0.36); i++) {
    const x = i / SR;
    const g = 1 - prof * Math.exp(-x / 0.09) * (x < 0.004 ? x / 0.004 : 1);
    if (a + i < N) bomba[a + i] = Math.min(bomba[a + i], g);
  }
}

const bateria = bus(), harmonia = bus(), envio = bus(), efeitos = bus(), envioEfeitos = bus();

// kick: a sine falling in pitch, with a click on top
for (const k of kicks) {
  const v = secao(k).kick, a = s2i(k);
  let fase = 0;
  for (let i = 0; i < s2i(0.42); i++) {
    const x = i / SR;
    const f = 46 + 110 * Math.exp(-x / 0.045);
    fase += (TAU * f) / SR;
    let y = Math.sin(fase) * Math.exp(-x / 0.2) * 0.72;
    if (x < 0.003) y += ruido() * 0.35 * (1 - x / 0.003);
    soma(bateria, a + i, y * v, y * v);
  }
}
// claps on 2 and 4
{
  const bp = new Biquad(); bp.set("bp", 1400, 0.9);
  for (let t = 4 + BEAT; t < 28; t += 2 * BEAT) {
    const v = secao(t).palmas; if (!v) continue;
    const a = s2i(t);
    for (let i = 0; i < s2i(0.24); i++) {
      const x = i / SR;
      const env = [0, 0.011, 0.022].reduce((m, d) => m + (x >= d ? Math.exp(-(x - d) / (d < 0.02 ? 0.006 : 0.07)) : 0), 0);
      const y = bp.run(ruido()) * env * 0.55 * v;
      soma(bateria, a + i, y * 0.9, y);
      soma(envio, a + i, y * 0.35, y * 0.35);
    }
  }
}
// hats: closed on every sixteenth, open on the off-beats
{
  const hp = new Biquad(); hp.set("hp", 7500, 0.7);
  for (let t = 4; t < 28; t += BEAT / 4) {
    const v = secao(t).hats; if (!v) continue;
    const passo = Math.round((t - 4) / (BEAT / 4)) % 4;
    const aberto = passo === 2;
    const dur = aberto ? 0.16 : 0.035, vol = (aberto ? 0.22 : passo === 0 ? 0.1 : 0.14) * v;
    const a = s2i(t), p = pan(passo % 2 ? 0.25 : -0.2);
    for (let i = 0; i < s2i(dur * 4); i++) {
      const y = hp.run(ruido()) * Math.exp(-(i / SR) / dur) * vol;
      soma(bateria, a + i, y * p[0], y * p[1]);
    }
  }
}
// bass: off-beat eighths, saw and sine, filter opening with the song
{
  const lp = new Biquad();
  for (let t = 4; t < 28; t += BEAT / 2) {
    const sec = secao(t); if (!sec.baixo) continue;
    if (Math.round((t - 4) / (BEAT / 2)) % 2 === 0) continue;
    const f = mtof(acorde(t).baixo), a = s2i(t), dur = BEAT / 2 * 0.9;
    let fase = 0;
    for (let i = 0; i < s2i(dur); i++) {
      const x = i / SR;
      lp.set("lp", 180 + 700 * Math.exp(-x / 0.06) * (sec.corte / 3400), 1.1);
      fase += f / SR; if (fase >= 1) fase -= 1;
      const saw = 2 * fase - 1 - polyblep(fase, f / SR);
      const env = Math.min(1, x / 0.004) * Math.exp(-x / 0.22);
      const y = (lp.run(saw) * 0.55 + Math.sin(TAU * fase) * 0.42) * env * 0.5 * sec.baixo;
      soma(harmonia, a + i, y, y);
    }
  }
}
// pad: detuned saws on the chord, a slow filter, wide
{
  const filtros = [new Biquad(), new Biquad()];
  const vozes = [];
  for (const [ci, c] of ACORDES.entries()) for (const n of c.notas) for (const d of [-0.11, 0, 0.12]) vozes.push({ ci, f: mtof(n + d), fase: ruido() * 0.5 + 0.5, lado: d < 0 ? 0 : d > 0 ? 1 : 2 });
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    if (t > DUR - 0.01) break;
    const sec = secao(t), ci = Math.floor(t / BAR) % 4, dentro = t - Math.floor(t / BAR) * BAR;
    if (i % 32 === 0) { filtros[0].set("lp", sec.corte * 0.6, 0.8); filtros[1].set("lp", sec.corte * 0.6, 0.8); }
    let l = 0, r = 0;
    for (const v of vozes) {
      const dt = v.f / SR;
      v.fase += dt; if (v.fase >= 1) v.fase -= 1;
      if (v.ci !== ci) continue;
      const saw = 2 * v.fase - 1 - polyblep(v.fase, dt);
      if (v.lado === 0) l += saw; else if (v.lado === 1) r += saw; else { l += saw * 0.6; r += saw * 0.6; }
    }
    const env = Math.min(1, dentro / 0.08) * (t > 28 ? Math.exp(-(t - 28) / 1.6) : 1);
    const g = 0.034 * sec.pad * env * bomba[i] * (t < 4 ? Math.min(1, t / 1.2) : 1);
    const yl = filtros[0].run(l) * g, yr = filtros[1].run(r) * g;
    harmonia[0][i] += yl; harmonia[1][i] += yr;
    envio[0][i] += yl * 0.5; envio[1][i] += yr * 0.5;
  }
}
// arpeggio: glassy plucks on the chord tones, sixteenths, an octave up
{
  const lp = new Biquad();
  const portao = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1];
  for (let t = 0; t < 29.5; t += BEAT / 4) {
    const sec = secao(t); if (!sec.arpejo) continue;
    const passo = Math.round(t / (BEAT / 4)) % 16;
    if (!portao[passo]) continue;
    const notas = acorde(t).notas;
    const n = notas[(passo * 3) % notas.length] + 12 + (passo % 8 === 6 ? 12 : 0);
    const f = mtof(n), a = s2i(t), p = pan(Math.sin(passo * 1.7) * 0.6);
    let f1 = 0, f2 = 0;
    for (let i = 0; i < s2i(0.32); i++) {
      const x = i / SR;
      if (i % 16 === 0) lp.set("lp", 900 + (sec.corte + 2500) * Math.exp(-x / 0.05), 1.4);
      f1 += f / SR; if (f1 >= 1) f1 -= 1;
      f2 += (f * 1.004) / SR; if (f2 >= 1) f2 -= 1;
      const o = (2 * f1 - 1 - polyblep(f1, f / SR)) + (f2 < 0.5 ? 0.6 : -0.6);
      const y = lp.run(o) * Math.min(1, x / 0.002) * Math.exp(-x / 0.11) * 0.1 * sec.arpejo * bomba[Math.min(N - 1, a + i)];
      soma(harmonia, a + i, y * p[0], y * p[1]);
      soma(envio, a + i, y * 0.6, y * 0.6);
    }
  }
}
// risers into the big moments, and impacts on them
function riser(de, ate, vol) {
  const bp = new Biquad();
  let fase = 0;
  for (let i = s2i(de); i < s2i(ate); i++) {
    const k = (i / SR - de) / (ate - de);
    if (i % 16 === 0) bp.set("bp", 300 + 7000 * k * k, 1.2);
    fase += (200 + 1300 * k * k) / SR;
    const y = (bp.run(ruido()) * 0.9 + Math.sin(TAU * fase) * 0.15) * k * k * vol;
    soma(harmonia, i, y * (1 - k * 0.5), y * (0.5 + k * 0.5));
    soma(envio, i, y * 0.5, y * 0.5);
  }
}
function impacto(t, vol) {
  const a = s2i(t), hp = new Biquad(); hp.set("hp", 2500, 0.7);
  let fase = 0;
  for (let i = 0; i < s2i(2.2); i++) {
    const x = i / SR;
    fase += (32 + 40 * Math.exp(-x / 0.12)) / SR;
    const y = (Math.sin(TAU * fase) * Math.exp(-x / 0.7) * 0.7 + hp.run(ruido()) * Math.exp(-x / 0.45) * 0.25) * vol;
    soma(bateria, a + i, y, y);
    soma(envio, a + i, y * 0.4, y * 0.4);
  }
}
riser(2.3, 4.0, 0.22); impacto(4.0, 0.7);
riser(6.6, 8.0, 0.26); impacto(8.0, 0.85);
riser(17.0, 18.0, 0.2); impacto(18.0, 0.6);
impacto(28.0, 0.9);

// ── the interface's sounds, on the film's times ──────────────────────────

function clique(t, vol = 0.35, p = 0) {
  const a = s2i(t), hp = new Biquad(); hp.set("hp", 3000, 0.7);
  const [l, r] = pan(p);
  for (let i = 0; i < s2i(0.05); i++) {
    const x = i / SR;
    const y = (hp.run(ruido()) * Math.exp(-x / 0.004) + Math.sin(TAU * 2400 * x) * Math.exp(-x / 0.012) * 0.5) * vol;
    soma(efeitos, a + i, y * l, y * r);
  }
}
function obturador(t) {
  clique(t, 0.5); clique(t + 0.055, 0.4);
  const a = s2i(t), bp = new Biquad(); bp.set("bp", 900, 0.8);
  for (let i = 0; i < s2i(0.3); i++) {
    const x = i / SR;
    const y = (bp.run(ruido()) * 0.4 + Math.sin(TAU * 140 * x) * 0.6) * Math.exp(-x / 0.06) * 0.35;
    soma(efeitos, a + i, y, y);
  }
}
function sopro(de, ate, p0, p1, vol = 0.32) {
  const bp = new Biquad();
  for (let i = s2i(de); i < s2i(ate); i++) {
    const k = (i / SR - de) / (ate - de);
    if (i % 16 === 0) bp.set("bp", 400 + 3200 * Math.sin(Math.PI * k), 0.9);
    const y = bp.run(ruido()) * Math.sin(Math.PI * k) ** 1.6 * vol;
    const [l, r] = pan(p0 + (p1 - p0) * k);
    soma(efeitos, i, y * l, y * r);
    soma(envioEfeitos, i, y * 0.3, y * 0.3);
  }
}
function vidro(t, vol = 0.3, base = 1568, p = 0.4) {
  const a = s2i(t), [l, r] = pan(p);
  const parciais = [[1, 1, 1.6], [1.506, 0.55, 1.1], [2.01, 0.4, 0.8], [2.73, 0.25, 0.55], [3.98, 0.15, 0.35]];
  for (let i = 0; i < s2i(2.2); i++) {
    const x = i / SR;
    let y = 0;
    for (const [m, g, d] of parciais) y += Math.sin(TAU * base * m * x) * g * Math.exp(-x / d);
    y *= vol * 0.35 * Math.min(1, x / 0.002);
    soma(efeitos, a + i, y * l, y * r);
    soma(envioEfeitos, a + i, y * 0.6, y * 0.6);
  }
}
function pop(t, vol = 0.35, f0 = 900, f1 = 480, p = 0.3) {
  const a = s2i(t), [l, r] = pan(p);
  let fase = 0;
  for (let i = 0; i < s2i(0.12); i++) {
    const x = i / SR;
    fase += (f1 + (f0 - f1) * Math.exp(-x / 0.025)) / SR;
    const y = Math.sin(TAU * fase) * Math.exp(-x / 0.035) * vol;
    soma(efeitos, a + i, y * l, y * r);
  }
}
function baque(t, vol = 0.4) {
  const a = s2i(t);
  let fase = 0;
  for (let i = 0; i < s2i(0.35); i++) {
    const x = i / SR;
    fase += (60 + 90 * Math.exp(-x / 0.03)) / SR;
    const y = Math.sin(TAU * fase) * Math.exp(-x / 0.09) * vol;
    soma(efeitos, a + i, y, y);
  }
}
function brilho(de, ate, vol = 0.12) {
  for (let i = 0; i < 26; i++) {
    const t = de + ((ate - de) * i) / 26;
    vidro(t, vol * (0.4 + 0.6 * Math.sin((Math.PI * i) / 26)), mtof([81, 84, 88, 91, 93, 96][i % 6]), Math.sin(i * 2.1) * 0.7);
  }
}

// keys ⌘ ⇧ 4, the selection, the shutter, the flight, the drawer, the landing
[6.5, 6.55, 6.6].forEach((t, i) => clique(t, 0.32, -0.3 + i * 0.3));
sopro(6.95, 8.2, -0.6, -0.3, 0.07);
obturador(8.32);
sopro(9.0, 10.35, -0.5, 0.75, 0.3);
sopro(9.45, 9.9, 0.8, 0.6, 0.18); baque(9.75, 0.25);
vidro(10.3, 0.32, 1568, 0.6); clique(10.3, 0.18, 0.6);
sopro(10.75, 11.1, 0.6, 0.9, 0.1);
sopro(11.05, 11.65, -0.6, -0.3, 0.06);
obturador(11.72);
sopro(12.0, 12.9, -0.4, 0.75, 0.26);
sopro(12.25, 12.65, 0.8, 0.6, 0.15); baque(12.55, 0.22);
vidro(12.85, 0.3, 1760, 0.6); clique(12.85, 0.16, 0.6);
sopro(13.35, 13.7, 0.6, 0.9, 0.1);
// the edge, the drawer wide open, the cards spreading in depth
sopro(13.7, 14.4, 0.1, 0.9, 0.12);
sopro(14.3, 14.9, 0.9, 0.5, 0.22); baque(14.65, 0.3); vidro(14.6, 0.2, 1318, 0.5);
brilho(15.3, 16.6, 0.1);
sopro(16.9, 17.6, 0.3, -0.3, 0.1);
// ⌘ click, the checks, the stack, the drag, the drop
[19.05, 19.1].forEach((t, i) => clique(t, 0.3, -0.1 + i * 0.2));
pop(19.05, 0.4, 1100, 620, 0.4); vidro(19.07, 0.12, 2093, 0.4);
pop(19.65, 0.4, 1250, 700, 0.45); vidro(19.67, 0.12, 2349, 0.45);
clique(20.4, 0.25, 0.4);
sopro(20.45, 20.95, 0.4, 0.3, 0.12);
pop(20.95, 0.38, 1400, 800, 0.3);
sopro(21.0, 22.35, 0.5, -0.4, 0.3);
baque(22.35, 0.35); pop(22.4, 0.3, 700, 420, -0.3);
sopro(22.7, 23.1, 0.6, 0.9, 0.1);
// the chat: her messages come in, his goes out
pop(24.1, 0.3, 880, 660, -0.2); vidro(24.12, 0.08, 1760, -0.2);
pop(25.0, 0.3, 880, 660, -0.2); vidro(25.02, 0.08, 1760, -0.2);
sopro(25.72, 25.95, -0.1, 0.1, 0.2); pop(25.8, 0.32, 1200, 900, 0.1);
pop(26.8, 0.3, 880, 660, -0.2); vidro(26.82, 0.08, 1760, -0.2);
// the end: the world steps back, the pill
sopro(27.6, 28.6, 0, 0, 0.14);
vidro(28.5, 0.34, 1318, 0); vidro(28.52, 0.22, 1975, 0.2); brilho(28.55, 29.6, 0.07);

// ── reverb and the mix ───────────────────────────────────────────────────

function freeverb(entrada, sala = 0.86, amortece = 0.25) {
  const k = SR / 44100;
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const aps = [556, 441, 341, 225];
  const saida = bus();
  for (let c = 0; c < 2; c++) {
    const cb = combs.map((n) => ({ buf: new Float32Array(Math.round((n + c * 23) * k)), i: 0, fs: 0 }));
    const ab = aps.map((n) => ({ buf: new Float32Array(Math.round((n + c * 23) * k)), i: 0 }));
    const x = entrada[c], y = saida[c];
    for (let i = 0; i < N; i++) {
      const inp = x[i] * 0.015;
      let s = 0;
      for (const f of cb) {
        const o = f.buf[f.i];
        f.fs = o * (1 - amortece) + f.fs * amortece;
        f.buf[f.i] = inp + f.fs * sala;
        if (++f.i >= f.buf.length) f.i = 0;
        s += o;
      }
      for (const a of ab) {
        const b = a.buf[a.i];
        a.buf[a.i] = s + b * 0.5;
        s = b - s;
        if (++a.i >= a.buf.length) a.i = 0;
      }
      y[i] = s;
    }
  }
  return saida;
}
// a dotted-eighth echo on the sends, before the reverb
const eco = bus();
{
  const d = s2i(BEAT * 0.75);
  for (let c = 0; c < 2; c++) {
    const x = envio[c], y = eco[c], lp = new Biquad(); lp.set("lp", 3500, 0.7);
    for (let i = 0; i < N; i++) {
      const atras = i >= d ? y[i - d] : 0;
      y[i] = x[i] + lp.run(atras) * 0.38 * (c === 0 ? 1 : 0.85);
    }
  }
}
const sala = freeverb([eco[0].map((v, i) => v + envioEfeitos[0][i]), eco[1].map((v, i) => v + envioEfeitos[1][i])]);

const mix = bus();
for (let c = 0; c < 2; c++) {
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const fim = t > DUR - 1.2 ? Math.max(0, (DUR - t) / 1.2) : 1;
    const inicio = Math.min(1, t / 0.15);
    let y = (bateria[c][i] * 0.9 + harmonia[c][i] + eco[c][i] * 0.25 + sala[c][i] * 0.9) * 0.72 + efeitos[c][i] * 0.85;
    y = Math.tanh(y * 1.15) / 1.15;
    mix[c][i] = y * fim * inicio;
  }
}

// ── write a 32-bit float WAV ─────────────────────────────────────────────

const aqui = dirname(fileURLToPath(import.meta.url));
const saida = join(aqui, ".build", "trilha.wav");
mkdirSync(dirname(saida), { recursive: true });
const dados = Buffer.alloc(44 + N * 8);
dados.write("RIFF", 0); dados.writeUInt32LE(36 + N * 8, 4); dados.write("WAVE", 8);
dados.write("fmt ", 12); dados.writeUInt32LE(16, 16); dados.writeUInt16LE(3, 20); dados.writeUInt16LE(2, 22);
dados.writeUInt32LE(SR, 24); dados.writeUInt32LE(SR * 8, 28); dados.writeUInt16LE(8, 32); dados.writeUInt16LE(32, 34);
dados.write("data", 36); dados.writeUInt32LE(N * 8, 40);
for (let i = 0; i < N; i++) { dados.writeFloatLE(mix[0][i], 44 + i * 8); dados.writeFloatLE(mix[1][i], 48 + i * 8); }
writeFileSync(saida, dados);
console.log("trilha:", saida, `${DUR}s`);
