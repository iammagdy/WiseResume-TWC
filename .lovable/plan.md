Keep in mind that is a mobile app first 

It has to work with all the resume templates 

# Fix: PDF Generation Fails with Special Character in Branding

## Problem Identified

The branding text uses a special Unicode character `✦` (U+2726, four-pointed star) that cannot be encoded by the WinAnsi encoding used by `pdf-lib`'s standard embedded fonts.

### Error Message
```
Error: WinAnsi cannot encode "✦" (0x2726)
```

This causes the entire PDF generation to fail when:
1. Branding is enabled (default ON)
2. `font.widthOfTextAtSize(brandingText, 7)` is called on line 206
3. `page.drawText(brandingText, ...)` is called on line 208

---

## Solution

Replace the problematic `✦` character with a WinAnsi-compatible alternative that still looks professional and maintains the prestige feel.

### Options for Replacement Symbol

| Option | Character | Unicode | Compatible | Notes |
|--------|-----------|---------|------------|-------|
| A | `•` | U+2022 | ✓ Yes | Bullet point - clean and professional |
| B | `*` | U+002A | ✓ Yes | Asterisk - simple but may look basic |
| C | `©` | U+00A9 | ✓ Yes | Copyright - adds legal feel |
| D | `-` | U+002D | ✓ Yes | Dash - minimalist |
| E | (none) | - | ✓ Yes | No symbol - text only |

**Recommended: Option A (`•`)** - The bullet point character looks clean and professional while being fully compatible with WinAnsi encoding.

### Before vs After

```diff
- const brandingText = '✦ Created with WiseResume · part of WiseUniverse';
+ const brandingText = '• Created with WiseResume · part of WiseUniverse';
```

---

## File Change

| File | Change |
|------|--------|
| `src/lib/pdfGenerator.ts` | Replace `✦` with `•` on line 205 |

---

## Technical Details

The `·` (middle dot, U+00B7) used as a separator is WinAnsi-compatible, so it doesn't need to be changed. Only the `✦` four-pointed star needs replacement.

### WinAnsi Encoding

WinAnsi (Windows-1252) is a legacy encoding that only supports a limited set of characters. `pdf-lib`'s standard fonts (Helvetica, Times Roman, etc.) use this encoding. To use Unicode characters like `✦`, you would need to embed a custom font, which adds complexity and file size.

### Simple Fix

Changing one character is the cleanest solution that:
- Maintains the professional branding appearance
- Ensures PDF generation works reliably
- Keeps the codebase simple without custom font embedding

