
## Typography Standardization: Implement Size-Based Semantic System

### Overview
Standardize typography across the WiseResume app to follow a clear semantic hierarchy that prevents mobile zoom-on-focus issues. Currently, the app uses Tailwind's default font sizes (`text-xs`, `text-sm`, `text-base`, etc.) without a cohesive mapping to semantic roles (H1, H2, H3, body, etc.). This plan introduces semantic CSS classes that map your size specifications while maintaining mobile accessibility (16px minimum body text).

### Current State
**What exists:**
- Tailwind font sizes: `text-xs` (12px), `text-sm` (14px), `text-base` (16px), `text-lg` (18px), `text-xl` (20px), `text-2xl` (24px), `text-3xl` (30px), `text-4xl` (36px)
- Display font already set to "Space Grotesk" in `src/index.css` (line 188)
- Headings already use `font-display font-bold` pattern across components
- No centralized semantic mapping -- raw Tailwind sizes used throughout (4480+ matches)
- Current usage inconsistent: some H1s use `text-4xl`, some use `text-5xl`; some body text is `text-xs` (problematic on mobile)

**Key Issue:**
- Many components use `text-xs` (12px) and `text-sm` (14px) for body content, which can trigger iOS zoom-on-focus below 16px
- No semantic distinction between a page hero, section heading, body copy, captions, and tiny labels

### Your Specifications
```
Hero/H1:        28-32px   (use text-7xl or 32px custom)
H2:             24px      (matches text-2xl: 1.5rem)
H3:             20px      (matches text-xl: 1.25rem)
Body:           16px min  (matches text-base: 1rem)
Small/Caption:  14px      (matches text-sm: 0.875rem)
Tiny:           12px      (matches text-xs: 0.75rem -- use sparingly)
```

### Changes

**1. `src/index.css` -- Add semantic typography utilities**

Add custom CSS classes in the `@layer utilities` section:
- `.text-h1` / `.text-hero` — 28-32px, font-display, tracking-tight, bold
- `.text-h2` — text-2xl with custom font-weight, tracking
- `.text-h3` — text-xl with consistent line-height
- `.text-body` — text-base with generous line-height for readability
- `.text-caption` — text-sm with uppercase tracking for labels
- `.text-tiny` — text-xs with explicit line-height (use cautiously)

Example structure:
```css
@layer utilities {
  .text-h1 {
    @apply font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight;
    font-size: clamp(28px, 8vw, 32px);
    line-height: 1.2;
  }
  
  .text-h2 {
    @apply font-display text-2xl font-bold;
    line-height: 1.3;
  }
  
  .text-h3 {
    @apply font-display text-xl font-semibold;
    line-height: 1.35;
  }
  
  .text-body {
    @apply text-base font-normal;
    line-height: 1.6;
  }
  
  .text-caption {
    @apply text-sm font-medium uppercase tracking-wider;
    line-height: 1.4;
  }
  
  .text-tiny {
    @apply text-xs font-medium;
    line-height: 1.25;
  }
}
```

**2. Migration Plan & Audit**

Rather than replacing all 4480+ usages in one pass, create a **phased approach**:

- **Phase 1 (High-impact):** Landing page, dashboard header, form labels
- **Phase 2 (Medium-impact):** Editor section titles, card content
- **Phase 3 (Low-impact):** Tooltips, badges, secondary text

For **each file**, replace raw Tailwind size classes with semantic ones:
- `text-4xl/text-5xl` on h1s → `.text-h1`
- `text-2xl` on h2s → `.text-h2`
- `text-xl` on h3s → `.text-h3`
- `text-base` on body → use `.text-body` (adds line-height benefit)
- `text-sm` on captions/labels → `.text-caption` (adds tracking)
- `text-xs` on small text → `.text-tiny` (only if intentional, else bump to `text-sm`)

**Key files to update first (highest visual impact):**
1. `src/components/landing/HeroSection.tsx` — h1 hero
2. `src/components/landing/TemplateGallery.tsx` — section titles
3. `src/components/landing/HowItWorks.tsx` — step labels
4. `src/components/landing/FeatureGrid.tsx` — feature titles
5. `src/components/dashboard/DashboardStats.tsx` — greeting + stats labels
6. `src/pages/EditorPage.tsx` — section headers
7. `src/components/editor/SectionCard.tsx` — section titles
8. `src/components/ui/button.tsx` — button text sizes (audit)

**3. Mobile Zoom Prevention**

Ensure all body text and interactive elements use **minimum 16px (text-base)**:
- Scan for `text-xs` used on critical content
- Bump borderline cases from `text-xs` to `text-sm` if used in body copy
- Keep `text-xs` only for: badges, tiny icons, timestamps, accessibility-secondary content

**4. Line Height Consistency**

Update `tailwind.config.ts` fontSize definitions to include optimal line heights:
```typescript
fontSize: {
  // ... existing sizes, add line-height to each
  "2xs": ["0.625rem", { lineHeight: "0.875rem" }], // 12px
  xs: ["0.75rem", { lineHeight: "1rem" }],         // 14px
  sm: ["0.875rem", { lineHeight: "1.25rem" }],     // 16px
  base: ["1rem", { lineHeight: "1.5rem" }],        // 16px
  // ...
}
```

(Already defined in tailwind.config.ts lines 37-48, so no changes needed here)

### Technical Details

**Semantic mapping rationale:**
- H1 uses `clamp()` to scale between 28px (mobile) and 32px (desktop), preventing font-size jumping
- H2-H3 map directly to existing Tailwind sizes for familiarity
- Body defaults to 16px minimum to prevent iOS zoom
- Caption adds uppercase + tracking for visual hierarchy without size
- Tiny reserved for non-critical labels only

**Migration strategy:**
1. Define utilities in `src/index.css` (non-breaking, additive)
2. Components can co-exist using both old (Tailwind) and new (semantic) classes during transition
3. No need to update all 4480 usages at once -- prioritize high-visibility pages first
4. Team can gradually migrate as they touch files

### Files Modified
- `src/index.css` -- add semantic typography utilities in `@layer utilities`
- `src/components/landing/HeroSection.tsx` -- use `.text-h1` for hero
- `src/components/landing/TemplateGallery.tsx` -- use `.text-h2`, `.text-caption`
- `src/components/landing/HowItWorks.tsx` -- use `.text-h3`, `.text-body`
- `src/components/landing/FeatureGrid.tsx` -- use `.text-h2`, `.text-h3`
- `src/components/dashboard/DashboardStats.tsx` -- use `.text-h1`, `.text-caption`
- `src/pages/EditorPage.tsx` -- audit and update section titles
- `src/components/editor/SectionCard.tsx` -- use `.text-h3` for section headers
- Additional high-impact files as identified during Phase 1 audit

### Rationale & Benefits

1. **Accessibility**: Prevents iOS zoom-on-focus by ensuring body text ≥16px
2. **Consistency**: Semantic naming (`text-h1` vs `text-4xl`) communicates intent
3. **Maintainability**: Single source of truth for heading styles
4. **Scalability**: Easy to adjust all H1s globally without find-and-replace
5. **Responsiveness**: Uses `clamp()` for fluid scaling instead of breakpoint jumps
6. **Legacy compatibility**: Old Tailwind classes still work during migration

### Implementation Approach

This will be completed in **multiple PRs/commits** rather than one massive refactor:
1. Define utilities in `src/index.css` (1 commit)
2. Update landing page components (1 commit)
3. Update dashboard components (1 commit)
4. Update editor components (1 commit)
5. Optional: audit and catch remaining `text-xs` on body copy

