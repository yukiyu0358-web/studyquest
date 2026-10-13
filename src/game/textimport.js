// 貼り付けた文章を、一問一答（問題と答え）に分ける
// iPhone の「テキスト認識表示」や Windows の Snipping Tool で写真から文字をコピーして貼り付ける使い方を想定
// mode: "auto"（自動）| "pair"（1行目が問題・次の行が答え、をくり返す）| "line"（1行に「問題 → 答え」）

export const TEXT_IMPORT_MODES = [
  { id: "auto", name: "自動で分ける" },
  { id: "pair", name: "問題・答えが交互の行" },
  { id: "line", name: "1行に問題と答え" },
];

const NUM_HEAD = /^(?:問題?\s*\d+|第?\s*\d+\s*問|\d+\s*[.．。)）、:：]|[(（]\s*\d+\s*[)）]|[①-⑳]|Q\s*\d*[.．:：]?)\s*/i;
const ANS_HEAD = /^(?:答え?|解答|正解|解説|A\s*\d*)\s*[.．:：、)）]?\s*/i;
const OX_TAIL = /\s*[（(【\[［]\s*([○〇◯×✕✖])\s*[）)】\]］]\s*$/;
const LINE_SEP = /\s*(?:\t|→|⇒|＝>|=>|／|\s\/\s|｜|\|)\s*/;

const clean = (s) => String(s || "").replace(/\s+/g, " ").trim();
const stripNum = (s) => clean(s).replace(NUM_HEAD, "").trim();

export function parseQuickText(text, mode = "auto") {
  const lines = String(text || "").split(/\r?\n/).map((l) => l.replace(/　/g, " ").trim()).filter(Boolean);
  if (!lines.length) return [];
  const out = [];
  const push = (q, a) => { q = stripNum(q); a = clean(a); if (q && a) out.push({ q, a }); };

  if (mode === "line" || (mode === "auto" && lines.filter((l) => LINE_SEP.test(l)).length >= Math.max(2, lines.length * 0.6))) {
    lines.forEach((l) => { const m = l.split(LINE_SEP); if (m.length >= 2) push(m[0], m.slice(1).join(" ")); });
    return out;
  }
  if (mode === "pair") {
    for (let i = 0; i + 1 < lines.length; i += 2) push(lines[i], lines[i + 1].replace(ANS_HEAD, ""));
    return out;
  }
  // 自動：①「答」で始まる行 ②行末の（○）（×）③番号で始まる行 を手がかりにする
  const hasAns = lines.some((l) => ANS_HEAD.test(l) && !NUM_HEAD.test(l));
  const hasOx = lines.some((l) => OX_TAIL.test(l));
  const hasNum = lines.filter((l) => NUM_HEAD.test(l)).length >= 2;
  if (hasAns || hasOx) {
    let q = [], a = null;
    const flush = () => { if (q.length && a !== null) push(q.join(""), a.join(" ")); q = []; a = null; };
    lines.forEach((l) => {
      const isNum = NUM_HEAD.test(l);
      if (a !== null && (isNum || (!ANS_HEAD.test(l) && hasNum === false && OX_TAIL.test(l)))) flush();
      if (a === null && OX_TAIL.test(l)) {
        const m = l.match(OX_TAIL);
        q.push(l.replace(OX_TAIL, ""));
        a = [m[1] === "〇" || m[1] === "◯" ? "○" : m[1] === "✕" || m[1] === "✖" ? "×" : m[1]];
        return;
      }
      if (ANS_HEAD.test(l) && !isNum) { if (a === null) a = []; a.push(l.replace(ANS_HEAD, "")); return; }
      if (a !== null) {
        // 答えのあとに続く行：番号がなければ解説として答えに足す
        if (hasNum) { a.push(l); return; }
        flush();
      }
      q.push(l);
    });
    flush();
    return out;
  }
  if (hasNum) {
    // 番号ごとにまとめ、まとまりの最後の行を答えにする
    const groups = [];
    lines.forEach((l) => { if (NUM_HEAD.test(l) || !groups.length) groups.push([l]); else groups[groups.length - 1].push(l); });
    groups.forEach((g) => { if (g.length >= 2) push(g.slice(0, -1).join(""), g[g.length - 1]); });
    return out;
  }
  for (let i = 0; i + 1 < lines.length; i += 2) push(lines[i], lines[i + 1]);
  return out;
}
