import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { RegisterPage } from "./pages/register";
import WelcomePage from "./pages/welcome";
import LoginPage from "./pages/login";
import MenuExplorer from "./pages/explore";
import OrderTrackingWithErrorBoundary from "./components/my-components/orderTracking";
import OrdersPage from "./pages/orders";
import ProfileManagement from "./pages/profile";
import ForgotPassword from "./pages/forgot-password";
import ResetPassword from "./pages/reset-password";
import { Printing } from "./pages/printing";
import { Services } from "./pages/services";
import "./App.css";
import { getToken } from 'firebase/messaging';
import { TooltipProvider } from "./components/ui/tooltip"; // Ensure correct import
import { listenForForegroundMessages } from './push-notifications'
import { messaging } from "./firebase";


function App() {

  useEffect(() => {
    async function setupPushNotifications() {
      try {
        // Check if service workers are supported
        if ('serviceWorker' in navigator) {
          // First, unregister any existing firebase-messaging-sw.js
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            if (registration.scope.includes('firebase-messaging-sw.js')) {
              await registration.unregister();
              console.log('Unregistered old Firebase service worker');
            }
          }

          // Register Firebase messaging service worker
          console.log('Attempting to register Firebase messaging service worker...');
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          console.log('Firebase messaging service worker registered:', registration.scope);

          // Request notification permission
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            throw new Error('Notification permission not granted');
          }

          // Get FCM token with the registered service worker
          const vapidKey = 'BEC4ncuS652Wnb0J2QC2M2ylbtdpwHXj7NVEHrprgj1PcvHjZpo2jID6-YGKCXSy25P5mTrVWlJmzQhWIzoLJ_k';
          console.log('Getting FCM token with VAPID key:', vapidKey);

          const token = await getToken(messaging, {
            vapidKey: vapidKey,
            serviceWorkerRegistration: registration
          });

          console.log('FCM Token:', token);
          localStorage.setItem('fcmToken', token);
          // Save this token to your server for sending notifications
        }
      } catch (error) {
        console.error('Error setting up push notifications:', error);
      }
    }

    setupPushNotifications();

    listenForForegroundMessages();
  }, []);


  return (
    <Router>
      <TooltipProvider>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={<WelcomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/explore" element={<MenuExplorer />} />
          <Route path="/order-tracking/:orderId" element={<OrderTrackingWithErrorBoundary />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/profile" element={<ProfileManagement />} />
          <Route path="/services" element={<Services />} />
          <Route path="/printing" element={<Printing />} />
        </Routes>
      </TooltipProvider>
    </Router>
  );
}




export default App;