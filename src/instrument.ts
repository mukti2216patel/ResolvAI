import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Capture 100% of transactions in dev, tune down in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

  // Only enable when a DSN is actually configured
  enabled: !!process.env.SENTRY_DSN,

  environment: process.env.NODE_ENV ?? 'development',
});
