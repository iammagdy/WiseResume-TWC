# Whop Local Validation — 2026-09-08

## Verdict

`OWNER_ACTION_REQUIRED_WISERESUME_SANDBOX_RUNTIME` — Whop's official Sandbox Test delivery passed signature validation, but the authenticated WiseResume subscription flow still selects PayPal, so no real Whop checkout can be started safely.

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
- Whop-generated Test delivery after the literal-secret fix: HTTP `400`, sanitized response `company_mismatch`, `mutated:false`. This proves provider transport and signature verification, but is not a real membership/payment lifecycle event.
- Correct current Whop contract: the complete `ws_...` secret is the literal UTF-8 HMAC key; no prefix stripping, hex decoding, or Base64 decoding is performed.
- The previous locally signed malformed-body probe was self-consistency evidence only because it used the old incorrect key derivation.

## Not verified

No real or Sandbox payment, browser buyer checkout through WiseResume, payout setup, or Production Whop activation was performed. The provider-generated test delivery was authentic transport/signature evidence, but its synthetic payload did not represent a real lifecycle event. Sandbox QA and API secrets remain in protected server-side paths.

## Blocking evidence

- `WHOP_SANDBOX_QA_USER_ID` is configured through the protected server-side deployment path and is not printed here.
- Whop webhook exists and is configured; the official Sandbox Test delivery now passes the signature boundary and is rejected safely for synthetic `company_mismatch`.
- WiseResume browser QA reached the subscription page, but the upgrade modal offered `Continue to PayPal`; no Whop checkout was created or paid.
- A real Whop E2E requires an isolated QA runtime/provider selection. Changing the global Production provider was intentionally not attempted.
- The direct Appwrite API route remains authenticated and is not the external Whop target; the verified custom domain is used instead.
- The existing schema workflow targeted the current Appwrite project explicitly; the two Whop collections were provisioned in the authorized Sandbox-gated deployment. No additional schema mutation was performed during this transport recheck.
