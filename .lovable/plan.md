
# Fix Three Export Flow Issues

## 1. Make `estimateOnePageScale` use `prepareForCapture` for accurate mobile measurements

Currently `estimateOnePageScale` calls `calculatePDFDimensions` directly on the element, which on mobile may have a viewport-scaled width (not 612px). The fix wraps the measurement in `prepareForCapture` / cleanup to force the correct 612px layout before measuring.

**File: `src/lib/pdfGenerator.ts`**
- Update `estimateOnePageScale` to call `prepareForCapture(templateElement)` before `calculatePDFDimensions`, then call the cleanup function afterward
- Wrap in try/finally to guarantee cleanup

## 2. Replace 300ms `setTimeout` with `requestAnimationFrame` + `setTimeout` combo

The current `setTimeout(() => handleExport(...), 300)` is a race condition -- the DOM may not have updated yet (or it may update faster, wasting time). Replace with a double-`requestAnimationFrame` pattern that waits for the browser to actually paint the updated content before triggering export.

**File: `src/pages/PreviewPage.tsx` (line 664-665)**
- Replace `setTimeout(() => handleExport('one-page', true, true), 300)` with:
```typescript
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    handleExport('one-page', true, true);
  });
});
```

## 3. Remove unused `onOnePageWizard` prop

The `onOnePageWizard` prop is defined in `ExportOptionsSheet` but never used inside the component (it's only passed in from PreviewPage).

**File: `src/components/editor/ExportOptionsSheet.tsx`**
- Remove `onOnePageWizard` from the interface and destructured props

**File: `src/pages/PreviewPage.tsx` (line 656)**
- Remove `onOnePageWizard={() => setShowOnePageWizard(true)}` from the ExportOptionsSheet render
