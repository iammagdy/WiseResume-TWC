
## Goal
Stop “broken pages” by making the pagination engine truly understand **where each section (Summary/Experience/Education/Skills/Certifications) starts and ends**, and ensure **no job entry (or other `data-break-avoid` block) gets split across pages** unless it is physically too tall to fit on a single page.

---

## What’s happening (why it still feels overwhelming)
Today the page-break engine mostly relies on:
- `data-break-avoid` blocks (job entries, education items, etc.)
- `data-section="education"` wrappers to place **manual** breaks

This works in simple one-column layouts, but can break down when:
1. A “section end” isn’t a single clean Y-position (two-column/grid templates like Executive/Professional).
2. The algorithm decides splitting is “better” than wasting space, even if a job entry would fit perfectly on the next page.

Net effect: the system doesn’t always respect the “true end of section/page” concept the way a document editor does.

---

## Implementation approach (high confidence fix)

### 1) Make “section bounds” accurate and layout-aware
**File:** `src/lib/pdfGenerator.ts`

Add a small “layout map” step that:
- Finds all real section DOM nodes: `sourceElement.querySelectorAll('[data-section]')`
- Computes **outer bounds** for each section (top/bottom), including margins (because `offsetHeight` excludes margins)
- Computes a second list of **flow blocks** that represent anything that should never be cut in manual breaks:
  - all `[data-section]`
  - all `[data-break-avoid]`

#### Why this matters
In multi-column/grid layouts, “Education ends” may visually depend on what’s happening in the other column. We need manual breaks to end the page at a Y-position that doesn’t slice through parallel column content.

---

### 2) Fix manual breaks so they end the page at the “safe” Y-position
**File:** `src/lib/pdfGenerator.ts` (inside `findSmartBreakPositions` manual mode)

Current manual break behavior:
- break after section = `section.bottom + 8`

New behavior:
- break after section = `maxBottom + padding`, where:
  - `baseline = selectedSection.bottom`
  - `maxBottom = max( block.bottom )` for **all flow blocks** that have `block.top < baseline` (i.e., content that has “already started” above this break line)

This guarantees:
- If another column started earlier and runs longer, we won’t cut it.
- Manual breaks behave like “end the page here cleanly”.

---

### 3) Make auto-pagination never split a `data-break-avoid` block that can fit on a page
**File:** `src/lib/pdfGenerator.ts` (`computeAutoBreaksInSegment`)

Current behavior:
- If avoiding a split wastes “too much space”, the algorithm may still cut through a `data-break-avoid` block.

New behavior:
- If the cutting block’s height `<= sourceHeightPerPage`, it is **always moved to the next page** (break-before), even if it creates extra whitespace.
- Only if a block is **taller than a full page** do we allow splitting it.

This directly addresses “Job entry / bullets being split”.

---

### 4) Add “section header orphan protection” without editing every template
**File:** `src/lib/pdfGenerator.ts` (`findSmartBreakPositions`)

To avoid cases like:
- “EDUCATION” header appears at bottom of Page 1 with no education item under it

We’ll synthesize extra “keep-with-next” blocks:
- For each `[data-section]`, measure:
  - the header element (first heading inside)
  - plus the first content block (often the first `data-break-avoid` child, otherwise first meaningful child)
- Add a block covering `header.top -> firstItem.bottom` into the `blocks` array so the auto break logic won’t split them apart.

No template changes required, and it improves every template consistently.

---

### 5) Make the manual-break UI order match the actual template order (reduces confusion)
**File:** `src/pages/PreviewPage.tsx` (+ small update to `PageBreakSheet.tsx` if needed)

Right now `availableSections` is built from resume data in a fixed order (`summary, experience, education, skills...`), which can mismatch the visual/template order (especially for multi-column templates).

Update PreviewPage to:
- After render, read the DOM order of `[data-section]` in the preview
- Build `availableSections` in the real on-screen order (filtering by what exists)

This helps users pick “break after Education” and have it mean what they visually expect.

---

## Files expected to change
1. `src/lib/pdfGenerator.ts`
   - Add margin-aware bounds helper
   - Add section/flow block scanning
   - Improve manual forced break calculation
   - Update auto-break decision logic to never split `data-break-avoid` blocks that fit
   - Add section header orphan protection (synthetic blocks)

2. `src/pages/PreviewPage.tsx`
   - Compute `availableSections` based on template DOM order

3. (Optional minor) `src/components/editor/PageBreakSheet.tsx`
   - If needed, adjust labels/ordering display to match the new computed `availableSections`

---

## Testing checklist (what you’ll verify after implementation)
1. **Executive template**
   - Auto mode: confirm no job entry splits across pages (unless a single entry is longer than one full page).
   - Manual mode: select “break after Experience”
     - Page 2 must start cleanly at Education/Skills area with no bleed.
   - Manual mode: select “break after Education”
     - In the Executive grid area, the break should end at a “safe” point (not cutting the parallel column).

2. **Professional template (multi-column)**
   - Manual “break after Summary” should not slice the sidebar (skills/education).

3. **Preview vs Downloaded PDF**
   - Break lines in live preview must match the final PDF pagination.

---

## Success criteria
- Manual breaks behave like a real document editor: “End page here” means **nothing below that line appears on that page**, even in multi-column layouts.
- Auto pagination never splits a `data-break-avoid` job entry unless it is larger than a full page.
- Section headers are never orphaned at the bottom of a page.
