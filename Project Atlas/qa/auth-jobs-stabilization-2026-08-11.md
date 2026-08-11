# Auth and Jobs Stabilization QA — 2026-08-11

**Status:** `OWNER_ACTION_REQUIRED`

## Release evidence

* PR `#177` merged as `5225c130c6ccd376b28ab36af4d321db38223633` after successful GitHub Actions PR Validation run `31479960006`; Vercel production deployment `dpl_5YpEvmcVUeiyhh3DJuK2K38EMZ5n` is `READY` for that SHA.
* Official Appwrite workflow run `31480913343` deployed only `email-service`; deployment `6a7af4d3a5df0ba745b2` became `ready`, and source-hash recomputation matched `bc17f522f7edf778435f0f1c305394ce4b68737302ee6590a1d042e82d72f487`.
* **Stop condition:** workflow logs show empty Resend API/sender configuration and an intentionally blank Appwrite verification template for the branded Resend route. Actual signup/resend inbox delivery, verification completion, and LinkedIn QA are blocked until the owner configures Resend; no external configuration was changed.
* **Configuration follow-up:** after the owner completed the required server-side setup, official workflow run `31481279174` passed its exact `email-service` target and source-hash/manifest validation. Secret values were not inspected. The disposable-inbox provider is blocked by browser policy, so end-to-end delivery evidence is still pending a permitted inbox fixture.
* **Owner-monitored inbox QA:** a fresh account was created and reached the verification screen. Its initial verification request and one cooldown-permitted resend both showed successful client results, but the owner confirmed no inbox message for either. No manual Appwrite verification, extra account, inbox access, or configuration mutation occurred. Classify `ACCOUNT_CREATION_AND_CLIENT_FUNCTION_RESULT_SUCCESS` → `MAIL_DELIVERY_UNCONFIRMED_FAILURE`; function execution and Resend activity evidence are required to resolve the exact route.

## Verified local

* TypeScript completed with no errors.
* Focused Vitest passed: Auth error/callback recovery, account-namespaced resume persistence, Remote Jobs owner-ID contract, Application Tracker render, and tailoring-result behavior (`6` files / `18` tests).
* The deleted-resume result assertion passed independently (`1` passed, `7` deliberately skipped by name filter).
* `node --check appwrite-hubs/email-service/src/main.js` and `git diff --check` passed.

## Production read-only observation

* Authenticated `/jobs` was inspected at 1440, 1280, 1024, 768, 430, 390, 375, and 360 px widths with no horizontal overflow.
* The current production session displayed `0 remote jobs available` and `Last updated: Not yet synced`; the same state remains after the frontend deployment at 360 px with no horizontal overflow. Classify this as `ENVIRONMENT ISSUE`, not a frontend-layout pass for populated cards.

## Pending after owner review and deployment

* Read-only Appwrite `email-service` execution and Resend delivery activity inspection; do not change provider configuration until the route/rejection evidence is known.
* Verification completion, welcome email, LinkedIn new-user and existing-user flows after actual email delivery is restored.
* Two authorized QA identities through A → B → A with hard refreshes.
* Populated Jobs filters/cards/dialogs, light/dark, RTL, mobile sheet, tracker deletion persistence, and external-link behavior.
