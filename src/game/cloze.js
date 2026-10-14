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

// ── ○×の「ひっかけ版」：正しい文（答えが○）の大事な言葉を1つだけ入れ替えて、誤りの文を作る ──
// 期間・数・結びの言い回し・同じ仲間の用語のどれか1つを、意味が変わる別の言葉にする。作れなければ null
const KNUM = { 〇: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const kanjiToNum = (t) => {
  if (/^\d+$/.test(t)) return Number(t);
  let n = 0, cur = 0;
  for (const ch of t) {
    if (ch in KNUM) cur = KNUM[ch];
    else if (ch === "十") { n += (cur || 1) * 10; cur = 0; }
    else if (ch === "百") { n += (cur || 1) * 100; cur = 0; }
    else return NaN;
  }
  return n + cur;
};
// 「1月以内」「一箇月以内」などを同じ形に（比べるため）
const numKey = (w) => w.replace(/[一二三四五六七八九十百〇]+|\d+/, (m) => String(kanjiToNum(m))).replace(/箇月|か月|ヶ月|カ月/, "月");
// 元の書き方（算用数字か漢数字か、「箇月」か「月」か）に合わせる
const numLike = (w, orig) => {
  let x = w;
  if (/\d/.test(orig)) x = x.replace(/[一二三四五六七八九十百〇]+/, (m) => String(kanjiToNum(m)));
  if (/箇月/.test(orig)) x = x.replace(/(\d|[一二三四五六七八九十])月/, "$1箇月");
  else if (/か月/.test(orig)) x = x.replace(/(\d|[一二三四五六七八九十])(箇)?月/, "$1か月");
  else x = x.replace(/箇月/, "月");
  return x;
};
// 同じ単位で入れ替えるときの、ありそうな数
const SAME_UNIT = { "月": [1, 2, 3, 6], "日": [3, 7, 10, 14, 20, 30], "週間": [1, 2], "年": [1, 2, 3, 5, 10, 20], "時間": [24, 48] };
const KDIG = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
const numToKanji = (v) => (v >= 10 ? `${v >= 20 ? KDIG[Math.floor(v / 10)] : ""}十${KDIG[v % 10]}` : KDIG[v] || String(v));
// 意味が反対・別になる結びの言い回し
const MODAL_SWAP = {
  "しなければならない": ["することができる", "しないことができる"],
  "することができる": ["しなければならない", "することができない"],
  "することができない": ["することができる"],
  "しないことができる": ["しなければならない"],
  "してはならない": ["することができる"],
  "とみなす": ["と推定する"],
  "と推定する": ["とみなす"],
  "を要しない": ["を要する"],
  "を妨げない": ["を妨げる"],
};
const MODAL_EXTRA = ["できる", "できない", "要する", "要しない"];
export function makeTrap(text) {
  if (!text || text.length < 8 || text.length > 400) return null;
  const cands = findCandidates(text).filter((c) => text.split(c.word).length === 2);
  // 「できる」「できない」の短い言い回し（一問一答によく出る）
  MODAL_EXTRA.forEach((w) => {
    const re = new RegExp(`${w}(?=[。、]|$)`, "g"); let m;
    while ((m = re.exec(text))) { const st = m.index; if (!cands.some((c) => st < c.end && st + w.length > c.start)) cands.push({ start: st, end: st + w.length, word: w, cat: "modal2" }); }
  });
  const pri = { num: 0, frac: 0, modal: 1, modal2: 1, term: 2 };
  for (const c of shuffle(cands).sort((a, b) => pri[a.cat] - pri[b.cat] + (Math.random() - 0.5) * 1.5)) {
    let to = null;
    if (c.cat === "num") {
      // 多くは同じ単位で数だけ変える（1月以内→2月以内）。ときどき単位ごと変える（1月以内→2週間以内）
      const unit = (c.word.match(/年|箇月|か月|ヶ月|月|週間|日|時間/) || [""])[0];
      const numStr = (c.word.match(/[一二三四五六七八九十百〇]+|\d+/) || [""])[0];
      const n = kanjiToNum(numStr);
      const near = (SAME_UNIT[unit.replace(/箇月|か月|ヶ月/, "月")] || []).filter((v) => v !== n);
      if (near.length && Math.random() < 0.8) {
        const v = shuffle(near)[0];
        to = c.word.replace(numStr, /\d/.test(numStr) ? String(v) : numToKanji(v));
      } else {
        const key = numKey(c.word);
        to = distractors(c).map((w) => numLike(w, c.word)).filter((w) => numKey(w) !== key)[0];
      }
    } else if (c.cat === "frac") {
      to = shuffle(FRAC_POOL.filter((w) => w !== c.word))[0];
    } else if (c.cat === "modal") {
      to = shuffle(MODAL_SWAP[c.word] || [])[0];
    } else if (c.cat === "modal2") {
      to = { "できる": "できない", "できない": "できる", "要する": "要しない", "要しない": "要する" }[c.word];
    } else if (c.cat === "term") {
      // 同じ仲間の用語だけ（仲間がいない言葉は入れ替えない）
      const g = TERM_GROUPS.find((x) => x.includes(c.word));
      if (g) to = shuffle(g.filter((w) => w !== c.word && !c.word.includes(w) && !w.includes(c.word)))[0];
    }
    if (!to || to === c.word) continue;
    return { text: text.slice(0, c.start) + to + text.slice(c.end), from: c.word, to, cat: c.cat };
  }
  return null;
}
// 答えが「○」「正しい」で始まる問題か
export const isTrueAnswer = (a) => /^\s*[○◯〇]|^\s*正(しい)?(\s|。|$|　)/.test(String(a || ""));
