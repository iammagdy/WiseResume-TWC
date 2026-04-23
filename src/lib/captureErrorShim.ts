/* Tiny shim re-exported by modules that may run before monitoring.ts
   has loaded. Importing this file does NOT pull in @sentry/react, so
   it is safe to use from eager startup code paths (ErrorBoundary,
   main.tsx global handlers) without bloating the entry chunk.

   Once monitoring.ts is dynamically imported, it calls
   `setRealCaptureError` / `setRealCaptureFeedback` to replace the no-op
   shims with the real Sentry-backed implementations; any errors or
   feedback submissions that fired in the meantime are buffered (capped)
   and flushed by the caller.

   Keep this file dependency-free. */

type CaptureFn = (err: unknown, context?: Record<string, unknown>) => void;

const MAX_BUFFER = 100;
export interface BufferedCapture { err: unknown; context: Record<string, unknown> }
export const earlyCaptureBuffer: BufferedCapture[] = [];

let real: CaptureFn | null = null;

export const captureError: CaptureFn = (err, context = {}) => {
  if (real) {
    real(err, context);
    return;
  }
  if (earlyCaptureBuffer.length < MAX_BUFFER) {
    earlyCaptureBuffer.push({ err, context });
  }
};

export function setRealCaptureError(fn: CaptureFn): void {
  real = fn;
}

// ── Feedback shim ──────────────────────────────────────────────────────────
//
// Mirrors the captureError pattern for Sentry's User Feedback API.
// Returns true when accepted (real impl invoked OR queued for flush);
// false only when the buffer overflows. Synchronous so call sites can
// fan-out alongside the email send without blocking on Sentry init.

export interface FeedbackPayload {
  name?: string;
  email?: string;
  message: string;
  associatedEventId?: string;
  tags?: Record<string, string>;
}

type FeedbackFn = (payload: FeedbackPayload) => string | undefined;

const MAX_FEEDBACK_BUFFER = 50;
export const earlyFeedbackBuffer: FeedbackPayload[] = [];

let realFeedback: FeedbackFn | null = null;

export const captureFeedback = (payload: FeedbackPayload): boolean => {
  if (realFeedback) {
    try {
      // Real impl returns the Sentry event id (string) on acceptance, or
      // undefined when DSN is missing / capture failed silently. Treat
      // only a non-empty id as a successful submission so callers can
      // distinguish real Sentry delivery from a no-op.
      const id = realFeedback(payload);
      return typeof id === 'string' && id.length > 0;
    } catch {
      return false;
    }
  }
  if (earlyFeedbackBuffer.length < MAX_FEEDBACK_BUFFER) {
    earlyFeedbackBuffer.push(payload);
    // Buffered submissions are flushed once Sentry initialises; we count
    // the queueing as accepted so early bug reports aren't reported as
    // failed during the brief pre-init window.
    return true;
  }
  return false;
};

export function setRealCaptureFeedback(fn: FeedbackFn): void {
  realFeedback = fn;
}

// ── Last Sentry event id ───────────────────────────────────────────────────
//
// Exposed so auto-crash flows can attach the originating error event to
// the user-feedback submission (Sentry will then surface the replay /
// stacktrace alongside the feedback message).

type LastEventIdFn = () => string | undefined;

let realLastEventId: LastEventIdFn | null = null;

export function getLastSentryEventId(): string | undefined {
  return realLastEventId ? realLastEventId() : undefined;
}

export function setRealLastEventId(fn: LastEventIdFn): void {
  realLastEventId = fn;
}
