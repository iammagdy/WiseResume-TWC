
## Bug Report System -- Automatic Error Reporting to Developer

### Overview

Build a complete bug reporting system that automatically captures errors and lets users send detailed reports to the developer (contact@magdysaber.com) via a backend function. The developer email is never exposed to users. The UI feels premium and reassuring, telling users the issue will be resolved within 24 hours.

---

### What Users Will See

1. **On any crash (ErrorBoundary)**: The existing "Something went wrong" screen gets a new "Report Issue" button alongside "Try Again" and "Go to Dashboard."

2. **On toast errors**: Every `toast.error()` gets an action button labeled "Report" that opens a bug report dialog.

3. **Bug Report Dialog**: A friendly, premium-feeling sheet with:
   - A calming icon (HeartHandshake or ShieldCheck)
   - Title: "Help Us Improve"
   - Message: "WiseResume is in its early access phase, and your feedback helps us build a better experience. Our team will investigate and resolve this within 24 hours."
   - Pre-filled error details (hidden from user, sent automatically)
   - Optional text area: "Anything else you'd like to share?" (user can add context)
   - "Send Report" button with loading state
   - Success confirmation: "Thank you! Your report has been received."
   - The developer email (contact@magdysaber.com) is NEVER shown anywhere

---

### Data Sent in Each Report

| Field | Source |
|-------|--------|
| `error_message` | The error message string |
| `error_stack` | Stack trace (if available) |
| `component_stack` | React component tree (from ErrorBoundary) |
| `route` | `window.location.pathname` |
| `user_id` | From auth context |
| `user_email` | From auth context (`user.email`) |
| `session_id` | From Supabase session (`session.access_token` last 8 chars for privacy) |
| `timestamp` | ISO timestamp |
| `user_agent` | `navigator.userAgent` |
| `app_version` | From `package.json` or hardcoded |
| `additional_context` | User's optional text input |

---

### Technical Implementation

**Step 1: Create `bug_reports` database table**

```sql
CREATE TABLE bug_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text NOT NULL,
  error_message text NOT NULL,
  error_stack text,
  component_stack text,
  route text,
  session_id text,
  user_agent text,
  additional_context text,
  app_version text DEFAULT '1.0.0',
  status text DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own bug reports"
  ON bug_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own bug reports"
  ON bug_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_bug_reports_user_id ON bug_reports (user_id);
CREATE INDEX idx_bug_reports_status ON bug_reports (status, created_at DESC);
```

**Step 2: Create `send-bug-report` edge function**

- Accepts the report payload from authenticated users
- Saves to `bug_reports` table using service role
- Sends email notification to `contact@magdysaber.com` using Supabase's built-in SMTP (or logs for now since email sending requires additional setup)
- Returns success response
- The developer email is hardcoded in the edge function only -- never sent to the client

**Step 3: Create `BugReportDialog` component**

New file: `src/components/BugReportDialog.tsx`

- Uses Radix `Dialog` (not Sheet, for lightweight feel)
- Accepts `error`, `errorInfo`, `route` props
- Reads `user` and `session` from `useAuth()`
- Shows friendly UI with early-access messaging
- Sends report via `supabase.functions.invoke('send-bug-report')`
- Shows success/failure states
- Touch-friendly with 44px min targets

**Step 4: Update `ErrorBoundary.tsx`**

- Add a "Report Issue" button between "Try Again" and "Go to Dashboard"
- Opens `BugReportDialog` with the caught error details
- Since ErrorBoundary is a class component and is outside AuthProvider in the tree, it needs to access auth via a wrapper or pass user info down

- **Important architectural note**: The ErrorBoundary wraps AuthProvider in `App.tsx`, so it cannot use `useAuth()`. Solution: The BugReportDialog will try to read auth from localStorage cache (`sb-auth-session-cache`) as a fallback when the hook isn't available, and also accept optional `userId`/`userEmail` props.

**Step 5: Create global `reportBug` utility**

New file: `src/lib/bugReport.ts`

- Export a `reportBug(error, context?)` function
- Can be called from anywhere (toast actions, catch blocks)
- Opens the BugReportDialog via a global event or state

**Step 6: Update toast error pattern**

- Create a wrapper `toastError(message, error?)` that shows the toast with a "Report" action button
- The action button opens the BugReportDialog
- Update the sonner Toaster or create a utility that components can import

**Step 7: Add to `supabase/config.toml`**

```toml
[functions.send-bug-report]
verify_jwt = false
```

---

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/BugReportDialog.tsx` | Premium bug report dialog UI |
| `src/lib/bugReport.ts` | Global bug report utility + event system |
| `supabase/functions/send-bug-report/index.ts` | Backend: save report + notify developer |

### Files to Modify

| File | Change |
|------|--------|
| `src/components/ErrorBoundary.tsx` | Add "Report Issue" button that opens BugReportDialog |
| `src/App.tsx` | Mount the global BugReportDialog listener |
| `supabase/config.toml` | (auto-managed) Add send-bug-report function config |

### Database Migration

- Create `bug_reports` table with RLS policies and indexes
