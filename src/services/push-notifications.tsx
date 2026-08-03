import { messaging, getToken, db } from "../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

/**
 * Initialize push notifications:
 * 1. Register the FCM service worker
 * 2. Request notification permission
 * 3. Get FCM token
 * 4. Save token to Firestore
 */
export const initializeNotifications = async (userId: string): Promise<string | null> => {
  try {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      console.warn("Push notifications not supported in this browser");
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Notification permission denied");
      return null;
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      await saveTokenToFirestore(userId, token);
      localStorage.setItem("fcmToken", token);
    }

    return token;
  } catch (error) {
    console.error("Error initializing notifications:", error);
    return null;
  }
};

/**
 * Save FCM token to Firestore for server-side targeting
 */
export const saveTokenToFirestore = async (userId: string, token: string) => {
  try {
    await setDoc(
      doc(db, "fcm_tokens", userId),
      {
        token,
        userId,
        updatedAt: serverTimestamp(),
        platform: "web",
        userAgent: navigator.userAgent,
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Error saving FCM token to Firestore:", error);
  }
};

// Legacy compatibility export
export const setupPushNotifications = async () => {
  const userId = localStorage.getItem("userId") || "anonymous";
  return initializeNotifications(userId);
};
