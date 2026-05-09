# admin-ai-ops / inspect-ai-keys

**Last verified:** 2026-05-09 (Task #9 — NVIDIA NIM key slots, new inspect-ai-keys hub)
**Type:** reference card
**Sources:**
- `appwrite-hubs/inspect-ai-keys/src/main.js` ← **new Appwrite Function (replaces Supabase legacy)**
- `src/components/dev-kit/AIKeysPanel.tsx` ← **new — AI Keys panel UI**
- `src/lib/devkit/aiTestSlotModels.ts`
- Legacy (deleted/stubbed): `supabase/functions/admin-ai-ops/index.ts`, `supabase/functions/_shared/*`

**Canonical owner:** `project-governance/ARCHITECTURE.md` §7 (Edge Functions)

---

## What it does

Multi-action admin router for the DevKit **AI Keys** panel. Handles all operations related to AI provider key inspection, per-slot model selection, and the nightly live model catalog refresh.

**Auth:** Every action requires either `requireAdminAuth` (admin DevKit session) or `requireCronSecretOrVault` (for the cron-triggered refresh). See per-action table below.

---

## Actions

| `x-admin-ai-op` header | Body / method | Auth | Purpose |
|---|---|---|---|
| `inspect-ai-keys` | `GET` or `POST {"action":"inspect-ai-keys","provider?","slot?","model?"}` | `requireAdminAuth` | Returns all configured AI key slots (provider + slot number + active model), the live model catalog (`modelOptions`, `modelOptionsDetailed`), per-provider defaults (`defaultModels`), and saved per-slot overrides (`slotModels`). When `provider + slot + model` are present in the body it saves the model for that slot via `set_ai_test_slot_model` RPC before returning. |
| `refresh-test-models` | `POST {"action":"refresh-test-models"}` | `requireCronSecretOrVault` | Fetches live model lists from OpenRouter (`/api/v1/models`), Groq (`/openai/v1/models`), and DeepSeek (`/v1/models`). Curates each list (free-tier priority, non-chat filter, per-provider cap). Merges with seed lists from `modelDefaults.ts`. Writes the result to `app_settings.ai_test_model_catalog`. Called nightly by `pg_cron` via `private.exec_refresh_ai_test_models()`; also callable manually by an admin. |

---

## Model catalog curation pipeline (`refresh-test-models`)

```
OpenRouter /api/v1/models  ──► curateOpenRouter()  ──┐
Groq       /openai/v1/models ► curateGroq()          ├──► mergeWithSeed() ──► app_settings
DeepSeek   /v1/models        ► curateDeepSeek()      ┘
```

**`curateOpenRouter`**: Skips models matching `OPENROUTER_NON_CHAT_RE` (audio, TTS, embed, OCR, diffusion, guard, router-meta). Promotes free-tier (`:free` slug or zero-cost pricing) first. Caps at `PER_PROVIDER_CAPS.openrouter = 50`.

**`curateGroq`**: Skips `whisper`, `guard`, `tts`, `llava`, `playai` model families. Marks inactive models `deprecated: true`. Caps at `PER_PROVIDER_CAPS.groq = 15`.

**`curateDeepSeek`**: Accepts all models; caps at `PER_PROVIDER_CAPS.deepseek = 15`.

**`mergeWithSeed`**: Appends any seed-only model not in the fresh list as `{ deprecated: true, hint: "Deprecated upstream" }`, ensuring the picker never goes blank even if the upstream API returns nothing.

→ `supabase/functions/_shared/aiTestModelCatalog.ts`

---

## Per-slot model persistence

Saved slot models live in `app_settings.ai_test_slot_models` (JSONB), keyed `${provider}:${slot}` (e.g. `"openrouter:1"`). Written via the `set_ai_test_slot_model` database RPC. Read back in every `inspect-ai-keys` response as `slotModels`.

Frontend: `src/lib/devkit/aiTestSlotModels.ts` (`fetchAITestSlotModels`, `getAITestSlotModel`, `isAITestSlotUsingDefault`).
UI: `src/components/dev-kit/AIKeySlotPanels.tsx` (per-slot Select + save flow with optimistic update and rollback).
Read-only summary card: `src/components/dev-kit/AITestSlotModelsCard.tsx`.

---

## Cron authentication (`requireCronSecretOrVault`)

The `refresh-test-models` action is gated by `requireCronSecretOrVault` from `supabase/functions/_shared/webhookAuth.ts`:

1. **Fast path** — if `CRON_SECRET` env var is set and matches the `x-cron-secret` request header, accept immediately.
2. **Vault path** — if env var is absent or doesn't match (rotation / fresh deploy), calls `getServiceClient().rpc('get_cron_secret_internal')` to read from Supabase Vault. The helper function is a SECURITY DEFINER wrapper created by migration `20260606000000` that is executable only by `service_role`.

The pg_cron job (`private.exec_refresh_ai_test_models()`) reads the secret from `vault.decrypted_secrets` directly at call time and sends it as `x-cron-secret`.

---

## Related

- `Project Atlas/01-Currently Implemented/edge-functions/README.md`
- `Project Atlas/01-Currently Implemented/critical-systems/06-admin-dev-kit.md` (AI Keys panel)
- `Project Atlas/01-Currently Implemented/stability-fixes/task-15-ai-model-catalog-cron.md`
