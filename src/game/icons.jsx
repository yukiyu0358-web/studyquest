// アイコン：線のアイコン（Ico）と、装備・道具・タスク・ボスのメダル絵（GameIcon）
import { useId } from "react";

// ============ Icons ============
// 白金テーマでは絵文字の代わりに細い線のアイコン（LINE_ICONS）を表示する（切り替えは CSS の .ico-emoji / .ico-line）
export const LINE_ICONS = {
  "⚔️": <><path d="M14.5 17.5L3 6V3h3l11.5 11.5" /><path d="M13 19l6-6M16 16l4 4M19 21l2-2" /><path d="M14.5 6.5L18 3h3v3l-3.5 3.5" /><path d="M5 14l4 4M7 17l-3 3M3 19l2 2" /></>,
  "🗑️": <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" /></>,
  "✨": <><path d="M11 3l1.8 5.2L18 10l-5.2 1.8L11 17l-1.8-5.2L4 10l5.2-1.8z" /><path d="M19 14l.7 1.8 1.8.7-1.8.7L19 19l-.7-1.8-1.8-.7 1.8-.7z" /></>,
  "📜": <><path d="M15 12h-5M15 8h-5M19 17V5a2 2 0 0 0-2-2H4" /><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3" /></>,
  "⬆": <><path d="M12 16V4M7 9l5-5 5 5M5 20h14" /></>,
  "⏸": <><path d="M9 5v14M15 5v14" /></>,
  "📖": <><path d="M2 5h6a4 4 0 0 1 4 4v11a3 3 0 0 0-3-3H2z" /><path d="M22 5h-6a4 4 0 0 0-4 4v11a3 3 0 0 1 3-3h7z" /></>,
  "📅": <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
  "🏠": <><path d="M3 11l9-8 9 8" /><path d="M5 9.5V21h5v-6h4v6h5V9.5" /></>,
  "❓": <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17.2v.1" /></>,
  "👁": <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  "🔀": <><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" /></>,
  "🏆": <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M17 6h3v1a3 3 0 0 1-3 3M7 6H4v1a3 3 0 0 0 3 3" /></>,
  "⏱": <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M10 2h4M12 2v3" /></>,
  "📈": <><path d="M3 17l6-6 4 4 8-8M15 7h6v6" /></>,
  "👑": <><path d="M3 7l4.5 5L12 5l4.5 7L21 7l-2 11H5z" /><path d="M5 21h14" /></>,
  "🔖": <><path d="M6 3h12v18l-6-4-6 4z" /></>,
  "⭐": <><path d="M12 3l2.8 5.8 6.2.8-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.8z" /></>,
  "📁": <><path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>,
  "💀": <><path d="M12 3a8 8 0 0 0-5 14.2V21h10v-3.8A8 8 0 0 0 12 3z" /><circle cx="9" cy="11" r="1.6" /><circle cx="15" cy="11" r="1.6" /><path d="M10.5 21v-2.5M13.5 21v-2.5" /></>,
  "🗡": <><path d="M20 4v4l-9 9-4-4 9-9z" /><path d="M6 14l4 4M8 16l-4 4" /></>,
  "📊": <><path d="M3 20h18M6 20v-8M11 20V5M16 20v-11" /></>,
  "🚪": <><path d="M14 4H6v16h8M10 12h11M18 9l3 3-3 3" /></>,
  "🔍": <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.6-4.6" /></>,
  "🏰": <><path d="M3 21V9h3v2h3V9h6v2h3V9h3v12z" /><path d="M10 21v-4a2 2 0 0 1 4 0v4M9 9V5l3-2.5L15 5v4" /></>,
  "📤": <><path d="M7 18a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 8a4 4 0 0 1-.5 8" /><path d="M12 20v-8M9 15l3-3 3 3" /></>,
  "📥": <><path d="M7 16a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 6a4 4 0 0 1-.5 8" /><path d="M12 11v9M9 17l3 3 3-3" /></>,
  "📦": <><path d="M3 8l9-5 9 5v8l-9 5-9-5z" /><path d="M3 8l9 5 9-5M12 13v8" /></>,
  "📂": <><path d="M3 7a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v1" /><path d="M3 19l2.5-8h16L19 19z" /></>,
};
export function Ico({ ch, size = 16 }) {
  const line = LINE_ICONS[ch];
  const emoji = (<span className={line ? "ico-emoji sq-emo" : "sq-emo"} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: size, height: size, fontSize: size * 0.9, lineHeight: 1, fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif' }}>{ch}</span>);
  if (!line) return emoji;
  return (<>{emoji}<svg className="ico-line" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{line}</svg></>);
}
export const Sword = (p) => <Ico ch="⚔️" {...p} />;
export const Plus = (p) => <Ico ch="＋" {...p} />;
export const Check = (p) => <Ico ch="✓" {...p} />;
export const Trash2 = (p) => <Ico ch="🗑️" {...p} />;
export const Sparkles = (p) => <Ico ch="✨" {...p} />;
export const ScrollIcon = (p) => <Ico ch="📜" {...p} />;
export const Upload = (p) => <Ico ch="⬆" {...p} />;
export const Play = (p) => <Ico ch="▶" {...p} />;
export const Pause = (p) => <Ico ch="⏸" {...p} />;
export const BookOpen = (p) => <Ico ch="📖" {...p} />;
export const Calendar = (p) => <Ico ch="📅" {...p} />;
export const Home = (p) => <Ico ch="🏠" {...p} />;
export const FileQuestion = (p) => <Ico ch="❓" {...p} />;
export const Eye = (p) => <Ico ch="👁" {...p} />;
export const Shuffle = (p) => <Ico ch="🔀" {...p} />;
export const XIcon = (p) => <Ico ch="✕" {...p} />;
export const Award = (p) => <Ico ch="🏆" {...p} />;
export const Clock = (p) => <Ico ch="⏱" {...p} />;
export const TrendingUp = (p) => <Ico ch="📈" {...p} />;
export const Crown = (p) => <Ico ch="👑" {...p} />;
export const Pencil = (p) => <Ico ch="✎" {...p} />;
export const Bookmark = (p) => <Ico ch="🔖" {...p} />;
export const StarIcon = (p) => <Ico ch="⭐" {...p} />;
export const FolderIcon = (p) => <Ico ch="📁" {...p} />;
export const Up = (p) => <Ico ch="▲" {...p} />;
export const Down = (p) => <Ico ch="▼" {...p} />;
export const Skull = (p) => <Ico ch="💀" {...p} />;
export const Sword2 = (p) => <Ico ch="🗡" {...p} />;
export const StatusIcon = (p) => <Ico ch="📊" {...p} />;
export const LogoutIcon = (p) => <Ico ch="🚪" {...p} />;
export const Search = (p) => <Ico ch="🔍" {...p} />;
export const Castle = (p) => <Ico ch="🏰" {...p} />;

// ============ ゲームのアイコン（装備・道具・タスク・ボス） ============
// 白金テーマでは、絵文字の代わりにメダル形の絵を表示する（切り替えは Ico と同じ CSS の .ico-emoji / .ico-line）
// 絵は 48×48 の座標で描く。外枠の色はレア度（N 銀・R 青・SR 金・SSR 虹金）で変わる
export const GA = { navy: "#2f4570", ink: "#22335c", gold: "#b08a3e", goldL: "#d6b56a", goldP: "#f1dfae", ivory: "#fdfbf5", silver: "#d5dbe5", silverD: "#8a96b0", wood: "#8a5a32", woodL: "#b98552", red: "#b35a54", rose: "#e3908a", green: "#6f9a52", greenD: "#4f7a3a", orange: "#d9822b", flame: "#f2c14e", glass: "#e6f0fa", sky: "#9cc3e6" };
export const swordArt = (blade, guard, grip, pommel) => (<>
  <path d="M33 11l2 2-15 15-2-2z" fill={blade} stroke={GA.ink} strokeWidth="1.2" strokeLinejoin="round" />
  <path d="M16 24l8 8" stroke={guard} strokeWidth="2.8" strokeLinecap="round" />
  <path d="M19 29l-5 5" stroke={grip} strokeWidth="2.8" strokeLinecap="round" />
  <circle cx="13" cy="35" r="2" fill={GA.goldL} stroke={GA.gold} strokeWidth=".8" />
</>);
export const crossedSwords = (blade, guard, grip) => (<>
  {[["M12 12L28 28", "M24 31l7-7", "M30 30l5 5", 36], ["M36 12L20 28", "M17 24l7 7", "M18 30l-5 5", 12]].map(([b, g, h, px], i) => (
    <g key={i}>
      <path d={b} stroke={GA.ink} strokeWidth="4.6" strokeLinecap="round" /><path d={b} stroke={blade} strokeWidth="2.8" strokeLinecap="round" />
      <path d={g} stroke={guard} strokeWidth="2.6" strokeLinecap="round" /><path d={h} stroke={grip} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx={px} cy="36" r="1.8" fill={GA.goldL} stroke={GA.gold} strokeWidth=".7" />
    </g>
  ))}
</>);
export const oniArt = (horn) => (<>
  <path d="M15 15l-3-6 6 3M33 15l3-6-6 3" fill={horn} stroke={GA.ink} strokeWidth="1.1" strokeLinejoin="round" />
  <path d="M14 21c0-6 4-10 10-10s10 4 10 10v5c0 7-5 12-10 12s-10-5-10-12z" fill={GA.red} stroke={GA.ink} strokeWidth="1.3" />
  <path d="M17.5 20.5l4.5 2M30.5 20.5l-4.5 2" stroke={GA.ink} strokeWidth="1.7" strokeLinecap="round" />
  <circle cx="20" cy="24.5" r="1.7" fill={GA.goldP} /><circle cx="28" cy="24.5" r="1.7" fill={GA.goldP} />
  <path d="M19 31h10" stroke={GA.ink} strokeWidth="1.4" strokeLinecap="round" /><path d="M21 31l1 2.4 1-2.4M25 31l1 2.4 1-2.4" fill={GA.ivory} stroke={GA.ivory} strokeWidth=".6" />
</>);
export const GAME_ART = {
  // 武器
  "🪄": <><path d="M14 36L30 18" stroke={GA.wood} strokeWidth="3.4" strokeLinecap="round" /><path d="M15 34.5L29.5 18.5" stroke={GA.woodL} strokeWidth="1.1" strokeLinecap="round" /><path d="M32 8.5l1.7 3.7 4 .5-3 2.7.8 4-3.5-1.9-3.5 1.9.8-4-3-2.7 4-.5z" fill={GA.goldL} stroke={GA.gold} strokeWidth="1" strokeLinejoin="round" /><circle cx="37.5" cy="21" r="1" fill={GA.goldL} /><circle cx="25.5" cy="11" r=".9" fill={GA.goldL} /></>,
  "🖋️": <><path d="M35 10c-9 1-16 8-18 18l-2 6 4-3c9-2 16-10 16-21z" fill={GA.ivory} stroke={GA.ink} strokeWidth="1.3" strokeLinejoin="round" /><path d="M34 11L18 32" stroke={GA.silverD} strokeWidth="1" /><path d="M29 14l3 3M25 18l4 3M21.5 23l3.5 2" stroke={GA.silverD} strokeWidth=".9" /><path d="M17.5 32l-3.5 6 6-3.5z" fill={GA.silverD} stroke={GA.ink} strokeWidth="1" strokeLinejoin="round" /></>,
  "⛓️": <>{swordArt(GA.silver, GA.gold, GA.wood)}<g fill="none" stroke={GA.silverD} strokeWidth="1.4"><ellipse cx="22" cy="37" rx="2.6" ry="1.6" transform="rotate(-30 22 37)" /><ellipse cx="26.5" cy="34.6" rx="2.6" ry="1.6" transform="rotate(-30 26.5 34.6)" /><ellipse cx="31" cy="32.2" rx="2.6" ry="1.6" transform="rotate(-30 31 32.2)" /></g></>,
  "🗡️": <><path d="M35 7v3M39 12h-3M38.5 8.5l-2 2" stroke={GA.goldL} strokeWidth="1.3" strokeLinecap="round" />{swordArt(GA.glass, GA.gold, GA.navy)}<path d="M33.5 12.5L19.5 26.5" stroke={GA.sky} strokeWidth="1" /><circle cx="20" cy="28" r="1.6" fill={GA.red} stroke={GA.ink} strokeWidth=".6" /></>,
  "⚔️": crossedSwords(GA.silver, GA.gold, GA.navy),
  // 防具
  "🥋": <><path d="M18 12l6 3 6-3 7 6-3 4-3-2v17H17V20l-3 2-3-4z" fill={GA.ivory} stroke={GA.ink} strokeWidth="1.3" strokeLinejoin="round" /><path d="M18 12l6 10 6-10" fill="none" stroke={GA.navy} strokeWidth="1.3" strokeLinejoin="round" /><path d="M17 28h14" stroke={GA.gold} strokeWidth="2.2" /></>,
  "🦺": <><path d="M17 12h4l3 6 3-6h4l4 6v19H13V18z" fill={GA.orange} stroke={GA.ink} strokeWidth="1.3" strokeLinejoin="round" /><path d="M24 18v19" stroke={GA.ink} strokeWidth=".9" /><path d="M13 27h22M13 31.5h22" stroke={GA.ivory} strokeWidth="1.8" /></>,
  "🧥": <><path d="M18 11l6 4 6-4 6 5-2 22H14l-2-22z" fill={GA.navy} stroke={GA.ink} strokeWidth="1.3" strokeLinejoin="round" /><path d="M18 11l6 9 6-9" fill="none" stroke={GA.goldL} strokeWidth="1.4" strokeLinejoin="round" /><path d="M24 20v18" stroke={GA.ink} strokeWidth="1" /><circle cx="26" cy="25" r="1" fill={GA.goldL} /><circle cx="26" cy="30" r="1" fill={GA.goldL} /><circle cx="26" cy="35" r="1" fill={GA.goldL} /></>,
  "🛡️": <><path d="M24 9l12 4v9c0 8-5 13-12 17-7-4-12-9-12-17v-9z" fill={GA.navy} stroke={GA.gold} strokeWidth="1.9" strokeLinejoin="round" /><path d="M24 13.5v21M15.5 21h17" stroke={GA.goldL} strokeWidth="1.7" strokeLinecap="round" /></>,
  "🏯": <><path d="M24 16c-3-3-6-5.5-9.5-5.5 2 2 4 4.5 5 7.5M24 16c3-3 6-5.5 9.5-5.5-2 2-4 4.5-5 7.5" fill="none" stroke={GA.goldL} strokeWidth="2.2" strokeLinecap="round" /><path d="M13 29c0-8 5-13 11-13s11 5 11 13z" fill={GA.navy} stroke={GA.ink} strokeWidth="1.2" /><circle cx="24" cy="21" r="1.9" fill={GA.red} stroke={GA.gold} strokeWidth=".7" /><path d="M10 29h28l-3 7.5H13z" fill={GA.gold} stroke={GA.ink} strokeWidth="1.1" strokeLinejoin="round" /><path d="M12 32.5h24" stroke={GA.goldP} strokeWidth=".9" /></>,
  // アクセサリー
  "🧭": <><circle cx="24" cy="12" r="1.9" fill="none" stroke={GA.gold} strokeWidth="1.3" /><circle cx="24" cy="25" r="11" fill={GA.ivory} stroke={GA.gold} strokeWidth="2.2" /><path d="M24 15.5v2M24 32.5v2M14.5 25h2M31.5 25h2" stroke={GA.navy} strokeWidth="1.2" /><path d="M24 17l3 8h-6z" fill={GA.red} /><path d="M24 33l-3-8h6z" fill={GA.navy} /><circle cx="24" cy="25" r="1.3" fill={GA.goldL} /></>,
  "👓": <><path d="M11.5 24l-2-3.5M36.5 24l2-3.5" stroke={GA.gold} strokeWidth="1.7" strokeLinecap="round" /><circle cx="17" cy="26" r="5.6" fill={GA.glass} stroke={GA.gold} strokeWidth="2.1" /><circle cx="31" cy="26" r="5.6" fill={GA.glass} stroke={GA.gold} strokeWidth="2.1" /><path d="M22.6 25c1-1.3 1.8-1.3 2.8 0" fill="none" stroke={GA.gold} strokeWidth="1.7" /><path d="M14.5 24.5l2-2M28.5 24.5l2-2" stroke={GA.ivory} strokeWidth="1.3" strokeLinecap="round" /></>,
  "📐": <><path d="M34 11l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" fill={GA.goldL} /><rect x="9" y="20" width="30" height="9.5" rx="2" fill={GA.goldL} stroke={GA.gold} strokeWidth="1.5" /><rect x="18.5" y="22.2" width="11" height="5" rx="2.5" fill="#dcefe2" stroke={GA.navy} strokeWidth="1" /><circle cx="24" cy="24.7" r="1.4" fill={GA.ivory} /><path d="M21.6 22.2v5M26.4 22.2v5" stroke={GA.navy} strokeWidth=".7" /><path d="M12 29.5v-3M15 29.5v-2M33 29.5v-2M36 29.5v-3" stroke={GA.gold} strokeWidth=".9" /></>,
  "🗺️": <><path d="M24 10V5.5" stroke={GA.red} strokeWidth="1.5" strokeLinecap="round" /><path d="M16.5 10h15v25l-7.5 3.5-7.5-3.5z" fill={GA.ivory} stroke={GA.gold} strokeWidth="1.6" strokeLinejoin="round" /><path d="M19 15.5h10M19 20.5h10M19 25.5h10M22 12.5v18M26 12.5v18" stroke={GA.silverD} strokeWidth=".6" /><path d="M19 17l5 2.5 5-3M23 19.5l1 6.5 5 1" fill="none" stroke={GA.navy} strokeWidth="1.1" strokeLinejoin="round" /><circle cx="24" cy="31.5" r="2.4" fill={GA.red} /></>,
  // 道具
  "🧪": <><path d="M21 11h6v6c4 2 7 5 7 10a10 10 0 0 1-20 0c0-5 3-8 7-10z" fill={GA.glass} stroke={GA.ink} strokeWidth="1.3" strokeLinejoin="round" /><path d="M15 27h18a9 9 0 0 1-18 0z" fill={GA.rose} /><rect x="20.3" y="7.5" width="7.4" height="4.2" rx="1" fill={GA.woodL} stroke={GA.ink} strokeWidth="1" /><path d="M19 22.5c-1.2 1-1.7 2.2-1.8 3.6" fill="none" stroke={GA.ivory} strokeWidth="1.4" strokeLinecap="round" /><circle cx="27" cy="31" r="1" fill={GA.ivory} opacity=".8" /></>,
  "📕": <><rect x="13" y="10" width="21" height="28" rx="2" fill={GA.red} stroke={GA.ink} strokeWidth="1.3" /><path d="M17.5 10v28" stroke="#8e423d" strokeWidth="2.2" /><path d="M34 13h1.5v25.5H16" fill="none" stroke={GA.goldP} strokeWidth="1.6" /><path d="M26 17l1.6 3.4 3.7.5-2.7 2.5.7 3.7-3.3-1.8-3.3 1.8.7-3.7-2.7-2.5 3.7-.5z" fill={GA.goldL} stroke={GA.gold} strokeWidth=".7" strokeLinejoin="round" /><path d="M21 31.5h10" stroke={GA.goldL} strokeWidth="1.2" /></>,
  "🎫": <><path d="M9 17h30v4a3 3 0 0 0 0 6v4H9v-4a3 3 0 0 0 0-6z" fill={GA.goldP} stroke={GA.gold} strokeWidth="1.5" strokeLinejoin="round" /><path d="M31 18.5v11" stroke={GA.gold} strokeWidth="1" strokeDasharray="1.6 1.6" /><path d="M20.5 19a5.2 5.2 0 1 0 3.5 9.3 4.2 4.2 0 1 1-3.5-9.3z" fill={GA.navy} /><path d="M25.5 20.5l.5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5z" fill={GA.navy} /></>,
  // タスクの難しさ
  "🍃": <><path d="M12 35c0-13 9-21 24-22-1 15-9 23-22 22z" fill={GA.green} stroke={GA.greenD} strokeWidth="1.2" strokeLinejoin="round" /><path d="M13 36L32 16" stroke="#e9f2df" strokeWidth="1.3" strokeLinecap="round" /><path d="M20 28l-1-5M25 23l-1-5M23 29l5 1M28 24l4 1" stroke="#e9f2df" strokeWidth=".9" strokeLinecap="round" /></>,
  "🔥": <><path d="M24 8c2 6 10 9 10 18a10 10 0 0 1-20 0c0-5 3-7 4-11 1 3 3 4 4 4-1-4 0-8 2-11z" fill={GA.orange} stroke="#a8541c" strokeWidth="1.1" strokeLinejoin="round" /><path d="M24 22c1 3 5 4 5 8a5 5 0 0 1-10 0c0-3 2-4 3-6 .5 1 1.5 2 2 2z" fill={GA.flame} /></>,
  "👹": oniArt(GA.ivory),
  // ボス
  "🟢": <><path d="M10 33c0-9 7-19 14-23 7 4 14 14 14 23 0 3-3 5-6 5H16c-3 0-6-2-6-5z" fill="#86bd70" stroke={GA.greenD} strokeWidth="1.3" strokeLinejoin="round" /><path d="M16.5 25c1-4 3-7.5 5.5-9.5" fill="none" stroke={GA.ivory} strokeWidth="1.7" strokeLinecap="round" opacity=".85" /><circle cx="20" cy="28" r="1.7" fill={GA.ink} /><circle cx="28" cy="28" r="1.7" fill={GA.ink} /><path d="M22 32c1.2 1 2.8 1 4 0" fill="none" stroke={GA.ink} strokeWidth="1.2" strokeLinecap="round" /></>,
  "👻": <><path d="M14 38V22a10 10 0 0 1 20 0v16l-3.3-3-3.4 3-3.3-3-3.3 3-3.4-3z" fill={GA.ivory} stroke={GA.silverD} strokeWidth="1.3" strokeLinejoin="round" /><ellipse cx="20" cy="23" rx="1.6" ry="2.3" fill={GA.ink} /><ellipse cx="28" cy="23" rx="1.6" ry="2.3" fill={GA.ink} /><ellipse cx="24" cy="29.5" rx="1.9" ry="2.4" fill={GA.ink} /></>,
  "🗿": <><path d="M15 11h18l3 6v15l-4 6H16l-4-6V17z" fill="#a39d8f" stroke="#5f5a50" strokeWidth="1.3" strokeLinejoin="round" /><rect x="16.5" y="21" width="5.5" height="2.4" rx=".6" fill={GA.flame} /><rect x="26" y="21" width="5.5" height="2.4" rx=".6" fill={GA.flame} /><path d="M20 11l2 5-2 3M30.5 29l-3 3 1 4M15 17h4" fill="none" stroke="#5f5a50" strokeWidth=".9" /><path d="M19.5 31h9" stroke="#5f5a50" strokeWidth="1.5" strokeLinecap="round" /></>,
  "🐉": <><path d="M31 18l5-8.5" stroke={GA.goldL} strokeWidth="2.2" strokeLinecap="round" /><path d="M37 14l-4.5 4c-6-1-12 2-15 7l-7.5 3 2 3.5h8.5c3 4 8.5 5 13 2.5l3-5-2-3 4-2.5-3-3z" fill="#4f8a72" stroke="#2e5a48" strokeWidth="1.2" strokeLinejoin="round" /><circle cx="29.5" cy="22" r="1.4" fill={GA.flame} /><path d="M13 30.5h4M24 27c2 1 5 1 7-1" fill="none" stroke="#2e5a48" strokeWidth="1" strokeLinecap="round" /><path d="M11 33.5l-3 2M12.5 35l-1.5 3" stroke={GA.orange} strokeWidth="1.3" strokeLinecap="round" /></>,
  "🦹": <><path d="M24 8c-7 0-11 7-11 14v16h22V22c0-7-4-14-11-14z" fill="#3a3550" stroke="#22203a" strokeWidth="1.3" /><path d="M17.5 25a6.5 7 0 0 1 13 0v5h-13z" fill="#15131f" /><circle cx="21.5" cy="26" r="1.2" fill="#c9b5f0" /><circle cx="26.5" cy="26" r="1.2" fill="#c9b5f0" /><path d="M13 38l3-5M35 38l-3-5" stroke="#22203a" strokeWidth="1" /></>,
};
// 同じ絵文字でも絵を変えたいもの（id で指定）
export const GAME_ART_BY_ID = {
  "w-divine": <><circle cx="24" cy="24" r="14" fill="none" stroke={GA.goldL} strokeWidth="1" strokeDasharray="2 2.2" />{crossedSwords(GA.goldP, GA.gold, GA.red)}</>,
  maou: oniArt(GA.goldL),
};
export const GAME_RING = { N: "#a9b1c2", R: "#4f7fb8", SR: "#b08a3e" };
export function GameIcon({ ch, id, rarity, size = 28, boss = false }) {
  const gid = useId();
  const art = (id && GAME_ART_BY_ID[id]) || GAME_ART[ch];
  const emoji = <span className={art ? "ico-emoji sq-emo" : "sq-emo"} style={{ fontSize: size * 0.8, lineHeight: 1 }}>{ch}</span>;
  if (!art) return emoji;
  const ring = rarity === "SSR" ? `url(#${gid})` : boss ? "#a24a45" : GAME_RING[rarity] || "#c9b07a";
  return (<>{emoji}
    <svg className="ico-line" width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      {rarity === "SSR" && <defs><linearGradient id={gid} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e9cf8e" /><stop offset=".45" stopColor="#d98fa6" /><stop offset=".75" stopColor="#8c79c8" /><stop offset="1" stopColor="#d6b56a" /></linearGradient></defs>}
      <circle cx="24" cy="24" r="22" fill={boss ? "#f3ebe0" : rarity === "SSR" ? "#fff7e2" : "#fbf6ea"} stroke={ring} strokeWidth={rarity === "SR" || rarity === "SSR" ? 2.8 : 2.2} />
      <circle cx="24" cy="24" r="19" stroke={rarity === "R" ? "rgba(79,127,184,0.35)" : "rgba(176,138,62,0.35)"} strokeWidth=".8" />
      {art}
    </svg>
  </>);
}
