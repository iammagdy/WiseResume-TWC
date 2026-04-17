# Routing AI Providers — Planning & Documentation

> **Status:** Planning. **No code is being written until this folder is reviewed and approved.**
>
> **Owner:** Project owner (you). **Drafted by:** Replit Agent. **Last updated:** April 17, 2026.

---

## What this folder is

This folder is the **single source of truth** for the upcoming work to introduce a unified, per-feature AI routing layer in WiseResume that uses **OpenRouter + Groq + Gemini** with smart fallback, streaming, caching, and an admin observability dashboard.

It exists so that:

1. The plan is reviewed and locked **before** any code changes happen.
2. If the project is imported into a fresh Replit, anyone (including a future agent or developer) can read this folder and pick up exactly where we left off — without guessing.
3. Every product/policy decision is recorded in writing, not just in chat.

---

## Read in this order

| # | File | What it covers |
|---|---|---|
| 1 | [`01-current-state.md`](./01-current-state.md) | What already exists in the codebase (this is bigger than you might think). |
| 2 | [`02-target-architecture.md`](./02-target-architecture.md) | The end-state design we're building toward, with diagrams. |
| 3 | [`03-providers-and-models.md`](./03-providers-and-models.md) | Each provider's catalog, free-tier limits, and which models we'll use. |
| 4 | [`04-feature-routing-map.md`](./04-feature-routing-map.md) | Every AI feature in the app, mapped to a primary + fallback chain. |
| 5 | [`05-implementation-plan.md`](./05-implementation-plan.md) | Phased step-by-step rollout. **No phase breaks existing features.** |
| 6 | [`06-streaming-design.md`](./06-streaming-design.md) | How streaming works per provider and how the front-end consumes it. |
| 7 | [`07-caching-design.md`](./07-caching-design.md) | The cache table, key derivation, invalidation, and TTL rules. |
| 8 | [`08-admin-dashboard-spec.md`](./08-admin-dashboard-spec.md) | The DevKit AI Activity dashboard — sections, queries, charts. |
| 9 | [`09-decisions-log.md`](./09-decisions-log.md) | Locked decisions (your answers from the planning chat). |
| 10 | [`10-risks-and-rollback.md`](./10-risks-and-rollback.md) | What can go wrong, mitigations, and how to undo each phase. |

---

## TL;DR (one-paragraph version)

WiseResume already has a sophisticated shared AI client (`supabase/functions/_shared/aiClient.ts`) that routes through OpenRouter and Groq with auto-fallback, supports BYOK for many providers including Gemini, and tracks per-user credits. **30+ edge functions already use it.** The proposed work does *not* replace this — it adds: (a) a per-feature routing config so each AI use case picks the best provider/model intentionally, (b) Gemini as a first-class **managed** provider (not just BYOK), (c) **streaming** responses for chat-like features, (d) a **cache layer** for deterministic calls, (e) **token-level tracking** in `ai_usage_logs`, and (f) a new **DevKit "AI Activity" dashboard** showing per-key/per-provider/per-feature usage with free-tier limit indicators. The rollout is phased so existing features keep working at every step.

---

## Glossary (used throughout these docs)

- **Provider** — a company/service that exposes an LLM API (OpenRouter, Groq, Google Gemini).
- **Managed key** — an API key the platform owns (stored as a Supabase secret like `OPENROUTER_API_KEY`). Used for all users by default.
- **BYOK** — "Bring Your Own Key." A user adds their own API key in Settings; their requests use it instead of the managed key. Already exists in the codebase.
- **Feature key** — a stable string like `"resume.parse"` or `"bullet.rewrite"` that identifies an AI use case in the app. Used for routing, credit costs, analytics, and caching.
- **Routing config** — the file (`supabase/functions/_shared/aiRouting.ts`, planned) that maps each feature key to a primary provider+model and an ordered fallback chain.
- **Fallback chain** — the ordered list of providers tried if the primary returns 429/5xx/timeout.
- **Free tier** — the no-billing usage allotment a provider gives per account/key.
- **Cache layer** — a Supabase table (`ai_cache`, planned) that stores `(feature_key, input_hash) → response` for deterministic calls.

---

## Ground rules baked into every doc here

1. **No multi-account / key-rotation tricks.** Each provider gets exactly one managed key per environment. Compliance with each provider's TOS is non-negotiable. (See `09-decisions-log.md` for the full reasoning.)
2. **No breaking changes during rollout.** Every phase in `05-implementation-plan.md` either adds new code or gates new behavior behind a config flag. Existing features keep using `callAI()` as they do today until they're migrated one-by-one.
3. **No hardcoded model names in feature code.** Models live in the routing config only. Swapping a model is a one-line edit in one file.
4. **Accuracy over speed.** Free-tier numbers shown in `03-providers-and-models.md` are pulled from provider docs and dated. They will be re-verified before launch and on every config change.
5. **Streaming is opt-in per feature.** Not all features benefit; we mark which ones do in `04-feature-routing-map.md`.
6. **Cache only what's safe to cache.** Resume parsing of the same PDF — yes. Cover letter generation — no (always fresh). Rules in `07-caching-design.md`.
7. **The admin dashboard surfaces the truth, not estimates.** Token counts and provider attribution are pulled from real `ai_usage_logs` rows, not guessed from feature defaults.

---

## How to use this folder going forward

- **Reading mode:** start with this README, then 01 → 10 in order.
- **Reviewing mode:** focus on `04-feature-routing-map.md` and `09-decisions-log.md` — those are the "policy" docs where your input matters most.
- **Editing mode:** if a model gets paywalled or a better one launches, edit `03-providers-and-models.md` and `04-feature-routing-map.md`. The actual code config (when it exists) reads from those decisions.
- **Importing into a new Replit:** read this README first, then `01-current-state.md` to confirm the codebase still matches the assumptions documented there.
