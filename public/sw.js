// PelisStream Service Worker for Smart TV PWA Standalone Support
const CACHE_NAME = "pelisstream-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Let network handle streaming iframe and API requests directly
  return;
});
