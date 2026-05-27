# Remaining Unknowns And Residual Risk

Date: 2026-05-26

## Live Configuration Unknowns

- Appwrite Console collection attributes and permissions were not exported live during this fix pass.
- Vercel production project settings were not read or changed live.
- legacy payment provider dashboard webhook settings were not read or changed live.
- Resend domain/authentication and delivery dashboards were not read live.
- Sentry production issue state was not read live.

## Residual Technical Risks

- AI credit updates use Appwrite document reads/updates, not an atomic SQL transaction. Concurrent requests can race and may briefly exceed limits.
- Server-side rate limiting is a warm-instance in-memory throttle. It blocks direct client bypass on a running function instance but is not globally shared across all Appwrite instances or cold starts.
- The full repo lint gate remains red due to pre-existing unrelated issues. Changed-file lint passed.
- The legacy payment provider webhook ESM package metadata warning remains in local Node tests because its local package does not declare `"type": "module"`.
- Production verification still requires a real deployment or preview deployment plus Appwrite/Vercel/legacy payment provider/Resend/Sentry console checks.

## Required Follow-Up Before Real Launch

- Verify Appwrite `ai_credits`, `subscriptions`, and `ai_routing_config` schemas in production.
- Verify Appwrite execute permissions match the policy in `appwrite-schema-permissions.md`.
- Run the production smoke test checklist after deployment.
- Confirm AI provider dashboards show no calls for unauthenticated or credit-blocked attempts.
- Decide whether to replace warm-instance AI rate limiting with a shared Appwrite-backed or external atomic rate-limit store.
- Decide whether to add `"type": "module"` to ESM Appwrite function packages in a separate cleanup pass.

