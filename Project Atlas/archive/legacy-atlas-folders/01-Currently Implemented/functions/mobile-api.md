# mobile-api

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/functions/mobile-api/index.ts`, `supabase/functions/_shared/pdfRenderer.ts`

---

## What it does

Consolidated mobile-only router. The Expo client (`/mobile`) calls this single function with `{ action, ...payload }` instead of 6 separate functions, keeping the project under Supabase's 100-function deployment limit.

**Auth:** `requireAuth` (Kinde-bridge JWT) for every action.

## Actions

| `body.action` | Was | Purpose |
|---|---|---|
| `register-push-token` | `register-push-token` | Upsert into `device_push_tokens` (token, platform ios/android/web, app_version, device_id, locale, last_seen_at) |
| `export-pdf {kind, id}` | `export-{resume,cover-letter,resignation-letter}-pdf` | Renders a PDF for the chosen artifact via shared `renderArtifactPdf` |
| `interview-next-question` | `interview-next-question` | Returns the next question (AI-generated; falls back to `FALLBACK_BANK` per category: behavioral / technical / system-design / general) |
| `interview-grade-answer` | `interview-grade-answer` | AI-grades the user's answer; deducts a credit via `checkAndDeductCredit`, refunds via `refundCredit` on AI error |

## DB tables

- `device_push_tokens` (push registration)
- `resumes`, `cover_letters`, `resignation_letters` (PDF source rows)
- `interview_attempts` (interview grading writes)

## Column-name parity

All reads/writes use PROD column names verified against the `jnsfmkzgxsviuthaqlyy` project on 2026-05-03: `content`, `template_id`, `current_role`, `notice_period`, `recipient_name`.

## External services

- AI cascade via `callAI` (OpenRouter / Groq / Gemini per `featureName`)
- Internal storage write via `renderArtifactPdf`
