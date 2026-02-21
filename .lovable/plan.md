

# Database and Backend Improvement Recommendations

## Priority 1 -- Security Fixes (Critical)

### 1A. Move `pgcrypto` Extension Out of Public Schema
The linter flagged an extension installed in the `public` schema. Extensions in `public` can be exploited by authenticated users. Move it to the `extensions` schema (which is already used -- the `hash_share_password` function references `extensions.crypt`).

**Migration:**
```sql
DROP EXTENSION IF EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;
```

### 1B. Fix `resume_shares` "Always True" RLS Warning
The security scan flagged an overly permissive RLS policy. Currently only the `ALL` owner policy exists, which is correct. However the `SUPA_rls_policy_always_true` warning suggests there may be a hidden permissive policy. We should verify and ensure no public SELECT policy leaked in. The `get_shared_resume` RPC (SECURITY DEFINER) already handles public access via token -- no direct table access is needed for anonymous users.

### 1C. `bug_reports` Email Exposure
The `bug_reports` table stores `user_email` and only restricts via `auth.uid() = user_id`. This is actually secure (users can only see their own), but the `user_email` column is redundant since it can be derived from auth. Consider dropping the column in a future cleanup.

## Priority 2 -- Performance Improvements

### 2A. Add Missing Index on `audit_logs(category, created_at)`
As audit logging grows (you just added several new event types), queries filtering by category will benefit from a composite index:
```sql
CREATE INDEX idx_audit_logs_category_created 
ON public.audit_logs (user_id, category, created_at DESC);
```

### 2B. Add Index on `portfolio_visits(username, visited_at)`
The `get_portfolio_analytics` RPC queries by username and orders by `visited_at`. A composite index would speed this up:
```sql
CREATE INDEX idx_portfolio_visits_username_visited 
ON public.portfolio_visits (username, visited_at DESC);
```

### 2C. Partition or TTL for `ai_usage_logs`
This is already the largest table (1,098 rows and growing). The `cleanup_stale_data()` function deletes rows older than 90 days, but this runs manually. Consider scheduling it via a `pg_cron` job:
```sql
SELECT cron.schedule('cleanup-stale-data', '0 3 * * 0', 'SELECT public.cleanup_stale_data()');
```

## Priority 3 -- Data Integrity

### 3A. Add Foreign Key on `resume_versions.resume_id`
Currently `resume_versions.resume_id` has no FK constraint. If a resume is deleted, orphaned versions remain until the cleanup function runs. Add a cascading FK:
```sql
ALTER TABLE public.resume_versions 
ADD CONSTRAINT fk_resume_versions_resume 
FOREIGN KEY (resume_id) REFERENCES public.resumes(id) ON DELETE CASCADE;
```

### 3B. Add Foreign Key on `resume_shares.resume_id`
Same issue -- orphaned shares after resume deletion:
```sql
ALTER TABLE public.resume_shares 
ADD CONSTRAINT fk_resume_shares_resume 
FOREIGN KEY (resume_id) REFERENCES public.resumes(id) ON DELETE CASCADE;
```

### 3C. Add Foreign Key on `cover_letters.resume_id` and `tailor_history.resume_id`
```sql
ALTER TABLE public.cover_letters 
ADD CONSTRAINT fk_cover_letters_resume 
FOREIGN KEY (resume_id) REFERENCES public.resumes(id) ON DELETE SET NULL;

ALTER TABLE public.tailor_history 
ADD CONSTRAINT fk_tailor_history_resume 
FOREIGN KEY (resume_id) REFERENCES public.resumes(id) ON DELETE SET NULL;
```

## Priority 4 -- Backend Improvements

### 4A. Shared Auth Middleware for Edge Functions
Currently each edge function duplicates JWT validation logic. Create a shared `_shared/authMiddleware.ts` helper:
```typescript
export async function requireAuth(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) throw { status: 401, message: 'Unauthorized' };
  const token = authHeader.replace('Bearer ', '');
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, 
    { global: { headers: { Authorization: authHeader } } });
  const { data, error } = await client.auth.getClaims(token);
  if (error || !data?.claims) throw { status: 401, message: 'Unauthorized' };
  return { userId: data.claims.sub, client };
}
```
This reduces duplication across 28+ protected functions.

### 4B. Add `user_preferences` Upsert Trigger
The `user_preferences` table has 0 rows despite active users. This means preferences are not being initialized. Add a trigger on `profiles` insert to auto-create a `user_preferences` row (similar to `handle_new_user`).

### 4C. Remove Dormant Columns
Clean up unused database columns documented in the feature map:
- `resumes.customization` (unused)
- `resumes.is_public` (unused, defaults false)
- `resumes.last_reminder_sent_at` (reserved but unused)

## Summary

| Priority | Item | Type | Effort |
|----------|------|------|--------|
| 1A | Move pgcrypto to extensions schema | Security | Low |
| 1B | Verify resume_shares RLS | Security | Low |
| 1C | Review bug_reports email column | Security | Low |
| 2A | Index on audit_logs | Performance | Low |
| 2B | Index on portfolio_visits | Performance | Low |
| 2C | Schedule cleanup_stale_data | Performance | Low |
| 3A | FK on resume_versions | Integrity | Low |
| 3B | FK on resume_shares | Integrity | Low |
| 3C | FK on cover_letters/tailor_history | Integrity | Low |
| 4A | Shared auth middleware | Backend | Medium |
| 4B | Auto-create user_preferences | Backend | Low |
| 4C | Remove dormant columns | Cleanup | Low |

Approve to implement all changes in order.

