# Implementation Plan: 012-branding-cleanup

**Branch**: `fix/analysis-gaps` | **Date**: 2026-03-13 | **Spec**: [012-branding-cleanup/spec.md](file:///m:/Repo/wiseresume-74945019/specs/012-branding-cleanup/spec.md)

## Summary
Remove all prohibited branding (Lovable, Bolt, WiseUniverse) from the codebase and sample data in accordance with `BRANDING.md` and `CONSTITUTION.md`. Defer high-risk infrastructure changes to `Urgent by MEGZ.md`.

## Technical Context
**Language/Version**: TypeScript, React, Deno (Edge Functions)
**Primary Dependencies**: React, Supabase, Lucide React
**Storage**: Supabase DB (Sample Data)
**Testing**: Vitest, RTL
**Target Platform**: Web (resume.thewise.cloud)
**Project Type**: Full-stack Web Application

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Governance First: All changes aligned with `project-governance/`.
- [x] Branding: No new code or docs will use prohibited names.
- [x] Security: Deferring environment variable renames to avoid live app disruption.

## Project Structure

### Documentation (this feature)
```text
specs/012-branding-cleanup/
├── plan.md              # This file
├── research.md          # Completed findings
├── data-model.md        # UI Mapping types
└── quickstart.md        # Verification steps
```

### Source Code
```text
src/
├── components/settings/ # AISettingsSheet
├── lib/                 # templateData (Sample Data)
└── store/               # aiHealthStore (State keys)

supabase/functions/
├── _shared/             # aiClient, cors
└── [functions]/         # Specific logic updates
```

## Proposed Changes

### [Component] Sample Data
#### [MODIFY] [templateData.ts](file:///m:/Repo/wiseresume-74945019/src/lib/templateData.ts)
- Replace "Wise Megz" with "Wise Portfolio".
- Replace `megz@wiseuniverse.ai` with `contact@thewise.cloud`.

### [Component] UI State & Mapping
#### [MODIFY] [aiHealthStore.ts](file:///m:/Repo/wiseresume-74945019/src/store/aiHealthStore.ts)
- Alias `lovable` to `wise-ai` in UI labels. (Backend rename deferred).

#### [MODIFY] [AISettingsSheet.tsx](file:///m:/Repo/wiseresume-74945019/src/components/settings/AISettingsSheet.tsx)
- Update provider labels to "WiseResume AI".

### [Component] Edge Functions (Non-Breaking)
#### [MODIFY] [_shared/cors.ts](file:///m:/Repo/wiseresume-74945019/supabase/functions/_shared/cors.ts)
- Add `resume.thewise.cloud` as primary origin.
