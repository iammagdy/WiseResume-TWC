

## Enhance StepperNav: Larger Circles, Swipeable Carousel, Labels

### Changes

**File: `src/components/editor/StepperNav.tsx`**

**1. Enlarge step circles (~20% larger)**
- Increase circle from `w-10 h-10` (40px) to `w-12 h-12` (48px) -- meets 48px touch target and is 20% larger
- Increase icons from `w-4 h-4` to `w-5 h-5`
- Increase check icon similarly
- Update the outer glow ring offset from `4px` to `5px`
- Update connecting line `top-5` to `top-6` to stay centered with larger circles

**2. Always show section labels (not just xs+)**
- Remove `hidden xs:block` from the label `<span>` so labels are always visible
- Keep `text-[11px]` size for compactness

**3. Convert to horizontal scrollable carousel on mobile**
- Wrap the step buttons in a horizontally scrollable container with `overflow-x-auto scrollbar-hide snap-x snap-mandatory`
- Each step gets `snap-center` so swiping snaps to steps
- Add horizontal padding so the active step can be centered
- Use a `useEffect` to auto-scroll the active step into view on mount and when `activeStep` changes via `scrollIntoView({ inline: 'center', behavior: 'smooth' })`
- Each step button gets a `ref` callback to track elements for scrolling

**4. Scroll/swipe indicators**
- Add subtle left/right fade gradients (via pseudo-elements or overlay divs) on the scroll container edges to hint at more content
- Use `pointer-events-none` gradient overlays: left overlay fades from `bg-background` to transparent, right overlay fades from transparent to `bg-background`
- These only render when there's overflow content in that direction (tracked via scroll position state)

**5. Update touch targets**
- The circle itself is now 48x48px
- The overall button `min-w-[48px]` stays, but add `min-h-[48px]` to ensure the tap area meets minimum standards
- Add `p-1` around each button for comfortable spacing between steps

**6. Update connecting line positioning**
- Adjust `top` value from `top-5` to `top-6` to center with the new 48px circles
- Adjust confetti particle distance from `20px` to `24px` to match larger circles

### Visual Result

```text
Mobile (swipeable, 3 visible at a time):
  <fade>  [Contact] [Summary] [Work]  <fade>
              ^active (centered)
          swipe left/right for more

Labels always visible below each circle.
Circles: 48x48px with centered icons.
```

### Files Modified
- `src/components/editor/StepperNav.tsx` -- all changes in this single file

