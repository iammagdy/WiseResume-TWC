import * as Sentry from '@sentry/react';
import type { FeedbackPayload } from './captureErrorShim';

declare const __APP_VERSION__: string;

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
 * Note: the standalone Sentry feedback widget (feedbackIntegration) is
 * intentionally NOT installed — feedback is submitted programmatically via
 * captureFeedback() from our own bug-report dialogs so we control the UX
 * and dual-channel (email + Sentry) delivery.
 */
export function initMonitoring(): void {
  if (!DSN) {
    // Only log in development — production always has the DSN configured
    // via the VITE_SENTRY_DSN secret, so this path is development-only.
    if (ENV === 'development') {
      console.info('[monitoring] VITE_SENTRY_DSN not set — error tracking disabled.');
    }
    return;
  }

  Sentry.init({
    dsn: DSN,
    environment: ENV,
    release: __APP_VERSION__,
    sendDefaultPii: true,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.browserProfilingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
      Sentry.consoleLoggingIntegration({ levels: ['warn', 'error'] }),
    ],
    enableLogs: true,
    tracesSampleRate: ENV === 'production' ? 0.1 : 1.0,
    profileSessionSampleRate: ENV === 'production' ? 0.1 : 1.0,
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
      if (Array.isArray(event.breadcrumbs)) {
        event.breadcrumbs = event.breadcrumbs.filter((b) => {
          if (b.category === 'storage') return false;
          const msg = b.message ?? '';
          if (msg.includes('wise_supabase') || msg.includes('localStorage') || msg.includes('sessionStorage')) return false;
          return true;
        });
      }
      return event;
    },
  });

  if (ENV !== 'production') {
    console.info('[monitoring] Sentry initialised — error tracking active.');
  }
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
 * Submit a user-feedback entry to Sentry's User Feedback API.
 * Safe to call when Sentry is not initialized (returns undefined).
 *
 * When `associatedEventId` is supplied, Sentry attaches the feedback to
 * the corresponding error event so the original stacktrace and replay
 * are linked from the feedback view.
 */
export function captureFeedback(payload: FeedbackPayload): string | undefined {
  if (!DSN) return undefined;
  try {
    let id: string | undefined;
    Sentry.withScope((scope) => {
      if (payload.tags) scope.setTags(payload.tags);
      id = Sentry.captureFeedback({
        name: payload.name,
        email: payload.email,
        message: payload.message,
        associatedEventId: payload.associatedEventId,
      });
    });
    return id;
  } catch (err) {
    console.warn('[monitoring] captureFeedback failed:', err);
    return undefined;
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

/**
 * Returns the most recent Sentry event id (e.g. the last captured
 * exception). Used by auto-crash report flows to associate the user
 * feedback submission with the originating error event.
 */
export function getLastSentryEventId(): string | undefined {
  if (!DSN) return undefined;
  try {
    return Sentry.lastEventId();
  } catch {
    return undefined;
  }
}

export { Sentry };
