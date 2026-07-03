# 07 — Dark / Light Mode Audit

Exact contrast ratios and live rendering are **UNKNOWN** (no browser run); each finding is traced to a code-level root cause. Token system lives in `src/index.css:138-403` (`:root`/`.light`/`.dark` + `.app-theme` overrides) and `tailwind.config.ts`.

---

## [P0] Resume editor is hardcoded dark and breaks in light mode
*(Same defect as 03/08 — listed here for the theme track; corroborated by two agents.)*
Area: Dark/Light correctness
Page / component: `EditorPage` / `editor-workspace.css` (header, nav rail, chips, suggestion panels)
User impact: In **light mode** the editor shell stays dark with white-alpha text (`hsl(0 0% 100% / 0.55-0.95)`, `hsl(0 0% 96%)`) that becomes invisible the moment it lands on a light surface, while the scroll area follows the light theme — the primary working surface looks broken and clashes with the rest of the light app.
Evidence: `editor-workspace.css:7-12` (dark-only tokens, no `.light` override), `:96-97` (rail `hsl(358 42% 14%)` + near-white text), `:125-257` (white-alpha throughout); `EditorPage.tsx:1197` (no forced `dark`); `index.css:663-667` patch only sets `background`.
Root cause: Single-theme dark editor mounted in a themeable shell; no light token set.
Recommended fix: Add `.light .editor-workspace-root { --editor-surface*/border/muted-fg ... }` (or map onto `--card`/`--muted`/`--border`) and swap white-alpha text → `hsl(var(--foreground)/x)`; or force `dark` on `editor-workspace-root` if a dark editor is intentional.
Risk: Medium. Validation: `/editor` in light → legible, non-dark chrome.

## [P1] `info` semantic token never reaches Tailwind → Info badges/toasts render unstyled
Area: Atlas + Dark/Light
Page / component: `Badge variant="info"`, Sonner info icon
User impact: An Info badge has no background and inherited text color (intended `bg-info/10 text-info` produces nothing) — illegible as a status.
Evidence: `ui/badge.tsx:17` (`bg-info/10 text-info`), `ui/sonner.tsx:30` (`text-info`); `tailwind.config.ts:99-106` maps only `success`/`warning` — **no `info`** key. `--info` exists in CSS (`index.css:184,307,347,381`) but is never exposed, so `bg-info`/`text-info` are dead classes.
Root cause: CSS var defined, Tailwind color entry missing.
Recommended fix: Add `info: { DEFAULT: "hsl(var(--info))", foreground: "hsl(var(--info-foreground))" }` to `tailwind.config.ts` colors (and optionally `error`).
Risk: Low. Validation: an Info badge shows a tinted background + colored text.

## [P1] App-shell dark `--input` is darker than the page (void/invisible-border risk)
Area: Dark/Light
Page / component: all `.app-theme` inputs in dark mode
Evidence: `index.css:352-372` — `.dark .app-theme { --background: 240 6% 5%; --card: 240 3% 9%; --input: 240 9% 4%; --border: 240 7% 18% }`. Input (4% L) is darker than background (5%) and card (9%); with a thin border the field can read as a near-black void.
Root cause: A "sunken input" choice inverts the usual dark-UI elevation (inputs ≥ container).
Recommended fix: Raise dark `--input` to ≥ card (`240 4% 12-13%`) or ensure a clearly lighter `--border`.
Risk: Low. Validation: dark input fill is distinguishable from page + its own border.

## [P1] WiseHire `brief/*` components hardcode `slate-900`/`blue-700` instead of tokens
Area: Atlas (product-token leakage / "generic SaaS")
Page / component: `BriefForm`, `BriefOutput`, `BriefSkeleton`
Evidence: `wisehire/brief/BriefForm.tsx:69` (`bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800`), `:138` (`bg-blue-700`); `BriefOutput.tsx:40,68,72`, `BriefSkeleton.tsx:3`. Atlas forbids this (`DESIGN_TOKENS.md:217`, `COMPONENT_LIBRARY.md:576`). 55 hardcoded `text-white`/`bg-white`/`bg-black` occurrences exist across `dashboard`/`wisehire`/`layout`; `brief/*` is the densest cluster.
Root cause: Literal Tailwind palette instead of semantic tokens already wired three files away.
Recommended fix: `bg-card text-card-foreground border-border` + `bg-primary text-primary-foreground` (primary auto-resolves to WiseHire blue via `[data-product="wisehire"]`).
Risk: Low-medium. Validation: theme/product switch reaches these surfaces.

## [P1] WiseHire dark page background is over-saturated near-black navy
Area: Dark/Light + Atlas
Evidence: `index.css:399-402` — `.dark[data-product="wisehire"] { --background: 224 73% 6% }` (#060912), while cards are neutral `240 3% 9%`. Page reads as deep navy with slightly-warmer-gray cards floating on it; brand blue (`224 76% 48%`) on `#060912` is low-luminance-on-low-luminance for large fills. Diverges from the Atlas neutral dark `#0C0C0E`.
Recommended fix: desaturate toward `224 30% 7-8%` (harmonize with neutral cards) or tint cards blue; verify primary-blue fills meet AA. Risk: Low.

## [P2] Editor uses a one-off `--editor-crimson` diverging from brand primary
Evidence: `editor-workspace.css:7` (`358 68% 42%`) vs primary `index.css:142` (`357 71% 36%`). Recommended fix: derive from `hsl(var(--primary)/α)`; delete `--editor-crimson`. Risk: Low.

## [P2] Light `--card` is gray (#F3F4F6), not white — contradicts Atlas
Evidence: `index.css:157,224` (`220 14% 96%`) on white `--background`; Atlas `DESIGN_TOKENS.md:54` = `#FFFFFF` with border+shadow separation (`COMPONENT_LIBRARY.md:154`). (The `.app-theme` light deliberately inverts this and is internally consistent; the *global/landing* `:root` card is the divergence.) Recommended fix: set light `--card` to white and lean on border+shadow, or document the gray choice. Risk: Low-medium.

## [P3] Warning badge is amber-on-amber-tint (marginal on dark cards)
Evidence: `ui/badge.tsx:16` (`bg-warning/10 text-warning`); tokens `index.css:301-302,343-344,378`. On dark cards, bright amber text on a 10%-amber tint is low-contrast. Recommended fix: bump dark tint opacity or lighten `text-warning` in dark. Risk: Low. Exact ratio **UNKNOWN**.

## [P3] Scrollbar styling & popover backgrounds — healthy (positive note)
Evidence: `::-webkit-scrollbar*` (`index.css:2190-2206`) uses themed `--muted`/`--muted-foreground`; all overlays use `bg-popover` (themed) → **no portal color leakage** in either theme.

---

## Dark/Light verdict
Dark mode is the better-developed theme and largely coherent (proper elevation ladder #0C0C0E → #161618 → #1F1F23, theme-aware scrollbars, popover-on-elevated), with two real concerns: the sunken `--input` that can read as a void, and the over-saturated WiseHire navy bg. **Light mode is where it breaks:** the entire resume editor is hardcoded dark with white-alpha text and never overridden for `.light` (P0), plus pockets of `bg-white dark:bg-slate-900` (WiseHire brief) and the dead `info` token degrade both themes. Net: **dark is shippable with tuning; light has a P0 blocker in the editor** that must be fixed before the light theme can be called correct. All exact contrast ratios are UNKNOWN (no browser).
