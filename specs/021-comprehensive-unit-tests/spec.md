# Feature Specification: Comprehensive Unit Test Suite

**Feature Branch**: `021-comprehensive-unit-tests`
**Created**: 2026-03-22
**Status**: Draft
**Scope**: Full unit-test coverage of the entire WiseResume application — UI/UX, user journeys, AI tools, business logic, hooks, and data utilities — prior to TestSprite end-to-end testing.

---

## Clarification Decisions (2026-03-22)

The following decisions were locked in before planning:

| # | Question | Decision |
|---|----------|----------|
| 1 | Implementation approach | **3 separate branches/PRs**: Task A (D1–D3), Task B (D4–D6), Task C (D7–D10) |
| 2 | Existing test files | **Full rewrite from scratch** — delete all existing test files, replace with new |
| 3 | Coverage gate | **Soft goal** — track coverage as a metric, no CI failure (no manual test running) |
| 4 | AI mock level | **`useAIAction` hook level** — simplest, isolates UI from transport layer |
| 5 | Fixture files | **Synthetic buffers only** — generated programmatically in tests, no fixture files |
| 6 | Voice/Interview tests | **Fully included** — mock Web Speech + ElevenLabs APIs, test all state |
| 7 | BYOK encryption | **Failing placeholder test** + separate work item tracked in spec |
| 8 | TestSprite handoff | **P1 domains (D1–D4) complete first** — Task A + half of Task B |

---

## Context & Strategy

Specs 009 and 010 established the test infrastructure and attempted partial coverage. This spec **replaces all existing test files** with a systematic, domain-by-domain suite written from scratch. All prior test files are considered deprecated upon start of Task A.

The strategy is **smart over exhaustive**: prioritize by production risk, keep each domain self-contained, and deliver in three mergeable PR batches.

### Testing Domains & Task Assignment

| Domain | Task | Branch | Priority | Risk |
|--------|------|--------|----------|------|
| D1 — AI Tools & Business Logic | **Task A** | `021-task-a-domains-1-3` | P1 | Critical |
| D2 — Resume Editor Data Flows | **Task A** | `021-task-a-domains-1-3` | P1 | Critical |
| D3 — Auth & Route Guards | **Task A** | `021-task-a-domains-1-3` | P1 | Critical |
| D4 — Upload & Parsing Pipeline | **Task B** | `021-task-b-domains-4-6` | P1 | High |
| D5 — User Journey Pages | **Task B** | `021-task-b-domains-4-6` | P2 | High |
| D6 — AI Studio Tools (UI) | **Task B** | `021-task-b-domains-4-6` | P2 | High |
| D7 — Interview & Voice Features | **Task C** | `021-task-c-domains-7-10` | P2 | Medium |
| D8 — Portfolio & Public Profile | **Task C** | `021-task-c-domains-7-10` | P2 | Medium |
| D9 — Application Tracker | **Task C** | `021-task-c-domains-7-10` | P3 | Medium |
| D10 — Settings & Preferences | **Task C** | `021-task-c-domains-7-10` | P3 | Medium |

**TestSprite handoff gate**: Task A merged + Task B's D4 merged (all P1 domains complete).

---

## Shared Implementation Rules

These rules apply to every test file across all three tasks:

- **All existing test files are deleted** at the start of Task A. Start clean.
- **No fixture files** — all test data (PDF buffers, DOCX buffers, resume text) is generated inline using synthetic `Buffer.from()` or template strings.
- **All AI responses are mocked at the `useAIAction` hook level** — no HTTP-level mocking, no provider-function-level mocking.
- **All Supabase calls are mocked** via the existing `src/test/mocks/` global setup — no local re-mocking.
- **All Web Speech API and ElevenLabs calls are mocked** via `vi.stubGlobal()` in test setup — tests run headlessly in jsdom.
- **Coverage is tracked but does not gate CI** — run `npm run test:coverage` for reporting only; build does not fail on threshold miss.
- **No real network calls** — all `fetch` escapes are a test bug, not a known tradeoff.

---

## User Scenarios & Testing

---

### User Story 1 — AI Tools & Business Logic Unit Tests (Priority: P1) [Task A]

As an engineering team, we want every AI utility function, credit management hook, and provider selection logic to have isolated unit tests so that regressions in AI behavior are caught before they silently corrupt user-facing output.

**Why this priority**: AI functions are the core value of WiseResume. A broken `aiTailor.ts` or `useAICredits.ts` means users lose credits without results, receive wrong output, or get no error feedback.

**Independent Test**: Run vitest filtered to `src/lib/ai/**` and `src/hooks/useAI*` — covers credit deduction, provider selection, enhancement output shape, and ATS scoring independently of any UI.

**Acceptance Scenarios**:

1. **Given** `useAICredits` is mounted with a user who has 0 credits, **When** an AI action is triggered, **Then** the hook returns an `insufficient_credits` error and does NOT invoke the underlying provider.
2. **Given** `useAIAction` is called with a valid prompt and a mocked hook response, **When** the action resolves, **Then** credits are decremented by the correct amount and the result matches the expected output shape.
3. **Given** `aiTailor.ts` receives a resume object and a job description string, **When** `tailorResume()` is called with a mocked `useAIAction` response, **Then** it returns a `TailoredResult` with `score_before`, `score_after`, and `suggested_changes` fields present.
4. **Given** `useAIEnhance` is called on a bullet point string, **When** the hook resolves with enhanced text, **Then** state is `{ status: 'success', enhanced: '<text>' }` and the original input is not mutated.
5. **Given** `useAIHealth` is polled and the mocked provider returns a 500 error, **When** the health check resolves, **Then** the hook sets `isHealthy: false` and exposes a user-readable error message.
6. **Given** `atsParserSimulation.ts` receives a resume text string and a job description, **When** `simulateATS()` is invoked, **Then** it returns a score between 0–100 and a `missing_keywords` array.
7. **Given** `aiProvider.ts` with BYOK mode enabled and a valid user-supplied key, **When** the provider is resolved, **Then** it selects the BYOK provider and does NOT fall back to the platform default.
8. **Given** any AI utility function receives an empty string as input, **When** called, **Then** it returns a validation error and does NOT invoke the AI provider.

---

### User Story 2 — Resume Editor Data Flow Tests (Priority: P1) [Task A]

As an engineering team, we want the full lifecycle of resume CRUD operations — loading, section editing, auto-saving, undo/redo, template switching — to be covered by unit tests so that the core product never silently loses user data.

**Why this priority**: The Resume Editor is the primary product differentiator. Data loss, unsaved changes, or broken section rendering is the highest severity user experience failure.

**Independent Test**: Run tests in `src/components/editor/**` and `src/pages/EditorPage.test.tsx` with Supabase and AI hooks mocked. Validates data load, section mutation, preview sync, and save behavior.

**Acceptance Scenarios**:

1. **Given** `EditorPage` is mounted with a mocked resume ID, **When** the data fetch resolves, **Then** all resume sections (Contact, Summary, Experience, Education, Skills) are populated in the form state.
2. **Given** a loaded resume in the editor, **When** the user updates the job title field, **Then** the live preview panel reflects the change and the form state is marked dirty.
3. **Given** a dirty form state with unsaved changes, **When** the auto-save timer fires, **Then** the Supabase `upsert` mutation is called with the current form state payload.
4. **Given** a save operation that fails with a 503 error, **When** the retry exhausts, **Then** the editor displays a non-blocking error toast and the local draft is preserved in state.
5. **Given** the editor history has 3 snapshots, **When** the user triggers undo twice, **Then** the form state reverts to snapshot index 1 and the redo stack has 2 entries.
6. **Given** a resume is loaded, **When** the user switches to a different template, **Then** `template_id` is updated in form state and the preview re-renders with the new template layout.
7. **Given** a resume with an empty `summary` section, **When** the "Generate with AI" button is clicked (mocked `useAIAction` response), **Then** the summary field is populated and the section is marked as AI-generated.
8. **Given** two auto-saves fire within 300ms of each other, **When** both resolve, **Then** only one Supabase `upsert` call is made (debounce is enforced).

---

### User Story 3 — Authentication & Route Guard Tests (Priority: P1) [Task A]

As an engineering team, we want all auth state transitions and route protection logic to have unit tests so that no unauthenticated user can reach protected resources and no authenticated user is bounced to login unexpectedly.

**Why this priority**: A broken auth guard is a zero-day regression — it either locks all users out or exposes private data.

**Independent Test**: Mount auth-aware components with mocked Kinde states (`authenticated`, `unauthenticated`, `loading`) and assert routing outcomes without a real auth server.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user (mocked Kinde: `isAuthenticated: false`), **When** they navigate to `/editor`, **Then** the app redirects to the landing/login page.
2. **Given** an authenticated user (mocked Kinde: `isAuthenticated: true`), **When** they visit the `/auth` page, **Then** they are redirected to `/dashboard`.
3. **Given** auth state is `isLoading: true`, **When** a protected route is rendered, **Then** a loading skeleton is shown and no redirect fires prematurely.
4. **Given** `useAuth` with an active Kinde session, **When** `logout()` is called, **Then** local session state is cleared and the Kinde logout endpoint is called.
5. **Given** an authenticated user with `onboarding_complete: false`, **When** they navigate to `/dashboard`, **Then** they are redirected to `/onboarding`.

---

### User Story 4 — Upload & Parsing Pipeline Tests (Priority: P1) [Task B — TestSprite gate]

As an engineering team, we want the resume upload and parsing pipeline to have tests covering section extraction, data normalization, and error recovery so that corrupted or unparseable files never silently create empty resumes.

**Why this priority**: The parsing pipeline is the data entry point for imported resumes. Silent parsing failures create empty or malformed resume records.

**Independent Test**: Call parsing functions directly with **synthetically generated buffers** (no fixture files) and assert the structured output matches expected shapes.

**Acceptance Scenarios**:

1. **Given** `extractSections()` receives plain text with `WORK HISTORY` as a heading, **When** parsed, **Then** content is mapped to the `experience` bucket (not silently absorbed into the prior section).
2. **Given** `extractSections()` receives an unrecognized heading `CONSULTING WORK`, **When** parsed, **Then** content lands in the `unrecognized` bucket rather than being dropped.
3. **Given** a synthetically generated PDF-like buffer (valid minimal structure), **When** `parsePdf()` is called, **Then** it returns a `ParsedResume` with at minimum `contact`, `experience`, and `education` fields.
4. **Given** a synthetically generated DOCX-like buffer, **When** `parseDocx()` is called, **Then** it returns the same `ParsedResume` shape as the PDF parser.
5. **Given** a zero-byte or corrupted buffer, **When** any parser is called, **Then** it throws a `ParseError` with a user-readable `message` — it does NOT return an empty object silently.
6. **Given** `splitIntoBlocks()` encounters `IBM GLOBAL SERVICES` (ALL-CAPS company name), **When** split, **Then** no phantom second experience block is created from the company name line.
7. **Given** resume text with Unicode characters (e.g., accented names, CJK characters), **When** parsed, **Then** the output contains the characters intact without garbling.

---

### User Story 5 — User Journey Page Rendering Tests (Priority: P2) [Task B]

As an engineering team, we want every major page to have a smoke test that confirms it mounts, fetches data, and renders its key UI elements so that a broken import or missing dependency is caught immediately.

**Why this priority**: Page-level smoke tests are the cheapest regression net — one broken import blanks an entire route.

**Independent Test**: Mount each page with mocked data providers (Supabase, auth, AI hooks) and assert the primary content container renders without throwing.

**Acceptance Scenarios**:

1. **Given** `DashboardPage` is mounted with mocked resume list data, **When** rendered, **Then** resume cards are displayed and the "Create New Resume" button is present.
2. **Given** `OnboardingPage` is mounted at step 1, **When** the user fills career level and clicks "Next", **Then** the wizard advances to step 2.
3. **Given** `UploadPage` is mounted, **When** a file is dropped onto the dropzone, **Then** the upload progress indicator appears and the file name is displayed.
4. **Given** `AIStudioPage` is mounted, **When** rendered, **Then** all 18+ tool cards are visible and each links to its correct sub-route.
5. **Given** `ApplicationsPage` is mounted with mocked job data, **When** rendered, **Then** job cards are grouped by status (Applied, Interviewing, Offered, Rejected).
6. **Given** `SettingsPage` is mounted, **When** the theme toggle is clicked, **Then** the theme context updates to the next mode.
7. **Given** `ProfilePage` is mounted with mocked user data, **When** the user updates display name and clicks save, **Then** the Supabase update mutation is called with the new name.
8. **Given** every remaining `src/pages/*.tsx` file not covered above, **When** mounted with mocked providers, **Then** the page renders without throwing (smoke test — no crash = pass).

---

### User Story 6 — AI Studio Tool-by-Tool Tests (Priority: P2) [Task B]

As an engineering team, we want each of the 18+ AI Studio tools to have individual unit tests verifying input validation, credit consumption, and output rendering so that a broken tool is isolated and does not affect the rest of the studio.

**Why this priority**: AI Studio is the primary monetized feature. A broken tool that silently deducts credits with no output is a direct trust issue.

**Independent Test**: Mount each tool component with mocked `useAIAction` and `useAICredits`. Simulate submit → verify credit call and output render.

**Acceptance Scenarios**:

1. **Given** the Cover Letter Generator is open, **When** the user submits a job description and clicks "Generate", **Then** `useAIAction` is called with `tool: 'cover_letter'` and the generated letter appears in the preview panel.
2. **Given** the ATS Resume Scanner, **When** a resume and job description are submitted, **Then** the score (0–100) renders in the score ring and the keyword gap list is populated.
3. **Given** the Career Assessment Quiz, **When** the user completes all questions, **Then** the results card shows a career path recommendation with a confidence percentage.
4. **Given** any AI tool with 0 credits, **When** the user attempts to submit, **Then** the submit button is disabled, an "Insufficient Credits" state is shown, and `useAIAction` is NOT called.
5. **Given** the Resignation Letter tool, **When** the `useAIAction` hook returns an error, **Then** an error state with a retry button is shown and no credits are deducted.
6. **Given** each of the remaining 13+ AI tools not listed above, **When** a valid input is submitted (mocked hook response), **Then** the tool renders output and does not throw.

---

### User Story 7 — Interview & Voice Feature Tests (Priority: P2) [Task C]

As an engineering team, we want the interview simulation and voice transcription features to have full unit tests — with all audio APIs mocked — so that voice-dependent flows are validated without requiring real hardware.

**Why this priority**: Interview features use costly ElevenLabs/Web Speech APIs. Unit tests with mocked APIs provide a regression net that is cheap, repeatable, and hardware-free.

**Implementation note**: `window.SpeechRecognition`, `window.speechSynthesis`, and any ElevenLabs SDK calls are stubbed via `vi.stubGlobal()` in the test file's `beforeAll`. Tests run fully in jsdom.

**Acceptance Scenarios**:

1. **Given** `InterviewPage` is mounted and a mock session starts, **When** the first question is rendered, **Then** the question text is visible and the record button is active.
2. **Given** the mocked Web Speech API returns a transcript string, **When** the user stops recording, **Then** the transcript populates the answer field and the "Submit Answer" button becomes enabled.
3. **Given** a completed interview session (5 answers submitted), **When** `useAgenticChat` resolves grading, **Then** the results panel shows `strengths`, `weaknesses`, and a `communication_score` between 0–10.
4. **Given** ElevenLabs voice synthesis is disabled (no BYOK key), **When** the interview runs, **Then** the app falls back to Web Speech without error and no uncaught exception is thrown.
5. **Given** `window.SpeechRecognition` is stubbed as `undefined`, **When** `InterviewPage` mounts, **Then** the page renders a graceful degradation message rather than crashing.

---

### User Story 8 — Portfolio & Public Profile Tests (Priority: P2) [Task C]

As an engineering team, we want the portfolio editor and public portfolio page to have unit tests verifying theme switching, resume data sync, and public/private URL behavior so that user-visible professional profiles are never broken by a silent regression.

**Why this priority**: The public portfolio is shared externally on LinkedIn and email. A visual break damages the user's professional reputation.

**Acceptance Scenarios**:

1. **Given** `PortfolioEditorPage` is mounted with a mocked profile, **When** the user switches from `theme-1` to `theme-3`, **Then** the theme ID updates in form state and the preview re-renders.
2. **Given** `PortfolioEditorPage` with a username already claimed (mocked conflict response), **When** the user tries to claim the same username, **Then** a validation error "Username already taken" is shown.
3. **Given** `PublicPortfolioPage` rendered at `/p/johndoe` with mocked data, **When** mounted, **Then** the user's name, headline, and skills section are visible.
4. **Given** a portfolio with `is_public: false`, **When** `/p/johndoe` is accessed, **Then** the page shows a 404 or "private profile" state — not the user's resume data.

---

### User Story 9 — Application Tracker Tests (Priority: P3) [Task C]

As an engineering team, we want the application tracker CRUD operations and status transitions to be unit-tested so that job status changes are persisted correctly and analytics are not distorted by silent save failures.

**Acceptance Scenarios**:

1. **Given** `ApplicationsPage` with a mocked job in "Applied" status, **When** the user moves it to "Interviewing", **Then** the Supabase update is called with `status: 'interviewing'`.
2. **Given** an application with a deadline in the past (mocked `Date.now()`), **When** the card renders, **Then** a visual "overdue" indicator is displayed.
3. **Given** analytics data for 10 applications (mocked), **When** the analytics panel renders, **Then** the response rate percentage and activity streak are calculated and displayed correctly.

---

### User Story 10 — Settings & BYOK Tests (Priority: P3) [Task C]

As an engineering team, we want Settings page interactions — theme toggle, BYOK key storage, data export — to be unit-tested, with a failing placeholder for the not-yet-built encryption feature so we know exactly what to implement.

**Acceptance Scenarios**:

1. **Given** `SettingsPage` is mounted, **When** the user enters a Gemini API key and saves, **Then** a **failing placeholder test** asserts that the key is encrypted at rest — this test is expected to fail until the encryption utility is built (tracked as a separate work item: `021-byok-encryption`).
2. **Given** the theme toggle, **When** cycled through Light → Dark → System, **Then** the `theme` context value matches each state and the `<html>` class attribute updates accordingly.
3. **Given** the "Export My Data" button, **When** clicked, **Then** `accountBackup.ts` is called and a file download is triggered with a JSON blob.

---

### Edge Cases

- AI calls with empty string inputs must return validation errors — provider must never be invoked.
- Forms with all optional fields left blank must not throw on submit — they save with null values.
- Resume text with special characters (Unicode, RTL, emoji) must not break the editor or parser.
- Two auto-saves within 300ms must produce only one Supabase `upsert` call (debounce enforced).
- BYOK keys that are revoked mid-session must surface a user-visible error, not a silent hang.
- Components using `window.speechSynthesis` or `navigator.mediaDevices` must degrade without throwing when those APIs are absent in jsdom.
- PDF export triggered before the resume preview is fully rendered must be queued, not silently produce a blank PDF.
- All tests must operate behind the global mock boundary — no real network calls escape.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All existing test files are **deleted and replaced** from scratch at the start of Task A.
- **FR-002**: All 10 domains must have dedicated test files under `src/**/__tests__/*.test.{ts,tsx}`.
- **FR-003**: All AI responses are mocked exclusively at the `useAIAction` hook level — no HTTP-level or provider-function-level mocking.
- **FR-004**: Parsing pipeline tests use **synthetically generated buffers** inline — no fixture files stored on disk.
- **FR-005**: `window.SpeechRecognition`, `window.speechSynthesis`, and ElevenLabs calls are mocked via `vi.stubGlobal()` in each interview test — no real audio hardware required.
- **FR-006**: BYOK encryption test is a **failing placeholder** — committed as a `todo` test with a linked work item `021-byok-encryption`.
- **FR-007**: All tests use the existing global mock infrastructure in `src/test/mocks/` — no local duplicate mocks.
- **FR-008**: Route guards are tested for all three auth states: `authenticated`, `unauthenticated`, `loading`.
- **FR-009**: Every `src/pages/*.tsx` file has at minimum one smoke test asserting mount-without-crash.
- **FR-010**: AI Studio — each of the 18+ tools has an individual test verifying the zero-credits guard.
- **FR-011**: Coverage is tracked via `npm run test:coverage` as a **soft metric only** — no CI gate failure.
- **FR-012**: The full test suite executes in under 5 minutes on a standard developer machine.

### Key Entities

- **SyntheticBuffer**: An inline `Buffer.from(...)` or `Uint8Array` created directly in a test to simulate a PDF/DOCX payload — replaces fixture files entirely.
- **MockProvider**: Global Supabase, Kinde auth, and `useAIAction` mocks in `src/test/mocks/` — the single source of truth for all test doubles.
- **CoverageReport**: Vitest `v8` coverage output — lines, branches, functions, statements. Informational only.
- **FailingPlaceholder**: A `test.todo()` or `expect.fail()` test committed intentionally to mark unbuilt functionality (BYOK encryption).
- **TestDomain**: One of D1–D10, each with its own `__tests__/` subfolder and a clear scope boundary.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `npm run test` exits with code 0 — all tests pass (except the intentional BYOK failing placeholder).
- **SC-002**: `npm run test:coverage` reports ≥80% across lines, branches, functions, statements (soft target — informational).
- **SC-003**: Total test files increase from ~28 to ≥60, with at least one file per domain.
- **SC-004**: Every `src/pages/*.tsx` (40+ pages) has a corresponding test file with ≥1 smoke test.
- **SC-005**: Every `src/lib/ai/*.ts` and `src/lib/ats*.ts` function has ≥90% function coverage with explicit happy-path and error-path tests.
- **SC-006**: All 18+ AI Studio tool components each have an individual zero-credits guard test.
- **SC-007**: The parsing pipeline achieves ≥95% branch coverage on `extractSections`, `parsePdf`, and `splitIntoBlocks`.
- **SC-008**: Zero real network calls escape the mock boundary in any test file.
- **SC-009**: All interview/voice tests pass headlessly in jsdom without audio hardware.
- **SC-010**: Task A + D4 of Task B are merged before TestSprite handoff — all P1 domains covered.
- **SC-011**: The BYOK encryption failing placeholder is visible in test output as a `todo` — it is a known, intentional gap, not a missed test.

---

## Out of Scope

- **Visual regression / screenshot tests** — handled by TestSprite's E2E layer.
- **Load / stress testing** — out of scope for unit tests.
- **Real network integration tests** — all external calls are mocked; real integration is TestSprite's domain.
- **BYOK encryption implementation** — tracked as separate work item `021-byok-encryption`; only a failing placeholder test is written here.
- **Test data seeding in Supabase** — all data is mocked at the hook level; no DB seeding required.
- **CI coverage gate** — coverage is tracked as a soft metric only; no pipeline failure on threshold miss.
