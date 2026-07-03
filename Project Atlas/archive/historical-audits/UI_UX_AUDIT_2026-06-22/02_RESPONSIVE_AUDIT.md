# 02 — Responsive / Mobile Audit

Viewports reasoned about: **375×667, 390×844, 430×932, 768×1024, 1024×768, 1366×768, 1440×900, 1920×1080**. All findings are code-derived; live pixel confirmation is **UNKNOWN** (no browser run) but each has a concrete root cause.

## Global posture (good defaults)

- `body { overflow-x: hidden; overscroll-behavior: none }` (`index.css:430-432`) is the app's main guard against page-level horizontal scroll — this is why the many `calc(100vw-…)` and `overflow-x-auto` usages don't produce visible horizontal scrollbars.
- `#root`/`body` use `min-height: 100vh; 100dvh` (`index.css:418-429`); the app has **broadly migrated to `dvh`** (~60 usages) over raw `vh` (~6 survivors).
- `xs` breakpoint = 375px (`tailwind.config.ts:26`); breakpoints otherwise standard Tailwind.

---

## Highest-impact responsive findings (detail in 03/04/05)

### [P0] Landing mobile scroll feel — see `05_LANDING_MOBILE_SCROLL_BUG.md`.

### [P0] Default `Dialog`/`AlertDialog` have no `max-h`/scroll → trap on small screens
- `dialog.tsx:73` (default branch has no `max-h`/`overflow`), `alert-dialog.tsx:34,38`. On 375-430px, tall content pushes the confirm/footer buttons off-screen with nothing to scroll. The `fullScreenOnMobile` Dialog branch (`:72,74`) is correct; the default is not. **Fix:** add `max-h-[calc(100dvh-2rem)] overflow-y-auto` to the bases. (Full detail in 04.)

### [P1] Dashboard resume-list nested-scroll fragility (<1280px)
- `DashboardPage.tsx:889,1029` hardcode `overflow-y-auto overscroll-y-contain` in JSX while `index.css:619-633` only neutralizes them under `@media (max-width:1279px)` via `overflow:visible`. Tailwind's utility (same `@layer utilities`, single class) can win by source order, re-introducing an inner scroll region / scroll-trap on phones/tablets. **Fix:** drive overflow from CSS only; remove the JSX overflow utilities on these two elements.

### [P1] Tailoring Hub result content clipped behind fixed bar (≤639px)
- `job-match-workspace.css:892-900`: the mobile media-query padding (`4.5rem`) is overridden by a later equal-specificity `.jmw-result-body--compare { padding-bottom: 1.25rem }`, so a `position:fixed` action bar (`:877`) overlays the last export links/preview on phones. **Fix:** reorder rules or scope desktop in `min-width:640px`. (Detail in 03 Tailoring.)

### [P1] AI Studio sticky composer collides with sticky header (mobile/tablet)
- `AIStudioPage.tsx:433` (header `sticky top-0 z-50`) and `:489` (composer `sticky top-0 z-30 lg:static`) both stick at `top:0` in one scroll container; the z-50 header paints over the composer input. **Fix:** offset the composer `top` by the mobile header height, or make only one sticky on mobile.

### [P1] "Improve with AI" is an unlabeled icon on mobile
- `InlineAIButton.tsx:171` label is `hidden sm:inline`; mobile renders a bare Sparkles icon with no `aria-label`/tooltip. The app's core differentiator is hard to discover on phones. **Fix:** `aria-label` + a short visible "AI" label or coachmark.

### [P1] Preview bottom action bar can hide resume content on short screens
- `PreviewPage.tsx:734` action bar reserves `pb-[calc(4rem+safe-area)]` but the scroll container (`:704`) has no matching bottom padding; the last lines of a 2-page resume can sit under the Export bar at 375×667 / landscape. **Fix:** pad the scroll container to the bar height.

### [P1] Quick-PDF download is desktop-only; mobile buries it
- `PreviewPage.tsx:751` quick PDF button is `hidden sm:inline-flex`; the mobile primary button labeled "Export PDF" actually opens the options sheet (`:745`), and one-tap download is inside a kebab (`:794`). Label/behavior mismatch + extra friction on the most common action.

---

## Mobile-nav & floating-control findings

### [P1] No persistent mobile section nav; single bottom-left FAB
- `AppMobileSidebarSheet.tsx:29-48` — on phones the only way to switch top-level sections is the bottom-left Menu FAB → sheet; the top bar (`AppWorkspaceTopBar.tsx:42-75`) has no nav and no active-section indicator. Two-tap, low-affordance. **Fix:** consider a persistent bottom tab bar (or labeled top-bar entry) for the 3-4 primary destinations <768px.

### [P2] Bottom-left FAB overlaps the resume list
- `AppMobileSidebarSheet.tsx:41-44` (fixed z-48 FAB) over `DashboardPage.tsx:1031` (`space-y-2 pb-1`). The last card's left edge / selection checkbox can sit under the FAB at 375/390. **Fix:** add `pb-20` to the mobile list or move the FAB clear of content.

### [P2] Letter-page FABs use a magic `bottom-[7rem]` offset (no safe-area)
- `CoverLettersPage.tsx:202`, `ResignationLettersPage.tsx:181` hardcode `bottom-[7rem]` (no `env(safe-area-inset-bottom)`), unlike the safe-area-aware FAB at `ApplicationsPage.tsx:647`. On notched phones they may overlap the bottom nav. Plus a duplicate "+" exists in the header (redundant). **Fix:** tie to bottom-nav height + safe-area; de-dupe.

---

## Form & content responsive findings

### [P1] Mismatched input heights in Education (h-10 vs h-12 same row)
- `EducationSection.tsx:262` (Degree `h-10`) vs `:271` (Field `h-12`) in one `grid-cols-2`; MonthYearPicker triggers are `h-11`. Visible misalignment. **Fix:** standardize one height.

### [P2] 60-item Year `Select` with no typeahead
- `MonthYearPicker.tsx:21,149-151` — scrolling 60 years on mobile to reach older dates is tedious. **Fix:** typeahead or numeric year input.

### [P2] Collapsed entries truncate with no tooltip
- `EducationSection.tsx:221-226`, `ExperienceItem.tsx:140-146` — `truncate` with no `title`; long degrees become indistinguishable when the panel is narrow (mobile, or desktop split at the 32% minSize). **Fix:** add `title=`/tooltip.

### [P2] Hero min-height 640px is tight on 375×667
- `LandingHeroShell.tsx:13,56` (`minHeight:640`) + hero top padding ≈ header 4rem+1.5rem can push the primary CTA near the fold on the shortest phone. **Fix:** `min(640px, 88dvh)` or reduce on `max-height:700px`.

### [P2] Tailoring job-context chip hidden on mobile
- `TailoringHubPage.tsx:557` (`hidden sm:flex`) — phone users lose the "role @ company" reminder while filling the form. **Fix:** show a compact truncated chip on mobile.

### [P2] Sheet is `w-full` below 375px (no backdrop strip)
- `sheet.tsx:63-64` left/right base `w-full`, first override at `xs:` (375px); at ≤374px (older/zoomed) the side sheet is full-bleed with no tap-to-dismiss strip. **Fix:** cap the base (`w-[92%] max-w-[22rem]`).

### [P2] `vaul` Drawer & full-height bottom sheets depend on `min-h-0` propagation
- `drawer.tsx:34` (no `max-h`/overflow on base) and ~15 `side="bottom"` sheets at `h-[90dvh]` rely on every flex child having `min-h-0`; a missing one pushes a sticky footer below the fold. **Fix:** standardize a `SheetBody` (`flex-1 min-h-0 overflow-y-auto`) + `shrink-0` footer; add `max-h` to Drawer base.

---

## Raw-`vh` survivors (mobile URL-bar risk)

| File:line | Pattern | Risk |
|---|---|---|
| `ScrollStack.css:14` | `min-height:100vh` | Landing stack overshoot (see 05) |
| `PipelineColumn.tsx:89` | `maxHeight: calc(100vh - 240px)` | WiseHire pipeline column clips on mobile Safari |
| `DevToolsPage.tsx:247` | `h-screen` | Admin only — low risk |
| `PageSkeletons.tsx:278` | raw `100vh` | Loading skeleton — low risk |
| `index.css:419,428` | raw `100vh` | Paired with `100dvh` fallback line — OK |

---

## Per-viewport summary (code-reasoned)

| Viewport | Assessment |
|---|---|
| 375×667 | Tightest case. Hero CTA near fold; field-height mismatch; dialog/sheet trap risk most acute; Year select tedious; sub-44px AI-result buttons. |
| 390×844 / 430×932 | Generally OK; FAB overlap, mobile nav affordance, AI-Studio sticky collision, preview action-bar overlap remain. |
| 768×1024 (tablet portrait) | Dashboard collapses to single column (`<1280px`), nested-scroll fragility applies; editor uses tab model. |
| 1024×768 (tablet landscape) | Mostly desktop-like; editor two-pane may feel cramped; sidebar present. |
| 1366×768 / 1440×900 | Primary desktop target — strongest. Editor light-mode P0 and z-index war still apply. |
| 1920×1080 | Content max-widths cap nicely (editor form `42rem`, page `lg:max-w-none mx-auto`); no over-stretch found. |

**No code-level evidence of page-level horizontal scroll** at any viewport (guarded by `body{overflow-x:hidden}`), but several patterns can **clip content inside containers** (the fixed-bar overlaps and nested-scroll traps above).
