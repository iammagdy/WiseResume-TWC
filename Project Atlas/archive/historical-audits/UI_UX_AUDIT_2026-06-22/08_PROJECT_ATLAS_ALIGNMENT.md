# 08 — Project Atlas Alignment

Source of truth: `Project Atlas/design-system/production/` (`DESIGN_TOKENS.md`, `MOBILE_RULES.md`, `COMPONENT_LIBRARY.md`, `colors_and_type.css`, `design.md`). Implementation: `src/index.css`, `tailwind.config.ts`, `src/components/**`. Per RULES.md, `production/` is the implementation source of truth; the visual-reference informs composition/hierarchy/premium quality.

## Alignment score: **74 / 100**

The core token architecture is genuinely well-aligned: the product-scoped `data-product` mapping (`--primary 357 71% 36%` crimson / `224 76% 48%` blue), the `0.75rem` base radius, the full semantic set (`success`/`warning`/`error`/`info`) with separate light/dark/app-shell values, the soft-shadow ladder, and the Inter type scale all match the spec; dual-brand separation is respected at the shell. It earns the Atlas "premium AI-native workspace" direction (aurora, glass, scoped premium surfaces) rather than reading as generic SaaS. Points are lost for **execution gaps** that undercut the system (below).

---

## Top concrete divergences

| Atlas spec | Implemented | Evidence | Sev |
|---|---|---|---|
| `info` is a usable semantic token | No `info` color in Tailwind → `bg-info`/`text-info` dead | `tailwind.config.ts:99-106` vs `badge.tsx:17` | P1 |
| Components consume semantic tokens (`primary`/`card`/`border`) | WiseHire `brief/*` hardcodes `bg-white`/`slate-900`/`blue-700` | `wisehire/brief/BriefForm.tsx:69,138` vs `DESIGN_TOKENS.md:217` | P1 |
| Editor uses brand crimson `357 71% 36%` | Editor `--editor-crimson 358 68% 42%` (+ dark-only chrome) | `editor-workspace.css:7` vs `index.css:142` | P0/P2 |
| Light `--color-card #FFFFFF` (border+shadow) | `--card 220 14% 96%` (#F3F4F6 gray) global | `index.css:157,224` vs `DESIGN_TOKENS.md:54` | P2 |
| `--radius-lg 16px`, `-xl 20px`, `-2xl 24px` | `12px / 16px / 20px` (one notch low); `xl/2xl/3xl` not exposed in Tailwind | `colors_and_type.css:79-81` vs `DESIGN_TOKENS.md:142-144`; `tailwind.config.ts:118-122` | P2 |
| `--font-h1 2rem` (fixed) | `clamp(1.75rem, 4vw, 2.25rem)` — floor 1.75rem (sub-spec at 375px) | `colors_and_type.css:60` vs `DESIGN_TOKENS.md:85` | P2 |
| Dark input on surface/card layer | App-dark `--input 240 9% 4%` below page bg `240 6% 5%` | `index.css:355-372` | P1 |
| Layout tokens (`--page-padding-*`, `--header-height`, `--sidebar-width`, `--bottom-nav-height`, `--container-*`) | Not defined as CSS vars; shell dims are literal per-component | `DESIGN_TOKENS.md:121-132` vs `index.css:138-403` | P3 |

---

## Detail

### [P1] `info` token missing from Tailwind
`--info` is defined for both themes (`index.css:184,307,347,381`) but `tailwind.config.ts:99-106` only maps `success`/`warning`, so `bg-info`/`text-info` (`badge.tsx:17`, `sonner.tsx:30`) compile to nothing. **Fix:** add the `info` color entry. (Also see 07.)

### [P1] WiseHire `brief/*` hardcodes generic palette
`bg-white dark:bg-slate-900`, `text-slate-900 dark:text-white`, `bg-blue-700` instead of `bg-card`/`bg-primary` — the exact "generic SaaS / don't hardcode product color" trap Atlas calls out (`DESIGN_TOKENS.md:217`, `COMPONENT_LIBRARY.md:576`). **Fix:** swap to semantic tokens (primary auto-resolves to WiseHire blue under `[data-product="wisehire"]`).

### [P2] Radius ladder one notch low + named radii not exposed
The app's own `colors_and_type.css:76-82` ladder sits a step below the Atlas table, and Tailwind only maps `lg/md/sm` off the base `--radius` (`tailwind.config.ts:118-122`), so components use literal `rounded-2xl` (Tailwind's 1rem) instead of the `--radius-2xl` token. **Fix:** reconcile to the Atlas ladder; expose `xl/2xl/3xl` in Tailwind.

### [P2] H1 sub-spec on small screens
`--h1` floors at 1.75rem (28px) vs Atlas fixed 2rem; H2/H3 match. **Fix:** raise the clamp floor to 2rem.

### [P2] Global light card is gray, not white
Blunts the intended "soft white card with border+shadow" hierarchy on landing/global light surfaces. **Fix:** white `--card` + border+shadow, or document the gray choice. (See 07.)

### [P3] Layout tokens documented in Atlas but never ported
`--page-padding-mobile 12px`, `--header-height 56px`, `--sidebar-width 260px`, `--bottom-nav-height 64px`, container widths exist in `DESIGN_TOKENS.md:121-132` but not in the implementation token layer (only `--tap-min: 44px` and the spacing scale are present). Drift risk as the app grows. **Fix:** add them to `:root` and reference in shell components.

---

## What aligns well (credit where due)
- Product-scoped primary + ring + sidebar tokens, including portal-safe `.light[data-product]`/`.dark[data-product]` overrides (`index.css:199-217`).
- Full semantic palette with distinct light / dark / `.app-theme` values (`index.css:174-402`).
- Inter type scale, `--tap-min: 44px`, spacing scale (`colors_and_type.css`).
- App-shell dark elevation ladder matches the Atlas surface model (#0C0C0E → #161618 → #1F1F23).
- Premium badge is subtle/elegant (amber gradient, `index.css:866-873`), not template-y — matches the "premium, not loud" direction.
- Dual-brand separation (WiseResume crimson vs WiseHire blue) is enforced at the shell via `data-product`.

## Verdict
WiseResume reads as the intended **premium AI-native workspace**, not a generic SaaS template — the token architecture, the dashboard workspace, and the editor's *intent* all align with Atlas. The 26-point gap is **execution debt, not design drift**: one theming bug (editor light mode, P0), one build-config omission (`info` token, P1), one cluster of hardcoded palette in WiseHire `brief/*` (P1), and a set of mid-tier numeric divergences (gray card, radius ladder, H1 floor, missing layout tokens). Closing the P0/P1 items would move alignment into the mid-80s.
