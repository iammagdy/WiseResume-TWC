# resume-section-ai

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/functions/resume-section-ai/index.ts`, plus per-action handlers `enhance.ts`, `tailor.ts`, `fillGap.ts`, `explainGap.ts` (Task #56)

---

## What it does

Consolidated router for the 4 resume-section AI functions. Replaces (4 → 1):

| Action | Was | Purpose |
|---|---|---|
| `enhance` | `enhance-section` | Inner sub-router: `generate / improve / ats_optimize / fix_error / …` for a single resume section |
| `tailor` | `tailor-section` | Tailor a single section to a target job description |
| `fill-gap` | `fill-gap` | AI-generates content for a missing/empty section |
| `explain-gap` | `explain-gap` | AI explains employment-history gaps for cover letters / interview prep |

Each per-action handler module is byte-for-byte equivalent to its pre-merge `serve()` body (auth, credit deduct/refund, model routing, prompts, response shapes, kill-switch / rate-limit keys preserved verbatim).

## Dispatch

- **Primary:** `x-resume-section-ai-action` header — used because `enhance`'s body already carries its own inner `body.action` (generate/improve/…) which would collide with router-level dispatch.
- **Fallback:** top-level `body.action` (safe for tailor/fill-gap/explain-gap whose originals never read body.action).

## Auth + payload guards (router boundary)

- `requireAuth` runs ONCE at the top of the router BEFORE body parse (matches each pre-merge function's first-line ordering).
- Content-Length-based payload guard: 500 KiB ceiling at the router boundary (the largest per-handler ceiling). Per-handler `checkPayloadSize` calls still run inside each handler with their original (sometimes stricter, e.g. tailor's 200 KiB) limits.

## Per-handler invariants

Kill-switch / payload-size / rate-limit / credit-deduct flow stays INSIDE each handler so credit-refund-on-AI-error semantics remain byte-for-byte identical to pre-merge functions. Per-action credit costs, refund paths, and validation ordering all differ across handlers.

## CORS

OPTIONS handled BEFORE auth (preflight succeeds without a token).
