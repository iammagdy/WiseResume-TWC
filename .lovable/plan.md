

# Production Backend Audit -- Issues and Fixes

## Summary of Findings

The database schema is well-structured overall -- RLS is enabled on all 23 tables, indexes are comprehensive, and the cron jobs are properly configured. However, there are **2 critical issues** that will break the app for new users, plus several high-priority fixes needed before going live.

---

## CRITICAL Issues

### 1. Missing `handle_new_user` Trigger on `auth.users`

The function `handle_new_user()` exists and correctly inserts a profile row when a new user signs up. **But the trigger that calls it is missing.** This means any new user who signs up will have NO profile row, causing the entire app to break for them (no dashboard data, no portfolio, no settings).

**Fix:** Re-create the trigger on `auth.users`.

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### 2. Resume Deletion Fails Due to NO ACTION Foreign Keys

When a user deletes a resume, the operation will throw a database error because 6 child tables have foreign keys to `resumes` with `NO ACTION` on delete. Since `resume_id` is nullable on all these tables, the correct behavior is `SET NULL`.

Affected tables and their FK constraints:
- `ai_usage_logs.resume_id` (fk_ai_usage_logs_resume)
- `career_assessments.resume_id` (fk_career_assessments_resume)
- `cover_letters.resume_id` (fk_cover_letters_resume)
- `interview_sessions.resume_id` (fk_interview_sessions_resume)
- `job_applications.resume_id` (fk_job_applications_resume)
- `tailor_history.resume_id` (fk_tailor_history_resume)
- `profiles.portfolio_resume_id` (profiles_portfolio_resume_id_fkey)
- `resumes.parent_resume_id` (resumes_parent_resume_id_fkey)

**Fix:** Alter each FK to use `ON DELETE SET NULL`.

---

## HIGH Priority Issues

### 3. 6 Users Missing `user_preferences` Records

The `handle_new_profile_preferences` trigger exists on `profiles` and works for new profiles, but 6 existing users never got their `user_preferences` rows created (likely signed up before the trigger was added). These users may encounter errors when accessing settings.

**Fix:** Backfill missing records:

```sql
INSERT INTO public.user_preferences (user_id)
SELECT p.user_id FROM public.profiles p
LEFT JOIN public.user_preferences up ON up.user_id = p.user_id
WHERE up.user_id IS NULL;
```

### 4. Missing Foreign Keys on `short_links` and `audit_logs`

- `short_links.owner_user_id` has NO foreign key to `auth.users`. If a user account is deleted, their short links become orphaned.
- `audit_logs.user_id` has NO foreign key to `auth.users`. Same orphaning risk.

**Fix:** Add FKs with CASCADE delete.

```sql
ALTER TABLE public.short_links
  ADD CONSTRAINT short_links_owner_user_id_fkey
  FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

### 5. `portfolio_visits.username` Has No FK to `profiles.username`

Portfolio visits reference usernames but have no constraint ensuring the username exists. If a user changes their username, old visit records become unlinked. This is acceptable for analytics (historical data), but worth noting. No change needed -- the `record_portfolio_visit` RPC already validates the username exists.

---

## MEDIUM Priority Improvements

### 6. Move `pg_net` Extension Out of Public Schema

The linter flagged `pg_net` in the public schema. Best practice is to move it to the `extensions` schema to reduce the public API surface.

```sql
ALTER EXTENSION pg_net SET SCHEMA extensions;
```

### 7. `ai-health` Endpoint Accepts API Key in Query Parameter

The `/ai-health` edge function accepts a Gemini API key as `?userGeminiKey=...` in the URL. Query parameters appear in server logs and browser history. Since this endpoint is just a health check and the key is only used for a lightweight GET request, the risk is low. However, for production, it should accept the key via the request body (POST) or use the server-side encrypted key lookup pattern already used by other functions.

**Fix:** Update the edge function to retrieve the user's Gemini key from the `user_api_keys` table instead of accepting it as a parameter, consistent with all other AI functions.

---

## What's Already Good (no changes needed)

- All 23 tables have RLS enabled with correct `auth.uid() = user_id` policies
- All user_id columns use `ON DELETE CASCADE` FKs to `auth.users`
- SECURITY DEFINER functions properly protect public portfolio data
- Composite indexes on high-query tables (ai_usage_logs, job_applications, notifications, portfolio_visits)
- `updated_at` triggers on all relevant tables
- `notify_application_change` trigger on `job_applications` working
- `cleanup_stale_data` cron job running weekly
- Weekly digest and resume reminder cron jobs configured
- `user_api_keys_safe` view with `security_invoker=on` properly hides encrypted keys
- BCrypt password hashing for shared resume passwords

---

## Implementation Plan

### Step 1: Database migration (single SQL migration)

One migration that:
1. Creates the `handle_new_user` trigger on `auth.users`
2. Alters 8 FK constraints from NO ACTION to SET NULL
3. Backfills missing `user_preferences` records
4. Adds missing FKs on `short_links` and `audit_logs`
5. Moves `pg_net` to extensions schema

### Step 2: Update `ai-health` edge function

Modify it to accept authentication and look up the user's Gemini key from `user_api_keys` server-side, removing the query parameter approach.

### Expected result
- New user signups will auto-create profiles (critical fix)
- Resume deletion will work without FK errors (critical fix)
- Account deletion will properly cascade to all child tables
- All existing users will have their preferences records
- Consistent API key handling across all edge functions

