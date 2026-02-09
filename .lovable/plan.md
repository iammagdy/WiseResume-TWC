

# Landing Page as Default + New Logo + Enhanced Space Theme

## Summary

Transform the app to always show the space-themed landing page as the default entry point, with a new logo matching the reference screenshot (document icon with gradient and cyan sparkle), and enhanced space animations.

---

## Current State vs. Desired State

| Aspect | Current | Desired |
|--------|---------|---------|
| **Default Page** | Shows home dashboard if user has resume, landing page only for new users | Always show landing page as default for ALL users |
| **Logo** | Simple "W" lettermark in gradient square | Document icon inside gradient planet with orbital ring (like reference) |
| **Space Background** | 80 stars with basic animations | More stars, enhanced nebula effects, improved shooting star |

---

## Changes Overview

### 1. Update Index.tsx - Always Show Landing Page First

Remove the conditional logic that shows the home dashboard for users with existing resumes. Instead, always render the landing page as the default view.

```text
Current Logic:
if (hasResume) → Show HomeBackground + ResumeCard
else → Show SpaceBackground + HeroSection

New Logic:
Always → Show SpaceBackground + HeroSection (landing page)
```

The user can still access their resume by clicking "Launch Your Resume" or navigating to `/dashboard`.

### 2. Update App Logo (AppIcon.tsx)

Replace the current "W" lettermark design with a document-style icon matching the reference:

**New Logo Design:**
- Gradient background (purple to pink, rounded square)
- White document shape with folded corner
- "W" lettermark inside document
- Lines representing resume text
- Cyan sparkle in corner for AI indicator

```text
┌─────────────────────────┐
│   ╭─────────────────╮   │
│   │ ╲               │✦  │ ← Cyan AI sparkle
│   │  W              │   │ ← W lettermark
│   │ ════════════    │   │ ← Resume lines
│   │ ═════════       │   │
│   ╰─────────────────╯   │
└─────────────────────────┘
     Purple→Pink Gradient
```

### 3. Update PlanetLogo.tsx - Match Reference Style

Enhance the planet logo to match the reference screenshot:
- Document icon inside the planet
- Orbital ring with small particles
- Glowing purple atmosphere
- Small orbiting dots/moons

### 4. Enhance SpaceBackground.tsx

Add more visual interest:
- Increase star count from 80 to 120
- Add 2-3 shooting stars at different intervals
- More prominent nebula colors
- Subtle floating particles near the planet

### 5. Update Favicon

Update the favicon to match the new logo design.

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/pages/Index.tsx` | **Modify** | Remove conditional, always show landing page |
| `src/components/brand/AppIcon.tsx` | **Modify** | New document-style logo matching reference |
| `src/components/landing/PlanetLogo.tsx` | **Modify** | Enhanced with document icon and better effects |
| `src/components/landing/SpaceBackground.tsx` | **Modify** | More stars, multiple shooting stars, enhanced nebula |
| `public/favicon.svg` | **Modify** | Update to match new logo design |

---

## Technical Details

### Index.tsx Changes

The current file has a conditional at line 86:
```tsx
if (hasResume) {
  return (
    <MobileLayout>
      <HomeBackground>
        // ... home dashboard
      </HomeBackground>
    </MobileLayout>
  );
}
```

This will be removed so the landing page with `SpaceBackground` and `HeroSection` always renders.

### New AppIcon.tsx Design

```tsx
// Key SVG elements:
- Gradient background rect with rounded corners
- White document shape with folded corner path
- "W" lettermark stroke path
- Resume text lines as rects
- Cyan 4-point star sparkle in corner
```

### Enhanced SpaceBackground

```tsx
// Additional features:
- Star count: 80 → 120
- Multiple shooting stars with staggered delays
- Enhanced nebula gradients with more color variation
- Parallax depth effect on star layers
```

### PlanetLogo Updates

Maintain the planet aesthetic but ensure it prominently features:
- Central document/resume icon
- Visible orbital elements
- Glowing atmosphere matching the reference screenshot

---

## User Flow After Changes

1. User opens app → Sees landing page with space background
2. Clicks "Launch Your Resume" → Creates new resume → Goes to editor
3. OR clicks "Upload existing resume" → Goes to upload page
4. Can access dashboard via navigation or the "Explore" button

---

## Performance Considerations

- Stars use CSS animations where possible (GPU-accelerated)
- Shooting stars use `transform` and `opacity` only
- Planet logo animations use Framer Motion with hardware acceleration
- Lazy loading maintained for non-critical components

