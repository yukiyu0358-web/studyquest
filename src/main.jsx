import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

// ホーム画面アプリ用の保管係（サービスワーカー）。公開版だけで使う（試運転・デモでは使わない）
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: "none" }).then((reg) => reg.update()).catch(() => {});
  });
}
