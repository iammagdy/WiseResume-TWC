

# Landing Page Enhancement Plan

## Overview

Transform the landing page into a more engaging, conversion-focused experience with animated visuals, social proof, and a clear value proposition while maintaining the mobile-first "prestige" aesthetic.

---

## Current vs. Enhanced Structure

```text
CURRENT                           ENHANCED
┌─────────────────────┐          ┌─────────────────────┐
│      Logo           │          │   Animated Gradient │
│     Tagline         │          │      Background     │
├─────────────────────┤          │                     │
│   Choice Card 1     │          │      Logo           │
│   Choice Card 2     │          │   Power Headline    │
├─────────────────────┤          │    Subheadline      │
│  Feature Carousel   │          ├─────────────────────┤
├─────────────────────┤          │   Primary CTA       │
│    Sign In Link     │          │   Secondary CTA     │
└─────────────────────┘          │   "Free • 5 min"    │
                                 ├─────────────────────┤
                                 │   Social Proof      │
                                 │  ⭐⭐⭐⭐⭐ 4.9       │
                                 │  "12K+ resumes"     │
                                 ├─────────────────────┤
                                 │   How It Works      │
                                 │  1 → 2 → 3 steps    │
                                 ├─────────────────────┤
                                 │  Feature Grid       │
                                 │  (replaces carousel)│
                                 ├─────────────────────┤
                                 │  Template Preview   │
                                 │  (swipeable gallery)│
                                 ├─────────────────────┤
                                 │   Bottom CTA        │
                                 │   Sign In Link      │
                                 └─────────────────────┘
```

---

## New Components

| Component | Purpose |
|-----------|---------|
| `HeroSection.tsx` | Animated gradient background, headline, CTAs |
| `SocialProofBar.tsx` | Star rating, user count, trust badges |
| `HowItWorks.tsx` | 3-step animated process visualization |
| `FeatureGrid.tsx` | Replace carousel with visible grid |
| `TemplateGallery.tsx` | Swipeable template previews |
| `BottomCTA.tsx` | Final conversion section |

---

## Component Details

### 1. HeroSection

**Visual Design:**
- Subtle animated gradient background (dark purple to blue shifting)
- Glassmorphism card overlay
- App logo with glow effect

**Content:**
```text
┌─────────────────────────────────────┐
│         [Animated Gradient BG]      │
│                                     │
│            🎯 WiseResume            │
│                                     │
│     Land Your Dream Job Faster      │
│                                     │
│   AI-powered resumes that get       │
│   past ATS and impress recruiters   │
│                                     │
│   ┌─────────────────────────────┐  │
│   │   ✨ Create Your Resume     │  │
│   └─────────────────────────────┘  │
│                                     │
│      📄 I have a resume to upload   │
│                                     │
│      Free • No credit card • 5 min  │
└─────────────────────────────────────┘
```

**Animation:**
- Gradient shifts slowly (20s loop)
- Logo has subtle pulse glow
- CTAs have hover/press scale effects

---

### 2. SocialProofBar

Compact trust indicators below hero:

```text
┌─────────────────────────────────────┐
│  ⭐ 4.9  •  12K+ Resumes  •  Free   │
└─────────────────────────────────────┘
```

- Animated count-up on scroll into view
- Uses `framer-motion` for number animation
- Subtle glass background

---

### 3. HowItWorks

Three-step horizontal process:

```text
┌─────────────────────────────────────┐
│          How It Works               │
│                                     │
│   ┌───┐      ┌───┐      ┌───┐      │
│   │ 1 │ ──→  │ 2 │ ──→  │ 3 │      │
│   └───┘      └───┘      └───┘      │
│  Upload     AI Tailors   Export    │
│  or Create  for the Job  as PDF    │
└─────────────────────────────────────┘
```

- Icons animate sequentially on scroll
- Connecting line draws itself
- Step numbers have gradient backgrounds

---

### 4. FeatureGrid (Replace Carousel)

More visible 3-column grid (stacks on mobile):

```text
┌─────────────────────────────────────┐
│  ┌─────────┐ ┌─────────┐ ┌─────────┐│
│  │  🎯     │ │  ✨     │ │  📄     ││
│  │ AI Score│ │ Tailor  │ │ Export  ││
│  │ Match to│ │ Optimize│ │ Pro PDF ││
│  │ any job │ │ each app│ │ instant ││
│  └─────────┘ └─────────┘ └─────────┘│
└─────────────────────────────────────┘
```

- Cards have hover lift effect
- Icons have subtle floating animation
- Gradient borders on active/hover

---

### 5. TemplateGallery

Swipeable preview of 3 template styles:

```text
┌─────────────────────────────────────┐
│     Choose Your Style               │
│                                     │
│  ┌────┐    ┌────┐    ┌────┐        │
│  │████│ ←  │████│  → │████│        │
│  │    │    │    │    │    │        │
│  │    │    │    │    │    │        │
│  └────┘    └────┘    └────┘        │
│  Modern    Executive  Creative      │
│                                     │
│         ○ ● ○  (dots)               │
└─────────────────────────────────────┘
```

- Uses existing template thumbnails
- Snap-scroll behavior
- Tap to see enlarged preview

---

### 6. BottomCTA

Final conversion push before footer:

```text
┌─────────────────────────────────────┐
│                                     │
│   Ready to land more interviews?    │
│                                     │
│   ┌─────────────────────────────┐  │
│   │   Get Started Free          │  │
│   └─────────────────────────────┘  │
│                                     │
│   Already have an account? Sign in  │
└─────────────────────────────────────┘
```

---

## Animations to Add (tailwind.config.ts)

```typescript
keyframes: {
  "gradient-shift": {
    "0%, 100%": { backgroundPosition: "0% 50%" },
    "50%": { backgroundPosition: "100% 50%" }
  },
  "float": {
    "0%, 100%": { transform: "translateY(0)" },
    "50%": { transform: "translateY(-8px)" }
  },
  "glow-pulse": {
    "0%, 100%": { boxShadow: "0 0 20px hsl(var(--primary) / 0.3)" },
    "50%": { boxShadow: "0 0 40px hsl(var(--primary) / 0.5)" }
  }
}
```

---

## File Changes Summary

| File | Action |
|------|--------|
| `src/pages/Index.tsx` | Restructure with new sections |
| `src/components/landing/HeroSection.tsx` | Create |
| `src/components/landing/SocialProofBar.tsx` | Create |
| `src/components/landing/HowItWorks.tsx` | Create |
| `src/components/landing/FeatureGrid.tsx` | Create (replace carousel) |
| `src/components/landing/TemplateGallery.tsx` | Create |
| `src/components/landing/BottomCTA.tsx` | Create |
| `tailwind.config.ts` | Add new animations |
| `src/components/landing/FeatureCarousel.tsx` | Remove (replaced) |

---

## Mobile Considerations

- All sections stack vertically
- Touch-friendly swipe gestures on gallery
- 48px minimum touch targets
- Smooth scroll-snap between sections
- Reduced motion for accessibility (prefers-reduced-motion)
- Safe area padding at bottom

---

## Performance

- Lazy load below-fold sections
- Use CSS animations over JS where possible
- Optimize template thumbnails (already exist)
- Intersection Observer for scroll animations

---

## Implementation Order

1. Add new keyframe animations to Tailwind config
2. Create HeroSection with gradient and CTAs
3. Create SocialProofBar with animated counters
4. Create HowItWorks 3-step section
5. Create FeatureGrid (replaces carousel)
6. Create TemplateGallery with swipe
7. Create BottomCTA section
8. Update Index.tsx to compose all sections
9. Remove old FeatureCarousel
10. Test on mobile viewport

