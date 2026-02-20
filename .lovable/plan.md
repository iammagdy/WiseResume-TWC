

# Fix Non-Functional Back Button on Portfolio Page

## Problem

The portfolio editor page (`/portfolio`) uses `navigate(-1)` for its back button, which is unreliable in Capacitor WebViews and deep-linked sessions where browser history may be empty. When there's no history entry to go back to, the button does nothing.

Every other page in the app uses explicit route navigation (e.g., `navigate('/dashboard')`), making this the only instance of the broken pattern.

## Scope of Issue

After a full audit of all pages with back buttons:
- **Only `/portfolio` uses `navigate(-1)`** -- this is the sole broken instance
- All other pages (Settings, Editor, Preview, Upload, Interview, Cover Letters, Resignation Letters, Guides, Career, etc.) already use explicit routes like `navigate('/dashboard')` or `navigate('/applications')`

## Fix

### File: `src/pages/PortfolioEditorPage.tsx` (line 378)

Replace `navigate(-1)` with `navigate('/dashboard')` to match the `BACK_ROUTES` mapping and the pattern used by every other page.

```text
Before: onClick={() => navigate(-1)}
After:  onClick={() => navigate('/dashboard')}
```

One line change, consistent with the rest of the app.

