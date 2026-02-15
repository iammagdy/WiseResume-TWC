

## Fix Jobs Tab UX Issues

This plan addresses 4 main areas: notification badge sync, stats restructuring, saved job actions, and mobile filter visibility.

---

### 1. Fix Notification Badge Sync

**Root cause**: The `useUnreadNotificationCount` and `useNotifications` hooks don't filter by `user_id` explicitly -- they rely solely on Row Level Security (RLS). The count query uses `head: true` mode which can behave inconsistently.

**File: `src/hooks/useNotifications.ts`**

- Add `.eq('user_id', user.id)` filter to both `useNotifications` and `useUnreadNotificationCount` queries
- This ensures badge count and notification list always match for the logged-in user
- Also add `user_id` filter to `markAllAsRead` and `clearAll` mutations for safety

---

### 2. Restructure Stats Cards to Separate Resume vs Application Tracking

**File: `src/hooks/useJobActivityStats.ts`**

- Add new stats fields: `applicationsSubmitted`, `interviewsScheduled`, `offersReceived`
- Query `job_applications` table to count by status (`applied`/`screening` = submitted, `interviewing` = scheduled, `offer` = received)

**File: `src/components/applications/JobActivityStats.tsx`**

- Split the 2x2 grid into two labeled sections:
  - **Resume Stats**: "Resumes Created" and "Tailored Versions" (existing)
  - **Application Stats**: "Applications Submitted", "Interviews Scheduled", "Offers Received"
- Each section has a small header label (e.g., "Resume Activity", "Application Tracking")
- Resume section: 2-column grid (same as current)
- Application section: 3-column compact row below

---

### 3. Add Action Buttons to Saved Job Cards

**File: `src/pages/ApplicationsPage.tsx`**

Update the `JobCard` component in the Saved Jobs tab:

- Add a row of action buttons below each job card's info:
  - **"Tailor Resume"** -- navigates to `/editor` with the job context (or opens AI Studio tailor flow)
  - **"Mark as Applied"** -- creates a `job_application` entry with `status: 'applied'`, linking the job, and shows a success toast
  - **"View Details"** -- navigates to `/job/{id}` (existing behavior, keeps the card tap)
- Add a "Resume Tailored" badge on saved jobs that have a matching tailored resume (check if any resume's `target_job_title` matches the job title)
- The "Mark as Applied" button uses `useJobApplicationMutations().createApplication` to create an application entry linked to the saved job

---

### 4. Fix "Rejected" Filter Visibility on Mobile

**File: `src/components/applications/StatusFilter.tsx`**

- Add horizontal padding (`px-4`) to the scrollable container and `snap-x` for smooth scrolling
- Add right padding after the last item so "Rejected" isn't clipped at the edge
- Increase minimum button width with `min-w-fit` to prevent text truncation

---

### 5. Improve Empty States with Clear CTAs

**File: `src/pages/ApplicationsPage.tsx`**

- **Empty Saved Jobs**: Replace generic empty state with two CTA buttons:
  - "Search for Jobs" (opens `JobSearchSheet`)
  - "Add Job Manually" (opens `SaveJobSheet`)
- **Empty My Applications**: Add message "Get started by saving jobs you're interested in" with a button to switch to the Saved Jobs tab

---

### 6. Improve Activity Timeline Labels

**File: `src/components/applications/ActivityTimeline.tsx`**

- Add an "Apply" action button on timeline entries of type `resume_tailored` that navigates to the applications flow
- This connects the tailoring action to the application tracking workflow

---

### Files Summary

| File | Changes |
|------|---------|
| `src/hooks/useNotifications.ts` | Add `user_id` filter to queries and mutations |
| `src/hooks/useJobActivityStats.ts` | Add application-specific stats (submitted, interviews, offers) |
| `src/components/applications/JobActivityStats.tsx` | Split into Resume Stats + Application Stats sections |
| `src/pages/ApplicationsPage.tsx` | Add job card actions, improve empty states |
| `src/components/applications/StatusFilter.tsx` | Fix horizontal scroll and padding for mobile |
| `src/components/applications/ActivityTimeline.tsx` | Add "Apply" action on tailored resume entries |

### Implementation Order

1. `useNotifications.ts` -- fix badge sync (critical)
2. `useJobActivityStats.ts` -- add application stats
3. `JobActivityStats.tsx` -- restructure stats display
4. `StatusFilter.tsx` -- fix mobile scroll
5. `ApplicationsPage.tsx` -- job card actions + empty states
6. `ActivityTimeline.tsx` -- add apply action to tailored entries

