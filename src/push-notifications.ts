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
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const token = await getToken(messaging, {
        vapidKey: "BEC4ncuS652Wnb0J2QC2M2ylbtdpwHXj7NVEHrprgj1PcvHjZpo2jID6-YGKCXSy25P5mTrVWlJmzQhWIzoLJ_k",
      });
     
      localStorage.setItem("fcmToken", token);
      console.log("FCM Token received and saved", token);// Send this token to your backend
    } else {
      console.error("Notification permission denied");
    }
  } catch (error) {
    console.error("Error getting FCM token:", error);
  }
};


export const setupMessageListener = () => {
  onMessage(messaging, (payload) => {
    console.log("Message received in foreground:", payload);
    
    // Create and display a notification if the app is in the foreground
    if (payload.notification) {
      const { title, body } = payload.notification;
      
      // Show a more user-friendly notification
      if (Notification.permission === "granted") {
        new Notification(title || "No Title", {
          body,
          icon: '/notification-icon.png' // Add your app's icon path
        });
      } else {
        // Fallback for when notification permission exists but notification can't be created
        alert(`${title}: ${body}`);
      }
    }
  });
};