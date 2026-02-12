
# Enhanced Jobs Tab -- Smart Application Tracker

## Overview

Transform the Jobs tab from a simple list into an intelligent application tracker with deadline detection, reminder notifications, post-tailor prompts, and detailed job views showing linked resumes and timelines.

## What Changes

### 1. Database: Add new columns to `job_applications`

Add two new columns:
- `deadline` (timestamp, nullable) -- the job posting deadline
- `remind_at` (timestamp, nullable) -- when to show next reminder (used for "I Will" snooze)

### 2. New Component: `ApplicationDetailSheet.tsx`

A bottom sheet that opens when you tap on a job card, showing:
- Job title, company, and status badge
- Link to the job posting (tappable)
- The resume used (name + link to open in editor)
- Cover letter used (if any)
- Applied date and time ago
- Deadline date with countdown (e.g. "3 days left")
- Notes section
- Status change buttons at the bottom

### 3. New Component: `ApplyPromptDialog.tsx`

An alert dialog that appears after the user finishes tailoring a resume (triggered from `TailorSheet.tsx` after applying changes). It asks:

- **"Did you apply to this job?"**
  - **Yes** -- Creates a job application entry with status `applied` and `applied_at = now()`
  - **No** -- Creates entry with status `saved` (new status, meaning "not yet applied")
  - **I Will** -- Creates entry with status `saved` and sets `remind_at` to 1 hour from now

### 4. New Status: `saved`

Add a new application status `saved` to represent jobs the user plans to apply to but hasn't yet. Update:
- `ApplicationStatus` type: add `'saved'`
- `StatusFilter`: add a "Saved" filter chip
- `ApplicationCard`: add styling for `saved` status
- Stats row: add "Saved" count

### 5. Reminder Badge on Jobs Tab

- In `ApplicationsPage.tsx` header, add a bell icon with a badge count showing how many applications have `remind_at <= now()` or status `saved`
- Tapping it filters the list to show only pending reminders
- In-app only (no push notifications -- those would need native capabilities)

### 6. Enhanced `ApplicationCard.tsx`

- Make the card tappable to open `ApplicationDetailSheet`
- Show deadline with color coding (red if < 2 days, amber if < 7 days, green otherwise)
- Show linked resume name (fetched from resumes table)
- Show a small reminder icon if `remind_at` is set

### 7. AI Deadline Detection via Job URL

When the user pastes a job URL in `AddApplicationSheet`, use the existing `parse-job-url` edge function to extract the deadline from the job posting. Auto-fill the deadline field if detected.

### 8. Enhanced `AddApplicationSheet.tsx`

- Add a "Deadline" date picker field
- Add a "Remind me" toggle that sets `remind_at` to a chosen time
- Show resume selector dropdown (list user's resumes)

### 9. Integration with Tailor Flow

After the user applies a tailored resume in `TailorSheet.tsx`, show the `ApplyPromptDialog` asking if they applied. This creates the job application entry automatically with the resume and job details pre-filled.

---

## Technical Details

### Database Migration

```sql
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS deadline timestamptz,
  ADD COLUMN IF NOT EXISTS remind_at timestamptz;

-- Update status check: allow 'saved' as a valid status
-- (The existing column uses text type with default 'applied', no check constraint, so 'saved' works automatically)
```

### Files to Create

1. **`src/components/applications/ApplicationDetailSheet.tsx`** -- Detail view when tapping a job card. Shows all application info, linked resume name, deadline countdown, and status-change actions.

2. **`src/components/applications/ApplyPromptDialog.tsx`** -- Alert dialog with 3 buttons (Yes / No / I Will). Props: `open`, `onOpenChange`, `jobTitle`, `company`, `resumeId`, `jobDescription`. On "Yes" creates application with status `applied`. On "No" creates with `saved`. On "I Will" creates with `saved` + `remind_at = now() + 1 hour`.

### Files to Modify

3. **`src/hooks/useJobApplications.ts`**
   - Add `'saved'` to `ApplicationStatus` type
   - Add `deadline` and `remind_at` to `JobApplication` interface
   - Add `deadline` and `remind_at` to `createApplication` input type and insert logic
   - Add a new query hook `usePendingReminders()` that counts applications where `remind_at <= now()` or status is `saved`

4. **`src/components/applications/ApplicationCard.tsx`**
   - Add `onTap` prop to open the detail sheet
   - Show deadline with countdown and color coding
   - Show reminder icon if `remind_at` is set
   - Add `saved` to `STATUS_CONFIG`

5. **`src/components/applications/StatusFilter.tsx`**
   - Add `saved` option with a distinct color (e.g. blue/info)

6. **`src/pages/ApplicationsPage.tsx`**
   - Add `saved` stat to the stats row
   - Add bell icon with badge count for pending reminders
   - Add state for `ApplicationDetailSheet` (selected application)
   - Pass `onTap` handler to `ApplicationCard`

7. **`src/components/applications/AddApplicationSheet.tsx`**
   - Add deadline date picker field
   - Add resume selector dropdown (fetch resumes list)
   - When a URL is pasted, optionally call `parse-job-url` to auto-detect deadline

8. **`src/components/editor/TailorSheet.tsx`**
   - After successfully applying tailored changes (in `handleApply`), show the `ApplyPromptDialog` with the job title, company, and resume ID pre-filled

### Reminder Check Logic (Client-side)

Since we cannot use push notifications in web, the reminder system works by:
- Querying `remind_at <= now()` on page load / focus
- Showing a bell badge count in the header
- Optionally showing a toast when the user opens the app and has pending reminders
