# WiseResume Payments Phase 2D-B.1 — Live-Domain Sandbox Checkout Closeout

**Date:** 2026-08-27

**Verdict:** `LIVE_SANDBOX_CHECKOUT_AND_ULTIMATE_SYNC_VERIFIED_WITH_WARNINGS`

## Scope

This closeout covers the existing non-real Ultimate QA account `6a8ece270002216e92cb` and the existing Paddle Sandbox automatic transaction `txn_01m0yynrv52wtsqcc7p7vgzxhj`. The verified Pro fixture `6a8d5e4c0029004e93c3` was not used or changed. No new user, transaction, payment, entitlement grant, provider configuration change, DNS change, Appwrite schema change, or secret rotation was performed.

## Root cause and implementation

The original generated Paddle transaction link opened the ordinary WiseResume landing page because the default payment-link route did not initialize Paddle.js or handle `_ptxn`. A second symptom was that the local checkout return appeared to sign the user out. The evidence showed a host-scoped session boundary and a hostname classifier that treated a LAN host as a non-application host; a transient Appwrite revalidation failure was also being handled as if it were a real 401.

PR [#220](https://github.com/iammagdy/WiseResume-TWC/pull/220) added the smallest scoped correction. The public landing route mounts a query-gated boundary that accepts only the existing Ultimate transaction, initializes the official Paddle.js SDK in Sandbox mode, and requires both the `test_` client-token format and the explicit `VITE_PADDLE_SANDBOX_CHECKOUT_ENABLED=true` flag on the allowlisted WiseResume hosts. The return URL removes `_ptxn` and uses `billing=pending`; it does not grant a local plan. The existing provider-authoritative refresh remains the source of entitlement state. The Vite CSP allows only the observed Paddle Sandbox script, frame, and API hosts. AuthContext now clears session state only for an explicit Appwrite 401 and preserves it on transient failures.

## Validation

The isolated branch passed focused Vitest coverage with 6 tests, `npm run lint`, `npx tsc --noEmit`, `npm run build`, the no-sourcemap guard, and `git diff --check`. The production build retained only the repository’s existing large-chunk advisory warnings. The PR required checks passed: PR Validation, Security validation, Vercel preview/deployment, and Vercel Preview Comments. TestSprite reported `No tests detected`; this is the known non-required status and was not bypassed or modified.

PR #220 merged normally at merge commit `770591bfcdbcab34ad6914babadcf381554dba7`, which is also the observed `origin/main` SHA. Vercel’s main deployment for commit `770591b` reached the Production deployment list and the live domain served the merged build. The approved Production environment variable names are present in Vercel by name only; no token value is recorded here.

## Provider and application evidence

The live browser route using the same `_ptxn` reached the localized Paddle loading status and returned to `billing=pending` without card entry or payment interaction in this verification sequence. The live authenticated subscription page remained signed in and showed the QA account as **Ultimate**, **Active**, with unlimited resumes and unlimited daily AI credits.

RevenueCat read-only evidence shows customer `6a8ece270002216e92cb` with active Sandbox entitlement `premium`. The Sandbox `PURCHASES_INITIAL_PURCHASE` event maps to the same Paddle transaction, approved Ultimate price, `store=PADDLE`, and entitlement `premium`. The current Sandbox subscription is active, `gives_access=true`, `pending_payment=false`, `auto_renewal_status=will_renew`, and gross revenue is USD 10.

Appwrite read-only evidence shows one `INITIAL_PURCHASE` row for user `6a8ece270002216e92cb` in `revenuecat_event_ledger`, with `processing_status=processed`, `outcome_code=state_updated`, and the recorded received time. The existing Pro ledger row remains separate. This confirms the provider-to-application lifecycle reached Appwrite without touching the Pro fixture.

## Boundaries and warnings

This proves the live **Sandbox** checkout path and the Ultimate provider-to-application synchronization. It does not authorize or verify Production billing. It does not prove cancellation, expiration, billing-issue, duplicate-replay, stale-event, or access-until-expiration transitions for Ultimate. Those remain `UNVERIFIED` unless a safe provider mechanism becomes available.

The previously recorded Paddle Sandbox API-key exposure remains `OWNER_ACCEPTED_UNRESOLVED_RISK` because the owner declined rotation. The client-side Paddle token used for this checkout is intentionally not recorded. No credential-bearing provider configuration was opened or changed during this closeout.

## Git and deployment state

The feature was committed as `dca72dbd` on `feat/phase2db1-live-sandbox-checkout`, pushed, reviewed, and merged through PR #220. The final main merge SHA is `770591bfcdbcab34ad6914babadcf381554dba7`. The live Vercel Production deployment corresponds to main commit `770591b`; browser verification passed for authenticated Arabic subscription rendering and session persistence after the checkout return. The docs update is local in this closeout branch until the normal documentation workflow is completed.

## Exact next action

Keep the Sandbox-only `_ptxn` implementation as the provisional Phase 2D-C starting point. Before any further provider lifecycle mutation or Production billing work, perform a production-readiness review of the live-domain gate, client-token handling, payment UI exposure, and the unresolved Sandbox API-key warning. Do not repeat the Ultimate payment or touch the Pro fixture.
