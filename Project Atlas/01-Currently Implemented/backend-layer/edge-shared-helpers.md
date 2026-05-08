# Edge function shared helpers (`supabase/functions/_shared/`)

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/functions/_shared/`.

**Canonical owner:** Cross-edge-function infrastructure. Every helper is single-source-of-truth for its concern.

---

36 modules + two JSON configs (`aiProviders.json`, `creditLimits.json`) + an `email-templates/` subdir + `__tests__/`. Grouped by concern:

## Auth, identity, sessions

| Module | Purpose |
|---|---|
| `authMiddleware.ts` | `requireAuth` — the **only** approved JWT-claims extractor. Delegates verification to `supabase.auth.getUser(token)`. Never decode JWTs manually for security decisions. |
| `adminAuth.ts` | `requireAdminAuth` — verifies the DevKit HMAC session token from `Authorization: Bearer <token>` (transport-only since AUTH-5/M6). Looks the session up in `admin_sessions`. |
| `webhookAuth.ts` | `requireCronSecretOrVault`, signed-webhook verifiers (Kinde HMAC, Supabase Auth Hook standard-webhooks). Cron auth tolerates rotation between `CRON_SECRET` env-var and `vault.cron_secret` row (`replit.md`). |
| `jwtUtils.ts` | **Non-security** payload extraction (e.g. rate-limit key from a foreign-project JWT). Must never be used for any security decision. |

## CORS, transport, request shape

| Module | Purpose |
|---|---|
| `cors.ts` | Production CORS allow-list driven by `ALLOWED_DEV_ORIGINS` env (no blanket `*.replit.dev`, AI-4 / Task #24). |
| `requestUtils.ts` | Body parsing helpers, content-type guards. |

## AI client + routing

| Module | Purpose |
|---|---|
| `aiClient.ts` | **Flat-pool** AI client. Up to 9 keys (3 OpenRouter + 3 Groq + 3 DeepSeek). Random provider, random key, one sibling-key retry, then cross-provider fallback. Public surface preserved across 30+ AI fns. Breaker is no-op. |
| `aiProviders.json` | Provider catalog (display names, base URLs, header style). |
| `modelRouter.ts` | Canonical per-feature routing helper. **Pass `featureName` on `AICallOptions`** — never call `resolveFeatureRoute()` directly (deprecated, `replit.md`). Reads `ai_routing_config`. |
| `modelDefaults.ts` | Platform-wide defaults when `ai_routing_config` has no row. |
| `aiTestModelCatalog.ts` | Pure curation logic for the DevKit "Send test request" model dropdown. Side-effect-free for unit testing. |
| `providers.ts` | Provider-specific request shaping (auth header, body schema differences). |

## Credits, rate-limits, quotas

| Module | Purpose |
|---|---|
| `creditUtils.ts` | Atomic check-and-deduct before AI call. Plan resolution, trial honoring. **BYOK fully removed** — `isByok` is permanently false (`replit.md`). |
| `creditLimits.json` | **Single source of truth** for credit limits. Imported by both `_shared/planLimits.ts` and `src/lib/planConfig.ts`. Never define numbers in the consumer files. |
| `planLimits.ts` | Edge-side plan→limit lookup wrapping `creditLimits.json` + `app_settings` overrides. |
| `rateLimiter.ts` | Token-bucket / sliding-window primitives. Fail-open writes to `ops_health_events`. |
| `userRateLimiter.ts` | Per-user composition of `rateLimiter.ts`. |

## DB + provisioning

| Module | Purpose |
|---|---|
| `dbClient.ts` | Service-role Supabase client (via auto-injected `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`). Optional `EXT_*` overrides for split-project setups. |
| `provisionUser.ts` | Idempotent user provisioning (called by token-exchange + Kinde webhook). |

## Logging, ops health, secret hygiene

| Module | Purpose |
|---|---|
| `fnLogger.ts` | `logInvocation()` → fire-and-forget insert into `edge_function_logs`. |
| `logger.ts` | Structured stderr logger. |
| `opsHealth.ts` | `recordOpsHealthEvent()` → `ops_health_events`. **Every fail-open path must call this** (`replit.md`). |
| `scrubSecrets.ts` | `scrubSecrets`, `scrubAndCap`. **Every string going to stderr or the JSON envelope must be scrubbed** (`replit.md`). |

## Content moderation, bot guard, blocklists

| Module | Purpose |
|---|---|
| `botGuard.ts` | UA fingerprint + Referer validation for public endpoints. Allows legitimate crawlers. |
| `contentModeration.ts` | `screenContent()` — checks against `blocklist` patterns; matches enqueue rows in `moderation_queue`. Fire-and-forget. |
| `featureFlags.ts` | `isFeatureEnabled()` resolver against `feature_flags` (kill switch → user list → plan → global → percentage). |

## Resume + portfolio domain

| Module | Purpose |
|---|---|
| `keywordScoring.ts` | Deterministic keyword-scoring **single source of truth** for `tailor-resume` and `validate-tailor`. Bug fixes go here only. |
| `industryKeywords.ts` | Static industry→keyword catalog used by `keywordScoring`. |
| `scoringFunctions.ts` | ATS-style scoring primitives. |
| `pdfRenderer.ts` | Puppeteer wrapper used by export functions. |
| `letterPersistence.ts` | Cover-letter / resignation-letter save helpers. |
| `portfolioBioPrompt.ts` | Prompt template for `generate-portfolio-bio`. |
| `portfolioSession.ts` | Portfolio password-protected session helpers (cookies, JWT). |
| `profileContext.ts` | Builds the user-profile context blob fed to AI prompts. |

## Email, transactional, audiences

| Module | Purpose |
|---|---|
| `resendConfig.ts` | Resend client config (API key, audiences, from-address). |
| `resendAudiences.ts` | Resend audience IDs / sync helpers. |
| `email-templates/` | React Email templates rendered by `transactional-email`. |
| `htmlEscape.ts` | Safe HTML interpolation for server-rendered email bodies. |

## Smoke + misc

| Module | Purpose |
|---|---|
| `smokeTest.ts` | Self-test helpers used by `ai-test` and the deploy smoke runner. |
| `__tests__/` | Deno test specs for the helpers above. |

## Hard rules
- This is **infrastructure** — every helper here is single-source-of-truth for its concern. Do not duplicate logic in individual edge fns.
- Any new AI fn must use `aiClient.ts` + `modelRouter.ts` (with `featureName`) + `creditUtils.ts` + `scrubSecrets.ts` + (if it touches user content) `contentModeration.ts`.
- `creditLimits.json` is the only place credit-limit numbers may be defined (`replit.md`).
