import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PostHogProvider } from '@posthog/react'
import './index.css'
import App from './App.tsx'
import { CartProvider } from "./context/cartContext";
import { ThemeProvider } from "./context/ThemeContext";
import { analytics, logEvent } from './firebase.ts'
import 'mapbox-gl/dist/mapbox-gl.css';
import { initPostHog } from './lib/posthog.ts';
import posthog from './lib/posthog.ts'

logEvent(analytics, "app_open");

initPostHog();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PostHogProvider client={posthog}>
      <ThemeProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </ThemeProvider>
    </PostHogProvider>

  </StrictMode>,
)
