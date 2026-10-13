// Tailwind の設定（以前は index.html で CDN から読み込んでいた。ビルドに取り込んで、電波がなくても見た目がくずれないようにした）
// 注意：見た目の指定（className）は、組み立てずに "grid-cols-2" のようにそのまま書くこと（`grid-cols-${n}` は拾われない）
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}", "./demo/**/*.{js,jsx}"],
  theme: { extend: {} },
  plugins: [],
};
