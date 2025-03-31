import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { applyStoredTheme } from "./utils/theme.ts"
import App from './App.tsx'


applyStoredTheme();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register('/firebase-messaging-sw.js')
    .then((registration) => {
      console.log("Service Worker registered:", registration);
    })
    .catch((error) => {
      console.error("Service Worker registration failed:", error);
    });
}


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
