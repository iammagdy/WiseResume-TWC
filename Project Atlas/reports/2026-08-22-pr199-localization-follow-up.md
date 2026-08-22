# WiseResume PR #199 — Localization and Mobile Subscription Badge Follow-up

**Date:** 2026-08-22

**Branch:** `feat/ultimate-plan-display-rename`

**PR:** [#199](https://github.com/iammagdy/WiseResume-TWC/pull/199), Draft/Open, targeting `main`

**Status:** `IMPLEMENTED_UNVERIFIED` locally; Preview browser QA remains pending after push.

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

## Required next action

Commit only the intended files, push the existing branch, wait for the resulting Vercel Preview, and rerun focused browser QA on the stable alias for Arabic and English desktop/mobile surfaces, Free/Pro/Ultimate gates, Pro mobile behavior, and the responsive Coming Soon badge. Merge remains blocked until that browser evidence is complete.

## Git state at documentation time

The follow-up changes are uncommitted and have not been pushed. The base branch remains `feat/ultimate-plan-display-rename` at the pre-follow-up PR head. Final commit SHA, Preview deployment, browser evidence, and merge verdict must be recorded after push and QA.
