

# Landing Page Hero CTA Enhancement

## Problem
The hero section currently shows two specific action buttons ("Create New Resume" and "Upload Existing Resume") which overwhelms new visitors with choices before they understand the product. A simpler, single "Get Started" CTA is more effective for conversion -- let users decide what to do after they enter the app.

## Changes

### 1. `src/components/landing/HeroSection.tsx` -- Simplify Hero CTA

Replace the two-button layout with a single "Get Started" button that routes based on auth state:
- **Authenticated users** --> `/dashboard` (they already have context)
- **Guest users** --> `/editor` with a blank resume (current behavior)

Remove the glass-elevated card wrapper since a single button doesn't need it. Also remove the `Upload Existing Resume` button from the hero (upload is still accessible from the dashboard and bottom CTA).

**Before:**
```
[glass card]
  [Create New Resume]  (primary gradient)
  [Upload Existing Resume]  (ghost)
[/glass card]
```

**After:**
```
[Get Started]  (primary gradient, single button)
```

The button text changes to "Go to Dashboard" for authenticated users, giving them a clear path.

### 2. `src/components/landing/BottomCTA.tsx` -- Update Bottom CTA Text

Change "Create Your Resume" to "Get Started Free" for consistency with the simplified hero messaging.

### 3. `src/components/landing/HeroSection.tsx` -- Clean Up Unused Imports

Remove `FileText` import (no longer needed after removing the upload button).

---

## Summary of File Changes

| File | Change |
|------|--------|
| `src/components/landing/HeroSection.tsx` | Replace two buttons with single "Get Started" / "Go to Dashboard" CTA; remove glass card wrapper; clean up imports |
| `src/components/landing/BottomCTA.tsx` | Change button text to "Get Started Free" |

