# Security Fixes Summary — Phase 1 & 2 (2026-06-05)

Full audit report: `Project Atlas/AI-SECURITY-AUDIT-2026-06-05.md`
Full change log: `Project Atlas/CHANGELOG.md` (entry: 2026-06-05)

---

## What Was Fixed

### A — Server-side AI option lockdown (`ai-gateway`)
**Risk:** Clients could send `model`, `maxTokens`, `temperature` in the request body, enabling
model substitution and inflated token budgets.

**Fix:** Added `FEATURE_MAX_TOKENS` and `FEATURE_TEMPERATURE` constant maps. `callCandidate`
now uses `candidate.model` exclusively. Client values are ignored.

---

### B — `agentic-chat` history cap & validation (`ai-gateway`)
**Risk:** Unbounded `conversationHistory` array with no shape check enabled token flooding
(e.g. 1000-item history × long strings).

**Fix:** History is filtered to valid `{role, content}` objects (role must be `user` or
`assistant`), each item's content is capped to 2000 chars, and only the last 10 turns are sent.

---

### C — `send-contact-email` hardening (`ai-gateway`)
**Risk:** Raw user strings interpolated into HTML email body → stored XSS in admin inbox.
Rate limit was 5 emails/IP/hr.

**Fix:**
- Added `escapeHtml()` helper; applied to all user fields (name, email, type, message, subject).
- Content length limits: name ≤ 200, email ≤ 254, type ≤ 100, message ≤ 5000, subject ≤ 200 chars.
- `metadata` field removed from HTML template (prevented arbitrary JSON blob injection).
- Rate limit tightened from 5 to 3 emails per IP per hour.

---

### D — `ask-portfolio` (partial)
**Risk:** No server-side session or question-count validation.

**Status:** Full server-side counter requires a `question_count` attribute on the `chat_sessions`
Appwrite collection (manual Console step). The existing client-side 10-question guard remains.
This is tracked for Phase 2.

---

### E — Subscription document permissions (`coupons`, `admin-devkit-data`)
**Risk:** `Permission.update(Role.user(userId))` on `subscriptions` documents allowed
authenticated users to modify their own plan fields via the Appwrite client SDK.

**Fix:** `Permission.update` removed from all subscription document write sites:
- `coupons/src/main.js` — `writeSubscription()`
- `admin-devkit-data/src/main.js` — `set-plan`, `grant-trial`, `revoke-trial`

All DB writes use the admin API key; removing user-level write permission does not affect
server functionality.

---

### F — Hard-coded `ADMIN_EMAIL` fallback removed (`ai-gateway`, `admin-devkit-data`)
**Risk:** Fallback `'magdy.saber@outlook.com'` meant impersonation and admin-only paths
would silently activate for the hard-coded email if `ADMIN_EMAIL` env var was unset.

**Fix:** Fallback removed. Both functions now read `process.env.ADMIN_EMAIL || ''` —
impersonation and admin-gated paths fail closed when the env var is absent.

**Action required:** Ensure `ADMIN_EMAIL` is set in Appwrite Console for both functions.

---

### F (cont.) — `x-smoke-test` now requires authentication (`ai-gateway`)
**Risk:** Unauthenticated callers could probe `getProviderAvailability()` to learn which
AI providers are configured.

**Fix:** `x-smoke-test` path calls `validateUserSession()` and returns 401 for unauthenticated
requests.

---

### G — `wise-ai-chat` field whitelisting (`ai-gateway`)
**Risk:** The entire `opts` object (up to 60 KB) was `JSON.stringify`'d into the AI prompt,
letting clients inject arbitrary keys, override instructions, or dump sensitive fields.

**Fix:** Added `WISE_AI_CHAT_ALLOWED_FIELDS` map (per sub-feature type) and
`buildWiseAiChatPayload()`. Only whitelisted fields are included; each string is capped
at 4000 chars; total payload cap is 8 KB (down from 60 KB).

---

### H — Prompt-injection defense-in-depth (`ai-gateway`)
**Risk:** User-supplied content in `wise-ai-chat` and `agentic-chat` could attempt to
override system instructions.

**Fix:** Added explicit `SECURITY:` instruction to both system prompts directing the model
to ignore instruction-override attempts in user content.

---

### I — HTML-escaping in email template (covered under C above)
Already addressed in fix C.

---

## Files Changed

| File | Lines changed |
|------|--------------|
| `appwrite-hubs/ai-gateway/src/main.js` | ~80 lines |
| `appwrite-hubs/admin-devkit-data/src/main.js` | ~10 lines |
| `appwrite-hubs/coupons/src/main.js` | ~3 lines |
| `Project Atlas/CHANGELOG.md` | added 2026-06-05 entry |

## Deployment

```bash
node scripts/deploy_hubs.cjs --only=ai-gateway
node scripts/deploy_hubs.cjs --only=coupons
node scripts/deploy_hubs.cjs --only=admin-devkit-data
```

## Remaining (Phase 3+)

- Atomic AI credit deduction (non-atomic read-write race documented in ai-gateway)
- `ask-portfolio` server-side question counter (needs Appwrite Console schema change)
- Collection-level Appwrite permissions audit (belt-and-suspenders on subscription UPDATE removal)
- Persistent (DB-backed) rate limiting (current in-memory rate limiter resets on cold start)

---

# Phase 2: Idempotency, Deduplication & Credit Resilience (2026-06-05)

Full change log entry: `Project Atlas/CHANGELOG.md` (entry: 2026-06-05 Phase 2)

---

## What Was Fixed

### 1 — End-to-end idempotency (`ai-gateway`)

**Risk:** Double-click, refresh, back-nav, multi-tab replay → duplicate provider calls → duplicate credit charges.

**Fix:**
- Added `computeContentKey(userId, featureName, sanitizedOpts)` — server-side SHA256 of `userId:featureName:payloadHash:5-min-bucket`.
- Added `checkIdempotencyCache`, `createIdempotencyPending`, `updateIdempotencySuccess`, `deleteIdempotencyDoc` helpers.
- Before credit check: look up content key in `idempotency_cache`. Cache hit → return stored result at zero cost (or 409 if in-progress). Cache miss → create `pending` record.
- All 6 success code paths now call `updateIdempotencySuccess` before returning.
- All-candidates-exhausted failure paths call `deleteIdempotencyDoc` so users can retry.
- Credit check failure (exhausted credits) also releases the lock via `deleteIdempotencyDoc`.

### 2 — Client-side idempotency key (`appwrite-functions.ts`)

**Fix:** For every AI gateway call, `X-Idempotency-Key` is generated (UUID via `crypto.randomUUID()`) and packed into `__headers`. The server logs it for request tracing. 409 `request_in_progress` returns a clear user-facing message.

### 3 — `recordSuccessUsage` exponential backoff (`ai-gateway`)

**Risk:** If credit recording threw on the first attempt, credits were silently lost.

**Fix:** `recordSuccessUsage` now retries 3 times with 100ms / 500ms / 2s backoff. After all retries fail, logs a `[CRITICAL]` error for ops visibility. Provider call result is still returned to the user (correct — the AI work was done).

### 4 — `ai_credits` get-or-create race fix (`ai-gateway`)

**Risk:** Two concurrent first-requests for the same user both attempt `createDocument` → one gets a duplicate-document error → unhandled exception.

**Fix:** `createDocument` is now wrapped in try-catch. On 409 / "already exists", the code retries the `listDocuments` read to get the document the concurrent request created.

### 5 — Plan limit source of truth (`ai-gateway`)

**Risk:** `daily_limit` was written back to the `ai_credits` document on every credit deduction. If a user's plan changed, the old limit persisted until their next credit document update.

**Fix:**
- `recordAiUsage` no longer writes `daily_limit`.
- `loadCreditState` always derives `effectiveLimit` from `PLAN_DAILY_LIMITS[plan]` directly, ignoring any stored value.

### 6 — `safeLogAiRequest` observability (`ai-gateway`)

**Risk:** Collection missing → silent failure → zero operational visibility.

**Fix:**
- Logs a `console.warn` once per cold start when `ai_request_logs` is missing (not silent).
- New fields captured: `credits_charged`, `idempotency_key`, `is_idempotency_hit`.
- Idempotency cache hits also logged with `provider: 'cache'` for easy filtering.

### 7 — Idempotency collection missing → graceful degradation

All idempotency helpers return null/false when the collection is missing, never blocking a real request. A one-time `console.warn` is logged so ops can create the collection.

---

## New Appwrite Collections Required

### `idempotency_cache` (DB: `main`)

| Attribute | Type | Size | Required | Notes |
|-----------|------|------|----------|-------|
| `key` | String | 64 | Yes | **Unique index required** |
| `user_id` | String | 36 | Yes | |
| `feature` | String | 64 | Yes | |
| `status` | String | 16 | Yes | `pending` \| `success` \| `failed` |
| `has_result` | Boolean | — | Yes | Whether cached_result is populated |
| `cached_result` | String | 65536 | No | JSON-encoded full response (≤60KB) |
| `created_at` | String | 32 | Yes | ISO datetime |
| `expires_at` | String | 32 | Yes | ISO datetime (5 min after created_at) |

**Permissions:** Server-only (no user read/write).

### `ai_request_logs` — updated attributes

Add to existing collection:

| Attribute | Type | Size | Notes |
|-----------|------|------|-------|
| `credits_charged` | Integer | — | |
| `idempotency_key` | String | 64 | Nullable |
| `is_idempotency_hit` | Boolean | — | |

---

## Manual Appwrite Console Steps

1. **Create `idempotency_cache` collection** in DB `main` with attributes above.
2. **Add unique index** on `idempotency_cache.key`.
3. **Add `credits_charged`, `idempotency_key`, `is_idempotency_hit`** attributes to existing `ai_request_logs` collection.
4. **Add unique index** on `ai_credits.user_id` (prevents duplicate-document race at DB level — belt-and-suspenders for the code-side fix in item 4 above).

---

## Files Changed

| File | Change |
|------|--------|
| `appwrite-hubs/ai-gateway/src/main.js` | ~170 lines: idempotency helpers, retry logic, plan-limit fix, get-or-create fix, logging improvements |
| `src/lib/appwrite-functions.ts` | +15 lines: per-click UUID header, 409 error message |
| `src/hooks/__tests__/useAIAction-D1.test.ts` | +50 lines: 4 new Phase 2 test scenarios |
| `Project Atlas/CHANGELOG.md` | Phase 2 entry added |

## Deployment

```bash
node scripts/deploy_hubs.cjs --only=ai-gateway
```

(Frontend changes go live on next Vercel deploy.)

## Tests Added

| Test scenario | Covered |
|---------------|---------|
| 409 dedup hit returns null, no cache invalidation | ✅ |
| Double-click failure does not trigger credit invalidation | ✅ |
| Concurrent actions both succeed but server handles dedup | ✅ |
| Provider failure does not invalidate credits cache | ✅ |

## Known Limitations Deferred to Phase 3

- **Non-atomic credit deduction**: The read-then-write in `loadCreditState + recordAiUsage` can still over-spend under concurrent requests on different function instances. The idempotency lock mitigates the common case (same fingerprint → 409), but different inputs from two tabs can still race. Requires Appwrite atomic increment or per-user DB lock.
- **In-memory rate limiter resets on cold start**: `_serverRateLimits` is lost when Appwrite cold-starts a new function instance. A persistent DB-backed rate limit is Phase 3 work.
- **`ask-portfolio` question counter**: Server-side cap deferred pending Appwrite Console schema addition.
- **Idempotency cache TTL cleanup**: Expired records are filtered at read time but never actively purged. A cleanup function (Phase 3) or Appwrite TTL attribute would keep the collection compact.
- Idempotency keys for double-click protection on expensive AI calls
