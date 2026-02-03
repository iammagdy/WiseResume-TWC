
# Add OnboardingCarousel for First-Time Users

## Overview

Integrate the existing `OnboardingCarousel` component to show first-time users a welcome experience when they sign up. The onboarding will guide them through the app's key features before redirecting them to the dashboard.

---

## Strategy

We'll track onboarding completion using a new `onboarding_completed` column in the `profiles` table. When a new user signs up, their profile is auto-created with `onboarding_completed = false`. After completing or skipping the onboarding carousel, we update this flag to `true`.

---

## Database Changes

### Add onboarding_completed column to profiles

```sql
ALTER TABLE public.profiles 
ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
```

This column will:
- Default to `false` for all new users (via the existing trigger)
- Be set to `true` when onboarding is completed or skipped
- Be checked on the dashboard to determine if onboarding should show

---

## Implementation Flow

```text
User Signs Up
     ↓
Email Confirmation (if enabled)
     ↓
User Logs In / Session Created
     ↓
Redirect to Dashboard
     ↓
Dashboard checks profile.onboarding_completed
     ↓
┌───────────────────────────────────────┐
│  If onboarding_completed = false      │
│  → Show OnboardingCarousel overlay    │
│                                       │
│  User completes or skips carousel     │
│  → Update profile.onboarding_completed│
│  → Show regular dashboard             │
└───────────────────────────────────────┘
```

---

## File Changes

### 1. Database Migration (new)
Add `onboarding_completed` column to the profiles table.

### 2. `src/hooks/useAuth.ts` (update)
Add a function to fetch and update the user's profile, including onboarding status.

### 3. `src/pages/DashboardPage.tsx` (update)
- Fetch user profile on load
- Check `onboarding_completed` flag
- If `false`, render `OnboardingCarousel` as a full-screen overlay
- On complete/skip, update the profile and dismiss the carousel

### 4. `src/components/onboarding/OnboardingCarousel.tsx` (minor update)
- No major changes needed - already accepts `onComplete` and `onSkip` props
- Ensure smooth transition when dismissed

---

## Detailed Component Changes

### DashboardPage.tsx Updates

```typescript
// New state
const [showOnboarding, setShowOnboarding] = useState(false);
const [profileLoaded, setProfileLoaded] = useState(false);

// Fetch profile on mount
useEffect(() => {
  if (user) {
    fetchProfile();
  }
}, [user]);

const fetchProfile = async () => {
  const { data } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('user_id', user.id)
    .single();
  
  if (data && !data.onboarding_completed) {
    setShowOnboarding(true);
  }
  setProfileLoaded(true);
};

const handleOnboardingComplete = async () => {
  await supabase
    .from('profiles')
    .update({ onboarding_completed: true })
    .eq('user_id', user.id);
  
  haptics.success();
  setShowOnboarding(false);
};

// In render:
if (showOnboarding) {
  return (
    <OnboardingCarousel
      onComplete={handleOnboardingComplete}
      onSkip={handleOnboardingComplete}
    />
  );
}
```

---

## User Experience

### First-Time User Journey
1. User signs up and verifies email
2. User logs in → redirected to `/dashboard`
3. Dashboard detects `onboarding_completed = false`
4. Full-screen `OnboardingCarousel` appears with 3 steps:
   - **Step 1**: "Upload or Start Fresh" (Upload icon)
   - **Step 2**: "AI-Powered Tailoring" (Sparkles icon)
   - **Step 3**: "Export Professionally" (Download icon)
5. User can swipe through or tap "Next"
6. On final step, "Get Started" button appears
7. User completes or skips → profile updated → dashboard shown

### Returning User Journey
1. User logs in
2. Dashboard checks profile, sees `onboarding_completed = true`
3. Dashboard loads normally (no onboarding shown)

---

## Technical Notes

### Why Dashboard and not AuthPage?

Placing onboarding in the Dashboard ensures:
- User is fully authenticated (session established)
- Profile exists in database (created by trigger)
- Works for both immediate login and email confirmation flows
- Onboarding only shows once per user, ever

### Smooth Transitions

The carousel already uses Framer Motion. When dismissed, we'll use a fade-out animation for a polished experience.

---

## Files to Modify

| File | Change |
|------|--------|
| Database migration | Add `onboarding_completed` boolean column |
| `src/pages/DashboardPage.tsx` | Add profile fetch, onboarding state, and carousel integration |

---

## Expected Result

First-time users will see a beautiful, animated 3-step carousel that introduces WiseResume's core features. After completing or skipping, they'll never see it again - the dashboard will load directly on future visits.
