// 戦いの演出：主人公の攻撃（斬撃・魔法・弓）、魔物の攻撃（ひっかき・かみつき・炎の息など）、漂う光の粒
// 位置は戦場の箱に対する % で指定する（H＝主人公、M＝魔物）。演出はおよそ1秒で消える

export const BATTLE_FX_CSS = `
@keyframes sqxProj{0%{left:var(--x0);top:var(--y0);opacity:0;transform:translate(-50%,-50%) scale(.5) rotate(var(--rot,0deg))}12%{opacity:1}100%{left:var(--x1);top:var(--y1);opacity:1;transform:translate(-50%,-50%) scale(1.15) rotate(var(--rot,0deg))}}
@keyframes sqxBoom{0%{opacity:0;transform:translate(-50%,-50%) scale(.15)}6%{opacity:1}70%{opacity:.9}100%{opacity:0;transform:translate(-50%,-50%) scale(var(--s,2.2))}}
@keyframes sqxRing{0%{opacity:0;transform:translate(-50%,-50%) scale(.2);border-width:6px}6%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) scale(var(--s,2.6));border-width:1px}}
@keyframes sqxSpark{0%{opacity:0;transform:translate(-50%,-50%)}6%{opacity:1}100%{opacity:0;transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(.2)}}
@keyframes sqxDash{0%{opacity:0;stroke-dashoffset:var(--len,160)}12%{opacity:1}55%{stroke-dashoffset:0;opacity:1}100%{opacity:0;stroke-dashoffset:0}}
@keyframes sqxBolt{0%,100%{opacity:0}8%{opacity:1}22%{opacity:.25}34%{opacity:1}60%{opacity:.8}}
@keyframes sqxPillar{0%{opacity:0;transform:translateX(-50%) scaleY(0)}25%{opacity:1;transform:translateX(-50%) scaleY(1)}70%{opacity:.9}100%{opacity:0;transform:translateX(-50%) scaleY(1) scaleX(.3)}}
@keyframes sqxFall{0%{opacity:0;transform:translate(-50%,-90px) rotate(0)}20%{opacity:1}75%{opacity:1;transform:translate(-50%,0) rotate(160deg)}100%{opacity:0;transform:translate(-50%,6px) rotate(180deg)}}
@keyframes sqxFog{0%{opacity:0;transform:translate(-50%,-50%) scale(.6)}35%{opacity:.85}100%{opacity:0;transform:translate(-50%,-60%) scale(1.5)}}
@keyframes sqxBite{0%{opacity:0;transform:translate(-50%,var(--from)) }30%{opacity:1}55%{transform:translate(-50%,0)}100%{opacity:0;transform:translate(-50%,0)}}
@keyframes sqxBanner{0%{opacity:0;transform:translateX(-30px)}15%{opacity:1;transform:none}80%{opacity:1}100%{opacity:0;transform:translateX(10px)}}
@keyframes sqxKnock{0%{transform:none;filter:none}18%{transform:translateX(16px) rotate(4deg);filter:brightness(2.6) saturate(.4)}45%{transform:translateX(6px);filter:brightness(1.2)}100%{transform:none;filter:none}}
@keyframes sqxLungeL{0%,100%{transform:none}40%{transform:translateX(-60px) scale(1.12)}}
@keyframes sqxPunch{0%,100%{transform:scale(1)}30%{transform:scale(1.035)}}
@keyframes sqxQuake{0%,100%{transform:translate(0,0)}15%{transform:translate(-7px,3px)}30%{transform:translate(6px,-4px)}45%{transform:translate(-5px,2px)}60%{transform:translate(4px,-2px)}80%{transform:translate(-2px,1px)}}
@keyframes sqxUp{0%{opacity:0;transform:translateY(0)}20%{opacity:var(--o,.8)}100%{opacity:0;transform:translate(var(--dx,0px),-70px)}}
@keyframes sqxDown{0%{opacity:0;transform:translateY(-20px)}20%{opacity:var(--o,.8)}100%{opacity:0;transform:translate(var(--dx,0px),120px)}}
@keyframes sqxPulse{0%,100%{opacity:.35}50%{opacity:.85}}
@keyframes sqxDim{0%{opacity:0}14%{opacity:1}72%{opacity:1}100%{opacity:0}}
@keyframes sqxCam{0%{transform:scale(1)}18%{transform:scale(1.08)}62%{transform:scale(1.08)}100%{transform:scale(1)}}
@keyframes sqxLines{0%{opacity:0}8%{opacity:.95}35%{opacity:.6}100%{opacity:0}}
@keyframes sqxTrail{0%{opacity:0;stroke-dashoffset:var(--len,300)}18%{opacity:1;stroke-dashoffset:0}70%{opacity:.85;stroke-dashoffset:0}100%{opacity:0;stroke-dashoffset:0}}
@keyframes sqxCutBg{0%{transform:translateX(-105%) skewX(-12deg);opacity:1}12%{transform:translateX(0) skewX(-12deg)}84%{transform:translateX(0) skewX(-12deg);opacity:1}100%{transform:translateX(35%) skewX(-12deg);opacity:0}}
@keyframes sqxCutImg{0%{transform:scale(1.3) translateX(10%)}100%{transform:scale(1.06) translateX(-4%)}}
@keyframes sqxNum{0%{opacity:0;transform:translate(-50%,0) scale(.4)}18%{opacity:1;transform:translate(-50%,-22px) scale(1.35)}35%{transform:translate(-50%,-18px) scale(1)}80%{opacity:1;transform:translate(-50%,-30px)}100%{opacity:0;transform:translate(-50%,-40px)}}
`;

// ── 主人公の攻撃 ──
const ATK = {
  slash: { kind: "slash", n: 1, name: "斬撃", crit: "ギガスラッシュ", color: "#ffffff", glow: "rgba(255,255,255,0.95)", sfx: "hit" },
  cross: { kind: "slash", n: 2, name: "十字斬り", crit: "グランドクロス", color: "#ffffff", glow: "rgba(214,181,106,0.95)", sfx: "hit" },
  triple: { kind: "slash", n: 3, name: "三連斬", crit: "百花繚乱", color: "#fff6dc", glow: "rgba(242,193,78,0.9)", sfx: "hit" },
  fire: { kind: "magic", name: "フレア", crit: "メテオフレア", color: "#ff8a2a", color2: "#ffd36b", sfx: "fire" },
  ice: { kind: "ice", name: "アイスランス", crit: "ダイヤモンドダスト", color: "#8fd3ff", color2: "#eaf8ff", sfx: "ice" },
  thunder: { kind: "thunder", name: "サンダー", crit: "ジャッジメント・ボルト", color: "#ffe25e", color2: "#ffffff", sfx: "thunder" },
  holy: { kind: "holy", name: "ホーリー", crit: "セイクリッド・レイ", color: "#fff1b8", color2: "#f2c14e", sfx: "holy" },
  wind: { kind: "wind", name: "疾風", crit: "テンペスト", color: "#bdf2d6", color2: "#ffffff", sfx: "wind" },
  arrow: { kind: "arrow", name: "疾風の矢", crit: "流星の矢", color: "#ffffff", color2: "#9fd2ff", sfx: "arrow" },
};
// 科目（地域）ごとの得意な属性
const REGION_EL = { "不動産登記法の王都": "holy", "民法の古の森": "wind", "区分所有の双子塔": "ice", "調査士法の砦": "fire", "測量の星見台": "thunder", "書式の迷宮": "fire", "電波法の港町": "wind", "雷鳴の工房": "thunder" }; // 二陸特の世界の地域は src/data/worlds.js
export const ELEMENTS = ["fire", "ice", "thunder", "holy", "wind"];
// 属性の名前と印（魔物の弱点の表示に使う）
export const EL_NAME = { fire: "炎", ice: "氷", thunder: "雷", holy: "光", wind: "風" };
export const EL_ICON = { fire: "🔥", ice: "❄", thunder: "⚡", holy: "✨", wind: "🌀" };
const MAGIC_W = ["w-staff", "w-tome", "w-star"], BOW_W = ["w-bow"], SWORD_W = ["w-chain", "w-holy", "w-divine", "w-sky"];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
export function heroAttackFor({ weapon, region, crit, combo = 0, weak = null }) {
  const el = REGION_EL[region] || pick(ELEMENTS);
  const melee = () => (combo >= 6 ? "triple" : combo >= 3 ? pick(["cross", "triple", "slash"]) : pick(["slash", "slash", "cross"]));
  let id;
  const r = Math.random();
  // 魔物の弱点の属性：魔法の武器ほど弱点を突きやすい（杖・魔導書・星の杖 6割、武器なし 3割、剣 2割、弓 1.5割）
  const wr = MAGIC_W.includes(weapon) ? 0.6 : BOW_W.includes(weapon) ? 0.15 : SWORD_W.includes(weapon) ? 0.2 : 0.3;
  if (weak && ATK[weak] && Math.random() < wr) { const a = ATK[weak]; return { id: weak, ...a, name: crit ? a.crit : a.name, crit: !!crit }; }
  if (MAGIC_W.includes(weapon)) id = r < 0.75 ? (r < 0.5 ? el : pick(ELEMENTS)) : melee();
  else if (BOW_W.includes(weapon)) id = r < 0.7 ? "arrow" : r < 0.85 ? "wind" : melee();
  else if (SWORD_W.includes(weapon)) id = r < 0.72 ? melee() : el;
  else id = r < 0.55 ? melee() : r < 0.85 ? el : pick(ELEMENTS);
  const a = ATK[id];
  return { id, ...a, name: crit ? a.crit : a.name, crit: !!crit };
}

// ── 魔物の攻撃（種族ごと） ──
const MATK = {
  claw: { kind: "claw", name: "ひっかき", color: "#e04848" },
  bite: { kind: "bite", name: "かみつき", color: "#ffffff" },
  breath: { kind: "breath", name: "ほのおの息", color: "#ff7a2f", color2: "#ffd36b" },
  orb: { kind: "orb", name: "闇の魔弾", color: "#8a5cd8", color2: "#e6d6ff" },
  tackle: { kind: "tackle", name: "たいあたり", color: "#ffffff" },
  rock: { kind: "rock", name: "岩石落とし", color: "#8b7d66" },
  curse: { kind: "curse", name: "のろい", color: "#7b4bb8" },
  gust: { kind: "gust", name: "かまいたち", color: "#d8f3ff" },
  poison: { kind: "curse", name: "毒の糸", color: "#6fb86a" },
  ice: { kind: "orb", name: "こおりの息", color: "#8fd3ff", color2: "#ffffff" },
};
const MON_MOVES = {
  slime: ["tackle"], slimeking: ["tackle", "rock"], wolf: ["bite", "claw"], lunawolf: ["bite", "claw", "ice"], magician: ["orb", "curse"],
  sprite: ["orb", "ice"], wisp: ["orb"], ghost: ["curse", "orb"], grimoire: ["orb", "curse"], stonegolem: ["rock", "tackle"],
  rockgolem: ["rock", "tackle"], magolem: ["rock", "orb"], armor: ["claw", "tackle"], skeleton: ["claw"], goblin: ["claw", "bite"],
  mimic: ["bite"], harpy: ["gust", "claw"], lizard: ["claw", "bite"], darkdragon: ["breath", "claw", "bite"], kelpie: ["ice", "tackle"],
  spider: ["poison", "bite"], mandrake: ["curse", "rock"], mandragora: ["curse"], elderweed: ["curse", "rock"],
};
export function monAttackFor(img) {
  const id = pick(MON_MOVES[img] || ["claw", "tackle", "orb"]);
  return { id, ...MATK[id] };
}
// 当たるまでの時間（秒）：ここでダメージの数字と、のけぞりを出す
export const impactOf = (a) => ({ slash: 0.05, magic: 0.3, ice: 0.28, thunder: 0.14, holy: 0.16, wind: 0.12, arrow: 0.22, claw: 0.05, bite: 0.12, breath: 0.32, orb: 0.3, tackle: 0.2, rock: 0.28, curse: 0.18, gust: 0.14 }[a && a.kind] ?? 0.1);

// 決まった乱数（同じ演出の中で粒の位置が毎回変わらないように）
const rnd = (seed, i) => { const x = Math.sin(seed * 97.13 + i * 13.37) * 43758.5453; return x - Math.floor(x); };

function Sparks({ at, n, seed, colors, size = 6, dist = 50, delay = 0 }) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + rnd(seed, i) * 0.6, r = dist * (0.55 + rnd(seed, i + 50) * 0.6), c = colors[i % colors.length];
    return <span key={`sp${i}`} style={{ position: "absolute", left: at[0], top: at[1], width: size, height: size, borderRadius: "50%", background: c, boxShadow: `0 0 ${size + 2}px ${c}`, "--dx": `${Math.round(Math.cos(a) * r)}px`, "--dy": `${Math.round(Math.sin(a) * r)}px`, animation: `sqxSpark .6s ease-out ${delay}s both` }} />;
  });
}
function Boom({ at, color, color2, size = 46, delay = 0, s = 2.2 }) {
  return (<>
    <span style={{ position: "absolute", left: at[0], top: at[1], width: size, height: size, borderRadius: "50%", background: `radial-gradient(circle, #ffffff 0%, ${color2 || color} 30%, ${color} 60%, transparent 72%)`, "--s": s, animation: `sqxBoom .5s ease-out ${delay}s both`, mixBlendMode: "screen" }} />
    <span style={{ position: "absolute", left: at[0], top: at[1], width: size, height: size, borderRadius: "50%", border: `4px solid ${color}`, "--s": s + 0.6, animation: `sqxRing .55s ease-out ${delay}s both` }} />
  </>);
}
const P = (pt, dx = 0, dy = 0) => [`calc(${pt[0]} + ${dx}px)`, `calc(${pt[1]} + ${dy}px)`];

// 攻撃の演出。fx = { n, side: "hero"|"mon", atk, crit }、H・M は ["18%","70%"] のような位置
export function AttackFx({ fx, H, M }) {
  if (!fx || !fx.atk) return null;
  const a = fx.atk, seed = fx.n || 1, big = !!fx.crit;
  const from = fx.side === "hero" ? H : M, to = fx.side === "hero" ? M : H;
  const t = impactOf(a);
  const proj = (child, extra = {}) => <span style={{ position: "absolute", "--x0": from[0], "--y0": from[1], "--x1": to[0], "--y1": to[1], animation: `sqxProj ${t}s cubic-bezier(.4,0,.9,.6) both`, ...extra }}>{child}</span>;
  const box = { position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" };
  const els = [];
  switch (a.kind) {
    case "slash": {
      const lines = [["M10 90L90 10"], ["M10 90L90 10", "M10 10L90 90"], ["M8 70L92 30", "M8 30L92 70", "M50 4L50 96"]][Math.min(2, (a.n || 1) - 1)];
      const ls = big ? [...lines, "M2 50L98 50"] : lines;
      els.push(<svg key="s" viewBox="0 0 100 100" style={{ position: "absolute", left: `calc(${to[0]} - 55px)`, top: `calc(${to[1]} - 55px)`, width: 110, height: 110, overflow: "visible" }}>
        {ls.map((d, i) => <path key={i} d={d} stroke={big ? "#f2c14e" : a.color} strokeWidth={big ? 8 : 5.5} strokeLinecap="round" fill="none" strokeDasharray="160" style={{ "--len": 160, animation: `sqxDash .36s ease-out ${i * 0.09}s both`, filter: `drop-shadow(0 0 5px ${a.glow})` }} />)}
      </svg>);
      els.push(<Sparks key="k" at={to} n={big ? 14 : 9} seed={seed} colors={["#fff3c4", big ? "#f2c14e" : "#ffffff", "#cfe3ff"]} delay={0.06} />);
      // 剣の通った跡：大きな三日月の光が、しばらく残る
      els.push(<svg key="tr" viewBox="0 0 200 120" style={{ position: "absolute", left: `calc(${to[0]} - 150px)`, top: `calc(${to[1]} - 95px)`, width: 230, height: 140, overflow: "visible" }}>
        <defs><linearGradient id={`trg${seed}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#ffffff" stopOpacity="0" /><stop offset=".55" stopColor="#bfe3ff" /><stop offset="1" stopColor="#ffffff" /></linearGradient></defs>
        <path d="M10 110 Q 90 -20 195 30" stroke={`url(#trg${seed})`} strokeWidth={big ? 14 : 9} strokeLinecap="round" fill="none" strokeDasharray="300" style={{ "--len": 300, animation: "sqxTrail .95s ease-out both", filter: "drop-shadow(0 0 8px #7fb6ff)" }} />
        {(a.n || 1) >= 2 && <path d="M30 20 Q 110 130 195 90" stroke={`url(#trg${seed})`} strokeWidth={big ? 10 : 7} strokeLinecap="round" fill="none" strokeDasharray="300" style={{ "--len": 300, animation: "sqxTrail .95s ease-out .12s both", filter: "drop-shadow(0 0 6px #7fb6ff)" }} />}
      </svg>);
      break;
    }
    case "magic": // 炎の玉
      els.push(<span key="p">{proj(<span style={{ display: "block", width: big ? 30 : 22, height: big ? 30 : 22, borderRadius: "50%", background: `radial-gradient(circle at 40% 40%, #fff 0%, ${a.color2} 30%, ${a.color} 65%, transparent 72%)`, boxShadow: `0 0 18px ${a.color}, -14px 0 18px ${a.color}88` }} />)}</span>);
      els.push(<Boom key="b" at={to} color={a.color} color2={a.color2} size={big ? 64 : 48} delay={t} s={big ? 2.8 : 2.2} />);
      els.push(<Sparks key="k" at={to} n={big ? 18 : 12} seed={seed} colors={[a.color, a.color2, "#fff3c4"]} delay={t} dist={big ? 70 : 50} />);
      if (big) for (let i = 0; i < 3; i++) els.push(<span key={`m${i}`} style={{ position: "absolute", "--x0": P(to, -60 + i * 40, -120)[0], "--y0": P(to, 0, -120)[1], "--x1": P(to, -10 + i * 12)[0], "--y1": to[1], width: 22, height: 22, borderRadius: "50%", background: `radial-gradient(circle, #fff, ${a.color2} 35%, ${a.color} 70%, transparent 75%)`, animation: `sqxProj .3s ease-in ${0.08 + i * 0.09}s both` }} />);
      break;
    case "ice":
      for (let i = 0; i < (big ? 5 : 3); i++) els.push(<span key={`i${i}`} style={{ position: "absolute", "--x0": P(from, 0, (i - 1) * 10)[0], "--y0": P(from, 0, (i - 1) * 10)[1], "--x1": P(to, (i - 1) * 6, (i - 1) * 8)[0], "--y1": P(to, (i - 1) * 6, (i - 1) * 8)[1], "--rot": "45deg", width: 12, height: 12, background: `linear-gradient(135deg, #fff, ${a.color})`, boxShadow: `0 0 10px ${a.color}`, animation: `sqxProj ${t}s ease-in ${i * 0.04}s both` }} />);
      els.push(<Boom key="b" at={to} color={a.color} color2={a.color2} size={big ? 62 : 46} delay={t + 0.04} />);
      els.push(<Sparks key="k" at={to} n={big ? 16 : 10} seed={seed} colors={["#ffffff", a.color, "#d9f2ff"]} size={5} delay={t} />);
      break;
    case "thunder": {
      const x = to[0];
      els.push(<svg key="t" viewBox="0 0 40 100" preserveAspectRatio="none" style={{ position: "absolute", left: `calc(${x} - ${big ? 30 : 20}px)`, top: 0, width: big ? 60 : 40, height: `calc(${to[1]} + 10px)`, overflow: "visible", animation: "sqxBolt .5s linear both", filter: `drop-shadow(0 0 6px ${a.color}) drop-shadow(0 0 12px ${a.color})` }}>
        <polyline points="22,0 12,34 24,40 10,72 26,66 18,100" fill="none" stroke={a.color2} strokeWidth="3.2" strokeLinejoin="round" />
        <polyline points="22,0 12,34 24,40 10,72 26,66 18,100" fill="none" stroke={a.color} strokeWidth="1.4" strokeLinejoin="round" />
        {big && <polyline points="30,0 34,30 26,44 32,60 22,100" fill="none" stroke={a.color2} strokeWidth="2" strokeLinejoin="round" opacity=".8" />}
      </svg>);
      els.push(<Boom key="b" at={to} color={a.color} color2="#ffffff" size={big ? 60 : 44} delay={t} />);
      els.push(<span key="f" style={{ position: "absolute", inset: 0, background: "rgba(255,250,210,0.55)", animation: "sqxBolt .45s linear both" }} />);
      break;
    }
    case "holy":
      els.push(<span key="pl" style={{ position: "absolute", left: to[0], top: 0, width: big ? 64 : 42, height: `calc(${to[1]} + 40px)`, transformOrigin: "top", background: `linear-gradient(180deg, rgba(255,255,255,0.0), ${a.color} 40%, #ffffff 80%, ${a.color2})`, boxShadow: `0 0 26px ${a.color2}`, animation: "sqxPillar .7s ease-out both", mixBlendMode: "screen" }} />);
      els.push(<Sparks key="k" at={to} n={big ? 16 : 10} seed={seed} colors={["#ffffff", a.color2, a.color]} size={5} delay={t} dist={60} />);
      els.push(<Boom key="b" at={to} color={a.color2} color2="#ffffff" size={40} delay={t} />);
      break;
    case "wind":
      for (let i = 0; i < (big ? 4 : 2); i++) els.push(<span key={`w${i}`} style={{ position: "absolute", "--x0": P(from, 0, (i - 1) * 14)[0], "--y0": P(from, 0, (i - 1) * 14)[1], "--x1": P(to, 0, (i - 1) * 12)[0], "--y1": P(to, 0, (i - 1) * 12)[1], width: 34, height: 34, borderRadius: "50%", borderRight: `4px solid ${a.color}`, filter: `drop-shadow(0 0 6px ${a.color})`, animation: `sqxProj ${t}s linear ${i * 0.05}s both` }} />);
      els.push(<svg key="s" viewBox="0 0 100 100" style={{ position: "absolute", left: `calc(${to[0]} - 50px)`, top: `calc(${to[1]} - 50px)`, width: 100, height: 100, overflow: "visible" }}>
        {[0, 1, 2].map((i) => <path key={i} d={`M5 ${30 + i * 20}Q50 ${10 + i * 20} 95 ${40 + i * 18}`} stroke={a.color} strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray="160" style={{ "--len": 160, animation: `sqxDash .35s ease-out ${t + i * 0.06}s both`, filter: `drop-shadow(0 0 4px ${a.color})` }} />)}
      </svg>);
      els.push(<Sparks key="k" at={to} n={8} seed={seed} colors={["#ffffff", a.color]} size={4} delay={t} />);
      break;
    case "arrow":
      for (let i = 0; i < (big ? 3 : 1); i++) els.push(<span key={`a${i}`} style={{ position: "absolute", "--x0": P(from, 0, (i - 1) * 9)[0], "--y0": P(from, 0, (i - 1) * 9)[1], "--x1": P(to, 0, (i - 1) * 9)[0], "--y1": P(to, 0, (i - 1) * 9)[1], "--rot": "-6deg", width: 46, height: 3, borderRadius: 2, background: `linear-gradient(90deg, transparent, ${a.color2} 40%, #ffffff)`, boxShadow: `0 0 8px ${a.color2}`, animation: `sqxProj ${t}s linear ${i * 0.07}s both` }} />);
      els.push(<Sparks key="k" at={to} n={big ? 12 : 7} seed={seed} colors={["#ffffff", a.color2]} size={4} delay={t} dist={36} />);
      els.push(<Boom key="b" at={to} color={a.color2} color2="#ffffff" size={30} delay={t} s={1.8} />);
      break;
    // ── 魔物の攻撃 ──
    case "claw":
      els.push(<svg key="c" viewBox="0 0 100 100" style={{ position: "absolute", left: `calc(${to[0]} - 40px)`, top: `calc(${to[1]} - 46px)`, width: 80, height: 80, overflow: "visible" }}>
        {[0, 1, 2].map((i) => <path key={i} d={`M${20 + i * 22} 8Q${30 + i * 22} 50 ${16 + i * 22} 94`} stroke={a.color} strokeWidth="6" strokeLinecap="round" fill="none" strokeDasharray="120" style={{ "--len": 120, animation: `sqxDash .32s ease-out ${i * 0.04}s both`, filter: "drop-shadow(0 0 4px rgba(224,72,72,0.9))" }} />)}
      </svg>);
      break;
    case "bite":
      els.push(<svg key="u" viewBox="0 0 100 40" style={{ position: "absolute", left: `calc(${to[0]} - 40px)`, top: `calc(${to[1]} - 44px)`, width: 80, height: 32, "--from": "-26px", animation: "sqxBite .5s ease-in both", overflow: "visible" }}><path d="M0 0Q50 34 100 0L88 14 76 4 64 18 50 6 36 18 24 4 12 14z" fill="#fff" stroke="#7a2b2b" strokeWidth="2" /></svg>);
      els.push(<svg key="d" viewBox="0 0 100 40" style={{ position: "absolute", left: `calc(${to[0]} - 40px)`, top: `calc(${to[1]} + 4px)`, width: 80, height: 32, "--from": "26px", animation: "sqxBite .5s ease-in both", overflow: "visible" }}><path d="M0 40Q50 6 100 40L88 26 76 36 64 22 50 34 36 22 24 36 12 26z" fill="#fff" stroke="#7a2b2b" strokeWidth="2" /></svg>);
      break;
    case "breath":
      for (let i = 0; i < 6; i++) els.push(<span key={`f${i}`} style={{ position: "absolute", "--x0": from[0], "--y0": P(from, 0, 6)[1], "--x1": P(to, (i % 3 - 1) * 10)[0], "--y1": P(to, (i % 2) * 10 - 5)[1], width: 26 + i * 4, height: 26 + i * 4, borderRadius: "50%", background: `radial-gradient(circle, ${a.color2} 0%, ${a.color} 55%, transparent 72%)`, filter: "blur(1px)", animation: `sqxProj ${t}s ease-out ${i * 0.045}s both`, mixBlendMode: "screen" }} />);
      els.push(<Boom key="b" at={to} color={a.color} color2={a.color2} size={52} delay={t} />);
      break;
    case "orb":
      els.push(<span key="p">{proj(<span style={{ display: "block", width: 22, height: 22, borderRadius: "50%", background: `radial-gradient(circle at 40% 40%, ${a.color2} 0%, ${a.color} 55%, transparent 72%)`, boxShadow: `0 0 16px ${a.color}, 14px 0 16px ${a.color}88` }} />)}</span>);
      els.push(<Boom key="b" at={to} color={a.color} color2={a.color2} size={42} delay={t} />);
      break;
    case "tackle":
      els.push(<Boom key="b" at={to} color="#ffffff" color2="#ffe7a0" size={46} delay={t} s={1.8} />);
      els.push(<Sparks key="k" at={to} n={8} seed={seed} colors={["#ffffff", "#ffe7a0"]} size={5} delay={t} dist={34} />);
      break;
    case "rock":
      for (let i = 0; i < 4; i++) els.push(<span key={`r${i}`} style={{ position: "absolute", left: P(to, (i - 1.5) * 16)[0], top: P(to, -6 + (i % 2) * 8)[1], width: 16 + (i % 2) * 6, height: 14 + (i % 3) * 4, borderRadius: "40% 55% 45% 50%", background: "linear-gradient(135deg, #b9ab8f, #6e624f)", border: "1px solid #4d4434", animation: `sqxFall .45s ease-in ${i * 0.06}s both` }} />);
      els.push(<Sparks key="k" at={P(to, 0, 10)} n={8} seed={seed} colors={["#a8987a", "#d7ccb5"]} size={5} delay={t} dist={30} />);
      break;
    case "curse":
      for (let i = 0; i < 3; i++) els.push(<span key={`c${i}`} style={{ position: "absolute", left: P(to, (i - 1) * 16)[0], top: P(to, (i - 1) * 6)[1], width: 60, height: 50, borderRadius: "50%", background: `radial-gradient(circle, ${a.color}cc 0%, ${a.color}55 50%, transparent 72%)`, filter: "blur(2px)", animation: `sqxFog .8s ease-out ${i * 0.08}s both` }} />);
      els.push(<Sparks key="k" at={to} n={7} seed={seed} colors={[a.color, "#e2d3ff"]} size={4} delay={0.15} dist={30} />);
      break;
    case "gust":
      els.push(<svg key="g" viewBox="0 0 100 100" style={{ position: "absolute", left: `calc(${to[0]} - 46px)`, top: `calc(${to[1]} - 46px)`, width: 92, height: 92, overflow: "visible" }}>
        {[0, 1, 2].map((i) => <path key={i} d={`M95 ${20 + i * 25}Q50 ${0 + i * 25} 5 ${30 + i * 22}`} stroke={a.color} strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray="140" style={{ "--len": 140, animation: `sqxDash .32s ease-out ${i * 0.05}s both`, filter: "drop-shadow(0 0 4px #9fd2ff)" }} />)}
      </svg>);
      break;
    default: break;
  }
  // 大技（会心）のときは、当たった所へ集中線
  if (big && fx.side === "hero") els.push(<span key="ln" style={{ position: "absolute", left: to[0], top: to[1], width: 520, height: 520, marginLeft: -260, marginTop: -260, borderRadius: "50%", background: "repeating-conic-gradient(rgba(255,255,255,0.75) 0 2deg, transparent 2deg 9deg)", WebkitMaskImage: "radial-gradient(circle, transparent 18%, #000 30%, transparent 70%)", maskImage: "radial-gradient(circle, transparent 18%, #000 30%, transparent 70%)", animation: `sqxLines .45s ease-out ${t}s both` }} />);
  return <div style={box} aria-hidden="true">{els}</div>;
}

// 技の名前（左上に流れる帯）
export function SkillBanner({ fx, gold = "#d6b56a", top = 32 }) {
  if (!fx || !fx.atk) return null;
  const hero = fx.side === "hero";
  return (
    <div key={`bn${fx.n}`} className="jp" style={{ position: "absolute", left: hero ? 8 : "auto", right: hero ? "auto" : 8, top, padding: "2px 10px", borderRadius: 4, fontSize: fx.crit ? 13 : 11, fontWeight: 800, letterSpacing: "0.06em", color: "#fdfbf5", background: hero ? (fx.crit ? "linear-gradient(90deg, #a8833a, #d6b56a)" : "rgba(34,51,92,0.85)") : "rgba(140,40,40,0.85)", border: `1px solid ${hero ? gold : "#e0948a"}`, boxShadow: "0 2px 6px rgba(0,0,0,0.25)", animation: "sqxBanner 1s ease-out both", pointerEvents: "none", whiteSpace: "nowrap", zIndex: 3 }}>
      {hero ? "▶ " : "◀ "}{fx.atk.name}
    </div>
  );
}

// 漂う光の粒（地域ごと）：炎の粉・雪・木の葉・星くず・魔力の粒
const AMBIENT = {
  "調査士法の砦": { c: ["#ffb35c", "#ff7a2f"], dir: "up" }, "書式の迷宮": { c: ["#ff9b8a", "#ffd36b"], dir: "up" },
  "区分所有の双子塔": { c: ["#ffffff", "#cfe9ff"], dir: "down" }, "民法の古の森": { c: ["#9fd87f", "#d8f0b0"], dir: "down" },
  "測量の星見台": { c: ["#fff3a8", "#bfe3ff"], dir: "up" }, "不動産登記法の王都": { c: ["#fff1b8", "#ffffff"], dir: "up" },
};
export function Ambient({ region, kind, n = 12, seed = 7 }) {
  const cfg = AMBIENT[region] || (kind === "fire" ? AMBIENT["調査士法の砦"] : kind === "dark" ? { c: ["#c9a6ff", "#8a5cd8"], dir: "up" } : { c: ["#ffffff", "#e8eefc"], dir: "up" });
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {Array.from({ length: n }, (_, i) => {
        const c = cfg.c[i % cfg.c.length], s = 2 + Math.round(rnd(seed, i) * 3), dur = 3.5 + rnd(seed, i + 9) * 3.5, del = -rnd(seed, i + 19) * 6;
        return <span key={i} style={{ position: "absolute", left: `${Math.round(rnd(seed, i + 29) * 100)}%`, [cfg.dir === "up" ? "bottom" : "top"]: `${Math.round(rnd(seed, i + 39) * 30)}%`, width: s, height: s, borderRadius: "50%", background: c, boxShadow: `0 0 ${s * 2}px ${c}`, "--dx": `${Math.round((rnd(seed, i + 49) - 0.5) * 40)}px`, "--o": 0.55 + rnd(seed, i + 59) * 0.4, animation: `${cfg.dir === "up" ? "sqxUp" : "sqxDown"} ${dur}s linear ${del}s infinite` }} />;
      })}
    </div>
  );
}
