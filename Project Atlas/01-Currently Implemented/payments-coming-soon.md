# Payments Coming Soon

**Last updated:** 2026-05-27
**Status:** current

WiseResume currently has no active online payment provider.

## Current Behavior

- Web and mobile billing surfaces remain visible.
- Upgrade, subscribe, restore, checkout, and manage-payment actions are disabled.
- User-facing payment actions are labeled Coming Soon.
- `src/lib/billing.ts` exposes the temporary provider-neutral billing state:
  - `paymentStatus: "coming_soon"`
  - `paymentsEnabled: false`
  - `availablePaymentMethods: []`

## Premium Access

Premium access is still controlled by existing internal plan data from the app backend, including the `subscriptions` document read through existing hooks such as `useMe` and `usePlan`.

Default users remain free. Premium-only feature gates must stay in place.

## Removed Integration

The previous payment provider SDKs, webhook hub, deploy helper, environment variables, and purchase/restore/customer-info flows were removed on 2026-05-27.

No replacement provider is implemented yet. Do not add Paymob, Fawry, Fawaterak, Stripe, manual transfer, or fake checkout behavior until a separate payment-provider task is accepted.

## Deployment Notes

The following provider-specific variables are no longer referenced by code and can be removed from hosting/function/mobile build environments after deployment verification:

- Former web billing API key
- Former mobile iOS billing API key
- Former mobile Android billing API key
- Former payment webhook secret
