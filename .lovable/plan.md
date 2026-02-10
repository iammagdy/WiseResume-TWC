

# Show Profile Avatar When Signed In on Landing Page

## Current Behavior
The landing page hero section always shows a "Sign In" button in the top-right corner, even when the user is already signed in. There is no visual indicator of auth state.

## Desired Behavior
- **Signed out**: Show the current "Sign In" button (LogIn icon + text)
- **Signed in**: Show the user's profile avatar (photo or initials fallback) that navigates to `/dashboard` on tap

## Changes

### File: `src/components/landing/HeroSection.tsx`

1. Import `useAuth` from `@/hooks/useAuth` and `useProfile` from `@/hooks/useProfile`
2. Import `Avatar`, `AvatarImage`, `AvatarFallback` from `@/components/ui/avatar`
3. Get `user`, `isAuthenticated` from `useAuth()`
4. Get `profile` from `useProfile(user?.id, user)`
5. Replace the static "Sign In" button with a conditional render:

**When signed out** (current behavior):
```
<button onClick={() => navigate('/auth')}>
  <LogIn /> Sign In
</button>
```

**When signed in** (new):
```
<button onClick={() => navigate('/dashboard')}>
  <Avatar className="h-9 w-9 border-2 border-primary/30">
    <AvatarImage src={profile?.avatarUrl} />
    <AvatarFallback>
      {initials from profile?.fullName or user email}
    </AvatarFallback>
  </Avatar>
</button>
```

The initials will be derived from `profile?.fullName` (first letter of first and last name), falling back to the first letter of the user's email, falling back to a generic User icon.

### Files Modified

| File | Change |
|------|--------|
| `src/components/landing/HeroSection.tsx` | Add auth/profile hooks, conditionally render avatar or sign-in button |

Single file change. No new components or dependencies needed -- all imports already exist in the project.
