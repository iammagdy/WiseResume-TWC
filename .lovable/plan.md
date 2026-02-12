

## Micro-Interactions and Editor Navigation Polish

### Overview

Many of the requested features already exist in the codebase. This plan focuses on genuine enhancements and avoids duplicating existing functionality.

**Already implemented (no changes needed):**
- Section completion confetti animations (StepperNav + ProgressBar have confetti burst particles)
- Section celebration toasts with next-step suggestions (EditorPage lines 294-318)
- Scroll-to-top when switching sections (handleTabChange line 116)
- Next/Previous navigation buttons at bottom of each section (EditorPage lines 522-559)
- Auto-save indicator showing "Saving..." / "Saved" with cloud icons (EditorPage lines 444-464)
- Toast notifications with custom icons (Sonner configured with success/error/warning icons)
- Tab navigation fade transitions (AppShell with AnimatePresence, 200ms)
- Haptic feedback utility (src/lib/haptics.ts) -- already wired to buttons throughout the app

**New enhancements to implement:**

---

### 1. Enhanced Section Progress Summary in Editor Header

**File: `src/pages/EditorPage.tsx`**

Currently the progress bar shows "Resume 45% Complete" but not section counts. Add a small secondary line showing "3 of 5 sections completed" below the progress bar.

- Below the existing `ProgressBar` component, add a `<p>` showing completed section count: `"3 of 5 sections completed"`
- Use `text-xs text-muted-foreground` styling
- Derive count from `sectionStatus` object (count truthy values)

---

### 2. Animated Waving Hand Emoji in Home Hero

**File: `src/components/home/HomeHeroSection.tsx`**

Currently the greeting text doesn't include a waving hand. Add an animated wave emoji after the greeting.

- Append a `<motion.span>` with the wave emoji after the greeting text
- Animation: rotate between -10deg and 20deg with a spring transition, looping 3 times then stopping
- Use `display: inline-block` and `transform-origin: 70% 70%` for natural wrist pivot

---

### 3. Enhanced Auto-Save Indicator with Checkmark Animation

**File: `src/pages/EditorPage.tsx`**

The current save indicator is functional but static. Add a brief animated checkmark when transitioning from "Saving..." to "Saved".

- Add a `prevSavingRef` to track previous `isSaving` state
- When `isSaving` transitions from `true` to `false`, briefly show a green checkmark with a scale-in animation before settling to the standard "Saved" text
- Use CSS transition: scale from 0 to 1 over 300ms with `animate-scale-in`

---

### 4. Haptic Feedback on Editor Navigation Buttons

**File: `src/pages/EditorPage.tsx`**

The Next/Previous buttons at the bottom of sections don't currently trigger haptic feedback.

- Import `haptics` from `@/lib/haptics`
- Add `haptics.light()` call in the Previous button's onClick
- Add `haptics.medium()` call in the Next button's onClick  
- Add `haptics.success()` in the Preview & Export button's onClick

---

### 5. Spring Entry Animations for Section Cards

**File: `src/pages/EditorPage.tsx`**

Currently section cards use `animate-in fade-in-0 slide-in-from-bottom-2 duration-200`. Enhance with a spring-based animation for a more natural feel.

- Replace the CSS `animate-in` classes with inline `style` using a CSS keyframe that has a slight overshoot (spring-like)
- Add a new keyframe `@keyframes spring-enter` in the editor's style block:
  ```
  0% { opacity: 0; transform: translateY(12px) scale(0.98); }
  60% { opacity: 1; transform: translateY(-2px) scale(1.005); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
  ```
- Apply to each section card wrapper with `animation: spring-enter 0.35s ease-out`

---

### Technical Details

**What we're NOT implementing (and why):**
- Top NProgress-style loading bar: The app already has inline loading states and the OfflineIndicator badge. Adding a global bar would conflict with the existing patterns and add complexity to the editor (which avoids framer-motion for stability).
- Parallax effect on dashboard gradient lines: The dashboard uses a flat glass design without gradient background lines. Adding parallax would require new background elements and increase scroll jank on mobile.
- Skeleton loaders for editor: Editor content renders synchronously from Zustand store (no async load), so skeletons would flash for 0ms and add no value.
- First-section confetti: Already implemented -- section completions trigger confetti bursts on the stepper icons and celebration toasts.

**Editor stability note:** Per existing constraints, the editor avoids framer-motion layout animations and AnimatePresence to prevent infinite loop crashes. All new animations use CSS keyframes or inline styles only.

### Files Modified

- `src/pages/EditorPage.tsx` -- section count text, save checkmark animation, haptic feedback on nav buttons, spring entry keyframe for sections
- `src/components/home/HomeHeroSection.tsx` -- animated waving hand emoji

