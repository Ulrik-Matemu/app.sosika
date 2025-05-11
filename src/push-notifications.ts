import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyAf-TlhfJJfQwEgmTxN9jPm7cDmqjQmz9w",
  authDomain: "sosika-6442a.firebaseapp.com",
  projectId: "sosika-6442a",
  storageBucket: "sosika-6442a.firebasestorage.app",
  messagingSenderId: "981492231480",
  appId: "1:981492231480:web:f48eb11971394be1e5e5cd",
  measurementId: "G-H7YM628FBN"
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
    console.log("Notification permission status:", permission);
    
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
      vapidKey: "BH_5SgPCImkMay6oU-wVsE8InlQGDAG-tgGRQEF1OpEqKzxdy7c3NgQiTVceNGRc3V6Nn6JdbICWbDzU7H1QcEU",
      serviceWorkerRegistration: await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    });
    
    console.log("FCM token received:", token);
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
    console.log("Message received. ", payload);
    // Customize notification here
    const notificationTitle = payload.notification?.title || "New Notification";
    const notificationOptions = {
      body: payload.notification?.body,
      icon: payload.notification?.icon,
    };

    new Notification(notificationTitle, notificationOptions);
  });
};