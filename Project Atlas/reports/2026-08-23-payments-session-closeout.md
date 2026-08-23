# WiseResume Payments — Full Session Closeout and Handover

**Date:** 2026-08-23
**Author:** Manus AI
**Status:** `PAYMENTS_SESSION_CLOSED_SSL_PENDING`
**Scope:** Documentation-only closeout. No product-code, Appwrite, DNS, RevenueCat, Paddle, secret, checkout, or Production payment changes were made while closing this session.

## 1. Verdict

The WiseResume Payments session is closed at the custom-domain SSL gate. The Payments Phase 1 implementation is merged, the Phase 2A additive Appwrite schema is live and verified, the coupon-schema compatibility blocker is resolved, and the explicitly targeted Phase 2B Appwrite Function deployment completed successfully. The RevenueCat webhook transport is not yet activated because the custom Appwrite domain remains unusable under strict TLS: the certificate presented for `revenuecat-webhook.wiseresume.app` is the Fastly default certificate for `t.sni-820-default.ssl.fastly.net`, and an insecure routing diagnostic returns HTTP `421`.

The current operational stop point is therefore:

> `APPWRITE_CUSTOM_DOMAIN_SSL_PENDING`

No RevenueCat Sandbox webhook was created, no lifecycle event was sent, no dedicated test fixture was mutated, and frontend checkout remains disabled.

## 2. Current repository state

The closeout worktree was created from the freshly fetched authoritative branch. The repository state before documentation edits was clean and current:

| Check | Result |
|---|---|
| Working branch | `docs/payments-session-closeout` |
| Working tree before closeout edits | Clean |
| `HEAD` before closeout edits | `8e9476fbc9a58118fc13b5eec80505a0ca97d1f3` |
| `origin/main` at verification | `8e9476fbc9a58118fc13b5eec80505a0ca97d1f3` |
| Current main commit | `fix(deploy): stage local dependencies inside archives (#209)` |
| Documentation-only change policy | Product code and deployment configuration were not edited in this closeout |

The existing checkout `docs/coupon-schema-merge-closeout` was also clean at `0812746f0c45223e5625fc155e8ba39079085be0`. It was not overwritten or reused for the closeout edits.

## 3. Commercial plan model

WiseResume’s public plan model is **Free**, **Pro**, and **Ultimate**. The public label Ultimate remains display-only for the internal `premium` plan key. Internal storage and resolver values remain `free`, `pro`, and `premium`; RevenueCat entitlement identifiers remain `pro` and `premium`.

| Public plan | Price | Internal key | RevenueCat entitlement | AI limit |
|---|---:|---|---|---:|
| Free | $0/month | `free` | None | 5/day |
| Pro | $5/month | `pro` | `pro` | 50/day |
| Ultimate | $10/month | `premium` | `premium` | Existing unlimited premium behavior |

The current effective-plan ranking remains `free < pro < premium`. Provider state must not blindly overwrite stronger valid manual/admin, coupon, or trial access.

## 4. Paddle Sandbox catalog

The approved and previously verified Paddle Sandbox catalog contains exactly the two monthly recurring paid products below. These are Sandbox identifiers, not credentials.

| Product | Product ID | Price ID | Amount | Interval | Type |
|---|---|---|---:|---|---|
| WiseResume Pro | `pro_01m0fn08h7tmzm5cphvcvd30g6` | `pri_01m0fnjspex6yqqf6w9v9apaxg` | $5 USD | Monthly | Recurring subscription |
| WiseResume Ultimate | `pro_01m0fnm7000501f67z1bmhzaff` | `pri_01m0fnq9hetwdwm9e1sa49n08s` | $10 USD | Monthly | Recurring subscription |

The approved launch model includes no annual, lifetime, trial, coupon, discount, add-on, country-specific, or additional paid product.

## 5. RevenueCat Sandbox provider state

The RevenueCat project reused for WiseResume is `TheWiseCloud`. Existing Atlas evidence records an existing Web Billing configuration and a Sandbox Paddle app with the two imported Paddle products mapped to the preserved entitlements `pro` and `premium`; the default offering was recorded with the approved monthly packages, and the existing Stripe/Web Billing configuration was preserved. No Production payment activation was recorded.

The current provider dashboard was not re-queried after the credential-exposure security stop. Accordingly, the following current-state items are not independently re-verified in this closeout and must be treated as `UNVERIFIED`: whether all offering/package details remain unchanged, whether the prior unexplained legacy webhook remains deleted, and whether any provider-side state changed after the last safe inspection. No new RevenueCat webhook was created during this session.

| Provider item | Closeout status |
|---|---|
| RevenueCat project `TheWiseCloud` | Previously verified; current recheck `UNVERIFIED` after security stop |
| Sandbox Paddle configuration | Previously recorded; current recheck `UNVERIFIED` |
| Existing Stripe/Web Billing configuration | Previously recorded as preserved; current recheck `UNVERIFIED` |
| Entitlements `pro`, `premium` | Repository and prior Sandbox evidence preserve these identifiers; no code change |
| New Sandbox webhook | Not created |
| Production webhook | Not created |
| Lifecycle events | None sent |
| Production paid-user state | Not used for lifecycle testing |

## 6. WiseResume plan and benefit work

PR #199 merged the approved public display rename and benefit-truthfulness work into Production at merge commit `deb673f4f1b603f044af0ef216b3e4cf03ec244e`. The recorded Production status is `DEPLOYED_VERIFIED_WITH_WARNINGS`. Public labels are Free, Pro, and Ultimate; Pro is $5/month; Ultimate is $10/month; unsupported support, early-access, white-label, and version-history claims were removed; the Tailoring Hub direct-route Pro gate was hardened; Arabic localization was corrected; and Free/Pro/Ultimate browser QA was completed within the documented fixture boundary.

The verified Ultimate differentiators remain Analytics, CSV Analytics export, current unlimited premium AI behavior, and removing WiseResume branding. Checkout remains intentionally Coming Soon/disabled. This product and frontend work was not modified in this closeout.

## 7. Payments Phase 1 backend architecture

The repository-controlled implementation is additive. It includes the `revenuecat-webhook` Appwrite Function, the shared highest-valid-plan resolver, server-only provider-state storage, a durable event ledger, fail-closed webhook authentication, canonical RevenueCat `app_user_id` validation against Appwrite Auth, supported lifecycle handling, and duplicate/stale-event protection.

The webhook supports `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `UNCANCELLATION`, `EXPIRATION`, `BILLING_ISSUE`, and `PRODUCT_CHANGE`. Cancellation and billing issue preserve provider access through the verified expiration; expiration removes only the provider candidate; stronger manual, coupon, or trial candidates survive provider expiration; unknown products, entitlements, environments, identities, event types, and malformed timestamps grant no access.

The server-side resolver is consumed by provider-aware coupon reads, AI plan resolution, and admin manual/trial mutations. No browser write path was added, and the existing `subscriptions` collection was not repurposed for provider lifecycle state.

## 8. Appwrite additive collections

Phase 2A applied and verified exactly two repository-controlled collections in Appwrite project `69fd362b001eb325a192`, database `main`:

| Collection | Verified live state |
|---|---|
| `revenuecat_subscription_state` | Server-only; `permissions=[]`; `documentSecurity=false`; unique `user_id_unique`; deterministic per-user document ID; zero documents; `will_renew` optional boolean with default `true` |
| `revenuecat_event_ledger` | Server-only; `permissions=[]`; `documentSecurity=false`; unique `event_id_unique`; durable order/idempotency metadata; 90-day retention marker contract; zero documents |

The existing `subscriptions` collection was inspected only at the permitted metadata boundary and was not destructively modified. No provider-state or ledger document was created during this closeout.

## 9. Coupon schema blocker and resolution

The first Phase 2B deployment attempt, workflow run `32656801892`, deployed zero Functions and stopped while trying to create `coupon_redemptions.user_coupon_unique`. The live legacy `coupon_redemptions.user_id` attribute has size `65000`; together with `discount_code_id` size `64`, the four-byte index-width calculation exceeds Appwrite’s 767-byte limit.

The resolved design retains unique `discount_codes.code_unique`, creates non-unique `coupon_redemptions.discount_code_idx` on `discount_code_id`, and preserves per-user/coupon redemption uniqueness through the deterministic redemption document ID and atomic transaction flow. No data migration, field-size reduction, collection replacement, or permission broadening was performed.

## 10. Phase 2B Function deployment

After the lockfile and local-dependency archive-packaging corrections, the canonical targeted workflow completed successfully:

| Item | Verified result |
|---|---|
| Workflow run | `32659598098` |
| Head SHA | `8e9476fbc9a58118fc13b5eec80505a0ca97d1f3` |
| Exact targets | `revenuecat-webhook,coupons,ai-gateway,admin-devkit-data` |
| Conclusion | `success` |
| Deployment method | Repository-controlled targeted GitHub Actions workflow; no Console source deployment; no `target=all` |
| Collateral target status | No unrelated Function was part of the approved target input |

### Current live Function metadata

A sanitized Appwrite read-only inspection was performed after the successful run. Appwrite reports the four selected Functions as enabled with ready latest deployments and `live=false`; the exact API values are recorded below rather than translated into an inferred “production live” claim.

| Function | Enabled | Live flag | Latest deployment | Created at | Runtime | Entrypoint | Execute |
|---|---:|---:|---|---|---|---|---|
| `revenuecat-webhook` | true | false | `6a8b428bcc672552c93c` / ready | 2026-08-23 18:57:16Z | node-22 | `src/main.js` | `["any"]` |
| `coupons` | true | false | `6a8b4298cc91fa11cc23` / ready | 2026-08-23 18:57:29Z | node-22 | `src/main.js` | `["any"]` |
| `ai-gateway` | true | false | `6a8b42a5e0965bff82f1` / ready | 2026-08-23 18:57:42Z | node-22 | `src/main.js` | `["users"]` |
| `admin-devkit-data` | true | false | `6a8b42b268421195ca8f` / ready | 2026-08-23 18:57:54Z | node-22 | `src/main.js` | `["users"]` |

The repository source-hash manifest records the following full SHA-256 values, and the sanitized `fn_deployed_hashes` inspection returned matching short records for all four selected targets:

| Function | Repository source hash |
|---|---|
| `revenuecat-webhook` | `84b912c8fb19847b8c9f3e5fb244e6a6f0d47ea75a3479be2e83f8416ed2d3ca` |
| `coupons` | `7f446ce4beaeebff1b0d1b9fd5759525c5c5641d42f133b9a487552cfabf9125` |
| `ai-gateway` | `90dc27f2352511f8fc26a085ef85cb703ed085dd7af853aaf536ca90c836f867` |
| `admin-devkit-data` | `7683b44a7dc033aecc739541cc0ec91f0d7fcd31fabf7a2a8718d498b22431e0` |

### Function variable names

Only variable names and Appwrite’s secret flags were inspected. Values were not printed or recorded.

| Function | Relevant variable names |
|---|---|
| `revenuecat-webhook` | `APPWRITE_API_KEY` (secret), `APPWRITE_ENDPOINT` (secret), `APPWRITE_PROJECT_ID` (secret), `REVENUECAT_WEBHOOK_AUTH_SECRET` (secret) |
| `coupons` | `APPWRITE_API_KEY` (secret), `APPWRITE_ENDPOINT` (secret), `APPWRITE_PROJECT_ID` (secret), provider-key names |
| `ai-gateway` | Appwrite, provider, admin, gateway, share, Turnstile, and Resend variable names; values not inspected |
| `admin-devkit-data` | Appwrite, admin, GitHub, impersonation, audience/segment, and email-service variable names; values not inspected |

The Appwrite Function variable name `REVENUECAT_WEBHOOK_AUTH_SECRET` and its secret flag are verified. The value/content match is not independently provable because Appwrite redacts secret values. GitHub Actions repository-secret presence was not independently listable in this session and is therefore `UNVERIFIED`. No secret value is recorded here.

## 11. Custom Appwrite Function domain

The custom Function hostname is:

`revenuecat-webhook.wiseresume.app`

The Appwrite-required DNS record was added by the owner:

| Type | Host | Target | Result |
|---|---|---|---|
| CNAME | `revenuecat-webhook` | `fra.cloud.appwrite.io` | Public DNS resolves through Appwrite/Fastly |

The first recorded Appwrite verification-page timestamp was approximately `2026-08-23T19:48:01Z`. The latest strict-TLS recheck in this session was approximately `2026-08-23T20:19:40Z`, so the elapsed time from that recorded verification-page timestamp was approximately 31 minutes. Appwrite did not expose an authoritative creation timestamp through the inspected API, so elapsed time since the actual domain-creation event is `UNVERIFIED`.

The last readable Appwrite status was `Generating certificate`. A later Console reload could not be read because the connected browser session timed out, but public strict-TLS evidence proves that the domain was not ready at the latest check:

| Check | Result |
|---|---|
| DNS resolution | Resolves through `fra.cloud.appwrite.io` and `fastly.appwrite.systems` |
| Strict HTTPS | Fails hostname verification; HTTP status `000` |
| Presented certificate issuer | Certainly Intermediate R1 |
| Presented certificate subject | `t.sni-820-default.ssl.fastly.net` |
| Presented certificate SAN | `DNS:t.sni-820-default.ssl.fastly.net` only |
| Certificate validity for requested hostname | Failed; no SAN match for `revenuecat-webhook.wiseresume.app` |
| Insecure edge diagnostic | HTTP `421` |
| CAA result | Not reliably independently confirmed in this closeout; do not claim the recommended CAA is present |

The domain therefore remains `APPWRITE_CUSTOM_DOMAIN_SSL_PENDING`. No DNS record was changed during this closeout.

## 12. Generated and Edge domain investigation

The generated `.appwrite.run` domain was not exposed in the Function metadata or API response. The Function metadata returned no domain fields. Read-only probes of `/functions/revenuecat-webhook/domains` and `/functions/revenuecat-webhook/edge-domains` returned HTTP `404`. The Console bundle and authenticated Domains view exposed only the custom-domain flow and no explicit `appwrite.network` Edge Network creation action for this project.

No hostname was guessed from the Function ID, deployment ID, project ID, or any other identifier. The Appwrite execution API was not used as a RevenueCat webhook URL, and no Vercel/proxy relay was introduced. The Edge investigation is closed as `EDGE_DOMAIN_UNAVAILABLE` for this project/UI/API state.

## 13. Security state and credential incident

The webhook implementation is designed to authenticate before JSON parsing or mutation. The intended transport contract is:

| Case | Expected behavior |
|---|---|
| Missing `Authorization` | HTTP `401` |
| Invalid `Authorization` | HTTP `401` |
| Valid secret plus malformed JSON | HTTP `400` safe rejection, with no provider-state or ledger mutation |

The domain was not strict-HTTPS ready, so no domain-based smoke test or RevenueCat delivery test was claimed. The provider-state and ledger document totals remained zero in the sanitized Appwrite inspection.

During a read-only RevenueCat project/app inspection, a **Paddle Sandbox API key** was unintentionally returned unredacted by a tool/MCP result. The value is intentionally not recorded, quoted, re-read, or stored here.

| Incident field | Recorded state |
|---|---|
| Credential type | Paddle Sandbox API key |
| Exposure source | Tool/MCP result |
| Secret value | NEVER RECORD |
| Rotation status | `ROTATION DEFERRED BY OWNER` |
| Production Paddle credentials | Not proven affected |
| Required future action | Rotate/revoke the exposed Sandbox credential before further provider activation or Production payment work |

This deferred warning does not change the current closeout stop point, but it remains an unresolved security risk for the next provider-activation phase.

## 14. Payment activation boundary

Frontend checkout remains Coming Soon/disabled. No Paddle checkout was activated, no real payment was taken, no Production subscription was activated, and no real customer subscription state was used for lifecycle testing. RevenueCat Sandbox webhook creation and controlled lifecycle verification did not begin because strict HTTPS was not ready. No Appwrite schema, permission, DNS, or provider configuration mutation was made while closing this session.

## 15. Payments chronology and merged PR evidence

| Stage | Evidence and result |
|---|---|
| Phase 1 implementation | PR #201 merged at `4ee28340618d12b6d1e10913013c2d18c7353bc1` |
| Phase 2A schema compatibility | PR #204 merged at `8e84f84bc6eb5a12719e8cc2385baa7650260224` |
| Phase 2A closeout | PR #202 merged at `3cc66720a176912de22fefcc35b43028ed79ec68` |
| Coupon schema compatibility | PR #205 merged at `c7e4dc4e9ea8e7dc15bbf0b6cd8fc5e12d404870` |
| Coupon blocker documentation | PR #206 merged at `9b994713d2e8b92c5452402a16656e9a29b5e182` |
| Webhook package lockfile | PR #207 merged at `aaf3f1ce84632687f5dcdf8a82d7550c3596af6d` |
| Initial local-resolver materialization | PR #208 merged at `9f90d2fa517f43f12531213de90e19e8052d28b7` |
| Final archive-internal staging | PR #209 merged at `8e9476fbc9a58118fc13b5eec80505a0ca97d1f3` |
| Targeted Phase 2B deployment | Run `32659598098` succeeded on `8e9476f`; four exact targets only |
| Current main | `8e9476fbc9a58118fc13b5eec80505a0ca97d1f3` |

## 16. Exact stop point and remaining sequence

Current blocker:

`APPWRITE_CUSTOM_DOMAIN_SSL_PENDING`

Current domain:

`revenuecat-webhook.wiseresume.app`

DNS is resolving correctly to Appwrite, but strict HTTPS is not valid and routing returns HTTP `421`. The next session must stop immediately if SSL is still pending. If strict HTTPS becomes valid, the approved sequence is:

1. Verify the exact Function deployment/source state and variable names only.
2. Run missing Authorization → `401`.
3. Run invalid Authorization → `401`.
4. Run valid Authorization plus malformed payload → safe rejection with no provider-state or ledger mutation.
5. Create a new RevenueCat webhook as Sandbox-only, never Production or Both.
6. Verify RevenueCat-to-Appwrite transport.
7. Confirm a pre-existing dedicated WiseResume test fixture with no real billing relationship.
8. Test Pro `INITIAL_PURCHASE`.
9. Refresh, reopen, and verify persistence.
10. Test duplicate delivery.
11. Test stale/out-of-order delivery.
12. Test cancellation without premature revoke.
13. Test billing issue without premature revoke.
14. Test expiration.
15. Test Ultimate mapping to internal `premium`.
16. Test entitlement-source coexistence only where the fixture safely supports it.
17. Verify server plan and AI-limit resolution.
18. Stop before frontend checkout.

Any missing dedicated fixture requires `TEST_FIXTURE_REQUIRED`; any lifecycle deviation requires `RUNTIME_VERIFICATION_FAILED`.

## 17. NEXT_MANUS_SESSION_CONTEXT

```text
NEXT_MANUS_SESSION_CONTEXT

Read Project Atlas first, especially RULES.md, CURRENT_STATE.md, WHERE_WE_STOPPED.md, SOURCE_OF_TRUTH_MAP.md, ATLAS_ROUTING_RULES.md, skills/agent-bootstrap.md, skills/documentation-closeout.md, architecture/revenuecat-subscription-sync.md, architecture/data-model.md, architecture/integrations.md, and deployment/current-deployment.md.

Refresh Git state from origin before doing anything. Authoritative origin/main at this closeout is 8e9476fbc9a58118fc13b5eec80505a0ca97d1f3. Do not repeat the completed schema, coupon, lockfile, or archive-staging work.

Appwrite project: 69fd362b001eb325a192. Database: main. RevenueCat project: TheWiseCloud. Function: revenuecat-webhook. Current Function deployment: 6a8b428bcc672552c93c, ready, Node 22, src/main.js, execute [any]. Repository source hash: 84b912c8fb19847b8c9f3e5fb244e6a6f0d47ea75a3479be2e83f8416ed2d3ca. The Appwrite variable name REVENUECAT_WEBHOOK_AUTH_SECRET exists and is marked secret; its value match is UNVERIFIED because Appwrite redacts it. GitHub Actions secret presence is UNVERIFIED. Never print or retrieve either value.

Custom domain: revenuecat-webhook.wiseresume.app. DNS CNAME: revenuecat-webhook → fra.cloud.appwrite.io. Last known Appwrite status: Generating certificate. Latest strict TLS check failed because the presented certificate SAN was t.sni-820-default.ssl.fastly.net, not the requested hostname; insecure diagnostic returned HTTP 421. Current blocker: APPWRITE_CUSTOM_DOMAIN_SSL_PENDING.

First action: check strict TLS and Appwrite certificate status for revenuecat-webhook.wiseresume.app. If SSL is still pending or hostname validation fails, stop and report the blocker. Do not change DNS, create another domain, redeploy, or create the RevenueCat webhook.

If SSL is valid, verify Function/source state, then run missing-auth 401, invalid-auth 401, and valid-secret + malformed-payload safe rejection with zero provider-state/ledger mutation. Only after all pass may you create a RevenueCat webhook in TheWiseCloud as Sandbox-only, never Production/Both, and continue approved lifecycle testing with a dedicated non-real billing fixture.

Paddle Sandbox products: Pro product pro_01m0fn08h7tmzm5cphvcvd30g6 / price pri_01m0fnjspex6yqqf6w9v9apaxg ($5 monthly); Ultimate product pro_01m0fnm7000501f67z1bmhzaff / price pri_01m0fnq9hetwdwm9e1sa49n08s ($10 monthly). Entitlements remain pro and premium. Internal plan keys remain free, pro, premium; public Ultimate maps to premium.

Schema status: revenuecat_subscription_state and revenuecat_event_ledger are live, server-only, permissions=[], documentSecurity=false, unique user_id_unique/event_id_unique, and zero documents. Existing subscriptions was not destructively changed.

RevenueCat webhook status: no new Sandbox webhook, no Production webhook, no lifecycle events. Paddle Sandbox API key exposure remains an unresolved warning: rotation was deferred by owner. The value must never be recorded or retrieved again. Rotate/revoke it before further provider activation or Production payment work.

Stop conditions: SSL pending → APPWRITE_CUSTOM_DOMAIN_SSL_PENDING; no dedicated safe fixture → TEST_FIXTURE_REQUIRED; lifecycle/runtime mismatch → RUNTIME_VERIFICATION_FAILED. Frontend checkout and Production payments remain out of scope until backend Sandbox sync is verified.
```

## References

[1]: https://appwrite.io/docs/products/functions/domains "Appwrite Functions domains"
[2]: https://www.revenuecat.com/docs/integrations/webhooks "RevenueCat Webhooks"
[3]: https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields "RevenueCat Webhook Event Types and Fields"

PAYMENTS_SESSION_CLOSED_SSL_PENDING
