

# Remove Animated Panda from Auth Page

## Changes

### 1. `src/pages/AuthPage.tsx`
- Remove the `AuthPanda` import (line 14)
- Remove the `<AuthPanda ... />` JSX block (lines 215-222)
- Remove the panda-related state variables and helpers that are no longer needed:
  - `focusedField` state (line 42)
  - `owlShake` state (line 43)
  - `owlSuccess` state (line 44)
  - `blurTimeout` ref (line 45)
  - `textLength` computation (lines 47-49)
  - `handleFocus` function (lines 78-81)
  - `handleBlur` function (lines 83-85)
  - `triggerShake` function (lines 87-90)
  - `triggerSuccess` function (lines 92-95)
- Remove all `onFocus={handleFocus}` and `onBlur={handleBlur}` props from input fields
- Replace `triggerShake()` calls with just the error toast (keep the toast)
- Replace `triggerSuccess()` calls with just the success logic (keep the redirect/toast)

### 2. `src/components/auth/AuthPanda.tsx`
- Delete this file entirely (no longer used)

### 3. Optional cleanup
- Delete `src/components/auth/AuthMonkey.tsx` and `src/components/auth/AuthOwl.tsx` if they still exist (unused legacy files)

