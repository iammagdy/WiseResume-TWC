# Public Portfolio Cold-Start Warmup

**Date:** 2026-06-23
**Branch:** `fix/portfolio-warmup`
**Type:** performance — eliminates the multi-minute skeleton on the public visitor path.

## Problem
Visitors to a public portfolio (`/p/:username`) saw the loading skeleton for ~3 minutes
before content appeared. The page shows the skeleton purely while two React Query calls
are pending (`isLoading = gateLoading || contentLoading`) — fonts/images don't factor in.

**Root cause: Appwrite function cold starts.** Diagnosis (read-only, live):
- Every real `get-public-portfolio` / `portfolio-gate` execution completed in **0.12–1.5s**
  server-side (logged `duration`), all `200`/`401`. One execution per page load — no retry storm.
- Replaying the exact browser request warm: **315–1168 ms** end-to-end.
- Repeated loads are all fast; only the **first load after the function idles** is slow.
- The synchronous execution keeps the client's request open while Appwrite spins up a cold
  container; that wait is **not** counted in `duration`, so logs look fast while the visitor waits.

Not caused by the schema fix — it was latent and only became visible once publishing worked.
(0 of 24 functions used a native schedule, so nothing was keeping them warm.)

## Why native Appwrite CRON (not GitHub Actions)
- A GitHub Actions `*/5` cron = ~288 billed jobs/day (~8,640 min/month) — far over the
  free Actions tier for a private repo.
- Appwrite's native function CRON directly warms the exact container, costs only cheap
  executions (~576/day across both functions), and is the documented, reliable tool.

## Solution (smallest safe)
1. **Warmup early-return** in `get-public-portfolio` and `portfolio-gate`: a side-effect-free
   path returning `{ ok: true, warm: true }` **before** `getDatabases()` / any query. Triggered by:
   - a native schedule trigger (`x-appwrite-trigger: schedule`), or
   - an explicit `{ "action": "warmup" }` body (for manual/external pings).
   It can never match a real visitor request (those are http-triggered and carry a `username`),
   and both functions already early-return on missing `username` before any DB access — so even
   a bare scheduled ping is side-effect-free. No DB reads/writes, analytics, rate-limit, session,
   email, chat, credits, or view tracking. No secrets exposed (response is two booleans).
2. **Native CRON `*/5 * * * *`** on both functions, configured in `scripts/deploy_hubs.cjs`
   via the new `HUB_SCHEDULES` map (applied by `desiredFunctionSettings`, compared in
   `settingsNeedUpdate`). Version-controlled and idempotent.

## Where the schedule lives / how to disable
- **Configured:** `scripts/deploy_hubs.cjs` → `HUB_SCHEDULES` (the two function ids → `'*/5 * * * *'`).
- **Disable:** set the entry(ies) to `''` and redeploy with a narrow target
  (`--only=get-public-portfolio,portfolio-gate`). The deploy detects the change and clears the
  CRON. (You can also clear the schedule in the Appwrite Console per function.)

## Files changed
- `appwrite-hubs/get-public-portfolio/src/main.js` — `isWarmupRequest` + early-return.
- `appwrite-hubs/portfolio-gate/src/main.js` — `isWarmupRequest` + early-return.
- `scripts/deploy_hubs.cjs` — `HUB_SCHEDULES`, schedule wired into desired settings + change detection.
- `src/lib/devkit/sourceHashes.generated.json` — regenerated (only the two hubs changed).
- Docs: this report + CHANGELOG + handover.

## Validation
- `node --check` on both functions + `deploy_hubs.cjs`: PASS.
- `compute-source-hashes.mjs` regenerated; only `get-public-portfolio` + `portfolio-gate` hashes changed.
- No frontend/shared TS change → tsc/build not required.
- Post-deploy (live): warmup returns `{ ok: true, warm: true }`; normal portfolio still loads;
  password-disabled portfolio loads; schedule confirmed set; no analytics/rate-limit/write side effects.

## Deploy
- Official workflow `Deploy Appwrite Hubs`, narrow target `get-public-portfolio,portfolio-gate`.
- NOT `target=all`.

## Status
`READY_FOR_REVIEW` → (after deploy + verification) `WARMUP_DEPLOYED_SUCCESSFULLY`.
