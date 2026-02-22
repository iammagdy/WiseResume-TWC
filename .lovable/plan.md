
# Add Changelog Badge to Settings Gear Icon

## What Changes

A small pulsing dot indicator will appear on the Settings gear icon in the Dashboard header when there's a new changelog entry the user hasn't seen. Tapping the gear navigates to `/settings`, and once the user opens the changelog in Settings, the dot disappears (the existing `markSeen` logic handles this).

## How It Works

The `useChangelogBadge` hook already tracks whether there's an unseen changelog version. The Dashboard page already imports and uses this hook (indirectly through BottomTabBar). We just need to:

1. Import and call `useChangelogBadge()` in the DashboardPage
2. Add a small badge dot (`w-2 h-2 rounded-full bg-primary animate-pulse`) positioned on the Settings gear icon button when `hasNew` is true

## File Modified

**`src/pages/DashboardPage.tsx`**
- Import `useChangelogBadge` from `@/hooks/useChangelogBadge`
- Call `const { hasNew } = useChangelogBadge()` in the component
- Wrap the Settings `<Button>` icon area with a `relative` div and add a conditional badge dot span (same pattern used on the Home tab icon in BottomTabBar)

The badge dot will look identical to the one already used on the Home tab in the bottom navigation -- a small primary-colored pulsing circle at the top-right corner of the icon.
