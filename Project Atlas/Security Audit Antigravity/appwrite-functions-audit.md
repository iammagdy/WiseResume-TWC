# Appwrite Functions Audit — WiseResume-TWC

**Date:** 2026-06-09 | **Audited commit:** `main` @ `96beb3ec`

---

## Summary

| Function | Execute Perm | Auth Check | Admin Gate | Error Leakage | Notes |
|---|---|---|---|---|---|
| AI Gateway Hub | [] UNKNOWN | JWT + admin label | DevKit HMAC | Low | Send-email bypasses auth (WR-2026-002) |
| Admin DevKit Data Hub | [] UNKNOWN | HMAC DevKit token | Admin label | Low | IMPERSONATION fallback (WR-2026-003) |
| Admin Impersonate Hub | [] UNKNOWN | HMAC DevKit token | Admin label | Low | No audit trail (WR-2026-009) |
| Admin Deploy Hubs Hub | [] UNKNOWN | HMAC DevKit token | Admin label | Low | execSync — acceptable, restricted |
| Admin Email Hub | [] UNKNOWN | HMAC DevKit token | Admin label | Low | OK |
| Admin Testmail Hub | [] UNKNOWN | HMAC DevKit token | Admin label | Low | OK |
| AI Health Hub | [] UNKNOWN | None | None | Low | Public, no rate limit (WR-2026-014) |
| Public Share Hub | [] UNKNOWN | None (public) | N/A | Low | No session rate limit (WR-2026-018) |
| Resume Section AI Hub | [] UNKNOWN | JWT | None | Low | No idempotency (WR-2026-015) |
| Job Import Hub | [] UNKNOWN | None | None | Low | No auth + SSRF risk (WR-2026-017) |

---

## Platform Execute Permissions — CRITICAL UNKNOWN (WR-2026-001)

All 20 functions have `"execute": []` in `appwrite.json`. Appwrite's CLI behavior when deploying with an empty execute array is:
- If the function already exists in the Console with explicit permissions → those are preserved
- If the function is newly created → Appwrite defaults to `any` (unauthenticated execution)

**Manual verification required for all functions.** See WR-2026-001 in `findings.md`.

---

## Per-Function Details

### AI Gateway Hub (`appwrite-hubs/ai-gateway/src/main.js`)

**Execute:** [] UNKNOWN  
**Auth:** Appwrite JWT validated via `validateUserSession()` → verifies token with Appwrite API  
**Admin gate:** `ask-admin-*` features require `callerIsAdmin` (checks `admin` label on Appwrite user)  
**Rate limits:** `checkServerRateLimit` (in-memory, 20/60s), `checkPersistentRateLimit` (DB-backed, per-minute)

**Security findings:**
- WR-2026-002: `send-email`/`send-contact-email` bypass `validateUserSession()` — only IP rate limit
- WR-2026-007: In-memory server rate limits not global
- WR-2026-010: Admin test nonce signed with `APPWRITE_API_KEY`
- WR-2026-011: `ask-portfolio` charges owner credits per visitor
- WR-2026-016: XFF spoofing for email IP rate limit

**Positive findings:**
- HMAC verification uses `timingSafeEqual` ✅
- HTML escaping in email builder (`escapeHtml()`) prevents injection ✅
- Prompt injection mitigation in `buildMessages()` system prompt ✅
- Destination locked in email send (`to: ['contact@thewise.cloud']`) — no open relay ✅
- Error responses do not leak provider keys or internal stack traces ✅

---

### Admin DevKit Data Hub (`appwrite-hubs/admin-devkit-data/src/main.js`)

**Execute:** [] UNKNOWN  
**Auth:** DevKit session token (HMAC-SHA256 signed, verified in `verifyDevKitToken()`)  
**Admin gate:** Appwrite admin label check

**Security findings:**
- WR-2026-003: `getImpersonationSecret()` falls back to `APPWRITE_API_KEY`
- WR-2026-006: DevKit "Remember me" stores token in localStorage (frontend issue)

**Positive findings:**
- All mutation routes (routing config writes, etc.) require valid DevKit token ✅
- No env var logging ✅

---

### Admin Impersonate Hub (`appwrite-hubs/admin-impersonate/src/main.js`)

**Execute:** [] UNKNOWN  
**Auth:** DevKit session token  
**Admin gate:** Admin label check

**Security findings:**
- WR-2026-009: No audit log on `claim` action
- WR-2026-003: Uses same shared secret ecosystem

**Token lifecycle:**
- Impersonation tokens: 15-minute TTL ✅
- Token purposes are distinct (`gateway-admin-test`, `public-portfolio-chat`, etc.) ✅
- `timingSafeEqual` used in verification ✅

---

### Admin Deploy Hubs (`appwrite-hubs/admin-deploy-hubs/src/main.js`)

**Execute:** [] UNKNOWN  
**Auth:** DevKit session token  
**Admin gate:** Admin label check

**`execSync` usage:** Used for `npm ci` and hub packaging operations. Input is function names from a whitelist (`HUB_TARGETS` array), not user-supplied strings. Acceptable risk given admin-only access.

**GitHub token:** `GITHUB_TOKEN` used for dispatch operations. Not logged to console. ✅

---

### Admin Email Hub (`appwrite-hubs/admin-email/src/main.js`)

**Execute:** [] UNKNOWN  
**Auth:** DevKit session token  
**Admin gate:** Admin label check

**Arbitrary email concern:** The admin email hub can send to caller-specified addresses (unlike ai-gateway which locks to `contact@thewise.cloud`). This is intentional admin functionality. Risk is acceptable given admin-only gate.

**HTML injection:** Caller-supplied HTML content is not escaped — intentional for admin-crafted emails. No XSS risk to recipients beyond what an admin can already do.

---

### AI Health Hub (`appwrite-hubs/ai-health/src/main.js`)

**Execute:** [] UNKNOWN  
**Auth:** None  
**Security findings:**
- WR-2026-014: Fully public, reveals provider health status in real-time, no rate limit

---

### Public Share Hub (`appwrite-hubs/public-share/src/main.js`)

**Execute:** [] UNKNOWN  
**Auth:** None required for public portfolio access (by design)  
**Token signing:** `APPWRITE_API_KEY` HMAC (WR-2026-023)

**Security findings:**
- WR-2026-018: No rate limit on `create-portfolio-chat-session`
- WR-2026-023: Shared HMAC secret

**Positive findings:**
- Share password comparison uses `timingSafeStringEqual` ✅
- `sdk.ID.unique()` for session IDs (UUID-equivalent entropy) ✅
- Session token TTL: 6 hours (reasonable) ✅
- Internal gateway token TTL: 2 minutes (tight) ✅
- Cross-portfolio username check prevents session re-use across portfolios ✅

---

### Resume Section AI Hub (`appwrite-hubs/resume-section-ai/src/main.js`)

**Execute:** [] UNKNOWN  
**Auth:** Appwrite JWT

**Security findings:**
- WR-2026-015: No idempotency cache (double-click → 2 credits)

---

### Job Import Hub (`appwrite-hubs/job-import/src/main.js`)

**Execute:** [] UNKNOWN  
**Auth:** None  

**Security findings:**
- WR-2026-017: Fetches URLs server-side without authentication
- SSRF protection present but hostname-regex-based (DNS rebinding possible)
- `userId` accepted from request body without session verification

---

## Error Handling Review

No hub returns stack traces or internal error objects to callers. Error messages are generic strings. Provider API key errors are caught and not propagated to callers. ✅

Exception: `admin-deploy-hubs` logs execSync output which may include npm install errors — these are visible only to admin DevKit panel users. Acceptable.
