/* Service worker: keeps Quest Belajar working offline.
   Strategy: serve from cache first, refresh the cache in the background,
   so an update reaches the tablet on the next launch.
   Bump CACHE when you change files and want old copies cleared. */
const CACHE = "qb-v1";
const CORE = [
  "./", "index.html", "quests.js", "manifest.webmanifest",
  "assets/fonts/baloo2-latin.woff2", "assets/fonts/nunito-latin.woff2",
  "assets/icons/icon-192.png", "assets/icons/icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

/* The page sends the list of per-quest images and audio; cache whichever exist. */
self.addEventListener("message", e => {
  if (!e.data || e.data.type !== "warm") return;
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(e.data.urls.map(u =>
    c.match(u).then(hit => hit || fetch(u).then(r => { if (r.status === 200) return c.put(u, r); }).catch(() => {}))
  ))));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then(res => {
      if (res.status === 200) c.put(req, res.clone());
      return res;
    }).catch(() => hit || Response.error());
    return hit || net;
  }));
});
