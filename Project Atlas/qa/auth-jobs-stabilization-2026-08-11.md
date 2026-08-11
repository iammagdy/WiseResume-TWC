# Auth and Jobs Stabilization QA — 2026-08-11

**Status:** `TESTED_LOCAL_NOT_DEPLOYED`

## Verified local

* TypeScript completed with no errors.
* Focused Vitest passed: Auth error/callback recovery, account-namespaced resume persistence, Remote Jobs owner-ID contract, Application Tracker render, and tailoring-result behavior (`6` files / `18` tests).
* The deleted-resume result assertion passed independently (`1` passed, `7` deliberately skipped by name filter).
* `node --check appwrite-hubs/email-service/src/main.js` and `git diff --check` passed.

## Production read-only observation

* Authenticated `/jobs` was inspected at 1440, 1280, 1024, 768, 430, 390, 375, and 360 px widths with no horizontal overflow.
* The current production session displayed `0 remote jobs available` and `Last updated: Not yet synced`; classify this as `ENVIRONMENT ISSUE`, not a frontend-layout pass for populated cards.

## Pending after owner review and deployment

* Real signup delivery, verification resend, actual inbox receipt, and confirmation.
* LinkedIn new-user and existing-user flows, including provider-console diagnosis if a failure persists.
* Two authorized QA identities through A → B → A with hard refreshes.
* Populated Jobs filters/cards/dialogs, light/dark, RTL, mobile sheet, tracker deletion persistence, and external-link behavior.
