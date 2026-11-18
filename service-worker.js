/* =============================================================================
 * service-worker.js — Offline caching for the Fitness Life PWA
 * -----------------------------------------------------------------------------
 * Cache-first strategy for the app shell so the app loads instantly and works
 * offline. Bump CACHE_VERSION when you change any cached asset to force clients
 * to pick up the update.
 * ========================================================================== */

const CACHE_VERSION = "fitlife-v9";

// Asset URLs carry ?v=6 so they match exactly what index.html requests
// (and so old cached copies from the previous build are bypassed).
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./styles.css?v=6",
  "./data.js?v=6",
  "./db.js?v=6",
  "./store.js?v=6",
  "./ui.js?v=6",
  "./auth.js?v=6",
  "./trainee.js?v=6",
  "./trainer.js?v=6",
  "./app.js?v=6",
  "./hero.jpg",
  "./coach.jpg",
  "./avatar0.jpg?v=6",
  "./avatar1.jpg?v=6",
  "./avatar2.jpg?v=6",
  "./avatar3.jpg?v=6",
  "./avatar4.jpg?v=6",
  "./avatar5.jpg?v=6",
  "./avatar6.jpg?v=6",
  "./avatar7.jpg?v=6",
  "./avatar8.jpg?v=6",
  "./avatar9.jpg?v=6",
  "./icon-192.png",
  "./icon-512.png",
];

// Install: pre-cache the app shell.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: clean up old caches (this also evicts the old swim-app cache).
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first, falling back to the network (and caching new GETs).
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (
            response &&
            response.status === 200 &&
            request.url.startsWith(self.location.origin)
          ) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
