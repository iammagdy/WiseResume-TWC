

## Fix: Actually Send Bug Reports to Your Email

### Problem
The `send-bug-report` edge function saves reports to the `bug_reports` database table and returns "success" to the user, but **never sends an email**. Line 89 of the function literally says `"email integration can be added later"`. So users see "Thank you!" but you never receive anything at contact@magdysaber.com.

### Solution
Add email delivery using the **Resend** API to the existing edge function, so every bug report is also emailed to you.

### Steps

**1. Add RESEND_API_KEY secret**
- You'll need to create a free account at [resend.dev](https://resend.dev) and get an API key
- We'll store it as a backend secret called `RESEND_API_KEY`
- On the free tier (no verified domain), you can only receive emails at your Resend account email. To send to contact@magdysaber.com freely, you'll need to verify your domain in Resend.

**2. Update the edge function (`supabase/functions/send-bug-report/index.ts`)**
After the successful database insert (line 87), add a Resend API call:

```text
POST https://api.resend.com/emails
Authorization: Bearer RESEND_API_KEY
Body:
  from: "WiseResume Bug Reports <bugs@your-verified-domain.com>"
    (or "onboarding@resend.dev" if no domain verified yet)
  to: "contact@magdysaber.com"
  subject: "[Bug Report] {error_message truncated}"
  html: formatted email with error details, route, user email, 
        additional context, timestamp, stack traces
```

- Email failure will be logged but won't block the success response (the DB record is the source of truth)
- The email will include: error message, route, user email, additional context, stack traces (collapsed), and timestamp

### What Changes

| Item | Change |
|------|--------|
| `supabase/functions/send-bug-report/index.ts` | Add Resend email call after DB insert |
| Secret: `RESEND_API_KEY` | New secret needed from you |

### Important Note
Before I proceed, you'll need to provide a Resend API key. Would you like to go ahead with this approach?
