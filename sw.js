const CACHE_NAME = 'simple-pwa-v1';
const DYNAMIC_CACHE = 'dynamic-cache-v1';

// Assets to cache on installation
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/assets/css/styles.css',
  '/assets/js/app.js',
  '/assets/js/db.js',
  '/assets/js/notification.js',
  '/assets/js/lazy-loading.js',
  '/assets/images/icons/icon-72x72.png',
  '/assets/images/icons/icon-96x96.png',
  '/assets/images/icons/icon-128x128.png',
  '/assets/images/icons/icon-144x144.png',
  '/assets/images/icons/icon-152x152.png',
  '/assets/images/icons/icon-192x192.png',
  '/assets/images/icons/icon-384x384.png',
  '/assets/images/icons/icon-512x512.png'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service worker installed');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keyList => {
        return Promise.all(keyList.map(key => {
          if (key !== CACHE_NAME && key !== DYNAMIC_CACHE) {
            console.log('Removing old cache', key);
            return caches.delete(key);
          }
        }));
      })
      .then(() => {
        console.log('Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  // Skip for browser extension requests and non-GET requests
  if (
    event.request.url.startsWith('chrome-extension://') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // Skip for API calls - these should be handled by background sync
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // If found in cache, return the cached version
        if (cachedResponse) {
          // Still fetch updated version in background for next time (stale-while-revalidate)
          fetch(event.request)
            .then(response => {
              // Only cache valid responses (ignore 4xx and 5xx)
              if (response.status >= 200 && response.status < 400) {
                const clonedResponse = response.clone();
                caches.open(DYNAMIC_CACHE)
                  .then(cache => cache.put(event.request, clonedResponse));
              }
            })
            .catch(err => console.log('Failed to fetch and update cache', err));

          return cachedResponse;
        }

        // Otherwise, fetch from network
        return fetch(event.request)
          .then(response => {
            // Clone the response as it can only be used once
            const clonedResponse = response.clone();
            
            // Open the dynamic cache and store the new response
            caches.open(DYNAMIC_CACHE)
              .then(cache => {
                cache.put(event.request, clonedResponse);
              });
            
            return response;
          })
          .catch(error => {
            console.log('Fetch failed; returning offline page instead.', error);
            
            // Check if the request is for an HTML page
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/offline.html');
            }
            
            // For images, return a placeholder
            if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
              return caches.match('/assets/images/placeholder.svg');
            }
            
            // For other resources, just return a simple error response
            return new Response('Network error occurred', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Background sync for offline data
self.addEventListener('sync', event => {
  console.log('Background sync triggered', event.tag);
  
  if (event.tag === 'sync-notes') {
    event.waitUntil(syncNotes());
  }
});

// Function to sync notes with the server
function syncNotes() {
  return new Promise((resolve, reject) => {
    // Open the IndexedDB
    const dbPromise = indexedDB.open('notes-store', 1);
    
    dbPromise.onsuccess = function(event) {
      const db = event.target.result;
      const tx = db.transaction('notes', 'readwrite');
      const store = tx.objectStore('notes');
      
      // Get all unsynced notes
      const unsyncedNotesRequest = store.index('synced').getAll(0); // 0 = false (not synced)
      
      unsyncedNotesRequest.onsuccess = function() {
        const unsyncedNotes = unsyncedNotesRequest.result;
        
        if (unsyncedNotes.length === 0) {
          console.log('No notes to sync');
          resolve();
          return;
        }
        
        console.log(`Found ${unsyncedNotes.length} notes to sync`);
        
        // Create promises for each note to sync
        const syncPromises = unsyncedNotes.map(note => {
          return fetch('/api/notes', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(note)
          })
          .then(response => {
            if (response.ok) {
              // Update the note as synced
              const updateTx = db.transaction('notes', 'readwrite');
              const updateStore = updateTx.objectStore('notes');
              note.synced = 1;
              updateStore.put(note);
              return updateTx.complete;
            }
          });
        });
        
        // Wait for all sync operations to complete
        Promise.all(syncPromises)
          .then(() => {
            console.log('All notes synced successfully');
            // Send message to clients
            self.clients.matchAll().then(clients => {
              clients.forEach(client => {
                client.postMessage({
                  message: 'notes-synced',
                  count: unsyncedNotes.length
                });
              });
            });
            resolve();
          })
          .catch(error => {
            console.error('Error syncing notes:', error);
            reject(error);
          });
      };
    };
    
    dbPromise.onerror = function(event) {
      console.error('Error opening IndexedDB:', event.target.error);
      reject(event.target.error);
    };
  });
}

// Push notification event handler
self.addEventListener('push', event => {
  console.log('Push notification received', event);
  
  if (!event.data) {
    console.log('No data in push event');
    return;
  }
  
  const data = event.data.json();
  
  const options = {
    body: data.body || 'New content is available',
    icon: '/assets/images/icons/icon-192x192.png',
    badge: '/assets/images/icons/icon-72x72.png',
    data: {
      url: data.url || '/'
    },
    vibrate: [100, 50, 100],
    actions: [
      {
        action: 'view',
        title: 'View'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Simple PWA', options)
  );
});

// Notification click event handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })
    .then(clientList => {
      // Check if there's already a window open
      for (let client of clientList) {
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no window found or user clicked on notification actions, open a new window
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});