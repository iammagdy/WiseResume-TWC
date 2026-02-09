
# Make Landing Page Default with Profile Navigation

## Overview

This plan modifies the Index page to always show the space-themed landing page (with the planet logo, "Launch Your Resume" button, etc.) as the default view every time a user enters the app. A profile avatar will be added in the top right corner that navigates to the dashboard.

---

## Current Behavior

The Index page currently has conditional rendering:
- **If user has a resume in progress** → Shows a dashboard-style view with resume card and AI actions
- **If no resume** → Shows the space-themed landing page

The user wants the landing page to always be shown, regardless of resume state.

---

## Changes Required

### 1. Modify `src/pages/Index.tsx`

**Remove the conditional rendering** that shows a different view when `hasResume` is true. Always show the space-themed landing page.

Key changes:
- Remove the entire `if (hasResume)` block (lines 87-208)
- Keep only the space-themed landing page return statement
- Remove unused imports that were only used in the dashboard view

### 2. Modify `src/components/landing/HeroSection.tsx`

**Add a profile avatar in the top right corner** that navigates to the dashboard:

```text
+------------------------------------------+
|                              [Avatar] ◄── Profile button
|                                          |
|           🪐 Planet Logo                 |
|           ✨ WELCOME TO                  |
|           WiseResume                     |
|           ...                            |
+------------------------------------------+
```

Changes:
- Import `Avatar`, `AvatarImage`, `AvatarFallback` from UI components
- Import `User` icon from lucide-react as fallback
- Import `useAuth` hook to check authentication status
- Import `useProfile` hook to get user avatar
- Add an absolute-positioned profile button in the top right
- On click, navigate to `/dashboard`
- Show user avatar if logged in, or a default user icon if not

### 3. Profile Button Behavior

| State | Display | Click Action |
|-------|---------|--------------|
| Logged in with avatar | User's profile picture | Navigate to `/dashboard` |
| Logged in without avatar | User icon with initials | Navigate to `/dashboard` |
| Not logged in | User icon | Navigate to `/auth` |

---

## Technical Details

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Index.tsx` | Remove conditional dashboard view, keep only landing page |
| `src/components/landing/HeroSection.tsx` | Add profile avatar button in top right corner |

### New Dependencies in HeroSection

```typescript
import { User } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
```

### Profile Button Implementation

```tsx
{/* Profile button - top right */}
<motion.button
  onClick={() => navigate(user ? '/dashboard' : '/auth')}
  className="absolute top-6 right-4 z-20"
  initial={{ opacity: 0, scale: 0.8 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ delay: 0.5 }}
  whileTap={{ scale: 0.95 }}
>
  <Avatar className="w-10 h-10 border-2 border-primary/30 shadow-lg">
    {profile?.avatarUrl ? (
      <AvatarImage src={profile.avatarUrl} alt="Profile" />
    ) : null}
    <AvatarFallback className="bg-primary/20 text-primary">
      {user ? (
        profile?.fullName?.charAt(0).toUpperCase() || 
        user.email?.charAt(0).toUpperCase() || 
        <User className="w-5 h-5" />
      ) : (
        <User className="w-5 h-5" />
      )}
    </AvatarFallback>
  </Avatar>
</motion.button>
```

---

## Visual Changes

```text
BEFORE:                           AFTER:
+------------------+              +------------------+
|  [Dashboard UI]  |  ──────►     |           [👤]   |  ◄── Profile always visible
|  when hasResume  |              |                  |
+------------------+              |    🪐 Planet     |
                                  |                  |
                                  |   WiseResume     |
                                  +------------------+
```

---

## User Flow After Changes

1. User opens app → Always sees landing page with planet logo
2. User sees profile icon in top right corner
3. User clicks profile icon:
   - If logged in → Goes to `/dashboard` to manage resumes
   - If not logged in → Goes to `/auth` to sign in
4. "Launch Your Resume" button still works as before → Creates new resume and goes to editor

---

## Expected Outcome

- Landing page is always the first thing users see
- Profile avatar provides easy access to the dashboard/auth
- Existing functionality (resume creation, upload) remains intact
- Clean, consistent entry point for all users
