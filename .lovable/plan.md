
# Portfolio URL Branding Fix + QR Code Generator

## Problem Summary

The Status card currently:
- **Displays**: `wiseresume.lovable.app/p/magdy` — exposes "lovable" brand to users
- **Copies**: `https://wiseresume.lovable.app/p/magdy` — hardcoded string, not dynamic
- **Missing**: No QR code feature

## The Fix Strategy

### 1 — Display URL (visual only)
Show a friendly branded label `wiseresume.app/p/username` — no "lovable" visible.

This is purely cosmetic: the `portfolioDisplayUrl` variable is just for the `<span>` in the UI.

```
Display: wiseresume.app/p/magdy     ← user sees this
```

### 2 — Copy URL (actual link)
Use `window.location.origin` so the copied URL is always the real domain the app is running on — whether that's the custom domain (`wiseresume.magdysaber.com`) or the lovable subdomain (`wiseresume.lovable.app`). This is dynamic and future-proof.

```typescript
const actualPortfolioUrl = username
  ? `${window.location.origin}/p/${username}`
  : '';

const portfolioDisplayUrl = username
  ? `wiseresume.app/p/${username}`    // display-only, no "lovable"
  : '';
```

The `handleCopyUrl` writes `actualPortfolioUrl` to clipboard — always the correct full link.

The "Preview Live Site" button also uses `actualPortfolioUrl` to open the real link.

### 3 — QR Code Generator
Add a "Get QR Code" button in the Status card (shown only when portfolio is Live + username is set). Tapping it toggles a QR modal/sheet showing the QR code image + a download button.

**No npm package needed.** Use the free `https://api.qrserver.com/v1/create-qr-code/` service:
```
https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=ENCODED_URL&color=e84545&bgcolor=0a0a14
```

The QR image is rendered in a `Dialog` with:
- The QR code image (sized 250×250, accent-colored foreground matching the user's portfolio accent)
- The short display URL below it
- A "Download QR" button that fetches the image and triggers a download
- A "Copy Link" button (same as the existing copy)
- A "Share" button (Web Share API if available)

### QR Code Dialog Layout
```
┌────────────────────────────────────┐
│         📱 Your Portfolio QR       │
│                                    │
│    ┌──────────────────────┐        │
│    │   [QR CODE IMAGE]    │        │
│    │     250 × 250 px     │        │
│    └──────────────────────┘        │
│                                    │
│    wiseresume.app/p/magdy          │
│                                    │
│  [Download QR]  [Copy Link]        │
└────────────────────────────────────┘
```

## Files Changed

| File | Change |
|------|--------|
| `src/pages/PortfolioEditorPage.tsx` | Split `portfolioUrl` into `portfolioDisplayUrl` (branded) + `actualPortfolioUrl` (real); fix copy/preview to use actual; add `showQR` state + `QRCodeDialog` component; add QR button to Status card |

No new dependencies. No DB changes. No edge functions.

## What's Not Changed
- The `/p/:username` public route works identically
- `useProfile`, `PublicPortfolioPage` — untouched
- All other collapsible sections

## Risk
Very low — display-only string change + a new Dialog component using an external image URL. The QR image loads from `api.qrserver.com` (free, no API key, extremely reliable service). If the user's network blocks it the `<img>` simply shows broken — no crash.
