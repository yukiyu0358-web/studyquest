// AdventureTab とその部品（2026-10-26、App.jsx から切り出し。開いたときに読み込む）
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
import { seasonBossNow, SEASON_BOSS_REWARD, localDateStr, daysBetween, featOn, ADV_CLASSES, ADV_NEED, ALLIES, ALLY_EVO, ALLY_SKILLS, ALLY_TRIAL_N, ALLY_TRIAL_PASS, ART_URL, AWAKEN_THRESHOLDS, AnswerPanel, BASE_LINE, BATTLE, BATTLE_CSS, BATTLE_THEME, BOND_LV, BREW_RECIPES, BackRowAllies, BarCharPicker, BattleResult, BattleStage, Box, CASTLE_FLOORS, CAT_TIERS, CHIBI, CLASS_CHANGE_COST, DailyQuests, EVO_URL, FORGE_MAX, FRAG_IDS, GACHA_COST, GACHA_PITY, GACHA_RATE, HERO_FACES, HERO_NAME, HERO_STAGES, HERO_STAGE_LV, HeroPortrait, HitNumbers, JOURNEY_LEN, JOURNEY_PER, KILL_TIERS, LAW_BY_KEY, LUNA_CSS, LUNA_SKILLS, LawRefChips, LunaSprite, MASTERED_STABILITY, MON_BOSS, MON_MASK, MON_PAINTED, MON_STAND, MaterialIcon, MonPic, PASS_LINE, PET_THRESHOLDS, PET_TYPES, PartyFace, PetIcon, QuestionImages, RARITY, RARITY_RANK, RPG_ACHIEVEMENTS, RPG_BOSSES, RPG_CLASSES, RPG_CONSUMABLES, RPG_ITEMS, RPG_MATERIALS, RPG_SLOTS, RUNE_CRIT, RUNE_DMG, RUNE_FRAG, RUNE_GOLD, RUNE_SLOTS, RehearsalRun, RevealButton, RivalCard, SEASON_RANKS, SEC_PASS, SKILL_RESET_COST, SKILL_TREE, SMAP_ORDER, SQ_CLEAR, STAGE_URL, STORY_CHAPTERS, STUDY_GROUP_PASS, SkillCutIn, SkyLayer, TAME_AT, TAME_DMG, TAME_EVERY, TOWER_LAYERS, TOWER_MAX, TOWER_PASS, TreasureChest, WEEKLY_REWARD, addDays, alliesJoined, alliesReady, allyById, allyEvoStage, auraOf, backRow, battleParty, bondFx, bondLevel, bringIntoView, buildPoolFromBanks, byRegionOrder, calculateStatus, castleCtx, castleFloorOf, catCounts, chapterIndex, chipSt, classRankIndex, combatPower, curWorld, daysUntil, dexStatus, dungeonBestOf, effectiveSr, equippedWeaponId, extractLawRefs, fmtMin, forgeCost, forgedFx, fragCount, fxText, gapItems, getAwakening, getClassInfo, getFsrsScheduler, getPetInfo, getRpgBonuses, hashStr, heroEvoArt, heroStage, isCheckpoint, isQuestionWeak, joinProg, journeyEvent, loadLaw, mainQual, matById, monSpecies, monStandUrl, monsterFor, monthlyReport, normRpg, parseLocalDate, passChance, passPower, pctTxt, powerLogOf, prevMonthOf, regionCleared, regionConquest, regionInfo, regionQuests, regionRank, regionStageUrl, renderFormattedText, renderQText, rewardText, rivalPowerAt, rollChest, rollRpgItem, rpgEquippedItems, rpgInvItem, rpgItemById, runeHits, runeName, runeRegions, seasonPoints, seasonRank, seasonRewardText, setDisplay, setStatus, shuffle, shuffleArr, skillPointsTotal, skillPointsUsed, splitHits, sqOpen, sqStars, sqStarsOf, starBooks, startAllyTrial, storyClears, studyScope, themeOf, toFsrsCard, todayStr, towerLayer, uid, weekKey, weeklyReport, worldArc, worldChapters, worldOfQual, worldPassChance, ymdCode } from "../App.jsx";


// 次に戦うボス（倒すたびに強くなり、6体倒すと★付きで2周目へ）
function getNextBoss(r) {
  const idx = r.bossWins % RPG_BOSSES.length;
  const loop = Math.floor(r.bossWins / RPG_BOSSES.length);
  const b = RPG_BOSSES[idx];
  return { ...b, idx, loop, hp: Math.round(b.hp * (1 + 0.35 * loop)), atk: Math.round(b.atk * (1 + 0.2 * loop)), label: `${b.name}${"★".repeat(Math.min(loop, 5))}` };
}

// ボス戦の出題：苦手な問題を優先し、足りなければ間違いの多い問題・定着の浅い問題で補う
function buildBossPool(state, qualId, n = 10) {
  const banks = state.questionBanks.filter((b) => qualId === "all" || (b.qualId || "_none_") === qualId);
  const all = banks.flatMap((b) => (b.questions || []).filter((q) => !q.excluded).map((q) => ({ bankId: b.id, bankName: b.name, q })));
  let pool = shuffle(all.filter((x) => isQuestionWeak(x.q))).slice(0, n);
  if (pool.length < n) {
    const rest = all.filter((x) => !isQuestionWeak(x.q))
      .sort((a, b) => (b.q.wrong || 0) - (a.q.wrong || 0) || (((a.q.fs && a.q.fs.s) || 0) - ((b.q.fs && b.q.fs.s) || 0)));
    pool = [...pool, ...rest.slice(0, n - pool.length)];
  }
  return shuffle(pool).map((x) => ({ bankId: x.bankId, bankName: x.bankName, qId: x.q.id }));
}

const RpgRarityTag = ({ rarity }) => (
  <span className="pixel text-[9px] px-1" style={{ background: RARITY[rarity].color, color: "var(--paper)", borderRadius: 3 }}>{rarity}</span>
);

// ── スキル（星の書）：3つの道を上から順に覚える ──
const ROMAN = ["I", "II", "III", "IV", "V"];
function SkillPanel({ state, actions, flash }) {
  const r = normRpg(state.rpg);
  const total = skillPointsTotal(state);
  const left = total - skillPointsUsed(r);
  const [just, setJust] = useState(null); // 覚えたばかりのスキル（光の演出）
  const learn = (n) => {
    const m = actions.learnSkill(n.id);
    if (m && m.endsWith("覚えた！")) { setJust(n.id); SFX.play("skill"); setTimeout(() => setJust(null), 1000); }
    if (m) flash(m);
  };
  return (
    <>
      <style>{BATTLE_CSS}</style>
      <Box title="スキル" icon={<Sparkles size={18} />}>
        <div className="flex items-center gap-3 mb-3 p-3" style={{ background: "var(--sky-pale)", border: "1px solid var(--rule-soft)" }}>
          <div className="flex-1 min-w-0">
            <div className="jp text-xs" style={{ color: "var(--ink-soft)" }}>スキルポイント</div>
            <div className="jp" style={{ color: "var(--ink)" }}><span style={{ fontSize: 28, fontWeight: 800, color: left > 0 ? "var(--gold)" : "var(--ink)" }}>{left}</span><span className="text-sm"> / {total}</span></div>
            <div className="jp text-[10px]" style={{ color: "var(--ink-mute)" }}>レベルが1上がるごとに1ポイント。同じ道は上から順に覚えます。</div>
          </div>
          {r.skills.length > 0 && <button onClick={() => { if (confirm(`${SKILL_RESET_COST}Gを払って、覚えたスキルをすべて忘れ、ポイントを戻しますか？`)) flash(actions.resetSkills()); }} className="jp btn-ghost text-[11px] px-2 py-1.5 flex-shrink-0">忘却の儀式<br />{SKILL_RESET_COST}G</button>}
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {SKILL_TREE.map((b) => (
            <div key={b.id} className="p-2" style={{ border: `1px solid ${b.color}55`, background: "var(--paper)" }}>
              <div className="jp text-center mb-2"><span style={{ fontWeight: 800, color: b.color, letterSpacing: "0.1em" }}>{b.name}</span><span className="text-[10px] ml-1" style={{ color: "var(--ink-mute)" }}>{b.sub}</span></div>
              {b.nodes.map((n, i) => {
                const learned = r.skills.includes(n.id);
                const open = !learned && (i === 0 || r.skills.includes(b.nodes[i - 1].id));
                const can = open && left >= n.cost;
                return (
                  <div key={n.id}>
                    {i > 0 && <div style={{ width: 2, height: 12, marginLeft: 21, background: learned ? b.color : "var(--rule-soft)" }} />}
                    <div className="flex items-center gap-2" style={{ opacity: learned || open ? 1 : 0.45 }}>
                      <div style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 14,
                        background: learned ? `radial-gradient(circle at 35% 30%, ${b.color}cc, ${b.color})` : "var(--paper)", color: learned ? "#fdfbf5" : b.color,
                        border: `2px solid ${learned ? "#d6b56a" : open ? b.color : "var(--rule-soft)"}`,
                        animation: just === n.id ? "sqfLearn .9s ease-out" : can ? "sqfPulse 1.8s ease-in-out infinite" : undefined }}>{ROMAN[i]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="jp text-sm" style={{ color: "var(--ink)", fontWeight: 700 }}>{n.name}</div>
                        <div className="jp text-[10px]" style={{ color: "var(--sky-deep)" }}>{fxText(n.fx)}</div>
                      </div>
                      {learned ? <span className="jp text-[10px]" style={{ color: b.color, fontWeight: 700 }}>習得済み</span>
                        : <button disabled={!can} onClick={() => learn(n)} className="jp btn-primary text-[11px] px-2 py-1 flex-shrink-0">覚える<br />SP{n.cost}</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </Box>
    </>
  );
}

// ── 鍛冶場：素材とゴールドで装備を強化する（+1〜+10） ──
function ForgePanel({ state, actions }) {
  const r = normRpg(state.rpg);
  const bonus = getRpgBonuses(state);
  const eqU = new Set(Object.values(r.equipped).filter(Boolean));
  const list = r.inventory.map((v) => ({ v, it: rpgInvItem(v) })).filter((x) => x.it)
    .sort((a, b) => (eqU.has(b.v.u) - eqU.has(a.v.u)) || (["N", "R", "SR", "SSR"].indexOf(b.it.rarity) - ["N", "R", "SR", "SSR"].indexOf(a.it.rarity)) || (b.it.plus - a.it.plus));
  const [sel, setSel] = useState(() => (list[0] ? list[0].v.u : null));
  const [phase, setPhase] = useState(null); // null | "hammer" | {ok, msg, plus}
  const cur = list.find((x) => x.v.u === sel) || list[0];
  const busy = phase === "hammer";
  const strike = () => {
    if (!cur || busy) return;
    setPhase("hammer");
    [0, 300, 600].forEach((t) => setTimeout(() => SFX.play("clang"), t));
    setTimeout(() => {
      const res = actions.forge(cur.v.u);
      setPhase(res);
      SFX.play(res.ok ? "forgeOk" : "forgeFail");
      setTimeout(() => setPhase((p) => (p === res ? null : p)), 1800);
    }, 900);
  };
  const sparks = Array.from({ length: 12 }, (_, i) => { const a = -Math.PI * (0.1 + 0.8 * (i / 11)); const d = 30 + (i % 4) * 9; return { dx: `${Math.round(Math.cos(a) * d)}px`, dy: `${Math.round(Math.sin(a) * d)}px`, delay: (i % 3) * 0.3 }; });
  const have = (id) => r.materials[id] || 0;
  return (
    <>
      <style>{BATTLE_CSS}</style>
      <Box title="鍛冶場" icon={<Sword size={18} />}>
        <div className="mb-3 relative overflow-hidden" style={{ height: 120, borderRadius: 8, border: "1px solid #b08a3e", background: `url(${ART_URL}forge.jpg) center 45%/cover no-repeat` }}>
          <div className="absolute inset-x-0 bottom-0 px-3 py-1 jp text-xs" style={{ background: "linear-gradient(0deg, rgba(253,251,245,0.95), rgba(253,251,245,0))", color: "#22335c", fontWeight: 700 }}>素材とゴールドで、装備を鍛え上げよう</div>
        </div>
        {!cur ? <p className="jp text-sm" style={{ color: "var(--ink-mute)" }}>強化できる装備を持っていません。ショップやボス討伐で手に入れましょう。</p> : (() => {
          const it = cur.it;
          const max = it.plus >= FORGE_MAX;
          const c = forgeCost(it, it.plus, bonus.forgePct);
          const next = forgedFx(rpgItemById(it.id).fx, it.plus + 1);
          const rows = [["ゴールド", c.gold, r.gold, null], ["欠片（どの科目でも）", c.frag, fragCount(r.materials), "m-chiban"], ["星霊石", c.star, have("m-star"), "m-star"], ["賢者の結晶", c.sage, have("m-sage"), "m-sage"]].filter((x) => x[1] > 0);
          const enough = rows.every((x) => x[2] >= x[1]);
          return (
            <div className="p-3 mb-3" style={{ background: "var(--sky-pale)", border: "1px solid var(--rule-soft)" }}>
              <div className="flex items-center gap-4">
                {/* 金床と槌 */}
                <div className="relative flex-shrink-0" style={{ width: 120, height: 120 }}>
                  <svg viewBox="0 0 120 120" width="120" height="120" style={{ position: "absolute", inset: 0 }} aria-hidden="true">
                    <path d="M18 92h70c0-8 6-12 16-12v-8H30c-4 6-8 10-12 10z" fill="#5b6b8c" stroke="#22335c" strokeWidth="2" strokeLinejoin="round" />
                    <path d="M44 92l-6 16h44l-6-16z" fill="#4a5a7c" stroke="#22335c" strokeWidth="2" strokeLinejoin="round" />
                  </svg>
                  <div style={{ position: "absolute", left: 32, top: 14, animation: phase && phase !== "hammer" ? (phase.ok ? "sqbIdle 1.2s ease-in-out infinite" : undefined) : undefined }}>
                    <GameIcon ch={it.icon} id={it.id} rarity={it.rarity} size={56} />
                    {it.plus > 0 && <span className="jp" style={{ position: "absolute", right: -8, bottom: -2, fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 13, color: "#fdfbf5", background: "#b08a3e", borderRadius: 999, padding: "0 5px" }}>+{it.plus}</span>}
                  </div>
                  {busy && (<>
                    <svg viewBox="0 0 40 60" width="40" height="60" style={{ position: "absolute", right: -4, top: -10, transformOrigin: "34px 54px", animation: "sqfHammer .3s ease-in-out 3" }} aria-hidden="true">
                      <rect x="31" y="14" width="5" height="42" rx="2" fill="#8a5a32" stroke="#5f3f1f" strokeWidth="1" />
                      <rect x="18" y="6" width="22" height="12" rx="2" fill="#a7afc2" stroke="#22335c" strokeWidth="1.4" />
                    </svg>
                    {sparks.map((s, i) => <span key={i} style={{ position: "absolute", left: 58, top: 60, width: 5, height: 5, borderRadius: "50%", background: i % 2 ? "#f2c14e" : "#fff3c4", boxShadow: "0 0 6px #f2c14e", "--dx": s.dx, "--dy": s.dy, animation: `sqfSpark .35s ease-out ${s.delay}s both` }} />)}
                  </>)}
                  {phase && phase !== "hammer" && (phase.ok
                    ? <div style={{ position: "absolute", left: 10, top: 0, width: 100, height: 100, borderRadius: "50%", border: "3px solid #f2c14e", boxShadow: "0 0 24px #f2c14e", animation: "sqfGlow 1s ease-out forwards", pointerEvents: "none" }} />
                    : <div style={{ position: "absolute", left: 30, top: 20, width: 60, height: 60, borderRadius: "50%", background: "radial-gradient(circle, rgba(120,120,130,0.7), rgba(120,120,130,0))", animation: "sqfSmoke 1.2s ease-out forwards", pointerEvents: "none" }} />)}
                </div>
                <div className="flex-1 min-w-0 jp">
                  <div className="text-base" style={{ color: "var(--ink)", fontWeight: 800 }}>{it.label} <RpgRarityTag rarity={it.rarity} /></div>
                  <div className="text-[11px]" style={{ color: "var(--sky-deep)" }}>いま：{fxText(it.fx)}</div>
                  {!max && <div className="text-[11px]" style={{ color: "var(--gold)", fontWeight: 700 }}>+{it.plus + 1}：{fxText(next)}</div>}
                  {phase && phase !== "hammer" && <div className="text-sm mt-1" style={{ fontWeight: 800, color: phase.ok ? "var(--gold)" : "var(--brick)", animation: "sqFadeIn .3s ease-out" }}>{phase.msg}</div>}
                </div>
              </div>
              {max ? <p className="jp text-sm text-center mt-3" style={{ color: "var(--gold)", fontWeight: 800 }}>最大まで強化済み（+{FORGE_MAX}）</p> : (<>
                <div className="grid grid-cols-2 gap-1.5 mt-3">
                  {rows.map(([label, need, got, icon]) => (
                    <div key={label} className="jp flex items-center gap-1.5 text-xs px-2 py-1" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)" }}>
                      {icon ? <MaterialIcon id={icon} size={18} /> : <span style={{ color: "var(--gold)" }}>G</span>}
                      <span className="flex-1 truncate" style={{ color: "var(--ink-soft)" }}>{label}</span>
                      <span style={{ fontWeight: 800, color: got >= need ? "var(--ink)" : "var(--brick)" }}>{need.toLocaleString()}</span>
                      <span className="text-[10px]" style={{ color: "var(--ink-mute)" }}>/{got.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <div className="jp text-center flex-shrink-0" style={{ width: 84 }}>
                    <div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>成功率</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: c.rate >= 80 ? "var(--sage)" : c.rate >= 50 ? "var(--gold)" : "var(--brick)" }}>{c.rate}%</div>
                  </div>
                  <button onClick={strike} disabled={!enough || busy} className="jp btn-primary flex-1 py-3 text-base">{busy ? "カン、カン、カン…" : "強化する"}</button>
                </div>
                <p className="jp text-[10px] mt-2" style={{ color: "var(--ink-mute)" }}>+3までは必ず成功します。失敗しても段階は下がりませんが、素材とゴールドは使います。+4から星霊石、+8から賢者の結晶が必要です。</p>
              </>)}
            </div>
          );
        })()}
        {list.length > 0 && (
          <div className="space-y-1">
            <div className="jp text-xs" style={{ color: "var(--ink-soft)" }}>強化する装備を選ぶ</div>
            {list.map(({ v, it }) => (
              <button key={v.u} onClick={() => !busy && setSel(v.u)} className="w-full text-left flex items-center gap-2 p-1.5" style={{ border: `1px solid ${cur && cur.v.u === v.u ? "var(--gold)" : "var(--rule-soft)"}`, background: cur && cur.v.u === v.u ? "var(--cream)" : "var(--paper)" }}>
                <GameIcon ch={it.icon} id={it.id} rarity={it.rarity} size={30} />
                <span className="jp text-xs flex-1" style={{ color: "var(--ink)" }}>{it.label} <RpgRarityTag rarity={it.rarity} /></span>
                {eqU.has(v.u) && <span className="jp text-[10px]" style={{ color: "var(--sage)" }}>装備中</span>}
              </button>
            ))}
          </div>
        )}
      </Box>
      <Box title="素材袋" icon={<Bookmark size={18} />}>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-1.5">
          {RPG_MATERIALS.map((m) => (
            <div key={m.id} className="jp flex items-center gap-1.5 px-2 py-1.5" title={m.desc || ""} style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", opacity: have(m.id) > 0 ? 1 : 0.45 }}>
              <MaterialIcon id={m.id} size={24} />
              <div className="min-w-0">
                <div className="text-[10px] truncate" style={{ color: "var(--ink-soft)" }}>{m.name}</div>
                <div className="text-sm" style={{ fontWeight: 800, color: "var(--ink)" }}>{have(m.id)}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="jp text-[10px] mt-2" style={{ color: "var(--ink-mute)" }}>魔物を倒すと、その科目の欠片を落とします。手強い魔物（苦手な問題）は欠片を2つと、星霊石を落とすことがあります。10コンボごとの必殺技で賢者の結晶が手に入ります。</p>
      </Box>
    </>
  );
}

// ── 主人公の進化の道のり：6つの姿（まだの姿は影で見せる） ──
function EvolutionRoad({ state }) {
  const lv = state.player.level;
  const cur = heroStage(lv).idx;
  const th = BATTLE_THEME[(state.displaySettings && state.displaySettings.theme) || "white"] || BATTLE_THEME.white;
  return (
    <Box title="進化の道のり" icon={<Sparkles size={18} />}>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {HERO_STAGES.map((s, i) => {
          const got = i <= cur;
          return (
            <div key={s.name} className="jp text-center p-2" style={{ background: i === cur ? "var(--cream)" : "var(--paper)", border: `1px solid ${i === cur ? "var(--gold)" : "var(--rule-soft)"}` }}>
              <div style={{ width: 72, height: 72, margin: "0 auto", padding: 3, borderRadius: 12, background: got ? s.frame : "var(--rule-soft)", boxShadow: got ? s.glow : "none" }}>
                <div role="img" aria-label={got ? s.name : "まだ見ぬ姿"} style={{ width: "100%", height: "100%", borderRadius: 9, backgroundImage: `url(${heroEvoArt(i)})`, backgroundSize: "cover", backgroundPosition: "center 15%", filter: got ? undefined : "grayscale(1) brightness(0.35) blur(1.5px)" }} />
              </div>
              <div style={{ display: "none" }}>
                <div style={{ width: "100%", height: "100%", borderRadius: "50%", backgroundColor: "#e9e4d6", backgroundImage: `url(${th.avatar})`, backgroundSize: "300% auto", backgroundPosition: `${th.face[0]}% ${th.face[1]}%`, filter: got ? "none" : "brightness(0) opacity(0.35)" }} />
              </div>
              <div className="text-[11px] mt-1" style={{ fontWeight: 800, color: got ? "var(--ink)" : "var(--ink-mute)" }}>{got ? s.name : "？？？"}</div>
              <div className="text-[10px]" style={{ color: i === cur ? "var(--gold)" : "var(--ink-mute)" }}>{i === cur ? "いまの姿" : `Lv${HERO_STAGE_LV[i]}`}</div>
            </div>
          );
        })}
      </div>
      <p className="jp text-[10px] mt-2" style={{ color: "var(--ink-mute)" }}>レベル10・20・30・40・50で姿が進化し、額縁・紋章・翼・星の光が豪華になります。{cur < HERO_STAGES.length - 1 ? `次の進化まで あとLv${HERO_STAGE_LV[cur + 1] - lv}。` : "最後の姿に到達しました！"}</p>
    </Box>
  );
}

// ── モンスター図鑑：問題1問＝魔物1体。発見（解いた）→ 討伐（正解した）→ 制覇（しっかり覚えた） ──
const DEX_PAGE = 48;
const killTier = (n) => [...KILL_TIERS].reverse().find((t) => (n || 0) >= t.n) || null;
// 魔物の種族：出会った問題の魔物の種類を集める。強い魔物はボスを倒すごとに1体ずつ載る
function MonsterKinds({ state }) {
  const [open, setOpen] = useState(false);
  const cnt = {};
  state.questionBanks.forEach((b) => (b.questions || []).forEach((q) => {
    const s = dexStatus(q);
    if (!s) return;
    const k = MON_PAINTED[hashStr(String(q.id)) % MON_PAINTED.length].img;
    const c = cnt[k] || (cnt[k] = { seen: 0, beat: 0 });
    c.seen++; if (s >= 2) c.beat++;
  }));
  const wins = normRpg(state.rpg).bossWins || 0;
  const found = MON_PAINTED.filter((x) => cnt[x.img]).length + MON_BOSS.filter((_, k) => wins > k).length;
  const total = MON_PAINTED.length + MON_BOSS.length;
  const kills = normRpg(state.rpg).kills || {};
  const cell = (x, ok, sub, strong) => { const kt = killTier(kills[x.img]); return (
    <div key={x.img} className="jp text-center" style={{ position: "relative", padding: "4px 2px", borderRadius: 8, background: kt ? `linear-gradient(180deg, ${kt.color}22, var(--paper))` : strong && ok ? "rgba(162,74,69,0.07)" : "var(--paper)", border: `${kt ? 2 : 1}px solid ${kt ? kt.color : strong && ok ? "#a24a45" : "var(--rule-soft)"}` }}>
      {kt && <span title={`${kt.name}メダル`} style={{ position: "absolute", right: 3, top: 3, width: 14, height: 14, borderRadius: "50%", background: `radial-gradient(circle at 35% 30%, #fff, ${kt.color})`, border: `1px solid ${kt.color}`, fontSize: 8, lineHeight: "12px", color: "#3a2a10", fontWeight: 800 }}>{kt.name}</span>}
      <div className="flex justify-center"><MonPic m={{ sp: x }} size={56} dim={ok ? 0 : 2} /></div>
      <div className="text-[9px] truncate" style={{ fontWeight: 700, color: ok ? "var(--ink)" : "var(--ink-mute)" }}>{ok ? x.name : "？？？"}</div>
      <div className="text-[8px]" style={{ color: "var(--ink-mute)" }}>{sub}{kills[x.img] ? `・倒した${kills[x.img]}` : ""}{(normRpg(state.rpg).tamed || {})[x.img] ? "・🐾仲間" : ""}</div>
    </div>
  ); };
  return (
    <div className="mb-3">
      <button onClick={() => setOpen(!open)} className="jp w-full flex items-center text-xs px-2 py-1.5" style={{ background: "var(--cream)", border: "1px solid var(--rule-soft)", borderRadius: 8, color: "var(--ink)", cursor: "pointer" }}>
        <span className="flex-1 text-left" style={{ fontWeight: 800 }}>魔物の種族　{found} / {total}種</span><span style={{ color: "var(--ink-mute)" }}>{open ? "▲ 閉じる" : "▼ 見る"}</span>
      </button>
      {open && (
        <div className="mt-2">
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
            {MON_PAINTED.map((x) => cell(x, !!cnt[x.img], cnt[x.img] ? `討伐 ${cnt[x.img].beat}` : "未発見", false))}
          </div>
          <div className="jp text-[11px] mt-2 mb-1" style={{ color: "#a24a45", fontWeight: 800 }}>強い魔物（論点の主・ボス）</div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
            {MON_BOSS.map((x, k) => cell(x, wins > k, wins > k ? "遭遇済み" : `ボス${k + 1}体目で`, true))}
          </div>
          <p className="jp text-[10px] mt-1" style={{ color: "var(--ink-mute)" }}>同じ種族を10・50・100体倒すと、銅・銀・金のメダルと報酬（50・150・300G）。問題1つ1つに魔物が宿っています。解いて出会うと、その種族が載ります。強い魔物は、ストーリーの最後の1問や試練の間にも現れます。</p>
        </div>
      )}
    </div>
  );
}
function MonsterDex({ state }) {
  const banks = state.questionBanks.filter((b) => (b.questions || []).length > 0);
  const [bankId, setBankId] = useState(() => (banks[0] ? banks[0].id : null));
  const [page, setPage] = useState(0);
  const [pick, setPick] = useState(null);
  const [showQ, setShowQ] = useState(false);
  const all = { n: 0, s1: 0, s2: 0, s3: 0 };
  banks.forEach((b) => b.questions.forEach((q) => { const s = dexStatus(q); all.n++; if (s >= 1) all.s1++; if (s >= 2) all.s2++; if (s >= 3) all.s3++; }));
  const bank = banks.find((b) => b.id === bankId) || banks[0];
  if (!bank) return <Box title="モンスター図鑑" icon={<BookOpen size={18} />}><p className="jp text-sm" style={{ color: "var(--ink-mute)" }}>問題集を取り込むと、魔物が図鑑に登録されます。</p></Box>;
  const qs = bank.questions;
  const st = qs.map(dexStatus);
  const cnt = [1, 2, 3].map((k) => st.filter((s) => s >= k).length);
  const medals = [["銅", "全部発見", cnt[0] === qs.length, "#b07a4a"], ["銀", "全部討伐", cnt[1] === qs.length, "#8a96b0"], ["金", "全部制覇", cnt[2] === qs.length, "#d6b56a"]];
  const pages = Math.ceil(qs.length / DEX_PAGE);
  const cur = Math.min(page, pages - 1);
  const pq = pick ? qs.find((q) => q.id === pick) : null;
  const bar = (v, color) => <div style={{ height: 6, borderRadius: 3, background: "var(--beige)", overflow: "hidden" }}><div style={{ width: `${qs.length ? (v / qs.length) * 100 : 0}%`, height: "100%", background: color }} /></div>;
  return (
    <Box title="モンスター図鑑" icon={<BookOpen size={18} />}>
      <div className="relative overflow-hidden mb-2" style={{ height: 92, borderRadius: 8, border: "1px solid #b08a3e", background: `url(${ART_URL}dex-banner.jpg) center 40%/cover no-repeat` }}>
        <div className="absolute inset-x-0 bottom-0 px-3 py-1 jp text-xs" style={{ background: "linear-gradient(0deg, rgba(253,251,245,0.95), rgba(253,251,245,0))", color: "#22335c", fontWeight: 800 }}>それぞれの魔物が、君の成長を待っている</div>
      </div>
      <MonsterKinds state={state} />
      <div className="jp text-[11px] mb-2" style={{ color: "var(--ink-soft)" }}>全体：発見 {all.s1}/{all.n} ・ 討伐 {all.s2} ・ 制覇 {all.s3}</div>
      <select className="rpg-input mb-3 text-sm" value={bank.id} onChange={(e) => { setBankId(e.target.value); setPage(0); setPick(null); }}>
        {banks.map((b) => <option key={b.id} value={b.id}>{b.name}{b.year ? `（${b.year}）` : ""}</option>)}
      </select>
      <div className="grid grid-cols-3 gap-2 mb-2 jp">
        {[["発見", cnt[0], "#7fa3d8"], ["討伐", cnt[1], "#4f8a72"], ["制覇", cnt[2], "#d6b56a"]].map(([k, v, c]) => (
          <div key={k}><div className="flex justify-between text-[11px]" style={{ color: "var(--ink-soft)" }}><span>{k}</span><span style={{ fontWeight: 800, color: "var(--ink)" }}>{v}/{qs.length}</span></div>{bar(v, c)}</div>
        ))}
      </div>
      <div className="flex gap-2 mb-3">
        {medals.map(([m, label, got, c]) => (
          <div key={m} className="jp flex items-center gap-1.5 text-[11px] px-2 py-1 flex-1 justify-center" style={{ border: `1px solid ${got ? c : "var(--rule-soft)"}`, background: got ? "var(--cream)" : "var(--paper)", opacity: got ? 1 : 0.5 }}>
            <span style={{ width: 18, height: 18, borderRadius: "50%", background: got ? `radial-gradient(circle at 35% 30%, #fff, ${c})` : "var(--rule-soft)", border: `1px solid ${c}`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#22335c" }}>{m}</span>{label}
          </div>
        ))}
      </div>
      {pq && (() => {
        const m = monsterFor(pq, bank.name);
        const s = dexStatus(pq);
        const view = s === 0 ? { ...m, rank: "unknown" } : m;
        return (
          <div className="p-3 mb-3 jp" style={{ background: "var(--sky-pale)", border: "1px solid var(--gold)", animation: "sqFadeIn .25s ease-out" }}>
            <div className="flex items-center gap-3">
              <div style={{ flexShrink: 0 }}><MonPic m={view} size={96} dim={view.rank === "unknown" ? 2 : 0} /></div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>No.{qs.indexOf(pq) + 1}</div>
                <div className="text-base" style={{ fontWeight: 800, color: m.rank === "elite" && s > 0 ? "var(--brick)" : "var(--ink)" }}>{s === 0 ? "？？？" : m.name}</div>
                <div className="text-[11px]" style={{ color: "var(--ink-soft)" }}>{["まだ出会っていない魔物", "発見（まだ倒していない）", "討伐済み", "制覇（しっかり覚えた）"][s]}</div>
                {s > 0 && <div className="text-[11px]" style={{ color: "var(--ink-soft)" }}>討伐 {pq.correct || 0}回 ・ 逃走 {pq.wrong || 0}回{pq.sr_nextReview ? ` ・ 次の出現 ${pq.sr_nextReview}` : ""}</div>}
              </div>
              <button onClick={() => setPick(null)} className="jp text-xs px-2 py-1 btn-ghost flex-shrink-0">閉じる</button>
            </div>
            {s > 0 && (showQ ? (
              <div className="mt-2 text-sm" style={{ color: "var(--ink)" }}>
                <div className="p-2" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)" }}>{renderQText(pq.q, pq.q_formats, pq.a)}</div>
                <div className="p-2 mt-1" style={{ background: "var(--paper)", border: "1px solid var(--gold)" }}>{renderFormattedText(pq.a, pq.a_formats)}</div>
              </div>
            ) : <button onClick={() => setShowQ(true)} className="jp btn-ghost w-full mt-2 py-1.5 text-xs">この魔物の問題を見る</button>)}
          </div>
        );
      })()}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
        {qs.slice(cur * DEX_PAGE, (cur + 1) * DEX_PAGE).map((q, i) => {
          const s = st[cur * DEX_PAGE + i];
          const m = monsterFor(q, bank.name);
          return (
            <button key={q.id} onClick={() => { setPick(q.id); setShowQ(false); }} className="relative p-1" title={s ? m.name : "？？？"}
              style={{ background: pick === q.id ? "var(--cream)" : "var(--paper)", border: `1px solid ${s === 3 ? "#d6b56a" : pick === q.id ? "var(--gold)" : "var(--rule-soft)"}`, borderRadius: 6, cursor: "pointer" }}>
              <div className="flex justify-center"><MonPic m={m} size={48} dim={s === 0 ? 2 : s === 1 ? 1 : 0} /></div>
              <div className="jp text-[9px]" style={{ color: "var(--ink-mute)" }}>No.{cur * DEX_PAGE + i + 1}</div>
              {s === 3 && <span style={{ position: "absolute", top: 1, right: 3, fontSize: 10, color: "#d6b56a" }}>★</span>}
              {s > 0 && m.rank === "elite" && <span style={{ position: "absolute", top: 3, left: 3, width: 6, height: 6, borderRadius: "50%", background: "var(--brick)" }} />}
            </button>
          );
        })}
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-3 jp text-sm">
          <button disabled={cur === 0} onClick={() => setPage(cur - 1)} className="btn-ghost px-3 py-1">← 前</button>
          <span style={{ color: "var(--ink-soft)" }}>{cur + 1} / {pages}</span>
          <button disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} className="btn-ghost px-3 py-1">次 →</button>
        </div>
      )}
      <p className="jp text-[10px] mt-2" style={{ color: "var(--ink-mute)" }}>魔物を選ぶと、その問題を確認できます。赤い点は「手強い魔物」（苦手な問題）、★は制覇（21日以上覚えていられる）です。</p>
    </Box>
  );
}
function PowerChart({ state }) {
  const log = powerLogOf(state);
  const [range, setRange] = useState(30);
  const today = todayStr();
  const from = range ? addDays(today, -range + 1) : (log[0] ? log[0].d : today);
  const pts = log.filter((e) => e.d >= from);
  const W = 600, H = 210, L = 34, Rr = 12, T = 12, B = 26;
  const t0 = parseLocalDate(from).getTime(), t1 = parseLocalDate(today).getTime();
  const span = Math.max(1, t1 - t0);
  const X = (d) => L + ((parseLocalDate(d).getTime() - t0) / span) * (W - L - Rr);
  const Y = (p) => T + (1 - p) * (H - T - B);
  const line = pts.map((e) => `${X(e.d).toFixed(1)},${Y(e.p).toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  const first = pts[0];
  const md = (d) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
  return (
    <Box title="合格力の推移" icon={<TrendingUp size={18} />}>
      <div className="flex items-center gap-1.5 mb-2">
        {[[30, "30日"], [90, "90日"], [0, "すべて"]].map(([v, l]) => (
          <button key={l} onClick={() => setRange(v)} className="jp text-[11px] px-3 py-1" style={{ borderRadius: 999, border: `1px solid ${range === v ? "var(--gold)" : "var(--rule-soft)"}`, background: range === v ? "var(--cream)" : "var(--paper)", color: "var(--ink)", fontWeight: 700, cursor: "pointer" }}>{l}</button>
        ))}
        {last && first && pts.length > 1 && <span className="jp text-[11px] ml-auto" style={{ color: last.p >= first.p ? "var(--sage)" : "var(--brick)", fontWeight: 800 }}>{last.p >= first.p ? "+" : ""}{((last.p - first.p) * 100).toFixed(1)}%</span>}
      </div>
      {pts.length === 0 ? <p className="jp text-xs" style={{ color: "var(--ink-mute)" }}>合格力の記録は、問題を解くと始まります。</p> : (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`合格力の推移。最新は${pctTxt(last.p)}`} style={{ display: "block" }}>
          <defs><linearGradient id="sqPowArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d6b56a" stopOpacity=".35" /><stop offset="1" stopColor="#d6b56a" stopOpacity="0" /></linearGradient></defs>
          {[0, 0.25, 0.5, 0.75, 1].map((v) => <g key={v}><line x1={L} x2={W - Rr} y1={Y(v)} y2={Y(v)} stroke="var(--rule-soft)" strokeWidth=".6" /><text x={L - 5} y={Y(v) + 3} textAnchor="end" fontSize="9" fill="var(--ink-mute)">{Math.round(v * 100)}%</text></g>)}
          {[[PASS_LINE, "合格85%", "#b08a3e"], [BASE_LINE, "基準点75%", "#8c79c8"]].map(([v, l, c]) => <g key={l}><line x1={L} x2={W - Rr} y1={Y(v)} y2={Y(v)} stroke={c} strokeWidth="1.2" strokeDasharray="5 4" /><text x={L + 4} y={Y(v) - 4} textAnchor="start" fontSize="9" fill={c} fontWeight="700">{l}</text></g>)}
          {pts.length > 1 && <polygon points={`${X(first.d)},${Y(0)} ${line} ${X(last.d)},${Y(0)}`} fill="url(#sqPowArea)" />}
          {(() => { const rv = normRpg(state.rpg).rival; if (!rv || rv.t0 > today) return null; const a = rv.t0 > from ? rv.t0 : from; return <g><line x1={X(a)} y1={Y(rivalPowerAt(rv, a))} x2={X(today)} y2={Y(rivalPowerAt(rv, today))} stroke="#6c5a96" strokeWidth="1.6" strokeDasharray="3 3" /><text x={X(today) - 4} y={Y(rivalPowerAt(rv, today)) + 12} textAnchor="end" fontSize="9" fill="#6c5a96" fontWeight="700">影</text></g>; })()}
          {pts.length > 1 && <polyline points={line} fill="none" stroke="#b08a3e" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />}
          <circle cx={X(last.d)} cy={Y(last.p)} r="4.5" fill="#fdfbf5" stroke="#b08a3e" strokeWidth="2.2" />
          <text x={Math.min(X(last.d), W - Rr - 30)} y={Y(last.p) - 9} textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--ink)">{pctTxt(last.p)}</text>
          <text x={L} y={H - 8} fontSize="9" fill="var(--ink-mute)">{md(from)}</text>
          <text x={W - Rr} y={H - 8} textAnchor="end" fontSize="9" fill="var(--ink-mute)">{md(today)}</text>
        </svg>
      )}
      {pts.length === 1 && <p className="jp text-[10px] mt-1" style={{ color: "var(--ink-mute)" }}>記録が始まりました。毎日の合格力が、ここに線になって積み上がっていきます。</p>}
    </Box>
  );
}
function ExamChance({ state, pp }) {
  const w = curWorld(state);
  if (w.exam) return <WorldExamChance pp={pp} world={w} />;
  const c = passChance(state, pp);
  if (!c) return null;
  // 未学習の問題を覚えたら、どれだけ上がるか（覚えた問題は記憶率90%とみなす）
  const unseen = pp.total - pp.seen;
  const n = Math.min(unseen, Math.max(10, Math.round(pp.total * 0.05)));
  const up = n > 0 ? passChance(state, pp, (n * 0.9) / pp.total) : null;
  const max = Math.max(...c.dist);
  const col = (v) => (v >= 0.8 ? "var(--gold)" : v >= 0.5 ? "var(--sage)" : "#c9564e");
  return (
    <Box title="いま試験なら（択一20問の予想）" icon={<TrendingUp size={18} />}>
      <div className="jp">
        <div className="grid grid-cols-2 gap-2 mb-2">
          {[[`基準点（${c.baseQ}問）を超える確率`, c.pBase], [`合格ライン（${c.passQ}問）に届く確率`, c.pPass]].map(([k, v]) => (
            <div key={k} className="text-center py-2" style={{ background: "var(--paper)", border: `1.5px solid ${col(v)}`, borderRadius: 10 }}>
              <div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>{k}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: col(v), fontFamily: "'Cinzel', 'Shippori Mincho B1', serif" }}>{Math.round(v * 100)}<span className="text-sm">%</span></div>
            </div>
          ))}
        </div>
        <div className="text-[11px] text-center mb-1" style={{ color: "var(--ink-soft)" }}>予想される正解数：だいたい <b style={{ color: "var(--ink)" }}>{c.exp.toFixed(1)}問</b>（{(c.exp * 2.5).toFixed(1)}点）</div>
        <div className="flex items-end gap-0.5" style={{ height: 70 }} aria-label="正解数ごとの確率">
          {c.dist.map((v, k) => (
            <div key={k} className="flex-1 flex flex-col justify-end items-center" style={{ height: "100%" }}>
              <div style={{ width: "100%", height: `${(v / max) * 100}%`, minHeight: v > 0.001 ? 2 : 0, borderRadius: "2px 2px 0 0", background: k >= c.passQ ? "#d6b56a" : k >= c.baseQ ? "#9fc28b" : "#c8cfdc" }} />
            </div>
          ))}
        </div>
        <div className="flex gap-0.5 mt-0.5">{c.dist.map((_, k) => <div key={k} className="flex-1 text-center" style={{ fontSize: 7, color: k === c.baseQ || k === c.passQ ? "var(--ink)" : "var(--ink-mute)", fontWeight: k === c.baseQ || k === c.passQ ? 800 : 400 }}>{k % 5 === 0 || k === c.baseQ || k === c.passQ ? k : ""}</div>)}</div>
        <div className="flex justify-center gap-3 text-[9px] mt-1" style={{ color: "var(--ink-mute)" }}><span><span style={{ display: "inline-block", width: 8, height: 8, background: "#9fc28b" }} /> 基準点以上</span><span><span style={{ display: "inline-block", width: 8, height: 8, background: "#d6b56a" }} /> 合格ライン以上</span></div>
        {up && <p className="text-[11px] mt-2 px-2 py-1.5" style={{ background: "var(--cream)", border: "1px solid var(--rule-soft)", borderRadius: 8, color: "var(--ink)" }}>未学習の問題をあと<b>{n}問</b>覚えると、基準点を超える確率は <b>{Math.round(c.pBase * 100)}% → {Math.round(up.pBase * 100)}%</b> になる見込みです。</p>}
        <p className="text-[10px] mt-2" style={{ color: "var(--ink-mute)" }}>※ 1問ごとの「いま思い出せる確率」から計算した目安です。科目の重みは本番の出題数（不動産登記法16・民法3・調査士法1）、わからないときは5択の勘（20%）として計算しています。記述式は含みません。</p>
      </div>
    </Box>
  );
}

function FinalBoss({ state, qual, pp }) {
  const days = qual && qual.examDate ? daysUntil(qual.examDate) : null;
  const need = Math.max(0, Math.ceil(PASS_LINE * pp.total - pp.sumR));
  const hp = Math.max(0, (PASS_LINE - pp.power) / PASS_LINE);
  const beaten = pp.power >= PASS_LINE;
  const gauge = Math.min(100, pp.power * 100);
  return (
    <Box title="最終決戦" icon={<Skull size={18} />}>
      <div className="relative overflow-hidden p-3" style={{ borderRadius: 8, background: "linear-gradient(180deg, #2a2440 0%, #3d2f55 55%, #5a3a48 100%)", color: "#fdfbf5" }}>
        <style>{BATTLE_CSS}</style>
        <div className="flex items-center gap-3">
          <div style={{ position: "relative", flexShrink: 0, animation: beaten ? undefined : "sqbIdle 2.6s ease-in-out infinite", filter: beaten ? "grayscale(1) opacity(0.5)" : "drop-shadow(0 0 12px rgba(201,74,74,0.7))" }}>
            <GameIcon ch="👹" id="maou" size={84} boss />
          </div>
          <div className="flex-1 min-w-0 jp">
            <div className="text-[11px]" style={{ color: "#c9b5f0" }}>{qual ? `${qual.name}の試験` : "本番の試験"}{days !== null ? (days >= 0 ? `　決戦まで あと${days}日` : "　試験日を過ぎました") : "　（資格画面で試験日を設定できます）"}</div>
            <div style={{ fontFamily: "'Shippori Mincho B1', serif", fontWeight: 800, fontSize: 20, letterSpacing: "0.08em" }}>{worldOfQual(qual).boss}{beaten ? "　― 撃破可能 ―" : ""}</div>
            <div className="text-[10px] mt-1" style={{ color: "#e0948a" }}>魔王のHP</div>
            <div style={{ height: 9, borderRadius: 5, background: "rgba(255,255,255,0.15)", overflow: "hidden" }}><div style={{ width: `${hp * 100}%`, height: "100%", background: "linear-gradient(90deg, #a24a45, #e0948a)", transition: "width .6s" }} /></div>
          </div>
        </div>
        <div className="jp mt-3">
          <div className="flex justify-between items-baseline text-[11px]" style={{ color: "#c9d4e2" }}><span>あなたの合格力</span><span><span style={{ fontSize: 22, fontWeight: 800, color: beaten ? "#f2c14e" : "#fdfbf5" }}>{pctTxt(pp.power)}</span></span></div>
          <div style={{ position: "relative", height: 12, borderRadius: 6, background: "rgba(255,255,255,0.15)", overflow: "visible", marginTop: 2 }}>
            <div style={{ width: `${gauge}%`, height: "100%", borderRadius: 6, background: "linear-gradient(90deg, #6fb8b4, #d6b56a)", transition: "width .6s" }} />
            {[[BASE_LINE, "基準点"], [PASS_LINE, "合格"]].map(([v, l]) => (
              <div key={l} style={{ position: "absolute", left: `${v * 100}%`, top: -3, bottom: -3, width: 2, background: v === PASS_LINE ? "#f2c14e" : "#c9b5f0" }}>
                <span className="text-[9px]" style={{ position: "absolute", top: 16, ...(v === PASS_LINE ? { left: 3 } : { right: 3 }), whiteSpace: "nowrap", color: v === PASS_LINE ? "#f2c14e" : "#c9b5f0" }}>{l}{Math.round(v * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1.5 mt-6 jp text-center">
          {[[`${examSizeOf(state).label}${examSizeOf(state).n}問なら`, `約${Math.round(pp.power * examSizeOf(state).n)}問`], ["出会った問題", `${pp.seen}/${pp.total}`], ["手強い魔物", `${pp.weak}体`]].map(([k, v]) => (
            <div key={k} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 6, padding: "5px 2px" }}><div className="text-[10px]" style={{ color: "#c9d4e2" }}>{k}</div><div className="text-sm" style={{ fontWeight: 800 }}>{v}</div></div>
          ))}
        </div>
        <p className="jp text-xs mt-3" style={{ color: "#fdfbf5" }}>
          {beaten ? "魔王を倒せる力が宿っています。この力を試験の日まで保ちましょう（毎日の復習が鍵です）。"
            : `合格ラインまで あと約${need}問ぶん。${days && days > 0 ? `1日あたり約${Math.ceil(need / days)}問を「しっかり覚える」ペースです。` : ""}`}
        </p>
      </div>
      <p className="jp text-[10px] mt-2" style={{ color: "var(--ink-mute)" }}>合格力は、{qual ? `「${qual.name}」の` : ""}問題すべてについて、いま思い出せる確率（Ankiと同じFSRSの計算）を平均したものです。まだ解いていない問題は0として数えます。復習を続けて新しい問題を覚えるほど上がり、復習をさぼると下がります。</p>
    </Box>
  );
}
const REGION_POS = [[70, 178], [170, 196], [270, 176], [300, 112], [196, 120], [86, 104], [52, 46]];
function WorldMap({ pp, r, onGuardian }) {
  const regs = [...pp.regions].filter((g) => g.total > 0).sort(byRegionOrder);
  const [sel, setSel] = useState(null);
  const s = regs.find((g) => g.name === sel);
  const pts = regs.map((g, i) => ({ g, x: REGION_POS[i % REGION_POS.length][0], y: REGION_POS[i % REGION_POS.length][1] }));
  const castle = [196, 40];
  const cleared = regs.filter((g) => regionCleared(r, g.name)).length;
  const sealed = cleared < regs.length;
  return (
    <Box title="世界地図" icon={<Castle size={18} />}>
      {regs.length === 0 ? <p className="jp text-sm" style={{ color: "var(--ink-mute)" }}>問題集を取り込むと、科目ごとの地域が地図に現れます。</p> : (<>
        <div className="jp text-[11px] mb-1 text-center" style={{ color: "var(--ink-soft)" }}>解放した地域 {cleared} / {regs.length}{sealed ? "　― すべて解放すると、魔王城の封印が解けます" : "　― 魔王城の封印が解けました！"}</div>
        <svg viewBox="0 0 360 254" width="100%" style={{ display: "block", maxWidth: 560, margin: "0 auto", borderRadius: 8, background: "radial-gradient(ellipse at 50% 40%, #f8f1de 0%, #ecdfbd 70%, #dcc89c 100%)", border: "1px solid #b08a3e" }}>
          <path d="M10 150c30-20 50 10 80-6s40-40 80-30 60 30 90 10 50-20 90-6" fill="none" stroke="rgba(127,163,216,0.5)" strokeWidth="6" strokeLinecap="round" />
          <path d={`M${pts.map((p) => `${p.x} ${p.y}`).join(" L")} L${castle[0]} ${castle[1]}`} fill="none" stroke="#b08a3e" strokeWidth="2" strokeDasharray="5 5" opacity=".7" />
          <g transform={`translate(${castle[0]} ${castle[1]})`}>
            {sealed && <circle r="26" fill="none" stroke="#8c79c8" strokeWidth="1.5" strokeDasharray="3 3" opacity=".8"><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="20s" repeatCount="indefinite" /></circle>}
            <path d="M-22 14v-20h6v6h6v-12h6v-8l4-6 4 6v8h6v12h6v-6h6v20z" fill={pp.power >= PASS_LINE ? "#a7afc2" : "#3d2f55"} stroke="#22335c" strokeWidth="1.2" />
            <text y="28" textAnchor="middle" fontSize="9" fontWeight="700" fill="#22335c" fontFamily="'Zen Kaku Gothic New', sans-serif">魔王城（試験）{sealed ? "・封印中" : ""}</text>
          </g>
          {pts.map(({ g, x, y }) => {
            const st = regionStatus(g, r);
            const prog = Math.min(1, g.power / PASS_LINE);
            const C = 2 * Math.PI * 20;
            return (
              <g key={g.name} transform={`translate(${x} ${y})`} onClick={() => setSel(sel === g.name ? null : g.name)} style={{ cursor: "pointer" }}>
                {st === "ready" && <circle r="28" fill="none" stroke="#a24a45" strokeWidth="1.5" opacity=".8"><animate attributeName="r" values="26;31;26" dur="1.6s" repeatCount="indefinite" /><animate attributeName="opacity" values=".9;.2;.9" dur="1.6s" repeatCount="indefinite" /></circle>}
                <circle r="24" fill={sel === g.name ? "#fff8e6" : "#fdfbf5"} stroke={st === "cleared" ? "#d6b56a" : "#b08a3e"} strokeWidth={st === "cleared" ? 2.5 : 1} />
                <circle r="20" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="4" />
                <circle r="20" fill="none" stroke={g.th.body} strokeWidth="4" strokeDasharray={`${C * prog} ${C}`} transform="rotate(-90)" strokeLinecap="round" />
                <path d="M-6 -8l9-2 5 8-5 11-10-2-3-8z" fill={g.th.body} stroke={g.th.dark} strokeWidth="1" opacity={g.seen ? 1 : 0.35} />
                {st === "cleared" && <g transform="translate(14 -30)"><path d="M0 0v20" stroke="#5f3f1f" strokeWidth="1.5" /><path d="M0 0h14l-4 5 4 5H0z" fill={g.th.body} stroke={g.th.dark} strokeWidth=".8" /></g>}
                {st === "fog" && <g opacity=".92"><ellipse cx="-8" cy="2" rx="18" ry="11" fill="#e9e4d6" /><ellipse cx="10" cy="-2" rx="16" ry="12" fill="#f2ede0" /><ellipse cx="2" cy="10" rx="20" ry="9" fill="#e4ddcc" /></g>}
                <text y="38" textAnchor="middle" fontSize="9" fontWeight="700" fill="#22335c" fontFamily="'Zen Kaku Gothic New', sans-serif">{g.name}</text>
                <text y="48" textAnchor="middle" fontSize="8.5" fill={st === "ready" ? "#a24a45" : "#5b6b8c"} fontFamily="'Zen Kaku Gothic New', sans-serif">{st === "fog" ? "霧の中" : st === "cleared" ? `解放済み ${pctTxt(g.power)}` : st === "ready" ? "守護者に挑める！" : pctTxt(g.power)}</text>
              </g>
            );
          })}
        </svg>
        {s ? <RegionDetail g={s} r={r} onGuardian={onGuardian} />
          : <p className="jp text-[10px] mt-2" style={{ color: "var(--ink-mute)" }}>地域を選ぶと、その科目の合格力と守護者が見られます。輪が一周すると合格ライン（85%）。合格力{Math.round(GUARDIAN_LINE * 100)}%で守護者に挑め、倒すと地域が解放されて紋章が手に入ります。地域はフォルダと問題集の名前（登記・民法・区分所有・調査士法・測量・書式）から決まります。</p>}
      </>)}
    </Box>
  );
}

function StoryPanel({ pp, onTalk, chapters = STORY_CHAPTERS }) {
  const cur = chapterIndex(chapters, pp.power);
  const [open, setOpen] = useState(cur);
  return (
    <Box title="物語" icon={<BookOpen size={18} />}>
      <div className="space-y-1">
        {chapters.map((c, i) => {
          const unlocked = i <= cur;
          return (
            <div key={c.title} style={{ border: `1px solid ${i === cur ? "var(--gold)" : "var(--rule-soft)"}`, background: unlocked ? "var(--paper)" : "transparent" }}>
              <button disabled={!unlocked} onClick={() => setOpen(open === i ? -1 : i)} className="w-full text-left jp px-2 py-1.5 flex items-center gap-2" style={{ background: "transparent", border: "none", cursor: unlocked ? "pointer" : "default" }}>
                <span className="flex-1 text-sm" style={{ fontFamily: "'Shippori Mincho B1', serif", fontWeight: 800, color: unlocked ? "var(--ink)" : "var(--ink-mute)" }}>{unlocked ? c.title : "？？？"}</span>
                <span className="text-[10px]" style={{ color: "var(--ink-mute)" }}>{unlocked ? (open === i ? "▲" : "▼") : `合格力${Math.round(c.at * 100)}%で解放`}</span>
              </button>
              {unlocked && open === i && <div className="jp text-sm px-3 pb-2 leading-relaxed" style={{ color: "var(--ink-soft)", whiteSpace: "pre-wrap", fontFamily: "'Shippori Mincho B1', serif", animation: "sqFadeIn .25s ease-out" }}>{c.text}{onTalk && <div className="mt-2"><button onClick={() => onTalk(i)} className="jp btn-ghost text-xs px-3 py-1">この章の会話を見る</button></div>}</div>}
            </div>
          );
        })}
      </div>
    </Box>
  );
} // その週の月曜日
const WEEKLY_BOSS = {
  "不動産登記法の王都": { name: "王都を蝕む影竜", icon: "🐉", boss: "dragon", art: "darkdragon" },
  "民法の古の森": { name: "古の森の大樹霊", icon: "👻", boss: "ghost", art: "elderweed" },
  "区分所有の双子塔": { name: "双子塔の番人", icon: "🗿", boss: "golem", art: "magolem" },
  "調査士法の砦": { name: "砦の黒騎士", icon: "🦹", boss: "shadow", art: "armor" },
  "測量の星見台": { name: "星見台の天球獣", icon: "🐉", boss: "dragon", art: "lunawolf" },
  "書式の迷宮": { name: "迷宮の書魔", icon: "👹", boss: "maou", art: "grimoire" },
  "未踏の地": { name: "霧の主", icon: "🟢", boss: "slime", art: "wisp" },
};
function weeklyBossFor(pp) {
  const regs = pp.regions.filter((g) => g.total > 0);
  if (regs.length === 0) return null;
  const g = [...regs].sort((a, b) => a.power - b.power)[0];
  const def = WEEKLY_BOSS[g.name] || WEEKLY_BOSS["未踏の地"];
  return { id: def.boss, art: def.art, weekly: true, idx: 3, loop: 0, icon: def.icon, name: def.name, label: `${def.name}（週替わり）`, region: g, hp: Math.min(260, 150 + g.weak * 2), atk: 22 };
}
function WeeklyBossCard({ state, pp, onStart }) {
  const r = normRpg(state.rpg);
  const wb = weeklyBossFor(pp);
  const done = r.weekly && r.weekly.week === weekKey() && r.weekly.won;
  if (!wb) return null;
  return (
    <Box title="週替わりボス" icon={<Skull size={18} />}>
      <div className="flex items-center gap-3">
        <div style={{ flexShrink: 0, filter: done ? "grayscale(1) opacity(0.5)" : undefined }}><GameIcon ch={wb.icon} id={wb.id} art={wb.art} size={64} boss /></div>
        <div className="flex-1 min-w-0 jp">
          <div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>今週の出現地：{wb.region.name}（合格力 {pctTxt(wb.region.power)}・いちばん低い地域）</div>
          <div className="text-base" style={{ fontWeight: 800, color: "var(--brick)" }}>{wb.name}</div>
          <div className="text-[10px]" style={{ color: "var(--ink-soft)" }}>HP {wb.hp} ・ ATK {wb.atk} ・ 苦手な問題を優先して12問</div>
          <div className="text-[10px]" style={{ color: "var(--gold)", fontWeight: 700 }}>報酬：{WEEKLY_REWARD.gold}G・EXP{WEEKLY_REWARD.xp}・星霊石×{WEEKLY_REWARD.star}・賢者の結晶×{WEEKLY_REWARD.sage}・装備</div>
        </div>
      </div>
      {done ? <p className="jp text-sm text-center mt-2" style={{ color: "var(--sage)", fontWeight: 700 }}>今週は撃破済み！ 来週また新しいボスが現れます。</p>
        : <button onClick={() => onStart(wb, buildPoolFromBanks(wb.region.banks, 12))} className="jp btn-danger w-full py-2.5 mt-3">⚔ 挑む（12問）</button>}
    </Box>
  );
}

const DUNGEON_SIZES = [20, 40, 60]; // 1問1分
function DungeonCard({ state, pp, onStart }) {
  const r = normRpg(state.rpg);
  const dg = r.dungeon || {};
  const banks = pp.regions.flatMap((g) => g.banks);
  const avail = banks.reduce((n, b) => n + (b.questions || []).filter((q) => !q.excluded).length, 0);
  return (
    <Box title="模試の塔（ダンジョン）" icon={<Castle size={18} />}>
      <p className="jp text-xs mb-2" style={{ color: "var(--ink-soft)" }}>本番のように、時間を計って一気に解きます（1問1分）。最後に「合格圏（85%）・基準点（75%）」で判定します。回答はいつもどおり復習の記録に反映されます。</p>
      <div className="grid grid-cols-3 gap-2">
        {DUNGEON_SIZES.map((n) => {
          const best = dungeonBestOf(r, curWorld(state).id)[n];
          return (
            <button key={n} disabled={avail < n} onClick={() => onStart(n, shuffleArr(banks.flatMap((b) => (b.questions || []).filter((q) => !q.excluded).map((q) => ({ bankId: b.id, bankName: b.name, qId: q.id })))).slice(0, n))} className="jp btn-ghost py-2 px-1 text-center" style={{ opacity: avail < n ? 0.45 : 1, cursor: avail < n ? "not-allowed" : "pointer" }}>
              <div className="text-sm" style={{ fontWeight: 800 }}>{n}階層</div>
              <div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>{n}問・{n}分</div>
              <div className="text-[10px]" style={{ color: best >= PASS_LINE ? "var(--gold)" : "var(--ink-soft)" }}>{best != null ? `最高 ${Math.round(best * 100)}%${best >= PASS_LINE ? " 踏破" : ""}` : "未挑戦"}</div>
            </button>
          );
        })}
      </div>
    </Box>
  );
}
function DungeonRun({ state, pool, minutes, actions, recordAnswer, startTimer, stopTimer, onExit }) {
  const [battleKey] = useState(() => uid());
  const [idx, setIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [res, setRes] = useState([]); // {bankId, qId, correct}
  const [done, setDone] = useState(null); // { acc, correct, total, timeUp, retreat, reward }
  const [startMs] = useState(() => Date.now());
  const [now, setNow] = useState(Date.now());
  const timerStartedByMe = useRef(false);
  const finished = useRef(false);
  const limitMs = minutes * 60000;
  useEffect(() => {
    if (!state.timer.startMs) { startTimer(null, "qa"); timerStartedByMe.current = true; }
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(t); if (timerStartedByMe.current) { stopTimer(); timerStartedByMe.current = false; } };
  }, []);
  const finish = (list, why) => {
    if (finished.current) return;
    finished.current = true;
    if (timerStartedByMe.current) { stopTimer(); timerStartedByMe.current = false; }
    const correct = list.filter((x) => x.correct).length;
    const acc = correct / pool.length; // 解けなかった問題は不正解として数える
    const reward = actions.dungeonFinish({ n: pool.length, acc });
    setDone({ acc, correct, total: pool.length, answered: list.length, why, reward, used: Math.min(limitMs, Date.now() - startMs) });
  };
  const left = Math.max(0, limitMs - (now - startMs));
  useEffect(() => { if (left <= 0 && !done) finish(res, "時間切れ"); }, [left]);
  const item = pool[idx];
  const bank = item ? state.questionBanks.find((b) => b.id === item.bankId) : null;
  const q = bank ? (bank.questions || []).find((x) => x.id === item.qId) : null;
  const answer = (correct, meta) => {
    if (!q || done) return;
    recordAnswer(item.bankId, q.id, correct, meta);
    const list = [...res, { bankId: item.bankId, qId: q.id, correct }];
    setRes(list);
    setShowAnswer(false);
    if (idx + 1 >= pool.length) finish(list, "最下層に到達");
    else setIdx(idx + 1);
  };
  const mmss = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;

  if (done) {
    const verdict = done.acc >= PASS_LINE ? ["合格圏！ 塔を踏破しました", "var(--gold)"] : done.acc >= BASE_LINE ? ["基準点クリア。合格ラインまであと少し", "var(--sage)"] : ["基準点に届かず。手強い魔物を鍛え直そう", "var(--brick)"];
    const byRegion = {};
    res.forEach((x) => {
      const b = state.questionBanks.find((bb) => bb.id === x.bankId);
      const th = themeOf(b && b.name);
      const g = byRegion[th.region] || (byRegion[th.region] = { n: 0, c: 0, th });
      g.n++; if (x.correct) g.c++;
    });
    const wrongs = res.filter((x) => !x.correct).map((x) => { const b = state.questionBanks.find((bb) => bb.id === x.bankId); return b && (b.questions || []).find((qq) => qq.id === x.qId); }).filter(Boolean);
    return (
      <Box title="模試の塔：結果" icon={<Award size={18} />}>
        <BattleResult state={state} battleKey={battleKey} />
        <div className="jp text-center py-2">
          <div className="text-[11px]" style={{ color: "var(--ink-mute)" }}>{done.why} ・ {done.answered}/{done.total}問を解答 ・ {mmss(done.used)}</div>
          <div style={{ fontSize: 40, fontWeight: 800, color: verdict[1], fontFamily: "'Cinzel', 'Shippori Mincho B1', serif" }}>{Math.round(done.acc * 100)}%</div>
          <div className="text-sm" style={{ fontWeight: 800, color: verdict[1] }}>{verdict[0]}</div>
          <div className="text-[11px] mt-1" style={{ color: "var(--ink-soft)" }}>{done.correct}問正解 ・ {examSizeOf(state).label}{examSizeOf(state).n}問なら 約{Math.round(done.acc * examSizeOf(state).n)}問</div>
          {done.reward && <div className="text-xs mt-1" style={{ color: "var(--gold)", fontWeight: 700 }}>{done.reward}</div>}
        </div>
        {Object.keys(byRegion).length > 0 && (
          <div className="space-y-1 mb-3">
            {Object.entries(byRegion).map(([name, g]) => (
              <div key={name} className="jp flex items-center gap-2 text-xs">
                <span className="w-32 truncate" style={{ color: g.th.dark, fontWeight: 700 }}>{name}</span>
                <div className="flex-1" style={{ height: 8, borderRadius: 4, background: "var(--beige)", overflow: "hidden" }}><div style={{ width: `${(g.c / g.n) * 100}%`, height: "100%", background: g.th.body }} /></div>
                <span style={{ color: "var(--ink-soft)", minWidth: 52, textAlign: "right" }}>{g.c}/{g.n}</span>
              </div>
            ))}
          </div>
        )}
        {wrongs.length > 0 && (
          <details className="jp text-xs mb-3">
            <summary style={{ cursor: "pointer", color: "var(--ink-soft)" }}>まちがえた問題（{wrongs.length}問）を見る</summary>
            <div className="space-y-1 mt-1">
              {wrongs.map((w) => <div key={w.id} className="p-2" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)" }}><div>{renderQText(w.q, w.q_formats, w.a)}</div><div className="mt-1" style={{ color: "var(--sky-deep)" }}>→ {renderFormattedText(w.a, w.a_formats)}</div></div>)}
            </div>
          </details>
        )}
        <button onClick={onExit} className="jp btn-primary w-full py-2">塔を出る</button>
      </Box>
    );
  }
  if (!q) return null;
  const floor = res.filter((x) => x.correct).length;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between jp text-xs">
        <button onClick={() => { if (confirm("撤退しますか？（解いていない問題は不正解として数えます）")) finish(res, "撤退"); }} className="flex items-center gap-1" style={{ color: "var(--ink-soft)" }}><XIcon size={14} /> 撤退</button>
        <span style={{ color: "var(--ink-soft)" }}>問題 {idx + 1}/{pool.length}</span>
        <span style={{ fontWeight: 800, color: left < 60000 ? "var(--brick)" : "var(--sky-deep)", fontVariantNumeric: "tabular-nums" }}>残り {mmss(left)}</span>
      </div>
      <div className="jp flex items-center gap-2">
        <span className="text-[11px]" style={{ color: "var(--gold)", fontWeight: 800, whiteSpace: "nowrap" }}>地下{floor}階</span>
        <div className="flex-1" style={{ height: 6, borderRadius: 3, background: "var(--beige)", overflow: "hidden" }}><div style={{ width: `${(floor / pool.length) * 100}%`, height: "100%", background: "linear-gradient(90deg, #6c5a96, #d6b56a)" }} /></div>
        <span className="text-[10px]" style={{ color: "var(--ink-mute)" }}>最下層 {pool.length}階</span>
      </div>
      <BattleStage state={state} q={q} bankName={bank.name} battleKey={battleKey} />
      <div className="rpg-box p-1">
        <div className="rpg-inner-border min-h-[180px] flex flex-col">
          <div className="jp text-[10px] mb-2" style={{ color: "var(--ink-mute)" }}>{bank.name}</div>
          <div className="qtext jp text-base md:text-lg flex-1 break-words" style={{ color: "var(--ink)" }}>{renderQText(q.q, q.q_formats, q.a)}</div>
          <QuestionImages bankId={bank.id} question={q} side="q" />
          {showAnswer ? (
            <>
              <div className="jp text-[10px] mt-3 mb-1" style={{ color: "var(--gold)" }}>答え</div>
              <div className="qtext jp text-base md:text-lg break-words p-2" style={{ background: "var(--sky-pale)", border: "1px solid var(--gold)", color: "var(--ink)" }}>{renderFormattedText(q.a, q.a_formats)}</div>
              <QuestionImages bankId={bank.id} question={q} side="a" />
              <AnswerPanel onAnswer={answer} question={q} srSettings={effectiveSr(state)} />
            </>
          ) : (
            <RevealButton q={q} onReveal={() => setShowAnswer(true)} />
          )}
        </div>
      </div>
    </div>
  );
}

// ============ 魔王城への道：地域の解放・会話・魔王城の5階層・旅路・カテゴリの長期クエスト ============

// ── 地域の守護者と紋章：その科目の合格力が60%に届くと挑める。倒すと地域が解放され、紋章の効果が付く ──
const GUARDIAN_LINE = 0.6;
// 地域の状態：fog（霧：まだ2割も出会っていない）| explore（探索中）| ready（守護者に挑める）| cleared（解放済み）
function regionStatus(g, r) {
  if (regionCleared(r, g.name)) return "cleared";
  if (g.total > 0 && g.seen / g.total < 0.2) return "fog";
  return g.power >= GUARDIAN_LINE ? "ready" : "explore";
}
function allyTrialPool(state, a) {
  let pool = studyGroupPool(state, a);
  if (pool.length < ALLY_TRIAL_N) { const sc = studyScope(state); pool = buildPoolFromBanks(state.questionBanks.filter((b) => sc.inScope(b)), ALLY_TRIAL_N); }
  return pool.slice(0, ALLY_TRIAL_N);
}
// ── キャラクター進化譚：ルナ（レベル）と、カイト・セレナ・レイヴン（絆）の6つの姿 ──
function EvolutionGallery({ state }) {
  const r = normRpg(state.rpg);
  const hi = heroStage(state.player.level).idx;
  const joined = new Set(alliesJoined(r).map((a) => a.id));
  const [big, setBig] = useState(null);
  const rows = [
    { key: "luna", name: `${HERO_NAME}（白銀の魔法剣士）`, cur: hi + 1, cond: (k) => `Lv${HERO_STAGE_LV[k]}`, on: true },
    ...["kaito", "serena", "raven"].map((id) => { const a = allyById(id); const on = joined.has(id); return { key: id, name: `${a.name}（${a.role}）`, cur: on ? allyEvoStage(r, a, hi) : 0, cond: (k) => (k < 5 ? `絆Lv${k + 1}` : "絆Lv5＋主人公の最終進化"), on }; }),
  ];
  return (
    <Box title="キャラクター進化譚" icon={<Sparkles size={18} />}>
      <div className="jp space-y-3">
        <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>{HERO_NAME}はレベルで、仲間は絆で姿が進化します。絵を押すと大きく見られます。</p>
        {rows.map((row) => (
          <div key={row.key}>
            <div className="text-xs mb-1" style={{ fontWeight: 800, color: row.on ? "var(--ink)" : "var(--ink-mute)" }}>{row.on ? row.name : "？？？（まだ出会っていない仲間）"}</div>
            <div className="grid grid-cols-6 gap-1">
              {EVO_LABELS.map((lb, k) => { const got = row.cur >= k + 1; return (
                <button key={k} onClick={() => got && setBig({ url: EVO_URL(row.key, k + 1), title: `${row.name}　${lb}` })} className="text-center" style={{ background: "none", border: "none", padding: 0, cursor: got ? "pointer" : "default" }}>
                  <div style={{ aspectRatio: "1 / 1", borderRadius: 6, border: `1.5px solid ${row.cur === k + 1 ? "#d6b56a" : "var(--rule-soft)"}`, boxShadow: row.cur === k + 1 ? "0 0 8px rgba(214,181,106,0.8)" : "none", backgroundImage: `url(${EVO_URL(row.key, k + 1)})`, backgroundSize: "cover", backgroundPosition: "center 18%", filter: got ? undefined : "grayscale(1) brightness(0.3) blur(1px)" }} />
                  <div className="text-[8px] mt-0.5" style={{ color: got ? "var(--ink-soft)" : "var(--ink-mute)", lineHeight: 1.2 }}>{got ? lb : row.cond(k)}</div>
                </button>
              ); })}
            </div>
          </div>
        ))}
      </div>
      {big && createPortal(
        <div onClick={() => setBig(null)} style={{ position: "fixed", inset: 0, zIndex: 9997, background: "rgba(10,14,30,0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16, cursor: "pointer" }}>
          <img src={big.url} alt={big.title} style={{ width: "min(88vw, 420px)", borderRadius: 14, border: "2px solid #d6b56a", boxShadow: "0 0 30px rgba(214,181,106,0.5)" }} />
          <div className="jp mt-3" style={{ color: "#f1dfae", fontWeight: 800 }}>{big.title}</div>
          <div className="jp text-[11px] mt-1" style={{ color: "#8f9cb8" }}>タップで閉じる</div>
        </div>, document.body)}
    </Box>
  );
}

// パーティ編成（冒険 → 世界 → 地図と仲間）：加入した仲間から3人。ふだんの編成と、科目（地域）ごとの編成
function PartyEditor({ state, actions, regions }) {
  const r = normRpg(state.rpg);
  const joined = alliesJoined(r).filter((a) => ALLY_SKILLS[a.id]);
  const [reg, setReg] = useState(""); // "" ＝ふだんの編成
  const pt = r.party || {};
  const cur = reg ? (pt.byRegion || {})[reg] || [] : pt.members || [];
  const party = battleParty(state, reg || undefined);
  const syn = partySynergy(party, r);
  const setIds = (ids) => actions.setParty({ region: reg || null, ids });
  const toggle = (id) => {
    const base = cur.length ? cur : party.map((p) => p.a.id);
    setIds(base.includes(id) ? base.filter((x) => x !== id) : base.length >= 3 ? [...base.slice(1), id] : [...base, id]);
  };
  if (!joined.length) return <PartyNoAllies state={state} />;
  return (
    <Box title="パーティ編成" icon={<Sword size={18} />}>
      <div className="jp space-y-2">
        <p className="text-[11px]" style={{ color: "var(--ink-soft)", lineHeight: 1.7 }}>ルナといっしょに戦う仲間を3人まで選びます（選んだ順に後ろの列へ）。追撃・魔法・回復の役割がそろうと「三役そろい」でボスへのダメージが上がります。科目ごとに別の編成も決められます。</p>
        <div className="flex flex-wrap gap-1">
          <span className="text-[10px] self-center" style={{ color: "var(--ink-mute)" }}>編成</span>
          {[["", "ふだん（全部の戦い）"], ...regions.map((g) => [g, g])].map(([id, nm]) => <button key={id || "base"} onClick={() => setReg(id)} className="text-[11px] px-2 py-0.5" style={chipSt(reg === id)}>{nm}{id && ((pt.byRegion || {})[id] || []).length ? " ✓" : ""}</button>)}
        </div>
        <div className="flex items-center gap-2 px-2 py-2" style={{ background: "var(--paper)", border: "1px solid var(--gold)", borderRadius: 10 }}>
          <span className="text-[10px]" style={{ color: "var(--ink-mute)" }}>いまの<br />パーティ</span>
          <span className="flex flex-col items-center"><PartyFace id="luna" size={52} /><span className="text-[10px]" style={{ fontWeight: 800, color: "var(--gold)" }}>{HERO_NAME}</span></span>
          {party.map((p, i) => <span key={p.a.id} className="flex flex-col items-center"><PartyFace id={p.a.id} p={p} size={52} /><span className="text-[10px]" style={{ fontWeight: 700, color: "var(--ink)" }}>{i + 1}. {p.a.name}</span></span>)}
          {!party.length && <span className="text-[11px]" style={{ color: "var(--ink-mute)" }}>（仲間なし）</span>}
          <span className="flex-1" />
          {reg && cur.length > 0 && <button onClick={() => setIds([])} className="text-[10px] underline" style={{ background: "none", border: "none", color: "var(--ink-mute)", cursor: "pointer" }}>ふだんの編成にもどす</button>}
        </div>
        {syn.list.length > 0 ? syn.list.map((x) => <div key={x.name} className="text-[11px] px-2 py-1" style={{ background: "rgba(214,181,106,0.15)", border: "1px solid #d6b56a", borderRadius: 6, color: "var(--ink)" }}>✨ <b>{x.name}</b>：{x.text}</div>)
          : <div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>そろい効果なし（追撃・魔法・回復を1人ずつ入れると「三役そろい」）</div>}
        <div className="grid grid-cols-2 gap-1.5">
          {joined.map((a) => {
            const on = party.some((p) => p.a.id === a.id);
            const sk = ALLY_SKILLS[a.id];
            const lv = bondLevel(((r.bonds || {})[a.id]) || 0);
            return (
              <button key={a.id} onClick={() => toggle(a.id)} className="text-left px-2 py-1.5 flex items-center gap-1.5" style={{ borderRadius: 8, border: `1.5px solid ${on ? "var(--gold)" : "var(--rule-soft)"}`, background: on ? "var(--cream)" : "var(--paper)", color: "var(--ink)", cursor: "pointer" }}>
                {CHIBI[a.id] && <PartyFace id={a.id} size={34} />}
                <span className="flex-1 min-w-0">
                  <span className="block text-[12px]" style={{ fontWeight: 800 }}>{on ? "☑ " : "☐ "}{a.name}<span className="text-[10px] ml-1" style={{ color: "var(--ink-mute)", fontWeight: 500 }}>絆Lv{lv}</span></span>
                  <span className="block text-[10px]" style={{ color: "var(--ink-soft)" }}>{ROLE_NAME[sk.kind]}：{sk.name}</span>
                </span>
              </button>
            );
          })}
        </div>
        <AllyUpcoming state={state} />
      </div>
    </Box>
  );
}
// 仲間がまだいないとき：だれが・何をすると仲間になるか
const allyJoinText = (a, r) => {
  const p = joinProg(a, r);
  if (p.j.k === "start") return "はじめから";
  const left = Math.max(0, p.need - p.have);
  return p.j.k === "story" ? `ストーリークエストをあと${left}話クリア` : p.j.k === "tower" ? `試練の塔をあと${left}階のぼる（第${p.base + p.need}階）` : `地域の守護者をあと${left}体倒す`;
};
// これから加わる仲間（パーティ編成の下）
function AllyUpcoming({ state }) {
  const r = normRpg(state.rpg);
  const joined = new Set(alliesJoined(r).map((a) => a.id));
  const ready = alliesReady(r);
  const list = ALLIES.filter((a) => ALLY_SKILLS[a.id] && !joined.has(a.id) && !ready.some((x) => x.id === a.id))
    .sort((a, b) => { const pa = joinProg(a, r), pb = joinProg(b, r); return (pa.need - pa.have) / pa.need - (pb.need - pb.have) / pb.need; });
  if (!list.length && !ready.length) return null;
  return (
    <div className="space-y-1">
      {ready.map((a) => (
        <div key={a.id} className="flex items-center gap-2 px-2 py-1.5" style={{ borderRadius: 8, border: "1.5px solid var(--gold)", background: "linear-gradient(90deg, #f6ead0, #fdfbf5)" }}>
          {CHIBI[a.id] ? <PartyFace id={a.id} size={32} /> : <span style={{ fontSize: 18 }}>👤</span>}
          <span className="flex-1 min-w-0">
            <span className="block text-[12px]" style={{ fontWeight: 800, color: "var(--ink)" }}>{a.name}が試練を待っています</span>
            <span className="block text-[10px]" style={{ color: "var(--ink-soft)" }}>{a.role}・{ROLE_NAME[ALLY_SKILLS[a.id].kind]}　得意分野から{ALLY_TRIAL_N}問、{Math.round(ALLY_TRIAL_N * ALLY_TRIAL_PASS)}問正解で仲間に</span>
          </span>
          <button onClick={() => startAllyTrial(a.id)} className="btn-primary text-[11px] px-2.5 py-1">⚔ 試練に挑む</button>
        </div>
      ))}
      {list.length > 0 && <>
      <div className="text-[11px]" style={{ fontWeight: 800, color: "var(--ink)" }}>これから加わる仲間（{list.length}人）</div>
      <div className="grid gap-1 sm:grid-cols-2">
        {list.map((a) => {
          const p = joinProg(a, r);
          return (
            <div key={a.id} className="flex items-center gap-1.5 px-2 py-1" style={{ borderRadius: 8, border: "1px dashed var(--rule-soft)", background: "var(--paper)" }}>
              <span style={{ filter: "grayscale(1) brightness(0.55)", display: "inline-flex" }}>{CHIBI[a.id] ? <PartyFace id={a.id} size={28} /> : <span style={{ fontSize: 16 }}>👤</span>}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-[11px]" style={{ fontWeight: 800, color: "var(--ink)" }}>{a.name}<span className="text-[10px] ml-1" style={{ color: "var(--ink-mute)", fontWeight: 500 }}>{a.role}・{ROLE_NAME[ALLY_SKILLS[a.id].kind]}</span></span>
                <span className="block text-[10px]" style={{ color: "var(--ink-soft)" }}>{allyJoinText(a, r)}</span>
                <span className="block" style={{ height: 3, borderRadius: 2, background: "var(--beige)", overflow: "hidden", marginTop: 2 }}><span style={{ display: "block", width: `${Math.min(100, (p.have / Math.max(1, p.need)) * 100)}%`, height: "100%", background: "#b08a3e" }} /></span>
              </span>
            </div>
          );
        })}
      </div>
      </>}
    </div>
  );
}
function PartyNoAllies({ state }) {
  return (
    <Box title="パーティ編成" icon={<Sword size={18} />}>
      <div className="jp space-y-1.5">
        <p className="text-[11px]" style={{ color: "var(--ink-soft)", lineHeight: 1.7 }}>まだ一緒に戦う仲間がいません。ストーリーや試練の塔を進めると仲間が試練を出してくれます。合格すると、ここで3人まで選んでパーティを組めます（ストーリー・試練の塔・ボス戦で後ろの列から加勢します）。</p>
        <AllyUpcoming state={state} />
      </div>
    </Box>
  );
}
// パーティの小さな欄（拠点・試練の塔）：いまのパーティと「編成を変える」
function PartyQuick({ state, actions, regions = [] }) {
  const [open, setOpen] = useState(false);
  const r = normRpg(state.rpg);
  const joined = alliesJoined(r).filter((a) => ALLY_SKILLS[a.id]);
  const party = battleParty(state);
  if (open || !joined.length) return (
    <div className="space-y-1">
      <PartyEditor state={state} actions={actions} regions={regions} />
      {joined.length > 0 && <button onClick={() => setOpen(false)} className="btn-ghost w-full text-[11px] py-1">▲ 編成をとじる</button>}
    </div>
  );
  const syn = partySynergy(party, r);
  const ready = alliesReady(r);
  return (
    <div className="space-y-1">
    {ready.map((a) => <button key={a.id} onClick={() => startAllyTrial(a.id)} className="jp w-full text-left px-3 py-1.5 text-[12px]" style={{ borderRadius: 10, border: "1.5px solid var(--gold)", background: "linear-gradient(90deg, #f6ead0, #fdfbf5)", color: "var(--ink)", fontWeight: 800, cursor: "pointer" }}>⚔ {a.name}が試練を待っています ― 挑む ▶</button>)}
    <div className="jp flex items-center gap-2 px-3 py-2" style={{ background: "var(--paper)", border: "1px solid var(--gold)", borderRadius: 10 }}>
      <span className="text-[11px]" style={{ fontWeight: 800, color: "var(--ink)" }}>⚔ パーティ</span>
      <PartyFace id="luna" size={36} />
      {party.map((p) => <PartyFace key={p.a.id} id={p.a.id} p={p} size={36} />)}
      {!party.length && <span className="text-[11px]" style={{ color: "var(--ink-mute)" }}>（仲間なし）</span>}
      <span className="flex-1 min-w-0 text-[10px] truncate" style={{ color: "var(--ink-soft)" }}>{syn.list.length ? `✨ ${syn.list.map((x) => x.name).join("・")}` : ""}</span>
      <button onClick={() => setOpen(true)} className="btn-primary text-[11px] px-2.5 py-1">編成を変える</button>
    </div>
    </div>
  );
}
function PartyCard({ state, actions }) {
  const r = normRpg(state.rpg);
  const joined = new Set(alliesJoined(r).map((a) => a.id));
  return (
    <Box title="仲間" icon={<Crown size={18} />}>
      <div className="relative overflow-hidden mb-3" style={{ borderRadius: 8, height: 150, border: "1px solid #b08a3e" }}>
        <img src={`${ART_URL}party.jpg`} alt="仲間たち" className="w-full h-full" style={{ objectFit: "cover", objectPosition: "center 14%", filter: joined.size ? "none" : "grayscale(0.6) brightness(1.05)" }} />
        <div className="absolute inset-x-0 bottom-0 px-3 py-1.5 jp text-xs" style={{ background: "linear-gradient(0deg, rgba(253,251,245,0.95), rgba(253,251,245,0))", color: "#22335c", fontWeight: 700 }}>
          {joined.size ? `いっしょに旅をする仲間 ${joined.size}人` : "地域を解放すると、仲間が加わります"}
        </div>
      </div>
      {[["", null], ["academy", "魔法学院の三人"], ["story", "冒険の仲間"]].map(([grp, label]) => (
      <div key={grp || "base"}>
      {grp === "story" && (
        <div className="jp mt-3 mb-2 px-2 py-1.5" style={{ borderRadius: 8, border: "1px solid #6d8454", background: "linear-gradient(180deg, rgba(109,132,84,0.1), rgba(253,251,245,0))" }}>
          <div className="flex items-end justify-center gap-1" style={{ height: 70 }}>
            {ALLIES.filter((a) => a.group === "story").map((a) => <img key={a.id} src={CHIBI[a.id]} alt={joined.has(a.id) ? a.name : "まだ見ぬ仲間"} draggable={false} style={{ height: 66, width: 66, objectFit: "contain", filter: joined.has(a.id) ? "drop-shadow(0 2px 2px rgba(0,0,0,0.25))" : "brightness(0) opacity(0.35)" }} />)}
          </div>
          <div className="text-xs" style={{ color: "#22335c", fontWeight: 800 }}>{label}<span className="ml-2 text-[10px]" style={{ fontWeight: 500 }}>ストーリークエストを進めると出会えます</span></div>
        </div>
      )}
      {label && grp === "academy" && (
        <div className="relative overflow-hidden mt-3 mb-2" style={{ borderRadius: 8, height: 120, border: "1px solid #4f6fa8" }}>
          <img src={`${ART_URL}trio.jpg`} alt="魔法学院の三人" className="w-full h-full" style={{ objectFit: "cover", objectPosition: "center 30%", filter: ALLIES.some((a) => a.group === grp && joined.has(a.id)) ? "none" : "grayscale(0.7) brightness(1.08)" }} />
          <div className="absolute inset-x-0 bottom-0 px-3 py-1 jp text-xs" style={{ background: "linear-gradient(0deg, rgba(253,251,245,0.95), rgba(253,251,245,0))", color: "#22335c", fontWeight: 800 }}>{label}<span className="ml-2 text-[10px]" style={{ fontWeight: 500 }}>試練の塔を登ると出会えます</span></div>
        </div>
      )}
      <div className="grid gap-2 md:grid-cols-3">
        {ALLIES.filter((a) => (a.group || "") === grp).map((a) => {
          const on = joined.has(a.id);
          return (
            <button key={a.id} disabled={!on} onClick={() => actions.openTalk({ title: `${a.name}（${a.role}）`, lines: [...a.intro.map((t) => [a.id, t]), [a.id, a.cheer]] })} className="jp flex items-center gap-2 p-2 text-left" style={{ background: "var(--paper)", border: `1px solid ${on ? "var(--gold)" : "var(--rule-soft)"}`, borderRadius: 8, cursor: on ? "pointer" : "default" }}>
              <span style={ALLY_EVO[a.id] && on ? { width: 46, height: 46, flexShrink: 0, borderRadius: 10, border: "2px solid #b08a3e", backgroundImage: `url(${EVO_URL(ALLY_EVO[a.id], allyEvoStage(r, a, heroStage(state.player.level).idx))})`, backgroundSize: "cover", backgroundPosition: "center 18%" } : { width: 46, height: 46, flexShrink: 0, borderRadius: "50%", border: `2px solid ${on ? "#b08a3e" : "#d8c9a3"}`, backgroundColor: "#e9e4d6", backgroundImage: `url(${ART_URL}${a.img})`, backgroundSize: "300% auto", backgroundPosition: `${a.face[0]}% ${a.face[1]}%`, filter: on ? "none" : "brightness(0) opacity(0.3)" }} />
              <span className="flex-1 min-w-0">
                <span className="block text-sm" style={{ fontWeight: 800, color: on ? "var(--ink)" : "var(--ink-mute)" }}>{on ? a.name : "？？？"}<span className="text-[10px] ml-1" style={{ color: "var(--ink-soft)", fontWeight: 500 }}>{on ? a.role : ""}</span></span>
                <span className="block text-[10px]" style={{ color: on ? "var(--sky-deep)" : "var(--ink-mute)" }}>{on ? fxText(bondFx(a, r)) : `${allyJoinText(a, r)}で仲間に`}</span>
                {on && (() => { const pts = r.bonds[a.id] || 0, lv = bondLevel(pts), lo = BOND_LV[lv - 1], hi = BOND_LV[lv]; return (
                  <span className="block mt-0.5">
                    <span className="flex items-center gap-1 text-[10px]" style={{ color: "#c9667e", fontWeight: 800 }}>{"♥".repeat(lv)}<span style={{ color: "var(--rule-soft)" }}>{"♥".repeat(BOND_LV.length - lv)}</span><span className="ml-auto" style={{ color: "var(--ink-mute)", fontWeight: 500 }}>{hi ? `絆 ${pts}/${hi}` : "絆 MAX"}</span></span>
                    <span className="block" style={{ height: 4, borderRadius: 2, background: "var(--beige)", overflow: "hidden" }}><span className="block" style={{ width: `${hi ? ((pts - lo) / (hi - lo)) * 100 : 100}%`, height: "100%", background: "linear-gradient(90deg, #e9a3b4, #c9667e)" }} /></span>
                  </span>); })()}
              </span>
            </button>
          );
        })}
      </div>
      </div>
      ))}
      {ALLIES.filter((a) => joined.has(a.id)).some((a) => bondLevel(r.bonds[a.id]) >= 2) && (
        <div className="jp mt-2">
          <div className="text-[10px] mb-1" style={{ color: "var(--ink-soft)" }}>絆の物語（もう一度読む）</div>
          <div className="flex flex-wrap gap-1.5">
            {ALLIES.filter((a) => joined.has(a.id)).flatMap((a) => (BOND_TALKS[a.id] || []).slice(0, bondLevel(r.bonds[a.id]) - 1).map((ep, k) => (
              <button key={`${a.id}${k}`} onClick={() => actions.openTalk({ title: `${a.name}との絆 Lv${k + 2}「${ep.title}」`, lines: ep.lines })} className="text-[11px] px-2.5 py-1" style={{ borderRadius: 999, border: "1px solid #e9a3b4", background: "var(--paper)", color: "var(--ink)", cursor: "pointer" }}>♥ {a.name}「{ep.title}」</button>
            )))}
          </div>
        </div>
      )}
      <p className="jp text-[10px] mt-2" style={{ color: "var(--ink-mute)" }}>仲間は、物語や週報の会話に登場して、得意分野の助言をくれます。仲間を選ぶと、話を聞けます。得意分野の問題に正解すると絆が深まり、物語が開いて効果も強くなります（{ALLIES.map((a) => `${a.name}：${a.likeText}`).join("／")}）。</p>
    </Box>
  );
}
function CastleCard({ state, pp, actions }) {
  const r = normRpg(state.rpg);
  const world = curWorld(state);
  const floor = castleFloorOf(r, world.id);
  const ctx = castleCtx(state, pp);
  const nextF = CASTLE_FLOORS[floor];
  const can = nextF && nextF.test(ctx);
  return (
    <Box title={world.id === "home" ? "魔王城" : `魔王城　${world.castle}`} icon={<Castle size={18} />}>
      <div className="flex gap-3">
        <svg viewBox="0 0 90 170" width="84" height="158" aria-hidden="true" style={{ flexShrink: 0 }}>
          <path d="M45 4l6 10h-12z" fill={floor >= 5 ? "#f2c14e" : "#6c5a96"} />
          {CASTLE_FLOORS.map((f, i) => {
            const y = 132 - i * 28, w = 70 - i * 9, x = 45 - w / 2, lit = i < floor, cur = i === floor;
            return (
              <g key={f.name}>
                <rect x={x} y={y} width={w} height={26} rx="2" fill={lit ? "#d6b56a" : cur ? "#5a4a80" : "#3d2f55"} stroke={cur ? "#f2c14e" : "#22335c"} strokeWidth={cur ? 2 : 1} />
                {[0, 1, 2].map((k) => <rect key={k} x={x + 6 + k * (w - 12) / 3} y={y + 9} width="4" height="8" rx="2" fill={lit ? "#fff3c4" : "#1f1a30"} />)}
              </g>
            );
          })}
          <rect x="35" y="148" width="20" height="10" fill="#22335c" />
        </svg>
        <div className="flex-1 min-w-0 jp space-y-1">
          {CASTLE_FLOORS.map((f, i) => (
            <div key={f.name} className="text-[11px]" style={{ color: i < floor ? "var(--gold)" : i === floor ? "var(--ink)" : "var(--ink-mute)", fontWeight: i <= floor ? 700 : 400 }}>
              {i < floor ? "✓" : i === floor ? "▶" : "・"} {i + 1}階：{f.name}{i >= floor ? `（${f.need}）` : "　突破済み"}
            </div>
          ))}
          {floor >= CASTLE_FLOORS.length ? <div className="text-sm pt-1" style={{ color: "var(--gold)", fontWeight: 800 }}>魔王を討伐しました！ あとは本番で、この力を出し切るだけです。</div>
            : <button disabled={!can} onClick={() => actions.castleClimb()} className="jp btn-danger w-full py-2 mt-1 text-sm">{can ? `${nextF.name}に攻め込む（報酬：${rewardText(nextF.reward)}）` : `${nextF.name}：条件を満たすと攻め込めます`}</button>}
        </div>
      </div>
      <p className="jp text-[10px] mt-2" style={{ color: "var(--ink-mute)" }}>城は下から1階ずつ攻略します。模試の塔の最高記録と、地域の解放が鍵です。最上階の魔王は、本番形式で合格ラインを取ると倒せます。</p>
    </Box>
  );
}
// ── 知識の城：フォルダ1つが塔1本。問題集1つが1段で、覚えた分だけれんがが積み上がる ──
// 進み具合 ＝（定着した問題［安定度21日以上］＋ 正解したことのある問題×0.5）÷ 問題数
const KC_STAGES = [
  { at: 0, name: "空き地" }, { at: 0.05, name: "礎石" }, { at: 0.25, name: "城壁" }, { at: 0.5, name: "屋根" }, { at: 0.8, name: "旗が立つ" },
];
const kcStage = (p) => KC_STAGES.reduce((k, st, i) => (p >= st.at ? i : k), 0);
const kcCache = new WeakMap();
function knowledgeCastle(state) {
  const c = kcCache.get(state.questionBanks);
  if (c) return c;
  const bankP = (b) => {
    const qs = (b.questions || []).filter((q) => !q.excluded);
    let sc = 0, m = 0;
    qs.forEach((q) => { if (q.fs && q.fs.s >= MASTERED_STABILITY) { sc += 1; m++; } else if ((q.correct || 0) > 0) sc += 0.5; });
    return { b, n: qs.length, score: sc, mastered: m, p: qs.length ? sc / qs.length : 0 };
  };
  const folders = [...(state.folders || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), { id: null, name: "フォルダなし" }];
  const towers = folders.map((f) => {
    const banks = state.questionBanks.filter((b) => (f.id ? b.folderId === f.id : !b.folderId) && (b.questions || []).length).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(bankP);
    const n = banks.reduce((t, x) => t + x.n, 0), score = banks.reduce((t, x) => t + x.score, 0);
    const p = n ? score / n : 0;
    return { f, key: f.id || "__none", banks, n, score, p, stage: kcStage(p) };
  }).filter((t) => t.banks.length && t.n);
  const n = towers.reduce((t, x) => t + x.n, 0), score = towers.reduce((t, x) => t + x.score, 0);
  const res = { towers, p: n ? score / n : 0, done: towers.length > 0 && towers.every((t) => t.stage >= 4) };
  kcCache.set(state.questionBanks, res);
  return res;
}
function KnowledgeCastle({ state }) {
  const kc = knowledgeCastle(state);
  const [pick, setPick] = useState(null);
  const pid = useId().replace(/:/g, "");
  if (!kc.towers.length) return null;
  const T = kc.towers.length;
  const TW = 56, GAP = 20, MAXH = 120, GROUND = MAXH + 58, H = GROUND + 30, W = Math.max(300, T * (TW + GAP) + 30);
  const x0 = (W - (T * TW + (T - 1) * GAP)) / 2;
  const sel = kc.towers.find((t) => t.key === pick) || null;
  const stone = "#d9cfb6", stoneDark = "#a8977a", ghost = "var(--rule)";
  const wallW = T * TW + (T - 1) * GAP + 20, wallUp = kc.p >= 0.25;
  return (
    <Box title="知識の城" icon={<Castle size={18} />}>
      <div className="jp">
        <div className="flex items-center text-[11px] mb-1" style={{ color: "var(--ink-soft)" }}>
          <span className="flex-1">フォルダ1つが塔1本。問題集1つが1段で、覚えるほど積み上がります。</span>
          <span style={{ fontWeight: 800, color: kc.done ? "var(--gold)" : "var(--ink)" }}>城の完成度 {Math.round(kc.p * 100)}%</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: Math.max(360, T * 96), margin: "0 auto", height: "auto", display: "block", background: "linear-gradient(180deg, rgba(160,190,220,0.22), rgba(214,181,106,0.10))", borderRadius: 10, border: "1px solid var(--rule-soft)" }}>
          <defs>
            {/* れんがの模様（ふつう・定着した段は金色） */}
            <pattern id={`kcb${pid}`} width="14" height="8" patternUnits="userSpaceOnUse"><rect width="14" height="8" fill={stone} /><path d="M0 8H14M0 4H14M7 0V4M0 4V8M14 4V8" stroke={stoneDark} strokeWidth="0.7" fill="none" /></pattern>
            <pattern id={`kcg${pid}`} width="14" height="8" patternUnits="userSpaceOnUse"><rect width="14" height="8" fill="#ecd9a3" /><path d="M0 8H14M0 4H14M7 0V4M0 4V8M14 4V8" stroke="#b08a3e" strokeWidth="0.7" fill="none" /></pattern>
          </defs>
          {/* 地面と城壁（城全体が25%を超えると建つ） */}
          <rect x="0" y={GROUND} width={W} height={H - GROUND} fill="rgba(109,132,84,0.28)" />
          <rect x={x0 - 10} y={GROUND - 22} width={wallW} height="22" fill={wallUp ? `url(#kcb${pid})` : "none"} stroke={wallUp ? stoneDark : ghost} strokeDasharray={wallUp ? "0" : "4 3"} />
          {wallUp && Array.from({ length: Math.floor(wallW / 12) }, (_, i) => <rect key={i} x={x0 - 10 + i * 12} y={GROUND - 27} width="7" height="5" fill={stone} stroke={stoneDark} strokeWidth="0.7" />)}
          {kc.towers.map((t, ti) => {
            const x = x0 + ti * (TW + GAP);
            const rows = t.banks.length, rh = MAXH / rows;
            const top = GROUND - MAXH;
            const on = pick === t.key;
            const filled = t.banks.reduce((h, bk) => h + rh * Math.min(1, bk.p), 0);
            return (
              <g key={t.key} onClick={() => setPick(on ? null : t.key)} style={{ cursor: "pointer" }}>
                {/* 塔の外形（まだ建っていない所は点線） */}
                <rect x={x} y={top} width={TW} height={MAXH} fill="var(--paper)" fillOpacity="0.55" stroke={ghost} strokeDasharray="3 3" />
                {/* 段（問題集）の区切り（点線）と、覚えた分のれんが（下から順にすき間なく積む） */}
                {t.banks.map((bk, k) => k > 0 && <line key={`d${bk.b.id}`} x1={x} y1={GROUND - k * rh} x2={x + TW} y2={GROUND - k * rh} stroke={ghost} strokeDasharray="2 3" />)}
                {(() => { let y = GROUND; return t.banks.map((bk) => {
                  const fh = rh * Math.min(1, bk.p);
                  y -= fh;
                  return fh > 0.5 ? <rect key={bk.b.id} x={x} y={y} width={TW} height={fh} fill={`url(#${bk.p >= 0.8 ? "kcg" : "kcb"}${pid})`} stroke={stoneDark} strokeWidth="0.8" /> : null;
                }); })()}
                {/* 窓（城壁の段から） */}
                {t.stage >= 2 && filled > 50 && <rect x={x + TW / 2 - 6} y={GROUND - Math.min(filled, MAXH) + 14} width="12" height="18" rx="6" fill="#4a5a78" opacity="0.8" />}
                {/* 胸壁・屋根・旗 */}
                {t.stage >= 1 && t.stage < 3 && Array.from({ length: 4 }, (_, i) => <rect key={i} x={x + i * 16} y={GROUND - filled - 6} width="8" height="6" fill={stone} stroke={stoneDark} strokeWidth="0.8" />)}
                {t.stage >= 3 && <polygon points={`${x - 6},${top} ${x + TW + 6},${top} ${x + TW / 2},${top - 30}`} fill={t.stage >= 4 ? "#3e5c99" : "#7a5a3a"} stroke="#2b3550" strokeWidth="0.8" />}
                {t.stage >= 4 && <g><line x1={x + TW / 2} y1={top - 30} x2={x + TW / 2} y2={top - 50} stroke="#5b4413" strokeWidth="1.5" /><path d={`M ${x + TW / 2} ${top - 50} l 16 5 l -16 5 z`} fill="#d6b56a" stroke="#b08a3e" strokeWidth="0.6" /></g>}
                {on && <rect x={x - 3} y={top - (t.stage >= 3 ? 34 : 4)} width={TW + 6} height={MAXH + (t.stage >= 3 ? 34 : 4)} fill="none" stroke="#b08a3e" strokeWidth="2" rx="3" />}
                <text x={x + TW / 2} y={GROUND + 13} textAnchor="middle" fontSize="9" fill="var(--ink)" style={{ fontWeight: 700 }}>{t.f.name.length > 6 ? t.f.name.slice(0, 6) + "…" : t.f.name}</text>
                <text x={x + TW / 2} y={GROUND + 25} textAnchor="middle" fontSize="8" fill="var(--ink-soft)">{Math.round(t.p * 100)}%・{KC_STAGES[t.stage].name}</text>
              </g>
            );
          })}
          {wallUp && <path d={`M ${W / 2 - 11} ${GROUND} v -12 a 11 11 0 0 1 22 0 v 12 z`} fill="#6b5a3c" />}
          {kc.done && <text x={W / 2} y="16" textAnchor="middle" fontSize="12" fill="#b08a3e" style={{ fontWeight: 800 }}>★ 知識の城、完成！ ★</text>}
        </svg>
        <p className="text-[10px] mt-1" style={{ color: "var(--ink-mute)" }}>塔を押すと、段（問題集）ごとの進み具合が見られます。正解した問題は半分、定着した問題（次の復習が3週間以上先）は1つ分として数えます。</p>
        {sel && (
          <div className="mt-2 px-2 py-1.5" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 8 }}>
            <div className="flex items-center text-xs mb-1"><span className="flex-1" style={{ fontWeight: 800, color: "var(--ink)" }}>{sel.f.name}の塔（{KC_STAGES[sel.stage].name}）</span>
              {sel.stage < 4 && <span className="text-[10px]" style={{ color: "var(--ink-soft)" }}>「{KC_STAGES[sel.stage + 1].name}」まで あと{Math.max(1, Math.ceil(KC_STAGES[sel.stage + 1].at * sel.n - sel.score))}問分</span>}
            </div>
            {[...sel.banks].reverse().map((bk) => (
              <div key={bk.b.id} className="py-0.5">
                <div className="flex text-[11px]"><span className="flex-1 truncate" style={{ color: "var(--ink)" }}>{bk.b.name}</span><span style={{ color: "var(--ink-soft)" }}>定着 {bk.mastered}/{bk.n}問・{Math.round(bk.p * 100)}%</span></div>
                <div style={{ height: 4, borderRadius: 2, background: "var(--beige)", overflow: "hidden" }}><div style={{ width: `${bk.p * 100}%`, height: "100%", background: bk.p >= 0.8 ? "#d6b56a" : "#b8a882" }} /></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Box>
  );
}

function JourneyCard({ state }) {
  const r = normRpg(state.rpg);
  const j = r.journey || { pos: 0, acc: 0, lap: 0, log: [] };
  const th = BATTLE_THEME[(state.displaySettings && state.displaySettings.theme) || "white"] || BATTLE_THEME.white;
  const from = Math.max(0, j.pos - 2);
  const cells = Array.from({ length: 12 }, (_, k) => from + k).filter((i) => i <= JOURNEY_LEN);
  return (
    <Box title="旅路" icon={<Calendar size={18} />}>
      <div className="jp flex justify-between text-[11px] mb-1" style={{ color: "var(--ink-soft)" }}>
        <span>{j.lap > 0 ? `${j.lap + 1}周目の旅 ・ ` : ""}{j.pos} / {JOURNEY_LEN}マス（魔王城まで）</span>
        <span>次のマスまで あと{JOURNEY_PER - (j.acc || 0)}体</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: "var(--beige)", overflow: "hidden", marginBottom: 8 }}><div style={{ width: `${(j.pos / JOURNEY_LEN) * 100}%`, height: "100%", background: "linear-gradient(90deg, #6fb8b4, #d6b56a)" }} /></div>
      <div className="flex items-end gap-1 overflow-hidden" style={{ paddingTop: 30 }}>
        {cells.map((i) => {
          const ev = journeyEvent(i);
          const here = i === j.pos;
          return (
            <div key={i} className="relative flex-1 text-center" style={{ minWidth: 26 }}>
              {here && <div style={{ position: "absolute", left: "50%", top: -30, transform: "translateX(-50%)", width: 28, height: 28, borderRadius: "50%", border: "2px solid #b08a3e", backgroundColor: "#e9e4d6", backgroundImage: `url(${th.avatar})`, backgroundSize: "300% auto", backgroundPosition: `${th.face[0]}% ${th.face[1]}%`, animation: "sqbIdle 1.6s ease-in-out infinite" }} />}
              <div className="jp" style={{ height: 26, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ev ? 14 : 9, background: i < j.pos ? "var(--cream)" : here ? "#f6ead0" : "var(--paper)", border: `1px solid ${here ? "var(--gold)" : "var(--rule-soft)"}`, color: "var(--ink-mute)", opacity: i < j.pos ? 0.55 : 1 }}>{i === JOURNEY_LEN ? "🏰" : ev ? ev.icon : i}</div>
            </div>
          );
        })}
      </div>
      {j.log && j.log.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {j.log.slice(-3).reverse().map((l, k) => <div key={k} className="jp text-[11px]" style={{ color: k === 0 ? "var(--ink)" : "var(--ink-mute)" }}>{l}</div>)}
        </div>
      )}
      <p className="jp text-[10px] mt-2" style={{ color: "var(--ink-mute)" }}>魔物を{JOURNEY_PER}体倒すごとに1マス進みます。宝箱・旅人・祠・町のマスでは、ちょっとした贈り物があります。</p>
    </Box>
  );
}
function CategoryQuests({ state, pp, actions }) {
  const r = normRpg(state.rpg);
  const regs = [...pp.regions].filter((g) => g.total > 0).sort(byRegionOrder);
  const [open, setOpen] = useState(() => (regs[0] ? regs[0].name : null));
  const [msg, setMsg] = useState("");
  return (
    <Box title="カテゴリ討伐（長期クエスト）" icon={<Award size={18} />}>
      <p className="jp text-[10px] mb-2" style={{ color: "var(--ink-mute)" }}>科目（フォルダ）の中の問題集を、1つずつ ★1〜★5 まで育てる長い旅です。★5「全部を制覇」は、すべての問題を21日以上覚えていられる状態。達成すると「〇〇の達人」の称号が手に入ります。</p>
      {msg && <div className="jp text-xs text-center mb-2" style={{ color: "var(--gold)", fontWeight: 700, animation: "sqFadeIn .3s ease-out" }}>{msg}</div>}
      <div className="space-y-1.5">
        {regs.map((g) => {
          const stars = g.banks.reduce((a, b) => a + ((r.cats && r.cats[b.id]) || 0), 0);
          return (
            <div key={g.name} style={{ border: `1px solid ${g.th.body}66`, background: "var(--paper)" }}>
              <button onClick={() => setOpen(open === g.name ? null : g.name)} className="w-full jp flex items-center gap-2 px-2 py-1.5 text-left" style={{ background: "transparent", border: "none", cursor: "pointer" }}>
                <MaterialIcon id={g.th.mat || "m-meikyu"} size={20} />
                <span className="flex-1 text-sm" style={{ fontWeight: 800, color: g.th.dark }}>{g.name}</span>
                <span className="text-[11px]" style={{ color: "var(--gold)" }}>★{stars}/{g.banks.length * 5}</span>
                <span className="text-[10px]" style={{ color: "var(--ink-mute)" }}>{open === g.name ? "▲" : "▼"}</span>
              </button>
              {open === g.name && (
                <div className="px-2 pb-2 space-y-1">
                  {g.banks.map((b) => {
                    const got = (r.cats && r.cats[b.id]) || 0;
                    const c = catCounts(b);
                    const tier = CAT_TIERS[got];
                    const ready = tier && c.n > 0 && tier.test(c);
                    const [v, max] = tier ? tier.prog(c) : [c.n, c.n];
                    return (
                      <div key={b.id} className="jp px-2 py-1.5" style={{ background: ready ? "var(--cream)" : "var(--paper)", border: `1px solid ${ready ? "var(--gold)" : "var(--rule-soft)"}` }}>
                        <div className="flex items-center gap-2">
                          <span className="flex-1 text-xs truncate" style={{ color: "var(--ink)", fontWeight: 700 }}>{b.name}</span>
                          <span className="text-xs" style={{ letterSpacing: 1 }}><span style={{ color: "#d6b56a" }}>{"★".repeat(got)}</span><span style={{ color: "var(--rule-soft)" }}>{"★".repeat(5 - got)}</span></span>
                        </div>
                        {tier ? (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px]" style={{ color: "var(--ink-soft)", whiteSpace: "nowrap" }}>★{got + 1} {tier.label}</span>
                            <div className="flex-1" style={{ height: 5, borderRadius: 3, background: "var(--beige)", overflow: "hidden" }}><div style={{ width: `${max ? Math.min(100, (v / max) * 100) : 0}%`, height: "100%", background: g.th.body }} /></div>
                            <span className="text-[10px]" style={{ color: "var(--ink-mute)" }}>{Math.min(v, max)}/{max}</span>
                            {ready && <button onClick={() => { const m = actions.claimCat(b.id); if (m) { setMsg(m); SFX.play("forgeOk"); setTimeout(() => setMsg(""), 3000); } }} className="btn-primary text-[10px] px-2 py-0.5">受け取る</button>}
                          </div>
                        ) : <div className="text-[10px] mt-1" style={{ color: "var(--gold)", fontWeight: 700 }}>★5 達成！ 「{b.name}の達人」</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Box>
  );
}

// 地域の守護者に挑む画面（地図で地域を選んだときに出す）
function RegionDetail({ g, r, onGuardian }) {
  const st = regionStatus(g, r);
  const info = regionInfo(g.name);
  return (
    <div className="jp mt-2 p-2 text-xs" style={{ background: "var(--paper)", border: `1px solid ${g.th.body}`, animation: "sqFadeIn .25s ease-out" }}>
      <div className="flex items-center gap-2">
        <div className="flex-1" style={{ fontWeight: 800, color: g.th.dark }}>{g.name}</div>
        <span className="text-[10px] px-2" style={{ borderRadius: 999, border: `1px solid ${st === "cleared" ? "var(--gold)" : "var(--rule-soft)"}`, color: st === "cleared" ? "var(--gold)" : "var(--ink-soft)" }}>{{ fog: "霧の中", explore: "探索中", ready: "守護者に挑める", cleared: "解放済み" }[st]}</span>
      </div>
      <div style={{ color: "var(--ink-soft)" }}>合格力 {pctTxt(g.power)} ・ 出会った問題 {g.seen}/{g.total} ・ 手強い魔物 {g.weak}体</div>
      <div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>問題集：{g.banks.map((b) => b.name).join("、")}</div>
      <div className="flex items-center gap-2 mt-2">
        <GameIcon ch={info.icon} id={info.boss} size={40} boss />
        <div className="flex-1 min-w-0">
          <div style={{ fontWeight: 700, color: "var(--brick)" }}>守護者：{info.guardian}</div>
          <div className="text-[10px]" style={{ color: "var(--ink-soft)" }}>倒すと「{info.emblem.name}」（{fxText(info.emblem.fx)}）</div>
        </div>
        {st === "cleared" ? <span className="text-[11px]" style={{ color: "var(--gold)", fontWeight: 800 }}>撃破済み</span>
          : <button disabled={st !== "ready"} onClick={() => onGuardian(g)} className="btn-danger text-[11px] px-2 py-1.5">{st === "ready" ? "挑む（15問）" : `合格力${Math.round(GUARDIAN_LINE * 100)}%で挑戦`}</button>}
      </div>
      {st === "fog" && <div className="text-[10px] mt-1" style={{ color: "var(--ink-mute)" }}>この地域は霧に包まれています。問題の2割に出会うと、霧が晴れます。</div>}
    </div>
  );
}
// その話でいちばん多く出てくる条文（論点の名前に使う）
function questTopic(q) {
  const cnt = new Map();
  q.qs.forEach((x) => extractLawRefs([`${x.q || ""} ${x.a || ""}`]).forEach((ref) => { const k = `${ref.law}:${ref.art}`; const c = cnt.get(k) || { ref, n: 0 }; c.n++; cnt.set(k, c); }));
  let best = null;
  cnt.forEach((c) => { if (!best || c.n > best.n) best = c; });
  return best ? best.ref : null;
}
function questTitle(q, laws) {
  const ref = questTopic(q);
  if (!ref) return `${q.bank.name} 第${q.idx + 1}話`;
  const law = laws[ref.law];
  const art = law && law.articles ? law.articles.find((a) => a.n === ref.art) : null;
  const cap = art && art.c ? art.c.replace(/^（|）$/g, "") : null;
  const artLabel = `${LAW_BY_KEY[ref.law].short}${ref.art.includes("_") ? ref.art.replace("_", "条の") : `${ref.art}条`}`;
  return cap ? `${cap}（${artLabel}）` : `${artLabel}をめぐる戦い`;
}
// 六角形の地図：中心（地域の町）から渦を巻くように並べる
function hexSpiral(n) {
  const dirs = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  const out = [[0, 0]];
  for (let ring = 1; out.length < n + 1; ring++) {
    let q = -ring, r = ring; // 方向4（左下）に ring 歩
    for (let side = 0; side < 6 && out.length < n + 1; side++) {
      for (let j = 0; j < ring && out.length < n + 1; j++) { out.push([q, r]); q += dirs[side][0]; r += dirs[side][1]; }
    }
  }
  return out;
}
const SQ_BIOMES = [["草原", "#b5d69a"], ["森", "#7fae6a"], ["丘", "#d6c48e"], ["湖畔", "#9cc7df"], ["荒野", "#dcc29a"], ["雪原", "#e9f0f6"], ["花畑", "#ecc3cf"]];

let lastStoryRegion = null; // ストーリーで最後に見ていた地域（戦いから戻ったときに同じ地域を開く）
// 地図の絵（public/art/storymap.webp＝イラストフォルダの「不動産登記法の王都クエストマップ」）の上の、クエストの場所（絵の座標）
// 1枚の地図に25話。はじまりの町から、左の道 → 右の道 → 中央の道を通って魔王の城へ
const SMAP = { w: 1464, h: 675, x0: 36, y0: 100 };
const SMAP_NODES = [[768, 604], [768, 530], [768, 455], [768, 380], [768, 293], [667, 530], [514, 563], [556, 470], [413, 523], [610, 405], [378, 445], [444, 365], [676, 345], [518, 320], [596, 280], [870, 520], [1022, 562], [980, 470], [1124, 522], [929, 402], [1160, 445], [1093, 365], [863, 345], [1018, 320], [940, 280]];
const HEX_CLIP = "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)";
function StoryRoadMap({ quests, r, sel, setSel, nextQ, regionName, world }) {
  const M = world && world.map ? { ...world.map, url: `${ART_URL}${world.map.file}` } : { url: `${ART_URL}storymap.webp`, nodes: SMAP_NODES, order: SMAP_ORDER, box: SMAP };
  const SMAP_PER = M.order.length;
  const hue = world && !world.map && world.mapHue ? `hue-rotate(${world.mapHue}deg) saturate(1.15)` : undefined;
  const pages = Math.max(1, Math.ceil(quests.length / SMAP_PER));
  const nextIdx = nextQ ? quests.indexOf(nextQ) : quests.length - 1;
  const [page, setPage] = useState(() => Math.min(pages - 1, Math.max(0, Math.floor(nextIdx / SMAP_PER))));
  const pg = Math.min(page, pages - 1);
  const wrapRef = useRef(null);
  useEffect(() => { setPage(Math.min(pages - 1, Math.max(0, Math.floor(nextIdx / SMAP_PER)))); }, [regionName]);
  // スマホでは地図を横に動かせる。いまのクエストが見える所まで寄せる
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const k = nextIdx - pg * SMAP_PER;
    const node = M.nodes[M.order[k >= 0 && k < SMAP_PER ? k : 0]];
    el.scrollLeft = Math.max(0, ((node[0] - M.box.x0) / M.box.w) * el.scrollWidth - el.clientWidth / 2);
  }, [pg, regionName]);
  const pct = ([x, y]) => ({ left: `${((x - M.box.x0) / M.box.w) * 100}%`, top: `${((y - M.box.y0) / M.box.h) * 100}%` });
  const cleared = quests.slice(pg * SMAP_PER, (pg + 1) * SMAP_PER).filter((q) => sqStars(r, q.key) >= 1).length;
  return (
    <div>
      {pages > 1 && (
        <div className="jp flex items-center gap-2 mb-1 text-[11px]" style={{ color: "var(--ink-soft)" }}>
          <button onClick={() => setPage(Math.max(0, pg - 1))} disabled={pg === 0} className="btn-ghost px-2 py-0.5 text-[11px]">◀</button>
          <span className="flex-1 text-center" style={{ fontWeight: 800, color: "var(--ink)" }}>第{pg + 1}の地図（第{pg * SMAP_PER + 1}〜{Math.min(quests.length, (pg + 1) * SMAP_PER)}話）<span className="ml-1" style={{ fontWeight: 500, color: "var(--ink-soft)" }}>{cleared}/{Math.min(SMAP_PER, quests.length - pg * SMAP_PER)}</span></span>
          <button onClick={() => setPage(Math.min(pages - 1, pg + 1))} disabled={pg >= pages - 1} className="btn-ghost px-2 py-0.5 text-[11px]">▶</button>
        </div>
      )}
      <div ref={wrapRef} style={{ overflowX: "auto", borderRadius: 10, WebkitOverflowScrolling: "touch" }}>
        <div style={{ position: "relative", width: "max(100%, 680px)", aspectRatio: `${M.box.w} / ${M.box.h}`, backgroundColor: "#fbf8f0" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${M.url})`, backgroundSize: "100% 100%", filter: hue }} />
          {M.order.map((ni, k) => {
            const q = quests[pg * SMAP_PER + k];
            const at = pct(M.nodes[ni]);
            const base = { position: "absolute", ...at, width: "4%", aspectRatio: "1 / 1.12", transform: "translate(-50%, -50%)" };
            if (!q && M.fog) return <div key={k} style={{ ...base, width: "6%", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.97) 0%, rgba(250,252,255,0.9) 42%, rgba(255,255,255,0) 72%)" }} />; // この地域にない場所（絵の印を雲で隠す）
            if (!q) return <div key={k} style={{ ...base, clipPath: HEX_CLIP, background: "radial-gradient(circle, #ece2c6 0%, #e2d5b2 100%)", opacity: 0.96, filter: hue }} />; // この地域にない場所（絵の印を消す）
            const st = sqStars(r, q.key), open = sqOpen(r, q), isSel = sel === q.key, isNext = nextQ && q.key === nextQ.key;
            if (st < 1 && !open) return (
              <div key={k} title="まだ見えない道" style={base}>
                <span style={{ position: "absolute", inset: 0, clipPath: HEX_CLIP, background: "#c9b78f" }} />
                <span style={{ position: "absolute", inset: "8%", clipPath: HEX_CLIP, background: "#efe6cf", display: "flex", alignItems: "center", justifyContent: "center", color: "#b8a77c", fontSize: 9, fontWeight: 800 }}>？</span>
              </div>
            );
            const ring = isSel ? "#e0a92e" : st >= 1 ? "#2f5d9e" : "#b08a3e";
            return (
              <button key={k} onClick={() => setSel(isSel ? null : q.key)} title={`第${pg * SMAP_PER + k + 1}話`} style={{ ...base, width: "4.6%", padding: 0, border: "none", background: "none", cursor: "pointer", filter: isNext || isSel ? "drop-shadow(0 0 6px rgba(255,214,110,0.95))" : "drop-shadow(0 2px 2px rgba(0,0,0,0.25))", animation: isNext ? "sqxPulse 1.6s ease-in-out infinite" : undefined, zIndex: isSel ? 3 : 2 }}>
                <span style={{ position: "absolute", inset: 0, clipPath: HEX_CLIP, background: ring }} />
                <span style={{ position: "absolute", inset: "7%", clipPath: HEX_CLIP, background: st >= 1 ? "linear-gradient(180deg, #6f9fe0, #2f5d9e)" : "#fdfbf5", display: "flex", alignItems: "center", justifyContent: "center", color: st >= 1 ? "#fff" : "#c9433f", fontWeight: 900, fontSize: "clamp(10px, 1.7vw, 16px)", lineHeight: 1 }}>{st >= 1 ? "✓" : "!"}</span>
                {st >= 1 && <span style={{ position: "absolute", left: "50%", top: "100%", transform: "translateX(-50%)", fontSize: 8, color: "#b08a3e", whiteSpace: "nowrap", textShadow: "0 0 2px #fff, 0 0 2px #fff" }}>{"★".repeat(st)}</span>}
              </button>
            );
          })}
        </div>
      </div>
      <p className="jp text-[10px] mt-1 text-center" style={{ color: "var(--ink-mute)" }}>光っている「！」が、いま挑めるクエストです。{M.start || "はじまりの町"}から道をたどり、{world && world.id !== "home" ? world.castle : "魔王の城"}をめざしましょう。{pages > 1 ? `1枚の地図に${SMAP_PER}話。◀▶で地図を切りかえられます。` : ""}</p>
    </div>
  );
}

function StoryQuestView({ state, pp, onStart, actions, onGuardian, onSecBoss }) {
  const r = normRpg(state.rpg);
  const regs = [...pp.regions].filter((g) => g.total > 0).sort(byRegionOrder);
  const [regName, setRegNameRaw] = useState(() => {
    if (lastStoryRegion && regs.some((g) => g.name === lastStoryRegion)) return lastStoryRegion; // 前に見ていた地域
    const firstOpen = regs.find((g) => regionQuests(g).some((q) => sqStars(r, q.key) < 1));
    return (firstOpen || regs[0] || {}).name;
  });
  const setRegName = (n) => { lastStoryRegion = n; setRegNameRaw(n); };
  const g = regs.find((x) => x.name === regName) || regs[0];
  const [sel, setSel] = useState(null);
  const [laws, setLaws] = useState({});
  const quests = g ? regionQuests(g) : [];
  // 論点の名前に使う条文データを読み込む（必要な法令だけ）
  useEffect(() => {
    let alive = true;
    const keys = new Set();
    quests.forEach((q) => { const t = questTopic(q); if (t) keys.add(t.law); });
    keys.forEach((k) => { if (!(k in laws)) loadLaw(k).then((d) => { if (alive) setLaws((prev) => ({ ...prev, [k]: d })); }); });
    return () => { alive = false; };
  }, [g && g.name]);
  // 地域に初めて入ったときの物語（フックは早期の return より前に置く）
  useEffect(() => {
    if (actions && g && !r.arcSeen[`${g.name}:intro`]) { actions.markArc(g.name, "intro"); actions.openTalk({ title: `${g.name}　はじまり`, lines: worldArc(g.name).intro }); }
  }, [g && g.name]);
  if (!g) return <Box title="ストーリー" icon={<BookOpen size={18} />}><p className="jp text-sm" style={{ color: "var(--ink-mute)" }}>問題集をフォルダ（科目）に入れると、ストーリーが始まります。</p></Box>;
  const cleared = quests.filter((q) => sqStars(r, q.key) >= 1).length;
  const nextQ = quests.find((q) => sqStars(r, q.key) < 1 && sqOpen(r, q));
  const pos = hexSpiral(quests.length);
  const R = 17, W3 = Math.sqrt(3);
  const px = ([q, rr]) => [R * W3 * (q + rr / 2), R * 1.5 * rr];
  const pts = pos.map(px);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  // 地図の表示範囲（土地が少ないうちも六角形が大きくなりすぎないよう、最低限の広さを確保）
  const spanW = Math.max(Math.max(...xs) - Math.min(...xs) + R * 2.4, R * W3 * 11), spanH = Math.max(Math.max(...ys) - Math.min(...ys) + R * 2.6, R * 1.5 * 7);
  const cx0 = (Math.max(...xs) + Math.min(...xs)) / 2, cy0 = (Math.max(...ys) + Math.min(...ys)) / 2;
  const vb = [cx0 - spanW / 2, cy0 - spanH / 2, spanW, spanH];
  const hex = (cx, cy, rr = R) => Array.from({ length: 6 }, (_, k) => { const a = Math.PI / 180 * (60 * k - 30); return `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`; }).join(" ");
  const bankIdx = new Map(g.banks.map((b, i) => [b.id, i]));
  const sq = sel ? quests.find((q) => q.key === sel) : null;
  const regKeys = quests.map((q) => q.key);
  const conq = regionConquest(g, r);
  const regSt = regionStatus(g, r);
  return (
    <>
      <style>{BATTLE_CSS}</style>
      <Box title="ストーリー" icon={<BookOpen size={18} />}>
        {/* 章（地域）を選ぶ */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-2">
          {regs.map((x) => {
            const qs = regionQuests(x);
            const c = qs.filter((q) => sqStars(r, q.key) >= 1).length;
            const on = x.name === g.name;
            return (
              <button key={x.name} onClick={() => { setRegName(x.name); setSel(null); }} className="jp flex-shrink-0 px-2.5 py-1 text-[11px]" style={{ borderRadius: 999, border: `1px solid ${on ? x.th.dark : "var(--rule-soft)"}`, background: on ? x.th.light : "var(--paper)", color: on ? x.th.dark : "var(--ink-soft)", fontWeight: 700, cursor: "pointer" }}>
                {x.name} <span style={{ opacity: 0.8 }}>{qs.length ? Math.round((c / qs.length) * 100) : 0}%</span>
              </button>
            );
          })}
        </div>
        <div className="jp flex items-baseline justify-between mb-1">
          <span style={{ fontFamily: "'Shippori Mincho B1', serif", fontWeight: 800, fontSize: 17, color: g.th.dark }}>{g.name}の地図</span>
          <span className="text-[11px]" style={{ color: "var(--ink-soft)" }}>描いた土地 {cleared} / {quests.length}</span>
        </div>
        {/* はじまりの町から魔王の城への地図 */}
        <StoryRoadMap quests={quests} r={r} sel={sel} setSel={setSel} nextQ={nextQ} regionName={g.name} world={curWorld(state)} />
        {/* 選んだクエスト／つづきから */}
        {(sq || nextQ) && (() => {
          const q = sq || nextQ;
          const st = sqStars(r, q.key);
          const open = sqOpen(r, q);
          const rec = (r.sq && r.sq[q.key]) || {};
          return (
            <div className="jp mt-3 p-3" style={{ background: "var(--sky-pale)", border: "1px solid var(--gold)", animation: "sqFadeIn .25s ease-out" }}>
              <div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>{sq ? "選んだクエスト" : "つづきから"} ・ {q.bank.name} ・ 第{q.idx + 1}話 / 全{q.count}話</div>
              <div style={{ fontFamily: "'Shippori Mincho B1', serif", fontWeight: 800, fontSize: 17, color: "var(--ink)" }}>{questTitle(q, laws)}</div>
              <div className="text-[11px]" style={{ color: "var(--ink-soft)" }}>{q.qs.length}問 ・ 最後に「論点の主」が待ち構えています{st ? ` ・ 最高 ${Math.round((rec.best || 0) * 100)}% ${"★".repeat(st)}` : ""}</div>
              <div className="text-[10px]" style={{ color: "var(--gold)" }}>クリア（{Math.round(SQ_CLEAR * 100)}%）★1・{Math.round(PASS_LINE * 100)}%で★2・全問正解で★3</div>
              <button disabled={!open} onClick={() => onStart({ quest: q, title: questTitle(q, laws), region: g.name, mat: g.th.mat, regionKeys: regKeys })} className="jp btn-primary w-full py-2.5 mt-2 text-base">{open ? (st ? "もう一度挑む" : "出発する") : "前の話をクリアすると開きます"}</button>
            </div>
          );
        })()}
        {!nextQ && cleared === quests.length && <p className="jp text-sm text-center mt-3" style={{ color: "var(--gold)", fontWeight: 800 }}>この地域の地図は完成しています！ ★を集め直すこともできます。</p>}
      </Box>
      {/* 地域の制覇への道のり */}
      <Box title={`${g.name}の制覇`} icon={<Crown size={18} />}>
        {r.conquered[g.name] ? <p className="jp text-sm text-center mb-2" style={{ color: "var(--gold)", fontWeight: 800 }}>この地域は制覇済みです！（{r.conquered[g.name]}）</p> : null}
        <div className="space-y-1.5 jp">
          {[
            ["一", "すべての話をクリアする", `${conq.epi}/${conq.epiAll}話`, conq.epi === conq.epiAll && conq.epiAll > 0, conq.epiAll ? conq.epi / conq.epiAll : 0],
            ["二", "すべての節の守護者を倒す", `${conq.secWon}/${conq.secAll}節`, conq.secWon === conq.secAll && conq.secAll > 0, conq.secAll ? conq.secWon / conq.secAll : 0],
            ["三", "地域の守護者を倒す", conq.guard ? "撃破済み" : regSt === "ready" ? "挑戦できます" : `合格力${Math.round(GUARDIAN_LINE * 100)}%で挑戦（いま${pctTxt(g.power)}）`, conq.guard, conq.guard ? 1 : Math.min(1, g.power / GUARDIAN_LINE)],
          ].map(([no, label, v, ok, prog]) => (
            <div key={no} className="flex items-center gap-2 px-2 py-1.5" style={{ background: ok ? "var(--cream)" : "var(--paper)", border: `1px solid ${ok ? "var(--gold)" : "var(--rule-soft)"}`, borderRadius: 8 }}>
              <span style={{ width: 22, height: 22, flexShrink: 0, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, background: ok ? "var(--gold)" : "var(--paper)", color: ok ? "var(--paper)" : "var(--ink-soft)", border: "1px solid var(--gold)" }}>{ok ? "✓" : no}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs" style={{ color: "var(--ink)", fontWeight: 700 }}>{label}</div>
                <div style={{ height: 4, borderRadius: 2, background: "var(--beige)", marginTop: 3, overflow: "hidden" }}><div style={{ width: `${prog * 100}%`, height: "100%", background: "linear-gradient(90deg, #d6b56a, #b08a3e)" }} /></div>
              </div>
              <span className="text-[10px]" style={{ color: "var(--ink-soft)", whiteSpace: "nowrap" }}>{v}</span>
              {no === "三" && !conq.guard && regSt === "ready" && onGuardian && <button onClick={() => onGuardian(g)} className="btn-danger text-[10px] px-2 py-1">挑む</button>}
            </div>
          ))}
        </div>
        <p className="jp text-[10px] mt-2" style={{ color: "var(--ink-mute)" }}>3つすべてを達成すると「地域制覇」。500Gと賢者の結晶、称号がもらえます。不動産登記法・民法・調査士法の3つを制覇すると、特別な章が開きます。</p>
      </Box>
      {/* 節（問題集）ごとの進み具合 */}
      <Box title={`${g.name}の節`} icon={<ScrollIcon size={18} />}>
        <div className="space-y-1">
          {g.banks.map((b, bi) => {
            const qs = quests.filter((q) => q.bank.id === b.id);
            const c = qs.filter((q) => sqStars(r, q.key) >= 1).length;
            const stars = qs.reduce((a, q) => a + sqStars(r, q.key), 0);
            const nq = qs.find((q) => sqStars(r, q.key) < 1);
            const won = r.secBoss[b.id] && r.secBoss[b.id].won;
            const ready = !won && qs.length > 0 && c === qs.length;
            return (
              <div key={b.id} className="w-full jp flex items-center gap-2 px-2 py-1.5" style={{ background: won ? "var(--cream)" : "var(--paper)", border: `1px solid ${won || ready ? "var(--gold)" : "var(--rule-soft)"}`, borderRadius: 6 }}>
                <span style={{ width: 14, height: 14, borderRadius: 3, flexShrink: 0, background: SQ_BIOMES[bi % SQ_BIOMES.length][1], border: "1px solid rgba(34,51,92,0.3)" }} />
                <button onClick={() => nq && setSel(nq.key)} className="flex-1 min-w-0 text-left text-xs truncate" style={{ color: "var(--ink)", fontWeight: 700, background: "none", border: "none", cursor: nq ? "pointer" : "default" }}>{b.name}</button>
                <span className="text-[10px]" style={{ color: "var(--ink-soft)" }}>{c}/{qs.length}話</span>
                <span className="text-[10px]" style={{ color: "#d6b56a" }}>★{stars}</span>
                {won ? <span className="text-[10px] px-1.5" style={{ color: "#fdfbf5", background: "#b08a3e", borderRadius: 999, fontWeight: 800 }}>制覇</span>
                  : ready && onSecBoss ? <button onClick={() => onSecBoss({ bank: b, region: g.name })} className="btn-danger text-[10px] px-2 py-1">節の守護者</button>
                  : <span className="text-[10px]" style={{ color: "var(--ink-mute)" }}>全話で守護者</span>}
              </div>
            );
          })}
        </div>
      </Box>
    </>
  );
}
function studyGroupHost(state) {
  const joined = alliesJoined(normRpg(state.rpg));
  if (!joined.length) return null;
  const wk = weekKey();
  const n = Math.round(parseLocalDate(wk).getTime() / (7 * 86400000));
  return joined[((n % joined.length) + joined.length) % joined.length];
}
function studyGroupPool(state, a) {
  if (!a) return [];
  const banks = state.questionBanks.filter((b) => a.likes.includes(themeOf(b.name).region) && (b.questions || []).length);
  return buildPoolFromBanks(banks.length ? banks : state.questionBanks, 10);
}
function StudyGroupCard({ state, onStart }) {
  const a = studyGroupHost(state);
  const r = normRpg(state.rpg);
  const sg = r.studyGroup && r.studyGroup.week === weekKey() ? r.studyGroup : null;
  if (!a) return (
    <Box title="仲間の勉強会（週1回）" icon={<Crown size={18} />}>
      <p className="jp text-[11px]" style={{ color: "var(--ink-soft)" }}>地域を解放したり試練の塔を登ったりして仲間が加わると、毎週、仲間が順番に勉強会を開いてくれます。</p>
    </Box>
  );
  const wkEnd = addDays(weekKey(), 6);
  return (
    <Box title="仲間の勉強会（週1回）" icon={<Crown size={18} />}>
      <div className="jp flex items-center gap-3">
        <span style={{ width: 56, height: 56, flexShrink: 0, borderRadius: "50%", border: "2px solid #b08a3e", backgroundColor: "#e9e4d6", backgroundImage: `url(${ART_URL}${a.img})`, backgroundSize: "300% auto", backgroundPosition: `${a.face[0]}% ${a.face[1]}%` }} />
        <div className="flex-1 min-w-0">
          <div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>今週の主催（{Number(wkEnd.slice(5, 7))}/{Number(wkEnd.slice(8, 10))}まで）</div>
          <div className="text-sm" style={{ fontWeight: 800, color: "var(--ink)" }}>{a.name}の勉強会<span className="text-[10px] ml-1" style={{ color: "var(--ink-soft)", fontWeight: 500 }}>{a.role}</span></div>
          <div className="text-[11px]" style={{ color: "var(--ink-soft)" }}>得意分野から10問・7割でクリア</div>
        </div>
      </div>
      <p className="jp text-[11px] mt-2 px-2 py-1.5" style={{ background: "var(--cream)", border: "1px solid var(--rule-soft)", borderRadius: 8, color: "var(--ink)" }}>「{a.cheer}」</p>
      {sg && sg.cleared
        ? <div className="jp text-center text-xs mt-2" style={{ color: "var(--gold)", fontWeight: 800 }}>今週の勉強会はクリアしました（最高 {Math.round(sg.best * 100)}%）。来週は別の仲間が主催します。<button onClick={() => onStart(a.id)} className="btn-ghost text-[10px] px-2 py-1 ml-1">もう一度</button></div>
        : <button onClick={() => onStart(a.id)} className="jp btn-primary w-full py-2 mt-2">勉強会に参加する{sg ? `（最高 ${Math.round(sg.best * 100)}%）` : ""}</button>}
      <p className="jp text-[10px] mt-1" style={{ color: "var(--ink-mute)" }}>クリアすると {a.name}との絆+30・80G・EXP30、特別なせりふが聞けます（週に1回）。</p>
    </Box>
  );
}
function RankMedal({ rk, size = 56, dim = false }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: dim ? "var(--beige)" : `radial-gradient(circle at 35% 30%, #fffdf6, ${rk.color} 75%)`, border: `2px solid ${dim ? "var(--rule-soft)" : rk.color}`, boxShadow: dim ? "none" : `0 0 0 3px rgba(255,255,255,0.7), 0 3px 10px ${rk.color}66`, color: dim ? "var(--ink-mute)" : "#fffdf6", fontSize: size * 0.42, textShadow: dim ? "none" : "0 1px 2px rgba(0,0,0,0.35)" }}>
      {rk.id === "legend" ? "♛" : rk.id === "platinum" ? "◆" : "★"}
    </div>
  );
}
function SeasonCard({ state, actions }) {
  const ym = todayStr().slice(0, 7);
  const sp = seasonPoints(state, ym);
  const r = normRpg(state.rpg);
  const ss = r.season && r.season.month === ym ? r.season : { claimed: [], history: (r.season && r.season.history) || [] };
  const rk = seasonRank(sp.pts);
  const next = SEASON_RANKS.find((k) => k.min > sp.pts);
  const d = parseLocalDate(todayStr());
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const left = lastDay - d.getDate();
  const last = (ss.history || [])[ss.history.length - 1];
  return (
    <Box title={`${Number(ym.slice(5, 7))}月のランク戦`} icon={<Award size={18} />}>
      <div className="jp flex items-center gap-3">
        <RankMedal rk={rk} />
        <div className="flex-1 min-w-0">
          <div className="text-lg" style={{ fontWeight: 800, color: rk.color, fontFamily: "'Shippori Mincho B1', serif" }}>{rk.name}<span className="text-sm ml-2" style={{ color: "var(--ink)" }}>{sp.pts}点</span></div>
          {next ? <>
            <div style={{ height: 6, borderRadius: 3, background: "var(--beige)", overflow: "hidden", margin: "3px 0" }}><div style={{ width: `${((sp.pts - rk.min) / (next.min - rk.min)) * 100}%`, height: "100%", background: `linear-gradient(90deg, ${rk.color}, ${next.color})` }} /></div>
            <div className="text-[11px]" style={{ color: "var(--ink-soft)" }}>{next.name}まで あと{next.min - sp.pts}点 ・ 今月は残り{left}日</div>
          </> : <div className="text-[11px]" style={{ color: "var(--ink-soft)" }}>最高ランクに到達！ 今月は残り{left}日</div>}
        </div>
      </div>
      <div className="jp grid grid-cols-3 gap-2 mt-2">
        {[["回答", `${sp.ans}問`], ["正解", `${sp.ok}問`], ["学習時間", fmtMin(sp.min)]].map(([k, v]) => <div key={k} className="text-center" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 8, padding: "4px 2px" }}><div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>{k}</div><div className="text-sm" style={{ fontWeight: 800 }}>{v}</div></div>)}
      </div>
      <div className="jp mt-2 space-y-1">
        {SEASON_RANKS.slice(1).map((k) => {
          const reached = sp.pts >= k.min, got = ss.claimed.includes(k.id);
          return (
            <div key={k.id} className="flex items-center gap-2 px-2 py-1" style={{ background: reached ? "var(--cream)" : "var(--paper)", border: `1px solid ${reached ? k.color : "var(--rule-soft)"}`, borderRadius: 8 }}>
              <RankMedal rk={k} size={24} dim={!reached} />
              <span className="text-xs w-16" style={{ fontWeight: 800, color: reached ? k.color : "var(--ink-mute)" }}>{k.name}</span>
              <span className="flex-1 text-[10px]" style={{ color: "var(--ink-soft)" }}>{k.min}点 ・ {seasonRewardText(k.reward)}</span>
              {got ? <span className="text-[10px]" style={{ color: "var(--ink-mute)" }}>受取済</span>
                : <button disabled={!reached} onClick={() => actions.claimSeason(k.id)} className="btn-primary text-[10px] px-2 py-1" style={{ opacity: reached ? 1 : 0.4 }}>受け取る</button>}
            </div>
          );
        })}
      </div>
      <p className="jp text-[10px] mt-2" style={{ color: "var(--ink-mute)" }}>点数：1問答えるごとに1点、正解でさらに1点、学習10分ごとに3点。毎月1日に新しい戦いが始まります。{last ? `　先月（${Number(last.month.slice(5, 7))}月）：${(SEASON_RANKS.find((k) => k.id === last.rank) || {}).name}・${last.pts}点` : ""}</p>
    </Box>
  );
}

// ── 論点カルテ：解いたことのある話（論点）のうち、記憶率（いま思い出せる確率）の低い順に5つ ──
const karteCache = new WeakMap();
function topicKarte(state, pp) {
  const c = karteCache.get(state.questionBanks);
  if (c && c.day === todayStr() && c.folders === state.folders) return c.res;
  const sch = getFsrsScheduler(state.srSettings);
  const now = new Date();
  const out = [];
  pp.regions.filter((g) => g.total > 0).forEach((g) => {
    const keys = regionQuests(g).map((q) => q.key);
    regionQuests(g).forEach((q) => {
      const qs = q.qs.filter((x) => !x.excluded);
      const seen = qs.filter((x) => x.fs || x.sr_nextReview);
      if (qs.length === 0 || seen.length < Math.max(3, Math.ceil(qs.length * 0.5))) return; // まだ半分も解いていない論点は対象外
      let sumR = 0;
      seen.forEach((x) => { let r = 0; try { r = sch.get_retrievability(toFsrsCard(x, now), now, false); } catch (e) { r = 0; } sumR += r >= 0 && r <= 1 ? r : 0; });
      const avgR = sumR / seen.length;
      const weak = qs.filter((x) => isQuestionWeak(x)).length;
      out.push({ q, g, keys, avgR, weak, n: qs.length, score: avgR - (weak / qs.length) * 0.3 });
    });
  });
  const res = out.sort((a, b) => a.score - b.score).slice(0, 5);
  karteCache.set(state.questionBanks, { day: todayStr(), folders: state.folders, res });
  return res;
}
function TopicKarte({ state, pp, onStart }) {
  const list = topicKarte(state, pp);
  const [laws, setLaws] = useState({});
  useEffect(() => {
    let alive = true;
    list.forEach(({ q }) => { const t = questTopic(q); if (t && !(t.law in laws)) loadLaw(t.law).then((d) => { if (alive) setLaws((p) => ({ ...p, [t.law]: d })); }); });
    return () => { alive = false; };
  }, [list.length]);
  return (
    <Box title="論点カルテ（弱点トップ5）" icon={<Search size={18} />}>
      {list.length === 0 ? <p className="jp text-xs" style={{ color: "var(--ink-mute)" }}>論点の半分以上を解くと、ここに弱い論点が並びます。</p> : (
        <div className="space-y-1.5">
          {list.map((k, i) => (
            <div key={k.q.key} className="jp flex items-center gap-2 px-2 py-2" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 8 }}>
              <span style={{ width: 22, height: 22, flexShrink: 0, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, background: i === 0 ? "#a24a45" : "var(--cream)", color: i === 0 ? "#fdfbf5" : "var(--ink-soft)", border: "1px solid var(--rule-soft)" }}>{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate" style={{ fontWeight: 800, color: "var(--ink)" }}>{questTitle(k.q, laws)}</div>
                <div className="text-[10px] truncate" style={{ color: "var(--ink-mute)" }}>{k.g.name} ・ {k.q.bank.name} 第{k.q.idx + 1}話 ・ 手強い魔物 {k.weak}/{k.n}</div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px]" style={{ color: "var(--ink-soft)", whiteSpace: "nowrap" }}>記憶率</span>
                  <span className="flex-1" style={{ height: 5, borderRadius: 3, background: "var(--beige)", overflow: "hidden" }}><span className="block" style={{ width: `${k.avgR * 100}%`, height: "100%", background: k.avgR < 0.6 ? "#c9564e" : k.avgR < PASS_LINE ? "#d6b56a" : "#4f8a72" }} /></span>
                  <span className="text-[10px]" style={{ color: "var(--ink)", fontWeight: 700 }}>{Math.round(k.avgR * 100)}%</span>
                </div>
              </div>
              <button onClick={() => onStart({ quest: k.q, region: k.g.name, mat: k.g.th.mat, regionKeys: k.keys })} className="btn-danger text-[11px] px-2 py-1.5 flex-shrink-0">集中攻撃</button>
            </div>
          ))}
        </div>
      )}
      <p className="jp text-[10px] mt-2" style={{ color: "var(--ink-mute)" }}>記憶率は、その論点の解いたことのある問題について、いま思い出せる確率の平均です。「集中攻撃」で、その論点（ストーリーの話）にもう一度挑めます。</p>
    </Box>
  );
}

// ストーリーの進み（クリアした話の数）で、魔物の攻撃が強くなる：1話ごとに8%、40話で4.2倍まで
const QUEST_GROW = 0.08, QUEST_GROW_MAX = 40;
const questDmgMul = (r) => 1 + QUEST_GROW * Math.min(QUEST_GROW_MAX, storyClears(r));
// ストーリークエストの戦い（1話）。最後の1問は「論点の主」。HPが0になるとクエスト失敗
function QuestRun({ state, run, actions, recordAnswer, startTimer, stopTimer, onExit, onNext }) {
  const pool = run.quest.qs.filter((q) => !q.excluded);
  const [battleKey] = useState(() => uid());
  const [mul] = useState(() => questDmgMul(normRpg(state.rpg)));
  useEffect(() => { BATTLE.noRevive = true; BATTLE.dmgMul = mul; return () => { BATTLE.noRevive = false; BATTLE.dmgMul = 1; }; }, [battleKey]);
  const est = Math.round(14 * mul * (1 - getRpgBonuses(state).dmgCutPct / 100)); // 1問のミスで受けるおよそのダメージ
  const [laws, setLaws] = useState({});
  useEffect(() => { const t = questTopic(run.quest); if (t) loadLaw(t.law).then((d) => setLaws((p) => ({ ...p, [t.law]: d }))); }, []);
  const title = questTitle(run.quest, laws);
  const [idx, setIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [res, setRes] = useState([]);
  const [done, setDone] = useState(null);
  const timerStartedByMe = useRef(false);
  const finished = useRef(false);
  useEffect(() => {
    if (!state.timer.startMs) { startTimer(run.quest.bank.qualId || null, "qa"); timerStartedByMe.current = true; }
    return () => { if (timerStartedByMe.current) { stopTimer(); timerStartedByMe.current = false; } };
  }, []);
  const finish = (list) => {
    if (finished.current) return;
    finished.current = true;
    if (timerStartedByMe.current) { stopTimer(); timerStartedByMe.current = false; }
    const acc = pool.length ? list.filter((x) => x).length / pool.length : 1;
    const out = actions.storyQuestFinish({ key: run.quest.key, acc, n: pool.length, mat: run.mat, region: run.region, regionKeys: run.regionKeys });
    setDone({ acc, stars: sqStarsOf(acc), ...out });
  };
  useEffect(() => { if (pool.length === 0) finish([]); }, []);
  const bank = state.questionBanks.find((b) => b.id === run.quest.bank.id) || run.quest.bank;
  const cur = pool[idx];
  const q = cur ? (bank.questions || []).find((x) => x.id === cur.id) || cur : null;
  const answer = (correct, meta) => {
    if (!q || done || finished.current) return;
    recordAnswer(bank.id, q.id, correct, meta);
    const list = [...res, correct];
    setRes(list);
    setShowAnswer(false);
    // HPが尽きたらクエスト失敗（クエストの記録は残さない。解いた問題の復習記録は残る）
    if (BATTLE.down) {
      finished.current = true;
      if (timerStartedByMe.current) { stopTimer(); timerStartedByMe.current = false; }
      setTimeout(() => setDone({ failed: true, acc: list.filter((x) => x).length / pool.length, stars: 0, at: list.length }), 1500);
      return;
    }
    if (idx + 1 >= pool.length) finish(list); else setIdx(idx + 1);
  };
  if (done && done.failed) return (
    <Box title="クエスト失敗……" icon={<Skull size={18} />}>
      <div className="jp text-center py-2 space-y-1">
        <div className="text-[11px]" style={{ color: "var(--ink-mute)" }}>{bank.name} ・ 第{run.quest.idx + 1}話</div>
        <div style={{ fontFamily: "'Shippori Mincho B1', serif", fontWeight: 800, fontSize: 17, color: "var(--ink)" }}>{title}</div>
        <div style={{ fontFamily: "'Shippori Mincho B1', serif", fontWeight: 900, fontSize: 22, color: "var(--brick)" }}>{HERO_NAME}は力尽きた……</div>
        <div className="text-sm" style={{ color: "var(--ink)" }}>{done.at} / {pool.length}問目で体力が尽きました。</div>
        <div className="text-[12px]" style={{ color: "var(--ink-soft)", lineHeight: 1.7 }}>魔物の攻撃力は ×{mul.toFixed(2)}（ストーリー{storyClears(normRpg(state.rpg))}話ぶん）。1問のミスで約{est}のダメージです。<br />まちがえた問題を復習するか、防具・回復役の仲間（パーティ編成）で守りを固めて、もう一度挑みましょう。</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onExit} className="jp btn-ghost py-2">地図に戻る</button>
        <button onClick={() => onNext(run.quest.key)} className="jp btn-primary py-2">もう一度挑む</button>
      </div>
    </Box>
  );
  if (done) {
    const ok = done.stars >= 1;
    return (
      <Box title={ok ? "クエストクリア！" : "撤退……"} icon={<Award size={18} />}>
        <BattleResult state={state} battleKey={battleKey} />
        <div className="jp text-center py-2">
          <div className="text-[11px]" style={{ color: "var(--ink-mute)" }}>{bank.name} ・ 第{run.quest.idx + 1}話</div>
          <div style={{ fontFamily: "'Shippori Mincho B1', serif", fontWeight: 800, fontSize: 17, color: "var(--ink)" }}>{title}</div>
          <div style={{ fontSize: 34, fontWeight: 800, color: ok ? "var(--gold)" : "var(--brick)", fontFamily: "'Cinzel', serif" }}>{Math.round(done.acc * 100)}%</div>
          <div style={{ fontSize: 24, letterSpacing: 4, color: "#d6b56a" }}>{"★".repeat(done.stars)}<span style={{ color: "var(--rule-soft)" }}>{"★".repeat(3 - done.stars)}</span></div>
          <div className="text-sm mt-1" style={{ fontWeight: 700, color: ok ? "var(--ink)" : "var(--brick)" }}>{ok ? (done.first ? "地図に新しい土地が描かれた！ 次の話が開きました。" : done.better ? "★の記録を更新しました！" : "クリアしました。") : `正答率${Math.round(SQ_CLEAR * 100)}%でクリアです。手強い魔物を復習して、もう一度挑みましょう。`}</div>
          {done.msg && <div className="text-xs mt-1" style={{ color: "var(--gold)", fontWeight: 700 }}>{done.msg}</div>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onExit} className="jp btn-ghost py-2">地図に戻る</button>
          {ok ? <button onClick={onNext} className="jp btn-primary py-2">次の話へ進む</button>
            : <button onClick={() => onNext(run.quest.key)} className="jp btn-primary py-2">もう一度挑む</button>}
        </div>
      </Box>
    );
  }
  if (!q) return null;
  const isBoss = idx === pool.length - 1 && pool.length > 1;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between jp text-xs">
        <button onClick={() => { if (confirm("このクエストから撤退しますか？（クエストの記録は残りませんが、解いた問題の復習記録は残ります）")) onExit(); }} className="flex items-center gap-1" style={{ color: "var(--ink-soft)" }}><XIcon size={14} /> 撤退</button>
        <span style={{ color: "var(--ink-soft)", fontWeight: 700 }}>第{run.quest.idx + 1}話 ・ {idx + 1}/{pool.length}</span>
      </div>
      <div className="jp text-center" style={{ fontFamily: "'Shippori Mincho B1', serif", fontWeight: 800, color: "var(--ink)" }}>{title}</div>
      <div className="flex gap-1">{pool.map((_, i) => <span key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i < res.length ? (res[i] ? "#d6b56a" : "#e0948a") : i === idx ? "var(--sky-deep)" : "var(--beige)" }} />)}</div>
      <div className="jp text-center text-[11px]" style={{ color: mul >= 2 ? "var(--brick)" : "var(--ink-soft)", fontWeight: 700 }}>⚔ 魔物の攻撃力 ×{mul.toFixed(2)}　1問のミスで約{est}ダメージ　HPが0でクエスト失敗{BATTLE.key === battleKey && BATTLE.hp > 0 ? `（あと約${Math.max(1, Math.ceil(BATTLE.hp / est))}回まちがえると力尽きる）` : ""}</div>
      {isBoss && <div className="jp text-center text-sm" style={{ color: "var(--brick)", fontWeight: 800, animation: "sqFadeIn .4s ease-out" }}>― 論点の主があらわれた！ ―</div>}
      <BattleStage state={state} q={q} bankName={bank.name} battleKey={battleKey} boss={isBoss} />
      <div className="rpg-box p-1">
        <div className="rpg-inner-border min-h-[180px] flex flex-col">
          <div className="qtext jp text-base md:text-lg flex-1 break-words" style={{ color: "var(--ink)" }}>{renderQText(q.q, q.q_formats, q.a)}</div>
          <QuestionImages bankId={bank.id} question={q} side="q" />
          {showAnswer ? (
            <>
              <div className="jp text-[10px] mt-3 mb-1" style={{ color: "var(--gold)" }}>答え</div>
              <div className="qtext jp text-base md:text-lg break-words p-2" style={{ background: "var(--sky-pale)", border: "1px solid var(--gold)", color: "var(--ink)" }}>{renderFormattedText(q.a, q.a_formats)}</div>
              <QuestionImages bankId={bank.id} question={q} side="a" />
              <LawRefChips q={q} />
              <AnswerPanel onAnswer={answer} question={q} srSettings={effectiveSr(state)} />
            </>
          ) : (
            <RevealButton q={q} onReveal={() => setShowAnswer(true)} />
          )}
        </div>
      </div>
    </div>
  );
}
// 塔の4つの区域（絵は public/art/tower/zone1〜4.jpg）と10の層の景色（layer01〜10.jpg）
const TOWER_ZONES = [{ at: 1, name: "試練のはじまり", range: "1〜24階" }, { at: 25, name: "下層の間", range: "25〜49階" }, { at: 50, name: "中層の間", range: "50〜74階" }, { at: 75, name: "天空の間", range: "75〜100階" }];
const towerZone = (f) => TOWER_ZONES.reduce((k, z, i) => (f >= z.at ? i : k), 0);
const towerSceneUrl = (f) => `${ART_URL}tower/zone${towerZone(f) + 1}.jpg`;
const towerNewCount = (f) => (isCheckpoint(f) ? 0 : f === 1 ? 10 : 8);
const towerStart = (f) => { let n = 0; for (let i = 1; i < f; i++) n += towerNewCount(i); return n; };
// 塔に並べる問題の順番：科目（地域）ごとの出題順を、問題数に比例して交互に混ぜる
const towerSeqCache = new WeakMap();
function towerSeq(state, pp) {
  const c = towerSeqCache.get(state.questionBanks);
  if (c && c.folders === state.folders && c.pp === pp) return c.seq;
  const regs = pp.regions.filter((g) => g.total > 0).sort(byRegionOrder);
  const lists = regs.map((g) => g.banks.flatMap((b) => (b.questions || []).filter((q) => !q.excluded).map((q) => ({ bankId: b.id, bankName: b.name, qId: q.id }))));
  const idx = lists.map(() => 0);
  const total = lists.reduce((a, l) => a + l.length, 0);
  const seq = [];
  while (seq.length < total) {
    let best = -1, bestV = Infinity;
    lists.forEach((l, k) => { if (idx[k] < l.length) { const v = (idx[k] + 1) / l.length; if (v < bestV) { bestV = v; best = k; } } });
    seq.push(lists[best][idx[best]++]);
  }
  towerSeqCache.set(state.questionBanks, { folders: state.folders, pp, seq });
  return seq;
}
// 問題の「弱さ」：苦手・想起率の低さ（復習の出題で優先する）
function weaknessOf(state, it) {
  const b = state.questionBanks.find((x) => x.id === it.bankId);
  const q = b && (b.questions || []).find((x) => x.id === it.qId);
  if (!q) return 0;
  let r = 0;
  try { if (q.fs || q.sr_nextReview) r = getFsrsScheduler(state.srSettings).get_retrievability(toFsrsCard(q, new Date()), new Date(), false); } catch (e) { r = 0; }
  return (isQuestionWeak(q) ? 1 : 0) + (1 - (r >= 0 && r <= 1 ? r : 0));
}
// その階の出題：ふつうの階＝新しい8問＋下の階から2問（弱い問題を優先）。10の倍数の階＝直前9階からの総復習15問
function towerFloorPool(state, pp, f) {
  const seq = towerSeq(state, pp);
  const s0 = towerStart(f);
  if (isCheckpoint(f)) {
    const lo = towerStart(f - 9), hi = s0;
    const range = seq.slice(lo, hi);
    return shuffleArr([...range].sort((a, b) => weaknessOf(state, b) - weaknessOf(state, a)).slice(0, 15));
  }
  const fresh = seq.slice(s0, s0 + towerNewCount(f));
  const past = seq.slice(0, s0);
  const need = 10 - fresh.length;
  const review = need > 0 && past.length ? shuffleArr(past).slice(0, Math.min(past.length, 60)).sort((a, b) => weaknessOf(state, b) - weaknessOf(state, a)).slice(0, need) : [];
  return shuffleArr([...fresh, ...review]);
}

function TowerView({ state, pp, onStart }) {
  const r = normRpg(state.rpg);
  const tw = r.tower || { floor: 0, best: {} };
  const next = Math.min(TOWER_MAX, (tw.floor || 0) + 1);
  const done = (tw.floor || 0) >= TOWER_MAX;
  const seqLen = towerSeq(state, pp).length;
  const layerStart = Math.floor((next - 1) / 10) * 10 + 1;
  const floors = Array.from({ length: 10 }, (_, k) => layerStart + 9 - k);
  const th = BATTLE_THEME[(state.displaySettings && state.displaySettings.theme) || "white"] || BATTLE_THEME.white;
  const cp = isCheckpoint(next);
  return (
    <Box title="試練の塔" icon={<Castle size={18} />}>
      {!(tw.floor > 0) ? (
        <div className="relative overflow-hidden mb-3" style={{ borderRadius: 8, height: 130, border: "1px solid #b08a3e" }}>
          <img src={`${ART_URL}academy.jpg`} alt="王立魔法学院都市" className="w-full h-full" style={{ objectFit: "cover", objectPosition: "center 30%" }} />
          <div className="absolute inset-x-0 bottom-0 px-3 py-1 jp text-xs" style={{ background: "linear-gradient(0deg, rgba(253,251,245,0.95), rgba(253,251,245,0))", color: "#22335c", fontWeight: 800 }}>王立魔法学院の試練の塔 ― 100の階層に挑む、君の成長の証</div>
        </div>
      ) : (
        <div className="flex gap-2 mb-3" style={{ height: 140 }}>
          {/* 塔の絵：いまいる高さのあたりを映す */}
          <div className="relative overflow-hidden flex-shrink-0" style={{ width: 92, borderRadius: 8, border: "1px solid #b08a3e", background: `url(${ART_URL}tower/tower.jpg) center ${Math.round(100 - ((tw.floor || 0) / TOWER_MAX) * 100)}%/cover no-repeat` }}>
            <div className="absolute jp text-[10px] px-1.5" style={{ left: 4, top: "46%", background: "rgba(34,51,92,0.85)", color: "#fdfbf5", borderRadius: 4, fontWeight: 800 }}>▶ {next}F</div>
          </div>
          {/* 区域の景色 */}
          <div className="relative overflow-hidden flex-1" style={{ borderRadius: 8, border: "1px solid #b08a3e", background: `url(${towerSceneUrl(next)}) center/cover no-repeat` }}>
            <div className="absolute left-0 top-0 jp text-[11px] px-2 py-0.5" style={{ background: "rgba(34,51,92,0.82)", color: "#fdfbf5", borderBottomRightRadius: 8, fontWeight: 800 }}>{TOWER_ZONES[towerZone(next)].name}（{TOWER_ZONES[towerZone(next)].range}）</div>
            <div className="absolute inset-x-0 bottom-0 px-2 py-1 jp text-[11px]" style={{ background: "linear-gradient(0deg, rgba(253,251,245,0.95), rgba(253,251,245,0))", color: "#22335c", fontWeight: 800 }}>{done ? "塔の頂 ― 100の階層を越えた" : `いまの層：${towerLayer(next)}`}</div>
          </div>
        </div>
      )}
      <div className="jp flex items-baseline justify-between mb-1">
        <span style={{ fontFamily: "'Shippori Mincho B1', serif", fontWeight: 800, fontSize: 18, color: "var(--ink)" }}>{done ? "塔の頂に到達" : `第${next}階　${towerLayer(next)}`}</span>
        <span className="text-[11px]" style={{ color: "var(--ink-soft)" }}>突破 {tw.floor || 0} / {TOWER_MAX}階</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: "var(--beige)", overflow: "hidden", marginBottom: 10 }}><div style={{ width: `${((tw.floor || 0) / TOWER_MAX) * 100}%`, height: "100%", background: "linear-gradient(90deg, #8c79c8, #d6b56a)" }} /></div>
      <div className="grid grid-cols-5 gap-1 mb-3">
        {TOWER_LAYERS.map((name, k) => {
          const st0 = k * 10 + 1, reached = (tw.floor || 0) >= st0 - 1, cur = next >= st0 && next <= st0 + 9 && !done, clear = (tw.floor || 0) >= st0 + 9;
          return (
            <div key={name} className="relative overflow-hidden jp" title={`${st0}〜${st0 + 9}階　${name}`} style={{ height: 46, borderRadius: 6, border: `${cur ? 2 : 1}px solid ${cur ? "#b08a3e" : "var(--rule-soft)"}`, background: `url(${ART_URL}tower/layer${String(k + 1).padStart(2, "0")}.jpg) center/cover no-repeat`, filter: reached ? undefined : "grayscale(1) brightness(0.55)", opacity: reached ? 1 : 0.7 }}>
              <div className="absolute inset-x-0 bottom-0 text-center text-[8px]" style={{ background: "rgba(20,28,50,0.65)", color: "#fdfbf5", fontWeight: 700, lineHeight: 1.5 }}>{st0}〜{st0 + 9}F{clear ? " ✓" : ""}</div>
              {!reached && <div className="absolute inset-0 flex items-center justify-center text-sm" style={{ color: "#fdfbf5" }}>🔒</div>}
            </div>
          );
        })}
      </div>
      <div className="flex gap-3">
        {/* いまの層の10階分 */}
        <div className="flex-shrink-0" style={{ width: 110 }}>
          <div style={{ width: 0, height: 0, margin: "0 auto", borderLeft: "40px solid transparent", borderRight: "40px solid transparent", borderBottom: "22px solid #3d2f55" }} />
          {floors.map((f) => {
            const cleared = f <= (tw.floor || 0), cur = f === next && !done, chk = isCheckpoint(f);
            return (
              <div key={f} className="jp relative flex items-center justify-between px-2" style={{ height: 22, margin: "0 6px", background: cleared ? "linear-gradient(90deg, #e9cf8e, #d6b56a)" : cur ? "#5a4a80" : "#3d2f55", borderLeft: "2px solid #22335c", borderRight: "2px solid #22335c", borderBottom: "1px solid rgba(0,0,0,0.25)", color: cleared ? "#5f3f1f" : "#e4dcf6", fontSize: 10, fontWeight: 800 }}>
                <span>{f}階</span>
                <span>{chk ? "◆" : cleared ? "✓" : ""}</span>
                {cur && <span style={{ position: "absolute", right: -26, top: -3, width: 26, height: 26, borderRadius: "50%", border: "2px solid #b08a3e", backgroundColor: "#e9e4d6", backgroundImage: `url(${th.avatar})`, backgroundSize: "300% auto", backgroundPosition: `${th.face[0]}% ${th.face[1]}%`, animation: "sqbIdle 1.6s ease-in-out infinite" }} />}
              </div>
            );
          })}
          <div style={{ height: 10, margin: "0 2px", background: "#22335c", borderRadius: "0 0 3px 3px" }} />
        </div>
        <div className="flex-1 min-w-0 jp">
          {done ? (
            <p className="text-sm" style={{ color: "var(--gold)", fontWeight: 800 }}>100階すべてを突破しました！ 試練の塔の頂から、国じゅうが見渡せます。各階には何度でも挑み直せます。</p>
          ) : (<>
            <div className="text-[11px]" style={{ color: cp ? "var(--brick)" : "var(--ink-soft)", fontWeight: 700 }}>{cp ? `試練の間 ― ${towerLayer(next)}の番人` : "ふつうの階"}</div>
            <div className="text-sm mt-0.5" style={{ color: "var(--ink)", fontWeight: 800 }}>{cp ? `第${next - 9}〜${next - 1}階の総復習 15問` : next === 1 ? "新しい問題 10問" : "新しい問題 8問 ＋ 下の階から 2問"}</div>
            <div className="text-[11px] mt-0.5" style={{ color: "var(--ink-soft)" }}>正答率{Math.round(TOWER_PASS * 100)}%で突破。{cp ? "番人を倒さないと、上の層へは進めません。" : "下の階の問題は、苦手なものほど出やすくなります。"}</div>
            {tw.best && tw.best[next] != null && <div className="text-[11px]" style={{ color: "var(--ink-mute)" }}>この階の最高：{Math.round(tw.best[next] * 100)}%</div>}
            <button onClick={() => { const pool = towerFloorPool(state, pp, next); if (pool.length) onStart({ floor: next, pool }); }} disabled={seqLen === 0} className={`jp w-full py-2.5 mt-3 text-base ${cp ? "btn-danger" : "btn-primary"}`}>{cp ? `試練の間に挑む（第${next}階）` : `第${next}階に挑む`}</button>
            {towerStart(next) >= seqLen && !cp && seqLen > 0 && <p className="text-[10px] mt-1" style={{ color: "var(--ink-mute)" }}>新しい問題を使い切ったので、この先の階は下の階の総復習になります。</p>}
          </>)}
          <p className="text-[10px] mt-3" style={{ color: "var(--ink-mute)" }}>10階ごとに層が変わり、最上階の試練の間には番人が待っています。報酬：各階の初突破でゴールドと欠片、試練の間で星霊石、50階・100階で賢者の結晶。</p>
        </div>
      </div>
    </Box>
  );
}

// 一定の正答率で突破する戦い（試練の塔の階・節の守護者）。最後の1問（または全問）はボスの見た目
function TrialRun({ state, run, recordAnswer, startTimer, stopTimer, onExit, onFinish, onNext, nextLabel }) {
  const pool = run.pool;
  const [battleKey] = useState(() => uid());
  const [idx, setIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [res, setRes] = useState([]);
  const [done, setDone] = useState(null);
  const timerStartedByMe = useRef(false);
  const finished = useRef(false);
  useEffect(() => {
    if (!state.timer.startMs) { startTimer(null, "qa"); timerStartedByMe.current = true; }
    return () => { if (timerStartedByMe.current) { stopTimer(); timerStartedByMe.current = false; } };
  }, []);
  const finish = (list) => {
    if (finished.current) return;
    finished.current = true;
    if (timerStartedByMe.current) { stopTimer(); timerStartedByMe.current = false; }
    const acc = pool.length ? list.filter((x) => x).length / pool.length : 0;
    const out = onFinish(acc) || {};
    setDone({ acc, passed: acc >= run.pass, ...out });
  };
  const item = pool[idx];
  const bank = item ? state.questionBanks.find((b) => b.id === item.bankId) : null;
  const q = bank ? (bank.questions || []).find((x) => x.id === item.qId) : null;
  useEffect(() => { if (item && !q && !done) { const list = [...res, false]; setRes(list); if (idx + 1 >= pool.length) finish(list); else setIdx(idx + 1); } }, [idx, !!q]);
  const answer = (correct, meta) => {
    if (!q || done) return;
    recordAnswer(bank.id, q.id, correct, meta);
    const list = [...res, correct];
    setRes(list);
    setShowAnswer(false);
    if (idx + 1 >= pool.length) finish(list); else setIdx(idx + 1);
  };
  if (done) {
    return (
      <Box title={done.passed ? `${run.kind}突破！` : "あと一歩……"} icon={<Award size={18} />}>
        <BattleResult state={state} battleKey={battleKey} />
        <div className="jp text-center py-2">
          <div style={{ fontFamily: "'Shippori Mincho B1', serif", fontWeight: 800, fontSize: 17, color: "var(--ink)" }}>{run.title}</div>
          <div style={{ fontSize: 34, fontWeight: 800, color: done.passed ? "var(--gold)" : "var(--brick)", fontFamily: "'Cinzel', serif" }}>{Math.round(done.acc * 100)}%</div>
          <div className="text-sm" style={{ fontWeight: 700, color: done.passed ? "var(--ink)" : "var(--brick)" }}>{done.passed ? (done.headline || "突破しました！") : `正答率${Math.round(run.pass * 100)}%で突破です。まちがえた問題を復習して、もう一度挑みましょう。`}</div>
          {done.msg && <div className="text-xs mt-1" style={{ color: "var(--gold)", fontWeight: 700 }}>{done.msg}</div>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onExit} className="jp btn-ghost py-2">もどる</button>
          {done.passed && onNext ? <button onClick={onNext} className="jp btn-primary py-2">{nextLabel || "次へ進む"}</button>
            : !done.passed ? <button onClick={() => onNext && onNext(true)} className="jp btn-primary py-2">もう一度挑む</button> : <span />}
        </div>
      </Box>
    );
  }
  if (!q) return null;
  const boss = run.boss === "all" || (run.boss === "last" && idx === pool.length - 1 && pool.length > 1);
  const okSoFar = res.filter((x) => x).length;
  const needOk = Math.ceil(run.pass * pool.length);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between jp text-xs">
        <button onClick={() => { if (confirm("撤退しますか？（解いた問題の復習記録は残ります）")) onExit(); }} className="flex items-center gap-1" style={{ color: "var(--ink-soft)" }}><XIcon size={14} /> 撤退</button>
        <span style={{ color: "var(--ink-soft)", fontWeight: 700 }}>{idx + 1}/{pool.length}問 ・ 正解 {okSoFar}（突破に{needOk}）</span>
      </div>
      <div className="jp text-center" style={{ fontFamily: "'Shippori Mincho B1', serif", fontWeight: 800, color: "var(--ink)" }}>{run.title}</div>
      {run.sub && <div className="jp text-center text-[11px]" style={{ color: "var(--ink-soft)" }}>{run.sub}</div>}
      <div className="flex gap-1">{pool.map((_, i) => <span key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i < res.length ? (res[i] ? "#d6b56a" : "#e0948a") : i === idx ? "var(--sky-deep)" : "var(--beige)" }} />)}</div>
      <BattleStage state={state} q={q} bankName={bank.name} battleKey={battleKey} boss={boss} scene={run.scene} />
      <div className="rpg-box p-1">
        <div className="rpg-inner-border min-h-[180px] flex flex-col">
          <div className="jp text-[10px] mb-2" style={{ color: "var(--ink-mute)" }}>{bank.name}</div>
          <div className="qtext jp text-base md:text-lg flex-1 break-words" style={{ color: "var(--ink)" }}>{renderQText(q.q, q.q_formats, q.a)}</div>
          <QuestionImages bankId={bank.id} question={q} side="q" />
          {showAnswer ? (
            <>
              <div className="jp text-[10px] mt-3 mb-1" style={{ color: "var(--gold)" }}>答え</div>
              <div className="qtext jp text-base md:text-lg break-words p-2" style={{ background: "var(--sky-pale)", border: "1px solid var(--gold)", color: "var(--ink)" }}>{renderFormattedText(q.a, q.a_formats)}</div>
              <QuestionImages bankId={bank.id} question={q} side="a" />
              <LawRefChips q={q} />
              <AnswerPanel onAnswer={answer} question={q} srSettings={effectiveSr(state)} />
            </>
          ) : (
            <RevealButton q={q} onReveal={() => setShowAnswer(true)} />
          )}
        </div>
      </div>
    </div>
  );
}

// 季節の限定ボス（クエストの欄。週替わりボスの下）
function SeasonBossCard({ state, onStart }) {
  const b = seasonBossNow();
  const done = (normRpg(state.rpg).seasonBoss || {})[b.ym];
  const [y, mo] = b.ym.split("-").map(Number);
  const left = daysBetween(todayStr(), localDateStr(new Date(y, mo, 0)));
  return (
    <Box title={`季節の限定ボス　${b.month}月`} icon={<Crown size={18} />}>
      <div className="jp flex items-center gap-3">
        <GameIcon ch={b.icon} id={b.id} art={b.art} size={64} boss />
        <div className="flex-1 min-w-0">
          <div className="text-[14px]" style={{ fontWeight: 800, color: "var(--brick)" }}>{b.icon} {b.name}</div>
          <div className="text-[11px]" style={{ color: "var(--ink-soft)" }}>「{b.line}」</div>
          <div className="text-[10px] mt-0.5" style={{ color: "var(--ink-mute)" }}>{done ? `✓ ${Number(done.slice(5, 7))}/${Number(done.slice(8, 10))} に討伐　称号「${b.title}」を手に入れた` : `今月いっぱい（あと${left}日）。はじめて倒すと限定の称号「${b.title}」・${SEASON_BOSS_REWARD.gold}G・装備`}</div>
        </div>
      </div>
      <button onClick={() => onStart(b)} className="jp btn-danger w-full py-2 mt-2 text-sm">⚔ 挑む（12問）{done ? `　再戦は${SEASON_BOSS_REWARD.again}G` : ""}</button>
    </Box>
  );
}
function WorldView({ state, actions, todayCount, onWeekly, onDungeon, onGuardian, onStory, onTower, onSecBoss, onRehearsal, onStudyGroup, onEndless, onForest, onSeason }) {
  const qual = mainQual(state);
  const linked = qual && state.questionBanks.some((b) => b.qualId === qual.id);
  const pp = passPower(state, linked ? qual.id : null);
  const world = worldOfQual(qual);
  const [sec, setSec] = useState("story"); // story（ストーリー）| tower（試練の塔）| road（地図と仲間）| quest（クエスト）| castle（魔王城）。鍛錬は周回へ移した
  const tabs = [["story", "ストーリー"], ["tower", "試練の塔"], ["road", "地図と仲間"], ["quest", "クエスト"], ["castle", "魔王城"]];
  return (
    <>
      <WorldBanner state={state} world={world} qual={qual} linked={linked} onPick={actions.setActiveQual} />
      <div className="grid grid-cols-5 gap-1 p-1" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 16 }}>
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setSec(id)} className="jp py-1.5 text-[11px] md:text-xs" style={{ borderRadius: 999, border: "none", fontWeight: 700, cursor: "pointer", background: sec === id ? "linear-gradient(180deg, #cfae62, #a8833a)" : "transparent", color: sec === id ? "#fffdf6" : "var(--ink-soft)" }}>{label}</button>
        ))}
      </div>
      {sec === "story" && (<>
        <PartyQuick state={state} actions={actions} regions={pp.regions.filter((g) => g.total > 0).sort(byRegionOrder).map((g) => g.name)} />
        <StoryQuestView state={state} pp={pp} onStart={onStory} actions={actions} onGuardian={onGuardian} onSecBoss={onSecBoss} />
        <TopicKarte state={state} pp={pp} onStart={onStory} />
      </>)}
      {sec === "tower" && (<>
        <PartyQuick state={state} actions={actions} regions={pp.regions.filter((g) => g.total > 0).sort(byRegionOrder).map((g) => g.name)} />
        <TowerView state={state} pp={pp} onStart={onTower} />
      </>)}
      {sec === "road" && (<>
        <PartyCard state={state} actions={actions} />
        <PartyEditor state={state} actions={actions} regions={pp.regions.filter((g) => g.total > 0).sort(byRegionOrder).map((g) => g.name)} />
        <EvolutionGallery state={state} />
        <WorldMap pp={pp} r={normRpg(state.rpg)} onGuardian={onGuardian} />
        <KnowledgeCastle state={state} />
        <JourneyCard state={state} />
        <StoryPanel pp={pp} chapters={worldChapters(world)} onTalk={(i) => { const ch = worldChapters(world)[i]; actions.openTalk({ title: ch.title, lines: [...(world.id === "home" ? (STORY_TALKS[i] || []) : ch.text.split("\n").map((t) => ["hero", t])), ...ALLIES.map((a) => [a.id, a.cheer])] }); }} />
      </>)}
      {sec === "quest" && (<>
        {featOn("season") && <SeasonCard state={state} actions={actions} />}
        {featOn("weekday") && <WeekdayDungeon state={state} />}
        {featOn("errand") && <LumiErrand state={state} actions={actions} />}
        {featOn("studyGroup") && <StudyGroupCard state={state} onStart={onStudyGroup} />}
        {onForest && featOn("forest") && <ForestCard state={state} onStart={onForest} />}
        {onEndless && featOn("endless") && <EndlessCard state={state} onStart={onEndless} />}
        <DailyQuests state={state} actions={actions} todayCount={todayCount} />
        <CategoryQuests state={state} pp={pp} actions={actions} />
        <WeeklyBossCard state={state} pp={pp} onStart={onWeekly} />
        {onSeason && <SeasonBossCard state={state} onStart={onSeason} />}
      </>)}
      {sec === "castle" && (<>
        <FinalBoss state={state} qual={qual} pp={pp} />
        <ExamChance state={state} pp={pp} />
        <RivalCard state={state} pp={pp} qual={qual} />
        <PowerChart state={state} />
        <button onClick={() => actions.openTalk(weeklyReport(state, weekKey()) || { title: "週報", lines: [["hero", "週報は、合格力の記録が1週間分たまると読めるようになります。"], ["hero", "毎日の積み重ねを、来週いっしょにふり返りましょうね。"]] })} className="jp btn-ghost w-full py-2 text-sm">先週の週報を見る</button>
        <button onClick={() => { const ym = todayStr().slice(0, 7); actions.openTalk(monthlyReport(state, prevMonthOf(ym)) || monthlyReport(state, ym) || { title: "月報", lines: [["hero", "月報は、勉強の記録がたまると読めるようになります。"]] }); }} className="jp btn-ghost w-full py-2 text-sm">先月の月報を見る</button>
        <CastleCard state={state} pp={pp} actions={actions} />
        <DungeonCard state={state} pp={pp} onStart={onDungeon} />
      </>)}
    </>
  );
}

// 冒険の世界の帯：いまの世界（星詠みの書で選んだ資格の世界）と、ほかの世界へ渡るボタン
function WorldBanner({ state, world, qual, linked, onPick }) {
  const [open, setOpen] = useState(false);
  const books = starBooks(state).filter((b) => !b.acquired);
  const qualOf = (id) => (state.qualifications || []).find((q) => q.id === id);
  const home = world.id === "home";
  return (
    <div className="jp" style={{ borderRadius: 12, padding: "8px 12px", background: home ? "linear-gradient(90deg, #fdf8ea, #f3ead2)" : "linear-gradient(90deg, #e6f1fb, #dfe6f8)", border: `1px solid ${home ? "#d6b56a" : "#6fa8dc"}` }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 text-left" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink)", padding: 0 }}>
        <span style={{ fontSize: 22 }}>{world.icon}</span>
        <span className="flex-1 min-w-0">
          <span className="block text-[10px]" style={{ color: "var(--ink-mute)", letterSpacing: "0.1em" }}>いまの世界{qual ? `　― ${qual.name}` : ""}</span>
          <span className="block text-[15px] truncate" style={{ fontFamily: "'Shippori Mincho B1', serif", fontWeight: 800 }}>{world.name}<span className="text-[11px] ml-1.5" style={{ color: "var(--ink-soft)", fontWeight: 500 }}>{world.sub}</span></span>
        </span>
        {books.length > 1 && <span className="text-[11px] flex-shrink-0" style={{ color: "var(--ink-soft)" }}>{open ? "▴" : "世界をわたる ▾"}</span>}
      </button>
      {!home && !linked && <div className="text-[11px] mt-1" style={{ color: "#c9564e" }}>この資格に紐付いた問題集がまだありません。問題タブの取り込みで「紐付ける資格」を選ぶと、この世界の地図ができます。</div>}
      {!home && linked && !world.map && <div className="text-[10px] mt-1" style={{ color: "var(--ink-mute)" }}>この世界の地図の絵は準備中です（いまは仮の地図）。主人公のレベル・装備・仲間は、どの世界でも同じです。</div>}
      {open && (
        <div className="mt-2 space-y-1">
          {books.map((b) => { const w = worldOfQual(qualOf(b.id)); const on = qual && qual.id === b.id; return (
            <button key={b.id} onClick={() => { onPick(b.id); setOpen(false); }} className="w-full text-left text-[12px] px-2 py-1 flex items-center gap-2" style={{ borderRadius: 8, border: `1px solid ${on ? "var(--gold)" : "var(--rule-soft)"}`, background: on ? "var(--cream)" : "var(--paper)", color: "var(--ink)", cursor: "pointer" }}>
              <span>{w.icon}</span><span className="flex-1 truncate" style={{ fontWeight: 700 }}>{w.name}</span><span className="text-[10px]" style={{ color: "var(--ink-mute)" }}>{b.name}</span>
            </button>
          ); })}
        </div>
      )}
    </div>
  );
}

// ── 冒険タブ ──
function AdventureTab({ state, actions, recordAnswer, startTimer, stopTimer, todayCount = 0 }) {
  const r = normRpg(state.rpg);
  const bonus = getRpgBonuses(state);
  const boss = getNextBoss(r);
  const [battle, setBattle] = useState(null);       // { boss, pool }
  const [dungeon, setDungeon] = useState(null);     // { pool, minutes }（模試の塔）
  const [rehearsal, setRehearsal] = useState(null); // { pool, full, minutes }（本番リハーサル）
  const [storyRun, setStoryRun] = useState(null);   // { quest, title, region, mat, regionKeys }（ストーリークエスト）
  const [towerRun, setTowerRun] = useState(null);   // { floor, pool, n }（試練の塔）
  const [secRun, setSecRun] = useState(null);       // { bank, region, pool, n }（節の守護者）
  const [groupRun, setGroupRun] = useState(null);   // { allyId, pool, n }（仲間の勉強会）
  const [endless, setEndless] = useState(0);        // 無限回廊（数が変わるたびに最初から）
  const [slotOpen, setSlotOpen] = useState(null);   // 装備を選んでいるスロット
  const [qualId, setQualId] = useState("all");
  const [msg, setMsg] = useState("");
  const [view, setView] = useState("world"); // world（世界）| base（拠点・ボス）| skill | forge | dex
  const [charPick, setCharPick] = useState(false); // 拠点のキャラを選ぶ
  const [allyTrial, setAllyTrial] = useState(null); // 仲間の試練 { allyId, pool, n }
  const [forest, setForest] = useState(0); // 迷いの森（数が変わるたびに最初から）
  const stRef = useRef(state); stRef.current = state;
  useEffect(() => {
    const f = (e) => { const a = allyById(e.detail && e.detail.allyId); if (!a) return; const pool = allyTrialPool(stRef.current, a); if (pool.length) { setAllyTrial({ allyId: a.id, pool }); window.scrollTo(0, 0); } };
    window.addEventListener("sq-ally-trial", f);
    return () => window.removeEventListener("sq-ally-trial", f);
  }, []);

  if (forest) return <ForestRun key={`f${forest}`} state={state} actions={actions} recordAnswer={recordAnswer} startTimer={startTimer} stopTimer={stopTimer} onExit={() => setForest(0)} />;
  if (allyTrial) {
    const a = allyById(allyTrial.allyId);
    return <TrialRun key={`at-${a.id}-${allyTrial.n || 0}`} state={state} recordAnswer={recordAnswer} startTimer={startTimer} stopTimer={stopTimer}
      run={{ kind: "仲間の試練", title: `${a.name}の試練`, sub: `${a.name}「あなたの力を見せてください」　${ALLY_TRIAL_N}問中${Math.round(ALLY_TRIAL_N * ALLY_TRIAL_PASS)}問正解で仲間に`, pool: allyTrial.pool, pass: ALLY_TRIAL_PASS, boss: "last" }}
      onFinish={(acc) => actions.allyTrialFinish({ allyId: a.id, acc })}
      onExit={() => setAllyTrial(null)} nextLabel="もどる"
      onNext={(retry) => { if (retry === true) setAllyTrial({ ...allyTrial, pool: allyTrialPool(state, a), n: (allyTrial.n || 0) + 1 }); else setAllyTrial(null); }} />;
  }
  if (endless) return <EndlessRun key={`e${endless}`} state={state} actions={actions} recordAnswer={recordAnswer} startTimer={startTimer} stopTimer={stopTimer} onExit={() => setEndless(0)} />;
  if (groupRun) {
    const a = allyById(groupRun.allyId);
    return <TrialRun key={`g-${groupRun.n || 0}`} state={state} recordAnswer={recordAnswer} startTimer={startTimer} stopTimer={stopTimer}
      run={{ kind: "仲間の勉強会", title: `${a.name}の勉強会`, sub: `得意分野：${a.likeText}　7割でクリア`, pool: groupRun.pool, pass: STUDY_GROUP_PASS, boss: "last" }}
      onFinish={(acc) => actions.studyGroupFinish({ allyId: groupRun.allyId, acc })}
      onExit={() => setGroupRun(null)} nextLabel="クエストにもどる"
      onNext={(retry) => { if (retry === true) setGroupRun({ ...groupRun, pool: studyGroupPool(state, a), n: (groupRun.n || 0) + 1 }); else setGroupRun(null); }} />;
  }
  if (secRun) {
    const b = secRun.bank;
    return <TrialRun key={`${b.id}-${secRun.n || 0}`} state={state} recordAnswer={recordAnswer} startTimer={startTimer} stopTimer={stopTimer}
      run={{ kind: "節の守護者", title: `節の守護者 ―「${b.name}」`, sub: `${secRun.region}　この節の総まとめ（苦手な問題を優先）`, pool: secRun.pool, pass: SEC_PASS, boss: "all" }}
      onFinish={(acc) => actions.secBossFinish({ bankId: b.id, bankName: b.name, region: secRun.region, acc })}
      onExit={() => setSecRun(null)} nextLabel="地図にもどる"
      onNext={(retry) => { if (retry === true) setSecRun({ ...secRun, pool: buildPoolFromBanks([state.questionBanks.find((x) => x.id === b.id) || b], 15), n: (secRun.n || 0) + 1 }); else setSecRun(null); }} />;
  }
  if (towerRun) {
    const ppT = (() => { const qual = mainQual(state); const linked = qual && state.questionBanks.some((b) => b.qualId === qual.id); return passPower(state, linked ? qual.id : null); })();
    const f = towerRun.floor;
    const cp = isCheckpoint(f);
    return <TrialRun key={`${f}-${towerRun.n || 0}`} state={state} recordAnswer={recordAnswer} startTimer={startTimer} stopTimer={stopTimer}
      run={{ kind: cp ? "試練の間" : `第${f}階`, title: cp ? `第${f}階　試練の間 ― ${towerLayer(f)}の番人` : `試練の塔　第${f}階　${towerLayer(f)}`, sub: cp ? `第${f - 9}〜${f - 1}階の総復習` : null, pool: towerRun.pool, pass: TOWER_PASS, boss: cp ? "all" : "last", scene: towerSceneUrl(f) }}
      onFinish={(acc) => actions.towerFinish({ floor: f, acc })}
      onExit={() => setTowerRun(null)}
      nextLabel={f < TOWER_MAX ? `第${f + 1}階へ` : "塔をおりる"}
      onNext={(retry) => {
        const nf = retry === true ? f : Math.min(TOWER_MAX, f + 1);
        if (retry !== true && f >= TOWER_MAX) { setTowerRun(null); return; }
        setTowerRun({ floor: nf, pool: towerFloorPool(state, ppT, nf), n: (towerRun.n || 0) + 1 });
      }} />;
  }
  if (storyRun) {
    // 次の話へ：同じ地域で、開いていてまだクリアしていない最初の話（retryKey があれば同じ話をもう一度）
    const goNext = (retryKey) => {
      const qual = mainQual(state);
      const linked = qual && state.questionBanks.some((b) => b.qualId === qual.id);
      const g = passPower(state, linked ? qual.id : null).regions.find((x) => x.name === storyRun.region);
      const qs = g ? regionQuests(g) : [];
      const rr = normRpg(state.rpg);
      const nq = retryKey ? qs.find((q) => q.key === retryKey)
        : (qs.find((q) => q.bank.id === storyRun.quest.bank.id && q.idx === storyRun.quest.idx + 1 && sqOpen(rr, q)) || qs.find((q) => sqStars(rr, q.key) < 1 && sqOpen(rr, q)));
      if (!nq) { setStoryRun(null); setMsg("この地域の地図が完成しました！"); setTimeout(() => setMsg(""), 2500); return; }
      setStoryRun({ ...storyRun, quest: nq, title: nq.key === storyRun.quest.key ? storyRun.title : `${nq.bank.name} 第${nq.idx + 1}話`, regionKeys: qs.map((q) => q.key) });
    };
    return <QuestRun key={storyRun.quest.key + (storyRun.n || 0)} state={state} run={storyRun} actions={actions} recordAnswer={recordAnswer} startTimer={startTimer} stopTimer={stopTimer} onExit={() => setStoryRun(null)} onNext={(retryKey) => { goNext(typeof retryKey === "string" ? retryKey : null); setStoryRun((s) => (s ? { ...s, n: (s.n || 0) + 1 } : s)); }} />;
  }
  if (rehearsal) {
    return <RehearsalRun state={state} run={rehearsal} actions={actions} recordAnswer={recordAnswer} startTimer={startTimer} stopTimer={stopTimer} onExit={() => setRehearsal(null)} />;
  }
  if (dungeon) {
    return <DungeonRun state={state} pool={dungeon.pool} minutes={dungeon.minutes} actions={actions} recordAnswer={recordAnswer} startTimer={startTimer} stopTimer={stopTimer} onExit={() => setDungeon(null)} />;
  }
  if (battle) {
    return <BossBattle state={state} boss={battle.boss} pool={battle.pool} actions={actions} recordAnswer={recordAnswer} startTimer={startTimer} stopTimer={stopTimer} onExit={() => setBattle(null)} />;
  }

  const quals = [...new Set(state.questionBanks.map((b) => b.qualId || "_none_"))];
  const qualName = (k) => (k === "all" ? "すべての問題集" : k === "_none_" ? "資格未設定" : ((state.qualifications.find((q) => q.id === k) || {}).name || "資格"));
  const weakCount = state.questionBanks.filter((b) => qualId === "all" || (b.qualId || "_none_") === qualId).reduce((n, b) => n + (b.questions || []).filter((q) => !q.excluded && isQuestionWeak(q)).length, 0);
  const totalQ = state.questionBanks.reduce((n, b) => n + (b.questions || []).length, 0);
  const startBattle = () => {
    const pool = buildBossPool(state, qualId, 10);
    if (pool.length === 0) { setMsg("出題できる問題がありません"); return; }
    setBattle({ boss, pool });
  };
  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(""), 2500); };
  const mainAch = state.player.mainTitleId ? state.player.achievements.find((a) => a.id === state.player.mainTitleId) : null;
  const eqMap = Object.fromEntries(RPG_SLOTS.map((s) => [s.id, rpgInvItem(r.inventory.find((v) => v.u === r.equipped[s.id]))]));
  const owned = new Set(state.player.achievements.map((a) => a.id));
  const boostLeft = bonus.boostActive ? Math.ceil((r.boosts.xpUntil - Date.now()) / 60000) : 0;
  const spLeft = skillPointsTotal(state) - skillPointsUsed(r);
  const msgBox = msg && <div className="jp text-sm p-2 text-center" style={{ background: "var(--cream)", border: "1px solid var(--gold)", color: "var(--ink)" }}>{msg}</div>;
  // 画面上部の切り替え（拠点・ボス／スキル／鍛冶場）
  const nav = (
    <div className="grid grid-cols-5 gap-1">
      {[["world", "世界"], ["base", "拠点"], ["skill", "スキル"], ["forge", "鍛冶場"], ["dex", "図鑑"]].map(([id, label]) => (
        <button key={id} onClick={() => setView(id)} className={`jp py-2 text-sm relative ${view === id ? "btn-primary" : "btn-ghost"}`}>
          {label}
          {id === "skill" && spLeft > 0 && <span className="absolute -top-1.5 -right-1 text-[10px] px-1.5" style={{ background: "var(--brick)", color: "var(--paper)", borderRadius: 999 }}>{spLeft}</span>}
        </button>
      ))}
    </div>
  );
  if (view === "skill") return <div className="space-y-4">{nav}{msgBox}<SkillPanel state={state} actions={actions} flash={flash} /></div>;
  if (view === "forge") return <div className="space-y-4">{nav}{msgBox}<ForgePanel state={state} actions={actions} />{featOn("alchemy") && <AlchemyPanel state={state} actions={actions} />}</div>;
  if (view === "dex") return <div className="space-y-4">{nav}<EvolutionRoad state={state} /><MonsterDex state={state} /></div>;
  if (view === "world") return <div className="space-y-4">{nav}<WorldView state={state} actions={actions} todayCount={todayCount} onWeekly={(boss, pool) => { if (pool.length === 0) { flash("出題できる問題がありません"); return; } setBattle({ boss, pool }); }} onDungeon={(n, pool) => setDungeon({ pool, minutes: n })} onRehearsal={(run) => setRehearsal(run)} onEndless={() => setEndless(Date.now())} onForest={() => setForest(Date.now())} onSeason={(b) => { const sc = studyScope(state); const pool = buildPoolFromBanks(state.questionBanks.filter((x) => sc.inScope(x)), 12); if (!pool.length) { flash("出題できる問題がありません"); return; } setBattle({ boss: b, pool }); }} onStudyGroup={(allyId) => { const a = allyById(allyId); const pool = studyGroupPool(state, a); if (pool.length) setGroupRun({ allyId, pool }); else flash("出題できる問題がありません"); }} onStory={(run) => setStoryRun(run)} onTower={(run) => setTowerRun(run)} onSecBoss={({ bank, region }) => { const pool = buildPoolFromBanks([bank], 15); if (pool.length) setSecRun({ bank, region, pool }); }} onGuardian={(g) => { const info = regionInfo(g.name); const pool = buildPoolFromBanks(g.banks, 15); if (pool.length === 0) { flash("出題できる問題がありません"); return; } setBattle({ boss: { id: info.boss, guardian: true, region: g.name, idx: 3, loop: 0, icon: info.icon, name: info.guardian, label: `${g.name}の守護者 ${info.guardian}`, hp: 200, atk: 20 }, pool }); }} /></div>;

  return (
    <div className="space-y-4">
      {nav}
      {msgBox}

      {/* 拠点 */}
      <Box title="冒険の拠点" icon={<Castle size={18} />}>
        <div className="flex items-center gap-3 p-2" style={{ background: "var(--sky-pale)", border: "1px solid var(--rule-soft)" }}>
          <div className="flex-shrink-0 flex flex-col items-center gap-1">
            <HeroPortrait state={state} size={150} />
            <button onClick={() => setCharPick(!charPick)} className="btn-ghost text-[11px] px-2 py-0.5">🔄 キャラを変える</button>
          </div>
          <div className="flex-1 min-w-0">
            <div className="pixel text-sm mb-1" style={{ color: "var(--gold)" }}>💰 {r.gold.toLocaleString()} G</div>
            <div className="flex gap-1 mb-1 text-xl">{RPG_SLOTS.map((s) => <span key={s.id} title={s.label} style={{ opacity: eqMap[s.id] ? 1 : 0.25 }}>{eqMap[s.id] ? <GameIcon ch={eqMap[s.id].icon} id={eqMap[s.id].id} rarity={eqMap[s.id].rarity} size={34} /> : "▫️"}</span>)}</div>
            <div className="jp text-[10px]" style={{ color: "var(--ink-soft)" }}>
              会心率 {bonus.critPct}% ・ EXP+{bonus.xpPct}% ・ ゴールド+{bonus.goldPct}%
            </div>
            {bonus.boostActive && <div className="jp text-[10px] mt-1 px-1 inline-block" style={{ background: "var(--plum)", color: "var(--paper)" }}>📕 EXP2倍 あと{boostLeft}分</div>}
          </div>
        </div>
        {charPick && (
          <div className="mt-2 p-2" style={{ background: "var(--paper)", border: "1px solid var(--gold)", borderRadius: 10 }}>
            <div className="jp text-[11px] mb-1.5" style={{ color: "var(--ink-soft)", fontWeight: 700 }}>拠点に立つキャラを選ぶ（主人公を選ぶと、レベルで進化する姿にもどります）</div>
            <BarCharPicker cur={(state.displaySettings || {}).baseChar || "hero"} onPick={(id) => { setDisplay({ baseChar: id === "hero" ? null : id }); setCharPick(false); }} />
          </div>
        )}
        <p className="jp text-[10px] mt-2" style={{ color: "var(--ink-mute)" }}>問題に正解するとEXPと一緒にゴールドがたまり、まれにアイテムが落ちます。完全制覇やボス討伐でも装備が手に入ります。</p>
      </Box>

      {/* パーティ（2026年10月26日） */}
      <PartyQuick state={state} actions={actions} regions={(() => { const qual = mainQual(state); const linked = qual && state.questionBanks.some((b) => b.qualId === qual.id); return passPower(state, linked ? qual.id : null).regions.filter((g) => g.total > 0).sort(byRegionOrder).map((g) => g.name); })()} />

      {/* ルーン・魔物の仲間（2026年10月26日） */}
      {featOn("rune") && <RunePanel state={state} actions={actions} />}
      {featOn("tame") && <TamePanel state={state} actions={actions} />}

      {/* 覚醒・転職の神殿・相棒 */}
      <GrowthPanels state={state} actions={actions} />

      {/* ボス戦 */}
      <Box title="ボス戦" icon={<Skull size={18} />}>
        <div className="flex items-center gap-3 mb-3">
          <div className="text-5xl"><GameIcon ch={boss.icon} id={boss.id} art={boss.art} size={64} boss /></div>
          <div className="flex-1">
            <div className="jp text-base" style={{ color: "var(--brick)", fontWeight: "bold" }}>{boss.label}</div>
            <div className="pixel text-[10px]" style={{ color: "var(--ink-soft)" }}>HP {boss.hp} ・ ATK {boss.atk}</div>
            <div className="jp text-[10px]" style={{ color: "var(--ink-mute)" }}>戦績 {r.bossWins}勝 {r.bossLosses}敗</div>
          </div>
        </div>
        {quals.length > 1 && (
          <select className="rpg-input mb-2 text-sm" value={qualId} onChange={(e) => setQualId(e.target.value)}>
            <option value="all">すべての問題集から出題</option>
            {quals.map((k) => <option key={k} value={k}>{qualName(k)}から出題</option>)}
          </select>
        )}
        <button onClick={startBattle} disabled={totalQ === 0} className="jp btn-danger w-full py-3 text-base">⚔ 挑む（10問）</button>
        <p className="jp text-[10px] mt-2" style={{ color: "var(--ink-mute)" }}>
          苦手な問題から優先して出題されます（いま苦手 {weakCount}問）。正解でボスにダメージ、不正解で自分がダメージを受けます。「◎確実」で答えると攻撃力が上がり、会心の一撃が出ると2倍です。ボス戦の回答も復習の記録に反映されます。
        </p>
        {r.bossLog.length > 0 && (
          <div className="mt-2">
            <div className="jp text-[10px] mb-1" style={{ color: "var(--ink-soft)" }}>最近の戦い</div>
            {r.bossLog.slice(-5).reverse().map((l, i) => {
              const b = RPG_BOSSES.find((x) => x.id === l.b) || { icon: "❔", name: "?" };
              return <div key={i} className="jp text-[11px]" style={{ color: l.w ? "var(--sage)" : "var(--ink-mute)" }}>{l.d} {b.icon}{b.name}{"★".repeat(Math.min(l.l || 0, 5))} … {l.w ? "勝利" : "敗北"}</div>;
            })}
          </div>
        )}
      </Box>

      {/* 召喚 */}
      {featOn("gacha") && <GachaPanel state={state} actions={actions} flash={flash} />}

      {/* 装備 */}
      <Box title="装備" icon={<Sword size={18} />}>
        <div className="jp flex items-baseline justify-between mb-2 px-2 py-1.5" style={{ background: "linear-gradient(90deg, rgba(214,181,106,0.18), rgba(214,181,106,0.04))", border: "1px solid #d6b56a", borderRadius: 8 }}>
          <span className="text-xs" style={{ color: "var(--ink-soft)", fontWeight: 700 }}>戦闘力</span>
          <span style={{ fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 24, color: "#b08a3e" }}>{combatPower(state).toLocaleString()}</span>
        </div>
        <div className="space-y-1">
          {RPG_SLOTS.map((s) => {
            const it = eqMap[s.id];
            const candidates = r.inventory.filter((v) => (rpgItemById(v.i) || {}).slot === s.id);
            return (
              <div key={s.id} style={{ border: "1px solid var(--rule-soft)", background: "var(--paper)" }}>
                <button onClick={() => setSlotOpen(slotOpen === s.id ? null : s.id)} className="w-full text-left p-2 flex items-center gap-2" style={{ background: "transparent", border: "none" }}>
                  <span className="jp text-[10px] w-16 flex-shrink-0" style={{ color: "var(--ink-mute)" }}>{s.label}</span>
                  {it ? <><GameIcon ch={it.icon} id={it.id} rarity={it.rarity} size={30} /><span className="jp text-sm flex-1" style={{ color: "var(--ink)" }}>{it.label}</span><RpgRarityTag rarity={it.rarity} /></> : <span className="jp text-xs flex-1" style={{ color: "var(--ink-mute)" }}>なし</span>}
                  <span className="jp text-[10px]" style={{ color: "var(--ink-mute)" }}>{slotOpen === s.id ? "▲" : `変更(${candidates.length})`}</span>
                </button>
                {it && <div className="jp text-[10px] px-2 pb-1" style={{ color: "var(--sky-deep)" }}>{fxText(it.fx)}</div>}
                {slotOpen === s.id && (
                  <div className="px-2 pb-2 space-y-1">
                    {candidates.length === 0 && <p className="jp text-[11px]" style={{ color: "var(--ink-mute)" }}>この部位の装備を持っていません。ショップやボス討伐で手に入ります。</p>}
                    {r.equipped[s.id] && <button onClick={() => { actions.equip(s.id, null); setSlotOpen(null); }} className="jp text-[11px] w-full py-1" style={{ border: "1px dashed var(--rule-soft)", background: "transparent", color: "var(--ink-soft)" }}>外す</button>}
                    {candidates.map((v) => {
                      const ci = rpgInvItem(v);
                      const on = r.equipped[s.id] === v.u;
                      return (
                        <div key={v.u} className="flex items-center gap-2 p-1" style={{ background: on ? "var(--sky-pale)" : "transparent" }}>
                          <GameIcon ch={ci.icon} id={ci.id} rarity={ci.rarity} size={30} />
                          <div className="flex-1 min-w-0">
                            <div className="jp text-xs" style={{ color: "var(--ink)" }}>{ci.label} <RpgRarityTag rarity={ci.rarity} /></div>
                            <div className="jp text-[10px]" style={{ color: "var(--sky-deep)" }}>{fxText(ci.fx)}</div>
                          </div>
                          {on ? <span className="jp text-[10px]" style={{ color: "var(--sage)" }}>装備中</span>
                            : <button onClick={() => { actions.equip(s.id, v.u); setSlotOpen(null); }} className="jp btn-sky text-[11px] px-2 py-1">装備</button>}
                          {!on && <button onClick={() => { if (confirm(`${ci.name}を${RARITY[ci.rarity].sell}Gで売りますか？`)) actions.sell(v.u); }} className="jp text-[10px] px-1.5 py-1" style={{ border: "1px solid var(--rule-soft)", background: "var(--paper)", color: "var(--ink-soft)" }}>売る</button>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="jp text-[10px] mt-2 p-2" style={{ background: "var(--cream)", color: "var(--ink-soft)" }}>
          {setStatus(r).filter((st) => st.have >= 2).map((st) => <div key={st.id} style={{ color: st.have === 3 ? "#b08a3e" : "var(--ink-soft)", fontWeight: st.have === 3 ? 800 : 500 }}>{st.have === 3 ? "✦ セット効果" : "△ あと1つ"}「{st.name}」{st.have}/3：{fxText(st.fx)}{st.have < 3 ? `（${st.items.filter((i) => !rpgEquippedItems(r).some((it) => it.id === i)).map((i) => (rpgItemById(i) || {}).name).join("")}）` : ""}</div>)}
          いまの効果：会心率 {bonus.critPct}% ／ EXP+{bonus.xpPct}% ／ ゴールド+{bonus.goldPct}% ／ ボスへの攻撃+{bonus.bossDmgPct}% ／ 被ダメージ-{bonus.dmgCutPct}% ／ 最大HP {bonus.maxHp}
          <br />会心率はLUK、攻撃はINT、被ダメージ軽減はDEF、HPは連続学習日数とレベルでも上がります。
        </div>
        <div className="flex gap-2 mt-2">
          <button onClick={() => { if (confirm("装備していない N の装備（強化していないもの）を、まとめて売りますか？")) flash(actions.sellBulk(["N"])); }} className="jp btn-ghost text-[11px] px-2 py-1 flex-1">N をまとめて売る</button>
          <button onClick={() => { if (confirm("装備していない N と R の装備（強化していないもの）を、まとめて売りますか？")) flash(actions.sellBulk(["N", "R"])); }} className="jp btn-ghost text-[11px] px-2 py-1 flex-1">N・R をまとめて売る</button>
        </div>
      </Box>

      {/* 道具 */}
      <Box title="道具" icon={<Bookmark size={18} />}>
        <div className="space-y-1">
          {RPG_CONSUMABLES.map((c) => (
            <div key={c.id} className="flex items-center gap-2 p-1.5" style={{ border: "1px solid var(--rule-soft)", background: "var(--paper)" }}>
              <GameIcon ch={c.icon} size={36} />
              <div className="flex-1 min-w-0">
                <div className="jp text-xs" style={{ color: "var(--ink)" }}>{c.name} ×{r.consumables[c.id] || 0}</div>
                <div className="jp text-[10px]" style={{ color: "var(--ink-mute)" }}>{c.desc}</div>
              </div>
              {c.id !== "potion" && <button disabled={!(r.consumables[c.id] > 0)} onClick={() => flash(actions.useConsumable(c.id))} className="jp btn-sky text-[11px] px-2 py-1">使う</button>}
              <button disabled={r.gold < c.price} onClick={() => flash(actions.buy("consumable", c.id))} className="jp btn-primary text-[11px] px-2 py-1">{c.price}G</button>
            </div>
          ))}
        </div>
      </Box>

      {/* ショップ */}
      <Box title="ショップ" icon={<Crown size={18} />}>
        <div className="mb-3 relative overflow-hidden" style={{ height: 90, borderRadius: 8, border: "1px solid #b08a3e", background: `url(${ART_URL}items-banner.jpg) center 45%/cover no-repeat` }}>
          <div className="absolute inset-x-0 bottom-0 px-3 py-1 jp text-xs" style={{ background: "linear-gradient(0deg, rgba(253,251,245,0.95), rgba(253,251,245,0))", color: "#22335c", fontWeight: 800 }}>集めたアイテムは、君の力になる</div>
        </div>
        <div className="space-y-1">
          {RPG_ITEMS.filter((it) => it.price).map((it) => (
            <div key={it.id} className="flex items-center gap-2 p-1.5" style={{ border: "1px solid var(--rule-soft)", background: "var(--paper)" }}>
              <GameIcon ch={it.icon} id={it.id} rarity={it.rarity} size={36} />
              <div className="flex-1 min-w-0">
                <div className="jp text-xs" style={{ color: "var(--ink)" }}>{it.name} <RpgRarityTag rarity={it.rarity} /> <span className="text-[10px]" style={{ color: "var(--ink-mute)" }}>{RPG_SLOTS.find((s) => s.id === it.slot).label}</span></div>
                <div className="jp text-[10px]" style={{ color: "var(--sky-deep)" }}>{fxText(it.fx)}</div>
              </div>
              <button disabled={r.gold < it.price} onClick={() => flash(actions.buy("item", it.id))} className="jp btn-primary text-[11px] px-2 py-1">{it.price}G</button>
            </div>
          ))}
        </div>
        <p className="jp text-[10px] mt-2" style={{ color: "var(--ink-mute)" }}>SR・SSRの装備はお店では買えません。ボス討伐や完全制覇の報酬で狙いましょう。</p>
      </Box>

      {/* 実績 */}
      <Box title="冒険の実績" icon={<Award size={18} />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
          {RPG_ACHIEVEMENTS.map((a) => {
            const got = owned.has(a.id);
            return (
              <div key={a.id} className="flex items-center gap-2 p-1.5" style={{ border: "1px solid var(--rule-soft)", background: got ? "var(--paper)" : "var(--cream)", opacity: got ? 1 : 0.7 }}>
                <span className="text-xl" style={{ filter: got ? "none" : "grayscale(1)" }}>{got ? a.icon : "🔒"}</span>
                <div className="flex-1 min-w-0">
                  <div className="jp text-xs" style={{ color: got ? "var(--ink)" : "var(--ink-mute)" }}>{a.title}</div>
                  <div className="jp text-[10px]" style={{ color: "var(--ink-mute)" }}>{got ? a.desc : `条件：${a.hint}`}</div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="jp text-[10px] mt-2" style={{ color: "var(--ink-mute)" }}>手に入れた実績は称号として、ホーム画面で設定できます。</p>
      </Box>
    </div>
  );
}

// ── ボス戦 ──
function BossBattle({ state, boss, pool, actions, recordAnswer, startTimer, stopTimer, onExit }) {
  const bonus = getRpgBonuses(state);
  const st = calculateStatus(state);
  const r = normRpg(state.rpg);
  const [idx, setIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [bossHp, setBossHp] = useState(boss.hp);
  const [phase2, setPhase2] = useState(false); // 第2形態（HPが半分を切ったら1回だけ変身。攻撃が1.2倍）
  const [hp, setHp] = useState(bonus.maxHp);
  const [maxHp] = useState(bonus.maxHp);
  const [taunt] = useState(() => bossTaunt(state, pool)); // 苦手な地域を名指しする挑発
  const [log, setLog] = useState(() => [`${boss.icon} ${boss.label}があらわれた！`, ...(taunt ? [`💬 ${boss.name}「${taunt.line}」`] : [])]);
  const [shield, setShield] = useState(null); // 障壁 { need, left }：◎で need 回続けて正解すると砕ける
  const shieldAt = useRef(pool.length >= 15 ? [0.7, 0.35] : [0.5]); // HPがこの割合を切ったら障壁を張る（短い戦いは1回だけ）
  const shieldNeed = boss.idx >= 3 && !boss.weekly && !boss.guardian ? 3 : 2;
  const [chest] = useState(() => rollChest(0.5)); // 勝ったときの宝箱
  const [fx, setFx] = useState(null); // 技の演出 { n, side: "hero"|"mon", atk, t, dmg, crit, assist }
  const [assist, setAssist] = useState(null); // 仲間の加勢の演出 { n, p, val, heal, joint }
  const [charging, setCharging] = useState(false); // ボスが力を溜めている
  const [ap, setAp] = useState(0); // 行動ポイント（正解で+1、◎で+2）
  const [guard, setGuard] = useState(0); // 守りの構え：残り回数（受けるダメージ半分）
  const [weaken, setWeaken] = useState(false); // 弱体の薬：ボスの攻撃-30%
  const tame = r.tameActive && (r.tamed || {})[r.tameActive] ? monSpecies(r.tameActive) : null; // 連れている魔物
  const healedRef = useRef(false); // 回復はボス1体につき1回
  const party = battleParty(state, typeof boss.region === "string" ? boss.region : boss.region && boss.region.name);
  const synergy = partySynergy(party, normRpg(state.rpg));
  const [combo, setCombo] = useState(0);
  const [dying, setDying] = useState(null); // "boss"（倒した）| "me"（力尽きた）
  const fxN = useRef(0);
  const busy = useRef(false); // 決着の演出中は答えを受け付けない
  const [result, setResult] = useState(null); // { won, gold, xp, itemId, fled }
  const timerStartedByMe = useRef(false);
  const finished = useRef(false);

  useEffect(() => {
    if (!state.timer.startMs) { startTimer(null, "qa"); timerStartedByMe.current = true; }
    return () => { if (timerStartedByMe.current) { stopTimer(); timerStartedByMe.current = false; } };
  }, []);

  const item = pool[idx];
  const bank = item ? state.questionBanks.find((b) => b.id === item.bankId) : null;
  const q = bank ? (bank.questions || []).find((x) => x.id === item.qId) : null;

  const finish = (won, fled) => {
    if (finished.current) return;
    finished.current = true;
    if (timerStartedByMe.current) { stopTimer(); timerStartedByMe.current = false; }
    // 季節の限定ボス：その月にはじめて倒したときだけ、限定の称号・300G・装備
    if (boss.seasonal) {
      const first = won && !((normRpg(state.rpg).seasonBoss || {})[boss.ym]);
      const sg = won ? (first ? SEASON_BOSS_REWARD.gold : SEASON_BOSS_REWARD.again) : 10, sx = won ? (first ? SEASON_BOSS_REWARD.xp : 30) : 0;
      const sItem = first ? rollRpgItem(SEASON_BOSS_REWARD.luck) : null;
      actions.seasonBossFinish({ won, gold: sg, xp: sx, itemId: sItem, boss, first });
      setResult({ won, fled, gold: sg, xp: sx, itemId: sItem });
      return;
    }
    const gold = boss.weekly ? (won ? WEEKLY_REWARD.gold : 15) : won ? 60 + 40 * boss.idx + 30 * boss.loop : 10;
    const xp = boss.weekly ? (won ? WEEKLY_REWARD.xp : 0) : won ? 80 + 30 * boss.idx + 20 * boss.loop : 0;
    const itemId = won ? rollRpgItem(boss.weekly ? WEEKLY_REWARD.luck : 1 + boss.idx * 0.6 + boss.loop) : null;
    if (boss.guardian) actions.guardianFinish({ won, region: boss.region, gold, xp, itemId }); // 地域の守護者：勝つと地域が解放される
    else if (boss.weekly) actions.weeklyFinish({ won, gold, xp, itemId }); // 週替わりボスはいつものボスの進み具合には数えない
    else actions.bossFinish({ won, bossId: boss.id, loop: boss.loop, gold, xp, itemId });
    setResult({ won, fled, gold, xp, itemId });
  };

  const addLog = (t) => setLog((l) => [...l, t].slice(-4));
  const bossRegion = typeof boss.region === "string" ? boss.region : boss.region && boss.region.name;

  const answer = (correct, meta) => {
    if (!q || result || busy.current) return;
    recordAnswer(item.bankId, q.id, correct, meta);
    let nb = bossHp, nh = hp;
    let sh = shield;
    const n = ++fxN.current;
    let t = 0;
    if (correct) {
      const base = 12 + Math.min(30, Math.floor(st.int / 40));
      const mult = meta && meta.conf === "unsure" ? 0.6 : 1;
      const runeN = bank ? runeHits(r, themeOf(bank.name).mat) : 0; // ルーン：その科目の問題で強くなる
      const crit = Math.random() * 100 < bonus.critPct + runeN * RUNE_CRIT;
      const nc = combo + 1;
      // 連続で正解すると、2連目から少しずつ威力が上がる（最大+30%）
      const comboMul = 1 + Math.min(0.3, (nc - 1) * 0.06);
      const breakMul = charging ? 1.3 : 1; // 溜めを止めた一撃
      // 挑発された苦手の地域に正解すると「言い返した！」で1.5倍
      const tauntHit = !!taunt && !!bank && themeOf(bank.name).region === taunt.region;
      let dmg = Math.max(1, Math.round(base * mult * comboMul * breakMul * (1 + bonus.bossDmgPct / 100) * (1 + synergy.dmgPct / 100) * (crit ? 2 : 1) * (tauntHit ? 1.5 : 1) * (1 + RUNE_DMG * runeN)));
      // 障壁：◎（自信ありの正解）を続けて砕く。砕けるまでダメージは4分の1
      let shieldMsg = null;
      if (sh) {
        if (meta && meta.conf === "sure") {
          const left = sh.left - 1;
          if (left <= 0) { dmg *= 2; sh = null; shieldMsg = `💥 障壁を砕いた！ この一撃はダメージ2倍`; SFX.play("crit"); }
          else { dmg = Math.max(1, Math.round(dmg * 0.25)); sh = { ...sh, left }; shieldMsg = `🛡 障壁に阻まれた……あと${left}回の◎で砕ける`; }
        } else { dmg = Math.max(1, Math.round(dmg * 0.25)); sh = { ...sh, left: sh.need }; shieldMsg = `🛡 障壁に阻まれた。◎で${sh.need}回続けて正解しないと砕けない`; }
      }
      const atk = heroAttackFor({ weapon: equippedWeaponId(r), region: bossRegion, crit, combo: nc });
      t = impactOf(atk) + (bossCut(nc) ? (bossCut(nc).ult ? 1.6 : 1.3) : 0); // カットイン → ルナの必殺技 → 命中
      // 仲間の加勢：カイトなどは3連撃ごとに追撃、レイヴンなどは会心か2割で魔法
      const chase = party.find((p) => p.skill.kind === "chase"), magic = party.find((p) => p.skill.kind === "magic");
      let as = null;
      // 連携技（絆レベル3以上の仲間と、6連撃ごと）
      const partner = nc % JOINT_EVERY === 0 ? party.find((p) => JOINT_SKILLS[p.a.id] && bondLevel(((r.bonds || {})[p.a.id]) || 0) >= JOINT_BOND) : null;
      if (sh) as = null; // 障壁があるあいだは仲間の加勢も通らない
      else if (partner) as = { p: partner, val: Math.max(1, Math.round(dmg * 0.6)), joint: JOINT_SKILLS[partner.a.id] };
      else if (chase && nc % 3 === 0) as = { p: chase, val: Math.max(1, Math.round(dmg * 0.4)) };
      else if (magic && (crit || Math.random() < 0.2)) as = { p: magic, val: Math.max(1, Math.round(dmg * 0.3)) };
      // 連れている魔物の加勢（4連撃ごと。障壁があるあいだは通らない）
      const tameVal = tame && !sh && nc % TAME_EVERY === 0 ? Math.max(1, Math.round(dmg * TAME_DMG)) : 0;
      nb = Math.max(0, bossHp - dmg - (as ? as.val : 0) - tameVal);
      if (tameVal) { setTimeout(() => setBossHp((v) => Math.max(0, Math.min(v, nb))), t * 1000 + 700); addLog(`🐾 ${tame.name}が加勢！ さらに${tameVal}のダメージ`); }
      setCombo(nc);
      setAp((a) => Math.min(AP_MAX, a + (meta && meta.conf === "sure" ? 2 : 1)));
      const cut = bossCut(nc);
      const big = crit || !!cut || nc >= 3;
      if (cut) setTimeout(() => SFX.play("combo"), 120);
      setFx({ n, side: "hero", atk, t, dmg, crit, cut, big, hits: big ? splitHits(dmg, cut ? 4 : 3) : [dmg] });
      if (atk.kind !== "slash") SFX.play(atk.sfx);
      setTimeout(() => { setBossHp(Math.max(0, bossHp - dmg)); SFX.play(crit ? "crit" : atk.kind === "slash" ? "hit" : "magicHit"); }, t * 1000);
      if (as) {
        setTimeout(() => { setAssist({ n, ...as }); setBossHp(nb); SFX.play(as.p.skill.kind === "chase" ? "hit" : "magicHit"); }, t * 1000 + 380);
        setTimeout(() => setAssist((x) => (x && x.n === n ? null : x)), t * 1000 + 1500);
      }
      const cutName = bossCut(nc);
      addLog(cutName ? `🌟 ${HERO_NAME}の${cutName.ult ? "必殺技" : "スキル"}「${cutName.name}」！ ${dmg}のダメージ（${nc}連撃）` : crit ? `💥 会心の一撃！ ${atk.name}で ${dmg}のダメージ！` : `⚔ ${HERO_NAME}の${atk.name}！ ${boss.name}に${dmg}のダメージ${nc >= 2 ? `（${nc}連撃）` : ""}`);
      if (tauntHit) addLog(`💬 言い返した！ 苦手な「${taunt.region}」を正解（ダメージ1.5倍）`);
      if (shieldMsg) addLog(shieldMsg);
      if (as) addLog(as.joint ? `🤝 連携技「${as.joint}」！ ${HERO_NAME}と${as.p.a.name}の合体技で、さらに${as.val}のダメージ` : `✨ ${as.p.a.name}の${as.p.skill.name}！ さらに${as.val}のダメージ`);
      if (charging) { setCharging(false); addLog(`🛡 溜めを止めた！ ${boss.name}の力が霧散した（ダメージ1.3倍）`); }
    } else {
      if (sh && sh.left !== sh.need) { sh = { ...sh, left: sh.need }; addLog("🛡 障壁が元に戻った……"); }
      const raw = boss.atk * (meta && meta.confident ? 1.3 : 1) * (charging ? 2.5 : 1) * (phase2 ? 1.2 : 1) * (guard > 0 ? 0.5 : 1) * (weaken ? 0.7 : 1);
      const dmg = Math.max(1, Math.round(raw * (1 - bonus.dmgCutPct / 100)));
      if (guard > 0) { setGuard(guard - 1); addLog(`🛡 守りの構えで、ダメージを半分におさえた`); }
      const atk = monAttackFor(boss.art);
      t = impactOf(atk);
      nh = Math.max(0, hp - dmg);
      // 仲間の加勢：セレナなどは4割で回復（力尽きる前に間に合えば助かる）
      const healer = party.find((p) => p.skill.kind === "heal");
      const as = healer && Math.random() < 0.4 ? { p: healer, val: Math.round(maxHp * 0.12), heal: true } : null;
      const hit = nh;
      if (as) nh = Math.min(maxHp, nh + as.val);
      setCombo(0);
      setFx({ n, side: "mon", atk, t, dmg });
      SFX.play("roar");
      setTimeout(() => { setHp(as ? Math.max(1, hit) : hit); SFX.play(["claw", "bite", "gust"].includes(atk.kind) ? "claw" : "miss"); }, t * 1000);
      if (as) {
        setTimeout(() => { setAssist({ n, ...as }); setHp(nh); SFX.play("holy"); }, t * 1000 + 450);
        setTimeout(() => setAssist((x) => (x && x.n === n ? null : x)), t * 1000 + 1600);
      }
      addLog(charging ? `💢 ${boss.name}の溜めた大技・${atk.name}！ ${dmg}の大ダメージ！` : `${boss.icon} ${boss.name}の${atk.name}！ ${dmg}のダメージを受けた`);
      if (as) addLog(`✨ ${as.p.a.name}の${as.p.skill.name}！ HPが${as.val}回復した`);
      if (charging) setCharging(false);
      // ボスの回復（HPが半分を切っていたら1回だけ）
      if (BOSS_HEALERS.has(boss.art) && !healedRef.current && nb > 0 && nb < boss.hp * 0.5) {
        healedRef.current = true;
        const hv = Math.round(boss.hp * 0.15);
        nb = Math.min(boss.hp, nb + hv);
        const nbv = nb;
        setTimeout(() => { setBossHp(nbv); SFX.play("holy"); }, t * 1000 + 600);
        addLog(`🌿 ${boss.name}は傷を癒やした！ HPが${hv}回復した`);
      }
    }
    // 障壁：HPが半分を切ったら張る（15問以上の戦いは7割と3.5割の2回）
    if (!sh && nb > 0 && shieldAt.current.length && nb <= boss.hp * shieldAt.current[0]) {
      shieldAt.current = shieldAt.current.filter((v) => nb > boss.hp * v);
      sh = { need: shieldNeed, left: shieldNeed };
      setTimeout(() => SFX.play("holy"), t * 1000 + 700);
      addLog(`🔮 ${boss.name}は障壁を張った！ ◎で${shieldNeed}回続けて正解して砕こう`);
    }
    setShield(sh);
    // 第2形態：HPが半分を切ったら、1回だけ真の姿に
    if (!phase2 && nb > 0 && nb <= boss.hp * 0.5) {
      setTimeout(() => { setPhase2(true); SFX.play("roar"); }, t * 1000 + 900);
      addLog(`⚡ ${boss.name}が真の姿を現した！ 第2形態（攻撃が強くなった）`);
    }
    // 次の問題で溜めるか（4問ごと。溜め中・決着のときは除く）
    const willCharge = !charging && nb > 0 && nh > 0 && (idx + 1) % CHARGE_EVERY === 0 && idx + 1 < pool.length;
    if (willCharge) { setTimeout(() => setCharging(true), t * 1000 + 700); addLog(`⚠ ${boss.name}は力を溜めている……！ 次の問題を正解して止めよう`); }
    setShowAnswer(false);
    setTimeout(() => setFx((f) => (f && f.n === n ? null : f)), (correct && bossCut(combo + 1) && bossCut(combo + 1).ult ? 2300 : correct && (bossCut(combo + 1) || combo + 1 >= 3) ? 1600 : 1000) + t * 1000);
    if (nb <= 0) { busy.current = true; addLog(`🎉 ${boss.name}を倒した！`); setTimeout(() => { setDying("boss"); SFX.play("victory"); }, t * 1000 + 250); setTimeout(() => finish(true, false), t * 1000 + 2100); return; }
    if (nh <= 0) { busy.current = true; addLog("💀 力尽きた…"); setTimeout(() => setDying("me"), t * 1000 + 250); setTimeout(() => finish(false, false), t * 1000 + 1700); return; }
    if (idx + 1 >= pool.length) { busy.current = true; addLog(`${boss.name}は逃げていった…`); setTimeout(() => finish(false, true), t * 1000 + 900); return; }
    setIdx(idx + 1);
  };

  // コマンド：行動ポイントを使う技・回復・守り（上級職の専用の技・調合の道具も）
  const cmdBase = () => Math.max(1, Math.round((12 + Math.min(30, Math.floor(st.int / 40))) * (1 + bonus.bossDmgPct / 100) * (1 + synergy.dmgPct / 100)));
  const hitBoss = (dmg, label, opts = {}) => {
    const n = ++fxN.current;
    const atk = heroAttackFor({ weapon: equippedWeaponId(r), region: bossRegion, crit: true, combo: 5 });
    const t = impactOf(atk);
    let d = Math.max(1, Math.round(dmg)), sh = shield;
    if (sh && opts.breakShield) { sh = null; addLog("💥 障壁を打ち砕いた！"); }
    else if (sh && opts.pierce) { const left = sh.left - 1; sh = left <= 0 ? null : { ...sh, left }; addLog(left <= 0 ? "💥 障壁を貫いて砕いた！" : `🏹 障壁を貫いた（あと${left}回で砕ける）`); }
    else if (sh) d = Math.max(1, Math.round(d * 0.25));
    setShield(sh);
    const nb = Math.max(0, bossHp - d);
    setFx({ n, side: "hero", atk, t, dmg: d, crit: true, big: true, hits: splitHits(d, 3) });
    if (atk.kind !== "slash") SFX.play(atk.sfx);
    setTimeout(() => { setBossHp(nb); SFX.play("crit"); }, t * 1000);
    setTimeout(() => setFx((f) => (f && f.n === n ? null : f)), 1600 + t * 1000);
    addLog(`${label} ${d}のダメージ！`);
    if (nb <= 0) { busy.current = true; addLog(`🎉 ${boss.name}を倒した！`); setTimeout(() => { setDying("boss"); SFX.play("victory"); }, t * 1000 + 250); setTimeout(() => finish(true, false), t * 1000 + 2100); }
  };
  const adv = getClassInfo(state) && getClassInfo(state).adv;
  const cmds = [...BOSS_COMMANDS.filter((c) => !c.party || party.length), ...(adv ? [{ ...adv.skill, ap: 4, adv: true }] : [])];
  const doCommand = (c) => {
    if (busy.current || dying || result || ap < c.ap) return;
    setAp(ap - c.ap);
    const b0 = cmdBase();
    if (c.id === "power") hitBoss(b0 * 3, `⚔ ${HERO_NAME}の渾身の一撃！`);
    else if (c.id === "heal") { const v = Math.round(maxHp * 0.3); setHp(Math.min(maxHp, hp + v)); SFX.play("holy"); addLog(`💚 癒やしの祈り。HPが${v}回復した`); }
    else if (c.id === "guard") { setGuard(2); SFX.play("holy"); addLog("🛡 守りの構え！ 次の2回、受けるダメージが半分に"); }
    else if (c.id === "joint") hitBoss(b0 * 4, `🤝 ${HERO_NAME}と${party[0].a.name}の連携技！`);
    else if (c.id === "meteor") hitBoss(b0 * 4, "☄ メテオフォール！");
    else if (c.id === "aegis") { const v = Math.round(maxHp * 0.4); setHp(Math.min(maxHp, hp + v)); setGuard(3); SFX.play("holy"); addLog(`🛡 聖盾の祈り。HPが${v}回復し、次の3回を守る`); }
    else if (c.id === "arrows") hitBoss(b0 * 2.5, "🏹 千本の矢！", { pierce: true });
    else if (c.id === "brave") hitBoss(b0 * 3, "✨ ブレイブスラッシュ！", { breakShield: true });
  };
  const useScroll = () => { if (busy.current || dying || !(((r.brew || {}).scroll || 0) > 0)) return; actions.useBrew("scroll"); hitBoss(cmdBase() * 2.5, "📜 攻撃の巻物を読み上げた！"); };
  const useWeaken = () => { if (busy.current || dying || weaken || !(((r.brew || {}).weaken || 0) > 0)) return; actions.useBrew("weaken"); setWeaken(true); SFX.play("magicHit"); addLog(`⚗ 弱体の薬！ ${boss.name}の攻撃が30%弱まった`); };
  const usePotion = () => {
    if (!(r.consumables.potion > 0) || hp >= maxHp) return;
    actions.useConsumable("potion");
    setHp(Math.min(maxHp, hp + 40));
    addLog("🧪 回復薬を使った！ HPが40回復した");
  };

  const bar = (v, max, color) => (
    <div style={{ height: 10, background: "rgba(53,65,86,0.1)", border: "1px solid var(--rule-soft)" }}>
      <div style={{ width: `${Math.max(0, (v / max) * 100)}%`, height: "100%", background: color, transition: "width .4s" }} />
    </div>
  );

  if (result) {
    const it = result.itemId ? rpgItemById(result.itemId) : null;
    return (
      <Box title={result.won ? "勝利！" : "敗北…"} icon={result.won ? <Award size={18} /> : <Skull size={18} />}>
        <div className="text-center py-3">
          <div className="text-6xl mb-2" style={{ filter: result.won ? "grayscale(1) opacity(0.4)" : "none" }}><GameIcon ch={boss.icon} id={boss.id} art={boss.art} size={76} boss /></div>
          <div className="jp text-base mb-2" style={{ color: result.won ? "var(--sage)" : "var(--brick)" }}>
            {result.won ? `${boss.label}を倒した！` : result.fled ? `${boss.label}は逃げていった…` : "力尽きてしまった…"}
          </div>
          <div className="pixel text-sm" style={{ color: "var(--gold)" }}>+{result.gold} G{result.xp ? ` ・ +${result.xp} EXP` : ""}</div>
          {it && (
            <div className="mt-3 p-2 inline-block" style={{ border: `2px solid ${RARITY[it.rarity].color}`, background: "var(--paper)" }}>
              <div className="jp text-[10px]" style={{ color: "var(--ink-mute)" }}>戦利品</div>
              <div className="flex justify-center my-1"><GameIcon ch={it.icon} id={it.id} rarity={it.rarity} size={48} /></div>
              <div className="jp text-sm" style={{ color: "var(--ink)" }}>{it.name} <RpgRarityTag rarity={it.rarity} /></div>
              <div className="jp text-[10px]" style={{ color: "var(--sky-deep)" }}>{fxText(it.fx)}</div>
            </div>
          )}
          {result.won && <div className="mt-3"><TreasureChest tier={chest} size={72} /></div>}
          {!result.won && <p className="jp text-[11px] mt-3" style={{ color: "var(--ink-soft)" }}>出題された問題は苦手として記録されています。復習してから再挑戦しましょう。</p>}
        </div>
        <button onClick={onExit} className="jp btn-primary w-full py-2">拠点に戻る</button>
      </Box>
    );
  }

  return (
    <div className="space-y-3">
      <style>{`@keyframes sqShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}.sq-shake{animation:sqShake .45s}`}</style>
      <div className="flex items-center justify-between">
        <button onClick={() => { if (confirm("戦いから逃げますか？（敗北として記録されます）")) finish(false, true); }} className="jp text-xs flex items-center gap-1" style={{ color: "var(--ink-soft)" }}><XIcon size={14} /> 逃げる</button>
        <div className="pixel text-xs" style={{ color: "var(--brick)" }}>⚔ {idx + 1}/{pool.length}</div>
      </div>
      <BossArena state={state} boss={boss} bossHp={bossHp} hp={hp} maxHp={maxHp} fx={fx} combo={combo} dying={dying} party={party} assist={assist} charging={charging} phase2={phase2} shield={shield} taunt={taunt} />
      <div className="flex items-stretch gap-2">
        <div className="jp text-[11px] p-1.5 flex-1" style={{ background: "var(--cream)", color: "var(--ink)", minHeight: 40, border: "1px solid var(--rule-soft)", borderRadius: 8 }}>
          {log.map((l, i) => <div key={i} style={{ opacity: i === log.length - 1 ? 1 : 0.55 }}>{l}</div>)}
        </div>
        <button disabled={!(r.consumables.potion > 0) || hp >= maxHp || !!dying} onClick={usePotion} className="jp text-[11px] px-2 btn-ghost flex-shrink-0">🧪×{r.consumables.potion || 0}</button>
      </div>
      {/* コマンド（2026年10月26日） */}
      <div className="jp px-2 py-1.5" style={{ background: "var(--paper)", border: "1px solid var(--gold)", borderRadius: 8 }}>
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          <span className="text-[11px]" style={{ fontWeight: 800, color: "var(--ink)" }}>⚡ 行動ポイント</span>
          <span className="flex gap-0.5">{Array.from({ length: AP_MAX }, (_, i) => <span key={i} style={{ width: 12, height: 12, borderRadius: 3, background: i < ap ? "linear-gradient(180deg, #f2c14e, #b08a3e)" : "var(--beige)", border: "1px solid #d6b56a" }} />)}</span>
          <span className="text-[10px]" style={{ color: "var(--ink-mute)" }}>正解で+1（◎は+2）</span>
          {guard > 0 && <span className="text-[10px]" style={{ color: "#4f6fa8", fontWeight: 800 }}>🛡守り×{guard}</span>}
          {weaken && <span className="text-[10px]" style={{ color: "#6c5a96", fontWeight: 800 }}>⚗弱体中</span>}
          {tame && <span className="text-[10px]" style={{ color: "#6c5a96" }}>🐾{tame.name}</span>}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
          {cmds.map((c) => (
            <button key={c.id} disabled={ap < c.ap || !!dying} onClick={() => doCommand(c)} className="text-left px-1.5 py-1" style={{ borderRadius: 6, border: `1px solid ${c.adv ? "#b08a3e" : "var(--rule-soft)"}`, background: ap >= c.ap ? (c.adv ? "linear-gradient(90deg, #f6ead0, #fdfbf5)" : "var(--cream)") : "var(--paper)", opacity: ap >= c.ap ? 1 : 0.5, cursor: ap >= c.ap ? "pointer" : "default", color: "var(--ink)" }}>
              <span className="block text-[11px]" style={{ fontWeight: 800 }}>{c.icon} {c.name}</span>
              <span className="block text-[9px]" style={{ color: "var(--ink-mute)" }}>{c.ap}AP・{c.text}</span>
            </button>
          ))}
        </div>
        {(((r.brew || {}).scroll || 0) > 0 || ((r.brew || {}).weaken || 0) > 0) && (
          <div className="flex gap-1 mt-1">
            <button disabled={!(((r.brew || {}).scroll || 0) > 0) || !!dying} onClick={useScroll} className="btn-ghost text-[10px] px-2 py-0.5">📜 攻撃の巻物×{(r.brew || {}).scroll || 0}</button>
            <button disabled={!(((r.brew || {}).weaken || 0) > 0) || weaken || !!dying} onClick={useWeaken} className="btn-ghost text-[10px] px-2 py-0.5">⚗ 弱体の薬×{(r.brew || {}).weaken || 0}</button>
          </div>
        )}
      </div>
      {q ? (
        <div className="rpg-box p-1">
          <div className="rpg-inner-border min-h-[160px] flex flex-col">
            <div className="jp text-[10px] mb-2" style={{ color: "var(--ink-mute)" }}>{item.bankName}</div>
            <div className="qtext jp text-base md:text-lg flex-1 break-words" style={{ color: "var(--ink)" }}>{renderQText(q.q, q.q_formats, q.a)}</div>
            <QuestionImages bankId={item.bankId} question={q} side="q" />
            {showAnswer ? (
              <>
                <div className="jp text-[10px] mt-3 mb-1" style={{ color: "var(--gold)" }}>答え</div>
                <div className="qtext jp text-base md:text-lg break-words p-2" style={{ background: "var(--sky-pale)", border: "1px solid var(--gold)", color: "var(--ink)" }}>{renderFormattedText(q.a, q.a_formats)}</div>
                <QuestionImages bankId={item.bankId} question={q} side="a" />
                <LawRefChips q={q} />
                <AnswerPanel onAnswer={answer} question={q} srSettings={effectiveSr(state)} correctLabel="攻撃" wrongLabel="不正解" />
              </>
            ) : (
              <RevealButton q={q} onReveal={() => setShowAnswer(true)} />
            )}
          </div>
        </div>
      ) : (
        <p className="jp text-xs" style={{ color: "var(--ink-mute)" }}>問題が見つかりません。</p>
      )}
    </div>
  );
}

// ── ルーン（冒険の拠点）──
function RunePanel({ state, actions }) {
  const r = normRpg(state.rpg);
  const [slot, setSlot] = useState(null);
  const rs = [...(r.runes || [])]; while (rs.length < RUNE_SLOTS) rs.push(null);
  return (
    <Box title="ルーン" icon={<StarIcon size={18} />}>
      <div className="jp space-y-2">
        <p className="text-[11px]" style={{ color: "var(--ink-soft)", lineHeight: 1.7 }}>欠片{RUNE_FRAG}つと{RUNE_GOLD}Gでルーンを作り、3つの枠にはめます。その科目の問題で、1つにつきダメージ+{Math.round(RUNE_DMG * 100)}%（ボス戦は会心率も+{RUNE_CRIT}%）。同じルーンを重ねると強くなります。</p>
        <div className="grid grid-cols-3 gap-1.5">
          {rs.map((m, i) => (
            <button key={i} onClick={() => setSlot(slot === i ? null : i)} className="px-1 py-2 text-center" style={{ borderRadius: 10, border: `1.5px solid ${slot === i ? "var(--gold)" : m ? "#7fa3d8" : "var(--rule-soft)"}`, background: m ? "linear-gradient(180deg, #eef3fb, var(--paper))" : "var(--paper)", cursor: "pointer", color: "var(--ink)" }}>
              <span className="block" style={{ fontSize: 22 }}>{m ? "💠" : "◇"}</span>
              <span className="block text-[11px]" style={{ fontWeight: 800 }}>{m ? runeName(m) : `枠${i + 1}（空き）`}</span>
              {m && <span className="block text-[9px]" style={{ color: "var(--ink-mute)" }}>{runeRegions(m).join("・")}</span>}
            </button>
          ))}
        </div>
        {slot !== null && (
          <div className="grid gap-1 sm:grid-cols-2">
            {FRAG_IDS.map((id) => {
              const have = (r.materials || {})[id] || 0, ok = have >= RUNE_FRAG && r.gold >= RUNE_GOLD;
              return (
                <button key={id} disabled={!ok} onClick={() => { actions.setRune(slot, id); setSlot(null); }} className="text-left px-2 py-1" style={{ borderRadius: 8, border: "1px solid var(--rule-soft)", background: "var(--paper)", opacity: ok ? 1 : 0.5, cursor: ok ? "pointer" : "default", color: "var(--ink)" }}>
                  <span className="block text-[12px]" style={{ fontWeight: 800 }}>💠 {runeName(id)}<span className="text-[10px] ml-1" style={{ color: "var(--ink-mute)", fontWeight: 500 }}>（{(matById(id) || {}).name} {have}/{RUNE_FRAG}）</span></span>
                  <span className="block text-[10px]" style={{ color: "var(--ink-soft)" }}>{runeRegions(id).join("・") || "—"}の問題で力を発揮</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Box>
  );
}
// ── 魔物の仲間（冒険の拠点）──
function TamePanel({ state, actions }) {
  const r = normRpg(state.rpg);
  const list = Object.keys(r.tamed || {}).map(monSpecies).filter(Boolean);
  const kills = r.kills || {};
  const near = [...MON_PAINTED, ...MON_BOSS].filter((x) => !(r.tamed || {})[x.img] && (kills[x.img] || 0) > 0).sort((a, b) => (kills[b.img] || 0) - (kills[a.img] || 0)).slice(0, 3);
  return (
    <Box title="魔物の仲間" icon={<Sword size={18} />}>
      <div className="jp space-y-2">
        <p className="text-[11px]" style={{ color: "var(--ink-soft)", lineHeight: 1.7 }}>同じ種類の魔物を{TAME_AT}体倒すと、仲間になりたそうにこちらを見て、仲間になります。1体を連れていくと、ボス戦で{TAME_EVERY}連撃ごとに加勢してくれます（与えたダメージの{Math.round(TAME_DMG * 100)}%）。</p>
        {list.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
            {list.map((x) => { const on = r.tameActive === x.img; return (
              <button key={x.img} onClick={() => actions.setTame(x.img)} className="text-center px-1 py-1" style={{ borderRadius: 10, border: `1.5px solid ${on ? "var(--gold)" : "var(--rule-soft)"}`, background: on ? "var(--cream)" : "var(--paper)", cursor: "pointer", color: "var(--ink)" }}>
                <span className="flex justify-center"><MonPic m={{ sp: x }} size={48} /></span>
                <span className="block text-[10px] truncate" style={{ fontWeight: 800 }}>{on ? "🐾 " : ""}{x.name}</span>
                <span className="block text-[9px]" style={{ color: "var(--ink-mute)" }}>{on ? "連れている" : "連れていく"}</span>
              </button>
            ); })}
          </div>
        ) : <p className="text-[11px]" style={{ color: "var(--ink-mute)" }}>まだ仲間になった魔物はいません。</p>}
        {near.length > 0 && <div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>もうすぐ：{near.map((x) => `${x.name} ${kills[x.img]}/${TAME_AT}`).join("　")}</div>}
      </div>
    </Box>
  );
}
// ── 調合（鍛冶場）──
function AlchemyPanel({ state, actions }) {
  const r = normRpg(state.rpg);
  const frags = fragCount(r.materials), stars = (r.materials || {})["m-star"] || 0;
  const have = (id) => (id === "potion" ? r.consumables.potion || 0 : (r.brew || {})[id] || 0);
  return (
    <Box title="調合" icon={<Pencil size={18} />}>
      <div className="jp space-y-1.5">
        <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>余った欠片（多いものから使います）と星霊石で、ボス戦の道具をつくります。いま：欠片 {frags}個・星霊石 {stars}個</p>
        {BREW_RECIPES.map((rc) => {
          const ok = frags >= rc.frag && stars >= rc.star && r.gold >= rc.gold;
          return (
            <div key={rc.id} className="flex items-center gap-2 px-2 py-1.5" style={{ borderRadius: 8, border: "1px solid var(--rule-soft)", background: "var(--paper)" }}>
              <span style={{ fontSize: 20 }}>{rc.icon}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-[12px]" style={{ fontWeight: 800, color: "var(--ink)" }}>{rc.name}<span className="text-[10px] ml-1" style={{ color: "var(--ink-mute)", fontWeight: 500 }}>持っている {have(rc.id)}</span></span>
                <span className="block text-[10px]" style={{ color: "var(--ink-soft)" }}>{rc.text}　／　欠片{rc.frag}{rc.star ? `・星霊石${rc.star}` : ""}{rc.gold ? `・${rc.gold}G` : ""}</span>
              </span>
              <button disabled={!ok} onClick={() => actions.brew(rc.id)} className="btn-primary text-[11px] px-2.5 py-1" style={{ opacity: ok ? 1 : 0.45 }}>つくる</button>
            </div>
          );
        })}
      </div>
    </Box>
  );
}
// ── 迷いの森（2026年10月26日）：1日1回の探索。分かれ道で部屋を選び、6層の最深部の森の主をめざす。ハートが0で終わり（集めたものはもらえる）。rpg.forest = {d, best, clears, last} ──
const FOREST_FLOORS = 6, FOREST_HEARTS = 3;
const FOREST_ROOMS = {
  battle: { icon: "⚔", name: "魔物の部屋", text: "3問で2問正解", n: 3, pass: 0.6, gold: 30, frag: 1, xp: 10 },
  elite: { icon: "💀", name: "強敵の部屋", text: "5問で4問正解・報酬が多い", n: 5, pass: 0.8, gold: 80, star: 1, xp: 25 },
  chest: { icon: "🎁", name: "宝箱の部屋", text: "ゴールドや欠片" },
  spring: { icon: "⛲", name: "癒やしの泉", text: "ハートが1つ回復" },
  event: { icon: "❓", name: "ふしぎな部屋", text: "なにかが起こる" },
  boss: { icon: "👑", name: "森の主", text: "6問で4問正解", n: 6, pass: 0.6, gold: 200, sage: 1, xp: 80 },
};
function forestMap(day) {
  const rnd = (k) => (hashStr(`${day}:${k}`) % 1000) / 1000;
  const pick = (f, sd) => { if (f === 0) return sd ? "chest" : "battle"; const x = rnd(`${f}-${sd}`); return x < 0.4 ? "battle" : x < 0.55 ? "elite" : x < 0.7 ? "chest" : x < 0.85 ? "spring" : "event"; };
  return Array.from({ length: FOREST_FLOORS }, (_, f) => (f === FOREST_FLOORS - 1 ? ["boss"] : [pick(f, 0), pick(f, 1)]));
}
function ForestCard({ state, onStart }) {
  const fr = normRpg(state.rpg).forest || {};
  const done = fr.d === todayStr();
  return (
    <Box title="迷いの森" icon={<Castle size={18} />}>
      <div className="jp space-y-1.5">
        <p className="text-[11px]" style={{ color: "var(--ink-soft)", lineHeight: 1.7 }}>1日1回の探索。分かれ道で部屋を選びながら、{FOREST_FLOORS}層の最深部にいる森の主をめざします。魔物・強敵・宝箱・癒やしの泉・ふしぎな部屋……毎日ちがう森になります。ハート{FOREST_HEARTS}つがなくなったら終わり（集めたものはもらえます）。</p>
        <div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>最深 {fr.best || 0}層・森の主の討伐 {fr.clears || 0}回{fr.last && fr.d === todayStr() ? `　／　今日：${fr.last.cleared ? "森の主を倒した！" : `${fr.last.floor}層まで`}（${fr.last.gold}G）` : ""}</div>
        <button disabled={done} onClick={onStart} className="btn-primary w-full py-2 text-sm" style={{ opacity: done ? 0.5 : 1 }}>{done ? "今日の探索は終わりました（また明日）" : "🌲 森に入る"}</button>
      </div>
    </Box>
  );
}
function ForestRun({ state, actions, recordAnswer, startTimer, stopTimer, onExit }) {
  const day = todayStr();
  const [map] = useState(() => forestMap(day));
  const [run, setRun] = useState({ floor: 0, hearts: FOREST_HEARTS, path: [], loot: { gold: 0, mats: {}, xp: 0 }, msg: "森の入り口に立った。道が二手に分かれている……", blessed: false, over: null });
  const [battle, setBattle] = useState(null); // { type, pool, pass }
  const passedRef = useRef(null);
  const sc = studyScope(state);
  const banks = state.questionBanks.filter((b) => sc.inScope(b));
  const end = (cur, cleared) => {
    const nx = { ...cur, over: cleared ? "clear" : "down" };
    setRun(nx);
    actions.forestFinish({ cleared, floor: cleared ? FOREST_FLOORS : cur.floor, loot: cur.loot });
  };
  const addLoot = (lt, add) => {
    const mats = { ...lt.mats };
    Object.entries(add.mats || {}).forEach(([k, v]) => { mats[k] = (mats[k] || 0) + v; });
    return { gold: lt.gold + (add.gold || 0), mats, xp: lt.xp + (add.xp || 0) };
  };
  const fragOf = (k) => FRAG_IDS[hashStr(`${day}:${k}`) % FRAG_IDS.length];
  const enter = (type, side) => {
    const room = FOREST_ROOMS[type];
    const path = [...run.path, side];
    if (room.n) {
      const pool = buildPoolFromBanks(banks, room.n);
      if (!pool.length) { setRun({ ...run, msg: "出題できる問題がありません。" }); return; }
      passedRef.current = null;
      setBattle({ type, pool, pass: Math.max(0.34, room.pass - (run.blessed ? 0.2 : 0)), path });
      return;
    }
    let cur = { ...run, path, floor: run.floor + 1 };
    if (type === "chest") {
      const g = 30 + (hashStr(`${day}:c${run.floor}`) % 71), fr = fragOf(`cf${run.floor}`);
      cur = { ...cur, loot: addLoot(run.loot, { gold: g, mats: { [fr]: 2 } }), msg: `🎁 宝箱を開けた！ ${g}Gと${(matById(fr) || {}).name}×2` };
    } else if (type === "spring") {
      cur = run.hearts < FOREST_HEARTS ? { ...cur, hearts: run.hearts + 1, msg: "⛲ 癒やしの泉。ハートが1つ回復した" } : { ...cur, loot: addLoot(run.loot, { gold: 20 }), msg: "⛲ 癒やしの泉。元気いっぱいなので、泉の底の20Gを拾った" };
    } else if (type === "event") {
      const x = hashStr(`${day}:e${run.floor}`) % 3;
      cur = x === 0 ? { ...cur, loot: addLoot(run.loot, { gold: 50 }), msg: "🧳 旅の商人に道を教えたら、お礼に50Gをもらった" }
        : x === 1 ? { ...cur, blessed: true, msg: "🗿 古い石碑の祝福。次の戦いの突破ラインが下がる" }
        : { ...cur, loot: addLoot(run.loot, { mats: { "m-star": 1 } }), msg: "✨ 木の根元で光る石を見つけた。星霊石×1" };
    }
    setRun(cur);
  };
  const leaveBattle = () => {
    const b = battle; if (!b) return;
    const room = FOREST_ROOMS[b.type];
    const ok = passedRef.current === true;
    setBattle(null);
    let cur = { ...run, path: b.path, floor: run.floor + 1, blessed: false };
    if (ok) {
      const add = { gold: room.gold, xp: room.xp, mats: { ...(room.frag ? { [fragOf(`bf${run.floor}`)]: room.frag } : {}), ...(room.star ? { "m-star": room.star } : {}), ...(room.sage ? { "m-sage": room.sage } : {}) } };
      cur = { ...cur, loot: addLoot(run.loot, add), msg: `${room.icon} ${room.name}を突破！ ${room.gold}G${room.star ? "・星霊石" : ""}${room.sage ? "・賢者の結晶" : ""}` };
      if (b.type === "boss") { end(cur, true); return; }
    } else {
      cur = { ...cur, hearts: run.hearts - 1, msg: `💔 ${room.name}で押し返された……ハートが1つ減った` };
      if (cur.hearts <= 0 || b.type === "boss") { end(cur, false); return; }
    }
    setRun(cur);
  };
  if (battle) {
    const room = FOREST_ROOMS[battle.type];
    return <TrialRun key={`fb-${run.floor}-${battle.type}`} state={state} recordAnswer={recordAnswer} startTimer={startTimer} stopTimer={stopTimer}
      run={{ kind: room.name, title: `迷いの森 第${run.floor + 1}層　${room.icon} ${room.name}`, sub: `${room.text}${run.blessed ? "（石碑の祝福で突破ラインが下がっている）" : ""}`, pool: battle.pool, pass: battle.pass, boss: battle.type === "battle" ? "last" : "all", scene: STAGE_URL(battle.type === "boss" ? "lava" : "meadow") }}
      onFinish={(acc) => { passedRef.current = acc >= battle.pass; return {}; }}
      onExit={leaveBattle} nextLabel="森を進む" onNext={leaveBattle} />;
  }
  const hearts = "❤".repeat(Math.max(0, run.hearts)) + "🤍".repeat(Math.max(0, FOREST_HEARTS - run.hearts));
  const lootText = `${run.loot.gold}G${Object.entries(run.loot.mats).map(([k, v]) => `・${(matById(k) || {}).name}×${v}`).join("")}${run.loot.xp ? `・EXP${run.loot.xp}` : ""}`;
  return (
    <div className="jp space-y-3">
      <div className="flex items-center justify-between text-xs">
        <button onClick={() => { if (run.over) { onExit(); return; } if (confirm("森を出ますか？（ここまで集めたものは受け取れます。今日の探索は終わりになります）")) { end(run, false); } }} style={{ color: "var(--ink-soft)" }}>← {run.over ? "もどる" : "森を出る"}</button>
        <span style={{ fontWeight: 800, color: "var(--ink)" }}>{hearts}</span>
      </div>
      <div className="relative overflow-hidden px-3 py-3" style={{ borderRadius: 12, border: "1.5px solid #6d8454", background: `linear-gradient(180deg, rgba(20,40,28,0.55), rgba(20,40,28,0.75)), url(${STAGE_URL("meadow")}) center/cover`, color: "#eef6ea" }}>
        <div style={{ fontFamily: "'Shippori Mincho B1', serif", fontWeight: 900, fontSize: 18 }}>🌲 迷いの森{run.over ? "" : `　第${Math.min(FOREST_FLOORS, run.floor + 1)}層 / ${FOREST_FLOORS}`}</div>
        <div className="text-[12px] mt-1">{run.msg}</div>
        <div className="text-[10px] mt-1" style={{ color: "#cfe3c8" }}>集めたもの：{lootText}</div>
      </div>
      {run.over ? (
        <Box title={run.over === "clear" ? "森の主を倒した！" : "探索おわり"} icon={<Award size={18} />}>
          <div className="text-center py-2">
            <div className="text-[13px]" style={{ fontWeight: 800, color: "var(--ink)" }}>{run.over === "clear" ? "最深部の森の主を討ち取りました！" : `${run.floor}層まで進みました`}</div>
            <div className="text-[12px] mt-1" style={{ color: "var(--gold)", fontWeight: 800 }}>受け取ったもの：{lootText}</div>
          </div>
          <button onClick={onExit} className="btn-primary w-full py-2">もどる</button>
        </Box>
      ) : (
        <div className="space-y-1.5">
          {map.map((rooms, f) => f).reverse().map((f) => {
            const rooms = map[f];
            const cur = f === run.floor, past = f < run.floor;
            return (
              <div key={f} className="flex items-center gap-2">
                <span className="text-[10px] w-10 text-right" style={{ color: cur ? "var(--ink)" : "var(--ink-mute)", fontWeight: cur ? 800 : 500 }}>{f + 1}層</span>
                <div className={`flex-1 grid ${rooms.length > 1 ? "grid-cols-2" : "grid-cols-1"} gap-1.5`}>
                  {rooms.map((type, sd) => {
                    const rm = FOREST_ROOMS[type];
                    const chosen = past && run.path[f] === sd;
                    if (cur) return (
                      <button key={sd} onClick={() => enter(type, sd)} className="text-left px-2 py-2" style={{ borderRadius: 10, border: "1.5px solid var(--gold)", background: "linear-gradient(90deg, #f6ead0, #fdfbf5)", cursor: "pointer", color: "var(--ink)" }}>
                        <span className="block text-[13px]" style={{ fontWeight: 800 }}>{rm.icon} {rm.name}</span>
                        <span className="block text-[10px]" style={{ color: "var(--ink-soft)" }}>{rm.text}</span>
                      </button>
                    );
                    return (
                      <div key={sd} className="px-2 py-1.5 text-[11px]" style={{ borderRadius: 10, border: `1px ${past ? "solid" : "dashed"} var(--rule-soft)`, background: chosen ? "var(--cream)" : "var(--paper)", color: past ? (chosen ? "var(--ink)" : "var(--ink-mute)") : "var(--ink-mute)", opacity: past && !chosen ? 0.5 : 1 }}>
                        {past ? `${chosen ? "✓ " : ""}${rm.icon} ${rm.name}` : f === FOREST_FLOORS - 1 ? "👑 ？？？" : "🌫 霧で見えない"}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
const BOSS_STAGE = { slimeking: "meadow", wisp: "ruins", lunawolf: "snow", ghost: "crystal", magolem: "crystal", armor: "sunset", darkdragon: "lava", grimoire: "crystal", elderweed: "meadow" };
const BOSS_SCENES = { slimeking: "tower/zone4.jpg", wisp: "tower/zone4.jpg", lunawolf: "tower/zone4.jpg", ghost: "tower/zone1.jpg", magolem: "tower/zone1.jpg", armor: "tower/zone1.jpg", darkdragon: "tower/zone2.jpg", grimoire: "tower/zone3.jpg", elderweed: "tower/layer01.jpg" };
const BOSS_CSS = `
@keyframes sqyCharge{to{transform:rotate(360deg)}}
@keyframes sqyFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-6px) scale(1.015)}}
@keyframes sqyAura{0%,100%{opacity:.45;transform:scale(1)}50%{opacity:.9;transform:scale(1.07)}}
@keyframes sqyDie{0%{opacity:1;filter:brightness(1)}20%{filter:brightness(3) saturate(.3)}100%{opacity:0;transform:scale(1.25) translateY(-10px);filter:brightness(4) blur(6px)}}
@keyframes sqyWin{0%{opacity:0;transform:translate(-50%,-50%) scale(2.4);letter-spacing:.6em}25%{opacity:1;transform:translate(-50%,-50%) scale(1);letter-spacing:.2em}100%{opacity:1;transform:translate(-50%,-50%) scale(1)}}
@keyframes sqyRays{0%{opacity:0;transform:translate(-50%,-50%) rotate(0) scale(.4)}30%{opacity:.85}100%{opacity:.5;transform:translate(-50%,-50%) rotate(40deg) scale(1.2)}}
@keyframes sqyDark{0%{opacity:0}100%{opacity:.75}}
`;
function BossArena({ state, boss, bossHp, hp, maxHp, fx, combo, dying, party = [], assist = null, charging = false, phase2 = false, shield = null, taunt = null }) {
  const arenaRef = useRef(null);
  useEffect(() => { if (fx || dying) bringIntoView(arenaRef.current); }, [fx && fx.n, dying]);
  const theme = (state.displaySettings && state.displaySettings.theme) || "white";
  const P = BATTLE_THEME[theme] || BATTLE_THEME.white;
  const bg = BOSS_STAGE[boss.art] ? STAGE_URL(BOSS_STAGE[boss.art]) : boss.id === "maou" ? STAGE_URL("lava") : `${ART_URL}${BOSS_SCENES[boss.art] || "scene.jpg"}`;
  const region = typeof boss.region === "string" ? boss.region : boss.region && boss.region.name;
  const bossPct = Math.max(0, Math.min(1, bossHp / boss.hp)), myPct = Math.max(0, Math.min(1, hp / maxHp));
  const enraged = bossHp > 0 && bossPct < 0.3;
  const t = (fx && fx.t) || 0;
  const H = ["40%", "calc(100% - 96px)"], M = ["calc(92% - 108px)", "calc(94% - 108px)"];
  const cp = combatPower(state);
  // 味方の後衛（仲間）と、敵の後衛（ボスの手下。見た目だけ）
  const slots = backRow(party, 128);
  const originOf = (id) => slotOrigin(slots, id);
  const minions = [0, 1].map((k) => MON_PAINTED[(hashStr(String(boss.id) + (boss.art || "")) + k * 7) % MON_PAINTED.length]);
  // 主人公の表情（白金テーマ）：ふだんは真剣、会心で笑顔、攻撃を受けると驚き
  const face = theme === "white" ? HERO_FACES[dying === "boss" ? "smile" : fx && fx.side === "mon" ? "surprise" : fx && fx.crit ? "smile" : "serious"] : null;
  const bossAnim = dying === "boss" ? "sqyDie 1.2s ease-in forwards"
    : fx && fx.side === "hero" ? `sqxKnock .3s ease-out ${t}s`
    : fx && fx.side === "mon" && ["tackle", "bite", "claw"].includes(fx.atk.kind) ? "sqxLungeL .34s ease-in-out" : "sqyFloat 3s ease-in-out infinite";
  const bar = (pct, color, h = 9) => <div style={{ height: h, borderRadius: h, background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.35)", overflow: "hidden" }}><div style={{ width: `${pct * 100}%`, height: "100%", background: color, transition: "width .45s ease-out", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45)" }} /></div>;
  return (
    <div ref={arenaRef} className="relative overflow-hidden select-none" style={{ height: 310, borderRadius: 10, border: "1px solid #b08a3e", background: `linear-gradient(0deg, rgba(10,16,32,0.6) 0%, rgba(10,16,32,0.05) 45%, rgba(10,16,32,0.3) 100%), url(${bg}) center/cover no-repeat`, boxShadow: "0 8px 22px rgba(20,28,50,0.25)", animation: fx ? (fx.side === "mon" ? `sqxQuake .42s ease-out ${t}s` : fx.crit ? `sqxPunch .3s ease-out ${t}s` : undefined) : undefined }}>
      <style>{BATTLE_CSS + BATTLE_FX_CSS + BOSS_CSS + LUNA_CSS}</style>
      {/* 第2形態の知らせ・自分の体力が3割を切ったら赤いふち */}
      {phase2 && !dying && <div key="ph2" className="jp" style={{ position: "absolute", left: 0, right: 0, top: "40%", zIndex: 8, textAlign: "center", fontFamily: "'Shippori Mincho B1', serif", fontWeight: 900, fontSize: 22, color: "#f3d9ff", textShadow: "0 0 12px rgba(150,60,200,0.95), 0 2px 0 #2a1040", animation: "sqcPhase 2.2s ease-out both", pointerEvents: "none" }}>第2形態　{boss.name}の本気</div>}
      {myPct < 0.3 && hp > 0 && <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 7, animation: "sqcLow 1.1s ease-in-out infinite" }} />}
      <div style={{ position: "absolute", inset: 0, background: "inherit", transformOrigin: "70% 60%", animation: fx && fx.side === "hero" && fx.big ? `sqxCam ${fx.cut ? 1.5 : 1}s ease-out ${t}s` : undefined }}>
      {fx && fx.side === "hero" && fx.big && <div key={`dim${fx.n}`} style={{ position: "absolute", inset: 0, background: "rgba(6,10,28,0.45)", animation: `sqxDim ${fx.cut ? 1.6 : 1.05}s ease-out both`, pointerEvents: "none" }} />}
      <Ambient region={region} kind={boss.id === "maou" || boss.art === "darkdragon" ? "fire" : ["grimoire", "ghost", "magolem"].includes(boss.art) ? "dark" : null} n={18} seed={hashStr(boss.id + (boss.art || ""))} />
      <SkyLayer seed={hashStr(boss.id + (boss.art || ""))} />
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: enraged ? "radial-gradient(ellipse at 70% 45%, transparent 40%, rgba(160,30,30,0.35) 100%)" : "radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(10,16,32,0.35) 100%)", animation: enraged ? "sqxPulse 1.4s ease-in-out infinite" : undefined }} />
      {/* ボスの名前と HP */}
      <div className="jp" style={{ position: "absolute", right: 10, top: 8, width: "48%", zIndex: 2 }}>
        <div className="flex items-center gap-1.5" style={{ color: "#fdfbf5", textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
          <span className="text-xs truncate flex-1" style={{ fontWeight: 800 }}>{boss.label}</span>
          {enraged && <span className="text-[9px] px-1.5" style={{ background: "#a02828", borderRadius: 999, fontWeight: 800, animation: "sqxPulse 1s ease-in-out infinite" }}>怒り</span>}
          {charging && !dying && <span className="text-[9px] px-1.5" style={{ background: "#5a1d6e", borderRadius: 999, fontWeight: 800, animation: "sqxPulse .7s ease-in-out infinite" }}>溜め中</span>}
        </div>
        {bar(bossPct, enraged ? "linear-gradient(90deg, #7a1414, #e04848)" : "linear-gradient(90deg, #a24a45, #e0948a)")}
        <div className="text-[9px] text-right" style={{ color: "#fdfbf5", textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>HP {bossHp}/{boss.hp}</div>
      </div>
      {/* ボス */}
      {/* 敵の後衛（手下） */}
      {minions.map((mn, k) => (
        <div key={mn.img + k} style={{ position: "absolute", right: k ? "2%" : "44%", bottom: k ? "58%" : "52%", width: 74, height: 74, zIndex: 0, filter: "brightness(0.85) saturate(0.9)", animation: dying === "boss" ? "sqyDie 1.2s ease-in forwards" : fx && fx.side === "hero" && fx.crit ? `sqxKnock .3s ease-out ${t}s` : `sqyFloat ${2.6 + k * 0.5}s ease-in-out infinite` }}>
          <MonPic m={{ sp: mn }} size={74} />
        </div>
      ))}
      <div style={{ position: "absolute", right: "8%", bottom: "6%", width: 214, height: 214, zIndex: 1 }}>
        <div style={{ position: "absolute", inset: phase2 ? -24 : -14, borderRadius: "50%", background: `radial-gradient(circle, ${enraged ? "rgba(220,50,50,0.6)" : phase2 ? "rgba(150,60,200,0.5)" : "rgba(255,236,190,0.35)"} 0%, transparent 68%)`, animation: "sqyAura 2s ease-in-out infinite" }} />
        {shield && !dying && <div aria-hidden="true" style={{ position: "absolute", inset: -18, borderRadius: "50%", zIndex: 3, background: "radial-gradient(circle, rgba(140,200,255,0.05) 45%, rgba(140,200,255,0.35) 62%, rgba(200,230,255,0.75) 70%, transparent 72%)", border: "2px solid rgba(200,230,255,0.7)", boxShadow: "0 0 18px rgba(140,200,255,0.8), inset 0 0 22px rgba(140,200,255,0.5)", animation: "sqcShield 1.6s ease-in-out infinite", pointerEvents: "none" }} />}
        {shield && !dying && <div className="jp" style={{ position: "absolute", left: "50%", top: -6, transform: "translateX(-50%)", zIndex: 4, fontSize: 11, fontWeight: 900, color: "#0f2a4a", background: "rgba(220,238,255,0.95)", border: "1px solid #8fc8ff", borderRadius: 999, padding: "1px 9px", whiteSpace: "nowrap" }}>🔮 障壁　あと◎{shield.left}回</div>}
        {charging && !dying && <div style={{ position: "absolute", inset: -26, borderRadius: "50%", background: "repeating-conic-gradient(rgba(150,40,190,0.55) 0 12deg, transparent 12deg 30deg)", WebkitMaskImage: "radial-gradient(circle, transparent 30%, #000 45%, transparent 72%)", maskImage: "radial-gradient(circle, transparent 30%, #000 45%, transparent 72%)", animation: "sqyCharge 1.2s linear infinite" }} />}
        <div key={fx ? `b${fx.n}` : "b"} style={{ position: "absolute", inset: 0, animation: bossAnim }}>
          {boss.art
            ? MON_STAND.has(boss.art) ? <img src={monStandUrl(boss.art)} alt={boss.name} draggable={false} style={{ width: "100%", height: "100%", objectFit: "contain", filter: `drop-shadow(0 6px 6px rgba(0,0,0,0.4))${phase2 ? " hue-rotate(-28deg) saturate(1.5) contrast(1.12) drop-shadow(0 0 10px rgba(150,60,200,0.7))" : ""}${enraged ? " saturate(1.4) contrast(1.1)" : ""}`, animation: phase2 ? "sqcMorph 1s ease-out" : undefined }} /> : <div role="img" aria-label={boss.name} style={{ width: "100%", height: "100%", borderRadius: "50%", backgroundImage: `url(${MON_ART_URL}${boss.art}.jpg)`, backgroundSize: "cover", backgroundPosition: "center", WebkitMaskImage: MON_MASK, maskImage: MON_MASK, filter: enraged ? "saturate(1.4) contrast(1.1)" : undefined }} />
            : <div className="flex items-center justify-center" style={{ width: "100%", height: "100%" }}><GameIcon ch={boss.icon} id={boss.id} size={130} boss /></div>}
        </div>
        <div style={{ position: "absolute", left: "15%", right: "15%", bottom: -8, height: 12, borderRadius: "50%", background: "rgba(0,0,0,0.35)", filter: "blur(2px)" }} />
      </div>
      {/* ボスの挑発（はじめの数秒） */}
      {taunt && !dying && <div className="jp" style={{ position: "absolute", right: "6%", top: 46, maxWidth: "52%", zIndex: 6, fontSize: 11, fontWeight: 800, color: "#fdfbf5", background: "rgba(60,14,30,0.9)", border: "1px solid #e0948a", borderRadius: 10, padding: "4px 9px", lineHeight: 1.5, animation: "sqcTaunt 5.5s ease-out both", pointerEvents: "none" }}>{taunt.line}<div style={{ fontSize: 9, color: "#ffc2bc", fontWeight: 600 }}>この地域の問題に正解すると、言い返して1.5倍</div></div>}
      {/* 主人公（前衛） */}
      <div style={{ position: "absolute", left: "calc(40% - 86px)", bottom: -18, width: 214, height: 214, zIndex: 2 }}>
        <LunaSprite size={214} pose={dying === "me" ? "down" : dying === "boss" ? "win" : fx ? (fx.side === "hero" ? (fx.cut ? (fx.cut.ult ? "ult" : "skill") : "attack") : "hurt") : "idle"} delay={fx && fx.side === "mon" ? t : fx && fx.cut ? 0.6 : 0} k={fx ? fx.n : dying ? 999 : 0} aura={auraOf(state)} />
        {(() => { const pt = getPetInfo(state); return pt ? <span style={{ position: "absolute", left: 18, bottom: 22 }}><PetIcon pet={pt} size={26} /></span> : null; })()}
      </div>
      {/* 味方の HP・戦闘力（左上） */}
      <div className="jp" style={{ position: "absolute", left: 8, top: 8, width: "40%", zIndex: 3 }}>
        <div className="text-[10px]" style={{ color: "#fdfbf5", fontWeight: 800, textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>{HERO_NAME} Lv.{state.player.level}　<span style={{ color: "#f1dfae" }}>戦闘力 <span style={{ fontFamily: "'Cinzel', serif", fontSize: 12 }}>{cp.toLocaleString()}</span></span></div>
        {bar(myPct, myPct < 0.3 ? "linear-gradient(90deg,#a24a45,#e0948a)" : "linear-gradient(90deg,#4f8a72,#8cc4a8)", 8)}
        <div className="text-[9px]" style={{ color: "#fdfbf5", textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>HP {hp}/{maxHp}</div>
      </div>
      {/* 味方の後衛（仲間。加勢すると技を出す／光る） */}
      <BackRowAllies slots={slots} actingId={assist ? assist.p.a.id : null} actN={assist ? assist.n : 0} win={dying === "boss"} />
      {assist && (<>
        <div key={`as${assist.n}`} className="jp" style={{ position: "absolute", left: 10, top: 78, zIndex: 4, fontSize: 12, fontWeight: 800, color: "#fdfbf5", background: assist.heal ? "rgba(46,120,90,0.88)" : "rgba(60,40,110,0.88)", padding: "2px 10px", borderRadius: 4, border: "1px solid #d6b56a", animation: "sqxBanner 1.1s ease-out both", whiteSpace: "nowrap" }}>{assist.joint ? `🤝 ${HERO_NAME}＆${assist.p.a.name}「${assist.joint}」！` : `${assist.p.a.name}：${assist.p.skill.name}！`}</div>
        {assist.heal
          ? <><div key={`hl${assist.n}`} style={{ position: "absolute", left: H[0], top: H[1], width: 120, height: 120, marginLeft: -60, marginTop: -70, borderRadius: "50%", background: "radial-gradient(circle, rgba(170,255,200,0.7), rgba(120,220,160,0.25) 45%, transparent 70%)", animation: "sqxBoom .8s ease-out both", "--s": 1.4, pointerEvents: "none" }} />
              <div key={`hv${assist.n}`} style={{ position: "absolute", left: H[0], top: "calc(100% - 130px)", zIndex: 4, animation: "sqxNum 1s ease-out both", fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 22, color: "#8ff0b4", textShadow: "0 2px 0 #1d4a32", pointerEvents: "none" }}>+{assist.val}</div></>
          : <><AttackFx key={`af${assist.n}`} fx={{ n: assist.n + 0.5, side: "hero", atk: assist.p.skill.kind === "chase" ? { kind: "slash", n: 2, color: "#cfe3ff", glow: "rgba(127,182,255,0.95)" } : { kind: "magic", color: "#9a6cff", color2: "#e6d6ff" } }} H={originOf(assist.p.a.id)} M={M} />
              <div key={`av${assist.n}`} style={{ position: "absolute", left: M[0], top: "22%", zIndex: 4, animation: `sqxNum 1s ease-out ${assist.p.skill.kind === "chase" ? 0.05 : 0.3}s both`, fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 22, color: "#d9c6ff", textShadow: "0 2px 0 #2a1d4a", pointerEvents: "none" }}>{assist.val}</div></>}
      </>)}
      {/* 連撃 */}
      {combo >= 2 && !dying && <div key={`c${combo}`} style={{ position: "absolute", left: "calc(40% + 34px)", top: "30%", zIndex: 3, animation: "sqbPop .28s ease-out both", fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 20, color: "#f2c14e", textShadow: "0 0 10px rgba(242,193,78,0.8), 0 2px 0 #3a2a10" }}>{combo}<span style={{ fontSize: 11, marginLeft: 3 }}>HIT</span></div>}
      {/* 技の演出・名前・ダメージ */}
      {fx && <AttackFx key={`fx${fx.n}`} fx={fx} H={H} M={M} />}
      {fx && <SkillBanner fx={fx} top={52} />}
      {fx && fx.side === "hero" && <HitNumbers fx={fx} left={M[0]} top="30%" />}
      {fx && fx.side === "mon" && <div key={`d${fx.n}`} style={{ position: "absolute", left: H[0], top: "calc(100% - 130px)", zIndex: 4, animation: `sqxNum 1s ease-out ${t}s both`, fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 26, color: "#ff8a80", textShadow: "0 2px 0 #22335c, 0 0 8px rgba(0,0,0,0.6)", whiteSpace: "nowrap", pointerEvents: "none" }}>-{fx.dmg}</div>}
      {fx && fx.side === "mon" && <div key={`r${fx.n}`} style={{ position: "absolute", inset: 0, pointerEvents: "none", boxShadow: "inset 0 0 60px rgba(201,40,40,0.7)", animation: `sqbRed .55s ease-out ${t}s both` }} />}
      {fx && fx.crit && <div key={`w${fx.n}`} style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "rgba(255,248,220,0.75)", animation: `sqbFlash .3s ease-out ${t}s both` }} />}
      </div>
      {fx && fx.cut && <SkillCutIn key={`cut${fx.n}`} skill={fx.cut} combo={combo} />}
      {/* 決着 */}
      {dying === "boss" && (<>
        <div style={{ position: "absolute", left: M[0], top: M[1], width: 360, height: 360, background: "repeating-conic-gradient(rgba(255,240,200,0.55) 0 8deg, transparent 8deg 22deg)", borderRadius: "50%", WebkitMaskImage: "radial-gradient(circle, #000 20%, transparent 70%)", maskImage: "radial-gradient(circle, #000 20%, transparent 70%)", animation: "sqyRays 1.6s ease-out both", pointerEvents: "none" }} />
        <div className="jp" style={{ position: "absolute", left: "50%", top: "46%", zIndex: 5, animation: "sqyWin .7s cubic-bezier(.2,.8,.2,1) .25s both", fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 34, color: "#f2c14e", textShadow: "0 0 18px rgba(242,193,78,0.9), 0 3px 0 #3a2a10", whiteSpace: "nowrap" }}>VICTORY</div>
      </>)}
      {dying === "me" && (<>
        <div style={{ position: "absolute", inset: 0, background: "#0a0f1e", animation: "sqyDark 1.2s ease-out both", pointerEvents: "none" }} />
        <div className="jp" style={{ position: "absolute", left: "50%", top: "46%", zIndex: 5, animation: "sqyWin .8s ease-out .3s both", fontFamily: "'Shippori Mincho B1', serif", fontWeight: 800, fontSize: 22, color: "#e0948a", whiteSpace: "nowrap" }}>力尽きた……</div>
      </>)}
    </div>
  );
}

// ── 召喚（ガチャ）の欄 ──
const GACHA_CSS = `
@keyframes sqgSpin{to{transform:translate(-50%,-50%) rotate(360deg)}}
@keyframes sqgPillar{0%{opacity:0;transform:translateX(-50%) scaleY(0)}30%{opacity:1;transform:translateX(-50%) scaleY(1)}75%{opacity:1}100%{opacity:0;transform:translateX(-50%) scaleY(1) scaleX(2.5)}}
@keyframes sqgCard{0%{opacity:0;transform:translateY(18px) rotateY(90deg) scale(.8)}60%{opacity:1;transform:translateY(-4px) rotateY(0) scale(1.05)}100%{opacity:1;transform:none}}
@keyframes sqgShine{0%,100%{box-shadow:0 0 6px var(--c)}50%{box-shadow:0 0 18px var(--c),0 0 30px var(--c)}}
`;
function GachaPanel({ state, actions, flash }) {
  const r = normRpg(state.rpg);
  const g = r.gacha || { n: 0, since: 0 };
  const [res, setRes] = useState(null);
  const pull = (n) => {
    const out = actions.gachaPull(n);
    if (typeof out === "string") { flash(out); return; }
    SFX.play("evolve");
    setRes(out);
  };
  return (
    <Box title="召喚の祭壇（ガチャ）" icon={<Sparkles size={18} />}>
      <div className="relative overflow-hidden mb-2" style={{ height: 96, borderRadius: 8, border: "1px solid #b08a3e", background: `radial-gradient(circle at 50% 60%, rgba(159,210,255,0.55), transparent 55%), url(${ART_URL}items-banner.jpg) center 40%/cover no-repeat` }}>
        <div className="absolute inset-x-0 bottom-0 px-3 py-1 jp text-xs" style={{ background: "linear-gradient(0deg, rgba(20,28,50,0.85), rgba(20,28,50,0))", color: "#fdfbf5", fontWeight: 800 }}>ゴールドを捧げて、装備を召喚する</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => pull(1)} disabled={r.gold < GACHA_COST[1]} className="jp btn-sky py-2 text-sm">1回召喚<br /><span className="text-[11px]">{GACHA_COST[1]}G</span></button>
        <button onClick={() => pull(10)} disabled={r.gold < GACHA_COST[10]} className="jp btn-primary py-2 text-sm">10連召喚<br /><span className="text-[11px]">{GACHA_COST[10]}G・SR以上1つ確定</span></button>
      </div>
      <div className="jp text-[10px] mt-2" style={{ color: "var(--ink-mute)" }}>
        出る確率：SSR {GACHA_RATE.SSR}%・SR {GACHA_RATE.SR}%・R {GACHA_RATE.R}%・N {GACHA_RATE.N}%。{GACHA_PITY}回 SSR が出なければ、次は SSR 確定（あと{Math.max(1, GACHA_PITY - (g.since || 0))}回）。これまで {g.n || 0}回 召喚。
      </div>
      {res && <GachaResult items={res} state={state} actions={actions} onClose={() => setRes(null)} />}
    </Box>
  );
}
function GachaResult({ items, state, actions, onClose }) {
  const r = normRpg(state.rpg);
  const top = items.reduce((m, o) => Math.max(m, RARITY_RANK[rpgItemById(o.i).rarity]), 0);
  const pillar = ["#cfd6e2", "#7fb6ff", "#c9a6ff", "#f2c14e"][top];
  const cpNow = combatPower(state);
  const cpIf = (slot, u) => combatPower({ ...state, rpg: { ...r, equipped: { ...r.equipped, [slot]: u } } }) - cpNow;
  const [shown, setShown] = useState(false);
  useEffect(() => { const t = setTimeout(() => { setShown(true); if (top >= 3) SFX.play("victory"); else SFX.play("result"); }, 1100); return () => clearTimeout(t); }, []);
  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 9997, background: "radial-gradient(circle at 50% 45%, #2a3f7a 0%, #10182f 70%)", overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 12px" }}>
      <style>{GACHA_CSS}</style>
      {!shown ? (
        <div style={{ position: "relative", width: "100%", flex: 1, minHeight: 360 }}>
          <svg viewBox="0 0 200 200" style={{ position: "absolute", left: "50%", top: "50%", width: 260, height: 260, animation: "sqgSpin 2.4s linear infinite", transform: "translate(-50%,-50%)" }}>
            <circle cx="100" cy="100" r="92" fill="none" stroke={pillar} strokeWidth="2" /><circle cx="100" cy="100" r="74" fill="none" stroke={pillar} strokeWidth="1" strokeDasharray="4 3" />
            <polygon points="100,14 174,143 26,143" fill="none" stroke={pillar} strokeWidth="1.2" /><polygon points="100,186 26,57 174,57" fill="none" stroke={pillar} strokeWidth="1.2" />
          </svg>
          <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 90, background: `linear-gradient(0deg, transparent, ${pillar}, #ffffff, ${pillar}, transparent)`, filter: "blur(6px)", transformOrigin: "50% 50%", animation: "sqgPillar 1.1s ease-out both" }} />
        </div>
      ) : (<>
        <div className="jp" style={{ fontFamily: "'Shippori Mincho B1', serif", fontWeight: 800, fontSize: 20, color: "#f1dfae", marginBottom: 12, textShadow: "0 0 10px rgba(242,193,78,0.6)" }}>召喚の結果</div>
        <div className={items.length === 1 ? "grid grid-cols-1 gap-2" : "grid grid-cols-2 sm:grid-cols-5 gap-2"} style={{ width: "100%", maxWidth: items.length === 1 ? 180 : 640, perspective: 600, marginTop: items.length === 1 ? "18vh" : 0 }}>
          {items.map((o, k) => {
            const it = rpgItemById(o.i);
            const c = RARITY[it.rarity].color;
            const on = Object.values(r.equipped).includes(o.u);
            return (
              <div key={o.u} className="jp text-center" style={{ position: "relative", padding: "8px 4px", borderRadius: 10, background: it.rarity === "SSR" ? "linear-gradient(160deg, #fff7e2, #f1dfae)" : it.rarity === "SR" ? "linear-gradient(160deg, #f4effa, #ddd0ef)" : "#fbf8f0", border: `2px solid ${c}`, "--c": c, animation: `sqgCard .45s ease-out ${k * 0.12}s both${RARITY_RANK[it.rarity] >= 2 ? `, sqgShine 1.6s ease-in-out ${k * 0.12 + 0.45}s infinite` : ""}` }}>
                {o.isNew && <span style={{ position: "absolute", left: 4, top: 4, fontSize: 9, fontWeight: 800, color: "#fff", background: "#c9433f", borderRadius: 4, padding: "0 4px" }}>NEW</span>}
                <div className="flex justify-center"><GameIcon ch={it.icon} id={it.id} rarity={it.rarity} size={56} /></div>
                <div className="text-[11px] mt-1" style={{ fontWeight: 800, color: "#22335c" }}>{it.name}</div>
                <div><RpgRarityTag rarity={it.rarity} /></div>
                <div className="text-[9px]" style={{ color: "#4f6b9a", minHeight: 24 }}>{fxText(it.fx)}</div>
                {on ? <div className="text-[10px]" style={{ color: "#4f8a72", fontWeight: 800 }}>装備中</div>
                  : (() => { const d = cpIf(it.slot, o.u); return <button onClick={() => actions.equip(it.slot, o.u)} className="btn-sky text-[10px] px-2 py-0.5">装備する<span style={{ marginLeft: 3, color: d > 0 ? "#f2c14e" : "#e0948a" }}>{d > 0 ? `▲${d.toLocaleString()}` : d < 0 ? `▼${(-d).toLocaleString()}` : ""}</span></button>; })()}
              </div>
            );
          })}
        </div>
        <button onClick={onClose} className="jp btn-primary px-8 py-2 mt-4">閉じる</button>
      </>)}
    </div>,
    document.body
  );
}
// ── ボス戦のコマンド：正解で行動ポイント（◎は+2）がたまり、技・回復・守りを選ぶ ──
const AP_MAX = 6;
const BOSS_COMMANDS = [
  { id: "power", name: "渾身の一撃", icon: "⚔", ap: 3, text: "ダメージ3倍" },
  { id: "heal", name: "癒やしの祈り", icon: "💚", ap: 2, text: "HPを30%回復" },
  { id: "guard", name: "守りの構え", icon: "🛡", ap: 2, text: "次の2回、受けるダメージ半分" },
  { id: "joint", name: "仲間と連携", icon: "🤝", ap: 4, text: "仲間との合体技（ダメージ4倍）", party: true },
]; // Lv10〜：0、Lv50〜：4
function getClassAptitude(state) {
  const st = calculateStatus(state);
  const r = normRpg(state.rpg);
  return {
    sage: st.totalCorrect / 300,
    knight: st.totalHours / 25,
    ranger: (st.longestQaStreak * 2 + r.crits) / 80,
    hero: r.bossWins / 3 + st.totalClears / 15,
  };
}
const EVO_LABELS = ["初期", "成長", "覚醒", "上位進化", "真の姿", "最終進化"];
// ボスの行動パターン：溜め（4問ごとに力を溜め、次にまちがえると2.5倍。正解すると溜めを止めて+30%）・回復（HPが半分を切ったら1回だけ、まちがえたとき15%回復）
const BOSS_HEALERS = new Set(["elderweed", "slimeking", "ghost", "wisp", "mandragora"]);
const CHARGE_EVERY = 4;
// 連携技：絆レベル3以上の仲間と、6連撃ごとに放つ合体技（ダメージ+60%）
const JOINT_SKILLS = { serena: "光の加護斬り", raven: "星闇の双撃", kaito: "双剣・蒼閃", rine: "条文結界斬", kai: "測量陣・一閃", mira: "書式陣・星斬" };
const JOINT_EVERY = 6, JOINT_BOND = 3;
// パーティのそろい効果：役割（追撃・魔法・回復）がそろうとボス戦のダメージが上がる。絆Lv3以上の仲間だけなら、さらに上がる
function partySynergy(party, r) {
  const kinds = new Set(party.map((p) => p.skill.kind));
  const out = [];
  if (kinds.size >= 3) out.push({ name: "三役そろい", dmgPct: 10, text: "追撃・魔法・回復がそろって、ボスへのダメージ+10%" });
  else if (party.length >= 2 && kinds.size === 1) out.push({ name: "同じ役の連携", dmgPct: 5, text: "同じ役割の仲間が息を合わせて、ボスへのダメージ+5%" });
  if (party.length >= 2 && party.every((p) => bondLevel(((r.bonds || {})[p.a.id]) || 0) >= 3)) out.push({ name: "絆の陣", dmgPct: 5, text: "全員の絆がLv3以上で、ボスへのダメージ+5%" });
  return { list: out, dmgPct: out.reduce((t, x) => t + x.dmgPct, 0) };
}
const ROLE_NAME = { chase: "追撃", magic: "魔法", heal: "回復" };
const slotOrigin = (slots, id) => { const o = slots.find((x) => x.p.a.id === id); const big = o && (o.p.sprite || o.p.chibi); return o ? [`calc(${o.l}% + ${big ? Math.round(o.size * 0.55) : 17}px)`, `calc(${100 - o.b}% - ${big ? Math.round(o.size * 0.5) : 17}px)`] : ["40px", "60px"]; };

// ── 冒険タブに出す育成パネル（転職の神殿・相棒・覚醒） ──
function GrowthPanels({ state, actions }) {
  const r = normRpg(state.rpg);
  const level = state.player.level;
  const cls = getClassInfo(state);
  const apt = getClassAptitude(state);
  const maxApt = Math.max(0.01, ...Object.values(apt));
  const recommended = Object.entries(apt).sort((a, b) => b[1] - a[1])[0][0];
  const pet = getPetInfo(state);
  const aw = getAwakening(state);
  const [petType, setPetType] = useState("dragon");
  const [petName, setPetName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [msg, setMsg] = useState("");
  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(""), 2500); };
  const firstFree = !r.classId;

  return (
    <>
      {msg && <div className="jp text-sm p-2 text-center" style={{ background: "var(--cream)", border: "1px solid var(--gold)", color: "var(--ink)" }}>{msg}</div>}

      {/* 覚醒 */}
      <Box title="覚醒" icon={<Sparkles size={18} />}>
        <div className="flex items-center gap-3 mb-2">
          <div className="pixel text-lg" style={{ color: "#d6a84e", minWidth: 90 }}>{"★".repeat(aw.stars)}<span style={{ color: "var(--ink-mute)" }}>{"☆".repeat(5 - aw.stars)}</span></div>
          <div className="flex-1">
            <div className="jp text-xs" style={{ color: "var(--ink)" }}>しっかり覚えた問題：{aw.mastered.toLocaleString()}問</div>
            {aw.next && <div className="stat-bar mt-1"><div style={{ width: `${Math.min(100, (aw.mastered / aw.next) * 100)}%` }} /></div>}
            <div className="jp text-[10px] mt-0.5" style={{ color: "var(--ink-mute)" }}>{aw.next ? `次の★まで あと${aw.next - aw.mastered}問` : "最高の覚醒に到達しました！"}</div>
          </div>
        </div>
        <p className="jp text-[10px]" style={{ color: "var(--ink-mute)" }}>
          Ankiのアルゴリズムで「{MASTERED_STABILITY}日以上覚えていられる」と判定された問題の数です。★1つごとにEXP+3%・会心率+1%。★の数だけ光の粒が増え、★3からは額縁が輝きます。（★の条件：{AWAKEN_THRESHOLDS.map((t) => `${t}問`).join("・")}）
        </p>
      </Box>

      {/* 転職の神殿 */}
      <Box title="転職の神殿" icon={<Crown size={18} />}>
        {level < 10 ? (
          <p className="jp text-xs" style={{ color: "var(--ink-soft)" }}>Lv10になると転職できます（あと{10 - level}レベル）。それまでの学習のしかたで、向いているクラスが決まっていきます。</p>
        ) : (
          <>
            <p className="jp text-[11px] mb-2" style={{ color: "var(--ink-soft)" }}>
              {cls ? `いまのクラス：${cls.icon} ${cls.rankName}（${cls.bonusText(cls.rank)}）` : "あなたの学習のしかたから、向いているクラスが分かります。最初の転職は無料です。"}
            </p>
            <div className="space-y-1">
              {RPG_CLASSES.map((c) => {
                const k = classRankIndex(level);
                const on = r.classId === c.id;
                return (
                  <div key={c.id} className="p-2" style={{ border: `1px solid ${on ? c.color : "var(--rule-soft)"}`, background: on ? "var(--sky-pale)" : "var(--paper)" }}>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{c.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="jp text-sm" style={{ color: c.color, fontWeight: "bold" }}>{c.name} {recommended === c.id && <span className="jp text-[9px] px-1" style={{ background: "var(--brick)", color: "var(--paper)" }}>おすすめ</span>}</div>
                        <div className="jp text-[10px]" style={{ color: "var(--ink-mute)" }}>適性：{c.style} ／ 効果：{c.bonusText(k)}</div>
                      </div>
                      {on ? <span className="jp text-[10px]" style={{ color: "var(--sage)" }}>現在</span> : (
                        <button disabled={!firstFree && r.gold < CLASS_CHANGE_COST} onClick={() => { if (confirm(`${c.name}に転職しますか？${firstFree ? "（無料）" : `（${CLASS_CHANGE_COST}G）`}`)) flash(actions.setClass(c.id)); }} className="jp btn-sky text-[11px] px-2 py-1">{firstFree ? "転職" : `${CLASS_CHANGE_COST}G`}</button>
                      )}
                    </div>
                    <div className="stat-bar mt-1" style={{ height: 6 }}><div style={{ width: `${Math.min(100, (apt[c.id] / maxApt) * 100)}%`, background: c.color }} /></div>
                  </div>
                );
              })}
            </div>
            <p className="jp text-[10px] mt-2" style={{ color: "var(--ink-mute)" }}>クラスの称号はレベルとともに上がります（Lv10・20・30・40・50）。</p>
            {cls && (() => {
              const ad = ADV_CLASSES[cls.id];
              if (cls.adv) return <div className="jp mt-2 p-2 text-[11px]" style={{ border: `1.5px solid ${cls.color}`, background: "var(--cream)", borderRadius: 8, color: "var(--ink)" }}>👑 上級職 <b>{ad.name}</b>（効果1.5倍）<br />専用の技：{ad.skill.icon} <b>{ad.skill.name}</b>（ボス戦のコマンド・4AP、{ad.skill.text}）</div>;
              const ok = level >= ADV_NEED.level && (r.bossWins || 0) >= ADV_NEED.bossWins && r.gold >= ADV_NEED.gold;
              return (
                <div className="jp mt-2 p-2" style={{ border: "1px dashed var(--gold)", borderRadius: 8, background: "var(--paper)" }}>
                  <div className="text-[12px]" style={{ fontWeight: 800, color: "var(--ink)" }}>👑 上級職への昇格：{ad.name}</div>
                  <div className="text-[10px]" style={{ color: "var(--ink-soft)" }}>効果が1.5倍になり、ボス戦で専用の技 {ad.skill.icon}{ad.skill.name}（{ad.skill.text}）が使えます</div>
                  <div className="text-[10px] mt-0.5" style={{ color: "var(--ink-mute)" }}>{level >= ADV_NEED.level ? "✓" : "・"} Lv{ADV_NEED.level}（いま{level}）　{(r.bossWins || 0) >= ADV_NEED.bossWins ? "✓" : "・"} ボス討伐{ADV_NEED.bossWins}回（いま{r.bossWins || 0}）　{r.gold >= ADV_NEED.gold ? "✓" : "・"} {ADV_NEED.gold}G</div>
                  <button disabled={!ok} onClick={() => { if (confirm(`${ad.name}に昇格しますか？（${ADV_NEED.gold}G）`)) flash(actions.promoteClass()); }} className="btn-primary w-full text-[11px] py-1 mt-1" style={{ opacity: ok ? 1 : 0.45 }}>昇格する</button>
                </div>
              );
            })()}
          </>
        )}
      </Box>

      {/* 相棒 */}
      <Box title="相棒" icon={<StarIcon size={18} />}>
        {!pet ? (
          <>
            <p className="jp text-xs mb-2" style={{ color: "var(--ink-soft)" }}>タマゴを選んで、名前を付けてください。学習した日と正解した問題の数で育ち、5段階に進化します。</p>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {Object.entries(PET_TYPES).map(([id, t]) => (
                <button key={id} onClick={() => setPetType(id)} className="jp p-2 text-left" style={{ border: `2px solid ${petType === id ? "var(--sky-deep)" : "var(--rule-soft)"}`, background: "var(--paper)" }}>
                  <div className="text-2xl">{t.art ? <span className="inline-flex items-center gap-1">🥚→<img src={`${ART_URL}${t.art[1]}`} alt="" style={{ width: 30, height: 30, borderRadius: "50%" }} />→<img src={`${ART_URL}${t.art[2]}`} alt="" style={{ width: 36, height: 36, borderRadius: "50%" }} /></span> : t.stages.map((s) => s[0]).filter((v, i, a) => a.indexOf(v) === i).join("→")}</div>
                  <div className="text-xs" style={{ color: "var(--ink)" }}>{t.label}</div>
                  <div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>育つと{t.bonusText(4)}まで</div>
                </button>
              ))}
            </div>
            <input className="rpg-input mb-2" value={petName} onChange={(e) => setPetName(e.target.value)} maxLength={12} placeholder="名前（例：ポチ）" />
            <button disabled={!petName.trim()} onClick={() => flash(actions.adoptPet(petType, petName.trim()))} className="jp btn-primary w-full py-2">🥚 この子を迎える</button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="text-5xl" style={{ animation: "sqBob 1.8s ease-in-out infinite", filter: pet.maxed && !(pet.type.art && pet.type.art[pet.stage]) ? "drop-shadow(0 0 6px gold)" : "none" }}><PetIcon pet={pet} size={72} /></div>
              <div className="flex-1 min-w-0">
                <div className="jp text-base" style={{ color: "var(--ink)", fontWeight: "bold" }}>{pet.name} <span className="jp text-xs" style={{ color: "var(--ink-soft)", fontWeight: "normal" }}>（{pet.stageName}）</span></div>
                <div className="jp text-[10px]" style={{ color: "var(--ink-soft)" }}>育成ポイント {pet.points}{pet.next ? ` ／ 次の進化まで あと${pet.next - pet.points}` : "（最終進化）"}</div>
                {pet.next && <div className="stat-bar mt-1"><div style={{ width: `${Math.min(100, ((pet.points - PET_THRESHOLDS[pet.stage]) / (pet.next - PET_THRESHOLDS[pet.stage])) * 100)}%` }} /></div>}
                <div className="jp text-[10px] mt-1" style={{ color: "var(--sky-deep)" }}>{pet.stage > 0 ? `効果：${pet.type.bonusText(pet.stage)}` : "孵化すると効果が付きます"}</div>
                <div className="jp text-[10px]" style={{ color: pet.studiedToday ? "var(--sage)" : "var(--ink-mute)" }}>{pet.studiedToday ? "😊 今日もいっしょに勉強した！" : "💤 今日はまだ勉強していません"}</div>
                <div className="jp flex flex-wrap items-center gap-1 mt-1 text-[10px]" style={{ color: "var(--ink-mute)" }}>姿を変える：{Object.entries(PET_TYPES).map(([id, t]) => <button key={id} disabled={pet.type === t} onClick={() => actions.changePetType(id)} className="px-2 py-0.5" style={{ borderRadius: 999, border: `1px solid ${pet.type === t ? "var(--gold)" : "var(--rule-soft)"}`, background: pet.type === t ? "var(--cream)" : "var(--paper)", color: "var(--ink)", cursor: pet.type === t ? "default" : "pointer" }}>{t.label}</button>)}<span>（育ち具合はそのまま）</span></div>
              </div>
            </div>
            {renaming ? (
              <div className="flex gap-1 mt-2">
                <input className="rpg-input flex-1" value={petName} onChange={(e) => setPetName(e.target.value)} maxLength={12} />
                <button disabled={!petName.trim()} onClick={() => { actions.renamePet(petName.trim()); setRenaming(false); }} className="jp btn-primary text-xs px-2">保存</button>
              </div>
            ) : (
              <button onClick={() => { setPetName(pet.name); setRenaming(true); }} className="jp text-[10px] mt-2" style={{ background: "transparent", border: "none", color: "var(--ink-mute)", textDecoration: "underline" }}>名前を変える</button>
            )}
            <p className="jp text-[10px] mt-1" style={{ color: "var(--ink-mute)" }}>学習した日1日で10ポイント、正解5問で1ポイント。進化の段階：{PET_THRESHOLDS.slice(1).join("・")}ポイント</p>
          </>
        )}
      </Box>
    </>
  );
}
// ボス戦は連撃の 3・5・8・12 回目（12回目より後は4回ごとに必殺技）
const bossCut = (nc) => { const i = { 3: 0, 5: 1, 8: 2, 12: 3 }[nc]; return i !== undefined ? LUNA_SKILLS[i] : nc > 12 && nc % 4 === 0 ? LUNA_SKILLS[3] : null; };
// 無限回廊（耐久モード）：体力が尽きるまで、苦手と忘れかけの問題が続く。階が進むほど魔物の攻撃が強くなる（1階ごとに4%）
const ENDLESS_GROW = 0.04;
function EndlessCard({ state, onStart }) {
  const e = normRpg(state.rpg).endless || {};
  return (
    <Box title="無限回廊" icon={<Skull size={18} />}>
      <div className="jp space-y-1.5">
        <p className="text-[11px]" style={{ color: "var(--ink-soft)", lineHeight: 1.7 }}>体力が尽きるまで、苦手と忘れかけの問題が続く耐久の回廊です。1問正解するごとに1階進み、上の階ほど魔物の攻撃が強くなります（ふんばりは無し）。</p>
        <div className="flex items-center gap-2">
          <span className="text-[12px]" style={{ color: "var(--ink)" }}>自己ベスト <b style={{ fontFamily: "'Cinzel', serif", fontSize: 18, color: "var(--gold)" }}>{e.best || 0}</b> 階{e.n ? `　挑戦 ${e.n}回` : ""}</span>
          <span className="flex-1" />
          <button onClick={onStart} className="btn-primary px-3 py-1.5 text-xs">回廊に入る ▶</button>
        </div>
      </div>
    </Box>
  );
}
function EndlessRun({ state, actions, recordAnswer, startTimer, stopTimer, onExit }) {
  const [battleKey] = useState(() => uid());
  const used = useRef(new Set());
  const over = useRef(false); // 力尽きた（結果を出すまでの間は答えを受け付けない）
  const [queue, setQueue] = useState(() => gapItems(state, 30));
  const [floor, setFloor] = useState(1);
  const [showAnswer, setShowAnswer] = useState(false);
  const [done, setDone] = useState(null);
  const timerStartedByMe = useRef(false);
  const best0 = (normRpg(state.rpg).endless || {}).best || 0;
  useEffect(() => {
    if (!state.timer.startMs) { startTimer(null, "qa"); timerStartedByMe.current = true; }
    return () => { BATTLE.dmgMul = 1; BATTLE.noRevive = false; if (timerStartedByMe.current) { stopTimer(); timerStartedByMe.current = false; } };
  }, []);
  useEffect(() => { BATTLE.dmgMul = 1 + (floor - 1) * ENDLESS_GROW; BATTLE.noRevive = true; }, [floor, battleKey]);
  const item = queue[0];
  const bank = item ? state.questionBanks.find((b) => b.id === item.bankId) : null;
  const q = bank ? (bank.questions || []).find((x) => x.id === item.qId) : null;
  const refill = (rest) => {
    if (rest.length >= 5) return rest;
    const more = gapItems(state, 30).filter((it) => !used.current.has(it.qId) && !rest.some((x) => x.qId === it.qId));
    return [...rest, ...(more.length ? more : gapItems(state, 30))];
  };
  useEffect(() => { if (item && !q && !done) setQueue((qq) => refill(qq.slice(1))); }, [item && item.qId, !!q]);
  const end = (cleared) => {
    if (timerStartedByMe.current) { stopTimer(); timerStartedByMe.current = false; }
    BATTLE.dmgMul = 1;
    setDone({ cleared, msg: actions.endlessFinish(cleared) });
  };
  const answer = (correct, meta) => {
    if (!q || done || over.current) return;
    recordAnswer(bank.id, q.id, correct, meta);
    used.current.add(q.id);
    setShowAnswer(false);
    if (BATTLE.down) { over.current = true; const cleared = floor - 1; setTimeout(() => end(cleared), 1400); return; }
    if (correct) setFloor(floor + 1);
    setQueue(refill(queue.slice(1)));
  };
  if (done) return (
    <Box title="無限回廊　探索の結果" icon={<Skull size={18} />}>
      <div className="jp text-center py-2">
        <div className="text-[12px]" style={{ color: "var(--ink-soft)" }}>力尽きるまでに 討伐 {BATTLE.defeated}体・最大コンボ {BATTLE.maxCombo}・会心 {BATTLE.crits}回</div>
        <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 36, color: "var(--gold)" }}>{done.cleared}<span style={{ fontSize: 14 }}> 階</span></div>
        <div className="text-sm" style={{ fontWeight: 700, color: "var(--ink)" }}>{done.cleared > best0 ? "🏆 自己ベスト更新！" : `自己ベストは ${best0} 階`}</div>
        {done.msg && <div className="text-xs mt-1" style={{ color: "var(--gold)", fontWeight: 700 }}>{done.msg}</div>}
      </div>
      <button onClick={onExit} className="jp btn-primary w-full py-2">もどる</button>
    </Box>
  );
  if (!q) return <div className="jp text-center text-sm py-6" style={{ color: "var(--ink-soft)" }}>{queue.length ? "問題を探しています…" : "出題できる問題がありません。まずは問題集を1周してみましょう。"}{!queue.length && <button onClick={onExit} className="btn-ghost w-full py-2 mt-2">もどる</button>}</div>;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between jp text-xs">
        <button onClick={() => { if (confirm("回廊から出ますか？（ここまでの階で記録します）")) end(floor - 1); }} className="flex items-center gap-1" style={{ color: "var(--ink-soft)" }}><XIcon size={14} /> 回廊を出る</button>
        <span style={{ color: "var(--ink-soft)", fontWeight: 700 }}>自己ベスト {best0}階</span>
      </div>
      <div className="jp text-center" style={{ fontFamily: "'Shippori Mincho B1', serif", fontWeight: 800, color: "var(--ink)" }}>無限回廊　第{floor}階<span className="text-[11px] ml-2" style={{ color: "var(--brick)", fontWeight: 700 }}>魔物の攻撃 ×{(1 + (floor - 1) * ENDLESS_GROW).toFixed(2)}</span></div>
      <BattleStage state={state} q={q} bankName={bank.name} battleKey={battleKey} boss={floor % 10 === 0} scene={towerSceneUrl(Math.min(TOWER_MAX, floor))} />
      <div className="rpg-box p-1">
        <div className="rpg-inner-border min-h-[180px] flex flex-col">
          <div className="jp text-[10px] mb-2" style={{ color: "var(--ink-mute)" }}>{bank.name}</div>
          <div className="qtext jp text-base md:text-lg flex-1 break-words" style={{ color: "var(--ink)" }}>{renderQText(q.q, q.q_formats, q.a)}</div>
          <QuestionImages bankId={bank.id} question={q} side="q" />
          {showAnswer ? (
            <>
              <div className="jp text-[10px] mt-3 mb-1" style={{ color: "var(--gold)" }}>答え</div>
              <div className="qtext jp text-base md:text-lg break-words p-2" style={{ background: "var(--sky-pale)", border: "1px solid var(--gold)", color: "var(--ink)" }}>{renderFormattedText(q.a, q.a_formats)}</div>
              <QuestionImages bankId={bank.id} question={q} side="a" />
              <LawRefChips q={q} />
              <AnswerPanel onAnswer={answer} question={q} srSettings={effectiveSr(state)} />
            </>
          ) : (
            <RevealButton q={q} onReveal={() => setShowAnswer(true)} />
          )}
        </div>
      </div>
    </div>
  );
}
// ボスの挑発：出題される問題のうち、苦手な問題がいちばん多い地域を名指しする。その地域の問題に正解すると「言い返した！」でダメージ1.5倍
function bossTaunt(state, pool) {
  const cnt = new Map();
  pool.forEach((it) => {
    const b = state.questionBanks.find((x) => x.id === it.bankId);
    const q = b && (b.questions || []).find((x) => x.id === it.qId);
    if (!q) return;
    const rg = themeOf(b.name).region;
    const v = cnt.get(rg) || { weak: 0, wrong: 0 };
    if (isQuestionWeak(q)) v.weak++;
    v.wrong += q.wrong || 0;
    cnt.set(rg, v);
  });
  const best = [...cnt.entries()].sort((a, b) => b[1].weak - a[1].weak || b[1].wrong - a[1].wrong)[0];
  if (!best || (!best[1].weak && !best[1].wrong)) return null;
  return { region: best[0], line: `お前は「${best[0]}」が苦手なのだろう……その弱さ、突かせてもらうぞ！` };
}
// 本番の問題数（最終決戦・模試の塔の「○問なら」）：資格の世界は世界の試験の形、王都の世界は択一20問
const examSizeOf = (state) => { const w = curWorld(state); return w.exam ? { n: w.exam.parts.reduce((t, x) => t + x.n, 0), label: "本番" } : { n: 20, label: "択一" }; };
function WorldExamChance({ pp, world }) {
  const c = worldPassChance(pp, world);
  if (!c) return null;
  const unseen = pp.total - pp.seen;
  const n = Math.min(unseen, Math.max(10, Math.round(pp.total * 0.05)));
  const up = n > 0 ? worldPassChance(pp, world, (n * 0.9) / pp.total) : null;
  const col = (v) => (v >= 0.8 ? "var(--gold)" : v >= 0.5 ? "var(--sage)" : "#c9564e");
  const ex = world.exam;
  return (
    <Box title={`いま試験なら（${ex.title.replace(/本番モード$/, "").trim()}の予想）`} icon={<TrendingUp size={18} />}>
      <div className="jp">
        <div className="text-center py-2 mb-2" style={{ background: "var(--paper)", border: `1.5px solid ${col(c.pPass)}`, borderRadius: 10 }}>
          <div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>合格する確率（全部の科目で合格点）</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: col(c.pPass), fontFamily: "'Cinzel', 'Shippori Mincho B1', serif" }}>{Math.round(c.pPass * 100)}<span className="text-sm">%</span></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {c.parts.map((pt) => (
            <div key={pt.name} className="text-center py-1.5" style={{ background: "var(--paper)", border: `1px solid ${col(pt.pPass)}`, borderRadius: 8 }}>
              <div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>{pt.name}（{pt.n}問中{pt.pass}問以上）</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: col(pt.pPass) }}>{Math.round(pt.pPass * 100)}%</div>
              <div className="text-[10px]" style={{ color: "var(--ink-soft)" }}>予想 {pt.exp.toFixed(1)}問（{Math.round(pt.exp * ex.points)}点）</div>
            </div>
          ))}
        </div>
        {up && <p className="text-[11px] mt-2 px-2 py-1.5" style={{ background: "var(--cream)", border: "1px solid var(--rule-soft)", borderRadius: 8, color: "var(--ink)" }}>未学習の問題をあと<b>{n}問</b>覚えると、合格する確率は <b>{Math.round(c.pPass * 100)}% → {Math.round(up.pPass * 100)}%</b> の見込みです。</p>}
        <p className="text-[10px] mt-2" style={{ color: "var(--ink-mute)" }}>※ 科目ごとの「いま思い出せる確率」の平均から計算した目安です。4択なので、わからない問題も4分の1は当たるとして数えています。</p>
      </div>
    </Box>
  );
}

// ── 5. 曜日の迷宮：曜日ごとに科目が変わり、その科目の10問で報酬2倍（1日1回） ──
function weekdayRegion(state) {
  const regs = [...new Set(state.questionBanks.filter((b) => (b.questions || []).length).map((b) => themeOf(b.name).region))].sort((a, b) => regionRank(a) - regionRank(b) || a.localeCompare(b, "ja"));
  if (!regs.length) return null;
  const dow = (new Date().getDay() + 6) % 7; // 月曜＝0
  return regs[dow % regs.length];
}
const DOW = ["月", "火", "水", "木", "金", "土", "日"];
function WeekdayDungeon({ state }) {
  const rg = weekdayRegion(state);
  if (!rg) return null;
  const done = normRpg(state.rpg).weekdayDone === todayStr();
  const banks = state.questionBanks.filter((b) => (b.questions || []).length && themeOf(b.name).region === rg);
  const start = () => { const items = buildPoolFromBanks(banks, 10); if (items.length) window.dispatchEvent(new CustomEvent("sq-study-items", { detail: { items, kind: "weekday", title: `${DOW[(new Date().getDay() + 6) % 7]}曜の迷宮`, region: rg } })); };
  return (
    <Box title={`曜日の迷宮（${DOW[(new Date().getDay() + 6) % 7]}曜日）`} icon={<Castle size={18} />}>
      <div className="jp flex items-center gap-3">
        <div className="flex-shrink-0" style={{ width: 72, height: 48, borderRadius: 8, border: "1px solid #b08a3e", background: `url(${regionStageUrl(rg)}) center/cover` }} />
        <div className="flex-1 min-w-0">
          <div className="text-sm" style={{ fontWeight: 800, color: "var(--ink)" }}>今日は「{rg}」</div>
          <div className="text-[11px]" style={{ color: "var(--ink-soft)" }}>この科目の10問で、報酬が2倍（1日1回）。曜日ごとに科目が変わります。</div>
        </div>
      </div>
      <button onClick={start} className="jp btn-primary w-full py-2 mt-2">{done ? "もう一度挑む（今日の報酬は受け取り済み）" : "迷宮に入る（10問）"}</button>
    </Box>
  );
}

// ── 7. 相棒ルミのおつかい：その日に学習すると、1日1回おみやげを持ってくる ──
function LumiErrand({ state, actions }) {
  const pet = getPetInfo(state);
  const r = normRpg(state.rpg);
  if (!pet) return null;
  const code = ymdCode(todayStr());
  let ans = 0; state.questionBanks.forEach((b) => (b.questions || []).forEach((q) => { ans += (q.ah || []).filter((h) => String(h).startsWith(code)).length; }));
  const done = r.errand === todayStr();
  const ready = ans >= 10;
  return (
    <Box title={`${pet.name}のおつかい`} icon={<Sparkles size={18} />}>
      <div className="jp flex items-center gap-3">
        <div className="flex-shrink-0"><PetIcon pet={pet} size={56} /></div>
        <div className="flex-1 min-w-0 text-[11px]" style={{ color: "var(--ink-soft)" }}>
          {done ? `${pet.name}は今日のおつかいを終えて、うれしそうにしています。また明日！` : ready ? `${pet.name}が、おみやげを持って帰ってきました！（今日 ${ans}問）` : `今日10問解くと、${pet.name}がおつかいから帰ってきます（いま ${ans}問）。30問・60問で、おみやげが豪華に。`}
          <div style={{ height: 5, borderRadius: 3, background: "var(--beige)", overflow: "hidden", marginTop: 4 }}><div style={{ width: `${Math.min(100, (ans / 60) * 100)}%`, height: "100%", background: "linear-gradient(90deg, #d6b56a, #b08a3e)" }} /></div>
        </div>
      </div>
      {!done && <button disabled={!ready} onClick={() => actions.claimErrand(ans)} className="jp btn-primary w-full py-2 mt-2" style={{ opacity: ready ? 1 : 0.5 }}>おみやげを受け取る</button>}
    </Box>
  );
}

export { AdventureTab };
