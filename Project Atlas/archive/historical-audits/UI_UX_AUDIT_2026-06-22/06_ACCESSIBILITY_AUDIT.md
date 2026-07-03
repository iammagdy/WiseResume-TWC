# 06 — Accessibility Audit

Scope: landing, dashboard, editor, tailoring, AI studio, portfolio, settings, auth, dialogs. Exact contrast ratios and live focus order are **UNKNOWN** (no browser run); each finding has a code root cause. A11y is its own track but still tagged P0-P3.

**Baseline (strong):** Radix gives focus-trap/Escape/`aria-modal`/restore-focus, and shared primitives are correct — `button.tsx`, `input.tsx`, `dialog.tsx`, `sheet.tsx` all carry `focus-visible` rings, `sr-only` close buttons, and 44px targets; `EditorHeader` labels icon buttons; `form-field.tsx` is a model (`aria-invalid` + `aria-describedby` + `role="alert"`). 424 `aria-label` occurrences across 214 files. The custom code breaks the baseline in three repeatable places, below.

---

## [P1] `AIQuestionsDialog` bypasses Radix — no role, no focus trap, no Escape, unassociated labels
Area: Editor AI
Page / component: `AIQuestionsDialog` (also `ProjectAIQuestionsDialog`)
User impact: A keyboard/SR user lands in a generic `<div>` (no `role="dialog"`/`aria-modal`), focus isn't trapped (Tab leaves to the page behind), Escape doesn't close (only outside-click), and question `<label>`s aren't tied to inputs.
Evidence: `editor/ai/AIQuestionsDialog.tsx:42-48` (overlay `<div onClick={onClose}>`, no role/aria/focus mgmt); `:72-80` (`<label>` no `htmlFor`, `<Input>` no `id`).
Root cause: Hand-rolled modal instead of Radix `Dialog`.
Recommended fix: Rebuild on `@/components/ui/dialog` (`DialogTitle` included); add `htmlFor`/`id` per question.
Risk: Low. Validation: keyboard → focus trapped, Esc closes, focus returns; SR announces a titled dialog.

## [P1] AI generation results are never announced to screen readers (no `aria-live`)
Area: AI Studio / Editor AI / Tailoring
Page / component: `AIActionBar`, all `ai-studio/*Sheet.tsx`
User impact: SR users hear nothing while the model runs and get no announcement when results render — async output appears silently.
Evidence: `editor/ai/AIActionBar.tsx:99-110` (spinner, no `aria-live`/`aria-busy`); `ai-studio/ColdEmailSheet.tsx:236-244` (results render in a plain `<div>`). Only a few surfaces use live regions (`ScoreRing.tsx:107`, `KeywordMatchBar.tsx:82`, `JobMatchProgressStage.tsx:180`, `UploadProgressSteps.tsx:33`).
Root cause: Loading/result containers are visual-only.
Recommended fix: Wrap loading+result in `role="status" aria-live="polite"`; set `aria-busy` while loading.
Risk: Low. Validation: SR announces busy on start, results on completion.

## [P1] AI Studio form labels not associated with inputs (no `htmlFor`/`id`)
Area: AI Studio
Page / component: `ColdEmailSheet`, `SalaryNegotiationSheet`, `ReferenceLetterSheet`, `SkillsGapSheet`, `PersonalBrandingSheet`, `JobRejectionSheet`
Evidence: `ai-studio/ColdEmailSheet.tsx:200-201`; 14 `<Label>` in `src/components/ai-studio`, **0** `htmlFor`. (The editor's `form-field.tsx` does this correctly.)
Recommended fix: add `htmlFor`/`id` pairs, or reuse `InputFormField` (`ui/form-field.tsx`).
Risk: Low. Validation: SR reads label on focus; clicking label focuses field.

## [P1] Public portfolio contact form — labels unassociated + focus indicator removed
Area: Portfolio (public — broadest audience)
Page / component: `PortfolioContactForm`
Evidence: `portfolio/public/PortfolioContactForm.tsx:228-291` — each `<label>` lacks `htmlFor`; inputs use `outline-none` + a JS `onFocus` border-color swap (no real focus ring).
Recommended fix: add `htmlFor`/`id`; add a `focus-visible` ring (or use shadcn `Input`/`Textarea`).
Risk: Low. Validation: keyboard tab shows a clear ring; SR binds labels.

## [P1] Public portfolio contact form — async send error not announced
Evidence: `PortfolioContactForm.tsx:297-302` (error `<div>`, no `aria-live`/`role="alert"`); `:160-177` (success, no live region). (`:320-324` correctly uses `role="status"` for the blocked reason.) Recommended fix: `role="alert"` on error, `role="status"`/focus on success. Risk: Low.

## [P2] Portfolio chat send button — no accessible name + sub-44px target
Evidence: `portfolio/public/ChatWidget.tsx:322-329` — `w-8 h-8` native `<button>` with only a `<Send>` icon, no `aria-label`. Recommended fix: `aria-label="Send message"` + `min-w-[44px] min-h-[44px]`. Risk: Low.

## [P2] AI Studio result-action buttons sized below 44px
Evidence: `ColdEmailSheet.tsx:185,189` (`h-7`), `:271` (`h-8`) — overrides defeat the Button's default `min-h-[44px]` (`ui/button.tsx:23,25`). Recommended fix: drop the `h-7`/`h-8` overrides. Risk: Low.

## [P2] Register / forgot / claim don't expose inline validation errors
Evidence: `AuthPage.tsx:121-161` (toast only), `:248-279` (no `aria-describedby`/error element); login is correct at `:183-214`. Recommended fix: persistent `role="alert"` per form. Risk: Low.

## [P2] `--lp-text-subtle` landing token likely below AA for body text
Evidence: `index-landing.css:33` (dark `rgba(240,240,245,0.32)`), `:68` (light `rgba(15,15,26,0.35)`); consumers `FeatureTicker.tsx:38,65`, `WaitlistModal.tsx:693`. Over the aurora-bled-through backgrounds (`index.css:36-40`) contrast is very likely sub-AA. Recommended fix: raise alpha (≥0.6 dark / ≥0.55 light) where used as readable text, or reserve subtle for decorative only. Risk: Low. Exact ratio **UNKNOWN**.

## [P2] Placeholder text relies on low-alpha muted-foreground
Evidence: `ui/input.tsx:14` (`placeholder:text-muted-foreground/60`); token `index.css:164,236,286,367`. Combined with ai-studio sheets that use placeholders *as* labels, readability suffers. Recommended fix: don't use placeholders as the only label; raise alpha. Risk: Low. Exact ratio **UNKNOWN**.

## [P3] Reduced-motion mostly respected; a few one-shot `matchMedia` reads
Evidence: `ProjectCard.tsx:44`, `CaseStudyCard.tsx:43`, `PortfolioEditorPage.tsx:221` use `useMemo(() => getSafeMatchMedia(...).matches, [])` (don't update live); the subscribing hook `usePrefersReducedMotion.ts` is correct. 60+ files gate motion + CSS `@media (prefers-reduced-motion)` blocks. Recommended fix: prefer `usePrefersReducedMotion()` everywhere. Risk: Low.

## [P3] AI result panels don't move focus / announce new content
Evidence: `ColdEmailSheet.tsx:244-279` (focus stays on Generate). Recommended fix: move focus to the result heading (or the P1 live region). Risk: Low.

## [P3] `BottomSheetContext` is a counter, not a focus manager (informational)
Evidence: `context/BottomSheetContext.tsx:1-49` is an open-count for scroll-lock; focus/Escape come from Radix. The only custom modal bypassing Radix is `AIQuestionsDialog` (P1). Keep new modals on Radix.

---

## Accessibility notes
A11y maturity is good and intentional — Radix + correct shared primitives give a strong baseline, the editor `form-field.tsx` is exemplary, and there's broad `aria-label` coverage and reduced-motion gating. The custom code breaks it in three repeatable spots: (1) the hand-rolled `AIQuestionsDialog`, (2) AI-generation surfaces with no `aria-live`, and (3) ai-studio + public-portfolio forms written without `htmlFor`/`id`. Contrast is the main UNKNOWN — the low-alpha `--lp-text-subtle` and `muted-foreground/60` placeholders are likely sub-AA but need browser measurement on the composited (aurora) backgrounds.

## Quick wins (cheapest high-impact)
- `role="alert"` on `PortfolioContactForm.tsx:297` (public-facing announcement gap) — one line.
- `aria-label="Send message"` + 44px on `ChatWidget.tsx:322`.
- `htmlFor`/`id` on the 14 ai-studio `<Label>`/`<Input>` pairs (start `ColdEmailSheet.tsx:200-205`).
- Wrap AI loading/result in `role="status" aria-live="polite"` (`AIActionBar.tsx:99`, `ColdEmailSheet.tsx:244`).
- Replace `outline-none` + border-only focus with a `focus-visible` ring on contact inputs (`PortfolioContactForm.tsx:238,261,283`).
- Drop `h-7`/`h-8` overrides in `ColdEmailSheet.tsx:185,189,271`.
- Raise `--lp-text-subtle` alpha (`index-landing.css:33,68`) where used as readable text.
- Add inline `role="alert"` errors to register/forgot/claim (`AuthPage.tsx`).
