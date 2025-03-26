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

messaging.onBackgroundMessage((payload) => {
  console.log("Received background notification:", payload);

  const notificationTitle = payload.notification.title || "New Notification";
  const notificationOptions = {
    body: payload.notification.body || "",
    icon: "/sosika.png",
    badge: "/sosika-badge.png" // Optional
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
