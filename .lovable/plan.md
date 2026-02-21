

# Fix: "View full changelog" Opens Settings Page Instead of Changelog

## Problem
When a user clicks "View full changelog" in the What's New dialog, it navigates to `/settings` -- landing on the general settings page. The changelog is actually a dialog *within* Settings, opened by `setChangelogOpen(true)`, so users never see it.

## Solution
Navigate to `/settings` with a query parameter (`?changelog=true`), then have the Settings page read that parameter on mount and auto-open the changelog dialog.

### File: `src/components/WhatsNewDialog.tsx`
- Change the navigate call from `navigate('/settings')` to `navigate('/settings?changelog=true')` so the Settings page knows to open the changelog dialog automatically.

### File: `src/pages/SettingsPage.tsx`
- On mount, read the URL search params. If `changelog=true` is present, set `changelogOpen` to `true` and remove the query param from the URL (to keep things clean on refresh).

### Technical Detail

**WhatsNewDialog.tsx** (line 88):
```tsx
navigate('/settings?changelog=true')
```

**SettingsPage.tsx** (new useEffect):
```tsx
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('changelog') === 'true') {
    setChangelogOpen(true);
    params.delete('changelog');
    window.history.replaceState({}, '', `${window.location.pathname}`);
  }
}, []);
```

No other files need changes.
