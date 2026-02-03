
# Fix: True "End Page Here" for Manual Page Breaks

## Problem

When user selects "break after Experience":
- **Current behavior**: Content after Experience still appears on page 1 (partially visible, then masked by white footer rectangle)
- **Desired behavior**: Page 1 ends EXACTLY at Experience with clean white space below - no subsequent content visible at all

```
CURRENT (Broken):                    DESIRED (Professional):
┌─────────────────────┐              ┌─────────────────────┐
│ Summary             │              │ Summary             │
│ Experience          │              │ Experience          │
│ ─ Job 1            │              │ ─ Job 1            │
│ ─ Job 2            │              │ ─ Job 2            │
│ ─ Job 3            │              │                     │
│ Education [faded]   │ ← Bleeding!  │                     │ ← Clean!
│─────────────────────│              │                     │
│ Page 1 of 2         │              ├─────────────────────┤
└─────────────────────┘              │ Page 1 of 2         │
                                     └─────────────────────┘
```

## Root Cause

The PDF generation slices content from the canvas starting at `pageStart` and ending at `pageEnd` (the forced break position). However:

1. The slice height `pdfContentHeight` may be less than `PRINTABLE_HEIGHT`
2. The slice is positioned at the TOP of the PDF page (`y: PAGE_HEIGHT - pdfContentHeight`)
3. This leaves a GAP between the content and the footer
4. That gap currently contains... nothing (transparent/previous content)

But when manual breaks are involved, the content IS ending early by design - we need to fill the rest with white!

## Solution

After drawing the content image to each PDF page, **fill the entire page with white FIRST, then draw the content on top**. This ensures any "unused" space on the page is clean white.

Alternatively (more efficient): Draw the white footer mask to cover the ENTIRE unused area below the content, not just the fixed footer zone.

### Approach: Extend the white mask to cover all unused space

```typescript
// Current: Only masks footer zone
page.drawRectangle({
  x: 0,
  y: 0,
  width: PAGE_WIDTH,
  height: FOOTER_RESERVED_PT, // 44pt
  color: rgb(1, 1, 1),
});

// NEW: Mask everything below the content
const contentBottomY = PAGE_HEIGHT - pdfContentHeight;
page.drawRectangle({
  x: 0,
  y: 0,
  width: PAGE_WIDTH,
  height: contentBottomY, // Covers from bottom to where content ends
  color: rgb(1, 1, 1),
});
```

This way:
- If content fills the page → mask = small (just footer zone)
- If content ends early (manual break) → mask = large (entire blank area + footer)

## Implementation Details

### File: `src/lib/pdfGenerator.ts`

In the page generation loop (around lines 433-454), replace the fixed footer mask with a dynamic mask that covers ALL unused space:

```typescript
// Add page to PDF
const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

// In PDF, y=0 is BOTTOM. Position image at TOP of page.
page.drawImage(pngImage, {
  x: 0,
  y: PAGE_HEIGHT - pdfContentHeight,
  width: PAGE_WIDTH,
  height: pdfContentHeight,
});

// Draw white rectangle to cleanly mask ALL unused space below content
// This ensures manual page breaks result in clean white space (professional look)
const contentBottomY = PAGE_HEIGHT - pdfContentHeight;
if (contentBottomY > 0) {
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: contentBottomY, // Covers everything from bottom up to content edge
    color: rgb(1, 1, 1), // White
  });
}
```

## Why This Makes WiseResume Different

This "true page break" behavior is exactly what professional document editing tools (Word, Google Docs) provide but most resume builders lack:

1. **User Control**: "I want page 1 to end HERE" actually works
2. **ATS Friendly**: Clean page boundaries help parsing
3. **Professional Look**: No bleed-through, no truncated text
4. **Intuitive**: What You See Is What You Get

## File Changes Summary

| File | Change |
|------|--------|
| `src/lib/pdfGenerator.ts` | Replace fixed `FOOTER_RESERVED_PT` height mask with dynamic `contentBottomY` mask that covers all unused page space |

## Expected Result

- When user selects "break after Experience":
  - Page 1: Shows Summary + Experience + clean white space + footer
  - Page 2: Starts with Education at the TOP
- Clean, professional appearance matching enterprise document tools
- Differentiator from other resume apps in the market
