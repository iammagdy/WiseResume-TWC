

# Add Download, Share, and Template Buttons to Mobile Preview Tab

## Current State

The mobile editor has three tabs: Editor, Preview, and ATS View. When on the Preview tab, a bottom action bar (lines 1188-1217 in `EditorPage.tsx`) currently shows three buttons:
- **Full Preview** (navigates to `/preview`)
- **Template** (opens template selector sheet)
- **Design** (opens customization sheet)

Users who want to download or share must navigate to the full Preview page first, which adds unnecessary friction.

## Changes

Replace the existing 3-button bar with a more useful 4-button bar:
- **Download** (primary CTA) -- triggers quick PDF download directly from the editor preview tab
- **Share** -- opens the ShareSheet (already lazy-loaded in EditorPage)
- **Template** -- opens template selector (keep existing)
- **Export** -- navigates to full Preview page for advanced export options

This gives users the two most common actions (Download + Share) immediately, keeps Template for quick switching, and moves "Full Preview" to "Export" for the advanced export sheet flow.

## Technical Details

### File Modified: `src/pages/EditorPage.tsx`

**1. Add ShareSheet state and lazy import (if not already present)**

Search for existing `showShareSheet` state -- if missing, add it alongside other sheet states. The `ShareSheet` component is already lazy-imported in the file.

**2. Replace the Quick Actions Bar (lines 1188-1217)**

Replace the current 3-button layout with:

```text
[Download (primary filled)] [Share] [Template] [Export]
```

- **Download button**: Primary styled, calls a new `handleQuickDownload` function that dynamically imports `generatePDF` + `downloadFile`, generates a PDF from `resumeRef` (the LivePreviewPanel's internal ref won't work -- need to use the editor's own hidden template ref or navigate to preview). Since `LivePreviewPanel` has its own `resumeRef`, the simplest approach is to add a quick download handler that reuses the existing `handleDownload` from `LivePreviewPanel` by extracting it, OR simply navigate to `/preview` with a query param.

Actually, the cleanest approach: add a `handleQuickPDF` function in EditorPage that dynamically imports `generatePDF`, renders using a hidden ref, and downloads. But `LivePreviewPanel` already has this exact logic with its own `resumeRef`. 

The simplest reliable approach: make the Download button trigger the same PDF generation that `LivePreviewPanel` already does, by forwarding a callback ref.

**Revised simpler approach**: Add a `ref` prop to `LivePreviewPanel` so the parent can trigger download, OR just add the download/share buttons and have them:
- **Download**: Use inline PDF generation (dynamic import of `generatePDF` with the resume data, using `null` for the element ref which falls back to html2canvas rendering)
- **Share**: Open `ShareSheet` (already available in the lazy imports)

**3. Add ShareSheet rendering**

Add `showShareSheet` state and render `<ShareSheet>` in the Suspense block at the bottom of the component (near line 1320+).

### Implementation Detail

```text
Lines 1188-1217 replacement:

<div className="shrink-0 glass-header border-t border-border px-3 py-2 pb-[max(8px,env(safe-area-inset-bottom))] flex items-center justify-center gap-2">
  <Button primary  onClick={handleMobileQuickDownload}> Download </Button>
  <Button outline   onClick={() => setShowShareSheet(true)}> Share </Button>
  <Button outline   onClick={() => setShowTemplates(true)}> Template </Button>
  <Button outline   onClick={() => navigate('/preview')}> Export </Button>
</div>
```

New handler `handleMobileQuickDownload`:
- Sets generating state
- Dynamically imports `generatePDF`
- Calls `generatePDF(currentResume, selectedTemplate, null)` (null element = pure render)
- Downloads via `downloadFile`
- Shows success/error toast

New state + sheet:
- `const [showShareSheet, setShowShareSheet] = useState(false)`
- Render `<ShareSheet>` in the existing `<Suspense>` block

### Files Modified (1)
- `src/pages/EditorPage.tsx` -- add Download/Share buttons to mobile preview action bar, add ShareSheet state + rendering, add quick download handler
