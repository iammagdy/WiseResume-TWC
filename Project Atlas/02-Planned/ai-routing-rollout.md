# AI Routing Rollout - Unified Per-Feature Routing Layer

**Status:** Partially shipped. Per-feature routing is live in Appwrite `ai-gateway`; streaming, cross-feature caching, per-tier differentiation, and fuller DevKit observability remain planned.
**Last verified:** 2026-05-12
**Type:** planned reference
**Sources:**
- `appwrite-hubs/ai-gateway/src/main.js`
- `src/lib/appwrite-bridge.ts`
- `Project Atlas/MASTER_HANDOVER_2026.md`
- `Project Atlas/GOVERNANCE.md`
**Canonical owner:** this file

---

This file is the Atlas-owned source of truth for AI provider routing plans. The old external `Routing AI Providers/` folder has been removed so agents have one place to trust.

## Current State

- Frontend AI feature names are routed by `src/lib/appwrite-bridge.ts`.
- AI feature calls are forwarded to the Appwrite `ai-gateway` Function.
- The gateway owns feature-level provider routing and fallback behavior.
- Current provider pool documented in the handover: OpenRouter, Groq, DeepSeek, and NVIDIA NIM.
- DevKit work already exists for provider/model visibility, routing controls, usage logs, and health checks.

## Target State

The platform should continue moving toward:

- per-feature routing profiles for every AI use case;
- ordered provider fallback chains;
- provider/model attribution on every AI result;
- routing configuration stored in Appwrite Database so it can be edited without redeploying gateway code;
- streaming support for chat-like features where it improves UX;
- safe output caching only for deterministic or reusable calls;
- DevKit observability showing real usage, provider, model, latency, fallback, and error data.

## Durable Rules

- No multi-account or key-rotation tricks. Each provider gets legitimate managed keys per environment.
- No breaking changes during rollout. New routing behavior should be additive, phased, or guarded.
- No hardcoded model names inside feature UI code. Models belong in routing configuration or curated provider catalogs.
- Cache only what is safe to reuse. Personalized/generated creative outputs should stay fresh unless a specific Atlas rule says otherwise.
- Dashboards must surface recorded truth, not estimates.
- Provider availability must be based on real errors, health checks, and logs.
- BYOK keys must never leak to the browser or logs.

## Known Remaining Work

From the active queue in `MASTER_HANDOVER_2026.md`:

- AI gateway provider failover improvements.
- Move AI routing config to Appwrite Database.
- Show which provider was actually used on each AI result.
- Keep provider model lists current as providers add or retire models.

## Before Implementation

Before changing AI routing behavior, read:

1. `Project Atlas/MASTER_HANDOVER_2026.md`
2. `Project Atlas/GOVERNANCE.md`
3. `src/lib/appwrite-bridge.ts`
4. `appwrite-hubs/ai-gateway/src/main.js`
5. current DevKit AI panel code under `src/components/dev-kit/`

Then verify the live Appwrite Function deployment state. Editing `appwrite-hubs/ai-gateway/src/main.js` does not update production until the Function is redeployed.
