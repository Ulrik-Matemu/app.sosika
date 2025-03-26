import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyA_Jw-BGThGsqhB8_t5_AH6D9AL1YLCjK8",
    authDomain: "sosika-101.firebaseapp.com",
    projectId: "sosika-101",
    storageBucket: "sosika-101.firebasestorage.app",
    messagingSenderId: "827695672687",
    appId: "1:827695672687:web:85ce347456339ccfd80c9a",
    measurementId: "G-692C6RSH31"
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

export { messaging, getToken, onMessage, auth, provider, signInWithPopup };
