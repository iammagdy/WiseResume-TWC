# Tasks: Non-Authentication Audit Fixes

**Input**: Design documents from `/specs/015-non-auth-audit-fixes/`
**Prerequisites**: plan.md, spec.md

## Phase 1: Setup

**Purpose**: Project initialization and basic structure
*No setup tasks needed — we are modifying existing project files.*

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core database schemas and security constraints that must be complete before other stories.

> **Note**: T001–T003 should be combined into a single migration SQL file.

- [x] T001 [P] Create DB migration for `messages` NOT NULL constraints (`full_name`, `subject`, `status`) in `supabase/migrations/`
- [x] T002 [P] Create DB migration for composite index on `ai_usage_logs(user_id, action_type, created_at)`, `portfolio_visits` index, and `profiles(username)` index in `supabase/migrations/`
- [x] T003 Create DB migration to secure `messages` RLS policies using authenticated role/claims instead of hardcoded email in `supabase/migrations/`
- [x] T004 [P] Document soft vs. hard delete cascade policy in `project-governance/DECISIONS.md` (covers FR-006)

**Checkpoint**: Foundation ready — DB schema, indexes, and security constraints are in place.

---

## Phase 3: User Story 1 - Resolve Critical Logic & Data Bugs (Priority: P1)

**Goal**: Fix null pointer crashes, atomic race conditions, and soft-delete leaks in backend Edge Functions.

**Independent Test**: `ask-portfolio` handles nulls gracefully; `track-portfolio-view` increments click count atomically; `get_public_portfolio` excludes soft-deleted users.

### Implementation for User Story 1

- [x] T005 [P] [US1] Update `get_public_portfolio` RPC to filter `is_deleted = false` in `supabase/migrations/` (new DB migration or update existing RPC)
- [x] T006 [P] [US1] Add robust null pointer checks on `profile` and `resume` fields in `supabase/functions/ask-portfolio/index.ts`
- [x] T007 [P] [US1] Implement atomic SQL increment for `click_count` directly in the Edge Function (not via RPC) in `supabase/functions/track-portfolio-view/index.ts`
- [x] T008 [P] [US1] Add null-guard for `profileRow` before inserting notifications in `supabase/functions/track-portfolio-view/index.ts` (separate concern from T007)
- [x] T009 [P] [US1] Refactor chat rate-limiting in `supabase/functions/ask-portfolio/index.ts` to use actual AI gateway usage count (from `ai_usage_logs`) instead of `portfolio_visits` proxy (covers FR-009)

**Checkpoint**: Core critical backend data flow and Edge Function issues are resolved.

---

## Phase 4: User Story 2 - Improve AI Gateway Rate Limiting (Priority: P2)

**Goal**: Apply explicit rate limiting to `ai-health` and `ai-test` endpoints.

**Independent Test**: High volume requests to `ai-health` and `ai-test` are intercepted; `ai_usage_logs` queries use the composite index rather than a full-table scan.

### Implementation for User Story 2

- [x] T010 [P] [US2] Verify and align fail strategy between `supabase/functions/_shared/rateLimiter.ts` (currently fails open) and `supabase/functions/_shared/creditUtils.ts` (currently fails closed) — document chosen strategy
- [x] T011 [US2] Integrate request-scoped rate limiter from `_shared/rateLimiter.ts` into `supabase/functions/ai-health/index.ts` (depends on T010)
- [x] T012 [US2] Integrate request-scoped rate limiter from `_shared/rateLimiter.ts` into `supabase/functions/ai-test/index.ts` (depends on T010)

**Checkpoint**: AI Gateway rate limiting and database security are properly bounded.

---

## Phase 5: User Story 3 - Stabilize React State and Frontend Resource Management (Priority: P3)

**Goal**: Resolve stale closures, memory leaks, and overlapping timer issues in frontend hooks.

**Independent Test**: Toast messages do not duplicate on rapid network reconnect; fast resume edits don't trigger cascading `analyzeRole` re-renders.

### Implementation for User Story 3

- [x] T013 [P] [US3] Fix stale closure in `analyzeRole` by storing `resumeData` in a `useRef` inside `src/hooks/useVoiceInterview.ts` (covers FR-011)
- [x] T014 [P] [US3] Fix stale `userId` closure in `updateProfile` mutation `onSuccess` handler inside `src/hooks/useProfile.ts`
- [x] T015 [P] [US3] Add timer tracking (`timerIdRef`) and cancel on unmount/re-trigger in `handleOnline` inside `src/hooks/useNetworkStatus.ts`
- [x] T016 [P] [US3] Fix Zustand/React Query conflict in `src/hooks/useResumes.ts` — remove direct `useResumeStore.getState().setCurrentResumeId()` calls from mutation `onSuccess` where React Query cache is authoritative (covers FR-012)
- [x] T017 [P] [US3] Audit and fix unmount timer cleanup in `src/hooks/useEditorAutosave.ts` (covers FR-013)
- [x] T018 [P] [US3] Audit and fix unmount timer cleanup in `src/hooks/useWebSpeechFallback.ts` (covers FR-013 — missing from original tasks)

**Checkpoint**: React component lifecycles and cache synchronization are stabilized.

---

## Phase 6: User Story 4 - Fix Business Logic & UX Gaps (Priority: P3)

**Goal**: Enforce Quick Practice boundaries, surface session save failures, and harden AI grading output.

**Independent Test**: Quick practice ends at exactly 5 answers; session save failures display a toast; structured JSON grading output is enforced unconditionally.

### Implementation for User Story 4

- [x] T019 [P] [US4] Enforce 5-question limit for Quick Practice mode by tracking `answerCountRef` in `src/hooks/useVoiceInterview.ts` (covers FR-014)
- [x] T020 [P] [US4] Audit and fix unmount timer cleanup in `src/components/interview/InterviewSetup.tsx` (covers FR-013)
- [x] T021 [P] [US4] Verify `saveSession.mutate()` has an `.catch()` / `onError` toast handler in `src/pages/InterviewPage.tsx`; add if missing (covers FR-015)
- [x] T022 [P] [US4] Enforce structured JSON output for AI grading prompts in the relevant Edge Function system prompt (covers FR-016 — unconditionally required)
- [x] T023 [P] [US4] Surface inline username-taken error (Postgres error 23505) on the username field in `src/pages/PortfolioEditorPage.tsx` (covers US4 acceptance scenario 3)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: DB Migrations MUST complete first — blocks US1/US2 DB-layer work.
- **User Stories (Phase 3–6)**: Can proceed concurrently once DB migrations are done. Edge Function work (US1/US2) is fully parallelizable against Frontend Hook work (US3/US4).

### User Story Dependencies

- **User Story 1 (P1)**: Ready for parallel execution after Phase 2.
- **User Story 2 (P2)**: T011/T012 depend on T010 (fail-strategy alignment). Otherwise independent.
- **User Story 3 (P3)**: All tasks are fully independent — different files.
- **User Story 4 (P3)**: All tasks are fully independent — different files.

### Parallel Opportunities

- T001–T003 should be a single migration file; can be drafted in parallel, applied atomically.
- US3 React Hook fixes (T013–T018) can all be worked concurrently across separate files.
- US4 tasks (T019–T023) can all be worked concurrently across separate files.
