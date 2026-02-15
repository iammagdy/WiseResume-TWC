

## Fix Preview Centering and PDF Download

### Issue 1: Preview Content Shifted Right

**Root cause:** In `LivePreviewPanel.tsx` (line 228-235), the zoom container uses `width: ${100/zoom}%` combined with `transform: scale(zoom)` and `transform-origin: top center`. At 75% zoom, the container width becomes 133%, which pushes content to the right since the parent `overflow-auto` div starts scrolling horizontally rather than centering.

**Fix:** Add `display: flex; justify-content: center` to the scrollable container (line 228), and set a fixed `max-width: 612px` on the inner resume wrapper instead of relying on the inverse-zoom width trick. The zoom container should center itself within the scroll area.

Specifically in `LivePreviewPanel.tsx`:
- Change the scroll container (line 228) to use `flex justify-center` so the scaled content centers horizontally
- Keep the `transform: scale(zoom)` and `transform-origin: top center` approach but ensure the wrapper is centered within the flex parent

### Issue 2: PDF Download Has Overlapping Text

**Root cause:** When the user clicks "Download PDF", the `handleDownload` function passes `resumeRef.current` to `generatePDF`. This element is inside a parent div that has `transform: scale(0.75)` applied (the zoom). The `prepareForCapture` function in `pdfGenerator.ts` only resets the transform on the source element itself (line 532), NOT on its parent container. So `html2canvas` captures the element while its parent still has a CSS scale transform active, causing text to render at one size but position at another -- resulting in the overlapping text shown in the screenshot.

**Fix:** Before calling `generatePDF`, temporarily reset the parent zoom container's transform to `scale(1)` (or `none`), then restore it after capture completes. This ensures html2canvas sees the element at its true layout dimensions without any interfering transforms.

Specifically in `LivePreviewPanel.tsx`:
- In `handleDownload`, before calling `generatePDF`, find the zoom wrapper (parent of `resumeRef.current`) and temporarily set its `transform` to `none` and `width` to `auto`
- After the PDF is generated, restore the original transform and width
- This is a 5-line change in the `handleDownload` callback

### Files Modified

| File | Change |
|------|--------|
| `src/components/editor/LivePreviewPanel.tsx` | Center the scroll container with flexbox; reset parent zoom transform before PDF capture |

No other files need modification. The `pdfGenerator.ts` logic is correct -- the issue is purely that the LivePreviewPanel's zoom transform interferes with capture.

