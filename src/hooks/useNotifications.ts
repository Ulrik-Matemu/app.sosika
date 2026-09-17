import { useEffect, useRef } from "react";
import { initializeNotifications, getActiveCustomerPhone } from "../services/push-notifications";

/**
 * Refreshes this device's FCM registration on load — but never prompts. The
 * permission request belongs to the Notifications toggle in Settings, where the
 * user has asked for it.
 */
export const useNotifications = () => {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;

    // Check if user has an identity token or userId stored
    const userId = localStorage.getItem("userId") || localStorage.getItem("vendor_id") || "guest_user";
    const phone = getActiveCustomerPhone();

    initialized.current = true;
    initializeNotifications(userId, false, phone).catch((err) => {
      console.warn("Notification initialization deferred:", err);
    });
  }, []);
};
