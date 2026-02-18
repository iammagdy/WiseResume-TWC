
# Fix: Portfolio URL Branding + Build Error

## Two Problems to Fix

### Problem 1 — Wrong URL displayed in Portfolio card (ProfilePage)
The "My Portfolio Website" card in the Profile tab shows:
```
wiseresume.lovable.app/p/magdy
```
This is hardcoded text. The user wants to see the **real current domain** (e.g. `wiseresume.magdysaber.com/p/magdy`), and when they copy the link it should be the full real URL.

The user also clarified the display format: they want `wiseresume.magdysaber.com/p/username` — meaning the **actual `window.location.hostname`** (whatever domain the app is running on), not a fake branded URL like `wiseresume.app/p/...`.

### Problem 2 — Build error in EditProfileSheet (blocks compilation)
`EditProfileSheet.tsx` constructs a local `Profile`-shaped object at line 124 that is missing two new required fields added in the previous implementation:
- `portfolioExtras`
- `portfolioSyncMode`

---

## Files Changed

### `src/pages/ProfilePage.tsx` — 3 line fixes

**Line 52** (share URL in `handleShareProfile`):
```
// Before
const url = `https://wiseresume.lovable.app/p/${profile.username}`;
// After
const url = `${window.location.origin}/p/${profile.username}`;
```

**Line 137** (display URL text in the card):
```
// Before
<p ...>wiseresume.lovable.app/p/{profile.username}</p>
// After
<p ...>{window.location.hostname}/p/{profile.username}</p>
```
This shows exactly what the user asked for: `wiseresume.magdysaber.com/p/magdy` — the real domain, no "lovable", no fake "wiseresume.app".

**Line 155** (preview button `window.open`):
```
// Before
window.open(`https://wiseresume.lovable.app/p/${profile.username}`, ...)
// After
window.open(`${window.location.origin}/p/${profile.username}`, ...)
```

### `src/components/settings/EditProfileSheet.tsx` — 2 line fix (build error)

At line 124, the local `currentFormProfile` object is missing `portfolioExtras` and `portfolioSyncMode`. Add them with null/default values so the type check passes:

```typescript
portfolioExtras: null,
portfolioSyncMode: 'auto' as const,
```

---

## Why `window.location.hostname` for display vs `window.location.origin` for links

- **Display** (`window.location.hostname`): Shows just `wiseresume.magdysaber.com/p/magdy` — no protocol, clean and readable, matching exactly what the user asked for.
- **Links / clipboard** (`window.location.origin`): Includes `https://` so clicking or pasting works correctly as a full URL.

---

## What Is NOT Changed
- `PortfolioEditorPage.tsx` — already fixed in previous session
- `SettingsPage.tsx` line 232 — that hardcoded URL is for the "Share App" feature (shares the app itself to others, not the user's portfolio), so `wiseresume.lovable.app` there is the app's own URL and is fine to leave
- `ResumeListCard.tsx` — that's a resume share URL, not portfolio, separate concern
- All public portfolio routes, RLS, DB — untouched
