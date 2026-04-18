# Trial Resume

**Status**: Live (Task #11)  
**Applies to**: Free plan users

---

## Summary

Free-plan users can create a single **trial copy** of their primary resume. The trial lasts 24 hours *or* until the user saves their first edit — whichever comes first. After the trial ends the resume becomes read-only and an upgrade prompt is shown. The resume is automatically cleaned up after a 3-day grace window if the user has not upgraded.

---

## Lifecycle

| Stage | Condition | User experience |
|-------|-----------|-----------------|
| **Active** | `is_trial=true`, `trial_expires_at > now()` | Amber banner in editor showing time remaining. Normal editing is allowed. |
| **First edit saved** | User saves any change to the trial resume | `trial_expires_at` is immediately set to `now()`. Trial ends; read-only state begins. |
| **Expired (grace)** | `is_trial=true`, `trial_expires_at ≤ now()`, expired < 3 days ago | Red "read-only" banner in editor. Resume visible on dashboard with "Trial expired" badge and Upgrade prompt. All writes are blocked (server-enforced via RLS). |
| **Expired (cleanup)** | Expired ≥ 3 days ago | Hidden from dashboard list. Scheduled deletion via cleanup job (Task #18). |

---

## Dashboard badge

- **Active trial** — amber pill: `Trial · Xh left` (Timer icon)
- **Expired trial** — red pill: `Trial expired` (AlertTriangle icon)

Both badges link to the upgrade/plan page.

---

## Server-side enforcement

RLS policy `block_writes_to_expired_trials` (restrictive) on `public.resumes`:

```sql
USING (
  NOT (is_trial = true AND trial_expires_at IS NOT NULL AND trial_expires_at <= now())
)
```

This blocks any UPDATE by an authenticated user on an expired trial resume,
regardless of client-side guards.

Migration: `supabase/migrations/20260418000003_trial_resume_rls_policy.sql`

---

## Free-quota interaction

Trial resumes do **not** count toward the free plan's 1-resume limit. The quota check in `CreateResumeDialog` and `useResumes` only counts resumes where `is_trial = false`.

---

## Related

- Task #18 — Scheduled cleanup job for expired trial resumes (hard-delete after grace period)
- Task #19 — BYOK status indicator (parallel task)
- `src/components/dashboard/CreateResumeDialog.tsx` — trial creation flow
- `src/components/dashboard/ResumeListCard.tsx` — trial badge
- `src/pages/EditorPage.tsx` — trial banners
- `src/hooks/useResumes.ts` — query filter + write guard
