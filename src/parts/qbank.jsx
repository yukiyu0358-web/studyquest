// QBankTab とその部品（2026-10-26、App.jsx から切り出し。開いたときに読み込む）
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
import { AnswerHistory, AnswerPanel, BattleResult, BattleStage, Box, ConfigToggle, ERROR_TYPES, LapRecordsPanel, LawRefChips, QuestionImages, RevealButton, Stat, StudyScopeBar, XP_QA_REVENGE, chosenQual, effectiveSr, formatErrTypes, healthReport, isQuestionAutoWeak, isQuestionWeak, mainQual, renderFormattedText, renderQText, shuffle, studyScope, todayStr, uid, worldOfQual } from "../App.jsx";

const XP_QA_AT_5 = 10;
const XP_QA_AT_10 = 20;
const XP_QA_AT_20 = 50;
const XP_QA_STREAK_5 = 15;
const XP_QA_COMPLETE = 100;
// 高速周回（2026年10月21日）：最近3回とも◎（自信ありの正解）・ちがう日に2日以上・かかった秒数が FAST_SEC 以内の問題は「定着」として周回で飛ばす。
// 飛ばした問題からも FAST_SPOT の割合で抜き打ちに出す（⭐の問題は飛ばさない）
const FAST_SEC = 10, FAST_SPOT = 0.1;
const isSettled = (q) => {
  if (!q || q.excluded || q.marked) return false;
  const ah = (q.ah || []).slice(-3).map(String);
  if (ah.length < 3 || !ah.every((h) => h.endsWith("s")) || new Set(ah.map((h) => h.slice(0, 6))).size < 2) return false;
  const ts = (q.ts || []).slice(-3);
  return !ts.length || ts.every((x) => x <= FAST_SEC);
};

// ============ Status Tab ============

// ── 学習カレンダー（草グラフ）汎用コンポーネント ──
function StudyCalendar({ data, title, emptyColor = "var(--rule-soft)", colorFn, labelFn }) {
  const today = new Date();
  const WEEKS = 17;
  const DAYS = 7;
  // 17週分の開始日を計算（今日の曜日から直近の月曜を基点）
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (WEEKS * 7 - 1));
  const cells = [];
  for (let w = 0; w < WEEKS; w++) {
    for (let d = 0; d < DAYS; d++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + w * 7 + d);
      const key = date.toISOString().slice(0, 10);
      cells.push({ date, key, value: data[key] || 0 });
    }
  }
  const months = [];
  let lastMonth = null;
  cells.forEach((c, i) => {
    const m = c.date.getMonth();
    if (m !== lastMonth && i % 7 === 0) { months.push({ label: `${c.date.getMonth() + 1}月`, weekIdx: Math.floor(i / 7) }); lastMonth = m; }
  });
  const DAY_LABELS = ["月", "水", "金", ""];
  const DAY_ROWS = [0, 2, 4, 6];
  return (
    <div>
      {title && <div className="jp text-[11px] mb-1" style={{ color: "var(--ink-soft)" }}>{title}</div>}
      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "inline-flex", flexDirection: "column", gap: 0 }}>
          {/* 月ラベル */}
          <div style={{ display: "flex", paddingLeft: "18px", marginBottom: "2px" }}>
            {Array.from({ length: WEEKS }).map((_, wi) => {
              const m = months.find(m => m.weekIdx === wi);
              return <div key={wi} style={{ width: "13px", fontSize: "8px", color: "var(--ink-mute)", fontFamily: "sans-serif" }}>{m ? m.label : ""}</div>;
            })}
          </div>
          {/* グリッド */}
          <div style={{ display: "flex", gap: "0px" }}>
            {/* 曜日ラベル */}
            <div style={{ display: "flex", flexDirection: "column", marginRight: "2px" }}>
              {Array.from({ length: DAYS }).map((_, d) => (
                <div key={d} style={{ height: "13px", width: "16px", fontSize: "8px", color: "var(--ink-mute)", fontFamily: "sans-serif", lineHeight: "13px", textAlign: "right", paddingRight: "2px" }}>
                  {DAY_ROWS.includes(d) ? DAY_LABELS[DAY_ROWS.indexOf(d)] : ""}
                </div>
              ))}
            </div>
            {/* セル */}
            {Array.from({ length: WEEKS }).map((_, wi) => (
              <div key={wi} style={{ display: "flex", flexDirection: "column", gap: "2px", marginRight: "2px" }}>
                {Array.from({ length: DAYS }).map((_, di) => {
                  const cell = cells[wi * 7 + di];
                  if (!cell) return <div key={di} style={{ width: "11px", height: "11px" }} />;
                  const bg = cell.value > 0 ? colorFn(cell.value) : emptyColor;
                  const label = labelFn ? labelFn(cell.value, cell.key) : cell.value;
                  return (
                    <div key={di} title={`${cell.key}: ${label}`} style={{ width: "11px", height: "11px", background: bg, borderRadius: "2px", cursor: "default" }} />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
// 問題タブの上の注意（保存の上限に近いものがあるときだけ）
function HealthWarning({ state }) {
  const h = healthReport(state);
  if (!h.danger) return null;
  const names = [...h.banks.filter((x) => x.level === "danger").map((x) => x.b.name), ...(h.mainLevel === "danger" ? ["学習記録の本体"] : [])];
  return <div className="jp text-xs px-3 py-2 mb-3" style={{ background: "rgba(201,86,78,0.08)", border: "1px solid #c9564e", borderRadius: 8, color: "#a03a33" }}><b>⚠ 保存の上限に近づいています：</b>{names.join("・")}。このままだとクラウドに保存できなくなるおそれがあります。問題集を2つに分けてください（ステータス画面の「データの健康診断」でくわしく見られます）。</div>;
}

function QBankTab(props) {
  const { state, addBank, deleteBank, recordAnswer, recordRevengeAnswer, awardXp, startTimer, stopTimer, incrementBankClears, updateBestStreak, moveBank, addCloze, deleteCloze, recordClozeAnswer, recordClozeRevengeAnswer, toggleQuestionMark, toggleClozeMark, recordClearSnapshot, createClozeBank, updateQuestionFormats, addFolder, deleteFolder, renameFolder, reorderFolders, addStudyNote, updateStudyNote, deleteStudyNote, moveBankToFolder, saveSessionResume, clearSessionResume, editBankClears, updateQuestionMemo, toggleQuestionExclude, editQuestion, moveQuestions, addQuestionToBank, deleteQuestion, editBankMeta } = props;

  const [activeBankId, setActiveBankId] = useState(null);
  const [revengeMode, setRevengeMode] = useState(false);
  const [pendingBankId, setPendingBankId] = useState(null);
  const [importMode, setImportMode] = useState(false);           // CSVインポート画面
  const [importFolderId, setImportFolderId] = useState(null);    // インポート先フォルダ
  const [clozeCompileMode, setClozeCompileMode] = useState(false);
  const [trapMode, setTrapMode] = useState(false); // ○×のひっかけ版づくり
  const [formatEditorItem, setFormatEditorItem] = useState(null);
  const [stampViewBankId, setStampViewBankId] = useState(null);
  const [clozeCreator, setClozeCreator] = useState(null);
  const [crossRevengeQualId, setCrossRevengeQualId] = useState(null);
  const [sessionMode, setSessionMode] = useState("qa");
  const [movingBankId, setMovingBankId] = useState(null);        // 移動中の問題集ID
  const [folderManagerOpen, setFolderManagerOpen] = useState(false); // フォルダ管理パネル
  const [newFolderName, setNewFolderName] = useState("");
  const [renamingFolderId, setRenamingFolderId] = useState(null);
  const [renamingValue, setRenamingValue] = useState("");
  const [collapsedFolders, setCollapsedFolders] = useState({});  // フォルダの折り畳み状態
  const [searchQuery, setSearchQuery] = useState("");              // キーワード検索
  // 今日のタスクの「解く」から来たときは、その問題集の開始画面を開く
  const [planRevenge, setPlanRevenge] = useState(false); // 計画の「苦手だけ」から開いたリベンジ（終わったら計画に✓）
  useEffect(() => {
    const req = props.openBankReq;
    if (!req) return;
    if (typeof req === "object" && req.mode === "revenge") { setRevengeMode(true); setActiveBankId(req.id); setPlanRevenge(true); }
    else setPendingBankId(typeof req === "object" ? req.id : req);
    if (props.onOpenedBank) props.onOpenedBank();
  }, [props.openBankReq]);


  const activeBank = state.questionBanks.find((b) => b.id === activeBankId);
  const pendingBank = state.questionBanks.find((b) => b.id === pendingBankId);
  const stampViewBank = state.questionBanks.find((b) => b.id === stampViewBankId);
  const folders = (state.folders || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  // ── セッション画面へのルーティング ──
  if (clozeCreator) {
    const bank = state.questionBanks.find((b) => b.id === clozeCreator.bankId);
    const q = bank ? bank.questions.find((x) => x.id === clozeCreator.qId) : null;
    if (bank && q) return <ClozeCreator bank={bank} question={q} addCloze={addCloze} deleteCloze={deleteCloze} onExit={() => setClozeCreator(null)} />;
  }
  if (formatEditorItem) {
    const bank = state.questionBanks.find((b) => b.id === formatEditorItem.bankId);
    const q = bank ? bank.questions.find((x) => x.id === formatEditorItem.qId) : null;
    if (bank && q) return <QuestionFormatEditor bank={bank} question={q} updateQuestionFormats={updateQuestionFormats} onExit={() => setFormatEditorItem(null)} />;
  }
  if (crossRevengeQualId !== null) {
    return <CrossYearRevengeSession qualId={crossRevengeQualId} state={state} recordRevengeAnswer={recordRevengeAnswer} recordClozeRevengeAnswer={recordClozeRevengeAnswer} startTimer={startTimer} stopTimer={stopTimer} onExit={() => setCrossRevengeQualId(null)} />;
  }
  if (activeBank) {
    if (revengeMode) return <RevengeSession bank={activeBank} state={state} recordRevengeAnswer={recordRevengeAnswer} recordClozeRevengeAnswer={recordClozeRevengeAnswer} editQuestion={editQuestion} startTimer={startTimer} stopTimer={stopTimer} onComplete={planRevenge && props.onPlanWeakDone ? () => props.onPlanWeakDone(activeBank.id) : undefined} onExit={() => { setActiveBankId(null); setRevengeMode(false); setPlanRevenge(false); }} />;
    if (sessionMode === "cloze") return <ClozeStudySession bank={activeBank} state={state} recordClozeAnswer={recordClozeAnswer} awardXp={awardXp} startTimer={startTimer} stopTimer={stopTimer} toggleClozeMark={toggleClozeMark} onExit={() => { setActiveBankId(null); setSessionMode("qa"); }} />;
    if (sessionMode === "mix") return <MixedStudySession bank={activeBank} state={state} recordAnswer={recordAnswer} recordClozeAnswer={recordClozeAnswer} awardXp={awardXp} startTimer={startTimer} stopTimer={stopTimer} incrementBankClears={incrementBankClears} updateBestStreak={updateBestStreak} recordClearSnapshot={recordClearSnapshot} toggleQuestionMark={toggleQuestionMark} toggleClozeMark={toggleClozeMark} onExit={() => { setActiveBankId(null); setSessionMode("qa"); }} />;
    return <QStudySession bank={activeBank} state={state} recordAnswer={recordAnswer} awardXp={awardXp} startTimer={startTimer} stopTimer={stopTimer} incrementBankClears={incrementBankClears} updateBestStreak={updateBestStreak} recordClearSnapshot={recordClearSnapshot} toggleQuestionMark={toggleQuestionMark} saveSessionResume={saveSessionResume} clearSessionResume={clearSessionResume} resumeData={state.sessionResume?.bankId === activeBank.id ? state.sessionResume : null} updateQuestionMemo={updateQuestionMemo} toggleQuestionExclude={toggleQuestionExclude} editQuestion={editQuestion} addStudyNote={addStudyNote} updateStudyNote={updateStudyNote} moveQuestions={moveQuestions} addQuestionBank={addBank} onExit={() => setActiveBankId(null)} />;
  }
  if (pendingBank) return <SessionConfig bank={pendingBank} state={state} onCancel={() => setPendingBankId(null)} onStart={(mode) => { setSessionMode(mode); setActiveBankId(pendingBank.id); setPendingBankId(null); }} />;
  if (stampViewBank) return <PerQuestionStampView bank={stampViewBank} state={state} toggleQuestionMark={toggleQuestionMark} toggleClozeMark={toggleClozeMark} deleteCloze={deleteCloze} moveQuestions={moveQuestions} addQuestionBank={addBank} onCreateCloze={(qId) => setClozeCreator({ bankId: stampViewBank.id, qId })} onEditFormat={(qId) => setFormatEditorItem({ bankId: stampViewBank.id, qId })} onExit={() => setStampViewBankId(null)} />;

  // ── 穴埋め問題集作成 ──
  if (clozeCompileMode) return <ClozeCompilePanel state={state} createClozeBank={createClozeBank} onCancel={() => setClozeCompileMode(false)} />;

  // ── ○×のひっかけ版づくり ──
  if (trapMode) return <TrapMakerPanel state={state} onCancel={() => setTrapMode(false)} onCreate={(b) => { addBank(b); setTrapMode(false); }} />;

  // ── CSVインポート ──
  if (importMode) return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <button onClick={() => setImportMode(false)} className="jp text-xs flex items-center gap-1" style={{ color: "var(--ink-soft)" }}><XIcon size={14} /> 戻る</button>
        <div className="jp text-xs" style={{ color: "var(--sky-deep)" }}>CSVインポート</div>
      </div>
      {/* インポート先フォルダ選択 */}
      {folders.length > 0 && (
        <Box title="格納先フォルダ" icon={<FolderIcon size={18} />}>
          <div className="space-y-1">
            <button onClick={() => setImportFolderId(null)} className="w-full flex items-center gap-2 p-2 jp text-sm text-left" style={{ background: importFolderId === null ? "var(--sky-pale)" : "var(--paper)", border: `1px solid ${importFolderId === null ? "var(--sky-deep)" : "var(--rule-soft)"}` }}>
              <span>📂 フォルダなし（未分類）</span>
            </button>
            {folders.map((f) => (
              <button key={f.id} onClick={() => setImportFolderId(f.id)} className="w-full flex items-center gap-2 p-2 jp text-sm text-left" style={{ background: importFolderId === f.id ? "var(--sky-pale)" : "var(--paper)", border: `1px solid ${importFolderId === f.id ? "var(--sky-deep)" : "var(--rule-soft)"}` }}>
                <span>📁 {f.name}</span>
              </button>
            ))}
          </div>
        </Box>
      )}
      <ImportPanel state={state} onCancel={() => setImportMode(false)} onImport={(b) => { addBank({ ...b, folderId: importFolderId }); setImportMode(false); }} />
    </div>
  );

  // ── 問題集の移動先選択 ──
  if (movingBankId) {
    const movingBank = state.questionBanks.find((b) => b.id === movingBankId);
    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <button onClick={() => setMovingBankId(null)} className="jp text-xs flex items-center gap-1" style={{ color: "var(--ink-soft)" }}><XIcon size={14} /> キャンセル</button>
          <div className="jp text-xs" style={{ color: "var(--sky-deep)" }}>移動先フォルダを選択</div>
        </div>
        {props.setBanksQual && (state.qualifications || []).length > 0 && (() => {
          const same = movingBank ? state.questionBanks.filter((b) => (b.folderId || null) === (movingBank.folderId || null)) : [];
          const folderName = movingBank && movingBank.folderId ? ((folders.find((f) => f.id === movingBank.folderId) || {}).name || "このフォルダ") : "未分類";
          return (
            <Box title={`「${movingBank?.name}」の資格`} icon={<Award size={18} />}>
              <div className="jp space-y-1.5">
                <p className="text-[11px]" style={{ color: "var(--ink-soft)", lineHeight: 1.6 }}>資格ごとに、今日の復習・問題集・学習計画が分かれます。付け替えても、解いた記録はそのままです。</p>
                <div className="flex flex-wrap gap-1.5">
                  {[{ id: "", name: "紐付けない（調査士の側）" }, ...state.qualifications].map((q) => {
                    const on = (movingBank?.qualId || "") === q.id;
                    return <button key={q.id || "none"} onClick={() => props.setBanksQual([movingBankId], q.id)} className="text-[12px] px-2.5 py-1" style={{ borderRadius: 999, border: `1px solid ${on ? "var(--gold)" : "var(--rule-soft)"}`, background: on ? "var(--cream)" : "var(--paper)", color: "var(--ink)", fontWeight: on ? 800 : 500, cursor: "pointer" }}>{on ? "✓ " : ""}{q.name}</button>;
                  })}
                </div>
                <QualDestNote state={state} qualId={movingBank?.qualId || ""} names={[movingBank?.name]} />
                {same.length > 1 && (
                  <button onClick={() => { if (confirm(`「${folderName}」の問題集${same.length}冊を、すべて「${((state.qualifications || []).find((q) => q.id === movingBank.qualId) || {}).name || "紐付けない"}」にそろえますか？`)) props.setBanksQual(same.map((b) => b.id), movingBank.qualId || ""); }} className="btn-ghost w-full text-[11px] py-1.5">
                    📚 同じフォルダ（{folderName}）の{same.length}冊も、この資格にそろえる
                  </button>
                )}
              </div>
            </Box>
          );
        })()}
        <Box title={`「${movingBank?.name}」の移動先`} icon={<FolderIcon size={18} />}>
          <div className="space-y-1">
            <button onClick={() => { moveBankToFolder(movingBankId, null); setMovingBankId(null); }} className="w-full flex items-center gap-2 p-2 jp text-sm text-left" style={{ background: !movingBank?.folderId ? "var(--sky-pale)" : "var(--paper)", border: `1px solid ${!movingBank?.folderId ? "var(--sky-deep)" : "var(--rule-soft)"}` }}>
              <span>📂 フォルダなし（未分類）</span>
              {!movingBank?.folderId && <span className="jp text-[10px] ml-auto" style={{ color: "var(--sky-deep)" }}>現在地</span>}
            </button>
            {folders.map((f) => (
              <button key={f.id} onClick={() => { moveBankToFolder(movingBankId, f.id); setMovingBankId(null); }} className="w-full flex items-center gap-2 p-2 jp text-sm text-left" style={{ background: movingBank?.folderId === f.id ? "var(--sky-pale)" : "var(--paper)", border: `1px solid ${movingBank?.folderId === f.id ? "var(--sky-deep)" : "var(--rule-soft)"}` }}>
                <span>📁 {f.name}</span>
                {movingBank?.folderId === f.id && <span className="jp text-[10px] ml-auto" style={{ color: "var(--sky-deep)" }}>現在地</span>}
              </button>
            ))}
          </div>
        </Box>
      </div>
    );
  }

  // ── 弱点カウント ──
  const countWeakness = (banks) => {
    let n = 0;
    banks.forEach((b) => {
      b.questions.forEach((q) => {
        const isWeak = isQuestionWeak(q);
        if (isWeak) n++;
        (q.clozes || []).forEach((c) => { if ((c.wrong > 0 && c.correct < c.wrong) || c.marked) n++; });
      });
    });
    return n;
  };

  const toggleCollapse = (key) => setCollapsedFolders((prev) => ({ ...prev, [key]: !prev[key] }));

  // ── 問題集カード ──
  const renderBankCard = (b, idx, siblings) => {
    const totalAns = b.questions.reduce((a, q) => a + q.correct + q.wrong, 0);
    const totalCorrect = b.questions.reduce((a, q) => a + q.correct, 0);
    const accuracy = totalAns > 0 ? Math.round((totalCorrect / totalAns) * 100) : 0;
    const wrongCount = b.questions.filter((q) => isQuestionWeak(q)).length;
    const clozeCount = b.questions.reduce((a, q) => a + (q.clozes || []).length, 0);
    const clears = b.clears || 0;
    const isFirst = idx === 0; const isLast = idx === siblings.length - 1;
    const qual = state.qualifications.find((q) => q.id === b.qualId);
    const borderColor = qual ? qual.color : "var(--slate)";
    return (
      <div key={b.id} className="p-2" style={{ border: `1px solid ${borderColor}`, background: "var(--paper)" }}>
        <div className="flex justify-between items-start gap-2 mb-1">
          <div className="flex flex-col gap-0.5 flex-shrink-0 mt-1">
            <button onClick={() => moveBank(b.id, -1)} disabled={isFirst} className="text-xs p-0.5" style={{ color: isFirst ? "var(--rule-soft)" : "var(--slate)" }}><Up size={12} /></button>
            <button onClick={() => moveBank(b.id, 1)} disabled={isLast} className="text-xs p-0.5" style={{ color: isLast ? "var(--rule-soft)" : "var(--slate)" }}><Down size={12} /></button>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {b.year && <span className="jp text-[10px] px-1.5 py-0.5 font-bold" style={{ background: "var(--gold)", color: "var(--paper)" }}>{b.year}</span>}
              <div className="jp text-sm" style={{ color: "var(--ink)" }}>{b.name}</div>
              {clears > 0 && <span className="pixel text-[10px] px-1" style={{ background: "var(--brick)", color: "var(--paper)" }}>周回×{clears}</span>}
              {clozeCount > 0 && <span className="pixel text-[10px] px-1" style={{ background: "var(--plum)", color: "var(--paper)" }}>穴×{clozeCount}</span>}
            </div>
            <div className="pixel text-[10px] mt-1" style={{ color: "var(--ink-soft)" }}>
              {b.questions.length}問 ・ 解答数 {totalAns} ・ 正答率 {accuracy}%
              {wrongCount > 0 && <span style={{ color: "var(--brick)" }}> ・ 苦手 {wrongCount}</span>}
            </div>
            {clears > 0 && (
              <div className="flex flex-wrap gap-1 mt-1 items-center">
                {Array.from({ length: Math.min(clears, 20) }).map((_, i) => { const cls = i < 5 ? "stamp" : i < 10 ? "stamp gold" : "stamp sage"; return <span key={i} className={cls}>✓</span>; })}
                {clears > 20 && <span className="pixel text-xs ml-1" style={{ color: "var(--ink-soft)" }}>+{clears - 20}</span>}
                <button onClick={() => {
                  const val = prompt(`「${b.name}」の周回スタンプ数を変更\n（現在: ${clears}回）\n※半角数字で入力してください`, clears);
                  if (val !== null && val.trim() !== "") editBankClears(b.id, val);
                }} className="jp text-[10px] px-1.5 py-0.5 ml-1" style={{ border: "1px solid var(--sky-deep)", color: "var(--sky-deep)" }}>✏ 編集</button>
              </div>
            )}
            {clears === 0 && (
              <button onClick={() => {
                const val = prompt(`「${b.name}」の周回スタンプ数を設定\n※半角数字で入力してください`, "0");
                if (val !== null && val.trim() !== "") editBankClears(b.id, val);
              }} className="jp text-[10px] mt-1 px-1.5 py-0.5" style={{ border: "1px solid var(--rule-soft)", color: "var(--ink-mute)" }}>スタンプを手動入力</button>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <button onClick={() => setMovingBankId(b.id)} className="jp text-[10px] px-1.5 py-0.5" style={{ color: "var(--sky-deep)", border: "1px solid var(--sky-deep)" }} title="フォルダの移動・資格の付け替え">📁</button>
            <button onClick={() => { if (confirm(`「${b.name}」を削除しますか？`)) deleteBank(b.id); }} className="p-1" style={{ color: "var(--brick)" }}><Trash2 size={14} /></button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1 mt-2">
          <button onClick={() => setPendingBankId(b.id)} className="jp btn-primary py-1.5 text-xs flex items-center justify-center gap-1"><Play size={12} /> 挑戦</button>
          <button onClick={() => { setActiveBankId(b.id); setRevengeMode(true); window.__qaConfig = { random: true, retryWrong: true, useTimer: true }; }} disabled={wrongCount === 0} className="jp btn-plum py-1.5 text-xs flex items-center justify-center gap-1"><Skull size={12} /> リベンジ {wrongCount > 0 && `(${wrongCount})`}</button>
          <button onClick={() => setStampViewBankId(b.id)} className="jp btn-info py-1.5 text-xs flex items-center justify-center gap-1"><StarIcon size={12} /> スタンプ</button>
        </div>
      </div>
    );
  };

  // ── フォルダ別グループ化（勉強の範囲がいまの世界なら、その世界の問題集だけ）──
  const sc = studyScope(state);
  const hiddenBanks = sc.on ? state.questionBanks.filter((b) => !sc.inScope(b)).length : 0;
  const folderBanks = (folderId) => state.questionBanks.filter((b) => (b.folderId || null) === folderId && sc.inScope(b)).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const unfoldered = folderBanks(null);
  // 弱点一括
  const allBanks = state.questionBanks;
  const totalWeak = countWeakness(allBanks);

  return (
    <div className="space-y-4">

      {/* ── 途中再開バナー ── */}
      {state.sessionResume && (() => {
        const rb = state.questionBanks.find((b) => b.id === state.sessionResume.bankId);
        if (!rb) return null;
        const r = state.sessionResume;
        const remaining = (r.queueIds || []).length;
        const done = r.stats ? r.stats.correct + r.stats.wrong : 0;
        return (
          <div className="p-3" style={{ background: "linear-gradient(135deg,var(--gold),#c07820)", border: "none" }}>
            <div className="jp text-[11px] mb-1" style={{ color: "var(--paper)", opacity: 0.85 }}>📌 途中の問題が残っています</div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex-1">
                <div className="jp text-sm font-bold" style={{ color: "var(--paper)" }}>{rb.name}{rb.year && ` ・ ${rb.year}`}</div>
                <div className="pixel text-[11px]" style={{ color: "var(--paper)", opacity: 0.85 }}>残り {remaining}問 ・ {done}問解答済み</div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { window.__qaConfig = { random: true, retryWrong: true, useTimer: true, fromResume: true }; setSessionMode(r.mode || "qa"); setActiveBankId(r.bankId); }} className="jp text-xs px-3 py-1.5 font-bold" style={{ background: "var(--paper)", color: "var(--gold)" }}>▶ 再開</button>
                <button onClick={() => { if (confirm("途中のデータを消去しますか？")) clearSessionResume(); }} className="jp text-xs px-2 py-1.5" style={{ background: "rgba(0,0,0,0.2)", color: "var(--paper)" }}>✕</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── 周回の記録 ── */}
      <LapRecordsPanel state={state} />

      {/* ── ツールバー ── */}
      <Box title="問題集" icon={<BookOpen size={18} />}>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <button onClick={() => { setImportFolderId(null); setImportMode(true); }} className="jp btn-info py-2 flex items-center justify-center gap-1 text-xs"><Upload size={14} /> CSV・写真から追加</button>
          <button onClick={() => setClozeCompileMode(true)} className="jp btn-primary py-2 flex items-center justify-center gap-1 text-xs"><BookOpen size={14} /> 穴埋め問題集を作成</button>
        </div>
        <button onClick={() => setTrapMode(true)} className="jp btn-ghost w-full py-1.5 text-xs mb-2">⚡ ○×の「ひっかけ版」をつくる</button>
        <BulkTools state={state} />
        <button onClick={() => setFolderManagerOpen(!folderManagerOpen)} className="jp w-full py-1.5 text-xs flex items-center justify-center gap-1" style={{ background: folderManagerOpen ? "var(--sky-pale)" : "var(--paper)", border: "1px solid var(--rule-soft)", color: "var(--ink)" }}>
          <FolderIcon size={13} /> フォルダを管理 {folders.length > 0 && `(${folders.length})`}
        </button>

        {/* フォルダ管理パネル */}
        {folderManagerOpen && (
          <div className="mt-3 space-y-2">
            <div className="jp text-[11px] mb-1" style={{ color: "var(--ink-soft)" }}>新規フォルダを作成</div>
            <div className="flex gap-1">
              <input className="rpg-input flex-1 text-sm" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="フォルダ名を入力" onKeyDown={(e) => { if (e.key === "Enter" && newFolderName.trim()) { addFolder(newFolderName.trim()); setNewFolderName(""); }}} />
              <button onClick={() => { if (newFolderName.trim()) { addFolder(newFolderName.trim()); setNewFolderName(""); }}} className="jp btn-primary px-3 py-1 text-xs" disabled={!newFolderName.trim()}>追加</button>
            </div>
            {folders.length > 0 && (
              <ul className="space-y-1">
                {folders.map((f) => (
                  <li key={f.id} className="flex items-center gap-2 p-1.5" style={{ background: "var(--sky-pale)", border: "1px solid var(--rule-soft)" }}>
                    <span className="text-sm">📁</span>
                    {renamingFolderId === f.id ? (
                      <>
                        <input className="rpg-input flex-1 text-xs py-0.5" value={renamingValue} onChange={(e) => setRenamingValue(e.target.value)} autoFocus onKeyDown={(e) => { if (e.key === "Enter") { renameFolder(f.id, renamingValue.trim() || f.name); setRenamingFolderId(null); }}} />
                        <button onClick={() => { renameFolder(f.id, renamingValue.trim() || f.name); setRenamingFolderId(null); }} className="jp text-[10px] px-1.5 py-0.5 btn-primary">保存</button>
                      </>
                    ) : (
                      <>
                        <span className="jp text-sm flex-1">{f.name}</span>
                        <span className="pixel text-[10px]" style={{ color: "var(--ink-mute)" }}>{folderBanks(f.id).length}件</span>
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => {
                              const ids = folders.map((x) => x.id);
                              const i = ids.indexOf(f.id);
                              if (i <= 0) return;
                              [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
                              reorderFolders(ids);
                            }}
                            disabled={folders.indexOf(f) === 0}
                            className="jp text-[10px] px-1 leading-none"
                            style={{ color: folders.indexOf(f) === 0 ? "var(--ink-mute)" : "var(--ink)", border: "1px solid var(--rule-soft)", lineHeight: "1.4" }}
                            title="上に移動"
                          >▲</button>
                          <button
                            onClick={() => {
                              const ids = folders.map((x) => x.id);
                              const i = ids.indexOf(f.id);
                              if (i >= ids.length - 1) return;
                              [ids[i], ids[i + 1]] = [ids[i + 1], ids[i]];
                              reorderFolders(ids);
                            }}
                            disabled={folders.indexOf(f) === folders.length - 1}
                            className="jp text-[10px] px-1 leading-none"
                            style={{ color: folders.indexOf(f) === folders.length - 1 ? "var(--ink-mute)" : "var(--ink)", border: "1px solid var(--rule-soft)", lineHeight: "1.4" }}
                            title="下に移動"
                          >▼</button>
                        </div>
                        <button onClick={() => { setRenamingFolderId(f.id); setRenamingValue(f.name); }} className="jp text-[10px] px-1.5 py-0.5" style={{ color: "var(--sky-deep)", border: "1px solid var(--sky-deep)" }}>✏ 名前変更</button>
                        <button onClick={() => { if (confirm("フォルダ「" + f.name + "」を削除しますか？\n中の問題集は「未分類」に移動されます。")) deleteFolder(f.id); }} style={{ color: "var(--brick)" }}><Trash2 size={13} /></button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Box>

      {/* ── キーワード検索 ── */}
      <div className="rpg-box p-1">
        <div className="rpg-inner-border p-2">
          <div className="flex items-center gap-2 mb-2">
            <Search size={14} style={{ color: "var(--sky-deep)", flexShrink: 0 }} />
            <input
              className="rpg-input flex-1 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="キーワードで問題を検索..."
            />
            {searchQuery && <button onClick={() => setSearchQuery("")} className="jp text-[10px] px-1.5 py-0.5" style={{ color: "var(--brick)", border: "1px solid var(--brick)" }}>✕ クリア</button>}
          </div>
          {searchQuery.trim().length >= 2 && (() => {
            const q = searchQuery.trim().toLowerCase();
            const results = [];
            state.questionBanks.forEach((bank) => {
              bank.questions.forEach((question) => {
                if ((question.q || "").toLowerCase().includes(q) || (question.a || "").toLowerCase().includes(q) || (question.memo || "").toLowerCase().includes(q)) {
                  results.push({ bank, question });
                }
              });
            });
            if (results.length === 0) return <p className="jp text-sm text-center py-3" style={{ color: "var(--ink-mute)" }}>「{searchQuery}」に一致する問題が見つかりません</p>;
            return (
              <div>
                <div className="jp text-[10px] mb-2" style={{ color: "var(--ink-soft)" }}>{results.length}件ヒット（最大50件表示）</div>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {results.slice(0, 50).map(({ bank, question }, i) => (
                    <div key={i} className="p-2" style={{ background: "var(--sky-pale)", border: "1px solid var(--rule-soft)" }}>
                      <div className="jp text-[10px] mb-1" style={{ color: "var(--sky-deep)" }}>
                        {bank.name}{bank.year && ` ・ ${bank.year}`}
                        <span className="ml-2" style={{ color: "var(--ink-mute)" }}>◯{question.correct} ✕{question.wrong}{question.marked ? " ⭐" : ""}</span>
                      </div>
                      <div className="jp text-sm mb-1" style={{ color: "var(--ink)" }}>{question.q}</div>
                      <div className="jp text-sm p-1" style={{ background: "var(--paper)", border: "1px solid var(--gold)", color: "var(--ink)" }}>答: {question.a}</div>
                      {question.memo && <div className="jp text-[11px] mt-1 p-1" style={{ background: "var(--memo-bg, #fffbe6)", border: "1px solid var(--gold)", color: "var(--ink-soft)" }}>📝 {question.memo}</div>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          {searchQuery.trim().length === 1 && <p className="jp text-[11px] text-center" style={{ color: "var(--ink-mute)" }}>2文字以上入力してください</p>}
        </div>
      </div>

      <HealthWarning state={state} />
      {/* ── 弱点リスト ── */}
      <WeaknessListPanel state={state} onCrossRevenge={(qid) => setCrossRevengeQualId(qid)} />

      {state.questionBanks.length === 0 ? (
        <Box title="登録済み問題集" icon={<ScrollIcon size={18} />}>
          <p className="jp text-sm text-center py-4" style={{ color: "var(--ink-mute)" }}>まだ問題集はインポートされていない</p>
        </Box>
      ) : (
        <>
          <StudyScopeBar state={state} note={hiddenBanks ? `ほかの世界の問題集 ${hiddenBanks}冊は隠しています（「すべての世界」で全部表示）。` : null} />
          {/* ── フォルダ一括開閉 ── */}
          {folders.length > 0 && (
            <div className="flex gap-2 mb-1">
              <button
                onClick={() => {
                  const allKeys = [...folders.map(f => f.id), "_none_"];
                  const newState = {};
                  allKeys.forEach(k => { newState[k] = false; });
                  setCollapsedFolders(newState);
                }}
                className="jp flex-1 py-1 text-xs flex items-center justify-center gap-1"
                style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", color: "var(--ink-soft)" }}
              >
                📂 すべて開く
              </button>
              <button
                onClick={() => {
                  const allKeys = [...folders.map(f => f.id), "_none_"];
                  const newState = {};
                  allKeys.forEach(k => { newState[k] = true; });
                  setCollapsedFolders(newState);
                }}
                className="jp flex-1 py-1 text-xs flex items-center justify-center gap-1"
                style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", color: "var(--ink-soft)" }}
              >
                📁 すべて閉じる
              </button>
            </div>
          )}

          {/* ── フォルダごとに表示 ── */}
          {folders.map((folder) => {
            const banks = folderBanks(folder.id);
            if (banks.length === 0 && !folderManagerOpen) return null;
            const collapsed = collapsedFolders[folder.id];
            const wCount = countWeakness(banks);
            return (
              <div key={folder.id} style={{ border: "1px solid var(--rule)", borderRadius: "2px" }}>
                {/* フォルダヘッダー */}
                <div className="w-full flex items-center gap-1 px-2 py-2" style={{ background: "var(--sky-pale)" }}>
                  {/* ▲▼並べ替えボタン */}
                  <div className="flex flex-col gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => {
                        const ids = folders.map((x) => x.id);
                        const i = ids.indexOf(folder.id);
                        if (i <= 0) return;
                        [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
                        reorderFolders(ids);
                      }}
                      className="flex items-center justify-center"
                      style={{ width: "18px", height: "16px", fontSize: "9px", border: "1px solid var(--rule-soft)", color: folders.indexOf(folder) === 0 ? "var(--rule-soft)" : "var(--ink-soft)", background: "var(--paper)", cursor: folders.indexOf(folder) === 0 ? "default" : "pointer" }}
                      title="上に移動"
                    >▲</button>
                    <button
                      onClick={() => {
                        const ids = folders.map((x) => x.id);
                        const i = ids.indexOf(folder.id);
                        if (i >= ids.length - 1) return;
                        [ids[i], ids[i + 1]] = [ids[i + 1], ids[i]];
                        reorderFolders(ids);
                      }}
                      className="flex items-center justify-center"
                      style={{ width: "18px", height: "16px", fontSize: "9px", border: "1px solid var(--rule-soft)", color: folders.indexOf(folder) === folders.length - 1 ? "var(--rule-soft)" : "var(--ink-soft)", background: "var(--paper)", cursor: folders.indexOf(folder) === folders.length - 1 ? "default" : "pointer" }}
                      title="下に移動"
                    >▼</button>
                  </div>
                  {/* クリックでアコーディオン開閉 */}
                  <button onClick={() => toggleCollapse(folder.id)} className="flex items-center gap-2 flex-1 text-left" style={{ background: "none", border: "none", padding: 0 }}>
                    <span className="text-base">{collapsed ? "📁" : "📂"}</span>
                    <span className="jp text-sm font-bold flex-1 text-left" style={{ color: "var(--ink)" }}>{folder.name}</span>
                    <span className="pixel text-[10px]" style={{ color: "var(--ink-soft)" }}>{banks.length}件</span>
                    {wCount > 0 && <span className="pixel text-[10px] px-1" style={{ background: "var(--brick)", color: "var(--paper)" }}>苦手{wCount}</span>}
                    {wCount > 0 && !collapsed && (
                      <span onClick={(e) => { e.stopPropagation(); setCrossRevengeQualId("_folder_" + folder.id); }} className="jp text-[10px] px-2 py-0.5" style={{ background: "var(--plum)", color: "var(--paper)", cursor: "pointer" }}>横断リベンジ</span>
                    )}
                    <span style={{ color: "var(--ink-mute)" }}>{collapsed ? "▶" : "▼"}</span>
                  </button>
                </div>
                {!collapsed && (
                  <div className="p-2 space-y-2">
                    {banks.length === 0 ? (
                      <p className="jp text-xs text-center py-3" style={{ color: "var(--ink-mute)" }}>このフォルダは空です</p>
                    ) : (
                      banks.map((b, idx) => renderBankCard(b, idx, banks))
                    )}
                    <button onClick={() => { setImportFolderId(folder.id); setImportMode(true); }} className="jp btn-info w-full py-1.5 text-xs flex items-center justify-center gap-1"><Upload size={12} /> このフォルダにCSVを追加</button>
                  </div>
                )}
              </div>
            );
          })}

          {/* ── 未分類（フォルダなし）── */}
          {(unfoldered.length > 0 || folders.length === 0) && (
            <div style={{ border: "1px solid var(--rule)", borderRadius: "2px" }}>
              <button onClick={() => toggleCollapse("_none_")} className="w-full flex items-center gap-2 px-3 py-2" style={{ background: "var(--paper)", border: "none" }}>
                <span className="text-base">{collapsedFolders["_none_"] ? "📁" : "📂"}</span>
                <span className="jp text-sm flex-1 text-left" style={{ color: "var(--ink-soft)" }}>未分類</span>
                <span className="pixel text-[10px]" style={{ color: "var(--ink-mute)" }}>{unfoldered.length}件</span>
                <span style={{ color: "var(--ink-mute)" }}>{collapsedFolders["_none_"] ? "▶" : "▼"}</span>
              </button>
              {!collapsedFolders["_none_"] && (
                <div className="p-2 space-y-2">
                  {unfoldered.length === 0 ? (
                    <p className="jp text-xs text-center py-3" style={{ color: "var(--ink-mute)" }}>未分類の問題集はありません</p>
                  ) : (
                    unfoldered.map((b, idx) => renderBankCard(b, idx, unfoldered))
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── ○×の「ひっかけ版」：答えが○の問題の言葉を1つ入れ替えて×の問題を作り、確かめてから新しい問題集にする ──
function TrapMakerPanel({ state, onCancel, onCreate }) {
  const banks = state.questionBanks.filter((b) => (b.questions || []).some((q) => isTrueAnswer(q.a)));
  const [bankId, setBankId] = useState(banks[0] ? banks[0].id : "");
  const [items, setItems] = useState(null); // [{ id, q, trap, on }]
  const [withOrig, setWithOrig] = useState(true);
  const bank = state.questionBanks.find((b) => b.id === bankId);
  const make = () => {
    if (!bank) return;
    const list = (bank.questions || []).filter((q) => !q.excluded && isTrueAnswer(q.a)).map((q) => ({ id: q.id, q, trap: makeTrap(q.q), on: true }));
    setItems(list.filter((x) => x.trap).concat(list.filter((x) => !x.trap).map((x) => ({ ...x, on: false }))));
  };
  const reroll = (id) => setItems((l) => l.map((x) => (x.id === id ? { ...x, trap: makeTrap(x.q.q) || x.trap } : x)));
  const toggle = (id) => setItems((l) => l.map((x) => (x.id === id && x.trap ? { ...x, on: !x.on } : x)));
  const picked = (items || []).filter((x) => x.on && x.trap);
  const create = () => {
    if (!picked.length || !bank) return;
    const note = (a) => String(a || "").replace(/^\s*([○◯〇]|正しい|正)[\s。　]*/, "");
    const qs = [];
    picked.forEach((x) => {
      qs.push({ id: uid(), q: x.trap.text, a: `×　「${x.trap.to}」ではなく「${x.trap.from}」。${note(x.q.a) ? `（元の解説：${note(x.q.a)}）` : ""}`, correct: 0, wrong: 0, memo: "ひっかけ版（自動で作った×の問題）" });
      if (withOrig) qs.push({ id: uid(), q: x.q.q, a: x.q.a, correct: 0, wrong: 0, memo: x.q.memo || "" });
    });
    onCreate({ id: uid(), name: `${bank.name}（ひっかけ版）`, year: bank.year || null, qualId: bank.qualId || null, folderId: bank.folderId || null, questions: shuffle(qs) });
  };
  const hl = (t, w, color) => { const i = t.indexOf(w); if (i < 0) return t; return <>{t.slice(0, i)}<b style={{ color, borderBottom: `2px solid ${color}` }}>{w}</b>{t.slice(i + w.length)}</>; };
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <button onClick={onCancel} className="jp text-xs flex items-center gap-1" style={{ color: "var(--ink-soft)" }}><XIcon size={14} /> 戻る</button>
        <div className="jp text-xs" style={{ color: "var(--sky-deep)" }}>○×のひっかけ版</div>
      </div>
      <Box title="ひっかけ版をつくる" icon={<BookOpen size={18} />}>
        <div className="jp space-y-2">
          <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>答えが「○」の問題の、期間・数・言い回し（できる／しなければならない など）・用語を1つだけ入れ替えて、「×」の問題を作ります。本番のひっかけと同じ形で練習できます。<br />作った問題は<b>確かめてから</b>、新しい問題集として加えます（元の問題集は変わりません）。</p>
          {!banks.length ? <p className="text-xs" style={{ color: "var(--ink-mute)" }}>答えが「○」で始まる問題がある問題集が見つかりませんでした。</p> : (
            <>
              <select value={bankId} onChange={(e) => { setBankId(e.target.value); setItems(null); }} className="w-full text-sm px-2 py-1.5" style={{ background: "var(--paper)", border: "1px solid var(--rule)", color: "var(--ink)" }}>
                {banks.map((b) => <option key={b.id} value={b.id}>{b.name}{b.year ? `（${b.year}）` : ""}　○の問題 {(b.questions || []).filter((q) => isTrueAnswer(q.a)).length}問</option>)}
              </select>
              <button onClick={make} className="btn-primary w-full py-2 text-sm">{items ? "作り直す" : "ひっかけの問題を作る"}</button>
            </>
          )}
        </div>
      </Box>
      {items && (
        <Box title={`できた問題（${picked.length}問を加える）`} icon={<BookOpen size={18} />}>
          <div className="jp space-y-2">
            <p className="text-[10px]" style={{ color: "var(--ink-mute)" }}>機械で入れ替えているので、たまに「本当は正しいまま」「不自然」な文ができます。☑を外すか、🎲で別の入れ替えにしてください。</p>
            {items.map((x) => (
              <div key={x.id} className="px-2 py-1.5" style={{ background: "var(--paper)", border: `1px solid ${x.on ? "var(--gold)" : "var(--rule-soft)"}`, borderRadius: 8, opacity: x.trap ? 1 : 0.55 }}>
                <div className="flex items-start gap-2">
                  <button onClick={() => toggle(x.id)} disabled={!x.trap} className="text-sm" style={{ background: "none", border: "none", cursor: x.trap ? "pointer" : "default", color: "var(--ink)" }}>{x.on ? "☑" : "☐"}</button>
                  <div className="flex-1 min-w-0 text-xs" style={{ color: "var(--ink)", lineHeight: 1.7 }}>
                    {x.trap ? <>
                      <div><span className="text-[10px] mr-1" style={{ color: "#c9564e", fontWeight: 800 }}>×</span>{hl(x.trap.text, x.trap.to, "#c9564e")}</div>
                      <div className="text-[10px]" style={{ color: "var(--ink-mute)" }}><span className="mr-1" style={{ color: "var(--sage)", fontWeight: 800 }}>元</span>{hl(x.q.q, x.trap.from, "var(--sage)")}</div>
                    </> : <div className="text-[11px]" style={{ color: "var(--ink-mute)" }}>入れ替えられる言葉が見つかりませんでした：{x.q.q.slice(0, 50)}{x.q.q.length > 50 ? "…" : ""}</div>}
                  </div>
                  {x.trap && <button onClick={() => reroll(x.id)} aria-label="別の入れ替え" className="btn-ghost text-[11px] px-1.5 py-0.5">🎲</button>}
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-2 text-[11px]">
              <button onClick={() => setItems((l) => l.map((x) => (x.trap ? { ...x, on: true } : x)))} className="btn-ghost px-2 py-0.5">すべて選ぶ</button>
              <button onClick={() => setItems((l) => l.map((x) => ({ ...x, on: false })))} className="btn-ghost px-2 py-0.5">すべて外す</button>
            </div>
            <button onClick={() => setWithOrig(!withOrig)} className="text-[11px] w-full text-left" style={{ background: "none", border: "none", color: "var(--ink)", cursor: "pointer" }}>{withOrig ? "☑" : "☐"} 元の正しい問題（○）も一緒に入れて、○と×をまぜる<span className="text-[10px] ml-1" style={{ color: "var(--ink-mute)" }}>（全部×だと答えがわかってしまうので、おすすめ）</span></button>
            <button onClick={create} disabled={!picked.length} className="btn-primary w-full py-2 text-sm" style={{ opacity: picked.length ? 1 : 0.5 }}>「{bank ? bank.name : ""}（ひっかけ版）」として加える（{picked.length * (withOrig ? 2 : 1)}問）</button>
          </div>
        </Box>
      )}
    </div>
  );
}

function ClozeCompilePanel({ state, createClozeBank, onCancel }) {
  const [bankName, setBankName] = useState("穴埋め問題集");
  const [bankYear, setBankYear] = useState("");
  const [bankQualId, setBankQualId] = useState("");
  const [selectedKeys, setSelectedKeys] = useState(["all"]);
  const [done, setDone] = useState(null); // null | number

  // 資格ごとの穴あき問題数を集計
  const qualGroups = {};
  state.questionBanks.forEach((b) => {
    const key = b.qualId || "_none_";
    if (!qualGroups[key]) qualGroups[key] = { count: 0, qualName: "" };
    const qual = state.qualifications.find((q) => q.id === key);
    qualGroups[key].qualName = qual ? qual.name : "資格未設定";
    b.questions.forEach((q) => {
      qualGroups[key].count += (q.clozes || []).length;
    });
  });
  const groupEntries = Object.entries(qualGroups).filter(([, v]) => v.count > 0);
  const totalCloze = groupEntries.reduce((a, [, v]) => a + v.count, 0);

  const toggleKey = (key) => {
    if (key === "all") { setSelectedKeys(["all"]); return; }
    setSelectedKeys((prev) => {
      const next = prev.filter((k) => k !== "all");
      return next.includes(key) ? next.filter((k) => k !== key) : [...next, key];
    });
  };
  const isSelected = (key) => selectedKeys.includes("all") || selectedKeys.includes(key);
  const previewCount = selectedKeys.includes("all")
    ? totalCloze
    : groupEntries.filter(([k]) => selectedKeys.includes(k)).reduce((a, [, v]) => a + v.count, 0);

  if (done !== null) {
    return (
      <Box title="穴埋め問題集を作成しました" icon={<BookOpen size={18} />}>
        <div className="text-center py-4">
          <div className="text-4xl mb-2">📝</div>
          <div className="jp text-base mb-1" style={{ color: "var(--ink)" }}>{bankName}</div>
          <div className="jp text-sm mb-4" style={{ color: "var(--plum)" }}>{done}問の穴埋め問題集を作成しました</div>
          <button onClick={onCancel} className="jp btn-primary px-8 py-2">問題一覧に戻る</button>
        </div>
      </Box>
    );
  }

  if (totalCloze === 0) {
    return (
      <Box title="穴埋め問題集を作成" icon={<BookOpen size={18} />}>
        <div className="text-center py-6">
          <div className="text-4xl mb-3">📝</div>
          <div className="jp text-sm mb-2" style={{ color: "var(--ink)" }}>まだ穴あき問題がありません</div>
          <div className="jp text-[11px] mb-4" style={{ color: "var(--ink-soft)" }}>問題集の「スタンプ」画面から穴あき問題を作成してください</div>
          <button onClick={onCancel} className="jp btn-ghost px-6 py-2">戻る</button>
        </div>
      </Box>
    );
  }

  return (
    <div className="space-y-4">
      <Box title="穴埋め問題集を作成" icon={<BookOpen size={18} />}>
        <p className="jp text-[11px] mb-3 leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          スタンプ画面で作った穴あき問題を、通常の問題集と同じように挑戦できる問題集にまとめます。
        </p>

        {/* 問題集名 */}
        <div className="mb-3">
          <div className="jp text-[11px] mb-1" style={{ color: "var(--ink-soft)" }}>問題集名</div>
          <input className="rpg-input w-full" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="穴埋め問題集" />
        </div>

        {/* 年度（任意） */}
        <div className="mb-3">
          <div className="jp text-[11px] mb-1" style={{ color: "var(--ink-soft)" }}>年度・メモ（任意）</div>
          <input className="rpg-input w-full" value={bankYear} onChange={(e) => setBankYear(e.target.value)} placeholder="例: 2024年版" />
        </div>

        {/* 資格に紐付け（任意） */}
        <div className="mb-3">
          <div className="jp text-[11px] mb-1" style={{ color: "var(--ink-soft)" }}>資格に紐付け（任意）</div>
          <select className="rpg-input w-full" value={bankQualId} onChange={(e) => setBankQualId(e.target.value)}>
            <option value="">紐付けない</option>
            {state.qualifications.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
          </select>
        </div>

        {/* 対象の穴あき問題を選択 */}
        <div className="mb-4">
          <div className="jp text-[11px] mb-2" style={{ color: "var(--ink-soft)" }}>対象の穴あき問題</div>
          <div className="space-y-1">
            <button onClick={() => toggleKey("all")} className="w-full flex items-center gap-2 p-2 text-left jp text-sm transition" style={{ background: selectedKeys.includes("all") ? "var(--sky-pale)" : "var(--paper)", border: `1px solid ${selectedKeys.includes("all") ? "var(--sky-deep)" : "var(--rule-soft)"}` }}>
              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0" style={{ background: selectedKeys.includes("all") ? "var(--sky-deep)" : "var(--paper)", border: "1px solid var(--rule)", color: "var(--paper)" }}>{selectedKeys.includes("all") && "✓"}</div>
              <span>全ての資格から（合計 {totalCloze}問）</span>
            </button>
            {groupEntries.map(([key, { qualName, count }]) => (
              <button key={key} onClick={() => toggleKey(key)} className="w-full flex items-center gap-2 p-2 text-left jp text-sm transition" style={{ background: isSelected(key) && !selectedKeys.includes("all") ? "var(--sky-pale)" : "var(--paper)", border: `1px solid ${isSelected(key) && !selectedKeys.includes("all") ? "var(--sky-deep)" : "var(--rule-soft)"}`, opacity: selectedKeys.includes("all") ? 0.5 : 1 }}>
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0" style={{ background: isSelected(key) && !selectedKeys.includes("all") ? "var(--sky-deep)" : "var(--paper)", border: "1px solid var(--rule)", color: "var(--paper)" }}>{isSelected(key) && !selectedKeys.includes("all") && "✓"}</div>
                <span className="flex-1">{qualName}</span>
                <span className="pixel text-[10px]" style={{ color: "var(--plum)" }}>{count}問</span>
              </button>
            ))}
          </div>
        </div>

        {/* プレビューと作成ボタン */}
        {previewCount > 0 && (
          <div className="p-2 mb-3" style={{ background: "var(--sky-pale)", border: "1px solid var(--sky-deep)" }}>
            <div className="jp text-[11px]" style={{ color: "var(--sky-deep)" }}>✓ {previewCount}問の穴埋め問題集が作成されます</div>
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (!bankName.trim()) { alert("問題集名を入力してください"); return; }
              const keys = selectedKeys.includes("all") ? "all" : selectedKeys;
              const n = createClozeBank(keys, bankName.trim(), bankYear.trim(), bankQualId || null);
              if (n === 0) { alert("対象の穴あき問題がありません"); return; }
              setDone(n);
            }}
            disabled={previewCount === 0}
            className="jp btn-primary flex-1 py-3 flex items-center justify-center gap-2"
            style={{ opacity: previewCount === 0 ? 0.5 : 1 }}
          >
            <BookOpen size={16} /> 問題集を作成
          </button>
          <button onClick={onCancel} className="jp btn-ghost px-4 py-3">戻る</button>
        </div>
      </Box>
    </div>
  );
}

function SessionConfig({ bank, state, onCancel, onStart }) {
  const [random, setRandom] = useState(true);
  const [retryWrong, setRetryWrong] = useState(true);
  const [useTimer, setUseTimer] = useState(true);
  const [excludeMastered, setExcludeMastered] = useState(true);
  const [mode, setMode] = useState("qa");
  const settledN = bank.questions.filter(isSettled).length;
  const [fast, setFast] = useState(settledN >= 5);
  const totalCloze = bank.questions.reduce((a, q) => a + (q.clozes || []).length, 0);
  const excludedCount = bank.questions.filter(q => q.excluded).length;
  const resume = state?.sessionResume?.bankId === bank.id ? state.sessionResume : null;
  const start = (fromResume) => {
    window.__qaConfig = { random, retryWrong, useTimer, excludeMastered, fast: fast && mode === "qa", fromResume: fromResume || false };
    onStart(mode);
  };
  return (
    <div className="space-y-4">
      <Box title={bank.name} icon={<BookOpen size={18} />}>
        {bank.year && <div className="jp text-xs mb-1" style={{ color: "var(--gold)" }}>📅 {bank.year}</div>}
        <div className="jp text-sm mb-1" style={{ color: "var(--ink-soft)" }}>{bank.questions.length}問 を収録{totalCloze > 0 && ` ・ 穴あき${totalCloze}問`}</div>
        {(bank.clears || 0) > 0 && <div className="jp text-xs mb-3" style={{ color: "var(--brick)" }}>⭐ これまでに {bank.clears} 周クリア</div>}

        <div className="jp text-[11px] mb-2 mt-3" style={{ color: "var(--ink-soft)" }}>出題モード</div>
        <div className="grid grid-cols-3 gap-1 mb-3">
          <button onClick={() => setMode("qa")} className="jp py-2 px-2 text-[11px]" style={{ background: mode === "qa" ? "var(--sky-deep)" : "var(--paper)", color: mode === "qa" ? "var(--paper)" : "var(--ink)", border: "1px solid var(--rule)" }}>一問一答</button>
          <button onClick={() => setMode("cloze")} disabled={totalCloze === 0} className="jp py-2 px-2 text-[11px]" style={{ background: mode === "cloze" ? "var(--plum)" : "var(--paper)", color: mode === "cloze" ? "var(--paper)" : (totalCloze === 0 ? "var(--ink-mute)" : "var(--ink)"), border: "1px solid var(--rule)", opacity: totalCloze === 0 ? 0.5 : 1 }}>穴あき{totalCloze > 0 && `(${totalCloze})`}</button>
          <button onClick={() => setMode("mix")} disabled={totalCloze === 0} className="jp py-2 px-2 text-[11px]" style={{ background: mode === "mix" ? "var(--gold)" : "var(--paper)", color: mode === "mix" ? "var(--paper)" : (totalCloze === 0 ? "var(--ink-mute)" : "var(--ink)"), border: "1px solid var(--rule)", opacity: totalCloze === 0 ? 0.5 : 1 }}>ミックス</button>
        </div>

        <div className="space-y-2 mb-4">
          <ConfigToggle label="出題順をランダムにする" sub="OFFにするとCSVの順番通りに出題" value={random} onChange={setRandom} />
          <ConfigToggle label="不正解の問題を再度出題" sub="正解するまで何度でも挑戦" value={retryWrong} onChange={setRetryWrong} />
          <ConfigToggle label="学習時間を計測する" sub="挑戦と同時にタイマー開始（終了時に自動停止）" value={useTimer} onChange={setUseTimer} />
          <ConfigToggle label={`習得済みを除外して出題${excludedCount > 0 ? ` (除外中 ${excludedCount}問)` : ""}`} sub="✓ 習得済みフラグのついた問題をスキップ" value={excludeMastered} onChange={setExcludeMastered} />
          {mode === "qa" && settledN > 0 && (() => {
            const spot = Math.ceil(settledN * FAST_SPOT);
            const sec = bank.questions.filter(isSettled).reduce((t, q) => t + ((q.ts || []).length ? q.ts.slice(-3).reduce((a, b) => a + b, 0) / q.ts.slice(-3).length : 8) + 5, 0);
            return <ConfigToggle label={`⚡ 高速周回：定着した${settledN}問を飛ばす`} sub={`最近3回とも◎で${FAST_SEC}秒以内に答えた問題。うち${spot}問は抜き打ちで出します（1周 約${Math.max(1, Math.round((sec - spot * 13) / 60))}分短縮）`} value={fast} onChange={setFast} />;
          })()}
        </div>
        {(() => {
          const live = bank.questions.filter((q) => !q.excluded);
          const seenN = live.filter((q) => (q.correct || 0) + (q.wrong || 0) > 0 || q.sr_nextReview).length;
          if (live.length < 5 || seenN > live.length * 0.1) return null;
          const items = shuffle(live).slice(0, 10).map((q) => ({ bankId: bank.id, bankName: bank.name, year: bank.year || "", qId: q.id }));
          return (
            <div className="jp mb-3 px-2 py-2" style={{ background: "var(--cream)", border: "1px dashed var(--gold)", borderRadius: 8 }}>
              <div className="text-xs" style={{ fontWeight: 800, color: "var(--ink)" }}>🎯 はじめての問題集は、まず力試しから</div>
              <p className="text-[10px] my-1" style={{ color: "var(--ink-soft)" }}>わからなくて大丈夫。先に10問だけ答えてみると、「わからない」が頭に残り、このあと学ぶ内容が入りやすくなります。</p>
              <button onClick={() => window.dispatchEvent(new CustomEvent("sq-study-items", { detail: { items, kind: "pretest", title: "力試し" } }))} className="btn-sky w-full py-1.5 text-xs">力試し（10問）をする</button>
            </div>
          );
        })()}
        <div className="flex gap-2">
          {resume && (
            <button onClick={() => start(true)} className="jp btn-primary flex-1 py-3 flex items-center justify-center gap-2" style={{ background: "var(--gold)" }}>
              ▶ 続きから再開 <span className="pixel text-[10px]">残り{(resume.queueIds||[]).length}問</span>
            </button>
          )}
          <button onClick={() => start(false)} className="jp btn-primary flex-1 py-3 flex items-center justify-center gap-2"><Play size={18} /> {resume ? "最初から" : "挑戦開始"}</button>
          <button onClick={onCancel} className="jp btn-ghost px-4 py-3">戻る</button>
        </div>
      </Box>
    </div>
  );
}

function PerQuestionStampView({ bank, state, toggleQuestionMark, toggleClozeMark, deleteCloze, moveQuestions, addQuestionBank, onCreateCloze, onEditFormat, onExit }) {
  const [filter, setFilter] = useState("all");
  // 一括移動モード
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState({});
  const [moveDialog, setMoveDialog] = useState(false);
  const [moveTargetBankId, setMoveTargetBankId] = useState("");
  const [moveNewBankName, setMoveNewBankName] = useState("");
  const [moveNewBankFolderId, setMoveNewBankFolderId] = useState(bank.folderId || null);
  // Use the live bank from state to reflect mark toggles immediately
  const liveBank = state.questionBanks.find((b) => b.id === bank.id) || bank;
  const filtered = liveBank.questions.filter((q) => {
    const total = q.correct + q.wrong;
    if (filter === "done") return q.correct > 0;
    if (filter === "weak") return isQuestionWeak(q);
    if (filter === "marked") return q.marked;
    if (filter === "unanswered") return total === 0;
    if (filter === "cloze") return (q.clozes || []).length > 0;
    return true;
  });
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button onClick={onExit} className="jp text-xs flex items-center gap-1" style={{ color: "var(--ink-soft)" }}><XIcon size={14} /> 戻る</button>
          <button onClick={() => { setSelectMode(!selectMode); setSelectedIds({}); }} className="jp text-[10px] px-2 py-0.5" style={{ background: selectMode ? "var(--plum)" : "var(--paper)", color: selectMode ? "var(--paper)" : "var(--plum)", border: "1px solid var(--plum)" }}>{selectMode ? "✕ 選択解除" : "📦 選択モード"}</button>
        </div>
        <div className="jp text-xs" style={{ color: "var(--sky-deep)" }}>{liveBank.year && <span style={{ color: "var(--gold)" }}>{liveBank.year}</span>} {liveBank.name}</div>
      </div>

      {selectMode && (() => {
        const selCount = Object.values(selectedIds).filter(Boolean).length;
        return (
          <div className="p-2 flex items-center justify-between gap-2" style={{ background: "var(--sky-pale)", border: "1px solid var(--plum)" }}>
            <span className="jp text-xs" style={{ color: "var(--plum)" }}>📦 {selCount}問選択中</span>
            <div className="flex gap-1">
              <button onClick={() => { const all = {}; filtered.forEach((q) => { all[q.id] = true; }); setSelectedIds(all); }} className="jp text-[10px] px-2 py-0.5" style={{ background: "var(--paper)", border: "1px solid var(--rule)" }}>全選択</button>
              <button onClick={() => setSelectedIds({})} className="jp text-[10px] px-2 py-0.5" style={{ background: "var(--paper)", border: "1px solid var(--rule)" }}>クリア</button>
              <button onClick={() => setMoveDialog(true)} disabled={selCount === 0} className="jp text-[10px] px-2 py-0.5" style={{ background: selCount > 0 ? "var(--plum)" : "var(--rule-soft)", color: "var(--paper)" }}>📦 移動</button>
            </div>
          </div>
        );
      })()}

      {moveDialog && (
        <div className="p-2" style={{ background: "var(--sky-pale)", border: "2px solid var(--plum)" }}>
          <div className="flex items-center justify-between mb-1">
            <span className="jp text-xs font-bold" style={{ color: "var(--plum)" }}>📦 {Object.values(selectedIds).filter(Boolean).length}問を移動</span>
            <button onClick={() => { setMoveDialog(false); setMoveTargetBankId(""); setMoveNewBankName(""); }} className="jp text-[10px]" style={{ color: "var(--ink-soft)", background: "none", border: "none" }}>✕</button>
          </div>
          <p className="jp text-[10px] mb-1" style={{ color: "var(--ink-soft)" }}>履歴・マーク・メモは引き継がれます。</p>
          <select className="rpg-input text-xs py-0.5 w-full mb-1" value={moveTargetBankId} onChange={(e) => setMoveTargetBankId(e.target.value)}>
            <option value="">-- 移動先を選択 --</option>
            <option value="__new__">＋ 新規問題集を作成</option>
            <optgroup label="既存の問題集">
              {state.questionBanks.filter((b) => b.id !== bank.id).map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </optgroup>
          </select>
          {moveTargetBankId === "__new__" && (
            <div className="space-y-1 p-2 mb-1" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)" }}>
              <input className="rpg-input w-full text-sm" value={moveNewBankName} onChange={(e) => setMoveNewBankName(e.target.value)} placeholder="新規問題集の名前" />
              <div className="flex gap-1 items-center">
                <label className="jp text-[10px]" style={{ color: "var(--ink-soft)" }}>フォルダ:</label>
                <select className="rpg-input text-xs py-0.5 flex-1" value={moveNewBankFolderId || ""} onChange={(e) => setMoveNewBankFolderId(e.target.value || null)}>
                  <option value="">（未分類）</option>
                  {(state.folders || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <button
            onClick={() => {
              if (!moveTargetBankId) return;
              const qIds = Object.keys(selectedIds).filter((id) => selectedIds[id]);
              if (qIds.length === 0) return;
              let targetId = moveTargetBankId;
              if (moveTargetBankId === "__new__") {
                if (!moveNewBankName.trim()) { alert("新規問題集の名前を入力してください"); return; }
                targetId = uid();
                if (addQuestionBank) addQuestionBank({ id: targetId, name: moveNewBankName.trim(), year: "", qualId: bank.qualId || null, folderId: moveNewBankFolderId, questions: [] });
              }
              if (moveQuestions) moveQuestions(bank.id, qIds, targetId);
              setMoveDialog(false);
              setMoveTargetBankId("");
              setMoveNewBankName("");
              setSelectMode(false);
              setSelectedIds({});
            }}
            disabled={!moveTargetBankId || (moveTargetBankId === "__new__" && !moveNewBankName.trim())}
            className="jp w-full py-1 text-xs"
            style={{ background: "var(--plum)", color: "var(--paper)" }}
          >📦 移動を実行</button>
        </div>
      )}

      {/* 周回の記録（何周目を何日に完了したか） */}
      {(liveBank.clearHistory || []).length > 0 && (() => {
        const hist = liveBank.clearHistory || [];
        const before = Math.max(0, (liveBank.clears || 0) - hist.length); // 記録を始める前の周回
        const fmt = (d) => { const p = String(d || "").split("-"); return p.length === 3 ? `${p[0]}/${Number(p[1])}/${Number(p[2])}` : (d || "-"); };
        return (
          <Box title="周回の記録" icon={<Award size={18} />}>
            <p className="jp text-[11px] mb-2" style={{ color: "var(--ink-soft)" }}>完全制覇するごとに、その日付と正答率を記録しています。</p>
            <div className="space-y-1">
              {hist.map((h, i) => (
                <div key={i} className="flex items-center justify-between gap-2 jp text-xs px-2 py-1" style={{ background: i % 2 ? "var(--paper)" : "var(--sky-pale)", border: "1px solid var(--rule-soft)" }}>
                  <span style={{ color: "var(--ink)", minWidth: 52 }}>{before + i + 1}周目</span>
                  <span style={{ color: "var(--ink-soft)" }}>{fmt(h.date)}</span>
                  <span style={{ color: "var(--sky-deep)", minWidth: 90, textAlign: "right" }}>{typeof h.accuracy === "number" ? `正答率 ${h.accuracy}%` : ""}</span>
                </div>
              ))}
            </div>
            {before > 0 && <p className="jp text-[10px] mt-1" style={{ color: "var(--ink-mute)" }}>※ 記録を始める前に {before} 周しています</p>}
          </Box>
        );
      })()}

      {/* Accuracy chart over rounds */}
      {(liveBank.clearHistory || []).length > 0 && (
        <Box title="正答率の推移" icon={<TrendingUp size={18} />}>
          <p className="jp text-[11px] mb-2" style={{ color: "var(--ink-soft)" }}>周回ごとの正答率（完全制覇するごとに記録）</p>
          <AccuracyChart history={liveBank.clearHistory} />
        </Box>
      )}

      {/* 周回履歴カレンダー（草グラフ）*/}
      {(liveBank.clearHistory || []).length > 0 && (
        <Box title="周回カレンダー" icon={<Calendar size={18} />}>
          <p className="jp text-[11px] mb-2" style={{ color: "var(--ink-soft)" }}>周回完了日の記録</p>
          {(() => {
            const clearData = {};
            (liveBank.clearHistory || []).forEach(h => {
              if (h.date) clearData[h.date] = (clearData[h.date] || 0) + 1;
            });
            const clearColorFn = (count) => {
              if (count === 1) return "#c6e48b";
              if (count === 2) return "#7bc96f";
              return "#239a3b";
            };
            return <StudyCalendar data={clearData} colorFn={clearColorFn} labelFn={(v, k) => v ? `${v}回クリア` : "なし"} />;
          })()}
          <div className="jp text-[10px] mt-2 flex gap-2 items-center" style={{ color: "var(--ink-mute)" }}>
            <span style={{ display: "inline-block", width: "10px", height: "10px", background: "#c6e48b", borderRadius: "2px" }} /> 1回
            <span style={{ display: "inline-block", width: "10px", height: "10px", background: "#7bc96f", borderRadius: "2px" }} /> 2回
            <span style={{ display: "inline-block", width: "10px", height: "10px", background: "#239a3b", borderRadius: "2px" }} /> 3回以上
          </div>
        </Box>
      )}

      <Box title="問題ごとのスタンプ" icon={<StarIcon size={18} />}>
        <p className="jp text-[11px] mb-2" style={{ color: "var(--ink-soft)" }}>各問題の記録。⭐で要復習マーク、＋で穴あき問題を追加。</p>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-1 mb-3">
          {[
            { id: "all", label: `全部 (${liveBank.questions.length})` },
            { id: "done", label: `正解済` },
            { id: "weak", label: `苦手` },
            { id: "marked", label: `⭐マーク` },
            { id: "cloze", label: `穴あき有` },
            { id: "unanswered", label: `未挑戦` },
          ].map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} className="jp py-1 px-1 text-[10px]" style={{ background: filter === f.id ? "var(--sky-deep)" : "var(--paper)", color: filter === f.id ? "var(--paper)" : "var(--ink)", border: "1px solid var(--rule)" }}>{f.label}</button>
          ))}
        </div>
        {filtered.length === 0 ? <p className="jp text-sm text-center py-4" style={{ color: "var(--ink-mute)" }}>該当する問題はない</p> : (
          <ul className="space-y-2">
            {filtered.map((q) => {
              const total = q.correct + q.wrong;
              const isWeak = isQuestionAutoWeak(q);
              const visible = Math.min(q.correct, 10);
              const overflow = q.correct - visible;
              const clozes = q.clozes || [];
              const bg = q.marked ? "rgba(184,134,44,0.10)" : (isWeak ? "rgba(160,72,72,0.08)" : "var(--sky-pale)");
              const bd = q.marked ? "var(--gold)" : (isWeak ? "var(--brick)" : "var(--rule-soft)");
              return (
                <li key={q.id} className="p-2" style={{ background: selectMode && selectedIds[q.id] ? "rgba(123,78,109,0.15)" : bg, border: `1px solid ${selectMode && selectedIds[q.id] ? "var(--plum)" : bd}` }}>
                  <div className="flex items-baseline gap-2 mb-1">
                    {selectMode && (
                      <input
                        type="checkbox"
                        checked={!!selectedIds[q.id]}
                        onChange={(e) => setSelectedIds((prev) => ({ ...prev, [q.id]: e.target.checked }))}
                        className="flex-shrink-0"
                        style={{ width: "16px", height: "16px", accentColor: "var(--plum)" }}
                      />
                    )}
                    <span className="pixel text-[10px] flex-shrink-0" style={{ color: "var(--ink-mute)" }}>Q{(liveBank.questions.findIndex((x) => x.id === q.id) + 1)}.</span>
                    <span className="qtext-list jp text-sm flex-1 break-words" style={{ color: "var(--ink)" }}>{renderQText(q.q, q.q_formats, q.a)}</span>
                    <button onClick={() => toggleQuestionMark(liveBank.id, q.id)} className="text-base flex-shrink-0" title={q.marked ? "マーク解除" : "要復習マークを付ける"} style={{ color: q.marked ? "var(--gold)" : "var(--ink-mute)" }}>{q.marked ? "⭐" : "☆"}</button>
                    <button onClick={() => onEditFormat(q.id)} className="text-xs flex-shrink-0 px-1.5 py-0.5 jp" title="書式設定" style={{ background: ((q.q_formats||[]).length > 0 || (q.a_formats||[]).length > 0) ? "var(--gold)" : "var(--paper)", color: ((q.q_formats||[]).length > 0 || (q.a_formats||[]).length > 0) ? "var(--paper)" : "var(--ink-mute)", border: "1px solid var(--rule-soft)" }}>✏ 書式</button>
                  </div>
                  <div className="jp text-[11px] mb-1" style={{ color: "var(--ink-soft)" }}>答え: <span className="qtext-list" style={{ color: "var(--gold)" }}>{renderFormattedText(q.a, q.a_formats)}</span></div>
                  <QuestionImages bankId={liveBank.id} question={q} side="all" compact />
                  <AnswerHistory q={q} compact />
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    {total === 0 ? <span className="jp text-[10px]" style={{ color: "var(--ink-mute)" }}>未挑戦</span> : (
                      <>
                        {Array.from({ length: visible }).map((_, i) => { const cls = i < 3 ? "stamp tiny" : i < 6 ? "stamp tiny gold" : "stamp tiny sage"; return <span key={i} className={cls}>✓</span>; })}
                        {overflow > 0 && <span className="pixel text-[10px]" style={{ color: "var(--ink-soft)" }}>+{overflow}</span>}
                        {q.wrong > 0 && <span className="pixel text-[10px] ml-2 px-1" style={{ background: "var(--brick)", color: "var(--paper)" }}>×{q.wrong}</span>}
                      </>
                    )}
                  </div>

                  {/* Cloze section */}
                  <div className="mt-2 pt-2" style={{ borderTop: "1px dashed var(--rule-soft)" }}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="jp text-[10px]" style={{ color: "var(--plum)" }}>派生穴あき問題 ({clozes.length})</span>
                      <button onClick={() => onCreateCloze(q.id)} className="jp text-[10px] px-2 py-0.5" style={{ background: "var(--plum)", color: "var(--paper)", border: "1px solid var(--rule)" }}>＋ 追加</button>
                    </div>
                    {clozes.length > 0 && (
                      <ul className="space-y-1">
                        {clozes.map((c) => {
                          const cTotal = c.correct + c.wrong;
                          const cWeak = c.wrong > 0 && c.correct < c.wrong;
                          return (
                            <li key={c.id} className="p-1.5 jp text-[11px]" style={{ background: "var(--paper)", border: `1px solid ${cWeak ? "var(--brick)" : "var(--rule-soft)"}` }}>
                              <div className="flex items-start gap-1">
                                <span className="flex-1 break-words" style={{ color: "var(--ink)" }}>{renderClozePreview(c)}</span>
                                <button onClick={() => toggleClozeMark(liveBank.id, q.id, c.id)} title={c.marked ? "マーク解除" : "要復習"} style={{ color: c.marked ? "var(--gold)" : "var(--ink-mute)" }}>{c.marked ? "⭐" : "☆"}</button>
                                <button onClick={() => { if (confirm("この穴あき問題を削除しますか？")) deleteCloze(liveBank.id, q.id, c.id); }} title="削除" style={{ color: "var(--brick)" }}>🗑</button>
                              </div>
                              <div className="text-[10px] mt-0.5" style={{ color: "var(--ink-soft)" }}>
                                {cTotal === 0 ? "未挑戦" : `◯${c.correct} ✕${c.wrong}`}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Box>
    </div>
  );
}

// Render a cloze with [_____] for blanks
function renderClozePreview(cloze) {
  if (!cloze || !cloze.text || !Array.isArray(cloze.blanks)) return "";
  const sorted = [...cloze.blanks].sort((a, b) => a.from - b.from);
  let result = "";
  let cursor = 0;
  sorted.forEach((bl) => {
    result += cloze.text.slice(cursor, bl.from);
    result += "[ ___ ]";
    cursor = bl.to;
  });
  result += cloze.text.slice(cursor);
  return result;
}

function RevengeSession({ bank, state, recordRevengeAnswer, recordClozeRevengeAnswer, editQuestion, startTimer, stopTimer, onExit, onComplete }) {
  const [battleKey] = useState(() => uid()); // バトル演出：この学習（セット）の識別
  const [editMode, setEditMode] = useState(null); // null | "q" | "a"（問題文・答えのその場編集）
  const [editText, setEditText] = useState("");
  // Build a unified queue of weakness items: regular questions + clozes
  // type: "q" or "cloze"
  const buildItems = (b) => {
    const items = [];
    b.questions.forEach((q) => {
      if (isQuestionWeak(q)) {
        items.push({ type: "q", qId: q.id, key: `q:${q.id}` });
      }
      (q.clozes || []).forEach((c) => {
        if ((c.wrong > 0 && c.correct < c.wrong) || c.marked) {
          items.push({ type: "cloze", qId: q.id, clozeId: c.id, key: `c:${q.id}:${c.id}` });
        }
      });
    });
    return items;
  };
  const initialItems = buildItems(bank);
  const [queue, setQueue] = useState([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [stats, setStats] = useState({ revenged: 0, stillWrong: 0 });
  const [done, setDone] = useState(false);
  const [toast, setToast] = useState(null);
  const timerStartedByMe = useRef(false);

  useEffect(() => {
    setQueue(shuffle(initialItems));
    setShowAnswer(false); setDone(false);
    setStats({ revenged: 0, stillWrong: 0 });
    if (!state.timer.startMs) { startTimer(bank.qualId || null, "qa"); timerStartedByMe.current = true; }
  }, [bank.id]);

  const cleanupTimer = () => { if (timerStartedByMe.current && state.timer.autoMode === "qa") { stopTimer(); timerStartedByMe.current = false; } };
  const exitSession = () => { cleanupTimer(); onExit(); };
  const showToast = (text, color) => { setToast({ text, color, id: Date.now() }); setTimeout(() => setToast(null), 2200); };

  const currentBank = state.questionBanks.find((b) => b.id === bank.id) || bank;
  const item = queue[0];
  const currentQ = item ? currentBank.questions.find((q) => q.id === item.qId) : null;
  const currentCloze = (item && item.type === "cloze" && currentQ) ? (currentQ.clozes || []).find((c) => c.id === item.clozeId) : null;

  const answer = (correct, meta) => {
    if (!item || !currentQ) return;
    if (item.type === "cloze" && currentCloze) {
      recordClozeRevengeAnswer(bank.id, item.qId, item.clozeId, correct);
    } else {
      recordRevengeAnswer(bank.id, currentQ.id, correct, meta);
    }
    if (correct) { setStats((s) => ({ ...s, revenged: s.revenged + 1 })); showToast(`💪 リベンジ成功！ +${XP_QA_REVENGE} EXP`, "var(--plum)"); }
    else { setStats((s) => ({ ...s, stillWrong: s.stillWrong + 1 })); }
    let newQueue = queue.slice(1);
    if (!correct) newQueue = [...newQueue, item];
    if (newQueue.length === 0) setTimeout(() => { cleanupTimer(); setDone(true); if (onComplete) onComplete(); }, 600);
    setQueue(newQueue);
    setShowAnswer(false);
  };

  if (initialItems.length === 0) {
    return (
      <Box title="リベンジモード" icon={<Skull size={18} />}>
        <div className="text-center py-4">
          <div className="text-4xl mb-2">✨</div>
          <p className="jp text-sm mb-3" style={{ color: "var(--ink)" }}>リベンジ対象の問題はないようだ。<br />完璧なすばらしさ！</p>
          <button onClick={onExit} className="jp btn-primary px-6 py-2">戻る</button>
        </div>
      </Box>
    );
  }

  if (done) {
    return (
      <Box title="リベンジ完了！" icon={<Award size={18} />}>
        <BattleResult state={state} battleKey={battleKey} />
        <div className="text-center py-4">
          <div className="text-5xl mb-2">💪</div>
          <div className="jp text-base mb-3" style={{ color: "var(--ink)" }}>苦手を打ち倒した！</div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <Stat label="リベンジ成功" value={stats.revenged} accent="var(--plum)" />
            <Stat label="獲得EXP" value={stats.revenged * XP_QA_REVENGE} accent="var(--gold)" />
          </div>
          <button onClick={onExit} className="jp btn-primary w-full py-2">戻る</button>
        </div>
      </Box>
    );
  }

  if (!item || !currentQ) return <Box title="リベンジ"><p className="jp text-sm text-center py-4" style={{ color: "var(--ink-mute)" }}>問題がない</p></Box>;

  // Render question text & answer based on type
  let displayQ, displayA, badgeText;
  if (item.type === "cloze" && currentCloze) {
    displayQ = renderClozePreview(currentCloze);
    displayA = currentCloze.blanks.map((b, i) => `(${i + 1}) ${b.answer}`).join(" / ");
    badgeText = `穴あき問題（◯${currentCloze.correct} ✕${currentCloze.wrong}${currentCloze.marked ? " ⭐" : ""}）`;
  } else {
    displayQ = renderQText(currentQ.q, currentQ.q_formats, currentQ.a);
    displayA = renderFormattedText(currentQ.a, currentQ.a_formats);
    badgeText = `苦手な問題（◯${currentQ.correct} ✕${currentQ.wrong}${currentQ.marked ? " ⭐" : ""}）`;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <button onClick={exitSession} className="jp text-xs flex items-center gap-1" style={{ color: "var(--ink-soft)" }}><XIcon size={14} /> 終了</button>
        <div className="pixel text-xs" style={{ color: "var(--plum)" }}>💀 リベンジ ・ 残り {queue.length}</div>
      </div>
      <div className="text-center jp text-xs" style={{ color: "var(--plum)" }}>💪 苦手を倒せ！正解で +{XP_QA_REVENGE} EXP</div>
      {!currentCloze && <BattleStage state={state} q={currentQ} bankName={currentBank && currentBank.name} battleKey={battleKey} />}
      <div className="rpg-box p-1" style={{ borderColor: "var(--plum)" }}>
        <div className="rpg-inner-border min-h-[180px] flex flex-col" style={{ borderColor: "var(--plum)" }}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="jp text-[10px] mb-2" style={{ color: "var(--plum)" }}>{badgeText}</div>
              <div className="qtext jp text-base md:text-lg flex-1 break-words" style={{ color: "var(--ink)" }}>{displayQ}</div>
              {item.type === "q" && <QuestionImages bankId={bank.id} question={currentQ} side="q" />}
            </div>
            <button onClick={() => { setEditMode("q"); setEditText(currentQ.q); }} className="flex-shrink-0 jp text-[10px] px-1.5 py-0.5 mt-1" style={{ border: "1px solid var(--rule)", color: "var(--ink-soft)" }} title="問題文を編集">✏️</button>
          </div>
          {editMode === "q" && (
            <div className="mt-2 space-y-1">
              <textarea className="rpg-input w-full text-sm" rows={3} value={editText} onChange={e => setEditText(e.target.value)} autoFocus style={{ resize: "vertical" }} />
              <div className="flex gap-1">
                <button onClick={() => { if (editQuestion) editQuestion(bank.id, currentQ.id, editText, currentQ.a); setEditMode(null); }} className="jp btn-primary flex-1 py-1 text-xs">💾 保存</button>
                <button onClick={() => setEditMode(null)} className="jp btn-ghost px-3 py-1 text-xs">キャンセル</button>
              </div>
            </div>
          )}
          {showAnswer ? (
            <>
              <div className="flex items-center justify-between mt-3 mb-1">
                <div className="jp text-[10px]" style={{ color: "var(--gold)" }}>答え</div>
                <button onClick={() => { setEditMode("a"); setEditText(currentQ.a); }} className="jp text-[10px] px-1.5 py-0.5" style={{ border: "1px solid var(--rule)", color: "var(--ink-soft)" }} title="答えを編集">✏️ 編集</button>
              </div>
              <div className="qtext jp text-base md:text-lg break-words p-2" style={{ background: "var(--sky-pale)", border: "1px solid var(--gold)", color: "var(--ink)" }}>{displayA}</div>
              {item.type === "q" && <QuestionImages bankId={bank.id} question={currentQ} side="a" />}
              {item.type === "q" && <LawRefChips q={currentQ} />}
              {editMode === "a" && (
                <div className="mt-1 space-y-1">
                  <textarea className="rpg-input w-full text-sm" rows={3} value={editText} onChange={e => setEditText(e.target.value)} autoFocus style={{ resize: "vertical" }} />
                  <div className="flex gap-1">
                    <button onClick={() => { if (editQuestion) editQuestion(bank.id, currentQ.id, currentQ.q, editText); setEditMode(null); }} className="jp btn-primary flex-1 py-1 text-xs">💾 保存</button>
                    <button onClick={() => setEditMode(null)} className="jp btn-ghost px-3 py-1 text-xs">キャンセル</button>
                  </div>
                </div>
              )}
              {item.type === "q" ? (
                <AnswerPanel onAnswer={answer} wrongLabel="まだ難しい" correctLabel="倒した" sureClass="btn-plum" question={currentQ} srSettings={effectiveSr(state)} />
              ) : (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button onClick={() => answer(false)} className="jp btn-danger py-2 flex items-center justify-center gap-1"><XIcon size={16} /> まだ難しい</button>
                  <button onClick={() => answer(true)} className="jp btn-plum py-2 flex items-center justify-center gap-1"><Sword2 size={16} /> 倒した！</button>
                </div>
              )}
            </>
          ) : (
            <RevealButton q={currentQ} onReveal={() => setShowAnswer(true)} />
          )}
        </div>
      </div>
      <div className="flex justify-around text-center">
        <div><div className="jp text-[10px]" style={{ color: "var(--slate)" }}>リベンジ</div><div className="pixel" style={{ color: "var(--plum)" }}>{stats.revenged}</div></div>
        <div><div className="jp text-[10px]" style={{ color: "var(--slate)" }}>まだ苦手</div><div className="pixel" style={{ color: "var(--brick)" }}>{stats.stillWrong}</div></div>
      </div>
      {toast && (
        <div key={toast.id} className="milestone-toast fixed left-1/2 top-1/4 z-50 pointer-events-none" style={{ transform: "translateX(-50%)" }}>
          <div className="rpg-box p-1">
            <div className="rpg-inner-border px-4 py-2">
              <div className="pixel text-base md:text-xl whitespace-nowrap" style={{ color: toast.color, textShadow: "1px 1px 0 var(--paper)" }}>{toast.text}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QStudySession({ bank, state, recordAnswer, awardXp, startTimer, stopTimer, incrementBankClears, updateBestStreak, recordClearSnapshot, toggleQuestionMark, saveSessionResume, clearSessionResume, resumeData, updateQuestionMemo, toggleQuestionExclude, editQuestion, addStudyNote, updateStudyNote, moveQuestions, addQuestionBank, onExit }) {
  const [battleKey] = useState(() => uid()); // バトル演出：この学習（セット）の識別
  const [config] = useState(() => window.__qaConfig || { random: true, retryWrong: true, useTimer: true });
  const fromResume = config.fromResume && resumeData;

  const [queue, setQueue] = useState([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [stats, setStats] = useState({ correct: 0, wrong: 0, totalAnswered: 0, streak: 0, bestStreak: 0 });
  const [milestones, setMilestones] = useState({ m5: false, m10: false, m20: false });
  const [done, setDone] = useState(false);
  const [toast, setToast] = useState(null);
  const [streakAnim, setStreakAnim] = useState(false);
  const [stampPressed, setStampPressed] = useState(false);
  const timerStartedByMe = useRef(false);
  const completionRecorded = useRef(false);
  const fastSkip = useRef(0); // 高速周回で飛ばした問題の数
  const [memoEdit, setMemoEdit] = useState(false);
  const [memoText, setMemoText] = useState("");
  const [wrongList, setWrongList] = useState([]);   // 今回間違えた問題リスト
  const [showReview, setShowReview] = useState(false); // 振り返り画面
  const [editMode, setEditMode] = useState(null);   // null | "q" | "a"
  const [editText, setEditText] = useState("");
  // 学習メモ（フォルダに集約用）
  const [noteCompose, setNoteCompose] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteFolderId, setNoteFolderId] = useState(bank.folderId || null);
  const [noteSaved, setNoteSaved] = useState(false);
  // 問題移動
  const [moveCompose, setMoveCompose] = useState(false);
  const [moveTargetBankId, setMoveTargetBankId] = useState("");
  const [moveNewBankName, setMoveNewBankName] = useState("");
  const [moveNewBankFolderId, setMoveNewBankFolderId] = useState(bank.folderId || null);

  // 一時停止：現在の位置を保存してセッションを終了
  const pauseSession = () => {
    if (saveSessionResume && queue.length > 0) {
      saveSessionResume({ bankId: bank.id, mode: "qa", queueIds: queue, stats, savedAt: new Date().toISOString() });
    }
    cleanupTimer();
    onExit();
  };

  useEffect(() => {
    if (fromResume) {
      // 途中再開：保存されたキューとスコアを復元
      const qids = Array.isArray(resumeData.queueIds) ? resumeData.queueIds : [];
      const validQids = qids.filter((id) => typeof id === "string" && safeQuestions.find((q) => q.id === id));
      if (validQids.length > 0) {
        setQueue(validQids);
      } else {
        // IDが見つからない場合は最初から
        const ids = safeQuestions.map((q) => q.id);
        setQueue(config.random ? shuffle(ids) : ids);
      }
      setStats(resumeData.stats || { correct: 0, wrong: 0, totalAnswered: 0, streak: 0, bestStreak: 0 });
    } else {
      // 最初から：clearして新しいキュー
      if (clearSessionResume) clearSessionResume();
      const activeQs = config.excludeMastered !== false
        ? bank.questions.filter(q => !q.excluded)
        : bank.questions;
      let pool = activeQs.length > 0 ? activeQs : bank.questions;
      if (config.fast) {
        const settled = pool.filter(isSettled);
        const spot = new Set(shuffle(settled.map((q) => q.id)).slice(0, Math.ceil(settled.length * FAST_SPOT)));
        const kept = pool.filter((q) => !isSettled(q) || spot.has(q.id));
        if (kept.length && settled.length) { fastSkip.current = settled.length - spot.size; pool = kept; setTimeout(() => showToast(`⚡ 定着した${fastSkip.current}問を飛ばしました（抜き打ち${spot.size}問）`, "var(--sky-deep)"), 300); }
      }
      const ids = pool.map((q) => q.id);
      setQueue(config.random ? shuffle(ids) : ids);
      setStats({ correct: 0, wrong: 0, totalAnswered: 0, streak: 0, bestStreak: 0 });
    }
    setShowAnswer(false); setDone(false); setShowReview(false);
    setWrongList([]);
    setMilestones({ m5: false, m10: false, m20: false });
    completionRecorded.current = false;
    if (config.useTimer && !state.timer.startMs) { startTimer(bank.qualId || null, "qa"); timerStartedByMe.current = true; }
  }, [bank.id]);

  const cleanupTimer = () => { if (timerStartedByMe.current && state.timer.autoMode === "qa") { stopTimer(); timerStartedByMe.current = false; } };
  const exitSession = () => { cleanupTimer(); onExit(); };
  const showToast = (text, color = "var(--gold)") => { setToast({ text, color, id: Date.now() }); setTimeout(() => setToast(null), 2200); };

  const currentBank = state.questionBanks.find((b) => b.id === bank.id) || bank;
  const safeQuestions = currentBank.questions || bank.questions || [];
  const currentQ = safeQuestions.find((q) => q.id === queue[0]);
  const totalUnique = bank.questions.length;

  const answer = (correct, meta) => {
    if (!currentQ) return;
    recordAnswer(bank.id, currentQ.id, correct, meta);
    const newTotal = stats.totalAnswered + 1;
    const newCorrect = stats.correct + (correct ? 1 : 0);
    const newWrong = stats.wrong + (correct ? 0 : 1);
    const newStreak = correct ? stats.streak + 1 : 0;
    const newBest = Math.max(stats.bestStreak, newStreak);
    const newStats = { correct: newCorrect, wrong: newWrong, totalAnswered: newTotal, streak: newStreak, bestStreak: newBest };
    setStats(newStats);
    if (newBest > (state.player.bestQaStreak || 0)) updateBestStreak(newBest);
    if (correct) { setStreakAnim(true); setTimeout(() => setStreakAnim(false), 350); }
    if (correct && newStreak > 0 && newStreak % 5 === 0) {
      setTimeout(() => { awardXp(XP_QA_STREAK_5); showToast(`🔥 ${newStreak}連続正解！ +${XP_QA_STREAK_5} EXP`, "var(--brick)"); }, 250);
    }
    setTimeout(() => {
      if (newTotal === 5 && !milestones.m5) { awardXp(XP_QA_AT_5); setMilestones((m) => ({ ...m, m5: true })); showToast(`5問達成！ +${XP_QA_AT_5} EXP`); }
      if (newTotal === 10 && !milestones.m10) { awardXp(XP_QA_AT_10); setMilestones((m) => ({ ...m, m10: true })); showToast(`10問達成！ +${XP_QA_AT_10} EXP`); }
      if (newTotal === 20 && !milestones.m20) { awardXp(XP_QA_AT_20); setMilestones((m) => ({ ...m, m20: true })); showToast(`20問達成！ +${XP_QA_AT_20} EXP`); }
    }, 300);

    // 不正解の場合、振り返りリストに追加（重複なし）
    if (!correct) {
      setWrongList(prev => prev.find(w => w.id === currentQ.id) ? prev : [...prev, { id: currentQ.id, q: currentQ.q, a: currentQ.a, memo: currentQ.memo || "" }]);
    }

    let newQueue = queue.slice(1);
    if (!correct && config.retryWrong) newQueue = [...newQueue, currentQ.id];

    if (newQueue.length === 0) {
      // 完了 → resumeをクリア
      if (clearSessionResume) clearSessionResume();
      setTimeout(() => {
        awardXp(XP_QA_COMPLETE);
        showToast(`完全制覇！ +${XP_QA_COMPLETE} EXP`, "var(--gold)");
        if (!completionRecorded.current) {
          incrementBankClears(bank.id);
          const acc = (newCorrect + newWrong) > 0 ? Math.round((newCorrect / (newCorrect + newWrong)) * 100) : 0;
          if (recordClearSnapshot) recordClearSnapshot(bank.id, { date: todayStr(), accuracy: acc, totalAns: newCorrect + newWrong, correct: newCorrect, wrong: newWrong, ...(fastSkip.current ? { fast: fastSkip.current } : {}) });
          completionRecorded.current = true; setStampPressed(true);
        }
      }, 400);
      setTimeout(() => { cleanupTimer(); setDone(true); }, 1200);
      setTimeout(() => { setShowReview(true); }, 1300);
    } else {
      // 途中保存（1問ごとに自動）
      if (saveSessionResume) {
        saveSessionResume({ bankId: bank.id, mode: "qa", queueIds: newQueue, stats: newStats, savedAt: new Date().toISOString() });
      }
    }

    setQueue(newQueue);
    setShowAnswer(false);
    setMemoEdit(false);
    setMemoText("");
  };

  const reshuffle = () => {
    if (clearSessionResume) clearSessionResume();
    const ids = bank.questions.map((q) => q.id);
    setQueue(config.random ? shuffle(ids) : ids);
    setShowAnswer(false); setDone(false);
    setStats({ correct: 0, wrong: 0, totalAnswered: 0, streak: 0, bestStreak: 0 });
    setMilestones({ m5: false, m10: false, m20: false });
    setStampPressed(false); completionRecorded.current = false;
    if (config.useTimer && !state.timer.startMs) { startTimer(bank.qualId || null, "qa"); timerStartedByMe.current = true; }
  };

  if (done) {
    const acc = stats.correct + stats.wrong > 0 ? Math.round((stats.correct / (stats.correct + stats.wrong)) * 100) : 0;
    const totalClears = currentBank.clears || 0;
    return (
      <Box title="挑戦終了！" icon={<Award size={18} />}>
        <BattleResult state={state} battleKey={battleKey} />
        <div className="text-center py-4">
          <div className="text-5xl mb-2">🏆</div>
          <div className="jp text-base mb-3" style={{ color: "var(--ink)" }}>{bank.name}{bank.year && ` ・ ${bank.year}`}</div>
          <div className="my-4 p-3" style={{ background: "var(--sky-pale)", border: "1px dashed var(--brick)" }}>
            <div className="jp text-[10px] mb-2" style={{ color: "var(--ink-soft)" }}>周回スタンプ</div>
            <div className="flex flex-wrap gap-2 justify-center items-center min-h-[40px]">
              {Array.from({ length: Math.min(totalClears, 20) }).map((_, i) => { const isLatest = i === totalClears - 1 && stampPressed; const cls = i < 5 ? "stamp" : i < 10 ? "stamp gold" : "stamp sage"; return <span key={i} className={`${cls} ${isLatest ? "stamp-new" : ""}`}>✓</span>; })}
              {totalClears > 20 && <span className="pixel text-xs ml-1" style={{ color: "var(--ink-soft)" }}>+{totalClears - 20}</span>}
            </div>
            <div className="pixel text-xs mt-2" style={{ color: "var(--brick)" }}>×{totalClears} 周</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <Stat label="正解" value={stats.correct} accent="var(--sage)" />
            <Stat label="不正解" value={stats.wrong} accent="var(--brick)" />
            <Stat label="正答率" value={`${acc}%`} accent="var(--gold)" />
            <Stat label="最長連続" value={stats.bestStreak} accent="var(--brick)" />
          </div>
          {wrongList.length > 0 && (
            <button onClick={() => setShowReview(true)} className="w-full jp btn-danger mb-2 py-2 flex items-center justify-center gap-2">
              📋 振り返り（間違い {wrongList.length}問）
            </button>
          )}
          <div className="flex gap-2">
            <button onClick={reshuffle} className="jp btn-info flex-1 py-2 flex items-center justify-center gap-1"><Shuffle size={14} /> もう一度</button>
            <button onClick={exitSession} className="jp btn-primary flex-1 py-2">戻る</button>
          </div>
        </div>
      </Box>
    );
  }

  // ── 振り返り画面（間違い一覧）──
  if (showReview) {
    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <button onClick={() => setShowReview(false)} className="jp text-xs flex items-center gap-1" style={{ color: "var(--ink-soft)" }}><XIcon size={14} /> 閉じる</button>
          <div className="jp text-sm font-bold" style={{ color: "var(--brick)" }}>📋 振り返り（{wrongList.length}問）</div>
        </div>
        {wrongList.length === 0 ? (
          <Box><p className="jp text-center py-6" style={{ color: "var(--sage)" }}>✨ 間違いゼロ！全問正解です</p></Box>
        ) : (
          <div className="space-y-2">
            {wrongList.map((w, i) => (
              <div key={w.id} className="rpg-box p-2">
                <div className="rpg-inner-border p-2 space-y-2">
                  <div className="jp text-[10px]" style={{ color: "var(--brick)" }}>✕ 間違い {i + 1}</div>
                  <div className="jp text-sm" style={{ color: "var(--ink)" }}>{w.q}</div>
                  <div className="jp text-sm p-2" style={{ background: "var(--sky-pale)", border: "1px solid var(--gold)", color: "var(--ink)" }}>答え: {w.a}</div>
                  {w.memo && <div className="jp text-[11px] p-1" style={{ background: "var(--memo-bg, #fffbe6)", border: "1px solid var(--gold)", color: "var(--ink-soft)" }}>📝 {w.memo}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => { setShowReview(false); exitSession(); }} className="w-full jp btn-primary py-2">閉じて終了</button>
      </div>
    );
  }

  if (!currentQ) return <Box title={bank.name}><p className="jp text-sm text-center py-4" style={{ color: "var(--ink-mute)" }}>問題がありません</p></Box>;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button onClick={exitSession} className="jp text-xs flex items-center gap-1" style={{ color: "var(--ink-soft)" }}><XIcon size={14} /> 終了</button>
          {queue.length > 0 && (
            <button onClick={pauseSession} className="jp text-xs flex items-center gap-1 px-2 py-1" style={{ background: "var(--sky-pale)", border: "1px solid var(--sky-deep)", color: "var(--sky-deep)" }} title="現在の位置を保存して中断">⏸ 一時停止</button>
          )}
          <button onClick={() => { setNoteCompose(!noteCompose); setNoteSaved(false); }} className="jp text-xs flex items-center gap-1 px-2 py-1" style={{ background: noteCompose ? "var(--gold)" : "var(--paper)", border: "1px solid var(--gold)", color: noteCompose ? "var(--paper)" : "var(--gold)" }} title="この問題に関するメモを作成">📝 メモ</button>
          <button onClick={() => setMoveCompose(!moveCompose)} className="jp text-xs flex items-center gap-1 px-2 py-1" style={{ background: moveCompose ? "var(--plum)" : "var(--paper)", border: "1px solid var(--plum)", color: moveCompose ? "var(--paper)" : "var(--plum)" }} title="この問題を他の問題集に移動">📦 移動</button>
        </div>
        <div className="flex items-center gap-2">
          {fromResume && <span className="jp text-[10px] px-1.5 py-0.5" style={{ background: "var(--gold)", color: "var(--paper)" }}>📌 再開中</span>}
          <div className="pixel text-xs" style={{ color: "var(--sky-deep)" }}>{bank.year && <span style={{ color: "var(--slate)", marginRight: "8px" }}>{bank.year}</span>}残り {queue.length} ・ 正解 {stats.correct}/{totalUnique}</div>
        </div>
      </div>
      {stats.streak > 0 && <div className={`text-center jp text-sm ${streakAnim ? "streak-anim" : ""}`} style={{ color: "var(--brick)" }}>🔥 {stats.streak}連続正解中</div>}

      {/* 📝 学習メモ入力フォーム */}
      {noteCompose && (
        <div className="p-2" style={{ background: "var(--sky-pale)", border: "2px solid var(--gold)", borderRadius: "2px" }}>
          <div className="flex items-center justify-between mb-1">
            <span className="jp text-xs font-bold" style={{ color: "var(--gold)" }}>📝 学習メモを作成</span>
            <button onClick={() => { setNoteCompose(false); setNoteText(""); setNoteSaved(false); }} className="jp text-[10px]" style={{ color: "var(--ink-soft)", background: "none", border: "none" }}>✕</button>
          </div>
          <p className="jp text-[10px] mb-1" style={{ color: "var(--ink-soft)" }}>この問題への気づきを記録。後で「問題」タブの📝学習メモから一覧できます。</p>
          {noteSaved ? (
            <div className="jp text-xs py-2 text-center" style={{ color: "var(--gold)", fontWeight: "bold" }}>✓ メモを保存しました</div>
          ) : (
            <>
              <textarea
                className="rpg-input w-full text-sm mb-1"
                rows={3}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="気づき・論点まとめなど..."
                style={{ resize: "vertical" }}
              />
              <div className="flex gap-1 items-center mb-2 flex-wrap">
                <label className="jp text-[10px]" style={{ color: "var(--ink-soft)" }}>📁 保存先:</label>
                <select
                  className="rpg-input text-xs py-0.5 flex-1 min-w-0"
                  value={noteFolderId || ""}
                  onChange={(e) => setNoteFolderId(e.target.value || null)}
                >
                  <option value="">（未分類）</option>
                  {(state.folders || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => {
                  if (!noteText.trim()) return;
                  const title = bank.name;
                  const existing = (state.studyNotes || []).find((n) => n.title === title);
                  if (existing) {
                    const merged = (existing.content || "").trim() + "\n\n─────\n\n" + noteText.trim();
                    if (updateStudyNote) updateStudyNote(existing.id, { content: merged, folderId: noteFolderId });
                  } else {
                    if (addStudyNote) addStudyNote(noteFolderId, title, noteText);
                  }
                  setNoteText("");
                  setNoteSaved(true);
                  setTimeout(() => { setNoteCompose(false); setNoteSaved(false); }, 1500);
                }}
                className="jp btn-primary w-full py-1 text-xs"
                disabled={!noteText.trim()}
              >💾 保存してフォルダに集約</button>
            </>
          )}
        </div>
      )}

      {/* 📦 問題を他の問題集へ移動 */}
      {moveCompose && (
        <div className="p-2" style={{ background: "var(--sky-pale)", border: "2px solid var(--plum)", borderRadius: "2px" }}>
          <div className="flex items-center justify-between mb-1">
            <span className="jp text-xs font-bold" style={{ color: "var(--plum)" }}>📦 この問題を移動</span>
            <button onClick={() => { setMoveCompose(false); setMoveTargetBankId(""); setMoveNewBankName(""); }} className="jp text-[10px]" style={{ color: "var(--ink-soft)", background: "none", border: "none" }}>✕</button>
          </div>
          <p className="jp text-[10px] mb-1" style={{ color: "var(--ink-soft)" }}>この問題を他の問題集へ移動します（履歴・マーク・メモは引き継ぎ）。</p>
          <div className="space-y-1">
            <label className="jp text-[10px]" style={{ color: "var(--ink-soft)" }}>移動先:</label>
            <select
              className="rpg-input text-xs py-0.5 w-full"
              value={moveTargetBankId}
              onChange={(e) => setMoveTargetBankId(e.target.value)}
            >
              <option value="">-- 選択してください --</option>
              <option value="__new__">＋ 新規問題集を作成</option>
              <optgroup label="既存の問題集">
                {state.questionBanks.filter((b) => b.id !== bank.id).map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </optgroup>
            </select>
            {moveTargetBankId === "__new__" && (
              <div className="space-y-1 p-2" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)" }}>
                <input className="rpg-input w-full text-sm" value={moveNewBankName} onChange={(e) => setMoveNewBankName(e.target.value)} placeholder="新規問題集の名前" />
                <div className="flex gap-1 items-center">
                  <label className="jp text-[10px]" style={{ color: "var(--ink-soft)" }}>フォルダ:</label>
                  <select className="rpg-input text-xs py-0.5 flex-1" value={moveNewBankFolderId || ""} onChange={(e) => setMoveNewBankFolderId(e.target.value || null)}>
                    <option value="">（未分類）</option>
                    {(state.folders || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <button
              onClick={() => {
                if (!moveTargetBankId) return;
                let targetId = moveTargetBankId;
                if (moveTargetBankId === "__new__") {
                  if (!moveNewBankName.trim()) { alert("新規問題集の名前を入力してください"); return; }
                  targetId = uid();
                  if (addQuestionBank) addQuestionBank({ id: targetId, name: moveNewBankName.trim(), year: "", qualId: bank.qualId || null, folderId: moveNewBankFolderId, questions: [] });
                }
                if (moveQuestions) moveQuestions(bank.id, [currentQ.id], targetId);
                // 移動後はキューからも除外し次の問題へ
                const newQueue = queue.filter((id) => id !== currentQ.id);
                setQueue(newQueue);
                setShowAnswer(false);
                setMoveCompose(false);
                setMoveTargetBankId("");
                setMoveNewBankName("");
                if (newQueue.length === 0) setDone(true);
              }}
              disabled={!moveTargetBankId || (moveTargetBankId === "__new__" && !moveNewBankName.trim())}
              className="jp w-full py-1 text-xs"
              style={{ background: "var(--plum)", color: "var(--paper)" }}
            >📦 移動を実行</button>
          </div>
        </div>
      )}
      <BattleStage state={state} q={currentQ} bankName={bank.name} battleKey={battleKey} />
      <div className="rpg-box p-1">
        <div className="rpg-inner-border min-h-[180px] flex flex-col">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="jp text-[10px]" style={{ color: "var(--slate)" }}>問題</div>
            <div className="flex items-center gap-1">
              <button onClick={() => { setEditMode(editMode === "q" ? null : "q"); setEditText(currentQ.q); }} className="flex-shrink-0 jp text-[10px] px-1.5 py-0.5" style={{ border: "1px solid var(--rule)", color: editMode === "q" ? "var(--sky-deep)" : "var(--ink-soft)" }} title="問題文を編集">✏️</button>
              {toggleQuestionMark && (
                <button onClick={() => toggleQuestionMark(bank.id, currentQ.id)} className="text-base flex-shrink-0" title={currentQ.marked ? "マーク解除" : "要復習マークを付ける"} style={{ color: currentQ.marked ? "var(--gold)" : "var(--ink-mute)" }}>{currentQ.marked ? "⭐" : "☆"}</button>
              )}
            </div>
          </div>
          {editMode === "q" ? (
            <div className="space-y-1">
              <textarea className="rpg-input w-full text-sm" rows={4} value={editText} onChange={e => setEditText(e.target.value)} autoFocus style={{ resize: "vertical" }} />
              <div className="flex gap-1">
                <button onClick={() => { if (editQuestion) editQuestion(bank.id, currentQ.id, editText, currentQ.a); setEditMode(null); }} className="jp btn-primary flex-1 py-1 text-xs">💾 保存</button>
                <button onClick={() => setEditMode(null)} className="jp btn-ghost px-3 py-1 text-xs">キャンセル</button>
              </div>
            </div>
          ) : (
            <div className="qtext jp text-base md:text-lg flex-1 break-words" style={{ color: "var(--ink)" }}>{renderQText(currentQ.q, currentQ.q_formats, currentQ.a)}</div>
          )}
          <QuestionImages bankId={bank.id} question={currentQ} side="q" />
          {showAnswer ? (
            <>
              <div className="flex items-center justify-between mt-3 mb-1">
                <div className="jp text-[10px]" style={{ color: "var(--gold)" }}>答え</div>
                <button onClick={() => { setEditMode(editMode === "a" ? null : "a"); setEditText(currentQ.a); }} className="jp text-[10px] px-1.5 py-0.5" style={{ border: "1px solid var(--rule)", color: editMode === "a" ? "var(--sky-deep)" : "var(--ink-soft)" }} title="答えを編集">✏️ 編集</button>
              </div>
              {editMode === "a" ? (
                <div className="space-y-1">
                  <textarea className="rpg-input w-full text-sm" rows={4} value={editText} onChange={e => setEditText(e.target.value)} autoFocus style={{ resize: "vertical" }} />
                  <div className="flex gap-1">
                    <button onClick={() => { if (editQuestion) editQuestion(bank.id, currentQ.id, currentQ.q, editText); setEditMode(null); }} className="jp btn-primary flex-1 py-1 text-xs">💾 保存</button>
                    <button onClick={() => setEditMode(null)} className="jp btn-ghost px-3 py-1 text-xs">キャンセル</button>
                  </div>
                </div>
              ) : (
                <div className="qtext jp text-base md:text-lg break-words p-2" style={{ background: "var(--sky-pale)", border: "1px solid var(--gold)", color: "var(--ink)" }}>{renderFormattedText(currentQ.a, currentQ.a_formats)}</div>
              )}
              <QuestionImages bankId={bank.id} question={currentQ} side="a" />
              <LawRefChips q={currentQ} />
              <AnswerPanel onAnswer={answer} question={currentQ} srSettings={effectiveSr(state)} />
              <button onClick={() => toggleQuestionExclude && toggleQuestionExclude(bank.id, currentQ.id)} className="w-full jp text-[11px] py-1 mt-1" style={{ background: currentQ.excluded ? "var(--sage)" : "var(--paper)", border: `1px solid ${currentQ.excluded ? "var(--sage)" : "var(--rule-soft)"}`, color: currentQ.excluded ? "var(--paper)" : "var(--ink-mute)" }}>
                {currentQ.excluded ? "✓ 習得済み（除外中）タップで解除" : "✓ 習得済みにする（次回から除外）"}
              </button>
              {/* メモ欄 */}
              <div className="mt-3">
                {!memoEdit ? (
                  <button onClick={() => { setMemoText(currentQ.memo || ""); setMemoEdit(true); }} className="w-full text-left jp text-[11px] p-2" style={{ background: currentQ.memo ? "#fffbe6" : "var(--paper)", border: "1px dashed var(--gold)", color: "var(--ink-soft)", minHeight: "32px" }}>
                    📝 {currentQ.memo || "メモを追加（間違えた理由・ポイントなど）"}
                  </button>
                ) : (
                  <div>
                    <textarea className="rpg-input w-full text-sm" rows={3} value={memoText} onChange={(e) => setMemoText(e.target.value)} placeholder="メモを入力..." autoFocus style={{ resize: "vertical" }} />
                    <div className="flex gap-1 mt-1">
                      <button onClick={() => { if (updateQuestionMemo) updateQuestionMemo(bank.id, currentQ.id, memoText); setMemoEdit(false); }} className="jp btn-primary flex-1 py-1 text-xs">💾 保存</button>
                      <button onClick={() => setMemoEdit(false)} className="jp btn-ghost px-3 py-1 text-xs">キャンセル</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <RevealButton q={currentQ} onReveal={() => { setShowAnswer(true); setMemoEdit(false); }} />
          )}
          <div className="pixel text-[10px] mt-2 text-right" style={{ color: "var(--ink-mute)" }}>このカード履歴: ◯{currentQ.correct} ✕{currentQ.wrong}</div>
          <AnswerHistory q={currentQ} />
        </div>
      </div>
      <div className="flex justify-around text-center">
        <div><div className="jp text-[10px]" style={{ color: "var(--slate)" }}>正解</div><div className="pixel" style={{ color: "var(--sage)" }}>{stats.correct}</div></div>
        <div><div className="jp text-[10px]" style={{ color: "var(--slate)" }}>不正解</div><div className="pixel" style={{ color: "var(--brick)" }}>{stats.wrong}</div></div>
        <div><div className="jp text-[10px]" style={{ color: "var(--slate)" }}>連続</div><div className="pixel" style={{ color: "var(--sky-deep)" }}>{stats.streak}</div></div>
      </div>
      {toast && (
        <div key={toast.id} className="milestone-toast fixed left-1/2 top-1/4 z-50 pointer-events-none" style={{ transform: "translateX(-50%)" }}>
          <div className="rpg-box p-1">
            <div className="rpg-inner-border px-4 py-2">
              <div className="pixel text-base md:text-xl whitespace-nowrap" style={{ color: toast.color, textShadow: "1px 1px 0 var(--paper)" }}>⭐ {toast.text}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// CSV の行 → 問題（1列目=問題、2列目=答え。1行目が見出しなら飛ばす）
function csvRowsToQuestions(data) {
  const rows = data.filter((r) => Array.isArray(r) && r.length >= 2 && String(r[0]).trim() && String(r[1]).trim());
  if (rows.length === 0) return [];
  const first = rows[0];
  const looksLikeHeader = /^(問題|質問|q|question)$/i.test(String(first[0]).trim()) || /^(答え|解答|a|answer)$/i.test(String(first[1]).trim());
  return (looksLikeHeader ? rows.slice(1) : rows).map((r) => ({ id: uid(), q: String(r[0]).trim(), a: String(r[1]).trim(), correct: 0, wrong: 0 }));
}
// ファイル名から年度（「令和6年度」「R6」「H30」「2024年度」など。番号の「01」は年度にしない）
const yearFromFileName = (fname) => { const m = fname.match(/(令和|平成|R|H)\s*\d{1,2}\s*年?度?|\d{4}\s*年度?/); return m ? m[0].trim() : ""; };
const parseCsvFile = (file) => new Promise((resolve) => Papa.parse(file, { complete: (res) => resolve(csvRowsToQuestions(res.data)), error: () => resolve(null) }));

// 取り込み・付け替えのとき、どの資格（世界）に入るかの表示。名前が無線らしいのに王都の世界なら注意
function QualDestNote({ state, qualId, names = [] }) {
  const q = (state.qualifications || []).find((x) => x.id === qualId);
  const w = worldOfQual(q);
  const radioLike = names.some((n) => /無線|陸特|電波|二陸|海特|航特/.test(n || ""));
  const warn = radioLike && w.id === "home";
  return (
    <div className="jp text-[11px] mb-2 px-2 py-1.5" style={{ borderRadius: 6, background: warn ? "rgba(201,86,78,0.1)" : "var(--cream)", border: `1px solid ${warn ? "#c9564e" : "var(--rule-soft)"}`, color: warn ? "#a24a45" : "var(--ink-soft)", lineHeight: 1.6 }}>
      {warn ? "⚠ 名前が無線の問題集のようですが、土地家屋調査士の側（王都の世界）に入ります。上で無線の資格を選んでください。" : q ? <>→ <b style={{ color: "var(--ink)" }}>{q.name}</b>（{w.icon} {w.name}）に入ります。ほかの資格の問題とはまざりません。</> : <>→ 資格に紐付けない問題集は、土地家屋調査士の側（王都の世界）に入ります。</>}
    </div>
  );
}
function ImportPanel({ state, onCancel, onImport }) {
  const [name, setName] = useState("");
  const [bulk, setBulk] = useState(null); // 複数のファイルをまとめて：[{key, name, year, questions, on, dup}]
  const [year, setYear] = useState("");
  const [qualId, setQualId] = useState(() => (chosenQual(state) ? mainQual(state).id : "")); // はじめは星詠みの書で選んでいる資格
  const [parsed, setParsed] = useState(null);
  const [err, setErr] = useState("");
  const [src, setSrc] = useState("csv"); // csv | paste（写真の文字を貼り付け）
  const [text, setText] = useState("");
  const [pmode, setPmode] = useState("auto");
  const fileRef = useRef(null);
  const splitText = (t = text, m = pmode) => {
    setErr("");
    const qs = parseQuickText(t, m).map((x) => ({ id: uid(), q: x.q, a: x.a, correct: 0, wrong: 0 }));
    if (!qs.length) { setErr("問題と答えに分けられませんでした。分け方を変えてみてください。"); setParsed(null); return; }
    setParsed(qs);
  };
  const editQ = (id, k, v) => setParsed((ps) => ps.map((x) => (x.id === id ? { ...x, [k]: v } : x)));
  const handleFile = async (file) => {
    setErr(""); setBulk(null);
    const questions = await parseCsvFile(file);
    if (questions === null) { setErr("CSVの読み込みに失敗しました。"); return; }
    if (questions.length === 0) { setErr("有効な問題が見つかりませんでした。1列目=問題、2列目=答えを確認してください。"); return; }
    setParsed(questions);
    if (!name) { const fname = file.name.replace(/\.csv$/i, ""); if (!year) setYear(yearFromFileName(fname)); setName(fname); }
  };
  // 複数のファイル：ファイル名の順に並べ、それぞれ問題集にする。同じ名前の問題集がすでにあるものは、最初は外しておく（二重に取り込まないように）
  const handleFiles = async (files) => {
    setErr(""); setParsed(null);
    const list = [...files].sort((a, b) => a.name.localeCompare(b.name, "ja", { numeric: true }));
    const have = new Set(state.questionBanks.map((b) => b.name));
    const out = [];
    for (const f of list) {
      const questions = await parseCsvFile(f);
      const nm = f.name.replace(/\.csv$/i, "");
      const dup = have.has(nm);
      out.push({ key: f.name, name: nm, year: yearFromFileName(nm), questions: questions || [], bad: !questions || !questions.length, on: !!(questions && questions.length) && !dup, dup });
    }
    setBulk(out);
  };
  const editBulk = (key, patch) => setBulk((bs) => bs.map((b) => (b.key === key ? { ...b, ...patch } : b)));
  const bulkOn = (bulk || []).filter((b) => b.on && !b.bad && b.name.trim());
  const confirmImport = () => {
    if (bulk) { bulkOn.forEach((b) => onImport({ id: uid(), name: b.name.trim(), year: b.year.trim() || null, qualId: qualId || null, questions: b.questions })); return; }
    if (!parsed || !name.trim()) return; onImport({ id: uid(), name: name.trim(), year: year.trim() || null, qualId: qualId || null, questions: parsed });
  };
  return (
    <Box title={src === "csv" ? "CSVをインポート" : "文章を貼り付けて問題を作る"} icon={<Upload size={18} />}>
      <div className="grid grid-cols-2 gap-1 p-1 mb-3" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 999 }}>
        {[["csv", "CSVファイル"], ["paste", "文章を貼り付け（写真から）"]].map(([id, l]) => <button key={id} onClick={() => { setSrc(id); setParsed(null); setBulk(null); setErr(""); }} className="jp py-1.5 text-[11px]" style={{ borderRadius: 999, border: "none", fontWeight: 700, cursor: "pointer", background: src === id ? "linear-gradient(180deg, #cfae62, #a8833a)" : "transparent", color: src === id ? "#fffdf6" : "var(--ink-soft)" }}>{l}</button>)}
      </div>
      {src === "paste" && (
        <div className="jp mb-3 space-y-2">
          <div className="text-[11px] leading-relaxed p-2" style={{ background: "var(--sky-pale)", border: "1px solid var(--rule-soft)", color: "var(--ink-soft)", borderRadius: 6 }}>
            📷 <b>写真から文字をコピーする方法</b><br />
            ・iPhone・iPad：カメラを問題集に向けるか写真を開き、右下の「テキスト認識」ボタン（四角に線のマーク）→ 文字を選んで「コピー」<br />
            ・Windows 11：Snipping Tool で画面を切り取り →「テキストアクション」→「すべてのテキストをコピー」<br />
            コピーした文字を下に貼り付けて「問題に分ける」を押してください。分けたあと、1問ずつ手直しできます。
          </div>
          <textarea className="rpg-input text-xs" rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder={"例）\n問1 地目の変更があったときは、1月以内に登記を申請しなければならない。\n答 ○\n問2 地積更正の登記には申請義務がある。\n答 ×"} />
          <div className="flex flex-wrap gap-1.5">
            {TEXT_IMPORT_MODES.map((m) => <button key={m.id} onClick={() => { setPmode(m.id); if (parsed) splitText(text, m.id); }} className="text-[11px] px-3 py-1" style={{ borderRadius: 999, border: `1px solid ${pmode === m.id ? "var(--gold)" : "var(--rule-soft)"}`, background: pmode === m.id ? "var(--cream)" : "var(--paper)", color: "var(--ink)", fontWeight: pmode === m.id ? 800 : 500, cursor: "pointer" }}>{m.name}</button>)}
          </div>
          <button onClick={() => splitText()} disabled={!text.trim()} className="btn-info w-full py-2 text-sm" style={{ opacity: text.trim() ? 1 : 0.5 }}>問題に分ける</button>
          <p className="text-[10px]" style={{ color: "var(--ink-mute)" }}>自動では「問1・(1)・①」などの番号、「答」で始まる行、行の終わりの（○）（×）を手がかりに分けます。うまくいかないときは、分け方を変えてください。</p>
        </div>
      )}
      {src === "csv" && (<>
      <div className="jp text-[11px] mb-3 leading-relaxed p-2" style={{ background: "var(--sky-pale)", border: "1px solid var(--rule-soft)", color: "var(--ink-soft)" }}>📋 対応形式（CSV）<br />1列目=問題、2列目=答え。1行目がヘッダーなら自動でスキップ。<br />📚 <b>いくつかまとめて選べます</b>（Ctrl や Shift を押しながら選ぶ。iPhone・iPad は「選択」から）。ファイル1つが問題集1つになり、名前はファイル名になります。</div>
      <input ref={fileRef} type="file" multiple accept=".csv,text/csv" onChange={(e) => { const fs = e.target.files; if (!fs || !fs.length) return; if (fs.length === 1) handleFile(fs[0]); else handleFiles(fs); }} className="jp w-full mb-2 text-sm file:mr-2 file:py-1 file:px-3 file:bg-yellow-600 file:text-white file:border-0 file:font-bold file:cursor-pointer" style={{ color: "var(--ink)" }} />
      </>)}
      {err && <div className="jp text-xs p-2 mb-2" style={{ background: "rgba(160,72,72,0.15)", border: "1px solid var(--brick)", color: "var(--brick)" }}>{err}</div>}
      {bulk && (
        <div className="jp mb-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="text-xs flex-1" style={{ color: "var(--sage)" }}>✓ {bulk.length}ファイルを読み込みました（取り込むのは ☑ の{bulkOn.length}つ・{bulkOn.reduce((t, b) => t + b.questions.length, 0)}問）</div>
            <button onClick={() => setBulk((bs) => bs.map((b) => ({ ...b, on: !b.bad })))} className="text-[10px] underline" style={{ background: "none", border: "none", color: "var(--ink-soft)", cursor: "pointer" }}>すべて選ぶ</button>
            <button onClick={() => setBulk((bs) => bs.map((b) => ({ ...b, on: false })))} className="text-[10px] underline" style={{ background: "none", border: "none", color: "var(--ink-soft)", cursor: "pointer" }}>すべて外す</button>
          </div>
          <div className="p-1.5 max-h-80 overflow-y-auto space-y-1" style={{ background: "var(--sky-pale)", border: "1px solid var(--rule-soft)" }}>
            {bulk.map((b) => (
              <div key={b.key} className="flex items-center gap-1.5 p-1" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 6, opacity: b.on ? 1 : 0.6 }}>
                <input type="checkbox" checked={b.on} disabled={b.bad} onChange={(e) => editBulk(b.key, { on: e.target.checked })} />
                <div className="flex-1" style={{ minWidth: 0 }}>
                  <input className="rpg-input text-[12px]" style={{ padding: "2px 6px" }} value={b.name} onChange={(e) => editBulk(b.key, { name: e.target.value })} />
                  <div className="text-[10px] mt-0.5" style={{ color: b.bad ? "var(--brick)" : "var(--ink-mute)" }}>
                    {b.bad ? "問題が見つかりません（1列目=問題、2列目=答え）" : `${b.questions.length}問`}
                    {b.year ? `・年度 ${b.year}` : ""}
                    {b.dup && <span style={{ color: "var(--brick)" }}>・同じ名前の問題集がもうあります</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {state.qualifications.length > 0 && (
            <>
              <label className="text-[10px] block mt-2 mb-1" style={{ color: "var(--ink-soft)" }}>紐付ける資格（全部に同じ資格を付けます）</label>
              <select className="rpg-input mb-2" value={qualId} onChange={(e) => setQualId(e.target.value)}>
                <option value="">— 資格に紐付けない —</option>
                {state.qualifications.map((q) => <option key={q.id} value={q.id}>{q.name}{q.acquired ? "（取得済）" : ""}</option>)}
              </select>
              <QualDestNote state={state} qualId={qualId} names={bulk.filter((b) => b.on).map((b) => b.name)} />
            </>
          )}
        </div>
      )}
      {parsed && (
        <>
          <div className="jp text-xs mb-2" style={{ color: "var(--sage)" }}>✓ {parsed.length}問を読み込みました</div>
          <label className="jp text-[10px] block mb-1" style={{ color: "var(--ink-soft)" }}>問題集の名前</label>
          <input className="rpg-input mb-2" placeholder="例: 過去問演習" value={name} onChange={(e) => setName(e.target.value)} />
          <label className="jp text-[10px] block mb-1" style={{ color: "var(--ink-soft)" }}>年度（任意）</label>
          <input className="rpg-input mb-2" placeholder="例: 令和5年度 / 2024年度" value={year} onChange={(e) => setYear(e.target.value)} />
          {state.qualifications.length > 0 && (
            <>
              <label className="jp text-[10px] block mb-1" style={{ color: "var(--ink-soft)" }}>紐付ける資格</label>
              <select className="rpg-input mb-2" value={qualId} onChange={(e) => setQualId(e.target.value)}>
                <option value="">— 資格に紐付けない —</option>
                {state.qualifications.map((q) => <option key={q.id} value={q.id}>{q.name}{q.acquired ? "（取得済）" : ""}</option>)}
              </select>
              <QualDestNote state={state} qualId={qualId} names={[name]} />
            </>
          )}
          {src === "paste" ? (
            <div className="p-2 mb-3 max-h-80 overflow-y-auto space-y-2" style={{ background: "var(--sky-pale)", border: "1px solid var(--rule-soft)" }}>
              <div className="jp text-[10px]" style={{ color: "var(--slate)" }}>分けた結果（{parsed.length}問）：そのまま直せます</div>
              {parsed.map((x, i) => (
                <div key={x.id} className="jp p-1.5" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 6 }}>
                  <div className="flex items-center text-[10px] mb-1" style={{ color: "var(--ink-mute)" }}><span className="flex-1">第{i + 1}問</span><button onClick={() => setParsed((ps) => ps.filter((y) => y.id !== x.id))} style={{ background: "none", border: "none", color: "var(--brick)", cursor: "pointer" }}>✕ 消す</button></div>
                  <textarea className="rpg-input text-xs mb-1" rows={2} value={x.q} onChange={(e) => editQ(x.id, "q", e.target.value)} />
                  <textarea className="rpg-input text-xs" rows={1} value={x.a} onChange={(e) => editQ(x.id, "a", e.target.value)} style={{ color: "var(--gold)" }} />
                </div>
              ))}
            </div>
          ) : (
          <div className="p-2 mb-3 max-h-32 overflow-y-auto" style={{ background: "var(--sky-pale)", border: "1px solid var(--rule-soft)" }}>
            <div className="jp text-[10px] mb-1" style={{ color: "var(--slate)" }}>プレビュー（最初の3問）:</div>
            {parsed.slice(0, 3).map((q, i) => (<div key={i} className="jp text-[11px] mb-1" style={{ color: "var(--ink)" }}>Q. {q.q}<br />A. <span style={{ color: "var(--gold)" }}>{q.a}</span></div>))}
          </div>
          )}
        </>
      )}
      <div className="flex gap-2">
        <button onClick={confirmImport} disabled={bulk ? !bulkOn.length : !parsed || !name.trim()} className="jp btn-primary flex-1 py-2">{bulk ? `${bulkOn.length}つの問題集をインポート` : "インポート"}</button>
        <button onClick={onCancel} className="jp btn-ghost px-4 py-2">キャンセル</button>
      </div>
    </Box>
  );
}

// ============ Cloze Creator (穴あき問題作成) ============
function ClozeCreator({ bank, question, addCloze, deleteCloze, onExit }) {
  const [text, setText] = useState(question.q);
  const [blanks, setBlanks] = useState([]); // {from, to, answer}
  const [selStart, setSelStart] = useState(null);
  const [selEnd, setSelEnd] = useState(null);
  const textRef = useRef(null);

  // Reset when question changes
  useEffect(() => { setText(question.q); setBlanks([]); setSelStart(null); setSelEnd(null); }, [question.id]);

  // Use selection from contenteditable-like approach: tap-to-select via splitting characters
  const [tapStart, setTapStart] = useState(null);
  const [tapEnd, setTapEnd] = useState(null);

  // Each character is a tappable span. Drag/tap range selection.
  const charClick = (i) => {
    if (tapStart === null || (tapStart !== null && tapEnd !== null)) {
      // Start new selection
      setTapStart(i);
      setTapEnd(null);
    } else {
      // Set end - ensure ordering
      const start = Math.min(tapStart, i);
      const end = Math.max(tapStart, i) + 1; // exclusive
      // Check overlap with existing blanks
      const overlap = blanks.some((b) => !(end <= b.from || start >= b.to));
      if (overlap) {
        alert("選択範囲が既存の穴と重なっています");
        setTapStart(null); setTapEnd(null);
        return;
      }
      const answer = text.slice(start, end);
      setBlanks([...blanks, { from: start, to: end, answer }]);
      setTapStart(null); setTapEnd(null);
    }
  };

  const removeBlank = (i) => setBlanks(blanks.filter((_, idx) => idx !== i));
  const resetSelection = () => { setTapStart(null); setTapEnd(null); };

  const save = () => {
    if (blanks.length === 0) { alert("穴を1つ以上作ってください"); return; }
    addCloze(bank.id, question.id, { text, blanks: [...blanks].sort((a, b) => a.from - b.from) });
    setBlanks([]); setTapStart(null); setTapEnd(null);
    alert("穴あき問題を保存しました");
  };

  // Render text as tappable spans
  const renderCharSpans = () => {
    const chars = [...text];
    return chars.map((ch, i) => {
      const inBlank = blanks.find((b) => i >= b.from && i < b.to);
      const inSel = tapStart !== null && (tapEnd !== null ? (i >= Math.min(tapStart, tapEnd) && i <= Math.max(tapStart, tapEnd)) : i === tapStart);
      let bg = "transparent", color = "var(--ink)", weight = "normal";
      if (inBlank) { bg = "var(--plum)"; color = "var(--paper)"; weight = "bold"; }
      else if (inSel) { bg = "var(--gold)"; color = "var(--paper)"; }
      return (
        <span key={i} onClick={() => !inBlank && charClick(i)} style={{ background: bg, color, fontWeight: weight, padding: "2px 1px", cursor: inBlank ? "default" : "pointer", borderRadius: "2px", display: "inline-block", minHeight: "1.5em", lineHeight: "1.5" }}>{ch === " " ? "\u00A0" : ch}</span>
      );
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <button onClick={onExit} className="jp text-xs flex items-center gap-1" style={{ color: "var(--ink-soft)" }}><XIcon size={14} /> 戻る</button>
        <div className="jp text-xs" style={{ color: "var(--plum)" }}>穴あき問題の作成</div>
      </div>
      <Box title="元の問題" icon={<BookOpen size={18} />}>
        <div className="jp text-[11px] mb-1" style={{ color: "var(--ink-soft)" }}>問題文</div>
        <div className="jp text-sm p-2 mb-2" style={{ background: "var(--sky-pale)", border: "1px solid var(--rule-soft)" }}>{question.q}</div>
        <div className="jp text-[11px] mb-1" style={{ color: "var(--gold)" }}>答え</div>
        <div className="jp text-sm p-2" style={{ background: "var(--sky-pale)", border: "1px solid var(--gold)" }}>{question.a}</div>
      </Box>

      <Box title="穴あけ操作" icon={<Pencil size={18} />}>
        <p className="jp text-[11px] mb-2 leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          ① 穴にしたい範囲の<b>最初の文字</b>をタップ → ② 範囲の<b>最後の文字</b>をタップ<br />
          連続でタップすると複数の穴を作れます。
        </p>
        <div className="p-3 mb-3 jp text-base" style={{ background: "var(--paper)", border: "1px solid var(--rule)", lineHeight: 2.0 }}>
          {renderCharSpans()}
        </div>
        {tapStart !== null && tapEnd === null && (
          <div className="jp text-[11px] mb-2 p-2" style={{ background: "rgba(184,134,44,0.10)", border: "1px solid var(--gold)", color: "var(--ink)" }}>
            開始位置を選択中。次に範囲の最後の文字をタップしてください。<button onClick={resetSelection} className="jp text-[10px] ml-2 underline" style={{ color: "var(--brick)" }}>キャンセル</button>
          </div>
        )}
        {blanks.length > 0 && (
          <div className="mb-3">
            <div className="jp text-[11px] mb-1" style={{ color: "var(--plum)" }}>作成中の穴 ({blanks.length})</div>
            <ul className="space-y-1">
              {[...blanks].sort((a, b) => a.from - b.from).map((b, i) => (
                <li key={i} className="flex items-center gap-2 p-1.5 jp text-[11px]" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)" }}>
                  <span className="px-1.5" style={{ background: "var(--plum)", color: "var(--paper)" }}>({i + 1})</span>
                  <span className="flex-1 break-words" style={{ color: "var(--ink)" }}>{b.answer}</span>
                  <button onClick={() => removeBlank(blanks.indexOf(b))} style={{ color: "var(--brick)" }}>🗑</button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="p-2 mb-3 jp text-[11px]" style={{ background: "var(--sky-pale)", border: "1px solid var(--rule-soft)" }}>
          <div className="mb-1" style={{ color: "var(--ink-soft)" }}>プレビュー:</div>
          <div style={{ color: "var(--ink)" }}>{renderClozePreview({ text, blanks })}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={save} disabled={blanks.length === 0} className="jp btn-primary flex-1 py-2 flex items-center justify-center gap-1"><Check size={14} /> 保存</button>
          <button onClick={() => { setBlanks([]); setTapStart(null); setTapEnd(null); }} className="jp btn-ghost px-4 py-2">クリア</button>
        </div>
      </Box>

      {(question.clozes || []).length > 0 && (
        <Box title="この問題の既存穴あき" icon={<ScrollIcon size={18} />}>
          <ul className="space-y-2">
            {question.clozes.map((c) => (
              <li key={c.id} className="p-2 jp text-[11px]" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)" }}>
                <div className="flex items-start gap-2">
                  <span className="flex-1 break-words" style={{ color: "var(--ink)" }}>{renderClozePreview(c)}</span>
                  <button onClick={() => { if (confirm("この穴あき問題を削除しますか？")) deleteCloze(bank.id, question.id, c.id); }} style={{ color: "var(--brick)" }}>🗑</button>
                </div>
                <div className="text-[10px] mt-1" style={{ color: "var(--ink-soft)" }}>◯{c.correct} ✕{c.wrong}</div>
              </li>
            ))}
          </ul>
        </Box>
      )}
    </div>
  );
}

// ============ Cloze Study Session (穴あき問題挑戦) ============
function ClozeStudySession({ bank, state, recordClozeAnswer, awardXp, startTimer, stopTimer, toggleClozeMark, onExit }) {
  const [config] = useState(() => window.__qaConfig || { random: true, retryWrong: true, useTimer: true });
  // Build list of cloze items: {qId, clozeId}
  const clozeItems = bank.questions.flatMap((q) => (q.clozes || []).map((c) => ({ qId: q.id, clozeId: c.id })));
  const [queue, setQueue] = useState([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [stats, setStats] = useState({ correct: 0, wrong: 0, totalAnswered: 0 });
  const [done, setDone] = useState(false);
  const timerStartedByMe = useRef(false);

  useEffect(() => {
    setQueue(config.random ? shuffle(clozeItems) : clozeItems);
    setShowAnswer(false); setDone(false);
    setStats({ correct: 0, wrong: 0, totalAnswered: 0 });
    if (config.useTimer && !state.timer.startMs) { startTimer(bank.qualId || null, "qa"); timerStartedByMe.current = true; }
  }, [bank.id]);

  const cleanupTimer = () => { if (timerStartedByMe.current && state.timer.autoMode === "qa") { stopTimer(); timerStartedByMe.current = false; } };
  const exitSession = () => { cleanupTimer(); onExit(); };

  const currentBank = state.questionBanks.find((b) => b.id === bank.id) || bank;
  const item = queue[0];
  const currentQ = item ? currentBank.questions.find((q) => q.id === item.qId) : null;
  const currentCloze = (item && currentQ) ? (currentQ.clozes || []).find((c) => c.id === item.clozeId) : null;

  const answer = (correct) => {
    if (!item || !currentCloze) return;
    recordClozeAnswer(bank.id, item.qId, item.clozeId, correct);
    setStats((s) => ({ correct: s.correct + (correct ? 1 : 0), wrong: s.wrong + (correct ? 0 : 1), totalAnswered: s.totalAnswered + 1 }));
    let newQueue = queue.slice(1);
    if (!correct && config.retryWrong) newQueue = [...newQueue, item];
    if (newQueue.length === 0) setTimeout(() => { cleanupTimer(); setDone(true); }, 600);
    setQueue(newQueue);
    setShowAnswer(false);
  };

  if (clozeItems.length === 0) {
    return (
      <Box title="穴あきモード" icon={<BookOpen size={18} />}>
        <div className="text-center py-4">
          <div className="text-4xl mb-2">📝</div>
          <p className="jp text-sm mb-3" style={{ color: "var(--ink)" }}>穴あき問題はまだない。<br />スタンプ画面から作成できます。</p>
          <button onClick={onExit} className="jp btn-primary px-6 py-2">戻る</button>
        </div>
      </Box>
    );
  }

  if (done) {
    const acc = stats.totalAnswered > 0 ? Math.round((stats.correct / stats.totalAnswered) * 100) : 0;
    return (
      <Box title="穴あき完了！" icon={<Award size={18} />}>
        <div className="text-center py-4">
          <div className="text-5xl mb-2">📝</div>
          <div className="jp text-base mb-3" style={{ color: "var(--ink)" }}>{bank.name}{bank.year && ` ・ ${bank.year}`}</div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <Stat label="正解" value={stats.correct} accent="var(--sage)" />
            <Stat label="不正解" value={stats.wrong} accent="var(--brick)" />
            <Stat label="正答率" value={`${acc}%`} accent="var(--gold)" />
          </div>
          <button onClick={exitSession} className="jp btn-primary w-full py-2">戻る</button>
        </div>
      </Box>
    );
  }

  if (!item || !currentCloze) return <Box title="穴あき"><p className="jp text-sm text-center py-4" style={{ color: "var(--ink-mute)" }}>問題がない</p></Box>;

  const answerDisplay = currentCloze.blanks.map((b, i) => `(${i + 1}) ${b.answer}`).join(" / ");

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <button onClick={exitSession} className="jp text-xs flex items-center gap-1" style={{ color: "var(--ink-soft)" }}><XIcon size={14} /> 終了</button>
        <div className="pixel text-xs" style={{ color: "var(--plum)" }}>📝 穴あき ・ 残り {queue.length}</div>
      </div>
      <div className="rpg-box p-1" style={{ borderColor: "var(--plum)" }}>
        <div className="rpg-inner-border min-h-[180px] flex flex-col" style={{ borderColor: "var(--plum)" }}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="jp text-[10px]" style={{ color: "var(--plum)" }}>穴あき問題（◯{currentCloze.correct} ✕{currentCloze.wrong}）</div>
            <button onClick={() => toggleClozeMark(bank.id, item.qId, item.clozeId)} className="text-base flex-shrink-0" title={currentCloze.marked ? "マーク解除" : "要復習"} style={{ color: currentCloze.marked ? "var(--gold)" : "var(--ink-mute)" }}>{currentCloze.marked ? "⭐" : "☆"}</button>
          </div>
          <div className="qtext jp text-base md:text-lg flex-1 break-words" style={{ color: "var(--ink)" }}>{renderClozePreview(currentCloze)}</div>
          {showAnswer ? (
            <>
              <div className="jp text-[10px] mt-3 mb-1" style={{ color: "var(--gold)" }}>答え</div>
              <div className="qtext jp text-base md:text-lg break-words p-2" style={{ background: "var(--sky-pale)", border: "1px solid var(--gold)", color: "var(--ink)" }}>{answerDisplay}</div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button onClick={() => answer(false)} className="jp btn-danger py-2 flex items-center justify-center gap-1"><XIcon size={16} /> 不正解</button>
                <button onClick={() => answer(true)} className="jp btn-success py-2 flex items-center justify-center gap-1"><Check size={16} /> 正解！</button>
              </div>
            </>
          ) : (
            <button onClick={() => setShowAnswer(true)} className="jp btn-info mt-3 py-2 flex items-center justify-center gap-1"><Eye size={16} /> 答えを見る</button>
          )}
        </div>
      </div>
      <div className="flex justify-around text-center">
        <div><div className="jp text-[10px]" style={{ color: "var(--slate)" }}>正解</div><div className="pixel" style={{ color: "var(--sage)" }}>{stats.correct}</div></div>
        <div><div className="jp text-[10px]" style={{ color: "var(--slate)" }}>不正解</div><div className="pixel" style={{ color: "var(--brick)" }}>{stats.wrong}</div></div>
      </div>
    </div>
  );
}

// ============ Mixed Study Session (一問一答 + 穴あき) ============
function MixedStudySession({ bank, state, recordAnswer, recordClozeAnswer, awardXp, startTimer, stopTimer, incrementBankClears, updateBestStreak, recordClearSnapshot, toggleQuestionMark, toggleClozeMark, onExit }) {
  const [battleKey] = useState(() => uid()); // バトル演出：この学習（セット）の識別
  const [config] = useState(() => window.__qaConfig || { random: true, retryWrong: true, useTimer: true });
  const items = [
    ...bank.questions.map((q) => ({ type: "q", qId: q.id })),
    ...bank.questions.flatMap((q) => (q.clozes || []).map((c) => ({ type: "cloze", qId: q.id, clozeId: c.id }))),
  ];
  const [queue, setQueue] = useState([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [stats, setStats] = useState({ correct: 0, wrong: 0, totalAnswered: 0 });
  const [done, setDone] = useState(false);
  const [stampPressed, setStampPressed] = useState(false);
  const timerStartedByMe = useRef(false);
  const completionRecorded = useRef(false);

  useEffect(() => {
    setQueue(config.random ? shuffle(items) : items);
    setShowAnswer(false); setDone(false);
    setStats({ correct: 0, wrong: 0, totalAnswered: 0 });
    completionRecorded.current = false;
    if (config.useTimer && !state.timer.startMs) { startTimer(bank.qualId || null, "qa"); timerStartedByMe.current = true; }
  }, [bank.id]);

  const cleanupTimer = () => { if (timerStartedByMe.current && state.timer.autoMode === "qa") { stopTimer(); timerStartedByMe.current = false; } };
  const exitSession = () => { cleanupTimer(); onExit(); };

  const currentBank = state.questionBanks.find((b) => b.id === bank.id) || bank;
  const item = queue[0];
  const currentQ = item ? currentBank.questions.find((q) => q.id === item.qId) : null;
  const currentCloze = (item && item.type === "cloze" && currentQ) ? (currentQ.clozes || []).find((c) => c.id === item.clozeId) : null;

  const answer = (correct, meta) => {
    if (!item || !currentQ) return;
    if (item.type === "cloze" && currentCloze) {
      recordClozeAnswer(bank.id, item.qId, item.clozeId, correct);
    } else {
      recordAnswer(bank.id, currentQ.id, correct, meta);
    }
    const newCorrect = stats.correct + (correct ? 1 : 0);
    const newWrong = stats.wrong + (correct ? 0 : 1);
    setStats({ correct: newCorrect, wrong: newWrong, totalAnswered: stats.totalAnswered + 1 });
    let newQueue = queue.slice(1);
    if (!correct && config.retryWrong) newQueue = [...newQueue, item];
    if (newQueue.length === 0) {
      setTimeout(() => {
        awardXp(XP_QA_COMPLETE);
        if (!completionRecorded.current) {
          incrementBankClears(bank.id);
          const acc = (newCorrect + newWrong) > 0 ? Math.round((newCorrect / (newCorrect + newWrong)) * 100) : 0;
          if (recordClearSnapshot) recordClearSnapshot(bank.id, { date: todayStr(), accuracy: acc, totalAns: newCorrect + newWrong, correct: newCorrect, wrong: newWrong });
          completionRecorded.current = true; setStampPressed(true);
        }
      }, 400);
      setTimeout(() => { cleanupTimer(); setDone(true); }, 1200);
    }
    setQueue(newQueue);
    setShowAnswer(false);
  };

  if (items.length === 0) return <Box title="ミックス"><p className="jp text-sm text-center py-4" style={{ color: "var(--ink-mute)" }}>問題がない</p></Box>;

  if (done) {
    const acc = stats.totalAnswered > 0 ? Math.round((stats.correct / stats.totalAnswered) * 100) : 0;
    return (
      <Box title="完全制覇！" icon={<Award size={18} />}>
        <BattleResult state={state} battleKey={battleKey} />
        <div className="text-center py-4">
          <div className="text-5xl mb-2">🏆</div>
          <div className="jp text-base mb-3" style={{ color: "var(--ink)" }}>{bank.name}{bank.year && ` ・ ${bank.year}`}（ミックス）</div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <Stat label="正解" value={stats.correct} accent="var(--sage)" />
            <Stat label="不正解" value={stats.wrong} accent="var(--brick)" />
            <Stat label="正答率" value={`${acc}%`} accent="var(--gold)" />
          </div>
          <button onClick={exitSession} className="jp btn-primary w-full py-2">戻る</button>
        </div>
      </Box>
    );
  }

  if (!item || !currentQ) return <Box title="ミックス"><p className="jp text-sm text-center py-4" style={{ color: "var(--ink-mute)" }}>問題がない</p></Box>;

  let displayQ, displayA, badge, isCloze;
  if (item.type === "cloze" && currentCloze) {
    displayQ = renderClozePreview(currentCloze);
    displayA = currentCloze.blanks.map((b, i) => `(${i + 1}) ${b.answer}`).join(" / ");
    badge = "穴あき";
    isCloze = true;
  } else {
    displayQ = renderQText(currentQ.q, currentQ.q_formats, currentQ.a);
    displayA = renderFormattedText(currentQ.a, currentQ.a_formats);
    badge = "一問一答";
    isCloze = false;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <button onClick={exitSession} className="jp text-xs flex items-center gap-1" style={{ color: "var(--ink-soft)" }}><XIcon size={14} /> 終了</button>
        <div className="pixel text-xs" style={{ color: "var(--gold)" }}>🎯 ミックス ・ 残り {queue.length}</div>
      </div>
      {!currentCloze && <BattleStage state={state} q={currentQ} bankName={currentBank && currentBank.name} battleKey={battleKey} />}
      <div className="rpg-box p-1">
        <div className="rpg-inner-border min-h-[180px] flex flex-col">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="jp text-[10px] px-1.5 py-0.5" style={{ background: isCloze ? "var(--plum)" : "var(--sky-deep)", color: "var(--paper)" }}>{badge}</div>
            {isCloze ? (
              <button onClick={() => toggleClozeMark(bank.id, item.qId, item.clozeId)} className="text-base" style={{ color: currentCloze.marked ? "var(--gold)" : "var(--ink-mute)" }}>{currentCloze.marked ? "⭐" : "☆"}</button>
            ) : (
              <button onClick={() => toggleQuestionMark(bank.id, currentQ.id)} className="text-base" style={{ color: currentQ.marked ? "var(--gold)" : "var(--ink-mute)" }}>{currentQ.marked ? "⭐" : "☆"}</button>
            )}
          </div>
          <div className="qtext jp text-base md:text-lg flex-1 break-words" style={{ color: "var(--ink)" }}>{displayQ}</div>
          {item.type === "q" && <QuestionImages bankId={bank.id} question={currentQ} side="q" />}
          {showAnswer ? (
            <>
              <div className="jp text-[10px] mt-3 mb-1" style={{ color: "var(--gold)" }}>答え</div>
              <div className="qtext jp text-base md:text-lg break-words p-2" style={{ background: "var(--sky-pale)", border: "1px solid var(--gold)", color: "var(--ink)" }}>{displayA}</div>
              {item.type === "q" && <QuestionImages bankId={bank.id} question={currentQ} side="a" />}
              {item.type === "q" && <LawRefChips q={currentQ} />}
              {item.type === "q" ? (
                <AnswerPanel onAnswer={answer} question={currentQ} srSettings={effectiveSr(state)} />
              ) : (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button onClick={() => answer(false)} className="jp btn-danger py-2 flex items-center justify-center gap-1"><XIcon size={16} /> 不正解</button>
                  <button onClick={() => answer(true)} className="jp btn-success py-2 flex items-center justify-center gap-1"><Check size={16} /> 正解！</button>
                </div>
              )}
            </>
          ) : (
            <RevealButton q={currentQ} onReveal={() => setShowAnswer(true)} />
          )}
        </div>
      </div>
      <div className="flex justify-around text-center">
        <div><div className="jp text-[10px]" style={{ color: "var(--slate)" }}>正解</div><div className="pixel" style={{ color: "var(--sage)" }}>{stats.correct}</div></div>
        <div><div className="jp text-[10px]" style={{ color: "var(--slate)" }}>不正解</div><div className="pixel" style={{ color: "var(--brick)" }}>{stats.wrong}</div></div>
      </div>
    </div>
  );
}

// ============ Cross-Year Revenge (全年度横断リベンジ) ============
function CrossYearRevengeSession({ qualId, state, recordRevengeAnswer, recordClozeRevengeAnswer, startTimer, stopTimer, onExit }) {
  const [battleKey] = useState(() => uid()); // バトル演出：この学習（セット）の識別
  // Collect all weakness items across banks for this qualId
  const buildItems = () => {
    const items = [];
    state.questionBanks.forEach((b) => {
      const matchKey = qualId === "_none_" ? !b.qualId : b.qualId === qualId;
      if (!matchKey) return;
      b.questions.forEach((q) => {
        if (isQuestionWeak(q)) {
          items.push({ type: "q", bankId: b.id, qId: q.id, bankName: b.name, year: b.year });
        }
        (q.clozes || []).forEach((c) => {
          if ((c.wrong > 0 && c.correct < c.wrong) || c.marked) {
            items.push({ type: "cloze", bankId: b.id, qId: q.id, clozeId: c.id, bankName: b.name, year: b.year });
          }
        });
      });
    });
    return items;
  };
  const initialItems = buildItems();
  const qual = state.qualifications.find((q) => q.id === qualId);
  const qualName = qual ? qual.name : "資格未設定";
  const [queue, setQueue] = useState([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [stats, setStats] = useState({ revenged: 0, stillWrong: 0 });
  const [done, setDone] = useState(false);
  const [toast, setToast] = useState(null);
  const timerStartedByMe = useRef(false);

  useEffect(() => {
    setQueue(shuffle(initialItems));
    setShowAnswer(false); setDone(false);
    setStats({ revenged: 0, stillWrong: 0 });
    if (!state.timer.startMs) { startTimer(qualId === "_none_" ? null : qualId, "qa"); timerStartedByMe.current = true; }
  }, [qualId]);

  const cleanupTimer = () => { if (timerStartedByMe.current && state.timer.autoMode === "qa") { stopTimer(); timerStartedByMe.current = false; } };
  const exitSession = () => { cleanupTimer(); onExit(); };
  const showToast = (text, color) => { setToast({ text, color, id: Date.now() }); setTimeout(() => setToast(null), 2200); };

  const item = queue[0];
  const currentBank = item ? state.questionBanks.find((b) => b.id === item.bankId) : null;
  const currentQ = (item && currentBank) ? currentBank.questions.find((q) => q.id === item.qId) : null;
  const currentCloze = (item && item.type === "cloze" && currentQ) ? (currentQ.clozes || []).find((c) => c.id === item.clozeId) : null;

  const answer = (correct, meta) => {
    if (!item || !currentQ) return;
    if (item.type === "cloze" && currentCloze) {
      recordClozeRevengeAnswer(item.bankId, item.qId, item.clozeId, correct);
    } else {
      recordRevengeAnswer(item.bankId, currentQ.id, correct, meta);
    }
    if (correct) { setStats((s) => ({ ...s, revenged: s.revenged + 1 })); showToast(`💪 +${XP_QA_REVENGE} EXP`, "var(--plum)"); }
    else { setStats((s) => ({ ...s, stillWrong: s.stillWrong + 1 })); }
    let newQueue = queue.slice(1);
    if (!correct) newQueue = [...newQueue, item];
    if (newQueue.length === 0) setTimeout(() => { cleanupTimer(); setDone(true); }, 600);
    setQueue(newQueue);
    setShowAnswer(false);
  };

  if (initialItems.length === 0) {
    return (
      <Box title="全年度横断リベンジ" icon={<Skull size={18} />}>
        <div className="text-center py-4">
          <div className="text-4xl mb-2">✨</div>
          <p className="jp text-sm mb-3" style={{ color: "var(--ink)" }}>{qualName}の苦手はないようだ。<br />すべて克服している！</p>
          <button onClick={onExit} className="jp btn-primary px-6 py-2">戻る</button>
        </div>
      </Box>
    );
  }

  if (done) {
    return (
      <Box title="横断リベンジ完了！" icon={<Award size={18} />}>
        <BattleResult state={state} battleKey={battleKey} />
        <div className="text-center py-4">
          <div className="text-5xl mb-2">🌟</div>
          <div className="jp text-base mb-1" style={{ color: "var(--ink)" }}>{qualName}</div>
          <div className="jp text-sm mb-3" style={{ color: "var(--plum)" }}>全年度の苦手を打ち倒した！</div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <Stat label="リベンジ成功" value={stats.revenged} accent="var(--plum)" />
            <Stat label="獲得EXP" value={stats.revenged * XP_QA_REVENGE} accent="var(--gold)" />
          </div>
          <button onClick={onExit} className="jp btn-primary w-full py-2">戻る</button>
        </div>
      </Box>
    );
  }

  if (!item || !currentQ) return <Box title="横断リベンジ"><p className="jp text-sm text-center py-4" style={{ color: "var(--ink-mute)" }}>問題がない</p></Box>;

  let displayQ, displayA, badge;
  if (item.type === "cloze" && currentCloze) {
    displayQ = renderClozePreview(currentCloze);
    displayA = currentCloze.blanks.map((b, i) => `(${i + 1}) ${b.answer}`).join(" / ");
    badge = `穴あき（◯${currentCloze.correct} ✕${currentCloze.wrong}）`;
  } else {
    displayQ = currentQ.q;
    displayA = currentQ.a;
    badge = `（◯${currentQ.correct} ✕${currentQ.wrong}）`;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <button onClick={exitSession} className="jp text-xs flex items-center gap-1" style={{ color: "var(--ink-soft)" }}><XIcon size={14} /> 終了</button>
        <div className="pixel text-xs" style={{ color: "var(--plum)" }}>💀 横断 ・ 残り {queue.length}</div>
      </div>
      <div className="text-center jp text-xs" style={{ color: "var(--plum)" }}>🌟 {qualName} 全年度の苦手</div>
      {!currentCloze && <BattleStage state={state} q={currentQ} bankName={currentBank && currentBank.name} battleKey={battleKey} />}
      <div className="rpg-box p-1" style={{ borderColor: "var(--plum)" }}>
        <div className="rpg-inner-border min-h-[180px] flex flex-col" style={{ borderColor: "var(--plum)" }}>
          <div className="jp text-[10px] mb-1 flex items-center gap-2 flex-wrap" style={{ color: "var(--plum)" }}>
            <span>{badge}</span>
            {item.year && <span className="px-1" style={{ background: "var(--gold)", color: "var(--paper)" }}>{item.year}</span>}
            <span>{item.bankName}</span>
          </div>
          <div className="qtext jp text-base md:text-lg flex-1 break-words" style={{ color: "var(--ink)" }}>{displayQ}</div>
          {item.type === "q" && <QuestionImages bankId={item.bankId} question={currentQ} side="q" />}
          {showAnswer ? (
            <>
              <div className="jp text-[10px] mt-3 mb-1" style={{ color: "var(--gold)" }}>答え</div>
              <div className="qtext jp text-base md:text-lg break-words p-2" style={{ background: "var(--sky-pale)", border: "1px solid var(--gold)", color: "var(--ink)" }}>{displayA}</div>
              {item.type === "q" && <QuestionImages bankId={item.bankId} question={currentQ} side="a" />}
              {item.type === "q" && <LawRefChips q={currentQ} />}
              {item.type === "q" ? (
                <AnswerPanel onAnswer={answer} wrongLabel="まだ難しい" correctLabel="倒した" sureClass="btn-plum" question={currentQ} srSettings={effectiveSr(state)} />
              ) : (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button onClick={() => answer(false)} className="jp btn-danger py-2 flex items-center justify-center gap-1"><XIcon size={16} /> まだ難しい</button>
                  <button onClick={() => answer(true)} className="jp btn-plum py-2 flex items-center justify-center gap-1"><Sword2 size={16} /> 倒した！</button>
                </div>
              )}
            </>
          ) : (
            <RevealButton q={currentQ} onReveal={() => setShowAnswer(true)} />
          )}
        </div>
      </div>
      <div className="flex justify-around text-center">
        <div><div className="jp text-[10px]" style={{ color: "var(--slate)" }}>リベンジ</div><div className="pixel" style={{ color: "var(--plum)" }}>{stats.revenged}</div></div>
        <div><div className="jp text-[10px]" style={{ color: "var(--slate)" }}>まだ苦手</div><div className="pixel" style={{ color: "var(--brick)" }}>{stats.stillWrong}</div></div>
      </div>
      {toast && (
        <div key={toast.id} className="milestone-toast fixed left-1/2 top-1/4 z-50 pointer-events-none" style={{ transform: "translateX(-50%)" }}>
          <div className="rpg-box p-1">
            <div className="rpg-inner-border px-4 py-2">
              <div className="pixel text-base md:text-xl whitespace-nowrap" style={{ color: toast.color, textShadow: "1px 1px 0 var(--paper)" }}>{toast.text}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 8・9. 問題の一括置換と、CSV の書き出し（問題タブ） ──
function BulkTools({ state }) {
  const [open, setOpen] = useState(null); // null | replace | csv
  const [from, setFrom] = useState(""), [to, setTo] = useState(""), [where, setWhere] = useState("both");
  const [bankId, setBankId] = useState(state.questionBanks[0] ? state.questionBanks[0].id : "");
  const [msg, setMsg] = useState("");
  const hits = [];
  if (open === "replace" && from) state.questionBanks.forEach((b) => (b.questions || []).forEach((q) => { const inQ = where !== "a" && String(q.q || "").includes(from), inA = where !== "q" && String(q.a || "").includes(from); if (inQ || inA) hits.push({ b, q, inQ, inA }); }));
  const hl = (t) => { const parts = String(t).split(from); return parts.map((x, i) => <span key={i}>{x}{i < parts.length - 1 && <><s style={{ color: "#c9564e" }}>{from}</s><b style={{ color: "var(--sage)" }}>{to}</b></>}</span>); };
  const apply = () => {
    if (!hits.length || !confirm(`${hits.length}問の「${from}」を「${to}」に置き換えます。よろしいですか？\n（念のため、先に画面上の「書出」で控えを取っておくと安心です）`)) return;
    window.dispatchEvent(new CustomEvent("sq-bulk-replace", { detail: { from, to, where } }));
    setMsg(`${hits.length}問を置き換えました。`); setFrom(""); setTo("");
  };
  const exportCsv = () => {
    const b = state.questionBanks.find((x) => x.id === bankId);
    if (!b) return;
    const csv = Papa.unparse([["問題", "答え", "メモ"], ...(b.questions || []).map((q) => [q.q || "", q.a || "", q.memo || ""])]);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${b.name}${b.year ? `_${b.year}` : ""}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    setMsg(`「${b.name}」を書き出しました（${(b.questions || []).length}問）。`);
  };
  const inp = { background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 6, color: "var(--ink)", padding: "5px 8px", fontSize: 13, width: "100%" };
  return (
    <div className="jp mb-2">
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => { setOpen(open === "replace" ? null : "replace"); setMsg(""); }} className="btn-ghost py-1.5 text-xs">🔁 言葉の一括置換</button>
        <button onClick={() => { setOpen(open === "csv" ? null : "csv"); setMsg(""); }} className="btn-ghost py-1.5 text-xs">📄 CSVで書き出す</button>
      </div>
      {open === "replace" && (
        <div className="mt-2 p-2 space-y-1.5" style={{ background: "var(--cream)", border: "1px solid var(--rule-soft)", borderRadius: 8 }}>
          <div className="grid grid-cols-2 gap-1.5"><input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="さがす言葉（例：1月）" style={inp} /><input value={to} onChange={(e) => setTo(e.target.value)} placeholder="置き換える言葉（例：1か月）" style={inp} /></div>
          <div className="flex gap-1.5 text-[11px]">{[["both", "問題と答え"], ["q", "問題だけ"], ["a", "答えだけ"]].map(([k, l]) => <button key={k} onClick={() => setWhere(k)} className="px-2.5 py-0.5" style={{ borderRadius: 999, border: `1px solid ${where === k ? "var(--gold)" : "var(--rule-soft)"}`, background: where === k ? "var(--paper)" : "transparent", color: "var(--ink)", fontWeight: where === k ? 800 : 500 }}>{l}</button>)}</div>
          {from && <div className="text-[11px]" style={{ color: "var(--ink-soft)" }}>見つかった問題：{hits.length}問（すべての問題集から）</div>}
          {hits.slice(0, 20).map(({ b, q, inQ, inA }) => <div key={q.id} className="text-[11px] py-1" style={{ borderTop: "1px dashed var(--rule-soft)", color: "var(--ink)" }}>{inQ && <div>問：{hl(q.q)}</div>}{inA && <div>答：{hl(q.a)}</div>}<div className="text-[9px]" style={{ color: "var(--ink-mute)" }}>{b.name}</div></div>)}
          {hits.length > 20 && <div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>ほか{hits.length - 20}問</div>}
          <button disabled={!hits.length || !from} onClick={apply} className="btn-danger w-full py-1.5 text-sm" style={{ opacity: hits.length ? 1 : 0.5 }}>{hits.length}問を置き換える</button>
          <p className="text-[10px]" style={{ color: "var(--ink-mute)" }}>学習の記録（正解数・復習の予定など）はそのままで、文字だけを置き換えます。</p>
        </div>
      )}
      {open === "csv" && (
        <div className="mt-2 p-2 space-y-1.5" style={{ background: "var(--cream)", border: "1px solid var(--rule-soft)", borderRadius: 8 }}>
          <select value={bankId} onChange={(e) => setBankId(e.target.value)} style={inp}>{state.questionBanks.map((b) => <option key={b.id} value={b.id}>{b.name}{b.year ? `（${b.year}）` : ""}・{(b.questions || []).length}問</option>)}</select>
          <button onClick={exportCsv} className="btn-primary w-full py-1.5 text-sm">この問題集を CSV で書き出す</button>
          <p className="text-[10px]" style={{ color: "var(--ink-mute)" }}>1列目＝問題、2列目＝答え、3列目＝メモ。Excel で直して「CSV・写真から追加」で取り込めます（取り込むと新しい問題集になり、学習の記録は引き継がれません）。</p>
        </div>
      )}
      {msg && <p className="text-[11px] mt-1 text-center" style={{ color: "var(--sage)", fontWeight: 800 }}>{msg}</p>}
    </div>
  );
}

function WeaknessListPanel({ state, onCrossRevenge }) {
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisQualId, setAnalysisQualId] = useState(null);
  const [openTopics, setOpenTopics] = useState({});

  // Collect weakness counts per qualification (auto + manual mark, both q and clozes)
  const summary = {};
  state.questionBanks.forEach((b) => {
    const key = b.qualId || "_none_";
    if (!summary[key]) summary[key] = { auto: 0, manual: 0, total: 0, unsure: 0, cw: 0, err: {} };
    b.questions.forEach((q) => {
      const isAutoWeak = isQuestionAutoWeak(q);
      if (isAutoWeak) summary[key].auto++;
      if (q.marked) summary[key].manual++;
      if (isAutoWeak || q.marked) summary[key].total++;
      if (q.lastConf === "unsure") summary[key].unsure++;
      if (q.lastConf === "wrongSure") summary[key].cw++;
      Object.entries(q.errTypes || {}).forEach(([et, v]) => { summary[key].err[et] = (summary[key].err[et] || 0) + v; });
      (q.clozes || []).forEach((c) => {
        const isClozeWeak = c.wrong > 0 && c.correct < c.wrong;
        if (isClozeWeak) summary[key].auto++;
        if (c.marked) summary[key].manual++;
        if (isClozeWeak || c.marked) summary[key].total++;
      });
    });
  });
  const keys = Object.keys(summary).filter((k) => summary[k].total > 0);
  if (keys.length === 0) return null;

  const runAnalysis = async (qualId) => {
    setAnalysisLoading(true);
    setAnalysisResult(null);
    setAnalysisQualId(qualId);
    try {
      // 2回以上間違えた問題を収集（最大100問）
      const weakQuestions = [];
      state.questionBanks
        .filter((b) => (b.qualId || "_none_") === qualId)
        .forEach((b) => {
          b.questions.forEach((q) => {
            if (weakQuestions.length >= 100) return;
            if (q.wrong >= 2 || q.lastConf === "wrongSure") {
              weakQuestions.push({
                err: formatErrTypes(q.errTypes),
                bank: b.name,
                q: (q.q || "").substring(0, 120),
                a: (q.a || "").substring(0, 80),
                wrong: q.wrong,
              });
            }
          });
        });

      if (weakQuestions.length === 0) {
        setAnalysisResult({ error: "2回以上間違えた問題がまだありません。" });
        setAnalysisLoading(false);
        return;
      }

      const qual = state.qualifications.find((qq) => qq.id === qualId);
      const qualName = qual ? qual.name : "資格未設定";
      const qList = weakQuestions.map(function(q, i) {
        return (i+1) + ". [" + q.bank + "] 問: " + q.q + " / 答: " + q.a + " (間違い" + q.wrong + "回" + (q.err ? "・原因:" + q.err : "") + ")";
      }).join("\n");
      const prompt = "あなたは資格試験の学習アドバイザーです。以下は「" + qualName + "」の試験で2回以上間違えた問題の一覧です（最大100問）。\n\nこれらの問題を分析し、どの法律・分野・論点が弱いかをJSON形式で返してください。\n\n問題一覧:\n" + qList + "\n\n以下のJSON形式のみで回答してください（前置き・説明不要）:\n{\n  \"topics\": [\n    {\n      \"大分類\": \"例: 不動産登記法\",\n      \"中分類\": \"例: 申請手続き\",\n      \"問題数\": 5,\n      \"例示\": \"代理申請・委任状など\"\n    }\n  ]\n}\n\n問題数が多い順に並べてください。大分類・中分類は問題文・解答から推測してください。";

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const text = (data.content || []).map((c) => c.text || "").join("");
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setAnalysisResult(parsed);
    } catch (e) {
      setAnalysisResult({ error: "分析中にエラーが発生しました。" });
    }
    setAnalysisLoading(false);
  };

  const toggleTopic = (idx) => setOpenTopics((prev) => ({ ...prev, [idx]: !prev[idx] }));

  return (
    <Box title="弱点リスト" icon={<Skull size={18} />}>
      <p className="jp text-[11px] mb-2" style={{ color: "var(--ink-soft)" }}>苦手 (不正解&gt;正解・自信なし正解・自信ありミス) と⭐手動マークを統合。資格ごとに横断リベンジできます。</p>
      <ul className="space-y-2">
        {keys.map((k) => {
          const qual = state.qualifications.find((qq) => qq.id === k);
          const name = qual ? qual.name : "資格未設定";
          const s = summary[k];
          return (
            <li key={k} className="p-2" style={{ background: "var(--paper)", border: `1px solid ${qual ? qual.color : "var(--slate)"}` }}>
              <div className="flex justify-between items-center gap-2 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="jp text-sm" style={{ color: "var(--ink)" }}>{name}</div>
                  <div className="pixel text-[10px]" style={{ color: "var(--ink-soft)" }}>
                    合計 {s.total} 件
                    {s.auto > 0 && <span style={{ color: "var(--brick)" }}> ・ 苦手 {s.auto}</span>}
                    {s.manual > 0 && <span style={{ color: "var(--gold)" }}> ・ ⭐{s.manual}</span>}
                  </div>
                  {(s.unsure > 0 || s.cw > 0) && (
                    <div className="jp text-[10px] mt-0.5" style={{ color: "var(--ink-soft)" }}>
                      {s.unsure > 0 && <span>△自信なし正解 {s.unsure}</span>}
                      {s.unsure > 0 && s.cw > 0 && " ・ "}
                      {s.cw > 0 && <span style={{ color: "var(--brick)" }}>💥自信ありミス {s.cw}</span>}
                    </div>
                  )}
                  {Object.keys(s.err).length > 0 && (() => {
                    const top = [...ERROR_TYPES].sort((a, b) => (s.err[b.id] || 0) - (s.err[a.id] || 0))[0];
                    return (
                      <div className="mt-1">
                        <div className="flex flex-wrap gap-1">
                          {ERROR_TYPES.filter((t) => s.err[t.id]).map((t) => (
                            <span key={t.id} className="jp text-[10px] px-1.5 py-0.5" style={{ background: "var(--cream)", border: "1px solid var(--rule-soft)", color: "var(--ink-soft)" }}>{t.icon}{t.label} {s.err[t.id]}</span>
                          ))}
                        </div>
                        <div className="jp text-[10px] mt-1" style={{ color: "var(--sky-deep)" }}>💡 最多は{top.icon}{top.label} → {top.advice}</div>
                      </div>
                    );
                  })()}
                </div>
                <div className="flex gap-1 flex-wrap justify-end">
                  <button
                    onClick={() => runAnalysis(k)}
                    disabled={analysisLoading && analysisQualId === k}
                    className="jp btn-sky px-2 py-1.5 text-[11px] flex items-center gap-1"
                  >
                    🔍 論点分析
                  </button>
                  <button onClick={() => onCrossRevenge(k)} className="jp btn-plum px-3 py-1.5 text-[11px] flex items-center gap-1"><Skull size={12} /> 横断リベンジ</button>
                </div>
              </div>

              {/* 論点分析結果 */}
              {analysisQualId === k && (
                <div className="mt-2 p-2" style={{ background: "var(--sky-pale)", border: "1px solid var(--sky-deep)", borderRadius: "2px" }}>
                  {analysisLoading && (
                    <p className="jp text-[11px] text-center" style={{ color: "var(--sky-deep)" }}>🤖 AIが弱点論点を分析中...</p>
                  )}
                  {analysisResult && analysisResult.error && (
                    <p className="jp text-[11px]" style={{ color: "var(--brick)" }}>{analysisResult.error}</p>
                  )}
                  {analysisResult && analysisResult.topics && (
                    <div>
                      <div className="jp text-[11px] font-bold mb-1" style={{ color: "var(--sky-deep)" }}>🔍 弱点論点レポート</div>
                      <ul className="space-y-1">
                        {analysisResult.topics.map((t, idx) => (
                          <li key={idx}>
                            <button
                              onClick={() => toggleTopic(idx)}
                              className="w-full flex items-center gap-2 text-left jp text-[11px] py-1"
                              style={{ background: "none", border: "none", cursor: "pointer" }}
                            >
                              <span style={{ color: "var(--ink-mute)" }}>{openTopics[idx] ? "▼" : "▶"}</span>
                              <span style={{ color: "var(--ink)", fontWeight: "bold" }}>{t["大分類"]}</span>
                              <span style={{ color: "var(--ink-soft)" }}>›</span>
                              <span style={{ color: "var(--ink-soft)" }}>{t["中分類"]}</span>
                              <span className="ml-auto px-1.5 py-0.5 pixel text-[9px]" style={{ background: "var(--brick)", color: "var(--paper)" }}>{t["問題数"]}問</span>
                            </button>
                            {openTopics[idx] && t["例示"] && (
                              <div className="jp text-[10px] pl-5 pb-1" style={{ color: "var(--ink-mute)" }}>
                                例: {t["例示"]}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Box>
  );
}

// ============ Accuracy Chart (正答率の推移) ============
function AccuracyChart({ history }) {
  if (!history || history.length === 0) return <p className="jp text-xs text-center py-2" style={{ color: "var(--ink-mute)" }}>記録がまだない</p>;
  const W = 300, H = 120, P = 20;
  const points = history.map((h, i) => ({ x: history.length === 1 ? W / 2 : P + (i / (history.length - 1)) * (W - P * 2), y: H - P - (h.accuracy / 100) * (H - P * 2), acc: h.accuracy }));
  const path = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
  const avg = Math.round(history.reduce((a, h) => a + h.accuracy, 0) / history.length);
  return (
    <div className="p-2" style={{ background: "var(--sky-pale)", border: "1px solid var(--rule-soft)" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }} preserveAspectRatio="xMidYMid meet">
        {/* Grid lines at 0, 50, 100% */}
        {[0, 50, 100].map((v) => {
          const y = H - P - (v / 100) * (H - P * 2);
          return <g key={v}><line x1={P} y1={y} x2={W - P} y2={y} stroke="var(--rule-soft)" strokeWidth="0.5" strokeDasharray="2 2" /><text x={4} y={y + 3} fontSize="9" fill="var(--ink-mute)">{v}</text></g>;
        })}
        {/* Average line */}
        <line x1={P} y1={H - P - (avg / 100) * (H - P * 2)} x2={W - P} y2={H - P - (avg / 100) * (H - P * 2)} stroke="var(--gold)" strokeWidth="0.7" strokeDasharray="3 2" opacity="0.6" />
        {/* Path */}
        <path d={path} fill="none" stroke="var(--sky-deep)" strokeWidth="2" />
        {/* Points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="var(--sky-deep)" stroke="var(--paper)" strokeWidth="1" />
            <text x={p.x} y={p.y - 8} fontSize="9" fill="var(--sky-deep)" textAnchor="middle" fontWeight="bold">{p.acc}%</text>
            <text x={p.x} y={H - 5} fontSize="8" fill="var(--ink-mute)" textAnchor="middle">#{i + 1}</text>
          </g>
        ))}
      </svg>
      <div className="pixel text-[10px] mt-1 text-right" style={{ color: "var(--ink-soft)" }}>{history.length}周分 ・ 平均 {avg}%</div>
    </div>
  );
}

// ============ Question Format Editor (書式設定エディタ) ============
function QuestionFormatEditor({ bank, question, updateQuestionFormats, onExit }) {
  const [tab, setTab] = useState("q");
  const [qFormats, setQFormats] = useState([...(question.q_formats || [])]);
  const [aFormats, setAFormats] = useState([...(question.a_formats || [])]);
  const [tapStart, setTapStart] = useState(null);
  // pendingFormat: {type, color?}
  const [pendingFormat, setPendingFormat] = useState({ type: 'highlight', color: '#FFE082' });

  const HIGHLIGHT_COLORS = [
    { color: '#FFE082', label: '黄' },
    { color: '#A5D6A7', label: '緑' },
    { color: '#81D4FA', label: '水' },
    { color: '#F48FB1', label: '赤' },
    { color: '#FFCC80', label: '橙' },
    { color: '#CE93D8', label: '紫' },
  ];

  const currentText = tab === "q" ? question.q : question.a;
  const currentFormats = tab === "q" ? qFormats : aFormats;
  const setCurrentFormats = tab === "q" ? setQFormats : setAFormats;

  const charClick = (i) => {
    if (tapStart === null) {
      setTapStart(i);
    } else {
      const from = Math.min(tapStart, i);
      const to = Math.max(tapStart, i) + 1;
      const overlap = currentFormats.some((f) => !(to <= f.from || from >= f.to));
      if (overlap) { alert("既に書式が設定されている範囲です"); setTapStart(null); return; }
      setCurrentFormats([...currentFormats, { from, to, type: pendingFormat.type, color: pendingFormat.color }]);
      setTapStart(null);
    }
  };

  const removeFormat = (f) => setCurrentFormats(currentFormats.filter((x) => x !== f));
  const clearAll = () => { setCurrentFormats([]); setTapStart(null); };
  const save = () => { updateQuestionFormats(bank.id, question.id, qFormats, aFormats); onExit(); };

  const fmtStyle = (f) => {
    if (f.type === 'highlight') return { background: f.color || '#FFE082', color: 'inherit' };
    if (f.type === 'bold') return { fontWeight: 'bold', background: 'rgba(53,65,86,0.08)' };
    if (f.type === 'underline') return { textDecoration: 'underline', background: 'rgba(53,65,86,0.08)' };
    return {};
  };

  const fmtIcon = (f) => {
    if (f.type === 'bold') return '𝐁';
    if (f.type === 'underline') return 'U̲';
    return <span style={{ display:'inline-block', width:12, height:12, borderRadius:2, background: f.color||'#FFE082', border:'1px solid rgba(0,0,0,0.15)' }} />;
  };

  const isActiveFmt = (type, color) => {
    if (type === 'highlight') return pendingFormat.type === 'highlight' && pendingFormat.color === color;
    return pendingFormat.type === type;
  };

  const renderCharSpans = () => {
    if (!currentText) return <span className="jp text-xs" style={{ color: "var(--ink-mute)" }}>テキストがありません</span>;
    return [...currentText].map((ch, i) => {
      const fmt = currentFormats.find((f) => i >= f.from && i < f.to);
      const isSelStart = tapStart === i;
      let style = { padding: '2px 1px', cursor: fmt ? 'default' : 'pointer', borderRadius: '2px', display: 'inline-block', minHeight: '1.5em', lineHeight: 1.6, userSelect: 'none' };
      if (fmt) style = { ...style, ...fmtStyle(fmt) };
      else if (isSelStart) style = { ...style, background: 'var(--gold)', color: 'var(--paper)' };
      return (
        <span key={i} onClick={() => !fmt && charClick(i)} style={style}>
          {ch === ' ' ? '\u00A0' : ch}
        </span>
      );
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <button onClick={onExit} className="jp text-xs flex items-center gap-1" style={{ color: "var(--ink-soft)" }}><XIcon size={14} /> 戻る</button>
        <div className="jp text-xs" style={{ color: "var(--plum)" }}>✏ 書式設定</div>
      </div>
      <div className="grid grid-cols-2 gap-1">
        <button onClick={() => { setTab("q"); setTapStart(null); }} className="jp py-1.5 text-sm" style={{ background: tab === "q" ? "var(--sky-deep)" : "var(--paper)", color: tab === "q" ? "var(--paper)" : "var(--ink)", border: "1px solid var(--rule)" }}>問題文</button>
        <button onClick={() => { setTab("a"); setTapStart(null); }} className="jp py-1.5 text-sm" style={{ background: tab === "a" ? "var(--gold)" : "var(--paper)", color: tab === "a" ? "var(--paper)" : "var(--ink)", border: "1px solid var(--rule)" }}>解答文</button>
      </div>
      <Box title={tab === "q" ? "問題文の書式設定" : "解答文の書式設定"} icon={<Pencil size={18} />}>
        <div className="jp text-[11px] mb-2" style={{ color: "var(--ink-soft)" }}>① 書式を選ぶ → ② 範囲の最初の文字をタップ → ③ 範囲の最後の文字をタップ</div>

        {/* ハイライトカラー */}
        <div className="jp text-[10px] mb-1" style={{ color: "var(--ink-mute)" }}>マーカー（ハイライト）</div>
        <div className="flex gap-1.5 mb-2 flex-wrap">
          {HIGHLIGHT_COLORS.map(({ color, label }) => (
            <button key={color} onClick={() => { setPendingFormat({ type: 'highlight', color }); setTapStart(null); }}
              title={label}
              style={{
                width: 32, height: 32, borderRadius: 4, background: color,
                border: isActiveFmt('highlight', color) ? '3px solid var(--sky-deep)' : '2px solid rgba(0,0,0,0.15)',
                cursor: 'pointer', flexShrink: 0, boxSizing: 'border-box',
                boxShadow: isActiveFmt('highlight', color) ? '0 0 0 2px var(--paper), 0 0 0 4px var(--sky-deep)' : 'none',
              }} />
          ))}
        </div>

        {/* 太字・下線 */}
        <div className="jp text-[10px] mb-1" style={{ color: "var(--ink-mute)" }}>テキスト装飾</div>
        <div className="flex gap-1.5 mb-3">
          {[
            { type: 'bold',      label: '𝐁 太字' },
            { type: 'underline', label: 'U̲ 下線' },
          ].map(({ type, label }) => (
            <button key={type} onClick={() => { setPendingFormat({ type }); setTapStart(null); }} className="jp px-4 py-1.5 text-[11px]"
              style={{ background: isActiveFmt(type) ? "var(--sky-deep)" : "var(--paper)", color: isActiveFmt(type) ? "var(--paper)" : "var(--ink)", border: `2px solid ${isActiveFmt(type) ? "var(--sky-deep)" : "var(--rule-soft)"}` }}>{label}</button>
          ))}
        </div>

        {tapStart !== null && (
          <div className="jp text-[11px] mb-2 p-1.5" style={{ background: 'rgba(184,134,44,0.10)', border: '1px solid var(--gold)' }}>
            開始位置を選択中。次に終わりの文字をタップ。
            <button onClick={() => setTapStart(null)} className="jp text-[10px] ml-2 underline" style={{ color: "var(--brick)" }}>キャンセル</button>
          </div>
        )}
        <div className="p-3 mb-3 jp text-base" style={{ background: "var(--paper)", border: "1px solid var(--rule)", lineHeight: 2.2, wordBreak: "break-all" }}>
          {renderCharSpans()}
        </div>
        {currentFormats.length > 0 && (
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <div className="jp text-[11px]" style={{ color: "var(--ink-soft)" }}>設定済み ({currentFormats.length})</div>
              <button onClick={clearAll} className="jp text-[10px] px-2 py-0.5" style={{ color: "var(--brick)", border: "1px solid var(--rule-soft)" }}>全てクリア</button>
            </div>
            <ul className="space-y-1">
              {[...currentFormats].sort((a, b) => a.from - b.from).map((f, i) => (
                <li key={i} className="flex items-center gap-2 p-1.5 jp text-[11px]" style={{ background: "var(--sky-pale)", border: "1px solid var(--rule-soft)" }}>
                  <span className="flex-shrink-0 flex items-center">{fmtIcon(f)}</span>
                  <span className="flex-1 break-words" style={{ color: "var(--ink)", ...fmtStyle(f) }}>{currentText.slice(f.from, f.to)}</span>
                  <button onClick={() => removeFormat(f)} style={{ color: "var(--brick)", flexShrink: 0 }}>🗑</button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mb-3 p-2" style={{ background: "var(--sky-pale)", border: "1px solid var(--rule-soft)" }}>
          <div className="jp text-[10px] mb-1" style={{ color: "var(--ink-soft)" }}>プレビュー</div>
          <div className="jp text-sm break-words">{renderFormattedText(currentText, currentFormats)}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={save} className="jp btn-primary flex-1 py-2 flex items-center justify-center gap-1"><Check size={14} /> 保存</button>
          <button onClick={onExit} className="jp btn-ghost px-4 py-2">キャンセル</button>
        </div>
      </Box>
    </div>
  );
}

export { QBankTab };
