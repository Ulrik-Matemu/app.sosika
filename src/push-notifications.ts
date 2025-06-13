import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);



// Function to request push notification permission and get token
export const requestNotificationPermission = async () => {
  try {
    
    // Check if browser supports notifications
    if (!("Notification" in window)) {
      console.error("This browser does not support notifications");
      return null;
    }
    
    // Request permission
    const permission = await Notification.requestPermission();
    
    if (permission !== "granted") {
      console.error("Notification permission denied");
      return null;
    }
    
    // For GitHub Pages, we need to specify the complete service worker URL and scope
    const swUrl = `${window.location.origin}/firebase-messaging-sw.js`;
    const swScope = `${window.location.origin}/`;
    

    
    // Manually register the service worker first to debug any issues
    try {
      const registration = await navigator.serviceWorker.register(swUrl, {
        scope: swScope
      });
      console.log("Service Worker registered successfully:", registration);
    } catch (swError) {
      console.error("Service Worker registration failed:", swError);
      // Continue anyway as getToken will try to register the SW again
    }
    
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    });
    
    localStorage.setItem("fcmToken", token);
    
    // Send token to backend
    
    
    return token;
  } catch (error) {
    console.error("Error in requestNotificationPermission:", error);
    return null;
  }
};

// Listen for foreground messages
export const listenForForegroundMessages = () => {
  console.log("Listening for foreground messages...");
  onMessage(messaging, (payload) => {
    // Customize notification here
    const notificationTitle = payload.notification?.title || "New Notification";
    const notificationOptions = {
      body: payload.notification?.body,
      icon: payload.notification?.icon,
    };

    new Notification(notificationTitle, notificationOptions);
  });
};