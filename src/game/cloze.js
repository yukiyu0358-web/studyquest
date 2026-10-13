// 条文の穴埋め：条文の大事な言葉（期間・数・結びの言い回し・用語）を空欄にし、4つの選択肢から選ぶ問題を作る

const NUM_RE = /(?:[一二三四五六七八九十百千]+|\d+)(?:年|箇月|か月|月|週間|日|時間)(?:以内|以上|以下|未満|を経過|前|後)?/g;
const FRAC_RE = /[一二三四五六七八九十百]+分の[一二三四五六七八九十]+|過半数/g;
const MODALS = ["しなければならない", "することができない", "することができる", "しないことができる", "してはならない", "ものとする", "とみなす", "と推定する", "を要しない", "を妨げない"];
// 用語は「似た仲間」ごとにまとめる（選択肢は同じ仲間から出す）
const TERM_GROUPS = [
  ["表題部所有者", "所有権の登記名義人", "登記名義人", "登記権利者", "登記義務者", "一般承継人", "相続人", "申請人", "代理人", "第三者", "共有者", "区分所有者", "管理者", "土地家屋調査士"],
  ["登記官", "筆界特定登記官", "法務大臣", "法務局", "地方法務局", "登記所", "調査士会", "日本土地家屋調査士会連合会", "管理組合", "集会"],
  ["地積測量図", "建物図面", "各階平面図", "地役権図面", "地図に準ずる図面", "地図", "登記識別情報", "登記原因証明情報", "登記事項証明書"],
  ["表題部", "権利部", "甲区", "乙区"],
  ["所在", "地番", "地目", "地積", "家屋番号", "床面積", "種類", "構造", "附属建物", "区分建物", "共用部分", "敷地権", "規約", "持分", "議決権"],
  ["善意", "悪意", "過失", "重大な過失", "対抗", "取り消す", "無効", "追認", "承諾", "同意", "催告", "時効", "占有"],
  ["合筆", "分筆", "滅失", "更正", "抹消", "仮登記", "職権", "懲戒", "依頼"],
];
const TERMS = TERM_GROUPS.flat();
const groupOf = (w) => TERM_GROUPS.find((g) => g.includes(w)) || TERMS;
const NUM_POOL = ["一月以内", "二週間以内", "一週間以内", "三十日以内", "二月以内", "三月以内", "六箇月", "一年", "二年", "三年", "五年", "十年", "二十年", "三箇月", "十日", "二十日", "一年以内", "五年以内"];
const FRAC_POOL = ["過半数", "二分の一", "三分の二", "四分の三", "五分の四", "三分の一", "四分の一", "百分の一"];

const shuffle = (a) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };

// 文章から空欄の候補を探す：[{start, end, word, cat}]
function findCandidates(text) {
  const out = [];
  const push = (start, word, cat) => { const end = start + word.length; if (!out.some((c) => start < c.end && end > c.start)) out.push({ start, end, word, cat }); };
  let m;
  // 年号つきの年（昭和二十七年など）や「〇年政令」は期間ではないので除く
  NUM_RE.lastIndex = 0; while ((m = NUM_RE.exec(text))) { if (/(昭和|平成|令和|明治|大正)$/.test(text.slice(0, m.index)) || /^(法律|政令|省令|号|第)/.test(text.slice(m.index + m[0].length))) continue; push(m.index, m[0], "num"); }
  FRAC_RE.lastIndex = 0; while ((m = FRAC_RE.exec(text))) push(m.index, m[0], "frac");
  MODALS.forEach((w) => { let i = text.indexOf(w); while (i >= 0) { push(i, w, "modal"); i = text.indexOf(w, i + w.length); } });
  [...TERMS].sort((a, b) => b.length - a.length).forEach((w) => {
    let i = text.indexOf(w);
    while (i >= 0) {
      // 「地図」が「地図に準ずる図面」の一部、などの重なりは長い方を優先（長い順に入れているので push 側で除かれる）
      if (!/[一-龥々]/.test(text[i + w.length] || "") && !/[一-龥々]/.test(text[i - 1] || "")) push(i, w, "term");
      i = text.indexOf(w, i + w.length);
    }
  });
  return out.sort((a, b) => a.start - b.start);
}

function distractors(c) {
  const pool = c.cat === "num" ? NUM_POOL : c.cat === "frac" ? FRAC_POOL : c.cat === "modal" ? MODALS : TERMS;
  let cand = pool.filter((w) => w !== c.word);
  if (c.cat === "num") {
    // 同じ単位（年・月・日…）のものを多めに
    const unit = (c.word.match(/年|箇月|か月|月|週間|日|時間/) || [""])[0];
    const same = cand.filter((w) => unit && w.includes(unit)), other = cand.filter((w) => !same.includes(w));
    cand = [...shuffle(same).slice(0, 2), ...shuffle(other)];
    // 「以内」などの付き方をそろえる
    const tail = (c.word.match(/以内|以上|以下|未満|を経過|前|後$/) || [""])[0];
    cand = cand.map((w) => w.replace(/以内|以上|以下|未満|を経過/, "") + tail).filter((w) => w !== c.word);
  } else if (c.cat === "term") {
    // 同じ仲間の用語から（足りなければ似た長さの用語で補う）
    const g = groupOf(c.word).filter((w) => w !== c.word && !c.word.includes(w) && !w.includes(c.word));
    const rest = shuffle(cand.filter((w) => !g.includes(w))).sort((a, b) => Math.abs(a.length - c.word.length) - Math.abs(b.length - c.word.length));
    cand = [...shuffle(g), ...rest];
    return shuffle(cand.slice(0, 3));
  }
  return shuffle([...new Set(cand)].slice(0, 6)).slice(0, 3);
}

// 1つの文章（項・号）から問題を作る。空欄が作れなければ null
export function makeCloze(text, maxBlanks = 2) {
  if (!text || text.length < 15 || text.length > 260) return null;
  // 同じ言葉が文中に2回以上あると答えがわかってしまうので除く
  const cands = findCandidates(text).filter((c) => text.split(c.word).length === 2);
  if (!cands.length) return null;
  const pri = { num: 0, frac: 0, modal: 1, term: 2 };
  const picked = [];
  shuffle(cands).sort((a, b) => pri[a.cat] - pri[b.cat] + (Math.random() - 0.5) * 1.2).forEach((c) => {
    if (picked.length >= maxBlanks) return;
    if (picked.some((p) => p.word === c.word)) return;
    if (picked.length && picked[0].cat === c.cat && cands.some((x) => x.cat !== c.cat && !picked.includes(x))) return;
    picked.push(c);
  });
  if (!picked.length) return null;
  picked.sort((a, b) => a.start - b.start);
  const parts = [];
  let pos = 0;
  picked.forEach((c, i) => { parts.push(text.slice(pos, c.start)); parts.push({ blank: i }); pos = c.end; });
  parts.push(text.slice(pos));
  const blanks = picked.map((c) => ({ word: c.word, cat: c.cat, options: shuffle([c.word, ...distractors(c)]) }));
  if (blanks.some((b) => b.options.length < 2)) return null;
  return { parts, blanks, text };
}

export const BLANK_LABELS = ["ア", "イ", "ウ"];
