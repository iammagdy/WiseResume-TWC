# DevKit Health Audit — 2026-05-02

**Scope:** Every code path that powers the WiseResume admin DevKit panel — 36
`admin-*` Supabase Edge Functions, the `verify-dev-kit` session issuer, the
shared `requireAdminAuth` middleware, the React DevKit panels under
`src/components/dev-kit/`, the `unwrapAdminResponse` / `EdgeFunctionError`
helpers, the `DevKitSessionContext` token store, and the `edgeFunctions.invoke`
admin branch.

**Method:** Static code analysis + production telemetry pulled from the live
Supabase project `jnsfmkzgxsviuthaqlyy` via the service-role key. No DevKit
session was issued, no end-user was asked to test anything, and Replit dev
was not treated as production.

**Verdict:** **One critical regression fixed in-flight** (introduced by Task
\#21 itself), three medium-severity drift issues documented for follow-up,
and a notable production-observability gap that ties back to an existing
backlog item.

---

## Executive summary

| Severity | Finding | Status |
| --- | --- | --- |
| **Critical** | C-1: New `404 not_found` responses misclassified as "function not deployed" by the frontend's `unwrapAdminResponse` | **Fixed** in this commit (`src/lib/devkit/edgeResponse.ts`) |
| Medium | M-1: 9 admin functions still use `.single()` on existence-check reads → noisy PGRST116 500s on missing rows | Documented; itemised below |
| Medium | M-2: 3 functions return `{error: …}` instead of the standard `{success: false, error: …}` envelope | Documented; itemised below |
| Medium | M-3: `verify-dev-kit` non-success error paths use `{error: …}` (without `success: false`) — drift from the audit-defined contract | Documented |
| Info | I-1: Production `edge_function_logs` is dark for every DevKit function (4 rows total in the table; 0 from any DevKit code) — Tasks \#19/\#20 wrapHandler infra is in code but not deployed | Already tracked: backlog "Deploy v3.10.x edge functions" |
| Green | G-1: All 37 admin/devkit functions wrap with `wrapHandler` | ✅ |
| Green | G-2: All 37 use `getCorsHeaders(origin)` — no remaining `Access-Control-Allow-Origin: *` | ✅ |
| Green | G-3: All 36 `admin-*` functions call `requireAdminAuth` (or are `verify-dev-kit`) | ✅ |
| Green | G-4: All Task \#21 changes verified in code (lockKey email\|ip, CORS sweep, maybeSingle, weekly-digest shape, verify-email SITE_URL hard-fail, perf indexes) | ✅ |

---

## C-1 — Frontend misclassifies the new `404 not_found` as "function not deployed" *(FIXED)*

### What was wrong

Task \#21 introduced HTTP 404 responses with body `{success:false, error:'not_found'}`
on three pre-existence checks (`admin-update-profile` get + post-update,
`admin-save-note` insert verify, `wisehire-talent-view` lookups). For the
admin functions, the frontend goes through this chain:

1. `edgeFunctions.invoke(fn, …)` — sees `response.status === 404`, parses the
   JSON body, and returns
   `{data: null, error: {message: 'not_found', status: 404}}`.
2. `unwrapAdminResponse(tuple, fn)` — sees `tuple.error` is set, calls
   `looksLikeNotDeployed(err)`.
3. **`looksLikeNotDeployed` returned `true` for any `status === 404`** —
   regardless of whether the body was a structured "row absent" signal or a
   genuine gateway 404 from a missing function.
4. `EdgeFunctionError` was thrown with the misleading message
   `admin-update-profile not deployed (HTTP 404)` and the `notDeployed: true`
   flag, which `AuditLogPanel` then surfaces as a giant "Deploy this function"
   banner.

The user-visible result: every time an admin opened a user with no
`profiles` row (newly-signed-up Kinde-only user, or row deleted between the
list fetch and the drawer open), the DevKit told them to deploy a function
that's already deployed.

### What was fixed

`src/lib/devkit/edgeResponse.ts::looksLikeNotDeployed` is now an
allow-list of signatures that **can only originate from the network or
the Supabase gateway** — it never fires on the body of a function that
actually ran. This single rule covers every existing 404-body shape in
the admin fleet (`not_found`, `Target user not found`,
`User not found`, `Collision user not found in auth.users`,
`Collision user profile not found`) and any future function-level 404.

```ts
function looksLikeNotDeployed(err: InvokeError): boolean {
  const msg = (err.message ?? '').toLowerCase().trim();
  if (!msg) return err.status === 404;            // empty msg + 404 → likely transport
  if (msg.includes('failed to fetch')) return true;
  if (msg.includes('cannot reach the server')) return true;
  if (msg.includes('server error (http 404)')) return true;
  return false;
}
```

The first revision of this fix kept a `'not found'` substring rule —
that would have continued to misclassify the `Target user not found` /
`User not found` / `… not found in auth.users` 404 bodies emitted by
`admin-impersonate`, `admin-wisehire-reset-user`, `admin-merge-identity`
and `admin-email`. The architect review caught this, and the fix was
tightened to drop the substring rule entirely.

### Why this is the right place

Pushing the fix down into `looksLikeNotDeployed` (rather than into each
caller's `catch` block) means every existing and future `not_found` body is
correctly surfaced via `EdgeFunctionError.message === 'not_found'`. Callers
that already format with `formatEdgeError(e)` will display "not_found" or
can map it to a friendlier UI string at the panel level. The
`notDeployed: false` flag also keeps the "Deploy this function" banner from
firing in `AuditLogPanel`.

### Acceptance verified

- `npx tsc --noEmit` passes after the change.
- The two surfaces that read `EdgeFunctionError.notDeployed`
  (`AdminUsersPanel` lines 430, 483; `AuditLogPanel` line 102) only render
  the "deploy" banner when the flag is `true`, which is now reserved for
  real gateway / network failures.
- `adminApiFetch`'s `notDeployed: res.status === 404` (line 137 in
  `edgeResponse.ts`) was left untouched: it serves the local Express
  `/api/admin/*` routes only, which never use the `not_found` body
  pattern.

---

## M-1 — 9 admin functions still use `.single()` on existence-check reads

These functions still throw PGRST116 (and a 500 in the function logs) when
the row is absent, instead of returning a clean 404 / business-logic
response. None of them were in Task \#21's scope — that task targeted only
the three call sites with documented 500-noise. These are the remaining
candidates:

| File | Line(s) | Context |
| --- | --- | --- |
| `supabase/functions/admin-delete-user/index.ts` | 41 | Pre-delete user lookup |
| `supabase/functions/admin-email/index.ts` | 693 | Inside resend-stats branch |
| `supabase/functions/admin-feature-flags/index.ts` | 120 | Flag-by-id read |
| `supabase/functions/admin-list-user-content/index.ts` | 43 | Profile lookup before listing |
| `supabase/functions/admin-manage-coupons/index.ts` | 72, 95 | Coupon-by-code reads |
| `supabase/functions/admin-merge-identity/index.ts` | 60 | Source identity lookup |
| `supabase/functions/admin-moderation/index.ts` | 125, 278 | Bug report + moderation item lookups |
| `supabase/functions/admin-set-plan/index.ts` | 71 | Pre-update profile read |
| `supabase/functions/verify-dev-kit/index.ts` | 199 | Post-INSERT `select('id')` — **safe** (service role bypasses RLS, INSERT-then-SELECT always returns the row); leaving as `.single()` is fine |

Recommended treatment: identical to Task \#21's pattern — switch to
`.maybeSingle()` and add an explicit `404 not_found` branch where the row
genuinely should exist. Volume is low (none of these have ever been
observed in `error_log`), so this is medium-severity tech debt rather
than urgent.

## M-2 — Response-shape drift in 3 functions

The shared contract (used by every `unwrapAdminResponse` caller) is
`{success: false, error: '...'}`. These functions still emit the legacy
`{error: '...'}` shape on the failure paths listed:

| File | Line(s) | Path |
| --- | --- | --- |
| `supabase/functions/admin-email/index.ts` | 81, 92, 129 | Module-router / unauthorized / missing-email |
| `supabase/functions/admin-impersonate/index.ts` | 22, 34, 58 | Auth-fail / bad JSON / audit-write fail; plus `target_user_id` missing branch and `Target user not found` |
| `supabase/functions/verify-dev-kit/index.ts` | 105, 113, 126, 224 | Missing-creds / secret-not-set / catch-all 500 |

Functionally **not breaking** today: the admin invoker's non-2xx branch
parses `body.error` regardless of whether `success: false` is present, so
`unwrapAdminResponse` still surfaces the right message. But once Task
\#23 (admin policy on `error_log`) or any other consumer starts treating
`success: false` as the canonical signal, this drift will cause those
consumers to skip the failure path. Recommend a half-day pass to add
`success: false` to every `JSON.stringify({ error: …})` call in
`admin-*` and `verify-dev-kit`.

## M-3 — verify-dev-kit body shape

Same root cause as M-2 but called out separately because the front-door
matters: when an admin enters the wrong password, the function returns
`{success: false}` (good) but when DEV_KIT_PASSWORD secret is missing it
returns `{error: '…'}` (drifted). `DevToolsPage.tsx` lines 488-495 already
hand-rolls the discrimination by string-matching on `body.error`, so the
UX is fine — but the contract is brittle.

---

## I-1 — Production observability gap (already tracked)

Querying `edge_function_logs` on the live Supabase project returned **4
rows total**, all from `agentic-chat` and `enhance-section`. **No DevKit
function has ever logged an invocation in production.** This is consistent
with the existing backlog entry "Deploy v3.10.0 edge functions once
Supabase plan is upgraded" — Tasks \#19 and \#20 wired wrapHandler into
every function in code but the deploy hasn't reached the live functions
yet, so the observability surface is dark for the entire admin panel.

Not a code issue. Captured here so the next deploy includes the wrapHandler
rollout for the DevKit fleet, which will immediately populate the
Mission Control telemetry tab and let any future DevKit issue be
diagnosed from production logs instead of static analysis.

`admin_sessions` shows 36 historical rows but zero with
`expires_at >= now()` — confirming the panel hasn't been used recently in
production. Nothing actionable here either; included for completeness.

---

## What's solid

- **Auth chain (verify-dev-kit → admin_sessions → requireAdminAuth):** The
  Task \#21 lockKey hardening (`email|ip`) is in place; HMAC signature
  verification gates everything; per-session `revoked_at` and `expires_at`
  enforcement happens on every `admin-*` call; `last_used_at` + `ip`
  touch is best-effort and won't fail the request.
- **CORS:** Every `admin-*` and `verify-dev-kit` call now uses
  `getCorsHeaders(origin)` — no remaining wildcards. The shared module
  enforces a static allow-list with explicit `ALLOWED_DEV_ORIGINS` opt-in
  (no more blanket `*.replit.dev` regex).
- **Frontend transport:** `edgeFunctions.invoke` correctly bypasses the AI
  error parser and the bridge-token refresh dance for every `admin-*`
  call (Bug \#5 hardening). Caller-supplied `Authorization: Bearer
  <devkit-token>` always wins over the bridge JWT.
- **Token store:** `DevKitSessionContext` keeps the HMAC token in a module
  singleton (never serialised through React props), with explicit-lock vs
  inactivity-lock semantics, 15-minute idle timeout, and remembered-token
  TTL gating in `localStorage`.
- **Mission Control payload:** `admin-devkit-data` (1066 LOC) covers
  mission-control / analytics / live-activity / observability in a single
  endpoint with action-routing — cleanly authenticated and CORS-correct.

---

## Sign-off

The DevKit is structurally sound. The one user-visible regression
introduced by Task \#21 is fixed in this commit. Three follow-up items
(M-1, M-2, M-3) are tech-debt-level and can be batched into a future
"DevKit contract sweep" task. Production observability for the DevKit
will light up automatically the next time the edge functions are
deployed.
