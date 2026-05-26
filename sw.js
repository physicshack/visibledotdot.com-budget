// Visible.. Service Worker v1.8
// Handles caching and payday push notifications

const CACHE_NAME = 'visible-v1.8';

// Install — cache the app shell
self.addEventListener('install', e => {
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — serve from cache if available, else network
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

// Push — receive push notification from server
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'visible..', {
      body: data.body || 'Check your financial plan.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'visible-payday',
      requireInteraction: false,
      data: { url: '/' }
    })
  );
});

// Notification click — open app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});

// Message from app — schedule a local notification
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SCHEDULE_NOTIF') {
    const { title, body, at } = e.data;
    const delay = new Date(at) - Date.now();
    if (delay > 0 && delay < 86400000) { // within 24 hours
      setTimeout(() => {
        self.registration.showNotification(title, {
          body,
          icon: '/icon-192.png',
          tag: 'visible-payday',
          data: { url: '/' }
        });
      }, delay);
    }
  }
});
