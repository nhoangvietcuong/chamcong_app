const CACHE_NAME = 'chamcong-pwa-v39';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json',
  '/logo chamcong.png'
];

// Install Event
self.addEventListener('install', (event) => {
  console.log('Service Worker v5 installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker v5: Caching core assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  console.log('Service Worker v5 activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Purging Old Cache...', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;

  // Ignore API endpoints, hot-updates, extensions
  if (
    event.request.url.startsWith('chrome-extension') || 
    event.request.url.includes('hot-update') ||
    event.request.url.includes('/api/')
  ) {
    return;
  }

  // Network First strategy for HTML navigation requests with Offline fallback
  if (event.request.mode === 'navigate' || (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => cached || caches.match('/index.html') || caches.match('/'));
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((response) => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Cache the fetched asset
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // If offline and request is an HTML page, return index
          if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
            return caches.match('/index.html');
          }
        });
    })
  );
});

// Push Event Listener for receiving Web Push Notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/logo chamcong.png',
      badge: '/favicon.svg',
      tag: data.tag || 'attendance-reminder',
      renotify: true,
      requireInteraction: data.requireInteraction !== false,
      vibrate: data.vibratePattern || [1000, 500, 1000, 500, 1000, 500, 1000, 500],
      data: {
        url: '/'
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Nhắc nhở chấm công', options)
    );
  } catch (err) {
    console.error('Failed to handle push event:', err);
  }
});

// Handle notification click to focus or open PWA window & send stop vibration signal
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Send STOP_VIBRATION signal to active clients
      for (const client of clientList) {
        client.postMessage({ action: 'STOP_VIBRATION' });
      }

      // If window open, focus it
      for (const client of clientList) {
        if (client.url.includes('/') && 'focus' in client) {
          return client.focus();
        }
      }
      // If not open, open a new tab/window
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

