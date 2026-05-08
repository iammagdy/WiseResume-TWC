# editor-ai

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/functions/editor-ai/index.ts`, plus per-action handlers `analyze.ts`, `recruiterSim.ts`, `suggestTemplate.ts`, `optimizeLinkedIn.ts`

---

## What it does

Consolidated router for the 4 Editor AI functions. Replaces (4 → 1):

| Action | Was | Purpose |
|---|---|---|
| `analyze` | `analyze-resume` | ATS / score / gap analysis for a single resume |
| `recruiter-sim` | `recruiter-simulation` | Simulated recruiter feedback (hireability score, red flags, questions, call-me factors) |
| `suggest-template` | `suggest-template` | Recommends template + customization (accent color, fonts, spacing) |
| `optimize-for-linkedin` | `optimize-for-linkedin` | LinkedIn headlines, About sections (short/medium/long), experience rewrites, suggested skills |

All 4 sub-handlers use `featureName: 'editor-ai'` so a single `ai_routing_config` row controls provider routing for all actions.

**Auth:** `requireAuth` at the router boundary BEFORE body parse.

**Kill switch:** `isKillSwitchActive('editor-ai')` covers all 4 actions; returns 503 when active.

## Dispatch

- **Primary:** `x-editor-ai-action` header (recommended — avoids `body.action` collision with sub-handler internals)
- **Fallback:** top-level `body.action`

## Smoke-test bypass

Recognized BEFORE `requireAuth` so the DevKit HMAC token in `Authorization: Bearer` is consumed by admin auth, not mis-validated as a Supabase JWT. Returns action-specific synthetic responses (e.g. analyze → `{ score: { overallScore: 80, ... } }`).

## Per-handler invariants

Per-action rate-limit, credit-deduct, and refund-on-AI-error stay INSIDE each handler so billing semantics are preserved per-action.

## Rollback

Setting `USE_MERGED_EDITOR_AI = false` in `src/lib/edgeFunctions.ts` restores direct calls to the original 4 functions (still deployed).
