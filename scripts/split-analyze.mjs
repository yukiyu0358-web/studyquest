// App.jsx のトップレベルの宣言の参照関係を調べ、画面（入口の部品）ごとに「切り出せる部品のまとまり」を出す。使い方：node scripts/split-analyze.mjs report
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(process.cwd() + "/package.json");
const { parse } = require("@babel/parser");
const traverseMod = require("@babel/traverse");
const traverse = traverseMod.default || traverseMod;

export function analyze(code) {
  const ast = parse(code, { sourceType: "module", plugins: ["jsx"] });
  const body = ast.program.body;
  const decl = new Map(); // name -> stmt index
  const stmts = body.map((n, i) => ({ i, node: n, names: [], refs: new Set(), writes: new Set(), jsxRefs: new Set(), plainRefs: new Set() }));
  const addNames = (s, id) => { if (!id) return; if (id.type === "Identifier") s.names.push(id.name); else if (id.type === "ObjectPattern") id.properties.forEach((p) => addNames(s, p.value || p.argument)); else if (id.type === "ArrayPattern") id.elements.forEach((e) => addNames(s, e)); else if (id.type === "AssignmentPattern") addNames(s, id.left); else if (id.type === "RestElement") addNames(s, id.argument); };
  stmts.forEach((s) => {
    let n = s.node;
    if (n.type === "ExportNamedDeclaration" && n.declaration) n = n.declaration;
    if (n.type === "ExportDefaultDeclaration") { if (n.declaration && n.declaration.id) s.names.push(n.declaration.id.name); s.isDefault = true; }
    if (n.type === "FunctionDeclaration" || n.type === "ClassDeclaration") s.names.push(n.id.name);
    if (n.type === "VariableDeclaration") { s.kind = n.kind; n.declarations.forEach((d) => addNames(s, d.id)); }
    if (n.type === "ImportDeclaration") { s.isImport = true; n.specifiers.forEach((sp) => s.names.push(sp.local.name)); }
    s.names.forEach((nm) => decl.set(nm, s.i));
  });
  traverse(ast, {
    Program(path) {
      const prog = path.scope;
      path.traverse({
        ReferencedIdentifier(p) {
          const name = p.node.name;
          const b = p.scope.getBinding(name);
          if (!b || b.scope !== prog) return;
          const top = p.findParent((x) => x.parentPath && x.parentPath.isProgram());
          if (!top) return;
          const s = stmts[top.key];
          if (s.names.includes(name) && b.path && top.isAncestor && false) return;
          s.refs.add(name);
          if (p.isJSXIdentifier()) s.jsxRefs.add(name); else s.plainRefs.add(name);
        },
        AssignmentExpression(p) {
          const l = p.node.left;
          if (l.type !== "Identifier") return;
          const b = p.scope.getBinding(l.name);
          if (!b || b.scope !== prog) return;
          const top = p.findParent((x) => x.parentPath && x.parentPath.isProgram());
          if (top) stmts[top.key].writes.add(l.name);
        },
        UpdateExpression(p) {
          const l = p.node.argument;
          if (l.type !== "Identifier") return;
          const b = p.scope.getBinding(l.name);
          if (!b || b.scope !== prog) return;
          const top = p.findParent((x) => x.parentPath && x.parentPath.isProgram());
          if (top) stmts[top.key].writes.add(l.name);
        },
      });
    },
  });
  return { ast, body, stmts, decl };
}

// 入口 entry から切り出せる宣言のまとまり
export function movable(A, entry, pinned = new Set()) {
  const { stmts, decl } = A;
  const e = decl.get(entry);
  if (e === undefined) return null;
  const reach = new Set([e]);
  const q = [e];
  while (q.length) {
    const s = stmts[q.pop()];
    s.refs.forEach((nm) => { const j = decl.get(nm); if (j === undefined || stmts[j].isImport || stmts[j].isDefault) return; if (!reach.has(j)) { reach.add(j); q.push(j); } });
  }
  const M = new Set(reach);
  let changed = true;
  while (changed) {
    changed = false;
    for (const j of [...M]) {
      if (j === e) continue;
      const names = stmts[j].names;
      const usedOutside = names.some((nm) => pinned.has(nm)) || stmts.some((t) => !M.has(t.i) && !t.isImport && names.some((nm) => t.refs.has(nm) || t.writes.has(nm)));
      if (usedOutside) { M.delete(j); changed = true; }
    }
  }
  // 入口が外から JSX 以外で使われていないか
  const plainOutside = stmts.filter((t) => !M.has(t.i) && t.plainRefs.has(entry)).map((t) => t.names.join(","));
  // 切り出すものが外の let を書きかえていないか
  const badWrites = [];
  M.forEach((j) => stmts[j].writes.forEach((nm) => { const k = decl.get(nm); if (k !== undefined && !M.has(k)) badWrites.push(nm); }));
  const size = [...M].reduce((t, j) => t + (stmts[j].node.end - stmts[j].node.start), 0);
  return { M, size, plainOutside, badWrites };
}

if (process.argv[2] === "report") {
  const code = readFileSync("src/App.jsx", "utf8");
  const A = analyze(code);
  const comps = A.stmts.filter((s) => s.node.type === "FunctionDeclaration" && /^[A-Z]/.test(s.names[0])).map((s) => s.names[0]);
  const rows = comps.map((c) => { const m = movable(A, c); return { c, size: m.size, n: m.M.size, plain: m.plainOutside.length, bad: m.badWrites.length }; }).sort((a, b) => b.size - a.size).slice(0, 40);
  rows.forEach((r) => console.log(`${String(Math.round(r.size / 1024)).padStart(5)}KB  ${String(r.n).padStart(4)}個  ${r.c}${r.plain ? `  ⚠JSX以外で使用${r.plain}` : ""}${r.bad ? `  ⚠外の変数を書換${r.bad}` : ""}`));
  console.log("App.jsx 全体", Math.round(code.length / 1024), "KB（文字数）");
}
