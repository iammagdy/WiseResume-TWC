

# Fix QR Code Download Branding Text

## Problem

When downloading the QR code as PNG, the "Wise Resume" gradient text renders as a solid colored rectangle instead of readable text. This happens because `html2canvas` does not support the CSS `background-clip: text` technique used for the gradient text effect.

## Solution

Update `QRBrandedFrame` so that when `isCapture` is true (used during the `html2canvas` capture), the "Wise Resume" text uses a simple solid color (#a855f7) instead of the unsupported gradient-clip technique. The live preview in the sheet continues to show the gradient as before.

## Technical Changes

### File: `src/components/portfolio/qr/QRBrandedFrame.tsx`

- Split the "Wise Resume" span rendering into two paths:
  - **Default (interactive preview):** Keep the existing `background-clip: text` gradient styling
  - **Capture mode (`isCapture=true`):** Use a plain `color: '#a855f7'` style with no background-clip or text-fill-color properties
- This is a ~5-line change in a single file

