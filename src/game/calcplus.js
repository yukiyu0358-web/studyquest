// 計算強化：関数電卓（カシオ fx-JP500）で解く計算問題を、種類ごとに作る
// ・座標は測量の決まりどおり X＝北、Y＝東。方向角は北から右回り（電卓の Pol(ΔX, ΔY) の θ がそのまま方向角になる）
// ・問題は seed（数）から作るので、同じ seed なら同じ数字の問題になる（決まった問題集の周回に使う）
// ・答えには、解き方（steps）と fx-JP500 のキー操作（keys）を付ける。キーは "[SHIFT]" のように [ ] で囲む

export const CALC2_GROUPS = [
  { id: "coord", name: "座標・方向角・距離", types: ["pol", "rec"] },
  { id: "cross", name: "交点・内分点", types: ["cross", "divide", "online"] },
  { id: "area", name: "面積", types: ["areaCoord", "sansha", "heron", "trapezoid"] },
  { id: "tri", name: "三角形の辺と角", types: ["cosLaw", "sinLaw", "innerAngle", "dms"] },
  { id: "round", name: "建物・地積の端数処理", types: ["floor", "chiseki"] },
];
export const CALC2_TYPES = {
  pol: "距離と方向角（Pol）", rec: "放射・座標（Rec）",
  cross: "交点計算", divide: "内分点", online: "直線上の点（距離で）",
  areaCoord: "座標法の面積", sansha: "三斜法の面積", heron: "ヘロンの公式", trapezoid: "台形の面積",
  cosLaw: "余弦定理（辺）", sinLaw: "正弦定理（辺）", innerAngle: "内角（cos⁻¹）", dms: "度分秒⇔十進",
  floor: "床面積の端数処理", chiseki: "地積の端数処理",
};
export const CALC2_ALL = CALC2_GROUPS.flatMap((g) => g.types);
export const FIXED_PER_TYPE = 5; // 決まった問題集：種類ごとに5問

// 決まった数から同じ並びの乱数を作る
export function seededRng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
export const fixedSeed = (type, k) => hash(`${type}#${k}`);

const f2 = (v) => (Math.round(v * 100) / 100).toFixed(2);
const f3 = (v) => (Math.round(v * 1000) / 1000).toFixed(3);
const f6 = (v) => (Math.round(v * 1e6) / 1e6).toFixed(6);
const r3 = (v) => Math.round(v * 1000) / 1000;
const trunc = (v, d) => Math.floor(v * 10 ** d + 1e-7) / 10 ** d;
const norm360 = (d) => ((d % 360) + 360) % 360;
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
export function toDms(dg) { let s = Math.round(norm360(dg) * 3600); if (s >= 1296000) s -= 1296000; return { d: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }; }
export const dmsText = (o) => `${o.d}°${String(o.m).padStart(2, "0")}′${String(o.s).padStart(2, "0")}″`;
const dmsDeg = (o) => o.d + o.m / 60 + o.s / 3600;
const dmsKeys = (o) => [String(o.d), "[°'\"]", String(o.m), "[°'\"]", String(o.s), "[°'\"]"];
const num = (v) => (v < 0 ? ["[(-)]", String(Math.abs(v))] : [String(v)]); // マイナスの数は [(-)] キー

// 小さな部品
const POL = ["[SHIFT]", "[+]", "(Pol)"], REC = ["[SHIFT]", "[−]", "(Rec)"], COMMA = ["[SHIFT]", "[)]", "(,)"];
const pt = (name, X, Y, extra) => ({ name, X: r3(X), Y: r3(Y), ...(extra || {}) });

export function makeCalc2(type, seed) {
  const rng = seededRng(seed);
  const R = (a, b) => a + rng() * (b - a);
  const RI = (a, b) => Math.floor(R(a, b + 1));
  switch (type) {
    case "pol": {
      let A, B; do { A = pt("A", R(100, 500), R(100, 500)); B = pt("B", R(100, 500), R(100, 500)); } while (Math.hypot(B.X - A.X, B.Y - A.Y) < 20);
      const dX = B.X - A.X, dY = B.Y - A.Y, S = Math.hypot(dX, dY), th = deg(Math.atan2(dY, dX));
      return {
        type, pts: [A, B], lines: [["A", "B"]], arrow: true,
        ask: "点Aから点Bまでの距離 S（m・小数点以下3桁）と、方向角 θ（度分秒・秒は四捨五入）を求めてください。",
        fields: [{ key: "S", label: "距離 S", unit: "m", ans: r3(S), tol: 0.0015 }, { key: "t", label: "方向角 θ", kind: "dms", ans: toDms(th), tol: 1 }],
        steps: [`ΔX = ${f3(B.X)} − ${f3(A.X)} = ${f3(dX)}`, `ΔY = ${f3(B.Y)} − ${f3(A.Y)} = ${f3(dY)}`, `S = √(ΔX² + ΔY²) = ${f3(S)} m`, `θ = tan⁻¹(ΔY ÷ ΔX) を象限で直す → ${dmsText(toDms(th))}${th < 0 ? `（電卓では ${f6(th)}° と出るので、360°を足す）` : ""}`],
        keys: [
          { label: "Pol で距離と方向角をいっしょに出す", seq: [...POL, f3(B.X), "[−]", f3(A.X), ...COMMA, f3(B.Y), "[−]", f3(A.Y), "[)]", "[=]"], out: `r = ${f3(S)}　θ = ${f6(th)}` },
          ...(th < 0 ? [{ label: "θ がマイナスなので 360 を足す", seq: [...num(Number(f6(th))), "[+]", "360", "[=]"], out: f6(th + 360) }] : []),
          { label: "θ を度分秒にする", seq: [f6(norm360(th)), "[=]", "[°'\"]"], out: dmsText(toDms(th)) },
        ],
      };
    }
    case "rec": {
      const A = pt("A", R(100, 500), R(100, 500));
      const o = { d: RI(0, 359), m: RI(0, 59), s: RI(0, 59) }, th = dmsDeg(o), S = r3(R(15, 120));
      const dX = S * Math.cos(rad(th)), dY = S * Math.sin(rad(th));
      const P = pt("P", A.X + dX, A.Y + dY, { unknown: true });
      return {
        type, pts: [A, P], lines: [["A", "P"]], arrow: true,
        given: [`方向角 θ（A→P） = ${dmsText(o)}`, `距離 S（A〜P） = ${f3(S)} m`],
        ask: "点Pの座標 X・Y を求めてください（m・小数点以下3桁）。",
        fields: [{ key: "X", label: "X", unit: "m", ans: P.X, tol: 0.0015 }, { key: "Y", label: "Y", unit: "m", ans: P.Y, tol: 0.0015 }],
        steps: [`ΔX = S × cos θ = ${f3(dX)}`, `ΔY = S × sin θ = ${f3(dY)}`, `X = ${f3(A.X)} + (${f3(dX)}) = ${f3(P.X)}`, `Y = ${f3(A.Y)} + (${f3(dY)}) = ${f3(P.Y)}`],
        keys: [
          { label: "Rec で ΔX・ΔY を出す（角度は度分秒のまま入れる）", seq: [...REC, f3(S), ...COMMA, ...dmsKeys(o), "[)]", "[=]"], out: `x = ${f6(dX)}　y = ${f6(dY)}` },
          { label: "Aの座標に足す（X）", seq: [f3(A.X), "[+]", ...num(r3(dX)), "[=]"], out: f3(P.X) },
          { label: "Aの座標に足す（Y）", seq: [f3(A.Y), "[+]", ...num(r3(dY)), "[=]"], out: f3(P.Y) },
        ],
      };
    }
    case "cross": {
      // 直線 A→B と 直線 C→D の交点P
      let A, B, C, D, s, a1, a2, sn;
      do {
        A = pt("A", R(100, 200), R(100, 200)); B = pt("B", R(250, 350), R(250, 350));
        C = pt("C", R(250, 350), R(100, 200)); D = pt("D", R(100, 200), R(250, 350));
        a1 = Math.atan2(B.Y - A.Y, B.X - A.X); a2 = Math.atan2(D.Y - C.Y, D.X - C.X); sn = Math.sin(a2 - a1);
        s = ((C.X - A.X) * Math.sin(a2) - (C.Y - A.Y) * Math.cos(a2)) / sn;
      } while (Math.abs(sn) < 0.3);
      const P = pt("P", A.X + s * Math.cos(a1), A.Y + s * Math.sin(a1), { unknown: true });
      const d1 = deg(a1), d2 = deg(a2);
      return {
        type, pts: [A, B, C, D, P], lines: [["A", "B"], ["C", "D"]],
        ask: "直線ABと直線CDの交点Pの座標 X・Y を求めてください（m・小数点以下3桁）。",
        fields: [{ key: "X", label: "X", unit: "m", ans: P.X, tol: 0.002 }, { key: "Y", label: "Y", unit: "m", ans: P.Y, tol: 0.002 }],
        steps: [`α₁（A→B の方向角）= ${f6(d1)}°`, `α₂（C→D の方向角）= ${f6(d2)}°`, `A→P の距離 s = {(XC − XA)·sin α₂ − (YC − YA)·cos α₂} ÷ sin(α₂ − α₁) = ${f3(s)}`, `P = A ＋ (s・cos α₁, s・sin α₁) = (${f3(P.X)}, ${f3(P.Y)})`],
        keys: [
          { label: "α₁：Pol(XB−XA, YB−YA) の θ", seq: [...POL, f3(B.X), "[−]", f3(A.X), ...COMMA, f3(B.Y), "[−]", f3(A.Y), "[)]", "[=]"], out: `θ = ${f6(d1)}` },
          { label: "α₂：Pol(XD−XC, YD−YC) の θ", seq: [...POL, f3(D.X), "[−]", f3(C.X), ...COMMA, f3(D.Y), "[−]", f3(C.Y), "[)]", "[=]"], out: `θ = ${f6(d2)}` },
          { label: "A→P の距離 s", seq: ["[(]", ...num(r3(C.X - A.X)), "[×]", "[sin]", f6(d2), "[)]", "[−]", ...num(r3(C.Y - A.Y)), "[×]", "[cos]", f6(d2), "[)]", "[)]", "[÷]", "[sin]", f6(d2), "[−]", ...num(Number(f6(d1))), "[)]", "[=]"], out: f6(s) },
          { label: "Rec(s, α₁) で ΔX・ΔY → Aに足す", seq: [...REC, f6(s), ...COMMA, ...num(Number(f6(d1))), "[)]", "[=]"], out: `x = ${f6(P.X - A.X)}　y = ${f6(P.Y - A.Y)}` },
        ],
      };
    }
    case "divide": {
      const A = pt("A", R(100, 400), R(100, 400)), B = pt("B", R(100, 400), R(100, 400));
      const m = RI(1, 4), n = RI(1, 4) + (m === 1 ? 1 : 0);
      const P = pt("P", (n * A.X + m * B.X) / (m + n), (n * A.Y + m * B.Y) / (m + n), { unknown: true });
      const expr = (a, b) => ["[(]", String(n), "[×]", f3(a), "[+]", String(m), "[×]", f3(b), "[)]", "[÷]", "[(]", String(m), "[+]", String(n), "[)]", "[=]"];
      return {
        type, pts: [A, P, B], lines: [["A", "B"]],
        ask: `線分ABを ${m}：${n} に内分する点Pの座標 X・Y を求めてください（m・小数点以下3桁）。`,
        fields: [{ key: "X", label: "X", unit: "m", ans: P.X, tol: 0.0015 }, { key: "Y", label: "Y", unit: "m", ans: P.Y, tol: 0.0015 }],
        steps: [`X = (n·XA + m·XB) ÷ (m + n) = (${n}×${f3(A.X)} + ${m}×${f3(B.X)}) ÷ ${m + n} = ${f3(P.X)}`, `Y = (n·YA + m·YB) ÷ (m + n) = (${n}×${f3(A.Y)} + ${m}×${f3(B.Y)}) ÷ ${m + n} = ${f3(P.Y)}`],
        keys: [{ label: "X", seq: expr(A.X, B.X), out: f3(P.X) }, { label: "Y", seq: expr(A.Y, B.Y), out: f3(P.Y) }],
      };
    }
    case "online": {
      let A, B; do { A = pt("A", R(100, 400), R(100, 400)); B = pt("B", R(100, 400), R(100, 400)); } while (Math.hypot(B.X - A.X, B.Y - A.Y) < 40);
      const L = Math.hypot(B.X - A.X, B.Y - A.Y), d = r3(R(8, L - 8)), th = Math.atan2(B.Y - A.Y, B.X - A.X);
      const P = pt("P", A.X + d * Math.cos(th), A.Y + d * Math.sin(th), { unknown: true });
      return {
        type, pts: [A, P, B], lines: [["A", "B"]], arrow: true,
        ask: `直線AB上で、点Aから ${f3(d)} m の点Pの座標 X・Y を求めてください（m・小数点以下3桁）。`,
        fields: [{ key: "X", label: "X", unit: "m", ans: P.X, tol: 0.0015 }, { key: "Y", label: "Y", unit: "m", ans: P.Y, tol: 0.0015 }],
        steps: [`A→B の方向角 θ = ${f6(deg(th))}°`, `ΔX = ${f3(d)} × cos θ、ΔY = ${f3(d)} × sin θ`, `P = (${f3(P.X)}, ${f3(P.Y)})`],
        keys: [
          { label: "Pol で A→B の方向角 θ", seq: [...POL, f3(B.X), "[−]", f3(A.X), ...COMMA, f3(B.Y), "[−]", f3(A.Y), "[)]", "[=]"], out: `θ = ${f6(deg(th))}` },
          { label: "Rec(d, θ) → Aに足す", seq: [...REC, f3(d), ...COMMA, ...num(Number(f6(deg(th)))), "[)]", "[=]"], out: `x = ${f6(P.X - A.X)}　y = ${f6(P.Y - A.Y)}` },
        ],
      };
    }
    case "areaCoord": {
      const n = rng() < 0.6 ? 4 : 5, cx = R(150, 350), cy = R(150, 350);
      const angs = Array.from({ length: n }, (_, i) => (i / n) * 360 + R(-20, 20)).sort((a, b) => a - b);
      const pts = angs.map((a, i) => pt(String.fromCharCode(65 + i), cx + R(15, 40) * Math.cos(rad(a)), cy + R(15, 40) * Math.sin(rad(a))));
      const terms = pts.map((p, i) => { const nx = pts[(i + 1) % n], pv = pts[(i - 1 + n) % n]; return { p, nx, pv, v: p.X * (nx.Y - pv.Y) }; });
      const dbl = terms.reduce((a, t) => a + t.v, 0), area = Math.abs(dbl) / 2;
      const seq = []; terms.forEach((t, i) => { if (i) seq.push("[+]"); seq.push(f3(t.p.X), "[×]", "[(]", f3(t.nx.Y), "[−]", f3(t.pv.Y), "[)]"); }); seq.push("[=]");
      return {
        type, pts, poly: pts.map((p) => p.name),
        ask: "座標法で、この土地の面積（㎡・小数点以下2桁未満切り捨て）を求めてください。",
        fields: [{ key: "A", label: "面積", unit: "㎡", ans: trunc(area, 2), tol: 0.005 }],
        steps: ["倍面積 ＝ Σ Xₙ ×（Yₙ₊₁ − Yₙ₋₁）", ...terms.map((t) => `${t.p.name}：${f3(t.p.X)} × (${f3(t.nx.Y)} − ${f3(t.pv.Y)}) = ${f3(t.v)}`), `倍面積 = ${f3(dbl)}`, `面積 = |倍面積| ÷ 2 = ${f6(area)} → ${f2(trunc(area, 2))} ㎡（切り捨て）`],
        keys: [{ label: "倍面積（全部の項を続けて入力）", seq, out: f6(dbl) }, { label: "2で割る", seq: ["[Ans]", "[÷]", "2", "[=]"], out: f6(dbl / 2) }],
      };
    }
    case "sansha": {
      const b = r3(R(20, 45)), h1 = r3(R(8, 20)), h2 = r3(R(8, 20)), area = (b * (h1 + h2)) / 2;
      return {
        type, pts: [], given: [`対角線（底辺）b = ${f3(b)} m`, `高さ h₁ = ${f3(h1)} m、h₂ = ${f3(h2)} m`],
        ask: "四角形の土地を対角線で2つの三角形に分けました。三斜法で面積（㎡・小数点以下2桁未満切り捨て）を求めてください。",
        fields: [{ key: "A", label: "面積", unit: "㎡", ans: trunc(area, 2), tol: 0.005 }],
        steps: ["面積 ＝ 底辺 ×（高さ₁ ＋ 高さ₂）÷ 2", `= ${f3(b)} × (${f3(h1)} + ${f3(h2)}) ÷ 2 = ${f6(area)}`, `→ ${f2(trunc(area, 2))} ㎡（切り捨て）`],
        keys: [{ label: "そのまま計算", seq: [f3(b), "[×]", "[(]", f3(h1), "[+]", f3(h2), "[)]", "[÷]", "2", "[=]"], out: f6(area) }],
      };
    }
    case "heron": {
      let a, b, c; do { a = r3(R(15, 50)); b = r3(R(15, 50)); c = r3(R(15, 50)); } while (a + b <= c * 1.1 || b + c <= a * 1.1 || a + c <= b * 1.1);
      const s = (a + b + c) / 2, area = Math.sqrt(s * (s - a) * (s - b) * (s - c));
      return {
        type, pts: [], given: [`3辺 a = ${f3(a)} m、b = ${f3(b)} m、c = ${f3(c)} m`],
        ask: "ヘロンの公式で、三角形の面積（㎡・小数点以下2桁未満切り捨て）を求めてください。",
        fields: [{ key: "A", label: "面積", unit: "㎡", ans: trunc(area, 2), tol: 0.005 }],
        steps: [`s = (a + b + c) ÷ 2 = ${f6(s)}`, `面積 = √{s(s − a)(s − b)(s − c)} = ${f6(area)}`, `→ ${f2(trunc(area, 2))} ㎡（切り捨て）`],
        keys: [
          { label: "s を出す", seq: ["[(]", f3(a), "[+]", f3(b), "[+]", f3(c), "[)]", "[÷]", "2", "[=]"], out: f6(s) },
          { label: "√ の中を続けて計算（s は Ans で使える）", seq: ["[√]", "[Ans]", "[×]", "[(]", "[Ans]", "[−]", f3(a), "[)]", "[×]", "[(]", "[Ans]", "[−]", f3(b), "[)]", "[×]", "[(]", "[Ans]", "[−]", f3(c), "[)]", "[=]"], out: f6(area), note: "Ans は s を出した直後だけ使えます。うまくいかないときは s の値を直接入れてください" },
        ],
      };
    }
    case "trapezoid": {
      const a = r3(R(8, 25)), b = r3(R(15, 40)), h = r3(R(8, 30)), area = ((a + b) * h) / 2;
      return {
        type, pts: [], given: [`上底 a = ${f3(a)} m、下底 b = ${f3(b)} m、高さ h = ${f3(h)} m`],
        ask: "台形の土地の面積（㎡・小数点以下2桁未満切り捨て）を求めてください。",
        fields: [{ key: "A", label: "面積", unit: "㎡", ans: trunc(area, 2), tol: 0.005 }],
        steps: [`面積 = (a + b) × h ÷ 2 = ${f6(area)}`, `→ ${f2(trunc(area, 2))} ㎡（切り捨て）`],
        keys: [{ label: "そのまま計算", seq: ["[(]", f3(a), "[+]", f3(b), "[)]", "[×]", f3(h), "[÷]", "2", "[=]"], out: f6(area) }],
      };
    }
    case "cosLaw": {
      const b = r3(R(15, 50)), c = r3(R(15, 50)), o = { d: RI(30, 150), m: RI(0, 59), s: RI(0, 59) };
      const a = Math.sqrt(b * b + c * c - 2 * b * c * Math.cos(rad(dmsDeg(o))));
      return {
        type, pts: [], given: [`辺 b = ${f3(b)} m、辺 c = ${f3(c)} m`, `bとcの間の角 A = ${dmsText(o)}`],
        ask: "余弦定理で、角Aの向かいの辺 a（m・小数点以下3桁）を求めてください。",
        fields: [{ key: "a", label: "辺 a", unit: "m", ans: r3(a), tol: 0.0015 }],
        steps: [`a = √(b² + c² − 2bc・cos A) = √(${f3(b)}² + ${f3(c)}² − 2 × ${f3(b)} × ${f3(c)} × cos ${dmsText(o)}) = ${f3(a)} m`],
        keys: [{ label: "角は度分秒のまま入れる", seq: ["[√]", f3(b), "[x²]", "[+]", f3(c), "[x²]", "[−]", "2", "[×]", f3(b), "[×]", f3(c), "[×]", "[cos]", ...dmsKeys(o), "[)]", "[)]", "[=]"], out: f6(a) }],
      };
    }
    case "sinLaw": {
      const A = { d: RI(30, 80), m: RI(0, 59), s: RI(0, 59) }, B = { d: RI(30, 80), m: RI(0, 59), s: RI(0, 59) }, a = r3(R(15, 50));
      const b = (a * Math.sin(rad(dmsDeg(B)))) / Math.sin(rad(dmsDeg(A)));
      return {
        type, pts: [], given: [`辺 a = ${f3(a)} m（角Aの向かい）`, `角 A = ${dmsText(A)}、角 B = ${dmsText(B)}`],
        ask: "正弦定理で、角Bの向かいの辺 b（m・小数点以下3桁）を求めてください。",
        fields: [{ key: "b", label: "辺 b", unit: "m", ans: r3(b), tol: 0.0015 }],
        steps: [`a ÷ sin A ＝ b ÷ sin B より、b = a × sin B ÷ sin A = ${f3(b)} m`],
        keys: [{ label: "そのまま計算", seq: [f3(a), "[×]", "[sin]", ...dmsKeys(B), "[)]", "[÷]", "[sin]", ...dmsKeys(A), "[)]", "[=]"], out: f6(b) }],
      };
    }
    case "innerAngle": {
      let a, b, c; do { a = r3(R(15, 50)); b = r3(R(15, 50)); c = r3(R(15, 50)); } while (a + b <= c * 1.1 || b + c <= a * 1.1 || a + c <= b * 1.1);
      const cosA = (b * b + c * c - a * a) / (2 * b * c), A = deg(Math.acos(cosA));
      return {
        type, pts: [], given: [`3辺 a = ${f3(a)} m、b = ${f3(b)} m、c = ${f3(c)} m（a は角Aの向かい）`],
        ask: "角 A の大きさ（度分秒・秒は四捨五入）を求めてください。",
        fields: [{ key: "A", label: "角 A", kind: "dms", ans: toDms(A), tol: 1 }],
        steps: [`cos A = (b² + c² − a²) ÷ 2bc = ${f6(cosA)}`, `A = cos⁻¹(${f6(cosA)}) = ${f6(A)}° = ${dmsText(toDms(A))}`],
        keys: [{ label: "cos⁻¹ は [SHIFT] [cos]", seq: ["[SHIFT]", "[cos]", "(cos⁻¹)", "[(]", f3(b), "[x²]", "[+]", f3(c), "[x²]", "[−]", f3(a), "[x²]", "[)]", "[÷]", "[(]", "2", "[×]", f3(b), "[×]", f3(c), "[)]", "[)]", "[=]", "[°'\"]"], out: dmsText(toDms(A)) }],
      };
    }
    case "dms": {
      if (rng() < 0.5) {
        const v = Math.round(R(1, 359) * 1e6) / 1e6, o = toDms(v);
        return { type, pts: [], given: [`十進の角度 ${f6(v)}°`], ask: "この角度を度分秒（秒は四捨五入）にしてください。", fields: [{ key: "d", label: "角度", kind: "dms", ans: o, tol: 1 }], steps: [`分 = 小数部 × 60、秒 = その小数部 × 60 → ${dmsText(o)}`], keys: [{ label: "入れて [=] のあと [°'\"]", seq: [f6(v), "[=]", "[°'\"]"], out: dmsText(o) }] };
      }
      const o = { d: RI(1, 359), m: RI(0, 59), s: RI(0, 59) }, v = dmsDeg(o);
      return { type, pts: [], given: [`度分秒の角度 ${dmsText(o)}`], ask: "この角度を十進（度・小数点以下6桁）にしてください。", fields: [{ key: "v", label: "角度", unit: "°", ans: Math.round(v * 1e6) / 1e6, tol: 0.0000015 }], steps: [`度 ＋ 分 ÷ 60 ＋ 秒 ÷ 3600 = ${f6(v)}°`], keys: [{ label: "度分秒で入れて [=]、もう一度 [°'\"] で十進に", seq: [...dmsKeys(o), "[=]", "[°'\"]"], out: f6(v) }] };
    }
    case "floor": {
      const k = rng() < 0.5 ? 2 : 3;
      const rects = Array.from({ length: k }, () => [Math.round(R(2, 12) * 100) / 100, Math.round(R(2, 9) * 100) / 100]);
      const sum = rects.reduce((a, [w, h]) => a + w * h, 0);
      const seq = []; rects.forEach(([w, h], i) => { if (i) seq.push("[+]"); seq.push(f2(w), "[×]", f2(h)); }); seq.push("[=]");
      return {
        type, pts: [], given: [`1階の床を、壁の中心線で ${k} つの長方形に分けました：`, ...rects.map(([w, h], i) => `　${i + 1}：${f2(w)} m × ${f2(h)} m`)],
        ask: "この階の床面積（㎡）を、不動産登記規則の端数処理どおりに求めてください。",
        fields: [{ key: "A", label: "床面積", unit: "㎡", ans: trunc(sum, 2), tol: 0.005 }],
        steps: [...rects.map(([w, h], i) => `${i + 1}：${f2(w)} × ${f2(h)} = ${(w * h).toFixed(4)}`), `合計 = ${sum.toFixed(4)}`, `床面積は 1㎡の100分の1未満を切り捨て（規則115条）→ ${f2(trunc(sum, 2))} ㎡`],
        keys: [{ label: "まとめて計算して、小数点以下2桁より下を切り捨てる", seq, out: sum.toFixed(4) }],
      };
    }
    case "chiseki": {
      const kinds = [["宅地", true], ["鉱泉地", true], ["田", false], ["畑", false], ["山林", false], ["雑種地", false], ["公衆用道路", false]];
      const [kind, small] = kinds[RI(0, kinds.length - 1)];
      const raw = rng() < 0.15 ? R(3, 10) : R(60, 900), raw4 = Math.round(raw * 10000) / 10000;
      const ans = small || raw4 <= 10 ? trunc(raw4, 2) : Math.floor(raw4 + 1e-9);
      return {
        type, pts: [], given: [`地目：${kind}`, `座標法で求めた面積：${raw4.toFixed(4)} ㎡`],
        ask: "登記する地積（㎡）を、不動産登記規則の端数処理どおりに答えてください。",
        fields: [{ key: "A", label: "地積", unit: "㎡", ans, tol: 0.005 }],
        steps: ["地積は 1㎡の100分の1未満を切り捨て。ただし宅地・鉱泉地以外の土地で10㎡を超えるものは、1㎡未満を切り捨て（規則100条）", `${kind}・${raw4.toFixed(4)}㎡ → ${small || raw4 <= 10 ? f2(ans) : ans} ㎡`],
        keys: [],
      };
    }
    default: return null;
  }
}

// 答え合わせ：数は誤差 tol 以内、度分秒は秒の差 tol 以内（360°をまたいでもよい）
export function checkCalc2(field, v) {
  if (field.kind === "dms") {
    const s = (o) => Number(o.d || 0) * 3600 + Number(o.m || 0) * 60 + Number(o.s || 0);
    if (!v || v.d === "" || v.d == null) return false;
    let d = Math.abs(s(v) - s(field.ans)); d = Math.min(d, 1296000 - d);
    return d <= field.tol;
  }
  const x = Number(String(v || "").replace(/,/g, "").trim());
  return String(v || "").trim() !== "" && Number.isFinite(x) && Math.abs(x - field.ans) <= field.tol;
}
export const fieldAnsText = (f) => (f.kind === "dms" ? dmsText(f.ans) : `${f.ans}${f.unit ? ` ${f.unit}` : ""}`);
