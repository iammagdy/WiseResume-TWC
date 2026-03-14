# Tasks: api/bugfixes-ux

## Phase 1: Setup & Foundational
- [ ] T001 Sync `api/bugfixes-ux` working branch with latest `main` commit (if necessary).
- [ ] T002 Execute development server (`npm run dev`) and ensure the environment loads without crashing.

## Phase 2: Bug Fixes & API Stability

### User Story 1: Authentication Resilience (Backend/DB)
*Goal: Ensure token-exchange functions correctly utilizing user-provided secrets, preventing 401/500 errors via Supabase RLS.*
- [ ] T003 [US1] [INSPECT] Read `supabase/functions/token-exchange/index.ts` to confirm it mints UUID-compliant Supabase JWTs correctly. (Read-only, no changes.)
- [ ] T004 [US1] [INSPECT] Review `src/hooks/useAuth.tsx` to confirm the payload dispatch correctly triggers the token-exchange edge function post-Kinde login. (Read-only, no changes.)
- [ ] T005 [US1] [TEST] Perform a real Kinde login and verify protected Supabase tables (e.g., resumes) return `200 OK`. Requires valid Kinde credentials.

### User Story 2: Active Resume Recognition
*Goal: Prevent "Create a resume first" bug by anchoring active resume state implicitly on creation.*
- [ ] T006 [US2] Modify `src/hooks/useResumes.ts` (or `src/store/resumeStore.ts`) to immediately update the local active resume context upon a successful `createResume` or `duplicateResume` DB insertion.
- [ ] T007 [US2] Verify navigating to AI Studio or the Editor immediately after creation bypasses the "Create a resume first" interstitial.

### User Story 3: Connection Banner Precision
*Goal: Separate generic offline states from hard API Auth rejections.*
- [ ] T008 [US3] Modify `src/lib/supabaseBridge.ts` catchment to differentiate `AUTH_REJECTION` vs `OFFLINE_NETWORK` error shapes. Create or extend the `BridgeErrorType` enum with these two values. **Implementation note**: add a `console.log` indicating which error path was taken (offline vs auth rejection) to aid debugging in dev tools.
- [ ] T009 [US3] Update `src/components/layout/AppShell.tsx` to explicitly only show "We couldn't connect your data" for `AUTH_REJECTION` (500/401 API failures), leaving network drops isolated.

### User Story 4: Deep Analyze Clarity
*Goal: Remove silent 'dead' button states on the AI Job Match tool.*
- [ ] T010 [US4] Modify `src/components/editor/JobAnalysisSheet.tsx` to detach `!jobDescription` from native HTML `disabled` props on the primary analyze button.
- [ ] T011 [US4] Implement a click interceptor in `JobAnalysisSheet.tsx` that fires a `toast("Add Job Description")` when the textarea is empty. **Implementation note**: guard against multiple rapid taps (e.g., with a debounce or a `isToastShown` ref flag) so the toast only fires once per click sequence.

### User Story 5: PDF Export Integrity
*Goal: Ensure downloaded resumes are never corrupted and have correct .pdf extensions.*
- [ ] T012 [US5] Inspect `src/lib/pdfGenerator.ts` and `src/pages/PreviewPage.tsx` to trace the full blob generation and file anchoring pipeline. Document the exact root cause before proceeding to T013.
- [ ] T013 [US5] *(Depends on T012 investigation completing first.)* Apply the fix identified in T012: enforce correct `type: "application/pdf"` Blob MIME type, and bind `download="WiseResume.pdf"` (or a job-title-based variant) on the anchor element.

## Phase 3: UX Polish & Theming

### User Story 6: UI Readability and Layout
*Goal: Improve Settings/Sheet legibility against dynamic backgrounds and fix mobile overlapping action buttons.*
- [ ] T014 [US6] Modify `src/pages/SettingsPage.tsx` and related global dialog primitives (e.g., `tailwind.config.ts` or CSS globals) to inject safe, performant `backdrop-blur-md bg-background/80` overlays on floating sheets.
- [ ] T015 [US6] Refactor the absolute/fixed positioning of the "Ask" FAB vs the bottom-nav "Settings" button in `AppShell.tsx` (or equivalent layout wrapper) to prevent overlap on 375px viewport widths.

## Final Phase: Polish & Governance
- [ ] T016 Execute `npm run build` or `npm run test` to verify no syntactic regressions.
- [ ] T017 Update `project-governance/CHANGELOG.md` grouping all code modifications accurately under individual fix scopes (Auth, UI, Editor, etc.)
- [ ] T018 Confirm Manual Verification steps per `specs/api/bugfixes-ux/quickstart.md` are passed.
