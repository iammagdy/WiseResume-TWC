

# Polish Landing Page with Real Template Previews and Animations

## What Changes

The template gallery will show realistic, detailed mini-previews that match the actual templates (especially the Developer template with its dark terminal header and green accents). The entire landing page will get smoother animations and a more polished feel.

## Template Gallery Overhaul

### Rich MiniPreview designs matching real templates

Each of the 6 templates will get a detailed mini-preview that mirrors its actual design:

- **Developer (Terminal)**: Dark gray-900 header block with green ">" prompt, green "// SECTION" headers, a left border-line accent on content, and monospace-style text lines -- matching the real DeveloperTemplate's terminal aesthetic
- **Modern (Voyager)**: Purple bottom border on header, clean section headers with accent color
- **Classic (Heritage)**: Centered header with horizontal rule divider, classic layout
- **Creative (Explorer)**: Left sidebar with avatar circle and accent background, two-column layout
- **Executive (Commander)**: Bold full-width colored header bar with white text lines
- **Elegant (Aurora)**: Minimal spacing, thin accent section dividers, clean typography feel

### More detailed placeholder content

Instead of 2-3 thin gray bars per section, each preview will show:
- Thicker, more varied line widths to simulate real text
- Skill tags/pills for tech stack sections
- Achievement bullet points (small dots + lines)
- More sections visible (summary, skills, experience, education)

## Landing Page Animation Polish

### Staggered entrance animations
- Gallery section title fades in first, then cards stagger in with 100ms delays
- Each card slides up + fades in (using existing `animate-fade-in` with animation-delay)

### Card hover/active effects
- On hover: slight lift with shadow (`hover:-translate-y-1 hover:shadow-xl`)
- Active card in carousel gets a subtle glow border using the template's accent color
- Smooth transitions on all interactive elements (300ms)

### Section transitions
- Add `animate-fade-in-up` keyframe if not present (fade + translateY)
- QuickActions cards get staggered entrance
- "See all 12 templates" link gets a subtle arrow bounce on hover

## Technical Details

### File: `src/components/landing/TemplateGallery.tsx`

**MiniPreview component** -- complete rewrite of all 6 layout variants:

1. **Developer layout (`two-column`)** -- change to a unique `terminal` layout type:
   - Top section: `bg-gray-900` with a green ">" and white title bar, small gray contact line
   - Body: green `// ABOUT` header, left `border-l-2 border-gray-300` on content lines
   - Green `// TECH_STACK` header with small colored pill tags
   - Green `// EXPERIENCE` header with bullet lines
   - This closely mirrors the actual DeveloperTemplate component

2. **All layouts**: increase line thickness from 3px to 4px, add more content lines, use stronger gray shades (`bg-gray-300` for titles, `bg-gray-200` for body lines)

3. **Card wrapper**: add `hover:-translate-y-1 transition-all duration-300` and accent-colored shadow on active

4. **Update template layout types**: change Developer from `two-column` to `terminal` to give it a unique preview

### File: `src/components/landing/HeroSection.tsx`
- Add a subtle floating animation to the PlanetLogo (CSS `animate-bounce` with slower timing)
- Ensure staggered delays work properly with `animation-fill-mode: forwards`

### File: `src/components/landing/QuickActions.tsx`  
- Add staggered `animation-delay` on each card for entrance effect
- Add `hover:-translate-y-0.5` subtle lift on hover

### No new files, no backend changes needed.
