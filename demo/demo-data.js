// ============ デモモード用の架空データ（見た目の確認専用） ============
const pad = (n) => String(n).padStart(2, "0");
const day = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); return d; };
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const code = (d) => `${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

export const DEMO_USER = { uid: "demo-user", email: "demo@example.com", displayName: "デモ" };

const QA = [
  ["表題部所有者の氏名の変更の登記は、表題部所有者以外の者も申請できる。", "×　表題部所有者が申請する（不登法31条）。"],
  ["地目の変更があったときは、1月以内に登記を申請しなければならない。", "○　不登法37条1項。"],
  ["建物の床面積は、各階ごとに壁その他の区画の中心線で囲まれた部分の水平投影面積により算出する。", "○　不登規則115条。"],
  ["分筆の登記は、所有権の登記名義人以外の者も申請できる。", "×　表題部所有者又は所有権の登記名義人に限る（不登法39条1項）。"],
  ["区分建物の表題登記は、原始取得者が申請する。", "○　不登法47条1項。"],
  ["筆界特定の申請は、筆界特定登記官に対してする。", "○　不登法131条。"],
  ["合筆の登記は、地目が相互に異なる土地についてもすることができる。", "×　不登法41条2号。"],
  ["建物の滅失の登記は、滅失の日から1月以内に申請する。", "○　不登法57条。"],
  ["地積の更正の登記は、登記官が職権ですることはできない。", "×　職権でもできる（不登法28条）。"],
  ["土地の表題登記を申請する場合、地積測量図を添付する。", "○　不登令別表4。"],
  ["附属建物の新築による建物の表題部の変更の登記は、1月以内に申請する。", "○　不登法51条1項。"],
  ["共用部分である旨の登記は、所有者以外の者も申請できる。", "×　所有者が申請する（不登法58条2項）。"],
];

function makeQuestions(prefix, offset) {
  return QA.map(([q, a], i) => {
    const k = (i + offset) % 6;
    const ah = k === 0 ? [] : [`${code(day(-7))}${k % 2 ? "s" : "w"}`, `${code(day(-2))}${k % 3 ? "s" : "u"}`, ...(i % 4 === 0 ? [`${code(day(0))}s`] : [])];
    return {
      id: `${prefix}-${i}`, q, a,
      correct: k, wrong: (i + offset) % 3, marked: i % 5 === 0, excluded: false, memo: i === 1 ? "期限は1月以内" : "", clozes: [],
      lastConf: k === 0 ? null : k % 3 === 0 ? "unsure" : "sure",
      ah,
      ...(k === 0 ? {} : { sr_nextReview: ymd(day(i % 3 === 0 ? 0 : 3)), sr_interval: 3, sr_streak: k % 3 }),
    };
  });
}

export const DEMO_BANKS = [
  { id: "bank-r6", name: "不動産登記法 過去問", year: "R6", qualId: "q-chousashi", order: 0, clears: 2, clearHistory: [{ date: ymd(day(-30)), accuracy: 62 }, { date: ymd(day(-10)), accuracy: 75 }], questions: makeQuestions("r6", 0) },
  { id: "bank-r5", name: "民法 過去問", year: "R5", qualId: "q-chousashi", order: 1, clears: 1, clearHistory: [{ date: ymd(day(-20)), accuracy: 58 }], questions: makeQuestions("r5", 3) },
  { id: "bank-sokuryo", name: "測量士 午前 R6", year: "R6", qualId: "q-sokuryo", order: 0, clears: 0, clearHistory: [], questions: makeQuestions("sk", 1).slice(0, 6) },
];

export const DEMO_STATE = {
  player: { level: 14, xp: 420, totalCompleted: 38, totalQaAnswered: 860, achievements: [], mainTitleId: null, seededProfile: true, bestQaStreak: 24 },
  qualifications: [
    { id: "q-chousashi", name: "土地家屋調査士", examDate: "2027-10-17", targetHours: 1000, color: "#4f8eb3", acquired: false },
    { id: "q-sokuryo", name: "測量士", examDate: "", targetHours: 0, color: "#6d8454", acquired: false },
  ],
  tasks: [{ id: "t1", name: "書式の練習 1問", difficulty: "normal", qualId: "q-chousashi" }],
  taskPresets: [], taskClears: {},
  studyLog: [-6, -5, -4, -2, -1, 0].map((o, i) => ({ id: `l${i}`, date: ymd(day(o)), qualId: "q-chousashi", minutes: 40 + i * 12, source: "timer" })),
  questionBanks: [],
  folders: [{ id: "f1", name: "不動産登記法" }],
  studyNotes: [{ id: "n1", folderId: "f1", title: "申請期限のまとめ", content: "表題登記・変更登記：1月以内\n滅失の登記：1月以内", createdAt: ymd(day(-3)), updatedAt: ymd(day(-1)) }],
  sessionResume: null,
  timer: { qualId: null, startMs: null, autoMode: null },
  displaySettings: { theme: "white", showTitle: false },
  rpg: {
    gold: 1250, bossWins: 5,
    inventory: [{ u: "u1", i: "w-divine" }, { u: "u2", i: "a-border" }, { u: "u3", i: "x-glasses" }, { u: "u4", i: "w-holy" }, { u: "u5", i: "a-immovable" }, { u: "u6", i: "x-charm" }, { u: "u7", i: "x-level" }, { u: "u8", i: "w-chain" }],
    equipped: { weapon: "u1", armor: "u2", accessory: "u3" },
    consumables: { potion: 3, xpBook: 1, restTicket: 2 },
    materials: { "m-chiban": 14, "m-keiyaku": 6, "m-zahyo": 3, "m-star": 2, "m-sage": 1 },
    skills: ["a1", "b1"],
  },
};
