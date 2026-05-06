# Task #66 — Tailor AI Reliability

**Last verified:** 2026-05-06
**Type:** Reliability / error handling
**Files touched:**
- `supabase/functions/tailor-resume/index.ts`
- `src/lib/aiTailor.ts`

---

## What was built

### A — Prompt token-budget guard

**Problem:** Users with long resumes (10+ jobs, many bullet points) could receive "text too long" / context-length errors from the AI model. The raw job description was capped at 15 KB, but the assembled prompt (resume JSON + job signals + examples + system instructions) could still exceed the model's context window.

**Fix — Pre-trim (before prompt assembly):**
`experienceForPrompt` is computed from `resume.experience`. If `JSON.stringify(experienceForPrompt).length > 30_000` AND the resume has more than 3 jobs, achievements on all jobs beyond the 3 most recent are capped to 2 bullets each. The 3 most recent jobs remain fully intact.

Log output: `[tailor] Prompt truncated: reduced experience bullets from N to M (X jobs, oldest trimmed to 2 achievements)`

**Fix — Post-trim (after prompt assembly):**
After building `systemPrompt` + `userPrompt`, total character count is checked against `PROMPT_CHAR_BUDGET = 120_000` (~30k tokens). If still over budget, the industry-examples block (identified by the first `### ` heading in the system prompt) is truncated and replaced with a minimal JSON-instruction sentinel. `finalSystemPrompt` / `finalUserPrompt` are used in the AI call (equal to originals when no trimming occurred — zero cost path).

Log output: `[tailor] Prompt truncated: trimmed industry-examples block by N chars (total was M)`

---

### B — Explicit Groq fallback on upstream 5xx

**Problem:** When `ai_routing_config` pins `tailor-resume` to OpenRouter and all OpenRouter keys fail with 5xx, `callAIWithRetry` skips its cross-provider attempt (by design, to avoid distorting routing A/B splits). This left the user with no fallback.

**Fix:** Stage 2 `callAIWithRetry` catch now checks `isAIError(aiErr) && aiErr.status >= 500 && aiErr.code !== 'rate_limit'`. On match, a single additional attempt runs via `callAI({ jsonMode: true })` — no `featureName` so routing config is bypassed entirely, and `jsonMode: true` biases pool selection toward Groq (`llama-3.3-70b-versatile`). Credit is only refunded if the fallback also fails; the original error is re-thrown. Fallback error message logged through `scrubAndCap` before re-throw.

---

### C — Client retry improvements (`aiTailor.ts`)

- **Retry delay:** 2,000 ms → 4,000 ms. Gives transient provider throttles time to clear between the first attempt and the auto-retry.
- **Retry message:** Detects `upstream_5xx` / `upstream_error` error codes and messages containing "upstream" and shows "Our AI is temporarily overloaded — retrying…" rather than the generic "Retrying — hang tight…".

---

## Error code flow

```
Provider 5xx
  └── callAIWithRetry (attempt 1: chosen key, attempt 2: sibling key, attempt 3: cross-provider IF not pinned)
      └── if still fails → catch in tailor-resume/index.ts
          └── isAIError && status >= 500 → callAI({ jsonMode: true }) → Groq pool
              └── if also fails → refundCredit → throw original error
                  └── toUserError → { status: 502, error: 'upstream_error' } → client
                      └── aiErrorParser.ts: classifies as upstream_5xx
                          └── aiTailor.ts: shows "Our AI is temporarily overloaded — retrying…"
                              └── waits 4s → retries full edge function call
```
