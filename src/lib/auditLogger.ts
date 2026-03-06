import { getClerkSupabaseToken } from '@/lib/clerkSupabase';
import { supabase } from '@/integrations/supabase/client';

type AuditCategory = 'migration' | 'account' | 'api_key' | 'auth';

/**
 * Fire-and-forget audit logger. Inserts a row into `audit_logs`.
 * Never throws -- errors are silently logged to console.
 */
export function logAudit(
  category: AuditCategory,
  action: string,
  metadata: Record<string, unknown> = {},
): void {
  (async () => {
    try {
      const token = await getClerkSupabaseToken();
      if (!token) return;
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload?.sub;
      if (!userId) return;

      await (supabase.from('audit_logs' as never) as any).insert({
        user_id: userId,
        category,
        action,
        metadata,
      });
    } catch (e) {
      console.warn('Audit log failed:', e);
    }
  })();
}
