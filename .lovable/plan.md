
# Download and Export Enhancement

## Overview
Enhance the export system with 6 improvements: centralized cross-platform download utility, DOCX export format, real progress tracking, error recovery with retry, code refactoring, and data export/import improvements.

## Changes

### 1. New File: `src/lib/downloadUtils.ts` -- Cross-Platform Download Utility
Create a centralized `downloadFile()` function that handles iOS (navigator.share), Android (window.open), and desktop (anchor click) with proper memory cleanup via `URL.revokeObjectURL()`. Includes retry logic for iOS `navigator.share` failures. This replaces the 50+ lines of inline platform detection currently duplicated in `PreviewPage.tsx`.

### 2. New File: `src/lib/docxGenerator.ts` -- Word Document Export
Create a DOCX generator using the `docx` npm package that maps resume sections (contact, summary, experience, education, skills, certifications) to Word document elements. Supports template color schemes and produces ATS-friendly, text-selectable output. Uses the same `downloadFile()` utility for cross-platform saving.

### 3. New File: `src/hooks/useExportProgress.ts` -- Progress Tracking Hook
Custom hook that tracks export stages: preparing, capturing, paginating, embedding, finalizing, downloading. Exposes `{ stage, progress, message, isActive }` state. Used by both PreviewPage and ExportOptionsSheet to show real-time progress.

### 4. Modify: `src/types/resume.ts`
Add `'docx'` to the `ExportType` union type.

### 5. Modify: `src/lib/pdfGenerator.ts`
- Add optional `onProgress` callback to `generatePDF`, `generateOnePagePDF`, and `generateCombinedPDF` function signatures
- Report progress at key milestones: fonts ready (10%), capture complete (40%), pages sliced (70%), footer added (90%), save (100%)
- Extract shared setup sequence (fonts, delay, prepare, capture, cleanup) into a `withPdfCapture()` helper to reduce duplication across the 3 generator functions
- Replace 8 `console.log` calls with conditional `options?.debug` gating
- Fix double JSDoc comment at line 845-848
- Add typed `PdfGenerationError` class with error codes for programmatic handling

### 6. Modify: `src/components/editor/ExportOptionsSheet.tsx`
- Add DOCX as a 5th export option with `FileText` icon and an "ATS-Friendly" badge
- Replace the boolean `isExporting` spinner with the progress hook's stage indicator (e.g., "Capturing resume... 40%")
- Show a progress bar below the download button during generation

### 7. Modify: `src/pages/PreviewPage.tsx`
- Replace inline 50-line platform download logic (lines 267-321) with a call to the new `downloadFile()` utility
- Remove duplicate `isIOS` const (declared at line 77 and again at line 268)
- Add DOCX case to the `handleExport` switch statement
- Wire up `onProgress` callbacks from the progress hook into PDF generator calls
- Add retry mechanism (max 2 retries) for canvas capture failures with "Retry" action button in error toasts
- Add specific error messages for common failures (empty canvas, missing template element)

### 8. Modify: `src/lib/dataExport.ts`
- Update `downloadJson()` to use the new `downloadFile()` utility (fixes silent failure on iOS Safari)
- Add `importResumes(file: File)` function that parses JSON, validates the export schema, and upserts resumes into the database

### 9. Modify: `src/components/settings/DataExportSheet.tsx`
- Add "Import Backup" button with a file picker
- Show import progress and success/error state
- Validate imported JSON schema before processing

### 10. Install: `docx` npm package
Required for DOCX generation. ~50KB gzipped.

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/downloadUtils.ts` | New | Cross-platform download with memory cleanup and retry |
| `src/lib/docxGenerator.ts` | New | Word document export from resume data |
| `src/hooks/useExportProgress.ts` | New | Progress tracking hook for export stages |
| `src/types/resume.ts` | Modify | Add 'docx' to ExportType |
| `src/lib/pdfGenerator.ts` | Modify | Progress callbacks, shared pipeline, typed errors, cleanup logs |
| `src/components/editor/ExportOptionsSheet.tsx` | Modify | DOCX option, progress indicator |
| `src/pages/PreviewPage.tsx` | Modify | Use downloadFile utility, progress hook, retry, remove duplication |
| `src/lib/dataExport.ts` | Modify | iOS fix, import/restore function |
| `src/components/settings/DataExportSheet.tsx` | Modify | Import backup button and flow |

## Implementation Order
1. `downloadUtils.ts` (no dependencies)
2. `useExportProgress.ts` (no dependencies)
3. `resume.ts` type update
4. `pdfGenerator.ts` refactor (progress callbacks, shared pipeline, typed errors)
5. `docxGenerator.ts` (depends on resume types)
6. `ExportOptionsSheet.tsx` (depends on progress hook, new export type)
7. `PreviewPage.tsx` (depends on all above)
8. `dataExport.ts` + `DataExportSheet.tsx` (depends on downloadUtils)
