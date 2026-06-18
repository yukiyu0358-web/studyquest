import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages: https://yukiyu0358-web.github.io/studyquest/ に配信するため
// base をリポジトリ名に合わせる。これを誤ると本番で白画面になる。
export default defineConfig({
  base: "/studyquest/",
  plugins: [react()],
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 1500,
  },
});
