import { supabase } from '@/integrations/supabase/safeClient';
import { logAudit } from '@/lib/auditLogger';

const CLEANUP_KEY = 'wr-cleanup-last';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Remove stale migration checkpoint keys from localStorage.
 * Once a pipeline is marked done (`wr-migration-*-done = "1"`),
 * the intermediate `-step` key is no longer needed.
 */
function pruneLocalStorageCheckpoints(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && /^wr-migration-.*-done$/.test(key) && localStorage.getItem(key) === '1') {
        const stepKey = key.replace(/-done$/, '-step');
        if (localStorage.getItem(stepKey) !== null) {
          keysToRemove.push(stepKey);
        }
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // localStorage may be unavailable (SSR, private browsing) — ignore
  }
}

/**
 * Run a daily cleanup cycle (debounced to once per 24 h).
 * - Prunes localStorage migration checkpoints
 * - Calls the server-side `cleanup_stale_data` RPC
 * - Logs the event to audit_logs
 *
 * Fire-and-forget — never throws.
 */
export async function runDailyCleanup(): Promise<void> {
  try {
    const last = localStorage.getItem(CLEANUP_KEY);
    if (last && Date.now() - Number(last) < ONE_DAY_MS) return;

    pruneLocalStorageCheckpoints();

    await (supabase.rpc as any)('cleanup_stale_data');

    localStorage.setItem(CLEANUP_KEY, String(Date.now()));
    logAudit('account', 'daily_cleanup_ran');
  } catch (e) {
    console.warn('Daily cleanup failed:', e);
  }
}
