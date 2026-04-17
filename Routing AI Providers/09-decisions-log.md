# 09 — Decisions Log

> **Purpose:** Lock the policy decisions made during the planning chat in writing. If anything below ever changes, it's a deliberate update to this file with a date and reason — not a silent code change.

---

## Decision date

April 17, 2026.

---

## D1 — Provider set

**Decision:** WiseResume's managed AI runs on **three providers**: OpenRouter, Groq, Google Gemini.

**Rationale:** Three providers gives capacity headroom (~3× single-provider free tier), real fallback (any one can be fully down), and per-feature optimization (each shines at different workloads).

---

## D2 — No multi-account / key-rotation tactics

**Decision:** **Exactly one managed key per provider per environment.** No rotation across multiple Gmail accounts or multiple keys to bypass free-tier limits.

**Rationale:** Violates each provider's TOS, triggers automated abuse detection, risks termination of all accounts (including the operator's primary Gmail), and provides worse reliability than a single proper fallback chain. Documented in detail in the planning chat — this is non-negotiable for the v1 launch.

**Consequence:** if free-tier capacity is ever insufficient for the user base, the path is to enable billing on one provider, not to add more keys.

---

## D3 — Paid tier posture for v1

**Decision:** **Run entirely on free tiers for v1 launch.** Enable billing on at least one provider once paying users exist.

**Rationale:** Operator confirmed: "I do not use any paid models for now... this stage as free models will be free until I gain certain number of users and after that of course I will pay for the API keys."

**Operational follow-up:** When billing is enabled, only `03-providers-and-models.md` (limit numbers) and the dashboard's declared-limits config need updating. No feature code changes.

---

## D4 — App language scope

**Decision:** **English only** for UI and AI outputs in v1.

**Rationale:** Operator confirmed. Lets us drop multilingual model considerations (e.g. Qwen) from the v1 routing.

**Consequence:** if Arabic / other languages are added later, revisit `03-providers-and-models.md` for multilingual model picks.

---

## D5 — OpenRouter premium models posture

**Decision:** Operator wants the app to feel **professional**. OpenRouter's catalog of premium models (Claude, GPT-4) is **available** in the routing config but only used as **fallback** for premium-quality features (`recruiter_sim`, `cover_letter.generate`'s `:free` paths first; premium models only when the operator opts in by enabling OpenRouter credits).

**Rationale:** Operator: "I want the user to know we work by professional models." But also: free tier only for v1. The compromise: route through `:free` premium-flavored models (DeepSeek R1, DeepSeek Chat v3.1) which are widely regarded as production-quality, and unlock paid Claude/GPT-4 via OpenRouter as a billing toggle later.

---

## D6 — Privacy posture on the Gemini free tier

**Decision:** **Acceptable for v1.** Operator explicitly confirmed: "Yes it is ok with that."

**Rationale:** Gemini free tier may use prompts/outputs to improve Google's models. Resume content includes PII. Operator has accepted the trade-off for the launch window with an understanding that enabling billing later flips this off.

**Mitigation included in v1:** the friendly "AI may use your data to improve our service" disclosure already appears in the app's privacy policy (out of scope to re-verify here, but flagged for confirmation).

**Operational follow-up:** when billing is enabled on Gemini, this section is revisited with a note "training opt-out is now active per Google's billing-tier policy."

---

## D7 — Streaming

**Decision:** **Streaming is required** for chat-like and long-generation features.

**Rationale:** Operator: "Yes of course the text should stream in, this is better for user experience."

**Scope:** the features marked `streaming: true` in `04-feature-routing-map.md`. Implementation in `06-streaming-design.md`.

---

## D8 — Caching

**Decision:** **Add a cache layer** in Supabase for deterministic AI calls (parsing, embeddings, classification on stable inputs). Generative/personalized features are never cached.

**Rationale:** Operator: "Yes please add it to Supabase as you mentioned." Detailed rules in `07-caching-design.md`.

---

## D9 — Logging granularity & accuracy

**Decision:** Log token-level activity (prompt_tokens, completion_tokens, latency, provider_used, model_used, fallback_depth, cache_hit, error_type) per AI call to `ai_usage_logs`. Surface in the admin dashboard with **100% accuracy and no hallucinated/projected values**.

**Rationale:** Operator: "this is exactly what I have been thinking about... it should be 100% accurate with no Hallucinations or assumptions."

**Mechanism:** every dashboard number derives from raw `count(*) / sum(...) / avg(...)` over `ai_usage_logs`. No model-side estimates. Pre-migration rows (without the new columns populated) are explicitly excluded from rates with a footnote, never silently zero-filled. Specified in `08-admin-dashboard-spec.md`.

---

## D10 — Friendly error UX on chain exhaustion

**Decision:** When all providers fail, show: **"Our AI is busy right now. Please try again in a few minutes."** with a retry button.

**Rationale:** Operator: "It should be friendly msg as you mentioned something like 'we have a lot of traffic right now, try again after 30 minutes' or something like that."

**Implementation:** edge function returns 503 with `code: 'ai.all_providers_unavailable'` and `retry_after_seconds: 1800`. Front-end maps the code to the toast. Phase 7 in the plan.

---

## D11 — Per-user quota readiness

**Decision:** Per-user `ai_credits` quota stays as-is for v1. Plan to revisit when "we're ready for that" (operator's words). No expansion in this project.

**Rationale:** existing `ai_credits` table + `checkAndDeductCredit` already covers per-user enforcement. No need to over-engineer before there are real users.

---

## D12 — Provider limits surfaced in admin dashboard

**Decision:** Free-tier limits per provider/model are mirrored as constants in `aiRouting.ts` (single source = the doc `03-providers-and-models.md`) and the dashboard renders gauges showing "today's usage vs limit" for each provider.

**Rationale:** Operator: "Yes copy provider limits and add it to the admin dashboard and it must be 100% accurate."

**Accuracy mechanism:** the constants are dated in `03-providers-and-models.md`. When provider limits change, both files are updated together (it's a single PR).

---

## D13 — Token-activity charts in admin dashboard

**Decision:** Dashboard shows per-key / per-provider / per-feature token consumption charts, similar in spirit to OpenRouter's own dashboard.

**Rationale:** Operator: "we need to add activity API calls charts like which key has been used and how many tokens, like openrouter's dashboard."

**Implementation:** specified in `08-admin-dashboard-spec.md` (sections 1–6 cover this).

**Note on "which key has been used":** for v1 we have one managed key per provider, so this collapses to "which provider was used." If/when multiple keys per provider are added (e.g. different Gemini keys for different environments), the schema already has room (`ai_usage_logs.metadata` jsonb can carry `key_id`).

---

## D14 — Documentation living source of truth

**Decision:** This `Routing AI Providers/` folder is the canonical plan. Code is written only after the folder is reviewed and approved.

**Rationale:** Operator: "we should plan carefully for this implementation before the coding so we should make the proper documentation and step by step for every step on the app to avoid any issues or mistakes."

**Maintenance rule:** any deviation during implementation gets recorded back into this folder (in `10-risks-and-rollback.md` or as an amendment to the relevant doc) with a date.

---

## Decisions explicitly *deferred* to later

These came up but are intentionally not decided in this plan:

- **D-future-1:** Number of users at which to enable billing on Gemini. Will revisit when daily active users approach 50.
- **D-future-2:** Whether to add Anthropic / OpenAI as managed providers (today they're BYOK only). Likely yes once billing is enabled somewhere.
- **D-future-3:** Embeddings-based features (semantic search, dedup). The catalog includes `text-embedding-004` but no v1 feature consumes it.
- **D-future-4:** Multi-key-per-provider (e.g. dev/prod separation, A/B testing). Schema is forward-compatible.
