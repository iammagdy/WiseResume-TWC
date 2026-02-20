
# Add "Replay Splash Screen" to Settings

## What Changes

Add a new button row in the **About & Help** section of Settings, right after the existing "Take Tour Again" row, that resets the `hasSeenSplash` flag and navigates the user back to the root so the animated splash replays.

## File Modified

### `src/pages/SettingsPage.tsx`

Insert a new `SettingsRow` + `Separator` after the "Take Tour Again" row (after line 863):

```tsx
<Separator className="bg-border/30" />
<SettingsRow
  type="button"
  label="Replay Splash Screen"
  description="Re-watch the animated intro"
  icon={<Sparkles className="w-4 h-4" />}
  onClick={() => {
    haptics.light();
    setHasSeenSplash(false);
    toast.success('Replaying splash…');
    navigate('/');
  }}
/>
```

This requires destructuring `setHasSeenSplash` from the existing `useSettingsStore()` call (already imports `hasSeenSplash`-related setters from the store).

## How It Works

1. User taps "Replay Splash Screen" in Settings > About & Help
2. `hasSeenSplash` is set to `false` in the persisted Zustand store
3. App navigates to `/` which triggers `AppRoutes` to check the flag
4. Since `hasSeenSplash` is now `false`, the `AnimatedSplash` component renders
5. After the animation completes, `hasSeenSplash` is set back to `true`

No new files, no new dependencies, no database changes.
