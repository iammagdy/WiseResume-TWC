# Auth and Jobs Stabilization QA — 2026-08-11

**Status:** `EMAIL_VERIFICATION_PRODUCTION_VERIFIED`; two-owner Jobs ownership verification closed; LinkedIn and remaining Jobs QA pending

## Current closeout (2026-08-13)

* **Email verification:** `CLOSED`. The Appwrite Verification template was corrected to include a non-empty subject/body and `{{redirect}}`. One controlled resend was accepted by Appwrite through `email-service` with HTTP `200`, appeared in Resend, and reached `delivered`; the owner confirmed inbox receipt.
* **Completion and welcome:** The real WiseResume verification link and explicit confirmation action completed Appwrite email verification, routed the user to onboarding, and caused a welcome email that Resend also recorded as delivered. No manual Appwrite verification, duplicate resend, secret inspection, or credential recording occurred.
* **Current architecture:** authenticated user -> `email-service` -> official Appwrite verification lifecycle -> Appwrite Custom SMTP -> Resend -> Appwrite template with `{{redirect}}` -> explicit WiseResume confirmation -> Appwrite email verification true. Appwrite owns the token; Resend is transport; no custom parallel token path, direct Resend verification branch, or stale server-token helper is used.
* **Still pending:** LinkedIn first-time and existing-user production verification; tracker deletion; broader Saved Jobs rendering; deleted-resume tombstone; populated Jobs UI; and read-only diagnosis of `0 remote jobs / Not yet synced`. Jobs remains `VISIBLE_PRODUCTION_FEATURE` and is not promoted by this email closeout.

## Closed ownership verification (2026-08-09; reconciled 2026-08-13)

* Two authorized identities completed an A-to-B-to-A account switch through the normal UI and full reloads. User A's saved job persisted, User B's independent saved state remained after User A's cleanup, and User A's authorized cleanup persisted.
* No account identifiers, session material, or job fixture identifiers are recorded in Atlas.
* The supported mutation implementation derives ownership from the active JWT-backed Appwrite account and applies owner-only permissions; the browser fallback uses the active authenticated user and the same derived action key.

## Release evidence

The dated delivery-blocker bullets in this section are preserved as historical evidence. Their email-verification hold was resolved on 2026-08-13 by correcting the Appwrite Verification template and completing the controlled production delivery and completion proof recorded above.

* PR `#177` merged as `5225c130c6ccd376b28ab36af4d321db38223633` after successful GitHub Actions PR Validation run `31479960006`; Vercel production deployment `dpl_5YpEvmcVUeiyhh3DJuK2K38EMZ5n` is `READY` for that SHA.
* Official Appwrite workflow run `31480913343` deployed only `email-service`; deployment `6a7af4d3a5df0ba745b2` became `ready`, and source-hash recomputation matched `bc17f522f7edf778435f0f1c305394ce4b68737302ee6590a1d042e82d72f487`.
* **Stop condition:** workflow logs show empty Resend API/sender configuration and an intentionally blank Appwrite verification template for the branded Resend route. Actual signup/resend inbox delivery, verification completion, and LinkedIn QA are blocked until the owner configures Resend; no external configuration was changed.
* **Configuration follow-up:** after the owner completed the required server-side setup, official workflow run `31481279174` passed its exact `email-service` target and source-hash/manifest validation. Secret values were not inspected. The disposable-inbox provider is blocked by browser policy, so end-to-end delivery evidence is still pending a permitted inbox fixture.
* **Owner-monitored inbox QA:** a fresh account was created and reached the verification screen. Its initial verification request and one cooldown-permitted resend both showed successful client results, but the owner confirmed no inbox message for either. No manual Appwrite verification, extra account, inbox access, or configuration mutation occurred. Classify `ACCOUNT_CREATION_AND_CLIENT_FUNCTION_RESULT_SUCCESS` → `MAIL_DELIVERY_UNCONFIRMED_FAILURE`; function execution and Resend activity evidence are required to resolve the exact route.

## Verified local

## Historical read-only production delivery trace (resolved 2026-08-13)

* Initial execution `6a7afac5396ba739be3a` (`200`, completed, `1s`) and cooldown-permitted resend execution `6a7afb564390b4d78def` (`200`, completed, `246ms`) both used the Appwrite fallback path: the verification secret was unavailable to the function runtime and Appwrite owned the mail request.
* Neither execution contains Resend-send evidence. Resend activity has no matching recipient event, so no provider message ID, acceptance, bounce, suppression, or rejection exists for the two sends.
* Verdict: `APPWRITE_FALLBACK_NOT_DELIVERABLE`; secondary `PRODUCT BUG — FALSE EMAIL DELIVERY SUCCESS`. The fallback response is accepted by the client without a delivery-provider acceptance ID or inbox proof.
* Resend sender-domain, SPF, and DKIM status were not exposed by the read-only console view and are not asserted. No user, secret, email, configuration, code, or deployment was changed.

* TypeScript completed with no errors.
* Focused Vitest passed: Auth error/callback recovery, account-namespaced resume persistence, Remote Jobs owner-ID contract, Application Tracker render, and tailoring-result behavior (`6` files / `18` tests).
* The deleted-resume result assertion passed independently (`1` passed, `7` deliberately skipped by name filter).
* `node --check appwrite-hubs/email-service/src/main.js` and `git diff --check` passed.

## Production read-only observation

* Authenticated `/jobs` was inspected at 1440, 1280, 1024, 768, 430, 390, 375, and 360 px widths with no horizontal overflow.
* The current production session displayed `0 remote jobs available` and `Last updated: Not yet synced`; the same state remains after the frontend deployment at 360 px with no horizontal overflow. Classify this as `ENVIRONMENT ISSUE`, not a frontend-layout pass for populated cards.

## Remaining production QA (not started in this closeout)

* LinkedIn new-user and existing-user production flows.
* Two authorized QA identities through A → B → A with hard refreshes.
* Populated Jobs filters/cards/dialogs, light/dark, RTL, mobile sheet, tracker deletion persistence, and external-link behavior.
* Saved Jobs rendering, deleted-resume tombstone verification, and read-only diagnosis of `0 remote jobs / Not yet synced`.
