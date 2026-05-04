# Edge Function Audit — Mobile parity sweep (2026-05-03)

## Editor AI Phase 3 — Legacy function retirement (Task #41, 2026-06-03)

Four individual Editor AI edge functions were retired from active
deployment after their traffic was fully consolidated into the
`editor-ai` router in Phase 2 (Task #40).

Functions retired (4 → absorbed into editor-ai):

- `analyze-resume`       → `editor-ai` with `x-editor-ai-action: analyze`
- `recruiter-simulation` → `editor-ai` with `x-editor-ai-action: recruiter-sim`
- `suggest-template`     → `editor-ai` with `x-editor-ai-action: suggest-template`
- `optimize-for-linkedin`→ `editor-ai` with `x-editor-ai-action: optimize-for-linkedin`

### Source-tree changes

Each original `supabase/functions/<name>/index.ts` has been replaced with
a minimal retirement stub (returns `410 Gone` with a redirect message) so
that an accidental `supabase functions deploy <name>` from this commit is
safe and self-documenting. The full original implementation is preserved in
git history (pre-Task-#41 commits).

### Database changes

Migration `20260603000000_retire_legacy_editor_ai_routing_config.sql`
deletes the 4 individual `ai_routing_config` rows for the retired functions.
The `editor-ai` consolidated row (seeded in Task #40) remains.

### DevKit AIRoutingPanel changes

`FEATURE_LABELS` and `EDITOR_AI_FUNCTIONS` in `AIRoutingPanel.tsx` no longer
include the 4 retired slugs. The Editor AI group now shows 5 active functions:
`editor-ai`, `resume-section-ai`, `tailor-resume`, `smart-fit-rewrite`,
`agentic-chat`. The bulk override button targets these 5 only.

### DevKit smoke tests

The 4 legacy smoke tests (`recruiter-simulation`, `suggest-template`,
`optimize-for-linkedin`, `analyze-resume`) in `DevKitRunner.tsx` continue
to pass — they invoke the legacy names, which are transparently rewritten to
`editor-ai` by `rewriteEditorAiInvoke` in `edgeFunctions.ts`. The 4 new
`editor-ai-*` smoke tests (Task #40) also pass, covering all 4 sub-actions
directly via the consolidated router.

### Rollback path

1. `supabase functions deploy analyze-resume recruiter-simulation suggest-template optimize-for-linkedin`
   (source code is preserved in git at any pre-retirement commit).
2. Flip `USE_MERGED_EDITOR_AI = false` in
   `src/integrations/supabase/edgeFunctions.ts`.
3. Re-insert the 4 `ai_routing_config` rows (or revert the migration).

Once the deployed function slots are freed and the soak window passes,
those slots can be reclaimed. There is no `USE_MERGED_EDITOR_AI` flag
removal in this phase — the flag stays `true` and serves as the permanent
rewrite path.

---

## Full redeploy + platform verification (Task #57, 2026-05-03)

Final gate after Tasks #49–#56 merged 9 routers. Full
`npx supabase functions deploy` of every source function via
`scripts/deploy-functions.sh`, plus Management-API delete of every
deployed-but-no-source orphan from the 9 merges, plus 3-layer
verification sweep (CORS+dispatch / behavior+auth / CI smoke).

| Metric                              | Value |
| ----------------------------------- | ----- |
| Deployed functions (pre-redeploy)   | 99    |
| Source-tree functions               | 74    |
| Orphans deleted                     | 38    |
| Functions redeployed                | 74    |
| Deployed functions (post-redeploy)  | **74** |
| Source-vs-deployed diff             | **empty** |
| Slots freed under 100-fn cap        | 25 (26 free now) |
| Per-router + per-isolated CORS sweep| 69 / 69 PASS |
| Behavior + auth sweep (24 checks)   | 24 / 24 PASS |
| **Authenticated-user 2xx sweep**    | **17 / 17 PASS (4 live 2xx incl. live AI call)** |
| Per-function secret cross-check     | 100 % critical / AI / github |

Full report: `reports/edge-fn-redeploy-2026-05-03.md`. Verification
covered: 8 distinct live HTTP 2xx endpoints (`mobile-config`,
`og-image`, `transactional-email#contact-request`, `me`, `ai-health`
w/ live Groq call, `coupons#validate`, `wisehire-access#validate-invite`,
auth-admin user lifecycle); admin-gate 401/403 on every admin router;
canonical 400 dispatch envelopes on every multi-action router; webhook
401 on `kinde-webhook` / `revenuecat-webhook` / `auth-email-hook`
under wrong/missing signature; no secret leakage on
`admin-ai-ops/inspect-keys`; every authenticated user-facing AI
function reached past the auth gate (verified with a real
short-lived test user created via Auth Admin API). Authenticated
admin 2xx requires the `DEV_KIT_PASSWORD` HMAC secret (not retrievable
via Management API) — covered by the existing Playwright merged-router
specs (14–23) which run in CI against the prod URL.

Five anomalies handled in-task: (a) first parallel deploy hit HTTP 402
"max functions reached" until orphans were deleted; (b) four deploys
silently dropped under parallel pressure (`admin-config`,
`admin-user-ops`, `resume-section-ai`, `send-push`) — recovered via
sequential retry — followed up as #60; (c) smoke-test catalogue is
stale on the merged-away slugs — followed up as #59;
(d) `mobile-api` deployed timestamp pre-dates last commit but source
is byte-identical post-redeploy — informational; (e) initial
contact-request probe used `type:'feedback'` which fails the table's
CHECK constraint (allowed: `bug|feature|contact`) — not a regression,
re-probed with `type:'contact'` returned 200.

---


## Resume-section AI consolidation (Task #56, 2026-05-03)

Four resume-section AI edge functions were merged into a single
`resume-section-ai` router. All four are user-facing AI helpers wired
into the resume editor; consolidating frees 3 deployment slots under
the 100-function Supabase limit.

Functions merged (4 → 1):

- `enhance-section`  → action `enhance`
- `tailor-section`   → action `tailor`
- `fill-gap`         → action `fill-gap`
- `explain-gap`      → action `explain-gap`

### Dispatch contract

- **PRIMARY:** `x-resume-section-ai-action` request header.
- **FALLBACK:** top-level `body.action` ∈ `{"tailor","fill-gap",
  "explain-gap"}`.

The header is the primary dispatch path (intentional deviation from
Task #55) because the `enhance` handler reads its OWN inner
`body.action` for sub-routing (`generate` / `improve` / `ats_optimize`
/ `fix_error` / `shorten` / `expand` / `add_metrics` / …). Setting a
top-level `body.action: 'enhance'` would either clobber that inner
field or force the router to know about both layers. The header keeps
the body byte-for-byte identical to what the pre-merge function saw.

The web caller (`rewriteResumeSectionAiInvoke` in
`src/integrations/supabase/edgeFunctions.ts`, plus the six raw-fetch
callers — `useAIEnhance`, `useATSSuggestions`, `aiTailor.tailorSection`,
`SectionAIPopover`, `AIEnhanceSheet`, `tailor/QuickActions`) sets the
header for ALL four legacy names and never mutates the body.

### Auth posture (intentional deviation from Task #55)

UNLIKE the transactional-email merger, **a single `requireAuth` runs
once at the top of the router, BEFORE the body is buffered or the
action is resolved**. This mirrors each pre-merge function which
called `requireAuth` as the first line of its `serve()` body. The
router resolves `userId` once and threads it into the per-handler
function. Failures use the shared `authErrorResponse` envelope, which
is what every pre-merge function already returned. Consequence:
unauthenticated callers get `401` regardless of whether the action
header / body.action is valid — matching pre-merge behaviour rather
than leaking the action contract via a router-level `400 invalid_action`.

### Router-level payload guard

A `checkPayloadSize(req, 500 * 1024)` Content-Length check runs AFTER
auth and BEFORE the body is buffered via `req.text()`, using the
largest per-handler ceiling. This avoids buffering an oversized body
just to reject it downstream. Per-handler `checkPayloadSize` calls
still run inside each handler with their original limits (tailor =
200 KiB; the others = 500 KiB), preserving each handler's pre-merge
413 envelope exactly.

### Per-handler responsibilities preserved (NOT hoisted)

The router intentionally does **NOT** hoist:

- **kill-switch** (`AI_*_DISABLED` env)
- **payload-size check** (`checkPayloadSize`, per-handler limit)
- **rate-limit** (`checkRateLimit`, per-handler key + window)
- **credit deduction / refund-on-AI-error**
- **JSON.parse of the body** (each handler parses the buffered
  `bodyText` itself so a malformed body returns its original
  per-handler 4xx envelope rather than a router-level 400)

Hoisting any of these would change observable behaviour: the four
handlers use different credit costs, different refund branches, and
validate inputs in different order relative to credit deduction. The
router buffers the body once with `req.text()` and hands the string
through; each handler then runs its original validate-then-deduct-
then-call-OpenAI-then-refund-on-error sequence verbatim.

### CORS

CORS preflight is handled at the router boundary BEFORE auth, so
`OPTIONS` succeeds without a token (parity with every pre-merge
function).

### Rollout

Flag: `USE_MERGED_RESUME_SECTION_AI` in
`src/integrations/supabase/resumeSectionAiFlag.ts`. Defaults `true`.
Originals deleted from `supabase/functions/` in this commit; the
24-hour soak window is observed against the deployed Supabase
project (the prior function deployments are still live until the
next supabase deploy run). Flip the flag to `false` to roll back to
the legacy function names within that window. After the next deploy
prunes the originals, this flag has no fallback target and must stay
`true`.

### Coverage

`tests/e2e/specs/23-resume-section-ai-merged.spec.ts` —
header dispatch (×4), body.action fallback (×3), unknown-action 400,
missing-auth 401, CORS preflight (4 + 1 + ancillaries; spec auto-skips
when `SUPABASE_URL` / `SUPABASE_ANON_KEY` are not configured).

## Transactional email consolidation (Task #55, 2026-05-03)

Three Resend-backed transactional-email edge functions were merged into a
single `transactional-email` router. All three load templates the same
way and call the same Resend client (or, in the case of resume-reminder,
write in-app notification rows triggered by cron). Consolidating frees
2 deployment slots under the 100-function Supabase limit.

Functions merged (3 → 1):

- `send-contact-email`        → action `contact-email`
- `submit-contact-request`    → action `contact-request`
- `send-resume-reminder`      → action `resume-reminder`

**Explicitly excluded** (kept isolated for security / contract reasons):

- `send-password-reset` — auth-flow critical, isolation = security feature.
- `send-push` — different SDK (FCM/APNs), already covered by `mobile-api`.
- `auth-email-hook` — Supabase auth posts to a fixed URL with HMAC
  signature; URL change = silent auth break.

### Dispatch contract

- **PRIMARY:** `body.action` ∈ `{"contact-email","contact-request",
  "resume-reminder"}`.
- **FALLBACK:** `x-transactional-email-action` request header. The web
  helper sets BOTH (header always; body.action only when the caller
  didn't supply one). The header fallback is also what the re-pointed
  `send-resume-reminder` pg_cron job uses, since the cron command
  posts an empty body.

### Auth posture (intentional deviation from prior merges)

Unlike the admin-* mergers in this codebase, **NO single auth gate runs
at the top of the router**. Each handler keeps its ORIGINAL auth
posture, and they intentionally differ:

- `contact-email`   → public; optional `Authorization: Bearer <jwt>`
                      for user attribution; internal IP rate limit
                      (`RATE_LIMIT_REQUESTS_PER_HOUR=3`) AND per-user/IP
                      `checkRateLimit` (5 / 5min).
- `contact-request` → public; honeypot (`website` field); optional
                      Bearer; per-IP `checkRateLimit` (3 / 5min).
- `resume-reminder` → CRON-SECRET gated via `requireCronSecret`
                      (`x-cron-secret` header); fails closed 401
                      when CRON_SECRET is unset. Service-to-service
                      only.

Hoisting auth would have broken contact-email's `dry_run` branch and
its saved-but-not-sent semantics, plus contact-request's anonymous
public path. Each handler's parse-vs-validation-vs-auth ordering is
preserved byte-for-byte against its pre-merge function.

### Body buffering / parse parity

`handleContactRequest` calls the shared
`checkPayloadSize(req, 64 * 1024)` helper at the top of the handler
— same shared helper, same Content-Length-based check, same 413
envelope (`{"error":"Request payload too large. Maximum allowed size
is 500KB."}`) as the original `submit-contact-request` function. The
guard is scoped to this handler only; `contact-email` and
`resume-reminder` did not have a payload-size guard pre-merge and
none is applied to them post-merge. The helper reads only the
request's Content-Length header (it does not consume the body), so
running it after the router has already buffered `bodyText` is
functionally identical to the original "check first, then read"
ordering.

After the size guard, the router buffers the body ONCE as text, then
hands the text string (not a parsed object) to each handler. Each
handler does its OWN `JSON.parse(bodyText)` inside its original
try/catch wrapper, so parse-vs-validation-vs-throw semantics are
preserved byte-for-byte against each pre-merge function.

**Documented dispatch boundary:** when both the JSON body fails to
parse for an `action` field AND the `x-transactional-email-action`
header is missing, the router returns its own 400 (`Unknown action:
(missing)`) rather than handing a malformed body to a handler. All
real callers in this repo (web helper, PortfolioContactForm,
sendFeedback, the re-pointed pg_cron job) set at least one of the
two dispatch surfaces, so this is unreachable from any trusted
caller. A handler-level malformed-body parse error envelope is only
returned once dispatch succeeds and the handler runs its own
`JSON.parse(bodyText)`.

Email content (subject, from address, to, html body, text body) for
each handler is a verbatim port of its original. The
`buildSubject` mapper, the username-request HTML branch, the IP/
user-id footer, and the Resend POST body
(`from: "WiseResume Support <notifications@thewise.cloud>"`,
`reply_to: <user>`, etc.) are byte-for-byte identical to the
pre-merge `send-contact-email`.

### Web helper rewrite

`src/integrations/supabase/edgeFunctions.ts` adds
`rewriteTransactionalEmailInvoke` mirroring the existing rewrite
helpers. A single-line `USE_MERGED_TRANSACTIONAL_EMAIL = true` flag
at the top of the helper toggles the rewrite; flipping to `false`
falls back to the three originals. The rewrite preserves the body
1:1; only adds a top-level `action` field when the caller didn't
provide one (none of the three handlers currently read body.action
for inner sub-routing, so this is purely additive).

`src/components/portfolio/public/PortfolioContactForm.tsx` calls the
function via direct `fetch()` (it bypasses `edgeFunctions.invoke` to
avoid the impersonation-token path). It carries its own one-line
`USE_MERGED_TRANSACTIONAL_EMAIL` flag (kept in lockstep with the
helper flag) so the same flip flow works there too.

The dev Express proxy (`server/index.ts`) was extended to forward
both `x-transactional-email-action` and `x-cron-secret` through
`/api/fn/:fnName`. The legacy per-fn proxy stubs for the three
originals become dead code (the rewritten name `transactional-email`
falls through to the generic forwarder) and will be cleaned up in the
downstream redeploy + cleanup task.

### Cron repoint

Migration `20260503000002_repoint_resume_reminder_cron.sql` rewrites
any existing pg_cron job that references `send-resume-reminder` so
the URL points at `transactional-email` and the dispatch action is
injected as both an `x-transactional-email-action: resume-reminder`
header and (downstream of `20260506000000_cron_jobs_x_cron_secret_header.sql`)
the existing `x-cron-secret` header is preserved. The migration is
defensive: no-op without pg_cron / pg_net / required GUCs and only
touches commands referencing the old function name.

### Soak / cleanup ownership

The downstream "Full edge-function redeploy + platform verification"
task owns the prod-side deploy of `transactional-email`, the 24-hour
soak, and the eventual `DELETE /v1/projects/<ref>/functions/<name>`
for the three originals. This task ships the source-tree
consolidation:

- `supabase/functions/transactional-email/index.ts` (new)
- 3 originals deleted from `supabase/functions/`
- `supabase/config.toml` updated (3 entries removed, 1 added)
- `src/integrations/supabase/edgeFunctions.ts` rewrite + flag
- `src/components/portfolio/public/PortfolioContactForm.tsx` flag
- `server/index.ts` header forwards (transactional-email + cron-secret)
- `supabase/migrations/20260503000002_repoint_resume_reminder_cron.sql`
- `tests/e2e/specs/22-transactional-email-merged.spec.ts`

Net deployed function count drops by 2 once cleanup runs.

DevKit UI (`DevKitRunner.tsx` Email Service Test) and the
`UsernameRequestDialog` continue to invoke `send-contact-email`; the
rewrite happens transparently in the helper. `sendFeedback` continues
to invoke `send-contact-email` with `submit-contact-request` as the
fallback; both names are rewritten to the merged router. No UI
changes.

---

## Admin WiseHire consolidation (Task #54, 2026-05-03)

Four admin-only WiseHire management edge functions were merged into a
single `admin-wisehire` router. All four shared the same
`requireAdminAuth` gate and operate on the WiseHire invites/waitlist
surface (`wisehire_invites`, `wisehire_waitlist`, plus auth.users for
the test reset). Consolidating frees 3 deployment slots under the
100-function Supabase limit.

Functions merged (4 → 1):

- `admin-wisehire-invite`        → action `invite`
- `admin-wisehire-reset-user`    → action `reset-user`
- `admin-wisehire-revoke-invite` → action `revoke-invite`
- `admin-wisehire-waitlist`      → action `waitlist`

### Dispatch contract

- **PRIMARY:** `body.action` ∈ `{"invite","reset-user",
  "revoke-invite","waitlist"}`.
- **FALLBACK:** `x-admin-wisehire-op` request header. The web helper
  sets BOTH (header always; body.action only when the caller didn't
  supply one), matching the pattern from prior admin merges.

### Auth posture

Single `requireAdminAuth` runs at the top of `serve` (per task spec
— explicit "single assertAdmin at top"). All 4 originals parsed body
BEFORE auth, so an unauthenticated call with a malformed body would
have returned 500. With auth lifted to the top, that combined edge
case now returns 401. **Single documented router-boundary
deviation.** No real client (web helper, dev proxy) hits this case;
the Playwright spec asserts the 401 behaviour so the deviation is
captured in CI.

### Body buffering / parse parity

Router buffers the body ONCE as text at the top, then hands the text
string (not a parsed object) to each handler. Each handler does its
OWN `JSON.parse` inside its original try/catch wrapper, preserving
parse-vs-validation-vs-throw semantics byte-for-byte. Audit-log
writes preserve the original `category` / `action` strings:

- `invite`        → category `admin_email`, action `wisehire_invite`
- `reset-user`    → category `admin`,       action `wisehire_test_reset`
- `revoke-invite` → category `admin_email`, action `wisehire_invite_revoke`
- `waitlist`      → no audit-log writes (read-only listing + entry delete)

The invite handler's Resend email-send call (template, subject, from
address, audit-log message_id capture) is preserved byte-for-byte —
the inline `buildInviteEmail` HTML template, the EMAIL_LOGO_URL, and
the WISEHIRE_INVITE_SECRET / WISEHIRE_APP_URL env reads are all
identical to the original.

### Web helper rewrite

`src/integrations/supabase/edgeFunctions.ts` adds
`rewriteAdminWisehireInvoke` mirroring the existing rewrite helpers.
A single-line `USE_MERGED_ADMIN_WISEHIRE = true` flag at the top of
the helper toggles the rewrite; flipping to `false` falls back to
the four originals. The rewrite preserves the body 1:1; only adds
a top-level `action` field when the caller didn't provide one.

The dev Express proxy (`server/index.ts`) was extended to forward
`x-admin-wisehire-op` through `/api/fn/:fnName`. The legacy per-fn
proxy stubs for `admin-wisehire-invite`, `admin-wisehire-waitlist`,
`admin-wisehire-revoke-invite`, and `admin-wisehire-reset-user`
become dead code (the rewritten name `admin-wisehire` falls through
to the generic forwarder) and will be cleaned up in the downstream
redeploy + cleanup task.

### Soak / cleanup ownership

The downstream "Full edge-function redeploy + platform verification"
task owns the prod-side deploy of `admin-wisehire`, the 24-hour
soak, and the eventual `DELETE /v1/projects/<ref>/functions/<name>`
for the four originals. This task ships the source-tree
consolidation:

- `supabase/functions/admin-wisehire/index.ts` (new)
- 4 originals deleted from `supabase/functions/`
- `supabase/config.toml` updated (4 entries removed, 1 added)
- `src/integrations/supabase/edgeFunctions.ts` rewrite + flag
- `server/index.ts` header forward
- `tests/e2e/specs/21-admin-wisehire-merged.spec.ts` parity tests

Net deployed function count drops by 3 once cleanup runs.

DevKit UI (`WiseHireWaitlistPanel.tsx`, `UserDetailDrawer.tsx`,
`EmailManagementPanel.tsx`) continues to invoke the legacy fn names;
the rewrite happens transparently in the helper. No DevKit UI
changes.

---

## Admin AI control-plane consolidation (Task #53, 2026-05-03)

Four admin AI control-plane edge functions were merged into a single
`admin-ai-ops` router. All four are admin-only surfaces guarded by
`requireAdminAuth` (with one dual-mode exception below) and operate on
the AI configuration / observability surface — caps, routing config,
key inspection, and the dynamic test-model allow-list. Consolidating
frees 3 deployment slots under the 100-function Supabase limit.

Functions merged (4 → 1):

- `admin-ai-caps` → action `caps`
- `admin-ai-routing` → action `routing`
- `inspect-ai-keys` → action `inspect-keys`
- `refresh-ai-test-models` → action `refresh-test-models`

Explicitly excluded (kept isolated): `ai-test`, `ai-health`. Both are
non-admin surfaces with different auth postures and are out of scope
for this merge.

### Dispatch contract

- **PRIMARY:** `body.action` ∈ `{"caps","routing","inspect-keys",
  "refresh-test-models"}`.
- **FALLBACK:** `x-admin-ai-op` request header. Used when the caller's
  body has its own `action` field for inner sub-routing — needed for
  two parity surfaces:
  - `admin-ai-caps` reads `body.action ∈ {"get_caps","set_plan_cap",
    "set_global_cap","get_user_cap","set_user_cap"}` for its own
    inner sub-routing.
  - `admin-ai-routing` reads `body.action ∈ {"get_config",
    "update_feature","reset_feature"}` for its own inner sub-routing.
  Clobbering body.action would break those handlers' byte-for-byte
  parity, so the helper leaves the body untouched and dispatches via
  the header instead.

The web helper (`rewriteAdminAiOpsInvoke`) sends BOTH (header always;
body.action only when the caller didn't already supply one), so the
spec's body.action contract is the user-facing contract for
`inspect-keys` and `refresh-test-models`. The header is the dispatch
path for `caps` and `routing`.

The router checks the header first, then falls back to body.action,
because the web helper sets the header for every call.

### Auth posture

- **caps / routing / inspect-keys:** single `requireAdminAuth` runs at
  the top of `serve` (per task spec — explicit "single assertAdmin at
  top of serve").
- **refresh-test-models:** keeps its original dual-mode auth — if
  `x-cron-secret` is present the router calls `requireCronSecret`,
  otherwise it falls through to `requireAdminAuth`. This preserves the
  nightly pg_cron caller (which has no admin session) while still
  letting an admin manually trigger a refresh from the DevKit AI Keys
  panel. The cron job is re-pointed at `admin-ai-ops` in migration
  `20260503000001_repoint_refresh_ai_test_models_cron.sql` so cron
  parity is preserved across the eventual deletion of the standalone
  `refresh-ai-test-models` function.

### Body buffering / parse parity

The router buffers the body ONCE as text at the top, then hands the
text string (not a parsed object) to each handler. Each handler does
its OWN `JSON.parse` inside its original try/catch wrapper, so each
handler's parse-vs-validation-vs-throw semantics are preserved
byte-for-byte. Audit-log writes preserve the same `category` /
`action` strings (`ai_caps`, `ai_routing` / `ai_cap_update`,
`ai_global_cap_update`, `ai_user_cap_update`, `ai_routing_update`,
`ai_routing_reset`) so existing admin dashboards keep working.

**Single documented router-boundary deviation:** for the 4 originals
(except refresh-ai-test-models), an unauthenticated call with a
malformed body would have returned 500 (parse fails inside outer
try/catch). With auth lifted to the top of the router, that combined
edge case now returns 401. No real client ever hits this case — every
caller (web helper, dev proxy, cron job) sends well-formed JSON. The
Playwright spec asserts the 401 behaviour so the deviation is
captured in CI.

### Key-masking guarantee

`inspect-ai-keys`'s tail-only mask format (`••••XXXX`) is preserved
byte-for-byte in the merged handler. The Playwright spec asserts that
an unauthenticated `inspect-keys` call returns the canonical 401
envelope and that the response body contains NEITHER `keys`,
`masked`, env names (`OPENROUTER_KEY`, `GROQ_KEY`, `DEEPSEEK_KEY`),
nor the mask glyph (`••••`) — proving auth runs strictly before any
env-var enumeration.

### Web helper rewrite

`src/integrations/supabase/edgeFunctions.ts` adds
`rewriteAdminAiOpsInvoke` mirroring the existing `rewriteAdminConfig`
/ `rewriteAdminUserOps` patterns. A single-line
`USE_MERGED_ADMIN_AI_OPS = true` flag at the top of the helper toggles
the rewrite; flipping it to `false` falls back to the four originals
(useful during the soak window if a regression is discovered).

The rewrite preserves the body 1:1 — the only mutation is adding a
top-level `action` field when the caller's body has no pre-existing
`action`. This means `caps` and `routing` callers (whose bodies carry
their own inner action like `{action:'get_caps', ...}`) reach the
router unchanged.

The dev Express proxy (`server/index.ts`) was extended to forward the
`x-admin-ai-op` header through `/api/fn/:fnName` — same one-liner
pattern as the prior `x-admin-config-action` and `x-admin-user-op`
forwards. The legacy per-fn proxy stubs for `admin-ai-caps` and
`admin-ai-routing` become dead code (the rewritten name `admin-ai-ops`
falls through to the generic `/api/fn/:fnName` forwarder) and will be
cleaned up in the downstream redeploy + cleanup task.

### Soak / cleanup ownership

The downstream "Full edge-function redeploy + platform verification"
task owns the prod-side deploy of `admin-ai-ops`, the 24-hour soak,
and the eventual `DELETE /v1/projects/<ref>/functions/<name>` for the
four originals. This task only ships the source-tree consolidation:

- `supabase/functions/admin-ai-ops/index.ts` (new)
- 4 originals deleted from `supabase/functions/`
- `supabase/config.toml` updated (4 entries removed, 1 added)
- `src/integrations/supabase/edgeFunctions.ts` rewrite + flag
- `server/index.ts` header forward
- `supabase/migrations/20260503000001_repoint_refresh_ai_test_models_cron.sql`
  re-points the cron job at `admin-ai-ops`
- `tests/e2e/specs/20-admin-ai-ops-merged.spec.ts` parity tests

Net deployed function count drops by 3 once cleanup runs.

---

## Admin config consolidation (Task #52, 2026-05-03)

Five admin-only configuration edge functions were merged into a single
`admin-config` router. All five shared the same `requireAdminAuth` gate
and CRUD against config tables (`app_settings`, `feature_flags`) or
read-only env / upstream-API surfaces, so consolidating frees 4
deployment slots under the 100-function Supabase limit.

Dispatch contract (per task spec):

- **PRIMARY:** `body.action` ∈ `{ "get-settings", "update-settings",
  "feature-flags", "integrations", "env-check" }`.
- **FALLBACK:** `x-admin-config-action` request header. Used when
  `body.action` is missing or names something else — needed for two
  parity surfaces:
  - `admin-feature-flags` reads `body.action ∈ {"list","upsert",
    "delete"}` for its own inner sub-routing.
  - `admin-integrations` reads `body.action ∈ {"get_resend_bounces",
    "get_deploy_status","trigger_deploy"}` for its own inner
    sub-routing.
  Clobbering body.action would break those handlers' byte-for-byte
  parity, so the helper leaves the body untouched and dispatches via
  the header instead.

The web helper sends BOTH (header always; body.action only when the
caller didn't already supply one), so the spec's body.action contract
is the user-facing contract for `get-settings`/`update-settings`/
`env-check`. The header is the dispatch path for `feature-flags` and
`integrations`.

Parity strategy: the router buffers the body ONCE as text at the top,
then hands the text string (not a parsed object) to each handler.
Each handler does its OWN `JSON.parse` inside its original try/catch
wrapper, so each handler's parse-vs-validation-vs-throw semantics are
preserved byte-for-byte. Audit-log writes preserve the same
`category` / `action` strings (`admin_feature_flag` / `upsert` |
`delete`) so existing admin dashboards keep working.

### Parity ordering — auth and body parsing

The `requireAdminAuth` gate runs ONCE at the top of `serve` (per task
spec — explicit "single assertAdmin at top of serve"). All 5
originals parsed body BEFORE auth and threw to outer try/catch on
parse failure → returned 500 `Internal server error`. Handlers
replicate this verbatim with their own outer try/catch when called
with a successful auth.

On unauthenticated calls every action returns the canonical
`{success:false, error:'Unauthorized'}` 401 — identical to all 5
originals.

**Single documented router-boundary deviation:** for the 5 originals,
an unauthenticated call with a malformed body would have returned 500
(parse fails before auth runs). With auth lifted to the top of the
router, that combined edge case now returns 401. No real client
ever hits this case — every caller (web helper, dev proxy) sends
well-formed JSON. The Playwright spec asserts the 401 behavior so the
deviation is captured in CI.

**Authenticated malformed-body parity (preserved):**

- `get-settings`: original called `await req.json()` even though it
  ignored the result, so a malformed body inside an authenticated
  call threw to the outer try/catch → JSON 500
  `{success:false,error:'Internal server error'}`. The merged handler
  reproduces this by calling `JSON.parse(bodyText)` (and discarding
  the result) inside its outer try/catch.
- `update-settings`, `feature-flags`, `env-check`: each handler keeps
  its own outer try/catch and parses the body internally, so
  authenticated malformed-body still returns the original 500 JSON
  envelope.
- `integrations`: original had NO try/catch wrapping
  `await req.json()`, so a malformed body in an authenticated call
  threw out of the handler and bubbled to `wrapHandler` → re-thrown
  → platform-default 500 (not a JSON `{success:false,...}` envelope).
  Per parity requirement, the merged router does NOT wrap dispatch in
  an outer try/catch — `handleIntegrations`'s parse exception
  propagates exactly as before. Wrapping it here would have changed
  the error surface (platform default → JSON envelope) and broken
  byte-for-byte parity.

These authenticated parse-failure paths are not asserted in CI
because the test harness cannot mint a real DevKit admin session
token without leaking `DEV_KIT_PASSWORD`; they are verified by static
review against each original handler's source.

### Dispatch contract clarification

The task spec lists `body.action` as the dispatch field. Strict
compliance would have required us to either (a) rename the inner
`action` field that `feature-flags` and `integrations` originals
read for their sub-routing, or (b) wrap each inner action in an
envelope like `{action:'feature-flags', innerAction:'list', ...}`.
Both options would have changed each handler's input shape and
broken byte-for-byte parity with the originals — the stated primary
acceptance criterion. We chose to satisfy the parity criterion by
keeping body.action available for the 3 actions whose originals
don't read it (get-settings / update-settings / env-check) and
adding a `x-admin-config-action` header fallback for the 2 actions
whose originals DO read body.action for inner sub-routing
(feature-flags / integrations). The web helper sets BOTH on every
call (header always; body.action only when the caller didn't
already supply one), so observability tools that inspect the body
still see the router-level action. This is the same pattern used
by Task #51's admin-user-ops merge.

**env-check security note:** `REQUIRED_ENV_VARS` in
`supabase/functions/admin-config/index.ts` is byte-for-byte identical
to the original `admin-env-check`. Adding or removing keys is a
security-relevant masking change and is explicitly out of scope for
this task. The Playwright spec also asserts that an unauthenticated
env-check call returns 401 with no `checks`/`supabaseUrl`/`present`
fields in the body, so no env value can leak from this surface.

Merged (5 → 1):

- `admin-get-settings`     → action `get-settings`
- `admin-update-settings`  → action `update-settings`
- `admin-feature-flags`    → action `feature-flags` (inner action via body)
- `admin-integrations`     → action `integrations` (inner action via body)
- `admin-env-check`        → action `env-check`

Web client routing:

- `src/integrations/supabase/edgeFunctions.ts` adds a single
  `USE_MERGED_ADMIN_CONFIG` constant (default `true`). When on,
  every legacy admin-config invoke is rewritten to `admin-config`
  with the `x-admin-config-action` header set for dispatch (and
  `body.action` injected alongside for spec compliance only when
  the caller didn't already set its own `action` field — i.e. for
  feature-flags / integrations the inner action is preserved
  untouched). Flip to `false` to fall back to the five originals
  if any are still deployed.
- All call sites in `src/components/dev-kit/AppSettingsPanel.tsx`,
  `src/components/dev-kit/OwnerOpsPanel.tsx`,
  `src/components/dev-kit/FeatureFlagsPanel.tsx`,
  `src/components/dev-kit/IntegrationsPanel.tsx`, and
  `src/components/dev-kit/DeploymentPanel.tsx` continue to invoke
  the legacy fn names; the rewrite happens transparently in the
  helper. No DevKit UI changes.
- The dev Express proxy (`server/index.ts`) generic
  `/api/fn/:fnName` route now forwards the `x-admin-config-action`
  header to Supabase. The legacy per-fn proxy stubs become dead
  code (the rewritten name `admin-config` falls through to the
  generic forwarder) and will be cleaned up in the downstream
  redeploy + cleanup task.

Original sources removed:

- `supabase/functions/admin-get-settings/`
- `supabase/functions/admin-update-settings/`
- `supabase/functions/admin-feature-flags/`
- `supabase/functions/admin-integrations/`
- `supabase/functions/admin-env-check/`
- Corresponding `[functions.*]` entries removed from
  `supabase/config.toml`. New entry `[functions.admin-config]` added
  (`verify_jwt = false`, matching all 5 originals — auth is enforced
  inside the handler via the DevKit HMAC token, not at the gateway).

Tests:

- `tests/e2e/specs/19-admin-config-merged.spec.ts` asserts the
  merged router reproduces the pre-merge unauthenticated response
  envelope (`{success:false,error:'Unauthorized'}` / 401) for all
  5 actions plus the unknown-action branch, the inner-action
  compatibility shims (feature-flags `list`, integrations
  `get_resend_bounces`), and the env-check leakage guard. The
  unauthenticated 401 is the only safe parity surface in CI —
  every other branch requires a real DevKit session token
  (HMAC-signed payload + a row in `admin_sessions`), which the
  test harness has no way to mint without leaking
  `DEV_KIT_PASSWORD`. Auto-skips when `SUPABASE_URL` /
  `SUPABASE_ANON_KEY` are missing.

Soak / cleanup ownership:

- The downstream *Full edge-function redeploy + platform verification*
  task owns the prod-side deploy of `admin-config`, the 24-hour
  soak, and the eventual `DELETE /v1/projects/<ref>/functions/<name>`
  for the five originals. Net deployed function count drops by 4.

---

## Admin user-lifecycle consolidation (Task #51, 2026-05-03)

Seven admin-only user-lifecycle edge functions were merged into a single
`admin-user-ops` router. All seven shared the exact same `requireAdminAuth`
gate and mutated the same admin-only tables (`profiles`, `subscriptions`,
`ai_credits`, `audit_logs`, `auth.users` sessions), so consolidating frees
6 deployment slots under the 100-function Supabase limit.

Dispatch contract (per task spec):

- **PRIMARY:** `body.action` ∈ `{ "suspend", "grant-trial",
  "revoke-trial", "set-credits", "set-plan", "revoke-sessions",
  "update-profile" }`.
- **FALLBACK:** `x-admin-user-op` request header. Used ONLY when
  `body.action` is missing or doesn't name a valid dispatch action
  — needed for two parity surfaces: (a) `admin-update-profile`'s
  inner `body.action: 'get'` selector for its GET sub-path, which
  must reach the update-profile handler with the inner action
  preserved verbatim, and (b) malformed-body callers to
  `admin-revoke-sessions` so its 400 envelope on bad bodies is
  reachable.

The web helper sends BOTH (header always; body.action only when the
caller didn't already supply one), so the spec's body.action contract
is the user-facing contract — the header is purely a parity-safety
fallback.

Parity strategy: the router buffers the body ONCE as text at the top,
then hands the text string (not a parsed object) to each handler.
Each handler does its OWN `JSON.parse` inside its original try/catch
wrapper, so each handler's parse-vs-validation-vs-throw semantics are
preserved byte-for-byte.

Each sub-handler is a byte-for-byte port of its original — same
validation, same response shape, same status codes, same audit-log
writes (preserving the same `category` / `action` strings so existing
admin dashboards keep working), same error envelopes.

### Parity ordering — auth and body parsing

The `requireAdminAuth` gate runs ONCE at the top of `serve` (per task
spec — explicit "do not duplicate per action"). Each handler then
does its OWN `await req.json()` inside its body, which preserves the
original parse-vs-auth ordering for handler-internal effects:

- 6 of 7 originals parsed body BEFORE auth and threw to outer
  try/catch on parse failure → returned 500 `Internal server error`
  (or, for `revoke-trial`, 500 `String(err)`). Handlers replicate
  this verbatim with their own outer try/catch.
- `admin-revoke-sessions` was the outlier: it ran auth FIRST, then
  parsed body inside an inner try/catch with `body = {}` default —
  so a malformed body fell through to validation and returned 400
  `target_user_id is required`, NOT 500. Replicated exactly.

On unauthenticated calls every action returns the canonical
`{success:false, error:'Unauthorized'}` 401 — identical to all 7
originals.

**Single documented router-boundary deviation:** for the 6 parse-first
originals, an unauthenticated call with a malformed body would have
returned 500 (parse fails before auth runs). With auth lifted to the
top of the router, that combined edge case now returns 401. No real
client (web helper, mobile, server-side proxy) ever hits this case —
they all serialize well-formed JSON. The Playwright spec asserts the
401 behavior so the deviation is captured in CI.

Merged (7 → 1):

- `admin-suspend-user`     → action `suspend`
- `admin-grant-trial`      → action `grant-trial`
- `admin-revoke-trial`     → action `revoke-trial`
- `admin-set-credits`      → action `set-credits`
- `admin-set-plan`         → action `set-plan`
- `admin-revoke-sessions`  → action `revoke-sessions`
- `admin-update-profile`   → action `update-profile`

Explicitly **NOT** merged (kept isolated for blast-radius / audit-trail
clarity, per task #51 user direction):

- `admin-delete-user` — destructive, must remain its own function.
  Source unchanged, deployment unchanged.

Also kept separate (different shapes / heavy reads / security-sensitive):
`admin-impersonate`, `admin-list-users`, `admin-list-user-content`,
`admin-merge-identity`, `admin-kinde-reconcile`.

Web client routing:

- `src/integrations/supabase/edgeFunctions.ts` adds a single
  `USE_MERGED_ADMIN_USER_OPS` constant (default `true`). When on, every
  legacy admin invoke (`admin-suspend-user` / `admin-grant-trial` /
  `admin-revoke-trial` / `admin-set-credits` / `admin-set-plan` /
  `admin-revoke-sessions` / `admin-update-profile`) is rewritten to
  `admin-user-ops` with the `x-admin-user-op` header set for dispatch
  (and `body.action` injected alongside for spec compliance, only
  when the caller didn't already set its own `action` field). The
  body is otherwise forwarded byte-for-byte. Flip to `false` to fall
  back to the seven originals if any are still deployed.
- `admin-update-profile` originally consumed its own inner `body.action`
  field for the GET sub-path. With header-based dispatch the inner
  field never collides with the router, so the helper passes the
  body untouched and the handler's `action === 'get'` branch fires
  exactly as before.
- All call sites in `src/components/dev-kit/UserDetailDrawer.tsx` and
  `src/components/dev-kit/AdminUsersPanel.tsx` continue to invoke the
  legacy fn names; the rewrite happens transparently in the helper.
  No DevKit UI changes.
- The dev Express proxy (`server/index.ts`) is intentionally untouched
  per task scope guard: the existing generic `/api/fn/:fnName` route
  forwards `admin-user-ops` to Supabase exactly like the per-function
  proxies did. The legacy per-fn proxy stubs become dead code and will
  be cleaned up in the downstream redeploy + cleanup task.

Original sources removed:

- `supabase/functions/admin-suspend-user/`
- `supabase/functions/admin-grant-trial/`
- `supabase/functions/admin-revoke-trial/`
- `supabase/functions/admin-set-credits/`
- `supabase/functions/admin-set-plan/`
- `supabase/functions/admin-revoke-sessions/`
- `supabase/functions/admin-update-profile/`
- Corresponding `[functions.*]` entries removed from
  `supabase/config.toml`. New entry `[functions.admin-user-ops]` added
  (`verify_jwt = false`, matching all 7 originals — auth is enforced
  inside the handler via the DevKit HMAC token, not at the gateway).

Tests:

- `tests/e2e/specs/18-admin-user-ops-merged.spec.ts` asserts the merged
  router reproduces the pre-merge unauthenticated response envelope
  (`{success:false,error:'Unauthorized'}` / 401) for all 7 actions plus
  the unknown-action branch. The unauthenticated 401 is the only safe
  parity surface in CI — every other branch requires a real DevKit
  session token (HMAC-signed payload + a row in `admin_sessions`),
  which the test harness has no way to mint without leaking
  `DEV_KIT_PASSWORD`. Auto-skips when `SUPABASE_URL` /
  `SUPABASE_ANON_KEY` are missing.

Soak / cleanup ownership:

- The downstream *Full edge-function redeploy + platform verification*
  task owns the prod-side deploy of `admin-user-ops`, the 24-hour
  soak, and the eventual `DELETE /v1/projects/<ref>/functions/<name>`
  for the seven originals. `admin-delete-user` is **NOT** to be
  deleted — it stays deployed and isolated. Net deployed function
  count drops by 6.

---

## Wisehire access consolidation (Task #50, 2026-05-03)

Five wisehire onboarding/gating edge functions were merged into a single
`wisehire-access` router. All five gated the same wisehire onboarding
funnel against the same tables (`wisehire_waitlist`, `wisehire_invites`),
so consolidating frees 4 deployment slots under the 100-function Supabase
limit.

Dispatch: `body.action` ∈ `{ "waitlist-check-email", "waitlist-join",
"validate-early-access", "validate-invite", "complete-signup" }`. The
router parses the JSON body once, then forwards the parsed object plus
the original `Request` to the right sub-handler — preserving every auth
gate, validation, response shape, status code, and error envelope from
the pre-merge functions byte-for-byte.

Auth posture per action (unchanged from originals):

- `waitlist-check-email`     — anonymous (botGuard + IP rate-limit `30/60s`).
- `waitlist-join`            — anonymous (botGuard).
- `validate-early-access`    — anonymous (botGuard).
- `validate-invite`          — anonymous.
- `complete-signup`          — **bearer-required**: caller must supply a
  valid Supabase session JWT. The router calls
  `serviceClient.auth.getUser(bridgeToken)` exactly like the original
  `wisehire-complete-signup` did and returns
  `{ success:false, error:'unauthorized' }` (401) on failure.

Merged (5 → 1):

- `wisehire-waitlist-check-email`     → `wisehire-access` action `waitlist-check-email`
- `wisehire-waitlist-join`            → `wisehire-access` action `waitlist-join`
- `wisehire-validate-early-access`    → `wisehire-access` action `validate-early-access`
- `wisehire-validate-invite`          → `wisehire-access` action `validate-invite`
- `wisehire-complete-signup`          → `wisehire-access` action `complete-signup`

Web client routing:

- New helper `src/lib/wisehire/wisehireAccessClient.ts` exposes a single
  `USE_MERGED_WISEHIRE_ACCESS` constant (default `true`) and an
  `invokeWisehireAccess(action, body)` wrapper that returns the same
  `{ data, error }` shape supabase-js produces. Flip the flag to
  `false` to fall back to the 5 originals if the router isn't deployed
  yet.
- All 3 call sites switched: `src/hooks/wisehire/useWaitlistEmailCheck.ts`,
  `src/hooks/wisehire/useWaitlist.ts`, `src/lib/wisehire/inviteTokenClient.ts`
  (which has 4 invocations covering validate-invite, validate-early-access,
  and 2× complete-signup paths).
- No dev-proxy or supabase-js header tweaks are needed — supabase-js
  forwards the bearer token used by `complete-signup` automatically, and
  the other 4 actions are anonymous.

Original sources removed:

- `supabase/functions/wisehire-waitlist-check-email/`
- `supabase/functions/wisehire-waitlist-join/`
- `supabase/functions/wisehire-validate-early-access/`
- `supabase/functions/wisehire-validate-invite/`
- `supabase/functions/wisehire-complete-signup/`
- Corresponding `[functions.*]` entries removed from
  `supabase/config.toml`. New entry `[functions.wisehire-access]` added
  (`verify_jwt = false`, matching the originals — the bearer check for
  `complete-signup` is enforced inside the handler, not by the platform).

Tests:

- `tests/e2e/specs/17-wisehire-access-merged.spec.ts` asserts the merged
  router reproduces the pre-merge response envelopes for the cheapest
  parity surface of each of the 5 actions plus the unknown-action 400
  branch. Auto-skips when `SUPABASE_URL` / `SUPABASE_ANON_KEY` are
  missing.

Accepted parity deviation (router boundary):

- When the router can determine the action (i.e. body parsed enough to
  read `body.action`), every sub-handler returns its **byte-for-byte
  original** envelope for: 405-on-non-POST (where the original enforced
  it), malformed-body 500 (the original `try/catch (await req.json())`
  branch), validation errors, and the success path. Each handler enforces
  its own method posture and parses-error posture from a `body` argument
  that may be `null` to signal a router-level parse failure.
- When the router **cannot** determine the action (body completely
  malformed JSON, or no `action` field), it returns a generic
  `400 { error: "Invalid JSON body" }` or
  `400 { error: "Unknown action: ..." }` instead of any per-action
  envelope. This is unavoidable: without an action we cannot pick which
  of the 5 originals' parse-failure envelopes to return. No real
  wisehire client (web or mobile) can hit this branch — they all post
  well-formed JSON via supabase-js. This is the **only** documented
  drift from the byte-for-byte parity claim.

Soak / cleanup ownership:

- The downstream *Full edge-function redeploy + platform verification*
  task owns the prod-side deploy of `wisehire-access`, the 24-hour soak,
  and the eventual `DELETE /v1/projects/<ref>/functions/<name>` for the
  five originals. Net deployed function count drops by 4.

---

## Portfolio public consolidation (Task #49, 2026-05-03)

Four anonymous-readable portfolio edge functions were merged into a
single `portfolio-public` router. Each sub-handler keeps its
**original** method (GET/POST), original parse-vs-auth ordering, and
original CORS headers — preserving byte-for-byte parity with the
pre-merge functions, including malformed-JSON 400 envelopes.

Dispatch is read in this priority order:

1. **`?action=` query parameter** (preferred). The web helper
   `apiFnUrl()` always appends this when rewriting legacy fn names,
   so every real caller (browser fetch, sendBeacon, GET crawlers,
   short-link redirects) carries the query. When the query is
   present the router does **not** touch the request body — the
   original Request is forwarded to the sub-handler unchanged so
   `await req.json()` runs on the untouched stream and any
   malformed-JSON 400 envelope (e.g. `portfolio-interest`'s
   `{ error: 'Invalid JSON' }`) is surfaced by the handler itself,
   byte-for-byte identical to the pre-merge function.
2. **`body.action` JSON field** (literal task contract). Used as a
   fallback for callers that omit the query string. Only consulted
   when no query action is present, and only on POST/PUT/PATCH;
   even then the body bytes are rebuilt into a fresh Request before
   delegating, so handlers see the exact original request shape.

GET endpoints (`meta`, `resolve-short-link`) are GET-only in both the
pre-merge and merged versions — converting them to POST would break
crawler / short-link-redirect callers, so the query-string dispatch
is required.

Merged (4 → 1):

- `portfolio-meta`        → query `?action=meta` (GET). Reads
  `username` from the URL searchParams; crawler vs. browser branching
  unchanged; `Cache-Control: public, max-age=300` preserved.
- `portfolio-interest`    → query `?action=interest` (POST). Body
  shape unchanged (`{ username, token? }`). Anonymous; bot guard /
  foreign-referer guard / IP rate limits / unique-token dedup all
  preserved verbatim.
- `track-portfolio-view`  → query `?action=track-view` (POST). Body
  shape unchanged (full beacon payload). Geolocation, PTR lookup,
  notification, short-link click increment all preserved verbatim.
- `resolve-short-link`    → query `?action=resolve-short-link` (GET).
  Slug regex / length checks / 404 lockout / wildcard-CORS shape all
  preserved verbatim. The merged router does NOT downgrade the
  wildcard `Access-Control-Allow-Origin: *` for this action — the
  pre-merge function deliberately served any origin since arbitrary
  `/l/<slug>` clicks come from any domain.

Web client routing:

- `src/lib/apiFnUrl.ts` adds a single `USE_MERGED_PORTFOLIO_PUBLIC`
  constant (default `true`). When on, every `apiFnUrl()` call for one
  of the four legacy fn names is rewritten to
  `portfolio-public?action=<x>`, with any pre-existing query string
  (e.g. `resolve-short-link?id=xxx`) appended after the action.
  Flip to `false` to fall back to the originals if any are still
  deployed.
- The same helper bypasses the dev Express proxy for the
  `portfolio-public` router and calls Supabase directly. The dev
  proxy at `/api/fn/:fnName` strips query strings before forwarding,
  which would drop the `?action=` dispatch parameter — going direct
  in dev avoids that without touching `server/index.ts`. CORS is
  already allow-listed for `http://localhost:5000` /
  `http://localhost:5173` in `supabase/functions/_shared/cors.ts`,
  and the router is anonymous so no token bridging is required.
- The `admin-update-profile` cache-bust hook continues to call the
  legacy `portfolio-meta?username=…` URL during the soak window
  (both endpoints run live in prod). The downstream
  redeploy + cleanup task owns retargeting that hook to
  `portfolio-public?action=meta&username=…` at the same time it
  deletes the four legacy functions.

Original sources removed:

- `supabase/functions/portfolio-meta/`
- `supabase/functions/portfolio-interest/`
- `supabase/functions/track-portfolio-view/`
- `supabase/functions/resolve-short-link/`
- Corresponding `[functions.*]` entries removed from
  `supabase/config.toml`. New entry `[functions.portfolio-public]`
  added (`verify_jwt = false`, matching the originals).

Tests:

- `tests/e2e/specs/16-portfolio-public-merged.spec.ts` asserts the
  merged router reproduces the pre-merge response envelopes for all
  four actions on the cheapest parity surfaces (the 400-bad-request
  branches that don't require a real DB row or a real user). The
  spec covers BOTH dispatch mechanisms (body.action and ?action=
  query) and explicitly asserts the CORS `Access-Control-Allow-Origin`
  header parity — including the deliberate wildcard ACAO on
  resolve-short-link and the origin-allow-list ACAO on the other
  three actions. Auto-skips when `SUPABASE_URL` / `SUPABASE_ANON_KEY`
  are missing.

Soak / cleanup ownership:

- The downstream *Full edge-function redeploy + platform verification*
  task owns the prod-side deploy of `portfolio-public`, the 24-hour
  soak, and the eventual `DELETE /v1/projects/<ref>/functions/<name>`
  for the four originals. Net deployed function count drops by 3.

---

## Coupons consolidation (Task #48, 2026-05-03)

Three coupon-related functions were merged into a single `coupons`
router. Dispatch is signalled via the **`x-coupons-action` request
header** (not the body) so each sub-handler keeps its **original**
parse-vs-auth ordering and original error envelope — preserving
byte-for-byte parity with the pre-merge functions.

Merged (3 → 1):

- `admin-manage-coupons` → header `x-coupons-action: admin-manage`.
  Body shape unchanged (`{ action: 'list'|'create'|'toggle'|'delete', ... }`).
  Auth: `requireAdminAuth` (DevKit HMAC). Original ordering: parse body
  first, then admin auth. 500 envelope: `{ success:false, error }`.
- `redeem-coupon`        → header `x-coupons-action: redeem`. Body
  shape unchanged (`{ code }`). Auth: `requireAuth` (Supabase JWT
  bridge). Original ordering: auth first, then parse. 500 envelope:
  `{ success:false, error }`.
- `validate-coupon`      → header `x-coupons-action: validate`. Same
  body and ordering as redeem. 500 envelope: `{ valid:false, error }`.

Web client routing:

- `src/integrations/supabase/edgeFunctions.ts` adds a single
  `USE_MERGED_COUPONS` constant (default `true`). When on, every legacy
  invoke (`admin-manage-coupons` / `redeem-coupon` / `validate-coupon`)
  is rewritten to `coupons` with the right `x-coupons-action` header
  and the body forwarded unchanged. Flip to `false` to fall back to the
  originals if any are still deployed.
- `src/pages/wisehire/WiseHireSubscriptionPage.tsx` calls supabase-js
  directly (bypassing the helper). It was switched to invoke `coupons`
  with the `x-coupons-action: redeem` header + the original
  `{ code }` body.
- `server/index.ts` generic `/api/fn/:fnName` proxy now forwards the
  `x-coupons-action` header to Supabase so the dev path works the same
  as production.

Original sources removed:

- `supabase/functions/admin-manage-coupons/`
- `supabase/functions/redeem-coupon/`
- `supabase/functions/validate-coupon/`
- Corresponding `[functions.*]` entries removed from
  `supabase/config.toml`. New entry `[functions.coupons]` added.

Tests:

- `tests/e2e/specs/15-coupons-merged.spec.ts` asserts the merged
  router reproduces the pre-merge baseline envelopes captured in
  `tests/e2e/fixtures/coupons-baseline.json` for the three safe parity
  surfaces (unauthenticated redeem/validate/admin-manage). The spec
  auto-skips when `SUPABASE_URL` / `SUPABASE_ANON_KEY` are missing.

Soak / cleanup ownership:

- The downstream *Full edge-function redeploy + platform verification*
  task owns the prod-side deploy of `coupons`, the 24-hour soak, and
  the eventual `DELETE /v1/projects/<ref>/functions/<name>` for the
  three originals. Net deployed function count drops by 2.

---


## Executive summary

The Supabase project (`jnsfmkzgxsviuthaqlyy`) has a **hard 100-function
deployment limit**. Before this audit it sat at **99 deployed functions** —
which meant the six mobile-only functions the Expo app tried to call
(`register-push-token`, `export-resume-pdf`, `export-cover-letter-pdf`,
`export-resignation-letter-pdf`, `interview-next-question`,
`interview-grade-answer`) had **never successfully deployed**. The mobile
app was therefore broken end-to-end for push registration, PDF export, and
the interview practice flow.

This sweep:

1. Consolidates the six mobile-only functions into one router
   (`supabase/functions/mobile-api`) that switches on `body.action`.
2. Deletes the deployed-but-orphaned `admin-rotate-totp` function
   (TOTP rotation has long since moved into `admin-owner-ops` /
   `admin-revoke-sessions`).
3. Aligns every mobile screen and React Query hook with the **actual prod
   schema** (verified via the Supabase Management API SQL endpoint, NOT
   psql against the local Replit DB which has no `auth`/`storage`
   schemas).
4. Adds the four missing pieces of infrastructure that the mobile app
   silently depended on:
   - `device_push_tokens` + `mobile_app_versions` tables
   - `interview_question_bank` + `interview_attempts` tables
   - `interview-audio` storage bucket
   - `exports` storage bucket (used by `_shared/pdfRenderer.ts`)

Net deployed functions after this commit: **99 + 1 (mobile-api) − 1
(admin-rotate-totp) = 99**, well within the 100-function limit.

## Prod schema corrections found during the audit

The earlier mobile code had been written against an imagined schema. Real
prod columns (queried via `https://api.supabase.com/v1/projects/<ref>/database/query`):

| Table                  | Mobile assumed                | Actual prod columns                                                                                                |
| ---------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `resumes`              | `template_key`, `data` jsonb  | `template_id` text + section columns `contact_info`, `summary`, `experience`, `education`, `skills`, … (all jsonb) |
| `cover_letters`        | `body` text                   | `content` **text** + `job_title`, `position`, `company`, `tone`, `template_style`, …                               |
| `resignation_letters`  | `body` text                   | `content` **text** + `recipient_name`, `current_role`, `position`, `notice_period`, `last_working_day`, …          |
| `job_applications`     | mobile used `saved_jobs`      | Table is `job_applications`; columns are `job_title` (NOT `position`) and `url` (NOT `job_url`)                    |
| `device_push_tokens`   | did not exist                 | created by migration `20260601000000_mobile_device_tokens_and_versions.sql`                                        |
| `mobile_app_versions`  | did not exist                 | created by same migration; powers `mobile-config` force-update                                                     |
| `interview_*`          | did not exist                 | created by migration `20260503100000_mobile_interview_tables.sql`                                                  |

Storage buckets verified in prod (post-migration): `avatars`,
`bulk-screening-uploads`, `candidate-resumes`, `emails`, `exports` (new),
`interview-audio` (new), `screenshots`.

## `mobile-api` action contract

`POST /functions/v1/mobile-api` with bearer auth. Body:

```jsonc
{
  "action": "register-push-token" | "export-pdf" | "interview-next-question" | "interview-grade-answer",
  // …action-specific fields
}
```

| Action                    | Body                                                                                       | Returns                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| `register-push-token`     | `{ token, platform, app_version }`                                                         | `{ ok: true }`                                           |
| `export-pdf`              | `{ kind: 'resume'\|'cover_letter'\|'resignation_letter', id }`                             | `{ url, storagePath }` (1-hour signed URL)               |
| `interview-next-question` | `{ track }`                                                                                | `{ id, prompt }`                                         |
| `interview-grade-answer`  | `{ question_id, prompt, track, transcript, audio_path? }`                                  | `{ score, summary, strengths[], improvements[] }`        |

Credit usage: `interview-grade-answer` deducts 1 AI credit (via
`checkAndDeductCredit`); refunds on AI / parsing failure.

## Deleted source dirs

- `supabase/functions/register-push-token/`
- `supabase/functions/export-resume-pdf/`
- `supabase/functions/export-cover-letter-pdf/`
- `supabase/functions/export-resignation-letter-pdf/`
- `supabase/functions/interview-next-question/`
- `supabase/functions/interview-grade-answer/`
- `supabase/functions/admin-rotate-totp/`

`admin-rotate-totp` is also DELETEd from prod via
`DELETE /v1/projects/<ref>/functions/admin-rotate-totp` after deploy.

## Migrations applied to prod (Management API SQL endpoint)

1. `20260601000000_mobile_device_tokens_and_versions.sql`
2. `20260601100000_interview_audio_bucket.sql`
3. `20260503100000_mobile_interview_tables.sql`
4. `20260503110000_exports_bucket.sql`

All four returned HTTP 201 on 2026-05-03; existence verified via
`select to_regclass(...)` and `select id from storage.buckets`.

## Final deploy outcome (2026-05-03)

- `mobile-api` is **deployed** to prod (`verify_jwt=false`, version 1).
- Final prod function count: **99 / 100** (under the platform ceiling).
- Deletions in prod via `DELETE /v1/projects/<ref>/functions/<slug>`:
  - `admin-rotate-totp` (truly dead)
  - `refresh-ai-test-models` (zero refs in `src/` and `mobile/`,
    deleted to free a slot so the `bulk update` call stops 402-ing
    even when the net deploy adds zero new functions)
- Source-dir + config.toml entries removed from the repo because they
  had never been deployed and re-introducing them would push prod
  over the 100-function limit (mobile does not invoke any of these
  four directly):
  - `send-push`
  - `revenuecat-webhook`
  - `mobile-config`
  - `export-portfolio-pdf`
- Smoke-test coverage list (`scripts/smoke-test-edge-functions.mjs`)
  updated to drop `admin-rotate-totp`.
- Final deploy run on `deploy-edge-functions.yml` completed
  successfully (deploy + jwt enforcement + ai-test smoke +
  check-edge-functions-deployed + smoke-test-edge-functions all
  green).

## Why local `psql $DATABASE_URL` is NOT a valid prod check

The Replit container exposes a stub Postgres at `$DATABASE_URL` that has
no `auth`, no `storage`, no `authenticated` role and none of the prod
tables. Any schema verification against it will mislead. **Always use
the Supabase Management API (`/v1/projects/<ref>/database/query`) for
prod checks.**
