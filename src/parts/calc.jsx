// CalcTab とその部品（2026-10-26、App.jsx から切り出し。開いたときに読み込む）
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
import { ART_URL, Box, KEYCAP, KeySeq, PAST_TOTAL, PastSection, YearFigures, chipSt, curWorld, homeSide, normRpg, pastInp, shuffle, todayStr, usePastData } from "../App.jsx";


// ── 作図ドリル：方眼（1目盛り＝1m）に座標どおり点を打ち、土地や建物の形を描く（問題づくりは src/game/calc.js） ──
function SakuzuDrill({ state, actions }) {
  const log = normRpg(state.rpg).sakuzu || [];
  const [type, setType] = useState("land");
  const [prob, setProb] = useState(null);
  const [pts, setPts] = useState([]);
  const [checked, setChecked] = useState(null); // [true/false…]
  const [t0, setT0] = useState(0);
  const [msg, setMsg] = useState("");
  const svgRef = useRef(null);
  const start = (t = type) => { setProb(makeSakuzuProblem(t)); setPts([]); setChecked(null); setT0(Date.now()); setMsg(""); };
  const recent = log.slice(-10), rn = recent.reduce((a, e) => a + e.n, 0), rok = recent.reduce((a, e) => a + e.ok, 0);
  const chip = (on) => ({ borderRadius: 999, border: `1px solid ${on ? "var(--gold)" : "var(--rule-soft)"}`, background: on ? "var(--cream)" : "var(--paper)", color: "var(--ink)", fontWeight: on ? 800 : 500, cursor: "pointer" });
  if (!prob) return (
    <Box title="作図ドリル（方眼に描く）" icon={<GameIcon ch="📜" painted="c22" size={24} />}>
      <p className="jp text-[11px] mb-2" style={{ color: "var(--ink-soft)" }}>座標の表を見ながら、方眼（1目盛り＝1m・上が北）に点を打って図を描きます。書式の作図の練習です。点は近くの目盛りに吸い付きます。</p>
      <div className="jp flex flex-wrap gap-1.5 mb-2">{SAKUZU_TYPES.map((t) => <button key={t.id} onClick={() => setType(t.id)} className="text-xs px-3 py-1" style={chip(type === t.id)}>{t.name}</button>)}</div>
      <button onClick={() => start()} className="jp btn-primary w-full py-2">作図を始める</button>
      {rn > 0 && <p className="jp text-[10px] mt-2 text-right" style={{ color: "var(--ink-mute)" }}>直近10回の正確さ <b style={{ color: rok / rn >= 0.9 ? "var(--gold)" : "var(--ink)" }}>{Math.round((rok / rn) * 100)}%</b>（{log.length}回）</p>}
    </Box>
  );
  const S = prob.size, pad = 2.6, VB = S + pad * 2;
  // 画面の座標：横＝Y（東）、縦＝X（北が上）
  const sx = (Y) => pad + (Y - prob.base.Y), sy = (X) => pad + (S - (X - prob.base.X));
  const n = prob.targets.length;
  const tap = (e) => {
    if (checked || pts.length >= n) return;
    const svg = svgRef.current; if (!svg) return;
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    const Y = Math.round(p.x - pad) + prob.base.Y, X = Math.round(S - (p.y - pad)) + prob.base.X;
    if (X < prob.base.X || X > prob.base.X + S || Y < prob.base.Y || Y > prob.base.Y + S) return;
    SFX.play("clang");
    setPts([...pts, { X, Y }]);
  };
  const check = () => {
    const res = prob.targets.map((t, i) => pts[i] && pts[i].X === t.X && pts[i].Y === t.Y);
    const ok = res.filter(Boolean).length;
    setChecked(res);
    SFX.play(ok === n ? "levelup" : "miss");
    setMsg(actions.logSakuzu({ type: prob.type, n, ok, sec: (Date.now() - t0) / 1000 }));
  };
  const poly = (list, close) => list.map((q) => `${sx(q.Y)},${sy(q.X)}`).join(" ") + (close && list.length > 2 ? ` ${sx(list[0].Y)},${sy(list[0].X)}` : "");
  const ok = checked ? checked.filter(Boolean).length : 0;
  return (
    <Box title={`作図ドリル　${prob.type === "land" ? "土地の形" : "建物の位置"}`} icon={<Pencil size={18} />}>
      <div className="jp space-y-2">
        <p className="text-xs" style={{ color: "var(--ink)", fontWeight: 700 }}>{prob.ask}</p>
        <table className="w-full text-[11px]" style={{ borderCollapse: "collapse" }}>
          <thead><tr style={{ color: "var(--ink-mute)" }}><th className="text-left font-normal">点</th>{prob.targets.map((t) => <th key={t.name} className="font-normal" style={{ color: pts.length === prob.targets.indexOf(t) && !checked ? "var(--gold)" : undefined }}>{t.name}</th>)}</tr></thead>
          <tbody>
            <tr style={{ borderTop: "1px solid var(--rule-soft)" }}><td style={{ color: "var(--ink-mute)" }}>X</td>{prob.targets.map((t) => <td key={t.name} className="text-center" style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>{t.X}</td>)}</tr>
            <tr style={{ borderTop: "1px solid var(--rule-soft)" }}><td style={{ color: "var(--ink-mute)" }}>Y</td>{prob.targets.map((t) => <td key={t.name} className="text-center" style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>{t.Y}</td>)}</tr>
          </tbody>
        </table>
        <svg ref={svgRef} viewBox={`0 0 ${VB} ${VB}`} width="100%" onPointerDown={tap} style={{ display: "block", maxWidth: 420, margin: "0 auto", background: "#fffdf6", border: "1px solid var(--rule-soft)", borderRadius: 6, touchAction: "manipulation", cursor: checked ? "default" : "crosshair" }} aria-label="作図の方眼">
          {Array.from({ length: S + 1 }, (_, i) => (
            <g key={i}>
              <line x1={sx(prob.base.Y + i)} x2={sx(prob.base.Y + i)} y1={pad} y2={pad + S} stroke={i % 5 === 0 ? "#c9b98f" : "#ece4cf"} strokeWidth={i % 5 === 0 ? 0.08 : 0.04} />
              <line y1={sy(prob.base.X + i)} y2={sy(prob.base.X + i)} x1={pad} x2={pad + S} stroke={i % 5 === 0 ? "#c9b98f" : "#ece4cf"} strokeWidth={i % 5 === 0 ? 0.08 : 0.04} />
              {i % 5 === 0 && <text x={sx(prob.base.Y + i)} y={pad + S + 1.4} fontSize="0.9" textAnchor="middle" fill="#8a96b0">{prob.base.Y + i}</text>}
              {i % 5 === 0 && <text x={pad - 0.4} y={sy(prob.base.X + i) + 0.3} fontSize="0.9" textAnchor="end" fill="#8a96b0">{prob.base.X + i}</text>}
            </g>
          ))}
          <text x={pad} y={1.2} fontSize="0.9" fill="#8a96b0">X（北）↑　1目盛り＝1m</text>
          <text x={pad + S} y={pad + S + 2.4} fontSize="0.9" textAnchor="end" fill="#8a96b0">Y（東）→</text>
          {prob.given.length > 0 && <polygon points={poly(prob.given)} fill="rgba(127,163,216,0.12)" stroke="#4f6fa8" strokeWidth="0.12" />}
          {prob.given.map((q) => <g key={q.name}><circle cx={sx(q.Y)} cy={sy(q.X)} r="0.28" fill="#4f6fa8" /><text x={sx(q.Y) + 0.4} y={sy(q.X) - 0.4} fontSize="0.9" fill="#4f6fa8" fontWeight="700">{q.name}</text></g>)}
          {checked && <polygon points={poly(prob.targets)} fill="rgba(109,132,84,0.12)" stroke="#6d8454" strokeWidth="0.1" strokeDasharray="0.4 0.3" />}
          {pts.length > 1 && <polyline points={poly(pts, pts.length === n)} fill={pts.length === n ? "rgba(214,181,106,0.18)" : "none"} stroke="#b08a3e" strokeWidth="0.16" strokeLinejoin="round" />}
          {pts.map((q, i) => { const bad = checked && !checked[i]; return <g key={i}><circle cx={sx(q.Y)} cy={sy(q.X)} r="0.38" fill={checked ? (bad ? "#c9564e" : "#6d8454") : "#22335c"} /><text x={sx(q.Y) + 0.45} y={sy(q.X) - 0.45} fontSize="1" fontWeight="800" fill={bad ? "#c9564e" : "#22335c"}>{prob.targets[i].name}</text></g>; })}
          {checked && prob.targets.map((t, i) => (!checked[i] ? <g key={`c${i}`}><circle cx={sx(t.Y)} cy={sy(t.X)} r="0.42" fill="none" stroke="#6d8454" strokeWidth="0.14" /><text x={sx(t.Y) - 0.5} y={sy(t.X) + 1.2} fontSize="0.85" fill="#6d8454" fontWeight="700">正{t.name}</text></g> : null))}
        </svg>
        {!checked ? (
          <div className="grid grid-cols-3 gap-1.5">
            <button onClick={() => setPts(pts.slice(0, -1))} disabled={!pts.length} className="btn-ghost py-2 text-xs" style={{ opacity: pts.length ? 1 : 0.4 }}>1つ戻す</button>
            <button onClick={() => setPts([])} disabled={!pts.length} className="btn-ghost py-2 text-xs" style={{ opacity: pts.length ? 1 : 0.4 }}>やり直す</button>
            <button onClick={check} disabled={pts.length < n} className="btn-primary py-2 text-xs" style={{ opacity: pts.length < n ? 0.4 : 1 }}>採点する</button>
          </div>
        ) : (
          <>
            <div className="text-center text-sm" style={{ fontWeight: 800, color: ok === n ? "var(--gold)" : "#c9564e" }}>{ok === n ? "完璧です！ 図面が完成しました" : `${n}点のうち ${ok}点が正しい位置です`}</div>
            {ok < n && <p className="text-[11px] text-center" style={{ color: "var(--ink-soft)" }}>緑の丸「正」が正しい位置です。X（北）と Y（東）を取り違えていないか確かめましょう。</p>}
            {msg && <div className="text-xs text-center" style={{ color: "var(--gold)", fontWeight: 700 }}>報酬：{msg}</div>}
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={() => start(prob.type)} className="btn-primary py-2 text-sm">次の図へ</button>
              <button onClick={() => setProb(null)} className="btn-ghost py-2 text-sm">終わる</button>
            </div>
          </>
        )}
        {!checked && <p className="text-[10px] text-center" style={{ color: "var(--ink-mute)" }}>次に打つ点：<b style={{ color: "var(--gold)" }}>{pts.length < n ? prob.targets[pts.length].name : "（全部打ちました。採点しましょう）"}</b></p>}
      </div>
    </Box>
  );
}

// ── 計算ドリル：座標の計算を、数字を変えて何問でも（問題づくりは src/game/calc.js） ──
function CalcFigure({ prob }) {
  const W = 220, H = 170, pad = 22;
  const xs = prob.pts.map((p) => p.X), ys = prob.pts.map((p) => p.Y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY, 1);
  const k = Math.min((W - pad * 2) / Math.max(maxY - minY, span * 0.3), (H - pad * 2) / Math.max(maxX - minX, span * 0.3));
  const ox = (W - (maxY - minY) * k) / 2, oy = (H - (maxX - minX) * k) / 2;
  const at = (p) => [ox + (p.Y - minY) * k, H - oy - (p.X - minX) * k]; // X＝北（上）、Y＝東（右）
  const byName = Object.fromEntries(prob.pts.map((p) => [p.name, p]));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: 280, display: "block", margin: "0 auto", background: "var(--cream)", border: "1px solid var(--rule-soft)", borderRadius: 8 }} aria-label="図">
      <defs><marker id="cdArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#4f6fa8" /></marker></defs>
      <g fontSize="9" fill="var(--ink-mute)"><text x="8" y="14">X（北）↑</text><text x={W - 52} y={H - 6}>Y（東）→</text></g>
      {prob.poly && <polygon points={prob.pts.map((p) => at(p).join(",")).join(" ")} fill="rgba(214,181,106,0.25)" stroke="#b08a3e" strokeWidth="1.5" />}
      {(prob.lines || []).map(([a, b], i) => { const [x1, y1] = at(byName[a]), [x2, y2] = at(byName[b]); return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#4f6fa8" strokeWidth="1.5" strokeDasharray={byName[b].unknown ? "4 3" : undefined} markerEnd={prob.arrow ? "url(#cdArrow)" : undefined} />; })}
      {prob.pts.map((p) => { const [x, y] = at(p); return (
        <g key={p.name}>
          <circle cx={x} cy={y} r={p.unknown ? 4.5 : 3.5} fill={p.unknown ? "var(--paper)" : "#22335c"} stroke={p.unknown ? "#c9564e" : "none"} strokeWidth="1.5" />
          <text x={x + 6} y={y - 5} fontSize="11" fontWeight="800" fill={p.unknown ? "#c9564e" : "var(--ink)"}>{p.name}{p.unknown ? "?" : ""}</text>
        </g>); })}
    </svg>
  );
}
function CalcDrill({ state, actions }) {
  const log = normRpg(state.rpg).drill || [];
  const [type, setType] = useState("mix");
  const [count, setCount] = useState(5);
  const [run, setRun] = useState(null); // { type, n, i, prob, input, res, ok, sec, t0, results:[] }
  const [done, setDone] = useState(null); // { type, n, ok, sec, msg }
  const tName = (id) => (id === "mix" ? "おまかせ" : (CALC_TYPES.find((t) => t.id === id) || {}).name || id);
  const newProb = (t) => makeCalcProblem(t === "mix" ? null : t);
  const start = () => { setDone(null); setRun({ type, n: count, i: 0, prob: newProb(type), input: {}, res: null, ok: 0, sec: 0, t0: Date.now() }); };
  const check = () => {
    const res = checkCalc(run.prob, run.input);
    SFX.play(res.ok ? "defeat" : "miss");
    setRun({ ...run, res, ok: run.ok + (res.ok ? 1 : 0), sec: run.sec + (Date.now() - run.t0) / 1000 });
  };
  const next = () => {
    if (run.i + 1 >= run.n) {
      const msg = actions.logDrill({ type: run.type, n: run.n, ok: run.ok, sec: run.sec });
      SFX.play("result");
      setDone({ type: run.type, n: run.n, ok: run.ok, sec: run.sec, msg }); setRun(null); return;
    }
    setRun({ ...run, i: run.i + 1, prob: newProb(run.type), input: {}, res: null, t0: Date.now() });
  };
  const setIn = (k, v) => setRun((r) => ({ ...r, input: { ...r.input, [k]: v } }));
  const chip = (on) => ({ borderRadius: 999, border: `1px solid ${on ? "var(--gold)" : "var(--rule-soft)"}`, background: on ? "var(--cream)" : "var(--paper)", color: "var(--ink)", fontWeight: on ? 800 : 500, cursor: "pointer" });
  const fmtSec = (x) => (x >= 60 ? `${Math.floor(x / 60)}分${String(Math.round(x % 60)).padStart(2, "0")}秒` : `${Math.round(x)}秒`);

  if (run) {
    const p = run.prob, res = run.res;
    const known = p.pts.filter((x) => !x.unknown);
    return (
      <Box title={`計算ドリル　${run.i + 1} / ${run.n}問`} icon={<Pencil size={18} />}>
        <div className="jp space-y-2">
          <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--ink-soft)" }}>
            <span className="px-2 py-0.5" style={{ borderRadius: 999, background: "var(--cream)", border: "1px solid var(--gold)", color: "var(--ink)", fontWeight: 700 }}>{tName(p.type)}</span>
            <span className="flex-1" />
            <span>正解 {run.ok}</span>
            <button onClick={() => { if (confirm("ドリルを中断しますか？（記録は残りません）")) setRun(null); }} className="btn-ghost text-[10px] px-2 py-0.5">中断</button>
          </div>
          <CalcFigure prob={p} />
          <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
            <thead><tr style={{ color: "var(--ink-mute)" }}><th className="text-left font-normal py-0.5">点</th><th className="text-right font-normal">X（m）</th><th className="text-right font-normal">Y（m）</th></tr></thead>
            <tbody>{known.map((x) => <tr key={x.name} style={{ borderTop: "1px solid var(--rule-soft)" }}><td className="py-0.5" style={{ fontWeight: 800 }}>{x.name}</td><td className="text-right" style={{ fontVariantNumeric: "tabular-nums" }}>{x.X.toFixed(2)}</td><td className="text-right" style={{ fontVariantNumeric: "tabular-nums" }}>{x.Y.toFixed(2)}</td></tr>)}</tbody>
          </table>
          {p.given && <div className="text-xs space-y-0.5">{p.given.map((g) => <div key={g} style={{ color: "var(--ink)" }}>・{g}</div>)}</div>}
          <p className="text-sm" style={{ color: "var(--ink)", fontWeight: 700 }}>{p.ask}</p>
          <div className="space-y-1.5">
            {p.fields.map((f) => {
              const mark = res ? (res.each[f.key] ? { c: "var(--sage)", t: "○" } : { c: "#c9564e", t: "×" }) : null;
              const box = { borderColor: mark ? mark.c : undefined };
              return (
                <div key={f.key} className="flex items-center gap-2">
                  <span className="text-xs w-16 flex-shrink-0" style={{ fontWeight: 800 }}>{f.label}</span>
                  {f.kind === "dms" ? (
                    <div className="flex items-center gap-1 flex-1">
                      {[["d", "°"], ["m", "′"], ["s", "″"]].map(([k, u]) => (
                        <Fragment key={k}><input type="number" inputMode="numeric" disabled={!!res} className="rpg-input text-center" style={{ ...box, padding: "6px 4px" }} value={(run.input[f.key] || {})[k] || ""} onChange={(e) => setIn(f.key, { ...(run.input[f.key] || {}), [k]: e.target.value })} /><span className="text-xs">{u}</span></Fragment>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 flex-1"><input type="text" inputMode="decimal" disabled={!!res} className="rpg-input" style={box} value={run.input[f.key] || ""} onChange={(e) => setIn(f.key, e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !res) check(); }} /><span className="text-xs">{f.unit}</span></div>
                  )}
                  {mark && <span className="text-base" style={{ color: mark.c, fontWeight: 800, width: 16 }}>{mark.t}</span>}
                </div>
              );
            })}
          </div>
          {!res ? (
            <button onClick={check} className="btn-primary w-full py-2">答え合わせ</button>
          ) : (
            <>
              <div className="px-3 py-2" style={{ background: res.ok ? "rgba(109,132,84,0.1)" : "rgba(201,86,78,0.08)", border: `1px solid ${res.ok ? "var(--sage)" : "#c9564e"}`, borderRadius: 8 }}>
                <div className="text-sm mb-1" style={{ fontWeight: 800, color: res.ok ? "var(--sage)" : "#c9564e" }}>{res.ok ? "正解！" : "おしい！"}　答え：{p.fields.map((f) => `${f.label} ${calcAnsText(f)}`).join("　")}</div>
                <div className="text-[11px] mb-0.5" style={{ color: "var(--ink-mute)" }}>解き方</div>
                {p.steps.map((st, i) => <div key={i} className="text-[11px]" style={{ color: "var(--ink)", fontVariantNumeric: "tabular-nums", wordBreak: "break-all" }}>{st}</div>)}
              </div>
              <button onClick={next} className="btn-primary w-full py-2">{run.i + 1 >= run.n ? "結果を見る" : "次の問題へ"}</button>
            </>
          )}
        </div>
      </Box>
    );
  }

  // 種類ごとの記録
  const stats = CALC_TYPES.map((t) => {
    const l = log.filter((e) => e.type === t.id);
    const recent = l.slice(-5);
    const n = recent.reduce((a, e) => a + e.n, 0), ok = recent.reduce((a, e) => a + e.ok, 0), sec = recent.reduce((a, e) => a + e.sec, 0);
    return { t, times: l.length, acc: n ? ok / n : null, per: n ? sec / n : null };
  });
  const today = log.filter((e) => e.d === todayStr());
  return (
    <Box title="計算ドリル（座標・面積）" icon={<GameIcon ch="⚙️" painted="c20" size={24} />}>
      <p className="jp text-[11px] mb-2" style={{ color: "var(--ink-soft)" }}>記述式で必ず使う座標の計算を、数字を変えて何問でも練習できます。電卓を用意して、速さと正確さをきたえましょう。正解するたびにEXPとゴールド、座標の欠片が手に入ります。</p>
      {done && (
        <div className="jp text-center mb-3 px-3 py-3" style={{ background: "var(--cream)", border: "1px solid var(--gold)", borderRadius: 10, animation: "sqFadeIn .3s ease-out" }}>
          <div className="text-[11px]" style={{ color: "var(--ink-mute)" }}>{tName(done.type)}　{done.n}問の結果</div>
          <div className="text-2xl my-1" style={{ fontWeight: 800, color: done.ok === done.n ? "var(--gold)" : "var(--ink)" }}>{done.ok} / {done.n}問 正解</div>
          <div className="text-xs" style={{ color: "var(--ink-soft)" }}>かかった時間 {fmtSec(done.sec)}（1問あたり {fmtSec(done.sec / done.n)}）</div>
          {done.msg && <div className="text-xs mt-1" style={{ color: "var(--gold)", fontWeight: 700 }}>報酬：{done.msg}</div>}
        </div>
      )}
      <div className="jp space-y-2">
        <div className="text-[10px]" style={{ color: "var(--ink-soft)" }}>問題の種類</div>
        <div className="flex flex-wrap gap-1.5">
          {[["mix", "おまかせ"], ...CALC_TYPES.map((t) => [t.id, t.name])].map(([id, nm]) => <button key={id} onClick={() => setType(id)} className="text-xs px-3 py-1" style={chip(type === id)}>{nm}</button>)}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] mr-1" style={{ color: "var(--ink-soft)" }}>問題数</span>
          {[5, 10].map((n) => <button key={n} onClick={() => setCount(n)} className="text-xs px-3 py-1" style={chip(count === n)}>{n}問</button>)}
        </div>
        <button onClick={start} className="btn-primary w-full py-2">ドリルを始める</button>
      </div>
      <div className="jp mt-3 pt-3" style={{ borderTop: "1px dashed var(--rule-soft)" }}>
        <div className="flex items-center text-[10px] mb-1" style={{ color: "var(--ink-soft)" }}><span className="flex-1">種類ごとの記録（直近5回）</span><span>今日 {today.reduce((a, e) => a + e.n, 0)}問</span></div>
        {stats.map(({ t, times, acc, per }) => (
          <div key={t.id} className="flex items-center gap-2 text-[11px] py-0.5">
            <span className="w-24 truncate" style={{ color: "var(--ink)", fontWeight: 700 }}>{t.name}</span>
            <span className="flex-1" style={{ height: 6, borderRadius: 3, background: "var(--beige)", overflow: "hidden" }}><span className="block" style={{ width: `${(acc || 0) * 100}%`, height: "100%", background: "linear-gradient(90deg, #d6b56a, #b08a3e)" }} /></span>
            <span className="w-10 text-right" style={{ color: acc !== null && acc >= 0.8 ? "var(--gold)" : "var(--ink-soft)", fontWeight: 700 }}>{acc === null ? "－" : `${Math.round(acc * 100)}%`}</span>
            <span className="w-14 text-right" style={{ color: "var(--ink-mute)" }}>{per === null ? "" : `${Math.round(per)}秒/問`}</span>
          </div>
        ))}
      </div>
    </Box>
  );
}

// ── 無線工学の計算ドリル（2026年10月20日。二陸特は電卓が使えないので、暗算・筆算で解ける数字だけ。問題づくりは src/game/radiocalc.js）──
// 1セット10問の4択。記録は rpgActions.logRadioCalc → rpg.radioCalc = { stats:{種類:{n,ok}}, log:[{d,n,ok}] }。選んだ種類は端末の sq-radiocalc-types
function RadioCalcDrill({ state, actions }) {
  const allIds = RADIO_CALC_TYPES.map((t) => t.id);
  const [picked, setPickedRaw] = useState(() => { try { const v = JSON.parse(localStorage.getItem("sq-radiocalc-types") || "null"); if (Array.isArray(v) && v.length) return v.filter((x) => allIds.includes(x)); } catch (e) { /* 端末に保存できないときは全部 */ } return allIds; });
  const setPicked = (v) => { setPickedRaw(v); try { localStorage.setItem("sq-radiocalc-types", JSON.stringify(v)); } catch (e) { /* 保存できなくても続ける */ } };
  const [run, setRun] = useState(null); // { list:[問題], i, recs:[{type, ok}], sel, hint }
  const [done, setDone] = useState(null);
  const [open, setOpen] = useState(false);
  const rec = normRpg(state.rpg).radioCalc || {};
  const stats = rec.stats || {};
  const acc = (id) => { const s = stats[id]; return s && s.n ? s.ok / s.n : null; };
  const weakTypes = allIds.filter((id) => (stats[id] || {}).n >= 3).sort((a, b) => acc(a) - acc(b)).slice(0, 3).filter((id) => acc(id) < 0.8);
  const start = (types) => {
    const ts = types && types.length ? types : picked;
    if (!ts.length) return;
    const base = Date.now() % 1000003;
    const order = shuffle(ts);
    setDone(null);
    setRun({ list: Array.from({ length: 10 }, (_, k) => makeRadioCalc(order[k % order.length], base * 31 + k * 977)), i: 0, recs: [], sel: null, hint: false });
  };
  const name = (id) => (RADIO_CALC_TYPES.find((t) => t.id === id) || {}).name || id;
  if (run) {
    const p = run.list[run.i];
    const answered = run.sel !== null;
    const choose = (k) => { if (answered) return; const ok = k === p.correct; SFX.play(ok ? "hit" : "miss"); setRun({ ...run, sel: k, recs: [...run.recs, { type: p.type, ok }] }); };
    const next = () => {
      if (run.i + 1 >= run.list.length) { const msg = actions.logRadioCalc(run.recs); SFX.play("result"); setDone({ recs: run.recs, list: run.list, msg }); setRun(null); return; }
      setRun({ ...run, i: run.i + 1, sel: null, hint: false });
    };
    return (
      <Box title={`無線工学の計算ドリル　${run.i + 1} / ${run.list.length}`} icon={<Pencil size={18} />}>
        <div className="jp space-y-2">
          <div className="flex items-center gap-2 text-[10px]" style={{ color: "var(--ink-mute)" }}>
            <span className="px-1.5" style={{ border: "1px solid var(--rule-soft)", borderRadius: 4 }}>{name(p.type)}</span>
            <span className="flex-1">電卓なしで解ける数字です</span>
            <button onClick={() => { if (confirm("やめますか？（記録しません）")) setRun(null); }} className="btn-ghost text-[10px] px-2 py-0.5">やめる</button>
          </div>
          <div className="qtext text-base px-1" style={{ color: "var(--ink)", lineHeight: 1.8 }}>{p.q}</div>
          {!answered && (run.hint
            ? <div className="text-[12px] px-2 py-1" style={{ background: "var(--cream)", border: "1px dashed var(--gold)", borderRadius: 6, color: "var(--ink)" }}>💡 {p.hint}</div>
            : <button onClick={() => setRun({ ...run, hint: true })} className="text-[11px] underline" style={{ background: "none", border: "none", color: "var(--ink-mute)", cursor: "pointer" }}>💡 公式のヒントを見る</button>)}
          <div className="grid grid-cols-2 gap-2">
            {p.opts.map((o, k) => {
              const isOk = k === p.correct, isSel = k === run.sel;
              const bg = !answered ? "var(--paper)" : isOk ? "rgba(109,132,84,0.15)" : isSel ? "rgba(201,86,78,0.1)" : "var(--paper)";
              const bd = !answered ? "var(--rule-soft)" : isOk ? "#6d8454" : isSel ? "#c9564e" : "var(--rule-soft)";
              return <button key={k} onClick={() => choose(k)} className="py-2.5 px-2 text-sm" style={{ borderRadius: 8, border: `1.5px solid ${bd}`, background: bg, color: "var(--ink)", fontWeight: 700, cursor: answered ? "default" : "pointer" }}>{answered && isOk ? "✓ " : answered && isSel ? "✕ " : ""}{o}</button>;
            })}
          </div>
          {answered && (
            <div className="px-2 py-1.5" style={{ background: "var(--sky-pale)", border: "1px solid var(--rule-soft)", borderRadius: 8 }}>
              <div className="text-[12px] mb-0.5" style={{ fontWeight: 800, color: run.sel === p.correct ? "#4f7a3a" : "#c9564e" }}>{run.sel === p.correct ? "✓ 正解！" : `✕ 正解は ${p.opts[p.correct]}`}</div>
              <div className="text-[11px]" style={{ color: "var(--ink-soft)" }}>公式：{p.hint}</div>
              {p.steps.map((st, k) => <div key={k} className="text-[12px]" style={{ color: "var(--ink)" }}>{st}</div>)}
            </div>
          )}
          {answered && <button onClick={next} className="btn-primary w-full py-2">{run.i + 1 >= run.list.length ? "結果を見る" : "次の問題へ"}</button>}
        </div>
      </Box>
    );
  }
  const log = (rec.log || []).slice(-6);
  return (
    <Box title="無線工学の計算ドリル（電卓なし）" icon={<Pencil size={18} />}>
      <div className="jp space-y-2">
        <p className="text-[11px]" style={{ color: "var(--ink-soft)", lineHeight: 1.7 }}>デシベル・波長・オームの法則・レーダーの距離など、本番によく出る計算を4択で。毎回数字が変わります。電卓が使えない本番に合わせて、暗算・筆算で解ける数字だけにしています。</p>
        {done && (
          <div className="px-2 py-2" style={{ background: "var(--cream)", border: "1px solid var(--gold)", borderRadius: 8 }}>
            <div className="flex items-baseline gap-2"><span style={{ fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 22, color: "var(--gold)" }}>{done.recs.filter((x) => x.ok).length} / {done.recs.length}</span><span className="text-[11px]" style={{ color: "var(--ink-soft)" }}>{done.msg}</span></div>
            {done.recs.map((x, k) => <div key={k} className="text-[11px]" style={{ color: x.ok ? "var(--ink-soft)" : "#c9564e" }}>{x.ok ? "○" : "✕"} {name(x.type)}{x.ok ? "" : `：${done.list[k].steps[done.list[k].steps.length - 1]}`}</div>)}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => start()} disabled={!picked.length} className="btn-primary py-2 text-sm">選んだ種類から10問</button>
          <button onClick={() => start(weakTypes)} disabled={!weakTypes.length} className="btn-plum py-2 text-sm" style={{ opacity: weakTypes.length ? 1 : 0.5 }}>苦手な種類から10問</button>
        </div>
        <button onClick={() => setOpen(!open)} className="w-full text-[11px] py-1" style={{ background: "none", border: "1px dashed var(--rule-soft)", borderRadius: 8, color: "var(--ink-soft)", cursor: "pointer" }}>{open ? "▲ 種類を閉じる" : `▼ 出す種類を選ぶ（${picked.length} / ${allIds.length}）・種類ごとの正解率`}</button>
        {open && (
          <div className="space-y-1">
            <div className="flex gap-2 text-[11px]"><button onClick={() => setPicked(allIds)} className="btn-ghost px-2 py-0.5">すべて選ぶ</button><button onClick={() => setPicked([])} className="btn-ghost px-2 py-0.5">すべて外す</button></div>
            <div className="grid grid-cols-2 gap-1">
              {RADIO_CALC_TYPES.map((t) => { const on = picked.includes(t.id), a = acc(t.id); return (
                <button key={t.id} onClick={() => setPicked(on ? picked.filter((x) => x !== t.id) : [...picked, t.id])} className="flex items-center gap-1.5 px-2 py-1 text-left text-[11px]" style={{ borderRadius: 8, border: `1px solid ${on ? "var(--gold)" : "var(--rule-soft)"}`, background: on ? "var(--cream)" : "var(--paper)", color: "var(--ink)", cursor: "pointer" }}>
                  <span>{on ? "☑" : "☐"}</span><span className="flex-1">{t.name}</span>{a !== null && <span style={{ color: a >= 0.8 ? "var(--sage)" : "#c9564e", fontWeight: 700 }}>{Math.round(a * 100)}%</span>}
                </button>
              ); })}
            </div>
          </div>
        )}
        {log.length > 0 && <p className="text-[10px]" style={{ color: "var(--ink-mute)" }}>最近：{log.map((l) => `${l.ok}/${l.n}`).join("　")}</p>}
      </div>
    </Box>
  );
}
// 本試験の手順の早押し：計算マニュアルの手順（複素数モード）を型で選ぶ
const PAST_DRILL_TYPES = [["all", "すべて", /./], ["hosha", "放射", /放射/], ["koten", "交点", /交点/], ["naibun", "内分点", /内分/], ["idou", "点の移動", /点の移動/], ["heigou", "閉合調整", /閉合/], ["kyuseki", "求積・面積指定", /求積|面積/], ["other", "垂線・平行移動・相似など", /垂線|平行移動|相似|座標変換|三角関数|夾角|後退|直交/]];
const PAST_PAD = ["SHIFT", "ALPHA", "STO", "OPTN", "ENG", "Ans", "(", ")", "+", "−", "×", "÷", "=", "°′″", "(−)", "√", "1", "2", "3", "4", "数", "A", "B", "C", "D", "E", "F", "x", "y", "M"];
function pastDrillOf(seq) {
  const out = [];
  for (const t of seq) {
    if (t.startsWith("[")) out.push(t.slice(1, -1));
    else if (/^[\d.]+$/.test(t)) { if (out[out.length - 1] !== "数") out.push("数"); }
    else if (/^[A-FxyM]$/.test(t)) out.push(t);
    else return null;
  }
  return out.every((k) => PAST_PAD.includes(k)) ? out : null;
}
function pastDrillTasks(data, type) {
  const re = (PAST_DRILL_TYPES.find((x) => x[0] === type) || PAST_DRILL_TYPES[0])[2];
  const pool = [];
  (data || []).forEach((it) => (it.sections || []).forEach((sec) => { if (!re.test(sec.title)) return; (sec.steps || []).forEach((st) => { const keys = pastDrillOf(st.k); if (keys && keys.filter((k) => k !== "数").length >= 6) pool.push({ label: `${it.label} ${it.purpose}｜${sec.title.replace(/^[①-⑨]\s*/, "")}${st.o ? `：${st.o}` : ""}`, keys, seq: st.k }); }); }));
  return pool.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).slice(0, 5).map((x) => x[1]);
}
function CalcTab({ state, actions, startTimer, stopTimer, pastReq, onPastOpened }) {
  const c2 = normRpg(state.rpg).calc2 || {};
  const [pastOpen, setPastOpen] = useState(null); // 本試験の計算 {kind: "L"|"F", id}
  const pastData = usePastData("pastcalc");
  const [pdType, setPdType] = useState("all");
  useEffect(() => {
    if (pastReq && pastReq.kind) { setPastOpen({ kind: pastReq.kind, id: pastReq.id, n: Date.now() }); onPastOpened && onPastOpened(); }
    // 申請書の叩き込みの「今日の計算」：指定の種類から5問（数字は毎回ちがう）
    else if (pastReq && pastReq.types && pastReq.types.length) {
      const ts = pastReq.types.filter((t) => CALC2_TYPES[t]);
      if (ts.length) begin(Array.from({ length: 5 }, (_, k) => { const t = ts[k % ts.length]; return { type: t, seed: Math.floor(Math.random() * 1e9), fixed: false, label: `${CALC2_TYPES[t]}（数字は毎回ちがう）` }; }));
      onPastOpened && onPastOpened();
    }
  }, [pastReq]);
  useEffect(() => { if (pastOpen) window.scrollTo({ top: 0 }); }, [pastOpen && pastOpen.id, pastOpen && pastOpen.n]);
  const [picked, setPicked] = useState(() => { try { const v = JSON.parse(localStorage.getItem("sq-calc2-types") || "null"); if (Array.isArray(v) && v.length) return [...new Set([...v, ...CALC2_ALL.filter((t) => !(v.includes(t)) && ["composite", "bunpitsu", "transform", "sumikiri", "arc", "kubun"].includes(t))])]; } catch (e) { /* 既定 */ } return CALC2_ALL; });
  const [modes, setModes] = useState({ random: true, fixed: false });
  const [wrongOnly, setWrongOnly] = useState(false);
  const [count, setCount] = useState(10);
  const [run, setRun] = useState(null); // { list, i, prob, stage, vals, checked, stageOk:[], results, hints, t0, missPick }
  const [drill, setDrill] = useState(null); // キー操作の早押し { tasks:[{label, keys}], i, pos, t0, miss, flash }
  const [now, setNow] = useState(Date.now());
  const timerMine = useRef(false);
  useEffect(() => { try { localStorage.setItem("sq-calc2-types", JSON.stringify(picked)); } catch (e) { /* 無視 */ } }, [picked]);
  useEffect(() => () => { if (timerMine.current) { stopTimer(); timerMine.current = false; } }, []);
  useEffect(() => { if (!run && !drill) return undefined; const id = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(id); }, [!!run, !!drill]);
  const fixedRes = (c2.fixed || {}).res || {}, fixedDone = (c2.fixed || {}).done || {}, lap = (c2.fixed || {}).lap || 1;
  const fixedIds = picked.flatMap((t) => Array.from({ length: FIXED_PER_TYPE }, (_, k) => ({ type: t, k: k + 1, id: `${t}#${k + 1}` })));
  const begin = (items) => {
    if (!items.length) return;
    if (!state.timer.startMs) { startTimer(null, "qa"); timerMine.current = true; }
    const first = items[0];
    setRun({ list: items, i: 0, prob: makeCalc2(first.type, first.seed), stage: 0, vals: {}, checked: null, stageOk: [], results: [], hints: 0, t0: Date.now(), missPick: null });
  };
  const start = () => {
    const list = [];
    if (modes.fixed) {
      let pool = fixedIds.filter((x) => (wrongOnly ? fixedRes[x.id] && !fixedRes[x.id].last : !fixedDone[x.id]));
      if (!pool.length && !wrongOnly) pool = fixedIds;
      pool.forEach((x) => list.push({ type: x.type, seed: fixedSeed(x.type, x.k), id: x.id, fixed: true, label: `問題集 ${CALC2_TYPES[x.type]} 第${x.k}問` }));
    }
    if (modes.random) {
      const n = modes.fixed ? Math.ceil(count / 2) : count;
      for (let k = 0; k < n; k++) { const t = picked[(k + Math.floor(Math.random() * picked.length)) % picked.length]; list.push({ type: t, seed: Math.floor(Math.random() * 1e9), fixed: false, label: `${CALC2_TYPES[t]}（数字は毎回ちがう）` }); }
    }
    begin(modes.fixed && modes.random ? [...list.filter((x) => x.fixed).slice(0, Math.floor(count / 2)), ...list.filter((x) => !x.fixed)] : modes.fixed ? list.slice(0, count) : list);
  };
  // キー操作の早押し：選んだ種類の問題から、キー操作を5つ
  const startDrill = () => {
    const tasks = [];
    for (let k = 0; k < 40 && tasks.length < 5; k++) {
      const t = picked[Math.floor(Math.random() * picked.length)];
      const p = makeCalc2(t, Math.floor(Math.random() * 1e9));
      const ks = stagesOf(p).flatMap((st) => st.keys || []).filter((x) => x.seq.length >= 4);
      if (!ks.length) continue;
      const kk = ks[Math.floor(Math.random() * ks.length)];
      tasks.push({ label: `${CALC2_TYPES[t]}：${kk.label}`, keys: keyDrillOf(kk.seq), seq: kk.seq });
    }
    if (tasks.length) setDrill({ tasks, i: 0, pos: 0, t0: Date.now(), miss: 0, flash: null });
  };
  const startPastDrill = () => {
    const tasks = pastDrillTasks(pastData, pdType);
    if (tasks.length) setDrill({ tasks, i: 0, pos: 0, t0: Date.now(), miss: 0, flash: null, past: true });
  };
  const toggleType = (t) => setPicked(picked.includes(t) ? picked.filter((x) => x !== t) : [...picked, t]);
  const chip = (on) => ({ borderRadius: 999, border: `1px solid ${on ? "var(--gold)" : "var(--rule-soft)"}`, background: on ? "var(--cream)" : "var(--paper)", color: "var(--ink)", fontWeight: on ? 800 : 500, cursor: "pointer" });
  const mmss = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
  const head = (
    <div className="mb-3 jp">
      <div className="relative overflow-hidden" style={{ borderRadius: 12, border: "1px solid #b08a3e", boxShadow: "inset 0 0 0 3px #fdfbf5, inset 0 0 0 4px rgba(176,138,62,.45)", width: "100%", maxWidth: 680, margin: "0 auto", aspectRatio: "1672 / 941", background: "#34508c" }}>
        <img src={`${ART_URL}calctower.webp`} alt="計算の塔（土地家屋調査士 試験対策）" className="w-full h-full" style={{ objectFit: "cover", objectPosition: "center 35%" }} />
      </div>
      <div className="text-[11px] mt-1 text-center" style={{ color: "var(--ink-soft)" }}>関数電卓（カシオ fx-JP500）のキー操作つき。記述式の流れ・座標・交点・面積・三角形・端数処理を周回。</div>
    </div>
  );

  // ── 本試験の計算 ──
  if (pastOpen) return <div className="space-y-3"><PastCalcArea c2={c2} state={state} actions={actions} open={pastOpen} setOpen={setPastOpen} /></div>;

  // ── キー操作の早押し ──
  if (drill) {
    const task = drill.tasks[drill.i];
    if (!task) {
      const sec = Math.round((Date.now() - drill.t0) / 1000);
      return (
        <div className="space-y-3">{head}
          <Box title="キー操作の早押し：結果" icon={<Award size={18} />}>
            <div className="jp text-center"><div style={{ fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 28, color: "var(--gold)" }}>{mmss(drill.sec || sec)}</div><div className="text-[11px]" style={{ color: "var(--ink-soft)" }}>押しまちがい {drill.miss}回{drill.best ? "　🏆 自己ベスト！" : ""}</div></div>
            <div className="grid grid-cols-2 gap-2 mt-3"><button onClick={() => setDrill(null)} className="jp btn-ghost py-2">もどる</button><button onClick={startDrill} className="jp btn-primary py-2">もう一度</button></div>
          </Box>
        </div>
      );
    }
    const PAD = drill.past ? PAST_PAD : ["SHIFT", "MENU", "(", ")", "Ans", "sin", "cos", "tan", "x²", "√", "°'\"", "(-)", "π", "×", "÷", "+", "−", "=", "数"];
    const press = (k) => {
      if (k === task.keys[drill.pos]) {
        const pos = drill.pos + 1;
        if (pos >= task.keys.length) {
          const ni = drill.i + 1;
          if (ni >= drill.tasks.length) { const sec = Math.round((Date.now() - drill.t0) / 1000); const best = actions.logCalcDrill(sec, drill.miss); SFX.play("result"); setDrill({ ...drill, i: ni, pos: 0, sec, best }); return; }
          SFX.play("defeat"); setDrill({ ...drill, i: ni, pos: 0, flash: null }); return;
        }
        setDrill({ ...drill, pos, flash: null });
      } else { SFX.play("miss"); setDrill({ ...drill, miss: drill.miss + 1, flash: k }); }
    };
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between jp text-xs"><button onClick={() => setDrill(null)} style={{ color: "var(--ink-soft)", background: "none", border: "none" }}>✕ やめる</button><span style={{ color: "var(--ink-soft)", fontWeight: 700 }}>{drill.i + 1} / {drill.tasks.length}　⏱ {mmss(Math.round((now - drill.t0) / 1000))}　ミス {drill.miss}</span></div>
        <Box title="キー操作の早押し" icon={<Pencil size={18} />}>
          <div className="jp space-y-2">
            <div className="text-[12px]" style={{ color: "var(--ink)", fontWeight: 800 }}>{task.label}</div>
            <div className="px-2 py-1.5" style={{ background: "var(--cream)", borderRadius: 8, border: "1px solid var(--rule-soft)" }}><KeySeq seq={task.seq} /></div>
            <div className="flex flex-wrap gap-1 text-[11px]">{task.keys.map((k, j) => <span key={j} style={{ ...KEYCAP, opacity: j < drill.pos ? 0.35 : 1, outline: j === drill.pos ? "2px solid #d6b56a" : "none" }}>{k}</span>)}</div>
            <p className="text-[10px]" style={{ color: "var(--ink-mute)" }}>上の順に、下のキーを押してください。数字のところは「数」をまとめて1回押します。</p>
            <div className={drill.past ? "grid grid-cols-6 gap-1.5 p-2" : "grid grid-cols-5 gap-1.5 p-2"} style={{ background: "#2a3550", borderRadius: 10 }}>
              {PAD.map((k) => <button key={k} onClick={() => press(k)} style={{ ...KEYCAP, padding: "8px 0", fontSize: 13, background: drill.flash === k ? "#f3c4bf" : k === "SHIFT" ? "linear-gradient(180deg, #f6e2a8, #d6b56a)" : k === "数" ? "linear-gradient(180deg, #dfe8f6, #b8c6dc)" : KEYCAP.background }}>{k}</button>)}
            </div>
          </div>
        </Box>
      </div>
    );
  }

  // ── 解いているとき ──
  if (run && run.i < run.list.length) {
    const it = run.list[run.i], p = run.prob, stages = stagesOf(p), st = stages[run.stage], lastStage = run.stage >= stages.length - 1;
    const sec = Math.round((now - run.t0) / 1000);
    const allSteps = stages.slice(0, run.stage + 1).flatMap((x) => x.steps || []);
    const stageStepCount = (st.steps || []).length;
    const check = () => {
      const good = st.fields.map((f) => checkCalc2(f, run.vals[f.key]));
      const ok = good.every(Boolean);
      SFX.play(ok ? "defeat" : "miss");
      const stageOk = [...run.stageOk, ok];
      if (lastStage) {
        const all = stageOk.every(Boolean);
        const best = actions.logCalc2({ type: it.type, id: it.id, ok: all, fixed: it.fixed, hints: run.hints, sec: Math.round((Date.now() - run.t0) / 1000) });
        setRun({ ...run, checked: good, stageOk, results: [...run.results, { it, ok: all, sec: Math.round((Date.now() - run.t0) / 1000), best }] });
      } else setRun({ ...run, checked: good, stageOk });
    };
    const nextStage = () => setRun({ ...run, stage: run.stage + 1, vals: {}, checked: null, hintOpen: 0 });
    const next = () => {
      const ni = run.i + 1;
      if (ni >= run.list.length) { if (timerMine.current) { stopTimer(); timerMine.current = false; } SFX.play("result"); setRun({ ...run, i: ni }); return; }
      setRun({ ...run, i: ni, prob: makeCalc2(run.list[ni].type, run.list[ni].seed), stage: 0, vals: {}, checked: null, stageOk: [], hints: 0, hintOpen: 0, t0: Date.now(), missPick: null });
    };
    const inp = { background: "var(--paper)", border: "1px solid var(--rule)", borderRadius: 6, color: "var(--ink)", padding: "6px 8px", fontSize: 15, width: "100%", fontFamily: "ui-monospace, monospace" };
    const setV = (k, v) => setRun((r) => ({ ...r, vals: { ...r.vals, [k]: v } }));
    const hintOpen = run.hintOpen || 0;
    const res = run.results[run.results.length - 1];
    const problemDone = lastStage && run.checked;
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between jp text-xs">
          <button onClick={() => { if (confirm("やめますか？（答えた問題の記録は残ります）")) { if (timerMine.current) { stopTimer(); timerMine.current = false; } setRun(null); } }} style={{ color: "var(--ink-soft)", background: "none", border: "none" }}>✕ やめる</button>
          <span style={{ color: "var(--ink-soft)", fontWeight: 700 }}>{run.i + 1} / {run.list.length}問　正解 {run.results.filter((x) => x.ok).length}　⏱ {problemDone && res ? mmss(res.sec) : mmss(sec)}</span>
        </div>
        <Box title={CALC2_TYPES[it.type]} icon={<Pencil size={18} />}>
          <div className="jp space-y-2">
            <div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>{it.label}{(c2.best || {})[it.type] ? `　自己ベスト ${mmss(c2.best[it.type])}` : ""}</div>
            {p.pts && p.pts.length > 0 && <CalcFigure prob={p} />}
            {p.pts && p.pts.length > 0 && (
              <div className="grid grid-cols-2 gap-x-3 text-[12px]" style={{ fontFamily: "ui-monospace, monospace", color: "var(--ink)" }}>
                {p.pts.filter((q) => !q.unknown).map((q) => <div key={q.name}><b>{q.name}</b>　X {q.X.toFixed(3)}　Y {q.Y.toFixed(3)}</div>)}
              </div>
            )}
            {(p.given || []).map((g, i) => <div key={i} className="text-[13px]" style={{ color: "var(--ink)" }}>{g}</div>)}
            {stages.length > 1 && (
              <div className="flex gap-1">{stages.map((_, k) => <span key={k} className="flex-1 text-center text-[10px] py-0.5" style={{ borderRadius: 4, background: k < run.stage ? (run.stageOk[k] ? "rgba(109,132,84,0.2)" : "rgba(201,86,78,0.15)") : k === run.stage ? "var(--cream)" : "var(--paper)", border: `1px solid ${k === run.stage ? "var(--gold)" : "var(--rule-soft)"}`, color: "var(--ink)", fontWeight: k === run.stage ? 800 : 500 }}>第{k + 1}段{k < run.stage ? (run.stageOk[k] ? " ○" : " ✕") : ""}</span>)}</div>
            )}
            {stages.slice(0, run.stage).map((x, k) => <div key={k} className="text-[11px] px-2 py-1" style={{ background: "var(--paper)", border: "1px dashed var(--rule-soft)", borderRadius: 6, color: "var(--ink-soft)" }}>第{k + 1}段の答え：{x.fields.map((f) => `${f.label} ${fieldAnsText(f)}`).join("　")}（次の段はこの値を使います）</div>)}
            <div className="text-sm px-2 py-1.5" style={{ background: "var(--cream)", border: "1px solid var(--rule-soft)", borderRadius: 8, color: "var(--ink)", fontWeight: 700 }}>{st.ask}</div>
            {st.fields.map((f, k) => (
              <div key={f.key} className="flex items-center gap-2">
                <span className="text-xs" style={{ width: 64, flexShrink: 0, color: "var(--ink-soft)", fontWeight: 700 }}>{f.label}</span>
                {f.kind === "dms" ? (
                  <span className="flex items-center gap-1 flex-1">
                    {["d", "m", "s"].map((u, j) => <span key={u} className="flex items-center gap-0.5 flex-1"><input disabled={!!run.checked} inputMode="numeric" value={(run.vals[f.key] || {})[u] || ""} onChange={(e) => setV(f.key, { ...(run.vals[f.key] || {}), [u]: e.target.value.replace(/[^\d]/g, "") })} style={{ ...inp, textAlign: "right" }} /><span className="text-sm">{["°", "′", "″"][j]}</span></span>)}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 flex-1"><input disabled={!!run.checked} inputMode="decimal" value={run.vals[f.key] || ""} onChange={(e) => setV(f.key, e.target.value)} placeholder="答え" style={inp} /><span className="text-xs" style={{ color: "var(--ink-soft)" }}>{f.unit}</span></span>
                )}
                {run.checked && <span style={{ fontWeight: 900, color: run.checked[k] ? "var(--sage)" : "#c9564e" }}>{run.checked[k] ? "○" : "✕"}</span>}
              </div>
            ))}
            {!run.checked && (<>
              {/* 段階ヒント：1手順ずつ開ける */}
              {hintOpen > 0 && <div className="px-2 py-1.5 space-y-0.5" style={{ background: "rgba(214,181,106,0.12)", border: "1px dashed var(--gold)", borderRadius: 8 }}>{(st.steps || []).slice(0, hintOpen).map((h, i) => <div key={i} className="text-[12px]" style={{ color: "var(--ink)" }}>💡 ヒント{i + 1}：{h}</div>)}</div>}
              <div className="grid grid-cols-3 gap-2">
                <button disabled={hintOpen >= stageStepCount} onClick={() => setRun({ ...run, hintOpen: hintOpen + 1, hints: run.hints + 1 })} className="btn-ghost py-2 text-xs" style={{ opacity: hintOpen >= stageStepCount ? 0.4 : 1 }}>💡 ヒント（{hintOpen}/{stageStepCount}）</button>
                <button onClick={check} className="btn-primary py-2 col-span-2">答え合わせ</button>
              </div>
            </>)}
            {run.checked && (<>
              <div className="px-2 py-2 space-y-1" style={{ background: "var(--sky-pale)", border: "1px solid var(--gold)", borderRadius: 8 }}>
                <div className="text-xs" style={{ fontWeight: 800, color: "var(--ink)" }}>答え：{st.fields.map((f) => `${f.label} ${fieldAnsText(f)}`).join("　")}</div>
                <div className="text-[10px]" style={{ color: "var(--ink-mute)", fontWeight: 700 }}>解き方</div>
                {(st.steps || []).map((x, i) => <div key={i} className="text-[12px]" style={{ color: "var(--ink)", lineHeight: 1.7 }}>{x}</div>)}
              </div>
              {st.keys && st.keys.length > 0 && (
                <div className="px-2 py-2 space-y-2" style={{ background: "#1f2a44", border: "1px solid #b08a3e", borderRadius: 8 }}>
                  <div className="text-[11px]" style={{ color: "#f1dfae", fontWeight: 800 }}>🧮 fx-JP500 のキー操作</div>
                  {st.keys.map((k, i) => (
                    <div key={i} className="px-2 py-1.5" style={{ background: "#fdfbf5", borderRadius: 6 }}>
                      <div className="text-[10px] mb-1" style={{ color: "var(--ink-soft)", fontWeight: 700 }}>{i + 1}．{k.label}</div>
                      <KeySeq seq={k.seq} />
                      {k.out && <div className="text-[11px] mt-1" style={{ color: "#34508c", fontFamily: "ui-monospace, monospace" }}>→ 表示：{k.out}</div>}
                      {k.note && <div className="text-[10px] mt-0.5" style={{ color: "var(--ink-mute)" }}>{k.note}</div>}
                    </div>
                  ))}
                </div>
              )}
              {problemDone && p.verify && p.verify.length > 0 && <div className="px-2 py-1.5 text-[11px]" style={{ background: "rgba(109,132,84,0.08)", border: "1px solid rgba(109,132,84,0.5)", borderRadius: 8, color: "var(--ink)" }}><b>✔ 検算：</b>{p.verify.join(" ")}</div>}
              {problemDone && res && res.ok && res.best && <div className="text-center text-[12px]" style={{ color: "var(--gold)", fontWeight: 800 }}>🏆 自己ベスト更新！ {mmss(res.sec)}</div>}
              {problemDone && res && !res.ok && (
                <div className="px-2 py-1.5" style={{ background: "rgba(201,86,78,0.06)", border: "1px solid #e0948a", borderRadius: 8 }}>
                  <div className="text-[11px] mb-1" style={{ color: "var(--ink)", fontWeight: 700 }}>まちがえた原因は？（記録して傾向を見ます）</div>
                  <div className="flex flex-wrap gap-1.5 text-[11px]">{CALC_MISS.map(([id, l]) => <button key={id} disabled={!!run.missPick} onClick={() => { actions.logCalcMiss(it.type, id); setRun({ ...run, missPick: id }); }} className="px-2 py-0.5" style={chip(run.missPick === id)}>{l}</button>)}</div>
                </div>
              )}
              {!lastStage ? <button onClick={nextStage} className="btn-primary w-full py-2">第{run.stage + 2}段へ</button>
                : <button onClick={next} className="btn-primary w-full py-2">{run.i + 1 >= run.list.length ? "結果を見る" : "次の問題へ"}</button>}
            </>)}
            {allSteps.length === 0 && null}
          </div>
        </Box>
      </div>
    );
  }

  // ── 結果 ──
  if (run && run.i >= run.list.length) {
    const ok = run.results.filter((x) => x.ok).length;
    return (
      <div className="space-y-3">
        {head}
        <Box title="結果" icon={<Award size={18} />}>
          <div className="jp text-center"><div style={{ fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 30, color: "var(--gold)" }}>{ok} / {run.results.length}</div></div>
          <div className="jp space-y-0.5 mt-2">{run.results.map((r, i) => <div key={i} className="text-[11px] flex gap-2"><span style={{ color: r.ok ? "var(--sage)" : "#c9564e", fontWeight: 900 }}>{r.ok ? "○" : "✕"}</span><span className="flex-1" style={{ color: "var(--ink)" }}>{r.it.label}</span><span style={{ color: r.best ? "var(--gold)" : "var(--ink-mute)" }}>{mmss(r.sec)}{r.best ? "🏆" : ""}</span></div>)}</div>
          <div className="grid grid-cols-2 gap-2 mt-3"><button onClick={() => setRun(null)} className="jp btn-ghost py-2">もどる</button><button onClick={start} className="jp btn-primary py-2">もう1セット</button></div>
        </Box>
      </div>
    );
  }

  // ── 開始前 ──
  if (!homeSide(state)) { // 資格の世界（二陸特など）：その世界の計算だけ
    const radioOn = (curWorld(state).drills || []).includes("radiocalc");
    return (
      <div className="space-y-3">
        {radioOn ? <RadioCalcDrill state={state} actions={actions} /> : <Box title="計算の塔" icon={<Pencil size={18} />}><p className="jp text-[12px]" style={{ color: "var(--ink-soft)" }}>この資格の計算ドリルはまだありません。土地家屋調査士の計算は、星詠みの書で調査士を選ぶと出ます。</p></Box>}
      </div>
    );
  }
  const stats = c2.stats || {}, best = c2.best || {}, miss = c2.miss || {};
  const doneN = fixedIds.filter((x) => fixedDone[x.id]).length;
  const wrongN = fixedIds.filter((x) => fixedRes[x.id] && !fixedRes[x.id].last).length;
  const missTotal = CALC_MISS.reduce((t, [id]) => t + (miss[id] || 0), 0);
  return (
    <div className="space-y-3">
      {(curWorld(state).drills || []).includes("radiocalc") && <RadioCalcDrill state={state} actions={actions} />}
      {head}
      <PastCalcArea c2={c2} state={state} actions={actions} open={null} setOpen={setPastOpen} />
      <Box title="出題する種類（☑で選ぶ）" icon={<Pencil size={18} />}>
        <div className="jp space-y-2">
          <div className="flex gap-2 text-[11px]"><button onClick={() => setPicked(CALC2_ALL)} className="btn-ghost px-2 py-0.5">すべて選ぶ</button><button onClick={() => setPicked([])} className="btn-ghost px-2 py-0.5">すべて外す</button></div>
          {CALC2_GROUPS.map((g) => {
            const all = g.types.every((t) => picked.includes(t)), some = g.types.some((t) => picked.includes(t));
            return (
              <div key={g.id} className="px-2 py-1.5" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 8 }}>
                <button onClick={() => setPicked(all ? picked.filter((t) => !g.types.includes(t)) : [...new Set([...picked, ...g.types])])} className="text-xs mb-1" style={{ background: "none", border: "none", color: "var(--ink)", fontWeight: 800, cursor: "pointer" }}>{all ? "☑" : some ? "▣" : "☐"} {g.name}</button>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  {g.types.map((t) => { const s2 = stats[t]; return <button key={t} onClick={() => toggleType(t)} className="px-2.5 py-0.5" style={chip(picked.includes(t))}>{picked.includes(t) ? "☑ " : "☐ "}{CALC2_TYPES[t]}{s2 && s2.n ? <span style={{ color: "var(--ink-mute)", fontWeight: 500 }}>　{Math.round((s2.ok / s2.n) * 100)}%</span> : null}{best[t] ? <span style={{ color: "var(--gold)", fontWeight: 500 }}>　🏆{mmss(best[t])}</span> : null}</button>; })}
                </div>
              </div>
            );
          })}
        </div>
      </Box>
      <Box title="出し方（☑で選ぶ・両方もOK）" icon={<Shuffle size={18} />}>
        <div className="jp space-y-2">
          <button onClick={() => setModes({ ...modes, random: !modes.random })} className="w-full text-left text-sm px-2 py-1.5" style={chip(modes.random)}>{modes.random ? "☑" : "☐"} 毎回数字が変わる問題<span className="block text-[10px]" style={{ color: "var(--ink-mute)", fontWeight: 500 }}>何度でも新しい数字で練習。種類ごとの正答率と自己ベストを記録します</span></button>
          <button onClick={() => setModes({ ...modes, fixed: !modes.fixed })} className="w-full text-left text-sm px-2 py-1.5" style={chip(modes.fixed)}>{modes.fixed ? "☑" : "☐"} 決まった問題集を周回（種類ごとに{FIXED_PER_TYPE}問）<span className="block text-[10px]" style={{ color: "var(--ink-mute)", fontWeight: 500 }}>いつも同じ数字。全{CALC2_ALL.length * FIXED_PER_TYPE}問を解くと1周で、周回スタンプと300G。いま第{lap}周・{Object.keys(fixedDone).length}/{CALC2_ALL.length * FIXED_PER_TYPE}問</span></button>
          {modes.fixed && <button onClick={() => setWrongOnly(!wrongOnly)} className="text-[11px] w-full text-left" style={{ background: "none", border: "none", color: "var(--ink)", cursor: "pointer" }}>{wrongOnly ? "☑" : "☐"} 問題集は、前回まちがえた問題だけ（{wrongN}問）</button>}
          <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--ink-soft)" }}>1セット {[5, 10, 20].map((n) => <button key={n} onClick={() => setCount(n)} className="px-2.5 py-0.5" style={chip(count === n)}>{n}問</button>)}</div>
          <button onClick={start} disabled={!picked.length || (!modes.random && !modes.fixed)} className="btn-primary w-full py-2.5 text-base">計算をはじめる</button>
          {modes.fixed && <p className="text-[10px]" style={{ color: "var(--ink-mute)" }}>選んだ種類の問題集のうち、この周でまだ解いていない問題から出します（選んだ種類では {doneN}/{fixedIds.length}問）。</p>}
          <p className="text-[10px]" style={{ color: "var(--ink-mute)" }}>答え合わせの前に「💡ヒント」で1手順ずつ開けられます（使った数も記録）。1問ごとの時間を測り、正解したときの最速を自己ベストとして残します。</p>
        </div>
      </Box>
      <Box title="キー操作の早押し" icon={<Clock size={18} />}>
        <div className="jp space-y-2">
          <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>選んだ種類の問題から、fx-JP500 のキー操作を5つ。画面のキーを正しい順にタップして、指に手順を覚えさせます。時間と押しまちがいを記録します。</p>
          <button onClick={startDrill} disabled={!picked.length} className="btn-sky w-full py-2">早押しをはじめる{(c2.drill || {}).best ? `（自己ベスト ${mmss(c2.drill.best)}）` : ""}</button>
          <div className="pt-1 space-y-1.5" style={{ borderTop: "1px dashed var(--rule-soft)" }}>
            <div className="text-[11px]" style={{ color: "var(--ink)", fontWeight: 800 }}>本試験の手順で（計算マニュアルの複素数モード）</div>
            <div className="flex flex-wrap gap-1.5 text-[11px]">{PAST_DRILL_TYPES.map(([id, l]) => <button key={id} onClick={() => setPdType(id)} className="px-2 py-0.5" style={chip(pdType === id)}>{l}</button>)}</div>
            <button onClick={startPastDrill} disabled={!pastData} className="btn-ghost w-full py-2">本試験の手順で早押し（5問）</button>
          </div>
        </div>
      </Box>
      {missTotal > 0 && (
        <Box title="計算ミスの傾向" icon={<TrendingUp size={18} />}>
          <div className="jp space-y-1">
            {CALC_MISS.filter(([id]) => miss[id]).sort((a, b) => miss[b[0]] - miss[a[0]]).map(([id, l]) => (
              <div key={id}><div className="flex text-[11px]"><span className="flex-1" style={{ color: "var(--ink)" }}>{l}</span><span style={{ color: "var(--ink-soft)" }}>{miss[id]}回</span></div><div style={{ height: 5, borderRadius: 3, background: "var(--beige)", overflow: "hidden" }}><div style={{ width: `${(miss[id] / missTotal) * 100}%`, height: "100%", background: "#c9564e" }} /></div></div>
            ))}
            <p className="text-[10px]" style={{ color: "var(--ink-mute)" }}>{(() => { const top = CALC_MISS.filter(([id]) => miss[id]).sort((a, b) => miss[b[0]] - miss[a[0]])[0]; return top ? { sign: "符号のミスが多めです。ΔX・ΔY は「後の点 − 前の点」と決めて、毎回同じ順で引きましょう。", quad: "象限のミスが多めです。Pol の θ がマイナスなら360°を足す、を習慣に。", round: "端数処理のミスが多めです。地積は規則100条、床面積は規則115条の桁を確かめましょう。", input: "電卓の入力ミスが多めです。「キー操作の早押し」で手順を指に覚えさせましょう。", formula: "公式・手順のミスが多めです。答え合わせの前に「💡ヒント」で手順を確かめましょう。", other: "答えを出したら、検算の手順で確かめる習慣をつけましょう。" }[top[0]] : ""; })()}</p>
          </div>
        </Box>
      )}
      {curWorld(state).id === "home" && <CalcDrill state={state} actions={actions} />}
      {curWorld(state).id === "home" && <SakuzuDrill state={state} actions={actions} />}
      <Box title="fx-JP500 の準備" icon={<Bookmark size={18} />}>
        <div className="jp text-[11px] space-y-1" style={{ color: "var(--ink)" }}>
          <div>・角度の単位を「度」にする：<KeySeq seq={["[SHIFT]", "[MENU]", "(設定)"]} /> → 角度単位 → 度（D）</div>
          <div>・<b>Pol</b>（距離と方向角）は <KeySeq seq={["[SHIFT]", "[+]"]} />、<b>Rec</b>（ΔX・ΔY）は <KeySeq seq={["[SHIFT]", "[−]"]} />、区切りの「,」は <KeySeq seq={["[SHIFT]", "[)]"]} /></div>
          <div>・度分秒の入力と切り替えは <KeySeq seq={["[°'\"]"]} />、cos⁻¹ などは <KeySeq seq={["[SHIFT]", "[cos]"]} />、マイナスの数は <KeySeq seq={["[(-)]"]} /></div>
          <div>・座標は X＝北、Y＝東なので、<b>Pol(ΔX, ΔY)</b> の θ がそのまま方向角になります（マイナスなら360°を足す）</div>
          <p className="text-[10px]" style={{ color: "var(--ink-mute)" }}>キーの位置は fx-JP500 の標準の配置です。お手元の電卓と表示がちがうときは教えてください。</p>
          <button onClick={() => window.dispatchEvent(new CustomEvent("sq-open-past", { detail: { to: "laps", key: "hayami" } }))} className="btn-ghost w-full py-1.5 text-[11px]">🗂 当日の確認カード（式・キーの早見表）</button>
        </div>
      </Box>
    </div>
  );
}
const mmssOf = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
const near = (v, a, tol = 0.006) => { const n = parseFloat(String(v || "").replace(/[−ー－]/g, "-").replace(/[^\d.\-]/g, "")); return Number.isFinite(n) && Math.abs(n - a) <= tol; };

// 点の配置図（X＝北が上、Y＝東が右）
function PastFigure({ pts, ans }) {
  const all = [...pts.map((p) => ({ ...p, k: "g" })), ...(ans || []).map((p) => ({ n: p.pt, x: p.x, y: p.y, k: "a" }))];
  if (all.length < 2) return null;
  const xs = all.map((p) => p.x), ys = all.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const W = 300, H = 190, pad = 22;
  const sc = Math.min((W - pad * 2) / Math.max(maxY - minY, 1e-6), (H - pad * 2) / Math.max(maxX - minX, 1e-6));
  const px = (p) => pad + (p.y - minY) * sc + ((W - pad * 2) - (maxY - minY) * sc) / 2;
  const py = (p) => H - pad - (p.x - minX) * sc - ((H - pad * 2) - (maxX - minX) * sc) / 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 420, display: "block", margin: "0 auto", background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 8 }}>
      <text x={W - 14} y={16} fontSize="10" textAnchor="middle" fill="var(--ink-mute)">N↑</text>
      {all.map((p, i) => (
        <g key={i}>
          <circle cx={px(p)} cy={py(p)} r={p.k === "a" ? 3.6 : 3} fill={p.k === "a" ? "#c9564e" : "var(--sky-deep)"} />
          <text x={px(p) + 5} y={py(p) - 4} fontSize="10" fontWeight="700" fill={p.k === "a" ? "#c9564e" : "var(--ink)"}>{p.n}</text>
        </g>
      ))}
    </svg>
  );
}
// 複素数モードのキーの早見
function ComplexKeyLegend() {
  const [open, setOpen] = useState(false);
  return (
    <div className="px-2 py-1.5" style={{ background: "var(--paper)", border: "1px dashed var(--rule-soft)", borderRadius: 8 }}>
      <button onClick={() => setOpen(!open)} className="text-[11px] w-full text-left" style={{ background: "none", border: "none", color: "var(--ink-soft)", fontWeight: 700, cursor: "pointer" }}>{open ? "▾" : "▸"} この手順は複素数モード（計算マニュアルと同じ）。キーの早見</button>
      {open && (
        <div className="text-[11px] mt-1 space-y-0.5" style={{ color: "var(--ink)" }}>
          <div>・はじめに <KeySeq seq={["[MENU]", "[2]"]} /> で複素数モード。座標 (X, Y) は X＋Y<b>i</b> で入れる（<KeySeq seq={["[ENG]"]} />＝i）</div>
          <div>・∠（距離∠方向角）<KeySeq seq={["[SHIFT]", "[ENG]"]} />　Abs（距離）<KeySeq seq={["[SHIFT]", "[(]"]} />　Arg（方向角）<KeySeq seq={["[OPTN]", "[1]"]} /></div>
          <div>・Conjg <KeySeq seq={["[OPTN]", "[2]"]} />　ReP（X）<KeySeq seq={["[OPTN]", "[3]"]} />　ImP（Y・面積）<KeySeq seq={["[OPTN]", "[4]"]} /></div>
          <div>・記憶は <KeySeq seq={["[STO]"]} />＋変数、呼び出しは <KeySeq seq={["[ALPHA]"]} />＋変数（A・B・C・D・E・F・x・y・M の9か所）</div>
          <div>・Arg の答えが負なら ＋360。答案の座標は小数点以下第3位を四捨五入</div>
        </div>
      )}
    </div>
  );
}

// 本試験の計算（土地）：与えられた座標から、求める点の座標と面積
function PastLandRun({ item, state, actions, onExit, onNext }) {
  const [laps, setLaps] = useState([]); // 区間タイム：区切りごとに「済」を押した時刻
  const [verified, setVerified] = useState(false); // 検算した
  const [vals, setVals] = useState({});
  const [checked, setChecked] = useState(null);
  const [hint, setHint] = useState(0);
  const [t0] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  const [res, setRes] = useState(null);
  const [missPick, setMissPick] = useState(null);
  useEffect(() => { if (checked) return undefined; const id = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(id); }, [!!checked]);
  const A = item.answer || { pts: [], areas: [] };
  const fields = [...A.pts.flatMap((p) => [{ key: `${p.pt}.x`, label: `${p.pt} X`, ans: p.x }, { key: `${p.pt}.y`, label: `${p.pt} Y`, ans: p.y }]), ...A.areas.map((a, i) => ({ key: `area.${i}`, label: a.label, ans: a.v, unit: "㎡" }))];
  const setV = (k, v) => setVals((x) => ({ ...x, [k]: v }));
  const check = () => {
    const good = fields.map((f) => near(vals[f.key], f.ans));
    const ok = good.every(Boolean);
    const sec = Math.round((Date.now() - t0) / 1000);
    SFX.play(ok ? "defeat" : "miss");
    const splits = laps.map((t, i) => ({ type: pastSecType((item.sections || [])[i].title), sec: Math.round((t - (i ? laps[i - 1] : t0)) / 1000) }));
    const best = actions.logPastCalc({ key: `L:${item.id}`, ok, sec, hints: hint, splits: hint ? [] : splits, verified });
    setChecked(good); setRes({ ok, sec, best, n: good.filter(Boolean).length });
  };
  const secs = item.sections || [];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between jp text-xs">
        <button onClick={onExit} style={{ color: "var(--ink-soft)", background: "none", border: "none" }}>← 本試験の計算へもどる</button>
        <span style={{ color: "var(--ink-soft)", fontWeight: 700 }}>⏱ {mmssOf(res ? res.sec : Math.round((now - t0) / 1000))}</span>
      </div>
      <Box title={`${item.label}　${item.purpose}`} icon={<Pencil size={18} />}>
        <div className="jp space-y-2">
          <div className="text-[11px]" style={{ color: "var(--ink-soft)" }}>この年の計算：{item.calcs}</div>
          <PastFigure pts={item.pts || []} ans={checked ? A.pts : null} />
          <YearFigures figKey={`L-${item.id}`} state={state} actions={actions} />
          <div className="text-[10px]" style={{ color: "var(--ink-mute)", fontWeight: 700 }}>与えられた座標（m）</div>
          <div className="grid grid-cols-2 gap-x-3 text-[12px]" style={{ fontFamily: "ui-monospace, monospace", color: "var(--ink)" }}>
            {(item.pts || []).map((p) => <div key={p.n}><b>{p.n}</b>　X {p.x.toFixed(2)}　Y {p.y.toFixed(2)}</div>)}
          </div>
          <div className="text-[10px]" style={{ color: "var(--ink-mute)", fontWeight: 700 }}>求めるもの</div>
          {(item.tasks || []).map((t, i) => <div key={i} className="text-[12px] px-2 py-1" style={{ background: "var(--cream)", border: "1px solid var(--rule-soft)", borderRadius: 6, color: "var(--ink)" }}><b>{t.pt}</b>　{t.desc}</div>)}
          <ComplexKeyLegend />
          <div className="text-[10px]" style={{ color: "var(--ink-mute)", fontWeight: 700 }}>あなたの答え（小数点以下第2位まで）</div>
          <div className="space-y-1.5">
            {A.pts.map((p) => (
              <div key={p.pt} className="flex items-center gap-1.5">
                <span className="text-xs" style={{ width: 40, flexShrink: 0, color: "var(--ink)", fontWeight: 800 }}>{p.pt}</span>
                {["x", "y"].map((ax) => { const k = `${p.pt}.${ax}`, fi = fields.findIndex((f) => f.key === k); return (
                  <span key={ax} className="flex items-center gap-1 flex-1"><span className="text-[10px]" style={{ color: "var(--ink-mute)" }}>{ax.toUpperCase()}</span><input disabled={!!checked} inputMode="decimal" value={vals[k] || ""} onChange={(e) => setV(k, e.target.value)} style={pastInp} />{checked && <span style={{ fontWeight: 900, color: checked[fi] ? "var(--sage)" : "#c9564e" }}>{checked[fi] ? "○" : "✕"}</span>}</span>
                ); })}
              </div>
            ))}
            {A.areas.map((a, i) => { const k = `area.${i}`, fi = fields.findIndex((f) => f.key === k); return (
              <div key={k} className="flex items-center gap-1.5"><span className="text-xs" style={{ width: 96, flexShrink: 0, color: "var(--ink)", fontWeight: 800 }}>面積 {a.label}</span><input disabled={!!checked} inputMode="decimal" value={vals[k] || ""} onChange={(e) => setV(k, e.target.value)} style={pastInp} /><span className="text-xs">㎡</span>{checked && <span style={{ fontWeight: 900, color: checked[fi] ? "var(--sage)" : "#c9564e" }}>{checked[fi] ? "○" : "✕"}</span>}</div>
            ); })}
          </div>
          <LapSplits secs={secs} t0={t0} laps={laps} setLaps={setLaps} done={!!checked} />
          {!checked && (<>
            {secs.slice(0, hint).map((s, i) => <PastSection key={i} sec={s} />)}
            <VerifyToggle on={verified} set={setVerified} text="検算した（面積を2通り・交点を逆の方向角で確かめる など）" />
            <div className="grid grid-cols-3 gap-2">
              <button disabled={hint >= secs.length} onClick={() => setHint(hint + 1)} className="btn-ghost py-2 text-xs" style={{ opacity: hint >= secs.length ? 0.4 : 1 }}>💡 手順を1つ（{hint}/{secs.length}）</button>
              <button onClick={check} className="btn-primary py-2 col-span-2">答え合わせ</button>
            </div>
          </>)}
          {checked && res && (<>
            <div className="text-center py-1" style={{ fontWeight: 900, fontSize: 18, color: res.ok ? "var(--sage)" : "#c9564e" }}>{res.ok ? "全問正解！" : `${res.n} / ${fields.length} 正解`}{res.best ? <span className="block text-[12px]" style={{ color: "var(--gold)" }}>🏆 自己ベスト {mmssOf(res.sec)}</span> : null}</div>
            <div className="text-xs px-2 py-1.5" style={{ background: "var(--sky-pale)", border: "1px solid var(--gold)", borderRadius: 8, color: "var(--ink)", fontWeight: 700, lineHeight: 1.8 }}>答え：{A.pts.map((p) => `${p.pt}(${p.x.toFixed(2)}, ${p.y.toFixed(2)})`).join("　")}{A.areas.length ? `　${A.areas.map((a) => `${a.label} ${a.v}㎡`).join("　")}` : ""}</div>
            {item.note && <div className="text-[11px] px-2 py-1.5" style={{ background: "rgba(214,181,106,0.12)", border: "1px dashed var(--gold)", borderRadius: 8, color: "var(--ink)" }}>⚠ {item.note}</div>}
            {secs.map((s, i) => <PastSection key={i} sec={s} />)}
            {!res.ok && (
              <div className="px-2 py-1.5" style={{ background: "rgba(201,86,78,0.06)", border: "1px solid #e0948a", borderRadius: 8 }}>
                <div className="text-[11px] mb-1" style={{ color: "var(--ink)", fontWeight: 700 }}>まちがえた原因は？</div>
                <div className="flex flex-wrap gap-1.5 text-[11px]">{CALC_MISS.map(([id, l]) => <button key={id} disabled={!!missPick} onClick={() => { actions.logCalcMiss("past", id); setMissPick(id); }} className="px-2 py-0.5" style={chipSt(missPick === id)}>{l}</button>)}</div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => window.dispatchEvent(new CustomEvent("sq-open-past", { detail: { to: "laps", key: `L-${item.id}` } }))} className="btn-ghost py-2 text-xs">📜 この年の答案（記述式の道場）</button>
              <button onClick={onNext} className="btn-primary py-2">次の年へ</button>
            </div>
          </>)}
        </div>
      </Box>
    </div>
  );
}

// 本試験の計算（建物）：床面積の求積
function PastFloorRun({ y, state, actions, onExit, onNext }) {
  const [verified, setVerified] = useState(false); // 検算した
  const rows = floorRows(y).filter((r) => r.v != null);
  const keys = floorKeys(y);
  const [vals, setVals] = useState({});
  const [checked, setChecked] = useState(null);
  const [t0] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  const [res, setRes] = useState(null);
  const [missPick, setMissPick] = useState(null);
  useEffect(() => { if (checked) return undefined; const id = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(id); }, [!!checked]);
  const basis = ((y.secs || []).find((s) => s.h === "床面積 ― 測定基準と算入・不算入") || { items: [] }).items.filter((i) => i.p).map((i) => i.p);
  const check = () => {
    const good = rows.map((r, i) => { const n = parseFloat(String(vals[i] || "").replace(/[^\d.]/g, "")); return Number.isFinite(n) && Math.round(n * 100) === Math.round(r.v * 100); });
    const ok = good.every(Boolean);
    const sec = Math.round((Date.now() - t0) / 1000);
    SFX.play(ok ? "defeat" : "miss");
    const best = actions.logPastCalc({ key: `F:${y.era}`, ok, sec, verified });
    setChecked(good); setRes({ ok, sec, best, n: good.filter(Boolean).length });
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between jp text-xs">
        <button onClick={onExit} style={{ color: "var(--ink-soft)", background: "none", border: "none" }}>← 本試験の計算へもどる</button>
        <span style={{ color: "var(--ink-soft)", fontWeight: 700 }}>⏱ {mmssOf(res ? res.sec : Math.round((now - t0) / 1000))}</span>
      </div>
      <Box title={`${y.label}　床面積（${y.title}）`} icon={<Pencil size={18} />}>
        <div className="jp space-y-2">
          <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>式の答えを電卓で出し、区分ごとの床面積を答えます。床面積は 1/100㎡未満を<b>切り捨て</b>（規則115条）。</p>
          <YearFigures figKey={y.id} state={state} actions={actions} />
          {rows.map((r, i) => (
            <div key={i} className="px-2 py-1.5 space-y-1" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 8 }}>
              <div className="text-[12px]" style={{ color: "var(--ink)", fontWeight: 800 }}>{r.label}</div>
              <div className="text-[12px]" style={{ fontFamily: "ui-monospace, monospace", color: "var(--ink)", lineHeight: 1.7 }}>{(checked ? r.lines : r.lines.map(hideResult).filter(Boolean)).map((l, j) => <div key={j}>{l}</div>)}</div>
              <div className="flex items-center gap-1.5"><span className="text-[11px]" style={{ color: "var(--ink-soft)", width: 48 }}>床面積</span><input disabled={!!checked} inputMode="decimal" value={vals[i] || ""} onChange={(e) => setVals({ ...vals, [i]: e.target.value })} style={pastInp} /><span className="text-xs">㎡</span>{checked && <span style={{ fontWeight: 900, color: checked[i] ? "var(--sage)" : "#c9564e" }}>{checked[i] ? "○" : "✕"}</span>}</div>
              {checked && <div className="text-[11px]" style={{ color: "#34508c", fontWeight: 700 }}>答え：{r.ans}</div>}
            </div>
          ))}
          {!checked && <VerifyToggle on={verified} set={setVerified} text="検算した（式をもう一度打つ・各階の合計を確かめる など）" />}
          {!checked && <button onClick={check} className="btn-primary w-full py-2">答え合わせ</button>}
          {checked && res && (<>
            <div className="text-center py-1" style={{ fontWeight: 900, fontSize: 18, color: res.ok ? "var(--sage)" : "#c9564e" }}>{res.ok ? "全問正解！" : `${res.n} / ${rows.length} 正解`}{res.best ? <span className="block text-[12px]" style={{ color: "var(--gold)" }}>🏆 自己ベスト {mmssOf(res.sec)}</span> : null}</div>
            {basis.length > 0 && <div className="text-[11px] px-2 py-1.5" style={{ background: "var(--sky-pale)", border: "1px solid var(--rule-soft)", borderRadius: 8, color: "var(--ink)" }}><b>測定基準と算入・不算入：</b>{basis.join(" ")}</div>}
            {keys.length > 0 && <PastSection sec={{ title: "🧮 電卓のキー操作（M+ で積み上げ）", steps: keys }} />}
            {!res.ok && (
              <div className="px-2 py-1.5" style={{ background: "rgba(201,86,78,0.06)", border: "1px solid #e0948a", borderRadius: 8 }}>
                <div className="text-[11px] mb-1" style={{ color: "var(--ink)", fontWeight: 700 }}>まちがえた原因は？</div>
                <div className="flex flex-wrap gap-1.5 text-[11px]">{CALC_MISS.map(([id, l]) => <button key={id} disabled={!!missPick} onClick={() => { actions.logCalcMiss("floor", id); setMissPick(id); }} className="px-2 py-0.5" style={chipSt(missPick === id)}>{l}</button>)}</div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => window.dispatchEvent(new CustomEvent("sq-open-past", { detail: { to: "laps", key: y.id } }))} className="btn-ghost py-2 text-xs">📜 この年の答案（記述式の道場）</button>
              <button onClick={onNext} className="btn-primary py-2">次の年へ</button>
            </div>
          </>)}
        </div>
      </Box>
    </div>
  );
}

// 計算の部屋：本試験の計算の一覧と、解く画面
// ── 電卓の型を磨く（2026年10月21日。本試験の計算の欄）：計算マニュアル20年分の手順から
//    ① 最短手順（自分でキーを組んで、模範の手順と1打ずつ比べる）② 変数メモリ（いまどの変数に何が入っているかを追う）③ 手順の組み立て（区切りの中の手順を正しい順に）
//    記録は rpg.calc2.craft = { keys:{n, same, extra}, mem:{n, ok}, build:{n, ok} } ──
const CRAFT_MODES = [
  ["keys", "最短手順", "やることを見て、自分でキーを組み立てます。模範の手順と1打ずつ比べて、余計なキー・抜けたキーを示します"],
  ["mem", "変数メモリ", "いまメモリにある点・値の表を見て、手順の「？」に入る変数を選びます。どこに何が入っているかを追う力"],
  ["build", "手順の組み立て", "1つの区切りの手順（出てくる答え）がばらばらに並びます。計算する順にタップします"],
];
const CRAFT_N = 5;
// 1打ずつの比べ（最長共通部分列）：same＝同じ、miss＝模範にあって自分にない、extra＝自分だけ
function keyDiff(model, mine) {
  const n = model.length, m = mine.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = model[i] === mine[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ops = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (model[i] === mine[j]) { ops.push({ k: model[i], t: "same" }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) ops.push({ k: model[i++], t: "miss" });
    else ops.push({ k: mine[j++], t: "extra" });
  }
  while (i < n) ops.push({ k: model[i++], t: "miss" });
  while (j < m) ops.push({ k: mine[j++], t: "extra" });
  return ops;
}
const MEM_RE = /^[A-FxyM]$/;
// 区切りの手順をたどって、各手順の直前のメモリ（変数→中身の説明）を作る
function memTrace(sec) {
  const mem = {};
  (sec.vars || []).forEach((v) => { mem[v.v] = `${v.pt}（${v.val}）`; });
  const before = [];
  (sec.steps || []).forEach((st, i) => {
    before.push({ ...mem });
    const k = st.k || [];
    for (let j = 0; j < k.length - 1; j++) {
      if (k[j] === "[STO]" && MEM_RE.test(k[j + 1])) {
        const own = String(st.o || "").replace(/\s*(を)?\s*[A-FxyM]\s*へ.*$/, "").trim();
        const prev = i > 0 ? String(sec.steps[i - 1].o || "") : "";
        const txt = own && !/^[A-FxyM]$/.test(own) ? own : prev || st.o || "";
        const cur = mem[k[j + 1]];
        if (!(cur && txt && cur.startsWith(txt.replace(/（.*$/, "")))) mem[k[j + 1]] = txt; // 座標を入れるだけの手順は、はじめの表（点と座標）のまま
      }
    }
  });
  return before;
}
function craftTasks(data, mode) {
  const out = [];
  (data || []).forEach((it) => (it.sections || []).forEach((sec) => {
    const steps = sec.steps || [];
    const head = `${it.label} ${it.purpose}｜${sec.title.replace(/^[①-⑨]\s*/, "")}`;
    if (mode === "build") {
      const os = steps.filter((s) => s.o && !/^[A-FxyM]\s*へ$/.test(s.o));
      if (os.length >= 3 && os.length <= 9) out.push({ head, sec, order: os.map((s) => s.o) });
      return;
    }
    const mems = mode === "mem" ? memTrace(sec) : null;
    steps.forEach((st, i) => {
      if (mode === "keys") {
        const keys = pastDrillOf(st.k || []);
        if (keys && keys.filter((k) => k !== "数").length >= 5 && st.o) out.push({ head, sec, i, keys, goal: st.o, prev: i > 0 ? steps[i - 1].o : null });
      } else {
        const k = st.k || [];
        const j = k.findIndex((t, x) => t === "[ALPHA]" && MEM_RE.test(k[x + 1] || ""));
        if (j < 0 || !st.o) return;
        const ans = k[j + 1], mem = mems[i];
        if (!mem[ans] || Object.keys(mem).length < 2) return;
        out.push({ head, sec, i, seq: k.map((t, x) => (x === j + 1 ? "？" : t)), ans, mem, goal: st.o });
      }
    });
  }));
  return out.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).slice(0, CRAFT_N).map((x) => x[1]);
}
function CalcCraft({ c2, actions }) {
  const data = usePastData("pastcalc");
  const [run, setRun] = useState(null); // { mode, tasks, i, mine:[], done:null|{...}, got:[], miss, picked, results:[] }
  const st = c2.craft || {};
  const start = (mode) => { const tasks = craftTasks(data, mode); if (tasks.length) setRun({ mode, tasks, i: 0, mine: [], done: null, got: [], miss: 0, picked: null, results: [], shuffled: tasks[0].order ? shuffle(tasks[0].order.map((o, x) => x)) : null }); };
  const next = (result) => {
    const results = [...run.results, result];
    const i = run.i + 1;
    if (i >= run.tasks.length) { actions.logCraft(run.mode, results); setRun({ ...run, results, i, fin: true }); return; }
    const t = run.tasks[i];
    setRun({ ...run, results, i, mine: [], done: null, got: [], miss: 0, picked: null, shuffled: t.order ? shuffle(t.order.map((o, x) => x)) : null });
  };
  const box = (children) => <Box title="電卓の型を磨く" icon={<Pencil size={18} />}><div className="jp space-y-2">{children}</div></Box>;
  if (!data) return null;
  if (!run) {
    const rate = (o) => (o && o.n ? `${Math.round(((o.ok ?? o.same) / o.n) * 100)}%・${o.n}問` : "まだ");
    return box(<>
      <p className="text-[11px]" style={{ color: "var(--ink-soft)", lineHeight: 1.7 }}>計算マニュアル20年分の手順（複素数モード）で、電卓の「型」を1つずつ鍛えます。速さは、キーの数・メモリの使い方・手順の順番で決まります。</p>
      {CRAFT_MODES.map(([id, nm, tx]) => (
        <button key={id} onClick={() => start(id)} className="w-full text-left px-2 py-2" style={{ borderRadius: 8, border: "1px solid var(--rule-soft)", background: "var(--paper)", color: "var(--ink)", cursor: "pointer" }}>
          <div className="flex items-baseline gap-2"><span className="text-[13px]" style={{ fontWeight: 800 }}>{nm}</span><span className="text-[10px]" style={{ color: "var(--ink-mute)" }}>{id === "keys" ? (st.keys && st.keys.n ? `模範と同じ ${rate(st.keys)}` : "まだ") : rate(st[id])}</span><span className="flex-1" /><span className="text-[11px]" style={{ color: "var(--sky-deep)", fontWeight: 800 }}>{CRAFT_N}問 ▶</span></div>
          <div className="text-[10px]" style={{ color: "var(--ink-soft)" }}>{tx}</div>
        </button>
      ))}
    </>);
  }
  const name = CRAFT_MODES.find((m) => m[0] === run.mode)[1];
  if (run.fin) {
    const ok = run.results.filter((r) => r.ok).length;
    const extra = run.results.reduce((t, r) => t + (r.extra || 0), 0);
    return box(<>
      <div className="text-center"><div style={{ fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 26, color: "var(--gold)" }}>{ok} / {run.results.length}</div><div className="text-[11px]" style={{ color: "var(--ink-soft)" }}>{name}{run.mode === "keys" ? `　模範と同じ手順 ${ok}問・余計なキー 合計${extra}打` : ""}</div></div>
      <div className="grid grid-cols-2 gap-2"><button onClick={() => setRun(null)} className="btn-ghost py-2">もどる</button><button onClick={() => start(run.mode)} className="btn-primary py-2">もう一度</button></div>
    </>);
  }
  const t = run.tasks[run.i];
  const top = (
    <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--ink-soft)" }}>
      <button onClick={() => setRun(null)} style={{ background: "none", border: "none", color: "var(--ink-soft)", cursor: "pointer" }}>✕ やめる</button>
      <span className="flex-1 text-right" style={{ fontWeight: 700 }}>{name}　{run.i + 1} / {run.tasks.length}</span>
    </div>
  );
  const ctx = <div className="text-[11px] px-2 py-1" style={{ background: "var(--cream)", border: "1px solid var(--rule-soft)", borderRadius: 6, color: "var(--ink)" }}>{t.head}</div>;
  const memTable = (mem) => (
    <div className="px-2 py-1.5" style={{ background: "#1f2a44", borderRadius: 8 }}>
      <div className="text-[10px] mb-0.5" style={{ color: "#f1dfae", fontWeight: 800 }}>いまのメモリ</div>
      {Object.entries(mem).map(([v, d]) => <div key={v} className="text-[11px]" style={{ color: "#dfe8f6" }}><b style={{ fontFamily: "ui-monospace, monospace", fontStyle: /^[xy]$/.test(v) ? "italic" : "normal", color: "#fff" }}>{v}</b>　{d}</div>)}
    </div>
  );
  // ① 最短手順
  if (run.mode === "keys") {
    const press = (k) => setRun((r) => (r.done ? r : { ...r, mine: [...r.mine, k] }));
    const judge = () => {
      const ops = keyDiff(t.keys, run.mine);
      const extra = ops.filter((o) => o.t === "extra").length, miss = ops.filter((o) => o.t === "miss").length;
      const ok = !extra && !miss;
      SFX.play(ok ? "defeat" : "miss");
      setRun({ ...run, done: { ops, extra, miss, ok } });
    };
    const mem = memTrace(t.sec)[t.i];
    return box(<>
      {top}{ctx}
      {Object.keys(mem).length > 0 && memTable(mem)}
      {t.prev && <div className="text-[11px]" style={{ color: "var(--ink-mute)" }}>直前の手順の結果：{t.prev}</div>}
      <div className="text-[13px] px-2 py-1.5" style={{ background: "var(--sky-pale)", border: "1px solid var(--sky-deep)", borderRadius: 8, color: "var(--ink)", fontWeight: 800 }}>やること：{t.goal}</div>
      <div className="flex flex-wrap gap-1 min-h-[28px] px-2 py-1" style={{ background: "var(--paper)", border: "1px dashed var(--rule-soft)", borderRadius: 6 }}>
        {run.mine.length === 0 && <span className="text-[11px]" style={{ color: "var(--ink-mute)" }}>下のキーで手順を組み立てます（数を入れるところは「数」）</span>}
        {(run.done ? run.done.ops : run.mine.map((k) => ({ k, t: "" }))).map((o, j) => <span key={j} style={{ ...KEYCAP, fontSize: 11, opacity: o.t === "miss" ? 0.75 : 1, background: o.t === "extra" ? "#f3c4bf" : o.t === "miss" ? "#fff3cf" : KEYCAP.background, outline: o.t === "miss" ? "2px dashed #d6b56a" : "none", textDecoration: o.t === "extra" ? "line-through" : "none" }}>{o.k}</span>)}
      </div>
      {!run.done ? (<>
        <div className="grid grid-cols-6 gap-1.5 p-2" style={{ background: "#2a3550", borderRadius: 10 }}>
          {PAST_PAD.map((k) => <button key={k} onClick={() => press(k)} style={{ ...KEYCAP, padding: "8px 0", fontSize: 13, background: k === "SHIFT" ? "linear-gradient(180deg, #f6e2a8, #d6b56a)" : k === "数" ? "linear-gradient(180deg, #dfe8f6, #b8c6dc)" : KEYCAP.background }}>{k}</button>)}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => setRun({ ...run, mine: run.mine.slice(0, -1) })} className="btn-ghost py-2 text-xs">⌫ 1つ消す</button>
          <button onClick={() => setRun({ ...run, mine: [] })} className="btn-ghost py-2 text-xs">クリア</button>
          <button disabled={!run.mine.length} onClick={judge} className="btn-primary py-2 text-xs">比べる</button>
        </div>
      </>) : (<>
        <div className="text-[12px] px-2 py-1.5" style={{ background: run.done.ok ? "rgba(109,132,84,0.12)" : "var(--cream)", border: `1px solid ${run.done.ok ? "var(--sage)" : "var(--gold)"}`, borderRadius: 8, color: "var(--ink)", lineHeight: 1.7 }}>
          {run.done.ok ? <b style={{ color: "#4f7a3a" }}>✓ 模範と同じ手順です（{t.keys.length}打）</b>
            : <>あなた <b>{run.mine.length}打</b>／模範 <b>{t.keys.length}打</b>　<span style={{ background: "#f3c4bf", padding: "0 4px" }}>余計 {run.done.extra}</span>　<span style={{ background: "#fff3cf", padding: "0 4px" }}>抜け {run.done.miss}</span>
              <div className="text-[10px]" style={{ color: "var(--ink-soft)" }}>{run.done.extra && run.mine.length > t.keys.length ? "模範より多い打数です。メモリ（ALPHA＋変数）や Ans を使うと、数を打ち直さずに済みます。" : run.mine.length < t.keys.length && t.keys.length - run.done.miss >= t.keys.length * 0.6 ? "模範より少ない打数です。別の正しい手順のこともあるので、実際の電卓で答えが合うか確かめましょう。" : ""}　黄色の点線＝抜けたキー、赤の取り消し線＝余計なキー</div></>}
        </div>
        <div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>模範の手順</div>
        <div className="px-2 py-1.5" style={{ background: "#fdfbf5", border: "1px solid var(--rule-soft)", borderRadius: 6 }}><KeySeq seq={t.sec.steps[t.i].k} /></div>
        <button onClick={() => next({ ok: run.done.ok, extra: run.done.extra })} className="btn-primary w-full py-2">{run.i + 1 >= run.tasks.length ? "結果へ" : "次へ"}</button>
      </>)}
    </>);
  }
  // ② 変数メモリ
  if (run.mode === "mem") {
    const opts = Object.keys(t.mem);
    const pick = (v) => { if (run.picked) return; const ok = v === t.ans; SFX.play(ok ? "defeat" : "miss"); setRun({ ...run, picked: v }); };
    return box(<>
      {top}{ctx}{memTable(t.mem)}
      <div className="text-[13px] px-2 py-1.5" style={{ background: "var(--sky-pale)", border: "1px solid var(--sky-deep)", borderRadius: 8, color: "var(--ink)", fontWeight: 800 }}>やること：{t.goal}</div>
      <div className="px-2 py-1.5" style={{ background: "#fdfbf5", border: "1px solid var(--rule-soft)", borderRadius: 6 }}><KeySeq seq={run.picked ? t.sec.steps[t.i].k : t.seq} /></div>
      <div className="text-[11px]" style={{ color: "var(--ink-soft)" }}>「？」に入る変数は？</div>
      <div className="grid grid-cols-4 gap-1.5">
        {opts.map((v) => { const right = run.picked && v === t.ans, bad = run.picked === v && v !== t.ans; return <button key={v} onClick={() => pick(v)} style={{ ...KEYCAP, padding: "10px 0", fontSize: 15, fontStyle: /^[xy]$/.test(v) ? "italic" : "normal", background: right ? "#cfe6c4" : bad ? "#f3c4bf" : KEYCAP.background }}>{v}</button>; })}
      </div>
      {run.picked && <>
        <div className="text-[12px]" style={{ color: run.picked === t.ans ? "#4f7a3a" : "#c9564e", fontWeight: 800 }}>{run.picked === t.ans ? "✓ 正解" : `✕ 正解は ${t.ans}`}：{t.ans} には「{t.mem[t.ans]}」が入っています</div>
        <button onClick={() => next({ ok: run.picked === t.ans })} className="btn-primary w-full py-2">{run.i + 1 >= run.tasks.length ? "結果へ" : "次へ"}</button>
      </>}
    </>);
  }
  // ③ 手順の組み立て
  const order = t.order;
  const tap = (x) => {
    if (run.got.includes(x) || run.got.length >= order.length) return;
    if (x === run.got.length) { const got = [...run.got, x]; if (got.length === order.length) SFX.play("defeat"); setRun({ ...run, got }); }
    else { SFX.play("miss"); setRun({ ...run, miss: run.miss + 1, flash: x }); }
  };
  const fin = run.got.length === order.length;
  return box(<>
    {top}{ctx}
    {t.sec.vars && t.sec.vars.length > 0 && <div className="text-[11px]" style={{ color: "var(--ink-soft)" }}>はじめに入れる点：{t.sec.vars.map((v) => `${v.v}＝${v.pt}`).join("　")}</div>}
    <div className="text-[11px]" style={{ color: "var(--ink-soft)" }}>計算する順にタップ（{run.got.length} / {order.length}）　まちがい {run.miss}</div>
    <div className="space-y-1">
      {run.shuffled.map((x) => { const at = run.got.indexOf(x); return (
        <button key={x} onClick={() => tap(x)} className="w-full text-left text-[12px] px-2 py-1.5 flex gap-2" style={{ borderRadius: 6, border: `1px solid ${at >= 0 ? "var(--sage)" : run.flash === x ? "#c9564e" : "var(--rule-soft)"}`, background: at >= 0 ? "rgba(109,132,84,0.12)" : "var(--paper)", color: "var(--ink)", cursor: at >= 0 ? "default" : "pointer", fontFamily: "ui-monospace, monospace" }}>
          <span style={{ width: 18, fontWeight: 900, color: "var(--sage)" }}>{at >= 0 ? at + 1 : ""}</span><span className="flex-1">{order[x]}</span>
        </button>
      ); })}
    </div>
    {fin && <>
      <div className="text-[12px]" style={{ color: run.miss ? "var(--gold)" : "#4f7a3a", fontWeight: 800 }}>{run.miss ? `完成（まちがい ${run.miss}回）` : "✓ ノーミスで完成！"}</div>
      <PastSection sec={t.sec} />
      <button onClick={() => next({ ok: run.miss === 0 })} className="btn-primary w-full py-2">{run.i + 1 >= run.tasks.length ? "結果へ" : "次へ"}</button>
    </>}
  </>);
}
const VerifyToggle = ({ on, set, text }) => (
  <button onClick={() => set(!on)} className="w-full text-left text-[11px] px-2 py-1.5" style={{ borderRadius: 6, border: `1px solid ${on ? "var(--sage)" : "var(--rule-soft)"}`, background: on ? "rgba(109,132,84,0.12)" : "var(--paper)", color: "var(--ink)", cursor: "pointer" }}>{on ? "☑" : "☐"} ✔ {text}</button>
);
// ── 区間タイム（本試験の土地の計算）：手順の区切りごとに「済」を押して、どの工程が遅いかを測る ──
const pastSecType = (title) => (PAST_DRILL_TYPES.slice(1).find((x) => x[2].test(title)) || ["other", "そのほか"])[1];
function LapSplits({ secs, t0, laps, setLaps, done }) {
  const [, tick] = useState(0);
  useEffect(() => { if (done) return undefined; const id = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(id); }, [done]);
  if (!secs.length) return null;
  const at = (i) => (i < 0 ? t0 : laps[i]);
  const cur = laps.length;
  return (
    <div className="px-2 py-1.5 space-y-1" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 8 }}>
      <div className="text-[11px]" style={{ color: "var(--ink)", fontWeight: 800 }}>⏱ 区間タイム（実際の電卓で1つの区切りを終えたら「済」）</div>
      {secs.map((s, i) => {
        const sec = i < cur ? Math.round((laps[i] - at(i - 1)) / 1000) : i === cur && !done ? Math.round((Date.now() - at(i - 1)) / 1000) : null;
        return (
          <div key={i} className="flex items-center gap-2 text-[11px]">
            <span className="flex-1 min-w-0 truncate" style={{ color: i < cur ? "var(--ink-mute)" : "var(--ink)" }}>{s.title}</span>
            <span style={{ width: 44, textAlign: "right", fontFamily: "ui-monospace, monospace", color: i === cur ? "var(--sky-deep)" : "var(--ink-soft)", fontWeight: 700 }}>{sec != null ? mmssOf(sec) : ""}</span>
            {i === cur && !done ? <button onClick={() => setLaps([...laps, Date.now()])} className="btn-sky text-[10px] px-2 py-0.5">済</button> : <span style={{ width: 30 }} />}
          </div>
        );
      })}
    </div>
  );
}
// 本試験の計算の欄：工程ごとの平均時間（遅い順）と、検算した回・しなかった回の正解率
function PastHabits({ past }) {
  const stepT = past.stepT || {};
  const rows = Object.entries(stepT).filter(([, v]) => v.n).map(([k, v]) => ({ k, n: v.n, avg: Math.round(v.sec / v.n) })).sort((a, b) => b.avg - a.avg);
  const vf = past.verify || {};
  const rate = (o) => (o && o.n ? `${Math.round((o.ok / o.n) * 100)}%（${o.n}回）` : "－");
  if (!rows.length && !(vf.y && vf.y.n) && !(vf.n && vf.n.n)) return null;
  const max = rows.length ? rows[0].avg : 1;
  return (
    <div className="px-2 py-1.5 space-y-1" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 8 }}>
      {rows.length > 0 && <>
        <div className="text-[11px]" style={{ color: "var(--ink)", fontWeight: 800 }}>⏱ 工程ごとの平均時間（遅い順）</div>
        {rows.map((x) => <div key={x.k} className="flex items-center gap-2 text-[11px]"><span style={{ width: 120, color: "var(--ink)" }}>{x.k}</span><span className="flex-1" style={{ height: 6, borderRadius: 3, background: "var(--beige)", overflow: "hidden" }}><span style={{ display: "block", width: `${(x.avg / max) * 100}%`, height: "100%", background: x === rows[0] ? "#c9564e" : "#d6b56a" }} /></span><span style={{ width: 70, textAlign: "right", color: "var(--ink-soft)" }}>{mmssOf(x.avg)}・{x.n}回</span></div>)}
        <div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>いちばん遅い「{rows[0].k}」を、下の「本試験の手順の早押し」で型ごとに練習すると効果的です。</div>
      </>}
      {((vf.y && vf.y.n) || (vf.n && vf.n.n)) ? <div className="text-[11px]" style={{ color: "var(--ink)" }}>✔ 検算した回の正解率 <b>{rate(vf.y)}</b>　／　しなかった回 <b>{rate(vf.n)}</b></div> : null}
    </div>
  );
}
function PastCalcArea({ c2, state, actions, open, setOpen }) {
  const land = usePastData("pastcalc");
  const kj = usePastData("kijutsu");
  const past = c2.past || {};
  const res = past.res || {};
  const bldg = (kj || []).filter((y) => y.kind === "bldg" && floorRows(y).some((r) => r.v != null)).sort((a, b) => a.year - b.year);
  const landList = (land || []).slice().sort((a, b) => a.year - b.year);
  const keyOf = (kind, era) => `${kind}:${era}`;
  const listOf = (kind) => (kind === "L" ? landList.map((x) => x.id) : bldg.map((y) => y.era));
  const nextOf = (kind, era) => { const l = listOf(kind); const i = l.indexOf(era); return l[(i + 1) % l.length]; };
  if (open) {
    if (!land || !kj) return <div className="jp text-center text-sm py-6" style={{ color: "var(--ink-soft)" }}>読み込んでいます…</div>;
    const exit = () => setOpen(null);
    const next = () => setOpen({ kind: open.kind, id: nextOf(open.kind, open.id), n: Date.now() });
    if (open.kind === "L") { const item = landList.find((x) => x.id === open.id); if (item) return <PastLandRun key={`${open.id}${open.n || ""}`} item={item} state={state} actions={actions} onExit={exit} onNext={next} />; }
    if (open.kind === "F") { const y = bldg.find((x) => x.era === open.id); if (y) return <PastFloorRun key={`${open.id}${open.n || ""}`} y={y} state={state} actions={actions} onExit={exit} onNext={next} />; }
    return <button onClick={exit} className="btn-ghost w-full py-2 jp">見つかりません。もどる</button>;
  }
  const doneN = Object.keys(past.done || {}).length;
  const chipRow = (kind, eras) => (
    <div className="flex flex-wrap gap-1.5">
      {eras.map((era) => { const r = res[keyOf(kind, era)]; return (
        <button key={era} onClick={() => setOpen({ kind, id: era })} className="px-2 py-0.5 text-[11px]" style={{ ...chipSt(false), borderColor: r ? (r.last ? "var(--sage)" : "#e0948a") : "var(--rule-soft)", background: r ? (r.last ? "rgba(109,132,84,0.12)" : "rgba(201,86,78,0.08)") : "var(--paper)" }}>
          {era}{r ? (r.last ? " ○" : " ✕") : ""}{r && r.best ? <span style={{ color: "var(--gold)" }}> {mmssOf(r.best)}</span> : null}
        </button>
      ); })}
    </div>
  );
  const firstTodo = (kind) => listOf(kind).find((e) => !(past.done || {})[keyOf(kind, e)]) || listOf(kind)[0];
  return (
    <>
    <Box title="本試験の計算（記述式 H17〜R6）" icon={<Award size={18} />}>
      <div className="jp space-y-2">
        <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>計算マニュアルの20年分の座標と、建物の攻略本の床面積で、本番と同じ数字を解きます。手順は計算マニュアルと同じ複素数モードのキー操作。全{PAST_TOTAL}題を正解すると1周（500G）。いま第{past.lap || 1}周・{doneN}/{PAST_TOTAL}。</p>
        {!land || !kj ? <div className="text-[11px]" style={{ color: "var(--ink-mute)" }}>読み込んでいます…</div> : (<>
          <div className="px-2 py-1.5 space-y-1.5" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 8 }}>
            <div className="flex items-center justify-between"><span className="text-xs" style={{ color: "var(--ink)", fontWeight: 800 }}>📐 土地：座標・交点・面積（{landList.length}年）</span><button onClick={() => setOpen({ kind: "L", id: firstTodo("L") })} className="btn-sky px-2 py-0.5 text-[11px]">続きから</button></div>
            {chipRow("L", landList.map((x) => x.id))}
          </div>
          <div className="px-2 py-1.5 space-y-1.5" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 8 }}>
            <div className="flex items-center justify-between"><span className="text-xs" style={{ color: "var(--ink)", fontWeight: 800 }}>🏠 建物：床面積（{bldg.length}年）</span><button onClick={() => setOpen({ kind: "F", id: firstTodo("F") })} className="btn-sky px-2 py-0.5 text-[11px]">続きから</button></div>
            {chipRow("F", bldg.map((y) => y.era))}
          </div>
          <PastHabits past={past} />
        </>)}
      </div>
    </Box>
    <CalcCraft c2={c2} actions={actions} />
    </>
  );
}

export { CalcTab };
