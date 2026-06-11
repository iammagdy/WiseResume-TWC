/** Module-level user context for ErrorBoundary (class component — no hooks). */

export interface CrashReporterUserContext {
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  planTier: string | null;
  isPremium: boolean;
}

let _context: CrashReporterUserContext = {
  userId: null,
  userEmail: null,
  userName: null,
  planTier: null,
  isPremium: false,
};

export function getCrashReporterContext(): CrashReporterUserContext {
  return _context;
}

export function setCrashReporterContext(partial: Partial<CrashReporterUserContext>): void {
  _context = { ..._context, ...partial };
}

export function clearCrashReporterContext(): void {
  _context = {
    userId: null,
    userEmail: null,
    userName: null,
    planTier: null,
    isPremium: false,
  };
}
