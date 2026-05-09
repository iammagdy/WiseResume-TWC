# `Routing AI Providers/`

**Last verified:** 2026-05-09 (Task #10 — per-feature routing shipped)
**Type:** reference card
**Sources:** `Routing AI Providers/`.

**Canonical owner:** Original planning corpus for the AI routing rebuild (April 2026). **Implementation (Task #10, 2026-05-09) lives in `appwrite-hubs/ai-gateway/src/main.js` (`FEATURE_ROUTES` + `pickProvider()`).** DevKit visibility: `src/components/dev-kit/AIRoutingPanel.tsx` (panel id `ai-routing`).

---

10 planning docs + an Operations folder, all dated April 17, 2026.

| File | Topic |
|---|---|
| `README.md` | Status / ownership / "no code until reviewed" gate. |
| `01-current-state.md` | Inventory of what already existed in the codebase before the rebuild. |
| `02-target-architecture.md` | Target architecture description. |
| `03-providers-and-models.md` | Catalog of OpenRouter + Groq + DeepSeek + NVIDIA NIM models, free-tier limits (limits dated; re-verify before launch). |
| `04-feature-routing-map.md` | Per-feature primary + fallback model + streaming + cache + credit cost. **The policy.** `ai_routing_config` rows are a 1-to-1 translation of this map. |
| `05-implementation-plan.md` | Phased rollout — phases must run in order, never break existing features. |
| `06-streaming-design.md` | End-to-end streaming across 3 providers + edge fns + React. |
| `07-caching-design.md` | Cache key derivation, TTLs, invalidation, safety. |
| `08-admin-dashboard-spec.md` | DevKit AI Activity tab spec. |
| `09-decisions-log.md` | Locked policy decisions. Changes require a dated update with reason. |
| `10-risks-and-rollback.md` | Risk register + per-phase rollback plan. |
| `Operations and Guides/` | Subdir with operational runbooks. |

## Hard rules
- These are **planning docs**. The **implementation** truth is `_shared/aiClient.ts`, `_shared/modelRouter.ts`, `ai_routing_config`, and `creditLimits.json`. If a plan doc disagrees with the code, the code is authoritative — but `09-decisions-log.md` should be updated with the deviation + reason.
- Provider limits in `03-providers-and-models.md` are dated; re-verify before any launch decision.
