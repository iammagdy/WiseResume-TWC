# Implementation Plan: PDF Export & Pagination Audit

**Branch**: `019-pdf-export-audit` | **Date**: 2026-03-19 | **Spec**: `specs/019-pdf-export-audit/spec.md`

## Summary

Fix all 7 PDF export bugs: 2 Critical/High pagination issues in `pdfGenerator.ts`, 1 High layout-detection issue, 2 Medium download reliability fixes, 1 Medium file-naming UX improvement (filename dialog), and 1 Medium SVG color defensive fix.

## Clarification Decisions

1. All 7 bugs in scope — no deferral.
2. File name: small dialog after "Download" click, before generation starts.
3. Monotonicity: clamp to guarantee forward progress; imperfect break > crash.
4. iOS Safari important: extend blob URL revocation to 5 minutes.
5. Manual testing only.
6. SVG color fix applied defensively regardless.

## Technical Context

**Primary files**:
- `src/lib/pdfGenerator.ts` — pagination logic, canvas capture, PDF assembly
- `src/lib/html2canvasRetry.ts` — SVG handling, canvas retry
- `src/lib/downloadUtils.ts` — platform download routing
- `src/pages/PreviewPage.tsx` — export orchestration, `handleExport()`
- New: `src/components/editor/export/FileNameDialog.tsx`

## Project Structure

### Files to Create
```
src/components/editor/export/FileNameDialog.tsx   # New dialog component
```

### Files to Modify
```
src/lib/pdfGenerator.ts                  # PDF-001, PDF-002, PDF-003, PDF-004
src/lib/html2canvasRetry.ts              # PDF-007
src/lib/downloadUtils.ts                 # PDF-005
src/pages/PreviewPage.tsx                # PDF-006 (wire dialog + pass customFileName)
```

## Phase-by-Phase Approach

### Phase 1: Core Pagination Fixes (Critical/High — PDF-001, PDF-002, PDF-003)

**PDF-001 — Monotonic Break Guarantee** (`pdfGenerator.ts` lines 514–528)

Change the sequential break loop from:
```typescript
nextBreak = snapOne(nextBreak);
result.push(nextBreak);
prevBreak = nextBreak;
```
To:
```typescript
const HEADING_GUARD = 60; // already defined at line 442
nextBreak = Math.max(snapOne(nextBreak), prevBreak + HEADING_GUARD);
if (nextBreak >= totalHeight) break;
result.push(nextBreak);
prevBreak = nextBreak;
```
This guarantees each break is always strictly ahead of the previous one. Also add the post-snap `>= totalHeight` check to prevent adding a break beyond the document end.

**PDF-002 — Canvas Truncation Surfaces as Error** (`pdfGenerator.ts` lines 300–306 and 337)

Step 1 — Promote canvas height warning to a thrown error. Change `captureTemplateAsCanvas()`:
```typescript
// BEFORE (warn only):
if (canvas.height < expectedHeight * 0.5) {
  console.warn(`[PDF] Canvas height...`);
}

// AFTER (throw recoverable error):
if (canvas.height < expectedHeight * 0.5) {
  throw new PdfGenerationError(
    `Canvas capture is truncated (got ${canvas.height}px, expected ~${expectedHeight}px). ` +
    `The resume preview may be off-screen or clipped.`,
    'TRUNCATED_CANVAS'
  );
}
```

Step 2 — Add `'TRUNCATED_CANVAS'` to the `PdfGenerationError` code union (line 11):
```typescript
code: 'EMPTY_CANVAS' | 'MISSING_ELEMENT' | 'CAPTURE_FAILED' | 'TRUNCATED_CANVAS' | 'UNKNOWN';
```

Step 3 — In `generatePDFPages()`, replace silent `continue` with a `break` + warning (line 337):
```typescript
if (sourceH <= 0) {
  console.warn(`[PDF] Page ${pageNum + 1} crop height is zero — stopping page loop early.`);
  break;
}
```

Step 4 — In `PreviewPage.tsx` error handler (line 393), add handling for `TRUNCATED_CANVAS`:
```typescript
isPdfError && error.code === 'TRUNCATED_CANVAS'
  ? 'Resume content was partially captured. Scroll the preview into view and try again.'
  : ...
```

**PDF-003 — Layout Validation Before Snapping** (`pdfGenerator.ts` `snapBreaksToContent()`)

Add a layout validity check immediately after collecting `sectionBounds` and `entryBounds`:
```typescript
// After sorting entryBounds...
if (!sectionBounds.length && !entryBounds.length) return fixedBreaks;

// NEW: validate rects are non-zero (element must be visible/in-viewport)
const hasValidLayout = sectionBounds.some(b => b.bottom > 0) || entryBounds.some(b => b.bottom > 0);
if (!hasValidLayout) {
  console.warn('[PDF] All element rects are zero — element may be off-screen. Using fixed-interval breaks.');
  return fixedBreaks;
}
```

### Phase 2: Medium Fixes — Download & SVG (PDF-004, PDF-005, PDF-007)

**PDF-004 — maxShift Cap** (`pdfGenerator.ts` line 441)

Change:
```typescript
const maxShift = sourceHeightPerPage * 0.30;
```
To:
```typescript
const maxShift = Math.min(sourceHeightPerPage * 0.30, 200); // hard cap at 200px
```

**PDF-005 — iOS Blob URL Timeout** (`downloadUtils.ts` line 126)

Change:
```typescript
setTimeout(() => URL.revokeObjectURL(url), 60_000);
```
To:
```typescript
setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000); // 5 minutes for large PDFs
```
Also fix the same 60s timeout in `downloadMobile()` at lines 160 and 165.

**PDF-007 — SVG currentColor Fallback** (`html2canvasRetry.ts` lines 26–27 and 70–72)

In `tagSvgDimensions()`:
```typescript
// BEFORE:
const color = getComputedStyle(svg).color;
if (color) svg.setAttribute('data-pdf-color', color);

// AFTER:
const color = getComputedStyle(svg).color || 'rgb(0, 0, 0)';
svg.setAttribute('data-pdf-color', color); // always set, guaranteed non-empty
```

In `convertSvgsToImages()`:
```typescript
// BEFORE:
const taggedColor = svg.getAttribute('data-pdf-color');
if (taggedColor) {
  serialized = serialized.replace(/currentColor/g, taggedColor);
}

// AFTER:
const taggedColor = svg.getAttribute('data-pdf-color') || 'rgb(0, 0, 0)';
serialized = serialized.replace(/currentColor/g, taggedColor);
```

### Phase 3: File Name Dialog (PDF-006)

**New component**: `src/components/editor/export/FileNameDialog.tsx`

A small `AlertDialog` (reusing existing Radix UI components) that:
- Opens after user clicks "Download" (before generation starts)
- Shows a single `Input` field pre-filled with the auto-generated name
- Has "Cancel" and "Download" buttons
- Sanitizes input: strips `/ \ : * ? " < > |`, trims whitespace, clamps to 100 chars
- Falls back to auto-generated name if field is empty
- Only applies to PDF export types (not DOCX, JSON, image — those use direct download)

**Wire-up in `PreviewPage.tsx`**:
1. Add state: `const [fileNameDialogOpen, setFileNameDialogOpen] = useState(false)`
2. Add state: `const [pendingExportType, setPendingExportType] = useState<ExportType | null>(null)`
3. Add state: `const [pendingExportOptions, setPendingExportOptions] = useState<{showPageNumbers: boolean; showBranding: boolean} | null>(null)`
4. Intercept PDF export types in the Download button handler — open dialog instead of calling `handleExport()` directly
5. On dialog confirm, call `handleExport(pendingExportType, ..., customFileName)`
6. Determine which export types need the dialog: `['resume', 'one-page', 'ats-pdf', 'cover-letter', 'combined']`

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| `TRUNCATED_CANVAS` error now thrown instead of warned | Medium | Error is retryable (code !== 'MISSING_ELEMENT'), so retry logic kicks in automatically |
| Monotonic clamp may cut mid-content | Low | User accepted this trade-off; result is still a valid PDF |
| Filename dialog adds a step before download | Low | Only appears for PDF types; non-PDF exports bypass it |
| iOS timeout change from 60s to 5min | Low | Only affects memory cleanup; blob URL held open longer but no functional risk |

## Open Questions

None — all decisions confirmed by user.
