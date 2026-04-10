import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PostHogProvider } from '@posthog/react'
import './index.css'
import { applyStoredTheme } from "./utils/theme.ts"
import App from './App.tsx'
import { CartProvider } from "./context/cartContext";
import { analytics, logEvent } from './firebase.ts'
import 'mapbox-gl/dist/mapbox-gl.css';
import { initPostHog } from './lib/posthog.ts';
import posthog from './lib/posthog.ts'

applyStoredTheme();

logEvent(analytics, "app_open");

initPostHog();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PostHogProvider client={posthog}>
      <CartProvider>
        <App />
      </CartProvider>
    </PostHogProvider>

  </StrictMode>,
)
