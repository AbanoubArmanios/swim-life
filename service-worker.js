/* =============================================================================
 * service-worker.js — Offline caching for the Fitness Life PWA
 * -----------------------------------------------------------------------------
 * Cache-first strategy for the app shell so the app loads instantly and works
 * offline. Bump CACHE_VERSION when you change any cached asset to force clients
 * to pick up the update.
 * ========================================================================== */

const CACHE_VERSION = "fitlife-v7";

// Asset URLs carry ?v=5 so they match exactly what index.html requests
// (and so old cached copies from the previous build are bypassed).
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./styles.css?v=5",
  "./data.js?v=5",
  "./db.js?v=5",
  "./store.js?v=5",
  "./ui.js?v=5",
  "./auth.js?v=5",
  "./trainee.js?v=5",
  "./trainer.js?v=5",
  "./app.js?v=5",
  "./hero.jpg",
  "./coach.jpg",
  "./avatar0.jpg",
  "./avatar1.jpg",
  "./avatar2.jpg",
  "./avatar3.jpg",
  "./avatar4.jpg",
  "./avatar5.jpg",
  "./avatar6.jpg",
  "./avatar7.jpg",
  "./avatar8.jpg",
  "./avatar9.jpg",
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
