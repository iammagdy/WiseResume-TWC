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
| `generate-cover-letter` | Cover Letter sheet — each generation is persisted to `cover_letters` via `_shared/letterPersistence.ts` |
| `generate-resignation-letter` | Resignation Letter sheet — each generation is persisted to `resignation_letters` via `_shared/letterPersistence.ts` |

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

## ⚠️ Ghost Functions — MANUAL DASHBOARD DELETION REQUIRED

The four functions below are deployed on Supabase but have **no source in this repo**.
They cannot be updated or monitored from CI. They should be deleted from the
Supabase dashboard by a developer with admin access.

**Until deleted, update the "Deletion Status" column below with the date and your name
to confirm the action is complete.**

### How to delete them

1. Open [Supabase Dashboard → Edge Functions](https://supabase.com/dashboard).
2. Find each function in the table below.
3. Click the function → Settings → Delete.
4. After deleting, edit this file and change `PENDING DELETION` to
   `DELETED <YYYY-MM-DD> by <engineer-name>`.

| Function | Reason for removal | Deletion Status |
|---|---|---|
| `clerk-webhook` | Leftover from a prior Clerk auth integration. Kinde is the active provider — this webhook is dead code. | **PENDING DELETION** |
| `fetch-github-projects` | No active frontend caller. Only needed if a "Sync GitHub" UI exists (confirmed: none). | **PENDING DELETION** |
| `proofread-resume` | No source in this repo. Pull deployed source back in if still needed, otherwise delete. | **PENDING DELETION** |
| `send-bug-report` | No source in this repo. Pull deployed source back in if still needed, otherwise delete. | **PENDING DELETION** |

> **Note:** The actual dashboard deletion is a human action and cannot be automated
> from this repository. This file serves as the tracking record. Once a developer
> has completed the deletions, they should update the table above and commit the change.

## Orphaned / pending wire-up (kept for now)

| Function | Status |
|---|---|
| `generate-store-screenshots` | No frontend callers. CI / one-off use only. Mark CI-only or delete. |
