# Complete Finding Registry — WiseResume-TWC Security Audit

**Date:** 2026-06-09 | **Audited commit:** `main` @ `96beb3ec`

---

## P0 — Critical

---

### WR-2026-001: Appwrite platform execute permissions unknown for all 20 functions

**Severity:** P0 Critical  
**Status:** UNKNOWN — requires Appwrite Console verification  
**Area:** Appwrite Functions Security

**Evidence:**  
`appwrite.json` has `"execute": []` (empty array) for all 20 deployed functions including admin functions. When Appwrite CLI deploys with an empty execute array, the platform may default to `any` (unauthenticated) if no explicit permissions are set in the Console.

```json
"execute": []
```
(All 20 functions: AI Gateway Hub, Admin Sentry Hub, Admin Deploy Hubs, Admin DevKit Data Hub, Admin Email Hub, Admin Feature Flags Hub, Admin Impersonate Hub, Admin Moderation Hub, Admin Onboarding Funnel Hub, Admin Portfolio Usernames Hub, Admin Testmail Hub, Admin Visitor Analytics Hub, AI Health Hub, Coupons Hub, Email Service Hub, Inspect AI Keys Hub, Job Import Hub, Public Share Hub, Resume Section AI Hub, WiseHire Gateway Hub)

**Impact:**  
If admin functions (`admin-devkit-data`, `admin-impersonate`, `admin-deploy-hubs`, `admin-email`) have no platform-level execute gate, any unauthenticated HTTP request reaches the code-level auth check. Code-level auth is the only defence. A leaked or forged token bypasses everything.

**Manual Verification Steps:**  
1. Log in to the Appwrite Console at `fra.cloud.appwrite.io`
2. Navigate to project `69fd362b001eb325a192`
3. Go to Functions → each of these four functions:
   - Admin DevKit Data Hub
   - Admin Impersonate Hub
   - Admin Deploy Hubs
   - Admin Email Hub
4. Click **Settings** → **Execute Access**
5. Confirm the value is **NOT** `any` (unauthenticated)
6. Acceptable values: `users` (any authenticated user, then code-level admin check applies), or a specific team/label
7. Also verify AI Gateway Hub, Public Share Hub, Resume Section AI Hub are accessible as intended (likely `any` is correct for public-facing functions)

**Recommended Fix:**  
Set execute permissions in Appwrite Console for admin functions to `users` or a specific admin team. Then update `appwrite.json` to mirror those permissions so they are not overwritten on next deploy.

---

### WR-2026-002: Unauthenticated email send path — no auth, in-memory IP rate limit only

**Severity:** P0 Critical (P1 if Cloudflare enforces real IP)  
**Status:** CONFIRMED from code review  
**Area:** AI Gateway Abuse  

**Evidence:**  
`appwrite-hubs/ai-gateway/src/main.js` lines 2306–2353: the `send-email` and `send-contact-email` feature names bypass `validateUserSession()` entirely. Only `checkEmailRateLimit()` is called, which uses an in-memory `Map` reset on cold start, per function instance.

```js
// Line 2306 — zero auth before here
if (featureName === 'send-email' || featureName === 'send-contact-email') {
  const clientIp = getClientIp(req);
  const ipLimit = checkEmailRateLimit(clientIp);
  // ... 3/hour per IP, in-memory, per-instance
```

IP extraction (lines 159–174) falls back to `x-forwarded-for` header which is client-controlled when Cloudflare `cf-connecting-ip` is absent:
```js
function getClientIp(req) {
  const cfIp = headers['cf-connecting-ip'];   // trusted only if Cloudflare is present
  if (cfIp) return cfIp;
  const realIp = headers['x-real-ip'];
  if (realIp) return realIp;
  const xff = headers['x-forwarded-for'];    // UNTRUSTED — client-controllable
```

Additionally, if IP is `'unknown'`, the rate limit allows the call unconditionally (line 178):
```js
function checkEmailRateLimit(ip) {
  if (!ip || ip === 'unknown') return { ok: true };
```

**Impact:**  
An attacker can send unlimited emails to `contact@thewise.cloud` by rotating spoofed `x-forwarded-for` headers or triggering `'unknown'` IP. Destination is locked (no open relay), so this is inbox spam to the owner, not arbitrary phishing. Severity is P0 during cold-start abuse bursts; degrades to P1 with Cloudflare present.

**Cloudflare Status:** UNKNOWN — cannot determine from code whether Appwrite Function endpoints are behind Cloudflare.

**Manual Verification:**  
1. Make a request to the ai-gateway function endpoint without a `cf-connecting-ip` header
2. If `x-forwarded-for` manipulation changes the apparent IP in logs → Cloudflare absent → P0
3. Check Appwrite Console Network settings for any CDN proxy config

**Recommended Fix:**  
Option A (preferred): Require Appwrite user session for send-email — move it after `validateUserSession()`. This prevents unauthenticated spam entirely.  
Option B: Add a server-signed challenge token (CAPTCHA-equivalent) that the frontend requests before showing the contact form, and validate it in the email handler.  
Option C (partial): If Option A/B not feasible, persist rate limit to Appwrite DB (same pattern as `checkPersistentRateLimit`) so it survives instance restarts and is global.

---

### WR-2026-003: IMPERSONATION_HMAC_SECRET falls back to APPWRITE_API_KEY

**Severity:** P0 Critical  
**Status:** CONFIRMED from code review  
**Area:** Admin / Impersonation Security  

**Evidence:**  
`appwrite-hubs/admin-devkit-data/src/main.js` lines 32–35:

```js
function getImpersonationSecret() {
  return process.env.IMPERSONATION_HMAC_SECRET
    || process.env.APPWRITE_API_KEY
    || process.env.APPWRITE_FUNCTION_API_KEY;
}
```

The same `APPWRITE_API_KEY` also signs DevKit session tokens (line 47):
```js
const s = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY;
```

And is used as the HMAC secret in `verifySignedInternalToken()` in `ai-gateway` (line 338):
```js
const secret = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY;
```

**Impact:**  
One leaked `APPWRITE_API_KEY` compromises:
1. All Appwrite DB operations (direct API access)
2. Impersonation token forgery → full account takeover for any user
3. Admin test nonce forgery → unlimited free AI calls
4. Public portfolio gateway token forgery → bypass portfolio session limits

**Secret Configuration Status:** UNKNOWN — cannot determine from code whether `IMPERSONATION_HMAC_SECRET` is configured as a separate secret in the Appwrite Console.

**Manual Verification:**  
1. In Appwrite Console → Functions → Admin DevKit Data Hub → Settings → Environment Variables
2. Confirm `IMPERSONATION_HMAC_SECRET` is present and distinct from `APPWRITE_API_KEY`
3. Confirm it is a random 32+ byte secret (not derived from the API key)

**Recommended Fix:**  
1. Generate a separate 32-byte random secret: `openssl rand -hex 32`
2. Set it as `IMPERSONATION_HMAC_SECRET` in all functions that use impersonation (admin-devkit-data, admin-impersonate)
3. Do not remove the `APPWRITE_API_KEY` fallback until the new secret is confirmed deployed (rolling migration)

---

## P1 — High

---

### WR-2026-004: Portfolio passwords stored as unsalted SHA-256

**Severity:** P1 High  
**Status:** CONFIRMED  
**Area:** Public Portfolio Security  

**Evidence:**  
`api/public-portfolio.ts` lines 47–49, 248–250:

```typescript
async function sha256Hex(text: string): Promise<string> {
  return createHash('sha256').update(text).digest('hex');
}
// ...
const submittedHash = await sha256Hex(submittedPassword);
if (!settings.passwordHash || submittedHash !== settings.passwordHash) {
  return res.status(401).json({ error: 'invalid_password' });
}
```

No salt is generated or stored. All identical passwords produce identical hashes.

**Impact:**  
If the Appwrite database is compromised (or a DB dump is obtained via a future vulnerability), portfolio passwords are vulnerable to precomputed rainbow-table attacks. Common passwords (e.g., "resume2024") are trivially cracked.

**Exploit Prerequisite:** Database compromise required — this is not directly exploitable from the internet.

**Recommended Fix:**  
Replace `sha256Hex` with `bcrypt` (cost factor 12) or `argon2id`. Migration path:
1. On next successful password verification, re-hash with bcrypt and store the new hash
2. Mark old SHA-256 hashes with a `hash_version: 'sha256'` field for migration tracking
3. After migration period, invalidate remaining SHA-256 hashes and require password reset

---

### WR-2026-005: Credit deduction race condition — no atomic increment

**Severity:** P1 High  
**Status:** CONFIRMED  
**Area:** Credits / Billing / Quota  

**Evidence:**  
`appwrite-hubs/ai-gateway/src/main.js` lines 690–728 (`recordAiUsage()`):

```js
// Optimistic re-read — not atomic
const freshDoc = await db.getDocument(DB_ID, AI_CREDITS_COLLECTION_ID, docId);
if (freshDoc.$updatedAt !== capturedUpdatedAt) {
  baseDoc = freshDoc;  // use fresh base if modified
}
// Still susceptible: two concurrent requests both read at same $updatedAt
const baseUsage = (baseDoc.usage_date === today) ? Number(baseDoc.daily_usage || 0) : 0;
await db.updateDocument(..., { daily_usage: baseUsage + cost });
```

The re-read partially mitigates sequential concurrent writes (where request B starts after request A writes) but does not prevent request A and request B reading at the same time with identical `$updatedAt`.

**Impact:**  
Under concurrent AI requests, users can exceed daily credit limits by up to `cost × N` where N is the number of concurrent requests in the race window (~100ms DB round-trip). For a user at the daily limit, two simultaneous requests can both charge, effectively doubling the credit spend.

**Recommended Fix:**  
Option A (best): Use an Appwrite Function queue/sequential processing per user (serialize credit writes).  
Option B: Add a per-user lock document in a `credit_locks` collection; acquire before read-write, release after.  
Option C (partial): Increase reliance on `checkPersistentRateLimit` which is cross-instance and durable.

---

### WR-2026-006: DevKit "Remember me" stores admin session token in localStorage

**Severity:** P1 High  
**Status:** CONFIRMED  
**Area:** Admin / Impersonation Security  

**Evidence:**  
`src/contexts/DevKitSessionContext.tsx`:
```typescript
const LS_TOKEN_KEY = 'devkit_session_token';
// ... on "Remember me" checked:
localStorage.setItem(LS_TOKEN_KEY, token);
```

The DevKit session token is an HMAC-signed JWT-like token granting access to the admin panel (routing overrides, user data reads, impersonation URL generation). Storing it in `localStorage` exposes it to any JavaScript executing in the same origin.

**Impact:**  
An XSS vulnerability anywhere on `resume.thewise.cloud` (even in a third-party script) can steal the DevKit session token and use it to:
- Override AI routing configuration for any user
- Read user data from Appwrite
- Generate impersonation URLs → access any user's account

**Mitigating Factors:**  
- CSP `script-src 'self' 'unsafe-inline'` limits inline script injection but `'unsafe-inline'` weakens it
- No XSS vulnerabilities found in current code (no `dangerouslySetInnerHTML`)
- Token has a TTL (expires after DevKit session duration)

**Recommended Fix:**  
Store the DevKit session token in an `httpOnly; SameSite=Strict; Secure` cookie instead of `localStorage`. Since DevKit is admin-only and not needed cross-tab, session storage (`sessionStorage`) is a better alternative to `localStorage` for the non-persisted case.

---

### WR-2026-007: In-memory rate limits not global across Appwrite instances

**Severity:** P1 High  
**Status:** CONFIRMED  
**Area:** AI Gateway Abuse / Credits  

**Evidence:**  
`appwrite-hubs/ai-gateway/src/main.js`:
```js
const _serverRateLimits = new Map();   // 20 req/60s per user per feature — in-memory
const _emailRateLimits  = new Map();   // 3 emails/hr per IP — in-memory
```

Both reset on cold start. Appwrite scales Functions horizontally; each instance has its own Map.

The persistent rate limit (`checkPersistentRateLimit`) IS durable (queries `ai_request_logs` collection) but only fires for features with credit cost ≥ 2.

**Impact:**  
- `_serverRateLimits`: Free-tier users (cost-1 features) can fire 20 req/min × N instances before triggering the durable limit
- `_emailRateLimits`: Contact form can receive 3 emails/hr × N instances per spoofed IP

**Recommended Fix:**  
For email: move to persistent rate limit (Appwrite DB). For server rate limits: extend `checkPersistentRateLimit` to cover all features (including cost-1 features) with a lower threshold.

---

### WR-2026-008: Portfolio chat question limit degrades to client-only if schema missing

**Severity:** P1 High  
**Status:** UNKNOWN — requires Appwrite Console verification  
**Area:** Public Portfolio Security  

**Evidence:**  
`appwrite-hubs/ai-gateway/src/main.js` lines 806–815:
```js
if (typeof doc.question_count !== 'number') {
  console.warn('[ai-gateway][warn] chat_sessions.question_count attribute is missing...');
  return { ok: true }; // degrade: client-side cap remains active
}
```

If `chat_sessions.question_count` does not exist in production, the server always returns `{ ok: true }` and the 10-question cap is enforced only client-side.

**Impact:**  
A visitor using the browser DevTools or calling the Appwrite Function directly can ask unlimited questions, consuming the portfolio owner's daily AI credits without bound.

**Manual Verification:**  
1. In Appwrite Console → Databases → main → Collections → chat_sessions
2. Confirm attribute `question_count` exists with type Integer and default 0
3. Also verify `public-share/src/main.js` line 256: `{ question_count: 0 }` — this creates the document with the field, but the attribute must exist in the collection schema first

**Recommended Fix:**  
Add `question_count` integer attribute to `chat_sessions` collection (can be done in the Appwrite Console without schema script changes). The code already handles it once the attribute exists.

---

### WR-2026-009: No audit trail for admin impersonation

**Severity:** P1 High  
**Status:** CONFIRMED  
**Area:** Admin / Impersonation Security  

**Evidence:**  
`appwrite-hubs/admin-impersonate/src/main.js` — the `claim` action generates an impersonation session with zero logging. AI calls made during impersonation are attributed to the target user in `ai_request_logs` with no flag:

```js
// ai-gateway lines 2375–2379 — no impersonation marker in logs
const effectiveUserId = publicPortfolioAuth ? ... 
  : (impersonatingUserId && callerIsAdmin)
    ? impersonatingUserId  // credits and logs attributed to target user
    : auth.user.$id;
```

**Impact:**  
An admin can access any user's account, consume their credits, and view/modify their data without any traceable record. This is an insider threat vector with no forensic trail.

**Recommended Fix:**  
1. Add an `ai_request_logs` field `impersonated_by` (nullable string)
2. Set it to the admin's user ID when `callerIsAdmin && impersonatingUserId` is true
3. Log a separate `admin_audit_log` document on each `claim` action in admin-impersonate with: admin_id, target_user_id, timestamp, IP

---

## P2 — Medium

---

### WR-2026-010: Admin test nonce HMAC secret = APPWRITE_API_KEY

**Severity:** P2 Medium  
**Status:** CONFIRMED  
**Area:** AI Gateway Abuse  

**Evidence:**  
`appwrite-hubs/ai-gateway/src/main.js`:
```js
function verifyAdminTestNonce(nonce) {
  return verifySignedInternalToken(nonce, 'gateway-admin-test');
}
function verifySignedInternalToken(token, expectedPurpose) {
  const secret = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY;
```

Admin test nonces bypass all credit checks and usage recording (line 2360–2361).

**Impact:**  
A leaked `APPWRITE_API_KEY` allows an attacker to forge admin test nonces → unlimited free AI calls with no credit deduction and no logs. Lower severity than WR-2026-003 because this requires code-level nonce construction knowledge.

**Recommended Fix:**  
Introduce a separate `ADMIN_TEST_HMAC_SECRET` env var for signing test nonces. Use distinct secrets per token purpose.

---

### WR-2026-011: ask-portfolio charges portfolio owner's credits per visitor question

**Severity:** P2 Medium  
**Status:** CONFIRMED  
**Area:** Credits / Billing / Quota  

**Evidence:**  
`appwrite-hubs/ai-gateway/src/main.js` lines 2367–2368:
```js
const auth = publicPortfolioAuth
  ? { ok: true, user: { $id: publicPortfolioAuth.ownerUserId, email: '' } }
```
All AI cost is attributed to `ownerUserId`. Visitors have no account and incur no cost themselves.

Portfolio chat sessions can be created without authentication (`public-share` `create-portfolio-chat-session` requires only a `username` — no login). Rate limit on session creation: none found in code.

**Impact:**  
An attacker who knows a premium user's portfolio URL can create unlimited sessions (no rate limit) and ask 10 questions per session (or more if WR-2026-008 applies), rapidly consuming the owner's daily credit budget.

**Recommended Fix:**  
1. Add a rate limit on `create-portfolio-chat-session` (IP-based, persistent)
2. Consider adding a per-IP daily cap on portfolio questions (separate from owner's plan)
3. Owners with portfolios should get a separate credit budget for visitor questions

---

### WR-2026-012: Sentry sendDefaultPii: true — resume/job content may reach Sentry

**Severity:** P2 Medium  
**Status:** CONFIRMED  
**Area:** Deployment / Privacy  

**Evidence:**  
`src/lib/monitoring.ts` line 36:
```typescript
sendDefaultPii: true,
```

`beforeSend` hook (lines 51–70) deletes `event.request.data` and filters localStorage breadcrumbs, but does not scrub error `.message` strings. Resume text and job descriptions may appear in error message context.

**Impact:**  
User PII (names, employment history, contact information) embedded in JavaScript errors could be sent to and stored by Sentry. Depending on jurisdiction, this may require GDPR/CCPA data processing agreements with Sentry.

**Recommended Fix:**  
Add message scrubbing to `beforeSend`:
```typescript
beforeSend(event) {
  // existing deletions...
  // Truncate long error messages that might contain resume text
  if (event.exception?.values) {
    event.exception.values.forEach(v => {
      if (v.value && v.value.length > 500) v.value = v.value.slice(0, 500) + '...[truncated]';
    });
  }
  return event;
}
```
Alternatively, set `sendDefaultPii: false` and explicitly add the PII-safe fields needed.

---

### WR-2026-013: Source hash truncated to 16 hex chars (64-bit space)

**Severity:** P2 Medium  
**Status:** CONFIRMED  
**Area:** Deployment Security  

**Evidence:**  
`scripts/compute-source-hashes.mjs` — the SHA-256 hash of each hub's source is stored as 16 hex characters (8 bytes / 64 bits).

**Impact:**  
Birthday collision probability is approximately 1 in 4 billion (2^32 pairs). For random accidental collision this is negligible. For a motivated attacker trying to deploy a malicious hub that passes the CI source hash check, a crafted collision is theoretically feasible (birthday attack requires ~2^32 hashes = ~4 billion attempts). Full 64-char SHA-256 makes this computationally infeasible.

**Recommended Fix:**  
Change `compute-source-hashes.mjs` to store the full 64-character SHA-256 hex digest. Update any comparison logic that assumes 16-char length.

---

### WR-2026-014: ai-health endpoint fully public with no rate limiting

**Severity:** P2 Medium  
**Status:** CONFIRMED  
**Area:** AI Gateway Abuse  

**Evidence:**  
`appwrite-hubs/ai-health/src/main.js` — returns provider availability status (GROQ, OpenRouter, DeepSeek, NVIDIA) for any unauthenticated caller. No rate limit found.

**Impact:**  
Real-time information about which AI providers are available enables:
1. Timing attacks: attacker waits for primary provider to be unavailable, then exploits fallback behavior
2. Operational intelligence about infrastructure without any authentication barrier

**Recommended Fix:**  
Add basic rate limiting (e.g., `checkPersistentRateLimit`-equivalent, or simple Appwrite execute permission requiring authenticated users). Alternatively, restrict to admin or DevKit use only.

---

### WR-2026-015: resume-section-ai has no idempotency cache

**Severity:** P2 Medium  
**Status:** CONFIRMED  
**Area:** Credits / Billing  

**Evidence:**  
`appwrite-hubs/resume-section-ai/src/main.js` — no reference to `idempotency_cache` collection, no deduplication key generation. Compare to `ai-gateway` which has a full 5-minute idempotency dedup via SHA-256 keyed Appwrite documents.

**Impact:**  
Double-click or network retry → 2 separate credits charged for the same AI call. Same credit race condition as WR-2026-005 applies here.

**Recommended Fix:**  
Add the same idempotency pattern from `ai-gateway` to `resume-section-ai`. The idempotency key should include: userId + featureName + hash(input content) + timestamp-bucket.

---

### WR-2026-016: x-forwarded-for IP spoofing for email rate limit

**Severity:** P2 Medium  
**Status:** CONFIRMED  
**Area:** AI Gateway Abuse  

**Evidence:**  
Same as WR-2026-002 (IP extraction). When Cloudflare is absent, `x-forwarded-for` is client-controlled. An attacker can rotate virtual IPs and send 3 emails per "IP":
```
X-Forwarded-For: 1.2.3.4   → 3 emails
X-Forwarded-For: 1.2.3.5   → 3 more emails
...
```

**Impact:**  
Effectively unlimited spam to `contact@thewise.cloud` if Cloudflare is not enforcing real IPs.

**Recommended Fix:**  
See WR-2026-002 recommendations. Additionally: if Cloudflare IS confirmed present, add a validation step that rejects requests without a valid `cf-connecting-ip` header to prevent direct-to-Appwrite calls.

---

### WR-2026-017: job-import hub fetches URLs server-side with no authentication

**Severity:** P2 Medium  
**Status:** CONFIRMED  
**Area:** Upload / Export / SSRF  

**Evidence:**  
`appwrite-hubs/job-import/src/main.js` lines 166–200: accepts a `{ url, userId }` body and fetches the URL server-side. SSRF protection is present (blocks private IP ranges by regex), but NO authentication check:

```js
module.exports = async ({ req, res, log, error }) => {
  const { url, userId } = body || {};
  if (!isSafeUrl(url)) {
    return res.json({ ok: false, error: 'Invalid or blocked URL' }, 400);
  }
  // No session validation — fetch proceeds
  const response = await axios.get(url, { ... maxContentLength: 2 * 1024 * 1024 });
```

`isSafeUrl` blocks private IP ranges by regex, but DNS rebinding attacks could bypass hostname-based checks (the regex checks the parsed hostname string, not the resolved IP).

**Impact:**  
- Unauthenticated callers can use Appwrite as an HTTP proxy to fetch any public URL (2MB cap)
- SSRF to internal Appwrite metadata or other cloud-internal services may be possible via DNS rebinding
- Even if `execute: []` defaults to `users` at platform level, this is an overly permissive proxy for any authenticated user

**Recommended Fix:**  
1. Add session validation at the start of job-import handler
2. Consider resolving the hostname and validating the IP address (not just the hostname string) before fetching to prevent DNS rebinding
3. Add rate limiting on URL fetch operations

---

### WR-2026-018: Portfolio chat session creation has no rate limit

**Severity:** P2 Medium  
**Status:** CONFIRMED  
**Area:** Public Portfolio Security  

**Evidence:**  
`appwrite-hubs/public-share/src/main.js` `createPortfolioChatSession()` (lines 241–276): creates an Appwrite document for each session and returns a signed token. No IP-based or time-based rate limit on this action. Any caller who knows a portfolio username can create unlimited sessions.

**Impact:**  
- Appwrite storage: unlimited `chat_sessions` documents can be created (DoS on storage quota)
- Credit drain: combined with WR-2026-011, unlimited sessions = unlimited questions = unlimited owner credit consumption
- 6-hour session TTL means sessions accumulate rapidly

**Recommended Fix:**  
Add IP-based rate limiting on session creation (e.g., max 5 sessions per IP per hour, persisted to Appwrite DB).

---

## P3 — Low / Hygiene

---

### WR-2026-019: CSP script-src contains unsafe-inline

**Severity:** P3 Low  
**Status:** CONFIRMED  
**Area:** CORS / Headers / Web Security  

**Evidence:**  
`public/_headers` and `vercel.json` — `Content-Security-Policy` includes `'unsafe-inline'` in `script-src`.

**Impact:**  
Reduces effectiveness of CSP as XSS mitigation. Inline scripts injected via other vectors (DOM manipulation, third-party scripts) are not blocked by CSP. This is a known deferred architectural task.

**Recommended Fix:**  
Migrate to `nonce`-based or `hash`-based CSP. Requires build-time nonce injection (e.g., Vite CSP plugin). This is a non-trivial change but is the correct long-term solution.

---

### WR-2026-020: .env.example contains stale Supabase/Kinde env var names

**Severity:** P3 Low  
**Status:** CONFIRMED  
**Area:** Deployment / Documentation  

**Evidence:**  
`.env.example` still contains references to `KINDE_*` and `SUPABASE_*` environment variables from the previous auth/database providers (both decommissioned).

**Impact:**  
A new developer following the `.env.example` may configure stale variables and be confused about why authentication or database operations fail. No security risk beyond developer confusion and potential secret over-provisioning.

**Recommended Fix:**  
Remove all `KINDE_*` and `SUPABASE_*` entries from `.env.example`. Add comments explaining the current Appwrite-native auth approach.

---

### WR-2026-021: appwrite.json function $id fields empty — no stable ID binding

**Severity:** P3 Low  
**Status:** CONFIRMED  
**Area:** Deployment / Environment  

**Evidence:**  
`appwrite.json` — all 20 functions have `"$id": ""`. Deployment is by function name, not stable ID.

**Impact:**  
If a function name is changed in the Console but not in `appwrite.json`, deployments will create a new function instead of updating the existing one. Orphaned old functions may remain active with outdated code.

**Recommended Fix:**  
Populate `$id` fields with the actual Appwrite function IDs from the Console (visible in each function's settings URL). Once populated, the CLI will update existing functions rather than potentially creating duplicates.

---

### WR-2026-022: .well-known/openid-configuration references decommissioned Kinde

**Severity:** P3 Low  
**Status:** CONFIRMED  
**Area:** Legacy / Hygiene  

**Evidence:**  
`public/.well-known/openid-configuration` still points to `thewisecloud.kinde.com` endpoints. Kinde auth has been fully decommissioned. The file is served with `Access-Control-Allow-Origin: *`.

**Impact:**  
OIDC discovery documents pointing to a decommissioned provider are misleading for any OAuth client trying to use WiseResume as an identity provider. No active security risk (Kinde has no access to current user data), but OIDC integrations will fail.

**Recommended Fix:**  
Either update `.well-known/openid-configuration` to point to the current Appwrite Auth endpoints, or remove the file if WiseResume does not act as an identity provider.

---

### WR-2026-023: public-share signToken uses APPWRITE_API_KEY (shared secret)

**Severity:** P3 Low  
**Status:** CONFIRMED  
**Area:** Public Portfolio Security  

**Evidence:**  
`appwrite-hubs/public-share/src/main.js` line 70:
```js
const sig = crypto.createHmac('sha256', API_KEY).update(encoded).digest('base64url');
```
Where `API_KEY = process.env.APPWRITE_API_KEY`. Same key used in ai-gateway and admin-devkit-data.

**Impact:**  
All inter-function tokens (portfolio session, smoke test, admin test nonce, impersonation) share the same HMAC root secret. Key rotation requires redeploying all functions simultaneously and invalidates all live tokens. The more purposes a key serves, the more valuable it is as an attack target.

**Recommended Fix:**  
Use purpose-specific secrets (WR-2026-003 fix addresses the most critical case; this is the same pattern extended to public-share tokens). A `PUBLIC_SHARE_TOKEN_SECRET` env var would isolate portfolio session tokens from admin token secrets.
