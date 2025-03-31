import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { RegisterPage } from "./pages/register";
import WelcomePage from "./pages/welcome";
import LoginPage from "./pages/login";
import MenuExplorer from "./pages/explore";
import OrderTracking from "./components/my-components/orderTracking";
import OrdersPage from "./pages/orders";
import ProfileManagement from "./pages/profile";
import "./App.css";
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';
import { TooltipProvider } from "./components/ui/tooltip"; // Ensure correct import
import {  listenForForegroundMessages } from './push-notifications'

const firebaseConfig = {
  apiKey: "AIzaSyA_Jw-BGThGsqhB8_t5_AH6D9AL1YLCjK8",
  authDomain: "sosika-101.firebaseapp.com",
  projectId: "sosika-101",
  storageBucket: "sosika-101.firebasestorage.app",
  messagingSenderId: "827695672687",
  appId: "1:827695672687:web:85ce347456339ccfd80c9a",
  measurementId: "G-692C6RSH31"
};

function App() {

  useEffect(() => {
    const app = initializeApp(firebaseConfig);
    
    // Register Firebase service worker separately
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then((registration) => {
          console.log('Firebase Messaging SW registered successfully:', registration.scope);
          
          // Request notification permission
          Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
              console.log('Notification permission granted.');
              
              // Get messaging instance
              const messaging = getMessaging(app);
              
              // Get FCM token
              getToken(messaging, { 
                vapidKey: 'BEC4ncuS652Wnb0J2QC2M2ylbtdpwHXj7NVEHrprgj1PcvHjZpo2jID6-YGKCXSy25P5mTrVWlJmzQhWIzoLJ_k',
                serviceWorkerRegistration: registration 
              }).then((token) => {
                console.log('FCM Token:', token);
                // Save token to server or local storage
              }).catch((err) => {
                console.error('Error getting token:', err);
              });
            } else {
              console.log('Unable to get permission to notify.');
            }
          });
        })
        .catch((err) => {
          console.error('Service Worker registration failed:', err);
        });
    }

      listenForForegroundMessages();
  }, []);


  return (
    <Router>
      <TooltipProvider>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/explore" element={<MenuExplorer />} />
        <Route path="/order-tracking/:orderId" element={<OrderTracking />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/profile" element={<ProfileManagement />} />
      </Routes>
      </TooltipProvider>
    </Router>
  );
}

export default App;
