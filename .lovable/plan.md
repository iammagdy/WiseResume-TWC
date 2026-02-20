

# Advanced QR Code Generator for Portfolio

## Overview

Replace the simple `PortfolioQRDialog` (a small dialog with a fixed-style QR + download/share buttons) with a full-featured, tabbed QR code customization experience using the already-installed `qr-code-styling` library. The new UI will be a full-height bottom Sheet instead of a small dialog, with 6 tabs for deep customization.

## Architecture

### New Files
- **`src/components/portfolio/qr/QRGeneratorSheet.tsx`** -- Main sheet component with tabs, live preview, and state management
- **`src/components/portfolio/qr/qr-types.ts`** -- TypeScript types for the customization state
- **`src/components/portfolio/qr/qr-templates.ts`** -- Template presets (Classic, LinkedIn, Instagram, YouTube, etc.)
- **`src/components/portfolio/qr/qr-utils.ts`** -- Contrast checking, scannability warnings, helper functions
- **`src/components/portfolio/qr/tabs/TemplatesTab.tsx`** -- Template selection grid
- **`src/components/portfolio/qr/tabs/ColoursTab.tsx`** -- Foreground/background color pickers + gradient support
- **`src/components/portfolio/qr/tabs/StyleTab.tsx`** -- Module shape presets (square, rounded, dots, classy, extra-rounded) + roundness
- **`src/components/portfolio/qr/tabs/LogoTab.tsx`** -- Logo upload, size slider, safe zone toggle
- **`src/components/portfolio/qr/tabs/EyesTab.tsx`** -- Finder pattern shape + separate inner/outer color pickers
- **`src/components/portfolio/qr/tabs/OptionsTab.tsx`** -- Export format, size, error correction, quiet zone, download

### Modified Files
- **`src/pages/PortfolioEditorPage.tsx`** -- Replace `<PortfolioQRDialog>` with `<QRGeneratorSheet>`
- **`src/components/portfolio/PortfolioQRDialog.tsx`** -- Keep as-is (not deleted, but no longer imported from the editor page)

## Technical Details

### State Model (`qr-types.ts`)

```text
QRCustomizationState
  +-- data: string (portfolio URL)
  +-- templateId?: string
  +-- foregroundColor: string
  +-- backgroundColor: string
  +-- gradient?: { enabled, type, from, to, angle }
  +-- moduleStyle: { shape, roundness }
  +-- logo: { src, enabled, sizePercent, safeZone }
  +-- eyes: { shape, outerColor, innerColor, syncWithForeground }
  +-- options: { errorCorrection, sizePx, quietZone, format }
```

### `qr-code-styling` Library Capabilities
The already-installed library (v1.9.2) natively supports all planned features:
- **Dot types**: `'square' | 'dots' | 'rounded' | 'extra-rounded' | 'classy' | 'classy-rounded'`
- **Corner square types**: `'square' | 'dot' | 'extra-rounded'` (+ undefined for default)
- **Corner dot types**: `'square' | 'dot'` (+ undefined for default)
- **Gradients**: linear and radial with color stops on dots, corners, and background
- **Image/logo**: with `imageOptions` for size, margin, hideBackgroundDots
- **Error correction**: L, M, Q, H
- **Export**: PNG and SVG via `.download()` and `.getRawData()`

No new dependencies are needed.

### Templates (`qr-templates.ts`)
12 pre-built templates, each setting all customization fields in one tap:
- **Classic** -- black on white, square dots, square eyes
- **WiseResume** -- current purple/pink gradient (the existing style)
- **LinkedIn** -- #0A66C2 blue, rounded dots, LinkedIn icon placeholder
- **Instagram** -- gradient pink/orange/purple, rounded dots
- **YouTube** -- #FF0000, rounded dots
- **Twitter/X** -- #000000, classy-rounded dots
- **Facebook** -- #1877F2, rounded dots
- **GitHub** -- #333333, square dots
- **Pinterest** -- #E60023, dots shape
- **Google Maps** -- #34A853 green, extra-rounded
- **WiFi** -- #00BCD4 teal, dots
- **Minimal** -- dark gray on light, thin square style

### Tab UI Layout
- The Sheet opens from the bottom at 90vh height
- Live QR preview at the top (240-280px depending on screen width), updates instantly on any change
- Below the preview: a horizontally scrollable tab bar using the existing `Tabs` component
- Below tabs: the active tab's controls in a scrollable area
- Sticky bottom bar with Download + Share buttons

### Scannability Warnings (`qr-utils.ts`)
- Compute relative luminance contrast ratio between foreground and background
- Warn if contrast ratio < 3:1
- Warn if logo size > 30%
- Warn if error correction is L with a logo enabled
- Display as a non-blocking amber banner below the preview

### Logo Tab
- Upload via `<input type="file" accept="image/*">` storing as a data URL in state
- Default logo: the existing `wise-ai-logo.png`
- Size slider: 10-35% (clamped at 35% max for scannability)
- Safe zone toggle: maps to `imageOptions.hideBackgroundDots`
- Auto-bumps error correction to H when logo is enabled

### Eyes Tab
- Shape presets as tappable chips: square, rounded (extra-rounded), circle (dot)
- Maps to `cornersSquareOptions.type` and `cornersDotOptions.type`
- Separate color pickers for outer border and inner dot
- "Sync with foreground" toggle that overrides both colors with the main foreground color

### Options Tab
- Format toggle: PNG / SVG
- Size presets: 512, 1024, 2048 as segmented control
- Error correction: L / M / Q / H segmented control
- Quiet zone slider: 0-40px
- Background preview toggle: light / dark surface behind the QR to test visibility
- Download button triggers `qrCode.download()`
- Global warning text when customization deviates from safe defaults

### Animations
- Tab transitions: fade in/out (200ms)
- QR preview updates instantly (qr-code-styling handles re-render)
- Template selection: scale bounce on tap (active:scale-95)
- Warning banners: fade-in (150ms)
- All respect `useReducedMotion`

### Mobile UX
- All interactive elements have min 44x44px touch targets
- Color pickers use native `<input type="color">` (44x44px)
- Sliders use the existing `Slider` component (from Radix)
- Tab bar scrolls horizontally with `overflow-x-auto` and `scrollbar-hide`
- Preview + tabs + controls layout fills the sheet without overflow issues

## Files Summary

| File | Action | Purpose |
|---|---|---|
| `src/components/portfolio/qr/qr-types.ts` | Create | TypeScript types for QR customization state |
| `src/components/portfolio/qr/qr-templates.ts` | Create | 12 template presets |
| `src/components/portfolio/qr/qr-utils.ts` | Create | Contrast checking + scannability warnings |
| `src/components/portfolio/qr/QRGeneratorSheet.tsx` | Create | Main sheet with preview + tab bar + state |
| `src/components/portfolio/qr/tabs/TemplatesTab.tsx` | Create | Template grid |
| `src/components/portfolio/qr/tabs/ColoursTab.tsx` | Create | FG/BG colors + gradient |
| `src/components/portfolio/qr/tabs/StyleTab.tsx` | Create | Module shape + roundness |
| `src/components/portfolio/qr/tabs/LogoTab.tsx` | Create | Logo upload + size + safe zone |
| `src/components/portfolio/qr/tabs/EyesTab.tsx` | Create | Finder pattern customization |
| `src/components/portfolio/qr/tabs/OptionsTab.tsx` | Create | Export format, size, EC, quiet zone, download |
| `src/pages/PortfolioEditorPage.tsx` | Edit | Replace PortfolioQRDialog import with QRGeneratorSheet |

