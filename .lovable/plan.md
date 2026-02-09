

# Landing Page & Home View Premium Redesign

## Current Problem

Based on the screenshot, the home view (shown when user has a resume) looks **basic and boring** compared to modern app standards:

| Issue | Current State | Problem |
|-------|---------------|---------|
| **Flat Logo** | Small icon with basic tagline | No visual impact or premium feel |
| **Plain Header** | Static, no depth or motion | Feels like a placeholder |
| **Basic Resume Card** | Simple glass card with icon | No personality, generic look |
| **Boring Action Cards** | Gradient boxes with icons | All look the same, monotonous |
| **No Visual Interest** | Static layout, no animations | Lacks energy and delight |
| **Missing Background** | Subtle gradients only | Empty, feels unfinished |

## Design Solution: "Cosmic Home Experience"

Transform the home view into a premium, animated experience that matches the full landing page quality.

### Visual Preview

```text
Current (Basic):                    New (Premium):
┌─────────────────────────┐         ┌─────────────────────────┐
│       [W] icon          │         │   ✨ Floating stars ✨   │
│      WiseResume         │         │                         │
│  Your AI Career Partner │         │    🌟 [Animated Logo]   │
├─────────────────────────┤         │      with orbit ring    │
│ Continue where you left │         │       WiseResume        │
│ ┌─────────────────────┐ │         │  ← shimmer text effect  │
│ │ 📄 Untitled Resume  │ │         ├─────────────────────────┤
│ │    0% complete      │ │         │  👋 Welcome back!       │
│ └─────────────────────┘ │         │ ┌─────────────────────┐ │
├─────────────────────────┤         │ │ 📄 ████░░░░░░░ 30%  │ │← Progress ring
│ AI-Powered Actions      │         │ │ "Alex's Resume"     │ │← Glass morphism
│ ┌─────┐  ┌─────┐        │         │ │ Continue editing →  │ │← Micro-animation
│ │Score│  │Tailor│       │         │ └─────────────────────┘ │
│ └─────┘  └─────┘        │         ├─────────────────────────┤
├─────────────────────────┤         │ Quick Actions           │
│ [+ Create New Resume]   │         │ ┌─────┐ ┌─────┐ ┌─────┐ │
└─────────────────────────┘         │ │🎯   │ │✨   │ │🎤   │ │← Icon-only pills
                                    │ │Match│ │Tailor│ │Mock │ │← Subtle colors
                                    │ └─────┘ └─────┘ └─────┘ │
                                    ├─────────────────────────┤
                                    │ ┌─────────────────────┐ │
                                    │ │ + New Resume   →    │ │← Animated border
                                    │ └─────────────────────┘ │
                                    └─────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Create HomeHeroSection Component

**New File: `src/components/home/HomeHeroSection.tsx`**

A premium header with:
- Animated logo with subtle float and glow pulse
- Personalized greeting ("Welcome back!" or "Good morning, Alex!")
- Orbiting particles around the logo
- Gradient text with shimmer effect

Key features:
- Uses Framer Motion for smooth 60fps animations
- Hardware-accelerated transforms only (translate, scale, opacity)
- Minimal re-renders with `useRef` for static values

### Phase 2: Redesign ResumeCard with Progress Ring

**File: `src/components/home/ResumeCard.tsx`**

Upgrade from basic card to premium "Mission Card":
- Add circular SVG progress indicator (like fitness apps)
- Glass morphism with animated border glow
- Pulsing "Continue" indicator
- Completion percentage as ring, not text
- Subtle entrance animation

Visual elements:
```text
┌──────────────────────────────────────┐
│  ╭──────╮                            │
│  │ 30%  │  Alex's Resume             │ ← Circular progress ring
│  │ ○○○  │  Last edited 2h ago        │
│  ╰──────╯                            │
│                                      │
│  📍 Next: Add your work experience   │ ← AI suggestion
│                        Continue →    │ ← Animated arrow
└──────────────────────────────────────┘
```

### Phase 3: Redesign Action Cards as Icon Pills

**File: `src/components/home/ActionCard.tsx`**

Transform from large gradient boxes to compact, elegant pills:
- Smaller, icon-focused design (40x40 icon + label below)
- Category-based colors (not all purple)
- Horizontal scrollable row for 3+ actions
- Subtle hover/tap feedback

New layout:
```tsx
<div className="flex gap-3 overflow-x-auto">
  <ActionPill icon={Target} label="Match" color="emerald" />
  <ActionPill icon={Wand2} label="Tailor" color="purple" />  
  <ActionPill icon={Mic} label="Interview" color="orange" />
</div>
```

### Phase 4: Add Floating Star Background

**File: `src/components/home/HomeBackground.tsx`**

Add subtle animated elements:
- 8-12 floating micro-stars (CSS only, not Framer Motion)
- Gentle parallax on scroll
- Nebula glow spots matching landing page
- Performance: Use CSS animations, not JS

### Phase 5: Animated "Create New" Button

**Update in `src/pages/Index.tsx`**

Add premium CTA button:
- Rotating gradient border (like AI Engine Badge)
- Shimmer effect on idle
- Haptic feedback on tap
- Micro-animation on hover

### Phase 6: Update Landing Page Hero with More Visual Interest

**File: `src/components/landing/HeroSection.tsx`**

Enhance the full landing for new users:
- Add floating badges with testimonial snippets
- Animated keyword typing effect for the subtitle
- More prominent feature badges with icons
- Glassmorphism CTA button container

---

## Technical Details

### Animation Performance Guidelines

All animations will use:
1. **GPU-accelerated properties only**: `transform`, `opacity`
2. **will-change hints**: For elements that animate frequently
3. **CSS animations for repeating effects**: Stars, shimmer, borders
4. **Framer Motion for entrance animations**: One-time effects

### File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/home/HomeHeroSection.tsx` | **Create** | Premium animated header with logo and greeting |
| `src/components/home/ResumeCard.tsx` | **Modify** | Add progress ring, glassmorphism, AI suggestion |
| `src/components/home/ActionCard.tsx` | **Modify** | Convert to compact icon pills with category colors |
| `src/components/home/HomeBackground.tsx` | **Modify** | Add floating stars and nebula glows |
| `src/pages/Index.tsx` | **Modify** | Use new components, add animated Create button |
| `src/components/landing/HeroSection.tsx` | **Modify** | Add testimonial badges, typing effect |
| `src/components/landing/SpaceBackground.tsx` | **Modify** | Increase star density, add more nebula variety |

---

## New Component: HomeHeroSection

```typescript
// Key structure for the new hero
export function HomeHeroSection({ userName }: { userName?: string }) {
  const greeting = getTimeBasedGreeting(); // "Good morning" / "Good evening"
  
  return (
    <header className="relative pt-safe pt-8 pb-6 px-4 text-center">
      {/* Floating particles around logo */}
      <div className="absolute inset-0 pointer-events-none">
        {/* 4 orbiting dots */}
      </div>
      
      {/* Animated logo with glow */}
      <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity }}>
        <AppIcon size={72} />
      </motion.div>
      
      {/* Shimmer gradient text */}
      <h1 className="gradient-text text-shimmer">WiseResume</h1>
      
      {/* Personalized greeting */}
      <p className="text-muted-foreground">
        {userName ? `${greeting}, ${userName}!` : greeting + '!'}
      </p>
    </header>
  );
}
```

---

## New CSS: Shimmer Text Effect

Add to `index.css`:
```css
.text-shimmer {
  background: linear-gradient(
    90deg,
    hsl(var(--primary)) 0%,
    hsl(var(--accent)) 25%,
    hsl(var(--primary)) 50%,
    hsl(var(--accent)) 75%,
    hsl(var(--primary)) 100%
  );
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shimmer 4s linear infinite;
}

@keyframes shimmer {
  to { background-position: 200% center; }
}
```

---

## Progress Ring Component

SVG-based circular progress for the resume card:
```tsx
function ProgressRing({ percent }: { percent: number }) {
  const circumference = 2 * Math.PI * 40; // radius = 40
  const offset = circumference - (percent / 100) * circumference;
  
  return (
    <svg className="w-16 h-16 -rotate-90">
      <circle cx="32" cy="32" r="28" stroke="hsl(var(--muted))" strokeWidth="4" fill="none" />
      <circle 
        cx="32" cy="32" r="28" 
        stroke="url(#progressGradient)" 
        strokeWidth="4" 
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-700"
      />
      <defs>
        <linearGradient id="progressGradient">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--accent))" />
        </linearGradient>
      </defs>
    </svg>
  );
}
```

---

## Landing Page Enhancements

### Testimonial Floating Badges

Add subtle floating testimonial snippets:
```tsx
<motion.div 
  className="absolute top-20 -left-4 glass-card px-3 py-2 rounded-lg text-xs"
  animate={{ y: [0, -10, 0], rotate: [-2, 2, -2] }}
  transition={{ duration: 5, repeat: Infinity }}
>
  "Got 3 interviews in a week!" ⭐
</motion.div>
```

### Typing Effect for Subtitle

Dynamic text showing different job types:
```tsx
const jobs = ['Software Engineer', 'Product Manager', 'UX Designer', 'Data Scientist'];
// Animate through these in the subtitle: "Tailor for [job] in seconds"
```

---

## Benefits

1. **Premium Feel**: Matches quality of top mobile apps (Notion, Linear, Raycast)
2. **Delightful Micro-interactions**: Every tap has feedback
3. **Personalized Experience**: Greeting uses time of day and name
4. **Progress Visibility**: Ring shows completion at a glance
5. **Performance Optimized**: 60fps animations, CSS where possible
6. **Cohesive Theme**: Home matches landing page's cosmic aesthetic

