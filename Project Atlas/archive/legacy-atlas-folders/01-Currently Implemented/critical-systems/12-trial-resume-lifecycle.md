# Trial Resume Lifecycle

**Last verified:** 2026-04-26
**Type:** deep dive
**Sources:**
- `supabase/migrations/20260418000002_add_trial_resume_columns.sql` (schema)
- `supabase/migrations/20260418000003_trial_resume_rls_policy.sql` (RLS)
- `supabase/migrations/20260418000004_trial_expire_on_edit_trigger.sql` (DB trigger)
- `supabase/migrations/20260426000001_delete_expired_trial_resumes.sql` (purge function)
- `src/hooks/useResumes.ts` (client-side grace filter + write guards)
- `src/hooks/useEditorAutosave.ts` (read-only gate)
- `src/pages/EditorPage.tsx` (trial banners)
- `src/components/dashboard/CreateResumeDialog.tsx` (trial creation)
- `server/index.ts` (`runAnalyticsSweep` — daily purge)
- `docs/features/trial-resume.md` (plain-language feature doc)

**Canonical owner:** `supabase/migrations/` (DB layer is authoritative) + `useResumes.ts` (client-side behaviour).

---

## What it is

Free-plan users who already have one resume can create a 24-hour trial resume — a full copy of their existing resume they can edit once. The trial expires either after 24 hours or on first save, whichever comes first. After expiry it becomes read-only for 3 days, then is hard-deleted by the daily sweep.

---

## Schema

Two columns on `resumes`: `is_trial BOOLEAN NOT NULL DEFAULT false` and `trial_expires_at TIMESTAMPTZ`. Partial index `idx_resumes_trial_expires WHERE is_trial = true` supports efficient cleanup.

Trial resumes do **not** count toward the free-plan quota of 1 non-trial resume.

---

## Lifecycle — authoritative layer at each stage

| Stage | What happens | Where enforced |
|---|---|---|
| Creation | `is_trial = true`, `trial_expires_at = now() + 24h`, full copy of parent resume | `CreateResumeDialog.tsx` |
| First content edit | `trial_expires_at` set to `now()` atomically | DB trigger `expire_trial_resume_on_first_edit` (BEFORE UPDATE) |
| Client belt-and-suspenders | Same UPDATE also sends `trial_expires_at = now()` from client | `useResumes.ts` |
| Expired — write blocked | RLS policy `block_writes_to_expired_trials` (USING-only) blocks UPDATE on old-row-expired trials | Supabase RLS |
| Expired — read-only display | Grace window: client hides trials expired > 3 days; expired but < 3 days shown read-only with amber banner | `useResumes.ts` grace filter + `EditorPage.tsx` banner |
| Hard delete | Daily sweep calls `purge_expired_trial_resumes()` for trials expired > 3 days | `server/index.ts` `runAnalyticsSweep` |

---

## Why USING-only (not WITH CHECK) on the RLS policy

The first-edit trigger needs the UPDATE to go through on an **active** trial (old row: `trial_expires_at > now()`). USING checks the OLD row, so the first-edit UPDATE is allowed through. The trigger then sets `trial_expires_at = now()` on the NEW row. Subsequent UPDATEs see an already-expired OLD row and are blocked by USING. WITH CHECK would have blocked the trigger's own write.

---

## Re-use loophole fix

`CreateResumeDialog.tsx` checks for any existing trial resume (including expired ones in the 3-day grace window) before allowing a new one. A user cannot create a second trial until the first is fully purged.

---

## Observability

- Trial resumes deleted per day are reported in `SweepResult.trial_resumes_deleted` and visible in the admin Deployment Panel sweep section.
- Active trial banners in `EditorPage.tsx`: amber (active, shows time remaining), red (expired, read-only lock).

---

**Related cards:**
- `../database-tables/resumes.md` (column details)
- `../stability-fixes/phase-5-analytics-data-lifecycle.md` (purge mechanism)
- `../critical-systems/09-security-model.md` (RLS overview)
- `../critical-systems/06-admin-dev-kit.md` (sweep dashboard)
