

## Enhanced Progress Bar: Taller, Color-Shifting, Confetti

### Changes

**File: `src/components/editor/ProgressBar.tsx`**

**1. Increase bar height**
- Change track from `h-2` (8px) to `h-3` (12px) for more visual prominence
- The bar fill stays `h-full` inside it

**2. Dynamic color based on progress**
- Replace the static `gradient-primary` class with an inline `background` style that shifts through a color range:
  - 0-33%: Red (`hsl(0, 80%, 55%)`)
  - 34-66%: Amber/Yellow (`hsl(40, 90%, 50%)`)
  - 67-99%: Green (`hsl(140, 70%, 45%)`)
  - 100%: Keep existing `bg-success`
- Use a helper function `getProgressColor(progress)` that returns the appropriate HSL value
- Add a subtle inner shadow/glow matching the current color

**3. Percentage label update**
- Keep the existing "Resume XX% Complete" text label next to the bar
- Make it slightly bolder and color-match it to the bar color for visual cohesion

**4. Smooth animation**
- Keep the existing `transition: 'width 0.7s ease-out'` for the fill
- Add `transition: 'background-color 0.5s ease'` so color changes animate smoothly

**5. Confetti burst at 100%**
- Add a `useEffect` + `useRef` to detect when progress transitions to 100 (track previous value)
- When hitting 100%, render 8-10 confetti particles using CSS keyframe animations (similar pattern to StepperNav's `stepper-confetti-burst`)
- Particles burst outward from the bar center, fade out after ~1s, then unmount
- Add a `<style>` block with the confetti keyframe (or reuse existing one)
- Also trigger a brief scale pulse on the percentage text

**6. ProgressRing variant**
- Apply the same color logic to the ring stroke so both variants are consistent

### Helper function

```typescript
function getProgressColor(progress: number): string {
  if (progress >= 100) return 'hsl(var(--success))';
  if (progress >= 67) return 'hsl(140, 70%, 45%)';
  if (progress >= 34) return 'hsl(40, 90%, 50%)';
  return 'hsl(0, 80%, 55%)';
}
```

### Visual Result

```text
Before:
Resume 45% Complete [====------] (thin, single color)

After:
Resume 45% Complete [======--------] (taller, amber fill, smooth transition)
Resume 100% Complete [==============] (green + confetti burst!)
```

### Files Modified
- `src/components/editor/ProgressBar.tsx` -- all changes in this single file

