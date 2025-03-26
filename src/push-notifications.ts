import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyA_Jw-BGThGsqhB8_t5_AH6D9AL1YLCjK8",
  authDomain: "sosika-101.firebaseapp.com",
  projectId: "sosika-101",
  storageBucket: "sosika-101.firebasestorage.app",
  messagingSenderId: "827695672687",
  appId: "1:827695672687:web:85ce347456339ccfd80c9a",
  measurementId: "G-692C6RSH31"
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
      vapidKey: "BEC4ncuS652Wnb0J2QC2M2ylbtdpwHXj7NVEHrprgj1PcvHjZpo2jID6-YGKCXSy25P5mTrVWlJmzQhWIzoLJ_k",
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