// 古典樂風原創配樂 (管弦編制)
//
// 8 首曲子都是原創旋律,採用古典曲式與和聲進行
// (序曲、夜曲、進行曲、印象派圓舞曲、交響風、爵士古典、圓舞曲、小步舞曲)。
//
// 編制:鋼琴 piano / 長笛 flute / 短笛 piccolo / 雙簧管 oboe /
//   豎笛 clarinet / 薩克斯風 sax / 小喇叭 trumpet /
//   馬林巴琴 marimba / 木琴 xylophone / 鐵琴 glock / 顫音琴 vibes /
//   管鐘 bells / 定音鼓 timpani / 打擊樂 drums。
//
// 記譜:每個 token 是一個「步 (step)」
//   "C4" "F#5" "Bb3" → 音名     "." → 休止     "-" → 延長前一個音
//   也可以用數字 (MIDI 編號)。
// 打擊樂 drums 是字串陣列 (可多層疊加),每個字元一步:
//   "K" 大鼓 / "s" 小鼓 / "r" ride 鈸 / "h" 踩鈸 / "c" 強音鈸 / "." 休止

export type Step = string | number;

export type InstrumentId =
  | "piano"
  | "flute"
  | "piccolo"
  | "oboe"
  | "clarinet"
  | "sax"
  | "trumpet"
  | "marimba"
  | "xylophone"
  | "glock"
  | "vibes"
  | "bells"
  | "timpani";

export interface Part {
  inst: InstrumentId;
  notes: Step[];
  vol: number;
}

export interface MusicTrack {
  id: string;
  name: string;
  /** 曲風標籤 */
  style: string;
  desc: string;
  emoji: string;
  color: string;
  bpm: number;
  /** 每拍幾步 (2 = 八分音符一步, 4 = 十六分音符一步) */
  stepsPerBeat: number;
  parts: Part[];
  /** 打擊樂:多層字串,每層長度需整除曲長 */
  drums?: string[];
}

// ---------- 記譜小工具 ----------

const S = (s: string): Step[] => s.trim().split(/\s+/);
/** 把每小節的字串接成一個聲部 */
const J = (...bars: string[]): Step[] => S(bars.join(" "));

// ---------- 1. 晨光序曲 (C 大調,管弦序曲風) ----------

const T1_TRUMPET = J(
  "C5 . E5 . G5 . C6 .",
  "B5 . G5 . E5 . C5 .",
  "F5 . A5 . C6 . A5 .",
  "G5 . B5 . D6 . . .",
  "C6 . A5 . F5 . A5 .",
  "G5 . E5 . C5 . E5 .",
  "F5 . D5 . G5 . B5 .",
  "C6 . . . . . . .",
);
const T1_FLUTE = J(
  "E5 . G5 . C6 . E6 .",
  "D6 . B5 . G5 . E5 .",
  "A5 . C6 . F6 . C6 .",
  "B5 . D6 . G6 . . .",
  "E6 . C6 . A5 . C6 .",
  "B5 . G5 . E5 . G5 .",
  "A5 . F5 . B5 . D6 .",
  "E6 . . . . . . .",
);
const T1_OBOE = J(
  "G4 . . . E4 . . .",
  "G4 . . . C5 . . .",
  "A4 . . . F4 . . .",
  "D5 . . . B4 . . .",
  "E5 . . . C5 . . .",
  "E5 . . . G4 . . .",
  "A4 . . . G4 . . .",
  "G4 . . . . . . .",
);
const T1_CLARINET = J(
  ". C5 . E5 . G5 . E5",
  ". C5 . E5 . G5 . E5",
  ". F5 . A5 . C6 . A5",
  ". G5 . B5 . D6 . B5",
  ". C5 . E5 . G5 . E5",
  ". A4 . C5 . E5 . C5",
  ". F5 . A5 . G5 . B5",
  "E5 . G5 . C6 . . .",
);
const T1_PIANO = J(
  "C4 G4 E4 G4 C4 G4 E4 G4",
  "C4 G4 E4 G4 C4 G4 E4 G4",
  "F3 C4 A4 C4 F3 C4 A4 C4",
  "G3 D4 B4 D4 G3 D4 B4 D4",
  "C4 G4 E4 G4 C4 G4 E4 G4",
  "A3 E4 C4 E4 A3 E4 C4 E4",
  "F3 C4 A4 C4 G3 D4 B4 D4",
  "C4 . E4 . G4 . C5 .",
);
const T1_TIMPANI = J(
  "C3 . G2 . C3 . G2 .",
  "C3 . G2 . C3 . G2 .",
  "F2 . C3 . F2 . C3 .",
  "G2 . D3 . G2 . D3 .",
  "C3 . G2 . C3 . G2 .",
  "A2 . E3 . A2 . E3 .",
  "F2 . C3 . G2 . D3 .",
  "C3 . . . . . . .",
);
const T1_BELLS = J(
  "C5 . . . . . . .",
  ". . . . . . . .",
  ". . . . . . . .",
  ". . . . . . . .",
  "G5 . . . . . . .",
  ". . . . . . . .",
  ". . . . . . . .",
  "C6 . . . G5 . . .",
);
const T1_DRUMS = [
  "c...K..." + "K......." + "K......." + "K.....KK" +
  "c...K..." + "K......." + "K.....KK" + "c...K...",
];

// ---------- 2. 洞窟夜曲 (A 小調,豎笛夜曲風) ----------

const T2_CLARINET = J(
  "E5 . . . A5 . G5 .",
  "F5 . . . E5 . D5 .",
  "B4 . . . C5 . B4 .",
  "A4 . . . . . . .",
  "C5 . . . F5 . E5 .",
  "D5 . . . C5 . B4 .",
  "B4 . . . D5 . B4 .",
  "A4 . . . . . . .",
);
const T2_FLUTE = J(
  ". . . . . . . .",
  ". . . . . . . .",
  ". . . . . . . .",
  "E5 . . . D5 . C5 .",
  ". . . . . . . .",
  ". . . . . . . .",
  ". . . . . . . .",
  "A5 . G5 . E5 . . .",
);
const T2_PIANO_RH = J(
  "A4 . C5 . E5 . C5 .",
  "A4 . D5 . F5 . D5 .",
  "G#4 . B4 . E5 . B4 .",
  "A4 . C5 . E5 . C5 .",
  "F4 . A4 . C5 . A4 .",
  "F4 . D5 . F5 . D5 .",
  "G#4 . B4 . E5 . B4 .",
  "A4 . C5 . E5 . . .",
);
const T2_PIANO_LH = J(
  "A2 . . . E3 . . .",
  "D3 . . . A2 . . .",
  "E2 . . . B2 . . .",
  "A2 . . . E3 . . .",
  "F2 . . . C3 . . .",
  "D3 . . . A2 . . .",
  "E2 . . . B2 . . .",
  "A2 . . . . . . .",
);
const T2_VIBES = J(
  ". . . . . . . .",
  ". . . . . . . .",
  "E5 . . . . . . .",
  ". . . . . . . .",
  "A5 . . . . . . .",
  ". . . . . . . .",
  ". . . . . . . .",
  "C6 . . . A5 . . .",
);

// ---------- 3. 城堡進行曲 (D 小調,銅管進行曲風,十六分音符) ----------

const T3_TRUMPET = J(
  "D5 . D5 . F5 . A5 . G5 . F5 . E5 . . .",
  "F5 . F5 . A5 . D6 . C6 . A5 . F5 . . .",
  "G5 . G5 . Bb5 . D6 . C6 . Bb5 . A5 . . .",
  "A4 . A4 . C#5 . E5 . F5 . E5 . C#5 . . .",
  "D5 . D5 . F5 . A5 . D6 . . C6 . A5 . .",
  "Bb4 . Bb4 . D5 . F5 . G5 . F5 . D5 . . .",
  "C#5 . C#5 . E5 . A5 . G#5 . E5 . C#5 . . .",
  "D6 - - - - - - - - - - - - - - -",
);
const T3_REST4 = ". . . . . . . . . . . . . . . .";
const T3_PICCOLO = J(
  T3_REST4, T3_REST4, T3_REST4, T3_REST4,
  "D6 . F6 . A6 . G6 . F6 . E6 . D6 . . .",
  "D6 . D6 . F6 . G6 . F6 . D6 . Bb5 . . .",
  "A5 . A5 . C#6 . E6 . D6 . C#6 . A5 . . .",
  "D6 - - - - - - - - - - - - - - -",
);
const T3_SAX = J(
  "D4 . . . A4 . . . F4 . . . A4 . . .",
  "D4 . . . A4 . . . F4 . . . D5 . . .",
  "G4 . . . D5 . . . Bb4 . . . D5 . . .",
  "A4 . . . E5 . . . C#5 . . . E5 . . .",
  "D4 . . . A4 . . . F4 . . . A4 . . .",
  "Bb4 . . . F5 . . . D5 . . . F5 . . .",
  "A4 . . . E5 . . . C#5 . . . E5 . . .",
  "D4 . . . . . . . D5 . . . . . . .",
);
const T3_TIMPANI = J(
  "D3 . . . . . . . A2 . . . . . . .",
  "D3 . . . . . . . A2 . . . . . . .",
  "G2 . . . . . . . D3 . . . . . . .",
  "A2 . . . . . . . E3 . . . . . . .",
  "D3 . . . . . . . A2 . . . . . . .",
  "Bb2 . . . . . . . F3 . . . . . . .",
  "A2 . . . . . . . E3 . . . . . . .",
  "D3 - - - - - - - - - - - - - - -",
);
const T3_BELLS = J(
  "D5 . . . . . . . . . . . . . . .",
  T3_REST4, T3_REST4, T3_REST4,
  "D5 . . . . . . . . . . . . . . .",
  T3_REST4, T3_REST4,
  "D6 - - - - - - - - - - - - - - -",
);
const T3_SNARE =
  "s.s.s.s.s.s.s.s.".repeat(7) + "s.s.s.s.ssssssss";
const T3_KICK = "K.......K.......".repeat(8);

// ---------- 4. 水族館 (F 大調,長笛印象風 · 三拍子) ----------

const T4_FLUTE = J(
  "A4 . C5 . F5 .",
  "E5 . D5 . C5 .",
  "D5 . F5 . D5 .",
  "E5 . G5 . E5 .",
  "F5 . A5 . G5 .",
  "F5 . D5 . Bb4 .",
  "C5 . E5 . G5 .",
  "A5 . G5 . F5 .",
);
const T4_VIBES = J(
  "F5 A5 C6 F6 C6 A5",
  "D5 F5 A5 D6 A5 F5",
  "Bb4 D5 F5 Bb5 F5 D5",
  "C5 E5 G5 C6 G5 E5",
  "F5 A5 C6 F6 E6 C6",
  "Bb4 D5 F5 Bb5 A5 F5",
  "C5 E5 G5 B5 G5 E5",
  "F5 A5 C6 F6 . .",
);
const T4_MARIMBA = J(
  "F4 A4 C5 A4 F4 A4",
  "D4 F4 A4 F4 D4 F4",
  "Bb3 D4 F4 D4 Bb3 D4",
  "C4 E4 G4 E4 C4 E4",
  "F4 A4 C5 A4 F4 C5",
  "Bb3 D4 F4 D4 G4 Bb4",
  "C4 E4 G4 E4 C4 G4",
  "F4 A4 C5 F5 . .",
);
const T4_PIANO = J(
  "F2 . F3 A3 C4 .",
  "D3 . D3 F3 A3 .",
  "Bb2 . Bb2 D3 F3 .",
  "C3 . C3 E3 G3 .",
  "F2 . F3 A3 C4 .",
  "Bb2 . Bb2 D3 F3 .",
  "C3 . C3 E3 G3 .",
  "F2 . F3 A3 C4 .",
);

// ---------- 5. 勇者交響 (G 小調,交響冒險風) ----------

const T5_OBOE = J(
  "G4 . Bb4 . D5 . G5 .",
  "F5 . Eb5 . D5 . C5 .",
  "D5 . F5 . Ab5 . G5 .",
  "A5 . G5 . F#5 . D5 .",
  "G5 . . . Eb5 . . .",
  "C5 . Eb5 . G5 . Eb5 .",
  "D5 . F#5 . A5 . F#5 .",
  "G5 . . . . . . .",
);
const T5_TRUMPET = J(
  ". . . . . . . .",
  ". . . . . . . .",
  "G4 . Bb4 . D5 . . .",
  "A4 . D5 . F#5 . . .",
  ". . . . . . . .",
  ". . . . . . . .",
  "A4 . . . A4 . . .",
  "D5 . F#5 . G5 . . .",
);
const T5_SAX = J(
  "G3 . . . D4 . . .",
  "G3 . . . D4 . . .",
  "C4 . . . G4 . . .",
  "D4 . . . A4 . . .",
  "Eb4 . . . Bb4 . . .",
  "C4 . . . G4 . . .",
  "D4 . . . A4 . . .",
  "G3 . . . D4 . . .",
);
const T5_XYLO = J(
  "G5 . Bb5 . D6 . G6 .",
  "F6 . Eb6 . D6 . C6 .",
  "D6 . F6 . Ab6 . G6 .",
  "A5 . D6 . F#6 . A6 .",
  "G6 . . . Eb6 . . .",
  "C6 . Eb6 . G6 . Eb6 .",
  "D6 . F#6 . A6 . F#6 .",
  "G6 . . . . . . .",
);
const T5_TIMPANI = J(
  "G2 . . . D3 . . .",
  "G2 . . . D3 . . .",
  "C3 . . . G3 . . .",
  "D3 . . . A3 . . .",
  "Eb3 . . . Bb3 . . .",
  "C3 . . . G3 . . .",
  "D3 . . . A3 . . .",
  "G2 . . . G2 . . .",
);
const T5_DRUMS = ["K...s...".repeat(7) + "K...K..."];

// ---------- 6. 疾風迴旋曲 (E 小調,爵士古典風) ----------

const T6_SAX = J(
  "E5 G5 B5 G5 E5 G5 B5 D6",
  "C6 B5 G5 E5 D5 E5 G5 E5",
  "D5 F#5 A5 D6 C6 A5 F#5 A5",
  "B5 D6 F#6 D6 B5 D6 B5 G#5",
  "A5 B5 C6 B5 A5 G5 F#5 E5",
  "E5 G5 C6 G5 E5 C6 A5 C6",
  "F#5 A5 D6 A5 F#5 D6 B5 D6",
  "E6 . D6 . B5 . E5 .",
);
const T6_TRUMPET = J(
  ". . . . . . . .",
  ". G5 . . . E5 . .",
  ". . . . . . . .",
  ". D6 . . . B5 . .",
  ". . . . . . . .",
  ". E6 . . . C6 . .",
  ". . . . . . . .",
  ". . B5 . D6 . . .",
);
const T6_PIANO = J(
  ". E4 G4 . B4 . G4 .",
  ". E4 A4 . G4 . E4 .",
  ". D4 F#4 . A4 . F#4 .",
  ". D4 G4 . F#4 . D4 .",
  ". E4 G4 . B4 . D5 .",
  ". C4 E4 . G4 . E4 .",
  ". D4 F#4 . A4 . D5 .",
  ". E4 G4 . B4 . . .",
);
const T6_MARIMBA = J(
  "E4 . E4 . G4 . B4 .",
  "C4 . C4 . E4 . G4 .",
  "D4 . D4 . F#4 . A4 .",
  "B3 . B3 . D4 . F#4 .",
  "E4 . E4 . G4 . B4 .",
  "C4 . C4 . E4 . G4 .",
  "D4 . D4 . F#4 . A4 .",
  "E4 . . . . . . .",
);
const T6_RIDE = "r.r.r.r.".repeat(8);
const T6_HAT = ".h.h.h.h".repeat(8);
const T6_KICK = "K.......".repeat(7) + "K.....K.";
const T6_SNARE =
  "....s..." + "......s." + "....s..." + "..s....." +
  "....s.s." + "......s." + "....s..." + "........";

// ---------- 7. 星光圓舞曲 (C 大調,短笛圓舞曲風 · 三拍子) ----------

const T7_PICCOLO = J(
  "E6 . G6 . C7 .",
  "B6 . D6 . G6 .",
  "C6 . E6 . G6 .",
  "A6 . F6 . D6 .",
  "E6 . G6 . E6 .",
  "F6 . A6 . F6 .",
  "D6 . G6 . B6 .",
  "C7 . . . . .",
);
const T7_FLUTE = J(
  "C6 . E6 . G6 .",
  "G5 . B5 . D6 .",
  "E6 . C6 . A5 .",
  "C6 . A5 . F5 .",
  "G5 . C6 . G5 .",
  "A5 . C6 . A5 .",
  "B5 . D6 . G5 .",
  "G5 . E5 . C5 .",
);
const T7_XYLO = J(
  ". . . . . .",
  ". . . . . .",
  ". . . . . .",
  "C6 D6 E6 F6 G6 A6",
  ". . . . . .",
  ". . . . . .",
  ". . . . . .",
  "G6 . E6 . C6 .",
);
const T7_PIANO = J(
  "C3 . G3 . G3 .",
  "G2 . B3 . D4 .",
  "C3 . G3 . C4 .",
  "F2 . A3 . C4 .",
  "C3 . G3 . C4 .",
  "F2 . C4 . A3 .",
  "G2 . B3 . D4 .",
  "C3 . G3 . C4 .",
);

// ---------- 8. 午後小步舞曲 (G 大調,古典小步舞曲風 · 三拍子) ----------

const T8_PIANO = J(
  "D5 . G5 . B5 .",
  "A5 . G5 . E5 .",
  "G5 . B5 . D6 .",
  "C6 . B5 . A5 .",
  "B5 . A5 . G5 .",
  "A5 . F#5 . D5 .",
  "G5 . A5 . B5 .",
  "B5 . A5 . G5 .",
);
const T8_FLUTE = J(
  "B4 . D5 . G5 .",
  "E5 . C5 . A4 .",
  "G4 . B4 . D5 .",
  "F#5 . E5 . D5 .",
  "D5 . G5 . B5 .",
  "D5 . C5 . A4 .",
  "B4 . D5 . G5 .",
  "D5 . . . . .",
);
const T8_CLARINET = J(
  "G3 B3 D4 B3 G3 B3",
  "E4 C4 G3 C4 E4 C4",
  "G3 B3 D4 B3 G3 D4",
  "F#4 D4 A3 D4 F#4 D4",
  "G3 B3 D4 B3 D4 G4",
  "D4 F#4 A4 F#4 D4 F#4",
  "B3 D4 G4 D4 B3 G4",
  "G3 . D4 . G4 .",
);
const T8_OBOE = J(
  "G4 . . . . .",
  "G4 . . . . .",
  "D5 . . . . .",
  "D5 . . . . .",
  "B4 . . . . .",
  "A4 . . . . .",
  "G4 . . . . .",
  "G4 . . . . .",
);
const T8_MARIMBA = J(
  "G4 . G4 . G4 .",
  "C5 . C5 . C5 .",
  "G4 . G4 . G4 .",
  "D5 . D5 . D5 .",
  "G4 . G4 . G4 .",
  "D5 . D5 . D5 .",
  "G4 . G4 . G4 .",
  "G4 . . . . .",
);

// ---------- 曲目清單 ----------

export const TRACKS: MusicTrack[] = [
  {
    id: "overworld",
    name: "晨光序曲",
    style: "管弦序曲風",
    desc: "小喇叭、長笛與管鐘揭開校園的一天!",
    emoji: "🎺",
    color: "#ee2f3b",
    bpm: 132,
    stepsPerBeat: 2,
    parts: [
      { inst: "trumpet", notes: T1_TRUMPET, vol: 1 },
      { inst: "flute", notes: T1_FLUTE, vol: 0.8 },
      { inst: "oboe", notes: T1_OBOE, vol: 0.8 },
      { inst: "clarinet", notes: T1_CLARINET, vol: 0.7 },
      { inst: "piano", notes: T1_PIANO, vol: 0.8 },
      { inst: "timpani", notes: T1_TIMPANI, vol: 0.9 },
      { inst: "bells", notes: T1_BELLS, vol: 0.7 },
    ],
    drums: T1_DRUMS,
  },
  {
    id: "underground",
    name: "洞窟夜曲",
    style: "豎笛夜曲風",
    desc: "豎笛配鋼琴與顫音琴,靜靜探險的夜晚。",
    emoji: "🌙",
    color: "#6d4ab5",
    bpm: 92,
    stepsPerBeat: 2,
    parts: [
      { inst: "clarinet", notes: T2_CLARINET, vol: 1 },
      { inst: "flute", notes: T2_FLUTE, vol: 0.7 },
      { inst: "piano", notes: T2_PIANO_RH, vol: 0.75 },
      { inst: "piano", notes: T2_PIANO_LH, vol: 0.8 },
      { inst: "vibes", notes: T2_VIBES, vol: 0.6 },
    ],
  },
  {
    id: "castle",
    name: "城堡進行曲",
    style: "銅管進行曲風",
    desc: "小喇叭、短笛與大鼓,向魔王城前進!",
    emoji: "🏰",
    color: "#8b6b4a",
    bpm: 120,
    stepsPerBeat: 4,
    parts: [
      { inst: "trumpet", notes: T3_TRUMPET, vol: 1 },
      { inst: "piccolo", notes: T3_PICCOLO, vol: 0.75 },
      { inst: "sax", notes: T3_SAX, vol: 0.8 },
      { inst: "timpani", notes: T3_TIMPANI, vol: 0.9 },
      { inst: "bells", notes: T3_BELLS, vol: 0.6 },
    ],
    drums: [T3_SNARE, T3_KICK],
  },
  {
    id: "underwater",
    name: "水族館",
    style: "長笛印象風 · 三拍子",
    desc: "長笛、顫音琴與馬林巴琴的海底散步。",
    emoji: "🐠",
    color: "#2aa7d8",
    bpm: 100,
    stepsPerBeat: 2,
    parts: [
      { inst: "flute", notes: T4_FLUTE, vol: 1 },
      { inst: "vibes", notes: T4_VIBES, vol: 0.7 },
      { inst: "marimba", notes: T4_MARIMBA, vol: 0.75 },
      { inst: "piano", notes: T4_PIANO, vol: 0.6 },
    ],
  },
  {
    id: "dungeon",
    name: "勇者交響",
    style: "交響冒險風",
    desc: "雙簧管與小喇叭的英雄之歌,木琴助陣!",
    emoji: "⚔️",
    color: "#3a9d5d",
    bpm: 112,
    stepsPerBeat: 2,
    parts: [
      { inst: "oboe", notes: T5_OBOE, vol: 1 },
      { inst: "trumpet", notes: T5_TRUMPET, vol: 0.9 },
      { inst: "sax", notes: T5_SAX, vol: 0.75 },
      { inst: "xylophone", notes: T5_XYLO, vol: 0.7 },
      { inst: "timpani", notes: T5_TIMPANI, vol: 0.9 },
    ],
    drums: T5_DRUMS,
  },
  {
    id: "racing",
    name: "疾風迴旋曲",
    style: "爵士古典風",
    desc: "薩克斯風配爵士鼓與小喇叭,油門踩到底!",
    emoji: "🎷",
    color: "#e8590c",
    bpm: 150,
    stepsPerBeat: 2,
    parts: [
      { inst: "sax", notes: T6_SAX, vol: 1 },
      { inst: "trumpet", notes: T6_TRUMPET, vol: 0.8 },
      { inst: "piano", notes: T6_PIANO, vol: 0.75 },
      { inst: "marimba", notes: T6_MARIMBA, vol: 0.7 },
    ],
    drums: [T6_RIDE, T6_HAT, T6_KICK, T6_SNARE],
  },
  {
    id: "star",
    name: "星光圓舞曲",
    style: "短笛圓舞曲風 · 三拍子",
    desc: "短笛、鐵琴與木琴的星空旋轉。",
    emoji: "⭐",
    color: "#f2b705",
    bpm: 150,
    stepsPerBeat: 2,
    parts: [
      { inst: "piccolo", notes: T7_PICCOLO, vol: 1 },
      { inst: "glock", notes: T7_PICCOLO, vol: 0.55 },
      { inst: "flute", notes: T7_FLUTE, vol: 0.8 },
      { inst: "xylophone", notes: T7_XYLO, vol: 0.7 },
      { inst: "piano", notes: T7_PIANO, vol: 0.65 },
    ],
  },
  {
    id: "chill",
    name: "午後小步舞曲",
    style: "古典小步舞曲風 · 三拍子",
    desc: "鋼琴、長笛與木管的悠閒午後。",
    emoji: "🏫",
    color: "#4aa8f0",
    bpm: 100,
    stepsPerBeat: 2,
    parts: [
      { inst: "piano", notes: T8_PIANO, vol: 0.9 },
      { inst: "flute", notes: T8_FLUTE, vol: 0.8 },
      { inst: "clarinet", notes: T8_CLARINET, vol: 0.7 },
      { inst: "oboe", notes: T8_OBOE, vol: 0.7 },
      { inst: "marimba", notes: T8_MARIMBA, vol: 0.45 },
    ],
  },
];

export const DEFAULT_TRACK_ID = TRACKS[0].id;
