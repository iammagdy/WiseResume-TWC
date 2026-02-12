

# Show Bottom Tab Bar on Editor Page

## Problem

The bottom navigation bar (Home, Editor, Upload, Interview, Settings) is not visible on the `/editor` route because it is excluded from the `TAB_ROUTES` array in `AppShell.tsx`.

## Fix

### `src/components/layout/AppShell.tsx`

Add `'/editor'` and `'/preview'` to the `TAB_ROUTES` array so the bottom tab bar renders on those pages:

```typescript
const TAB_ROUTES = ['/dashboard', '/upload', '/settings', '/interview', '/auth', '/editor', '/preview'];
```

### `src/pages/EditorPage.tsx`

Add `pb-20` (or equivalent bottom padding) to the editor's root container so content does not get hidden behind the fixed bottom tab bar. This needs to account for both the BottomTabBar height and the sticky AI Studio bar.

