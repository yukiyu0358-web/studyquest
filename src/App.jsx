import { useState, useEffect, useRef, useId, createContext, useContext, Fragment, cloneElement } from "react";
import { createPortal } from "react-dom";
import { fsrs as createFsrs, createEmptyCard, Rating, State } from "ts-fsrs";
import Papa from "papaparse";
import { fbAuth, fbDb, fbFieldValue, getPushToken, FCM_VAPID_KEY } from "./firebase";
import { LINE_ICONS, Ico, Sword, Plus, Check, Trash2, Sparkles, ScrollIcon, Upload, Play, Pause, BookOpen, Calendar, Home, FileQuestion, Eye, Shuffle, XIcon, Award, Clock, TrendingUp, Crown, Pencil, Bookmark, StarIcon, FolderIcon, Up, Down, Skull, Sword2, StatusIcon, LogoutIcon, Search, Castle, GA, swordArt, crossedSwords, oniArt, GAME_ART, GAME_ART_BY_ID, GAME_RING, GameIcon, paintedUrl, MON_ART_URL } from "./game/icons"; // アイコン
import { SFX } from "./game/sfx"; // 効果音
import { CALC_TYPES, makeCalcProblem, checkCalc, calcAnsText, SAKUZU_TYPES, makeSakuzuProblem } from "./game/calc"; // 計算ドリル・作図ドリルの問題づくり
import { makeCloze, BLANK_LABELS, makeTrap, isTrueAnswer } from "./game/cloze"; // 条文の穴埋め・○×のひっかけ版の問題づくり
import { parseQuickText, TEXT_IMPORT_MODES } from "./game/textimport"; // 貼り付けた文章を一問一答に分ける
import { SHINSEI_CASES, SHINSEI_PURPOSES, SHINSEI_CAUSES, SHINSEI_DEADLINES, SHINSEI_ATTACH } from "./data/shinsei"; // 申請書の穴埋めの場面
import { STUDY_QUOTES } from "./data/quotes"; // 名言
import { REGION_TALK, STORY_TALKS, REGION_ARC, regionArc, TRINITY_REGIONS, TRINITY_TALK, BOND_TALKS, COUNTDOWN_TALKS, ACADEMY_MEET, STUDY_GROUP_TALK } from "./data/story"; // 物語の会話


// ============ Constants ============
const DIFFICULTIES = {
  easy: { label: "簡単", xp: 10, color: "#6d8454", icon: "🍃" },
  normal: { label: "普通", xp: 25, color: "#5d7894", icon: "⚔️" },
  hard: { label: "難敵", xp: 50, color: "#b8862c", icon: "🔥" },
  boss: { label: "ボス級", xp: 100, color: "#a04848", icon: "👹" },
};
const QUAL_COLORS = ["#5d7894", "#7a6caa", "#a04848", "#b8862c", "#6d8454", "#4f8eb3"];
const STORAGE_KEY = "study-rpg-v6";
const LEGACY_KEYS = ["study-rpg-v5", "study-rpg-v4", "study-rpg-v3", "study-rpg-v2"];
const XP_TIMER_PER_MIN = 1;
const XP_QA_FIRST = 5;
const XP_QA_REVIEW = 2;
const XP_QA_REVENGE = 10;
const XP_QA_AT_5 = 10;
const XP_QA_AT_10 = 20;
const XP_QA_AT_20 = 50;
const XP_QA_STREAK_5 = 15;
const XP_QA_COMPLETE = 100;
const XP_QUAL_ACQUIRE = 500;

const QUAL_TITLE_DB = [
  { match: /測量士補/, title: "見習い測量士", job: "測量士補", icon: "📐" },
  { match: /測量士/, title: "大地を読む者", job: "測量士", icon: "🗺️" },
  { match: /技術士補/, title: "工学の従者", job: "技術士補", icon: "⚙️" },
  { match: /技術士/, title: "工学の賢者", job: "技術士", icon: "🛠️" },
  { match: /簿記/, title: "数字を操る者", job: "経理術師", icon: "📊" },
  { match: /宅建|宅地建物/, title: "土地を見極める者", job: "土地交渉人", icon: "🏠" },
  { match: /行政書士/, title: "文書の番人", job: "書類達人", icon: "📜" },
  { match: /司法書士/, title: "法を識る者", job: "法の番人", icon: "⚖️" },
  { match: /FP|ファイナンシャル/i, title: "財の導き手", job: "ファイナンシャル賢者", icon: "💰" },
  { match: /英検|TOEIC|TOEFL/i, title: "言葉の旅人", job: "語学探検家", icon: "🌐" },
  { match: /情報処理|基本情報|応用情報/, title: "情報の魔導士", job: "IT賢者", icon: "💻" },
  { match: /電気工事士/, title: "雷を操る者", job: "電気の達人", icon: "⚡" },
  { match: /看護師/, title: "癒しの担い手", job: "生命の守り手", icon: "🩺" },
  { match: /建築士/, title: "空間を描く者", job: "建築士", icon: "🏛️" },
  { match: /社労士|社会保険労務士/, title: "人と組織の調停者", job: "労務の賢者", icon: "🤝" },
  { match: /中小企業診断士/, title: "商いを見抜く者", job: "経営の参謀", icon: "📈" },
];
function lookupQualTitle(name) {
  for (const e of QUAL_TITLE_DB) if (e.match.test(name)) return e;
  return { title: `${name}の達人`, job: name, icon: "🏅" };
}

const LEVEL_TITLES = [
  { lv: 1, title: "旅立ちの者" }, { lv: 3, title: "駆け出し" }, { lv: 5, title: "見習い" },
  { lv: 8, title: "修練生" }, { lv: 12, title: "魔法使い" }, { lv: 16, title: "学徒" },
  { lv: 20, title: "学者" }, { lv: 25, title: "上級学者" }, { lv: 30, title: "賢者" },
  { lv: 40, title: "大賢者" }, { lv: 50, title: "伝説の学徒" },
];
function getLevelTitle(lv) {
  let t = LEVEL_TITLES[0].title;
  for (const e of LEVEL_TITLES) if (lv >= e.lv) t = e.title;
  return t;
}

// ============ Helpers ============
const getXpForNextLevel = (lv) => Math.floor(100 * Math.pow(lv, 1.25));
const fmtMin = (m) => { const h = Math.floor(m / 60), mm = Math.floor(m % 60); return h > 0 ? `${h}時間${mm}分` : `${mm}分`; };
const fmtSec = (s) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = Math.floor(s % 60); return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`; };
const daysUntil = (d) => { if (!d) return null; const t = new Date(); t.setHours(0,0,0,0); const x = new Date(d); x.setHours(0,0,0,0); return Math.ceil((x - t) / 86400000); };
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };

// ============ クラシックテーマ（RPGメニュー風・落ち着いたコバルト） ============
// 色はCSS変数（--paper, --ink など）を差し替えて、アプリ全体をまとめて切り替える。
// 立ち絵は public/hero.jpg を使う（無い場合はドット絵のキャラクターで代用）。
const HERO_URL = `${(import.meta.env && import.meta.env.BASE_URL) || "/"}hero.jpg`;
// 白金テーマ：タイトル・背景の絵（white-title.jpg）と、メニューの立ち絵（white-hero.jpg）
const WHITE_TITLE_URL = `${(import.meta.env && import.meta.env.BASE_URL) || "/"}white-title.jpg`;
// 白金テーマの描きおろしの絵（public/art/）：タイトル（横長・縦長）、会話の背景、鍛冶場、仲間
const ART_URL = `${(import.meta.env && import.meta.env.BASE_URL) || "/"}art/`;
const WHITE_HERO_URL = `${(import.meta.env && import.meta.env.BASE_URL) || "/"}white-hero.jpg`;
// ホームに出すキャラクター（設定で選ぶ。displaySettings.homeChar）。face：顔アイコンの切り抜き位置、pos：立ち絵の表示位置
const HOME_CHARS = [
  { id: "hero", name: "主人公", img: null, avatar: WHITE_HERO_URL, face: [69, 12], pos: "center 16%", expr: true },
  { id: "sky", name: "天空の主人公", img: `${ART_URL}hero-sky.jpg`, avatar: `${ART_URL}hero-sky.jpg`, face: [40, 9], pos: "center 6%", expr: true },
  { id: "rine", name: "リーネ", img: `${ART_URL}ally-registrar.jpg`, avatar: `${ART_URL}ally-registrar.jpg`, face: [50, 8], pos: "center 6%" },
  { id: "kai", name: "カイ", img: `${ART_URL}ally-surveyor.jpg`, avatar: `${ART_URL}ally-surveyor.jpg`, face: [50, 7], pos: "center 5%" },
  { id: "mira", name: "ミラ", img: `${ART_URL}ally-explorer.jpg`, avatar: `${ART_URL}ally-explorer.jpg`, face: [11, 11], pos: "center 8%" },
  { id: "kaito", name: "カイト", img: `${ART_URL}ally-kaito.jpg`, avatar: `${ART_URL}ally-kaito.jpg`, face: [52, 4], pos: "center 4%" },
  { id: "serena", name: "セレナ", img: `${ART_URL}ally-serena.jpg`, avatar: `${ART_URL}ally-serena.jpg`, face: [26, 17], pos: "center 8%" },
  { id: "raven", name: "レイヴン", img: `${ART_URL}ally-raven.jpg`, avatar: `${ART_URL}ally-raven.jpg`, face: [70, 6], pos: "center 4%" },
  { id: "boy", name: "少年", img: HERO_URL, avatar: HERO_URL, face: [52, 13], pos: "center 12%" },
];
// 主人公（白髪の少女）の表情：通常・笑顔・驚き・真剣。吹き出しと会話で、場面に合わせて使い分ける
const HERO_FACES = Object.fromEntries(["normal", "smile", "surprise", "serious"].map((k) => [k, `${ART_URL}hero-face-${k}.jpg`]));
const exprOfLine = (t) => (/えっ|まさか|！？|\?！/.test(t) ? "surprise" : /……|取り返|気をつけ|注意|大切|集中|気を抜/.test(t) ? "serious" : /！|うれし|おめでと|すごい|ふふ|ますね|ですね|よかった|おつかれ|この調子/.test(t) ? "smile" : "normal");
const homeCharOf = (state) => HOME_CHARS.find((c) => c.id === ((state.displaySettings && state.displaySettings.homeChar) || "hero")) || HOME_CHARS[0];
const readPref = (key, fallback) => { try { return localStorage.getItem(key) || fallback; } catch (e) { return fallback; } };
const writePref = (key, value) => { try { localStorage.setItem(key, value); } catch (e) { /* 保存できなくても動作は続ける */ } };

const CLASSIC_CSS = `
html[data-theme="classic"]{--ink:#eef1f6;--ink-soft:#c3cede;--ink-mute:#8f9cb8;--paper:#18264a;--cream:#1f3058;--beige:#26395f;--greige:#33476e;--rule:#c9d3e6;--rule-soft:#4a5d86;--gold:#dcbc6e;--gold-light:#e9cf8e;--sage:#8fc4a6;--brick:#e0948a;--slate:#a3b6da;--sky:#8fa9d6;--sky-light:#2c4378;--sky-pale:#22386a;--sky-deep:#a9c4ea;--mint:#8fd0bd;--plum:#bba7dc;--hl:rgba(220,188,110,0.32);--memo-bg:rgba(220,188,110,0.12);background:#0d1428;color-scheme:dark}
html[data-theme="classic"] body{background:transparent !important;color:var(--ink);font-family:'M PLUS Rounded 1c','Hiragino Maru Gothic ProN',sans-serif}
html[data-theme="classic"] body::before{content:"";position:fixed;left:-48px;top:-48px;right:-48px;bottom:-48px;z-index:-2;background:#0d1428 url("${HERO_URL}") center 20%/cover no-repeat;filter:blur(26px) brightness(.32) saturate(.55)}
html[data-theme="classic"] body::after{content:"";position:fixed;left:0;top:0;right:0;bottom:0;z-index:-1;background:rgba(22,32,68,.55);box-shadow:inset 0 0 220px rgba(0,0,0,.6)}
html[data-theme="classic"] .jp{font-family:'M PLUS Rounded 1c','Hiragino Maru Gothic ProN',sans-serif}
html[data-theme="classic"] .pixel{font-family:'M PLUS Rounded 1c','Hiragino Maru Gothic ProN',sans-serif;font-weight:800;letter-spacing:.02em}
html[data-theme="classic"] .rpg-box{background:linear-gradient(180deg,rgba(61,87,145,.94) 0%,rgba(39,63,120,.94) 50%,rgba(23,37,72,.96) 100%);border:2px solid #e4e9f2;border-radius:6px;box-shadow:inset 0 0 0 2px #0a1226,inset 0 0 0 3px rgba(160,185,215,.6),0 4px 0 rgba(0,0,0,.35)}
html[data-theme="classic"] .rpg-inner-border{border:none;padding:14px}
html[data-theme="classic"] .rpg-input{background:#0f1a36;color:var(--ink);border:1px solid #6d80a8;border-radius:3px}
html[data-theme="classic"] .rpg-input:focus{outline:2px solid #a9c4ea}
html[data-theme="classic"] .btn-primary{background:linear-gradient(180deg,#e2c47a,#b48f45);color:#1d1608;border:1px solid #f0dca6;border-radius:3px}
html[data-theme="classic"] .btn-sky,html[data-theme="classic"] .btn-info{background:linear-gradient(180deg,#4b6aa6,#2f4880);color:#eef1f6;border:1px solid #a9c4ea;border-radius:3px}
html[data-theme="classic"] .btn-success{background:linear-gradient(180deg,#4d8a6c,#2f604a);color:#eef7f1;border:1px solid #8fc4a6;border-radius:3px}
html[data-theme="classic"] .btn-danger{background:linear-gradient(180deg,#9a4d48,#6e302d);color:#fbeceb;border:1px solid #e0948a;border-radius:3px}
html[data-theme="classic"] .btn-plum{background:linear-gradient(180deg,#6f5a9a,#4c3c72);color:#f3eefb;border:1px solid #bba7dc;border-radius:3px}
html[data-theme="classic"] .btn-ghost{background:rgba(255,255,255,.04);color:var(--ink);border:1px solid #6d80a8;border-radius:3px}
html[data-theme="classic"] .btn-ghost:hover{background:rgba(160,185,215,.14)}
html[data-theme="classic"] .stamp{background:rgba(255,255,255,.06)}
html[data-theme="classic"] .stat-bar{background:#0a1020;border-color:#4a5d86}
html[data-theme="classic"] .swirl{display:none}
html[data-theme="classic"] .boot{color:#c3cede}
html[data-theme="classic"] ::placeholder{color:#7f8aa6}
@keyframes sqBlink{0%,100%{opacity:1}50%{opacity:.25}}
@keyframes sqCaret{0%,100%{transform:translateY(0);opacity:1}50%{transform:translateY(3px);opacity:.55}}
@keyframes sqFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes sqTwinkleT{0%,100%{opacity:0;transform:scale(.5)}50%{opacity:.9;transform:scale(1)}}
`;
const WHITE_CSS = `
html[data-theme="white"]{--ink:#22335c;--ink-soft:#4a5a7c;--ink-mute:#7a8aa8;--paper:#fdfbf5;--cream:#f6f0e2;--beige:#ece4d0;--greige:#d9cfb5;--rule:#b08a3e;--rule-soft:#d8c9a3;--gold:#b08a3e;--gold-light:#d6b56a;--sage:#4f8a72;--brick:#a24a45;--slate:#3d5a8c;--sky:#d4b878;--sky-light:#efe6cf;--sky-pale:#f8f3e6;--sky-deep:#2f4570;--mint:#7fb8a4;--plum:#7c6aa6;--hl:rgba(214,181,106,0.4);--memo-bg:#fbf3dc;background:#f6f2e8;color-scheme:light}
html[data-theme="white"] body{background:transparent !important;color:var(--ink);font-family:'Zen Kaku Gothic New','Noto Emoji','Hiragino Kaku Gothic ProN',sans-serif}
html[data-theme="white"] body::before{content:"";position:fixed;left:-48px;top:-48px;right:-48px;bottom:-48px;z-index:-2;background:#f6f2e8 url("${ART_URL}title-wide.jpg") center 30%/cover no-repeat;filter:blur(24px) brightness(1.08) saturate(.8)}
html[data-theme="white"] body::after{content:"";position:fixed;left:0;top:0;right:0;bottom:0;z-index:-1;background:rgba(250,247,238,.62)}
html[data-theme="white"] .jp{font-family:'Zen Kaku Gothic New','Noto Emoji','Hiragino Kaku Gothic ProN',sans-serif}
html[data-theme="white"] .pixel{font-family:'Shippori Mincho B1','Noto Emoji','Hiragino Mincho ProN',serif;font-weight:800;letter-spacing:.02em}
html[data-theme="white"] .rpg-box{background:rgba(253,251,245,.93);border:1px solid #b08a3e;border-radius:4px;box-shadow:inset 0 0 0 3px #fdfbf5,inset 0 0 0 4px rgba(176,138,62,.45),0 8px 22px rgba(40,50,80,.12)}
html[data-theme="white"] .rpg-box h2.jp{font-family:'Shippori Mincho B1','Hiragino Mincho ProN',serif;font-weight:800;letter-spacing:.08em}
html[data-theme="white"] .rpg-inner-border{border:none;padding:14px}
html[data-theme="white"] .rpg-input{background:#fffdf8;color:var(--ink);border:1px solid #c9b07a;border-radius:3px}
html[data-theme="white"] .rpg-input:focus{outline:2px solid #b08a3e}
html[data-theme="white"] .btn-primary{background:linear-gradient(180deg,#cfae62,#a8833a);color:#fffdf6;border:1px solid #8f6f2c;border-radius:3px}
html[data-theme="white"] .btn-sky,html[data-theme="white"] .btn-info{background:linear-gradient(180deg,#3d5a8c,#2a4170);color:#fdfbf5;border:1px solid #22335c;border-radius:3px}
html[data-theme="white"] .btn-success{background:linear-gradient(180deg,#5f977e,#467862);color:#fdfbf5;border:1px solid #3c6a56;border-radius:3px}
html[data-theme="white"] .btn-danger{background:linear-gradient(180deg,#b35a54,#8e423d);color:#fdfbf5;border:1px solid #7a3631;border-radius:3px}
html[data-theme="white"] .btn-plum{background:linear-gradient(180deg,#8c79b5,#6c5a96);color:#fdfbf5;border:1px solid #5a4a80;border-radius:3px}
html[data-theme="white"] .btn-ghost{background:#fdfbf5;color:var(--ink);border:1px solid #d8c9a3;border-radius:3px}
html[data-theme="white"] .btn-ghost:hover{background:#f6ead0}
html[data-theme="white"] .stat-bar{background:#e9e4d6;border-color:#d8c9a3}
html[data-theme="white"] .swirl{display:none}
html[data-theme="white"] .boot{color:#4a5a7c}
html[data-theme="white"] ::placeholder{color:#9aa4b8}
html[data-theme="white"] .ico-emoji{display:none !important}
html[data-theme="white"] .sq-emo{font-family:'Noto Emoji',sans-serif !important}
html[data-theme="white"] .sq-stat{border-color:rgba(176,138,62,.45) !important;border-radius:8px;box-shadow:inset 0 0 0 2px #fdfbf5,inset 0 0 0 3px rgba(176,138,62,.18)}
html[data-theme="white"] .rpg-inner-border span[style*="background:"]{border-radius:4px}
html[data-theme="white"] .sq-tool{background:rgba(253,251,245,.92) !important;border:1px solid rgba(176,138,62,.55) !important;color:#22335c !important;border-radius:999px;padding:3px 10px !important;display:inline-flex;align-items:center;gap:4px;font-weight:700;transition:background .15s}
html[data-theme="white"] .sq-tool:hover{background:#f6ead0 !important}
html[data-theme="white"] .sq-tool.on{background:linear-gradient(180deg,#cfae62,#a8833a) !important;color:#fffdf6 !important;border-color:#8f6f2c !important}
html[data-theme="white"] .sq-tool .ico-line{color:#b08a3e}
html[data-theme="white"] .sq-tool.on .ico-line{color:#fffdf6}
html[data-theme="white"] .ico-line{display:inline-block;vertical-align:-0.15em;flex-shrink:0}
html[data-theme="white"] .box-ico{color:#b08a3e !important}
html[data-theme="white"] .rpg-inner-border [style*="border: 1px solid"],html[data-theme="white"] .rpg-inner-border [style*="border: 2px solid"]{border-radius:6px}
html[data-theme="white"] .btn-primary,html[data-theme="white"] .btn-sky,html[data-theme="white"] .btn-info,html[data-theme="white"] .btn-success,html[data-theme="white"] .btn-danger,html[data-theme="white"] .btn-plum,html[data-theme="white"] .btn-ghost,html[data-theme="white"] .rpg-input{border-radius:6px}
html[data-theme="white"] .rpg-box{border-radius:8px}
@keyframes sqBlink{0%,100%{opacity:1}50%{opacity:.25}}
@keyframes sqCaret{0%,100%{transform:translateY(0);opacity:1}50%{transform:translateY(3px);opacity:.55}}
@keyframes sqFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes sqTwinkleT{0%,100%{opacity:0;transform:scale(.5)}50%{opacity:.9;transform:scale(1)}}
`;
const CLASSIC_FONTS = "https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;700;800&family=Cinzel:wght@700;900&family=Shippori+Mincho+B1:wght@500;700;800&family=Zen+Kaku+Gothic+New:wght@400;500;700&family=Noto+Emoji:wght@500;700&display=swap";

// テーマの適用（html要素に data-theme を付け、フォントとCSSを読み込む）
function ClassicThemeStyle({ active, theme }) {
  const t = theme || (active ? "classic" : "dot");
  const fancyTheme = t === "classic" || t === "white";
  useEffect(() => {
    const el = document.documentElement;
    if (fancyTheme) {
      el.setAttribute("data-theme", t);
      if (!document.getElementById("sq-classic-fonts")) {
        const link = document.createElement("link");
        link.id = "sq-classic-fonts"; link.rel = "stylesheet"; link.href = CLASSIC_FONTS;
        document.head.appendChild(link);
      }
    } else {
      el.removeAttribute("data-theme");
    }
  }, [t]);
  if (t === "classic") return <style>{CLASSIC_CSS}</style>;
  if (t === "white") return <style>{WHITE_CSS}</style>;
  return null;
}

// テーマごとの配色（クラシック：落ち着いたコバルト／白金：象牙色・金・紺）
const THEME_PAL = {
  classic: {
    label: { color: "#a3c3da" },
    gold: { color: "#dcbc6e" },
    logo: { fontFamily: "'Cinzel', 'Times New Roman', serif", fontWeight: 900, background: "linear-gradient(180deg, #f6ecc8 0%, #dcbc6e 48%, #9b7634 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", filter: "drop-shadow(0 2px 0 #1a1408) drop-shadow(0 0 12px rgba(220,188,110,0.3))" },
    mincho: { fontFamily: "'Shippori Mincho B1', serif", color: "#d8cba2" },
    heading: {},
    rowOn: { background: "linear-gradient(90deg, rgba(140,165,210,0.32), rgba(140,165,210,0.05))", boxShadow: "inset 0 0 0 1px rgba(190,205,230,0.7)" },
    rowOff: { background: "transparent", boxShadow: "none" },
    text: "#eef1f6", sub: "#c9d4e2", muted: "#7f8aa6", cursor: "#c8d6ea", cursorChar: "▶",
    track: "#0a1020", trackLine: "rgba(160,185,215,0.4)",
    divider: "linear-gradient(90deg, rgba(160,185,215,0), rgba(160,185,215,0.55), rgba(160,185,215,0))",
    starOff: "#4c5a75", badgeBg: "#a24a45", subtitleColor: "#d8cba2",
    gaugeExp: ["#3d5c9e", "#9db6dc"], gaugeToday: ["#a87d45", "#dcc287"], gaugeMastery: ["#3e7468", "#9cc8bb"],
    title: { bg: "#0d1428", image: HERO_URL, backdropFilter: "blur(26px) brightness(0.32) saturate(0.55)", overlay: "rgba(22,32,68,0.55)", imgFilter: "saturate(0.85) brightness(0.95)", vignette: "inset 0 0 200px rgba(0,0,0,0.75)", sparkle: "#e6d6a6", press: "#e4e9f2", pressSub: "#a3c3da", footer: "#7f8aa6", copy: null, mask: "radial-gradient(ellipse 50% 50% at 50% 46%, #000 58%, transparent 100%)" },
  },
  white: {
    label: { color: "#6a7a9a" },
    gold: { color: "#b08a3e" },
    logo: { fontFamily: "'Cinzel', 'Times New Roman', serif", fontWeight: 900, color: "#22335c", textShadow: "0 2px 0 rgba(176,138,62,0.35), 0 0 22px rgba(255,255,255,0.95)" },
    mincho: { fontFamily: "'Shippori Mincho B1', serif", color: "#b08a3e" },
    heading: { fontFamily: "'Shippori Mincho B1', serif" },
    rowOn: { background: "linear-gradient(90deg, rgba(176,138,62,0.22), rgba(176,138,62,0.02))", boxShadow: "inset 0 0 0 1px rgba(176,138,62,0.55)" },
    rowOff: { background: "transparent", boxShadow: "none" },
    text: "#22335c", sub: "#5b6b8c", muted: "#8a96b0", cursor: "#b08a3e", cursorChar: "◆",
    track: "#e9e4d6", trackLine: "rgba(176,138,62,0.35)",
    divider: "linear-gradient(90deg, rgba(176,138,62,0), rgba(176,138,62,0.8), rgba(176,138,62,0))",
    starOff: "#cfc6ae", badgeBg: "#9a4d48", subtitleColor: "#b08a3e",
    classBadge: { background: "#fdfbf5", border: "1px solid #b08a3e", borderRadius: 2, color: "#b08a3e" },
    portraitFrame: { border: "1px solid #b08a3e", borderRadius: "150px 150px 4px 4px", padding: 5, background: "#fdfbf5", boxShadow: "0 6px 18px rgba(40,50,80,0.14)" },
    gaugeExp: ["#2f4570", "#7fa6d6"], gaugeToday: ["#b08a3e", "#e6c98a"], gaugeMastery: ["#4f8a72", "#a7cdb8"],
    title: { fullArt: { wide: `${ART_URL}title-wide.jpg`, tall: `${ART_URL}title-tall.jpg` }, bg: "#f6f2e8", image: WHITE_TITLE_URL, backdropFilter: "blur(26px) brightness(1.08) saturate(0.85)", overlay: "rgba(250,247,238,0.6)", imgFilter: "none", vignette: "none", sparkle: "#c9a55a", press: "#22335c", pressSub: "#b08a3e", footer: "#5b6b8c", copy: "学ぶ、だから、どこまでも行ける。", mask: "radial-gradient(ellipse 62% 58% at 55% 47%, #000 64%, transparent 100%)" },
  },
};
// クラシックテーマ用の文字スタイル（これまでの部品から使う）
const CL = THEME_PAL.classic;

// ゲージ（EXP・今日の復習・記憶の定着）
function ClassicGauge({ label, value, max, text, colors, compact = false, theme = "classic" }) {
  const P = THEME_PAL[theme] || THEME_PAL.classic;
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between items-baseline jp">
        <span className={compact ? "text-[11px]" : "text-sm"} style={{ ...P.label, fontWeight: 700 }}>{label}</span>
        <span className={compact ? "text-xs" : "text-base"} style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", color: P.text }}>{text}</span>
      </div>
      <div style={{ height: compact ? 8 : 11, marginTop: 4, borderRadius: theme === "white" ? 6 : 2, background: P.track, boxShadow: `inset 0 0 0 1px ${P.trackLine}`, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${colors[0]}, ${colors[1]})`, transition: "width .5s" }} />
      </div>
    </div>
  );
}

// ── タイトル画面（起動時の待ち受け）：テーマごとに配色・絵・ロゴが変わる ──
function TitleScreen({ loading, saveInfo, onContinue, onSettings, onLogout, theme = "classic" }) {
  const P = THEME_PAL[theme] || THEME_PAL.classic;
  const T = P.title;
  const [stage, setStage] = useState("press"); // press | menu
  const [sel, setSel] = useState("continue");
  const items = ["continue", "settings", "logout"];
  const choose = (id) => { if (id === "continue") onContinue(); else if (id === "settings") onSettings(); else onLogout(); };
  useEffect(() => {
    const onKey = (e) => {
      if (loading) return;
      if (stage === "press" && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setStage("menu"); return; }
      if (stage !== "menu") return;
      if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => items[(items.indexOf(s) + 1) % items.length]); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => items[(items.indexOf(s) + items.length - 1) % items.length]); }
      else if (e.key === "Enter") { e.preventDefault(); choose(sel); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, sel, loading]);

  const row = (id, children, minH) => (
    <button key={id} type="button" onClick={() => choose(id)} onMouseEnter={() => setSel(id)} onFocus={() => setSel(id)}
      className="jp flex items-center gap-2 w-full text-left" style={{ ...(sel === id ? P.rowOn : P.rowOff), minHeight: minH, padding: "6px 12px 6px 6px", border: "none", borderRadius: 3, color: P.text, cursor: "pointer" }}>
      <span style={{ width: 14, fontSize: 12, color: sel === id ? P.cursor : "transparent" }}>{P.cursorChar}</span>
      {children}
    </button>
  );

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ zIndex: 60, background: T.bg, color: P.text }}>
      {T.fullArt ? (<>
        {/* 描きおろしの絵を画面いっぱいに（PCは横長・スマホは縦長）。少女が左にいるので、文字は右側に */}
        <picture>
          <source media="(min-width: 768px)" srcSet={T.fullArt.wide} />
          <img src={T.fullArt.tall} alt="" className="absolute inset-0 w-full h-full" style={{ objectFit: "cover", objectPosition: "center 40%" }} />
        </picture>
        <div className="absolute inset-0 md:hidden" style={{ background: "linear-gradient(180deg, rgba(250,247,238,0.88) 0%, rgba(250,247,238,0.2) 32%, rgba(250,247,238,0) 55%, rgba(250,247,238,0.75) 100%)" }} />
        <div className="absolute inset-0 hidden md:block" style={{ background: "linear-gradient(270deg, rgba(250,247,238,0.92) 0%, rgba(250,247,238,0.7) 30%, rgba(250,247,238,0) 58%)" }} />
      </>) : (<>
      <div style={{ position: "absolute", left: -60, top: -60, right: -60, bottom: -60, background: `${T.bg} url("${T.image}") center 20%/cover no-repeat`, filter: T.backdropFilter }} />
      <div style={{ position: "absolute", inset: 0, background: T.overlay }} />
      <img src={T.image} alt="" onError={(e) => { e.currentTarget.style.display = "none"; }}
        className="absolute left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-[5%] top-[13%] md:top-[1%] h-[62vh] md:h-[98vh]"
        style={{ aspectRatio: "2 / 3", objectFit: "cover", WebkitMaskImage: T.mask, maskImage: T.mask, filter: T.imgFilter }} />
      </>)}
      {T.vignette !== "none" && <div style={{ position: "absolute", inset: 0, boxShadow: T.vignette, pointerEvents: "none" }} />}
      {[[12, 22, 0], [86, 28, 1.1], [70, 62, 2], [22, 66, 0.6]].map(([l, t, d], i) => (
        <span key={i} style={{ position: "absolute", left: `${l}%`, top: `${t}%`, fontSize: 11, color: T.sparkle, animation: `sqTwinkleT 3s ease-in-out ${d}s infinite` }}>✦</span>
      ))}

      <div className={`relative h-full flex flex-col items-center justify-between md:justify-center md:gap-12 px-6 pt-10 md:pt-0 pb-14 md:pb-0 ${T.fullArt ? "md:items-end md:pr-[7vw]" : "md:items-start md:pl-[8vw]"}`}>
        <div className="flex flex-col items-center md:items-start gap-1">
          <div className="flex items-center gap-3 text-[15px] md:text-[22px]" style={{ ...P.mincho, color: P.subtitleColor, fontWeight: 700, letterSpacing: "0.35em" }}>
            <span style={{ display: "block", width: 40, height: 1, background: P.divider }} />学びの冒険<span style={{ display: "block", width: 40, height: 1, background: P.divider }} />
          </div>
          <h1 className="m-0 text-center md:text-left text-[46px] md:text-[92px]" style={{ ...P.logo, lineHeight: 1.05, letterSpacing: "0.04em" }}>
            STUDY<br className="hidden md:inline" /> QUEST
          </h1>
          <div style={{ width: 280, height: 1, margin: "4px 0", background: P.divider }} />
          {T.copy && <p className="m-0 text-[15px] md:text-[22px] text-center md:text-left" style={{ fontFamily: "'Shippori Mincho B1', serif", fontWeight: 700, letterSpacing: "0.15em", color: P.text, textShadow: "0 0 12px rgba(255,255,255,0.9)" }}>{T.copy}</p>}
        </div>

        <div className="w-full max-w-[440px]">
          {loading && (
            <div className="jp text-center md:text-left text-sm" style={{ color: T.pressSub, letterSpacing: "0.2em", animation: "sqBlink 1.6s ease-in-out infinite" }}>冒険の記録を読み込んでいます…</div>
          )}
          {!loading && stage === "press" && (
            <button type="button" onClick={() => setStage("menu")} className="w-full md:w-auto text-center md:text-left" style={{ minHeight: 64, padding: "0 12px", border: "none", background: "transparent", color: T.press, fontFamily: "'Cinzel', serif", fontSize: 20, fontWeight: 700, letterSpacing: "0.3em", cursor: "pointer", animation: "sqBlink 1.6s ease-in-out infinite" }}>
              ― PRESS START ―
              <span className="block mt-1" style={{ fontFamily: theme === "white" ? "'Shippori Mincho B1', serif" : "inherit", fontSize: 12, letterSpacing: "0.2em", color: T.pressSub }}>タップしてはじめる</span>
            </button>
          )}
          {!loading && stage === "menu" && (
            <div className="rpg-box p-2 flex flex-col gap-0.5" style={{ animation: "sqFadeIn .35s ease-out" }}>
              {row("continue", (
                <span className="flex flex-col gap-0.5">
                  <span className="text-[18px]" style={{ ...P.heading, fontWeight: 800, letterSpacing: "0.1em" }}>つづきから</span>
                  <span className="text-[11px]" style={{ color: P.sub }}>{saveInfo}</span>
                </span>
              ), 60)}
              {row("settings", <span className="text-[16px]" style={{ ...P.heading, fontWeight: 700, letterSpacing: "0.1em" }}>設定</span>, 46)}
              {row("logout", <span className="text-[16px]" style={{ ...P.heading, fontWeight: 700, letterSpacing: "0.1em" }}>ログアウト</span>, 46)}
            </div>
          )}
        </div>
      </div>
      <div className="absolute left-0 right-0 bottom-4 md:bottom-6 flex justify-center md:justify-between gap-4 px-6 md:px-[8vw] jp" style={{ fontSize: 11, color: T.footer, letterSpacing: "0.15em" }}>
        <span>© {new Date().getFullYear()} STUDY QUEST</span><span>Ver. 2.0</span>
      </div>
    </div>
  );
}

// ── 上部の情報ウィンドウ（現在地・レベル・所持金・タイマー） ──
function ClassicInfoBar({ state, liveSeconds, onStatus, theme = "classic" }) {
  const P = THEME_PAL[theme] || THEME_PAL.classic;
  const [faceOk, setFaceOk] = useState(true);
  const player = state.player;
  const xpNeeded = getXpForNextLevel(player.level);
  const scene = (RPG_SCENES[getCharacterTier(player.level)] || RPG_SCENES.tier1).name;
  const st = calculateStatus(state);
  const gold = normRpg(state.rpg).gold;
  return (
    <div className="rpg-box mb-3 px-3 py-2 flex flex-wrap items-center gap-x-5 gap-y-1 jp" style={{ color: P.text }}>
      <button onClick={onStatus} title="ステータス画面へ" className="flex-shrink-0" style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer" }}>
        {theme === "white" && faceOk ? (
          <img src={WHITE_HERO_URL} alt="" onError={() => setFaceOk(false)} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", objectPosition: "center 12%", border: "1px solid #b08a3e", boxShadow: "0 0 0 2px #fdfbf5, 0 0 0 3px rgba(176,138,62,0.45)" }} />
        ) : (
          <CharacterDisplay level={player.level} job="" icon="" size={38} showAura={false} />
        )}
      </button>
      <div className="flex items-baseline gap-2"><span className="text-[11px]" style={P.label}>現在地</span><span className="text-sm" style={{ ...P.heading, fontWeight: 800 }}>{scene}</span></div>
      <div className="flex items-center gap-2">
        <span className="text-[11px]" style={P.label}>Lv</span><span className="text-lg" style={{ ...P.gold, ...P.heading, fontWeight: 800 }}>{player.level}</span>
        <div style={{ width: 80, height: 6, borderRadius: theme === "white" ? 3 : 2, background: P.track, boxShadow: `inset 0 0 0 1px ${P.trackLine}`, overflow: "hidden" }}>
          <div style={{ width: `${Math.min(100, (player.xp / xpNeeded) * 100)}%`, height: "100%", background: `linear-gradient(90deg, ${P.gaugeExp[0]}, ${P.gaugeExp[1]})` }} />
        </div>
      </div>
      <div className="flex items-baseline gap-2"><span className="text-[11px]" style={P.label}>連続学習</span><span className="text-sm" style={{ fontWeight: 700 }}>{st.currentStreak}日</span></div>
      {state.timer.startMs && <div className="text-sm" style={{ color: theme === "white" ? "#a24a45" : "#e0948a", fontWeight: 700, animation: "sqBlink 1.6s ease-in-out infinite" }}>⏱ {fmtSec(liveSeconds)}</div>}
      <div className="ml-auto flex items-baseline gap-1"><span className="text-base" style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{gold.toLocaleString()}</span><span className="text-sm" style={{ ...P.gold, ...P.heading, fontWeight: 800 }}>G</span></div>
    </div>
  );
}

// ── 白金テーマのホーム：道しるべメニュー（知識・挑戦・成長・新しい自分へ） ──
const SIGNPOSTS = [
  { id: "knowledge", label: "知識", sub: "今日の復習・問題集", items: [{ id: "today", label: "今日の復習" }, { id: "qbank", label: "問題集" }], desc: (n) => `知識の道へ。今日の復習と問題集に挑みます。${n > 0 ? `今日の復習は あと${n}問。` : "今日の復習は完了しています。"}` },
  { id: "challenge", label: "挑戦", sub: "ボス戦・装備・ショップ", items: [{ id: "adventure", label: "冒険へ" }], desc: () => "挑戦の道へ。苦手な問題でボスに挑み、装備やショップで力を整えます。" },
  { id: "growth", label: "成長", sub: "ステータス・覚醒・相棒", items: [{ id: "status", label: "ステータス" }, { id: "adventure", label: "覚醒・相棒" }], desc: () => "成長の道へ。能力値や正答率の推移、覚醒と相棒の育ち具合を確かめます。" },
  { id: "future", label: "新しい自分へ", sub: "資格・試験日", items: [{ id: "qual", label: "資格" }], desc: () => "新しい自分への道。目指す資格と試験日を確かめ、合格までの歩みを見渡します。" },
];
const SIGN_TOOLS = [
  { id: "task", label: "タスク", desc: "今日やることを登録して、クリアするとEXPがもらえます。" },
  { id: "timer", label: "タイマー", desc: "学習時間を計ります。" },
  { id: "memo", label: "メモ", desc: "フォルダごとに学習メモをまとめます。" },
  { id: "law", label: "条文", desc: "条文番号やキーワードで、条文と問題をまとめて探します。" },
  { id: "option", label: "設定", desc: "テーマ、文字の大きさ・フォント、タイトル画面の表示を変えられます。" },
];
// ── ホームの吹き出し：主人公が、勉強の名言や今日の様子をやさしく話す ──
// 名言の合間に混ぜる、今日の様子に合わせたひとこと
function mentorStatusLines(state, todayCount) {
  const lines = [
    todayCount > 0 ? `今日の復習が あと${todayCount}問 残っています。ゆっくりで大丈夫ですから、一緒に進めましょうね。` : "今日の復習は、もう終わっていますね。お疲れさまでした。余力があれば、新しい問題にも進んでみましょう。",
    "がんばりすぎた日は、少し休むのも大切ですよ。続けることが、いちばんの力ですから。",
  ];
  const next = (state.qualifications || []).filter((q) => !q.acquired && q.examDate).map((q) => ({ q, d: daysUntil(q.examDate) })).filter((x) => x.d !== null && x.d >= 0).sort((a, b) => a.d - b.d)[0];
  if (next) lines.unshift(next.d === 0 ? `今日は${next.q.name}の試験日ですね。これまで積み重ねてきた力を、信じてください。` : `${next.q.name}の試験まで、あと${next.d}日です。今日の一問一問が、合格へつながっていますよ。`);
  // 合格力（最終決戦のゲージ）
  const qual = mainQual(state);
  const linked = qual && state.questionBanks.some((b) => b.qualId === qual.id);
  const pp = passPower(state, linked ? qual.id : null);
  const plan = examPlan(state, pp, qual);
  if (plan && plan.perDay > 0) lines.push(plan.done >= plan.perDay ? `今日の目標（新しい問題${plan.perDay}問）は達成です。試験日から逆算しても、順調ですよ。` : `試験日から逆算すると、今日は新しい問題をあと${plan.perDay - plan.done}問覚えると順調です。「今日の復習」から進めましょうね。`);
  if (pp.total > 0) lines.push(pp.power >= PASS_LINE ? `合格力は${pctTxt(pp.power)}。魔王を倒せる力が宿っています。この力を試験の日まで保ちましょうね。` : `いまの合格力は${pctTxt(pp.power)}です。合格ラインの${Math.round(PASS_LINE * 100)}%まで、一緒に進みましょう。`);
  return lines;
}
const shuffled = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// face：顔の位置（背景画像の位置 %）。override：メニューにカーソルを合わせたときの説明文
const MENTOR_STYLE = {
  white: { bubble: "#fdfbf5", border: "rgba(176,138,62,0.55)", ring: "#b08a3e", text: "#22335c", sub: "#5b6b8c", by: "#b08a3e", caret: "#b08a3e", font: "'Shippori Mincho B1', serif" },
  classic: { bubble: "#223463", border: "rgba(190,205,230,0.6)", ring: "#c9d3e6", text: "#eef1f6", sub: "#c9d4e2", by: "#dcbc6e", caret: "#c4d4e8", font: null },
};
function MentorBubble({ state, todayCount, theme = "white", avatar, face, override, faces }) {
  const S = MENTOR_STYLE[theme] || MENTOR_STYLE.white;
  const [deck] = useState(() => shuffled(STUDY_QUOTES.map((_, i) => i)));
  const [n, setN] = useState(0);
  // 4回に1回は、今日の様子に合わせたひとことを話す
  const status = n % 4 === 3 ? mentorStatusLines(state, todayCount) : null;
  const quote = status ? null : STUDY_QUOTES[deck[(n - Math.floor(n / 4)) % deck.length]];
  const font = S.font ? { fontFamily: S.font } : {};
  return (
    <div className="rpg-box px-3 py-3 md:px-4 jp">
      <div className="flex items-start gap-3">
        <div aria-hidden="true" key={faces ? `f${n}` : "f"} className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20" style={{ borderRadius: "50%", backgroundColor: S.bubble, backgroundImage: `url(${faces ? faces[status ? (todayCount === 0 ? "smile" : todayCount >= 50 ? "serious" : "normal") : n === 0 ? "normal" : n % 3 === 1 ? "smile" : n % 5 === 2 ? "surprise" : "normal"] : avatar})`, backgroundSize: faces ? "cover" : "300% auto", backgroundPosition: faces ? "50% 22%" : `${face[0]}% ${face[1]}%`, animation: faces && n ? "sqFadeIn .3s ease-out" : undefined, backgroundRepeat: "no-repeat", border: `2px solid ${S.ring}`, boxShadow: "0 2px 6px rgba(0,0,0,0.18)" }} />
        <button onClick={() => setN(n + 1)} aria-label="次の言葉へ" className="relative flex-1 min-w-0 text-left" style={{ background: S.bubble, border: `1px solid ${S.border}`, borderRadius: 12, padding: "14px 34px 16px 18px", color: S.text, cursor: "pointer", minHeight: 80 }}>
          <span aria-hidden="true" style={{ position: "absolute", left: -7, top: 22, width: 12, height: 12, background: S.bubble, borderLeft: `1px solid ${S.border}`, borderBottom: `1px solid ${S.border}`, transform: "rotate(45deg)" }} />
          {override ? (
            <span className="text-[16px] md:text-[19px] leading-relaxed" style={{ ...font, fontWeight: 700 }}>{override}</span>
          ) : status ? (
            <span key={n} className="block text-[18px] md:text-[22px] leading-relaxed" style={{ ...font, fontWeight: 700, animation: "sqFadeIn .3s ease-out" }}>{status[Math.floor(n / 4) % status.length]}</span>
          ) : (
            <span key={n} className="block" style={{ animation: "sqFadeIn .3s ease-out" }}>
              <span className="block text-[21px] md:text-[27px] leading-snug" style={{ ...font, fontWeight: 800, letterSpacing: "0.03em" }}>「{quote.t}」</span>
              <span className="block text-right text-xs md:text-sm mt-1" style={{ color: S.by, fontWeight: 700 }}>― {quote.by}</span>
              <span className="block text-[15px] md:text-[18px] leading-relaxed mt-1.5" style={{ ...font, color: S.sub, fontWeight: 600 }}>{quote.say}</span>
            </span>
          )}
          <span aria-hidden="true" style={{ position: "absolute", right: 12, bottom: 8, fontSize: 11, color: S.caret, animation: "sqCaret 1.2s ease-in-out infinite" }}>{theme === "white" ? "◆" : "▼"}</span>
        </button>
      </div>
    </div>
  );
}

function SignpostHome({ state, todayCount, onCommand }) {
  const P = THEME_PAL.white;
  const [focus, setFocus] = useState(null);
  const [open, setOpen] = useState(null);
  const [imgOk, setImgOk] = useState(true);
  const player = state.player;
  const xpNeeded = getXpForNextLevel(player.level);
  const mainAch = player.mainTitleId ? player.achievements.find((a) => a.id === player.mainTitleId) : null;
  const title = mainAch ? mainAch.title : getLevelTitle(player.level);
  const cls = getClassInfo(state);
  const pet = getPetInfo(state);
  const aw = getAwakening(state);
  const r = normRpg(state.rpg);
  const eqRows = RPG_SLOTS.map((s) => { const inv = r.inventory.find((v) => v.u === r.equipped[s.id]); return { slot: s, it: rpgInvItem(inv) }; });
  const d = new Date();
  const code = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  let doneToday = 0;
  for (const b of state.questionBanks) for (const q of b.questions || []) if (Array.isArray(q.ah) && q.ah.some((c) => c.startsWith(code))) doneToday++;
  const post = SIGNPOSTS.find((p) => p.id === focus);
  const tool = SIGN_TOOLS.find((t) => t.id === focus);
  const message = post ? post.desc(todayCount) : tool ? tool.desc : null;
  const stg = heroStage(player.level);
  const hc = homeCharOf(state); // ホームに出すキャラクター（設定で変えられる）
  const subLine = [`姿：${stg.name}`, cls ? `クラス：${cls.rankName}` : null, mainAch && mainAch.job ? `称号：${mainAch.job}` : null].filter(Boolean).join("　／　");
  const mincho = { fontFamily: "'Shippori Mincho B1', serif" };
  const clickPost = (p) => {
    setFocus(p.id);
    if (p.items.length === 1) onCommand(p.items[0].id);
    else setOpen(open === p.id ? null : p.id);
  };

  const HL = homeLayoutOf(state);
  const showMenu = !HL.hidden.has("top:menu"), showHero = !HL.hidden.has("top:hero"), showMentor = !HL.hidden.has("top:mentor");
  return (
    <div className="space-y-3 mb-4" style={{ color: P.text }}>
      <div className={showMenu && showHero ? "grid gap-3 md:grid-cols-[300px_1fr]" : "grid gap-3"}>
        {/* 道しるべ */}
        {showMenu && <div className="rpg-box p-3 order-2 md:order-1 flex flex-col gap-2" onMouseLeave={() => setFocus(null)}>
          <div className="flex items-center gap-2 text-[13px]" style={{ ...mincho, fontWeight: 700, color: "#b08a3e", letterSpacing: "0.3em" }}>
            <span style={{ flex: 1, height: 1, background: P.divider }} />道しるべ<span style={{ flex: 1, height: 1, background: P.divider }} />
          </div>
          {SIGNPOSTS.map((p) => {
            const on = focus === p.id || open === p.id;
            const badge = p.id === "knowledge" && todayCount > 0 ? todayCount : null;
            return (
              <div key={p.id}>
                <button onClick={() => clickPost(p)} onMouseEnter={() => setFocus(p.id)} onFocus={() => setFocus(p.id)} className="w-full text-left"
                  style={{ display: "block", padding: 1.5, border: "none", background: on ? "#b08a3e" : "rgba(176,138,62,0.55)", clipPath: "polygon(0 0, calc(100% - 22px) 0, 100% 50%, calc(100% - 22px) 100%, 0 100%)", cursor: "pointer" }}>
                  <span className="flex items-center gap-2" style={{ minHeight: 54, padding: "6px 32px 6px 10px", background: on ? "linear-gradient(90deg, #f6ead0 0%, #fdfaf2 70%)" : "linear-gradient(90deg, #fdfbf5 0%, #f8f4ea 100%)", clipPath: "polygon(0 0, calc(100% - 21px) 0, 100% 50%, calc(100% - 21px) 100%, 0 100%)" }}>
                    <span style={{ width: 12, fontSize: 11, color: on ? P.cursor : "transparent" }}>◆</span>
                    <span className="flex-1 min-w-0 flex flex-col">
                      <span style={{ ...mincho, fontSize: 19, fontWeight: 800, letterSpacing: "0.12em", color: P.text }}>{p.label}</span>
                      <span className="jp text-[11px] truncate" style={{ color: P.sub }}>{p.sub}</span>
                    </span>
                    {badge && <span className="jp text-[11px] px-1.5" style={{ background: P.badgeBg, color: "#ffffff", borderRadius: 999, minWidth: 22, textAlign: "center" }}>{badge}</span>}
                  </span>
                </button>
                {open === p.id && (
                  <div className="flex gap-1.5 mt-1.5 ml-5" style={{ animation: "sqFadeIn .25s ease-out" }}>
                    {p.items.map((it) => (
                      <button key={it.id + it.label} onClick={() => onCommand(it.id)} className="flex-1" style={{ minHeight: 44, padding: "0 8px", background: "#fdfbf5", border: "1px solid #b08a3e", borderRadius: 3, color: P.text, ...mincho, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                        {it.label}{it.id === "today" && todayCount > 0 ? `（${todayCount}）` : ""}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div style={{ height: 1, margin: "2px 0", background: P.divider }} />
          <div className="grid grid-cols-5 md:grid-cols-3 gap-1.5">
            {SIGN_TOOLS.map((t) => (
              <button key={t.id} onClick={() => { setFocus(t.id); onCommand(t.id); }} onMouseEnter={() => setFocus(t.id)} onFocus={() => setFocus(t.id)}
                style={{ minHeight: 42, padding: "0 4px", background: focus === t.id ? "#f6ead0" : "#fdfbf5", border: `1px solid ${focus === t.id ? "#b08a3e" : "rgba(176,138,62,0.45)"}`, borderRadius: 3, color: P.text, ...mincho, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{t.label}</button>
            ))}
          </div>
        </div>}

        {/* 主人公 */}
        {showHero && <div className="rpg-box p-3 md:p-5 order-1 md:order-2">
          <div className="flex flex-col sm:flex-row gap-4 md:gap-6">
            <button onClick={() => onCommand("status")} title="ステータス画面へ" className="flex-shrink-0 w-full sm:w-[230px] h-[280px] sm:h-[370px]" style={{ ...P.portraitFrame, position: "relative", marginTop: stg.crest ? 18 : 0, ...(stg.idx > 0 ? { background: stg.frame, boxShadow: stg.glow } : {}), cursor: "pointer" }}>
              <HeroDecor stage={stg} w={230} />
              <div className="w-full h-full overflow-hidden flex items-center justify-center" style={{ borderRadius: "145px 145px 2px 2px", background: "#e9e4d6" }}>
                {imgOk ? (hc.img
                  ? <img key={hc.id} src={hc.img} alt={hc.name} onError={() => setImgOk(false)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: hc.pos, display: "block", animation: "sqFadeIn .35s ease-out" }} />
                  : <StageHeroImg idx={stg.idx} onAllFail={() => setImgOk(false)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 16%", display: "block" }} />
                ) : (
                  <HeroPortrait state={state} size={200} pixel />
                )}
              </div>
            </button>
            <div className="flex-1 min-w-0 flex flex-col gap-3 jp">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl md:text-[28px]" style={{ ...mincho, fontWeight: 800, letterSpacing: "0.06em" }}>{title}</span>
                {cls && <span className="text-xs px-2 py-0.5" style={{ ...P.classBadge, ...mincho, fontWeight: 700 }}>{cls.icon} {cls.name}</span>}
                <span className="ml-auto text-sm" style={P.label}>Lv</span><span className="text-3xl" style={{ ...P.gold, ...mincho, fontWeight: 800 }}>{player.level}</span>
              </div>
              {subLine && <div className="text-sm" style={{ color: P.sub }}>{subLine}</div>}
              <ClassicGauge theme="white" label="EXP" value={player.xp} max={xpNeeded} text={`${player.xp} / ${xpNeeded}`} colors={P.gaugeExp} />
              <ClassicGauge theme="white" label="今日の復習" value={doneToday} max={doneToday + todayCount} text={`${doneToday} / ${doneToday + todayCount}`} colors={P.gaugeToday} />
              <ClassicGauge theme="white" label={aw.next ? "記憶の定着（次の★まで）" : "記憶の定着"} value={aw.mastered} max={aw.next || aw.mastered || 1} text={aw.next ? `${aw.mastered} / ${aw.next}` : `${aw.mastered}問`} colors={P.gaugeMastery} />
              <div style={{ height: 1, background: P.divider }} />
              <div className="grid gap-x-3 gap-y-1.5 items-baseline" style={{ gridTemplateColumns: "88px 1fr" }}>
                {eqRows.map(({ slot, it }) => (
                  <Fragment key={slot.id}>
                    <span className="text-xs" style={P.label}>{slot.label}</span>
                    <span className="text-sm truncate" style={{ fontWeight: 700, color: it ? P.text : P.muted }}>{it ? <><GameIcon ch={it.icon} id={it.id} rarity={it.rarity} size={20} /> {it.label}</> : "なし"}{it && <span className="text-[11px] ml-2" style={{ color: P.sub, fontWeight: 400 }}>{fxText(it.fx)}</span>}</span>
                  </Fragment>
                ))}
                <span className="text-xs" style={P.label}>覚醒</span>
                <span style={{ ...P.gold, letterSpacing: 2 }}>{"★".repeat(aw.stars)}<span style={{ color: P.starOff }}>{"★".repeat(5 - aw.stars)}</span></span>
                <span className="text-xs" style={P.label}>相棒</span>
                <span className="text-sm truncate" style={{ fontWeight: 700 }}>{pet ? `${pet.icon} ${pet.name}（${pet.stageName}）` : "まだいません"}</span>
              </div>
            </div>
          </div>
        </div>}
      </div>

      {/* 吹き出し（名言・今日の様子。メニューに合わせると説明） */}
      {showMentor && <MentorBubble state={state} todayCount={todayCount} theme="white" avatar={hc.avatar} face={hc.face} faces={hc.expr ? HERO_FACES : null} override={message} />}
    </div>
  );
}

// ── ホームの並べ替え・非表示：displaySettings.homeLayout = { order:[ブロック], rows:[道しるべの行], hidden:[id] } ──
// hidden の id は、ブロックは "events" など、道しるべの行は "row:task"、主人公と道しるべの中は "top:hero" "top:menu" "top:mentor"
const HOME_BLOCKS = [
  { id: "top", name: "主人公と道しるべ", note: "白金テーマ。クラシックはメニュー" },
  { id: "events", name: "開催中のイベント" },
  { id: "guide", name: "今日の道しるべ" },
  { id: "quest", name: "今日のクエスト" },
  { id: "quals", name: "資格の進捗" },
];
const HOME_TOP_PARTS = [{ id: "hero", name: "主人公の立ち絵とステータス" }, { id: "menu", name: "道しるべ（メニュー）" }, { id: "mentor", name: "吹き出し（名言）" }];
const HOME_ROWS = [
  { id: "task", name: "今日のタスク（学習計画）" }, { id: "review", name: "今日の復習" }, { id: "story", name: "ストーリーのつづき" },
  { id: "goal", name: "今日の目標（試験日から逆算）" }, { id: "final", name: "最終決戦" }, { id: "reflect", name: "今日のふりかえり" },
  { id: "quick", name: "忘れかけの3問" }, { id: "rival", name: "影の受験生" }, { id: "next", name: "次に取れそうな称号" }, { id: "stats", name: "今日の学習・連続学習・達成クエスト" },
];
function homeLayoutOf(state) {
  const hl = (state.displaySettings && state.displaySettings.homeLayout) || {};
  const fix = (list, all) => { const ids = all.map((x) => x.id); const got = (Array.isArray(list) ? list : []).filter((id) => ids.includes(id)); return [...got, ...ids.filter((id) => !got.includes(id))]; };
  return { order: fix(hl.order, HOME_BLOCKS), rows: fix(hl.rows, HOME_ROWS), hidden: new Set(Array.isArray(hl.hidden) ? hl.hidden : []) };
}
function HomeLayoutSettings({ ds, onChange }) {
  const hl = ds.homeLayout || {};
  const L = homeLayoutOf({ displaySettings: ds });
  const save = (patch) => onChange({ homeLayout: { order: L.order, rows: L.rows, hidden: [...L.hidden], ...hl, ...patch } });
  const toggle = (id) => { const h = new Set(L.hidden); if (h.has(id)) h.delete(id); else h.add(id); save({ hidden: [...h] }); };
  const move = (key, list, i, d) => { const a = [...list]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; save({ [key]: a }); };
  const item = (label, hid, onUp, onDown, sub, indent) => (
    <div className="flex items-center gap-1.5 py-1" style={{ paddingLeft: indent ? 18 : 0, borderTop: "1px dashed var(--rule-soft)" }}>
      <button onClick={() => toggle(hid)} className="text-xs" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink)" }}>{L.hidden.has(hid) ? "☐" : "☑"}</button>
      <span className="flex-1 text-[11px]" style={{ color: L.hidden.has(hid) ? "var(--ink-mute)" : "var(--ink)", textDecoration: L.hidden.has(hid) ? "line-through" : "none" }}>{label}{sub ? <span className="text-[10px] ml-1" style={{ color: "var(--ink-mute)" }}>{sub}</span> : null}</span>
      {onUp && <button onClick={onUp} aria-label="上へ" className="btn-ghost text-[10px] px-1.5 py-0">▲</button>}
      {onDown && <button onClick={onDown} aria-label="下へ" className="btn-ghost text-[10px] px-1.5 py-0">▼</button>}
    </div>
  );
  return (
    <div className="jp mb-3">
      <div className="flex items-center text-xs mb-1" style={{ color: "var(--ink-soft)" }}><span className="flex-1">ホームの表示（☑で表示・▲▼で並べ替え）</span><button onClick={() => onChange({ homeLayout: null })} className="text-[10px]" style={{ background: "none", border: "none", color: "var(--ink-mute)", textDecoration: "underline", cursor: "pointer" }}>元に戻す</button></div>
      <div className="px-2 py-1" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 8 }}>
        {L.order.map((id, i) => { const b = HOME_BLOCKS.find((x) => x.id === id); return (
          <div key={id}>
            {item(b.name, id, () => move("order", L.order, i, -1), () => move("order", L.order, i, 1), b.note)}
            {id === "top" && !L.hidden.has("top") && HOME_TOP_PARTS.map((t) => <div key={t.id}>{item(t.name, `top:${t.id}`, null, null, null, true)}</div>)}
            {id === "guide" && !L.hidden.has("guide") && L.rows.map((r, k) => <div key={r}>{item((HOME_ROWS.find((x) => x.id === r) || {}).name, `row:${r}`, () => move("rows", L.rows, k, -1), () => move("rows", L.rows, k, 1), null, true)}</div>)}
          </div>); })}
      </div>
    </div>
  );
}

// ── ホームのメニュー画面（コマンド・立ち絵・ゲージ・メッセージ） ──
const MENU_COMMANDS = [
  { id: "today", label: "今日の復習" },
  { id: "qbank", label: "問題集", desc: "問題集を選んで学習します。周回の記録や苦手問題の書き出しもここから。" },
  { id: "adventure", label: "冒険", desc: "装備・ショップ・ボス戦・転職の神殿・相棒の育成ができます。" },
  { id: "status", label: "ステータス", desc: "能力値、正答率、学習時間の推移を確認します。" },
  { id: "qual", label: "資格", desc: "目指す資格と試験日を管理します。" },
  { id: "task", label: "タスク", desc: "今日やることを登録して、クリアするとEXPがもらえます。" },
  { id: "timer", label: "タイマー", desc: "学習時間を計ります。" },
  { id: "memo", label: "メモ", desc: "フォルダごとに学習メモをまとめます。" },
  { id: "law", label: "条文", desc: "条文番号やキーワードで、条文と問題をまとめて探します。" },
  { id: "option", label: "設定", desc: "テーマ、文字の大きさ・フォント、タイトル画面の表示を変えられます。" },
];
function MenuHome({ state, todayCount, onCommand }) {
  const [focus, setFocus] = useState(null);
  const [imgOk, setImgOk] = useState(true);
  const player = state.player;
  const xpNeeded = getXpForNextLevel(player.level);
  const mainAch = player.mainTitleId ? player.achievements.find((a) => a.id === player.mainTitleId) : null;
  const title = mainAch ? mainAch.title : getLevelTitle(player.level);
  const cls = getClassInfo(state);
  const pet = getPetInfo(state);
  const aw = getAwakening(state);
  const r = normRpg(state.rpg);
  const eqRows = RPG_SLOTS.map((s) => { const inv = r.inventory.find((v) => v.u === r.equipped[s.id]); return { slot: s, it: rpgInvItem(inv) }; });
  // 今日すでに解いた問題数（回答の記録から）
  const d = new Date();
  const code = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  let doneToday = 0;
  for (const b of state.questionBanks) for (const q of b.questions || []) if (Array.isArray(q.ah) && q.ah.some((c) => c.startsWith(code))) doneToday++;
  const active = focus || "today";
  const cmd = MENU_COMMANDS.find((c) => c.id === active);
  const message = focus ? (cmd.id === "today" ? (todayCount > 0 ? `期限が来た問題と未学習の問題に挑みます。今日の復習は あと${todayCount}問。` : "今日の復習は完了しています。未学習の問題に進むこともできます。") : cmd.desc) : null;
  const subLine = [cls ? `クラス：${cls.rankName}` : null, mainAch && mainAch.job ? `称号：${mainAch.job}` : null].filter(Boolean).join("　／　");

  return (
    <div className="space-y-3 mb-4">
      <div className="grid gap-3 md:grid-cols-[210px_1fr]">
        {/* コマンド */}
        <div className="flex flex-col gap-3 order-2 md:order-1">
          <div className="rpg-box p-2" onMouseLeave={() => setFocus(null)}>
            <div className="grid grid-cols-2 md:grid-cols-1 gap-0.5">
              {MENU_COMMANDS.map((c) => {
                const on = active === c.id;
                const badge = c.id === "today" && todayCount > 0 ? todayCount : null;
                return (
                  <button key={c.id} onClick={() => onCommand(c.id)} onMouseEnter={() => setFocus(c.id)} onFocus={() => setFocus(c.id)}
                    className="jp flex items-center gap-1.5 text-left" style={{ ...(on ? CL.rowOn : CL.rowOff), minHeight: 44, padding: "0 10px 0 6px", border: "none", borderRadius: 3, color: "#eef1f6", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                    <span style={{ width: 12, fontSize: 11, color: on ? "#c8d6ea" : "transparent" }}>▶</span>
                    <span className="flex-1">{c.label}</span>
                    {badge && <span className="text-[11px] px-1.5" style={{ background: "#a24a45", color: "#fff", borderRadius: 999, minWidth: 22, textAlign: "center" }}>{badge}</span>}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="rpg-box px-4 py-3 jp flex flex-col gap-1.5">
            <div className="flex justify-between items-baseline"><span className="text-xs" style={CL.label}>覚醒</span><span style={{ ...CL.gold, letterSpacing: 2 }}>{"★".repeat(aw.stars)}<span style={{ color: "#4c5a75" }}>{"★".repeat(5 - aw.stars)}</span></span></div>
            <div className="flex justify-between items-baseline gap-2"><span className="text-xs" style={CL.label}>相棒</span><span className="text-sm truncate" style={{ fontWeight: 700 }}>{pet ? `${pet.icon} ${pet.name}（${pet.stageName}）` : "まだいません"}</span></div>
          </div>
        </div>

        {/* パーティ */}
        <div className="rpg-box p-3 md:p-4 order-1 md:order-2">
          <div className="flex flex-col sm:flex-row gap-4">
            <button onClick={() => onCommand("status")} title="ステータス画面へ" className="flex-shrink-0 w-full sm:w-[220px] h-[240px] sm:h-[330px] overflow-hidden relative" style={{ border: "2px solid #e4e9f2", borderRadius: 4, boxShadow: "0 0 0 3px #0a1226, 0 0 0 4px rgba(160,185,215,0.6), 0 0 14px rgba(90,115,170,0.25)", background: "#141c36", padding: 0, cursor: "pointer" }}>
              {imgOk ? (
                <img src={HERO_URL} alt="主人公の立ち絵" onError={() => setImgOk(false)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 12%", display: "block" }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><HeroPortrait state={state} size={200} pixel /></div>
              )}
            </button>
            <div className="flex-1 min-w-0 flex flex-col gap-3 jp">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl md:text-2xl" style={{ fontWeight: 800, letterSpacing: 1 }}>{title}</span>
                {cls && <span className="text-xs px-2 py-0.5" style={{ background: "#34508c", border: "1px solid #b6c6e0", borderRadius: 3, fontWeight: 700 }}>{cls.icon} {cls.name}</span>}
                <span className="ml-auto text-sm" style={CL.label}>Lv</span><span className="text-3xl" style={{ ...CL.gold, fontWeight: 800 }}>{player.level}</span>
              </div>
              {subLine && <div className="text-sm" style={{ color: "#c9d4e2" }}>{subLine}</div>}
              <ClassicGauge label="EXP" value={player.xp} max={xpNeeded} text={`${player.xp} / ${xpNeeded}`} colors={["#3d5c9e", "#9db6dc"]} />
              <ClassicGauge label="今日の復習" value={doneToday} max={doneToday + todayCount} text={`${doneToday} / ${doneToday + todayCount}`} colors={["#a87d45", "#dcc287"]} />
              <ClassicGauge label={aw.next ? "記憶の定着（次の★まで）" : "記憶の定着"} value={aw.mastered} max={aw.next || aw.mastered || 1} text={aw.next ? `${aw.mastered} / ${aw.next}` : `${aw.mastered}問`} colors={["#3e7468", "#9cc8bb"]} />
              <div style={{ height: 1, background: "linear-gradient(90deg, rgba(160,185,215,0), rgba(160,185,215,0.55), rgba(160,185,215,0))" }} />
              <div>
                <div className="text-sm mb-1.5" style={{ ...CL.label, fontWeight: 700 }}>装備</div>
                <div className="grid gap-1.5" style={{ gridTemplateColumns: "88px 1fr" }}>
                  {eqRows.map(({ slot, it }) => (
                    <Fragment key={slot.id}>
                      <span className="text-xs" style={CL.label}>{slot.label}</span>
                      <span className="text-sm truncate" style={{ fontWeight: 700, color: it ? "#eef1f6" : "#7f8aa6" }}>{it ? `${it.icon} ${it.label}` : "なし"}{it && <span className="text-[11px] ml-2" style={{ color: "#c9d4e2", fontWeight: 400 }}>{fxText(it.fx)}</span>}</span>
                    </Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 吹き出し（名言・今日の様子。メニューに合わせると説明） */}
      <MentorBubble state={state} todayCount={todayCount} theme="classic" avatar={HERO_URL} face={[52, 13]} override={message} />
    </div>
  );
}

// ============ 問題文の表示（フォント・文字サイズ） ============
const QFONTS = [
  { id: "dot", label: "標準（テーマに合わせる）", css: "'DotGothic16', 'Hiragino Kaku Gothic ProN', sans-serif" },
  { id: "mincho", label: "明朝体（BIZ UD明朝）", css: "'BIZ UDMincho', 'Yu Mincho', 'YuMincho', 'Hiragino Mincho ProN', 'MS Mincho', serif", web: "BIZ+UDMincho" },
  { id: "mincho-sys", label: "明朝体（端末の標準）", css: "'Yu Mincho', 'YuMincho', 'Hiragino Mincho ProN', 'MS Mincho', serif" },
  { id: "gothic", label: "ゴシック体（BIZ UDPゴシック）", css: "'BIZ UDPGothic', 'Yu Gothic', 'YuGothic', 'Hiragino Sans', 'Meiryo', sans-serif", web: "BIZ+UDPGothic" },
];
const QSIZES = [
  { id: "auto", label: "標準", px: null },
  { id: "s", label: "小", px: 15 },
  { id: "l", label: "大", px: 20 },
  { id: "xl", label: "特大", px: 23 },
];
const DISPLAY_DEFAULTS = { qFont: "dot", qSize: "auto", theme: "white", showTitle: true };
// テーマの一新：これまでの設定を一度だけ白金テーマに切り替える（その後は自由に選べる）
const migrateDisplay = (ds) => (ds.themeV >= 2 ? ds : { ...ds, theme: "white", themeV: 2 });

// 問題文・答え（class="qtext"）にフォントとサイズを当てる
function QTextStyle({ settings }) {
  const ds = { ...DISPLAY_DEFAULTS, ...(settings || {}) };
  let font = QFONTS.find((f) => f.id === ds.qFont) || QFONTS[0];
  // クラシックテーマでは「標準」を丸ゴシックにする
  if (font.id === "dot" && ds.theme === "classic") font = { id: "dot", css: "'M PLUS Rounded 1c', 'Hiragino Maru Gothic ProN', sans-serif" };
  if (font.id === "dot" && ds.theme === "white") font = { id: "dot", css: "'Zen Kaku Gothic New', 'Hiragino Kaku Gothic ProN', sans-serif" };
  const size = QSIZES.find((z) => z.id === ds.qSize) || QSIZES[0];
  useEffect(() => {
    if (!font.web) return;
    const id = "qfont-" + font.id;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id; link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${font.web}:wght@400;700&display=swap`;
    document.head.appendChild(link);
  }, [font.id]);
  const css = `.qtext{font-family:${font.css} !important;${size.px ? `font-size:${size.px}px !important;` : ""}${font.id !== "dot" ? "line-height:1.85;" : ""}}
.qtext-list{font-family:${font.css} !important;}`;
  return <style>{css}</style>;
}

// 文字の設定パネル（画面上部の「Aa 文字」から開く）
// ── 通知（毎日のお知らせ）：この端末の宛先を userdata/{uid}/push/{端末id} に保存。送るのは GitHub の自動実行（scripts/notify） ──
const PUSH_SLOTS = [[7, "朝7時"], [12, "昼12時"], [20, "夜20時"], [22, "夜22時"]];
const pushDeviceId = () => { try { let id = localStorage.getItem("sq-push-device"); if (!id) { id = uid(); localStorage.setItem("sq-push-device", id); } return id; } catch (e) { return "device"; } };
function PushSettings({ uid: userId }) {
  const [doc, setDoc] = useState(undefined); // undefined=読み込み中 / null=未登録
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const dev = pushDeviceId();
  const ref = userId ? fbDb.collection("userdata").doc(userId).collection("push").doc(dev) : null;
  useEffect(() => { if (!ref) return; ref.get().then((sn) => setDoc(sn.exists ? sn.data() : null)).catch(() => setDoc(null)); }, [userId]);
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone = window.navigator.standalone || (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches);
  const supported = "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
  const enable = async () => {
    setBusy(true); setMsg("");
    try {
      const perm = await window.Notification.requestPermission();
      if (perm !== "granted") throw new Error("通知が許可されませんでした。端末の設定で、このアプリの通知を「許可」にしてください。");
      const token = await getPushToken();
      const data = { token, enabled: true, hours: (doc && doc.hours) || [20], ua: navigator.userAgent.slice(0, 120), updatedAt: new Date().toISOString() };
      await ref.set(data);
      setDoc(data); setMsg("この端末で通知を受け取れるようになりました！");
    } catch (e) { setMsg(String((e && e.message) || e)); }
    setBusy(false);
  };
  const save = async (patch) => { const data = { ...doc, ...patch, updatedAt: new Date().toISOString() }; setDoc(data); try { await ref.set(data); } catch (e) { setMsg("保存できませんでした。通信状態を確かめてください。"); } };
  const test = async () => { try { const reg = await navigator.serviceWorker.ready; await reg.showNotification("Study Quest（ためし）", { body: "通知はこのように表示されます。", icon: "icon-192.png", tag: "sq-test" }); } catch (e) { setMsg("ためしの通知を出せませんでした。"); } };
  const box = { background: "var(--cream)", border: "1px solid var(--rule-soft)", borderRadius: 8, color: "var(--ink-soft)", lineHeight: 1.7 };
  return (
    <div className="jp mb-3">
      <div className="text-xs mb-1" style={{ color: "var(--ink-soft)" }}>毎日のお知らせ（通知）</div>
      <div className="text-[11px] px-3 py-2 space-y-2" style={box}>
        {!FCM_VAPID_KEY ? <div>通知の準備（鍵の設定）がまだです。設定が終わると、ここから申し込めるようになります。</div>
          : ios && !standalone ? <div>iPhone・iPad で通知を受け取るには、まず「ホーム画面に追加」して、ホーム画面のアイコンからこのアプリを開いてください。</div>
          : !supported ? <div>この端末・ブラウザは通知に対応していません。</div>
          : doc === undefined ? <div>読み込んでいます…</div>
          : !doc || !doc.enabled ? (
            <>
              <div>毎日決まった時刻に「今日の復習があと○問」などをお知らせします。</div>
              <button onClick={enable} disabled={busy} className="btn-primary w-full py-2 text-xs">{busy ? "申し込んでいます…" : "この端末で通知を受け取る"}</button>
            </>
          ) : (
            <>
              <div style={{ color: "var(--sage)", fontWeight: 800 }}>✓ この端末で通知を受け取っています</div>
              <div className="flex flex-wrap gap-1.5">
                {PUSH_SLOTS.map(([h, l]) => { const on = (doc.hours || []).includes(h); return <button key={h} onClick={() => save({ hours: on ? (doc.hours || []).filter((x) => x !== h) : [...(doc.hours || []), h].sort((a, b) => a - b) })} className="text-[11px] px-2.5 py-1" style={{ borderRadius: 999, border: `1px solid ${on ? "var(--gold)" : "var(--rule-soft)"}`, background: on ? "var(--paper)" : "transparent", color: "var(--ink)", fontWeight: on ? 800 : 500, cursor: "pointer" }}>{on ? "✓ " : ""}{l}</button>; })}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button onClick={test} className="btn-ghost py-1.5 text-[11px]">ためしに表示</button>
                <button onClick={() => save({ enabled: false })} className="btn-ghost py-1.5 text-[11px]">通知を止める</button>
              </div>
              <div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>※ 時刻は目安です（数分〜数十分ずれることがあります）。</div>
            </>
          )}
        {msg && <div style={{ color: "var(--gold)", fontWeight: 700 }}>{msg}</div>}
      </div>
    </div>
  );
}

function DisplaySettingsPanel({ settings, onChange, onClose, uid: userId }) {
  const ds = { ...DISPLAY_DEFAULTS, ...(settings || {}) };
  return (
    <div className="rpg-box mb-4 p-1">
      <div className="rpg-inner-border">
        <div className="flex items-center justify-between mb-2">
          <div className="jp text-sm" style={{ color: "var(--ink)" }}>Aa 表示の設定</div>
          <button onClick={onClose} className="jp text-[10px] px-1.5 py-0.5" style={{ border: "1px solid var(--rule-soft)", background: "var(--paper)", color: "var(--ink-soft)" }}>✕ 閉じる</button>
        </div>
        <div className="jp text-xs mb-1" style={{ color: "var(--ink-soft)" }}>テーマ</div>
        <div className="grid grid-cols-3 gap-1 mb-2">
          {[["white", "白金"], ["classic", "クラシック"], ["dot", "ドット（旧）"]].map(([id, label]) => (
            <button key={id} onClick={() => onChange({ theme: id })} className="jp py-1.5 px-1 text-xs" style={{ background: ds.theme === id ? "var(--sky-deep)" : "var(--paper)", color: ds.theme === id ? "var(--paper)" : "var(--ink)", border: "1px solid var(--rule)" }}>{label}</button>
          ))}
        </div>
        <button onClick={() => onChange({ showTitle: ds.showTitle === false })} className="jp w-full text-left text-xs px-2 py-1.5 mb-3" style={{ background: "var(--paper)", color: "var(--ink)", border: "1px solid var(--rule-soft)" }}>
          {ds.showTitle === false ? "☐" : "☑"} 起動時にタイトル画面を表示する（白金・クラシック）
        </button>
        {!(window.navigator.standalone || (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches)) && (
          <div className="jp text-[11px] mb-3 px-3 py-2" style={{ background: "var(--cream)", border: "1px solid var(--rule-soft)", borderRadius: 8, color: "var(--ink-soft)", lineHeight: 1.7 }}>
            <b style={{ color: "var(--ink)" }}>アプリのように使う：</b>iPhone・iPad は Safari でこのページを開き、共有ボタン（□に↑）→「ホーム画面に追加」。PC の Chrome・Edge は、アドレス欄の右の「インストール」から。ホーム画面のアイコンから、画面いっぱいで開けます。
          </div>
        )}
        <PushSettings uid={userId} />
        <HomeLayoutSettings ds={ds} onChange={onChange} />
        <div className="jp text-xs mb-1" style={{ color: "var(--ink-soft)" }}>ホームのキャラクター（白金テーマ）</div>
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          {HOME_CHARS.map((c) => {
            const on = (ds.homeChar || "hero") === c.id;
            return (
              <button key={c.id} onClick={() => onChange({ homeChar: c.id })} className="jp flex flex-col items-center gap-1 py-1.5" style={{ background: on ? "var(--cream)" : "var(--paper)", border: `1px solid ${on ? "var(--gold)" : "var(--rule-soft)"}`, borderRadius: 8, cursor: "pointer" }}>
                <span style={{ width: 40, height: 40, borderRadius: "50%", border: `2px solid ${on ? "#b08a3e" : "#d8c9a3"}`, backgroundColor: "#e9e4d6", backgroundImage: `url(${c.avatar})`, backgroundSize: "300% auto", backgroundPosition: `${c.face[0]}% ${c.face[1]}%` }} />
                <span className="text-[10px]" style={{ color: "var(--ink)", fontWeight: on ? 800 : 500 }}>{c.name}</span>
              </button>
            );
          })}
        </div>
        <div className="jp text-xs mb-1" style={{ color: "var(--ink-soft)" }}>バトル</div>
        <button onClick={() => onChange({ battle: ds.battle === false })} className="jp w-full text-left text-xs px-2 py-1.5 mb-1" style={{ background: "var(--paper)", color: "var(--ink)", border: "1px solid var(--rule-soft)" }}>
          {ds.battle === false ? "☐" : "☑"} 問題を解くときにバトルの演出を出す
        </button>
        <div className="jp text-xs mb-1" style={{ color: "var(--ink-soft)" }}>ひっかけ言葉の印（問題文の「できない」「以外」「限り」などに点線）</div>
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {[[null, "自動"], [true, "オン"], [false, "オフ"]].map(([v, l]) => { const cur = ds.trapMark === undefined ? null : ds.trapMark; const on = cur === v; return <button key={l} onClick={() => onChange({ trapMark: v })} className="jp text-xs py-1.5" style={{ background: on ? "var(--sky-deep)" : "var(--paper)", color: on ? "var(--paper)" : "var(--ink)", border: "1px solid var(--rule-soft)", borderRadius: 6 }}>{l}</button>; })}
        </div>
        <p className="jp text-[10px] -mt-2 mb-3" style={{ color: "var(--ink-mute)" }}>自動：まちがえた原因に「👓 読み違い」を3回以上選ぶと、印がつくようになります。</p>
        <button onClick={() => { const on = !ds.sfx; SFX.enabled = on; if (on) SFX.play("hit"); onChange({ sfx: on }); }} className="jp w-full text-left text-xs px-2 py-1.5 mb-3" style={{ background: "var(--paper)", color: "var(--ink)", border: "1px solid var(--rule-soft)" }}>
          {ds.sfx ? "☑" : "☐"} 効果音を鳴らす（攻撃・会心・レベルアップなど）
        </button>
        <div className="jp text-xs mb-1" style={{ color: "var(--ink-soft)" }}>問題文のフォント</div>
        <div className="grid grid-cols-2 gap-1 mb-3">
          {QFONTS.map((f) => (
            <button key={f.id} onClick={() => onChange({ qFont: f.id })} className="py-1.5 px-1 text-xs" style={{ fontFamily: f.css, background: ds.qFont === f.id ? "var(--sky-deep)" : "var(--paper)", color: ds.qFont === f.id ? "var(--paper)" : "var(--ink)", border: "1px solid var(--rule)" }}>{f.label}</button>
          ))}
        </div>
        <div className="jp text-xs mb-1" style={{ color: "var(--ink-soft)" }}>文字の大きさ</div>
        <div className="grid grid-cols-4 gap-1 mb-3">
          {QSIZES.map((z) => (
            <button key={z.id} onClick={() => onChange({ qSize: z.id })} className="jp py-1.5 text-xs" style={{ background: ds.qSize === z.id ? "var(--sky-deep)" : "var(--paper)", color: ds.qSize === z.id ? "var(--paper)" : "var(--ink)", border: "1px solid var(--rule)" }}>{z.label}</button>
          ))}
        </div>
        <div className="jp text-[10px] mb-1" style={{ color: "var(--ink-mute)" }}>見本</div>
        <div className="qtext jp text-base md:text-lg p-2" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", color: "var(--ink)" }}>
          甲建物の附属建物を分割して乙建物の附属建物に合併する建物の分割の登記及び建物の合併の登記の申請は、一の申請情報によってすることができる。
        </div>
        <p className="jp text-[10px] mt-2" style={{ color: "var(--ink-mute)" }}>フォントと大きさは問題文と答えの表示に使われます。設定はほかの端末にも同期されます。</p>
      </div>
    </div>
  );
}

// 問題ごとの回答の記録（何回目を何日に解いたか）
function AnswerHistory({ q, compact = false }) {
  const ah = Array.isArray(q && q.ah) ? q.ah : [];
  if (ah.length === 0) return null;
  const mark = { s: "◎", u: "△", w: "✕" };
  const color = { s: "var(--sage)", u: "var(--slate)", w: "var(--brick)" };
  const items = compact ? ah.slice(-8) : ah;
  const offset = ah.length - items.length;
  return (
    <div className="flex flex-wrap gap-1 mt-1 items-center">
      <span className="jp text-[10px]" style={{ color: "var(--ink-mute)" }}>{compact ? "回答日" : "回答の記録"}</span>
      {offset > 0 && <span className="jp text-[10px]" style={{ color: "var(--ink-mute)" }}>…</span>}
      {items.map((c, i) => {
        const m = Number(c.slice(2, 4)), d = Number(c.slice(4, 6)), r = c[6];
        return (
          <span key={i} className="jp text-[10px] px-1" title={`${offset + i + 1}回目（20${c.slice(0, 2)}/${m}/${d}）`} style={{ border: `1px solid ${color[r] || "var(--rule-soft)"}`, color: color[r] || "var(--ink-soft)", background: "var(--paper)" }}>
            {compact ? "" : `${offset + i + 1}回目 `}{m}/{d}{mark[r] || ""}
          </span>
        );
      })}
    </div>
  );
}

// ============ 間隔反復（FSRS：Ankiの現行アルゴリズム） ============
// ボタンとAnkiの評価の対応：✕ 不正解 = Again / △ 自信なし = Hard / ◎ 確実 = Good
// 次の出題日は「YYYY-MM-DD」（端末の日付）で sr_nextReview に保存する。
// FSRSの記憶状態は問題ごとに fs = { s:安定度, d:難しさ, st:状態, r:回答回数, l:忘却回数, lr:前回の回答時刻 } で保存する。
const SR_DEFAULTS = { retention: 0.9, maxInterval: 365 }; // 目標記憶率90%（Ankiの標準）・最大間隔1年
const fsrsSchedulerCache = new Map();
function getFsrsScheduler(settings) {
  const r = (settings && settings.retention) || SR_DEFAULTS.retention;
  const mi = (settings && settings.maxInterval) || SR_DEFAULTS.maxInterval;
  const key = `${r}_${mi}`;
  if (!fsrsSchedulerCache.has(key)) {
    fsrsSchedulerCache.set(key, createFsrs({ request_retention: r, maximum_interval: mi, enable_fuzz: false, enable_short_term: false }));
  }
  return fsrsSchedulerCache.get(key);
}
const localDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const parseLocalDate = (str) => { const [y, m, d] = String(str).split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const round3 = (n) => Math.round(n * 1000) / 1000;
// 問題ごとの回答の記録：「YYMMDD」＋結果（s=◎確実 / u=△自信なし / w=✕不正解）を直近20回まで保存
const AH_MAX = 20;
const answerHistCode = (now, correct, meta) => {
  const yymmdd = `${String(now.getFullYear()).slice(2)}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}`;
  return yymmdd + (!correct ? "w" : (meta && meta.conf === "unsure" ? "u" : "s"));
};

// 問題データ → FSRSのカード
function toFsrsCard(q, now) {
  if (q.fs && typeof q.fs.s === "number") {
    return {
      ...createEmptyCard(now),
      stability: q.fs.s, difficulty: q.fs.d, state: q.fs.st,
      reps: q.fs.r || 0, lapses: q.fs.l || 0,
      scheduled_days: q.sr_interval || 0,
      last_review: q.fs.lr ? new Date(q.fs.lr) : undefined,
      due: q.sr_nextReview ? parseLocalDate(q.sr_nextReview) : now,
    };
  }
  if (q.sr_nextReview && (q.sr_interval || 0) > 0) {
    // 旧方式（1→3→7→14→30日）で予定済みの問題：今の間隔を引き継いで移行
    const due = parseLocalDate(q.sr_nextReview);
    return {
      ...createEmptyCard(now),
      stability: q.sr_interval, difficulty: 5, state: State.Review,
      reps: Math.max(1, q.sr_streak || 1), lapses: 0,
      scheduled_days: q.sr_interval,
      last_review: new Date(due.getTime() - q.sr_interval * 86400000),
      due,
    };
  }
  return createEmptyCard(now);
}
const ratingOf = (correct, meta) => !correct ? Rating.Again : (meta && meta.conf === "unsure" ? Rating.Hard : Rating.Good);

// 回答をFSRSで計算し、問題データに書き込む更新分を返す
function scheduleAnswer(q, correct, meta, settings, now) {
  const grade = ratingOf(correct, meta);
  const card = toFsrsCard(q, now);
  const nc = getFsrsScheduler(settings).next(card, now, grade).card;
  const maxIv = (settings && settings.maxInterval) || SR_DEFAULTS.maxInterval;
  const days = Math.min(maxIv, Math.max(1, nc.scheduled_days || 1));
  const due = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  queueReviewLog({ q: q.id, g: grade, t: now.getTime(), st: card.state, s: round3(card.stability), d: round3(card.difficulty), lr: q.fs ? q.fs.lr || null : null });
  return {
    sr_nextReview: localDateStr(due),
    sr_interval: days,
    sr_streak: correct ? (q.sr_streak || 0) + 1 : 0,
    ah: [...(Array.isArray(q.ah) ? q.ah : []), answerHistCode(now, correct, meta)].slice(-AH_MAX),
    fs: { s: round3(nc.stability), d: round3(nc.difficulty), st: nc.state, r: nc.reps, l: nc.lapses, lr: now.getTime() },
  };
}

// 各ボタンを押した場合の次回までの日数（ボタンに表示する）
function previewIntervals(q, settings) {
  if (!q) return null;
  try {
    const now = new Date();
    const card = toFsrsCard(q, now);
    const f = getFsrsScheduler(settings);
    const maxIv = (settings && settings.maxInterval) || SR_DEFAULTS.maxInterval;
    const days = (g) => Math.min(maxIv, Math.max(1, f.next(card, now, g).card.scheduled_days || 1));
    return { again: days(Rating.Again), hard: days(Rating.Hard), good: days(Rating.Good) };
  } catch (e) { return null; }
}
const fmtDays = (n) => n >= 365 ? `${Math.round(n / 36.5) / 10}年` : n >= 60 ? `${Math.round(n / 30)}か月` : `${n}日`;

// 回答履歴（将来、あなた専用にFSRSを最適化するための記録）
// userdata/{uid}/reviewlogs/{日付} に1日分ずつまとめて保存する
let reviewLogUid = null;
let reviewLogBuf = [];
let reviewLogTimer = null;
function queueReviewLog(entry) {
  if (!reviewLogUid) return;
  reviewLogBuf.push(entry);
  if (reviewLogTimer) return;
  reviewLogTimer = setTimeout(() => {
    const buf = reviewLogBuf; reviewLogBuf = []; reviewLogTimer = null;
    if (buf.length === 0) return;
    fbDb.collection("userdata").doc(reviewLogUid).collection("reviewlogs").doc(localDateStr(new Date()))
      .set({ logs: fbFieldValue.arrayUnion(...buf) }, { merge: true })
      .catch((e) => console.warn("Review log:", e));
  }, 5000);
}
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ============ 確信度・間違いの種類 ============
const ERROR_TYPES = [
  { id: "knowledge", label: "知識不足", icon: "📕", hint: "覚えていなかった", advice: "解説と条文で覚え直そう" },
  { id: "confusion", label: "混同", icon: "🔀", hint: "似た知識と取り違えた", advice: "似た知識を表に並べて違いを比較しよう" },
  { id: "misread", label: "読み違い", icon: "👓", hint: "問題文を読み違えた", advice: "主語・否定語・数字に印をつけて読もう" },
  { id: "careless", label: "ケアレス", icon: "💨", hint: "分かっていたのにミス", advice: "解答前の見直し手順を決めよう" },
];
// 自動判定の苦手：不正解>正解 / 直近が「自信なし正解」/ 直近が「自信ありの不正解」
const isQuestionAutoWeak = (q) => !!q && ((q.wrong > 0 && q.correct < q.wrong) || q.lastConf === "unsure" || q.lastConf === "wrongSure");
// 苦手（自動判定 + ⭐手動マーク）
const isQuestionWeak = (q) => !!q && (isQuestionAutoWeak(q) || q.marked);
// 間違いの種類を「混同2・知識不足1」形式の文字列にする
const formatErrTypes = (errTypes) => ERROR_TYPES.filter((t) => errTypes && errTypes[t.id]).map((t) => `${t.label}${errTypes[t.id]}`).join("・");
// 回答時の確信度・間違いの種類を問題データに反映（meta が無ければ何もしない）
function applyAnswerMeta(q, correct, meta) {
  if (!meta) return q;
  const next = { ...q };
  if (correct) {
    next.lastConf = meta.conf === "unsure" ? "unsure" : "sure";
    if (meta.conf === "unsure") next.unsureCnt = (q.unsureCnt || 0) + 1;
  } else {
    next.lastConf = meta.confident ? "wrongSure" : "wrong";
    if (meta.confident) next.cwCnt = (q.cwCnt || 0) + 1;
    if (meta.errType) next.errTypes = { ...(q.errTypes || {}), [meta.errType]: ((q.errTypes || {})[meta.errType] || 0) + 1 };
  }
  return next;
}

function calculateStatus(state) {
  const dates = new Set([...state.studyLog.map((l) => l.date), ...((state.rpg && Array.isArray(state.rpg.restDays)) ? state.rpg.restDays : [])]); // お休みチケットの日も含む
  let currentStreak = 0;
  const today = new Date(); today.setHours(0,0,0,0);
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    if (dates.has(key)) currentStreak++;
    else if (i > 0) break;
  }
  const totalMin = state.studyLog.reduce((a, b) => a + b.minutes, 0);
  const totalHours = totalMin / 60;
  const totalCorrect = state.questionBanks.reduce((a, b) => a + b.questions.reduce((aa, q) => aa + q.correct, 0), 0);
  const longestQaStreak = state.player.bestQaStreak || 0;
  const acquiredQuals = state.qualifications.filter((q) => q.acquired).length;
  const totalClears = state.questionBanks.reduce((a, b) => a + (b.clears || 0), 0);
  const taskClearTotal = Object.values(state.taskClears || {}).reduce((a, b) => a + b, 0);
  const hp = Math.floor(50 + currentStreak * 10);
  const mp = Math.floor(30 + state.player.level * 5);
  const atk = Math.floor(state.player.totalCompleted * 2 + taskClearTotal);
  const def = Math.floor(totalHours * 1.5);
  const int = Math.floor(totalCorrect + totalClears * 5);
  const luk = Math.floor(longestQaStreak * 3 + acquiredQuals * 10);
  return { hp, mp, atk, def, int, luk, totalHours, totalCorrect, currentStreak, acquiredQuals, totalClears, taskClearTotal, longestQaStreak };
}

// ============ Initial state ============
const INIT = {
  player: { level: 1, xp: 0, totalCompleted: 0, totalQaAnswered: 0, achievements: [], mainTitleId: null, seededProfile: false, bestQaStreak: 0 },
  qualifications: [], tasks: [], taskPresets: [], taskClears: {}, studyLog: [], questionBanks: [],
  folders: [],
  studyNotes: [], // {id, folderId, title, content, createdAt, updatedAt}
  sessionResume: null, // {bankId, mode, queueIds, stats, savedAt} | null
  timer: { qualId: null, startMs: null, autoMode: null },
};
const SEED_ACHIEVEMENTS = [
  { id: "seed-surveyor", title: "大地を読む者", job: "測量士", icon: "🗺️", color: "#6d8454", source: "qualification", description: "測量士の資格を有する者の証。", earnedAt: new Date().toISOString() },
  { id: "seed-eng-asst", title: "工学の従者", job: "技術士補", icon: "⚙️", color: "#5d7894", source: "qualification", description: "技術士補の証。", earnedAt: new Date().toISOString() },
];

// ============ Local Storage helpers ============
function loadLocalState() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v) return JSON.parse(v);
    for (const k of LEGACY_KEYS) {
      const legacy = localStorage.getItem(k);
      if (legacy) return JSON.parse(legacy);
    }
  } catch {}
  return null;
}
function saveLocalState(uid, s) {
  try { localStorage.setItem(`${STORAGE_KEY}:${uid}`, JSON.stringify(s)); } catch (e) { console.error(e); }
}
function loadUserLocalState(uid) {
  try {
    const v = localStorage.getItem(`${STORAGE_KEY}:${uid}`);
    if (v) return JSON.parse(v);
  } catch {}
  return null;
}

// ============ Auth Screen ============
function AuthScreen({ onAuthed, theme = "dot" }) {
  const classic = theme === "classic" || theme === "white";
  const AP = THEME_PAL[theme === "white" ? "white" : "classic"];
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    if (e) e.preventDefault();
    if (!email.trim() || !password) return;
    setBusy(true); setErr("");
    try {
      if (mode === "login") {
        await fbAuth.signInWithEmailAndPassword(email.trim(), password);
      } else {
        await fbAuth.createUserWithEmailAndPassword(email.trim(), password);
      }
      // onAuthed will fire via listener
    } catch (e) {
      const msg = mapAuthError(e.code || "");
      setErr(msg || e.message || "エラーが発生しました");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="rpg-box p-1 w-full max-w-md">
        <div className="rpg-inner-border">
          <div className="text-center mb-4">
            {classic ? (
              <>
                <div className="text-[13px] mb-1" style={{ ...AP.mincho, fontWeight: 700, letterSpacing: "0.35em" }}>学びの冒険</div>
                <h1 className="m-0 text-[40px]" style={{ ...AP.logo, lineHeight: 1.05 }}>STUDY QUEST</h1>
                {AP.title.copy && <p className="m-0 mt-1 text-[13px]" style={{ fontFamily: "'Shippori Mincho B1', serif", fontWeight: 700, letterSpacing: "0.12em", color: AP.text }}>{AP.title.copy}</p>}
              </>
            ) : (
              <>
                <h1 className="pixel text-base md:text-xl mb-1" style={{ color: "var(--sky-deep)", textShadow: "1px 1px 0 var(--ink)" }}>
                  STUDY QUEST
                </h1>
                <p className="jp text-xs" style={{ color: "var(--ink-soft)" }}>～ 学びの冒険 ～</p>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1 p-1 mb-4" style={{ background: "var(--paper)", border: "1px solid var(--rule)" }}>
            <button onClick={() => { setMode("login"); setErr(""); }} className="jp py-2 text-sm transition"
              style={{ background: mode === "login" ? "var(--sky-deep)" : "transparent", color: mode === "login" ? "var(--paper)" : "var(--ink)" }}>
              ログイン
            </button>
            <button onClick={() => { setMode("signup"); setErr(""); }} className="jp py-2 text-sm transition"
              style={{ background: mode === "signup" ? "var(--sky-deep)" : "transparent", color: mode === "signup" ? "var(--paper)" : "var(--ink)" }}>
              新規登録
            </button>
          </div>

          <form onSubmit={submit}>
            <label className="jp text-xs block mb-1" style={{ color: "var(--ink-soft)" }}>メールアドレス</label>
            <input type="email" autoComplete="email" required className="rpg-input mb-3"
              placeholder="example@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />

            <label className="jp text-xs block mb-1" style={{ color: "var(--ink-soft)" }}>
              パスワード {mode === "signup" && <span style={{ color: "var(--ink-mute)" }}>(6文字以上)</span>}
            </label>
            <input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"}
              required minLength={6} className="rpg-input mb-3"
              placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />

            {err && (
              <div className="jp text-xs p-2 mb-3" style={{ background: "rgba(160,72,72,0.15)", border: "1px solid var(--brick)", color: "var(--brick)" }}>
                {err}
              </div>
            )}

            <button type="submit" disabled={busy || !email.trim() || password.length < 6}
              className="jp btn-primary w-full py-3 mb-2">
              {busy ? "処理中..." : (mode === "login" ? "ログイン" : "新規アカウント作成")}
            </button>
          </form>

          {mode === "signup" && (
            <p className="jp text-[10px] mt-3 text-center leading-relaxed" style={{ color: "var(--ink-mute)" }}>
              新規登録後、3端末すべてで同じメールアドレスでログインすれば<br />
              データが自動同期されます。
            </p>
          )}

          <div className="mt-4 p-2 jp text-[10px] leading-relaxed" style={{ background: "var(--sky-pale)", border: "1px solid var(--rule-soft)", color: "var(--ink-soft)" }}>
            🔒 メールアドレスはFirebase（Google）に保存されます。<br />
            個人利用のため、本物のメールでも、ダミーでも構いません<br />
            （例: <code>study@example.com</code>）。<br />
            パスワードを忘れないようメモを推奨。
          </div>
        </div>
      </div>
    </div>
  );
}

function mapAuthError(code) {
  const m = {
    "auth/invalid-email": "メールアドレスの形式が正しくありません",
    "auth/user-not-found": "このメールアドレスは登録されていません",
    "auth/wrong-password": "パスワードが違います",
    "auth/invalid-credential": "メールアドレスまたはパスワードが違います",
    "auth/email-already-in-use": "このメールアドレスは既に使われています",
    "auth/weak-password": "パスワードは6文字以上にしてください",
    "auth/network-request-failed": "ネットワークエラー。インターネット接続を確認してください",
    "auth/too-many-requests": "試行回数が多すぎます。しばらく待ってください",
  };
  return m[code] || "";
}

// ============ App Wrapper ============
function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsub = fbAuth.onAuthStateChanged((u) => {
      setUser(u);
      setAuthChecked(true);
    });
    return () => unsub();
  }, []);

  const themePre = readPref("sq-theme", "white");
  if (!authChecked) {
    return <><ClassicThemeStyle theme={themePre} /><div className="boot">CHECKING AUTH...</div></>;
  }
  if (!user) return <><ClassicThemeStyle theme={themePre} /><AuthScreen theme={themePre} /></>;
  return <StudyRPG user={user} />;
}

// ============ Main StudyRPG ============
const MAX_TIMER_MS = 6 * 60 * 60 * 1000; // 6時間（異常タイマー検知の閾値）
const NOTE_TABS = ["task", "timer", "memo", "qual"]; // 下のタブ「手帳」にまとめた画面
function StudyRPG({ user }) {
  const [state, setState] = useState(INIT);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("home");
  const [quickPreset, setQuickPreset] = useState(null); // 忘れかけの3問（ホーム → 今日タブ）
  const [openBankReq, setOpenBankReq] = useState(null); // 今日のタスクの「解く」→ 問題タブでその問題集の開始画面を開く
  const lastNoteTab = useRef("task"); // 「手帳」タブで最後に開いていた画面（資格・タスク・時間・メモ）
  useEffect(() => { if (NOTE_TABS.includes(tab)) lastNoteTab.current = tab; }, [tab]);
  // 条文の画面などの「この問題を解く」：sq-study-items の合図で、今日タブですぐ始める
  useEffect(() => {
    const on = (e) => { const list = e.detail || []; if (list.length) { setQuickPreset(list); setTab("today"); } };
    window.addEventListener("sq-study-items", on);
    return () => window.removeEventListener("sq-study-items", on);
  }, []);
  const [showDisplaySettings, setShowDisplaySettings] = useState(false); // 「Aa 文字」パネル
  const [showLawSearch, setShowLawSearch] = useState(false);             // 「📜 条文」パネル
  const [titleOpen, setTitleOpen] = useState(() => readPref("sq-title", "on") !== "off"); // 起動時のタイトル画面
  const [showLevelUp, setShowLevelUp] = useState(null);
  const [showAchievement, setShowAchievement] = useState(null);
  const [floatXp, setFloatXp] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [syncStatus, setSyncStatus] = useState("syncing"); // synced | syncing | offline | error
  const skipNextSave = useRef(true); // skip the very first save after load
  const saveTimeout = useRef(null);
  const isSaving = useRef(false);         // Firestoreへの書き込み中フラグ
  const lastSaveTime = useRef(0);          // 最後にクラウド保存が完了した時刻
  const lastSavedBanks = useRef(null);     // 前回保存時のバンク参照スナップショット（差分保存用）
  const lastSavedMainHash = useRef(null);  // 前回保存時のメインstateハッシュ
  const cloudLoadFailed = useRef(false);   // クラウド読込に失敗した → 初期データでクラウドを上書きしないよう保存を止める
  const SAVE_COOLDOWN_MS = 20000;          // 保存後20秒はリスナーの上書きを無視

  // Load: Firestore (main doc + questionbanks subcollection) -> migrate from local if needed
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const ref = fbDb.collection("userdata").doc(user.uid);
        const banksRef = ref.collection("questionbanks");

        // Fetch main state, question banks, and session resume in parallel
        const [snap, banksSnap, sessionSnap] = await Promise.all([
          ref.get(),
          banksRef.get(),
          // 途中再開データの読込失敗はアプリ全体の読込失敗にしない
          ref.collection("sessions").doc("current").get().catch((e) => { console.warn("Session load skipped:", e); return null; }),
        ]);
        const cloudBanks = banksSnap.docs.map((d) => d.data());
        const cloudResume = sessionSnap && sessionSnap.exists ? sessionSnap.data() : null;

        let merged = { ...INIT };
        if (snap.exists) {
          const cloud = snap.data().state || {};
          // Prefer subcollection banks (no size limit) over inline banks
          const banks = cloudBanks.length > 0 ? cloudBanks : (cloud.questionBanks || []);
          merged = applyDefaults({ ...cloud, questionBanks: banks, sessionResume: cloudResume ?? cloud.sessionResume ?? null });
          setSyncStatus("synced");
        } else {
          // Migrate from local storage
          const local = loadLocalState();
          if (local) {
            merged = applyDefaults(local);
            // Save main state (without questionBanks) to main doc
            const { questionBanks: banks, ...mainState } = merged;
            await ref.set({ state: { ...mainState, questionBanks: [] }, updatedAt: fbFieldValue.serverTimestamp() });
            // Save each bank to subcollection
            if (banks && banks.length > 0) {
              const batch = fbDb.batch();
              banks.forEach((b) => batch.set(banksRef.doc(b.id), b));
              await batch.commit();
            }
            setSyncStatus("synced");
          } else {
            merged = applyDefaults(merged);
            await ref.set({ state: { ...merged, questionBanks: [] }, updatedAt: fbFieldValue.serverTimestamp() });
            setSyncStatus("synced");
          }
        }
        if (mounted) {
          // 異常タイマーの自動リセット（6時間以上は確実にバグ）
          const MAX_TIMER_MS = 6 * 60 * 60 * 1000;
          if (merged.timer?.startMs && (Date.now() - merged.timer.startMs) > MAX_TIMER_MS) {
            console.warn("Stale timer detected, resetting.");
            merged = { ...merged, timer: { qualId: null, startMs: null, autoMode: null } };
          }
          setState(merged);
          setLoaded(true);
          skipNextSave.current = true;
        }
      } catch (e) {
        console.error("Load error:", e);
        // 【初期化ガード】クラウドの読込に失敗した状態でクラウドへ保存すると、
        // 本来のデータを初期データで上書きしてしまう。再読込するまでクラウド保存を止める。
        cloudLoadFailed.current = true;
        const local = loadUserLocalState(user.uid) || loadLocalState() || INIT;
        if (mounted) {
          setState(applyDefaults(local));
          setLoaded(true);
          skipNextSave.current = true;
          setSyncStatus("error");
        }
      }
    })();
    return () => { mounted = false; };
  }, [user.uid]);

  // Save: debounced, both local + cloud（差分保存）
  useEffect(() => {
    if (!loaded) return;
    if (skipNextSave.current) { skipNextSave.current = false; return; }

    saveLocalState(user.uid, state);

    // 【初期化ガード】クラウド読込に失敗している間はクラウドへ書き込まない
    if (cloudLoadFailed.current) { setSyncStatus("error"); return; }

    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    setSyncStatus("syncing");
    saveTimeout.current = setTimeout(async () => {
      isSaving.current = true;
      try {
        const ref = fbDb.collection("userdata").doc(user.uid);
        const banksRef = ref.collection("questionbanks");
        const { questionBanks, ...mainState } = state;
        const { _localVersion, ...cleanState } = mainState;

        // ── メインドキュメント差分チェック ──
        const mainHash = JSON.stringify(cleanState);
        if (mainHash !== lastSavedMainHash.current) {
          await ref.set({
            state: { ...cleanState, questionBanks: [] },
            updatedAt: fbFieldValue.serverTimestamp(),
          });
          lastSavedMainHash.current = mainHash;
        }

        // ── バンク差分保存（変更のあったバンクだけ保存）──
        const prevBanks = lastSavedBanks.current;
        const changedBanks = prevBanks === null
          ? questionBanks  // 初回：全保存
          : questionBanks.filter(b => {
              const prev = prevBanks.find(p => p.id === b.id);
              return prev !== b;  // 参照が変わったバンクだけ保存
            });

        // 削除されたバンクをFirestoreからも削除
        if (prevBanks !== null) {
          const deletedIds = prevBanks
            .filter(p => !questionBanks.find(b => b.id === p.id))
            .map(p => p.id);
          if (deletedIds.length > 0) {
            const delBatch = fbDb.batch();
            deletedIds.forEach(id => delBatch.delete(banksRef.doc(id)));
            await delBatch.commit();
          }
        }

        // 変更バンクを400件ずつバッチ保存
        if (changedBanks.length > 0) {
          const CHUNK = 400;
          for (let i = 0; i < changedBanks.length; i += CHUNK) {
            const chunk = changedBanks.slice(i, i + CHUNK);
            const batch = fbDb.batch();
            chunk.forEach((b) => batch.set(banksRef.doc(b.id), b));
            await batch.commit();
          }
        }

        // 保存完了後にスナップショット更新
        lastSavedBanks.current = [...questionBanks];
        lastSaveTime.current = Date.now();
        setSyncStatus("synced");
      } catch (e) {
        console.error("Save error:", e);
        setSyncStatus(navigator.onLine ? "error" : "offline");
      } finally {
        isSaving.current = false;
        saveTimeout.current = null;
      }
    }, 2000);  // 800ms → 2秒に延長（複数の操作をまとめて1回の保存に）

    return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current); };
  }, [state, loaded]);

  // Online/offline indicator
  useEffect(() => {
    const onOnline = () => setSyncStatus("synced");
    const onOffline = () => setSyncStatus("offline");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    if (!navigator.onLine) setSyncStatus("offline");
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Real-time listener for updates from other devices
  useEffect(() => {
    if (!loaded) return;
    const ref = fbDb.collection("userdata").doc(user.uid);
    const banksRef = ref.collection("questionbanks");

    // 自分のエコーをブロックすべきか判定
    const shouldBlock = () =>
      isSaving.current ||
      saveTimeout.current !== null ||
      (Date.now() - lastSaveTime.current < SAVE_COOLDOWN_MS);

    // Listen to main state changes
    const unsubMain = ref.onSnapshot((snap) => {
      if (!snap.exists) return;
      if (snap.metadata.hasPendingWrites || snap.metadata.fromCache) return;
      if (shouldBlock()) return;

      banksRef.get().then((banksSnap) => {
        const cloudBanks = banksSnap.docs.map((d) => d.data());
        const cloud = snap.data().state || {};
        const { _localVersion, ...cleanCloud } = cloud;
        const merged = applyDefaults({ ...cleanCloud, questionBanks: cloudBanks });
        skipNextSave.current = true;
        cloudLoadFailed.current = false; // クラウドの本データを受信できたので保存を再開
        setState(merged);
        setSyncStatus("synced");
      }).catch((e) => console.warn("Banks reload error:", e));
    }, (err) => console.warn("Snapshot error:", err));

    // Listen to question bank changes
    const unsubBanks = banksRef.onSnapshot((snap) => {
      if (snap.metadata.hasPendingWrites || snap.metadata.fromCache) return;
      if (shouldBlock()) return;

      const cloudBanks = snap.docs.map((d) => d.data());
      setState((s) => {
        try {
          // ローカルにしかないバンク（未保存）がある場合は無視
          const allInCloud = s.questionBanks.every((b) => cloudBanks.find((cb) => cb.id === b.id));
          if (!allInCloud) return s;
          skipNextSave.current = true;
          return { ...s, questionBanks: applyDefaults({ ...s, questionBanks: cloudBanks }).questionBanks };
        } catch {}
        return s;
      });
    }, (err) => console.warn("Banks snapshot error:", err));

    // Listen to session resume changes（他端末での途中再開データを即時反映）
    const unsubSession = ref.collection("sessions").doc("current").onSnapshot((snap) => {
      if (snap.metadata.hasPendingWrites) return;
      const resume = snap.exists ? snap.data() : null;
      setState((s) => {
        if (JSON.stringify(s.sessionResume) === JSON.stringify(resume)) return s;
        skipNextSave.current = true;
        return { ...s, sessionResume: resume };
      });
    }, (err) => console.warn("Session snapshot error:", err));

    return () => { unsubMain(); unsubBanks(); unsubSession(); };
  }, [loaded, user.uid]);

  useEffect(() => {
    if (!state.timer.startMs) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state.timer.startMs]);

  const stateRef = useRef(state);
  stateRef.current = state; // イベント処理の中で最新の状態を参照するため

  const awardXp = (amount) => {
    if (amount <= 0) return;
    // 装備・ステータスによるボーナス（会心の一撃でEXP2倍）とゴールド
    const bonus = getRpgBonuses(stateRef.current);
    let gain = Math.round(amount * (1 + bonus.xpPct / 100));
    const crit = amount >= 2 && Math.random() * 100 < bonus.critPct;
    if (crit) gain *= 2;
    const gold = Math.max(1, Math.round(amount * 0.3 * (1 + bonus.goldPct / 100)));
    setState((s) => {
      let xp = s.player.xp + gain, lv = s.player.level, leveled = false;
      const prevLv = s.player.level;
      while (xp >= getXpForNextLevel(lv)) { xp -= getXpForNextLevel(lv); lv++; leveled = true; }
      if (leveled) {
        const newTitle = getLevelTitle(lv);
        const prevTier = getCharacterTier(prevLv);
        const newTier = getCharacterTier(lv);
        const tierChanged = prevTier !== newTier;
        const dotTheme = ((s.displaySettings && s.displaySettings.theme) || "white") === "dot";
        // ドットテーマは従来の「装備が進化した」、白金・クラシックはレベルアップのあとに進化の演出
        setShowLevelUp({ level: lv, title: newTitle, tierChanged: tierChanged && dotTheme, newTier });
        setTimeout(() => setShowLevelUp(null), tierChanged && dotTheme ? 4000 : 2800);
        if (tierChanged && !dotTheme) {
          const from = HERO_STAGES[Math.max(0, TIER_ORDER.indexOf(prevTier))], toIdx = Math.max(0, TIER_ORDER.indexOf(newTier));
          setTimeout(() => showEvolution({ big: "進化", from: from.name, to: HERO_STAGES[toIdx].name, sub: `Lv${HERO_STAGE_LV[toIdx]}に到達。新しい姿になった！`, stage: { ...HERO_STAGES[toIdx], idx: toIdx } }), 2900);
        }
      }
      const r = normRpg(s.rpg);
      return { ...s, player: { ...s.player, xp, level: lv }, rpg: { ...r, gold: r.gold + gold, goldEarned: r.goldEarned + gold, crits: r.crits + (crit ? 1 : 0) } };
    });
    const id = uid();
    setFloatXp((arr) => [...arr, { id, amount: gain, crit, gold }]);
    setTimeout(() => setFloatXp((arr) => arr.filter((f) => f.id !== id)), 1600);
    // まれにアイテムが落ちる
    if (amount >= 2 && Math.random() < 0.012) setTimeout(() => grantItem(rollRpgItem(0), "ドロップ"), 400);
  };

  // ── 冒険（RPG）──
  const [rpgToast, setRpgToast] = useState(null);
  const showRpgToast = (text, color) => {
    const id = uid();
    setRpgToast({ id, text, color });
    setTimeout(() => setRpgToast((t) => (t && t.id === id ? null : t)), 3200);
  };
  const updateRpg = (fn) => setState((s) => ({ ...s, rpg: fn(normRpg(s.rpg)) }));
  const grantItem = (itemId, reason) => {
    const it = rpgItemById(itemId);
    if (!it) return;
    updateRpg((r) => ({ ...r, inventory: [...r.inventory, { u: uid(), i: itemId }].slice(-150) }));
    showRpgToast(`${it.icon} ${it.name}（${it.rarity}）を手に入れた！${reason ? `［${reason}］` : ""}`, RARITY[it.rarity].color);
  };
  const rpgActions = {
    buy: (kind, id) => {
      const r = normRpg(stateRef.current.rpg);
      if (kind === "consumable") {
        const c = RPG_CONSUMABLES.find((x) => x.id === id);
        if (!c) return "";
        if (r.gold < c.price) return "ゴールドが足りません";
        updateRpg((x) => (x.gold < c.price ? x : { ...x, gold: x.gold - c.price, consumables: { ...x.consumables, [id]: (x.consumables[id] || 0) + 1 } }));
        return `${c.icon} ${c.name}を買った！`;
      }
      const it = rpgItemById(id);
      if (!it || !it.price) return "";
      if (r.gold < it.price) return "ゴールドが足りません";
      updateRpg((x) => (x.gold < it.price ? x : { ...x, gold: x.gold - it.price, inventory: [...x.inventory, { u: uid(), i: id }].slice(-150) }));
      return `${it.icon} ${it.name}を買った！`;
    },
    sell: (u) => updateRpg((x) => {
      const v = x.inventory.find((y) => y.u === u);
      if (!v) return x;
      const it = rpgItemById(v.i);
      const eq = { ...x.equipped };
      Object.keys(eq).forEach((k) => { if (eq[k] === u) eq[k] = null; });
      return { ...x, gold: x.gold + (it ? RARITY[it.rarity].sell : 0), inventory: x.inventory.filter((y) => y.u !== u), equipped: eq };
    }),
    equip: (slot, u) => updateRpg((x) => ({ ...x, equipped: { ...x.equipped, [slot]: u } })),
    useConsumable: (id) => {
      const cur = stateRef.current;
      const r = normRpg(cur.rpg);
      if (!(r.consumables[id] > 0)) return "持っていません";
      const dec = (x) => ({ ...x.consumables, [id]: Math.max(0, (x.consumables[id] || 0) - 1) });
      if (id === "xpBook") {
        updateRpg((x) => ({ ...x, consumables: dec(x), boosts: { ...x.boosts, xpUntil: Math.max(Date.now(), x.boosts.xpUntil || 0) + 30 * 60000 } }));
        return "📕 30分間、獲得EXPが2倍になった！";
      }
      if (id === "restTicket") {
        const y = new Date(); y.setDate(y.getDate() - 1);
        const ys = localDateStr(y);
        if (cur.studyLog.some((l) => l.date === ys) || r.restDays.includes(ys)) return "昨日は学習済みなので、使う必要はありません";
        updateRpg((x) => ({ ...x, consumables: dec(x), restDays: [...x.restDays, ys].slice(-60) }));
        return "🎫 昨日を連続学習日数に数えました";
      }
      updateRpg((x) => ({ ...x, consumables: dec(x) })); // 回復薬（ボス戦の中で使う）
      return "";
    },
    setClass: (id) => {
      const c = classById(id);
      const r = normRpg(stateRef.current.rpg);
      if (!c) return "";
      if (stateRef.current.player.level < 10) return "Lv10から転職できます";
      const cost = r.classId ? CLASS_CHANGE_COST : 0;
      if (r.gold < cost) return "ゴールドが足りません";
      updateRpg((x) => ({ ...x, gold: x.gold - cost, classId: id }));
      showRpgEvent({ icon: c.icon, title: `${c.name}に転職した！`, sub: c.bonusText(classRankIndex(stateRef.current.player.level)) });
      return "";
    },
    adoptPet: (type, name) => {
      if (!PET_TYPES[type] || !name) return "";
      const base = calculateStatus(stateRef.current).totalCorrect;
      updateRpg((x) => ({ ...x, pet: { type, name, since: todayStr(), baseCorrect: base }, seen: { ...x.seen, pet: 0 } }));
      return `🥚 ${name}を迎えた！ 勉強を続けると生まれます`;
    },
    renamePet: (name) => updateRpg((x) => (x.pet ? { ...x, pet: { ...x.pet, name } } : x)),
    // 相棒の種類（姿）を変える。育成ポイントの元（迎えた日・正解数）はそのまま
    changePetType: (type) => { if (PET_TYPES[type]) updateRpg((x) => (x.pet ? { ...x, pet: { ...x.pet, type } } : x)); },
    bossFinish: ({ won, bossId, loop, gold, xp, itemId }) => {
      updateRpg((x) => ({
        ...x, gold: x.gold + gold, goldEarned: x.goldEarned + gold,
        bossWins: x.bossWins + (won ? 1 : 0), bossLosses: x.bossLosses + (won ? 0 : 1),
        bossLog: [...x.bossLog, { d: todayStr(), b: bossId, w: won, l: loop }].slice(-30),
        inventory: itemId ? [...x.inventory, { u: uid(), i: itemId }].slice(-150) : x.inventory,
      }));
      if (xp) setTimeout(() => awardXp(xp), 300);
    },
    // スキルを覚える（同じ道の1つ前を覚えていて、ポイントが足りるとき）
    learnSkill: (id) => {
      const cur = stateRef.current;
      const r = normRpg(cur.rpg);
      const node = skillNodes.find((n) => n.id === id);
      if (!node || r.skills.includes(id)) return "";
      const prev = node.idx > 0 ? node.branch.nodes[node.idx - 1].id : null;
      if (prev && !r.skills.includes(prev)) return "ひとつ前のスキルを先に覚えてください";
      if (skillPointsTotal(cur) - skillPointsUsed(r) < node.cost) return "スキルポイントが足りません";
      updateRpg((x) => (x.skills.includes(id) ? x : { ...x, skills: [...x.skills, id] }));
      return `${node.name}を覚えた！`;
    },
    // スキルを忘れてポイントを戻す（ゴールドが必要）
    resetSkills: () => {
      const r = normRpg(stateRef.current.rpg);
      if (r.skills.length === 0) return "";
      if (r.gold < SKILL_RESET_COST) return "ゴールドが足りません";
      updateRpg((x) => ({ ...x, gold: x.gold - SKILL_RESET_COST, skills: [] }));
      return "スキルポイントが戻りました";
    },
    // 装備を1段階強化する。成功・失敗にかかわらず素材とゴールドは使う（失敗しても段階は下がらない）
    forge: (u) => {
      const cur = stateRef.current;
      const r = normRpg(cur.rpg);
      const v = r.inventory.find((y) => y.u === u);
      const it = v ? rpgItemById(v.i) : null;
      if (!it) return { ok: false, msg: "" };
      const p = v.p || 0;
      if (p >= FORGE_MAX) return { ok: false, msg: "これ以上は強化できません", lack: true };
      const c = forgeCost(it, p, getRpgBonuses(cur).forgePct);
      if (r.gold < c.gold || fragCount(r.materials) < c.frag || (r.materials["m-star"] || 0) < c.star || (r.materials["m-sage"] || 0) < c.sage) return { ok: false, msg: "素材かゴールドが足りません", lack: true };
      const success = Math.random() * 100 < c.rate;
      updateRpg((x) => {
        const mats = takeFrags(x.materials, c.frag);
        if (!mats || x.gold < c.gold) return x;
        mats["m-star"] = (mats["m-star"] || 0) - c.star;
        mats["m-sage"] = (mats["m-sage"] || 0) - c.sage;
        return {
          ...x, gold: x.gold - c.gold, materials: mats,
          inventory: success ? x.inventory.map((y) => (y.u === u ? { ...y, p: (y.p || 0) + 1 } : y)) : x.inventory,
          forgeLog: { ok: x.forgeLog.ok + (success ? 1 : 0), ng: x.forgeLog.ng + (success ? 0 : 1) },
        };
      });
      return { ok: success, plus: success ? p + 1 : p, msg: success ? `${it.name} +${p + 1} に強化成功！` : "強化に失敗…（素材は失われました）" };
    },
    // 週替わりボスの結果（勝てば星霊石・賢者の結晶も。勝てるのは週に1回）
    weeklyFinish: ({ won, gold, xp, itemId }) => {
      const wk = weekKey();
      updateRpg((x) => {
        const already = x.weekly && x.weekly.week === wk && x.weekly.won;
        const win = won && !already;
        return {
          ...x, gold: x.gold + (already ? 0 : gold), goldEarned: x.goldEarned + (already ? 0 : gold),
          materials: win ? { ...x.materials, "m-star": (x.materials["m-star"] || 0) + WEEKLY_REWARD.star, "m-sage": (x.materials["m-sage"] || 0) + WEEKLY_REWARD.sage } : x.materials,
          inventory: win && itemId ? [...x.inventory, { u: uid(), i: itemId }].slice(-150) : x.inventory,
          weekly: { week: wk, won: !!(already || won), tries: ((x.weekly && x.weekly.week === wk && x.weekly.tries) || 0) + 1 },
        };
      });
      if (won && xp) setTimeout(() => awardXp(xp), 300);
      if (won) setTimeout(() => showRpgToast(`星霊石×${WEEKLY_REWARD.star}・賢者の結晶×${WEEKLY_REWARD.sage} を手に入れた！［週替わりボス］`, "#b08a3e"), 1200);
    },
    // 模試の塔の結果：正答率に応じたゴールドと欠片。合格圏（85%）で踏破ボーナス。最高記録を残す
    dungeonFinish: ({ n, acc }) => {
      const passed = acc >= PASS_LINE;
      const gold = Math.round(n * 3 * acc) + (passed ? 100 : 0);
      const frag = Math.round(n * acc / 5);
      const fid = FRAG_IDS[Math.floor(Math.random() * FRAG_IDS.length)];
      updateRpg((x) => {
        const dg = x.dungeon || {};
        const best = { ...(dg.best || {}) };
        best[n] = Math.max(best[n] || 0, Math.round(acc * 1000) / 1000);
        return { ...x, gold: x.gold + gold, goldEarned: x.goldEarned + gold, materials: frag ? { ...x.materials, [fid]: (x.materials[fid] || 0) + frag } : x.materials, dungeon: { ...dg, best, runs: (dg.runs || 0) + 1, clears: (dg.clears || 0) + (passed ? 1 : 0) } };
      });
      if (passed) setTimeout(() => grantItem(rollRpgItem(1.5), "模試の塔の踏破"), 800);
      return `報酬：${gold}G${frag ? `・${(matById(fid) || {}).name}×${frag}` : ""}${passed ? "・踏破の装備" : ""}`;
    },
    // デイリークエストの報酬（ゴールドと欠片）
    claimQuest: (id) => {
      const cur = stateRef.current;
      const r = normRpg(cur.rpg);
      const d = dailyOf(r);
      const qst = questsToday().find((q) => q.id === id);
      if (!qst || d.claimed.includes(id)) return "";
      if (questProgress(qst, d, getTodayReviewItems().length) < qst.target) return "まだ達成していません";
      const frag = FRAG_IDS[hashStr(todayStr() + id) % (FRAG_IDS.length - 1)];
      updateRpg((x) => {
        const dd = dailyOf(x);
        if (dd.claimed.includes(id)) return x;
        return { ...x, gold: x.gold + QUEST_REWARD.gold, goldEarned: x.goldEarned + QUEST_REWARD.gold, materials: { ...x.materials, [frag]: (x.materials[frag] || 0) + QUEST_REWARD.frag }, daily: { ...dd, claimed: [...dd.claimed, id] } };
      });
      return `クエスト達成！ ${QUEST_REWARD.gold}G と ${(matById(frag) || {}).name}×${QUEST_REWARD.frag}`;
    },
    // 3つ全部受け取ったら宝箱（ゴールド・星霊石・まれに装備）
    claimChest: () => {
      const r = normRpg(stateRef.current.rpg);
      const d = dailyOf(r);
      if (d.chest || !questsToday().every((q) => d.claimed.includes(q.id))) return "";
      const item = Math.random() < CHEST_REWARD.itemChance;
      updateRpg((x) => {
        const dd = dailyOf(x);
        if (dd.chest) return x;
        return { ...x, gold: x.gold + CHEST_REWARD.gold, goldEarned: x.goldEarned + CHEST_REWARD.gold, materials: { ...x.materials, "m-star": (x.materials["m-star"] || 0) + CHEST_REWARD.star }, daily: { ...dd, chest: true } };
      });
      if (item) setTimeout(() => grantItem(rollRpgItem(1), "宝箱"), 500);
      return `宝箱を開けた！ ${CHEST_REWARD.gold}G と 星霊石×${CHEST_REWARD.star}${item ? " と 装備！" : ""}`;
    },
    // 地域の守護者との戦いの結果：勝てば地域を解放し、紋章を得る
    guardianFinish: ({ won, region, gold, xp, itemId }) => {
      const already = regionCleared(normRpg(stateRef.current.rpg), region);
      updateRpg((x) => ({
        ...x, gold: x.gold + gold, goldEarned: x.goldEarned + gold,
        inventory: won && itemId ? [...x.inventory, { u: uid(), i: itemId }].slice(-150) : x.inventory,
        regions: won ? { ...x.regions, [region]: { cleared: true, at: todayStr() } } : x.regions,
      }));
      if (won && xp) setTimeout(() => awardXp(xp), 300);
      if (won && !already) {
        const info = regionInfo(region);
        const newAlly = ALLIES.find((a) => a.need === clearedCount(normRpg(stateRef.current.rpg)) + 1);
        setTimeout(() => showEvolution({ big: "地域解放", from: null, to: region, sub: `${info.emblem.name}を手に入れた（${fxText(info.emblem.fx)}）`, stage: heroStage(stateRef.current.player.level), afterTalk: { title: `${region}　解放`, lines: [...(REGION_TALK[region] || []).map((t) => ["hero", t]), ...(newAlly ? [["hero", "……あれ？ だれか、こちらへ駆けてきます。"], ...newAlly.intro.map((t) => [newAlly.id, t]), ["hero", `${newAlly.name}さんが、仲間になってくれました！ これからよろしくお願いしますね。`]] : [])] } }), 1500);
        if (newAlly) setTimeout(() => showRpgToast(`${newAlly.name}（${newAlly.role}）が仲間になった！ ${fxText(newAlly.fx)}`, "#b08a3e"), 1800);
      }
    },
    // 魔王城を1階攻略する（条件を満たしたときだけ）
    castleClimb: () => {
      const cur = stateRef.current;
      const r = normRpg(cur.rpg);
      const qual = mainQual(cur);
      const linked = qual && cur.questionBanks.some((b) => b.qualId === qual.id);
      const pp = passPower(cur, linked ? qual.id : null);
      const floor = r.castle.floor || 0;
      const f = CASTLE_FLOORS[floor];
      if (!f || !f.test(castleCtx(cur, pp))) return;
      const rw = f.reward;
      updateRpg((x) => ({
        ...x, gold: x.gold + (rw.gold || 0), goldEarned: x.goldEarned + (rw.gold || 0),
        materials: { ...x.materials, "m-star": (x.materials["m-star"] || 0) + (rw.star || 0), "m-sage": (x.materials["m-sage"] || 0) + (rw.sage || 0) },
        castle: { ...x.castle, floor: Math.max(x.castle.floor || 0, floor + 1), [`f${floor + 1}`]: todayStr() },
      }));
      const last = floor + 1 >= CASTLE_FLOORS.length;
      setTimeout(() => showEvolution({ big: last ? "魔王討伐" : "突破", from: null, to: last ? "試験の魔王を打ち倒した！" : `魔王城 ${f.name}`, sub: `報酬：${rewardText(rw)}`, stage: heroStage(cur.player.level),
        afterTalk: last ? { title: "魔王城　玉座の間", lines: [["hero", "……終わりましたね。"], ["hero", "でも、本当の試験はこれからです。今日の力を、試験の日までそのまま保ちましょう。"], ["pet", "（相棒が、そっと寄り添ってきた）"], ["hero", "あなたなら、きっと大丈夫です。"]] } : null }), 300);
      if (last) awardAchievement({ id: "castle-maou", title: "境界を取り戻した者", job: "魔王討伐者", icon: "👑", color: "#b08a3e", source: "rpg", description: "魔王城の最上階で、試験の魔王を打ち倒した。", earnedAt: new Date().toISOString() });
    },
    // カテゴリの長期クエストの報酬（★を1つ進める）
    claimCat: (bankId) => {
      const cur = stateRef.current;
      const r = normRpg(cur.rpg);
      const b = cur.questionBanks.find((x) => x.id === bankId);
      if (!b) return "";
      const got = r.cats[bankId] || 0;
      const tier = CAT_TIERS[got];
      const c = catCounts(b);
      if (!tier || c.n === 0 || !tier.test(c)) return "";
      const rw = tier.reward;
      const fid = FRAG_IDS[hashStr(bankId) % FRAG_IDS.length];
      updateRpg((x) => {
        if ((x.cats[bankId] || 0) !== got) return x;
        return {
          ...x, gold: x.gold + (rw.gold || 0), goldEarned: x.goldEarned + (rw.gold || 0),
          materials: { ...x.materials, [fid]: (x.materials[fid] || 0) + (rw.frag || 0), "m-star": (x.materials["m-star"] || 0) + (rw.star || 0), "m-sage": (x.materials["m-sage"] || 0) + (rw.sage || 0) },
          cats: { ...x.cats, [bankId]: got + 1 },
        };
      });
      if (got + 1 === 5) awardAchievement({ id: `cat-${bankId}`, title: `${b.name}の達人`, job: "カテゴリ制覇", icon: "🏅", color: "#b08a3e", source: "rpg", description: `「${b.name}」のすべての問題を制覇した証。`, earnedAt: new Date().toISOString() });
      return `${b.name} ★${got + 1} 達成！ 報酬：${rewardText({ ...rw, frag: rw.frag })}`;
    },
    openTalk: (t) => setTalk(t),
    // 節の守護者（問題集のすべての話をクリアすると挑める）。80%で撃破：その節を制覇
    secBossFinish: ({ bankId, bankName, region, acc }) => {
      const r = normRpg(stateRef.current.rpg);
      const passed = acc >= SEC_PASS;
      const first = passed && !(r.secBoss[bankId] && r.secBoss[bankId].won);
      updateRpg((x) => {
        const p0 = x.secBoss[bankId] || {};
        return {
          ...x, gold: x.gold + (first ? 200 : 0), goldEarned: x.goldEarned + (first ? 200 : 0),
          materials: { ...x.materials, "m-star": (x.materials["m-star"] || 0) + (first ? 1 : 0) },
          secBoss: { ...x.secBoss, [bankId]: { won: !!(p0.won || passed), best: Math.max(p0.best || 0, Math.round(acc * 1000) / 1000), at: passed && !p0.won ? todayStr() : p0.at } },
        };
      });
      if (first) {
        setTimeout(() => awardXp(50), 200);
        setTimeout(() => showEvolution({ big: "節を制覇", from: null, to: bankName, sub: "200G・星霊石×1", stage: heroStage(stateRef.current.player.level), afterTalk: { title: `${region}　${bankName}`, lines: regionArc(region).sec(bankName) } }), 900);
      }
      return { headline: first ? `「${bankName}」の守護者を倒した！ 節を制覇しました。` : passed ? "守護者を倒しました。" : null, msg: first ? "報酬：200G・星霊石×1・EXP50" : "" };
    },
    // 仲間の勉強会の結果：7割以上で、その週はじめてのクリアなら絆+30・80G・特別なせりふ
    studyGroupFinish: ({ allyId, acc }) => {
      const wk = weekKey();
      const r = normRpg(stateRef.current.rpg);
      const sg = r.studyGroup && r.studyGroup.week === wk ? r.studyGroup : { week: wk, allyId, cleared: false, best: 0 };
      const passed = acc >= STUDY_GROUP_PASS;
      const first = passed && !sg.cleared;
      const a = allyById(allyId);
      updateRpg((x) => {
        let nx = { ...x, studyGroup: { week: wk, allyId, cleared: sg.cleared || passed, best: Math.max(sg.best || 0, Math.round(acc * 1000) / 1000) } };
        if (first) nx = addBond({ ...nx, gold: nx.gold + 80, goldEarned: nx.goldEarned + 80 }, allyId, 30);
        return nx;
      });
      if (first) {
        setTimeout(() => awardXp(30), 200);
        if (a) setTimeout(() => setTalk({ title: `${a.name}の勉強会`, lines: STUDY_GROUP_TALK[allyId] || [[allyId, a.cheer]] }), 1200);
      }
      return { headline: first ? `${a ? a.name : "仲間"}の勉強会をクリア！` : passed ? "今週の勉強会は、もうクリアしています。" : null, msg: first ? "報酬：絆+30・80G・EXP30" : passed ? "" : `7割（${Math.round(STUDY_GROUP_PASS * 100)}%）でクリアです。もう一度挑戦できます。` };
    },
    markArc: (region, key) => updateRpg((x) => ({ ...x, arcSeen: { ...x.arcSeen, [`${region}:${key}`]: todayStr() } })),
    // 試練の塔の結果：80%で突破。初突破でゴールド・欠片、試練の間（10の倍数の階）で星霊石と演出、50・100階で賢者の結晶
    towerFinish: ({ floor, acc }) => {
      const r = normRpg(stateRef.current.rpg);
      const tw = r.tower || { floor: 0, best: {} };
      const passed = acc >= TOWER_PASS;
      const first = passed && floor > (tw.floor || 0);
      let gold = 0, frag = 0, star = 0, sage = 0;
      if (first) { gold = 20 + floor; frag = 1; if (isCheckpoint(floor)) { gold += 130; star = 1; } if (floor === 50 || floor === TOWER_MAX) sage = 1; }
      const fid = FRAG_IDS[floor % FRAG_IDS.length];
      updateRpg((x) => {
        const t = { floor: 0, best: {}, ...(x.tower || {}) };
        return {
          ...x, gold: x.gold + gold, goldEarned: x.goldEarned + gold,
          materials: { ...x.materials, [fid]: (x.materials[fid] || 0) + frag, "m-star": (x.materials["m-star"] || 0) + star, "m-sage": (x.materials["m-sage"] || 0) + sage },
          tower: { ...t, floor: passed ? Math.max(t.floor || 0, floor) : (t.floor || 0), best: { ...t.best, [floor]: Math.max(t.best[floor] || 0, Math.round(acc * 1000) / 1000) } },
        };
      });
      if (first) setTimeout(() => awardXp(15 + Math.floor(floor / 2)), 200);
      const meet = first ? ALLIES.find((a) => a.towerNeed === floor) : null;
      if (meet) setTimeout(() => { showRpgToast(`${meet.name}（${meet.role}）が仲間になった！ ${fxText(meet.fx)}`, "#4f6fa8"); setTalk({ title: `${meet.name}との出会い`, lines: ACADEMY_MEET[meet.id] || meet.intro.map((t) => [meet.id, t]) }); }, 1600);
      if (first && isCheckpoint(floor)) {
        const top = floor >= TOWER_MAX;
        setTimeout(() => showEvolution({ big: top ? "塔の頂" : "試練突破", from: null, to: top ? "試練の塔 100階 踏破" : `${towerLayer(floor)}の番人を倒した`, sub: top ? "すべての層の試練を乗り越えました！" : `次は ${towerLayer(floor + 1)}（第${floor + 1}階〜）`, stage: heroStage(stateRef.current.player.level),
          afterTalk: { title: top ? "試練の塔　頂" : `試練の塔　${towerLayer(floor)}`, lines: top ? [["hero", "ここが、塔のいちばん上……。国じゅうの境界線が、ぜんぶ見えます。"], ["hero", "100の階で出会った問題は、どれもあなたの力になりました。"], ...ALLIES.map((a) => [a.id, a.cheer])] : [["hero", `${towerLayer(floor)}を越えました！ 下の階で覚えたことが、ちゃんと残っている証拠です。`], ["hero", "この先も、下の階の問題がときどき顔を出します。忘れかけたころの復習が、いちばん効くんですよ。"]] } }), 900);
        if (top) awardAchievement({ id: "tower-100", title: "試練の塔の踏破者", job: "塔の覇者", icon: "🗼", color: "#8c79c8", source: "rpg", description: "試練の塔の100階すべてを突破した証。", earnedAt: new Date().toISOString() });
      }
      const parts = [gold && `${gold}G`, frag && `${(matById(fid) || {}).name}×${frag}`, star && `星霊石×${star}`, sage && `賢者の結晶×${sage}`].filter(Boolean);
      return { headline: first ? `第${floor}階を突破！ ${floor < TOWER_MAX ? `第${floor + 1}階が開きました。` : ""}` : passed ? "突破しました。" : null, msg: parts.length ? `報酬：${parts.join("・")}` : "" };
    },
    // 書式（記述式）の練習の記録：EXP・書式の欠片、8割以上なら星霊石
    logShoshiki: (e) => {
      const good = e.score / (e.max || 25) >= 0.8;
      updateRpg((x) => addBond({
        ...x, shoshiki: [...(x.shoshiki || []), { ...e, id: uid(), d: todayStr() }].slice(-300),
        materials: { ...x.materials, "m-shoshiki": (x.materials["m-shoshiki"] || 0) + 2, "m-star": (x.materials["m-star"] || 0) + (good ? 1 : 0) },
      }, "mira", 3));
      setTimeout(() => awardXp(20), 200);
      return `記録しました！ EXP20・書式の欠片×2${good ? "・星霊石×1（8割以上！）" : ""}`;
    },
    // 本番リハーサルの結果：rpg.rehearsal.log = [{id, d, full, mcOk, mcN, mc, desc, total, min, pass}]
    rehearsalFinish: ({ full, mcOk, mcN, land, bldg, min }) => {
      const cfg = rehearsalCfg(stateRef.current);
      const mc = Math.round((mcOk / Math.max(1, mcN)) * 50 * 10) / 10;
      const desc = full ? Math.round(((Number(land) || 0) + (Number(bldg) || 0)) * 10) / 10 : null;
      const total = full ? Math.round((mc + desc) * 10) / 10 : null;
      const mcOkLine = mc >= cfg.mcBase, descOkLine = full ? desc >= cfg.descBase : null;
      const pass = full ? mcOkLine && descOkLine && total >= cfg.pass : mcOkLine;
      const gold = 60 + (full ? 60 : 0) + (pass ? 200 : 0), star = pass ? 1 : 0;
      updateRpg((x) => {
        const rh = { log: [], cfg: null, ...(x.rehearsal || {}) };
        return {
          ...x, gold: x.gold + gold, goldEarned: x.goldEarned + gold,
          materials: { ...x.materials, "m-star": (x.materials["m-star"] || 0) + star },
          rehearsal: { ...rh, log: [...(rh.log || []), { id: uid(), d: todayStr(), full, mcOk, mcN, mc, desc, total, min: Math.round(min), pass }].slice(-100) },
        };
      });
      setTimeout(() => awardXp(full ? 80 : 40), 300);
      if (pass && full) setTimeout(() => grantItem(rollRpgItem(2), "本番リハーサルで合格ライン突破"), 900);
      return { mc, desc, total, mcOkLine, descOkLine, pass, cfg, reward: `報酬：EXP${full ? 80 : 40}・${gold}G${star ? "・星霊石×1" : ""}${pass && full ? "・合格ライン突破の装備" : ""}` };
    },
    setRehearsalCfg: (cfg) => updateRpg((x) => ({ ...x, rehearsal: { log: [], ...(x.rehearsal || {}), cfg } })),
    // 条文の穴埋めの結果：rpg.cloze = { log:[{id,d,law,n,ok}], miss:{"法:条": まちがえた回数} }
    logCloze: ({ law, n, ok, items }) => {
      const gold = ok * 3;
      const fid = { "fudosan-ho": "m-chiban", "fudosan-rei": "m-chiban", "fudosan-kisoku": "m-chiban", minpo: "m-keiyaku", kubun: "m-kyoyo", chosashi: "m-chokai" }[law] || "m-chiban";
      const frag = ok >= Math.ceil(n * 0.8) ? 2 : ok > 0 ? 1 : 0;
      updateRpg((x) => {
        const c = { log: [], miss: {}, ...(x.cloze || {}) };
        const miss = { ...(c.miss || {}) };
        const got = { ...(c.got || {}) };
        (items || []).forEach(({ key, good }) => { const v = (miss[key] || 0) + (good ? -1 : 1); if (v > 0) miss[key] = v; else delete miss[key]; if (good) got[key] = (got[key] || 0) + 1; });
        return addBond({
          ...x, gold: x.gold + gold, goldEarned: x.goldEarned + gold,
          materials: { ...x.materials, [fid]: (x.materials[fid] || 0) + frag },
          cloze: { ...c, miss, got, log: [...(c.log || []), { id: uid(), d: todayStr(), law, n, ok }].slice(-300) },
        }, law === "minpo" || law === "chosashi" ? "mira" : "rine", ok);
      });
      if (ok > 0) setTimeout(() => awardXp(ok * 3), 200);
      return [ok > 0 && `EXP${ok * 3}`, gold && `${gold}G`, frag && `${(matById(fid) || {}).name}×${frag}`].filter(Boolean).join("・");
    },
    // 条文図鑑：法令の「よく出る条文」をすべて集めたら称号（rpg.cloze.dexDone[法令] = 日付）
    claimLawDex: (law) => {
      const nm = LAW_BY_KEY[law].name;
      updateRpg((x) => ({ ...x, gold: x.gold + 300, goldEarned: x.goldEarned + 300, cloze: { ...(x.cloze || {}), dexDone: { ...((x.cloze || {}).dexDone || {}), [law]: todayStr() } } }));
      awardAchievement({ id: `lawdex-${law}`, title: `${nm}の語り部`, job: "条文の語り部", icon: "📜", color: "#b08a3e", source: "rpg", description: `条文図鑑で「${nm}」の、問題によく出る条文をすべて集めた証。`, earnedAt: new Date().toISOString() });
      SFX.play("levelup");
      showRpgToast(`条文図鑑「${nm}」完成！ 称号と300Gを手に入れた`, "#b08a3e");
    },
    // 月ごとのランク戦：その月に届いたランクの報酬を受け取る（rpg.season = { month, claimed:[ランクid], history:[{month, pts, rank}] }）
    claimSeason: (rankId) => {
      const ym = todayStr().slice(0, 7);
      const rk = SEASON_RANKS.find((x) => x.id === rankId);
      const r0 = normRpg(stateRef.current.rpg);
      const ss = r0.season && r0.season.month === ym ? r0.season : { month: ym, claimed: [], history: (r0.season && r0.season.history) || [] };
      if (!rk || ss.claimed.includes(rankId)) return;
      const rw = rk.reward;
      updateRpg((x) => {
        const cur = x.season && x.season.month === ym ? x.season : { month: ym, claimed: [], history: (x.season && x.season.history) || [] };
        if (cur.claimed.includes(rankId)) return x;
        const fid = FRAG_IDS[hashStr(ym + rankId) % FRAG_IDS.length];
        return {
          ...x, gold: x.gold + (rw.gold || 0), goldEarned: x.goldEarned + (rw.gold || 0),
          materials: { ...x.materials, [fid]: (x.materials[fid] || 0) + (rw.frag || 0), "m-star": (x.materials["m-star"] || 0) + (rw.star || 0), "m-sage": (x.materials["m-sage"] || 0) + (rw.sage || 0) },
          season: { ...cur, claimed: [...cur.claimed, rankId] },
        };
      });
      if (rw.item) setTimeout(() => grantItem(rollRpgItem(2), `${rk.name}ランクの報酬`), 600);
      if (rankId === "legend") awardAchievement({ id: "season-legend", title: "月の伝説", job: "伝説の挑戦者", icon: "🏆", color: "#c9a6e8", source: "rpg", description: "月ごとのランク戦で、はじめてレジェンドに届いた証。", earnedAt: new Date().toISOString() });
      SFX.play("forgeOk");
      showRpgToast(`${rk.name}ランクの報酬：${seasonRewardText(rw)}`, rk.color);
    },
    // 申請書の穴埋めの結果：rpg.shinsei = [{id, d, n, ok, miss:[場面id]}]
    logShinsei: ({ n, ok, miss }) => {
      const gold = ok * 8, frag = ok >= Math.ceil(n * 0.8) ? 2 : ok > 0 ? 1 : 0;
      updateRpg((x) => addBond({
        ...x, gold: x.gold + gold, goldEarned: x.goldEarned + gold,
        shinsei: [...(x.shinsei || []), { id: uid(), d: todayStr(), n, ok, miss }].slice(-300),
        materials: { ...x.materials, "m-shoshiki": (x.materials["m-shoshiki"] || 0) + frag },
      }, "mira", ok * 2));
      if (ok > 0) setTimeout(() => awardXp(ok * 6), 200);
      return [ok > 0 && `EXP${ok * 6}`, gold && `${gold}G`, frag && `書式の欠片×${frag}`].filter(Boolean).join("・");
    },
    // 混同ペア：違いを整理できた問題（rpg.pairsOk[問題id] = 日付）。また「混同」でまちがえると、もう一度出る
    resolvePair: (qid) => updateRpg((x) => ({ ...x, pairsOk: { ...(x.pairsOk || {}), [qid]: todayStr() } })),
    // 作図ドリルの結果：rpg.sakuzu = [{id, d, type, n, ok, sec}]
    logSakuzu: ({ type, n, ok, sec }) => {
      const perfect = ok === n;
      const gold = ok * 3 + (perfect ? 30 : 0);
      updateRpg((x) => addBond({
        ...x, gold: x.gold + gold, goldEarned: x.goldEarned + gold,
        sakuzu: [...(x.sakuzu || []), { id: uid(), d: todayStr(), type, n, ok, sec: Math.round(sec) }].slice(-300),
        materials: { ...x.materials, "m-zahyo": (x.materials["m-zahyo"] || 0) + (perfect ? 2 : ok > 0 ? 1 : 0) },
      }, "kai", ok));
      updateRpg((x) => addBond(x, "raven", ok));
      const xp = ok * 2 + (perfect ? 15 : 0);
      if (xp) setTimeout(() => awardXp(xp), 200);
      return [xp && `EXP${xp}`, gold && `${gold}G`, `座標の欠片×${perfect ? 2 : ok > 0 ? 1 : 0}`].filter(Boolean).join("・");
    },
    // 計算ドリルの結果：rpg.drill = [{id, d, type, n, ok, sec}]。正解数に応じてEXP・ゴールド・座標の欠片、全問正解で星霊石
    logDrill: ({ type, n, ok, sec }) => {
      const gold = ok * 5, frag = ok >= Math.ceil(n * 0.8) ? 2 : ok > 0 ? 1 : 0, star = ok === n && n >= 5 ? 1 : 0;
      updateRpg((x) => addBond({
        ...x, gold: x.gold + gold, goldEarned: x.goldEarned + gold,
        drill: [...(x.drill || []), { id: uid(), d: todayStr(), type, n, ok, sec: Math.round(sec) }].slice(-300),
        materials: { ...x.materials, "m-zahyo": (x.materials["m-zahyo"] || 0) + frag, "m-star": (x.materials["m-star"] || 0) + star },
      }, "kai", ok));
      updateRpg((x) => addBond(x, "raven", ok));
      if (ok > 0) setTimeout(() => awardXp(ok * 4), 200);
      return [ok > 0 && `EXP${ok * 4}`, gold && `${gold}G`, frag && `座標の欠片×${frag}`, star && "星霊石×1（全問正解！）"].filter(Boolean).join("・");
    },
    // ログインボーナスを受け取る（その日1回）
    claimLogin: () => {
      const r = normRpg(stateRef.current.rpg);
      const lg = r.login || { count: 0 };
      if (lg.last === todayStr()) return;
      const rw = LOGIN_REWARDS[(lg.count || 0) % 7];
      const fid = FRAG_IDS[hashStr(todayStr()) % FRAG_IDS.length];
      updateRpg((x) => {
        const l = x.login || { count: 0 };
        if (l.last === todayStr()) return x;
        return {
          ...x, gold: x.gold + (rw.gold || 0), goldEarned: x.goldEarned + (rw.gold || 0),
          consumables: { ...x.consumables, potion: (x.consumables.potion || 0) + (rw.potion || 0) },
          materials: { ...x.materials, [fid]: (x.materials[fid] || 0) + (rw.frag || 0), "m-star": (x.materials["m-star"] || 0) + (rw.star || 0), "m-sage": (x.materials["m-sage"] || 0) + (rw.sage || 0) },
          login: { last: todayStr(), count: (l.count || 0) + 1 },
        };
      });
      SFX.play("forgeOk");
      showRpgToast(`ログインのしるし：${loginRewardText(rw)}`, "#b08a3e");
    },
    deleteShoshiki: (id) => updateRpg((x) => ({ ...x, shoshiki: (x.shoshiki || []).filter((e) => e.id !== id) })),
    // ストーリークエスト（1話）の結果：★の記録、初クリアの報酬、地域の地図の完成
    storyQuestFinish: ({ key, acc, n, mat, region, regionKeys }) => {
      const r = normRpg(stateRef.current.rpg);
      const prev = r.sq[key] || {};
      const prevStars = prev.stars || 0;
      const stars = sqStarsOf(acc);
      const first = prevStars < 1 && stars >= 1;
      const better = stars > prevStars && !first;
      let gold = 0, frag = 0, star = 0;
      if (first) { gold += 40 + n * 2; frag += 2; }
      if (stars >= 2 && prevStars < 2) gold += 40;
      if (stars >= 3 && prevStars < 3) star += 1;
      const wasDone = regionKeys.length > 0 && regionKeys.every((k) => ((r.sq[k] && r.sq[k].stars) || 0) >= 1);
      const nowDone = regionKeys.length > 0 && regionKeys.every((k) => (k === key ? Math.max(prevStars, stars) : ((r.sq[k] && r.sq[k].stars) || 0)) >= 1);
      const complete = !wasDone && nowDone;
      if (complete) gold += 300;
      const fid = mat || "m-meikyu";
      updateRpg((x) => {
        const p = x.sq[key] || {};
        return {
          ...x, gold: x.gold + gold, goldEarned: x.goldEarned + gold,
          materials: { ...x.materials, [fid]: (x.materials[fid] || 0) + frag, "m-star": (x.materials["m-star"] || 0) + star, "m-sage": (x.materials["m-sage"] || 0) + (complete ? 1 : 0) },
          sq: { ...x.sq, [key]: { stars: Math.max(p.stars || 0, stars), best: Math.max(p.best || 0, Math.round(acc * 1000) / 1000), clears: (p.clears || 0) + (stars >= 1 ? 1 : 0), at: todayStr() } },
        };
      });
      if (first) setTimeout(() => awardXp(30), 200);
      if (complete) {
        setTimeout(() => showEvolution({ big: "地図完成", from: null, to: `${region}の地図`, sub: `すべての話をクリアしました！ 300G・賢者の結晶×1`, stage: heroStage(stateRef.current.player.level),
          afterTalk: { title: `${region}　地図完成`, lines: [["hero", "見てください、この地域の地図が、すべて描きあがりました！"], ["hero", "一話ずつ進んできた道のりが、そのまま知識の地図になっているんです。"], ["pet", "（相棒が、地図の上をうれしそうに歩き回っている）"], ["hero", "描いた土地は、★を集め直して、もっと確かなものにしていきましょうね。"]] } }), 1200);
        awardAchievement({ id: `map-${region}`, title: `${region}の地図製作者`, job: "地図製作者", icon: "🗺️", color: "#b08a3e", source: "rpg", description: `${region}のストーリーをすべてクリアした証。`, earnedAt: new Date().toISOString() });
      }
      const parts = [gold && `${gold}G`, frag && `${(matById(fid) || {}).name}×${frag}`, star && `星霊石×${star}`, complete && "賢者の結晶×1"].filter(Boolean);
      return { first, better, msg: parts.length ? `報酬：${parts.join("・")}${first ? "・EXP30" : ""}` : "" };
    },
  };

  // 合格力の記録（1日1件。同じ日は最新の値で上書き）と、週のはじめの週報
  useEffect(() => {
    if (!loaded) return;
    const qual = mainQual(state);
    const linked = qual && state.questionBanks.some((b) => b.qualId === qual.id);
    const pp = passPower(state, linked ? qual.id : null);
    if (pp.total === 0) return;
    const r = normRpg(state.rpg);
    const d = todayStr();
    const p = Math.round(pp.power * 1000) / 1000;
    const last = r.powerLog[r.powerLog.length - 1];
    if (!(last && last.d === d && Math.abs(last.p - p) < 0.001)) {
      const g = Object.fromEntries(pp.regions.filter((x) => x.total > 0).map((x) => [x.name, Math.round(x.power * 1000) / 1000]));
      updateRpg((x) => { const lg = [...(x.powerLog || [])]; const e = { d, p, g }; if (lg.length && lg[lg.length - 1].d === d) lg[lg.length - 1] = e; else lg.push(e); return { ...x, powerLog: lg.slice(-400) }; });
    }
    // 影の受験生：試験日が決まったら現れる。追い抜いた・抜かれたときに会話
    if (qual && qual.examDate && daysUntil(qual.examDate) > 0) {
      const rv = r.rival;
      if (!rv || rv.exam !== qual.examDate) {
        updateRpg((x) => ({ ...x, rival: { exam: qual.examDate, t0: d, p0: p, last: "tie", lastEvent: d } }));
        if (!rv) setTimeout(() => setTalk({ title: "影の受験生", lines: RIVAL_TALK.appear }), 4000);
      } else {
        const st = rivalStatus(state, pp, qual);
        if (st && st.status !== "tie" && st.status !== rv.last) {
          const over = st.status === "ahead" && rv.last === "behind";
          const under = st.status === "behind" && rv.last === "ahead";
          updateRpg((x) => ({ ...x, rival: { ...x.rival, last: st.status, lastEvent: d }, ...(over ? { gold: x.gold + 50, goldEarned: x.goldEarned + 50 } : {}) }));
          if (over) setTimeout(() => { setTalk({ title: "影の受験生", lines: RIVAL_TALK.overtake }); showRpgToast("影の受験生を追い抜いた！ 50G", "#6c5a96"); }, 3000);
          else if (under) setTimeout(() => setTalk({ title: "影の受験生", lines: RIVAL_TALK.overtaken }), 3000);
        }
      }
    }
    // 月ごとのランク戦：月が変わったら、先月の結果を記録に残す
    const ym = d.slice(0, 7);
    if (!r.season || r.season.month !== ym) {
      const prev = r.season && r.season.month;
      const hist = [...((r.season && r.season.history) || [])];
      if (prev && !hist.some((h) => h.month === prev)) { const pts = seasonPoints(state, prev).pts; hist.push({ month: prev, pts, rank: seasonRank(pts).id }); }
      updateRpg((x) => ({ ...x, season: { month: ym, claimed: [], history: hist.slice(-24) } }));
      if (prev) { const last = hist[hist.length - 1]; const rk = SEASON_RANKS.find((k) => k.id === last.rank); setTimeout(() => setTalk({ title: "月ごとのランク戦", lines: [["hero", `${Number(prev.slice(5, 7))}月のランク戦は「${rk.name}」でした（${last.pts}点）。おつかれさまでした！`], ["hero", `${Number(ym.slice(5, 7))}月の戦いが始まります。今月もブロンズから、一緒に駆け上がりましょう。`]] }), 3500); }
    }
    const wk = weekKey();
    if (r.reportWeek !== wk) {
      const rep = weeklyReport(state, wk);
      updateRpg((x) => ({ ...x, reportWeek: wk }));
      if (rep) setTimeout(() => setTalk(rep), 2500);
    }
  }, [state.questionBanks, loaded]);

  // 試験日までのカウントダウン：100・50・30・14・7・3日前、前日、当日、試験のあと（1週間以内）に演出と会話。rpg.countdown = { exam, seen:[d] }
  const examDateOfMain = (mainQual(state) || {}).examDate || "";
  useEffect(() => {
    if (!loaded || !examDateOfMain) return;
    const qual = mainQual(state);
    const days = daysUntil(examDateOfMain);
    const r = normRpg(state.rpg);
    const cd = r.countdown && r.countdown.exam === examDateOfMain ? r.countdown : { exam: examDateOfMain, seen: [] };
    const seen = new Set(cd.seen || []);
    const m = days < 0 ? (days >= -7 ? COUNTDOWN_TALKS.find((x) => x.d === -1) : null)
      : COUNTDOWN_TALKS.filter((x) => x.d >= days && x.d >= 0).sort((a, b) => a.d - b.d)[0];
    const ok = m && !seen.has(m.d) && (m.d <= 1 ? m.d === Math.max(-1, Math.min(days, 1)) || (m.d === -1 && days < 0) : m.d - days <= (m.d >= 30 ? 3 : m.d >= 7 ? 1 : 0));
    // 過ぎてしまった節目は、まとめて「見た」ことにする
    const passed = COUNTDOWN_TALKS.filter((x) => (days < 0 ? true : x.d >= days)).map((x) => x.d);
    if (passed.some((d) => !seen.has(d)) || !r.countdown || r.countdown.exam !== examDateOfMain) {
      const gold = ok ? (m.d === -1 ? 300 : 100) : 0;
      updateRpg((x) => ({ ...x, gold: x.gold + gold, goldEarned: x.goldEarned + gold, countdown: { exam: examDateOfMain, seen: [...new Set([...seen, ...passed])] } }));
      if (ok) {
        const big = m.d >= 2 ? `あと${days}日` : m.big;
        setTimeout(() => {
          showEvolution({ big, from: null, to: `${qual.name}の試験${m.d >= 0 ? "まで" : ""}`, sub: `${m.sub}（記念に${gold}G）`, stage: heroStage(stateRef.current.player.level), afterTalk: { title: m.d >= 0 ? `決戦まで ${m.d === 0 ? "今日" : big.replace("あと", "あと ")}` : "試験のあとで", lines: m.lines.map(([w, t]) => [w, m.d >= 30 ? t.replace(`あと${m.d}日`, `あと${days}日`) : t]) } });
        }, 2200);
      }
    }
  }, [loaded, examDateOfMain]);

  // 科目ごとのジョブ：称号が上がったら演出（初めて記録するときは今の称号を覚えるだけ）
  useEffect(() => {
    if (!loaded || state.timer.startMs) return;
    const r = normRpg(state.rpg);
    const jr = r.jobRank || {};
    const jobs = subjectJobs(state);
    if (!jobs.length) return;
    const first = Object.keys(jr).length === 0;
    const ups = jobs.filter((j) => jr[j.region] !== undefined && j.rankLv > jr[j.region]);
    const changed = jobs.some((j) => jr[j.region] !== j.rankLv);
    if (changed) updateRpg((x) => ({ ...x, jobRank: Object.fromEntries(jobs.map((j) => [j.region, j.rankLv])) }));
    if (!first) ups.forEach((j, i) => setTimeout(() => showEvolution({ big: "ジョブ昇格", from: null, to: j.title, sub: `${j.region}　Lv${j.lv}`, stage: heroStage(stateRef.current.player.level) }), 1200 + i * 300));
  }, [state.questionBanks, loaded, !!state.timer.startMs]);

  // 集中タイマー（25分集中＋5分休憩）：rpg.focusRun = { phase: "focus"|"break"|"ready", endAt, own }、rpg.focus = { day, n, total }
  const focusRun = normRpg(state.rpg).focusRun || null;
  const focusActions = {
    start: () => {
      const own = !stateRef.current.timer.startMs;
      if (own) startTimer(null);
      updateRpg((x) => ({ ...x, focusRun: { phase: "focus", endAt: Date.now() + FOCUS_MIN * 60000, own } }));
    },
    stop: () => {
      const fr = normRpg(stateRef.current.rpg).focusRun;
      if (fr && fr.phase === "focus" && fr.own && stateRef.current.timer.startMs) stopTimer();
      updateRpg((x) => ({ ...x, focusRun: null }));
    },
  };
  useEffect(() => {
    if (!loaded || !focusRun || focusRun.phase === "ready") return undefined;
    const t = setTimeout(() => {
      const fr = normRpg(stateRef.current.rpg).focusRun;
      if (!fr || fr.phase === "ready" || Date.now() < fr.endAt - 50) return;
      focusChime();
      if (fr.phase === "focus") {
        if (fr.own && stateRef.current.timer.startMs) stopTimer();
        const day = todayStr();
        const cur = normRpg(stateRef.current.rpg).focus || {};
        const n = (cur.day === day ? cur.n || 0 : 0) + 1;
        const star = n % 4 === 0 ? 1 : 0;
        updateRpg((x) => ({ ...x, gold: x.gold + 10, goldEarned: x.goldEarned + 10, materials: { ...x.materials, "m-star": (x.materials["m-star"] || 0) + star }, focus: { day, n, total: ((x.focus || {}).total || 0) + 1 }, focusRun: { phase: "break", endAt: Date.now() + FOCUS_BREAK_MIN * 60000, own: false } }));
        setTimeout(() => awardXp(10), 200);
        showRpgToast(`集中${n}回目、達成！ 集中の結晶 +1・10G${star ? "・星霊石" : ""}　5分休憩しましょう`, "#4f8eb3");
      } else {
        updateRpg((x) => ({ ...x, focusRun: { phase: "ready", endAt: 0, own: false } }));
        showRpgToast("休憩おわり！ 次の集中をはじめましょう", "#6d8454");
      }
    }, Math.max(0, focusRun.endAt - Date.now()) + 100);
    return () => clearTimeout(t);
  }, [loaded, focusRun && focusRun.phase, focusRun && focusRun.endAt]);

  // 今日のふりかえり：20時以降、学習していないときに1日1回だけ（1分ごとに確かめる）
  useEffect(() => {
    if (!loaded) return undefined;
    const check = () => {
      const cur = stateRef.current;
      if (new Date().getHours() < REFLECT_HOUR || cur.timer.startMs) return;
      if (normRpg(cur.rpg).reflectDay === todayStr()) return;
      updateRpg((x) => ({ ...x, reflectDay: todayStr() }));
      setTimeout(() => setTalk(reflectionTalk(stateRef.current)), 2500);
    };
    const first = setTimeout(check, 6000);
    const iv = setInterval(check, 60000);
    return () => { clearTimeout(first); clearInterval(iv); };
  }, [loaded]);

  // 学習記録の自動バックアップ：アプリを開いて20秒後、前の控えから7日以上たっていたら控えを取る
  const backupTried = useRef(false);
  useEffect(() => {
    if (!loaded || backupTried.current) return undefined;
    backupTried.current = true;
    const t = setTimeout(async () => {
      try {
        const cur = stateRef.current;
        const nQ = cur.questionBanks.reduce((n, b) => n + (b.questions || []).length, 0);
        if (cloudLoadFailed.current || nQ < 10) return; // 読み込み失敗中・空っぽのときは控えを取らない
        const ids = (await backupCol(user.uid).get()).docs.map((d) => d.id).sort();
        const last = ids[ids.length - 1];
        if (last && (parseLocalDate(todayStr()) - parseLocalDate(last)) / 86400000 < 7) return;
        await makeBackup(user.uid, stateRef.current);
      } catch (e) { console.warn("自動バックアップ:", e); }
    }, 20000);
    return () => clearTimeout(t);
  }, [loaded]);

  // 仲間との絆が深まったら、その仲間の物語を1話ひらく（学習の途中＝時間を計っている間は待ち、終わってから出す）
  useEffect(() => {
    if (!loaded || state.timer.startMs) return;
    const r = normRpg(state.rpg);
    alliesJoined(r).forEach((a, i) => {
      const lv = bondLevel(r.bonds[a.id]);
      const seen = r.bondSeen[a.id] || 1;
      if (lv > seen) {
        updateRpg((x) => ({ ...x, bondSeen: { ...(x.bondSeen || {}), [a.id]: lv } }));
        const ep = (BOND_TALKS[a.id] || [])[lv - 2];
        setTimeout(() => { showRpgToast(`${a.name}との絆が Lv${lv} になった！ 仲間の効果が強くなった`, "#c9667e"); if (ep) setTalk({ title: `${a.name}との絆 Lv${lv}「${ep.title}」`, lines: ep.lines }); }, 1500 + i * 400);
      }
    });
  }, [state.rpg && state.rpg.bonds, loaded, !!state.timer.startMs]);

  // 地域の制覇（全話・節の守護者・地域の守護者）と、三つの柱（不動産登記法・民法・調査士法）の制覇を祝う
  useEffect(() => {
    if (!loaded) return;
    const qual = mainQual(state);
    const linked = qual && state.questionBanks.some((b) => b.qualId === qual.id);
    const pp = passPower(state, linked ? qual.id : null);
    const r = normRpg(state.rpg);
    const newly = pp.regions.filter((g) => g.total > 0 && !r.conquered[g.name] && regionConquest(g, r).done);
    if (newly.length) {
      const g = newly[0];
      const short = g.name.replace(/の(王都|古の森|双子塔|砦|星見台|迷宮|地)$/, "").replace(/^未踏$/, "未踏の地");
      updateRpg((x) => ({ ...x, gold: x.gold + 500, goldEarned: x.goldEarned + 500, materials: { ...x.materials, "m-sage": (x.materials["m-sage"] || 0) + 2 }, conquered: { ...x.conquered, [g.name]: todayStr() } }));
      setTimeout(() => showEvolution({ big: "地域制覇", from: null, to: g.name, sub: "すべての話・節・守護者を制覇！ 500G・賢者の結晶×2", stage: heroStage(state.player.level), afterTalk: { title: `${g.name}　制覇`, lines: regionArc(g.name).finale } }), 1200);
      awardAchievement({ id: `conquer-${g.name}`, title: `${short}マスター`, job: "地域の覇者", icon: "🏆", color: "#b08a3e", source: "rpg", description: `${g.name}のストーリー・節の守護者・地域の守護者をすべて制覇した証。`, earnedAt: new Date().toISOString() });
      return;
    }
    if (!r.conquered.__trinity && TRINITY_REGIONS.every((n) => r.conquered[n])) {
      updateRpg((x) => ({ ...x, gold: x.gold + 1000, goldEarned: x.goldEarned + 1000, materials: { ...x.materials, "m-sage": (x.materials["m-sage"] || 0) + 3 }, conquered: { ...x.conquered, __trinity: todayStr() } }));
      setTimeout(() => showEvolution({ big: "三つの柱", from: null, to: "不動産登記法・民法・調査士法を制覇", sub: "1000G・賢者の結晶×3", stage: heroStage(state.player.level), afterTalk: { title: "特別章　三つの柱", lines: TRINITY_TALK } }), 1500);
      awardAchievement({ id: "trinity", title: "境界の三賢", job: "三本柱の覇者", icon: "👑", color: "#8c79c8", source: "rpg", description: "不動産登記法・民法・土地家屋調査士法の地域をすべて制覇した証。", earnedAt: new Date().toISOString() });
    }
  }, [state.rpg, state.questionBanks, loaded]);

  // 物語：合格力が上がって新しい章が開いたら、全画面で知らせる
  useEffect(() => {
    if (!loaded) return;
    const qual = mainQual(state);
    const linked = qual && state.questionBanks.some((b) => b.qualId === qual.id);
    const pp = passPower(state, linked ? qual.id : null);
    if (pp.total === 0) return;
    const idx = storyIndex(pp.power);
    const r = normRpg(state.rpg);
    if (idx > r.storySeen) {
      updateRpg((x) => ({ ...x, storySeen: idx }));
      const ch = STORY_CHAPTERS[idx];
      setTimeout(() => showEvolution({ big: idx === 0 ? "物語の始まり" : "新しい章", from: null, to: ch.title.replace("　", " "), sub: ch.text.split("\n")[0], stage: heroStage(state.player.level), afterTalk: { title: ch.title, lines: [...(STORY_TALKS[idx] || []), ...ALLIES.map((a) => [a.id, a.cheer])] } }), 1200);
    }
  }, [state.questionBanks, loaded]);

  // 戦闘の戦利品（素材・必殺技のEXP）を記録する（BattleStage から battleBus で届く）
  useEffect(() => {
    if (!battleBus) return undefined;
    const on = (e) => {
      const { mats, xp, stat } = e.detail || {};
      if ((mats && Object.keys(mats).length) || stat) updateRpg((x) => {
        const m = { ...x.materials };
        Object.entries(mats || {}).forEach(([k, n]) => { m[k] = (m[k] || 0) + n; });
        if (!stat) return { ...x, materials: m };
        // デイリークエストの進み具合（日付が変わったら0から）
        const d = dailyOf(x);
        const k = { ...d.k };
        k.defeated = (k.defeated || 0) + 1;
        if (stat.elite) k.elite = (k.elite || 0) + 1;
        if (stat.fresh) k.fresh = (k.fresh || 0) + 1;
        if (stat.crit) k.crits = (k.crits || 0) + 1;
        k.maxCombo = Math.max(k.maxCombo || 0, stat.combo || 0);
        // 旅路：魔物を JOURNEY_PER 体倒すごとに1マス進み、マスのできごとの贈り物を受け取る
        const jn = { ...x.journey, log: [...(x.journey.log || [])] };
        let gold = 0;
        jn.acc = (jn.acc || 0) + 1;
        if (jn.acc >= JOURNEY_PER) {
          jn.acc -= JOURNEY_PER;
          jn.pos = (jn.pos || 0) + 1;
          if (jn.pos >= JOURNEY_LEN) {
            gold += 300; jn.log.push(`🏰 魔王城の門にたどり着いた！ 300G（${(jn.lap || 0) + 2}周目の旅へ）`);
            jn.pos = 0; jn.lap = (jn.lap || 0) + 1;
          } else {
            const ev = journeyEvent(jn.pos);
            if (ev) {
              const rw = ev.reward;
              gold += rw.gold || 0;
              if (rw.frag) { const fid = FRAG_IDS[jn.pos % FRAG_IDS.length]; m[fid] = (m[fid] || 0) + rw.frag; }
              if (rw.star) m["m-star"] = (m["m-star"] || 0) + rw.star;
              jn.log.push(`${ev.icon} ${jn.pos}マス目：${ev.name}${ev.quote ? `「${ev.quote.t}」` : ""} → ${rewardText(rw)}`);
            } else jn.log.push(`👣 ${jn.pos}マス目に進んだ`);
          }
          jn.log = jn.log.slice(-10);
        }
        let out = { ...x, gold: x.gold + gold, goldEarned: x.goldEarned + gold, materials: m, daily: { ...d, k }, journey: jn };
        ALLIES.filter((a) => stat.region && a.likes.includes(stat.region)).forEach((a) => { out = addBond(out, a.id, 1); });
        return out;
      });
      // 旅路のできごとを知らせる（宝箱・旅人・祠・町のマスに着いたとき）
      if (stat) {
        const jr = normRpg(stateRef.current.rpg).journey;
        if ((jr.acc || 0) + 1 >= JOURNEY_PER) {
          const ev = journeyEvent((jr.pos || 0) + 1);
          if (ev) setTimeout(() => showRpgToast(`${ev.icon} 旅路：${ev.name}${ev.kind === "town" ? "に着いた" : "に出会った"}！ ${rewardText(ev.reward)}`, "#b08a3e"), 700);
        }
      }
      if (xp) setTimeout(() => awardXp(xp), 120);
    };
    battleBus.addEventListener("reward", on);
    return () => battleBus.removeEventListener("reward", on);
  }, []);

  // テーマ設定を端末にも保存（次回の起動時、読み込み前から反映するため）
  useEffect(() => {
    if (!loaded) return;
    const ds = state.displaySettings || {};
    writePref("sq-theme", ds.theme || "white");
    writePref("sq-title", ds.showTitle === false ? "off" : "on");
  }, [loaded, state.displaySettings && state.displaySettings.theme, state.displaySettings && state.displaySettings.showTitle]);

  // 効果音のオン・オフ（設定）と、レベルアップの音
  useEffect(() => { SFX.enabled = !!(state.displaySettings && state.displaySettings.sfx); }, [state.displaySettings && state.displaySettings.sfx]);
  // ひっかけ言葉の印：設定（オン／オフ）か、自動なら「読み違い」でまちがえた回数が3回以上でオン
  TRAP_MARK.on = trapMarkOn(state);
  useEffect(() => { if (showLevelUp) SFX.play("levelup"); }, [showLevelUp]);

  // 覚醒・相棒の進化のお知らせ
  const [rpgEvent, setRpgEvent] = useState(null);
  const showRpgEvent = (ev) => {
    const id = uid();
    setRpgEvent({ ...ev, id });
    setTimeout(() => setRpgEvent((e) => (e && e.id === id ? null : e)), 3400);
  };
  // 進化の演出（主人公の姿・覚醒・相棒）。テーマに合わせた主人公の顔を使う
  const [evolution, setEvolution] = useState(null);
  const evoQ = useRef([]); // 演出が重なったときの順番待ち（前の演出と会話が終わってから出す）
  const [lapStamp, setLapStamp] = useState(null); // 周回スタンプの演出 { id, bankName, laps }
  const [talkQ, setTalkQ] = useState([]); // 会話の画面（物語・地域の解放・週報）。重なったときは順番に出す
  const talk = talkQ[0] || null;
  const setTalk = (t) => { if (t && t.lines && t.lines.length) setTalkQ((q) => [...q, { ...t, id: uid() }]); };
  // 順番待ちの演出：いまの演出と会話が終わったら、次を出す
  useEffect(() => {
    if (evolution || talk || !evoQ.current.length) return undefined;
    const t = setTimeout(() => setEvolution((cur) => cur || evoQ.current.shift() || null), 500);
    return () => clearTimeout(t);
  }, [evolution, talk]);
  const showEvolution = (ev) => {
    const th = BATTLE_THEME[(stateRef.current.displaySettings && stateRef.current.displaySettings.theme) || "white"] || BATTLE_THEME.white;
    const e = { avatar: th.avatar, face: th.face, ...ev, id: uid() };
    setEvolution((cur) => { if (cur) { evoQ.current.push(e); return cur; } return e; });
  };
  useEffect(() => {
    if (!loaded) return;
    const r = normRpg(state.rpg);
    const aw = getAwakening(state);
    if (aw.stars > (r.seen.stars || 0)) {
      updateRpg((x) => ({ ...x, seen: { ...x.seen, stars: aw.stars } }));
      showEvolution({ big: "覚醒", from: aw.stars > 1 ? `★${aw.stars - 1}` : null, to: `覚醒 ★${aw.stars}`, sub: `しっかり覚えた問題が${aw.mastered}問に！ EXP+${aw.stars * 3}%・会心率+${aw.stars}%`, stage: heroStage(state.player.level) });
      return;
    }
    const pet = getPetInfo(state);
    if (pet && pet.stage > (r.seen.pet || 0)) {
      updateRpg((x) => ({ ...x, seen: { ...x.seen, pet: pet.stage } }));
      const prev = pet.type.stages[Math.max(0, pet.stage - 1)];
      showEvolution({ big: pet.stage === 1 ? "誕生" : "進化", from: prev[1], to: `${pet.name}（${pet.stageName}）`, sub: pet.type.bonusText(pet.stage), icon: pet.icon, prevIcon: prev[0], avatar: null });
    }
  }, [state, loaded]);

  // 冒険の実績：条件を満たしたら1つずつ称号として付与
  const rpgAwardedRef = useRef(new Set());
  useEffect(() => {
    if (!loaded) return;
    const r = normRpg(state.rpg);
    const st = calculateStatus(state);
    const have = new Set(state.player.achievements.map((a) => a.id));
    for (const a of RPG_ACHIEVEMENTS) {
      if (have.has(a.id) || rpgAwardedRef.current.has(a.id)) continue;
      if (a.test({ state, r, st })) {
        rpgAwardedRef.current.add(a.id);
        awardAchievement({ id: a.id, title: a.title, job: "冒険者", icon: a.icon, color: a.color, source: "rpg", description: a.desc, earnedAt: new Date().toISOString() });
        break;
      }
    }
  }, [state, loaded]);
  const updateBestStreak = (newStreak) => setState((s) => ({ ...s, player: { ...s.player, bestQaStreak: Math.max(s.player.bestQaStreak || 0, newStreak) } }));
  const awardAchievement = (achievement) => {
    setState((s) => {
      if (s.player.achievements.some((a) => a.id === achievement.id)) return s;
      return { ...s, player: { ...s.player, achievements: [...s.player.achievements, achievement] } };
    });
    setShowAchievement(achievement);
    setTimeout(() => setShowAchievement(null), 3200);
  };
  const setMainTitle = (id) => setState((s) => ({ ...s, player: { ...s.player, mainTitleId: id } }));

  const addTask = (name, difficulty, qualId, presetId = null) => setState((s) => ({ ...s, tasks: [...s.tasks, { id: uid(), name, difficulty, qualId: qualId || null, presetId: presetId || null }] }));
  const completeTask = (task) => {
    const gain = DIFFICULTIES[task.difficulty].xp;
    const clearKey = task.presetId || `inline:${task.name}`;
    setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== task.id), taskClears: { ...s.taskClears, [clearKey]: (s.taskClears[clearKey] || 0) + 1 }, player: { ...s.player, totalCompleted: s.player.totalCompleted + 1 } }));
    awardXp(gain);
  };
  const deleteTask = (id) => setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
  const addPreset = (preset) => setState((s) => ({ ...s, taskPresets: [...s.taskPresets, { id: uid(), ...preset }] }));
  const deletePreset = (id) => setState((s) => ({ ...s, taskPresets: s.taskPresets.filter((p) => p.id !== id) }));
  const updatePreset = (id, patch) => setState((s) => ({ ...s, taskPresets: s.taskPresets.map((p) => p.id === id ? { ...p, ...patch } : p) }));

  const addQual = (q) => setState((s) => ({ ...s, qualifications: [...s.qualifications, { id: uid(), name: q.name, examDate: q.examDate, targetHours: Number(q.targetHours) || 0, color: QUAL_COLORS[s.qualifications.length % QUAL_COLORS.length], acquired: false }] }));
  const deleteQual = (id) => setState((s) => ({ ...s, qualifications: s.qualifications.filter((q) => q.id !== id), tasks: s.tasks.map((t) => t.qualId === id ? { ...t, qualId: null } : t), taskPresets: s.taskPresets.map((p) => p.qualId === id ? { ...p, qualId: null } : p), questionBanks: s.questionBanks.map((b) => b.qualId === id ? { ...b, qualId: null } : b), studyLog: s.studyLog.filter((l) => l.qualId !== id) }));
  const updateQual = (id, patch) => setState((s) => ({ ...s, qualifications: s.qualifications.map((q) => q.id === id ? { ...q, ...patch } : q) }));
  const acquireQual = (qual) => {
    const t = lookupQualTitle(qual.name);
    const ach = { id: `q-${qual.id}`, title: t.title, job: t.job, icon: t.icon, color: qual.color, source: "qualification", description: `${qual.name}の試験に合格した証。`, earnedAt: new Date().toISOString() };
    updateQual(qual.id, { acquired: true, acquiredAt: new Date().toISOString() });
    awardXp(XP_QUAL_ACQUIRE);
    setTimeout(() => awardAchievement(ach), 200);
  };

  const startTimer = (qualId, autoMode = null) => setState((s) => ({ ...s, timer: { qualId, startMs: Date.now(), autoMode } }));
  const stopTimer = () => {
    setState((s) => {
      if (!s.timer.startMs) return s;
      const elapsed = (Date.now() - s.timer.startMs) / 60000;
      // 異常値チェック：6時間(360分)超はタイマー暴走とみなしキャンセル
      if (elapsed < 0.1 || elapsed > MAX_TIMER_MS / 60000) return { ...s, timer: { qualId: null, startMs: null, autoMode: null } };
      const log = { id: uid(), date: todayStr(), qualId: s.timer.qualId, minutes: elapsed, source: "timer" };
      const xpGain = Math.floor(elapsed * XP_TIMER_PER_MIN);
      if (xpGain > 0) setTimeout(() => awardXp(xpGain), 100);
      return { ...s, studyLog: [...s.studyLog, log], timer: { qualId: null, startMs: null, autoMode: null } };
    });
  };
  // 記録せずにタイマーをキャンセル（誤操作対応）
  const cancelTimer = () => {
    setState((s) => ({ ...s, timer: { qualId: null, startMs: null, autoMode: null } }));
  };
  const addManualLog = (entry) => {
    setState((s) => ({ ...s, studyLog: [...s.studyLog, { ...entry, source: "manual", id: uid() }] }));
    const xpGain = Math.floor(entry.minutes * XP_TIMER_PER_MIN);
    if (xpGain > 0) awardXp(xpGain);
  };
  const deleteLog = (idOrIdx) => setState((s) => ({ ...s, studyLog: s.studyLog.filter((l, i) => l.id ? l.id !== idOrIdx : i !== idOrIdx) }));

  const addQuestionBank = (bank) => setState((s) => ({ ...s, questionBanks: [...s.questionBanks, { ...bank, clears: 0, order: s.questionBanks.length, folderId: bank.folderId || null }] }));
  const deleteBank = (id) => setState((s) => ({ ...s, questionBanks: s.questionBanks.filter((b) => b.id !== id) }));

  // ── フォルダ操作 ──
  const addFolder = (name) => setState((s) => ({
    ...s, folders: [...(s.folders || []), { id: uid(), name, order: (s.folders || []).length }]
  }));
  const deleteFolder = (folderId) => setState((s) => ({
    ...s,
    folders: (s.folders || []).filter((f) => f.id !== folderId),
    questionBanks: s.questionBanks.map((b) => b.folderId === folderId ? { ...b, folderId: null } : b),
  }));
  const renameFolder = (folderId, name) => setState((s) => ({
    ...s, folders: (s.folders || []).map((f) => f.id === folderId ? { ...f, name } : f)
  }));
  const reorderFolders = (orderedIds) => setState((s) => ({
    ...s, folders: (s.folders || []).map((f) => ({ ...f, order: orderedIds.indexOf(f.id) }))
  }));
  const addStudyNote = (folderId, title, content) => setState((s) => ({
    ...s, studyNotes: [...(s.studyNotes || []), { id: uid(), folderId: folderId || null, title: title || "", content: content || "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]
  }));
  const updateStudyNote = (noteId, patch) => setState((s) => ({
    ...s, studyNotes: (s.studyNotes || []).map((n) => n.id === noteId ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n)
  }));
  const deleteStudyNote = (noteId) => setState((s) => ({
    ...s, studyNotes: (s.studyNotes || []).filter((n) => n.id !== noteId)
  }));
  const moveBankToFolder = (bankId, folderId) => setState((s) => ({
    ...s, questionBanks: s.questionBanks.map((b) => b.id !== bankId ? b : { ...b, folderId: folderId || null })
  }));

  // 問題集に問題を1件追加
  const addQuestionToBank = (bankId, q, a) => {
    setState((s) => ({ ...s, questionBanks: s.questionBanks.map((b) => b.id !== bankId ? b : {
      ...b, questions: [...b.questions, { id: uid(), q, a, correct: 0, wrong: 0, marked: false, q_formats: [], a_formats: [], sr_nextReview: null, sr_interval: 0, sr_streak: 0, clozes: [] }]
    })}));
  };

  // 問題を編集（問題文・答えを更新）
  const editQuestion = (bankId, qId, q, a) => {
    setState((s) => ({ ...s, questionBanks: s.questionBanks.map((b) => b.id !== bankId ? b : {
      ...b, questions: b.questions.map((x) => x.id !== qId ? x : { ...x, q, a })
    })}));
  };

  // 習得済み除外フラグをトグル
  const toggleQuestionExclude = (bankId, qId) => {
    setState((s) => ({ ...s, questionBanks: s.questionBanks.map((b) => b.id !== bankId ? b : {
      ...b, questions: b.questions.map((x) => x.id !== qId ? x : { ...x, excluded: !x.excluded })
    })}));
  };

  // 問題の画像リストを更新（updater は現在の配列を受け取り新しい配列を返す）
  const updateQuestionImages = (bankId, qId, updater) => {
    setState((s) => ({ ...s, questionBanks: s.questionBanks.map((b) => b.id !== bankId ? b : {
      ...b, questions: b.questions.map((x) => x.id !== qId ? x : { ...x, images: updater(Array.isArray(x.images) ? x.images : []) })
    })}));
  };

  // 問題メモを更新
  const updateQuestionMemo = (bankId, qId, memo) => {
    setState((s) => ({ ...s, questionBanks: s.questionBanks.map((b) => b.id !== bankId ? b : {
      ...b, questions: b.questions.map((x) => x.id !== qId ? x : { ...x, memo })
    })}));
  };

  // 問題を削除
  const deleteQuestion = (bankId, qId) => {
    setState((s) => ({ ...s, questionBanks: s.questionBanks.map((b) => b.id !== bankId ? b : {
      ...b, questions: b.questions.filter((x) => x.id !== qId)
    })}));
  };

  // 問題を別の問題集に移動
  const moveQuestions = (fromBankId, qIds, toBankId) => {
    setState((s) => {
      const fromBank = s.questionBanks.find((b) => b.id === fromBankId);
      if (!fromBank) return s;
      const moving = fromBank.questions.filter((q) => qIds.includes(q.id));
      return { ...s, questionBanks: s.questionBanks.map((b) => {
        if (b.id === fromBankId) return { ...b, questions: b.questions.filter((q) => !qIds.includes(q.id)) };
        if (b.id === toBankId) return { ...b, questions: [...b.questions, ...moving] };
        return b;
      })};
    });
  };

  // 問題集のメタデータ（名前・年度・資格）を編集
  const editBankMeta = (bankId, patch) => {
    setState((s) => ({ ...s, questionBanks: s.questionBanks.map((b) => b.id !== bankId ? b : { ...b, ...patch }) }));
  };

  // 穴あき問題から新しい問題集を作成
  const createClozeBank = (sourceQualIds, bankName, bankYear, bankQualId) => {
    const questions = [];
    state.questionBanks.forEach((b) => {
      const bKey = b.qualId || "_none_";
      const include = sourceQualIds === "all" || sourceQualIds.includes(bKey);
      if (!include) return;
      b.questions.forEach((q) => {
        (q.clozes || []).forEach((c) => {
          if (!c.text || !c.blanks || c.blanks.length === 0) return;
          // 穴あきプレビュー → 問題文
          const sorted = [...c.blanks].sort((a, b) => a.from - b.from);
          let qText = ""; let cursor = 0;
          sorted.forEach((bl) => { qText += c.text.slice(cursor, bl.from) + "【　　　】"; cursor = bl.to; });
          qText += c.text.slice(cursor);
          // 答え
          const aText = sorted.map((bl, i) => sorted.length === 1 ? bl.answer : `(${i+1}) ${bl.answer}`).join(" / ");
          questions.push({ id: uid(), q: qText, a: aText, correct: 0, wrong: 0, marked: c.marked || false, clozes: [] });
        });
      });
    });
    if (questions.length === 0) return 0;
    const newBank = { id: uid(), name: bankName, year: bankYear || "", qualId: bankQualId || null, questions, clearHistory: [] };
    addQuestionBank(newBank);
    return questions.length;
  };
  // ── 学習計画（今日のタスク）の操作 ──
  const addPlan = (plan) => setState((s) => ({ ...s, studyPlans: [...(s.studyPlans || []), { ...plan, id: uid(), done: {}, createdAt: todayStr() }] }));
  const removePlan = (id) => setState((s) => ({ ...s, studyPlans: (s.studyPlans || []).filter((p) => p.id !== id) }));
  const finishPlanIfDone = (before, after, wait = 1200) => {
    after.forEach((p) => {
      const was = before.find((x) => x.id === p.id);
      if (p.finishedAt && was && !was.finishedAt) setTimeout(() => { SFX.play("levelup"); showEvolution({ big: "計画達成", from: null, to: p.name, sub: `${planTotal(p)}項目をやりとげました！`, stage: heroStage(stateRef.current.player.level) }); }, wait);
    });
  };
  const togglePlanItem = (planId, k) => {
    const before = stateRef.current.studyPlans || [];
    const after = before.map((p) => {
      if (p.id !== planId) return p;
      const done = { ...(p.done || {}) };
      if (done[k]) delete done[k]; else done[k] = todayStr();
      const full = Object.keys(done).length >= planTotal(p);
      return { ...p, done, finishedAt: full ? (p.finishedAt || todayStr()) : null };
    });
    setState((s) => ({ ...s, studyPlans: after }));
    finishPlanIfDone(before, after);
  };
  // 問題集を最後まで解いたら、計画の中でいちばん早い「まだの回」を済みにする
  const markPlanBank = (bankId, weakOnlyRun = false) => {
    const before = stateRef.current.studyPlans || [];
    if (!before.length) return;
    const after = before.map((p) => {
      if (p.finishedAt || !p.bankIds.includes(bankId)) return p;
      if (weakOnlyRun && !p.weakOnly) return p; // 苦手だけの学習は「苦手だけ」の計画にだけ数える
      const done = { ...(p.done || {}) };
      const n = p.bankIds.length;
      for (let k = 0; k < planTotal(p); k++) if (p.bankIds[k % n] === bankId && !done[k] && (!weakOnlyRun || k >= n)) { done[k] = todayStr(); break; }
      const full = Object.keys(done).length >= planTotal(p);
      return { ...p, done, finishedAt: full ? todayStr() : null };
    });
    setState((s) => ({ ...s, studyPlans: after }));
    finishPlanIfDone(before, after, 6000); // 周回スタンプの演出（約5秒）が終わってから
  };
  const planActions = { addPlan, removePlan, togglePlanItem, openBank: (bankId, mode) => { setOpenBankReq(mode ? { id: bankId, mode } : bankId); setTab("qbank"); }, goRoom: () => setTab("laps") };

  const incrementBankClears = (id) => {
    markPlanBank(id);
    setState((s) => ({ ...s, questionBanks: s.questionBanks.map((b) => b.id === id ? { ...b, clears: (b.clears || 0) + 1 } : b) }));
    // 周回スタンプを押す演出（完全制覇のたび）
    const b = stateRef.current.questionBanks.find((x) => x.id === id);
    if (b) setTimeout(() => setLapStamp({ id: uid(), bankName: b.name, laps: (b.clears || 0) + 1 }), 600);
  };
  const moveBank = (id, direction) => setState((s) => {
    const target = s.questionBanks.find((b) => b.id === id);
    if (!target) return s;
    const groupKey = target.qualId || "_none_";
    const group = s.questionBanks.filter((b) => (b.qualId || "_none_") === groupKey).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const idx = group.findIndex((b) => b.id === id);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= group.length) return s;
    const a = group[idx], bb = group[newIdx];
    return { ...s, questionBanks: s.questionBanks.map((b) => { if (b.id === a.id) return { ...b, order: bb.order ?? newIdx }; if (b.id === bb.id) return { ...b, order: a.order ?? idx }; return b; }) };
  });
  const recordAnswer = (bankId, qId, correct, meta) => {
    const now = new Date();
    setState((s) => {
      const bank = s.questionBanks.find((b) => b.id === bankId);
      if (!bank) return s;
      const q = bank.questions.find((x) => x.id === qId);
      const isFirst = (q.correct + q.wrong) === 0;
      const xpGain = correct ? (isFirst ? XP_QA_FIRST : XP_QA_REVIEW) : 0;
      if (xpGain > 0) setTimeout(() => awardXp(xpGain), 50);
      return { ...s, player: { ...s.player, totalQaAnswered: s.player.totalQaAnswered + 1 }, questionBanks: s.questionBanks.map((b) => b.id !== bankId ? b : { ...b, questions: b.questions.map((x) => x.id !== qId ? x : { ...applyAnswerMeta(x, correct, meta), correct: x.correct + (correct ? 1 : 0), wrong: x.wrong + (correct ? 0 : 1), ...scheduleAnswer(x, correct, meta, s.srSettings, now) }) }) };
    });
  };
  const recordRevengeAnswer = (bankId, qId, correct, meta) => {
    const now = new Date();
    setState((s) => ({ ...s, player: { ...s.player, totalQaAnswered: s.player.totalQaAnswered + 1 }, questionBanks: s.questionBanks.map((b) => b.id !== bankId ? b : { ...b, questions: b.questions.map((x) => x.id !== qId ? x : { ...applyAnswerMeta(x, correct, meta), correct: x.correct + (correct ? 1 : 0), wrong: x.wrong + (correct ? 0 : 1), ...scheduleAnswer(x, correct, meta, s.srSettings, now) }) }) }));
    if (correct) setTimeout(() => awardXp(XP_QA_REVENGE), 50);
  };

  // === Cloze (穴あき問題) operations ===
  const addCloze = (bankId, qId, clozeData) => {
    setState((s) => ({ ...s, questionBanks: s.questionBanks.map((b) => b.id !== bankId ? b : {
      ...b, questions: b.questions.map((x) => x.id !== qId ? x : {
        ...x, clozes: [...(x.clozes || []), { id: uid(), text: clozeData.text, blanks: clozeData.blanks, correct: 0, wrong: 0, marked: false }]
      })
    })}));
  };
  const deleteCloze = (bankId, qId, clozeId) => {
    setState((s) => ({ ...s, questionBanks: s.questionBanks.map((b) => b.id !== bankId ? b : {
      ...b, questions: b.questions.map((x) => x.id !== qId ? x : {
        ...x, clozes: (x.clozes || []).filter((c) => c.id !== clozeId)
      })
    })}));
  };
  const recordClozeAnswer = (bankId, qId, clozeId, correct) => {
    setState((s) => {
      const bank = s.questionBanks.find((b) => b.id === bankId);
      if (!bank) return s;
      const q = bank.questions.find((x) => x.id === qId);
      const c = (q.clozes || []).find((cl) => cl.id === clozeId);
      const isFirst = c && (c.correct + c.wrong) === 0;
      const xpGain = correct ? (isFirst ? XP_QA_FIRST : XP_QA_REVIEW) : 0;
      if (xpGain > 0) setTimeout(() => awardXp(xpGain), 50);
      return { ...s, player: { ...s.player, totalQaAnswered: s.player.totalQaAnswered + 1 }, questionBanks: s.questionBanks.map((b) => b.id !== bankId ? b : {
        ...b, questions: b.questions.map((x) => x.id !== qId ? x : {
          ...x, clozes: (x.clozes || []).map((cl) => cl.id !== clozeId ? cl : { ...cl, correct: cl.correct + (correct ? 1 : 0), wrong: cl.wrong + (correct ? 0 : 1) })
        })
      })};
    });
  };
  const recordClozeRevengeAnswer = (bankId, qId, clozeId, correct) => {
    setState((s) => ({ ...s, player: { ...s.player, totalQaAnswered: s.player.totalQaAnswered + 1 }, questionBanks: s.questionBanks.map((b) => b.id !== bankId ? b : {
      ...b, questions: b.questions.map((x) => x.id !== qId ? x : {
        ...x, clozes: (x.clozes || []).map((cl) => cl.id !== clozeId ? cl : { ...cl, correct: cl.correct + (correct ? 1 : 0), wrong: cl.wrong + (correct ? 0 : 1) })
      })
    })}));
    if (correct) setTimeout(() => awardXp(XP_QA_REVENGE), 50);
  };

  // === Manual review mark (要復習マーク) ===
  const toggleQuestionMark = (bankId, qId) => {
    setState((s) => ({ ...s, questionBanks: s.questionBanks.map((b) => b.id !== bankId ? b : {
      ...b, questions: b.questions.map((x) => x.id !== qId ? x : { ...x, marked: !x.marked })
    })}));
  };
  const toggleClozeMark = (bankId, qId, clozeId) => {
    setState((s) => ({ ...s, questionBanks: s.questionBanks.map((b) => b.id !== bankId ? b : {
      ...b, questions: b.questions.map((x) => x.id !== qId ? x : {
        ...x, clozes: (x.clozes || []).map((cl) => cl.id !== clozeId ? cl : { ...cl, marked: !cl.marked })
      })
    })}));
  };

  // === Clear history snapshot for accuracy graph ===
  const recordClearSnapshot = (bankId, snapshot) => {
    setState((s) => ({ ...s, questionBanks: s.questionBanks.map((b) => b.id !== bankId ? b : {
      ...b, clearHistory: [...(b.clearHistory || []), snapshot]
    })}));
    // 完全制覇の報酬：100ゴールドと装備1つ
    setTimeout(() => {
      updateRpg((x) => ({ ...x, gold: x.gold + 100, goldEarned: x.goldEarned + 100 }));
      grantItem(rollRpgItem(1), "完全制覇の報酬");
    }, 900);
  };

  // 問題文の表示設定（フォント・文字サイズ）
  const updateDisplaySettings = (patch) => setState((s) => ({ ...s, displaySettings: { ...DISPLAY_DEFAULTS, ...(s.displaySettings || {}), ...patch } }));

  // 間隔反復の設定（目標記憶率など）
  const updateSrSettings = (patch) => setState((s) => ({ ...s, srSettings: { ...SR_DEFAULTS, ...(s.srSettings || {}), ...patch } }));

  // 今日の復習での回答記録（FSRSで次回の出題日を計算）
  const recordSRAnswer = (bankId, qId, correct, meta) => {
    const now = new Date();
    setState((s) => {
      const bank = s.questionBanks.find((b) => b.id === bankId);
      if (!bank) return s;
      const q = bank.questions.find((x) => x.id === qId);
      if (!q) return s;
      const xpGain = correct ? XP_QA_REVIEW : 0;
      if (xpGain > 0) setTimeout(() => awardXp(xpGain), 50);
      return { ...s,
        player: { ...s.player, totalQaAnswered: s.player.totalQaAnswered + 1 },
        questionBanks: s.questionBanks.map((b) => b.id !== bankId ? b : {
          ...b, questions: b.questions.map((x) => x.id !== qId ? x : {
            ...applyAnswerMeta(x, correct, meta),
            correct: x.correct + (correct ? 1 : 0),
            wrong: x.wrong + (correct ? 0 : 1),
            ...scheduleAnswer(x, correct, meta, s.srSettings, now),
          })
        })
      };
    });
  };

  // 間隔反復：今日の問題を収集
  const getTodayReviewItems = () => {
    const today = todayStr();
    const items = [];
    state.questionBanks.forEach((b) => {
      b.questions.forEach((q) => {
        if (q.excluded) return; // 習得済み（除外）は対象外
        // 未スケジュール（初回）or 今日以前が対象
        if (!q.sr_nextReview || q.sr_nextReview <= today) {
          items.push({ type: "q", bankId: b.id, bankName: b.name, qualId: b.qualId, qId: q.id });
        }
      });
    });
    return items;
  };

  // 書式設定（マーカー・太字・下線）
  const updateQuestionFormats = (bankId, qId, q_formats, a_formats) => {
    setState((s) => ({ ...s, questionBanks: s.questionBanks.map((b) => b.id !== bankId ? b : {
      ...b, questions: b.questions.map((x) => x.id !== qId ? x : { ...x, q_formats, a_formats })
    })}));
  };

  // 途中再開セッションの保存・クリア
  // session resume をFirestoreに即座に保存（他端末がすぐ受け取れるように）
  // 途中再開セッションをFirestoreの専用パスに即時保存（クロスデバイス同期）
  const _sessionRef = () => fbDb.collection("userdata").doc(user.uid).collection("sessions").doc("current");
  const saveSessionResume = (resume) => {
    setState((s) => ({ ...s, sessionResume: resume }));
    _sessionRef().set(resume).catch((e) => console.warn("SR save:", e));
  };
  const clearSessionResume = () => {
    setState((s) => ({ ...s, sessionResume: null }));
    _sessionRef().delete().catch((e) => console.warn("SR clear:", e));
  };

  // 周回スタンプ数の手動編集
  const editBankClears = (bankId, clears) => {
    setState((s) => ({
      ...s,
      questionBanks: s.questionBanks.map((b) => b.id !== bankId ? b : {
        ...b, clears: Math.max(0, parseInt(clears) || 0)
      })
    }));
  };

  // JSONエクスポート（Firebaseを使わずデータをファイルとして保存）
  const exportJson = async () => {
    try {
      const { questionBanks, ...mainState } = state;
      const exportData = { version: 1, exportedAt: new Date().toISOString(), mainState, questionBanks };
      // 画像（問題に付けたスクショ・写真）も書き出すか確認
      const imgIds = [...new Set(questionBanks.flatMap((b) => (b.questions || []).flatMap((q) => (q.images || []).map((im) => im.id))))];
      let imgNote = "";
      if (imgIds.length > 0 && confirm(`問題に付けた画像が${imgIds.length}枚あります。\n画像も一緒に書き出しますか？（ファイルが大きくなります）`)) {
        const images = {};
        for (const id of imgIds) {
          try {
            const d = await qImageCol(user.uid).doc(id).get();
            if (d.exists) images[id] = d.data();
          } catch (e) { console.warn("Image export:", id, e); }
        }
        exportData.images = images;
        imgNote = `\n（画像${Object.keys(images).length}枚を含みます）`;
      }
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `studyquest_backup_${todayStr()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert("✅ データをJSONファイルとして書き出しました。" + imgNote + "\nこのファイルを他の端末でインポートしてください。");
    } catch (e) {
      alert("書き出しに失敗しました: " + e.message);
    }
  };

  // JSONインポート（ファイルからデータを読み込み、Firestoreにも保存）
  const importJson = () => {
    if (!confirm("JSONファイルからデータを読み込みます。\n現在のデータは上書きされます。よろしいですか？")) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!parsed.mainState) { alert("不正なファイル形式です。"); return; }
        const merged = applyDefaults({ ...parsed.mainState, questionBanks: parsed.questionBanks || [] });
        setState(merged);
        setSyncStatus("syncing");
        alert("✅ データを読み込みました。\nFirestoreへの保存を開始します...");
        // バックアップに画像が含まれていれば、クラウドに書き戻す
        const imgEntries = parsed.images && typeof parsed.images === "object" ? Object.entries(parsed.images) : [];
        if (imgEntries.length > 0) {
          let restored = 0;
          for (const [id, data] of imgEntries) {
            try { await qImageCol(user.uid).doc(id).set(data); qImageCache.delete(id); restored++; }
            catch (err) { console.warn("Image import:", id, err); }
          }
          alert(`🖼 画像${restored}枚を復元しました。`);
        }
      } catch (e) {
        alert("読み込みに失敗しました: " + e.message);
      }
    };
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  };

  // このデータをクラウドに強制保存（他端末のデータを上書き）
  const forcePush = async () => {
    if (!confirm("この端末のデータをクラウドに強制保存します。\n他の端末のデータは上書きされます。よろしいですか？")) return;
    if (saveTimeout.current) { clearTimeout(saveTimeout.current); saveTimeout.current = null; }
    // Firebase接続を一度リセットして再接続
    try { await fbDb.enableNetwork(); } catch (_) {};
    setSyncStatus("syncing");
    isSaving.current = true;
    try {
      const ref = fbDb.collection("userdata").doc(user.uid);
      const banksRef = ref.collection("questionbanks");
      const { questionBanks, ...mainState } = state;
      const { _localVersion, ...cleanState } = mainState;
      // studyLog異常値（6時間=360分超）を除去してから保存
      const cleanedState = { ...cleanState, studyLog: (cleanState.studyLog || []).filter((l) => typeof l.minutes === "number" && l.minutes > 0 && l.minutes <= 360) };

      // ① メインドキュメントを保存
      await Promise.race([
        ref.set({
          state: { ...cleanedState, questionBanks: [] },
          updatedAt: fbFieldValue.serverTimestamp(),
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("タイムアウト（30秒）")), 30000)),
      ]);

      // ② バンクを分割して保存（500件ずつ。existingSnapの取得を省略して高速化）
      const CHUNK = 400;
      for (let i = 0; i < questionBanks.length; i += CHUNK) {
        const chunk = questionBanks.slice(i, i + CHUNK);
        const batch = fbDb.batch();
        chunk.forEach((b) => batch.set(banksRef.doc(b.id), b));
        await Promise.race([
          batch.commit(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("バンク保存タイムアウト")), 30000)),
        ]);
      }

      lastSavedBanks.current = [...questionBanks];  // 差分保存スナップショットを更新
      lastSavedMainHash.current = null;               // メインhashもリセット
      lastSaveTime.current = Date.now();
      setSyncStatus("synced");
      alert(`✅ 保存完了！\n${questionBanks.length}件の問題集を保存しました。\n他の端末でログアウト→ログインしてください。`);
    } catch (e) {
      console.error("Force push error:", e);
      setSyncStatus("error");
      alert("保存に失敗しました: " + e.message + "\nネットワーク状態を確認して再度お試しください。");
    } finally {
      isSaving.current = false;
    }
  };

  // クラウドから強制再読み込み（手動同期）
  const forceSync = async () => {
    if (!confirm("クラウドから最新データを強制的に読み込みます。\nこの端末のデータはクラウドのデータで上書きされます。よろしいですか？")) return;
    // 保存待ちをキャンセル
    if (saveTimeout.current) { clearTimeout(saveTimeout.current); saveTimeout.current = null; }
    // Firebase接続を一度リセットして再接続
    try { await fbDb.enableNetwork(); } catch (_) {};
    setSyncStatus("syncing");
    try {
      const ref = fbDb.collection("userdata").doc(user.uid);
      const banksRef = ref.collection("questionbanks");
      const [snap, banksSnap] = await Promise.all([ref.get(), banksRef.get()]);
      const cloudBanks = banksSnap.docs.map((d) => d.data());
      const cloud = snap.data()?.state || {};
      const { _localVersion, ...cleanCloud } = cloud;
      const merged = applyDefaults({ ...cleanCloud, questionBanks: cloudBanks });
      // skipNextSaveを設定しない → 読み込んだデータをすぐFirestoreにも保存して確定させる
      setState(merged);
      setSyncStatus("synced");
      alert("✅ クラウドから最新データを読み込みました\nこのデータをFirestoreに保存しています...");
    } catch (e) {
      console.error("Force sync error:", e);
      setSyncStatus("error");
      alert("読み込みに失敗しました。ネットワークを確認してください。\n" + e.message);
    }
  };

  const logout = async () => {
    if (!confirm("ログアウトしますか？\n（次回ログイン時にデータは復元されます）")) return;
    try { await fbAuth.signOut(); } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (!loaded) return;
    if (state.timer.startMs && (Date.now() - state.timer.startMs) > MAX_TIMER_MS) {
      setState((s) => ({ ...s, timer: { qualId: null, startMs: null, autoMode: null } }));
    }
  }, [loaded]);

  // テーマ（読み込み前は端末に保存した設定を使う）
  syncFolderIndex(state); // 科目（地域）の判定にフォルダ名を使うため
  const themeNow = loaded ? ((state.displaySettings && state.displaySettings.theme) || "white") : readPref("sq-theme", "white");
  const classic = themeNow === "classic";
  const isWhite = themeNow === "white";
  const fancy = classic || isWhite; // 新しいデザイン（白金・クラシック）
  const PAL = THEME_PAL[isWhite ? "white" : "classic"];
  const showTitleNow = fancy && titleOpen && (loaded ? !(state.displaySettings && state.displaySettings.showTitle === false) : true);

  if (!loaded) {
    if (showTitleNow) return <><ClassicThemeStyle theme={themeNow} /><TitleScreen loading={true} theme={themeNow} /></>;
    return <div className="min-h-screen flex items-center justify-center jp" style={{color: "var(--sky-deep)"}}>
      <ClassicThemeStyle theme={themeNow} />
      <div className="text-center">
        <div className="pixel text-sm mb-2">SYNCING...</div>
        <div className="jp text-xs" style={{ color: "var(--ink-soft)" }}>クラウドからデータを読み込んでいます</div>
      </div>
    </div>;
  }

  const player = state.player;
  const xpNeeded = getXpForNextLevel(player.level);
  const xpPercent = Math.min((player.xp / xpNeeded) * 100, 100);
  const rawLiveSeconds = state.timer.startMs ? Math.max(0, (now - state.timer.startMs) / 1000) : 0; // 開始直後に負の値にならないように
  const liveSeconds = rawLiveSeconds > (MAX_TIMER_MS / 1000) ? 0 : rawLiveSeconds;
  const mainAch = player.mainTitleId ? player.achievements.find((a) => a.id === player.mainTitleId) : null;
  const displayTitle = mainAch ? mainAch.title : getLevelTitle(player.level);
  const displayJob = mainAch ? mainAch.job : null;
  const displayIcon = mainAch ? mainAch.icon : "🧙";

  const qImageCtx = { uid: user.uid, updateQuestionImages, banks: state.questionBanks };
  // ホームのメニュー（コマンド・道しるべ）から各画面へ
  const homeCommand = (id) => {
    if (id === "law") setShowLawSearch(true);
    else if (id === "option") setShowDisplaySettings(true);
    else setTab(id);
    window.scrollTo(0, 0);
  };
  reviewLogUid = user.uid; // 回答履歴の保存先

  return (
    <QImageContext.Provider value={qImageCtx}>
    <div className="min-h-screen w-full pb-24 relative overflow-hidden">
      <ClassicThemeStyle theme={themeNow} />
      {showTitleNow && (
        <TitleScreen
          loading={false}
          theme={themeNow}
          saveInfo={`${(RPG_SCENES[getCharacterTier(player.level)] || RPG_SCENES.tier1).name}　Lv${player.level}　${displayTitle}　連続${calculateStatus(state).currentStreak}日`}
          onContinue={() => setTitleOpen(false)}
          onSettings={() => { setTitleOpen(false); setShowDisplaySettings(true); }}
          onLogout={logout}
        />
      )}
      <DecorSwirls />

      <div className={`${fancy ? "max-w-5xl" : "max-w-3xl"} mx-auto px-3 md:px-6 pt-4 relative z-10`}>
        {fancy ? (
          <div className="text-center mb-2">
            <div className="text-[11px]" style={{ ...PAL.mincho, fontWeight: 700, letterSpacing: "0.35em" }}>学びの冒険</div>
            <h1 className="m-0 text-[26px] md:text-[32px]" style={{ ...PAL.logo, lineHeight: 1.1, letterSpacing: "0.04em" }}>STUDY QUEST</h1>
          </div>
        ) : (
          <div className="text-center mb-2">
            <h1 className="pixel text-base md:text-2xl" style={{ color: "var(--sky-deep)", textShadow: "1px 1px 0 var(--ink), 3px 3px 0 rgba(53,65,86,0.16)" }}>STUDY QUEST</h1>
            <p className="jp text-xs mt-1" style={{ color: "var(--ink-soft)" }}>～ 学びの冒険 ～</p>
          </div>
        )}

        {/* Sync + user bar */}
        <div className="flex flex-wrap items-center justify-between gap-y-1.5 mb-3 jp text-[10px]" style={{ color: "var(--ink-soft)" }}>
          <div className="flex flex-wrap items-center gap-1">
            <span className={`sync-dot ${syncStatus}`}></span>
            <span className="whitespace-nowrap">
              {syncStatus === "synced" && "同期済み"}
              {syncStatus === "syncing" && "同期中..."}
              {syncStatus === "offline" && "オフライン"}
              {syncStatus === "error" && (cloudLoadFailed.current ? "読込失敗・保存停止中（再読込してください）" : "同期エラー")}
            </span>
            <button onClick={forcePush} title="このデータをクラウドに強制保存" className="sq-tool ml-1 px-1.5 py-0.5 text-[10px] whitespace-nowrap" style={{ background: "var(--gold)", border: "none", color: "var(--paper)", cursor: "pointer" }}><Ico ch="📤" size={12} /> 保存</button>
            <button onClick={forceSync} title="クラウドから強制再読み込み" className="sq-tool px-1.5 py-0.5 text-[10px] whitespace-nowrap" style={{ background: "var(--sky-pale)", border: "1px solid var(--sky-deep)", color: "var(--sky-deep)", cursor: "pointer" }}><Ico ch="📥" size={12} /> 読込</button>
            <button onClick={exportJson} title="データをJSONファイルに書き出し（端末間移行用）" className="sq-tool px-1.5 py-0.5 text-[10px] whitespace-nowrap" style={{ background: "var(--sage)", border: "none", color: "var(--paper)", cursor: "pointer" }}><Ico ch="📦" size={12} /> 書出</button>
            <button onClick={importJson} title="JSONファイルからデータを読み込み" className="sq-tool px-1.5 py-0.5 text-[10px] whitespace-nowrap" style={{ background: "var(--ink-soft)", border: "none", color: "var(--paper)", cursor: "pointer" }}><Ico ch="📂" size={12} /> 読込</button>
            <button onClick={() => setShowDisplaySettings(!showDisplaySettings)} title="問題文のフォント・文字サイズ" className={`sq-tool${showDisplaySettings ? " on" : ""} px-1.5 py-0.5 text-[10px] whitespace-nowrap`} style={{ background: showDisplaySettings ? "var(--sky-deep)" : "var(--paper)", border: "1px solid var(--sky-deep)", color: showDisplaySettings ? "var(--paper)" : "var(--sky-deep)", cursor: "pointer" }}>Aa 文字</button>
            <button onClick={() => setShowLawSearch(!showLawSearch)} title="条文・キーワード検索" className={`sq-tool${showLawSearch ? " on" : ""} px-1.5 py-0.5 text-[10px] whitespace-nowrap`} style={{ background: showLawSearch ? "var(--gold)" : "var(--paper)", border: "1px solid var(--gold)", color: showLawSearch ? "var(--paper)" : "var(--gold)", cursor: "pointer" }}><Ico ch="📜" size={12} /> 条文</button>
          </div>
          <div className="flex items-center gap-2">
            <span className="truncate max-w-[140px] md:max-w-[240px]">{user.email}</span>
            <button onClick={logout} className="jp btn-ghost sq-tool px-2 py-1 text-[10px] whitespace-nowrap">
              <LogoutIcon size={10} /> ログアウト
            </button>
          </div>
        </div>

        <QTextStyle settings={state.displaySettings} />
        {showDisplaySettings && <DisplaySettingsPanel settings={state.displaySettings} onChange={updateDisplaySettings} onClose={() => setShowDisplaySettings(false)} uid={user.uid} />}
        {showLawSearch && <LawSearchPanel banks={state.questionBanks} onClose={() => setShowLawSearch(false)} />}

        {fancy && <ClassicInfoBar theme={themeNow} state={state} liveSeconds={liveSeconds} onStatus={() => setTab("status")} />}
        {/* Status bar */}
        {!fancy && <div className="rpg-box mb-4 p-1">
          <div className="rpg-inner-border">
            <div className="flex items-center gap-3">
              <button onClick={() => setTab("status")} className="flex-shrink-0" title="ステータス画面へ" style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer" }}>
                <CharacterDisplay level={player.level} job={displayJob} icon={displayIcon} size={48} showAura={true} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="jp text-sm md:text-base" style={{ color: "var(--ink)" }}>{displayTitle}</span>
                  {displayJob && <span className="jp text-[10px] px-1.5" style={{ background: "var(--sky-deep)", color: "var(--paper)" }}>{displayJob}</span>}
                  <span className="pixel text-xs" style={{ color: "var(--gold)" }}>Lv.{player.level}</span>
                </div>
                <div className="mt-1 h-3 border relative overflow-hidden" style={{ background: "var(--sky-pale)", borderColor: "var(--rule)" }}>
                  <div className="h-full xp-shimmer transition-all duration-500" style={{ width: `${xpPercent}%` }} />
                </div>
                <div className="pixel text-[10px] mt-0.5" style={{ color: "var(--ink-soft)" }}>{player.xp} / {xpNeeded} EXP <span style={{ color: "var(--gold)" }}>💰{normRpg(state.rpg).gold.toLocaleString()}G</span></div>
              </div>
              {state.timer.startMs && (
                <div className="text-right">
                  <div className="pixel text-[10px] blink" style={{ color: "var(--brick)" }}>⏱ 学習中</div>
                  <div className="pixel text-xs" style={{ color: "var(--sky-deep)" }}>{fmtSec(liveSeconds)}</div>
                </div>
              )}
            </div>
          </div>
        </div>}

        <div className="mb-4">
          {tab === "home" && (() => {
            // ホームの並べ替え・非表示（設定の「ホームの表示」）。今日の道しるべと今日のクエストが隣り合うときは、PCでは横に並べる
            const HL = homeLayoutOf(state);
            const vis = HL.order.filter((id) => !HL.hidden.has(id));
            const dash = (part) => <HomeDashboard key={part} part={part} state={state} actions={rpgActions} todayCount={getTodayReviewItems().length} liveSeconds={liveSeconds} onGo={(t) => setTab(t)} planActions={planActions} onQuick={() => { const list = forgettingItems(state, 3); if (list.length) { setQuickPreset(list); setTab("today"); } }} />;
            const out = [];
            for (let i = 0; i < vis.length; i++) {
              const id = vis[i];
              if (id === "top") out.push(classic ? <MenuHome key="top" state={state} todayCount={getTodayReviewItems().length} onCommand={homeCommand} /> : isWhite ? <SignpostHome key="top" state={state} todayCount={getTodayReviewItems().length} onCommand={homeCommand} /> : null);
              else if (id === "guide" && vis[i + 1] === "quest") { out.push(dash("guide+quest")); i++; }
              else if (id === "quest" && vis[i + 1] === "guide") { out.push(<div key="qg" className="grid gap-3 md:grid-cols-2 items-start mb-4">{dash("quest")}{dash("guide")}</div>); i++; }
              else if (id === "events" || id === "guide" || id === "quest") out.push(dash(id));
              else if (id === "quals") out.push(<div key="quals"><HomeTab state={state} liveSeconds={liveSeconds} setMainTitle={setMainTitle} setTab={setTab} todayCount={getTodayReviewItems().length} hideBanner dashboard /></div>);
            }
            return out;
          })()}
          {tab === "today" && <TodayTab state={state} recordSRAnswer={recordSRAnswer} updateSrSettings={updateSrSettings} startTimer={startTimer} stopTimer={stopTimer} toggleQuestionMark={toggleQuestionMark} rpgActionsForPairs={rpgActions} preset={quickPreset} onPresetUsed={() => setQuickPreset(null)} planActions={planActions} />}
          {tab === "status" && <StatusTab state={state} setMainTitle={setMainTitle} uid={user.uid} />}
          {tab === "adventure" && <AdventureTab state={state} actions={rpgActions} recordAnswer={recordAnswer} startTimer={startTimer} stopTimer={stopTimer} todayCount={getTodayReviewItems().length} />}
          {NOTE_TABS.includes(tab) && (
            <div className="grid grid-cols-4 gap-1 p-1 mb-3" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 999 }}>
              {[["task", "タスク"], ["timer", "時間"], ["memo", "メモ"], ["qual", "資格"]].map(([id, label]) => (
                <button key={id} onClick={() => { lastNoteTab.current = id; setTab(id); }} className="jp py-1.5 text-xs" style={{ borderRadius: 999, border: "none", fontWeight: 700, cursor: "pointer", background: tab === id ? "linear-gradient(180deg, #cfae62, #a8833a)" : "transparent", color: tab === id ? "#fffdf6" : "var(--ink-soft)" }}>{label}</button>
              ))}
            </div>
          )}
          {tab === "qual" && <QualTab state={state} addQual={addQual} updateQual={updateQual} deleteQual={deleteQual} acquireQual={acquireQual} />}
          {tab === "task" && <TaskTab state={state} addTask={addTask} completeTask={completeTask} deleteTask={deleteTask} addPreset={addPreset} deletePreset={deletePreset} updatePreset={updatePreset} />}
          {tab === "timer" && <TimerTab state={state} liveSeconds={liveSeconds} startTimer={startTimer} stopTimer={stopTimer} cancelTimer={cancelTimer} addManualLog={addManualLog} deleteLog={deleteLog} focusActions={focusActions} />}
          {tab === "memo" && <MemoTab state={state} addStudyNote={addStudyNote} updateStudyNote={updateStudyNote} deleteStudyNote={deleteStudyNote} addFolder={addFolder} deleteFolder={deleteFolder} renameFolder={renameFolder} reorderFolders={reorderFolders} />}
          {tab === "laps" && <LapRoom state={state} actions={planActions} />}
          {tab === "qbank" && <QBankTab openBankReq={openBankReq} onOpenedBank={() => setOpenBankReq(null)} onPlanWeakDone={(id) => markPlanBank(id, true)} state={state} addBank={addQuestionBank} deleteBank={deleteBank} recordAnswer={recordAnswer} recordRevengeAnswer={recordRevengeAnswer} awardXp={awardXp} startTimer={startTimer} stopTimer={stopTimer} incrementBankClears={incrementBankClears} updateBestStreak={updateBestStreak} moveBank={moveBank} addCloze={addCloze} deleteCloze={deleteCloze} recordClozeAnswer={recordClozeAnswer} recordClozeRevengeAnswer={recordClozeRevengeAnswer} toggleQuestionMark={toggleQuestionMark} toggleClozeMark={toggleClozeMark} recordClearSnapshot={recordClearSnapshot} createClozeBank={createClozeBank} updateQuestionFormats={updateQuestionFormats} addQuestionToBank={addQuestionToBank} editQuestion={editQuestion} deleteQuestion={deleteQuestion} moveQuestions={moveQuestions} editBankMeta={editBankMeta} addFolder={addFolder} deleteFolder={deleteFolder} renameFolder={renameFolder} reorderFolders={reorderFolders} addStudyNote={addStudyNote} updateStudyNote={updateStudyNote} deleteStudyNote={deleteStudyNote} moveBankToFolder={moveBankToFolder} saveSessionResume={saveSessionResume} clearSessionResume={clearSessionResume} editBankClears={editBankClears} updateQuestionMemo={updateQuestionMemo} toggleQuestionExclude={toggleQuestionExclude} />}
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40" style={{ background: classic ? "linear-gradient(180deg, rgba(39,63,120,0.97), rgba(23,37,72,0.98))" : isWhite ? "linear-gradient(180deg, rgba(253,251,245,0.97), rgba(246,240,226,0.98))" : "var(--paper)", borderTop: isWhite ? "1px solid #b08a3e" : "2px solid var(--rule)", boxShadow: classic ? "inset 0 2px 0 #0a1226, inset 0 3px 0 rgba(160,185,215,0.5)" : isWhite ? "inset 0 3px 0 #fdfbf5, inset 0 4px 0 rgba(176,138,62,0.45), 0 -4px 14px rgba(40,50,80,0.08)" : "none", paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="max-w-3xl mx-auto grid grid-cols-7">
          {[
            { id: "home",   label: "ホーム",     icon: <Home size={18} /> },
            { id: "today",  label: "今日",        icon: <Calendar size={18} /> },
            { id: "qbank",  label: "問題",        icon: <FileQuestion size={18} /> },
            { id: "laps",   label: "周回の部屋",  icon: <Shuffle size={18} /> }, // 学習計画・今日のタスク・周回の記録
            { id: "adventure", label: "冒険",     icon: <Castle size={18} /> },
            { id: "status", label: "ステータス",  icon: <StatusIcon size={18} /> },
            { id: "notebook", label: "手帳",      icon: <Bookmark size={18} /> }, // 資格・タスク・時間・メモをまとめたタブ
          ].map((t) => {
            const badge = t.id === "today" ? getTodayReviewItems().length : t.id === "laps" ? (state.studyPlans || []).filter((p) => !p.finishedAt).reduce((a, p) => a + planToday(p).pending.length, 0) : 0;
            const on = t.id === "notebook" ? NOTE_TABS.includes(tab) : tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id === "notebook" ? lastNoteTab.current : t.id)} className="jp flex flex-col items-center gap-0.5 py-2 transition relative"
                style={on ? (classic ? { ...CL.rowOn, color: "#ffffff" } : isWhite ? { ...THEME_PAL.white.rowOn, color: "#22335c" } : { background: "var(--sky-deep)", color: "var(--paper)" }) : { background: "transparent", color: "var(--ink)" }}>
                {t.icon}
                <span className="text-[10px] md:text-[11px]" style={{ whiteSpace: "nowrap" }}>{t.label}</span>
                {badge > 0 && (
                  <span className="absolute top-1 right-2 pixel text-[9px] px-1 min-w-[16px] text-center" style={{ background: "var(--brick)", color: "var(--paper)", borderRadius: "2px", lineHeight: "14px" }}>{badge}</span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {floatXp.map((f) => (
        <div key={f.id} className="float-xp pixel fixed left-1/2 top-1/3 z-50 text-2xl md:text-3xl pointer-events-none" style={{ color: "var(--sky-deep)", textShadow: "2px 2px 0 var(--paper)", textAlign: "center" }}>{f.crit && <div className="text-sm" style={{ color: "var(--brick)" }}>💥 会心の一撃！</div>}+{f.amount} EXP!{f.gold ? <div className="text-xs" style={{ color: "var(--gold)" }}>+{f.gold} G</div> : null}</div>
      ))}

      {rpgToast && (
        <div key={rpgToast.id} className="milestone-toast fixed left-1/2 top-20 z-50 pointer-events-none jp text-sm px-3 py-2" style={{ background: "var(--paper)", border: `2px solid ${rpgToast.color || "var(--gold)"}`, color: "var(--ink)", boxShadow: "2px 2px 0 rgba(0,0,0,0.15)", whiteSpace: "nowrap" }}>{rpgToast.text}</div>
      )}

      {lapStamp && !showTitleNow && <LapStampScene key={lapStamp.id} ev={lapStamp} onClose={() => setLapStamp(null)} />}
      {evolution && !showTitleNow && <EvolutionScene key={evolution.id} ev={evolution} onClose={() => { const t = evolution.afterTalk; setEvolution((e) => (e && e.id === evolution.id ? null : e)); if (t) setTalk(t); }} />}
      {loaded && !showTitleNow && !evolution && !talk && ((normRpg(state.rpg).login || {}).last !== todayStr()) && <LoginBonus state={state} onClaim={rpgActions.claimLogin} />}
      {talk && !showTitleNow && !evolution && <StoryTalk key={talk.id} state={state} talk={talk} onClose={() => setTalkQ((q) => q.slice(1))} />}

      {rpgEvent && (
        <div key={rpgEvent.id} className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
          <div className="absolute inset-0" style={{ background: "rgba(214,168,78,0.12)" }} />
          <div className="level-up-anim absolute left-1/2 top-1/2 text-center" style={{ transform: "translate(-50%, -50%)" }}>
            <div className="rpg-box p-1 inline-block">
              <div className="rpg-inner-border px-6 py-5 md:px-10 md:py-7" style={{ minWidth: "260px" }}>
                <div className="text-center text-4xl md:text-5xl mb-2" style={{ color: "#d6a84e", textShadow: "0 0 8px rgba(255,215,94,0.9)" }}>{rpgEvent.icon}</div>
                <div className="jp text-base md:text-xl mb-1" style={{ color: "var(--ink)", fontWeight: "bold" }}>{rpgEvent.title}</div>
                {rpgEvent.sub && <div className="jp text-xs" style={{ color: "var(--ink-soft)" }}>{rpgEvent.sub}</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {showLevelUp && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
          <div className="absolute inset-0" style={{ background: "rgba(126,182,214,0.12)" }} />
          <div className="level-up-anim absolute left-1/2 top-1/2 text-center" style={{ transform: "translate(-50%, -50%)" }}>
            <div className="rpg-box p-1 inline-block">
              <div className="rpg-inner-border px-6 py-4 md:px-8 md:py-6">
                <div className="text-center mb-2"><Sparkles size={36} /></div>
                <div className="pixel text-xl md:text-3xl mb-2" style={{ color: "var(--sky-deep)", textShadow: "2px 2px 0 var(--paper)" }}>LEVEL UP!</div>
                <div className="jp text-sm md:text-lg" style={{ color: "var(--ink)" }}>Lv.{showLevelUp.level} <span style={{ color: "var(--gold)" }}>{showLevelUp.title}</span></div>
                {showLevelUp.tierChanged && (
                  <div className="mt-3 pt-3" style={{ borderTop: "1px dashed var(--rule-soft)" }}>
                    <div className="pixel text-sm md:text-base mb-2" style={{ color: "var(--gold)", textShadow: "1px 1px 0 var(--paper)" }}>⚔ 装備が進化した！</div>
                    <div className="equip-anim inline-block">
                      <CharacterDisplay level={showLevelUp.level} job="" icon="" size={90} showAura={true} />
                    </div>
                    <div className="jp text-xs mt-1" style={{ color: "var(--brick)" }}>{getTierLabel(showLevelUp.newTier)}級に到達</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showAchievement && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
          <div className="absolute inset-0" style={{ background: "rgba(109,132,84,0.10)" }} />
          <div className="level-up-anim absolute left-1/2 top-1/2 text-center" style={{ transform: "translate(-50%, -50%)" }}>
            <div className="rpg-box p-1 inline-block">
              <div className="rpg-inner-border px-6 py-5 md:px-10 md:py-7" style={{ minWidth: "260px" }}>
                <div className="text-center text-4xl md:text-5xl mb-2">{showAchievement.icon}</div>
                <div className="pixel text-base md:text-xl mb-2" style={{ color: "var(--sky-deep)", textShadow: "1px 1px 0 var(--paper)" }}>⭐ 称号獲得！</div>
                <div className="jp text-base md:text-xl mb-1" style={{ color: "var(--ink)", fontWeight: "bold" }}>{showAchievement.title}</div>
                {showAchievement.job && (<div className="jp text-xs" style={{ color: "var(--ink-soft)" }}>ジョブ: {showAchievement.job}</div>)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </QImageContext.Provider>
  );
}

function applyDefaults(s) {
  let merged = {
    ...INIT, ...s,
    player: { ...INIT.player, ...(s.player || {}) },
    qualifications: s.qualifications || [],
    tasks: s.tasks || [],
    taskPresets: s.taskPresets || [],
    taskClears: s.taskClears || {},
    studyPlans: Array.isArray(s.studyPlans) ? s.studyPlans : [],
    studyLog: (s.studyLog || []).filter((l) => typeof l.minutes === "number" && l.minutes > 0 && l.minutes <= 360),
    folders: (s.folders || []).map((f, i) => ({ ...f, order: typeof f.order === "number" ? f.order : i })),
    sessionResume: s.sessionResume || null,
    srSettings: { ...SR_DEFAULTS, ...(s.srSettings || {}) },
    displaySettings: migrateDisplay({ ...DISPLAY_DEFAULTS, ...(s.displaySettings || {}) }),
    rpg: normRpg(s.rpg),
    questionBanks: (s.questionBanks || []).map((b, i) => ({
      ...b,
      clears: b.clears || 0,
      order: typeof b.order === "number" ? b.order : i,
      folderId: b.folderId || null,
      clearHistory: Array.isArray(b.clearHistory) ? b.clearHistory : [],
      questions: (b.questions || []).map((q) => ({
        ...q,
        marked: typeof q.marked === "boolean" ? q.marked : false,
        q_formats: Array.isArray(q.q_formats) ? q.q_formats : [],
        a_formats: Array.isArray(q.a_formats) ? q.a_formats : [],
        sr_nextReview: q.sr_nextReview || null,   // "YYYY-MM-DD" | null
        sr_interval: q.sr_interval || 0,           // days until next review
        sr_streak: q.sr_streak || 0,               // consecutive correct count
        memo: q.memo || "",                             // 問題メモ
        excluded: q.excluded || false,                    // 習得済み除外フラグ
        clozes: Array.isArray(q.clozes) ? q.clozes.map((c) => ({
          ...c,
          correct: c.correct || 0,
          wrong: c.wrong || 0,
          marked: typeof c.marked === "boolean" ? c.marked : false,
          sr_nextReview: c.sr_nextReview || null,
          sr_interval: c.sr_interval || 0,
          sr_streak: c.sr_streak || 0,
        })) : [],
      })),
    })),
    timer: s.timer || { qualId: null, startMs: null, autoMode: null },
  };
  if (!merged.player.seededProfile) {
    merged.player.achievements = [...SEED_ACHIEVEMENTS, ...(merged.player.achievements || [])];
    merged.player.mainTitleId = "seed-surveyor";
    merged.player.seededProfile = true;
  }
  return merged;
}

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

// ── データの健康診断：クラウドの保存の上限（1つ1MB）に近い問題集・学習記録、二重登録、空の問題を点検する（読むだけで変えない） ──
const DOC_LIMIT = 1048576;
const byteLen = (v) => { try { return new TextEncoder().encode(JSON.stringify(v)).length; } catch (e) { return JSON.stringify(v).length * 3; } };
const healthCache = new WeakMap();
function healthReport(state) {
  const c = healthCache.get(state.questionBanks);
  if (c && c.main === state.rpg && c.log === state.studyLog) return c.res;
  const { questionBanks, ...mainState } = state;
  const level = (n) => (n >= DOC_LIMIT * 0.9 ? "danger" : n >= DOC_LIMIT * 0.7 ? "warn" : "ok");
  const banks = questionBanks.map((b) => { const n = byteLen(b); return { b, bytes: n, level: level(n) }; }).sort((a, b) => b.bytes - a.bytes);
  const mainBytes = byteLen(mainState);
  const norm = (t) => String(t || "").replace(/\s+/g, "").replace(/[。．.、，,]/g, "");
  const seen = new Map();
  const empties = [];
  questionBanks.forEach((b) => (b.questions || []).forEach((q, i) => {
    if (!String(q.q || "").trim() || !String(q.a || "").trim()) empties.push({ b, i, which: !String(q.q || "").trim() ? "問題文" : "答え" });
    const k = norm(q.q);
    if (k.length < 6) return;
    if (!seen.has(k)) seen.set(k, []);
    seen.get(k).push({ b, i, q });
  }));
  const dups = [...seen.values()].filter((l) => l.length > 1);
  const res = { banks, mainBytes, mainLevel: level(mainBytes), dups, empties, danger: banks.filter((x) => x.level === "danger").length + (level(mainBytes) === "danger" ? 1 : 0) };
  healthCache.set(state.questionBanks, { main: state.rpg, log: state.studyLog, res });
  return res;
}
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
// 問題タブの上の注意（保存の上限に近いものがあるときだけ）
function HealthWarning({ state }) {
  const h = healthReport(state);
  if (!h.danger) return null;
  const names = [...h.banks.filter((x) => x.level === "danger").map((x) => x.b.name), ...(h.mainLevel === "danger" ? ["学習記録の本体"] : [])];
  return <div className="jp text-xs px-3 py-2 mb-3" style={{ background: "rgba(201,86,78,0.08)", border: "1px solid #c9564e", borderRadius: 8, color: "#a03a33" }}><b>⚠ 保存の上限に近づいています：</b>{names.join("・")}。このままだとクラウドに保存できなくなるおそれがあります。問題集を2つに分けてください（ステータス画面の「データの健康診断」でくわしく見られます）。</div>;
}

// ── 学習記録の控え（自動バックアップ）：userdata/{uid}/backups/{日付} に、書出と同じ中身を小分けにして保存 ──
// ・7日ごとに自動（アプリを開いて20秒後）。新しい4回分を残す。読み込みに失敗しているとき（cloudLoadFailed）は取らない
// ・戻すときは「ファイルに書き出す」→ 画面上の「読込」でそのファイルを選ぶ（いつもの読み込みと同じ）
const BACKUP_KEEP = 4;
const BACKUP_CHUNK = 250000; // 1つの保存単位の文字数（日本語でも1MBの上限に収まる大きさ）
const backupCol = (uid) => fbDb.collection("userdata").doc(uid).collection("backups");
async function makeBackup(uid, state) {
  const { questionBanks, ...mainState } = state;
  const date = todayStr();
  const ref = backupCol(uid).doc(date);
  const pieces = [["main", JSON.stringify(mainState)], ...questionBanks.map((b) => [b.id, JSON.stringify(b)])];
  const old = await ref.collection("parts").get();
  for (const d of old.docs) await d.ref.delete();
  let n = 0;
  for (const [k, str] of pieces) for (let i = 0; i * BACKUP_CHUNK < str.length || i === 0; i++) { await ref.collection("parts").doc(`${n++}`).set({ k, i, s: str.slice(i * BACKUP_CHUNK, (i + 1) * BACKUP_CHUNK) }); }
  await ref.set({ createdAt: new Date().toISOString(), banks: questionBanks.map((b) => ({ id: b.id, name: b.name, n: (b.questions || []).length })), nQ: questionBanks.reduce((t, b) => t + (b.questions || []).length, 0), parts: n });
  // 古い控えを片付ける
  const all = (await backupCol(uid).get()).docs.map((d) => d.id).sort().reverse();
  for (const id of all.slice(BACKUP_KEEP)) {
    const r = backupCol(uid).doc(id);
    const ps = await r.collection("parts").get();
    for (const d of ps.docs) await d.ref.delete();
    await r.delete();
  }
  return date;
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

// ── 冒険の記録書：これまでの学び・冒険・鍛錬・仲間を、ページをめくる本の形で見せる ──
function longestStudyStreak(state) {
  const days = [...new Set(state.studyLog.map((l) => l.date).filter(Boolean))].sort();
  let best = 0, cur = 0, prev = null;
  days.forEach((d) => { cur = prev && addDays(prev, 1) === d ? cur + 1 : 1; best = Math.max(best, cur); prev = d; });
  return { best, days: days.length, first: days[0] || null };
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

function StatusTab({ state, setMainTitle, uid }) {
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

// ============ Home Tab ============
function HomeTab({ state, liveSeconds, setMainTitle, setTab, todayCount, hideBanner = false, dashboard = false }) {
  const today = todayStr();
  const todayMin = state.studyLog.filter((l) => l.date === today).reduce((a, b) => a + b.minutes, 0) + (state.timer.startMs ? liveSeconds / 60 : 0);
  const acquiredQuals = state.qualifications.filter((q) => q.acquired);
  const status = calculateStatus(state);

  return (
    <div className="space-y-4">

      {/* 今日の問題バナー */}
      {hideBanner ? null : todayCount > 0 ? (
        <button onClick={() => setTab("today")} className="w-full text-left" style={{ background: "linear-gradient(135deg, var(--sky-deep), var(--plum))", border: "none", padding: 0 }}>
          <div className="p-3 flex items-center gap-3">
            <div className="text-3xl">📅</div>
            <div className="flex-1">
              <div className="pixel text-sm" style={{ color: "var(--paper)" }}>今日の復習問題</div>
              <div className="pixel text-2xl font-bold" style={{ color: "var(--paper)" }}>{todayCount}<span className="text-base ml-1">問</span></div>
            </div>
            <div className="jp text-xs px-2 py-1" style={{ background: "rgba(255,255,255,0.2)", color: "var(--paper)" }}>タップして開始 →</div>
          </div>
        </button>
      ) : (
        <div className="p-3 flex items-center gap-3" style={{ background: "var(--sky-pale)", border: "1px solid var(--sky-deep)" }}>
          <div className="text-2xl">✅</div>
          <div className="jp text-sm" style={{ color: "var(--sky-deep)" }}>今日の復習は完了！また明日。</div>
        </div>
      )}

      {/* 試験日カウントダウン（新しいホームではダッシュボードに表示） */}
      {!dashboard && state.qualifications.filter((q) => !q.acquired && q.examDate).map((qual) => {
        const days = daysUntil(qual.examDate);
        if (days === null || days < 0) return null;
        const totalQ = state.questionBanks.filter((b) => b.qualId === qual.id).reduce((a, b) => a + b.questions.length, 0);
        const doneQ = state.questionBanks.filter((b) => b.qualId === qual.id).reduce((a, b) => a + b.questions.filter((q) => (q.sr_streak || 0) >= 2).length, 0);
        const perDay = days > 0 && totalQ > doneQ ? Math.ceil((totalQ - doneQ) / days) : 0;
        const urgentColor = days <= 7 ? "var(--brick)" : days <= 30 ? "#c07820" : "var(--sage)";
        return (
          <div key={qual.id} className="p-3" style={{ background: "var(--paper)", border: `2px solid ${urgentColor}` }}>
            <div className="flex justify-between items-start gap-2 flex-wrap">
              <div>
                <div className="jp text-xs mb-0.5" style={{ color: "var(--ink-soft)" }}>{qual.name}</div>
                <div className="pixel text-2xl font-bold" style={{ color: urgentColor }}>あと{days}日</div>
                <div className="jp text-[11px] mt-0.5" style={{ color: "var(--ink-soft)" }}>📅 {qual.examDate}</div>
              </div>
              <div className="text-right">
                <div className="jp text-[10px] mb-0.5" style={{ color: "var(--ink-soft)" }}>定着済み / 全問題</div>
                <div className="pixel text-base" style={{ color: urgentColor }}>{doneQ} / {totalQ}</div>
                {perDay > 0 && <div className="jp text-[10px] mt-0.5" style={{ color: "var(--ink-soft)" }}>1日約<span style={{ color: urgentColor, fontWeight: "bold" }}>{perDay}問</span>ペースで</div>}
              </div>
            </div>
          </div>
        );
      })}

      {!dashboard && <Box title="今日の冒険" icon={<Calendar size={18} />}>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="今日" value={fmtMin(todayMin)} accent="var(--sky-deep)" />
          <Stat label="連続学習" value={`${status.currentStreak}日`} accent="var(--sage)" />
          <Stat label="クエスト" value={state.player.totalCompleted} accent="var(--brick)" />
        </div>
      </Box>}

      {state.qualifications.filter((q) => !q.acquired).length > 0 && (
        <Box title="資格の進捗" icon={<Award size={18} />}>
          <div className="space-y-3">
            {state.qualifications.filter((q) => !q.acquired).map((q) => <QualProgressRow key={q.id} qual={q} state={state} />)}
          </div>
        </Box>
      )}

      {acquiredQuals.length > 0 && (
        <Box title="取得済み資格" icon={<Award size={18} />}>
          <div className="flex flex-wrap gap-2">
            {acquiredQuals.map((q) => (<span key={q.id} className="jp text-xs px-2 py-1" style={{ background: q.color, color: "var(--paper)", border: "1px solid var(--rule)" }}>✓ {q.name}</span>))}
          </div>
        </Box>
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

function QualProgressRow({ qual, state }) {
  const totalMin = state.studyLog.filter((l) => l.qualId === qual.id).reduce((a, b) => a + b.minutes, 0);
  const targetMin = qual.targetHours * 60;
  const pct = targetMin > 0 ? Math.min((totalMin / targetMin) * 100, 100) : 0;
  const days = daysUntil(qual.examDate);
  const remainMin = Math.max(targetMin - totalMin, 0);
  const requiredPerDay = days > 0 ? remainMin / days : 0;
  return (
    <div className="p-2" style={{ border: `1px solid ${qual.color}`, background: "var(--paper)" }}>
      <div className="flex justify-between items-baseline gap-2 mb-1">
        <span className="jp text-sm truncate" style={{ color: "var(--ink)" }}>{qual.name}</span>
        <span className="pixel text-[10px]" style={{ color: qual.color }}>{days !== null ? (days >= 0 ? `あと${days}日` : "試験終了") : "日付未設定"}</span>
      </div>
      <div className="h-2 mb-1 relative" style={{ background: "var(--sky-pale)", border: "1px solid var(--rule-soft)" }}>
        <div className="h-full transition-all" style={{ width: `${pct}%`, background: qual.color }} />
      </div>
      <div className="flex justify-between pixel text-[10px]" style={{ color: "var(--ink-soft)" }}>
        <span>{fmtMin(totalMin)} / {qual.targetHours}h</span>
        {requiredPerDay > 0 && days > 0 && <span>必要: {fmtMin(requiredPerDay)}/日</span>}
      </div>
    </div>
  );
}

// ============ Qualifications Tab ============
function QualTab({ state, addQual, updateQual, deleteQual, acquireQual }) {
  const [name, setName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [targetHours, setTargetHours] = useState("");
  const [editId, setEditId] = useState(null);
  const submit = () => {
    if (!name.trim()) return;
    if (editId) { updateQual(editId, { name: name.trim(), examDate, targetHours: Number(targetHours) || 0 }); setEditId(null); }
    else { addQual({ name: name.trim(), examDate, targetHours }); }
    setName(""); setExamDate(""); setTargetHours("");
  };
  const startEdit = (q) => { setEditId(q.id); setName(q.name); setExamDate(q.examDate || ""); setTargetHours(q.targetHours); };
  const cancelEdit = () => { setEditId(null); setName(""); setExamDate(""); setTargetHours(""); };

  return (
    <div className="space-y-4">
      <Box title={editId ? "資格を編集" : "資格を登録"} icon={<Award size={18} />}>
        <input className="rpg-input mb-2" placeholder="資格名（例: 簿記2級）" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="jp text-[10px] block mb-1" style={{ color: "var(--ink-soft)" }}>試験日</label>
            <input type="date" className="rpg-input" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          </div>
          <div>
            <label className="jp text-[10px] block mb-1" style={{ color: "var(--ink-soft)" }}>目標時間（h）</label>
            <input type="number" min="0" className="rpg-input" placeholder="100" value={targetHours} onChange={(e) => setTargetHours(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={submit} disabled={!name.trim()} className="jp btn-primary flex-1 py-2 flex items-center justify-center gap-1">
            <Plus size={16} /> {editId ? "更新" : "登録"}
          </button>
          {editId && <button onClick={cancelEdit} className="jp btn-ghost px-4 py-2">キャンセル</button>}
        </div>
      </Box>

      <Box title={`登録済み資格 (${state.qualifications.length})`} icon={<ScrollIcon size={18} />}>
        {state.qualifications.length === 0 ? <p className="jp text-sm text-center py-4" style={{ color: "var(--ink-mute)" }}>まだ資格は登録されていない</p> : (
          <div className="space-y-3">
            {state.qualifications.map((q) => (
              <QualDetailCard key={q.id} qual={q} state={state}
                onEdit={() => startEdit(q)}
                onDelete={() => { if (confirm(`「${q.name}」を削除しますか？関連する学習ログも削除されます。`)) deleteQual(q.id); }}
                onAcquire={() => { if (confirm(`「${q.name}」を取得済みにしますか？\n+${XP_QUAL_ACQUIRE} EXPと称号が贈られます。`)) acquireQual(q); }} />
            ))}
          </div>
        )}
      </Box>
    </div>
  );
}

function QualDetailCard({ qual, state, onEdit, onDelete, onAcquire }) {
  const totalMin = state.studyLog.filter((l) => l.qualId === qual.id).reduce((a, b) => a + b.minutes, 0);
  const targetMin = qual.targetHours * 60;
  const pct = targetMin > 0 ? Math.min((totalMin / targetMin) * 100, 100) : 0;
  const days = daysUntil(qual.examDate);
  const remainMin = Math.max(targetMin - totalMin, 0);
  const requiredPerDay = days > 0 ? remainMin / days : 0;
  const dates = [...new Set(state.studyLog.filter((l) => l.qualId === qual.id).map((l) => l.date))];
  const avgPerDay = dates.length > 0 ? totalMin / dates.length : 0;
  return (
    <div className="p-3" style={{ border: `1px solid ${qual.color}`, background: qual.acquired ? "var(--sky-pale)" : "var(--paper)" }}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="jp text-base flex-1" style={{ color: "var(--ink)" }}>
          {qual.acquired && <span className="text-xs mr-1">✓</span>}{qual.name}
          {qual.acquired && <span className="jp text-[10px] ml-2 px-1" style={{ background: "var(--sage)", color: "var(--paper)" }}>取得済</span>}
        </h3>
        <div className="flex gap-1">
          <button onClick={onEdit} className="p-1" style={{ color: "var(--slate)" }} title="編集"><Pencil size={14} /></button>
          <button onClick={onDelete} className="p-1" style={{ color: "var(--brick)" }} title="削除"><Trash2 size={14} /></button>
        </div>
      </div>
      <div className="h-3 mb-1 relative" style={{ background: "var(--sky-pale)", border: "1px solid var(--rule-soft)" }}>
        <div className="h-full transition-all" style={{ width: `${pct}%`, background: qual.color }} />
      </div>
      <div className="flex justify-between pixel text-[10px] mb-3" style={{ color: "var(--ink-soft)" }}>
        <span>{fmtMin(totalMin)} / {qual.targetHours}h ({pct.toFixed(0)}%)</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
        <Mini label="試験日" value={qual.examDate || "未設定"} />
        <Mini label="残り日数" value={days !== null ? (days >= 0 ? `${days}日` : "終了") : "—"} />
        <Mini label="必要/日" value={days > 0 ? fmtMin(requiredPerDay) : "—"} highlight={days > 0 && requiredPerDay > 0} />
        <Mini label="平均/日" value={avgPerDay > 0 ? fmtMin(avgPerDay) : "—"} />
      </div>
      {!qual.acquired && (
        <button onClick={onAcquire} className="jp btn-success w-full py-1.5 text-sm flex items-center justify-center gap-1">
          <Crown size={14} /> 取得済みにする (+{XP_QUAL_ACQUIRE} EXP + 称号)
        </button>
      )}
    </div>
  );
}

function Mini({ label, value, highlight }) {
  return (
    <div className="p-1.5" style={{ background: "var(--sky-pale)", border: highlight ? "1px solid var(--gold)" : "1px solid var(--rule-soft)" }}>
      <div className="jp text-[10px]" style={{ color: "var(--ink-soft)" }}>{label}</div>
      <div className="jp text-sm" style={{ color: highlight ? "var(--gold)" : "var(--ink)" }}>{value}</div>
    </div>
  );
}

// ============ Tasks Tab ============
function TaskTab({ state, addTask, completeTask, deleteTask, addPreset, deletePreset, updatePreset }) {
  const [mode, setMode] = useState("active");
  const [name, setName] = useState("");
  const [diff, setDiff] = useState("normal");
  const [qualId, setQualId] = useState("");
  const [editPresetId, setEditPresetId] = useState(null);
  const activeQuals = state.qualifications.filter((q) => !q.acquired);
  const addAsTask = () => { if (!name.trim()) return; addTask(name.trim(), diff, qualId || null); setName(""); };
  const saveAsPreset = () => {
    if (!name.trim()) return;
    if (editPresetId) { updatePreset(editPresetId, { name: name.trim(), difficulty: diff, qualId: qualId || null }); setEditPresetId(null); }
    else { addPreset({ name: name.trim(), difficulty: diff, qualId: qualId || null }); }
    setName(""); setDiff("normal"); setQualId("");
  };
  const startEditPreset = (p) => { setEditPresetId(p.id); setName(p.name); setDiff(p.difficulty); setQualId(p.qualId || ""); setMode("preset"); };
  const cancelEdit = () => { setEditPresetId(null); setName(""); setDiff("normal"); setQualId(""); };
  const useFromPreset = (p) => { addTask(p.name, p.difficulty, p.qualId || null, p.id); };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 p-1" style={{ background: "var(--paper)", border: "1px solid var(--rule)" }}>
        <button onClick={() => setMode("active")} className="jp py-2 text-sm transition" style={{ background: mode === "active" ? "var(--sky-deep)" : "transparent", color: mode === "active" ? "var(--paper)" : "var(--ink)" }}>⚔️ クエスト</button>
        <button onClick={() => setMode("preset")} className="jp py-2 text-sm transition" style={{ background: mode === "preset" ? "var(--sky-deep)" : "transparent", color: mode === "preset" ? "var(--paper)" : "var(--ink)" }}>🔖 プリセット ({state.taskPresets.length})</button>
      </div>

      {mode === "active" ? (
        <>
          {state.taskPresets.length > 0 && (
            <Box title="プリセットから追加" icon={<Bookmark size={18} />}>
              <p className="jp text-[11px] mb-2" style={{ color: "var(--ink-soft)" }}>タップでクエストに追加</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {state.taskPresets.map((p) => {
                  const d = DIFFICULTIES[p.difficulty];
                  const qual = state.qualifications.find((q) => q.id === p.qualId);
                  const clears = state.taskClears[p.id] || 0;
                  return (
                    <button key={p.id} onClick={() => useFromPreset(p)} className="jp text-left p-2 transition" style={{ background: "var(--paper)", border: `1px solid ${d.color}` }}>
                      <div className="flex items-center gap-2">
                        <GameIcon ch={d.icon} size={28} />
                        <span className="text-sm flex-1 break-words" style={{ color: "var(--ink)" }}>{p.name}</span>
                        {clears > 0 && <span className="pixel text-[10px] px-1" style={{ background: "var(--brick)", color: "var(--paper)" }}>×{clears}</span>}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="pixel text-[10px]" style={{ color: d.color }}>+{d.xp}EXP</span>
                        {qual && <span className="jp text-[10px] px-1" style={{ border: `1px solid ${qual.color}`, color: qual.color }}>{qual.name}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Box>
          )}

          <Box title="あたらしいクエスト" icon={<ScrollIcon size={18} />}>
            <input className="rpg-input mb-2" placeholder="例: 数学のドリル 10ページ" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addAsTask()} />
            {activeQuals.length > 0 && (
              <select className="rpg-input mb-2" value={qualId} onChange={(e) => setQualId(e.target.value)}>
                <option value="">— 資格に紐付けない —</option>
                {activeQuals.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
              </select>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
              {Object.entries(DIFFICULTIES).map(([k, d]) => (
                <button key={k} onClick={() => setDiff(k)} className="jp px-2 py-2 text-xs transition-all" style={{ background: diff === k ? d.color : "var(--paper)", color: diff === k ? "var(--paper)" : d.color, border: `1px solid ${d.color}`, fontWeight: diff === k ? "bold" : "normal" }}>
                  <div className="flex items-center justify-center gap-1"><GameIcon ch={d.icon} size={22} />{d.label}</div>
                  <div className="pixel text-[10px] mt-0.5">+{d.xp} EXP</div>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={addAsTask} disabled={!name.trim()} className="jp btn-primary py-2 flex items-center justify-center gap-1"><Plus size={14} /> 追加</button>
              <button onClick={saveAsPreset} disabled={!name.trim()} className="jp btn-sky py-2 flex items-center justify-center gap-1"><Bookmark size={14} /> プリセット保存</button>
            </div>
          </Box>

          <Box title={`クエスト一覧 (${state.tasks.length})`} icon={<Sword size={18} />}>
            {state.tasks.length === 0 ? (
              <div className="text-center py-6">
                <div className="text-3xl mb-1">📜</div>
                <p className="jp text-sm" style={{ color: "var(--ink-mute)" }}>クエストはまだない<span className="blink">▼</span></p>
              </div>
            ) : (
              <ul className="space-y-2">
                {state.tasks.map((t) => {
                  const d = DIFFICULTIES[t.difficulty];
                  const qual = state.qualifications.find((q) => q.id === t.qualId);
                  const key = t.presetId || `inline:${t.name}`;
                  const clears = state.taskClears[key] || 0;
                  return (
                    <li key={t.id} className="p-2 flex items-center gap-2" style={{ background: "var(--paper)", border: `1px solid ${d.color}` }}>
                      <GameIcon ch={d.icon} size={32} />
                      <div className="flex-1 min-w-0">
                        <div className="jp text-sm break-words" style={{ color: "var(--ink)" }}>
                          {t.name}
                          {clears > 0 && <span className="pixel text-[10px] ml-2 px-1" style={{ background: "var(--brick)", color: "var(--paper)" }}>周回×{clears}</span>}
                        </div>
                        <div className="flex flex-wrap items-center gap-1 mt-0.5">
                          <span className="jp text-[10px] px-1" style={{ background: d.color, color: "var(--paper)" }}>{d.label}</span>
                          <span className="pixel text-[10px]" style={{ color: d.color }}>+{d.xp}EXP</span>
                          {qual && <span className="jp text-[10px] px-1" style={{ border: `1px solid ${qual.color}`, color: qual.color }}>{qual.name}</span>}
                        </div>
                      </div>
                      <button onClick={() => completeTask(t)} title="完了" className="btn-success p-2"><Check size={16} /></button>
                      <button onClick={() => deleteTask(t.id)} title="削除" className="btn-ghost p-1.5" style={{ color: "var(--brick)" }}><Trash2 size={14} /></button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Box>

          <TaskStampBoard state={state} />
        </>
      ) : (
        <>
          <Box title={editPresetId ? "プリセットを編集" : "新規プリセット"} icon={<Bookmark size={18} />}>
            <p className="jp text-[11px] mb-2" style={{ color: "var(--ink-soft)" }}>よく使うタスクをここに保存。</p>
            <input className="rpg-input mb-2" placeholder="例: 過去問 1年分 / 単語帳 10ページ" value={name} onChange={(e) => setName(e.target.value)} />
            {activeQuals.length > 0 && (
              <select className="rpg-input mb-2" value={qualId} onChange={(e) => setQualId(e.target.value)}>
                <option value="">— 資格に紐付けない —</option>
                {activeQuals.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
              </select>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
              {Object.entries(DIFFICULTIES).map(([k, d]) => (
                <button key={k} onClick={() => setDiff(k)} className="jp px-2 py-2 text-xs" style={{ background: diff === k ? d.color : "var(--paper)", color: diff === k ? "var(--paper)" : d.color, border: `1px solid ${d.color}`, fontWeight: diff === k ? "bold" : "normal" }}>
                  <div className="flex items-center justify-center gap-1"><GameIcon ch={d.icon} size={22} />{d.label}</div>
                  <div className="pixel text-[10px] mt-0.5">+{d.xp} EXP</div>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={saveAsPreset} disabled={!name.trim()} className="jp btn-primary flex-1 py-2 flex items-center justify-center gap-1"><Plus size={14} /> {editPresetId ? "更新" : "プリセット保存"}</button>
              {editPresetId && <button onClick={cancelEdit} className="jp btn-ghost px-4 py-2">キャンセル</button>}
            </div>
          </Box>

          <Box title={`プリセット一覧 (${state.taskPresets.length})`} icon={<ScrollIcon size={18} />}>
            {state.taskPresets.length === 0 ? <p className="jp text-sm text-center py-4" style={{ color: "var(--ink-mute)" }}>まだプリセットはない</p> : (
              <ul className="space-y-2">
                {state.taskPresets.map((p) => {
                  const d = DIFFICULTIES[p.difficulty];
                  const qual = state.qualifications.find((q) => q.id === p.qualId);
                  const clears = state.taskClears[p.id] || 0;
                  return (
                    <li key={p.id} className="p-2" style={{ background: "var(--paper)", border: `1px solid ${d.color}` }}>
                      <div className="flex items-center gap-2">
                        <GameIcon ch={d.icon} size={32} />
                        <div className="flex-1 min-w-0">
                          <div className="jp text-sm break-words" style={{ color: "var(--ink)" }}>{p.name}</div>
                          <div className="flex flex-wrap items-center gap-1 mt-0.5">
                            <span className="jp text-[10px] px-1" style={{ background: d.color, color: "var(--paper)" }}>{d.label}</span>
                            <span className="pixel text-[10px]" style={{ color: d.color }}>+{d.xp}EXP</span>
                            {qual && <span className="jp text-[10px] px-1" style={{ border: `1px solid ${qual.color}`, color: qual.color }}>{qual.name}</span>}
                            <span className="pixel text-[10px] px-1" style={{ background: clears > 0 ? "var(--brick)" : "var(--rule-soft)", color: "var(--paper)" }}>周回 {clears}</span>
                          </div>
                        </div>
                        <button onClick={() => useFromPreset(p)} title="クエストに追加" className="btn-sky p-1.5"><Plus size={14} /></button>
                        <button onClick={() => startEditPreset(p)} title="編集" className="btn-ghost p-1.5" style={{ color: "var(--slate)" }}><Pencil size={14} /></button>
                        <button onClick={() => { if (confirm(`プリセット「${p.name}」を削除しますか？`)) deletePreset(p.id); }} title="削除" className="btn-ghost p-1.5" style={{ color: "var(--brick)" }}><Trash2 size={14} /></button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Box>
        </>
      )}
    </div>
  );
}

function TaskStampBoard({ state }) {
  const presetEntries = state.taskPresets.map((p) => ({ key: p.id, name: p.name, difficulty: p.difficulty, qualId: p.qualId, clears: state.taskClears[p.id] || 0 }));
  const inlineKeys = Object.keys(state.taskClears).filter((k) => k.startsWith("inline:"));
  const inlineEntries = inlineKeys.map((k) => ({ key: k, name: k.replace("inline:", ""), difficulty: "normal", qualId: null, clears: state.taskClears[k] || 0 }));
  const all = [...presetEntries, ...inlineEntries].filter((e) => e.clears > 0).sort((a, b) => b.clears - a.clears);
  if (all.length === 0) {
    return <Box title="周回スタンプ表" icon={<StarIcon size={18} />}><p className="jp text-sm text-center py-4" style={{ color: "var(--ink-mute)" }}>クエストを完了するとスタンプが押される</p></Box>;
  }
  return (
    <Box title="周回スタンプ表" icon={<StarIcon size={18} />}>
      <p className="jp text-[11px] mb-3" style={{ color: "var(--ink-soft)" }}>各タスクをクリアした回数。10回ごとに金、20回ごとに緑に進化。</p>
      <ul className="space-y-3">{all.map((e) => <StampRow key={e.key} entry={e} state={state} />)}</ul>
    </Box>
  );
}

function StampRow({ entry, state }) {
  const d = DIFFICULTIES[entry.difficulty];
  const qual = state.qualifications.find((q) => q.id === entry.qualId);
  const visible = Math.min(entry.clears, 20);
  const overflow = entry.clears - visible;
  const stampClass = (i) => i < 5 ? "stamp" : i < 10 ? "stamp gold" : "stamp sage";
  return (
    <li className="p-2" style={{ background: "var(--sky-pale)", border: "1px solid var(--rule-soft)" }}>
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <div className="flex items-baseline gap-2 min-w-0">
          <GameIcon ch={d.icon} size={22} />
          <span className="jp text-sm truncate" style={{ color: "var(--ink)" }}>{entry.name}</span>
          {qual && <span className="jp text-[10px] px-1 flex-shrink-0" style={{ border: `1px solid ${qual.color}`, color: qual.color }}>{qual.name}</span>}
        </div>
        <span className="pixel text-xs flex-shrink-0" style={{ color: "var(--brick)" }}>×{entry.clears}</span>
      </div>
      <div className="flex flex-wrap gap-1.5 items-center">
        {Array.from({ length: visible }).map((_, i) => <span key={i} className={stampClass(i)}>✓</span>)}
        {overflow > 0 && <span className="pixel text-xs ml-2" style={{ color: "var(--ink-soft)" }}>+{overflow}</span>}
      </div>
    </li>
  );
}

// ============ Timer Tab ============
// ── 集中タイマー：25分集中（学習時間として記録）→ 5分休憩 をくり返す。集中1回ごとに「集中の結晶」 ──
const FOCUS_MIN = 25, FOCUS_BREAK_MIN = 5;
// 区切りを知らせる音（タイマーとして必要なので、効果音の設定がオフでも鳴らす）。振動できる端末はふるわせる
function focusChime() {
  try {
    const C = window.AudioContext || window.webkitAudioContext;
    if (C) {
      const ac = SFX.ctx || (SFX.ctx = new C());
      if (ac.state === "suspended") ac.resume();
      [784, 988, 1319].forEach((f, i) => { const o = ac.createOscillator(), g = ac.createGain(), t0 = ac.currentTime + i * 0.18; o.type = "triangle"; o.frequency.value = f; g.gain.setValueAtTime(0.12, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5); o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + 0.55); });
    }
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  } catch (e) { /* 音が出せなくてもタイマーは続ける */ }
}
function FocusTimer({ state, actions }) {
  const r = normRpg(state.rpg);
  const fr = r.focusRun || null;
  const [, tick] = useState(0);
  useEffect(() => { if (!fr || fr.phase === "ready") return undefined; const iv = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(iv); }, [fr && fr.phase, fr && fr.endAt]);
  const f = r.focus || {};
  const todayN = f.day === todayStr() ? f.n || 0 : 0;
  const phase = fr ? fr.phase : "idle";
  const len = (phase === "break" ? FOCUS_BREAK_MIN : FOCUS_MIN) * 60000;
  const left = fr && fr.endAt ? Math.max(0, fr.endAt - Date.now()) : len;
  const prog = phase === "focus" || phase === "break" ? 1 - left / len : 0;
  const mm = `${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, "0")}`;
  const color = phase === "break" ? "#6d8454" : "#4f8eb3";
  const R = 54, CIRC = 2 * Math.PI * R;
  const pet = getPetInfo(state);
  const msg = phase === "focus" ? "集中しています。通知や他のことは、あとで大丈夫。" : phase === "break" ? "休憩中です。目を閉じたり、のびをしたりしましょう。" : phase === "ready" ? "休憩おわり！ 次の集中をはじめましょう。" : "25分集中して、5分休む。これをくり返すと、集中が長続きします。";
  return (
    <Box title="集中タイマー（25分＋5分休憩）" icon={<Clock size={18} />}>
      <div className="jp flex flex-col items-center gap-2">
        <div style={{ position: "relative", width: 140, height: 140 }}>
          <svg viewBox="0 0 140 140" width="140" height="140" aria-hidden="true">
            <circle cx="70" cy="70" r={R} fill="none" stroke="var(--beige)" strokeWidth="10" />
            <circle cx="70" cy="70" r={R} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - prog)} transform="rotate(-90 70 70)" style={{ transition: "stroke-dashoffset .9s linear" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div className="text-[10px]" style={{ color, fontWeight: 800 }}>{phase === "focus" ? "集中" : phase === "break" ? "休憩" : phase === "ready" ? "準備OK" : "はじめる前"}</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{phase === "ready" ? `${FOCUS_MIN}:00` : mm}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pet && pet.type.art && pet.stage > 0 && <PetIcon pet={pet} size={34} />}
          <p className="text-[11px] text-center" style={{ color: "var(--ink-soft)" }}>{msg}</p>
        </div>
        <div className="flex items-center gap-1" aria-label={`今日の集中の結晶 ${todayN}個`}>
          {Array.from({ length: Math.max(4, Math.ceil((todayN + 1) / 4) * 4) }, (_, i) => <span key={i} style={{ width: 16, height: 16, transform: "rotate(45deg)", borderRadius: 3, background: i < todayN ? "linear-gradient(135deg, #bfe3ff, #4f8eb3)" : "var(--beige)", border: `1px solid ${i < todayN ? "#4f8eb3" : "var(--rule-soft)"}`, boxShadow: i < todayN ? "0 0 6px rgba(79,142,179,0.6)" : "none" }} />)}
          <span className="text-[10px] ml-2" style={{ color: "var(--ink-mute)" }}>今日 {todayN}個・これまで {f.total || 0}個</span>
        </div>
        {phase === "idle" || phase === "ready"
          ? <button onClick={actions.start} className="btn-primary w-full py-2.5 flex items-center justify-center gap-1"><Play size={16} /> {phase === "ready" ? "次の集中をはじめる" : "集中をはじめる"}</button>
          : <button onClick={() => { if (confirm(phase === "focus" ? "集中を中断しますか？（ここまでの時間は学習時間として記録されます）" : "休憩をやめて、タイマーを止めますか？")) actions.stop(); }} className="btn-ghost w-full py-2 text-sm">{phase === "focus" ? "中断する" : "タイマーを止める"}</button>}
        {phase === "ready" && <button onClick={actions.stop} className="text-[11px]" style={{ background: "none", border: "none", color: "var(--ink-mute)", textDecoration: "underline", cursor: "pointer" }}>今日はここまでにする</button>}
        <p className="text-[10px] text-center" style={{ color: "var(--ink-mute)" }}>集中1回ごとに 集中の結晶・10G・EXP、4回ごとに星霊石。集中の時間は学習時間として記録されます。ほかの画面に移っても止まりません。</p>
      </div>
    </Box>
  );
}

function TimerTab({ state, liveSeconds, startTimer, stopTimer, cancelTimer, addManualLog, deleteLog, focusActions }) {
  const [pickQual, setPickQual] = useState("");
  const [showManual, setShowManual] = useState(false);
  const active = state.timer.startMs !== null;
  const activeQual = state.qualifications.find((q) => q.id === state.timer.qualId);
  const activeQuals = state.qualifications.filter((q) => !q.acquired);
  return (
    <div className="space-y-4">
      {focusActions && <FocusTimer state={state} actions={focusActions} />}
      <Box title="学習タイマー" icon={<Clock size={18} />}>
        {!active ? (
          <>
            <label className="jp text-xs block mb-1" style={{ color: "var(--ink-soft)" }}>どの資格の勉強？</label>
            <select className="rpg-input mb-3" value={pickQual} onChange={(e) => setPickQual(e.target.value)}>
              <option value="">— 資格なしで計測 —</option>
              {activeQuals.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
            </select>
            <button onClick={() => startTimer(pickQual || null)} className="jp btn-success w-full py-3 flex items-center justify-center gap-2"><Play size={18} /> 学習スタート</button>
          </>
        ) : (
          <div className="text-center">
            <div className="jp text-sm mb-2" style={{ color: "var(--slate)" }}>
              学習中: {activeQual ? activeQual.name : "（資格なし）"}
              {state.timer.autoMode === "qa" && <span className="text-[10px] ml-1" style={{ color: "var(--gold)" }}>（問題集連動）</span>}
            </div>
            <div className="pixel my-4 text-3xl md:text-5xl" style={{ color: "var(--sky-deep)", textShadow: "2px 2px 0 var(--paper)" }}>{fmtSec(liveSeconds)}</div>
            <div className="pixel text-xs mb-4" style={{ color: "var(--ink-soft)" }}>+{Math.floor(liveSeconds / 60 * XP_TIMER_PER_MIN)} EXP 獲得予定</div>
            <button onClick={stopTimer} className="jp btn-danger w-full py-3 flex items-center justify-center gap-2 mb-2"><Pause size={18} /> 終了して記録</button>
            <button onClick={() => { if (confirm("タイマーをキャンセルします。\nこの時間は記録されません。よろしいですか？")) cancelTimer(); }} className="jp w-full py-2 flex items-center justify-center gap-2 text-sm" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", color: "var(--ink-soft)" }}><XIcon size={14} /> キャンセル（記録しない）</button>
          </div>
        )}
        <div className="jp text-[10px] mt-3 text-center" style={{ color: "var(--ink-mute)" }}>1分につき {XP_TIMER_PER_MIN} EXP ・ 紐付けた資格の進捗時間にも自動加算</div>
      </Box>

      <Box title="手動で時間を記録" icon={<Pencil size={18} />}>
        {!showManual ? (
          <button onClick={() => setShowManual(true)} className="jp btn-sky w-full py-2 flex items-center justify-center gap-1"><Plus size={14} /> 過去の学習時間を入力</button>
        ) : (
          <ManualEntryForm state={state} activeQuals={activeQuals} onCancel={() => setShowManual(false)} onSubmit={(entry) => { addManualLog(entry); setShowManual(false); }} />
        )}
      </Box>

      <Box title="今日の学習ログ" icon={<TrendingUp size={18} />}>
        {(() => {
          const today = todayStr();
          const logs = state.studyLog.map((l, idx) => ({ ...l, _idx: idx })).filter((l) => l.date === today);
          if (logs.length === 0) return <p className="jp text-sm text-center py-2" style={{ color: "var(--ink-mute)" }}>今日の記録はまだ無い</p>;
          return (
            <ul className="space-y-1">
              {logs.map((l) => {
                const q = state.qualifications.find((x) => x.id === l.qualId);
                return (
                  <li key={l._idx} className="flex justify-between items-center px-2 py-1" style={{ background: "var(--sky-pale)", border: "1px solid var(--rule-soft)" }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs">{l.source === "manual" ? "✎" : "⏱"}</span>
                      <span className="jp text-sm truncate" style={{ color: q?.color || "var(--ink)" }}>{q ? q.name : "—"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="pixel text-xs" style={{ color: "var(--sky-deep)" }}>{fmtMin(l.minutes)}</span>
                      <button onClick={() => { if (confirm("この記録を削除しますか？")) deleteLog(l.id || l._idx); }} className="text-xs p-1" style={{ color: "var(--brick)" }} title="削除"><Trash2 size={12} /></button>
                    </div>
                  </li>
                );
              })}
            </ul>
          );
        })()}
      </Box>
    </div>
  );
}

function ManualEntryForm({ state, activeQuals, onCancel, onSubmit }) {
  const [date, setDate] = useState(todayStr());
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [qualId, setQualId] = useState("");
  const totalMin = (Number(hours) || 0) * 60 + (Number(minutes) || 0);
  const valid = totalMin > 0 && date;
  const submit = () => { if (!valid) return; onSubmit({ date, qualId: qualId || null, minutes: totalMin }); };
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
        <div>
          <label className="jp text-[10px] block mb-1" style={{ color: "var(--ink-soft)" }}>日付</label>
          <input type="date" className="rpg-input" value={date} onChange={(e) => setDate(e.target.value)} max={todayStr()} />
        </div>
        <div>
          <label className="jp text-[10px] block mb-1" style={{ color: "var(--ink-soft)" }}>資格</label>
          <select className="rpg-input" value={qualId} onChange={(e) => setQualId(e.target.value)}>
            <option value="">— 資格なし —</option>
            {activeQuals.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
          </select>
        </div>
      </div>
      <label className="jp text-[10px] block mb-1" style={{ color: "var(--ink-soft)" }}>勉強時間</label>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="flex items-center gap-1">
          <input type="number" min="0" className="rpg-input" placeholder="0" value={hours} onChange={(e) => setHours(e.target.value)} />
          <span className="jp text-sm" style={{ color: "var(--ink)" }}>時間</span>
        </div>
        <div className="flex items-center gap-1">
          <input type="number" min="0" max="59" className="rpg-input" placeholder="30" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          <span className="jp text-sm" style={{ color: "var(--ink)" }}>分</span>
        </div>
      </div>
      {totalMin > 0 && <div className="jp text-[11px] mb-2 text-center" style={{ color: "var(--sky-deep)" }}>合計 {fmtMin(totalMin)} ・ +{Math.floor(totalMin * XP_TIMER_PER_MIN)} EXP</div>}
      <div className="flex gap-2">
        <button onClick={submit} disabled={!valid} className="jp btn-primary flex-1 py-2 flex items-center justify-center gap-1"><Plus size={14} /> 記録する</button>
        <button onClick={onCancel} className="jp btn-ghost px-4 py-2">キャンセル</button>
      </div>
    </div>
  );
}

// ============ Question Bank Tab ============
function MemoTab({ state, addStudyNote, updateStudyNote, deleteStudyNote, addFolder, deleteFolder, renameFolder, reorderFolders }) {
  const folders = (state.folders || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const notes = (state.studyNotes || []).slice().sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));

  // フォーム関連
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [folderSelect, setFolderSelect] = useState(null);
  const [filterFolder, setFilterFolder] = useState("__all__");
  const [expandedId, setExpandedId] = useState(null);

  // フォルダ管理
  const [folderManagerOpen, setFolderManagerOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renamingFolderId, setRenamingFolderId] = useState(null);
  const [renamingValue, setRenamingValue] = useState("");

  const resetForm = () => { setEditingId(null); setTitle(""); setNoteContent(""); setFolderSelect(null); };

  const handleSave = () => {
    if (!noteContent.trim() && !title.trim()) return;
    if (editingId) {
      updateStudyNote(editingId, { title, content: noteContent, folderId: folderSelect });
    } else {
      addStudyNote(folderSelect, title, noteContent);
    }
    resetForm();
  };

  // フォルダ単位でテキストエクスポート
  const exportFolder = (folderId) => {
    const folder = folders.find((f) => f.id === folderId);
    const folderName = folder ? folder.name : "未分類";
    const folderNotes = notes.filter((n) => (folderId === null ? !n.folderId : n.folderId === folderId));
    if (folderNotes.length === 0) {
      alert("このフォルダにメモがありません");
      return;
    }
    let text = "📁 " + folderName + " のメモ一覧\n";
    text += "エクスポート日: " + new Date().toLocaleString("ja-JP") + "\n";
    text += "件数: " + folderNotes.length + "件\n";
    text += "\n══════════════════════════════════\n\n";
    folderNotes.forEach((n, i) => {
      text += "【" + (n.title || "(無題)") + "】\n";
      text += "更新: " + (n.updatedAt || n.createdAt || "").substring(0, 10) + "\n\n";
      text += (n.content || "") + "\n";
      if (i < folderNotes.length - 1) text += "\n══════════════════════════════════\n\n";
    });
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = folderName.replace(/[\/:*?"<>|]/g, "_");
    a.download = "メモ_" + safeName + "_" + new Date().toISOString().substring(0, 10) + ".txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 全フォルダのメモを一括エクスポート
  const exportAll = () => {
    if (notes.length === 0) {
      alert("メモがありません");
      return;
    }
    let text = "📁 全メモ一覧\n";
    text += "エクスポート日: " + new Date().toLocaleString("ja-JP") + "\n";
    text += "件数: " + notes.length + "件\n";
    text += "\n══════════════════════════════════\n";
    // フォルダごとにグループ化
    const groups = [...folders, { id: null, name: "未分類" }];
    groups.forEach((g) => {
      const gNotes = notes.filter((n) => (g.id === null ? !n.folderId : n.folderId === g.id));
      if (gNotes.length === 0) return;
      text += "\n■ フォルダ: " + g.name + " (" + gNotes.length + "件)\n";
      text += "──────────────────────────────────\n\n";
      gNotes.forEach((n, i) => {
        text += "【" + (n.title || "(無題)") + "】\n";
        text += "更新: " + (n.updatedAt || n.createdAt || "").substring(0, 10) + "\n\n";
        text += (n.content || "") + "\n";
        if (i < gNotes.length - 1) text += "\n─────\n\n";
      });
      text += "\n══════════════════════════════════\n";
    });
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "全メモ_" + new Date().toISOString().substring(0, 10) + ".txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // フィルタ適用
  const filteredNotes = notes.filter((n) => {
    if (filterFolder === "__all__") return true;
    if (filterFolder === "__none__") return !n.folderId;
    return n.folderId === filterFolder;
  });

  return (
    <div className="space-y-3">
      {/* ── フォルダ管理パネル ── */}
      <Box title="フォルダ管理" icon={<FolderIcon size={18} />}>
        <button onClick={() => setFolderManagerOpen(!folderManagerOpen)} className="jp text-xs flex items-center gap-1" style={{ background: "none", border: "1px solid var(--rule)", padding: "4px 8px", color: "var(--ink-soft)" }}>
          {folderManagerOpen ? "▼ 閉じる" : "▶ フォルダを管理"} ({folders.length})
        </button>
        {folderManagerOpen && (
          <div className="mt-2 space-y-2">
            <div className="flex gap-1">
              <input className="rpg-input flex-1 text-sm" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="新規フォルダ名" />
              <button onClick={() => { if (newFolderName.trim()) { addFolder(newFolderName.trim()); setNewFolderName(""); } }} className="jp btn-primary px-3 text-xs">＋追加</button>
            </div>
            <ul className="space-y-1">
              {folders.map((f) => (
                <li key={f.id} className="flex items-center gap-2 p-2" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)" }}>
                  {renamingFolderId === f.id ? (
                    <>
                      <input className="rpg-input flex-1 text-sm" value={renamingValue} onChange={(e) => setRenamingValue(e.target.value)} autoFocus />
                      <button onClick={() => { if (renamingValue.trim()) { renameFolder(f.id, renamingValue.trim()); setRenamingFolderId(null); } }} className="jp btn-primary px-2 py-0.5 text-[10px]">💾</button>
                      <button onClick={() => setRenamingFolderId(null)} className="jp btn-ghost px-2 py-0.5 text-[10px]">✕</button>
                    </>
                  ) : (
                    <>
                      <span className="jp text-sm flex-1">{f.name}</span>
                      <span className="pixel text-[10px]" style={{ color: "var(--ink-mute)" }}>{notes.filter((n) => n.folderId === f.id).length}件</span>
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => { const ids = folders.map((x) => x.id); const i = ids.indexOf(f.id); if (i <= 0) return; [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]]; reorderFolders(ids); }} className="jp text-[10px] px-1 leading-none" style={{ color: folders.indexOf(f) === 0 ? "var(--ink-mute)" : "var(--ink)", border: "1px solid var(--rule-soft)" }}>▲</button>
                        <button onClick={() => { const ids = folders.map((x) => x.id); const i = ids.indexOf(f.id); if (i >= ids.length - 1) return; [ids[i], ids[i + 1]] = [ids[i + 1], ids[i]]; reorderFolders(ids); }} className="jp text-[10px] px-1 leading-none" style={{ color: folders.indexOf(f) === folders.length - 1 ? "var(--ink-mute)" : "var(--ink)", border: "1px solid var(--rule-soft)" }}>▼</button>
                      </div>
                      <button onClick={() => exportFolder(f.id)} className="jp text-[10px] px-1.5 py-0.5" style={{ background: "var(--sky-deep)", color: "var(--paper)" }} title="このフォルダのメモをエクスポート">📥</button>
                      <button onClick={() => { setRenamingFolderId(f.id); setRenamingValue(f.name); }} className="jp text-[10px] px-1.5 py-0.5" style={{ color: "var(--sky-deep)", border: "1px solid var(--sky-deep)" }} title="フォルダ名を編集">✏ 名前</button>
                      <button onClick={() => { if (confirm("フォルダ「" + f.name + "」を削除しますか？\n中のメモ・問題集は「未分類」に移動されます。")) deleteFolder(f.id); }} style={{ color: "var(--brick)" }} title="フォルダを削除"><Trash2 size={13} /></button>
                    </>
                  )}
                </li>
              ))}
            </ul>
            {/* 未分類のメモがある場合のエクスポート */}
            {notes.filter((n) => !n.folderId).length > 0 && (
              <div className="flex items-center gap-2 p-2" style={{ background: "var(--rule-soft)", border: "1px solid var(--rule-soft)" }}>
                <span className="jp text-sm flex-1">📂 未分類</span>
                <span className="pixel text-[10px]" style={{ color: "var(--ink-mute)" }}>{notes.filter((n) => !n.folderId).length}件</span>
                <button onClick={() => exportFolder(null)} className="jp text-[10px] px-1.5 py-0.5" style={{ background: "var(--sky-deep)", color: "var(--paper)" }} title="未分類のメモをエクスポート">📥</button>
              </div>
            )}
          </div>
        )}
      </Box>

      {/* ── メモ作成・編集フォーム ── */}
      <Box title={editingId ? "メモを編集" : "新規メモ"} icon={<Bookmark size={18} />}>
        <input className="rpg-input w-full text-sm mb-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="タイトル（任意）" />
        <textarea className="rpg-input w-full text-sm mb-2" rows={5} value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder="メモを入力..." style={{ resize: "vertical" }} />
        <div className="flex gap-1 items-center mb-2 flex-wrap">
          <label className="jp text-[10px]" style={{ color: "var(--ink-soft)" }}>📁 保存先:</label>
          <select className="rpg-input text-xs py-0.5 flex-1 min-w-0" value={folderSelect || ""} onChange={(e) => setFolderSelect(e.target.value || null)}>
            <option value="">（未分類）</option>
            {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div className="flex gap-1">
          <button onClick={handleSave} className="jp btn-primary flex-1 py-1 text-xs" disabled={!noteContent.trim() && !title.trim()}>💾 {editingId ? "更新" : "保存"}</button>
          {editingId && <button onClick={resetForm} className="jp btn-ghost px-3 py-1 text-xs">キャンセル</button>}
        </div>
      </Box>

      {/* ── メモ一覧 ── */}
      <Box title="メモ一覧" icon={<Bookmark size={18} />}>
        <div className="flex gap-1 items-center mb-2 flex-wrap">
          <label className="jp text-[10px]" style={{ color: "var(--ink-soft)" }}>表示:</label>
          <select className="rpg-input text-xs py-0.5 flex-1 min-w-0" value={filterFolder} onChange={(e) => setFilterFolder(e.target.value)}>
            <option value="__all__">すべて</option>
            <option value="__none__">（未分類）のみ</option>
            {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>

        </div>
        {filteredNotes.length === 0 ? (
          <p className="jp text-sm text-center py-4" style={{ color: "var(--ink-mute)" }}>メモがありません</p>
        ) : (
          <ul className="space-y-1">
            {filteredNotes.map((n) => {
              const folder = folders.find((f) => f.id === n.folderId);
              const isExpanded = expandedId === n.id;
              return (
                <li key={n.id} className="p-2" style={{ background: "var(--sky-pale)", border: "1px solid var(--rule-soft)" }}>
                  <button onClick={() => setExpandedId(isExpanded ? null : n.id)} className="w-full text-left" style={{ background: "none", border: "none", padding: 0 }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="jp text-sm font-bold" style={{ color: "var(--ink)" }}>{n.title || "(無題)"}</div>
                        {!isExpanded && <div className="jp text-[11px] truncate" style={{ color: "var(--ink-soft)" }}>{(n.content || "").substring(0, 80)}</div>}
                      </div>
                      <span style={{ color: "var(--ink-mute)", fontSize: "10px" }}>{isExpanded ? "▼" : "▶"}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="pixel text-[9px] px-1" style={{ background: folder ? "var(--gold)" : "var(--rule-soft)", color: folder ? "var(--paper)" : "var(--ink-mute)" }}>📁 {folder ? folder.name : "未分類"}</span>
                      <span className="pixel text-[9px]" style={{ color: "var(--ink-mute)" }}>{(n.updatedAt || n.createdAt || "").substring(0, 10)}</span>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="mt-2">
                      <div className="jp text-sm whitespace-pre-wrap p-2" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", color: "var(--ink)" }}>{n.content}</div>
                      <div className="flex gap-1 mt-1">
                        <button onClick={() => { setEditingId(n.id); setTitle(n.title || ""); setNoteContent(n.content || ""); setFolderSelect(n.folderId || null); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="jp btn-info flex-1 py-1 text-xs">✏ 編集</button>
                        <button onClick={() => { if (confirm("このメモを削除しますか？")) { deleteStudyNote(n.id); setExpandedId(null); } }} className="jp px-3 py-1 text-xs" style={{ background: "var(--brick)", color: "var(--paper)" }}>🗑 削除</button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Box>
    </div>
  );
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
            <button onClick={() => setMovingBankId(b.id)} className="jp text-[10px] px-1.5 py-0.5" style={{ color: "var(--sky-deep)", border: "1px solid var(--sky-deep)" }} title="フォルダを移動">📁</button>
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

  // ── フォルダ別グループ化 ──
  const folderBanks = (folderId) => state.questionBanks.filter((b) => (b.folderId || null) === folderId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
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
      <WeakExportPanel state={state} />
      <PrintNoteButton state={state} />

      {state.questionBanks.length === 0 ? (
        <Box title="登録済み問題集" icon={<ScrollIcon size={18} />}>
          <p className="jp text-sm text-center py-4" style={{ color: "var(--ink-mute)" }}>まだ問題集はインポートされていない</p>
        </Box>
      ) : (
        <>
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
  const totalCloze = bank.questions.reduce((a, q) => a + (q.clozes || []).length, 0);
  const excludedCount = bank.questions.filter(q => q.excluded).length;
  const resume = state?.sessionResume?.bankId === bank.id ? state.sessionResume : null;
  const start = (fromResume) => {
    window.__qaConfig = { random, retryWrong, useTimer, excludeMastered, fromResume: fromResume || false };
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
        </div>
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

function ConfigToggle({ label, sub, value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} className="w-full flex items-center gap-3 p-2 text-left transition" style={{ background: value ? "var(--sky-pale)" : "var(--paper)", border: `1px solid ${value ? "var(--sky-deep)" : "var(--rule-soft)"}` }}>
      <div className="w-6 h-6 flex items-center justify-center flex-shrink-0" style={{ background: value ? "var(--sky-deep)" : "var(--paper)", border: "1px solid var(--rule)", color: "var(--paper)" }}>{value && "✓"}</div>
      <div className="flex-1">
        <div className="jp text-sm" style={{ color: "var(--ink)" }}>{label}</div>
        {sub && <div className="jp text-[10px]" style={{ color: "var(--ink-mute)" }}>{sub}</div>}
      </div>
    </button>
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
                    <span className="qtext-list jp text-sm flex-1 break-words" style={{ color: "var(--ink)" }}>{renderQText(q.q, q.q_formats)}</span>
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
    displayQ = renderQText(currentQ.q, currentQ.q_formats);
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
                <AnswerPanel onAnswer={answer} wrongLabel="まだ難しい" correctLabel="倒した" sureClass="btn-plum" question={currentQ} srSettings={state.srSettings} />
              ) : (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button onClick={() => answer(false)} className="jp btn-danger py-2 flex items-center justify-center gap-1"><XIcon size={16} /> まだ難しい</button>
                  <button onClick={() => answer(true)} className="jp btn-plum py-2 flex items-center justify-center gap-1"><Sword2 size={16} /> 倒した！</button>
                </div>
              )}
            </>
          ) : (
            <button onClick={() => setShowAnswer(true)} className="jp btn-info mt-3 py-2 flex items-center justify-center gap-1"><Eye size={16} /> 答えを見る</button>
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
      const ids = (activeQs.length > 0 ? activeQs : bank.questions).map((q) => q.id);
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
          if (recordClearSnapshot) recordClearSnapshot(bank.id, { date: todayStr(), accuracy: acc, totalAns: newCorrect + newWrong, correct: newCorrect, wrong: newWrong });
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
            <div className="qtext jp text-base md:text-lg flex-1 break-words" style={{ color: "var(--ink)" }}>{renderQText(currentQ.q, currentQ.q_formats)}</div>
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
              <AnswerPanel onAnswer={answer} question={currentQ} srSettings={state.srSettings} />
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
            <button onClick={() => { setShowAnswer(true); setMemoEdit(false); }} className="jp btn-info mt-3 py-2 flex items-center justify-center gap-1"><Eye size={16} /> 答えを見る</button>
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

function ImportPanel({ state, onCancel, onImport }) {
  const [name, setName] = useState("");
  const [year, setYear] = useState("");
  const [qualId, setQualId] = useState("");
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
  const handleFile = (file) => {
    setErr("");
    Papa.parse(file, {
      complete: (res) => {
        const rows = res.data.filter((r) => Array.isArray(r) && r.length >= 2 && String(r[0]).trim() && String(r[1]).trim());
        if (rows.length === 0) { setErr("有効な問題が見つかりませんでした。1列目=問題、2列目=答えを確認してください。"); return; }
        const first = rows[0];
        const looksLikeHeader = /^(問題|質問|q|question)$/i.test(String(first[0]).trim()) || /^(答え|解答|a|answer)$/i.test(String(first[1]).trim());
        const data = looksLikeHeader ? rows.slice(1) : rows;
        const questions = data.map((r) => ({ id: uid(), q: String(r[0]).trim(), a: String(r[1]).trim(), correct: 0, wrong: 0 }));
        setParsed(questions);
        if (!name) { const fname = file.name.replace(/\.csv$/i, ""); const yearMatch = fname.match(/(令和|平成|R)?\s*\d{1,4}\s*年?度?/); if (yearMatch && !year) setYear(yearMatch[0].trim()); setName(fname); }
      },
      error: () => setErr("CSVの読み込みに失敗しました。"),
    });
  };
  const confirmImport = () => { if (!parsed || !name.trim()) return; onImport({ id: uid(), name: name.trim(), year: year.trim() || null, qualId: qualId || null, questions: parsed }); };
  return (
    <Box title={src === "csv" ? "CSVをインポート" : "文章を貼り付けて問題を作る"} icon={<Upload size={18} />}>
      <div className="grid grid-cols-2 gap-1 p-1 mb-3" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 999 }}>
        {[["csv", "CSVファイル"], ["paste", "文章を貼り付け（写真から）"]].map(([id, l]) => <button key={id} onClick={() => { setSrc(id); setParsed(null); setErr(""); }} className="jp py-1.5 text-[11px]" style={{ borderRadius: 999, border: "none", fontWeight: 700, cursor: "pointer", background: src === id ? "linear-gradient(180deg, #cfae62, #a8833a)" : "transparent", color: src === id ? "#fffdf6" : "var(--ink-soft)" }}>{l}</button>)}
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
      <div className="jp text-[11px] mb-3 leading-relaxed p-2" style={{ background: "var(--sky-pale)", border: "1px solid var(--rule-soft)", color: "var(--ink-soft)" }}>📋 対応形式（CSV）<br />1列目=問題、2列目=答え。1行目がヘッダーなら自動でスキップ。</div>
      <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])} className="jp w-full mb-2 text-sm file:mr-2 file:py-1 file:px-3 file:bg-yellow-600 file:text-white file:border-0 file:font-bold file:cursor-pointer" style={{ color: "var(--ink)" }} />
      </>)}
      {err && <div className="jp text-xs p-2 mb-2" style={{ background: "rgba(160,72,72,0.15)", border: "1px solid var(--brick)", color: "var(--brick)" }}>{err}</div>}
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
        <button onClick={confirmImport} disabled={!parsed || !name.trim()} className="jp btn-primary flex-1 py-2">インポート</button>
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
    displayQ = renderQText(currentQ.q, currentQ.q_formats);
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
                <AnswerPanel onAnswer={answer} question={currentQ} srSettings={state.srSettings} />
              ) : (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button onClick={() => answer(false)} className="jp btn-danger py-2 flex items-center justify-center gap-1"><XIcon size={16} /> 不正解</button>
                  <button onClick={() => answer(true)} className="jp btn-success py-2 flex items-center justify-center gap-1"><Check size={16} /> 正解！</button>
                </div>
              )}
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
                <AnswerPanel onAnswer={answer} wrongLabel="まだ難しい" correctLabel="倒した" sureClass="btn-plum" question={currentQ} srSettings={state.srSettings} />
              ) : (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button onClick={() => answer(false)} className="jp btn-danger py-2 flex items-center justify-center gap-1"><XIcon size={16} /> まだ難しい</button>
                  <button onClick={() => answer(true)} className="jp btn-plum py-2 flex items-center justify-center gap-1"><Sword2 size={16} /> 倒した！</button>
                </div>
              )}
            </>
          ) : (
            <button onClick={() => setShowAnswer(true)} className="jp btn-info mt-3 py-2 flex items-center justify-center gap-1"><Eye size={16} /> 答えを見る</button>
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

// ============ Weakness List Panel (弱点リスト) ============
// ============ 問題の画像（スクショ・写真） ============
// 画像は圧縮してから Firestore の userdata/{uid}/images/{画像ID} に1枚ずつ保存する。
// 問題データには { id, side } だけを記録する（side: "q"=問題側 / "a"=答え側）。
// Firebase Storage（有料プラン必須）を使わず、無料のSparkプランのまま動く。
const QImageContext = createContext(null);
const qImageCache = new Map();         // 画像ID → dataURL（同じ画像を何度も読み込まない）
const IMG_MAX_EDGE = 1400;             // 長辺の最大ピクセル
const IMG_MAX_CHARS = 700 * 1024;      // Firestoreの1ドキュメント1MB制限に余裕を持たせた上限

const qImageCol = (uid) => fbDb.collection("userdata").doc(uid).collection("images");

// 画像ファイルを読み込み、縮小・JPEG圧縮して dataURL にする
async function compressImageFile(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("画像を読み込めませんでした"));
      el.src = url;
    });
    let edge = IMG_MAX_EDGE;
    let quality = 0.82;
    for (let i = 0; i < 10; i++) {
      const scale = Math.min(1, edge / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";               // 透過PNG（スクショ）が黒くならないよう白で塗る
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      const data = canvas.toDataURL("image/jpeg", quality);
      if (data.length <= IMG_MAX_CHARS) return { data, w, h };
      if (quality > 0.55) quality -= 0.1; else edge = Math.round(edge * 0.8);
    }
    throw new Error("画像が大きすぎて圧縮できませんでした");
  } finally {
    URL.revokeObjectURL(url);
  }
}

// 1枚の画像を読み込んで表示する
function QImageThumb({ userId, id, height, onOpen }) {
  const [src, setSrc] = useState(qImageCache.get(id) || null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (src) return;
    let alive = true;
    qImageCol(userId).doc(id).get().then((d) => {
      if (!alive) return;
      if (d.exists && d.data().data) { qImageCache.set(id, d.data().data); setSrc(d.data().data); }
      else setFailed(true);
    }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [userId, id]);
  const box = { height, minWidth: height, border: "1px solid var(--rule-soft)", background: "var(--paper)" };
  if (failed) return <div className="jp text-[10px] flex items-center justify-center px-2" style={{ ...box, color: "var(--ink-mute)" }}>画像なし</div>;
  if (!src) return <div className="jp text-[10px] flex items-center justify-center px-2" style={{ ...box, color: "var(--ink-mute)" }}>読込中…</div>;
  return (
    <button onClick={() => onOpen(id)} className="flex-shrink-0 p-0" style={{ border: "1px solid var(--rule-soft)", background: "var(--paper)", lineHeight: 0 }} title="タップで拡大">
      <img src={src} alt="" style={{ height, width: "auto", maxWidth: "100%", objectFit: "contain", display: "block" }} />
    </button>
  );
}

// 拡大表示（画面全体）
function QImageViewer({ id, onClose, onDelete }) {
  const [zoom, setZoom] = useState(false);
  const src = qImageCache.get(id);
  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(20,24,32,0.9)", display: "flex", flexDirection: "column" }}>
      <div className="flex items-center justify-between gap-2 p-2" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => setZoom(!zoom)} className="jp text-xs px-2 py-1" style={{ background: "var(--paper)", border: "1px solid var(--rule)", color: "var(--ink)" }}>{zoom ? "🔍 全体表示" : "🔍 拡大表示"}</button>
        <div className="flex gap-2">
          {onDelete && <button onClick={() => onDelete(id)} className="jp text-xs px-2 py-1 btn-danger">🗑 削除</button>}
          <button onClick={onClose} className="jp text-xs px-3 py-1" style={{ background: "var(--paper)", border: "1px solid var(--rule)", color: "var(--ink)" }}>✕ 閉じる</button>
        </div>
      </div>
      <div style={{ flex: 1, overflow: "auto", display: "flex", alignItems: zoom ? "flex-start" : "center", justifyContent: zoom ? "flex-start" : "center", padding: 8 }}>
        {src && <img src={src} alt="" onClick={(e) => e.stopPropagation()} style={zoom ? { maxWidth: "none", width: "auto" } : { maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />}
      </div>
    </div>,
    document.body
  );
}

// 問題に付いた画像の表示＋追加（貼り付け・ファイル選択・ドラッグ＆ドロップ）
// side: "q"=問題側 / "a"=答え側 / "all"=両方（一覧画面用）
function QuestionImages({ bankId, question, side, compact = false }) {
  const ctx = useContext(QImageContext);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [viewId, setViewId] = useState(null);
  const [addSide, setAddSide] = useState(side === "a" ? "a" : "q");
  const fileRef = useRef(null);
  const addFilesRef = useRef(null);

  const list = ((question && question.images) || []).filter((im) => side === "all" || im.side === side);

  const addFiles = async (files) => {
    if (!ctx || !question) return;
    const imgs = Array.from(files || []).filter((f) => f && f.type && f.type.startsWith("image/"));
    if (imgs.length === 0) { setMsg("画像ファイルが見つかりませんでした"); return; }
    setBusy(true); setMsg("");
    let added = 0;
    for (const f of imgs) {
      try {
        const { data, w, h } = await compressImageFile(f);
        const id = uid();
        const write = qImageCol(ctx.uid).doc(id).set({ data, w, h, createdAt: new Date().toISOString() });
        // オフライン時は送信待ちのまま進める（端末に保存され、接続時に自動送信される）
        await Promise.race([write, new Promise((r) => setTimeout(r, 8000))]);
        qImageCache.set(id, data);
        ctx.updateQuestionImages(bankId, question.id, (arr) => [...arr, { id, side: addSide }]);
        added++;
      } catch (e) {
        console.error("Image add error:", e);
        setMsg("追加に失敗しました: " + e.message);
      }
    }
    setBusy(false);
    if (added > 0) { setMsg(`🖼 ${added}枚追加しました`); setOpen(false); }
  };
  addFilesRef.current = addFiles;

  // パネルを開いている間は Ctrl+V（スクショの貼り付け）を受け付ける
  useEffect(() => {
    if (!open) return;
    const onPaste = (e) => {
      const files = Array.from((e.clipboardData && e.clipboardData.files) || []);
      if (files.length > 0) { e.preventDefault(); addFilesRef.current(files); }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [open]);

  // クリップボードから読み込むボタン（対応ブラウザのみ）
  const pasteFromClipboard = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) throw new Error("unsupported");
      const items = await navigator.clipboard.read();
      const files = [];
      for (const it of items) {
        const type = it.types.find((t) => t.startsWith("image/"));
        if (type) { const blob = await it.getType(type); files.push(new File([blob], "paste", { type })); }
      }
      if (files.length === 0) { setMsg("クリップボードに画像がありません"); return; }
      addFiles(files);
    } catch (e) {
      setMsg("このブラウザではボタンから貼り付けできません。Ctrl+V を押してください");
    }
  };

  const removeImage = (id) => {
    if (!ctx || !confirm("この画像を削除しますか？")) return;
    ctx.updateQuestionImages(bankId, question.id, (arr) => arr.filter((im) => im.id !== id));
    qImageCol(ctx.uid).doc(id).delete().catch((e) => console.warn("Image delete:", e));
    qImageCache.delete(id);
    setViewId(null);
  };

  if (!ctx || !question) return null;
  const thumbH = compact ? 56 : 140;
  const addLabel = side === "q" ? "🖼 問題に画像" : side === "a" ? "🖼 答えに画像" : "🖼 画像";

  return (
    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
      {list.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-1">
          {list.map((im) => <QImageThumb key={im.id} userId={ctx.uid} id={im.id} height={thumbH} onOpen={setViewId} />)}
        </div>
      )}
      {!open ? (
        <div className="flex items-center gap-2">
          <button onClick={() => { setOpen(true); setMsg(""); }} className="jp text-[10px] px-1.5 py-0.5" style={{ border: "1px dashed var(--rule-soft)", background: "transparent", color: "var(--ink-mute)" }}>{addLabel}</button>
          {msg && <span className="jp text-[10px]" style={{ color: "var(--sage)" }}>{msg}</span>}
        </div>
      ) : (
        <div
          className="p-2"
          style={{ border: "2px dashed var(--sky-deep)", background: "var(--sky-pale)" }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="jp text-xs" style={{ color: "var(--sky-deep)" }}>🖼 画像を追加</div>
            <button onClick={() => setOpen(false)} className="jp text-[10px] px-1.5 py-0.5" style={{ border: "1px solid var(--rule-soft)", background: "var(--paper)", color: "var(--ink-soft)" }}>✕ 閉じる</button>
          </div>
          {side === "all" && (
            <div className="flex gap-1 mb-2">
              {[["q", "問題側に付ける"], ["a", "答え側に付ける"]].map(([k, label]) => (
                <button key={k} onClick={() => setAddSide(k)} className="jp text-[11px] px-2 py-1 flex-1" style={{ background: addSide === k ? "var(--sky-deep)" : "var(--paper)", color: addSide === k ? "var(--paper)" : "var(--ink)", border: "1px solid var(--rule)" }}>{label}</button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button disabled={busy} onClick={() => fileRef.current && fileRef.current.click()} className="jp btn-sky py-2 text-xs">📷 写真・ファイル</button>
            <button disabled={busy} onClick={pasteFromClipboard} className="jp btn-ghost py-2 text-xs">📋 貼り付け</button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
          <p className="jp text-[10px] mt-2" style={{ color: "var(--ink-mute)" }}>
            {busy ? "⏳ 圧縮して保存しています…" : "PCではスクショを撮って Ctrl+V、または画像をここへドラッグでも追加できます。"}
          </p>
          {msg && <p className="jp text-[10px] mt-1" style={{ color: "var(--brick)" }}>{msg}</p>}
        </div>
      )}
      {viewId && <QImageViewer id={viewId} onClose={() => setViewId(null)} onDelete={removeImage} />}
    </div>
  );
}

// ============ 条文（e-Gov法令データ） ============
// 条文データは scripts/fetch-laws.mjs で public/laws/ に保存したものを読み込む。
// key は scripts/fetch-laws.mjs の LAW_SOURCES とそろえること。
const LAWS = [
  { key: "fudosan-ho",     name: "不動産登記法",   short: "法",       aliases: ["不動産登記法", "不登法", "法"] },
  { key: "fudosan-rei",    name: "不動産登記令",   short: "令",       aliases: ["不動産登記令", "不登令", "令"] },
  { key: "fudosan-kisoku", name: "不動産登記規則", short: "規則",     aliases: ["不動産登記規則", "不登規則", "規則"] },
  { key: "minpo",          name: "民法",           short: "民法",     aliases: ["民法"] },
  { key: "kubun",          name: "区分所有法",     short: "区分所有法", aliases: ["建物の区分所有等に関する法律", "区分所有法", "区分法"] },
  { key: "chosashi",       name: "土地家屋調査士法", short: "調査士法", aliases: ["土地家屋調査士法", "調査士法"] },
];
const LAW_BY_KEY = Object.fromEntries(LAWS.map((l) => [l.key, l]));
const LAW_ALIAS_LIST = LAWS.flatMap((l) => l.aliases.map((a) => ({ alias: a, key: l.key }))).sort((a, b) => b.alias.length - a.alias.length);
const SHORT_ALIASES = new Set(["法", "令", "規則"]); // 前に漢字が付くと別の法令（例：命令・手続法）になる略称

const lawDataCache = new Map(); // key → Promise<data | null>
function loadLaw(key) {
  if (!lawDataCache.has(key)) {
    const base = (import.meta.env && import.meta.env.BASE_URL) || "/";
    lawDataCache.set(key, fetch(`${base}laws/${key}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null));
  }
  return lawDataCache.get(key);
}

// 漢数字 → 数字（条・項・号の番号用）
const KANJI_DIGITS = { "〇": 0, "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9 };
function kanjiToNum(s) {
  let total = 0, cur = 0;
  for (const ch of s) {
    if (ch in KANJI_DIGITS) cur = KANJI_DIGITS[ch];
    else if (ch === "十" || ch === "百" || ch === "千") { total += (cur || 1) * (ch === "十" ? 10 : ch === "百" ? 100 : 1000); cur = 0; }
  }
  return total + cur;
}
function normalizeLawText(t) {
  return String(t || "")
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/([〇一二三四五六七八九十百千]+)(?=[条項号])/g, (m) => String(kanjiToNum(m)))
    .replace(/(\d+条)の([一二三四五六七八九十]+)/g, (m, a, b) => `${a}の${kanjiToNum(b)}`);
}
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const LAW_REF_RE = new RegExp(`(${LAW_ALIAS_LIST.map((x) => escapeRe(x.alias)).join("|")})?(?:第?(\\d+)条|(同)条)(?:の(\\d+))?(?:第?(\\d+)項)?(?:第?(\\d+)号)?`, "g");
const isJaChar = (c) => !!c && /[\u3040-\u30ff\u3400-\u9fff]/.test(c);

// 文章から「規則35条3号」などの条文の参照を取り出す
function extractLawRefs(texts) {
  const refs = [];
  const seen = new Set();
  let lastLaw = null, lastArt = null;
  for (const raw of texts) {
    const t = normalizeLawText(raw);
    LAW_REF_RE.lastIndex = 0;
    let m;
    while ((m = LAW_REF_RE.exec(t))) {
      const [, alias, artNum, dou, eda, para, item] = m;
      let lawKey = null;
      if (alias) {
        const prev = t[m.index - 1];
        if (SHORT_ALIASES.has(alias) && isJaChar(prev)) continue; // 「命令」「手続法」などは対象外
        lawKey = LAW_ALIAS_LIST.find((x) => x.alias === alias).key;
      } else {
        lawKey = lastLaw || "fudosan-ho";
      }
      let art;
      if (dou) { if (!lastArt || lawKey !== lastLaw) continue; art = lastArt; }
      else art = artNum + (eda ? `_${eda}` : "");
      lastLaw = lawKey; lastArt = art;
      const id = `${lawKey}:${art}:${para || ""}:${item || ""}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const law = LAW_BY_KEY[lawKey];
      const artLabel = art.includes("_") ? art.replace("_", "条の") : `${art}条`;
      const label = `${law.short}${artLabel}${para ? `${para}項` : ""}${item ? `${item}号` : ""}`;
      refs.push({ law: lawKey, art, para: para || null, item: item || null, label });
    }
  }
  return refs;
}
const sameArticle = (a, b) => a.law === b.law && a.art === b.art;
const articleFullText = (a) => [a.c, ...(a.p || []).flatMap((p) => [p.s, ...(p.i || []).flatMap((it) => [it.t + " " + it.s, ...(it.x || [])])])].join(" ");

// 条文の表示（画面全体）
function LawArticleModal({ target, onClose }) {
  const ctx = useContext(QImageContext);
  const [data, setData] = useState(undefined); // undefined=読込中 / null=データなし
  const [cur, setCur] = useState(target);
  const [openQ, setOpenQ] = useState(null);
  const hlRef = useRef(null);
  useEffect(() => { let alive = true; setData(undefined); loadLaw(cur.law).then((d) => { if (alive) setData(d); }); return () => { alive = false; }; }, [cur.law]);
  useEffect(() => { if (hlRef.current && hlRef.current.scrollIntoView) hlRef.current.scrollIntoView({ block: "center" }); }, [data, cur]);
  const law = LAW_BY_KEY[cur.law];
  const arts = (data && data.articles) || [];
  const idx = arts.findIndex((a) => a.n === cur.art);
  const art = idx >= 0 ? arts[idx] : null;
  const go = (d) => { const a = arts[idx + d]; if (a) setCur({ law: cur.law, art: a.n, para: null, item: null }); };
  const hlPara = cur.para || (cur.item ? "1" : null);

  // この条文を引用している問題（一覧は50問まで、解くときは全部から最大30問）
  const allRelated = [];
  if (ctx && ctx.banks) {
    for (const b of ctx.banks) for (const q of b.questions || []) {
      if (extractLawRefs([q.q, q.a]).some((r) => sameArticle(r, cur))) allRelated.push({ bank: b, q });
    }
  }
  const related = allRelated.slice(0, 50);
  const studyList = allRelated.filter((x) => !x.q.excluded);
  const studyThis = () => {
    const items = shuffle(studyList).slice(0, 30).map(({ bank, q }) => ({ bankId: bank.id, bankName: bank.name, year: bank.year || "", qId: q.id }));
    onClose();
    window.dispatchEvent(new CustomEvent("sq-study-items", { detail: items }));
  };

  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(20,24,32,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
      <div onClick={(e) => e.stopPropagation()} className="rpg-box p-1" style={{ width: "100%", maxWidth: 720, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div className="rpg-inner-border" style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="jp text-sm" style={{ color: "var(--ink)" }}>📜 {law ? law.name : ""} {art ? art.t : ""}</div>
            <button onClick={onClose} className="jp text-[10px] px-2 py-1" style={{ border: "1px solid var(--rule)", background: "var(--paper)", color: "var(--ink)" }}>✕ 閉じる</button>
          </div>
          <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
            {data === undefined && <p className="jp text-xs py-4 text-center" style={{ color: "var(--ink-mute)" }}>読み込み中…</p>}
            {data === null && <p className="jp text-xs py-4" style={{ color: "var(--brick)" }}>条文データが見つかりません。PCの作業フォルダで「node scripts/fetch-laws.mjs」を実行してから公開してください。</p>}
            {data && !art && <p className="jp text-xs py-4" style={{ color: "var(--brick)" }}>{law.name}に{cur.art.replace("_", "条の")}{cur.art.includes("_") ? "" : "条"}は見つかりませんでした。</p>}
            {art && (
              <div className="qtext jp text-sm leading-relaxed" style={{ color: "var(--ink)" }}>
                {art.c && <div className="text-xs mb-1" style={{ color: "var(--ink-soft)" }}>{art.c}</div>}
                {art.p.map((p, pi) => {
                  const on = hlPara && String(p.n) === String(hlPara);
                  return (
                    <div key={pi} ref={on && !cur.item ? hlRef : null} className="mb-2 p-1" style={{ background: on && !cur.item ? "var(--hl, #fff3b0)" : "transparent" }}>
                      <span style={{ fontWeight: "bold" }}>{art.p.length > 1 ? `${p.n}　` : ""}</span>{p.s}
                      {(p.i || []).map((it, ii) => {
                        const ion = on && cur.item && String(it.n) === String(cur.item);
                        return (
                          <div key={ii} ref={ion ? hlRef : null} className="ml-3 mt-1 p-1" style={{ background: ion ? "var(--hl, #fff3b0)" : "transparent" }}>
                            {it.t}　{it.s}
                            {(it.x || []).map((x, xi) => <div key={xi} className="ml-3">{x}</div>)}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
            {art && (
              <div className="mt-3 pt-2" style={{ borderTop: "1px dashed var(--rule-soft)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="jp text-xs flex-1" style={{ color: "var(--ink-soft)" }}>📚 この条文に関係する問題（{allRelated.length}問）</div>
                  {studyList.length > 0 && <button onClick={studyThis} className="jp btn-primary text-[11px] px-2.5 py-1">この条文の問題を解く（{Math.min(30, studyList.length)}問）</button>}
                </div>
                {related.length === 0 && <p className="jp text-[11px]" style={{ color: "var(--ink-mute)" }}>答えや問題文でこの条文を引用している問題はありません。</p>}
                {related.map(({ bank, q }) => (
                  <button key={bank.id + q.id} onClick={() => setOpenQ(openQ === q.id ? null : q.id)} className="w-full text-left p-1.5 mb-1" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)" }}>
                    <div className="jp text-[10px]" style={{ color: "var(--ink-mute)" }}>{bank.name}{bank.year ? ` ・ ${bank.year}` : ""}</div>
                    <div className="qtext-list jp text-xs" style={{ color: "var(--ink)" }}>{String(q.q || "").slice(0, openQ === q.id ? 2000 : 70)}{openQ !== q.id && String(q.q || "").length > 70 ? "…" : ""}</div>
                    {openQ === q.id && <div className="qtext-list jp text-xs mt-1 p-1" style={{ background: "var(--sky-pale)", color: "var(--ink)" }}>{q.a}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 mt-2">
            <button disabled={idx <= 0} onClick={() => go(-1)} className="jp btn-ghost text-xs px-2 py-1">◀ 前の条</button>
            <span className="jp text-[9px] text-center" style={{ color: "var(--ink-mute)" }}>出典：e-Gov法令検索{data && data.fetchedAt ? `（${data.fetchedAt} 取得）` : ""}</span>
            <button disabled={idx < 0 || idx >= arts.length - 1} onClick={() => go(1)} className="jp btn-ghost text-xs px-2 py-1">次の条 ▶</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// 問題・答えの中の条文を、タップで開けるボタンにして並べる
function LawRefChips({ q }) {
  const [open, setOpen] = useState(null);
  if (!q) return null;
  const refs = extractLawRefs([q.q, q.a]);
  if (refs.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1 mt-2">
      <span className="jp text-[10px]" style={{ color: "var(--ink-mute)" }}>関連条文</span>
      {refs.map((r) => (
        <button key={r.law + r.art + r.para + r.item} onClick={() => setOpen(r)} className="jp text-[11px] px-1.5 py-0.5" style={{ background: "var(--cream)", border: "1px solid var(--gold)", color: "var(--ink)" }}>📜 {r.label}</button>
      ))}
      {open && <LawArticleModal target={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

// 条文・問題の検索パネル（画面上部の「📜 条文」から開く）
function LawSearchPanel({ banks, onClose }) {
  const [lawKey, setLawKey] = useState("all");
  const [query, setQuery] = useState("");
  const [laws, setLaws] = useState({}); // key → data | null
  const [open, setOpen] = useState(null);
  const [openQ, setOpenQ] = useState(null);
  const [view, setView] = useState("law"); // law | q
  const targetKeys = lawKey === "all" ? LAWS.map((l) => l.key) : [lawKey];
  const qn = normalizeLawText(query.trim());

  useEffect(() => {
    if (qn.length === 0) return;
    let alive = true;
    targetKeys.forEach((k) => { if (!(k in laws)) loadLaw(k).then((d) => { if (alive) setLaws((prev) => ({ ...prev, [k]: d })); }); });
    return () => { alive = false; };
  }, [qn, lawKey]);

  // 条文番号での指定（例：規則35条、177条、35条の2、177）
  let direct = null;
  if (qn) {
    const refs = extractLawRefs([/^\d+$/.test(qn) ? `${qn}条` : qn]);
    if (refs.length > 0) {
      const r = refs[0];
      const hasAlias = LAW_ALIAS_LIST.some((x) => qn.startsWith(x.alias));
      direct = hasAlias || lawKey === "all" ? r : { ...r, law: lawKey, label: LAW_BY_KEY[lawKey].short + r.label.replace(/^\D+?(?=\d)/, "") };
    }
  }

  // キーワード検索（2文字以上）
  const lawHits = [];
  const qHits = [];
  if (qn.length >= 2 && !/^\d+$/.test(qn)) {
    for (const k of targetKeys) {
      const d = laws[k];
      if (!d) continue;
      for (const a of d.articles) {
        if (lawHits.length >= 60) break;
        const text = articleFullText(a);
        const i = text.indexOf(qn);
        if (i >= 0) lawHits.push({ law: k, a, snippet: text.slice(Math.max(0, i - 25), i + qn.length + 35), at: Math.min(25, i) });
      }
    }
  }
  if (qn.length >= 2) {
    const ref = direct;
    for (const b of banks || []) for (const q of b.questions || []) {
      if (qHits.length >= 60) break;
      const hitText = (q.q || "").includes(qn) || (q.a || "").includes(qn) || normalizeLawText(q.a).includes(qn);
      const hitRef = ref && extractLawRefs([q.q, q.a]).some((r) => sameArticle(r, ref));
      if (hitText || hitRef) qHits.push({ bank: b, q });
    }
  }
  const loading = qn.length >= 2 && targetKeys.some((k) => !(k in laws));
  const missing = targetKeys.filter((k) => laws[k] === null);

  return (
    <div className="rpg-box mb-4 p-1">
      <div className="rpg-inner-border">
        <div className="flex items-center justify-between mb-2">
          <div className="jp text-sm" style={{ color: "var(--ink)" }}>📜 条文・キーワード検索</div>
          <button onClick={onClose} className="jp text-[10px] px-1.5 py-0.5" style={{ border: "1px solid var(--rule-soft)", background: "var(--paper)", color: "var(--ink-soft)" }}>✕ 閉じる</button>
        </div>
        <div className="flex gap-1 mb-2 flex-wrap">
          {[{ key: "all", short: "すべて" }, ...LAWS].map((l) => (
            <button key={l.key} onClick={() => setLawKey(l.key)} className="jp text-[11px] px-2 py-1" style={{ background: lawKey === l.key ? "var(--sky-deep)" : "var(--paper)", color: lawKey === l.key ? "var(--paper)" : "var(--ink)", border: "1px solid var(--rule)" }}>{l.short}</button>
          ))}
        </div>
        <input className="rpg-input mb-2" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="例：規則35条 ／ 177 ／ 合筆 ／ 表題部所有者" />
        {direct && (
          <button onClick={() => setOpen(direct)} className="jp btn-primary w-full py-2 mb-2 text-sm">📜 {LAW_BY_KEY[direct.law].name} {direct.label.replace(LAW_BY_KEY[direct.law].short, "")} を開く</button>
        )}
        {qn.length >= 2 && (
          <>
            <div className="grid grid-cols-2 gap-1 mb-2">
              <button onClick={() => setView("law")} className="jp text-xs py-1" style={{ background: view === "law" ? "var(--gold)" : "var(--paper)", color: view === "law" ? "var(--paper)" : "var(--ink)", border: "1px solid var(--rule)" }}>条文（{lawHits.length}{lawHits.length >= 60 ? "+" : ""}）</button>
              <button onClick={() => setView("q")} className="jp text-xs py-1" style={{ background: view === "q" ? "var(--gold)" : "var(--paper)", color: view === "q" ? "var(--paper)" : "var(--ink)", border: "1px solid var(--rule)" }}>問題（{qHits.length}{qHits.length >= 60 ? "+" : ""}）</button>
            </div>
            {view === "law" && (
              <div className="space-y-1" style={{ maxHeight: 360, overflowY: "auto" }}>
                {loading && <p className="jp text-[11px]" style={{ color: "var(--ink-mute)" }}>条文を読み込み中…</p>}
                {missing.length > 0 && <p className="jp text-[11px]" style={{ color: "var(--brick)" }}>条文データがありません：{missing.map((k) => LAW_BY_KEY[k].name).join("・")}</p>}
                {lawHits.map(({ law, a, snippet, at }) => (
                  <button key={law + a.n} onClick={() => setOpen({ law, art: a.n, para: null, item: null })} className="w-full text-left p-1.5" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)" }}>
                    <div className="jp text-[11px]" style={{ color: "var(--sky-deep)" }}>{LAW_BY_KEY[law].name} {a.t}{a.c}</div>
                    <div className="qtext-list jp text-[11px]" style={{ color: "var(--ink-soft)" }}>
                      …{snippet.slice(0, at)}<mark style={{ background: "var(--hl, #fff3b0)" }}>{snippet.slice(at, at + qn.length)}</mark>{snippet.slice(at + qn.length)}…
                    </div>
                  </button>
                ))}
                {!loading && lawHits.length === 0 && missing.length < targetKeys.length && <p className="jp text-[11px]" style={{ color: "var(--ink-mute)" }}>条文に「{qn}」は見つかりませんでした。</p>}
              </div>
            )}
            {view === "q" && (
              <div className="space-y-1" style={{ maxHeight: 360, overflowY: "auto" }}>
                {qHits.length === 0 && <p className="jp text-[11px]" style={{ color: "var(--ink-mute)" }}>該当する問題はありません。</p>}
                {qHits.map(({ bank, q }) => (
                  <button key={bank.id + q.id} onClick={() => setOpenQ(openQ === q.id ? null : q.id)} className="w-full text-left p-1.5" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)" }}>
                    <div className="jp text-[10px]" style={{ color: "var(--ink-mute)" }}>{bank.name}{bank.year ? ` ・ ${bank.year}` : ""}</div>
                    <div className="qtext-list jp text-xs" style={{ color: "var(--ink)" }}>{openQ === q.id ? q.q : String(q.q || "").slice(0, 70) + (String(q.q || "").length > 70 ? "…" : "")}</div>
                    {openQ === q.id && <div className="qtext-list jp text-xs mt-1 p-1" style={{ background: "var(--sky-pale)", color: "var(--ink)" }}>{q.a}</div>}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        {qn.length === 1 && !direct && <p className="jp text-[11px]" style={{ color: "var(--ink-mute)" }}>キーワードは2文字以上入力してください</p>}
        <p className="jp text-[10px] mt-2" style={{ color: "var(--ink-mute)" }}>条文番号（例：規則35条、民法177条）で開くか、キーワードで条文と問題をまとめて探せます。出典：e-Gov法令検索</p>
      </div>
      {open && <LawArticleModal target={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

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

function LapRecordsPanel({ state }) {
  const [expanded, setExpanded] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const fmt = (d) => { const p = String(d || "").split("-"); return p.length === 3 ? `${p[0]}/${Number(p[1])}/${Number(p[2])}` : (d || "-"); };
  const rows = state.questionBanks
    .map((b) => {
      const hist = Array.isArray(b.clearHistory) ? b.clearHistory : [];
      const total = Math.max(b.clears || 0, hist.length);           // 周回数（手動で編集した分も含む）
      return { b, hist, total, before: total - hist.length, last: hist.length ? hist[hist.length - 1] : null };
    })
    .filter((r) => r.total > 0)
    .sort((x, y) => String((y.last && y.last.date) || "").localeCompare(String((x.last && x.last.date) || "")));
  if (rows.length === 0) return null;
  const shown = showAll ? rows : rows.slice(0, 5);
  const accText = (h) => (typeof h.accuracy === "number" ? `${h.accuracy}%` : "-");
  return (
    <Box title="周回の記録" icon={<Award size={18} />}>
      <p className="jp text-[11px] mb-2" style={{ color: "var(--ink-soft)" }}>最近完全制覇した順です。タップすると、各周の日付と正答率を表示します。</p>
      <div className="space-y-1">
        {shown.map(({ b, hist, total, before, last }) => (
          <div key={b.id} style={{ border: "1px solid var(--rule-soft)", background: "var(--paper)" }}>
            <button onClick={() => setExpanded(expanded === b.id ? null : b.id)} className="w-full text-left p-2 flex items-center gap-2" style={{ background: "transparent", border: "none" }}>
              <div className="flex-1 min-w-0">
                <div className="jp text-xs flex items-center gap-1 flex-wrap" style={{ color: "var(--ink)" }}>
                  {b.year && <span className="jp text-[10px] px-1" style={{ background: "var(--gold)", color: "var(--paper)" }}>{b.year}</span>}
                  <span>{b.name}</span>
                </div>
                <div className="jp text-[10px] mt-0.5" style={{ color: "var(--ink-soft)" }}>
                  {last ? `最新：${total}周目 ${fmt(last.date)}` : `${total}周（日付の記録なし）`}
                  {hist.length > 0 && ` ・ 正答率 ${hist.slice(-3).map(accText).join(" → ")}`}
                </div>
              </div>
              <span className="pixel text-[10px] px-1 flex-shrink-0" style={{ background: "var(--brick)", color: "var(--paper)" }}>{total}周</span>
              <span className="jp text-[10px] flex-shrink-0" style={{ color: "var(--ink-mute)" }}>{expanded === b.id ? "▲" : "▼"}</span>
            </button>
            {expanded === b.id && (
              <div className="px-2 pb-2 space-y-1">
                {hist.length === 0 && <p className="jp text-[11px]" style={{ color: "var(--ink-mute)" }}>日付の記録はまだありません（次に完全制覇したときから記録されます）。</p>}
                {hist.map((h, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 jp text-xs px-2 py-1" style={{ background: i % 2 ? "var(--paper)" : "var(--sky-pale)", border: "1px solid var(--rule-soft)" }}>
                    <span style={{ color: "var(--ink)", minWidth: 52 }}>{before + i + 1}周目</span>
                    <span style={{ color: "var(--ink-soft)" }}>{fmt(h.date)}</span>
                    <span style={{ color: "var(--sky-deep)", minWidth: 90, textAlign: "right" }}>正答率 {accText(h)}</span>
                  </div>
                ))}
                {before > 0 && hist.length > 0 && <p className="jp text-[10px]" style={{ color: "var(--ink-mute)" }}>※ 記録を始める前に {before} 周しています</p>}
              </div>
            )}
          </div>
        ))}
      </div>
      {rows.length > 5 && (
        <button onClick={() => setShowAll(!showAll)} className="jp text-[11px] w-full mt-2 py-1" style={{ background: "transparent", border: "1px dashed var(--rule-soft)", color: "var(--ink-soft)" }}>
          {showAll ? "▲ 最近の5件だけ表示" : `▼ すべて表示（${rows.length}件）`}
        </button>
      )}
    </Box>
  );
}

// ============ 冒険（RPG・育成要素） ============
// ゴールド・装備・消費アイテム・ボス戦・実績。データは state.rpg に保存する。
const RARITY = {
  N:   { color: "#8696b0", sell: 30 },
  R:   { color: "#4f8eb3", sell: 150 },
  SR:  { color: "#8a6ca6", sell: 500 },
  SSR: { color: "#b8862c", sell: 1500 },
};
const RPG_ITEMS = [
  // 武器
  { id: "w-staff",     slot: "weapon",    name: "見習いの杖",     icon: "🪄", rarity: "N",   price: 100, fx: { bossDmgPct: 5 } },
  { id: "w-pen",       slot: "weapon",    name: "白銀の羽ペン",   icon: "🖋️", rarity: "N",   price: 150, fx: { critPct: 2 } },
  { id: "w-chain",     slot: "weapon",    name: "測量の鎖剣",     icon: "⛓️", rarity: "R",   price: 600, fx: { bossDmgPct: 15, critPct: 2 } },
  { id: "w-holy",      slot: "weapon",    name: "登記の聖剣",     icon: "🗡️", rarity: "SR",  fx: { bossDmgPct: 30, critPct: 5 } },
  { id: "w-divine",    slot: "weapon",    name: "地籍の神剣",     icon: "⚔️", rarity: "SSR", fx: { bossDmgPct: 50, critPct: 8, xpPct: 10 } },
  // 防具
  { id: "a-robe",      slot: "armor",     name: "布のローブ",     icon: "🥋", rarity: "N",   price: 100, fx: { hpPlus: 10 } },
  { id: "a-vest",      slot: "armor",     name: "調査士の胸当て", icon: "🦺", rarity: "N",   price: 150, fx: { dmgCutPct: 8 } },
  { id: "a-coat",      slot: "armor",     name: "製図士のコート", icon: "🧥", rarity: "R",   price: 600, fx: { hpPlus: 20, dmgCutPct: 10 } },
  { id: "a-border",    slot: "armor",     name: "境界の盾",       icon: "🛡️", rarity: "SR",  fx: { hpPlus: 30, dmgCutPct: 25 } },
  { id: "a-immovable", slot: "armor",     name: "不動の兜",       icon: "🏯", rarity: "SSR", fx: { hpPlus: 50, dmgCutPct: 40 } },
  // アクセサリー
  { id: "x-compass",   slot: "accessory", name: "幸運のコンパス", icon: "🧭", rarity: "N",   price: 200, fx: { critPct: 3 } },
  { id: "x-glasses",   slot: "accessory", name: "学者の砂時計",   icon: "👓", rarity: "R",   price: 700, fx: { xpPct: 10 } },
  { id: "x-level",     slot: "accessory", name: "黄金の天球儀",   icon: "📐", rarity: "SR",  fx: { goldPct: 30, xpPct: 10 } },
  { id: "x-charm",     slot: "accessory", name: "公図の護符",     icon: "🗺️", rarity: "SSR", fx: { xpPct: 20, critPct: 5, goldPct: 20 } },
  // アイテム図鑑の装備（絵は public/art/items/c01〜c12）
  { id: "w-bow",       slot: "weapon",    name: "風翔の弓",       icon: "🏹", rarity: "R",   price: 650, fx: { bossDmgPct: 12, critPct: 4 } },
  { id: "w-tome",      slot: "weapon",    name: "古代の魔導書",   icon: "📖", rarity: "SR",  fx: { bossDmgPct: 20, xpPct: 8 } },
  { id: "w-sky",       slot: "weapon",    name: "蒼天の剣",       icon: "🗡️", rarity: "SR",  fx: { bossDmgPct: 28, critPct: 6 } },
  { id: "w-star",      slot: "weapon",    name: "星詠の杖",       icon: "🪄", rarity: "SSR", fx: { bossDmgPct: 45, xpPct: 12 } },
  { id: "a-uniform",   slot: "armor",     name: "学園の制服",     icon: "👔", rarity: "N",   price: 120, fx: { hpPlus: 8, xpPct: 2 } },
  { id: "a-mantle",    slot: "armor",     name: "精霊のマント",   icon: "🧥", rarity: "R",   price: 650, fx: { hpPlus: 15, dmgCutPct: 12 } },
  { id: "a-dragon",    slot: "armor",     name: "竜鱗の鎧",       icon: "🛡️", rarity: "SR",  fx: { hpPlus: 35, dmgCutPct: 22 } },
  { id: "a-angel",     slot: "armor",     name: "天使のローブ",   icon: "👘", rarity: "SSR", fx: { hpPlus: 45, dmgCutPct: 35, xpPct: 5 } },
  { id: "x-brooch",    slot: "accessory", name: "記憶のブローチ", icon: "⭐", rarity: "N",   price: 180, fx: { xpPct: 5 } },
  { id: "x-bracelet",  slot: "accessory", name: "幸運のブレスレット", icon: "📿", rarity: "R", price: 750, fx: { critPct: 4, goldPct: 10 } },
  { id: "x-pendant",   slot: "accessory", name: "旅人のペンダント", icon: "💠", rarity: "SR", fx: { hpPlus: 15, goldPct: 20 } },
  { id: "x-ring",      slot: "accessory", name: "知の指輪",       icon: "💍", rarity: "SSR", fx: { xpPct: 18, bossDmgPct: 15, critPct: 4 } },
];
const RPG_SLOTS = [
  { id: "weapon", label: "武器" },
  { id: "armor", label: "防具" },
  { id: "accessory", label: "アクセサリー" },
];
const RPG_CONSUMABLES = [
  { id: "potion",     name: "回復薬",         icon: "🧪", price: 50,  desc: "ボス戦でHPを40回復する" },
  { id: "xpBook",     name: "経験値の書",     icon: "📕", price: 300, desc: "30分間、獲得EXPが2倍になる" },
  { id: "restTicket", name: "休息のランタン", icon: "🎫", price: 400, desc: "学習できなかった昨日を、連続学習日数に数える" },
];
const RPG_BOSSES = [
  { id: "slime",  name: "境界のスライム", icon: "🟢", hp: 60,  atk: 12, art: "slimeking" },
  { id: "ghost",  name: "地番の亡霊",     icon: "👻", hp: 90,  atk: 15, art: "ghost" },
  { id: "golem",  name: "分筆ゴーレム",   icon: "🗿", hp: 120, atk: 18, art: "magolem" },
  { id: "dragon", name: "合筆ドラゴン",   icon: "🐉", hp: 160, atk: 22, art: "darkdragon" },
  { id: "shadow", name: "登記官の影",     icon: "🦹", hp: 200, atk: 26, art: "grimoire" },
  { id: "maou",   name: "地籍の魔王",     icon: "👹", hp: 260, atk: 30 },
];
const FX_LABELS = {
  xpPct: (v) => `EXP+${v}%`, critPct: (v) => `会心率+${v}%`, goldPct: (v) => `ゴールド+${v}%`,
  bossDmgPct: (v) => `攻撃+${v}%`, dmgCutPct: (v) => `被ダメージ-${v}%`, hpPlus: (v) => `HP+${v}`,
};
Object.assign(FX_LABELS, {
  dropPct: (v) => `素材ドロップ+${v}%`, comboXp: (v) => `必殺技でEXP+${v}`, forgePct: (v) => `強化成功率+${v}%`, revivePct: (v) => `ふんばり回復+${v}%`,
});
const fxText = (fx) => Object.entries(fx || {}).map(([k, v]) => (FX_LABELS[k] ? FX_LABELS[k](v) : "")).filter(Boolean).join("・");

// ── 素材：魔物を倒すと落とす。欠片は科目ごと、星霊石は手強い魔物、賢者の結晶はコンボの必殺技から ──
const RPG_MATERIALS = [
  { id: "m-chiban", name: "地番の欠片", color: "#7fa3d8", dark: "#34508c", kind: "frag" },
  { id: "m-keiyaku", name: "契約の欠片", color: "#86bd70", dark: "#4f7a3a", kind: "frag" },
  { id: "m-kyoyo", name: "共用の欠片", color: "#a593d8", dark: "#5e4d93", kind: "frag" },
  { id: "m-chokai", name: "懲戒の欠片", color: "#d6b56a", dark: "#8f6f2c", kind: "frag" },
  { id: "m-zahyo", name: "座標の欠片", color: "#6fb8b4", dark: "#2f6f6c", kind: "frag" },
  { id: "m-shoshiki", name: "書式の欠片", color: "#e3908a", dark: "#9a4d47", kind: "frag" },
  { id: "m-meikyu", name: "迷宮の欠片", color: "#a7afc2", dark: "#5b6b8c", kind: "frag" },
  { id: "m-star", name: "星霊石", color: "#c9a6e8", dark: "#6c5a96", kind: "star", desc: "手強い魔物（苦手な問題）を倒すと落とす" },
  { id: "m-sage", name: "賢者の結晶", color: "#f2c14e", dark: "#a8833a", kind: "sage", desc: "10コンボごとの必殺技で手に入る" },
];
const matById = (id) => RPG_MATERIALS.find((m) => m.id === id) || null;
const FRAG_IDS = RPG_MATERIALS.filter((m) => m.kind === "frag").map((m) => m.id);
const fragCount = (mats) => FRAG_IDS.reduce((a, id) => a + Math.max(0, (mats && mats[id]) || 0), 0);
// 欠片を n 個使う（多く持っている種類から順に）。足りなければ null
function takeFrags(mats, n) {
  const m = { ...(mats || {}) };
  if (fragCount(m) < n) return null;
  let left = n;
  while (left > 0) {
    const id = FRAG_IDS.reduce((best, k) => ((m[k] || 0) > (m[best] || 0) ? k : best), FRAG_IDS[0]);
    m[id] = (m[id] || 0) - 1; left--;
  }
  return m;
}
const MAT_PAINTED = { "m-star": "c26", "m-sage": "c17" }; // 星霊石＝スタディストーン、賢者の結晶＝魔鉱石の絵
function MaterialIcon({ id, size = 28 }) {
  const m = matById(id);
  if (!m) return null;
  if (MAT_PAINTED[id]) return <img src={paintedUrl(MAT_PAINTED[id])} alt={m.name} width={size} height={size} style={{ flexShrink: 0, borderRadius: "50%", objectFit: "cover", border: `1.5px solid ${m.dark}`, boxShadow: `0 0 5px ${m.color}` }} />;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style={{ flexShrink: 0, filter: m.kind !== "frag" ? `drop-shadow(0 0 4px ${m.color})` : undefined }}>
      {m.kind === "frag" ? (<>
        <path d="M9 6l11-2 7 10-6 14-13-3-4-10z" fill={m.color} stroke={m.dark} strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M9 6l7 9 11-1M16 15l-8 10M16 15l5 13" fill="none" stroke={m.dark} strokeWidth=".8" opacity=".55" />
        <path d="M11 9l4 5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".75" />
      </>) : m.kind === "star" ? (<>
        <path d="M16 2l3.6 8.4L28 12l-6.4 6 1.8 9L16 22.4 8.6 27l1.8-9L4 12l8.4-1.6z" fill={m.color} stroke={m.dark} strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M16 8l1.8 4.6 4.6.6-3.4 3 1 4.6L16 18.6l-4 2.2 1-4.6-3.4-3 4.6-.6z" fill="#fff" opacity=".45" />
      </>) : (<>
        <path d="M16 2l8 8-3 18H11L8 10z" fill={m.color} stroke={m.dark} strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M8 10h16M16 2v26M12 10l4 18 4-18" fill="none" stroke={m.dark} strokeWidth=".8" opacity=".5" />
        <path d="M11 7l3-3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" opacity=".85" />
      </>)}
    </svg>
  );
}

// ── スキルツリー：レベルが1上がるごとにスキルポイント1。3つの道に5つずつ、上から順に覚える ──
const SKILL_TREE = [
  { id: "sword", name: "剣の道", sub: "攻撃・会心", color: "#a24a45", nodes: [
    { id: "a1", name: "鋭刃", cost: 1, fx: { critPct: 2 } },
    { id: "a2", name: "魔力の刃", cost: 1, fx: { bossDmgPct: 10 } },
    { id: "a3", name: "連撃の心得", cost: 2, fx: { comboXp: 10 } },
    { id: "a4", name: "会心の極意", cost: 2, fx: { critPct: 3 } },
    { id: "a5", name: "大賢者の審判", cost: 3, fx: { bossDmgPct: 20, critPct: 2 } },
  ] },
  { id: "book", name: "叡智の書", sub: "経験値・素材", color: "#34508c", nodes: [
    { id: "b1", name: "探究心", cost: 1, fx: { xpPct: 3 } },
    { id: "b2", name: "鑑定眼", cost: 1, fx: { dropPct: 25 } },
    { id: "b3", name: "復習の加護", cost: 2, fx: { xpPct: 5 } },
    { id: "b4", name: "錬金術", cost: 2, fx: { forgePct: 10 } },
    { id: "b5", name: "叡智の泉", cost: 3, fx: { xpPct: 10, goldPct: 10 } },
  ] },
  { id: "shield", name: "守護の盾", sub: "HP・守り", color: "#4f8a72", nodes: [
    { id: "c1", name: "鉄の意志", cost: 1, fx: { hpPlus: 15 } },
    { id: "c2", name: "受け流し", cost: 1, fx: { dmgCutPct: 5 } },
    { id: "c3", name: "不屈", cost: 2, fx: { revivePct: 20 } },
    { id: "c4", name: "黄金の守り", cost: 2, fx: { goldPct: 10 } },
    { id: "c5", name: "不動の構え", cost: 3, fx: { hpPlus: 30, dmgCutPct: 10 } },
  ] },
];
const SKILL_RESET_COST = 500;
const skillNodes = SKILL_TREE.flatMap((b) => b.nodes.map((n, i) => ({ ...n, branch: b, idx: i })));
const skillPointsTotal = (state) => Math.max(0, (state.player.level || 1) - 1);
const skillPointsUsed = (r) => (r.skills || []).reduce((a, id) => a + ((skillNodes.find((n) => n.id === id) || {}).cost || 0), 0);

// ── 装備の強化（+1〜+10）：効果は1段階ごとに元の12%ずつ上がる ──
const FORGE_MAX = 10;
const forgedFx = (fx, p) => (p ? Object.fromEntries(Object.entries(fx || {}).map(([k, v]) => [k, Math.round(v * (1 + 0.12 * p) * 10) / 10])) : fx);
// 持ち物1つ（{u, i, p}）を、強化を反映した装備データにする
const rpgInvItem = (v) => { const it = v ? rpgItemById(v.i) : null; if (!it) return null; const p = v.p || 0; return { ...it, plus: p, fx: forgedFx(it.fx, p), label: p ? `${it.name} +${p}` : it.name }; };
function forgeCost(it, p, forgePct = 0) {
  const base = { N: 60, R: 150, SR: 300, SSR: 500 }[it.rarity] || 100;
  return { gold: base * (p + 1), frag: 2 + p * 2, star: p >= 3 ? p - 2 : 0, sage: p >= 7 ? 1 : 0, rate: Math.min(100, Math.max(30, 100 - Math.max(0, p - 2) * 10) + forgePct) };
}

const RPG_DEFAULTS = {
  gold: 0, goldEarned: 0, inventory: [], consumables: { potion: 1, xpBook: 0, restTicket: 0 },
  equipped: { weapon: null, armor: null, accessory: null }, bossWins: 0, bossLosses: 0, bossLog: [],
  boosts: { xpUntil: null }, restDays: [], crits: 0,
  classId: null, pet: null, seen: { stars: 0, pet: 0 },
  materials: {}, skills: [], forgeLog: { ok: 0, ng: 0 }, daily: null, storySeen: -1, weekly: null, dungeon: null, regions: {}, castle: { floor: 0 }, cats: {}, journey: { pos: 0, acc: 0, lap: 0, log: [] }, sq: {}, powerLog: [], reportWeek: null, shoshiki: [], login: { count: 0 }, tower: { floor: 0, best: {} }, secBoss: {}, arcSeen: {}, conquered: {}, drill: [], rehearsal: { log: [], cfg: null }, cloze: { log: [], miss: {} }, rival: null, bonds: {}, bondSeen: {}, countdown: null, shinsei: [], pairsOk: {}, season: null, sakuzu: [], jobRank: {},
};
function normRpg(r) {
  const x = { ...RPG_DEFAULTS, ...(r || {}) };
  x.consumables = { ...RPG_DEFAULTS.consumables, ...(x.consumables || {}) };
  x.equipped = { ...RPG_DEFAULTS.equipped, ...(x.equipped || {}) };
  x.boosts = { ...RPG_DEFAULTS.boosts, ...(x.boosts || {}) };
  x.inventory = Array.isArray(x.inventory) ? x.inventory : [];
  x.bossLog = Array.isArray(x.bossLog) ? x.bossLog : [];
  x.restDays = Array.isArray(x.restDays) ? x.restDays : [];
  x.seen = { ...RPG_DEFAULTS.seen, ...(x.seen || {}) };
  x.materials = { ...(x.materials || {}) };
  x.skills = Array.isArray(x.skills) ? x.skills : [];
  x.forgeLog = { ...RPG_DEFAULTS.forgeLog, ...(x.forgeLog || {}) };
  if (typeof x.storySeen !== "number") x.storySeen = -1;
  x.regions = { ...(x.regions || {}) };
  x.castle = { floor: 0, ...(x.castle || {}) };
  x.cats = { ...(x.cats || {}) };
  x.sq = { ...(x.sq || {}) };
  x.tower = { floor: 0, best: {}, ...(x.tower || {}) };
  x.secBoss = { ...(x.secBoss || {}) };
  x.arcSeen = { ...(x.arcSeen || {}) };
  x.conquered = { ...(x.conquered || {}) };
  x.powerLog = Array.isArray(x.powerLog) ? x.powerLog : [];
  x.shoshiki = Array.isArray(x.shoshiki) ? x.shoshiki : [];
  x.drill = Array.isArray(x.drill) ? x.drill : [];
  x.rehearsal = { log: [], cfg: null, ...(x.rehearsal || {}) };
  if (!Array.isArray(x.rehearsal.log)) x.rehearsal.log = [];
  x.cloze = { log: [], miss: {}, ...(x.cloze || {}) };
  x.bonds = { ...(x.bonds || {}) };
  x.shinsei = Array.isArray(x.shinsei) ? x.shinsei : [];
  x.pairsOk = { ...(x.pairsOk || {}) };
  x.sakuzu = Array.isArray(x.sakuzu) ? x.sakuzu : [];
  x.bondSeen = { ...(x.bondSeen || {}) };
  if (!Array.isArray(x.cloze.log)) x.cloze.log = [];
  x.journey = { pos: 0, acc: 0, lap: 0, log: [], ...(x.journey || {}) };
  return x;
}
const rpgItemById = (id) => RPG_ITEMS.find((i) => i.id === id) || null;
const rpgEquippedItems = (r) => RPG_SLOTS.map((s) => rpgInvItem(r.inventory.find((v) => v.u === r.equipped[s.id]))).filter(Boolean);

// 装備とステータスから、実際の効果を計算する
function getRpgBonuses(state) {
  const r = normRpg(state.rpg);
  const eq = rpgEquippedItems(r);
  const gfx = [...getGrowthFx(state), ...r.skills.map((id) => (skillNodes.find((n) => n.id === id) || {}).fx || {}), ...Object.keys(r.regions || {}).filter((k) => r.regions[k].cleared).map((k) => regionInfo(k).emblem.fx), ...activeEvents(state).map((e) => e.fx), ...alliesJoined(r).map((a) => bondFx(a, r))]; // クラス・相棒・覚醒・スキル・地域の紋章・季節のイベント・仲間
  const sum = (k) => eq.reduce((a, it) => a + ((it.fx && it.fx[k]) || 0), 0) + gfx.reduce((a, f) => a + (f[k] || 0), 0);
  const st = calculateStatus(state);
  const boostActive = !!(r.boosts.xpUntil && Date.now() < r.boosts.xpUntil);
  return {
    critPct: Math.min(35, 3 + Math.floor(st.luk / 25) + sum("critPct")),              // LUK・装備で会心率アップ
    xpPct: sum("xpPct") + (boostActive ? 100 : 0),
    goldPct: sum("goldPct"),
    bossDmgPct: sum("bossDmgPct") + Math.min(50, Math.floor(st.int / 40)),            // INTで攻撃力アップ
    dmgCutPct: Math.min(60, sum("dmgCutPct") + Math.min(20, Math.floor(st.def / 20))), // DEFで被ダメージ軽減
    maxHp: Math.min(200, 60 + st.currentStreak * 5 + Math.floor(state.player.level * 2)) + Math.round(sum("hpPlus")), // 連続学習・レベルでHPアップ
    dropPct: sum("dropPct"),       // 素材が落ちる確率（スキル）
    comboXp: sum("comboXp"),       // 必殺技のときのEXP（スキル）
    forgePct: sum("forgePct"),     // 強化の成功率（スキル）
    revivePct: sum("revivePct"),   // ふんばりで回復するHP（スキル）
    boostActive,
  };
}

// レア度を抽選してアイテムを1つ選ぶ（luck が大きいほどレアが出やすい）
function rollRpgItem(luck = 0) {
  const w = { N: Math.max(20, 60 - luck * 8), R: 28 + luck * 3, SR: 10 + luck * 3, SSR: 2 + luck * 1.5 };
  const total = w.N + w.R + w.SR + w.SSR;
  let x = Math.random() * total;
  let rarity = "N";
  for (const k of ["N", "R", "SR", "SSR"]) { if (x < w[k]) { rarity = k; break; } x -= w[k]; }
  const pool = RPG_ITEMS.filter((i) => i.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)].id;
}

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

const RPG_ACHIEVEMENTS = [
  { id: "rpg-lap1",      title: "初めての完全制覇", icon: "🎌", color: "#b8862c", desc: "問題集を初めて最後まで解き切った。",     hint: "問題集を1回完全制覇",     test: ({ st }) => st.totalClears >= 1 },
  { id: "rpg-lap30",     title: "周回の鬼",         icon: "🌀", color: "#a04848", desc: "完全制覇を30回重ねた。",                 hint: "完全制覇を合計30回",       test: ({ st }) => st.totalClears >= 30 },
  { id: "rpg-qa1000",    title: "千問の踏破者",     icon: "🥾", color: "#5d7894", desc: "1000問に挑んだ。",                       hint: "解答数1000問",             test: ({ state }) => (state.player.totalQaAnswered || 0) >= 1000 },
  { id: "rpg-qa10000",   title: "万問の賢者",       icon: "🦉", color: "#8a6ca6", desc: "10000問に挑んだ。",                      hint: "解答数10000問",            test: ({ state }) => (state.player.totalQaAnswered || 0) >= 10000 },
  { id: "rpg-streak7",   title: "継続は力なり",     icon: "🔥", color: "#a04848", desc: "7日連続で学習した。",                    hint: "7日連続で学習",            test: ({ st }) => st.currentStreak >= 7 },
  { id: "rpg-streak30",  title: "不屈の三十日",     icon: "🌋", color: "#a04848", desc: "30日連続で学習した。",                   hint: "30日連続で学習",           test: ({ st }) => st.currentStreak >= 30 },
  { id: "rpg-boss1",     title: "初陣の勝利",       icon: "⚔️", color: "#6d8454", desc: "初めてボスを倒した。",                   hint: "ボスを1体倒す",            test: ({ r }) => r.bossWins >= 1 },
  { id: "rpg-boss10",    title: "ボスハンター",     icon: "🏹", color: "#6d8454", desc: "ボスを10体倒した。",                     hint: "ボスを10体倒す",           test: ({ r }) => r.bossWins >= 10 },
  { id: "rpg-maou",      title: "魔王討伐者",       icon: "👑", color: "#b8862c", desc: "地籍の魔王を打ち倒した。",               hint: "6体目のボスを倒す",        test: ({ r }) => r.bossWins >= 6 },
  { id: "rpg-collector", title: "収集家",           icon: "🎒", color: "#4f8eb3", desc: "8種類の装備を集めた。",                  hint: "装備を8種類集める",        test: ({ r }) => new Set(r.inventory.map((v) => v.i)).size >= 8 },
  { id: "rpg-legend",    title: "伝説の担い手",     icon: "🌟", color: "#b8862c", desc: "SSRの装備を手に入れた。",                hint: "SSRの装備を手に入れる",    test: ({ r }) => r.inventory.some((v) => (rpgItemById(v.i) || {}).rarity === "SSR") },
  { id: "rpg-rich",      title: "黄金の調査士",     icon: "💰", color: "#b8862c", desc: "累計10000ゴールドを稼いだ。",            hint: "累計10000ゴールド",        test: ({ r }) => r.goldEarned >= 10000 },
  { id: "rpg-crit100",   title: "会心の使い手",     icon: "💥", color: "#a04848", desc: "会心の一撃を100回出した。",              hint: "会心の一撃を100回",        test: ({ r }) => r.crits >= 100 },
];

// ── 次に取れそうな称号：まだ持っていない称号の「いまの値 / 必要な値」を集め、近い順に並べる ──
const ACH_PROGRESS = {
  "rpg-lap1": ({ st }) => [st.totalClears, 1, "回"], "rpg-lap30": ({ st }) => [st.totalClears, 30, "回"],
  "rpg-qa1000": ({ state }) => [state.player.totalQaAnswered || 0, 1000, "問"], "rpg-qa10000": ({ state }) => [state.player.totalQaAnswered || 0, 10000, "問"],
  "rpg-streak7": ({ st }) => [st.currentStreak, 7, "日"], "rpg-streak30": ({ st }) => [st.currentStreak, 30, "日"],
  "rpg-boss1": ({ r }) => [r.bossWins, 1, "体"], "rpg-boss10": ({ r }) => [r.bossWins, 10, "体"], "rpg-maou": ({ r }) => [r.bossWins, 6, "体"],
  "rpg-collector": ({ r }) => [new Set(r.inventory.map((v) => v.i)).size, 8, "種類"],
  "rpg-rich": ({ r }) => [r.goldEarned, 10000, "G"], "rpg-crit100": ({ r }) => [r.crits, 100, "回"],
};
function nextTitles(state, n = 3) {
  const r = normRpg(state.rpg);
  const st = calculateStatus(state);
  const have = new Set(state.player.achievements.map((a) => a.id));
  const out = [];
  RPG_ACHIEVEMENTS.forEach((a) => {
    if (have.has(a.id) || !ACH_PROGRESS[a.id]) return;
    const [cur, goal, unit] = ACH_PROGRESS[a.id]({ state, r, st });
    if (cur >= goal) return;
    out.push({ id: a.id, icon: a.icon, title: a.title, how: a.hint, cur, goal, unit, ratio: cur / goal });
  });
  // レベルの称号
  const lv = state.player.level || 1;
  const nl = LEVEL_TITLES.find((e) => e.lv > lv);
  if (nl) { const prev = [...LEVEL_TITLES].reverse().find((e) => e.lv <= lv) || { lv: 1 }; out.push({ id: "lv", icon: "🧙", title: nl.title, how: `レベル${nl.lv}になる`, cur: lv, goal: nl.lv, unit: "Lv", ratio: (lv - prev.lv) / Math.max(1, nl.lv - prev.lv), lvMode: true }); }
  // 科目ごとのジョブ
  subjectJobs(state).forEach((j) => {
    const nx = JOB_RANKS.find(([l]) => l > j.lv);
    if (!nx) return;
    const goal = jobXpFor(nx[0]), base = jobXpFor(j.rankLv);
    out.push({ id: `job-${j.region}`, icon: "🎓", title: `${j.subj}の${nx[1]}`, how: `${j.subj}の正解を重ね、問題を定着させる（定着は1問で5）`, cur: j.xp, goal, unit: "経験値", ratio: (j.xp - base) / Math.max(1, goal - base) });
  });
  return out.sort((a, b) => b.ratio - a.ratio).slice(0, n);
}
const titleLeft = (t) => (t.lvMode ? `あと${t.goal - t.cur}レベル` : `あと${(t.goal - t.cur).toLocaleString()}${t.unit}`);
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
              <div style={{ width: 60, height: 60, margin: "0 auto", padding: 3, borderRadius: "50%", background: got ? s.frame : "var(--rule-soft)", boxShadow: got ? s.glow : "none" }}>
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
const dexStatus = (q) => (q.excluded || (q.fs && q.fs.s >= MASTERED_STABILITY) ? 3 : (q.correct || 0) > 0 ? 2 : ((q.wrong || 0) > 0 || !!q.sr_nextReview) ? 1 : 0); // 0未発見 1発見 2討伐 3制覇
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
  const cell = (x, ok, sub, strong) => (
    <div key={x.img} className="jp text-center" style={{ padding: "4px 2px", borderRadius: 8, background: strong && ok ? "rgba(162,74,69,0.07)" : "var(--paper)", border: `1px solid ${strong && ok ? "#a24a45" : "var(--rule-soft)"}` }}>
      <div className="flex justify-center"><MonPic m={{ sp: x }} size={56} dim={ok ? 0 : 2} /></div>
      <div className="text-[9px] truncate" style={{ fontWeight: 700, color: ok ? "var(--ink)" : "var(--ink-mute)" }}>{ok ? x.name : "？？？"}</div>
      <div className="text-[8px]" style={{ color: "var(--ink-mute)" }}>{sub}</div>
    </div>
  );
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
          <p className="jp text-[10px] mt-1" style={{ color: "var(--ink-mute)" }}>問題1つ1つに魔物が宿っています。解いて出会うと、その種族が載ります。強い魔物は、ストーリーの最後の1問や試練の間にも現れます。</p>
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
                <div className="p-2" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)" }}>{renderQText(pq.q, pq.q_formats)}</div>
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

// ============ 世界と物語：合格力・最終ボス・世界地図・物語・デイリークエスト ============
// 合格力＝資格の問題すべてについて「いま思い出せる確率」（FSRSの想起率）の平均。まだ解いていない問題は0、習得済み（除外）は0.95として数える。
const PASS_LINE = 0.85; // 合格ライン（土地家屋調査士：択一17問／20問の目安）
const BASE_LINE = 0.75; // 基準点（択一15問／20問の目安）
const passCache = new Map();
function passPower(state, qualId) {
  const day = todayStr();
  const key = qualId || "_all_";
  const c = passCache.get(key);
  if (c && c.banks === state.questionBanks && c.folders === state.folders && c.day === day && c.sr === state.srSettings) return c.res;
  const sch = getFsrsScheduler(state.srSettings);
  const now = new Date();
  const regions = {};
  let total = 0, seen = 0, sumR = 0, weak = 0;
  state.questionBanks.filter((b) => !qualId || b.qualId === qualId).forEach((b) => {
    const th = themeOf(b.name);
    const g = regions[th.region] || (regions[th.region] = { th, name: th.region, banks: [], total: 0, seen: 0, sumR: 0, weak: 0 });
    g.banks.push(b);
    (b.questions || []).forEach((q) => {
      let r = 0;
      if (q.excluded) { r = 0.95; seen++; g.seen++; }
      else if (q.fs || q.sr_nextReview) {
        try { r = sch.get_retrievability(toFsrsCard(q, now), now, false); } catch (e) { r = 0; }
        if (!(r >= 0 && r <= 1)) r = 0;
        seen++; g.seen++;
      }
      if (!q.excluded && isQuestionWeak(q)) { weak++; g.weak++; }
      total++; g.total++; sumR += r; g.sumR += r;
    });
  });
  const res = { total, seen, sumR, weak, power: total ? sumR / total : 0, regions: Object.values(regions).map((g) => ({ ...g, power: g.total ? g.sumR / g.total : 0 })) };
  passCache.set(key, { banks: state.questionBanks, folders: state.folders, day, sr: state.srSettings, res });
  return res;
}
// いちばん近い試験日の資格（取得済みは除く）。問題集が1つも紐づいていなければ全問題で計算する
function mainQual(state) {
  const qs = (state.qualifications || []).filter((q) => !q.acquired);
  return qs.filter((q) => q.examDate).sort((a, b) => (a.examDate < b.examDate ? -1 : 1))[0] || qs[0] || null;
}
const pctTxt = (v) => `${(Math.round(v * 1000) / 10).toFixed(1)}%`;

// ── 物語：合格力に応じて章が開く（主人公が語る） ──
const STORY_CHAPTERS = [
  { at: 0, title: "序章　境界の消えた国", text: "この国では、魔物たちが土地の境界をかき消してしまいました。筆界も地番も、誰にもわからなくなってしまったのです。\nあなたと私で、知識の力で境界を取り戻しましょう。試験の日、城に棲む魔王を倒せば、この国に秩序が戻るはずです。" },
  { at: 0.10, title: "第一章　最初の灯り", text: "見てください、王都に灯りがともりました。あなたが覚えた条文の一つひとつが、道しるべになっているんです。\nこの調子で、少しずつ地図を取り戻していきましょうね。" },
  { at: 0.25, title: "第二章　森のささやき", text: "古の森の木々が、契約の言葉をささやいています。民法の知識は、すべての登記の土台です。\n迷ったときは、基本に立ち返りましょう。" },
  { at: 0.40, title: "第三章　砦の門", text: "ついに砦の門が開きました。ここまで来られたのは、毎日の積み重ねのおかげです。\n魔王の城が、遠くにかすかに見えてきましたよ。" },
  { at: 0.55, title: "第四章　星見台の約束", text: "星見台から、国じゅうの境界線が見渡せます。半分以上の地図が戻りました。\n手強い魔物も、何度でも挑めば必ず倒せます。" },
  { at: BASE_LINE, title: "第五章　迷宮の出口", text: "書式の迷宮を抜けた先に、魔王の城が見えています。基準点には手が届きました。\n合格ラインまで、あと少し。最後まで一緒に走り抜けましょう。" },
  { at: PASS_LINE, title: "終章　境界の回復", text: "やりました……！ 魔王を打ち倒せる力が、あなたに宿りました。この国の境界は、すべて元どおりです。\nあとは試験の日、その力をそのまま出し切るだけですよ。" },
];
const storyIndex = (power) => STORY_CHAPTERS.reduce((a, c, i) => (power >= c.at ? i : a), 0);

// ── デイリークエスト：毎日3つ（「今日の復習を全部」＋日替わり2つ）。全部達成で宝箱 ──
const DAILY_QUESTS = [
  { id: "due", title: "今日の復習を全部終える", target: 1, key: null },
  { id: "defeat", title: "魔物を20体倒す", target: 20, key: "defeated" },
  { id: "elite", title: "手強い魔物を3体倒す", target: 3, key: "elite" },
  { id: "fresh", title: "初見の魔物を5体倒す", target: 5, key: "fresh" },
  { id: "combo", title: "10コンボを達成する", target: 10, key: "maxCombo" },
  { id: "crit", title: "会心の一撃を10回出す", target: 10, key: "crits" },
];
const QUEST_REWARD = { gold: 60, frag: 2 };
const CHEST_REWARD = { gold: 200, star: 1, itemChance: 0.3 };
const dailyOf = (r) => (r.daily && r.daily.date === todayStr() ? r.daily : { date: todayStr(), k: {}, claimed: [], chest: false });
function questsToday() {
  const rest = DAILY_QUESTS.slice(1);
  const h = hashStr(todayStr());
  const i = h % rest.length;
  let j = (h >>> 5) % (rest.length - 1);
  if (j >= i) j++; // 同じクエストが2つ並ばないように
  return [DAILY_QUESTS[0], rest[i], rest[j]];
}
const questProgress = (qst, daily, todayCount) => (qst.id === "due" ? ((todayCount === 0 && (daily.k.defeated || 0) > 0) ? 1 : 0) : Math.min(qst.target, daily.k[qst.key] || 0));

function DailyQuests({ state, actions, todayCount, compact = false }) {
  const r = normRpg(state.rpg);
  const daily = dailyOf(r);
  const qs = questsToday();
  const done = qs.map((q) => questProgress(q, daily, todayCount) >= q.target);
  const claimedAll = qs.every((q) => daily.claimed.includes(q.id));
  const [msg, setMsg] = useState("");
  const say = (m) => { if (!m) return; setMsg(m); setTimeout(() => setMsg(""), 2600); };
  return (
    <Box title="今日のクエスト" icon={<ScrollIcon size={18} />}>
      <div className="space-y-1.5">
        {qs.map((q, i) => {
          const v = questProgress(q, daily, todayCount);
          const claimed = daily.claimed.includes(q.id);
          return (
            <div key={q.id} className="jp flex items-center gap-2 px-2 py-1.5" style={{ background: claimed ? "var(--cream)" : "var(--paper)", border: `1px solid ${done[i] ? "var(--gold)" : "var(--rule-soft)"}` }}>
              <span style={{ width: 18, height: 18, flexShrink: 0, borderRadius: "50%", border: `1.5px solid ${done[i] ? "var(--gold)" : "var(--rule-soft)"}`, background: done[i] ? "var(--gold)" : "transparent", color: "var(--paper)", fontSize: 11, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{done[i] ? "✓" : ""}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs" style={{ color: "var(--ink)", fontWeight: 700, textDecoration: claimed ? "line-through" : "none" }}>{q.title}</div>
                <div style={{ height: 4, borderRadius: 2, background: "var(--beige)", marginTop: 3, overflow: "hidden" }}><div style={{ width: `${(v / q.target) * 100}%`, height: "100%", background: "linear-gradient(90deg, #d6b56a, #b08a3e)" }} /></div>
              </div>
              <span className="text-[10px]" style={{ color: "var(--ink-mute)", minWidth: 34, textAlign: "right" }}>{v}/{q.target}</span>
              {claimed ? <span className="text-[10px]" style={{ color: "var(--sage)" }}>受取済</span>
                : <button disabled={!done[i]} onClick={() => { say(actions.claimQuest(q.id)); SFX.play("drop"); }} className="btn-primary text-[10px] px-2 py-1">受け取る</button>}
            </div>
          );
        })}
      </div>
      <div className="jp flex items-center gap-2 mt-2 px-2 py-1.5" style={{ border: `1px dashed ${claimedAll && !daily.chest ? "var(--gold)" : "var(--rule-soft)"}`, background: "var(--paper)" }}>
        <img src={paintedUrl("a08")} alt="宝箱" width="40" height="40" style={{ flexShrink: 0, objectFit: "contain", filter: claimedAll && !daily.chest ? "drop-shadow(0 0 6px #f2c14e)" : daily.chest ? "grayscale(0.6) opacity(0.6)" : undefined, animation: claimedAll && !daily.chest ? "sqbIdle 1.4s ease-in-out infinite" : undefined }} />
        <div className="flex-1 text-[11px]" style={{ color: "var(--ink-soft)" }}>{daily.chest ? "今日の宝箱は開けました。また明日！" : `3つ全部受け取ると宝箱：${CHEST_REWARD.gold}G・星霊石・まれに装備`}</div>
        {!daily.chest && <button disabled={!claimedAll} onClick={() => { say(actions.claimChest()); SFX.play("forgeOk"); }} className="btn-primary text-[11px] px-2 py-1 jp">開ける</button>}
      </div>
      {msg && <div className="jp text-xs text-center mt-2" style={{ color: "var(--gold)", fontWeight: 700, animation: "sqFadeIn .3s ease-out" }}>{msg}</div>}
      {!compact && <p className="jp text-[10px] mt-2" style={{ color: "var(--ink-mute)" }}>クエストは毎日0時に入れ替わります。進み具合は、問題を解くときのバトルで記録されます。</p>}
    </Box>
  );
}

// ── 影の受験生：試験日にちょうど合格ライン（85%）に届く速さで進むライバル。rpg.rival = { exam, t0, p0, last, lastEvent } ──
const SHADOW_FILTER = "brightness(0.35) sepia(1) hue-rotate(215deg) saturate(2.2) contrast(1.2)";
const RIVAL_TALK = {
  appear: [["shadow", "……我は影の受験生。試験日にちょうど合格する速さで、お前と同じ道を歩く者だ。"], ["shadow", "我より先を行けば、お前は合格する。遅れれば……わかるな？"], ["hero", "負けません！ 毎日少しずつ、影の先を歩いていきましょう。"]],
  overtake: [["shadow", "……追い抜かれたか。だが、試験日まで気を抜くなよ。"], ["hero", "影の受験生を追い抜きました！ このまま進めば、合格ラインに届きます。"]],
  overtaken: [["shadow", "ふっ……。合格する速さは、今はこちらが上のようだな。"], ["hero", "影に先を越されました。今日の復習と新しい問題で、取り返しましょう！"]],
};
function rivalPowerAt(rv, date) {
  if (!rv) return null;
  const goal = Math.max(PASS_LINE, rv.p0);
  const t0 = parseLocalDate(rv.t0).getTime(), t1 = parseLocalDate(rv.exam).getTime(), t = parseLocalDate(date).getTime();
  const f = t1 > t0 ? Math.min(1, Math.max(0, (t - t0) / (t1 - t0))) : 1;
  return rv.p0 + (goal - rv.p0) * f;
}
function rivalStatus(state, pp, qual) {
  const rv = normRpg(state.rpg).rival;
  if (!rv || !qual || !qual.examDate || rv.exam !== qual.examDate || pp.total === 0) return null;
  const rp = rivalPowerAt(rv, todayStr());
  const diff = pp.power - rp;
  const days = daysUntil(qual.examDate);
  const perDay = days > 0 ? (Math.max(PASS_LINE, rv.p0) - rp) / days : 0;
  return { rp, diff, diffQ: Math.round(Math.abs(diff) * pp.total), status: diff >= 0.002 ? "ahead" : diff <= -0.002 ? "behind" : "tie", perDay, perDayQ: Math.max(1, Math.round(perDay * pp.total)), days };
}
function RivalTrack({ state, me, rp, avatar, face }) {
  const pos = (v) => `${Math.min(100, Math.max(0, (v / PASS_LINE) * 100))}%`;
  const dot = (v, filter, label, top) => (
    <div style={{ position: "absolute", left: pos(v), top, transform: "translateX(-50%)", textAlign: "center", transition: "left .6s ease" }}>
      <div style={{ width: 30, height: 30, margin: "0 auto", borderRadius: "50%", border: `2px solid ${filter ? "#6c5a96" : "#b08a3e"}`, backgroundColor: filter ? "#2a2440" : "#e9e4d6", backgroundImage: `url(${avatar})`, backgroundSize: "300% auto", backgroundPosition: `${face[0]}% ${face[1]}%`, filter }} />
      <div className="jp text-[9px] whitespace-nowrap" style={{ color: filter ? "#6c5a96" : "var(--gold)", fontWeight: 800 }}>{label}</div>
    </div>
  );
  return (
    <div style={{ position: "relative", height: 92, margin: "0 18px" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 44, height: 6, borderRadius: 3, background: "var(--beige)" }} />
      <div style={{ position: "absolute", left: 0, width: pos(me), top: 44, height: 6, borderRadius: 3, background: "linear-gradient(90deg, #6fb8b4, #d6b56a)" }} />
      <div style={{ position: "absolute", right: -14, top: 30, fontSize: 18 }} aria-hidden="true">🏁</div>
      <div className="jp text-[9px]" style={{ position: "absolute", right: -16, top: 54, color: "var(--gold)", fontWeight: 800 }}>合格{Math.round(PASS_LINE * 100)}%</div>
      {dot(rp, SHADOW_FILTER, `影 ${pctTxt(rp)}`, 50)}
      {dot(me, null, `あなた ${pctTxt(me)}`, 0)}
    </div>
  );
}
function RivalCard({ state, pp, qual, compact = false }) {
  const st = rivalStatus(state, pp, qual);
  const hc = homeCharOf(state);
  if (!st) {
    if (compact) return null;
    return (
      <Box title="影の受験生" icon={<Skull size={18} />}>
        <p className="jp text-xs" style={{ color: "var(--ink-soft)" }}>目標の資格に試験日を入れると、「試験日にちょうど合格する速さ」で進むライバル、影の受験生が現れます。影より先を歩けていれば、合格ペースです。</p>
      </Box>
    );
  }
  const msg = st.status === "ahead" ? `影より ${(st.diff * 100).toFixed(1)}% リード（約${st.diffQ}問分）` : st.status === "behind" ? `影に ${(Math.abs(st.diff) * 100).toFixed(1)}% 先を越されています（あと約${st.diffQ}問分）` : "影と横並びの接戦です";
  const color = st.status === "ahead" ? "var(--gold)" : st.status === "behind" ? "#6c5a96" : "var(--ink)";
  const body = (
    <>
      <RivalTrack state={state} me={pp.power} rp={st.rp} avatar={hc.avatar} face={hc.face} />
      <div className="jp text-center text-sm" style={{ color, fontWeight: 800 }}>{msg}</div>
      {!compact && <p className="jp text-[11px] mt-1 text-center" style={{ color: "var(--ink-soft)" }}>影は毎日、合格力を約{(st.perDay * 100).toFixed(2)}%（{st.perDayQ}問分）ずつ上げていきます。試験日まであと{st.days}日。</p>}
    </>
  );
  if (compact) return <div className="mt-2 pt-2" style={{ borderTop: "1px dashed var(--rule-soft)" }}><div className="jp text-[10px] mb-1" style={{ color: "var(--ink-mute)" }}>影の受験生との競争</div>{body}</div>;
  return <Box title="影の受験生" icon={<Skull size={18} />}>{body}</Box>;
}

// ── 合格力の推移：毎日の合格力を rpg.powerLog に記録し（{d:日付, p:合格力, g:{地域:合格力}}）、折れ線グラフで見せる ──
const addDays = (str, n) => { const d = parseLocalDate(str); d.setDate(d.getDate() + n); return localDateStr(d); };
function PowerChart({ state }) {
  const log = normRpg(state.rpg).powerLog || [];
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
// 週報：先週（月〜日）の合格力の変化・伸びた科目・弱い科目・学習時間から、主人公の会話を作る
function weeklyReport(state, weekStart) {
  const r = normRpg(state.rpg);
  const log = r.powerLog || [];
  const prevStart = addDays(weekStart, -7);
  const endE = [...log].reverse().find((e) => e.d < weekStart);
  if (!endE || endE.d < prevStart) return null;
  const startE = [...log].reverse().find((e) => e.d < prevStart) || log.find((e) => e.d >= prevStart);
  if (!startE) return null;
  const delta = endE.p - startE.p;
  const mins = state.studyLog.filter((l) => l.date >= prevStart && l.date < weekStart).reduce((a, b) => a + b.minutes, 0);
  const gains = Object.keys(endE.g || {}).map((k) => ({ k, d: (endE.g[k] || 0) - ((startE.g || {})[k] || 0), p: endE.g[k] || 0 }));
  const best = [...gains].sort((a, b) => b.d - a.d)[0];
  const weak = [...gains].sort((a, b) => a.p - b.p)[0];
  const sign = (v) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;
  const lines = [
    ["hero", `先週（${Number(prevStart.slice(5, 7))}/${Number(prevStart.slice(8, 10))}〜）のふり返りです。`],
    ["hero", `合格力は ${pctTxt(startE.p)} → ${pctTxt(endE.p)}（${sign(delta)}）でした。学習時間は合計${fmtMin(mins)}です。`],
  ];
  if (best && best.d > 0.001) lines.push(["hero", `いちばん伸びたのは「${best.k}」（${sign(best.d)}）。積み重ねが、ちゃんと力になっていますね。`]);
  if (weak) lines.push(["hero", `いま合格力がいちばん低いのは「${weak.k}」（${pctTxt(weak.p)}）。今週はここを重点的に攻めましょう。週替わりボスも、ここに現れていますよ。`]);
  lines.push(["pet", "（相棒が、地図の上でその地域をつついている）"]);
  alliesJoined(r).forEach((a) => lines.push([a.id, a.cheer]));
  lines.push(["hero", delta >= 0 ? "この調子です。今週も一緒に進みましょうね。" : "少し下がってしまいましたが、大丈夫です。今日の復習から、ゆっくり立て直しましょう。"]);
  return { title: "週報　先週のふり返り", lines };
}

// ── 最終ボス（本番の試験）：合格力が合格ラインに届けば撃破できる ──
// ── 科目ごとのジョブレベル：科目（地域）ごとの経験値＝正解の回数＋記憶が定着した問題×5。称号はレベルで上がる ──
const JOB_SUBJECT = [[/不動産登記/, "登記"], [/民法/, "民法"], [/区分所有/, "区分所有"], [/調査士法/, "調査士法"], [/測量/, "測量"], [/書式/, "書式"]];
const JOB_RANKS = [[1, "見習い"], [5, "修行者"], [10, "術士"], [20, "魔導士"], [35, "大魔導士"], [50, "賢者"]];
const jobLevelOf = (xp) => Math.min(99, Math.floor((Math.sqrt(1 + (8 * xp) / 20) - 1) / 2) + 1); // Lv2＝20、Lv3＝60、Lv5＝200、Lv10＝900…
const jobXpFor = (lv) => (20 * (lv - 1) * lv) / 2;
const jobRankOf = (lv) => [...JOB_RANKS].reverse().find(([l]) => lv >= l) || JOB_RANKS[0];
function subjectJobs(state) {
  const qual = mainQual(state);
  const linked = qual && state.questionBanks.some((b) => b.qualId === qual.id);
  const pp = passPower(state, linked ? qual.id : null);
  return pp.regions.filter((g) => g.total > 0).map((g) => {
    let xp = 0;
    g.banks.forEach((b) => (b.questions || []).forEach((q) => { xp += (q.correct || 0) + (q.fs && q.fs.s >= MASTERED_STABILITY ? 5 : 0); }));
    const lv = jobLevelOf(xp);
    const subj = (JOB_SUBJECT.find(([re]) => re.test(g.name)) || [null, g.name.replace(/の.*$/, "")])[1];
    const rk = jobRankOf(lv);
    return { region: g.name, th: g.th, subj, xp, lv, rank: rk[1], rankLv: rk[0], title: `${subj}の${rk[1]}`, lo: jobXpFor(lv), hi: jobXpFor(lv + 1), power: g.power };
  });
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

// ── 忘れかけの3問：解いたことがある問題のうち、いま思い出せる確率がいちばん低い問題 ──
function forgettingItems(state, n = 3) {
  const sch = getFsrsScheduler(state.srSettings);
  const now = new Date();
  const out = [];
  state.questionBanks.forEach((b) => (b.questions || []).forEach((q) => {
    if (q.excluded || !(q.fs || q.sr_nextReview)) return;
    let r = 1; try { r = sch.get_retrievability(toFsrsCard(q, now), now, false); } catch (e) { r = 1; }
    if (r >= 0 && r <= 1) out.push({ bankId: b.id, bankName: b.name, year: b.year || "", qId: q.id, r });
  }));
  return out.sort((a, b) => a.r - b.r).slice(0, n);
}

// ── 「いま試験なら」合格確率：択一20問で何問取れそうかを確率で出す（目安） ──
// ・1問の正答率 ＝ 思い出せる確率^1.5（本番の1問には、いくつかの知識が必要なことを考えた目安）＋ わからないときの勘（5択で20%）
// ・科目の重みは本番の出題数（不動産登記法16・民法3・調査士法1）。地域が見つからなければ全体の平均
const EXAM_MIX = [[/不動産登記|登記法/, 16], [/民法/, 3], [/調査士法/, 1]];
function binomTail(n, p, k) { let t = 0; for (let i = k; i <= n; i++) { let c = 1; for (let j = 0; j < i; j++) c = (c * (n - j)) / (j + 1); t += c * p ** i * (1 - p) ** (n - i); } return Math.min(1, t); }
function examMean(pp) {
  let w = 0, sum = 0;
  EXAM_MIX.forEach(([re, n]) => { const g = pp.regions.find((x) => re.test(x.name) && x.total > 0); if (g) { w += n; sum += n * g.power; } });
  return w ? sum / w : pp.power;
}
function passChance(state, pp, boost = 0) {
  if (!pp.total) return null;
  const cfg = rehearsalCfg(state);
  const m = Math.min(1, examMean(pp) + boost);
  const p = m ** 1.5 + (1 - m ** 1.5) * 0.2;
  const baseQ = Math.ceil(cfg.mcBase / 2.5), passQ = Math.ceil(PASS_LINE * 20);
  const dist = Array.from({ length: 21 }, (_, k) => binomTail(20, p, k) - (k < 20 ? binomTail(20, p, k + 1) : 0));
  return { m, p, exp: p * 20, baseQ, passQ, pBase: binomTail(20, p, baseQ), pPass: binomTail(20, p, passQ), dist };
}
function ExamChance({ state, pp }) {
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
            <div style={{ fontFamily: "'Shippori Mincho B1', serif", fontWeight: 800, fontSize: 20, letterSpacing: "0.08em" }}>試験の魔王{beaten ? "　― 撃破可能 ―" : ""}</div>
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
          {[["択一20問なら", `約${Math.round(pp.power * 20)}問`], ["出会った問題", `${pp.seen}/${pp.total}`], ["手強い魔物", `${pp.weak}体`]].map(([k, v]) => (
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

// ── 世界地図：科目ごとの地域。合格力に応じて輪が満ちていく ──
const REGION_ORDER = ["不動産登記法の王都", "民法の古の森", "区分所有の双子塔", "調査士法の砦", "測量の星見台", "書式の迷宮", "未踏の地"];
const REGION_POS = [[70, 178], [170, 196], [270, 176], [300, 112], [196, 120], [86, 104], [52, 46]];
function WorldMap({ pp, r, onGuardian }) {
  const regs = [...pp.regions].filter((g) => g.total > 0).sort((a, b) => REGION_ORDER.indexOf(a.name) - REGION_ORDER.indexOf(b.name));
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

function StoryPanel({ pp, onTalk }) {
  const cur = storyIndex(pp.power);
  const [open, setOpen] = useState(cur);
  return (
    <Box title="物語" icon={<BookOpen size={18} />}>
      <div className="space-y-1">
        {STORY_CHAPTERS.map((c, i) => {
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
}

// ── 週替わりボス：その週いちばん合格力の低い地域（科目）から現れる。勝てるのは週に1回 ──
const weekKey = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return localDateStr(d); }; // その週の月曜日
const WEEKLY_BOSS = {
  "不動産登記法の王都": { name: "王都を蝕む影竜", icon: "🐉", boss: "dragon", art: "darkdragon" },
  "民法の古の森": { name: "古の森の大樹霊", icon: "👻", boss: "ghost", art: "elderweed" },
  "区分所有の双子塔": { name: "双子塔の番人", icon: "🗿", boss: "golem", art: "magolem" },
  "調査士法の砦": { name: "砦の黒騎士", icon: "🦹", boss: "shadow", art: "armor" },
  "測量の星見台": { name: "星見台の天球獣", icon: "🐉", boss: "dragon", art: "lunawolf" },
  "書式の迷宮": { name: "迷宮の書魔", icon: "👹", boss: "maou", art: "grimoire" },
  "未踏の地": { name: "霧の主", icon: "🟢", boss: "slime", art: "wisp" },
};
const WEEKLY_REWARD = { gold: 250, xp: 150, star: 2, sage: 1, luck: 2.5 };
const shuffleArr = (a) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
// 指定した問題集から出題：苦手を優先し、足りなければ間違いの多い問題・定着の浅い問題で補う
function buildPoolFromBanks(banks, n) {
  const all = banks.flatMap((b) => (b.questions || []).filter((q) => !q.excluded).map((q) => ({ bankId: b.id, bankName: b.name, q })));
  let pool = shuffleArr(all.filter((x) => isQuestionWeak(x.q))).slice(0, n);
  if (pool.length < n) {
    const rest = all.filter((x) => !isQuestionWeak(x.q)).sort((a, b) => (b.q.wrong || 0) - (a.q.wrong || 0) || (((a.q.fs && a.q.fs.s) || 0) - ((b.q.fs && b.q.fs.s) || 0)));
    pool = [...pool, ...rest.slice(0, n - pool.length)];
  }
  return shuffleArr(pool).map((x) => ({ bankId: x.bankId, bankName: x.bankName, qId: x.q.id }));
}
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

// ── ダンジョン（模試の塔）：本番のように時間を計って一気に解く。1問正解ごとに1階層もぐる ──
// ── 本番リハーサル：土地家屋調査士の午後の部と同じ形（択一20問＋記述2問・2時間30分）で解き、基準点と合格点で判定する ──
// 判定の線は年によって変わる。初期値は令和6年度の目安（択一の基準点37.5・記述の基準点31.5・合格点78.0）。設定で変えられる
const REHEARSAL_DEFAULT = { mcBase: 37.5, descBase: 31.5, pass: 78 };
const rehearsalCfg = (state) => ({ ...REHEARSAL_DEFAULT, ...((normRpg(state.rpg).rehearsal || {}).cfg || {}) });
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
          <div className="text-[10px] mt-1 mb-1" style={{ color: "var(--ink-soft)" }}>最近の記録</div>
          {[...rh.log].reverse().slice(0, 5).map((e) => (
            <div key={e.id} className="flex items-center gap-2 text-[11px] py-0.5">
              <span style={{ color: "var(--ink-mute)", minWidth: 36 }}>{Number(e.d.slice(5, 7))}/{Number(e.d.slice(8, 10))}</span>
              <span style={{ fontWeight: 700 }}>{e.full ? "本番形式" : "択一のみ"}</span>
              <span className="flex-1" style={{ color: "var(--ink-soft)" }}>択一{e.mc}{e.full ? `・記述${e.desc}・計${e.total}` : ""}（{e.min}分）</span>
              <span style={{ color: e.pass ? "var(--gold)" : "var(--ink-mute)", fontWeight: 800 }}>{e.pass ? "合格ライン" : "あと一歩"}</span>
            </div>
          ))}
        </div>
      )}
    </Box>
  );
}
function RehearsalRun({ state, run, actions, recordAnswer, startTimer, stopTimer, onExit }) {
  const { pool, full, minutes } = run;
  const [phase, setPhase] = useState("mc"); // mc（択一）| desc（記述の自己採点）| done
  const [idx, setIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [res, setRes] = useState([]); // {bankId, qId, correct}
  const [land, setLand] = useState("");
  const [bldg, setBldg] = useState("");
  const [out, setOut] = useState(null);
  const [startMs] = useState(() => Date.now());
  const [mcMs, setMcMs] = useState(0);
  const [now, setNow] = useState(Date.now());
  const timerStartedByMe = useRef(false);
  const limitMs = minutes * 60000;
  useEffect(() => {
    if (!state.timer.startMs) { startTimer(null, "qa"); timerStartedByMe.current = true; }
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(t); if (timerStartedByMe.current) { stopTimer(); timerStartedByMe.current = false; } };
  }, []);
  const left = Math.max(0, limitMs - (now - startMs));
  const mmss = (ms) => { const m = Math.floor(ms / 60000); return `${m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}` : m}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`; };
  const endMc = (list) => { setMcMs(Date.now() - startMs); setShowAnswer(false); if (full) setPhase("desc"); else finish(list, "", ""); };
  const finish = (list, l, b) => {
    if (timerStartedByMe.current) { stopTimer(); timerStartedByMe.current = false; }
    const mcOk = list.filter((x) => x.correct).length;
    const o = actions.rehearsalFinish({ full, mcOk, mcN: pool.length, land: Math.min(25, Number(l) || 0), bldg: Math.min(25, Number(b) || 0), min: (Date.now() - startMs) / 60000 });
    SFX.play(o.pass ? "levelup" : "result");
    setOut({ ...o, mcOk, used: Date.now() - startMs });
    setPhase("done");
  };
  // 択一の途中で時間切れ → 残りは不正解として記述へ
  useEffect(() => { if (left <= 0 && phase === "mc") endMc(res); }, [left]);
  const head = (label) => (
    <div className="flex items-center justify-between jp text-xs">
      <button onClick={() => { if (confirm("リハーサルをやめますか？（記録は残りません）")) onExit(); }} className="flex items-center gap-1" style={{ color: "var(--ink-soft)" }}><XIcon size={14} /> やめる</button>
      <span style={{ color: "var(--ink-soft)" }}>{label}</span>
      <span style={{ fontWeight: 800, color: left < 10 * 60000 ? "var(--brick)" : "var(--sky-deep)", fontVariantNumeric: "tabular-nums" }}>残り {mmss(left)}</span>
    </div>
  );

  if (phase === "done" && out) {
    const row = (label, v, line, okv) => (
      <div className="flex items-center gap-2 px-3 py-2" style={{ background: okv ? "var(--cream)" : "var(--paper)", border: `1px solid ${okv ? "var(--gold)" : "var(--rule-soft)"}`, borderRadius: 8 }}>
        <span className="text-xs flex-1" style={{ fontWeight: 700 }}>{label}</span>
        <span className="text-sm" style={{ fontWeight: 800 }}>{v}点</span>
        <span className="text-[10px] w-20 text-right" style={{ color: "var(--ink-mute)" }}>{line}</span>
        <span className="text-base w-5 text-center" style={{ color: okv ? "var(--gold)" : "var(--brick)", fontWeight: 800 }}>{okv ? "○" : "×"}</span>
      </div>
    );
    const wrongs = res.filter((x) => !x.correct).map((x) => { const b = state.questionBanks.find((bb) => bb.id === x.bankId); return b && (b.questions || []).find((qq) => qq.id === x.qId); }).filter(Boolean);
    return (
      <Box title="本番リハーサル：結果" icon={<Award size={18} />}>
        <div className="jp text-center py-2">
          <div className="text-[11px]" style={{ color: "var(--ink-mute)" }}>{full ? "本番と同じ形" : "択一だけ"} ・ {mmss(out.used)}（択一 {mmss(mcMs)}）</div>
          <div style={{ fontSize: 40, fontWeight: 800, color: out.pass ? "var(--gold)" : "var(--ink)", fontFamily: "'Cinzel', 'Shippori Mincho B1', serif" }}>{full ? out.total : out.mc}<span className="text-base">点</span></div>
          <div className="text-sm" style={{ fontWeight: 800, color: out.pass ? "var(--gold)" : "var(--brick)" }}>{out.pass ? (full ? "合格ラインを突破しました！" : "択一の基準点クリア！") : full ? "合格ラインまで、あと一歩" : "択一の基準点まで、あと一歩"}</div>
        </div>
        <div className="jp space-y-1.5 mb-3">
          {row(`択一（${out.mcOk}/${pool.length}問）`, out.mc, `基準点 ${out.cfg.mcBase}`, out.mcOkLine)}
          {full && row("記述（土地・建物）", out.desc, `基準点 ${out.cfg.descBase}`, out.descOkLine)}
          {full && row("合計", out.total, `合格点 ${out.cfg.pass}`, out.total >= out.cfg.pass)}
        </div>
        {!out.pass && <p className="jp text-[11px] mb-2 text-center" style={{ color: "var(--ink-soft)" }}>{!out.mcOkLine ? `択一はあと${Math.max(1, Math.ceil((out.cfg.mcBase - out.mc) / 2.5))}問の正解で基準点です。` : full && !out.descOkLine ? `記述はあと${Math.round((out.cfg.descBase - out.desc) * 10) / 10}点で基準点です。` : full ? `合計はあと${Math.round((out.cfg.pass - out.total) * 10) / 10}点で合格点です。` : ""}</p>}
        <div className="jp text-xs text-center mb-3" style={{ color: "var(--gold)", fontWeight: 700 }}>{out.reward}</div>
        {wrongs.length > 0 && (
          <details className="jp text-xs mb-3">
            <summary style={{ cursor: "pointer", color: "var(--ink-soft)" }}>まちがえた問題（{wrongs.length}問）を見る</summary>
            <div className="space-y-1 mt-1">
              {wrongs.map((w) => <div key={w.id} className="p-2" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)" }}><div>{renderQText(w.q, w.q_formats)}</div><div className="mt-1" style={{ color: "var(--sky-deep)" }}>→ {renderFormattedText(w.a, w.a_formats)}</div></div>)}
            </div>
          </details>
        )}
        <button onClick={onExit} className="jp btn-primary w-full py-2">鍛錬にもどる</button>
      </Box>
    );
  }

  if (phase === "desc") {
    const inp = (v, set, l) => (
      <label className="text-xs flex items-center gap-2" style={{ color: "var(--ink)" }}><span className="w-24" style={{ fontWeight: 700 }}>{l}</span><input type="number" inputMode="decimal" step="0.5" className="rpg-input" value={v} onChange={(e) => set(e.target.value)} placeholder="例：16" /><span className="whitespace-nowrap">/ 25点</span></label>
    );
    return (
      <div className="space-y-3">
        {head("記述式（書式）")}
        <Box title="記述式（書式）の時間です" icon={<Pencil size={18} />}>
          <div className="jp space-y-2">
            <p className="text-xs" style={{ color: "var(--ink-soft)" }}>択一 {res.filter((x) => x.correct).length}/{pool.length}問 正解（{mmss(mcMs)}）。残りの時間で、手元の書式の問題（土地・建物の2問）を紙で解いてください。解き終えたら、模範解答で自己採点して点数を入れます。</p>
            {inp(land, setLand, "土地（第21問）")}
            {inp(bldg, setBldg, "建物（第22問）")}
            <button onClick={() => finish(res, land, bldg)} className="btn-primary w-full py-2">採点を終えて結果を見る</button>
            {left <= 0 && <p className="text-[11px] text-center" style={{ color: "var(--brick)", fontWeight: 700 }}>時間になりました。解けたところまでで採点しましょう。</p>}
          </div>
        </Box>
      </div>
    );
  }

  const item = pool[idx];
  const bank = item ? state.questionBanks.find((b) => b.id === item.bankId) : null;
  const q = bank ? (bank.questions || []).find((x) => x.id === item.qId) : null;
  const answer = (correct, meta) => {
    if (!q) return;
    recordAnswer(item.bankId, q.id, correct, meta);
    const list = [...res, { bankId: item.bankId, qId: q.id, correct }];
    setRes(list);
    setShowAnswer(false);
    if (idx + 1 >= pool.length) endMc(list);
    else setIdx(idx + 1);
  };
  if (!q) { if (idx + 1 < pool.length) setTimeout(() => setIdx(idx + 1), 0); else setTimeout(() => endMc(res), 0); return null; }
  return (
    <div className="space-y-3">
      {head(`択一 ${idx + 1}/${pool.length}問`)}
      <div className="flex gap-0.5">{pool.map((_, i) => <span key={i} className="flex-1" style={{ height: 5, borderRadius: 2, background: i < res.length ? (res[i].correct ? "#d6b56a" : "#c9564e") : i === idx ? "var(--sky-deep)" : "var(--beige)" }} />)}</div>
      <div className="rpg-box p-1">
        <div className="rpg-inner-border min-h-[180px] flex flex-col">
          <div className="jp text-[10px] mb-2" style={{ color: "var(--ink-mute)" }}>第{idx + 1}問　{bank.name}</div>
          <div className="qtext jp text-base md:text-lg flex-1 break-words" style={{ color: "var(--ink)" }}>{renderQText(q.q, q.q_formats)}</div>
          <QuestionImages bankId={bank.id} question={q} side="q" />
          {showAnswer ? (
            <>
              <div className="jp text-[10px] mt-3 mb-1" style={{ color: "var(--gold)" }}>答え</div>
              <div className="qtext jp text-base md:text-lg break-words p-2" style={{ background: "var(--sky-pale)", border: "1px solid var(--gold)", color: "var(--ink)" }}>{renderFormattedText(q.a, q.a_formats)}</div>
              <QuestionImages bankId={bank.id} question={q} side="a" />
              <AnswerPanel onAnswer={answer} question={q} srSettings={state.srSettings} />
            </>
          ) : (
            <button onClick={() => setShowAnswer(true)} className="jp btn-info mt-3 py-2 flex items-center justify-center gap-1"><Eye size={16} /> 答えを見る</button>
          )}
        </div>
      </div>
    </div>
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
          const best = dg.best && dg.best[n];
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
          <div className="text-[11px] mt-1" style={{ color: "var(--ink-soft)" }}>{done.correct}問正解 ・ 択一20問なら 約{Math.round(done.acc * 20)}問</div>
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
              {wrongs.map((w) => <div key={w.id} className="p-2" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)" }}><div>{renderQText(w.q, w.q_formats)}</div><div className="mt-1" style={{ color: "var(--sky-deep)" }}>→ {renderFormattedText(w.a, w.a_formats)}</div></div>)}
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
          <div className="qtext jp text-base md:text-lg flex-1 break-words" style={{ color: "var(--ink)" }}>{renderQText(q.q, q.q_formats)}</div>
          <QuestionImages bankId={bank.id} question={q} side="q" />
          {showAnswer ? (
            <>
              <div className="jp text-[10px] mt-3 mb-1" style={{ color: "var(--gold)" }}>答え</div>
              <div className="qtext jp text-base md:text-lg break-words p-2" style={{ background: "var(--sky-pale)", border: "1px solid var(--gold)", color: "var(--ink)" }}>{renderFormattedText(q.a, q.a_formats)}</div>
              <QuestionImages bankId={bank.id} question={q} side="a" />
              <AnswerPanel onAnswer={answer} question={q} srSettings={state.srSettings} />
            </>
          ) : (
            <button onClick={() => setShowAnswer(true)} className="jp btn-info mt-3 py-2 flex items-center justify-center gap-1"><Eye size={16} /> 答えを見る</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ 魔王城への道：地域の解放・会話・魔王城の5階層・旅路・カテゴリの長期クエスト ============

// ── 地域の守護者と紋章：その科目の合格力が60%に届くと挑める。倒すと地域が解放され、紋章の効果が付く ──
const GUARDIAN_LINE = 0.6;
const REGION_INFO = {
  "不動産登記法の王都": { guardian: "登記の番人", icon: "🗿", boss: "golem", emblem: { name: "王都の紋章", fx: { xpPct: 5 } } },
  "民法の古の森": { guardian: "契約の大樹", icon: "👻", boss: "ghost", emblem: { name: "森の紋章", fx: { critPct: 2 } } },
  "区分所有の双子塔": { guardian: "共用部の双璧", icon: "🗿", boss: "golem", emblem: { name: "双子塔の紋章", fx: { dmgCutPct: 5 } } },
  "調査士法の砦": { guardian: "砦の審判者", icon: "🦹", boss: "shadow", emblem: { name: "砦の紋章", fx: { goldPct: 10 } } },
  "測量の星見台": { guardian: "星読みの天秤", icon: "🐉", boss: "dragon", emblem: { name: "星見台の紋章", fx: { dropPct: 15 } } },
  "書式の迷宮": { guardian: "迷宮の写本師", icon: "👹", boss: "maou", emblem: { name: "迷宮の紋章", fx: { bossDmgPct: 10 } } },
  "未踏の地": { guardian: "霧の番犬", icon: "🟢", boss: "slime", emblem: { name: "開拓の紋章", fx: { hpPlus: 10 } } },
};
const regionInfo = (name) => REGION_INFO[name] || REGION_INFO["未踏の地"];
const regionCleared = (r, name) => !!(r.regions && r.regions[name] && r.regions[name].cleared);
// 地域の状態：fog（霧：まだ2割も出会っていない）| explore（探索中）| ready（守護者に挑める）| cleared（解放済み）
function regionStatus(g, r) {
  if (regionCleared(r, g.name)) return "cleared";
  if (g.total > 0 && g.seen / g.total < 0.2) return "fog";
  return g.power >= GUARDIAN_LINE ? "ready" : "explore";
}
// ── 仲間：地域を解放するたびに1人ずつ加わる（1つ目→リーネ、2つ目→カイ、3つ目→ミラ）。会話に登場し、小さなボーナスをくれる ──
const ALLIES = [
  { id: "rine", name: "リーネ", role: "登記官見習い", img: "ally-registrar.jpg", face: [50, 8], need: 1, fx: { xpPct: 3 }, likes: ["不動産登記法の王都", "区分所有の双子塔"], likeText: "不動産登記法・区分所有法・条文の穴埋め（登記）",
    intro: ["はじめまして！ 登記官見習いのリーネです。王都の登記所で働いています。", "申請の期限や、誰が申請するのか……そういう細かいところなら任せてください！"],
    cheer: "「誰が・いつまでに・何を」を押さえれば、登記の問題はぐっと楽になりますよ！" },
  { id: "kai", name: "カイ", role: "測量士", img: "ally-surveyor.jpg", face: [50, 7], need: 2, fx: { critPct: 2 }, likes: ["測量の星見台"], likeText: "測量・計算ドリル",
    intro: ["……測量士のカイだ。星見台で、境界の座標を記録している。", "計算と図面のことなら、手を貸そう。"],
    cheer: "計算は、手を動かした回数がものを言う。同じ問題でも、もう一度解いてみるといい。" },
  { id: "mira", name: "ミラ", role: "記録探索者", img: "ally-explorer.jpg", face: [11, 11], need: 3, fx: { dropPct: 10 }, likes: ["民法の古の森", "調査士法の砦", "書式の迷宮"], likeText: "民法・調査士法・書式",
    intro: ["やっほー！ 記録探索者のミラだよ。古い記録や判例を探して、国じゅうを旅してるの。", "民法や書式で迷ったら、具体的な場面を思い浮かべるのがコツ！ 一緒に行こう！"],
    cheer: "覚えにくいところは、物語みたいに場面を思い浮かべてみて！ ぐっと覚えやすくなるよ。" },
];
// 魔法学院の三人：試練の塔を登ると出会う（towerNeed 階を突破したとき）
ALLIES.push(
  { id: "kaito", group: "academy", name: "カイト", role: "魔法学科の学生", img: "ally-kaito.jpg", face: [52, 4], towerNeed: 5, fx: { bossDmgPct: 5 }, likes: ["不動産登記法の王都", "調査士法の砦"], likeText: "不動産登記法・調査士法",
    intro: ["僕はカイト。魔法学科の学生だ。まとめ役……ということになっている。", "一人で登るより、仲間と登るほうがずっと遠くまで行ける。"], cheer: "知識と仲間と。それがあれば、僕たちはもっと強くなれる。" },
  { id: "serena", group: "academy", name: "セレナ", role: "魔法学科の学生", img: "ally-serena.jpg", face: [26, 17], towerNeed: 15, fx: { dmgCutPct: 8 }, likes: ["民法の古の森", "区分所有の双子塔"], likeText: "民法・区分所有法",
    intro: ["セレナです。魔法学科の学生で、魔法と本が大好きです。", "たくさんの世界を見て、たくさんのことを知りたいの。"], cheer: "毎日少しずつ水をあげれば、いつか花が咲きます。今日もいっしょに、がんばりましょうね。" },
  { id: "raven", group: "academy", name: "レイヴン", role: "魔法学科の学生", img: "ally-raven.jpg", face: [70, 6], towerNeed: 30, fx: { xpPct: 3, critPct: 1 }, likes: ["測量の星見台", "書式の迷宮"], likeText: "測量・書式・計算ドリル・作図",
    intro: ["……レイヴンだ。魔法学科の学生。", "興味があるんだ。君たちがどこまでやれるのか。"], cheer: "才能より、続けたかどうかだよ。……今日も、置いていかれないようにね。" },
);
const allyById = (id) => ALLIES.find((a) => a.id === id) || null;
const clearedCount = (r) => Object.values(r.regions || {}).filter((x) => x && x.cleared).length;
const alliesJoined = (r) => { const n = clearedCount(r); const fl = (r.tower && r.tower.floor) || 0; return ALLIES.filter((a) => (a.towerNeed ? fl >= a.towerNeed : n >= a.need)); };
// 仲間との絆：得意分野の問題に正解するたびに1つ深まる（rpg.bonds）。Lv2〜5で物語が開き、仲間の効果が強くなる
const BOND_LV = [0, 30, 100, 250, 500];
const bondLevel = (pts) => BOND_LV.filter((t) => (pts || 0) >= t).length;
const bondFx = (a, r) => { const lv = bondLevel((r.bonds || {})[a.id]); const k = 1 + (lv - 1) * 0.5; return Object.fromEntries(Object.entries(a.fx).map(([key, v]) => [key, Math.round(v * k * 10) / 10])); };
const addBond = (x, id, n) => (n > 0 && alliesJoined(x).some((a) => a.id === id) ? { ...x, bonds: { ...(x.bonds || {}), [id]: ((x.bonds || {})[id] || 0) + n } } : x);
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
      {[["", null], ["academy", "魔法学院の三人"]].map(([grp, label]) => (
      <div key={grp || "base"}>
      {label && (
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
              <span style={{ width: 46, height: 46, flexShrink: 0, borderRadius: "50%", border: `2px solid ${on ? "#b08a3e" : "#d8c9a3"}`, backgroundColor: "#e9e4d6", backgroundImage: `url(${ART_URL}${a.img})`, backgroundSize: "300% auto", backgroundPosition: `${a.face[0]}% ${a.face[1]}%`, filter: on ? "none" : "brightness(0) opacity(0.3)" }} />
              <span className="flex-1 min-w-0">
                <span className="block text-sm" style={{ fontWeight: 800, color: on ? "var(--ink)" : "var(--ink-mute)" }}>{on ? a.name : "？？？"}<span className="text-[10px] ml-1" style={{ color: "var(--ink-soft)", fontWeight: 500 }}>{on ? a.role : ""}</span></span>
                <span className="block text-[10px]" style={{ color: on ? "var(--sky-deep)" : "var(--ink-mute)" }}>{on ? fxText(bondFx(a, r)) : a.towerNeed ? `試練の塔 第${a.towerNeed}階で出会う` : `地域を${a.need}つ解放すると仲間に`}</span>
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

// 仲間の立ち絵のふちを、上下左右ともやわらかくぼかす（2つのぼかしの重なったところだけ見せる）
const ALLY_MASK = "linear-gradient(to bottom, transparent 0%, #000 12%, #000 72%, transparent 100%), linear-gradient(to right, transparent 0%, #000 18%, #000 82%, transparent 100%)";
// 会話の画面（下からせり上がる会話窓。タップで次へ）
function StoryTalk({ state, talk, onClose }) {
  const th = BATTLE_THEME[(state.displaySettings && state.displaySettings.theme) || "white"] || BATTLE_THEME.white;
  const pet = getPetInfo(state);
  const joined = new Set(alliesJoined(normRpg(state.rpg)).map((a) => a.id));
  // 相棒がいないときは相棒のせりふを、まだ仲間になっていない仲間のせりふを飛ばす
  const lines = talk.lines.filter(([who]) => (who === "pet" ? !!pet : allyById(who) ? joined.has(who) : true));
  const [i, setI] = useState(0);
  const line = lines[Math.min(i, lines.length - 1)];
  if (!line) return null;
  const who = line[0];
  const ally = allyById(who);
  const isPet = who === "pet";
  const isShadow = who === "shadow";
  const next = () => { if (i + 1 >= lines.length) onClose(); else setI(i + 1); };
  const face = (url, f, filter, size) => <div key={size ? url : undefined} style={{ width: 64, height: 64, borderRadius: "50%", flexShrink: 0, border: `2px solid ${filter ? "#6c5a96" : "#b08a3e"}`, backgroundColor: filter ? "#2a2440" : "#e9e4d6", backgroundImage: `url(${url})`, backgroundSize: size || "300% auto", backgroundPosition: `${f[0]}% ${f[1]}%`, filter, animation: size ? "sqFadeIn .25s ease-out" : undefined }} />;
  const heroExpr = ((state.displaySettings && state.displaySettings.theme) || "white") === "white";
  return (
    <div className="fixed inset-0 flex items-end justify-center jp" style={{ zIndex: 65, animation: "sqFadeIn .3s ease-out" }} onClick={next}>
      {/* 背景：描きおろしの景色をうっすらと */}
      <div className="absolute inset-0" style={{ background: `rgba(10,14,30,0.35) url(${ART_URL}scene.jpg) center/cover no-repeat` }} />
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(10,14,30,0.15) 0%, rgba(10,14,30,0.55) 100%)" }} />
      {/* 話している人の大きな姿（仲間のときだけ） */}
      {ally && <img key={who} src={`${ART_URL}${ally.img}`} alt="" className="absolute bottom-0 right-0 md:right-[8%] h-[70vh] pointer-events-none" style={{ objectFit: "contain", animation: "sqFadeIn .35s ease-out", WebkitMaskImage: ALLY_MASK, maskImage: ALLY_MASK, WebkitMaskComposite: "source-in", maskComposite: "intersect", opacity: 0.97 }} />}
      <div className="w-full max-w-2xl m-3 p-4 relative" style={{ background: "rgba(253,251,245,0.97)", border: "1px solid #b08a3e", borderRadius: 10, boxShadow: "inset 0 0 0 3px #fdfbf5, inset 0 0 0 4px rgba(176,138,62,.45), 0 10px 30px rgba(0,0,0,0.3)", color: "#22335c", cursor: "pointer" }}>
        <div className="text-[11px] mb-2" style={{ color: "#b08a3e", fontWeight: 800, letterSpacing: "0.15em", fontFamily: "'Shippori Mincho B1', serif" }}>{talk.title}</div>
        <div className="flex items-start gap-3">
          {isPet
            ? <div style={{ width: 64, height: 64, borderRadius: "50%", flexShrink: 0, border: "2px solid #b08a3e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, background: "#f6ead0", overflow: "hidden" }}>{pet.type.art && pet.type.art[pet.stage] ? <PetIcon pet={pet} size={64} style={{ border: "none", boxShadow: "none" }} /> : pet.icon}</div>
            : ally ? face(`${ART_URL}${ally.img}`, ally.face) : isShadow ? face(th.avatar, th.face, SHADOW_FILTER) : heroExpr ? face(HERO_FACES[exprOfLine(line[1])], [50, 22], undefined, "cover") : face(th.avatar, th.face)}
          <div className="flex-1 min-w-0">
            <div className="text-xs mb-1" style={{ fontWeight: 800, color: "#5b6b8c" }}>{isPet ? pet.name : ally ? `${ally.name}（${ally.role}）` : isShadow ? "影の受験生" : heroStage(state.player.level).name}</div>
            <div key={i} className="text-[15px] md:text-[17px] leading-relaxed" style={{ fontFamily: "'Shippori Mincho B1', serif", fontWeight: 700, animation: "sqFadeIn .25s ease-out" }}>{line[1]}</div>
          </div>
        </div>
        <div className="flex justify-between items-center mt-2 text-[10px]" style={{ color: "#8a96b0" }}>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} style={{ background: "none", border: "none", color: "#8a96b0", textDecoration: "underline", cursor: "pointer" }}>スキップ</button>
          <span>{i + 1} / {lines.length}　タップで次へ ◆</span>
        </div>
      </div>
    </div>
  );
}

// ── 魔王城の5階層：模試の塔の成績と地域の解放で、1階ずつ攻略していく ──
const CASTLE_FLOORS = [
  { name: "城門", need: "模試の塔（20階層）で基準点75%", test: (c) => (c.best[20] || 0) >= BASE_LINE, reward: { gold: 150, star: 1 } },
  { name: "回廊", need: "模試の塔（40階層）で基準点75%", test: (c) => (c.best[40] || 0) >= BASE_LINE, reward: { gold: 250, star: 2 } },
  { name: "鏡の間", need: "模試の塔（40階層）で合格ライン85%", test: (c) => (c.best[40] || 0) >= PASS_LINE, reward: { gold: 350, star: 2, sage: 1 } },
  { name: "玉座の前", need: "すべての地域を解放する", test: (c) => c.allCleared, reward: { gold: 500, star: 3, sage: 1 } },
  { name: "玉座の間", need: "模試の塔（60階層）で合格ライン85%、かつ合格力85%", test: (c) => (c.best[60] || 0) >= PASS_LINE && c.power >= PASS_LINE, reward: { gold: 1000, star: 5, sage: 3 } },
];
const castleCtx = (state, pp) => { const r = normRpg(state.rpg); const regs = pp.regions.filter((g) => g.total > 0); return { best: (r.dungeon && r.dungeon.best) || {}, allCleared: regs.length > 0 && regs.every((g) => regionCleared(r, g.name)), power: pp.power }; };
const rewardText = (rw) => [rw.gold && `${rw.gold}G`, rw.frag && `欠片×${rw.frag}`, rw.star && `星霊石×${rw.star}`, rw.sage && `賢者の結晶×${rw.sage}`].filter(Boolean).join("・");
function CastleCard({ state, pp, actions }) {
  const r = normRpg(state.rpg);
  const floor = (r.castle && r.castle.floor) || 0;
  const ctx = castleCtx(state, pp);
  const nextF = CASTLE_FLOORS[floor];
  const can = nextF && nextF.test(ctx);
  return (
    <Box title="魔王城" icon={<Castle size={18} />}>
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

// ── 旅路（すごろく）：魔物を10体倒すごとに1マス進む。マスには宝箱・旅人・祠・町 ──
const JOURNEY_LEN = 300;
const JOURNEY_PER = 10;
const TOWNS = ["はじまりの村", "風見の宿場", "書庫の町", "境界石の里", "測量士の港", "星降る峠"];
function journeyEvent(i) {
  if (i > 0 && i % 50 === 0) return { kind: "town", icon: "🏠", name: TOWNS[(i / 50) % TOWNS.length], reward: { gold: 100, frag: 3 } };
  if (i % 13 === 0 && i > 0) return { kind: "shrine", icon: "⛩", name: "古い祠", reward: { star: 1 } };
  if (i % 10 === 0 && i > 0) return { kind: "chest", icon: "🎁", name: "道ばたの宝箱", reward: { gold: 40, frag: 1 } };
  if (i % 7 === 0 && i > 0) return { kind: "traveler", icon: "🧳", name: "旅人", reward: { gold: 20 }, quote: STUDY_QUOTES[i % STUDY_QUOTES.length] };
  return null;
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

// ── カテゴリの長期クエスト：フォルダ（科目）の中の問題集を1つずつ、★1〜★5まで地道に育てる ──
const CAT_TIERS = [
  { label: "全部の問題に出会う", test: (c) => c.s1 >= c.n, prog: (c) => [c.s1, c.n], reward: { gold: 50, frag: 2 } },
  { label: "半分を討伐する", test: (c) => c.s2 >= Math.ceil(c.n / 2), prog: (c) => [c.s2, Math.ceil(c.n / 2)], reward: { gold: 100, frag: 4 } },
  { label: "全部を討伐する", test: (c) => c.s2 >= c.n, prog: (c) => [c.s2, c.n], reward: { gold: 200, star: 1 } },
  { label: "半分を制覇する", test: (c) => c.s3 >= Math.ceil(c.n / 2), prog: (c) => [c.s3, Math.ceil(c.n / 2)], reward: { gold: 300, star: 2 } },
  { label: "全部を制覇する", test: (c) => c.s3 >= c.n, prog: (c) => [c.s3, c.n], reward: { gold: 500, sage: 1 } },
];
const catCounts = (b) => { const qs = b.questions || []; const st = qs.map(dexStatus); return { n: qs.length, s1: st.filter((s) => s >= 1).length, s2: st.filter((s) => s >= 2).length, s3: st.filter((s) => s >= 3).length }; };
function CategoryQuests({ state, pp, actions }) {
  const r = normRpg(state.rpg);
  const regs = [...pp.regions].filter((g) => g.total > 0).sort((a, b) => REGION_ORDER.indexOf(a.name) - REGION_ORDER.indexOf(b.name));
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

// ============ ストーリークエスト：論点ごとの10〜20問を1話として、順に進めて地図を描いていく ============
// 章＝地域（科目のフォルダ）、節＝問題集（カテゴリ）、話＝問題集を出題順に10〜20問ずつ区切ったもの。
// 1話をクリアするたびに次の話が開き、地図に六角形の土地が1枚描かれる。進み具合は rpg.sq[`${問題集id}:${話の番号}`]
const SQ_TARGET = 15;
const SQ_CLEAR = 0.7; // クリア（★1）の正答率
const sqStarsOf = (acc) => (acc >= 0.999 ? 3 : acc >= PASS_LINE ? 2 : acc >= SQ_CLEAR ? 1 : 0);
// 1話の問題数：最初は10問から始めて、少しずつ長くする（第1・2話10問、第3・4話12問、第5話から15問）
const SQ_SIZES = [10, 10, 12, 12];
function chunkBank(b) {
  const qs = b.questions || [];
  const n = qs.length;
  if (!n) return [];
  const out = [];
  for (let i = 0, k = 0; i < n; k++) {
    const size = SQ_SIZES[k] || SQ_TARGET;
    out.push(qs.slice(i, i + size));
    i += size;
  }
  // 最後の話が短すぎる（5問未満）ときは、1つ前の話にまとめる
  if (out.length > 1 && out[out.length - 1].length < 5) { const last = out.pop(); out[out.length - 1] = out[out.length - 1].concat(last); }
  return out;
}
const sqCache = new WeakMap();
function regionQuests(g) {
  const out = [];
  g.banks.forEach((b) => {
    let ch = sqCache.get(b.questions || b);
    if (!ch) { ch = chunkBank(b); sqCache.set(b.questions || b, ch); }
    ch.forEach((qs, idx) => out.push({ key: `${b.id}:${idx}`, bank: b, idx, count: ch.length, qs }));
  });
  return out;
}
const sqStars = (r, key) => ((r.sq && r.sq[key] && r.sq[key].stars) || 0);
const sqOpen = (r, q) => q.idx === 0 || sqStars(r, `${q.bank.id}:${q.idx - 1}`) >= 1;
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
const SQ_MARKS = ["🏠", "🌲", "⛰", "🌉", "🗼", "⛲", "🏯", "⛪", "🌾", "🗿", "🏛", "🌋"];

let lastStoryRegion = null; // ストーリーで最後に見ていた地域（戦いから戻ったときに同じ地域を開く）
function StoryQuestView({ state, pp, onStart, actions, onGuardian, onSecBoss }) {
  const r = normRpg(state.rpg);
  const regs = [...pp.regions].filter((g) => g.total > 0).sort((a, b) => REGION_ORDER.indexOf(a.name) - REGION_ORDER.indexOf(b.name));
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
    if (actions && g && !r.arcSeen[`${g.name}:intro`]) { actions.markArc(g.name, "intro"); actions.openTalk({ title: `${g.name}　はじまり`, lines: regionArc(g.name).intro }); }
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
        {/* 六角形の地図 */}
        <svg viewBox={vb.join(" ")} width="100%" style={{ display: "block", maxWidth: 560, maxHeight: 420, margin: "0 auto", borderRadius: 8, background: "radial-gradient(ellipse at 50% 45%, #f8f1de 0%, #ecdfbd 75%, #dcc89c 100%)", border: "1px solid #b08a3e" }}>
          {/* 中心の町 */}
          <polygon points={hex(pts[0][0], pts[0][1])} fill="#fdfbf5" stroke="#b08a3e" strokeWidth="1.5" />
          <text x={pts[0][0]} y={pts[0][1] + 5} textAnchor="middle" fontSize="15" style={{ fontFamily: "'Noto Emoji', sans-serif", fontWeight: 500 }} fill="#22335c">🏰</text>
          {quests.map((q, i) => {
            const [x, y] = pts[i + 1];
            const st = sqStars(r, q.key);
            const open = sqOpen(r, q);
            if (st < 1 && !open) return null; // まだ見えない土地
            const biome = SQ_BIOMES[(bankIdx.get(q.bank.id) || 0) % SQ_BIOMES.length];
            const mark = SQ_MARKS[hashStr(q.key) % SQ_MARKS.length];
            const isSel = sel === q.key;
            return (
              <g key={q.key} onClick={() => setSel(isSel ? null : q.key)} style={{ cursor: "pointer" }}>
                {st >= 1 ? (<>
                  <polygon points={hex(x, y)} fill={biome[1]} stroke={isSel || (r.secBoss[q.bank.id] && r.secBoss[q.bank.id].won) ? "#b08a3e" : "rgba(34,51,92,0.35)"} strokeWidth={isSel ? 2.5 : r.secBoss[q.bank.id] && r.secBoss[q.bank.id].won ? 2 : 1} />
                  <text x={x} y={y + 4} textAnchor="middle" fontSize="12" style={{ fontFamily: "'Noto Emoji', sans-serif", fontWeight: 500 }} fill="rgba(34,51,92,0.85)">{mark}</text>
                  <text x={x} y={y + 13} textAnchor="middle" fontSize="6" fill="#b08a3e">{"★".repeat(st)}</text>
                </>) : (<>
                  <polygon points={hex(x, y)} fill="rgba(233,228,214,0.95)" stroke="#b08a3e" strokeWidth={isSel ? 2.5 : 1.2} strokeDasharray="3 2">
                    <animate attributeName="opacity" values="1;.6;1" dur="1.8s" repeatCount="indefinite" />
                  </polygon>
                  <text x={x} y={y + 5} textAnchor="middle" fontSize="14" fontWeight="800" fill="#a24a45">!</text>
                </>)}
              </g>
            );
          })}
        </svg>
        <p className="jp text-[10px] mt-1 text-center" style={{ color: "var(--ink-mute)" }}>点線の「！」が、いま挑めるクエストです。クリアするたびに土地が描かれ、次のクエストが現れます。</p>
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

// ── ログインボーナス：その日はじめて開くとスタンプが1つ。7つで一巡（連続でなくてよい）。rpg.login = {last, count} ──
const LOGIN_REWARDS = [{ gold: 50 }, { frag: 2 }, { potion: 1 }, { gold: 100 }, { frag: 3 }, { star: 1 }, { gold: 200, sage: 1 }];
const loginRewardText = (rw) => [rw.gold && `${rw.gold}G`, rw.frag && `欠片×${rw.frag}`, rw.potion && `回復薬×${rw.potion}`, rw.star && `星霊石×${rw.star}`, rw.sage && `賢者の結晶×${rw.sage}`].filter(Boolean).join("・");
function LoginBonus({ state, onClaim }) {
  const lg = normRpg(state.rpg).login || { count: 0 };
  const slot = (lg.count || 0) % 7;
  const th = BATTLE_THEME[(state.displaySettings && state.displaySettings.theme) || "white"] || BATTLE_THEME.white;
  return (
    <div className="fixed inset-0 flex items-center justify-center jp" style={{ zIndex: 66, background: "rgba(10,14,30,0.5)", animation: "sqFadeIn .3s ease-out" }}>
      <div className="m-4 p-5 w-full max-w-md text-center" style={{ background: "#fdfbf5", border: "1px solid #b08a3e", borderRadius: 12, boxShadow: "inset 0 0 0 3px #fdfbf5, inset 0 0 0 4px rgba(176,138,62,.45), 0 12px 32px rgba(0,0,0,0.3)", color: "#22335c" }}>
        <div className="-mx-5 -mt-5 mb-1 relative" style={{ height: 110, borderRadius: "12px 12px 0 0", overflow: "hidden", background: `url(${ART_URL}scene.jpg) center 35%/cover no-repeat` }}>
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(253,251,245,0) 40%, #fdfbf5 100%)" }} />
        </div>
        <div style={{ width: 64, height: 64, margin: "-44px auto 0", position: "relative", borderRadius: "50%", border: "2px solid #b08a3e", backgroundColor: "#e9e4d6", backgroundImage: `url(${th.avatar})`, backgroundSize: "300% auto", backgroundPosition: `${th.face[0]}% ${th.face[1]}%` }} />
        <div className="mt-2" style={{ fontFamily: "'Shippori Mincho B1', serif", fontWeight: 800, fontSize: 20, letterSpacing: "0.1em" }}>おかえりなさい</div>
        <div className="text-xs" style={{ color: "#5b6b8c" }}>今日も来てくれてうれしいです。ログインのしるしをどうぞ。（通算{(lg.count || 0) + 1}日目）</div>
        <div className="grid grid-cols-7 gap-1.5 mt-4">
          {LOGIN_REWARDS.map((rw, i) => {
            const got = i < slot, now = i === slot;
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <div style={{ width: "100%", aspectRatio: "1", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: i === 6 ? 13 : 11, fontWeight: 800,
                  background: got ? "radial-gradient(circle at 35% 30%, #fff3c4, #d6b56a)" : now ? "#f6ead0" : "#f3efe4", border: `2px solid ${got || now ? "#b08a3e" : "#d8c9a3"}`, color: got ? "#5f3f1f" : "#8f6f2c",
                  animation: now ? "sqfPulse 1.4s ease-in-out infinite" : undefined }}>{got ? "✓" : i + 1}</div>
                <div className="text-[9px] leading-tight" style={{ color: now ? "#22335c" : "#8a96b0", fontWeight: now ? 800 : 400, minHeight: 22 }}>{loginRewardText(rw)}</div>
              </div>
            );
          })}
        </div>
        <div className="text-sm mt-3" style={{ fontWeight: 800, color: "#b08a3e" }}>今日のしるし：{loginRewardText(LOGIN_REWARDS[slot])}</div>
        <button onClick={onClaim} className="btn-primary w-full py-2.5 mt-3 text-base">受け取る</button>
      </div>
      <style>{BATTLE_CSS}</style>
    </div>
  );
}

// ── 季節のイベント：期間中は自動で開催し、ボーナスが付く ──
const SEASON_EVENTS = [
  { id: "snow", name: "雪明かりの祭り", fx: { xpPct: 20 }, test: (md) => md >= "12-25" || md <= "01-07", until: (y, md) => (md >= "12-25" ? `${y + 1}-01-07` : `${y}-01-07`) },
  { id: "sakura", name: "桜の旅立ち", fx: { goldPct: 30 }, test: (md) => md >= "03-20" && md <= "04-07", until: (y) => `${y}-04-07` },
  { id: "summer", name: "真夏の特訓", fx: { dropPct: 30 }, test: (md) => md >= "08-01" && md <= "08-31", until: (y) => `${y}-08-31` },
];
function activeEvents(state) {
  const t = todayStr(), y = Number(t.slice(0, 4)), md = t.slice(5);
  const out = SEASON_EVENTS.filter((e) => e.test(md)).map((e) => ({ ...e, untilDate: e.until(y, md) }));
  const q = mainQual(state);
  const days = q && q.examDate ? daysUntil(q.examDate) : null;
  if (days !== null && days >= 0 && days <= 30) out.push({ id: "eve", name: "決戦前夜", fx: { xpPct: 30, critPct: 5 }, untilDate: q.examDate });
  return out;
}

// ── 試験日からの逆算プラン：合格力85%に届くには、1日に何問の新しい問題を覚えればよいか ──
// 覚えた問題は、復習を続ければ想起率およそ90%（目標記憶率）で保たれる、として計算する
function newTodayCount(state) {
  const d = new Date();
  const code = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  let n = 0;
  state.questionBanks.forEach((b) => (b.questions || []).forEach((q) => { if (Array.isArray(q.ah) && q.ah.length > 0 && q.ah.length < AH_MAX && q.ah[0].startsWith(code)) n++; }));
  return n;
}
function examPlan(state, pp, qual) {
  const days = qual && qual.examDate ? daysUntil(qual.examDate) : null;
  if (!days || days <= 0 || pp.total === 0) return null;
  const unseen = pp.total - pp.seen;
  const need = Math.max(0, PASS_LINE * pp.total - pp.sumR);
  const learn = Math.min(unseen, Math.ceil(need / 0.9));
  const perDay = learn > 0 ? Math.max(1, Math.ceil(learn / days)) : 0;
  return { days, need, unseen, learn, perDay, done: newTodayCount(state), reached: need <= 0 };
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

// ── 仲間の勉強会：週に1回、加入している仲間が順番に主催。その仲間の得意分野（likes の地域）から10問。7割でクリア ──
const STUDY_GROUP_PASS = 0.7;
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

// ── 月ごとのランク戦：その月の回答・正解・学習時間で点数を出し、ランクが上がる。毎月1日にリセット ──
// 点数：1問答えるごとに1点、正解ならさらに1点、学習10分ごとに3点（回答は問題ごとの回答日の記録 ah から数える）
const SEASON_RANKS = [
  { id: "bronze", name: "ブロンズ", min: 0, color: "#b07a4a", reward: {} },
  { id: "silver", name: "シルバー", min: 300, color: "#8a96b0", reward: { gold: 100, frag: 2 } },
  { id: "gold", name: "ゴールド", min: 900, color: "#b08a3e", reward: { gold: 300, star: 1 } },
  { id: "platinum", name: "プラチナ", min: 1800, color: "#4f8eb3", reward: { gold: 600, star: 1, item: true } },
  { id: "legend", name: "レジェンド", min: 3000, color: "#8c79c8", reward: { gold: 1000, sage: 1, item: true } },
];
const seasonRank = (pts) => [...SEASON_RANKS].reverse().find((k) => pts >= k.min) || SEASON_RANKS[0];
const seasonRewardText = (rw) => [rw.gold && `${rw.gold}G`, rw.frag && `欠片×${rw.frag}`, rw.star && `星霊石×${rw.star}`, rw.sage && `賢者の結晶×${rw.sage}`, rw.item && "装備"].filter(Boolean).join("・");
const seasonCache = new Map();
function seasonPoints(state, ym) {
  const ck = `${ym}|${todayStr()}`;
  const c = seasonCache.get(ck);
  if (c && c.banks === state.questionBanks && c.log === state.studyLog) return c.res;
  const code = ym.slice(2, 4) + ym.slice(5, 7);
  let ans = 0, ok = 0;
  state.questionBanks.forEach((b) => (b.questions || []).forEach((q) => (q.ah || []).forEach((h) => { if (h.startsWith(code)) { ans++; if (!h.endsWith("w")) ok++; } })));
  const min = state.studyLog.filter((l) => String(l.date || "").startsWith(ym)).reduce((t, l) => t + (l.minutes || 0), 0);
  const res = { ans, ok, min, pts: ans + ok + Math.floor(min / 10) * 3 };
  seasonCache.set(ck, { banks: state.questionBanks, log: state.studyLog, res });
  return res;
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

// ── 条文の穴埋め：条文の大事な言葉を空欄にして、4つから選ぶ（問題づくりは src/game/cloze.js） ──
// 問題集の問題（問・答え）に出てくる条文を数える。よく出る条文ほど出やすくする
const lawRefCache = new WeakMap();
function lawRefCounts(state) {
  const c = lawRefCache.get(state.questionBanks);
  if (c) return c;
  const out = {};
  state.questionBanks.forEach((b) => (b.questions || []).forEach((q) => extractLawRefs([q.q, q.a]).forEach((r) => { const m = out[r.law] || (out[r.law] = {}); m[r.art] = (m[r.art] || 0) + 1; })));
  lawRefCache.set(state.questionBanks, out);
  return out;
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
  const [law, setLaw] = useState("fudosan-ho");
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

  const stats = LAWS.map((l) => { const lg = cz.log.filter((e) => e.law === l.key).slice(-5); const n = lg.reduce((a, e) => a + e.n, 0), ok = lg.reduce((a, e) => a + e.ok, 0); return { l, acc: n ? ok / n : null, times: cz.log.filter((e) => e.law === l.key).length, miss: Object.keys(cz.miss || {}).filter((k) => k.startsWith(`${l.key}:`)).length }; }).filter((x) => x.times > 0);
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
        <div className="flex flex-wrap gap-1.5">{LAWS.map((l) => <button key={l.key} onClick={() => setLaw(l.key)} className="text-xs px-3 py-1" style={chip(law === l.key)}>{l.name}</button>)}</div>
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

// ストーリーの次の話（ホームの「今日の道しるべ」で使う）
function storyNextInfo(state) {
  const r = normRpg(state.rpg);
  const qual = mainQual(state);
  const linked = qual && state.questionBanks.some((b) => b.qualId === qual.id);
  const regs = passPower(state, linked ? qual.id : null).regions.filter((g) => g.total > 0).sort((a, b) => REGION_ORDER.indexOf(a.name) - REGION_ORDER.indexOf(b.name));
  let next = null, reg = null, done = 0, all = 0;
  regs.forEach((g) => { const qs = regionQuests(g); all += qs.length; done += qs.filter((q) => sqStars(r, q.key) >= 1).length; if (!next) { const n = qs.find((q) => sqStars(r, q.key) < 1 && sqOpen(r, q)); if (n) { next = n; reg = g; } } });
  return { next, reg, done, all };
}

// ── ホームの「今日の道しるべ」：今日やること（復習 → ストーリー → 最終決戦）と今日の記録を1枚にまとめる ──
function HomeDashboard({ state, actions, todayCount, liveSeconds, onGo, onQuick, planActions, part }) {
  const status = calculateStatus(state);
  const today = todayStr();
  const todayMin = state.studyLog.filter((l) => l.date === today).reduce((a, b) => a + b.minutes, 0) + (state.timer.startMs ? liveSeconds / 60 : 0);
  const qual = mainQual(state);
  const linked = qual && state.questionBanks.some((b) => b.qualId === qual.id);
  const pp = passPower(state, linked ? qual.id : null);
  const days = qual && qual.examDate ? daysUntil(qual.examDate) : null;
  const sn = storyNextInfo(state);
  const plan = examPlan(state, pp, qual);
  const Row = ({ no, icon, label, title, sub, action, onClick, gauge, mark = true }) => (
    <button onClick={onClick} className="w-full text-left jp flex items-center gap-3 px-3 py-2.5" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 8, cursor: "pointer" }}>
      <span style={{ width: 38, height: 38, flexShrink: 0, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "var(--cream)", border: "1px solid var(--gold)", color: "var(--gold)" }}>{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-[10px]" style={{ color: "var(--ink-mute)", letterSpacing: "0.05em" }}>{no}　{label}</span>
        <span className="block text-[15px] truncate" style={{ color: "var(--ink)", fontWeight: 800 }}>{title}</span>
        {sub && <span className="block text-[11px] truncate" style={{ color: "var(--ink-soft)" }}>{sub}</span>}
        {gauge != null && (
          <span className="block relative mt-1" style={{ height: 5, borderRadius: 3, background: "var(--beige)" }}>
            <span className="block" style={{ width: `${Math.min(100, gauge * 100)}%`, height: "100%", borderRadius: 3, background: "linear-gradient(90deg, #6fb8b4, #d6b56a)" }} />
            {mark && <span style={{ position: "absolute", left: `${PASS_LINE * 100}%`, top: -2, bottom: -2, width: 2, background: "var(--gold)" }} />}
          </span>
        )}
      </span>
      <span className="text-xs flex-shrink-0" style={{ color: "var(--gold)", fontWeight: 800 }}>{action} ▶</span>
    </button>
  );
  const chip = (k, v) => (
    <div className="jp text-center" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 8, padding: "6px 2px" }}>
      <div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>{k}</div>
      <div className="text-sm" style={{ color: "var(--ink)", fontWeight: 800 }}>{v}</div>
    </div>
  );
  const evs = activeEvents(state);
  const L = homeLayoutOf(state);
  // 今日の道しるべの行（設定 displaySettings.homeLayout で順番と表示を変えられる）
  const rowEls = {
    task: (() => { const tp = (state.studyPlans || []).filter((p) => !p.finishedAt).map((p) => ({ p, t: planToday(p) })).filter((x) => x.t.started); if (!tp.length) return null; const left = tp.reduce((a, x) => a + x.t.pending.length, 0); const first = tp.flatMap((x) => x.t.pending.map((k) => planBankName(state, x.p, k)))[0]; return <Row no="◆" icon={<Check size={18} />} label="今日のタスク（学習計画）" title={left ? `あと ${left}項目` : "今日のタスクは完了です"} sub={left ? `次は「${first}」` : "おつかれさまでした！ 明日の分も先に進められます"} gauge={tp.reduce((a, x) => a + x.t.doneToday.length, 0) / Math.max(1, tp.reduce((a, x) => a + x.t.doneToday.length + x.t.pending.length, 0))} mark={false} action={left ? "解く" : "ひらく"} onClick={() => onGo("laps")} />; })(),
    review: <Row no="一" icon={<Calendar size={18} />} label="今日の復習" title={todayCount > 0 ? `あと ${todayCount}問` : "今日の復習は完了です"} sub={todayCount > 0 ? "期限が来た問題と、まだ解いていない問題" : "おつかれさまでした。余力があればストーリーへ"} action={todayCount > 0 ? "はじめる" : "ひらく"} onClick={() => onGo("today")} />,
    story: sn.all > 0 && <Row no="二" icon={<BookOpen size={18} />} label={`ストーリーのつづき（描いた土地 ${sn.done}/${sn.all}）`} title={sn.next ? `${sn.reg.name}` : "すべての地図が完成"} sub={sn.next ? `${sn.next.bank.name}　第${sn.next.idx + 1}話` : "★を集め直すこともできます"} action="進む" onClick={() => onGo("adventure")} />,
    goal: plan && plan.perDay > 0 && <Row no="三" icon={<TrendingUp size={18} />} label="今日の目標（試験日から逆算）" title={`新しい問題 ${plan.perDay}問`} sub={plan.done >= plan.perDay ? `今日 ${plan.done}問 ― 達成しました！` : `今日 ${plan.done}問 ・ あと${plan.perDay - plan.done}問（未学習 ${plan.unseen}問を試験日までに）`} gauge={Math.min(1, plan.done / plan.perDay)} mark={false} action="解く" onClick={() => onGo("today")} />,
    final: pp.total > 0 && <Row no={plan && plan.perDay > 0 ? "四" : "三"} icon={<Skull size={18} />} label="最終決戦" title={days !== null && days >= 0 ? `決戦まで あと${days}日` : "試験の魔王"} sub={`合格力 ${pctTxt(pp.power)}・いま試験なら基準点突破 ${Math.round(((passChance(state, pp) || {}).pBase || 0) * 100)}%`} gauge={pp.power} action="見る" onClick={() => onGo("adventure")} />,
    reflect: (<button onClick={() => actions.openTalk(reflectionTalk(state))} className="jp w-full mt-2 flex items-center gap-2 px-3 py-2" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 8, cursor: "pointer", textAlign: "left" }}>
          <span style={{ fontSize: 18 }} aria-hidden="true">🌙</span>
          <span className="flex-1"><span className="block text-sm" style={{ fontWeight: 800, color: "var(--ink)" }}>今日のふりかえり</span><span className="block text-[11px]" style={{ color: "var(--ink-soft)" }}>今日の成果と、明日のタスクを聞く（夜20時からは自動で）</span></span>
          <span className="text-xs" style={{ color: "var(--gold)", fontWeight: 800 }}>聞く ▶</span>
        </button>),
    quick: onQuick && <button onClick={onQuick} className="jp w-full mt-2 flex items-center gap-2 px-3 py-2" style={{ background: "linear-gradient(90deg, rgba(214,181,106,0.18), rgba(214,181,106,0.04))", border: "1px dashed #b08a3e", borderRadius: 8, cursor: "pointer", textAlign: "left" }}>
          <span style={{ fontSize: 18 }} aria-hidden="true">⏱</span>
          <span className="flex-1"><span className="block text-sm" style={{ fontWeight: 800, color: "var(--ink)" }}>1分だけ：忘れかけの3問</span><span className="block text-[11px]" style={{ color: "var(--ink-soft)" }}>いちばん忘れそうな3問で、記憶をつなぎとめる</span></span>
          <span className="text-xs" style={{ color: "var(--gold)", fontWeight: 800 }}>解く ▶</span>
        </button>,
    rival: <RivalCard state={state} pp={pp} qual={qual} compact />,
    next: (() => { const t = nextTitles(state, 1)[0]; if (!t) return null; return <Row no="◆" icon={<Crown size={18} />} label="次に取れそうな称号" title={`「${t.title}」まで ${titleLeft(t)}`} sub={t.how} gauge={Math.min(1, t.ratio)} mark={false} action="見る" onClick={() => onGo("status")} />; })(),
    stats: (<div className="grid grid-cols-3 gap-2 mt-1">
          {chip("今日の学習", fmtMin(todayMin))}
          {chip("連続学習", `${status.currentStreak}日`)}
          {chip("達成クエスト", `${state.player.totalCompleted}`)}
        </div>),
  };
  const KANJI_NO = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];
  let rowNo = 0;
  const guideRows = L.rows.filter((id) => !L.hidden.has(`row:${id}`) && rowEls[id]).map((id) => {
    const el = rowEls[id];
    return <Fragment key={id}>{el && el.type === Row ? cloneElement(el, { no: KANJI_NO[rowNo++] || "◆" }) : el}</Fragment>;
  });
  const guide = <Box title="今日の道しるべ" icon={<Calendar size={18} />}><div className="space-y-2">{guideRows.length ? guideRows : <p className="jp text-xs" style={{ color: "var(--ink-mute)" }}>表示する行がありません（設定の「ホームの表示」で選べます）。</p>}</div></Box>;
  const eventsEl = evs.length ? <>{evs.map((e) => (
      <div key={e.id} className="jp mb-3 px-4 py-2 flex items-center gap-2" style={{ borderRadius: 999, background: "linear-gradient(90deg, rgba(214,181,106,0.25), rgba(214,181,106,0.05))", border: "1px solid #b08a3e" }}>
        <span style={{ color: "#b08a3e", fontWeight: 800, fontFamily: "'Shippori Mincho B1', serif" }}>開催中</span>
        <span className="flex-1 text-sm" style={{ fontWeight: 800, color: "var(--ink)" }}>{e.name}<span className="text-xs ml-2" style={{ color: "var(--ink-soft)", fontWeight: 600 }}>{fxText(e.fx)}</span></span>
        <span className="text-[11px]" style={{ color: "var(--ink-mute)" }}>{Number(e.untilDate.slice(5, 7))}/{Number(e.untilDate.slice(8, 10))}まで</span>
      </div>
    ))}</> : null;
  const questEl = <DailyQuests state={state} actions={actions} todayCount={todayCount} compact />;
  if (part === "events") return eventsEl;
  if (part === "guide") return <div className="mb-4">{guide}</div>;
  if (part === "quest") return <div className="mb-4">{questEl}</div>;
  if (part === "guide+quest") return <div className="grid gap-3 md:grid-cols-2 items-start mb-4">{guide}{questEl}</div>;
  return (
    <>
    {eventsEl}
    <div className="grid gap-3 md:grid-cols-2 items-start mb-4">{guide}{questEl}</div>
    </>
  );
}

// ── 地域の制覇：全話クリア＋すべての節の守護者＋地域の守護者 ──
const bankEpisodesDone = (r, g, bankId) => { const qs = regionQuests(g).filter((q) => q.bank.id === bankId); return qs.length > 0 && qs.every((q) => sqStars(r, q.key) >= 1); };
function regionConquest(g, r) {
  const qs = regionQuests(g);
  const banks = g.banks.filter((b) => (b.questions || []).length > 0);
  const epi = qs.filter((q) => sqStars(r, q.key) >= 1).length;
  const secWon = banks.filter((b) => r.secBoss[b.id] && r.secBoss[b.id].won).length;
  const guard = regionCleared(r, g.name);
  return { epi, epiAll: qs.length, secWon, secAll: banks.length, guard, done: qs.length > 0 && epi === qs.length && secWon === banks.length && guard };
}
const SEC_PASS = 0.8;

// ストーリークエストの戦い（1話）。最後の1問は「論点の主」
function QuestRun({ state, run, actions, recordAnswer, startTimer, stopTimer, onExit, onNext }) {
  const pool = run.quest.qs.filter((q) => !q.excluded);
  const [battleKey] = useState(() => uid());
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
    if (!q || done) return;
    recordAnswer(bank.id, q.id, correct, meta);
    const list = [...res, correct];
    setRes(list);
    setShowAnswer(false);
    if (idx + 1 >= pool.length) finish(list); else setIdx(idx + 1);
  };
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
      {isBoss && <div className="jp text-center text-sm" style={{ color: "var(--brick)", fontWeight: 800, animation: "sqFadeIn .4s ease-out" }}>― 論点の主があらわれた！ ―</div>}
      <BattleStage state={state} q={q} bankName={bank.name} battleKey={battleKey} boss={isBoss} />
      <div className="rpg-box p-1">
        <div className="rpg-inner-border min-h-[180px] flex flex-col">
          <div className="qtext jp text-base md:text-lg flex-1 break-words" style={{ color: "var(--ink)" }}>{renderQText(q.q, q.q_formats)}</div>
          <QuestionImages bankId={bank.id} question={q} side="q" />
          {showAnswer ? (
            <>
              <div className="jp text-[10px] mt-3 mb-1" style={{ color: "var(--gold)" }}>答え</div>
              <div className="qtext jp text-base md:text-lg break-words p-2" style={{ background: "var(--sky-pale)", border: "1px solid var(--gold)", color: "var(--ink)" }}>{renderFormattedText(q.a, q.a_formats)}</div>
              <QuestionImages bankId={bank.id} question={q} side="a" />
              <LawRefChips q={q} />
              <AnswerPanel onAnswer={answer} question={q} srSettings={state.srSettings} />
            </>
          ) : (
            <button onClick={() => setShowAnswer(true)} className="jp btn-info mt-3 py-2 flex items-center justify-center gap-1"><Eye size={16} /> 答えを見る</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ 試練の塔（100階層）：1階10問、80%で次の階へ。過去の階の問題も混ざり、10階ごとの「試練の間」で総復習 ============
const TOWER_MAX = 100;
const TOWER_PASS = 0.8;
const TOWER_LAYERS = ["礎の層", "書庫の層", "風の回廊", "水鏡の層", "星読みの層", "黄金の層", "霧の層", "雷鳴の層", "聖域の層", "天頂"];
const towerLayer = (f) => TOWER_LAYERS[Math.min(TOWER_LAYERS.length - 1, Math.floor((f - 1) / 10))];
const isCheckpoint = (f) => f % 10 === 0;
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
  if (c && c.folders === state.folders) return c.seq;
  const regs = pp.regions.filter((g) => g.total > 0).sort((a, b) => REGION_ORDER.indexOf(a.name) - REGION_ORDER.indexOf(b.name));
  const lists = regs.map((g) => g.banks.flatMap((b) => (b.questions || []).filter((q) => !q.excluded).map((q) => ({ bankId: b.id, bankName: b.name, qId: q.id }))));
  const idx = lists.map(() => 0);
  const total = lists.reduce((a, l) => a + l.length, 0);
  const seq = [];
  while (seq.length < total) {
    let best = -1, bestV = Infinity;
    lists.forEach((l, k) => { if (idx[k] < l.length) { const v = (idx[k] + 1) / l.length; if (v < bestV) { bestV = v; best = k; } } });
    seq.push(lists[best][idx[best]++]);
  }
  towerSeqCache.set(state.questionBanks, { folders: state.folders, seq });
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
          <div className="qtext jp text-base md:text-lg flex-1 break-words" style={{ color: "var(--ink)" }}>{renderQText(q.q, q.q_formats)}</div>
          <QuestionImages bankId={bank.id} question={q} side="q" />
          {showAnswer ? (
            <>
              <div className="jp text-[10px] mt-3 mb-1" style={{ color: "var(--gold)" }}>答え</div>
              <div className="qtext jp text-base md:text-lg break-words p-2" style={{ background: "var(--sky-pale)", border: "1px solid var(--gold)", color: "var(--ink)" }}>{renderFormattedText(q.a, q.a_formats)}</div>
              <QuestionImages bankId={bank.id} question={q} side="a" />
              <LawRefChips q={q} />
              <AnswerPanel onAnswer={answer} question={q} srSettings={state.srSettings} />
            </>
          ) : (
            <button onClick={() => setShowAnswer(true)} className="jp btn-info mt-3 py-2 flex items-center justify-center gap-1"><Eye size={16} /> 答えを見る</button>
          )}
        </div>
      </div>
    </div>
  );
}

function WorldView({ state, actions, todayCount, onWeekly, onDungeon, onGuardian, onStory, onTower, onSecBoss, onRehearsal, onStudyGroup }) {
  const qual = mainQual(state);
  const linked = qual && state.questionBanks.some((b) => b.qualId === qual.id);
  const pp = passPower(state, linked ? qual.id : null);
  const [sec, setSec] = useState("story"); // story（ストーリー）| tower（試練の塔）| train（鍛錬）| road（地図と仲間）| quest（クエスト）| castle（魔王城）
  const tabs = [["story", "ストーリー"], ["tower", "試練の塔"], ["train", "鍛錬"], ["road", "地図と仲間"], ["quest", "クエスト"], ["castle", "魔王城"]];
  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 p-1" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 16 }}>
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setSec(id)} className="jp py-1.5 text-xs" style={{ borderRadius: 999, border: "none", fontWeight: 700, cursor: "pointer", background: sec === id ? "linear-gradient(180deg, #cfae62, #a8833a)" : "transparent", color: sec === id ? "#fffdf6" : "var(--ink-soft)" }}>{label}</button>
        ))}
      </div>
      {sec === "story" && (<>
        <StoryQuestView state={state} pp={pp} onStart={onStory} actions={actions} onGuardian={onGuardian} onSecBoss={onSecBoss} />
        <TopicKarte state={state} pp={pp} onStart={onStory} />
      </>)}
      {sec === "tower" && <TowerView state={state} pp={pp} onStart={onTower} />}
      {sec === "train" && (<>
        <RehearsalCard state={state} pp={pp} actions={actions} onStart={onRehearsal} />
        <ShinseiDrill state={state} actions={actions} />
        <CalcDrill state={state} actions={actions} />
        <SakuzuDrill state={state} actions={actions} />
        <LawCloze state={state} actions={actions} />
        <ShoshikiDojo state={state} actions={actions} />
      </>)}
      {sec === "road" && (<>
        <PartyCard state={state} actions={actions} />
        <WorldMap pp={pp} r={normRpg(state.rpg)} onGuardian={onGuardian} />
        <KnowledgeCastle state={state} />
        <JourneyCard state={state} />
        <StoryPanel pp={pp} onTalk={(i) => actions.openTalk({ title: STORY_CHAPTERS[i].title, lines: [...(STORY_TALKS[i] || []), ...ALLIES.map((a) => [a.id, a.cheer])] })} />
      </>)}
      {sec === "quest" && (<>
        <SeasonCard state={state} actions={actions} />
        <StudyGroupCard state={state} onStart={onStudyGroup} />
        <DailyQuests state={state} actions={actions} todayCount={todayCount} />
        <CategoryQuests state={state} pp={pp} actions={actions} />
        <WeeklyBossCard state={state} pp={pp} onStart={onWeekly} />
      </>)}
      {sec === "castle" && (<>
        <FinalBoss state={state} qual={qual} pp={pp} />
        <ExamChance state={state} pp={pp} />
        <RivalCard state={state} pp={pp} qual={qual} />
        <PowerChart state={state} />
        <button onClick={() => actions.openTalk(weeklyReport(state, weekKey()) || { title: "週報", lines: [["hero", "週報は、合格力の記録が1週間分たまると読めるようになります。"], ["hero", "毎日の積み重ねを、来週いっしょにふり返りましょうね。"]] })} className="jp btn-ghost w-full py-2 text-sm">先週の週報を見る</button>
        <CastleCard state={state} pp={pp} actions={actions} />
        <DungeonCard state={state} pp={pp} onStart={onDungeon} />
      </>)}
    </>
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
  const [slotOpen, setSlotOpen] = useState(null);   // 装備を選んでいるスロット
  const [qualId, setQualId] = useState("all");
  const [msg, setMsg] = useState("");
  const [view, setView] = useState("world"); // world（世界）| base（拠点・ボス）| skill | forge | dex

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
  if (view === "forge") return <div className="space-y-4">{nav}{msgBox}<ForgePanel state={state} actions={actions} /></div>;
  if (view === "dex") return <div className="space-y-4">{nav}<EvolutionRoad state={state} /><MonsterDex state={state} /></div>;
  if (view === "world") return <div className="space-y-4">{nav}<WorldView state={state} actions={actions} todayCount={todayCount} onWeekly={(boss, pool) => { if (pool.length === 0) { flash("出題できる問題がありません"); return; } setBattle({ boss, pool }); }} onDungeon={(n, pool) => setDungeon({ pool, minutes: n })} onRehearsal={(run) => setRehearsal(run)} onStudyGroup={(allyId) => { const a = allyById(allyId); const pool = studyGroupPool(state, a); if (pool.length) setGroupRun({ allyId, pool }); else flash("出題できる問題がありません"); }} onStory={(run) => setStoryRun(run)} onTower={(run) => setTowerRun(run)} onSecBoss={({ bank, region }) => { const pool = buildPoolFromBanks([bank], 15); if (pool.length) setSecRun({ bank, region, pool }); }} onGuardian={(g) => { const info = regionInfo(g.name); const pool = buildPoolFromBanks(g.banks, 15); if (pool.length === 0) { flash("出題できる問題がありません"); return; } setBattle({ boss: { id: info.boss, guardian: true, region: g.name, idx: 3, loop: 0, icon: info.icon, name: info.guardian, label: `${g.name}の守護者 ${info.guardian}`, hp: 200, atk: 20 }, pool }); }} /></div>;

  return (
    <div className="space-y-4">
      {nav}
      {msgBox}

      {/* 拠点 */}
      <Box title="冒険の拠点" icon={<Castle size={18} />}>
        <div className="flex items-center gap-3 p-2" style={{ background: "var(--sky-pale)", border: "1px solid var(--rule-soft)" }}>
          <div className="flex-shrink-0"><HeroPortrait state={state} size={150} /></div>
          <div className="flex-1 min-w-0">
            <div className="pixel text-sm mb-1" style={{ color: "var(--gold)" }}>💰 {r.gold.toLocaleString()} G</div>
            <div className="flex gap-1 mb-1 text-xl">{RPG_SLOTS.map((s) => <span key={s.id} title={s.label} style={{ opacity: eqMap[s.id] ? 1 : 0.25 }}>{eqMap[s.id] ? <GameIcon ch={eqMap[s.id].icon} id={eqMap[s.id].id} rarity={eqMap[s.id].rarity} size={34} /> : "▫️"}</span>)}</div>
            <div className="jp text-[10px]" style={{ color: "var(--ink-soft)" }}>
              会心率 {bonus.critPct}% ・ EXP+{bonus.xpPct}% ・ ゴールド+{bonus.goldPct}%
            </div>
            {bonus.boostActive && <div className="jp text-[10px] mt-1 px-1 inline-block" style={{ background: "var(--plum)", color: "var(--paper)" }}>📕 EXP2倍 あと{boostLeft}分</div>}
          </div>
        </div>
        <p className="jp text-[10px] mt-2" style={{ color: "var(--ink-mute)" }}>問題に正解するとEXPと一緒にゴールドがたまり、まれにアイテムが落ちます。完全制覇やボス討伐でも装備が手に入ります。</p>
      </Box>

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

      {/* 装備 */}
      <Box title="装備" icon={<Sword size={18} />}>
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
          いまの効果：会心率 {bonus.critPct}% ／ EXP+{bonus.xpPct}% ／ ゴールド+{bonus.goldPct}% ／ ボスへの攻撃+{bonus.bossDmgPct}% ／ 被ダメージ-{bonus.dmgCutPct}% ／ 最大HP {bonus.maxHp}
          <br />会心率はLUK、攻撃はINT、被ダメージ軽減はDEF、HPは連続学習日数とレベルでも上がります。
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
  const [hp, setHp] = useState(bonus.maxHp);
  const [maxHp] = useState(bonus.maxHp);
  const [log, setLog] = useState([`${boss.icon} ${boss.label}があらわれた！`]);
  const [hit, setHit] = useState(null); // "boss" | "me"
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
    const gold = boss.weekly ? (won ? WEEKLY_REWARD.gold : 15) : won ? 60 + 40 * boss.idx + 30 * boss.loop : 10;
    const xp = boss.weekly ? (won ? WEEKLY_REWARD.xp : 0) : won ? 80 + 30 * boss.idx + 20 * boss.loop : 0;
    const itemId = won ? rollRpgItem(boss.weekly ? WEEKLY_REWARD.luck : 1 + boss.idx * 0.6 + boss.loop) : null;
    if (boss.guardian) actions.guardianFinish({ won, region: boss.region, gold, xp, itemId }); // 地域の守護者：勝つと地域が解放される
    else if (boss.weekly) actions.weeklyFinish({ won, gold, xp, itemId }); // 週替わりボスはいつものボスの進み具合には数えない
    else actions.bossFinish({ won, bossId: boss.id, loop: boss.loop, gold, xp, itemId });
    setResult({ won, fled, gold, xp, itemId });
  };

  const addLog = (t) => setLog((l) => [...l, t].slice(-4));
  const flashHit = (who) => { setHit(who); setTimeout(() => setHit(null), 450); };

  const answer = (correct, meta) => {
    if (!q || result) return;
    recordAnswer(item.bankId, q.id, correct, meta);
    let nb = bossHp, nh = hp;
    if (correct) {
      const base = 12 + Math.min(30, Math.floor(st.int / 40));
      const mult = meta && meta.conf === "unsure" ? 0.6 : 1;
      const crit = Math.random() * 100 < bonus.critPct;
      const dmg = Math.max(1, Math.round(base * mult * (1 + bonus.bossDmgPct / 100) * (crit ? 2 : 1)));
      nb = Math.max(0, bossHp - dmg);
      setBossHp(nb);
      flashHit("boss");
      addLog(crit ? `💥 会心の一撃！ ${dmg}のダメージ！` : `⚔ ${boss.name}に${dmg}のダメージ！`);
    } else {
      const raw = boss.atk * (meta && meta.confident ? 1.3 : 1);
      const dmg = Math.max(1, Math.round(raw * (1 - bonus.dmgCutPct / 100)));
      nh = Math.max(0, hp - dmg);
      setHp(nh);
      flashHit("me");
      addLog(`${boss.icon} ${boss.name}の攻撃！ ${dmg}のダメージを受けた`);
    }
    setShowAnswer(false);
    if (nb <= 0) { addLog(`🎉 ${boss.name}を倒した！`); finish(true, false); return; }
    if (nh <= 0) { addLog("💀 力尽きた…"); finish(false, false); return; }
    if (idx + 1 >= pool.length) { addLog(`${boss.name}は逃げていった…`); finish(false, true); return; }
    setIdx(idx + 1);
  };

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
      <div className="rpg-box p-1">
        <div className="rpg-inner-border">
          <div className="flex items-center gap-3">
            <div className={`text-5xl ${hit === "boss" ? "sq-shake" : ""}`}><GameIcon ch={boss.icon} id={boss.id} art={boss.art} size={64} boss /></div>
            <div className="flex-1">
              <div className="jp text-sm mb-1" style={{ color: "var(--brick)", fontWeight: "bold" }}>{boss.label}</div>
              {bar(bossHp, boss.hp, "linear-gradient(90deg, var(--brick), #c66060)")}
              <div className="pixel text-[10px] mt-0.5" style={{ color: "var(--ink-soft)" }}>HP {bossHp}/{boss.hp}</div>
            </div>
          </div>
          <div className={`flex items-center gap-3 mt-3 ${hit === "me" ? "sq-shake" : ""}`}>
            <div className="flex-shrink-0 flex items-end" title="あなた">
              <CharacterDisplay level={state.player.level} job="" icon="" size={44} showAura={false} />
              {(() => { const pt = getPetInfo(state); return pt ? <span style={{ marginLeft: -6 }}><PetIcon pet={pt} size={24} /></span> : null; })()}
            </div>
            <div className="flex-1">
              {bar(hp, maxHp, "linear-gradient(90deg, var(--sage), var(--mint))")}
              <div className="pixel text-[10px] mt-0.5" style={{ color: "var(--ink-soft)" }}>HP {hp}/{maxHp}</div>
            </div>
            <button disabled={!(r.consumables.potion > 0) || hp >= maxHp} onClick={usePotion} className="jp text-[11px] px-2 py-1 btn-ghost">🧪×{r.consumables.potion || 0}</button>
          </div>
          <div className="jp text-[11px] mt-2 p-1.5" style={{ background: "var(--cream)", color: "var(--ink)", minHeight: 40 }}>
            {log.map((l, i) => <div key={i} style={{ opacity: i === log.length - 1 ? 1 : 0.55 }}>{l}</div>)}
          </div>
        </div>
      </div>
      {q ? (
        <div className="rpg-box p-1">
          <div className="rpg-inner-border min-h-[160px] flex flex-col">
            <div className="jp text-[10px] mb-2" style={{ color: "var(--ink-mute)" }}>{item.bankName}</div>
            <div className="qtext jp text-base md:text-lg flex-1 break-words" style={{ color: "var(--ink)" }}>{renderQText(q.q, q.q_formats)}</div>
            <QuestionImages bankId={item.bankId} question={q} side="q" />
            {showAnswer ? (
              <>
                <div className="jp text-[10px] mt-3 mb-1" style={{ color: "var(--gold)" }}>答え</div>
                <div className="qtext jp text-base md:text-lg break-words p-2" style={{ background: "var(--sky-pale)", border: "1px solid var(--gold)", color: "var(--ink)" }}>{renderFormattedText(q.a, q.a_formats)}</div>
                <QuestionImages bankId={item.bankId} question={q} side="a" />
                <LawRefChips q={q} />
                <AnswerPanel onAnswer={answer} question={q} srSettings={state.srSettings} correctLabel="攻撃" wrongLabel="不正解" />
              </>
            ) : (
              <button onClick={() => setShowAnswer(true)} className="jp btn-info mt-3 py-2 flex items-center justify-center gap-1"><Eye size={16} /> 答えを見る</button>
            )}
          </div>
        </div>
      ) : (
        <p className="jp text-xs" style={{ color: "var(--ink-mute)" }}>問題が見つかりません。</p>
      )}
    </div>
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

// ============ キャラクターの育成（クラス・相棒・背景・覚醒） ============
const TIER_ORDER = ["tier1", "tier2", "tier3", "tier4", "tier5", "tier6"];
const tierIndex = (level) => TIER_ORDER.indexOf(getCharacterTier(level)); // 0〜5

// ── クラス（Lv10から転職できる） ──
const RPG_CLASSES = [
  { id: "sage",   name: "賢者", icon: "🔮", color: "#9b7fc8", ranks: ["見習い魔導士", "魔導士", "賢者", "大賢者", "星詠みの賢者"], style: "正解数が多い", bonusText: (k) => `EXP+${5 + 2 * k}%`,                        fx: (k) => ({ xpPct: 5 + 2 * k }) },
  { id: "knight", name: "騎士", icon: "🛡️", color: "#5a9ccc", ranks: ["見習い騎士", "騎士", "聖騎士", "守護騎士長", "不動の守護神"],       style: "学習時間が長い", bonusText: (k) => `被ダメージ-${8 + 2 * k}%・HP+${10 + 5 * k}`, fx: (k) => ({ dmgCutPct: 8 + 2 * k, hpPlus: 10 + 5 * k }) },
  { id: "ranger", name: "狩人", icon: "🏹", color: "#7fae66", ranks: ["見習い狩人", "狩人", "疾風の狩人", "千里眼の射手", "天翔ける狩神"], style: "連続正解・会心が多い", bonusText: (k) => `会心率+${3 + k}%`,                   fx: (k) => ({ critPct: 3 + k }) },
  { id: "hero",   name: "勇者", icon: "⚔️", color: "#c99a3a", ranks: ["見習い勇者", "勇者", "歴戦の勇者", "覇者", "伝説の勇者"],           style: "ボス討伐・完全制覇が多い", bonusText: (k) => `ボスへの攻撃+${10 + 4 * k}%`, fx: (k) => ({ bossDmgPct: 10 + 4 * k }) },
];
const CLASS_CHANGE_COST = 300;
const classById = (id) => RPG_CLASSES.find((c) => c.id === id) || null;
const classRankIndex = (level) => Math.max(0, Math.min(4, tierIndex(level) - 1)); // Lv10〜：0、Lv50〜：4
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
function getClassInfo(state) {
  const r = normRpg(state.rpg);
  const c = classById(r.classId);
  if (!c) return null;
  const k = classRankIndex(state.player.level);
  return { ...c, rank: k, rankName: c.ranks[k] };
}

// ── 相棒 ──
const PET_TYPES = {
  dragon: { label: "ドラゴン", stages: [["🥚", "竜のタマゴ"], ["🦎", "おさな竜"], ["🐲", "わか竜"], ["🐉", "竜"], ["🐉", "古竜"]], bonusText: (s) => `ボスへの攻撃+${s * 5}%`, fx: (s) => ({ bossDmgPct: s * 5 }) },
  bird:   { label: "鳥",       stages: [["🥚", "鳥のタマゴ"], ["🐣", "ひな"], ["🐥", "こどり"], ["🐦", "わかどり"], ["🦅", "大鷲"]],    bonusText: (s) => `ゴールド+${s * 5}%`,     fx: (s) => ({ goldPct: s * 5 }) },
  // 星獣ルミ：描きおろしの白いもふもふ。孵化後は絵で表示（art）。今日学習したら笑顔の絵（happy）
  lumi:   { label: "星獣ルミ", stages: [["🥚", "星のタマゴ"], ["✨", "ちびルミ"], ["🌟", "ルミ"], ["🕊", "光翼のルミ"], ["👑", "天空の守り神"]], bonusText: (s) => `EXP+${s * 2}%・素材ドロップ+${s * 3}%`, fx: (s) => ({ xpPct: s * 2, dropPct: s * 3 }),
    art: [null, "pet-lumi-small.jpg", "pet-lumi.jpg", "pet-lumi.jpg", "pet-lumi.jpg"], happy: "pet-lumi-happy.jpg" },
};
// 相棒の姿：絵があれば絵（段階が上がるほど光る）、なければ絵文字
function PetIcon({ pet, size = 40, style }) {
  const art = pet.type.art && pet.type.art[pet.stage];
  if (!art) return <span style={{ fontSize: size * 0.8, lineHeight: 1, ...style }}>{pet.icon}</span>;
  const src = `${ART_URL}${pet.studiedToday && pet.stage >= 2 && pet.type.happy ? pet.type.happy : art}`;
  const glow = pet.stage >= 4 ? "0 0 0 2px #fdfbf5, 0 0 0 4px #d6b56a, 0 0 14px 4px rgba(214,181,106,0.8)" : pet.stage >= 3 ? "0 0 0 2px #fdfbf5, 0 0 12px 3px rgba(127,163,216,0.8)" : "0 1px 4px rgba(0,0,0,0.2)";
  return <img src={src} alt={pet.stageName} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "2px solid #fdfbf5", boxShadow: glow, display: "inline-block", verticalAlign: "middle", ...style }} />;
}
const PET_THRESHOLDS = [0, 30, 150, 500, 1500]; // 育成ポイント
function getPetInfo(state) {
  const r = normRpg(state.rpg);
  const p = r.pet;
  if (!p || !PET_TYPES[p.type]) return null;
  const type = PET_TYPES[p.type];
  const days = new Set(state.studyLog.filter((l) => l.date >= (p.since || "")).map((l) => l.date)).size;
  const correctSince = Math.max(0, calculateStatus(state).totalCorrect - (p.baseCorrect || 0));
  const points = days * 10 + Math.floor(correctSince / 5); // 学習した日1日＝10、正解5問＝1
  let stage = 0;
  PET_THRESHOLDS.forEach((t, i) => { if (points >= t) stage = i; });
  const next = PET_THRESHOLDS[stage + 1] ?? null;
  const studiedToday = state.studyLog.some((l) => l.date === todayStr());
  return { ...p, type, points, stage, next, icon: type.stages[stage][0], stageName: type.stages[stage][1], days, studiedToday, maxed: stage === PET_THRESHOLDS.length - 1 };
}

// ── 覚醒★（記憶が定着した問題の数） ──
const AWAKEN_THRESHOLDS = [100, 300, 700, 1500, 3000];
const MASTERED_STABILITY = 21; // FSRSの安定度（日）
function getAwakening(state) {
  let mastered = 0;
  for (const b of state.questionBanks) for (const q of b.questions || []) if (q.fs && q.fs.s >= MASTERED_STABILITY) mastered++;
  let stars = 0;
  AWAKEN_THRESHOLDS.forEach((t, i) => { if (mastered >= t) stars = i + 1; });
  return { mastered, stars, next: AWAKEN_THRESHOLDS[stars] ?? null };
}

// クラス・相棒・覚醒による効果（getRpgBonuses から使う）
function getGrowthFx(state) {
  const fx = [];
  const c = getClassInfo(state);
  if (c) fx.push(c.fx(c.rank));
  const p = getPetInfo(state);
  if (p && p.stage > 0) fx.push(p.type.fx(p.stage));
  const aw = getAwakening(state);
  if (aw.stars > 0) fx.push({ xpPct: aw.stars * 3, critPct: aw.stars });
  return fx;
}

// ── 背景 ──
const RPG_SCENES = {
  tier1: { name: "はじまりの村", bg: "linear-gradient(#cfe6f5 0%, #e8f3d8 62%, #9cc27a 62%, #7fa85e 100%)", deco: ["🏠", "🌳"] },
  tier2: { name: "風の草原",     bg: "linear-gradient(#a9d4ef 0%, #d9eefa 58%, #a6cf7a 58%, #86b45a 100%)", deco: ["⛰️", "🌾"] },
  tier3: { name: "古の砦",       bg: "linear-gradient(#8fb6d8 0%, #c9dcec 58%, #9aa48a 58%, #7d876d 100%)", deco: ["🏯", "🌲"] },
  tier4: { name: "王都の城",     bg: "linear-gradient(#f6d79a 0%, #fbe9c6 56%, #b9a77f 56%, #9b8a63 100%)", deco: ["🏰", "🚩"] },
  tier5: { name: "灼熱の火山",   bg: "linear-gradient(#5b2a3a 0%, #a0485a 55%, #6a3a2a 55%, #432318 100%)", deco: ["🌋", "🔥"] },
  tier6: { name: "天空の聖域",   bg: "linear-gradient(#2a3a7a 0%, #7a6ab8 50%, #e9defa 50%, #cdbff0 100%)", deco: ["☁️", "🌟"] },
};

// ── 主人公の進化段階（姿）：レベル10・20・30・40・50で進化。額縁・紋章・翼・光が豪華になる ──
const HERO_STAGES = [
  { name: "白銀の見習い", color: "#a9b1c2", frame: "linear-gradient(180deg, #e6e9f0, #a9b1c2)", glow: "0 6px 18px rgba(40,50,80,0.14)" },
  { name: "蒼の魔導士", color: "#7fa3d8", frame: "linear-gradient(180deg, #e9cf8e, #b08a3e)", glow: "0 0 18px rgba(127,163,216,0.6)" },
  { name: "翠の導師", color: "#6fb8b4", frame: "linear-gradient(180deg, #f1dfae, #b08a3e 60%, #6fb8b4)", glow: "0 0 22px rgba(111,184,180,0.65)", corners: true },
  { name: "金の賢者", color: "#d6b56a", frame: "linear-gradient(180deg, #fff1c4, #d6b56a 50%, #a8833a)", glow: "0 0 26px rgba(214,181,106,0.8)", corners: true, crest: true },
  { name: "紫焔の大賢者", color: "#a593d8", frame: "linear-gradient(180deg, #f1dfae, #a593d8 55%, #6c5a96)", glow: "0 0 30px rgba(165,147,216,0.85)", corners: true, crest: true, wings: true },
  { name: "星詠みの大賢者", color: "#f2c14e", frame: "linear-gradient(135deg, #fff3c4, #e9cf8e 25%, #d98fa6 50%, #8c79c8 75%, #e9cf8e)", glow: "0 0 36px rgba(242,193,78,0.9)", corners: true, crest: true, wings: true, stars: true },
];
const HERO_STAGE_LV = [1, 10, 20, 30, 40, 50];
const heroStage = (level) => { const i = Math.max(0, tierIndex(level)); return { ...HERO_STAGES[i], idx: i }; };
// 姿ごとの立ち絵：public/white-hero-s1.jpg 〜 white-hero-s5.jpg（Lv10・20・30・40・50の姿）を置くと自動で切り替わる。
// その姿の絵が無ければ、前の姿の絵 → 基本の絵（white-hero.jpg）の順に使う
const heroStageUrl = (i) => (i > 0 ? `${(import.meta.env && import.meta.env.BASE_URL) || "/"}white-hero-s${i}.jpg` : WHITE_HERO_URL);
function StageHeroImg({ idx, style, onAllFail }) {
  const [i, setI] = useState(idx);
  useEffect(() => { setI(idx); }, [idx]);
  return <img src={heroStageUrl(i)} alt="主人公の立ち絵" style={style} onError={() => { if (i > 0) setI(i - 1); else if (onAllFail) onAllFail(); }} />;
}

// 額縁の飾り（紋章・翼・四隅の金細工・星のきらめき）。親要素は position: relative にする
function HeroDecor({ stage, w }) {
  const cw = stage.wings ? w * 0.62 : w * 0.2;
  return (
    <>
      {stage.crest && (
        <svg viewBox={stage.wings ? "0 0 124 40" : "0 0 40 40"} width={cw} height={cw * (stage.wings ? 40 / 124 : 1)} aria-hidden="true"
          style={{ position: "absolute", left: "50%", top: -(cw * (stage.wings ? 40 / 124 : 1)) * 0.42, transform: "translateX(-50%)", zIndex: 2, overflow: "visible", filter: `drop-shadow(0 0 6px ${stage.color})` }}>
          {stage.wings && [1, -1].map((s) => (
            <g key={s} transform={s === -1 ? "translate(124 0) scale(-1 1)" : undefined}>
              <g style={{ transformBox: "view-box", transformOrigin: "48px 22px", animation: "sqhFlap 3s ease-in-out infinite" }}>
                <path d="M48 22C40 8 22 2 4 6c8 3 12 6 14 9-6 0-10 1-12 4 7 0 12 1 15 3-5 1-8 3-9 6 9-1 18 0 26 2 4 1 8-1 10-8z" fill="#fdfbf5" stroke={stage.color} strokeWidth="1.4" strokeLinejoin="round" />
                <path d="M44 20c-8-4-18-6-28-5M42 24c-7-2-15-2-22-1" fill="none" stroke={stage.color} strokeWidth=".8" opacity=".7" />
              </g>
            </g>
          ))}
          <g transform={stage.wings ? "translate(42 0)" : undefined}>
            <path d="M20 2l6 8-6 26-6-26z" fill="#fdfbf5" stroke="#b08a3e" strokeWidth="1.2" />
            <circle cx="20" cy="18" r="8" fill={stage.color} stroke="#b08a3e" strokeWidth="2" />
            <circle cx="17.5" cy="15.5" r="2.4" fill="#fff" opacity=".8" />
          </g>
        </svg>
      )}
      {stage.corners && [0, 1].map((s) => (
        <svg key={s} viewBox="0 0 30 30" width={w * 0.16} height={w * 0.16} aria-hidden="true" style={{ position: "absolute", bottom: -4, [s ? "right" : "left"]: -4, zIndex: 2, transform: s ? "scaleX(-1)" : undefined }}>
          <path d="M3 27V12c0-5 4-9 9-9M3 27h15c5 0 9-4 9-9" fill="none" stroke="#b08a3e" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="7" cy="23" r="3" fill={stage.color} stroke="#b08a3e" strokeWidth="1.2" />
        </svg>
      ))}
      {stage.stars && [[8, 18], [88, 12], [94, 46], [4, 52], [50, 4], [76, 80], [18, 84]].map(([x, y], i) => (
        <span key={i} aria-hidden="true" style={{ position: "absolute", left: `${x}%`, top: `${y}%`, zIndex: 2, fontSize: 10 + (i % 3) * 3, color: "#fff3c4", textShadow: "0 0 6px #f2c14e", animation: `sqTwinkleT 2.6s ease-in-out ${i * 0.37}s infinite`, pointerEvents: "none" }}>✦</span>
      ))}
      <style>{"@keyframes sqhFlap{0%,100%{transform:rotate(0)}50%{transform:rotate(-6deg)}}"}</style>
    </>
  );
}

// キャラクター・背景・オーラ・光の粒・相棒・★をまとめて描く
// 白金テーマの主人公：少女の立ち絵（アーチ形の額縁）。覚醒の★・相棒・クラスはドット絵版と同じ情報を出す
function WhiteHeroPortrait({ state, size = 160 }) {
  const [imgOk, setImgOk] = useState(true);
  const cls = getClassInfo(state);
  const pet = getPetInfo(state);
  const aw = getAwakening(state);
  const scene = RPG_SCENES[getCharacterTier(state.player.level)] || RPG_SCENES.tier1;
  if (!imgOk) return <HeroPortrait state={state} size={size} pixel />;
  const h = Math.round(size * 1.3);
  const stg = heroStage(state.player.level);
  return (
    <div style={{ width: size, display: "inline-block", marginTop: stg.crest ? size * 0.12 : 0 }}>
      <div style={{ width: size, height: h, position: "relative", padding: 3, borderRadius: `${size / 2}px ${size / 2}px 4px 4px`, background: stg.frame, boxShadow: stg.glow }}>
        <HeroDecor stage={stg} w={size} />
        <div style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative", borderRadius: `${size / 2 - 3}px ${size / 2 - 3}px 2px 2px`, background: "#e9e4d6" }}>
          <StageHeroImg idx={stg.idx} onAllFail={() => setImgOk(false)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 16%", display: "block" }} />
          {aw.stars > 0 && (
            <div style={{ position: "absolute", top: size * 0.1, left: 0, right: 0, textAlign: "center", fontSize: Math.max(10, size * 0.08), color: "#ffe7a3", letterSpacing: 2, textShadow: "0 0 6px rgba(176,138,62,0.95), 0 1px 1px rgba(0,0,0,0.3)" }}>{"★".repeat(aw.stars)}</div>
          )}
          {pet && (
            <div title={`${pet.name}（${pet.stageName}）`} style={{ position: "absolute", right: "6%", bottom: "4%", width: size * 0.26, height: size * 0.26, borderRadius: "50%", background: "rgba(253,251,245,0.92)", border: "1px solid #b08a3e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.15, animation: "sqBob 1.8s ease-in-out infinite", overflow: "hidden" }}>{pet.type.art && pet.type.art[pet.stage] ? <PetIcon pet={pet} size={size * 0.26} style={{ border: "none", boxShadow: "none" }} /> : pet.icon}</div>
          )}
        </div>
      </div>
      <div className="jp text-center mt-1.5 px-1 py-0.5" style={{ background: "#fdfbf5", border: "1px solid #b08a3e", borderRadius: 4, color: "#22335c", fontWeight: 700, fontSize: Math.max(10, size * 0.07) }}>
        {cls ? `${cls.icon} ${cls.rankName}` : "クラス未選択"}
      </div>
      <div className="jp text-center mt-0.5" style={{ fontSize: Math.max(9, size * 0.065), color: stg.idx > 0 ? "#8f6f2c" : "#5b6b8c", fontWeight: 700 }}>{stg.name}</div>
      <div className="jp text-center" style={{ fontSize: Math.max(9, size * 0.055), color: "#5b6b8c" }}>{scene.name}</div>
      <style>{`@keyframes sqBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}`}</style>
    </div>
  );
}

function HeroPortrait({ state, size = 160, pixel = false }) {
  // 白金テーマでは少女の立ち絵を出す（pixel を付けたときはドット絵のまま）
  if (!pixel && ((state.displaySettings && state.displaySettings.theme) || "white") === "white") return <WhiteHeroPortrait state={state} size={size} />;
  const level = state.player.level;
  const tier = getCharacterTier(level);
  const ti = tierIndex(level);
  const scene = RPG_SCENES[tier] || RPG_SCENES.tier1;
  const cls = getClassInfo(state);
  const pet = getPetInfo(state);
  const aw = getAwakening(state);
  const auraColor = cls ? cls.color : "#7eb6d6";
  const sparkleCount = aw.stars * 2 + Math.max(0, ti - 2) * 2;
  const sparkles = Array.from({ length: sparkleCount }, (_, i) => ({ left: (i * 37 + 11) % 90 + 3, top: (i * 53 + 7) % 60 + 4, delay: (i * 0.37) % 2.4, size: 8 + (i % 3) * 3 }));
  return (
    <div style={{ width: size, display: "inline-block" }}>
      <style>{`@keyframes sqTwinkle{0%,100%{opacity:0;transform:scale(.4)}50%{opacity:1;transform:scale(1)}}@keyframes sqBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}@keyframes sqPulse{0%,100%{opacity:.55}50%{opacity:.95}}`}</style>
      <div style={{ width: size, height: size, position: "relative", overflow: "hidden", background: scene.bg, border: `3px solid ${aw.stars > 0 ? "#d6a84e" : "var(--rule)"}`, boxShadow: aw.stars >= 3 ? "0 0 10px rgba(214,168,78,0.8)" : "none" }}>
        {/* 背景の飾り */}
        <span style={{ position: "absolute", left: "4%", bottom: "30%", fontSize: size * 0.16, opacity: 0.85 }}>{scene.deco[0]}</span>
        <span style={{ position: "absolute", right: "4%", bottom: "34%", fontSize: size * 0.13, opacity: 0.85 }}>{scene.deco[1]}</span>
        {/* クラスのオーラ */}
        {(cls || aw.stars > 0) && (
          <div style={{ position: "absolute", left: "50%", top: "52%", width: size * 0.9, height: size * 0.9, transform: "translate(-50%,-50%)", borderRadius: "50%", background: `radial-gradient(circle, ${auraColor}aa 0%, ${auraColor}33 45%, transparent 70%)`, animation: "sqPulse 2.6s ease-in-out infinite", pointerEvents: "none" }} />
        )}
        {/* 光の粒 */}
        {sparkles.map((sp, i) => (
          <span key={i} style={{ position: "absolute", left: `${sp.left}%`, top: `${sp.top}%`, fontSize: sp.size, color: aw.stars > 0 ? "#ffe9a0" : "#ffffff", animation: `sqTwinkle 2.4s ease-in-out ${sp.delay}s infinite`, pointerEvents: "none", textShadow: "0 0 4px rgba(255,230,150,0.9)" }}>✦</span>
        ))}
        {/* キャラクター */}
        <div style={{ position: "absolute", left: "50%", bottom: "2%", transform: "translateX(-50%)" }}>
          <CharacterDisplay level={level} job="" icon="" size={Math.round(size * 0.74)} showAura={false} />
        </div>
        {/* 相棒 */}
        {pet && (
          <div style={{ position: "absolute", right: "5%", bottom: "4%", fontSize: size * (0.12 + pet.stage * 0.02), animation: "sqBob 1.8s ease-in-out infinite", filter: pet.maxed ? "drop-shadow(0 0 6px gold)" : "none" }} title={`${pet.name}（${pet.stageName}）`}>
            {pet.type.art && pet.type.art[pet.stage] ? <PetIcon pet={pet} size={size * (0.16 + pet.stage * 0.025)} /> : pet.icon}{!pet.studiedToday && pet.stage > 0 && <span style={{ fontSize: size * 0.07, position: "absolute", top: -size * 0.04, right: -size * 0.03 }}>💤</span>}
          </div>
        )}
        {/* 覚醒の★ */}
        {aw.stars > 0 && (
          <div className="pixel" style={{ position: "absolute", top: 3, left: 0, right: 0, textAlign: "center", fontSize: Math.max(10, size * 0.08), color: "#ffd75e", textShadow: "1px 1px 0 #7a5a10, 0 0 6px rgba(255,215,94,0.9)" }}>{"★".repeat(aw.stars)}</div>
        )}
      </div>
      <div className="jp text-center px-1 py-0.5" style={{ background: cls ? cls.color : "var(--slate)", color: "var(--paper)", fontSize: Math.max(10, size * 0.07) }}>
        {cls ? `${cls.icon} ${cls.rankName}` : "クラス未選択"}
      </div>
      <div className="jp text-center" style={{ fontSize: Math.max(9, size * 0.06), color: "var(--ink-mute)" }}>📍{scene.name}</div>
    </div>
  );
}

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

// ============ 回答パネル（確信度・間違いの種類） ============
// 答えを見た後に表示する。正解は「確実/自信なし」の2択、
// 不正解は原因（知識不足・混同・読み違い・ケアレス）を1タップで選ぶ。
// ============ バトル演出（問題を解く画面） ============
// 問題1問＝魔物1体。答えのボタン（AnswerPanel）を押すと battleBus に結果が届き、BattleStage が攻撃・反撃を演出する。
// 出題の順番や記録の保存にはかかわらない（見た目と効果音だけ）。設定でオフにもできる（displaySettings.battle）。

// ── 回答の結果を BattleStage に伝える仕組み ──
const battleBus = typeof EventTarget !== "undefined" ? new EventTarget() : null;
const emitBattle = (detail) => { try { if (battleBus) battleBus.dispatchEvent(new CustomEvent("answer", { detail })); } catch (e) { /* 演出だけなので失敗しても無視 */ } };
// 戦利品（素材・必殺技のEXP）を StudyRPG に渡して記録してもらう
const emitReward = (detail) => { try { if (battleBus) battleBus.dispatchEvent(new CustomEvent("reward", { detail })); } catch (e) { /* 失敗しても学習は続ける */ } };

// ── 1回の学習（出撃）の記録：HP・コンボ・討伐数。リザルト画面で使う ──
const BATTLE = { key: null, hp: 100, maxHp: 100, combo: 0, maxCombo: 0, defeated: 0, crits: 0, escaped: 0, faints: 0, mats: {}, start: null };
const xpTotalOf = (p) => { let t = p.xp || 0; for (let l = 1; l < (p.level || 1); l++) t += getXpForNextLevel(l); return t; };
function resetBattle(state) {
  const b = getRpgBonuses(state);
  Object.assign(BATTLE, { hp: b.maxHp, maxHp: b.maxHp, combo: 0, maxCombo: 0, defeated: 0, crits: 0, escaped: 0, faints: 0, mats: {}, start: { xp: xpTotalOf(state.player), level: state.player.level, gold: normRpg(state.rpg).gold } });
}
// コンボの節目で出る必殺技（カットイン）
const COMBO_CUTS = [
  { n: 5, name: "連撃・星屑の矢" },
  { n: 10, name: "閃光・叡智の剣" },
  { n: 20, name: "秘奥義・大賢者の審判" },
  { n: 30, name: "極意・天地開闢" },
];
const comboCut = (n) => COMBO_CUTS.find((c) => c.n === n) || (n > 30 && n % 10 === 0 ? COMBO_CUTS[COMBO_CUTS.length - 1] : null);

// ── 魔物：問題ごとに種族（形）は固定、色と名前は科目（問題集の名前）で決まる ──
const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const MON_THEMES = [
  { re: /区分所有/, prefix: "共用", mat: "m-kyoyo", region: "区分所有の双子塔", body: "#a593d8", dark: "#5e4d93", light: "#e4dcf6" },
  { re: /調査士法/, prefix: "懲戒", mat: "m-chokai", region: "調査士法の砦", body: "#d6b56a", dark: "#8f6f2c", light: "#f6ead0" },
  { re: /登記|不登/, prefix: "地番", mat: "m-chiban", region: "不動産登記法の王都", body: "#7fa3d8", dark: "#34508c", light: "#dfe8f6" },
  { re: /民法/, prefix: "契約", mat: "m-keiyaku", region: "民法の古の森", body: "#86bd70", dark: "#4f7a3a", light: "#e2f0da" },
  { re: /測量|計算|座標/, prefix: "座標", mat: "m-zahyo", region: "測量の星見台", body: "#6fb8b4", dark: "#2f6f6c", light: "#d8efee" },
  { re: /書式|作図|記述/, prefix: "書式", mat: "m-shoshiki", region: "書式の迷宮", body: "#e3908a", dark: "#9a4d47", light: "#f8e0dd" },
];
const MON_THEME_DEFAULT = { prefix: "迷宮の", mat: "m-meikyu", region: "未踏の地", body: "#a7afc2", dark: "#5b6b8c", light: "#e6e9f0" };
// 科目（地域）の判定：問題集が入っているフォルダの名前＋問題集の名前で決める（フォルダ＝科目、問題集＝カテゴリ）
const BANK_FOLDER = new Map(); // 問題集の名前 → フォルダの名前（StudyRPG が描画のたびに更新）
function syncFolderIndex(state) {
  BANK_FOLDER.clear();
  const fm = new Map((state.folders || []).map((f) => [f.id, f.name]));
  (state.questionBanks || []).forEach((b) => { if (b.folderId && fm.has(b.folderId)) BANK_FOLDER.set(b.name, fm.get(b.folderId)); });
}
const themeOf = (bankName) => { const t = `${BANK_FOLDER.get(bankName) || ""} ${bankName || ""}`; return MON_THEMES.find((x) => x.re.test(t)) || MON_THEME_DEFAULT; };
const MON_UNKNOWN = { body: "#3d4258", dark: "#1f2233", light: "#5d6380", eye: "#f2c14e" };
const EYE = "#22335c";
const monEyes = (c, y = 58, gap = 10, r = 4) => (<>
  <ellipse cx={50 - gap} cy={y} rx={r} ry={r * 1.35} fill={c.eye || EYE} /><ellipse cx={50 + gap} cy={y} rx={r} ry={r * 1.35} fill={c.eye || EYE} />
  {!c.eye && <><circle cx={50 - gap + 1.3} cy={y - 2} r="1.3" fill="#fff" /><circle cx={50 + gap + 1.3} cy={y - 2} r="1.3" fill="#fff" /></>}
</>);
const MONSTER_SPECIES = [
  { id: "slime", name: "スライム", draw: (c) => (<>
    <path d="M16 80c0-26 16-52 34-60 18 8 34 34 34 60 0 6-6 8-12 8H28c-6 0-12-2-12-8z" fill={c.body} stroke={c.dark} strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M28 58c2-12 8-22 15-28" fill="none" stroke={c.light} strokeWidth="4" strokeLinecap="round" opacity=".8" />
    {monEyes(c, 60, 11)}<path d="M44 72c4 3 8 3 12 0" fill="none" stroke={c.eye || EYE} strokeWidth="2.2" strokeLinecap="round" />
  </>) },
  { id: "bat", name: "バット", draw: (c) => (<>
    <path d="M38 50C28 36 12 34 4 44c8 2 10 8 8 15 6-4 12-2 16 4 2-6 6-8 10-6zM62 50c10-14 26-16 34-6-8 2-10 8-8 15-6-4-12-2-16 4-2-6-6-8-10-6z" fill={c.dark} stroke={c.dark} strokeWidth="2" strokeLinejoin="round" />
    <path d="M38 38l-2-12 9 8M62 38l2-12-9 8" fill={c.body} stroke={c.dark} strokeWidth="2" strokeLinejoin="round" />
    <circle cx="50" cy="54" r="16" fill={c.body} stroke={c.dark} strokeWidth="2.5" />
    {monEyes(c, 52, 7, 3.2)}<path d="M45 61l2 4 2-4M51 61l2 4 2-4" fill="#fff" stroke={c.dark} strokeWidth=".8" />
  </>) },
  { id: "mush", name: "マタンゴ", draw: (c) => (<>
    <rect x="33" y="50" width="34" height="36" rx="12" fill="#f6ecd8" stroke={c.dark} strokeWidth="2.5" />
    <path d="M12 54c0-22 17-36 38-36s38 14 38 36z" fill={c.body} stroke={c.dark} strokeWidth="2.5" strokeLinejoin="round" />
    <circle cx="32" cy="38" r="5" fill={c.light} /><circle cx="56" cy="30" r="6" fill={c.light} /><circle cx="72" cy="44" r="4" fill={c.light} />
    <path d="M39 61l7 3M61 61l-7 3" stroke={c.eye || EYE} strokeWidth="2.2" strokeLinecap="round" />{monEyes(c, 69, 7, 3)}
  </>) },
  { id: "wisp", name: "ウィスプ", draw: (c) => (<>
    <path d="M50 10c10 18 28 26 26 48a26 26 0 0 1-52 0c-2-18 12-24 18-36 2 6 6 8 8 8 0-8-2-14 0-20z" fill={c.body} stroke={c.dark} strokeWidth="2.5" strokeLinejoin="round" opacity=".95" />
    <path d="M50 40c6 8 14 12 13 22a13 13 0 0 1-26 0c0-8 6-10 8-16 1 3 3 4 5 4z" fill={c.light} opacity=".85" />
    {monEyes(c, 62, 8, 3.4)}
  </>) },
  { id: "ghost", name: "ゴースト", draw: (c) => (<>
    <path d="M24 88V46a26 26 0 0 1 52 0v42l-8.6-7-8.8 7-8.6-7-8.6 7-8.8-7z" fill={c.light} stroke={c.dark} strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M24 60c-6 0-10-4-12-8M76 60c6 0 10-4 12-8" fill="none" stroke={c.dark} strokeWidth="2.2" strokeLinecap="round" />
    {monEyes(c, 48, 9, 3.8)}<ellipse cx="50" cy="64" rx="5" ry="6" fill={c.eye || EYE} />
  </>) },
  { id: "golem", name: "ゴーレム", draw: (c) => (<>
    <path d="M26 22h48l8 14v36l-10 14H28L18 72V36z" fill="#a39d8f" stroke="#5f5a50" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M26 22h48l4 7H22z" fill={c.body} opacity=".9" /><path d="M34 22l4 10-4 6M70 64l-6 6 2 10" fill="none" stroke="#5f5a50" strokeWidth="1.6" />
    <rect x="32" y="46" width="12" height="5" rx="1.5" fill={c.eye || "#f2c14e"} /><rect x="56" y="46" width="12" height="5" rx="1.5" fill={c.eye || "#f2c14e"} />
    <path d="M38 68h24" stroke="#5f5a50" strokeWidth="3" strokeLinecap="round" />
  </>) },
  { id: "imp", name: "インプ", draw: (c) => (<>
    <path d="M70 70c12 0 18-6 20-14l-4 2" fill="none" stroke={c.dark} strokeWidth="2.5" strokeLinecap="round" />
    <path d="M30 44l-14-8 4 14M70 44l14-8-4 14" fill={c.dark} stroke={c.dark} strokeWidth="2" strokeLinejoin="round" />
    <path d="M34 30l-6-16 14 10M66 30l6-16-14 10" fill="#f6ecd8" stroke={c.dark} strokeWidth="2" strokeLinejoin="round" />
    <circle cx="50" cy="54" r="24" fill={c.body} stroke={c.dark} strokeWidth="2.5" />
    <path d="M39 47l7 3M61 47l-7 3" stroke={c.eye || EYE} strokeWidth="2.4" strokeLinecap="round" />{monEyes(c, 55, 9, 3.4)}
    <path d="M40 67c6 5 14 5 20 0" fill="none" stroke={c.eye || EYE} strokeWidth="2.2" strokeLinecap="round" /><path d="M44 67l2 4 2-3M52 68l2 3 2-4" fill="#fff" />
  </>) },
  { id: "mimic", name: "ミミック", draw: (c) => (<>
    <path d="M16 50h68v32a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4z" fill="#a8743f" stroke="#5f3f1f" strokeWidth="2.5" />
    <path d="M18 46c0-14 14-24 32-24s32 10 32 24l-4 8H22z" fill="#b98552" stroke="#5f3f1f" strokeWidth="2.5" strokeLinejoin="round" transform="rotate(-8 18 50)" />
    <path d="M22 54h56l-4 10-6-6-6 8-6-8-6 8-6-8-6 8-6-6z" fill="#fff" stroke="#5f3f1f" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M40 64c4 6 16 6 20 0" fill="#c94a4a" />
    <path d="M16 70h68M50 50v36" stroke={c.body} strokeWidth="4" /><circle cx="50" cy="74" r="4" fill={c.light} stroke={c.dark} strokeWidth="1.5" />
    {monEyes({ ...c, eye: c.eye || "#f2c14e" }, 38, 12, 3)}
  </>) },
];
// 描きおろしの魔物（public/art/mon/）。ふだんの魔物と、強い魔物（論点の主・ボス）
const MON_PAINTED = [
  ["slime", "スライム"], ["wolf", "ウルフ"], ["magician", "マジシャン"], ["stonegolem", "ストーンゴーレム"], ["harpy", "ハーピー"],
  ["mandrake", "マンドレイク"], ["lizard", "リザードマン"], ["mimic", "ミミック"], ["sprite", "マジック・スプライト"], ["lunawolf", "ルナウルフ"],
  ["wisp", "ウィスプ"], ["kelpie", "グリーンケルピー"], ["goblin", "ゴブリン"], ["skeleton", "スケルトンウォリアー"], ["spider", "スパイダー"],
  ["armor", "リビングアーマー"], ["mandragora", "マンドラゴラ"], ["rockgolem", "ロックゴーレム"], ["ghost", "ゴースト"],
].map(([img, name]) => ({ img, name }));
const MON_BOSS = [["slimeking", "スライムキング"], ["magolem", "古代の魔導ゴーレム"], ["darkdragon", "ダークドラゴン"], ["elderweed", "エルダーウィード"], ["grimoire", "魔導書の番人"]].map(([img, name]) => ({ img, name }));
const MON_MASK = "radial-gradient(circle at 50% 50%, #000 55%, rgba(0,0,0,0.55) 63%, transparent 70.5%)";
// 魔物の絵：dim 0＝ふつう、1＝うすく（発見だけ）、2＝影（まだ出会っていない）
function MonPic({ m, size, dim = 0 }) {
  if (!m.sp.img) return <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block", overflow: "visible", opacity: dim === 1 ? 0.6 : 1 }}>{m.sp.draw(dim === 2 ? MON_UNKNOWN : m.th)}</svg>;
  return <div role="img" aria-label={dim === 2 ? "まだ見ぬ魔物" : m.sp.name} style={{ width: size, height: size, borderRadius: "50%", backgroundImage: `url(${MON_ART_URL}${m.sp.img}.jpg)`, backgroundSize: "cover", backgroundPosition: "center", WebkitMaskImage: MON_MASK, maskImage: MON_MASK, filter: dim === 2 ? "brightness(0.18) saturate(0) contrast(1.2)" : undefined, opacity: dim === 1 ? 0.6 : 1 }} />;
}
function monsterFor(q, bankName) {
  const th = themeOf(bankName);
  const h = hashStr(String(q.id));
  const pm = MON_PAINTED[h % MON_PAINTED.length];
  const sp = { ...MONSTER_SPECIES[h % MONSTER_SPECIES.length], name: pm.name, img: pm.img };
  const seen = (q.correct || 0) + (q.wrong || 0) > 0 || !!q.sr_nextReview;
  const rank = !seen ? "unknown" : isQuestionWeak(q) ? "elite" : "normal";
  return { key: String(q.id), sp, th, rank, name: `${rank === "elite" ? "手強い" : ""}${th.prefix}${sp.name}` };
}

// テーマごとの戦闘画面の配色と主人公の顔（MentorBubble と同じ切り抜き）
const BATTLE_THEME = {
  white: { bg: "linear-gradient(180deg, #dce7f2 0%, #eef1ef 46%, #efe4c8 100%)", ground: "linear-gradient(180deg, rgba(176,138,62,0), rgba(176,138,62,0.22))", border: "1px solid #b08a3e", text: "#22335c", sub: "#5b6b8c", chip: "rgba(253,251,245,0.92)", gold: "#b08a3e", avatar: WHITE_HERO_URL, face: [69, 12], ring: "#b08a3e", hill: "rgba(127,163,216,0.28)", hill2: "rgba(34,51,92,0.13)" },
  classic: { bg: "linear-gradient(180deg, #16244a 0%, #22386a 55%, #2d4474 100%)", ground: "linear-gradient(180deg, rgba(160,185,215,0), rgba(160,185,215,0.18))", border: "1px solid rgba(190,205,230,0.6)", text: "#eef1f6", sub: "#c9d4e2", chip: "rgba(20,30,60,0.75)", gold: "#dcbc6e", avatar: HERO_URL, face: [52, 13], ring: "#c9d3e6", hill: "rgba(160,185,215,0.18)", hill2: "rgba(10,18,38,0.45)" },
  dot: { bg: "linear-gradient(180deg, #cfe6f5 0%, #e3edf5 55%, #d9e8c8 100%)", ground: "linear-gradient(180deg, rgba(109,132,84,0), rgba(109,132,84,0.25))", border: "2px solid var(--rule)", text: "var(--ink)", sub: "var(--ink-soft)", chip: "var(--paper)", gold: "var(--gold)", avatar: HERO_URL, face: [52, 13], ring: "var(--rule)", hill: "rgba(109,132,84,0.25)", hill2: "rgba(53,65,86,0.15)" },
};
const BATTLE_CSS = `
@keyframes sqbEnter{0%{opacity:0;transform:translateX(34px) scale(.8)}100%{opacity:1;transform:none}}
@keyframes sqbDefeat{0%{opacity:1;filter:brightness(1)}12%{filter:brightness(3.2)}30%{transform:translateX(7px)}100%{opacity:0;transform:scale(.55) translateY(12px);filter:brightness(2) blur(3px)}}
@keyframes sqbEscape{0%{transform:none}28%{transform:translateX(-46px) scale(1.12)}48%{transform:translateX(-6px)}100%{opacity:0;transform:translateX(70px)}}
@keyframes sqbIdle{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@keyframes sqbDmg{0%{opacity:0;transform:translate(-50%,0) scale(.5)}15%{opacity:1;transform:translate(-50%,-16px) scale(1.3)}70%{opacity:1;transform:translate(-50%,-28px) scale(1)}100%{opacity:0;transform:translate(-50%,-38px)}}
@keyframes sqbSlash{0%{opacity:0;stroke-dashoffset:150}15%{opacity:1}55%{stroke-dashoffset:0;opacity:1}100%{opacity:0;stroke-dashoffset:0}}
@keyframes sqbBurst{0%{opacity:1;transform:translate(0,0) scale(1)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(.2)}}
@keyframes sqbShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(7px)}60%{transform:translateX(-4px)}80%{transform:translateX(3px)}}
@keyframes sqbRed{0%{opacity:0}20%{opacity:1}100%{opacity:0}}
@keyframes sqbLunge{0%,100%{transform:none}35%{transform:translateX(22px) scale(1.12)}}
@keyframes sqbHurt{0%,100%{transform:none;filter:none}30%{transform:translateX(-7px) rotate(-8deg);filter:sepia(1) saturate(4) hue-rotate(-40deg)}}
@keyframes sqbPop{0%{transform:translateX(-50%) scale(1.8);opacity:0}100%{transform:translateX(-50%) scale(1);opacity:1}}
@keyframes sqbHp{from{width:100%}to{width:0}}
@keyframes sqbCut{0%{transform:translateX(-105%)}14%{transform:translateX(0)}82%{transform:translateX(0);opacity:1}100%{transform:translateX(18%);opacity:0}}
@keyframes sqbBig{0%{opacity:0;transform:translate(-50%,-50%) scale(2.2)}18%{opacity:1;transform:translate(-50%,-50%) scale(1)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) scale(1.05)}}
@keyframes sqbAura{0%,100%{opacity:.55;transform:scale(1)}50%{opacity:.95;transform:scale(1.08)}}
@keyframes sqbFlash{0%{opacity:.9}100%{opacity:0}}
@keyframes sqbDrop{0%{opacity:0;transform:translate(-50%,10px) scale(.6)}25%{opacity:1;transform:translate(-50%,-6px) scale(1.15)}75%{opacity:1;transform:translate(-50%,-14px)}100%{opacity:0;transform:translate(-50%,-22px)}}
@keyframes sqfHammer{0%{transform:rotate(-55deg)}45%{transform:rotate(12deg)}55%{transform:rotate(8deg)}100%{transform:rotate(-55deg)}}
@keyframes sqfSpark{0%{opacity:1;transform:translate(0,0) scale(1)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(.2)}}
@keyframes sqfGlow{0%{opacity:0;transform:scale(.6)}30%{opacity:1;transform:scale(1.15)}100%{opacity:0;transform:scale(1.6)}}
@keyframes sqfSmoke{0%{opacity:0;transform:translateY(6px) scale(.8)}30%{opacity:.85}100%{opacity:0;transform:translateY(-26px) scale(1.4)}}
@keyframes sqfLearn{0%{box-shadow:0 0 0 0 rgba(214,181,106,0.9)}100%{box-shadow:0 0 0 22px rgba(214,181,106,0)}}
@keyframes sqfPulse{0%,100%{box-shadow:0 0 0 0 rgba(214,181,106,0.55)}50%{box-shadow:0 0 0 6px rgba(214,181,106,0)}}
`;

function MonsterView({ m, anim, delay = 0, size = 92 }) {
  const c = m.rank === "unknown" ? MON_UNKNOWN : m.th;
  const a = anim === "defeat" ? "sqbDefeat .6s ease-in forwards" : anim === "escape" ? "sqbEscape .75s ease-in-out forwards" : `sqbEnter .35s ease-out ${delay}s both`;
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", animation: a }}>
      <div className="jp" style={{ fontSize: 11, fontWeight: 700, color: m.rank === "elite" ? "#a24a45" : "inherit", whiteSpace: "nowrap", marginBottom: 2 }}>{m.rank === "unknown" ? "？？？" : m.name}</div>
      <div style={{ width: 74, height: 5, borderRadius: 3, background: "rgba(0,0,0,0.15)", overflow: "hidden", marginBottom: 2 }}>
        <div style={{ height: "100%", width: "100%", background: m.rank === "elite" ? "linear-gradient(90deg,#a24a45,#e0948a)" : "linear-gradient(90deg,#c9564e,#e6a35c)", animation: anim === "defeat" ? "sqbHp .3s ease-out forwards" : undefined }} />
      </div>
      <div style={{ position: "relative", width: size, height: size, animation: anim === "enter" ? "sqbIdle 2.4s ease-in-out infinite" : undefined }}>
        {m.rank === "elite" && <div style={{ position: "absolute", inset: -8, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,74,74,0.45) 0%, rgba(201,74,74,0.12) 55%, transparent 72%)", animation: "sqbAura 1.6s ease-in-out infinite" }} />}
        <div style={{ position: "relative" }}>{m.sp.img ? <MonPic m={m} size={size} dim={m.rank === "unknown" ? 2 : 0} /> : <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block", overflow: "visible" }}>{m.sp.draw(c)}</svg>}</div>
        {m.rank === "unknown" && <div className="jp" style={{ position: "absolute", left: "50%", top: "8%", transform: "translateX(-50%)", fontSize: size * 0.3, fontWeight: 800, color: "#f2c14e", textShadow: "0 0 8px rgba(242,193,78,0.8)" }}>？</div>}
      </div>
      <div style={{ width: size * 0.7, height: 7, borderRadius: "50%", background: "rgba(34,51,92,0.18)", marginTop: -3 }} />
    </div>
  );
}

// battleKey：1回の学習（セット）ごとに変わる値。変わったときだけ HP・コンボを最初からにする
function BattleStage({ state, q, bankName, battleKey, boss = false, scene = null }) {
  if (BATTLE.key !== battleKey) { resetBattle(state); BATTLE.key = battleKey; }
  const ds = state.displaySettings || {};
  const theme = ds.theme || "white";
  const P = BATTLE_THEME[theme] || BATTLE_THEME.white;
  const mon0 = q ? monsterFor(q, bankName) : null;
  // ストーリークエストの最後の1問は「論点の主」（手強い魔物の見た目）
  const bossSp = mon0 && boss ? MON_BOSS[hashStr(mon0.key) % MON_BOSS.length] : null;
  const mon = mon0 && boss ? { ...mon0, rank: "elite", sp: { ...mon0.sp, ...bossSp }, name: `論点の主・${mon0.th.prefix}${bossSp.name}` } : mon0;
  const monRef = useRef(mon); monRef.current = mon;
  const qRef = useRef(q); qRef.current = q;
  const stRef = useRef(state); stRef.current = state;
  const [fx, setFx] = useState(null);   // 直前の回答の演出 { n, ok, crit, dmg, taken, faint, cut, mon }
  const [doneQ, setDoneQ] = useState(null); // 回答済みの問題（次の問題に切り替わるまで魔物を出さない。同じ問題の再出題は別物として出す）
  const fxN = useRef(0);
  useEffect(() => {
    if (!battleBus) return undefined;
    const on = (e) => {
      const { correct, conf } = e.detail || {};
      const m = monRef.current;
      if (!m) return;
      const b = getRpgBonuses(stRef.current);
      const n = ++fxN.current;
      let hold = 900;
      if (correct) {
        const crit = conf === "sure";
        BATTLE.combo++; BATTLE.maxCombo = Math.max(BATTLE.maxCombo, BATTLE.combo); BATTLE.defeated++; if (crit) BATTLE.crits++;
        const dmg = Math.round((30 + stRef.current.player.level * 2) * (1 + b.bossDmgPct / 100) * (crit ? 2 : 1) * (0.9 + Math.random() * 0.2));
        const cut = comboCut(BATTLE.combo);
        if (cut) hold = 1100;
        // 素材のドロップ：欠片は科目ごと、手強い魔物は星霊石も、10コンボごとの必殺技で賢者の結晶
        const dropMul = 1 + (b.dropPct || 0) / 100;
        const mats = {};
        if (Math.random() < (m.rank === "elite" ? 1 : m.rank === "unknown" ? 0.5 : 0.35) * dropMul) mats[m.th.mat || "m-meikyu"] = m.rank === "elite" ? 2 : 1;
        if (Math.random() < (m.rank === "elite" ? 0.3 : crit ? 0.03 : 0) * dropMul) mats["m-star"] = 1;
        if (cut && cut.n >= 10) mats["m-sage"] = 1;
        const xpBonus = cut && b.comboXp ? b.comboXp : 0;
        Object.entries(mats).forEach(([k, v]) => { BATTLE.mats[k] = (BATTLE.mats[k] || 0) + v; });
        // 戦利品と、デイリークエスト用の記録（倒した魔物の種類・会心・コンボ）
        emitReward({ mats, xp: xpBonus, stat: { elite: m.rank === "elite", fresh: m.rank === "unknown", crit, combo: BATTLE.combo, region: m.th && m.th.region } });
        setFx({ n, ok: true, crit, dmg, cut, mon: m, drops: Object.keys(mats) });
        SFX.play(crit ? "crit" : "hit");
        if (Object.keys(mats).length) setTimeout(() => SFX.play("drop"), 320);
        setTimeout(() => SFX.play(cut ? "combo" : "defeat"), 170);
      } else {
        BATTLE.combo = 0; BATTLE.escaped++;
        const taken = Math.max(1, Math.round((10 + Math.random() * 8 + (m.rank === "elite" ? 6 : 0)) * (1 - b.dmgCutPct / 100)));
        BATTLE.hp -= taken;
        let faint = false;
        if (BATTLE.hp <= 0) { BATTLE.faints++; BATTLE.hp = Math.ceil(BATTLE.maxHp * (0.3 + (b.revivePct || 0) / 100)); faint = true; }
        setFx({ n, ok: false, taken, faint, mon: m });
        SFX.play("miss");
      }
      setDoneQ(qRef.current);
      setTimeout(() => setFx((f) => (f && f.n === n ? null : f)), hold);
    };
    battleBus.addEventListener("answer", on);
    return () => battleBus.removeEventListener("answer", on);
  }, []);

  if (ds.battle === false || !mon) return null;
  const showCur = q !== doneQ;
  const hpPct = Math.max(0, Math.min(100, (BATTLE.hp / BATTLE.maxHp) * 100));
  const kind = mon.rank === "unknown" ? ["初見の魔物", "#5b6b8c"] : mon.rank === "elite" ? ["手強い魔物", "#a24a45"] : ["復習の魔物", "#4f8a72"];
  const parts = fx && fx.ok ? Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2 + (fx.n % 7) * 0.3; const r = 34 + ((i * 13 + fx.n * 7) % 22); return { dx: `${Math.round(Math.cos(a) * r)}px`, dy: `${Math.round(Math.sin(a) * r)}px`, c: i % 3 === 0 ? "#fff3c4" : fx.crit ? "#f2c14e" : (fx.mon.rank === "unknown" ? MON_UNKNOWN : fx.mon.th).body }; }) : [];
  return (
    <div className="relative overflow-hidden select-none" style={{ height: 156, borderRadius: 8, background: scene ? `${theme === "classic" ? "linear-gradient(0deg, rgba(10,18,38,0.82) 0%, rgba(10,18,38,0.25) 50%, rgba(10,18,38,0.05) 100%)" : "linear-gradient(0deg, rgba(253,251,245,0.9) 0%, rgba(253,251,245,0.25) 48%, rgba(253,251,245,0) 75%)"}, url(${scene}) center/cover no-repeat` : P.bg, border: P.border, color: P.text, boxShadow: "0 6px 18px rgba(40,50,80,0.12)", animation: fx && !fx.ok ? "sqbShake .38s ease-in-out" : undefined }}>
      <style>{BATTLE_CSS}</style>
      {/* 遠景（山並みと城）。景色の絵があるときは出さない */}
      {!scene && <svg viewBox="0 0 400 100" preserveAspectRatio="none" aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, bottom: "30%", width: "100%", height: 70 }}>
        <path d="M0 100V62l38-22 30 16 44-34 40 26 30-14 52 30 34-18 46 22 40-28 46 30v30z" fill={P.hill} />
        <path d="M250 100V58h6v-8l4-6 4 6v8h8V46l5-9 5 9v12h8v-6l4-5 4 5v48zM0 100V80l60-10 70 14 90-12 80 10 100-8v26z" fill={P.hill2} />
      </svg>}
      {!scene && <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "40%", background: P.ground }} />}
      {/* 魔物の種類 */}
      <div className="jp" style={{ position: "absolute", left: 10, top: 8, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: P.chip, border: `1px solid ${kind[1]}`, color: kind[1] }}>{kind[0]}</div>
      {/* コンボ */}
      {BATTLE.combo >= 2 && (
        <div key={`combo${BATTLE.combo}`} style={{ position: "absolute", left: "50%", top: 8, transform: "translateX(-50%)", animation: "sqbPop .28s ease-out both", fontFamily: "'Cinzel', 'Shippori Mincho B1', serif", fontWeight: 900, fontSize: 18, color: P.gold, textShadow: "0 1px 0 rgba(255,255,255,0.6), 0 0 10px rgba(214,181,106,0.6)", whiteSpace: "nowrap" }}>
          {BATTLE.combo}<span style={{ fontSize: 11, marginLeft: 3, letterSpacing: 1 }}>COMBO</span>
        </div>
      )}
      {/* 主人公（顔・HP） */}
      <div style={{ position: "absolute", left: 10, bottom: 10, display: "flex", alignItems: "flex-end", gap: 8 }}>
        <div key={fx ? `hero${fx.n}` : "hero"} style={{ width: 54, height: 54, borderRadius: "50%", flexShrink: 0, backgroundColor: "#e9e4d6", backgroundImage: `url(${P.avatar})`, backgroundSize: "300% auto", backgroundPosition: `${P.face[0]}% ${P.face[1]}%`, border: `2px solid ${P.ring}`, boxShadow: "0 2px 6px rgba(0,0,0,0.2)", animation: fx ? (fx.ok ? "sqbLunge .32s ease-out" : "sqbHurt .4s ease-out") : undefined }} />
        <div style={{ width: 96, position: "relative" }}>
          <div className="jp" style={{ fontSize: 10, color: P.sub, fontWeight: 700 }}>HP {BATTLE.hp}/{BATTLE.maxHp}</div>
          <div style={{ height: 7, borderRadius: 4, background: "rgba(0,0,0,0.15)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${hpPct}%`, background: hpPct < 30 ? "linear-gradient(90deg,#a24a45,#e0948a)" : "linear-gradient(90deg,#4f8a72,#8cc4a8)", transition: "width .4s" }} />
          </div>
          {fx && !fx.ok && <div key={`t${fx.n}`} className="jp" style={{ position: "absolute", left: "50%", top: -18, animation: "sqbDmg .8s ease-out forwards", color: "#c94a4a", fontWeight: 900, fontSize: 18, textShadow: "0 0 3px #fff, 0 0 3px #fff" }}>-{fx.taken}</div>}
          {fx && fx.faint && <div className="jp" style={{ position: "absolute", left: 0, top: -34, fontSize: 11, fontWeight: 800, color: "#a24a45", whiteSpace: "nowrap" }}>ふんばった！</div>}
        </div>
      </div>
      {/* 魔物 */}
      <div style={{ position: "absolute", right: "7%", bottom: 8, width: 120, height: 136 }}>
        {fx && <MonsterView key={`leave${fx.n}`} m={fx.mon} anim={fx.ok ? "defeat" : "escape"} />}
        {showCur && <MonsterView key={`m${mon.key}`} m={mon} anim="enter" delay={fx ? 0.45 : 0} />}
        {fx && fx.ok && (
          <>
            <svg key={`s${fx.n}`} viewBox="0 0 100 100" style={{ position: "absolute", left: 10, top: 26, width: 100, height: 100, overflow: "visible", pointerEvents: "none" }}>
              <path d="M12 88L88 12" stroke={fx.crit ? "#f2c14e" : "#ffffff"} strokeWidth={fx.crit ? 7 : 5} strokeLinecap="round" strokeDasharray="150" style={{ animation: "sqbSlash .38s ease-out forwards", filter: "drop-shadow(0 0 4px rgba(255,255,255,0.9))" }} />
              {fx.crit && <path d="M12 12L88 88" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" strokeDasharray="150" style={{ animation: "sqbSlash .38s ease-out .08s both", filter: "drop-shadow(0 0 4px rgba(242,193,78,0.9))" }} />}
            </svg>
            {parts.map((p, i) => <span key={`p${fx.n}-${i}`} style={{ position: "absolute", left: "50%", top: "62%", width: 7, height: 7, marginLeft: -3, borderRadius: "50%", background: p.c, boxShadow: `0 0 6px ${p.c}`, "--dx": p.dx, "--dy": p.dy, animation: "sqbBurst .55s ease-out .08s both", pointerEvents: "none" }} />)}
            <div key={`d${fx.n}`} style={{ position: "absolute", left: "50%", top: "30%", animation: "sqbDmg .8s ease-out forwards", fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: fx.crit ? 30 : 24, color: fx.crit ? "#f2c14e" : "#ffffff", textShadow: "0 2px 0 #22335c, 0 0 6px rgba(34,51,92,0.7)", whiteSpace: "nowrap", pointerEvents: "none" }}>
              {fx.crit && <div className="jp" style={{ fontSize: 11, letterSpacing: 2, textAlign: "center" }}>CRITICAL!</div>}{fx.dmg}
            </div>
          </>
        )}
        {fx && !fx.ok && <div key={`e${fx.n}`} className="jp" style={{ position: "absolute", left: "50%", top: "18%", transform: "translateX(-50%)", fontSize: 11, fontWeight: 800, color: P.sub, whiteSpace: "nowrap", animation: "sqbRed .9s ease-out forwards" }}>逃げられた…</div>}
        {fx && fx.drops && fx.drops.length > 0 && (
          <div key={`drop${fx.n}`} style={{ position: "absolute", left: "50%", bottom: 6, display: "flex", gap: 2, alignItems: "center", animation: "sqbDrop 1s ease-out .25s both", pointerEvents: "none" }}>
            {fx.drops.map((id) => <MaterialIcon key={id} id={id} size={22} />)}
            <span className="jp" style={{ fontSize: 11, fontWeight: 800, color: P.gold, textShadow: "0 0 3px #fff" }}>GET</span>
          </div>
        )}
      </div>
      {/* 被ダメージの赤いふち */}
      {fx && !fx.ok && <div key={`r${fx.n}`} style={{ position: "absolute", inset: 0, pointerEvents: "none", boxShadow: "inset 0 0 40px rgba(201,74,74,0.55)", animation: "sqbRed .5s ease-out forwards" }} />}
      {fx && fx.crit && <div key={`w${fx.n}`} style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "rgba(255,248,220,0.7)", animation: "sqbFlash .25s ease-out forwards" }} />}
      {/* コンボの必殺技（カットイン） */}
      {fx && fx.cut && (
        <div key={`cut${fx.n}`} style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 74, marginTop: -37, pointerEvents: "none", animation: "sqbCut 1.05s cubic-bezier(.2,.8,.2,1) forwards", background: "linear-gradient(90deg, rgba(34,51,92,0.92) 0%, rgba(34,51,92,0.85) 55%, rgba(34,51,92,0) 100%)", borderTop: "2px solid #d6b56a", borderBottom: "2px solid #d6b56a", display: "flex", alignItems: "center", gap: 12, paddingLeft: 12 }}>
          <div style={{ width: 62, height: 62, borderRadius: "50%", flexShrink: 0, backgroundImage: `url(${P.avatar})`, backgroundSize: "300% auto", backgroundPosition: `${P.face[0]}% ${P.face[1]}%`, border: "2px solid #d6b56a", boxShadow: "0 0 14px rgba(214,181,106,0.8)" }} />
          <div>
            <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 12, letterSpacing: 2, color: "#d6b56a" }}>{BATTLE.combo} COMBO</div>
            <div style={{ fontFamily: "'Shippori Mincho B1', serif", fontWeight: 800, fontSize: 20, letterSpacing: "0.08em", color: "#fdfbf5", textShadow: "0 0 10px rgba(214,181,106,0.8)" }}>{fx.cut.name}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── リザルト画面：このセットの討伐数・最大コンボ・獲得EXPとゴールド ──
function BattleResult({ state, battleKey }) {
  const ds = state.displaySettings || {};
  const P = BATTLE_THEME[ds.theme || "white"] || BATTLE_THEME.white;
  const mine = !!BATTLE.start && BATTLE.key === battleKey; // このセットで実際に戦ったときだけ出す
  useEffect(() => { if (mine && ds.battle !== false) SFX.play("result"); }, []);
  if (ds.battle === false || !mine) return null;
  const xp = Math.max(0, xpTotalOf(state.player) - BATTLE.start.xp);
  const gold = Math.max(0, normRpg(state.rpg).gold - BATTLE.start.gold);
  const lvUp = state.player.level - BATTLE.start.level;
  const rows = [["討伐", `${BATTLE.defeated}体`], ["最大コンボ", `${BATTLE.maxCombo}`], ["会心", `${BATTLE.crits}回`], ["逃げられた", `${BATTLE.escaped}体`]];
  return (
    <div className="relative overflow-hidden mb-3" style={{ borderRadius: 8, background: P.bg, border: P.border, color: P.text, padding: "12px 14px", animation: "sqFadeIn .35s ease-out" }}>
      <style>{BATTLE_CSS}</style>
      <div className="flex items-center gap-3">
        <div style={{ width: 64, height: 64, borderRadius: "50%", flexShrink: 0, backgroundColor: "#e9e4d6", backgroundImage: `url(${P.avatar})`, backgroundSize: "300% auto", backgroundPosition: `${P.face[0]}% ${P.face[1]}%`, border: `2px solid ${P.ring}`, boxShadow: "0 0 12px rgba(214,181,106,0.5)" }} />
        <div className="flex-1 min-w-0">
          <div style={{ fontFamily: "'Cinzel', 'Shippori Mincho B1', serif", fontWeight: 900, fontSize: 20, letterSpacing: 2, color: P.gold }}>VICTORY</div>
          <div className="jp text-xs" style={{ color: P.sub }}>{BATTLE.faints > 0 ? "ふんばりながらも、最後まで戦い抜きました。" : BATTLE.escaped === 0 ? "一体も逃さず、見事な戦いでした！" : "おつかれさまでした。逃げた魔物は、また現れます。"}</div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5 mt-3">
        {rows.map(([k, v]) => (
          <div key={k} className="text-center" style={{ background: P.chip, borderRadius: 6, padding: "6px 2px", border: `1px solid ${P.ring}55` }}>
            <div className="jp" style={{ fontSize: 10, color: P.sub }}>{k}</div>
            <div className="jp" style={{ fontSize: 16, fontWeight: 800 }}>{v}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-4 mt-3 jp" style={{ fontWeight: 800 }}>
        <span style={{ color: P.gold, fontSize: 15 }}>+{xp} EXP</span>
        <span style={{ color: P.gold, fontSize: 15 }}>+{gold} G</span>
        {lvUp > 0 && <span style={{ color: "#c94a4a", fontSize: 15, animation: "sqbAura 1.2s ease-in-out infinite" }}>LEVEL UP ×{lvUp}</span>}
      </div>
      {Object.keys(BATTLE.mats).length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-2 jp">
          <span style={{ fontSize: 11, color: P.sub }}>戦利品</span>
          {Object.entries(BATTLE.mats).map(([id, n]) => (
            <span key={id} className="flex items-center gap-1" style={{ fontSize: 12, fontWeight: 700 }}><MaterialIcon id={id} size={20} />{(matById(id) || {}).name}×{n}</span>
          ))}
        </div>
      )}
      {lvUp > 0 && <div className="jp text-center mt-1" style={{ fontSize: 11, color: P.sub }}>スキルポイントを {lvUp} 獲得しました（冒険 → スキル）</div>}
    </div>
  );
}

// ── 周回スタンプの演出：完全制覇のたびに、大きな印が「ドン」と押される。5周ごとに金の印 ──
const STAMP_CSS = `
@keyframes sqsDrop{0%{opacity:0;transform:translate(-50%,-50%) scale(3.2) rotate(-28deg)}55%{opacity:1;transform:translate(-50%,-50%) scale(.92) rotate(-12deg)}70%{transform:translate(-50%,-50%) scale(1.06) rotate(-12deg)}100%{opacity:1;transform:translate(-50%,-50%) scale(1) rotate(-12deg)}}
@keyframes sqsShake{0%,100%{transform:translate(0,0)}25%{transform:translate(-5px,3px)}50%{transform:translate(4px,-3px)}75%{transform:translate(-2px,2px)}}
@keyframes sqsInk{0%{opacity:0;transform:translate(0,0) scale(.4)}30%{opacity:.85}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(1)}}
@keyframes sqsIn{0%{opacity:0;transform:translateY(10px)}100%{opacity:1;transform:none}}
@keyframes sqsFade{from{opacity:0}to{opacity:1}}
@keyframes sqsGlow{0%,100%{box-shadow:0 0 0 0 rgba(214,181,106,0.7)}50%{box-shadow:0 0 0 8px rgba(214,181,106,0)}}
`;
function Hanko({ laps, size = 120, gold = false, style }) {
  const c = gold ? "#b08a3e" : "#b3302b";
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", border: `${Math.max(3, size * 0.04)}px solid ${c}`, boxShadow: `inset 0 0 0 ${Math.max(2, size * 0.025)}px rgba(255,255,255,0.6), inset 0 0 0 ${Math.max(3, size * 0.045)}px ${c}`, color: c, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Shippori Mincho B1', serif", fontWeight: 800, lineHeight: 1.05,
      background: gold ? "radial-gradient(circle at 35% 30%, rgba(255,243,196,0.9), rgba(241,223,174,0.5))" : "radial-gradient(circle at 40% 35%, rgba(255,250,245,0.55), rgba(255,235,230,0.25))", ...style }}>
      <span style={{ fontSize: size * 0.16 }}>第{laps}周</span>
      <span style={{ fontSize: size * 0.3, letterSpacing: "0.05em" }}>制覇</span>
    </div>
  );
}
function LapStampScene({ ev, onClose }) {
  useEffect(() => { SFX.play("stamp"); const t = setTimeout(onClose, 5200); return () => clearTimeout(t); }, []);
  const gold = ev.laps % 5 === 0;
  const shown = Math.min(ev.laps, 10);
  const ink = Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; const d = 80 + (i % 3) * 22; return { dx: `${Math.round(Math.cos(a) * d)}px`, dy: `${Math.round(Math.sin(a) * d)}px`, s: 6 + (i % 4) * 3 }; });
  return (
    <div onClick={onClose} role="dialog" aria-label={`${ev.bankName} 第${ev.laps}周 制覇`} className="fixed inset-0 flex items-center justify-center jp" style={{ zIndex: 68, background: "rgba(10,14,30,0.5)", animation: "sqsFade .25s ease-out", cursor: "pointer" }}>
      <style>{STAMP_CSS}</style>
      <div className="relative m-4 w-full max-w-md text-center px-5 pt-5 pb-6" style={{ background: "#fdfbf5", border: "1px solid #b08a3e", borderRadius: 12, boxShadow: "inset 0 0 0 3px #fdfbf5, inset 0 0 0 4px rgba(176,138,62,.45), 0 12px 32px rgba(0,0,0,0.35)", color: "#22335c", animation: "sqsShake .3s ease-out .55s" }}>
        <div className="text-[11px]" style={{ color: "#b08a3e", fontWeight: 800, letterSpacing: "0.2em" }}>完全制覇</div>
        <div className="text-base mt-1" style={{ fontFamily: "'Shippori Mincho B1', serif", fontWeight: 800 }}>{ev.bankName}</div>
        {/* 押される印 */}
        <div style={{ position: "relative", height: 170 }}>
          {ink.map((p, i) => <span key={i} style={{ position: "absolute", left: "50%", top: "50%", width: p.s, height: p.s, marginLeft: -p.s / 2, marginTop: -p.s / 2, borderRadius: "50%", background: gold ? "#d6b56a" : "#b3302b", "--dx": p.dx, "--dy": p.dy, animation: "sqsInk .6s ease-out .5s both" }} />)}
          <div style={{ position: "absolute", left: "50%", top: "50%", animation: "sqsDrop .65s cubic-bezier(.3,1.4,.5,1) both" }}><Hanko laps={ev.laps} size={130} gold={gold} /></div>
        </div>
        <div className="text-sm" style={{ fontWeight: 800, color: gold ? "#b08a3e" : "#b3302b", animation: "sqsIn .4s ease-out .8s both" }}>{gold ? `節目の${ev.laps}周目！ 金の印を押しました` : "周回スタンプを押しました！"}</div>
        {/* これまでの周回 */}
        <div className="flex flex-wrap justify-center gap-1.5 mt-3" style={{ animation: "sqsIn .4s ease-out 1s both" }}>
          {Array.from({ length: shown }, (_, i) => { const n = ev.laps - shown + i + 1; return <div key={n} style={{ borderRadius: "50%", animation: n === ev.laps ? "sqsGlow 1.4s ease-in-out infinite" : undefined }}><Hanko laps={n} size={34} gold={n % 5 === 0} style={{ transform: "rotate(-12deg)" }} /></div>; })}
        </div>
        {ev.laps > shown && <div className="text-[10px] mt-1" style={{ color: "#8a96b0" }}>（これまで {ev.laps}周）</div>}
        <div className="text-[10px] mt-3" style={{ color: "#8a96b0", animation: "sqsIn .4s ease-out 1.3s both" }}>タップで閉じる</div>
      </div>
    </div>
  );
}

// ── 進化の演出（全画面）：暗転 → 光の柱と粒 → 影が脈打つ → 閃光 → 新しい姿 ──
// ev: { id, big（"進化"など）, from, to, sub, avatar, face, stage, icon, prevIcon }
const EVO_CSS = `
@keyframes sqeBg{from{opacity:0}to{opacity:1}}
@keyframes sqePillar{0%{opacity:0;transform:translateX(-50%) scaleY(0)}35%{opacity:.95;transform:translateX(-50%) scaleY(1)}100%{opacity:.55;transform:translateX(-50%) scaleY(1)}}
@keyframes sqeRise{0%{opacity:0;transform:translateY(0)}15%{opacity:1}100%{opacity:0;transform:translateY(-75vh)}}
@keyframes sqeSil{0%{filter:brightness(0) drop-shadow(0 0 2px #fff)}100%{filter:brightness(0) drop-shadow(0 0 28px #fff)}}
@keyframes sqePulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
@keyframes sqeHide{to{opacity:0;visibility:hidden}}
@keyframes sqeFlash{0%{opacity:0}35%{opacity:1}100%{opacity:0}}
@keyframes sqeRays{from{transform:translate(-50%,-50%) rotate(0deg)}to{transform:translate(-50%,-50%) rotate(360deg)}}
@keyframes sqeIn{0%{opacity:0;transform:translateY(12px) scale(.92)}100%{opacity:1;transform:none}}
@keyframes sqeMsg{0%{opacity:0}15%{opacity:1}85%{opacity:1}100%{opacity:0}}
@keyframes sqeTitle{0%{opacity:0;transform:scale(1.9);letter-spacing:.7em}100%{opacity:1;transform:scale(1);letter-spacing:.25em}}
`;
function EvolutionScene({ ev, onClose }) {
  useEffect(() => { SFX.play("evolve"); const t = setTimeout(onClose, 7000); return () => clearTimeout(t); }, []);
  const S = 180;
  const ring = (ev.stage && ev.stage.frame) || "linear-gradient(135deg, #fff3c4, #d6b56a 50%, #a8833a)";
  const subject = (icon, avatar) => avatar
    ? <div style={{ width: S, height: S, borderRadius: "50%", backgroundColor: "#e9e4d6", backgroundImage: `url(${avatar})`, backgroundSize: "300% auto", backgroundPosition: `${ev.face[0]}% ${ev.face[1]}%` }} />
    : <div style={{ width: S, height: S, borderRadius: "50%", background: "rgba(253,251,245,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 108, lineHeight: 1 }}>{icon}</div>;
  const parts = Array.from({ length: 30 }, (_, i) => ({ left: (i * 37 + 7) % 100, size: 3 + (i % 4) * 2, delay: (i * 0.13) % 2.2, dur: 1.8 + (i % 5) * 0.35 }));
  return (
    <div onClick={onClose} role="dialog" aria-label={`${ev.big}：${ev.to}`} className="fixed inset-0 flex flex-col items-center justify-center jp select-none"
      style={{ zIndex: 70, background: "radial-gradient(circle at 50% 42%, rgba(46,60,110,0.94), rgba(8,12,28,0.97))", animation: "sqeBg .5s ease-out both", cursor: "pointer", overflow: "hidden" }}>
      <style>{EVO_CSS}</style>
      <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 190, transformOrigin: "top", background: "linear-gradient(90deg, transparent, rgba(255,243,196,0.5), rgba(255,255,255,0.75), rgba(255,243,196,0.5), transparent)", animation: "sqePillar 1.5s ease-out .3s both" }} />
      {parts.map((p, i) => <span key={i} style={{ position: "absolute", bottom: -10, left: `${p.left}%`, width: p.size, height: p.size, borderRadius: "50%", background: i % 3 ? "#fff3c4" : "#f2c14e", boxShadow: "0 0 8px #f2c14e", animation: `sqeRise ${p.dur}s ease-out ${p.delay}s infinite` }} />)}
      <div style={{ position: "absolute", left: "50%", top: "42%", width: 0, height: 0, animation: "sqeBg .6s ease-out 2s both" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 620, height: 620, borderRadius: "50%", background: "repeating-conic-gradient(from 0deg, rgba(255,243,196,0.22) 0deg 8deg, rgba(255,243,196,0) 8deg 24deg)", animation: "sqeRays 14s linear infinite", maskImage: "radial-gradient(circle, #000 30%, transparent 70%)", WebkitMaskImage: "radial-gradient(circle, #000 30%, transparent 70%)" }} />
      </div>
      <div style={{ position: "relative", height: 26, marginBottom: 14 }}>
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", color: "#fdfbf5", fontSize: 15, letterSpacing: "0.15em", animation: "sqeMsg 1.8s ease-out .2s both" }}>まばゆい光に包まれていく……</div>
      </div>
      <div style={{ position: "relative", width: S + 12, height: S + 12 }}>
        {/* 進化前：影になって脈打つ */}
        <div style={{ position: "absolute", inset: 6, animation: "sqeSil 1.6s ease-in .2s both, sqePulse .45s ease-in-out .3s 4, sqeHide .01s linear 1.95s both" }}>{subject(ev.prevIcon || ev.icon, ev.avatar)}</div>
        {/* 進化後：新しい額縁で現れる */}
        <div style={{ position: "absolute", inset: 0, padding: 6, borderRadius: "50%", background: ring, boxShadow: `0 0 40px ${(ev.stage && ev.stage.color) || "#f2c14e"}`, animation: "sqeIn .5s ease-out 1.95s both" }}>{subject(ev.icon, ev.avatar)}</div>
      </div>
      <div style={{ marginTop: 22, textAlign: "center", color: "#fdfbf5", padding: "0 16px" }}>
        <div style={{ fontFamily: "'Shippori Mincho B1', serif", fontWeight: 800, fontSize: 34, color: "#f2c14e", textShadow: "0 0 18px rgba(242,193,78,0.8)", animation: "sqeTitle .7s cubic-bezier(.2,.8,.2,1) 2.1s both" }}>{ev.big}！</div>
        <div style={{ fontSize: 16, marginTop: 6, animation: "sqeIn .5s ease-out 2.5s both" }}>{ev.from ? <>{ev.from}<span style={{ color: "#f2c14e", margin: "0 10px" }}>→</span></> : null}<span style={{ fontWeight: 800, fontSize: 20 }}>{ev.to}</span></div>
        {ev.sub && <div style={{ fontSize: 12, marginTop: 6, color: "#c9d4e2", animation: "sqeIn .5s ease-out 2.8s both" }}>{ev.sub}</div>}
        <div style={{ fontSize: 11, marginTop: 18, color: "#8f9cb8", animation: "sqeIn .5s ease-out 3.4s both" }}>タップで閉じる</div>
      </div>
      <div style={{ position: "absolute", inset: 0, background: "#fffdf4", pointerEvents: "none", animation: "sqeFlash .8s ease-out 1.6s both" }} />
    </div>
  );
}

function AnswerPanel({ onAnswer: onAnswerRaw, wrongLabel = "不正解", correctLabel = "正解", sureClass = "btn-success", question, srSettings }) {
  const [stage, setStage] = useState("choose"); // choose | wrong
  const [confident, setConfident] = useState(false);
  // 回答をバトル演出（BattleStage）にも伝えてから、いつもの記録処理へ
  const onAnswer = (correct, meta) => { emitBattle({ correct, conf: meta && meta.conf }); onAnswerRaw(correct, meta); };
  const pv = question ? previewIntervals(question, srSettings) : null; // 次回までの日数
  const submitWrong = (errType) => onAnswer(false, { errType: errType || null, confident });

  if (stage === "wrong") {
    return (
      <div className="mt-3 p-2" style={{ background: "var(--cream)", border: "1px solid var(--brick)" }}>
        <div className="flex items-center justify-between mb-2">
          <div className="jp text-xs" style={{ color: "var(--brick)" }}>✕ 間違えた原因は？</div>
          <button onClick={() => setStage("choose")} className="jp text-[10px] px-1.5 py-0.5" style={{ border: "1px solid var(--rule-soft)", color: "var(--ink-soft)", background: "var(--paper)" }}>← 戻る</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {ERROR_TYPES.map((t) => (
            <button key={t.id} onClick={() => submitWrong(t.id)} className="jp btn-ghost py-2 px-2 text-left">
              <div className="text-sm">{t.icon} {t.label}</div>
              <div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>{t.hint}</div>
            </button>
          ))}
        </div>
        <button
          onClick={() => setConfident(!confident)}
          className="w-full jp text-[11px] py-1.5 mt-2 text-left px-2"
          style={{ background: confident ? "var(--brick)" : "var(--paper)", color: confident ? "var(--paper)" : "var(--ink-soft)", border: "1px solid var(--brick)" }}
        >
          {confident ? "☑" : "☐"} 💥 自信があったのに間違えた（重点復習の対象にする）
        </button>
        <button onClick={() => submitWrong(null)} className="w-full jp text-[11px] py-1 mt-1" style={{ background: "transparent", border: "none", color: "var(--ink-mute)", textDecoration: "underline" }}>
          原因を選ばずに次へ
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 mt-3">
      <button onClick={() => setStage("wrong")} className="jp btn-danger py-2 flex flex-col items-center justify-center leading-tight">
        <span className="flex items-center gap-1"><XIcon size={14} /> {wrongLabel}</span>
        {pv && <span className="text-[10px]" style={{ opacity: 0.9 }}>{fmtDays(pv.again)}後</span>}
      </button>
      <button onClick={() => onAnswer(true, { conf: "unsure" })} className="jp btn-info py-2 flex flex-col items-center justify-center leading-tight">
        <span>△ {correctLabel}</span>
        <span className="text-[10px]" style={{ opacity: 0.9 }}>自信なし{pv && `・${fmtDays(pv.hard)}後`}</span>
      </button>
      <button onClick={() => onAnswer(true, { conf: "sure" })} className={`jp ${sureClass} py-2 flex flex-col items-center justify-center leading-tight`}>
        <span>◎ {correctLabel}</span>
        <span className="text-[10px]" style={{ opacity: 0.9 }}>確実{pv && `・${fmtDays(pv.good)}後`}</span>
      </button>
    </div>
  );
}

// ============ 今日の復習（間隔反復） ============
// 復習期限が来た問題を優先し、足りない分を未学習の問題から出題する。
// 1セットの問題数を選べるので、未学習が大量にあっても無理なく進められる。
// ── 今日のふりかえり：夜（20時以降）に1日1回、主人公が今日の成果と明日のタスクを話す。ホームのボタンからいつでも聞ける ──
const REFLECT_HOUR = 20;
function reflectionTalk(state) {
  const today = todayStr();
  const code = today.slice(2).replace(/-/g, "");
  let ans = 0, ok = 0;
  state.questionBanks.forEach((b) => (b.questions || []).forEach((q) => (q.ah || []).forEach((h) => { if (String(h).startsWith(code)) { ans++; if (!String(h).endsWith("w")) ok++; } })));
  const min = state.studyLog.filter((l) => l.date === today).reduce((t, l) => t + (l.minutes || 0), 0);
  const streak = calculateStatus(state).currentStreak;
  const plans = (state.studyPlans || []).filter((p) => !p.finishedAt);
  const doneToday = plans.reduce((a, p) => a + Object.values(p.done || {}).filter((d) => d === today).length, 0);
  const left = plans.reduce((a, p) => a + planToday(p).pending.length, 0);
  const tomorrow = addDays(today, 1);
  const tmr = plans.flatMap((p) => planToday(p, tomorrow).pending.slice(0, 3).map((k) => planBankName(state, p, k)));
  const qual = mainQual(state);
  const linked = qual && state.questionBanks.some((b) => b.qualId === qual.id);
  const pp = passPower(state, linked ? qual.id : null);
  const rv = rivalStatus(state, pp, qual);
  const lines = [];
  if (ans === 0 && min < 1) {
    lines.push(["hero", "今日はゆっくり休めましたか？ 休むことも、続けるための大切な力です。"]);
  } else {
    lines.push(["hero", `今日のふりかえりです。${ans}問を解いて、正解は${ok}問（${ans ? Math.round((ok / ans) * 100) : 0}%）でした。学習時間は${fmtMin(min)}です。`]);
    if (streak >= 2) lines.push(["hero", `これで${streak}日連続です！ 毎日の積み重ねが、ちゃんと力になっていますね。`]);
  }
  if (plans.length) lines.push(["hero", left === 0 ? `今日のタスクは全部できました${doneToday ? `（${doneToday}項目）` : ""}。すばらしいです！` : `今日のタスクは、あと${left}項目残っています。無理せず、できるところまで進めましょうね。`]);
  if (rv) lines.push(["shadow", rv.status === "ahead" ? `……今日のところは、お前が${(rv.diff * 100).toFixed(1)}%先を行っている。明日も同じとは限らんぞ。` : rv.status === "behind" ? `ふっ、今日も我のほうが${(Math.abs(rv.diff) * 100).toFixed(1)}%先だ。明日は追いつけるかな？` : "……今日は横並びだな。明日、差がつく。"]);
  if (tmr.length) lines.push(["hero", `明日のタスクは「${tmr.slice(0, 2).join("」「")}」${tmr.length > 2 ? "ほか" : ""}です。`]);
  const pet = getPetInfo(state);
  if (pet && pet.stage > 0) lines.push(["pet", pet.studiedToday ? "（うれしそうに、しっぽをふっている）" : "（あしたはいっしょに勉強しようね、と見上げている）"]);
  lines.push(["hero", ans > 0 ? "今日もおつかれさまでした。ゆっくり休んで、また明日。" : "また明日、一緒にがんばりましょうね。おやすみなさい。"]);
  return { title: `今日のふりかえり　${Number(today.slice(5, 7))}月${Number(today.slice(8, 10))}日`, lines };
}

// ── 学習計画（今日のタスク）：期日までに、選んだ問題集（項目）を決めた回数だけ順番に解く ──
// state.studyPlans = [{ id, name, folderId, bankIds:[順番], laps, start, end, perDay, done:{[通し番号]: 済みにした日}, createdAt, finishedAt }]
// ・通し番号 k の項目は bankIds[k % 項目数]、k / 項目数 + 1 周目
// ・1日の数（perDay）は最初に決めて固定。今日までに済ませる数＝perDay ×（始めた日からの日数）。できなかった分は翌日に繰り越される
const planTotal = (p) => p.bankIds.length * (p.laps || 1);
const daysBetween = (a, b) => Math.round((parseLocalDate(b) - parseLocalDate(a)) / 86400000);
function planToday(p, today = todayStr()) {
  const total = planTotal(p);
  const idx = daysBetween(p.start, today);
  const done = p.done || {};
  if (idx < 0) return { started: false, pending: [], doneToday: [], carried: 0, total, doneN: Object.keys(done).length, daysLeft: daysBetween(today, p.end) + 1 };
  const dueBy = Math.min(total, p.perDay * (idx + 1));
  const pending = [];
  for (let k = 0; k < dueBy; k++) if (!done[k]) pending.push(k);
  const carried = pending.filter((k) => k < p.perDay * idx).length;
  const doneToday = Object.keys(done).filter((k) => done[k] === today).map(Number).sort((a, b) => a - b);
  const next = [];
  for (let k = dueBy; k < total && next.length < p.perDay; k++) if (!done[k]) next.push(k);
  return { started: true, pending, doneToday, carried, next, total, dueBy, doneN: Object.keys(done).length, daysLeft: daysBetween(today, p.end) + 1, overdue: today > p.end };
}
const planBankOf = (state, p, k) => state.questionBanks.find((b) => b.id === p.bankIds[k % p.bankIds.length]) || null;
const planBankName = (state, p, k) => { const b = planBankOf(state, p, k); return b ? b.name : "（消えた問題集）"; };
function PlanMaker({ state, onSave, onCancel }) {
  // フォルダ（＋フォルダなし）ごとに問題集を並べる。フォルダの☑で中の問題集をまとめて選べる。いくつかのフォルダにまたがってもよい
  const folders = [...(state.folders || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), { id: "", name: "フォルダなし" }];
  const banksIn = (fid) => state.questionBanks.filter((b) => (fid ? b.folderId === fid : !b.folderId)).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
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
function LapRoom({ state, actions }) {
  const plans = state.studyPlans || [];
  const active = plans.filter((p) => !p.finishedAt);
  const left = active.reduce((a, p) => a + planToday(p).pending.length, 0);
  const stamps = state.questionBanks.reduce((a, b) => a + (b.clears || 0), 0);
  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden" style={{ borderRadius: 12, height: 130, border: "1px solid #b08a3e", boxShadow: "inset 0 0 0 3px #fdfbf5, inset 0 0 0 4px rgba(176,138,62,.45)" }}>
        <img src={`${ART_URL}book-tools.jpg`} alt="" className="w-full h-full" style={{ objectFit: "cover", objectPosition: "center 40%" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(253,251,245,0.94) 0%, rgba(253,251,245,0.75) 45%, rgba(253,251,245,0) 75%)" }} />
        <div className="absolute inset-y-0 left-0 flex flex-col justify-center px-4 jp">
          <div className="text-[10px]" style={{ color: "#b08a3e", letterSpacing: "0.3em", fontWeight: 800 }}>LAP ROOM</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#22335c", fontFamily: "'Shippori Mincho B1', serif" }}>周回の部屋</div>
          <div className="text-[11px]" style={{ color: "#5b6b8c" }}>決めた日までに、決めた回数を。</div>
        </div>
      </div>
      <div className="jp grid grid-cols-3 gap-2">
        {[["今日のタスク", active.length ? `あと${left}項目` : "－"], ["進行中の計画", `${active.length}つ`], ["周回スタンプ", `${stamps}個`]].map(([k, v]) => (
          <div key={k} className="text-center" style={{ background: "var(--paper)", border: "1px solid var(--rule-soft)", borderRadius: 8, padding: "6px 2px" }}><div className="text-[10px]" style={{ color: "var(--ink-mute)" }}>{k}</div><div className="text-sm" style={{ fontWeight: 800, color: "var(--ink)" }}>{v}</div></div>
        ))}
      </div>
      <PlanTasks state={state} actions={actions} />
      <LapGrowth state={state} actions={actions} />
      <LapRecordsPanel state={state} />
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
// 周回の伸び：周回ごとの正解率（問題集の clearHistory）から、伸びている問題集と伸び悩んでいる問題集を分ける
function LapGrowth({ state, actions }) {
  const rows = state.questionBanks.map((b) => {
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
// 今日タブの短いお知らせ（くわしくは周回の部屋で）
function PlanSummary({ state, onOpen }) {
  const active = (state.studyPlans || []).filter((p) => !p.finishedAt);
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
function PlanTasks({ state, actions }) {
  const plans = state.studyPlans || [];
  const [making, setMaking] = useState(false);
  const [ahead, setAhead] = useState({});
  const active = plans.filter((p) => !p.finishedAt);
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

// ── 復習の予報：これから14日間、毎日いくつ復習が来るか（sr_nextReview の日付で数える）。今日の分には期限切れも含む ──
const FORECAST_DAYS = 14;
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

function TodayTab({ state, recordSRAnswer, updateSrSettings, startTimer, stopTimer, toggleQuestionMark, rpgActionsForPairs, preset, onPresetUsed, planActions }) {
  const today = todayStr();
  const due = [];
  const fresh = [];
  state.questionBanks.forEach((b) => {
    (b.questions || []).forEach((q) => {
      if (q.excluded) return;
      const it = { bankId: b.id, bankName: b.name, year: b.year || "", qId: q.id };
      if (!q.sr_nextReview) fresh.push(it);
      else if (q.sr_nextReview <= today) due.push({ ...it, nr: q.sr_nextReview });
    });
  });
  due.sort((a, b) => (a.nr < b.nr ? -1 : a.nr > b.nr ? 1 : 0)); // 期限の古い順

  const [setSize, setSetSize] = useState(20);
  const [includeNew, setIncludeNew] = useState(true);
  const [queue, setQueue] = useState(null); // null = 開始前 / [] = セット完了
  const [showAnswer, setShowAnswer] = useState(false);
  const [result, setResult] = useState({ sure: 0, unsure: 0, wrong: 0, err: {} });
  const [battleKey, setBattleKey] = useState(null); // バトル演出：セットを始めるたびに変える
  const timerStartedByMe = useRef(false);

  const item = queue && queue.length > 0 ? queue[0] : null;
  const bank = item ? state.questionBanks.find((b) => b.id === item.bankId) : null;
  const q = bank ? (bank.questions || []).find((x) => x.id === item.qId) : null;

  // 問題が削除・移動されて見つからない場合はスキップ
  useEffect(() => { if (item && !q) setQueue((qq) => (qq ? qq.slice(1) : qq)); }, [item, q]);
  // タブを離れたら自分で開始したタイマーを止める
  useEffect(() => () => { if (timerStartedByMe.current) { stopTimer(); timerStartedByMe.current = false; } }, []);

  const stopMyTimer = () => { if (timerStartedByMe.current) { stopTimer(); timerStartedByMe.current = false; } };

  // ホームの「忘れかけの3問」から来たときは、その3問ですぐに始める
  useEffect(() => {
    if (!preset || !preset.length) return;
    setBattleKey(uid()); setQueue(preset); setShowAnswer(false); setResult({ sure: 0, unsure: 0, wrong: 0, err: {} });
    if (!state.timer.startMs) { startTimer(null, "qa"); timerStartedByMe.current = true; }
    if (onPresetUsed) onPresetUsed();
  }, [preset]);
  const start = () => {
    const pool = [...due, ...(includeNew ? shuffle(fresh) : [])];
    const picked = pool.slice(0, setSize);
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
    if (rest.length === 0) stopMyTimer();
    setQueue(rest);
    setShowAnswer(false);
  };

  // ── 開始前の画面 ──
  if (queue === null) {
    const available = due.length + (includeNew ? fresh.length : 0);
    return (
      <div className="space-y-3">
        {planActions && <PlanSummary state={state} onOpen={planActions.goRoom} />}
        <Box title="今日の復習" icon={<Calendar size={18} />}>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Mini label="復習期限が来た問題" value={`${due.length}問`} highlight={due.length > 0} />
            <Mini label="未学習の問題" value={`${fresh.length}問`} />
          </div>
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
              <div className="mb-3">
                <ConfigToggle label="未学習の問題も出題する" sub="復習期限の問題を優先し、足りない分を未学習から補います" value={includeNew} onChange={setIncludeNew} />
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
        <ListenMode state={state} due={due} toggleQuestionMark={toggleQuestionMark} />
        <ReviewForecast state={state} />
        <MemoryWeather state={state} />
        <ConfusionPairs state={state} actions={rpgActionsForPairs} />
      </div>
    );
  }

  // ── セット完了の画面 ──
  if (queue.length === 0) {
    const errList = ERROR_TYPES.filter((t) => result.err[t.id]);
    return (
      <Box title="セット完了！" icon={<Award size={18} />}>
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
          <button onClick={start} disabled={due.length + (includeNew ? fresh.length : 0) === 0} className="jp btn-primary py-2">もう1セット</button>
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
        <div className="pixel text-xs" style={{ color: "var(--sky-deep)" }}>📅 残り {queue.length}</div>
      </div>
      <BattleStage state={state} q={q} bankName={item.bankName} battleKey={battleKey} />
      <div className="rpg-box p-1">
        <div className="rpg-inner-border min-h-[180px] flex flex-col">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="jp text-[10px]" style={{ color: "var(--ink-mute)" }}>
              {q.sr_nextReview ? "🔁 復習" : "🆕 初回"} ・ {item.bankName}{item.year && ` ・ ${item.year}`}
            </div>
            <button onClick={() => toggleQuestionMark(item.bankId, q.id)} className="jp text-[11px] px-1.5 py-0.5 flex-shrink-0" style={{ border: "1px solid var(--rule)", background: q.marked ? "var(--gold)" : "var(--paper)", color: q.marked ? "var(--paper)" : "var(--ink-soft)" }}>⭐ {q.marked ? "マーク中" : "マーク"}</button>
          </div>
          <div className="qtext jp text-base md:text-lg flex-1 break-words" style={{ color: "var(--ink)" }}>{renderQText(q.q, q.q_formats)}</div>
          <QuestionImages bankId={item.bankId} question={q} side="q" />
          {showAnswer ? (
            <>
              <div className="jp text-[10px] mt-3 mb-1" style={{ color: "var(--gold)" }}>答え</div>
              <div className="qtext jp text-base md:text-lg break-words p-2" style={{ background: "var(--sky-pale)", border: "1px solid var(--gold)", color: "var(--ink)" }}>{renderFormattedText(q.a, q.a_formats)}</div>
              <QuestionImages bankId={item.bankId} question={q} side="a" />
              <LawRefChips q={q} />
              {q.memo && <div className="jp text-[11px] mt-2 p-2" style={{ background: "var(--cream)", border: "1px dashed var(--rule-soft)", color: "var(--ink-soft)", whiteSpace: "pre-wrap" }}>📝 {q.memo}</div>}
              <AnswerPanel onAnswer={answer} question={q} srSettings={state.srSettings} />
              <AnswerHistory q={q} />
            </>
          ) : (
            <button onClick={() => setShowAnswer(true)} className="jp btn-info mt-3 py-2 flex items-center justify-center gap-1"><Eye size={16} /> 答えを見る</button>
          )}
        </div>
      </div>
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

// ============ Character Display (SVG ファンタジーRPG風) ============
function getCharacterTier(level) {
  if (level >= 50) return "tier6";
  if (level >= 40) return "tier5";
  if (level >= 30) return "tier4";
  if (level >= 20) return "tier3";
  if (level >= 10) return "tier2";
  return "tier1";
}
function getTierLabel(tier) {
  return { tier1: "見習い", tier2: "戦士", tier3: "熟練", tier4: "英雄", tier5: "伝説", tier6: "究極" }[tier] || "見習い";
}
function getTierColors(tier) {
  return {
    tier1: ["#c8b898", "#9a8060", null],
    tier2: ["#8aa4c0", "#5878a0", "rgba(100,160,210,0.25)"],
    tier3: ["#d4a840", "#a07820", "rgba(200,170,60,0.35)"],
    tier4: ["#e0b850", "#a07820", "rgba(224,190,60,0.5)"],
    tier5: ["#c03030", "#801010", "rgba(220,60,40,0.5)"],
    tier6: ["#f0e090", "#c89030", "rgba(255,228,80,0.65)"],
  }[tier] || ["#c8b898", "#9a8060", null];
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

// ドット絵の主人公（段階ごと）。画像は public/sprites/tier1.png 〜 tier6.png
const SPRITE_BASE = `${(import.meta.env && import.meta.env.BASE_URL) || "/"}sprites/`;
const CHAR_IMAGES = Object.fromEntries(["tier1", "tier2", "tier3", "tier4", "tier5", "tier6"].map((t) => [t, `${SPRITE_BASE}${t}.png`]));

function CharacterDisplay({ level, job, icon, size = 120, showAura = true }) {
  const tier = getCharacterTier(level);
  const [, , glowColor] = getTierColors(tier);
  const imgSrc = CHAR_IMAGES[tier] || CHAR_IMAGES["tier1"];
  const isUltimate = tier === "tier6";
  return (
    <div style={{ width: size, height: size, position: "relative", display: "inline-block" }}>
      {showAura && glowColor && (
        <div style={{
          position: "absolute", inset: isUltimate ? -12 : -6, borderRadius: "50%",
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 68%)`,
          pointerEvents: "none",
          animation: isUltimate ? "shimmer 2.5s ease-in-out infinite" : "none",
        }} />
      )}
      <img
        src={imgSrc}
        width={size}
        height={size}
        style={{ display: "block", position: "relative", zIndex: 1 }}
        draggable={false}
      />
    </div>
  );
}

// ============ Format helpers ============
// ── ひっかけ言葉の印：問題文の「できない」「以外」「限り」などに印をつける（読み違い対策）。TRAP_MARK.on は StudyRPG が設定から決める ──
const TRAP_MARK = { on: false };
const misreadCount = (state) => { let n = 0; state.questionBanks.forEach((b) => (b.questions || []).forEach((q) => { n += (q.errTypes && q.errTypes.misread) || 0; })); return n; };
const trapMarkOn = (state) => { const v = state.displaySettings && state.displaySettings.trapMark; return v === undefined || v === null ? misreadCount(state) >= 3 : !!v; };
const TRAP_RE = /(することができない|できない|してはならない|ならない|要しない|妨げない|ではない|しない|以外|に限り|に限る|を除き|を除く|のみ|だけ|必ず|常に|すべて|いずれも|誤っている|誤りである|未満|を超え|以上|以下|以内|ただし)/g;
function markTraps(t, keyBase) {
  const out = [];
  let last = 0, m, k = 0;
  TRAP_RE.lastIndex = 0;
  while ((m = TRAP_RE.exec(t))) {
    if (m.index > last) out.push(t.slice(last, m.index));
    out.push(<span key={`${keyBase}t${k++}`} style={{ borderBottom: "2px dotted #c9564e", fontWeight: 700 }}>{m[0]}</span>);
    last = m.index + m[0].length;
  }
  if (last < t.length) out.push(t.slice(last));
  return out;
}
function renderQText(text, formats) {
  if (!TRAP_MARK.on || !text) return renderFormattedText(text, formats);
  return renderFormattedText(text, formats, true);
}
function renderFormattedText(text, formats, trap = false) {
  if (!text) return null;
  if (!formats || formats.length === 0) return trap ? <>{markTraps(text, "x")}</> : text;
  const sorted = [...formats].sort((a, b) => a.from - b.from);
  const parts = [];
  let cursor = 0;
  sorted.forEach((f, i) => {
    if (f.from > cursor) parts.push({ text: text.slice(cursor, f.from), type: null, key: `p${i}` });
    parts.push({ text: text.slice(f.from, f.to), type: f.type, color: f.color, key: `f${i}` });
    cursor = f.to;
  });
  if (cursor < text.length) parts.push({ text: text.slice(cursor), type: null, key: 'end' });
  return (
    <>
      {parts.map(({ text: t, type, color, key }) => {
        if (!type) return <span key={key}>{trap ? markTraps(t, key) : t}</span>;
        if (type === 'highlight') return <mark key={key} style={{ background: color || '#FFE082', color: 'inherit', borderRadius: '2px', padding: '0 2px' }}>{t}</mark>;
        if (type === 'bold') return <strong key={key} style={{ fontWeight: 'bold' }}>{t}</strong>;
        if (type === 'underline') return <span key={key} style={{ textDecoration: 'underline', textUnderlineOffset: '3px' }}>{t}</span>;
        return <span key={key}>{t}</span>;
      })}
    </>
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

function Box({ title, icon, children }) {
  return (
    <div className="rpg-box p-1">
      <div className="rpg-inner-border">
        {title && (
          <div className="flex items-center gap-2 mb-3">
            {icon && <span className="box-ico" style={{ color: "var(--sky-deep)" }}>{icon}</span>}
            <h2 className="jp text-sm md:text-base" style={{ color: "var(--ink)" }}>{title}</h2>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="sq-stat p-2 text-center" style={{ background: "var(--paper)", border: `1px solid ${accent}` }}>
      <div className="jp text-[10px]" style={{ color: "var(--ink-soft)" }}>{label}</div>
      <div className="jp text-base md:text-lg" style={{ color: accent }}>{value}</div>
    </div>
  );
}

function DecorSwirls() {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(53,65,86,0.012) 2px, rgba(53,65,86,0.012) 4px)" }}>
      <span className="swirl text-3xl" style={{ top: "8%", left: "5%" }}>❦</span>
      <span className="swirl text-2xl" style={{ top: "20%", right: "8%" }}>❧</span>
      <span className="swirl text-2xl" style={{ top: "60%", left: "3%" }}>✦</span>
      <span className="swirl text-3xl" style={{ top: "75%", right: "5%" }}>❦</span>
      <span className="swirl text-xl" style={{ top: "40%", right: "30%" }}>❀</span>
      <span className="swirl text-2xl" style={{ top: "85%", left: "40%" }}>✧</span>
    </div>
  );
}

export default App;

// デモモードの見本帳（demo/icons.html）で使う
export { GameIcon, Ico, RPG_ITEMS, RPG_CONSUMABLES, RPG_BOSSES, DIFFICULTIES, WHITE_CSS };
