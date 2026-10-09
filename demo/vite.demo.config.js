import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import path from "node:path";

// ============ デモモード（見た目の確認専用） ============
// `npm.cmd run demo` → http://localhost:5174/studyquest/
// src/firebase.js の代わりに demo/firebase-mock.js を読み込み、架空のデータで動かす。
// 本物のクラウドには一切つながない。公開用のビルド（npm.cmd run build）には入らない。
const here = path.dirname(fileURLToPath(import.meta.url));
const mock = path.join(here, "firebase-mock.js");

export default defineConfig({
  root: path.join(here, ".."),
  base: "/studyquest/",
  plugins: [
    react(),
    {
      name: "studyquest-demo-firebase",
      enforce: "pre",
      resolveId(source, importer) {
        if (importer && /[\\/]src[\\/]/.test(importer) && /^\.\/firebase(\.js)?$/.test(source)) return mock;
        return null;
      },
    },
  ],
  server: { port: 5174, strictPort: true },
});
