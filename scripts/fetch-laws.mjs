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
import { mkdir, writeFile, readFile } from "node:fs/promises";
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
  // 第二級陸上特殊無線技士（二陸特）の法規
  { key: "denpa-ho",       name: "電波法",                         lawId: "325AC0000000131", lawNum: "昭和二十五年法律第百三十一号" },
  { key: "denpa-rei",      name: "電波法施行令",                   lawId: "413CO0000000245", lawNum: "平成十三年政令第二百四十五号" },
  { key: "denpa-kisoku",   name: "電波法施行規則",                 lawId: "325M50080000014", lawNum: "昭和二十五年電波監理委員会規則第十四号" },
  { key: "musen-jujisha",  name: "無線従事者規則",                 lawId: "402M50001000018", lawNum: "平成二年郵政省令第十八号" },
  { key: "musen-unyo",     name: "無線局運用規則",                 lawId: "325M50080000017", lawNum: "昭和二十五年電波監理委員会規則第十七号" },
  { key: "musen-setsubi",  name: "無線設備規則",                   lawId: "325M50080000018", lawNum: "昭和二十五年電波監理委員会規則第十八号" },
  { key: "musen-menkyo",   name: "無線局免許手続規則",             lawId: "325M50080000015", lawNum: "昭和二十五年電波監理委員会規則第十五号" },
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

// 表（TableStruct）：行ごとに、欄の文章（文ごとに改行）の配列にする
const tableRows = (ts) => {
  const tb = findFirst(ts, "Table");
  return kids(tb, "TableRow").map((r) => kids(r, "TableColumn").map((c) => (c.children || []).filter(isNode).map(textOf).join("\n")));
};
const tablesOf = (n) => kids(n, "TableStruct").map(tableRows).filter((t) => t.length);

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
        const itb = tablesOf(it);
        if (itb.length) item.tb = itb;
        p.i.push(item);
      }
      if (p.i.length === 0) delete p.i;
      const tb = tablesOf(para);
      if (tb.length) p.tb = tb;
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
  // 法改正の記録：前回のデータと比べて、内容が変わった条文（新しくできた条文も）に日付を付けて changes.json に残す
  const readJson = async (f) => { try { return JSON.parse(await readFile(join(outDir, f), "utf8")); } catch (e) { return null; } };
  const changesFile = (await readJson("changes.json")) || { changes: {} };
  const changes = changesFile.changes || {};
  let changedN = 0;
  for (const src of LAW_SOURCES) {
    process.stdout.write(`${src.name} を取得中... `);
    try {
      const { title, articles } = await fetchLaw(src);
      const prev = await readJson(`${src.key}.json`);
      if (prev && Array.isArray(prev.articles)) {
        // 表を読むようになる前のデータと比べるときは、表を除いて比べる（表が増えただけで「法改正」にしない）
        const key = prev.tables ? JSON.stringify : (a) => JSON.stringify(a, (k, v) => (k === "tb" ? undefined : v));
        const old = new Map(prev.articles.map((a) => [a.n, key(a)]));
        for (const a of articles) {
          if (old.get(a.n) !== key(a)) { (changes[src.key] = changes[src.key] || {})[a.n] = fetchedAt; changedN++; }
        }
      }
      const data = { key: src.key, name: src.name, title, lawId: src.lawId, lawNum: src.lawNum, fetchedAt, tables: true, articles };
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
  await writeFile(join(outDir, "changes.json"), JSON.stringify({ updatedAt: fetchedAt, changes }));
  console.log(changedN ? `法改正：${changedN}条の変更を changes.json に記録しました（アプリで「⚠ 法改正あり」と表示されます）。` : "前回から変わった条文はありませんでした。");
  console.log(`\n完了：${ok} / ${LAW_SOURCES.length} 件の法令を public/laws に保存しました。`);
  if (ok < LAW_SOURCES.length) process.exitCode = 1;
}

// テストから import されたときは実行しない
const samePath = (a, b) => (process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b);
if (process.argv[1] && samePath(fileURLToPath(import.meta.url), resolve(process.argv[1]))) main();
