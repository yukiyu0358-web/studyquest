// ============================================================
// 2027年 土地家屋調査士 合格ロードマップ（2026年10月20日に作成）
// ネットで調べた合格者の進め方と試験日程をもとにした、約1,000時間・5つの時期の計画。
// 目標の周回数は利用者が画面で書きかえられる（state.roadmap.edits に保存。ここの target は最初の値）
//
// 根拠（sources）：
// ・合計の勉強時間は約1,000時間が目安（1日3時間で約1年）。午後の部の対策が大半
// ・進め方は「不動産登記法を中心に択一 → 計算 → 申請書のひな形 → 記述式の過去問 → 答練・模試 → 本番形式の通し」の順に重ねる
// ・周回数の実例：択一の過去問は4〜8周、記述式の過去問は最低5周、申請書のひな形は「ノーミスで3回続けて書けるまで」
// ・時間配分の例：択一20〜40分・建物40〜50分・土地50〜60分・見直し10〜20分（計150分）
// ・試験日程（令和8年度の例）：受験申請 7/27〜8/7、筆記 10/18（日）、筆記の合格発表 1/6、口述 1/21、最終合格発表 2/15
//
// task.kind（進み具合の数え方。数え方は App.jsx の roadmapProgress）
//   banks    … 問題集を1周した日（clearHistory）を数える。regions の地域の問題集、または利用者が選んだフォルダ
//   tataki   … 申請書の叩き込みの周回（rpg.kjDeck.lap.at）
//   dojo     … 記述式の道場の年度ごとの答案（rpg.kijutsu.res[年度].hist）。dojo：land／bldg
//   pastcalc … 本試験の計算の周回（rpg.calc2.past.lapsAt）
//   calcfix  … 計算の問題集の周回（rpg.calc2.fixed.lapsAt）
//   rehearsal… 本番リハーサルの回数（rpg.rehearsal.log）
//   mocks    … 模試・答練の記録の回数（rpg.mocks）
//   manual   … 自分で数える（＋1・−1）
// ============================================================

const TAKUITSU_ALL = ["不動産登記法の王都", "民法の古の森", "区分所有の双子塔", "調査士法の砦"];

export const ROADMAP_2027 = {
  id: "chosashi-2027",
  title: "2027年 土地家屋調査士 合格ロードマップ",
  qualRe: /土地家屋調査士|調査士/,
  exam: "2027-10-17",
  examNote: "令和9年度の筆記試験は、例年どおりなら10月の第3日曜日（令和8年度は10月18日）。7月ごろの受験案内（法務省）で確定したら、手帳の資格の試験日を直してください。",
  hoursGoal: 1000,
  milestones: [
    { d: "2027-07-01", label: "受験案内の公示（7月ごろ）" },
    { d: "2027-07-26", label: "受験申請（7月下旬〜8月上旬の見込み）" },
    { d: "2027-10-17", label: "筆記試験（予定）" },
    { d: "2028-01-07", label: "筆記の合格発表（1月上旬の見込み）" },
    { d: "2028-01-21", label: "口述試験（1月下旬の見込み）" },
    { d: "2028-02-15", label: "最終合格発表（2月中旬の見込み）" },
  ],
  phases: [
    {
      id: "p1", name: "第1期　土台づくり", from: "2026-10-20", to: "2026-12-31", week: 18,
      goal: "不動産登記法（表示に関する登記）を中心に、択一の問題集を周回する。申請書の叩き込みを毎日少しずつ。関数電卓の基本操作（方向角・距離・座標・面積）に慣れる。",
      why: "択一20問のうち16問は不動産登記法で、記述式に要る知識もほとんどが不動産登記法。まずここを固めるのが、合格者に共通する順番です。",
      tasks: [
        { id: "p1-takuitsu", label: "択一の問題集（不動産登記法）", kind: "banks", regions: ["不動産登記法の王都"], target: 2 },
        { id: "p1-tataki", label: "申請書の叩き込み", kind: "tataki", target: 1 },
        { id: "p1-calc", label: "計算の問題集（計算の部屋）", kind: "calcfix", target: 1 },
        { id: "p1-sanko", label: "参考書道場（不動産登記法）を読んで覚える", kind: "manual", target: 1 },
      ],
    },
    {
      id: "p2", name: "第2期　基礎固め", from: "2027-01-01", to: "2027-03-31", week: 20,
      goal: "択一は民法・調査士法・区分所有法まで広げて周回する。記述式の道場で、本試験40年分の答案を時間を気にせず1周。本試験の計算（土地・建物）も1周。",
      why: "択一の知識がないと記述式は解けません。択一を回しながら、記述式・計算を1周目から重ねていきます。",
      tasks: [
        { id: "p2-takuitsu", label: "択一の問題集（全科目）", kind: "banks", regions: TAKUITSU_ALL, target: 2 },
        { id: "p2-tataki", label: "申請書の叩き込み", kind: "tataki", target: 2 },
        { id: "p2-dojo-land", label: "記述式の道場（土地20年）", kind: "dojo", dojo: "land", target: 1 },
        { id: "p2-dojo-bldg", label: "記述式の道場（建物20年）", kind: "dojo", dojo: "bldg", target: 1 },
        { id: "p2-past", label: "本試験の計算（土地20年・建物20年）", kind: "pastcalc", target: 1 },
      ],
    },
    {
      id: "p3", name: "第3期　記述式の実戦", from: "2027-04-01", to: "2027-06-30", week: 22,
      goal: "記述式は時間を計って2周（土地60分・建物50分が目安）。択一はまちがえた肢を中心に1周し、20問を40分以内に。月に1回は本番形式（150分）で通す。",
      why: "記述式の過去問は「最低5周」がよく言われる目安です。ここから時間を計り、本番と同じ150分で通して弱点を見つけます。",
      tasks: [
        { id: "p3-dojo-land", label: "記述式の道場（土地20年）", kind: "dojo", dojo: "land", target: 2 },
        { id: "p3-dojo-bldg", label: "記述式の道場（建物20年）", kind: "dojo", dojo: "bldg", target: 2 },
        { id: "p3-takuitsu", label: "択一の問題集（全科目）", kind: "banks", regions: TAKUITSU_ALL, target: 1 },
        { id: "p3-past", label: "本試験の計算（土地20年・建物20年）", kind: "pastcalc", target: 1 },
        { id: "p3-tataki", label: "申請書の叩き込み", kind: "tataki", target: 2 },
        { id: "p3-rehearsal", label: "本番リハーサル（150分）", kind: "rehearsal", target: 3 },
      ],
    },
    {
      id: "p4", name: "第4期　答練・弱点つぶし", from: "2027-07-01", to: "2027-08-31", week: 22,
      goal: "受験申請を忘れずに（7月下旬〜8月上旬の見込み）。予備校の答練・公開模試で本番の形に慣れる。本番リハーサルを週1回。択一は20問を30分以内に。",
      why: "合格者は、過去問がある程度回った段階で答練・模試を受け、解けなかった分野を重点的に復習しています。",
      tasks: [
        { id: "p4-dojo-land", label: "記述式の道場（土地20年）", kind: "dojo", dojo: "land", target: 1 },
        { id: "p4-dojo-bldg", label: "記述式の道場（建物20年）", kind: "dojo", dojo: "bldg", target: 1 },
        { id: "p4-takuitsu", label: "択一の問題集（全科目）", kind: "banks", regions: TAKUITSU_ALL, target: 1 },
        { id: "p4-tataki", label: "申請書の叩き込み", kind: "tataki", target: 1 },
        { id: "p4-rehearsal", label: "本番リハーサル（150分）", kind: "rehearsal", target: 6 },
        { id: "p4-mocks", label: "答練・公開模試（周回の部屋の「模試・答練の記録」）", kind: "mocks", target: 2 },
      ],
    },
    {
      id: "p5", name: "第5期　直前・仕上げ", from: "2027-09-01", to: "2027-10-16", week: 25,
      goal: "本番リハーサルを週2回。記述式は5周目まで（ここで合計5周）。まちがえた肢と叩き込みの総復習。試験2週間前からは新しい教材に手を出さず、当日の確認カードと法改正を確かめる。",
      why: "直前期は新しいことより、時間配分（択一20〜40分・建物40〜50分・土地50〜60分・見直し10〜20分）と、自分のミスを確かめる項目を固めます。",
      tasks: [
        { id: "p5-dojo-land", label: "記述式の道場（土地20年）", kind: "dojo", dojo: "land", target: 1 },
        { id: "p5-dojo-bldg", label: "記述式の道場（建物20年）", kind: "dojo", dojo: "bldg", target: 1 },
        { id: "p5-takuitsu", label: "択一の問題集（全科目）", kind: "banks", regions: TAKUITSU_ALL, target: 1 },
        { id: "p5-tataki", label: "申請書の叩き込み", kind: "tataki", target: 1 },
        { id: "p5-rehearsal", label: "本番リハーサル（150分）", kind: "rehearsal", target: 8 },
        { id: "p5-mocks", label: "直前予想模試", kind: "mocks", target: 1 },
        { id: "p5-hayami", label: "当日の確認カードと法改正の見直し", kind: "manual", target: 2 },
      ],
    },
  ],
  sources: [
    { label: "千葉地方法務局：令和8年度 土地家屋調査士試験の受験申請", url: "https://houmukyoku.moj.go.jp/chiba/page000356_00004.html" },
    { label: "アガルート：土地家屋調査士試験の日程", url: "https://www.agaroot.jp/chousashi/column/exam/" },
    { label: "合格者の振り返り（約1,000時間・択一4〜8周・記述4周）", url: "https://note.com/kind_hyssop863/n/n97ad517411d3" },
    { label: "清川事務所：勉強時間と勉強方法（記述式の過去問は最低5周）", url: "https://kiyokawa-office.com/how-to-study-for-exam" },
    { label: "アガルート：合格者の声（択一→計算→申請書→記述の順）", url: "https://www.agaroot.jp/chousashi/column/r07-84/" },
    { label: "アガルート：試験の時間配分", url: "https://www.agaroot.jp/chousashi/column/exam-time-allocation/" },
  ],
};
