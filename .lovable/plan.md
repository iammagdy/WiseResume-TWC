

# Portfolio Tool: Performance Cleanup and Enhancements

## Part 1 — Things to Remove or Fix for Performance

### 1. Split the 1,971-line monolith (`PublicPortfolioPage.tsx`)
The public portfolio page contains 20+ components all in one file. This hurts:
- Tree-shaking (everything loads even if the portfolio has no projects/services)
- Code readability and maintainability
- Hot module replacement speed during development

**Fix:** Extract into separate files under `src/components/portfolio/public/`:
- `HeroSection.tsx` (avatar, name, badges, social, CTAs)
- `ExperienceTimeline.tsx` (ExperienceCard + timeline logic)
- `EducationSection.tsx`
- `ProjectGrid.tsx`
- `SkillCloud.tsx` (already complex with IntersectionObserver)
- `StatsStrip.tsx`
- `SectionNav.tsx`
- `StickyHeader.tsx`
- `ChatWidget.tsx` (lazy-loaded)
- `CaseStudyCard.tsx`, `ServiceCard.tsx`
- `BioReveal.tsx`
- `TypewriterText.tsx`

### 2. Lazy-load the ChatWidget
The ChatWidget (~135 lines) is always mounted even when closed. It imports nothing heavy but creates DOM elements, event listeners, and AnimatePresence overhead. Since most visitors never open it:

**Fix:** Wrap in `lazy()` and only render when `showChat` is true (triggered by the FAB). The FAB itself stays eagerly loaded.

### 3. Remove the infinite avatar spin animation
Line 1516: `animation: 'spin 6s linear infinite'` runs a conic-gradient rotation forever on the GPU. This is purely decorative and wastes battery on mobile.

**Fix:** Replace with a static gradient border or a CSS `@keyframes` that runs once and stops, or use `will-change: auto` with a finite animation.

### 4. Remove unused motion variants
`slideFromLeft`, `slideFromRight` are defined (lines 66-73) but never used in the rendering code. `unfold` is only used by CaseStudyCard.

**Fix:** Remove `slideFromLeft` and `slideFromRight`. Move `unfold` into CaseStudyCard's own file.

### 5. Stop `useActiveStatus` polling when tab is hidden
The 60-second polling interval runs even when the browser tab is not visible, wasting network requests.

**Fix:** Pause the interval when `document.visibilityState === 'hidden'` and resume when visible.

### 6. Consolidate redundant tracking beacons
The tracking code sends beacons in three places: `visibilitychange`, `pagehide`, and a 30-second timer. The 30s timer also does a full `fetch()` call. This can result in duplicate tracking entries.

**Fix:** Remove the 30s timer entirely. The `visibilitychange` + `pagehide` combo already covers all exit scenarios including mobile tab switches.

### 7. Reduce IntersectionObserver count
Currently there are 7+ separate IntersectionObservers: hero sticky, section nav (one per section), experience timeline, education reveal, skill cloud, bio reveal, stats strip, and section tracking. Each one adds memory and CPU overhead.

**Fix:** Consolidate section tracking + section nav into a single shared observer using a `useMultiSectionObserver` hook that reports which sections are visible.

### 8. Prevent StatsStrip counter re-renders
The animated counter in StatsStrip calls `setCounts()` on every `requestAnimationFrame` tick for each stat independently, causing 60+ re-renders per second during the animation.

**Fix:** Use a single `useRef` for the display values and update DOM directly via refs during animation, only calling `setState` once at the end.

---

## Part 2 — Things to Add/Enhance

### 9. Render Awards section on public portfolio
Awards were added to the data model (`usePublicPortfolio` fetches them) but the public portfolio page never renders them. This is a gap after the tailor tool extension.

**Fix:** Add an Awards section between Certifications and the footer, with cards similar to Certifications but including the `description` field.

### 10. Render Publications and Volunteering sections
Both are fetched in `usePublicPortfolio` (lines 61-62) and supported by `ContentVisibilitySection`, but never rendered on the public page.

**Fix:** Add Publications (with links) and Volunteering sections, respecting the `portfolioSections` visibility toggles.

### 11. Add Certifications to SectionNav and section tracking
Certifications has no `id` attribute on its section element, so it's excluded from the mobile quick-nav pills and from visitor section tracking.

**Fix:** Add `id="section-certifications"` and include it in the `SectionNav` sections array and the tracking observer list.

### 12. ChatWidget suggested questions should auto-send
Currently clicking a suggested question only sets the input text — the user still has to tap Send. This is a UX friction point.

**Fix:** When a suggested question is tapped, call `send()` directly instead of just `setInput()`.

### 13. Add "View Live" button in Editor when portfolio is published
The editor has no quick way to preview the actual live portfolio. Users have to manually navigate.

**Fix:** Add a persistent "View Live" link/button in the hero card that opens the portfolio URL in a new tab (already partially there but could be more prominent).

### 14. Reduce PortfolioEditorPage state variables
The editor has 25+ individual `useState` calls that could be consolidated into a single form object managed by React Hook Form + Zod (per project conventions).

**Fix:** Migrate to `useForm()` with a Zod schema, reducing boilerplate and enabling built-in dirty tracking and validation.

---

## Files Changed Summary

| File | Change |
|------|--------|
| `src/pages/PublicPortfolioPage.tsx` | Extract components, remove unused variants, fix avatar animation, remove 30s beacon, add Awards/Publications/Volunteering sections, fix Certifications nav |
| `src/components/portfolio/public/HeroSection.tsx` | **New** — hero block extracted |
| `src/components/portfolio/public/ExperienceTimeline.tsx` | **New** — experience cards + timeline |
| `src/components/portfolio/public/SkillCloud.tsx` | **New** — skill cloud extracted |
| `src/components/portfolio/public/StatsStrip.tsx` | **New** — with ref-based animation |
| `src/components/portfolio/public/SectionNav.tsx` | **New** — with consolidated observer |
| `src/components/portfolio/public/ChatWidget.tsx` | **New** — lazy-loaded |
| `src/components/portfolio/public/StickyHeader.tsx` | **New** |
| `src/components/portfolio/public/BioReveal.tsx` | **New** |
| `src/components/portfolio/public/TypewriterText.tsx` | **New** |
| `src/components/portfolio/public/cards/` | **New** — ExperienceCard, EducationCard, ProjectCard, CaseStudyCard, ServiceCard |
| `src/hooks/useMultiSectionObserver.ts` | **New** — shared IntersectionObserver for section tracking + nav |
| `src/pages/PortfolioEditorPage.tsx` | Migrate to React Hook Form (future phase) |

---

## Priority Order

1. **High impact, low risk:** Remove unused variants, fix avatar animation, remove 30s beacon, fix ChatWidget auto-send, add Certifications to nav (quick wins)
2. **High impact, medium risk:** Split monolith into components, lazy-load ChatWidget, consolidate observers
3. **Medium impact:** Add Awards/Publications/Volunteering sections, ref-based StatsStrip animation
4. **Lower priority:** Editor React Hook Form migration (larger refactor, separate phase)

