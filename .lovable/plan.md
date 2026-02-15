

## Update User Menu Popover

### Overview

Remove the "Add account" button from the popover menu (not needed for a single-account app), and ensure the remaining buttons work correctly.

### Changes

**File: `src/pages/DashboardPage.tsx`**

1. **Remove the "Add account" button** (lines 404-416) -- the entire `Button` with the dashed plus icon and "Add account" text
2. **Remove the `border-b` divider** from the top section (line 360) since there's no bottom section anymore
3. **Add a dedicated Settings button** as a third action alongside "Manage Account" and "Sign Out":
   - Settings icon + "Settings" label, navigates to `/settings`
   - "Manage Account" navigates to `/profile` (profile page is more appropriate for managing your account info)
   - "Sign Out" stays the same -- calls `supabase.auth.signOut()` then navigates to `/auth`
4. **Remove `Plus` from the lucide-react import** (line 4) if it is no longer used elsewhere -- need to verify usage first. (It is used in CreateResumeDialog trigger and elsewhere, so it stays.)
5. **Round the popover bottom corners** by adding `rounded-b-xl` to the content container since the "Add account" row that provided rounding is gone.

### Button Behaviors (verified)

| Button | Action |
|--------|--------|
| Manage Account | `navigate('/profile')` with haptic feedback |
| Settings | `navigate('/settings')` with haptic feedback |
| Sign Out | `supabase.auth.signOut()` then `navigate('/auth')` with warning haptic |

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/DashboardPage.tsx` | Remove "Add account" button, update "Manage Account" to go to `/profile`, keep Settings going to `/settings` |

