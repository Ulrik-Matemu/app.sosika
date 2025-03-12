importScripts("https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js");

import { onMessage } from "firebase/messaging";

const firebaseConfig = {
    apiKey: "AIzaSyA_Jw-BGThGsqhB8_t5_AH6D9AL1YLCjK8",
    authDomain: "sosika-101.firebaseapp.com",
    projectId: "sosika-101",
    storageBucket: "sosika-101.firebasestorage.app",
    messagingSenderId: "827695672687",
    appId: "1:827695672687:web:85ce347456339ccfd80c9a",
    measurementId: "G-692C6RSH31"
  };

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("Received background message: ", payload);
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/sosika.png",
  });
});

onMessage(messaging, (payload) => {
    console.log("Message received in foreground:", payload);
    alert(`New Notification: ${payload.notification?.title}`);
  });
