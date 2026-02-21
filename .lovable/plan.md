

# Fix Splash Screen Performance

## The Problem
The current splash screen runs **120+ concurrent infinite Framer Motion animation loops** during its 3.2-second lifespan:
- 30 star particles, each with 4 independently animated properties (`opacity`, `x`, `y`, `scale`) set to `repeat: Infinity`
- Logo scale set to `repeat: Infinity, repeatType: 'reverse'`
- Glow ring with `repeat: Infinity, repeatType: 'reverse'`
- 10 letter spans each with infinite CSS shimmer
- An inline `<style>` tag injected into the DOM

On mobile devices, this causes frame drops and GPU pressure during the most critical moment of app launch.

## The Fix
Optimize for the 3.2-second lifespan -- no animation needs to repeat infinitely since the component dismisses.

### File: `src/components/AnimatedSplash.tsx`

**1. Reduce star count from 30 to 12**
- 12 stars are visually sufficient on mobile screens
- Cuts animated elements by 60%

**2. Remove ALL `repeat: Infinity` from Framer Motion animations**
- Stars: animate once to their target position/opacity, then hold. No looping needed.
- Logo: scale up with bounce, then hold at 1.0. Remove the breathing loop.
- Glow ring: pulse once and settle. Remove the infinite reverse loop.
- These all dismiss in 3.2s anyway -- infinite loops waste GPU cycles.

**3. Replace per-letter CSS shimmer with a single gradient animation on the whole title**
- Currently: 10 separate `<motion.span>` elements each with their own infinite CSS `background-position` animation
- After: Keep the staggered entrance (letter-by-letter), but apply the shimmer as a single CSS animation on the parent `<h1>` instead of each letter

**4. Move the `<style>` tag to a static declaration outside the component**
- The inline `<style>` block is re-injected every render. Move the keyframes to the module level or use a `useEffect` to inject once.

**5. Add `will-change: transform, opacity` to the star container**
- Promotes the layer to GPU compositing for smoother transforms

### Expected Result
- From ~140 concurrent animation loops down to ~20 one-shot animations
- Smoother launch experience on mid-range Android devices
- Same visual quality -- the animations still look cinematic, they just don't loop uselessly

### No new dependencies needed
All changes are within the single file using existing Framer Motion APIs.
