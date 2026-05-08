# `reports/`

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `reports/`.

**Canonical owner:** Dated machine + human audit outputs.

---

| File / folder | Purpose |
|---|---|
| `audits/` | Sub-folder of older audit snapshots. |
| `auto-fit-template-audit.md` | Auto-fit template audit. |
| `e2e-results-2026-04-24T00-07-54-431Z.json` | Raw e2e Playwright run output. |
| `e2e-wiseresume-report.md` | Human-readable e2e summary. |
| `edge-fn-full-audit-2026-05-03.md` | Full edge-function audit snapshot. |
| `edge-fn-redeploy-2026-05-03.md` | Redeploy verification report. |
| `one-page-wizard-analysis.md` | One-page wizard analysis. |

The monthly drift driver (`scripts/edge-fn-monthly-reaudit.mjs`) writes new `edge-fn-drift-<YYYY-MM-DD>.md` reports here.

## Hard rules
- Reports are **dated, immutable** snapshots. To produce a new view, write a new dated file.
- Never edit a historical report in place.
