/* Tiny shim re-exported by modules that may run before monitoring.ts
   has loaded. Importing this file does NOT pull in @sentry/react, so
   it is safe to use from eager startup code paths (ErrorBoundary,
   main.tsx global handlers) without bloating the entry chunk.

   Once monitoring.ts is dynamically imported, it calls
   `setRealCaptureError` to replace the no-op shim with the real
   Sentry-backed implementation; any errors that fired in the
   meantime are buffered (capped) and flushed by the caller.

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
