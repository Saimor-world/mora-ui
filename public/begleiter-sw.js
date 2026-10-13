/* Saimôr Begleiter – Service Worker. Push-Texte sind absichtlich ohne Inhalt:
   Details sieht man erst nach dem Entsperren und Face ID in der App. */
const SHELL = 'begleiter-v1';
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(['/begleiter', '/begleiter.webmanifest', '/begleiter-icon.svg'])).catch(() => null));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== SHELL).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.pathname.startsWith('/api/')) return; // Daten nie aus dem Cache
  if (e.request.mode === 'navigate' && u.pathname.startsWith('/begleiter')) {
    e.respondWith(fetch(e.request).catch(() => caches.match('/begleiter')));
  }
});
self.addEventListener('push', (e) => {
  let kind = 'approval';
  try { kind = (e.data && e.data.json().kind) || kind; } catch (_) { /* leer */ }
  const title = kind === 'incident' ? 'Wache meldet sich' : kind === 'brief' ? 'Dein Morgen ist bereit' : 'MÔRA braucht dein Ja';
  e.waitUntil(self.registration.showNotification(title, { body: 'Zum Ansehen öffnen.', icon: '/begleiter-icon.svg', tag: kind }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.openWindow('/begleiter'));
});
