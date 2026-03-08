import { supabase } from '@/integrations/supabase/safeClient';

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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      const userId = session.user.id;

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
