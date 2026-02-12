

## Add Back Button to Onboarding Carousel

### What's Already Done
The onboarding carousel already has everything you described:
- 4 swipeable screens (Welcome, 5-Step Process, AI Showcase, Choose Starting Point)
- Progress dots at the bottom
- A "Next" / "Get Started" button
- Snap-scroll swipe navigation

### What Needs to Change
The only missing piece is a **Back button** so users can navigate to the previous screen without swiping.

### Implementation

**File: `src/components/onboarding/OnboardingCarousel.tsx`**

1. Add a `handleBack` function that scrolls to `activeIndex - 1`
2. In the bottom CTA area, replace the single Next button with a row containing:
   - A "Back" button (ghost style, with a left chevron) -- only visible when `activeIndex > 0`
   - The existing "Next" / "Get Started" button taking remaining space
3. On the last screen (Screen 4), show only the Back button (since the 3 choice cards serve as the CTA)

The layout uses a `flex` row with `gap-3` so both buttons sit side by side, with the Back button taking minimal width and Next filling the rest via `flex-1`.

### Technical Details

- Import `ChevronLeft` from lucide-react
- Add `handleBack` mirroring `handleNext` logic but decrementing
- Bottom section becomes:
  ```
  <div className="flex gap-3">
    {activeIndex > 0 && <BackButton />}
    {!isLastScreen && <NextButton className="flex-1" />}
  </div>
  ```
- Back button uses `variant="outline"` with a `ChevronLeft` icon for clear affordance
- Haptic feedback on back navigation matches existing pattern

