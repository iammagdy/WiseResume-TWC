

# Fix: Status Bar Hidden on Native Android APK

## Root Cause

Two issues combine to hide the status bar permanently:

1. **Splash screen config** in `capacitor.config.ts` sets `splashFullScreen: true` and `splashImmersive: true`. These enable Android's immersive sticky mode, which hides the status bar AND navigation bar. Once the splash dismisses, the immersive flags remain active.

2. **`useStatusBar` hook** calls `setBackgroundColor` and `setStyle` but never calls `StatusBar.show()` or `StatusBar.setOverlaysWebView(false)`. So even though we configure the status bar color, the bar itself stays hidden from the splash screen's immersive mode.

## Changes

### 1. `capacitor.config.ts`
- Set `splashFullScreen: false` and `splashImmersive: false` to prevent the splash screen from entering immersive mode and hiding the system bars.

### 2. `src/hooks/useStatusBar.ts`
- Add `StatusBar.show()` and `StatusBar.setOverlaysWebView(false)` calls inside `applyNativeStatusBar()` to explicitly ensure the status bar is visible and not overlaying the web content.
- This guarantees the status bar appears even if something else triggered fullscreen mode.

## Result
After these changes, the native APK will show the system status bar (clock, battery, signal) at the top with the correct theme-matched background color. The app content will render below the status bar, not behind it.

