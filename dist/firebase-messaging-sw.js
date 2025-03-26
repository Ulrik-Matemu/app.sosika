// Do NOT use import statements in service workers!
// Use importScripts instead

importScripts("https://cdnjs.cloudflare.com/ajax/libs/firebase/10.0.0/firebase-app-compat.min.js");
importScripts("https://cdnjs.cloudflare.com/ajax/libs/firebase/10.0.0/firebase-messaging-compat.min.js");

// Initialize Firebase with your config
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

messaging.onMessage(function(payload) {
  console.log("Received notification:", payload);
  const notificationTitle = payload.notification.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification.body || '',
    icon: '/sosika.png' // Adjust path based on your icon location
  };
  
  return self.registration.showNotification(notificationTitle, notificationOptions);
})

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification.body || '',
    icon: '/sosika.png' // Adjust path based on your icon location
  };
  
  return self.registration.showNotification(notificationTitle, notificationOptions);
});