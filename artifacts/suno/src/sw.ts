/// <reference lib="WebWorker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

declare let self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();

// Injected by vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST);

// ── Push Notifications ──────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload: { title?: string; body?: string; icon?: string; data?: Record<string, any> } = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Suno India', body: event.data.text() };
  }

  const title = payload.title || 'Suno India';
  const options: NotificationOptions = {
    body: payload.body || 'You have a new message',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'suno-message',
    renotify: true,
    data: payload.data || {},
    silent: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return self.clients.openWindow('/');
      })
  );
});
