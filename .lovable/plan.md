

# Fix 404 Page and Add Missing Route Aliases

## Problem
1. The user landed on `/jobs/:id` but the defined route is `/job/:id` (singular). This causes a 404.
2. The 404 page only shows a single "Go to Dashboard" button -- it should offer more helpful navigation options.

## Changes

### 1. Add route aliases in `src/App.tsx`
Add redirect routes for common plural/singular mismatches so users never hit 404 for valid-ish URLs:

- `/jobs/:id` redirects to `/job/:id`  
- `/jobs` redirects to `/applications` (the closest listing page)

### 2. Improve the `src/pages/NotFound.tsx` page
Replace the single button with multiple navigation options so users can find their way:

- **Go to Dashboard** -- primary action
- **My Resumes** -- link to `/dashboard`
- **Applications** -- link to `/applications`
- **AI Studio** -- link to `/ai-studio`
- **Go Back** -- uses browser history (`navigate(-1)`) if available

This gives users clear paths forward instead of a dead end.

## Technical Details

### `src/App.tsx`
Add inside the protected routes block, before the catch-all:
```tsx
<Route path="/jobs/:id" element={<Navigate to="/job/:id" replace />} />
<Route path="/jobs" element={<Navigate to="/applications" replace />} />
```

Note: React Router `Navigate` does not interpolate params, so we need a small wrapper component that reads `useParams` and redirects to `/job/${id}`.

### `src/pages/NotFound.tsx`
- Add quick-link buttons below the primary CTA in a grid layout
- Each button has an icon + label for easy scanning
- Keep the existing auth-aware primary button logic
- Add a "Go Back" option using `navigate(-1)` as a secondary action

