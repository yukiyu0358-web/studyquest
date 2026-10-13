// 計算ドリル：土地家屋調査士の記述式で使う計算（座標）を、数字を変えて何問でも作る
// 座標は測量の決まりどおり X＝北（上）、Y＝東（右）。方向角は X軸（北）から右回り。

export const CALC_TYPES = [
  { id: "dist", name: "2点間の距離", short: "距離", desc: "2点の座標から距離を求める" },
  { id: "angle", name: "方向角", short: "方向角", desc: "2点の座標から方向角（度分秒）を求める" },
  { id: "radial", name: "放射計算", short: "放射", desc: "方向角と距離から、点の座標を求める" },
  { id: "area", name: "座標法の面積", short: "面積", desc: "多角形の頂点の座標から面積を求める" },
  { id: "cross", name: "交点計算", short: "交点", desc: "2本の直線が交わる点の座標を求める" },
];

const rnd = (a, b) => a + Math.random() * (b - a);
const r2 = (v) => Math.round(v * 100) / 100;
const f2 = (v) => (Math.round(v * 100) / 100).toFixed(2);
const f3 = (v) => (Math.round(v * 1000) / 1000).toFixed(3);
const trunc2 = (v) => Math.floor(v * 100 + 1e-7) / 100;
const pt = (name, X, Y) => ({ name, X: r2(X), Y: r2(Y) });
const norm360 = (d) => ((d % 360) + 360) % 360;
const toRad = (d) => (d * Math.PI) / 180;

// 角度（度）⇔ 度分秒
export function toDms(deg) {
  let s = Math.round(norm360(deg) * 3600);
  if (s >= 360 * 3600) s -= 360 * 3600;
  return { d: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}
export const dmsText = (o) => `${o.d}°${String(o.m).padStart(2, "0")}′${String(o.s).padStart(2, "0")}″`;
const dmsToDeg = (o) => o.d + o.m / 60 + o.s / 3600;

// 問題を1つ作る：{ type, pts, lines, poly, ask, fields:[{key,label,unit,ans,tol,kind}], steps:[説明] }
export function makeCalcProblem(type) {
  const ids = CALC_TYPES.map((t) => t.id);
  if (!ids.includes(type)) type = ids[Math.floor(Math.random() * ids.length)];

  if (type === "dist" || type === "angle") {
    let A, B, dX, dY, S;
    do { A = pt("A", rnd(100, 300), rnd(100, 300)); B = pt("B", rnd(100, 300), rnd(100, 300)); dX = B.X - A.X; dY = B.Y - A.Y; S = Math.hypot(dX, dY); } while (S < 15);
    const steps = [`ΔX = ${f2(B.X)} − ${f2(A.X)} = ${f2(dX)}`, `ΔY = ${f2(B.Y)} − ${f2(A.Y)} = ${f2(dY)}`];
    if (type === "dist") {
      steps.push(`S = √(ΔX² + ΔY²) = √(${f2(dX)}² + ${f2(dY)}²) = ${f3(S)}`);
      steps.push(`小数点以下2桁にして S = ${f2(S)} m`);
      return { type, pts: [A, B], lines: [["A", "B"]], ask: "点Aから点Bまでの距離 S を求めてください（m、小数点以下2桁・四捨五入）。", fields: [{ key: "S", label: "距離 S", unit: "m", ans: r2(S), tol: 0.011 }], steps };
    }
    const th = norm360((Math.atan2(dY, dX) * 180) / Math.PI);
    const base = (Math.atan(Math.abs(dY / dX)) * 180) / Math.PI;
    const q = dX >= 0 ? (dY >= 0 ? "第1象限（ΔX＋・ΔY＋）：θ ＝ α" : "第4象限（ΔX＋・ΔY−）：θ ＝ 360° − α") : (dY >= 0 ? "第2象限（ΔX−・ΔY＋）：θ ＝ 180° − α" : "第3象限（ΔX−・ΔY−）：θ ＝ 180° ＋ α");
    steps.push(`α = tan⁻¹(|ΔY ÷ ΔX|) = tan⁻¹(${(Math.abs(dY / dX)).toFixed(6)}) = ${dmsText(toDms(base))}`);
    steps.push(q);
    steps.push(`方向角 θ = ${dmsText(toDms(th))}`);
    const o = toDms(th);
    return { type, pts: [A, B], lines: [["A", "B"]], arrow: true, ask: "点Aから点Bへの方向角 θ を求めてください（度・分・秒、秒は四捨五入）。", fields: [{ key: "dms", label: "方向角 θ", kind: "dms", ans: o, tol: 2 }], steps };
  }

  if (type === "radial") {
    const A = pt("A", rnd(100, 300), rnd(100, 300));
    const o = { d: Math.floor(rnd(0, 360)), m: Math.floor(rnd(0, 60)), s: Math.floor(rnd(0, 60)) };
    const th = dmsToDeg(o);
    const S = r2(rnd(15, 80));
    const dX = S * Math.cos(toRad(th)), dY = S * Math.sin(toRad(th));
    const P = { name: "P", X: A.X + dX, Y: A.Y + dY };
    return {
      type, pts: [A, { ...P, X: r2(P.X), Y: r2(P.Y), unknown: true }], lines: [["A", "P"]], arrow: true,
      given: [`方向角 θ（A→P） = ${dmsText(o)}`, `距離 S（A〜P） = ${f2(S)} m`],
      ask: "点Pの座標（X・Y）を求めてください（m、小数点以下2桁・四捨五入）。",
      fields: [{ key: "X", label: "X", unit: "m", ans: r2(P.X), tol: 0.011 }, { key: "Y", label: "Y", unit: "m", ans: r2(P.Y), tol: 0.011 }],
      steps: [`ΔX = S × cos θ = ${f2(S)} × ${Math.cos(toRad(th)).toFixed(6)} = ${f3(dX)}`, `ΔY = S × sin θ = ${f2(S)} × ${Math.sin(toRad(th)).toFixed(6)} = ${f3(dY)}`, `X = ${f2(A.X)} + (${f3(dX)}) = ${f2(P.X)}`, `Y = ${f2(A.Y)} + (${f3(dY)}) = ${f2(P.Y)}`],
    };
  }

  if (type === "area") {
    const n = Math.random() < 0.6 ? 4 : 5;
    const cx = rnd(150, 250), cy = rnd(150, 250);
    const angs = Array.from({ length: n }, (_, i) => (i / n) * 360 + rnd(-360 / n / 3, 360 / n / 3)).sort((a, b) => a - b);
    const pts = angs.map((a, i) => pt(String.fromCharCode(65 + i), cx + rnd(12, 30) * Math.cos(toRad(a)), cy + rnd(12, 30) * Math.sin(toRad(a))));
    const rows = pts.map((p, i) => { const prev = pts[(i - 1 + n) % n], next = pts[(i + 1) % n]; return { p, d: next.Y - prev.Y, v: p.X * (next.Y - prev.Y) }; });
    const dbl = rows.reduce((a, r) => a + r.v, 0);
    const A = Math.abs(dbl) / 2;
    const steps = [
      "倍面積 ＝ Σ Xₙ ×（Yₙ₊₁ − Yₙ₋₁）",
      ...rows.map((r) => `${r.p.name}：${f2(r.p.X)} × (${f2(r.d)}) = ${f3(r.v)}`),
      `倍面積 = ${f3(dbl)}${dbl < 0 ? "（マイナスは向きの違いなので、大きさだけ使う）" : ""}`,
      `面積 = ${f3(Math.abs(dbl))} ÷ 2 = ${f3(A)}`,
      `小数点以下2桁まで（3桁目以下は切り捨て）：${trunc2(A).toFixed(2)} ㎡`,
    ];
    return { type, pts, poly: true, ask: `${pts.map((p) => p.name).join("・")}を結んだ土地の面積を、座標法で求めてください（㎡、小数点以下2桁・3桁目以下は切り捨て）。`, fields: [{ key: "A", label: "面積", unit: "㎡", ans: trunc2(A), tol: 0.011 }], steps };
  }

  // 交点計算：直線AB と 直線CD の交点P
  let A, B, C, D, P, m1, m2;
  for (;;) {
    const Px = rnd(150, 250), Py = rnd(150, 250);
    const t1 = rnd(10, 80) + (Math.random() < 0.5 ? 0 : 180);
    let t2 = t1 + rnd(40, 140);
    const at = (t, s) => [Px + s * Math.cos(toRad(t)), Py + s * Math.sin(toRad(t))];
    const a = at(t1, -rnd(15, 40)), b = at(t1, rnd(15, 40)), c = at(t2, -rnd(15, 40)), d = at(t2, rnd(15, 40));
    A = pt("A", ...a); B = pt("B", ...b); C = pt("C", ...c); D = pt("D", ...d);
    if (Math.abs(B.X - A.X) < 3 || Math.abs(D.X - C.X) < 3) continue;
    m1 = (B.Y - A.Y) / (B.X - A.X); m2 = (D.Y - C.Y) / (D.X - C.X);
    if (Math.abs(m1 - m2) < 0.2) continue;
    const X = (C.Y - A.Y + m1 * A.X - m2 * C.X) / (m1 - m2);
    P = { name: "P", X, Y: A.Y + m1 * (X - A.X) };
    break;
  }
  return {
    type, pts: [A, B, C, D, { ...P, X: r2(P.X), Y: r2(P.Y), unknown: true }], lines: [["A", "B"], ["C", "D"]],
    ask: "直線ABと直線CDが交わる点Pの座標（X・Y）を求めてください（m、小数点以下2桁・四捨五入）。",
    fields: [{ key: "X", label: "X", unit: "m", ans: r2(P.X), tol: 0.011 }, { key: "Y", label: "Y", unit: "m", ans: r2(P.Y), tol: 0.011 }],
    steps: [
      `ABの傾き m₁ = (Y_B − Y_A) ÷ (X_B − X_A) = ${f2(B.Y - A.Y)} ÷ ${f2(B.X - A.X)} = ${m1.toFixed(6)}`,
      `CDの傾き m₂ = (Y_D − Y_C) ÷ (X_D − X_C) = ${f2(D.Y - C.Y)} ÷ ${f2(D.X - C.X)} = ${m2.toFixed(6)}`,
      "X = (Y_C − Y_A + m₁·X_A − m₂·X_C) ÷ (m₁ − m₂)",
      `X = ${f3(P.X)} → ${f2(P.X)}`,
      `Y = Y_A + m₁ × (X − X_A) = ${f3(P.Y)} → ${f2(P.Y)}`,
    ],
  };
}

// 答え合わせ：入力 { key: 文字列 or {d,m,s} } → { ok, each:{key:true/false} }
export function checkCalc(prob, input) {
  const each = {};
  prob.fields.forEach((f) => {
    const v = input[f.key];
    if (f.kind === "dms") {
      const d = Number(v && v.d), m = Number(v && v.m), s = Number(v && v.s);
      if (![d, m, s].every((n) => Number.isFinite(n)) || v.d === "" || v.m === "" || v.s === "") { each[f.key] = false; return; }
      let diff = Math.abs((d * 3600 + m * 60 + s) - (f.ans.d * 3600 + f.ans.m * 60 + f.ans.s));
      diff = Math.min(diff, 360 * 3600 - diff);
      each[f.key] = diff <= f.tol;
    } else {
      const n = Number(String(v || "").replace(/[，,]/g, "").replace(/[－−]/g, "-").trim());
      each[f.key] = String(v || "").trim() !== "" && Number.isFinite(n) && Math.abs(n - f.ans) <= f.tol;
    }
  });
  return { ok: prob.fields.every((f) => each[f.key]), each };
}

export const calcAnsText = (f) => (f.kind === "dms" ? dmsText(f.ans) : `${f.ans.toFixed(2)} ${f.unit || ""}`);
