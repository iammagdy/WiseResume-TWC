

## APK AI Features Analysis -- Issues Found and Fixes

### Status: What's Working Well

1. **Scroll fix**: AppShell correctly uses `overflow-y-auto` with WebView styles -- confirmed working.
2. **Score Resume edge function**: Already has defensive skills mapping (line 79) -- fixed in last session.
3. **Store sanitization**: `updateResume` already enforces array types for experience, education, skills.
4. **AI Enhance Sheet**: Has "Apply All" and sticky "Done" buttons -- fixed in last session.
5. **CORS**: Properly handles `null` / `https://localhost` origins for Capacitor APKs.
6. **Auth resilience**: `useResumeScore` has explicit `getSession()` + retry + direct fetch fallback for WebView reliability.
7. **AI Credit system**: Server-side RPC (`increment_ai_usage`) is secure; client-side correctly checks and warns.
8. **All edge functions**: `verify_jwt = false` in config.toml with manual auth validation in code -- correct pattern.

---

### Issue 1: `analyze-resume` Still Has Unguarded `skills.join()` (CRASH)

**File**: `supabase/functions/analyze-resume/index.ts`, line 103

```
Skills: ${resume.skills?.join(', ') || 'Not provided'}
```

This will crash with `resume.skills?.join is not a function` if skills are objects (same bug that was fixed in `score-resume`).

**Fix**: Apply the same defensive mapping:
```
Skills: ${Array.isArray(resume.skills) ? resume.skills.map(s => typeof s === 'string' ? s : s?.name || String(s)).join(', ') : 'Not provided'}
```

---

### Issue 2: `tailor-resume` Also Has Unguarded `skills.join()` (CRASH)

**File**: `supabase/functions/tailor-resume/index.ts`, line 162

```
${resume.skills?.join(', ') || 'Not provided'}
```

Same crash risk when skills contain objects instead of strings.

**Fix**: Same defensive mapping as above.

---

### Issue 3: `analyze-resume` Doesn't Use Shared `aiClient.ts` (Inconsistency)

The `analyze-resume` function manually calls `fetch()` to the AI gateway instead of using the shared `callAI()` helper from `_shared/aiClient.ts`. This means:
- No 30-second timeout protection (could hang indefinitely)
- No standardized error handling for 402/429 errors
- Inconsistent with all other edge functions

**Fix**: Refactor `analyze-resume` to use `callAI()` from the shared client, matching the pattern used in `score-resume` and `enhance-section`.

---

### Issue 4: `tailor-resume` Also Doesn't Use Shared `aiClient.ts`

Same problem -- manual `fetch()` instead of `callAI()`. It does have its own 25s timeout which is good, but error handling is inconsistent.

**Fix**: Refactor to use `callAI()` for consistency. The shared client already handles timeouts (30s), rate limiting, and error mapping.

---

### Summary of Changes

| File | Issue | Fix |
|------|-------|-----|
| `supabase/functions/analyze-resume/index.ts` | `skills.join()` crash | Defensive mapping |
| `supabase/functions/analyze-resume/index.ts` | No shared AI client | Refactor to use `callAI()` |
| `supabase/functions/tailor-resume/index.ts` | `skills.join()` crash | Defensive mapping |
| `supabase/functions/tailor-resume/index.ts` | No shared AI client | Refactor to use `callAI()` |

### What Does NOT Need Changes

- `score-resume` -- already fixed
- `enhance-section` -- already uses `callAI()` 
- `agentic-chat` -- uses manual fetch but with proper error handling and tool calling (shared client doesn't support streaming-like patterns needed here)
- `AIEnhanceSheet` -- already has Apply All + Done + sanitization
- `resumeStore` -- already has defensive array coercion
- CORS -- already handles APK origins correctly
- AppShell scroll -- already fixed

