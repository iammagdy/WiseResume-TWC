
## Goal
Fix the “unscrollable” behavior across the app (especially bottom sheets), including:
- Edit Profile sheet
- Default Template / Templates sheet (screenshot)
- Any other sheets using the same shared `SheetContent` component

## What’s actually causing the issue (root cause)
Your bottom sheets are rendered via the shared component `src/components/ui/sheet.tsx`.

Right now:
- The **Radix Dialog Content element** (`SheetPrimitive.Content`) is **not a flex column**, so children that rely on `flex-1` + `overflow-y-auto` don’t get a constrained height context.
- We added flex styling to an **inner wrapper** (`<div className="pt-4 flex ... flex-1">`), but since the parent isn’t a flex container, `flex-1` there doesn’t reliably establish the expected scrollable region.

This is why multiple “pages” that are actually *bottom sheets* (Templates, Edit Profile, etc.) become unscrollable on mobile.

## Scope: “whole app” audit approach
We’ll fix the shared sheet layout first (global fix), then normalize the most visible sheets (Templates + Edit Profile) to use the same reliable pattern, and finally audit remaining bottom sheets for anti-patterns that can still break scrolling.

---

## Implementation plan

### 1) Make bottom sheets flex-based at the shared component level (global fix)
**File:** `src/components/ui/sheet.tsx`

**Changes:**
1. When `side === "bottom"`, apply these layout guarantees to `SheetPrimitive.Content`:
   - `flex flex-col`
   - `min-h-0` (critical for nested scrolling in flex layouts)
   - `overflow-hidden` (prevents the content region from expanding beyond the set height and keeps scroll inside the intended child)

2. Update the “children wrapper” `<div>` so it:
   - Remains `pt-4` (drag indicator spacing)
   - Becomes `flex flex-col flex-1 min-h-0` so sheet bodies can use `flex-1 overflow-y-auto`

**Result:**
Any bottom sheet that uses:
- Header (shrink-0)
- Body (flex-1 overflow-y-auto min-h-0)
- Footer (shrink-0)
…will scroll correctly without per-sheet hacks.

---

### 2) Fix Templates sheet specifically (DefaultTemplateSheet)
This is the UI in your screenshot.

**File:** `src/components/settings/DefaultTemplateSheet.tsx`

**Current pattern:**
- Uses `overflow-y-auto flex-1`, but the shared sheet wasn’t a flex column, so it doesn’t scroll.

**Update to a consistent layout:**
- Ensure:
  - Header has `shrink-0`
  - Body uses `className="flex-1 min-h-0 overflow-y-auto pb-safe"` (or `pb-6 pb-safe` depending on spacing needs)

This ensures the grid scrolls, not the whole sheet, and the close button remains accessible.

---

### 3) Fix Template selector sheet used in Editor flows (if applicable)
Even if your “Templates page” is the Settings one, the editor also has a template picker sheet.

**File:** `src/components/editor/TemplateSelector.tsx`

**Current risk factors:**
- Uses a grid with `overflow-y-auto max-h-[calc(...)]` which can be brittle on mobile (especially with safe areas, dynamic viewport, and varying header heights).

**Update:**
- Convert to the same reliable pattern:
  - Make the sheet body a `flex-1 min-h-0 overflow-y-auto`
  - Keep the grid inside that body without `max-h-[calc(...)]`

This prevents future scroll regressions and makes the sheet responsive to content changes (ATS banner, recommendations text, etc.).

---

### 4) Audit and harden other bottom sheets across the app
**Files (from search):**
- `src/components/editor/CompareSheet.tsx`
- `src/components/editor/JobAnalysisSheet.tsx`
- `src/components/editor/tailor/MultiJobCompareSheet.tsx`
- `src/components/editor/tailor/TailorHistorySheet.tsx`
- `src/components/settings/PDFDefaultsSheet.tsx`
- `src/components/settings/DataExportSheet.tsx`
- `src/components/settings/LinkedInImportSheet.tsx`
- `src/components/settings/BiometricSetupSheet.tsx`
- `src/components/settings/BiometricTimeoutSheet.tsx`
- `src/components/settings/ElevenLabsKeySheet.tsx`
- and any other `SheetContent side="bottom"` matches

**What we’ll check/fix:**
- If a sheet expects internal scrolling:
  - Ensure it has a “body” region with `flex-1 min-h-0 overflow-y-auto`
- Remove/avoid “brittle” height math (`max-h-[calc(...)]`) when a flex body is enough
- Ensure headers/footers use `shrink-0`
- Ensure no parent wrapper uses `overflow-hidden` in a way that blocks scrolling (we’ll keep `overflow-hidden` on the sheet container but only when internal scroll is correctly set up)

This makes the fix consistent “app-wide” instead of one-off.

---

## QA checklist (must-do)
1. Settings → **Edit Profile**:
   - Can scroll through all fields
   - Footer Save/Cancel stays visible
2. Settings → **Default Template**:
   - Can scroll through templates grid (as in screenshot)
3. Editor → **Template picker** (if used):
   - Can scroll template list
4. Spot-check at least one other bottom sheet (e.g., Data Export) to ensure no regression.

---

## Expected outcome
- Bottom sheets (Edit Profile, Templates, and others) become reliably scrollable on mobile.
- No more “looks like it should scroll but doesn’t” behavior caused by flex context not being established.
- Reduced need for per-sheet height hacks, making future UI work safer.

## Files to change
- `src/components/ui/sheet.tsx` (core fix)
- `src/components/settings/DefaultTemplateSheet.tsx` (templates sheet)
- `src/components/editor/TemplateSelector.tsx` (editor template sheet)
- Potential small fixes across other bottom-sheet components to standardize the “header/body/footer” flex + `min-h-0` pattern.
