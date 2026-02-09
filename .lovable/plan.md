

# Further Landing Page Performance Optimization

## Current Issues Found

The landing page still has significant performance drag from **framer-motion** being used heavily across every section, plus unnecessary data fetching and heavy component rendering on the landing page.

### Issue 1: PlanetLogo runs 5 infinite JS animations
The PlanetLogo component uses 5 separate `framer-motion` `animate` loops (orbital ring, glow pulse, planet float, 3 orbiting particles) -- all running from the moment the page loads.

### Issue 2: HeroSection fetches auth + profile on landing
`useAuth()` and `useProfile()` trigger network requests (session check, profile fetch) even for first-time visitors who have no account. This blocks rendering.

### Issue 3: HowItWorks has infinite particle animations
Each connecting line between steps has a `motion.div` particle animated left-to-right infinitely.

### Issue 4: FeatureGrid creates 18 animated star particles
Each of the 6 feature cards has 3 `motion.div` star particles with infinite opacity/scale animations -- even though they're only visible on hover.

### Issue 5: AnimatedCounter uses setInterval at 60fps
The counter in SocialProofBar fires `setInterval` every 16ms (60fps) to count up numbers, which is wasteful on mobile.

### Issue 6: TemplateGallery renders full template trees
3 complete template React component trees (each 612x792px) are rendered just for small thumbnails on the landing page.

---

## Solution

### Part 1: Replace PlanetLogo framer-motion with CSS (`PlanetLogo.tsx`)
- Replace all 5 `motion.div` elements with plain `div` elements using CSS animations
- Add CSS keyframes for orbit, glow-pulse, and float in `index.css`
- Remove `framer-motion` import entirely from this component

### Part 2: Defer auth/profile loading in HeroSection (`HeroSection.tsx`)
- Remove `useAuth()` and `useProfile()` from the hero
- Show a generic user icon always; only check auth state lazily after the page has loaded (via `useEffect` with `requestIdleCallback`)
- This eliminates network requests blocking the landing page

### Part 3: Remove infinite particle animations (`HowItWorks.tsx`)
- Replace the animated particle `motion.div` on connecting lines with a static gradient dot or remove entirely
- Replace `motion.div` wrappers with plain `div` + CSS fade-in class
- Remove `framer-motion` import

### Part 4: Remove star particle animations (`FeatureGrid.tsx`)
- Remove the 18 `motion.div` star particles entirely (they're only visible on hover and add no value on mobile where there's no hover)
- Replace `motion.div` wrappers with plain `div` + CSS classes for entrance animations
- Remove `framer-motion` import

### Part 5: Replace AnimatedCounter with CSS counter (`SocialProofBar.tsx`)
- Replace the `setInterval`-based counter with a simple CSS animation or just show the final number immediately
- Replace `motion.section` with plain section + CSS fade-in
- Remove `framer-motion` import

### Part 6: Remove framer-motion from remaining sections
- **WhyWiseResume.tsx**: Replace `motion.div` variants with CSS classes, replace bouncing arrow with CSS animation
- **BottomCTA.tsx**: Replace `motion.div` with CSS fade-in classes

### Part 7: Use static images for TemplateGallery thumbnails (`TemplateGallery.tsx`)
- Instead of rendering full template component trees, use simple colored placeholder cards with template name labels
- This eliminates 3 heavy React subtrees from the landing page

### Part 8: Add new CSS animations to `index.css`
Add these lightweight CSS keyframes:
- `orbit-rotate` - for PlanetLogo orbital ring
- `glow-pulse` - for PlanetLogo outer glow
- `float-gentle` - for PlanetLogo planet body
- `fade-in-up` - reusable entrance animation for all sections

---

## Technical Details

### Files to Modify

| File | Change | Impact |
|------|--------|--------|
| `src/components/landing/PlanetLogo.tsx` | Replace 5 motion.div with CSS animations | Remove ~5 JS animation loops |
| `src/components/landing/HeroSection.tsx` | Defer auth loading, remove useProfile from critical path | Eliminate 2 network requests on load |
| `src/components/landing/HowItWorks.tsx` | Remove framer-motion, use CSS | Remove 2 infinite JS animations |
| `src/components/landing/FeatureGrid.tsx` | Remove star particles + framer-motion | Remove 18 infinite JS animations |
| `src/components/landing/SocialProofBar.tsx` | Remove AnimatedCounter, use CSS | Remove 60fps setInterval |
| `src/components/landing/WhyWiseResume.tsx` | Remove framer-motion, use CSS | Remove stagger animations |
| `src/components/landing/BottomCTA.tsx` | Remove framer-motion, use CSS | Remove 2 motion elements |
| `src/components/landing/TemplateGallery.tsx` | Replace full templates with styled placeholders | Remove 3 heavy component trees |
| `src/index.css` | Add CSS keyframes for orbit, glow, float, fade-in-up | Enable CSS-only animations |

### Expected Improvements

| Metric | Current | After |
|--------|---------|-------|
| JS animation loops on load | ~30 | 0 |
| framer-motion imports on landing | 7 files | 0 files |
| Network requests on landing | 3+ (auth, profile, session) | 0 (deferred) |
| React component trees for thumbnails | 3 full templates | 3 simple divs |
| Main thread blocking time | High | Minimal |

### Testing Checklist
1. Landing page renders instantly on mobile without delay
2. PlanetLogo still has orbital ring, glow, and float effect (via CSS)
3. Scrolling is smooth with no jank
4. "Launch Your Resume" and "Upload existing resume" buttons work
5. Profile avatar still appears after idle auth check
6. Template gallery shows styled placeholders that look good
7. All entrance animations still work (fade-in on scroll)

