# Edge Functions Index

**Last verified:** 2026-05-08 (full reconciliation against `supabase/functions/`)
**Type:** index
**Sources:**
- `supabase/functions/` (82 deployed functions, after Tasks #49–#56 consolidations)
- `supabase/functions/EDGE_FUNCTION_AUDIT.md`
- `supabase/config.toml`

**Canonical owner:** `supabase/functions/` directory.

---

## Admin DevKit (21)

- [admin-ai-ops](./admin-ai-ops.md) — AI keys, slot models, nightly model catalog refresh
- [admin-audit-logs](./admin-audit-logs.md)
- [admin-check-access](./admin-check-access.md)
- [admin-config](./admin-config.md) — **consolidated** (5→1): get/update settings, feature flags, integrations, env-check
- [admin-delete-user](./admin-delete-user.md) — kept isolated for blast-radius
- [admin-devkit-data](./admin-devkit-data.md) — analytics, usage, system health aggregation
- [admin-email](./admin-email.md)
- [admin-get-identity](./admin-get-identity.md)
- [admin-impersonate](./admin-impersonate.md)
- [admin-kinde-reconcile](./admin-kinde-reconcile.md)
- [admin-list-user-content](./admin-list-user-content.md)
- [admin-list-users](./admin-list-users.md)
- [admin-merge-identity](./admin-merge-identity.md)
- [admin-moderation](./admin-moderation.md)
- [admin-onboarding-funnel](./admin-onboarding-funnel.md)
- [admin-owner-ops](./admin-owner-ops.md)
- [admin-portfolio-usernames](./admin-portfolio-usernames.md)
- [admin-save-note](./admin-save-note.md)
- [admin-user-ops](./admin-user-ops.md) — **consolidated** (7→1): suspend, grant/revoke trial, set credits/plan, revoke sessions, update profile
- [admin-visitor-analytics](./admin-visitor-analytics.md)
- [admin-wisehire](./admin-wisehire.md) — **consolidated** (4→1): invite, reset-user, revoke-invite, waitlist

## WiseHire (9)

- [wisehire-access](./wisehire-access.md) — **consolidated** (5→1): waitlist-check/join, validate early-access/invite, complete-signup
- [wisehire-bulk-screen](./wisehire-bulk-screen.md)
- [wisehire-generate-brief](./wisehire-generate-brief.md)
- [wisehire-invite-reminder](./wisehire-invite-reminder.md) — pg_cron trigger
- [wisehire-mask-cvs](./wisehire-mask-cvs.md)
- [wisehire-send-outreach](./wisehire-send-outreach.md)
- [wisehire-talent-search](./wisehire-talent-search.md)
- [wisehire-talent-view](./wisehire-talent-view.md)
- [wisehire-write-jd](./wisehire-write-jd.md)

## AI / Editor (16)

- [agentic-chat](./agentic-chat.md)
- [ai-health](./ai-health.md)
- [ai-test](./ai-test.md)
- [ask-portfolio](./ask-portfolio.md) — RAG over portfolio
- [career-assessment](./career-assessment.md)
- [company-briefing](./company-briefing.md)
- [detect-and-humanize](./detect-and-humanize.md)
- [editor-ai](./editor-ai.md) — **consolidated** (4→1): analyze, recruiter-sim, suggest-template, optimize-for-linkedin
- [generate-cover-letter](./generate-cover-letter.md)
- [generate-fix-suggestions](./generate-fix-suggestions.md)
- [generate-portfolio-bio](./generate-portfolio-bio.md)
- [generate-question-bank](./generate-question-bank.md)
- [generate-resignation-letter](./generate-resignation-letter.md)
- [resume-section-ai](./resume-section-ai.md) — **consolidated** (4→1): enhance, tailor, fill-gap, explain-gap
- [score-resume](./score-resume.md)
- [smart-fit-rewrite](./smart-fit-rewrite.md)
- [tailor-resume](./tailor-resume.md)
- [validate-tailor](./validate-tailor.md) — deterministic + AI qualitative
- [wise-ai-chat](./wise-ai-chat.md)

(Note: `analyze-resume`, `recruiter-simulation`, `suggest-template`, `optimize-for-linkedin`, `enhance-section`, `tailor-section`, `fill-gap`, `explain-gap` remain deployed as legacy fallbacks but the active routing is via `editor-ai` / `resume-section-ai`.)

## Auth & Identity (6)

- [auth-email-hook](./auth-email-hook.md) — Supabase Auth webhook (signed)
- [kinde-webhook](./kinde-webhook.md) — Kinde lifecycle webhook (signed)
- [me](./me.md) — unified profile / plan / credits
- [send-password-reset](./send-password-reset.md) — Kinde M2M + Resend
- [token-exchange](./token-exchange.md) — Kinde JWT → Supabase JWT bridge
- [verify-dev-kit](./verify-dev-kit.md) — admin DevKit auth
- [verify-email](./verify-email.md) — custom email verification (send/resend/confirm)

## Billing & Mobile Subscriptions (4)

- [coupons](./coupons.md) — **consolidated** (3→1): admin-manage, redeem, validate
- [manage-api-keys](./manage-api-keys.md) — BYOK key storage (legacy; BYOK fully removed but endpoint retained for compat)
- [revenuecat-webhook](./revenuecat-webhook.md) — RevenueCat IAP entitlement reconciliation
- [validate-api-key](./validate-api-key.md)

## Mobile (2)

- [mobile-api](./mobile-api.md) — **consolidated**: register-push-token, export-pdf, interview-next-question, interview-grade-answer
- [mobile-config](./mobile-config.md) — version gate + banner

## Notifications & Email (2)

- [send-push](./send-push.md) — server-to-server Expo push fan-out
- [transactional-email](./transactional-email.md) — **consolidated** (3→1): contact-email, contact-request, resume-reminder

## Portfolio & Public (4)

- [create-portfolio-session](./create-portfolio-session.md) — password-protected portfolio session
- [og-image](./og-image.md) — dynamic OpenGraph PNG
- [portfolio-public](./portfolio-public.md) — **consolidated** (4→1): meta, interest, track-view, resolve-short-link
- [stitch-visitor-identity](./stitch-visitor-identity.md) — link anon visitor → user post-signup

## Visitor / Cron / Maintenance (5)

- [hard-purge](./hard-purge.md) — admin-only full user data delete
- [purge-old-visitor-events](./purge-old-visitor-events.md) — pg_cron trigger
- [track-handle-interest](./track-handle-interest.md) — premium portfolio handle interest leads
- [track-visitor-event](./track-visitor-event.md) — anonymous visitor analytics ingest
- [weekly-digest](./weekly-digest.md) — pg_cron user digest emails

## Misc (3)

- [export-portfolio-pdf](./export-portfolio-pdf.md) — server-side Puppeteer
- [export-resume-pdf](./export-resume-pdf.md) — server-side Puppeteer (with browser fallback)
- [fetch-url](./fetch-url.md) — SSRF-protected URL proxy
- [parse-job](./parse-job.md)
- [parse-resume](./parse-resume.md)

---

## Total: 82 functions

## Consolidation summary (Tasks #49–#56)

| Router | Replaced | Slots freed |
|---|---|---|
| `admin-config` | 5 fns | 4 |
| `admin-user-ops` | 7 fns | 6 |
| `admin-wisehire` | 4 fns | 3 |
| `coupons` | 3 fns | 2 |
| `editor-ai` | 4 fns (kept as fallback) | 0 net |
| `resume-section-ai` | 4 fns (kept as fallback) | 0 net |
| `portfolio-public` | 4 fns | 3 |
| `transactional-email` | 3 fns | 2 |
| `wisehire-access` | 5 fns | 4 |
| `mobile-api` | 4 fns | 3 |
| **Total slots freed** | | **~27** |

Goal: stay below Supabase's 100-function project deployment limit.

## Maintenance — adding a new edge function

1. Create `supabase/functions/<name>/index.ts`.
2. Add `verify_jwt = false` in `supabase/config.toml`.
3. Wire the four security layers (see `../critical-systems/09-security-model.md`).
4. Wrap with `wrapHandler('<name>', ...)` from `_shared/fnLogger.ts`.
5. Add a reference card here.
6. Update this index.
