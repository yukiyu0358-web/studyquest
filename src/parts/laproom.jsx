// LapRoom とその部品（2026-10-26、App.jsx から切り出し。開いたときに読み込む）
import { useState, useEffect, useRef, useId, createContext, useContext, Fragment, cloneElement } from "react";
import { createPortal } from "react-dom";
import { fsrs as createFsrs, createEmptyCard, Rating, State } from "ts-fsrs";
import Papa from "papaparse";
import { fbAuth, fbDb, fbFieldValue, getPushToken, FCM_VAPID_KEY } from "../firebase";
import { LINE_ICONS, Ico, Sword, Plus, Check, Trash2, Sparkles, ScrollIcon, Upload, Play, Pause, BookOpen, Calendar, Home, MapIcon, FileQuestion, Eye, Shuffle, XIcon, Award, Clock, TrendingUp, Crown, Pencil, Bookmark, StarIcon, FolderIcon, Up, Down, Skull, Sword2, StatusIcon, LogoutIcon, Search, Castle, GA, swordArt, crossedSwords, oniArt, GAME_ART, GAME_ART_BY_ID, GAME_RING, GameIcon, paintedUrl, MON_ART_URL } from "../game/icons";
import { SFX } from "../game/sfx";
import { CALC_TYPES, makeCalcProblem, checkCalc, calcAnsText, SAKUZU_TYPES, makeSakuzuProblem } from "../game/calc";
import { BATTLE_FX_CSS, heroAttackFor, monAttackFor, impactOf, AttackFx, SkillBanner, Ambient, ELEMENTS, EL_NAME, EL_ICON } from "../game/battlefx";
import { CALC2_GROUPS, CALC2_TYPES, CALC2_ALL, FIXED_PER_TYPE, CALC_MISS, makeCalc2, fixedSeed, checkCalc2, fieldAnsText, stagesOf, keyDrillOf } from "../game/calcplus";
import { makeCloze, BLANK_LABELS, makeTrap, isTrueAnswer } from "../game/cloze";
import { parseQuickText, TEXT_IMPORT_MODES } from "../game/textimport";
import { loadData, DOC_LIST, docsIn, isSingleApp, modelAnswers, decideOf, floorRows, floorKeys, hideResult, CHEAT_ROWS, CHEAT_FIXES, REC_CASES, kjCanon, KJ_FIELDS, kjNextDate, kjDue, kjLabel, yearQuestionRe } from "../game/kijutsu";
import { SHINSEI_CASES, SHINSEI_PURPOSES, SHINSEI_CAUSES, SHINSEI_DEADLINES, SHINSEI_ATTACH } from "../data/shinsei";
import { STUDY_QUOTES } from "../data/quotes";
import { SANKO_SUBJECTS } from "../data/sankosho";
import { NIRIKUTOKU_SUBJECTS } from "../data/sankosho-radio";
import { HOME_WORLD, WORLD_PRESETS, genericChapters } from "../data/worlds";
import { R7_PM, ELITE_GOAL, rankOf, lineOf } from "../data/examstats";
import { RADIO_CALC_TYPES, makeRadioCalc } from "../game/radiocalc";
import { BLOCK_DIAGRAMS } from "../data/blocks";
import { buildDeck, choicesOf, docOptions, deckNext, DECK_FIELDS, DECK_IV, DECK_MASTER } from "../game/kjdeck";
import { ROADMAP_2027 } from "../data/roadmap";
import { REGION_TALK, STORY_TALKS, REGION_ARC, regionArc, TRINITY_REGIONS, TRINITY_TALK, BOND_TALKS, COUNTDOWN_TALKS, ACADEMY_MEET, STUDY_GROUP_TALK } from "../data/story";
import { featOn, ART_URL, Box, HyojiGrid, KEYCAP, KJ_MARKS, KijutsuRun, KjFieldInput, KjSection, LAWS, LapRecordsPanel, LawArticleModal, RoadmapBanner, STUDY_PREFS, StudyScopeBar, TrainingRoom, WEAK_GRAD, addDays, bounties, byRegionOrder, calcDueList, chipSt, chosenQual, correctDayStreak, curWorld, daysBetween, eraLabel, extractLawRefs, formatErrTypes, getFsrsScheduler, homeSide, isQuestionWeak, isRadioQual, kjAutoHint, lawChangeOf, lawIndex, lawsInScope, mainQual, normRpg, planBankOf, planToday, planTotal, rehearsalCfg, scopedPlans, setDisplay, shuffle, studyScope, themeOf, toFsrsCard, todayStr, uid, useLawChanges, usePastData } from "../App.jsx";


// ============ 苦手問題の書き出し ============
// 直近の回答で連続して間違えている回数（回答の記録 ah から数える）
const trailingWrongCount = (q) => {
  const ah = Array.isArray(q && q.ah) ? q.ah : [];
  let n = 0;
  for (let i = ah.length - 1; i >= 0 && ah[i][6] === "w"; i--) n++;
  return n;
};
const WEAK_EXPORT_RULES = [
  { id: "streak2", label: "連続で2回以上間違えた", test: (q) => trailingWrongCount(q) >= 2 },
  { id: "streak3", label: "連続で3回以上間違えた", test: (q) => trailingWrongCount(q) >= 3 },
  { id: "weak", label: "苦手リストの問題すべて", test: (q) => isQuestionWeak(q) },
  { id: "wrong2", label: "間違いの合計が2回以上", test: (q) => (q.wrong || 0) >= 2 },
];
function downloadTextFile(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function buildWeakExport(state, ruleId, qualId) {
  const rule = WEAK_EXPORT_RULES.find((r) => r.id === ruleId) || WEAK_EXPORT_RULES[0];
  const banks = [...state.questionBanks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).filter((b) => qualId === "all" || (b.qualId || "_none_") === qualId);
  const groups = [];
  for (const b of banks) {
    const qs = (b.questions || []).filter((q) => rule.test(q)).sort((x, y) => trailingWrongCount(y) - trailingWrongCount(x) || (y.wrong || 0) - (x.wrong || 0));
    if (qs.length > 0) groups.push({ bank: b, qs });
  }
  return { rule, groups, count: groups.reduce((n, g) => n + g.qs.length, 0) };
}
function weakExportText({ rule, groups, count }, scopeName) {
  const now = new Date();
  const lines = [
    `Study Quest 苦手問題リスト（${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} 書き出し）`,
    `条件：${rule.label}　対象：${scopeName}　件数：${count}問`,
    "",
  ];
  let no = 0;
  for (const { bank, qs } of groups) {
    lines.push(`■ ${bank.name}${bank.year ? `（${bank.year}）` : ""}　${qs.length}問`, "");
    for (const q of qs) {
      no++;
      const tw = trailingWrongCount(q);
      const info = [tw > 0 ? `連続✕${tw}回` : null, `正解${q.correct || 0}・不正解${q.wrong || 0}`, formatErrTypes(q.errTypes) ? `原因：${formatErrTypes(q.errTypes)}` : null, q.marked ? "⭐マーク" : null].filter(Boolean).join("　");
      const refs = extractLawRefs([q.q, q.a]).map((r) => r.label);
      lines.push(`【${no}】${info}`);
      lines.push(`Q. ${q.q}`);
      lines.push(`A. ${q.a}`);
      if (refs.length) lines.push(`関連条文：${refs.join("、")}`);
      if (q.memo) lines.push(`メモ：${q.memo}`);
      lines.push("");
    }
  }
  return lines.join("\n");
}
function weakExportCsv({ groups }) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [["問題", "答え", "問題集", "連続不正解", "正解", "不正解", "間違いの原因", "メモ"].map(esc).join(",")];
  for (const { bank, qs } of groups) for (const q of qs) {
    rows.push([q.q, q.a, bank.name + (bank.year ? `（${bank.year}）` : ""), trailingWrongCount(q), q.correct || 0, q.wrong || 0, formatErrTypes(q.errTypes), q.memo || ""].map(esc).join(","));
  }
  return "\uFEFF" + rows.join("\r\n"); // Excelで文字化けしないようBOM付き
}

function WeakExportPanel({ state }) {
  const [open, setOpen] = useState(false);
  const [ruleId, setRuleId] = useState("streak2");
  const [qualId, setQualId] = useState("all");
  const [msg, setMsg] = useState("");
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="jp btn-ghost w-full py-2 text-sm mb-4">📤 苦手問題を書き出す（テキスト・CSV）</button>
    );
  }
  const quals = [...new Set(state.questionBanks.map((b) => b.qualId || "_none_"))];
  const qualName = (k) => k === "all" ? "すべて" : k === "_none_" ? "資格未設定" : ((state.qualifications.find((q) => q.id === k) || {}).name || "資格");
  const result = buildWeakExport(state, ruleId, qualId);
  const stamp = todayStr();
  const doText = () => { downloadTextFile(`studyquest_苦手_${stamp}.txt`, weakExportText(result, qualName(qualId)), "text/plain;charset=utf-8"); setMsg("📄 テキストファイルを保存しました"); };
  const doCsv = () => { downloadTextFile(`studyquest_苦手_${stamp}.csv`, weakExportCsv(result), "text/csv;charset=utf-8"); setMsg("📊 CSVファイルを保存しました"); };
  const doCopy = async () => {
    try { await navigator.clipboard.writeText(weakExportText(result, qualName(qualId))); setMsg("📋 コピーしました（メモアプリなどに貼り付けできます）"); }
    catch (e) { setMsg("コピーできませんでした。テキストで保存をお使いください"); }
  };
  return (
    <Box title="苦手問題の書き出し" icon={<Upload size={18} />}>
      <div className="jp text-xs mb-1" style={{ color: "var(--ink-soft)" }}>書き出す条件</div>
      <div className="grid grid-cols-2 gap-1 mb-3">
        {WEAK_EXPORT_RULES.map((r) => (
          <button key={r.id} onClick={() => setRuleId(r.id)} className="jp text-[11px] py-1.5 px-1" style={{ background: ruleId === r.id ? "var(--brick)" : "var(--paper)", color: ruleId === r.id ? "var(--paper)" : "var(--ink)", border: "1px solid var(--rule)" }}>{r.label}</button>
        ))}
      </div>
      {quals.length > 1 && (
        <>
          <div className="jp text-xs mb-1" style={{ color: "var(--ink-soft)" }}>対象</div>
          <select className="rpg-input mb-3" value={qualId} onChange={(e) => setQualId(e.target.value)}>
            <option value="all">すべての問題集</option>
            {quals.map((k) => <option key={k} value={k}>{qualName(k)}</option>)}
          </select>
        </>
      )}
      <div className="jp text-sm mb-2" style={{ color: result.count > 0 ? "var(--brick)" : "var(--ink-mute)" }}>該当：{result.count}問{result.groups.length > 0 ? `（${result.groups.length}問題集）` : ""}</div>
      <div className="grid grid-cols-3 gap-1">
        <button disabled={result.count === 0} onClick={doText} className="jp btn-primary py-2 text-xs">📄 テキスト</button>
        <button disabled={result.count === 0} onClick={doCsv} className="jp btn-sky py-2 text-xs">📊 CSV</button>
        <button disabled={result.count === 0} onClick={doCopy} className="jp btn-ghost py-2 text-xs">📋 コピー</button>
      </div>
      {msg && <p className="jp text-[11px] mt-2" style={{ color: "var(--sage)" }}>{msg}</p>}
      <p className="jp text-[10px] mt-2" style={{ color: "var(--ink-mute)" }}>
        「連続で間違えた」は、回答日の記録（前回の更新以降に解いた分）から数えます。CSVは「CSVをインポート」でそのまま取り込めるので、苦手だけの問題集を作れます。
      </p>
      <button onClick={() => { setOpen(false); setMsg(""); }} className="jp text-[11px] w-full mt-2 py-1" style={{ background: "transparent", border: "none", color: "var(--ink-mute)", textDecoration: "underline" }}>閉じる</button>
    </Box>
  );
}

// ============ 周回の記録（問題集の選択画面のトップに表示） ============
// 完全制覇した日と正答率（clearHistory）を、問題集ごとにまとめて見せる
// ── 直前見直しノート（印刷用）：苦手・まちがえた問題を科目ごとに並べ、印刷や PDF にできる画面 ──
function PrintNoteButton({ state }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="jp btn-ghost w-full py-2 text-sm mb-4 -mt-2">🖨 直前見直しノート（印刷・PDF）</button>
      {open && <PrintNote state={state} onClose={() => setOpen(false)} />}
    </>
  );
}
function PrintNote({ state, onClose }) {
  const folders = [...(state.folders || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), { id: "", name: "フォルダなし" }];
  const [kind, setKind] = useState("weak"); // weak（苦手）| wrong（一度でもまちがえた）| marked（⭐）
  const [pickF, setPickF] = useState(() => folders.map((f) => f.id));
  const [hideA, setHideA] = useState(false);
  const [limit, setLimit] = useState(100);
  const pickQ = (q) => !q.excluded && (kind === "weak" ? isQuestionWeak(q) : kind === "wrong" ? (q.wrong || 0) > 0 : !!q.marked);
  const groups = folders.filter((f) => pickF.includes(f.id)).map((f) => ({
    f, banks: state.questionBanks.filter((b) => (f.id ? b.folderId === f.id : !b.folderId)).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((b) => ({ b, qs: (b.questions || []).filter(pickQ) })).filter((x) => x.qs.length),
  })).filter((g) => g.banks.length);
  let count = 0;
  const limited = groups.map((g) => ({ ...g, banks: g.banks.map((x) => { const room = Math.max(0, limit - count); const qs = x.qs.slice(0, room); count += qs.length; return { ...x, qs }; }).filter((x) => x.qs.length) })).filter((g) => g.banks.length);
  const total = groups.reduce((a, g) => a + g.banks.reduce((t, x) => t + x.qs.length, 0), 0);
  let no = 0;
  const answers = [];
  const chip = (on) => ({ borderRadius: 999, border: `1px solid ${on ? "var(--gold)" : "var(--rule-soft)"}`, background: on ? "var(--cream)" : "var(--paper)", color: "var(--ink)", fontWeight: on ? 800 : 500, cursor: "pointer" });
  const kindName = { weak: "苦手な問題", wrong: "まちがえたことのある問題", marked: "⭐を付けた問題" }[kind];
  useEffect(() => { document.body.classList.add("sq-printing"); return () => document.body.classList.remove("sq-printing"); }, []);
  return createPortal(
    <div className="sq-print-root" style={{ position: "fixed", inset: 0, zIndex: 80, background: "#fff", overflowY: "auto", color: "#111" }}>
      <style>{`
        @media print {
          body.sq-printing > *:not(.sq-print-root) { display: none !important; }
          .sq-print-root { position: static !important; overflow: visible !important; }
          .sq-noprint { display: none !important; }
          .sq-pn-q { break-inside: avoid; }
          .sq-pn-bank { break-after: auto; }
          @page { margin: 12mm; }
        }
        .sq-pn { font-family: 'Zen Kaku Gothic New', 'Hiragino Kaku Gothic ProN', sans-serif; max-width: 760px; margin: 0 auto; padding: 16px; font-size: 13px; line-height: 1.7; }
        .sq-pn h1 { font-size: 20px; margin: 0 0 2px; font-family: 'Shippori Mincho B1', serif; }
        .sq-pn h2 { font-size: 15px; margin: 18px 0 6px; padding: 2px 8px; border-left: 4px solid #b08a3e; background: #f6f1e4; }
        .sq-pn h3 { font-size: 13px; margin: 10px 0 4px; color: #34508c; }
        .sq-pn-q { display: grid; grid-template-columns: 2.6em 1fr; gap: 2px 6px; padding: 5px 0; border-bottom: 1px dashed #ccc; }
        .sq-pn-q .no { color: #888; font-size: 11px; padding-top: 2px; }
        .sq-pn-q .a { grid-column: 2; color: #1e4b8f; font-weight: 600; }
        .sq-pn-q .memo { grid-column: 2; color: #8a6d2c; font-size: 11px; }
      `}</style>
      <div className="sq-noprint jp" style={{ position: "sticky", top: 0, background: "#fdfbf5", borderBottom: "1px solid #b08a3e", padding: "10px 16px", zIndex: 1 }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="flex-1 text-sm" style={{ fontWeight: 800, color: "#22335c" }}>直前見直しノート</span>
          <button onClick={() => window.print()} disabled={!count} className="btn-primary text-xs px-3 py-1.5">🖨 印刷・PDFにする</button>
          <button onClick={onClose} className="btn-ghost text-xs px-3 py-1.5">閉じる</button>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-1.5 text-[11px]">
          {[["weak", "苦手な問題"], ["wrong", "まちがえたことのある問題"], ["marked", "⭐の問題"]].map(([id, l]) => <button key={id} onClick={() => setKind(id)} className="px-2.5 py-0.5" style={chip(kind === id)}>{l}</button>)}
          <button onClick={() => setHideA(!hideA)} className="px-2.5 py-0.5" style={chip(hideA)}>{hideA ? "☑" : "☐"} 答えは最後にまとめる</button>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-1.5 text-[11px]">
          {folders.map((f) => { const on = pickF.includes(f.id); return <button key={f.id || "none"} onClick={() => setPickF(on ? pickF.filter((x) => x !== f.id) : [...pickF, f.id])} className="px-2.5 py-0.5" style={chip(on)}>{on ? "☑ " : "☐ "}{f.name}</button>; })}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]" style={{ color: "#5b6b8c" }}>
          最大 {[50, 100, 200, 500].map((n) => <button key={n} onClick={() => setLimit(n)} className="px-2 py-0.5" style={chip(limit === n)}>{n}問</button>)}
          <span>　該当 {total}問{total > limit ? `（先頭の${limit}問を表示）` : ""}</span>
        </div>
        <p className="text-[10px] mt-1" style={{ color: "#8a96b0" }}>「印刷・PDFにする」を押すと印刷の画面が開きます。iPhone・iPad では、印刷の画面で「共有 → ファイルに保存」を選ぶとPDFになります。</p>
      </div>
      <div className="sq-pn">
        <h1>直前見直しノート</h1>
        <div style={{ color: "#666", fontSize: 11 }}>{kindName}・{count}問　／　{todayStr().replace(/-/g, "/")} 作成　Study Quest</div>
        {!count && <p style={{ marginTop: 20, color: "#888" }}>該当する問題がありません。条件を変えてみてください。</p>}
        {limited.map((g) => (
          <div key={g.f.id || "none"}>
            <h2>{g.f.name}</h2>
            {g.banks.map(({ b, qs }) => (
              <div key={b.id} className="sq-pn-bank">
                <h3>{b.name}{b.year ? `（${b.year}）` : ""}　{qs.length}問</h3>
                {qs.map((q) => { no++; if (hideA) answers.push({ no, a: q.a }); return (
                  <div key={q.id} className="sq-pn-q">
                    <span className="no">{no}.</span>
                    <span>{q.q}</span>
                    {!hideA && <span className="a">→ {q.a}</span>}
                    {!hideA && q.memo && <span className="memo">メモ：{q.memo}</span>}
                  </div>); })}
              </div>
            ))}
          </div>
        ))}
        {hideA && answers.length > 0 && (
          <div style={{ breakBefore: "page" }}>
            <h2>答え</h2>
            {answers.map((x) => <div key={x.no} className="sq-pn-q"><span className="no">{x.no}.</span><span className="a" style={{ gridColumn: "auto" }}>{x.a}</span></div>)}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
function PlanMaker({ state, onSave, onCancel }) {
  // フォルダ（＋フォルダなし）ごとに問題集を並べる。フォルダの☑で中の問題集をまとめて選べる。いくつかのフォルダにまたがってもよい
  const folders = [...(state.folders || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), { id: "", name: "フォルダなし" }];
  const sc = studyScope(state);
  const banksIn = (fid) => state.questionBanks.filter((b) => (fid ? b.folderId === fid : !b.folderId) && sc.inScope(b)).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const groups = folders.map((f) => ({ f, banks: banksIn(f.id) })).filter((g) => g.banks.length);
  const [picked, setPicked] = useState([]);
  const [open, setOpen] = useState(() => (groups[0] ? { [groups[0].f.id]: true } : {}));
  const [laps, setLaps] = useState(1);
  const [end, setEnd] = useState(addDays(todayStr(), 10));
  const [name, setName] = useState("");
  const [weakOnly, setWeakOnly] = useState(true);
  const allIds = groups.flatMap((g) => g.banks.map((b) => b.id));
  const ids = allIds.filter((id) => picked.includes(id)); // フォルダの順・問題集の順にそろえる
  const days = Math.max(1, daysBetween(todayStr(), end) + 1);
  const total = ids.length * laps;
  const perDay = total ? Math.ceil(total / days) : 0;
  const usedGroups = groups.filter((g) => g.banks.some((b) => picked.includes(b.id)));
  const defName = usedGroups.length === 1 ? `${usedGroups[0].f.name}を${laps}周` : `${ids.length}項目を${laps}周`;
  const toggleGroup = (g) => { const gIds = g.banks.map((b) => b.id); const all = gIds.every((id) => picked.includes(id)); setPicked(all ? picked.filter((id) => !gIds.includes(id)) : [...new Set([...picked, ...gIds])]); };
  const box = (state3) => <span style={{ width: 18, height: 18, flexShrink: 0, borderRadius: 4, border: `1.5px solid ${state3 ? "var(--gold)" : "var(--rule-soft)"}`, background: state3 === "all" ? "var(--gold)" : state3 === "some" ? "var(--cream)" : "var(--paper)", color: state3 === "all" ? "#fff" : "var(--gold)", fontSize: 12, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>{state3 === "all" ? "✓" : state3 === "some" ? "－" : ""}</span>;
  const chip = (on) => ({ borderRadius: 999, border: `1px solid ${on ? "var(--gold)" : "var(--rule-soft)"}`, background: on ? "var(--cream)" : "var(--paper)", color: "var(--ink)", fontWeight: on ? 800 : 500, cursor: "pointer" });
  return (
    <div className="jp space-y-2 p-2" style={{ background: "var(--cream)", border: "1px solid var(--gold)", borderRadius: 10 }}>
      <div className="text-xs" style={{ fontWeight: 800, color: "var(--ink)" }}>学習計画をつくる</div>
      <div className="flex items-center gap-1.5">
        <span className="flex-1 text-[10px]" style={{ color: "var(--ink-soft)" }}>項目（問題集）を選ぶ：{ids.length} / {allIds.length}項目</span>
        <button onClick={() => setPicked(allIds)} className="btn-ghost text-[10px] px-2 py-1">すべて選ぶ</button>
        <button onClick={() => setPicked([])} className="btn-ghost text-[10px] px-2 py-1">すべて外す</button>
      </div>
      <div className="max-h-72 overflow-y-auto space-y-1.5">
        {groups.map((g) => {
          const n = g.banks.filter((b) => picked.includes(b.id)).length;
          const st = n === 0 ? null : n === g.banks.length ? "all" : "some";
          const isOpen = !!open[g.f.id];
          return (
            <div key={g.f.id || "none"} style={{ background: "var(--paper)", border: `1px solid ${st ? "var(--gold)" : "var(--rule-soft)"}`, borderRadius: 8 }}>
              <div className="flex items-center gap-2 px-2 py-1.5">
                <button onClick={() => toggleGroup(g)} aria-label={`${g.f.name}をまとめて選ぶ`} style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>{box(st)}</button>
                <button onClick={() => setOpen({ ...open, [g.f.id]: !isOpen })} className="flex-1 flex items-center gap-1 text-left text-xs" style={{ background: "none", border: "none", color: "var(--ink)", fontWeight: 800, cursor: "pointer" }}>
                  <span className="flex-1 truncate">{g.f.name}</span>
                  <span className="text-[10px]" style={{ color: "var(--ink-mute)", fontWeight: 500 }}>{n}/{g.banks.length}</span>
                  <span style={{ color: "var(--ink-mute)" }}>{isOpen ? "▾" : "▸"}</span>
                </button>
              </div>
              {isOpen && (
                <div className="px-2 pb-1.5 space-y-1">
                  {g.banks.map((b, i) => { const on = picked.includes(b.id); return (
                    <button key={b.id} onClick={() => setPicked(on ? picked.filter((x) => x !== b.id) : [...picked, b.id])} className="w-full flex items-center gap-2 pl-5 pr-1 py-1 text-left text-xs" style={{ background: "transparent", border: "none", borderTop: "1px dashed var(--rule-soft)", color: "var(--ink)", cursor: "pointer" }}>
                      {box(on ? "all" : null)}<span className="text-[10px]" style={{ color: "var(--ink-mute)", minWidth: 16 }}>{i + 1}</span><span className="flex-1 truncate">{b.name}</span><span className="text-[10px]" style={{ color: "var(--ink-mute)" }}>{(b.questions || []).length}問</span>
                    </button>); })}
                </div>
              )}
            </div>
          );
        })}
        {!groups.length && <p className="text-[11px]" style={{ color: "var(--ink-mute)" }}>問題集がまだありません。</p>}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span style={{ color: "var(--ink-soft)" }}>周回</span>
        {[1, 2, 3, 5].map((n) => <button key={n} onClick={() => setLaps(n)} className="px-2.5 py-0.5" style={chip(laps === n)}>{n}周</button>)}
      </div>
      {laps >= 2 && (
        <button onClick={() => setWeakOnly(!weakOnly)} className="w-full flex items-start gap-2 px-2 py-1.5 text-left text-xs" style={{ background: "var(--paper)", border: `1px solid ${weakOnly ? "var(--gold)" : "var(--rule-soft)"}`, borderRadius: 8, color: "var(--ink)", cursor: "pointer" }}>
          {box(weakOnly ? "all" : null)}
          <span><b>2周目からは、苦手な問題だけ解く</b><span className="block text-[10px]" style={{ color: "var(--ink-mute)" }}>前の周でまちがえた問題・自信がなかった問題・⭐を付けた問題だけを出します（リベンジ）。周回のたびに数が減るので、たくさん回せます。</span></span>
        </button>
      )}
      <label className="block text-[10px]" style={{ color: "var(--ink-soft)" }}>いつまでに（期日）
        <input type="date" className="rpg-input text-xs mt-0.5" value={end} min={todayStr()} onChange={(e) => setEnd(e.target.value || todayStr())} />
      </label>
      <input className="rpg-input text-xs" value={name} onChange={(e) => setName(e.target.value)} placeholder={`計画の名前（${defName}）`} />
      <div className="grid grid-cols-2 gap-1.5">
        <button disabled={!total} onClick={() => onSave({ name: name.trim() || defName, folderId: usedGroups.length === 1 ? usedGroups[0].f.id : null, bankIds: ids, laps, start: todayStr(), end, perDay, weakOnly: laps >= 2 && weakOnly })} className="btn-primary py-2 text-xs" style={{ opacity: total ? 1 : 0.5 }}>この計画で始める</button>
        <button onClick={onCancel} className="btn-ghost py-2 text-xs">やめる</button>
      </div>
    </div>
  );
}
// ── 周回の部屋（下のタブ「周回」）：学習計画・今日のタスク・これまでの周回の記録 ──
function LapRoom({ view = "plan", state, actions, rpgActions, recordAnswer, pastReq, onPastOpened, startTimer, stopTimer }) {
  const [dojoFocus, setDojoFocus] = useState(false); // 記述式の道場で解いているあいだは、ほかの欄を隠す
  const active = scopedPlans(state); // 勉強の範囲の世界の計画
  const left = active.reduce((a, p) => a + planToday(p).pending.length, 0);
  const scope = studyScope(state);
  const stamps = state.questionBanks.reduce((a, b) => a + (scope.inScope(b) ? b.clears || 0 : 0), 0);
  const show = !dojoFocus;
  const radio = isRadioQual(mainQual(state)); // 星詠みの書で無線の資格を選んでいるときは、無線の見出しの絵
  const homeWorld = curWorld(state).id === "home"; // 申請書の叩き込みは王都の世界（調査士）のとき
  // 記述式：道場と申請書の叩き込み
  if (view === "kijutsu") return (
    <div className="space-y-4">
      {rpgActions && <KijutsuDojo state={state} actions={rpgActions} pastReq={pastReq} onPastOpened={onPastOpened || (() => {})} startTimer={startTimer} stopTimer={stopTimer} onFocus={setDojoFocus} />}
      {show && homeWorld && <TatakiDeck state={state} actions={rpgActions} pastReq={pastReq} onPastOpened={onPastOpened} />}
      {show && !homeWorld && <p className="jp text-xs text-center" style={{ color: "var(--ink-mute)" }}>申請書の叩き込みは、王都の世界（土地家屋調査士）のときに出ます。</p>}
    </div>
  );
  // 鍛錬（2026年10月22日に冒険から移した）
  if (view === "train") return <TrainingRoom state={state} actions={rpgActions} recordAnswer={recordAnswer} startTimer={startTimer} stopTimer={stopTimer} />;
  // 弱点・分析：弱点集（賞金首もここ）・論点ごとの横断周回・学習の分析・印刷と書き出し
  if (view === "weak") return (
    <div className="space-y-4">
      <StudyScopeBar state={state} />
      <WeakBook state={state} actions={rpgActions} />
      <RontenLap state={state} />
      <StudyAnalysis state={state} />
      <div className="jp text-[11px] -mb-2" style={{ color: "var(--ink-soft)", fontWeight: 700 }}>🖨 印刷・書き出し</div>
      <PrintNoteButton state={state} />
      <WeakExportPanel state={state} />
    </div>
  );
  // 計画・記録
  return (
    <div className="space-y-4">
      {show && (
        <div className="relative overflow-hidden" style={{ borderRadius: 12, border: "1px solid #b08a3e", boxShadow: "inset 0 0 0 3px #fdfbf5, inset 0 0 0 4px rgba(176,138,62,.45)", width: "100%", aspectRatio: "16 / 9" }}>
          <img src={`${ART_URL}${radio ? "laproom-radio.webp" : "laptower.webp"}`} alt={radio ? "周回の部屋 ― 電波と回路を、学びの力に（特殊陸上無線技士 試験対策）" : "周回の塔 ― 測って、解いて、力にする（土地家屋調査士 試験対策）"} className="w-full h-full" style={{ objectFit: "cover", objectPosition: "center 40%" }} />
        </div>
      )}
      {show && (
        <div className="jp grid grid-cols-3 gap-2">
          {[["今日のタスク", active.length ? `あと${left}項目` : "－"], ["進行中の計画", `${active.length}つ`], ["周回スタンプ", `${stamps}個`]].map(([k, v]) => (
            <div key={k} className="text-center" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 8, padding: "6px 2px" }}><div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>{k}</div><div className="text-sm" style={{ fontWeight: 800, color: "var(--ink)" }}>{v}</div></div>
          ))}
        </div>
      )}
      {show && homeWorld && featOn("roadmap") && <RoadmapBanner state={state} />}
      {show && <StudyScopeBar state={state} />}
      {show && <PlanTasks state={state} actions={actions} />}
      {show && <LapGrowth state={state} actions={actions} />}
      {show && <LapForecast state={state} />}
      {show && rpgActions && homeSide(state) && <MockLog state={state} actions={rpgActions} />}
      {show && <LapRecordsPanel state={state} />}
    </div>
  );
}
// ── 学習の分析：思い込み度・条文ごとの理解度・年度別のスコア ──
const ANALYSIS_TABS = [["conf", "思い込み度"], ["speed", "速さ×正確"], ["law", "条文マップ"], ["year", "年度別"], ["kaisei", "法改正"]];
function StudyAnalysis({ state }) {
  const [tab, setTab] = useState("conf");
  return (
    <Box title="学習の分析" icon={<TrendingUp size={18} />}>
      <div className="grid grid-cols-5 gap-1 p-1 mb-3" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 999 }}>
        {ANALYSIS_TABS.map(([id, l]) => <button key={id} onClick={() => setTab(id)} className="jp py-1 text-[10px] md:text-xs" style={{ borderRadius: 999, border: "none", fontWeight: 700, cursor: "pointer", background: tab === id ? "linear-gradient(180deg, #cfae62, #a8833a)" : "transparent", color: tab === id ? "#fffdf6" : "var(--ink-soft)" }}>{l}</button>)}
      </div>
      {tab === "conf" && <OverconfidenceView state={state} />}
      {tab === "speed" && <SpeedAccuracyView state={state} />}
      {tab === "law" && <LawMastery state={state} />}
      {tab === "year" && <YearScores state={state} />}
      {tab === "kaisei" && <LawChangeList state={state} />}
    </Box>
  );
}
// 思い込み度：「◎確実」と答えた次の回にまちがえた割合（＋自信があったのにまちがえた回数）を科目ごとに
function overconfidence(state) {
  const by = new Map(), worst = [];
  state.questionBanks.forEach((b) => {
    const reg = themeOf(b.name).region;
    (b.questions || []).forEach((q) => {
      const ah = (q.ah || []).map((h) => String(h).slice(-1));
      let sure = 0, miss = 0;
      for (let i = 0; i + 1 < ah.length; i++) if (ah[i] === "s") { sure++; if (ah[i + 1] === "w") miss++; }
      const cw = q.cwCnt || 0;
      if (!sure && !cw) return;
      const g = by.get(reg) || { reg, sure: 0, miss: 0, cw: 0 };
      g.sure += sure; g.miss += miss; g.cw += cw; by.set(reg, g);
      if (miss + cw > 0) worst.push({ b, q, n: miss + cw });
    });
  });
  const list = [...by.values()].map((g) => ({ ...g, rate: (g.miss + g.cw) / Math.max(1, g.sure + g.cw) })).sort((a, b) => b.rate - a.rate);
  return { list, worst: worst.sort((a, b) => b.n - a.n).slice(0, 8) };
}
function OverconfidenceView({ state }) {
  const { list, worst } = overconfidence(state);
  if (!list.length) return <p className="jp text-xs py-3 text-center" style={{ color: "var(--ink-mute)" }}>「◎確実」で答えた問題が、もう一度出てくると集計できます。</p>;
  const color = (r) => (r >= 0.25 ? "#c9564e" : r >= 0.12 ? "#d6b56a" : "#6d8454");
  return (
    <div className="jp space-y-2">
      <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>「◎確実」と答えたのに、次に出たときまちがえた割合です。高い科目は「わかったつもり」になりやすい、本番でいちばん危ない所です。</p>
      {list.map((g) => (
        <div key={g.reg}>
          <div className="flex text-[11px]"><span className="flex-1" style={{ color: "var(--ink)", fontWeight: 700 }}>{g.reg}</span><span style={{ color: color(g.rate), fontWeight: 800 }}>{Math.round(g.rate * 100)}%</span><span className="ml-2" style={{ color: "var(--ink-mute)" }}>（確実{g.sure}回中 {g.miss + g.cw}回）</span></div>
          <div style={{ height: 6, borderRadius: 3, background: "var(--beige)", overflow: "hidden" }}><div style={{ width: `${Math.min(100, g.rate * 100 * 2)}%`, height: "100%", background: color(g.rate) }} /></div>
        </div>
      ))}
      {worst.length > 0 && (
        <details className="text-[11px] mt-1">
          <summary style={{ cursor: "pointer", fontWeight: 700, color: "var(--ink)" }}>思い込みが多い問題（{worst.length}）</summary>
          {worst.map(({ b, q, n }) => <div key={q.id} className="py-1" style={{ borderTop: "1px dashed var(--rule-soft)", color: "var(--ink-soft)" }}><b style={{ color: "var(--brick)" }}>{n}回</b>　{String(q.q).slice(0, 60)}{String(q.q).length > 60 ? "…" : ""}<span style={{ color: "var(--ink-mute)" }}>（{b.name}）</span></div>)}
          <button onClick={() => window.dispatchEvent(new CustomEvent("sq-study-items", { detail: worst.map(({ b, q }) => ({ bankId: b.id, bankName: b.name, year: b.year || "", qId: q.id })) }))} className="btn-primary w-full py-1.5 mt-1 text-xs">この問題を解き直す</button>
        </details>
      )}
    </div>
  );
}
// 条文ごとの理解度：その条文を引用している問題の正答率（解いた問題だけ）
const lawMasteryCache = new WeakMap();
function lawMastery(state) {
  const c = lawMasteryCache.get(state.questionBanks);
  if (c) return c;
  const out = {};
  state.questionBanks.forEach((b) => (b.questions || []).forEach((q) => {
    const refs = extractLawRefs([q.q, q.a]);
    const seen = new Set();
    refs.forEach((r) => {
      const k = `${r.law}:${r.art}`;
      if (seen.has(k)) return; seen.add(k);
      const m = out[r.law] || (out[r.law] = {});
      const x = m[r.art] || (m[r.art] = { n: 0, ok: 0, ng: 0 });
      x.n++; x.ok += q.correct || 0; x.ng += q.wrong || 0;
    });
  }));
  lawMasteryCache.set(state.questionBanks, out);
  return out;
}
function LawMastery({ state }) {
  const all = lawMastery(state);
  const laws = lawsInScope(state).filter((l) => all[l.key] && Object.keys(all[l.key]).length); // 選んでいる資格の法令だけ
  const [law0, setLaw] = useState(laws[0] ? laws[0].key : null);
  const law = laws.some((l) => l.key === law0) || !laws.length ? law0 : laws[0].key;
  const [open, setOpen] = useState(null);
  if (!laws.length) return <p className="jp text-xs py-3 text-center" style={{ color: "var(--ink-mute)" }}>問題文や答えに「不登法39条」のような条文が書かれていると、条文ごとの理解度を出せます。</p>;
  const m = all[law] || {};
  const arts = Object.keys(m).sort((a, b) => { const p = (x) => x.split("_").map(Number); const [a1, a2 = 0] = p(a), [b1, b2 = 0] = p(b); return a1 - b1 || a2 - b2; });
  const rateOf = (x) => (x.ok + x.ng ? x.ok / (x.ok + x.ng) : null);
  const color = (r) => (r === null ? "var(--beige)" : r < 0.5 ? "#c9564e" : r < 0.7 ? "#e39a5c" : r < 0.85 ? "#d6c06a" : "#6d8454");
  const weak = arts.filter((a) => { const r = rateOf(m[a]); return r !== null && r < 0.7; }).sort((a, b) => rateOf(m[a]) - rateOf(m[b])).slice(0, 5);
  return (
    <div className="jp">
      <div className="flex flex-wrap gap-1.5 mb-2">{laws.map((l) => <button key={l.key} onClick={() => setLaw(l.key)} className="text-[11px] px-2.5 py-0.5" style={{ borderRadius: 999, border: `1px solid ${law === l.key ? "var(--gold)" : "var(--rule-soft)"}`, background: law === l.key ? "var(--cream)" : "var(--paper)", color: "var(--ink)", fontWeight: law === l.key ? 800 : 500, cursor: "pointer" }}>{l.short}</button>)}</div>
      <div className="flex flex-wrap gap-1">
        {arts.map((a) => { const x = m[a], r = rateOf(x); return (
          <button key={a} onClick={() => setOpen({ law, art: a, para: null, item: null })} title={`${a.replace("_", "条の")}${a.includes("_") ? "" : "条"}：${x.n}問・${r === null ? "未回答" : `正答率${Math.round(r * 100)}%`}`} className="text-[10px]" style={{ minWidth: 34, padding: "3px 4px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.08)", background: color(r), color: r === null ? "var(--ink-mute)" : "#fff", fontWeight: 700, cursor: "pointer" }}>{a.replace("_", "の")}</button>
        ); })}
      </div>
      <div className="flex flex-wrap gap-2 text-[10px] mt-2" style={{ color: "var(--ink-mute)" }}>{[["#c9564e", "50%未満"], ["#e39a5c", "70%未満"], ["#d6c06a", "85%未満"], ["#6d8454", "85%以上"], ["var(--beige)", "まだ解いていない"]].map(([c, l]) => <span key={l} className="flex items-center gap-1"><span style={{ width: 10, height: 10, borderRadius: 2, background: c, display: "inline-block" }} />{l}</span>)}</div>
      {weak.length > 0 && <p className="text-[11px] mt-2" style={{ color: "var(--ink)" }}>弱い条文：{weak.map((a) => `${a.replace("_", "条の")}${a.includes("_") ? "" : "条"}（${Math.round(rateOf(m[a]) * 100)}%）`).join("・")}</p>}
      <p className="text-[10px] mt-1" style={{ color: "var(--ink-mute)" }}>番号を押すと条文が開き、「この条文の問題を解く」でその論点だけを集中して解けます。</p>
      {open && <LawArticleModal target={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
// 法改正のあった条文に関係する問題（「確かめた」にしていないもの）
function LawChangeList({ state }) {
  const changes = useLawChanges();
  if (!changes) return <p className="jp text-xs py-3 text-center" style={{ color: "var(--ink-mute)" }}>読み込み中…</p>;
  const list = [];
  state.questionBanks.forEach((b) => (b.questions || []).forEach((q) => { const ch = lawChangeOf(changes, q); if (ch) list.push({ b, q, ch }); }));
  const nArts = Object.values(changes).reduce((t, m) => t + Object.keys(m).length, 0);
  return (
    <div className="jp space-y-2">
      <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>条文データを新しくしたとき（PCで「node scripts/fetch-laws.mjs」）、内容が変わった条文を記録します。その条文に関係する問題は、古い知識のまま覚えないよう確かめましょう。</p>
      <div className="text-xs" style={{ fontWeight: 800, color: list.length ? "var(--brick)" : "var(--sage)" }}>{nArts ? `変わった条文 ${nArts}条・確かめていない問題 ${list.length}問` : "いまのところ、記録された法改正はありません。"}</div>
      {list.slice(0, 30).map(({ b, q, ch }) => <div key={q.id} className="text-[11px] py-1" style={{ borderTop: "1px dashed var(--rule-soft)", color: "var(--ink-soft)" }}>⚠ {ch.r.label}（{ch.d}）　{String(q.q).slice(0, 50)}…<span style={{ color: "var(--ink-mute)" }}>（{b.name}）</span></div>)}
      {list.length > 0 && <button onClick={() => window.dispatchEvent(new CustomEvent("sq-study-items", { detail: { items: list.slice(0, 30).map(({ b, q }) => ({ bankId: b.id, bankName: b.name, year: b.year || "", qId: q.id })), kind: "kaisei", title: "法改正の確認" } }))} className="btn-primary w-full py-1.5 text-xs">これらの問題を解いて確かめる</button>}
    </div>
  );
}
// 年度別のスコア：問題集の「年度」ごとに、直近の正答率と記憶率
const yearNum = (y) => { const t = String(y || "").trim(); let m; if ((m = t.match(/^R(?:EIWA)?\s*(\d+)/i)) || (m = t.match(/^令和\s*(\d+)/))) return 2018 + Number(m[1]); if ((m = t.match(/^H\s*(\d+)/i)) || (m = t.match(/^平成\s*(\d+)/))) return 1988 + Number(m[1]); if ((m = t.match(/(\d{4})/))) return Number(m[1]); return 0; };
function YearScores({ state }) {
  const sch = getFsrsScheduler(state.srSettings), now = new Date();
  const map = new Map();
  state.questionBanks.forEach((b) => {
    if (!b.year) return;
    const k = String(b.year).trim();
    const g = map.get(k) || { y: k, n: 0, seen: 0, last: 0, lastOk: 0, sumR: 0, banks: new Set() };
    g.banks.add(b.name);
    (b.questions || []).forEach((q) => {
      if (q.excluded) return;
      g.n++;
      const ah = q.ah || [];
      if (ah.length) { g.last++; if (!String(ah[ah.length - 1]).endsWith("w")) g.lastOk++; }
      if (q.fs || q.sr_nextReview) { g.seen++; let r = 0; try { r = sch.get_retrievability(toFsrsCard(q, now), now, false); } catch (e) { r = 0; } g.sumR += r >= 0 && r <= 1 ? r : 0; }
    });
    map.set(k, g);
  });
  const rows = [...map.values()].sort((a, b) => yearNum(b.y) - yearNum(a.y) || (a.y < b.y ? 1 : -1));
  if (!rows.length) return <p className="jp text-xs py-3 text-center" style={{ color: "var(--ink-mute)" }}>問題集に「年度」（R6・H30 など）を入れると、年度ごとのスコアが出ます。問題タブの問題集の編集で入れられます。</p>;
  const color = (r) => (r === null ? "var(--beige)" : r < 0.6 ? "#c9564e" : r < 0.75 ? "#d6b56a" : "#6d8454");
  return (
    <div className="jp">
      <div className="grid text-[10px] pb-1 mb-1" style={{ gridTemplateColumns: "56px 1fr 52px 52px", color: "var(--ink-mute)", borderBottom: "1px solid var(--rule-soft)" }}><span>年度</span><span>直近の正答率</span><span className="text-right">記憶率</span><span className="text-right">解いた</span></div>
      {rows.map((g) => { const r = g.last ? g.lastOk / g.last : null, mem = g.seen ? g.sumR / g.n : null; return (
        <div key={g.y} className="grid items-center text-[11px] py-1" style={{ gridTemplateColumns: "56px 1fr 52px 52px", borderBottom: "1px dashed var(--rule-soft)" }} title={[...g.banks].join("・")}>
          <span style={{ fontWeight: 800, color: "var(--ink)" }}>{g.y}</span>
          <span className="flex items-center gap-1.5 pr-2"><span style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--beige)", overflow: "hidden" }}><span style={{ display: "block", width: `${(r || 0) * 100}%`, height: "100%", background: color(r) }} /></span><span style={{ width: 32, textAlign: "right", fontWeight: 700, color: color(r) === "var(--beige)" ? "var(--ink-mute)" : color(r) }}>{r === null ? "－" : `${Math.round(r * 100)}%`}</span></span>
          <span className="text-right" style={{ color: "var(--ink-soft)" }}>{mem === null ? "－" : `${Math.round(mem * 100)}%`}</span>
          <span className="text-right" style={{ color: "var(--ink-mute)" }}>{g.seen}/{g.n}</span>
        </div>
      ); })}
      <p className="text-[10px] mt-2" style={{ color: "var(--ink-mute)" }}>直近の正答率＝それぞれの問題の、いちばん新しい回答が正解だった割合。記憶率＝いま思い出せる見込み（まだ解いていない問題は0として平均）。</p>
    </div>
  );
}

// 計画の「予定と実際」：予定の線（1日 perDay ずつ）と、実際に済ませた数の線
function PlanChart({ p }) {
  const [open, setOpen] = useState(false);
  const total = planTotal(p);
  const days = Math.max(1, daysBetween(p.start, p.end) + 1);
  const today = todayStr();
  const tIdx = Math.min(days - 1, Math.max(0, daysBetween(p.start, today)));
  const doneDates = Object.values(p.done || {});
  const actualAt = (i) => doneDates.filter((d) => d <= addDays(p.start, i)).length;
  const planAt = (i) => Math.min(total, p.perDay * (i + 1));
  // 前の日までの予定と比べる（今日の分は、今日のうちに解けば遅れではない）
  const actNow = actualAt(tIdx), before = tIdx > 0 ? planAt(tIdx - 1) : 0, todayPlan = planAt(tIdx);
  const diff = actNow < before ? actNow - before : actNow - todayPlan;
  const label = actNow < before ? `予定より ${before - actNow}項目 遅れています` : actNow > todayPlan ? `予定より ${actNow - todayPlan}項目 進んでいます` : actNow === todayPlan ? "今日の分まで終わっています" : `予定どおり（今日の分 あと${todayPlan - actNow}項目）`;
  const W = 300, H = 110, L = 22, R = 6, T = 8, B = 16;
  const X = (i) => L + (days === 1 ? 0 : (i / (days - 1)) * (W - L - R));
  const Y = (v) => T + (1 - v / total) * (H - T - B);
  const planLine = Array.from({ length: days }, (_, i) => `${X(i).toFixed(1)},${Y(planAt(i)).toFixed(1)}`).join(" ");
  const actLine = Array.from({ length: tIdx + 1 }, (_, i) => `${X(i).toFixed(1)},${Y(actualAt(i)).toFixed(1)}`).join(" ");
  const md = (d) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
  return (
    <div className="jp">
      <button onClick={() => setOpen(!open)} className="text-[10px] flex items-center gap-1" style={{ background: "none", border: "none", cursor: "pointer", color: actNow < before ? "#c9564e" : "var(--sage)", fontWeight: 800, padding: 0 }}>
        {label}
        <span style={{ color: "var(--ink-mute)", fontWeight: 500 }}>{open ? "▾ グラフを閉じる" : "▸ グラフで見る"}</span>
      </button>
      {open && (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", marginTop: 2 }} aria-label="予定と実際">
          {[0, 0.5, 1].map((f) => <g key={f}><line x1={L} x2={W - R} y1={Y(total * f)} y2={Y(total * f)} stroke="var(--rule-soft)" strokeWidth=".5" /><text x={L - 3} y={Y(total * f) + 3} fontSize="8" textAnchor="end" fill="var(--ink-mute)">{Math.round(total * f)}</text></g>)}
          <polyline points={planLine} fill="none" stroke="#b08a3e" strokeWidth="1.4" strokeDasharray="4 3" />
          <polyline points={actLine} fill="none" stroke="#4f6fa8" strokeWidth="2" strokeLinejoin="round" />
          <circle cx={X(tIdx)} cy={Y(actualAt(tIdx))} r="3" fill="#4f6fa8" />
          <text x={L} y={H - 3} fontSize="8" fill="var(--ink-mute)">{md(p.start)}</text>
          <text x={W - R} y={H - 3} fontSize="8" textAnchor="end" fill="var(--ink-mute)">{md(p.end)}</text>
          <text x={W - R} y={T + 8} fontSize="8" textAnchor="end" fill="#b08a3e">┄ 予定</text>
          <text x={W - R} y={T + 18} fontSize="8" textAnchor="end" fill="#4f6fa8">― 実際</text>
        </svg>
      )}
    </div>
  );
}
// ── 時間帯ごとの正答率（2026年10月21日）：回答した時刻を player.hourStats = { 時: {n, ok} } に数えておき、いちばん冴えている時間帯を見つける ──
const HOUR_BANDS = [["早朝", 5, 9], ["午前", 9, 12], ["午後", 12, 17], ["夕方", 17, 21], ["夜", 21, 24], ["深夜", 0, 5]];
function HourBands({ state }) {
  const hs = (state.player || {}).hourStats || {};
  const rows = HOUR_BANDS.map(([nm, a, b]) => { let n = 0, ok = 0; for (let h = a; h < b; h++) { const v = hs[h]; if (v) { n += v.n; ok += v.ok; } } return { nm, a, b, n, rate: n ? ok / n : null }; });
  const enough = rows.filter((r) => r.n >= 20);
  const best = enough.length ? enough.reduce((x, y) => (y.rate > x.rate ? y : x)) : null;
  return (
    <div className="jp mt-3 pt-2 space-y-1" style={{ borderTop: "1px dashed var(--rule-soft)" }}>
      <div className="text-[12px]" style={{ fontWeight: 800, color: "var(--ink)" }}>⏰ 時間帯ごとの正答率</div>
      {!rows.some((r) => r.n) ? <p className="text-[10px]" style={{ color: "var(--ink-mute)" }}>これから答えた時刻を記録して、時間帯ごとの正答率を出します。</p> : <>
        {rows.filter((r) => r.n).map((r) => (
          <div key={r.nm} className="flex items-center gap-2 text-[11px]">
            <span style={{ width: 74, color: "var(--ink)" }}>{r.nm}<span className="text-[9px]" style={{ color: "var(--ink-mute)" }}> {r.a}〜{r.b}時</span></span>
            <span className="flex-1" style={{ height: 6, borderRadius: 3, background: "var(--beige)", overflow: "hidden" }}><span style={{ display: "block", width: `${(r.rate || 0) * 100}%`, height: "100%", background: best && best.nm === r.nm ? "#6d8454" : "#d6b56a" }} /></span>
            <span style={{ width: 92, textAlign: "right", color: "var(--ink-soft)" }}>{Math.round((r.rate || 0) * 100)}%・{r.n}問</span>
          </div>
        ))}
        <p className="text-[10px]" style={{ color: "var(--ink-mute)" }}>{best ? `いちばん冴えているのは「${best.nm}」。` : "それぞれ20問以上たまると、いちばん冴えている時間帯を示します。"}本番の試験は午後（13時から）なので、午後の正答率も上げておきましょう。</p>
      </>}
    </div>
  );
}
// ── 速さ×正確さの4分類（2026年10月21日。学習の分析）：最近の回答（ah）の正解率と、思い出すまでの秒数（ts）で問題を4つに分ける ──
const SA_KINDS = [
  { id: "master", name: "速くて正確", icon: "🏅", color: "#4f7a3a", tip: "定着しています。高速周回では飛ばされ、ときどき抜き打ちで出ます。", act: null },
  { id: "slow", name: "遅いが正確", icon: "🐢", color: "#b08a3e", tip: "知識はあります。時間を意識して、速く思い出す練習を。", act: "速く思い出す練習" },
  { id: "rash", name: "速いが不正確", icon: "⚡", color: "#c9564e", tip: "思い込みの危険。問題文の主語・否定・数字に印をつけて読み直す練習を。", act: "読み直しの練習" },
  { id: "lost", name: "遅くて不正確", icon: "🌫", color: "#6c5a96", tip: "理解があやふやです。条文・解説に戻って、理解からやり直しましょう。", act: "理解からやり直す" },
];
function speedAccuracy(state) {
  const slowSec = STUDY_PREFS.slowSec || 25;
  const sc = studyScope(state);
  const out = { master: [], slow: [], rash: [], lost: [] };
  let none = 0;
  state.questionBanks.forEach((b) => {
    if (!sc.inScope(b)) return;
    (b.questions || []).forEach((q) => {
      if (q.excluded) return;
      const ah = (q.ah || []).slice(-5).map((h) => String(h).slice(-1));
      const ts = (q.ts || []).slice(-3);
      if (ah.length < 2 || !ts.length) { if ((q.ah || []).length) none++; return; }
      const acc = ah.filter((m) => m !== "w").length / ah.length;
      const sec = ts.slice().sort((x, y) => x - y)[Math.floor(ts.length / 2)];
      const fast = sec < slowSec, good = acc >= 0.8 && ah[ah.length - 1] !== "w";
      out[fast ? (good ? "master" : "rash") : good ? "slow" : "lost"].push({ b, q, acc, sec });
    });
  });
  out.slow.sort((x, y) => y.sec - x.sec);
  out.rash.sort((x, y) => x.acc - y.acc);
  out.lost.sort((x, y) => x.acc - y.acc || y.sec - x.sec);
  return { ...out, none, slowSec };
}
function SpeedAccuracyView({ state }) {
  const sa = speedAccuracy(state);
  const total = SA_KINDS.reduce((t, k) => t + sa[k.id].length, 0);
  const solve = (k) => window.dispatchEvent(new CustomEvent("sq-study-items", { detail: { items: sa[k.id].slice(0, 20).map(({ b, q }) => ({ bankId: b.id, bankName: b.name, year: b.year || "", qId: q.id })), kind: `sa-${k.id}`, title: `${k.icon} ${k.act}` } }));
  if (!total) return <><p className="jp text-xs" style={{ color: "var(--ink-mute)" }}>2回以上答えた問題がたまると、思い出すまでの秒数と正解率で4つに分けて表示します（秒数は「答えを見る」までの時間）。</p><HourBands state={state} /></>;
  return (
    <div className="jp space-y-2">
      <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>最近5回の正解率（8割以上で「正確」）と、思い出すまでの秒数（{sa.slowSec}秒未満で「速い」）で分けました。{total}問。</p>
      <div className="grid grid-cols-2 gap-1.5">
        {SA_KINDS.map((k) => (
          <div key={k.id} className="px-2 py-1.5" style={{ border: `1.5px solid ${k.color}`, borderRadius: 8, background: "var(--paper)" }}>
            <div className="flex items-baseline gap-1"><span className="text-[12px]" style={{ fontWeight: 800, color: k.color }}>{k.icon} {k.name}</span><span className="flex-1" /><span style={{ fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 18, color: "var(--ink)" }}>{sa[k.id].length}</span></div>
            <div className="text-[10px]" style={{ color: "var(--ink-soft)", lineHeight: 1.5 }}>{k.tip}</div>
            {k.act && sa[k.id].length > 0 && <button onClick={() => solve(k)} className="btn-ghost w-full py-1 mt-1 text-[10px]">{k.act}（{Math.min(20, sa[k.id].length)}問）▶</button>}
          </div>
        ))}
      </div>
      {sa.none > 0 && <p className="text-[10px]" style={{ color: "var(--ink-mute)" }}>秒数の記録がまだない問題が{sa.none}問あります（これから答えると分類されます）。</p>}
      <HourBands state={state} />
    </div>
  );
}
// ── 残りの周回数の見込み（2026年10月21日。周回の部屋）：問題集ごとの周回のペースから、試験日までにあと何周できるかを見積もり、目標の周回数と比べる ──
const LAP_GOALS = [3, 5, 7, 10];
function lapForecast(state) {
  const mq = mainQual(state);
  const exam = mq && mq.examDate ? mq.examDate : null;
  const today = todayStr();
  const left = exam ? daysBetween(today, exam) : null;
  const sc = studyScope(state);
  const goal = (state.displaySettings || {}).lapGoal || 5;
  const rows = state.questionBanks.filter((b) => sc.inScope(b) && (b.questions || []).length && (!mq || !b.qualId || b.qualId === mq.id)).map((b) => {
    const hist = (b.clearHistory || []).filter((h) => h && h.date).map((h) => h.date).sort();
    const total = Math.max(b.clears || 0, hist.length);
    let per = null; // 1周にかかる日数
    if (hist.length >= 2) per = Math.max(1, daysBetween(hist[0], hist[hist.length - 1]) / (hist.length - 1));
    else if (hist.length === 1) per = Math.max(7, daysBetween(hist[0], today));
    const more = left != null && left > 0 && per ? Math.floor(left / per) : 0;
    const proj = total + more;
    const need = left != null && left > 0 && goal > total ? Math.max(1, Math.floor(left / (goal - total))) : null; // 目標に届く1周の日数
    return { b, total, per, proj, short: Math.max(0, goal - proj), need };
  });
  return { exam, left, goal, rows: rows.sort((x, y) => y.short - x.short || x.total - y.total), qual: mq };
}
function LapForecast({ state }) {
  const [all, setAll] = useState(false);
  const f = lapForecast(state);
  if (!f.rows.length) return null;
  const shortN = f.rows.filter((r) => r.short > 0).length;
  const shown = all ? f.rows : f.rows.slice(0, 6);
  return (
    <Box title="試験までの周回の見込み" icon={<TrendingUp size={18} />}>
      <div className="jp space-y-1.5">
        {f.left == null ? <p className="text-[11px]" style={{ color: "var(--ink-mute)" }}>手帳の「資格」で試験日を入れると、試験日までにあと何周できるかを見積もります。</p> : <>
          <div className="flex flex-wrap items-center gap-1 text-[11px]" style={{ color: "var(--ink-soft)" }}>
            <span>{f.qual ? f.qual.name : ""}の試験まで あと{f.left}日。目標</span>
            {LAP_GOALS.map((g) => <button key={g} onClick={() => setDisplay({ lapGoal: g })} className="px-2 py-0.5" style={chipSt(f.goal === g)}>{g}周</button>)}
          </div>
          <div className="text-[12px]" style={{ color: shortN ? "#c9564e" : "#4f7a3a", fontWeight: 800 }}>{shortN ? `いまのペースだと、${shortN}冊が目標の${f.goal}周に届きません` : `全部の問題集が、目標の${f.goal}周に届く見込みです`}</div>
          {shown.map((r) => (
            <div key={r.b.id} className="px-2 py-1" style={{ border: `1px solid ${r.short ? "#e0948a" : "var(--rule-soft)"}`, borderRadius: 6, background: "var(--paper)" }}>
              <div className="flex items-baseline gap-2 text-[11px]"><span className="flex-1 min-w-0 truncate" style={{ color: "var(--ink)", fontWeight: 700 }}>{r.b.name}</span><span style={{ color: "var(--ink-soft)" }}>いま{r.total}周 → 見込み<b style={{ color: r.short ? "#c9564e" : "#4f7a3a" }}>{r.proj}周</b></span></div>
              <div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>{r.per ? `1周 約${Math.round(r.per)}日のペース` : "まだ1周していません"}{r.short && r.need ? `。目標に届くには、1周を${r.need}日以内で` : ""}</div>
            </div>
          ))}
          {f.rows.length > 6 && <button onClick={() => setAll(!all)} className="w-full text-[11px] py-1" style={{ background: "transparent", border: "1px dashed var(--rule-soft)", color: "var(--ink-soft)", cursor: "pointer" }}>{all ? "▲ たたむ" : `▼ すべて（${f.rows.length}冊）`}</button>}
          <p className="text-[10px]" style={{ color: "var(--ink-mute)" }}>ペースは周回の記録（完全制覇の日）から。1周しかしていない問題集は、その日から今日までを1周の日数とみなします。高速周回を使うと1周が速くなります。</p>
        </>}
      </div>
    </Box>
  );
}
// ── 論点ごとの横断周回（2026年10月21日。周回の部屋）：同じ条文の問題を、問題集をまたいで続けて解く。条文の順に1つずつ進め、全部の論点で1周 ──
// 記録は rpg.ronten = { lap, done:{ "法令:条": 日付 }, at:[1周した日] }
function rontenList(state) {
  const sc = studyScope(state);
  const lawOrder = new Map(LAWS.map((l, i) => [l.key, i]));
  const out = [];
  lawIndex(state).forEach((list, k) => {
    const xs = list.filter(({ b, q }) => !q.excluded && sc.inScope(b));
    if (xs.length < 3 || new Set(xs.map((x) => x.b.id)).size < 2) return;
    const [law, art] = k.split(":");
    const lw = LAWS.find((l) => l.key === law);
    out.push({ k, law, art, name: `${lw ? lw.name : law} 第${String(art).includes("_") ? String(art).replace("_", "条の") : `${art}条`}`, xs, weak: xs.filter(({ q }) => isQuestionWeak(q)).length });
  });
  const num = (a) => String(a).split("_").map(Number);
  return out.sort((x, y) => (lawOrder.get(x.law) ?? 99) - (lawOrder.get(y.law) ?? 99) || num(x.art)[0] - num(y.art)[0] || (num(x.art)[1] || 0) - (num(y.art)[1] || 0));
}
function RontenLap({ state }) {
  const [open, setOpen] = useState(false);
  const list = rontenList(state);
  if (!list.length) return null;
  const R = normRpg(state.rpg).ronten || {};
  const done = R.done || {};
  const left = list.filter((x) => !done[x.k]);
  const nxt = left[0];
  const go = (x) => window.dispatchEvent(new CustomEvent("sq-study-items", { detail: { items: shuffle(x.xs).map(({ b, q }) => ({ bankId: b.id, bankName: b.name, year: b.year || "", qId: q.id })), kind: "ronten", key: x.k, total: list.length, title: `論点：${x.name}（${x.xs.length}問）` } }));
  const pct = Math.round(((list.length - left.length) / list.length) * 100);
  return (
    <Box title={`論点ごとの横断周回　第${R.lap || 1}周`} icon={<BookOpen size={18} />}>
      <div className="jp space-y-1.5">
        <p className="text-[11px]" style={{ color: "var(--ink-soft)", lineHeight: 1.7 }}>同じ条文を引用している問題を、問題集をまたいで続けて解きます。1つの論点をまとめて固めると、ひっかけの違いが見えてきます（2つ以上の問題集に、合わせて3問以上ある条文 {list.length}か所）。</p>
        <div style={{ height: 8, borderRadius: 4, background: "var(--beige)", overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #d6b56a, #b08a3e)" }} /></div>
        <div className="text-[10px] text-right" style={{ color: "var(--ink-mute)" }}>この周 {list.length - left.length} / {list.length}か所</div>
        {nxt && <button onClick={() => go(nxt)} className="btn-primary w-full py-2 text-[12px]">次の論点：{nxt.name}（{nxt.xs.length}問{nxt.weak ? `・苦手${nxt.weak}` : ""}）▶</button>}
        <button onClick={() => setOpen(!open)} className="w-full text-[11px] py-1" style={{ background: "transparent", border: "1px dashed var(--rule-soft)", color: "var(--ink-soft)", cursor: "pointer" }}>{open ? "▲ たたむ" : "▼ 論点の一覧（苦手の多い所から選んでも）"}</button>
        {open && <div className="space-y-1" style={{ maxHeight: 320, overflowY: "auto" }}>
          {list.map((x) => <button key={x.k} onClick={() => go(x)} className="w-full text-left text-[11px] px-2 py-1 flex items-center gap-2" style={{ borderRadius: 6, border: "1px solid var(--rule-soft)", background: done[x.k] ? "rgba(109,132,84,0.1)" : "var(--paper)", color: "var(--ink)", cursor: "pointer" }}><span style={{ width: 14, color: "var(--sage)", fontWeight: 900 }}>{done[x.k] ? "✓" : ""}</span><span className="flex-1">{x.name}</span><span style={{ color: "var(--ink-mute)" }}>{x.xs.length}問{x.weak ? <b style={{ color: "#c9564e" }}>・苦手{x.weak}</b> : null}</span></button>)}
        </div>}
      </div>
    </Box>
  );
}
function LapGrowth({ state, actions }) {
  const sc = studyScope(state); // 勉強の範囲の世界の問題集だけ
  const rows = state.questionBanks.filter((b) => sc.inScope(b)).map((b) => {
    const acc = (Array.isArray(b.clearHistory) ? b.clearHistory : []).map((h) => h.accuracy).filter((v) => typeof v === "number");
    if (acc.length < 2) return null;
    const last = acc[acc.length - 1], prev = acc[acc.length - 2];
    const weak = (b.questions || []).filter((q) => !q.excluded && isQuestionWeak(q)).length;
    return { b, acc: acc.slice(-5), last, delta: last - prev, stuck: last - prev <= 0 || last < 70, weak };
  }).filter(Boolean);
  if (!rows.length) return (
    <Box title="周回の伸び" icon={<TrendingUp size={18} />}>
      <p className="jp text-[11px]" style={{ color: "var(--ink-soft)" }}>同じ問題集を2周以上すると、周回ごとの正解率の伸びがここに表示されます。</p>
    </Box>
  );
  const stuck = rows.filter((r) => r.stuck).sort((a, b) => a.last - b.last);
  const growing = rows.filter((r) => !r.stuck).sort((a, b) => b.delta - a.delta);
  const line = (r) => (
    <div key={r.b.id} className="flex items-center gap-2 px-2 py-1.5" style={{ background: "var(--paper)", border: `1px solid ${r.stuck ? "#e0b4ae" : "var(--rule-soft)"}`, borderRadius: 8 }}>
      <span className="flex-1 min-w-0">
        <span className="block text-xs truncate" style={{ fontWeight: 700, color: "var(--ink)" }}>{r.b.name}</span>
        <span className="flex items-end gap-0.5 mt-0.5" style={{ height: 18 }} aria-label={`正解率 ${r.acc.join("→")}%`}>
          {r.acc.map((v, i) => <span key={i} title={`${v}%`} style={{ width: 10, height: `${Math.max(2, v * 0.18)}px`, borderRadius: 2, background: i === r.acc.length - 1 ? (r.stuck ? "#c9564e" : "#6d8454") : "#c8cfdc" }} />)}
          <span className="text-[10px] ml-1" style={{ color: "var(--ink-soft)" }}>{r.acc.join("→")}%</span>
        </span>
      </span>
      <span className="text-[11px]" style={{ fontWeight: 800, color: r.delta > 0 ? "var(--sage)" : "#c9564e", minWidth: 36, textAlign: "right" }}>{r.delta > 0 ? "+" : ""}{r.delta}</span>
      {r.stuck && r.weak > 0 && <button onClick={() => actions.openBank(r.b.id, "revenge")} className="btn-primary text-[10px] px-2 py-1">苦手を解く</button>}
    </div>
  );
  return (
    <Box title="周回の伸び" icon={<TrendingUp size={18} />}>
      <div className="jp space-y-2">
        {stuck.length > 0 && <>
          <div className="text-[11px]" style={{ color: "#c9564e", fontWeight: 800 }}>伸び悩んでいる問題集（{stuck.length}）</div>
          <p className="text-[10px] -mt-1" style={{ color: "var(--ink-mute)" }}>前の周より正解率が上がっていない、または70%に届いていない問題集です。苦手な問題だけを先に解き直すと効果的です。</p>
          {stuck.slice(0, 6).map(line)}
        </>}
        {growing.length > 0 && <>
          <div className="text-[11px] mt-1" style={{ color: "var(--sage)", fontWeight: 800 }}>伸びている問題集（{growing.length}）</div>
          {growing.slice(0, 4).map(line)}
        </>}
      </div>
    </Box>
  );
}
// 試験日までの計画をワンタップで（2026年10月23日）：星詠みの書の資格に試験日があり、範囲の世界に進行中の計画がないとき。
//   範囲の世界の問題集を全部（フォルダの順・問題集の順）、試験の数日前までに○周。2周目からは苦手だけ
function QuickPlan({ state, onSave }) {
  const [laps, setLaps] = useState(3);
  const q = chosenQual(state) ? mainQual(state) : null;
  if (!q || !q.examDate) return null;
  const days0 = daysBetween(todayStr(), q.examDate);
  if (days0 < 3) return null;
  const sc = studyScope(state);
  const fOrder = new Map((state.folders || []).map((f, i) => [f.id, f.order ?? i]));
  const banks = state.questionBanks.filter((b) => sc.inScope(b) && (b.questions || []).length)
    .sort((a, b) => ((fOrder.get(a.folderId) ?? 9999) - (fOrder.get(b.folderId) ?? 9999)) || ((a.order ?? 0) - (b.order ?? 0)));
  if (!banks.length) return null;
  const spare = Math.min(7, Math.max(1, Math.floor(days0 / 10))); // 最後の数日は見直しにあける
  const end = addDays(q.examDate, -spare);
  const days = Math.max(1, daysBetween(todayStr(), end) + 1);
  const perDay = Math.ceil((banks.length * laps) / days);
  const qn = banks.reduce((t, b) => t + b.questions.length, 0);
  const md = (d) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
  const chip = (on) => ({ borderRadius: 999, border: `1px solid ${on ? "var(--gold)" : "var(--rule-soft)"}`, background: on ? "var(--cream)" : "var(--paper)", color: "var(--ink)", fontWeight: on ? 800 : 500, cursor: "pointer" });
  return (
    <div className="p-2.5 space-y-2" style={{ background: "linear-gradient(90deg, #f6ead0, #fdfbf5)", border: "1.5px solid var(--gold)", borderRadius: 10 }}>
      <div className="text-[13px]" style={{ fontWeight: 800, color: "var(--ink)" }}>⚡ おすすめの計画：{q.name}の試験までに全部を回す</div>
      <div className="text-[11px]" style={{ color: "var(--ink-soft)", lineHeight: 1.7 }}>
        問題集 {banks.length}冊（{qn.toLocaleString()}問）を、{md(end)}まで（試験の{spare}日前。残りは見直しの日）に回します。2周目からは苦手だけ。
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px]" style={{ color: "var(--ink-soft)" }}>周回：</span>
        {[1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => setLaps(n)} className="text-[12px] px-2.5 py-0.5" style={chip(laps === n)}>{n}周</button>)}
        <span className="text-[11px] ml-1" style={{ color: "var(--ink)", fontWeight: 800 }}>→ 1日 {perDay}冊</span>
      </div>
      <button onClick={() => onSave({ name: `${q.name}：試験までに${banks.length}冊を${laps}周`, folderId: null, bankIds: banks.map((b) => b.id), laps, start: todayStr(), end, perDay, weakOnly: laps >= 2 })} className="btn-primary w-full py-2 text-xs">この計画で始める</button>
    </div>
  );
}
function PlanTasks({ state, actions }) {
  const plans = state.studyPlans || [];
  const [making, setMaking] = useState(false);
  const [ahead, setAhead] = useState({});
  const active = scopedPlans(state);
  const finished = plans.filter((p) => p.finishedAt);
  const md = (d) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
  const row = (p, k, { done, carried, onToggle }) => {
    const b = planBankOf(state, p, k);
    const lap = Math.floor(k / p.bankIds.length) + 1;
    const weak = p.weakOnly && lap >= 2;
    const weakN = weak && b ? (b.questions || []).filter((q) => !q.excluded && isQuestionWeak(q)).length : 0;
    return (
      <div key={k} className="flex items-center gap-2 px-2 py-1.5" style={{ background: done ? "var(--cream)" : "var(--paper)", border: `1px solid ${done ? "var(--gold)" : carried ? "#c9564e" : "var(--rule-soft)"}`, borderRadius: 8 }}>
        <button onClick={onToggle} aria-label={done ? "済みを取り消す" : "済みにする"} style={{ width: 22, height: 22, flexShrink: 0, borderRadius: 6, border: `1.5px solid ${done ? "var(--gold)" : "var(--rule-soft)"}`, background: done ? "var(--gold)" : "var(--paper)", color: "#fff", fontWeight: 800, cursor: "pointer", lineHeight: 1 }}>{done ? "✓" : ""}</button>
        <span className="flex-1 min-w-0">
          <span className="block text-sm truncate" style={{ fontWeight: 700, color: done ? "var(--ink-mute)" : "var(--ink)", textDecoration: done ? "line-through" : "none" }}>{b ? b.name : "（消えた問題集）"}</span>
          <span className="block text-[10px]" style={{ color: "var(--ink-mute)" }}>{p.laps > 1 ? `${lap}周目・` : ""}{b ? (weak ? <span style={{ color: "#8c79c8", fontWeight: 700 }}>苦手だけ {weakN}問</span> : `${(b.questions || []).length}問`) : ""}{carried ? <span style={{ color: "#c9564e", fontWeight: 700 }}>　繰り越し</span> : ""}</span>
        </span>
        {!done && b && (weak && weakN === 0
          ? <button onClick={onToggle} className="btn-ghost text-[10px] px-2 py-1.5">苦手なし・済みにする</button>
          : <button onClick={() => actions.openBank(b.id, weak ? "revenge" : undefined)} className="btn-primary text-xs px-3 py-1.5">{weak ? "苦手を解く" : "解く"}</button>)}
      </div>
    );
  };
  return (
    <Box title="今日のタスク（学習計画）" icon={<Check size={18} />}>
      <div className="jp space-y-3">
        {!active.length && !making && <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>「○月○日までに、この問題集たちを○周する」と決めると、1日に解く項目を計算して、毎日ここに「今日のタスク」として順番に出します。終わらなかった分は、翌日に繰り越されます。</p>}
        {active.map((p) => {
          const t = planToday(p);
          const doneAll = t.started && !t.pending.length;
          return (
            <div key={p.id} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="flex-1 min-w-0 text-sm truncate" style={{ fontWeight: 800, color: "var(--ink)" }}>{p.name}</span>
                <button onClick={() => { if (confirm(`計画「${p.name}」を消しますか？（問題集や解いた記録は消えません）`)) actions.removePlan(p.id); }} className="text-[10px]" style={{ background: "none", border: "none", color: "var(--ink-mute)", cursor: "pointer" }}>✕ 消す</button>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "var(--beige)", overflow: "hidden" }}><div style={{ width: `${(t.doneN / t.total) * 100}%`, height: "100%", background: "linear-gradient(90deg, #d6b56a, #b08a3e)" }} /></div>
              <PlanChart p={p} />
              <div className="text-[10px]" style={{ color: t.overdue ? "#c9564e" : "var(--ink-soft)" }}>{t.doneN} / {t.total}項目　・　{md(p.end)}まで{t.overdue ? "（期日を過ぎています）" : `（あと${t.daysLeft}日）`}　・　1日 {p.perDay}項目{p.weakOnly ? "　・　2周目から苦手だけ" : ""}{t.carried ? `　・　繰り越し ${t.carried}項目` : ""}</div>
              {t.doneToday.map((k) => row(p, k, { done: true, onToggle: () => actions.togglePlanItem(p.id, k) }))}
              {t.pending.map((k) => row(p, k, { done: false, carried: k < p.perDay * daysBetween(p.start, todayStr()), onToggle: () => actions.togglePlanItem(p.id, k) }))}
              {doneAll && (
                <div className="text-center text-xs py-1" style={{ color: "var(--gold)", fontWeight: 800 }}>今日のタスクは完了です！ おつかれさまでした
                  {t.next && t.next.length > 0 && !ahead[p.id] && <button onClick={() => setAhead({ ...ahead, [p.id]: true })} className="btn-ghost text-[11px] px-3 py-1 ml-2">明日の分を先に解く</button>}
                </div>
              )}
              {doneAll && ahead[p.id] && t.next.map((k) => row(p, k, { done: false, onToggle: () => actions.togglePlanItem(p.id, k) }))}
            </div>
          );
        })}
        {!active.length && !making && <QuickPlan state={state} onSave={(plan) => actions.addPlan(plan)} />}
        {making ? <PlanMaker state={state} onSave={(plan) => { actions.addPlan(plan); setMaking(false); }} onCancel={() => setMaking(false)} />
          : <button onClick={() => setMaking(true)} className="btn-ghost w-full py-2 text-xs">＋ 学習計画をつくる</button>}
        {finished.length > 0 && (
          <details className="text-[11px]" style={{ color: "var(--ink-soft)" }}>
            <summary style={{ cursor: "pointer" }}>達成した計画（{finished.length}）</summary>
            {finished.map((p) => <div key={p.id} className="flex items-center gap-2 py-0.5"><span style={{ color: "var(--gold)" }}>★</span><span className="flex-1 truncate">{p.name}（{planTotal(p)}項目・{md(p.finishedAt)}達成）</span><button onClick={() => actions.removePlan(p.id)} style={{ background: "none", border: "none", color: "var(--ink-mute)", cursor: "pointer" }}>✕</button></div>)}
          </details>
        )}
        <p className="text-[10px]" style={{ color: "var(--ink-mute)" }}>問題集を最後まで解くと自動で✓が付きます。ほかの方法で解いたときは、左の□を押して✓を付けてください。</p>
      </div>
    </Box>
  );
}

// ── 4. 外部の模試の記録：点数の推移と、基準点・合格点の線 ──
function MockLog({ state, actions }) {
  const cfg = rehearsalCfg(state);
  const mocks = normRpg(state.rpg).mocks || [];
  const [f, setF] = useState({ d: todayStr(), name: "", ta: "", ki: "" });
  const [open, setOpen] = useState(false);
  const add = () => { const ta = Number(f.ta), ki = Number(f.ki); if (!(ta >= 0) || !(ki >= 0) || f.ta === "" || f.ki === "") return; actions.addMock({ id: uid(), d: f.d, name: f.name.trim() || "模試", ta, ki }); setF({ ...f, name: "", ta: "", ki: "" }); };
  const W = 300, H = 120, pad = 20, maxV = 100;
  const xs = (i) => pad + (mocks.length < 2 ? (W - pad * 2) / 2 : (i / (mocks.length - 1)) * (W - pad * 2));
  const ys = (v) => H - pad - (v / maxV) * (H - pad * 2);
  const line = (key) => mocks.map((m, i) => `${i ? "L" : "M"}${xs(i).toFixed(1)} ${ys(key(m)).toFixed(1)}`).join(" ");
  const inp = { background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 6, color: "var(--ink)", padding: "4px 6px", fontSize: 12, width: "100%" };
  return (
    <Box title="模試・答練の記録" icon={<TrendingUp size={18} />}>
      <div className="jp space-y-2">
        <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>受けた模試や答練の点数を記録すると、基準点（択一{cfg.mcBase}・記述{cfg.descBase}）と合格点（{cfg.pass}）の線と一緒に推移を見られます。線の値は本番リハーサルの設定と同じです。</p>
        {mocks.length > 0 && (
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block", background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 8 }}>
            <line x1={pad} x2={W - pad} y1={ys(cfg.pass)} y2={ys(cfg.pass)} stroke="#b08a3e" strokeDasharray="4 3" /><text x={W - pad} y={ys(cfg.pass) - 3} textAnchor="end" fontSize="8" fill="#b08a3e">合格点{cfg.pass}</text>
            <path d={line((m) => m.ta + m.ki)} fill="none" stroke="#22335c" strokeWidth="2" />
            <path d={line((m) => m.ta * 2)} fill="none" stroke="#4f8a72" strokeWidth="1.2" strokeDasharray="2 2" />
            <path d={line((m) => m.ki * 2)} fill="none" stroke="#a24a45" strokeWidth="1.2" strokeDasharray="2 2" />
            {mocks.map((m, i) => <g key={m.id}><circle cx={xs(i)} cy={ys(m.ta + m.ki)} r="3" fill={m.ta + m.ki >= cfg.pass && m.ta >= cfg.mcBase && m.ki >= cfg.descBase ? "#b08a3e" : "#22335c"} /><text x={xs(i)} y={ys(m.ta + m.ki) - 5} textAnchor="middle" fontSize="8" fill="#22335c">{m.ta + m.ki}</text></g>)}
          </svg>
        )}
        {mocks.length > 0 && <p className="text-[9px]" style={{ color: "var(--ink-mute)" }}>実線＝合計（100点満点）、緑の点線＝択一×2、赤の点線＝記述×2（どちらも50点満点を100点に直して表示）。金の点は合格の線をすべて越えた回。</p>}
        <button onClick={() => setOpen(!open)} className="btn-ghost w-full py-1.5 text-xs">{open ? "閉じる" : "＋ 点数を記録する"}</button>
        {open && (
          <div className="grid grid-cols-2 gap-1.5">
            <input type="date" value={f.d} onChange={(e) => setF({ ...f, d: e.target.value })} style={inp} />
            <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="名前（例：全国公開模試1）" style={inp} />
            <input type="number" inputMode="decimal" value={f.ta} onChange={(e) => setF({ ...f, ta: e.target.value })} placeholder="択一（50点満点）" style={inp} />
            <input type="number" inputMode="decimal" value={f.ki} onChange={(e) => setF({ ...f, ki: e.target.value })} placeholder="記述（50点満点）" style={inp} />
            <button onClick={add} className="btn-primary py-1.5 text-sm col-span-2">記録する</button>
          </div>
        )}
        {mocks.slice().reverse().slice(0, 8).map((m) => { const ok = m.ta >= cfg.mcBase && m.ki >= cfg.descBase && m.ta + m.ki >= cfg.pass; return (
          <div key={m.id} className="flex items-center gap-2 text-[11px] py-0.5" style={{ borderTop: "1px dashed var(--rule-soft)" }}>
            <span style={{ color: "var(--ink-mute)" }}>{m.d.slice(5).replace("-", "/")}</span><span className="flex-1 truncate" style={{ color: "var(--ink)" }}>{m.name}</span>
            <span style={{ color: m.ta >= cfg.mcBase ? "var(--ink)" : "#c9564e" }}>択{m.ta}</span><span style={{ color: m.ki >= cfg.descBase ? "var(--ink)" : "#c9564e" }}>記{m.ki}</span><b style={{ color: ok ? "#b08a3e" : "var(--ink)" }}>{m.ta + m.ki}{ok ? "◎" : ""}</b>
            <button onClick={() => { if (confirm("この記録を消しますか？")) actions.removeMock(m.id); }} className="text-[10px]" style={{ background: "none", border: "none", color: "var(--ink-mute)", cursor: "pointer" }}>✕</button>
          </div>
        ); })}
      </div>
    </Box>
  );
}
// 欄ドリル：1つの欄だけを、40年分から続けて
function FieldDrill({ kj, field, state, actions, onExit }) {
  const rec = normRpg(state.rpg).kijutsu || {};
  const order = useState(() => {
    const has = (y) => (field === "表示欄" ? true : decideOf(y).some((k) => kjCanon(k) === field));
    const markOf = (y) => (rec.fdrill || {})[`${y.id}#${field}`] || (((rec.res || {})[y.id] || {}).fm || {})[field];
    const rank = (y) => { const m = markOf(y); return m === "x" ? 0 : m === "s" ? 1 : !m ? 2 : 3; };
    return kj.filter(has).map((y) => [rank(y), Math.random(), y]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).slice(0, 10).map((x) => x[2]);
  })[0];
  const [i, setI] = useState(0);
  const [ans, setAns] = useState({});
  const [shown, setShown] = useState(false);
  const [mark, setMark] = useState(null);
  const [tally, setTally] = useState({ o: 0, s: 0, x: 0 });
  const y = order[i];
  if (!y) return (
    <div className="space-y-3">
      <Box title={`欄ドリル：${field}　結果`} icon={<Award size={18} />}>
        <div className="jp text-center space-y-2">
          <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 28, color: "var(--gold)" }}>○{tally.o}　△{tally.s}　✕{tally.x}</div>
          <button onClick={onExit} className="btn-primary w-full py-2">記述式の道場へもどる</button>
        </div>
      </Box>
    </div>
  );
  const key = field === "表示欄" ? "表示欄" : decideOf(y).find((k) => kjCanon(k) === field);
  const { m: model } = modelAnswers(y);
  const hyojiModel = y.kind === "land" ? (y.secs || []).find((s) => s.h === "土地の表示欄") : (y.secs || []).find((s) => s.h === "申請書の要点");
  const hint = key !== "表示欄" ? kjAutoHint(key, model, ans) : null;
  const set = (k, v) => setAns((a) => ({ ...a, [k]: v }));
  const next = () => { actions.logKijutsuField({ id: y.id, field, mark }); setTally((t) => ({ ...t, [mark]: t[mark] + 1 })); setI(i + 1); setAns({}); setShown(false); setMark(null); window.scrollTo({ top: 0 }); };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between jp text-xs"><button onClick={onExit} style={{ color: "var(--ink-soft)", background: "none", border: "none" }}>← 記述式の道場へもどる</button><span style={{ color: "var(--ink-soft)", fontWeight: 700 }}>{i + 1} / {order.length}</span></div>
      <Box title={`欄ドリル：${field}`} icon={<Pencil size={18} />}>
        <div className="jp space-y-2">
          <div className="text-[12px]" style={{ color: "var(--ink)", fontWeight: 800 }}>{y.label}　{y.title}</div>
          {(y.case || []).map((c, k) => <p key={k} className="text-[13px]" style={{ color: "var(--ink)", lineHeight: 1.8 }}>{c}</p>)}
          <div className="text-[12px]" style={{ color: "var(--ink)", fontWeight: 800 }}>{key === "表示欄" ? (y.kind === "land" ? "土地の表示欄" : "建物の表示欄") : key}</div>
          {key === "表示欄" ? <HyojiGrid kind={y.kind} value={ans.hyoji} onChange={(v) => set("hyoji", v)} disabled={shown} /> : <KjFieldInput k={key} ans={ans} set={set} disabled={shown} />}
          {!shown ? <button onClick={() => setShown(true)} className="btn-primary w-full py-2">模範を見る</button> : (<>
            <div className="px-2 py-1.5" style={{ background: "var(--sky-pale)", border: "1px solid var(--gold)", borderRadius: 8 }}>
              <div className="text-[10px]" style={{ color: "var(--ink-mute)", fontWeight: 700 }}>模範</div>
              {key === "表示欄" ? (hyojiModel ? <KjSection sec={hyojiModel} /> : <div className="text-[12px]">（資料にありません）</div>) : <div className="text-[12px]" style={{ color: "var(--ink)", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{model[key] || "（資料にありません）"}</div>}
              {hint && <div className="text-[11px] mt-1" style={{ color: hint.startsWith("✔") ? "var(--sage)" : "#c9564e", fontWeight: 800 }}>{hint}</div>}
            </div>
            <div className="flex gap-1.5">{KJ_MARKS.map(([id, l]) => <button key={id} onClick={() => setMark(id)} className="flex-1 py-1 text-sm" style={{ ...chipSt(mark === id), color: id === "o" ? "var(--sage)" : id === "x" ? "#c9564e" : "var(--gold)", fontWeight: 900 }}>{l}</button>)}</div>
            <button disabled={!mark} onClick={next} className="btn-primary w-full py-2" style={{ opacity: mark ? 1 : 0.5 }}>{i + 1 >= order.length ? "結果へ" : "次の年へ"}</button>
          </>)}
        </div>
      </Box>
    </div>
  );
}
// 欄ごとの弱点表（自己採点の平均。低い順）
function KjFieldTable({ rec, onDrill }) {
  const f = rec.fields || {};
  const rows = KJ_FIELDS.filter((k) => f[k] && f[k].n).map((k) => ({ k, n: f[k].n, r: f[k].pts / f[k].n })).sort((a, b) => a.r - b.r);
  return (
    <div className="px-2 py-1.5 space-y-1" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 8 }}>
      <div className="text-[11px]" style={{ color: "var(--ink)", fontWeight: 800 }}>欄ごとの出来（低い順）・タップで欄ドリル</div>
      {rows.length === 0 && <div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>答案を自己採点すると、欄ごとの出来がここに出ます。</div>}
      {rows.map((x) => (
        <button key={x.k} onClick={() => onDrill(x.k)} className="w-full text-left" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <div className="flex text-[11px]"><span className="flex-1" style={{ color: "var(--ink)" }}>{x.k}</span><span style={{ color: x.r < 0.6 ? "#c9564e" : x.r < 0.8 ? "var(--gold)" : "var(--sage)", fontWeight: 800 }}>{Math.round(x.r * 100)}%</span><span style={{ color: "var(--ink-mute)", width: 44, textAlign: "right" }}>{x.n}回</span></div>
          <div style={{ height: 5, borderRadius: 3, background: "var(--beige)", overflow: "hidden" }}><div style={{ width: `${x.r * 100}%`, height: "100%", background: x.r < 0.6 ? "#c9564e" : x.r < 0.8 ? "#d6b56a" : "#6d8454" }} /></div>
        </button>
      ))}
      <div className="flex flex-wrap gap-1 pt-1 text-[10px]">{KJ_FIELDS.map((k) => <button key={k} onClick={() => onDrill(k)} className="px-2 py-0.5" style={chipSt(false)}>{k}</button>)}</div>
    </div>
  );
}
// 今日タブ：記述式の復習の日が来た年度
// ── 申請書の叩き込み（2026年10月20日。周回の部屋のいちばん上。カードは src/game/kjdeck.js）──
// 記録は rpg.kjDeck = { c:{カードid:{b,nx,n,ok,d0}}, newPer, newDay:{d,k}, lap:{no, ok:{カードid:1}, at:[1周した日]}, total }
let KJ_DECK = null;
function useKjDeck() {
  const years = usePastData("kijutsu");
  if (!years || !years.length) return { deck: null, years };
  if (!KJ_DECK || KJ_DECK.years !== years) KJ_DECK = { years, deck: buildDeck(years) };
  return { deck: KJ_DECK.deck, years };
} // 択一：ちがう日に3回続けて正解で卒業（討伐依頼書と同じ）
function weakBook(state, deck) {
  const r = normRpg(state.rpg);
  const sc = studyScope(state);
  // 択一：科目（地域）ごと
  const regions = new Map();
  let qN = 0;
  state.questionBanks.forEach((b) => {
    if (!sc.inScope(b)) return;
    (b.questions || []).forEach((q) => {
      if (q.excluded || (q.wrong || 0) < 2) return;
      const st = correctDayStreak(q);
      if (st >= WEAK_GRAD) return;
      const rg = themeOf(b.name).region || "そのほか";
      if (!regions.has(rg)) regions.set(rg, []);
      regions.get(rg).push({ b, q, st });
      qN++;
    });
  });
  const qs = [...regions.entries()].map(([name, list]) => ({ name, list: list.sort((x, y) => (y.q.wrong || 0) - (x.q.wrong || 0)) }))
    .sort((a, b) => byRegionOrder({ name: a.name }, { name: b.name }));
  // 叩き込み：まちがえたことがあり、まだ箱2以下のカード（項目ごと）
  const recs = (r.kjDeck || {}).c || {};
  const cards = deck ? deck.filter((c) => { const x = recs[c.id]; return x && (x.n || 0) > (x.ok || 0) && (x.b || 0) <= 2; })
    .map((c) => ({ c, miss: (recs[c.id].n || 0) - (recs[c.id].ok || 0) })).sort((a, b) => b.miss - a.miss) : [];
  // 計算：3回以上解いて正解率7割未満の種類・前回まちがえた本試験の計算・無線工学の計算
  const c2 = r.calc2 || {};
  const calc = Object.entries(c2.stats || {}).filter(([t, s]) => CALC2_TYPES[t] && s.n >= 3 && s.ok / s.n < 0.7).map(([t, s]) => ({ t, name: CALC2_TYPES[t], rate: s.ok / s.n, n: s.n })).sort((a, b) => a.rate - b.rate);
  const past = Object.entries((c2.past || {}).res || {}).filter(([k, x]) => /^[LF]:/.test(k) && x.n && !x.last).map(([k, x]) => ({ k: k[0], era: k.slice(2), n: x.n, ok: x.ok || 0 }));
  const radio = Object.entries((r.radioCalc || {}).stats || {}).filter(([, s]) => s.n >= 3 && s.ok / s.n < 0.7).map(([t, s]) => ({ t, name: (RADIO_CALC_TYPES.find((x) => x.id === t) || {}).name || t, rate: s.ok / s.n, n: s.n })).sort((a, b) => a.rate - b.rate);
  // 記述式：自己採点の平均が6割未満の欄
  const kf = (r.kijutsu || {}).fields || {};
  const fields = KJ_FIELDS.filter((k) => kf[k] && kf[k].n >= 2 && kf[k].pts / kf[k].n < 0.6).map((k) => ({ k, rate: kf[k].pts / kf[k].n, n: kf[k].n })).sort((a, b) => a.rate - b.rate);
  if (chosenQual(state)) { // 資格を選んでいるときは、その資格の鍛錬の分だけ
    if (curWorld(state).id === "home") radio.length = 0;
    else { cards.length = 0; calc.length = 0; past.length = 0; fields.length = 0; }
  }
  const total = qN + cards.length + calc.length + past.length + radio.length + fields.length;
  return { qs, qN, cards, calc, past, radio, fields, total };
}
const weakItems = (list) => list.map(({ b, q }) => ({ bankId: b.id, bankName: b.name, year: b.year || "", qId: q.id }));
function WeakBook({ state, actions }) {
  const { deck } = useKjDeck();
  const prizes = bounties(state).filter((x) => x.ready); // 卒業した賞金首（賞金を受け取れる）
  const [open, setOpen] = useState(null); // 開いている科目
  const [print, setPrint] = useState(false);
  const wb = weakBook(state, deck);
  const fieldName = (id) => (DECK_FIELDS.find((f) => f.id === id) || {}).name || id;
  const solve = (list, title) => window.dispatchEvent(new CustomEvent("sq-study-items", { detail: { items: weakItems(list.slice(0, 30)), kind: "weakbook", title } }));
  const go = (detail) => window.dispatchEvent(new CustomEvent("sq-open-past", { detail }));
  const row = { borderRadius: 8, border: "1px solid var(--rule-soft)", background: "var(--paper)", color: "var(--ink)" };
  const sec = (t) => <div className="text-[11px] mt-2 mb-1" style={{ color: "var(--ink)", fontWeight: 800 }}>{t}</div>;
  return (
    <Box title={`弱点集（自動）　${wb.total}`} icon={<Skull size={18} />}>
      <div className="jp space-y-1">
        <p className="text-[11px]" style={{ color: "var(--ink-soft)", lineHeight: 1.7 }}>まちがいの記録から自動で集めた「自分だけの弱点」です。択一は<b>ちがう日に{WEAK_GRAD}回続けて正解</b>、叩き込みのカードは3日あけて正解、計算は正解率7割で<b>卒業</b>して消えます。択一の弱点は「賞金首」で、卒業すると賞金を受け取れます。</p>
        {prizes.length > 0 && actions && (
          <div className="px-2 py-1.5 space-y-1" style={{ background: "rgba(214,181,106,0.15)", border: "1px solid var(--gold)", borderRadius: 8 }}>
            <div className="text-[11px]" style={{ color: "var(--ink)", fontWeight: 800 }}>🏆 卒業した賞金首 {prizes.length}　賞金を受け取れます</div>
            {prizes.slice(0, 10).map(({ b, q, prize }) => (
              <div key={q.id} className="flex items-center gap-2">
                <span className="flex-1 min-w-0 text-[11px] truncate" style={{ color: "var(--ink)" }}>{q.q}<span className="text-[9px] ml-1" style={{ color: "var(--ink-mute)" }}>{b.name}</span></span>
                <button onClick={() => actions.claimBounty(q.id, prize)} className="btn-primary text-[10px] px-2 py-0.5" style={{ whiteSpace: "nowrap" }}>討伐！ {prize}G</button>
              </div>
            ))}
          </div>
        )}
        {wb.total === 0 && <div className="text-[12px] text-center py-2" style={{ color: "var(--sage)", fontWeight: 700 }}>いま弱点はありません。この調子です！</div>}
        {wb.qN > 0 && <>
          {sec(`択一（2回以上まちがえた問題）${wb.qN}問`)}
          {wb.qs.map((g) => (
            <div key={g.name} style={row}>
              <div className="flex items-center gap-2 px-2 py-1.5">
                <button onClick={() => setOpen(open === g.name ? null : g.name)} className="flex-1 text-left text-[12px]" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink)", fontWeight: 700 }}>{open === g.name ? "▼" : "▶"} {g.name}<span className="text-[10px] ml-1" style={{ color: "var(--ink-mute)", fontWeight: 500 }}>{g.list.length}問</span></button>
                <button onClick={() => solve(g.list, `弱点集：${g.name}`)} className="btn-primary text-[10px] px-2 py-1">解く{g.list.length > 30 ? "（30問）" : ""}</button>
              </div>
              {open === g.name && <div className="px-2 pb-2 space-y-1">
                {g.list.slice(0, 40).map(({ b, q, st }) => (
                  <div key={q.id} className="text-[11px] px-2 py-1" style={{ borderTop: "1px dashed var(--rule-soft)" }}>
                    <div style={{ color: "var(--ink)" }}><span className="text-[10px] px-1 mr-1" style={{ background: "#7a2b2b", color: "#fdfbf5", borderRadius: 3, fontWeight: 800 }}>✕{q.wrong}</span>{q.q}</div>
                    <div className="text-[10px]" style={{ color: "var(--sky-deep)" }}>→ {q.a}</div>
                    {q.rule && <div className="text-[10px]" style={{ color: "#8a6d2c" }}>自分ルール：{q.rule}</div>}
                    <div className="text-[9px]" style={{ color: "var(--ink-mute)" }}>{b.name}　卒業まで {Array.from({ length: WEAK_GRAD }, (_, i) => <span key={i} style={{ color: i < st ? "#b08a3e" : "var(--rule-soft)" }}>★</span>)}　賞金 {80 + Math.min(10, q.wrong || 0) * 10}G</div>
                  </div>
                ))}
                {g.list.length > 40 && <div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>ほか{g.list.length - 40}問（印刷では全部出ます）</div>}
              </div>}
            </div>
          ))}
          {wb.qs.length > 1 && <button onClick={() => solve(wb.qs.flatMap((g) => g.list).sort((x, y) => (y.q.wrong || 0) - (x.q.wrong || 0)), "弱点集：まちがいの多い順")} className="btn-sky w-full py-1.5 text-[11px]">全科目から、まちがいの多い順に30問</button>}
        </>}
        {wb.cards.length > 0 && <>
          {sec(`申請書の叩き込み（まちがえたカード）${wb.cards.length}枚`)}
          <div className="px-2 py-1.5" style={row}>
            {DECK_FIELDS.map((f) => { const n = wb.cards.filter((x) => x.c.field === f.id).length; return n ? <span key={f.id} className="text-[10px] mr-2" style={{ color: "var(--ink-soft)" }}>{f.name} {n}枚</span> : null; })}
            <div className="text-[10px] mt-1 truncate" style={{ color: "var(--ink-mute)" }}>例：{wb.cards.slice(0, 3).map((x) => x.c.title || x.c.head).join("／")}</div>
            <button onClick={() => go({ to: "laps", tataki: true, ids: wb.cards.slice(0, 30).map((x) => x.c.id) })} className="btn-primary w-full py-1.5 mt-1 text-[11px]">このカードだけ叩き込む（{Math.min(30, wb.cards.length)}枚）</button>
          </div>
        </>}
        {(wb.calc.length > 0 || wb.past.length > 0 || wb.radio.length > 0) && <>
          {sec("計算（正解率7割未満・前回まちがえた計算）")}
          {wb.calc.length > 0 && <button onClick={() => go({ to: "calc", types: wb.calc.slice(0, 5).map((x) => x.t) })} className="w-full text-left text-[11px] px-2 py-1.5 flex items-center gap-2" style={{ ...row, cursor: "pointer" }}><span className="flex-1">{wb.calc.slice(0, 5).map((x) => `${x.name} ${Math.round(x.rate * 100)}%`).join("・")}</span><span style={{ color: "var(--sky-deep)", fontWeight: 800, whiteSpace: "nowrap" }}>5問 ▶</span></button>}
          {wb.past.map((x) => <button key={x.k + x.era} onClick={() => go({ to: "calc", kind: x.k, id: x.era })} className="w-full text-left text-[11px] px-2 py-1.5 flex items-center gap-2" style={{ ...row, border: "1px solid #e0948a", cursor: "pointer" }}><span className="flex-1">本試験の計算：{eraLabel(x.era)}の{x.k === "L" ? "土地" : "建物"}（{x.ok}/{x.n}回正解）</span><span style={{ color: "var(--sky-deep)", fontWeight: 800 }}>解く ▶</span></button>)}
          {wb.radio.length > 0 && <div className="text-[11px] px-2 py-1.5" style={row}>無線工学：{wb.radio.map((x) => `${x.name} ${Math.round(x.rate * 100)}%`).join("・")}<div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>計算の塔の「無線工学の計算ドリル」→「苦手な種類から10問」で</div></div>}
        </>}
        {wb.fields.length > 0 && <>
          {sec("記述式の欄（自己採点の平均が6割未満）")}
          <div className="text-[11px] px-2 py-1.5" style={row}>{wb.fields.map((x) => `${x.k} ${Math.round(x.rate * 100)}%`).join("・")}<div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>記述式の道場の「欄ごとの出来」から、その欄だけの欄ドリルへ</div></div>
        </>}
        {wb.total > 0 && <button onClick={() => setPrint(true)} className="btn-ghost w-full py-1.5 mt-2 text-[11px]">🖨 弱点集を印刷・PDFにする</button>}
      </div>
      {print && <WeakBookPrint wb={wb} fieldName={fieldName} onClose={() => setPrint(false)} />}
    </Box>
  );
}
function WeakBookPrint({ wb, fieldName, onClose }) {
  const [hideA, setHideA] = useState(false);
  useEffect(() => { document.body.classList.add("sq-printing"); return () => document.body.classList.remove("sq-printing"); }, []);
  let no = 0;
  const answers = [];
  return createPortal(
    <div className="sq-print-root" style={{ position: "fixed", inset: 0, zIndex: 80, background: "#fff", overflowY: "auto", color: "#111" }}>
      <style>{`
        @media print {
          body.sq-printing > *:not(.sq-print-root) { display: none !important; }
          .sq-print-root { position: static !important; overflow: visible !important; }
          .sq-noprint { display: none !important; }
          .sq-pn-q { break-inside: avoid; }
          @page { margin: 12mm; }
        }
        .sq-pn { font-family: 'Zen Kaku Gothic New', 'Hiragino Kaku Gothic ProN', sans-serif; max-width: 760px; margin: 0 auto; padding: 16px; font-size: 13px; line-height: 1.7; }
        .sq-pn h1 { font-size: 20px; margin: 0 0 2px; font-family: 'Shippori Mincho B1', serif; }
        .sq-pn h2 { font-size: 15px; margin: 18px 0 6px; padding: 2px 8px; border-left: 4px solid #b08a3e; background: #f6f1e4; }
        .sq-pn-q { display: grid; grid-template-columns: 2.6em 1fr; gap: 2px 6px; padding: 5px 0; border-bottom: 1px dashed #ccc; }
        .sq-pn-q .no { color: #888; font-size: 11px; padding-top: 2px; }
        .sq-pn-q .a { grid-column: 2; color: #1e4b8f; font-weight: 600; white-space: pre-wrap; }
        .sq-pn-q .memo { grid-column: 2; color: #8a6d2c; font-size: 11px; }
      `}</style>
      <div className="sq-noprint jp" style={{ position: "sticky", top: 0, background: "#fdfbf5", borderBottom: "1px solid #b08a3e", padding: "10px 16px", zIndex: 1 }}>
        <div className="flex items-center gap-2">
          <span className="flex-1 text-sm" style={{ fontWeight: 800, color: "#22335c" }}>弱点集</span>
          <button onClick={() => setHideA(!hideA)} className="text-[11px] px-2.5 py-0.5" style={chipSt(hideA)}>{hideA ? "☑" : "☐"} 答えは最後にまとめる</button>
          <button onClick={() => window.print()} className="btn-primary text-xs px-3 py-1.5">🖨 印刷・PDFにする</button>
          <button onClick={onClose} className="btn-ghost text-xs px-3 py-1.5">閉じる</button>
        </div>
        <p className="text-[10px] mt-1" style={{ color: "#8a96b0" }}>iPhone・iPad では、印刷の画面で「共有 → ファイルに保存」を選ぶとPDFになります。</p>
      </div>
      <div className="sq-pn">
        <h1>弱点集</h1>
        <div style={{ color: "#666", fontSize: 11 }}>択一 {wb.qN}問・叩き込み {wb.cards.length}枚　／　{todayStr().replace(/-/g, "/")} 作成　Study Quest</div>
        {wb.qs.map((g) => (
          <div key={g.name}>
            <h2>{g.name}（{g.list.length}問）</h2>
            {g.list.map(({ b, q }) => { no++; if (hideA) answers.push({ no, a: q.a }); return (
              <div key={q.id} className="sq-pn-q">
                <span className="no">{no}.</span>
                <span>{q.q}<span style={{ color: "#a33", fontSize: 10 }}>　✕{q.wrong}　{b.name}</span></span>
                {!hideA && <span className="a">→ {q.a}</span>}
                {!hideA && q.rule && <span className="memo">自分ルール：{q.rule}</span>}
                {!hideA && q.memo && <span className="memo">メモ：{q.memo}</span>}
              </div>); })}
          </div>
        ))}
        {wb.cards.length > 0 && (
          <div>
            <h2>申請書の叩き込み（{wb.cards.length}枚）</h2>
            {wb.cards.map(({ c, miss }) => { no++; const a = c.mode === "docs" ? (c.docs || []).join("、") : c.answer; if (hideA) answers.push({ no, a }); return (
              <div key={c.id} className="sq-pn-q">
                <span className="no">{no}.</span>
                <span>【{fieldName(c.field)}】{c.head}　{c.ask}<span style={{ color: "#a33", fontSize: 10 }}>　✕{miss}</span></span>
                {!hideA && <span className="a">→ {a}</span>}
              </div>); })}
          </div>
        )}
        {(wb.calc.length > 0 || wb.past.length > 0 || wb.radio.length > 0 || wb.fields.length > 0) && (
          <div>
            <h2>計算・記述式の苦手</h2>
            {wb.calc.map((x) => <div key={x.t} className="sq-pn-q"><span className="no">計算</span><span>{x.name}（正解率 {Math.round(x.rate * 100)}%・{x.n}回）</span></div>)}
            {wb.past.map((x) => <div key={x.k + x.era} className="sq-pn-q"><span className="no">本試験</span><span>{eraLabel(x.era)}の{x.k === "L" ? "土地" : "建物"}の計算（前回まちがえた）</span></div>)}
            {wb.radio.map((x) => <div key={x.t} className="sq-pn-q"><span className="no">無線</span><span>{x.name}（正解率 {Math.round(x.rate * 100)}%・{x.n}回）</span></div>)}
            {wb.fields.map((x) => <div key={x.k} className="sq-pn-q"><span className="no">記述</span><span>{x.k}の欄（自己採点の平均 {Math.round(x.rate * 100)}%・{x.n}回）</span></div>)}
          </div>
        )}
        {hideA && answers.length > 0 && (
          <div style={{ breakBefore: "page" }}>
            <h2>答え</h2>
            {answers.map((x) => <div key={x.no} className="sq-pn-q"><span className="no">{x.no}.</span><span className="a" style={{ gridColumn: "auto" }}>{x.a}</span></div>)}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
function TatakiDeck({ state, actions, pastReq, onPastOpened }) {
  const { deck, years } = useKjDeck();
  const [fieldF, setFieldF] = useState("all");
  const [kindF, setKindF] = useState("all");
  const [run, setRun] = useState(null); // { mode, queue:[id], back:{id:回数}, okN, ngN, done }
  const [cur, setCur] = useState(null); // { id, opts, picked:[], phase:"ask"|"show"|"result", grade }
  const [showCase, setShowCase] = useState(false);
  const boxRef = useRef(null);
  const today = todayStr();
  const K = normRpg(state.rpg).kjDeck || {};
  const recs = K.c || {};
  const lapOk = (K.lap || {}).ok || {};
  const lapNo = (K.lap || {}).no || 1;
  const newPer = K.newPer || 20;
  const newToday = K.newDay && K.newDay.d === today ? K.newDay.k : 0;
  const byId = deck ? new Map(deck.map((c) => [c.id, c])) : new Map();
  const filt = (c) => (fieldF === "all" || c.field === fieldF) && (kindF === "all" || c.kind === kindF);
  const dueCards = deck ? deck.filter((c) => recs[c.id] && recs[c.id].nx <= today && filt(c)).sort((a, b) => (recs[a.id].nx < recs[b.id].nx ? -1 : recs[a.id].nx > recs[b.id].nx ? 1 : recs[a.id].b - recs[b.id].b)) : [];
  const freshCards = deck ? deck.filter((c) => !recs[c.id] && filt(c)).slice(0, Math.max(0, newPer - newToday)) : [];
  const lapLeft = deck ? deck.filter((c) => !lapOk[c.id] && filt(c)) : [];
  const card = cur && byId.get(cur.id);
  const open = (id) => { const c = byId.get(id); if (!c) return; setShowCase(false); setCur({ id, opts: c.mode === "choice" ? choicesOf(c) : null, picked: [], phase: "ask", grade: null }); };
  const begin = (mode, ids) => {
    const list = ids ? ids.map((id) => byId.get(id)).filter(Boolean) : mode === "lap" ? lapLeft.slice(0, 20) : [...dueCards, ...freshCards];
    if (!list.length) return;
    setRun({ mode, queue: list.map((c) => c.id), back: {}, okN: 0, ngN: 0, done: 0 });
    open(list[0].id);
    setTimeout(() => boxRef.current && boxRef.current.scrollIntoView({ block: "start", behavior: "smooth" }), 50);
  };
  // 今日タブ・ホームの「叩き込み」から来たら、すぐに今日のカードを始める
  useEffect(() => { if (pastReq && pastReq.tataki && deck) { if (!run) begin(pastReq.ids ? "weak" : "today", pastReq.ids); onPastOpened && onPastOpened(); } }, [pastReq, !!deck]);
  // 答えを記録（again＝同じ回のやり直しなら箱は動かさない）
  const commit = (grade, extra) => {
    const again = (run.back[cur.id] || 0) > 0;
    actions.deckAnswer({ id: cur.id, grade, again, total: deck.length });
    setCur({ ...cur, ...(extra || {}), phase: "result", grade });
    setRun({ ...run, okN: run.okN + (grade === "ng" ? 0 : 1), ngN: run.ngN + (grade === "ng" ? 1 : 0) });
  };
  const next = () => {
    const q = run.queue.slice(1);
    const back = { ...run.back };
    // まちがえたカードは、この回の最後にもう一度（2回まで）
    if (cur.grade === "ng" && (back[cur.id] || 0) < 2) { q.push(cur.id); back[cur.id] = (back[cur.id] || 0) + 1; }
    const r2 = { ...run, queue: q, back, done: run.done + 1 };
    setRun(r2);
    if (q.length) open(q[0]); else setCur(null);
  };
  const fieldName = (id) => (DECK_FIELDS.find((f) => f.id === id) || {}).name || id;
  const chip = (on) => ({ borderRadius: 999, border: `1px solid ${on ? "var(--gold)" : "var(--rule-soft)"}`, background: on ? "var(--cream)" : "var(--paper)", color: "var(--ink)", fontWeight: on ? 800 : 500, cursor: "pointer" });

  if (!deck) return <Box title="申請書の叩き込み" icon={<ScrollIcon size={18} />}><p className="jp text-xs" style={{ color: "var(--ink-mute)" }}>カードを準備しています…</p></Box>;

  // ── 解いているあいだ ──
  if (run && cur && card) {
    const rest = run.queue.length;
    const isOk = cur.grade && cur.grade !== "ng";
    return (
      <div ref={boxRef}>
        <Box title={`申請書の叩き込み　のこり${rest}枚`} icon={<ScrollIcon size={18} />}>
          <div className="jp space-y-2">
            <div className="flex items-center gap-2 text-[10px]" style={{ color: "var(--ink-mute)" }}>
              <span className="px-1.5" style={{ border: "1px solid var(--rule-soft)", borderRadius: 4 }}>{fieldName(card.field)}</span>
              <span className="flex-1 truncate">{card.head}{(run.back[cur.id] || 0) > 0 ? "　（もう一度）" : ""}</span>
              <span>○{run.okN}　✕{run.ngN}</span>
              <button onClick={() => { setRun(null); setCur(null); }} className="btn-ghost text-[10px] px-2 py-0.5">やめる</button>
            </div>
            {card.caseText && (
              <div className="text-[12px] px-2 py-1.5" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 8, color: "var(--ink-soft)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                {showCase || card.caseText.length <= 140 ? card.caseText : `${card.caseText.slice(0, 140)}…`}
                {card.caseText.length > 140 && <button onClick={() => setShowCase(!showCase)} className="ml-1 text-[10px] underline" style={{ background: "none", border: "none", color: "var(--sky-deep)", cursor: "pointer" }}>{showCase ? "短く" : "全文"}</button>}
              </div>
            )}
            <div className="qtext text-base px-1" style={{ color: "var(--ink)", fontWeight: 700, lineHeight: 1.7 }}>{card.ask}</div>

            {card.mode === "choice" && (
              <div className="space-y-1.5">
                {cur.opts.map((o, k) => {
                  const done = cur.phase === "result", right = o === card.answer, mine = cur.picked[0] === o;
                  return <button key={k} onClick={() => { if (done) return; commit(o === card.answer ? "ok" : "ng", { picked: [o] }); }} className="w-full text-left px-2.5 py-2 text-sm" style={{ borderRadius: 8, border: `1.5px solid ${done && right ? "#6d8454" : done && mine ? "#c9564e" : "var(--rule-soft)"}`, background: done && right ? "rgba(109,132,84,0.12)" : done && mine ? "rgba(201,86,78,0.08)" : "var(--paper)", color: "var(--ink)", cursor: done ? "default" : "pointer", whiteSpace: "pre-wrap" }}>{done && right ? "✓ " : done && mine ? "✕ " : ""}{o}</button>;
                })}
              </div>
            )}

            {card.mode === "docs" && (() => {
              const done = cur.phase === "result";
              const want = new Set(card.docs), mine = new Set(cur.picked);
              return (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {docOptions(card).map((d) => {
                      const on = mine.has(d), need = want.has(d);
                      const st = !done ? (on ? { b: "var(--sky-deep)", bg: "var(--sky-pale)" } : { b: "var(--rule-soft)", bg: "var(--paper)" })
                        : need && on ? { b: "#6d8454", bg: "rgba(109,132,84,0.15)" } : need ? { b: "#c9564e", bg: "rgba(201,86,78,0.1)" } : on ? { b: "#d6a23e", bg: "rgba(214,162,62,0.15)" } : { b: "var(--rule-soft)", bg: "var(--paper)" };
                      return <button key={d} onClick={() => { if (done) return; setCur({ ...cur, picked: on ? cur.picked.filter((x) => x !== d) : [...cur.picked, d] }); }} className="text-[12px] px-2 py-1" style={{ borderRadius: 999, border: `1.5px solid ${st.b}`, background: st.bg, color: "var(--ink)", fontWeight: on || (done && need) ? 800 : 500, cursor: done ? "default" : "pointer", opacity: done && !on && !need ? 0.45 : 1 }}>{done && need && on ? "✓ " : done && need ? "足りない " : done && on ? "余計 " : ""}{d}</button>;
                    })}
                  </div>
                  {!done && <button onClick={() => { const ok = cur.picked.length === want.size && cur.picked.every((d) => want.has(d)); commit(ok ? "ok" : "ng"); }} className="btn-primary w-full py-2 text-sm">答え合わせ（{cur.picked.length}つ選択）</button>}
                </>
              );
            })()}

            {card.mode === "flip" && cur.phase === "ask" && <button onClick={() => setCur({ ...cur, phase: "show" })} className="btn-info w-full py-2"><Eye size={14} /> 頭の中で答えてから、めくる</button>}
            {card.mode === "flip" && cur.phase !== "ask" && (
              <>
                <div className="text-[13px] px-2 py-2" style={{ background: "var(--sky-pale)", border: "1px solid var(--gold)", borderRadius: 8, color: "var(--ink)", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{card.answer}</div>
                {cur.phase === "show" && (
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => commit("ng")} className="btn-danger py-2 text-xs">✕ 思い出せない</button>
                    <button onClick={() => commit("hard")} className="btn-info py-2 text-xs">△ あやふや</button>
                    <button onClick={() => commit("ok")} className="btn-success py-2 text-xs">◎ 言えた</button>
                  </div>
                )}
              </>
            )}

            {cur.phase === "result" && (
              <>
                {card.mode !== "flip" && <div className="text-[12px] px-2 py-1.5" style={{ background: isOk ? "rgba(109,132,84,0.1)" : "rgba(201,86,78,0.06)", border: `1px solid ${isOk ? "#6d8454" : "#e0948a"}`, borderRadius: 8, color: "var(--ink)", whiteSpace: "pre-wrap", lineHeight: 1.7 }}><b style={{ color: isOk ? "#4f7a3a" : "#c9564e" }}>{isOk ? "✓ 正解！" : "✕ 正解は"}</b>　{card.answer}</div>}
                {card.why && <div className="text-[11px] px-2" style={{ color: "var(--ink-soft)", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>📝 {card.why}</div>}
                {!isOk && <div className="text-[10px] px-2" style={{ color: "var(--ink-mute)" }}>このカードは、この回の最後にもう一度出ます。明日も出ます。</div>}
                <button onClick={next} className="btn-primary w-full py-2">{run.queue.length > 1 || cur.grade === "ng" ? "次のカードへ" : "終わる"}</button>
              </>
            )}
          </div>
        </Box>
      </div>
    );
  }

  // ── ふだんの画面（今日の枚数・周回・項目ごとの覚えた度合い・今日の計算）──
  const stats = DECK_FIELDS.map((f) => {
    const cs = deck.filter((c) => c.field === f.id && (kindF === "all" || c.kind === kindF));
    const m = cs.filter((c) => (recs[c.id] || {}).b >= DECK_MASTER).length;
    const l = cs.filter((c) => recs[c.id] && (recs[c.id].b || 0) < DECK_MASTER).length;
    return { ...f, n: cs.length, m, l, due: cs.filter((c) => recs[c.id] && recs[c.id].nx <= today).length };
  });
  const lapDone = deck.filter((c) => lapOk[c.id]).length;
  const eras = (years || []).filter((y) => y.kind === "land").map((y) => y.era);
  const cd = calcDueList(state, eras, today);
  return (
    <div ref={boxRef}>
      <Box title="申請書の叩き込み（周回）" icon={<ScrollIcon size={18} />}>
        <div className="jp space-y-2">
          <p className="text-[11px]" style={{ color: "var(--ink-soft)", lineHeight: 1.7 }}>本試験40年分・暗記チート・申請書の場面から作った{deck.length}枚のカードで、「登記の目的・原因及びその日付・添付書類・申請人・税・期限」を毎日まわします。正解するたびに次に出る日が延び（翌日→3日→7日→14日→30日→60日）、まちがえたカードはその日のうちにもう一度、翌日からやり直しです。</p>
          {run && !cur && (
            <div className="px-2 py-1.5 text-center" style={{ background: "var(--cream)", border: "1px solid var(--gold)", borderRadius: 8 }}>
              <div className="text-sm" style={{ fontWeight: 800, color: "var(--ink)" }}>おつかれさまでした！　{run.done}枚（○{run.okN}・✕{run.ngN}）</div>
              <button onClick={() => setRun(null)} className="text-[11px] underline mt-0.5" style={{ background: "none", border: "none", color: "var(--ink-mute)", cursor: "pointer" }}>とじる</button>
            </div>
          )}
          <div className="px-2 py-1.5" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 8 }}>
            <div className="flex items-baseline gap-2"><span style={{ fontFamily: "'Shippori Mincho B1', serif", fontWeight: 800, fontSize: 16, color: "#b08a3e" }}>第{lapNo}周</span><span className="text-[11px] flex-1" style={{ color: "var(--ink-soft)" }}>この周で正解したカード {lapDone} / {deck.length}</span>{(K.lap || {}).at && (K.lap.at.length > 0) && <span className="text-[10px]" style={{ color: "var(--ink-mute)" }}>{K.lap.at.length}周 完了</span>}</div>
            <div style={{ height: 6, borderRadius: 3, background: "var(--beige)", overflow: "hidden", marginTop: 4 }}><div style={{ width: `${(lapDone / deck.length) * 100}%`, height: "100%", background: "linear-gradient(90deg,#d6b56a,#b08a3e)" }} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => begin("today")} disabled={!dueCards.length && !freshCards.length} className="btn-primary py-2.5 text-sm">今日の叩き込み<br /><span className="text-[11px]" style={{ fontWeight: 500 }}>復習{dueCards.length}枚・新しい{freshCards.length}枚</span></button>
            <button onClick={() => begin("lap")} disabled={!lapLeft.length} className="btn-plum py-2.5 text-sm">周回を進める<br /><span className="text-[11px]" style={{ fontWeight: 500 }}>この周のつづき{Math.min(20, lapLeft.length)}枚</span></button>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[10px]" style={{ color: "var(--ink-mute)" }}>項目</span>
            {[["all", "すべて"], ...DECK_FIELDS.map((f) => [f.id, f.name])].map(([id, nm]) => <button key={id} onClick={() => setFieldF(id)} className="text-[11px] px-2 py-0.5" style={chip(fieldF === id)}>{nm}</button>)}
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[10px]" style={{ color: "var(--ink-mute)" }}>種類</span>
            {[["all", "すべて"], ["land", "土地"], ["bldg", "建物"]].map(([id, nm]) => <button key={id} onClick={() => setKindF(id)} className="text-[11px] px-2 py-0.5" style={chip(kindF === id)}>{nm}</button>)}
            <span className="flex-1" />
            <span className="text-[10px]" style={{ color: "var(--ink-mute)" }}>1日の新しいカード</span>
            {[10, 20, 30].map((n) => <button key={n} onClick={() => actions.deckSetNew(n)} className="text-[11px] px-2 py-0.5" style={chip(newPer === n)}>{n}</button>)}
          </div>
          <div className="space-y-1">
            {stats.map((s) => (
              <div key={s.id}>
                <div className="flex text-[11px]" style={{ color: "var(--ink)" }}><span className="flex-1" style={{ fontWeight: 700 }}>{s.name}</span><span style={{ color: "var(--ink-mute)" }}>覚えた {s.m}・練習中 {s.l}・まだ {s.n - s.m - s.l}{s.due ? `・今日 ${s.due}` : ""}</span></div>
                <div className="flex" style={{ height: 7, borderRadius: 4, overflow: "hidden", background: "var(--beige)" }}>
                  <div style={{ width: `${(s.m / Math.max(1, s.n)) * 100}%`, background: "#6d8454" }} />
                  <div style={{ width: `${(s.l / Math.max(1, s.n)) * 100}%`, background: "#d6b56a" }} />
                </div>
              </div>
            ))}
            <div className="text-[9px]" style={{ color: "var(--ink-mute)" }}>緑＝覚えた（30日以上あいても言えた）・金＝練習中・灰＝まだ</div>
          </div>
          <div className="px-2 py-1.5" style={{ background: "var(--paper)", border: "1px dashed var(--rule-soft)", borderRadius: 8 }}>
            <div className="text-[12px] mb-1" style={{ fontWeight: 800, color: "var(--ink)" }}>🧮 今日の計算</div>
            {!cd.past.length && !cd.types.length && <div className="text-[11px]" style={{ color: "var(--ink-mute)" }}>今日もう一度解く計算はありません。{cd.untried > 0 ? `本試験の計算で、まだ解いていない年が${cd.untried}題あります。` : ""}</div>}
            {cd.past.slice(0, 5).map((x) => (
              <button key={`${x.k}${x.era}`} onClick={() => window.dispatchEvent(new CustomEvent("sq-open-past", { detail: { to: "calc", kind: x.k, id: x.era } }))} className="w-full text-left text-[11px] px-2 py-1 mb-1 flex items-center gap-2" style={{ borderRadius: 6, border: `1px solid ${x.r.last ? "var(--rule-soft)" : "#e0948a"}`, background: "var(--paper)", color: "var(--ink)", cursor: "pointer" }}>
                <span className="flex-1">本試験の計算　{eraLabel(x.era)}の{x.k === "L" ? "土地（座標）" : "建物（床面積）"}</span><span style={{ color: x.r.last ? "var(--ink-mute)" : "#c9564e" }}>{x.r.last ? `前回○・${x.r.ok}回正解` : "前回✕"}</span><span style={{ color: "var(--sky-deep)", fontWeight: 800 }}>解く ▶</span>
              </button>
            ))}
            {cd.types.length > 0 && <button onClick={() => window.dispatchEvent(new CustomEvent("sq-open-past", { detail: { to: "calc", types: cd.types.slice(0, 5) } }))} className="w-full text-left text-[11px] px-2 py-1 flex items-center gap-2" style={{ borderRadius: 6, border: "1px solid var(--rule-soft)", background: "var(--paper)", color: "var(--ink)", cursor: "pointer" }}><span className="flex-1">計算の種類：{cd.types.slice(0, 5).map((t) => CALC2_TYPES[t]).join("・")}</span><span style={{ color: "var(--sky-deep)", fontWeight: 800 }}>5問 ▶</span></button>}
          </div>
        </div>
      </Box>
    </div>
  );
}
// 当日の確認カード（計算マニュアル・論点編・攻略本の「早見表と当日の確認」）
function KeyText({ text }) {
  const parts = String(text).split(/(［[^］]*］)/).filter(Boolean);
  const isKey = (t) => t.startsWith("［") && /^(SHIFT|ALPHA|STO|OPTN|ENG|MENU|AC|DEL|Ans|M\+|S⇔D|x⁻¹|sin|cos|tan|√|°′″|\(−\)|\(|\)|\+|−|×|÷|=|◀|▶|\d)$/.test(t.slice(1, -1));
  return <>{parts.map((t, i) => isKey(t) ? <span key={i} style={{ ...KEYCAP, fontSize: 10, padding: "0 4px", margin: "0 1px" }}>{t.slice(1, -1)}</span> : <Fragment key={i}>{t}</Fragment>)}</>;
}
function HayamiCards({ onExit }) {
  const data = usePastData("hayami");
  const [tab, setTab] = useState(0);
  const card = (data || [])[tab];
  return (
    <div className="space-y-3">
      {onExit && <div className="flex items-center justify-between jp text-xs"><button onClick={onExit} style={{ color: "var(--ink-soft)", background: "none", border: "none" }}>← もどる</button></div>}
      <Box title="当日の確認カード" icon={<Bookmark size={18} />}>
        <div className="jp space-y-2">
          {!data ? <div className="text-[11px]" style={{ color: "var(--ink-mute)" }}>読み込んでいます…</div> : (<>
            <div className="grid grid-cols-3 gap-1 p-1" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 999 }}>
              {data.map((c, i) => <button key={i} onClick={() => setTab(i)} className="py-1 text-[11px]" style={{ borderRadius: 999, border: "none", fontWeight: 700, cursor: "pointer", background: tab === i ? "linear-gradient(180deg, #cfae62, #a8833a)" : "transparent", color: tab === i ? "#fffdf6" : "var(--ink-soft)" }}>{c.title}</button>)}
            </div>
            {card && card.secs.map((sec, i) => (
              <div key={i} className="px-2 py-1.5 space-y-1" style={{ background: /当日/.test(sec.h) ? "rgba(214,181,106,0.12)" : "var(--paper)", border: `1px solid ${/当日/.test(sec.h) ? "var(--gold)" : "var(--rule-soft)"}`, borderRadius: 8 }}>
                <div className="text-[12px]" style={{ color: "var(--sky-deep)", fontWeight: 800 }}>{sec.h}</div>
                {sec.items.map((it, j) => it.p ? <div key={j} className="text-[12px]" style={{ color: "var(--ink)", lineHeight: 1.8 }}><KeyText text={it.p} /></div> : (
                  <div key={j} style={{ overflowX: "auto" }}><table style={{ borderCollapse: "collapse", width: "100%", fontSize: 11 }}><tbody>{it.tbl.map((r, a) => <tr key={a}>{r.map((c, b) => <td key={b} style={{ border: "1px solid var(--rule-soft)", padding: "3px 5px", verticalAlign: "top", color: "var(--ink)", fontWeight: a === 0 ? 700 : 400, background: a === 0 ? "var(--cream)" : "transparent" }}><KeyText text={c.join(" ")} /></td>)}</tr>)}</tbody></table></div>
                ))}
              </div>
            ))}
          </>)}
        </div>
      </Box>
    </div>
  );
}
// 目的⇄原因⇄日付のクイズ（10問）
function CheatQuiz({ actions, onExit }) {
  const make = () => {
    const sh = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((x) => x[1]);
    return sh(CHEAT_ROWS).slice(0, 10).map((r, i) => {
      const type = i % 3;
      if (type === 0) { const opts = sh([r, ...sh(CHEAT_ROWS.filter((x) => x !== r && x.c !== r.c)).slice(0, 3)]); return { r, ask: `「${r.p}」の原因及びその日付（書き方）は？`, opts: opts.map((x) => x.c), ans: r.c }; }
      if (type === 1) { const opts = sh([r, ...sh(CHEAT_ROWS.filter((x) => x !== r && x.p !== r.p)).slice(0, 3)]); return { r, ask: `原因「${r.c}」になる登記は？`, opts: opts.map((x) => x.p), ans: r.p }; }
      const ds = sh([...new Set(CHEAT_ROWS.map((x) => x.d).filter((d) => d !== r.d))]).slice(0, 3);
      return { r, ask: `「${r.p}」の原因に付ける日付は？`, opts: sh([r.d, ...ds]), ans: r.d };
    });
  };
  const [qs, setQs] = useState(make);
  const [i, setI] = useState(0);
  const [pick, setPick] = useState(null);
  const [ok, setOk] = useState(0);
  const [table, setTable] = useState(false);
  const q = qs[i];
  const choose = (o) => { if (pick != null) return; const good = o === q.ans; setPick(o); if (good) setOk(ok + 1); SFX.play(good ? "defeat" : "miss"); actions.logKijutsuDrill("cheat", good, q.r.p); };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between jp text-xs"><button onClick={onExit} style={{ color: "var(--ink-soft)", background: "none", border: "none" }}>← 記述式の道場へもどる</button><span style={{ color: "var(--ink-soft)", fontWeight: 700 }}>{Math.min(i + 1, qs.length)} / {qs.length}　正解 {ok}</span></div>
      <Box title="登記の目的 ⇄ 原因 ⇄ 日付" icon={<Bookmark size={18} />}>
        <div className="jp space-y-2">
          {q ? (<>
            <div className="text-sm px-2 py-1.5" style={{ background: "var(--cream)", border: "1px solid var(--rule-soft)", borderRadius: 8, color: "var(--ink)", fontWeight: 700 }}>{q.ask}</div>
            {q.opts.map((o, k) => <button key={k} onClick={() => choose(o)} className="w-full text-left text-[12px] px-2 py-1.5" style={{ ...chipSt(pick === o), borderRadius: 8, borderColor: pick != null && o === q.ans ? "var(--sage)" : pick === o ? "#e0948a" : "var(--rule-soft)", background: pick != null && o === q.ans ? "rgba(109,132,84,0.12)" : pick === o ? "rgba(201,86,78,0.08)" : "var(--paper)" }}>{o}</button>)}
            {pick != null && <div className="text-[11px] px-2 py-1" style={{ color: "var(--ink-soft)" }}>{q.r.g}：{q.r.p} ／ {q.r.c} ／ 日付：{q.r.d}</div>}
            {pick != null && <button onClick={() => { setI(i + 1); setPick(null); }} className="btn-primary w-full py-2">{i + 1 >= qs.length ? "結果へ" : "次へ"}</button>}
          </>) : (
            <div className="text-center space-y-2"><div style={{ fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 28, color: "var(--gold)" }}>{ok} / {qs.length}</div><button onClick={() => { setQs(make()); setI(0); setOk(0); setPick(null); }} className="btn-primary w-full py-2">もう10問</button></div>
          )}
          <button onClick={() => setTable(!table)} className="btn-ghost w-full py-1.5 text-[11px]">{table ? "早見表を閉じる" : "📋 早見表を見る"}</button>
          {table && (
            <div className="space-y-1">
              {CHEAT_ROWS.map((r, k) => <div key={k} className="text-[11px] px-2 py-1" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 6, color: "var(--ink)" }}><b>{r.p}</b>（{r.g}）<div>{r.c}</div><div style={{ color: "var(--ink-soft)" }}>日付：{r.d}</div></div>)}
              <div className="text-[10px] px-2 py-1" style={{ background: "rgba(214,181,106,0.12)", border: "1px dashed var(--gold)", borderRadius: 6, color: "var(--ink)" }}><b>暗記チートとの違い（本試験の答えに合わせました）</b>{CHEAT_FIXES.map((f, k) => <div key={k}>・{f}</div>)}</div>
            </div>
          )}
        </div>
      </Box>
    </div>
  );
}
// 登記記録の「申請前 → 申請後」
function RecordDrill({ actions, onExit }) {
  const [order] = useState(() => REC_CASES.map((c) => c.id).sort(() => Math.random() - 0.5));
  const [i, setI] = useState(0);
  const [taps, setTaps] = useState([]);
  const [pick, setPick] = useState(null);
  const [done, setDone] = useState(null);
  const [ok, setOk] = useState(0);
  const c = REC_CASES.find((x) => x.id === order[i]);
  const [opts, setOpts] = useState(() => (c ? [...c.opts].sort(() => Math.random() - 0.5) : []));
  const key = (r, k) => `${r}:${k}`;
  const isUnder = (r, k) => c.under.some(([a, b]) => a === r && b === k);
  const check = () => {
    const want = c.under.map(([a, b]) => key(a, b)).sort().join(","), got = [...taps].sort().join(",");
    const good = want === got && pick === c.opts[0];
    SFX.play(good ? "defeat" : "miss");
    if (good) setOk(ok + 1);
    actions.logKijutsuDrill("rec", good, c.id);
    setDone({ good, underOk: want === got, optOk: pick === c.opts[0] });
  };
  const next = () => { const ni = i + 1; setI(ni); setTaps([]); setPick(null); setDone(null); const nc = REC_CASES.find((x) => x.id === order[ni]); setOpts(nc ? [...nc.opts].sort(() => Math.random() - 0.5) : []); };
  const tdS = { border: "1px solid var(--ink-soft)", padding: "5px 6px", fontSize: 12, color: "var(--ink)" };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between jp text-xs"><button onClick={onExit} style={{ color: "var(--ink-soft)", background: "none", border: "none" }}>← 記述式の道場へもどる</button><span style={{ color: "var(--ink-soft)", fontWeight: 700 }}>{Math.min(i + 1, order.length)} / {order.length}　正解 {ok}</span></div>
      <Box title="登記記録　申請前 → 申請後" icon={<BookOpen size={18} />}>
        {c ? (
          <div className="jp space-y-2">
            <div className="text-[11px]" style={{ color: "var(--ink-soft)", fontWeight: 700 }}>{c.kind}：{c.title}</div>
            <div className="text-[13px] px-2 py-1.5" style={{ background: "var(--cream)", border: "1px solid var(--rule-soft)", borderRadius: 8, color: "var(--ink)", lineHeight: 1.7 }}>{c.event}</div>
            <div className="text-[11px]" style={{ color: "var(--ink)", fontWeight: 800 }}>① 下線が引かれる（抹消される）欄をタップ</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", background: "var(--paper)" }}>
                <tbody>
                  <tr>{c.cols.map((h) => <td key={h} style={{ ...tdS, fontSize: 10, fontWeight: 700, textAlign: "center", background: "var(--cream)" }}>{h}</td>)}</tr>
                  {c.before.map((row, r) => (
                    <tr key={r}>{row.map((cell, k) => { const on = taps.includes(key(r, k)); const showU = done && isUnder(r, k); return (
                      <td key={k} onClick={() => { if (done) return; setTaps(on ? taps.filter((x) => x !== key(r, k)) : [...taps, key(r, k)]); }} style={{ ...tdS, cursor: done ? "default" : "pointer", background: on ? "rgba(214,181,106,0.25)" : "transparent", textDecorationLine: (done ? showU : on) ? "underline" : "none", textDecorationColor: "#c9564e", textDecorationThickness: 2 }}>{cell || "　"}</td>
                    ); })}</tr>
                  ))}
                  {done && <tr>{c.after.map((cell, k) => <td key={k} style={{ ...tdS, background: "rgba(109,132,84,0.1)", fontWeight: 700 }}>{cell || "　"}</td>)}</tr>}
                </tbody>
              </table>
            </div>
            <div className="text-[11px]" style={{ color: "var(--ink)", fontWeight: 800 }}>② 新しく記録される原因及びその日付は？</div>
            {opts.map((o) => <button key={o} onClick={() => !done && setPick(o)} className="w-full text-left text-[12px] px-2 py-1.5" style={{ ...chipSt(pick === o), borderRadius: 8, borderColor: done && o === c.opts[0] ? "var(--sage)" : done && pick === o ? "#e0948a" : pick === o ? "var(--gold)" : "var(--rule-soft)" }}>{o}</button>)}
            {!done ? <button disabled={!pick} onClick={check} className="btn-primary w-full py-2" style={{ opacity: pick ? 1 : 0.5 }}>答え合わせ</button> : (<>
              <div className="text-center" style={{ fontWeight: 900, color: done.good ? "var(--sage)" : "#c9564e" }}>{done.good ? "正解！" : `${done.underOk ? "下線は○" : "下線が✕"}・${done.optOk ? "原因は○" : "原因が✕"}`}</div>
              <div className="text-[12px] px-2 py-1.5" style={{ background: "var(--sky-pale)", border: "1px solid var(--gold)", borderRadius: 8, color: "var(--ink)", lineHeight: 1.7 }}>{c.why}</div>
              <button onClick={next} className="btn-primary w-full py-2">{i + 1 >= order.length ? "結果へ" : "次の場面へ"}</button>
            </>)}
          </div>
        ) : (
          <div className="jp text-center space-y-2"><div style={{ fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 28, color: "var(--gold)" }}>{ok} / {order.length}</div><button onClick={onExit} className="btn-primary w-full py-2">もどる</button></div>
        )}
        <p className="jp text-[10px] mt-2" style={{ color: "var(--ink-mute)" }}>場面は学習用に作ったものです（原因の書き方は本試験の答えに合わせています）。</p>
      </Box>
    </div>
  );
}
// 記述式の道場：一覧
function KijutsuDojo({ state, actions, pastReq, onPastOpened, startTimer, stopTimer, onFocus }) {
  const kj = usePastData("kijutsu");
  const [kind, setKind] = useState("land");
  const [view, setView] = useState(null); // {mode: "run"|"cheat"|"rec", id}
  const rec = normRpg(state.rpg).kijutsu || {};
  const res = rec.res || {};
  useEffect(() => { if (pastReq && pastReq.key) { if (pastReq.key === "hayami") setView({ mode: "hayami" }); else { setView({ mode: "run", id: pastReq.key, n: Date.now() }); setKind(pastReq.key.startsWith("B-") ? "bldg" : "land"); } onPastOpened(); } }, [pastReq]);
  useEffect(() => { onFocus(!!view); }, [!!view]);
  const exit = () => { setView(null); window.scrollTo({ top: 0 }); };
  if (view && view.mode === "cheat") return <CheatQuiz actions={actions} onExit={exit} />;
  if (view && view.mode === "hayami") return <HayamiCards onExit={exit} />;
  if (view && view.mode === "field") { if (!kj) return <div className="jp text-center text-sm py-6" style={{ color: "var(--ink-soft)" }}>読み込んでいます…</div>; return <FieldDrill key={`${view.field}${view.n || ""}`} kj={kj} field={view.field} state={state} actions={actions} onExit={exit} />; }
  if (view && view.mode === "rec") return <RecordDrill actions={actions} onExit={exit} />;
  if (view && view.mode === "run") {
    const y = (kj || []).find((x) => x.id === view.id);
    if (!kj) return <div className="jp text-center text-sm py-6" style={{ color: "var(--ink-soft)" }}>読み込んでいます…</div>;
    if (y) return <KijutsuRun key={`${y.id}${view.n || ""}`} y={y} state={state} actions={actions} onExit={exit} startTimer={startTimer} stopTimer={stopTimer} timerOn={!!state.timer.startMs} />;
  }
  const list = (kj || []).filter((y) => y.kind === kind);
  const cats = [...new Set(list.map((y) => y.cat))];
  const solved = (kj || []).filter((y) => res[y.id]);
  const avg = solved.length ? Math.round(solved.reduce((t, y) => t + res[y.id].last, 0) / solved.length) : 0;
  const todo = list.find((y) => !res[y.id]);
  const low = list.filter((y) => res[y.id]).sort((a, b) => res[a.id].last - res[b.id].last)[0];
  const pitTop = Object.entries(rec.pit || {}).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => {
    const [id, idx] = k.split("#"); const y = (kj || []).find((x) => x.id === id);
    const p = y && ((y.secs || []).find((s) => s.h === "つまずく点") || { items: [] }).items.filter((i) => i.p)[Number(idx)];
    return p ? { id, label: y.label, text: p.p.replace(/^・/, ""), n } : null;
  }).filter(Boolean);
  const cq = rec.cheat || {}, rd = rec.rec || {};
  const due = kjDue(res, todayStr());
  return (
    <Box title="記述式の道場（本試験 H17〜R6）" icon={<ScrollIcon size={18} />}>
      <div className="jp space-y-2.5">
        <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>土地20年・建物20年の本試験を、事案を読んで答案（登記の目的・申請人・原因及びその日付・添付書類・表示欄など）に書き、論点編・攻略本の模範と比べて自己採点します。座標と床面積は計算の部屋で解けます。</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[["解いた年", `${solved.length}/40`], ["平均点", solved.length ? `${avg}点` : "－"], ["80点以上", `${solved.filter((y) => res[y.id].last >= 80).length}年`]].map(([k, v]) => <div key={k} style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 8, padding: "5px 2px" }}><div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>{k}</div><div className="text-sm" style={{ fontWeight: 800, color: "var(--ink)" }}>{v}</div></div>)}
        </div>
        <div className="grid grid-cols-2 gap-1 p-1" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 999 }}>
          {[["land", "土地（問21）"], ["bldg", "建物（問22）"]].map(([id, l]) => <button key={id} onClick={() => setKind(id)} className="py-1 text-xs" style={{ borderRadius: 999, border: "none", fontWeight: 700, cursor: "pointer", background: kind === id ? "linear-gradient(180deg, #cfae62, #a8833a)" : "transparent", color: kind === id ? "#fffdf6" : "var(--ink-soft)" }}>{l}</button>)}
        </div>
        {!kj ? <div className="text-[11px]" style={{ color: "var(--ink-mute)" }}>読み込んでいます…</div> : (<>
          <div className="grid grid-cols-2 gap-2">
            <button disabled={!todo} onClick={() => todo && setView({ mode: "run", id: todo.id })} className="btn-primary py-2 text-xs" style={{ opacity: todo ? 1 : 0.5 }}>まだ解いていない年{todo ? `（${todo.era}）` : "はなし"}</button>
            <button disabled={!low} onClick={() => low && setView({ mode: "run", id: low.id })} className="btn-sky py-2 text-xs" style={{ opacity: low ? 1 : 0.5 }}>いちばん点が低い年{low ? `（${low.era} ${res[low.id].last}点）` : ""}</button>
          </div>
          {cats.map((cat) => (
            <div key={cat} className="px-2 py-1.5" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 8 }}>
              <div className="text-[11px] mb-1" style={{ color: "var(--ink)", fontWeight: 800 }}>{cat}</div>
              <div className="flex flex-wrap gap-1.5">
                {list.filter((y) => y.cat === cat).sort((a, b) => a.year - b.year).map((y) => { const r = res[y.id]; return (
                  <button key={y.id} onClick={() => setView({ mode: "run", id: y.id })} className="px-2 py-0.5 text-[11px]" style={{ ...chipSt(false), borderColor: r ? (r.last >= 80 ? "var(--sage)" : "#e0948a") : "var(--rule-soft)", background: r ? (r.last >= 80 ? "rgba(109,132,84,0.12)" : "rgba(201,86,78,0.07)") : "var(--paper)" }}>{y.era}{r ? ` ${r.last}点` : ""}</button>
                ); })}
              </div>
            </div>
          ))}
          {due.length > 0 && (
            <div className="px-2 py-1.5 space-y-1" style={{ background: "rgba(214,181,106,0.12)", border: "1px solid var(--gold)", borderRadius: 8 }}>
              <div className="text-[11px]" style={{ color: "var(--ink)", fontWeight: 800 }}>📅 今日の復習（{due.length}年）</div>
              <div className="flex flex-wrap gap-1.5">{due.map((x) => <button key={x.id} onClick={() => setView({ mode: "run", id: x.id })} className="px-2 py-0.5 text-[11px]" style={chipSt(true)}>{kjLabel(x.id)} {x.r.last}点</button>)}</div>
            </div>
          )}
          <KjFieldTable rec={rec} onDrill={(f) => setView({ mode: "field", field: f, n: Date.now() })} />
          {pitTop.length > 0 && (
            <div className="px-2 py-1.5" style={{ background: "rgba(201,86,78,0.05)", border: "1px solid #e0948a", borderRadius: 8 }}>
              <div className="text-[11px] mb-0.5" style={{ color: "#c9564e", fontWeight: 800 }}>よくはまる落とし穴</div>
              {pitTop.map((p, k) => <div key={k} className="text-[11px]" style={{ color: "var(--ink)" }}>・{p.text}<span style={{ color: "var(--ink-mute)" }}>（{p.label}・{p.n}回）</span></div>)}
            </div>
          )}
        </>)}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setView({ mode: "cheat" })} className="btn-ghost py-2 text-[11px]">📋 目的⇄原因⇄日付クイズ{cq.n ? `（${Math.round((cq.ok / cq.n) * 100)}%）` : ""}</button>
          <button onClick={() => setView({ mode: "rec" })} className="btn-ghost py-2 text-[11px]">📖 登記記録 申請前→後{rd.n ? `（${Object.keys(rd.done || {}).length}/${REC_CASES.length}）` : ""}</button>
        </div>
        <button onClick={() => setView({ mode: "hayami" })} className="btn-ghost w-full py-2 text-[11px]">🗂 当日の確認カード（計算・土地・建物の早見表）</button>
      </div>
    </Box>
  );
}

export { LapRoom };
