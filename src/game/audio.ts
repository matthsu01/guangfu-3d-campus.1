// 8-bit 風格音效 (WebAudio 即時合成) + 背景音樂 (WAV 檔播放)
//
// 配樂是古典管弦風格的原創曲
// (鋼琴/長笛/短笛/雙簧管/豎笛/薩克斯風/小喇叭/馬林巴琴/木琴/鐵琴/顫音琴/管鐘/定音鼓/打擊樂),
// 已用 scripts/render-music.mjs 離線轉成 WAV (22050Hz / 16-bit / mono,無縫循環)並打包進網站,
// 所以不管是單一 HTML 還是 GitHub Pages 子路徑都能直接播放。
// 想重新轉檔或換成自己的音樂,請看 MUSIC.md。

import { DEFAULT_TRACK_ID, TRACKS } from "./music";
import { synthesizeFamilyChime } from "./familyChime";
import overworldWav from "../assets/music/overworld.wav";
import undergroundWav from "../assets/music/underground.wav";
import castleWav from "../assets/music/castle.wav";
import underwaterWav from "../assets/music/underwater.wav";
import dungeonWav from "../assets/music/dungeon.wav";
import racingWav from "../assets/music/racing.wav";
import starWav from "../assets/music/star.wav";
import chillWav from "../assets/music/chill.wav";

/** 曲目 id → 打包後的 WAV 網址 (singlefile 會內嵌成 data URI) */
const TRACK_URLS: Record<string, string> = {
  overworld: overworldWav,
  underground: undergroundWav,
  castle: castleWav,
  underwater: underwaterWav,
  dungeon: dungeonWav,
  racing: racingWav,
  star: starWav,
  chill: chillWav,
};

interface Voice {
  src: AudioBufferSourceNode;
  gain: GainNode;
}

export class GameAudio {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  musicGain: GainNode | null = null;
  sfxGain: GainNode | null = null;
  muted = false;

  /** 目前曲目變更時通知 UI (連續播放換歌時用) */
  onTrackChange: ((id: string) => void) | null = null;

  private buffers = new Map<string, AudioBuffer>();
  private loadPromise: Promise<void> | null = null;
  private voice: Voice | null = null;
  private familyBuffer: AudioBuffer | null = null;
  private familyVoice: Voice | null = null;
  /** 每次播放遞增;避免切歌太快時舊的載入完成後蓋掉新的 */
  private gen = 0;
  private currentId = DEFAULT_TRACK_ID;
  private musicVol = 0.7;
  private autoNext = false;

  get trackId() {
    return this.currentId;
  }
  get isPlaying() {
    return this.voice !== null;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicVol * 0.8;
    this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.9;
    this.sfxGain.connect(this.master);

    // 背景開始預載 WAV,使用者按 START 時通常已經載好
    this.loadPromise = this.loadAll();
  }

  private async loadAll() {
    const ctx = this.ctx;
    if (!ctx) return;
    await Promise.all(
      TRACKS.map(async (t) => {
        try {
          const url = TRACK_URLS[t.id];
          if (!url) return;
          const res = await fetch(url);
          const ab = await res.arrayBuffer();
          this.buffers.set(t.id, await ctx.decodeAudioData(ab));
        } catch (e) {
          console.warn("[audio] WAV 載入失敗:", t.id, e);
        }
      }),
    );
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.02);
    }
  }

  /** 音樂音量 0 ~ 1 (不影響音效) */
  setMusicVolume(v: number) {
    this.musicVol = Math.max(0, Math.min(1, v));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.musicVol * 0.8, this.ctx.currentTime, 0.02);
    }
  }

  /** 連續播放:每首播完一輪後自動換下一首 */
  setAutoNext(on: boolean) {
    this.autoNext = on;
    // 播放模式改變 (循環 ↔ 播完換歌),正在播的歌重開才會生效
    if (this.voice) void this.playId(this.currentId);
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType = "square",
    vol = 0.15,
    when = 0,
    slideTo?: number,
    dest?: AudioNode,
  ) {
    if (!this.ctx || !this.sfxGain) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(dest ?? this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  jump() {
    this.tone(260, 0.22, "square", 0.12, 0, 800);
  }
  land() {
    this.tone(140, 0.07, "triangle", 0.12, 0, 80);
  }
  step_() {
    this.tone(180 + Math.random() * 40, 0.04, "triangle", 0.05, 0, 120);
  }
  coin() {
    this.tone(988, 0.08, "square", 0.12);
    this.tone(1319, 0.4, "square", 0.12, 0.07);
  }
  bump() {
    this.tone(160, 0.12, "square", 0.16, 0, 60);
  }
  blockHit() {
    this.bump();
    this.tone(523, 0.08, "square", 0.1, 0.08);
    this.tone(784, 0.08, "square", 0.1, 0.16);
    this.tone(1047, 0.25, "square", 0.1, 0.24);
  }
  pipe() {
    this.tone(500, 0.5, "square", 0.14, 0, 70);
    this.tone(250, 0.5, "triangle", 0.12, 0, 40);
  }
  zone() {
    this.tone(659, 0.15, "sine", 0.18);
    this.tone(880, 0.35, "sine", 0.18, 0.12);
  }
  /** 台灣 7-11 經典自動門門鈴「叮咚~」(F6 → C#6 大三度下行電子鐘聲) */
  chimeSeven() {
    if (!this.ctx || !this.sfxGain) return;
    const strike = (freq: number, when: number, decay: number, vol: number) => {
      if (!this.ctx || !this.sfxGain) return;
      const t0 = this.ctx.currentTime + when;
      // 主音 + 清脆電子門鈴泛音 + 微微金屬敲擊光澤
      const partials: [number, number, number][] = [
        [1, vol, decay],
        [2, vol * 0.24, decay * 0.45],
        [2.756, vol * 0.1, decay * 0.18],
        [0.5, vol * 0.12, decay * 0.6],
      ];
      for (const [ratio, gainVal, dur] of partials) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq * ratio, t0);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(gainVal, t0 + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start(t0);
        osc.stop(t0 + dur + 0.04);
      }
    };
    // 叮 (F6 = 1396.91Hz) → 咚 (C#6 = 1108.73Hz)
    strike(1396.91, 0, 0.52, 0.24);
    strike(1108.73, 0.36, 0.95, 0.25);
  }
  chimeFamily() {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain || this.muted) return;

    const now = ctx.currentTime;
    if (this.familyVoice) {
      this.familyVoice.gain.gain.setTargetAtTime(0, now, 0.005);
      this.familyVoice.src.stop(now + 0.025);
    }
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = this.familyBuffer ??= synthesizeFamilyChime(ctx);
    src.connect(gain).connect(this.sfxGain);
    const voice = { src, gain };
    this.familyVoice = voice;
    src.onended = () => {
      src.disconnect();
      gain.disconnect();
      if (this.familyVoice === voice) this.familyVoice = null;
    };
    src.start();
  }
  oneUp() {
    [659, 784, 1319, 1047, 1175, 1568].forEach((f, i) => this.tone(f, 0.12, "square", 0.12, i * 0.1));
  }
  flag() {
    for (let i = 0; i < 10; i++) this.tone(1200 - i * 90, 0.08, "square", 0.1, i * 0.06);
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.16, "square", 0.12, 0.7 + i * 0.14));
  }
  click() {
    this.tone(880, 0.05, "square", 0.08);
  }

  // ---------- WAV 音樂播放 ----------

  private stopVoice(fadeSec: number) {
    const v = this.voice;
    this.voice = null;
    if (!v || !this.ctx) return;
    const t = this.ctx.currentTime;
    try {
      v.gain.gain.cancelScheduledValues(t);
      v.gain.gain.setTargetAtTime(0.0001, t, Math.max(0.01, fadeSec / 3));
      v.src.stop(t + fadeSec + 0.05);
    } catch {
      /* 已經停了 */
    }
    window.setTimeout(() => {
      try {
        v.src.disconnect();
        v.gain.disconnect();
      } catch {
        /* 忽略 */
      }
    }, (fadeSec + 0.2) * 1000);
  }

  private async playId(id: string) {
    const my = ++this.gen;
    if (!this.ctx || !this.musicGain) return;
    try {
      if (!this.loadPromise) this.loadPromise = this.loadAll();
      await this.loadPromise;
    } catch {
      return;
    }
    // 等待載入時如果又切了別首 / 按了停止,就放棄這次播放
    if (my !== this.gen || !this.ctx || !this.musicGain) return;
    const buf = this.buffers.get(id);
    if (!buf) return;
    this.stopVoice(0.06);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    const t = this.ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1, t + 0.08);
    src.connect(g);
    g.connect(this.musicGain);
    const v: Voice = { src, gain: g };
    if (this.autoNext) {
      src.loop = false;
      src.onended = () => {
        if (this.voice === v) this.advance();
      };
    } else {
      src.loop = true;
    }
    this.voice = v;
    try {
      src.start(t + 0.01);
    } catch {
      this.voice = null;
    }
  }

  private advance() {
    const i = TRACKS.findIndex((t) => t.id === this.currentId);
    const next = TRACKS[(i + 1) % TRACKS.length];
    this.currentId = next.id;
    this.onTrackChange?.(next.id);
    void this.playId(next.id);
  }

  /** 切換曲目;正在播放時會立刻換歌 */
  setTrack(id: string) {
    if (!TRACKS.some((t) => t.id === id) || id === this.currentId) return;
    this.currentId = id;
    if (this.voice) void this.playId(id);
  }

  startMusic(id?: string) {
    if (id) this.setTrack(id);
    if (!this.ctx || this.voice) return;
    void this.playId(this.currentId);
  }

  stopMusic() {
    this.gen++;
    this.stopVoice(0.08);
  }
}
