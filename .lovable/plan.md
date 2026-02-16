

## Production Readiness Audit -- Final Fixes

### Audit Summary

Reviewed all 22 edge functions, database schema, indexes, CORS, auth flow, and data safety. The app is in very good shape overall. Here are the remaining issues to fix before going live:

---

### Issue 1: CRITICAL -- 3 edge functions crash on object-type skills

Three edge functions still use unguarded `.join()` on skills arrays. If a user has skills stored as objects (e.g., `{name: "React"}`), these will crash with `[object Object]` or throw errors.

| File | Line | Crash Code |
|------|------|-----------|
| `career-assessment/index.ts` | 89 | `resume.skills?.join(", ")` |
| `career-path-advisor/index.ts` | 74 | `resume.skills?.join(", ")` |
| `one-page-optimizer/index.ts` | 36 | `resume.skills?.join(', ').length` |

**Fix**: Add `safeSkillsString` helper to `career-assessment` and `career-path-advisor`. For `one-page-optimizer`, the `.join()` on line 36 is used only for character counting, so it needs a safe version too.

---

### Issue 2: IMPORTANT -- `proofread-resume` has no authentication check

The `proofread-resume` edge function does NOT verify the user's JWT token. It reads the body directly without checking `Authorization`. Any unauthenticated user can call this endpoint. All other 21 functions properly verify auth.

**Fix**: Add the standard auth check (create Supabase client, extract token, call `getUser()`).

---

### Issue 3: IMPORTANT -- Missing database index on `resume_versions`

The `resume_versions` table has 77 rows already and will grow fast (every save creates a version). It only has a primary key index -- no index on `user_id` or `resume_id`. With 100 users, queries will scan all rows for each user.

**Fix**: Add composite index `(user_id, resume_id, created_at DESC)` for efficient version lookups.

---

### Issue 4: MODERATE -- Missing database index on `career_assessments`

The `career_assessments` table has no `user_id` index. RLS policy filters by `auth.uid() = user_id`, so every query does a full table scan.

**Fix**: Add index on `(user_id)`.

---

### Issue 5: MODERATE -- Missing database index on `jobs`

The `jobs` table has no `user_id` index. Same full-scan concern.

**Fix**: Add index on `(user_id)`.

---

### Issue 6: LOW -- `send-push-notification` has no caller authentication

The function accepts a `user_id` in the body and sends push notifications to that user. Anyone with the anon key could send notifications to any user by guessing their ID. For launch with 100 users this is low risk, but should be hardened.

**Fix**: Note for future -- add auth check or service-role-only access. Not blocking for initial Android launch.

---

### Issue 7: LOW -- `ai_usage_logs` growth with no cleanup

With 100 users, the `ai_usage_logs` table (currently 582 rows) will grow rapidly. The rate limiter queries this table on every AI request. Without cleanup, performance will degrade over months.

**Fix**: Note for future -- add a cron job or retention policy to prune logs older than 7 days. Not blocking for launch since indexes are already in place.

---

### What's Already Good (No Changes Needed)

- All 19 AI edge functions use `callAI()` with 30-second timeouts
- All functions have proper CORS via shared `getCorsHeaders()` with Android WebView support (`null`, `https://localhost`)
- All functions except `proofread-resume` have proper auth verification
- All tables have RLS enabled with correct user-scoped policies
- Database has proper indexes on high-traffic tables (`resumes`, `ai_usage_logs`, `notifications`)
- Auth context has 5-second timeout fallback for Android WebView startup
- Safe client has hardcoded fallbacks for Capacitor APK builds
- `safeSkillsString` is used in 7 edge functions (score, analyze, tailor, generate-cover-letter, interview-chat, recruiter-sim, optimize-for-linkedin)
- `generate-headshot` has 30-second timeout
- `parse-job-url` has 10-second fetch timeout + 30-second AI timeout + SSRF protection

---

### Implementation Plan

**Step 1: Database migration** (indexes)
```sql
CREATE INDEX idx_resume_versions_user_resume ON resume_versions (user_id, resume_id, created_at DESC);
CREATE INDEX idx_career_assessments_user_id ON career_assessments (user_id);
CREATE INDEX idx_jobs_user_id ON jobs (user_id);
```

**Step 2: Fix `career-assessment/index.ts`**
- Add `safeSkillsString` helper
- Replace line 89: `resume.skills?.join(", ")` with `safeSkillsString(resume.skills)`

**Step 3: Fix `career-path-advisor/index.ts`**
- Add `safeSkillsString` helper
- Replace line 74: `resume.skills?.join(", ")` with `safeSkillsString(resume.skills)`

**Step 4: Fix `one-page-optimizer/index.ts`**
- Add `safeSkillsString` helper
- Replace line 36: `resume.skills?.join(', ').length || 0` with `safeSkillsString(resume.skills).length`

**Step 5: Add auth to `proofread-resume/index.ts`**
- Add Supabase client creation, token extraction, and `getUser()` check (same pattern as all other functions)
- Move body parsing after auth check

