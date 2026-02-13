

## Connect All Pages to Database Hooks

### Overview
Rewire the five new pages to use their proper database-backed hooks, replacing localStorage patterns and incorrect data sources. Add a tabbed layout to the Applications page and connect the bell icon with unread count.

---

### 1. Rewrite `/applications` -- Add Tabbed Layout

**File:** `src/pages/ApplicationsPage.tsx`

Add two tabs below the header for authenticated users:

- **"Jobs" tab**: Uses `useJobs()` hook to list saved jobs from the `jobs` table. Each job card shows title, company, location, job type. Tapping navigates to `/job/:id`. Includes an "Add Job" button that opens a simple form sheet to create a job via `useJobMutations().createJob`.
- **"Applications" tab**: Uses `useJobApplications()` hook to list applications. Each card uses existing `ApplicationCard` component, tapping navigates to `/application/:id`. Keeps the existing `AddApplicationSheet` for manual entry.

The existing stats section and activity timeline move into the Applications tab (or above both tabs). The bell icon in the header links to `/notifications` and shows unread count badge via `useUnreadNotificationCount()`.

**Key changes:**
- Import `useJobs`, `useJobMutations` from `@/hooks/useJobs`
- Import `useUnreadNotificationCount` from `@/hooks/useNotifications`
- Add tab state (`'jobs' | 'applications'`)
- Create a simple `JobCard` inline component for the jobs list
- Bell icon navigates to `/notifications` instead of toggling reminders filter
- Add unread badge count on bell icon

---

### 2. Rewrite `/job/:id` -- Use `useJob` Hook

**File:** `src/pages/JobDetailPage.tsx`

Currently fetches from `job_applications` -- needs to fetch from `jobs` table instead.

**Key changes:**
- Replace `useJobApplication(id)` with `useJob(id)` from `@/hooks/useJobs`
- Replace `useJobApplicationMutations` with `useJobMutations` for save/unsave
- Show full job details: description, requirements, location, salary range, job type, posted date
- "Apply with Resume" creates a new application via `useJobApplicationMutations().createApplication` with `job_id` set, then navigates to `/application/:newId`
- "Save/Unsave" toggles `is_saved` via `updateJob`
- "Share" uses Web Share API or clipboard with `source_url`
- "Delete Job" button with confirmation via `deleteJob`
- Add `screening` to STATUS_OPTIONS

---

### 3. Update `/application/:id` -- Add Delete + Screening Stage

**File:** `src/pages/ApplicationTrackerPage.tsx`

Mostly complete already. Small enhancements:

**Key changes:**
- Add `screening` stage to the STAGES array between `applied` and `interviewing`
- Update STAGE_ORDER to include `screening: 1.5` (renumber: saved=0, applied=1, screening=2, interviewing=3, offer=4)
- Add "Delete Application" button at the bottom using `deleteApplication` mutation, then navigate back to `/applications`
- Add linked cover letter display (if `cover_letter_id` exists, fetch via `useCoverLetter`)
- Invalidate `job-application` query key after updates

---

### 4. Rewrite `/notifications` -- Use Database Hooks

**File:** `src/pages/NotificationsPage.tsx`

Replace the localStorage-based approach with the database `notifications` table.

**Key changes:**
- Remove all localStorage logic (`LS_KEY`, `getStoredNotifications`, `saveNotifications`)
- Remove `LocalNotification` interface
- Import `useNotifications`, `useNotificationMutations` from `@/hooks/useNotifications`
- Use `Notification` type from the hook
- Filter tabs: All | Unread | Applications | System
  - "Unread" filters by `is_read === false`
  - "Applications" filters by `type === 'application'`
  - "System" filters by `type === 'system'`
- On notification click: call `markAsRead.mutate(id)` and if `n.link` exists, navigate to it
- "Clear all" calls `clearAll.mutate()`
- Show notification `title` (bold) + `message` (body text)
- Keep the existing animation and empty state UI

---

### 5. Update `/share/:token` -- Use `usePublicResume` Hook

**File:** `src/pages/SharePage.tsx`

Replace the direct Supabase query with the `usePublicResume` hook from `useResumeShares`, which uses the `resume_shares` table with token-based lookup.

**Key changes:**
- Import `usePublicResume`, `useResumeShareMutations` from `@/hooks/useResumeShares`
- Replace inline query with `usePublicResume(token)`
- Call `incrementViewCount.mutate(token)` on mount to track views
- Parse resume data from `data.resume` instead of direct resume fetch
- Handle password-protected shares (if `share.password` exists, show password input first)
- Keep existing resume rendering and footer

---

### 6. CoverLetterPage -- No Changes Needed

The cover letter page is already properly wired to `useCoverLetters()` and `useCoverLetterMutations()`. No modifications required.

---

### Files Summary

| Action | File | What Changes |
|--------|------|-------------|
| Rewrite | `src/pages/ApplicationsPage.tsx` | Add Jobs/Applications tabs, bell icon with unread count, job cards list |
| Rewrite | `src/pages/JobDetailPage.tsx` | Switch from `useJobApplication` to `useJob`, show full job details, apply creates application |
| Edit | `src/pages/ApplicationTrackerPage.tsx` | Add screening stage, delete button, cover letter link |
| Rewrite | `src/pages/NotificationsPage.tsx` | Replace localStorage with `useNotifications` database hooks |
| Edit | `src/pages/SharePage.tsx` | Use `usePublicResume` hook with token-based sharing |
| No change | `src/pages/CoverLetterPage.tsx` | Already wired correctly |

