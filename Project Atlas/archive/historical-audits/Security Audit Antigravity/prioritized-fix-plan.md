# Prioritized Fix Plan — WiseResume-TWC Security Audit

**Date:** 2026-06-09 | **Audited commit:** `main` @ `96beb3ec`

This plan is ordered by severity × exploitability × effort. Each fix is tagged with:
- **Owner:** Backend (Appwrite hub code), Frontend (React/Vite), Infra (Appwrite/Vercel/GHA Console), or Docs
- **Effort:** XS (<1hr), S (1-4hr), M (half-day), L (1-2 days), XL (2+ days)
- **Prerequisite:** Items that must be done first

---

## Immediate Actions — Do These First (No Code Changes Required)

### FIX-01: Verify Appwrite execute permissions for all admin functions
**Finding:** WR-2026-001  
**Owner:** Infra  
**Effort:** XS  
**Action:**
1. Log into Appwrite Console → project `69fd362b001eb325a192`
2. For each of these functions, check Settings → Execute Access:
   - Admin DevKit Data Hub → set to `users` (requires any authenticated user; code-level admin check handles the rest)
   - Admin Impersonate Hub → set to `users`
   - Admin Deploy Hubs → set to `users`
   - Admin Email Hub → set to `users`
   - Admin Testmail Hub → set to `users`
3. Public-facing functions are fine as `any`: AI Gateway Hub, Public Share Hub, Resume Section AI Hub, AI Health Hub, Job Import Hub
4. After verifying/setting, update `appwrite.json` to reflect these permissions so they aren't overwritten on next deploy

---

### FIX-02: Configure IMPERSONATION_HMAC_SECRET as a separate secret
**Finding:** WR-2026-003  
**Owner:** Infra  
**Effort:** XS  
**Prerequisite:** None  
**Action:**
1. Generate: `openssl rand -hex 32`
2. Add to GitHub repository secrets: `IMPERSONATION_HMAC_SECRET = <new-value>`
3. Add to Appwrite Console → Functions → Admin DevKit Data Hub → Environment Variables: `IMPERSONATION_HMAC_SECRET = <new-value>`
4. Add to Admin Impersonate Hub env vars as well
5. Trigger "Deploy Appwrite Hubs" workflow targeting `admin-devkit-data,admin-impersonate`
6. Verify: old impersonation tokens (signed with API key) will be invalidated — admins will need to re-authenticate to DevKit (15-min TTL, self-healing)

---

### FIX-03: Verify chat_sessions.question_count attribute exists
**Finding:** WR-2026-008  
**Owner:** Infra  
**Effort:** XS  
**Action:**
1. Appwrite Console → Databases → main → Collections → chat_sessions
2. Check if attribute `question_count` (Integer, default: 0) exists
3. If missing: Create attribute manually in the Console
4. Verify: Make a portfolio chat request and check that server logs no longer show the `chat_sessions.question_count attribute is missing` warning

---

### FIX-04: Verify resumes and tailor_history permissions
**Finding:** Schema Permissions Audit — UNKNOWN collections  
**Owner:** Infra  
**Effort:** XS  
**Action:**
1. Appwrite Console → Databases → main → Collections → resumes
2. Confirm per-document security is enabled and each document has `read("user:$userId")` permission
3. Confirm no collection-level `read("any")` permission
4. Repeat for `tailor_history`, `profiles`, `chat_sessions`, `ai_routing_config`, `ai_credits`

---

## High Priority Fixes — Before Next Release

### FIX-05: Add authentication to send-email path
**Finding:** WR-2026-002  
**Owner:** Backend (ai-gateway)  
**Effort:** S  
**Prerequisite:** None  
**File:** `appwrite-hubs/ai-gateway/src/main.js` ~line 2306

**Change:** Move the email feature AFTER `validateUserSession()` (line 2369) so it requires an authenticated Appwrite JWT. Contact form submissions already come from logged-in users in the frontend.

If unauthenticated contact form is a product requirement (non-logged-in visitors), implement Option B: add a server-signed challenge token (time-limited, single-use) that the frontend fetches from an authenticated endpoint before showing the form.

---

### FIX-06: Migrate portfolio passwords to bcrypt
**Finding:** WR-2026-004  
**Owner:** Backend (api/public-portfolio.ts)  
**Effort:** M  
**Prerequisite:** None  
**File:** `api/public-portfolio.ts`

Replace `sha256Hex()` with bcrypt. Add a `hash_version` field to the portfolio settings document for migration tracking. On successful SHA-256 login, re-hash with bcrypt and store the new hash.

---

### FIX-07: Replace DevKit localStorage with sessionStorage
**Finding:** WR-2026-006  
**Owner:** Frontend  
**Effort:** S  
**Prerequisite:** None  
**Files:** `src/contexts/DevKitSessionContext.tsx`

Replace `localStorage.setItem(LS_TOKEN_KEY, token)` with `sessionStorage.setItem(...)`. This keeps the token accessible within the browser tab but removes it when the tab closes. Eliminates the most impactful XSS theft vector.

Optionally: remove the "Remember me" checkbox entirely since admin sessions should not persist.

---

### FIX-08: Add impersonation audit log
**Finding:** WR-2026-009  
**Owner:** Backend (admin-impersonate, ai-gateway) + Infra  
**Effort:** M  
**Prerequisite:** FIX-01 (or ensure admin-impersonate execute perm is correct)  
**Files:** `appwrite-hubs/admin-impersonate/src/main.js`, `appwrite-hubs/ai-gateway/src/main.js`

1. Create `admin_audit_log` Appwrite collection (server-only permissions)
2. On each `claim` action in admin-impersonate: write audit document
3. Add `impersonated_by` field to `ai_request_logs` writes when `callerIsAdmin && impersonatingUserId`

---

### FIX-09: Add rate limit on portfolio session creation
**Finding:** WR-2026-018 (also mitigates WR-2026-011)  
**Owner:** Backend (public-share)  
**Effort:** S  
**File:** `appwrite-hubs/public-share/src/main.js`

Add IP-based rate limiting on `create-portfolio-chat-session` action. Use persistent storage (Appwrite DB document with TTL-based cleanup) rather than in-memory Map. Limit: 5 sessions per IP per hour.

---

### FIX-10: Persist email rate limit to Appwrite DB
**Finding:** WR-2026-007, WR-2026-016  
**Owner:** Backend (ai-gateway)  
**Effort:** S  
**File:** `appwrite-hubs/ai-gateway/src/main.js`

Replace `_emailRateLimits` Map with `checkPersistentRateLimit`-equivalent that writes to an Appwrite collection. This makes the limit:
- Global across function instances
- Persistent through cold starts
- Not bypassable by targeting a fresh instance

If Cloudflare is confirmed present in front of Appwrite Functions, also add validation that `cf-connecting-ip` header is present and reject requests without it.

---

## Medium Priority Fixes — Before Scale

### FIX-11: Add authentication to job-import hub
**Finding:** WR-2026-017  
**Owner:** Backend (job-import)  
**Effort:** S  
**File:** `appwrite-hubs/job-import/src/main.js`

Add `validateUserSession()` (or equivalent JWT verification) at the start of the handler. The `userId` field should be derived from the session, not the request body.

Additionally, add resolved-IP validation for DNS rebinding protection:
```js
const dns = require('dns').promises;
const { hostname } = new URL(url);
const ips = await dns.resolve4(hostname).catch(() => []);
for (const ip of ips) {
  if (BLOCKED_RANGES.some(re => re.test(ip))) {
    return res.json({ ok: false, error: 'Blocked URL' }, 400);
  }
}
```

---

### FIX-12: Migrate credit race condition to persistent rate limit
**Finding:** WR-2026-005  
**Owner:** Backend (ai-gateway, resume-section-ai)  
**Effort:** L  
**File:** `appwrite-hubs/ai-gateway/src/main.js`, `appwrite-hubs/resume-section-ai/src/main.js`

Extend `checkPersistentRateLimit` to cover ALL features (including cost-1), not just cost≥2. This creates a durable, cross-instance per-minute cap that significantly reduces the race window.

For the write race itself: implement a credit lock document in Appwrite (`credit_locks` collection) with TTL. Acquire lock before credit read-write, release after. This serializes credit updates per user.

---

### FIX-13: Add idempotency cache to resume-section-ai
**Finding:** WR-2026-015  
**Owner:** Backend (resume-section-ai)  
**Effort:** S  
**File:** `appwrite-hubs/resume-section-ai/src/main.js`

Copy the idempotency pattern from `ai-gateway`. Key: `userId + sectionType + hash(resumeContent).slice(0, 32)`. TTL: 5 minutes.

---

### FIX-14: Introduce separate HMAC secrets per token purpose
**Finding:** WR-2026-010, WR-2026-023  
**Owner:** Backend (all hubs) + Infra  
**Effort:** M  
**Files:** `appwrite-hubs/ai-gateway/src/main.js`, `appwrite-hubs/public-share/src/main.js`, `appwrite-hubs/admin-devkit-data/src/main.js`

Introduce:
- `ADMIN_TEST_HMAC_SECRET` for admin test nonces
- `PUBLIC_SHARE_TOKEN_SECRET` for portfolio session tokens
- `GATEWAY_SMOKE_SECRET` for smoke tokens

Each hub uses its purpose-specific secret. A leak of any one secret does not compromise all token types.

Note: FIX-02 already handles the most critical case (`IMPERSONATION_HMAC_SECRET`). This is the broader pattern.

---

### FIX-15: Scrub error messages in Sentry beforeSend
**Finding:** WR-2026-012  
**Owner:** Frontend  
**Effort:** XS  
**File:** `src/lib/monitoring.ts`

Add to `beforeSend`:
```typescript
if (event.exception?.values) {
  event.exception.values.forEach(v => {
    if (v.value && v.value.length > 300) {
      v.value = v.value.slice(0, 300) + '...[truncated for PII protection]';
    }
  });
}
```

Alternatively, set `sendDefaultPii: false` and only add back the safe context fields.

---

### FIX-16: Add schema setup scripts for missing collections
**Finding:** Schema Permissions Audit  
**Owner:** Backend + Infra  
**Effort:** M  
**Files:** new `scripts/setup_chat_sessions_schema.cjs`, `setup_ai_routing_config_schema.cjs`, `setup_ai_credits_schema.cjs`

Create idempotent setup scripts for:
- `chat_sessions` — include `question_count: Integer, default: 0` attribute
- `ai_routing_config` — server-only write permissions
- `ai_credits` — server-only write; user-read own document

Add these to the GHA deploy workflow as additional "Ensure ... schema" steps.

---

## Low Priority Fixes — Maintenance Window

### FIX-17: Extend source hash to full 64 chars
**Finding:** WR-2026-013  
**Owner:** Backend + Infra  
**Effort:** XS  
**File:** `scripts/compute-source-hashes.mjs`

Remove `.slice(0, 16)`. Commit the updated manifest. All future deployments will use the full hash.

---

### FIX-18: Remove unsafe-inline from CSP
**Finding:** WR-2026-019  
**Owner:** Frontend  
**Effort:** XL (architectural change)  
**File:** `public/_headers`, `vercel.json`, Vite config

Migrate to `nonce`-based CSP. Requires:
1. Vite plugin for CSP nonce injection (`vite-plugin-csp` or custom)
2. Update all inline styles to use nonces or move to CSS files
3. Update all inline event handlers

This is a significant refactor. Low immediate risk given no current XSS vector.

---

### FIX-19: Clean up .env.example
**Finding:** WR-2026-020  
**Owner:** Docs  
**Effort:** XS  
**File:** `.env.example`

Remove all `KINDE_*` and `SUPABASE_*` entries. Add comments explaining current Appwrite-native auth.

---

### FIX-20: Populate appwrite.json $id fields
**Finding:** WR-2026-021  
**Owner:** Infra  
**Effort:** S  
**File:** `appwrite.json`

Copy each function's ID from the Appwrite Console URL into the corresponding `$id` field in `appwrite.json`. This stabilizes CLI deploys to update existing functions rather than potentially creating duplicates.

---

### FIX-21: Update or remove .well-known/openid-configuration
**Finding:** WR-2026-022  
**Owner:** Infra / Docs  
**Effort:** XS  
**File:** `public/.well-known/openid-configuration`

Remove if WiseResume does not act as an OIDC identity provider. If it does (for MCP or third-party integrations), update to point to the current Appwrite Auth endpoints.

---

## Fix Priority Matrix

| Fix | Finding | Effort | Owner | Do First? |
|---|---|---|---|---|
| FIX-01 | WR-2026-001 | XS | Infra | ✅ Yes — no deploy needed |
| FIX-02 | WR-2026-003 | XS | Infra | ✅ Yes — no code change |
| FIX-03 | WR-2026-008 | XS | Infra | ✅ Yes — Console only |
| FIX-04 | Schema UNKNOWN | XS | Infra | ✅ Yes — verification only |
| FIX-05 | WR-2026-002 | S | Backend | Before next release |
| FIX-06 | WR-2026-004 | M | Backend | Before next release |
| FIX-07 | WR-2026-006 | S | Frontend | Before next release |
| FIX-08 | WR-2026-009 | M | Backend | Before next release |
| FIX-09 | WR-2026-018 | S | Backend | Before next release |
| FIX-10 | WR-2026-007/016 | S | Backend | Before next release |
| FIX-11 | WR-2026-017 | S | Backend | Before scale |
| FIX-12 | WR-2026-005 | L | Backend | Before scale |
| FIX-13 | WR-2026-015 | S | Backend | Before scale |
| FIX-14 | WR-2026-010/023 | M | Backend | Before scale |
| FIX-15 | WR-2026-012 | XS | Frontend | Before scale |
| FIX-16 | Schema gaps | M | Backend | Before scale |
| FIX-17 | WR-2026-013 | XS | Backend | Maintenance |
| FIX-18 | WR-2026-019 | XL | Frontend | Architectural debt |
| FIX-19 | WR-2026-020 | XS | Docs | Maintenance |
| FIX-20 | WR-2026-021 | S | Infra | Maintenance |
| FIX-21 | WR-2026-022 | XS | Infra | Maintenance |
