// Caches the app shell so it opens instantly; API calls always go to the network.
const SHELL = "gohan-v64";
const ASSETS = ["/", "/static/app.js", "/static/motion.js", "/static/social.js", "/static/timers.js", "/static/handsfree.js", "/static/app.css", "/static/manifest.webmanifest", "/static/icon.svg"];
self.addEventListener("install", e => e.waitUntil(caches.open(SHELL).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== SHELL).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname === "/" || url.pathname.startsWith("/static/")) {
    // network-first so updates show up, cache as offline fallback
    e.respondWith(fetch(e.request).then(r => {
      const copy = r.clone(); caches.open(SHELL).then(c => c.put(url.pathname === "/" ? "/" : e.request, copy)); return r;
    }).catch(() => caches.match(url.pathname === "/" ? "/" : e.request)));
  }
});

// ---------------------------------------------------------------- push notifications
self.addEventListener("push", e => {
  let msg = {};
  try { msg = e.data ? e.data.json() : {}; } catch { msg = { title: "Gohan", body: e.data?.text() }; }
  const opts = {
    body: msg.body || "",
    icon: "/static/icon-192.png",
    badge: "/static/badge-72.png",          // monochrome glyph for Android's status bar
    tag: msg.tag,                           // same tag replaces the previous notification
    renotify: !!msg.tag,
    image: msg.image,                       // cook photos (Android/desktop; iOS ignores)
    data: { url: msg.url || "/" },
    lang: "pt-PT",
  };
  e.waitUntil(Promise.all([
    self.registration.showNotification(msg.title || "Gohan", opts),
    // badge on the Home Screen icon where supported (iOS 16.4+ web apps, Chromium)
    self.navigator.setAppBadge ? self.registration.getNotifications().then(n => self.navigator.setAppBadge(n.length + 1)).catch(() => {}) : null,
  ]));
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const target = new URL(e.notification.data?.url || "/", self.location.origin).href;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const win = wins.find(w => new URL(w.url).origin === self.location.origin);
    if (win) {
      await win.focus();
      win.postMessage({ type: "navigate", url: target });   // the page routes itself (hash change)
      return;
    }
    await self.clients.openWindow(target);
  })());
});

// Browsers may rotate subscriptions; re-register with the server when that happens.
self.addEventListener("pushsubscriptionchange", e => {
  e.waitUntil((async () => {
    const sub = e.newSubscription || await self.registration.pushManager.subscribe(e.oldSubscription.options);
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    clients.forEach(c => c.postMessage({ type: "resubscribe", subscription: sub.toJSON() }));
  })());
});
