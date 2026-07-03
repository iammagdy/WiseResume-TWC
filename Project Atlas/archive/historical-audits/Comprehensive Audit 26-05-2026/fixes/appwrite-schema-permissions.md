# Appwrite Schema, Permissions, Function IDs, and Env Vars

Date: 2026-05-26
Scope: P0 audit fixes only. This document records repo-evidenced Appwrite configuration and the production checks still required in Appwrite Console.

## Known Database And Storage IDs

- Database: `main`
- Storage bucket: `avatars`

Evidence:
- `src/lib/appwrite-collections.ts` defines `DATABASE_ID = 'main'`.
- `src/lib/appwrite-collections.ts` defines `BUCKETS.avatars = 'avatars'`.

## Known Collections From Repo Source

Repo source currently lists 96 live Appwrite collections. Production must confirm these collection IDs exist in database `main` before launch:

- Admin: `admin_audit_logs`, `admin_sessions`, `admin_user_notes`
- AI: `ai_credits`, `ai_key_migration_audit`, `ai_provider_breaker`, `ai_routing_config`, `ai_usage_logs`
- Analytics/Ops: `analytics_sweep_lock`, `audit_logs`, `edge_function_logs`, `error_log`, `ops_health_events`, `usage_events`, `visitor_events`
- App config: `app_settings`, `feature_flags`, `mobile_app_versions`
- Auth/identity: `blocklist`, `email_verification_tokens`, `impersonation_revocations`, `kinde_events`, `signup_otps`, `token_exchanges`, `user_api_keys`
- Career: `career_assessments`, `company_briefings`, `cover_letters`, `job_applications`, `jobs`, `resignation_letters`, `tailor_history`
- Chat/messaging: `broadcasts`, `chat_messages`, `chat_sessions`, `messages`, `notifications`
- Coupons/billing: `coupon_redemptions`, `credit_transactions`, `discount_codes`, `subscriptions`
- Feedback/support: `bug_reports`, `contact_inquiries`, `contact_requests`, `feature_requests`, `moderation_queue`
- Gamification: `user_gamification`
- Interview: `interview_answers`, `interview_attempts`, `interview_question_bank`, `interview_report_tokens`, `interview_sessions`
- LinkedIn: `linkedin_import_quota`
- Migration: `migration-ledger`
- Mobile/push: `device_push_tokens`, `push_subscriptions`
- Portfolio: `portfolio_exclusive_assignments`, `portfolio_history`, `portfolio_interactions`, `portfolio_premium_usernames`, `portfolio_reserved_usernames`, `portfolio_settings`, `portfolio_user_overrides`, `portfolio_username_rules`, `portfolio_visits`, `short_links`, `social_links`
- Profiles: `profiles`, `user_preferences`
- Rate limiting/cache: `rpc_rate_limits`, `tool_cache`
- Resumes: `resume_certifications`, `resume_educations`, `resume_experiences`, `resume_shares`, `resume_snapshots`, `resume_versions`, `resumes`
- Sharing: `share_comments`
- Store/app screenshots: `store_screenshots`
- Talent pool: `talent_pool_profiles`, `talent_pool_views`
- WiseHire: `wisehire_applications`, `wisehire_bulk_screen_jobs`, `wisehire_candidate_briefs`, `wisehire_candidate_notes`, `wisehire_candidates`, `wisehire_clients`, `wisehire_companies`, `wisehire_invites`, `wisehire_mask_sessions`, `wisehire_outreach_emails`, `wisehire_pipeline_events`, `wisehire_roles`, `wisehire_saved_searches`, `wisehire_scorecard_templates`, `wisehire_scorecards`, `wisehire_waitlist`

Launch-critical collection attributes to verify:
- `ai_credits`: `user_id`, `daily_usage`, `daily_limit`, `total_usage`, `usage_date`
- `subscriptions`: `user_id`, `plan`, `effective_plan`, `status`, `trial_plan`, `trial_expires_at`
- `ai_routing_config`: `feature_id`, `provider`, `model`

## Function IDs From Deployment Script

`scripts/deploy_hubs.cjs` defines these function IDs:

- `resume-section-ai`
- `job-import`
- `ai-gateway`
- `coupons`
- `wisehire-gateway`
- `public-share`
- `ai-health`
- `admin-devkit-data`
- `admin-email`
- `admin-testmail`
- `admin-feature-flags`
- `admin-moderation`
- `admin-portfolio-usernames`
- `admin-visitor-analytics`
- `admin-onboarding-funnel`
- `admin-impersonate`
- `inspect-ai-keys`
- `admin-deploy-hubs`
- `legacy-payment-webhook`
- `email-service`

## Required Env Vars

Core Appwrite function env vars:
- `APPWRITE_API_KEY`
- `APPWRITE_FUNCTION_API_KEY` where Appwrite runtime provides it
- `APPWRITE_ENDPOINT`
- `APPWRITE_FUNCTION_API_ENDPOINT`
- `APPWRITE_PROJECT_ID`
- `APPWRITE_FUNCTION_PROJECT_ID`

AI provider env vars:
- `GROQ_KEY_1`, `GROQ_KEY_2`, `GROQ_KEY_3`
- `OPENROUTER_KEY_1`, `OPENROUTER_KEY_2`, `OPENROUTER_KEY_3`
- `DEEPSEEK_KEY`
- `NVIDIA_KEY_1`, `NVIDIA_KEY_2`, `NVIDIA_KEY_3`

Email env vars:
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_FROM_NAME`
- `FRONTEND_URL`

Admin/ops env vars:
- `DEVKIT_PASSWORD`
- `GITHUB_REPO`

Billing env vars:
- `removed payment webhook secret`

## Required Execute Policy

Production function execute access must be verified in Appwrite Console:

- AI functions `ai-gateway` and `resume-section-ai`: may remain executable by the frontend Appwrite SDK, but now must reject AI work unless a valid Appwrite user JWT is supplied in `__headers['X-Appwrite-JWT']`, request `X-Appwrite-JWT`, or `Authorization: Bearer <jwt>`.
- Smoke-test bypass: allowed only when `x-smoke-test` is present and only returns health/provider availability data.
- Public/anonymous allowed intentionally only where product behavior requires it: public share verification/read paths, waitlist checks, legacy payment provider webhook with secret authorization, and guarded smoke tests.
- legacy payment provider webhook: may be public-executable at the Appwrite layer only if `removed payment webhook secret` is set and the configured `Authorization` header matches.
- Admin functions: require DevKit/admin controls and must not expose public write paths.

## P0 Fix Implementation Notes

- `ai-gateway` and `resume-section-ai` now validate Appwrite sessions server-side with `Account.get()` before provider-backed AI calls.
- AI credit checks use `ai_credits` and subscription plan data from `subscriptions`.
- Credit limit sentinel for unlimited premium is `daily_limit = -1`.
- Rate limiting is currently a warm-instance in-memory throttle per user/action. This is server-side and blocks direct browser bypasses, but it is not globally atomic across cold starts or multiple Appwrite instances.
- Credit increments happen after successful provider-backed AI responses. Appwrite document updates are not SQL transactions, so concurrent requests can race; production should monitor for overage until a stronger atomic pattern is available.

## Production Console Verification Checklist

- Confirm database `main` exists.
- Confirm all launch-critical collections and attributes above exist.
- Confirm `ai_credits` documents can be read by their owning user.
- Confirm AI functions have all required Appwrite, AI provider, and email env vars.
- Confirm `legacy-payment-webhook` has `removed payment webhook secret`.
- Confirm only intended public functions are executable anonymously.
- Confirm Appwrite function logs do not contain resume text, job descriptions, prompts, or AI responses.

