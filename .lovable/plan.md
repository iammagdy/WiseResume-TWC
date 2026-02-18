
# Security Audit: API Key Handling, Secret Exposure & Mobile Safety

## Audit Scope Covered

I read every file in the chain: `safeClient.ts`, `AuthContext.tsx`, `settingsStore.ts`, `AISettingsSheet.tsx`, `ElevenLabsKeySheet.tsx`, `useElevenLabsScribe.ts`, `geminiKeyValidator.ts`, `manage-api-keys/index.ts`, `validate-api-key/index.ts`, `elevenlabs-scribe-token/index.ts`, `aiClient.ts` (server-side), `BugReportDialog.tsx`, `FeatureRequestDialog.tsx`, `migrateLocalKeys.ts`, `supabase/config.toml`, and all store/hook files that touch API key state.

---

## What Is Already Correct (Do Not Touch)

| Area | Status |
|------|--------|
| All network calls use HTTPS | Confirmed — zero `http://` URLs found in `src/` |
| Anon key in `safeClient.ts` | Safe — it is a **publishable** key, not a secret (JWT with `role: anon`, intentionally client-facing) |
| Supabase auth JWT session | Stored in `localStorage` by the Supabase SDK (standard practice; no clear-text password) |
| Gemini key NOT in localStorage | Confirmed — `partialize` in `settingsStore.ts` line 193 strips `geminiApiKey` and `elevenlabsApiKey` before persisting |
| Server-side encryption of Gemini key | Confirmed — `manage-api-keys` edge function uses AES-GCM (PBKDF2-derived, 100k iterations) |
| Edge functions authenticate every request | Confirmed — every function validates `Authorization: Bearer <JWT>` via `getClaims()` |
| Rate limiting on all AI edge functions | Confirmed — shared `checkRateLimit` helper used in all 18 AI functions |
| `validate-api-key` runs server-side | Confirmed — the `AISettingsSheet` calls the edge function, not `geminiKeyValidator.ts` directly |
| Bug report `sessionId` is last 8 chars only | Confirmed — `getAuthFromCache` in `BugReportDialog.tsx` line 62 slices `access_token.slice(-8)` |
| No secrets in `console.log` in `src/` | Confirmed — no key/token values logged in browser-side code |

---

## Security Issues Found

### Issue 1 — CRITICAL: `geminiKeyValidator.ts` calls Google's API directly from the browser (BYPASSABLE CLIENT-SIDE VALIDATION PATH)

**File:** `src/lib/geminiKeyValidator.ts`

The file makes two direct `fetch()` calls from the browser to `https://generativelanguage.googleapis.com` with the raw Gemini API key embedded in the URL as a query parameter:

```ts
// Line 38
`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
// Line 76
`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`
```

**This is a serious exposure risk because:**
1. The API key appears in full in browser network logs (`DevTools → Network tab`), visible to anyone who opens DevTools on the device
2. On Android/APK, tools like `mitmproxy` or `Frida` can intercept these requests and read the key from the URL
3. The key appears as a query parameter (not a header), so it may also appear in server access logs, proxies, and crash reporters

**Critical finding:** This code file is NOT currently imported anywhere in the application. The import search confirms `validateGeminiKey` is defined but never called — the `AISettingsSheet` already correctly calls the server-side `validate-api-key` edge function instead. **This file is dead code and a liability.**

**Fix:** Delete `src/lib/geminiKeyValidator.ts`. It is unused and represents a dangerous template that could accidentally be imported in future. The correct validation path — through the `validate-api-key` edge function — is already fully implemented and in use.

**Risk:** Zero. The file has no importers.

---

### Issue 2 — MEDIUM: ElevenLabs custom API key sent in the request body to the edge function

**File:** `src/hooks/useElevenLabsScribe.ts` lines 63–65

```ts
const { data, error } = await supabase.functions.invoke('elevenlabs-scribe-token', {
  body: { customApiKey: elevenlabsApiKey || undefined },
});
```

**Edge function:** `supabase/functions/elevenlabs-scribe-token/index.ts` line 41–42:
```ts
const { customApiKey } = await req.json().catch(() => ({}));
const apiKey = customApiKey || Deno.env.get('ELEVENLABS_API_KEY');
```

The ElevenLabs API key is transmitted in the **request body** from the client to the edge function. This is visible in browser DevTools Network tab (the request body is plain JSON). Unlike the Gemini key (which is stored server-side and never returned to the client), the ElevenLabs key is stored in Zustand in-memory state (`elevenlabsApiKey` field) and transmitted on every connection attempt.

**The ElevenLabs key is NOT persisted to localStorage** (confirmed — `partialize` excludes it) and is **NOT stored server-side in `user_api_keys`** — it lives only in the in-memory Zustand store and is cleared on app restart. This means:
- The key is visible in DevTools Network tab while the session is active
- The key is NOT persisted anywhere between sessions — the user must re-enter it each launch
- The current `ElevenLabsKeySheet` saves to Zustand only (no server-side storage)

**Fix:** Mirror the Gemini key architecture for the ElevenLabs key:
1. In `manage-api-keys` edge function — it already supports any `provider` string, so it can store ElevenLabs keys too with `provider: 'elevenlabs'`
2. In `elevenlabs-scribe-token` — instead of accepting a `customApiKey` in the body, fetch the user's key from the `user_api_keys` table using `getUserKeyFromDB(userId, 'elevenlabs')` (the same helper already in `aiClient.ts`)
3. In `ElevenLabsKeySheet` / Settings — call `manage-api-keys` to save/delete the key server-side instead of Zustand (same pattern as Gemini)
4. Remove `customApiKey` from the request body entirely

**Risk:** Low. The ElevenLabs flow is isolated to the Interview page. The architecture already exists; this is a plumbing change.

---

### Issue 3 — LOW: Console logs in `useElevenLabsScribe.ts` include WebSocket URL with the scribe token

**File:** `src/hooks/useElevenLabsScribe.ts` lines 57, 62, 73, 102, 107, 110–112

```ts
console.log('[ElevenLabs] Opening WebSocket...');
const ws = new WebSocket(
  `wss://api.elevenlabs.io/v1/speech-to-text/realtime?...&token=${token}`
);
```

The token is not logged directly, but the `console.log('[ElevenLabs] WebSocket connected')` on line 128 fires right after the WebSocket opens — meaning a dev with console access can see the token by correlation if they open DevTools.

More importantly: `console.log('[ElevenLabs] Committed transcript:', msg.text)` at line 183 logs every committed speech transcript to the browser console. On mobile APK builds, `console.log` output can be captured by Android Logcat, which is readable by any app with `READ_LOGS` permission or by a connected debugger.

**Fix:** Wrap all `console.log` calls in `useElevenLabsScribe.ts` in a `DEV` guard: `if (import.meta.env.DEV) console.log(...)`. This eliminates transcript and connection logs from production APK builds where Logcat monitoring is a real threat. The `console.error` calls can stay (they report genuine failures, not data).

**Risk:** Very low — a pure log suppression in production.

---

### Issue 4 — LOW: Edge function logs user ID in plaintext in server logs

**Files:** `supabase/functions/elevenlabs-scribe-token/index.ts` line 39, `supabase/functions/enhance-section/index.ts` line 228, `supabase/functions/analyze-resume/index.ts` line 50, `supabase/functions/tailor-resume/index.ts` line 51, others

```ts
console.log('Authenticated user:', user.id);
```

Full UUIDs of authenticated users are written to server logs. While server logs are only accessible to project admins (not public), logging full user IDs on every API call is poor hygiene and unnecessary. The `send-bug-report` function correctly truncates user IDs with `truncateUserId()`.

**Fix:** This is a backend-only change with zero user impact. Replace `console.log('Authenticated user:', userId)` with nothing (remove it) — the auth check already ensures the user is valid; the log adds no debugging value beyond what the auth error would surface. Alternatively, truncate to first 8 chars.

**However:** Edge function logs are server-side only and not visible to end users or mobile attackers. This is a code hygiene issue, not an active vulnerability. Given the scope constraint ("smallest possible correction"), this can be deferred.

---

## Implementation Plan

### 3 Changes to Implement (Ordered by Risk)

| # | File | Change | Risk |
|---|------|--------|------|
| 1 | `src/lib/geminiKeyValidator.ts` | **Delete** the file — it is dead code with a dangerous pattern (API key in browser fetch URL as query param) | Zero |
| 2 | `src/hooks/useElevenLabsScribe.ts` + `supabase/functions/elevenlabs-scribe-token/index.ts` + `src/components/settings/ElevenLabsKeySheet.tsx` | Move ElevenLabs BYOK key to server-side storage via existing `manage-api-keys` infra; remove `customApiKey` from the request body | Low |
| 3 | `src/hooks/useElevenLabsScribe.ts` | Wrap all `console.log` statements in `if (import.meta.env.DEV)` guards to prevent transcript data from appearing in Android Logcat in production APK builds | Very low |

### Change 1 — Delete `src/lib/geminiKeyValidator.ts`

The file exports `validateGeminiKey` which calls Google's API directly from the browser with the key as a URL query parameter. It has zero importers (confirmed via search). The correct server-side validation path is already fully implemented in `supabase/functions/validate-api-key/index.ts` and called from `AISettingsSheet.tsx`.

Deleting this file removes the risk of it being accidentally imported in the future and eliminates a misleading alternative implementation.

### Change 2 — Server-side ElevenLabs key storage (3 coordinated edits)

**2a. `src/components/settings/ElevenLabsKeySheet.tsx`**

Change `onSave` to call `manage-api-keys` edge function (POST for save, DELETE for clear) instead of storing in Zustand directly. Show loading state during save. On success, update Zustand with a boolean `elevenlabsKeyConfigured` flag (not the key value) so the Settings page can show "Connected" status.

**2b. `supabase/functions/elevenlabs-scribe-token/index.ts`**

Replace the `customApiKey` body param with a server-side DB lookup using the existing `getUserKeyFromDB(userId, 'elevenlabs')` pattern from `aiClient.ts`. Remove `customApiKey` from the accepted request body. The function already has the user's `userId` from JWT auth — use it to fetch the key.

**2c. `src/hooks/useElevenLabsScribe.ts`**

Remove `{ customApiKey: elevenlabsApiKey || undefined }` from the request body. Send only `{}` (or nothing) in the body — the edge function will retrieve the key from the database using the user's JWT.

**Also:** Add `provider: 'elevenlabs'` support to the `manage-api-keys` function — it already works for any `provider` string, so no structural change needed there.

### Change 3 — Production log suppression in `useElevenLabsScribe.ts`

Wrap all 10+ `console.log` statements in `useElevenLabsScribe.ts` with `if (import.meta.env.DEV)` guards. The `console.error` calls can remain. This prevents speech transcript content and connection state from being captured by Android Logcat in production APK builds.

---

## What Is NOT Changed

- The Supabase anon key in `safeClient.ts` (it is a publishable key by design)
- The Gemini key storage and validation flow (already correctly server-side)
- Any auth redirect or session management logic
- Any edge function authentication patterns
- The `manage-api-keys` edge function structure (already handles multiple providers)
- The `BugReportDialog` session handling (already safely truncates the token to 8 chars)
- The `user_api_keys` database schema (already supports any `provider` string)
- Any template, UI, or feature behavior

---

## Security Posture Summary

| Check | Before Fix | After Fix |
|-------|-----------|-----------|
| Gemini key visible in browser network tab | No (server-side validation) | No |
| Dead client-side key validator code exists | Yes (geminiKeyValidator.ts) | No (deleted) |
| ElevenLabs key visible in request body | Yes | No (server-side lookup) |
| ElevenLabs key persisted in localStorage | No | No |
| Speech transcripts in Android Logcat | Yes (production) | No (DEV only) |
| API keys in console.log | No | No |
| All calls over HTTPS | Yes | Yes |
| Auth JWT in browser storage | Yes (Supabase standard) | Yes (unchanged) |
