# Appwrite AI Gateway Serverless Function Specification

**Last Verified:** 2026-07-03
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

---

## 5. Related Living Specifications

* [`Project Atlas/MASTER_HANDBOOK.md`](../MASTER_HANDBOOK.md) — Master handbook & operating manual.
* [`Project Atlas/CURRENT_STATE.md`](../CURRENT_STATE.md) — Verified production snapshot.
* [`Project Atlas/architecture/appwrite-functions.md`](../architecture/appwrite-functions.md) — Serverless functions specification.
* [`Project Atlas/features/tailoring-hub.md`](../features/tailoring-hub.md) — Tailoring Hub AI feature spec.
