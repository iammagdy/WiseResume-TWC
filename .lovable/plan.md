
# Tailor Tool: 7 Improvements Implementation Plan

## Overview

This plan adds seven enhancements to the Smart Tailor tool: inline word-level diffs in section previews, a sticky bottom CTA, Zustand-persisted results, editable AI output, Projects/Certifications support, a quick re-tailor button, and auto-save of partial results to localStorage.

---

## Change 1: Inline Word-Level Diffs in Section Previews

Currently, the SectionChangeCard previews show only the new text. We will use the existing `diffText` and `compareSkills` utilities from `src/lib/diffUtils.ts` to render inline diffs with red strikethrough for removed text and green highlight for added text.

**File:** `src/components/editor/tailor/SectionChangeCard.tsx`
- Accept new optional props: `originalText?: string` and `originalSkills?: string[]`
- Create an `InlineDiff` sub-component that calls `diffText()` and renders `<span>` elements with appropriate styling

**File:** `src/components/editor/TailorSheet.tsx`
- Pass `originalResume.summary`, `originalResume.skills`, etc. as props to each `SectionChangeCard` so diffs can be computed

**Diff rendering styles:**
- Removed: `bg-red-500/15 text-red-600 line-through`
- Added: `bg-green-500/15 text-green-600`
- Unchanged: normal text

---

## Change 2: Sticky CTA Button

The "Apply" and "Discard" buttons currently sit at the bottom of a long scrollable area and are easy to miss.

**File:** `src/components/editor/TailorSheet.tsx`
- Move the Apply/Discard button group out of the scrollable `div` and place it in a fixed-position footer inside the SheetContent
- Use `sticky bottom-0` with a glass background (`bg-background/80 backdrop-blur-md border-t`) and safe-area padding (`pb-safe`)
- Reduce the scrollable area height to account for the sticky footer (~60px)

---

## Change 3: Persist Tailor Results in Zustand

Currently `tailorResult`, `originalResume`, `parsedJobInfo`, `enabledSections`, `intensity`, and `jobUrl` are local `useState` -- closing the sheet loses everything.

**File:** `src/store/resumeStore.ts`
- Add new state fields:
  - `pendingTailorResult: SuperTailorResult | null`
  - `pendingTailorOriginal: ResumeData | null`
  - `pendingTailorJobInfo: { title: string; company: string } | null`
  - `pendingTailorSections: TailorSectionId[]`
  - `pendingTailorIntensity: TailorIntensity`
  - `pendingTailorJobUrl: string | null`
- Add setter `setPendingTailor(data)` and `clearPendingTailor()`
- These fields are persisted via the existing `persist` middleware

**File:** `src/components/editor/TailorSheet.tsx`
- On successful tailor, call `setPendingTailor(...)` instead of only `setTailorResult(...)`
- On sheet open, hydrate local state from Zustand if `pendingTailorResult` exists
- On apply or discard, call `clearPendingTailor()`

---

## Change 4: Editable Preview

Users currently cannot tweak the AI-generated text before applying.

**File:** `src/components/editor/tailor/SectionChangeCard.tsx`
- Add an "Edit" icon button in the preview panel
- When editing is active, replace the preview text with a `<textarea>` (for summary/descriptions) or editable tag list (for skills)
- On blur or "Done", call a new `onEdit(sectionId, newValue)` callback prop

**File:** `src/components/editor/TailorSheet.tsx`
- Add `handleEditSection(sectionId, newValue)` that updates the local `tailorResult` state via `handleUpdateTailorResult`
- For summary: replace `tailorResult.summary`
- For skills: replace `tailorResult.skills`
- For experience: update the relevant entry's description/achievements

---

## Change 5: Tailor Projects and Certifications

The edge function and frontend currently only handle summary, skills, experience, and education.

**File:** `src/types/resume.ts`
- Extend `TailorSectionId` to include `'projects' | 'certifications'`
- Add `projects?: Project[]` and `certifications?: Certification[]` to `SuperTailorResult`

**File:** `supabase/functions/tailor-resume/index.ts`
- Add Projects and Certifications data to the `userPrompt` string
- Add `projects` and `certifications` arrays to the required JSON output schema in the prompt
- Add default fallbacks for these fields in the response parsing

**File:** `src/components/editor/TailorSheet.tsx`
- Add `SECTION_LABELS` entries for projects and certifications
- Add two new `SectionChangeCard` components for these sections
- Include them in `enabledSections` default state
- Merge them in `handleApplyChanges`

**File:** `src/store/resumeStore.ts`
- Update `restoreTailorVersion` to also restore projects and certifications

---

## Change 6: Quick Re-Tailor Button

After results are shown, users should be able to adjust intensity and re-run without resetting everything.

**File:** `src/components/editor/TailorSheet.tsx`
- Add a "Re-tailor" button in the results header area (next to the success banner)
- Clicking it keeps the job description and parsed info but re-runs `handleTailor()` with the current intensity
- Add a small intensity toggle inline in the results view so users can switch before re-tailoring
- The button shows a `RefreshCw` icon with text "Re-tailor"

---

## Change 7: Auto-Save Partial Results to localStorage

Protect against network drops or accidental tab closes during the tailoring process.

**File:** `src/components/editor/TailorSheet.tsx`
- After `tailorResult` is set, also write a cache entry to `localStorage` under key `wr-tailor-cache-{resumeId}`
- The cache stores: `{ tailorResult, jobDescription, parsedJobInfo, intensity, jobUrl, timestamp }`
- On sheet open, check for a cache entry. If found and less than 1 hour old, offer to restore it with a small banner: "You have unsaved tailor results. Restore?"
- On apply or discard, delete the cache entry
- This is separate from Zustand persistence (Change 3) -- this is a safety net for browser crashes

---

## Files Changed Summary

| File | Change |
|------|--------|
| `src/types/resume.ts` | Extend `TailorSectionId`, add projects/certifications to `SuperTailorResult` |
| `src/store/resumeStore.ts` | Add `pendingTailor*` state fields for persistence |
| `src/components/editor/TailorSheet.tsx` | Sticky CTA, pass diff props, editable sections, re-tailor button, projects/certs cards, Zustand hydration, localStorage cache |
| `src/components/editor/tailor/SectionChangeCard.tsx` | Inline diff rendering, editable mode with textarea |
| `supabase/functions/tailor-resume/index.ts` | Add Projects + Certifications to AI prompt and response parsing |

---

## Technical Notes

- The `diffText()` function from `src/lib/diffUtils.ts` already implements LCS-based word-level diffing -- no new algorithm needed
- `compareSkills()` already returns `{ added, removed, unchanged }` -- perfect for color-coded skill badges
- The sticky footer uses `sticky bottom-0` inside the SheetContent rather than `fixed` to avoid z-index conflicts with the sheet overlay
- localStorage cache uses a 1-hour TTL to prevent stale results from confusing users
- The edge function prompt change adds ~200 tokens to the input, well within the 8000 maxTokens budget
