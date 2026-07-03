# Portfolio Password Persistence — Implementation Report

**Date:** 2026-06-23
**Branch:** `fix/portfolio-password-persistence`
**PR:** #108 (against `main`)
**Type:** follow-up to PR #107 (portfolio repair). Makes password-protected portfolios actually work in production while keeping `portfolio_settings` server-only.

---

## Problem
During PR #107 owner verification, portfolio password protection was found **non-functional in production**:
- `portfolio_settings` is correctly **server-only** (collection `$permissions=[]`, `documentSecurity=false`) — but it was **missing the `password_enabled` and `password_hash` attributes** (only `user_id` existed across all 21 docs).
- The editor tried to **read/write password settings directly from the browser**, which cannot work against a server-only collection — the writes silently failed.
- **Opening client read/write would be unsafe**: it would expose the bcrypt hash to the browser and (documentSecurity off) let any user write any user's settings.

## Solution
- **New server-side hub `portfolio-settings`** (`appwrite-hubs/portfolio-settings`): owner-authenticated via Appwrite **JWT**; the `user_id` is resolved server-side via `Account.get()` and a **browser-supplied `user_id` is never trusted**. Actions: `status` (returns `{passwordEnabled, hasPassword}` — no hash), `enable` (validates length 8–256, hashes with **bcrypt cost 12** = the format the gate verifies; reuses the existing hash when toggling on without a new password), `disable` (clears the hash to `null`). Writes with the API key; the **response never includes a hash**; logs only `action -> status`.
- **Idempotent schema script** `scripts/setup_portfolio_settings_schema.cjs` (+ wired into `deploy_hubs.cjs` so a narrow `--only=portfolio-settings` deploy applies it inline, matching the `ai_credits`/`jobs` precedent). It only ensures attributes and **never changes collection permissions**.
- **Editor rewired** (`PortfolioEditorPage.tsx`): no longer reads/writes `portfolio_settings` directly (client `bcrypt` removed); calls `appwriteFunctions.invoke('portfolio-settings', …)` (JWT auto-attached). UX preserved.
- **`portfolio_settings` stays server-only**; the **hash is never exposed to the browser**.
- Gate functions (`get-public-portfolio`, `verify-portfolio-password`, `portfolio-gate`) unchanged — they already read `password_enabled` + `password_hash` server-side.

## Schema changes
On `portfolio_settings` (idempotent, backward-compatible):
| Attribute | Type | Required | Default |
|---|---|---|---|
| `password_enabled` | Boolean | No | `false` |
| `password_hash` | String (size 256) | No | none (null/absent until set) |

No permission change; existing docs stay valid (read disabled until a password is set).

## Function / hub changes
- New `portfolio-settings` hub; registered in `appwrite.json`, `scripts/deploy_hubs.cjs` (registry + env-var sync + inline schema ensure), `scripts/compute-source-hashes.mjs`; source-hash manifest regenerated.
- `execute=["any"]` with internal JWT guard. Env: `APPWRITE_API_KEY`/`APPWRITE_ENDPOINT`/`APPWRITE_PROJECT_ID`.

## Frontend changes
`src/pages/PortfolioEditorPage.tsx`: removed direct `portfolio_settings` read/write + client `bcrypt`; calls the new function; preserved enable/disable toggle, "password is set" indicator, and clear success/error toasts.

## Validation results
- `npx tsc --noEmit` PASS · `npm run build` PASS
- `node --check appwrite-hubs/portfolio-settings/src/main.js` PASS · `node --check scripts/deploy_hubs.cjs` PASS
- `node tests/hubs/portfolio-settings.test.cjs` PASS (unauthorized→401; enable; disable; weak-password; reuse-existing; status; **no hash in response**; **body `user_id` never trusted**)
- `MoreTab` + `usePublicPortfolio` 32/32 PASS · source hashes regenerated · `git diff --check` clean

## Deployment plan
- **Changed deploy target:** `portfolio-settings` only (gate hubs unchanged). **Never `target=all`.**
- A narrow `--only=portfolio-settings` deploy (official `Deploy Appwrite Hubs` workflow, dispatched on the branch ref) runs, in order: env-var sync → **inline `setup_portfolio_settings_schema.cjs`** (with the deploy `APPWRITE_API_KEY`) → function deploy. So schema + function land together via approved CI credentials.
- The temporary read-only verification key is **never** used for schema/deploy.

## ⚠️ Production schema mutation warning
The deploy applies a **production schema change** to `portfolio_settings` (adds two attributes). It is idempotent and backward-compatible and does **not** alter permissions, but it is a real production mutation — gated on owner approval. Verify after: both attributes exist, permissions still empty (server-only), documentSecurity unchanged, existing docs valid.

## Manual QA checklist (post-deploy / post-merge)
- Owner: enable password in editor → save succeeds; UI shows enabled; no hash in any frontend response.
- Visitor (incognito): `/p/:username` shows the gate; wrong password rejected; correct password unlocks; after disable, portfolio opens again.
- Function: `status` returns only `{passwordEnabled, hasPassword}` (no `password_hash`).
- Regression: public portfolio loads; contact form path alive; analytics endpoint OK; portfolio chat works.

## Final status
`READY_FOR_REVIEW` → executing the approved schema-apply + narrow deploy + merge + production QA sequence. `portfolio_settings` remains server-only; no client permissions opened; hash never returned to the browser.
