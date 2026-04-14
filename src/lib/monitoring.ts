import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const ENV = import.meta.env.MODE ?? 'development';

/**
 * Initialize Sentry for the React application.
 *
 * Must be called once, before ReactDOM.createRoot(), to capture errors at the
 * earliest possible moment. Initialization is gated behind VITE_SENTRY_DSN:
 * the app functions normally without it, but production error alerting is
 * disabled until the DSN is configured.
 *
 * Configuration:
 *   - Set VITE_SENTRY_DSN in environment secrets to your project's DSN.
 *   - tracesSampleRate: 0.1 in production (10% of transactions traced).
 *   - replaysOnErrorSampleRate: 1.0 to capture session replays on every error.
 */
export function initMonitoring(): void {
  if (!DSN) {
    if (ENV !== 'test') {
      console.info('[monitoring] VITE_SENTRY_DSN not set — error tracking disabled.');
    }
    return;
  }

  Sentry.init({
    dsn: DSN,
    environment: ENV,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: ENV === 'production' ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.0,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      if (event.exception) {
        const firstException = event.exception.values?.[0];
        const firstFrame = firstException?.stacktrace?.frames?.[0];
        if (firstFrame?.filename?.includes('node_modules') && ENV === 'production') {
          return null;
        }
      }
      if (event.request?.data) {
        delete event.request.data;
      }
      return event;
    },
  });
}

/**
 * Capture an error with optional contextual metadata.
 * Safe to call when Sentry is not initialized (no-ops silently).
 */
export function captureError(err: unknown, context?: Record<string, unknown>): void {
  if (!DSN) return;
  if (context) {
    Sentry.withScope((scope) => {
      scope.setExtras(context);
      Sentry.captureException(err);
    });
  } else {
    Sentry.captureException(err);
  }
}

/**
 * Set the authenticated user on Sentry scope.
 * Call this after successful sign-in; clear on sign-out.
 */
export function setMonitoringUser(userId: string | null): void {
  if (!DSN) return;
  if (userId) {
    Sentry.setUser({ id: userId });
  } else {
    Sentry.setUser(null);
  }
}

export { Sentry };
