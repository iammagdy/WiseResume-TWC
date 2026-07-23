# Appwrite AI Gateway Serverless Function Specification

**Last Verified:** 2026-07-24
**Status:** Living Architecture - Tailoring Project Metadata Verified
**Location:** `Project Atlas/ai/ai-gateway.md`
**Function Source:** `appwrite-hubs/ai-gateway/`

---

## 1. Purpose and Boundary

The Appwrite `ai-gateway` is the centralized server-side provider proxy and authorization boundary for most WiseResume AI features, including resume tailoring, Cover Letters, interview simulation, and AI chat.

The explicitly documented standalone Appwrite exceptions are `resume-section-ai` and `job-import`. Browser code must never call AI provider APIs directly or hold provider keys.

## 2. Core Principles

* **Server-side security:** Clients call Appwrite Functions with authenticated session context. Provider keys remain server-side.
* **Appwrite-native integration:** The gateway reads Appwrite `main` database collections for plans, credits, rate limiting, and idempotency.
* **Feature-specific routing:** Provider endpoints, models, time budgets, and fallback policy are defined in `appwrite-hubs/ai-gateway/src/main.js`; do not infer one universal provider order for every feature.
* **Safe output:** Raw provider errors, prompts, resume/job content, tokens, and authorization headers must not reach browser errors or logs.

## 3. Credits, Rate Limits, and Authorization

* Each paid feature validates the authenticated user and server-side plan/credit state before provider work.
* The gateway enforces a persistent rate limit and plan daily quota.
* Feature costs are source-controlled in the gateway. Current `tailor-resume` and `generate-cover-letter` cost two credits each.
* Result-only Tailoring recovery cannot invoke a provider and therefore bypasses credit deduction.

## 4. Tailoring Execution Contract

`tailor-resume` has a dedicated long-running contract:

* Total gateway budget: `68,000 ms`.
* Primary provider attempt: at most `42,000 ms`.
* Cross-provider fallback: at most one attempt and `23,000 ms`.
* Minimum time to begin an attempt: `5,000 ms`; cleanup reserve: `2,000 ms`.
* Same-provider retry and structured-output repair are disabled for Tailoring.
* The frontend starts one provider execution asynchronously and waits at most `75,000 ms`.
* Result-only retrieval authenticates the user, recomputes the user-scoped fingerprint, reads only `idempotency_cache`, and long-polls at most `8,000 ms` per execution.
* Pending Tailoring rows expire after `80,000 ms`; the Tailoring credit lock lasts `78,000 ms`.
* Success and recoverable failure states are cached before the final response.

Performance Phase 4 did not change the approved provider/model routing, prompt, feature cost, scoring, normalization, or merge behavior. The later project-metadata fix changed only Tailoring project context, structured project fields, and allowlisted project reconciliation; timing, routing, models, idempotency, and credits remain unchanged.

## 5. Safe Tailoring Diagnostics

Tailoring attempt logs may contain only feature, provider, model, attempt number, duration, outcome, fallback flag, and remaining budget. They must not contain prompts, resume/job content, raw provider responses, keys, JWTs, cookies, or authorization headers.

## 6. Current Deployment

* **Workflow:** `.github/workflows/deploy-appwrite-hubs.yml`
* **Target:** `ai-gateway` only
* **Workflow run:** `30048216417`
* **Deployment:** `6a628eafd09be552df71`, `ready`
* **Runtime timeout:** `180 s`
* **Source hash:** `6a61da4d2b3efa73449ca7e3f77ebb6797d35dd005ff8f01f81644439bd72d12`

Never use `target=all`.

## 7. Tailoring Project Metadata Integrity

The 2026-07-23 rich production verification proved that project metadata was lost across multiple layers: model context omitted dates/current/URLs, structured output omitted current/URLs, and generic normalization/merge behavior could accept blank metadata or unsupported projects.

The deployed contract now:

* Sends exact source project ID, chronology, current state, and URL metadata in Tailoring context.
* Allows supported project metadata in structured output without treating provider output as authoritative.
* Reconciles provider projects against source projects by exact ID first, then deterministic unique fallback only for absent IDs.
* Preserves source identity, chronology, current state, URLs, and order.
* Drops unknown IDs, ambiguous/unmatched fallback entries, AI-only projects, and unknown provider fields.
* Allows only approved project content rewrites.

Product commit `a14b306da29e4ac7a1db16e85fcc54c790c3727c` and Appwrite deployment `6a628eafd09be552df71` were production verified on 2026-07-24. One controlled request retained both QA projects and their exact metadata, rewrote both descriptions, used one provider request, and charged exactly two credits. Tailoring is `VERIFIED_READY`.

## 8. Related Specifications and Evidence

* [`CURRENT_STATE.md`](../CURRENT_STATE.md)
* [`appwrite-functions.md`](../architecture/appwrite-functions.md)
* [`tailoring-hub.md`](../features/tailoring-hub.md)
* [`performance-phase-4-tailoring-remediation-2026-07-23.md`](../reports/performance/performance-phase-4-tailoring-remediation-2026-07-23.md)
* [`tailoring-meaningful-production-verification-2026-07-23.md`](../qa/production-stabilization/tailoring-meaningful-production-verification-2026-07-23.md)
