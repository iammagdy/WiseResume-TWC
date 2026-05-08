# `ai_routing_config`

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/migrations/20260511000001_ai_routing_config.sql`, `supabase/functions/_shared/modelRouter.ts`, `replit.md`.

**Canonical owner:** Model router + DevKit AI Routing tab.

---

Per-feature model routing + A/B split configuration. The flat-pool AI client reads this row keyed on the `featureName` passed in `AICallOptions`; falls back to platform-wide defaults if no row matches.

## Columns

| Column | Type | Notes |
|---|---|---|
| `feature_name` | text PK | Feature key (e.g. `editor-ai`, `tailor-resume`, `agentic-chat`). |
| `provider` | text default `auto` | Primary provider; `auto` = flat-pool random. |
| `model` | text default `''` | Primary model id. |
| `ab_secondary_provider` | text | A/B variant provider. |
| `ab_secondary_model` | text default `''` | A/B variant model. |
| `ab_split_pct` | int 0–100 default 0 | % of traffic routed to secondary. |
| `updated_by` | text | Admin email from DevKit. |
| `updated_at` | timestamptz default now() | |

## Active rows (`replit.md`)
`editor-ai`, `resume-section-ai`, `tailor-resume`, `smart-fit-rewrite`, `agentic-chat`, `parse-job` (+ platform-wide rows).
Legacy rows (`analyze-resume`, `recruiter-simulation`, `suggest-template`, `optimize-for-linkedin`) removed by migration `20260603000000`.

## Hard rules
- Always pass `featureName` on `AICallOptions`. Do not call `resolveFeatureRoute()` directly — it is deprecated.
- Edited only via DevKit AI Routing tab (`admin-ai-routing` edge fn through Express bridge).
