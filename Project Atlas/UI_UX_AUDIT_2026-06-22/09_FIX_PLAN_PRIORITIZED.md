# 09 — Prioritized Fix Plan

Sequenced for safety and impact. **No fixes have been applied** — this is the plan only. Each item: scope, files, risk, and the constraint check (UI-only; no backend/API/auth/state/business-logic changes; preserve shadcn/Radix).

Legend — Effort: S (≤30 min), M (≤half day), L (multi-day / refactor).

---

## Wave 0 — Headline + global-class fixes (do first; low risk, high reach)

| # | Sev | Fix | Files | Effort | Risk |
|---|-----|-----|-------|--------|------|
| 0.1 | P0 | **Landing scroll:** import `lenis/dist/lenis.css` (or add the `html.lenis` reset) and disable native `scroll-behavior:smooth` while Lenis is active. Then reduce stack `padding-bottom` ≤640px and switch `100vh`→`100dvh`. | `main.tsx` / `index.css:414`; `ScrollStack.css:13-14` | S–M | Low (matches library contract) |
| 0.2 | P0 | **Dialog/AlertDialog trap:** add `max-h-[calc(100dvh-2rem)] overflow-y-auto` to the default `DialogContent` and to `AlertDialogContent`; add `max-h-[calc(100dvh-6rem)] overflow-y-auto` to `DrawerContent`. | `ui/dialog.tsx:73`, `ui/alert-dialog.tsx:38`, `ui/drawer.tsx:34` | S | Low (callers with explicit `max-h` override) |
| 0.3 | P1 | **`info` token:** add `info: { DEFAULT, foreground }` to Tailwind colors. | `tailwind.config.ts:99-106` | S | Low |
| 0.4 | P1 | **Tailoring mobile clip:** reorder the two `.jmw-result-body--compare` rules (or scope desktop in `min-width:640px`). | `job-match-workspace.css:892-900` | S | Low |

## Wave 1 — Editor light-mode (the biggest single correctness gap)

| # | Sev | Fix | Files | Effort | Risk |
|---|-----|-----|-------|--------|------|
| 1.1 | P0 | **Editor theming:** define light values for `--editor-surface*`/`--editor-border`/`--editor-muted-fg` (or map onto `--card`/`--muted`/`--border`); replace white-alpha/`#fff`/`hsl(0 0% 96%)` text with `hsl(var(--foreground)/x)`/`hsl(var(--muted-foreground))`; give the rail a light gradient. (Alt: force `dark` on `editor-workspace-root` if a dark editor is intentional — confirm with owner.) | `editor-workspace.css:7-12,96-97,125-257`; `index.css:663-667` | M–L | Medium (most-used screen; re-test both themes) |
| 1.2 | P2 | Derive `--editor-crimson` from `--primary`; delete the one-off. | `editor-workspace.css:7` | S | Low |

> **Owner decision needed (Wave 1):** light editor vs intentionally-dark editor. This changes 1.1's approach. See `09` end + ask before implementing.

## Wave 2 — Correctness & data-safety bugs

| # | Sev | Fix | Files | Effort | Risk |
|---|-----|-----|-------|--------|------|
| 2.1 | P1 | **Wrong-resume preview:** render `<TemplateSkeleton/>` while `needsResumeBootstrap && !isPreviewReady` instead of `currentResume`. | `PreviewPage.tsx:715-727` | S | Low |
| 2.2 | P1 | **Upload dedupe:** disable the continue button while `createResume.isPending`; (M) add title/content-fingerprint check → "Open existing / Create copy". | `UploadPage.tsx:144-179` | S–M | Low–Medium |
| 2.3 | P1 | **Pricing CTA:** plan-rank so premium users see "Included"/disabled for lower tiers, "Upgrade" only for higher. | `PricingPage.tsx:41-45` | S | Low |
| 2.4 | P1 | **Tailoring guardrail UX:** reframe "No meaningful changes" as a recoverable *warning* with inline "Retry"/"Edit job description" + credit note (do not change guardrail logic). | `TailoringHubPage.tsx:389-399,677-686` | M | Low |
| 2.5 | P1 | **Dashboard tip stats:** rephrase fabricated percentages to non-numeric guidance (or cite sources). | `DashboardStats.tsx:209-229` | S | None |
| 2.6 | P2 | Parse-recovery banner: wire "Try a different file" → `clearError()`+reset; "Fill in manually" → start blank/editor. | `UploadPage.tsx:380-394` | S | Low |
| 2.7 | P2 | Portfolio password-set: seed state from `portfolio_settings` on load (not the extras mirror). | `PortfolioEditorPage.tsx:1579,276,319` | M | Medium (password hydration — test enable/disable/change) |

## Wave 3 — z-index system & overlay hardening

| # | Sev | Fix | Files | Effort | Risk |
|---|-----|-----|-------|--------|------|
| 3.1 | P1 | Migrate all Radix overlays + bespoke modals onto the named `zIndex` scale; place tooltip below the modal tier; retire `z-[100]`/`z-[9998]`/`z-[9999]`/`z-[54]` literals. | `tooltip.tsx:20`, `dialog.tsx` overlay, `tailwind.config.ts:126`, `WiseWorkspaceDrawer.tsx:36`, `AnimatedSplash.tsx:80`, `ConsentBanner.tsx:39`, the four `z-[100]` dialogs | M | Medium (global stacking — regression-test toast/keyboard-toolbar/ai-dialog) |
| 3.2 | P1 | Wrap bespoke interactive modals in Radix `Dialog` (focus-trap/Escape): `AIQuestionsDialog`, `HiredCelebrationModal`. | `editor/ai/AIQuestionsDialog.tsx`, `dashboard/HiredCelebrationModal.tsx` | M | Medium (Escape now closes; focus trapped) |
| 3.3 | P2 | Standardize a `SheetBody`(`flex-1 min-h-0 overflow-y-auto`)+`SheetFooter`(`shrink-0`); cap side-Sheet base width `<375px`. | `ui/sheet.tsx:63-64,104,125` | M | Low |

## Wave 4 — Accessibility

| # | Sev | Fix | Files | Effort |
|---|-----|-----|-------|--------|
| 4.1 | P1 | `aria-live`/`role="status"` + `aria-busy` on AI loading+result regions. | `editor/ai/AIActionBar.tsx:99`, `ai-studio/*Sheet.tsx` | M |
| 4.2 | P1 | `htmlFor`/`id` on ai-studio + public contact form labels (or reuse `form-field.tsx`). | `ai-studio/ColdEmailSheet.tsx:200`+siblings, `portfolio/public/PortfolioContactForm.tsx:228-291` | M |
| 4.3 | P1 | `focus-visible` ring on contact-form inputs (replace `outline-none`+border-only). | `PortfolioContactForm.tsx:238,261,283` | S |
| 4.4 | P2 | `aria-label`+44px on portfolio chat send; drop `h-7`/`h-8` on AI-result buttons; `aria-label`+label on mobile "Improve with AI". | `ChatWidget.tsx:322`, `ColdEmailSheet.tsx:185,189,271`, `InlineAIButton.tsx:171,262` | S |
| 4.5 | P2 | Inline `role="alert"` errors for register/forgot/claim (mirror login). | `AuthPage.tsx:121-161,248-279` | S |
| 4.6 | P2 | Raise `--lp-text-subtle` / placeholder alpha after browser contrast check. | `index-landing.css:33,68`, `ui/input.tsx:14` | S |

## Wave 5 — Mobile nav & responsive polish

| # | Sev | Fix | Files | Effort |
|---|-----|-----|-------|--------|
| 5.1 | P2 | Persistent mobile section nav (bottom tab bar or labeled top-bar entry) + active indicator; add bottom inset so the FAB doesn't overlap the list; add a mobile search entry to `AppWorkspaceTopBar`. | `AppMobileSidebarSheet.tsx`, `AppWorkspaceTopBar.tsx`, `DashboardPage.tsx:1031` | M |
| 5.2 | P1 | Dashboard list nested-scroll: drive overflow from CSS only (remove JSX `overflow-y-auto` <1280px). | `DashboardPage.tsx:889,1029`, `index.css:619-633` | S |
| 5.3 | P1 | Preview: pad scroll container to the action-bar height; make mobile primary a true one-tap Quick PDF (or relabel). | `PreviewPage.tsx:704,734,745,751` | S |
| 5.4 | P1 | Editor: standardize field heights (h-11); stop nav-rail auto-collapse; add `title=` to truncated entries; year-select typeahead. | `EducationSection.tsx`, `EditorNavRail.tsx:86-88`, `MonthYearPicker.tsx` | M |
| 5.5 | P2 | AI-Studio sticky composer `top` offset; letter-page FAB safe-area + de-dupe; hero `min(640px,88dvh)`; tailoring mobile job chip. | `AIStudioPage.tsx:489`, `CoverLettersPage.tsx`, `ResignationLettersPage.tsx`, `LandingHeroShell.tsx`, `TailoringHubPage.tsx:557` | M |

## Wave 6 — Token alignment & cleanup (Atlas)

| # | Sev | Fix | Files | Effort |
|---|-----|-----|-------|--------|
| 6.1 | P1 | WiseHire `brief/*` → semantic tokens (`bg-card`/`bg-primary`). | `wisehire/brief/*.tsx` | M |
| 6.2 | P1/P2 | Raise dark `--input` ≥ card; desaturate WiseHire dark bg. | `index.css:372,401` | S |
| 6.3 | P2 | Reconcile radius ladder to Atlas; expose `xl/2xl/3xl` in Tailwind; raise H1 floor to 2rem; light `--card`→white. | `colors_and_type.css`, `index.css`, `tailwind.config.ts` | M |
| 6.4 | P3 | Add Atlas layout tokens to `:root`. | `index.css` | S |
| 6.5 | P3 | Dead-code cleanup: `AICreditsRow.tsx`, `AIStudioTourModal.tsx`, duplicate import `SetupTab.tsx:2`, `WhatsNextCard`/`FeatureDiscoveryCard` if unused; decide `/tailor` redirect. | various | S–M |

---

## Owner decisions required before implementation
1. **Editor theme (Wave 1):** light-mode editor, or commit to an intentionally-dark editor (force `dark`)? Changes the fix.
2. **`/tailor` legacy route:** redirect to `/tailoring-hub`, or keep `TailorPage`? (Confirm no inbound deep-links depend on it.)
3. **WiseHire domain branding:** is `thewise.cloud` on Enterprise/brief/shell intentional product separation, or should everything present `wiseresume.app`?
4. **Mobile nav (Wave 5):** appetite for a new persistent bottom tab bar vs. keeping the FAB.

## Suggested PR slicing
- **PR-A (Wave 0):** scroll fix + dialog max-h + info token + tailoring clip. Small, high-value, low-risk.
- **PR-B (Wave 1):** editor theming (after owner decision).
- **PR-C (Wave 2):** correctness bugs (preview id-gate, upload dedupe, pricing CTA, guardrail, tip copy).
- **PR-D (Wave 3):** z-index system + overlay hardening.
- **PR-E (Wave 4):** accessibility.
- **PR-F (Waves 5-6):** responsive polish + token alignment + cleanup.
