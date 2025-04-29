const CACHE_NAME = 'kira-image-cache-v1.1'; // Increment version to force update
const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/script.js',
    '/manifest.json',
    // Add paths to icons if they are local
    '/assets/icon-192.png',
    '/assets/icon-512.png',
    // Add CDNs if you want to cache them (consider potential updates)
    'https://cdn.tailwindcss.com?plugins=forms',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2', // FontAwesome font file
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
     // Note: Caching Google Fonts CSS is tricky due to its dynamic nature. This might cache the CSS but not necessarily the font files themselves depending on browser.
];

// Install event: Cache core assets
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching app shell');
                // Use addAll for atomic caching
                return cache.addAll(urlsToCache).catch(error => {
                    console.error('Failed to cache initial assets:', error);
                    // Decide if install should fail or continue
                });
            })
            .then(() => {
                console.log('Service Worker: Installation complete');
                // Force the waiting service worker to become the active service worker.
                return self.skipWaiting();
            })
    );
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker: Activation complete');
             // Tell the active service worker to take control of the page immediately.
            return self.clients.claim();
        })
    );
});

// Fetch event: Serve from cache, fallback to network (Cache-First strategy)
self.addEventListener('fetch', event => {
    // Skip non-GET requests or requests for browser extensions
     if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
        return;
     }

    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // Cache hit - return response
                if (cachedResponse) {
                    // console.log('Service Worker: Serving from cache:', event.request.url);
                    return cachedResponse;
                }

                // Not in cache - fetch from network
                // console.log('Service Worker: Fetching from network:', event.request.url);
                return fetch(event.request).then(
                    networkResponse => {
                        // Check if we received a valid response
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors') {
                            return networkResponse; // Don't cache invalid responses
                        }

                        // IMPORTANT: Clone the response. A response is a stream
                        // and because we want the browser to consume the response
                        // as well as the cache consuming the response, we need
                        // to clone it so we have two streams.
                        const responseToCache = networkResponse.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                // Cache the new response
                                cache.put(event.request, responseToCache);
                            });

                        return networkResponse;
                    }
                ).catch(error => {
                     console.error('Service Worker: Fetch failed; returning offline page instead.', error);
                     // Optional: Return a custom offline page if fetch fails
                     // return caches.match('/offline.html');
                });
            })
    );
});
