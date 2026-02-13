

## Fix Editor StepperNav Tab Overflow and Connecting Line

### Problem
The 5-step navigation (Contact, Summary, Work, Education, Skills) has two main UI issues:
1. Tabs can overflow horizontally on narrower screens, requiring scroll to see all tabs
2. The connecting progress line passes visually through the tab circles (because circles have semi-transparent backgrounds)

### Changes

**File: `src/components/editor/StepperNav.tsx`**

1. **Ensure all 5 tabs fit without scrolling**: Replace `justify-between` with a flex layout that distributes tabs evenly using `flex-1` on each button, and reduce circle size from 48px (`w-12 h-12`) to 40px (`w-10 h-10`) to guarantee fit on 320px screens.

2. **Fix connecting line showing through circles**: Give each circle an opaque background instead of transparent/semi-transparent. For example:
   - Active: solid background with primary tint on an opaque base
   - Completed: solid success-tinted opaque background  
   - Default: opaque `bg-card` or `bg-background`
   
   This ensures the line (which is already behind the circles via z-index) is visually hidden beneath opaque circle backgrounds.

3. **Compact labels**: Reduce label font from `text-[11px]` to `text-[10px]` and shorten "Education" to "Edu" on small screens using a responsive approach, or keep labels compact enough to fit.

4. **Remove unnecessary scroll infrastructure**: Since all tabs will now fit, remove the `overflow-x-auto`, `canScrollLeft`/`canScrollRight` state, and fade gradient indicators -- simplifying the component.

### Technical Details

The key CSS changes in the circle div:
- Replace `bg-primary/15` (semi-transparent) with an opaque equivalent like `bg-[hsl(355_90%_60%/0.15)]` layered on `bg-background`, or simply use a wrapper approach where the circle has `bg-background` as base
- Each button gets `flex-1 min-w-0` instead of fixed `min-w-[48px]` to distribute space evenly
- Icon size stays at `w-5 h-5` (20px) which works fine in a 40px circle

No other files need changes.
