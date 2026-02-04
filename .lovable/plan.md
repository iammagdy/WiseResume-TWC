

# UX Enhancement: Mobile Fixes, Auth Improvements & Dashboard Polish

## Overview

This plan addresses multiple usability improvements to make WiseResume a truly mobile-first experience with better authentication flows and enhanced dashboard interactions.

---

## Part 1: Mobile Input Fixes (Prevents iOS Auto-Zoom)

### Issue
iOS Safari automatically zooms when users tap on inputs with font-size less than 16px. The current `Textarea` uses `text-sm` (14px).

### Changes

**File: `src/components/ui/textarea.tsx`**
- Change `text-sm` to `text-base` (16px) to prevent iOS zoom
- Add responsive sizing: `text-base md:text-sm` (16px mobile, 14px desktop)

**File: `src/components/ui/input.tsx`**
- Already has `text-base md:text-sm` - no changes needed
- Default height is `h-10`, but AuthPage already overrides to `h-12`

---

## Part 2: Password Reset Flow

### Current State
- No "Forgot Password" link on login form
- No password reset functionality

### New Components & Changes

**File: `src/pages/AuthPage.tsx`**
Add new state and UI for password reset:

```text
[Login Form]
┌─────────────────────────────────────────┐
│  Email: [                             ] │
│  Password: [                          ] │
│                                         │
│  Forgot password?  <-- NEW LINK         │
│                                         │
│  [Sign In]                              │
└─────────────────────────────────────────┘

[Reset Password Mode]
┌─────────────────────────────────────────┐
│  Reset Your Password                    │
│                                         │
│  Enter your email and we'll send you    │
│  a link to reset your password.         │
│                                         │
│  Email: [                             ] │
│                                         │
│  [Send Reset Link]                      │
│                                         │
│  Back to Sign In                        │
└─────────────────────────────────────────┘
```

### Implementation Details

1. Add `isForgotPassword` state
2. Add `handlePasswordReset` function using `supabase.auth.resetPasswordForEmail()`
3. Add conditional UI for reset mode
4. Use `redirectTo` option to specify reset callback URL

---

## Part 3: Social Authentication (Google Sign-In)

### New Components

**File: `src/pages/AuthPage.tsx`**
Add social auth buttons:

```text
┌─────────────────────────────────────────┐
│  [Email Form...]                        │
│                                         │
│  ─────────── or ───────────             │
│                                         │
│  [G] Continue with Google               │
│  [] Continue with Apple                │
└─────────────────────────────────────────┘
```

### Implementation Steps

1. Configure Google OAuth using the `supabase--configure-social-auth` tool
2. Import the lovable auth module
3. Add Google and Apple sign-in buttons
4. Handle OAuth redirects

### Button Styling
- Full-width buttons matching the primary CTA
- Google: White background with Google "G" logo
- Apple: Black background with Apple logo
- Both: Minimum 48px height, proper touch targets

---

## Part 4: Pull-to-Refresh on Dashboard

### Current State
- `PullToRefresh` component exists but is not used
- Dashboard list uses manual refresh only

### Changes

**File: `src/pages/DashboardPage.tsx`**
Wrap the resume list with `PullToRefresh`:

```typescript
import { PullToRefresh } from '@/components/ui/pull-to-refresh';

// In the content area:
<PullToRefresh 
  onRefresh={async () => {
    await refetch();
    haptics.success();
  }}
  className="flex-1"
>
  {/* Resume list content */}
</PullToRefresh>
```

### Behavior
- Pull down from top of list triggers refresh
- Haptic feedback on pull threshold and completion
- Spinner animation during refresh
- Toast notification on completion (optional)

---

## Part 5: Enhanced Resume Cards

### Current State
- Cards show title, job, company, and dates
- No visual indication of completeness

### Enhancements

**File: `src/components/dashboard/ResumeListCard.tsx`**

1. **Resume Completion Percentage**
   - Calculate based on filled sections
   - Show as small progress ring or bar
   - Color-coded: red (<50%), yellow (50-80%), green (>80%)

2. **Relative Timestamps**
   - Change "Last edited: Jan 4, 2025" to "Last edited: 2 hours ago"
   - Use `date-fns` `formatDistanceToNow()` (already installed)

3. **Quick Preview Thumbnail** (Optional - Future Phase)
   - Small thumbnail of first page
   - Would require PDF rendering

---

## File Changes Summary

| File | Changes |
|------|---------|
| `src/components/ui/textarea.tsx` | Fix font size for iOS (text-base) |
| `src/pages/AuthPage.tsx` | Add forgot password, social auth |
| `src/pages/DashboardPage.tsx` | Integrate PullToRefresh |
| `src/components/dashboard/ResumeListCard.tsx` | Add completion %, relative time |

---

## Detailed Implementation

### 1. Textarea iOS Fix

```typescript
// src/components/ui/textarea.tsx
className={cn(
  "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  className,
)}
```

### 2. Password Reset in AuthPage

```typescript
// New state
const [isForgotPassword, setIsForgotPassword] = useState(false);

// Reset handler
const handlePasswordReset = async (e: React.FormEvent) => {
  e.preventDefault();
  
  try {
    emailSchema.parse(email);
  } catch {
    toast.error('Please enter a valid email address');
    return;
  }
  
  setIsLoading(true);
  
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });
    
    if (error) {
      toast.error(error.message);
      return;
    }
    
    toast.success('Check your email for the reset link!');
    setIsForgotPassword(false);
  } finally {
    setIsLoading(false);
  }
};
```

### 3. Social Auth Buttons

```typescript
// After configuring social auth, import:
import { lovable } from "@/integrations/lovable/index";

// Google sign-in handler
const handleGoogleSignIn = async () => {
  setIsLoading(true);
  const { error } = await lovable.auth.signInWithOAuth("google", {
    redirect_uri: window.location.origin,
  });
  
  if (error) {
    toast.error('Failed to sign in with Google');
    setIsLoading(false);
  }
};

// Apple sign-in handler
const handleAppleSignIn = async () => {
  setIsLoading(true);
  const { error } = await lovable.auth.signInWithOAuth("apple", {
    redirect_uri: window.location.origin,
  });
  
  if (error) {
    toast.error('Failed to sign in with Apple');
    setIsLoading(false);
  }
};
```

### 4. Resume Completion Calculation

```typescript
// Utility function for completion percentage
function calculateResumeCompletion(resume: DatabaseResume): number {
  let filled = 0;
  let total = 5; // contact, summary, experience, education, skills
  
  // Check contact (has name and email)
  if (resume.contact_info?.name && resume.contact_info?.email) filled++;
  
  // Check summary
  if (resume.summary && resume.summary.length > 20) filled++;
  
  // Check experience
  if (resume.experience && resume.experience.length > 0) filled++;
  
  // Check education
  if (resume.education && resume.education.length > 0) filled++;
  
  // Check skills
  if (resume.skills && resume.skills.length >= 3) filled++;
  
  return Math.round((filled / total) * 100);
}
```

### 5. Relative Timestamps

```typescript
import { formatDistanceToNow } from 'date-fns';

// In ResumeListCard
<p className="text-xs text-muted-foreground">
  Edited {formatDistanceToNow(new Date(resume.updated_at), { addSuffix: true })}
</p>
```

---

## Implementation Order

1. **Fix textarea iOS zoom** (1 line change, immediate impact)
2. **Add password reset flow** (high value for user trust)
3. **Configure and add social auth** (reduces friction)
4. **Integrate pull-to-refresh** (native mobile feel)
5. **Enhance resume cards** (better information display)

---

## Success Criteria

After implementation:
- iOS users won't experience zoom when tapping textareas
- Users can reset forgotten passwords via email
- Users can sign in with Google or Apple
- Dashboard supports native pull-to-refresh gesture
- Resume cards show completion percentage and relative timestamps
- All touch targets meet 44-48px minimum size

