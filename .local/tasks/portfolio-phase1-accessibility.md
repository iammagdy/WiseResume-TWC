# Portfolio Phase 1: Critical Accessibility & Touch

## What & Why
Fix the seven most severe issues from the megz-design review — all WCAG/touch-target violations that affect every visitor to a public portfolio page. These are the highest-impact fixes and unblock the later phases.

## Done looks like
- Every social icon link (LinkedIn, GitHub, Twitter, Website) announces its name to screen readers and has a tap area of at least 44×44px.
- The StickyHeader "Get in Touch" CTA is at least 44px tall and comfortably tappable on mobile.
- The 404 Not Found page uses a Lucide SVG icon instead of the 🔍 emoji.
- The muted text color (`#9ca3af`) is replaced with a contrast-safe value on light themes (Classic Clean, Executive, Spotlight, Starter) so it passes WCAG AA (4.5:1) against white.
- A visually-hidden skip-to-content link appears at the very top of the page for keyboard users.
- All scroll animation variants (parallax, tilt-3d, cinematic) instantly fall back to no-movement (opacity only) when the user has `prefers-reduced-motion: reduce` set.

## Out of scope
- Animation duration tuning (Phase 2)
- Token refactor (Phase 3)
- Any change to the PortfolioEditorPage

## Tasks
1. **Social icon aria-labels & touch targets** — Add `aria-label` to each social icon anchor (LinkedIn, GitHub, Twitter, Website, Mail CTA) in `PublicHero`. Increase each icon button from `w-9 h-9` (36px) to `w-11 h-11` (44px) so all meet the minimum touch target.

2. **StickyHeader CTA touch size** — Increase the "Get in Touch" anchor in `StickyHeader` from `py-1.5` to `py-2.5` (or add `min-h-[44px]` with flex alignment) so it meets the 44px minimum.

3. **NotFound emoji → SVG** — Replace the `🔍` emoji div in the `NotFound` component inside `PublicPortfolioPage` with the Lucide `SearchX` icon rendered as an SVG.

4. **Muted contrast on light themes** — In `portfolioThemes.ts`, update the `muted` color for the four light-background themes (classic-clean, executive-suite, creative-spotlight, freelancer-starter) from `#9ca3af`/`#6b7280`/`#71717a` to a value that achieves at least 4.5:1 on white (e.g. `#4b5563` for most themes, `#374151` for the whitest backgrounds). Verify the `--pf-muted` CSS variable carries through.

5. **Skip-to-content link** — Add a visually-hidden but focusable "Skip to content" anchor at the very top of `PublicPortfolioContent`, pointing to `#portfolio-content`. It should become visible on focus so keyboard users can see it.

6. **Reduced-motion for scroll effects** — In `getScrollEffectVariant` inside `PublicSections`, detect `prefers-reduced-motion` (via `window.matchMedia`) and return a motion-free variant (opacity 0→1, no translate/rotate/scale) whenever it is set, regardless of which scroll effect the user has chosen.

## Relevant files
- `src/components/portfolio/public/PublicHero.tsx:203-250`
- `src/components/portfolio/public/StickyHeader.tsx:37-43`
- `src/pages/PublicPortfolioPage.tsx:94-108`
- `src/lib/portfolioThemes.ts:39-151`
- `src/pages/PublicPortfolioPage.tsx:273-293`
- `src/components/portfolio/public/PublicSections.tsx:32-58`
