# Tasks: Comprehensive Codebase Audit — Security, AI Tools & Core Fixes

**Input**: `specs/017-codebase-audit/spec.md` + `specs/017-codebase-audit/plan.md`
**Branch**: `017-codebase-audit`
**Total tasks**: 30
**Scope**: Critical + High severity issues only. Medium/Low deferred.

**Organization**: Tasks follow the plan's 8 phases grouped by user story. Phases 1–3 are server-side (edge functions); Phases 4–8 are mixed (edge function + client-side). All work touches existing files — no new files created.

---

## Phase 1: Secrets Removal (US2, P1 — Critical)

**Purpose**: Remove hardcoded secrets from source files. This must run first — secrets in source are committed to git history and shipped in bundles. No other work is blocked by this phase.

**Goal**: Zero hardcoded JWT keys or encryption fallbacks in any source file. App fails loudly with a clear error if required env vars are missing.

**Independent Test**: Build the app without `VITE_SUPABASE_ANON_KEY` set → expect a startup error. Deploy edge function without `API_KEY_ENCRYPTION_SECRET` → expect a startup throw, not silent fallback to empty string.

- [x] T001 [US2] In `src/integrations/supabase/client.ts`: remove the hardcoded `?? "eyJhbGci..."` fallback from `SUPABASE_PUBLISHABLE_KEY` and the hardcoded URL fallback from `SUPABASE_URL`. Add a startup guard that throws a clear descriptive error if either env var is missing. *(Manual step required: rotate the exposed anon key in the Supabase dashboard after this code change.)*
- [x] T002 [US2] In `supabase/functions/elevenlabs-scribe-token/index.ts`: change `Deno.env.get('API_KEY_ENCRYPTION_SECRET') || ''` to a required read with a startup throw: `if (!ENCRYPTION_SECRET) throw new Error('API_KEY_ENCRYPTION_SECRET env var is required')`. Remove any empty-string or fallback value.
- [x] T003 [US2] In `supabase/functions/manage-api-keys/index.ts`: apply the same startup guard as T002 — the `ENCRYPTION_SECRET` on line 4 also uses `|| ''` fallback. Remove the fallback and add the startup throw.

**Checkpoint ✅**: `grep -r "eyJhbGci" src/` returns zero results. No `|| ''` or `|| 'fallback'` for `API_KEY_ENCRYPTION_SECRET` in any edge function. App startup error is clear if env vars are absent.

---

## Phase 2: Credit Gating for AI Functions (US1, P1 — Critical)

**Purpose**: Close the revenue bypass on `analyze-resume` and `generate-cover-letter` by adding the same credit check + increment pattern used in `tailor-resume` (implemented in spec-016).

**Goal**: Zero-credit, no-BYOK users receive HTTP `402` from both functions before any AI tokens are spent. Successful operations decrement credits (1 for analyze, 2 for cover letter). BYOK users are unaffected.

**Independent Test**: POST to `/functions/v1/analyze-resume` with zero-credit user → expect `402`. POST with credited user → expect `200` and `daily_usage` +1. POST to `/functions/v1/generate-cover-letter` with credited user → expect `200` and `daily_usage` +2.

- [x] T004 [US1] Read `supabase/functions/_shared/creditUtils.ts` and `supabase/functions/_shared/authMiddleware.ts` in full to confirm `checkUserCreditBalance` import path and `getServiceClient()` export name before writing any code.
- [x] T005 [US1] In `supabase/functions/analyze-resume/index.ts`: import `checkUserCreditBalance` from `../_shared/creditUtils.ts`. After the rate limit check (line ~33), add the credit gate — return HTTP `402` with `{ error: 'Insufficient AI credits.' }` if `!creditCheck.hasCredits`. Set `const isByok = creditCheck.remaining === 9999`.
- [x] T006 [US1] In `supabase/functions/analyze-resume/index.ts`: after the AI response is returned successfully, fire-and-forget `increment_ai_usage` RPC for non-BYOK users. Include `console.error` in the catch block (not a silent catch).
- [x] T007 [US1] In `supabase/functions/generate-cover-letter/index.ts`: apply the identical credit gate as T005 — same import, same position (after rate limit check), same 402 response shape.
- [x] T008 [US1] In `supabase/functions/generate-cover-letter/index.ts`: after the AI response, fire-and-forget `increment_ai_usage` RPC **twice** (two separate calls) for non-BYOK users — cover letter costs 2 credits. Include `console.error` in each catch block.

**Checkpoint ✅**: Zero-credit user gets `402` from both endpoints before any AI call. Non-BYOK `analyze-resume` increments `daily_usage` by 1. Non-BYOK `generate-cover-letter` increments by 2. BYOK user's balance unchanged.

---

## Phase 3: JWT Signature Verification in `manage-api-keys` (US3, P1 — High)

**Purpose**: Replace the insecure `decodeJwtPayload()` (no signature check) with `requireAuth()` (jose.jwtVerify). A forged JWT with any `userId` currently allows managing anyone's API keys.

**Goal**: `manage-api-keys` rejects tampered JWTs with HTTP `401`. All DB operations use the verified `userId` from `requireAuth`.

**Independent Test**: POST to `/functions/v1/manage-api-keys` with a JWT whose signature is tampered → expect `401`. Valid JWT → expect normal response.

- [x] T009 [US3] Read `supabase/functions/manage-api-keys/index.ts` in full to understand the current auth flow, how `userId` is extracted via `decodeJwtPayload()`, and how the Supabase `client` is constructed downstream — this determines what must change when swapping to `requireAuth`.
- [x] T010 [US3] In `supabase/functions/manage-api-keys/index.ts`: add imports for `requireAuth` and `authErrorResponse` from `../_shared/authMiddleware.ts`. Remove the manual `authHeader` check and the `decodeJwtPayload()` call. Replace with `const { userId, client } = await requireAuth(req)` in a try/catch that returns `authErrorResponse(error)` on failure.
- [x] T011 [US3] In `supabase/functions/manage-api-keys/index.ts`: remove the `decodeJwtPayload` function definition (lines 35–42). Confirm no other callers of that function remain in the file. Update any code that created its own Supabase client to use the `client` returned by `requireAuth` instead.

**Checkpoint ✅**: `grep "decodeJwtPayload" supabase/functions/manage-api-keys/index.ts` returns zero results. Tampered JWT returns `401`. Valid JWT proceeds normally.

---

## Phase 4: CORS Wildcard Fix (US4, P1 — High)

**Purpose**: Stop the shared CORS utility from returning `Access-Control-Allow-Origin: *` for unrecognized origins.

**Goal**: Requests from unknown web origins receive no ACAO header (effectively denied). Known origins still receive the echoed specific origin. Native Capacitor app behavior is unchanged.

**Independent Test**: Send an OPTIONS preflight with `Origin: https://evil.example.com` → response must NOT contain `Access-Control-Allow-Origin: *` or any ACAO value. Send with `Origin: https://resume.thewise.cloud` → response contains the correct specific origin.

- [x] T012 [US4] Read `supabase/functions/_shared/cors.ts` in full. Trace the exact flow for: (a) `capacitor://localhost` (in allowlist), (b) no Origin header (native Android), (c) `https://evil.example.com` (unknown). Map the current code path for each before making any change.
- [x] T013 [US4] In `supabase/functions/_shared/cors.ts`: change `const resolvedOrigin = isAllowed && origin ? origin : '*'` so that unknown origins result in no `Access-Control-Allow-Origin` header being set. Modify the return object to conditionally include the header only when the origin is allowed. Preserve native app behavior (`isNativeApp = !origin || origin === 'null'` must continue to work).
- [x] T014 [P][US4] In `supabase/functions/send-bug-report/index.ts`: this function has its own hardcoded `corsHeaders` with `"Access-Control-Allow-Origin": "*"`. Replace this with the shared `getCorsHeaders` from `../_shared/cors.ts` for consistency (import `getCorsHeaders` and call it with the request origin). This is a separate wildcard instance not covered by T013.

**Checkpoint ✅**: OPTIONS from unknown origin → no `Access-Control-Allow-Origin` in response. OPTIONS from `https://resume.thewise.cloud` → `Access-Control-Allow-Origin: https://resume.thewise.cloud`. Native Capacitor origin test passes.

---

## Phase 5: `send-bug-report` Rate Limiting + HTML Escape (US4, US7, P1/P2 — High)

**Purpose**: Prevent spam by rate-limiting unauthenticated bug report submissions. Prevent HTML injection in the outbound email.

**Goal**: 6th request from same IP within 1 hour returns `429`. Bug report with HTML tags in fields produces escaped output in the email body.

**Independent Test (rate limiting)**: Send 5 POST requests from the same IP within 60 seconds → all succeed. 6th request → `429`. **Independent Test (XSS)**: Submit a report with `error_message: "<img src=x onerror=alert(1)>"` → email body contains `&lt;img src=x onerror=alert(1)&gt;`.

- [x] T015 [US4] Read `supabase/functions/_shared/rateLimiter.ts` in full — confirm whether `checkRateLimit` accepts an arbitrary string key (not just a UUID userId), and confirm the `actionType` field accepts arbitrary values or has an enum constraint.
- [x] T016 [US4] Read `supabase/functions/send-bug-report/index.ts` in full — map all user-supplied fields that are interpolated into the HTML email template (lines ~134–232) to identify every interpolation point requiring escaping.
- [x] T017 [US4] In `supabase/functions/send-bug-report/index.ts`: add IP-based rate limiting at the top of the handler. Extract the client IP from `req.headers.get('x-forwarded-for')` (take the first IP, trimmed) with fallback to `req.headers.get('x-real-ip')` or `'unknown'`. Call `checkRateLimit` with key `bug-report:${clientIp}` and `{ maxRequests: 5, windowSeconds: 3600, actionType: 'bug_report' }`. Return `429` if not allowed.
- [x] T018 [US7] In `supabase/functions/send-bug-report/index.ts`: add an `escapeHtml(str: string): string` helper function that replaces `&`, `<`, `>`, `"`, `'` with their HTML entities. Apply it to every user-supplied field interpolated into the HTML template (at minimum: `error_message`, `error_stack`, `component_stack`, `additional_context`, `route`, `selected_screen`, `user_email`).

**Checkpoint ✅**: 6th bug report POST from same IP returns `429`. HTML in `error_message` is escaped in outbound email. `checkRateLimit` import added successfully.

---

## Phase 6: SSRF Blocklist for Ollama URL (US6, P2 — High)

**Purpose**: Block the `validate-api-key` function from making outbound requests to private/reserved IP ranges via user-supplied Ollama base URLs.

**Goal**: Private IP URLs return `400` with no outbound request made. Valid public HTTPS URLs proceed normally.

**Independent Test**: POST with `baseUrl: "http://169.254.169.254"` → `400`. POST with `baseUrl: "http://127.0.0.1:11434"` → `400`. POST with a valid public URL → validation proceeds.

- [x] T019 [US6] In `supabase/functions/validate-api-key/index.ts`: add an `isPrivateUrl(url: string): boolean` function that uses `new URL(url)` to extract the hostname and tests it against the blocklist: `127.x`, `10.x`, `192.168.x`, `172.16-31.x`, `169.254.x`, `0.0.0.0`, `localhost`, IPv6 loopback (`::1`), IPv6 private (`fc00:`, `fe80:`). Return `true` (block) for unparseable URLs.
- [x] T020 [US6] In `supabase/functions/validate-api-key/index.ts`: call `isPrivateUrl(cleanUrl)` immediately after `const cleanUrl = baseUrl.replace(/\/+$/, '')` in the Ollama branch. If it returns `true`, return `{ status: 400, isValid: false, error: 'Invalid base URL: private or reserved addresses are not allowed.' }` before any fetch is made.

**Checkpoint ✅**: `http://127.0.0.1`, `http://169.254.169.254`, `http://10.0.0.1`, `http://192.168.1.1`, `http://localhost` all return `400`. `https://my-ollama.example.com` proceeds to model listing.

---

## Phase 7: BYOK Key Masking in Zustand (US5, P2 — High)

**Purpose**: Remove the full plain-text API key from in-memory Zustand state after server-side save. Only a masked preview should be stored.

**Goal**: After saving a Gemini or Ollama key, the full key is not visible in Zustand state or browser DevTools. The UI still shows "connected" correctly.

**Independent Test**: Save a valid Gemini key → open browser DevTools → inspect Zustand store → `geminiApiKey` shows `AIza...xyz` (masked), not the full key.

- [x] T021 [US5] Read `src/store/settingsStore.ts` in full and grep `geminiApiKey` and `ollamaApiKey` across `src/` to identify every read location — this determines whether the full key is sent anywhere client-side (it must NOT be sent to edge functions; the server retrieves it via `getUserKeyFromDB()`).
- [x] T022 [US5] Read `src/components/settings/AISettingsSheet.tsx` lines 360–410 — identify exactly where `setGeminiApiKey(fullKey)` and `setOllamaApiKey(fullKey)` are called after successful server save.
- [x] T023 [US5] In `src/components/settings/AISettingsSheet.tsx`: after a successful server save, replace `setGeminiApiKey(rawKey)` and `setOllamaApiKey(rawKey)` with calls using a masked version: `key.slice(0, 4) + '...' + key.slice(-4)`. Add a `maskApiKey(key: string)` helper function in the same file (or inline it).
- [x] T024 [P][US5] In `src/store/settingsStore.ts`: update the JSDoc/comment on `geminiApiKey` and `ollamaApiKey` fields to document that these fields store a masked preview only — not the full key. The `geminiKeyValidated` boolean is the authoritative "is key connected" flag.

**Checkpoint ✅**: After saving a Gemini key, `useSettingsStore.getState().geminiApiKey` is a short masked string. Full key is not in DevTools store state. UI still shows the provider as connected.

---

## Phase 8: Credit Logging + Token Exchange Reset (AI-003, CORE-001, P2 — High)

**Purpose**: Two one-line fixes: (1) log credit deduction failures in `tailor-resume` instead of silently swallowing them; (2) reset the token exchange promise on failure in `supabaseBridge.ts` so the next call can retry.

**Goal**: Credit deduction failures appear in Supabase edge function logs. A failed token exchange does not permanently break auth state.

- [x] T025 [AI-003] In `supabase/functions/tailor-resume/index.ts`: locate the fire-and-forget `increment_ai_usage` block added in spec-016. Change the silent `catch {}` or `catch (err) {}` to `catch (err) { console.error('[credit] increment_ai_usage failed for user:', userId, err); }`.
- [x] T026 [CORE-001] Read `src/lib/supabaseBridge.ts` — locate the `exchangePromise` variable and the catch block where token exchange failures are re-thrown.
- [x] T027 [CORE-001] In `src/lib/supabaseBridge.ts`: in the catch block of the token exchange, add `exchangePromise = null;` before the `throw`. This allows the next caller to trigger a fresh exchange attempt rather than receiving the cached rejection.

**Checkpoint ✅**: `grep "catch {}" supabase/functions/tailor-resume/index.ts` returns zero results (silent catch replaced). `supabaseBridge.ts` resets `exchangePromise` on failure.

---

## Phase 9: Polish & Verification

**Purpose**: Cross-cutting verification across all phases.

- [x] T028 [P] Run `tsc --noEmit` from the repo root — confirm zero TypeScript errors after all client-side changes (T001, T023, T024, T027).
- [x] T029 [P] Grep verification suite:
  - `grep -r "eyJhbGci" src/` → 0 results
  - `grep -r "decodeJwtPayload" supabase/functions/` → only definition in `authMiddleware.ts`
  - `grep -r "fallback-secret" supabase/functions/` → 0 results
  - `grep -r "callAIWithRetry" supabase/functions/` → each result has a preceding `checkUserCreditBalance`
- [x] T030 [P] Update spec status from `Draft` to `Implemented` in `specs/017-codebase-audit/spec.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1** (secrets removal): No dependencies — start immediately. Affects `client.ts` + 2 edge functions.
- **Phase 2** (credit gating): Depends on T004 (read shared utilities) before T005–T008. Otherwise independent of Phase 1.
- **Phase 3** (JWT fix): Depends on T009 (read full file) before T010–T011. Independent of Phases 1–2.
- **Phase 4** (CORS fix): Depends on T012 (read + trace) before T013–T014. T014 is independent of T013.
- **Phase 5** (bug report): Depends on T015 (read rateLimiter) and T016 (read template) before T017–T018. T017 and T018 can run in parallel.
- **Phase 6** (SSRF): T019 → T020 sequential within same function.
- **Phase 7** (BYOK masking): T021 + T022 research before T023 + T024. T023 and T024 can run in parallel.
- **Phase 8** (logging + reset): T025 fully independent. T026 → T027 sequential.
- **Phase 9** (polish): Depends on all prior phases complete.

### Within-Phase Dependencies

- T004 → T005, T006, T007, T008 (must read shared utils before adding imports)
- T005 → T006 (credit check must exist before increment is meaningful) — same file, sequential
- T007 → T008 (same reason) — same file, sequential
- T009 → T010 → T011 (read before modify; remove function definition after replacing usage)
- T012 → T013, T014 (read before modify; T013 and T014 independent of each other)
- T015, T016 → T017, T018 (read before modify; T017 and T018 independent of each other)
- T019 → T020 (define helper before calling it)
- T021, T022 → T023, T024 (research before modify)
- T026 → T027 (read before modify)

### Parallel Opportunities

| Can run together | Why |
|-----------------|-----|
| Phase 1 + Phase 2 research (T004) | Different files entirely |
| Phase 3 research (T009) + Phase 4 research (T012) | Different files |
| T017 + T018 | Same file, non-overlapping sections |
| T023 + T024 | Different files (`AISettingsSheet.tsx` vs `settingsStore.ts`) |
| T025 + T026 | Different files |
| T028 + T029 + T030 | Verification only |

### Recommended Solo-Developer Sequence

```
T001, T002, T003        (secrets — deploy immediately, rotate key)
T004 → T005 → T006      (analyze-resume credit gate)
T007 → T008             (generate-cover-letter credit gate)
T009 → T010 → T011      (manage-api-keys JWT fix)
T012 → T013, T014       (CORS fix)
T015, T016 → T017, T018 (bug report rate limit + HTML escape)
T019 → T020             (SSRF blocklist)
T021, T022 → T023, T024 (BYOK masking)
T025                    (credit log)
T026 → T027             (token exchange reset)
T028, T029, T030        (verification)
```
