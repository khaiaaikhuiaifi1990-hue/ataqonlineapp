const CACHE_NAME = 'ataq-online-v7';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/icon.jpg',
  '/manifest.json'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event (Network-First with Cache Fallback for dynamic updates)
self.addEventListener('fetch', (event) => {
  // Only handle standard http/https GET requests
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip intercepting version.json to allow live server checks
  if (event.request.url.includes('version.json')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache new successful local requests dynamically
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Return cached index.html as fallback for SPA routing
          return caches.match('/index.html');
        });
      })
  );
});
