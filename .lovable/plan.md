

# Landing Page Cleanup and Enhancements

## 1. Remove Fake Data

The landing page currently shows fabricated social proof that could mislead users:

**Trust bar (Index.tsx, lines 356-377):**
- "4.9" star rating with 5 gold stars
- "12,000+ users" with avatar circles
- These are not backed by real data

**Fix:** Replace the fake stats trust bar with a simple, honest value proposition bar. Instead of fabricated numbers, show factual statements about the product:

```
[check] Free to start  |  [check] No credit card required  |  [check] AI-powered
```

This is honest, still builds trust, and highlights real product benefits.

## 2. Remove Dead Landing Components

11 component files in `src/components/landing/` are not used anywhere in the app. They are leftover from previous iterations and should be deleted to reduce codebase clutter:

| File | Reason |
|------|--------|
| `SocialProofBar.tsx` | Contains fake testimonials; not imported anywhere |
| `WhyWiseResume.tsx` | Not imported in Index.tsx (functionality inlined) |
| `HowItWorks.tsx` | Not imported in Index.tsx |
| `BottomCTA.tsx` | Not imported in Index.tsx |
| `TemplateGallery.tsx` | Not imported in Index.tsx |
| `HeroSection.tsx` | Not imported (Index has its own hero) |
| `QuickActions.tsx` | Landing version not used (editor has its own) |
| `FeatureGrid.tsx` | Not imported in Index.tsx |
| `LandingSkeletons.tsx` | Not imported anywhere |
| `LazySection.tsx` | Not imported anywhere |
| `PlanetLogo.tsx` | Only used by the unused HeroSection |

## 3. Enhancements

### 3a. Add a "How It Works" section back (without fake data)
The current landing page jumps from the comparison strip to the demo cards. A brief 3-step "How It Works" row would help users understand the flow. Rewrite it with accurate labels:

| Step | Title | Description |
|------|-------|-------------|
| 1 | Create or Upload | Start from scratch or import your existing resume |
| 2 | AI Enhances It | One tap turns weak bullets into quantified achievements |
| 3 | Export and Share | Download as PDF or publish a portfolio website |

### 3b. Add a bottom CTA section
After the Trust pillars section and before the footer, add a simple closing CTA:
- Headline: "Ready to Build Your Dream Resume?"
- Subtext: "Join thousands of job seekers using AI to land interviews faster."
- Button: "Get Started Free" (routes to /auth or /dashboard based on auth state)

No fake numbers, just an honest call to action.

### 3c. Improve the "New in v2.1" badge
The portfolio demo card shows "New in v2.1" which will become stale over time. Replace with a generic "Portfolio" or "Live Website" badge that doesn't go out of date.

## Summary of Changes

| # | File | Change |
|---|------|--------|
| 1 | `src/pages/Index.tsx` | Replace fake trust bar stats with honest value props; update "New in v2.1" badge; add HowItWorks + BottomCTA sections inline |
| 2 | 11 dead files in `src/components/landing/` | Delete unused components |

No database changes. No new dependencies.

