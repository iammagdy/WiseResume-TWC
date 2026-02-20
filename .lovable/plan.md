

# Simplify QR Code Studio + Add Branded Frame

## What Changes

### 1. Always embed the WiseResume logo (silently)

The logo will always be included in the generated QR code by default. The Logo tab will be removed entirely from the UI so users cannot disable or replace it. Internally, the state will always have `logo.enabled: true` with the WiseResume logo as the source.

### 2. Add a "Made with WiseResume" branded frame

Below the QR code (both in preview and in the downloaded image), a footer frame will display "Made with WiseResume" text. This frame will:
- Render as part of the QR code preview area with the app's purple gradient styling
- Be included in the downloaded image by wrapping the QR + frame in a container and using `html2canvas` to capture the full composite
- In the live preview, the text will be clickable/tappable, linking to `https://wiseresume.magdysaber.com`

### 3. Simplify the tab structure from 6 tabs to 3

Current tabs (6): Templates, Colours, Style, Logo, Eyes, Options

New tabs (3):
- **Templates** -- Keep as-is (quick one-tap presets)
- **Customize** -- Merge Colours + Style + Eyes into a single scrollable panel with sections: Color pickers (foreground/background), gradient toggle, module shape selector, and corner style selector
- **Export** -- Slim down Options to just: format (PNG/SVG), size (512/1024/2048), and preview background toggle. Remove quiet zone slider and error correction selector (auto-set to H since logo is always on)

### 4. Remove deleted tab files

Delete files that are no longer needed:
- `src/components/portfolio/qr/tabs/LogoTab.tsx` (logo is always on, no UI needed)
- `src/components/portfolio/qr/tabs/ColoursTab.tsx` (merged into Customize)
- `src/components/portfolio/qr/tabs/StyleTab.tsx` (merged into Customize)
- `src/components/portfolio/qr/tabs/EyesTab.tsx` (merged into Customize)
- `src/components/portfolio/qr/tabs/OptionsTab.tsx` (replaced by simpler Export tab)

### 5. New files to create

- `src/components/portfolio/qr/tabs/CustomizeTab.tsx` -- Combined colours + style + eyes in one scrollable view
- `src/components/portfolio/qr/tabs/ExportTab.tsx` -- Simplified export options
- `src/components/portfolio/qr/QRBrandedFrame.tsx` -- The "Made with WiseResume" footer component

---

## Technical Details

### Branded frame in downloads

Since `qr-code-styling` only generates the QR itself, to include the frame in downloads:
- Wrap the QR preview and frame text in a single container div
- Use `html2canvas` (already installed) to capture the composite as a PNG
- For SVG export, programmatically append a text element below the QR SVG

### State changes

- `logo.enabled` will be hardcoded to `true` in the initial state and never toggled
- `options.errorCorrection` will be locked to `'H'` (required for logo reliability)
- `options.quietZone` will default to `6` and not be user-configurable
- Remove `templateId` reset for logo changes since logo is constant

### QR types cleanup

- Remove `QRLogo.enabled` from being user-togglable (keep the type for internal use)
- The `LogoTab` import and tab entry will be removed from `QRGeneratorSheet.tsx`

### CustomizeTab layout (single scrollable panel)

```
[Color Section]
  Foreground picker | Background picker
  Gradient toggle + controls (if enabled)

[Shape Section]  
  Module shape grid (6 options)

[Corner Style Section]
  Outer shape (3 options) | Inner dot (2 options)
```

### ExportTab layout

```
[Format] PNG | SVG
[Size] 512 | 1024 | 2048
[Preview BG] Light | Dark
```

### Files modified

| File | Change |
|---|---|
| `QRGeneratorSheet.tsx` | Remove Logo/Colours/Style/Eyes/Options tab imports; add CustomizeTab + ExportTab; add branded frame below QR preview; update download logic to capture frame; lock logo state |
| `qr-types.ts` | No structural changes needed (types stay for internal use) |
| `qr-templates.ts` | Ensure all templates keep logo enabled with WiseResume src |
| `TemplatesTab.tsx` | Always force logo enabled when applying any template |

### Files deleted

| File |
|---|
| `tabs/LogoTab.tsx` |
| `tabs/ColoursTab.tsx` |
| `tabs/StyleTab.tsx` |
| `tabs/EyesTab.tsx` |
| `tabs/OptionsTab.tsx` |

### Files created

| File |
|---|
| `tabs/CustomizeTab.tsx` |
| `tabs/ExportTab.tsx` |
| `QRBrandedFrame.tsx` |

