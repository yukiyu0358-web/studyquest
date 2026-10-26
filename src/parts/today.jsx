// TodayTab とその部品（2026-10-26、App.jsx から切り出し。開いたときに読み込む）
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
import { levelPlan, levelApply, LEVEL_CAPS, LEVEL_SPREAD, featOn, AnswerHistory, AnswerPanel, BattleResult, BattleStage, Box, ConfigToggle, ERROR_TYPES, FINISH_RETENTION, LawRefChips, Mini, QuestionImages, RevealButton, SR_DEFAULTS, STUDY_PREFS, StudyScopeBar, addDays, bankWorldId, bounties, chipSt, curWorld, effectiveSr, estimateMinutes, examPlan, finishInfo, fmtEst, forgettingItems, getFsrsScheduler, homeSide, isQuestionWeak, lawIndex, lawRefCounts, mainQual, normRpg, parseLocalDate, passPower, pctTxt, planBankName, planToday, refsOfQ, regionQuests, renderFormattedText, renderQText, scopedPlans, setDisplay, shuffle, shuffleArr, studyScope, tatakiToday, themeOf, toFsrsCard, todayStr, uid, weekKey, worldsInUse, ymdCode } from "../App.jsx";


// 交互練習：科目（地域）ごとに分けて、1問ずつ順番に取り出す（科目の中の順番はそのまま）
function interleaveItems(items) {
  const groups = new Map();
  items.forEach((it) => { const k = themeOf(it.bankName || "").region || "?"; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(it); });
  if (groups.size < 2) return items;
  const lists = [...groups.values()], out = [];
  while (out.length < items.length) lists.forEach((l) => { if (l.length) out.push(l.shift()); });
  return out;
}
// 類題で追い打ち：まちがえた問題と同じ条文の、別の問題（苦手・未学習を優先）
function followUpFor(state, q, items) {
  const keys = [...new Set(refsOfQ(q).map((r) => `${r.law}:${r.art}`))];
  if (!keys.length) return null;
  const idx = lawIndex(state), used = new Set(items.map((i) => i.qId)); used.add(q.id);
  let best = null, bs = -Infinity;
  keys.forEach((k) => (idx.get(k) || []).forEach(({ b, q: x }) => {
    if (x.excluded || used.has(x.id)) return;
    const sc = (x.wrong || 0) * 2 - (x.correct || 0) + (x.sr_nextReview ? 0 : 1) + Math.random();
    if (sc > bs) { bs = sc; best = { b, x }; }
  }));
  return best ? { bankId: best.b.id, bankName: best.b.name, year: best.b.year || "", qId: best.x.id, followUp: true } : null;
}
// 重要度ランク：問題によく出る条文か（6割）・まちがえやすさ（3割）・⭐（1割）で点をつけ、上位3割をA、次の4割をB、残りをC
const rankCache = new WeakMap();
function questionRanks(state) {
  const c = rankCache.get(state.questionBanks);
  if (c) return c;
  const counts = lawRefCounts(state);
  let maxC = 1; Object.values(counts).forEach((m) => Object.values(m).forEach((v) => { if (v > maxC) maxC = v; }));
  const list = [];
  state.questionBanks.forEach((b) => (b.questions || []).forEach((q) => {
    if (q.excluded) return;
    const rc = refsOfQ(q).reduce((m, r) => Math.max(m, (counts[r.law] || {})[r.art] || 0), 0);
    const tot = (q.correct || 0) + (q.wrong || 0);
    const diff = tot ? (q.wrong || 0) / tot : 0.35;
    list.push([q.id, Math.sqrt(rc / maxC) * 0.6 + diff * 0.3 + (q.marked ? 0.1 : 0) + (q.cwCnt ? 0.05 : 0)]);
  }));
  list.sort((a, b) => b[1] - a[1]);
  const m = new Map(), n = list.length;
  list.forEach(([id], i) => m.set(id, i < n * 0.3 ? "A" : i < n * 0.7 ? "B" : "C"));
  rankCache.set(state.questionBanks, m);
  return m;
}
const RANK_STYLE = { A: { bg: "linear-gradient(180deg, #e9cf8e, #b08a3e)", c: "#fff" }, B: { bg: "#7fa3d8", c: "#fff" }, C: { bg: "var(--beige)", c: "var(--ink-mute)" } };
const RankChip = ({ r }) => (r ? <span title={`重要度 ${r}`} className="jp" style={{ display: "inline-block", fontSize: 9, fontWeight: 800, padding: "0 5px", borderRadius: 4, background: RANK_STYLE[r].bg, color: RANK_STYLE[r].c, lineHeight: "15px" }}>{r}</span> : null);
function answeredSince(state, fromDate, onlyWrongToday) {
  const codes = new Set();
  for (let d = fromDate; d <= todayStr(); d = addDays(d, 1)) codes.add(ymdCode(d));
  const out = [];
  state.questionBanks.forEach((b) => (b.questions || []).forEach((q) => {
    if (q.excluded) return;
    const hs = (q.ah || []).filter((h) => codes.has(String(h).slice(0, 6)));
    if (!hs.length) return;
    if (onlyWrongToday && !String(hs[hs.length - 1]).endsWith("w")) return;
    out.push({ bankId: b.id, bankName: b.name, year: b.year || "", qId: q.id, first: String(hs[0]).slice(0, 6) });
  }));
  return out;
}
// 1セットの中の世界の配分：重みに合わせて世界ごとに取り、足りない世界の分はほかの世界から
function mixByWorld(items, weights, n, wOf) {
  const groups = new Map();
  items.forEach((it) => { const w = wOf(it); if (!groups.has(w)) groups.set(w, []); groups.get(w).push(it); });
  const ids = [...groups.keys()];
  const wt = (id) => Math.max(0, Number(weights[id] ?? 1));
  const sum = ids.reduce((t, id) => t + wt(id), 0) || 1;
  const take = new Map(ids.map((id) => [id, Math.min(groups.get(id).length, Math.round((n * wt(id)) / sum))]));
  const total = () => [...take.values()].reduce((t, v) => t + v, 0);
  while (total() > n) { const id = ids.reduce((a, b) => (take.get(b) > take.get(a) ? b : a)); take.set(id, take.get(id) - 1); }
  const order = [...ids].sort((a, b) => wt(b) - wt(a));
  for (const id of order) { const left = n - total(); if (left <= 0) break; take.set(id, take.get(id) + Math.min(left, groups.get(id).length - take.get(id))); }
  return ids.flatMap((id) => groups.get(id).slice(0, take.get(id)));
}
// 今日タブの短いお知らせ（くわしくは周回の部屋で）
function PlanSummary({ state, onOpen }) {
  const active = scopedPlans(state);
  const items = active.flatMap((p) => planToday(p).pending.map((k) => planBankName(state, p, k)));
  return (
    <button onClick={onOpen} className="jp w-full flex items-center gap-3 px-3 py-2.5 text-left" style={{ background: "linear-gradient(90deg, rgba(214,181,106,0.18), rgba(214,181,106,0.04))", border: "1px solid #b08a3e", borderRadius: 10, cursor: "pointer" }}>
      <span style={{ width: 36, height: 36, flexShrink: 0, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "var(--cream)", border: "1px solid var(--gold)", color: "var(--gold)" }}><Shuffle size={18} /></span>
      <span className="flex-1 min-w-0">
        <span className="block text-[10px]" style={{ color: "var(--ink-mute)" }}>周回の部屋　今日のタスク</span>
        <span className="block text-sm truncate" style={{ fontWeight: 800, color: "var(--ink)" }}>{!active.length ? "学習計画をつくる" : items.length ? `あと ${items.length}項目：${items[0]}${items.length > 1 ? " ほか" : ""}` : "今日のタスクは完了です"}</span>
      </span>
      <span className="text-xs" style={{ color: "var(--gold)", fontWeight: 800 }}>ひらく ▶</span>
    </button>
  );
}

// ── 復習の予報：これから14日間、毎日いくつ復習が来るか（sr_nextReview の日付で数える）。今日の分には期限切れも含む ──
const FORECAST_DAYS = 14;
// 復習の山をならす：1日の上限と、あふれた分を明日以降へ
function LevelCard({ state, updateSrSettings }) {
  const sr = state.srSettings || {};
  const plan = levelPlan(state);
  const chip = (on) => ({ borderRadius: 999, border: `1px solid ${on ? "var(--gold)" : "var(--rule-soft)"}`, background: on ? "var(--cream)" : "var(--paper)", color: "var(--ink)", fontWeight: on ? 800 : 500, cursor: "pointer" });
  return (
    <div className="jp mb-3 px-2 py-1.5" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 8 }}>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px]" style={{ fontWeight: 800, color: "var(--ink)" }}>📉 1日の復習の上限</span>
        {LEVEL_CAPS.map((c) => <button key={c} onClick={() => updateSrSettings && updateSrSettings({ dailyCap: c })} className="text-[11px] px-2 py-0.5" style={chip((sr.dailyCap || 0) === c)}>{c ? `${c}問` : "なし"}</button>)}
        {(sr.dailyCap || 0) > 0 && <button onClick={() => updateSrSettings && updateSrSettings({ autoLevel: !sr.autoLevel })} className="text-[11px] px-2 py-0.5" style={chip(!!sr.autoLevel)}>{sr.autoLevel ? "☑" : "☐"} 毎朝自動でならす</button>}
      </div>
      {plan && plan.over > 0 && (
        <div className="flex items-center gap-2 mt-1.5">
          <span className="flex-1 text-[11px]" style={{ color: "var(--ink-soft)", lineHeight: 1.6 }}>今日の復習は{plan.n}問で、上限{plan.cap}問を{plan.over}問こえています。記憶率の高い{plan.over}問を、明日からの{LEVEL_SPREAD}日間（上限に余裕のある日）へならせます。</span>
          <button onClick={() => levelApply(plan.shift)} className="btn-primary text-[11px] px-2.5 py-1">ならす</button>
        </div>
      )}
      {(sr.dailyCap || 0) > 0 && plan && !plan.over && <div className="text-[10px] mt-1" style={{ color: "var(--ink-mute)" }}>今日の復習は{plan.n}問。上限の中におさまっています。</div>}
      {!(sr.dailyCap > 0) && <div className="text-[10px] mt-1" style={{ color: "var(--ink-mute)" }}>上限を決めると、あふれた日の復習を、記憶率の高い問題から明日以降へ少しずつずらして、毎日の量をそろえます（記憶の記録はそのまま）。</div>}
    </div>
  );
}
function reviewForecast(state) {
  const today = todayStr();
  const days = Array.from({ length: FORECAST_DAYS }, (_, i) => ({ date: addDays(today, i), n: 0 }));
  const idx = Object.fromEntries(days.map((d, i) => [d.date, i]));
  let overdue = 0;
  state.questionBanks.forEach((b) => (b.questions || []).forEach((q) => {
    if (q.excluded || !q.sr_nextReview) return;
    if (q.sr_nextReview < today) { overdue++; days[0].n++; }
    else if (idx[q.sr_nextReview] !== undefined) days[idx[q.sr_nextReview]].n++;
  }));
  return { days, overdue };
}
function ReviewForecast({ state }) {
  const { days, overdue } = reviewForecast(state);
  const max = Math.max(10, ...days.map((d) => d.n));
  const week = days.slice(1, 8);
  const avg = Math.round(week.reduce((a, d) => a + d.n, 0) / week.length);
  const peak = days.slice(1).reduce((a, d) => (d.n > a.n ? d : a), { n: -1 });
  const qual = mainQual(state);
  const linked = qual && state.questionBanks.some((b) => b.qualId === qual.id);
  const plan = examPlan(state, passPower(state, linked ? qual.id : null), qual);
  const wd = (d) => "日月火水木金土"[parseLocalDate(d).getDay()];
  const advice = avg >= 120 ? "復習がたまり気味です。しばらくは新しい問題をひかえめにして、復習を優先しましょう。"
    : peak.n >= Math.max(30, avg * 2) ? `${Number(peak.date.slice(5, 7))}/${Number(peak.date.slice(8, 10))}（${wd(peak.date)}）に復習が集中します。前の日に少し先取りしておくと楽になります。`
    : plan && plan.perDay > 0 ? `余裕があります。試験日から逆算すると、新しい問題は1日${plan.perDay}問ずつ進めるのがおすすめです。`
    : "ちょうどよいペースです。この調子で続けましょう。";
  return (
    <Box title="復習の予報（これから2週間）" icon={<TrendingUp size={18} />}>
      <div className="jp grid grid-cols-3 gap-2 mb-2">
        {[["今日", `${days[0].n}問`, overdue ? `うち期限切れ${overdue}` : ""], ["来週の1日平均", `${avg}問`, ""], ["いちばん多い日", peak.n > 0 ? `${peak.n}問` : "－", peak.n > 0 ? `${Number(peak.date.slice(5, 7))}/${Number(peak.date.slice(8, 10))}（${wd(peak.date)}）` : ""]].map(([k, v, sub]) => (
          <div key={k} className="text-center" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 8, padding: "6px 2px" }}>
            <div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>{k}</div>
            <div className="text-sm" style={{ fontWeight: 800, color: "var(--ink)" }}>{v}</div>
            {sub && <div className="text-[9px]" style={{ color: "var(--ink-mute)" }}>{sub}</div>}
          </div>
        ))}
      </div>
      <div className="flex items-end gap-0.5" style={{ height: 96 }} aria-label="14日間の復習の数">
        {days.map((d, i) => (
          <div key={d.date} className="flex-1 flex flex-col items-center justify-end" style={{ height: "100%" }}>
            <span className="text-[8px] jp" style={{ color: "var(--ink-mute)", lineHeight: 1.2 }}>{d.n || ""}</span>
            <div style={{ width: "100%", height: `${Math.max(2, (d.n / max) * 70)}px`, borderRadius: "3px 3px 0 0", background: i === 0 ? "linear-gradient(180deg, #d6b56a, #b08a3e)" : d === peak && d.n >= Math.max(30, avg * 2) ? "#c9564e" : "var(--sky)" }} />
          </div>
        ))}
      </div>
      <div className="flex gap-0.5 mt-0.5">
        {days.map((d, i) => { const w = wd(d.date); return <div key={d.date} className="flex-1 text-center jp" style={{ fontSize: 8, lineHeight: 1.3, color: w === "日" ? "#c9564e" : w === "土" ? "var(--sky-deep)" : "var(--ink-mute)" }}>{i === 0 ? "今日" : Number(d.date.slice(8, 10))}<br />{i === 0 ? "" : w}</div>; })}
      </div>
      <p className="jp text-[11px] mt-2" style={{ color: "var(--ink-soft)" }}>{advice}</p>
    </Box>
  );
}

// ── 耳で聞く一問一答：端末の読み上げ機能で、問題→（間）→答え をくり返す。回答の記録はしない（⭐で苦手に印だけ付けられる） ──
const speechText = (t) => String(t || "")
  .replace(/^\s*[○〇◯]\s*/, "まる。").replace(/^\s*[×✕✖]\s*/, "ばつ。")
  .replace(/[【】「」『』]/g, " ").replace(/[（(]/g, "、").replace(/[）)]/g, "、")
  .replace(/\s+/g, " ").trim();
function ListenMode({ state, due, toggleQuestionMark }) {
  const ok = typeof window !== "undefined" && "speechSynthesis" in window;
  const [src, setSrc] = useState("due");
  const [bankId, setBankId] = useState("");
  const [rate, setRate] = useState(1);
  const [gap, setGap] = useState(4);
  const [list, setList] = useState(null); // [{bankId, qId}]
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState("idle"); // idle | q | wait | a | pause
  const timer = useRef(null);
  const live = useRef({});
  live.current = { list, idx, rate, gap };
  const banks = state.questionBanks.filter((b) => (b.questions || []).length);
  const findQ = (it) => { const b = state.questionBanks.find((x) => x.id === it.bankId); return b ? { b, q: (b.questions || []).find((x) => x.id === it.qId) } : {}; };
  const stopAll = () => { clearTimeout(timer.current); try { window.speechSynthesis.cancel(); } catch (e) { /* 読み上げが使えない端末 */ } };
  useEffect(() => () => stopAll(), []);
  const say = (text, then) => {
    try {
      const u = new window.SpeechSynthesisUtterance(speechText(text));
      u.lang = "ja-JP"; u.rate = live.current.rate;
      u.onend = then; u.onerror = then;
      window.speechSynthesis.speak(u);
    } catch (e) { then(); }
  };
  const playAt = (i) => {
    stopAll();
    const L = live.current.list;
    if (!L || i >= L.length) { setPhase("idle"); setIdx(L ? L.length : 0); return; }
    const { q } = findQ(L[i]);
    if (!q) { playAt(i + 1); return; }
    setIdx(i); setPhase("q");
    say(q.q, () => {
      setPhase("wait");
      timer.current = setTimeout(() => {
        setPhase("a");
        say(q.a, () => { timer.current = setTimeout(() => playAt(i + 1), 1500); });
      }, live.current.gap * 1000);
    });
  };
  const build = () => {
    let items = [];
    if (src === "due") items = due.map((d) => ({ bankId: d.bankId, qId: d.qId }));
    else if (src === "weak") state.questionBanks.forEach((b) => (b.questions || []).forEach((q) => { if (!q.excluded && isQuestionWeak(q)) items.push({ bankId: b.id, qId: q.id }); }));
    else { const b = banks.find((x) => x.id === bankId) || banks[0]; if (b) items = (b.questions || []).filter((q) => !q.excluded).map((q) => ({ bankId: b.id, qId: q.id })); }
    return src === "bank" ? items.slice(0, 200) : shuffleArr(items).slice(0, 50);
  };
  const start = () => { const L = build(); if (!L.length) { alert("読み上げる問題がありません。"); return; } live.current.list = L; setList(L); playAt(0); };
  const chip = (on) => ({ borderRadius: 999, border: `1px solid ${on ? "var(--gold)" : "var(--rule-soft)"}`, background: on ? "var(--cream)" : "var(--paper)", color: "var(--ink)", fontWeight: on ? 800 : 500, cursor: "pointer" });
  if (!ok) return null;
  const cur = list && list[idx] ? findQ(list[idx]) : {};
  const playing = phase === "q" || phase === "wait" || phase === "a";
  return (
    <Box title="耳で聞く一問一答" icon={<Play size={18} />}>
      {!list || (phase === "idle" && idx >= list.length) ? (
        <div className="jp space-y-2">
          <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>問題を読み上げ、少し間をあけて答えを読みます。通勤中や家事の合間に、画面を見ずに復習できます（イヤホンがおすすめ）。回答の記録はつかないので、気になった問題は ⭐ で印をつけておきましょう。</p>
          {list && idx >= list.length && <p className="text-xs text-center" style={{ color: "var(--gold)", fontWeight: 800 }}>{list.length}問を聞き終えました。おつかれさまでした！</p>}
          <div className="flex flex-wrap gap-1.5">
            {[["due", `今日の復習（${due.length}問）`], ["weak", "苦手な問題"], ["bank", "問題集を選ぶ"]].map(([id, nm]) => <button key={id} onClick={() => setSrc(id)} className="text-[11px] px-3 py-1" style={chip(src === id)}>{nm}</button>)}
          </div>
          {src === "bank" && <select className="rpg-input text-xs" value={bankId} onChange={(e) => setBankId(e.target.value)}>{banks.map((b) => <option key={b.id} value={b.id}>{b.name}（{(b.questions || []).length}問）</option>)}</select>}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span style={{ color: "var(--ink-soft)" }}>速さ</span>
            {[0.8, 1, 1.2, 1.5].map((v) => <button key={v} onClick={() => setRate(v)} className="px-2.5 py-0.5" style={chip(rate === v)}>{v}倍</button>)}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span style={{ color: "var(--ink-soft)" }}>答えまでの間</span>
            {[2, 4, 6, 10].map((v) => <button key={v} onClick={() => setGap(v)} className="px-2.5 py-0.5" style={chip(gap === v)}>{v}秒</button>)}
          </div>
          <button onClick={start} className="btn-primary w-full py-2 flex items-center justify-center gap-1"><Play size={16} /> 聞きはじめる</button>
          <p className="text-[10px]" style={{ color: "var(--ink-mute)" }}>※ 画面を消したり、別のアプリに切り替えたりすると、読み上げが止まることがあります。</p>
        </div>
      ) : (
        <div className="jp space-y-2">
          <div className="flex items-center text-[11px]" style={{ color: "var(--ink-mute)" }}><span className="flex-1 truncate">{cur.b ? cur.b.name : ""}</span><span>{idx + 1} / {list.length}問</span></div>
          <div className="px-3 py-2" style={{ background: "var(--cream)", border: `1.5px solid ${phase === "q" ? "var(--gold)" : "var(--rule-soft)"}`, borderRadius: 8, minHeight: 64 }}>
            <div className="text-[10px] mb-0.5" style={{ color: "var(--gold)", fontWeight: 800 }}>問題{phase === "q" ? "　🔊" : ""}</div>
            <div className="text-sm break-words" style={{ color: "var(--ink)", lineHeight: 1.7 }}>{cur.q ? cur.q.q : ""}</div>
          </div>
          <div className="px-3 py-2" style={{ background: "var(--paper)", border: `1.5px solid ${phase === "a" ? "var(--sky-deep)" : "var(--rule-soft)"}`, borderRadius: 8, minHeight: 48 }}>
            <div className="text-[10px] mb-0.5" style={{ color: "var(--sky-deep)", fontWeight: 800 }}>答え{phase === "a" ? "　🔊" : phase === "wait" ? "　（考えてみましょう…）" : ""}</div>
            <div className="text-sm break-words" style={{ color: "var(--sky-deep)", lineHeight: 1.7, fontWeight: 700 }}>{phase === "a" || phase === "pause" ? (cur.q ? cur.q.a : "") : ""}</div>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {playing ? <button onClick={() => { stopAll(); setPhase("pause"); }} className="btn-ghost py-2 text-sm">⏸ 止める</button>
              : <button onClick={() => playAt(idx)} className="btn-primary py-2 text-sm">▶ 再生</button>}
            <button onClick={() => playAt(idx + 1)} className="btn-ghost py-2 text-sm">⏭ 次へ</button>
            <button onClick={() => { if (cur.q && toggleQuestionMark) toggleQuestionMark(cur.b.id, cur.q.id); }} className="btn-ghost py-2 text-sm" style={{ color: cur.q && cur.q.marked ? "var(--gold)" : "var(--ink)" }}>{cur.q && cur.q.marked ? "★" : "☆"} 印</button>
            <button onClick={() => { stopAll(); setList(null); setPhase("idle"); setIdx(0); }} className="btn-ghost py-2 text-sm">■ 終わる</button>
          </div>
        </div>
      )}
    </Box>
  );
}

// ── 記憶の天気図：ストーリーの話（問題集の区切り）ごとに、いま思い出せる確率の平均を天気で表す ──
const WEATHER = [
  { min: 0.9, icon: "☀", name: "晴れ", bg: "linear-gradient(135deg, #fff3c4, #f1d27a)", fg: "#8f6f2c" },
  { min: 0.8, icon: "🌤", name: "薄晴れ", bg: "linear-gradient(135deg, #fdf6dc, #e6e0c8)", fg: "#7a6a3a" },
  { min: 0.7, icon: "☁", name: "くもり", bg: "linear-gradient(135deg, #eef1f6, #cfd7e3)", fg: "#5b6b8c" },
  { min: 0.5, icon: "🌧", name: "雨", bg: "linear-gradient(135deg, #dfe8f6, #9fb3d1)", fg: "#34508c" },
  { min: 0, icon: "⛈", name: "雷雨", bg: "linear-gradient(135deg, #e4dcf6, #a593d8)", fg: "#5e4d93" },
];
const weatherOf = (r) => WEATHER.find((w) => r >= w.min) || WEATHER[WEATHER.length - 1];
const weatherCache = new WeakMap();
function memoryWeather(state) {
  const c = weatherCache.get(state.questionBanks);
  if (c && c.day === todayStr() && c.folders === state.folders) return c.res;
  const qual = mainQual(state);
  const linked = qual && state.questionBanks.some((b) => b.qualId === qual.id);
  const pp = passPower(state, linked ? qual.id : null);
  const sch = getFsrsScheduler(state.srSettings);
  const now = new Date();
  const res = pp.regions.filter((g) => g.total > 0).map((g) => ({
    g,
    tiles: regionQuests(g).map((q) => {
      const qs = q.qs.filter((x) => !x.excluded);
      let sum = 0, seen = 0;
      qs.forEach((x) => { if (!(x.fs || x.sr_nextReview)) return; seen++; let r = 0; try { r = sch.get_retrievability(toFsrsCard(x, now), now, false); } catch (e) { r = 0; } sum += r >= 0 && r <= 1 ? r : 0; });
      return { q, n: qs.length, seen, avg: seen ? sum / seen : null };
    }),
  }));
  weatherCache.set(state.questionBanks, { day: todayStr(), folders: state.folders, res });
  return res;
}
function MemoryWeather({ state }) {
  const data = memoryWeather(state);
  const [sel, setSel] = useState(null);
  if (!data.length) return null;
  const all = data.flatMap((d) => d.tiles);
  const count = (fn) => all.filter(fn).length;
  const rainy = count((t) => t.avg !== null && t.avg < 0.7);
  const fog = count((t) => t.avg === null);
  return (
    <Box title="記憶の天気図" icon={<Sparkles size={18} />}>
      <div className="jp space-y-3">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px]" style={{ color: "var(--ink-soft)" }}>
          {WEATHER.map((w) => <span key={w.name}>{w.icon} {w.name}{w.min ? `（${Math.round(w.min * 100)}%〜）` : ""} {count((t) => t.avg !== null && weatherOf(t.avg) === w)}</span>)}
          <span>🌫 霧（まだ） {fog}</span>
        </div>
        {data.map(({ g, tiles }) => (
          <div key={g.name}>
            <div className="text-[11px] mb-1" style={{ color: "var(--ink)", fontWeight: 800 }}>{g.name}<span className="ml-2" style={{ color: "var(--ink-mute)", fontWeight: 500 }}>{tiles.length}話</span></div>
            <div className="flex flex-wrap gap-1">
              {tiles.map((t) => {
                const w = t.avg === null ? null : weatherOf(t.avg);
                const on = sel && sel.q.key === t.q.key;
                return (
                  <button key={t.q.key} onClick={() => setSel(on ? null : t)} title={`${t.q.bank.name} 第${t.q.idx + 1}話`} style={{ width: 34, height: 34, borderRadius: 8, border: `1.5px solid ${on ? "#b08a3e" : "rgba(34,51,92,0.15)"}`, background: w ? w.bg : "repeating-linear-gradient(45deg, #efeadb, #efeadb 4px, #e6e0cc 4px, #e6e0cc 8px)", fontSize: 16, lineHeight: 1, cursor: "pointer", boxShadow: on ? "0 0 0 2px rgba(214,181,106,0.5)" : "none" }}>{w ? w.icon : "🌫"}</button>
                );
              })}
            </div>
          </div>
        ))}
        {sel && (
          <div className="text-xs px-3 py-2" style={{ background: "var(--cream)", border: "1px solid var(--gold)", borderRadius: 8, color: "var(--ink)" }}>
            <b>{sel.q.bank.name}　第{sel.q.idx + 1}話</b>（{sel.n}問）<br />
            {sel.avg === null ? "まだ解いていない話です。ストーリーで挑んでみましょう。" : `${weatherOf(sel.avg).icon} ${weatherOf(sel.avg).name}　記憶率 ${pctTxt(sel.avg)}（解いた ${sel.seen}/${sel.n}問）。${sel.avg < 0.7 ? "雨が降っています。冒険のストーリーで、この話をもう一度解きましょう。" : sel.avg < 0.9 ? "もう少しで晴れます。" : "よく覚えています！"}`}
          </div>
        )}
        <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>{rainy > 0 ? `雨・雷雨の話が ${rainy}話あります。マスを押すと、どの話かわかります。` : "大きな雨雲はありません。この調子です。"}</p>
      </div>
    </Box>
  );
}

// ── 混同ペアの対比カード：「混同」でまちがえた問題と、いちばん似ている問題を並べて、違いを見比べる ──
const bigrams = (t) => { const s = String(t || "").replace(/\s/g, ""); const out = new Set(); for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2)); return out; };
const jaccard = (a, b) => { if (!a.size || !b.size) return 0; let n = 0; a.forEach((x) => { if (b.has(x)) n++; }); return n / (a.size + b.size - n); };
// 2つの文の違うところに印をつける（短い文だけ。長い文はそのまま）
function diffMarks(a, b) {
  a = String(a || ""); b = String(b || "");
  if (a.length > 220 || b.length > 220) return [[a, false]];
  const n = a.length, m = b.length, dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = []; let i = 0, j = 0;
  const push = (ch, diff) => { const last = out[out.length - 1]; if (last && last[1] === diff) last[0] += ch; else out.push([ch, diff]); };
  while (i < n) { if (j < m && a[i] === b[j]) { push(a[i], false); i++; j++; } else if (j < m && dp[i][j + 1] >= dp[i + 1][j]) j++; else { push(a[i], true); i++; } }
  // 印と印のあいだが1〜2文字だけなら、つなげて読みやすくする
  const merged = [];
  out.forEach((seg, k) => {
    const gap = !seg[1] && seg[0].length <= 2 && out[k - 1] && out[k - 1][1] && out[k + 1] && out[k + 1][1];
    const cur = gap ? [seg[0], true] : seg;
    const last = merged[merged.length - 1];
    if (last && last[1] === cur[1]) last[0] += cur[0]; else merged.push([...cur]);
  });
  return merged;
}
const pairCache = new WeakMap();
function confusionPairs(state) {
  const r = normRpg(state.rpg);
  const key = `${todayStr()}|${Object.keys(r.pairsOk).length}`;
  const c = pairCache.get(state.questionBanks);
  if (c && c.key === key) return c.res;
  const all = [];
  state.questionBanks.forEach((b) => (b.questions || []).forEach((q) => { if (!q.excluded) all.push({ b, q }); }));
  const srcs = all.filter(({ q }) => q.errTypes && q.errTypes.confusion > 0 && !(r.pairsOk[q.id] && (q.ah || []).every((h) => !h.endsWith("w") || `20${h.slice(0, 2)}-${h.slice(2, 4)}-${h.slice(4, 6)}` <= r.pairsOk[q.id])));
  const res = srcs.slice(0, 40).map(({ b, q }) => {
    const g = bigrams(q.q + q.a);
    const near = all.filter((x) => x.q.id !== q.id && x.q.q !== q.q && (x.b.id === b.id || (b.folderId && x.b.folderId === b.folderId)))
      .map((x) => ({ ...x, sim: jaccard(g, bigrams(x.q.q + x.q.a)) }))
      .sort((x, y) => y.sim - x.sim).slice(0, 3);
    return { b, q, near };
  }).filter((x) => x.near.length);
  pairCache.set(state.questionBanks, { key, res });
  return res;
}
function ConfusionPairs({ state, actions }) {
  const list = confusionPairs(state);
  const [i, setI] = useState(0);
  const [alt, setAlt] = useState(0);
  const [open, setOpen] = useState(false);
  if (!list.length) return (
    <Box title="混同ペアの対比カード" icon={<Shuffle size={18} />}>
      <p className="jp text-xs" style={{ color: "var(--ink-soft)" }}>問題をまちがえたとき、原因に「🔀 混同」を選ぶと、その問題といちばん似ている問題をここに並べます。似ている2つを見比べて、違いを整理しましょう。</p>
    </Box>
  );
  const cur = list[Math.min(i, list.length - 1)];
  const other = cur.near[alt % cur.near.length];
  const go = (d) => { setI((i + d + list.length) % list.length); setAlt(0); setOpen(false); };
  const card = (label, b, q, vs, color) => (
    <div className="p-2" style={{ background: "var(--paper)", border: `1.5px solid ${color}`, borderRadius: 8 }}>
      <div className="text-[10px] mb-1 flex items-center gap-1" style={{ color: "var(--ink-mute)" }}><span className="px-1.5" style={{ borderRadius: 4, background: color, color: "#fff", fontWeight: 800 }}>{label}</span><span className="truncate">{b.name}</span></div>
      <div className="text-[13px] break-words" style={{ color: "var(--ink)", lineHeight: 1.7 }}>{diffMarks(q.q, vs.q).map(([t, d], k) => <span key={k} style={d ? { background: "rgba(214,181,106,0.35)", borderBottom: "2px solid #b08a3e", fontWeight: 800 } : undefined}>{t}</span>)}</div>
      {open && <div className="text-[13px] mt-1.5 pt-1.5 break-words" style={{ borderTop: "1px dashed var(--rule-soft)", color: "var(--sky-deep)", fontWeight: 700 }}>→ {diffMarks(q.a, vs.a).map(([t, d], k) => <span key={k} style={d ? { background: "rgba(214,181,106,0.35)", borderBottom: "2px solid #b08a3e" } : undefined}>{t}</span>)}</div>}
    </div>
  );
  return (
    <Box title={`混同ペアの対比カード（${list.length}組）`} icon={<Shuffle size={18} />}>
      <div className="jp space-y-2">
        <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>「混同」でまちがえた問題と、よく似た問題を並べました。<b style={{ background: "rgba(214,181,106,0.35)" }}>違うところ</b>に印がついています。違いを言葉にできたら「整理できた」を押しましょう。</p>
        <div className="grid gap-2 md:grid-cols-2">
          {card("まちがえた問題", cur.b, cur.q, other.q, "#c9564e")}
          {card("似ている問題", other.b, other.q, cur.q, "#4f6fa8")}
        </div>
        {!open ? <button onClick={() => setOpen(true)} className="btn-info w-full py-2 text-sm">答えを並べて見る</button> : (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { actions.resolvePair(cur.q.id); SFX.play("defeat"); setOpen(false); setAlt(0); if (i >= list.length - 1) setI(0); }} className="btn-primary py-2 text-sm">整理できた</button>
            <button onClick={() => { setAlt(alt + 1); setOpen(false); }} disabled={cur.near.length < 2} className="btn-ghost py-2 text-sm" style={{ opacity: cur.near.length < 2 ? 0.5 : 1 }}>別の問題と比べる</button>
          </div>
        )}
        <div className="flex items-center justify-between text-xs" style={{ color: "var(--ink-soft)" }}>
          <button onClick={() => go(-1)} className="btn-ghost px-3 py-1 text-xs">◀ 前</button>
          <span>{Math.min(i, list.length - 1) + 1} / {list.length}組</span>
          <button onClick={() => go(1)} className="btn-ghost px-3 py-1 text-xs">次 ▶</button>
        </div>
      </div>
    </Box>
  );
}

function TodayTab({ header = null, state, recordSRAnswer, updateSrSettings, startTimer, stopTimer, toggleQuestionMark, rpgActionsForPairs, preset, onPresetUsed, planActions }) {
  const today = todayStr();
  const due = [];
  const fresh = [];
  const sc = studyScope(state);
  const ws = worldsInUse(state);
  let otherDue = 0; // 勉強の範囲の外の世界の復習
  state.questionBanks.forEach((b) => {
    if (!sc.inScope(b)) { (b.questions || []).forEach((q) => { if (!q.excluded && q.sr_nextReview && q.sr_nextReview <= today) otherDue++; }); return; }
    (b.questions || []).forEach((q) => {
      if (q.excluded) return;
      const it = { bankId: b.id, bankName: b.name, year: b.year || "", qId: q.id };
      if (!q.sr_nextReview) fresh.push(it);
      else if (q.sr_nextReview <= today) due.push({ ...it, nr: q.sr_nextReview });
    });
  });
  due.sort((a, b) => (a.nr < b.nr ? -1 : a.nr > b.nr ? 1 : 0)); // 期限の古い順
  const fin = finishInfo(state);
  if (fin) {
    const sch = getFsrsScheduler(state.srSettings), now = new Date(), early = [];
    state.questionBanks.forEach((b) => sc.inScope(b) && (b.questions || []).forEach((q) => {
      if (q.excluded || !q.sr_nextReview || q.sr_nextReview <= today) return;
      let r = 1; try { r = sch.get_retrievability(toFsrsCard(q, now), now, false); } catch (e) { r = 1; }
      if (r < FINISH_RETENTION) early.push({ bankId: b.id, bankName: b.name, year: b.year || "", qId: q.id, nr: q.sr_nextReview, r, early: true });
    }));
    early.sort((a, b) => a.r - b.r).forEach((x) => due.push(x));
  }

  const [setSize, setSetSize] = useState(20);
  const [includeNew, setIncludeNew] = useState(true);
  const [queue, setQueue] = useState(null); // null = 開始前 / [] = セット完了
  const [showAnswer, setShowAnswer] = useState(false);
  const [result, setResult] = useState({ sure: 0, unsure: 0, wrong: 0, err: {} });
  const [battleKey, setBattleKey] = useState(null); // バトル演出：セットを始めるたびに変える
  const [pInfo, setPInfo] = useState(null); // 特別な出題 { kind: weekly|night|morning|pretest, title, ... }
  const [onlyA, setOnlyA] = useState(false); // 重要度Aだけ
  const doneRef = useRef(null);
  const timerStartedByMe = useRef(false);
  const ranks = questionRanks(state);

  const item = queue && queue.length > 0 ? queue[0] : null;
  const bank = item ? state.questionBanks.find((b) => b.id === item.bankId) : null;
  const q = bank ? (bank.questions || []).find((x) => x.id === item.qId) : null;

  // 問題が削除・移動されて見つからない場合はスキップ
  useEffect(() => { if (item && !q) setQueue((qq) => (qq ? qq.slice(1) : qq)); }, [item, q]);
  // タブを離れたら自分で開始したタイマーを止める
  useEffect(() => () => { if (timerStartedByMe.current) { stopTimer(); timerStartedByMe.current = false; } }, []);

  const stopMyTimer = () => { if (timerStartedByMe.current) { stopTimer(); timerStartedByMe.current = false; } };

  // ホームの「忘れかけの3問」や、ほかの画面の「この問題を解く」から来たときは、すぐに始める
  const startSpecial = (items, info) => {
    if (!items || !items.length) return;
    setPInfo(info || null); doneRef.current = null;
    setBattleKey(uid()); setQueue(items); setShowAnswer(false); setResult({ sure: 0, unsure: 0, wrong: 0, err: {} });
    if (!state.timer.startMs) { startTimer(null, "qa"); timerStartedByMe.current = true; }
  };
  useEffect(() => {
    if (!preset) return;
    const items = Array.isArray(preset) ? preset : preset.items;
    if (items && items.length) startSpecial(items, Array.isArray(preset) ? null : (({ items: _i, ...info }) => info)(preset));
    if (onPresetUsed) onPresetUsed();
  }, [preset]);
  // 特別な出題が終わったら、結果を記録（抜き打ちテストの点数・寝る前と朝の確認）
  useEffect(() => {
    if (queue && queue.length === 0 && pInfo && doneRef.current !== battleKey) {
      doneRef.current = battleKey;
      if (rpgActionsForPairs && rpgActionsForPairs.finishSpecial) rpgActionsForPairs.finishSpecial(pInfo, result);
    }
  }, [queue]);
  const start = () => {
    const pool = [...due, ...(includeNew ? shuffle(fresh) : [])].filter((it) => !onlyA || ranks.get(it.qId) === "A");
    // 全部の世界をまぜるときは、決めた配分で世界ごとに取る
    const mix = (state.displaySettings || {}).studyMix;
    const bankWorld = new Map(state.questionBanks.map((b) => [b.id, bankWorldId(state, b)]));
    const picked0 = !sc.on && mix && ws.length >= 2 ? mixByWorld(pool, mix, setSize, (it) => bankWorld.get(it.bankId)) : pool.slice(0, setSize);
    setPInfo(null);
    const picked = STUDY_PREFS.mix ? interleaveItems(picked0) : picked0;
    if (picked.length === 0) return;
    setBattleKey(uid());
    setQueue(picked);
    setShowAnswer(false);
    setResult({ sure: 0, unsure: 0, wrong: 0, err: {} });
    if (!state.timer.startMs) { startTimer(null, "qa"); timerStartedByMe.current = true; }
  };

  const answer = (correct, meta) => {
    if (!item || !q) return;
    recordSRAnswer(item.bankId, q.id, correct, meta);
    setResult((r) => {
      const n = { ...r, err: { ...r.err } };
      if (correct) { if (meta && meta.conf === "unsure") n.unsure++; else n.sure++; }
      else { n.wrong++; if (meta && meta.errType) n.err[meta.errType] = (n.err[meta.errType] || 0) + 1; }
      return n;
    });
    const rest = queue.slice(1);
    // 類題で追い打ち：まちがえたら、同じ条文の別の問題を1問あとに入れる
    if (!correct && STUDY_PREFS.followUp && !item.followUp) {
      const fu = followUpFor(state, q, queue);
      if (fu) rest.splice(Math.min(1, rest.length), 0, fu);
    }
    if (rest.length === 0) stopMyTimer();
    setQueue(rest);
    setShowAnswer(false);
  };

  // ── 開始前の画面 ──
  if (queue === null) {
    const available = due.length + (includeNew ? fresh.length : 0);
    // 世界の配分のえらびかた（2つの世界なら 7:3・5:5・3:7、3つ以上なら均等）
    const curMix = (state.displaySettings || {}).studyMix || null;
    const mixOpts = ws.length === 2
      ? [null, [7, 3], [5, 5], [3, 7]].map((v) => (v ? { [ws[0].world.id]: v[0], [ws[1].world.id]: v[1] } : null))
      : [null, Object.fromEntries(ws.map((x) => [x.world.id, 1]))];
    const mixLabel = (m) => (!m ? "おまかせ（期限の古い順）" : ws.length === 2 ? `${ws[0].world.name} ${m[ws[0].world.id]}：${ws[1].world.name} ${m[ws[1].world.id]}` : "均等");
    const sameMix = (a, b) => JSON.stringify(a || null) === JSON.stringify(b || null);
    return (
      <div className="space-y-3">
        <StudyScopeBar state={state} note={sc.on && otherDue ? `ほかの世界にも、復習期限が来た問題が${otherDue}問あります。` : null} />
        {header}
        {planActions && <PlanSummary state={state} onOpen={planActions.goRoom} />}
        <Box title="今日の復習" icon={<Calendar size={18} />}>
          {fin && (
            <div className="jp text-[11px] mb-2 px-2 py-1.5" style={{ background: "rgba(201,86,78,0.07)", border: "1px solid var(--brick)", borderRadius: 8, color: "var(--ink)" }}>
              🔥 <b>試験前の仕上げ期間</b>（{fin.qual.name}まで あと{fin.days}日）：目標の記憶率を95%に上げ、忘れかけの問題（{due.filter((x) => x.early).length}問）を前倒しで出しています。
              <button onClick={() => updateSrSettings && updateSrSettings({ finish: false })} className="ml-1 underline text-[10px]" style={{ background: "none", border: "none", color: "var(--ink-mute)", cursor: "pointer" }}>やめる</button>
            </div>
          )}
          {!fin && (state.srSettings || {}).finish === false && <button onClick={() => updateSrSettings && updateSrSettings({ finish: true })} className="jp text-[10px] mb-2 underline" style={{ background: "none", border: "none", color: "var(--ink-mute)", cursor: "pointer" }}>試験前の仕上げ（30日前から目標95%）をオンにする</button>}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Mini label="復習期限が来た問題" value={due.length ? `${due.length}問・${fmtEst(estimateMinutes(state, due))}` : "0問"} highlight={due.length > 0} />
            <Mini label="未学習の問題" value={`${fresh.length}問`} />
          </div>
          <LevelCard state={state} updateSrSettings={updateSrSettings} />
          {due.length + fresh.length === 0 ? (
            <p className="jp text-sm text-center py-3" style={{ color: "var(--sky-deep)" }}>✅ 今日の復習は完了！また明日。</p>
          ) : (
            <>
              <div className="jp text-xs mb-1" style={{ color: "var(--ink-soft)" }}>1セットの問題数</div>
              <div className="grid grid-cols-4 gap-1 mb-3">
                {[10, 20, 50, 100].map((n) => (
                  <button key={n} onClick={() => setSetSize(n)} className="jp py-1.5 text-sm" style={{ background: setSize === n ? "var(--sky-deep)" : "var(--paper)", color: setSize === n ? "var(--paper)" : "var(--ink)", border: "1px solid var(--rule)" }}>{n}問</button>
                ))}
              </div>
              {!sc.on && ws.length >= 2 && (
                <div className="mb-3">
                  <div className="jp text-xs mb-1" style={{ color: "var(--ink-soft)" }}>世界の配分（1セットの中で）</div>
                  <div className="flex flex-wrap gap-1">
                    {mixOpts.map((m, i) => { const on = sameMix(m, curMix); return <button key={i} onClick={() => setDisplay({ studyMix: m })} className="jp text-[11px] px-2.5 py-1" style={{ borderRadius: 999, border: `1px solid ${on ? "var(--gold)" : "var(--rule-soft)"}`, background: on ? "var(--cream)" : "var(--paper)", color: "var(--ink)", fontWeight: on ? 800 : 500, cursor: "pointer" }}>{mixLabel(m)}</button>; })}
                  </div>
                </div>
              )}
              <div className="mb-3 space-y-2">
                <ConfigToggle label="未学習の問題も出題する" sub="復習期限の問題を優先し、足りない分を未学習から補います" value={includeNew} onChange={setIncludeNew} />
                <ConfigToggle label="重要度Aの問題だけ出す（時間がない日に）" sub={`よく出る条文・まちがえやすさで自動判定。今日の対象のうちA：${[...due, ...(includeNew ? fresh : [])].filter((it) => ranks.get(it.qId) === "A").length}問`} value={onlyA} onChange={setOnlyA} />
              </div>
              <button onClick={start} disabled={available === 0} className="jp btn-primary w-full py-3 flex items-center justify-center gap-2">
                <Play size={16} /> {Math.min(setSize, available)}問スタート
              </button>
              <div className="mt-3">
                <div className="jp text-xs mb-1" style={{ color: "var(--ink-soft)" }}>目標の記憶率</div>
                <div className="grid grid-cols-4 gap-1">
                  {[0.8, 0.85, 0.9, 0.95].map((r) => {
                    const cur = (state.srSettings && state.srSettings.retention) || SR_DEFAULTS.retention;
                    const on = Math.abs(cur - r) < 0.001;
                    return <button key={r} onClick={() => updateSrSettings && updateSrSettings({ retention: r })} className="jp py-1.5 text-sm" style={{ background: on ? "var(--sage)" : "var(--paper)", color: on ? "var(--paper)" : "var(--ink)", border: "1px solid var(--rule)" }}>{Math.round(r * 100)}%</button>;
                  })}
                </div>
                <p className="jp text-[10px] mt-1" style={{ color: "var(--ink-mute)" }}>
                  高いほど復習の回数が増え、低いほど間隔が空きます（Ankiの標準は90%）。
                </p>
              </div>
              <p className="jp text-[10px] mt-2" style={{ color: "var(--ink-mute)" }}>
                出題間隔はAnkiと同じFSRSで、問題ごとに自動で計算されます。ボタンの下に次回までの日数が表示されます。
              </p>
            </>
          )}
        </Box>
        {curWorld(state).id === "home" && <TatakiDueCard state={state} />}
        {homeSide(state) && <KijutsuDueCard state={state} />}
        {featOn("special") && <SpecialQuizCards state={state} onStart={startSpecial} />}
        <WeakLink state={state} />
        {featOn("confusion") && <ConfusionPairs state={state} actions={rpgActionsForPairs} />}
        {featOn("listen") && <ListenMode state={state} due={due} toggleQuestionMark={toggleQuestionMark} />}
        {featOn("review") && (
        <Fold title="📈 ふりかえり・予報" sub="記憶の通知表・今週の処方箋・復習の予報・記憶の天気図" k="today-look">
          <MemoryReportCard state={state} />
          <Prescription state={state} />
          <ReviewForecast state={state} />
          <MemoryWeather state={state} />
        </Fold>
        )}
      </div>
    );
  }

  // ── セット完了の画面 ──
  if (queue.length === 0) {
    const errList = ERROR_TYPES.filter((t) => result.err[t.id]);
    const okN = result.sure + result.unsure, allN = okN + result.wrong;
    return (
      <Box title={pInfo ? `${pInfo.title}　完了！` : "セット完了！"} icon={<Award size={18} />}>
        {pInfo && (
          <div className="jp text-center mb-2 px-2 py-2" style={{ background: "var(--cream)", border: "1px solid var(--gold)", borderRadius: 8 }}>
            <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 28, color: "var(--gold)" }}>{okN} / {allN}</div>
            <div className="text-[11px]" style={{ color: "var(--ink-soft)" }}>{pInfo.kind === "weekday" ? "曜日の迷宮の報酬は、正解1問につき20G（ふだんの2倍）と、その科目の欠片です（1日1回）。" : pInfo.kind === "bounty" ? "正解した賞金首は★が1つ増えます。ちがう日に3回続けて正解すると、依頼書から報酬を受け取れます。" : pInfo.kind === "weekly" ? "今週の抜き打ちテストの点数として記録しました。" : pInfo.kind === "night" ? "おやすみなさい。明日の朝、同じ問題でもう一度確かめましょう。" : pInfo.kind === "morning" ? (result.wrong ? "まだ残っている所は、自分ルールやメモで補強しましょう。" : "ひと晩たっても覚えていました。記憶が定着しています！") : pInfo.kind === "pretest" ? "わからなくて大丈夫。先に「わからない」を体験すると、このあと学ぶ内容が頭に入りやすくなります。" : "おつかれさまでした。"}</div>
          </div>
        )}
        <BattleResult state={state} battleKey={battleKey} />
        <div className="grid grid-cols-3 gap-2 mb-3">
          <Mini label="◎ 確実" value={`${result.sure}問`} />
          <Mini label="△ 自信なし" value={`${result.unsure}問`} highlight={result.unsure > 0} />
          <Mini label="✕ 不正解" value={`${result.wrong}問`} highlight={result.wrong > 0} />
        </div>
        {errList.length > 0 && (
          <div className="mb-3">
            <div className="jp text-xs mb-1" style={{ color: "var(--ink-soft)" }}>間違いの原因</div>
            <div className="flex flex-wrap gap-1">
              {errList.map((t) => (
                <span key={t.id} className="jp text-[11px] px-2 py-0.5" style={{ background: "var(--cream)", border: "1px solid var(--rule-soft)", color: "var(--ink)" }}>{t.icon} {t.label} {result.err[t.id]}</span>
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setQueue(null)} className="jp btn-ghost py-2">戻る</button>
          <button onClick={start} disabled={due.length + (includeNew ? fresh.length : 0) === 0} className="jp btn-primary py-2">{pInfo ? "いつもの復習へ" : "もう1セット"}</button>
        </div>
      </Box>
    );
  }

  // ── 出題中の画面 ──
  if (!q) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={() => { stopMyTimer(); setQueue(null); }} className="jp text-xs flex items-center gap-1" style={{ color: "var(--ink-soft)" }}><XIcon size={14} /> 中断</button>
        <div className="pixel text-xs" style={{ color: "var(--sky-deep)" }}>{pInfo ? `${pInfo.title}・` : "📅 "}残り {queue.length}</div>
      </div>
      <BattleStage state={state} q={q} bankName={item.bankName} battleKey={battleKey} />
      <div className="rpg-box p-1">
        <div className="rpg-inner-border min-h-[180px] flex flex-col">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="jp text-[10px]" style={{ color: "var(--ink-mute)" }}>
              <RankChip r={ranks.get(q.id)} /> {item.followUp ? <b style={{ color: "var(--brick)" }}>🎯 類題（さっきと同じ条文）</b> : item.early ? "🔥 前倒し" : q.sr_nextReview ? "🔁 復習" : "🆕 初回"} ・ {item.bankName}{item.year && ` ・ ${item.year}`}
            </div>
            <button onClick={() => toggleQuestionMark(item.bankId, q.id)} className="jp text-[11px] px-1.5 py-0.5 flex-shrink-0" style={{ border: "1px solid var(--rule)", background: q.marked ? "var(--gold)" : "var(--paper)", color: q.marked ? "var(--paper)" : "var(--ink-soft)" }}>⭐ {q.marked ? "マーク中" : "マーク"}</button>
          </div>
          <div className="qtext jp text-base md:text-lg flex-1 break-words" style={{ color: "var(--ink)" }}>{renderQText(q.q, q.q_formats, q.a)}</div>
          <QuestionImages bankId={item.bankId} question={q} side="q" />
          {showAnswer ? (
            <>
              <div className="jp text-[10px] mt-3 mb-1" style={{ color: "var(--gold)" }}>答え</div>
              <div className="qtext jp text-base md:text-lg break-words p-2" style={{ background: "var(--sky-pale)", border: "1px solid var(--gold)", color: "var(--ink)" }}>{renderFormattedText(q.a, q.a_formats)}</div>
              <QuestionImages bankId={item.bankId} question={q} side="a" />
              <LawRefChips q={q} />
              {q.memo && <div className="jp text-[11px] mt-2 p-2" style={{ background: "var(--cream)", border: "1px dashed var(--rule-soft)", color: "var(--ink-soft)", whiteSpace: "pre-wrap" }}>📝 {q.memo}</div>}
              <AnswerPanel onAnswer={answer} question={q} srSettings={effectiveSr(state)} />
              <AnswerHistory q={q} />
            </>
          ) : (
            <RevealButton q={q} onReveal={() => setShowAnswer(true)} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── 週末の抜き打ちテスト・寝る前の10問・朝の確認 ──
function SpecialQuizCards({ state, onStart }) {
  const r = normRpg(state.rpg);
  const now = new Date(), today = todayStr(), wk = weekKey();
  const dow = now.getDay(); // 0=日 6=土
  const cards = [];
  // 週末の抜き打ちテスト（土・日）：今週答えた問題から10問。早い日に答えた問題を優先
  if (dow === 0 || dow === 6) {
    const done = (r.weeklyTest || {})[wk];
    const pool = answeredSince(state, wk).sort((a, b) => (a.first < b.first ? -1 : 1));
    const items = shuffle(pool.slice(0, 16)).slice(0, 10);
    const hist = Object.entries(r.weeklyTest || {}).sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(-6);
    cards.push(
      <Box key="wk" title="週末の抜き打ちテスト" icon={<Award size={18} />}>
        <div className="jp space-y-2">
          <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>今週解いた問題から10問。少し時間をあけて思い出すと、記憶がいちばん強くなります。</p>
          {hist.length > 0 && (
            <div className="flex items-end gap-1" style={{ height: 46 }}>
              {hist.map(([k, v]) => <div key={k} className="flex-1 text-center"><div style={{ height: Math.max(3, (v.ok / Math.max(1, v.n)) * 34), background: k === wk ? "var(--gold)" : "#b8c6dc", borderRadius: 3 }} /><div className="text-[8px]" style={{ color: "var(--ink-mute)" }}>{Number(k.slice(5, 7))}/{Number(k.slice(8, 10))}週</div></div>)}
            </div>
          )}
          {done ? <div className="text-center text-xs" style={{ color: "var(--gold)", fontWeight: 800 }}>今週の点数：{done.ok} / {done.n}<button onClick={() => onStart(items, { kind: "weekly", title: "抜き打ちテスト", wk })} className="btn-ghost text-[10px] px-2 py-0.5 ml-2">もう一度</button></div>
            : <button disabled={items.length < 5} onClick={() => onStart(items, { kind: "weekly", title: "抜き打ちテスト", wk })} className="btn-primary w-full py-2">{items.length < 5 ? "今週解いた問題が5問以上になると受けられます" : `抜き打ちテストを受ける（${items.length}問）`}</button>}
        </div>
      </Box>
    );
  }
  // 朝の確認：ゆうべ「寝る前の10問」を解いたら、翌日にもう一度
  const sl = r.sleep || {};
  if (sl.date === addDays(today, -1) && sl.morning !== today && (sl.ids || []).length) {
    const items = [];
    state.questionBanks.forEach((b) => (b.questions || []).forEach((q) => { if (sl.ids.includes(q.id)) items.push({ bankId: b.id, bankName: b.name, year: b.year || "", qId: q.id }); }));
    if (items.length) cards.push(
      <Box key="mo" title="☀ 朝の確認" icon={<Calendar size={18} />}>
        <p className="jp text-[11px] mb-2" style={{ color: "var(--ink-soft)" }}>ゆうべ寝る前に復習した{items.length}問を、もう一度。ひと晩たっても覚えているかを確かめます。</p>
        <button onClick={() => onStart(items, { kind: "morning", title: "朝の確認" })} className="jp btn-primary w-full py-2">朝の確認を始める</button>
      </Box>
    );
  }
  // 寝る前の10問（20時から）：今日まちがえた問題
  if (now.getHours() >= 20 && sl.date !== today) {
    const items = answeredSince(state, today, true).slice(0, 10);
    if (items.length) cards.push(
      <Box key="ni" title="🌙 寝る前の10問" icon={<Calendar size={18} />}>
        <p className="jp text-[11px] mb-2" style={{ color: "var(--ink-soft)" }}>今日まちがえた問題（{items.length}問）を、寝る前にもう一度。寝ているあいだに記憶が整理されます。明日の朝、同じ問題で確かめます。</p>
        <button onClick={() => onStart(items, { kind: "night", title: "寝る前の復習", ids: items.map((x) => x.qId) })} className="jp btn-primary w-full py-2">寝る前の復習を始める</button>
      </Box>
    );
  }
  return cards.length ? <>{cards}</> : null;
}
// ── 記憶の通知表：今日の学習の成果を1枚に ──
function memoryReport(state) {
  const today = todayStr(), code = ymdCode(today), tmr = addDays(today, 1);
  let ans = 0, ok = 0, fresh = 0, saved = 0, tomorrow = 0;
  state.questionBanks.forEach((b) => (b.questions || []).forEach((q) => {
    const ah = (q.ah || []).map(String);
    const td = ah.filter((h) => h.startsWith(code));
    if (q.sr_nextReview === tmr) tomorrow++;
    if (!td.length) return;
    ans += td.length; ok += td.filter((h) => !h.endsWith("w")).length;
    const before = ah.filter((h) => !h.startsWith(code));
    const lastOk = !td[td.length - 1].endsWith("w");
    if (!before.length && lastOk) fresh++;
    if (before.length && lastOk) saved++;
  }));
  const acc = ans ? ok / ans : 0;
  const grade = !ans ? null : acc >= 0.9 ? ["秀", "#b08a3e"] : acc >= 0.8 ? ["優", "#4f8a72"] : acc >= 0.65 ? ["良", "#4f7fb8"] : ["可", "#8a6ca6"];
  return { ans, ok, acc, fresh, saved, tomorrow, grade, risky: forgettingItems(state, 3) };
}
function MemoryReportCard({ state }) {
  const m = memoryReport(state);
  if (!m.ans) return null;
  const qOf = (it) => { const b = state.questionBanks.find((x) => x.id === it.bankId); const q = b && (b.questions || []).find((x) => x.id === it.qId); return q ? String(q.q) : ""; };
  return (
    <Box title="記憶の通知表（今日）" icon={<Award size={18} />}>
      <div className="jp flex items-center gap-3">
        <div className="text-center" style={{ width: 64, flexShrink: 0 }}>
          <div style={{ width: 56, height: 56, margin: "0 auto", borderRadius: "50%", border: `3px double ${m.grade[1]}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Shippori Mincho B1', serif", fontWeight: 800, fontSize: 28, color: m.grade[1] }}>{m.grade[0]}</div>
          <div className="text-[10px] mt-0.5" style={{ color: "var(--ink-soft)" }}>正答率 {Math.round(m.acc * 100)}%</div>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-1 text-[11px]">
          {[["解いた", `${m.ans}問`], ["新しく覚えた", `${m.fresh}問`], ["忘れかけを救った", `${m.saved}問`], ["明日の復習", `${m.tomorrow}問`]].map(([k, v]) => <div key={k} className="px-1.5 py-1" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 6 }}><div className="text-[9px]" style={{ color: "var(--ink-mute)" }}>{k}</div><div style={{ fontWeight: 800, color: "var(--ink)" }}>{v}</div></div>)}
        </div>
      </div>
      {m.risky.length > 0 && <div className="jp text-[10px] mt-2" style={{ color: "var(--ink-soft)" }}>⚠ 明日あぶない問題：{m.risky.map((it, i) => <span key={it.qId}>{i ? "／" : ""}{qOf(it).slice(0, 18)}…</span>)}</div>}
    </Box>
  );
}

// ── 2. 間違いの種類別の処方箋：この1週間のまちがいの傾向から、次にやることを案内 ──
const RX = {
  knowledge: { name: "知識不足", go: "修練の塔「条文の穴埋め」「条文の音読モード」", tip: "覚えていなかった問題が多めです。条文に戻って、言葉ごと覚え直しましょう。" },
  confusion: { name: "混同", go: "今日タブ「混同ペアの対比カード」", tip: "似た知識の取り違えが多めです。2つを並べて、違いの一点を見つけましょう。" },
  misread: { name: "読み違い", go: "画面上部の「⚙ 設定」で「ひっかけ言葉の印」をオン", tip: "問題文の読み違いが多めです。否定語・主語・数字に印を付けて読みましょう。" },
  careless: { name: "ケアレス", go: "修練の塔「時間配分トレーニング」", tip: "わかっていたのに落とすミスが多めです。答える前の見直し手順を決めましょう。" },
  slow: { name: "時間がかかる", go: "修練の塔「時間配分トレーニング」", tip: "思い出すまでの時間が長めです。数字や結論を即答できるまで、短い周期で回しましょう。" },
  sure: { name: "思い込み", go: "周回の塔 → 弱点・分析 → 学習の分析「思い込み度」", tip: "「確実」で答えてまちがえる問題があります。根拠の条文まで確かめましょう。" },
};
function Prescription({ state }) {
  const from = ymdCode(addDays(todayStr(), -6));
  const cnt = {};
  let wrongs = 0;
  state.questionBanks.forEach((b) => (b.questions || []).forEach((q) => {
    const wk = (q.ah || []).map(String).filter((h) => h.slice(0, 6) >= from);
    if (!wk.length) return;
    const w = wk.filter((h) => h.endsWith("w")).length;
    if (w) { wrongs += w; Object.keys(q.errTypes || {}).forEach((k) => { cnt[k] = (cnt[k] || 0) + w; }); if (q.lastConf === "wrongSure") cnt.sure = (cnt.sure || 0) + w; }
    if ((q.ts || []).some((sec) => sec >= (STUDY_PREFS.slowSec || 25))) cnt.slow = (cnt.slow || 0) + 1;
  }));
  const ranked = Object.entries(cnt).filter(([k]) => RX[k]).sort((a, b) => b[1] - a[1]);
  if (!ranked.length || wrongs < 3) return null;
  const [top, n] = ranked[0];
  return (
    <Box title="今週の処方箋" icon={<Bookmark size={18} />}>
      <div className="jp space-y-1.5">
        <div className="text-sm" style={{ fontWeight: 800, color: "var(--ink)" }}>💊 いちばん多いのは「{RX[top].name}」（{n}件）</div>
        <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>{RX[top].tip}</p>
        <div className="text-[11px] px-2 py-1.5" style={{ background: "var(--cream)", border: "1px solid var(--gold)", borderRadius: 6, color: "var(--ink)" }}>おすすめ：<b>{RX[top].go}</b></div>
        {ranked.length > 1 && <p className="text-[10px]" style={{ color: "var(--ink-mute)" }}>ほかに：{ranked.slice(1, 4).map(([k, v]) => `${RX[k].name}${v}件`).join("・")}（この1週間のまちがい {wrongs}回から）</p>}
      </div>
    </Box>
  );
}
// たためる欄（開いたかどうかは端末に覚える）
function Fold({ title, sub, k, children }) {
  const [open, setOpen] = useState(() => { try { return localStorage.getItem(`sq-fold-${k}`) === "1"; } catch (e) { return false; } });
  const flip = () => { const v = !open; setOpen(v); try { localStorage.setItem(`sq-fold-${k}`, v ? "1" : "0"); } catch (e) { /* 無視 */ } };
  return (
    <div className="space-y-3">
      <button onClick={flip} className="jp w-full flex items-center gap-2 px-3 py-2 text-left" style={{ borderRadius: 10, border: "1px dashed var(--rule-soft)", background: "var(--paper)", cursor: "pointer", color: "var(--ink)" }}>
        <span className="flex-1"><span className="block text-[13px]" style={{ fontWeight: 800 }}>{title}</span>{sub && <span className="block text-[10px]" style={{ color: "var(--ink-mute)" }}>{sub}</span>}</span>
        <span style={{ color: "var(--ink-soft)" }}>{open ? "▲ たたむ" : "▼ ひらく"}</span>
      </button>
      {open && children}
    </div>
  );
}
// 今日タブの「弱点集」への入口（2026年10月22日、討伐依頼書を弱点集にまとめた）
function WeakLink({ state }) {
  const list = bounties(state);
  if (!list.length) return null;
  const ready = list.filter((x) => x.ready).length;
  return (
    <button onClick={() => window.dispatchEvent(new CustomEvent("sq-open-past", { detail: { to: "laps", view: "weak" } }))} className="jp w-full flex items-center gap-2 px-3 py-2 text-left" style={{ borderRadius: 10, border: "1px solid #c9a6a2", background: "var(--paper)", cursor: "pointer", color: "var(--ink)" }}>
      <span style={{ fontSize: 20 }} aria-hidden="true">💀</span>
      <span className="flex-1"><span className="block text-[13px]" style={{ fontWeight: 800 }}>弱点集（賞金首 {list.length}）</span><span className="block text-[10px]" style={{ color: "var(--ink-soft)" }}>2回以上まちがえた問題。ちがう日に3回続けて正解で卒業・賞金{ready ? `（いま受け取れる ${ready}）` : ""}</span></span>
      <span style={{ color: "var(--sky-deep)", fontWeight: 800 }}>周回の塔へ ▶</span>
    </button>
  );
}
// 今日タブ：今日の叩き込みのお知らせ
function TatakiDueCard({ state }) {
  const t = tatakiToday(state);
  if (!t.due && !t.newLeft) return null;
  return (
    <Box title={`申請書の叩き込み（第${t.lap}周）`} icon={<ScrollIcon size={18} />}>
      <div className="jp flex items-center gap-2">
        <span className="flex-1 text-[12px]" style={{ color: "var(--ink)" }}>今日のカード：復習 <b>{t.due}枚</b>・新しい <b>{t.newLeft}枚</b></span>
        <button onClick={() => window.dispatchEvent(new CustomEvent("sq-open-past", { detail: { to: "laps", tataki: true } }))} className="btn-primary text-xs px-3 py-1.5">叩き込む ▶</button>
      </div>
    </Box>
  );
}

function KijutsuDueCard({ state }) {
  const due = kjDue((normRpg(state.rpg).kijutsu || {}).res, todayStr());
  if (!due.length) return null;
  return (
    <Box title={`記述式の復習（${due.length}年）`} icon={<ScrollIcon size={18} />}>
      <div className="jp space-y-1.5">
        <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>記述式の道場で解いた年のうち、もう一度解く日が来たものです（前回の点が低いほど早く来ます）。</p>
        {due.slice(0, 5).map((x) => <button key={x.id} onClick={() => window.dispatchEvent(new CustomEvent("sq-open-past", { detail: { to: "laps", key: x.id } }))} className="w-full text-left text-[12px] px-2 py-1.5 flex" style={{ ...chipSt(false), borderRadius: 8 }}><span className="flex-1">{kjLabel(x.id)}</span><span style={{ color: "var(--ink-mute)" }}>前回 {x.r.last}点 ▶</span></button>)}
      </div>
    </Box>
  );
}

export { TodayTab };
