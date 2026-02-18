

## WiseResume AI Service Analysis: Default Provider, BYOK Risks, and Recommendations

---

### Part 1: Current AI Architecture

**Default Provider:** Lovable AI Gateway (`ai.gateway.lovable.dev`)
**Default Model:** `google/gemini-2.5-flash` (used by 17 of 20 edge functions)
**Secondary Models:**
- `google/gemini-3-flash-preview` -- used by `analyze-resume` and `parse-job-url`
- `google/gemini-2.5-flash-lite` -- automatic fallback after 3 retries fail

**BYOK Provider:** Google Gemini direct API only (OpenAI-compatible endpoint at `generativelanguage.googleapis.com/v1beta/openai/chat/completions`)

```text
+------------------+      +-------------------+      +------------------------+
|  Mobile App      |      |  Edge Functions   |      |  AI Backends           |
|  (React/Vite)    | ---> |  (20 functions)   | ---> |                        |
|                  |      |  _shared/aiClient  |      |  1. Lovable Gateway    |
|  supabase.       |      |                   |      |     (default)          |
|  functions.      |      |  callAI() /       |      |                        |
|  invoke()        |      |  callAIWithRetry() |      |  2. Google Gemini      |
|                  |      |                   |      |     (BYOK fallback)    |
+------------------+      +-------------------+      +------------------------+
```

**How provider switching works today:**
1. `callAI()` checks if the user has a Gemini key stored in `user_api_keys` table (encrypted, fetched via `getUserKeyFromDB(userId)`)
2. If key exists: calls Google Gemini directly first, falls back to Lovable Gateway on error
3. If no key: calls Lovable Gateway directly
4. Both paths use OpenAI-compatible response format, parsed by the same `parseOpenAIResponse()` function

**This is already provider-agnostic at the response layer.** Both Lovable Gateway and Google Gemini's OpenAI-compatible endpoint return `choices[0].message.content` format, and both support `tools` / `tool_calls` in the same shape.

---

### Part 2: Risk Assessment Per Feature

| Feature | Edge Function | Tool Calling? | JSON Parsing? | Risk if Provider Changes |
|---------|--------------|---------------|---------------|-------------------------|
| Section Enhancement | enhance-section | No | Yes (strict schema) | **Medium** -- relies on model following JSON schema exactly |
| Resume Tailoring | tailor-resume | No | Yes (strict schema) | **Medium** -- complex JSON output; truncation recovery logic |
| Resume Analysis | analyze-resume | No | Yes | **Medium** -- structured JSON expected |
| Cover Letter | generate-cover-letter | No | No (plain text) | **Safe** -- returns plain text |
| Agentic Chat | agentic-chat | **Yes** (5 tools) | Yes | **High** -- depends on tool-calling support |
| Interview Chat | interview-chat | No | Yes (inline score blocks) | **Medium** -- custom `---SCORE---` delimiters |
| Explain Gap | explain-gap | **Yes** (1 tool) | Via tool args | **High** -- tool-calling required |
| Fill Gap | fill-gap | **Yes** (1 tool) | Via tool args | **High** -- tool-calling required |
| Proofread | proofread-resume | **Yes** (1 tool) | Via tool args | **High** -- tool-calling required |
| LinkedIn Optimizer | optimize-for-linkedin | No | Yes | Medium |
| One-Page Optimizer | one-page-optimizer | No | Yes | Medium |
| AI Detector | detect-and-humanize | No | Yes | Medium |
| Career Path | career-path-advisor | No | Yes | Medium |
| Career Assessment | career-assessment | No | Yes | Medium |
| Recruiter Sim | recruiter-simulation | No | Yes | Medium |
| Parse Resume | parse-resume | **Yes** (1 tool) | Via tool args | **High** |
| Parse LinkedIn | parse-linkedin | **Yes** (1 tool) | Via tool args | **High** |
| Parse Job URL | parse-job-url | No | Yes | Medium |
| Resignation Letter | generate-resignation-letter | No | No (plain text) | **Safe** |
| Generate Headshot | generate-headshot | No | Image generation | **Safe** (separate API) |

**Summary:** 6 functions use tool/function calling (high risk), 12 use JSON text parsing (medium risk), 2 are plain text (safe).

---

### Part 3: What Actually Happens When a User Adds Their Own Gemini Key

**Current flow (working correctly):**

1. User opens AI Settings sheet and selects "Your Gemini API Key"
2. User pastes key; client-side `geminiKeyValidator.ts` calls Google directly from the browser to validate
3. On success, key is sent to `manage-api-keys` edge function, encrypted via AES-GCM, and stored in `user_api_keys` table
4. When any AI feature fires, the edge function calls `callAI({ userId })` which fetches the encrypted key from DB, decrypts it, and calls `generativelanguage.googleapis.com` directly
5. If the user's key fails (quota, rate limit, invalid), `callAI` automatically falls back to Lovable Gateway

**This fallback is already implemented and working.** The architecture is sound for Gemini BYOK.

**What does NOT work / known gaps:**

1. **Client-side key exposure:** `geminiKeyValidator.ts` sends the API key directly from the browser to Google's API. The key is visible in the browser's network tab. This is a security concern flagged in the previous audit. **Recommendation: move validation to an edge function** (proposal only).

2. **Only Gemini BYOK is supported:** The UI only allows "WiseResume AI" or "Your Gemini API Key." There is no option for OpenAI, Anthropic, or other providers. The code in `callGeminiDirect()` is hardcoded to Google's endpoint and model mapping.

3. **Model mapping is Gemini-only:** `MODEL_MAPPING` in `aiClient.ts` only maps Gemini model names. If a different provider were added, this mapping would need extension.

4. **Tool calling compatibility:** All 6 tool-calling functions use OpenAI-compatible `tools` format. Google Gemini's OpenAI-compatible endpoint supports this format, so BYOK with Gemini keys works. However, if a non-Gemini provider were added that doesn't support the same tool schema, these 6 functions would break.

---

### Part 4: Verdict -- Is the Architecture Already Provider-Agnostic?

**Yes, mostly.** The shared `aiClient.ts` is already a centralized abstraction layer that:
- Accepts a unified `AICallOptions` interface
- Normalizes responses via `parseOpenAIResponse()`
- Handles errors via typed `AIError` objects
- Implements retry + fallback logic
- Supports tool calling in OpenAI format

**What it lacks (minor):**
- Only two backends (Lovable Gateway and Google Gemini direct) are implemented
- Model mapping is Gemini-specific
- No provider-level configuration flag (it's implicit: has user key = Gemini, no key = Gateway)

**Conclusion:** No major refactoring is needed. The current architecture handles provider switching safely for the one supported BYOK provider (Gemini). The fallback-to-gateway behavior ensures features never break even if a user's key is bad.

---

### Part 5: Recommended Improvements (All Proposals, None Applied)

#### Improvement 1: Move key validation to edge function (MEDIUM priority)

**Problem:** `geminiKeyValidator.ts` sends the raw API key from the browser to Google's API, exposing it in network logs.

**Proposal:** Create a `validate-api-key` edge function that accepts the key, validates it server-side, and returns `{ isValid, tier }`. The client never calls Google directly.

**Risk:** Low. Only changes the validation flow, not the AI calling flow.

#### Improvement 2: Add provider field to callAI options (LOW priority)

**Current:** Provider is inferred (has user key = Gemini, no key = Gateway).

**Proposal:** Add an explicit `provider?: 'gateway' | 'gemini'` field to `AICallOptions`. This makes the routing decision explicit and would make it easier to add future providers.

**Risk:** Very low. No behavior change; just makes the code more explicit.

#### Improvement 3: Ensure all AI functions pass userId (LOW priority)

**Current state:** All 20 edge functions already pass `userId` to `callAI()`. This was verified in the search.

**Status:** Already done. No action needed.

#### Improvement 4: Document tool-calling dependency (INFO only)

The 6 functions that use tool calling (`agentic-chat`, `explain-gap`, `fill-gap`, `proofread-resume`, `parse-resume`, `parse-linkedin`) are high-risk if a non-Gemini, non-OpenAI provider is ever added. These should be documented as provider-dependent.

---

### Part 6: Questions Before Any Changes

Before implementing any of the above proposals, I need your input on:

1. **Do you want to support providers beyond Gemini for BYOK?** If yes, we would need to extend `callAI` with additional backends (e.g., OpenAI direct, Anthropic). If Gemini-only BYOK is sufficient, the current code is fine as-is.

2. **Should we move Gemini key validation server-side?** This would mean creating a new edge function (`validate-api-key`), updating `AISettingsSheet.tsx` to call it, and removing `geminiKeyValidator.ts`. It's safer but adds one more edge function to maintain.

3. **If a user's BYOK key fails and we fall back to the Lovable Gateway, should we notify the user?** Currently the fallback is silent (only logged to console). Should we show a toast like "Your API key failed, using WiseResume AI instead"?

---

### Summary Table

| Area | Current Status | Risk Level | Action Needed |
|------|---------------|------------|---------------|
| Provider abstraction layer | Already centralized in `aiClient.ts` | None | None |
| Response normalization | Both backends use OpenAI format | None | None |
| BYOK Gemini support | Working with auto-fallback | Low | None |
| Tool-calling compatibility | Works with Gemini + Gateway | Medium (if new providers added) | Document only |
| Key validation security | Client-side (browser network exposure) | Medium | Proposal: move server-side |
| Error handling | Typed errors, graceful fallback | None | None |
| Data integrity | JSON parsing + schema validation in each function | Low | None |

**Bottom line:** The WiseResume AI service is well-architected for its current scope (Lovable Gateway default + Gemini BYOK). No urgent changes are needed. The three proposals above are improvements for future robustness, not fixes for current bugs.

