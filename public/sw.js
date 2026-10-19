// Study Quest のサービスワーカー（ホーム画面アプリ用の保管係）
// ・ページ本体（index.html）は「まずネットから」。つながらないときだけ保管していたものを出す（公開した新しい版がすぐ届くように）
// ・絵・プログラム・条文データなどは「保管していたものをすぐ出し、裏で新しいものに入れ替える」
// ・Google Fonts（文字の形）だけは保管して、電波がなくても文字がくずれないようにする
// ・Firebase など、そのほかのサイトへの通信には一切さわらない（学習記録の保存はこれまでどおり）
const CACHE = "sq-cache-v6";
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (FONT_HOSTS.includes(url.hostname)) {
    // 文字の形のファイルは一度取ったら変わらないので、保管していればそれを使う
    e.respondWith(caches.open(CACHE).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => { if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone()); return res; }))));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req, { cache: "no-store" }).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
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

// ── 通知（毎日のお知らせ）：届いた通知を表示し、押すとアプリを開く ──
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : "" }; }
  const m = d.data || d.notification || d; // Firebase から届く形にも対応
  e.waitUntil(self.registration.showNotification(m.title || "Study Quest", {
    body: m.body || "",
    icon: "icon-v2-192.png",
    badge: "icon-v2-192.png",
    tag: m.tag || "sq-daily",
    data: { url: m.url || self.registration.scope },
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ws) => {
    for (const w of ws) if (w.url.startsWith(self.registration.scope) && "focus" in w) return w.focus();
    return self.clients.openWindow(url);
  }));
});
