

## Bug Report Email Routing Fix

### What Changes

**File: `supabase/functions/send-bug-report/index.ts`**

1. Change `DEVELOPER_EMAIL` from `"contact@magdysaber.com"` to `"bugs@magdysaber.com"` -- this is where bug emails will be delivered.

2. Add `reply_to: resolvedEmail` to the Resend API call so that when you receive the email, hitting "Reply" goes directly to the user who reported the bug.

3. Update the `from` display name to include the user's email for instant visibility, e.g.:
   `"Bug from user@example.com <bugs@magdysaber.com>"`

This way, every bug report email:
- Arrives in your `bugs@magdysaber.com` inbox
- Shows exactly which user reported it (in the sender name and reply-to)
- Lets you reply directly to the user

### Technical Detail

```text
from: "Bug from <user_email> <bugs@magdysaber.com>"
to:   ["bugs@magdysaber.com"]
reply_to: "<user_email>"
```

Note: Resend requires the `from` address to be on your verified domain (`magdysaber.com`), so the actual sender address stays `bugs@magdysaber.com`, but the display name and `reply_to` field will show the user's email.

