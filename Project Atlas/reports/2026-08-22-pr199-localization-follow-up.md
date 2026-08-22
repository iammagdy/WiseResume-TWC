# WiseResume PR #199 — Localization and Mobile Subscription Badge Follow-up

**Date:** 2026-08-22

**Branch:** `feat/ultimate-plan-display-rename`

**PR:** [#199](https://github.com/iammagdy/WiseResume-TWC/pull/199), Draft/Open, targeting `main`

**Status:** `BROWSER_QA_BLOCKED` — the localization and mobile badge fixes are pushed and Arabic/Free Preview checks passed; Pro authenticated Preview checks are blocked by Vercel access/session instability.

## Scope

This follow-up is limited to the owner-authorized confirmed Browser QA blockers: Arabic localization gaps on Pricing, Subscription, Analytics lock/access content, and Tailoring Hub/upgrade walls, plus the reproducible cramped mobile Subscription `Online payments coming soon` badge. The patch does not activate checkout and does not change Paddle, RevenueCat, Appwrite schemas or permissions, authentication, secrets, subscription backend logic, AI limits, credit logic, or payment state.

## Root causes and changes

The localization patch had initially addressed plan-surface copy using paths that did not match the catalog structure. The new catalog sections live under the direct JSON `aiStudio` object, so the corrected runtime paths are `app.aiStudio.pricingPage.*`, `app.aiStudio.subscriptionPage.*`, `app.aiStudio.analyticsPage.*`, `app.aiStudio.tailoringHubGate.*`, `app.aiStudio.upgradeWall.*`, and `app.aiStudio.planFeatures.*`. Analytics export messages were placed in the Analytics section, and Pricing CTA labels were added there rather than relying on unverified root keys.

The shared `UpgradeWall` and the existing resume-limit upgrade caller now use the same localized catalog namespace. The workspace top bar now maps Analytics and Subscription to their localized `aiStudio` title keys, preventing the literal `app.subscription`/`app.analytics` fallback observed during Preview QA. The Subscription badge keeps billing disabled while using wrapping, width, icon, and line-height classes that prevent cramped mobile presentation. The public labels remain Free, Pro, and Ultimate; internal plan keys remain `free`, `pro`, and `premium`; prices remain `$0`, `$5`, and `$10`; and Ultimate clean export remains `Remove WiseResume branding` in English and `إزالة علامة WiseResume` in Arabic.

## Files changed in this follow-up

| Area | Files |
|---|---|
| Catalogs | `locales/en/app.json`, `locales/ar/app.json` |
| Plan surfaces | `src/pages/PricingPage.tsx`, `src/pages/SubscriptionPage.tsx`, `src/pages/AnalyticsPage.tsx`, `src/pages/TailoringHubPage.tsx` |
| Shared upgrade walls | `src/components/plan/UpgradeWall.tsx`, `src/components/dashboard/CreateResumeDialog.tsx` |
| Regression coverage | `src/i18n/__tests__/criticalArabicCoverage.test.ts`, `src/components/layout/AppWorkspaceTopBar.tsx` |

## Local validation

The following checks passed on the dirty branch before commit: `git diff --check`; `npm run test:i18n`; `npm run test:i18n:coverage`; focused Arabic coverage (6 tests); focused Tailoring/Analytics regression tests (19 tests); full Vitest (222 files passed, 1 skipped; 1,236 tests passed, 8 skipped, 1 todo); `npm run lint`; `npx tsc --noEmit`; and `NODE_OPTIONS=--max-old-space-size=2048 npm run build`, including the no-sourcemap check. Vite emitted its existing advisory large-chunk warnings.

An earlier lint run failed on two explicit `any` types introduced in the focused test; those were replaced with a precise catalog type and the lint command was rerun successfully. The focused Tailoring recovery tests emitted the existing `LocaleProvider` fallback warning because those tests render outside the provider; their assertions passed.

## CI and deployment boundary

The active repository workflows contain no TestSprite references. PR #199 currently reports successful Typecheck + portfolio tests, Vercel, and Vercel Preview Comments, with the separate `TestSprite Pre-Check` failure `No tests detected`. Historical Atlas evidence classifies that result as a known non-applicable informational warning; no CI change was made.

The connected browser’s stable Preview authentication was previously restored by adding exactly one Appwrite Web-platform hostname: `wise-resume-twc-git-feat-ultimate-plan-display-rename-iam-magdy.vercel.app`. That configuration change predates this follow-up and was not repeated or broadened. No Appwrite deployment or repository backend change is required for this patch. No Production deployment or merge is authorized.

## Post-push QA finding

Arabic Subscription browser QA exposed a literal `app.subscription` title in the shared workspace top bar even though the page body was localized. The source path map was corrected to use `app.aiStudio.subscriptionPage.title` and `app.aiStudio.analyticsPage.title`, and focused Arabic coverage now guards both mappings. This is a follow-up source fix requiring a new Preview deployment and rerun.

## Post-push browser QA

The latest stable Preview alias rendered the pushed build. Arabic public Pricing passed with `مجاني`, `برو`, and `ألتيميت` at `$0`, `$5`, and `$10`; no Premium display label appeared; supported benefits and `إزالة علامة WiseResume` were visible. Arabic Ultimate Subscription passed after the workspace-title correction, including `الاشتراك`, `ألتيميت`, `إزالة علامة WiseResume`, and a contained readable `الدفع عبر الإنترنت قريباً` badge. Arabic Ultimate Analytics access passed with `التحليلات`, visible export control, and correct Ultimate access; the page retains English data/metric labels outside this plan-gate scope.

The Free fixture passed in English and Arabic: direct Tailoring Hub access showed the Pro gate, and direct Analytics access showed the Ultimate gate. Both locales displayed localized upgrade-wall copy, no payment activation, and no visible RTL clipping in the captured viewport. Pro verification is blocked: after the owner switched to the Pro fixture, the stable alias repeatedly timed out during page inspection and then redirected direct authenticated routes to the Vercel Login page. This is classified as an `ENVIRONMENT ISSUE`, not a product failure. Pro Tailoring Hub access, Pro Analytics blocking, Pro Subscription plan badge, and dedicated Pro mobile checks remain unverified.

## Required next action

Recover owner-authenticated access to the stable Preview alias and rerun only the missing Pro checks, including Pro Tailoring Hub access, Pro Analytics blocking, Pro Subscription badge, and mobile layout. Do not merge until those checks are completed or an explicit owner-approved waiver is recorded. Do not deploy Production.

## Git state at documentation time

The intended follow-up is committed and pushed as `5d2edf0cb872ae01dae644621a0302011e4342e6` (`fix(i18n): localize workspace plan titles`) on `feat/ultimate-plan-display-rename`. PR #199 remains Draft/Open against `main`. The working tree was clean at the last Git check. No merge or Production deployment was performed.

## Merge and Production closeout

PR #199 was marked ready and merged through the normal GitHub workflow at `2026-08-22T13:04:07Z`. Merge commit and final `origin/main` are both `deb673f4f1b603f044af0ef216b3e4cf03ec244e`. The PR is `MERGED`, no longer Draft, and the working tree was clean at the merge verification. No force merge, manual Vercel deploy, Appwrite deploy, payment activation, or provider configuration change was performed.

Vercel Project Overview subsequently reported Production `Ready`, source `main`, commit `deb673f`, with message `Merge PR #199: rename Premium to Ultimate and localize plan surfaces`, and the `wiseresume.app` domain attached. Live `/pricing` then rendered the merged Arabic plan catalog: `مجاني` `$0/شهرياً`, `برو` `$5/شهرياً`, and `ألتيميت` `$10/شهرياً`; corrected benefits including `إزالة علامة WiseResume`; and no stale Premium/$9/$19 or unsupported claims. Billing remained non-activating.

Post-deployment warning: the connected browser retained Arabic locale, so the post-deployment public verification observed `/pricing` in Arabic. `/en/pricing` is not a supported route and returned the application 404. The supported English route is `/pricing` with the persisted locale preference reset to English; no language switch was exposed in the narrow current session, so an English-specific post-deployment render was not independently captured. Earlier Preview English QA passed before merge. This is a verification limitation, not evidence of a Production product defect.

Appwrite Preview hostname authorization remains configuration-only and unchanged during this task. Payment activation remains incomplete. Paddle and RevenueCat Sandbox state remains unchanged. TestSprite remains `No tests detected`; repository evidence indicates it is not a required branch-protection context, while the actual PR Validation/Typecheck, Vercel, and Preview Comments checks passed.
