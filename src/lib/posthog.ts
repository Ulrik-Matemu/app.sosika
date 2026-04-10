import posthog from 'posthog-js'

let initialized = false

export function initPostHog() {
  if (initialized) return
  if (!import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN) {
    console.warn('Missing PostHog token')
    return
  }

  posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN, {
    api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
    defaults: '2026-01-30',
    capture_pageview: false,
    autocapture: true,
    persistence: 'localStorage+cookie',
  })

  initialized = true
}

export default posthog