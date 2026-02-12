

# Section Completion Celebrations - Toast Sequence and Confetti Animation

## Overview

Enhance the section completion experience with a two-part toast sequence and a confetti-like animation on the StepperNav icon when a section reaches 100%.

## Changes

### 1. EditorPage.tsx - Two-Part Toast Sequence

**Current behavior (lines 244-260):** A single toast fires with a combined message like "Contact section complete! Next: Add your professional summary."

**New behavior:** Split into two sequential toasts:
- **Immediately:** `toast.success('Excellent! Contact section complete 🎉', { duration: 3000 })`
- **After 2 seconds:** A directional toast suggesting the next section: `toast('Next: Write your professional summary →', { duration: 4000, icon: arrowIcon })` — only shown if there is a next incomplete section.

Update `TOAST_MESSAGES` to separate celebration and next-step messages:

```
CELEBRATION: { contact: 'Excellent! Contact section complete 🎉', summary: 'Summary nailed! 🎉', ... }
NEXT_STEP: { contact: 'Next: Write your professional summary →', summary: 'Next: Add your work experience →', ... }
```

The completion effect (lines 252-263) will fire `toast.success(celebration)` immediately, then `setTimeout(() => toast(nextStep), 2000)` for the follow-up. Clean up timeouts on unmount.

Additionally, pass a new `justCompleted` state (the section ID that just completed) to `StepperNav` so it can trigger its confetti animation. Clear this state after ~1.5 seconds.

### 2. StepperNav.tsx - Confetti Pulse Animation

Add a `justCompletedStep` prop (optional string). When a step's ID matches `justCompletedStep`:

- Show a brief scale-pulse animation on the icon circle (scale 1 to 1.3 and back) using a CSS keyframe or inline Tailwind animation class.
- Render 6-8 small colored dots (particles) that radiate outward from the icon center using absolute-positioned spans with a CSS keyframe animation (`scale 0 to 1, opacity 1 to 0, translate outward`). These fade out after ~800ms.
- The green checkmark icon appears as normal (already handled by the `isCompleted` state).

The particles will be simple `<span>` elements with Tailwind classes and a custom CSS keyframe defined inline or added to the component. Colors: mix of `bg-success`, `bg-primary`, `bg-warning`, `bg-amber-400` for a festive effect.

## Technical Details

### Files to Modify

**`src/pages/EditorPage.tsx`**
- Replace `TOAST_MESSAGES` (lines 244-250) with two separate maps: `CELEBRATION_MESSAGES` and `NEXT_STEP_MESSAGES`
- Update the completion effect (lines 252-263) to fire two sequential toasts with a 2-second delay
- Add `justCompletedStep` state, set it on completion, clear after 1.5s
- Pass `justCompletedStep` to `StepperNav`
- Store delayed toast timeout refs for cleanup on unmount

**`src/components/editor/StepperNav.tsx`**
- Add optional `justCompletedStep?: string` prop
- When `step.id === justCompletedStep`, render confetti particle spans and apply a pulse animation class to the icon circle
- Add a small CSS keyframe (via a `<style>` tag or Tailwind arbitrary animation) for the particle burst effect:
  - Each particle: absolute positioned at center, animates outward in a different direction over 800ms, fades out
  - Icon circle: briefly scales up to 1.3x and back over 400ms

### No Database Changes Required
