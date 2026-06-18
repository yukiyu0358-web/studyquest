# Study Quest (Vite版)

ブラウザ内Babel変換から Vite ビルド構成へ移行したもの。

## 開発
```
npm install
npm run dev      # http://localhost:5173/studyquest/
```

## 本番ビルド
```
npm run build    # dist/ に出力
npm run preview  # dist をローカル確認
```

## デプロイ（GitHub Pages）
2通り用意してある。どちらか一方を使う。

### A. GitHub Actions（推奨・自動）
main に push すると .github/workflows/deploy.yml が自動でビルド＆デプロイ。
事前に GitHub リポジトリの Settings > Pages > Source を
「GitHub Actions」に設定すること。

### B. gh-pages パッケージ（手動）
```
npm run build
npm run deploy   # dist を gh-pages ブランチへ push
```
リポジトリの Settings > Pages > Source を
「Deploy from a branch」→ gh-pages / (root) に設定。

## 構成メモ
- base は vite.config.js で "/studyquest/" に設定（リポジトリ名と一致必須）
- Firebase は compat版を維持（src/firebase.js）。modular化は今後の段階的課題
- Tailwind は CDN のまま（index.html）。PostCSS化も今後の課題
- 全UIコードは src/App.jsx（今後コンポーネント分割予定）
