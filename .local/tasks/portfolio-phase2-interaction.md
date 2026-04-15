# Portfolio Phase 2: Interaction & Animation Quality

## What & Why
Fix the five interaction-quality issues from the megz-design review. These affect mobile usability (an untappable PDF button, animation durations that feel sluggish), one real iOS Safari layout bug (overflow-x-hidden breaking sticky), and two smaller UX gaps (spurious network request, missing aria-busy).

## Done looks like
- The "Save as PDF" button in the portfolio footer is at least 44px tall and clearly tappable on mobile.
- Animation durations in the parallax (0.8s → 0.45s) and cinematic (0.75s → 0.4s) scroll effects are within the 150–400ms range for complex transitions, making sections feel snappier.
- Sticky elements (StickyHeader, SectionNav) work correctly on iOS Safari — the double `overflow-x-hidden` that breaks `position: sticky` is resolved.
- The avatar image no longer fires a network request when `avatarUrl` is null.
- The PDF download button correctly sets `aria-busy="true"` and updates its `aria-label` while the download is in progress.

## Out of scope
- Accessibility/contrast fixes (Phase 1)
- CSS token refactor (Phase 3)
- Any change to the PortfolioEditorPage

## Tasks
1. **Footer PDF button touch target** — In `PublicPortfolioPage`, update the "Save as PDF" footer button to include `min-h-[44px]` and adequate horizontal padding so it meets the 44px minimum touch target on mobile.

2. **Animation duration reduction** — In `PublicSections`, reduce the `parallax` variant duration from 0.8s to 0.45s and the `cinematic` variant from 0.75s to 0.4s. The `tilt-3d` variant may also be reviewed (currently 0.65s → target ≤0.5s).

3. **Fix overflow-x-hidden breaking iOS sticky** — Remove `overflow-x-hidden` from the inner `motion.div#portfolio-content` in `PublicPortfolioPage`. The outer root div should retain `max-w-full` to prevent horizontal scroll. Test that `StickyHeader` and `SectionNav` remain correctly positioned after the change.

4. **Avatar image conditional render** — In `PublicHero`, only mount the `<AvatarImage>` component when `profile.avatarUrl` is truthy. This prevents the browser from firing a network request for `src={undefined}`.

5. **aria-busy on download button** — Add `aria-busy={isDownloading}` and a dynamic `aria-label` (e.g. `"Saving portfolio as PDF…"` vs `"Save as PDF"`) to the download button so screen readers announce the in-progress state.

## Relevant files
- `src/pages/PublicPortfolioPage.tsx:338-360`
- `src/components/portfolio/public/PublicSections.tsx:32-58`
- `src/pages/PublicPortfolioPage.tsx:303-309`
- `src/components/portfolio/public/PublicHero.tsx:84-93`
- `src/pages/PublicPortfolioPage.tsx:163-216,339-348`
