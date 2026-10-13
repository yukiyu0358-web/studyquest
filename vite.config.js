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
    rollupOptions: {
      output: {
        // めったに変わらない部品（React・Firebase など）を別のファイルに分ける。
        // 公開し直しても、この部分は端末に残っているものがそのまま使えるので、2回目以降の起動が速くなる
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          // 通知の部品は、通知を申し込むときだけ読み込む（ふだんの起動には含めない）
          if (/messaging|installations/.test(id)) return "firebase-messaging";
          if (id.includes("firebase") || id.includes("@firebase")) return "firebase";
          if (id.includes("react")) return "react";
          return "vendor";
        },
      },
    },
  },
});
