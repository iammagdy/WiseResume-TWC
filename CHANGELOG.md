# Changelog

## 2026-06-20 - Portfolio unlock and AI routing alignment

- **Portfolio unlock**: updated `get-public-portfolio` and `verify-portfolio-password` to verify the bcrypt hashes written by `PortfolioEditorPage`, while preserving legacy raw SHA-256 and `sha256:` password hashes.
- **Portfolio safety**: protected portfolios now fail closed when protection is enabled but the stored hash is missing; public portfolio responses still do not expose `password_hash`.
- **AI Gateway**: fixed `tailor-resume` structured normalization so existing IDs are preserved, company/title matching can map reordered experience entries correctly, omitted originals are appended, and the AI-returned order is not re-sorted away.
- **DevKit catalogue**: aligned `resume-section-ai` with the gateway DeepSeek default route.
- **Navigation**: updated dashboard/search/discovery/job-detail entry points to prefer `/tailoring-hub` while keeping legacy `/tailor` routes available.
- **Verification**: targeted hub tests, DevKit/search Vitest tests, and hub syntax checks passed; full build/source-hash validation was run before commit.

## 2026-06-20 - DevKit live audit follow-up fixes

- **Email Automations**: updated `admin-email` and the DevKit Email Automations panel to use Resend Segments (`RESEND_SEGMENT_ALL_USERS`) with legacy Audience fallback (`RESEND_AUDIENCE_ALL_USERS`) instead of failing hard when the old audience variable is absent.
- **Diagnostics**: fixed DevKit diagnostics so the deployed Admin Sentry function is recognized by its real Appwrite function id while still reporting it as `admin-sentry`.
- **User cleanup**: made DevKit user deletion remove owned `subscriptions`, `ai_credits`, and `notifications` rows before deleting the profile/auth user, and tolerate already-missing auth users.
- **Deploy wiring**: propagated Resend segment/audience variables through the GitHub Appwrite hub deploy workflow and deploy script, then refreshed DevKit source hashes.
- **Verification**: `node --check` passed for changed Appwrite hubs, targeted DevKit ESLint passed, and `npm run build` passed.

## 2026-06-20 - DevKit visual shell wiring cleanup

- **DevKitUI** (`src/components/dev-kit/DevKitUI.tsx`): restored the shared DevKit helper module deleted in the visual refresh, preserving `DevKitLoading`, `DevKitMetricCard`, `DevKitSection`, and `DevKitTabBar` exports required by `AdminUsersPanel`, `OverviewPanel`, and `GrowthTrafficPanel`.
- **DevKit shared styling** (`src/components/dev-kit/DevKitUI.tsx`): aligned restored helpers with the Phase 1 dark DevKit shell using subtle borders, black translucent surfaces, status color accents, and responsive tab controls.
- **Verification**: confirmed TypeScript and targeted DevKit ESLint checks pass for `DevKitUI.tsx`, `DevToolsPage.tsx`, `HomePanel.tsx`, `DiagnosticsPanel.tsx`, `EmailHubPanel.tsx`, `FeatureFlagsPanel.tsx`, and `AICommandCenterPanel.tsx`.
