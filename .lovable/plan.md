

## Replace User Menu Dropdown with Popover Design

### Overview

Replace the current `DropdownMenu` user menu on the Dashboard with a richer `Popover`-based user menu adapted from the provided React Native design. The new menu shows the user's avatar, full name, username/email, and action buttons for "Manage Account" and "Sign Out" -- plus an "Add account" option at the bottom.

### What Changes

The user menu trigger (avatar button) stays the same, but the popup changes from a simple dropdown list to a styled popover card with:
- User info header (avatar + name + email)
- Two action buttons: "Manage Account" (navigates to settings) and "Sign Out"
- "Add account" row at the bottom (navigates to auth page to add another account)

### Technical Details

**File: `src/pages/DashboardPage.tsx`**

1. **Swap imports**: Replace `DropdownMenu` / `DropdownMenuContent` / `DropdownMenuItem` / `DropdownMenuSeparator` / `DropdownMenuTrigger` with `Popover` / `PopoverContent` / `PopoverTrigger`

2. **Replace the menu markup** (lines ~334-395): Convert from `DropdownMenu` to `Popover` with this structure:
   - Popover trigger: same avatar button with pulse ring and incomplete profile badge
   - Popover content (`w-80 p-0`):
     - Top section (border-b, p-3): avatar + name + email row, then "Manage Account" and "Sign Out" buttons
     - Bottom section: "Add account" button with dashed circle plus icon

3. **Adapt React Native patterns to React web**:
   - `View` becomes `div`
   - `Text` becomes `span`
   - `onPress` becomes `onClick`
   - `lucide-react-native` becomes `lucide-react` (already imported)
   - `Icon as={X}` becomes just `<X />`
   - Remove `TriggerRef` / `popoverTriggerRef.current?.close()` -- use local `open` state with `onOpenChange` instead

4. **Wire up real data**: Use `profile?.fullName`, `user?.email`, `profile?.avatarUrl` instead of hardcoded `USER` object. Compute initials from `profile?.fullName`.

5. **Remove unused imports**: `DropdownMenu*`, `LogIn`, `Home` icons (no longer needed in menu)

6. **Keep existing behavior**: 
   - "Manage Account" navigates to `/settings` with haptic feedback
   - "Sign Out" calls `signOut()` from auth context and navigates to `/auth`
   - "Add account" navigates to `/auth` (placeholder for multi-account support)
   - First-visit pulse ring and incomplete profile badge stay on the trigger

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/DashboardPage.tsx` | Replace DropdownMenu with Popover-based user menu, update imports |

