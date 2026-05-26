# Appwrite Auth Email Templates

Branded HTML email templates for WiseResume. All templates share the same dark design system:
`#09090b` background · crimson `#ef4444` / `#9E1B22` accents · Inter font · Outlook VML fallbacks.

## Templates

| File | Purpose | Appwrite template slot | Subject line |
|---|---|---|---|
| `email-verification.html` | New user email verification | Email Verification | `Verify your WiseResume email` |
| `password-recovery.html` | Password reset | Password Recovery | `Reset your WiseResume password` |
| `magic-url.html` | Passwordless / magic link sign-in | Magic URL | `Your WiseResume sign-in link` |
| `otp.html` | One-time password sign-in | OTP | `Your WiseResume sign-in code` |
| `welcome.html` | Post-verification welcome | *(custom — send via Resend)* | `Welcome to WiseResume, {{name}}` |

## Appwrite variables

| Variable | Used in |
|---|---|
| `{{redirect}}` | email-verification, password-recovery, magic-url (full URL with `userId` + `secret`) |
| `{{otp}}` | otp |
| `{{name}}` | welcome |

Use **`{{redirect}}`** only (not `{{url}}`) — Appwrite replaces `{{redirect}}` with the callback URL including `userId` and `secret` query params.

## How to apply (Appwrite Console)

1. **Console → Project → Auth → SMTP** — configure Resend SMTP first (see MASTER_HANDOVER_2026.md)
2. **Console → Auth → Email Templates** — for each Appwrite slot:
   - Select the template slot
   - Paste the HTML
   - Set the subject line from the table above

## SMTP config (Resend)

| Setting | Value |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` |
| Encryption | SSL |
| Username | `resend` |
| Password | Resend API key (from `admin-email` function env vars) |
| Sender name | `WiseResume` |
| Sender email | `noreply@thewise.cloud` |

## Notes

- `welcome.html` is not an Appwrite built-in slot — trigger it manually via the `admin-email` Appwrite function after email verification confirms.
- All templates are fully inline-styled, table-based, and tested against Gmail, Apple Mail, and Outlook (VML button fallback included).
- The `COPY` button in the alternative link section is a styled `<a href="{{url}}">` — clicking opens the link. JS clipboard APIs are not available in email clients.
