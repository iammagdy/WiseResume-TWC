# Feature Specification: Comprehensive Codebase Audit — Security, AI Tools & Core Fixes

**Feature Branch**: `017-codebase-audit`
**Created**: 2026-03-19
**Status**: Implemented
**Scope**: Full-stack audit covering routing, AI tools, BYOK integration, core architecture, and security vulnerabilities.

---

## Audit Summary

Three parallel deep-dive audits were conducted across:
1. **Routing & Page Connectivity** — All 45 pages, navigation links, guards, state preservation
2. **AI Tools & BYOK** — AI feature implementations, credit gating, key management
3. **Core Functions & Security** — Zustand stores, edge functions, encryption, CORS, XSS

**Routing result**: ✅ Clean — no broken routes, orphaned pages, or faulty redirects found.
**AI Tools & Security**: ⚠️ 3 Critical, 7 High, 10 Medium, 7 Low issues found.

---

## Diagnostic Report by Category

---

### Category 1: Routing & Page Connectivity

**Result: PASS — No issues found.**

All 45 pages in `src/pages/` are properly routed in `src/App.tsx`. All `navigate()` calls and `Link to=` attributes point to valid routes. Auth guards (`ProtectedRoute`) are correctly implemented. State is preserved across navigation via Zustand persistence. Redirect routes (`/activity → /applications`, `/jobs → /applications`) are properly configured. 404 fallback is in place.

---

### Category 2: AI Tools Functionality

#### AI-001 — Missing Credit Check in `analyze-resume` Edge Function
- **File**: `supabase/functions/analyze-resume/index.ts`
- **Severity**: 🔴 Critical
- **Issue**: The `analyze-resume` edge function authenticates the user and applies rate limiting, but **never calls `checkUserCreditBalance()`** before invoking `callAIWithRetry()`. Any authenticated user can perform unlimited resume analysis regardless of their credit balance. Unlike `tailor-resume` (fixed in spec-016) and `enhance-section`, this function has zero credit validation.
- **Fix**: Import `checkUserCreditBalance` from `../_shared/creditUtils.ts`. Call it after rate limit check. Return HTTP `402` with `{ error: 'Insufficient AI credits.' }` if `!result.hasCredits`. Call `increment_ai_usage` RPC after success for non-BYOK users.

#### AI-002 — Missing Credit Check AND Usage Recording in `generate-cover-letter`
- **File**: `supabase/functions/generate-cover-letter/index.ts`
- **Severity**: 🔴 Critical
- **Issue**: Identical to AI-001. The cover letter generation edge function has rate limiting but **no `checkUserCreditBalance()` call and no `increment_ai_usage` call**. Cover letter generation (a 2-credit operation) is completely free for all users.
- **Fix**: Same pattern as AI-001 — add credit check before AI call, add increment after success for non-BYOK users.

#### AI-003 — Fire-and-Forget Credit Deduction Has No Error Logging
- **File**: `supabase/functions/tailor-resume/index.ts` (lines 488–494)
- **Severity**: 🟠 High
- **Issue**: The `increment_ai_usage` RPC added in spec-016 is fire-and-forget with a silent `catch {}`. If the RPC fails, the user receives their tailored resume without being charged. There is no error log, no retry, and no monitoring. This is silent revenue leakage.
- **Fix**: Add `console.error('[credit] increment_ai_usage failed for user:', userId, err)` in the catch block. This is non-blocking but at least observable in logs.

#### AI-004 — Incomplete Credit Deduction Loop in `useAIAction` (No Await, No Error Handling)
- **File**: `src/hooks/useAIAction.ts` (lines 40–43)
- **Severity**: 🟠 High
- **Issue**: Credits are deducted via a loop of fire-and-forget React Query mutations with no `await` and no per-mutation error handling. If `cost = 2` and one mutation silently fails, the user is charged 1 instead of 2. Mutations are also optimistic by default.
- **Fix**: Either await all mutations with `Promise.all`, or move credit deduction to the server-side edge function where it can be enforced atomically.

#### AI-005 — No Abort Signal on `parseJobUrl` and `parseJobText`
- **File**: `src/lib/aiTailor.ts` (lines ~219–257)
- **Severity**: 🟡 Medium
- **Issue**: `parseJobUrl()` makes a raw `fetch()` with no `AbortSignal`. `parseJobText()` uses `edgeFunctions.functions.invoke()` which also has no abort support. If the user dismisses the Tailor Sheet mid-parse, the underlying HTTP request continues and consumes server resources and AI credits.
- **Fix**: Accept an optional `signal?: AbortSignal` parameter in both functions and pass it to the `fetch()` call.

#### AI-006 — Gemini Daily Usage Counter Not Persisted Server-Side
- **File**: `src/store/settingsStore.ts` (lines 204–214)
- **Severity**: 🟡 Medium
- **Issue**: The Gemini free-tier daily usage counter (`geminiDailyUsage`) is tracked only in the Zustand store and is explicitly excluded from localStorage persistence. Every page reload resets the counter to 0, allowing users to bypass any client-side free-tier limits indefinitely.
- **Fix**: Either persist the counter to localStorage (acceptable trade-off), or track Gemini free-tier usage in the `ai_credits` table alongside platform credits.

#### AI-007 — `model` Field Not Selected in `manage-api-keys` GET Response
- **File**: `supabase/functions/manage-api-keys/index.ts` (lines 82–91); `src/hooks/useAIKeyHydration.ts` (lines 56–58)
- **Severity**: 🟡 Medium
- **Issue**: The GET endpoint selects `provider, key_tier, created_at, updated_at` but not `model`. The hydration hook reads `key.model` to restore the user's selected Gemini/Ollama model on page reload. Since `model` is never returned, the user's model selection is lost on every page reload.
- **Fix**: Add `model` to the `.select()` query in the GET handler of `manage-api-keys/index.ts`.

#### AI-008 — BYOK Fallback Logs Error Detail That May Contain Key Information
- **File**: `supabase/functions/_shared/aiClient.ts` (lines 260–286)
- **Severity**: 🟡 Medium
- **Issue**: When a user's BYOK Gemini key fails, the error detail is logged: `console.warn('[AI] Gemini BYOK failed, falling back to Wise AI:', errDetail)`. If the Gemini API error response includes the API key in its message body, it would be written to server logs.
- **Fix**: Strip or truncate `errDetail` before logging. Log only the error type and status code, not the full message.

---

### Category 3: BYOK Integration

#### BYOK-001 — Plain Text API Key Stored in Zustand Memory Store
- **File**: `src/store/settingsStore.ts` (lines 58, 66, 196–221)
- **Severity**: 🟠 High
- **Issue**: After the user validates and saves their BYOK key, it is stored as a plain string in the Zustand store (`geminiApiKey`, `ollamaApiKey`). While correctly excluded from localStorage persistence, the raw key is accessible to any JavaScript code running in the browser (e.g., a compromised third-party script, browser extension, or malicious dependency). Browser DevTools can also inspect it directly from the store.
- **Fix**: After successful server-side save, do NOT store the full key client-side. Instead, store only a masked preview (`AIza...xyz`) or a boolean `isConnected: true`. Retrieve the key from the server when needed rather than caching it in memory. The DB-side encryption already handles secure storage.

#### BYOK-002 — No Confirmation That Server Save Succeeded Before Setting In-Memory Key
- **File**: `src/components/settings/AISettingsSheet.tsx` (lines 378–395)
- **Severity**: 🟡 Medium
- **Issue**: The flow is: validate key → save to server → set key in memory. If the server save fails, the function correctly shows an error and returns early. However, if the error is a network timeout (where the save may have partially succeeded), the UI shows "Key not saved" while the DB may actually have it. On next page reload, the key hydrates from DB and appears connected — creating a confusing inconsistency.
- **Fix**: After a save failure, show a specific message instructing the user to reload the page to check current state. This is a UX polish fix, not a security issue.

#### BYOK-003 — SSRF Risk via User-Provided Ollama Base URL
- **File**: `supabase/functions/validate-api-key/index.ts` (lines 41–47)
- **Severity**: 🟠 High
- **Issue**: The user-provided `baseUrl` for Ollama is passed directly to `fetch()` without sanitization. An attacker could provide `http://169.254.169.254/latest/meta-data/` (AWS metadata endpoint) or `http://127.0.0.1:5432` (internal Postgres) to make the edge function perform Server-Side Request Forgery, potentially leaking internal infrastructure details.
- **Fix**: Before using `baseUrl` in fetch, validate that: (1) it uses `https://` (or allow `http://` only for localhost in dev), (2) it does not resolve to RFC-1918 private IP ranges (`10.x`, `172.16-31.x`, `192.168.x`, `127.x`, `169.254.x`). Reject with `400` if invalid.

---

### Category 4: Core Functions & Architecture

#### CORE-001 — Token Exchange Race Condition in `supabaseBridge.ts`
- **File**: `src/lib/supabaseBridge.ts` (lines 77–128)
- **Severity**: 🟡 Medium
- **Issue**: Token exchange is deduplicated via a shared `exchangePromise`. However, if the first exchange fails, the promise rejects — but `exchangePromise` is not reset to `null`. Any subsequent call within the deduplication window will re-throw the same rejection without retrying, leaving the app in a broken auth state until the timer fires again.
- **Fix**: In the catch block of the exchange, set `exchangePromise = null` before re-throwing the error. This allows the next call to trigger a fresh attempt.

#### CORE-002 — Event Listener Cleanup Gaps in Hooks
- **Files**: `src/hooks/useNetworkStatus.ts`, `src/hooks/useAppLifecycle.ts`, `src/hooks/use-mobile.tsx`, `src/hooks/useEditorAutosave.ts`
- **Severity**: 🟡 Medium
- **Issue**: Several hooks add event listeners (`online`, `offline`, `visibilitychange`, `resize`, `keyboard-close`) without guaranteed cleanup if the hook re-runs (deps change) before the component unmounts. This can result in duplicate listeners accumulating over a long session.
- **Fix**: Ensure each `useEffect` returns a cleanup function that removes every listener added in that effect. Use refs to track registered listeners if needed.

#### CORE-003 — Sensitive `resumeId` Logged in `useOfflineSync`
- **File**: `src/hooks/useOfflineSync.ts` (line 58)
- **Severity**: 🟡 Medium
- **Issue**: `console.error('Failed to sync change for', change.resumeId, error)` logs the resume UUID, which is a user-linkable identifier. If the browser console is captured by an analytics or monitoring tool, this PII leaks.
- **Fix**: Remove `resumeId` from the log message, or replace with a generic reference like `'[resume]'`.

#### CORE-004 — PII Persisted to localStorage Without Encryption
- **File**: `src/store/resumeStore.ts` (lines 360–378)
- **Severity**: 🟡 Medium
- **Issue**: The resume store is persisted to localStorage including `currentResume` which contains `contactInfo` (full name, email, phone, location, LinkedIn URL). On a shared device or if an XSS exploit runs, this PII is directly readable from localStorage.
- **Fix**: Either exclude `contactInfo` from the persisted state (use `partialize` to omit it), or encrypt the localStorage payload. The resume can always be re-fetched from Supabase. Alternatively, only persist non-sensitive state like `currentResumeId`.

#### CORE-005 — Commented-Out Column Drops in Migration
- **File**: `supabase/migrations/20260314071822_split_profiles_table.sql` (lines 125–147)
- **Severity**: 🔵 Low
- **Issue**: A migration comments out `DROP COLUMN` statements, meaning redundant columns still exist in the database. This creates technical debt, wastes storage, and can confuse future migrations.
- **Fix**: Create a follow-up migration that drops the confirmed-unused columns after the application has run for a release cycle.

---

### Category 5: Security Vulnerabilities

#### SEC-001 — Hardcoded Supabase Anon Key as Fallback in Client Bundle
- **File**: `src/integrations/supabase/client.ts` (lines 5–6)
- **Severity**: 🔴 Critical
- **Issue**: A full Supabase JWT anon key is hardcoded as a fallback value directly in source code. This key is valid until **2036**, is included in the production JavaScript bundle, and is therefore publicly readable by anyone who downloads and inspects the app. While RLS protects DB rows, the anon key allows anyone to make unauthenticated requests to Supabase storage, edge functions, and any tables without proper RLS.
- **Fix**: Remove the hardcoded fallback entirely. The environment variable `VITE_SUPABASE_ANON_KEY` must be required. Throw a clear startup error if it is missing. Rotate the exposed key immediately.

#### SEC-002 — Hardcoded Fallback Encryption Secret in Edge Function
- **File**: `supabase/functions/elevenlabs-scribe-token/index.ts` (line 6)
- **Severity**: 🔴 Critical
- **Issue**: The encryption secret falls back to the string `'fallback-secret-change-me'` if `API_KEY_ENCRYPTION_SECRET` is not set. If this env var is absent in any environment, all BYOK API keys are encrypted with a weak, publicly known secret. An attacker with DB read access could decrypt every stored API key.
- **Fix**: Remove the fallback. Throw an explicit error on startup: `if (!ENCRYPTION_SECRET) throw new Error('API_KEY_ENCRYPTION_SECRET env var is required')`. Apply the same check to `manage-api-keys/index.ts`.

#### SEC-003 — JWT Decoded Without Signature Verification in `manage-api-keys`
- **File**: `supabase/functions/manage-api-keys/index.ts` (lines 35–42)
- **Severity**: 🟠 High
- **Issue**: The function uses `decodeJwtPayload()` which explicitly does NOT verify the JWT signature (marked `@deprecated` in `authMiddleware.ts`). This means a forged JWT with an arbitrary `sub` claim would be accepted, allowing an attacker to manage API keys for any user ID they choose.
- **Fix**: Replace `decodeJwtPayload()` with `requireAuth(req)` (which uses `jose.jwtVerify`) consistently. This is the same fix applied in spec-016 for `tailor-resume`.

#### SEC-004 — CORS Wildcard Fallback for Unknown Origins
- **File**: `supabase/functions/_shared/cors.ts` (lines 23–24)
- **Severity**: 🟠 High
- **Issue**: When a request origin is not in the allowlist, the CORS header is set to `'*'` (wildcard) instead of being denied. This defeats CORS protections entirely for any unrecognized origin, allowing any website to make credentialed cross-origin requests to all edge functions.
- **Fix**: Change the fallback from `'*'` to either `'null'` (which browsers treat as an opaque response) or omit the `Access-Control-Allow-Origin` header entirely for unknown origins. Unknown origins should effectively be rejected at the CORS level.

#### SEC-005 — Missing Authentication on `send-bug-report` Endpoint
- **File**: `supabase/functions/send-bug-report/index.ts`
- **Severity**: 🟠 High
- **Issue**: The bug report endpoint does not call `requireAuth()`. It accepts submissions from unauthenticated users and has no rate limiting. This allows anyone to spam the endpoint indefinitely, filling the database and overwhelming email notifications.
- **Fix**: Either (a) require authentication via `requireAuth()`, or (b) implement rate limiting by IP address using the `checkRateLimit` utility. If anonymous bug reports are intentional, add strict rate limiting and input size limits.

#### SEC-006 — Unsigned JWT Used for User Attribution in `send-bug-report`
- **File**: `supabase/functions/send-bug-report/index.ts` (lines 74–89)
- **Severity**: 🟡 Medium
- **Issue**: If a Bearer token is present, the function decodes it manually without signature verification (not using `jose.jwtVerify`). A sender could craft a token with any `user_id` and `email` to attribute a malicious bug report to another user or set a spoofed reply-to email address.
- **Fix**: If JWT verification is desired, use `jose.jwtVerify` with the `SUPABASE_JWT_SECRET`. If not, drop JWT parsing entirely and rely only on the explicit request body fields.

#### SEC-007 — Weak KDF: Hardcoded Salt in PBKDF2 for API Key Encryption
- **Files**: `supabase/functions/elevenlabs-scribe-token/index.ts` (lines 5–28); `supabase/functions/manage-api-keys/index.ts` (lines 6–22)
- **Severity**: 🟠 High
- **Issue**: Both functions derive the AES-GCM encryption key using PBKDF2 with a **hardcoded static salt** (`'wiseresume-salt'` / `'user-api-keys-salt'`). A static salt means all encrypted keys share the same derived key material, making a precomputed rainbow table attack possible if the `API_KEY_ENCRYPTION_SECRET` is short or guessable. The IV is random per encryption, but the key derivation is not.
- **Fix**: Generate a unique random salt per encryption operation and prepend it to the ciphertext (similar to how IV is handled). Store format: `[16-byte salt][12-byte IV][ciphertext]`. Update decryption to extract the salt from the stored data.

#### SEC-008 — XSS Risk in Bug Report Email HTML Template
- **File**: `supabase/functions/send-bug-report/index.ts` (lines 134–232)
- **Severity**: 🟡 Medium
- **Issue**: User-supplied fields (`error_message`, `additional_context`, `component_stack`) are interpolated directly into an HTML email template without escaping. HTML tags or scripts in these fields would be rendered in email clients that support HTML. While most clients strip `<script>`, `<img src=x onerror=...>` and similar payloads could still execute in some clients, and HTML injection could craft deceptive emails.
- **Fix**: Apply an `escapeHtml()` function to all user-supplied interpolated values before inserting them into the HTML template: replace `&`, `<`, `>`, `"`, `'` with their HTML entities.

#### SEC-009 — Verbose Console Logging of Sensitive Data in Edge Functions
- **Files**: `supabase/functions/validate-api-key/index.ts` (multiple lines); `supabase/functions/_shared/aiClient.ts`
- **Severity**: 🟡 Medium
- **Issue**: Multiple edge functions log detailed information including provider names, model names, response headers, and error details from external AI APIs. If these logs are shipped to a third-party log aggregator (e.g., Logflare, Datadog), sensitive request metadata could be captured. In the worst case, error messages from AI providers could contain API key fragments.
- **Fix**: Adopt a log hygiene policy: (1) log only error type and HTTP status codes, not full error messages from external APIs; (2) never log request headers or URLs that could contain keys; (3) strip or truncate AI provider error messages before logging.

---

## User Stories & Acceptance Scenarios

### User Story 1 — Credit gates enforced on ALL AI edge functions (Priority: P1)

Every edge function that calls an AI model must validate the user's credit balance before the call, and record usage after.

**Why this priority**: Without universal enforcement, users can call unguarded functions for free indefinitely — bypassing the entire credit system.

**Acceptance Scenarios**:

1. **Given** a user with `ai_credits = 0` and no BYOK, **When** they POST to `/functions/v1/analyze-resume`, **Then** the function returns HTTP `402` before any AI call is made.
2. **Given** the same zero-credit user, **When** they POST to `/functions/v1/generate-cover-letter`, **Then** the function returns HTTP `402` before any AI call is made.
3. **Given** a user with sufficient credits completing a successful analysis, **When** the response is returned, **Then** `daily_usage` is incremented by exactly 1 in `ai_credits`.
4. **Given** a BYOK user completing any AI operation, **When** the response is returned, **Then** `daily_usage` is NOT incremented.

---

### User Story 2 — Critical secrets removed from source code and fallbacks (Priority: P1)

No secret or key may exist as a hardcoded value in any source file, whether as a primary value or a fallback.

**Why this priority**: Hardcoded secrets are committed to version history, shipped in bundles, and cannot be rotated without a code deploy.

**Acceptance Scenarios**:

1. **Given** the production build of the app, **When** the JavaScript bundle is inspected, **Then** no Supabase JWT key appears as a string literal.
2. **Given** `API_KEY_ENCRYPTION_SECRET` is not set in the edge function environment, **When** the function initializes, **Then** it throws a startup error rather than falling back to `'fallback-secret-change-me'`.
3. **Given** `VITE_SUPABASE_ANON_KEY` is not set at build time, **When** the app starts, **Then** it shows a clear configuration error rather than using a hardcoded key.

---

### User Story 3 — JWT signature verification used consistently across all edge functions (Priority: P1)

Every edge function that makes security decisions based on user identity must use `requireAuth()` (which calls `jose.jwtVerify`) — never `decodeJwtPayload()`.

**Why this priority**: An unsigned JWT decode allows identity forgery. A single unguarded function can become a pivot for full account takeover.

**Acceptance Scenarios**:

1. **Given** a POST to `/functions/v1/manage-api-keys` with a JWT whose signature is tampered, **When** the function processes it, **Then** it returns HTTP `401` — not proceeding to read or write any API key.
2. **Given** a valid JWT, **When** `manage-api-keys` processes it, **Then** the `userId` used for all DB operations matches the verified `sub` claim.
3. **Given** a search of the codebase, **When** looking for `decodeJwtPayload` usage in security-sensitive edge functions, **Then** zero results are found in functions that gate data access.

---

### User Story 4 — CORS configuration rejects unknown origins (Priority: P1)

The shared CORS utility must not fall back to `'*'` for unrecognized origins. Unknown origins must be effectively denied.

**Why this priority**: A wildcard CORS header eliminates all cross-origin protection for every edge function simultaneously.

**Acceptance Scenarios**:

1. **Given** a cross-origin request from `https://evil.example.com`, **When** the edge function processes it, **Then** the response does NOT include `Access-Control-Allow-Origin: *`.
2. **Given** a request from a known allowed origin (e.g., the production app domain), **When** processed, **Then** the response includes the correct, specific `Access-Control-Allow-Origin` header.
3. **Given** an OPTIONS preflight from an unknown origin, **When** processed, **Then** the response omits or nullifies `Access-Control-Allow-Origin`.

---

### User Story 5 — BYOK keys not stored in plain text in client memory (Priority: P2)

After a BYOK key is validated and saved server-side, the client must not retain the full key in the Zustand store.

**Why this priority**: In-memory exposure of the full API key is a single XSS attack away from full key extraction.

**Acceptance Scenarios**:

1. **Given** a user saves a valid Gemini API key, **When** the save completes, **Then** `settingsStore.geminiApiKey` contains only a masked value (e.g., `AIza...xyz`) or is empty — not the full key.
2. **Given** an AI operation needs the BYOK key, **When** the edge function executes, **Then** it retrieves the key from the encrypted DB store via `getUserKeyFromDB()` — not from a client-supplied request body field.
3. **Given** browser DevTools inspecting the Zustand store, **When** the user has a BYOK configured, **Then** the full API key is not visible in the store state.

---

### User Story 6 — SSRF protection on Ollama base URL (Priority: P2)

User-provided Ollama base URLs must be validated to prevent Server-Side Request Forgery.

**Why this priority**: SSRF can expose internal infrastructure, cloud metadata endpoints, and internal services to an attacker with no special access.

**Acceptance Scenarios**:

1. **Given** a user submits `http://169.254.169.254/` as their Ollama base URL, **When** `validate-api-key` processes it, **Then** it returns HTTP `400` without making any outbound request.
2. **Given** a user submits `http://127.0.0.1:5432` as their Ollama base URL, **When** processed, **Then** it returns HTTP `400`.
3. **Given** a user submits a valid HTTPS URL to a public Ollama instance, **When** processed, **Then** the validation proceeds normally.

---

### User Story 7 — XSS-safe email template in bug report function (Priority: P2)

All user-supplied content interpolated into the HTML bug report email must be HTML-escaped.

**Acceptance Scenarios**:

1. **Given** a bug report where `error_message` contains `<img src=x onerror=alert(1)>`, **When** the email is generated, **Then** the string appears as escaped text (`&lt;img src=x onerror=alert(1)&gt;`) in the email body, not as a rendered HTML element.
2. **Given** `additional_context` containing `<script>...</script>`, **When** the email is rendered, **Then** no script content is executable.

---

### User Story 8 — Reduce PII exposure from localStorage persistence (Priority: P3)

Resume contact info (name, email, phone) must not be persisted to localStorage in plain text.

**Acceptance Scenarios**:

1. **Given** a user with a resume containing contact info, **When** `localStorage` is inspected, **Then** no email address, phone number, or full name appears in the persisted resume store entry.
2. **Given** the app reloads, **When** the resume store rehydrates, **Then** it restores `currentResumeId` and re-fetches the full resume from Supabase — not from localStorage.

---

## Requirements

### Functional Requirements

- **FR-001**: ALL edge functions that call `callAIWithRetry()` MUST first call `checkUserCreditBalance()` and return HTTP `402` if `!hasCredits`.
- **FR-002**: ALL edge functions that successfully complete an AI call MUST fire `increment_ai_usage` for non-BYOK users after the response is generated.
- **FR-003**: The hardcoded Supabase anon key fallback in `src/integrations/supabase/client.ts` MUST be removed. The app MUST fail with a clear error if `VITE_SUPABASE_ANON_KEY` is absent.
- **FR-004**: The hardcoded `'fallback-secret-change-me'` encryption secret in `supabase/functions/elevenlabs-scribe-token/index.ts` MUST be removed. Functions MUST throw on startup if `API_KEY_ENCRYPTION_SECRET` is not set.
- **FR-005**: `supabase/functions/manage-api-keys/index.ts` MUST replace `decodeJwtPayload()` with `requireAuth()` (from `authMiddleware.ts`) to enforce JWT signature verification.
- **FR-006**: `supabase/functions/_shared/cors.ts` MUST NOT fall back to `Access-Control-Allow-Origin: *` for unknown origins. Unknown origins must be denied or receive a null/absent CORS header.
- **FR-007**: `supabase/functions/send-bug-report/index.ts` MUST either require authentication via `requireAuth()` or implement IP-based rate limiting. Anonymous submissions must be rate-limited.
- **FR-008**: The `model` field MUST be added to the `.select()` query in the `manage-api-keys` GET handler so it is returned to the client during hydration.
- **FR-009**: User-supplied fields in the bug report HTML email template MUST be HTML-escaped before interpolation.
- **FR-010**: User-provided Ollama `baseUrl` MUST be validated against private IP ranges and non-HTTPS schemes before any outbound fetch is made in `validate-api-key`.
- **FR-011**: `src/store/settingsStore.ts` MUST NOT store the full BYOK API key in the Zustand store after server-side save. Only a masked preview or `isConnected` boolean should be retained.
- **FR-012**: `src/store/resumeStore.ts` MUST exclude `contactInfo` (or the entire `currentResume`) from localStorage persistence via the `partialize` option.
- **FR-013**: `src/lib/supabaseBridge.ts` MUST reset `exchangePromise = null` on exchange failure, allowing the next call to retry.
- **FR-014**: `increment_ai_usage` failures in `tailor-resume` MUST be logged via `console.error` (not silently swallowed) even in fire-and-forget mode.

### Key Entities

- **`ai_credits`**: Table — `user_id`, `daily_usage`, `daily_limit`, `usage_date`, `total_usage`. The source of truth for credit gating.
- **`user_api_keys`**: Table — `user_id`, `provider`, `encrypted_key`, `key_tier`, `model`. Stores encrypted BYOK keys.
- **`checkUserCreditBalance(userId)`**: Shared utility in `_shared/creditUtils.ts`. Returns `{ hasCredits, remaining }`. `remaining === 9999` signals BYOK.
- **`increment_ai_usage(p_user_id)`**: Supabase RPC. Increments `daily_usage` with date-aware reset logic.

---

## Success Criteria

- **SC-001**: Zero edge functions call `callAIWithRetry()` without a preceding `checkUserCreditBalance()` check. Verified by grep: `grep -r "callAIWithRetry" supabase/functions/` and manual audit of each result.
- **SC-002**: No string matching the pattern `eyJhbGci...` appears as a literal in `src/integrations/supabase/client.ts` or anywhere in the built JS bundle.
- **SC-003**: No string matching `fallback-secret` appears in any edge function source file.
- **SC-004**: `grep -r "decodeJwtPayload" supabase/functions/` returns zero results in security-sensitive functions (only `authMiddleware.ts` definition is allowed).
- **SC-005**: A cross-origin preflight from an unlisted origin returns no `Access-Control-Allow-Origin: *` header.
- **SC-006**: Submitting `http://127.0.0.1` as an Ollama URL to `validate-api-key` returns HTTP `400`.
- **SC-007**: A bug report containing `<script>` in the message body produces an escaped string in the outbound email HTML.
- **SC-008**: After BYOK key save, `useResumeStore.getState().geminiApiKey` is empty or masked — not the full key.
- **SC-009**: `localStorage` inspection after loading a resume shows no email address or phone number in the persisted resume store.
- **SC-010**: A POST to `manage-api-keys` with a tampered JWT signature returns HTTP `401`.

---

## Edge Cases & Out of Scope

**Edge Cases**:
- What if `checkUserCreditBalance()` itself fails (DB timeout)? The current implementation returns `{ hasCredits: false }` (fail-closed). This is the correct behavior — accept the occasional false-negative over allowing unlimited free usage.
- What if a valid Ollama URL resolves to a private IP via DNS? URL-based IP validation is bypassable via DNS rebinding. A full fix would require resolving the hostname and checking the resulting IP — this is noted but considered out of scope for this iteration.
- What if the `model` field is genuinely absent in older `user_api_keys` rows? The hydration hook must treat `null` model as "not set" and skip `setGeminiModel()` — which it already does conditionally.

**Out of Scope**:
- Migrating from PBKDF2 to Argon2 for key derivation (requires re-encrypting all stored keys — high risk migration, separate spec).
- Adding per-key random salt to the encryption scheme (same reason — requires migration).
- RLS policy testing (requires a separate pgTAP test suite — separate spec).
- Routing improvements (none needed — routing audit was clean).
