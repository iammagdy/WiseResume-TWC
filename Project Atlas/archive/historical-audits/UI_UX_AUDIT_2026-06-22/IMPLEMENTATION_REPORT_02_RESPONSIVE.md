# Implementation Report — Report 02 (Responsive / Mobile)

**Date:** 2026-06-22
**Report source (controlling scope):** `Project Atlas/UI_UX_AUDIT_2026-06-22/02_RESPONSIVE_AUDIT.md`
**Builds on:** Wave 0 (landing Lenis baseline, dialog/alert/drawer max-height, `info` token, tailoring mobile clip) — left intact, not reverted.
**Code changed:** YES (9 files, UI/CSS-class/small-component only). **Not committed, not pushed, no branch created.**
**Backend/API/auth/Appwrite/AI/state/routes/schema/payment/deploy:** NOT touched.

---

## What was fixed (items A–K from Report 02)

### A — Dashboard resume-list nested-scroll fragility ✅
`src/pages/DashboardPage.tsx` — the two elements that hardcoded `overflow-y-auto overscroll-y-contain` in JSX (which fought the `@media (max-width:1279px) { overflow: visible }` un-trap in `index.css`) now gate that overflow to desktop only: `xl:overflow-y-auto xl:overscroll-y-contain` on `.dashboard-workspace-main-body` (L889) and `.dashboard-resume-list-scroll` (L1029). Tailwind `xl` = 1280px, matching the CSS breakpoints exactly.
- **<1280px (mobile/tablet):** no JSX overflow utility → CSS `overflow:visible` wins → one natural page scroll (no inner scroll-trap / double scrollbar).
- **≥1280px (desktop):** `xl:overflow-y-auto` preserves the existing internal list scroll (the `.dashboard-resume-list-scroll` CSS cap at `min-width:1280px` is unchanged).

### B — AI Studio sticky composer / header collision ✅
`src/pages/AIStudioPage.tsx` (L489) — the composer was `sticky top-0` and collided under the `lg:hidden sticky top-0 z-50` mobile header. Changed to `sticky top-14 lg:top-0` so on mobile/tablet (<lg) it pins ~56px below the top, clearing the ~52px mobile header; `lg:static` (desktop) behavior is unchanged.

### C — Mobile "Improve with AI" icon-only control ✅
`src/components/editor/InlineAIButton.tsx` — added a visible compact `AI` label on mobile (`<span className="text-xs font-medium sm:hidden">AI</span>`, alongside the existing full label which stays `hidden sm:inline`), and added `aria-label={sectionButtonLabels[section] ?? 'AI Assist'}` to the mobile button so screen readers always get the full descriptive name. Desktop (≥sm) is unchanged (still shows the full label; "AI" span is `sm:hidden`). Editor AI logic untouched.

### D — Preview bottom action bar content overlap — VERIFIED NOT AN ISSUE (no change) ⏸️
On inspection of `src/pages/PreviewPage.tsx`, the bottom action bar (L733) is `shrink-0` in **normal flex flow** — it is **not** `position: fixed`/`absolute`. The scroll area above it (L704, `flex-1 overflow-auto`) sizes to the space *above* the bar, so the bar does not overlay resume content. The large `pb-[calc(4rem+…)]` is the bar's own internal bottom padding (home-indicator breathing room), not an overlap. Per the task ("fix only if confirmed in code"), no change was made — adding bottom padding to the scroll container would create an unnecessary double gap. (If a future change makes the bar `fixed`, this would need revisiting.)

### E — Mobile Preview PDF button label mismatch ✅
`src/pages/PreviewPage.tsx` (L745) — the mobile primary button said "Export PDF" but its `onClick` opens the export **options** sheet (`setShowExportSheet(true)`). Chose the safest option (Option 1, relabel): the mobile span now reads **"Export Options"**, matching desktop and the actual behavior. No export logic touched; the one-tap Quick PDF remains in the mobile kebab and the desktop quick-PDF button.

### F — Bottom-left mobile FAB overlapping the resume list ✅
`src/pages/DashboardPage.tsx` (L1031) — the resume-list inner container was `space-y-2 pb-1`; changed to `space-y-2 pb-20 lg:pb-1`. This reserves ~80px bottom inset on mobile/tablet (<lg, where the `lg:hidden` FAB is shown) so the last resume row/checkbox clears the bottom-left FAB; desktop (≥lg, FAB hidden) keeps the tight `pb-1`. FAB position/markup unchanged.

### G — Education field height mismatch ✅
`src/components/editor/EducationSection.tsx` — standardized the text inputs to `h-11` (44px, the same height as the section's `MonthYearPicker` date controls): Institution (was h-12), Degree (was **h-10**, the flagged mismatch), Field of Study (was h-12), GPA (was h-12). Degree/Field now align in their shared row, and all text inputs align with the date controls. Layout/form logic unchanged. (ExperienceItem was not in scope for heights and was left as-is; it already uses the `h-11` MonthYearPicker.)

### H — Collapsed entries truncation usability ✅
Added native `title` attributes (low-risk, no new dependency) to the truncated collapsed-row text:
- `src/components/editor/EducationSection.tsx` (L221-226) — `title={edu.degree || undefined}` and `title={edu.institution || undefined}`.
- `src/components/editor/ExperienceItem.tsx` (L140-146) — `title={exp.position || undefined}` and `title={exp.company || undefined}`.
Text still truncates visually; full value is inspectable on hover. `|| undefined` means no `title` is emitted for empty/placeholder rows.

### I — Landing hero min-height on short phones ✅
`src/components/landing/LandingHeroShell.tsx` — both hero sections (jobseeker + WiseHire) changed inline `minHeight: 640` → `minHeight: 'min(640px, 88dvh)'`. On a 375×667 phone the hero no longer forces 640px (caps at 88dvh of the visible viewport) so the CTA/content isn't pushed as far down; desktop keeps the full 640px feel.

### J — Tailoring mobile job-context chip hidden ✅
`src/pages/TailoringHubPage.tsx` (L558) — the workspace job chip (`Briefcase` + "title @ company") was `hidden sm:flex`. Changed to `flex … max-w-[40vw] sm:max-w-[12rem]` so a **compact, truncated** chip now shows on mobile (capped at 40vw to avoid crowding the title), full width on sm+. Still gated on `parsedJobInfo` (real data only — no fabricated content) and keeps `truncate`.

### K — Side Sheet base width below 375px ✅
`src/components/ui/sheet.tsx` — left and right `sheetVariants` base width `w-full` → `w-[92%]` (leaves an ~8% backdrop/dismiss strip below 375px). I intentionally did **not** add the optional `max-w-[22rem]` from the report, because as a base utility it would have bled into and narrowed the existing `xs`/`sm` widths; the task required preserving `xs`/`sm` behavior, so only the sub-375 base was changed. `xs:w-[85%]`, `sm:w-3/4`, `sm:max-w-sm`, and top/bottom (full-width) sheets are all unchanged. (`AppMobileSidebarSheet` overrides width with `!w-[…]`, so it is unaffected.)

---

## Files changed (9)
| File | Item(s) | Change |
|------|---------|--------|
| `src/pages/DashboardPage.tsx` | A, F | overflow gated to `xl:` on main-body + list; list `pb-20 lg:pb-1` |
| `src/pages/AIStudioPage.tsx` | B | composer `sticky top-14 lg:top-0` |
| `src/components/editor/InlineAIButton.tsx` | C | mobile "AI" label + `aria-label` |
| `src/pages/PreviewPage.tsx` | E | mobile button label → "Export Options" |
| `src/pages/TailoringHubPage.tsx` | J | mobile compact job chip (`flex max-w-[40vw] sm:max-w-[12rem]`) |
| `src/components/landing/LandingHeroShell.tsx` | I | hero `minHeight: min(640px, 88dvh)` (×2) |
| `src/components/editor/EducationSection.tsx` | G, H | inputs → `h-11` (×4); collapsed `title` (×2) |
| `src/components/editor/ExperienceItem.tsx` | H | collapsed `title` (×2) |
| `src/components/ui/sheet.tsx` | K | left/right base `w-full` → `w-[92%]` |

No CSS files were edited this pass (all changes were className/inline-style/attribute level in TSX).

---

## What was intentionally NOT fixed (deferred)
- **D** — not an issue in code (documented above); no change.
- Larger items explicitly out of scope for this pass (Report 02 §5 / task §5): persistent mobile bottom-nav redesign, Preview wrong-resume stale-store gating, Editor light-mode theming (P0, needs owner decision), Upload dedupe, AI Studio first-run tour, z-index system refactor, full accessibility pass, any backend/export/API changes.
- Secondary landing scroll contributors (Aurora touch-scroll throttle, progress-bar second listener) — still follow-ups.
- The `info` token, dialog/drawer max-height, and landing Lenis fix are Wave 0 (already done) — verified still present, not reworked.

---

## Validation
- `npx tsc --noEmit` → **PASS (exit 0)**.
- `npm run build` → **PASS (exit 0)**, "✓ built in 32.88s", `[check-no-sourcemaps] OK`. Only the pre-existing chunk-size (>500kB) advisory warnings — unchanged from baseline.
- `npx eslint` on the 9 edited files → **no new issues introduced**. The 3 reported items are all pre-existing and at lines untouched by this pass: `EducationSection.tsx:67` (`no-useless-escape`, a regex ~150 lines from the edits), `PreviewPage.tsx:174` and `TailoringHubPage.tsx:507` (`react-hooks/exhaustive-deps` warnings, far from the edited lines).

Code-verification of the task's checklist:
- **A:** mobile/tablet → one natural page scroll (no JSX overflow <1280); desktop list scroll preserved (xl:). ✅
- **B:** composer offset below the mobile header (`top-14`); desktop `lg:static` unchanged. ✅
- **C:** mobile control shows "AI" + has `aria-label`; desktop unchanged. ✅
- **D:** verified bar is in normal flow — no overlap; no change needed. ✅ (verified)
- **E:** label now matches behavior ("Export Options" opens options sheet); no export-logic change. ✅
- **F:** mobile list has `pb-20` clearance for the FAB; desktop `lg:pb-1`. ✅
- **G:** Degree/Field/Institution/GPA + date controls all `h-11`. ✅
- **H:** collapsed degree/institution/position/company carry `title`; still truncated visually. ✅
- **I:** hero `min(640px, 88dvh)`; desktop hero feel preserved. ✅
- **J:** compact truncated job chip on mobile (real data only). ✅
- **K:** side sheets leave a dismiss strip <375px; `xs`/`sm` + bottom sheets unchanged. ✅

**Live-browser confirmation: NOT performed** (no dev server started — consistent with Atlas approval rules and the prescribed `tsc`/`build` + code-verify method). On-device confirmation of the touch behaviors remains recommended (see Remaining).

---

## Remaining responsive/mobile issues (from Report 02, not in this pass)
- Persistent mobile section nav + active indicator (deferred — larger nav change).
- Raw-`vh` holdout `PipelineColumn.tsx:89` (`calc(100vh-240px)`) — WiseHire pipeline; not in A–K, left for a WiseHire pass.
- Full-height bottom-sheet `min-h-0` propagation standardization (a `SheetBody`/`SheetFooter` convention) — deferred.
- AI-Studio composer `top-14` is a fixed offset matched to the current mobile header height; if the header height changes, revisit.

## Recommended next report / wave
- **Device + a11y verification** of this pass per `10_TESTING_AND_VALIDATION_PLAN.md` (375/390/430 + reduced-motion).
- **Report 04 (Dialogs/Overlays):** z-index system consolidation + bespoke-modal → Radix (the structural overlay work Wave 0 only partially touched).
- **Report 07 (Dark/Light):** Editor light-mode P0 — still blocked on the owner's light-vs-forced-dark decision.
- **Report 06 (Accessibility):** AI `aria-live` + form-label association pass.

**Status:** This responsive pass is complete (A–K addressed; D verified as non-issue). The mobile/responsive risk from Report 02 is **reduced, not eliminated**. The app is **not** declared fully READY.
