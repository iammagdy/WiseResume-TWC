

## Database Tables & Hooks for Complete Mobile App

### Overview
Create 3 new database tables (`jobs`, `notifications`, `resume_shares`), enhance 2 existing tables (`cover_letters`, `job_applications`), and build a comprehensive set of React Query hooks covering all CRUD operations.

---

### Existing vs New -- What Changes

| Table | Status | Action |
|-------|--------|--------|
| `jobs` | New | Create from scratch |
| `job_applications` | Exists | Add nullable `job_id` FK to new `jobs` table |
| `cover_letters` | Exists | Add `title` (text, nullable) and `updated_at` (timestamptz) columns |
| `notifications` | New | Create from scratch |
| `resume_shares` | New | Create from scratch (replaces simple `is_public` flag with richer sharing) |

---

### Database Migration (single SQL migration)

**New table: `jobs`**
- `id` uuid PK, `user_id` uuid NOT NULL, `title` text NOT NULL, `company` text NOT NULL
- `company_logo` text nullable, `description` text default '', `requirements` text default ''
- `location` text default '', `salary_range` text nullable
- `job_type` text default 'full-time', `posted_date` timestamptz default now()
- `source_url` text nullable, `is_saved` boolean default true
- `created_at` / `updated_at` timestamptz defaults
- RLS: all operations scoped to `auth.uid() = user_id`

**New table: `notifications`**
- `id` uuid PK, `user_id` uuid NOT NULL
- `type` text NOT NULL default 'system', `title` text NOT NULL, `message` text NOT NULL
- `link` text nullable, `is_read` boolean default false
- `created_at` timestamptz default now()
- RLS: SELECT + UPDATE (is_read) + DELETE for own rows; INSERT for own rows

**New table: `resume_shares`**
- `id` uuid PK, `resume_id` uuid NOT NULL (FK to resumes)
- `user_id` uuid NOT NULL (for RLS -- the resume owner)
- `token` text UNIQUE NOT NULL, `is_active` boolean default true
- `password` text nullable, `expires_at` timestamptz nullable
- `view_count` integer default 0, `created_at` timestamptz default now()
- RLS: owner can SELECT/INSERT/UPDATE/DELETE own shares; anonymous users can SELECT where `is_active = true` and (`expires_at` is null or `expires_at > now()`)
- Database function: `increment_share_view_count(share_token text)` -- security definer function to bump view_count without requiring auth

**Alter `cover_letters`:**
- ADD `title` text nullable
- ADD `updated_at` timestamptz default now()

**Alter `job_applications`:**
- ADD `job_id` uuid nullable (FK to `jobs(id)` ON DELETE SET NULL)

**Triggers:**
- `updated_at` trigger on `jobs` table (reuse existing `update_updated_at_column` function)
- `updated_at` trigger on `cover_letters` table

---

### React Query Hooks

**New file: `src/hooks/useJobs.ts`**
- `useJobs()` -- list all user's saved jobs, ordered by created_at desc
- `useJob(id)` -- fetch single job by ID (uses `.maybeSingle()`)
- `useJobMutations()` -- returns `createJob`, `updateJob`, `deleteJob` mutations
  - All invalidate `['jobs']` query key
  - Toast notifications on success/error

**Updated file: `src/hooks/useJobApplications.ts`**
- Add `screening` to `ApplicationStatus` type (currently missing from the enum)
- Add `job_id` to `JobApplication` interface
- Everything else (existing hooks + mutations) remains unchanged

**Updated file: `src/hooks/useCoverLetters.ts`**
- Add `title` and `updated_at` to `CoverLetterRecord` interface
- Add `useCoverLetter(id)` -- single letter fetch
- Add `updateCoverLetter` mutation to `useCoverLetterMutations()`
- Include `title` in save/update mutation inputs

**New file: `src/hooks/useNotifications.ts`**
- `useNotifications()` -- list user's notifications, ordered by created_at desc
- `useUnreadNotificationCount()` -- count of unread notifications (for badge)
- `useNotificationMutations()` -- returns:
  - `markAsRead(id)` -- update single notification `is_read = true`
  - `markAllAsRead()` -- update all user's notifications
  - `deleteNotification(id)` -- delete single
  - `clearAll()` -- delete all user's notifications
- All invalidate `['notifications']` query key

**New file: `src/hooks/useResumeShares.ts`**
- `useResumeShares(resumeId)` -- list shares for a specific resume
- `usePublicResume(token)` -- fetch resume data by share token (no auth required), joins `resume_shares` with `resumes`
- `useResumeShareMutations()` -- returns:
  - `createShare(resumeId, options?)` -- generates a random token, inserts share row
  - `updateShare(id, updates)` -- toggle active, set password/expiry
  - `deleteShare(id)` -- remove share
  - `incrementViewCount(token)` -- calls the database function
- All invalidate `['resume-shares', resumeId]` query key

---

### Hook Pattern (consistent across all hooks)

```text
useQuery hooks:
  - queryKey includes user?.id for cache scoping
  - enabled: !!user (except usePublicResume which needs no auth)
  - Returns typed data with fallback empty arrays

useMutation hooks:
  - Check user auth before executing
  - Set user_id from auth context (not from input)
  - Invalidate relevant query keys on success
  - Toast success/error messages
  - Return mutation objects for component consumption
```

---

### Files Summary

| Action | File |
|--------|------|
| Migration | Single SQL migration with 3 new tables + 2 ALTER TABLE + triggers + RLS policies + increment function |
| Create | `src/hooks/useJobs.ts` |
| Create | `src/hooks/useNotifications.ts` |
| Create | `src/hooks/useResumeShares.ts` |
| Edit | `src/hooks/useJobApplications.ts` (add `job_id` to interface, `screening` to status) |
| Edit | `src/hooks/useCoverLetters.ts` (add `title`, `updated_at`, single fetch, update mutation) |

