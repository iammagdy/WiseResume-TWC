

## Fix Theme Flash Effect on Settings Page

### Root Cause
The `ThemeToggle` component in settings uses a `RippleOverlay` that creates a full-screen animated ripple when the theme changes. This overlay:
- Uses `position: fixed; inset: 0` creating a full-screen element
- Animates a circular `clipPath` from 0% to 150% over 500ms
- The ripple color (white for light theme, dark for dark theme) causes a visible flash
- DOM updates (theme color changes) happen in parallel with the animation, creating perceived flicker

### Solution: Remove or Disable Ripple for Theme Changes

**Option 1: Disable Ripple Animation (Recommended)**
- The ripple effect is visually appealing but causes the flash users are experiencing
- Simply remove the ripple overlay by never triggering it
- Keep all other animations (SVG icon morphs, sliding pill) which don't cause flashing

**Option 2: Refine Ripple Timing**
- Delay the `setTheme()` call until ripple animation completes
- Add a fade-out to the ripple color to reduce flash intensity
- This requires more complex state management

### Implementation (Option 1 - Cleaner)

**File: `src/components/settings/ThemeToggle.tsx`**

Changes:
1. Remove the ripple state initialization: delete lines 184-188 (the `ripple` state)
2. Remove the ripple trigger logic in `handleChange()`: delete lines 222-231 (the `setRipple` call)
3. Remove the `RippleOverlay` component rendering: delete lines 287-295
4. Simplify to direct theme change: `setTheme(newTheme)` without the `requestAnimationFrame` wrapper
5. Keep the `RippleOverlay` component function definition as-is (in case it's used elsewhere, though unlikely)

Result: Theme will change instantly with smooth SVG icon morphs and sliding pill animation, no flash effect.

### Why This Works
- The SVG icon animations (sun rays appearing, moon crescent sliding) are smooth and don't cause flashing
- The sliding pill background animation is hardware-accelerated and smooth
- The ripple overlay was purely decorative; removing it eliminates the flash without losing core functionality
- All the delightful micro-interactions remain (haptics feedback, spring animations, glow)

### Alternative: Consider Theme Dropdown Instead
- The simpler `ThemeDropdown.tsx` component (also in the file list) doesn't have ripple effects
- Could use that instead if users prefer a simpler dropdown menu over the toggle buttons
- No flash issues with the dropdown approach

