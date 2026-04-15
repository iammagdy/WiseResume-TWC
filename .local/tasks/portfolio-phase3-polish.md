# Portfolio Phase 3: Tokens, Fonts & Polish

## What & Why
Fix the remaining six low-to-medium issues from the megz-design review: hardcoded hex values for availability badge colours, missing font-display swap for custom fonts, a decorative element leaking into the accessibility tree, a too-heavy Suspense fallback, the PDF template ignoring the user's theme, and a `window.location.origin` call that would crash in non-browser environments.

## Done looks like
- The "Actively Looking", "Open to Offers", and "Active today" badges in the hero use CSS custom properties (`--pf-success`, `--pf-warning`) rather than raw hex colours, so future theme changes propagate automatically.
- Portfolios using the Terminal or Neon theme (which load Fira Code / Space Grotesk) no longer show invisible text while the font downloads — the Google Fonts URL includes `display=swap`.
- The decorative animated avatar ring (`pf-avatar-ring`) has `aria-hidden="true"` so it is excluded from the accessibility tree.
- The `Suspense` fallback for `PublicSections` is a lightweight section-level skeleton (a few placeholder bars), not the full-page `PortfolioSkeleton`.
- The `PortfolioTemplate` (used for PDF/print) respects the user's chosen accent colour for headings, borders, and skill pill text, instead of always rendering in amber.
- The "Create your free portfolio" CTA in the 404 page no longer references `window.location.origin` directly — it uses a static production URL or a router-safe relative path.

## Out of scope
- Accessibility and touch fixes (Phase 1)
- Animation and sticky fixes (Phase 2)
- Full design-token system refactor across the whole app (only the portfolio public page is in scope)

## Tasks
1. **Availability badge CSS tokens** — Define `--pf-success` (green) and `--pf-warning` (amber) as CSS custom properties in the theme CSS or inline on the root style object in `PublicPortfolioPage`. Replace the hardcoded `rgba(34,197,94,…)` and `rgba(245,158,11,…)` values in the availability badge spans and "Active today" indicator in `PublicHero` with these variables.

2. **font-display: swap for custom fonts** — In `portfolioThemes.ts`, update the Google Fonts references for Fira Code and Space Grotesk to include `&display=swap`. Also add a `<link rel="preconnect" href="https://fonts.googleapis.com">` in the relevant theme setup path so the fonts load without invisible-text flash.

3. **Avatar ring aria-hidden** — Add `aria-hidden="true"` to the `.pf-avatar-ring` div in `PublicHero`.

4. **Lighter Suspense fallback for PublicSections** — Replace the full `<PortfolioSkeleton />` used as the `Suspense` fallback for `PublicSections` in `PublicPortfolioPage` with a slim section-placeholder component (2–3 skeleton bars, no avatar or header, ~60px tall) so that when sections lazy-load the flash of content is minimal.

5. **PortfolioTemplate theme-awareness** — Pass the user's `portfolioAccentColor` into `PortfolioTemplate` and replace the hardcoded amber classes (`text-amber-700`, `border-amber-300`, `bg-amber-50`) with inline styles driven by the accent colour, so the PDF output visually matches the user's chosen palette.

6. **Guard window.location.origin in NotFound** — Replace the direct `window.location.origin` reference in the NotFound CTA anchor with the static production URL `https://resume.thewise.cloud` (consistent with the rest of the codebase's canonical URL convention).

## Relevant files
- `src/components/portfolio/public/PublicHero.tsx:107-180`
- `src/pages/PublicPortfolioPage.tsx:243-247`
- `src/lib/portfolioThemes.ts:97-150`
- `src/components/portfolio/public/PublicHero.tsx:79-93`
- `src/pages/PublicPortfolioPage.tsx:320-335`
- `src/components/templates/PortfolioTemplate.tsx`
- `src/pages/PublicPortfolioPage.tsx:94-108`
