# Task #15 — DevKit AI Model Catalog: Cron Fix, Per-Provider Caps, Non-Chat Filter

**Last verified:** 2026-05-11
**Type:** reference card
**Sources:**
- `supabase/functions/_shared/aiTestModelCatalog.ts`
- `supabase/functions/_shared/modelDefaults.ts`
- `supabase/functions/_shared/webhookAuth.ts`
- `supabase/functions/admin-ai-ops/index.ts`
- `supabase/migrations/20260606000000_configure_ai_model_catalog_cron.sql`
- `supabase/functions/_shared/__tests__/aiTestModelCatalog.test.ts`
**Canonical owner:** `project-governance/ARCHITECTURE.md` §7 (Admin & Dev Kit) for the DevKit surface; `supabase/functions/_shared/aiTestModelCatalog.ts` for curation logic.

---

## What was wrong

Four root causes prevented the DevKit AI Key Slots panel from ever showing a live model catalog:

1. **Cron never ran.** The two prior migrations (`20260520000001`, `20260503000001`) both required `app.cron_secret` and `app.edge_functions_url` GUCs to be set as database-level settings via `ALTER DATABASE` before they would schedule the job. Those GUCs were never set in production, so both migrations silently skipped the `cron.schedule()` call. The nightly refresh had never executed. The panel was showing only the 6-entry hardcoded seed list.

2. **Per-provider cap too small.** `PER_PROVIDER_CAP` was a single constant of `15`, applied to every provider. OpenRouter alone has 30+ free-tier models that should be offered; a cap of 15 silently dropped half of them.

3. **Seed list stale.** Default seeds included `google/gemma-2-9b-it:free` and `mistralai/mistral-7b-instruct:free`, neither of which appeared in OpenRouter's current free-tier live list. Stale seeds in `mergeWithSeed` survive as deprecated entries — cluttering the picker with models that no longer work.

4. **No non-chat filter.** `curateOpenRouter` admitted any model whose ID contained no obvious non-chat keyword. Audio transcription (`whisper`), text-to-speech (`tts`), embedding (`embed`), image generation (`diffusion`), OCR, reranking, and router-meta (`openrouter/free`, `openrouter/owl`) models all leaked into the catalog. The DevKit test-request flow only sends chat completions, so those models always failed.

---

## What changed

### `supabase/functions/_shared/aiTestModelCatalog.ts`

| Change | Detail |
|---|---|
| `PER_PROVIDER_CAP = 15` | Kept as legacy export for backward compatibility |
| `PER_PROVIDER_CAPS` (new) | `Record<AITestProvider, number>` — `openrouter: 50`, `groq: 15`, `deepseek: 15` |
| `OPENROUTER_NON_CHAT_RE` | Exported regex that filters `lyria`, `whisper`, `tts`, `embed`, `clip`, `ocr`, `rerank`, `guard`, `diffusion`, `openrouter/(free\|owl)` from the catalog before curation |
| `curateOpenRouter` | Now calls `OPENROUTER_NON_CHAT_RE.test(id)` early in the loop and skips matching models |

→ `supabase/functions/_shared/aiTestModelCatalog.ts:54-99`

### `supabase/functions/_shared/modelDefaults.ts`

Seed list refreshed to confirmed-live models as of 2026-05-05:

**OpenRouter (15 seeds):** `meta-llama/llama-4-maverick:free`, `meta-llama/llama-4-scout:free`, `meta-llama/llama-3.3-70b-instruct:free`, `google/gemma-3-27b-it:free`, `google/gemma-3-12b-it:free`, `deepseek/deepseek-chat-v3-0324:free`, `qwen/qwen3-32b:free`, `qwen/qwen3-8b:free`, `microsoft/phi-4-reasoning:free`, `mistralai/devstral-small:free`, `tngtech/deepseek-r1t-chimera:free`, `openrouter/optimus-alpha`, `openrouter/quasar-alpha`, `nousresearch/deephermes-3-llama-3-8b:free`, `bytedance-research/ui-tars-72b:free`.

**Groq (7 seeds):** `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `llama-3.1-70b-versatile`, `gemma2-9b-it`, `llama3-70b-8192`, `llama3-8b-8192`, `mixtral-8x7b-32768`.

**DeepSeek (2 seeds):** `deepseek-chat`, `deepseek-reasoner` (unchanged).

→ `supabase/functions/_shared/modelDefaults.ts`

### `supabase/migrations/20260606000000_configure_ai_model_catalog_cron.sql`

Fully self-contained migration — no manual steps required:

| Step | What it does |
|---|---|
| 1 | `INSERT INTO vault.secrets … ON CONFLICT DO NOTHING` — auto-seeds `vault.cron_secret` with `gen_random_uuid()` if no row exists. Idempotent. |
| 2 | Creates `private` schema (not exposed by PostgREST). Creates `private.exec_refresh_ai_test_models()` SECURITY DEFINER — reads `cron_secret` from Vault at call time; resolves the edge-function URL from `app.edge_functions_url` GUC first (environment-portable), falling back to the production project URL (`jnsfmkzgxsviuthaqlyy`) if the GUC is unset. Calls `net.http_post` with the secret in `x-cron-secret`. |
| 3 | Creates `public.get_cron_secret_internal()` SECURITY DEFINER — grants `EXECUTE` to `service_role` only, revokes from `PUBLIC`. Edge functions call this via `getServiceClient().rpc('get_cron_secret_internal')` because PostgREST does not expose the `vault` schema by default. |
| 4 | Schedules `refresh_ai_test_models` pg_cron job at `17 3 * * *` (03:17 UTC nightly). Idempotent (unschedules existing job first). |
| 5 | Soft-fails `ALTER DATABASE postgres SET "app.edge_functions_url"` — requires superuser; silently catches `insufficient_privilege` and emits `RAISE NOTICE`. |

→ `supabase/migrations/20260606000000_configure_ai_model_catalog_cron.sql`

### `supabase/functions/_shared/webhookAuth.ts`

`requireCronSecretOrVault(req, corsHeaders)` (new async function):
- **Fast path**: `CRON_SECRET` env var is set and matches the `x-cron-secret` header → accept immediately (no DB round-trip).
- **Fall-through**: if env var is absent OR doesn't match (rotation / fresh-deploy transition), falls through to the Vault path. Does NOT hard-fail on env-var mismatch so either credential is accepted during the rotation window.
- **Vault path**: calls `getServiceClient().rpc('get_cron_secret_internal')` → compares using constant-time comparison.
- **Neither matches**: `console.error` + `throw unauthorized(corsHeaders)`.

`requireCronSecret(req, corsHeaders)` (existing sync function) is unchanged — used by `transactional-email`, `weekly-digest`, `wisehire-invite-reminder`.

→ `supabase/functions/_shared/webhookAuth.ts:195-252`

### `supabase/functions/admin-ai-ops/index.ts`

`refresh-test-models` action gated on `await requireCronSecretOrVault(req, corsHeaders)` (previously used a simpler env-var-only check).

→ `supabase/functions/admin-ai-ops/index.ts:1043`

### `supabase/functions/_shared/__tests__/aiTestModelCatalog.test.ts`

Three new test cases added:
- `OPENROUTER_NON_CHAT_RE — matches non-chat model slugs` (12 slugs: whisper, tts, embed, clip, ocr, guard, diffusion, lyria, openrouter/free, openrouter/owl, …)
- `OPENROUTER_NON_CHAT_RE — does NOT match chat model slugs` (10 slugs: llama-4-maverick, gemma-3, claude-3.5-sonnet, phi-4-reasoning, …)
- `curateOpenRouter — filters non-chat models via OPENROUTER_NON_CHAT_RE` (integration test: 3 non-chat + 2 chat inputs, asserts non-chat excluded from output)

Existing `PER_PROVIDER_CAP` reference updated to `PER_PROVIDER_CAPS.openrouter`.

→ `supabase/functions/_shared/__tests__/aiTestModelCatalog.test.ts`

---

## Known limitations / follow-up notes

### Staging environments must set `app.edge_functions_url`

`private.exec_refresh_ai_test_models()` resolves the edge-function URL in this order:

1. `current_setting('app.edge_functions_url', true)` — environment-portable GUC.
2. Hard-coded production URL `https://jnsfmkzgxsviuthaqlyy.supabase.co/functions/v1` — fallback when the GUC is absent.

**Risk:** Any non-production Supabase project that does not set `app.edge_functions_url` will have its nightly pg_cron job POST to the *production* edge function instead of its own. This is safe only as long as the same `vault.cron_secret` value is used across both projects (unlikely). For all staging or development Supabase projects, set the GUC:

```sql
ALTER DATABASE postgres SET "app.edge_functions_url" = 'https://<staging-project-ref>.supabase.co/functions/v1';
```

(Requires superuser; the migration's step 5 soft-fails if the role is insufficient.)

### `moonshard` Groq seed gap

The Groq seed list in `modelDefaults.ts` does not include `moonshard`. If `moonshard` is currently active in the target Groq environment, add it to the `groq` seed array to ensure it always appears as a fallback even when the live Groq `/openai/v1/models` fetch fails:

```ts
// supabase/functions/_shared/modelDefaults.ts
{ provider: 'groq', id: 'moonshard' },
```

Verify upstream availability before adding: `GET https://api.groq.com/openai/v1/models` with the managed `GROQ_API_KEY`. If the model appears, add it; it will be promoted to the live list on the next catalog refresh.

---

## Production state after this task (2026-05-05)

| Item | State |
|---|---|
| `CRON_SECRET` Edge Function Secret | `99565125-...` (36-char UUID) |
| `vault.cron_secret` row | Same value, secret_id `27dc6608-c0d1-4964-a3e1-011eb1c9c166` |
| `private.exec_refresh_ai_test_models()` | Deployed, GUC-aware |
| `public.get_cron_secret_internal()` | Deployed, `service_role` only |
| pg_cron job | `jobid=2`, `refresh_ai_test_models`, `17 3 * * *`, `active=true` |
| Last catalog refresh | `2026-05-05T03:38:44Z` — 50 OpenRouter + 11 Groq + 2 DeepSeek |
| GitHub commit | `314762b` |

---

## Runbook — manual catalog refresh

```bash
curl -X POST "https://jnsfmkzgxsviuthaqlyy.supabase.co/functions/v1/admin-ai-ops" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: <value from vault.decrypted_secrets WHERE name='cron_secret'>" \
  -H "x-admin-ai-op: refresh-test-models" \
  -d '{"action":"refresh-test-models"}'
```

Or trigger from DevKit → AI Keys panel → "Refresh catalog" button (admin auth).
