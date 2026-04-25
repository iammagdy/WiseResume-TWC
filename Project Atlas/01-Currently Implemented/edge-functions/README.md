# Edge Functions Index

  **Last verified:** 2026-04-18
  **Type:** index
  **Sources:**
  - `supabase/functions/` (93 deployed functions as of 2026-04-24, after Task #21 removed 5 orphans — `admin-backfill-ollama-urls`, `admin-migrate-api-key-encryption`, `ai-breaker-status`, `elevenlabs-scribe-token`, `generate-headshot`. See `../critical-systems/08-deployment.md` → "Orphan removal log".)
  - `project-governance/ARCHITECTURE.md` §7 (Edge Functions inventory)
  - `supabase/functions/EDGE_FUNCTION_AUDIT.md` (when available)

  **Canonical owner:** `project-governance/ARCHITECTURE.md` §7.

  ---

  ## Admin Dev Kit (27)

- [admin-analytics](./admin-analytics.md)
- [admin-audit-logs](./admin-audit-logs.md)
- [admin-check-access](./admin-check-access.md)
- [admin-delete-user](./admin-delete-user.md)
- [admin-email-actions](./admin-email-actions.md)
- [admin-env-check](./admin-env-check.md)
- [admin-get-identity](./admin-get-identity.md)
- [admin-get-settings](./admin-get-settings.md)
- [admin-github-status](./admin-github-status.md)
- [admin-grant-trial](./admin-grant-trial.md)
- [admin-list-user-content](./admin-list-user-content.md)
- [admin-list-users](./admin-list-users.md)
- [admin-live-activity](./admin-live-activity.md)
- [admin-manage-coupons](./admin-manage-coupons.md)
- [admin-merge-identity](./admin-merge-identity.md)
- [admin-onboarding-funnel](./admin-onboarding-funnel.md)
- [admin-portfolio-usernames](./admin-portfolio-usernames.md)
- [admin-revoke-sessions](./admin-revoke-sessions.md)
- [admin-revoke-trial](./admin-revoke-trial.md)
- [admin-save-note](./admin-save-note.md)
- [admin-set-credits](./admin-set-credits.md)
- [admin-set-plan](./admin-set-plan.md)
- [admin-suspend-user](./admin-suspend-user.md)
- [admin-update-profile](./admin-update-profile.md)
- [admin-update-settings](./admin-update-settings.md)
- [admin-wisehire-invite](./admin-wisehire-invite.md)
- [admin-wisehire-waitlist](./admin-wisehire-waitlist.md)

## WiseHire (12)

- [wisehire-apply](./wisehire-apply.md)
- [wisehire-bulk-screen](./wisehire-bulk-screen.md)
- [wisehire-complete-signup](./wisehire-complete-signup.md)
- [wisehire-generate-brief](./wisehire-generate-brief.md)
- [wisehire-mask-cvs](./wisehire-mask-cvs.md)
- [wisehire-send-outreach](./wisehire-send-outreach.md)
- [wisehire-talent-search](./wisehire-talent-search.md)
- [wisehire-talent-view](./wisehire-talent-view.md)
- [wisehire-validate-early-access](./wisehire-validate-early-access.md)
- [wisehire-validate-invite](./wisehire-validate-invite.md)
- [wisehire-waitlist-join](./wisehire-waitlist-join.md)
- [wisehire-write-jd](./wisehire-write-jd.md)

## AI (25)

- [agentic-chat](./agentic-chat.md)
- [ai-health](./ai-health.md)
- [ai-test](./ai-test.md)
- [analyze-resume](./analyze-resume.md)
- [auth-email-hook](./auth-email-hook.md)
- [career-assessment](./career-assessment.md)
- [career-path-advisor](./career-path-advisor.md)
- [company-briefing](./company-briefing.md)
- [detect-and-humanize](./detect-and-humanize.md)
- [enhance-section](./enhance-section.md)
- [explain-gap](./explain-gap.md)
- [generate-cover-letter](./generate-cover-letter.md)
- [generate-portfolio-bio](./generate-portfolio-bio.md)
- [generate-question-bank](./generate-question-bank.md)
- [generate-resignation-letter](./generate-resignation-letter.md)
- [generate-store-screenshots](./generate-store-screenshots.md)
- [optimize-for-linkedin](./optimize-for-linkedin.md)
- [parse-job-text](./parse-job-text.md)
- [parse-job-url](./parse-job-url.md)
- [parse-linkedin](./parse-linkedin.md)
- [parse-resume](./parse-resume.md)
- [send-contact-email](./send-contact-email.md)
- [tailor-resume](./tailor-resume.md)
- [tailor-section](./tailor-section.md)
- [wise-ai-chat](./wise-ai-chat.md)

## Auth & Identity (3)

- [me](./me.md)
- [token-exchange](./token-exchange.md)
- [verify-dev-kit](./verify-dev-kit.md)

## Billing & Credits (3)

- [manage-api-keys](./manage-api-keys.md)
- [redeem-coupon](./redeem-coupon.md)
- [validate-coupon](./validate-coupon.md)

## Portfolio & Public (7)

- [ask-portfolio](./ask-portfolio.md)
- [create-portfolio-session](./create-portfolio-session.md)
- [og-image](./og-image.md)
- [portfolio-interest](./portfolio-interest.md)
- [portfolio-meta](./portfolio-meta.md)
- [resolve-short-link](./resolve-short-link.md)
- [track-portfolio-view](./track-portfolio-view.md)

## Notifications (1)

- [send-push-notification](./send-push-notification.md)

## Data & Maintenance (2)

- [hard-purge](./hard-purge.md)
- [score-resume](./score-resume.md)

## Other (11)

- [fill-gap](./fill-gap.md)
- [interview-chat](./interview-chat.md)
- [one-page-optimizer](./one-page-optimizer.md)
- [recruiter-simulation](./recruiter-simulation.md)
- [send-contact-inquiry](./send-contact-inquiry.md)
- [send-feature-request](./send-feature-request.md)
- [send-resume-reminder](./send-resume-reminder.md)
- [submit-contact-request](./submit-contact-request.md)
- [suggest-template](./suggest-template.md)
- [validate-api-key](./validate-api-key.md)
- [weekly-digest](./weekly-digest.md)

---

  **Total:** 94 functions.

  **Maintenance:** when you add an edge function:
  1. Create `supabase/functions/<name>/index.ts`.
  2. Add `verify_jwt = false` in `supabase/config.toml` if it uses Kinde-issued JWTs.
  3. Wire the four security layers (critical-system 09).
  4. Add a reference card here.
  5. Update this index and `project-governance/ARCHITECTURE.md` §7.
  