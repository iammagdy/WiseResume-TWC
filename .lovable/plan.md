

## Feature: Dedicated AI Enhance Sheet

### Overview

Create a new `AIEnhanceSheet` component that provides section-by-section writing enhancement (power verbs, metrics, conciseness) without requiring a job description. Wire it into the AI Studio page to replace the current "Enhance" button that incorrectly opens the Tailor sheet.

### Changes

**File 1: `src/components/editor/ai/AIEnhanceSheet.tsx` (NEW)**

A bottom sheet with the following layout:

- **Header**: "AI Enhance" title with Sparkles icon and `AIProviderVia` badge
- **Enhancement Mode Selector**: A row of tappable chips (min 44px height) for the action types:
  - "Improve Writing" (`improve`) -- default selected
  - "Add Metrics" (`add_metrics`)
  - "Power Bullets" (`generate_bullets`)
  - "Make Concise" (`shorten`)
  - "Expand Detail" (`expand`)
- **Section Selector**: List of available resume sections with checkboxes. Auto-detect which sections have content from the resume store. Sections: Summary, Experience, Skills, Education
- **"Enhance" button**: Primary gradient button, disabled if no sections selected or if enhancing. Shows spinner when loading
- **Results area**: After enhancement completes, show results per section using the existing `AIEnhanceDialog` inline pattern (original vs improved, changes badges, apply/discard per section). Each result card shows the section name, a diff view (original crossed out, improved highlighted), and individual Apply/Discard buttons
- **Props**: `open: boolean`, `onOpenChange: (open: boolean) => void`

Internal logic:
- Reads `currentResume` from `useResumeStore`
- For each selected section, calls `useAIEnhance` hook (or calls the `enhance-section` edge function directly via supabase) with the chosen action and section content
- No job description passed (the key differentiator from Tailor)
- On "Apply", updates the resume store directly via `setCurrentResume` with the improved content for that section
- Uses `useAICreditsMutations` for credit checks

**File 2: `src/pages/AIStudioPage.tsx` (EDIT)**

- Add lazy import for `AIEnhanceSheet`
- Add `showEnhance` state variable
- Change `handleSecondaryAction` case `'enhance'` from `setShowTailor(true)` to `setShowEnhance(true)` (line 101)
- Add `AIEnhanceSheet` to the Suspense render block alongside other sheets

**File 3: `src/pages/EditorPage.tsx` (EDIT -- only if Enhance is also triggered from Editor)**

- No changes needed -- the Editor page no longer has the AI bar, and users access Enhance from the Studio tab

### What Does NOT Change

- The `enhance-section` edge function -- it already supports all needed actions
- The `useAIEnhance` hook -- reused as-is
- The `AIEnhanceDialog` component -- reused for displaying results
- The Tailor sheet and all other AI tools
- Resume store, credits system, authentication
- All other pages and navigation

### Technical Notes

- The sheet iterates over selected sections sequentially (not in parallel) to avoid rate limiting on the edge function (20 req/min limit)
- Each section enhancement is independent -- user can apply/discard individually
- The `improve` action in the edge function already handles power verbs, better phrasing, and conciseness without needing a job description
- The `add_metrics` action specifically adds quantifiable achievements -- a key differentiator from Proofread (which fixes grammar) and Tailor (which requires a job description)
- Touch targets on mode chips and section checkboxes maintain 44px minimum
- Sheet uses `side="bottom"` with `className="h-[85vh]"` for mobile-friendly interaction
