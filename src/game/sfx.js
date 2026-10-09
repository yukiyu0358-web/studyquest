// 効果音（Web Audio で合成。設定でオンにしたときだけ鳴る）

// ── 効果音：Web Audio で合成する（設定でオンにしたときだけ鳴る） ──
export const SFX = {
  enabled: false,
  ctx: null,
  ac() {
    if (!this.ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; this.ctx = new C(); }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  },
  tone(ac, f, t, dur, type = "square", vol = 0.06, slide) {
    const o = ac.createOscillator(), g = ac.createGain(), t0 = ac.currentTime + t;
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + dur + 0.03);
  },
  noise(ac, t, dur, vol = 0.1, hp = 1000) {
    const len = Math.floor(ac.sampleRate * dur), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = buf; f.type = "highpass"; f.frequency.value = hp; g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(ac.destination); src.start(ac.currentTime + t);
  },
  play(name) {
    if (!this.enabled) return;
    try {
      const ac = this.ac(); if (!ac) return;
      const T = (...a) => this.tone(ac, ...a), N = (...a) => this.noise(ac, ...a);
      if (name === "hit") { N(0, 0.12, 0.12, 1600); T(520, 0, 0.1, "square", 0.05, 260); }
      else if (name === "crit") { N(0, 0.18, 0.14, 1200); T(660, 0, 0.08, "square", 0.06); T(990, 0.07, 0.18, "square", 0.06, 1320); }
      else if (name === "miss") { T(190, 0, 0.26, "sawtooth", 0.08, 60); N(0, 0.2, 0.1, 300); }
      else if (name === "defeat") { T(880, 0.02, 0.08, "triangle", 0.05); T(1175, 0.09, 0.08, "triangle", 0.05); T(1568, 0.16, 0.14, "triangle", 0.05); }
      else if (name === "combo") { [784, 988, 1319, 1568].forEach((f, i) => T(f, i * 0.07, i === 3 ? 0.3 : 0.08, "square", 0.05)); }
      else if (name === "levelup") { [523, 659, 784, 1047].forEach((f, i) => T(f, i * 0.1, i === 3 ? 0.5 : 0.12, "triangle", 0.07)); }
      else if (name === "result") { [659, 784, 1047].forEach((f, i) => T(f, i * 0.12, i === 2 ? 0.4 : 0.12, "triangle", 0.06)); }
      else if (name === "drop") { T(1320, 0, 0.06, "triangle", 0.04); T(1760, 0.06, 0.12, "triangle", 0.04); }
      else if (name === "clang") { N(0, 0.09, 0.12, 2500); T(1250, 0, 0.18, "square", 0.03, 900); }
      else if (name === "forgeOk") { [784, 988, 1175, 1568].forEach((f, i) => T(f, i * 0.08, i === 3 ? 0.45 : 0.1, "triangle", 0.07)); }
      else if (name === "forgeFail") { T(240, 0, 0.4, "sawtooth", 0.06, 110); N(0.05, 0.3, 0.05, 400); }
      else if (name === "evolve") {
        T(196, 0, 1.7, "sine", 0.06, 1568); T(294, 0.05, 1.7, "triangle", 0.03, 2349); N(0.2, 1.4, 0.03, 3000);
        [523, 659, 784, 1047, 1319].forEach((f, i) => T(f, 1.9 + i * 0.1, i === 4 ? 0.9 : 0.14, "triangle", 0.07));
      }
      else if (name === "skill") { [523, 784, 1047, 1568].forEach((f, i) => T(f, i * 0.05, i === 3 ? 0.4 : 0.07, "triangle", 0.06)); }
    } catch (e) { /* 音が出せなくても学習は続ける */ }
  },
};
