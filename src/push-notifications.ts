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

// Debug the current environment
console.log("Current URL:", window.location.href);
console.log("Expected SW URL:", `${window.location.origin}/firebase-messaging-sw.js`);

// Function to request push notification permission and get token
export const requestNotificationPermission = async (userId: string) => {
  try {
    console.log("Requesting notification permission...");
    
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
    const swUrl = `${window.location.origin}/app.sosika/firebase-messaging-sw.js`;
    const swScope = `${window.location.origin}/app.sosika/`;
    
    console.log("Registering service worker at:", swUrl);
    console.log("With scope:", swScope);
    
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
    
    // Now get the FCM token
    console.log("Getting FCM token...");
    const token = await getToken(messaging, {
      vapidKey: "BEC4ncuS652Wnb0J2QC2M2ylbtdpwHXj7NVEHrprgj1PcvHjZpo2jID6-YGKCXSy25P5mTrVWlJmzQhWIzoLJ_k",
      serviceWorkerRegistration: undefined // Let Firebase handle it
    });
    
    console.log("FCM token received:", token);
    localStorage.setItem("fcmToken", token);
    
    // Send token to backend
    if (userId && token) {
      console.log("Sending FCM token to backend for user:", userId);
      
      try {
        const response = await fetch('https://your-backend-url/api/update-fcm-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, fcmToken: token })
        });
        
        if (response.ok) {
          console.log("FCM token successfully saved on server");
        } else {
          console.error("Failed to save FCM token on server");
        }
      } catch (apiError) {
        console.error("API error while sending token:", apiError);
      }
    }
    
    return token;
  } catch (error) {
    console.error("Error in requestNotificationPermission:", error);
    return null;
  }
};

// Listen for foreground messages
export const setupMessageListener = () => {
  console.log("Setting up foreground message listener");
  onMessage(messaging, (payload) => {
    console.log("Message received in foreground:", payload);
    
    if (payload.notification) {
      const { title, body } = payload.notification;
      
      // Display notification
      if (Notification.permission === "granted") {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title || "New Notification", {
            body: body || "",
            icon: '/app.sosika/sosika.png' // Adjust path based on your icon location
          });
        });
      }
    }
  });
};