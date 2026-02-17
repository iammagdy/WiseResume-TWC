

## Harden Biometric Lock: Security Curtain

### Problem
When the app goes to background on native platforms, the OS may capture a screenshot of the current screen for the app switcher. This exposes sensitive resume data before the biometric lock can activate. There is a timing gap between the `appStateChange` event and the lock screen rendering.

### Solution
Add a synchronous "security curtain" that blurs the entire app immediately when it enters the background, and only removes the blur after biometric authentication succeeds. This runs via `useLayoutEffect`-style DOM manipulation to beat the OS screenshot.

### Changes

**1. Modified: `src/hooks/useBiometricLock.ts`**

- Add a `useLayoutEffect` that applies/removes a CSS class `wr-security-curtain` on `document.body`
- When the app goes to background (`isActive === false`): immediately set `document.body.classList.add('wr-security-curtain')` **inside the listener callback**, synchronously, before any async logic
- When the app returns to foreground: keep the curtain on -- do NOT remove it here
- Remove the curtain class only in two places:
  - Inside `authenticate()` after `verifyIdentity` succeeds (before setting `isLocked = false`)
  - Inside `unlock()` manual override
- On cleanup / when `enabled` is `false`, also remove the class
- Guard all curtain logic behind `Capacitor.isNativePlatform()` so web PWA is unaffected
- Fix the stale `backgroundTime` closure bug: use a `useRef` for `backgroundTimeRef` instead of state, so the listener always reads the current value

**2. Modified: `src/index.css`**

- Add the CSS rule:
```css
body.wr-security-curtain {
  filter: blur(20px);
  pointer-events: none;
  transition: filter 0.15s ease-out;
}
```
- `pointer-events: none` prevents any interaction while blurred
- Short transition for smooth unblur after auth succeeds

**3. Modified: `src/components/BiometricLockScreen.tsx`**

- No functional changes needed. The lock screen already renders at `z-[100]` with `bg-background`, so it will sit on top of the blurred content. The blur is just the extra safety net for the app-switcher screenshot.

### Technical Details

**Curtain lifecycle on native:**

```text
User taps Home / switches app:
  appStateChange(isActive: false)
    -> document.body.classList.add('wr-security-curtain')  [synchronous, immediate]
    -> backgroundTimeRef.current = Date.now()

OS captures screenshot for app switcher:
    -> Screenshot shows blurred content (curtain is already applied)

User returns to app:
  appStateChange(isActive: true)
    -> Check elapsed time vs lockTimeout
    -> If exceeded: setIsLocked(true) -- BiometricLockScreen renders on top
    -> If NOT exceeded: remove curtain class (no lock needed)

User authenticates via BiometricLockScreen:
  authenticate() succeeds
    -> document.body.classList.remove('wr-security-curtain')
    -> setIsLocked(false)
```

**backgroundTime ref fix:**

The current implementation uses `backgroundTime` as React state inside the `appStateChange` listener, but the listener captures a stale closure. Switching to `useRef` ensures the foreground handler always reads the correct timestamp.

```text
Before (buggy):
  const [backgroundTime, setBackgroundTime] = useState(null)
  // listener captures initial backgroundTime = null forever

After (fixed):
  const backgroundTimeRef = useRef<number | null>(null)
  // listener reads backgroundTimeRef.current -- always fresh
```

### Files Changed
- `src/hooks/useBiometricLock.ts` -- security curtain logic, backgroundTime ref fix
- `src/index.css` -- `.wr-security-curtain` CSS class
