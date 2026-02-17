
## Enhanced Bug Report System

### 1. Screen Selector Dropdown in Bug Report Dialog

Add a dropdown menu inside the `BugReportDialog` so users can pick which screen they are reporting about. The list will include all major app screens:

- Dashboard
- Resume Editor
- Preview
- Upload
- Settings
- Applications
- Cover Letters
- Interview Prep
- Career Tools
- AI Studio
- Templates
- Examples
- Guides
- Resignation Letters
- Profile
- Notifications
- Other

When the dialog opens from an error boundary, the current route will be pre-selected. When opened manually from Settings, the user can choose from the dropdown.

### 2. Professional Email Template with Full Debug Info

Redesign the email to include a dedicated **System Information** section with:

- **User ID** (the database user ID)
- **Session ID** (last 8 chars of access token)
- **User Agent** (browser/device info)
- **Platform** (extracted from user agent -- e.g., "iPhone", "Android", "Windows")

The email layout will be restructured into clear labeled sections:

```text
+------------------------------------------+
|  Bug Report                              |
|  from user@example.com                   |
+------------------------------------------+
| ROUTE       | VERSION    | TIME          |
| /dashboard  | v2.0.0     | Feb 17, 2026  |
+------------------------------------------+
| REPORTED SCREEN                          |
| Dashboard                                |
+------------------------------------------+
| ERROR MESSAGE                            |
| [red box with error text]                |
+------------------------------------------+
| USER'S NOTE                              |
| [green box with user context]            |
+------------------------------------------+
| SYSTEM INFORMATION                       |
| User ID:    abc123-def456-...            |
| Session ID: a1b2c3d4                     |
| Platform:   iPhone / Safari 17           |
| User Agent: Mozilla/5.0 ...             |
+------------------------------------------+
| Stack Trace (collapsible)                |
| Component Stack (collapsible)            |
+------------------------------------------+
| WiseResume Bug Report System             |
+------------------------------------------+
```

### Files Changed

**`src/components/BugReportDialog.tsx`**
- Add a `selectedScreen` state with a dropdown (using the Shadcn Select component)
- Pre-populate based on current route when dialog opens
- Pass `selected_screen` in the payload to the edge function
- The dropdown appears between the error box and the textarea

**`src/lib/bugReport.ts`**
- No changes needed (existing interface supports this via `route`)

**`supabase/functions/send-bug-report/index.ts`**
- Accept new `selected_screen` field from payload
- Add a "Reported Screen" row in the email below the metadata bar
- Add a "System Information" section with User ID, Session ID, Platform, and User Agent
- Include all fields in the database insert (using `additional_context` to store screen selection if no dedicated column exists, or add it to the existing payload)

### Technical Details

**Screen list constant (in BugReportDialog):**
```text
const SCREEN_OPTIONS = [
  { value: '/dashboard', label: 'Dashboard' },
  { value: '/editor', label: 'Resume Editor' },
  { value: '/preview', label: 'Preview' },
  { value: '/upload', label: 'Upload' },
  { value: '/settings', label: 'Settings' },
  { value: '/applications', label: 'Applications' },
  { value: '/cover-letters', label: 'Cover Letters' },
  { value: '/interview', label: 'Interview Prep' },
  { value: '/career', label: 'Career Tools' },
  { value: '/ai-studio', label: 'AI Studio' },
  { value: '/templates', label: 'Templates' },
  { value: '/examples', label: 'Examples' },
  { value: '/guides', label: 'Guides' },
  { value: '/resignation-letters', label: 'Resignation Letters' },
  { value: '/profile', label: 'Profile' },
  { value: '/notifications', label: 'Notifications' },
  { value: 'other', label: 'Other / General' },
];
```

**Route-to-screen auto-matching:**
When the dialog opens, match `window.location.pathname` against screen options to pre-select the closest match. Falls back to "Other / General" if no match.

**Email system info section (edge function):**
```text
- Parse user_agent to extract a friendly platform name
  (e.g., contains "iPhone" -> "iPhone", "Android" -> "Android", "Windows" -> "Windows")
- Display User ID truncated to first 8 + last 4 chars for readability
- Display Session ID as-is (already last 8 chars)
- Full user agent in a monospace smaller font
```
