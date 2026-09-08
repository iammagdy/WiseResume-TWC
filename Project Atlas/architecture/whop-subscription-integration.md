# WiseResume × Whop Subscription Integration

**Date:** 2026-09-08
**Status:** `IMPLEMENTED_UNVERIFIED` (local recurring-only/provider-choice finalization; Sandbox lifecycle still pending)
**Branch:** `feat/whop-payments-integration`

## Scope

The current customer model is recurring-only: Whop is the default provider and PayPal is an explicit alternative. One-time purchase creation is rejected by the public billing request validator, while historical PayPal one-time lifecycle code remains intact for existing records.

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

The deployment workflow exposes `whop_environment=sandbox|production` and maps it only to `WHOP_ACCESS_ENVIRONMENT`, `WHOP_CHECKOUT_ENVIRONMENT`, and the matching Whop credential. `BILLING_CHECKOUT_ENVIRONMENT` is intentionally not set by Whop deployment, so the provider-neutral/PayPal environment is not globally switched.

`BILLING_CHECKOUT_ENVIRONMENT` remains the existing provider-neutral/PayPal checkout setting and is not changed for Whop Sandbox. When the selected checkout provider is Whop, optional `WHOP_CHECKOUT_ENVIRONMENT` selects the Whop API/catalog environment; `WHOP_ACCESS_ENVIRONMENT` independently selects the Whop state environment. `BILLING_ACCESS_ENVIRONMENT` remains the RevenueCat/general provider setting, while `PAYPAL_ACCESS_ENVIRONMENT` remains the PayPal state setting.

The minimum targeted Sandbox deployment is `billing-checkout`, `ai-gateway`, `coupons`, and `whop-webhook`. The shared resolver is packaged into those hubs. `ai-gateway` and `coupons` query `whop_subscription_state`; `billing-checkout` reads it for current-plan safety; `whop-webhook` writes it. PayPal, RevenueCat, and admin hubs do not currently read Whop state in their runtime paths and are not required targets.

The schema workflow runs `scripts/setup_whop_schema.cjs` only when `whop-webhook` is an explicit target, with an explicit existing Appwrite project ID and server-only collection creation. The script has no project-ID fallback. Sandbox state is accepted only for the configured Sandbox QA user, matching canonical user ownership, environment, product, and plan.

## Current runtime boundary

The Whop schema is ready and the targeted `billing-checkout`, `ai-gateway`, `coupons`, and `whop-webhook` functions reached Appwrite `ready` status. The owner reports that `whop-webhook.wiseresume.app` is verified in Appwrite, but a live HTTPS POST probe from the execution environment returned DNS error `No such host is known`. No Whop webhook was registered and no signing secret or payment was created. A publicly resolvable endpoint is required before Whop can deliver signed events.

## Sandbox boundary

Local contract tests pass and the Sandbox API/catalog was authenticated non-mutatingly. Sandbox state uses the existing Appwrite project with explicit environment and QA-user gates; Production plan IDs are rejected in Sandbox mode. Sandbox uses `https://sandbox-api.whop.com/api/v1` and `https://sandbox.whop.com`; the current Whop documentation says Sandbox supports card payments only, so alternative methods shown in a browser must not be treated as verified Production support.

The webhook implementation now accepts the current `account_id` envelope field and resolves company, product, and plan IDs from environment-specific Whop catalog variables. Event names remain current dot notation (`payment.succeeded`, `membership.activated`, and so on). The manual verifier follows Standard Webhooks with the exact raw body, HMAC-SHA256, constant-time comparison, and five-minute timestamp replay protection.

## Current provider evidence

The public endpoint and Appwrite execute policy work. After the verifier fix, Whop's official Sandbox Test action reached the deployed function and returned `400 company_mismatch` with `mutated:false`. This is the expected safe rejection for Whop's synthetic test payload and proves the provider-generated signature passed verification and processing reached the company/catalog boundary. No payment E2E is claimed yet.

Whop's current `ws_` secret is used verbatim as UTF-8 HMAC key bytes. The signed message is `{webhook-id}.{webhook-timestamp}.{raw body}` with HMAC-SHA256 and a Base64 `v1,` signature. The earlier local malformed-body probe was only self-consistency evidence because it used the incorrect hex-suffix derivation; it was not provider compatibility proof. The verifier now rejects unsupported secret formats rather than guessing.

The authenticated WiseResume subscription flow was opened for QA verification. Its upgrade modal selected PayPal and displayed `Continue to PayPal`, so no server-created Whop checkout was initiated. This is a runtime provider-selection blocker, not a Whop webhook or catalog failure. A QA-only runtime path must select Whop Sandbox before real Pro/Ultimate lifecycle evidence can be collected.

## Required owner actions before release

1. Provision or expose an explicitly isolated WiseResume QA runtime that selects Whop Sandbox for the authorized QA user, without changing the global Production billing provider.
2. Separately configure Production credentials and webhook only after review; no Production activation is implied by this Sandbox result.
3. Update legal/payment copy that still references the frozen PayPal/Paddle history before enabling Whop for customers.

No Production Whop change, Vercel change, production webhook, or real payment was performed in this pass.
