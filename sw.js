// Study Quest のサービスワーカー（ホーム画面アプリ用の保管係）
// ・ページ本体（index.html）は「まずネットから」。つながらないときだけ保管していたものを出す（公開した新しい版がすぐ届くように）
// ・絵・プログラム・条文データなどは「保管していたものをすぐ出し、裏で新しいものに入れ替える」
// ・Firebase など、ほかのサイトへの通信には一切さわらない（学習記録の保存はこれまでどおり）
const CACHE = "sq-cache-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
        .catch(() => caches.match(req).then((r) => r || caches.match(self.registration.scope)))
    );
    return;
  }
  e.respondWith(
    caches.open(CACHE).then((c) => c.match(req).then((hit) => {
      const net = fetch(req).then((res) => { if (res && res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }))
  );
});
