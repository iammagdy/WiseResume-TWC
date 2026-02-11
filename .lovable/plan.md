

# Add App Logo to Auth Page Header

## Change

Add the `AppIcon` component above the header text in `src/pages/AuthPage.tsx`, centered with a subtle drop shadow and fade-in animation.

## File: `src/pages/AuthPage.tsx`

- Import `AppIcon` from `@/components/brand/AppIcon`
- Insert a `motion.div` containing `<AppIcon size={48} />` just above the existing header `div` (before line 181)
- Apply a subtle purple drop shadow (`filter: drop-shadow(...)`) and a fade-in + scale-up entrance animation
- Add `mb-4` spacing below the icon

The result: a clean, centered app icon at the top of the auth card area, matching the existing branding style.

