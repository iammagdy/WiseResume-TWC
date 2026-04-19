# Edge Function Audit

Last updated: 2026-04-19 (Task #3 — Backend Audit follow-up)

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

## Active Frontend-Called Functions

These have confirmed call sites in `src/`:

| Function | Call Sites |
|---|---|
| `wise-ai-chat` | All 7 AI Studio sheets (ColdEmail, JobRejection, PersonalBranding, PortfolioBio, ReferenceLetter, SalaryNegotiation, SkillsGap) |
| `agentic-chat` | Main AI assistant chat |
| `parse-job-url` | `src/lib/aiTailor.ts`, `src/components/applications/AddApplicationSheet.tsx` |
| `suggest-template` | `src/components/editor/TemplateAdvisorSheet.tsx` |
| `ai-test` | `src/components/dev-kit/DevKitRunner.tsx`, `src/components/settings/AISettingsSheet.tsx` |
| `generate-cover-letter` | Cover Letter sheet — letters are persisted to `cover_letters` on each successful generation |
| `generate-resignation-letter` | Resignation Letter sheet — letters are persisted to `resignation_letters` on each successful generation |

## Removed in Task #1 / Phase 7 (2026-04-18)

These source directories were deleted from `supabase/functions/` because they
have **zero callers** anywhere in `src/` or in any other edge function. If a
deployed copy still exists on Supabase, it should be deleted from the
Supabase dashboard the next time someone has admin access.

| Function | Why removed | Replacement |
|---|---|---|
| `wisehire-apply` | No frontend / hook callers; the WiseHire "apply" flow now goes through `wisehire-bulk-screen` and direct candidate insertion. | `wisehire-bulk-screen` |
| `send-feature-request` | All UI now uses `send-contact-email`. | `send-contact-email` |
| `send-contact-inquiry` | Same — UI consolidated on `send-contact-email`. | `send-contact-email` |

## Ghost functions — PENDING HUMAN ACTION

> ⚠️ **Action required:** A developer with Supabase dashboard access must manually
> delete the four functions below. They have **no source** in this repo and cannot
> be deployed, updated, or monitored from CI. Until deleted they consume project
> resources and represent an unaudited attack surface.
>
> **Steps:**
> 1. Open the Supabase dashboard → Edge Functions.
> 2. Delete each function listed in the table below.
> 3. Update the status column in this file from `PENDING DELETION` to
>    `CONFIRMED DELETED — <date> — <engineer>`.

These four were identified in the April 18 backend audit as deployed on Supabase
but absent from this repo:

| Function | Recommendation | Status |
|---|---|---|
| `clerk-webhook` | Leftover from a prior Clerk auth integration. Kinde is the active provider. Delete. | **PENDING DELETION** |
| `fetch-github-projects` | Writes to `profiles.github_projects_cache`. Delete if the "Sync GitHub" UI is not wired up (confirmed: no frontend caller). | **PENDING DELETION** |
| `proofread-resume` | No source in repo — pull the deployed source back in if still needed, otherwise delete. | **PENDING DELETION** |
| `send-bug-report` | No source in repo — pull the deployed source back in if still needed, otherwise delete. | **PENDING DELETION** |

## Orphaned / pending wire-up (kept for now)

| Function | Status |
|---|---|
| `generate-store-screenshots` | No frontend callers. CI / one-off use only. Mark CI-only or delete. |
