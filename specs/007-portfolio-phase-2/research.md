# Research Findings: Portfolio Phase 2

## Environmental Stability (Issue 5)
- **Problem**: `window.matchMedia` and other `window` references are used in various components and hooks. While most are inside `useEffect`, some use `useMemo` or are at module scope (in utilities), causing crashes in SSR or Capacitor environments where `window` is undefined.
- **Root Cause**: Unsafe access to browser-only globals during initialization/render.
- **Solution**: 
  - Create a utility `env.ts` or `browser.ts` with a `isBrowser` check.
  - Wrap `matchMedia` in a safe helper that returns a mock object or `null` when server-side.
  - Refactor `useMemo` calls with `matchMedia` to `useEffect` or guard them.

## PublicPortfolioPage Refactoring (Issue 6)
- **Problem**: Component is ~1100 lines, making it hard to maintain and increasing bundle size for small devices.
- **Findings**:
  - Hero section (lines 582-749) is a prime candidate for extraction.
  - SEO and Tracking logic (lines 273-405) can be move to custom hooks.
  - Theme-specific variants and helpers can be moved to `lib/portfolioThemes.ts` or a new component.
- **Logical Split Points**:
  - `PublicHero.tsx`: Avatar, Title, Bio, Socials, CTA.
  - `PublicSections.tsx`: Experience, Education, Skills, Projects, etc.
  - `usePortfolioTracking.ts`: Beacon and IntersectionObserver logic.
  - `usePortfolioSEO.ts`: Meta tags and Document title updates.

## Sticky Header Flicker (Issue 7)
- **Problem**: Sticky header disappears/reappears during data updates.
- **Findings**: `PublicPortfolioPage.tsx` lines 331-340 re-creates the `IntersectionObserver` whenever `portfolio` changes.
- **Solution**: 
  - Use `useRef` to hold the observer instance.
  - Remove `portfolio` as a dependency; only observe `heroRef.current`.
  - Use a memoized callback or separate the "isSticky" state from the data fetching lifecycle.

## Strength Score Logic (Issue 8)
- **Problem**: "Publish your portfolio" check (lines 373-383 in `PortfolioEditorPage.tsx`) forces users to publish to reach 100% strength.
- **Findings**: `strengthChecks` array mixed content completeness with status.
- **Solution**: 
  - Move "Publish" check to a `uiTips` category.
  - `strengthChecks` should only contain data-driven completeness items (Bio, Photo, Resume data).
  - Update `strengthScore` calculation to only use completeness checks.
