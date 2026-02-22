

# Rewrite Portfolio Public Page UI and Fix Editor Layout

## The Problems

### Public Portfolio Page (what visitors see)
The hero area is cluttered with too many buttons competing for attention:
- 4 hero CTAs: "Get in Touch", "View Projects", "Share Card", "Save as PDF"
- 4 social link buttons (LinkedIn, GitHub, Website, Twitter)
- Floating "Contact Me" pill at the bottom
- Floating "Scroll to top" button bottom-left
- Sticky header with another "Get in Touch" button
- SectionNav pills strip

A visitor sees up to 10+ clickable elements before even scrolling. This is overwhelming and confuses the user journey. A portfolio should have ONE clear primary action.

### Editor Page
- The "View Live" floating pill uses `left-4 right-4 max-w-sm mx-auto` which visually sits slightly off-center because of the `max-w-sm` constraint and safe area insets. It should be a cleaner fixed-bottom-center element.

## The Rewrite Plan

### 1. Public Portfolio Hero -- Simplify to 2 CTAs max

**Remove from hero:**
- "Share Card" button (keep it in a subtle 3-dot menu or remove entirely -- visitors don't need this)
- "Save as PDF" button (move to a subtle icon in the footer or remove from hero)
- "View Projects" button (the SectionNav already handles navigation)

**Keep in hero:**
- "Get in Touch" as the sole primary CTA (big, prominent)
- Social links stay but become smaller, more subtle icons (shrink from `w-11 h-11` to `w-9 h-9`)

**Result:** Hero goes from 4 buttons + 4 social icons = 8 elements down to 1 button + 4 small icons = 5 elements.

### 2. Floating UI -- Consolidate

**Remove:**
- Floating "Contact Me" pill at bottom (redundant with sticky header CTA and hero CTA)
- Floating "Scroll to top" button (move to footer as a simple link, or remove entirely -- native scroll is fine)

**Keep:**
- Sticky header "Get in Touch" (this replaces the floating CTA when hero scrolls out of view)
- Chat widget FAB (this is useful and non-intrusive)

### 3. Save as PDF -- Move to Footer

Instead of a hero button, add a subtle "Save as PDF" text link in the footer area next to "Built with WiseResume". This keeps the functionality accessible without cluttering the hero.

### 4. Share Card -- Remove from Public Page

The "Share Card" (Career Card) button is a creator tool, not a visitor tool. Visitors don't need to generate a career card for someone else's portfolio. Remove this from the public page entirely.

### 5. Fix Editor "View Live" Pill Positioning

Replace the current `max-w-sm mx-auto` approach with a simpler centered layout:
- Use `left-1/2 -translate-x-1/2` for true center positioning
- Remove the `left-4 right-4 max-w-sm mx-auto` combo that causes off-center appearance
- Keep `bottom-[7rem]` per the floating elements staggering convention

### 6. Theme-Aware Section Nav for Light Themes

Update `SectionNav` to detect light themes and use appropriate background colors instead of the hardcoded dark `rgba(10,10,20,0.88)`.

## Technical Details

### Files Modified

| File | Change |
|------|--------|
| `src/pages/PublicPortfolioPage.tsx` | Remove "View Projects", "Share Card", "Save as PDF" from hero. Remove floating "Contact Me" CTA. Remove floating scroll-to-top button. Add subtle PDF link to footer. Remove CareerCardSheet import and state. Shrink social icons. |
| `src/pages/PortfolioEditorPage.tsx` | Fix FloatingViewLivePill to use `left-1/2 -translate-x-1/2` for true centering |
| `src/components/portfolio/public/SectionNav.tsx` | Add light theme detection for background color |

### Hero Before vs After

```text
BEFORE (8 interactive elements in hero):
 [LinkedIn] [GitHub] [Website] [Twitter]
 [Get in Touch]  [View Projects]
 [Share Card]    [Save as PDF]

AFTER (5 interactive elements in hero):
 [in] [gh] [web] [tw]        (smaller, subtle)
 [     Get in Touch     ]    (single prominent CTA)
```

### Floating UI Before vs After

```text
BEFORE:
 - Scroll-to-top button (bottom-left)
 - Contact Me pill (bottom-center)
 - Chat widget FAB (bottom-right)

AFTER:
 - Chat widget FAB only (bottom-right)
 - Sticky header handles contact CTA when scrolled
```

### Footer Addition

```text
BEFORE:
 Built with WiseResume - Create your free portfolio ->

AFTER:
 [Download icon] Save as PDF
 Built with WiseResume - Create your free portfolio ->
```

### FloatingViewLivePill Fix

```text
BEFORE: left-4 right-4 max-w-sm mx-auto (not truly centered)
AFTER:  left-1/2 -translate-x-1/2 w-auto (truly centered)
```
