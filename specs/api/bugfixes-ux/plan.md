# Implementation Plan: 013-api-bugfixes-ux

**Branch**: `api/bugfixes-ux` | **Date**: 2026-03-13 | **Spec**: [api/bugfixes-ux/spec.md](file:///m:/Repo/wiseresume-74945019/specs/api/bugfixes-ux/spec.md)

## Summary
Resolve 6 targeted bug-fix and UX polish points. Establish robust authentication bridging logic without relaxing RLS, fix false-positive resume routing, refine the UI for Deep Analyze tool feedback, fix PDF export integrity (filenames and mime types), and uplift global UI layers with consistent glassmorphism and clean bottom-edge button layout across Light and Dark themes.

## Technical Context
**Language/Version**: TypeScript, React, Deno (Edge Functions)
**Primary Dependencies**: React, Supabase, Kinde Auth, Tailwind CSS
**Storage**: Supabase DB
**Target Platform**: Web (resume.thewise.cloud)
**Project Type**: Full-stack Web Application

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Governance First: All changes aligned with `project-governance/`. Branch creation required before execution.
- [x] Security: No RLS bypassing. Application relies on user-provided `EXT_SUPABASE_JWT_SECRET` inside Supabase.
- [x] Discipline: `project-governance/CHANGELOG.md` MUST be manually updated post-implementation. Entries will strictly follow existing style and context, grouped individually by fix scope (e.g., Auth, Editor) rather than one giant entry.

## Project Structure

### Documentation (this feature)
```text
specs/api/bugfixes-ux/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 research decisions
├── data-model.md        # State enums and interface contracts
├── quickstart.md        # Manual verification guide
└── tasks.md             # Execution task list
```

### Source Code Targets
```text
src/
├── hooks/
│   ├── useAuth.tsx              # Validating token bridge integration
│   ├── useResumes.ts            # Active state sync on creation
│   └── useATSSuggestions.ts     # Analysis UI flags
├── lib/
│   ├── supabaseBridge.ts        # Refined error trapping for the global banner
│   └── pdfGenerator.ts          # Blob packaging and filename assignments
├── components/
│   ├── layout/AppShell.tsx      # Bottom action refactor & error banner logic
│   ├── editor/JobAnalysisSheet.tsx # Actionable missing JD feedback
│   └── settings/                # Injecting backdrop-blur globals
└── supabase/functions/token-exchange/ # Confirm functionality constraints 
```

## Proposed Changes

### [Phase 1: API & State Integrity]
#### [MODIFY] `src/hooks/useResumes.ts` & `src/store/resumeStore.ts`
- Ensure new resumes implicitly update the active context without demanding a full app-wide refresh before navigating.

#### [MODIFY] `src/lib/supabaseBridge.ts` & `src/components/layout/AppShell.tsx`
- Refactor the error catchment to explicitly separate backend/auth token termination (which triggers the "We couldn't connect your data" banner) from generic offline or network timeouts (represented separately).

#### [INSPECT] `supabase/functions/token-exchange/index.ts` & `src/hooks/useAuth.tsx`
- Confirm token minting structure requires configured JWT secrets and maps to valid Supabase UUID forms before fetching data from RLS columns.

### [Phase 2: UI Interactions & Export Fixes]
#### [MODIFY] `src/components/editor/JobAnalysisSheet.tsx` (and related AI sheets)
- Detach `!jobDescription` from native `disabled` HTML props on primary buttons. Allow click through to a clear `toast("Add Job Description")`.

#### [INSPECT & MODIFY] Export logic pipeline (`src/lib/pdfGenerator.ts`, Blob handlers, `PreviewPage.tsx`)
- Do not assume finding the issue immediately. Trace the export pipeline (blob creation, filename parsing, headers, response handling, download anchorage) to find the strict root-cause of missing extensions and file corruption, then fix it natively.

#### [MODIFY] `src/pages/SettingsPage.tsx` & Theme Globals
- Apply `backdrop-blur-md bg-background/60` CSS utility stacking into Dialog/Sheet primitives.
- Restructure `AppShell.tsx` bottom layout to dynamically contain the "Ask" action next to a uniformly smaller "Settings" node reducing mobile overlap.

## Verification Plan
### Automated Tests
- Execute `npm run test` suite to confirm component logic hasn't mutated under state updates.

### Manual Verification
1. **Auth & Token Exchange**: Launch app -> Provide valid Kinde login -> Validate successful token exchange -> Ensure protected data (Resumes) can be fetched without false 401/500 errors.
2. **Network Sync**: Disconnect internet. Validate standard offline banner triggers, and NOT a false backend error banner. (Keep backend/auth errors distinct).
3. **Deep Analyze**: Attempt to click Job Analysis without text -> Expect clear actionable Toast explaining exactly what is missing.
4. **UI Layout**: Resize browser to mobile format (min 375px) -> Ensure Settings/Ask buttons line up cleanly at the bottom action bar without overlapping.
5. **Export**: Export a resume locally -> Ensure a proper PDF file is downloaded, with a normal filename, valid `.pdf` extension, and no corruption.
6. **Theme Testing**: Toggle Light and Dark modes with settings sheets open -> Visually confirm contrast legibility via blurred backgrounds without overly transparent bleeding.
