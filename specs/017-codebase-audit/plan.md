# Implementation Plan: Comprehensive Codebase Audit — Security, AI Tools & Core Fixes

**Branch**: `017-codebase-audit` | **Date**: 2026-03-19 | **Spec**: `specs/017-codebase-audit/spec.md`

---

## Summary

This plan addresses **3 Critical + 7 High** security and correctness issues discovered during a full-stack audit of WiseResume. The Medium/Low issues are deferred to a follow-up spec. All fixes touch existing files — no new files are created.

**Scope (in priority order)**:
1. Credit gating for `analyze-resume` and `generate-cover-letter` (Critical — revenue)
2. Hardcoded secrets removal: anon key in `client.ts` + fallback encryption secret (Critical — security)
3. JWT signature verification in `manage-api-keys` (High — identity forgery)
4. CORS wildcard fallback fix (High — eliminates all cross-origin protection)
5. `send-bug-report` IP-based rate limiting (High — spam/abuse)
6. SSRF protection on Ollama base URL (High — internal infrastructure exposure)
7. BYOK key masked in Zustand store (High — in-memory key exposure)
8. Credit deduction error logging (High — silent revenue leakage)
9. Token exchange promise reset on failure (High — broken auth state)

**Clarification decisions applied**:
- `generate-cover-letter` costs **2 credits** (not 1) — intentional, higher token usage
- `send-bug-report` stays unauthenticated — **IP-based rate limiting** (5 req/hour/IP)
- BYOK: store only **masked preview** (`AIza...xyz`); key fetched server-side at call time
- Gemini daily usage tracked in **Supabase `ai_credits` table** (not localStorage)
- SSRF: **blocklist approach** — reject `127.x`, `10.x`, `192.168.x`, `172.16-31.x`, `169.254.x`
- Supabase anon key: remove hardcoded fallback, use `VITE_SUPABASE_ANON_KEY` **only**
- Scope: **Critical + High only** in this spec; Medium/Low deferred
- Token exchange race: **fix with promise reset** — simple, safe, one-line change

---

## Technical Context

**Language/Version**: TypeScript (React 18 + Vite) on frontend; Deno (TypeScript) in Supabase edge functions
**Primary Dependencies**: Supabase JS v2, Zustand, React Query, jose (JWT), Web Crypto API (AES-GCM)
**Storage**: Supabase PostgreSQL — `ai_credits`, `user_api_keys` tables
**Testing**: Manual smoke tests; `tsc --noEmit` for TypeScript verification
**Target Platform**: Web (Vite SPA) + Supabase Edge Functions (Deno)

---

## Constitution Check

The constitution template is a placeholder in this project. The following principles apply based on the spec and project patterns:

- ✅ **Read before modifying** — all files will be read in full before edits
- ✅ **No new files** — all fixes touch existing files only
- ✅ **Fail-closed for security** — credit check failures return 402 (deny, not allow)
- ✅ **No secrets in source** — hardcoded keys removed, not rotated in-place
- ✅ **Server-side enforcement** — credit deduction and JWT verification done server-side

---

## Project Structure

### Documentation

```text
specs/017-codebase-audit/
├── spec.md     ✅ Exists
├── plan.md     ✅ This file
└── tasks.md    📋 To be created by /speckit.tasks
```

### Files Modified (no new files)

**Edge Functions (Deno)**:
```text
supabase/functions/
├── analyze-resume/index.ts          — Add credit check + increment (AI-001)
├── generate-cover-letter/index.ts   — Add credit check + 2-credit increment (AI-002)
├── tailor-resume/index.ts           — Add console.error to credit catch (AI-003)
├── manage-api-keys/index.ts         — Replace decodeJwtPayload → requireAuth (SEC-003)
├── send-bug-report/index.ts         — Add IP rate limiting + HTML escape (SEC-005, SEC-008)
├── validate-api-key/index.ts        — Add SSRF blocklist for Ollama URL (BYOK-003)
├── elevenlabs-scribe-token/index.ts — Remove fallback encryption secret (SEC-002)
└── _shared/cors.ts                  — Fix wildcard fallback (SEC-004)
```

**Frontend (TypeScript/React)**:
```text
src/
├── integrations/supabase/client.ts  — Remove hardcoded anon key fallback (SEC-001)
├── store/settingsStore.ts           — Mask BYOK key in Zustand + Gemini usage tracking (BYOK-001, AI-006)
└── lib/supabaseBridge.ts            — Reset exchangePromise on failure (CORE-001)
```

---

## Phase-by-Phase Approach

---

### Phase 1 — Critical: Secrets Removal (SEC-001, SEC-002)

**Purpose**: Remove hardcoded secrets first — these are committed to git history and affect all environments.

**Changes**:

**`src/integrations/supabase/client.ts`** (SEC-001):
- Remove the `?? "eyJhbGci..."` fallback from `SUPABASE_PUBLISHABLE_KEY`
- Remove the `?? "https://jnsfmkzgxsviuthaqlyy.supabase.co"` fallback from `SUPABASE_URL`
- Add startup validation: throw a descriptive error if either env var is missing
- Note: The exposed anon key (`eyJhbGci...lV0`) should be **rotated in Supabase dashboard** — this is a manual step the developer must do after the code change

**`supabase/functions/elevenlabs-scribe-token/index.ts`** (SEC-002):
- Change `Deno.env.get('API_KEY_ENCRYPTION_SECRET') || ''` to remove the empty-string fallback
- Add startup guard: `if (!ENCRYPTION_SECRET) throw new Error('API_KEY_ENCRYPTION_SECRET env var is required')`
- Also apply the same guard check in `manage-api-keys/index.ts` (currently uses `|| ''` as well)

**Checkpoint**: No `eyJhbGci` literal in `src/integrations/supabase/client.ts`. No `fallback-secret` or empty fallback in edge functions.

---

### Phase 2 — Critical: Credit Gating for AI Functions (AI-001, AI-002)

**Purpose**: Close the revenue bypass on `analyze-resume` and `generate-cover-letter`.

**Pattern** (same as spec-016's tailor-resume fix, copy-paste verified):
```typescript
// After rate limit check, before body parsing:
import { checkUserCreditBalance } from "../_shared/creditUtils.ts";
import { getServiceClient } from "../_shared/authMiddleware.ts"; // or create svcClient inline

const creditCheck = await checkUserCreditBalance(userId);
if (!creditCheck.hasCredits) {
  return new Response(
    JSON.stringify({ error: 'Insufficient AI credits. Add your own Gemini API key for unlimited access.' }),
    { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
const isByok = creditCheck.remaining === 9999;
```

After successful AI response:
```typescript
if (!isByok) {
  try {
    const svcClient = /* service client */;
    svcClient.rpc('increment_ai_usage', { p_user_id: userId }).then(() => {});
  } catch (err) {
    console.error('[credit] increment_ai_usage failed for user:', userId, err);
  }
}
```

**`generate-cover-letter` special case — 2 credits**:
The `increment_ai_usage` RPC increments by 1. For a 2-credit operation, call it **twice** in sequence:
```typescript
svcClient.rpc('increment_ai_usage', { p_user_id: userId }).then(() => {});
svcClient.rpc('increment_ai_usage', { p_user_id: userId }).then(() => {});
```
This is fire-and-forget, non-blocking, and uses the existing atomic RPC.

**Pre-implementation check**: Read `supabase/functions/_shared/creditUtils.ts` and `_shared/authMiddleware.ts` to confirm `getServiceClient()` export name before writing code. (Tailor-resume uses `getServiceClient()` — verify same pattern applies here.)

**`analyze-resume`** (AI-001): Add credit check between rate limit block and body parse. 1-credit deduction.

**`generate-cover-letter`** (AI-002): Same position. 2-credit deduction (double RPC call).

**Checkpoint**: Zero-credit user gets 402 from both endpoints before AI call. Non-BYOK user's `daily_usage` increments correctly.

---

### Phase 3 — High: JWT Fix in `manage-api-keys` (SEC-003)

**Purpose**: Replace the insecure `decodeJwtPayload()` (no signature check) with `requireAuth()` (jose.jwtVerify).

**Current code** (lines 50–70):
```typescript
const authHeader = req.headers.get('Authorization');
// ...
const token = authHeader.replace('Bearer ', '');
claims = decodeJwtPayload(token);
const userId = claims.sub as string;
```

**Target pattern** (same as all other edge functions):
```typescript
import { requireAuth, authErrorResponse } from '../_shared/authMiddleware.ts';
// ...
const { userId, client } = await requireAuth(req);
```

**Steps**:
1. Add `requireAuth, authErrorResponse` to imports (already imported in other functions — verify exact path)
2. Remove the manual `authHeader` check and `decodeJwtPayload` call
3. Replace with `const { userId, client } = await requireAuth(req);` wrapped in try/catch → `authErrorResponse`
4. Remove the `decodeJwtPayload` function definition from the file
5. The `client` returned by `requireAuth` is an authenticated Supabase client — use it for DB operations

**Pre-implementation check**: Read full `manage-api-keys/index.ts` to understand how `client` is used downstream — it creates its own Supabase client currently, which will be replaced by the `requireAuth` client.

**Checkpoint**: `grep -r "decodeJwtPayload" supabase/functions/` returns only the definition in `authMiddleware.ts`. A tampered JWT returns 401.

---

### Phase 4 — High: CORS Wildcard Fix (SEC-004)

**Purpose**: Stop returning `Access-Control-Allow-Origin: *` for unknown origins.

**Current** (`_shared/cors.ts` line 24):
```typescript
const resolvedOrigin = isAllowed && origin ? origin : '*';
```

**Fix**: For unknown origins, omit the CORS header (or return `'null'`). Native app requests (`!origin` or `origin === 'null'`) are already handled by `isNativeApp` — they must still work.

```typescript
// For allowed origins: echo back the specific origin
// For native apps (no origin): echo back null/empty is fine — Capacitor doesn't send Origin
// For unknown web origins: omit the header entirely (deny)
const resolvedOrigin = isAllowed ? (origin || 'null') : null;
```

Then in the returned headers object:
```typescript
const headers: Record<string, string> = {
  'Access-Control-Allow-Headers': '...',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};
if (resolvedOrigin) {
  headers['Access-Control-Allow-Origin'] = resolvedOrigin;
}
return headers;
```

**Note on native apps**: `isNativeApp` is true when `!origin` — Capacitor iOS sends `capacitor://localhost` (in allowlist) and Android sends no origin. The fix must preserve the existing native app behavior by keeping `capacitor://localhost` in the allowlist and handling `null` origin correctly.

**Pre-implementation check**: Re-read cors.ts in full and trace exactly how native app requests flow through before changing the logic.

**Checkpoint**: Request from `https://evil.example.com` receives no `Access-Control-Allow-Origin` header. Requests from listed origins still work. Native app origins unaffected.

---

### Phase 5 — High: `send-bug-report` IP Rate Limiting + HTML Escape (SEC-005, SEC-008)

**Purpose**: Prevent spam via rate limiting. Prevent HTML injection in outbound emails.

**IP Rate Limiting** (SEC-005):
The existing `checkRateLimit` utility in `_shared/rateLimiter.ts` takes a `userId` as the key. For an unauthenticated endpoint, we use the client IP as the key.

```typescript
// Get client IP from headers (Supabase edge functions expose this)
const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  || req.headers.get('x-real-ip')
  || 'unknown';

const rateKey = `bug-report:${clientIp}`;
const rateCheck = await checkRateLimit(rateKey, { maxRequests: 5, windowSeconds: 3600, actionType: 'bug_report' });
if (!rateCheck.allowed) {
  return new Response(
    JSON.stringify({ error: 'Too many reports. Please wait before submitting again.' }),
    { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

**Pre-implementation check**: Read `_shared/rateLimiter.ts` to confirm `checkRateLimit` accepts an arbitrary string key (not just userId), and confirm the `actionType` field is optional or takes arbitrary values.

**HTML Escape** (SEC-008):
Add a simple `escapeHtml` helper at the top of `send-bug-report/index.ts`:
```typescript
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

Apply to all user-supplied fields interpolated in the HTML template: `error_message`, `error_stack`, `component_stack`, `additional_context`, `route`, `selected_screen`, `user_email`.

**Pre-implementation check**: Read the full HTML template section of `send-bug-report/index.ts` to identify every interpolation point.

**Checkpoint**: 6th request from same IP within an hour returns 429. Bug report with `<script>` in body produces escaped `&lt;script&gt;` in email HTML.

---

### Phase 6 — High: SSRF Blocklist for Ollama URL (BYOK-003)

**Purpose**: Prevent the edge function from making requests to internal/private network addresses.

**Add blocklist validation function** in `validate-api-key/index.ts` (before the Ollama fetch):
```typescript
function isPrivateUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    // Reject non-HTTPS (except during local dev — check if hostname is public)
    // Block private IP ranges
    const privatePatterns = [
      /^127\./,
      /^10\./,
      /^192\.168\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^169\.254\./,     // Link-local (AWS metadata, etc.)
      /^::1$/,           // IPv6 loopback
      /^fc00:/i,         // IPv6 private
      /^fe80:/i,         // IPv6 link-local
      /^localhost$/i,
      /^0\.0\.0\.0$/,
    ];
    return privatePatterns.some(p => p.test(hostname));
  } catch {
    return true; // Unparseable URL = reject
  }
}
```

Call this **before** any fetch in the Ollama branch:
```typescript
if (isPrivateUrl(cleanUrl)) {
  return new Response(JSON.stringify({ isValid: false, error: 'Invalid base URL: private or reserved addresses are not allowed.' }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

**Checkpoint**: `http://127.0.0.1`, `http://169.254.169.254`, `http://10.0.0.1`, `http://192.168.1.1` all return 400. `https://my-ollama.example.com` proceeds normally.

---

### Phase 7 — High: BYOK Key Masking in Zustand (BYOK-001)

**Purpose**: Remove the full plain-text API key from in-memory Zustand state after server save.

**Current flow in `AISettingsSheet.tsx`**:
1. User enters key → validate → save to server → `setGeminiApiKey(fullKey)` in Zustand
2. Zustand `geminiApiKey` is used to... (need to verify how it's consumed)

**Pre-implementation check**:
- Read `src/store/settingsStore.ts` in full to understand `geminiApiKey` usage
- Read `src/components/settings/AISettingsSheet.tsx` lines 370–400 (save flow)
- Grep `geminiApiKey` across `src/` to find all read locations

**Expected finding**: The full key in Zustand is used primarily as a flag (non-empty = connected). The actual key is retrieved from the DB in `_shared/aiClient.ts` via `getUserKeyFromDB()` — the client-side key in Zustand should NOT be sent to edge functions.

**If the key is only used as a flag** (most likely):
- Change `setGeminiApiKey(fullKey)` → `setGeminiApiKey(maskedKey)` where:
  ```typescript
  function maskApiKey(key: string): string {
    if (key.length < 8) return '***';
    return key.slice(0, 4) + '...' + key.slice(-4);
  }
  ```
- In `settingsStore.ts`, the `geminiApiKey` field semantics change to "masked preview or empty"
- The Zustand `geminiKeyValidated: true` flag already carries the "connected" semantics

**If the key is also sent in request headers** (would be an additional bug):
- Remove the client-side key from request bodies/headers entirely
- Confirm edge functions retrieve the key server-side via `getUserKeyFromDB()` (verified in audit)

**Checkpoint**: After saving a valid Gemini key, `useSettingsStore.getState().geminiApiKey` contains a masked value like `AIza...1234`, not the full key. Full key is not visible in DevTools Zustand store.

---

### Phase 8 — High: Credit Deduction Error Logging (AI-003) + Token Exchange Reset (CORE-001)

**AI-003** — `tailor-resume/index.ts`:
Locate the existing fire-and-forget credit increment block (added in spec-016). Change the silent `catch {}` to:
```typescript
} catch (err) {
  console.error('[credit] increment_ai_usage failed for user:', userId, err);
}
```

**CORE-001** — `src/lib/supabaseBridge.ts`:
Locate the `exchangePromise` catch block. After the error is caught and before re-throwing, add:
```typescript
exchangePromise = null; // Allow next call to retry
```

These are both single-line changes. Read the files first to locate exact line numbers.

**Checkpoint**: `tailor-resume` credit failures appear in Supabase edge function logs. `supabaseBridge.ts` retries token exchange after a failure.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Removing anon key breaks dev environment (no `.env` file) | Medium | High | Document required `.env` vars. The key removal will cause a clear startup error rather than a silent failure. |
| `requireAuth` in `manage-api-keys` breaks existing callers that don't send auth | Low | Medium | The function already requires an Authorization header — `decodeJwtPayload` failure was the only path through. |
| CORS fix breaks native Capacitor app | Medium | High | Carefully read how `isNativeApp` and `capacitor://localhost` flow through the logic. Test with native origin pattern. |
| IP rate limiting on `send-bug-report` uses wrong IP header | Low | Low | Test both `x-forwarded-for` and `x-real-ip`. Fall back to `'unknown'` — all `'unknown'` IPs share one rate limit bucket (acceptable). |
| 2-credit deduction (double RPC) for cover letter partially fails | Low | Low | Same fire-and-forget risk as single credit; already acceptable per spec decision. |
| BYOK key masking breaks the "is key saved?" UI check | Medium | Medium | Verify all `geminiApiKey` read sites before masking. The `geminiKeyValidated` boolean is the reliable flag. |

---

## Pre-Implementation Corrections / Discoveries

- **`manage-api-keys/index.ts` encryption secret**: Line 4 has `|| ''` (empty string fallback), not `|| 'fallback-secret-change-me'`. The spec's SEC-002 description was written for `elevenlabs-scribe-token`. Both files need the guard — but the message in the spec about the literal `'fallback-secret-change-me'` only applies to `elevenlabs-scribe-token`. Both get the startup-error treatment.
- **`getServiceClient()` usage**: Spec-016 used this pattern; verify the import path is `'../_shared/authMiddleware.ts'` before copy-pasting to the new functions.
- **`send-bug-report/index.ts` imports**: This file does NOT import `_shared/cors.ts` — it uses a hardcoded `corsHeaders` object with `"*"`. That wildcard is a separate instance from `_shared/cors.ts`. The SEC-004 CORS fix in `_shared/cors.ts` does NOT fix this file's CORS. The bug report function's hardcoded `"*"` is a separate issue — addressed implicitly when we add rate limiting and read the file; flag it if found.

---

## Open Questions (Resolved by Clarifications)

All 8 questions answered. No open questions remain before implementation.

| # | Question | Decision |
|---|----------|----------|
| 1 | Cover letter credit cost | 2 credits (double RPC) |
| 2 | Bug report auth strategy | Option B: IP rate limiting, stay unauthenticated |
| 3 | BYOK in-memory key | Masked preview only; key fetched server-side |
| 4 | Gemini usage counter | Track in Supabase `ai_credits` table |
| 5 | SSRF protection | Blocklist (not DNS resolution) |
| 6 | Supabase anon key | Option A: env var only, remove fallback |
| 7 | Scope | Critical + High only |
| 8 | Token exchange race | Fix with promise reset (one-line) |
