var cacheStorageKey = 'tv.0.0.9'
var cacheList = [
  'index.html',
  'manifest.json'
]
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(cacheStorageKey)
      .then(cache => cache.addAll(cacheList))
      .then(() => self.skipWaiting())
  )
})

// application activated
self.addEventListener('activate', event => {

  event.waitUntil(
    // Retrieving all the keys from the cache.
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        // Looping through all the cached files.
        cacheNames.map(function (cacheName, i) {
          // If the file in the cache is not in the whitelist
          // it should be deleted.
          if (cacheName !== cacheStorageKey) {
            return caches.delete(cacheNames[i]);
          }
        })
      );
    })
  );

});

self.addEventListener('fetch', function (e) {
  e.respondWith(
    caches.match(e.request).then(function (response) {
      if (response != null) {
        return response
      }
      return fetch(e.request.url)
    })
  )
})