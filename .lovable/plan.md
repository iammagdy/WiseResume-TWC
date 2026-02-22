

# Fix: Logo Navigates to Wise Orbit Landing Page

## Problem

The "WiseResume" logo/text in the app header (both mobile and desktop) is a plain text span with no click behavior. Users expect tapping the logo to take them back to the Wise Orbit landing page (`/`).

## Changes

### 1. `src/components/layout/AppShell.tsx` (line 46)

Change the "WiseResume" `<span>` to a clickable element that navigates to `/`:

```
Before: <span className="text-sm font-bold text-primary">WiseResume</span>
After:  <button onClick={() => navigate('/')} className="text-sm font-bold text-primary">WiseResume</button>
```

Add `useNavigate` import from react-router-dom (already imported via `useLocation`).

### 2. `src/components/layout/DesktopNav.tsx` (line 95)

Same change -- make the desktop nav brand text clickable:

```
Before: <span className="text-sm font-bold text-primary mr-3 select-none">WiseResume</span>
After:  <button onClick={() => navigate('/')} className="text-sm font-bold text-primary mr-3 select-none">WiseResume</button>
```

`useNavigate` is already imported in this file.

### 3. `src/lib/navigation.ts` -- Update BACK_ROUTES

Add `/home` to the back routes so pressing hardware back from the app landing page goes to Wise Orbit:

```
'/home': '/',
```

## Summary

| File | Change |
|------|--------|
| `src/components/layout/AppShell.tsx` | Make logo text a button that navigates to `/` |
| `src/components/layout/DesktopNav.tsx` | Make logo text a button that navigates to `/` |
| `src/lib/navigation.ts` | Add `/home` back route to `/` |

No new dependencies. No routing changes. Two lines changed per file.
