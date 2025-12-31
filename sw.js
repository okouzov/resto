// v20251231010818
const CACHE = "resto-20251231010818";
const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

// Install: cache core
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)));
  self.skipWaiting();
});

// Activate: delete old caches
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith("resto-") && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Fetch strategy:
// - Navigations (index.html): Network First (fallback to cache) to avoid stale UI
// - Static assets: Cache First
self.addEventListener("fetch", (e) => {
  const req = e.request;

  // Only handle GET
  if (req.method !== "GET") return;

  // HTML navigations
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: "no-store" });
        const cache = await caches.open(CACHE);
        cache.put("./index.html", fresh.clone());
        return fresh;
      } catch (err) {
        const cached = await caches.match("./index.html");
        return cached || Response.error();
      }
    })());
    return;
  }

  // Other requests
  e.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: true });
    if (cached) return cached;
    try {
      const res = await fetch(req);
      const cache = await caches.open(CACHE);
      cache.put(req, res.clone());
      return res;
    } catch (err) {
      return cached || Response.error();
    }
  })());
});
