# Feature Specification: PDF Export & Pagination Audit

**Feature Branch**: `019-pdf-export-audit`
**Created**: 2026-03-19
**Status**: Draft
**Scope**: Full implementation of all 7 audit findings — Critical, High, and Medium. PDF export is the final product output and must be 100% stable.

---

## Clarification Decisions

1. **Scope**: ALL 7 bugs implemented in this spec (no deferral).
2. **Custom File Name**: Small dialog/modal after clicking "Download", before file generation starts. Pre-filled with auto-generated name.
3. **Monotonicity Fix**: Clamp to guarantee forward progress — imperfect break placement preferred over infinite loop/crash.
4. **iOS Safari**: Web version is important — fix the 60s revocation timeout.
5. **Testing**: Manual only — no Vitest unit tests.
6. **SVG Color Fix**: Apply defensive fix regardless of whether the bug is currently visible.

---

## Audit Summary

A comprehensive code audit of the PDF generation pipeline was conducted across:
- `src/lib/pdfGenerator.ts` (828 lines)
- `src/lib/html2canvasRetry.ts` (174 lines)
- `src/lib/downloadUtils.ts` (190 lines)
- `src/lib/pdfUtils.ts` (94 lines)
- `src/pages/PreviewPage.tsx`
- `src/index.css` (print media rules)

**Result**: 7 bugs found across 3 categories — Pagination, Download, and Canvas/Layout.

---

## Diagnostic Report by Category

---

### Category 1: Content Truncation & Page Breaks (Pagination)

#### PDF-001 — Break Snapping Not Monotonic (Pages Can Invert)
- **File**: `src/lib/pdfGenerator.ts` lines 514–528
- **Severity**: 🔴 Critical
- **Issue**: The sequential break-processing loop advances using `prevBreak + sourceHeightPerPage`, then snaps via `snapOne()`. However, `snapOne()` is not constrained to return a value ≥ `nextBreak` — it can return any position within the `[data-section]` or `[data-break-avoid]` element that triggered the snap. If a snap moves a break backward (closer to the top of the page than `prevBreak`), the next iteration adds `sourceHeightPerPage` from that snapped value, causing a short page — or in extreme cases a page smaller than the previous one.

  **Current code (lines 514–528)**:
  ```typescript
  let prevBreak = 0;
  for (let i = 0; i < fixedBreaks.length; i++) {
    let nextBreak = prevBreak + sourceHeightPerPage;
    if (nextBreak >= totalHeight) break;
    nextBreak = snapOne(nextBreak);   // ← can return ANY value, including < prevBreak
    result.push(nextBreak);
    prevBreak = nextBreak;
  }
  ```

- **Fix**: After `snapOne()` resolves, clamp the result so it is always strictly greater than `prevBreak` and at least `HEADING_GUARD` pixels ahead:
  ```typescript
  nextBreak = Math.max(snapOne(nextBreak), prevBreak + HEADING_GUARD);
  ```
  Additionally, if `nextBreak >= totalHeight` after snapping, break the loop instead of adding it.

---

#### PDF-002 — Canvas Crop Pages Silently Skipped
- **File**: `src/lib/pdfGenerator.ts` lines 331–352
- **Severity**: 🟠 High
- **Issue**: When cropping the canvas per page, `sourceH` is calculated as:
  ```typescript
  const sourceH = Math.min(
    Math.round(pageContentHeight * SCALE),
    canvas.height - sourceY
  );
  if (sourceH <= 0) continue;   // ← silently skips the page
  ```
  If the canvas is shorter than expected (truncated capture), later pages have `sourceY` beyond the canvas boundary, yielding `sourceH ≤ 0`. These pages are silently skipped — the user receives a PDF with fewer pages than the resume has content, with no warning.

- **Fix**: Replace the silent `continue` with a logged warning and an early return/throw that surfaces as a user-facing error:
  ```typescript
  if (sourceH <= 0) {
    console.warn(`[PDF] Page ${pageNum + 1} has zero height — canvas may be truncated.`);
    break;   // Stop page loop; PDF will be partial but not corrupt
  }
  ```
  Also promote the existing canvas-height validation (currently `console.warn`) to throw a `PdfGenerationError` with code `'TRUNCATED_CANVAS'` so the retry logic in `PreviewPage.tsx` can catch it.

---

#### PDF-003 — `getBoundingClientRect()` Fails for Off-Screen Elements
- **File**: `src/lib/pdfGenerator.ts` lines 410–437
- **Severity**: 🟠 High
- **Issue**: The `snapBreaksToContent()` function queries `[data-section]` and `[data-break-avoid]` elements using `getBoundingClientRect()`. If the preview element has been scrolled out of the viewport, clipped by a parent with `overflow: hidden`, or is in a `display: none` container during capture, `getBoundingClientRect()` returns all zeros. The snap logic then places all section boundaries at y=0, making every break snap to the very top of the document — producing a single-page PDF with all content truncated.

  `prepareForCapture()` sets `overflow: visible` on the parent and resets `scrollTop`, but it does not force the element into the viewport or guarantee it is laid out at its natural size before `getBoundingClientRect()` is called.

- **Fix**: Before calling `snapBreaksToContent()`, validate that at least one `[data-section]` element returns a non-zero rect. If all rects are zero, fall back to `fixedBreaks` (no snapping) and log a warning rather than producing a broken PDF:
  ```typescript
  const hasValidLayout = sectionBounds.some(b => b.bottom > 0);
  if (!hasValidLayout) {
    console.warn('[PDF] Layout not available — using fixed-interval breaks');
    return fixedBreaks;
  }
  ```

---

#### PDF-004 — `maxShift` Hardcoded at 30% Causes Orphaned Headings
- **File**: `src/lib/pdfGenerator.ts` line 441
- **Severity**: 🟡 Medium
- **Issue**: The snap tolerance is fixed at `sourceHeightPerPage * 0.30`. For a standard Letter page (~748px printable height), this is ~224px. A section heading (~30px) followed immediately by a short paragraph sits well within this range, so the snap will always pull the break upward to the heading's top — correct. However, for **oversized blocks** (taller than one page) with many `[data-break-child]` markers, the `0.30` limit may exclude the nearest valid child boundary, forcing fallback to a raw pixel cut mid-sentence.

- **Fix**: Make `maxShift` dynamic — use a tighter tolerance for short elements and a wider one for tall elements:
  ```typescript
  const maxShift = Math.min(sourceHeightPerPage * 0.30, 200);  // Hard cap at 200px
  ```
  For oversized entries, increase the search range proportionally to the element's height:
  ```typescript
  const entryMaxShift = Math.max(maxShift, hitHeight * 0.15);
  ```

---

### Category 2: Download Failures & File Naming

#### PDF-005 — URL Revocation Too Short on iOS for Large Files
- **File**: `src/lib/downloadUtils.ts` lines 121–127
- **Severity**: 🟡 Medium
- **Issue**: The iOS fallback path opens the PDF in a new tab using `window.open(objectURL)` and revokes the Blob URL after 60 seconds:
  ```typescript
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  ```
  For large resumes (many pages, high-DPI canvas) the PDF Blob can exceed 5–10 MB. On older iPhones or slow connections, 60 seconds is insufficient for Safari to fully load and render the PDF before the URL is revoked. The result is a blank or corrupt PDF in the tab.

- **Fix**: Increase the revocation delay to 5 minutes for iOS, or better, revoke only when the tab's `visibilitychange` event fires (indicating the user has switched away after viewing):
  ```typescript
  setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);  // 5 minutes
  ```

---

#### PDF-006 — No Custom File Name Prompt Before Download
- **File**: `src/pages/PreviewPage.tsx` lines ~200–210
- **Severity**: 🟡 Medium
- **Issue**: The file name is derived automatically from the resume's `contactInfo.fullName`:
  ```typescript
  const baseName = customFileName || currentResume.contactInfo.fullName?.replace(/\s+/g, '_') || 'Document';
  ```
  Users cannot set a custom name before downloading. If `fullName` is empty, the file is named `Document_Resume.pdf`. There is a `customFileName` prop path but it is never populated from user input in the current UI — no input field or dialog exists for it.

- **Fix**: Add a small, non-blocking file-name input field in the export panel (next to the Download button), pre-filled with the auto-generated name. Pass the value to the download call as `customFileName`. Validation: strip illegal filename characters (`/\:*?"<>|`), enforce 3–100 character length.

---

### Category 3: Layout, Scaling & Alignment (Canvas Issues)

#### PDF-007 — SVG `currentColor` Falls Back to Transparent
- **File**: `src/lib/html2canvasRetry.ts` lines 70–72
- **Severity**: 🟡 Medium
- **Issue**: Before capture, `tagSvgDimensions()` reads `getComputedStyle(svg).color` and stores it as `data-pdf-color`. During clone processing in `convertSvgsToImages()`, this value is used to replace `currentColor` in serialized SVG markup:
  ```typescript
  const taggedColor = svg.getAttribute('data-pdf-color');
  if (taggedColor) {
    serialized = serialized.replace(/currentColor/g, taggedColor);
  }
  ```
  If `getComputedStyle(svg).color` returns an empty string (which can happen in certain CSS isolation contexts or when the SVG is not yet rendered), `data-pdf-color` is an empty string, which is falsy — so the replacement is skipped and `currentColor` remains in the SVG source. SVG renderers that do not resolve `currentColor` at serialization time will render these icons as black or transparent, causing icon colors to be wrong in the exported PDF.

- **Fix**: Provide a guaranteed fallback when `getComputedStyle` returns empty:
  ```typescript
  const color = getComputedStyle(svg).color || 'rgb(0, 0, 0)';
  if (color) svg.setAttribute('data-pdf-color', color);
  ```
  And in the replacement:
  ```typescript
  const taggedColor = svg.getAttribute('data-pdf-color') || 'rgb(0, 0, 0)';
  serialized = serialized.replace(/currentColor/g, taggedColor);
  ```

---

## User Scenarios & Testing

### User Story 1 — Multi-Page Resume Exports Without Truncation (Priority: P1)

A user with a 2–3 page resume exports a PDF and receives a complete document — all sections present, no content cut off at the bottom.

**Why this priority**: Content truncation means users submit incomplete resumes. This is the most damaging bug.

**Independent Test**: Create a resume with 3 pages of content, export PDF, verify all pages present and no content cut.

**Acceptance Scenarios**:

1. **Given** a resume with content spanning 2+ pages, **When** the user exports a PDF, **Then** the PDF contains all pages with no missing content.
2. **Given** the snap logic shifts a break backward, **When** the page loop processes it, **Then** the break is clamped forward and no duplicate/inverted pages are created.
3. **Given** the canvas is shorter than expected, **When** a page crop yields zero height, **Then** the export fails with a user-facing error and retry prompt rather than silently skipping pages.

---

### User Story 2 — Page Breaks Do Not Split Content Mid-Sentence (Priority: P1)

Section headings and experience entries are never split across pages. A new section always starts at the top of a page (not mid-way through the previous).

**Why this priority**: Awkward page breaks make resumes look unprofessional and damage the product's credibility.

**Independent Test**: Export a resume where a section heading falls near a page boundary — verify it moves to the next page.

**Acceptance Scenarios**:

1. **Given** a section heading falls within 60px of a page break, **When** PDF is generated, **Then** the heading moves to the next page (not orphaned at the bottom).
2. **Given** an experience entry straddles a page break, **When** PDF is generated, **Then** the entry either fits fully on one page or breaks cleanly at a `[data-break-child]` boundary.
3. **Given** the resume element is off-screen during export, **When** `getBoundingClientRect()` returns zeros, **Then** fixed-interval breaks are used as a safe fallback (no snap attempted).

---

### User Story 3 — PDF Downloads Reliably Across All Platforms (Priority: P2)

Users on iOS Safari, Android Chrome, and desktop browsers all successfully receive a downloaded PDF file after clicking Export.

**Why this priority**: Download failures with no recovery path leave users unable to use the core feature.

**Acceptance Scenarios**:

1. **Given** a user on iOS Safari exports a large PDF (>5MB), **When** the PDF blob URL is opened in a new tab, **Then** the URL remains valid for at least 5 minutes before revocation.
2. **Given** a download fails, **When** the error is caught, **Then** a toast with a "Retry" action is shown.

---

### User Story 4 — Custom File Name Before Download (Priority: P2)

Users can set a custom file name (e.g., `John_Smith_Senior_Engineer`) before the PDF is downloaded, instead of being stuck with the auto-generated name.

**Why this priority**: Users need to manage multiple tailored versions of their resume by job application.

**Acceptance Scenarios**:

1. **Given** a user opens the Export panel, **When** they view it, **Then** a text input pre-filled with the auto-generated name is visible.
2. **Given** a user types a custom name and clicks Download, **When** the file is saved, **Then** the file is named with the custom value (plus `_Resume.pdf` suffix).
3. **Given** a user clears the input and leaves it empty, **When** they download, **Then** the auto-generated name is used as fallback.

---

### User Story 5 — Icons and Colors Render Correctly in PDF (Priority: P2)

SVG icons in the resume (Lucide icons, decorative dividers) display with the correct color in the exported PDF — not as black boxes or transparent shapes.

**Acceptance Scenarios**:

1. **Given** a template uses `currentColor` icons, **When** the PDF is generated, **Then** all icons appear with the same color they have on screen.
2. **Given** `getComputedStyle` returns an empty color string, **When** SVGs are converted, **Then** they default to black (`rgb(0,0,0)`) rather than transparent.

---

### Edge Cases

- What if resume has exactly 1 page of content? (No breaks calculated — single-page path only)
- What if `fullName` is empty and user doesn't enter a custom name? (Fall back to `"Document_Resume.pdf"`)
- What if the user types special characters (`/`, `\`, `*`, `?`) in the custom file name? (Strip them silently)
- What if the snap moves a break beyond `totalHeight`? (Clamp to `totalHeight - 1`, break the loop)
- What if the export retries all 3 canvas attempts and still fails? (Show permanent error toast with support link)
- What if `navigator.share` is cancelled by the user on iOS? (Return `{ success: false, cancelled: true }` — no error toast shown)

---

## Requirements

### Functional Requirements

- **FR-001**: Break processing loop MUST guarantee strict monotonicity — each break MUST be greater than the previous by at least `HEADING_GUARD` pixels
- **FR-002**: Zero-height canvas crops MUST surface as user-facing errors, not silent skips
- **FR-003**: `snapBreaksToContent()` MUST validate that element rects are non-zero before applying snapping; fall back to fixed-interval breaks if layout is unavailable
- **FR-004**: `maxShift` snap tolerance MUST be capped at a hard maximum of 200px to prevent excessive snapping for tall blocks
- **FR-005**: iOS blob URL revocation timeout MUST be at least 5 minutes
- **FR-006**: SVG `currentColor` replacement MUST have a fallback of `rgb(0,0,0)` when computed color is empty
- **FR-007**: Export panel MUST include a text input for custom file name, pre-filled with the auto-generated value
- **FR-008**: Custom file name MUST be sanitized — illegal filename characters stripped, length clamped to 3–100 characters

### Key Entities

- **`PdfGenerationError`**: Typed error class with codes `EMPTY_CANVAS`, `MISSING_ELEMENT`, `TRUNCATED_CANVAS` — drives retry logic in `PreviewPage.tsx`
- **`snapBreaksToContent()`**: Core pagination algorithm in `pdfGenerator.ts` — must be monotonically safe
- **`captureTemplateAsCanvas()`**: Canvas capture entry point — must validate output height
- **`downloadFile()`**: Platform-routing download function in `downloadUtils.ts`

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: A 3-page resume exports with all 3 pages present — 0 truncation occurrences
- **SC-002**: Section headings never appear alone at the bottom of a page (orphan count = 0 across test templates)
- **SC-003**: PDF download succeeds on iOS Safari for files up to 15MB without URL revocation error
- **SC-004**: Custom file name input visible in export panel — user can change name before download
- **SC-005**: All Lucide icons in exported PDF match their on-screen color (verified visually across all 30 templates)
- **SC-006**: TypeScript compiles clean after all fixes (`tsc --noEmit` exits 0)

---

## Out of Scope

- Switching from html2canvas to a headless browser or Puppeteer-based approach
- ATS text layer improvements (separate concern)
- DOCX export format
- Support for custom paper sizes beyond A4 and Letter
- Real-time PDF preview inside the editor
- Print-via-browser (`window.print()`) support
