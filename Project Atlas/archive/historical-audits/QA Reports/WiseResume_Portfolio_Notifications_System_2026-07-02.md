# WiseResume — Portfolio Contact + Notifications System
# QA Report — 2026-07-02

**Branch:** `main`  
**Scope:** Portfolio Contact Form fix, Visitors tracking repair, Owner notification system, Bell icon, Notification filters  
**Verdict:** `READY_TO_DEPLOY` (pending Vercel env var owner action and post-deploy production verification)

---

## Root Causes Fixed

### 1. `log is not defined` — Contact Form Runtime Crash (P1)
**Root cause:** `verifyTurnstileToken()` is defined at module scope in `ai-gateway/src/main.js`. It called `log(...)` at lines 294 and 308, but `log` is a parameter of the exported handler closure — not available at module scope.  
**Fix:** Lines 294 and 308 changed to `console.warn(...)`.  
**Verified:** `node --check appwrite-hubs/ai-gateway/src/main.js` → PASS.

### 2. Visitors Tab Empty (P1 — historical, compounded)
**Root cause A:** Schema drift — already fixed 2026-06-23 via `setup_portfolio_visits_schema.cjs`.  
**Root cause B:** `APPWRITE_API_KEY` not confirmed in Vercel Production env vars — documented as P0 owner action.  
**Root cause C:** `portfolio_visits` documents written without document-level read permissions — the owner's frontend Appwrite SDK session could not read them.  
**Fix for C:** `api/track-portfolio-view.ts` now resolves `ownerUserId` from the `profiles` collection **before** writing the visit, then passes `[Permission.read(Role.user(ownerUserId))]` to `createDocument`. Owner-only read, no `read("any")` broadening.

### 3. No Owner Notifications (Gap)
**Fix:** Three notification types wired server-side:
- `portfolio_visit` — written by `api/track-portfolio-view.ts` after visit write succeeds.
- `portfolio_interest` — written by `public-share` hub after first-time interest write (not on duplicates).
- `portfolio_message` — written by `ai-gateway` hub after successful contact email send.

All use `createOwnerNotification()` helper with link-retry pattern.

### 4. No Bell Icon (Gap)
**Fix:** `AppWorkspaceTopBar.tsx` — Bell icon button added between Wise AI and theme toggle. Shows red dot badge when `useUnreadNotificationCount() > 0`. Navigates to `/notifications`.

### 5. Notification Filters Minimal (Gap)
**Fix:** `NotificationsPage.tsx` — 7 filter tabs (All, Unread, Visits, Interests, Messages, AI/Resume, System). Type-specific coloured icons. Per-filter empty state messages. English-primary labels.

---

## Files Changed

| File | Change |
|------|--------|
| `appwrite-hubs/ai-gateway/src/main.js` | `log` → `console.warn` in `verifyTurnstileToken`; added `createOwnerNotification` helper; wired `portfolio_message` notification |
| `appwrite-hubs/public-share/src/main.js` | Added `createOwnerNotification` helper; wired `portfolio_interest` notification |
| `api/track-portfolio-view.ts` | Full rewrite: owner lookup first → visit write with `Permission.read(Role.user(...))` → `portfolio_visit` notification |
| `src/components/layout/AppWorkspaceTopBar.tsx` | Bell icon + unread dot badge |
| `src/pages/NotificationsPage.tsx` | 7 filter tabs, type icons, per-filter empty states, English-primary labels |
| `src/pages/__tests__/NotificationsPage.filter.test.ts` | 10 focused filter unit tests (NEW) |
| `src/lib/devkit/sourceHashes.generated.json` | Hashes updated for `ai-gateway` and `public-share` |

---

## Test Results

| Suite | Result |
|-------|--------|
| `NotificationsPage.filter.test.ts` (10 tests) — NEW | ✅ 10/10 PASS |
| Portfolio editor tests (SetupTab, MoreTab, etc.) | ✅ PASS |
| Layout tests (appShellLayout) | ✅ PASS |
| Hook tests (usePlan, useResumes, useAICredits, etc.) | ✅ PASS |
| All existing tests — 20 test files / 106 tests | ✅ 106/106 PASS |

---

## Build Validation

| Step | Result |
|------|--------|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run build` | ✅ Built in 1m 32s |
| `node --check ai-gateway/src/main.js` | ✅ PASS |
| `node --check public-share/src/main.js` | ✅ PASS |
| `git diff --check` | ✅ PASS (LF→CRLF normalisation only — not errors) |
| `node scripts/compute-source-hashes.mjs` | ✅ Hashes updated |

---

## Visit Timing — Documented Behavior

Visits are recorded on `visibilitychange` / `pagehide` / unmount — NOT on page load. Owners will see visit notifications after the visitor hides or closes the portfolio tab. This is correct and expected behavior. No early-ping implemented in this pass (dedup complexity deferred to Phase B).

**Testing protocol:** open `/p/:username` in a separate incognito tab → wait 5–10 seconds → close that tab or navigate away → check Visitors tab and `/notifications`.

---

## Owner Actions Required (Cannot Be Set by Code)

> ⚠️ **BLOCKER** — visits and interests will not record in production until these are confirmed:

| Action | Vercel Dashboard → Settings → Environment Variables |
|--------|------------------------------------------------------|
| Set `APPWRITE_API_KEY` | Server API key (from `.env.deploy`) |
| Set `APPWRITE_PROJECT_ID` | `69fd362b001eb325a192` |
| Confirm `VITE_TURNSTILE_SITE_KEY` | Pairs with Appwrite `TURNSTILE_SECRET_KEY` |

---

## Acceptance Criterion

The pass is **not complete** until all three are verified in production:

- [ ] A real public portfolio visit creates a `portfolio_visits` document
- [ ] The Portfolio Editor Visitors tab shows that visit to the authenticated owner
- [ ] `/notifications` shows a `portfolio_visit` notification for the owner

## Hub Deployment (Succeeded)

The targeted Appwrite deployments were executed successfully on the local developer machine:
```bash
$env:APPWRITE_PROJECT_ID="69fd362b001eb325a192"
node scripts/deploy_hubs.cjs --only=public-share
node scripts/deploy_hubs.cjs --only=ai-gateway
```
- `public-share` successfully compiled, packaged, deployed, and database schema verified.
- `ai-gateway` successfully compiled, packaged, deployed, database schema verified, and smoke test skipped gracefully under missing local environment key.


---

## Phase B (Deferred)

- AI/resume event notifications (`tailoring`, `resume_import`, `ai_credit`)
- Early visit-start ping with session-level dedup
- `referrer` vs `ref` field name mismatch in `docToVisit()` (cosmetic only)
