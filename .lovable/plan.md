
# Add Intersection Observer for Landing Section Lazy Loading

## Overview
This plan implements a view-based lazy loading system for landing page sections. Instead of loading all sections immediately when the landing page mounts, each section will only load when it comes into view (or is about to). This further improves initial load performance by deferring JavaScript execution for below-the-fold content.

## Technical Approach

### 1. Create a Reusable `useInView` Hook
Create a new hook `src/hooks/useInView.ts` that wraps the Intersection Observer API:

- **Parameters:**
  - `rootMargin`: How far from the viewport to trigger loading (default: `"200px"` to preload slightly before visible)
  - `threshold`: Visibility threshold to trigger (default: `0`)
  - `triggerOnce`: Whether to stop observing after first intersection (default: `true`)

- **Returns:**
  - `ref`: A ref to attach to the container element
  - `inView`: Boolean indicating if element is/was in view

### 2. Create a `LazySection` Wrapper Component
Create `src/components/landing/LazySection.tsx`:

- Wraps any lazy-loaded section with intersection observer logic
- Shows the appropriate skeleton placeholder while not yet in view
- Only renders the actual component via `Suspense` when in view or after first visibility
- Uses the reusable `useInView` hook internally

### 3. Update Index.tsx Landing Page
Modify the landing page to use `LazySection` for below-the-fold content:

- **Always load immediately:** `HeroSection` (above the fold, critical for FCP)
- **Load when in view:** `SocialProofBar`, `HowItWorks`, `FeatureGrid`, `TemplateGallery`, `BottomCTA`

The structure will change from:
```tsx
<Suspense fallback={<LandingPageSkeleton />}>
  <SpaceBackground>
    <HeroSection />
    <SocialProofBar />
    ...
  </SpaceBackground>
</Suspense>
```

To:
```tsx
<SpaceBackground>
  <Suspense fallback={<HeroSkeleton />}>
    <HeroSection />
  </Suspense>
  <LazySection skeleton={<SocialProofSkeleton />}>
    <SocialProofBar />
  </LazySection>
  <LazySection skeleton={<HowItWorksSkeleton />}>
    <HowItWorks />
  </LazySection>
  ...
</SpaceBackground>
```

## File Changes

### New Files:
- `src/hooks/useInView.ts` - Reusable Intersection Observer hook
- `src/components/landing/LazySection.tsx` - View-based lazy loading wrapper

### Modified Files:
- `src/pages/Index.tsx` - Update landing page to use `LazySection` for below-fold content
- `src/components/landing/LandingSkeletons.tsx` - Export individual skeleton components (already done)

## Technical Details

### useInView Hook Implementation
```typescript
export function useInView(options?: {
  rootMargin?: string;
  threshold?: number;
  triggerOnce?: boolean;
}): { ref: RefCallback<Element>; inView: boolean }
```

- Uses native IntersectionObserver API for optimal performance
- Cleans up observer on unmount
- Supports `triggerOnce` to stop observing after first visibility (prevents re-renders)

### LazySection Component
```typescript
interface LazySectionProps {
  children: React.ReactNode;
  skeleton: React.ReactNode;
  rootMargin?: string;
}
```

- When `inView` is false: renders the skeleton placeholder
- When `inView` is true: renders children wrapped in Suspense with the skeleton as fallback
- Uses `rootMargin: "200px"` by default to start loading before sections enter viewport

### Performance Benefits
1. **Reduced initial JavaScript execution:** Below-fold sections don't execute until needed
2. **Smaller initial bundle parse time:** Lazy-loaded chunks are deferred
3. **Improved Time to Interactive (TTI):** Main thread is less blocked on initial load
4. **Better FCP:** Hero section loads independently without waiting for other sections

### Edge Cases Handled
- Fast scrolling: `rootMargin` ensures content starts loading before visible
- Already in view on mount: IntersectionObserver fires immediately for visible elements
- Component unmount during load: Observer cleanup prevents memory leaks
