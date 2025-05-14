import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { applyStoredTheme } from "./utils/theme.ts"
import App from './App.tsx'
import { CartProvider } from "./context/cartContext";

applyStoredTheme();




createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CartProvider>
    <App />
    </CartProvider>

  </StrictMode>,
)
