# Edge Function Audit

Last updated: 2026-05-06 (Production routing fixes — 3 new functions added: `export-resume-pdf`, `fetch-url`, `track-handle-interest`. deployed↔source 77↔77)

## Phase 2 Triage Outcome (Task #66, 2026-05-03)

Supabase Management API is the sole source of truth. Deployed↔source is 1:1
(74 ↔ 74, zero drift). Every one of the 16 Phase-1 H3 orphan candidates has a
legitimate non-frontend caller and is **KEEP**. Zero deletions performed.

| Function | Disposition | Caller / Justification |
|---|---|---|
| `admin-check-access` | KEEP | Internal helper invoked by other `admin-*` functions to short-circuit unauthorized callers (DevKit gate). |
| `ask-portfolio` | KEEP | Public portfolio chat — called by `/p/:slug` page. |
| `auth-email-hook` | KEEP | Supabase Auth Hook (HMAC-signed). Phase 1 added `__probe:true` short-circuit + signed CI probe pair. |
| `create-portfolio-session` | KEEP | Public portfolio page-load analytics session opener. |
| `export-portfolio-pdf` | KEEP | Web portfolio download + mobile (called via `mobile-api` router). |
| `generate-question-bank` | KEEP | Interview prep sheet. |
| `hard-purge` | KEEP | Admin GDPR purge — invoked manually from the Supabase dashboard / DevKit. |
| `kinde-webhook` | KEEP | Kinde webhook for instant user provisioning (HMAC-signed). Phase 1 added signed CI probe pair. |
| `mobile-config` | KEEP | Expo cold-start config bootstrap. **Phase 3 flag**: deployed `verify_jwt=true` blocks real anon callers — see §6 M2 follow-up. |
| `og-image` | KEEP | Dynamic OpenGraph image for portfolio link previews. |
| `parse-resume` | KEEP | Resume upload parser (called from upload flow). |
| `revenuecat-webhook` | KEEP | RevenueCat entitlement webhook (shared-secret in `Authorization`). **Phase 3 flag**: deployed `verify_jwt=true` blocks RevenueCat callers — see §6 M2 follow-up. |
| `send-push` | KEEP | Server-to-server Expo push fan-out (`EDGE_INTERNAL_TOKEN` in `x-internal-token`). **Phase 3 flag**: deployed `verify_jwt=true` blocks internal callers — see §6 M2 follow-up. |
| `suggest-template` | KEEP | Editor template advisor sheet. |
| `weekly-digest` | KEEP | pg_cron weekly digest email. |
| `wisehire-invite-reminder` | KEEP | pg_cron WiseHire invite reminder email. |

`supabase/config.toml` reconciled: every deployed function now has a
`[functions.<name>]` block matching real `verify_jwt`. The stale NOTE
claiming `export-portfolio-pdf`, `mobile-config`, `revenuecat-webhook`,
and `send-push` were "never deployed" has been removed — they were and
are deployed; the missing config blocks (default `verify_jwt=true`) had
been masking the gateway-vs-handler auth-posture mismatch tracked above.

## Server-to-Server / Platform Hooks

These functions are **not** called from the frontend. They are invoked by Supabase
platform hooks, cron jobs, or other backend services. Do not confuse a missing
frontend call site with broken or dead code.

| Function | Trigger / Caller |
|---|---|
| `auth-email-hook` | Supabase Auth Hook — fires on sign-up, password reset, magic link |
| `token-exchange` | Backend OAuth flow — exchanges Kinde auth codes for Supabase JWTs |
| `weekly-digest` | Supabase cron — sends weekly career digest emails |
| `send-resume-reminder` | Supabase cron — sends reminder emails to inactive users |
| `og-image` | Open Graph image generation — called by portfolio page meta tags |
| `portfolio-meta` | Portfolio metadata endpoint — called by crawlers / sharing previews |
| `track-portfolio-view` | Portfolio analytics — called by public portfolio pages |
| `resolve-short-link` | Short-link resolver — called by link redirects |
| `hard-purge` | Manual GDPR data-purge — invoked by an admin from the Supabase dashboard |
| `admin-check-access` | Internal helper — invoked by other `admin-*` functions to short-circuit unauthorized callers |
| `delete-expired-trial-resumes` | Supabase cron — deletes expired trial resumes |
| `analytics-sweep` | Supabase cron — prunes old `audit_logs` / `error_log` rows |
| `kinde-webhook` | Kinde webhook endpoint — receives `user.created` events and immediately provisions auth.users / profiles / user_preferences. Requires `KINDE_WEBHOOK_SECRET`. |
| `admin-kinde-reconcile` | One-shot admin backfill — pages Kinde Management API, provisions any users missing from DB. Requires `KINDE_M2M_CLIENT_ID` + `KINDE_M2M_CLIENT_SECRET`. |

## Active Frontend-Called Functions

These have confirmed call sites in `src/`:

| Function | Call Sites |
|---|---|
| `wise-ai-chat` | All 7 AI Studio sheets (ColdEmail, JobRejection, PersonalBranding, PortfolioBio, ReferenceLetter, SalaryNegotiation, SkillsGap) |
| `agentic-chat` | Main AI assistant chat |
| `parse-job-url` | `src/lib/aiTailor.ts`, `src/components/applications/AddApplicationSheet.tsx` |
| `suggest-template` | `src/components/editor/TemplateAdvisorSheet.tsx` |
| `ai-test` | `src/components/dev-kit/DevKitRunner.tsx`, `src/components/settings/AISettingsSheet.tsx` |
| `generate-cover-letter` | Cover Letter sheet — each generation is persisted to `cover_letters` via `_shared/letterPersistence.ts` |
| `generate-resignation-letter` | Resignation Letter sheet — each generation is persisted to `resignation_letters` via `_shared/letterPersistence.ts` |

## New Functions (2026-05-06 — Production routing fixes)

| Function | Purpose |
|---|---|
| `export-resume-pdf` | Server-side resume PDF export. Accepts serialised DOM HTML + options; forwards to `PDF_RENDERER_URL` (same renderer as `export-portfolio-pdf`). Returns 503 `text/html` when renderer not configured — triggers `PDFServerUnavailableError` → browser print fallback. Replaces the direct Express `/api/export/pdf-native` call in production. |
| `fetch-url` | SSRF-safe URL proxy for resume/LinkedIn import. Validates hostname against private IP ranges, follows redirects safely (max 5 hops), caps response at 2 MB, enforces 10 s timeout. Returns `{ url, contentType, html }`. Replaces the direct Express `/api/fetch-url` call in production. |
| `track-handle-interest` | Fire-and-forget Resend audience add. Checks `profiles.handle_type`; if user has a free handle, adds their email to `RESEND_AUDIENCE_HANDLE_INTEREST` audience. Always returns `{ success: true }`. Replaces the direct Express `/api/track-handle-interest` call in production. |

## Removed from repo (no callers)

These source directories were deleted because they have **zero callers** anywhere
in `src/` or in any other edge function.

| Function | Why removed | Date |
|---|---|---|
| `wisehire-apply` | No frontend / hook callers; flow now goes through `wisehire-bulk-screen` and direct candidate insertion. | 2026-04-18 |
| `send-feature-request` | All UI now uses `send-contact-email`. | 2026-04-18 |
| `send-contact-inquiry` | Same — UI consolidated on `send-contact-email`. | 2026-04-18 |
| `generate-store-screenshots` | No frontend callers and no CI usage confirmed. Removed from repo to keep function list clean. | 2026-04-30 |
| `interview-chat` | Full AI interview coach implementation but no frontend component ever called it. Feature never shipped in UI. Deleted from Supabase and repo to free a deployment slot. Re-deploy when the interview feature UI is built. | 2026-04-24 |
| `send-push-notification` | Admin-gated Web Push sender. No admin UI or DevKit panel called it — push notification feature was dormant. | 2026-04-24 |
| `admin-revoke-devkit-sessions` | DevKit session revocation tool superseded by `admin-revoke-sessions`. No call sites anywhere in `src/`. | 2026-04-24 |
| `admin-reset-credits` | Ghost reference only — called in `AppSettingsPanel.tsx` with a graceful "not deployed" fallback, but the function directory never existed and was never deployed. UI reference removed. | 2026-04-24 |

## Ghost Functions — Resolved

These were previously deployed on Supabase with no source in this repo.
All four were confirmed absent from the Supabase dashboard (API returned 404)
on 2026-04-30, meaning they had already been removed. No further action needed.

| Function | Reason | Status |
|---|---|---|
| `clerk-webhook` | Leftover from prior Clerk auth integration — Kinde is the active provider. | Confirmed gone 2026-04-30 |
| `fetch-github-projects` | No active frontend caller. | Confirmed gone 2026-04-30 |
| `proofread-resume` | No source in this repo. | Confirmed gone 2026-04-30 |
| `send-bug-report` | No source in this repo. | Confirmed gone 2026-04-30 |

## Known Missing Secret

| Secret | Impact | Action |
|---|---|---|
| `ELEVENLABS_API_KEY` | Voice interview coach and scribe transcription unavailable for users without a personal ElevenLabs key (BYOK). Text interview works. | Add to Supabase project secrets when ready. |
| `KINDE_WEBHOOK_SECRET` | `kinde-webhook` function returns 401 for all events — no instant provisioning on signup. Users are still provisioned JIT on first login via token-exchange. | Add in Kinde dashboard (Settings → Webhooks → signing secret) then save the value as a Supabase Edge Function secret. |
