// ============================================================
// 条文データの取得（e-Gov法令API Version2）
//
// 使い方（studyquest-vite フォルダで実行）：
//   node scripts/fetch-laws.mjs
//
// public/laws/ に法令ごとのJSONファイルを保存します。
// 法改正があったときは、もう一度実行すれば最新の条文に更新されます。
// 出典：e-Gov法令検索（デジタル庁） https://laws.e-gov.go.jp/
// ============================================================
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

// アプリ側（App.jsx の LAWS）と key をそろえること
export const LAW_SOURCES = [
  { key: "fudosan-ho",     name: "不動産登記法",                   lawId: "416AC0000000123", lawNum: "平成十六年法律第百二十三号" },
  { key: "fudosan-rei",    name: "不動産登記令",                   lawId: "416CO0000000379", lawNum: "平成十六年政令第三百七十九号" },
  { key: "fudosan-kisoku", name: "不動産登記規則",                 lawId: "417M60000010018", lawNum: "平成十七年法務省令第十八号" },
  { key: "minpo",          name: "民法",                           lawId: "129AC0000000089", lawNum: "明治二十九年法律第八十九号" },
  { key: "kubun",          name: "建物の区分所有等に関する法律",   lawId: "337AC0000000069", lawNum: "昭和三十七年法律第六十九号" },
  { key: "chosashi",       name: "土地家屋調査士法",               lawId: "325AC0000000228", lawNum: "昭和二十五年法律第二百二十八号" },
];

const API = "https://laws.e-gov.go.jp/api/2/law_data/";

// ── 法令XML（JSONツリー形式）から条文を取り出す ──
const isNode = (n) => n && typeof n === "object" && typeof n.tag === "string";
const kids = (n, tag) => (n && Array.isArray(n.children) ? n.children.filter((c) => isNode(c) && c.tag === tag) : []);
const textOf = (n) => {
  if (typeof n === "string") return n;
  if (!isNode(n)) return "";
  if (n.tag === "Rt") return ""; // ふりがなは除く
  return (n.children || []).map(textOf).join("");
};
// 号の本文などで「Column（列）」に分かれている場合は全角スペースでつなぐ
const sentenceText = (n) => {
  if (!isNode(n)) return "";
  const cols = kids(n, "Column");
  if (cols.length > 0) return cols.map(textOf).join("　");
  return textOf(n);
};
const findFirst = (n, tag) => {
  if (!isNode(n)) return null;
  if (n.tag === tag) return n;
  for (const c of n.children || []) { const r = findFirst(c, tag); if (r) return r; }
  return null;
};
const findAll = (n, tag, out = []) => {
  if (!isNode(n)) return out;
  if (n.tag === tag) { out.push(n); return out; } // 条の中の条（改正規定など）は見ない
  for (const c of n.children || []) findAll(c, tag, out);
  return out;
};
// イ・ロ・ハ…（Subitem1〜）を再帰的に文字列化
const subitemLines = (n, level = 1, out = []) => {
  for (const s of kids(n, `Subitem${level}`)) {
    const title = textOf(kids(s, `Subitem${level}Title`)[0]);
    const body = sentenceText(kids(s, `Subitem${level}Sentence`)[0]);
    out.push(`${"　".repeat(level - 1)}${title}　${body}`.trim());
    subitemLines(s, level + 1, out);
  }
  return out;
};

export function extractArticles(lawFullText) {
  const main = findFirst(lawFullText, "MainProvision");
  if (!main) return [];
  return findAll(main, "Article").map((a) => {
    const art = {
      n: String((a.attr && a.attr.Num) || ""),
      t: textOf(kids(a, "ArticleTitle")[0]),
      c: textOf(kids(a, "ArticleCaption")[0]),
      p: [],
    };
    for (const para of kids(a, "Paragraph")) {
      const p = { n: String((para.attr && para.attr.Num) || ""), s: sentenceText(kids(para, "ParagraphSentence")[0]), i: [] };
      for (const it of kids(para, "Item")) {
        const item = { n: String((it.attr && it.attr.Num) || ""), t: textOf(kids(it, "ItemTitle")[0]), s: sentenceText(kids(it, "ItemSentence")[0]) };
        const subs = subitemLines(it);
        if (subs.length) item.x = subs;
        p.i.push(item);
      }
      if (p.i.length === 0) delete p.i;
      art.p.push(p);
    }
    return art;
  });
}

async function fetchLaw(src) {
  // 法令IDで取得し、失敗したら法令番号で取得し直す
  const tries = [src.lawId, src.lawNum].filter(Boolean);
  let lastErr = null;
  for (const id of tries) {
    try {
      const res = await fetch(API + encodeURIComponent(id), { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const tree = json.law_full_text;
      if (!isNode(tree)) throw new Error("law_full_text がありません");
      const articles = extractArticles(tree);
      if (articles.length === 0) throw new Error("条文が見つかりません");
      const title = textOf(findFirst(tree, "LawTitle")) || src.name;
      return { title, articles };
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

async function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const outDir = join(root, "public", "laws");
  await mkdir(outDir, { recursive: true });
  const index = [];
  const fetchedAt = new Date().toISOString().slice(0, 10);
  let ok = 0;
  for (const src of LAW_SOURCES) {
    process.stdout.write(`${src.name} を取得中... `);
    try {
      const { title, articles } = await fetchLaw(src);
      const data = { key: src.key, name: src.name, title, lawId: src.lawId, lawNum: src.lawNum, fetchedAt, articles };
      await writeFile(join(outDir, `${src.key}.json`), JSON.stringify(data));
      index.push({ key: src.key, name: src.name, count: articles.length, fetchedAt });
      console.log(`OK（${articles.length}条：${articles[0].t}〜${articles[articles.length - 1].t}）`);
      ok++;
    } catch (e) {
      console.log(`失敗：${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 800)); // 相手のサーバーに負担をかけないよう少し待つ
  }
  await writeFile(join(outDir, "index.json"), JSON.stringify({ fetchedAt, laws: index }));
  console.log(`\n完了：${ok} / ${LAW_SOURCES.length} 件の法令を public/laws に保存しました。`);
  if (ok < LAW_SOURCES.length) process.exitCode = 1;
}

// テストから import されたときは実行しない
const samePath = (a, b) => (process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b);
if (process.argv[1] && samePath(fileURLToPath(import.meta.url), resolve(process.argv[1]))) main();
