// 古典管弦樂離線轉檔:src/game/music.ts 的記譜 → WAV (22050Hz / 16-bit / mono)。
//
// 合成方式 (全部原創實作,無取樣):
//   木管/銅管 (長笛、短笛、雙簧管、豎笛、薩克斯風、小喇叭):
//     各樂器專屬泛音列 + 波表合成 + 顫音 (延遲進入) + 氣息噪音
//     (豎笛以奇次泛音為主,符合圓柱管閉管特性)
//   鋼琴:非諧波泛音 (stretched partials) + 高頻泛音衰減更快 + 觸鍵噪音,
//     離鍵後制音 (ring 時間跟著音長走)
//   馬林巴琴/木琴/鐵琴/顫音琴/管鐘:琴棒/管體模態頻率比 + 顫音琴抖動 (tremolo)
//   定音鼓:鼓膜模態 (1 / 1.5 / 2 / 2.44) + 起音滑音 + 鼓槌悶音
//   打擊樂:大鼓 (正弦滑音) / 小鼓 (噪音+鼓身) / ride / 踩鈸 / 強音鈸
//
// 用法:
//   node scripts/render-music.mjs
// 輸出: src/assets/music/<曲目id>.wav (無縫循環,已做 DC 去除 + peak normalize)

import { buildSync } from "esbuild";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const SR = 22050;
const PEAK = 0.89;
const TABLE = 2048;
const OUT_DIR = path.resolve("src/assets/music");

// ---------- 小工具 ----------

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const midiToFreq = (n) => 440 * Math.pow(2, (n - 69) / 12);

const NOTE_BASE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function nameToMidi(name) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) return 0;
  const acc = m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0;
  return (parseInt(m[3], 10) + 1) * 12 + NOTE_BASE[m[1]] + acc;
}

/** 記譜 → 事件 [{ step, len(步數), midi }] */
function parseEvents(src, label) {
  const evs = [];
  let last = null;
  src.forEach((t, i) => {
    if (t === "-") {
      if (!last) throw new Error(`${label}: 第 ${i} 步的延長符號前面沒有音`);
      last.len++;
      return;
    }
    if (t === "." || t === 0) {
      last = null;
      return;
    }
    const midi = typeof t === "number" ? t : nameToMidi(t);
    if (!midi) {
      last = null;
      return;
    }
    last = { step: i, len: 1, midi };
    evs.push(last);
  });
  return evs;
}

// ---------- 木管 / 銅管 ----------

const WINDS = {
  flute:    { harm: [1, 0.32, 0.14, 0.07, 0.035, 0.018, 0.008], attack: 0.04, release: 0.09, vibRate: 5.5, vibDepth: 0.004, vibDelay: 0.12, noise: 0.025, noiseLP: 2400 },
  piccolo:  { harm: [1, 0.5, 0.3, 0.18, 0.1, 0.06, 0.03], attack: 0.03, release: 0.07, vibRate: 6.0, vibDepth: 0.003, vibDelay: 0.1, noise: 0.02, noiseLP: 3200 },
  oboe:     { harm: [1, 0.75, 0.62, 0.5, 0.38, 0.28, 0.18, 0.1, 0.05], attack: 0.05, release: 0.1, vibRate: 5.2, vibDepth: 0.0035, vibDelay: 0.15, noise: 0.012, noiseLP: 1500 },
  clarinet: { harm: [1, 0.03, 0.5, 0.02, 0.3, 0.015, 0.18, 0.01, 0.1, 0.008, 0.05], attack: 0.04, release: 0.09, vibRate: 5.0, vibDepth: 0.0028, vibDelay: 0.18, noise: 0.01, noiseLP: 1200 },
  sax:      { harm: [1, 0.68, 0.58, 0.48, 0.36, 0.26, 0.17, 0.1, 0.05], attack: 0.045, release: 0.1, vibRate: 5.3, vibDepth: 0.006, vibDelay: 0.12, noise: 0.014, noiseLP: 1400 },
  trumpet:  { harm: [1, 0.8, 0.72, 0.6, 0.5, 0.4, 0.3, 0.2, 0.12, 0.06], attack: 0.03, release: 0.08, vibRate: 5.6, vibDepth: 0.004, vibDelay: 0.14, noise: 0.008, noiseLP: 2500 },
};

const tableCache = new Map();
function windTable(inst, K) {
  const key = inst + ":" + K;
  let t = tableCache.get(key);
  if (!t) {
    const harm = WINDS[inst].harm;
    t = new Float64Array(TABLE);
    for (let i = 0; i < TABLE; i++) {
      const ph = (i / TABLE) * 2 * Math.PI;
      let y = 0;
      for (let k = 1; k <= K; k++) y += (harm[k - 1] || 0) * Math.sin(k * ph);
      t[i] = y;
    }
    let peak = 0;
    for (let i = 0; i < TABLE; i++) {
      const a = Math.abs(t[i]);
      if (a > peak) peak = a;
    }
    if (peak > 0) for (let i = 0; i < TABLE; i++) t[i] /= peak;
    tableCache.set(key, t);
  }
  return t;
}

function renderWind(mix, rng, inst, freq, start, noteDur, vol) {
  const cfg = WINDS[inst];
  const total = noteDur + cfg.release;
  const n0 = Math.round(start * SR);
  if (n0 >= mix.length) return;
  const n1 = Math.min(mix.length, n0 + Math.max(1, Math.round(total * SR)));
  const K = Math.max(1, Math.min(cfg.harm.length, Math.floor((SR / 2 - 50) / freq)));
  const tab = windTable(inst, K);
  const aLP = 1 - Math.exp((-2 * Math.PI * cfg.noiseLP) / SR);
  let phase = 0;
  let nz = 0;
  for (let n = n0; n < n1; n++) {
    const t = (n - n0) / SR;
    let env;
    if (t < cfg.attack) env = t / cfg.attack;
    else if (t < noteDur) env = 1;
    else env = Math.max(0, 1 - (t - noteDur) / cfg.release);
    const vibRamp = Math.min(1, Math.max(0, (t - cfg.vibDelay) / 0.3));
    const f = freq * (1 + cfg.vibDepth * Math.sin(2 * Math.PI * cfg.vibRate * t) * vibRamp);
    phase += (f * TABLE) / SR;
    const idx = phase % TABLE;
    const i0 = Math.floor(idx);
    const fr = idx - i0;
    const y = tab[i0] * (1 - fr) + tab[(i0 + 1) % TABLE] * fr;
    const x = rng() * 2 - 1;
    nz += (x - nz) * aLP;
    mix[n] += (y + nz * cfg.noise) * env * vol;
  }
}

// ---------- 鋼琴 ----------

function renderPiano(mix, rng, freq, start, noteDur, vol) {
  const B = 0.00025;
  const lowBoost = Math.min(1.8, Math.max(1, Math.pow(220 / freq, 0.3)));
  const partials = [];
  let maxLen = 0;
  for (let k = 1; k <= 10; k++) {
    const f = k * freq * Math.sqrt(1 + B * k * k);
    if (f > SR * 0.48) break;
    const amp = 1 / Math.pow(k, 1.5);
    const decay = (2.4 * lowBoost) / Math.pow(k, 0.75);
    const tEnd = decay * Math.log(amp / 0.0008);
    if (tEnd > maxLen) maxLen = tEnd;
    partials.push({ f, amp, decay, phase: 0 });
  }
  // 離鍵制音:短音不拖太長
  maxLen = Math.min(maxLen, 0.3 + noteDur * 2.5, 3.2);
  const n0 = Math.round(start * SR);
  if (n0 >= mix.length) return;
  const n1 = Math.min(mix.length, n0 + Math.max(1, Math.round(maxLen * SR)));
  const aH = 1 - Math.exp((-2 * Math.PI * 900) / SR);
  let hz = 0;
  for (let n = n0; n < n1; n++) {
    const t = (n - n0) / SR;
    let y = 0;
    for (const p of partials) {
      p.phase += (2 * Math.PI * p.f) / SR;
      y += p.amp * Math.sin(p.phase) * Math.exp(-t / p.decay);
    }
    if (t < 0.025) {
      const x = rng() * 2 - 1;
      hz += (x - hz) * aH;
      y += hz * 0.35 * Math.exp(-t / 0.008);
    }
    mix[n] += y * vol * 0.5;
  }
}

// ---------- 擊弦 / 鍵盤打擊樂 ----------

const MALLETS = {
  marimba:   { ratios: [1, 3.92, 9.24], amps: [1, 0.25, 0.07], decay: 0.55 },
  xylophone: { ratios: [1, 3.92, 9.24], amps: [1, 0.45, 0.18], decay: 0.3, click: 0.3 },
  glock:     { ratios: [1, 2.76, 5.4], amps: [1, 0.35, 0.12], decay: 2.2 },
  vibes:     { ratios: [1, 3.98, 9.96], amps: [1, 0.18, 0.04], decay: 2.8, trem: { rate: 4.5, depth: 0.5 } },
  bells:     { ratios: [1, 2.76, 5.4, 8.93], amps: [1, 0.55, 0.28, 0.12], decay: [4, 3, 2, 1.2], strike: 0.2 },
};

function renderMallet(mix, rng, inst, freq, start, _noteDur, vol) {
  const spec = MALLETS[inst];
  const scale = Math.min(1.8, Math.max(0.5, Math.pow(330 / freq, 0.35)));
  const decArr = Array.isArray(spec.decay) ? spec.decay : spec.ratios.map(() => spec.decay);
  const ps = [];
  let maxLen = 0;
  spec.ratios.forEach((r, i) => {
    const f = r * freq;
    if (f > SR * 0.48) return;
    const d = decArr[i] * scale;
    const tEnd = d * Math.log((spec.amps[i] || 0.01) / 0.001);
    if (tEnd > maxLen) maxLen = tEnd;
    ps.push({ f, amp: spec.amps[i], decay: d, phase: 0 });
  });
  maxLen = Math.min(maxLen, 4.5);
  const n0 = Math.round(start * SR);
  if (n0 >= mix.length) return;
  const n1 = Math.min(mix.length, n0 + Math.max(1, Math.round(maxLen * SR)));
  const aS = 1 - Math.exp((-2 * Math.PI * 2000) / SR);
  let sz = 0;
  for (let n = n0; n < n1; n++) {
    const t = (n - n0) / SR;
    let y = 0;
    for (const p of ps) {
      p.phase += (2 * Math.PI * p.f) / SR;
      y += p.amp * Math.sin(p.phase) * Math.exp(-t / p.decay);
    }
    const atk = Math.min(1, t / 0.003);
    if (spec.click && t < 0.008) {
      y += (rng() * 2 - 1) * spec.click * Math.exp(-t / 0.002);
    }
    if (spec.strike && t < 0.03) {
      const x = rng() * 2 - 1;
      sz += (x - sz) * aS;
      y += sz * spec.strike * Math.exp(-t / 0.01);
    }
    if (spec.trem) {
      y *= 1 - spec.trem.depth * (0.5 - 0.5 * Math.sin(2 * Math.PI * spec.trem.rate * t));
    }
    mix[n] += y * atk * vol * 0.6;
  }
}

// ---------- 定音鼓 ----------

function renderTimpani(mix, rng, freq, start, _noteDur, vol) {
  const modes = [
    [1, 1], [1.5, 0.5], [2.0, 0.32], [2.44, 0.15],
  ];
  const decay = 1.5 * Math.min(1.4, Math.max(0.8, Math.pow(130 / freq, 0.3)));
  const maxLen = Math.min(2.8, decay * Math.log(1 / 0.001));
  const n0 = Math.round(start * SR);
  if (n0 >= mix.length) return;
  const n1 = Math.min(mix.length, n0 + Math.max(1, Math.round(maxLen * SR)));
  const aT = 1 - Math.exp((-2 * Math.PI * 250) / SR);
  const phases = modes.map(() => 0);
  let tz = 0;
  for (let n = n0; n < n1; n++) {
    const t = (n - n0) / SR;
    const glide = 1 + 0.09 * Math.exp(-t / 0.03);
    let y = 0;
    modes.forEach(([r, a], i) => {
      phases[i] += (2 * Math.PI * r * freq * glide) / SR;
      y += a * Math.sin(phases[i]) * Math.exp(-t / (decay / (1 + 0.3 * i)));
    });
    if (t < 0.04) {
      const x = rng() * 2 - 1;
      tz += (x - tz) * aT;
      y += tz * 0.3 * Math.exp(-t / 0.015);
    }
    mix[n] += y * vol * 0.8;
  }
}

// ---------- 打擊樂 ----------

function biquadCoeffs(type, f0, Q) {
  const w0 = (2 * Math.PI * f0) / SR;
  const c = Math.cos(w0);
  const s = Math.sin(w0);
  const al = s / (2 * Q);
  let b0, b1, b2, a0, a1, a2;
  if (type === "lowpass") {
    b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2;
    a0 = 1 + al; a1 = -2 * c; a2 = 1 - al;
  } else if (type === "highpass") {
    b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2;
    a0 = 1 + al; a1 = -2 * c; a2 = 1 - al;
  } else {
    b0 = al; b1 = 0; b2 = -al;
    a0 = 1 + al; a1 = -2 * c; a2 = 1 - al;
  }
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}

function filteredNoise(rng, n, co) {
  const [b0, b1, b2, a1, a2] = co;
  const y = new Float64Array(n);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < n; i++) {
    const x = rng() * 2 - 1;
    const v = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = v;
    y[i] = v;
  }
  return y;
}

function drumKick(mix, rng, start) {
  const dur = 0.45;
  const n = Math.round(dur * SR);
  const n0 = Math.round(start * SR);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const idx = n0 + i;
    if (idx >= mix.length) break;
    const t = i / SR;
    const f = 95 * Math.pow(45 / 95, Math.min(1, t / 0.1));
    phase += (2 * Math.PI * f) / SR;
    let y = Math.sin(phase) * Math.exp(-t / 0.12) * 0.9;
    if (t < 0.02) y += (rng() * 2 - 1) * 0.3 * Math.exp(-t / 0.005);
    mix[idx] += y;
  }
}

function drumSnare(mix, rng, start) {
  const dur = 0.16;
  const n = Math.round(dur * SR);
  const n0 = Math.round(start * SR);
  const nz = filteredNoise(rng, n, biquadCoeffs("bandpass", 1900, 0.9));
  for (let i = 0; i < n; i++) {
    const idx = n0 + i;
    if (idx >= mix.length) break;
    const t = i / SR;
    let y = nz[i] * Math.exp(-t / 0.05) * 0.8;
    y += Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t / 0.03) * 0.5;
    mix[idx] += y;
  }
}

function drumRide(mix, rng, start) {
  const ratios = [1, 1.34, 1.68, 2.12, 2.74];
  const amps = [0.4, 0.32, 0.28, 0.22, 0.16];
  const dur = 1.0;
  const n = Math.round(dur * SR);
  const n0 = Math.round(start * SR);
  const phases = ratios.map(() => 0);
  for (let i = 0; i < n; i++) {
    const idx = n0 + i;
    if (idx >= mix.length) break;
    const t = i / SR;
    let y = 0;
    ratios.forEach((r, k) => {
      phases[k] += (2 * Math.PI * 480 * r) / SR;
      y += amps[k] * Math.sin(phases[k]);
    });
    y *= Math.exp(-t / 0.35) * 0.5;
    if (t < 0.006) y += (rng() * 2 - 1) * 0.25 * Math.exp(-t / 0.002);
    mix[idx] += y;
  }
}

function drumHat(mix, rng, start) {
  const dur = 0.035;
  const n = Math.round(dur * SR);
  const n0 = Math.round(start * SR);
  const nz = filteredNoise(rng, n, biquadCoeffs("highpass", 7800, 1));
  for (let i = 0; i < n; i++) {
    const idx = n0 + i;
    if (idx >= mix.length) break;
    mix[idx] += nz[i] * Math.exp(-(i / SR) / 0.012) * 0.3;
  }
}

function drumCrash(mix, rng, start) {
  const dur = 1.1;
  const n = Math.round(dur * SR);
  const n0 = Math.round(start * SR);
  const nz = filteredNoise(rng, n, biquadCoeffs("highpass", 5200, 1));
  const phases = [0, 0, 0];
  const ratios = [1, 1.48, 2.2];
  for (let i = 0; i < n; i++) {
    const idx = n0 + i;
    if (idx >= mix.length) break;
    const t = i / SR;
    let y = nz[i] * Math.exp(-t / 0.4) * 0.5;
    ratios.forEach((r, k) => {
      phases[k] += (2 * Math.PI * 880 * r) / SR;
      y += 0.15 * Math.sin(phases[k]) * Math.exp(-t / 0.3);
    });
    mix[idx] += y;
  }
}

const DRUM_FNS = { K: drumKick, s: drumSnare, r: drumRide, h: drumHat, c: drumCrash };

// ---------- 整首渲染 ----------

const WIND_SET = new Set(["flute", "piccolo", "oboe", "clarinet", "sax", "trumpet"]);
const MALLET_SET = new Set(["marimba", "xylophone", "glock", "vibes", "bells"]);

function renderTrack(track, seed) {
  const rng = mulberry32(seed);
  const stepDur = 60 / track.bpm / track.stepsPerBeat;
  const loopLen = track.parts[0].notes.length;
  const mix = new Float64Array(Math.round(loopLen * stepDur * SR));

  for (const p of track.parts) {
    for (const e of parseEvents(p.notes, `${track.id}/${p.inst}`)) {
      const st = e.step * stepDur;
      const noteDur = e.len * stepDur;
      const f = midiToFreq(e.midi);
      if (WIND_SET.has(p.inst)) renderWind(mix, rng, p.inst, f, st, noteDur, p.vol);
      else if (p.inst === "piano") renderPiano(mix, rng, f, st, noteDur, p.vol);
      else if (MALLET_SET.has(p.inst)) renderMallet(mix, rng, p.inst, f, st, noteDur, p.vol);
      else if (p.inst === "timpani") renderTimpani(mix, rng, f, st, noteDur, p.vol);
      else throw new Error(`未知樂器: ${p.inst}`);
    }
  }

  for (const layer of track.drums ?? []) {
    for (let s = 0; s < loopLen; s++) {
      const ch = layer[s % layer.length];
      if (!ch || ch === ".") continue;
      const fn = DRUM_FNS[ch];
      if (!fn) throw new Error(`${track.id}: 未知打擊樂符號 "${ch}"`);
      fn(mix, rng, s * stepDur);
    }
  }

  // DC 去除 + peak normalize
  let mean = 0;
  for (let i = 0; i < mix.length; i++) mean += mix[i];
  mean /= mix.length;
  let peak = 0;
  for (let i = 0; i < mix.length; i++) {
    mix[i] -= mean;
    const a = Math.abs(mix[i]);
    if (a > peak) peak = a;
  }
  const g = peak > 0 ? PEAK / peak : 1;
  let sum2 = 0;
  for (let i = 0; i < mix.length; i++) {
    mix[i] *= g;
    sum2 += mix[i] * mix[i];
  }
  return { mix, seconds: mix.length / SR, peak, rms: Math.sqrt(sum2 / mix.length) };
}

function writeWav(file, samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  writeFileSync(file, buf);
}

// ---------- 主流程 ----------

const { outputFiles } = buildSync({
  entryPoints: [path.resolve("src/game/music.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "error",
});
const { TRACKS } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString("base64")}`);
const missingOnly = process.argv.includes("--missing-only");
const wavPath = (id) => path.join(OUT_DIR, `${id}.wav`);
const pending = TRACKS.map((track, index) => ({ track, index })).filter(({ track }) => !missingOnly || !existsSync(wavPath(track.id)));
if (!pending.length) process.exit(0);

// 先驗證記譜:各聲部等長、token 合法、打擊樂層可整除
const NOTE_RE = /^[A-G][#b]?-?\d$/;
for (const { track: t } of pending) {
  const loop = t.parts[0].notes.length;
  for (const p of t.parts) {
    if (p.notes.length !== loop) {
      throw new Error(`${t.id}/${p.inst}: 長度 ${p.notes.length} 與曲長 ${loop} 不符`);
    }
    p.notes.forEach((x, i) => {
      const ok = x === "." || x === "-" || x === 0 || typeof x === "number" || NOTE_RE.test(x);
      if (!ok) throw new Error(`${t.id}/${p.inst}: 第 ${i} 步 token 非法 "${x}"`);
    });
    if (p.notes[0] === "-") throw new Error(`${t.id}/${p.inst}: 首步不能是延長符號`);
  }
  for (const L of t.drums ?? []) {
    if (loop % L.length !== 0) throw new Error(`${t.id}: 打擊樂層長度 ${L.length} 無法整除曲長 ${loop}`);
    for (const ch of L) {
      if (ch !== "." && !DRUM_FNS[ch]) throw new Error(`${t.id}: 未知打擊樂符號 "${ch}"`);
    }
  }
  console.log(`  譜面 OK: ${t.id} (${loop} 步)`);
}

mkdirSync(OUT_DIR, { recursive: true });
let totalKB = 0;
for (const { index: i, track: t } of pending) {
  const { mix, seconds, peak, rms } = renderTrack(t, 1234 + i);
  if (!Number.isFinite(peak) || peak <= 0.001) {
    console.error(`  ✗ ${t.id}: 渲染結果異常 (peak=${peak})`);
    process.exit(1);
  }
  writeWav(wavPath(t.id), mix);
  const kb = Math.round((44 + mix.length * 2) / 1024);
  totalKB += kb;
  console.log(`  ✔ ${t.name.padEnd(8)} ${seconds.toFixed(1).padStart(5)}s  peak=${peak.toFixed(3)}  rms=${rms.toFixed(3)}  ${kb}KB`);
}
console.log(`\n完成: ${pending.length} 首,共約 ${(totalKB / 1024).toFixed(1)}MB → ${OUT_DIR}`);
