# Whop Local Validation — 2026-09-08

## Verdict

`WHOP_WEBHOOK_SIGNATURE_FAILURE` — public transport and secret injection pass, but Whop's official Sandbox Test delivery still receives `401 unauthorized` from the deployed verifier.

## Evidence

- Current Whop REST checkout contract test passed: server-side authoritative plan mapping, metadata, recurring checkout configuration, and promo-code flag.
- Standard Webhooks contract test passed: valid signature accepted; tampered and stale signatures rejected; unknown company/plan rejected.
- Resolver tests passed: Whop state resolves to `pro`, higher-provider conflicts retain rank behavior, expired/unknown/wrong-environment state fails closed.
- Existing billing, coupon, resolver, AI-plan, deployment-policy, and PayPal regression tests passed in the focused run after the Whop changes.
- `npm run build` passed previously in this workstream; final validation must be rerun after the last source changes.
- Current full local validation: `npx tsc --noEmit` passed; `npm run test:i18n` passed; `npm test` passed with 237 files (238 total, 1 skipped), 1,382 tests passed and 1 todo; `npm run build` passed with 5,895 modules transformed and no sourcemaps.
- Current Whop webhook contract uses dot-notation events and accepts the current `account_id` envelope field. Sandbox catalog resolution is environment-specific rather than Production-hardcoded.
- Correct Sandbox key path was read in memory only; authenticated catalog reads returned HTTP 200 (`SANDBOX_API_AUTH_PASS`). No key value was printed, logged, or persisted in the repository.
- Environment isolation was hardened: Whop checkout may use `WHOP_CHECKOUT_ENVIRONMENT`, Whop entitlement uses `WHOP_ACCESS_ENVIRONMENT`, while `BILLING_CHECKOUT_ENVIRONMENT`, `BILLING_ACCESS_ENVIRONMENT`, and `PAYPAL_ACCESS_ENVIRONMENT` retain their existing provider contracts.
- Minimum runtime targets are `billing-checkout`, `ai-gateway`, `coupons`, and `whop-webhook`; the schema step is conditional on explicit `whop-webhook` selection.
- Targeted deployment run completed: Whop schema ready; all four selected functions reached `ready`. No PayPal, RevenueCat, admin, or unrelated hub was deployed.
- Public transport pass: DNS resolves through public resolvers, and a POST using DNS override reached Appwrite with an execution ID.
- Signed verifier probe pass: a locally signed malformed body returned `400 malformed_body`, proving the deployed function accepted the signature and rejected only the invalid JSON.
- Whop-generated Test delivery: failed with `401 unauthorized` after the `ws_` hex-secret compatibility fix; authentic provider signature compatibility is not yet proven.

## Not verified

No real or Sandbox payment, browser buyer checkout through WiseResume, successful authentic provider delivery, payout setup, or Production Whop activation was performed. Sandbox QA and API secrets remain in protected server-side paths.

## Blocking evidence

- `WHOP_SANDBOX_QA_USER_ID` is configured through the protected server-side deployment path and is not printed here.
- Whop webhook exists and is configured, but its official Sandbox Test delivery returns `401 unauthorized`; provider signature compatibility remains blocked.
- The direct Appwrite API route is authenticated and returned HTTP 401, so it is not a valid external Whop webhook target.
- The existing schema workflow targeted the current Appwrite project explicitly; the two Whop collections were provisioned in the authorized Sandbox-gated deployment. No additional schema mutation was performed during this transport recheck.
