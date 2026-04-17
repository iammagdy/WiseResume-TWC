# 03 — Edge-Function Migration Checklist

> **Audience:** Engineer or AI agent. This is the most technical doc in the folder.
>
> **Purpose:** A precise, function-by-function checklist for converting each of the 30 existing AI edge functions from the legacy `callAI()` API to the new `callAIForFeature()` API introduced in `../05-implementation-plan.md` Phase 4.
>
> **Pre-requisite:** Phases 0–3 of `../05-implementation-plan.md` are complete (`aiRouting.ts` exists, schema is migrated, `aiClient.ts` knows how to route managed Gemini). Don't start migrating individual functions before then.
>
> **Cardinal rule:** Migrate **one function at a time**. Deploy, smoke-test (doc 04), confirm dashboard shows expected provider in `provider_used`, then move to the next. Never batch.

---

## The before/after template

Every migration follows the same structural change. Internal logic of each function (prompts, parsing, response shaping, error handling specific to the feature) is **not** touched.

### Before

```ts
// supabase/functions/<fn-name>/index.ts (current)
import { callAI } from "../_shared/aiClient.ts";

const aiResponse = await callAI({
  messages: [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user",   content: userText },
  ],
  model: "deepseek/deepseek-chat-v3.1:free", // hardcoded
  userId,
  responseFormat: "json_object",
  maxTokens: 2000,
  temperature: 0.3,
});
```

### After

```ts
// supabase/functions/<fn-name>/index.ts (post-migration)
import { callAIForFeature } from "../_shared/aiClient.ts";

const aiResponse = await callAIForFeature({
  featureKey: "<exact-key-from-04-feature-routing-map>",
  messages: [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user",   content: userText },
  ],
  userId,
  responseFormat: "json_object",
  maxTokens: 2000,
  temperature: 0.3,
  // model, provider chain, streaming, caching, cost — ALL come from FEATURE_ROUTES
});
```

### What changes

| Field | Before | After |
|---|---|---|
| Function called | `callAI(...)` | `callAIForFeature(...)` |
| `model` | hardcoded string | **removed** — comes from routing config |
| `featureKey` | not present | **added** — exact key from `04-feature-routing-map.md` |
| `messages`, `userId`, `responseFormat`, `maxTokens`, `temperature` | unchanged | unchanged |

### What does NOT change

- Auth (`requireAuth`), CORS, payload-size guards, request validation, response shaping, downstream DB writes (`ai_usage_logs.metadata`, `usage_events`), error responses to the client.
- The `creditUtils.checkAndDeductCredit(userId, cost)` call. Cost still comes from a constant in the function — but **must match** the `creditCost` declared in `FEATURE_ROUTES` for that feature key. The Phase 1 validator checks this at boot.

---

## Per-function checklist (a single migration is "done" only when ALL ticked)

Use this as the PR checklist for every individual migration.

- [ ] **A.** Identified the **exact feature key** from `../04-feature-routing-map.md`. Copied verbatim — no typos.
- [ ] **B.** Replaced `callAI` import with `callAIForFeature`.
- [ ] **C.** Removed every hardcoded `model:` argument from the call.
- [ ] **D.** Added `featureKey:` argument with the exact key from step A.
- [ ] **E.** Verified `creditCost` constant in the function matches the `creditCost` for this feature in `../04-feature-routing-map.md`. If different, **stop** — escalate to update the policy doc first; do not silently change either side.
- [ ] **F.** **Streaming-aware features only:** updated the response handler to deal with the streaming case if `streaming: true` for this feature in `../04-feature-routing-map.md`. See `../06-streaming-design.md` for the SSE wire format. If streaming is `false`, no change.
- [ ] **G.** **Cacheable features only:** ensured the function does not include user-PII in any value listed in `cache.keyParts` for this feature, unless the feature's cache scope is `per-user` or `per-tenant`. See `../07-caching-design.md` Cache Scope Rules.
- [ ] **H.** Smoke-tested locally per the matching feature in doc 04 (Test Plan). Verified `provider_used` in `ai_usage_logs` matches the expected primary for this feature.
- [ ] **I.** Forced a primary failure (mock the primary provider as 503) and re-tested. Verified `fallback_depth = 1` and `provider_used` is the first fallback.
- [ ] **J.** Deployed to staging. Verified the dashboard's **Provider mix** chart shows traffic on the expected provider within 60 s of the first call.
- [ ] **K.** Deployed to production. Same dashboard verification within 5 minutes.
- [ ] **L.** **Rollback line ready** in the PR description: "to revert this migration, restore the prior `callAI(...)` call with model `<original-hardcoded-slug>`."

---

## The 30 functions, with their feature keys (copied from `../04-feature-routing-map.md`)

The table below is the **migration order** recommended by `../05-implementation-plan.md` Phase 4. Order is by risk: lowest-risk (most-used, simplest contract) first; highest-risk (BYOK-sensitive or streaming-required) last.

> **Important convention:** every "Edge fn" name below maps 1:1 to a directory under `supabase/functions/`. The file inside is always `index.ts`.

### Wave 1 — parsing and analysis (no streaming, low risk)

| Order | Edge function | Feature key | Streaming? | Cacheable? | Notes |
|---|---|---|---|---|---|
| 1 | `parse-resume` | `resume.parse` | No | Yes (24 h, by file SHA) | Highest-volume; great signal in dashboard. |
| 2 | `parse-linkedin` | `linkedin.parse` | No | Yes (24 h) | |
| 3 | `parse-job-text` | `job.parse_text` | No | Yes (7 d) | |
| 4 | `parse-job-url` | `job.parse_url` | No | Yes (7 d) | **Cross-user** scope (URL is public — see `../07-caching-design.md` line 30). |
| 5 | `analyze-resume` | `resume.analyze` | No | No | |
| 6 | `one-page-optimizer` | `resume.one_page_optimize` | No | No | |
| 7 | `recruiter-simulation` | `resume.recruiter_sim` | No | No | Cost 2. |
| 8 | `suggest-template` | `resume.suggest_template` | No | Yes (24 h) | Lightweight. |

### Wave 2 — generation (mixed streaming, low-medium risk)

| Order | Edge function | Feature key | Streaming? | Cacheable? | Notes |
|---|---|---|---|---|---|
| 9 | `generate-resignation-letter` | `resignation_letter.generate` | Yes | No | First streaming function — good test of SSE pipeline. |
| 10 | `generate-portfolio-bio` | `portfolio.generate_bio` | Yes | No | |
| 11 | `optimize-for-linkedin` | `linkedin.optimize` | Yes | No | |
| 12 | `fill-gap` | `resume.fill_gap` | Yes | No | |
| 13 | `explain-gap` | `resume.explain_gap` | Yes | No | |
| 14 | `generate-cover-letter` | `cover_letter.generate` | Yes | No | Cost 2. Premium quality (Gemini Pro primary). |

### Wave 3 — section enhancement (streaming-heavy)

The `enhance-section` function is special: it has **multiple action paths** (bullet, shorten, metrics, fix_error). Each path becomes a separate `callAIForFeature` call with a different feature key.

| Order | Edge function | Feature key | Streaming? | Cacheable? | Notes |
|---|---|---|---|---|---|
| 15a | `enhance-section` (bullet path) | `bullet.rewrite` | Yes | No | One function, four routes — branch internally on `action`. |
| 15b | `enhance-section` (full section) | `section.enhance` | Yes | No | Same. |
| 15c | `enhance-section` (shorten action) | `section.shorten` | Yes | No | |
| 15d | `enhance-section` (metrics action) | `section.add_metrics` | Yes | No | |
| 15e | `enhance-section` (fix_error action) | `section.fix_error` | No | No | |
| 16 | `tailor-section` | `resume.tailor_section` | Yes | No | |
| 17 | `tailor-resume` | `resume.tailor` | Yes | No | Cost 2. Long context. |
| 18 | `detect-and-humanize` | `resume.detect_humanize` | Yes | No | |

### Wave 4 — chat and interview (streaming, multi-turn)

| Order | Edge function | Feature key | Streaming? | Cacheable? | Notes |
|---|---|---|---|---|---|
| 19 | `wise-ai-chat` | `chat.wise_ai` | Yes | No | |
| 20 | `agentic-chat` | `chat.agentic` | Yes | No | |
| 21 | `interview-chat` | `interview.chat_turn` | Yes | No | |
| 22 | `generate-question-bank` | `interview.question_bank` | No | Yes (24 h, by JD hash) | |
| 23 | `company-briefing` | `interview.company_briefing` | No | Yes (7 d, by company name) | Cross-user cacheable (company name is public). |
| 24 | `career-assessment` | `career.assessment` | No | No | |
| 25 | `career-path-advisor` | `career.path_advisor` | Yes | No | Cost 2. |

### Wave 5 — WiseHire (recruiter suite)

| Order | Edge function | Feature key | Streaming? | Cacheable? | Notes |
|---|---|---|---|---|---|
| 26 | `wisehire-write-jd` | `wisehire.write_jd` | Yes | No | |
| 27 | `wisehire-generate-brief` | `wisehire.generate_brief` | No | No | |
| 28 | `wisehire-bulk-screen` | `wisehire.bulk_screen` | No | Yes (24 h, per-CV hash) | Tenant-scoped cache (decision in `../07-caching-design.md`). |
| 29 | `wisehire-mask-cvs` | `wisehire.mask_cvs` | No | Yes (forever, per-CV hash) | Tenant-scoped. Anonymization is deterministic. |

### Wave 6 — explicitly skipped

| Order | Edge function | Feature key | Notes |
|---|---|---|---|
| — | `ask-portfolio` | (BYOK-only) | **Do not migrate.** Per `../04-feature-routing-map.md`, this function is BYOK-only and excluded from `FEATURE_ROUTES`. The Phase 1 validator skips it explicitly. Streaming behavior remains owned by `ask-portfolio` itself. |

---

## Per-function detailed notes

A few functions have non-obvious gotchas. Read the relevant entry below before migrating that one.

### `parse-resume` and `parse-linkedin`

- These functions accept a **file upload**. The cache key includes `fileSha256 = sha256(rawFileBytes)`. Make sure the SHA is computed over the **raw bytes**, not over the parsed text — the latter would defeat the cache for the same file uploaded twice.
- Per `../07-caching-design.md` lines 27–28, both `resume.parse` and `linkedin.parse` are scoped **per-user** with keyParts `[user_id, fileSha256]`. Two different users uploading the same file get **separate** cache rows by design — resume content is PII and must not be shared across accounts even when the bytes happen to match.

### `parse-job-url`

- The `url` is the cache key. Strip query strings used only for tracking (e.g. `?utm_*`) before hashing — see the canonical-URL helper in `../07-caching-design.md` Key Derivation.

### `enhance-section`

- One function, **five feature keys** (15a–15e in the table above). Branch on the `action` request body field to choose the key. Don't try to make this one call with a dynamic feature key — the routing table is static and the dashboard groups by key.

### `tailor-resume`

- Cost = 2. The `creditUtils.checkAndDeductCredit(userId, 2)` call already exists in this function — don't double-charge. The validator confirms the cost-2 declaration in `FEATURE_ROUTES['resume.tailor']` matches.
- This is the longest-input function (full resume + full JD). Streaming is on; Gemini Flash primary handles the long context.

### `wisehire-bulk-screen` and `wisehire-mask-cvs`

- Cache scope is **per-tenant** (recruiter org), not per-user, not cross-user. Two recruiters in the same org should be able to share screens of the same CV against the same JD. Two recruiters in different orgs **must not** share. Per `../07-caching-design.md` lines 34–35, the keyParts are `[tenant_id, cvSha256, jdSha256]` for `bulk_screen` and `[tenant_id, cvSha256]` for `mask_cvs`. **There is no separate `cache_scope_tenant_id` column** in `ai_cache` — the tenant_id is folded into `input_hash` along with the file SHAs (see `../05-implementation-plan.md` Phase 2 schema). The tenant ID comes from the user's recruiter-org membership lookup.

### `ask-portfolio` (skipped)

- Don't touch. It uses a BYOK key supplied by the portfolio owner. Routing through managed providers would (a) violate the user's cost expectation and (b) leak portfolio content through the platform's quota.

---

## Validator (built into Phase 1)

Before any migration, the new `aiRouting.ts` boot-time validator (added in Phase 1) checks the following invariants. If any fail, edge functions refuse to start:

1. Every key in `FEATURE_ROUTES` follows the `<domain>.<verb>` regex.
2. Every route has a `primary` and at least 1 entry in `fallbacks` (≥2 providers total).
3. No fallback chain references the same provider twice in a row.
4. Every `model` slug references one of the constants in `MODELS` (which mirror `../03-providers-and-models.md`).
5. `creditCost` is a positive integer.
6. If `streaming: true`, the feature is **not** also `cacheable: true` — those two are mutually exclusive (stream IS the response; cache stores final responses).
7. If `cache.enabled: true`, `cache.keyParts` is non-empty and `cache.scope` is one of `'cross-user' | 'per-user' | 'per-tenant'`.
8. The BYOK-only feature `chat.portfolio_visitor` is **not** present in `FEATURE_ROUTES` (it's intentionally excluded; the validator white-lists this one absence).

If you migrate a function and forget to register its key in `FEATURE_ROUTES`, the call will fail at runtime with `UnknownFeatureKeyError` — the function will return a 500 with a clear message and you'll see it in the next deploy.

---

## After all 30 are migrated

1. Search the codebase for any remaining import of `callAI` (the legacy function). It should appear **only inside `aiClient.ts`** — `callAIForFeature` is implemented on top of it.
2. Add a deprecation warning at the top of `callAI` (`@deprecated use callAIForFeature`).
3. Optionally, in a later cleanup PR, make `callAI` `private` (un-export it) so accidental new uses are caught at compile time.

That's the end state. The whole AI surface speaks one language: feature keys.
