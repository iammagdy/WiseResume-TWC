

# Add App Logo to Futuristic Loading Spinner

## Overview
Place the `AppIcon` logo at the center of the spinner, replacing the plain pulsing core circle, so the orbital rings and particles animate around the branded logo.

## Change

### `src/components/ui/PageLoadingSpinner.tsx`
- Import `AppIcon` from `@/components/brand/AppIcon`
- Replace the "Pulsing core" `motion.div` (the solid primary circle with box-shadow animation) with `AppIcon` wrapped in a `motion.div` that applies the same pulsing scale and glow animation
- Use a size of ~32px for the icon so it fits neatly inside the orbital rings
- Keep the same animation properties (scale 1 to 1.25, shadow pulse) on the wrapper
- In the reduced-motion fallback, replace the inner circle with a static `AppIcon` at ~20px

### Specific replacement (main spinner, around line 88-100)
Replace:
```tsx
<motion.div
  className="relative w-6 h-6 rounded-full bg-primary shadow-..."
  animate={{ scale: [...], boxShadow: [...] }}
  ...
/>
```
With:
```tsx
<motion.div
  className="relative"
  animate={{ scale: [1, 1.15, 1] }}
  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
  style={{ filter: 'drop-shadow(0 0 20px hsl(var(--primary) / 0.5))' }}
>
  <AppIcon size={32} />
</motion.div>
```

### Reduced-motion fallback (around line 22-25)
Replace the inner `div` with `<AppIcon size={20} />`.

## Result
The branded logo pulses and glows at the center of the orbital rings, reinforcing app identity on every loading screen. No new dependencies needed.
