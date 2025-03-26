import { useEffect, useState } from "react";
import { onMessageListener } from "../../firebase";

interface Notification {
  title: string;
  body: string;
}

interface Payload {
  notification?: Notification;
}

const NotificationHandler: React.FC = () => {
  const [notification, setNotification] = useState<Notification | null>(null);

  useEffect(() => {
    const listenForMessages = async () => {
      try {
        const payload = (await onMessageListener()) as Payload;
        if (payload?.notification) {
          setNotification({
            title: payload.notification.title,
            body: payload.notification.body,
          });
        }
      } catch (error) {
        console.error("Error receiving message:", error);
      }
    };

    listenForMessages();
  }, []);

  return (
    notification && (
      <div className="fixed bottom-5 right-5 bg-blue-500 text-white p-4 rounded-lg shadow-lg">
        <h4 className="font-bold">{notification.title}</h4>
        <p>{notification.body}</p>
      </div>
    )
  );
};

export default NotificationHandler;
