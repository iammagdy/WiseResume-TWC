

## Polish the Tailor Loading Screen with Real-Feel Progress

### Problem
The current tailor loading screen uses a fake progress simulation - a `setInterval` that advances steps every 1.5 seconds regardless of actual backend progress. This means:
- The percentage jumps in fixed increments (not smooth)
- Steps complete even if the AI is still working
- Progress can reach 85% and freeze there while waiting for the response
- No visual feedback when the backend actually finishes

### Solution: Smooth, Real-Feel Progress

**1. Smooth animated percentage counter (aiTailor.ts)**
- Replace the fixed 1.5s interval with a smooth progress animation that accelerates at first then slows down as it approaches 85%
- Use smaller increments (every 200ms) with an easing curve so the bar feels continuous
- Steps advance based on percentage thresholds rather than fixed time intervals
- When the backend responds, animate quickly from current position to 100%

**2. Redesigned TailorProgress component (TailorProgress.tsx)**
- Add a large animated percentage number in the center (like a score ring) that counts up smoothly
- Replace the flat progress bar with a thicker, more prominent bar with a glowing pulse effect
- Add an estimated time remaining indicator ("~15s remaining") that counts down
- Make completed steps fade in with a satisfying check animation
- Add a subtle particle/sparkle effect around the progress percentage
- Improve the step list with better spacing and a connecting vertical line between steps

**3. Visual enhancements**
- Animated number counter that smoothly increments (not jumping)
- Progress bar height increased from 2.5 to 3.5 with a glow shadow
- Current step gets a subtle bounce animation
- Completed steps slide in their checkmark with a spring effect
- Fun fact card gets a smoother crossfade transition

### Files to Change

**`src/lib/aiTailor.ts`** - Replace fixed-interval progress with smooth easing:
- Use `requestAnimationFrame`-style updates every 200ms
- Progress follows an ease-out curve: fast at start, slowing near 85%
- Step transitions happen at specific percentage thresholds (10%, 20%, 35%, 50%, 60%, 70%, 75%, 80%)
- On backend completion, animate from current to 100% over 500ms

**`src/components/editor/tailor/TailorProgress.tsx`** - Visual redesign:
- Add a large centered percentage display with smooth CSS counter animation
- Use `useRef` + `requestAnimationFrame` for smooth number interpolation between progress values
- Add vertical connecting line between step dots
- Increase progress bar height and add glow effect
- Add estimated time display
- Improve step transitions with spring-like animations using framer-motion
- Better visual hierarchy: large percentage at top, progress bar below, then steps

### Technical Details

The smooth number animation will use a ref-based approach:
```typescript
// Interpolate displayed number toward target
const displayedProgress = useRef(0);
useEffect(() => {
  let raf: number;
  const animate = () => {
    const diff = progress.progress - displayedProgress.current;
    if (Math.abs(diff) > 0.5) {
      displayedProgress.current += diff * 0.08;
      setDisplayNum(Math.round(displayedProgress.current));
      raf = requestAnimationFrame(animate);
    } else {
      displayedProgress.current = progress.progress;
      setDisplayNum(Math.round(progress.progress));
    }
  };
  raf = requestAnimationFrame(animate);
  return () => cancelAnimationFrame(raf);
}, [progress.progress]);
```

The progress easing in aiTailor.ts will use a logarithmic curve:
```typescript
// Progress follows: fast start, slow approach to 85%
const elapsed = Date.now() - startTime;
const t = Math.min(elapsed / 30000, 1); // 30s expected max
const eased = 1 - Math.pow(1 - t, 3); // cubic ease-out
const progress = Math.min(eased * 85, 85);
```

