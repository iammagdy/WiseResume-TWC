# Edge Function Audit

Last updated: 2026-04-22 (Task #17 — Kinde webhook + backfill reconcile)

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

## Removed from repo (no callers)

These source directories were deleted because they have **zero callers** anywhere
in `src/` or in any other edge function.

| Function | Why removed | Date |
|---|---|---|
| `wisehire-apply` | No frontend / hook callers; flow now goes through `wisehire-bulk-screen` and direct candidate insertion. | 2026-04-18 |
| `send-feature-request` | All UI now uses `send-contact-email`. | 2026-04-18 |
| `send-contact-inquiry` | Same — UI consolidated on `send-contact-email`. | 2026-04-18 |
| `generate-store-screenshots` | No frontend callers and no CI usage confirmed. Removed from repo to keep function list clean. | 2026-04-30 |

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
