

# Fix All Portfolio Links to Use Custom Domain

## Problem
Portfolio links throughout the app use either `window.location.origin` (producing long Lovable preview URLs) or hardcoded `wiseresume.lovable.app` / `wiseresume.app`. Your actual custom domain is `wiseresume.magdysaber.com`.

## Solution
Create a single utility file that defines your canonical domain. Every place that builds a shareable/copyable URL will import from it, so when you change domains in the future, you only edit one file.

## Changes

### 1. Create `src/lib/portfolioUrl.ts` (new file)
```
PORTFOLIO_DOMAIN = "https://wiseresume.magdysaber.com"

getPortfolioUrl(username) -> "https://wiseresume.magdysaber.com/p/username"
getAppUrl()               -> "https://wiseresume.magdysaber.com"
```

### 2. `src/pages/PortfolioEditorPage.tsx` (line 475)
- Replace `${window.location.origin}/p/${username}` with `getPortfolioUrl(username)`
- Fixes: Copy Link, Share, and QR code data

### 3. `src/pages/ProfilePage.tsx` (lines 52, 155)
- Replace both `${window.location.origin}/p/${profile.username}` with `getPortfolioUrl(profile.username)`
- Fixes: Share Profile and Preview button

### 4. `src/components/portfolio/PortfolioQRDialog.tsx` (line 45)
- Replace fallback `'https://wiseresume.lovable.app'` with `getAppUrl()`

### 5. `src/components/portfolio/CareerCardSheet.tsx` (line 477)
- Replace `https://wiseresume.app/p/${username}` with `getPortfolioUrl(username)`
- Fixes: LinkedIn share URL

### 6. `src/components/dashboard/ResumeListCard.tsx` (line 399)
- Replace hardcoded `'https://wiseresume.lovable.app'` with `getAppUrl()`
- Fixes: Resume share link

### 7. `src/pages/SettingsPage.tsx` (line 255)
- Replace `'https://wiseresume.lovable.app'` with `getAppUrl()`
- Fixes: "Share WiseResume" action

### 8. `supabase/functions/portfolio-meta/index.ts` (line 54)
- Replace `'https://wiseresume.lovable.app'` with `'https://wiseresume.magdysaber.com'`
- Fixes: OG meta tags and canonical URL for social previews

## What stays the same
- Display text (`WiseResume/username`) -- unchanged
- CORS origins in `_shared/cors.ts` -- keep both domains for compatibility
- Auth/OAuth redirect URLs -- unchanged (those must use `window.location.origin`)
- QR code styling and design -- unchanged
- All internal app navigation -- unchanged

## Files affected (8 total)
| File | Action |
|------|--------|
| `src/lib/portfolioUrl.ts` | Create (single source of truth) |
| `src/pages/PortfolioEditorPage.tsx` | 1 line change |
| `src/pages/ProfilePage.tsx` | 2 line changes |
| `src/components/portfolio/PortfolioQRDialog.tsx` | 1 line change |
| `src/components/portfolio/CareerCardSheet.tsx` | 1 line change |
| `src/components/dashboard/ResumeListCard.tsx` | 1 line change |
| `src/pages/SettingsPage.tsx` | 1 line change |
| `supabase/functions/portfolio-meta/index.ts` | 1 line change |

## Future-proof
When you get a new domain, just update the single constant in `src/lib/portfolioUrl.ts` and the one in the backend function -- every link across the app updates automatically.
