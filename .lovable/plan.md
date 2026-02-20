

# Styled QR Code with Embedded Logo

## Overview
Replace the plain QR code (currently fetched from an external API) with a locally-generated, styled QR code using the `qr-code-styling` library. The new QR will feature rounded purple-to-pink gradient dots, extra-rounded corners, and the WiseResume icon centered inside.

## What Changes

### 1. Install `qr-code-styling`
Add the npm package for local, customizable QR generation.

### 2. Extract QR dialog into its own component
Create **`src/components/portfolio/PortfolioQRDialog.tsx`** to keep `PortfolioEditorPage` clean. This component will:

- Accept `open`, `onOpenChange`, `portfolioUrl`, `displayUrl`, `username`, and the share handler as props
- Use `useRef` + `useEffect` to initialize `QRCodeStyling` with:
  - Dark background (`#18181b`)
  - Radial gradient dots (purple `#a855f7` to pink `#ec4899`)
  - Extra-rounded corner squares in purple, dot-style corner dots in pink
  - WiseResume icon (`wise-ai-icon.png`) centered at 35% size with error correction level "H"
- Responsive sizing: 240px on screens narrower than 360px, 280px otherwise
- Built-in download via `qrCode.download()` producing a PNG named `wiseresume-portfolio-qr.png`
- Keep the Share button and its logic passed through unchanged

### 3. Update `src/pages/PortfolioEditorPage.tsx`
- Import and render `PortfolioQRDialog` in place of the inline QR Dialog block (lines 657-687)
- Remove the `handleDownloadQR` function (lines 485-498) since download is now handled inside the new component
- Pass `handleShareQR` to the new component as a prop
- No other logic changes

### Visual Result
- Dark background (`#18181b`)
- Purple-to-pink radial gradient rounded dots
- Extra-rounded corner squares in purple
- WiseResume app icon centered inside the QR
- Soft purple glow shadow around the QR card
- Clean, modern look -- no plain black squares

### Files Affected
| File | Action |
|------|--------|
| `src/components/portfolio/PortfolioQRDialog.tsx` | Create |
| `src/pages/PortfolioEditorPage.tsx` | Edit (replace inline QR dialog + remove old download handler) |
| `package.json` | Install `qr-code-styling` |

