// デモモードの見本帳：白金テーマのアイコンを一覧で表示する（http://localhost:5174/studyquest/demo/icons.html）
import React from "react";
import ReactDOM from "react-dom/client";
import { GameIcon, RPG_ITEMS, RPG_CONSUMABLES, RPG_BOSSES, DIFFICULTIES, WHITE_CSS } from "../src/App.jsx";

const Cell = ({ label, sub, children }) => (
  <div className="cell">{children}<div style={{ marginTop: 4, fontWeight: 700 }}>{label}</div>{sub && <div className="em">{sub}</div>}</div>
);
const size = Number(new URLSearchParams(location.search).get("size")) || 64;

function Sheet() {
  return (
    <>
      <style>{WHITE_CSS}</style>
      <h2>装備</h2>
      <div className="grid">{RPG_ITEMS.map((it) => <Cell key={it.id} label={it.name} sub={`${it.rarity} ${it.icon}`}><GameIcon ch={it.icon} id={it.id} rarity={it.rarity} size={size} /></Cell>)}</div>
      <h2>道具</h2>
      <div className="grid">{RPG_CONSUMABLES.map((c) => <Cell key={c.id} label={c.name} sub={c.icon}><GameIcon ch={c.icon} size={size} /></Cell>)}</div>
      <h2>タスクの難しさ</h2>
      <div className="grid">{Object.entries(DIFFICULTIES).map(([k, d]) => <Cell key={k} label={d.label} sub={d.icon}><GameIcon ch={d.icon} size={size} /></Cell>)}</div>
      <h2>ボス</h2>
      <div className="grid">{RPG_BOSSES.map((b) => <Cell key={b.id} label={b.name} sub={b.icon}><GameIcon ch={b.icon} id={b.id} size={size} boss /></Cell>)}</div>
    </>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<Sheet />);
