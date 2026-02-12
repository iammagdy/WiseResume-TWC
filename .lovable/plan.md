

# Remove Upload Tab from Bottom Navigation

## What Changes

The "Upload" tab will be removed from the bottom navigation bar, leaving a clean 4-tab layout: **Home, Editor, Jobs, Settings**. Upload functionality remains accessible via the "Upload PDF" quick action chip on the Home (Dashboard) page, which already exists.

## Changes by File

### 1. `src/components/layout/BottomTabBar.tsx`
- Remove the Upload tab entry from the `tabs` array (lines 30-35)
- Remove the `Upload` icon import from lucide-react

### 2. `src/components/layout/AppShell.tsx`
- Remove `'/upload'` from the `TAB_ROUTES` array so the bottom nav still shows when visiting `/upload` via the quick action chip (actually, keep it so the shell wraps the upload page -- but the tab just won't be in the bar)

### 3. `src/lib/navigation.ts`
- Update the `BACK_ROUTES` mapping: `/upload` should still navigate back to `/dashboard`
- No other changes needed

No other files need changes. The Dashboard's `QuickActionChips` component already has an "Upload PDF" button that navigates to `/upload`, so upload remains easily accessible from the home page.

## Result
- Bottom bar: **Home | Editor | Jobs | Settings** (4 tabs, consistent for all users)
- Upload page still works when navigated to from the dashboard's quick action chip
- The upload route remains inside `AppShell` so it gets the standard layout

