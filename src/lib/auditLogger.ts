import { databases, DATABASE_ID, ID, account } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';

type AuditCategory = 'migration' | 'account' | 'api_key' | 'auth' | 'onboarding';

/**
 * Fire-and-forget audit logger. Inserts a row into `audit_logs`.
 * Never throws — errors are silently logged to console.
 */
export function logAudit(
  category: AuditCategory,
  action: string,
  metadata: Record<string, unknown> = {},
): void {
  (async () => {
    try {
      let userId: string | null = null;
      try {
        const user = await account.get();
        userId = user.$id;
      } catch {
        return;
      }
      if (!userId) return;

      await databases.createDocument(DATABASE_ID, COLLECTIONS.audit_logs, ID.unique(), {
        user_id: userId,
        category,
        action,
        metadata: JSON.stringify(metadata),
      });
    } catch (e) {
      console.warn('Audit log failed:', e);
    }
  })();
}
