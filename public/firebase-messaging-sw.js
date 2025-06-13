// firebase-messaging-sw.js
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");


// Initialize Firebase with your config
firebase.initializeApp({
  apiKey: 'AIzaSyAf-TlhfJJfQwEgmTxN9jPm7cDmqjQmz9w',
  authDomain: 'sosika-6442a.firebaseapp.com',
  projectId: 'sosika-6442a',  
  storageBucket: 'sosika-6442a.firebasestorage.app',
  messagingSenderId: '981492231480',
  appId: '1:981492231480:web:f48eb11971394be1e5e5cd',
  measurementId: 'G-H7YM628FBN',
});

// Get Firebase Messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  
  const notificationTitle = payload.notification?.title || payload.data?.title || "New Notification";
  const notificationBody = payload.notification?.body || payload.data?.body || "";
  const notificationIcon = payload.notification?.icon || payload.data?.icon || "/sosika.png";
  
  return self.registration.showNotification(notificationTitle, {
    body: notificationBody,
    icon: notificationIcon,
    data: payload.data || {}
  });
});

// Install event - immediately activate the service worker
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// Activate event - claim clients so the SW is in control
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  
  const url = event.notification.data?.url || '/';
  
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