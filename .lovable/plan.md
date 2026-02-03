
# Fix: Page Break "Bleed-Through" / Content Overlap in Footer Zone

## Problem Identified

Looking at your screenshot, I can see that content from the resume is visible in the area between page 1's content and the footer ("Page 1 of 3" / "Created with WiseResume"). This looks unprofessional because:

1. The content image is drawn starting from the TOP of the page
2. The footer (page numbers + branding) is drawn at the BOTTOM (at y=28 and y=12)
3. **There's no "clean cut" or white space between the content and footer**

The current code places content correctly but doesn't ensure a clean visual separation before the footer area.

---

## Root Cause

The PDF generation draws the content slice and then draws the footer text **on top** of whatever is there. If content runs close to or into the footer zone, you see this "bleed-through" effect where content is partially visible behind the footer.

```
Current Behavior:
┌─────────────────────────┐
│ Content...              │
│ ...                     │
│ Last line of content    │
│ [ghosted next-page text]│ ← Content bleeds here
│─────────────────────────│
│ Page 1 of 3             │ ← Footer drawn on top
│ • Created with WiseResume│
└─────────────────────────┘
```

---

## Solution

After drawing each page's content image, **draw a white rectangle** over the footer zone to create a clean "cutoff". This ensures:

1. Any content that visually extends into the footer area is covered
2. A clean white separation exists before the page numbers
3. Professional appearance on all pages

### Visual After Fix:

```
Fixed Behavior:
┌─────────────────────────┐
│ Content...              │
│ ...                     │
│ Last line of content    │
│                         │ ← Clean white space
├─────────────────────────┤
│ Page 1 of 3             │
│ • Created with WiseResume│
└─────────────────────────┘
```

---

## Implementation

### File: `src/lib/pdfGenerator.ts`

In the page generation loop, after drawing the content image to the PDF page, add a **white rectangle overlay** that covers the footer zone:

```typescript
// Add page to PDF
const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

// Draw the content image at TOP of page
page.drawImage(pngImage, {
  x: 0,
  y: PAGE_HEIGHT - pdfContentHeight,
  width: PAGE_WIDTH,
  height: pdfContentHeight,
});

// *** NEW: Draw white rectangle over footer zone for clean cutoff ***
page.drawRectangle({
  x: 0,
  y: 0,
  width: PAGE_WIDTH,
  height: FOOTER_RESERVED_PT,
  color: rgb(1, 1, 1), // White
});
```

This ensures:
- Content can never visually appear in the footer zone
- Clean professional separation between content and footer
- Footer text is drawn on a clean white background

---

## File Changes

| File | Change |
|------|--------|
| `src/lib/pdfGenerator.ts` | Add white rectangle overlay in footer zone after drawing page content (around line 443) |

---

## Technical Details

- `FOOTER_RESERVED_PT = 44` - The height reserved for the footer
- The white rectangle is drawn AFTER the content image (so it covers any bleed)
- The footer text is drawn AFTER this in `addPageFooter()` (so it appears on top of the white)

### Drawing Order:
1. Page content image (positioned at top)
2. White rectangle (covers footer zone - creates clean cutoff)
3. Footer text (page numbers + branding - drawn on clean white)

---

## Expected Result

- Clean visual separation between content and footer on every page
- No "ghosted" or "bleed-through" content visible near page numbers
- Professional appearance matching industry-standard resume PDFs
