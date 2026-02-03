
## Goal
Fix the remaining “PDF is truncated / cuts earlier than the page-break line in preview” problem so the exported PDF matches the live preview page-break indicator on mobile, across all resume templates.

---

## What’s most likely causing the truncation (based on current code)
There are two issues in the current pagination logic that can still produce “truncated” pages even after the earlier indicator + scaling fixes:

### 1) Manual breaks currently disable smart auto-pagination
In `findSmartBreakPositions()` (in `src/lib/pdfGenerator.ts`), when `manualBreakSections` is provided, the function returns only the manual section-break positions and does **not** add additional breaks inside long sections.

If the user forces a break “after Experience”, but Experience itself spans multiple pages, the generator tries to place all of that content into a single PDF page slice. That overflow will look like truncation/cropping.

### 2) Break calculations rely on `getBoundingClientRect()` (transform-sensitive)
`findSmartBreakPositions()` measures block and section positions using `getBoundingClientRect()`. On `/preview`, the resume container is a `motion.div` with scale animation (`scale: 0.95 → 1`). Transforms affect `getBoundingClientRect()` but **do not** affect `scrollHeight/offsetHeight`.

So the break offsets can be computed in one coordinate system (transformed rects) but used in another (layout px). On mobile this can shift break positions enough to split a job entry unexpectedly.

### (Optional but important) Footer overlay space
The PDF footer (page numbers + branding) is drawn on top of the page at the bottom. If we let content run all the way to the bottom edge, the footer can visually “truncate” the last line. The pagination logic should reserve a small bottom “footer safe area” for consistent results.

---

## Implementation changes (readable + template-safe)

### A) Make manual breaks “forced boundaries” but still allow auto breaks inside them
Update `findSmartBreakPositions()` so manual mode works like this:

- Compute the “forced” break positions (after selected sections).
- Split the document into segments:  
  `[0 → forced1]`, `[forced1 → forced2]`, …, `[lastForced → totalHeight]`
- Inside each segment:
  - run the same smart auto-break logic as “Auto mode” (using `[data-break-avoid]`) to add additional breaks when needed.
- Always include the forced breaks in the final returned list.

Result: manual breaks remain honored, but long sections never overflow a single page slice.

**Files**
- `src/lib/pdfGenerator.ts` (function: `findSmartBreakPositions`)

---

### B) Replace `getBoundingClientRect()` measurements with transform-agnostic layout offsets
Still in `findSmartBreakPositions()`:
- Stop using `getBoundingClientRect()` for block positions and manual section break positions.
- Compute each block’s top/bottom relative to the container using layout-based metrics:
  - a helper that walks `offsetParent` to compute a stable `relativeTop`
  - `bottom = relativeTop + offsetHeight`

This makes preview indicator and PDF export consistent even when transforms/animations are present (mobile-first and framer-motion-safe).

**Files**
- `src/lib/pdfGenerator.ts` (function: `findSmartBreakPositions`)

---

### C) Reserve a footer “safe area” in pagination and in the indicator (prevents bottom-line truncation)
Introduce a constant like:
- `FOOTER_RESERVED_PT = 44` (enough for “Page X of Y” + branding)

Then:
- Use `PRINTABLE_PAGE_HEIGHT = PAGE_HEIGHT - FOOTER_RESERVED_PT`
- Compute `sourceHeightPerPage` based on `PRINTABLE_PAGE_HEIGHT` instead of full `PAGE_HEIGHT`

Apply this consistently in:
1) `generatePDF()` break calculation
2) `PageBreakIndicator` break calculation (so the preview line matches what can actually fit above the footer)

**Files**
- `src/lib/pdfGenerator.ts` (function: `generatePDF`)
- `src/components/editor/PageBreakIndicator.tsx`

---

## Concrete code-level steps (what will be edited)

### 1) `src/lib/pdfGenerator.ts`
- Refactor `findSmartBreakPositions()`:
  - Add helpers:
    - `getRelativeTop(element, container)` using `offsetTop` + `offsetParent` walking
    - `getBlockBounds(element, container)` returning `{top, bottom}`
  - Build:
    - `forcedBreaks` from `[data-section="..."]` bottoms
    - `blocks` from `[data-break-avoid]` bounds
  - Add an internal function `computeAutoBreaks(segmentStart, segmentEnd)` that:
    - iteratively chooses the next break at `start + sourceHeightPerPage`
    - adjusts if it cuts a block (move before/after using the existing “waste” thresholds)
    - ensures monotonic progress and never exceeds the segment end
  - Return combined breaks:
    - `auto breaks in segment` + `forced break` + `auto breaks in next segment` …

- Update `generatePDF()` to use footer-safe height:
  - `const printableHeight = PAGE_HEIGHT - FOOTER_RESERVED_PT;`
  - `const sourceHeightPerPage = printableHeight / globalScaleFactor;`

This ensures:
- No overflow slices
- No footer overlap on bottom lines
- Break lines match between preview and export

### 2) `src/components/editor/PageBreakIndicator.tsx`
- Use the same footer-safe printable height:
  - `const printableHeight = PAGE_HEIGHT - FOOTER_RESERVED_PT;`
  - `const sourceHeightPerPage = printableHeight / scaleFactor;`

---

## Testing checklist (mobile-first + all templates)
1) On `/preview` (mobile viewport):
   - Auto mode ON: export Resume PDF and verify:
     - page break lines match exported page boundaries
     - no job entry is split mid-block
     - no “truncated” bottom line
2) Manual mode:
   - Select “break after Experience” (and other sections)
   - Export and verify:
     - Experience spanning multiple pages still paginates correctly
     - Forced breaks still occur at the chosen section boundaries
3) Repeat quick exports on at least 3 templates:
   - Modern, Classic, Creative (Creative is most layout-different)
4) Verify Combined PDF export (resume + cover letter) still looks correct.

---

## Expected outcome
- The preview page-break indicator and the exported PDF will match on mobile.
- Manual breaks will no longer cause overflow truncation.
- Auto breaks will reliably avoid cutting `data-break-avoid` blocks.
- Footer will never visually “cut” content at the bottom.

---

## Notes / non-goals (for now)
- We’re keeping the image-based resume export (html2canvas) since it preserves template styling.
- If you later want “true text PDF” export (selectable text), that’s a separate larger feature requiring font embedding and layout reflow.
