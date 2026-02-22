

# Remove "What's New" Dialog

## What Changes

The auto-popup `WhatsNewDialog` that appears 1.5 seconds after app load will be removed. Users will only see the changelog through the Settings page, where it already exists as a full changelog viewer.

## Files Modified

| File | Change |
|------|--------|
| `src/App.tsx` | Remove the `WhatsNewDialog` lazy import and its `<Suspense>` render in `AppRoutes` |
| `src/components/WhatsNewDialog.tsx` | Delete this file entirely |

## What Stays

- The `useChangelogBadge` hook and `getChangelog()` utility remain -- they power the "new updates" badge dot on the Dashboard/Settings tabs and the full changelog viewer in Settings.
- The changelog section inside `SettingsPage` remains fully functional.
- The badge dot on BottomTabBar/DesktopNav still appears to nudge users toward Settings when a new version is available.

