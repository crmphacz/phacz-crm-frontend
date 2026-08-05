// Service Worker do PHACZ CRM — só cuida de notificações push.
// Não faz cache de assets (sem isso viraria um SW de PWA/offline, fora de escopo aqui).

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = { title: 'PHACZ CRM', body: '' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: 'PHACZ CRM', body: event.data.text() };
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'PHACZ CRM', {
      body: data.body || '',
      tag: data.tag || 'phacz-crm',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
