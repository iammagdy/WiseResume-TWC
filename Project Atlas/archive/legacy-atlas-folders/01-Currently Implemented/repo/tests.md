# `tests/`

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `tests/`.

**Canonical owner:** Repo-level integration / e2e / model-comparison test suites. Per-feature unit specs live under `src/**/__tests__/` and `supabase/functions/_shared/__tests__/`.

---

| Folder | Purpose |
|---|---|
| `tests/e2e/` | Playwright end-to-end suite. Output JSON written to `reports/e2e-results-*.json`; human report → `reports/e2e-wiseresume-report.md`. |
| `tests/model-comparison/` | Model A/B comparison harness for AI routing decisions. Files: `providers.ts` (provider clients), `runner.ts` (runner loop), `scenarios.ts` (test prompts). Outputs feed back into `Routing AI Providers/04-feature-routing-map.md`. |

## Hard rules
- Component / hook / context unit specs live next to source under `__tests__/` — only cross-cutting harnesses belong in `tests/`.
- E2E results in `reports/` are immutable snapshots; never overwrite an old run in place.
