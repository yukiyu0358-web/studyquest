// ============================================================
// 無線工学の計算ドリル（二陸特。電卓なしで解ける数字だけ）
// makeRadioCalc(type, seed) → { type, q, opts:[4つ], correct:0〜3, hint, steps:[…] }
// seed が同じなら同じ問題。4択の選択肢は、よくある計算のまちがい（2で割り忘れ・10倍のずれなど）から作る
// デシベルは試験と同じく「3dB≒2倍」「10dB＝10倍」の組合せで計算できる値だけ
// ============================================================

export const RADIO_CALC_TYPES = [
  { id: "wave", name: "周波数と波長", icon: "〰" },
  { id: "dbp", name: "デシベル（電力）", icon: "📶" },
  { id: "dbv", name: "デシベル（電圧）", icon: "🔊" },
  { id: "ohm", name: "オームの法則", icon: "Ω" },
  { id: "rsum", name: "合成抵抗", icon: "⫘" },
  { id: "power", name: "電力", icon: "⚡" },
  { id: "cap", name: "合成静電容量", icon: "⊣⊢" },
  { id: "period", name: "周期", icon: "⏱" },
  { id: "am", name: "AMの変調度", icon: "〽" },
  { id: "fm", name: "FMの帯域幅", icon: "〜" },
  { id: "image", name: "影像周波数", icon: "🪞" },
  { id: "pcm", name: "PCM", icon: "0101" },
  { id: "radar", name: "レーダーの距離", icon: "📡" },
  { id: "horizon", name: "見通し距離", icon: "🔭" },
  { id: "battery", name: "蓄電池", icon: "🔋" },
  { id: "meter", name: "分流器・倍率器", icon: "📟" },
];

// 決まった乱数（seed が同じなら同じ並び）
function rngOf(seed) {
  let a = (seed >>> 0) || 1;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
// 数の表し方：余分な0を取り、3けたごとにカンマ
export const num = (v) => { const x = Math.round(v * 10000) / 10000; const [i, d] = String(x).split("."); return Number(i).toLocaleString("en-US") + (d ? `.${d}` : ""); };

// 4択をつくる：正解と、まちがいの候補から重ならない3つ（足りなければ倍・半分など）
function choices(r, correct, wrongs, fmt) {
  const out = [correct];
  const key = (v) => fmt(v);
  for (const w of [...wrongs, correct * 2, correct / 2, correct * 10, correct / 10, correct * 3, correct + 1]) {
    if (out.length >= 4) break;
    if (!(w > 0) || !isFinite(w)) continue;
    if (out.some((o) => key(o) === key(w))) continue;
    out.push(w);
  }
  // 並べ替え（正解の位置をばらす）
  const idx = [0, 1, 2, 3].sort(() => r() - 0.5);
  const opts = idx.map((i) => fmt(out[i]));
  return { opts, correct: idx.indexOf(0) };
}
const u = (unit) => (v) => `${num(v)}〔${unit}〕`;

// デシベルの表（電力）：3dB＝2倍、10dB＝10倍の組合せ
const DBP = [[3, 2], [6, 4], [7, 5], [9, 8], [10, 10], [13, 20], [16, 40], [17, 50], [20, 100], [23, 200], [26, 400], [27, 500], [30, 1000]];
// 電圧：20log なので 6dB＝2倍、20dB＝10倍
const DBV = [[6, 2], [12, 4], [14, 5], [20, 10], [26, 20], [32, 40], [34, 50], [40, 100], [46, 200], [60, 1000]];
// 並列にすると割り切れる抵抗・静電容量の組
const PAIRS = [[6, 3, 2], [12, 6, 4], [4, 4, 2], [10, 10, 5], [20, 30, 12], [30, 60, 20], [12, 4, 3], [20, 20, 10], [15, 10, 6], [60, 40, 24], [8, 8, 4], [40, 10, 8]];

const GEN = {
  // 周波数と波長：λ〔m〕＝300／f〔MHz〕
  wave(r) {
    const f = pick(r, [10, 15, 30, 50, 60, 75, 100, 150, 200, 300, 600, 1500, 3000]);
    const lam = 300 / f;
    const fmtL = (m) => (m >= 1 ? `${num(m)}〔m〕` : `${num(m * 100)}〔cm〕`);
    if (r() < 0.5) {
      return { q: `周波数が${num(f)}〔MHz〕の電波の波長はいくらか。`, ...choices(r, lam, [lam * 10, lam / 10, lam * 2], fmtL),
        hint: "λ〔m〕＝300／f〔MHz〕", steps: [`λ＝300／${num(f)}＝${num(lam)}〔m〕${lam < 1 ? `＝${num(lam * 100)}〔cm〕` : ""}`] };
    }
    return { q: `波長が${lam >= 1 ? `${num(lam)}〔m〕` : `${num(lam * 100)}〔cm〕`}の電波の周波数はいくらか。`, ...choices(r, f, [f * 10, f / 10, f * 2], u("MHz")),
      hint: "f〔MHz〕＝300／λ〔m〕", steps: [`f＝300／${num(lam)}＝${num(f)}〔MHz〕`] };
  },
  // 電力のデシベル：出力＝入力×倍数
  dbp(r) {
    const [db, k] = pick(r, DBP);
    if (r() < 0.6) {
      const pin = pick(r, [0.1, 0.5, 1, 2, 5, 10]);
      const pout = pin * k;
      return { q: `電力利得が${db}〔dB〕の増幅器に${num(pin)}〔W〕を入力したときの出力電力はいくらか。`, ...choices(r, pout, [pin * db, pout / 2, pout * 2], u("W")),
        hint: "3dB≒2倍、10dB＝10倍。dB の足し算は倍数の掛け算", steps: [dbSplit(db) === String(k) ? `${db}dB → ${k}倍` : `${db}dB → ${dbSplit(db)}＝${k}倍`, `${num(pin)}〔W〕×${k}＝${num(pout)}〔W〕`] };
    }
    const wrongDb = DBP.filter(([d]) => d !== db).map(([d]) => d);
    return { q: `増幅器の出力電力が入力電力の${k}倍のとき、電力利得はいくらか。`, ...choices(r, db, [pick(r, wrongDb), db * 2, Math.max(1, db - 3)], u("dB")),
      hint: "2倍＝3dB、10倍＝10dB。倍数の掛け算は dB の足し算", steps: [`${k}倍 ＝ ${dbSplit(db)} → ${db}〔dB〕`] };
  },
  // 電圧のデシベル：20log
  dbv(r) {
    const [db, k] = pick(r, DBV);
    if (r() < 0.6) {
      const vin = pick(r, [1, 2, 5, 10]);
      return { q: `電圧利得が${db}〔dB〕の増幅器に${vin}〔mV〕を入力したときの出力電圧はいくらか。`, ...choices(r, vin * k, [vin * Math.pow(10, db / 10), vin * k / 2, vin * db], u("mV")),
        hint: "電圧は 20log：6dB≒2倍、20dB＝10倍", steps: [`電圧の${db}dB → ${k}倍`, `${vin}〔mV〕×${k}＝${num(vin * k)}〔mV〕`] };
    }
    return { q: `電圧が${k}倍になったとき、電圧の利得はいくらか。`, ...choices(r, db, [db / 2, db * 2, pick(r, DBV.filter(([d]) => d !== db))[0]], u("dB")),
      hint: "電圧は 20log：2倍＝6dB、10倍＝20dB", steps: [`電圧の${k}倍 → ${db}〔dB〕（電力なら${db / 2}dB）`] };
  },
  // オームの法則
  ohm(r) {
    const R = pick(r, [2, 4, 5, 10, 20, 25, 50, 100]);
    const I = pick(r, [0.1, 0.2, 0.5, 1, 2, 3, 4, 5]);
    const V = R * I;
    const v = r();
    if (v < 0.34) return { q: `${R}〔Ω〕の抵抗に${num(I)}〔A〕の電流が流れているとき、抵抗の両端の電圧はいくらか。`, ...choices(r, V, [R / I, I / R, V * 2], u("V")), hint: "V＝IR", steps: [`V＝${num(I)}×${R}＝${num(V)}〔V〕`] };
    if (v < 0.67) return { q: `${R}〔Ω〕の抵抗に${num(V)}〔V〕の電圧を加えたとき、流れる電流はいくらか。`, ...choices(r, I, [V * R, R / V, I * 2], u("A")), hint: "I＝V／R", steps: [`I＝${num(V)}／${R}＝${num(I)}〔A〕`] };
    return { q: `ある抵抗に${num(V)}〔V〕の電圧を加えたら${num(I)}〔A〕の電流が流れた。抵抗の値はいくらか。`, ...choices(r, R, [V * I, I / V, R * 2], u("Ω")), hint: "R＝V／I", steps: [`R＝${num(V)}／${num(I)}＝${R}〔Ω〕`] };
  },
  // 合成抵抗：R1 と R2 を並列にし、R3 を直列
  rsum(r) {
    const [a, b, p] = pick(r, PAIRS);
    const c = pick(r, [1, 2, 3, 5, 10]);
    return { q: `${a}〔Ω〕と${b}〔Ω〕の抵抗を並列に接続し、これに${c}〔Ω〕の抵抗を直列に接続したときの合成抵抗はいくらか。`, ...choices(r, p + c, [a + b + c, p, (a + b) / 2 + c], u("Ω")),
      hint: "並列（2個）は 和分の積 R1R2／(R1＋R2)、直列は足し算", steps: [`並列：${a}×${b}／(${a}＋${b})＝${a * b}／${a + b}＝${p}〔Ω〕`, `直列：${p}＋${c}＝${p + c}〔Ω〕`] };
  },
  // 電力
  power(r) {
    if (r() < 0.5) {
      const V = pick(r, [10, 20, 50, 100]), R = pick(r, [5, 10, 20, 25, 50, 100]);
      const P = (V * V) / R;
      return { q: `${R}〔Ω〕の抵抗に${V}〔V〕の電圧を加えたとき、抵抗で消費される電力はいくらか。`, ...choices(r, P, [V * R, V / R, P * 2], u("W")), hint: "P＝V²／R", steps: [`P＝${V}²／${R}＝${V * V}／${R}＝${num(P)}〔W〕`] };
    }
    const I = pick(r, [0.5, 1, 2, 3, 4, 5]), R = pick(r, [2, 4, 5, 10, 20, 50]);
    const P = I * I * R;
    return { q: `${R}〔Ω〕の抵抗に${num(I)}〔A〕の電流が流れているとき、抵抗で消費される電力はいくらか。`, ...choices(r, P, [I * R, (I * I) / R, P * 2], u("W")), hint: "P＝I²R", steps: [`P＝${num(I)}²×${R}＝${num(P)}〔W〕`] };
  },
  // 合成静電容量：並列は足し算、直列は和分の積（抵抗の逆）
  cap(r) {
    const [a, b, p] = pick(r, PAIRS);
    if (r() < 0.5) return { q: `${a}〔μF〕と${b}〔μF〕のコンデンサを直列に接続したときの合成静電容量はいくらか。`, ...choices(r, p, [a + b, (a + b) / 2, Math.abs(a - b) || a * 2], u("μF")),
      hint: "コンデンサの直列は 和分の積（抵抗の並列と同じ形）", steps: [`${a}×${b}／(${a}＋${b})＝${a * b}／${a + b}＝${p}〔μF〕`] };
    const c = pick(r, [1, 2, 5, 10]);
    return { q: `${a}〔μF〕と${b}〔μF〕のコンデンサを直列に接続し、これに${c}〔μF〕のコンデンサを並列に接続したときの合成静電容量はいくらか。`, ...choices(r, p + c, [a + b + c, p, a + b], u("μF")),
      hint: "直列は和分の積、並列は足し算（抵抗と逆）", steps: [`直列：${a}×${b}／(${a}＋${b})＝${p}〔μF〕`, `並列：${p}＋${c}＝${p + c}〔μF〕`] };
  },
  // 周期 T＝1／f
  period(r) {
    const [f, T] = pick(r, [["50〔Hz〕", "20〔ms〕"], ["100〔Hz〕", "10〔ms〕"], ["1〔kHz〕", "1〔ms〕"], ["2〔kHz〕", "0.5〔ms〕"], ["10〔kHz〕", "0.1〔ms〕"], ["1〔MHz〕", "1〔μs〕"], ["2〔MHz〕", "0.5〔μs〕"], ["10〔MHz〕", "0.1〔μs〕"]]);
    const all = ["20〔ms〕", "10〔ms〕", "1〔ms〕", "0.5〔ms〕", "0.1〔ms〕", "1〔μs〕", "0.5〔μs〕", "0.1〔μs〕", "2〔ms〕", "5〔ms〕", "1〔s〕"];
    const opts = [T, ...all.filter((x) => x !== T).sort(() => r() - 0.5).slice(0, 3)];
    const idx = [0, 1, 2, 3].sort(() => r() - 0.5);
    return { q: `周波数${f}の交流の周期はいくらか。`, opts: idx.map((i) => opts[i]), correct: idx.indexOf(0), hint: "T＝1／f", steps: [`T＝1／${f.replace(/〔|〕/g, "")}＝${T}`] };
  },
  // AM の変調度
  am(r) {
    if (r() < 0.5) {
      const [A, B, m] = pick(r, [[150, 50, 50], [120, 80, 20], [160, 40, 60], [140, 60, 40], [180, 20, 80], [130, 70, 30]]);
      return { q: `AM波の振幅の最大値が${A}〔V〕、最小値が${B}〔V〕のとき、変調度はいくらか。`, ...choices(r, m, [Math.round((B / A) * 100), Math.round(((A - B) / A) * 100), 100 - m], u("%")),
        hint: "m＝(最大−最小)／(最大＋最小)×100〔%〕", steps: [`m＝(${A}−${B})／(${A}＋${B})＝${A - B}／${A + B}＝${m}〔%〕`] };
    }
    const E = pick(r, [50, 100, 200]), m = pick(r, [20, 40, 50, 60, 80]);
    const top = E * (1 + m / 100);
    return { q: `搬送波の振幅が${E}〔V〕の AM 波で、変調度が${m}〔%〕のとき、変調された波の振幅の最大値はいくらか。`, ...choices(r, top, [E * (1 - m / 100), E * m / 100, E * 2], u("V")),
      hint: "最大値＝搬送波の振幅×(1＋m)", steps: [`${E}×(1＋${m / 100})＝${num(top)}〔V〕`] };
  },
  // FM の帯域幅 B≒2(Δf＋fm)
  fm(r) {
    const df = pick(r, [5, 10, 15, 20, 25, 50, 75]), fmq = pick(r, [3, 5, 10, 15]);
    const B = 2 * (df + fmq);
    return { q: `最大周波数偏移が${df}〔kHz〕、変調信号の最高周波数が${fmq}〔kHz〕の FM 波の占有周波数帯幅は、およそいくらか。ただし B≒2(Δf＋fm) とする。`, ...choices(r, B, [df + fmq, 2 * df, 2 * df * fmq], u("kHz")),
      hint: "B≒2(Δf＋fm)", steps: [`B≒2×(${df}＋${fmq})＝${B}〔kHz〕`] };
  },
  // 影像周波数（局部発振が受信周波数より高い）
  image(r) {
    const fr = pick(r, [100, 145, 150, 430, 450]), fi = pick(r, [10.7, 21.4]);
    const im = fr + 2 * fi;
    return { q: `スーパヘテロダイン受信機で、受信周波数が${fr}〔MHz〕、中間周波数が${num(fi)}〔MHz〕のとき、影像周波数はいくらか。ただし、局部発振周波数は受信周波数より高いものとする。`, ...choices(r, im, [fr + fi, fr - 2 * fi, fr + 4 * fi], u("MHz")),
      hint: "局部発振＝受信＋中間、影像＝受信＋中間×2", steps: [`局部発振＝${fr}＋${num(fi)}＝${num(fr + fi)}〔MHz〕`, `影像＝${fr}＋2×${num(fi)}＝${num(im)}〔MHz〕`] };
  },
  // PCM
  pcm(r) {
    if (r() < 0.5) {
      const fs = pick(r, [8, 16, 32]), b = pick(r, [4, 8, 12, 16]);
      return { q: `標本化周波数${fs}〔kHz〕、量子化ビット数${b}ビットの PCM の伝送速度はいくらか（1チャネル）。`, ...choices(r, fs * b, [fs * b * 2, fs + b, fs * Math.pow(2, Math.min(b, 4))], u("kbps")),
        hint: "伝送速度＝標本化周波数×量子化ビット数", steps: [`${fs}〔kHz〕×${b}＝${fs * b}〔kbps〕`] };
    }
    const n = pick(r, [3, 4, 5, 6, 7, 8]);
    return { q: `量子化ビット数が${n}ビットのとき、量子化のレベル（段階）の数はいくらか。`, ...choices(r, Math.pow(2, n), [2 * n, n * n, Math.pow(2, n - 1)], (v) => `${num(v)}`),
      hint: "レベルの数＝2ⁿ", steps: [`2の${n}乗＝${Math.pow(2, n)}`] };
  },
  // レーダーの距離 R＝ct／2（1μs で 150m）
  radar(r) {
    const t = pick(r, [2, 4, 10, 20, 40, 50, 100, 200]);
    const R = 150 * t;
    const fmtD = (m) => (m >= 1000 ? `${num(m / 1000)}〔km〕` : `${num(m)}〔m〕`);
    if (r() < 0.6) return { q: `パルスレーダーで、電波を発射してから反射波を受信するまでの時間が${t}〔μs〕のとき、物標までの距離はいくらか。ただし電波の速さは3×10⁸〔m/s〕とする。`, ...choices(r, R, [R * 2, R / 2, R * 10], fmtD),
      hint: "R＝ct／2（往復なので2で割る）。1μs で150m", steps: [`R＝3×10⁸×${t}×10⁻⁶／2＝${num(R)}〔m〕${R >= 1000 ? `＝${num(R / 1000)}〔km〕` : ""}`] };
    return { q: `パルスレーダーで、${fmtD(R)}離れた物標からの反射波が戻るまでの時間はいくらか。ただし電波の速さは3×10⁸〔m/s〕とする。`, ...choices(r, t, [t * 2, t / 2, t * 10], u("μs")),
      hint: "t＝2R／c（往復）。150m で1μs", steps: [`t＝2×${num(R)}／(3×10⁸)＝${t}×10⁻⁶〔s〕＝${t}〔μs〕`] };
  },
  // 見通し距離 d≒4.12(√h1＋√h2)
  horizon(r) {
    const hs = [4, 9, 16, 25, 36, 49, 64, 81, 100];
    const h1 = pick(r, hs), h2 = pick(r, hs.filter((h) => h !== h1));
    const s = Math.sqrt(h1) + Math.sqrt(h2);
    const d = Math.round(4.12 * s * 10) / 10;
    return { q: `送信アンテナの高さ${h1}〔m〕、受信アンテナの高さ${h2}〔m〕のとき、電波の見通し距離はおよそいくらか。ただし d〔km〕≒4.12(√h1＋√h2) とする。`,
      ...choices(r, d, [Math.round(4.12 * Math.sqrt(h1 + h2) * 10) / 10, Math.round(4.12 * s * 5) / 10, Math.round(4.12 * (h1 + h2) / 10 * 10) / 10], (v) => `約${num(v)}〔km〕`),
      hint: "d≒4.12(√h1＋√h2)。h が4・9・16…なら √ は2・3・4…", steps: [`√${h1}＋√${h2}＝${Math.sqrt(h1)}＋${Math.sqrt(h2)}＝${s}`, `4.12×${s}＝${num(Math.round(4.12 * s * 100) / 100)} → 約${num(d)}〔km〕`] };
  },
  // 蓄電池
  battery(r) {
    if (r() < 0.5) {
      const ah = pick(r, [10, 20, 30, 40, 60, 100]), a = pick(r, [0.5, 1, 2, 4, 5]);
      return { q: `容量${ah}〔Ah〕の蓄電池で、${num(a)}〔A〕の電流を流し続けると、およそ何時間使えるか。`, ...choices(r, ah / a, [ah * a, ah / a / 2, ah / a * 2], u("h")),
        hint: "使える時間〔h〕＝容量〔Ah〕／電流〔A〕", steps: [`${ah}／${num(a)}＝${num(ah / a)}〔h〕`] };
    }
    const v = pick(r, [2, 6, 12]), ah = pick(r, [10, 20, 30, 50]), n = pick(r, [2, 3, 4]);
    const series = r() < 0.5;
    const ans = series ? `${v * n}〔V〕・${ah}〔Ah〕` : `${v}〔V〕・${ah * n}〔Ah〕`;
    const pool = [`${v * n}〔V〕・${ah}〔Ah〕`, `${v}〔V〕・${ah * n}〔Ah〕`, `${v * n}〔V〕・${ah * n}〔Ah〕`, `${v}〔V〕・${ah}〔Ah〕`];
    const idx = [0, 1, 2, 3].sort(() => r() - 0.5);
    const opts = idx.map((i) => pool[i]);
    return { q: `${v}〔V〕・${ah}〔Ah〕の蓄電池${n}個を${series ? "直列" : "並列"}に接続したとき、全体の電圧と容量はいくらか。`, opts, correct: opts.indexOf(ans),
      hint: "直列は電圧が足し算・容量はそのまま、並列は電圧はそのまま・容量が足し算", steps: [series ? `直列：電圧 ${v}×${n}＝${v * n}〔V〕、容量は${ah}〔Ah〕のまま` : `並列：電圧は${v}〔V〕のまま、容量 ${ah}×${n}＝${ah * n}〔Ah〕`] };
  },
  // 分流器・倍率器
  meter(r) {
    const [ri, n] = pick(r, [[10, 11], [100, 101], [9, 10], [2, 5], [50, 51], [1, 5], [20, 21]]);
    if (r() < 0.5) {
      const rs = ri / (n - 1);
      return { q: `内部抵抗${ri}〔Ω〕の電流計の測定範囲を${n}倍にするための分流器の抵抗はいくらか。`, ...choices(r, rs, [ri * (n - 1), rs * 10, ri * n], u("Ω")),
        hint: "分流器（電流計に並列）Rs＝r／(n−1)", steps: [`Rs＝${ri}／(${n}−1)＝${ri}／${n - 1}＝${num(rs)}〔Ω〕`] };
    }
    const rm = ri * (n - 1);
    return { q: `内部抵抗${ri}〔kΩ〕の電圧計の測定範囲を${n}倍にするための倍率器の抵抗はいくらか。`, ...choices(r, rm, [ri / (n - 1), ri * n, ri / n], u("kΩ")),
      hint: "倍率器（電圧計に直列）Rm＝r(n−1)", steps: [`Rm＝${ri}×(${n}−1)＝${num(rm)}〔kΩ〕`] };
  },
};
// dB を 3dB・10dB の組に分けた説明（13dB → 10dB＋3dB＝10×2）
function dbSplit(db) {
  const tens = Math.floor(db / 10), rest = db - tens * 10;
  const parts = [];
  for (let i = 0; i < tens; i++) parts.push("10");
  if (rest === 3) parts.push("2");
  else if (rest === 6) parts.push("2", "2");
  else if (rest === 7) parts.push("5");
  else if (rest === 9) parts.push("2", "2", "2");
  return parts.length > 1 ? parts.join("×") : parts[0] || "1";
}

export function makeRadioCalc(type, seed) {
  const r = rngOf(seed);
  const g = GEN[type] || GEN.wave;
  const p = g(r);
  return { type, ...p };
}
