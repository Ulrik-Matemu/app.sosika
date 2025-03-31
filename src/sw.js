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

// Initialize message handling
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-sw.js] Received background message ", payload);
  
  const notificationTitle = payload.notification?.title || "New Notification";
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: "/sosika.png",
    data: payload.data
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// This line is crucial - it's where Workbox will inject its precache manifest
// Don't remove or modify this line
self.__WB_MANIFEST;

// Setup workbox
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  console.log("[firebase-sw.js] Notification clicked", event);
  event.notification.close();
  
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({type: "window", includeUncontrolled: true}).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

// Add push event listener
self.addEventListener('push', (event) => {
  console.log('[firebase-sw.js] Push received', event);
  
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    const title = data.notification?.title || "New Message";
    const options = {
      body: data.notification?.body || "",
      icon: data.notification?.icon || "/sosika.png",
      data: data.data || data
    };
    
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    console.error('[firebase-sw.js] Error showing notification', e);
  }
});

// Add your caching strategies (similar to what you had in the workbox config)
self.addEventListener('fetch', (event) => {
  // Basic example of a fetch event handler
  // You can customize this with more complex caching strategies
  if (event.request.destination === 'document') {
    event.respondWith(
      caches.open('html-cache').then((cache) => {
        return fetch(event.request).then((response) => {
          cache.put(event.request, response.clone());
          return response;
        }).catch(() => {
          return cache.match(event.request);
        });
      })
    );
  } else if (['style', 'script', 'worker'].includes(event.request.destination)) {
    event.respondWith(
      caches.open('assets-cache').then((cache) => {
        return cache.match(event.request).then((response) => {
          return response || fetch(event.request).then((networkResponse) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
  }
});