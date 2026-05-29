// Minimaler Service Worker — nur damit Chrome/Edge den Install-Prompt zeigen.
// Bewusst KEIN Caching: API-Antworten sollen immer frisch sein (Live-Status),
// Karten-Tiles werden vom Browser eh gecacht.
//
// Falls später Offline-Funktion gewünscht: hier z. B. Cache-First für
// /icon-512.svg, manifest.json und statische Assets einbauen.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // intentionally empty — required for install-prompt eligibility
});
