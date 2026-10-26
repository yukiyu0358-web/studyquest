// TrainingRoom とその部品（2026-10-26、App.jsx から切り出し。開いたときに読み込む）
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
import { ALLIES, ART_URL, AnswerPanel, Box, LAWS, LAW_BY_KEY, LawArticleModal, REHEARSAL_DEFAULT, RehearsalRun, TRAP_MARK, alliesJoined, buildPoolFromBanks, choiceOf, effectiveSr, lawRefCounts, lawsInScope, loadLaw, mainQual, markTraps, normRpg, passPower, rehearsalCfg, renderFormattedText, renderQText, shuffle, shuffleArr, worldOfQual } from "../App.jsx";

function RehearsalCard({ state, pp, actions, onStart }) {
  const rh = normRpg(state.rpg).rehearsal;
  const cfg = rehearsalCfg(state);
  const [edit, setEdit] = useState(null);
  const banks = pp.regions.flatMap((g) => g.banks);
  const all = banks.flatMap((b) => (b.questions || []).filter((q) => !q.excluded).map((q) => ({ bankId: b.id, bankName: b.name, qId: q.id })));
  const ok = all.length >= 20;
  const go = (full) => onStart({ full, minutes: full ? 150 : 50, pool: shuffleArr(all).slice(0, 20) });
  const fulls = rh.log.filter((e) => e.full).slice(-10);
  const W = 300, H = 110, top = 100;
  const yOf = (v) => H - 14 - (v / top) * (H - 24);
  return (
    <Box title="本番リハーサル" icon={<GameIcon ch="🗝️" painted="c25" size={24} />}>
      <p className="jp text-[11px] mb-2" style={{ color: "var(--ink-soft)" }}>本番（午後の部）と同じ形で、時間を計って解きます。択一20問のあと、書式（記述2問）は手元の問題を紙で解いて自己採点を入れてください。択一の基準点・記述の基準点・合格点の3つで判定します。</p>
      <div className="grid grid-cols-2 gap-2">
        <button disabled={!ok} onClick={() => go(true)} className="jp btn-primary py-2 px-1" style={{ opacity: ok ? 1 : 0.45 }}>
          <div className="text-sm" style={{ fontWeight: 800 }}>本番と同じ</div>
          <div className="text-[10px]" style={{ opacity: 0.9 }}>択一20問＋記述・2時間30分</div>
        </button>
        <button disabled={!ok} onClick={() => go(false)} className="jp btn-ghost py-2 px-1" style={{ opacity: ok ? 1 : 0.45 }}>
          <div className="text-sm" style={{ fontWeight: 800 }}>択一だけ</div>
          <div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>20問・50分</div>
        </button>
      </div>
      {!ok && <p className="jp text-[10px] mt-1" style={{ color: "var(--brick)" }}>目標の資格の問題が20問以上必要です。</p>}
      <div className="jp text-[10px] mt-2 flex items-center gap-2" style={{ color: "var(--ink-mute)" }}>
        <span className="flex-1">判定の線：択一 {cfg.mcBase}点・記述 {cfg.descBase}点・合格点 {cfg.pass}点（各50点・合計100点）</span>
        <button onClick={() => setEdit(edit ? null : { ...cfg })} className="btn-ghost text-[10px] px-2 py-0.5">{edit ? "閉じる" : "変える"}</button>
      </div>
      {edit && (
        <div className="jp mt-2 p-2 space-y-2" style={{ background: "var(--cream)", border: "1px solid var(--rule-soft)", borderRadius: 8 }}>
          <div className="grid grid-cols-3 gap-2">
            {[["mcBase", "択一の基準点"], ["descBase", "記述の基準点"], ["pass", "合格点"]].map(([k, l]) => (
              <label key={k} className="text-[10px]" style={{ color: "var(--ink-soft)" }}>{l}<input type="number" inputMode="decimal" step="0.5" className="rpg-input mt-0.5" value={edit[k]} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} /></label>
            ))}
          </div>
          <p className="text-[10px]" style={{ color: "var(--ink-mute)" }}>毎年、法務省が発表する「基準点等について」の数字に合わせると、本番に近い判定になります。</p>
          <div className="flex gap-2">
            <button onClick={() => { actions.setRehearsalCfg({ mcBase: Number(edit.mcBase) || REHEARSAL_DEFAULT.mcBase, descBase: Number(edit.descBase) || REHEARSAL_DEFAULT.descBase, pass: Number(edit.pass) || REHEARSAL_DEFAULT.pass }); setEdit(null); }} className="btn-primary flex-1 py-1.5 text-xs">保存</button>
            <button onClick={() => setEdit({ ...REHEARSAL_DEFAULT })} className="btn-ghost px-3 py-1.5 text-xs">初期値に戻す</button>
          </div>
        </div>
      )}
      {rh.log.length > 0 && (
        <div className="jp mt-3 pt-3" style={{ borderTop: "1px dashed var(--rule-soft)" }}>
          <div className="text-[10px] mb-1" style={{ color: "var(--ink-soft)" }}>時間帯ごとの成績</div>
          <RehearsalBands log={rh.log} />
          {fulls.length > 0 && (<>
            <div className="text-[10px] mb-1" style={{ color: "var(--ink-soft)" }}>合計点の推移（本番と同じ形・直近10回）</div>
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }} aria-label="合計点の推移">
              <line x1="24" x2={W - 4} y1={yOf(cfg.pass)} y2={yOf(cfg.pass)} stroke="#b08a3e" strokeDasharray="4 3" />
              <text x={W - 4} y={yOf(cfg.pass) - 3} fontSize="9" textAnchor="end" fill="#b08a3e">合格点 {cfg.pass}</text>
              {[0, 50, 100].map((v) => <text key={v} x="20" y={yOf(v) + 3} fontSize="8" textAnchor="end" fill="var(--ink-mute)">{v}</text>)}
              {fulls.map((e, i) => { const bw = (W - 40) / 10, x = 28 + i * bw; const y = yOf(e.total); return (
                <g key={e.id}><rect x={x} y={y} width={bw - 6} height={H - 14 - y} rx="2" fill={e.pass ? "#d6b56a" : "#9fb3d1"} /><text x={x + (bw - 6) / 2} y={y - 2} fontSize="8" textAnchor="middle" fill="var(--ink)">{e.total}</text><text x={x + (bw - 6) / 2} y={H - 3} fontSize="7" textAnchor="middle" fill="var(--ink-mute)">{Number(e.d.slice(5, 7))}/{Number(e.d.slice(8, 10))}</text></g>); })}
            </svg>
          </>)}
          {(() => { const sp = rh.log.filter((e) => e.full && e.split && (e.split.land || e.split.bldg)).slice(-5); if (!sp.length) return null; const av = (k) => Math.round(sp.reduce((t, e) => t + (e.split[k] || 0), 0) / sp.length); const a = { mc: av("mc"), land: av("land"), bldg: av("bldg") }; const tot = Math.max(1, a.mc + a.land + a.bldg); return (
            <div className="mt-2">
              <div className="text-[10px] mb-1" style={{ color: "var(--ink-soft)" }}>時間配分（本番形式・直近{sp.length}回の平均）</div>
              <div className="flex" style={{ height: 14, borderRadius: 4, overflow: "hidden", border: "1px solid var(--rule-soft)" }}>{[["mc", "択一", "#9fb3d1"], ["land", "土地", "#d6b56a"], ["bldg", "建物", "#6d8454"]].map(([k, l, c]) => <div key={k} title={`${l} ${a[k]}分`} style={{ width: `${(a[k] / tot) * 100}%`, background: c }} />)}</div>
              <div className="text-[10px] mt-0.5" style={{ color: "var(--ink-mute)" }}>択一 {a.mc}分・土地 {a.land}分・建物 {a.bldg}分{a.mc > 60 ? "　→ 択一に時間をかけすぎて、記述の時間が足りなくなりがちです" : a.land > 60 || a.bldg > 60 ? "　→ 記述の1問に60分を超えています。先に申請書の骨格（目的・原因・添付）を書く練習を" : ""}</div>
            </div>
          ); })()}
          <div className="text-[10px] mt-1 mb-1" style={{ color: "var(--ink-soft)" }}>最近の記録</div>
          {[...rh.log].reverse().slice(0, 5).map((e) => (
            <div key={e.id} className="flex items-center gap-2 text-[11px] py-0.5">
              <span style={{ color: "var(--ink-mute)", minWidth: 36 }}>{Number(e.d.slice(5, 7))}/{Number(e.d.slice(8, 10))}</span>
              <span style={{ fontWeight: 700 }}>{e.full ? "本番形式" : "択一のみ"}</span>
              <span className="flex-1" style={{ color: "var(--ink-soft)" }}>択一{e.mc}{e.full ? `・記述${e.desc}・計${e.total}` : ""}（{e.split && (e.split.land || e.split.bldg) ? `択一${e.split.mc}・土地${e.split.land}・建物${e.split.bldg}分` : `${e.min}分`}）</span>
              <span style={{ color: e.pass ? "var(--gold)" : "var(--ink-mute)", fontWeight: 800 }}>{e.pass ? "合格ライン" : "あと一歩"}</span>
            </div>
          ))}
        </div>
      )}
    </Box>
  );
}

// ── 書式の鍛錬場：記述式（書式）の練習を記録する。rpg.shoshiki = [{id, d, kind, min, score, max, miss:[], memo}] ──
const SHOSHIKI_KINDS = ["土地", "建物", "区分建物", "その他"];
const SHOSHIKI_MISS = ["計算ミス", "図面・作図", "申請書の記載", "登記の目的・原因", "添付情報", "読み落とし", "時間切れ", "その他"];
function ShoshikiDojo({ state, actions }) {
  const list = normRpg(state.rpg).shoshiki || [];
  const [kind, setKind] = useState("土地");
  const [min, setMin] = useState("");
  const [score, setScore] = useState("");
  const [max, setMax] = useState("25");
  const [miss, setMiss] = useState([]);
  const [memo, setMemo] = useState("");
  const [msg, setMsg] = useState("");
  const recent = list.slice(-10);
  const avg = (f) => (recent.length ? recent.reduce((a, e) => a + f(e), 0) / recent.length : 0);
  const missCount = {};
  list.slice(-30).forEach((e) => (e.miss || []).forEach((m) => { missCount[m] = (missCount[m] || 0) + 1; }));
  const missRank = Object.entries(missCount).sort((a, b) => b[1] - a[1]);
  const maxMiss = missRank.length ? missRank[0][1] : 1;
  const submit = () => {
    const sc = Number(score), mx = Number(max) || 25;
    if (!(sc >= 0) || score === "") { setMsg("点数を入れてください"); return; }
    const m = actions.logShoshiki({ kind, min: Number(min) || 0, score: Math.min(sc, mx), max: mx, miss, memo: memo.trim() });
    setMsg(m); SFX.play("forgeOk");
    setMin(""); setScore(""); setMiss([]); setMemo("");
    setTimeout(() => setMsg(""), 3500);
  };
  const chip = (on) => ({ borderRadius: 999, border: `1px solid ${on ? "var(--gold)" : "var(--rule-soft)"}`, background: on ? "var(--cream)" : "var(--paper)", color: "var(--ink)", fontWeight: on ? 800 : 500, cursor: "pointer" });
  return (
    <Box title="書式の鍛錬場（記述式の記録）" icon={<GameIcon ch="📖" painted="c04" size={24} />}>
      <p className="jp text-[11px] mb-2" style={{ color: "var(--ink-soft)" }}>書式の問題を解いたら、時間と自己採点、ミスの種類を記録しましょう。記録するたびにEXPと書式の欠片、8割以上なら星霊石も手に入ります。</p>
      <div className="jp space-y-2">
        <div className="flex flex-wrap gap-1.5">{SHOSHIKI_KINDS.map((k) => <button key={k} onClick={() => setKind(k)} className="text-xs px-3 py-1" style={chip(kind === k)}>{k}</button>)}</div>
        <div className="grid grid-cols-3 gap-2">
          <label className="text-[10px]" style={{ color: "var(--ink-soft)" }}>かかった時間（分）<input type="number" inputMode="numeric" className="rpg-input mt-0.5" value={min} onChange={(e) => setMin(e.target.value)} placeholder="例：45" /></label>
          <label className="text-[10px]" style={{ color: "var(--ink-soft)" }}>点数<input type="number" inputMode="decimal" className="rpg-input mt-0.5" value={score} onChange={(e) => setScore(e.target.value)} placeholder="例：19" /></label>
          <label className="text-[10px]" style={{ color: "var(--ink-soft)" }}>満点<input type="number" inputMode="numeric" className="rpg-input mt-0.5" value={max} onChange={(e) => setMax(e.target.value)} /></label>
        </div>
        <div className="text-[10px]" style={{ color: "var(--ink-soft)" }}>ミスの種類（いくつでも）</div>
        <div className="flex flex-wrap gap-1.5">{SHOSHIKI_MISS.map((m) => <button key={m} onClick={() => setMiss(miss.includes(m) ? miss.filter((x) => x !== m) : [...miss, m])} className="text-[11px] px-2.5 py-1" style={chip(miss.includes(m))}>{miss.includes(m) ? "✓ " : ""}{m}</button>)}</div>
        <input className="rpg-input" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="メモ（気づいたこと・次に気をつけること）" />
        <button onClick={submit} className="btn-primary w-full py-2">記録する</button>
        {msg && <div className="text-xs text-center" style={{ color: "var(--gold)", fontWeight: 700, animation: "sqFadeIn .3s ease-out" }}>{msg}</div>}
      </div>
      {list.length > 0 && (
        <div className="jp mt-3 pt-3" style={{ borderTop: "1px dashed var(--rule-soft)" }}>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {[["記録した回数", `${list.length}回`], ["直近10回の平均", `${Math.round(avg((e) => e.score / (e.max || 25)) * 100)}%`], ["平均時間", `${Math.round(avg((e) => e.min || 0))}分`]].map(([k, v]) => (
              <div key={k} className="text-center" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 8, padding: "6px 2px" }}><div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>{k}</div><div className="text-sm" style={{ fontWeight: 800 }}>{v}</div></div>
            ))}
          </div>
          {missRank.length > 0 && (
            <div className="mb-2">
              <div className="text-[10px] mb-1" style={{ color: "var(--ink-soft)" }}>よくあるミス（直近30回）</div>
              {missRank.slice(0, 5).map(([m, n]) => (
                <div key={m} className="flex items-center gap-2 text-[11px]">
                  <span className="w-24 truncate" style={{ color: "var(--ink)" }}>{m}</span>
                  <span className="flex-1" style={{ height: 6, borderRadius: 3, background: "var(--beige)", overflow: "hidden" }}><span className="block" style={{ width: `${(n / maxMiss) * 100}%`, height: "100%", background: "#c9564e" }} /></span>
                  <span style={{ color: "var(--ink-soft)" }}>{n}回</span>
                </div>
              ))}
            </div>
          )}
          <div className="text-[10px] mb-1" style={{ color: "var(--ink-soft)" }}>最近の記録</div>
          {[...list].reverse().slice(0, 5).map((e) => (
            <div key={e.id} className="flex items-center gap-2 text-[11px] py-0.5">
              <span style={{ color: "var(--ink-mute)", minWidth: 40 }}>{Number(e.d.slice(5, 7))}/{Number(e.d.slice(8, 10))}</span>
              <span style={{ fontWeight: 700 }}>{e.kind}</span>
              <span style={{ color: e.score / (e.max || 25) >= 0.8 ? "var(--gold)" : "var(--ink)" }}>{e.score}/{e.max}点</span>
              <span style={{ color: "var(--ink-mute)" }}>{e.min ? `${e.min}分` : ""}</span>
              <span className="flex-1 truncate" style={{ color: "var(--ink-soft)" }}>{(e.miss || []).join("・")}{e.memo ? `　${e.memo}` : ""}</span>
              <button onClick={() => { if (confirm("この記録を消しますか？")) actions.deleteShoshiki(e.id); }} style={{ background: "none", border: "none", color: "var(--ink-mute)", cursor: "pointer" }} aria-label="記録を消す">✕</button>
            </div>
          ))}
        </div>
      )}
    </Box>
  );
}

// ── 申請書の穴埋め：場面を読んで、申請書の大事な欄を選ぶ（場面は src/data/shinsei.js） ──
const LAND_PURPOSES = SHINSEI_PURPOSES.filter((x) => x.startsWith("土地") || x.startsWith("地"));
function shinseiQuestion(c) {
  const pick = (pool, ans, n = 3) => shuffleArr([ans, ...shuffleArr(pool.filter((x) => x !== ans)).slice(0, n)]);
  const samePool = c.kind === "土地" ? LAND_PURPOSES : SHINSEI_PURPOSES.filter((x) => !LAND_PURPOSES.includes(x));
  return {
    c,
    purposeOpts: pick(samePool.length >= 4 ? samePool : SHINSEI_PURPOSES, c.purpose),
    causeOpts: c.cause ? pick(SHINSEI_CAUSES, c.cause) : null,
  };
}
function ShinseiDrill({ state, actions }) {
  const log = normRpg(state.rpg).shinsei || [];
  const [run, setRun] = useState(null); // { list, i, ans:{purpose,cause,deadline,attach:[],none}, checked, ok, miss:[] }
  const [done, setDone] = useState(null);
  const start = () => {
    // 前回まちがえた場面を優先して入れる
    const lastMiss = new Set(log.slice(-5).flatMap((e) => e.miss || []));
    const order = [...shuffleArr(SHINSEI_CASES.filter((c) => lastMiss.has(c.id))), ...shuffleArr(SHINSEI_CASES.filter((c) => !lastMiss.has(c.id)))];
    setDone(null);
    setRun({ list: shuffleArr(order.slice(0, 5)).map(shinseiQuestion), i: 0, ans: { attach: [] }, checked: null, ok: 0, miss: [] });
  };
  const chip = (on, ok, ng) => ({ borderRadius: 8, border: `1.5px solid ${ok ? "var(--sage)" : ng ? "#c9564e" : on ? "var(--gold)" : "var(--rule-soft)"}`, background: ok ? "rgba(109,132,84,0.12)" : ng ? "rgba(201,86,78,0.08)" : on ? "var(--cream)" : "var(--paper)", color: "var(--ink)", fontWeight: on || ok ? 800 : 500, cursor: "pointer" });

  if (run) {
    const { c, purposeOpts, causeOpts } = run.list[run.i];
    const a = run.ans, ck = run.checked;
    const setA = (k, v) => setRun((r) => ({ ...r, ans: { ...r.ans, [k]: v } }));
    const attachOk = (list, none) => c.attach === null || (none ? c.attach.length === 0 : c.attach.length > 0 && list.length === c.attach.length && list.every((x) => c.attach.includes(x)));
    const ready = a.purpose && (!c.cause || a.cause) && a.deadline && (c.attach === null || a.none || a.attach.length > 0);
    const check = () => {
      const res = { purpose: a.purpose === c.purpose, cause: !c.cause || a.cause === c.cause, deadline: a.deadline === c.deadline, attach: attachOk(a.attach, a.none) };
      const all = Object.values(res).every(Boolean);
      SFX.play(all ? "defeat" : "miss");
      setRun((r) => ({ ...r, checked: res, ok: r.ok + (all ? 1 : 0), miss: all ? r.miss : [...r.miss, c.id] }));
    };
    const next = () => {
      if (run.i + 1 >= run.list.length) {
        const msg = actions.logShinsei({ n: run.list.length, ok: run.ok, miss: run.miss });
        SFX.play("result");
        setDone({ n: run.list.length, ok: run.ok, msg, miss: run.miss }); setRun(null); return;
      }
      setRun((r) => ({ ...r, i: r.i + 1, ans: { attach: [] }, checked: null }));
    };
    const Field = ({ label, k, opts }) => (
      <div>
        <div className="text-[11px] mb-1" style={{ color: "var(--ink-soft)", fontWeight: 700 }}>{label}{ck && !ck[k] ? <span style={{ color: "#c9564e" }}>　→ 正しくは「{c[k]}」</span> : ""}</div>
        <div className="grid gap-1.5 grid-cols-2">
          {opts.map((o) => <button key={o} disabled={!!ck} onClick={() => setA(k, o)} className="text-xs px-2 py-2" style={chip(a[k] === o, ck && o === c[k], ck && a[k] === o && o !== c[k])}>{o}</button>)}
        </div>
      </div>
    );
    return (
      <Box title={`申請書の穴埋め　${run.i + 1} / ${run.list.length}問`} icon={<FileQuestion size={18} />}>
        <div className="jp space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5" style={{ borderRadius: 999, background: "var(--cream)", border: "1px solid var(--gold)", fontWeight: 800 }}>{c.kind}</span>
            <span className="flex-1" />
            <button onClick={() => { if (confirm("やめますか？（記録は残りません）")) setRun(null); }} className="btn-ghost text-[10px] px-2 py-0.5">やめる</button>
          </div>
          <div className="text-sm px-3 py-2" style={{ background: "var(--cream)", border: "1px solid var(--rule-soft)", borderRadius: 8, lineHeight: 1.8, color: "var(--ink)", fontFamily: "'Shippori Mincho B1', serif", fontWeight: 600 }}>{c.text}</div>
          <Field label="登記の目的" k="purpose" opts={purposeOpts} />
          {causeOpts && <Field label="登記原因及びその日付" k="cause" opts={causeOpts} />}
          <Field label="申請の期限（申請の義務）" k="deadline" opts={SHINSEI_DEADLINES} />
          {c.attach !== null && (
            <div>
              <div className="text-[11px] mb-1" style={{ color: "var(--ink-soft)", fontWeight: 700 }}>添付情報（必要なものをすべて）{ck && !ck.attach ? <span style={{ color: "#c9564e" }}>　→ 正しくは「{c.attach.length ? c.attach.join("・") : "特別な添付情報なし"}」</span> : ""}</div>
              <div className="grid grid-cols-2 gap-1.5">
                {SHINSEI_ATTACH.map((o) => { const on = a.attach.includes(o); const need = c.attach.includes(o); return <button key={o} disabled={!!ck} onClick={() => setRun((r) => ({ ...r, ans: { ...r.ans, none: false, attach: r.ans.attach.includes(o) ? r.ans.attach.filter((x) => x !== o) : [...r.ans.attach, o] } }))} className="text-xs px-2 py-2" style={chip(on, ck && need, ck && on && !need)}>{on ? "☑ " : "☐ "}{o}</button>; })}
                <button disabled={!!ck} onClick={() => setRun((r) => ({ ...r, ans: { ...r.ans, none: !r.ans.none, attach: [] } }))} className="text-xs px-2 py-2 col-span-2" style={chip(a.none, ck && c.attach.length === 0, ck && a.none && c.attach.length > 0)}>{a.none ? "☑ " : "☐ "}特別な添付情報なし</button>
              </div>
            </div>
          )}
          {!ck ? (
            <button onClick={check} disabled={!ready} className="btn-primary w-full py-2" style={{ opacity: ready ? 1 : 0.5 }}>答え合わせ</button>
          ) : (
            <>
              <div className="px-3 py-2 text-[11px]" style={{ background: Object.values(ck).every(Boolean) ? "rgba(109,132,84,0.1)" : "rgba(201,86,78,0.06)", border: `1px solid ${Object.values(ck).every(Boolean) ? "var(--sage)" : "#c9564e"}`, borderRadius: 8, color: "var(--ink)" }}>
                <div className="text-sm mb-1" style={{ fontWeight: 800, color: Object.values(ck).every(Boolean) ? "var(--sage)" : "#c9564e" }}>{Object.values(ck).every(Boolean) ? "正解！ 申請書が完成しました" : "おしい！"}</div>
                {c.note}
              </div>
              <button onClick={next} className="btn-primary w-full py-2">{run.i + 1 >= run.list.length ? "結果を見る" : "次の場面へ"}</button>
            </>
          )}
        </div>
      </Box>
    );
  }

  const recent = log.slice(-10);
  const n = recent.reduce((t, e) => t + e.n, 0), ok = recent.reduce((t, e) => t + e.ok, 0);
  return (
    <Box title="申請書の穴埋め（書式の基本）" icon={<GameIcon ch="📘" painted="c23" size={24} />}>
      <p className="jp text-[11px] mb-2" style={{ color: "var(--ink-soft)" }}>場面を読んで、申請書の「登記の目的」「登記原因及びその日付」「申請の期限」「添付情報」を選びます。書式で落としやすい欄を、くり返し確かめましょう。前回まちがえた場面は優先して出ます。</p>
      {done && (
        <div className="jp text-center mb-3 px-3 py-3" style={{ background: "var(--cream)", border: "1px solid var(--gold)", borderRadius: 10, animation: "sqFadeIn .3s ease-out" }}>
          <div className="text-2xl my-1" style={{ fontWeight: 800, color: done.ok === done.n ? "var(--gold)" : "var(--ink)" }}>{done.ok} / {done.n}場面 正解</div>
          {done.msg && <div className="text-xs mt-1" style={{ color: "var(--gold)", fontWeight: 700 }}>報酬：{done.msg}</div>}
        </div>
      )}
      <button onClick={start} className="jp btn-primary w-full py-2">5つの場面に挑戦する</button>
      <div className="jp text-[10px] mt-2 flex" style={{ color: "var(--ink-mute)" }}>
        <span className="flex-1">場面は全{SHINSEI_CASES.length}種類（土地・建物の表示に関する登記）</span>
        {n > 0 && <span>直近10回の正解率 <b style={{ color: ok / n >= 0.8 ? "var(--gold)" : "var(--ink)" }}>{Math.round((ok / n) * 100)}%</b></span>}
      </div>
    </Box>
  );
}
// 1つの条文から問題を作る（項・号の中から空欄を作れるものを探す）
function clozeFromArticle(lawKey, a) {
  const units = [];
  const many = (a.p || []).length > 1;
  (a.p || []).forEach((p) => {
    units.push({ label: many ? `第${p.n}項` : "", text: p.s });
    (p.i || []).forEach((it) => units.push({ label: `${many ? `第${p.n}項` : ""}第${it.t}号`.replace(/第(第)/, "$1"), text: it.s }));
  });
  for (const u of shuffleArr(units)) {
    const c = makeCloze(u.text);
    if (c) return { ...c, law: lawKey, art: a.n, head: `${LAW_BY_KEY[lawKey].name} ${a.t}${a.c || ""}`, label: u.label, key: `${lawKey}:${a.n}` };
  }
  return null;
}
const LAWDEX_NEED = 3; // 図鑑に登録されるまでに必要な正解の回数
function pickClozeSet(data, lawKey, mode, counts, miss, n, got = {}) {
  const arts = (data.articles || []).filter((a) => (a.p || []).length && !/削除/.test((a.p[0] || {}).s || "") );
  const weightOf = (a) => {
    if (mode === "miss") return miss[`${lawKey}:${a.n}`] ? 1 + miss[`${lawKey}:${a.n}`] : 0;
    if (mode === "dex") return counts[a.n] && (got[`${lawKey}:${a.n}`] || 0) < LAWDEX_NEED ? 1 : 0;
    if (mode === "often") return (counts[a.n] || 0) * 3 + (miss[`${lawKey}:${a.n}`] || 0) * 2;
    return 1;
  };
  let pool = arts.map((a) => ({ a, w: weightOf(a) })).filter((x) => x.w > 0);
  if (!pool.length) pool = arts.map((a) => ({ a, w: 1 }));
  const out = [], used = new Set();
  for (let tries = 0; out.length < n && tries < n * 30; tries++) {
    const total = pool.reduce((t, x) => t + (used.has(x.a.n) ? 0 : x.w), 0);
    if (total <= 0) break;
    let r = Math.random() * total, pick = null;
    for (const x of pool) { if (used.has(x.a.n)) continue; r -= x.w; if (r <= 0) { pick = x.a; break; } }
    if (!pick) continue;
    used.add(pick.n);
    const c = clozeFromArticle(lawKey, pick);
    if (c) out.push(c);
  }
  return out;
}
function LawDex({ state, law, counts, actions }) {
  const cz = normRpg(state.rpg).cloze;
  const [open, setOpen] = useState(null);
  const arts = Object.keys(counts).sort((a, b) => { const p = (x) => x.split("_").map(Number); const [a1, a2 = 0] = p(a), [b1, b2 = 0] = p(b); return a1 - b1 || a2 - b2; });
  if (!arts.length) return null;
  const gotOf = (a) => (cz.got || {})[`${law}:${a}`] || 0;
  const have = arts.filter((a) => gotOf(a) >= LAWDEX_NEED).length;
  const done = (cz.dexDone || {})[law];
  const full = have === arts.length && arts.length >= 5;
  const lb = LAW_BY_KEY[law];
  return (
    <div className="jp mt-3 pt-3" style={{ borderTop: "1px dashed var(--rule-soft)" }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs" style={{ fontWeight: 800, color: "var(--ink)" }}>📜 条文図鑑：{lb.name}</span>
        <span className="flex-1" />
        <span className="text-[11px]" style={{ color: full ? "var(--gold)" : "var(--ink-soft)", fontWeight: 800 }}>{have} / {arts.length}条（{Math.round((have / arts.length) * 100)}%）</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: "var(--beige)", overflow: "hidden", marginBottom: 6 }}><div style={{ width: `${(have / arts.length) * 100}%`, height: "100%", background: "linear-gradient(90deg, #d6b56a, #b08a3e)" }} /></div>
      <div className="flex flex-wrap gap-1">
        {arts.map((a) => { const g = gotOf(a), ok = g >= LAWDEX_NEED; return (
          <button key={a} onClick={() => setOpen({ law, art: a, para: null, item: null })} title={`${lb.short}${a.replace("_", "条の")}${a.includes("_") ? "" : "条"}（正解${g}回）`} className="text-[10px]" style={{ minWidth: 34, padding: "3px 4px", borderRadius: 6, border: `1px solid ${ok ? "#b08a3e" : "var(--rule-soft)"}`, background: ok ? "linear-gradient(180deg, #f1dfae, #d6b56a)" : g > 0 ? `linear-gradient(90deg, rgba(214,181,106,0.35) ${(g / LAWDEX_NEED) * 100}%, var(--paper) ${(g / LAWDEX_NEED) * 100}%)` : "var(--paper)", color: ok ? "#5b4413" : "var(--ink-soft)", fontWeight: ok ? 800 : 500, cursor: "pointer" }}>{a.replace("_", "の")}</button>
        ); })}
      </div>
      <p className="text-[10px] mt-1" style={{ color: "var(--ink-mute)" }}>問題集に出てくる条文を集めます。穴埋めでその条文に{LAWDEX_NEED}回正解すると登録（金色）。番号を押すと条文を読めます。</p>
      {full && !done && <button onClick={() => actions.claimLawDex(law)} className="btn-primary w-full py-2 mt-1 text-sm">図鑑完成！ 称号を受け取る</button>}
      {done && <p className="text-[11px] mt-1 text-center" style={{ color: "var(--gold)", fontWeight: 800 }}>✓ 図鑑完成（称号「{lb.name}の語り部」）</p>}
      {open && <LawArticleModal target={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
function LawCloze({ state, actions }) {
  const cz = normRpg(state.rpg).cloze;
  const lawList = lawsInScope(state);
  const [law0, setLaw] = useState(() => (lawList[0] || LAWS[0]).key);
  const law = lawList.some((l) => l.key === law0) ? law0 : (lawList[0] || LAWS[0]).key; // 資格を切り替えたら、その資格の法令に
  const [mode, setMode] = useState("often");
  const [run, setRun] = useState(null); // { law, list, i, pick:{}, checked, ok, blanks, items:[] }
  const [done, setDone] = useState(null);
  const [loading, setLoading] = useState(false);
  const missN = Object.keys(cz.miss || {}).filter((k) => k.startsWith(`${law}:`)).length;
  const counts = lawRefCounts(state)[law] || {};
  const oftenN = Object.keys(counts).length;
  const dexLeft = Object.keys(counts).filter((a) => ((cz.got || {})[`${law}:${a}`] || 0) < LAWDEX_NEED).length;
  const start = () => {
    setLoading(true); setDone(null);
    loadLaw(law).then((d) => {
      setLoading(false);
      if (!d) { alert("条文データを読み込めませんでした。通信状態を確かめてください。"); return; }
      const list = pickClozeSet(d, law, mode, counts, cz.miss || {}, 10, cz.got || {});
      if (!list.length) { alert("問題を作れませんでした。"); return; }
      setRun({ law, list, i: 0, pick: {}, checked: false, ok: 0, blanks: 0, items: [] });
    });
  };
  const chip = (on) => ({ borderRadius: 999, border: `1px solid ${on ? "var(--gold)" : "var(--rule-soft)"}`, background: on ? "var(--cream)" : "var(--paper)", color: "var(--ink)", fontWeight: on ? 800 : 500, cursor: "pointer" });

  if (run) {
    const c = run.list[run.i];
    const allPicked = c.blanks.every((_, k) => run.pick[k] != null);
    const check = () => {
      const good = c.blanks.map((b, k) => run.pick[k] === b.word);
      const all = good.every(Boolean);
      SFX.play(all ? "defeat" : "miss");
      setRun({ ...run, checked: good, ok: run.ok + good.filter(Boolean).length, blanks: run.blanks + c.blanks.length, items: [...run.items, { key: c.key, good: all }] });
    };
    const next = () => {
      if (run.i + 1 >= run.list.length) {
        const msg = actions.logCloze({ law: run.law, n: run.blanks, ok: run.ok, items: run.items });
        SFX.play("result");
        setDone({ law: run.law, n: run.blanks, ok: run.ok, q: run.list.length, qOk: run.items.filter((x) => x.good).length, msg, wrong: run.list.filter((_, k) => !run.items[k].good) });
        setRun(null); return;
      }
      setRun({ ...run, i: run.i + 1, pick: {}, checked: false });
    };
    return (
      <Box title={`条文の穴埋め　${run.i + 1} / ${run.list.length}問`} icon={<ScrollIcon size={18} />}>
        <div className="jp space-y-2">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="flex-1 min-w-0" style={{ color: "var(--ink)", fontWeight: 800 }}>{c.head}{c.label ? `　${c.label}` : ""}</span>
            <button onClick={() => { if (confirm("やめますか？（記録は残りません）")) setRun(null); }} className="btn-ghost text-[10px] px-2 py-0.5">やめる</button>
          </div>
          <div className="text-sm px-3 py-2" style={{ background: "var(--cream)", border: "1px solid var(--rule-soft)", borderRadius: 8, lineHeight: 1.9, color: "var(--ink)", fontFamily: "'Shippori Mincho B1', serif" }}>
            {c.parts.map((x, k) => {
              if (typeof x === "string") return <span key={k}>{x}</span>;
              const b = c.blanks[x.blank], ok = run.checked && run.checked[x.blank];
              if (run.checked) return <span key={k} style={{ fontWeight: 800, color: ok ? "var(--sage)" : "#c9564e", borderBottom: `2px solid ${ok ? "var(--sage)" : "#c9564e"}`, padding: "0 2px" }}>{b.word}</span>;
              const sel = run.pick[x.blank];
              return <span key={k} style={{ display: "inline-block", minWidth: 48, padding: "0 6px", margin: "0 2px", border: "1.5px solid var(--gold)", borderRadius: 4, background: "var(--paper)", color: sel ? "var(--ink)" : "var(--gold)", fontWeight: 800, textAlign: "center", lineHeight: 1.5 }}>{sel || `（${BLANK_LABELS[x.blank]}）`}</span>;
            })}
          </div>
          {c.blanks.map((b, k) => (
            <div key={k}>
              <div className="text-[11px] mb-1" style={{ color: "var(--ink-soft)", fontWeight: 700 }}>（{BLANK_LABELS[k]}）に入る言葉{run.checked && !run.checked[k] ? `　→ 正しくは「${b.word}」` : ""}</div>
              <div className="grid grid-cols-2 gap-1.5">
                {b.options.map((o) => {
                  const on = run.pick[k] === o;
                  const right = run.checked && o === b.word, wrongPick = run.checked && on && o !== b.word;
                  return <button key={o} disabled={!!run.checked} onClick={() => setRun((r) => ({ ...r, pick: { ...r.pick, [k]: o } }))} className="text-xs px-2 py-2" style={{ borderRadius: 8, border: `1.5px solid ${right ? "var(--sage)" : wrongPick ? "#c9564e" : on ? "var(--gold)" : "var(--rule-soft)"}`, background: right ? "rgba(109,132,84,0.12)" : wrongPick ? "rgba(201,86,78,0.08)" : on ? "var(--cream)" : "var(--paper)", color: "var(--ink)", fontWeight: on || right ? 800 : 500, cursor: run.checked ? "default" : "pointer" }}>{o}</button>;
                })}
              </div>
            </div>
          ))}
          {!run.checked ? (
            <button onClick={check} disabled={!allPicked} className="btn-primary w-full py-2" style={{ opacity: allPicked ? 1 : 0.5 }}>答え合わせ</button>
          ) : (
            <button onClick={next} className="btn-primary w-full py-2">{run.i + 1 >= run.list.length ? "結果を見る" : "次の問題へ"}</button>
          )}
        </div>
      </Box>
    );
  }

  const stats = lawList.map((l) => { const lg = cz.log.filter((e) => e.law === l.key).slice(-5); const n = lg.reduce((a, e) => a + e.n, 0), ok = lg.reduce((a, e) => a + e.ok, 0); return { l, acc: n ? ok / n : null, times: cz.log.filter((e) => e.law === l.key).length, miss: Object.keys(cz.miss || {}).filter((k) => k.startsWith(`${l.key}:`)).length }; }).filter((x) => x.times > 0);
  return (
    <Box title="条文の穴埋め" icon={<GameIcon ch="📗" painted="c21" size={24} />}>
      <p className="jp text-[11px] mb-2" style={{ color: "var(--ink-soft)" }}>条文の大事な言葉（期間・数・「しなければならない／できる」・用語）が空欄になります。4つの中から選んでください。まちがえた条文は覚えておき、あとで集中して復習できます。</p>
      {done && (
        <div className="jp text-center mb-3 px-3 py-3" style={{ background: "var(--cream)", border: "1px solid var(--gold)", borderRadius: 10, animation: "sqFadeIn .3s ease-out" }}>
          <div className="text-[11px]" style={{ color: "var(--ink-mute)" }}>{LAW_BY_KEY[done.law].name}　{done.q}問の結果</div>
          <div className="text-2xl my-1" style={{ fontWeight: 800, color: done.qOk === done.q ? "var(--gold)" : "var(--ink)" }}>{done.qOk} / {done.q}問 正解</div>
          <div className="text-xs" style={{ color: "var(--ink-soft)" }}>空欄 {done.ok}/{done.n}個 正解</div>
          {done.msg && <div className="text-xs mt-1" style={{ color: "var(--gold)", fontWeight: 700 }}>報酬：{done.msg}</div>}
          {done.wrong.length > 0 && <div className="text-[11px] mt-1" style={{ color: "var(--ink-soft)" }}>まちがえた条文：{done.wrong.map((w) => `${LAW_BY_KEY[w.law].short}${w.art.replace("_", "条の")}${w.art.includes("_") ? "" : "条"}`).join("・")}</div>}
        </div>
      )}
      <div className="jp space-y-2">
        <div className="flex flex-wrap gap-1.5">{lawList.map((l) => <button key={l.key} onClick={() => setLaw(l.key)} className="text-xs px-3 py-1" style={chip(law === l.key)}>{l.name}</button>)}</div>
        <div className="flex flex-wrap gap-1.5">
          {[["often", `問題によく出る条文${oftenN ? `（${oftenN}条）` : ""}`], ["dex", `図鑑のすき間（${dexLeft}条）`], ["miss", `まちがえた条文（${missN}条）`], ["all", "すべての条文"]].map(([id, nm]) => { const off = (id === "miss" && !missN) || (id === "dex" && !dexLeft); return <button key={id} disabled={off} onClick={() => setMode(id)} className="text-[11px] px-3 py-1" style={{ ...chip(mode === id), opacity: off ? 0.45 : 1 }}>{nm}</button>; })}
        </div>
        <button onClick={start} disabled={loading} className="btn-primary w-full py-2">{loading ? "条文を読み込んでいます…" : "10問に挑戦する"}</button>
      </div>
      <LawDex state={state} law={law} counts={counts} actions={actions} />
      {stats.length > 0 && (
        <div className="jp mt-3 pt-3" style={{ borderTop: "1px dashed var(--rule-soft)" }}>
          <div className="text-[10px] mb-1" style={{ color: "var(--ink-soft)" }}>法令ごとの記録（直近5回の空欄の正解率）</div>
          {stats.map(({ l, acc, times, miss }) => (
            <div key={l.key} className="flex items-center gap-2 text-[11px] py-0.5">
              <span className="w-24 truncate" style={{ color: "var(--ink)", fontWeight: 700 }}>{l.name}</span>
              <span className="flex-1" style={{ height: 6, borderRadius: 3, background: "var(--beige)", overflow: "hidden" }}><span className="block" style={{ width: `${(acc || 0) * 100}%`, height: "100%", background: "linear-gradient(90deg, #d6b56a, #b08a3e)" }} /></span>
              <span className="w-10 text-right" style={{ color: acc >= 0.8 ? "var(--gold)" : "var(--ink-soft)", fontWeight: 700 }}>{acc === null ? "－" : `${Math.round(acc * 100)}%`}</span>
              <span className="w-20 text-right" style={{ color: "var(--ink-mute)" }}>{times}回・苦手{miss}条</span>
            </div>
          ))}
        </div>
      )}
    </Box>
  );
}
// ── 鍛錬（2026年10月22日。冒険の世界タブから周回へ移した）：本番リハーサルと、短い練習をまとめた場所。本番リハーサルの戦いもここで動かす。
//    王都の世界（調査士）は申請書の穴埋め・組合せ問題・書式など、資格の世界は本番モードと世界の鍛錬（計算ドリル・作図ドリルは「計算」へ）──
function TrainingRoom({ state, actions, recordAnswer, startTimer, stopTimer }) {
  const [rehearsal, setRehearsal] = useState(null);
  const qual = mainQual(state);
  const linked = qual && state.questionBanks.some((b) => b.qualId === qual.id);
  const pp = passPower(state, linked ? qual.id : null);
  const world = worldOfQual(qual);
  if (rehearsal) return <RehearsalRun state={state} run={rehearsal} actions={actions} recordAnswer={recordAnswer} startTimer={startTimer} stopTimer={stopTimer} onExit={() => setRehearsal(null)} />;
  if (world.id !== "home") return (
    <div className="space-y-4">
      {world.exam && <WorldExamCard key={world.id} state={state} world={world} pp={pp} actions={actions} />}
      {(world.drills || []).includes("blocks") && <BlockDrill state={state} actions={actions} />}
      <NumberDeck state={state} actions={actions} />
      <PaceDrill state={state} actions={actions} />
      <LawCloze state={state} actions={actions} />
      <LawListen state={state} actions={actions} />
      <TeachMode state={state} actions={actions} />
    </div>
  );
  return (
    <div className="space-y-4">
      <RehearsalCard state={state} pp={pp} actions={actions} onStart={setRehearsal} />
      <ShinseiDrill state={state} actions={actions} />
      <KumiaiDrill state={state} actions={actions} />
      <NumberDeck state={state} actions={actions} />
      <PaceDrill state={state} actions={actions} />
      <LawCloze state={state} actions={actions} />
      <LawListen state={state} actions={actions} />
      <TeachMode state={state} actions={actions} />
      <ShoshikiDojo state={state} actions={actions} />
      <ShoshikiCheck state={state} actions={actions} />
    </div>
  );
}

// ── 本番形式の組合せ問題：○×の一問一答を5つ（ア〜オ）選び、「正しい（誤っている）ものの組合せ」の5択にする ──
const isFalseAnswer = (a) => /^\s*[×✕✖ＸX]|^\s*誤(り|っ)?(\s|。|$|　)/.test(String(a || ""));
const KANA5 = ["ア", "イ", "ウ", "エ", "オ"];
function kumiaiPool(state, folderId) {
  const out = [];
  state.questionBanks.forEach((b) => {
    if (folderId !== "all" && (folderId ? b.folderId !== folderId : !!b.folderId)) return;
    (b.questions || []).forEach((q) => { if (q.excluded) return; const t = isTrueAnswer(q.a), f = isFalseAnswer(q.a); if (t !== f) out.push({ b, q, ok: t }); });
  });
  // 同じ文の問題（年度ちがいの重複など）は1つだけにする
  const seen = new Set();
  return shuffle(out).filter((x) => { const k = String(x.q.q).replace(/\s+/g, ""); if (seen.has(k)) return false; seen.add(k); return true; });
}
function makeKumiai(pool) {
  const T = shuffle(pool.filter((x) => x.ok)), F = shuffle(pool.filter((x) => !x.ok));
  let askTrue = Math.random() < 0.6;
  if (askTrue && (T.length < 2 || F.length < 3)) askTrue = false;
  if (!askTrue && (F.length < 2 || T.length < 3)) { if (T.length >= 2 && F.length >= 3) askTrue = true; else return null; }
  const target = (askTrue ? T : F).slice(0, 2), other = (askTrue ? F : T).slice(0, 3);
  const tset = new Set(target);
  const stmts = shuffle([...target, ...other]).map((x, i) => ({ ...x, L: KANA5[i], tgt: tset.has(x) }));
  const ans = stmts.filter((x) => x.tgt).map((x) => x.L).join("");
  const pairs = []; for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) pairs.push(KANA5[i] + KANA5[j]);
  const options = [ans, ...shuffle(pairs.filter((p) => p !== ans)).slice(0, 4)].sort((a, b) => KANA5.indexOf(a[0]) - KANA5.indexOf(b[0]) || KANA5.indexOf(a[1]) - KANA5.indexOf(b[1]));
  return { stmts, askTrue, ans, options };
}
function KumiaiDrill({ state, actions }) {
  const folders = [{ id: "all", name: "すべて" }, ...(state.folders || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))];
  const [fid, setFid] = useState("all");
  const [run, setRun] = useState(null); // { list, i, pick, checked, ok }
  const [done, setDone] = useState(null);
  const pool = kumiaiPool(state, fid);
  const start = () => { const list = []; for (let k = 0; k < 5; k++) { const m = makeKumiai(pool); if (m) list.push(m); } if (list.length) { setDone(null); setRun({ list, i: 0, pick: null, checked: false, ok: 0 }); } };
  const chip = (on) => ({ borderRadius: 999, border: `1px solid ${on ? "var(--gold)" : "var(--rule-soft)"}`, background: on ? "var(--cream)" : "var(--paper)", color: "var(--ink)", fontWeight: on ? 800 : 500, cursor: "pointer" });
  if (run) {
    const k = run.list[run.i];
    const check = () => {
      const good = run.pick === k.ans;
      SFX.play(good ? "defeat" : "miss");
      // 判断をまちがえた肢（選んだ組合せと正しい組合せの、どちらか一方にだけ入っている肢）は、まちがいとして記録
      if (!good) {
        const wrongL = KANA5.filter((L) => run.pick.includes(L) !== k.ans.includes(L));
        k.stmts.filter((x) => wrongL.includes(x.L)).forEach((x) => window.dispatchEvent(new CustomEvent("sq-record-answer", { detail: { bankId: x.b.id, qId: x.q.id, correct: false, meta: { errType: "knowledge" } } })));
      }
      setRun({ ...run, checked: true, ok: run.ok + (good ? 1 : 0) });
    };
    const next = () => {
      if (run.i + 1 >= run.list.length) { const msg = actions.logKumiai({ n: run.list.length, ok: run.ok }); SFX.play("result"); setDone({ n: run.list.length, ok: run.ok, msg }); setRun(null); return; }
      setRun({ ...run, i: run.i + 1, pick: null, checked: false });
    };
    return (
      <Box title={`本番形式の組合せ問題　${run.i + 1} / ${run.list.length}`} icon={<GameIcon ch="🗝️" painted="c25" size={24} />}>
        <div className="jp space-y-2">
          <div className="flex items-center gap-2 text-[11px]"><span className="flex-1" style={{ fontWeight: 800, color: "var(--ink)" }}>次のア〜オの記述のうち、<span style={{ color: k.askTrue ? "var(--sky-deep)" : "var(--brick)" }}>{k.askTrue ? "正しいもの" : "誤っているもの"}</span>の組合せはどれか。</span><button onClick={() => { if (confirm("やめますか？")) setRun(null); }} className="btn-ghost text-[10px] px-2 py-0.5">やめる</button></div>
          {k.stmts.map((x) => (
            <div key={x.L} className="text-sm px-2 py-1.5" style={{ background: "var(--paper)", border: `1px solid ${run.checked ? (x.ok ? "rgba(109,132,84,0.6)" : "rgba(201,86,78,0.5)") : "var(--rule-soft)"}`, borderRadius: 6, color: "var(--ink)", lineHeight: 1.7 }}>
              <b className="mr-1">{x.L}</b>{x.q.q}
              {run.checked && <div className="text-[11px] mt-1" style={{ color: x.ok ? "var(--sage)" : "var(--brick)" }}>{x.ok ? "○ 正しい" : "× 誤り"}：{String(x.q.a).replace(/^\s*[○◯〇×✕✖ＸX]\s*/, "")}<span className="ml-1" style={{ color: "var(--ink-mute)" }}>（{x.b.name}）</span></div>}
            </div>
          ))}
          <div className="grid grid-cols-5 gap-1.5">
            {k.options.map((o, i) => {
              const on = run.pick === o, right = run.checked && o === k.ans, bad = run.checked && on && o !== k.ans;
              return <button key={o} disabled={run.checked} onClick={() => setRun({ ...run, pick: o })} className="text-xs py-2" style={{ borderRadius: 8, border: `1.5px solid ${right ? "var(--sage)" : bad ? "#c9564e" : on ? "var(--gold)" : "var(--rule-soft)"}`, background: right ? "rgba(109,132,84,0.15)" : bad ? "rgba(201,86,78,0.1)" : on ? "var(--cream)" : "var(--paper)", color: "var(--ink)", fontWeight: on || right ? 800 : 500, cursor: run.checked ? "default" : "pointer" }}>{i + 1}<br />{o[0]}{o[1]}</button>;
            })}
          </div>
          {!run.checked ? <button onClick={check} disabled={!run.pick} className="btn-primary w-full py-2" style={{ opacity: run.pick ? 1 : 0.5 }}>答え合わせ</button>
            : <><div className="text-center text-sm" style={{ fontWeight: 800, color: run.pick === k.ans ? "var(--sage)" : "var(--brick)" }}>{run.pick === k.ans ? "正解！" : `残念…… 正解は ${k.options.indexOf(k.ans) + 1}（${k.ans[0]}${k.ans[1]}）`}</div>
              {run.pick !== k.ans && <p className="text-[10px] text-center" style={{ color: "var(--ink-mute)" }}>判断をまちがえた記述は、苦手として記録し、早めに復習に出します。</p>}
              <button onClick={next} className="btn-primary w-full py-2">{run.i + 1 >= run.list.length ? "結果を見る" : "次の問題へ"}</button></>}
        </div>
      </Box>
    );
  }
  const log = ((normRpg(state.rpg).kumiai || {}).log || []).slice(-5);
  return (
    <Box title="本番形式の組合せ問題" icon={<GameIcon ch="🗝️" painted="c25" size={24} />}>
      <div className="jp space-y-2">
        <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>土地家屋調査士の択一と同じ「正しいものの組合せは？」の形です。○×の一問一答から自動で作ります。1つでも判断を誤ると落とす、本番の厳しさで練習できます。</p>
        {done && <div className="text-center px-2 py-1.5" style={{ background: "var(--cream)", border: "1px solid var(--gold)", borderRadius: 8 }}><span style={{ fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 22, color: "var(--gold)" }}>{done.ok} / {done.n}</span><div className="text-[11px]" style={{ color: "var(--ink-soft)" }}>{done.msg}</div></div>}
        <div className="flex flex-wrap gap-1.5 text-[11px]">{folders.map((f) => <button key={f.id} onClick={() => setFid(f.id)} className="px-2.5 py-0.5" style={chip(fid === f.id)}>{f.name}</button>)}</div>
        <button onClick={start} disabled={pool.filter((x) => x.ok).length < 2 || pool.filter((x) => !x.ok).length < 2 || pool.length < 5} className="btn-primary w-full py-2">5問に挑戦する</button>
        <p className="text-[10px]" style={{ color: "var(--ink-mute)" }}>使える問題：○ {pool.filter((x) => x.ok).length}問・× {pool.filter((x) => !x.ok).length}問（答えが「○」「×」で始まる問題）{log.length ? `　最近：${log.map((l) => `${l.ok}/${l.n}`).join("・")}` : ""}</p>
      </div>
    </Box>
  );
}

// ── 仲間に教えるモード：仲間が「これってどうしてですか？」と聞いてくる。正しい答えと理由を3つから選んで教える ──
const TEACH_ASK = ["これって、どうなるんですか？ 理由も教えてください！", "ここ、ずっと迷っていて……。正しい答えはどれですか？", "教えてください！ この問題、どう考えればいいんでしょう？"];
function TeachMode({ state, actions }) {
  const [run, setRun] = useState(null); // { ally, list:[{b,q,opts}], i, pick, ok }
  const [done, setDone] = useState(null);
  const joined = alliesJoined(normRpg(state.rpg));
  const start = () => {
    const seen = [];
    state.questionBanks.forEach((b) => (b.questions || []).forEach((q) => { if (!q.excluded && (q.correct || 0) + (q.wrong || 0) > 0 && String(q.a || "").length >= 2) seen.push({ b, q }); }));
    const list = shuffle(seen).slice(0, 5).map(({ b, q }) => {
      const others = shuffle((b.questions || []).filter((x) => x.id !== q.id && x.a && x.a !== q.a)).slice(0, 2).map((x) => x.a);
      return { b, q, opts: shuffle([q.a, ...others]) };
    }).filter((x) => x.opts.length >= 2);
    if (!list.length) return;
    const ally = joined.length ? joined[Math.floor(Math.random() * joined.length)] : ALLIES[0];
    setDone(null); setRun({ ally, list, i: 0, pick: null, ok: 0 });
  };
  if (run) {
    const a = run.ally, it = run.list[run.i];
    const answered = run.pick !== null;
    const good = answered && it.opts[run.pick] === it.q.a;
    const pick = (k) => { if (answered) return; const g = it.opts[k] === it.q.a; SFX.play(g ? "defeat" : "miss"); setRun({ ...run, pick: k, ok: run.ok + (g ? 1 : 0) }); };
    const next = () => {
      if (run.i + 1 >= run.list.length) { const msg = actions.teachFinish({ allyId: a.id, n: run.list.length, ok: run.ok }); SFX.play("result"); setDone({ ally: a, n: run.list.length, ok: run.ok, msg }); setRun(null); return; }
      setRun({ ...run, i: run.i + 1, pick: null });
    };
    return (
      <Box title={`${a.name}に教える　${run.i + 1} / ${run.list.length}`} icon={<Crown size={18} />}>
        <div className="jp space-y-2">
          <div className="flex items-start gap-2">
            <span style={{ width: 48, height: 48, flexShrink: 0, borderRadius: "50%", border: "2px solid #b08a3e", backgroundColor: "#e9e4d6", backgroundImage: `url(${ART_URL}${a.img})`, backgroundSize: "300% auto", backgroundPosition: `${a.face[0]}% ${a.face[1]}%` }} />
            <div className="flex-1 text-sm px-2 py-1.5" style={{ background: "var(--cream)", border: "1px solid var(--rule-soft)", borderRadius: 8, color: "var(--ink)" }}>
              「{it.q.q}」<br /><span className="text-[11px]" style={{ color: "var(--ink-soft)" }}>{answered ? (good ? "なるほど……！ よくわかりました。ありがとうございます！" : "えっ、そうなんですか？ ……あ、本当はこっちみたいです。いっしょに覚えましょう！") : TEACH_ASK[run.i % TEACH_ASK.length]}</span>
            </div>
          </div>
          {it.opts.map((o, k) => {
            const right = answered && o === it.q.a, bad = answered && run.pick === k && !right;
            return <button key={k} onClick={() => pick(k)} className="w-full text-left text-xs px-2 py-2" style={{ borderRadius: 8, border: `1.5px solid ${right ? "var(--sage)" : bad ? "#c9564e" : "var(--rule-soft)"}`, background: right ? "rgba(109,132,84,0.12)" : bad ? "rgba(201,86,78,0.08)" : "var(--paper)", color: "var(--ink)", cursor: answered ? "default" : "pointer", lineHeight: 1.6 }}>{"ABC"[k]}．{o}</button>;
          })}
          {answered && <button onClick={next} className="btn-primary w-full py-2">{run.i + 1 >= run.list.length ? "おしまい" : "次の質問へ"}</button>}
        </div>
      </Box>
    );
  }
  return (
    <Box title="仲間に教えるモード" icon={<Crown size={18} />}>
      <div className="jp space-y-2">
        <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>仲間が「これってどうしてですか？」と質問してきます。正しい答えと理由を選んで教えてあげましょう。人に教えると、自分の理解がいちばん深まります。</p>
        {done && <div className="text-center px-2 py-1.5" style={{ background: "var(--cream)", border: "1px solid var(--gold)", borderRadius: 8 }}><span style={{ fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 22, color: "var(--gold)" }}>{done.ok} / {done.n}</span><div className="text-[11px]" style={{ color: "var(--ink-soft)" }}>{done.ally.name}「{done.ok >= done.n - 1 ? "すごくわかりやすかったです！ また教えてくださいね。" : "いっしょに覚えていきましょう！"}」　{done.msg}</div></div>}
        <button onClick={start} className="btn-primary w-full py-2">質問を受ける（5問）</button>
        <p className="text-[10px]" style={{ color: "var(--ink-mute)" }}>解いたことのある問題から出ます。正しく教えると、その仲間との絆が深まります。</p>
      </div>
    </Box>
  );
}

// ── 時間配分トレーニング：本番の択一と同じ「1問あたり約2分半」のペースで10問。時間を使いすぎた問題に印、「迷ったら次へ」 ──
const PACE_SEC = 150, PACE_N = 10;
// ── 資格の世界の本番モード（2026年10月20日）：世界の設定 exam（src/data/worlds.js）の形で、4択の問題だけを科目ごとに出し、時間を計って一気に解く ──
// 解いている途中は WORLD_EXAM に残す（タブを切り替えても続きから）。採点で1問ずつ今日の復習の記録にも入れる（sq-record-answer）
const WORLD_EXAM = { run: null };
function worldExamPool(state, pp, w) {
  const ex = w.exam;
  return ex.parts.flatMap((pt) => {
    const g = pp.regions.find((x) => x.name === pt.region);
    const cands = g ? g.banks.flatMap((b) => (b.questions || []).filter((q) => !q.excluded && choiceOf(q.q, q.a)).map((q) => ({ bankId: b.id, bankName: b.name, qId: q.id, part: pt.name }))) : [];
    return shuffle(cands).slice(0, pt.n);
  });
}
function WorldExamCard({ state, world, pp, actions }) {
  const ex = world.exam;
  const [run, setRunRaw] = useState(() => (WORLD_EXAM.run && WORLD_EXAM.run.wid === world.id ? WORLD_EXAM.run : null));
  const setRun = (v) => { WORLD_EXAM.run = v; setRunRaw(v); };
  const [done, setDone] = useState(null);
  const [open, setOpen] = useState(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (!run) return undefined; const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, [!!run]);
  const limit = ex.minutes * 60;
  const itemOf = (it) => { const b = state.questionBanks.find((x) => x.id === it.bankId); const q = b && (b.questions || []).find((x) => x.id === it.qId); return q ? { b, q, ch: choiceOf(q.q, q.a) } : null; };
  const start = () => {
    const list = worldExamPool(state, pp, world);
    if (!list.length) return;
    setDone(null); setOpen(null); setNow(Date.now());
    setRun({ wid: world.id, list, ans: {}, flag: {}, i: 0, t0: Date.now() });
  };
  const grade = (r) => {
    const sec = Math.min(limit, Math.round((Date.now() - r.t0) / 1000));
    const rows = r.list.map((it, k) => { const x = itemOf(it); const pick = r.ans[k] || null; return { it, x, pick, ok: !!(x && pick && pick === x.ch.correct) }; }).filter((row) => row.x);
    rows.forEach((row) => window.dispatchEvent(new CustomEvent("sq-record-answer", { detail: { bankId: row.it.bankId, qId: row.it.qId, correct: row.ok, meta: row.ok ? { conf: "sure" } : { errType: null } } })));
    const parts = ex.parts.map((pt) => { const rs = rows.filter((row) => row.it.part === pt.name); const ok = rs.filter((row) => row.ok).length; return { name: pt.name, n: rs.length, ok, need: pt.pass, full: pt.n, pass: rs.length >= pt.n && ok >= pt.pass }; });
    const passed = parts.every((pt) => pt.pass);
    const msg = actions.worldExamFinish({ wid: world.id, parts: parts.map(({ name, n, ok }) => ({ name, n, ok })), sec, passed });
    SFX.play("result");
    setRun(null); setDone({ rows, parts, passed, sec, msg });
  };
  // 時間切れは自動で採点
  useEffect(() => { if (run && now - run.t0 >= limit * 1000) grade(run); }, [now]);
  const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

  if (run) {
    const cur = itemOf(run.list[run.i]);
    const left = limit - Math.floor(Math.max(0, now - run.t0) / 1000);
    const answered = Object.keys(run.ans).length;
    const go = (i) => setRun({ ...run, i: Math.max(0, Math.min(run.list.length - 1, i)) });
    const pick = (n) => setRun({ ...run, ans: { ...run.ans, [run.i]: n } });
    return (
      <Box title={`${ex.title}　${run.i + 1} / ${run.list.length}`} icon={<Clock size={18} />}>
        <div className="jp space-y-2">
          <div className="flex items-center gap-2">
            <span style={{ fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 20, color: left < 300 ? "#c9564e" : "var(--ink)" }}>{mmss(left)}</span>
            <span className="flex-1 text-[11px]" style={{ color: "var(--ink-soft)" }}>のこり時間　解答 {answered} / {run.list.length}</span>
            <button onClick={() => { if (confirm("本番モードをやめますか？（採点も記録もしません）")) setRun(null); }} className="btn-ghost text-[10px] px-2 py-0.5">やめる</button>
          </div>
          <div className="grid grid-cols-12 gap-1">
            {run.list.map((it, k) => {
              const on = k === run.i, a = run.ans[k], f = run.flag[k];
              return <button key={k} onClick={() => go(k)} title={it.part} className="text-[10px] py-1" style={{ borderRadius: 4, border: `1.5px solid ${on ? "var(--gold)" : f ? "#c9564e" : "var(--rule-soft)"}`, background: a ? "rgba(79,125,200,0.22)" : "var(--paper)", color: a ? "var(--sky-deep)" : "var(--ink-mute)", fontWeight: on || a ? 800 : 500, cursor: "pointer" }}>{k + 1}</button>;
            })}
          </div>
          {cur ? (<>
            <div className="flex items-center gap-2 text-[10px]" style={{ color: "var(--ink-mute)" }}>
              <span className="px-1.5" style={{ border: "1px solid var(--rule-soft)", borderRadius: 4 }}>{run.list[run.i].part}</span>
              <span className="flex-1 truncate">{cur.b.name}</span>
              <button onClick={() => setRun({ ...run, flag: { ...run.flag, [run.i]: !run.flag[run.i] } })} className="text-[10px] px-2 py-0.5" style={{ borderRadius: 999, border: `1px solid ${run.flag[run.i] ? "#c9564e" : "var(--rule-soft)"}`, background: run.flag[run.i] ? "rgba(201,86,78,0.08)" : "var(--paper)", color: run.flag[run.i] ? "#c9564e" : "var(--ink-soft)", cursor: "pointer" }}>{run.flag[run.i] ? "🚩 見直す" : "🏳 あとで見直す"}</button>
            </div>
            <div className="qtext text-base px-1" style={{ color: "var(--ink)", lineHeight: 1.8 }}>{TRAP_MARK.on ? markTraps(cur.ch.stem, "s") : cur.ch.stem}</div>
            <div className="space-y-1.5">
              {cur.ch.opts.map((o, k) => { const on = run.ans[run.i] === k + 1; return (
                <button key={k} onClick={() => pick(k + 1)} className="w-full text-left flex items-baseline gap-2 px-2.5 py-2" style={{ borderRadius: 8, border: `1.5px solid ${on ? "var(--sky-deep)" : "var(--rule-soft)"}`, background: on ? "var(--sky-pale)" : "var(--paper)", color: "var(--ink)", cursor: "pointer" }}>
                  <span style={{ fontWeight: 800, color: "var(--sky-deep)", flexShrink: 0 }}>{on ? "●" : "○"} ({k + 1})</span><span className="text-sm">{o}</span>
                </button>
              ); })}
            </div>
          </>) : <p className="text-xs" style={{ color: "var(--ink-mute)" }}>この問題は見つかりませんでした（消された問題集）。</p>}
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => go(run.i - 1)} disabled={run.i === 0} className="btn-ghost py-2 text-xs">← 前へ</button>
            <button onClick={() => go(run.i + 1)} disabled={run.i >= run.list.length - 1} className="btn-ghost py-2 text-xs">次へ →</button>
            <button onClick={() => { const un = run.list.length - answered; if (!un || confirm(`まだ答えていない問題が${un}問あります。採点しますか？（答えていない問題は不正解）`)) grade(run); }} className="btn-primary py-2 text-xs">採点する</button>
          </div>
        </div>
      </Box>
    );
  }
  const log = ((normRpg(state.rpg).worldExam || {})[world.id] || {}).log || [];
  const avail = ex.parts.map((pt) => { const g = pp.regions.find((x) => x.name === pt.region); return { ...pt, have: g ? g.banks.reduce((t, b) => t + (b.questions || []).filter((q) => !q.excluded && choiceOf(q.q, q.a)).length, 0) : 0 }; });
  const can = avail.some((x) => x.have > 0);
  return (
    <Box title={ex.title} icon={<Clock size={18} />}>
      <div className="jp space-y-2">
        <p className="text-[11px]" style={{ color: "var(--ink-soft)", lineHeight: 1.7 }}>{ex.note} 本番と同じように、選択肢を選んで最後にまとめて採点します。答えは今日の復習の記録にも入ります。</p>
        <div className="grid grid-cols-2 gap-2">
          {avail.map((x) => <div key={x.name} className="text-center py-1.5" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 8 }}><div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>{x.name}（{x.region}）</div><div className="text-sm" style={{ fontWeight: 800, color: x.have >= x.n ? "var(--ink)" : "#c9564e" }}>4択 {x.have}問から{x.n}問</div></div>)}
        </div>
        {done && (
          <div className="px-2 py-2" style={{ background: done.passed ? "rgba(214,181,106,0.15)" : "var(--cream)", border: `1.5px solid ${done.passed ? "var(--gold)" : "#c9564e"}`, borderRadius: 10 }}>
            <div className="text-center" style={{ fontFamily: "'Shippori Mincho B1', serif", fontWeight: 800, fontSize: 22, color: done.passed ? "#b08a3e" : "#c9564e" }}>{done.passed ? "合格！" : "不合格"}</div>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {done.parts.map((pt) => <div key={pt.name} className="text-center py-1" style={{ background: "var(--paper)", border: `1px solid ${pt.pass ? "var(--sage)" : "#c9564e"}`, borderRadius: 8 }}><div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>{pt.name}</div><div style={{ fontWeight: 800, fontSize: 18, color: pt.pass ? "var(--sage)" : "#c9564e" }}>{pt.ok * ex.points}<span className="text-[11px]"> / {pt.full * ex.points}点</span></div><div className="text-[10px]" style={{ color: "var(--ink-soft)" }}>{pt.ok} / {pt.n}問（{pt.need}問以上で合格）</div></div>)}
            </div>
            <div className="text-[11px] text-center mt-1" style={{ color: "var(--ink-soft)" }}>かかった時間 {mmss(done.sec)}{done.msg ? `　${done.msg}` : ""}</div>
            <div className="mt-2 space-y-1 max-h-80 overflow-y-auto">
              {done.rows.map((row, k) => (
                <button key={k} onClick={() => setOpen(open === k ? null : k)} className="w-full text-left px-2 py-1" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderLeft: `3px solid ${row.ok ? "var(--sage)" : "#c9564e"}`, borderRadius: 6, cursor: "pointer" }}>
                  <div className="text-[11px]" style={{ color: "var(--ink)" }}><b style={{ color: row.ok ? "var(--sage)" : "#c9564e" }}>{row.ok ? "○" : "✕"} {k + 1}.</b> {row.x.ch.stem.slice(0, open === k ? 999 : 40)}{open !== k && row.x.ch.stem.length > 40 ? "…" : ""}</div>
                  {open === k && <div className="text-[11px] mt-1" style={{ color: "var(--ink-soft)", lineHeight: 1.7 }}>あなたの答え：{row.pick ? `(${row.pick}) ${row.x.ch.opts[row.pick - 1]}` : "（未回答）"}<br />正解：({row.x.ch.correct}) {row.x.ch.opts[row.x.ch.correct - 1]}<br />{row.x.q.a}</div>}
                </button>
              ))}
            </div>
            {done.rows.some((row) => !row.ok) && <button onClick={() => window.dispatchEvent(new CustomEvent("sq-study-items", { detail: { items: done.rows.filter((row) => !row.ok).map((row) => row.it), title: `${ex.title}のまちがい` } }))} className="btn-plum w-full py-1.5 text-xs mt-2">まちがえた問題をもう一度（今日タブで）</button>}
          </div>
        )}
        <button onClick={start} disabled={!can} className="btn-danger w-full py-2.5">⏱ {ex.title}を始める（{ex.parts.reduce((t, x) => t + x.n, 0)}問・{ex.minutes}分）</button>
        {log.length > 0 && <p className="text-[10px]" style={{ color: "var(--ink-mute)" }}>最近：{log.slice(-5).map((l) => `${l.d.slice(5).replace("-", "/")} ${l.passed ? "合格" : "不合格"}（${l.parts.map((pt) => `${pt.name.slice(0, 2)}${pt.ok}`).join("・")}）`).join("　")}</p>}
      </div>
    </Box>
  );
}

// ── ブロック図の並べ替え（2026年10月20日。データは src/data/blocks.js）：信号の流れの順にブロックをタップ。使わないブロックが1つまざっている ──
// 記録は rpgActions.logBlocks → rpg.blocks[図id] = { n, best（いちばん少ないまちがい）, perfect }
function BlockDrill({ state, actions }) {
  const rec = normRpg(state.rpg).blocks || {};
  const [run, setRun] = useState(null); // { d, pool:[名前], placed:[名前], miss, flash:{name, why}|null, msg }
  const begin = (d) => setRun({ d, pool: shuffle([...d.blocks.map((b) => b.name), d.extra.name]), placed: [], miss: 0, flash: null, msg: null });
  const tap = (name) => {
    if (!run || run.msg !== null) return;
    const d = run.d, want = d.blocks[run.placed.length];
    if (name === want.name) {
      const placed = [...run.placed, name];
      SFX.play("hit");
      if (placed.length === d.blocks.length) { const msg = actions.logBlocks(d.id, run.miss); SFX.play("result"); setRun({ ...run, placed, flash: null, msg }); }
      else setRun({ ...run, placed, flash: null });
    } else {
      SFX.play("miss");
      setRun({ ...run, miss: run.miss + 1, flash: name === d.extra.name ? { name, why: `「${name}」はこの図では使いません。${d.extra.why}。` } : { name, why: `「${name}」はまだです。次は${run.placed.length ? `「${run.placed[run.placed.length - 1]}」のあと` : "最初"}のブロックです。` } });
    }
  };
  const arrow = <span style={{ color: "var(--ink-mute)", fontSize: 12 }}>→</span>;
  const chainBox = (txt, kind) => <span className="text-[11px] px-2 py-1" style={{ borderRadius: 6, border: kind === "end" ? "1px dashed var(--rule-soft)" : kind === "empty" ? "1.5px dashed var(--gold)" : "1.5px solid var(--sky-deep)", background: kind === "fill" ? "var(--sky-pale)" : "var(--paper)", color: kind === "end" ? "var(--ink-mute)" : "var(--ink)", fontWeight: kind === "fill" ? 800 : 500, minWidth: kind === "empty" ? 44 : undefined, textAlign: "center" }}>{txt}</span>;
  if (run) {
    const d = run.d, done = run.msg !== null;
    return (
      <Box title={`ブロック図の並べ替え　${d.title}`} icon={<Shuffle size={18} />}>
        <div className="jp space-y-2">
          <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>信号の流れの順に、下のブロックをタップしてください。使わないブロックが1つまざっています。</p>
          <div className="flex flex-wrap items-center gap-1 px-2 py-2" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 8 }}>
            {d.from && <>{chainBox(d.from, "end")}{arrow}</>}
            {d.blocks.map((b, k) => <span key={k} className="flex items-center gap-1">{chainBox(k < run.placed.length ? b.name : `${k + 1}`, k < run.placed.length ? "fill" : "empty")}{(k < d.blocks.length - 1 || d.to) && arrow}</span>)}
            {d.to && chainBox(d.to, "end")}
          </div>
          {!done && (
            <div className="grid grid-cols-2 gap-1.5">
              {run.pool.filter((n) => !run.placed.includes(n)).map((n) => (
                <button key={n} onClick={() => tap(n)} className="py-2 px-2 text-sm" style={{ borderRadius: 8, border: `1.5px solid ${run.flash && run.flash.name === n ? "#c9564e" : "var(--rule-soft)"}`, background: run.flash && run.flash.name === n ? "rgba(201,86,78,0.08)" : "var(--paper)", color: "var(--ink)", fontWeight: 700, cursor: "pointer" }}>{n}</button>
              ))}
            </div>
          )}
          {run.flash && !done && <div className="text-[11px] px-2 py-1" style={{ background: "rgba(201,86,78,0.06)", border: "1px solid #e0948a", borderRadius: 6, color: "var(--ink)" }}>✕ {run.flash.why}</div>}
          {done && (
            <div className="px-2 py-2" style={{ background: "var(--cream)", border: "1px solid var(--gold)", borderRadius: 8 }}>
              <div className="text-sm mb-1" style={{ fontWeight: 800, color: run.miss ? "var(--ink)" : "#b08a3e" }}>{run.miss ? `完成！（まちがい ${run.miss}回）` : "✨ ノーミスで完成！"}{run.msg ? `　${run.msg}` : ""}</div>
              {d.blocks.map((b, k) => <div key={k} className="text-[11px]" style={{ color: "var(--ink)" }}><b>{k + 1}. {b.name}</b>：{b.role}</div>)}
              <div className="text-[11px] mt-1" style={{ color: "var(--ink-soft)" }}>使わないブロック：<b>{d.extra.name}</b>（{d.extra.why}）</div>
              {d.note && <div className="text-[11px] mt-1" style={{ color: "var(--ink-soft)" }}>📝 {d.note}</div>}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setRun(null)} className="btn-ghost py-2 text-xs">図を選びなおす</button>
            {done ? <button onClick={() => { const i = BLOCK_DIAGRAMS.findIndex((x) => x.id === d.id); begin(BLOCK_DIAGRAMS[(i + 1) % BLOCK_DIAGRAMS.length]); }} className="btn-primary py-2 text-xs">次の図へ</button>
              : <button onClick={() => begin(d)} className="btn-ghost py-2 text-xs">はじめから</button>}
          </div>
        </div>
      </Box>
    );
  }
  return (
    <Box title="ブロック図の並べ替え" icon={<Shuffle size={18} />}>
      <div className="jp space-y-2">
        <p className="text-[11px]" style={{ color: "var(--ink-soft)", lineHeight: 1.7 }}>受信機・送信機・電源などの各部を、信号の流れの順に並べます。本番の「構成の順として正しいものはどれか」の対策です。使わないブロックが1つまざっているので、見分けてください。</p>
        <div className="grid grid-cols-2 gap-1.5">
          {BLOCK_DIAGRAMS.map((d) => { const r = rec[d.id]; return (
            <button key={d.id} onClick={() => begin(d)} className="text-left px-2 py-1.5" style={{ borderRadius: 8, border: `1px solid ${r && r.perfect ? "var(--gold)" : "var(--rule-soft)"}`, background: "var(--paper)", color: "var(--ink)", cursor: "pointer" }}>
              <div className="text-[12px]" style={{ fontWeight: 800 }}>{r && r.perfect ? "✨ " : ""}{d.title}</div>
              <div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>{d.blocks.length}ブロック{r ? `・${r.n}回・最少まちがい ${r.best}` : "・まだ"}</div>
            </button>
          ); })}
        </div>
        <button onClick={() => begin(BLOCK_DIAGRAMS[Math.floor(Math.random() * BLOCK_DIAGRAMS.length)])} className="btn-primary w-full py-2 text-sm">おまかせで1つ</button>
      </div>
    </Box>
  );
}

function PaceDrill({ state, actions }) {
  const [run, setRun] = useState(null); // { list:[{b,q}], i, t0, qt0, recs:[], skipped:Set, show }
  const [now, setNow] = useState(Date.now());
  const [done, setDone] = useState(null);
  useEffect(() => { if (!run) return undefined; const id = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(id); }, [!!run]);
  const start = () => {
    const pool = buildPoolFromBanks(state.questionBanks.filter((b) => (b.questions || []).length), PACE_N);
    const list = pool.map((it) => { const b = state.questionBanks.find((x) => x.id === it.bankId); return { b, q: (b.questions || []).find((x) => x.id === it.qId) }; }).filter((x) => x.q);
    if (!list.length) return;
    setDone(null); setRun({ list, i: 0, t0: Date.now(), qt0: Date.now(), recs: [], skipped: [], show: false });
  };
  if (run) {
    const cur = run.list[run.i];
    const qs = Math.floor((now - run.qt0) / 1000), total = Math.floor((now - run.t0) / 1000);
    const budget = run.list.length * PACE_SEC, ideal = Math.min(budget, (run.recs.length) * PACE_SEC);
    const over = qs > PACE_SEC;
    const finish = (recs) => {
      const sec = Math.round((Date.now() - run.t0) / 1000);
      const ok = recs.filter((r) => r.ok).length;
      actions.logPace({ n: recs.length, ok, sec, over: recs.filter((r) => r.sec > PACE_SEC).length });
      SFX.play("result");
      setDone({ recs, sec, ok, budget }); setRun(null);
    };
    const answer = (correct, meta) => {
      window.dispatchEvent(new CustomEvent("sq-record-answer", { detail: { bankId: cur.b.id, qId: cur.q.id, correct, meta } }));
      const recs = [...run.recs, { b: cur.b, q: cur.q, sec: qs + (run.skipped.find((x) => x.id === cur.q.id) || { sec: 0 }).sec, ok: correct }];
      if (run.i + 1 >= run.list.length) { finish(recs); return; }
      setRun({ ...run, i: run.i + 1, qt0: Date.now(), recs, show: false });
    };
    const skip = () => { // 迷ったら次へ：最後にもう一度出す（1問1回まで）
      if (run.skipped.some((x) => x.id === cur.q.id) || run.i + 1 >= run.list.length) return;
      const list = [...run.list.slice(0, run.i), ...run.list.slice(run.i + 1), cur];
      setRun({ ...run, list, qt0: Date.now(), skipped: [...run.skipped, { id: cur.q.id, sec: qs }], show: false });
    };
    const canSkip = !run.skipped.some((x) => x.id === cur.q.id) && run.i + 1 < run.list.length;
    return (
      <Box title={`時間配分トレーニング　${run.i + 1} / ${run.list.length}`} icon={<Clock size={18} />}>
        <div className="jp space-y-2">
          <div className="flex items-center gap-2 text-[11px]">
            <span style={{ fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 18, color: over ? "#c9564e" : "var(--ink)" }}>{Math.floor(qs / 60)}:{String(qs % 60).padStart(2, "0")}</span>
            <span className="flex-1" style={{ color: "var(--ink-soft)" }}>この問題（目安 2:30）　合計 {Math.floor(total / 60)}:{String(total % 60).padStart(2, "0")} / 予定 {Math.floor(ideal / 60)}:{String(ideal % 60).padStart(2, "0")}{total > ideal + PACE_SEC ? <b style={{ color: "#c9564e" }}>　遅れ気味</b> : null}</span>
            <button onClick={() => { if (confirm("やめますか？（解いた問題の記録は残ります）")) setRun(null); }} className="btn-ghost text-[10px] px-2 py-0.5">やめる</button>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: "var(--beige)", overflow: "hidden" }}><div style={{ width: `${Math.min(100, (qs / PACE_SEC) * 100)}%`, height: "100%", background: over ? "#c9564e" : qs > PACE_SEC * 0.7 ? "#d6b56a" : "#6d8454", transition: "width .5s linear" }} /></div>
          {over && <div className="text-[11px] text-center" style={{ color: "#c9564e", fontWeight: 800 }}>⏰ 2分半を過ぎました。本番なら「迷ったら次へ」の場面です</div>}
          <div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>{cur.b.name}{run.skipped.some((x) => x.id === cur.q.id) ? "　（あとまわしにした問題）" : ""}</div>
          <div className="qtext text-base px-1" style={{ color: "var(--ink)", lineHeight: 1.8 }}>{renderQText(cur.q.q, cur.q.q_formats, cur.q.a)}</div>
          {run.show ? (<>
            <div className="qtext text-base p-2" style={{ background: "var(--sky-pale)", border: "1px solid var(--gold)", color: "var(--ink)" }}>{renderFormattedText(cur.q.a, cur.q.a_formats)}</div>
            <AnswerPanel onAnswer={answer} question={cur.q} srSettings={effectiveSr(state)} />
          </>) : (
            <div className="grid grid-cols-3 gap-2">
              <button onClick={skip} disabled={!canSkip} className="btn-ghost py-2 text-xs" style={{ opacity: canSkip ? 1 : 0.4 }}>迷ったら次へ ⏭</button>
              <button onClick={() => setRun({ ...run, show: true })} className="btn-info py-2 text-sm col-span-2"><Eye size={14} /> 答えを見る</button>
            </div>
          )}
        </div>
      </Box>
    );
  }
  const log = ((normRpg(state.rpg).pace || {}).log || []).slice(-6);
  return (
    <Box title="時間配分トレーニング" icon={<Clock size={18} />}>
      <div className="jp space-y-2">
        <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>本番の択一は1問あたり約2分半。そのペースで{PACE_N}問を解きます。1問ごとの時間と、全体の遅れ・進みを見ながら、「迷ったら次へ」で後回しにする判断も練習します。</p>
        {done && (
          <div className="px-2 py-2" style={{ background: "var(--cream)", border: "1px solid var(--gold)", borderRadius: 8 }}>
            <div className="flex items-baseline gap-2"><span style={{ fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 22, color: "var(--gold)" }}>{done.ok} / {done.recs.length}</span><span className="text-[11px]" style={{ color: done.sec <= done.budget ? "var(--sage)" : "#c9564e", fontWeight: 800 }}>{Math.floor(done.sec / 60)}分{done.sec % 60}秒（予定 {Math.floor(done.budget / 60)}分）{done.sec <= done.budget ? "時間内！" : "時間オーバー"}</span></div>
            {done.recs.map((r, i) => <div key={i} className="flex items-center gap-1.5 text-[10px] mt-0.5"><span style={{ width: 14, color: r.ok ? "var(--sage)" : "#c9564e" }}>{r.ok ? "○" : "✕"}</span><span style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--beige)", overflow: "hidden" }}><span style={{ display: "block", width: `${Math.min(100, (r.sec / (PACE_SEC * 2)) * 100)}%`, height: "100%", background: r.sec > PACE_SEC ? "#c9564e" : "#6d8454" }} /></span><span style={{ width: 40, textAlign: "right", color: r.sec > PACE_SEC ? "#c9564e" : "var(--ink-soft)" }}>{Math.floor(r.sec / 60)}:{String(r.sec % 60).padStart(2, "0")}</span></div>)}
            {done.recs.some((r) => r.sec > PACE_SEC) && <p className="text-[10px] mt-1" style={{ color: "var(--ink-soft)" }}>赤い問題は時間を使いすぎた問題です。本番では印を付けて後回しにし、最後に戻る練習をしましょう。</p>}
          </div>
        )}
        <button onClick={start} className="btn-primary w-full py-2">{PACE_N}問に挑戦する（目安 {Math.round((PACE_N * PACE_SEC) / 60)}分）</button>
        {log.length > 0 && <p className="text-[10px]" style={{ color: "var(--ink-mute)" }}>最近：{log.map((l) => `${l.ok}/${l.n}・${Math.round(l.sec / 60)}分`).join("　")}</p>}
      </div>
    </Box>
  );
}

// ── 条文の音読モード：よく出る条文を読み上げ、聞き終わったら穴埋めを1問 ──
function LawListen({ state, actions }) {
  const counts = lawRefCounts(state);
  const laws = lawsInScope(state).filter((l) => counts[l.key] && Object.keys(counts[l.key]).length); // 選んでいる資格の法令だけ
  const [law0, setLaw] = useState(laws[0] ? laws[0].key : "fudosan-ho");
  const law = laws.some((l) => l.key === law0) || !laws.length ? law0 : laws[0].key;
  const [run, setRun] = useState(null); // { list:[{a, c}], i, phase: "read"|"quiz", pick:{}, checked, ok }
  const [rate, setRate] = useState(1);
  const can = typeof window !== "undefined" && "speechSynthesis" in window;
  const stop = () => { try { window.speechSynthesis.cancel(); } catch (e) { /* 無視 */ } };
  useEffect(() => () => stop(), []);
  const speak = (art) => {
    stop();
    const text = [`${(LAW_BY_KEY[law] || {}).name || ""}、${art.t}`, art.c, ...(art.p || []).map((p) => [p.s, ...(p.i || []).map((it) => `${it.t}、${it.s}`)].join("。"))].filter(Boolean).join("。");
    const u = new window.SpeechSynthesisUtterance(text); u.lang = "ja-JP"; u.rate = rate;
    u.onend = () => setRun((r) => (r && r.phase === "read" ? { ...r, phase: "quiz" } : r));
    window.speechSynthesis.speak(u);
  };
  const start = () => {
    loadLaw(law).then((d) => {
      if (!d) { alert("条文データを読み込めませんでした。"); return; }
      const c = counts[law] || {};
      const arts = shuffle((d.articles || []).filter((a) => c[a.n] && (a.p || []).length)).sort((x, y) => (c[y.n] || 0) - (c[x.n] || 0) + (Math.random() - 0.5) * 4);
      const list = [];
      for (const a of arts) { const cz = clozeFromArticle(law, a); if (cz) list.push({ a, c: cz }); if (list.length >= 5) break; }
      if (!list.length) { alert("問題を作れませんでした。"); return; }
      setRun({ list, i: 0, phase: "read", pick: {}, checked: null, ok: 0 });
      speak(list[0].a);
    });
  };
  if (!can) return null;
  if (run) {
    const it = run.list[run.i], c = it.c;
    const next = () => {
      if (run.i + 1 >= run.list.length) { actions.logLawListen(run.list.length, run.ok); SFX.play("result"); stop(); setRun({ ...run, phase: "done" }); return; }
      const nr = { ...run, i: run.i + 1, phase: "read", pick: {}, checked: null };
      setRun(nr); speak(run.list[run.i + 1].a);
    };
    if (run.phase === "done") return (
      <Box title="条文の音読モード" icon={<ScrollIcon size={18} />}>
        <div className="jp text-center py-2"><div style={{ fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 26, color: "var(--gold)" }}>{run.ok} / {run.list.length}</div><p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>耳で聞いた条文の穴埋め。おつかれさまでした！</p>
          <button onClick={() => setRun(null)} className="btn-primary px-6 py-1.5 mt-2 text-sm">もどる</button></div>
      </Box>
    );
    const allPicked = c.blanks.every((_, k) => run.pick[k] != null);
    return (
      <Box title={`条文の音読モード　${run.i + 1} / ${run.list.length}`} icon={<ScrollIcon size={18} />}>
        <div className="jp space-y-2">
          <div className="flex items-center gap-2 text-[11px]"><span className="flex-1" style={{ fontWeight: 800, color: "var(--ink)" }}>{c.head}</span><button onClick={() => { stop(); setRun(null); }} className="btn-ghost text-[10px] px-2 py-0.5">やめる</button></div>
          {run.phase === "read" ? (
            <div className="text-center py-4">
              <div style={{ fontSize: 34, animation: "sqxPulse 1.2s ease-in-out infinite" }}>🔊</div>
              <p className="text-sm mt-1" style={{ color: "var(--ink)" }}>条文を読み上げています。耳をすませて…</p>
              <div className="flex justify-center gap-2 mt-2"><button onClick={() => speak(it.a)} className="btn-ghost text-[11px] px-2 py-1">もう一度</button><button onClick={() => { stop(); setRun({ ...run, phase: "quiz" }); }} className="btn-sky text-[11px] px-2 py-1">穴埋めへ ▶</button></div>
            </div>
          ) : (<>
            <div className="text-sm px-3 py-2" style={{ background: "var(--cream)", border: "1px solid var(--rule-soft)", borderRadius: 8, lineHeight: 1.9, color: "var(--ink)", fontFamily: "'Shippori Mincho B1', serif" }}>
              {c.parts.map((x, k) => { if (typeof x === "string") return <span key={k}>{x}</span>; const b = c.blanks[x.blank]; const ok = run.checked && run.checked[x.blank]; if (run.checked) return <span key={k} style={{ fontWeight: 800, color: ok ? "var(--sage)" : "#c9564e", borderBottom: `2px solid ${ok ? "var(--sage)" : "#c9564e"}` }}>{b.word}</span>; const sel = run.pick[x.blank]; return <span key={k} style={{ display: "inline-block", minWidth: 48, padding: "0 6px", margin: "0 2px", border: "1.5px solid var(--gold)", borderRadius: 4, background: "var(--paper)", color: sel ? "var(--ink)" : "var(--gold)", fontWeight: 800, textAlign: "center", lineHeight: 1.5 }}>{sel || `（${BLANK_LABELS[x.blank]}）`}</span>; })}
            </div>
            {c.blanks.map((b, k) => (
              <div key={k} className="grid grid-cols-2 gap-1.5">
                {b.options.map((o) => { const on = run.pick[k] === o; const right = run.checked && o === b.word; return <button key={o} disabled={!!run.checked} onClick={() => setRun((r) => ({ ...r, pick: { ...r.pick, [k]: o } }))} className="text-xs px-2 py-2" style={{ borderRadius: 8, border: `1.5px solid ${right ? "var(--sage)" : on ? "var(--gold)" : "var(--rule-soft)"}`, background: right ? "rgba(109,132,84,0.12)" : on ? "var(--cream)" : "var(--paper)", color: "var(--ink)", fontWeight: on ? 800 : 500 }}>{o}</button>; })}
              </div>
            ))}
            {!run.checked ? <button disabled={!allPicked} onClick={() => { const good = c.blanks.map((b, k) => run.pick[k] === b.word); SFX.play(good.every(Boolean) ? "defeat" : "miss"); setRun({ ...run, checked: good, ok: run.ok + (good.every(Boolean) ? 1 : 0) }); }} className="btn-primary w-full py-2" style={{ opacity: allPicked ? 1 : 0.5 }}>答え合わせ</button>
              : <button onClick={next} className="btn-primary w-full py-2">{run.i + 1 >= run.list.length ? "結果を見る" : "次の条文を聞く"}</button>}
          </>)}
        </div>
      </Box>
    );
  }
  const ll = normRpg(state.rpg).lawListen || {};
  return (
    <Box title="条文の音読モード" icon={<ScrollIcon size={18} />}>
      <div className="jp space-y-2">
        <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>問題によく出る条文を読み上げます。聞き終わったら、その条文の穴埋めを1問。移動中や家事の合間に、耳で条文に触れられます（5条文）。</p>
        <div className="flex flex-wrap gap-1.5 text-[11px]">{laws.map((l) => <button key={l.key} onClick={() => setLaw(l.key)} className="px-2.5 py-0.5" style={{ borderRadius: 999, border: `1px solid ${law === l.key ? "var(--gold)" : "var(--rule-soft)"}`, background: law === l.key ? "var(--cream)" : "var(--paper)", color: "var(--ink)", fontWeight: law === l.key ? 800 : 500 }}>{l.short}</button>)}</div>
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--ink-soft)" }}>読む速さ {[0.8, 1, 1.2, 1.5].map((v) => <button key={v} onClick={() => setRate(v)} className="px-2 py-0.5" style={{ borderRadius: 999, border: `1px solid ${rate === v ? "var(--gold)" : "var(--rule-soft)"}`, background: rate === v ? "var(--cream)" : "var(--paper)", color: "var(--ink)" }}>{v}倍</button>)}</div>
        <button onClick={start} disabled={!laws.length} className="btn-primary w-full py-2">🔊 聞きはじめる</button>
        {ll.n ? <p className="text-[10px]" style={{ color: "var(--ink-mute)" }}>これまで {ll.n}条を聞いて、{ll.ok}問正解</p> : null}
      </div>
    </Box>
  );
}

// ── 1. 期限・数字の一覧表と暗記クイズ：答えが○の問題文から、期限・数字を集める ──
const NUM_PICK = /(?:[一二三四五六七八九十百]+|\d+)(?:年|箇月|か月|ヶ月|月|週間|日|時間)(?:以内|以上|以下|未満|を経過|前|後)?|[一二三四五六七八九十百]+分の[一二三四五六七八九十]+|過半数/g;
const numUnit = (w) => (w.match(/年|箇月|か月|ヶ月|月|週間|日|時間|分の|過半数/) || [""])[0].replace(/箇月|か月|ヶ月/, "月");
const numDeckCache = new WeakMap();
function numberDeck(state) {
  const c = numDeckCache.get(state.questionBanks);
  if (c) return c;
  const items = [];
  state.questionBanks.forEach((b) => (b.questions || []).forEach((q) => {
    if (q.excluded || !isTrueAnswer(q.a)) return;
    const t = String(q.q || "");
    const ms = t.match(NUM_PICK);
    if (!ms || ms.length !== 1 || t.split(ms[0]).length !== 2) return; // 数字が1つだけの正しい文
    items.push({ b, q, num: ms[0], unit: numUnit(ms[0]) });
  }));
  numDeckCache.set(state.questionBanks, items);
  return items;
}
function NumberDeck({ state, actions }) {
  const deck = numberDeck(state);
  const [view, setView] = useState(null); // null | table | quiz
  const [run, setRun] = useState(null); // { list:[{it, opts}], i, pick, ok }
  if (deck.length < 4) return null;
  const groups = new Map(); deck.forEach((it) => { if (!groups.has(it.num)) groups.set(it.num, []); groups.get(it.num).push(it); });
  const startQuiz = () => {
    const list = shuffle(deck).slice(0, 8).map((it) => {
      const same = [...new Set(deck.filter((x) => x.unit === it.unit && x.num !== it.num).map((x) => x.num))];
      const other = [...new Set(deck.filter((x) => x.num !== it.num).map((x) => x.num))];
      const opts = shuffle([it.num, ...shuffle(same).slice(0, 3), ...shuffle(other.filter((o) => !same.includes(o))).slice(0, Math.max(0, 3 - same.length))].slice(0, 4));
      return { it, opts };
    }).filter((x) => x.opts.length >= 2);
    setRun({ list, i: 0, pick: null, ok: 0 }); setView("quiz");
  };
  if (view === "quiz" && run) {
    const cur = run.list[run.i];
    if (!cur) return (
      <Box title="期限・数字の暗記クイズ" icon={<Calendar size={18} />}>
        <div className="jp text-center py-2"><div style={{ fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 26, color: "var(--gold)" }}>{run.ok} / {run.list.length}</div><button onClick={() => { setRun(null); setView(null); }} className="btn-primary px-6 py-1.5 mt-2 text-sm">もどる</button></div>
      </Box>
    );
    const [pre, post] = String(cur.it.q.q).split(cur.it.num);
    const answered = run.pick !== null;
    return (
      <Box title={`期限・数字の暗記クイズ　${run.i + 1} / ${run.list.length}`} icon={<Calendar size={18} />}>
        <div className="jp space-y-2">
          <div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>{cur.it.b.name}</div>
          <div className="text-sm px-3 py-2" style={{ background: "var(--cream)", border: "1px solid var(--rule-soft)", borderRadius: 8, lineHeight: 1.9, color: "var(--ink)" }}>{pre}<span style={{ display: "inline-block", minWidth: 56, padding: "0 6px", margin: "0 2px", border: "1.5px solid var(--gold)", borderRadius: 4, background: "var(--paper)", fontWeight: 800, textAlign: "center", color: answered ? (run.pick === cur.it.num ? "var(--sage)" : "#c9564e") : "var(--gold)" }}>{answered ? cur.it.num : "？"}</span>{post}</div>
          <div className="grid grid-cols-2 gap-1.5">
            {cur.opts.map((o) => { const right = answered && o === cur.it.num, bad = answered && run.pick === o && o !== cur.it.num; return <button key={o} disabled={answered} onClick={() => { const g = o === cur.it.num; SFX.play(g ? "defeat" : "miss"); setRun({ ...run, pick: o, ok: run.ok + (g ? 1 : 0) }); }} className="text-sm px-2 py-2" style={{ borderRadius: 8, border: `1.5px solid ${right ? "var(--sage)" : bad ? "#c9564e" : "var(--rule-soft)"}`, background: right ? "rgba(109,132,84,0.12)" : bad ? "rgba(201,86,78,0.08)" : "var(--paper)", color: "var(--ink)", fontWeight: right ? 800 : 500 }}>{o}</button>; })}
          </div>
          {answered && <button onClick={() => { if (run.i + 1 >= run.list.length) { actions.logNumQuiz(run.list.length, run.ok); SFX.play("result"); } setRun({ ...run, i: run.i + 1, pick: null }); }} className="btn-primary w-full py-2">{run.i + 1 >= run.list.length ? "結果を見る" : "次へ"}</button>}
        </div>
      </Box>
    );
  }
  return (
    <Box title="期限・数字の一覧表" icon={<Calendar size={18} />}>
      <div className="jp space-y-2">
        <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>正しい（答えが○の）問題文から、期限や数字（1月以内・2週間・3分の2 など）を集めました。数字ごとの一覧で見比べ、クイズで固めましょう（{deck.length}問・{groups.size}種類）。</p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setView(view === "table" ? null : "table")} className="btn-ghost py-2 text-sm">{view === "table" ? "一覧を閉じる" : "📋 一覧表を見る"}</button>
          <button onClick={startQuiz} disabled={groups.size < 2} title={groups.size < 2 ? "数字が2種類以上あると出題できます" : undefined} className="btn-primary py-2 text-sm" style={{ opacity: groups.size < 2 ? 0.5 : 1 }}>数字クイズ（8問）</button>
        </div>
        {view === "table" && [...groups.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([num, its]) => (
          <div key={num} className="px-2 py-1.5" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 6 }}>
            <div className="text-xs" style={{ fontWeight: 800, color: "var(--gold)" }}>{num}<span className="text-[10px] ml-1" style={{ color: "var(--ink-mute)", fontWeight: 500 }}>{its.length}件</span></div>
            {its.slice(0, 8).map(({ q, b }) => <div key={q.id} className="text-[11px]" style={{ color: "var(--ink)", lineHeight: 1.6 }}>・{String(q.q).replace(num, `【${num}】`)}<span className="text-[9px] ml-1" style={{ color: "var(--ink-mute)" }}>{b.name}</span></div>)}
          </div>
        ))}
        {(normRpg(state.rpg).numQuiz || {}).n ? <p className="text-[10px]" style={{ color: "var(--ink-mute)" }}>これまで {(normRpg(state.rpg).numQuiz || {}).n}問中 {(normRpg(state.rpg).numQuiz || {}).ok}問正解</p> : null}
      </div>
    </Box>
  );
}

// ── 3. 記述式（書式）の自己点検シート ──
const SHO_CHECKS = [
  { id: "purpose", name: "登記の目的" }, { id: "cause", name: "登記原因とその日付" }, { id: "applicant", name: "申請人（表題部所有者・所有権の登記名義人など）" },
  { id: "attach", name: "添付情報の漏れ" }, { id: "plan", name: "図面（地積測量図・建物図面・各階平面図）" }, { id: "area", name: "地積・床面積の計算と端数処理" },
  { id: "coord", name: "座標・辺長の計算" }, { id: "lot", name: "地番・家屋番号の付け方" }, { id: "struct", name: "種類・構造の書き方" }, { id: "time", name: "時間配分（書き切れなかった）" },
];
function ShoshikiCheck({ state, actions }) {
  const [miss, setMiss] = useState([]);
  const [saved, setSaved] = useState(false);
  const log = (normRpg(state.rpg).shoCheck || {}).log || [];
  const cnt = {}; log.forEach((l) => (l.miss || []).forEach((id) => { cnt[id] = (cnt[id] || 0) + 1; }));
  const worst = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return (
    <Box title="書式の自己点検シート" icon={<Pencil size={18} />}>
      <div className="jp space-y-2">
        <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>書式（記述）を1問解いたら、<b>まちがえた・あやしかった項目</b>に☑を付けて記録します。毎回落とす項目が見えてきます。</p>
        <div className="grid grid-cols-1 gap-1">
          {SHO_CHECKS.map((c) => { const on = miss.includes(c.id); return <button key={c.id} onClick={() => { setSaved(false); setMiss(on ? miss.filter((x) => x !== c.id) : [...miss, c.id]); }} className="text-left text-[12px] px-2 py-1" style={{ borderRadius: 6, border: `1px solid ${on ? "#c9564e" : "var(--rule-soft)"}`, background: on ? "rgba(201,86,78,0.07)" : "var(--paper)", color: "var(--ink)" }}>{on ? "☑" : "☐"} {c.name}{cnt[c.id] ? <span className="text-[10px] ml-1" style={{ color: "#c9564e" }}>（これまで{cnt[c.id]}回）</span> : null}</button>; })}
        </div>
        <button onClick={() => { actions.logShoCheck(miss); setMiss([]); setSaved(true); }} className="btn-primary w-full py-2 text-sm">{miss.length ? `この${miss.length}項目を記録する` : "全部できた！として記録する"}</button>
        {saved && <p className="text-[11px] text-center" style={{ color: "var(--sage)", fontWeight: 800 }}>記録しました。</p>}
        {worst.length > 0 && <p className="text-[11px]" style={{ color: "var(--ink)" }}>よく落とす項目：{worst.map(([id, n]) => `${(SHO_CHECKS.find((c) => c.id === id) || {}).name}（${n}回）`).join("・")}<span className="text-[10px] ml-1" style={{ color: "var(--ink-mute)" }}>{log.length}回の記録から</span></p>}
      </div>
    </Box>
  );
}
// 本番リハーサルの時間帯ごとの成績（午前・午後・夜。記録の h＝始めた時間）
function RehearsalBands({ log }) {
  const bands = [["午前", (h) => h < 12], ["午後（本番の時間）", (h) => h >= 12 && h < 17], ["夕方・夜", (h) => h >= 17]].map(([nm, f]) => {
    const xs = log.filter((e) => typeof e.h === "number" && f(e.h));
    const sc = xs.map((e) => (e.full && e.total != null ? e.total : e.mc * 2));
    return { nm, n: xs.length, avg: sc.length ? Math.round((sc.reduce((a, b) => a + b, 0) / sc.length) * 10) / 10 : null };
  });
  if (!bands.some((b) => b.n)) return <div className="text-[10px] mb-2" style={{ color: "var(--ink-mute)" }}>これからのリハーサルは、解いた時間帯ごとの成績も残します（本番は13時から）。</div>;
  return (
    <div className="grid grid-cols-3 gap-1.5 mb-2">
      {bands.map((b) => <div key={b.nm} className="text-center py-1" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 8 }}><div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>{b.nm}</div><div className="text-[13px]" style={{ fontWeight: 800, color: "var(--ink)" }}>{b.avg != null ? `${b.avg}点` : "－"}</div><div className="text-[9px]" style={{ color: "var(--ink-mute)" }}>{b.n}回（100点満点）</div></div>)}
    </div>
  );
}

export { TrainingRoom };
