
# Tailor Tool: UX/UI Audit and Fixes

## Issues Found

### 1. Score Comparison only shows 4 sections, ignores Projects/Certifications/Awards
**File:** `src/components/editor/tailor/ScoreComparison.tsx`
- `SCORE_BREAKDOWN` is hardcoded to only 4 sections: Skills, Experience, Summary (labeled "Keywords"), Education (labeled "ATS Ready")
- Projects, Certifications, and Awards scores are never shown in the breakdown
- `effectiveAfterScore` divides by hardcoded `4` instead of the actual number of available sections
- The labels "Keywords" for Summary and "ATS Ready" for Education are misleading -- users won't understand what those mean

**Fix:** Add Projects, Certifications, Awards to `SCORE_BREAKDOWN` (conditionally, only when the AI returned scores for them). Update the divisor to use the actual section count. Rename misleading labels to "Summary" and "Education".

### 2. Effective score calculation in TailorSheet uses hardcoded `totalSections = 6`
**File:** `src/components/editor/TailorSheet.tsx` (line 567)
- `totalSections` is hardcoded to 6, but there are now 7 sections (with awards)
- This makes the effective score preview inaccurate

**Fix:** Change to `totalSections = 7` or better, dynamically compute from available sections.

### 3. Re-tailor intensity toggles are too small for touch targets
**File:** `src/components/editor/TailorSheet.tsx` (lines 716-724)
- The `ToggleGroupItem` components in the success header use `h-7 px-1.5` which is well below the 44px minimum touch target
- The Re-tailor button uses `h-7 min-h-0` which explicitly overrides the touch target minimum

**Fix:** Increase to `min-h-[44px]` and widen the tap area.

### 4. "Retry Score" and "Use Your Own Key" buttons miss touch target minimum
**File:** `src/components/editor/TailorSheet.tsx` (lines 784-791)
- Both use `h-8` (32px) which is below the 44px minimum

**Fix:** Change to `min-h-[44px]`.

### 5. CollapsibleTrigger "Preview changes" button misses touch target
**File:** `src/components/editor/tailor/SectionChangeCard.tsx` (line 208)
- The `py-2` produces a button height of roughly 32px -- below 44px minimum

**Fix:** Change to `min-h-[44px]`.

### 6. No haptic feedback on major interactive elements
Per project guidelines, every button must trigger `haptics.light()`. The following are missing haptics:
- Section toggle checkboxes
- Preview/Hide expand buttons
- Tab buttons (Changes/Intel/Skills/Prep)
- Apply and Discard CTA buttons
- Re-tailor button

**Fix:** Add `haptics.light()` on key interactions (Apply, Discard, tab switch, Re-tailor).

### 7. "Or paste manually" toggle has no touch target sizing
**File:** `src/components/editor/tailor/JobUrlParser.tsx` (line 130-137)
- Plain `<button>` with no min-height, very small text (`text-xs`)

**Fix:** Add `min-h-[44px]` and `active:scale-95`.

### 8. "Use URL instead" link has no touch target
**File:** `src/components/editor/tailor/JobUrlParser.tsx` (lines 186-195)
- Same issue as above

**Fix:** Add `min-h-[44px]`.

### 9. Skill suggestion "Add All Critical" button too small
**File:** `src/components/editor/tailor/SmartSkillSuggestions.tsx` (line 119)
- Uses `h-7` (28px)

**Fix:** Change to `min-h-[44px]`.

### 10. Missing ARIA labels on checkbox toggles and expand buttons
- Section checkboxes in `SectionChangeCard` have an `id`/`htmlFor` pair but no `aria-label` describing the action
- The tab buttons have no `role="tab"` or `aria-selected` attributes

**Fix:** Add `aria-label` to the collapsible trigger and ensure tab semantics.

---

## Files to Change

| File | Changes |
|------|---------|
| `src/components/editor/tailor/ScoreComparison.tsx` | Add Projects/Certifications/Awards to breakdown, fix divisor, rename labels |
| `src/components/editor/TailorSheet.tsx` | Fix `totalSections` to 7, enlarge re-tailor toggles and retry buttons to 44px, add haptics on Apply/Discard/Re-tailor |
| `src/components/editor/tailor/SectionChangeCard.tsx` | Add `min-h-[44px]` to collapsible trigger, add `aria-label` |
| `src/components/editor/tailor/JobUrlParser.tsx` | Add `min-h-[44px]` and `active:scale-95` to text-button toggles |
| `src/components/editor/tailor/SmartSkillSuggestions.tsx` | Fix "Add All Critical" button height |

---

## Technical Details

### ScoreComparison fix
The `SCORE_BREAKDOWN` array will become dynamic, built from the `sectionScores` object keys that exist. The `effectiveAfterScore` divisor will use `Object.keys(sectionScores).length` instead of hardcoded 4.

### Haptics integration
Import `Haptics` from `@capacitor/haptics` and call `Haptics.impact({ style: ImpactStyle.Light })` on Apply, Discard, Re-tailor, and tab switches. Wrap in try/catch since it's a no-op on web.

### Touch target pattern
All interactive elements below 44px will get `min-h-[44px]` added. For inline toggle groups, we'll use `min-h-[44px]` on each item while keeping compact visual styling with padding.
