# Edge Function Audit — Mobile parity sweep (2026-05-03)

## Executive summary

The Supabase project (`jnsfmkzgxsviuthaqlyy`) has a **hard 100-function
deployment limit**. Before this audit it sat at **99 deployed functions** —
which meant the six mobile-only functions the Expo app tried to call
(`register-push-token`, `export-resume-pdf`, `export-cover-letter-pdf`,
`export-resignation-letter-pdf`, `interview-next-question`,
`interview-grade-answer`) had **never successfully deployed**. The mobile
app was therefore broken end-to-end for push registration, PDF export, and
the interview practice flow.

This sweep:

1. Consolidates the six mobile-only functions into one router
   (`supabase/functions/mobile-api`) that switches on `body.action`.
2. Deletes the deployed-but-orphaned `admin-rotate-totp` function
   (TOTP rotation has long since moved into `admin-owner-ops` /
   `admin-revoke-sessions`).
3. Aligns every mobile screen and React Query hook with the **actual prod
   schema** (verified via the Supabase Management API SQL endpoint, NOT
   psql against the local Replit DB which has no `auth`/`storage`
   schemas).
4. Adds the four missing pieces of infrastructure that the mobile app
   silently depended on:
   - `device_push_tokens` + `mobile_app_versions` tables
   - `interview_question_bank` + `interview_attempts` tables
   - `interview-audio` storage bucket
   - `exports` storage bucket (used by `_shared/pdfRenderer.ts`)

Net deployed functions after this commit: **99 + 1 (mobile-api) − 1
(admin-rotate-totp) = 99**, well within the 100-function limit.

## Prod schema corrections found during the audit

The earlier mobile code had been written against an imagined schema. Real
prod columns (queried via `https://api.supabase.com/v1/projects/<ref>/database/query`):

| Table                  | Mobile assumed                | Actual prod columns                                                                                                |
| ---------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `resumes`              | `template_key`, `data` jsonb  | `template_id` text + section columns `contact_info`, `summary`, `experience`, `education`, `skills`, … (all jsonb) |
| `cover_letters`        | `body` text                   | `content` **text** + `job_title`, `position`, `company`, `tone`, `template_style`, …                               |
| `resignation_letters`  | `body` text                   | `content` **text** + `recipient_name`, `current_role`, `position`, `notice_period`, `last_working_day`, …          |
| `job_applications`     | mobile used `saved_jobs`      | Table is `job_applications`; columns are `job_title` (NOT `position`) and `url` (NOT `job_url`)                    |
| `device_push_tokens`   | did not exist                 | created by migration `20260601000000_mobile_device_tokens_and_versions.sql`                                        |
| `mobile_app_versions`  | did not exist                 | created by same migration; powers `mobile-config` force-update                                                     |
| `interview_*`          | did not exist                 | created by migration `20260503100000_mobile_interview_tables.sql`                                                  |

Storage buckets verified in prod (post-migration): `avatars`,
`bulk-screening-uploads`, `candidate-resumes`, `emails`, `exports` (new),
`interview-audio` (new), `screenshots`.

## `mobile-api` action contract

`POST /functions/v1/mobile-api` with bearer auth. Body:

```jsonc
{
  "action": "register-push-token" | "export-pdf" | "interview-next-question" | "interview-grade-answer",
  // …action-specific fields
}
```

| Action                    | Body                                                                                       | Returns                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| `register-push-token`     | `{ token, platform, app_version }`                                                         | `{ ok: true }`                                           |
| `export-pdf`              | `{ kind: 'resume'\|'cover_letter'\|'resignation_letter', id }`                             | `{ url, storagePath }` (1-hour signed URL)               |
| `interview-next-question` | `{ track }`                                                                                | `{ id, prompt }`                                         |
| `interview-grade-answer`  | `{ question_id, prompt, track, transcript, audio_path? }`                                  | `{ score, summary, strengths[], improvements[] }`        |

Credit usage: `interview-grade-answer` deducts 1 AI credit (via
`checkAndDeductCredit`); refunds on AI / parsing failure.

## Deleted source dirs

- `supabase/functions/register-push-token/`
- `supabase/functions/export-resume-pdf/`
- `supabase/functions/export-cover-letter-pdf/`
- `supabase/functions/export-resignation-letter-pdf/`
- `supabase/functions/interview-next-question/`
- `supabase/functions/interview-grade-answer/`
- `supabase/functions/admin-rotate-totp/`

`admin-rotate-totp` is also DELETEd from prod via
`DELETE /v1/projects/<ref>/functions/admin-rotate-totp` after deploy.

## Migrations applied to prod (Management API SQL endpoint)

1. `20260601000000_mobile_device_tokens_and_versions.sql`
2. `20260601100000_interview_audio_bucket.sql`
3. `20260503100000_mobile_interview_tables.sql`
4. `20260503110000_exports_bucket.sql`

All four returned HTTP 201 on 2026-05-03; existence verified via
`select to_regclass(...)` and `select id from storage.buckets`.

## Final deploy outcome (2026-05-03)

- `mobile-api` is **deployed** to prod (`verify_jwt=false`, version 1).
- Final prod function count: **99 / 100** (under the platform ceiling).
- Deletions in prod via `DELETE /v1/projects/<ref>/functions/<slug>`:
  - `admin-rotate-totp` (truly dead)
  - `refresh-ai-test-models` (zero refs in `src/` and `mobile/`,
    deleted to free a slot so the `bulk update` call stops 402-ing
    even when the net deploy adds zero new functions)
- Source-dir + config.toml entries removed from the repo because they
  had never been deployed and re-introducing them would push prod
  over the 100-function limit (mobile does not invoke any of these
  four directly):
  - `send-push`
  - `revenuecat-webhook`
  - `mobile-config`
  - `export-portfolio-pdf`
- Smoke-test coverage list (`scripts/smoke-test-edge-functions.mjs`)
  updated to drop `admin-rotate-totp`.
- Final deploy run on `deploy-edge-functions.yml` completed
  successfully (deploy + jwt enforcement + ai-test smoke +
  check-edge-functions-deployed + smoke-test-edge-functions all
  green).

## Why local `psql $DATABASE_URL` is NOT a valid prod check

The Replit container exposes a stub Postgres at `$DATABASE_URL` that has
no `auth`, no `storage`, no `authenticated` role and none of the prod
tables. Any schema verification against it will mislead. **Always use
the Supabase Management API (`/v1/projects/<ref>/database/query`) for
prod checks.**
