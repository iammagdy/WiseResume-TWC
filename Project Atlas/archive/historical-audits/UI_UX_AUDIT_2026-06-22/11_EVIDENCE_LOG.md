# 11 — Evidence Log

## Method
- **Type:** Read-only, evidence-based code audit. **No code was changed. No dev server or browser session was run.**
- **Approach:** Lead agent established ground truth (design system, route map, global CSS, landing architecture) and gathered build evidence; then 8 parallel read-only sub-audits covered the surface clusters; the lead independently verified the headline (Lenis) and the one contradicting (SetupTab) claim, then synthesized these 12 reports.
- **Honesty rule applied:** every "appears/feels/traps" claim a browser would be needed to confirm is marked **UNKNOWN** in the detail files, with a concrete code-level root cause given.

## Environment
- Repo: `iammagdy/WiseResume-TWC`; branch `main`; HEAD `d28681009467097266edb8d807d270024ba4ed54` (== `origin/main`, synced).
- Stack: React + TypeScript + Vite + Tailwind + shadcn/Radix + Framer Motion + Lenis. Node/npm per local toolchain.
- Working dir: `Y:\WiseResume-TWC` (network/slow drive — broad ripgrep globs timed out; used `ls`, scoped Grep, and Read instead).

## Commands run (read-only / evidence)
| Command | Result |
|---|---|
| `git fetch / status -sb / log` | branch `main`, synced with origin/main; untracked scratch/audit files only (e2e JSONs, audit folders, scratch `.md`). |
| `npx tsc --noEmit` | **PASS — exit 0** (clean typecheck). |
| `npm run build` | **PASS — exit 0**, "✓ built in 1m 44s"; `[check-no-sourcemaps] OK`. Warnings: chunks >500kB (`ocr` 1.02MB, `doc-export` 1.47MB, `DevToolsPage` 504kB, `monitoring` 463kB, `charts` 431kB) — perf/code-split advisory, not a UI defect. |
| `npm run lint` | **492 errors / 296 warnings**, all in `tests/`, `vite.config.ts`, `scripts/` (`no-require-imports`, `no-explicit-any`, `prefer-const`). **Pre-existing noise, not UI source.** |
| `npx playwright test --list` | **151 tests in 27 files**, incl. `25/26/27-antigravity-*.spec.ts` UI flows. |
| Grep `lenis|scroll-behavior` (src) | Confirmed Lenis JS import only (`ScrollStack.tsx`); `scroll-behavior:smooth` global (`index.css:414`); `scroll-behavior:auto !important` is **reduced-motion-only** (`index.css:2216`). |
| Grep `lenis` (main.tsx) | **No match** — Lenis stylesheet never imported (headline root cause confirmed). |
| Read `SetupTab.tsx:1-14` | Duplicate `getPortfolioDisplayUrl` import (lines 2 & 10) **confirmed present**, but does NOT break build/tsc (both exit 0) → corrected agent's "fails CI" claim, downgraded to P3. |

## Files read directly by the lead
`AppInterior.tsx`; `Index.tsx`; `index.css` (token blocks + targeted sections); `index-landing.css`; `ScrollStack.tsx`/`.css`; `Aurora.css`; `LightRays.css`; `AuroraLayer.tsx`; `SpaceBackground.tsx`; `SetupTab.tsx`; `RULES.md`; design-system file listing; plus the latest deployment report (freshness gate, prior turn).

## Sub-audit coverage (8 parallel read-only agents)
1. Landing + public marketing + scroll-bug deep dive.
2. App shell + dashboard + nav + command palette.
3. Editor + upload + preview/export.
4. Tailoring Hub + AI Studio + letters.
5. Portfolio (public+editor) + Settings + Auth + Pricing + Onboarding.
6. Dialogs/overlays (shadcn/Radix) + repo-wide risky-pattern scan.
7. Accessibility across major surfaces.
8. Dark/light correctness + Project Atlas alignment.

Each returned findings in the required format with `file:line` evidence and a risky-pattern table. Total sub-agent usage ≈ 1.13M tokens across 260 tool calls.

## Key positive findings (verified, for balance)
- `tsc` clean; build succeeds.
- **No fabricated user metrics** on the dashboard; all numbers computed from real data (`dashboardMetricsUtils.ts`, `dashboardIntelligenceUtils.ts`). The only fabricated numbers are unsourced **tip-copy** percentages (P1).
- **No upgrade prompts shown to premium users on the dashboard** (gated to free/unresolved plans). *(Exception: the `/pricing` page CTA — P1.)*
- **Portfolio domain branding is clean** — `wiseresume.app` is canonical (`portfolioUrl.ts`); `resume.thewise.cloud` is a backward-compat fallback only.
- **Radix overlay baseline healthy** — themed portal tokens (no color leakage), 44px close targets, correct bottom-sheet body, reduced-motion broadly gated, ~424 `aria-label` usages.
- `body{overflow-x:hidden}` + near-universal `dvh` prevent page-level horizontal scroll.

## Limitations / what remains UNKNOWN
- No live rendering: exact contrast ratios, real device scroll feel, actual modal-trap behavior, and light-mode editor appearance are unconfirmed (root causes given).
- WiseHire recruiter product audited only at the token/branding/route level (deep UX out of primary scope).
- One agent severity reclassified by the lead: upload "always creates new resume" P0→P1; one agent claim corrected: SetupTab duplicate import "breaks CI" → does not (P3).

## Deliverables
12 markdown files in `Project Atlas/UI_UX_AUDIT_2026-06-22/` (00–11). No source files modified. No commit, push, deploy, or env change performed.

## Atlas compliance
Audit-only, markdown reports only — consistent with the task's "create markdown reports only; do not apply fixes yet." Per `RULES.md`, no backend/auth/API/state/business-logic was touched; shadcn/Radix architecture preserved; untracked scratch files left intact. A `CHANGELOG.md` entry should be added if/when the owner accepts this audit as a recorded artifact (not done automatically — no code change to record).
