

# Add Scroll-Driven Animations to WhyWiseResume and SocialProofBar

## What Changes

Both components currently use CSS-only `animate-fade-in-up` classes that play once on mount and never reverse. We'll replace them with framer-motion scroll-driven animations that fade in on scroll down and fade out on scroll up, matching the pattern already used on the Index page.

## SocialProofBar

**Import** `motion` from `framer-motion`.

**Section wrapper** (line 17): Replace the static `animate-fade-in-up` class with a `motion.section` using a fade-up animation:
```tsx
<motion.section
  className="py-6 px-4"
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: false, amount: 0.2 }}
  transition={{ duration: 0.5, ease: 'easeOut' }}
>
```

**Stats row** (line 19-31): Wrap the stats container in a `motion.div` with a pop-in spring animation:
```tsx
initial={{ opacity: 0, scale: 0.9 }}
whileInView={{ opacity: 1, scale: 1 }}
viewport={{ once: false, amount: 0.3 }}
transition={{ type: 'spring', stiffness: 300, damping: 20 }}
```

**Each testimonial card** (line 36-50): Wrap in `motion.div` with a staggered slide-in from the right:
```tsx
initial={{ opacity: 0, x: 30 }}
whileInView={{ opacity: 1, x: 0 }}
viewport={{ once: false, amount: 0.3 }}
transition={{ delay: index * 0.1, duration: 0.4, ease: 'easeOut' }}
```

Remove the old `style={{ animationDelay: '0.2s' }}` and `animate-fade-in-up` class.

## WhyWiseResume

**Import** `motion` from `framer-motion`.

**Heading** (line 7): Replace the `animate-fade-in-up` div with a `motion.div` fade-up:
```tsx
initial={{ opacity: 0, y: 20 }}
whileInView={{ opacity: 1, y: 0 }}
viewport={{ once: false, amount: 0.2 }}
transition={{ duration: 0.5, ease: 'easeOut' }}
```

**BulletTransformCard wrapper** (line 17): Replace `animate-fade-in-up` div with a `motion.div` using scale-in with blur:
```tsx
initial={{ opacity: 0, scale: 0.92, filter: 'blur(4px)' }}
whileInView={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
viewport={{ once: false, amount: 0.2 }}
transition={{ duration: 0.6, ease: 'easeOut' }}
```

**Each feature card wrapper** (line 28): Replace `animate-fade-in-up` div with a `motion.div` using slide-in from left with stagger:
```tsx
initial={{ opacity: 0, x: -30, rotate: -1 }}
whileInView={{ opacity: 1, x: 0, rotate: 0 }}
viewport={{ once: false, amount: 0.2 }}
transition={{ delay: i * 0.1, duration: 0.5, ease: 'easeOut' }}
```

Remove all old `animate-fade-in-up` classes and `animationDelay` style props.

## Animation Summary

| Component | Element | Animation Style |
|---|---|---|
| SocialProofBar | Section | Fade up |
| SocialProofBar | Stats row | Spring pop-in |
| SocialProofBar | Testimonial cards | Staggered slide from right |
| WhyWiseResume | Heading | Fade up |
| WhyWiseResume | Bullet Transform card | Scale-in with blur |
| WhyWiseResume | Feature cards | Staggered slide from left |

## No changes to:
- Any internal component logic, props, or styles
- Index.tsx animations
- Any other files

| File | Change |
|---|---|
| `SocialProofBar.tsx` | Import motion, replace CSS animations with framer-motion scroll-driven animations |
| `WhyWiseResume.tsx` | Import motion, replace CSS animations with framer-motion scroll-driven animations |

