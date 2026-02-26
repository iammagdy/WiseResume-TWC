

# Replace AI-Generated Screenshots with Real App Screen Captures

## Problem
The `/screenshots-gallery` page uses the `generate-store-screenshots` Edge Function, which sends text prompts to an AI image model. The resulting images are generic, unrelated to your actual app design.

## Solution
Replace the AI generation approach on `/screenshots-gallery` with the same client-side capture approach used on `/store-screenshots`. This renders your real `MockScreens` components (Hero, Dashboard, AI Studio, Interview, Recruiter, Templates, Job Tracker, Portfolio) and uses `html2canvas` to capture them as PNGs.

## Changes

### 1. Rewrite `src/pages/ScreenshotsGalleryPage.tsx`
- Remove the Lovable Cloud client, database queries, and Edge Function invocation
- Import the same `MockScreens` components and `StoreScreenshot` wrapper used by `StoreScreenshotsPage`
- Import `captureWithRetry` from `@/lib/html2canvasRetry`
- Render all 8 screens in a responsive grid (2 cols on mobile, 3-4 on larger)
- "Generate Screenshots" button becomes "Capture All" -- captures each screen to PNG using `html2canvas` and auto-downloads
- Individual download buttons per screenshot
- Keep the mobile-first layout, skeleton loading states, and back navigation

### 2. No backend changes needed
- The Edge Function and `store_screenshots` table become unused by this page
- No database migration required

## Technical Details

**Screenshot data**: Reuse the same `SCREENSHOTS` array from `StoreScreenshotsPage.tsx` (8 items with id, headline, subtitle, gradient, and Screen component).

**Capture flow**:
- Render each `StoreScreenshot` off-screen or scaled down in the grid
- On "Capture All" or individual download, use `captureWithRetry(element, { scale: 1, width: 1290, height: 2796 })` to produce App Store-resolution PNGs
- Trigger browser download for each captured image

**UI layout**:
- Header with back button + title (keep existing style)
- Action bar: "Capture All" + count indicator
- Grid of screenshot previews (scaled-down versions of the 1290x2796 compositions)
- Each card shows the headline + a download button
- Mobile-first: 2 columns at 375px, expanding to 4 on desktop
