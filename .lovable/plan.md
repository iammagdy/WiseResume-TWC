

## Transform Homepage into Mobile-First PWA Experience

### Overview
Rewrite the Index page (`src/pages/Index.tsx`) as a compact, mobile-app-style single page that replaces the current multi-section landing page. The goal: user sees value and taps "Create My Resume" within 3 seconds. Total page height capped at ~2.5x viewport.

---

### 1. New Hero Section (replaces current HeroSection + SpaceBackground)

- **App Icon**: Use `AppIcon` component at 120px with a glowing radial gradient behind it (purple-to-pink, animated pulse)
- **Headline**: "Build Your Dream Resume" -- 32px bold, centered
- **Subtext**: "AI-powered . ATS-optimized . Free forever" -- 16px, muted color, dot-separated
- **Primary CTA**: "Create My Resume" -- full-width, 56px height, gradient background. If authenticated, reads "Go to Dashboard" and navigates to `/dashboard`
- **Secondary link**: "Already have an account? Sign In" -- text link below CTA, navigates to `/auth`. Hidden when authenticated (replaced with avatar dropdown)
- **Trust line**: Small green dot + "Free . No credit card . 5 minutes" beneath
- Remove the top-right Sign In button; move sign-in into the hero content area
- Keep avatar dropdown for authenticated users (repositioned inline or top-right)

### 2. Steps Row (replaces "Mission Control" / HowItWorks)

- Three icons in a horizontal row, no section title
- Layout: evenly spaced, centered, with subtle connecting lines
- Items:
  - Pencil icon + "Create"
  - Sparkles icon + "AI Polish"  
  - Download icon + "Export"
- Each item: 48px icon container + 2-word label below (14px)
- No space/rocket language -- clean, functional labels
- Subtle glass card background wrapping the row

### 3. Features Section (replaces WhyWiseResume + FeatureGrid)

- Title: "Why WiseResume?" -- 24px, centered
- Three feature cards in vertical stack (not grid):
  - Sparkles icon + "AI Writing Assistant" + "Enhance bullets and summaries instantly"
  - BarChart icon + "ATS Score Checker" + "See how well you match any job"
  - LayoutGrid icon + "Professional Templates" + "12 designs for every industry"
- Each card: horizontal layout (icon left, text right), glass background, 48px icon area
- Remove Voice Interview and 4 AI Recruiters from homepage
- Remove the BulletTransformCard (too tall)

### 4. Template Preview (simplified from TemplateGallery)

- Show 3 mini template previews in a horizontal scroll (reuse existing `MiniPreview` component)
- "Browse All Templates" text link below
- No section title beyond a subtle "Templates" label
- Remove "Choose Your Flight Suit" and space-themed names (show real template names)

### 5. Bottom CTA (simplified)

- Remove entirely -- the hero CTA is sufficient. The page is short enough that users don't need a second prompt.

### 6. Background

- Keep `SpaceBackground` but simplify: remove star generation, keep only the gradient + nebula overlay for the dark theme aesthetic
- Alternatively, inline a simple dark gradient background directly in Index to avoid the component overhead

### 7. PWA Install Banner

- Already exists (`InstallPrompt` component in `App.tsx`) and renders globally as a sticky banner at `bottom-24`
- No changes needed -- it already appears after 3 seconds when the browser supports install

### 8. Bottom Tab Bar

- Already exists globally via `AppShell` for all routes inside the shell
- The landing page (`/`) is outside `AppShell` (line 87 of App.tsx), so no bottom bar shows
- Per the request to show an "inactive preview" of the bottom nav, add the `BottomTabBar` component to the Index page in a static/visual-only mode, or wrap the landing page inside AppShell
- **Decision**: Keep landing page outside AppShell but render a visual-only bottom bar preview (non-functional, just showing the 4 tabs as a teaser)

---

### Technical Details

**Files modified:**

1. **`src/pages/Index.tsx`** -- Complete rewrite. Replace lazy-loaded multi-section layout with a single compact page:
   - Import `AppIcon`, `useAuth`, `useProfile`, `useNavigate`, `useResumeStore`, `Button`, icons
   - Render inline: Hero, Steps Row, Features, Template Preview, visual bottom bar
   - No lazy loading needed (page is lightweight enough)
   - Keep `SpaceBackground` wrapper for the dark theme

2. **No other files modified** -- All existing landing components (`HeroSection`, `SocialProofBar`, `HowItWorks`, `FeatureGrid`, `WhyWiseResume`, `BottomCTA`, `TemplateGallery`) remain in the codebase but are no longer imported by Index. They can be cleaned up later.

**Component structure of new Index:**

```text
SpaceBackground
  main (max-height ~250vh)
    HeroBlock
      AppIcon (120px) + glow
      "Build Your Dream Resume" (h1)
      "AI-powered . ATS-optimized . Free forever" (p)
      [Create My Resume] button (56px)
      "Already have an account? Sign In" link
      Trust line
    StepsRow
      Create | AI Polish | Export (3 icons)
    FeaturesBlock
      "Why WiseResume?" (h2)
      3 feature cards (vertical stack)
    TemplatePreview
      3 mini templates (horizontal scroll)
      "Browse All Templates" link
    BottomSpacer (pb-24 for visual bottom bar)
  BottomTabBar (visual-only, inactive)
```

**Mobile optimizations:**
- All touch targets 48px minimum
- Body text 16px minimum, secondary 14px
- Section spacing 24px
- Full-width CTA button
- Momentum scrolling
- Reduced animations (only icon glow pulse, fade-in on mount)
- No heavy lazy loading or intersection observer for this page

