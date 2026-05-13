# Session Log - 2026-05-14 - DevKit Operations Hub Auth/Deploy Stabilization

## Root cause

DevKit login itself issues a signed session token through `admin-devkit-data`, but several DevKit panels still depended on standalone Appwrite Functions and live deployment artifacts that were not consistently rebuilt or redeployed. The affected path was visible as `Unauthorized` in panels such as Email Automations, Portfolios, and Visitors.

The local standalone function sources already support signed DevKit tokens, so the practical production risk was deployment drift: stale root tarballs and a workflow that only rebuilt a subset of hubs before running `scripts/deploy_hubs.cjs`.

## What changed

- `EmailAutomationsPanel`, `PortfolioUsernamesPanel`, `VisitorsPanel`, `TestmailInboxPanel`, and the Mission Control live-visitors fetch now use the shared DevKit client path for the affected standalone admin functions.
- DevKit sidebar was simplified into an Operations Hub shape:
  - Growth & Traffic combines Visitors, Analytics, and Onboarding Funnel.
  - Email combines Send, Automations, and Testmail Inbox.
  - Old deep links for `visitors`, `analytics`, `onboarding-funnel`, and `email-automations` now route to the merged panels.
- `.github/workflows/deploy-appwrite-hubs.yml` now rebuilds every deployed hub from source and verifies `src/main.js` exists at archive root before deployment.
- `scripts/deploy_hubs.cjs` now deploys the missing admin hubs:
  - `admin-visitor-analytics`
  - `admin-onboarding-funnel`
  - `admin-impersonate`
- The deploy script now syncs shared admin variables across all admin hubs when GitHub secrets are present:
  - `DEVKIT_PASSWORD`
  - `APPWRITE_API_KEY`
  - `APPWRITE_ENDPOINT`
  - `APPWRITE_PROJECT_ID`
- The deploy script now syncs email variables to email-related hubs:
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL`
  - `RESEND_FROM_NAME`
- The deploy script now runs safe read-only smoke executions after deploy when `DEVKIT_PASSWORD` is available.

## Verification

- `npm exec tsc -- --noEmit` passed.
- `git diff --check` passed.
- Local browser reached `/devkit`, but the DevKit session was locked and local environment had no `DEVKIT_PASSWORD`, so full in-browser tab-by-tab E2E is blocked until the DevKit password is provided or a session is unlocked.

## Current state

The local code is ready for a Deploy AI Hubs workflow run. The workflow must be run with these GitHub secrets present:
- `APPWRITE_API_KEY`
- `DEVKIT_PASSWORD`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_FROM_NAME`
- AI provider keys as already used by the hub deploy workflow

## Where we stopped

Next agent should:
1. Run the updated Deploy AI Hubs workflow or deploy the rebuilt hub artifacts manually.
2. Unlock `/devkit` locally with the DevKit password.
3. Run tab-by-tab E2E for Growth & Traffic, Email, Portfolios, Feature Control, Moderation, God Mode, AI Center, Coupons, Audit, WiseHire Waitlist, and Smoke Runner.
4. Confirm no panel shows unexplained `Unauthorized`.
