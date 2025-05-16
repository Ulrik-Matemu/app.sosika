import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics, logEvent } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
  };

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);
const analytics = getAnalytics(app);
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

export { messaging, getToken, onMessage, auth, provider, analytics, logEvent };
