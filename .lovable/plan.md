

## Fix Onboarding Tour UI Issues

### Problems Identified

1. **Skip button not visible** -- The "Skip Tour" button exists at the top-right but is either scrolled out of view or blends into the background. It needs to be sticky/fixed and more prominent.
2. **Red vertical line through steps** -- The SVG animated line on Screen 2 ("Follow our proven framework") renders as a solid red bar cutting through the step icons. The line should connect the steps subtly, not overlap the icons.
3. **Large empty space** below content on some screens -- Content is vertically centered with `justify-center` but leaves too much dead space, especially on taller devices.
4. **Bottom Tab Bar visible behind the tour** -- The `fixed inset-0 z-50` overlay doesn't fully cover the BottomTabBar, which also uses z-50.
5. **No "Next" button on the last screen** -- When on Screen 4 (Choose your starting point), the Next button disappears but there's no clear way to dismiss or skip if the user doesn't want to pick a choice.

---

### Fixes (all in `src/components/onboarding/OnboardingCarousel.tsx`)

#### 1. Make Skip Button Fixed and Prominent
- Move the "Skip Tour" button into a `fixed` position (top-right) so it stays visible during scrolling
- Add a semi-transparent background pill so it's visible over any content
- Increase z-index above the carousel content

#### 2. Fix the Vertical Line
- Replace the SVG `<line>` with a proper `<div>` connector placed between each step (not overlapping icons)
- Position the line as a thin connector between the icon circles, offset to the left side of the icons
- Use the primary color with reduced opacity so it's subtle, not a harsh red bar

#### 3. Fix Content Spacing
- Change the carousel container from `justify-center` to `justify-start` with top padding to keep content in the upper portion
- Add `pt-16` or similar to push content down from the skip button but avoid leaving half the screen empty

#### 4. Fix Z-Index Over Bottom Tab Bar
- Increase the overlay z-index from `z-50` to `z-[60]` in `DashboardPage.tsx` to ensure it sits above the BottomTabBar

#### 5. Add Skip/Done Button on Last Screen
- Show a subtle "Skip" text link on the last screen so users aren't forced to pick a choice

---

### Technical Details

**File: `src/components/onboarding/OnboardingCarousel.tsx`**

- Lines 91-97: Restructure the Skip button to be `fixed top-4 right-4 z-10` with safe-area padding
- Lines 125-155: Replace the SVG line with CSS-based connectors between steps. Each step pair gets a thin `h-4 w-0.5 bg-primary/30 rounded-full` divider element rendered between the icon rows
- Lines 100-101: Change the carousel items from `justify-center` to `justify-start pt-20` for better content positioning
- Lines 238-261: Ensure the bottom CTA area always shows at least a "Skip" option on the last screen

**File: `src/pages/DashboardPage.tsx`**

- Line 302: Change `className="fixed inset-0 z-50"` to `className="fixed inset-0 z-[60]"` to cover the BottomTabBar

### Summary of Changes

| Issue | Fix |
|-------|-----|
| Skip button not visible | Make it fixed position with pill background |
| Red line through icons | Replace SVG with CSS gap connectors between steps |
| Empty space below content | Align content to upper portion with padding |
| Tab bar bleeding through | Increase z-index to z-[60] |
| No dismiss on last screen | Add skip option on final screen |
