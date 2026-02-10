

# Mobile Responsiveness Fixes -- Verified Plan

All 8 issues from the analysis have been verified against the current codebase and are valid. Here is the confirmed implementation plan:

## Changes

### 1. InterviewPage.tsx -- Fix bottom controls padding (Line 263)
Replace hardcoded `pb-24` with `pb-safe` to match the pattern used across the rest of the app (23 files already use `pb-safe`).

### 2. InterviewPage.tsx -- Fix back button touch targets (Lines 163, 185, 210)
Three back buttons use `p-1` (~32px touch area). Update all three to use proper 48px touch targets with the standard pattern: `p-3 -ml-3 rounded-full hover:bg-muted active:scale-95 transition-all min-w-[48px] min-h-[48px] flex items-center justify-center`.

### 3. HeroSection.tsx -- Fix safe-area overlap for sign-in/avatar button
The `absolute top-6 right-4` positioning doesn't account for notch safe areas. Update to `top-[max(1.5rem,env(safe-area-inset-top))]`.

### 4. FeatureGrid.tsx -- Single column on tiny screens
Change `grid-cols-2` to `grid-cols-1 xs:grid-cols-2`. The `xs: 375px` breakpoint is already configured in the Tailwind config.

### 5. PreviewPage.tsx -- Hide button labels on tiny screens (Lines 600, 611, 621)
Add `hidden xs:inline` to Edit, Save, and Interview text labels so buttons become icon-only on screens under 375px. The Share button is already icon-only.

### 6. DashboardPage.tsx -- Fix Explore button touch target (Line 236)
Change `py-1.5` to `py-2` and add `min-h-[44px]` to meet the 44px minimum touch target.

### 7. index.css -- Add text-balance utility
Add a `.text-balance { text-wrap: balance; }` utility class for better heading wrapping.

### 8. index.css -- Add keyboard-safe-bottom utility
Add a `.keyboard-safe-bottom` class that accounts for both safe-area insets and keyboard height.

## Files Modified

| File | Issues Fixed |
|------|-------------|
| `src/pages/InterviewPage.tsx` | #1 (pb-safe), #2 (touch targets) |
| `src/components/landing/HeroSection.tsx` | #3 (safe-area) |
| `src/components/landing/FeatureGrid.tsx` | #4 (grid cols) |
| `src/pages/PreviewPage.tsx` | #5 (button labels) |
| `src/pages/DashboardPage.tsx` | #6 (touch target) |
| `src/index.css` | #7 (text-balance), #8 (keyboard-safe) |

All changes are minimal, targeted fixes that follow existing patterns in the codebase.

