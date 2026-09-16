import { messaging, getToken, db } from "../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export const notificationsSupported = () =>
  typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;

/** What the browser currently allows, without prompting for anything. */
export const notificationPermission = (): NotificationPermission | "unsupported" =>
  notificationsSupported() ? Notification.permission : "unsupported";

/**
 * Register this device for push.
 *
 * `promptIfNeeded` exists because this used to call requestPermission() on app
 * load, before the user had any idea what Sosika was — the browser's own
 * guidance is to ask in response to a deliberate action, and a denied prompt is
 * effectively permanent. Settings passes true; the boot path passes false and
 * so only re-registers a device that already granted permission.
 */
export const initializeNotifications = async (
  userId: string,
  promptIfNeeded = false
): Promise<string | null> => {
  try {
    if (!notificationsSupported()) {
      console.warn("Push notifications not supported in this browser");
      return null;
    }

    if (Notification.permission === "denied") return null;
    if (Notification.permission !== "granted") {
      if (!promptIfNeeded) return null;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return null;
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
/**
 * Store the registration under the TOKEN, not the user id.
 *
 * It used to key on `localStorage.userId`, which is written by nothing on the
 * customer side and so resolved to the literal "guest_user" for every device —
 * meaning all customers shared, and repeatedly overwrote, a single document.
 * A token is already unique per device+browser, which is exactly the grain
 * push targeting needs.
 */
export const saveTokenToFirestore = async (userId: string, token: string) => {
  try {
    await setDoc(
      doc(db, "fcm_tokens", token),
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
