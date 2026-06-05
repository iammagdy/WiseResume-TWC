# Security Fixes Summary — Phase 1 (2026-06-05)

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

## Remaining (Phase 2+)

- Atomic AI credit deduction (non-atomic read-write race documented in ai-gateway)
- `ask-portfolio` server-side question counter (needs Appwrite Console schema change)
- Collection-level Appwrite permissions audit (belt-and-suspenders on subscription UPDATE removal)
- Idempotency keys for double-click protection on expensive AI calls
