# Tasks: Tailor Resume – Audit & Correctness Fixes

**Input**: `specs/016-tailor-resume-audit/spec.md` + `specs/016-tailor-resume-audit/plan.md`
**Branch**: `016-tailor-resume-audit`
**Total tasks**: 20

**Organization**: Tasks follow the plan's 5 phases. Phases 1–2 are server-side (edge function); Phases 3–5 are client-side (TailorSheet + aiTailor). All work touches existing files — no new files created.

---

## Phase 1: Edge Function — Credit Gate (US2, P1 server-side)

**Purpose**: Add the missing credit check and usage increment to `tailor-resume/index.ts`. This is the highest-priority fix and is fully independent of all client-side changes.

**Goal**: A zero-credit, no-BYOK user must receive HTTP `402` before any AI tokens are spent. A successful tailor must decrement `daily_usage` by 1 for non-BYOK users.

**Independent Test**: POST to `/functions/v1/tailor-resume` with a zero-credit test user → expect `402`. POST with a credited user → expect `200` and `ai_credits.daily_usage` incremented by 1. POST with a BYOK user → expect `200` with no credit change.

- [x] T001 [US2] In `supabase/functions/tailor-resume/index.ts`: import `checkUserCreditBalance` from `../_shared/creditUtils.ts` and call it after `requireAuth` succeeds, returning HTTP `402 { error: '...' }` if `!result.hasCredits`
- [x] T002 [US2] In `supabase/functions/tailor-resume/index.ts`: after `tailoredResult` is parsed successfully, fire-and-forget `svcClient.rpc('increment_ai_usage', { p_user_id: userId })` — skip this call when `result.remaining === 9999` (BYOK signal from `checkUserCreditBalance`)

**Checkpoint ✅**: `402` returned for zero-credit user before AI is called. `daily_usage` increments by 1 for credited non-BYOK user. BYOK user unaffected.

---

## Phase 2: Edge Function — Comment & Log Cleanup (US3 comment fix + housekeeping)

**Purpose**: Remove the misleading JWT comment and the duplicate log line. These are no-risk cosmetic fixes that make the code truthful.

**Goal**: Edge function source reflects what `requireAuth()` actually does (full JWT signature verification). No duplicate logs.

- [x] T003 [P][US3] In `supabase/functions/tailor-resume/index.ts` line 27: replace comment `// Authentication via shared middleware (decodes JWT without signature check)` with `// requireAuth() verifies JWT signature via jose.jwtVerify — see _shared/authMiddleware.ts`
- [x] T004 [P][US3] In `supabase/functions/tailor-resume/index.ts` lines 34–35: remove the duplicate `console.log('Authenticated user:', userId)` line, keeping exactly one

**Checkpoint ✅**: Edge function has one accurate JWT comment and exactly one `console.log('Authenticated user:', userId)` line. `grep -c "Authenticated user" supabase/functions/tailor-resume/index.ts` returns `1`.

---

## Phase 3: Client — ID-Based Merge (US1, P1 client-side)

**Purpose**: Fix `handleApplyChanges` in `TailorSheet.tsx` to merge experience and education by `id` instead of array index.

**Goal**: Tailored content lands on the correct resume entry regardless of the order the AI returns items. Entries the AI omitted are preserved from the original. Entries with unknown IDs are discarded.

**Independent Test**: Manually test with a resume where experience entries are returned in reversed order by the AI. Verify the saved resume has entries in original order with correct AI content on each (check DB or via toast-triggered preview).

- [x] T005 [US1] In `src/components/editor/TailorSheet.tsx` `handleApplyChanges`: replace the index-based experience merge (`tailorResult.experience.map((exp, index) => ({ ...currentResume.experience[index], ...exp }))`) with an ID-lookup merge that iterates `currentResume.experience` as source of truth, finds each entry's tailored version by `exp.id`, and falls back to the original if not found
- [x] T006 [US1] In `src/components/editor/TailorSheet.tsx` `handleApplyChanges`: apply the identical ID-lookup merge pattern to the education section (same logic as T005, same file, adjacent block)

**Checkpoint ✅**: A resume with `experience: [A, B, C]` where the AI returns `[B, A, C]` produces a merged resume where entry A has A's AI content, B has B's AI content, C has C's AI content — verified by checking `id` fields in the Supabase insert payload.

---

## Phase 4: Client — Apply Guards + Score Fix (US5, US6, P2 client-side)

**Purpose**: Guard `handleApplyChanges` against a null `currentResumeId` with a specific, recoverable error. Fix `job_match_score` to store `null` instead of `0` when the AI omits the score.

**Goal**: No orphaned resume records. Correct score semantics in the DB.

**Independent Test (US6)**: Set `currentResumeId` to null in dev → click Apply → no Supabase insert, toast reads exactly "Please select a resume before applying changes.", sheet stays open.
**Independent Test (score)**: Mock `tailorResult.overallScore = null` → apply → `job_match_score` column in DB is `NULL` not `0`.

- [x] T007 [US6] In `src/components/editor/TailorSheet.tsx` `handleApplyChanges`: add early-return guard at top of function (before `setIsApplying(true)`) — if `!currentResumeId`, call `toast.error('Please select a resume before applying changes.')` and `return`
- [x] T008 [US5] In `src/components/editor/TailorSheet.tsx` `handleApplyChanges`: change `job_match_score: tailorResult.overallScore?.after ?? 0` to `job_match_score: tailorResult.overallScore?.after ?? null`

**Checkpoint ✅**: `currentResumeId = null` at apply time produces no DB insert and the exact toast message. `overallScore = null` stores `NULL` in the DB.

---

## Phase 5: Client — Auto-Tailor Re-trigger Fix (US4, P2 client-side)

**Purpose**: Reset `autoTailorTriggered.current` when a successfully parsed URL produces a `parsedJobInfo` that differs from the previous one, allowing auto-tailor to fire again for the new job.

**Goal**: Second distinct job URL in the same sheet session triggers auto-tailor. Same URL twice does not re-trigger. Manual text edits alone do not re-trigger.

**Independent Test**: Open sheet → paste URL A (auto-tailor fires, `autoTailorTriggered.current = true`) → clear field → paste URL B (different company/title) → auto-tailor fires again.

- [x] T009 [US4] In `src/components/editor/TailorSheet.tsx` `handleParsedJobInfo` callback: at the top of the callback, before `setParsedJobInfo(info)`, add a check — if `info` is non-null AND (`info.title !== parsedJobInfo?.title || info.company !== parsedJobInfo?.company`), set `autoTailorTriggered.current = false` — then the existing auto-tailor trigger logic fires correctly for the new job
- [x] T010 [US4] In `src/components/editor/TailorSheet.tsx`: add `parsedJobInfo` to the `useCallback` dependency array of `handleParsedJobInfo` (it is now read inside the callback and must be a dependency to avoid stale closure)

**Checkpoint ✅**: Two sequential different URLs produce two auto-tailor invocations. Same URL twice produces one. Raw text edit with no URL parse produces zero auto-tailor invocations.

---

## Phase 6: Dead Code Removal (US7, P3)

**Purpose**: Remove the legacy `tailorResume()` function and its associated `TailorResult` type from `aiTailor.ts` if no active callers exist.

**Goal**: Zero references to `tailorResume(` (excluding `tailorResumeWithProgress`) in `src/`.

**Independent Test**: After removal, `grep -r "tailorResume(" src/ | grep -v "tailorResumeWithProgress"` returns no results. `tsc --noEmit` passes with zero errors.

- [x] T011 [US7] Search `src/` for all callers of `tailorResume(` (excluding `tailorResumeWithProgress`) — document findings. If callers exist, migrate them to `tailorResumeWithProgress` with a no-op progress callback before proceeding
- [x] T012 [US7] In `src/lib/aiTailor.ts`: delete the `tailorResume` function (lines ~203–222) — `TailorResult` type kept as it is used by `CompareSheet.tsx`
- [x] T013 [US7] Run `tsc --noEmit` from the repo root to confirm zero TypeScript errors after removal

**Checkpoint ✅**: TypeScript compiler reports no errors. `grep` for `tailorResume(` (excluding the progress variant) returns zero results in `src/`.

---

## Phase 7: Polish & Verification

**Purpose**: Final cross-cutting checks across all fixes.

- [ ] T014 [P] Manually smoke-test the full tailor flow end-to-end: paste job description → tailor → review results tabs → apply → verify new resume appears on dashboard with correct `target_job_title`, `parent_resume_id`, and `job_match_score`
- [ ] T015 [P] Verify BYOK user flow: tailor with BYOK set in AI Settings → apply → confirm `ai_credits.daily_usage` did NOT increment
- [ ] T016 [P] Verify zero-credit user flow: set test user to `daily_usage = daily_limit` → attempt tailor → confirm `402` error card appears with "Use Your Own Key" CTA
- [ ] T017 [P] Verify forged JWT rejection: send POST to `/functions/v1/tailor-resume` with a tampered token → confirm HTTP `401`
- [ ] T018 [P] Confirm tailor history, cache restore, multi-job compare, and cover letter generation still work after `TailorSheet.tsx` changes (regression check)
- [ ] T019 [P] Review `supabase/functions/tailor-resume/index.ts` final state: exactly one JWT comment, one authenticated user log, credit check present, increment present — submit for code review
- [x] T020 [P] Update spec status from `Draft` to `Implemented` in `specs/016-tailor-resume-audit/spec.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1** (credit gate): No dependencies — start immediately. Server-side only.
- **Phase 2** (comment/log cleanup): No dependencies — can run in parallel with Phase 1 (same file, non-conflicting lines).
- **Phase 3** (ID-based merge): No dependencies on Phases 1–2 — client-side only. Can start in parallel.
- **Phase 4** (null guard + score fix): No dependencies on other client phases — adjacent lines in same function. Can run in parallel with Phase 3.
- **Phase 5** (auto-tailor re-trigger): No dependencies on Phases 3–4. Can run in parallel with Phases 3–4.
- **Phase 6** (dead code removal): Must complete T011 (grep search) before T012 (deletion). Otherwise independent.
- **Phase 7** (polish): Depends on Phases 1–6 being complete.

### Within-Phase Dependencies

- T001 → T002 (credit check must exist before increment is meaningful)
- T003, T004: fully parallel (different lines, same file)
- T005, T006: sequential (adjacent blocks in same function — avoid conflicts)
- T007, T008: fully parallel (different lines in same function)
- T009, T010: sequential (T010 depends on T009's change to identify the new dependency)
- T011 → T012 → T013: strictly sequential

### Parallel Opportunities

| Can run together | Why |
|-----------------|-----|
| Phase 1 + Phase 2 | Same file, non-overlapping line ranges |
| Phase 3 + Phase 4 + Phase 5 | Different callbacks/lines in `TailorSheet.tsx` |
| Phase 6 | Separate file (`aiTailor.ts`), independent of all client phases |
| All Phase 7 tasks | Verification only, no writes |

### Recommended Solo-Developer Sequence

```
T001 → T002    (edge function credit gate — deploy + verify)
T003, T004     (cosmetic cleanup — deploy)
T005 → T006    (ID merge — test with reversed-order mock)
T007, T008     (null guard + score fix — test both)
T009 → T010    (auto-tailor re-trigger — manual test)
T011 → T012 → T013  (dead code removal — tsc verify)
T014–T020      (smoke tests + spec status update)
```
