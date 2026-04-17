# 03 — Providers and Models

> **Purpose:** A precise catalog of the three managed providers, their free-tier limits, and the specific models we plan to use. This is the source for the routing decisions in `04-feature-routing-map.md`.
>
> **⚠ Limits change frequently.** Every number in this doc is dated. Re-verify against each provider's docs before launch and on every config change. The admin dashboard (`08-admin-dashboard-spec.md`) shows live consumption against these limits, so drift is visible.

---

## Provider summary

| Provider | Auth | Request format | Streaming | Vision | Tools/JSON mode | Notes |
|---|---|---|---|---|---|---|
| **Google Gemini** (AI Studio) | API key (`x-goog-api-key` header or query) | Gemini-native (different from OpenAI) | Yes (SSE) | Yes (image + PDF) | Yes (function calling, structured output) | Free tier may use prompts for training. Enable billing to opt out. |
| **Groq** | Bearer token | OpenAI-compatible `/openai/v1/chat/completions` | Yes (SSE) | Limited (Llama 4 only) | Yes | Fastest inference; tighter daily caps. |
| **OpenRouter** | Bearer token | OpenAI-compatible `/api/v1/chat/completions` | Yes (SSE) | Per-model | Per-model | Aggregator — exposes hundreds of models behind one key, including `:free` variants. |

All three speak HTTPS REST and JSON. Two of three are OpenAI-compatible, which simplifies the shared client.

---

## Gemini — free tier limits (per project/key)

**Source:** [ai.google.dev/gemini-api/docs/rate-limits](https://ai.google.dev/gemini-api/docs/rate-limits) — verified April 2026. Re-verify before launch.

| Model | RPM | TPM | RPD | Notes |
|---|---:|---:|---:|---|
| `gemini-2.5-pro` | 5 | 250,000 | 100 | Strongest reasoning. Reserve for premium features. |
| `gemini-2.5-flash` | 10 | 250,000 | 250 | **Default Gemini workhorse.** Strong quality, vision, long context. |
| `gemini-2.5-flash-lite` | 15 | 250,000 | 1,000 | Cheapest/fastest. High-volume low-stakes calls. |
| `gemini-2.0-flash` | 15 | 1,000,000 | 200 | Very high TPM — good for bulk parsing. |
| `gemini-2.0-flash-lite` | 30 | 1,000,000 | 200 | Highest RPM. |
| `text-embedding-004` | 100 | 30,000 | 1,000 | Embeddings — best free embedding model anywhere. |

**Privacy:** On the free tier, Google may use prompts and outputs for product improvement. **Decision recorded in `09-decisions-log.md`:** acceptable for v1 launch.

**Models we'll use in routing:**

- `gemini-2.5-flash` — primary for parsing, JD matching, default Gemini choice.
- `gemini-2.5-pro` — premium reasoning (cover letters, deep analysis).
- `gemini-2.5-flash-lite` — high-volume autocomplete-style fallback.
- `text-embedding-004` — all embedding needs (when we add semantic search).

---

## Groq — free tier limits

**Source:** [console.groq.com/docs/rate-limits](https://console.groq.com/docs/rate-limits) — verified April 2026. Per-model limits, per-account.

| Model | RPM | RPD | TPM | TPD | Notes |
|---|---:|---:|---:|---:|---|
| `llama-3.3-70b-versatile` | 30 | 1,000 | 12,000 | 100,000 | **Default Groq workhorse.** Best general model on Groq's free tier. |
| `llama-3.1-8b-instant` | 30 | 14,400 | 6,000 | 500,000 | Tiny + blazing fast (~50 ms). Autocomplete, suggestions. |
| `deepseek-r1-distill-llama-70b` | 30 | 1,000 | 6,000 | 100,000 | Reasoning model at Groq speed. |
| `qwen/qwen3-32b` | 60 | 1,000 | 6,000 | 500,000 | Strong multilingual; not used in v1 (English only). |

**Models we'll use in routing:**

- `llama-3.3-70b-versatile` — primary for chat, bullet rewriting, summary, anything where Groq's speed pays off.
- `llama-3.1-8b-instant` — autocomplete and suggestions.
- `deepseek-r1-distill-llama-70b` — fallback reasoning if Gemini Pro is throttled.

**Streaming:** Groq supports OpenAI-compatible SSE (`stream: true` in body). The current shared client hardcodes `stream: false`; that needs an opt-in branch.

---

## OpenRouter — free tier limits

**Source:** [openrouter.ai/docs/limits](https://openrouter.ai/docs/limits) — verified April 2026.

- Free models (suffix `:free`): **20 requests/minute** and **50 requests/day** per account.
- Accounts that have ever added $10+ in credit: **1,000 requests/day**.
- Per-model rate limits also apply (provider-side).
- Rate-limit headers (`X-RateLimit-*`) returned on every response.

**Models we'll use in routing:**

| Slug | Why |
|---|---|
| `deepseek/deepseek-chat-v3.1:free` | Strongest free general model on OpenRouter today. JSON-friendly. **Default OpenRouter choice.** |
| `deepseek/deepseek-r1:free` | Reasoning model; "deep analyze resume vs JD" workloads. |
| `meta-llama/llama-3.3-70b-instruct:free` | Already the existing fallback constant (`FALLBACK_MODEL`) in `aiClient.ts`. Solid, well-behaved. |
| `google/gemini-2.0-flash-exp:free` | OpenRouter-hosted Gemini Flash Exp — useful when our direct Gemini key is rate-limited. |

**Important:** OpenRouter model availability shifts. The existing `aiClient.ts` already does **dynamic discovery** of free models from `/api/v1/models` with caching — we keep using that. The model slugs above are the *preferred* picks; if discovery returns better/equivalent free models with higher param count or context, the existing ranking logic (context length desc, then param count desc) will surface them.

---

## Final managed-model picks (the short list that goes into the routing config)

These are the *only* model strings the routing config will reference. Anything else can be tried experimentally but isn't a default.

```ts
export const MODELS = {
  gemini: {
    pro:        'gemini-2.5-pro',
    flash:      'gemini-2.5-flash',
    flashLite:  'gemini-2.5-flash-lite',
    embedding:  'text-embedding-004',
  },
  groq: {
    llama70b:   'llama-3.3-70b-versatile',
    llama8b:    'llama-3.1-8b-instant',
    reasoning:  'deepseek-r1-distill-llama-70b',
  },
  openrouter: {
    chat:       'deepseek/deepseek-chat-v3.1:free',
    reasoning:  'deepseek/deepseek-r1:free',
    safe:       'meta-llama/llama-3.3-70b-instruct:free',
  },
} as const;
```

---

## Capacity envelope at launch (rough back-of-the-envelope)

Assuming the worst-case routing where every call hits the *primary* of its feature:

| Provider | Primary daily allotment we expect to use | Free tier ceiling | Headroom |
|---|---:|---:|---:|
| Groq (Llama 3.3 70B) | ~600 calls/day | 1,000 RPD | OK; warn at 80% |
| Gemini (2.5 Flash) | ~200 calls/day | 250 RPD | Tight; warn at 70% |
| Gemini (2.5 Pro) | ~50 calls/day | 100 RPD | OK; reserved for premium |
| OpenRouter (free) | ~30 calls/day baseline | 50 RPD (or 1,000 with credit) | **Tight without $10 credit.** Recommended: add $10 once to lift cap. |

**If any single provider is at >70% of its daily limit, the dashboard shows an amber badge and the router automatically prefers fallbacks for non-critical features for the rest of the day.** (Implementation detail in `05-implementation-plan.md` Phase 5.)

---

## What changes when paid tiers are enabled later

Each provider's transition from free → paid is a billing toggle, not a code change:

- **Gemini:** Enable billing on the GCP project tied to `GEMINI_API_KEY`. Limits jump 100×–1,000×. Training-on-prompts is disabled by default.
- **Groq:** Add a credit card in `console.groq.com`. Limits scale with tier.
- **OpenRouter:** Add credit on the account. Free models still free; paid models become accessible.

**Routing config does not change.** Only the dashboard's "limit" numbers are bumped.
