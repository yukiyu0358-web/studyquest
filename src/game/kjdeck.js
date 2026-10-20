// ============================================================
// 申請書の叩き込み（2026年10月20日）：記述式の「登記の目的・原因及びその日付・添付書類・申請人・税・期限」を、
// 短いカードにして毎日まわす。カードは次の3つから作る（どれもアプリにあるデータ）
//   1. 本試験40年分（public/data/kijutsu.json の模範＝modelAnswers）
//   2. 暗記チート（目的⇄原因⇄日付。本試験の答えで直した CHEAT_ROWS）
//   3. 申請書の場面（法令で確かめた SHINSEI_CASES：目的・原因・申請の期限・添付情報）
// 答え方：choice＝4択（自動採点）／docs＝添付書類を全部選ぶ（自動採点）／flip＝思い出してからめくる（自己採点）
// 周回：カードごとに箱 b（0＝新しい、1〜6）と次に出す日 nx。正解で箱が上がり、間が 1→3→7→14→30→60日 と延びる。まちがいは箱1（翌日）
// ============================================================
import { modelAnswers, docsIn, isSingleApp, DOC_LIST, CHEAT_ROWS } from "./kijutsu.js";
import { SHINSEI_CASES } from "../data/shinsei.js";

export const DECK_FIELDS = [
  { id: "purpose", name: "登記の目的" },
  { id: "cause", name: "原因及びその日付" },
  { id: "docs", name: "添付書類" },
  { id: "other", name: "申請人・税・期限" },
];
export const DECK_IV = [0, 1, 3, 7, 14, 30, 60]; // 箱ごとの、次に出すまでの日数
export const DECK_MASTER = 5; // 箱5（30日）以上で「覚えた」

// 申請書の場面の添付情報の名前を、添付書類の一覧の名前にそろえる
const DOC_ALIAS = { "所有権を証する情報": "所有権証明書", "住所を証する情報": "住所証明書", "相続を証する情報": "相続証明書", "代理権限を証する情報": "代理権限証書" };
const docName = (n) => DOC_ALIAS[n] || n;

const oneLine = (t) => !!t && !/\n/.test(t) && t.length <= 40;
// 「土地地積更正登記」と「地積更正登記」のように、頭の「土地」「建物」だけが違うものは同じとみなす（4択に並べない）
const normP = (s) => String(s || "").replace(/^(土地|建物)/, "");
const otherPurposes = (set, ans) => [...set].filter((p) => normP(p) !== normP(ans));
const kindName = (k) => (k === "land" ? "土地" : "建物");

export function buildDeck(years) {
  const ys = (years || []).slice().sort((a, b) => (a.year || 0) - (b.year || 0) || (a.kind === "land" ? -1 : 1));
  // 4択のまちがいの選択肢に使う「登記の目的」の名前（土地・建物ごと）
  const purposes = { land: new Set(), bldg: new Set() };
  ys.forEach((y) => { const p = modelAnswers(y).m["登記の目的"]; if (oneLine(p)) purposes[y.kind === "land" ? "land" : "bldg"].add(p); });
  CHEAT_ROWS.forEach((r) => purposes[r.g === "土地" ? "land" : "bldg"].add(r.p));
  SHINSEI_CASES.forEach((c) => purposes[c.kind === "土地" ? "land" : "bldg"].add(c.purpose));

  const yearCards = [];
  ys.forEach((y) => {
    const { m, why } = modelAnswers(y);
    const kk = y.kind === "land" ? "land" : "bldg";
    const head = `${y.label}　${kindName(y.kind)}`;
    const caseText = (y.case || []).join("\n");
    const base = { src: "year", kind: kk, ref: y.id, head, caseText };
    const out = [];
    const pur = m["登記の目的"];
    if (pur) out.push(oneLine(pur)
      ? { ...base, id: `y:${y.id}:purpose`, field: "purpose", ask: "この事案の「登記の目的」は？", mode: "choice", answer: pur, pool: otherPurposes(purposes[kk], pur), why }
      : { ...base, id: `y:${y.id}:purpose`, field: "purpose", ask: "この事案の「登記の目的」は？（申請が複数あれば全部）", mode: "flip", answer: pur, why });
    const cause = m["原因及びその日付・冠記"] || m["原因及びその日付"];
    if (cause) out.push({ ...base, id: `y:${y.id}:cause`, field: "cause", title: y.title, ask: `「${y.title}」の「原因及びその日付」（冠記・表示欄の書き方）は？`, mode: "flip", answer: cause });
    const docs = m["添付書類"];
    if (docs) {
      const set = docsIn(docs);
      out.push(isSingleApp(docs) && set.length
        ? { ...base, id: `y:${y.id}:docs`, field: "docs", title: y.title, ask: `「${y.title}」の添付書類を全部選んでください。`, mode: "docs", docs: set, answer: docs }
        : { ...base, id: `y:${y.id}:docs`, field: "docs", title: y.title, ask: `「${y.title}」の添付書類は？（申請が複数あれば申請ごとに）`, mode: "flip", answer: docs });
    }
    if (m["申請人"]) out.push({ ...base, id: `y:${y.id}:applicant`, field: "other", title: y.title, ask: `「${y.title}」の申請人は？`, mode: "flip", answer: m["申請人"] });
    if (m["登録免許税"]) out.push({ ...base, id: `y:${y.id}:tax`, field: "other", title: y.title, ask: `「${y.title}」の登録免許税は？`, mode: "flip", answer: m["登録免許税"] });
    yearCards.push(out);
  });

  // 暗記チート：目的から原因・日付
  const cheatCards = [];
  CHEAT_ROWS.forEach((r) => {
    const kk = r.g === "土地" ? "land" : "bldg";
    const same = CHEAT_ROWS.filter((x) => x !== r && x.g === r.g);
    const base = { src: "cheat", kind: kk, head: `暗記チート　${r.g}`, title: r.p };
    if (r.c) {
      // 同じ種類（土地・建物…）の原因を優先し、足りなければほかの種類から
      const near = [...new Set(same.map((x) => x.c).filter((c) => c && c !== r.c))];
      const far = [...new Set(CHEAT_ROWS.map((x) => x.c).filter((c) => c && c !== r.c && !near.includes(c)))];
      cheatCards.push({ ...base, id: `c:${r.g}:${r.p}:cause`, field: "cause", ask: `「${r.p}」の「原因」の書き方は？`, mode: "choice", answer: r.c, pool: near.length >= 3 ? near : [...near, ...far] });
    }
    if (r.d) cheatCards.push({ ...base, id: `c:${r.g}:${r.p}:date`, field: "cause", ask: `「${r.p}」の原因の日付は、どの日を書く？`, mode: "choice", answer: r.d, pool: [...new Set(CHEAT_ROWS.map((x) => x.d).filter((d) => d && d !== r.d))] });
  });

  // 申請書の場面（法令で確かめたもの）：目的・原因・申請の期限・添付情報
  const caseCards = [];
  const deadlines = ["1月以内", "申請の義務なし", "2週間以内", "3月以内", "1年以内"];
  SHINSEI_CASES.forEach((c) => {
    const kk = c.kind === "土地" ? "land" : "bldg";
    const base = { src: "case", kind: kk, ref: c.id, head: `申請書の場面　${c.kind}`, caseText: c.text, why: c.note };
    caseCards.push({ ...base, id: `s:${c.id}:purpose`, field: "purpose", ask: "この場面の「登記の目的」は？", mode: "choice", answer: c.purpose, pool: otherPurposes(purposes[kk], c.purpose) });
    if (c.cause) caseCards.push({ ...base, id: `s:${c.id}:cause`, field: "cause", title: c.purpose, ask: `「${c.purpose}」の原因の書き方は？`, mode: "choice", answer: c.cause, pool: [...new Set(SHINSEI_CASES.map((x) => x.cause).filter((x) => x && x !== c.cause))] });
    if (c.deadline) caseCards.push({ ...base, id: `s:${c.id}:deadline`, field: "other", title: c.purpose, ask: `「${c.purpose}」の申請の期限は？`, mode: "choice", answer: c.deadline, pool: deadlines.filter((x) => x !== c.deadline) });
    if (c.attach && c.attach.length) caseCards.push({ ...base, id: `s:${c.id}:docs`, field: "docs", title: c.purpose, ask: `「${c.purpose}」で、法令で決まっている添付情報を全部選んでください（代理権限証書などは除く）。`, mode: "docs", docs: c.attach.map(docName), answer: c.attach.map(docName).join("・") });
  });

  // 並べ方：本試験の年度（1年ぶんのカード）2つごとに、暗記チート2枚と申請書の場面1枚をはさむ
  const deck = [];
  let ci = 0, si = 0;
  yearCards.forEach((cards, k) => {
    deck.push(...cards);
    if (k % 2 === 1) { deck.push(...cheatCards.slice(ci, ci + 2)); ci += 2; if (si < caseCards.length) deck.push(caseCards[si++]); }
  });
  deck.push(...cheatCards.slice(ci), ...caseCards.slice(si));
  return deck;
}

// 4択の選択肢（毎回ちがう順に）
export function choicesOf(card, rnd = Math.random) {
  const pool = [...(card.pool || [])].sort(() => rnd() - 0.5).slice(0, 3);
  return [card.answer, ...pool].sort(() => rnd() - 0.5);
}
// 添付書類のカードで並べる書類（一覧＋そのカードの書類）
export const docOptions = (card) => [...new Set([...DOC_LIST, ...(card.docs || [])])];

// 答えたあとの箱と次の日（grade：ok＝正解・覚えていた／hard＝あやふや／ng＝まちがい）
export function deckNext(rec, grade, today, addDays) {
  let b = rec ? rec.b || 0 : 0;
  if (grade === "ok") b = Math.min(6, b + 1);
  else if (grade === "hard") b = Math.max(1, b);
  else b = 1;
  const days = grade === "ng" ? 1 : grade === "hard" ? Math.max(1, Math.ceil(DECK_IV[b] / 2)) : DECK_IV[b];
  return { b, nx: addDays(today, days) };
}
