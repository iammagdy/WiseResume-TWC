# Tasks: Comprehensive Unit Test Suite

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)
**Total tasks**: 79 across 3 branches + 1 shared setup phase
**Naming convention**: All new files use domain suffix — `<Subject>-<DomainCode>.test.{ts,tsx}`
**Existing 28 tests**: untouched — new files written alongside, no deletions.

---

## Delivery Structure

```
Phase 1–2  (Setup + Foundation)  → committed on Task A branch
Phase 3–5  (US1–US3, D1–D3)     → Task A branch: 021-task-a-domains-1-3   [P1 — critical]
Phase 6    (US4, D4)             → Task B branch: 021-task-b-domains-4-6   [P1 — TestSprite gate]
Phase 7–8  (US5–US6, D5–D6)     → Task B branch (continued)
Phase 9–12 (US7–US10, D7–D10)   → Task C branch: 021-task-c-domains-7-10
Phase 13   (Polish)              → Task C branch (final)
```

---

## Phase 1: Setup — Extend Mock Infrastructure

**Purpose**: Add 6 new global mocks to `src/test/mocks/`. All existing mocks and test files are left untouched.

**⚠️ Do this first** — all domain work depends on the new mocks being registered in `setup.ts`.

- [ ] T001 [S][SETUP] Create `src/test/mocks/auth.ts` — `vi.mock("@/hooks/useAuth")` returning `{ isAuthenticated: false, isLoading: false, user: null, logout: vi.fn() }` defaults; each test overrides per-scenario with `vi.mocked(useAuth).mockReturnValue(...)`
- [ ] T002 [S][SETUP] Create `src/test/mocks/router.ts` — `vi.mock("react-router-dom", async () => ({ ...actual, useNavigate: vi.fn(() => vi.fn()), useLocation: vi.fn(() => ({ pathname: "/" })), useParams: vi.fn(() => ({})) }))` preserving real `MemoryRouter` and `Routes`
- [ ] T003 [S][SETUP] Create `src/test/mocks/aiAction.ts` — `vi.mock("@/hooks/useAIAction")` with default `{ execute: vi.fn().mockResolvedValue({ result: "mocked output", creditsUsed: 1 }), isLoading: false, error: null }`
- [ ] T004 [S][SETUP] Create `src/test/mocks/agenticChat.ts` — `vi.mock("@/lib/agenticChat")` with `{ sendChatMessage: vi.fn().mockResolvedValue({ type: "text", content: "mock response" }), sendFunctionFeedback: vi.fn().mockResolvedValue({}) }`
- [ ] T005 [S][SETUP] Create `src/test/mocks/zustandStores.ts` — mock `@/store/resumeStore`, `@/store/settingsStore`, `@/store/offlineSyncStore` at module level with minimal default shapes; confirm exact store import paths and field names by reading each store file first
- [ ] T006 [S][SETUP] Create `src/test/mocks/fetch.ts` — `vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: vi.fn().mockResolvedValue({}), text: vi.fn().mockResolvedValue("") }))` — intercepts direct fetch calls from `tailorResumeWithProgress` and `parseTextWithAI`
- [ ] T007 [S][SETUP] Update `src/test/setup.ts` — add imports for `./mocks/auth`, `./mocks/router`, `./mocks/aiAction`, `./mocks/agenticChat`, `./mocks/zustandStores`, `./mocks/fetch`; add `vi.stubGlobal("SpeechRecognition", vi.fn())` and `vi.stubGlobal("webkitSpeechRecognition", vi.fn())`

---

## Phase 2: Foundation — Verify Infrastructure

**Purpose**: Confirm all 6 new mocks resolve correctly before any domain tests are written.

**⚠️ CHECKPOINT**: `npm run test` must exit 0 (all existing 28 tests still pass) before Phase 3 begins.

- [ ] T008 [S][SETUP] Create `src/test/utils/AllProviders.tsx` — shared wrapper composing `MemoryRouter` (configurable `initialEntries`), `QueryClientProvider` (fresh `QueryClient`, `retry: false`), `ThemeProvider`, `TooltipProvider`; export as `renderWithProviders(ui, options?)` helper; Zustand stores are NOT wrapped here — they are mocked at module level
- [ ] T009 [S][SETUP] Write a temporary canary test in `src/test/mocks-canary.test.ts` — mounts a trivial component using `renderWithProviders`, calls `vi.mocked(useAuth)`, `vi.mocked(useAIAction)`, asserts all resolve without error; delete this file once confirmed passing
- [ ] T010 [S][SETUP] Run `npm run test` — confirm all existing 28 tests still pass with the new mocks in place; fix any mock import conflicts before proceeding

**Checkpoint**: All 28 existing tests pass + new mocks confirmed. Begin Task A branch.

---

## ── TASK A BRANCH: `021-task-a-domains-1-3` ──────────────────────────────

---

## Phase 3: US1 — AI Tools & Business Logic (D1, Priority: P1)

**Goal**: Every AI hook and lib function has isolated tests covering happy path, error, zero-credits, empty input, BYOK selection, retry logic, and correct return type shapes.

**Independent test**: `npx vitest run src/hooks/__tests__/*-D1* src/lib/__tests__/*-D1*` exits 0.

- [ ] T011 [P][US1] Create `src/hooks/__tests__/useAIAction-D1.test.ts` — happy path returns result + decrements credits; error path sets `error` state; empty string input returns validation error without calling provider
- [ ] T012 [P][US1] Create `src/hooks/__tests__/useAICredits-D1.test.ts` — deduction reduces count; 0 credits blocks action and returns `insufficient_credits`; credit refill updates state; mock Supabase chain `.from().select().eq().maybeSingle()` with daily usage data
- [ ] T013 [P][US1] Create `src/hooks/__tests__/useAIEnhance-D1.test.ts` — enhanced text returned in `{ status: 'success', enhanced }` shape; original input not mutated; provider error sets `status: 'error'`
- [ ] T014 [P][US1] Create `src/hooks/__tests__/useAIHealth-D1.test.ts` — healthy provider sets `isHealthy: true`; mocked 500 sets `isHealthy: false` with readable message; polling interval fires check function
- [ ] T015 [P][US1] Create `src/hooks/__tests__/useAIProviderInfo-D1.test.ts` — BYOK key present → BYOK provider name returned; no key → platform provider; provider label matches expected string
- [ ] T016 [P][US1] Create `src/hooks/__tests__/useAIKeyHydration-D1.test.ts` — key loaded from storage on mount; missing key returns `null` without throwing; key stored correctly on set
- [ ] T017 [P][US1] Create `src/lib/__tests__/aiTailor-D1.test.ts` — mock `global.fetch` to return success response; `tailorResumeWithProgress(resume, jobDesc, vi.fn(), 'moderate')` resolves with `SuperTailorResult`; assert `result.overallScore.before` and `result.overallScore.after` are numbers; assert `onProgress` callback called; retry test: first fetch rejects → `vi.advanceTimersByTimeAsync(2500)` → second fetch succeeds → `mockFetch` called twice; rate-limit test: 429 response → rejects with `{ code: "rate_limit" }`
- [ ] T018 [P][US1] Create `src/lib/__tests__/aiProvider-D1.test.ts` — `getAIProviderInfo()` with BYOK key mocked in `useSettingsStore` → `{ isCustomKey: true, tier: "paid" }`; no key → `{ isCustomKey: false, tier: "default" }`
- [ ] T019 [P][US1] Create `src/lib/__tests__/aiAnalysis-D1.test.ts` — `analyzeResume()` returns expected output shape with required fields; empty resume input handled gracefully without throwing
- [ ] T020 [P][US1] Create `src/lib/__tests__/atsParserSimulation-D1.test.ts` — `simulateATSParsing(resume, jobDescription)` is synchronous; returns `score` between 0–100; `result.missingKeywords` is an array; `result.sections` is an array; score increases when job keywords appear in resume text
- [ ] T021 [P][US1] Create `src/lib/__tests__/atsValidationChecks-D1.test.ts` — check passes when criteria met; check fails with reason when not; all check functions return `{ pass: boolean, reason: string }`
- [ ] T022 [P][US1] Create `src/lib/__tests__/aiCostEstimates-D1.test.ts` — cost calculation returns correct credit amount per tool type; unknown tool type returns default cost; zero-length input returns 0 cost

**Checkpoint US1**: `npx vitest run src/hooks/__tests__/*-D1* src/lib/__tests__/*-D1*` → all pass.

---

## Phase 4: US2 — Resume Editor Data Flows (D2, Priority: P1)

**Goal**: Editor load, dirty state, auto-save debounce (exactly once), undo/redo, template switch, and AI generation are all covered.

**Independent test**: `npx vitest run src/components/editor/__tests__/*-D2*` exits 0.

- [ ] T023 [S][US2] Read `src/pages/EditorPage.tsx` top-level hooks to confirm all Zustand stores consumed — verify `zustandStores.ts` mock shapes match actual store slice fields; fix any mismatches before writing editor tests
- [ ] T024 [S][US2] Create `src/components/editor/__tests__/EditorPage-D2.test.tsx` — mock Supabase `single()` returns resume fixture; after fetch resolves, all section fields (Contact, Summary, Experience, Education, Skills) populated in DOM; save button enabled after field change (dirty state)
- [ ] T025 [P][US2] Create `src/components/editor/__tests__/EditorAutoSave-D2.test.tsx` — `vi.useFakeTimers()`; fire two rapid field updates within 300ms; advance timers past debounce threshold; assert Supabase `upsert` called exactly once; on 503 error, toast shown and local state preserved
- [ ] T026 [P][US2] Create `src/components/editor/__tests__/EditorHistory-D2.test.tsx` — 3 field changes build 3-snapshot history; undo twice → form state at snapshot index 1; redo stack has 2 entries; undo at bottom of stack does nothing
- [ ] T027 [P][US2] Create `src/components/editor/__tests__/EditorTemplateSwitch-D2.test.tsx` — click template option → `template_id` updates in form state; preview container re-renders with new template class/attribute
- [ ] T028 [P][US2] Create `src/components/editor/__tests__/EditorSectionAI-D2.test.tsx` — override `useAIAction` mock to return summary text; click "Generate with AI"; assert summary field populated with mocked output and section marked AI-generated

**Checkpoint US2**: `npx vitest run src/components/editor/__tests__/*-D2*` → all pass.

---

## Phase 5: US3 — Authentication & Route Guards (D3, Priority: P1)

**Goal**: All 5 auth-state/route combinations tested. Auth mock target confirmed as `@/hooks/useAuth`.

**Independent test**: `npx vitest run src/components/auth/__tests__/*-D3* src/hooks/__tests__/*-D3*` exits 0.

- [ ] T029 [P][US3] Create `src/components/auth/__tests__/ProtectedRoute-D3.test.tsx` — (a) `isAuthenticated: false` → redirects to `/`; (b) `isAuthenticated: true` → children render; (c) `isLoading: true` → skeleton shown, no redirect fires
- [ ] T030 [P][US3] Create `src/components/auth/__tests__/AuthPage-D3.test.tsx` — authenticated user visiting `/auth` → `useNavigate` called with `/dashboard`; unauthenticated user → auth page renders normally
- [ ] T031 [P][US3] Create `src/components/auth/__tests__/OnboardingGuard-D3.test.tsx` — `onboarding_complete: false` → redirects to `/onboarding`; `onboarding_complete: true` → no redirect
- [ ] T032 [P][US3] Create `src/components/auth/__tests__/LoadingState-D3.test.tsx` — `isLoading: true` → skeleton element visible; `useNavigate` not called while loading
- [ ] T033 [P][US3] Create `src/hooks/__tests__/useAuth-D3.test.ts` — `logout()` clears session state and calls underlying logout function; `isAuthenticated` reflects mocked state correctly

**Checkpoint US3 / Task A complete**: `npm run test` → all existing + all D1–D3 tests pass. Open PR for `021-task-a-domains-1-3`.

---

## ── TASK B BRANCH: `021-task-b-domains-4-6` ──────────────────────────────

---

## Phase 6: US4 — Upload & Parsing Pipeline (D4, Priority: P1) 🚦 TestSprite Gate

**Goal**: Parsing functions tested with synthetic data. `parseResumeText` section mapping, `parseResumePDF` File-based flow, `PDFParseError` shape, and `pdfjs-dist` module mock all verified.

**Independent test**: `npx vitest run src/lib/pdf/__tests__/*-D4* src/lib/__tests__/*-D4*` exits 0.

**⚠️ Merging this phase unlocks TestSprite handoff.**

- [ ] T034 [S][US4] Confirm export status of `splitIntoBlocks` in `src/lib/pdf/sectionParsers.ts` — if not exported, all splitIntoBlocks tests run via `parseResumeText()` as proxy; confirm `PDFParseError` import path from `src/lib/pdf/textExtractor.ts`
- [ ] T035 [P][US4] Create `src/lib/pdf/__tests__/parseResumeText-D4.test.ts` — inline resume text strings: `WORK HISTORY` heading → experience entries present in result; `CONSULTING WORK` heading → content not silently dropped; Unicode characters in text → preserved intact in output; `extractDateRange("Jan 2020 - Dec 2022")` → `{ startDate: "Jan 2020", endDate: "Dec 2022", current: false }`
- [ ] T036 [P][US4] Create `src/lib/pdf/__tests__/splitIntoBlocks-D4.test.ts` — if exported: `IBM GLOBAL SERVICES` as company name → single block, no phantom second entry; empty lines array → empty result, no throw; if NOT exported: test via `parseResumeText()` with ALL-CAPS company in experience text
- [ ] T037 [P][US4] Create `src/lib/pdf/__tests__/pdfParseError-D4.test.ts` — `new PDFParseError("message", "CORRUPTED")` has `.message` string and `.code` from `'NO_TEXT' | 'PASSWORD_PROTECTED' | 'CORRUPTED' | 'UNKNOWN'`; `instanceof PDFParseError` is true; `.name` is `"PDFParseError"`
- [ ] T038 [S][US4] Create `src/lib/__tests__/parseResumePDF-D4.test.ts` — mock `pdfjs-dist` at module level with `vi.mock("pdfjs-dist", ...)` returning 1-page synthetic text content; mock `global.fetch` to return `{ data: mockResumeData }` for the AI parsing step; `parseResumePDF(new File([pdfBytes], "resume.pdf", { type: "application/pdf" }))` → `ParseResult.success: true` with `data` present; zero-byte file → `ParseResult.success: false` and `parseStatus: 'failed'`; timeout test: `vi.useFakeTimers()`, advance 120s → `parseTextWithAI` falls back to `parseResumeText()`
- [ ] T039 [P][US4] Create `src/lib/__tests__/uploadValidation-D4.test.ts` — zero-byte file rejected with user-readable error; unsupported MIME type rejected; valid PDF MIME type accepted; valid DOCX MIME type accepted

**⚠️ CHECKPOINT D4 / TestSprite Gate**: All US4 tests pass → D4 merged → bootstrap TestSprite (`testsprite_bootstrap`, port 3000, type: frontend, scope: codebase).

---

## Phase 7: US5 — User Journey Page Smoke Tests (D5, Priority: P2)

**Goal**: Every `src/pages/*.tsx` mounts without crashing. Key pages have interaction tests.

**Independent test**: `npx vitest run src/pages/__tests__/*-D5*` exits 0.

- [ ] T040 [S][US5] Create `src/pages/__tests__/DashboardPage-D5.test.tsx` — smoke + interaction: mock Supabase returns resume list; resume cards visible; "Create New Resume" button present
- [ ] T041 [P][US5] Create `src/pages/__tests__/OnboardingPage-D5.test.tsx` — smoke + interaction: render at step 1; fill career level; click "Next"; step 2 content visible
- [ ] T042 [P][US5] Create `src/pages/__tests__/UploadPage-D5.test.tsx` — smoke + interaction: `fireEvent.drop` on dropzone; progress indicator appears; file name shown
- [ ] T043 [P][US5] Create `src/pages/__tests__/AIStudioPage-D5.test.tsx` — smoke + interaction: ≥18 tool cards visible; navigation tool cards each have correct href/route
- [ ] T044 [P][US5] Create `src/pages/__tests__/ApplicationsPage-D5.test.tsx` — smoke + interaction: mock Supabase returns mixed-status jobs; cards grouped by Applied, Interviewing, Offered, Rejected
- [ ] T045 [P][US5] Create `src/pages/__tests__/ProfilePage-D5.test.tsx` — smoke + interaction: update display name field; click save; Supabase `update` called with new name
- [ ] T046 [P][US5] Create `src/pages/__tests__/CareerPage-D5.test.tsx` — smoke test only
- [ ] T047 [P][US5] Create `src/pages/__tests__/CoverLettersPage-D5.test.tsx` — smoke test only
- [ ] T048 [P][US5] Create `src/pages/__tests__/ResignationLettersPage-D5.test.tsx` — smoke test only
- [ ] T049 [P][US5] Create `src/pages/__tests__/TemplatesPage-D5.test.tsx` — smoke test only
- [ ] T050 [P][US5] Create `src/pages/__tests__/ResumeDetailPage-D5.test.tsx` — smoke test only
- [ ] T051 [P][US5] Create `src/pages/__tests__/AnalyticsPage-D5.test.tsx` — smoke test only
- [ ] T052 [P][US5] Create `src/pages/__tests__/NotificationsPage-D5.test.tsx` — smoke test only
- [ ] T053 [P][US5] Create `src/pages/__tests__/HelpPage-D5.test.tsx` — smoke test only
- [ ] T054 [P][US5] Create `src/pages/__tests__/remaining-pages-D5.test.tsx` — one smoke test per remaining page (AchievementsPage, SubscriptionPage, DevToolsPage, QrCodePage, SharePage, PreviewPage, ExamplesPage, GuidePage, GuidesPage, ReferralPage, ScreenshotsGalleryPage, etc.) — `renderWithProviders` + assert no throw

**Checkpoint US5**: `npx vitest run src/pages/__tests__/*-D5*` → all pass.

---

## Phase 8: US6 — AI Studio Tool-by-Tool Tests (D6, Priority: P2)

**Goal**: All sheet tools tested with correct mock targets. TailorSheet uses `mockFetch`; others use `useAIAction`. Every tool's zero-credits guard verified.

**Independent test**: `npx vitest run src/components/editor/__tests__/*-D6*` exits 0.

- [ ] T055 [S][US6] Read `src/components/editor/TailorSheet.tsx` to confirm props interface `{ open, onOpenChange, onApplied? }` and that it calls `tailorResumeWithProgress()` — not `useAIAction` — on submit button click
- [ ] T056 [S][US6] Create `src/components/editor/__tests__/TailorSheet-D6.test.tsx` — render `<TailorSheet open={true} onOpenChange={vi.fn()} />`; submit triggers `mockFetch` call to `/functions/v1/tailor-resume`; result renders `overallScore.before` / `overallScore.after`; `onProgress` callback called; 429 response shows rate-limit message; 0 credits → submit disabled; abort on sheet close
- [ ] T057 [P][US6] Create `src/components/editor/__tests__/JobAnalysisSheet-D6.test.tsx` — render `<JobAnalysisSheet open={true} onOpenChange={vi.fn()} />`; submit calls `useAIAction.execute`; match score and gap analysis rendered; 0 credits → submit disabled
- [ ] T058 [P][US6] Create `src/components/editor/__tests__/ATSScanSheet-D6.test.tsx` — submit resume + job description; score (0–100) renders in score ring; keyword gap list populated; 0 credits → submit disabled
- [ ] T059 [P][US6] Create `src/components/editor/__tests__/AgenticChatSheet-D6.test.tsx` — submit message; `sendChatMessage` from `agenticChat` mock called; response text rendered; 0 credits → send disabled
- [ ] T060 [P][US6] Create `src/components/editor/__tests__/CareerPathSheet-D6.test.tsx` — submit; results card shows career path recommendation; 0 credits → blocked
- [ ] T061 [P][US6] Create `src/components/editor/__tests__/ZeroCreditsGuard-D6.test.tsx` — parameterized: for each of the 11 sheet tools, override `useAICredits` to `{ credits: 0 }`; assert submit/generate button `disabled`; assert neither `useAIAction.execute` nor `mockFetch` called
- [ ] T062 [P][US6] Create `src/components/editor/__tests__/remaining-sheets-D6.test.tsx` — one `describe` per remaining sheet (RecruiterSimSheet, AIDetectorSheet, LinkedInOptimizerSheet, OnePageWizardSheet, AIEnhanceSheet, ResumeABCompareSheet, CompanyBriefingSheet): each has a happy-path render test and a 0-credits guard test

**Checkpoint US6 / Task B complete**: `npm run test` → all existing + all D1–D6 tests pass. Open PR for `021-task-b-domains-4-6`.

---

## ── TASK C BRANCH: `021-task-c-domains-7-10` ─────────────────────────────

---

## Phase 9: US7 — Interview & Voice Features (D7, Priority: P2)

**Goal**: Full interview flow tested headlessly. `sendChatMessage` mock covers grading. Web Speech API stubbed globally. ElevenLabs fallback verified.

**Independent test**: `npx vitest run src/pages/__tests__/*-D7*` exits 0.

- [x] T063 [S][US7] Create `src/pages/__tests__/InterviewPage-D7.test.tsx` — configure `vi.mocked(window.SpeechRecognition)` with mock recognition object; assert first question text visible; record button present and enabled; `navigator.mediaDevices = { getUserMedia: vi.fn().mockResolvedValue(null) }` in beforeAll
- [x] T064 [P][US7] Create `src/pages/__tests__/InterviewTranscript-D7.test.tsx` — fire mock `SpeechRecognition` `result` event with transcript `"I led a team of five engineers"`; simulate stop recording; assert transcript populates answer field; "Submit Answer" button enabled
- [x] T065 [P][US7] Create `src/pages/__tests__/InterviewGrading-D7.test.tsx` — mock `sendChatMessage` to return grading JSON after 5 answers; simulate 5 submissions; await resolution; results panel shows `strengths`, `weaknesses`, `communication_score` between 0–10
- [x] T066 [P][US7] Create `src/pages/__tests__/InterviewFallback-D7.test.tsx` — mock `useAIKeyHydration` to return `{ elevenLabsKey: null }`; mount; assert no ElevenLabs init call; Web Speech path activates; no uncaught exception
- [x] T067 [P][US7] Create `src/pages/__tests__/InterviewNoSpeechAPI-D7.test.tsx` — `vi.stubGlobal("SpeechRecognition", undefined)` + `vi.stubGlobal("webkitSpeechRecognition", undefined)`; mount; assert graceful degradation message rendered, no crash

**Checkpoint US7**: `npx vitest run src/pages/__tests__/*-D7*` → all pass.

---

## Phase 10: US8 — Portfolio & Public Profile (D8, Priority: P2)

**Goal**: Theme switching, username conflict, public data visibility, private-profile gate. New files written alongside existing portfolio tests.

**Independent test**: `npx vitest run src/pages/__tests__/*-D8*` exits 0.

- [x] T068 [P][US8] Create `src/pages/__tests__/PortfolioEditorPage-D8.test.tsx` — mock profile loads; click `theme-3` option; `theme_id` in form state updated; preview container reflects new theme
- [x] T069 [P][US8] Create `src/pages/__tests__/PortfolioUsernameConflict-D8.test.tsx` — mock Supabase returns conflict on username check; user types and submits claim; "Username already taken" error visible
- [x] T070 [P][US8] Create `src/pages/__tests__/PublicPortfolioPage-D8.test.tsx` — render at `/p/johndoe`; `is_public: true`; user name, headline, skills visible
- [x] T071 [P][US8] Create `src/pages/__tests__/PortfolioPrivate-D8.test.tsx` — `is_public: false`; user resume data NOT rendered; 404 or "private profile" message IS rendered

**Checkpoint US8**: `npx vitest run src/pages/__tests__/*-D8*` → all pass.

---

## Phase 11: US9 — Application Tracker (D9, Priority: P3)

**Goal**: Status transitions, overdue indicators (deterministic with mocked date), analytics calculations.

**Independent test**: `npx vitest run src/pages/__tests__/*-D9*` exits 0.

- [x] T072 [P][US9] Create `src/pages/__tests__/ApplicationsTracker-D9.test.tsx` — mock job in "Applied"; simulate status-change action to "Interviewing"; `mockSupabaseClient.update` called with `{ status: 'interviewing' }`
- [x] T073 [P][US9] Create `src/pages/__tests__/ApplicationsDeadline-D9.test.tsx` — `vi.setSystemTime(new Date("2026-04-01"))`; application deadline `"2026-03-15"`; assert "overdue" indicator present; restore time in `afterEach`
- [x] T074 [P][US9] Create `src/pages/__tests__/ApplicationsAnalytics-D9.test.tsx` — mock 10 applications (3 with response, 7 without); assert response rate shows 30%; mock streak data; streak number renders correctly

**Checkpoint US9**: `npx vitest run src/pages/__tests__/*-D9*` → all pass.

---

## Phase 12: US10 — Settings & BYOK (D10, Priority: P3)

**Goal**: Theme cycle tested. Data export triggers download. BYOK encryption is an intentional `it.todo` placeholder.

**Independent test**: `npx vitest run src/pages/__tests__/*-D10*` exits 0 (BYOK shows as `todo`, not failure).

- [x] T075 [P][US10] Create `src/pages/__tests__/SettingsBYOK-D10.test.tsx` — `it.todo("BYOK key is encrypted before storage — blocked on work item 021-byok-encryption")` with comment explaining it becomes a real test once encryption utility exists
- [x] T076 [P][US10] Create `src/pages/__tests__/SettingsTheme-D10.test.tsx` — cycle Light → Dark → System; `theme` context value matches each state; `<html>` class attribute updates accordingly
- [x] T077 [P][US10] Create `src/pages/__tests__/SettingsExport-D10.test.tsx` — mock `accountBackup.ts`; click "Export My Data"; assert `accountBackup` called; `URL.createObjectURL` called (download triggered)

**Checkpoint US10**: `npx vitest run src/pages/__tests__/*-D10*` → all pass (BYOK is `todo`).

---

## Phase 13: Polish & Verification

**Purpose**: Full suite health check, coverage report, network call audit.

- [x] T078 [S][POLISH] Run `npm run test` — assert full suite exits 0; record final passing test count (existing 28 + new ~51 = target ≥79 files); note any flaky tests and fix. **Status: 302 tests across 50 files passed.**
- [x] T079 [S][POLISH] Run `npm run test:coverage` — record coverage percentages for lines, branches, functions, statements; document as baseline comment; no CI gate — informational only. **Status: Lines: 18.47%, Branches: 50.57%, Functions: 22.97%, Statements: 18.47%**

**Final Checkpoint / Task C complete**: All Polish tasks pass. Open PR for `021-task-c-domains-7-10`.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)       → no dependencies — start immediately
Phase 2 (Foundation)  → depends on Phase 1 — BLOCKS all domain work
Phase 3–5 (Task A)    → depends on Phase 2 — D1, D2, D3 can run in parallel after foundation
Phase 6 (D4)          → depends on Task A merge — opens TestSprite gate
Phase 7–8 (Task B)    → depends on Phase 6 start — D5 and D6 can run in parallel
Phase 9–12 (Task C)   → depends on Task B merge — D7, D8, D9, D10 can run in parallel
Phase 13 (Polish)     → depends on all Task C domains complete
```

### Within Task A (Phases 3–5)

```
T001–T010 must complete first (sequential setup + foundation)
T011–T022 (US1) all parallel — separate files
T023 before T024–T028 (confirm EditorPage store shapes first)
T024–T028 (US2 after T023) can run in parallel
T029–T033 (US3) all parallel — auth mock already confirmed in Phase 1
```

### Within Task B (Phases 6–8)

```
T034 before T035–T039 (confirm splitIntoBlocks export + PDFParseError path)
T035–T039 parallel after T034
T040 starts US5 — T041–T054 all parallel after T040
T055 before T056 (confirm TailorSheet props/call pattern)
T056–T062 parallel after T055
```

### Within Task C (Phases 9–12)

```
T063–T067 (US7) all parallel — SpeechRecognition stubbed globally in setup.ts
T068–T071 (US8) all parallel
T072–T074 (US9) all parallel
T075–T077 (US10) all parallel
T078–T079 (Polish) sequential
```

### Parallel Opportunities Summary

| Phase | Parallel group |
|-------|---------------|
| Setup (Phase 1) | T001–T006 all in parallel |
| US1 (D1) | T011–T022 all in parallel |
| US2 (D2) | T024–T028 in parallel after T023 |
| US3 (D3) | T029–T033 all in parallel |
| US4 (D4) | T035–T039 in parallel after T034 |
| US5 (D5) | T041–T054 all in parallel |
| US6 (D6) | T056–T062 in parallel after T055 |
| US7 (D7) | T063–T067 all in parallel |
| US8 (D8) | T068–T071 all in parallel |
| US9 (D9) | T072–T074 all in parallel |
| US10 (D10) | T075–T077 all in parallel |

---

## Task Count by Phase

| Phase | Tasks | Branch |
|-------|-------|--------|
| Phase 1: Setup | T001–T007 (7) | Task A |
| Phase 2: Foundation | T008–T010 (3) | Task A |
| Phase 3: US1 – AI Logic | T011–T022 (12) | Task A |
| Phase 4: US2 – Editor | T023–T028 (6) | Task A |
| Phase 5: US3 – Auth | T029–T033 (5) | Task A |
| Phase 6: US4 – Parsing 🚦 | T034–T039 (6) | Task B |
| Phase 7: US5 – Pages | T040–T054 (15) | Task B |
| Phase 8: US6 – AI Studio | T055–T062 (8) | Task B |
| Phase 9: US7 – Interview | T063–T067 (5) | Task C |
| Phase 10: US8 – Portfolio | T068–T071 (4) | Task C |
| Phase 11: US9 – Tracker | T072–T074 (3) | Task C |
| Phase 12: US10 – Settings | T075–T077 (3) | Task C |
| Phase 13: Polish | T078–T079 (2) | Task C |
| **Total** | **79 tasks** | **3 PRs** |
