
# Fix: Auto-Create Job Application After Tailoring

## Problem
After tailoring a resume for a job, the application does NOT appear on the Jobs page. The "Did you apply?" dialog is never shown because it's rendered inside the TailorSheet, which closes immediately after applying changes -- unmounting the dialog before the user sees it. Additionally, the job URL from the tailor flow is never passed through to the job application record.

## Fix (2 files)

### 1. Move ApplyPromptDialog out of TailorSheet

**File: `src/components/editor/TailorSheet.tsx`**
- Remove `ApplyPromptDialog` rendering from inside the `<Sheet>` component (lines 830-839)
- Remove the `showApplyPrompt` and `lastAppliedJobInfo` state variables
- Instead, after applying changes, call a new callback prop `onApplied` that passes the job info (title, company, resumeId, jobUrl) up to the parent

**File: `src/pages/EditorPage.tsx`** (the parent that renders TailorSheet)
- Add `showApplyPrompt` and `lastAppliedJobInfo` state here
- Render `ApplyPromptDialog` at the EditorPage level (outside the sheet)
- Pass an `onApplied` callback to TailorSheet that sets these states
- This way the dialog stays mounted even after the sheet closes

### 2. Pass the job URL through the flow

**File: `src/components/editor/TailorSheet.tsx`**
- Extract the job URL from the `JobUrlParser` input (the URL the user pasted)
- Include it in the `onApplied` callback data

**File: `src/components/applications/ApplyPromptDialog.tsx`**
- Add an optional `jobUrl` prop
- Pass `url: jobUrl` to `createApplication.mutateAsync()` so the job link is saved in the database

## Result
- After tailoring, the "Did you apply?" dialog appears reliably
- Choosing "Yes", "No", or "I Will" creates a job application entry that appears on the Jobs page
- The job URL, resume link, title, and company are all captured automatically
- The app feels smart -- the user doesn't need to manually add anything to the Jobs tab
