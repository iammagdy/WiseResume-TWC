

## Gemini API Key Integration -- Full Audit and Fixes

### Current State

The Gemini key flow works correctly for **5 edge functions** that use the shared `callAI()` helper: `score-resume`, `analyze-resume`, `tailor-resume`, `enhance-section`, `proofread-resume`. These get the key from the client via `getUserGeminiKey()` and the shared helper handles routing, model mapping, timeouts, and error handling correctly.

However, **13 edge functions still use manual `fetch()`** with inline Gemini routing. While their server-side logic works, the **client-side callers for 8 of those functions never pass `userGeminiKey`**, meaning they always fall back to the Lovable gateway even when the user has configured their own Gemini key.

---

### Issue 1: Client-side callers missing `userGeminiKey` (8 features broken)

These client-side files invoke edge functions that support `userGeminiKey` but never pass it:

| Client File | Edge Function | Impact |
|---|---|---|
| `src/components/editor/ai/RecruiterSimSheet.tsx` | `recruiter-simulation` | Uses gateway instead of user's key |
| `src/components/editor/ai/LinkedInOptimizerSheet.tsx` | `optimize-for-linkedin` | Uses gateway instead of user's key |
| `src/components/editor/ai/AIDetectorSheet.tsx` | `detect-and-humanize` (2 calls) | Uses gateway instead of user's key |
| `src/components/editor/GapExplainerSheet.tsx` | `explain-gap` | Uses gateway instead of user's key |
| `src/components/settings/LinkedInImportSheet.tsx` | `parse-linkedin` + `parse-resume` | Uses gateway instead of user's key |
| `src/lib/pdfParser.ts` | `parse-resume` | Uses gateway instead of user's key |
| `src/pages/ResignationLetterNewPage.tsx` | `generate-resignation-letter` | Uses gateway instead of user's key |
| `src/pages/ResignationLetterEditPage.tsx` | `generate-resignation-letter` | Uses gateway instead of user's key |

**Fix**: Add `import { getUserGeminiKey } from '@/lib/aiProvider'` and pass `userGeminiKey: getUserGeminiKey()` in the request body for each of these callers.

---

### Issue 2: `GapFillerSheet` bypasses validation guard

File: `src/components/editor/GapFillerSheet.tsx` (line 65)

```typescript
const geminiKey = useSettingsStore((s) => s.geminiApiKey);
// Later: ...(geminiKey ? { userGeminiKey: geminiKey } : {})
```

This reads `geminiApiKey` directly without checking `aiProvider === 'gemini'` or `geminiKeyValidated`. If a user enters a key, switches back to WiseResume AI, the key is still sent.

**Fix**: Replace with `getUserGeminiKey()` which already checks `aiProvider`, `geminiApiKey`, and `geminiKeyValidated`.

---

### Issue 3: `useProofread` bypasses validation guard

File: `src/hooks/useProofread.ts` (line 91)

```typescript
if (aiProvider === 'gemini' && geminiApiKey) {
  body.userGeminiKey = geminiApiKey;
}
```

This checks `aiProvider` but skips the `geminiKeyValidated` check. An unvalidated key would be sent.

**Fix**: Replace with `getUserGeminiKey()` for consistency.

---

### Issue 4: 13 edge functions use manual `fetch` without timeouts or consistent error handling

These edge functions duplicate the AI routing logic inline instead of using the shared `callAI()` helper. While they work, they lack:
- 30-second timeout protection (some could hang indefinitely)
- Consistent error type mapping (`isAIError`)
- Centralized model mapping (they hardcode `gemini-2.0-flash` for direct calls, while the shared client maps to the correct preview model names)

**Affected functions**: `agentic-chat`, `career-assessment`, `career-path-advisor`, `detect-and-humanize`, `explain-gap`, `fill-gap`, `generate-cover-letter`, `generate-resignation-letter`, `interview-chat`, `one-page-optimizer`, `optimize-for-linkedin`, `parse-linkedin`, `parse-resume`, `recruiter-simulation`

**Fix**: Refactor all 13 to use `callAI()` from `_shared/aiClient.ts`. Note: `agentic-chat` uses tool calling which `callAI()` already supports, and `interview-chat` has two AI calls (init + follow-up) which can both use `callAI()`.

---

### Implementation Priority

**Phase 1 (Critical -- user's Gemini key silently ignored)**:
Fix 8 client-side callers + 2 validation bypasses (Issues 1-3). This is the user-facing bug: the key is configured but never used for most features.

**Phase 2 (Reliability -- consistent backend)**:
Refactor 13 edge functions to use `callAI()` (Issue 4). This adds timeouts, proper model mapping, and consistent error handling.

---

### Technical Details

**Phase 1 changes** (10 files, small edits each):

1. `src/components/editor/ai/RecruiterSimSheet.tsx` -- add `getUserGeminiKey()` import, pass in body
2. `src/components/editor/ai/LinkedInOptimizerSheet.tsx` -- same pattern
3. `src/components/editor/ai/AIDetectorSheet.tsx` -- same pattern (2 invoke calls)
4. `src/components/editor/GapExplainerSheet.tsx` -- same pattern
5. `src/components/editor/GapFillerSheet.tsx` -- replace direct store read with `getUserGeminiKey()`
6. `src/components/settings/LinkedInImportSheet.tsx` -- same pattern (2 invoke calls)
7. `src/lib/pdfParser.ts` -- same pattern
8. `src/pages/ResignationLetterNewPage.tsx` -- same pattern
9. `src/pages/ResignationLetterEditPage.tsx` -- same pattern
10. `src/hooks/useProofread.ts` -- replace manual check with `getUserGeminiKey()`

**Phase 2 changes** (13 edge function files):

Each function gets refactored from:
```typescript
const useGeminiDirect = !!userGeminiKey;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const apiUrl = useGeminiDirect ? "https://..." : "https://...";
const apiKey = useGeminiDirect ? userGeminiKey : LOVABLE_API_KEY;
const modelName = useGeminiDirect ? "gemini-2.0-flash" : "google/gemini-3-flash-preview";
const response = await fetch(apiUrl, { ... });
```

To:
```typescript
import { callAI, isAIError, parseAIJSON } from "../_shared/aiClient.ts";
// ...
const aiResponse = await callAI({
  model: 'google/gemini-3-flash-preview',
  messages: [...],
  temperature: 0.3,
  userGeminiKey,
});
```

This eliminates duplicated routing logic, adds 30-second timeouts, and uses correct model names for direct Gemini calls via the shared `MODEL_MAPPING`.

