import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics, logEvent } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
  };

import { getStorage } from "firebase/storage";

const app = initializeApp(firebaseConfig);

/*
 * Customer auth runs on its own Firebase app instance.
 *
 * Admin (email + an `admin` custom claim) and vendor (email + verification)
 * both sign in against `auth` below. With a single shared instance, a customer
 * verifying their phone on the same browser replaced that session and bounced
 * the admin or vendor out of their guard. A second named app gives customers an
 * independent session; nothing server-side reads the customer token, because
 * the customer-facing callables are unauthenticated by design.
 */
const customerApp = initializeApp(firebaseConfig, "customer");
const messaging = getMessaging(app);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const customerAuth = getAuth(customerApp);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);
const functions = getFunctions(app);
const storage = getStorage(app);

export const onMessageListener = () =>
  new Promise((resolve) => {
    const messaging = getMessaging();
    onMessage(messaging, (payload) => {
      
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

export { messaging, getToken, onMessage, auth, customerAuth, provider, analytics, logEvent, db, functions, httpsCallable, storage };

