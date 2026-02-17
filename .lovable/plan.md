

## Bug Report Improvements

### 1. Dynamic App Version in Bug Report Emails

**Problem**: The `BugReportDialog` and edge function both hardcode `APP_VERSION = '1.0.0'`, but the real version is `v2.0.0` (from `public/changelog.json`).

**Solution**: Remove the hardcoded version from `BugReportDialog` and instead fetch the version dynamically from `changelog.json` at runtime (the same source the Settings page already uses). This way, when you update `changelog.json` for a new release, the bug report emails automatically reflect the correct version.

**Files changed:**
- `src/components/BugReportDialog.tsx` -- fetch version from `/changelog.json` instead of using hardcoded `'1.0.0'`
- `supabase/functions/send-bug-report/index.ts` -- default to the version sent from client (already does), and redesign the email HTML for clarity

### 2. Redesigned Email Template

**Problem**: The current email is a plain table that's hard to scan quickly.

**Solution**: Restructure the HTML email with:
- Clear section headers with visual hierarchy
- The user's email prominently displayed at the top
- Route, app version, and timestamp in a clean metadata block
- Error message in a highlighted box
- Stack traces kept in collapsible sections
- User's additional context clearly separated

### 3. "Report a Bug" Button in Settings

**Problem**: Users can only report bugs when an error boundary catches something. There's no way to manually report an issue.

**Solution**: Add a "Report a Bug" button in the **About and Help** section of the Settings page. When a signed-in user taps it:
- Opens the existing `BugReportDialog` with a pre-filled "User-reported issue" label
- The user's signed-in email is automatically used as the sender identity
- The dialog lets them describe their issue in the text area

**Files changed:**
- `src/pages/SettingsPage.tsx` -- add a "Report a Bug" `SettingsRow` button in the About and Help section, importing `triggerBugReport`
- `src/lib/bugReport.ts` -- no changes needed (the existing `triggerBugReport` function already supports manual calls)

### Technical Details

**BugReportDialog version fetching:**
```text
- Remove hardcoded APP_VERSION = '1.0.0'
- On mount, fetch /changelog.json and extract [0].version
- Cache it in a module-level variable so it only fetches once
- Fall back to 'unknown' if fetch fails
- Pass this version in the payload to the edge function
```

**Settings page addition (in About and Help section, after "Get Help"):**
```text
- New SettingsRow type="button" with Bug icon
- Label: "Report a Bug"
- Description: "Let us know if something isn't working right"
- onClick: calls triggerBugReport with a generic "User-reported issue" message
- Only shown to signed-in users (since we need their email)
```

**Edge function email template redesign:**
```text
- Modern, clean HTML layout
- User email shown prominently in header
- Color-coded error severity
- Better mobile rendering
- Dynamic app version from client payload
```

