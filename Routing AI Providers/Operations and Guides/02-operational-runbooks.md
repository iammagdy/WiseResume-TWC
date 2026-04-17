# 02 — Operational Runbooks

> **Audience:** Engineer or AI agent operating the system. The non-technical reader can skim section A (key rotation) and the "What you'll see in the dashboard" callouts.
>
> **What's a runbook?** A step-by-step recipe for handling a specific operational event. Each section below is one runbook.
>
> **Prerequisites:** All references to tables, columns, RPCs, secrets, and edge function names below are verified against `../01-current-state.md`. Slugs and routing decisions are verified against `../03-providers-and-models.md` and `../04-feature-routing-map.md`.

---

## Index

- **A.** Rotate a leaked or expired API key (`GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`)
- **B.** A provider is fully down (Gemini / Groq / OpenRouter outage)
- **C.** A provider is approaching its daily limit (amber → red gauge in dashboard)
- **D.** Disable a single feature temporarily (kill switch)
- **E.** Manually purge the response cache (whole table or one feature)
- **F.** Investigate a single suspicious AI call (one user, one timestamp)
- **G.** Roll back a phase of the implementation plan
- **H.** Add a new edge function to the routing layer (post-launch)
- **I.** Bump a free-tier limit after enabling billing on a provider

---

## A. Rotate a leaked or expired API key

**When to use:** A key was accidentally committed to a public place, shared on a screenshot, suspected of misuse, or the dashboard shows persistent 401/403 errors from one provider.

**Effect on users:** Zero downtime if done in this order — the new key is active before the old one is revoked.

### A.1 Gemini

1. Open [https://aistudio.google.com](https://aistudio.google.com) → "Get API key" → click **"Create API key"** to generate a fresh one. Do **not** delete the old one yet.
2. Copy the new key (starts with `AIzaSy...`).
3. In Replit Secrets, **edit** the existing `GEMINI_API_KEY` entry and replace the value with the new key.
4. Restart the workflow `Start application` so edge functions pick up the new env var.
5. Verify by checking the DevKit "AI Activity" dashboard's **Provider mix** chart for the next 5 minutes. You should see Gemini calls succeeding (green); no spike in 401/403 in the **Errors** section.
6. Once you confirm success, return to AI Studio and **delete the old key** from the keys list.

### A.2 Groq

1. Open [https://console.groq.com](https://console.groq.com) → **API Keys** → click **"Create API Key"**.
2. Copy the new key (starts with `gsk_...`).
3. Replace the value of `GROQ_API_KEY` in Replit Secrets.
4. Restart the workflow `Start application`.
5. Verify in dashboard.
6. **Delete the old key** in the Groq console.

### A.3 OpenRouter

1. Open [https://openrouter.ai/keys](https://openrouter.ai/keys) → click **"Create Key"**. (Optionally set a credit limit on the new key — see doc 01 in this folder.)
2. Copy the new key (starts with `sk-or-v1-...`).
3. Replace the value of `OPENROUTER_API_KEY` in Replit Secrets.
4. Restart the workflow.
5. Verify in dashboard.
6. **Disable** the old key in the OpenRouter console (don't delete — disabling lets you re-enable in case the new one fails verification).

### What you'll see in the dashboard

- A 1–2 minute dip in successful calls for that provider while the workflow restarts.
- Then a return to baseline.
- If after 5 minutes the provider's error rate is still elevated, the new key is likely wrong (whitespace, copied incomplete) — re-do steps 1–4.

---

## B. A provider is fully down

**Trigger:** The dashboard's per-provider status badge for one of `gemini`, `groq`, `openrouter` flips to red, and the **last 429/5xx timestamp** is within the last 5 minutes.

**Effect on users:** None, *if* the failure is detected and demoted in time. The fallback chain in `../04-feature-routing-map.md` automatically routes around a single dead provider — every feature has at least one alternative.

### Steps

1. **Confirm it's the provider, not us.** Open the provider's status page in a separate tab:
   - Gemini: [https://status.cloud.google.com](https://status.cloud.google.com) (search "Generative Language API" or "Vertex AI")
   - Groq: [https://groqstatus.com](https://groqstatus.com)
   - OpenRouter: [https://status.openrouter.ai](https://status.openrouter.ai) (or check `@OpenRouterAI` on X/Twitter)
2. If the provider confirms an incident, **demote them in the routing config** to short-circuit retries:
   - Open `supabase/functions/_shared/aiRouting.ts` (will exist after Phase 1).
   - At the top of the file, set the provider-level kill switch:

     ```ts
     export const PROVIDER_HEALTH_OVERRIDE = {
       gemini: 'down',     // set to 'down' to skip this provider entirely
       groq: 'healthy',
       openrouter: 'healthy',
     } as const;
     ```

   - Re-deploy the affected edge functions (or `supabase functions deploy --all` if speed matters).
3. The router will now **skip the dead provider entirely** — no wasted retry latency. Every feature routes straight to its first fallback.
4. **Monitor the dashboard.** Cache hit rate should rise (because more diverse fallbacks are being hit), and overall error rate should drop back to baseline within 1–2 minutes.
5. **Once the provider's status page goes green**, set `PROVIDER_HEALTH_OVERRIDE.<provider>` back to `'healthy'` and re-deploy.

### What you'll see in the dashboard

- Before override: high error count and high latency for the affected provider; cascading into "fallback rate" rising on all features that primary-route to it.
- After override: provider's call count drops to 0 (because it's bypassed); other providers' call counts rise; overall success rate returns to ~100%.

### What if **two** providers are down?

Same procedure, set two flags. Every feature in `04-feature-routing-map.md` has at least three providers in its chain except for ones explicitly marked `BYOK-only`. If all three managed providers are down, accept downtime — that's a signal to enable paid billing on at least one (see runbook I).

---

## C. A provider is approaching its daily limit

**Trigger:** The dashboard's per-provider gauge crosses 70% (amber) or 90% (red) of the declared daily limit.

**Effect on users:** None at amber. At red, the router automatically prefers fallbacks for non-critical features (the auto-throttle described in `../03-providers-and-models.md` and `../05-implementation-plan.md` Phase 5). You only intervene if you want manual control.

### Steps at amber (70–90%)

1. Open the dashboard → **Free-tier gauges** section.
2. Note which model on which provider is hot (e.g. `gemini · gemini-2.5-flash` at 78% of 250 RPD).
3. **Decide:** is the spike from organic growth (good — prepare to enable billing) or a runaway loop (bad — investigate)?
4. Open **Top features today** chart. If one feature is consuming 80%+ of the calls to that model, that's worth investigating — could be a frontend bug calling the endpoint in a loop.
5. If organic, no action needed. The auto-throttle will engage at 90% if you don't enable billing first.

### Steps at red (>90%)

1. The router has already begun preferring fallbacks. You should see other providers' call counts rising.
2. **If you want to flip to paid tier immediately** (recommended for Gemini if you're at 90% of `gemini-2.5-pro` because Pro has the lowest free RPD): see runbook I.
3. **If you want to manually disable a single non-critical feature** to save quota: see runbook D.
4. **If you want to do nothing**: that's fine. The router will keep using fallbacks until UTC midnight resets the daily counter.

### What you'll see in the dashboard

- Amber: gauge color changes to amber. No automatic action.
- Red: gauge color changes to red. Provider mix chart shifts toward fallbacks. "Fallback rate" KPI rises temporarily.

---

## D. Disable a single feature temporarily (kill switch)

**When to use:** A specific feature is misbehaving (e.g. `cover_letter.generate` is producing garbage because of a prompt regression), and you want to disable it without taking down the rest of the AI surface.

### Steps

1. Open `supabase/functions/_shared/aiRouting.ts`.
2. Locate the feature in `FEATURE_ROUTES` (e.g. `'cover_letter.generate'`).
3. Add a `disabled: true` flag to the route entry:

   ```ts
   'cover_letter.generate': {
     disabled: true,           // ← add this
     primary:  { provider: 'gemini', model: MODELS.gemini.pro },
     fallbacks: [/* ... */],
     // ... rest unchanged
   },
   ```

4. The `callAIForFeature()` function (per the contract in `../05-implementation-plan.md`) returns a structured "feature temporarily unavailable" error when `disabled: true`. The edge function then surfaces a friendly message to the user.
5. Re-deploy the affected edge function (`generate-cover-letter` in this example).
6. **Communicate.** Post a banner in-app or on a status page if many users are affected.
7. Once the underlying issue is fixed, remove the `disabled: true` line and re-deploy.

### What you'll see in the dashboard

- Calls to that feature drop to 0.
- A banner in the **Feature health** widget (per dashboard spec section 6 in `../08-admin-dashboard-spec.md`) shows the feature is in maintenance mode.

---

## E. Manually purge the response cache

**When to use:**
- A prompt template was changed and stale cached responses are now wrong.
- A single user reports getting a stale answer for a specific input (rare; usually only happens if you tweaked logic without bumping the prompt version).
- You want to free space.

> **Important schema note:** the cache table is **`ai_cache`** (not `ai_response_cache`) per `../05-implementation-plan.md` Phase 2. Its columns are `id, feature_key, input_hash, response, model_used, provider_used, hit_count, created_at, expires_at`. There is **no `cache_scope_user_id` or `cache_scope_tenant_id` column** — per `../07-caching-design.md`, the user_id / tenant_id is folded into `input_hash` itself (SHA-256 of the keyParts). This has consequences for per-user purge, see E.4.

### E.1 Purge everything

```sql
TRUNCATE TABLE ai_cache;
```

This is safe in the sense that the worst-case outcome is **higher latency and higher provider quota usage for the next ~24 hours** as caches re-warm. There is no data loss — every cached entry is a derived response that can be regenerated.

### E.2 Purge one feature

Use the admin RPC defined in `../07-caching-design.md` section "Operator manual purge":

```sql
SELECT purge_ai_cache('resume.parse');
```

…which executes `DELETE FROM ai_cache WHERE feature_key = 'resume.parse';` server-side. There is also a **"Clear cache" button per feature** in the DevKit AI Activity dashboard.

### E.3 Purge stale entries only (recommended nightly cron)

```sql
DELETE FROM ai_cache WHERE expires_at < NOW();
```

This removes only entries that are past their TTL (which the lookup query already ignores, so this is purely a space optimization). Per `../07-caching-design.md` line 171, the recommended schedule is `expires_at < NOW() - INTERVAL '7 days'` to keep recently-expired rows around briefly for debugging.

### E.4 Purge one user's cache (privacy / GDPR request)

**This cannot be done by SQL filter on `user_id`** — per `../07-caching-design.md`, the user_id is hashed into `input_hash` along with the input bytes. There is no `user_id` column to filter on. Two acceptable approaches:

1. **Wait for natural TTL expiry.** All per-user cache entries have a TTL ≤ 7 days (see `../04-feature-routing-map.md`). After the user's account is deleted, their cached entries are unreachable (no future request can produce the same hash because the user is gone) and disappear within 7 days at the latest.
2. **Purge the whole feature** via E.2 if regulatory urgency requires it. This is a hammer — it wipes everyone's cache for that feature — but it is allowed because cache loss is non-destructive.

For per-tenant entries (WiseHire), the same reasoning applies: tenant_id is hashed in. Use option 1 or 2.

**This is a known design constraint, accepted in `../07-caching-design.md`** in exchange for cache-key safety (no risk of cross-user collisions). If a future requirement makes selective per-user purge mandatory, the schema would need to add explicit `user_id` / `tenant_id` columns alongside `input_hash` — that is a deliberate Phase-future decision, not a runbook fix.

### What you'll see in the dashboard

- "Cache hit rate" KPI dips temporarily, then recovers as the cache re-warms.
- "Calls today" briefly rises for cacheable features.

---

## F. Investigate a single suspicious AI call

**When to use:** A user reports a bad response, a security concern flags a request, or you want to spot-check what the system actually did for a specific call.

### Step 1 — find the call

```sql
SELECT
  id,
  user_id,
  feature_key,
  provider_used,
  model_used,
  fallback_depth,
  cache_hit,
  prompt_tokens,
  completion_tokens,
  total_tokens,
  latency_ms,
  error_type,        -- NULL on success; otherwise 'rate_limit' | 'timeout' | 'auth' | 'unknown' | …
  created_at
FROM ai_usage_logs
WHERE user_id = '<user-uuid>'
  AND created_at >= '<approximate-timestamp>'::timestamptz - interval '5 minutes'
  AND created_at <= '<approximate-timestamp>'::timestamptz + interval '5 minutes'
ORDER BY created_at;
```

(The new columns — `feature_key`, `provider_used`, `model_used`, `prompt_tokens`, `completion_tokens`, `total_tokens`, `latency_ms`, `fallback_depth`, `cache_hit`, `error_type` — are added in `../05-implementation-plan.md` Phase 2 and are NULL for pre-migration rows. There is no separate `status` column — success is `error_type IS NULL`.)

### Step 2 — interpret

| You see | Meaning |
|---|---|
| `provider_used = 'gemini'`, `fallback_depth = 0`, `error_type IS NULL` | Primary provider succeeded, normal path. |
| `provider_used = 'openrouter'`, `fallback_depth = 1`, `error_type IS NULL` | Primary failed, first fallback succeeded. The `error_type` of the prior failed attempt is captured in a separate row only if Phase 4 logs each attempt (per `../05-implementation-plan.md` — only the final outcome is logged by default; per-attempt logging is optional). |
| `cache_hit = true` | Response served from cache; no provider call made. |
| `error_type IS NOT NULL` | All providers exhausted. User saw a friendly error per D10. |
| `prompt_tokens` very large (e.g. >50k) | Either a long input (resume + JD) or a prompt-injection attempt. Inspect the request payload. |

### Step 3 — if needed, inspect the original request

Request bodies are **not** stored in `ai_usage_logs` (privacy decision D6 in `../09-decisions-log.md`). If you need to reconstruct what was sent, ask the user to reproduce the action, then watch the live logs in the Replit workflow console while they do it.

---

## G. Roll back a phase of the implementation plan

**When to use:** A phase introduces a regression detected in production.

Each phase in `../05-implementation-plan.md` has a corresponding rollback section in `../10-risks-and-rollback.md`. The general principles:

- **Phases 0–2 (config + schema additions)**: rollback = drop the new columns / tables. No user-visible effect because nothing reads them yet.
- **Phase 3 (extending `aiClient.ts` to add Gemini as a managed provider)**: rollback = revert the diff. Existing OpenRouter ↔ Groq path is unchanged.
- **Phases 4–5 (per-function migrations + auto-throttle)**: rollback = revert just the affected functions. Migrations are one-by-one specifically so individual rollback is cheap. See doc 03 in this folder for the migration template.
- **Phase 6 (streaming)**: rollback = flip a feature flag (`STREAMING_ENABLED = false` in `aiRouting.ts`). All features fall back to one-shot.
- **Phase 7 (caching)**: rollback = flip a feature flag (`CACHING_ENABLED = false`). All features bypass the cache.
- **Phase 8 (dashboard)**: dashboard is read-only — rollback is just hiding the new tab.

**The cardinal rule:** revert only the phase that's broken, never multiple at once. Every phase is designed to be independently reversible.

---

## H. Add a new edge function to the routing layer (post-launch)

**When to use:** You add a new AI feature to the product after the routing layer is live.

### Steps

1. **Pick a feature key** following the `<domain>.<verb>` convention. Examples in `../04-feature-routing-map.md` Routing Key Conventions.
2. **Add a row to `04-feature-routing-map.md`**: primary provider+model, fallback chain, streaming, cache, cost. Get user approval on the policy before any code.
3. **Add the entry to `FEATURE_ROUTES` in `aiRouting.ts`** to match the row exactly.
4. **In the new edge function**, call `callAIForFeature({ featureKey: 'your.new_feature', messages, userId })` — never `callAI()` directly.
5. **Smoke-test using doc 04 (Test Plan)** in this folder.
6. **Verify the dashboard shows the new feature** under Top features within 10 minutes of first call.

The Phase 1 validator (per `../05-implementation-plan.md`) will refuse to start if `FEATURE_ROUTES` has fewer providers than required (≥2 per chain) or references unknown model slugs — so you'll catch most mistakes at boot.

---

## I. Bump a free-tier limit after enabling billing on a provider

**When to use:** Free-tier limits are too tight; you've enabled paid billing on a provider; the dashboard is still showing the old (low) limit numbers.

### Steps

1. Enable billing in the provider's console (instructions per provider in `../03-providers-and-models.md` "What changes when paid tiers are enabled later").
2. **Update the declared limits** in two places **only**:
   - `../03-providers-and-models.md` — the limit tables (this is the source of truth).
   - `aiRouting.ts` — the `PROVIDER_LIMITS` constant (mirrors the doc).
3. Re-deploy the edge functions.
4. The dashboard reads the limits from `aiRouting.ts` directly, so the gauges' max values update on the next refresh.
5. **Routing config is not changed.** No code changes to `FEATURE_ROUTES`. Only the gauge denominators move.

---

## Cron jobs to set up (operational hygiene)

| Schedule | Job | Why |
|---|---|---|
| Daily, UTC 00:30 | `DELETE FROM ai_cache WHERE expires_at < NOW() - INTERVAL '7 days';` | Reclaim space; never affects correctness. The 7-day grace window matches `../07-caching-design.md` line 171. |
| Daily, UTC 00:35 | `DELETE FROM ai_usage_logs WHERE created_at < NOW() - INTERVAL '90 days';` | Retention policy. 90 days = enough for analysis, short enough for privacy. **Note: no D-decision in `../09-decisions-log.md` locks this number** — adjust freely per your published privacy policy. |
| Hourly | `REFRESH MATERIALIZED VIEW CONCURRENTLY ai_provider_status_today;` (if Phase 8 introduces a materialized view for dashboard speed) | Keeps the dashboard snappy. |

These can be configured via Supabase's pg_cron extension. The exact statements above are safe and idempotent.

---

## Escalation: what to do if you're truly stuck

In order:

1. Read the dashboard. If the situation isn't visible there, the dashboard has a gap — file an issue.
2. Check the Replit workflow console logs for the `Start application` workflow.
3. Check Sentry (if `SENTRY_DSN` is set).
4. Re-read the relevant section of `../10-risks-and-rollback.md` — the risk register anticipates many of the failure modes encoded in this runbook.
5. Last resort: roll back the most recent phase (runbook G) and reconvene.
