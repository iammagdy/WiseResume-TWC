# Portfolio Feature – Known Issues

**Created**: 2026-03-13  
**Status**: Documentation only – no fixes yet

---

## Feature Overview

The Portfolio tool in WiseResume allows authenticated users to generate and publish a public, themed personal portfolio website directly from their CV/resume data. Key flows include:

1. **Configure** – Set username, bio, social links, visibility, and content sections in `PortfolioEditorPage`.
2. **Choose Theme** – Select a visual style (e.g. `minimal`, `developer-terminal`, `neon-cyber`), layout, font, and accent color.
3. **Preview** – A live preview card in the editor + the full public portfolio at `thewise.cloud/p/<username>`.
4. **Publish / Share** – Toggle `portfolioEnabled`, copy the URL, or share via QR code.
5. **Public View** – External visitors see `PublicPortfolioPage` which fetches data via the `get_public_portfolio` Supabase RPC and renders the themed portfolio.

**Files involved:**
- `src/pages/PortfolioEditorPage.tsx` – Editor/settings UI
- `src/pages/PublicPortfolioPage.tsx` – Public-facing rendered portfolio (~1100 lines)
- `src/hooks/usePublicPortfolio.ts` – Data fetching via `get_public_portfolio` RPC
- `src/hooks/usePortfolioAnalytics.ts` – Analytics tracking
- `src/lib/portfolioThemes.ts` – Theme registry and CSS variable builder
- `src/lib/portfolioUrl.ts` – URL generation helper
- `supabase/functions/generate-portfolio-bio/` – AI bio/SEO/availability generation
- `supabase/functions/track-portfolio-view/` – View analytics beacon
- `supabase/functions/ask-portfolio/` – AI chat widget backend
- `supabase/functions/portfolio-meta/` – OG/meta image generation

---

## Critical Issues

### Issue 1: Portfolio data becomes stale – CV updates not shown until cache expires

**Files:** `src/hooks/usePublicPortfolio.ts`

**Problem:** `usePublicPortfolio` uses React Query with `staleTime: 10 * 60 * 1000` (10 minutes) and `gcTime: 30 * 60 * 1000` (30 minutes). When a user edits their CV and saves, the publicly-visible portfolio will continue to display the old resume data for up to 10 minutes, with no way for the user to force a refresh.

**Impact:** A user presenting their portfolio to a recruiter right after updating their CV will unknowingly show outdated information. This is a data integrity concern that directly undermines user trust.

---

### Issue 2: Public portfolio page renders a blank/broken layout if `portfolioExtras` JSONB field is malformed or missing

**Files:** `src/hooks/usePublicPortfolio.ts`, `src/pages/PublicPortfolioPage.tsx`

**Problem:** `portfolioExtras` is cast with a blanket `as Record<string, unknown>` on line 91 of `usePublicPortfolio.ts`. If the stored JSONB in Supabase is `null`, corrupted, or in an unexpected format (e.g. from a schema migration), the type-cast proceeds silently with an empty object `{}`. Sub-arrays like `caseStudies`, `services`, `testimonials`, and `highlights` all default to empty. However, `PublicPortfolioPage` also reads `testimonials` and `highlights` directly from `profile` via `(profile as unknown as Record<string, unknown>)` casts at lines 482–483, not from `extras`. This double-read path means any schema change to where these fields are stored can silently break either or both.

**Impact:** If the extras data shape changes, sections like Services, Case Studies, and Testimonials silently disappear. The user sees no error — just phantom empty sections or sections they expected to be visible.

---

### Issue 3: `PortfolioEditorPage` returns `null` during profile loading — no skeleton or feedback shown

**Files:** `src/pages/PortfolioEditorPage.tsx` (lines 179–181)

**Problem:**
```tsx
if (!user) return null;
if (loading) return null;  // Suspense already shows skeleton, but this race condition means a blank flash
```

The comment says "Suspense fallback already shows PortfolioEditorSkeleton", but this is only true if the component is wrapped with a `<Suspense>` boundary higher in the tree. If the parent's Suspense fires before `useProfile` resolves but `loading` remains `true` after Suspense resolves, the user sees a brief blank white flash. There is no loading indicator or skeleton rendered from within the component itself.

**Impact:** Unreliable loading UX — on slower connections the page appears blank for several seconds before populating. Users may refresh thinking the page is broken.

---

### Issue 4: AI bio generation silently uses wrong resume when `selectedResumeId` is stale

**Files:** `src/pages/PortfolioEditorPage.tsx` (lines 198–217)

**Problem:** `callPortfolioAI` always falls back to `resumes[0]` if `selectedResumeId` doesn't match:
```tsx
const selectedResume = resumes.find((r) => r.id === selectedResumeId) || resumes[0];
```
If a user has multiple resumes and the portfolio is linked to a specific one (`portfolioResumeId`), but the state update for `selectedResumeId` hasn't yet propagated (it's async via `useEffect`), the AI will generate a bio from the wrong resume without any warning.

**Impact:** Generated bio/SEO text is derived from the incorrect resume, causing a confusing and incorrect portfolio bio that the user may not notice.

---

## Medium Issues

### Issue 5: `window.matchMedia` called at module scope causes SSR / Capacitor crash

**Files:** `src/pages/PortfolioEditorPage.tsx` (line 88)

**Problem:**
```tsx
const reducedMotion = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
```
`window.matchMedia` is called inside `useMemo` with no dependency, meaning it fires once on initial render. While this is fine in a browser, it will throw a `ReferenceError` in SSR contexts or Capacitor's sandboxed environment, which doesn't expose `window.matchMedia`.

**Impact:** App crash at portfolio editor mount in non-browser environments or certain Capacitor webview configurations.

---

### Issue 6: `PublicPortfolioPage` has a 1098-line monolithic component with no code splitting beyond `ChatWidget`

**Files:** `src/pages/PublicPortfolioPage.tsx`

**Problem:** The public portfolio page is a single enormous component inlining all theme logic, card rendering, scroll tracking, OG meta injection, and intersection observers. Only the `ChatWidget` is lazy-loaded. Every portfolio visitor downloads the full 57 KB file even if they only need the `minimal` theme with 3 sections.

**Impact:** Unnecessarily large initial JS bundle for public visitors (who are external, not the authenticated user). Slow time-to-interactive on mobile, especially for portfolios with many sections.

---

### Issue 7: Sticky header `IntersectionObserver` re-creates on every `portfolio` data change

**Files:** `src/pages/PublicPortfolioPage.tsx` (lines 331–339)

**Problem:** The sticky header observer has `portfolio` in its dependency array:
```tsx
useEffect(() => {
  if (!heroRef.current) return;
  const observer = new IntersectionObserver(...);
  observer.observe(heroRef.current);
  return () => observer.disconnect();
}, [portfolio]);   // ← fires every time portfolio data changes
```
The observer is torn down and rebuilt every time the data changes, causing a brief flash where the sticky header may appear/disappear unexpectedly after the initial data load.

**Impact:** Visible sticky header flickering on first load. If the data re-fetches (e.g. from a cache invalidation), users may see the header flash.

---

### Issue 8: Portfolio strength score counts `portfolioEnabled` as a completeness criterion, creating misleading guidance

**Files:** `src/pages/PortfolioEditorPage.tsx` (lines 358–372)

**Problem:** The `strengthChecks` array includes:
```tsx
{ ok: portfolioEnabled, tip: 'Publish your portfolio to make it live' }
```
This means a fully-configured but unpublished portfolio will always show less than 100% strength. The tip urges the user to publish, but a user may intentionally keep their portfolio `draft` while building it. The score conflates "completeness" with "published state".

**Impact:** Confusing UX — users who are still preparing their portfolio feel pressured to publish prematurely to reach 100% "strength". The score doesn't accurately reflect how complete the content is.

---

### Issue 9: PDF download uses `html2canvas` which ignores CSS `backdrop-filter` and `color-mix()`

**Files:** `src/pages/PublicPortfolioPage.tsx` (lines 407–445)

**Problem:** The PDF download feature renders the portfolio via `captureWithRetry` (a wrapper around `html2canvas`). `html2canvas` has known limitations with modern CSS, including `backdrop-filter`, `color-mix(in srgb, ...)`, `conic-gradient`, and CSS custom properties that depend on computed values at render time. The portfolio themes heavily use all of these (e.g. glassmorphism for `glass-pro`, neon effects for `neon-cyber`).

**Impact:** Downloaded PDFs look visually broken, missing transparency effects and showing wrong colors, making the PDF export feature practically unusable for premium themes.

---

## Low Priority Issues

### Issue 10: `portfolioSummary` from `extras` is stored but never rendered on the public page

**Files:** `src/pages/PortfolioEditorPage.tsx` (line 127), `src/hooks/usePublicPortfolio.ts`

**Problem:** `portfolioSummary` is saved into `portfolioExtras.portfolioSummary`, extracted in the editor, and tracked in state — but `PublicPortfolioPage` never reads or displays it. The `portfolioBio` field is used for the "About" section, and `portfolioSummary` silently disappears.

**Impact:** Users who fill out the "Summary" field in the editor never see it reflected live, leading to confusion about what the field does.

---

### Issue 11: No validation of social link format before save

**Files:** `src/pages/PortfolioEditorPage.tsx`

**Problem:** Social URLs (LinkedIn, GitHub, Twitter, Website) are accepted and saved as-is. There is no validation that the URL is well-formed (e.g., starts with `https://`). If a user pastes a LinkedIn profile as `linkedin.com/in/user` (without `https://`), the resulting anchor tag on the public portfolio will be a relative link that navigates to `thewise.cloud/linkedin.com/in/user`.

**Impact:** Social media links render as broken relative links if the user omits the protocol prefix.

---

### Issue 12: Theme preview in the Design tab does not reflect the system's dark/light mode toggle

**Files:** `src/components/portfolio/editor/DesignTab.tsx` (theme preview component)

**Problem:** Light-background themes (`classic-clean`, `executive-suite`, `freelancer-starter`) display accurately in light browser mode but may look broken in dark mode because the editor itself uses a dark UI and the preview mini-card inherits the parent's CSS variable context.

**Impact:** Users selecting a light theme see a dark or incorrectly-colored embed preview, making it difficult to evaluate the actual theme appearance before publishing.
