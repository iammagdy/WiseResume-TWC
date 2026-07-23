# Appwrite AI Gateway Serverless Function Specification

**Last Verified:** 2026-07-23
**Status:** Living Architectural Specification
**Location:** `Project Atlas/ai/ai-gateway.md`
**Function Source:** `appwrite-hubs/ai-gateway/`

---

## 1. Executive Summary & Purpose

The Appwrite `ai-gateway` serverless function serves as the centralized, server-side AI provider proxy and authorization boundary for the WiseResume application.

All AI features across the application—including resume tailoring, cover letter generation, interview simulation, and AI chat—route exclusively through `ai-gateway`.

---

## 2. Core Architectural Principles

* **Server-Side Security Boundary:** Client applications never hold or expose AI provider API keys. All requests are sent to `ai-gateway` with authenticated Appwrite session tokens or headers.
* **Appwrite-Native Integration:** Operates inside the Appwrite Serverless Functions runtime, accessing Appwrite Databases (`main` database, `ai_credits` and `subscriptions` collections) for balance checks and rate limiting.
* **Multi-Provider Resilience:** Internal multi-provider fallback infrastructure connects to backend API providers.

> [!NOTE]
> Provider routing details: Internal provider endpoints (`openrouter`, `groq`, `deepseek`, `nvidia`) and models are defined in server-side function configuration (`appwrite-hubs/ai-gateway/src/main.js`).

---

## 3. Rate Limiting, Credits & Authorization

* **Feature Credit Deductions:** Each AI feature action (e.g. `tailor-resume`, `analyze-resume`, `generate-cover-letter`) enforces server-side credit validation before invoking downstream AI APIs.
* **Rate Limits:** Enforces a server-side window rate limit (60-second window, max requests threshold) per authenticated user to prevent API quota abuse.
* **Plan Daily Quotas:** Tracks daily quotas per subscription tier (`free`, `pro`, `premium`).

---

## 4. Operational & Deployment Policy

* **Deployment Boundary:** Located in `appwrite-hubs/ai-gateway/`.
* **Deployment Execution:** Deployed targeted via Appwrite CLI or GitHub Action workflow (`deploy-ai-hubs.yml`).
* **Deployment Rule:** `ai-gateway` MUST be deployed individually using targeted deployment flags (`--only=ai-gateway`). Never use target-all deploys (`target=all`).

### Tailoring Execution Contract

`tailor-resume` is the only gateway feature with this dedicated long-running contract:

* Total gateway budget: `68,000 ms`.
* Primary provider attempt: at most `42,000 ms`.
* Cross-provider fallback: at most one attempt and `23,000 ms`.
* Minimum time to begin an attempt: `5,000 ms`; cleanup reserve: `2,000 ms`.
* Same-provider retry and structured-output repair are disabled for Tailoring.
* The frontend starts the provider execution asynchronously and has a `75,000 ms` total wait.
* Result-only retrieval is authenticated, recomputes the user-scoped payload fingerprint, reads only `idempotency_cache`, and long-polls for at most `8,000 ms` per execution.
* Result-only retrieval bypasses provider routing and credit checks because it cannot create AI work.
* Pending Tailoring rows expire after `80,000 ms`; the Tailoring credit lock lasts `78,000 ms`.
* Success is cached before credit finalization. Failed/timeout/unusable outcomes are cached as recoverable failure states and are consumed before an explicit retry.

The approved provider order, models, feature credit cost, prompt, normalization, and resume merge behavior were not changed by Performance Phase 4.

### Safe Tailoring Diagnostics

Tailoring attempt logs may contain only feature, provider, model, attempt number, duration, outcome, fallback flag, and remaining budget. They must not contain prompts, resume/job content, raw provider responses, keys, JWTs, cookies, or authorization headers.

Production deployment `6a627b81bff27daaf366` is `ready` with source hash `244f6be15693770dc1c6129a8e258c4fc956a6ddd04793522edc314ab712adc0`.

---

## 5. Related Living Specifications

* [`Project Atlas/MASTER_HANDBOOK.md`](../MASTER_HANDBOOK.md) — Master handbook & operating manual.
* [`Project Atlas/CURRENT_STATE.md`](../CURRENT_STATE.md) — Verified production snapshot.
* [`Project Atlas/architecture/appwrite-functions.md`](../architecture/appwrite-functions.md) — Serverless functions specification.
* [`Project Atlas/features/tailoring-hub.md`](../features/tailoring-hub.md) — Tailoring Hub AI feature spec.
