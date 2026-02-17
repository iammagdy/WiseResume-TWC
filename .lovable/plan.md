

## Fix Back Button on Resume Detail Page

### Problem

The back button on the Resume Detail page (`/resume/:id`) calls `navigate(-1)`, which depends on browser history. If the user navigated directly to the page (e.g., via deep link, notification, or fresh app launch), there is no history entry to go back to, so the button does nothing.

### Fix

**File: `src/pages/ResumeDetailPage.tsx`**

Replace `navigate(-1)` with `navigate('/dashboard')` to ensure the back button always works, consistent with the `BACK_ROUTES` mapping in `src/lib/navigation.ts` which maps `/resume` to `/dashboard`.

This is a one-line change on line 157.

