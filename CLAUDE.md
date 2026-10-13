# Study Quest — 開発の引き継ぎメモ（Claude Code用）

RPG風の資格学習Webアプリ。利用者本人（Yuki）が、土地家屋調査士・測量士・技術士補などの学習に毎日使っている個人用アプリ。
問題は約3,950問。PC（Windows 2台）・iPad・iPhoneからFirebaseで同期して使っている。

- 公開URL：https://yukiyu0358-web.github.io/studyquest/
- リポジトリ：https://github.com/yukiyu0358-web/studyquest（main ブランチ）

## 作業の進め方（最重要）

- 利用者はプログラミング初心者。説明は**日本語**で、専門用語はかみ砕き、手順は**1ステップずつ**、PowerShellのコマンドは**1行ずつ**示す。
- 変更の前に「何を・なぜ変えるか」を短く説明する。大きな変更（構成の変更・データ構造の変更）は先に確認を取る。
- **既存の機能を壊さないことが最優先。** 変更後は必ず `npm.cmd run build` が通ることを確認し、利用者に `npm.cmd run dev` での試運転を案内する。
- `git push`・`npm.cmd run deploy`（公開）・データの削除や移行は、実行前に必ず確認を取る。
- 見た目の変更は、どこがどう変わるかを具体的に伝える。

## 作業環境

- Windows PC 2台で作業している。作業フォルダはどちらも `C:\Users\<ユーザー名>\studyquest-vite`（`cd ~\studyquest-vite`）。
- **作業を始めるときは必ず `git pull`**（もう一方のPCでの更新を取り込むため）。
- **OneDriveの中に作業フォルダを置かない。** 以前、OneDrive内で node_modules が壊れ esbuild が止まった。
- PowerShellの実行ポリシーの関係で、`npm` ではなく **`npm.cmd`** を使う。
- Node.js v24〜v25、Git for Windows 導入済み。

## コマンド

| 目的 | コマンド |
|---|---|
| 試運転 | `npm.cmd run dev` → http://localhost:5173/studyquest/ |
| ビルド | `npm.cmd run build` |
| 公開 | `npm.cmd run deploy`（`gh-pages -d dist`。dist を gh-pages ブランチへ送る） |
| 条文データ更新 | `node scripts/fetch-laws.mjs`（法改正時。public/laws/*.json を作り直す） |
| デモ（見た目の確認用） | `npm.cmd run demo` → http://localhost:5174/studyquest/（ログイン不要・架空データ・クラウドに一切つながない）。アイコン見本帳は /studyquest/demo/icons.html |

- デモモードは `demo/vite.demo.config.js` が `src/firebase.js` を `demo/firebase-mock.js` に差し替えて動かす。架空データは `demo/demo-data.js`。画面の確認はこれで行う（本番データに触れない）。

公開の流れ：`git add -A` → `git commit -m "…"` → `git push` → `npm.cmd run build` → `npm.cmd run deploy`
- GitHub Pages の公開元は **gh-pages ブランチ**。`.github/workflows/deploy.yml` はあるが、Pagesの設定が「GitHub Actions」ではないため使われていない。
- `npm audit fix --force` は実行しない（部品が大きく入れ替わり動かなくなるおそれ）。
- 部品を追加したら、もう一方のPCでも `npm.cmd install` が必要なことを利用者に伝える。

## 技術構成

- React 18 + Vite 5（`vite.config.js` の `base: "/studyquest/"`）
- Firebase **compat版**（Auth + Firestore、`src/firebase.js`）。オフライン永続化あり。
- Firebase は **Spark（無料）プラン**。Cloud Storage は使えないため、画像は圧縮して Firestore に保存している。
- Tailwind は **ビルドに取り込み済み**（tailwindcss 3.4 + PostCSS。`tailwind.config.js` `postcss.config.js` `src/index.css`）。CSS変数とベースのスタイルは `index.html` の `<style>`。**見た目の指定（className）は組み立てずにそのまま書く**（`grid-cols-${n}` のような組み立ては拾われず効かない）。
- ビルドは部品ごとにファイルを分けている（`vite.config.js` の manualChunks：react・firebase・vendor・アプリ本体。通知の部品 firebase-messaging は申し込むときだけ読み込む）。
- PapaParse（CSV取込）、ts-fsrs（Ankiと同じFSRSアルゴリズム）。

## ファイル構成

- `src/App.jsx`：画面と機能の大部分（約1万行・約700KB）。500KB超のため Babel の "deoptimised the styling" という注意が出るが無害。少しずつ分割中。
- 分割済み：`src/game/icons.jsx`（Ico・線のアイコン・GameIcon とメダル絵）、`src/game/sfx.js`（効果音 SFX）、`src/game/calc.js`（計算ドリルの問題）、`src/game/cloze.js`（条文の穴埋めの問題）、`src/data/shinsei.js`（申請書の穴埋めの場面）、`src/game/textimport.js`（貼り付けた文章を一問一答に分ける）、`src/data/quotes.js`（名言 STUDY_QUOTES）、`src/data/story.js`（会話 STORY_TALKS・REGION_TALK）。App.jsx の先頭で import している。
- **分割したら必ず `node scripts/check-names.mjs` で点検する**（定義も import もされていない名前を探す。ビルドでは見つからず、使っている途中にエラーになるため）。
- `src/firebase.js`：Firebase初期化。`src/main.jsx`：起動。
- `public/hero.jpg`：クラシックテーマの立ち絵（少年）。`public/sprites/tier1〜6.png`：ドット絵の主人公（以前は App.jsx に埋め込み）。
- `public/white-title.jpg`／`public/white-hero.jpg`：白金テーマのタイトル・背景の絵と、メニューの立ち絵（白髪の少女）。`public/white-hero-s1〜s5.jpg` を置くと、Lv10/20/30/40/50 の姿の立ち絵に自動で切り替わる（無ければ前の姿→基本の絵）。
- `public/art/`：描きおろしの絵（元の大きな絵は利用者の「イラスト」フォルダ。アプリ用に縮小済み）。`title-wide.jpg`（PCのタイトル・背景）`title-tall.jpg`（スマホのタイトル）`scene.jpg`（会話・ログインボーナスの背景）`forge.jpg`（鍛冶場・ショップ）`party.jpg`（仲間の欄）`ally-registrar/surveyor/explorer.jpg`（仲間の立ち絵）。2026年10月13日の追加：`hero-sky.jpg`（天空の主人公の立ち絵）`hero-face-normal/smile/surprise/serious.jpg`（主人公の表情）`ally-kaito/serena/raven.jpg`（魔法学院の三人の立ち絵。設定画から切り出し、説明の文字は背景色でならした）`trio.jpg`（三人の看板）`academy.jpg`（試練の塔の見出し）`book-tools.jpg`（冒険の記録書の表紙）。`art/items/a01〜a16・b01〜b10.png`：道具の絵（白背景を透明にして切り出し）。装備・道具との対応は icons.jsx の `PAINTED_BY_ID` `PAINTED_BY_CH`
- `public/laws/*.json`：条文データ（不動産登記法・令・規則、民法、区分所有法、土地家屋調査士法）。
- `scripts/fetch-laws.mjs`：e-Gov法令API v2 から条文を取得するスクリプト。

## データ構造（Firestore）

- `userdata/{uid}`：`{ state: <問題集以外の全データ>, updatedAt }`
- `userdata/{uid}/questionbanks/{bankId}`：問題集ごと（問題の配列を含む。**1ドキュメント1MBの上限**に注意）
- `userdata/{uid}/sessions/current`：学習の途中再開データ
- `userdata/{uid}/images/{imageId}`：問題に付けた画像（圧縮した dataURL）
- `userdata/{uid}/reviewlogs/{YYYY-MM-DD}`：FSRSの回答履歴（arrayUnion で追記）
- セキュリティルール：`match /userdata/{userId}/{document=**}` で本人のみ読み書き可。サブコレクションを増やしてもこれでカバーされる。

state の主なキー：`player` / `qualifications` / `tasks` / `studyLog` / `folders` / `studyNotes` / `sessionResume` / `timer` / `srSettings` / `displaySettings`（qFont, qSize, theme, showTitle, themeV, battle, sfx）/ `rpg`（gold, inventory, equipped, consumables, bossWins, classId, pet, seen, materials, skills, forgeLog など）

問題の主なフィールド：`q` `a` `correct` `wrong` `marked` `excluded` `memo` `clozes` / 確信度 `lastConf` `unsureCnt` `cwCnt` `errTypes` / 回答日 `ah`（`YYMMDD`＋s/u/w、直近20件）/ FSRS `fs{s,d,st,r,l,lr}` `sr_nextReview`（ローカル日付 YYYY-MM-DD）`sr_interval` `sr_streak` / 画像 `images[{id, side}]`
問題集：`clears` `clearHistory[{date, accuracy}]` `qualId` `folderId` `year` `order`

## 主な機能と関連する名前（App.jsx内）

- 確信度・間違いの種類：`AnswerPanel` `applyAnswerMeta` `ERROR_TYPES` `isQuestionWeak`
- FSRS（Anki方式）：`scheduleAnswer` `toFsrsCard` `getFsrsScheduler` `SR_DEFAULTS`（記憶率0.9・最大365日、fuzz・short_term は無効）
- 今日の復習：`TodayTab` `getTodayReviewItems`
- 問題の画像：`QuestionImages` `compressImageFile`（長辺1400px・700KB以下）
- 条文の表示・検索：`LAWS` `extractLawRefs` `LawArticleModal` `LawSearchPanel` `LawRefChips`
- 苦手問題の書き出し：`WeakExportPanel`／周回の記録：`LapRecordsPanel` `AnswerHistory`
- 冒険（RPG）：`AdventureTab` `BossBattle` `RPG_ITEMS` `getRpgBonuses` `RPG_ACHIEVEMENTS`、EXP付与 `awardXp`（会心・ゴールド・ドロップ）
- 育成：`GrowthPanels` `getClassInfo` `getPetInfo` `getAwakening` `HeroPortrait` `RPG_SCENES`
- ホームの吹き出し（名言）：`STUDY_QUOTES` `mentorStatusLines` `MentorBubble`
- アイコン：`Ico`＋`LINE_ICONS`（白金テーマは線のアイコン）、`GameIcon`＋`GAME_ART`（装備・道具・タスク・ボスのメダル絵。CSS の .ico-emoji / .ico-line で切り替え）
- バトル演出：`BattleStage`（問題の上に魔物。`AnswerPanel` が `emitBattle` で結果を送る）`BattleResult` `MONSTER_SPECIES` `MON_THEMES`（問題集名→科目の色・素材）`SFX`（効果音・既定オフ）`BATTLE`（1セットのHP・コンボ）。設定 `displaySettings.battle` `displaySettings.sfx`
- 育成：素材 `RPG_MATERIALS`（戦利品は `emitReward`→StudyRPG が記録）、スキル `SKILL_TREE`（SP＝レベル−1）、鍛冶 `forgeCost` `forgedFx` `rpgInvItem`（持ち物 `{u,i,p}` の p が強化段階）。`SkillPanel` `ForgePanel`。rpg に `materials` `skills` `forgeLog` を追加
- 進化：`HERO_STAGES`（Lv1/10/20/30/40/50 の6つの姿。額縁・紋章・翼・星）`heroStage` `HeroDecor` `EvolutionScene`（全画面の進化演出。`showEvolution` で出す：主人公の段階変化・覚醒★・相棒）`EvolutionRoad`
- モンスター図鑑：`MonsterDex` `dexStatus`（0未発見 1発見 2討伐 3制覇＝fs.s≥21）
- 世界と物語（冒険の「世界」タブ）：合格力 `passPower`（FSRSの想起率の平均・未学習は0。`PASS_LINE` 0.85／`BASE_LINE` 0.75）`mainQual` `FinalBoss` `WorldMap`（`MON_THEMES.region`）`STORY_CHAPTERS` `StoryPanel`（章が開くと `showEvolution`）。デイリークエスト `DAILY_QUESTS` `DailyQuests` `dailyOf`（rpg.daily に日ごとの記録。BattleStage の `emitReward` の stat で数える）`claimQuest` `claimChest`
- 週替わりボス：`weeklyBossFor`（合格力が最も低い地域）`WeeklyBossCard` `buildPoolFromBanks`、BossBattle の `boss.weekly` で `weeklyFinish`（rpg.weekly）。模試の塔：`DungeonCard` `DungeonRun` `dungeonFinish`（rpg.dungeon.best）
- 魔王城への道（世界タブを「魔王城への道／クエスト／魔王城」に分割）：科目の判定は `themeOf`（フォルダ名＋問題集名。`syncFolderIndex` で対応表を更新）。地域の守護者 `REGION_INFO` `regionStatus`（霧・探索中・挑戦可・解放）`guardianFinish`（rpg.regions、紋章の効果は getRpgBonuses）。会話 `STORY_TALKS` `REGION_TALK` `StoryTalk`（`showEvolution` の afterTalk で続けて出す）。魔王城 `CASTLE_FLOORS` `CastleCard` `castleClimb`（rpg.castle.floor）。旅路 `journeyEvent` `JourneyCard`（rpg.journey、戦利品の記録で進む）。カテゴリ討伐 `CAT_TIERS` `CategoryQuests` `claimCat`（rpg.cats）
- ストーリークエスト（世界タブの「ストーリー」）：問題集を出題順に区切って1話に（第1・2話10問、第3・4話12問、以降15問。`chunkBank` `SQ_SIZES` `regionQuests`）。題名は最も多く出る条文の見出し（`questTopic` `questTitle`、条文データを読み込む）。六角形の地図 `hexSpiral` `StoryQuestView`、1話の戦い `QuestRun`（最後の1問は BattleStage の boss）、結果 `storyQuestFinish`（rpg.sq[`${問題集id}:${話}`]＝{stars,best,clears}、地域の全話クリアで地図完成）。ホームは `HomeDashboard`（今日の道しるべ：復習・ストーリーのつづき `storyNextInfo`・最終決戦＋今日の記録）と今日のクエストを2列に。称号／ジョブはステータス画面へ移動、「ここ1週間」は削除。問題集の問題を並べ替え・追加すると話の区切りがずれる点に注意
- 合格力の推移と週報：`PowerChart`（rpg.powerLog に1日1件）`weeklyReport`（週はじめに会話で。rpg.reportWeek）。会話は `talkQ` で順番待ち
- 論点カルテ `topicKarte` `TopicKarte`（記憶率の低い話トップ5、集中攻撃）。書式の鍛錬場 `ShoshikiDojo`（rpg.shoshiki）。逆算プラン `examPlan` `newTodayCount`（ホームの今日の目標）
- ログインボーナス `LoginBonus` `claimLogin`（rpg.login）。季節のイベント `SEASON_EVENTS` `activeEvents`（ボーナスは getRpgBonuses に加算）
- 仲間 `ALLIES`（リーネ・カイ・ミラ。地域を1つ・2つ・3つ解放で加入、`alliesJoined`）`PartyCard`。会話の話し手に仲間の id を使える（まだ加入していない仲間のせりふは飛ばす）。演出・会話・ログインボーナスはタイトル画面の間は出さない（`showTitleNow`）
- 試練の塔（世界タブ「試練の塔」）：100階。1階10問（第1階は新10問、以降は新8問＋下の階から2問）、10の倍数の階は「試練の間」＝直前9階から15問の総復習。80%で突破（`TOWER_PASS`）。問題の並びは `towerSeq`（科目を比例で交互に）、出題 `towerFloorPool`、弱さ `weaknessOf`。画面 `TowerView`、戦い `TrialRun`（汎用：一定の正答率で突破）、結果 `towerFinish`（rpg.tower={floor,best}）
- ストーリーの強化：節の守護者（問題集の全話クリアで出現、15問・80%、`secBossFinish`、rpg.secBoss）。地域の制覇＝全話＋全節の守護者＋地域の守護者（`regionConquest`、rpg.conquered、StudyRPG の効果で祝う）。不動産登記法・民法・調査士法の3つで特別章（`TRINITY_REGIONS` `TRINITY_TALK`、rpg.conquered.__trinity）。科目ごとの物語 `REGION_ARC` `regionArc`（intro・sec・finale。src/data/story.js）、地域に初めて入ると intro（rpg.arcSeen）
- 下のタブは6つ（ホーム・今日・問題・冒険・ステータス・手帳）。「手帳」はタスク・時間・メモ・資格をまとめたもので、中の切り替えは `NOTE_TABS`（最後に開いたものを `lastNoteTab` で覚える）。学習カレンダーはステータスから外した（`StudyCalendar` 自体は残っている）
- ホームのキャラクター：`HOME_CHARS`（主人公・リーネ・カイ・ミラ・少年）`homeCharOf`、設定 `displaySettings.homeChar`。face は顔アイコンの切り抜き位置（背景サイズ300%のときの%）
- 周回スタンプの演出：問題集を最後まで解く（`incrementBankClears`）と `LapStampScene`（印が押される演出。5周ごとに金の印、効果音 `stamp`）
- iPhone での見切れ対策：index.html の `.grid > * { min-width: 0; }`（横並びの枠が中の長い文字で広がらないように）
- 世界タブは「ストーリー・試練の塔・鍛錬・地図と仲間・クエスト・魔王城」の6つ。「鍛錬」に本番リハーサル・計算ドリル・条文の穴埋め・書式の鍛錬場を置く
- 計算ドリル：問題づくりは `src/game/calc.js`（`CALC_TYPES` `makeCalcProblem` `checkCalc`。距離・方向角・放射・座標法の面積・交点。X＝北、方向角は北から右回り）。画面 `CalcDrill` `CalcFigure`、記録 `logDrill`（rpg.drill）
- 本番リハーサル：`RehearsalCard` `RehearsalRun`（択一20問＋記述の自己採点、2時間30分）、`rehearsalFinish`（rpg.rehearsal.log）。判定の線 `REHEARSAL_DEFAULT`（令和6年度の目安：択一37.5・記述31.5・合格78）は設定で変更可（rpg.rehearsal.cfg）
- 条文の穴埋め：問題づくりは `src/game/cloze.js`（`makeCloze`。期間・数・結びの言い回し・用語 `TERM_GROUPS` を空欄にし、同じ仲間の言葉から選択肢）。画面 `LawCloze`、出題 `pickClozeSet`（問題によく出る条文 `lawRefCounts`／まちがえた条文／すべて）、記録 `logCloze`（rpg.cloze = {log, miss}）
- 復習の予報：今日タブの `ReviewForecast` `reviewForecast`（14日分の sr_nextReview を数える）
- 影の受験生：`rivalStatus` `rivalPowerAt` `RivalCard` `RivalTrack`（試験日にちょうど合格力85%に届く速さのライバル。rpg.rival = {exam, t0, p0, last}）。合格力の記録と同じ useEffect で、追い抜き・抜かれで会話 `RIVAL_TALK`。会話の話し手 "shadow"（`SHADOW_FILTER`）
- 仲間との絆：`BOND_LV` `bondLevel` `bondFx` `addBond`（rpg.bonds・bondSeen）。仲間の得意分野 `ALLIES[].likes`（戦いの正解は emitReward の stat.region で数える）＋計算ドリル（カイ）・条文の穴埋め（リーネ／ミラ）・書式（ミラ）。物語は src/data/story.js の `BOND_TALKS`（学習中＝タイマー作動中は待つ）
- 試験日までのカウントダウン：src/data/story.js の `COUNTDOWN_TALKS`（100・50・30・14・7・3・1・0日、試験後）、rpg.countdown。演出が重なったら `evoQ` で順番待ち（前の演出と会話が終わってから出す）
- 申請書の穴埋め：場面は `src/data/shinsei.js`（`SHINSEI_CASES`：登記の目的・原因・申請の期限・添付情報。根拠は不動産登記法と令の別表。内容を変えるときは法令で確かめる）。画面 `ShinseiDrill`、記録 `logShinsei`（rpg.shinsei）
- 混同ペアの対比カード（今日タブ）：`confusionPairs`（errTypes.confusion のある問題と、同じ問題集・フォルダで文字の重なりが最も多い問題を組にする）`diffMarks`（違う文字に印）`ConfusionPairs`、整理済み `resolvePair`（rpg.pairsOk。その後また✕になると再び出る）
- 耳で聞く一問一答（今日タブ）：`ListenMode`（端末の speechSynthesis。問題→間→答え。回答は記録しない、☆で印だけ）`speechText`
- ホーム画面アプリ（PWA）：`public/manifest.webmanifest`、アイコン `public/icon-192.png` `icon-512.png` `icon-maskable-512.png` `apple-touch-icon.png`、保管係 `public/sw.js`（ページ本体はネット優先、そのほかは保管→裏で更新。他サイト＝Firebase には触れない）。登録は `src/main.jsx`（公開版のみ）。sw.js の中身を大きく変えたら `CACHE` の名前を変える
- 条文図鑑：`LawDex`（問題によく出る条文＝`lawRefCounts` を集める。穴埋めで `LAWDEX_NEED`＝3回正解で登録、rpg.cloze.got）。全部そろうと `claimLawDex`（称号と300G、rpg.cloze.dexDone）。穴埋めの出題に「図鑑のすき間」
- 月ごとのランク戦（クエストの欄）：`SEASON_RANKS` `seasonPoints`（ah の当月分＋学習時間。1回答1点・正解+1点・10分3点）`SeasonCard` `claimSeason`（rpg.season = {month, claimed, history}）。月が変わると合格力の記録の useEffect で先月の結果を残し、会話
- 冒険の記録書（ステータス画面の上）：`AdventureBook`（7ページ：表紙・学び・合格力・冒険・鍛錬・仲間・結び）`longestStudyStreak`
- ひっかけ言葉の印：`TRAP_MARK` `TRAP_RE` `markTraps` `renderQText`（問題文の表示はこれを使う）`trapMarkOn`（設定 displaySettings.trapMark：null＝自動［読み違い3回以上でオン］／true／false）
- 作図ドリル：問題づくりは `src/game/calc.js` の `makeSakuzuProblem` `SAKUZU_TYPES`（1m方眼・整数座標・右回り。土地の形／建物の位置）。画面 `SakuzuDrill`（点は近い目盛りに吸い付く）、記録 `logSakuzu`（rpg.sakuzu）
- 記憶の天気図（今日タブ）：`memoryWeather` `MemoryWeather` `WEATHER`（ストーリーの話ごとの記憶率の平均を天気で）
- 文章を貼り付けて問題を作る（問題タブ「CSV・写真から追加」→ ImportPanel の「文章を貼り付け」）：分け方は `src/game/textimport.js` の `parseQuickText`（自動／交互の行／1行に問題と答え）。写真の文字は iPhone のテキスト認識表示や Windows の Snipping Tool でコピーしてもらう想定
- 毎日のお知らせ（通知）：アプリ側は `PushSettings`（設定画面。端末ごとに userdata/{uid}/push/{端末id} = {token, enabled, hours}）、`src/firebase.js` の `getPushToken` `FCM_VAPID_KEY`（Firebase の Cloud Messaging の「ウェブプッシュ証明書」の公開鍵。空のあいだは通知の欄が「準備がまだ」）。表示は `public/sw.js` の push・notificationclick。送り手は `.github/workflows/notify.yml`（日本時間 7・12・20・22時ごろ）→ `scripts/notify/notify.mjs`（firebase-admin。鍵は GitHub の Secrets「FIREBASE_SERVICE_ACCOUNT」。鍵のファイルは .gitignore で除外）。Actions の「Run workflow」でためし送信
- 主人公の表情：`HERO_FACES`（通常・笑顔・驚き・真剣）。吹き出し `MentorBubble` の faces（ホームのキャラクターが expr: true のとき）と、会話 `StoryTalk` の主人公の顔（白金テーマ。せりふから `exprOfLine` で選ぶ）
- 魔法学院の三人（カイト・セレナ・レイヴン）：`ALLIES` に group: "academy"・`towerNeed`（試練の塔 第5・15・30階で出会う。`towerFinish` で出会いの会話 `ACADEMY_MEET`）。絆の物語は `BOND_TALKS` の kaito/serena/raven。`alliesJoined` は towerNeed があれば塔の階で判定。仲間の立ち絵のふちは `ALLY_MASK` でぼかす
- 試し表示：.claude/launch.json に demo（5174）と preview（公開版と同じビルドを 4173 で。本番の Firebase につながるのでログインはしない）
- テーマ：`DISPLAY_DEFAULTS`（既定は white）`THEME_PAL`（classic/white の配色）`CLASSIC_CSS` `WHITE_CSS` `ClassicThemeStyle` `TitleScreen` `ClassicInfoBar` `MenuHome`（クラシック）`SignpostHome`（白金・道しるべ）`migrateDisplay`

## テーマの仕組み

- テーマは **白金（white・既定）／クラシック（classic）／ドット（dot・旧デザイン）** の3つ。設定パネル（「Aa 文字」）で切り替え、端末にも `sq-theme` `sq-title` として保存。
- 色は `html[data-theme=...]` で **CSS変数（`--paper` `--ink` `--sky-deep` など）を差し替えて** 全画面をまとめて切り替えている。
- 新しい部品を作るときは、色を直接書かずに CSS変数を使う。テーマ専用の部品は `THEME_PAL` の配色を使う。明るい背景色（#fff など）の直書きは避ける。

## 過去の不具合から守っていること

- **初期化ガード（`cloudLoadFailed`）を外さない。** 2026年8月、クラウドの読み込みに失敗した状態で初期データが保存され、学習記録が初期化される事故があった。読み込み失敗中はクラウドへ保存しない。
- フック（useState / useEffect）は `StudyRPG` の `if (!loaded) return` より**前**に置く。
- 日付はローカル日付で扱う（`toISOString().slice(0,10)` は日本時間で1日ずれるため使わない）。

## これまでの主な経緯

2026年6月 ブラウザ内Babel → Vite に移行、GitHub Pages 公開／8月 Firestoreルール修正とデータ復元／10月 確信度・間違いの種類、問題の画像、FSRS、文字設定、周回・回答日の記録、条文表示・検索、苦手の書き出し、冒険（ボス戦・装備・ショップ・実績）、育成（クラス・相棒・背景・覚醒）、クラシックテーマ、白金テーマとタイトル画面。

## 今後の候補

- App.jsx のファイル分割（components/ などへ）
- 科目ごとのジョブレベル、知識の城、モンスター図鑑
- 白金テーマの主人公（少女）の進化段階の絵（冒険・ステータスの進化キャラは今は少年のドット絵）
- 弱点リストの「論点分析（AI）」は api.anthropic.com を直接呼ぶため GitHub Pages では動かない → 代替が必要
