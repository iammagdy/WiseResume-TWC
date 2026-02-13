

## Add Polish, Micro-Interactions, and Entrance Animations to Homepage

### Overview
Add framer-motion entrance animations, hover micro-interactions, and scroll-triggered reveals to make the homepage feel alive and premium. All animations will respect `prefers-reduced-motion` and use GPU-accelerated transforms.

### Approach
Use **framer-motion** (already installed) for orchestrated entrance animations and hover states. Leverage existing Tailwind keyframes (`float`, `glow-pulse`, `slide-up`) where possible. Add a `useReducedMotion` check to disable animations for accessibility.

---

### File: `src/pages/Index.tsx` (complete enhancement)

**Imports to add:**
- `motion` from `framer-motion`
- No new dependencies needed

**1. Hero Section Animations**
- Wrap `AppIcon` in `motion.div` with `animate-float` class for continuous floating (already exists in Tailwind config: 3s ease-in-out infinite)
- Glow div: switch from `animate-pulse` to `animate-glow-pulse` (already in config: shadow 0.3 to 0.5 opacity, 2s)
- Headline (`h1`): `motion.h1` with `initial={{ opacity: 0, y: 20 }}`, `animate={{ opacity: 1, y: 0 }}`, `transition={{ delay: 0.1, duration: 0.6 }}`
- Subtext (`p`): `motion.p` with same pattern, `delay: 0.2`
- CTA Button: `motion.div` wrapper with `delay: 0.25`, plus hover `whileHover={{ scale: 1.02 }}`, `whileTap={{ scale: 0.98 }}`. Increase glow shadow on hover via className
- Sign-in link: `motion.button` with `delay: 0.3`
- Trust line: `motion.div` with `delay: 0.35`

**2. Steps Row Animations**
- Entire section: `motion.section` with `initial={{ opacity: 0, y: 20 }}`, `whileInView={{ opacity: 1, y: 0 }}`, `viewport={{ once: true, margin: '-50px' }}`
- Each step icon: staggered via `transition={{ delay: 0.1 * i }}` inside the map
- Connecting lines: animated width using `motion.div` with `initial={{ scaleX: 0 }}`, `whileInView={{ scaleX: 1 }}`, origin left
- Icon hover: `whileHover={{ y: -4 }}` with drop shadow class on hover

**3. Feature Cards Animations**
- Section title: `motion.h2` with `whileInView` fade-in
- Each card: `motion.div` with staggered `whileInView` (delay `0.15 * i`), slide-up entrance
- Hover state: `whileHover={{ y: -4, transition: { duration: 0.2 } }}` + CSS class for border glow and background brighten
- Icon inside card: subtle `whileHover={{ rotate: 5 }}` on parent hover (or CSS `group-hover`)

**4. Template Preview Animations**
- Each template card: `motion.div` with staggered entrance from right (`initial={{ opacity: 0, x: 30 }}`)
- Scroll container: add gradient fade overlays on left/right edges using pseudo-elements (CSS `mask-image` or overlay divs with `pointer-events-none`)
- Card hover: `whileHover={{ scale: 1.05 }}` with shadow
- "Browse All" link: CSS underline animation on hover (use existing `story-link` class or add `after:` pseudo)

**5. Bottom Tab Bar Polish**
- Add "App Preview" label above the bar (subtle, 10px text, muted)
- Reduce overall opacity to 50-60%
- Icons: add `animate-pulse` with custom timing (CSS `animation-delay` per icon)

**6. Reduced Motion Support**
- Import `useReducedMotion` from framer-motion
- When reduced motion preferred: set all animation variants to `{ opacity: 1, y: 0, x: 0 }` immediately (no transitions)
- Wrap in a simple check: `const shouldAnimate = !prefersReducedMotion`

---

### Technical Details

**No new Tailwind keyframes needed** -- all required animations (`float`, `glow-pulse`, `slide-up`, `fade-in`) already exist in `tailwind.config.ts`.

**Framer Motion patterns used:**
- `motion.div` / `motion.h1` / `motion.p` for declarative animations
- `whileInView` with `viewport={{ once: true }}` for scroll-triggered entrances
- `whileHover` / `whileTap` for micro-interactions
- Staggered children via index-based `delay`

**Performance:**
- All animations use `transform` and `opacity` only (GPU-composited)
- `viewport={{ once: true }}` prevents re-triggering
- No `will-change` needed for framer-motion (handles it internally)
- Total animation budget: hero loads in 350ms, below-fold triggers on scroll

**Files modified:**
1. `src/pages/Index.tsx` -- Add framer-motion wrappers, hover states, scroll-triggered reveals, gradient overlays, reduced motion support
