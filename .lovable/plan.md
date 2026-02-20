

# Update Display URL Format Across the App

## Summary
Replace all visible occurrences of `wiseresume.app/p/username` with the shorter format `WiseResume/username`. The actual functional URLs (QR data, share links, copy-to-clipboard) remain unchanged -- only the cosmetic display text is updated.

## Changes

### 1. `src/pages/PortfolioEditorPage.tsx`
- **Line 473**: Change `portfolioDisplayUrl` from `` `wiseresume.app/p/${username}` `` to `` `WiseResume/${username}` ``
- **Line 833**: Change the username hint label from `wiseresume.app/p/` to `WiseResume/`

### 2. `src/components/portfolio/PortfolioQRDialog.tsx`
- **`formatDisplayUrl` function**: Update to return `WiseResume/slug` instead of `hostname/.../slug`

### 3. `src/pages/Index.tsx`
- **Line 82**: Change the demo address bar text from `wiseresume.app/p/you` to `WiseResume/you`

### 4. `src/pages/ProfilePage.tsx`
- **Line 137**: Change the profile subtitle from `` `wiseresume.app/p/${profile.username}` `` to `` `WiseResume/${profile.username}` ``

### 5. `src/components/portfolio/CareerCardSheet.tsx`
- **Line 354**: Change the career card URL display from `` `wiseresume.app/p/${username}` `` to `` `WiseResume/${username}` ``
- **Line 594**: Same change in the exportable career card footer

### 6. `supabase/functions/og-image/index.ts`
- **Line 269**: Change the OG image bottom URL text from `` `wiseresume.app/p/${username}` `` to `` `WiseResume/${username}` ``

## What stays the same
- All actual URLs used for navigation, QR code data, sharing, and clipboard copy remain using `window.location.origin` or the real domain
- The LinkedIn share URL in CareerCardSheet (line 477) keeps using the full `https://wiseresume.app/p/` since it must be a real URL for LinkedIn
- No routing or functional logic changes

## Files modified (6 total)
| File | Lines changed |
|------|--------------|
| `src/pages/PortfolioEditorPage.tsx` | 2 lines |
| `src/components/portfolio/PortfolioQRDialog.tsx` | ~3 lines |
| `src/pages/Index.tsx` | 1 line |
| `src/pages/ProfilePage.tsx` | 1 line |
| `src/components/portfolio/CareerCardSheet.tsx` | 2 lines |
| `supabase/functions/og-image/index.ts` | 1 line |
