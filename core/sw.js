const CACHE = {
  RUNTIME: "runtime",
};

self.addEventListener("activate", (event) => {
  const currentCaches = Object.values(CACHE);
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => cacheNames.filter((cacheName) => !currentCaches.includes(cacheName)))
      .then((cachesToDelete) => Promise.all(cachesToDelete.map((cacheToDelete) => caches.delete(cacheToDelete))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.url.startsWith(self.location.origin))
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return caches
          .open(CACHE.RUNTIME)
          .then((cache) => fetch(event.request).then((response) => cache.put(event.request, response.clone()).then(() => response)));
      }),
    );
});
