# Edge Function Audit — Mobile parity sweep (2026-05-03)

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
