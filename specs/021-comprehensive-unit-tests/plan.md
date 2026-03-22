# Implementation Plan: Comprehensive Unit Test Suite

**Branch**: `021-task-a-domains-1-3` → `021-task-b-domains-4-6` → `021-task-c-domains-7-10`
**Date**: 2026-03-22 | **Spec**: [spec.md](./spec.md)

---

## Summary

Add a systematic, domain-by-domain unit test suite covering the entire WiseResume application across 10 domains and 3 PR batches — **written alongside the existing 28 tests, with no deletions**. New files use descriptive domain-suffixed names (e.g. `useAIAction-D1.test.ts`, `EditorPage-D2.test.ts`). The suite targets ≥80% coverage (soft metric only — no CI gate), mocks at the `useAIAction` hook level, generates all test data synthetically, and must be TestSprite-ready after Task A + D4 of Task B merge.

The existing infrastructure (Vitest 3, React Testing Library 16, jsdom, `@vitest/coverage-v8`, and global mocks for Supabase, framer-motion, sonner, haptics) is fully in place. The primary **new infrastructure gap** is missing mocks for: `useAuth` (wraps Kinde internally), React Router, `useAIAction`, `agenticChat` (independent of useAIAction), Zustand stores, Web Speech / ElevenLabs APIs, and **`global.fetch`** (used directly by `tailorResumeWithProgress` and `parseTextWithAI` — these bypass `useAIAction` entirely).

---

## Technical Context

**Language/Version**: TypeScript 5 / React 18
**Primary Dependencies**: Vitest 3.2, React Testing Library 16, `@testing-library/jest-dom` 6, jsdom
**Storage**: N/A — Supabase mocked globally via `src/test/mocks/supabase.ts`
**Testing**: `npm run test` (run), `npm run test:watch` (watch), `npm run test:coverage` (soft coverage report)
**Target Platform**: Local (Node/jsdom) + GitHub Actions CI
**Project Type**: React SPA (web application)
**Performance Goals**: Full suite completes in < 5 minutes locally
**Constraints**: No real network calls; no fixture files on disk; no CI gate on coverage
**Scale/Scope**: 10 domains, 40+ pages, 18+ AI Studio tools, ~60 new test files

---

## Constitution Check

- [x] **No runtime code is modified** — this spec only adds/replaces test files. Zero changes to `src/` production code.
- [x] **Supabase is mocked** — the existing global mock in `src/test/mocks/supabase.ts` covers all DB calls; no real DB is touched.
- [x] **AI calls mocked at hook level** — `useAIAction` will be mocked via a new global mock; no real Gemini/AI calls are made.
- [x] **Coverage is a soft metric** — no CI gate is added or modified; the existing pipeline is not changed.
- [x] **Existing tests are preserved** — all 28 existing test files remain untouched. New tests are added alongside using domain-suffixed names. No deletions.
- [x] **All external APIs mocked** — Kinde, Web Speech, ElevenLabs, React Router all get new mocks in `src/test/mocks/`; nothing escapes jsdom.

---

## Project Structure

### Documentation (this feature)

```text
specs/021-comprehensive-unit-tests/
├── spec.md          # Clarified feature spec
├── plan.md          # This file
└── tasks.md         # Task breakdown (next: /speckit.tasks 021)
```

### New Mock Files (Phase 0 — shared across all tasks)

```text
src/test/mocks/
├── supabase.ts          # EXISTS — no changes
├── framer-motion.tsx    # EXISTS — no changes
├── sonner.tsx           # EXISTS — no changes
├── haptics.ts           # EXISTS — no changes
├── browser.ts           # EXISTS — no changes
├── data.ts              # EXISTS — no changes
├── auth.ts              # NEW — mock @/hooks/useAuth (NOT @kinde-oss/kinde-auth-react directly)
├── router.ts            # NEW — mock react-router-dom (useNavigate, useLocation, etc.)
├── aiAction.ts          # NEW — mock @/hooks/useAIAction hook at module level
├── agenticChat.ts       # NEW — mock @/lib/agenticChat (sendChatMessage, sendFunctionFeedback)
├── zustandStores.ts     # NEW — mock useResumeStore, useSettingsStore, useOfflineSyncStore
└── fetch.ts             # NEW — mock global.fetch for direct edge function callers (tailorResumeWithProgress, parseTextWithAI)
```

`src/test/setup.ts` — MODIFIED to import the 6 new mocks above.

### Naming Convention

All new test files use a **domain suffix** to distinguish them from existing tests:
- Format: `<Subject>-<DomainCode>.test.{ts,tsx}`
- Examples: `useAIAction-D1.test.ts`, `EditorPage-D2.test.tsx`, `TailorSheet-D6.test.tsx`
- Existing test files are **untouched** — they continue running alongside new files.

### New Test Files — Task A: Domains 1–3

```text
src/hooks/__tests__/
├── useAIAction-D1.test.ts          # D1 — happy path, error, zero credits
├── useAICredits-D1.test.ts         # D1 — deduction, exhaustion, refill
├── useAIEnhance-D1.test.ts         # D1 — enhancement, no mutation, error
├── useAIHealth-D1.test.ts          # D1 — healthy, unhealthy, polling
├── useAIProviderInfo-D1.test.ts    # D1 — BYOK vs platform provider
├── useAIKeyHydration-D1.test.ts    # D1 — key load, missing key fallback
└── useAuth-D3.test.ts              # D3 — login, logout, session states

src/lib/__tests__/
├── aiTailor-D1.test.ts             # D1 — tailorResumeWithProgress, fetch mock, retry
├── aiProvider-D1.test.ts           # D1 — getAIProviderInfo BYOK vs default
├── aiAnalysis-D1.test.ts           # D1 — analysis output shape
├── atsParserSimulation-D1.test.ts  # D1 — simulateATSParsing, score, missingKeywords
├── atsValidationChecks-D1.test.ts  # D1 — check pass/fail logic
└── aiCostEstimates-D1.test.ts      # D1 — cost calculation accuracy

src/components/editor/__tests__/
├── EditorPage-D2.test.tsx          # D2 — load, dirty state, auto-save
├── EditorAutoSave-D2.test.tsx      # D2 — debounce, failure recovery
├── EditorHistory-D2.test.tsx       # D2 — undo/redo stack operations
├── EditorTemplateSwitch-D2.test.tsx # D2 — template_id update, preview re-render
└── EditorSectionAI-D2.test.tsx     # D2 — AI generation fills section

src/components/auth/__tests__/
├── ProtectedRoute-D3.test.tsx      # D3 — unauth redirect, auth pass-through
├── AuthPage-D3.test.tsx            # D3 — authed user redirected away
├── OnboardingGuard-D3.test.tsx     # D3 — onboarding_complete: false redirect
└── LoadingState-D3.test.tsx        # D3 — loading skeleton, no premature redirect
```

### New Test Files — Task B: Domains 4–6

```text
src/lib/pdf/__tests__/
├── parseResumeText-D4.test.ts      # D4 — WORK HISTORY mapping, unknowns, Unicode
├── splitIntoBlocks-D4.test.ts      # D4 — all-caps company (if exported; via parseResumeText otherwise)
└── pdfParseError-D4.test.ts        # D4 — PDFParseError shape, .message, .code

src/lib/__tests__/
├── parseResumePDF-D4.test.ts       # D4 — File constructor, ParseResult shape, zero-byte failure
└── uploadValidation-D4.test.ts     # D4 — zero-byte, bad mime type rejection

src/pages/__tests__/
├── DashboardPage-D5.test.tsx       # D5 — resume cards, create button
├── OnboardingPage-D5.test.tsx      # D5 — wizard step progression
├── UploadPage-D5.test.tsx          # D5 — dropzone, progress indicator
├── AIStudioPage-D5.test.tsx        # D5 — 18+ tool cards visible
├── ApplicationsPage-D5.test.tsx    # D5 — grouped by status
├── SettingsPage-D5.test.tsx        # D5 — theme toggle
├── ProfilePage-D5.test.tsx         # D5 — save mutation call
└── remaining-pages-D5.test.tsx     # D5 — smoke tests for all remaining 33+ pages

src/components/editor/__tests__/
├── TailorSheet-D6.test.tsx         # D6 — fetch mock, overallScore, retry, credits guard
├── JobAnalysisSheet-D6.test.tsx    # D6 — useAIAction, match score, gap analysis
├── ATSScanSheet-D6.test.tsx        # D6 — score ring, keyword list
├── AgenticChatSheet-D6.test.tsx    # D6 — sendChatMessage mock, output render
├── CareerPathSheet-D6.test.tsx     # D6 — results card, credits guard
├── ZeroCreditsGuard-D6.test.tsx    # D6 — all sheets: 0 credits disables submit
└── remaining-sheets-D6.test.tsx    # D6 — remaining 5+ sheet tools
```

### New Test Files — Task C: Domains 7–10

```text
src/pages/__tests__/
├── InterviewPage-D7.test.tsx           # D7 — question render, record button
├── InterviewTranscript-D7.test.tsx     # D7 — speech mock → transcript population
├── InterviewGrading-D7.test.tsx        # D7 — 5 answers → grading result shape
├── InterviewFallback-D7.test.tsx       # D7 — no ElevenLabs → Web Speech fallback
├── InterviewNoSpeechAPI-D7.test.tsx    # D7 — SpeechRecognition=undefined → graceful msg
├── PortfolioEditorPage-D8.test.tsx     # D8 — theme switch, form state
├── PortfolioUsernameConflict-D8.test.tsx # D8 — duplicate username error
├── PublicPortfolioPage-D8.test.tsx     # D8 — name/headline/skills visible
├── PortfolioPrivate-D8.test.tsx        # D8 — is_public:false → 404/private state
├── ApplicationsTracker-D9.test.tsx     # D9 — status transition, Supabase update
├── ApplicationsDeadline-D9.test.tsx    # D9 — overdue indicator (mocked date)
├── ApplicationsAnalytics-D9.test.tsx   # D9 — response rate, streak calculation
├── SettingsBYOK-D10.test.tsx           # D10 — failing placeholder (test.todo)
├── SettingsTheme-D10.test.tsx          # D10 — Light/Dark/System cycle
└── SettingsExport-D10.test.tsx         # D10 — accountBackup.ts called, download triggered
```

---

## Phase 0 — Mock Infrastructure (prerequisite for all tasks)

**Goal**: Extend the global mock setup with 6 new mocks. All 28 existing test files and all existing mocks are left completely untouched.

### 0.1 — Add `src/test/mocks/auth.ts` *(C2)*

`useAuth` is a custom hook that wraps `AuthContext` — it does **not** import from `@kinde-oss/kinde-auth-react` directly. Mock `@/hooks/useAuth` at the module level so all components using `useAuth()` get a controllable auth state.

```typescript
// Pattern — actual content written during implementation
vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: false,
    isLoading: false,
    user: null,
    logout: vi.fn(),
  })),
}));
```

Each test overrides per-scenario with `vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true, ... })`.

### 0.2 — Add `src/test/mocks/router.ts`

Mock `react-router-dom` to expose controllable `useNavigate`, `useLocation`, `useParams`, and `MemoryRouter`. Route guard tests use `MemoryRouter` with an initial entry for the route under test.

```typescript
// Pattern
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: vi.fn(() => vi.fn()) };
});
```

### 0.3 — Add `src/test/mocks/aiAction.ts`

Mock `@/hooks/useAIAction` globally so all AI Studio tool tests get a controllable hook response without touching the hook's internals.

```typescript
// Pattern
vi.mock("@/hooks/useAIAction", () => ({
  useAIAction: vi.fn(() => ({
    execute: vi.fn().mockResolvedValue({ result: "mocked output", creditsUsed: 1 }),
    isLoading: false,
    error: null,
  })),
}));
```

### 0.4 — Add `src/test/mocks/agenticChat.ts` *(C3)*

`useAgenticChat` does **not** use `useAIAction`. It calls `sendChatMessage()` and `sendFunctionFeedback()` from `@/lib/agenticChat` directly, plus manages its own credit checking via `useAICreditsMutations`. Mock the lib module so D7 interview tests can control chat responses without real edge function calls.

```typescript
// Pattern
vi.mock("@/lib/agenticChat", () => ({
  sendChatMessage: vi.fn().mockResolvedValue({ type: "text", content: "mock response" }),
  sendFunctionFeedback: vi.fn().mockResolvedValue({}),
}));
```

### 0.5 — Add `src/test/mocks/zustandStores.ts` *(C1)*

EditorPage calls `useResumeStore()`, `useSettingsStore()`, and `useOfflineSyncStore()` at top level — these Zustand stores must be mocked or they will attempt to hydrate from real state. Mock all three at the module level with minimal default shapes.

```typescript
// Pattern
vi.mock("@/store/resumeStore", () => ({
  useResumeStore: vi.fn(() => ({ resume: null, setResume: vi.fn(), clearResume: vi.fn() })),
}));
vi.mock("@/store/settingsStore", () => ({
  useSettingsStore: vi.fn(() => ({ theme: "light", aiProvider: "default" })),
}));
vi.mock("@/store/offlineSyncStore", () => ({
  useOfflineSyncStore: vi.fn(() => ({ pendingActions: [], isOnline: true })),
}));
```

> **Note**: Confirm exact store paths and return shapes by reading each store file before writing the mock. Adjust field names to match actual store slices.

### 0.6 — Add `src/test/mocks/fetch.ts` *(new — tailoring & parsing)*

`tailorResumeWithProgress()` and `parseTextWithAI()` both call `global.fetch` directly to hit edge function URLs (`/functions/v1/tailor-resume`, `/functions/v1/parse-resume`). The `useAIAction` global mock does **not** intercept these. A global `fetch` mock is required.

```typescript
// Pattern
const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: vi.fn().mockResolvedValue({}),
  text: vi.fn().mockResolvedValue(""),
});
vi.stubGlobal("fetch", mockFetch);
export { mockFetch };
```

Per-test overrides control success vs error vs rate-limit responses:
```typescript
// Rate-limit scenario
mockFetch.mockResolvedValueOnce({ ok: false, status: 429, json: vi.fn().mockResolvedValue({ error: "rate_limit" }) });

// Transient error (triggers retry logic)
mockFetch.mockRejectedValueOnce(new Error("network error"));
```

### 0.7 — Update `src/test/setup.ts`

Add the six new mock imports to the global setup:

```typescript
import "./mocks/auth";        // mocks @/hooks/useAuth
import "./mocks/router";
import "./mocks/aiAction";
import "./mocks/agenticChat";
import "./mocks/zustandStores";
import "./mocks/fetch";       // mocks global.fetch for direct edge function callers
// stub Web Speech APIs globally (for D7)
vi.stubGlobal("SpeechRecognition", vi.fn());
vi.stubGlobal("webkitSpeechRecognition", vi.fn());
```

---

## Phase 1 — Task A: Domains 1–3 (AI Logic, Editor, Auth)

**Branch**: `021-task-a-domains-1-3`
**TestSprite relevance**: P1 domains — merge this before TestSprite handoff.

### 1.1 — Domain 1: AI Tools & Business Logic

Write tests for every hook and lib function in the AI layer. Each test file covers:
- **Happy path**: correct input → expected output shape
- **Error path**: provider returns 500 / network failure
- **Zero-credits path**: `useAICredits` returns 0 → action is blocked, provider not called
- **Empty input path**: empty string → validation error, no provider call
- **BYOK path**: user-supplied key → BYOK provider selected, platform default not used

**Key mock pattern** for hooks (all AI hooks):
```typescript
// In each test, override the global useAIAction mock per scenario
vi.mocked(useAIAction).mockReturnValue({
  execute: vi.fn().mockResolvedValue({ result: "enhanced text", creditsUsed: 1 }),
  isLoading: false,
  error: null,
});
```

**Key patterns for lib functions** *(C6 + analysis corrections)*:

**`aiTailor.ts` — uses `global.fetch` directly, NOT `useAIAction`:**
```typescript
// tailorResumeWithProgress calls fetch("/functions/v1/tailor-resume") internally.
// Mock fetch via the global fetch mock before calling.
mockFetch.mockResolvedValueOnce({
  ok: true, status: 200,
  json: vi.fn().mockResolvedValue({ summary: "tailored", overallScore: { before: 60, after: 82 } }),
});

const onProgress = vi.fn();
const result = await tailorResumeWithProgress(mockResume, mockJobDesc, onProgress, 'moderate');

// Correct field path — SuperTailorResult extends EnhancedTailorResult:
expect(result.overallScore).toEqual({ before: 60, after: 82 });  // NOT score_before/score_after
expect(result.summary).toBeDefined();
expect(onProgress).toHaveBeenCalled(); // progress callback fired
```

**Retry logic test** (tailorResumeWithProgress auto-retries once on transient errors):
```typescript
vi.useFakeTimers();
mockFetch
  .mockRejectedValueOnce(new Error("network error"))   // first call fails
  .mockResolvedValueOnce({ ok: true, status: 200, json: vi.fn().mockResolvedValue(mockResult) }); // retry succeeds
const promise = tailorResumeWithProgress(mockResume, mockJobDesc, vi.fn());
await vi.advanceTimersByTimeAsync(2500); // advance past 2s retry delay
const result = await promise;
expect(mockFetch).toHaveBeenCalledTimes(2);
```

**Rate-limit error test:**
```typescript
mockFetch.mockResolvedValueOnce({ ok: false, status: 429, json: vi.fn().mockResolvedValue({ error: "rate_limit" }) });
await expect(tailorResumeWithProgress(mockResume, mockJobDesc, vi.fn())).rejects.toMatchObject({ code: "rate_limit" });
```

**`simulateATSParsing` — synchronous, no mocks needed:**
```typescript
const result = simulateATSParsing(mockResume, mockJobDescription);
// Correct field names from ATSParsedResult interface:
expect(result.score).toBeGreaterThanOrEqual(0);
expect(result.score).toBeLessThanOrEqual(100);
expect(result.missingKeywords).toBeInstanceOf(Array);  // NOT missing_keywords
expect(result.sections).toBeInstanceOf(Array);
```

**`parseJobUrl` uses raw `fetch`; `parseJobText` uses `supabase.functions.invoke`:**
```typescript
// parseJobUrl — mock fetch
mockFetch.mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ title: "Engineer" }) });
const job = await parseJobUrl("https://example.com/job");
expect(job.title).toBe("Engineer");

// parseJobText — mock supabase.functions.invoke (already in global Supabase mock)
mockSupabaseClient.functions = { invoke: vi.fn().mockResolvedValue({ data: { title: "Engineer" }, error: null }) };
```

**`getAIProviderInfo()` — utility, no async, reads Zustand store:**
```typescript
// Control via zustandStores mock
vi.mocked(useSettingsStore).mockReturnValue({ aiProvider: "byok", byokKey: "sk-xxx", ... });
const info = getAIProviderInfo();
expect(info.isCustomKey).toBe(true);
expect(info.tier).toBe("paid");
```

### 1.2 — Domain 2: Resume Editor Data Flows

Write tests for `EditorPage` and its sub-components. All Supabase calls come from the global mock. Key patterns:

**Loading test**:
```typescript
mockSupabaseClient.single.mockResolvedValueOnce({ data: mockResume, error: null });
render(<MemoryRouter><EditorPage /></MemoryRouter>);
await waitFor(() => expect(screen.getByDisplayValue("Senior Engineer")).toBeInTheDocument());
```

**Auto-save debounce test**:
- Use `vi.useFakeTimers()` to control the debounce timer.
- Fire two rapid field updates within 300ms.
- Advance timers past debounce threshold.
- Assert `mockSupabaseClient.upsert` was called exactly once.

**Undo/redo test**:
- Trigger 3 field changes to build history.
- Click undo twice.
- Assert form state matches snapshot at index 1.

**AI generation in section test**:
- Override `useAIAction` mock to return summary text.
- Click "Generate with AI" button.
- Assert the summary field now contains the mocked AI output.

### 1.3 — Domain 3: Auth & Route Guards

Each test mounts a `ProtectedRoute` (or the page directly) inside `MemoryRouter` with a controlled initial route. Auth state is controlled via `vi.mocked(useAuth).mockReturnValue(...)` — the mock targets `@/hooks/useAuth` directly since that is the only auth interface consumed by components. *(C2)*

**Route guard matrix** (one `it` block per cell):

| Auth State | Route | Expected Outcome |
|-----------|-------|-----------------|
| unauthenticated | `/editor` | redirect to `/` |
| authenticated | `/auth` | redirect to `/dashboard` |
| loading | `/editor` | skeleton shown, no redirect |
| authenticated, `onboarding_complete: false` | `/dashboard` | redirect to `/onboarding` |
| authenticated, `onboarding_complete: true` | `/dashboard` | dashboard renders |

---

## Phase 2 — Task B: Domains 4–6 (Parsing, Pages, AI Studio UI)

**Branch**: `021-task-b-domains-4-6`
**TestSprite gate**: D4 merged = TestSprite handoff is unblocked.

### 2.1 — Domain 4: Upload & Parsing Pipeline

**Synthetic buffer generation pattern** (no fixture files):
```typescript
// Minimal valid-structure PDF-like buffer for unit testing
const syntheticPdfBuffer = Buffer.from("%PDF-1.4\n1 0 obj\n<< >>\nendobj\n%%EOF");

// For plain-text parsing tests (no buffer needed)
const resumeText = `
John Doe
john@example.com

WORK HISTORY
Software Engineer at IBM GLOBAL SERVICES (2020–2024)
  - Built microservices architecture
  - Led team of 5 engineers

SKILLS
TypeScript, React, Node.js
`;
```

**Corrected function names and signatures** *(C4)*:

| Plan originally said | Actual exported API |
|---|---|
| `extractSections(text)` | `parseResumeText(text: string): ResumeData` — the public text-level parser |
| `parsePdf(buffer)` | `parseResumePDF(file: File): Promise<ParseResult>` — takes a `File`, not a `Buffer` |
| `parseDocx(buffer)` | Handled inside `parseResumePDF` — no separate DOCX function |
| `ParseError` | `PDFParseError` from `src/lib/pdf/textExtractor.ts` |
| `splitIntoBlocks` (assumed exported) | Verify export before writing test — may need `parseResumeText` as proxy |

**Parsing call chain and mock targets:**

```
parseResumePDF(File)
  └── extractTextFromPDF(File)     ← uses pdfjs-dist — MOCK pdfjs-dist at module level
        └── [text extracted]
  └── parseTextWithAI(text)        ← calls fetch("/functions/v1/parse-resume") — uses mockFetch
        └── [on timeout/error] falls back to parseResumeText(text)  ← local, no mocks needed
```

**pdfjs-dist module mock** (required for `parseResumePDF` tests in jsdom):
```typescript
vi.mock("pdfjs-dist", () => ({
  getDocument: vi.fn().mockReturnValue({
    promise: Promise.resolve({
      numPages: 1,
      getPage: vi.fn().mockResolvedValue({
        getTextContent: vi.fn().mockResolvedValue({
          items: [{ str: "John Doe" }, { str: "Software Engineer" }],
        }),
      }),
    }),
  }),
  GlobalWorkerOptions: { workerSrc: "" },
}));
```

**PDFParseError has both `.message` and `.code`:**
```typescript
// From textExtractor.ts:
// code: 'NO_TEXT' | 'PASSWORD_PROTECTED' | 'CORRUPTED' | 'UNKNOWN'
// Tests should assert both fields:
expect(error).toBeInstanceOf(PDFParseError);
expect(error.message).toBeTruthy();
expect(["NO_TEXT", "PASSWORD_PROTECTED", "CORRUPTED", "UNKNOWN"]).toContain(error.code);
```

**Key test scenarios:**
- Call `parseResumeText(resumeText)` — assert `ResumeData` maps `WORK HISTORY` heading to experience entries.
- Call `parseResumeText(textWithUnknownHeading)` — assert content not silently dropped.
- Call `parseResumePDF(new File([pdfBytes], "resume.pdf", { type: "application/pdf" }))` with pdfjs mocked + `mockFetch` returning parsed AI result — assert `ParseResult.success: true` and `data` has key sections.
- Call `parseResumePDF(new File([], "empty.pdf", ...))` — assert `ParseResult.success: false` and `parseStatus: 'failed'`.
- Test `parseTextWithAI` timeout: use `vi.useFakeTimers()`, advance past 120s, assert fallback to `parseResumeText()` is invoked.
- Call `splitIntoBlocks(linesWithAllCapsCompany)` if exported — assert single block; if not exported, test via `parseResumeText` with ALL-CAPS company name in experience text.
- Test `extractDateRange("Jan 2020 - Dec 2022")` → `{ startDate: "Jan 2020", endDate: "Dec 2022", current: false }` (this IS exported and already partially tested in existing `sectionParsers.test.ts` — rewrite per full-rewrite rule).

### 2.2 — Domain 5: User Journey Page Smoke Tests

**Pattern for every page** (identical structure, different page component):
```typescript
it("renders without crashing", async () => {
  render(
    <AllProviders> {/* wraps MemoryRouter + QueryClient + Theme */}
      <DashboardPage />
    </AllProviders>
  );
  await waitFor(() => {
    expect(screen.getByRole("main")).toBeInTheDocument();
  });
});
```

Create a shared `AllProviders` test wrapper in `src/test/utils/AllProviders.tsx` that wraps:
- `MemoryRouter` (with configurable `initialEntries`)
- `QueryClientProvider` (with a fresh `QueryClient` per test — `retry: false`)
- `ThemeProvider`
- `TooltipProvider` (Radix UI — required by editor and many pages)

**Zustand stores are NOT wrapped via JSX providers** — they are mocked at the module level in `src/test/mocks/zustandStores.ts` (Phase 0.6). The `AllProviders` wrapper does not need to include them. *(C1)*

```typescript
// AllProviders signature
export function renderWithProviders(ui: React.ReactNode, options?: {
  initialRoute?: string;
  authState?: Partial<AuthContextType>;
  queryClient?: QueryClient;
}): RenderResult
```

This wrapper is used by all page smoke tests and most component tests. Every page gets:
1. A **smoke test** — mounts without throwing.
2. 1–3 **interaction tests** for pages with user journeys (Dashboard, Onboarding, Upload, etc.).

### 2.3 — Domain 6: AI Studio Tool-by-Tool Tests *(C5)*

AI Studio tools are **not standalone components** — they are lazy-loaded sheet overlays (`<TailorSheet>`, `<AgenticChatSheet>`, etc.) conditionally rendered inside `AIStudioPage` via boolean state flags. 6 tools are pure navigation links.

**Two testing strategies based on tool type:**

**Sheet-based tools** (11 tools): Mount each sheet component directly with `open={true}`. Use the **actual props** from each component's interface:

```typescript
// TailorSheet actual props: { open, onOpenChange, onApplied? }
// NO resumeId prop — it reads resume from useResumeStore (mocked)
render(
  renderWithProviders(
    <TailorSheet open={true} onOpenChange={vi.fn()} />
  )
);

// JobAnalysisSheet actual props: { open, onOpenChange }
render(renderWithProviders(<JobAnalysisSheet open={true} onOpenChange={vi.fn()} />));
```

**⚠️ TailorSheet and JobAnalysisSheet have different AI call patterns:**

| Sheet | AI Call Mechanism | Mock Target |
|-------|-------------------|-------------|
| `TailorSheet` | Calls `tailorResumeWithProgress()` directly → `global.fetch` | `mockFetch` from `fetch.ts` |
| `JobAnalysisSheet` | Calls `execute()` from `useAIAction` → `analyzeResume()` | `useAIAction` global mock |
| Other sheets | Likely use `useAIAction` | `useAIAction` global mock |

**Test structure — TailorSheet (fetch-based):**
```
describe("TailorSheet", () => {
  it("renders when open=true")
  it("calls fetch with tailor-resume endpoint on submit")
  it("calls onProgress callback during tailoring")
  it("renders overallScore.before and overallScore.after after success")
  it("shows retry after transient network error")
  it("shows rate-limit error message on 429 response")
  it("disables submit button when credits are 0")
  it("aborts request when sheet is closed mid-tailor")
})
```

**Test structure — JobAnalysisSheet (useAIAction-based):**
```
describe("JobAnalysisSheet", () => {
  it("renders when open=true")
  it("calls useAIAction.execute on submit")
  it("renders match score and gap analysis after success")
  it("disables submit when credits are 0")
  it("shows error state when useAIAction returns error")
})
```

**Navigation-based tools** (6 tools — Interview, CoverLetters, ResignationLetters, QR tools): Test inside `AIStudioPage` — assert each card renders a link pointing to the correct route. No sheet to mount for these.

The **zero-credits guard** is tested per sheet by overriding `vi.mocked(useAICredits).mockReturnValue({ credits: 0, ... })` before rendering and asserting the submit/generate button has the `disabled` attribute.

---

## Phase 3 — Task C: Domains 7–10 (Interview, Portfolio, Tracker, Settings)

**Branch**: `021-task-c-domains-7-10`

### 3.1 — Domain 7: Interview & Voice Features

**Web Speech API stub** (already in `setup.ts` after Phase 0):
```typescript
// In the test file's beforeAll, further configure the stub:
const mockRecognition = {
  start: vi.fn(),
  stop: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};
vi.mocked(window.SpeechRecognition).mockImplementation(() => mockRecognition);
```

**Transcript simulation**:
```typescript
// Simulate speech recognition returning a result
const resultEvent = new Event("result");
Object.defineProperty(resultEvent, "results", {
  value: [[{ transcript: "I led a team of five engineers" }]],
});
mockRecognition.addEventListener.mock.calls
  .find(([event]) => event === "result")?.[1](resultEvent);
```

**Grading test pattern** *(C3 — useAgenticChat has its own mock)*:
```typescript
// Mock @/lib/agenticChat (the underlying lib, not a hook)
vi.mocked(sendChatMessage).mockResolvedValue({
  type: "text",
  content: JSON.stringify({
    strengths: ["Clear communication"],
    weaknesses: ["Could provide more examples"],
    communication_score: 7,
  }),
});
```
Note: `useAgenticChat` calls `sendChatMessage` from `@/lib/agenticChat` — the global `agenticChat.ts` mock (Phase 0.5) covers this. Do NOT attempt to mock `useAgenticChat` as a hook.

**ElevenLabs fallback test**:
```typescript
// Remove the ElevenLabs key from the mocked BYOK state
vi.mocked(useAIKeyHydration).mockReturnValue({ elevenLabsKey: null, ...rest });
render(<InterviewPage />);
// Assert Web Speech is used instead (no elevenlabs init call)
expect(mockElevenLabsInit).not.toHaveBeenCalled();
```

### 3.2 — Domain 8: Portfolio & Public Profile

Existing `PortfolioEditorPage.test.tsx` and `PublicPortfolioPage.test.tsx` are **deleted and rewritten** — not extended. New tests cover:
- Theme switching via form state assertion (not visual diff).
- Username conflict handled via mocked Supabase returning a conflict error.
- `is_public: false` portfolio: assert 404 component or "private profile" renders at `/p/username`.

### 3.3 — Domain 9: Application Tracker

`Date.now()` mocked via `vi.setSystemTime(new Date("2026-01-01"))` to test overdue indicators deterministically. Status transitions tested by asserting the Supabase `update` mock was called with the correct `status` value.

### 3.4 — Domain 10: Settings & BYOK

**BYOK failing placeholder** (committed intentionally):
```typescript
it.todo("BYOK key is encrypted before storage — implement after 021-byok-encryption work item");
// OR:
it("BYOK key is encrypted before storage", () => {
  // TODO: 021-byok-encryption — encryption utility does not exist yet
  expect(true).toBe(false); // intentional failure
});
```

The test is **committed as-is**. It appears in coverage output as a known gap. The work item `021-byok-encryption` is tracked separately.

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|-----------|
| `tailorResumeWithProgress` uses `global.fetch` directly — `useAIAction` mock has no effect | **Confirmed** | Mock `global.fetch` via `fetch.ts` (Phase 0.7); per-test overrides control success/error/rate-limit/retry scenarios |
| `TailorSheet` calls `tailorResumeWithProgress()` directly, not `useAIAction` — wrong mock target | **Confirmed** | TailorSheet tests mock `global.fetch`; JobAnalysisSheet tests mock `useAIAction` (it uses `execute()`) |
| `TailorSheet` has no `resumeId` prop — plan had wrong prop name | **Confirmed** | Actual props: `{ open, onOpenChange, onApplied? }`. Resume data comes from `useResumeStore` (mocked via `zustandStores.ts`) |
| `SuperTailorResult` fields: plan said `score_before`/`score_after` — wrong names | **Confirmed** | Correct path: `result.overallScore.before` / `result.overallScore.after` |
| `missingKeywords` field name: spec said `missing_keywords` — wrong | **Confirmed** | `ATSParsedResult` uses camelCase: `result.missingKeywords` |
| `pdfjs-dist` in jsdom — `extractTextFromPDF` throws on import | **Confirmed** | Mock `pdfjs-dist` at module level with `vi.mock("pdfjs-dist", ...)` pattern (Phase 2.1) |
| `parseTextWithAI` uses `global.fetch` to hit `/functions/v1/parse-resume` — global fetch mock required | **Confirmed** | Covered by `fetch.ts` global mock; test 120s timeout fallback using `vi.useFakeTimers()` |
| `extractSections` and `splitIntoBlocks` not exported | **Confirmed** | Test via `parseResumeText()` as proxy; `extractDateRange` IS exported and directly testable |
| `EditorPage` requires 3 Zustand stores + 15 hooks | **Confirmed** | Zustand stores mocked in `zustandStores.ts`; all Supabase hooks covered by global Supabase mock |
| `useAuth` wraps `AuthContext` — mocking Kinde directly has no effect | **Confirmed** | Mock `@/hooks/useAuth` directly via `auth.ts` *(C2 resolved)* |
| `useAgenticChat` does not use `useAIAction` | **Confirmed** | Mock `@/lib/agenticChat` via `agenticChat.ts` *(C3 resolved)* |
| Zustand store mock field names may not match actual slices | Medium | Read each store file before writing `zustandStores.ts`; confirm exact field names |
| `InterviewPage` references `navigator.mediaDevices.getUserMedia` — throws in jsdom | Medium | Add `navigator.mediaDevices = { getUserMedia: vi.fn().mockResolvedValue(null) }` to interview test setup |
| `AllProviders` missing `TooltipProvider` causes Radix UI errors | Medium | Include `TooltipProvider` in AllProviders (confirmed required) |
| `tailorResumeWithProgress` retry uses `setTimeout(2000)` — tests need `vi.useFakeTimers()` | Medium | Use `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync(2500)` to advance past retry delay |
| Test suite exceeds 5-minute runtime with 60+ test files | Low | Keep smoke tests minimal; use `vitest --pool=threads` if needed |

---

## Open Questions

All pre-implementation questions (Q1–Q6) were resolved by the `/speckit.analyze 021` codebase analysis. Decisions are recorded in the Risk Assessment above and reflected in Phase 0 mock additions.

1. ~~`AllProviders` composition~~ → **Resolved**: EditorPage uses 3 Zustand stores + 15 hooks. Stores mocked at module level via `zustandStores.ts`. *(C1)*
2. ~~AI Studio tool locations~~ → **Resolved**: 11 lazy-loaded sheet components in `src/components/editor/` + 6 navigation links. Sheets tested with `open={true}`. *(C5)*
3. ~~Kinde import path~~ → **Resolved**: Mock `@/hooks/useAuth` directly — components never import from Kinde. *(C2)*
4. ~~`useAgenticChat` architecture~~ → **Resolved**: Independent pipeline. Mock `@/lib/agenticChat` via `agenticChat.ts`. *(C3)*
5. **BYOK encryption work item**: Does `021-byok-encryption` need to be a new spec, or a task in this spec? → **Decision from user needed before Task C starts.**
6. ~~`extractSections` export status~~ → **Resolved**: `extractSections` and `splitIntoBlocks` are internal. Test via `parseResumeText()` as proxy. `extractDateRange` IS exported and directly testable.
7. ~~`tailorResumeWithProgress` uses fetch or useAIAction?~~ → **Resolved**: Direct `global.fetch` to `/functions/v1/tailor-resume`. Use `mockFetch` override per test.
8. ~~`TailorSheet` props~~ → **Resolved**: `{ open, onOpenChange, onApplied? }`. No `resumeId` prop. Resume data from `useResumeStore` (mocked).
