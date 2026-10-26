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
- 分割済み：`src/game/kijutsu.js`（記述式の道場・本試験の計算のデータと部品）、`src/game/icons.jsx`（Ico・線のアイコン・GameIcon とメダル絵）、`src/game/sfx.js`（効果音 SFX）、`src/game/calc.js`（計算ドリルの問題）、`src/game/cloze.js`（条文の穴埋めの問題）、`src/data/shinsei.js`（申請書の穴埋めの場面）、`src/game/textimport.js`（貼り付けた文章を一問一答に分ける）、`src/data/quotes.js`（名言 STUDY_QUOTES）、`src/data/story.js`（会話 STORY_TALKS・REGION_TALK）。App.jsx の先頭で import している。
- 画面ごとの切り出し（2026年10月26日。アプリを軽くするため）：`src/parts/` に adventure（AdventureTab）・qbank（QBankTab）・laproom（LapRoom）・calc（CalcTab）・training（TrainingRoom）・today（TodayTab）・status（StatusTab）。App.jsx では `lazyPart(() => import(./parts/○○.jsx), 名前)` で、画面を開いたときに読み込む（Suspense の「読み込み中…」。公開のあと古いファイルが見つからないときは1回だけ読み直す＝sessionStorage の sq-part-reload）。切り出したファイルは App.jsx の import をそのまま写し（パスだけ ../）、App.jsx の部品は `import { … } from ../App.jsx` で借りる（App.jsx のいちばん下の `export { … }` に並べてある）。切り出したのは「その画面からしか使われない部品」だけ（`node scripts/split-analyze.mjs report` で、画面ごとに切り出せる量が分かる）。**部品を足すとき**：その画面の中だけで使う部品は parts のファイルに、ほかの画面でも使う部品は App.jsx に置き、parts から使うなら App.jsx の export に足す。本体は 1,252KB→652KB（圧縮後 437KB→254KB）
- 機能のオン・オフ（2026年10月26日）：⚙設定の「使う機能」`FeatureSettings`。`FEATURES`（id・名前・場所）、displaySettings.featuresOff = {id: true}、StudyRPG が描くたびに `FEATURES_OFF` へ写し、各画面は `featOn("id")` で隠す（parts からは App.jsx の export で借りる）。新しく隠せる機能を足すときは FEATURES に足して、表示のところを featOn で囲む
- 復習の山をならす（2026年10月26日）：srSettings.dailyCap（1日の復習の上限。`LEVEL_CAPS` 0・50・80・120・200）。`levelPlan`（範囲の世界の期限が来た問題を記憶率［FSRS の get_retrievability］の低い順に上限まで今日に残し、残りを明日から `LEVEL_SPREAD`＝7日間の上限に余裕のある日へ）→ 合図 sq-sr-shift（`levelApply`）で StudyRPG が sr_nextReview だけを書きかえる（fs はそのまま）。今日タブの「今日の復習」の中に `LevelCard`（parts/today.jsx）。srSettings.autoLevel で毎朝自動（rpg.levelDay）
- 苦手から参考書へ（2026年10月26日）：`sankoIndex`（参考書の行の ref を extractLawRefs で読んだ「法令:条」→ 章と行）`sankoChaptersFor`。条文のチップ `LawRefChips` の横に「📖 参考書：章の名前」（最大2つ）、押すとその場で `SankoPeek`（章の表、その条文の行を黄色に。解いている途中でも画面を移らない）。「図書の塔でひらく」は合図 sq-open-sanko {subj, ch} → StudyRPG の sankoReq → SankoTab の req で、その章を開く。参考書の行に ref を書くほど、つながる問題が増える
- 季節の限定ボス（2026年10月26日）：`SEASON_BOSSES`（月ごとに1体。name・icon・art［ボスの絵］・title［限定の称号］・line）`seasonBossNow`（boss.seasonal・ym）。冒険の塔 → 世界 → クエストの週替わりボスの下 `SeasonBossCard`（parts/adventure.jsx）、12問。BossBattle の finish で boss.seasonal → rpgActions.seasonBossFinish（その月にはじめて倒すと称号［awardAchievement、id season-YYYY-MM］・`SEASON_BOSS_REWARD` 300G・EXP150・装備、2回目からは50G。rpg.seasonBoss）
- 実績のメダル棚 `TrophyShelf`（parts/status.jsx、記録の冒険の記録書の下）：冒険の記録（称号・討伐メダル・周回スタンプ・試練の塔・迷いの森・仲間・上級職・魔物の仲間・記念の建物）と、その年の季節の限定ボス12か月。「全部見る」で称号・討伐メダル・記念の建物の一覧
- parts に名前を足すとき：parts のファイルの `import { … } from ../App.jsx` と App.jsx のいちばん下の export の両方に足す（アイコンなど App.jsx が import しているものは、parts も同じ import を持っているので足さない）
- **分割したら必ず `node scripts/check-names.mjs` で点検する**（定義も import もされていない名前を探す。ビルドでは見つからず、使っている途中にエラーになるため）。
- `src/firebase.js`：Firebase初期化。`src/main.jsx`：起動。
- `public/hero.jpg`：クラシックテーマの立ち絵（少年）。`public/sprites/tier1〜6.png`：ドット絵の主人公（以前は App.jsx に埋め込み）。
- `public/white-title.jpg`／`public/white-hero.jpg`：白金テーマのタイトル・背景の絵と、メニューの立ち絵（白髪の少女）。`public/white-hero-s1〜s5.jpg` を置くと、Lv10/20/30/40/50 の姿の立ち絵に自動で切り替わる（無ければ前の姿→基本の絵）。
- `public/art/`：描きおろしの絵（元の大きな絵は利用者の「イラスト」フォルダ。アプリ用に縮小済み）。`title-wide.jpg`（PCのタイトル・背景）`title-tall.jpg`（スマホのタイトル）`scene.jpg`（会話・ログインボーナスの背景）`forge.jpg`（鍛冶場・ショップ）`party.jpg`（仲間の欄）`ally-registrar/surveyor/explorer.jpg`（仲間の立ち絵）。2026年10月13日の追加：`hero-sky.jpg`（天空の主人公の立ち絵）`pet-lumi*.jpg`（相棒の星獣ルミ）`hero-face-normal/smile/surprise/serious.jpg`（主人公の表情）`ally-kaito/serena/raven.jpg`（魔法学院の三人の立ち絵。設定画から切り出し、説明の文字は背景色でならした）`trio.jpg`（三人の看板）`academy.jpg`（試練の塔の見出し）`book-tools.jpg`（冒険の記録書の表紙）。`art/items/a01〜a16・b01〜b10.png`：道具の絵（白背景を透明にして切り出し）。装備・道具との対応は icons.jsx の `PAINTED_BY_ID` `PAINTED_BY_CH`。2026年10月14日の追加（イラストフォルダのモンスター図鑑3枚・アイテム図鑑・試練の塔から切り出し）：`art/mon/*.jpg`（魔物24種。App.jsx の `MON_PAINTED`［ふだんの19種］`MON_BOSS`［強い5種：論点の主・ボス］、表示は `MonPic`［丸くぼかす `MON_MASK`］。2026年10月15日、背景が透明な全身の立ち絵 public/art/mon2/*.webp（studyquest_monster_standing の25体、左向き）を追加し、`MON_STAND` にある魔物は `MonPic` もボス戦のボスも立ち絵で出す（`monStandUrl`。まだ見ぬ魔物は黒い影）。フレイムバード flamebird を MON_PAINTED に追加。ボスは `RPG_BOSSES` `WEEKLY_BOSS` の art → GameIcon の art）`art/items/c01〜c26.jpg`（アイテム図鑑。c01〜c12 は新しい装備12品［w-star・w-sky・w-bow・w-tome・a-angel・a-dragon・a-mantle・a-uniform・x-ring・x-pendant・x-bracelet・x-brooch］、c17・c26 は素材 `MAT_PAINTED`、c20〜c25・c04 は鍛錬の見出し。c の絵は GameIcon で丸く切り抜く）`art/dex-banner.jpg`（モンスター図鑑の見出し）`art/items-banner.jpg`（ショップの見出し）`art/tower/`（tower.jpg＝塔の見出し［登った高さに合わせて映す］、zone1〜4.jpg＝4つの区域 `TOWER_ZONES`［塔の戦いの背景にも：BattleStage の scene］、layer01〜10.jpg＝10の層の景色）
- `public/laws/*.json`：条文データ（不動産登記法・令・規則、民法、区分所有法、土地家屋調査士法。2026年10月19日に二陸特の法規＝電波法 denpa-ho・電波法施行令 denpa-rei・電波法施行規則 denpa-kisoku・無線従事者規則 musen-jujisha・無線局運用規則 musen-unyo・無線設備規則 musen-setsubi・無線局免許手続規則 musen-menkyo を追加）。条文の中の表は p.tb・item.tb（行×欄の文字。欄の中は文ごとに改行）に入れ、`LawTables` で表示（電波法施行令第3条の操作範囲など。データの `tables: true` が表を読むようになった版の印。それより前のデータと比べるときは表を除いて比べ、表が増えただけで法改正扱いにしない）。別表（AppdxTable）は読んでいない。
- `scripts/fetch-laws.mjs`：e-Gov法令API v2 から条文を取得するスクリプト。

## データ構造（Firestore）

- `userdata/{uid}`：`{ state: <問題集以外の全データ>, updatedAt }`
- `userdata/{uid}/questionbanks/{bankId}`：問題集ごと（問題の配列を含む。**1ドキュメント1MBの上限**に注意）
- `userdata/{uid}/sessions/current`：学習の途中再開データ
- `userdata/{uid}/images/{imageId}`：問題に付けた画像（圧縮した dataURL）
- `userdata/{uid}/reviewlogs/{YYYY-MM-DD}`：FSRSの回答履歴（arrayUnion で追記）
- セキュリティルール：`match /userdata/{userId}/{document=**}` で本人のみ読み書き可。サブコレクションを増やしてもこれでカバーされる。

state の主なキー：`player` / `qualifications` / `tasks` / `studyPlans`（学習計画）/ `studyLog` / `folders` / `studyNotes` / `sessionResume` / `timer` / `srSettings` / `displaySettings`（qFont, qSize, theme, showTitle, themeV, battle, sfx）/ `rpg`（gold, inventory, equipped, consumables, bossWins, classId, pet, seen, materials, skills, forgeLog など）

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
- 戦いの技と演出（`src/game/battlefx.jsx`）：主人公の技 `heroAttackFor`（装備中の武器 `equippedWeaponId`・科目の属性 `REGION_EL`・コンボで、斬撃［斬撃・十字斬り・三連斬］／魔法［炎・氷・雷・光・風］／弓を選ぶ。会心は大技の名前）、魔物の技 `monAttackFor`（種族ごと `MON_MOVES`：ひっかき・かみつき・炎の息・魔弾・たいあたり・岩石落とし・のろい・かまいたち）、当たるまでの時間 `impactOf`（ダメージの数字・のけぞり・揺れはここに合わせて遅らせる）。描画は `AttackFx`（H＝主人公・M＝魔物の位置を % で）`SkillBanner`（技の名前）`Ambient`（地域ごとの漂う光）、CSS は `BATTLE_FX_CSS`（sqx〜）。効果音は sfx.js の fire・ice・thunder・holy・wind・arrow・claw・roar・magicHit・victory
- ボス戦の舞台：`BossArena`（背景 `BOSS_SCENES`［ボスの絵ごとに塔の景色］、大きなボスの絵、HP3割未満で「怒り」、主人公の表情 HERO_FACES、連撃 `combo`［2連目から威力+6%ずつ・最大+30%］、決着の演出 `dying`［VICTORY／力尽きた］。決着の演出のあいだは `busy` で答えを受け付けない）
- 冒険のキャラ絵（2026年10月14日、イラストフォルダの「キャラクター進化譚」「luna_attack_24_sheet.png」から）：主人公の名前は `HERO_NAME`＝ルナ（白銀の魔法剣士）。戦いの主人公は `LunaSprite`（public/art/sprite/luna-attack.webp＝攻撃モーション10コマ。attack で再生、ほかは1コマ目に動き［待機・被弾・勝利・力尽きる］、足もとに装備のレア度の光 `auraOf`。CSS は `LUNA_CSS`）。カイトのモーション（kaito_attack_24）は透明処理が粗いため未使用。セレナ・レイヴンの攻撃モーション（selena_attack_24・rayvn_attack_24、24コマから本人が画面外の3コマを除いた21コマ）は public/art/sprite/serena-attack.webp・raven-attack.webp。動く絵は `SPRITES`（url・コマ数・長さ）と `CharSprite`（LunaSprite は who=luna）。攻撃のときは `sqlDash` で敵へ踏み込む（--dash）。ステージの絵 public/art/stage/{meadow,ruins,crystal,sunset,lava,snow,skycity}.webp（2026年10月14日、イラストフォルダの戦いの背景7枚）：問題の戦いは科目ごと `REGION_STAGE` `regionStageUrl`（試練の塔は区域の景色のまま）、ボス戦は `BOSS_STAGE`（魔王は溶岩）。戦いの画面の配置はイラストフォルダの「バトル配置イメージ」（2026年10月14日）にそろえた：左に味方（奥の後衛＝仲間 `backRow` `BackRowAllies` `slotOrigin`、手前の前衛＝ルナ 40%の位置）、右に敵（手前の前衛＝魔物［右から10%］・ボス［右から8%］で中央に寄せる、ボス戦は奥に手下2体 `minions`［見た目だけ］）。HP は問題の戦いが左下、ボス戦は味方が左上・ボスが右上。大きさ：問題の戦い 高さ232・ルナ180・魔物152・後衛104、ボス戦 高さ310・ルナ214・ボス214・後衛128。3連撃ごとの加勢は、後衛の仲間がその場で技を出す。大技の演出（会心・3連撃以上・カットイン）：連続ヒットの数字 `splitHits` `HitNumbers`、背景の暗転 sqxDim、画面ごと寄せるカメラの層（背景を inherit した内側の div に sqxCam）、斬撃の三日月の軌跡と集中線（battlefx.jsx の AttackFx）、ルナの残像（`CharSprite` が攻撃のとき `CharSpriteLayer` を遅らせて2枚重ねる）。技のカットイン `SkillCutIn`（`LUNA_SKILLS`＝ルミナススラッシュ・アイスエッジ・セイクリッドブレード・スターライトノヴァ。絵は public/art/skill/luna-1〜4.jpg＝キャラクター図鑑のスキルモーション例）：問題の戦いは `COMBO_CUTS`（5・10・20・30連撃）、ボス戦は `bossCut`（3・5・8・12連撃、以降4回ごと）。ルナの通常攻撃は public/art/sprite/luna-attack.webp（2026年10月15日、luna_normal_attack_assets の16コマ・0.9秒に差し替え）。必殺技スターライトノヴァ（ult）だけは長尺版 `SPRITES.lunaNovaLong`（luna_starlight_nova_long のコマの長さ［溜め・斬撃・最大発光・余韻］を半分にした3秒。`NOVA_LONG_MS` から作る keyframes `sqlNovaLong`、LunaSprite の pose="ult"、命中は +1.6秒）。カットインのときルナは必殺技のモーション（public/art/sprite/luna-nova.webp＝luna_starlight_nova_24、24コマ、ふちを透明にぼかした。`SPRITES.lunaNova`、LunaSprite の pose="skill"）。順番はカットイン（1.1秒）→ ルナの必殺技（0.6秒遅れで開始）→ 命中（t に +1.3秒）。周回の部屋の見出しは public/art/laproom.webp（題字入りの絵。下の枠と同じ横幅いっぱい・16:9で全体を見せる。2026年10月19日に「測って、解いて、力にする」の絵に差し替え）。目標の資格（mainQual）が無線の資格（`isRadioQual`：名前に「無線」「陸特」など）のときは public/art/laproom-radio.webp（特殊陸上無線技士の絵）。計算強化のタブ（CalcTab）の見出しは public/art/calcroom.webp（2026年10月15日、題字入り。10月19日に「計算の部屋 土地家屋調査士 試験対策」の絵に差し替え。横幅は最大680pxで中央、絵の比率のまま全体を見せる）。答えたとき戦いの画面が画面の外なら `bringIntoView` で見える所までスクロール（BattleStage の stageRef・BossArena の arenaRef。スマホで画面の外で戦っていて動きが見えなかったため）。ボス戦は仲間を後ろの列に並べ（`slots`、動く絵があれば全身・なければ `AllyMedal`）、加勢のときに技のモーション。問題の戦いの3連撃ごとの加勢でも、動く絵があれば技を出す。進化の絵 public/art/evo/{luna,kaito,serena,raven}-1〜6.jpg（`EVO_URL` `heroEvoArt`。ルナは主人公の6段階 HERO_STAGES に順に対応、仲間は絆レベル `allyEvoStage`）。`EvolutionGallery`（地図と仲間「キャラクター進化譚」）・進化の道 `EvolutionRoad`・進化の演出（ev.art / ev.prevArt）・仲間の欄（魔法学院の三人はいまの姿）
- 仲間の加勢：`battleParty`（加入した仲間から3人。`ALLY_SKILLS`：追撃 chase＝3連撃ごとに+40%、魔法 magic＝会心か2割で+30%、回復 heal＝攻撃を受けたとき4割でHP12%）。ボス戦は本当に効く（BossBattle の answer、`assist` の演出・`AllyMedal`）。問題の戦いは3連撃ごとに顔を出す演出だけ（fx.cameo）。`GearPortrait` は残っているが戦いでは使っていない
- 戦闘力（ログレス風）：`combatPower`（レベル・HP・攻撃・会心・守り・装備のレア度 `CP_GEAR`×強化段階）。拠点の装備の欄とボス戦に表示、装備を替えると増減を知らせる（rpgActions.equip）
- 召喚（ガチャ）：`GachaPanel` `GachaResult`（拠点。ゴールドで1回300G・10連2700G［SR以上1つ確定］、確率 `GACHA_RATE`、50回で SSR 確定 `GACHA_PITY`。rpg.gacha = {n, since}）、操作 `gachaPull` `sellBulk`（装備していない・強化していない N／R をまとめて売る）。持ち物は300個まで `invCap`（あふれたら装備していない古いものから消す）
- 育成：素材 `RPG_MATERIALS`（戦利品は `emitReward`→StudyRPG が記録）、スキル `SKILL_TREE`（SP＝レベル−1）、鍛冶 `forgeCost` `forgedFx` `rpgInvItem`（持ち物 `{u,i,p}` の p が強化段階）。`SkillPanel` `ForgePanel`。rpg に `materials` `skills` `forgeLog` を追加
- 進化：`HERO_STAGES`（Lv1/10/20/30/40/50 の6つの姿。額縁・紋章・翼・星）`heroStage` `HeroDecor` `EvolutionScene`（全画面の進化演出。`showEvolution` で出す：主人公の段階変化・覚醒★・相棒）`EvolutionRoad`
- モンスター図鑑：`MonsterDex` `dexStatus`（0未発見 1発見 2討伐 3制覇＝fs.s≥21）。魔物の種族 `MonsterKinds`（出会った問題の種族を集める。強い魔物はボスを倒すごとに1体ずつ）
- 世界と物語（冒険の「世界」タブ）：合格力 `passPower`（FSRSの想起率の平均・未学習は0。`PASS_LINE` 0.85／`BASE_LINE` 0.75）`mainQual` `FinalBoss` `WorldMap`（`MON_THEMES.region`）`STORY_CHAPTERS` `StoryPanel`（章が開くと `showEvolution`）。デイリークエスト `DAILY_QUESTS` `DailyQuests` `dailyOf`（rpg.daily に日ごとの記録。BattleStage の `emitReward` の stat で数える）`claimQuest` `claimChest`
- 週替わりボス：`weeklyBossFor`（合格力が最も低い地域）`WeeklyBossCard` `buildPoolFromBanks`、BossBattle の `boss.weekly` で `weeklyFinish`（rpg.weekly）。模試の塔：`DungeonCard` `DungeonRun` `dungeonFinish`（rpg.dungeon.best）
- 魔王城への道（世界タブを「魔王城への道／クエスト／魔王城」に分割）：科目の判定は `themeOf`（フォルダ名＋問題集名。`syncFolderIndex` で対応表を更新）。地域の守護者 `REGION_INFO` `regionStatus`（霧・探索中・挑戦可・解放）`guardianFinish`（rpg.regions、紋章の効果は getRpgBonuses）。会話 `STORY_TALKS` `REGION_TALK` `StoryTalk`（`showEvolution` の afterTalk で続けて出す）。魔王城 `CASTLE_FLOORS` `CastleCard` `castleClimb`（rpg.castle.floor）。旅路 `journeyEvent` `JourneyCard`（rpg.journey、戦利品の記録で進む）。カテゴリ討伐 `CAT_TIERS` `CategoryQuests` `claimCat`（rpg.cats）
- ストーリーの地図（2026年10月15日）：六角形の地図をやめ、イラストの地図 public/art/storymap.webp（「不動産登記法の王都クエストマップ」から、題名と数の欄を消して切り出し）に、クエストの印を重ねる `StoryRoadMap`。場所は絵の座標 `SMAP_NODES`（25か所）、たどる順 `SMAP_ORDER`（はじまりの町→左の道→右の道→中央→魔王の城）。1枚25話で、それより多い地域は◀▶で第2の地図…。スマホでは横に動かせ、いまのクエストへ寄せる。`hexSpiral` は使っていない
- ストーリークエスト（世界タブの「ストーリー」）：問題集を出題順に区切って1話に（第1・2話10問、第3・4話12問、以降15問。`chunkBank` `SQ_SIZES` `regionQuests`）。題名は最も多く出る条文の見出し（`questTopic` `questTitle`、条文データを読み込む）。六角形の地図 `hexSpiral` `StoryQuestView`、1話の戦い `QuestRun`（最後の1問は BattleStage の boss）、結果 `storyQuestFinish`（rpg.sq[`${問題集id}:${話}`]＝{stars,best,clears}、地域の全話クリアで地図完成）。ホームは `HomeDashboard`（今日の道しるべ：復習・ストーリーのつづき `storyNextInfo`・最終決戦＋今日の記録）と今日のクエストを2列に。称号／ジョブはステータス画面へ移動、「ここ1週間」は削除。問題集の問題を並べ替え・追加すると話の区切りがずれる点に注意
- 合格力の推移と週報：`PowerChart`（rpg.powerLog に1日1件）`weeklyReport`（週はじめに会話で。rpg.reportWeek）。会話は `talkQ` で順番待ち
- 論点カルテ `topicKarte` `TopicKarte`（記憶率の低い話トップ5、集中攻撃）。書式の鍛錬場 `ShoshikiDojo`（rpg.shoshiki）。逆算プラン `examPlan` `newTodayCount`（ホームの今日の目標）
- ログインボーナス `LoginBonus` `claimLogin`（rpg.login）。季節のイベント `SEASON_EVENTS` `activeEvents`（ボーナスは getRpgBonuses に加算）
- 仲間 `ALLIES`（リーネ・カイ・ミラ。地域を1つ・2つ・3つ解放で加入、`alliesJoined`）`PartyCard`。会話の話し手に仲間の id を使える（まだ加入していない仲間のせりふは飛ばす）。演出・会話・ログインボーナスはタイトル画面の間は出さない（`showTitleNow`）
- 試練の塔（世界タブ「試練の塔」）：100階。1階10問（第1階は新10問、以降は新8問＋下の階から2問）、10の倍数の階は「試練の間」＝直前9階から15問の総復習。80%で突破（`TOWER_PASS`）。問題の並びは `towerSeq`（科目を比例で交互に）、出題 `towerFloorPool`、弱さ `weaknessOf`。画面 `TowerView`、戦い `TrialRun`（汎用：一定の正答率で突破）、結果 `towerFinish`（rpg.tower={floor,best}）
- ストーリーの強化：節の守護者（問題集の全話クリアで出現、15問・80%、`secBossFinish`、rpg.secBoss）。地域の制覇＝全話＋全節の守護者＋地域の守護者（`regionConquest`、rpg.conquered、StudyRPG の効果で祝う）。不動産登記法・民法・調査士法の3つで特別章（`TRINITY_REGIONS` `TRINITY_TALK`、rpg.conquered.__trinity）。科目ごとの物語 `REGION_ARC` `regionArc`（intro・sec・finale。src/data/story.js）、地域に初めて入ると intro（rpg.arcSeen）
- 学びの地図（2026年10月22日、イラストフォルダの「ChatGPT 画像 2026年10月22日 16_45_55」→ public/art/townmap.webp）：タイトル画面で試験（星詠みの書）を選ぶと、まず地図（tab "map"、`TownMap`）。絵の上の6か所 `LEARN_TOWNS`（x・y・w・h＝絵の上の場所の%、tab＝行き先、cx・cy＝見出しで寄せる位置）をタップすると、はじまりの街（home）・周回の塔（qbank／laps）・計算の塔（calc）・修練の塔（train＝`TrainingRoom`）・図書の塔（sanko）・冒険の塔（adventure）へ。地図は画面に合わせて大きく（PCは画面の高さいっぱい・最大1600px、スマホは高さ5割まで大きくして横に動かせる。はじまりの街を真ん中に）。地図の下に行き先の小さなカード（スマホ3列・PC6列、絵と名前だけ。各カードの絵は塔の外観 `TOWER_ART`＝public/art/towers/{laps,calc,sanko,adventure,train}.webp［イラストフォルダの *_tower_exterior.png、2026年10月22日］。はじまりの街は地図のその場所を寄せて）と「今日の学習をはじめる」。塔の画面の上には `TowerHead`（地図のその場所を寄せた見出しと「← 地図へ」。どの塔かは `TOWN_OF_TAB`）。下のタブは「地図・はじまりの街」の2つ（grid-cols-2。はじまりの街には今日の復習の数）。今日と手帳は、はじまりの街の中の切り替え `TOWN_TABS`（ホーム・今日・手帳。手帳の中はこれまでどおり NOTE_TABS の帯）。`TOWN_OF_TAB` で today と NOTE_TABS も「はじまりの街」。見出しの絵：周回の塔（計画・記録）は public/art/laptower.webp、計算の塔は public/art/calctower.webp（2026年10月22日、イラストフォルダの 16_52_31・16_52_40。題字入り。無線の資格のときの周回は laproom-radio.webp のまま。古い laproom.webp・calcroom.webp は使っていない）
- 旧：下のタブは6つ（2026年10月22日に目的別に組み直した：ホーム・今日・周回・参考書・冒険・手帳。grid-cols-6。記録＝ステータスは手帳の中のいちばん左）→ 同じ日に学びの地図へ。「周回の塔」は中の帯 `LAP_TABS` で問題集（tab qbank）・計画・記録（laps/plan）・記述式（laps/kijutsu＝道場と叩き込み）・弱点・分析（laps/weak＝弱点集［賞金首もここ］・論点の横断周回・学習の分析・印刷と書き出し［直前見直しノート・苦手の書き出し］）を切り替える。合図 sq-open-past の view で中の画面を指定できる（例 {to:"laps", view:"weak"}。view:"train" は修練の塔＝tab train）。laps の中は StudyRPG の `lapView`、最後に開いたものを `lastLap` で覚える。合図 sq-open-past の to:"laps" は key・tataki があれば記述式、なければ計画・記録。`LapRoom` は view で中身を分ける。「今日」タブの上（開始前の画面）に今日やること3つ・すきま時間（TodayTab の header）、ホームには今日タブへの入口 `TodayLink`。「手帳」は記録（ステータス画面。tab id は status のまま）・タスク・時間・メモ・ルール帳・名言・資格をまとめたもので、中の切り替えは `NOTE_TABS`（最後に開いたものを `lastNoteTab` で覚える。はじめは記録）。マイ名言 `MyQuotes`（state.myQuotes = [{id, t, by, say}]。まとめて登録［貼り付け・.txt ファイル］は `parseQuoteLines`＝1行に「セリフ｜作品名・人物｜ひとこと」、# の行と同じセリフはとばす。アニメ・漫画の名言の例は利用者の 資格対策\マイ名言_アニメ・漫画.txt で、公開のリポジトリには入れない。アニメ・漫画などのセリフを本人が登録し、公開のコードには入れない。ホームの吹き出し MentorBubble の4回に1回［3番目］、10件以上なら偉人の名言の番にもまぜる）。学習カレンダーはステータスから外した（`StudyCalendar` 自体は残っている）
- 上の帯（ClassicInfoBar）の左のアイコン：タップでキャラを選ぶ小窓 `BarCharPicker`（＋ステータスを見る）。選べるのは `barChars`＝HOME_CHARS＋冒険の仲間（ALLIES の group: story）、設定 displaySettings.barChar（未設定は今までどおり主人公）。⚙設定にも同じ欄。顔の丸は `CharFace`
- ホームのキャラクター：`HOME_CHARS`（主人公・リーネ・カイ・ミラ・少年）`homeCharOf`、設定 `displaySettings.homeChar`。face は顔アイコンの切り抜き位置（背景サイズ300%のときの%）
- 周回スタンプの演出：問題集を最後まで解く（`incrementBankClears`）と `LapStampScene`（印が押される演出。5周ごとに金の印、効果音 `stamp`）
- iPhone での見切れ対策：index.html の `.grid > * { min-width: 0; }`（横並びの枠が中の長い文字で広がらないように）
- 世界タブは「ストーリー・試練の塔・地図と仲間・クエスト・魔王城」の5つ。鍛錬は2026年10月22日に「周回」の中へ移した（`TrainingRoom`：本番リハーサル［RehearsalRun もここで動かす］・申請書の穴埋め・組合せ・期限と数字・時間配分・条文の穴埋め・音読・教える・書式。資格の世界は本番モード・ブロック図など）。計算ドリル `CalcDrill`・作図ドリル `SakuzuDrill` は「計算」（CalcTab の下、王都の世界のとき）
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
- ホーム画面アプリ（PWA）：`public/manifest.webmanifest`、アイコン `public/icon-v2-192.png` `icon-v2-512.png` `icon-v2-maskable-512.png` `apple-touch-icon-v2.png` `favicon-v2.png`（2026年10月19日、イラストフォルダの「天文都市を望む測量士」［studyquest の題字入り］から。四隅の黒い角丸を除いて正方形に切り出した。maskable は Android の丸い切り抜きで題字が欠けないよう、絵を82%に縮めてまわりをぼかした同じ絵で埋めた。iPhone はホーム画面に追加したときのアイコンを使い続けるので、アイコンを替えるときはファイル名も変える［v2→v3］。替えたら利用者にホーム画面への追加し直しを案内）、保管係 `public/sw.js`（ページ本体はネット優先、そのほかは保管→裏で更新。他サイト＝Firebase には触れない）。登録は `src/main.jsx`（公開版のみ）。sw.js の中身を大きく変えたら `CACHE` の名前を変える。公開した新しい版がすぐ届くよう、ページ本体は fetch(req, { cache: "no-store" })、登録は updateViaCache: "none" ＋ reg.update()（2026年10月15日、古い画面のままになる問題への対策。CACHE は sq-cache-v4。2026年10月19日、絵の差し替えで sq-cache-v5、アイコンの差し替えで v6）
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
- 「いま試験なら」合格確率（魔王城の欄・ホームの最終決戦の行）：`passChance` `ExamChance` `binomTail` `examMean`（科目の重み `EXAM_MIX`＝不動産登記法16・民法3・調査士法1。1問の正答率＝記憶率^1.5＋勘20%。基準点は本番リハーサルの設定 `rehearsalCfg` を使う）
- 忘れかけの3問：`forgettingItems`（解いたことのある問題で記憶率が最も低い3問）。ホームのボタン → StudyRPG の `quickPreset` → 今日タブ（TodayTab の preset）ですぐ始める
- 相棒の星獣ルミ：`PET_TYPES.lumi`（art：段階ごとの絵 `pet-lumi-small.jpg` `pet-lumi.jpg`、happy：今日学習したときの笑顔 `pet-lumi-happy.jpg`）、表示は `PetIcon`（絵が無い相棒は絵文字）。`changePetType`（育ち具合はそのままで姿を変える）
- 科目ごとのジョブ（ステータス画面）：`subjectJobs` `SubjectJobs` `JOB_RANKS`（見習い・修行者・術士・魔導士・大魔導士・賢者＝Lv1/5/10/20/35/50）`jobLevelOf`（経験値＝正解の回数＋定着した問題×5）。称号が上がると演出（rpg.jobRank、学習中は待つ）
- 学習記録の控え（自動バックアップ）：userdata/{uid}/backups/{日付}（＋parts サブコレクションに小分け。書出と同じ中身）。`makeBackup` `readBackup` `BackupPanel`（ステータス画面のいちばん下。ファイルに書き出して「読込」で戻す）。7日ごとに自動（起動20秒後。`cloudLoadFailed` 中・問題10問未満のときは取らない）、新しい4回分を残す（`BACKUP_KEEP`）
- 主人公の進化の絵の指示文：`docs/進化の絵の指示文.md`（絵ができたら public/white-hero-s1〜s5.jpg に入れる）
- 新しい資格の教材づくり：`docs/教材づくりの指示文.md`（2026年10月20日。別のチャットに貼る教材の指示文［CSV の形・4択は「答：(n)」・参考書の形・法令の確かめ方］、世界の地図の絵の指示文、アプリ側でやることの一覧）
- 学習計画（今日のタスク）：state.studyPlans = [{id, name, folderId, bankIds（順番）, laps, start, end, perDay（固定）, done:{通し番号: 日付}, finishedAt}]。項目＝問題集1つ。通し番号 k は bankIds[k % 項目数]。`planToday`（今日までに済ませる数＝perDay×日数、できなかった分は翌日に繰り越し）`PlanTasks` `PlanMaker`（フォルダごとの☑・すべて選ぶ／外す。いくつかのフォルダにまたがって選べる。下のタブ「周回の部屋」 `LapRoom` に置く。今日タブには短いお知らせ `PlanSummary` だけ）、操作 `planActions`（addPlan・removePlan・togglePlanItem・openBank）。問題集を最後まで解くと `incrementBankClears` → `markPlanBank` で自動✓。「解く」は `openBankReq` → QBankTab の開始画面。ホームの道しるべにも「今日のタスク」の行
- 2周目からは苦手だけ：計画の `weakOnly`（2周以上で選べる）。2周目以降の行は「苦手を解く」→ `openBank(id, "revenge")` → QBankTab がリベンジ（RevengeSession）で開く。リベンジを最後まで解くと `onComplete` → `markPlanBank(id, true)`（weakOnly の計画の2周目以降だけ✓）。苦手が0問なら「苦手なし・済みにする」
- 周回の分析：`PlanChart`（計画ごとの予定と実際の線。比べるのは前の日までの予定）`LapGrowth`（問題集の clearHistory の正解率から、伸びている／伸び悩み［前の周以下か70%未満］を分ける。伸び悩みは「苦手を解く」）
- 今日のふりかえり：`reflectionTalk`（今日の回答・学習時間・連続日数・今日のタスク・影の受験生・明日のタスク・相棒）。20時以降・学習していないときに1日1回自動（rpg.reflectDay、1分ごとに確認）、ホームの「今日のふりかえり」ボタンでいつでも
- 集中タイマー（手帳の「時間」）：`FocusTimer` `FOCUS_MIN`25・`FOCUS_BREAK_MIN`5、`focusChime`（効果音の設定に関係なく鳴らす）。状態は rpg.focusRun = {phase: focus|break|ready, endAt, own}（StudyRPG の useEffect が時間で切り替え。ほかの画面でも止まらない）、rpg.focus = {day, n, total}。集中中は学習タイマーを動かして時間を記録
- 直前見直しノート（問題タブ「🖨 直前見直しノート」）：`PrintNoteButton` `PrintNote`（苦手／まちがえたことがある／⭐、フォルダの選択、最大問題数、答えを最後にまとめる。window.print、印刷時は body.sq-printing でほかを隠す）
- 仲間の勉強会（クエストの欄）：`StudyGroupCard` `studyGroupHost`（加入している仲間が週ごとに順番）`studyGroupPool`（その仲間の likes の地域から10問）、戦いは TrialRun（7割＝`STUDY_GROUP_PASS`）、結果 `studyGroupFinish`（その週はじめてのクリアで絆+30・80G・EXP30、src/data/story.js の `STUDY_GROUP_TALK`。rpg.studyGroup）
- ホームの並べ替え・非表示（設定「Aa 文字」の「ホームの表示」）：`HOME_BLOCKS`（top・events・guide・quest・quals）`HOME_TOP_PARTS`（hero・menu・mentor）`HOME_ROWS`（道しるべの行：task・review・story・goal・final・reflect・quick・rival・next・stats）`homeLayoutOf` `HomeLayoutSettings`。設定 displaySettings.homeLayout = {order, rows, hidden:["events" や "row:task" "top:hero"]}（null で元に戻る。新しい行は自動で末尾に入る）。`HomeDashboard` の `part`（events／guide／quest／guide+quest）で部分ごとに描く
- データの健康診断（ステータス画面・控えの上）：`healthReport` `HealthPanel`（問題集1つ・学習記録の本体の大きさを Firestore の1MB上限 `DOC_LIMIT` と比べる。70%で△、90%で危険。二重登録・空の問題も一覧。見るだけで変えない）。危険のときは問題タブの上に `HealthWarning`
- 条文から問題を解く：`LawArticleModal` の「この条文の問題を解く」（その条文を引用している問題から最大30問）→ window の合図 `sq-study-items`（detail＝今日タブの出題リスト）→ StudyRPG が `quickPreset` に入れて今日タブで始める
- ○×のひっかけ版（問題タブ「⚡ ○×の『ひっかけ版』をつくる」）：`src/game/cloze.js` の `makeTrap`（期間は同じ単位の別の数 `SAME_UNIT`・割合・言い回し `MODAL_SWAP`・同じ仲間の用語を1つ入れ替え）`isTrueAnswer`（答えが○で始まるか）。画面 `TrapMakerPanel`（確かめて☑・🎲で作り直し、元の○の問題もまぜて新しい問題集「○○（ひっかけ版）」にする。元の問題集は変えない）
- 知識の城（冒険の世界タブ「地図と仲間」）：`knowledgeCastle` `KnowledgeCastle` `KC_STAGES`（空き地・礎石・城壁・屋根・旗）。フォルダ1つ＝塔1本、問題集1つ＝1段。進み具合＝（定着［fs.s≥21］＋正解したことのある問題×0.5）÷問題数。城全体が25%で城壁、全部の塔に旗で完成
- 次に取れそうな称号：`nextTitles`（冒険の実績 `ACH_PROGRESS`・レベルの称号・科目ごとのジョブの次の段階を、近い順に）`NextTitles`（ステータス画面の称号の下）。ホームの道しるべの行 `next` にも1つ
- 学習の工夫（設定 displaySettings.study = {explain: off|say|write, slowSec, followUp, mix}。`STUDY_DEFAULTS`、StudyRPG が描くたびに `STUDY_PREFS` へ写す。設定画面は `StudySettings`）：
  - 「答えを見る」は全部 `RevealButton`（答える前のひとこと説明、問題が出てから開くまでの秒数を `THINK` に）。`AnswerPanel` が秒数・説明を表示し、回答の meta.sec で問題の `ts`（直近5回の秒数）に記録。`slowSec` 以上かかった◎は「あやふや」（Hard）扱い
  - 自分ルール：2回目のまちがいで AnswerPanel が一行ルールを聞き、問題の `rule` に保存（答えの下に表示・書き直し）。一覧は手帳の「ルール帳」`RuleBook`（NOTE_TABS に rules）。問題の書きかえは合図 `patchQuestion`（sq-q-patch）
  - 交互練習 `interleaveItems`（今日の復習のセットを科目ごとに交互に）。類題で追い打ち `followUpFor`（まちがえたら同じ条文の別の問題を1問あとに。条文の索引 `lawIndex` `refsOfQ`）
  - 試験前の仕上げ：`finishInfo` `effectiveSr`（試験日の30日前から目標記憶率95%、`FINISH_DAYS` `FINISH_RETENTION`。srSettings.finish=false でやめる）。今日の復習は、記憶率が95%を下回った問題を期限前でも前倒し（item.early）
  - 重要度ランク `questionRanks` `RankChip`（よく出る条文6割・まちがえやすさ3割・⭐1割で A30%・B40%・C30%）。今日の復習の「重要度Aだけ」
  - 特別な出題（今日タブ `SpecialQuizCards`、TodayTab の `startSpecial` と `pInfo`、結果は rpgActions.finishSpecial）：週末の抜き打ちテスト（土日、今週答えた問題から10問、rpg.weeklyTest[週]）、寝る前の10問（20時から、今日まちがえた問題、rpg.sleep）と翌日の朝の確認、力試し（はじめての問題集の開始画面 SessionConfig から10問、kind: pretest）。合図 sq-study-items は配列か {items, kind, title}
  - 学習の分析（周回の部屋 `StudyAnalysis`）：思い込み度 `overconfidence`（◎の次の回にまちがえた割合＋cwCnt）・条文マップ `lawMastery` `LawMastery`・年度別 `YearScores`（問題集の year。`yearNum` で R/H を西暦に）・法改正 `LawChangeList`
  - 本番形式の組合せ問題 `KumiaiDrill` `makeKumiai`（鍛錬。○×の問題を5つ選び「正しい／誤っているものの組合せ」5択。まちがえた肢は合図 sq-record-answer で✕として記録、rpg.kumiai）。仲間に教えるモード `TeachMode`（鍛錬。3つの答えから選んで教える、rpg.teach、絆）
  - 法改正のお知らせ：`scripts/fetch-laws.mjs` が前回の条文と比べ、変わった条文を `public/laws/changes.json`（{updatedAt, changes:{法令:{条:日付}}}）に記録。アプリは `useLawChanges` `lawChangeOf`（LawRefChips に ⚠、「確かめた」で問題の lawOk に日付）
- 2026年10月15日の追加：
  - 討伐依頼書 `BountyBoard` `bounties`（今日タブ。2回以上まちがえた問題が賞金首、ちがう日に `BOUNTY_DAYS`＝3回続けて正解 `correctDayStreak` で討伐。報酬 `claimBounty`［80G＋まちがい回数×10G・星霊石・EXP］、rpg.bounty.done[問題id]＝日付［その後まちがえると再掲］。挑戦は startSpecial の kind: bounty）
  - 記憶の通知表 `memoryReport` `MemoryReportCard`（今日タブ。今日の正答率で秀・優・良・可、解いた・新しく覚えた・忘れかけを救った・明日の復習、明日あぶない3問）
  - 時間配分トレーニング `PaceDrill`（鍛錬。1問 `PACE_SEC`＝150秒で `PACE_N`＝10問、迷ったら次へ［1問1回、最後に回す］、回答は sq-record-answer で FSRS に記録、rpg.pace.log）
  - 条文の音読モード `LawListen`（鍛錬。よく出る条文を speechSynthesis で読み上げ→ `clozeFromArticle` の穴埋め1問×5、rpg.lawListen）
  - 図鑑の討伐メダル `KILL_TIERS` `killTier`（BattleStage の emitReward の stat.kind で rpg.kills[種族] を数え、10・50・100体で銅・銀・金と50・150・300G。MonsterKinds のカードに表示）
  - ボスの行動パターン（BossBattle）：溜め `CHARGE_EVERY`＝4問ごと［次にまちがえると2.5倍、正解で止めて1.3倍］`charging`、回復 `BOSS_HEALERS`［HP半分未満で1回、まちがえたとき15%］`healedRef`。BossArena に「溜め中」の札と紫の渦（sqyCharge）
  - 連携技 `JOINT_SKILLS`（絆 `JOINT_BOND`＝3以上の仲間と `JOINT_EVERY`＝6連撃ごと、ダメージ+60%。assist.joint）
- 2026年10月15日の追加（その2）：
  - 期限・数字の一覧表とクイズ `NumberDeck` `numberDeck`（鍛錬。答えが○の問題文で、期限・数字 `NUM_PICK` が1つだけのもの。数字ごとの一覧と、同じ単位の数から選ぶクイズ、rpg.numQuiz）
  - 今週の処方箋 `Prescription` `RX`（今日タブ。この1週間のまちがいの errTypes・時間がかかった（ts）・思い込み（wrongSure）を数え、いちばん多い原因と行く場所を案内）
  - 書式の自己点検シート `ShoshikiCheck` `SHO_CHECKS`（鍛錬。落とした項目を☑して記録、rpg.shoCheck.log、よく落とす項目トップ3）
  - 模試・答練の記録 `MockLog`（周回の部屋。rpg.mocks=[{id,d,name,ta,ki}]、基準点・合格点は `rehearsalCfg`［mcBase・descBase・pass］。LapRoom に rpgActions を渡している）
  - 曜日の迷宮 `WeekdayDungeon` `weekdayRegion`（クエスト。月曜から REGION_ORDER の順に科目、10問で正解1問20G＋欠片、1日1回 rpg.weekdayDone。今日タブの特別な出題 kind: weekday、finishSpecial で報酬。合図の detail の items 以外は pInfo に入る）
  - 装備のセット効果 `GEAR_SETS` `setStatus`（3つそろえると getRpgBonuses に加算。拠点の装備の欄に表示）
  - 相棒のおつかい `LumiErrand` `claimErrand`（クエスト。その日10問でおみやげ、30・60問で豪華に、1日1回 rpg.errand）
  - 言葉の一括置換・CSV の書き出し `BulkTools`（問題タブ。置換は合図 sq-bulk-replace で StudyRPG が1回の setState で文字だけ置き換え［学習の記録は残す］。CSV は Papa.unparse＋BOM、列は問題・答え・メモで取り込みと同じ形）
- 計算強化（下のタブ「計算」 `CalcTab`、2026年10月15日）：問題づくりは `src/game/calcplus.js`（`CALC2_GROUPS`［座標・方向角・距離／交点・内分点／面積／三角形の辺と角／建物・地積の端数処理］の15種類 `CALC2_TYPES`、`makeCalc2(type, seed)`＝seed が同じなら同じ数字、`checkCalc2`［数は誤差 tol、度分秒は秒の差］、答えに解き方 steps と fx-JP500 のキー操作 keys［"[SHIFT]" のように [ ] で囲んだキー、"(Pol)" は小さな注記］）。出し方は☑で選ぶ：毎回数字が変わる／決まった問題集（種類ごとに `FIXED_PER_TYPE`＝5問、seed は `fixedSeed`。全部解くと1周で300G）。キーの表示は `KeySeq`、図は既存の `CalcFigure`。記録 `logCalc2`（rpg.calc2 = {stats:{種類:{n,ok}}, fixed:{lap, done, res:{id:{n,ok,last}}}}、正解でカイとの絆）。選んだ種類は端末の sq-calc2-types に保存。追加（同日）：種類は21に（本番形式 composite［段 stages：方向角→交点→面積→地積。前の段の答えを次の段に表示］・bunpitsu［面積指定の分筆］、transform［座標の平行移動・回転］、sumikiri［隅切り］・arc［弓形］、kubun［区分建物＝内側線と普通建物＝中心線］）。段のない問題は `stagesOf` で1段に。段階ヒント（steps を1つずつ開ける、使った数を記録）、検算 verify（`VERIFY` と各問題）、まちがえた原因 `CALC_MISS`（`logCalcMiss`、rpg.calc2.miss・missByType、開始前に「計算ミスの傾向」とひとこと）、1問ごとの時間と自己ベスト（ヒントなしの正解の最速、rpg.calc2.best）、キー操作の早押し（`keyDrillOf` で数字を「数」にまとめ、画面のキーを順にタップ、`logCalcDrill`、rpg.calc2.drill）。π は [π] と表示（機種の刻印を確かめる注記つき）。地積は規則100条（宅地・鉱泉地以外で10㎡超は1㎡未満切り捨て）、床面積は規則115条（1/100㎡未満切り捨て）
- 記述式の道場と本試験の計算（2026年10月16日。資格対策フォルダ［C:\Users\<ユーザー名>\OneDrive\Desktop\資格対策\成果物］の Word 文書から）：
  - データは public/data/kijutsu.json（論点編・攻略本の40年分：事案 case・問い asks・自分で決めること decide・解法の見出し secs［登記の目的・申請書の骨格／要点・土地の表示欄・床面積 ― 求積・電卓のキー操作・原因及びその日付・この年の論点・つまずく点…］）と public/data/pastcalc.json（土地計算マニュアル7冊の20年分：与件 pts・求めるもの tasks・手順 sections［複素数モードのキー操作］・答え answer）。作り直しは `py scripts/kijutsu/build_data.py`（docx を読む。scripts/kijutsu/docx_blocks.py で表の形のまま読む）。読み込みは src/game/kijutsu.js の `loadData`
  - src/game/kijutsu.js：添付書類の一覧 `DOC_LIST` `docsIn`（かっこ内の「〜は不要」は数えない）`isSingleApp`、模範の取り出し `modelAnswers` `decideOf`、床面積 `floorRows` `floorKeys` `hideResult`、目的⇄原因⇄日付 `CHEAT_ROWS`（暗記チートを本試験の答えで直したもの。食い違いは `CHEAT_FIXES`）、登記記録の申請前→後 `REC_CASES`（学習用に作った場面15）
  - 計算の部屋（CalcTab）の上に `PastCalcArea`：土地の座標20年 `PastLandRun`（点の配置図 `PastFigure`、手順を1区切りずつ `PastSection`、キーの早見 `ComplexKeyLegend`）と建物の床面積20年 `PastFloorRun`（1/100㎡未満切り捨てで判定）。記録 `logPastCalc`（rpg.calc2.past = {res:{"L:R6"|"F:R6":{n,ok,last,d,best}}, done, lap}。全40題 `PAST_TOTAL` で1周500G）
  - 周回の部屋（LapRoom）に `KijutsuDojo`：年度ごとの答案 `KijutsuRun`（決めることの欄＋添付書類は☑＋表示欄 `HyojiGrid`［tochi1.png・tatemono1.png と同じ形］→ 模範と並べて ○△✕ の自己採点、つまずく点に☑、下書きは端末の sq-kj-draft-{id}）、`CheatQuiz`、`RecordDrill`。記録 `logKijutsu`（rpg.kijutsu.res[id]＝{n,last,best,d,hist}、pit、80点以上で80G）`logKijutsuDrill`（rpg.kijutsu.cheat／rec）。解いているあいだは LapRoom のほかの欄を隠す（dojoFocus。並び順は変えない）
  - 道場⇄計算の部屋は合図 `sq-open-past`（{to:"calc", kind:"L"|"F", id} ／ {to:"laps", key:"L-R6"}）→ StudyRPG の `pastReq`
  - 年度の図 `YearFigures`：問題の画像と同じく圧縮して userdata/{uid}/images に保存、どの年度かは rpg.kijutsu.figs[年度id]（L-R6・B-R6。道場と計算の部屋で共有）。講座の画面の写しなので public には置かない
  - 電卓の変数 x・y は KeySeq で等幅の斜体（Cinzel は小文字も大文字に見えるため）
  - 成果物の CSV の新旧の比較は 資格対策/CSVの整理表.md
  - 追加（2026年10月16日その2）：
    - 欄ごとの弱点 `KjFieldTable`（rpg.kijutsu.fields[欄]＝{n, pts}、欄の名前は `kjCanon`＝原因及びその日付をまとめる、`KJ_FIELDS`）と欄ドリル `FieldDrill`（1つの欄だけを10年、✕→△→未→○の順。記録 `logKijutsuField`、rpg.kijutsu.fdrill・res[id].fm）。入力欄は `KjFieldInput`、自動の判定は `kjAutoHint`（答案と欄ドリルで共通）
    - 年度ごとの復習日 `kjNextDate`（50点未満1日・70点未満3日・80点未満7日・80点以上は続いた回数で14→30→60→120日）`kjDue` `kjLabel`。今日タブ `KijutsuDueCard`、ホームの道しるべの行 `kijutsu`、道場の「今日の復習」
    - その年の一問一答 `YearQuestionsButton` `yearQuestionItems`（問題文の先頭の番号「記土R6-」「記論土-R6-」などで探す `yearQuestionRe`。sq-study-items の kind: "kijutsu-year"）
    - 本番リハーサル（RehearsalRun）の記述で、道場の土地1年・建物1年を解く（KijutsuRun の `onScored`・`exitLabel`。100点→25点満点）。時間の内訳 split {mc, land, bldg} と years を rehearsal.log に記録、RehearsalCard に「時間配分」の帯
    - 本試験の手順の早押し：CalcTab の早押しに `PAST_DRILL_TYPES`（放射・交点・内分点・点の移動・閉合調整・求積・その他）`pastDrillTasks` `pastDrillOf` `PAST_PAD`（複素数モードのキーと変数。drill.past のとき6列）
    - 当日の確認カード `HayamiCards`（public/data/hayami.json＝計算マニュアル共通編 第9部・土地論点編 第10部・建物攻略本 第10部。build_data.py で作る）。`KeyText` は電卓のキーの名前のときだけキーの形（数式の［ ］はそのまま）。道場・計算の部屋の準備欄から開き、試験日の14日前からホームの行 `hayami`（`daysToExam`）
    - 択一の一問一答CSV：`py scripts/kijutsu/build_takuitsu_csv.py` で 資格対策/成果物/StudyQuest_択一_民法_過去問300肢.csv（民法の強化書H17-R6 第5部の300肢・○×・ひとこと・解説・根拠）と StudyQuest_択一_判例と言い回し.csv（図解版などの判例・ひっかけの言い回し、調査士法を含む）を作る。アプリには利用者が問題タブから取り込む
- 参考書道場（下のタブ「参考書」 `SankoTab`、2026年10月16日）：暗記に特化した参考書。中身は src/data/sankosho.js の `SANKO_SUBJECTS`（科目→章 {id, title, intro, cols, rows:[{c:[セル…], ref:"不動産登記規則28条1号"}], ask:[クイズで聞く列], tip}）。いまは不動産登記法の11章（土地／建物・区分建物の登記と申請義務、合筆・合併の制限、保存期間［規則28条］、記名押印と印鑑証明書［令16・18条、規則47〜49条］、登記識別情報［令8条］、登記事項、地目・地積・床面積、建物の種類・構造・家屋番号、図面の縮尺、登録免許税）。**内容は条文データ（public/laws）で1つずつ確かめてから書く**（資格対策フォルダの暗記ノート・法令集には不確かな記述があるため、そのまま写さない）。根拠の 📜 は `SankoRef`（extractLawRefs → LawArticleModal）。章の画面 `SankoChapter`（読む・隠して覚える［めくって ✓覚えた／まだ］・クイズ・問題集に書き出す［名前「参考書：科目・章」。同じ名前があれば作らない］）、クイズ `sankoQuiz` `SankoQuizRun`（同じ列のほかの行の値を選択肢に）。記録 `sankoRead` `sankoMark` `sankoQuizLog`（rpg.sanko = {read, known:{"科目:章:行": 日付}, quiz:{n, ok, miss}}）。2026年10月16日に民法（総則・物権・相続の12章）・土地家屋調査士法（7章）・区分所有法（6章。2026年4月施行の改正後の決議要件）を追加し、4科目259項目。区分所有法の特別決議は「区分所有者・議決権の各過半数の出席＋出席者の各4分の3」（建替えは全体の5分の4、一定の建物は4分の3）。条文データを取り直したら（fetch-laws）、改正で変わった項目がないか見直す
- 星詠みの書（2026年10月19日）：タイトル画面の「つづきから」を「星詠みの書」にし、選ぶと資格の一覧（`starBooks`：番号 `BOOK_NO` Ⅰ〜、試験までの日数・合格力・問題集の数）＋「すべての資格」＋「新しい書（手帳の資格へ）」。選んだ資格は displaySettings.activeQual（"all" か未設定なら従来どおり試験日がいちばん近い資格＝`autoMainQual`）。`mainQual` がこれを優先するので、ホームの最終決戦・合格力・カウントダウン・逆算プラン・影の受験生がその資格に合う。今日の復習・問題タブ・学習計画は今までどおり全部（資格で絞るのは未実装）。ホームのいちばん上に切り替えの帯 `StarBookBar`。資格を切り替えても記録が混ざらないよう、合格力の記録 powerLog に資格の印 q（古い記録は autoMainQual の印を付けた）・表示は `powerLogOf`、影の受験生は rpg.rivalByExam、カウントダウンの「見た節目」は rpg.countdownByExam に試験日ごとに残す
- 第二級陸上特殊無線技士（二陸特、2026年10月19日）：教材は資格対策フォルダの 二陸特\（別のチャットで作成。問題集21ファイル627問は利用者が問題タブから取り込む、README に出典・要確認）。参考書は src/data/sankosho-radio.js の `NIRIKUTOKU_SUBJECTS`（法規13章・無線工学14章。無線工学の ref は空）。参考書タブは `SANKO_GROUPS`（資格ごとのまとまり）・`SANKO_ALL`、目標の資格が無線なら二陸特を先に出す。条文の参照 `extractLawRefs`：法令名のない「第1条」は、文章に電波関係の法令（`RADIO_LAW_RE`）があれば【根拠】の法令（なければ最初の電波関係の法令）、なければ従来どおり不動産登記法。「第42条の3つ目」を42条の3と読まないよう「条の数字」の後に「つ」が続くものは除く
- 冒険の世界（2026年10月19日）：資格ごとに世界が分かれる。主人公のレベル・装備・仲間・ゴールド・試練の塔の階は全部の世界で共通。設定は src/data/worlds.js（`HOME_WORLD`＝王都の世界「境界の王国」、`WORLD_PRESETS`＝名前で合う資格の世界の設定［いまは無線 radio：電波の空域・地域「電波法の港町」「雷鳴の工房」・魔王城「嵐の電波塔」・物語7章］、`genericChapters`）。どの世界かは `worldOfQual`：資格の world が "own" ならその資格だけの世界、"home" か未設定なら王都の世界（WORLD_PRESETS に合う資格は未設定でも own）。新しく登録する資格は world: "own"（手帳の資格の「冒険の世界」で変えられる）。いまの世界 `curWorld`＝星詠みの書の資格の世界。地域は `themeOf` が問題集の資格（`BANK_QUAL`、syncFolderIndex で更新）で分ける：王都の世界は今までどおり MON_THEMES、資格の世界は `worldTheme`（設定の regions に合えばそれ、なければ「フォルダ名の地」）。守護者・紋章は `regionInfo`（REGION_INFO → `PRESET_REGIONS` → `genericRegionInfo`）、並びは `regionRank` `byRegionOrder`、戦いの背景は設定の stage。世界ごとの記録：物語の章 `storySeenOf`（rpg.storySeenByWorld）、魔王城の階 `castleFloorOf`（rpg.castleByWorld）、模試の塔の最高記録 `dungeonBestOf`（rpg.dungeon.bestW）。王都の世界は今までの storySeen・castle・dungeon.best のまま。世界タブの上に `WorldBanner`（いまの世界と「世界をわたる」＝rpgActions.setActiveQual）。ストーリーの地図 `StoryRoadMap` は世界の map（{url, nodes, order, box}）を使い、なければ王都の地図を mapHue で色を変えて仮に使う。世界の map は { file（public/art の名前）, box, nodes, order, fog, start }（nodes は元の絵の座標で絵に描かれた印の位置、box は切り出した範囲、fog: true はクエストのない印を雲で隠す、start は出発地の名前）。二陸特の地図は public/art/storymap-radio.webp（2026年10月19日、イラストフォルダの「電波の王国 冒険マップ」から題名の帯を切り落とした。印22か所、1枚22話）。地域の物語は `worldArc`（設定の arc → story.js の regionArc）
- 4択をタップで答える（2026年10月20日）：問題文の最後に (1)〜(n) の選択肢が並び、答えが「答：(n)」で始まる問題（二陸特の CSV の選択問題）は `choiceOf(text, ans)` が {stem, opts, correct} を返す（調査士の問題は答えの形が違うので対象外）。`renderQText(text, formats, ans)` は3つ目に答えを渡すと選択肢を1行ずつ並べる（書式 q_formats がある問題は今までどおり）。`RevealButton` は番号のボタン（選んだ番号は `THINK.pick[問題id]`）と「選ばずに答えを見る」、`AnswerPanel` は「✓ 正解！／✕ あなたの答え・◎ 正解」を出し、まちがえたら最初から「間違えた原因は？」（戻るボタンなし）、正解なら ✕ のボタンは「まぐれ」
- 勉強の範囲（2026年10月20日）：displaySettings.studyScope が "world" なら、いまの世界（星詠みの書の資格の世界）の問題集だけを今日の復習（TodayTab・getTodayReviewItems＝タブの数字）・問題タブの一覧（QBankTab の folderBanks）・学習計画（`scopedPlans`：計画の世界は最初の問題集の世界。今日のタスク・周回の部屋・ホームの行・PlanMaker）に出す。"all"（未設定）は全部。帯 `StudyScopeBar`（今日・問題・周回の部屋の上。問題集のある世界 `worldsInUse` が2つ以上のときだけ）で選び、世界を選ぶと星詠みの書もその世界の資格に（`qualForWorld`）。設定の変更は合図 `setDisplay`（sq-display-set → StudyRPG の updateDisplaySettings）。全部の世界をまぜるときの配分 displaySettings.studyMix = {世界id: 重み}（null＝期限の古い順。今日タブで「7：3」などを選ぶ）、`mixByWorld`（足りない世界の分はほかの世界から）。範囲の外の世界の復習の数は今日タブの帯にお知らせ。キーワード検索・周回の記録・弱点リストは全部のまま
- 資格ごとに切り離す（2026年10月22日）：調査士（王都の世界）と二陸特などの資格の世界がまざらないように。`chosenQual`（星詠みの書で「すべての資格」を選んだときだけ false。未選択でも自動の目標の資格で分ける）・`homeSide`（調査士の側の表示を出すか）。勉強の範囲 studyScope は、資格を選べば自動で「その世界だけ」（星詠みの書で選ぶと studyScope を null に、「すべての資格」なら all）。`autoMainQual` は王都の世界の資格を優先（二陸特は星詠みの書で選んだときだけ目標）。資格の世界では、上位1%の目標・ロードマップ（rmShow）・📅 計画・今日やること3つ・記述式（LAP_TABS）・記述式の復習・当日の確認カード・模試の記録・調査士の計算（CalcTab は無線工学の計算ドリルだけ）・弱点集の叩き込み／計算／記述式を出さない。参考書は選んだ資格の参考書だけ。周回の伸び・周回の記録・周回スタンプの数も範囲の世界だけ。取り込み（ImportPanel）の「紐付ける資格」は、はじめから目標の資格、行き先は `QualDestNote`（名前が無線らしいのに王都の世界なら注意）。問題集の資格はあとから付け替えられる（問題タブの 📁 → `setBanksQual`、同じフォルダの問題集もまとめて。解いた記録はそのまま）。デモの架空データに二陸特の資格と問題集3問
- 2026年10月23日の追加：
  - 試験日までの計画をワンタップで `QuickPlan`（学習計画の欄 PlanTasks、範囲の世界に計画がないとき。星詠みの書の資格の試験日まで、範囲の世界の問題集を全部・フォルダの順に○周［1〜5、既定3］、終わりは試験の数日前［日数の1割・1〜7日］、2周目から苦手だけ）
  - 資格の世界の学びの地図：世界の設定 townmap（src/data/worlds.js。二陸特は townmap-radio.webp）。TownMap・地図の下の「はじまりの街」・TowerHead がこの絵を使い、読み込めなければ王都の townmap.webp（TowerHead は背景を2枚重ね）。絵は王都の地図と同じ配置で描いてもらう（指示文 docs/資格の世界の地図の指示文.md）。絵はまだない
  - 資格を取ったら（acquireQual）：記念の建物 `monumentOf`（資格の世界は世界のアイコンの「○○の記念塔」、王都の世界は🏛「○○の記念碑」）、街の経験値+`MONUMENT_XP`300・`MONUMENT_GOLD`500G、showEvolution「資格取得」と会話。記念の建物は取得済みの資格から出す（記録は持たない）
  - 街の絵の上の印：建てた建物 `TOWN_SPOTS`・記念の建物 `MONUMENT_SPOTS`（絵の上の%）。タップで名前と効果
  - 街の依頼 `TOWN_REQS` `townReqsToday`（毎日3つ、日付の hashStr で選ぶ。建物を建てると依頼する人が増える）`TownRequests`（TownPanel）。数えは `townToday`（回答・正解・◎は ah、時間は studyLog、計算・参考書は rpg.townDay＝`tdBump`［logCalc2・logRadioCalc・sankoRead］、復習を全部は範囲の世界）。報酬 rpgActions.townReq（1つ街の経験値40・40G、3つ全部でさらに60と星霊石。rpg.townReq = {d, got, bonus}）
  - 復習にかかる時間の見積もり `estimateMinutes`（ts の中央値［最大120秒］＋答え合わせ5秒。記録なしは解いたことがあれば15秒・はじめて25秒）`fmtEst`。ホームの TodayLink（dueMin）と今日タブの「復習期限が来た問題」
  - 試験の前日・当日・試験後 `examDayInfo` `ExamDayCard`（ホームのいちばん上。目標の資格の試験日の前日＝やらないこと `EXAM_DONT`・持ち物 `EXAM_BRING`［王都の世界／資格の世界。受験案内で確かめる注記、自分で足せる］・苦手のトップ20 `examWeakTop`［sq-study-items の kind: examday］、当日＝最終確認と持ち物、試験後7日まで＝自己採点・手応え `EXAM_FEELS`・ひとこと → rpgActions.examDayAfter［100G・おつかれさまの会話］。rpg.examDay[`資格id:試験日`] = {chk, extra, after}）
- 2026年10月26日の追加：
  - 冒険の拠点のキャラ：立ち絵の下の「🔄 キャラを変える」で選ぶ（`BarCharPicker` を流用、設定 displaySettings.baseChar。`baseCharOf`。未設定・主人公は今までどおり進化の絵 StageHeroImg）。表示は WhiteHeroPortrait（ミニキャラは contain）
  - パーティ：`PartyQuick`（いまのパーティの顔と「編成を変える」→ PartyEditor）を拠点・世界タブのストーリー・試練の塔に。PartyEditor は仲間がいないとき `PartyNoAllies`（だれが何で加入するか `allyJoinText`）を出す（以前は何も出なかった）
  - 学びの地図のはじまりの街：中央の島（left 36%・top 18%・28%×33%）に街の段階の絵 townArt を楕円にぼかして重ね、看板を「はじまりの○○」（`townShownStage`）。地図の下のカード・TowerHead（stage）も街の段階の絵
  - 条文の鍛錬を資格ごとに：`RADIO_LAW_KEYS` `lawsInScope`（資格を選んでいれば王都の世界＝調査士の法令／無線の世界＝電波法など／そのほかの世界＝その世界の問題集に出る法令。「すべての資格」は全部）。LawCloze・LawListen・LawMastery（学習の分析の条文マップ）が使う。条文検索 LawSearchPanel は全部のまま
- 仲間の加入の作り直し（2026年10月26日）：はじめはリーネだけ。`ALLY_JOIN`（カイ＝ストーリー2話・リリア＝塔3階・カイト＝塔6階・ミラ＝ストーリー8話・セレナ＝塔12階・エズラ＝ストーリー15話・レイヴン＝塔20階・フィン＝守護者1体・ミレイ＝ストーリー30話・クロード＝塔35階）を、しくみを入れた時点の進み rpg.recruit.base（`recruitNow`＝sq・fl・cl）からの差で数える（`joinProg` `alliesJoined`。記録がないあいだは「いま」が出発点）。古い need・towerNeed・storyNeed は使っていない。加入の会話は StudyRPG の useEffect にまとめた（rpg.recruit.seen にない加入者に toast と出会いの会話。魔法学院は ACADEMY_MEET、ほかは intro＋cheer）。guardianFinish・towerFinish・storyQuestFinish の出会いは止めた。表示は `allyJoinText(a, r)`（あと何話・何階）・パーティ編成の下の `AllyUpcoming`。はじめからやり直すと recruit も消える（GAME_KEYS）。絆 rpg.bonds は残す
- 仲間と街・続けやすさ（2026年10月26日その2）：
  - 仲間の試練：条件に届いた仲間は「試練を待つ」（`alliesReady`＝`allyCondMet` で加入前）。加入は ALLY_JOIN の start・rpg.recruit.trial（試練に合格）・recruit.seen（これまでに加入）。試練は冒険の塔（AdventureTab の allyTrial）で TrialRun、得意分野から `ALLY_TRIAL_N`＝5問（`allyTrialPool`＝studyGroupPool、足りなければ範囲の世界の問題集）、`ALLY_TRIAL_PASS`＝6割で合格 → rpgActions.allyTrialFinish。呼び出しは合図 sq-ally-trial（`startAllyTrial`）。試練を待つようになったら1回だけお知らせ（recruit.readySeen）。AllyUpcoming・PartyQuick に「試練に挑む」
  - 次の仲間の予告 `AllyOmen`（ホームの TodayLink の下）：試練を待つ仲間か、あと1話・1階・1体の仲間の影
  - 仲間が街に住む：街の絵の上に加入した仲間の顔（`ALLY_TOWN_SPOTS` `ALLY_HOMES`）、タップでひとこと（`allyTownLine`）と1日1回のおみやげ（`ALLY_GIFT`＝15G・絆+2・街の経験値+5、rpgActions.townGift、rpg.townGift = {d, got}）
  - 連続学習のお守り：休息のランタン（restTicket）を、連続が切れそうな日に自動で使う（StudyRPG の useEffect、1日1回 rpg.charmDay。昨日から続けて学習していない日を、持っている数まで restDays に）。街の欄で `CHARM_MAX`＝2つまで買える（rpgActions.buyCharm、`CHARM_PRICE` 400G）
  - 冒険の月報 `monthlyReport`（勉強した日・時間・回答と正解・いちばんの日・周回・合格力・加わった仲間・街の段階）。月が変わってはじめて開いたとき（rpg.reportMonth。合格力の記録の useEffect）、魔王城の欄の「先月の月報を見る」
  - 建物のレベル：rpg.town.lv[建物]（Lv1〜`BUILD_LV_MAX`3）。効果は `buildFx`（`BUILD_LV_MULT` 1・1.5・2倍。townFx が使う）、強くする費用 `buildUpCost`（ゴールド2倍・4倍＋星霊石、街の段階＋2・＋4）、rpgActions.townUpgrade。街の絵の印に Lv
- RPGの強化（2026年10月26日その3）：
  - まちがえたときの「間違えた原因は？」の画面はやめた（AnswerPanel：✕でそのまま次へ。4択でまちがえた番号のときは正解を見せて「次へ」だけ。キーは 1・0・Enter）。2回目のまちがいで聞いていた自分ルールの入力欄も出ない（書いてあるルールの表示・書き直しは残る）。ERROR_TYPES・errTypes は古い記録のために残る
  - コマンドバトル（BossBattle）：行動ポイント ap（正解+1・◎+2、`AP_MAX`6）で `BOSS_COMMANDS`（渾身の一撃3AP×3・癒やしの祈り2AP 30%・守りの構え2AP＝次の2回ダメージ半分 guard・仲間と連携4AP×4）と上級職の専用の技。`cmdBase` `hitBoss`（障壁は4分の1、pierce・breakShield）`doCommand`
  - 上級職 `ADV_CLASSES`（天文の大魔導・聖盾の守護者・風弓の射手・光輝の英雄。専用の技 meteor・aegis・arrows・brave）`ADV_NEED`（Lv30・ボス討伐5回・500G）、rpg.classAdv[クラス]、rpgActions.promoteClass（転職の神殿の下）。getClassInfo の adv と rankName、getGrowthFx でクラスの効果1.5倍
  - ルーン `RunePanel`（拠点）：rpg.runes＝欠片id×3枠（`RUNE_FRAG`5・`RUNE_GOLD`100、rpgActions.setRune）。その科目（themeOf の mat）の問題で1つにつき `RUNE_DMG`15%（BattleStage の base・BossBattle の dmg）、ボス戦は会心率+`RUNE_CRIT`5%。`runeHits` `runeName` `runeRegions`
  - 魔物の仲間 `TamePanel`（拠点）：同じ種族を `TAME_AT`10体倒すと rpg.tamed[種族]（emitReward の kills のところ）。rpg.tameActive の魔物がボス戦で `TAME_EVERY`4連撃ごとに `TAME_DMG`25% 加勢。図鑑に🐾。`monSpecies`
  - 調合 `AlchemyPanel`（鍛冶場）：`BREW_RECIPES`（回復薬＝欠片3→consumables.potion・攻撃の巻物＝欠片5＋30G・弱体の薬＝欠片3＋星霊石1）。欠片は既存の takeFrags で多い順に。rpg.brew、rpgActions.brew・useBrew。ボス戦で巻物（×2.5）・弱体の薬（ボスの攻撃-30% weaken）
  - 迷いの森 `ForestCard`（クエストの欄）`ForestRun`：1日1回・`FOREST_FLOORS`6層、`forestMap`（日付から。1層は魔物／宝箱、最後は森の主）、部屋 `FOREST_ROOMS`（魔物3問6割・強敵5問8割・宝箱・泉・ふしぎな部屋・森の主6問6割）。戦闘は TrialRun（範囲の世界の buildPoolFromBanks）、負けや撤退でハート-1（`FOREST_HEARTS`3）、石碑の祝福で次の突破ライン-0.2。終わりに rpgActions.forestFinish（集めたゴールド・素材・EXP、rpg.forest = {d, best, clears, last}）
  - はじめからやり直すと classAdv・runes・tamed・tameActive・brew・forest も消える（GAME_KEYS）
- 資格の世界の本番モード（2026年10月20日）：世界の設定 exam（src/data/worlds.js。二陸特は法規12問［地域「電波法の港町」］・無線工学12問［「雷鳴の工房」］・60分・1問5点・各科目8問以上で合格・4択の勘 guess 0.25）。鍛錬の `WorldExamCard`（4択＝`choiceOf` のある問題だけを科目ごとに `worldExamPool`、CBT のように選んで最後に採点、🏳見直しの印、時間切れで自動採点。途中は `WORLD_EXAM.run` に残るのでタブを切り替えても続く。採点で1問ずつ sq-record-answer、結果は rpgActions.worldExamFinish → rpg.worldExam[世界id] = {log, best, passes}、合格で200G）。「いま試験なら」は `ExamChance` が資格の世界なら `WorldExamChance`（`worldPassChance`：科目の合格力から「n問中 pass 問以上」の確率、全科目の積）、ホームの最終決戦の行も同じ。最終決戦・模試の塔の「○問なら」は `examSizeOf`（王都は択一20問）。鍛錬は、王都の世界は今までどおり、資格の世界は本番モード＋世界の設定 drills の鍛錬（二陸特は計算ドリル・ブロック図）＋どの資格でも使える鍛錬（期限・数字、時間配分、条文の音読、教える、条文の穴埋め）だけ。組合せ問題は調査士の択一の形なので王都の世界だけ
- 無線工学の計算ドリル（2026年10月20日）：問題づくりは src/game/radiocalc.js（`RADIO_CALC_TYPES` 16種類［周波数と波長・デシベル（電力／電圧）・オームの法則・合成抵抗・電力・合成静電容量・周期・AMの変調度・FMの帯域幅・影像周波数・PCM・レーダーの距離・見通し距離・蓄電池・分流器と倍率器］、`makeRadioCalc(type, seed)`＝4択 {q, opts, correct, hint, steps}。電卓なしで解ける数字だけ、dB は「3dB≒2倍・10dB＝10倍」の組合せ、まちがいの選択肢はよくある計算ミスから）。画面 `RadioCalcDrill`（1セット10問、公式のヒント、苦手な種類から10問［3回以上解いて80%未満の種類］、選んだ種類は端末の sq-radiocalc-types）、記録 `logRadioCalc`（rpg.radioCalc = {stats, log}、正解1問5G・EXP3・カイとの絆）。世界の設定 drills に "radiocalc" がある世界（二陸特）で、鍛錬と計算の部屋のいちばん上に出す
- ブロック図の並べ替え（2026年10月20日）：データは src/data/blocks.js の `BLOCK_DIAGRAMS`（スーパヘテロダイン受信機・FM受信機・送信機・直接FM送信装置・PLL周波数シンセサイザ・PCM・直流電源回路の7つ。並び順は 資格対策\二陸特 の教材の記述にそろえた。各ブロックの役割 role と、使わないまぎらわしいブロック extra）。画面 `BlockDrill`（信号の流れの順にタップ、extra を押すと理由を表示、完成で全ブロックの役割）、記録 `logBlocks`（rpg.blocks[図id] = {n, best, perfect}、はじめてのノーミスで30G）。世界の設定 drills に "blocks" がある世界の鍛錬に出す
- 申請書の叩き込み（2026年10月20日。調査士の記述式）：カードは src/game/kjdeck.js の `buildDeck(years)`（本試験40年分の modelAnswers［登記の目的・原因及びその日付・添付書類・申請人・登録免許税］＋暗記チート `CHEAT_ROWS`［目的→原因・日付］＋申請書の場面 `SHINSEI_CASES`［目的・原因・申請の期限・添付情報］から約253枚。項目 `DECK_FIELDS`＝登記の目的／原因及びその日付／添付書類／申請人・税・期限）。答え方は mode：choice（4択。頭の「土地」「建物」だけ違う目的は並べない）・docs（添付書類を `docOptions` から全部選ぶ。足りない・余計を表示）・flip（めくって◎△✕）。周回は箱 b と次の日 nx（`deckNext`、`DECK_IV`＝1・3・7・14・30・60日、`DECK_MASTER`＝箱5以上で「覚えた」）、まちがいはその回の最後にもう一度（2回まで）＋翌日。全カードに1回ずつ正解で1周（300G）。画面 `TatakiDeck`（周回の部屋のいちばん上、王都の世界のとき。今日の叩き込み＝期限の来たカード＋新しいカード［1日10・20・30枚］／周回を進める＝この周でまだのカード20枚。項目・土地／建物で絞る。項目ごとの覚えた度合いの棒。「今日の計算」＝本試験の計算［rpg.calc2.past.res の last・ok から次の日］と計算の種類［rpg.calc2.typeLast＝{d, s:連続正解}］の期限が来たもの。計算の部屋へは合図 sq-open-past の {kind, id} か {types}［CalcTab がその種類から5問］）、今日タブ `TatakiDueCard`、ホームの行 tataki（`tatakiToday`）。合図 sq-open-past の {to:"laps", tataki:true} で今日の叩き込みを始める。記録 `deckAnswer` `deckSetNew` → rpg.kjDeck = {c:{カードid:{b,nx,n,ok,d0}}, newPer, newDay, lap:{no, ok, at:[1周した日]}, total}。本試験の計算と計算の問題集の周回の日も rpg.calc2.past.lapsAt・calc2.fixed.lapsAt に残す
- 2027年 合格ロードマップ（2026年10月20日）：中身は src/data/roadmap.js の `ROADMAP_2027`（ネットで調べた合格者の進め方と試験日程から作った約1,000時間・5つの時期［土台づくり 10/20〜12/31・基礎固め 1〜3月・記述式の実戦 4〜6月・答練・弱点つぶし 7〜8月・直前・仕上げ 9/1〜10/16］、時期ごとの目標・根拠・週の時間の目安・項目［kind：banks＝問題集を1周した日 clearHistory を数える（regions の地域か、選んだフォルダ）／tataki／dojo／pastcalc／calcfix／rehearsal／mocks／manual］と目標の周回数、試験日程の見込み milestones、出典 sources）。試験日は手帳の調査士の資格に2027年の試験日があればそれ（`rmExam`）、なければ 2027-10-17（予定）。利用者の書きこみは state.roadmap = {edits:{項目id:{target, manual, folders, hide}}, notes:{時期id}, custom:[{id, phase, label, target, unit, manual}]}（`updateRoadmap`）。進み具合 `roadmapProgress`（その時期の期間に回した数。問題集は対象の平均、道場は20年の平均、叩き込み・計算は周回の日＋いまの周の割合）、勉強時間 `rmHours`（studyLog）。画面：ホームの星詠みの書の下と周回の部屋の上に帯 `RoadmapBanner`（調査士の資格があるとき）、画面上部の「📅 計画」と帯の「計画をひらく」（合図 sq-roadmap-open）で全体 `RoadmapModal`（目標を＋−、自分で数える項目は＋1、問題集のフォルダを選ぶ、項目を外す・足す、時期のメモ）。法務省の受験案内が出たら milestones と exam を直す
- パーティ編成と群れの戦い（2026年10月20日）：編成 rpg.party = {members:[仲間id], byRegion:{地域:[仲間id]}}（`battleParty(state, region)`＝地域の編成→ふだんの編成→加入順。rpgActions.setParty）。画面 `PartyEditor`（冒険 → 世界 → 地図と仲間。3人まで、選んだ順に後ろの列、科目ごとの編成）。そろい効果 `partySynergy`（追撃・魔法・回復がそろうと「三役そろい」+10%、同じ役だけで+5%、全員絆Lv3以上で「絆の陣」+5%。ボス戦のダメージに掛ける）`ROLE_NAME`。群れ：問題の戦い（BattleStage）で、Lv10から控えの魔物1体・Lv25から2体（1体は👑リーダー、体力3。ふつうは2）`packSizeOf` `makePack`、BATTLE.pack = {list:[{id, m, hp, max, leader, fled}], target}。正解で前の魔物を倒し、狙った控えに1撃（会心・3連撃以上は全体）、リーダーを倒すと残りは逃げる、全滅で EXP（emitReward）と BATTLE.packWait＝2問休み。まちがいは控え1体につき+3の追い打ち。控えはタップで狙う
- 戦いの臨場感（2026年10月20日）：問題の戦いで、手強い魔物（rank elite）は行動を予告（「○○の構え！ 正解で防げ」、まちがえると被ダメージ1.5倍で fx.warned、正解で「🛡 防いだ！」fx.guarded）、被弾で画面ごと揺れる（sqbShake）、HP3割未満で画面のふちが赤く脈打つ（sqcLow。ボス戦も）。ボス戦はHPが半分を切ると1回だけ第2形態（BossBattle の phase2：攻撃1.2倍、BossArena で色が変わり紫のオーラ・「第2形態」の文字 sqcPhase）。CSS は BATTLE_CSS の sqc〜
- 今日やること3つ（2026年10月20日）：ホームのロードマップの帯の下に `TodayThree`（`t3Status` `t3Pick`＝記述式の復習日・叩き込み・今日の復習・週末で今月まだなら本番リハーサル日・ロードマップの遅れ・本試験の計算から3つ。朝に rpg.today3={d, items} に残し、`t3Done` で自動の✓、`t3Go` で各画面へ）。本番リハーサルの記録に始めた時間 h、RehearsalCard に時間帯ごとの成績 `RehearsalBands`
- 弱点集（自動、2026年10月21日。周回の部屋の今日のタスクの下）：`weakBook` `WeakBook` `WeakBookPrint`。択一で2回以上まちがえた問題（勉強の範囲の世界、科目＝themeOf の地域ごと。ちがう日に `WEAK_GRAD`＝3回続けて正解［correctDayStreak］で卒業）・叩き込みでまちがえたカード（箱2以下）・計算（3回以上で正解率7割未満の種類、前回まちがえた本試験の計算、無線工学の計算）・記述式の欄（自己採点の平均6割未満）。「解く」は sq-study-items の kind: "weakbook"、カードは合図 sq-open-past の {to:"laps", tataki:true, ids}（TatakiDeck の begin が ids のカードだけで始める）。印刷は直前見直しノートと同じしくみ（body.sq-printing）
- 成長の年表（2026年10月21日。ステータス画面の記録書の下）：`growthTimeline`（学習の連続日数 `TL_STREAK`・勉強時間の合計 `TL_HOURS`・問題集の周回［同じ日はまとめる］・記述式のはじめての答案と年度ごとの80点・叩き込み／本試験の計算／計算の問題集の周回・本番リハーサル・模試・資格の世界の本番モードの合格・合格力の節目 `TL_POWER`。いちばん古い記録の日を「冒険のはじまり」に）`GrowthTimeline`、「物語として読む」は `timelineTalk`（大きな節目を古い順に主人公が語る。StatusTab に onTalk＝rpgActions.openTalk）
- 自分ルールを仲間が話す（2026年10月21日）：ホームの吹き出し `MentorBubble` の4回に1回（2番目）に `ruleQuote`（`myRules`＝ルールのある問題を、復習の日が3日以内・まちがいの多い順に12件。加入した仲間が順番に `RULE_SAYS` で）。今日のふりかえり `reflectionTalk` でも、今日まちがえた問題にルールがあれば仲間が読み上げる。デモの架空データにもルールを入れた（demo-data.js）
- 周回と計算の強化（2026年10月21日）：
  - 高速周回：`isSettled`（最近3回とも◎・ちがう日に2日以上・秒数 `FAST_SEC`＝10秒以内・⭐でない）の問題を、一問一答の開始画面 SessionConfig の「⚡ 高速周回」で飛ばす（`FAST_SPOT`＝1割は抜き打ち）。QStudySession の config.fast、飛ばした数は `fastSkip` → clearHistory の fast。デモの架空データに定着した問題を入れた
  - PCのキーボードで答える：`useAnswerKeys`（入力欄・変換中・Ctrl などは無視）。RevealButton はスペース／Enter で答えを見る・4択は数字、AnswerPanel は 1✕ 2△ 3◎、✕のあとは 1〜4＝原因・0／Enter＝選ばずに次へ・Esc＝戻る。案内は `KeyHint`（`HAS_KB`＝マウスのある端末だけ）
  - 電卓の型を磨く `CalcCraft`（本試験の計算の欄の下。pastcalc.json の手順から `craftTasks`）：最短手順 keys（PAST_PAD で自分の手順を組み、`keyDiff`＝最長共通部分列で模範と1打ずつ比べる）・変数メモリ mem（`memTrace` で各手順の直前のメモリ表を作り、[ALPHA] の次の変数を「？」に）・手順の組み立て build（区切りの手順の出力 o を正しい順に）。記録 `logCraft` → rpg.calc2.craft
  - 本試験の土地の計算に区間タイム `LapSplits`（区切りごとに「済」、工程の種類は `pastSecType`＝PAST_DRILL_TYPES）と検算 `VerifyToggle`（建物も）。logPastCalc の splits・verified → rpg.calc2.past.stepT {工程:{n,sec}}・verify {y:{n,ok}, n:{n,ok}}（logPastCalc は past のほかの項目を残すよう ...p を入れた）。一覧に `PastHabits`（工程ごとの平均時間・検算した回としなかった回の正解率）
  - 速さ×正確さの4分類 `speedAccuracy` `SpeedAccuracyView` `SA_KINDS`（学習の分析のタブ。最近5回の正解率8割・秒数の中央値が slowSec 未満）。同じ画面に時間帯ごとの正答率 `HourBands`（回答のたびに `hourBump` が player.hourStats[時] = {n, ok} を数える。recordAnswer など5か所）
  - 試験までの周回の見込み `lapForecast` `LapForecast`（周回の部屋。clearHistory の日付から1周の日数、目標の周回数 displaySettings.lapGoal＝`LAP_GOALS`）
  - 論点ごとの横断周回 `rontenList` `RontenLap`（周回の部屋。lawIndex の条文のうち、2つ以上の問題集に合わせて3問以上。条文の順に sq-study-items の kind: "ronten"、finishSpecial で rpg.ronten = {lap, done:{法令:条}, at}、全部で1周300G）
  - すきま時間セット `GapTime` `gapItems` `GAP_SETS`（ホームの今日やること3つの下。3分8問・10分25問・30分70問、苦手3割＋忘れかけ forgettingItems、kind: "gap"）
- 冒険・バトル演出の強化（2026年10月21日）：
  - 問題の戦い（BattleStage の battleBus の処理）。AnswerPanel の emitBattle に errType・sec を足した
    - 状態異常 `STATUS` `STATUS_OF_ERR`（混同→混乱：威力半分・ケアレス→毒：1回ごとにHP-4・読み違い→暗闇：手強い魔物の予告が見えない。◎で治る。BATTLE.status）
    - 先制 `QUICK_SEC`＝10秒以内の◎で追加の一撃
    - 属性の弱点 `monWeak`（魔物ごと。battlefx.jsx の heroAttackFor に weak、魔法の武器ほど弱点の属性を出しやすい。`ELEMENTS` `EL_NAME` `EL_ICON`）で1.5倍
    - 必殺ゲージ BATTLE.gauge（◎20・△10・先制+5、`GAUGE_MAX`）→「必殺技を構える」で BATTLE.ultArmed、次の正解でスターライトノヴァ（3倍・群れ全体）
    - 撃破のフィニッシュ演出 fx.finish（必殺！／殲滅！／撃破！、sqcFinish・sqcSlow）
    - 仲間の掛け合い `ALLY_BARKS` `allyBark`（絆Lv3以上で親しい言葉）
    - 宝箱 `CHEST_TIERS` `rollChest` `TreasureChest`（群れの全滅で BATTLE.chest、ボスに勝つと結果画面に。開けると emitReward の gold・mats）
  - 現実の時間と季節 `SkyLayer` `skyNow`（朝・昼・夕・夜の色、冬の雪・3〜4月の桜・6月の雨・10〜11月の落ち葉。問題の戦いとボス戦）
  - ボス戦：挑発 `bossTaunt`（出題の中で苦手がいちばん多い地域を名指し、その地域の正解は「言い返した！」1.5倍）。障壁 shield（HPが半分を切ると張る。15問以上の戦いは7割と3.5割。◎を2回［終盤のボスは3回］続けると砕けて2倍、それまではダメージ4分の1・仲間の加勢も通らない）。BossArena に shield・taunt
  - 無限回廊 `EndlessCard` `EndlessRun`（クエストの欄。gapItems の問題が続き、正解で1階。BATTLE.dmgMul＝1階ごとに `ENDLESS_GROW`＝4%強く、ふんばったら終わり。rpgActions.endlessFinish → rpg.endless = {best, n, log, bestAt}）
  - 今日のハイライト `TodayHighlight`（ステータス画面）：emitReward の hl を `hlMerge` が rpg.hl に（討伐・最高連撃・最大ダメージ・先制・弱点・群れの全滅・必殺技・はじめて倒した魔物）。日が変わると rpg.hlLog、自己ベスト rpg.hlBest、10連撃以上の更新 rpg.hlRec は成長の年表に
- キャラ絵の追加とクエスト失敗（2026年10月21日、イラストフォルダの ChatGPT 画像 2026年10月21日 22_27〜22_42）：
  - ミニキャラ public/art/chibi/{luna,kaito,raven,lilia,ezra,fin,mirei,claude}.webp（紺の背景を透明にした。`CHIBI`）。動く絵のない仲間は戦いの後ろの列でミニキャラが動く（battleParty の chibi、`backRow` `BackRowAllies`）、パーティ編成は `PartyFace`
  - 新しい仲間（`ALLIES` の group: "story"、ストーリークエストでクリアした話の数 `storyClears` が storyNeed で加入。出会いの会話は storyQuestFinish）：リリア（癒しの神官・回復。設定画なし、絵はミニキャラ。名前と役は仮）5話・エズラ（調査士）15話・フィン（狩人）30話・ミレイ（錬金術師）50話・クロード（機工師）75話。立ち絵 public/art/ally-{ezra,fin,mirei,claude}.jpg は設定画から切り出し。技は ALLY_SKILLS。仲間の欄に「冒険の仲間」
  - カイトの設定画（カイト・アークブレイド 剣士）はまだ使っていない（いまの立ち絵のまま）
  - ストーリークエストはふんばり無し（BATTLE.noRevive）：HPが0で BATTLE.down → クエスト失敗（記録は残さない、復習記録は残る）。魔物の攻撃はストーリーの進みで強くなる `questDmgMul`（クリアした話1つで `QUEST_GROW`＝8%、40話で4.2倍）。戦いの上に「1問のミスで約○ダメージ・あと約○回で力尽きる」。無限回廊も同じ noRevive
- 整理（2026年10月22日）：討伐依頼書は弱点集にまとめた（WeakBook の「卒業した賞金首」で claimBounty、今日タブは入口 `WeakLink`。`BountyBoard` は使っていない）。今日タブのふりかえり系（記憶の通知表・処方箋・復習の予報・記憶の天気図）は `Fold`（たためる欄、開閉は端末の sq-fold-{k}）。ホームは今日タブと同じ道しるべの行と立ち絵の横のメニューをはじめは隠す（`HOME_HIDE_V2`。設定で表示を変えると homeLayout.v2 が付き、本人の選んだとおり）。画面上部は「🗂 データ ▾」（クラウドへ保存・クラウドから読み直す・ファイルに書き出す・ファイルから読み込む）と「⚙ 設定」（もとの「Aa 文字」）・計画・条文・ログアウト
- まちづくり（2026年10月22日。はじまりの街のホームのいちばん上 `TownPanel`）：段階 `TOWN_STAGES`（10段階：小屋・開拓地・集落・村・宿場町・町・城下町・街・都・王都）は「街の経験値」rpg.town.xp だけで決まる（0/300/1000/2500/5000/9000/15000/24000/36000/52000。キャラのレベルとは別）。街の経験値は `townGain`：回答＋1（正解＋2。hourBump と同じ5か所）・問題集を1周＋30（incrementBankClears）・学習2分ごとに＋1（stopTimer・addManualLog）。住人（定着×1＋正解したことのある問題×0.2）は見た目だけ。v の無い古い記録は小屋から。人口＝定着した問題（fs.s≥21）×1＋正解したことのある問題×0.2（`townStatus`）。段階が上がると showEvolution「街の発展」と会話（StudyRPG の useEffect。rpg.town.stage が未設定なら小屋から一度に発展）。建物 `TOWN_BUILDINGS`（図書館・測量所・宿屋・学舎・時計台・市場・鍛冶屋・王城。段階・条件・ゴールドと素材で建てる、効果は `townFx` → getRpgBonuses）。毎日の税収 `townTax`（前の日に学習で満額・なければ3割、市場1.5倍、宿屋で回復薬）。操作 rpgActions.townTax・townBuild・townSetStage、記録 rpg.town = {stage, built:{id:日付}, taxDay}。絵は public/art/town/stage1〜10.webp（`TownImage`、16:8 で見せる。2026年10月22日に10枚そろった［イラストフォルダの 17_46_12・17_50_11・17_58_26・18_05_44・21_52_51・22_07_51・22_21_05・22_25_25・22_31_48・22_59_11 の順に stage1〜10］。読み込めないときは学びの地図のはじまりの街を仮に。指示文 docs/まちづくりの絵の指示文.md）
- はじめからやり直す（2026年10月22日。⚙ 設定のいちばん下 `ResetPanel`）：先に makeBackup で控えを取ってから `resetProgress(s, parts)`。parts＝game（player のレベル・経験値・称号と、rpg の `GAME_KEYS`＝ゴールド・装備・持ち物・スキル・仲間と絆・ストーリー・塔・ボスなど）・town（街を小屋・経験値0）・laps（問題集の clears・clearHistory、学習計画の done を空にして start を今日に、叩き込み・計算・論点の周回）。学習の記憶（FSRS・ah・正解と不正解の数）と、記述式・計算の成績・参考書・模試・合格力などの学習の記録は残す。cloudLoadFailed 中はリセットしない
- 令和9年度の目標（上位1%、2026年10月22日）：資料は src/data/examstats.js（`R7_PM`＝令和7年度 筆記試験 総合得点別員数表の午後の部［法務省の発表資料・利用者のPDF。その点以上の人数 cum、合計2,196人］と、基準点 択一37.5・記述32.5・合格点76.0・平均［予備校の記事］。`ELITE_GOAL`＝択一47.5［20問中19問］・記述45.0・合計92.5［R7なら12位・上位0.55%。上位1%のラインは92.0］。`rankOf` `lineOf`）。ホームのいちばん上（星詠みの書の下）に `EliteGoalCard`（調査士の資格があるとき。いまの実力は `latestExamScore`＝本番リハーサルの択一＋記述か模試の点の新しいもの、R7なら何位か・目標までの差）。令和8年度の表が出たら examstats.js に足して差し替える
- CSVの一括取り込み（2026年10月19日）：ImportPanel のファイル選択は multiple。2つ以上選ぶと `handleFiles`（ファイル名の順、1ファイル＝問題集1つ、名前はファイル名・年度は `yearFromFileName`［令和・平成・R・H＋数字、4けた＋年。「01」のような番号は年度にしない］、資格とフォルダは全部に同じもの）。同じ名前の問題集がすでにあるファイルは最初から☑を外す。CSV の読み方は `csvRowsToQuestions` `parseCsvFile`（1つのときと共通）
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
- 白金テーマの主人公（少女）の進化段階の絵（指示文は docs/進化の絵の指示文.md。絵ができたら入れる）
- 弱点リストの「論点分析（AI）」は api.anthropic.com を直接呼ぶため GitHub Pages では動かない → 代替が必要
