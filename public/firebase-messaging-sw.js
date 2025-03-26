// Service Worker for PWA and Firebase Cloud Messaging

// Cache name with version for easy updates
const CACHE_NAME = 'sosika-cache-v1';

// List of files to cache for offline functionality
const CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/sosika.png',
  '/sosika-badge.png',
  // Add other critical assets here
];

// Import Firebase scripts
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

// Initialize Firebase
firebase.initializeApp({
  apiKey: "AIzaSyA_Jw-BGThGsqhB8_t5_AH6D9AL1YLCjK8",
  authDomain: "sosika-101.firebaseapp.com",
  projectId: "sosika-101",
  storageBucket: "sosika-101.firebasestorage.app",
  messagingSenderId: "827695672687",
  appId: "1:827695672687:web:85ce347456339ccfd80c9a",
  measurementId: "G-692C6RSH31"
});

const messaging = firebase.messaging();

// Install event - caching static assets
self.addEventListener('install', (event) => {
  // Force the waiting service worker to become active
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(CACHE_URLS);
      })
      .catch((error) => {
        console.error('Cache installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
    // Immediately claim any uncontrolled clients
    .then(() => self.clients.claim())
  );
});

// Fetch event - handle network requests with cache fallback
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // IMPORTANT: Clone the request. A request is a stream and can only be consumed once
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then((response) => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // IMPORTANT: Clone the response. A response is a stream and can only be consumed once
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
  );
});

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log("Received background notification:", payload);

  const notificationTitle = payload.notification.title || "New Notification";
  const notificationOptions = {
    body: payload.notification.body || "",
    icon: "/sosika.png",
    badge: "/sosika-badge.png", // Optional
    data: payload.data // Optional: pass additional data
  };

  // Show the notification
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  // Close the notification
  event.notification.close();

  // Get all window clients
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      // If a Window tab matching the notification's URL is found, focus it
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }

      // Otherwise, open a new window/tab
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});