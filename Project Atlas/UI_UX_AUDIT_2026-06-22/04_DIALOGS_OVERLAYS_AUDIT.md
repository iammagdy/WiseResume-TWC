# 04 — Dialogs, Overlays & Risky-Pattern Scan

Stack: shadcn/ui over Radix + `vaul` (Drawer) + `sonner` (toast). The Radix layer is fundamentally healthy — shared `bg-popover`/`bg-black/50` tokens (no light/dark portal color leakage), 44px close targets (`dialog.tsx:81`, `sheet.tsx:129`), correct bottom-sheet `flex flex-col flex-1 min-h-0` body, and a `BottomSheetContext` scroll-lock counter. The real defects are **(1) missing height bounds on Dialog/AlertDialog/Drawer** and **(2) a z-index inversion/war**. Live confirmation **UNKNOWN** (no browser); each finding has a code root cause.

---

## [P0] Default `DialogContent` has no `max-height` / `overflow` → tall dialogs trap the user
Area: Overlay / shadcn Dialog primitive
Page / component: `DialogContent` default branch (most confirmation/form dialogs, `CommandDialog`)
User impact: On 375-430px tall (and 768px), a dialog taller than the viewport extends above and below the screen — the centered `translate-y-[-50%]` element has the footer/primary button off-screen with **nothing to scroll**. Classic "can't reach Confirm."
Evidence: `src/components/ui/dialog.tsx:73` — `left-[50%] top-[50%] max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] ... sm:max-w-lg rounded-2xl` with **no `max-h-*`, no `overflow-y-auto`**. The `fullScreenOnMobile` branch (`:72,74`) correctly adds `max-h-screen md:max-h-[85vh] overflow-y-auto`; the default omits both. Some callers compensate (`BugReportDialog.tsx:188`), others don't.
Root cause: Height bound only on the opt-in fullscreen branch.
Recommended fix: Add `max-h-[calc(100dvh-2rem)] overflow-y-auto` to the default branch.
Risk: Low (additive; callers with explicit `max-h` override).
Validation: Open a long-content dialog at 375×667 → footer reachable, body scrolls.

## [P0] `AlertDialogContent` is not height-bounded or scrollable → destructive confirmations can trap
Area: Overlay / AlertDialog
Page / component: `AlertDialogContent` (delete resume, cancel subscription, etc.)
User impact: Content has `max-w-[90vw] sm:max-w-lg` but **no `max-h`/overflow**; long descriptions on a small phone push the `h-12 min-h-[48px]` Cancel/Action buttons off-screen. AlertDialog also has no "X" — exits are the (possibly off-screen) buttons or Escape.
Evidence: `src/components/ui/alert-dialog.tsx:34` (centering wrapper bounds width not height), `:38` (content `grid w-full max-w-[90vw] sm:max-w-lg ... p-6`, no `max-h`/overflow); buttons `:78,88`.
Root cause: No inner scroll container.
Recommended fix: Add `max-h-[calc(100dvh-2rem)] overflow-y-auto` to `AlertDialogContent`.
Risk: Low. Validation: AlertDialog with 8+ lines at 375×667 → both buttons reachable.

## [P1] z-index inversion — Tooltip (55) renders above modals (50)
Area: z-index ordering
Page / component: `TooltipContent` vs Dialog/Sheet/AlertDialog/Select/Dropdown/Popover
User impact: All Radix overlays use literal `z-50`; tooltips use the named `z-tooltip` = **55**, strictly above modals. A tooltip from underlying chrome can paint over an open modal.
Evidence: `tooltip.tsx:20` (`z-tooltip`) + `tailwind.config.ts:126` (`tooltip: 55`) vs `dialog.tsx:70`, `sheet.tsx:46,56`, `alert-dialog.tsx:18,38`, `select.tsx:68`, `dropdown-menu.tsx:64`, `popover.tsx:20` (all `z-50`).
Root cause: Two parallel z-systems (literal `z-50` for overlays vs a named scale starting at 55) overlap inverted.
Recommended fix: Standardize all overlays on the named scale; place `tooltip` deliberately relative to the modal tier.
Risk: Medium (global stacking; regression-test toast 70, keyboard-toolbar 60, ai-dialog 65). Validation: hover a tooltip-bearing control with a Dialog open → tooltip under the dialog.

## [P1] Per-dialog `z-[100]` overrides desync content from its own overlay
Area: Overlay / Dialog usage
Page / component: `BugReportDialog`, `UsernameRequestDialog`, `FeatureRequestDialog`, `ContactInquiryDialog`
User impact: These pass `z-[100]` on `DialogContent`, but `DialogContent` renders its own `DialogOverlay` at fixed `z-50` (`dialog.tsx:40,65`) that the className doesn't reach. Content jumps to 100 while its dimming backdrop stays at 50 — anything in 51-99 (the `z-[54]` workspace drawer, `z-tooltip` 55, `z-[60]` chat widget) can render *between* the backdrop and the dialog. The nested `SelectContent z-[110]` (`ContactInquiryDialog.tsx:181`) is a patch confirming the team already hit this.
Evidence: `BugReportDialog.tsx:188`, `UsernameRequestDialog.tsx:96`, `FeatureRequestDialog.tsx:101`, `ContactInquiryDialog.tsx:127,181`; overlay fixed at `dialog.tsx:40`.
Root cause: Overlay z-index hardcoded in the primitive, not derived from content z.
Recommended fix: Expose an overlay-z prop / raise the whole stack via the named scale; stop ad-hoc `z-[100]`.
Risk: Medium. Validation: open these with the drawer/chat present → no bleed-through.

## [P1] Custom modals bypass Radix — no focus trap, no Escape, ad-hoc z-war (80 / 100 / 9998 / 9999)
Area: Hand-rolled overlays
Page / component: `HiredCelebrationModal`, `BiometricLockScreen`, `AnimatedSplash`, `ConsentBanner`, `DevToolsPage` overlay, `UserDetailDrawer` confirms, and (a11y) `AIQuestionsDialog`
User impact: `fixed inset-0` framer/div overlays with no Radix wrapper → no focus trap and no Escape (only X / backdrop). `HiredCelebrationModal` closes only via X/backdrop (`:133,148`) — keyboard users can't Escape. z-values escalate beyond the semantic max (70): `:80` → `:100` → `:9998` → `:9999`, uncoordinated.
Evidence: `HiredCelebrationModal.tsx:125` (`z-[80]`), `BiometricLockScreen.tsx:100` (`z-[100]`), `AnimatedSplash.tsx:80` (`z-[9999]`), `ConsentBanner.tsx:39` (`z-[9998]`), `DevToolsPage.tsx:381` (`z-[100]`), `UserDetailDrawer.tsx:1709,1770` (`z-[60]`); a11y twin `AIQuestionsDialog.tsx:42-48`.
Root cause: Bespoke overlays instead of Radix Dialog (which gives trap + Escape + scroll-lock) + arbitrary z to "win".
Recommended fix: Wrap interactive ones in Radix `Dialog`/`AlertDialog`; replace literal z with named tokens.
Risk: Medium (Escape now closes; focus trapped). Validation: keyboard-test each for Escape + focus containment.

## [P1] `WiseWorkspaceDrawer` at `z-[54]` sits below the tooltip tier
Area: Custom drawer / z-index
Evidence: `WiseWorkspaceDrawer.tsx:36` — full-height (`h-[100dvh]`) right AI drawer pinned at `z-[54]` (one below tooltip 55, 16 below toasts 70). A tooltip can paint over it; a `z-50` dialog can interleave oddly. Recommended fix: promote to a named token placed deliberately vs tooltip/toast/dialog. Risk: Low-medium.

## [P2] Side `Sheet` is `w-full` below 375px (no dismiss strip)
Evidence: `sheet.tsx:63-64` (left/right `w-full xs:w-[85%] ... sm:max-w-sm`); `xs`=375px (`tailwind.config.ts:26`). At ≤374px the side sheet is full-bleed with no backdrop to tap-dismiss (only X/Escape). `AppMobileSidebarSheet.tsx:54` works around it with its own width. Recommended fix: cap the base (`w-[92%] max-w-[22rem]`). Risk: Low.

## [P2] Full-height bottom sheets depend on `min-h-0` propagation (footer-reachability risk)
Evidence: ~15 `side="bottom"` sheets at `h-[90dvh]`/`h-[85dvh]` (e.g. `SkillsGapSheet.tsx:179`, `SalaryNegotiationSheet.tsx:146`, `CareerQuizSheet.tsx:262`, `SaveJobSheet.tsx:73`); primitive body `sheet.tsx:104,125` is correct (`flex flex-col flex-1 min-h-0`) but a missing `min-h-0` on any caller's intermediate child pushes a sticky footer below the fold. Recommended fix: standardize a `SheetBody` (`flex-1 min-h-0 overflow-y-auto`) + `shrink-0` `SheetFooter`. Risk: Low.

## [P2] `vaul` Drawer base has no `max-h`/overflow
Evidence: `drawer.tsx:34` — `fixed inset-x-0 bottom-0 mt-24 flex h-auto flex-col` (no `max-h`/overflow); only `CompanyBriefingSheet.tsx:144` tames it with `h-[90dvh] overflow-hidden`. Recommended fix: add `max-h-[calc(100dvh-6rem)] overflow-y-auto`. Risk: Low.

## [P2] Sonner toaster is top-center, no close button — collides with top banners
Evidence: `sonner.tsx:20` (`position="top-center"`, `closeButton={false}`), `:21` (`visibleToasts={3}`); toast tier 70 (`tailwind.config.ts:129`) equals `ActingAsBanner.tsx:100` (`fixed top-0 z-[70]`). Early dismissal impossible; top-center can overlap top-pinned banners. Recommended fix: `closeButton` for long/error toasts; offset toast top when the acting-as banner is visible. Risk: Low.

## [P3] `floating-panel.tsx` custom dismissal; Select/Command lack `overscroll-contain`; AlertDialog has no X
- `floating-panel.tsx:161,169,186,193` — `mousedown`-outside + manual Escape, no focus trap; backdrop `z-40`/content `z-50`. Recommended: migrate to Radix Popover.
- `select.tsx:69` (`max-h-96`), `command.tsx:69` (`max-h-[300px] overflow-y-auto`) lack `overscroll-contain` → scroll can chain to an underlying modal body. Recommended: add `overscroll-contain`.
- `alert-dialog.tsx:28-46` — no X by Radix design (intentional); only relevant when combined with the P0 height bug.

> **Overlay system notes:** The Radix baseline is healthy (shared themed portal tokens → no color leakage, 44px close targets, correct bottom-sheet body, scroll-lock context). The two real risks are structural: missing height bounds on Dialog/AlertDialog/Drawer (modal-trap class of bug) and a z-index inversion/war. Consolidating every overlay onto the named `zIndex` tokens and adding `max-h` to the three bases closes the highest-risk gaps app-wide.

---

## Risky-pattern scan (repo-wide)

| Pattern | Notable count | Top occurrences (file:line) | Highest-risk note |
|---|---|---|---|
| `100vw` / `w-screen` / `min-w-screen` | ~10 | `ActionsPanel.tsx:56`, `OnboardingPage.tsx:646` (`w-[calc(100vw-2rem)]`); `WiseResumeHero.tsx:127`, `LandingHeroShell.tsx:87` (`maxWidth:'100vw'`); `ChatWidget.tsx:215` | `100vw` includes the scrollbar width → sub-pixel desktop overflow; `calc(100vw-2rem)` mostly safe. **No** literal `w-screen`. `body{overflow-x:hidden}` (`index.css:430`) is the guard. |
| `max-w-none` | ~25 | page wrappers `lg:max-w-none mx-auto w-full`; **`TailorQuickPdfExportDialog.tsx:483`** (`max-w-none w-auto` on a dialog) | Page-level is intentional fluid layout; the dialog one removes the width cap — risk of a too-wide dialog. |
| `overflow-x-auto` | ~40 | `KanbanBoard.tsx:327,366,428`, `StatusFilter.tsx:25`, `TemplatesPage.tsx:74`, `GuidesPage.tsx:94` | Mostly intentional chip/Kanban strips with `scrollbar-none` + negative-margin bleed; verify Kanban doesn't push page width. |
| `overflow-visible` | 3 | `ObservabilityPanel.tsx:56`, `PortfolioAtsSparkline.tsx:46` | On `<svg>` for charts — benign. |
| `fixed` bottom bars / FABs | ~18 | `CoverLettersPage.tsx:202`, `ResignationLettersPage.tsx:181` (`bottom-[7rem]`); `ApplicationsPage.tsx:647` (safe-area aware); `AppMobileSidebarSheet.tsx:41` | **`bottom-[7rem]` FABs lack `env(safe-area-inset-bottom)`** → notch overlap; FAB overlaps dashboard list. |
| `sticky bottom-0` footers | ~4 | `BoostAllExperienceSheet.tsx:247`, `tailor/*HistorySheet.tsx` | All include `pb-safe` — good. |
| raw `100vh` vs `100dvh` | ~6 raw / ~60 dvh | raw: `ScrollStack.css:14`, `PipelineColumn.tsx:89` (`calc(100vh-240px)`), `DevToolsPage.tsx:247` (`h-screen`), `PageSkeletons.tsx:278`, `index.css:419,428` | App mostly migrated to `dvh`. **`PipelineColumn.tsx:89`** raw-vh holdout clips on mobile Safari; `ScrollStack.css:14` feeds the landing scroll band (see 05). |
| `z-[` arbitrary >50 | ~30 | `WiseWorkspaceDrawer.tsx:36` (54); tooltip 55; `ChatWidget.tsx:190` (60); `ActingAsBanner.tsx:100` (70); `HiredCelebrationModal.tsx:125` (80); dialogs 100; `SelectContent` 110; `ConsentBanner.tsx:39` (9998); `AnimatedSplash.tsx:80` (9999) | **Clear z-index war:** 54→60→70→80→100→110→9998→9999, no shared scale. The `9998/9999` pair and `z-[100]` dialog overrides are riskiest. |
| `translate-x` / `left-[` / `right-[` | ~16 | `dialog.tsx:73` (centering, fine); `TailorQuickPdfExportDialog.tsx:515` (`-left-[10000px]` off-screen print clone — intentional, contained by `overflow-x:hidden`) | No offset found pushing interactive content past the right edge. |

**Cross-cutting safeguard:** `body{overflow-x:hidden}` (`index.css:430`) + `PublicPortfolioPage.tsx:476` (`overflow-x-hidden max-w-full`) are the main defenses, which is why the `100vw`/`overflow-x-auto` patterns mostly don't cause visible page-level horizontal scroll — though they can still clip content inside containers.
