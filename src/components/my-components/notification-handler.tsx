import React, { useEffect, useState, useCallback } from "react";
import { onMessage } from "firebase/messaging";
import { messaging } from "../../firebase";
import { Bell, X } from "lucide-react";

interface NotificationData {
  title: string;
  body: string;
  icon?: string;
  url?: string;
}

const NotificationHandler: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const dismissNotification = useCallback((index: number) => {
    setNotifications((prev) => prev.filter((_, i) => i !== index));
  }, []);

  useEffect(() => {
    try {
      const unsubscribe = onMessage(messaging, (payload) => {
        const newNotification: NotificationData = {
          title: payload.notification?.title || payload.data?.title || "New Notification",
          body: payload.notification?.body || payload.data?.body || "",
          icon: payload.notification?.icon || payload.data?.icon,
          url: payload.data?.url,
        };
        setNotifications((prev) => [...prev, newNotification]);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
          setNotifications((prev) => prev.slice(1));
        }, 5000);
      });

      return () => unsubscribe();
    } catch (err) {
      console.warn("FCM messaging onMessage listener registration skipped:", err);
    }
  }, []);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0">
      {notifications.map((notif, index) => (
        <div
          key={index}
          onClick={() => {
            if (notif.url) window.location.href = notif.url;
          }}
          className={`bg-elevated/95 backdrop-blur-xl border border-edge-3 rounded-2xl p-4 shadow-2xl transition-all ${
            notif.url ? "cursor-pointer hover:border-sosika-cyan/40" : ""
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-sosika-cyan/10 border border-sosika-cyan/20 flex items-center justify-center shrink-0">
              <Bell size={16} className="text-accent-ink" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-content truncate">{notif.title}</p>
              <p className="text-xs text-content-tertiary mt-0.5 line-clamp-2">{notif.body}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                dismissNotification(index);
              }}
              className="text-content-muted hover:text-content transition-colors p-1"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationHandler;
