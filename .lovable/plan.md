
# Professional Branding Badge for PDF Exports

## Design Philosophy

The goal is to create a **prestige stamp** that users are proud to have on their resume - similar to how "Made with Squarespace" or "Powered by Shopify" feels aspirational rather than cheap. The branding should whisper quality, not shout advertisement.

---

## Visual Design Concept

### The Badge Style

A subtle, elegant footer badge that appears professional and adds credibility:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                    [Resume Content]                             │
│                                                                 │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                 Page 1 of 3                                     │  ← Page number (centered)
│                                                                 │
│        ✦ Created with WiseResume · part of WiseUniverse        │  ← Branding (subtle, right-aligned or centered)
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Style Options

**Option A: Minimal Line (Recommended)**
```
✦ Created with WiseResume · part of WiseUniverse
```
- Subtle star/sparkle icon (✦) to match the AI sparkle branding
- Thin separator dot (·) feels premium
- Light gray color (#808080 or 50% gray)
- Small font size (7-8pt)

**Option B: With Copyright Symbol**
```
© Created with WiseResume · part of WiseUniverse
```

**Option C: Badge with Year**
```
✦ Created with WiseResume · WiseUniverse © 2026
```

---

## Technical Implementation

### Positioning Strategy

The branding will be placed below the page number, near the bottom edge but with tasteful margins:

```
┌────────────────────────────────────────────┐
│                                            │
│              Content Area                  │
│                                            │
│                                            │
├────────────────────────────────────────────┤
│           y=28: "Page 1 of 3"              │  ← Page number at y=28
│  y=12: "✦ Created with WiseResume..."      │  ← Branding at y=12
│ ─────────────────────────────────────────  │
│           Bottom edge (y=0)                │
└────────────────────────────────────────────┘
```

### Color Palette for Branding

Using very subtle, professional colors:
- **Light gray text**: `rgb(0.55, 0.55, 0.55)` - slightly lighter than page numbers
- **Optional accent**: The sparkle character could use a very subtle purple tint on colored templates

### PDF Generation Changes

Update the `addPageNumbers` function to also add the branding badge:

```typescript
async function addPageFooter(
  pdfDoc: PDFDocument,
  options: PDFOptions = {}
): Promise<void> {
  const { 
    showPageNumbers = true, 
    pageNumberFormat = 'full',
    showBranding = true  // NEW: Toggle for branding
  } = options;

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const numPages = pages.length;

  for (let i = 0; i < numPages; i++) {
    const page = pages[i];
    
    // Page numbers (existing, moved up slightly)
    if (showPageNumbers) {
      const pageText = pageNumberFormat === 'simple' 
        ? `${i + 1}` 
        : `Page ${i + 1} of ${numPages}`;
      const textWidth = font.widthOfTextAtSize(pageText, 9);
      page.drawText(pageText, {
        x: (PAGE_WIDTH - textWidth) / 2,
        y: 28,  // Moved up from 20 to 28
        size: 9,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
    
    // NEW: Branding badge
    if (showBranding) {
      const brandingText = '✦ Created with WiseResume · part of WiseUniverse';
      const brandingWidth = font.widthOfTextAtSize(brandingText, 7);
      page.drawText(brandingText, {
        x: (PAGE_WIDTH - brandingWidth) / 2,  // Centered
        y: 12,  // Below page number
        size: 7,
        font,
        color: rgb(0.55, 0.55, 0.55),  // Lighter than page number
      });
    }
  }
}
```

### PDFOptions Type Update

```typescript
export interface PDFOptions {
  showPageNumbers?: boolean;
  pageNumberFormat?: 'simple' | 'full';
  showBranding?: boolean;  // NEW: Toggle for WiseResume branding
}
```

### Export Options UI Update

Add a toggle for branding (defaulting to ON):

```
┌─────────────────────────────────────────────────────────────┐
│  Export Options                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Page Numbers                              [ON]     │   │
│  │  Show "Page X of Y" in footer                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  WiseResume Badge                          [ON]     │   │  ← NEW toggle
│  │  Professional branding stamp                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Download PDF]                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Visual Polish

### Why This Feels Premium

1. **Minimal typography** - Small 7pt font doesn't compete with content
2. **Subtle color** - 55% gray blends into background, not distracting
3. **Tasteful spacing** - Positioned at bottom margin, respects content
4. **Premium symbol** - The ✦ sparkle adds a touch of quality
5. **Brand hierarchy** - "WiseResume" is the focus, "WiseUniverse" is secondary

### Comparison to Competitors

| Platform | Branding Style |
|----------|----------------|
| Canva | Prominent watermark on free tier (feels cheap) |
| Resume.io | None or small logo |
| Indeed | None |
| **WiseResume** | ✦ Subtle footer badge (feels aspirational) |

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/types/resume.ts` | Modify | Add `showBranding` to PDFOptions |
| `src/lib/pdfGenerator.ts` | Modify | Rename `addPageNumbers` to `addPageFooter`, add branding text |
| `src/components/editor/ExportOptionsSheet.tsx` | Modify | Add branding toggle switch |
| `src/pages/PreviewPage.tsx` | Modify | Pass branding option to export handler |

---

## User Control

The branding is **on by default** but users can toggle it off in Export Options. This respects user choice while encouraging brand visibility.

```
Default state: [✓] WiseResume Badge - ON
User can disable if needed for specific use cases
```

---

## Copy Finalization

**Final badge text:**
```
✦ Created with WiseResume · part of WiseUniverse
```

**Character breakdown:**
- `✦` - Four-pointed star (U+2726) - matches AI sparkle branding
- `Created with WiseResume` - Main brand attribution
- `·` - Middle dot separator (U+00B7) - cleaner than bullet or dash
- `part of WiseUniverse` - Parent brand mention, lowercase for humility

