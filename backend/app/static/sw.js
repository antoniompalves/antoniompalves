// Caches the app shell so it opens instantly; API calls always go to the network.
const SHELL = "recipebox-v1";
const ASSETS = ["/", "/static/app.js", "/static/app.css", "/static/manifest.webmanifest", "/static/icon.svg"];
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
