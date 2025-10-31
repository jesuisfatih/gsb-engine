/**
 * Service Worker for PWA
 * Enables offline support, caching, and background sync
 */

const CACHE_NAME = 'gsb-engine-v1';
const RUNTIME_CACHE = 'gsb-runtime-v1';
const IMAGE_CACHE = 'gsb-images-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/editor',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      // Skip waiting to activate immediately
      return self.skipWaiting();
    })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== RUNTIME_CACHE && 
              cacheName !== IMAGE_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // API requests - network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }

  // Images - cache first
  if (request.destination === 'image') {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // HTML/JS/CSS - stale while revalidate
  event.respondWith(staleWhileRevalidate(request, CACHE_NAME));
});

// Background sync - sync pending designs when online
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-designs') {
    event.waitUntil(syncPendingDesigns());
  }
  
  if (event.tag === 'sync-autosaves') {
    event.waitUntil(syncAutosaves());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Gang Sheet Builder';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: data.data || {},
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if window is already open
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

/**
 * Cache strategies
 */

// Network first, fallback to cache
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Network failed, try cache
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    
    // Return offline page or error
    return new Response('Offline', { status: 503 });
  }
}

// Cache first, fallback to network
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}

// Stale while revalidate
async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);
  
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      const cache = caches.open(cacheName);
      cache.then(c => c.put(request, response.clone()));
    }
    return response;
  }).catch(() => cached);

  return cached || fetchPromise;
}

/**
 * Sync pending designs
 */
async function syncPendingDesigns() {
  console.log('[SW] Syncing pending designs...');
  
  try {
    // Get pending designs from IndexedDB
    const db = await openDB();
    const designs = await db.getAll('pending-designs');
    
    // Upload each design
    for (const design of designs) {
      const response = await fetch('/api/designs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(design),
      });
      
      if (response.ok) {
        // Remove from pending
        await db.delete('pending-designs', design.id);
        console.log('[SW] Synced design:', design.id);
      }
    }
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

/**
 * Sync autosaves
 */
async function syncAutosaves() {
  console.log('[SW] Syncing autosaves...');
  
  try {
    const autosaves = JSON.parse(localStorage.getItem('gsb:anonymous:design') || '{}');
    
    if (autosaves.id) {
      await fetch('/api/proxy/designs/anonymous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(autosaves),
      });
      
      console.log('[SW] Autosave synced');
    }
  } catch (error) {
    console.error('[SW] Autosave sync failed:', error);
  }
}

/**
 * IndexedDB helpers
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('gsb-engine', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('pending-designs')) {
        db.createObjectStore('pending-designs', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('designs-cache')) {
        db.createObjectStore('designs-cache', { keyPath: 'id' });
      }
    };
  });
}

