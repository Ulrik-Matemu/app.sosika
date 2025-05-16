import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { applyStoredTheme } from "./utils/theme.ts"
import App from './App.tsx'
import { CartProvider } from "./context/cartContext";
import { analytics, logEvent } from './firebase.ts'

applyStoredTheme();

logEvent(analytics, "app_open");

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CartProvider>
    <App />
    </CartProvider>

  </StrictMode>,
)
