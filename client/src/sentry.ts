import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,

  integrations: [
    // Traces page navigations and HTTP requests
    Sentry.browserTracingIntegration(),
    // Records a video-like replay of the session when an error occurs
    Sentry.replayIntegration({
      // Mask user-entered text (passwords, emails, etc.)
      maskAllText: true,
      blockAllMedia: false,
    }),
  ],

  // Capture 100% of transactions in dev, 20% in production
  tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,

  // Propagate trace headers to the backend API
  tracePropagationTargets: ['localhost', /^\/api/],

  // Record 10% of sessions, 100% of error sessions
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  environment: import.meta.env.MODE,

  // No-op when DSN is not set (local dev without Sentry account)
  enabled: !!import.meta.env.VITE_SENTRY_DSN,
});
