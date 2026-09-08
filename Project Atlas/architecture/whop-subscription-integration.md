# WiseResume × Whop Subscription Integration

**Date:** 2026-09-08
**Status:** `WHOP_SANDBOX_DEPLOYED_BLOCKED_PUBLIC_WEBHOOK_ENDPOINT`
**Branch:** `feat/whop-payments-integration`

## Scope

Whop is an additive payment provider for the existing WiseResume billing architecture. PayPal remains deployed and frozen as the backup provider with the documented status `PAYPAL_RELEASE_COMPLETE`, `LIVE_SUCCESSFUL_PAYMENT_UNVERIFIED`, `LIVE_PAYMENT_ATTEMPT_DECLINED`, `INTEGRATION_FROZEN_AS_BACKUP`.

The old API-only Whop product `prod_dw34N8qisucou` is not used or modified. The authoritative production checkout product is `prod_WrbEGZdSaG2af` with:

| WiseResume plan | Whop plan | Price |
|---|---|---|
| `pro` | `plan_4JJSQLj5zEKVn` | USD 5 monthly recurring |
| `premium` | `plan_kt5MScAplbCuN` | USD 10 monthly recurring |

## API choice

The implementation uses the current versioned Whop REST API `v1`, not the legacy Checkout Configuration API. The server calls `POST /api/v1/checkout_configurations` and receives a hosted `purchase_url`. Whop checkout metadata is populated with only the canonical Appwrite user ID, WiseResume plan, checkout reference, and environment. No API key or private credential is sent to the browser.

Official references: [Accept payments](https://docs.whop.com/developer/guides/accept-payments), [Checkout configuration](https://docs.whop.com/api-reference/checkout-configurations/checkout-configuration), and [Sandbox](https://docs.whop.com/developer/guides/sandbox).

## Entitlement and webhook design

The browser return URL is UX-only. Membership lifecycle events are the only Whop events that mutate entitlement state. Payment, invoice, refund, and dispute events are recorded in the Whop event ledger without independently granting/revoking access, preventing duplicate mutation when payment and membership events both arrive.

| Event family | Action |
|---|---|
| `membership.activated` | upsert active Whop provider state with authoritative renewal period |
| `membership.cancel_at_period_end_changed` | update `will_renew`; preserve paid-through expiry |
| `membership.deactivated` | mark Whop state expired/deactivated |
| `payment.*`, `invoice.*`, `refund.*`, `dispute.*` | idempotent ledger observation; no independent entitlement grant |

Webhook handling verifies the Standard Webhooks signature against the exact raw body before JSON parsing, enforces a five-minute timestamp tolerance, rejects unknown company/product/plan/user metadata, deduplicates by event ID, and ignores stale lifecycle events. The public endpoint and signing secret still require secure Appwrite configuration; no fake endpoint was created.

## Environment and deployment graph

`BILLING_CHECKOUT_ENVIRONMENT` remains the existing provider-neutral/PayPal checkout setting and is not changed for Whop Sandbox. When the selected checkout provider is Whop, optional `WHOP_CHECKOUT_ENVIRONMENT` selects the Whop API/catalog environment; `WHOP_ACCESS_ENVIRONMENT` independently selects the Whop state environment. `BILLING_ACCESS_ENVIRONMENT` remains the RevenueCat/general provider setting, while `PAYPAL_ACCESS_ENVIRONMENT` remains the PayPal state setting.

The minimum targeted Sandbox deployment is `billing-checkout`, `ai-gateway`, `coupons`, and `whop-webhook`. The shared resolver is packaged into those hubs. `ai-gateway` and `coupons` query `whop_subscription_state`; `billing-checkout` reads it for current-plan safety; `whop-webhook` writes it. PayPal, RevenueCat, and admin hubs do not currently read Whop state in their runtime paths and are not required targets.

The schema workflow runs `scripts/setup_whop_schema.cjs` only when `whop-webhook` is an explicit target, with an explicit existing Appwrite project ID and server-only collection creation. The script has no project-ID fallback. Sandbox state is accepted only for the configured Sandbox QA user, matching canonical user ownership, environment, product, and plan.

## Current runtime boundary

The Whop schema is ready and the targeted `billing-checkout`, `ai-gateway`, `coupons`, and `whop-webhook` functions reached Appwrite `ready` status. No Whop webhook was registered because no public HTTPS route was available: the expected custom hostname did not resolve, while the direct Appwrite API route returned `401` without Appwrite authentication. A real public endpoint is required before Whop can deliver signed events.

## Sandbox boundary

Local contract tests pass and the Sandbox API/catalog was authenticated non-mutatingly. Sandbox state uses the existing Appwrite project with explicit environment and QA-user gates; Production plan IDs are rejected in Sandbox mode. Sandbox uses `https://sandbox-api.whop.com/api/v1` and `https://sandbox.whop.com`; the current Whop documentation says Sandbox supports card payments only, so alternative methods shown in a browser must not be treated as verified Production support.

The webhook implementation now accepts the current `account_id` envelope field and resolves company, product, and plan IDs from environment-specific Whop catalog variables. Event names remain current dot notation (`payment.succeeded`, `membership.activated`, and so on). The manual verifier follows Standard Webhooks with the exact raw body, HMAC-SHA256, constant-time comparison, and five-minute timestamp replay protection.

## Required owner actions before release

1. Provide a public HTTPS Sandbox webhook endpoint, create one Sandbox webhook with the required dot-notation events, and store its signing secret outside the repository.
2. Run the signed Sandbox lifecycle matrix, then separately configure Production credentials and webhook only after review.
3. Update legal/payment copy that still references the frozen PayPal/Paddle history before enabling Whop for customers.

No Production Whop change, Vercel change, production webhook, or real payment was performed in this pass.
