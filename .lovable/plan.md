

# Fix Mobile Dialog/Popup Display Across the App

## Problem
The OCR prompt dialog (and several other popups) get clipped or overflow on mobile screens because they lack consistent mobile-width constraints. The screenshot shows the dialog cut off on the right side.

## Root Cause
- `OCRPromptDialog` uses only `sm:max-w-md` with no explicit mobile max-width
- The base `DialogContent` has `max-w-[calc(100%-2rem)]` but this can be overridden by component-level classes
- Several dialogs across the app use different approaches to mobile sizing, leading to inconsistency

## Solution
Fix the base `DialogContent` component to enforce safe mobile sizing, then audit and fix all dialog components that override width.

### 1. Harden the base DialogContent mobile sizing
**File: `src/components/ui/dialog.tsx`**

Update the non-fullScreenOnMobile class string to use `max-w-[min(calc(100vw-2rem),var(--dialog-max-w,32rem))]` so all dialogs are automatically constrained to viewport width minus safe margins. This way component-level classes like `sm:max-w-md` only take effect at larger screens.

Alternatively (simpler approach): just ensure `w-[calc(100vw-2rem)]` is the base width on mobile so the dialog always fits with 1rem margin on each side, and component-level `sm:max-w-*` classes control desktop sizing.

### 2. Fix OCRPromptDialog specifically
**File: `src/components/upload/OCRPromptDialog.tsx`**

Change `className="sm:max-w-md"` to `className="max-w-[min(calc(100vw-2rem),28rem)]"` to ensure the dialog never exceeds the viewport on any screen size.

### 3. Audit and fix other dialogs with similar issues
Apply consistent mobile-safe max-width to these dialogs:
- `CreateResumeDialog.tsx` -- has `sm:max-w-md` (same issue)
- `SyncConflictDialog.tsx` -- no max-width constraint at all
- `UnsavedChangesDialog.tsx` -- no max-width constraint at all
- `ApplyPromptDialog.tsx` -- has `max-w-sm` (may overflow on 320px screens)
- `SignInPromptDialog.tsx` -- has `max-w-sm` (same concern)
- `DeleteDataDialog.tsx` -- already uses `max-w-[90vw] sm:max-w-md` (good pattern)

The fix for each is to adopt the pattern from `DeleteDataDialog`: `max-w-[90vw] sm:max-w-md` (or similar), ensuring the dialog never exceeds 90% viewport width on mobile.

### 4. Ensure AlertDialogContent matches
**File: `src/components/ui/alert-dialog.tsx`**

Verify AlertDialogContent also enforces `max-w-[calc(100%-2rem)]` for mobile safety, matching the Dialog component.

## Files Changed

| File | Change |
|------|--------|
| `src/components/upload/OCRPromptDialog.tsx` | Add mobile-safe max-width |
| `src/components/dashboard/CreateResumeDialog.tsx` | Add mobile-safe max-width |
| `src/components/editor/SyncConflictDialog.tsx` | Add mobile-safe max-width |
| `src/components/editor/UnsavedChangesDialog.tsx` | Add mobile-safe max-width |
| `src/components/applications/ApplyPromptDialog.tsx` | Add mobile-safe max-width |
| `src/components/auth/SignInPromptDialog.tsx` | Add mobile-safe max-width |
| `src/components/ui/alert-dialog.tsx` | Verify/fix base mobile constraints |

## Pattern Applied
All dialogs will follow the same proven pattern:
```
max-w-[90vw] sm:max-w-md
```
This ensures: 90% viewport width on mobile (always fits), 28rem (md) cap on larger screens.

No backend or database changes needed. Pure CSS/className fixes.
