

# Landing Page Redesign -- Cleaner, More Professional

## Design Philosophy
Simplify the visual noise while keeping the cosmic/space brand identity. The current page has too many competing visual effects (particles, blobs, rotating borders, pulsing rings, gradient meshes) that make it feel cluttered. The redesign focuses on **clarity, breathing room, and polish**.

## Key Design Changes

### 1. SpaceBackground -- Simplify
- Keep the deep space gradient and star field (they're already lightweight)
- Remove the shooting star animation (distracting)
- Reduce nebula opacity from 40% to 25% for subtlety

### 2. HeroSection -- Clean & Focused
- Remove the 3 animated gradient mesh blobs (visual noise)
- Remove the 6 floating particle orbs (clutter)
- Remove the 2 pulsing concentric rings around the planet logo
- Remove the `rotating-border` wrapper on CTA buttons -- use clean glass card instead
- Remove the `animate-cta-glow` from the primary button
- Make the PlanetLogo smaller (use `md` size instead of `lg`) for better proportion
- Add more vertical spacing between elements for breathing room
- Simplify the subtitle text to be shorter and punchier
- Keep the avatar dropdown and sign-in button as-is

### 3. QuickActions -- Remove Entirely
- The hero already has "Create New Resume" and "Upload Existing Resume" buttons
- QuickActions section duplicates these with 4 cards (Create New, Upload Resume, AI Tailor, Mock Interview)
- Removing it eliminates redundancy and shortens the page

### 4. SocialProofBar -- Subtle Refinement
- Reduce padding, make it feel inline rather than a standalone section
- Keep the 3 stats but use slightly smaller text

### 5. WhyWiseResume -- Cleaner Cards
- Keep the BulletTransformCard (it's the strongest visual)
- Keep the 4 feature cards in the 2x2 grid
- Remove ATSScoreCard (redundant with FeatureGrid's "ATS Match Score")
- Cleaner section header without emoji

### 6. HowItWorks -- Simplify
- Keep the 3-step layout
- Remove emoji from section header
- Use cleaner step badges

### 7. FeatureGrid -- Reduce to 4 Features
- Remove "AI Humanizer" and "12 Pro Templates" (covered elsewhere)
- Keep: ATS Match Score, Smart Tailor, Voice Interview, 4 AI Recruiters
- Use a clean 2x2 grid on mobile
- Remove emoji from section header

### 8. TemplateGallery -- Keep As-Is
- The horizontal scroll carousel with mini-previews is well done
- Just clean up section header (remove emoji)

### 9. BottomCTA -- Simplify
- Remove the nebula glow overlay
- Remove emoji from heading
- Cleaner, more confident copy
- Remove "Already aboard?" sign-in link (redundant with hero)

## Files Changed

| File | Change |
|------|--------|
| `src/components/landing/SpaceBackground.tsx` | Remove shooting star, reduce nebula opacity |
| `src/components/landing/HeroSection.tsx` | Remove blobs, particles, pulsing rings, rotating-border; use smaller logo; cleaner CTA card |
| `src/pages/Index.tsx` | Remove QuickActions import and section |
| `src/components/landing/SocialProofBar.tsx` | Minor padding/sizing tweaks |
| `src/components/landing/WhyWiseResume.tsx` | Remove ATSScoreCard, clean headers |
| `src/components/landing/HowItWorks.tsx` | Remove emoji from header |
| `src/components/landing/FeatureGrid.tsx` | Reduce to 4 features, remove emoji, 2x2 grid |
| `src/components/landing/BottomCTA.tsx` | Remove nebula glow, clean copy, remove redundant sign-in link |
| `src/components/landing/TemplateGallery.tsx` | Clean section header |

## What Stays the Same
- Space theme colors and dark background
- All authentication/avatar dropdown logic
- Glassmorphism design system
- Lazy loading architecture
- Mobile-first responsive approach
- Template gallery carousel with mini previews
- PlanetLogo component (just used at smaller size)

