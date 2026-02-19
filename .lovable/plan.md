
# Biometric System — iOS/Android Polish & Icon Fix

## Summary of Changes

Fix 6 identified issues across 4 files. The most visible change is dynamic icons throughout the entire settings + lock screen flow. The most important fix is the stuck-authenticating bug and the curtain race condition.

---

## Files to Change

### 1. `src/components/BiometricLockScreen.tsx`

**Changes:**
- Remove the redundant "Use Device Password" ghost button. The native plugin already shows a PIN/password fallback inside the system dialog when biometric fails. Having a second button that calls the same function is a UX lie. Replace it with a subtle "Having trouble?" text link that re-triggers auth — cleaner.
- Add a failed-attempt counter with a visible feedback message. After the promise rejects, increment a local `failCount` state. On failure, show a brief red flash message: "Try again" (1–2 failures) → "Face not recognized — try again or use your device password" (3+ failures).
- Fix the curtain race: the `BiometricLockScreen` component itself should apply `position: fixed; z-index: 100` and NOT be affected by the body blur. Add a CSS rule `body.wr-security-curtain > *:not(.biometric-lock-screen)` to scope the blur, OR wrap the lock screen in a portal so it renders outside `body`'s stacking context. The simplest fix: add a dedicated `data-biometric-lock` attribute to the lock screen div, and add a CSS exception in `index.css`.
- Auto-trigger improvement: currently auto-triggers after 500ms. On iOS this is fine. Add a `wasAutoTriggered` ref so that if auto-trigger fails (user cancels Face ID on the first try), the button is immediately active and not waiting for the 500ms timer again.

**New props:** Add `onFailed?: (attemptCount: number) => void` callback so the parent can log failed attempts if needed in future.

### 2. `src/components/settings/BiometricSetupSheet.tsx`

**Changes:**
- The `getIcon()` function already correctly returns `ScanFace` for Face ID and `Fingerprint` for fingerprint. No change needed here.
- Minor: change the success message from generic "Biometric Lock Enabled!" to dynamic: "Face ID Enabled!" / "Fingerprint Lock Enabled!" using `getBiometryName()`.

### 3. `src/pages/SettingsPage.tsx`

**Changes:**
- Import `ScanFace`, `Eye` icons (already has `Fingerprint` imported at line 17).
- Create a `getBiometryIcon()` helper that returns the correct Lucide icon component based on `biometryType`. Used in the Settings privacy row to replace the static `Fingerprint`.
- The Settings row that renders the biometric toggle currently shows a hardcoded `Fingerprint` icon. Change it to render `getBiometryIcon()` dynamically.
- The row label also says "Fingerprint / Face ID" — change it to be dynamic: if `biometryType === 'faceId'` → show "Face ID Lock", if `fingerprint` → show "Fingerprint Lock", fallback "Biometric Lock".

### 4. `src/hooks/useBiometricLock.ts`

**Changes:**
- Fix the `isAuthenticating` stuck state: in the `appStateChange` listener, when `isActive` becomes `true` and we need to re-lock, also reset `isAuthenticating` to `false`. This prevents the stuck "Authenticating..." UI if the user backgrounds during a scan.
- Improve the iOS `reason` string: update `verifyIdentity` options with a tighter `reason`: `"Verify your identity to open WiseResume"` — under 50 chars, fits cleanly in iOS Face ID dialog without truncation.
- Add `STRONG_BIOMETRY_TYPES` to make the type mapping future-proof: `BiometryType.STRONG_BIOMETRY` maps to `'fingerprint'` as a safe fallback for newer Android biometry types.

### 5. `src/index.css`

**Changes:**
- Add a CSS rule to exclude the biometric lock screen from the body blur curtain:
  ```css
  body.wr-security-curtain [data-biometric-lock] {
    filter: none !important;
  }
  ```
  This ensures the lock screen is always crisp and readable even while the security curtain is active on the rest of the app.

---

## Detailed Implementation

### `useBiometricLock.ts` — Stuck State Fix

In the `appStateChange` listener's `isActive` branch, before calling `setIsLocked(true)`, add:
```typescript
setIsAuthenticating(false); // Reset if stuck during OS-level background
```

### `BiometricLockScreen.tsx` — Failure Counter + Curtain Fix

```typescript
const [failCount, setFailCount] = useState(0);
const autoTriggeredRef = useRef(false);

const handleAuthenticate = async () => {
  const success = await onAuthenticate();
  if (!success) {
    setFailCount(prev => prev + 1);
  }
};

// Auto-trigger only once
useEffect(() => {
  if (autoTriggeredRef.current) return;
  autoTriggeredRef.current = true;
  const timer = setTimeout(() => handleAuthenticate(), 500);
  return () => clearTimeout(timer);
}, []);
```

Failure message rendering:
```tsx
{failCount > 0 && (
  <motion.p
    initial={{ opacity: 0, y: -8 }}
    animate={{ opacity: 1, y: 0 }}
    className="text-sm text-destructive text-center px-8 mt-2"
  >
    {failCount >= 3
      ? 'Authentication failed — use your device password below'
      : 'Try again'}
  </motion.p>
)}
```

Remove the redundant ghost "Use Device Password" button. Replace with a text link:
```tsx
<button
  onClick={handleAuthenticate}
  className="text-xs text-muted-foreground underline underline-offset-2 mt-4 h-11 touch-manipulation"
>
  {failCount >= 2 ? 'Use device password instead' : 'Try another way'}
</button>
```

Add `data-biometric-lock` attribute to the root div for the CSS curtain exception.

### `SettingsPage.tsx` — Dynamic Icon

```typescript
const getBiometryIcon = () => {
  switch (biometryType) {
    case 'faceId': return ScanFace;
    case 'iris': return Eye;
    case 'fingerprint': return Fingerprint;
    default: return Fingerprint;
  }
};

const getBiometryLabel = () => {
  switch (biometryType) {
    case 'faceId': return 'Face ID Lock';
    case 'iris': return 'Iris Lock';
    case 'fingerprint': return 'Fingerprint Lock';
    default: return 'Biometric Lock';
  }
};

const BiometryIcon = getBiometryIcon();
```

Then in the Settings row:
```tsx
icon={<BiometryIcon className="w-5 h-5" />}
label={getBiometryLabel()}
```

---

## What Does NOT Change

- The security curtain logic — it's correct
- The `appStateChange` listener structure — correct
- The `useFallback: true` in `verifyIdentity` — correct, iOS and Android handle fallback natively
- The `BiometricSetupSheet` icon logic — already correct
- The timeout sheet — works correctly
- The auto-hide after success flow — correct

---

## Platform Behavior After These Fixes

| Scenario | iOS (Face ID) | Android (Fingerprint/Touch ID) |
|---|---|---|
| Settings row icon | ScanFace icon | Fingerprint icon |
| Settings row label | "Face ID Lock" | "Fingerprint Lock" |
| Lock screen icon | ScanFace, pulsing | Fingerprint, pulsing |
| Lock screen button | "Use Face ID" | "Use Fingerprint" |
| Auth fails 1–2x | "Try again" message, button re-enabled | Same |
| Auth fails 3x+ | "Use device password instead" link | Same |
| App backgrounds during auth | isAuthenticating resets on return | Same |
| Lock screen over curtain | Crisp, not blurred | Same |
