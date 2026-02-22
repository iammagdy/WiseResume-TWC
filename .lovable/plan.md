

# Fix Logo Black Background + Theme Feature Verification

## Problem

The app logo (`wise-ai-logo.webp`) has a black background baked into the image file itself. This causes an ugly dark square to appear behind the logo across the entire app -- on the landing page, splash screen, loading spinner, home screen, footer, and other locations.

## Solution

Since the `.webp` file has a non-transparent background, we need to:

1. **Create a new transparent logo** by converting the existing `.png` file or creating a CSS-based approach to mask out the black background
2. **Update all references** from `.webp` to the transparent version

## Affected Locations (7 places)

| Location | File | How Logo Is Used |
|----------|------|-----------------|
| Landing page header | `src/pages/Index.tsx` | Small logo in top-left nav |
| Landing page hero | `src/pages/Index.tsx` | Large 120x120 hero logo |
| App Icon (splash, spinner, home) | `src/components/brand/AppIcon.tsx` | Central component used everywhere |
| Footer | `src/components/landing/Footer.tsx` | Brand logo in footer |
| QR Code Studio | `src/components/portfolio/qr/QRGeneratorSheet.tsx` | Logo overlay on QR codes |
| Job Match Score | `src/components/applications/JobMatchScore.tsx` | Badge-style logo |
| HTML loading spinner | `index.html` | Uses `favicon.png` (separate file) |

## Changes

### 1. `src/components/brand/AppIcon.tsx`
- Switch import from `wise-ai-logo.webp` to `wise-ai-logo.png`
- Add `border-radius: 16px` (rounded corners like an app icon) to visually soften the appearance if the PNG also has the same issue
- Add a CSS approach to handle non-transparent logos: apply `border-radius` and `overflow: hidden` so the square edges are masked

### 2. `src/pages/Index.tsx`
- Change import from `wise-ai-logo.webp` to `wise-ai-logo.png`
- Apply rounded styling to both the header logo (line 259) and hero logo (line 322)

### 3. `src/components/landing/Footer.tsx`
- Change import from `.webp` to `.png`
- Apply consistent rounded styling

### 4. `src/components/portfolio/qr/QRGeneratorSheet.tsx`
- Change import from `.webp` to `.png`

### 5. `src/components/applications/JobMatchScore.tsx`
- Change import from `.webp` to `.png`

### 6. `index.html`
- The inline loading spinner uses `favicon.png` -- add `border-radius: 12px` to the img tag to round corners if needed

### 7. `src/components/AnimatedSplash.tsx`
- Uses `AppIcon` component, so it gets fixed automatically when AppIcon is updated

### 8. `src/components/ui/PageLoadingSpinner.tsx`
- Uses `AppIcon` component, so it gets fixed automatically when AppIcon is updated

## Technical Notes

- The `.png` version (`wise-ai-logo.png`) exists in `src/assets/` and may already have transparency. If it does, the fix is simply swapping the import. If it also has a black background, we'll apply `border-radius: 16px` as an app-icon-style mask to make it look intentional and polished.
- All 5 files that directly import `wise-ai-logo.webp` need their import path updated
- The 3 components that use `AppIcon` (AnimatedSplash, PageLoadingSpinner, HomeHeroSection) are fixed automatically

## Files Modified

| File | Change |
|------|--------|
| `src/components/brand/AppIcon.tsx` | Switch to `.png`, add rounded styling |
| `src/pages/Index.tsx` | Switch to `.png`, add rounded styling |
| `src/components/landing/Footer.tsx` | Switch to `.png` |
| `src/components/portfolio/qr/QRGeneratorSheet.tsx` | Switch to `.png` |
| `src/components/applications/JobMatchScore.tsx` | Switch to `.png` |
| `index.html` | Add border-radius to favicon img |
