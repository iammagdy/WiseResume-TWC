

# Add Real-Time Keyword Optimization Suggestions While Editing

## Overview

The existing `useATSSuggestions` hook currently only generates `missing_keyword` suggestions (comparing job description keywords against resume content). The `ATSSuggestion` interface already defines `weak_verb`, `add_metrics`, and `formatting` types, but they are never produced client-side. This plan adds real-time, client-side detection for these additional suggestion types so users get actionable tips as they type -- no AI call required.

## What Changes

### File: `src/hooks/useATSSuggestions.ts`

Expand the `useMemo` block (lines 111-147) that computes `suggestions` to also detect:

1. **Weak verbs** (`weak_verb` type, `experience` section only)
   - Scan each experience bullet/description for lines starting with passive voice ("responsible for", "helped with", "assisted in", etc.) using the same patterns already in `useResumeNudges.ts`
   - Generate a suggestion like: "Use strong action verbs instead of 'responsible for'"
   - Priority: `medium`

2. **Missing metrics** (`add_metrics` type, `experience` section only)
   - Detect experience entries whose description lacks any numbers (`/\d+/`)
   - Generate a suggestion like: "Add quantifiable results (e.g., 'increased sales by 20%')"
   - Priority: `medium`

3. **Formatting issues** (`formatting` type, any section)
   - Detect overly long bullet points (>150 characters without line breaks) in experience descriptions
   - Detect summaries exceeding 500 characters (may hurt ATS parsability)
   - Priority: `low`

These suggestions appear **without a job description** (unlike keyword suggestions which require one). They are computed purely client-side via `useMemo`, so they update instantly as the user types.

### File: `src/components/editor/ATSInlineSuggestions.tsx`

1. Update the component to also render when there is no job description but content-quality suggestions exist
2. Change the header label from "ATS Tips" to a contextual label: "ATS Tips" when job description is present, "Writing Tips" otherwise
3. Add type-specific icons: use `Zap` for `weak_verb`, `Info` for `add_metrics`, keep existing priority-based icons for keywords

### File: `src/pages/EditorPage.tsx`

Remove the `{jobDescription && ...}` guard around `ATSInlineSuggestions` for the `experience` and `summary` sections so content-quality suggestions appear even without a job description. The component itself will return `null` when there are no suggestions.

## Technical Details

- All new detections reuse the passive-verb list and metrics regex already defined in `useResumeNudges.ts`. To avoid duplication, extract `PASSIVE_STARTERS`, `hasPassiveVerbs`, and `hasMetrics` into a shared `src/lib/contentAnalysis.ts` utility and import from both hooks.
- Cap content-quality suggestions at 3 per section (separate from the 5-per-section keyword cap) to avoid overwhelming the UI.
- Suggestions are deduplicated by `id` pattern: `{section}-{type}-{index}`.
- No new dependencies, no API calls, no database changes.

## File Summary

| File | Change |
|------|--------|
| `src/lib/contentAnalysis.ts` | **New** -- shared helpers: `PASSIVE_STARTERS`, `hasPassiveVerbs`, `hasMetrics`, `hasLongBullets` |
| `src/hooks/useATSSuggestions.ts` | Add `weak_verb`, `add_metrics`, `formatting` detection in `useMemo` |
| `src/hooks/useResumeNudges.ts` | Import shared helpers from `contentAnalysis.ts` instead of inline definitions |
| `src/components/editor/ATSInlineSuggestions.tsx` | Contextual header label, render without job description |
| `src/pages/EditorPage.tsx` | Remove `{jobDescription && ...}` guard on experience/summary `ATSInlineSuggestions` |

