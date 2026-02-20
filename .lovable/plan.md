

# Fix: Move WhatsNewDialog Outside Routes

## Problem
`<WhatsNewDialog />` is currently nested inside the `<Routes>` block in `App.tsx` (around line 157), but React Router requires all direct children of `<Routes>` to be `<Route>` components. This crashes the entire app.

## Solution
Move `<WhatsNewDialog />` out of the `<Routes>` block and place it as a sibling, right after `</Routes>` but still inside `AppRoutes`. This keeps it within the authenticated context while satisfying React Router's constraints.

## File Change

### `src/App.tsx`
- Remove `<WhatsNewDialog />` from inside the `<ProtectedRoute>` route group (line ~157)
- Place it after the `</Routes>` closing tag (around line 165), so it renders globally for all authenticated users without being constrained by React Router's child rules

The component will still function correctly since it internally checks authentication state and fetches changelog data independently.

