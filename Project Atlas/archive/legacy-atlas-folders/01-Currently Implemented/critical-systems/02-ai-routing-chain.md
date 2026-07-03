# AI Routing — 8-Step Priority Chain

**Last verified:** 2026-04-17
**Type:** deep dive
**Sources:**
- `supabase/functions/_shared/aiClient.ts`
- `supabase/functions/_shared/creditUtils.ts`
- `project-governance/ARCHITECTURE.md` §8 (AI Routing Priority Chain + 8-step list)
- `replit.md` (AI System section + wise-ai-chat full fix)
- `Routing AI Providers/01-current-state.md`, `02-target-architecture.md`, `04-feature-routing-map.md`

**Canonical owner:** `project-governance/ARCHITECTURE.md` §8 (current behavior).
For the **planned** unified per-feature routing layer, the canonical source is `Routing AI Providers/README.md` and that folder's 10 numbered docs — see `02-Planned/ai-routing-rollout.md`.

---

## What `callAI()` does today

Every AI-facing edge function calls `callAI(...)` from `supabase/functions/_shared/aiClient.ts`. That function walks an 8-step priority chain in order, stopping at the first provider that succeeds.

| # | Step | Trigger | Notes |
|---|---|---|---|
| 1 | User BYOK — direct providers | OpenAI, Anthropic, Groq, Mistral, xAI, or Cohere key in `user_api_keys` | Strict mode: if a user has any BYOK key, no silent fallback to platform keys |
| 2 | User BYOK — OpenRouter | User OpenRouter key + arbitrary model slug | |
| 3 | User BYOK — Ollama | Custom base URL + local model | For self-hosted LLMs |
| 4 | User BYOK — Gemini | User Gemini key | |
| 5 | Platform OpenRouter | `OPENROUTER_API_KEY` Supabase secret | Fetches available free models, ranks by context × parameter count, tries best with 8 s per-model timeout |
| 6 | Platform Groq fallback | `GROQ_API_KEY` Supabase secret | Llama 3.3 70B, used when OpenRouter is rate-limited or unavailable |
| 7 | Legacy Gemini key | `GEMINI_API_KEY` Supabase secret | Last platform-managed resort |
| 8 | Abort | All steps exhausted | Returns AI error to caller |

Steps 1–4 are user-controlled. Steps 5–7 are platform-managed. → `project-governance/ARCHITECTURE.md` §8.

## Hard vs skippable errors (BYOK strict mode)

- Invalid key / payment required → **abort immediately**, surface error.
- Rate limit / 5xx / model 404 → **advance to next step in chain**.

→ `project-governance/ARCHITECTURE.md` §8 (BYOK section).

## Timing constants (current)

- `PER_MODEL_TIMEOUT_MS` = 8 s (was 15 s before the 2026-04-13 fix)
- Max 3 models attempted per provider
- Outer timer = 40 s (was 90 s)
These values exist because Supabase's gateway times out the function at 60 s — the cascade had to fit inside that. → `replit.md` (wise-ai-chat full fix, 2026-04-13).

## BYOK provider allowlist (must stay in sync)

The BYOK allowlist is enforced in `supabase/functions/_shared/creditUtils.ts` (BYOK users skip credit deduction). Adding or removing a provider in `aiClient.ts` requires the matching change in `creditUtils.ts` — otherwise a user could either be charged on their own key or bypass credits without owning a key. → `project-governance/ARCHITECTURE.md` §8 + `replit.md` (Security Audit).

## Hard rules (do not break)

- **Rule B (Architecture §2):** `score-resume` makes **no AI call** and **must not** deduct credits. Its scoring lives in `_shared/scoringFunctions.ts` and stays deterministic.
- **Rule A (Architecture §2 — Four-Layer Security Invariant):** every AI endpoint enforces, in order: JWT auth → rate limit → atomic credit check → payload size guard. See `critical-systems/09-security-model.md`.

## Files that must stay in sync

| File | Role |
|---|---|
| `supabase/functions/_shared/aiClient.ts` | Implements the 8-step chain + timeouts |
| `supabase/functions/_shared/creditUtils.ts` | BYOK allowlist + credit deduction |
| `supabase/functions/_shared/planLimits.ts` | Server-side daily credit caps |
| `src/lib/planConfig.ts` | Frontend-side daily credit caps (must match server) |
| `supabase/config.toml` | `verify_jwt = false` for every AI function |

## Where the planned future state lives

The unified per-feature routing layer (smart fallback, streaming, caching, admin dashboard) is **planned, not built**. All design docs live under `Routing AI Providers/`. See `Project Atlas/02-Planned/ai-routing-rollout.md` for the index.
