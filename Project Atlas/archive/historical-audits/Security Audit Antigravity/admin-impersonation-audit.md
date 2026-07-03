# Admin / Impersonation Security Audit — WiseResume-TWC

**Date:** 2026-06-09 | **Audited commit:** `main` @ `96beb3ec`  
**Files:** `appwrite-hubs/admin-devkit-data/src/main.js`, `appwrite-hubs/admin-impersonate/src/main.js`,  
`src/contexts/DevKitSessionContext.tsx`, `src/lib/devkit/devKitAuth.ts`, `src/pages/ActAs.tsx`

---

## 1. IMPERSONATION_HMAC_SECRET Fallback (WR-2026-003) — P0

### Code
`admin-devkit-data/src/main.js` lines 32–35:
```js
function getImpersonationSecret() {
  return process.env.IMPERSONATION_HMAC_SECRET
    || process.env.APPWRITE_API_KEY
    || process.env.APPWRITE_FUNCTION_API_KEY;
}
```

The same `APPWRITE_API_KEY` is also used in:
- `admin-devkit-data` line 47: DevKit session token signing
- `ai-gateway` line 338: `verifySignedInternalToken()` — all internal tokens
- `public-share` line 70: portfolio session tokens

### Shared Secret Blast Radius

A single `APPWRITE_API_KEY` compromise enables:

| Target | Method | Impact |
|---|---|---|
| Any Appwrite DB collection | Direct Appwrite SDK API calls | Full DB read/write access |
| Impersonation tokens | Forge signed token for any userId | Full user account takeover |
| Admin test nonces | Forge `gateway-admin-test` token | Unlimited free AI calls |
| Portfolio gateway tokens | Forge `public-portfolio-chat` token | Bypass session limits |
| DevKit session tokens | Forge `devkit-session` token | Full admin panel access |

### Secret Configuration Status
**UNKNOWN** — cannot determine from code whether `IMPERSONATION_HMAC_SECRET` is configured separately.

### Recommended Fix
1. Generate independent secret: `openssl rand -hex 32`
2. Set `IMPERSONATION_HMAC_SECRET` in Appwrite Console for admin-devkit-data and admin-impersonate
3. Consider dedicated secrets for each token purpose (see WR-2026-023)

---

## 2. Impersonation Token Lifecycle

### Token Generation (`admin-impersonate/src/main.js`)
- TTL: 15 minutes (`15 * 60 * 1000 ms`) ✅
- Purpose field: `'impersonation'` — prevents token reuse across purposes ✅
- Contains: `userId`, `email`, `adminId`, `iat`, `exp`
- Signed with: HMAC-SHA256 using `getImpersonationSecret()`

### Token Verification (`admin-devkit-data/src/main.js`)
- `timingSafeEqual` comparison ✅
- Expiry checked ✅
- Purpose checked ✅

### Token Revocation
No token revocation mechanism exists. A stolen 15-minute impersonation token is valid until expiry. No server-side blacklist. This is an acceptable trade-off given the short TTL.

---

## 3. Admin Audit Trail Gap (WR-2026-009) — P1

### What is logged
- `ai_request_logs`: every AI request, attributed to `effectiveUserId`
- When admin is impersonating user X and makes AI requests, `ai_request_logs.user_id = X`

### What is NOT logged
- The `claim` action in `admin-impersonate` — no record that admin Y started impersonating user X
- No `impersonated_by` field in `ai_request_logs`
- No admin action log for DevKit data reads/writes during impersonation

### Impact
An admin can:
1. Claim an impersonation token for user X
2. Read/modify user X's data via admin-devkit-data
3. Consume user X's AI credits via ai-gateway
4. Terminate the session

All of this is invisible to any audit query. The user would see their credits depleted but no way to identify the source.

### Recommended Fix
Add an `admin_audit_log` Appwrite collection with server-only write permissions:
```json
{
  "action": "impersonation_claim",
  "admin_user_id": "string",
  "target_user_id": "string", 
  "timestamp": "datetime",
  "ip": "string"
}
```

Also add `impersonated_by` (nullable string) to `ai_request_logs` for requests made while impersonating.

---

## 4. Admin Label Source of Truth

**UNKNOWN** — the admin label (`admin`) is assigned via the Appwrite Console. Who can assign labels is controlled by Appwrite project settings (team roles).

**Code reliance:** `src/hooks/useIsAdmin.ts` — checks for `admin` label on the Appwrite user object. `ai-gateway` verifies `callerIsAdmin` by checking user labels.

**Manual verification:**
1. In Appwrite Console → Auth → Settings → User Labels
2. Confirm who has permission to add/remove labels (should be restricted to owners only)
3. Verify no API endpoint accepts label assignment from user-level requests

---

## 5. DevKit Session Token in localStorage (WR-2026-006) — P1

### Code
`src/contexts/DevKitSessionContext.tsx`:
```typescript
const LS_TOKEN_KEY = 'devkit_session_token';

// On login with "Remember me":
localStorage.setItem(LS_TOKEN_KEY, token);

// On load:
const stored = localStorage.getItem(LS_TOKEN_KEY);
```

### Attack Chain
```
XSS vulnerability anywhere on resume.thewise.cloud
→ document.cookie / localStorage read
→ DevKit session token stolen
→ Admin panel access (routing overrides, user data, impersonation)
```

### Current XSS Mitigations
- No `dangerouslySetInnerHTML` found in codebase ✅
- CSP `script-src 'self' 'unsafe-inline'` — `'unsafe-inline'` is the weak link (WR-2026-019)
- No known third-party script injection vectors

### Why This Still Matters
Even with no current XSS vector, `localStorage` is the target of:
- Browser extension attacks (malicious extensions can read `localStorage`)
- Subdomain takeover → same-origin `localStorage` access
- Future XSS vulnerabilities in new features

### Recommended Fix
Option A (preferred): Replace `localStorage` with `sessionStorage` for the non-persistent case. DevKit is admin-only and closing the browser should end the session.

Option B: For the "Remember me" case, use an `httpOnly; SameSite=Strict; Secure` cookie. JavaScript cannot read `httpOnly` cookies.

Option C (easiest): Simply remove "Remember me" functionality. Admin sessions should not be persistent across browser closes.

---

## 6. AI Credits During Impersonation

When admin impersonates user X and makes AI calls:

```js
// ai-gateway lines 2375–2385
const impersonatingUserId = ...;  // from X-Impersonating-User-Id header
const callerIsAdmin = ...;        // verified against Appwrite admin label

const effectiveUserId = publicPortfolioAuth
  ? publicPortfolioAuth.ownerUserId
  : (impersonatingUserId && callerIsAdmin)
    ? impersonatingUserId          // ← admin pays nothing; user X pays
    : auth.user.$id;
```

**Impact:** Admin impersonation consumes user X's daily credits. This is probably intentional (simulate the user's experience), but combined with the missing audit trail (WR-2026-009), it creates an accountability gap.

**Assessment:** Acceptable as-is once audit trail is added. The admin is using the user's session to simulate their experience — having user credits consumed is the correct behavior for realistic testing.

---

## 7. Self-verify Scope in admin-impersonate

The `verify` action in `admin-impersonate` validates an impersonation token without using it. This is used by the frontend to check if a stored token is still valid.

The response exposes: `userId`, `email` of the impersonated user, and remaining TTL. This is acceptable — only admin-level callers can reach this endpoint.
