// Melody and timing from the linked 2022 Taiwan FamilyMart piano reference:
// https://www.youtube.com/watch?v=44qfv9Q7U8k (Javin Tham Music).
// [sixteenth-note offset, length, lead MIDI note, harmony MIDI note]
const SCORE = [
  [0, 3, 86, 78], [4, 3, 86, 78], [8, 1, 83, 77], [10, 1, 85, 77], [11, 4, 86, 81],
  [16, 1, 85, 76], [18, 1, 85, 76], [20, 1.5, 86, 76], [21.5, 0.5, 85, 80],
  [22, 1, 92, 88], [23, 7, 90, 85],
  [32, 1, 86, 78], [34, 1, 86, 78], [36, 1, 85, 78], [37, 2, 86, 81],
  [40, 2, 86, 80], [43, 2, 85, 80], [46, 1, 83, 80], [48, 5, 81, 76],
] as const;

export function synthesizeFamilyChime(ctx: BaseAudioContext) {
  const step = 0.15;
  const sampleRate = 22050;
  const release = 0.32;
  const buffer = ctx.createBuffer(1, Math.ceil((53 * step + release) * sampleRate), sampleRate);
  const samples = buffer.getChannelData(0);

  const strike = (midi: number, at: number, hold: number, level: number) => {
    const phaseStep = 2 * Math.PI * 440 * 2 ** ((midi - 69) / 12) / sampleRate;
    const start = Math.round(at * sampleRate);
    const length = Math.min(samples.length - start, Math.ceil((hold + release) * sampleRate));
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const tail = Math.min(1, Math.max(0, (hold + release - t) / release));
      const env = Math.min(1, t / 0.006) * Math.exp(-t * 3.4) * tail ** 2;
      const phase = i * phaseStep;
      const bell = Math.sin(phase) + 0.22 * Math.exp(-t * 12) * Math.sin(phase * 2.002)
        + 0.09 * Math.exp(-t * 24) * Math.sin(phase * 2.71);
      samples[start + i] += level * env * bell;
    }
  };

  for (const [at, length, lead, harmony] of SCORE) {
    strike(lead, at * step, length * step, 0.185);
    strike(harmony, at * step, length * step, 0.055);
  }
  return buffer;
}