// ファイル分割の点検：src の各ファイルで「どこにも定義も import もされていない名前」を探す。
// 使い方：node scripts/check-names.mjs   （何も出なければ OK）
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse } from "@babel/parser";
import traverseMod from "@babel/traverse";
const traverse = traverseMod.default || traverseMod;

// ブラウザや JavaScript にもともとある名前
const GLOBALS = new Set(("window document navigator localStorage sessionStorage console setTimeout clearTimeout setInterval clearInterval requestAnimationFrame cancelAnimationFrame " +
  "Math Date JSON Number String Boolean Array Object Promise Set Map WeakMap WeakSet Symbol RegExp Error TypeError Intl isNaN isFinite parseInt parseFloat encodeURIComponent decodeURIComponent " +
  "fetch URL URLSearchParams Blob File FileReader Image HTMLInputElement HTMLElement Event CustomEvent EventTarget MouseEvent KeyboardEvent AudioContext alert confirm prompt location history " +
  "globalThis undefined NaN Infinity structuredClone atob btoa crypto performance matchMedia getComputedStyle ResizeObserver IntersectionObserver MutationObserver queueMicrotask " +
  "TextEncoder TextDecoder Uint8Array Uint8ClampedArray ArrayBuffer DataView FormData Headers Response Request AbortController screen innerWidth innerHeight devicePixelRatio " +
  "arguments require module process import").split(/\s+/));

const files = [];
const walk = (d) => readdirSync(d).forEach((f) => { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(jsx?|mjs)$/.test(f)) files.push(p); });
walk("src");

let problems = 0;
for (const f of files) {
  const code = readFileSync(f, "utf8");
  const ast = parse(code, { sourceType: "module", plugins: ["jsx"] });
  const missing = new Map();
  traverse(ast, {
    ReferencedIdentifier(path) {
      const name = path.node.name;
      if (path.isJSXIdentifier() && /^[a-z]/.test(name)) return; // <div> など HTML の要素
      if (path.parentPath.isJSXMemberExpression() && path.parentPath.node.property === path.node) return;
      if (path.scope.hasBinding(name, true) || GLOBALS.has(name)) return;
      if (!missing.has(name)) missing.set(name, path.node.loc ? path.node.loc.start.line : 0);
    },
  });
  for (const [name, line] of missing) { console.log(`${f}:${line}  見つからない名前: ${name}`); problems++; }
}
console.log(problems ? `\n${problems}件の問題があります` : "OK：見つからない名前はありません");
process.exit(problems ? 1 : 0);
