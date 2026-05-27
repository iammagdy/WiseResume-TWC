# Mobile QA checklist (Phase 1)

Track every release against this list. Use a fresh device or wipe app
data between runs so cached state doesn't mask regressions.

## Devices

- iPhone SE (3rd gen) – iOS 17, smallest supported screen
- iPhone 15 Pro – iOS 18, Dynamic Island
- iPad mini – split-screen / multitasking
- Pixel 7 – Android 14 stock
- Samsung Galaxy A14 – Android 13, OneUI
- Low-end Android (e.g. Moto G Power) – performance floor

## Cold-start

- [ ] App launches in <3s on mid-tier device
- [ ] Splash screen hides as soon as auth resolves
- [ ] No flash of unauthenticated UI before redirect to `/(tabs)/dashboard`

## Auth

- [ ] Onboarding shows on very first launch only
- [ ] Sign-in opens system browser, returns to app via deep link
- [ ] Sign-out clears bridge JWT + Kinde token, redirects to `/sign-in`
- [ ] Bridge JWT survives backgrounding / cold-start
- [ ] Account suspension returns user to a friendly error screen

## Dashboard

- [ ] Quick actions navigate to the correct routes
- [ ] Plan badge reflects `me.plan`
- [ ] Pull-to-refresh refetches `me` and `resumes`

## Resumes

- [ ] List renders newest-first
- [ ] Tapping a row opens detail
- [ ] Title edit persists via PATCH
- [ ] PDF export returns a signed URL within 10s

## Tracker

- [ ] Empty state CTA opens `New job`
- [ ] New job is added to the list immediately
- [ ] Detail shows status + posting URL

## Interview

- [ ] Mic permission prompt appears on first record
- [ ] Recording stops cleanly and grades the answer
- [ ] Feedback surfaces score + summary

## Cover letters / Resignation letters

- [ ] Generate flow returns within 15s
- [ ] PDF export returns a signed URL

## Profile + settings

- [ ] Theme toggle is sticky across launches
- [ ] Biometric lock prompts on cold-start when enabled
- [ ] Notification toggles are respected by the next push

## Push notifications

- [ ] Token is registered after sign-in
- [ ] Test push from `send-push` arrives within 5s
- [ ] Tapping a push deep-links into the relevant screen
- [ ] Toggling a category in Settings is honored on the next send

## Payments

- [ ] Paywall shows plan previews with a disabled Coming Soon action
- [ ] Tapping payment controls cannot start checkout
- [ ] Existing `me.plan` state still controls premium access

## Universal / app links

- [ ] `https://resume.thewise.cloud/r/<id>` opens the app, not Safari
- [ ] Same on Android with App Links verified
- [ ] Custom scheme (`wiseresume://...`) still works from email clients
