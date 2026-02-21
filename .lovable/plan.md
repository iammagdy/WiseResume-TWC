

# Database and Auth Improvements

## Issues Found and Fixes

### 1. CRITICAL: Missing Foreign Keys to auth.users (Orphan Data Risk)

**Problem:** 10 out of 17 tables with a `user_id` column have NO foreign key to `auth.users`. If a user deletes their account, their data in these tables becomes orphaned forever and can never be cleaned up.

**Affected tables:**
- `ai_credits`
- `ai_usage_logs`
- `bug_reports`
- `career_assessments` (no FK to auth.users, only to resumes)
- `feature_requests`
- `job_applications`
- `jobs`
- `notifications`
- `resignation_letters`
- `resume_shares`
- `resume_versions`
- `user_api_keys`

**Fix:** Add `REFERENCES auth.users(id) ON DELETE CASCADE` to each table's `user_id` column. This ensures all user data is automatically cleaned up when an account is deleted.

---

### 2. CRITICAL: resume_shares Exposes All Active Shares to Anyone

**Problem:** The RLS policy "Public can view active shares" allows any unauthenticated user to `SELECT * FROM resume_shares WHERE is_active = true`. This means anyone can enumerate every shared resume in the system, see `user_id`, `resume_id`, and `token` values -- effectively giving them access to all shared resumes without knowing the share link.

**Fix:** Replace the overly permissive SELECT policy with a token-gated policy. Since shared resumes are accessed via the `get_shared_resume` RPC (SECURITY DEFINER), the public SELECT policy is unnecessary. Drop it and rely on the RPC for public access.

---

### 3. HIGH: portfolio_visits INSERT Policy Uses `WITH CHECK (true)`

**Problem:** The portfolio_visits INSERT policy allows literally anyone (including unauthenticated users) to insert any row with any data. An attacker could flood this table with fake visit records, corrupting analytics. This is the "RLS Policy Always True" linter warning.

**Fix:** Add a SECURITY DEFINER function `record_portfolio_visit(p_username text, p_country text, p_city text, ...)` that validates the username exists and has portfolio enabled before inserting. Replace the `true` INSERT policy with one that blocks direct inserts, requiring all inserts to go through the RPC.

---

### 4. MEDIUM: No Automatic Data Cleanup for Old Records

**Problem:** Several tables accumulate data indefinitely with no cleanup mechanism:
- `ai_usage_logs` -- grows with every AI request, used only for rate limiting (60-second window)
- `notifications` -- read notifications pile up forever
- `resume_versions` -- every auto-save creates a new version row

**Fix:** Add a scheduled database function (pg_cron or edge function) to:
- Delete `ai_usage_logs` older than 90 days
- Delete read `notifications` older than 30 days
- Keep only the latest 50 `resume_versions` per resume

---

### 5. MEDIUM: Missing Indexes on Frequently Queried Columns

**Problem:** Several commonly-queried columns lack indexes:
- `portfolio_visits.username` -- queried by `get_portfolio_analytics` RPC
- `portfolio_visits.visited_at` -- sorted in analytics queries
- `resume_shares.token` -- looked up by `get_shared_resume` RPC on every share view
- `notifications.user_id` (standalone) -- missing, only composite indexes exist
- `resignation_letters.user_id` -- no index at all

**Fix:** Create targeted indexes on these columns.

---

### 6. MEDIUM: Auth Session Hardening

**Problem:** The auth configuration uses default Supabase settings. For a production app handling sensitive career data, several hardening measures are missing:
- No password strength enforcement beyond basic length
- No rate limiting on login attempts at the application level (Supabase has built-in GoTrue rate limits, but they're generous)
- Session timeout is the default (1 week), which is long for an app with biometric lock

**Fix:**
- Add client-side password strength validation (min 8 chars, must include uppercase, lowercase, and number) in the signup form
- Add a failed login counter that shows a CAPTCHA or cooldown message after 5 failed attempts
- The existing biometric lock already handles session protection on mobile, but add a "Remember me" toggle on web that controls whether the session persists

---

### 7. LOW: profiles Table is Overloaded

**Problem:** The `profiles` table has 37 columns, mixing user identity (name, avatar), portfolio configuration (theme, font, layout, accent color, sync mode, extras), and engagement tracking (views, login streak, last active). This makes queries heavier than needed and violates single-responsibility.

**Fix:** This is a longer-term refactor -- for now, document the column groups. In a future phase, consider splitting into:
- `profiles` (identity: name, avatar, job_title, industry, career_level, location, social URLs)
- `portfolio_settings` (theme, layout, font, accent, sections, sync_mode, extras, meta_title, meta_description)
- `user_engagement` (views, login_streak, last_login_date, last_active_at, hired_at)

---

### 8. LOW: user_api_keys Encrypted Keys Readable via RLS

**Problem:** The `user_api_keys` table has a SELECT policy that lets users read their own `encrypted_key` values. While encrypted, returning ciphertext to the client is unnecessary -- keys are only needed server-side in edge functions. If a client is compromised, the attacker gets the ciphertext.

**Fix:** Create a database view or RPC that returns only `provider`, `key_tier`, `created_at`, `updated_at` -- never `encrypted_key`. Update the SELECT policy or use a column-level security approach.

---

## Implementation Summary

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | Critical | 10 tables missing FK to auth.users | Add ON DELETE CASCADE foreign keys |
| 2 | Critical | resume_shares exposes all shares publicly | Drop overly permissive SELECT policy |
| 3 | High | portfolio_visits allows unrestricted inserts | Replace WITH CHECK (true) with RPC |
| 4 | Medium | No data cleanup for logs/versions | Add cleanup function with retention policy |
| 5 | Medium | Missing indexes on hot columns | Add 5 targeted indexes |
| 6 | Medium | Auth session hardening | Add password rules + failed login handling |
| 7 | Low | profiles table has 37 columns | Document now, split later |
| 8 | Low | Encrypted API keys readable client-side | Restrict SELECT to non-sensitive columns |

---

## Technical Details

### Foreign Key Migration (Item 1)

```sql
ALTER TABLE ai_credits ADD CONSTRAINT ai_credits_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ai_usage_logs ADD CONSTRAINT ai_usage_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE bug_reports ADD CONSTRAINT bug_reports_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Repeat for: career_assessments, feature_requests, job_applications,
-- jobs, notifications, resignation_letters, resume_shares,
-- resume_versions, user_api_keys
```

### resume_shares Policy Fix (Item 2)

```sql
DROP POLICY "Public can view active shares" ON resume_shares;
```

The `get_shared_resume` RPC (SECURITY DEFINER) already handles public access by validating the token and returning data. No direct table SELECT is needed for anonymous users.

### portfolio_visits RPC (Item 3)

```sql
CREATE OR REPLACE FUNCTION record_portfolio_visit(
  p_username text,
  p_country text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_referrer text DEFAULT NULL,
  p_short_link_id text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Validate portfolio exists and is enabled
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE username = lower(p_username) AND portfolio_enabled = true
  ) THEN
    RETURN;
  END IF;

  INSERT INTO portfolio_visits (username, country, city, referrer, short_link_id)
  VALUES (lower(p_username), p_country, p_city, p_referrer, p_short_link_id);
END;
$$;

-- Replace the permissive policy
DROP POLICY "Anyone can record portfolio visit" ON portfolio_visits;
CREATE POLICY "No direct inserts" ON portfolio_visits FOR INSERT
  WITH CHECK (false);
```

### Index Creation (Item 5)

```sql
CREATE INDEX idx_portfolio_visits_username ON portfolio_visits (username);
CREATE INDEX idx_portfolio_visits_visited_at ON portfolio_visits (visited_at DESC);
CREATE INDEX idx_resume_shares_token ON resume_shares (token);
CREATE INDEX idx_resignation_letters_user_id ON resignation_letters (user_id);
```

### Auth Password Validation (Item 6)

Add Zod schema validation to the signup form in `AuthPage.tsx`:

```typescript
const passwordSchema = z.string()
  .min(8, 'At least 8 characters')
  .regex(/[A-Z]/, 'Include an uppercase letter')
  .regex(/[a-z]/, 'Include a lowercase letter')
  .regex(/[0-9]/, 'Include a number');
```

### API Keys View (Item 8)

```sql
CREATE OR REPLACE FUNCTION get_user_api_key_info(p_user_id uuid)
RETURNS TABLE(provider text, key_tier text, created_at timestamptz, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT provider, key_tier, created_at, updated_at
  FROM user_api_keys
  WHERE user_id = p_user_id AND p_user_id = auth.uid();
$$;
```

### Recommended Implementation Order
1. Foreign keys (prevents orphan data immediately)
2. resume_shares policy fix (closes data enumeration vulnerability)
3. portfolio_visits RPC (closes spam vector)
4. Indexes (instant query performance improvement)
5. Auth password validation (signup hardening)
6. API keys view (defense in depth)
7. Data cleanup function (operational health)
8. Document profiles split (future planning)

