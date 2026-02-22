

# Futuristic Loading Spinner

## Overview
Replace the current simple border-spinner in `PageLoadingSpinner` with a futuristic animated design featuring glowing orbital rings, a pulsing core, and particle effects -- all built with Framer Motion and Tailwind (no new dependencies).

## Design
The new spinner will feature:
- A glowing pulsing core circle with the app's primary color
- Two orbital rings rotating at different speeds and angles
- Subtle floating particle dots that fade in and out
- A shimmer text effect on the "Loading..." label
- Smooth fade-in entrance animation

## Scope

### Component updated
**`src/components/ui/PageLoadingSpinner.tsx`** -- complete redesign of the spinner visuals using Framer Motion animations (already imported).

### Where it appears (no changes needed in these files)
The component is already used in:
- `src/App.tsx` -- fallback for auth callback, privacy, and terms pages
- `src/pages/AuthCallbackPage.tsx` -- shown during OAuth redirect
- `src/pages/InterviewPage.tsx` -- shown while store hydrates

All usages import `PageLoadingSpinner` so updating the single component file updates all pages automatically.

### What is NOT changing
- Button-level `Loader2 animate-spin` indicators (60+ files) -- these are contextual inline spinners for buttons and should remain as-is
- Page skeleton components (`DashboardSkeleton`, `EditorSkeleton`, etc.) -- these are layout-aware placeholder UIs, not spinners
- The `AnimatedSplash` component -- separate first-launch experience

## Technical Details
- No new dependencies; uses existing `framer-motion`
- CSS keyframes added inline via Framer Motion's `animate` prop (no index.css changes needed)
- Respects `prefers-reduced-motion` by falling back to a simpler fade animation
- Keeps the same outer container structure (`min-h-[100dvh]`, `bg-background`, centered) for layout consistency

