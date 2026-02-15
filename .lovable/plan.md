

## Live Resume Preview in the Editor

### Overview

Add a real-time resume preview that shows the formatted resume while editing. On mobile, a "Preview" button opens a full-screen sheet. On desktop (768px+), a collapsible side panel shows the preview alongside the editor in a split-screen layout.

### Architecture

The core preview rendering logic already exists in `PreviewPage.tsx`. We will extract the template rendering into a reusable component and embed it in the editor without modifying the existing form structure, section navigation, AI Studio, or bottom tab bar.

### New Files

#### 1. `src/components/editor/LivePreviewPanel.tsx`
A self-contained preview component that:
- Reads `currentResume` and `selectedTemplate` from the Zustand resume store (using individual selectors to avoid render loops)
- Lazy-loads only the selected template component
- Renders the resume inside a scaled container with zoom controls (50%, 75%, 100%, 125%)
- Includes a "Download PDF" button that reuses the existing `generatePDF` utility
- Applies template customizations via `applyCustomizationCSS` and `headingStyle` from `templateCustomization.ts`
- Shows a loading skeleton while the template loads
- NO Radix Tooltip or Popper components (per editor architectural rule)
- Uses `React.memo` and stable selectors for performance

#### 2. `src/components/editor/LivePreviewSheet.tsx`
A mobile-only full-screen sheet (using the existing Vaul Drawer component) that:
- Wraps `LivePreviewPanel` in a bottom sheet with `snap` points at 100%
- Supports swipe-down to close gesture (built into Vaul)
- Has a "Close Preview" handle/button at the top
- Includes the zoom controls and download button

### Modified Files

#### 3. `src/pages/EditorPage.tsx` (minimal changes)
- Add a "Preview" toggle button in the header bar (next to the Wise AI button) -- simple `<button>` with an `Eye` icon, no Tooltip
- Add state: `const [showPreview, setShowPreview] = useState(false)`
- Import `useIsMobile` from `src/hooks/use-mobile.tsx`
- **Mobile path**: When `showPreview` is true and `isMobile`, render the lazy-loaded `LivePreviewSheet`
- **Desktop path**: When `showPreview` is true and NOT mobile, wrap the existing editor content area and the `LivePreviewPanel` in a CSS flex row (editor takes `flex-1`, preview takes `flex-1` with `max-w-[50%]`)
- The preview button toggles `showPreview` on/off
- Both components are lazy-loaded to avoid impacting editor initial load time

### What Does NOT Change
- The stepper navigation (Contact, Summary, Work, Education, Skills, More)
- The section form components (ContactSection, SummarySection, etc.)
- The AI Studio bar and all AI sheet functionality
- The bottom tab bar (BottomTabBar)
- Progress tracking and completion percentages
- Form validation and error handling
- The existing PreviewPage at `/preview` (remains fully functional)
- Auto-save logic and cloud sync

### Technical Details

**Performance safeguards:**
- The preview panel uses `React.memo` and only re-renders when `currentResume` or `selectedTemplate` changes
- Template components are already `memo`-wrapped (verified in codebase)
- The preview is lazy-loaded -- zero impact on editor initial load
- Zoom is handled via CSS `transform: scale()` on the preview container, not by re-rendering at different sizes

**Zoom implementation:**
- A toolbar with 4 preset zoom buttons (50%, 75%, 100%, 125%)
- Applied as `transform: scale(zoomLevel)` with `transform-origin: top center` on the resume wrapper
- The container uses `overflow: auto` so users can scroll when zoomed in

**Mobile UX:**
- Full-screen Vaul drawer with swipe-down to close
- Preview is scaled to fit screen width by default (responsive `max-width: 100%` with aspect ratio preservation)
- 44px minimum touch targets on all controls

**Desktop split-screen:**
- Simple CSS flex layout: `flex flex-row` on the main content area
- Editor panel: `flex-1 min-w-0 overflow-hidden`
- Preview panel: `flex-1 min-w-0 border-l border-border overflow-hidden` with a close button
- Collapsible via the same toggle button -- no complex resize handles needed

**Download in preview:**
- Reuses the existing `generatePDF` and `downloadFile` utilities from `src/lib/pdfGenerator.ts` and `src/lib/downloadUtils.ts`
- Shows a loading spinner during generation

**Section visibility toggles:**
- Small eye-icon toggles next to each section header in the preview panel
- Uses local state `hiddenSections: Set<string>` to filter which sections render
- Does NOT modify the actual resume data -- purely visual filtering in the preview

