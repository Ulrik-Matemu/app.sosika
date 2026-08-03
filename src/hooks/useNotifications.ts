import { useEffect, useRef } from "react";
import { initializeNotifications } from "../services/push-notifications";

/**
 * Custom React Hook to initialize FCM Push Notifications.
 * Automatically requests permission & registers service worker if user is logged in or active.
 */
export const useNotifications = () => {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;

    // Check if user has an identity token or userId stored
    const userId = localStorage.getItem("userId") || localStorage.getItem("vendor_id") || "guest_user";

    initialized.current = true;
    initializeNotifications(userId).catch((err) => {
      console.warn("Notification initialization deferred:", err);
    });
  }, []);
};
