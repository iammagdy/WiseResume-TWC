
# Biometric Lock for Resume Data Protection

## Overview

Add a biometric authentication option that requires fingerprint or face authentication when opening the app. This protects sensitive resume data (personal info, work history, contact details) from unauthorized access on shared devices.

---

## User Experience Flow

```text
┌─────────────────────────────────────────┐
│  Settings > Privacy                     │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🔐 Biometric Lock          [OFF]│   │
│  │     Require authentication      │   │
│  └─────────────────────────────────┘   │
│                                         │
│  When toggled ON:                       │
│  → Check if biometrics available        │
│  → Prompt user to authenticate once     │
│  → Enable lock on future app opens      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  App Launch (when lock enabled)         │
│                                         │
│         ┌───────────────┐              │
│         │    🔒 WR     │              │
│         │               │              │
│         │  Touch sensor │              │
│         │  to unlock    │              │
│         └───────────────┘              │
│                                         │
│        [Use Password Instead]           │
└─────────────────────────────────────────┘
```

---

## Technical Approach

### Plugin Selection

Using `@capgo/capacitor-native-biometric` because:
- Actively maintained for Capacitor 7/8
- Supports Face ID, Touch ID, fingerprint, and iris
- Allows device credential fallback (PIN/pattern)
- TypeScript support built-in
- Works on Android and iOS

---

## Implementation Details

### New Files

| File | Purpose |
|------|---------|
| `src/hooks/useBiometricLock.ts` | Core biometric authentication logic |
| `src/components/BiometricLockScreen.tsx` | Full-screen lock UI when app opens |
| `src/components/settings/BiometricSetupSheet.tsx` | Setup flow with explanation |

### Modified Files

| File | Changes |
|------|---------|
| `src/store/settingsStore.ts` | Add `biometricLockEnabled` state |
| `src/pages/SettingsPage.tsx` | Add biometric toggle in Privacy section |
| `src/App.tsx` | Add BiometricLockScreen wrapper |
| `capacitor.config.ts` | Add biometric plugin config |
| `package.json` | Add `@capgo/capacitor-native-biometric` dependency |

---

## State Management

### Settings Store Addition

```typescript
// In settingsStore.ts
interface SettingsState {
  // ... existing
  biometricLockEnabled: boolean;
  setBiometricLockEnabled: (value: boolean) => void;
}
```

---

## Component Design

### 1. BiometricLockScreen

Full-screen overlay shown on app launch when biometric lock is enabled.

**UI Elements:**
- App logo centered
- Lock icon with pulse animation
- "Touch to unlock" or "Look to unlock" text (based on biometry type)
- "Use Password Instead" button (device credential fallback)
- Smooth fade-out animation on success

**Behavior:**
- Automatically triggers biometric prompt on mount
- Shows lock screen until authenticated
- Haptic feedback on success/failure
- Graceful fallback if biometrics unavailable

### 2. BiometricSetupSheet

Shown when user enables biometric lock for the first time.

**Content:**
- Explanation of what data is protected
- Icon showing Face ID or fingerprint based on device
- "Enable" button that triggers test authentication
- Cancel option

---

## Hook: useBiometricLock

```typescript
interface UseBiometricLockReturn {
  // State
  isAvailable: boolean;
  biometryType: 'faceId' | 'fingerprint' | 'iris' | 'none';
  isLocked: boolean;
  isAuthenticating: boolean;
  
  // Actions
  authenticate: () => Promise<boolean>;
  checkAvailability: () => Promise<void>;
  unlock: () => void;
  lock: () => void;
}
```

**Key Features:**
- Detects available biometry type on mount
- Returns human-readable type for UI customization
- Handles authentication with success/error callbacks
- Manages locked/unlocked state for app lifecycle

---

## App Lifecycle Integration

### When to Show Lock Screen

1. **App opened from closed state** - Always if enabled
2. **App resumed from background** (after 30s) - Configurable timeout
3. **Never** - While actively using (short background like taking a photo)

### Implementation in App.tsx

```typescript
function AppWithBiometricLock() {
  const { biometricLockEnabled } = useSettingsStore();
  const { isLocked, authenticate, isAvailable } = useBiometricLock();
  
  // Show lock screen if enabled and locked
  if (biometricLockEnabled && isLocked && isAvailable) {
    return <BiometricLockScreen onUnlock={authenticate} />;
  }
  
  return <AppRoutes />;
}
```

---

## Settings UI Integration

### Privacy Section Update

```text
PRIVACY
┌─────────────────────────────────────────┐
│ 🔐 Biometric Lock                    OFF│
│     Protect your resumes                │
├─────────────────────────────────────────┤
│ ☁️  Local-Only Mode                  OFF│
│     Keep data on device only            │
├─────────────────────────────────────────┤
│ 📊 Analytics                          ON│
│     Help improve WiseResume             │
└─────────────────────────────────────────┘
```

**Toggle Behavior:**
- **ON**: Check biometrics → Show setup sheet → Test auth → Enable
- **OFF**: Immediate disable, no confirmation needed

---

## Platform-Specific Considerations

### Android
- Add to `android/app/src/main/AndroidManifest.xml`:
  ```xml
  <uses-permission android:name="android.permission.USE_BIOMETRIC" />
  ```
- Fingerprint, face, and iris supported

### iOS
- Add to `ios/App/App/Info.plist`:
  ```xml
  <key>NSFaceIDUsageDescription</key>
  <string>Unlock your resumes securely with Face ID</string>
  ```
- Face ID and Touch ID supported

### Web (Fallback)
- Show toggle as disabled with "Available on mobile app" tooltip
- Or hide entirely on web platform

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Biometrics not enrolled | Show "Set up in device settings" message |
| User cancels auth | Stay on lock screen, allow retry |
| Multiple failures | Offer device credential (PIN) fallback |
| Auth error | Show error toast, haptic feedback |
| Biometrics unavailable | Disable toggle, show explanation |

---

## Security Notes

- Biometric lock protects app access, not stored data encryption
- Data is still protected by Supabase auth when cloud-synced
- For offline data, this adds a layer of access control
- Does not replace device-level security (PIN/pattern)

---

## Implementation Order

1. Install `@capgo/capacitor-native-biometric` package
2. Create `useBiometricLock` hook with availability check
3. Add `biometricLockEnabled` to settings store
4. Create `BiometricLockScreen` component
5. Create `BiometricSetupSheet` for first-time setup
6. Update `SettingsPage.tsx` with toggle in Privacy section
7. Wrap app in `App.tsx` with lock screen logic
8. Update Capacitor config for native permissions
9. Test on device (biometrics don't work in browser)

---

## Mobile UX Features

- **Haptic feedback** on successful unlock (success pattern)
- **Haptic feedback** on failed attempt (error pattern)
- **Auto-trigger** biometric prompt (no tap required)
- **Smooth animation** on unlock transition
- **Touch-friendly** fallback button (48px height)
- **Dynamic text** based on biometry type ("Use Face ID" vs "Touch fingerprint")

---

## Expected Outcome

After implementation:

1. Users can enable biometric lock from Settings > Privacy
2. App shows lock screen on launch when enabled
3. Fingerprint/Face ID instantly unlocks the app
4. Device PIN/pattern works as fallback
5. Professional, native-feeling security feature
6. Haptic feedback provides tactile confirmation
7. Graceful handling of unsupported devices
