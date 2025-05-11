import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAf-TlhfJJfQwEgmTxN9jPm7cDmqjQmz9w",
  authDomain: "sosika-6442a.firebaseapp.com",
  projectId: "sosika-6442a",
  storageBucket: "sosika-6442a.firebasestorage.app",
  messagingSenderId: "981492231480",
  appId: "1:981492231480:web:f48eb11971394be1e5e5cd",
  measurementId: "G-H7YM628FBN"
  };

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export const onMessageListener = () =>
  new Promise((resolve) => {
    const messaging = getMessaging();
    onMessage(messaging, (payload) => {
      console.log("Foreground message received:", payload);
      
      // Optional: Show browser notification
      if (Notification.permission === 'granted') {
        new Notification(payload.notification?.title || 'New Notification', {
          body: payload.notification?.body || '',
          icon: payload.notification?.icon || undefined
        });
      }
      
      resolve(payload);
    });
  });

export { messaging, getToken, onMessage, auth, provider };
