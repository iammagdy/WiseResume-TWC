// ── Activity Tracker ───────────────────────────────────────────────────────
// Lightweight in-memory singleton that tracks which feature/tool is active
// and buffers recent errors so the shake-to-report dialog can auto-fill context.

interface RecentError {
  message: string;
  stack?: string;
  timestamp: number;
}

const MAX_ERRORS = 5;
const ERROR_TTL_MS = 60_000; // 60 seconds

let activeFeature: string | null = null;
let recentErrors: RecentError[] = [];

export const activityTracker = {
  setActiveFeature(name: string | null) {
    activeFeature = name;
  },

  pushRecentError(message: string, stack?: string) {
    recentErrors.push({ message, stack, timestamp: Date.now() });
    if (recentErrors.length > MAX_ERRORS) {
      recentErrors = recentErrors.slice(-MAX_ERRORS);
    }
  },

  getSnapshot() {
    const now = Date.now();
    const fresh = recentErrors.filter((e) => now - e.timestamp < ERROR_TTL_MS);
    return {
      activeFeature,
      recentErrors: fresh,
    };
  },

  clearErrors() {
    recentErrors = [];
  },
};
