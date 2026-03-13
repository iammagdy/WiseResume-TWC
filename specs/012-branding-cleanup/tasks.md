# Tasks: 012-branding-cleanup

**Feature**: Branding Cleanup and Foreign App Removal
**Source**: [plan.md](file:///m:/Repo/wiseresume-74945019/specs/012-branding-cleanup/plan.md)

## MVP Strategy
- **Phase 3 & 4** are the primary goals.
- Defer all functional infrastructure renames as documented in `Urgent by MEGZ.md`.

## Phase 1: Setup
- [ ] T001 Verify all spec artifacts (spec, plan, research) are synced in `specs/012-branding-cleanup/`

## Phase 2: Foundational
- [ ] T002 Establish baseline for branding violations using `git grep -iE 'lovable|bolt|wiseuniverse' src/`

## Phase 3: [US1] Professional Branding (UI & State)
**Goal**: Remove legacy names from user-facing components and state mapping.
**Test**: `npm run test` passes; Visual check of AI Settings health.

- [ ] T003 [P] [US1] Alias legacy provider keys to "WiseResume AI" in `src/store/aiHealthStore.ts`
- [ ] T004 [P] [US1] Update display labels for built-in AI providers in `src/components/settings/AISettingsSheet.tsx`
- [ ] T005 [P] [US1] Update allowed CORS origins to include `resume.thewise.cloud` in `supabase/functions/_shared/cors.ts`

## Phase 4: [US2] Sample Data Update
**Goal**: Update default resume templates to reflect the new brand personae.
**Test**: Load Portfolio Editor and confirm "Wise Portfolio" name and generic contact email.

- [ ] T006 [P] [US2] Update default resume name and generic contact email in `src/lib/templateData.ts`

## Final Phase: Polish & Delivery
- [ ] T007 Perform final branding scan and ensure zero prohibited hits in `src/`
- [ ] T008 [P] Update `Urgent by MEGZ.md` with any new technical debt discovered during implementation
- [ ] T009 Commit all changes to `fix/analysis-gaps` and prepare for push

## Dependencies
1. US1 and US2 are independent and can be executed in parallel.
2. T001-T002 must complete before any implementation.
