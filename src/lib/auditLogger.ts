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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return; // Can't log without a user

      // Use type assertion since audit_logs may not be in generated types yet
      await (supabase.from('audit_logs' as never) as any).insert({
        user_id: user.id,
        category,
        action,
        metadata,
      });
    } catch (e) {
      console.warn('Audit log failed:', e);
    }
  })();
}
