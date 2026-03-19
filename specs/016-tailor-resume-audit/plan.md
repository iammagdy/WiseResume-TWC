# Implementation Plan: Tailor Resume – Audit & Correctness Fixes

**Branch**: `016-tailor-resume-audit` | **Date**: 2026-03-19 | **Spec**: `specs/016-tailor-resume-audit/spec.md`

---

## Summary

The Tailor Resume feature is substantially built but has **6 real bugs/gaps** and **1 misleading comment** that must be fixed before it can be called production-ready. This plan covers all fixes in a safe, incrementally testable order. No new features are being added — this is a correctness and security hardening pass.

**What needs to be done (in priority order):**

1. **Credit gate** — `tailor-resume` edge function never calls `checkUserCreditBalance()` or `increment_ai_usage()`. The shared utilities for both already exist in `_shared/creditUtils.ts`; the edge function just needs to call them.
2. **JWT comment** — `requireAuth()` already does full signature verification via `jose.jwtVerify`. The comment in the edge function ("decodes JWT without signature check") is wrong. Remove it.
3. **ID-based merge** — Experience and education are merged by array index in `handleApplyChanges`, not by `id`. If the AI reorders items, resume data silently misaligns.
4. **Auto-tailor re-trigger** — `autoTailorTriggered.current` resets only on sheet re-open. A second different URL in the same session skips auto-tailor.
5. **Null `currentResumeId` guard** — No guard before the Supabase `INSERT` when applying. Must abort with a specific toast and keep the sheet open.
6. **`job_match_score` null vs 0** — Defaults to `0` when the AI returns no score. Must be `null` to distinguish "not scored" from "zero match."
7. **Dead code** — Legacy `tailorResume()` function must be removed (or its caller migrated) once confirmed unused.
8. **Duplicate log** — `console.log('Authenticated user:', userId)` appears twice in the edge function.

---

## Technical Context

**Language/Version**: TypeScript (React 18 frontend), Deno (Supabase Edge Functions)
**Primary Dependencies**:
- Frontend: React, Zustand, `sonner` (toasts), Supabase JS client
- Edge Functions: Deno std, `jose` (JWT verification), shared `_shared/creditUtils.ts`, `_shared/aiClient.ts`, `_shared/rateLimiter.ts`

**Storage**: Supabase PostgreSQL
- `ai_credits` table — `user_id`, `daily_usage`, `daily_limit`, `usage_date`, `total_usage`
- `user_preferences` table — `ai_provider` (determines BYOK status)
- `resumes` table — `parent_resume_id`, `target_job_title`, `target_company`, `job_match_score` (nullable int), `job_url`
- `ai_usage_logs` table — rate-limit tracking

**RPCs**:
- `increment_ai_usage(p_user_id)` — increments `daily_usage` and `total_usage` with date-aware reset logic. Already used by `generate-portfolio-bio`.

**Shared Utilities Already Available**:
- `_shared/creditUtils.ts` → `checkUserCreditBalance(userId)` — returns `{ hasCredits, remaining }`, handles BYOK bypass
- `_shared/aiClient.ts` → `callAIWithRetry()`, `getUserKeyFromDB()`, `isAIError()`
- `_shared/rateLimiter.ts` → `checkRateLimit()`, `recordUsage()`
- `_shared/authMiddleware.ts` → `requireAuth()` — already does `jose.jwtVerify` with `SUPABASE_JWT_SECRET`

**Testing**: Vitest (frontend unit), manual edge function testing via Supabase CLI
**Target Platform**: Hostinger (frontend), Supabase Edge Runtime (Deno)
**Constraints**: No new DB migrations needed. All fixes use existing tables and RPCs.

---

## Constitution Check

*GATE: Must pass before implementation begins.*

- **No Supabase Auth** — all auth goes through Kinde + `requireAuth()`. This plan does not touch auth flow. ✅
- **No new branding** — no UI copy changes in this plan. ✅
- **RLS preserved** — credit check uses the service-role client internally (as all other edge functions do). No RLS bypass introduced. ✅
- **No fabricated data** — fixes enforce the existing data contract more strictly (ID matching, null score). ✅
- **Agent governance** — all changes inspected against actual schema before modification. Database structure confirmed via `supabase/migrations/`. ✅

---

## Project Structure

### Documentation (this feature)

```text
specs/016-tailor-resume-audit/
├── spec.md          # Finalized spec
├── plan.md          # This file
└── tasks.md         # Generated via /speckit.tasks (next step)
```

### Files Modified

```text
supabase/functions/
└── tailor-resume/
    └── index.ts                         # MODIFIED: credit check + increment + comment fix + dedupe log

src/components/editor/
└── TailorSheet.tsx                      # MODIFIED: ID-based merge, null guard, auto-tailor reset, null score

src/lib/
└── aiTailor.ts                          # MODIFIED: remove legacy tailorResume() if no callers found
```

### Files NOT Modified (confirmed read-only for this spec)

```text
supabase/functions/_shared/creditUtils.ts   # Used as-is (no changes needed)
supabase/functions/_shared/authMiddleware.ts # Already correct — JWT verified
supabase/functions/_shared/aiClient.ts       # Not touching credit logic here
```

---

## Phase-by-Phase Approach

### Phase 1 — Edge Function Hardening (server-side, highest risk)

**Goal**: Add the credit gate and clean up the edge function. These are server-side changes with no client dependencies.

**Steps:**

1. In `tailor-resume/index.ts`, after `requireAuth` succeeds and before `callAIWithRetry`:
   - Import `checkUserCreditBalance` from `../_shared/creditUtils.ts`
   - Call `await checkUserCreditBalance(userId)`
   - If `!result.hasCredits`, return HTTP `402` with `{ error: 'Insufficient AI credits. Add your own Gemini API key for unlimited access.' }`

2. After `callAIWithRetry` succeeds (and `tailoredResult` is parsed):
   - Import `getServiceClient` from `../_shared/dbClient.ts` (already imported)
   - Call `svcClient.rpc('increment_ai_usage', { p_user_id: userId })` — fire-and-forget pattern (same as the `usage_events` insert already in the function)
   - Only call `increment_ai_usage` for non-BYOK users. `checkUserCreditBalance` already checks `user_preferences.ai_provider` — re-use its `isBYOK` logic, or check if `remaining === 9999` as the signal.

3. Remove the misleading comment `// Authentication via shared middleware (decodes JWT without signature check)` — replace with `// requireAuth() verifies JWT signature via jose.jwtVerify`

4. Remove the duplicate `console.log('Authenticated user:', userId)` on line 35.

**Verification**: Deploy to local Supabase dev. Test with zero-credit user → expect 402. Test with BYOK user → expect 200 with no credit decrement. Test with credited user → expect 200 and `ai_credits.daily_usage` incremented by 1.

---

### Phase 2 — Client: ID-Based Merge Fix (highest data-integrity risk)

**Goal**: Fix `handleApplyChanges` in `TailorSheet.tsx` to merge experience and education by `id`.

**Steps:**

1. Replace the experience merge block (currently lines 404–408):
   ```ts
   // Before (index-based):
   mergedResume.experience = tailorResult.experience.map((exp, index) => ({
     ...currentResume.experience[index],
     ...exp,
   }));

   // After (ID-based):
   const originalExpById = Object.fromEntries(
     currentResume.experience.map(e => [e.id, e])
   );
   mergedResume.experience = currentResume.experience.map(orig => {
     const tailored = tailorResult.experience.find(e => e.id === orig.id);
     return tailored ? { ...orig, ...tailored } : orig;
   });
   ```
   This pattern: (a) iterates the **original** array as the source of truth, (b) looks up the AI's version by ID, (c) falls back to the original for any entries the AI omitted, (d) discards any AI entries with unknown IDs (they never appear since we iterate originals).

2. Apply the identical ID-based pattern to the education merge block.

3. Projects, certifications, and awards remain wholesale replacement — no change needed.

**Verification**: Unit test with a mock `tailorResult` where experience is returned in reversed order. Confirm merged result has entries in original order with correct AI content on each.

---

### Phase 3 — Client: Null Guard on Apply (UX correctness)

**Goal**: Abort `handleApplyChanges` gracefully when `currentResumeId` is null.

**Steps:**

1. At the very top of `handleApplyChanges`, before `setIsApplying(true)`:
   ```ts
   if (!currentResumeId) {
     toast.error('Please select a resume before applying changes.');
     return;
   }
   ```

2. `job_match_score` fix — change the existing insert line:
   ```ts
   // Before:
   job_match_score: tailorResult.overallScore?.after ?? 0,

   // After:
   job_match_score: tailorResult.overallScore?.after ?? null,
   ```

**Verification**: Temporarily set `currentResumeId` to null in a dev build. Confirm no insert is made, the correct toast appears, and the sheet stays open.

---

### Phase 4 — Client: Auto-Tailor Re-trigger Fix

**Goal**: Reset `autoTailorTriggered.current` when a new, different parsed job URL produces a different `parsedJobInfo`.

**Steps:**

1. In `handleParsedJobInfo` callback (currently line 323), change the reset condition:
   ```ts
   // Before: reset only on sheet open (via useEffect)
   // After: also reset when parsedJobInfo changes to something different

   const handleParsedJobInfo = useCallback((info: { title: string; company: string; url?: string } | null) => {
     // Reset auto-tailor flag if new job info differs from previous
     if (info && (info.title !== parsedJobInfo?.title || info.company !== parsedJobInfo?.company)) {
       autoTailorTriggered.current = false;
     }
     setParsedJobInfo(info);
     if (info?.url) setJobUrl(info.url);
     if (info && jobDescription.trim() && currentResume && !autoTailorTriggered.current) {
       autoTailorTriggered.current = true;
       toast.info('Auto-tailoring your resume...', { duration: 2000 });
       setTimeout(() => handleTailor(), 500);
     }
   }, [jobDescription, currentResume, handleTailor, parsedJobInfo]);
   ```

**Verification**: Manually test with two different job URLs in the same sheet session. Confirm two separate tailor requests are made.

---

### Phase 5 — Dead Code Removal

**Goal**: Remove `tailorResume()` from `aiTailor.ts` if it has no active callers.

**Steps:**

1. Search the entire `src/` directory for `tailorResume(` (excluding `tailorResumeWithProgress`).
2. If no callers found: delete lines 203–222 of `aiTailor.ts` (the entire `tailorResume` function).
3. Also remove the legacy `TailorResult` type (lines 12–35) if it is only used by the deleted function.
4. If a caller is found: migrate it to `tailorResumeWithProgress` with a no-op progress callback, then delete the old function.

**Verification**: TypeScript compiler must produce no errors after removal. Run `tsc --noEmit`.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Credit check breaks existing legitimate users (e.g., `ai_credits` row missing) | Low | High | `checkUserCreditBalance` already handles missing rows: returns `{ hasCredits: true, remaining: 20 }` (default limit). No breakage. |
| ID-based merge breaks for resumes with duplicate IDs | Very low | Medium | IDs are UUIDs generated client-side; duplicates are practically impossible. If `find()` returns no match, original is preserved. |
| `increment_ai_usage` RPC fails silently on BYOK users | N/A | N/A | BYOK users bypass the increment entirely. Non-critical path uses fire-and-forget. |
| Auto-tailor double-fires if title/company match coincidentally | Negligible | Low | The comparison is `title !== prev.title || company !== prev.company`. Two different companies will always differ. |
| Removing `tailorResume()` breaks a hidden caller | Low | Medium | Grep will surface any caller. TypeScript compiler will also catch the removal. |

---

## Pre-Implementation Corrections to Spec

> These items were discovered during the planning audit and should be noted before implementation:

**User Story 3 (JWT Security)** — `requireAuth()` in `_shared/authMiddleware.ts` **already performs full JWT signature verification** using `jose.jwtVerify`. The misleading comment in `tailor-resume/index.ts` (line 27) led to this story being written as if the system was insecure. The actual fix is:
- Remove/correct the misleading comment in the edge function
- No new signature verification code is needed

The acceptance scenarios for User Story 3 remain valid as behavioral guarantees (a forged JWT IS rejected), but the work is a comment fix, not a security implementation.

---

## Open Questions

None — all ambiguities were resolved during the `/speckit.clarify` session. Implementation can begin.
