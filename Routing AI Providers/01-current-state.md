# 01 — Current State of AI in WiseResume

> **Purpose:** Document exactly what already exists in the codebase, so the plan in later docs is grounded in reality and we don't accidentally rebuild something that already works.
>
> **Verified against the codebase on:** April 17, 2026.

---

## Headline finding

**WiseResume already has a mature, multi-provider AI infrastructure.** This is not a greenfield project. The work proposed in this folder is to **extend and unify** what's there — not replace it.

If you remember nothing else from this doc:

- One shared client (`callAI()`) already handles OpenRouter + Groq with auto-fallback and supports BYOK for Gemini, OpenAI, Anthropic, Mistral, xAI, Cohere, Groq, Ollama, OpenRouter.
- 30+ edge functions already use that shared client.
- Per-user daily credits, plan tiers, and rate limiting are already wired up.
- What's missing is mostly **policy** (per-feature provider choice) and **observability** (admin dashboard, token tracking), plus two new capabilities (streaming, caching) and Gemini as a managed provider.

---

## Existing shared infrastructure

Located in `supabase/functions/_shared/`:

| File | What it does |
|---|---|
| `aiClient.ts` (1827 lines) | The brain. Exports `callAI()`, `callAIWithRetry()`, `parseAIJSONWithRetry()`, plus model discovery for OpenRouter and Groq. Handles BYOK key decryption (AES-GCM-256, v1 + v2 salt schemes), provider priority routing, auto-fallback inside WiseResume managed (OpenRouter ↔ Groq), and timeouts. |
| `creditUtils.ts` (203 lines) | `checkAndDeductCredit(userId, featureCost)` — atomic per-user daily credit deduction via the `atomic_attempt_and_deduct_credit` RPC. Skips deduction if the user has a working BYOK key. |
| `creditLimits.json` | Plan-level daily caps: `free: 5`, `pro: 100`, `premium: -1` (unlimited). |
| `rateLimiter.ts` | Plan-aware rate limiter (Free/Pro/Premium) backed by `ai_usage_logs`. Also exports `checkIpRateLimit` for anonymous endpoints. |
| `userRateLimiter.ts` | Authoritative server-side rate limiter backed by `rpc_rate_limits`. **Fail-open** by design (errors don't block requests). |
| `authMiddleware.ts` | `requireAuth(req)` validates the Bearer JWT against Supabase Auth and returns `{ userId, client }` (service-role client). |
| `adminAuth.ts` | `requireAdminAuth(req, password)` validates the DevKit HMAC token against `ADMIN_EMAILS`. Used by all admin/internal functions. |
| `cors.ts` | `getCorsHeaders(origin)` — pre-allowlisted origins for web, Replit dev domains, Capacitor app schemes. |
| `dbClient.ts` | `getServiceClient()` — creates a Supabase service-role client. |
| `logger.ts` | Structured logger with optional Sentry forwarding for errors. |
| `requestUtils.ts` | `checkPayloadSize(req, maxBytes)` — 413 guard. |
| `planLimits.ts` | Per-plan feature gating constants. |
| `profileContext.ts` | Fetches user industry/career level for prompt context. |
| `industryKeywords.ts` | ATS keyword lists. |

---

## How the existing `callAI()` routes today

The priority order inside `aiClient.ts` is:

1. **BYOK OpenAI-compatible** (Anthropic via direct API, or any OpenAI-compatible provider — OpenAI, Mistral, xAI, Cohere, Groq-as-BYOK). **Strict mode**: if the user's key fails, the request errors out — never silently consumes the platform's managed quota.
2. **BYOK OpenRouter.**
3. **BYOK Ollama.**
4. **BYOK Gemini.**
5. **WiseResume managed** — OpenRouter + Groq, with sub-provider auto-selection (`auto` tries one then the other on failure). Sub-provider is read from the `app_settings` table key `wiseresume_ai_engine` (`openrouter` | `groq` | `auto`).
6. **Legacy `GEMINI_API_KEY`** global fallback (deprecated path, still wired).

**Important detail:** Gemini today is **only available as BYOK or as the legacy global fallback** — it is not a first-class managed provider in the auto-fallback chain. That changes in this plan.

---

## Edge functions that call AI today

Inventory from the codebase. All of them call `callAI()` from the shared client; none speak to a provider directly.

### Resume / job-related

- `parse-resume` — PDF/Docx → structured JSON
- `parse-linkedin` — LinkedIn export → structured JSON
- `parse-job-text` — JD pasted text → requirements
- `parse-job-url` — JD scraped from URL → requirements
- `analyze-resume` — content analysis / job match
- `enhance-section` — section-level rewrite (summary, experience bullets, skills, etc.)
- `tailor-resume` — full resume tailoring to a JD
- `tailor-section` — single section tailoring
- `one-page-optimizer` — length compression
- `optimize-for-linkedin` — LinkedIn profile rewrite
- `detect-and-humanize` — AI-content detection + humanization
- `recruiter-simulation` — recruiter-style feedback
- `suggest-template` — template recommender
- `fill-gap` — fabricate a draft for a missing experience period
- `explain-gap` — gap explanation generator
- `generate-cover-letter` — cover letter generator
- `generate-resignation-letter` — resignation letter generator
- `generate-portfolio-bio` — portfolio bio/headline

### Interview / career

- `generate-question-bank` — interview question generator
- `interview-chat` — mock interview turns
- `company-briefing` — company research for interview prep
- `career-assessment` — career path quiz
- `career-path-advisor` — career roadmap

### Chat / assistants

- `agentic-chat` — AI editor assistant
- `wise-ai-chat` — general dashboard assistant
- `ask-portfolio` — public portfolio chat widget (BYOK only — no managed key path)

### Recruiter (WiseHire suite)

- `wisehire-bulk-screen` — bulk candidate screening
- `wisehire-generate-brief` — hiring brief
- `wisehire-mask-cvs` — PII anonymization
- `wisehire-write-jd` — JD writer

**Total: ~30 AI-powered edge functions.** All currently one-shot (no streaming).

---

## Existing database tables relevant to AI

### `ai_credits`

Per-user daily quota.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK to `profiles.user_id`, unique |
| `daily_usage` | int | Resets lazily when `usage_date != CURRENT_DATE` |
| `daily_limit` | int | Default 20; set per-plan via `upsert_ai_credits_limit` RPC |
| `usage_date` | date | The day `daily_usage` applies to |
| `total_usage` | int | Lifetime counter |
| `updated_at` | timestamptz | |

RPC: `increment_ai_usage(p_user_id, p_skip_limit_check)` — atomic, idempotent for the day.

### `ai_usage_logs`

Per-call audit log.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | |
| `resume_id` | uuid \| null | FK to `resumes` |
| `action_type` | text | e.g. `'enhance'`, `'tailor'`, `'analyze'` |
| `section` | text \| null | e.g. `'experience'` |
| `metadata` | jsonb | Today: `{ model, intensity, ... }` — provider/token info **not yet captured here**. |
| `created_at` | timestamptz | |

RLS: users can read/insert their own. Service role inserts from edge functions.

### `usage_events`

Higher-level product analytics.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | |
| `event_type` | text | e.g. `'ai.tailor_resume'`, `'page.view'` |
| `metadata` | jsonb | Free-form context |
| `created_at` | timestamptz | |

Service-role insert only. Read by the new DevKit Analytics RPCs (added in Task #19).

### `user_api_keys`

BYOK encrypted keys.

| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid | |
| `provider` | text | `'gemini'`, `'openrouter'`, `'openai'`, `'anthropic'`, etc. |
| `encrypted_key` | text | AES-GCM-256 ciphertext |
| `key_version` | int | 1 = static salt, 2 = per-user salt |
| `base_url` | text \| null | For OpenAI-compatible providers / Ollama |
| `model` | text \| null | User-selected model |

### `user_preferences`

Includes `ai_provider` ∈ {`'wiseresume'`, `'gemini'`, `'ollama'`, `'openrouter'`, `'openai'`, `'anthropic'`, `'mistral'`, `'xai'`, `'cohere'`, `'groq'`}.

### `app_settings`

Includes key `wiseresume_ai_engine` ∈ {`'openrouter'`, `'groq'`, `'auto'`} — admin-controlled global routing for managed users.

---

## Existing admin/observability surface

- DevKit (admin-gated section in the app) has an Analytics tab (recently upgraded in Task #19) showing per-feature usage trends, top features with sparklines, DAU/WAU stickiness, traffic, geo, devices, etc.
- That dashboard reads from `usage_events`, **not** `ai_usage_logs` — so it does not currently break out per-provider or per-key activity.
- There is **no** existing "AI Activity" view that shows: which provider handled which call, how many tokens, which key was used, or how close any provider's free-tier daily limit is.

---

## Existing secrets relevant to AI

| Secret | Purpose | Today |
|---|---|---|
| `OPENROUTER_API_KEY` | Managed OpenRouter access | **Required for managed AI** |
| `GROQ_API_KEY` | Managed Groq access | **Required for managed AI** |
| `GEMINI_API_KEY` | Legacy global fallback | Optional today; will become primary for managed Gemini routing |
| `API_KEY_ENCRYPTION_SECRET` | PBKDF2 secret for BYOK key encrypt/decrypt | Required if BYOK is used |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Service-role DB access in edge functions | Required (already configured) |
| `DEV_KIT_PASSWORD` | DevKit admin auth | Required for admin functions |
| `ADMIN_EMAILS` | DevKit allowlist | Required for admin functions |
| `SENTRY_DSN` | Optional Sentry forwarding from `logger.ts` | Optional |

The plan does **not** introduce any new required secrets. It uses the existing `GEMINI_API_KEY` slot (currently legacy) to make Gemini a first-class managed provider.

---

## Gaps this plan fills

These are the things that genuinely don't exist yet and that the plan in `05-implementation-plan.md` adds:

1. **A per-feature routing config.** Today every edge function passes its own model string to `callAI()`. There's no single place that says "the cover letter feature should use Gemini 2.5 Pro with a Groq Llama 3.3 fallback." Models are scattered across 30 functions.
2. **Gemini as a managed provider in the auto-fallback chain.** Today managed AI is OpenRouter ↔ Groq only. Adding Gemini as an equal peer — with its own model list and quota — requires extending `aiClient.ts` and `app_settings`.
3. **Streaming responses.** All 30 functions return one-shot JSON. Adding streaming requires a separate code path in `aiClient.ts` and a new front-end consumption pattern (Server-Sent Events).
4. **Caching layer.** No deterministic-call cache exists today. Same PDF parsed twice = two API calls.
5. **Token tracking in `ai_usage_logs`.** The `metadata` jsonb has space for it but the column convention isn't standardized and the shared client doesn't reliably write `prompt_tokens` / `completion_tokens` / `provider_used` / `model_used` / `key_id`.
6. **Admin "AI Activity" dashboard.** No view today shows per-provider/per-key/per-feature/per-token activity or free-tier limit utilization.
7. **Friendly user-facing error UX** for the "all providers exhausted/down" case. Today the error bubbles up as a generic 502/500.

Each of these gets its own design doc in this folder.

---

## Things explicitly *not* changing

- The 30 existing edge functions' contracts (request/response shapes).
- The `callAI()` function signature — extensions only, no removals.
- BYOK behavior — strict-mode (no silent platform fallback) is preserved.
- The `ai_credits` per-user quota mechanics.
- Plan tier definitions (`free`/`pro`/`premium`) and their daily caps.
- DevKit auth and allowlist.
