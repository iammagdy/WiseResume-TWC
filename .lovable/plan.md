
# Add Loading Skeleton Placeholders for Lazy-Loaded Sections

## Overview
This plan adds polished, structure-matching skeleton placeholders for all lazy-loaded components in the Index page. These skeletons will provide a better visual loading experience on slow connections by showing content placeholders that match the actual component structure.

## Changes

### 1. Create Landing Page Skeleton Components
Create a new file `src/components/landing/LandingSkeletons.tsx` with skeleton components for each landing section:

**HeroSkeleton**
- Circular placeholder for the planet logo
- Text lines for welcome text, headline, and subheadline
- Two button placeholders
- Trust text placeholder

**SocialProofSkeleton**
- Row of 3 stat items with icon and text placeholders

**HowItWorksSkeleton**
- Section header placeholder
- 3 step cards with circular icons and connecting lines

**FeatureGridSkeleton**
- Section header placeholder
- 3 feature cards with icon, title, and description

**TemplateGallerySkeleton**
- Section header placeholder
- 3 template thumbnail placeholders
- Pagination dots

**BottomCTASkeleton**
- Icon circle placeholder
- Title and description text
- CTA button placeholder

### 2. Create Dashboard Skeleton Components
Create a new file `src/components/home/HomeSkeletons.tsx` with:

**ResumeCardSkeleton**
- Matches ResumeCard structure: icon, title, subtitle, progress, arrow

**ActionCardSkeleton**
- Matches ActionCard structure: icon, title, description

### 3. Create Full Landing Page Skeleton
A combined `LandingPageSkeleton` component that shows the full page loading state with all section skeletons arranged properly.

### 4. Update Index.tsx
Replace the basic fallback divs with the new skeleton components:
- Use `LandingPageSkeleton` as fallback for the landing page
- Use `ResumeCardSkeleton` for ResumeCard suspense
- Use `ActionCardSkeleton` for ActionCard suspense

## Technical Details

### File Structure
```
src/components/
├── landing/
│   └── LandingSkeletons.tsx  (NEW)
├── home/
│   └── HomeSkeletons.tsx     (NEW)
└── pages/
    └── Index.tsx             (MODIFY)
```

### Skeleton Design Principles
- Use the existing `Skeleton` component for shimmer effects
- Match exact dimensions and spacing of actual components
- Use subtle animations that don't compete with page content
- Staggered fade-in animations for visual polish

### Expected Impact
- Improved perceived performance on slow connections
- Professional loading states that match the app's space theme
- Better user experience during initial page load
- Consistent visual feedback while components lazy-load
