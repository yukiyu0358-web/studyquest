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

公開の流れ：`git add -A` → `git commit -m "…"` → `git push` → `npm.cmd run build` → `npm.cmd run deploy`
- GitHub Pages の公開元は **gh-pages ブランチ**。`.github/workflows/deploy.yml` はあるが、Pagesの設定が「GitHub Actions」ではないため使われていない。
- `npm audit fix --force` は実行しない（部品が大きく入れ替わり動かなくなるおそれ）。
- 部品を追加したら、もう一方のPCでも `npm.cmd install` が必要なことを利用者に伝える。

## 技術構成

- React 18 + Vite 5（`vite.config.js` の `base: "/studyquest/"`）
- Firebase **compat版**（Auth + Firestore、`src/firebase.js`）。オフライン永続化あり。
- Firebase は **Spark（無料）プラン**。Cloud Storage は使えないため、画像は圧縮して Firestore に保存している。
- Tailwind は CDN（`index.html`）。CSS変数とベースのスタイルも `index.html` の `<style>`。
- PapaParse（CSV取込）、ts-fsrs（Ankiと同じFSRSアルゴリズム）。

## ファイル構成

- `src/App.jsx`：**全画面・全機能が1ファイル**（約7,600行・約1MB）。500KB超のため Babel の "deoptimised the styling" という注意が出るが無害。
- `src/firebase.js`：Firebase初期化。`src/main.jsx`：起動。
- `public/hero.jpg`：クラシックテーマの立ち絵（少年）。
- `public/white-title.jpg`／`public/white-hero.jpg`：白金テーマのタイトル・背景の絵と、メニューの立ち絵（白髪の少女）。
- `public/laws/*.json`：条文データ（不動産登記法・令・規則、民法、区分所有法、土地家屋調査士法）。
- `scripts/fetch-laws.mjs`：e-Gov法令API v2 から条文を取得するスクリプト。

## データ構造（Firestore）

- `userdata/{uid}`：`{ state: <問題集以外の全データ>, updatedAt }`
- `userdata/{uid}/questionbanks/{bankId}`：問題集ごと（問題の配列を含む。**1ドキュメント1MBの上限**に注意）
- `userdata/{uid}/sessions/current`：学習の途中再開データ
- `userdata/{uid}/images/{imageId}`：問題に付けた画像（圧縮した dataURL）
- `userdata/{uid}/reviewlogs/{YYYY-MM-DD}`：FSRSの回答履歴（arrayUnion で追記）
- セキュリティルール：`match /userdata/{userId}/{document=**}` で本人のみ読み書き可。サブコレクションを増やしてもこれでカバーされる。

state の主なキー：`player` / `qualifications` / `tasks` / `studyLog` / `folders` / `studyNotes` / `sessionResume` / `timer` / `srSettings` / `displaySettings`（qFont, qSize, theme, showTitle, themeV）/ `rpg`（gold, inventory, equipped, consumables, bossWins, classId, pet, seen など）

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
- iPhone・iPad への通知、試験日からの逆算プラン、復習の予測グラフ
- 科目ごとのジョブレベル、知識の城、モンスター図鑑
- 白金テーマの主人公（少女）の進化段階の絵（冒険・ステータスの進化キャラは今は少年のドット絵）
- 弱点リストの「論点分析（AI）」は api.anthropic.com を直接呼ぶため GitHub Pages では動かない → 代替が必要
- Tailwind を CDN から PostCSS 構成へ
