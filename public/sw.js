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

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log("[sw.js] Received background message ", payload);
  
  // Check if payload contains notification data
  const notificationTitle = payload.notification?.title || payload.data?.title || "New Notification";
  const notificationBody = payload.notification?.body || payload.data?.body || "";
  const notificationIcon = payload.notification?.icon || payload.data?.icon || "/sosika.png";
  
  const notificationOptions = {
    body: notificationBody,
    icon: notificationIcon,
    data: payload.data || {}
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener("install", (event) => {
  console.log("[sw.js] Service Worker installing");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[sw.js] Service Worker activating");
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  console.log("[sw.js] Notification clicked", event);
  event.notification.close();
  
  // Add custom data handling if present
  const data = event.notification.data;
  const url = data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
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

// Add push event listener to handle incoming push events
self.addEventListener('push', (event) => {
  console.log('[sw.js] Push received', event);
  
  if (!event.data) {
    console.log('[sw.js] Push event but no data');
    return;
  }
  
  try {
    const data = event.data.json();
    const title = data.notification?.title || data.title || 'New Message';
    const options = {
      body: data.notification?.body || data.body || '',
      icon: data.notification?.icon || data.icon || '/sosika.png',
      data: data.data || data
    };
    
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    console.error('[sw.js] Error showing notification', e);
  }
});