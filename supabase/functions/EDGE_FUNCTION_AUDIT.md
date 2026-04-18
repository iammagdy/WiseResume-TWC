# Edge Function Audit

Last updated: 2026-04-18 (Task #1 / Phase 7)

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
| `generate-cover-letter` | Cover Letter sheet (writes will be persisted to `cover_letters` once that table is deployed — see Task #1 Phase 5) |
| `generate-resignation-letter` | Resignation Letter sheet (same as above for `resignation_letters`) |

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

## Ghost functions (deployed on Supabase but not in this repo)

These four show up in the Supabase project but have **no source** in
`supabase/functions/`. They cannot be re-deployed from this repo; they should
either be (a) pulled back into the repo if still needed, or (b) deleted from
the Supabase dashboard.

| Function | Status / recommendation |
|---|---|
| `clerk-webhook` | Leftover from a prior Clerk auth integration. Kinde is the active provider. **Delete from Supabase dashboard.** |
| `fetch-github-projects` | Writes to `profiles.github_projects_cache`. Retain only if a "Sync GitHub" UI is wired up; otherwise delete. |
| `proofread-resume` | Pull deployed source into the repo, or delete. |
| `send-bug-report` | Pull deployed source into the repo, or delete. |

## Orphaned / pending wire-up (kept for now)

| Function | Status |
|---|---|
| `generate-store-screenshots` | No frontend callers. CI / one-off use only. Mark CI-only or delete. |
