# Public Portfolio / Share / Chat Security Audit — WiseResume-TWC

**Date:** 2026-06-09 | **Audited commit:** `main` @ `96beb3ec`  
**Files:** `api/public-portfolio.ts`, `appwrite-hubs/public-share/src/main.js`

---

## 1. Portfolio Password Hashing (WR-2026-004) — P1

### Code
`api/public-portfolio.ts` lines 47–49, 248–250:
```typescript
async function sha256Hex(text: string): Promise<string> {
  return createHash('sha256').update(text).digest('hex');
}

// Verification:
const submittedHash = await sha256Hex(submittedPassword);
if (!settings.passwordHash || submittedHash !== settings.passwordHash) {
  return res.status(401).json({ error: 'invalid_password' });
}
```

### Analysis
- **Algorithm:** SHA-256 (fast hash, not a password hash)
- **Salting:** None
- **Iteration count:** 1 (no key stretching)
- **Comparison:** Direct hex string equality (not timing-safe for hashes — though timing-safe comparison for passwords is less critical when hashes are salted)

### Risks
1. **Rainbow table attack:** All users with the same password have the same hash. A precomputed table of common passwords (millions of entries) cracks all users simultaneously.
2. **GPU brute force:** SHA-256 executes at billions of operations per second on consumer hardware. An 8-character alphanumeric password is crackable in seconds.
3. **Breach amplification:** One DB dump exposes all portfolio passwords at once.

### Exploit Prerequisite
Requires database compromise (Appwrite DB dump or unauthorized read access). This is a data-at-rest vulnerability.

### Recommended Fix
```typescript
import { hash, verify } from '@node-rs/bcrypt';
// or: import bcrypt from 'bcryptjs';

async function hashPassword(text: string): Promise<string> {
  return hash(text, 12); // cost factor 12
}

async function verifyPassword(submitted: string, stored: string): Promise<boolean> {
  return verify(submitted, stored);
  // bcrypt handles timing-safe comparison internally
}
```

**Migration plan:**
1. Add `hash_version` field to the portfolio settings collection
2. On next successful SHA-256 verification, re-hash with bcrypt, store new hash + `hash_version: 'bcrypt'`
3. Old SHA-256 hashes remain valid until migrated
4. After 90 days, invalidate remaining SHA-256 hashes and require password reset

---

## 2. Portfolio Share Token (Entropy)

`public-share` hub line 255: `sdk.ID.unique()` — this is Appwrite's unique ID generation.

Appwrite's `ID.unique()` generates a 20-character ID using a URL-safe character set (base62 approximately). This provides ~119 bits of entropy, well above the 128-bit threshold for unguessable tokens. ✅

Share tokens are stored as Appwrite document IDs and are not sequential. ✅

---

## 3. Portfolio Chat Session Token

`public-share` hub lines 68–71:
```js
function signToken(payload) {
  const encoded = base64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', API_KEY).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}
```

- **Algorithm:** HMAC-SHA256 ✅
- **Timing-safe verification:** Yes — `crypto.timingSafeEqual()` ✅
- **Expiry enforcement:** `exp` field checked, `Date.now() > payload.exp` → null ✅
- **Purpose binding:** `purpose` field checked in `verifyToken()` ✅
- **TTL:** 6 hours for session token (reasonable) ✅
- **Internal gateway token TTL:** 2 minutes (appropriately tight) ✅

**Risk:** Same HMAC secret as all other tokens (WR-2026-023). See findings.md.

---

## 4. Cross-Portfolio Session Abuse Prevention

`public-share` line 296:
```js
if (!profile || String(profile.user_id || '') !== sessionPayload.ownerUserId) {
  return res.json({ status: 'error', ... }, 404);
}
```

`ai-gateway` lines 2396–2403 (approximate):
```js
if (publicPortfolioAuth.username !== opts.username) {
  return res.json({ status: 'error', code: 'unauthorized', ... }, 403);
}
```

**Assessment:** A session token issued for portfolio A cannot be used to query portfolio B — the `username` and `ownerUserId` are checked server-side. ✅

---

## 5. Session Question Limit (WR-2026-008) — P1 UNKNOWN

`ai-gateway` `validatePortfolioSession()` lines 806–831:
```js
if (typeof doc.question_count !== 'number') {
  console.warn('[ai-gateway][warn] chat_sessions.question_count attribute is missing...');
  return { ok: true }; // degrade: client-side cap remains active
}
if (doc.question_count >= PORTFOLIO_MAX_QUESTIONS) {  // PORTFOLIO_MAX_QUESTIONS = 10
  return { ok: false, status: 429, ... };
}
await db.updateDocument(..., { question_count: doc.question_count + 1 });
return { ok: true };
```

When `question_count` schema attribute exists:
- Server enforces 10-question cap per session ✅
- Increment is applied per question ✅
- Transient DB errors degrade gracefully (not a security issue — brief windows) ✅

When `question_count` schema attribute is MISSING:
- Server returns `{ ok: true }` for every question
- Only client-side JavaScript enforces the limit
- Direct API calls bypass the limit entirely → unlimited owner credit drain

**STATUS: UNKNOWN** — whether `chat_sessions.question_count` exists in production Appwrite.

**Manual verification:** See WR-2026-008 in findings.md.

---

## 6. Session Creation Rate Limit (WR-2026-018) — P2

`public-share` `handleCreatePortfolioChatSession()` (lines 241–276):
- Accepts any valid `username` without authentication
- Creates one Appwrite document per session call
- No IP-based rate limit found
- No time-window limit on sessions per username

**Attack surface:**
```
POST /functions/Public Share Hub/executions
{
  "action": "create-portfolio-chat-session",
  "username": "target_user"
}
```
→ New session, new token, 10 more questions available

---

## 7. CORS on Share Endpoints

The public-share hub does not set any CORS headers. Appwrite Functions have a default CORS policy that allows the configured Appwrite project domain. Cross-origin requests from other websites depend on Appwrite's platform CORS configuration, not hub code.

**Assessment:** This is acceptable for a backend function that returns JSON. Browser-enforced CORS means arbitrary websites cannot make cross-origin calls to the function. UNKNOWN whether Appwrite's platform CORS policy is correctly configured. This requires manual verification in the Appwrite Console.

---

## 8. Public Visitor Access — Only ask-portfolio Path

Confirmed that `ask-portfolio` is the ONLY unauthenticated AI feature path in ai-gateway. All other features require either:
- A valid Appwrite user JWT (`validateUserSession`)
- A valid admin test nonce (admin-only)
- A valid smoke token (admin-only)

The `ask-portfolio` path itself requires a valid HMAC-signed internal gateway token from the public-share hub, which in turn requires a valid portfolio chat session. The chain is:

```
Visitor request → public-share (creates session) → ai-gateway (validates token) → AI response
```

No direct unauthenticated path to AI features beyond `send-email`/`send-contact-email`. ✅
