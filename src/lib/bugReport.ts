// Global bug report event system
export interface BugReportData {
  errorMessage: string;
  errorStack?: string;
  componentStack?: string;
  route: string;
}

type BugReportListener = (data: BugReportData) => void;

let listener: BugReportListener | null = null;

export function onBugReport(cb: BugReportListener) {
  listener = cb;
  return () => { listener = null; };
}

export function triggerBugReport(data: BugReportData) {
  listener?.(data);
}

/**
 * Convenience: call from any catch block or toast action.
 * Usage: reportBug(error)  or  reportBug(error, 'while saving resume')
 */
export function reportBug(error: unknown, context?: string) {
  const err = error instanceof Error ? error : new Error(String(error));
  triggerBugReport({
    errorMessage: context ? `${context}: ${err.message}` : err.message,
    errorStack: err.stack,
    route: window.location.pathname,
  });
}
