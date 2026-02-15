

## Implement Standalone "Analyze Job" Sheet from Dashboard FAB

### Problem
Clicking "Analyze Job" from the dashboard FAB currently navigates to the Jobs tab (`/applications`), which is confusing. Instead, it should open an inline sheet (like the reference screenshot) where users can paste a job URL or description, analyze it, and then choose to tailor a resume or save the job.

### Solution
Create a new `AnalyzeJobSheet` component that reuses the existing `JobUrlParser` for input. Unlike `SetTargetJobSheet` (which requires a specific resume), this standalone sheet will:

1. **Input phase**: Paste job URL or description (same UI as screenshot)
2. **Analyzing phase**: Show progress while AI parses the job
3. **Results phase**: Show job details and two action buttons:
   - "Tailor a Resume" -- opens a resume picker, then navigates to the editor with tailor context
   - "Save Job for Later" -- saves the job to the `jobs` table and shows success toast

### Files to Change

**New file: `src/components/dashboard/AnalyzeJobSheet.tsx`**
- Bottom sheet with 3 phases: input, analyzing, results
- Input phase: Reuses `JobUrlParser` component + "Analyze Job" button (matches the screenshot design)
- Analyzing phase: Spinner + progress bar (reuse pattern from `SetTargetJobSheet`)
- Results phase: Displays parsed job title, company, description summary, and key requirements extracted
- Two CTA buttons:
  - "Tailor a Resume" -- shows a mini resume picker (list of user's resumes), then navigates to `/editor` with the selected resume and job context pre-loaded
  - "Save to Jobs" -- calls `useJobMutations().createJob` to save the parsed job, then closes the sheet
- Uses `parseJobUrl` from `@/lib/aiTailor` for URL parsing, and the `parse-job-url` edge function
- For manual text input (no URL), extracts job title/company using simple heuristics or stores the raw description

**Modified file: `src/pages/DashboardPage.tsx`**
- Add state: `const [showAnalyzeJob, setShowAnalyzeJob] = useState(false)`
- Change FAB's `onAnalyzeJob` from `() => navigate('/applications')` to `() => setShowAnalyzeJob(true)`
- Render `<AnalyzeJobSheet>` at the bottom of the component tree
- Pass `resumes` list so the sheet can show a resume picker in the results phase

### Component Structure

```text
AnalyzeJobSheet
+-- Phase: Input
|   +-- JobUrlParser (existing component)
|   +-- "Analyze Job" button
+-- Phase: Analyzing
|   +-- Loader + progress message
+-- Phase: Results
    +-- Job info card (title, company, description preview)
    +-- Resume picker (list of user's resumes to tailor)
    +-- "Tailor Resume" button (primary)
    +-- "Save Job for Later" button (secondary)
```

### User Flow

1. User taps "+" FAB on dashboard
2. User taps "Analyze Job"
3. Sheet slides up with job URL/description input (matches screenshot)
4. User pastes URL and taps "Parse" (or pastes text manually)
5. User taps "Analyze Job" button
6. Sheet shows analyzing progress
7. Results appear with job details
8. User picks a resume and taps "Tailor Resume" -- navigates to editor with job context
   OR taps "Save Job for Later" -- job saved to Jobs tab, sheet closes

### Technical Details

- Reuses `JobUrlParser` for the input UI (same as screenshot)
- Reuses `parseJobUrl` from `@/lib/aiTailor` for URL parsing
- Uses `useJobMutations().createJob` from `src/hooks/useJobs.ts` for saving
- Resume picker uses `useResumes()` to list available resumes
- Navigation to editor uses existing pattern: set resume in store + navigate with query params
- All buttons have `active:scale-95` and 44px min touch targets per project guidelines
- Sheet height: `h-[85vh]` with `overflow-y-auto` and `pb-safe`

