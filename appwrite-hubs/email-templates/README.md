# Appwrite Auth Email Templates

These are the branded HTML templates for Appwrite's built-in authentication emails.
They replace the default "Appwrite" branded emails that users receive after signup and on password reset.

## How to apply

1. Go to **Appwrite Console → Your Project → Auth → Email Templates**
2. For each template below, paste the HTML and set the subject line

| File | Template in Console | Subject line |
|---|---|---|
| `email-verification.html` | Email Verification | `Confirm your WiseResume email address` |
| `password-recovery.html` | Password Recovery | `Reset your WiseResume password` |

## Appwrite variables used

Appwrite automatically replaces `{{url}}` with the real action link before sending.
Do not change `{{url}}` — it is required for the button and fallback link to work.

## SMTP requirement

These templates only look right if a custom SMTP provider is also configured, otherwise
Appwrite still sends from its own domain. See MASTER_HANDOVER_2026.md for the SMTP setup steps
(uses the existing Resend API key: host `smtp.resend.com`, port 465, user `resend`).
