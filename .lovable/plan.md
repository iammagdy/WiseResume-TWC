

# Dashboard Polish: Avatar, Tips, Activity & Icon Alignment

## Problem
The dashboard feels incomplete -- it's missing personal touches (avatar, streak), engagement elements (tips/quotes), activity context, and the quick-action icon chips look misaligned with inconsistent sizing and spacing.

## Changes

### 1. Header: Add Profile Avatar
**File: `src/pages/DashboardPage.tsx`**

Replace the bare header with one that includes the user's avatar (or initials fallback) next to the Explore button and theme toggle. Uses profile data already available via `useProfile`.

- Show a 36px avatar circle with the user's `avatarUrl` or initials from `fullName`
- Tapping it navigates to `/settings`
- Moves the logo to the left, avatar + Explore + theme toggle to the right

### 2. Stats Card: Add Login Streak & Motivational Tip
**File: `src/components/dashboard/DashboardStats.tsx`**

- Add a rotating motivational tip/quote below the greeting text (e.g., "Tip: Tailoring your resume increases callbacks by 40%"). Rotate through a hardcoded list based on the day.
- Add a small "streak" indicator showing days active (stored in localStorage for simplicity) -- a flame icon with count.

### 3. Resume Card: Recent Activity Line
**File: `src/components/dashboard/ResumeListCard.tsx`**

- Below the "Edited X ago" timestamp, show a brief activity context when available (e.g., the AI nudge is already there but only shows for scored resumes). No structural change needed -- just ensure consistent spacing.

### 4. Quick Action Chips: Fix Alignment & Icon Consistency
**File: `src/components/dashboard/QuickActionChips.tsx`**

This is the main "messy" area. The chips have nested icon containers with inconsistent sizing and the overall layout feels uneven.

- Make all chips equal width using `flex-1` instead of fixed `min-w-[80px]`
- Remove the nested double-icon container (currently the icon sits inside a `bg-*` div inside another `bg-*` button) -- simplify to a single icon container per chip
- Standardize icon container to `w-11 h-11 rounded-xl` with `glass-surface` background and a colored icon
- Add consistent `border-glow` subtle effect to each chip
- Center-align the content vertically

### 5. New Component: Daily Tip Card
**File: `src/components/dashboard/DailyTipCard.tsx`** (new file)

A small glass card shown below the quick actions with a lightbulb icon and a rotating career tip. Tips rotate daily based on `Date`. Dismissible for the session.

---

## Technical Details

### DashboardPage.tsx Header Changes
```
Header layout:
[AppLogo]  ............  [Avatar] [Explore] [ThemeToggle]
```

Avatar component: reuse the `Avatar` from `@radix-ui/react-avatar` with `AvatarImage` / `AvatarFallback` showing initials.

### QuickActionChips.tsx Cleanup
Current structure (nested backgrounds):
```
button(bg-primary/10) > div(bg-primary/10) > Icon
```

Fixed structure (single layer):
```
button(glass-surface border-glow) > div(icon-glow) > Icon + Label
```

All three chips get `flex-1` so they share equal width across the row.

### DailyTipCard.tsx
- Array of ~10 career tips hardcoded
- Select tip: `tips[new Date().getDate() % tips.length]`
- Dismissible via local state (reappears next session)
- Glass card with `Lightbulb` icon and small text

### Login Streak (localStorage)
- Key: `wise_resume_streak`
- On mount: check last login date vs today. If consecutive day, increment. If same day, no-op. If gap, reset to 1.
- Display: small flame icon + number in the stats card header area

### Files Modified
1. `src/pages/DashboardPage.tsx` -- avatar in header, DailyTipCard placement
2. `src/components/dashboard/DashboardStats.tsx` -- streak indicator
3. `src/components/dashboard/QuickActionChips.tsx` -- fix alignment, simplify icon nesting
4. `src/components/dashboard/DailyTipCard.tsx` -- new file

