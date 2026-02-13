

## Add 5 Critical Pages to WiseResume

### Overview
Add five new pages to complete the job application workflow: Job Detail, Application Tracker, Notification Center, Cover Letter standalone page, and Public Resume Share view.

---

### 1. `/job/:id` -- Job Detail Page

**New file:** `src/pages/JobDetailPage.tsx`

This page shows details of a job application entry (since the app doesn't have a separate "jobs" database -- jobs are tracked via `job_applications`). It pulls the application by ID and displays it as a job detail view.

**Layout (top to bottom):**
- Header: back arrow to `/applications` + job title
- Company card: glass-elevated card with company name, job title (large), status badge
- Details section: URL link (external), applied date, deadline with countdown, reminder status
- Notes section: display existing notes with inline edit (Textarea + Save button, using `updateApplication` mutation)
- "Apply with Resume" dropdown: if status is `saved`, show a `Select` to pick a resume from `useResumes()`, then update the application's `resume_id`
- "Share Job" button: uses `navigator.share` with the job URL or copies to clipboard
- "Update Status" section: status chip buttons (reuse pattern from `ApplicationDetailSheet`)

**Data:** `useJobApplications` to fetch by ID (add a new `useJobApplication(id)` query to `useJobApplications.ts`), `useResumes` for resume picker.

**New hook addition in `src/hooks/useJobApplications.ts`:**
```typescript
export function useJobApplication(id: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['job-application', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_applications')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as unknown as JobApplication;
    },
    enabled: !!user && !!id,
  });
}
```

---

### 2. `/application/:id` -- Application Tracker Page

**New file:** `src/pages/ApplicationTrackerPage.tsx`

A full-page view of a single application with a visual status timeline.

**Layout:**
- Header: back arrow to `/applications` + "Application Details"
- Status timeline: vertical stepper showing stages (Saved, Applied, Screening, Interviewing, Offer/Rejected) with the current status highlighted and completed stages checked
- Job summary card: job title, company, applied date, deadline
- Linked resume: if `resume_id` exists, show resume title as a tappable link navigating to `/resume/:id`
- Notes section: editable Textarea with Save button (updates `notes` via `updateApplication`)
- "Set Reminder" button: opens a date/time picker and calls `updateApplication` with `remind_at`
- "Update Status" button row: status pill buttons to change status

**Data:** Reuse `useJobApplication(id)` hook, `useJobApplicationMutations` for updates.

---

### 3. `/notifications` -- Notification Center

**New file:** `src/pages/NotificationsPage.tsx`

Client-side notification center. Since there's no `notifications` database table, this will aggregate activity data locally and show application reminders.

**Layout:**
- Header: back arrow + "Notifications" title + "Clear All" button
- Filter tabs: All | Applications | System (using inline pill buttons)
- Notification list: each item shows icon, message text, relative timestamp, and unread dot
- Notification sources:
  - Application reminders (from `job_applications` where `remind_at` has passed)
  - System messages (stored in localStorage as `wr-notifications`)
- Empty state: Bell icon + "No notifications yet" message
- "Mark as read" swipe or tap action per item

**Storage:** `localStorage` key `wr-notifications` stores an array of `{ id, type, message, timestamp, read }`. Application reminders are computed live from the database.

**No new database table needed** -- keeps it simple with localStorage + computed reminders.

---

### 4. `/cover-letter` -- Standalone Cover Letter Page

**New file:** `src/pages/CoverLetterPage.tsx`

A standalone page wrapping the existing `CoverLetterGenerator` component with additional context selection.

**Layout:**
- Header: back arrow + "Cover Letters" title
- Two sections via tabs: "Create New" | "Saved Letters"
- **Create New tab:**
  - Resume selector: `Select` dropdown populated from `useResumes()`
  - Job description input: `Textarea` for pasting job description
  - OR: select from saved job applications via a picker
  - Tone selector (Professional / Enthusiastic / Conversational)
  - "Generate" button triggers AI generation via existing `generateCoverLetter()` from `src/lib/aiTailor.ts`
  - Result area: read/edit toggle, copy, download PDF/TXT buttons (reuse logic from `CoverLetterGenerator`)
- **Saved Letters tab:**
  - Query `cover_letters` table for the user's saved letters
  - List with job title, company, date, tone badge
  - Tap to view full letter with copy/download options
  - Swipe to delete

**Data:** `useResumes`, new `useCoverLetters` hook querying the `cover_letters` table, `generateCoverLetter` from `aiTailor.ts`.

**New hook in `src/hooks/useCoverLetters.ts`:**
```typescript
export function useCoverLetters() { /* query cover_letters table */ }
export function useCoverLetterMutations() { /* save, delete */ }
```

**Auth required** -- redirects to `/auth` if not logged in.

---

### 5. `/share/:token` -- Public Resume View

**New file:** `src/pages/SharePage.tsx`

A public page (no auth required) that displays a resume in read-only mode.

**How sharing works:**
- The `token` is simply the resume ID
- The page fetches the resume using a public-facing query (requires an RLS policy allowing public read on resumes with a specific flag)
- **Database change:** Add a `is_public` boolean column (default false) to the `resumes` table, and an RLS policy allowing anonymous SELECT when `is_public = true`
- When a user clicks "Share" on `/resume/:id`, it sets `is_public = true` and generates the `/share/:token` URL

**Layout:**
- No app chrome (no bottom nav, no header)
- Clean white/dark background
- Resume rendered using the template component (same as PreviewPage)
- Bottom bar: "Download PDF" button + "Create Your Own Resume" CTA linking to `/`
- Footer: "Created with WiseResume" branding

**Route:** This page lives OUTSIDE the `AppShell` route group (no bottom tab bar).

---

### Database Migration

Add `is_public` column to `resumes`:
```sql
ALTER TABLE public.resumes ADD COLUMN is_public boolean NOT NULL DEFAULT false;

-- Allow anonymous users to read public resumes
CREATE POLICY "Public resumes are viewable by anyone"
  ON public.resumes FOR SELECT
  USING (is_public = true);
```

---

### Navigation & Routing Updates

**`src/App.tsx`:**
- Add 5 new lazy-loaded imports
- Routes inside `AppShell`: `/job/:id`, `/application/:id`, `/notifications`, `/cover-letter`
- Route OUTSIDE `AppShell` (alongside `/` landing): `/share/:token`

**`src/components/layout/AppShell.tsx`:**
- Add `/job`, `/application`, `/notifications`, `/cover-letter` to `TAB_ROUTES`

**`src/lib/navigation.ts`:**
- Add back routes:
  - `/job` -> `/applications`
  - `/application` -> `/applications`
  - `/notifications` -> `/dashboard`
  - `/cover-letter` -> `/dashboard`

**`src/hooks/useJobApplications.ts`:**
- Add `useJobApplication(id)` single-item query hook

**New file: `src/hooks/useCoverLetters.ts`:**
- `useCoverLetters()` -- list user's saved cover letters
- `useCoverLetterMutations()` -- save new, delete

---

### File Summary

| Action | File |
|--------|------|
| Create | `src/pages/JobDetailPage.tsx` |
| Create | `src/pages/ApplicationTrackerPage.tsx` |
| Create | `src/pages/NotificationsPage.tsx` |
| Create | `src/pages/CoverLetterPage.tsx` |
| Create | `src/pages/SharePage.tsx` |
| Create | `src/hooks/useCoverLetters.ts` |
| Edit | `src/hooks/useJobApplications.ts` (add `useJobApplication`) |
| Edit | `src/App.tsx` (add routes) |
| Edit | `src/components/layout/AppShell.tsx` (add TAB_ROUTES) |
| Edit | `src/lib/navigation.ts` (add back routes) |
| Migration | Add `is_public` column to `resumes` + RLS policy |

