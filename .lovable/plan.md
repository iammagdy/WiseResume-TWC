

# Fix: Infinite Dashboard Loading and Bottom Tab Bar Issues

## Issue 1: Dashboard Infinite Loading After Back Navigation

**Root Cause Found**: In `DashboardPage.tsx` line 253, the loading gate is:
```
if (authLoading || !profileLoaded) { show skeleton }
```

The `profileLoaded` state starts as `false` (line 59) and is only set to `true` inside the `checkOnboardingStatus` effect (line 75) -- but ONLY when `user` is truthy. Two failure paths cause infinite loading:

1. **No error handling**: If the Supabase `profiles` query fails/throws, `setProfileLoaded(true)` is never reached, so the skeleton shows forever.
2. **Race condition**: If `user` is briefly null during re-render (auth state change), the effect exits early without setting `profileLoaded`.

**Fix**: Add a `finally` or try-catch around the query, and ensure `profileLoaded` is set to `true` in all code paths including when `user` is null.

```text
BEFORE (lines 62-80):
  const checkOnboardingStatus = async () => {
    if (user) {
      const { data } = await supabase.from('profiles')...
      if (data && !data.onboarding_completed) {
        setShowOnboarding(true);
      }
      setProfileLoaded(true);   // only reached if user exists AND query succeeds
    }
  };

AFTER:
  const checkOnboardingStatus = async () => {
    if (!user) {
      setProfileLoaded(true);  // guest users skip onboarding check
      return;
    }
    try {
      const { data } = await supabase.from('profiles')...
      if (data && !data.onboarding_completed) {
        setShowOnboarding(true);
      }
    } catch (err) {
      console.error('Failed to check onboarding:', err);
    } finally {
      setProfileLoaded(true);  // always resolves, never hangs
    }
  };
```

---

## Issue 2: Bottom Tab Bar Not Feeling Correct

After analyzing `BottomTabBar.tsx`, there are several issues:

### Problem A: framer-motion risk
The tab bar uses `AnimatePresence` with `mode="wait"` (line 123) and `motion.div` with `layoutId` (line 101). While this hasn't crashed yet, `AnimatePresence mode="wait"` is known to cause transition deadlocks, and `layoutId` animations can cause visual jitter on rapid tab switching. This matches the project memory that says to avoid these patterns.

### Problem B: Editor tab navigates to broken state
Clicking the "Editor" tab navigates to `/editor`, but if no resume is loaded, `EditorPage` immediately redirects to `/dashboard` (line 196-198), creating a confusing bounce.

### Problem C: Tab bar hidden on editor/preview
`AppShell.tsx` line 9 only shows the tab bar on `['/dashboard', '/upload', '/settings', '/interview']` -- so the editor tab exists in the config but the bar is never visible when on `/editor`. This means the Editor tab's active state is never seen by the user.

**Fix**:
1. Replace `framer-motion` in `BottomTabBar.tsx` with CSS transitions (matching the pattern used to fix InlineAIButton and other editor components)
2. Guard the Editor tab click -- if no `currentResumeId` exists, show a toast instead of navigating to a page that immediately redirects
3. Keep the tab configuration as-is since it provides correct navigation targets

---

## Changes

### File 1: `src/pages/DashboardPage.tsx`
- Wrap `checkOnboardingStatus` in try/catch/finally
- Call `setProfileLoaded(true)` when `user` is null (guest path)
- This ensures the loading skeleton always resolves

### File 2: `src/components/layout/BottomTabBar.tsx`
- Remove `framer-motion` imports (`motion`, `AnimatePresence`)
- Replace `motion.div` pill indicator with a plain `div` using CSS `transition-all`
- Replace `AnimatePresence` + `motion.span` label with a regular `span` and CSS transitions
- Replace icon bounce `motion.div` with CSS transform transition
- Add resume guard for Editor tab: check `useResumeStore().currentResumeId` before navigating, show toast if no resume selected

---

## Summary

| File | Change | Fixes |
|------|--------|-------|
| `src/pages/DashboardPage.tsx` | Add try/catch/finally to onboarding check; handle null user | Infinite loading skeleton on back navigation |
| `src/components/layout/BottomTabBar.tsx` | Remove framer-motion; add CSS transitions; guard Editor tab | Tab animations and Editor bounce-redirect |

