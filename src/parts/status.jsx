// StatusTab とその部品（2026-10-26、App.jsx から切り出し。開いたときに読み込む）
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
import { KILL_TIERS, ALLIES, SEASON_BOSSES, monumentOf, ART_URL, BACKUP_KEEP, BOND_LV, Box, DOC_LIMIT, HeroPortrait, JOB_RANKS, MON_BOSS, MON_PAINTED, PASS_LINE, RARITY, Stat, addDays, alliesJoined, backupCol, bondLevel, calculateStatus, daysBetween, fmtMin, getAwakening, getCharacterTier, getClassInfo, getLevelTitle, getPetInfo, getRpgBonuses, getTierLabel, getXpForNextLevel, healthReport, heroStage, homeCharOf, longestStudyStreak, mainQual, makeBackup, nextTitles, normRpg, parseLocalDate, passPower, pctTxt, rpgEquippedItems, subjectJobs, titleLeft, todayStr, worldOfQual } from "../App.jsx";

const kb = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(2)}MB` : `${Math.round(n / 1024)}KB`);
function HealthPanel({ state }) {
  const [open, setOpen] = useState(false);
  const h = healthReport(state);
  const warnBanks = h.banks.filter((x) => x.level !== "ok");
  const issues = warnBanks.length + (h.mainLevel !== "ok" ? 1 : 0) + h.dups.length + h.empties.length;
  const bar = (n) => { const r = Math.min(1, n / DOC_LIMIT); return <span className="block" style={{ height: 5, borderRadius: 3, background: "var(--beige)", overflow: "hidden", marginTop: 2 }}><span className="block" style={{ width: `${r * 100}%`, height: "100%", background: r >= 0.9 ? "#c9564e" : r >= 0.7 ? "#d6b56a" : "#6d8454" }} /></span>; };
  return (
    <Box title="データの健康診断" icon={<StatusIcon size={18} />}>
      <div className="jp space-y-2">
        <div className="text-sm" style={{ fontWeight: 800, color: h.danger ? "#c9564e" : issues ? "var(--gold)" : "var(--sage)" }}>{h.danger ? `危険：保存の上限に近いものが ${h.danger}つあります` : issues ? `気になる点が ${issues}つあります` : "問題は見つかりませんでした。健康です！"}</div>
        <p className="text-[10px]" style={{ color: "var(--ink-mute)" }}>クラウドには、問題集1つ・学習記録の本体それぞれ1MBまでしか保存できません。90%を超えると保存に失敗するおそれがあるので、早めに問題集を2つに分けましょう。</p>
        <div className="px-2 py-1.5" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 8 }}>
          <div className="flex text-[11px]"><span className="flex-1" style={{ fontWeight: 700 }}>学習記録の本体（冒険・設定など）</span><span>{kb(h.mainBytes)}（{Math.round((h.mainBytes / DOC_LIMIT) * 100)}%）</span></div>
          {bar(h.mainBytes)}
        </div>
        <div className="px-2 py-1.5" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 8 }}>
          <div className="text-[11px] mb-1" style={{ fontWeight: 700 }}>問題集の大きさ（大きい順）</div>
          {(open ? h.banks : h.banks.slice(0, 3)).map((x) => (
            <div key={x.b.id} className="py-0.5">
              <div className="flex text-[11px]"><span className="flex-1 truncate" style={{ color: x.level === "danger" ? "#c9564e" : "var(--ink)" }}>{x.level === "danger" ? "⚠ " : x.level === "warn" ? "△ " : ""}{x.b.name}（{(x.b.questions || []).length}問）</span><span>{kb(x.bytes)}（{Math.round((x.bytes / DOC_LIMIT) * 100)}%）</span></div>
              {bar(x.bytes)}
            </div>
          ))}
          {h.banks.length > 3 && <button onClick={() => setOpen(!open)} className="text-[10px] mt-1" style={{ background: "none", border: "none", color: "var(--ink-mute)", textDecoration: "underline", cursor: "pointer" }}>{open ? "閉じる" : `ほか${h.banks.length - 3}個も見る`}</button>}
        </div>
        {h.dups.length > 0 && (
          <details className="text-[11px] px-2 py-1.5" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 8 }}>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>同じ問題文が二重に入っている：{h.dups.length}組</summary>
            {h.dups.slice(0, 30).map((l, k) => <div key={k} className="py-1" style={{ borderTop: "1px dashed var(--rule-soft)" }}><div className="truncate">「{l[0].q.q}」</div><div style={{ color: "var(--ink-mute)" }}>{l.map((x) => `${x.b.name} の${x.i + 1}問目`).join("・")}</div></div>)}
            <p className="mt-1" style={{ color: "var(--ink-mute)" }}>年度ちがいなどで、わざと同じ問題を入れている場合は、そのままで大丈夫です。</p>
          </details>
        )}
        {h.empties.length > 0 && (
          <details className="text-[11px] px-2 py-1.5" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 8 }}>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>問題文か答えが空になっている：{h.empties.length}問</summary>
            {h.empties.slice(0, 30).map((x, k) => <div key={k} className="py-0.5" style={{ color: "var(--ink-soft)" }}>{x.b.name} の{x.i + 1}問目（{x.which}が空）</div>)}
          </details>
        )}
        <p className="text-[10px]" style={{ color: "var(--ink-mute)" }}>この点検は見るだけで、データは変えません。直すときは、問題タブの問題集の編集から行ってください。</p>
      </div>
    </Box>
  );
}
async function readBackup(uid, id) {
  const ref = backupCol(uid).doc(id);
  const meta = (await ref.get()).data() || {};
  const ps = (await ref.collection("parts").get()).docs.map((d) => d.data());
  const by = {};
  ps.forEach((x) => { (by[x.k] = by[x.k] || []).push(x); });
  const join = (k) => (by[k] || []).sort((a, b) => a.i - b.i).map((x) => x.s).join("");
  const mainState = JSON.parse(join("main") || "null");
  const questionBanks = (meta.banks || []).map((b) => (by[b.id] ? JSON.parse(join(b.id)) : null)).filter(Boolean);
  if (!mainState || questionBanks.length !== (meta.banks || []).length) throw new Error("控えの一部が読めませんでした");
  return { version: 1, exportedAt: meta.createdAt, mainState, questionBanks };
}
function BackupPanel({ state, uid }) {
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const load = () => backupCol(uid).get().then((sn) => setList(sn.docs.map((d) => ({ id: d.id, ...d.data() })).filter((x) => x.createdAt).sort((a, b) => (a.id < b.id ? 1 : -1)))).catch(() => setList([]));
  useEffect(() => { if (uid) load(); }, [uid]);
  const now = async () => {
    setBusy("now"); setMsg("");
    try { await makeBackup(uid, state); setMsg("控えを取りました。"); await load(); } catch (e) { setMsg("控えを取れませんでした。通信状態を確かめてください。"); }
    setBusy("");
  };
  const download = async (id) => {
    setBusy(id); setMsg("");
    try {
      const data = await readBackup(uid, id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `studyquest_backup_${id}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      setMsg(`${id} の控えをファイルに書き出しました。戻すときは、画面上の「読込」でこのファイルを選んでください。`);
    } catch (e) { setMsg(`書き出せませんでした（${(e && e.message) || e}）`); }
    setBusy("");
  };
  return (
    <Box title="学習記録の控え（自動バックアップ）" icon={<Bookmark size={18} />}>
      <div className="jp space-y-2">
        <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>7日ごとに、学習記録の控えをクラウドの別の場所に自動で残しています（新しい{BACKUP_KEEP}回分）。万一のときは、控えをファイルに書き出してから、画面上の「読込」で選ぶと、その日の状態に戻せます。※ 問題に付けた画像は含みません。</p>
        {list === null ? <p className="text-xs" style={{ color: "var(--ink-mute)" }}>読み込んでいます…</p>
          : list.length === 0 ? <p className="text-xs" style={{ color: "var(--ink-mute)" }}>まだ控えはありません。</p>
          : list.map((b) => (
            <div key={b.id} className="flex items-center gap-2 px-2 py-1.5" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 8 }}>
              <span className="flex-1 text-xs" style={{ color: "var(--ink)" }}><b>{Number(b.id.slice(5, 7))}月{Number(b.id.slice(8, 10))}日</b>の控え<span className="text-[10px] ml-1" style={{ color: "var(--ink-mute)" }}>問題集 {(b.banks || []).length}・問題 {b.nQ || 0}問</span></span>
              <button onClick={() => download(b.id)} disabled={!!busy} className="btn-ghost text-[10px] px-2 py-1">{busy === b.id ? "準備中…" : "ファイルに書き出す"}</button>
            </div>
          ))}
        <button onClick={now} disabled={!!busy} className="btn-info w-full py-2 text-xs">{busy === "now" ? "控えを取っています…" : "今すぐ控えを取る"}</button>
        {msg && <p className="text-[11px]" style={{ color: "var(--gold)", fontWeight: 700 }}>{msg}</p>}
      </div>
    </Box>
  );
}
// ── 成長の年表（2026年10月21日。ステータス画面）：これまでの記録から「節目の日」を集めて年表にする。
//    学習のはじまり・連続日数・勉強時間の節目・問題集の周回・記述式の80点・叩き込みと計算の周回・本番リハーサル・模試・合格力の節目 ──
const TL_STREAK = [7, 30, 100, 200, 365];
const TL_HOURS = [10, 50, 100, 200, 300, 500, 700, 1000];
const TL_POWER = [0.5, 0.75, 0.85];
function growthTimeline(state) {
  const r = normRpg(state.rpg);
  const ev = [];
  const add = (d, icon, text, big = false) => { if (d) ev.push({ d, icon, text, big }); };
  // 学習のはじまり・連続日数・勉強時間の節目
  const logs = (state.studyLog || []).filter((l) => l.date).slice().sort((a, b) => (a.date < b.date ? -1 : 1));
  const days = [...new Set(logs.map((l) => l.date))].sort();
  let cur = 0, prev = null;
  const hitS = new Set();
  days.forEach((d) => { cur = prev && addDays(prev, 1) === d ? cur + 1 : 1; prev = d; TL_STREAK.forEach((n) => { if (cur === n && !hitS.has(n)) { hitS.add(n); add(d, "🔥", `${n}日連続で学習`, n >= 30); } }); });
  let min = 0;
  const hitH = new Set();
  logs.forEach((l) => { min += Number(l.minutes) || 0; TL_HOURS.forEach((h) => { if (min >= h * 60 && !hitH.has(h)) { hitH.add(h); add(l.date, "⏳", `勉強時間が合計${h}時間に`, h >= 100); } }); });
  // 問題集の周回（同じ日の分はまとめる）
  const clears = new Map();
  state.questionBanks.forEach((b) => (b.clearHistory || []).forEach((h, i) => { if (!h || !h.date) return; if (!clears.has(h.date)) clears.set(h.date, []); clears.get(h.date).push({ name: b.name, lap: (Math.max(b.clears || 0, (b.clearHistory || []).length) - (b.clearHistory || []).length) + i + 1, acc: h.accuracy }); }));
  clears.forEach((xs, d) => {
    const head = xs.slice(0, 2).map((x) => `『${x.name}』${x.lap}周目${typeof x.acc === "number" ? `（${x.acc}%）` : ""}`).join("・");
    add(d, "📘", `${head}${xs.length > 2 ? ` ほか${xs.length - 2}冊` : ""}を周回`, xs.some((x) => x.lap === 1 || (typeof x.acc === "number" && x.acc >= 90)));
  });
  // 記述式の道場：はじめての答案・年度ごとにはじめて80点
  const kres = (r.kijutsu || {}).res || {};
  const firstKj = Object.values(kres).flatMap((x) => (x.hist || []).map((h) => h.d)).filter(Boolean).sort()[0];
  if (firstKj) add(firstKj, "✒", "記述式の道場で、はじめて答案を書いた");
  Object.entries(kres).forEach(([id, x]) => { const h = (x.hist || []).find((e) => e.s >= 80); if (h) add(h.d, "🏅", `記述式 ${kjLabel(id)}で80点以上（${h.s}点）`, true); });
  // 申請書の叩き込み・本試験の計算・計算の問題集の周回
  (((r.kjDeck || {}).lap || {}).at || []).forEach((d, i) => add(d, "📜", `申請書の叩き込み 第${i + 1}周を達成`, true));
  const c2 = r.calc2 || {};
  ((c2.past || {}).lapsAt || []).forEach((d, i) => add(d, "🧮", `本試験の計算（40題）第${i + 1}周を達成`, true));
  ((c2.fixed || {}).lapsAt || []).forEach((d, i) => add(d, "🧮", `計算の問題集 第${i + 1}周を達成`));
  // 本番リハーサル・模試・資格の世界の本番モード
  const rh = (r.rehearsal || {}).log || [];
  if (rh.length) add(rh[0].d, "⏱", "はじめての本番リハーサル");
  const rhPass = rh.find((e) => e.full && e.pass);
  if (rhPass) add(rhPass.d, "🎯", `本番リハーサルで、はじめて合格ライン突破（${rhPass.total}点）`, true);
  (r.mocks || []).forEach((m) => add(m.d, "📝", `模試・答練「${m.name || "模試"}」${m.ta != null ? `　択一${m.ta}` : ""}${m.ki != null ? `・記述${m.ki}` : ""}`));
  Object.entries(r.worldExam || {}).forEach(([wid, w]) => { const p = (w.log || []).find((e) => e.passed); if (p) add(p.d, "📡", `${worldOfQual((state.qualifications || []).find((q) => q.id === wid)).name}の本番モードで、はじめて合格`, true); });
  // 合格力の節目（資格ごと）
  const qn = new Map((state.qualifications || []).map((q) => [q.id, q.name]));
  const hitP = new Set();
  (r.powerLog || []).forEach((e) => TL_POWER.forEach((p) => { const k = `${e.q}:${p}`; if (e.p >= p && !hitP.has(k)) { hitP.add(k); add(e.d, "✨", `${qn.get(e.q) || "目標の資格"}の合格力が${Math.round(p * 100)}%に`, p >= 0.85); } }));
  // 冒険：最高連撃の更新（10連撃以上）・無限回廊の自己ベスト
  (r.hlRec || []).forEach((e) => { if (e.k === "combo") add(e.d, "⚔", `最高連撃を更新（${e.v}連撃）`, e.v >= 30); });
  if (r.endless && r.endless.bestAt && r.endless.best) add(r.endless.bestAt, "🌀", `無限回廊の自己ベスト ${r.endless.best}階`);
  // 冒険のはじまり＝いちばん古い記録の日
  const first = [logs.length ? logs[0].date : null, ...ev.map((e) => e.d)].filter(Boolean).sort()[0];
  if (first) ev.push({ d: first, icon: "🌱", text: "冒険のはじまり。いちばん古い記録の日", big: true, first: true });
  // 新しい順（同じ日なら「はじまり」をいちばん古い側に）
  return ev.sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : (a.first ? 1 : 0) - (b.first ? 1 : 0)));
}
const tlDate = (d) => { const [y, m, dd] = d.split("-"); return `${y}年${Number(m)}月${Number(dd)}日`; };
// 物語として読む：古い順に、大きな節目を主人公が語る
function timelineTalk(state, ev) {
  const r = normRpg(state.rpg);
  const old = ev.slice().reverse();
  const pick = old.filter((e) => e.big);
  const list = (pick.length >= 4 ? pick : old).slice(-14);
  const ally = alliesJoined(r)[0];
  const lines = [["hero", "ここまでの冒険を、最初から読み返してみるね。"]];
  if (old.length && list[0] !== old[0]) lines.push(["hero", `${tlDate(old[0].d)}。${old[0].text}。すべてはここから始まった。`]);
  list.forEach((e) => lines.push(["hero", `${tlDate(e.d)}。${e.text}。`]));
  const days = daysBetween(old[0].d, todayStr());
  lines.push(["hero", `はじめの日から${days}日。一歩ずつ、ちゃんと積み上がってる。`]);
  if (ally) lines.push([ally.id, ally.cheer]);
  lines.push(["hero", "この年表の続きは、これからの毎日で書いていこう。"]);
  return { title: "成長の年表", lines };
}
function GrowthTimeline({ state, onTalk }) {
  const [all, setAll] = useState(false);
  const ev = growthTimeline(state);
  if (!ev.length) return null;
  const shown = all ? ev : ev.slice(0, 12);
  let month = "";
  return (
    <Box title={`成長の年表　${ev.length}の節目`} icon={<Award size={18} />}>
      <div className="jp">
        <p className="text-[11px] mb-2" style={{ color: "var(--ink-soft)", lineHeight: 1.7 }}>学習の記録から、節目になった日を自動で集めています（新しい順）。★は大きな節目です。</p>
        {onTalk && <button onClick={() => onTalk(timelineTalk(state, ev))} className="btn-primary w-full py-1.5 mb-2 text-[12px]">📖 物語として読む</button>}
        <div style={{ borderLeft: "2px solid #d6b56a", marginLeft: 6, paddingLeft: 12 }}>
          {shown.map((e, i) => {
            const m = e.d.slice(0, 7);
            const head = m !== month ? (month = m) : null;
            return (
              <div key={`${e.d}${i}`}>
                {head && <div className="text-[11px] mt-2 mb-1" style={{ color: "var(--gold)", fontWeight: 800, marginLeft: -4 }}>{m.slice(0, 4)}年{Number(m.slice(5))}月</div>}
                <div className="flex items-start gap-2 py-1" style={{ position: "relative" }}>
                  <span aria-hidden="true" style={{ position: "absolute", left: -19, top: 9, width: 12, height: 12, borderRadius: "50%", background: e.big ? "#d6b56a" : "var(--paper)", border: "2px solid #d6b56a" }} />
                  <span className="text-[10px]" style={{ color: "var(--ink-mute)", width: 34, flexShrink: 0, paddingTop: 2 }}>{Number(e.d.slice(5, 7))}/{Number(e.d.slice(8))}</span>
                  <span className="flex-1 text-[12px]" style={{ color: "var(--ink)", fontWeight: e.big ? 800 : 500, lineHeight: 1.6 }}>{e.icon} {e.text}{e.big ? " ★" : ""}</span>
                </div>
              </div>
            );
          })}
        </div>
        {ev.length > 12 && <button onClick={() => setAll(!all)} className="w-full text-[11px] mt-2 py-1" style={{ background: "transparent", border: "1px dashed var(--rule-soft)", color: "var(--ink-soft)", cursor: "pointer" }}>{all ? "▲ 新しい12件だけ" : `▼ すべて表示（${ev.length}件）`}</button>}
      </div>
    </Box>
  );
}
function AdventureBook({ state, onClose }) {
  const [pg, setPg] = useState(0);
  const r = normRpg(state.rpg);
  const player = state.player;
  const status = calculateStatus(state);
  const st = longestStudyStreak(state);
  const qual = mainQual(state);
  const linked = qual && state.questionBanks.some((b) => b.qualId === qual.id);
  const pp = passPower(state, linked ? qual.id : null);
  const hc = homeCharOf(state);
  const cls = getClassInfo(state);
  let ans = 0, ok = 0, qs = 0;
  state.questionBanks.forEach((b) => (b.questions || []).forEach((q) => { qs++; ans += (q.correct || 0) + (q.wrong || 0); ok += q.correct || 0; }));
  const totalMin = state.studyLog.reduce((t, l) => t + (l.minutes || 0), 0);
  const md = (d) => (d ? `${d.slice(0, 4)}年${Number(d.slice(5, 7))}月${Number(d.slice(8, 10))}日` : "—");
  const regions = Object.keys(r.regions || {}).filter((k) => r.regions[k] && r.regions[k].cleared);
  const sqDone = Object.values(r.sq || {}).filter((x) => x && x.stars >= 1).length;
  const sqStars = Object.values(r.sq || {}).reduce((t, x) => t + ((x && x.stars) || 0), 0);
  const dr = r.drill || [], drN = dr.reduce((t, e) => t + e.n, 0), drOk = dr.reduce((t, e) => t + e.ok, 0);
  const rh = (r.rehearsal && r.rehearsal.log) || [];
  const rhBest = rh.filter((e) => e.full).reduce((m, e) => Math.max(m, e.total || 0), 0);
  const czGot = Object.values((r.cloze && r.cloze.got) || {}).filter((n) => n >= 3).length;
  const sn = r.shinsei || [];
  const log = r.powerLog || [];
  const startDay = [st.first, log[0] && log[0].d].filter(Boolean).sort()[0] || null;
  const Stat = ({ k, v, sub }) => (
    <div className="text-center" style={{ padding: "8px 4px", borderBottom: "1px dashed rgba(176,138,62,0.4)" }}>
      <div className="text-[11px]" style={{ color: "#8a7a55" }}>{k}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: "#22335c", fontFamily: "'Shippori Mincho B1', serif" }}>{v}</div>
      {sub && <div className="text-[10px]" style={{ color: "#8a96b0" }}>{sub}</div>}
    </div>
  );
  const chart = () => {
    if (log.length < 2) return <p className="text-xs text-center" style={{ color: "#8a96b0" }}>合格力の記録が、これから積み上がっていきます。</p>;
    const W = 300, H = 120, t0 = parseLocalDate(log[0].d).getTime(), t1 = parseLocalDate(log[log.length - 1].d).getTime(), span = Math.max(1, t1 - t0);
    const X = (d) => 10 + ((parseLocalDate(d).getTime() - t0) / span) * (W - 20), Y = (v) => 10 + (1 - v) * (H - 24);
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" aria-label="合格力の歩み">
        <line x1="10" x2={W - 10} y1={Y(PASS_LINE)} y2={Y(PASS_LINE)} stroke="#b08a3e" strokeDasharray="4 3" />
        <text x={W - 10} y={Y(PASS_LINE) - 3} fontSize="9" textAnchor="end" fill="#b08a3e">合格ライン</text>
        <polyline points={log.map((e) => `${X(e.d).toFixed(1)},${Y(e.p).toFixed(1)}`).join(" ")} fill="none" stroke="#4f6fa8" strokeWidth="2" />
        <text x="10" y={H - 2} fontSize="9" fill="#8a96b0">{md(log[0].d)}</text>
        <text x={W - 10} y={H - 2} fontSize="9" textAnchor="end" fill="#8a96b0">{pctTxt(log[log.length - 1].p)}</text>
      </svg>
    );
  };
  const pages = [
    { title: null, body: (
      <div className="text-center">
        <div className="text-[11px]" style={{ color: "#b08a3e", letterSpacing: "0.3em", fontWeight: 800 }}>CHRONICLE</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#22335c", fontFamily: "'Shippori Mincho B1', serif", margin: "4px 0 12px" }}>冒険の記録書</div>
        <img src={`${ART_URL}book-tools.jpg`} alt="" style={{ width: "100%", maxWidth: 300, height: 120, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(176,138,62,0.6)", margin: "0 auto 12px", display: "block" }} />
        <div style={{ width: 120, height: 120, margin: "0 auto", borderRadius: "50%", border: "3px solid #b08a3e", boxShadow: "0 0 0 4px #fdfbf5, 0 0 0 5px rgba(176,138,62,.5)", backgroundColor: "#e9e4d6", backgroundImage: `url(${hc.avatar})`, backgroundSize: "300% auto", backgroundPosition: `${hc.face[0]}% ${hc.face[1]}%` }} />
        <div className="mt-3 text-sm" style={{ color: "#22335c", fontWeight: 800 }}>Lv.{player.level}　{heroStage(player.level).name}{cls ? `（${cls.rankName}）` : ""}</div>
        <div className="text-xs mt-1" style={{ color: "#5b6b8c" }}>目指す資格：{qual ? qual.name : "—"}</div>
        <div className="text-[11px] mt-3" style={{ color: "#8a96b0" }}>旅のはじまり　{md(startDay)}</div>
        <div className="text-[11px]" style={{ color: "#8a96b0" }}>この記録の日付　{md(todayStr())}</div>
      </div>) },
    { title: "第一章　学びの記録", body: (
      <div className="grid grid-cols-2 gap-x-3">
        <Stat k="解いた問題（のべ）" v={`${ans.toLocaleString()}問`} sub={`登録した問題 ${qs.toLocaleString()}問`} />
        <Stat k="正解率" v={ans ? `${Math.round((ok / ans) * 100)}%` : "—"} sub={`正解 ${ok.toLocaleString()}問`} />
        <Stat k="学習時間" v={fmtMin(totalMin)} sub={`学習した日 ${st.days}日`} />
        <Stat k="いちばん長い連続学習" v={`${st.best}日`} sub={`いま ${status.currentStreak}日連続`} />
        <Stat k="問題集の周回" v={`${status.totalClears}周`} sub="周回スタンプ" />
        <Stat k="最長の連続正解" v={`${status.longestQaStreak}問`} />
      </div>) },
    { title: "第二章　合格力の歩み", body: (
      <div>
        {chart()}
        <div className="grid grid-cols-2 gap-x-3 mt-2">
          <Stat k="いまの合格力" v={pctTxt(pp.power)} sub={`合格ライン ${Math.round(PASS_LINE * 100)}%`} />
          <Stat k="記録をつけた日" v={`${log.length}日`} sub={log.length ? `はじめ ${pctTxt(log[0].p)}` : ""} />
        </div>
      </div>) },
    { title: "第三章　冒険の記録", body: (
      <div>
        <div className="grid grid-cols-2 gap-x-3">
          <Stat k="解放した地域" v={`${regions.length}地域`} />
          <Stat k="ストーリー" v={`${sqDone}話`} sub={`集めた★ ${sqStars}`} />
          <Stat k="試練の塔" v={`${(r.tower && r.tower.floor) || 0}階`} sub="突破した階" />
          <Stat k="魔王城" v={`${(r.castle && r.castle.floor) || 0}層`} />
          <Stat k="ボスに勝った回数" v={`${r.bossWins || 0}回`} />
          <Stat k="称号" v={`${player.achievements.length}個`} />
        </div>
        {regions.length > 0 && <p className="text-[11px] mt-2 text-center" style={{ color: "#5b6b8c" }}>{regions.join("・")}</p>}
      </div>) },
    { title: "第四章　鍛錬の記録", body: (
      <div className="grid grid-cols-2 gap-x-3">
        <Stat k="計算ドリル" v={`${drN}問`} sub={drN ? `正解率 ${Math.round((drOk / drN) * 100)}%` : ""} />
        <Stat k="本番リハーサル" v={rh.length ? `${rh.length}回` : "—"} sub={rhBest ? `最高 ${rhBest}点` : ""} />
        <Stat k="条文図鑑" v={`${czGot}条`} sub="登録した条文" />
        <Stat k="申請書の穴埋め" v={`${sn.reduce((t, e) => t + e.n, 0)}場面`} />
        <Stat k="書式の記録" v={`${(r.shoshiki || []).length}回`} />
        <Stat k="ログイン" v={`${(r.login && r.login.count) || 0}日`} />
      </div>) },
    { title: "第五章　仲間たち", body: (
      <div className="space-y-2">
        {alliesJoined(r).length === 0 && <p className="text-xs text-center" style={{ color: "#8a96b0" }}>地域を解放すると、仲間が旅に加わります。</p>}
        {alliesJoined(r).map((a) => { const lv = bondLevel(r.bonds[a.id]); return (
          <div key={a.id} className="flex items-center gap-3 p-2" style={{ borderBottom: "1px dashed rgba(176,138,62,0.4)" }}>
            <span style={{ width: 52, height: 52, borderRadius: "50%", flexShrink: 0, border: "2px solid #b08a3e", backgroundImage: `url(${ART_URL}${a.img})`, backgroundSize: "300% auto", backgroundPosition: `${a.face[0]}% ${a.face[1]}%` }} />
            <span className="flex-1"><span className="block text-sm" style={{ fontWeight: 800, color: "#22335c" }}>{a.name}<span className="text-[10px] ml-1" style={{ color: "#8a96b0" }}>{a.role}</span></span><span className="block text-xs" style={{ color: "#c9667e", fontWeight: 800 }}>{"♥".repeat(lv)}<span style={{ color: "#d8c9a3" }}>{"♥".repeat(BOND_LV.length - lv)}</span>　絆 Lv{lv}</span><span className="block text-[11px]" style={{ color: "#5b6b8c" }}>{/^「/.test(a.cheer) ? a.cheer : `「${a.cheer}」`}</span></span>
          </div>); })}
      </div>) },
    { title: "結び", body: (
      <div className="text-center" style={{ fontFamily: "'Shippori Mincho B1', serif", color: "#22335c", lineHeight: 2 }}>
        <p className="text-sm" style={{ fontWeight: 700 }}>{st.days}日の学びと、{ans.toLocaleString()}回の挑戦。</p>
        <p className="text-sm" style={{ fontWeight: 700 }}>そのひとつひとつが、あなたを強くしてきました。</p>
        <p className="text-sm mt-2" style={{ fontWeight: 700 }}>この記録書は、これからも書き足されていきます。</p>
        <p className="text-xs mt-4" style={{ color: "#8a7a55" }}>— {md(todayStr())}　{heroStage(player.level).name}より —</p>
      </div>) },
  ];
  const page = pages[pg];
  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center jp" style={{ zIndex: 70, background: "rgba(10,14,30,0.55)", animation: "sqFadeIn .25s ease-out" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="relative m-3 w-full max-w-md flex flex-col" style={{ maxHeight: "92vh", background: "linear-gradient(180deg, #fdf8ea, #f6ecd2)", border: "1px solid #b08a3e", borderRadius: "6px 14px 14px 6px", boxShadow: "inset 10px 0 18px -10px rgba(120,90,40,0.45), inset 0 0 0 3px #fdf8ea, inset 0 0 0 4px rgba(176,138,62,.45), 0 16px 40px rgba(0,0,0,0.4)" }}>
        <button onClick={onClose} aria-label="閉じる" className="absolute top-2 right-3 text-lg" style={{ background: "none", border: "none", color: "#8a7a55", cursor: "pointer" }}>✕</button>
        <div key={pg} className="flex-1 overflow-y-auto px-5 pt-6 pb-3" style={{ animation: "sqFadeIn .3s ease-out" }}>
          {page.title && <div className="text-center mb-3" style={{ fontSize: 17, fontWeight: 800, color: "#22335c", fontFamily: "'Shippori Mincho B1', serif", borderBottom: "1px solid rgba(176,138,62,0.6)", paddingBottom: 6 }}>{page.title}</div>}
          {page.body}
        </div>
        <div className="flex items-center justify-between px-4 pb-4 pt-1">
          <button onClick={() => setPg(Math.max(0, pg - 1))} disabled={pg === 0} className="btn-ghost px-3 py-1 text-xs" style={{ opacity: pg === 0 ? 0.4 : 1 }}>◀ 前</button>
          <div className="flex gap-1">{pages.map((_, i) => <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: i === pg ? "#b08a3e" : "rgba(176,138,62,0.3)" }} />)}</div>
          {pg < pages.length - 1 ? <button onClick={() => setPg(pg + 1)} className="btn-primary px-3 py-1 text-xs">次 ▶</button> : <button onClick={onClose} className="btn-primary px-3 py-1 text-xs">閉じる</button>}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── 実績のメダル棚（2026年10月26日）：称号・討伐メダル・季節のボス・記念の建物・冒険の記録を1つの棚に ──
function TrophyShelf({ state }) {
  const r = normRpg(state.rpg);
  const [open, setOpen] = useState(false);
  const achs = state.player.achievements || [];
  const kills = r.kills || {};
  const tierOf = (n) => [...KILL_TIERS].reverse().find((t) => (n || 0) >= t.n) || null;
  const medals = [...MON_PAINTED, ...MON_BOSS].map((x) => ({ x, t: tierOf(kills[x.img]) })).filter((m) => m.t);
  const medalN = (nm) => medals.filter((m) => m.t.name === nm).length;
  const year = todayStr().slice(0, 4);
  const sb = r.seasonBoss || {};
  const monuments = (state.qualifications || []).filter((q) => q.acquired);
  const clears = state.questionBanks.reduce((t, b) => t + (b.clears || 0), 0);
  const tw = r.tower || {};
  const fr = r.forest || {};
  const joined = alliesJoined(r).length;
  const cls = getClassInfo(state);
  const tile = (icon, label, value, on = true, color = "#b08a3e") => (
    <div key={label} className="text-center px-1 py-1.5" style={{ borderRadius: 10, background: on ? "linear-gradient(180deg, #fdfbf5, #f1e4c4)" : "var(--paper)", border: `1.5px solid ${on ? color : "var(--rule-soft)"}`, opacity: on ? 1 : 0.55 }}>
      <div style={{ fontSize: 22, lineHeight: 1.1, filter: on ? "none" : "grayscale(1)" }}>{icon}</div>
      <div className="text-[10px] truncate" style={{ fontWeight: 800, color: "var(--ink)" }}>{label}</div>
      <div className="text-[10px]" style={{ color: on ? "var(--gold)" : "var(--ink-mute)", fontWeight: 800 }}>{value}</div>
    </div>
  );
  const shelf = (title, tiles) => (
    <div className="mb-2">
      <div className="text-[11px] mb-1" style={{ fontWeight: 800, color: "var(--ink)" }}>{title}</div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pb-1.5" style={{ borderBottom: "5px solid #c9a46a", boxShadow: "0 3px 0 #9c7a44" }}>{tiles}</div>
    </div>
  );
  return (
    <Box title="実績のメダル棚" icon={<Award size={18} />}>
      <div className="jp">
        {shelf("冒険の記録", [
          tile("🏅", "称号", `${achs.length}個`, achs.length > 0),
          tile("🐾", "討伐メダル", `金${medalN("金")}・銀${medalN("銀")}・銅${medalN("銅")}`, medals.length > 0),
          tile("✅", "周回スタンプ", `${clears}個`, clears > 0),
          tile("🗼", "試練の塔", `最高${tw.floor || 0}階`, (tw.floor || 0) > 0),
          tile("🌲", "迷いの森", `主の討伐${fr.clears || 0}回`, (fr.clears || 0) > 0),
          tile("🤝", "仲間", `${joined}/${ALLIES.length}人`, joined > 0),
          tile("👑", "上級職", cls && cls.adv ? cls.adv.name : "まだ", !!(cls && cls.adv)),
          tile("🐉", "魔物の仲間", `${Object.keys(r.tamed || {}).length}体`, Object.keys(r.tamed || {}).length > 0),
          tile("🏛", "記念の建物", `${monuments.length}つ`, monuments.length > 0),
        ])}
        {shelf(`季節の限定ボス（${year}年）`, SEASON_BOSSES.map((b, i) => { const ym = `${year}-${String(i + 1).padStart(2, "0")}`; return tile(b.icon, `${i + 1}月`, sb[ym] ? b.title : "？？？", !!sb[ym]); }))}
        {open ? (
          <>
            {achs.length > 0 && shelf("称号", achs.slice().reverse().map((a) => tile(a.icon || "🏅", a.title, (a.earnedAt || "").slice(0, 10).replace(/-/g, "/"), true, a.color || "#b08a3e")))}
            {medals.length > 0 && shelf("討伐メダル", medals.map((m) => tile(m.t.name === "金" ? "🥇" : m.t.name === "銀" ? "🥈" : "🥉", m.x.name, `${kills[m.x.img]}体`, true, m.t.color)))}
            {monuments.length > 0 && shelf("記念の建物", monuments.map((q) => { const mo = monumentOf(q); return tile(mo.icon, q.name, (q.acquiredAt || "").slice(0, 7).replace("-", "/"), true); }))}
            <button onClick={() => setOpen(false)} className="btn-ghost w-full text-[11px] py-1">▲ たたむ</button>
          </>
        ) : <button onClick={() => setOpen(true)} className="btn-ghost w-full text-[11px] py-1">▼ 称号・討伐メダル・記念の建物を全部見る</button>}
      </div>
    </Box>
  );
}
function StatusTab({ state, setMainTitle, uid, onTalk }) {
  const [book, setBook] = useState(false);
  const status = calculateStatus(state);
  const player = state.player;
  const mainAch = player.mainTitleId ? player.achievements.find((a) => a.id === player.mainTitleId) : null;
  const displayTitle = mainAch ? mainAch.title : getLevelTitle(player.level);
  const displayJob = mainAch ? mainAch.job : "—";
  const displayIcon = mainAch ? mainAch.icon : "🧙";
  const barMax = (val, base) => Math.max(val, base);

  return (
    <div className="space-y-4">
      <button onClick={() => setBook(true)} className="jp w-full flex items-center gap-3 px-4 py-3 text-left" style={{ background: "linear-gradient(90deg, #f6ead0, #fdfbf5)", border: "1px solid #b08a3e", borderRadius: 10, cursor: "pointer", boxShadow: "inset 0 0 0 3px #fdfbf5, inset 0 0 0 4px rgba(176,138,62,.35)" }}>
        <span style={{ fontSize: 30 }} aria-hidden="true">📖</span>
        <span className="flex-1"><span className="block text-sm" style={{ fontWeight: 800, color: "#22335c", fontFamily: "'Shippori Mincho B1', serif" }}>冒険の記録書をひらく</span><span className="block text-[11px]" style={{ color: "var(--ink-soft)" }}>これまでの学びと冒険を、1冊の本にまとめて振り返ります</span></span>
        <span style={{ color: "#b08a3e", fontWeight: 800 }}>▶</span>
      </button>
      {book && <AdventureBook state={state} onClose={() => setBook(false)} />}
      <TrophyShelf state={state} />
      <GrowthTimeline state={state} onTalk={onTalk} />
      <TodayHighlight state={state} />
      <SubjectJobs state={state} />
      <Box title="冒険者ステータス" icon={<StatusIcon size={18} />}>
        <div className="flex items-center gap-3 mb-3 p-3" style={{ background: "var(--sky-pale)", border: "1px solid var(--rule-soft)" }}>
          <div className="flex-shrink-0">
            <HeroPortrait state={state} size={130} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="jp text-base md:text-lg" style={{ color: "var(--ink)", fontWeight: "bold" }}>{displayTitle}</div>
            <div className="jp text-xs mb-1" style={{ color: "var(--ink-soft)" }}>ジョブ: {displayJob}</div>
            <div className="pixel text-sm" style={{ color: "var(--gold)" }}>Lv.{player.level} ・ {player.xp}/{getXpForNextLevel(player.level)} EXP</div>
            <div className="jp text-[10px] mt-1 px-1.5 py-0.5 inline-block" style={{ background: getJobAccent(displayJob), color: "var(--paper)" }}>装備: {getTierLabel(getCharacterTier(player.level))}</div>
          </div>
        </div>
        <div className="space-y-2">
          <StatBar cls="hp" label="HP" sub="連続学習日数で増加" value={status.hp} max={barMax(status.hp, 200)} />
          <StatBar cls="mp" label="MP" sub="レベルで増加" value={status.mp} max={barMax(status.mp, 200)} />
          <StatBar cls="atk" label="ATK" sub="タスク完了で上昇 (討伐力)" value={status.atk} max={barMax(status.atk, 100)} />
          <StatBar cls="def" label="DEF" sub="総学習時間で上昇 (継続力)" value={status.def} max={barMax(status.def, 100)} />
          <StatBar cls="int" label="INT" sub="問題正解で上昇 (知力)" value={status.int} max={barMax(status.int, 200)} />
          <StatBar cls="luk" label="LUK" sub="連続正解・取得資格で上昇 (運)" value={status.luk} max={barMax(status.luk, 100)} />
        </div>
      </Box>

      {/* 称号 / ジョブ（ホームから移動） */}
      {setMainTitle && (
        <Box title="称号 / ジョブ" icon={<Crown size={18} />}>
          <p className="jp text-[11px] mb-2" style={{ color: "var(--ink-soft)" }}>タップすると、ホームやステータスに出る主な称号を切り替えます。</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <TitleCard active={!state.player.mainTitleId} onClick={() => setMainTitle(null)} icon="🧙" title={getLevelTitle(state.player.level)} sub={`レベル称号 (Lv.${state.player.level})`} />
            {state.player.achievements.map((a) => (
              <TitleCard key={a.id} active={state.player.mainTitleId === a.id} onClick={() => setMainTitle(a.id)} icon={a.icon} title={a.title} sub={a.job ? `ジョブ: ${a.job}` : ""} color={a.color} />
            ))}
          </div>
        </Box>
      )}
      <NextTitles state={state} />

      <RpgBonusBox state={state} />

      <Box title="戦績" icon={<Sword size={18} />}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <Stat label="連続学習" value={`${status.currentStreak}日`} accent="var(--sage)" />
          <Stat label="累計学習" value={`${status.totalHours.toFixed(1)}h`} accent="var(--slate)" />
          <Stat label="クエスト討伐" value={player.totalCompleted} accent="var(--brick)" />
          <Stat label="解答数" value={player.totalQaAnswered} accent="var(--plum)" />
          <Stat label="周回累計" value={status.totalClears + status.taskClearTotal} accent="var(--gold)" />
          <Stat label="最長連続正解" value={status.longestQaStreak} accent="var(--brick)" />
          <Stat label="取得資格" value={status.acquiredQuals} accent="var(--sky-deep)" />
          <Stat label="称号数" value={player.achievements.length} accent="var(--mint)" />
        </div>
      </Box>

      <Box title="習得スキル" icon={<Sparkles size={18} />}>
        <SkillList state={state} status={status} />
      </Box>
      <HealthPanel state={state} />
      {uid && <BackupPanel state={state} uid={uid} />}
    </div>
  );
}

function StatBar({ cls, label, sub, value, max }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <div>
          <span className="pixel text-sm" style={{ color: "var(--ink)" }}>{label}</span>
          <span className="jp text-[10px] ml-2" style={{ color: "var(--ink-mute)" }}>{sub}</span>
        </div>
        <span className="pixel text-xs" style={{ color: "var(--ink-soft)" }}>{value}</span>
      </div>
      <div className={`stat-bar ${cls}`}><div style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function SkillList({ state, status }) {
  const skills = [
    { unlocked: state.player.level >= 3, name: "🍃 集中の構え", desc: "Lv.3で習得 ・ 学習開始時に集中力が高まる" },
    { unlocked: status.currentStreak >= 3, name: "🔥 継続の灯火", desc: "連続学習3日で習得 ・ 学習を絶やさぬ意志" },
    { unlocked: status.currentStreak >= 7, name: "🔥 不屈の意志", desc: "連続学習7日で習得 ・ 火が燃え盛る" },
    { unlocked: state.player.totalQaAnswered >= 50, name: "📖 反復習得", desc: "50問解答で習得 ・ 周回の力" },
    { unlocked: state.player.totalQaAnswered >= 200, name: "📖 知識の渦", desc: "200問解答で習得" },
    { unlocked: status.longestQaStreak >= 10, name: "⚡ 連撃" , desc: "10連続正解で習得 ・ 攻撃が連続する" },
    { unlocked: status.longestQaStreak >= 20, name: "⚡ 神速の連撃", desc: "20連続正解で習得" },
    { unlocked: status.totalHours >= 10, name: "🛡 鉄の集中", desc: "累計10時間で習得 ・ 防御力上昇" },
    { unlocked: status.totalHours >= 50, name: "🛡 鋼の精神", desc: "累計50時間で習得" },
    { unlocked: status.totalClears >= 5, name: "🔁 周回マスター", desc: "問題集5周で習得" },
    { unlocked: status.acquiredQuals >= 1, name: "🏅 資格獲得者", desc: "資格1つ取得で習得" },
    { unlocked: status.acquiredQuals >= 3, name: "🏅 多資格保有者", desc: "資格3つ取得で習得" },
    { unlocked: state.player.level >= 10, name: "🌟 賢者の一閃", desc: "Lv.10で習得 ・ 強力な一撃" },
  ];
  const unlocked = skills.filter((s) => s.unlocked);
  const locked = skills.filter((s) => !s.unlocked);
  return (
    <div className="space-y-3">
      <div>
        <div className="jp text-xs mb-2" style={{ color: "var(--sage)" }}>習得済み ({unlocked.length})</div>
        {unlocked.length === 0 ? <p className="jp text-xs text-center py-2" style={{ color: "var(--ink-mute)" }}>まだスキルは習得していない</p> : (
          <ul className="space-y-1">
            {unlocked.map((s, i) => (
              <li key={i} className="p-2 jp text-xs" style={{ background: "var(--sky-pale)", border: "1px solid var(--sage)", color: "var(--ink)" }}>
                <div style={{ fontWeight: "bold" }}>{s.name}</div>
                <div style={{ color: "var(--ink-mute)" }}>{s.desc}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {locked.length > 0 && (
        <div>
          <div className="jp text-xs mb-2" style={{ color: "var(--ink-mute)" }}>未習得 ({locked.length})</div>
          <ul className="space-y-1">
            {locked.map((s, i) => (
              <li key={i} className="p-2 jp text-xs" style={{ background: "var(--paper)", border: "1px dashed var(--rule-soft)", color: "var(--ink-mute)", opacity: 0.7 }}>
                <div>🔒 ???</div>
                <div className="text-[10px]">{s.desc}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function TitleCard({ active, onClick, icon, title, sub, color }) {
  return (
    <button onClick={onClick} className="jp text-left px-2 py-2 transition flex items-center gap-2"
      style={{ background: active ? "var(--sky-deep)" : "var(--paper)", color: active ? "var(--paper)" : "var(--ink)", border: `1px solid ${color || "var(--rule)"}` }}>
      <span className="text-2xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm truncate">{title}</div>
        {sub && <div className="text-[10px] opacity-80 truncate">{sub}</div>}
      </div>
      {active && <span className="text-xs">★</span>}
    </button>
  );
}
function NextTitles({ state }) {
  const list = nextTitles(state, 4);
  if (!list.length) return null;
  return (
    <Box title="次に取れそうな称号" icon={<Crown size={18} />}>
      <div className="jp space-y-2">
        {list.map((t, i) => (
          <div key={t.id} className="flex items-center gap-2 px-2 py-1.5" style={{ background: i === 0 ? "var(--cream)" : "var(--paper)", border: `1px solid ${i === 0 ? "var(--gold)" : "var(--rule-soft)"}`, borderRadius: 8 }}>
            <span className="text-xl" style={{ width: 28, textAlign: "center" }}>{t.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2"><span className="text-sm truncate" style={{ fontWeight: 800, color: "var(--ink)" }}>「{t.title}」</span><span className="flex-1" /><span className="text-[11px]" style={{ color: i === 0 ? "var(--gold)" : "var(--ink-soft)", fontWeight: 800, whiteSpace: "nowrap" }}>{titleLeft(t)}</span></div>
              <div className="text-[10px] truncate" style={{ color: "var(--ink-mute)" }}>{t.how}（いま {t.lvMode ? `Lv${t.cur}` : `${t.cur.toLocaleString()}${t.unit}`}）</div>
              <div style={{ height: 4, borderRadius: 2, background: "var(--beige)", overflow: "hidden", marginTop: 2 }}><div style={{ width: `${Math.max(2, Math.min(1, t.ratio) * 100)}%`, height: "100%", background: "linear-gradient(90deg, #d6b56a, #b08a3e)" }} /></div>
            </div>
          </div>
        ))}
      </div>
    </Box>
  );
}
function SubjectJobs({ state }) {
  const jobs = subjectJobs(state);
  if (!jobs.length) return null;
  const low = [...jobs].sort((a, b) => a.lv - b.lv)[0];
  return (
    <Box title="科目ごとのジョブ" icon={<Award size={18} />}>
      <div className="jp space-y-2">
        {jobs.map((j) => (
          <div key={j.region} className="flex items-center gap-2 px-2 py-1.5" style={{ background: "var(--paper)", border: `1px solid ${j === low && jobs.length > 1 ? "#c9564e" : "var(--rule-soft)"}`, borderRadius: 8 }}>
            <span style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", background: j.th.light || "var(--cream)", color: j.th.dark || "var(--ink)", fontWeight: 800, fontSize: 13, border: `1px solid ${j.th.body || "var(--rule-soft)"}` }}>{j.lv}</span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm" style={{ fontWeight: 800, color: "var(--ink)" }}>{j.title}<span className="text-[10px] ml-1" style={{ color: "var(--ink-mute)", fontWeight: 500 }}>Lv{j.lv}</span></span>
              <span className="block" style={{ height: 5, borderRadius: 3, background: "var(--beige)", overflow: "hidden", margin: "2px 0" }}><span className="block" style={{ width: `${((j.xp - j.lo) / (j.hi - j.lo)) * 100}%`, height: "100%", background: `linear-gradient(90deg, ${j.th.body || "#d6b56a"}, ${j.th.dark || "#b08a3e"})` }} /></span>
              <span className="block text-[10px]" style={{ color: "var(--ink-mute)" }}>{j.region}　次のレベルまで {j.hi - j.xp}{(() => { const nx = JOB_RANKS.find(([l]) => l > j.lv); return nx ? `　・Lv${nx[0]}で「${j.subj}の${nx[1]}」` : ""; })()}</span>
            </span>
          </div>
        ))}
        {jobs.length > 1 && <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>いちばんレベルが低いのは「{low.title}」です。この科目を解くと、ぐんと伸びます。</p>}
        <p className="text-[10px]" style={{ color: "var(--ink-mute)" }}>経験値：その科目の問題に正解するたびに1、記憶が定着した問題（21日以上もつ）1問につき5。</p>
      </div>
    </Box>
  );
}

// ステータス画面に出す「装備と効果」
function RpgBonusBox({ state }) {
  const r = normRpg(state.rpg);
  const b = getRpgBonuses(state);
  const eq = rpgEquippedItems(r);
  return (
    <Box title="装備と効果" icon={<Castle size={18} />}>
      <div className="flex gap-2 mb-2 flex-wrap">
        {eq.length === 0 && <span className="jp text-xs" style={{ color: "var(--ink-mute)" }}>装備なし（冒険タブで装備できます）</span>}
        {eq.map((it) => <span key={it.id} className="jp text-xs px-1.5 py-0.5" style={{ border: `1px solid ${RARITY[it.rarity].color}` }}>{it.icon} {it.label}</span>)}
      </div>
      {(() => {
        const c = getClassInfo(state), p = getPetInfo(state), aw = getAwakening(state);
        return (
          <div className="jp text-[11px] mb-2" style={{ color: "var(--ink-soft)" }}>
            クラス：{c ? `${c.icon}${c.rankName}（${c.bonusText(c.rank)}）` : "未選択"} ／ 相棒：{p ? `${p.icon}${p.name}（${p.stageName}）` : "なし"} ／ 覚醒：{aw.stars > 0 ? "★".repeat(aw.stars) : "なし"}
          </div>
        );
      })()}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <Stat label="💰 所持金" value={`${r.gold.toLocaleString()}G`} accent="var(--gold)" />
        <Stat label="会心率" value={`${b.critPct}%`} accent="var(--brick)" />
        <Stat label="EXPボーナス" value={`+${b.xpPct}%`} accent="var(--sky-deep)" />
        <Stat label="ボスへの攻撃" value={`+${b.bossDmgPct}%`} accent="var(--plum)" />
        <Stat label="被ダメージ軽減" value={`-${b.dmgCutPct}%`} accent="var(--slate)" />
        <Stat label="ボス戦の最大HP" value={b.maxHp} accent="var(--sage)" />
      </div>
    </Box>
  );
}
function TodayHighlight({ state }) {
  const r = normRpg(state.rpg);
  const h = r.hl && r.hl.d === todayStr() ? r.hl : null;
  const best = r.hlBest || {};
  const names = (h ? h.kinds : []).map((k) => ([...MON_PAINTED, ...MON_BOSS].find((z) => z.img === k) || {}).name).filter(Boolean);
  const cells = h ? [["討伐", `${h.kills}体`], ["最高連撃", `${h.combo}${h.combo && h.combo >= (best.combo || 0) ? " 🏆" : ""}`], ["最大ダメージ", `${h.dmg}${h.dmg && h.dmg >= (best.dmg || 0) ? " 🏆" : ""}`], ["先制", `${h.quick}回`], ["弱点を突いた", `${h.weak}回`], ["群れの全滅", `${h.packs}回`], ["必殺技", `${h.ults}回`]] : [];
  return (
    <Box title="今日のハイライト" icon={<Sword size={18} />}>
      <div className="jp space-y-1.5">
        {!h ? <p className="text-[11px]" style={{ color: "var(--ink-mute)" }}>今日はまだ戦っていません。問題を解くと、今日の戦いの記録がここにたまります。</p> : <>
          <div className="grid grid-cols-4 gap-1.5">
            {cells.map(([k, v]) => <div key={k} className="text-center py-1" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 8 }}><div className="text-[9px]" style={{ color: "var(--ink-mute)" }}>{k}</div><div className="text-[13px]" style={{ fontWeight: 800, color: "var(--ink)" }}>{v}</div></div>)}
          </div>
          {names.length > 0 && <div className="text-[11px] px-2 py-1" style={{ background: "rgba(214,181,106,0.15)", border: "1px solid #d6b56a", borderRadius: 6, color: "var(--ink)" }}>✨ はじめて倒した魔物：{names.join("・")}</div>}
        </>}
        <div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>自己ベスト：最高連撃 {best.combo || 0}・最大ダメージ {best.dmg || 0}（🏆＝今日が自己ベスト）</div>
      </div>
    </Box>
  );
}

// Job-specific accent color
function getJobAccent(job) {
  if (!job) return "#5d7894";
  if (/測量|大地/.test(job)) return "#6d8454"; // sage green
  if (/技術士|工学|建築|電気/.test(job)) return "#5d7894"; // slate
  if (/法|書/.test(job)) return "#7a6caa"; // plum
  if (/経理|財|商|簿/.test(job)) return "#b8862c"; // gold
  if (/IT|情報/.test(job)) return "#4f8eb3"; // sky
  if (/語学|言葉/.test(job)) return "#92c4b9"; // mint
  if (/医|看護|生命|癒/.test(job)) return "#a04848"; // brick
  if (/土地|宅地/.test(job)) return "#8a6ca6"; // plum2
  if (/労務|社労|人/.test(job)) return "#c66060"; // light brick
  return "#5d7894";
}

export { StatusTab };
