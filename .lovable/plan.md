

# Add Subtle Gradient Background and Card Styling to Home Page

## Overview

The home page for returning users (those with a resume in progress) currently uses a plain background, making it feel less polished compared to the cosmic-themed landing page. This plan adds a subtle gradient background and enhanced card styling to create visual consistency with the app's "Wise Universe" aesthetic.

## Current State Analysis

The returning user dashboard (lines 102-211 in Index.tsx) uses:
- Plain `bg-background` from MobileLayout
- Basic `bg-card border border-border` on ResumeCard
- Simple `bg-card border border-border` on ActionCards

Meanwhile, the landing page uses:
- SpaceBackground with deep gradients and nebula overlays
- Glassmorphism effects
- Glowing accents

## Design Approach

Create a lighter version of the cosmic theme that:
1. Doesn't distract from the functional dashboard content
2. Uses subtle gradients that match the existing color palette
3. Enhances cards with glassmorphism and subtle glow effects
4. Maintains readability and accessibility

## Implementation Details

### 1. Create a Gradient Background Wrapper Component

Add a new lightweight component `HomeBackground.tsx` that provides a subtle cosmic gradient without the animated stars (for performance).

```text
+---------------------------------------------+
|  Subtle radial gradient (top-left corner)   |
|    (purple/primary hue, very low opacity)   |
|                                             |
|  Subtle radial gradient (bottom-right)      |
|    (cyan/secondary hue, very low opacity)   |
|                                             |
|  Content layer (z-10)                       |
+---------------------------------------------+
```

### 2. Enhance ResumeCard Styling

Update ResumeCard to use glassmorphism:
- Add `glass` class for backdrop blur
- Add subtle border glow on hover using `hover:border-primary/30`
- Add a faint gradient border effect

### 3. Enhance ActionCard Styling

Update ActionCards with:
- Glassmorphism background
- Subtle glow effect on the icon container
- Enhanced hover states with primary color glow

### 4. Add CSS Utility Classes

Add new utility classes to index.css for consistent reuse:
- `.glass-card` - Combined glass effect with border styling
- `.glow-subtle` - Very subtle glow for cards

## File Changes

### File 1: `src/components/home/HomeBackground.tsx` (new file)

Create a lightweight gradient background component:
- Subtle radial gradient overlays matching space theme colors
- No animations for performance
- Similar structure to SpaceBackground but simplified

### File 2: `src/pages/Index.tsx`

Update the returning user dashboard section:
- Wrap content in the new HomeBackground component
- Add entrance animations to sections using Framer Motion

### File 3: `src/components/home/ResumeCard.tsx`

Enhance card styling:
- Replace `bg-card` with `glass` class
- Add `hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5` for glow effect
- Add subtle gradient overlay on the resume icon area

### File 4: `src/components/home/ActionCard.tsx`

Enhance card styling:
- Add glassmorphism effect to default variant
- Add subtle glow to the icon container
- Enhance hover state with primary color glow

### File 5: `src/index.css`

Add new utility classes:
```css
.glass-card {
  background: hsl(var(--card) / 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid hsl(var(--border) / 0.5);
}

.glow-subtle {
  box-shadow: 0 0 20px hsl(var(--primary) / 0.1);
}
```

## Visual Outcome

```text
+------------------------------------------+
|           [Logo - Centered]              |
|                                          |
|  ~~~~ Subtle purple gradient (top) ~~~~  |
|                                          |
|  [Resume Card with glass effect]         |
|  +------------------------------------+  |
|  |  Glassmorphism + subtle glow      |  |
|  |  Blurred backdrop visible         |  |
|  +------------------------------------+  |
|                                          |
|  [Action Cards - 2 columns]              |
|  +----------------+ +----------------+   |
|  | Glass effect   | | Glass effect   |   |
|  | Glowing icon   | | Glowing icon   |   |
|  +----------------+ +----------------+   |
|                                          |
|  ~~~~ Subtle cyan gradient (bottom) ~~~~ |
|                                          |
|  [Create New Resume Button]              |
|  [Sign In Link]                          |
+------------------------------------------+
```

## Technical Notes

- Use CSS variables for colors to maintain theme consistency
- Keep blur values moderate (12-16px) for mobile performance
- Use opacity values of 0.1-0.2 for gradients to keep them subtle
- Ensure all color contrasts remain accessible

