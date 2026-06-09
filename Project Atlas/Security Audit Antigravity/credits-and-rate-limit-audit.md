# Credits / Billing / Rate Limit Audit — WiseResume-TWC

**Date:** 2026-06-09 | **Audited commit:** `main` @ `96beb3ec`

---

## 1. Credit Deduction Atomicity (WR-2026-005) — P1

### Code path
`ai-gateway` → `recordAiUsage()` (lines 690–728):

```js
async function recordAiUsage(db, creditState) {
  // ...
  const capturedUpdatedAt = creditState.doc.$updatedAt;  // captured at request start

  let baseDoc = creditState.doc;
  try {
    // Optimistic re-read: refresh if another request updated the doc
    const freshDoc = await db.getDocument(DB_ID, AI_CREDITS_COLLECTION_ID, docId);
    if (freshDoc.$updatedAt !== capturedUpdatedAt) {
      baseDoc = freshDoc;
    }
  } catch {
    // Fall back to stale snapshot
  }

  const baseUsage = (baseDoc.usage_date === today) ? Number(baseDoc.daily_usage || 0) : 0;
  await db.updateDocument(DB_ID, AI_CREDITS_COLLECTION_ID, docId, {
    daily_usage: baseUsage + cost,
    total_usage: Number(baseDoc.total_usage || 0) + cost,
    usage_date: today,
  });
}
```

### Race window analysis
The race window is approximately the time between request A's `db.getDocument` and request B's `db.updateDocument`. Under normal conditions (single instance, sequential requests), the optimistic re-read mostly works. Under concurrent load (multiple simultaneous AI requests from the same user):

1. Request A reads `daily_usage = 100` at `$updatedAt = T1`
2. Request B reads `daily_usage = 100` at `$updatedAt = T1`  
3. Request A writes `daily_usage = 101` — `$updatedAt` becomes `T2`
4. Request B reads again: sees `$updatedAt = T2 ≠ T1`, re-reads `daily_usage = 101`
5. Request B writes `daily_usage = 102` ✅ — race resolved in this case

BUT if both requests complete their initial read before EITHER writes:
1. A reads 100 at T1
2. B reads 100 at T1
3. A writes 101 (T2)
4. B re-reads: still 101 at T2 (correct), writes 102 ✅

Actually in most cases the re-read protects correctly. The true race is:
1. A reads 100 at T1, skips re-read phase (gets 100 as base)
2. A writes 101 (T2) — simultaneously B also reads 100 at T1 and writes 101 (T2)

If A and B's `db.updateDocument` calls hit the DB simultaneously (before either commit), both may write `baseUsage + cost = 101` instead of 102.

**Conclusion:** The optimistic re-read provides substantial protection for sequential concurrent writes, but does not protect against truly simultaneous write contention (sub-millisecond window). For the vast majority of users making non-concurrent requests, this is sufficient. For high-frequency users or automation, over-counting is possible.

### Partial mitigations already in place
- `checkServerRateLimit`: 20 req/60s per feature per user — limits concurrent blast
- `checkPersistentRateLimit`: DB-backed per-minute limit for cost≥2 features
- `checkPlanLimit`: Refuses if current `daily_usage ≥ daily_limit` at load time

---

## 2. Per-Plan Limits

Defined at ai-gateway lines 41–53:
```js
const PLAN_DAILY_LIMITS = {
  free:      50,
  pro:       200,
  premium:   500,
  enterprise: 1000,
  unlimited:  null,  // admin/test — no cap
};

const PLAN_PER_MINUTE_LIMITS = {
  free:      5,
  pro:       15,
  premium:   30,
};
```

Per-minute limits enforce `checkPersistentRateLimit` using the last 60 seconds of `ai_request_logs`. This is:
- Durable (DB-backed, survives restarts) ✅
- Cross-instance (queries are global) ✅
- Applies to all authenticated users ✅

**Gap:** Per-minute limits only apply to features with `FEATURE_CREDIT_COSTS[featureName] >= 2`. Cost-1 features (`parse-job`, `validate-tailor`, `suggest-template`) only have the in-memory 20/60s server rate limit. → WR-2026-007

---

## 3. ask-portfolio Owner Credit Drain (WR-2026-011) — P2

When a visitor accesses a portfolio chat, credits are billed to the portfolio OWNER's account:

```js
// ai-gateway line 2367–2368
const auth = publicPortfolioAuth
  ? { ok: true, user: { $id: publicPortfolioAuth.ownerUserId } }
```

Credit cost for `ask-portfolio`: 2 credits per request (defined in `FEATURE_CREDIT_COSTS`).

**Attack scenario:**
- Target: a premium user (500 credits/day) who has a portfolio
- Create N sessions (no rate limit, no auth — WR-2026-018)
- Ask 10 questions per session = 20 credits consumed per session
- 500 credits / 20 = 25 sessions to drain the owner's daily budget
- After drain, owner's portfolio chat returns 429 for all visitors for the rest of the day

**Existing mitigations:**
- 10-question limit per session (server-enforced if `question_count` schema exists — WR-2026-008)
- Plan daily credit limit (500 for premium — owner's AI features also stop working)

**Missing mitigations:**
- No rate limit on session creation
- No separate "visitor credit pool" distinct from owner's account credits

---

## 4. resume-section-ai — No Idempotency (WR-2026-015) — P2

`appwrite-hubs/resume-section-ai/src/main.js` has no idempotency deduplication. No reference to `idempotency_cache` collection in the file.

Compare to `ai-gateway` which has a full 5-minute dedup:
```js
// ai-gateway lines 2458–2494 (approximate)
const idempotencyKey = crypto.createHash('sha256')
  .update(`${userId}:${featureName}:${JSON.stringify(opts).slice(0, 1000)}`)
  .digest('hex').slice(0, 32);
```

**Impact:** Double-click in the resume editor sends two concurrent requests → two credit charges → same output. User loses credits for no benefit.

---

## 5. Admin Test Skips Credits (Expected)

When `isAdminTest` is true (verified HMAC nonce):
- `loadCreditState()` is called with a special flag → returns `chargeable: false`
- `recordAiUsage()` skips when `!creditState?.chargeable`
- AI output is capped at 80 tokens

This is intentional behavior for admin smoke testing. Secured by admin nonce HMAC (WR-2026-010).

---

## 6. Stale Frontend Credit Display

Frontend credit state is fetched once at app load and on explicit refresh. There is no real-time subscription to the `ai_credits` collection. This means:

- After a rapid sequence of AI calls, the displayed credit count may lag behind the actual server-side count
- A user near their daily limit may see they have credits available in the UI while the server has already rejected the actual request
- The 429 response from the server will surface as a user-facing error, not a pre-emptive UI warning

**Assessment:** This is a UX issue, not a security issue. The server always enforces limits correctly.
