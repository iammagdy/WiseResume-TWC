
# Add Download Button to Mobile Editor Action Bar

## Current State

The editor page has three mobile tabs: Editor, Preview, and ATS View. The **Preview** tab already has a quick actions bar at the bottom with Download, Share, Template, and Export buttons. However, the **Editor** tab has no bottom action bar -- users must switch to Preview or navigate to the full Preview page to download a PDF.

## What Changes

Add a compact floating action bar at the bottom of the **Editor** tab (mobile only) with a primary "Download PDF" button and a secondary "Preview" button. This gives users a one-tap PDF export without leaving the editing flow.

## Implementation

### File: `src/pages/EditorPage.tsx`

**After the editor scroll container** (inside the `TabsContent value="editor"` block, after the `renderEditorContent()` div), add a sticky bottom action bar visible only on mobile:

- A "Download PDF" button (primary style) that reuses the same quick-download logic already present in the preview tab (dynamic import of `generatePDF` + `downloadFile`)
- A "Preview" button (outline style) that switches to the preview tab
- The bar uses `glass-header` styling with safe-area bottom padding, matching the existing preview tab's action bar
- The bar is hidden when the keyboard is open (using the existing `keyboard-open` class detection) to avoid covering input fields

### Technical Details

- Extract the inline download handler from the preview tab's action bar (lines 1197-1213) into a shared `handleQuickDownloadFromEditor` callback to avoid code duplication
- The new bar reuses `isQuickDownloading` state already defined at line 224
- Bar styling: `shrink-0 glass-header border-t border-border px-3 py-2 pb-[max(8px,env(safe-area-inset-bottom))]`
- Buttons use existing 44px min-height touch targets and haptics feedback
- The bar is conditionally hidden via the `keyboard-hide` CSS class so it doesn't overlay when the user is typing in form fields
