

## Remove Phone Authentication

### Changes

**1. File: `src/pages/AuthPage.tsx`**

- Remove the `AuthMethodToggle` import and component usage (line 14, line 311)
- Remove `Phone` icon import (line 4)
- Remove `AuthMethod` type and `authMethod` state (lines 22, 29)
- Remove `phone` state and `phoneSchema` (lines 19, 31)
- Remove `getPhoneError`, `phoneError` (lines 52-56, 65)
- Remove `phone` from `touched` state (lines 38-43)
- Remove phone-related branches in `validateInputs` and `handleSubmit` (lines 88-96, 110-112, 121-123)
- Remove the conditional rendering that switches between email/phone input fields (lines 314-334) -- keep only the email input
- Always use email-based auth flow

**2. File: `src/components/auth/AuthMethodToggle.tsx`**

- Delete this file entirely as it is no longer needed

### Result

The auth page will show only the email + password form with Google/Apple social login. No phone option visible anywhere.

