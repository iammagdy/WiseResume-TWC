
# Add Avatar Dropdown Menu on Landing Page

## What Changes

Replace the plain avatar button with a dropdown menu that appears when the user taps their profile photo. The menu will have three options:

- **Dashboard** -- navigates to `/dashboard`
- **Settings** -- navigates to `/settings`  
- **Sign Out** -- calls `signOut()` from the auth context and redirects to landing

## Implementation

### File: `src/components/landing/HeroSection.tsx`

1. Import `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator` from `@/components/ui/dropdown-menu`
2. Import `Settings, LayoutDashboard, LogOut` icons from `lucide-react`
3. Get `signOut` from `useAuth()`
4. Wrap the existing avatar button in a `DropdownMenu` + `DropdownMenuTrigger`, replacing the `onClick` navigation
5. Add a `DropdownMenuContent` with three items:
   - Dashboard (LayoutDashboard icon) -- navigates to `/dashboard`
   - Settings (Settings icon) -- navigates to `/settings`
   - Separator
   - Sign Out (LogOut icon, destructive red text) -- calls `signOut()` then navigates to `/`

### Technical Details

The dropdown uses the existing Radix-based `DropdownMenu` component already in the project (`src/components/ui/dropdown-menu.tsx`), which renders via a portal with `z-50` and solid `bg-popover` background. No new dependencies needed.

| File | Change |
|------|--------|
| `src/components/landing/HeroSection.tsx` | Replace avatar button with dropdown menu containing Dashboard, Settings, Sign Out |
