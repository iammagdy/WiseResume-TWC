# transactional-email

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/functions/transactional-email/index.ts`, `supabase/functions/EDGE_FUNCTION_AUDIT.md` (Task #55)

---

## What it does

Consolidated router for the 3 Resend-backed transactional email functions. Replaces (3 → 1):

| `body.action` | Was | Auth | Purpose |
|---|---|---|---|
| `contact-email` | `send-contact-email` | Public; optional Bearer for user resolution | Contact / bug / feature / username-request / auto-crash-report email to `contact@thewise.cloud`. Per-IP and per-user rate limiting. Supports `dry_run = true` (saves to DB but does not send). |
| `contact-request` | `submit-contact-request` | Public; honeypot field | Anonymous public contact form with bot-detection honeypot |
| `resume-reminder` | `send-resume-reminder` | `requireCronSecret` (`x-cron-secret`) | Cron-only: scans inactive users and sends a "your resume is waiting" reminder |

## Dispatch

- **Primary:** `body.action`
- **Fallback:** `x-transactional-email-action` header — used because the cron job that fires `resume-reminder` posts an empty body.

## Critical: NO router-level auth

Each handler has its OWN auth posture and they intentionally differ. Hoisting auth would have broken `contact-email`'s `dry_run` semantics and `contact-request`'s anonymous public path.

## Rate limit (`contact-email`)

- `RATE_LIMIT_REQUESTS_PER_HOUR = 3` per IP — must match SQL function `check_email_rate_limit`.

## Email content

Subject prefixes: `[Bug Report]`, `[Auto Crash Report]`, `[Inquiry - <Department>]`, `[Feature Request]`, `Username Requested: <handle>`.

Logo URL: `https://jnsfmkzgxsviuthaqlyy.supabase.co/storage/v1/object/public/avatars/email-assets/wise-ai-logo.png`.

**Do NOT modify** any template, copy, branding, or Resend account/domain — out of scope per Task #55.

## DB tables

- `contact_requests`, `notifications`, `resumes` (resume-reminder query), plus `audit_logs`
