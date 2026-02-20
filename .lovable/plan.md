
# Fix Portfolio Links to Use Custom Domain

## Problem
When users copy or share their portfolio link, the URL uses whatever domain the app is currently running on (e.g., `1d3d9943-c1ba-4253-b633-6b1457b9b330.lovableproject.com`). Your custom domain `wiseresume.magdysaber.com` should be used instead.

## Solution
Create a small utility that always returns the correct production base URL for portfolio links, regardless of where the app is running (preview, staging, or production). All places that build a `/p/username` URL will use this utility.

## Changes

### 1. Create `src/lib/portfolioUrl.ts` (new file)
A helper function `getPortfolioBaseUrl()` that:
- Returns `https://wiseresume.magdysaber.com` as the canonical production domain
- Used everywhere a shareable portfolio URL is constructed

Also export a convenience function `getPortfolioUrl(username: string)` that returns the full URL.

### 2. Update `src/pages/PortfolioEditorPage.tsx`
- Replace `${window.location.origin}/p/${username}` on line 475 with `getPortfolioUrl(username)`
- This fixes: copy link, share, QR code data, and preview button

### 3. Update `src/pages/ProfilePage.tsx`
- Replace `${window.location.origin}/p/${profile.username}` on lines 52 and 155 with `getPortfolioUrl(profile.username)`
- This fixes: share profile and preview button on the profile page

### 4. Update `src/components/portfolio/PortfolioQRDialog.tsx`
- Replace the fallback `'https://wiseresume.lovable.app'` on line 45 with the production domain from the helper

### 5. Update `src/components/portfolio/CareerCardSheet.tsx`
- Replace `https://wiseresume.app/p/${username}` on line 477 (LinkedIn share) with `getPortfolioUrl(username)`

## What stays the same
- All display text (`WiseResume/username`) -- unchanged
- QR code styling and design -- unchanged
- Navigation within the app (preview button opening in new tab will still work since the portfolio route exists on all domains)
- The `window.location.origin` usage in auth/OAuth redirects -- unchanged

## Files affected (5 total)
| File | Action |
|------|--------|
| `src/lib/portfolioUrl.ts` | Create |
| `src/pages/PortfolioEditorPage.tsx` | 1 line change |
| `src/pages/ProfilePage.tsx` | 2 line changes |
| `src/components/portfolio/PortfolioQRDialog.tsx` | 1 line change |
| `src/components/portfolio/CareerCardSheet.tsx` | 1 line change |
