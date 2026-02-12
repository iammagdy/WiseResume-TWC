

# Job Applications Tracker, Resume Versions, and AI Credits

This plan adds three new backend features to evolve WiseResume from a resume builder into a full job search platform.

## What's Being Built

### 1. Job Applications Tracker
A new page where users can track job applications with statuses (applied, interviewing, offer, rejected), linked to their resumes and cover letters.

### 2. Resume Version History
Automatic snapshots saved each time a resume is updated, allowing users to view previous versions and restore them.

### 3. AI Credits / Usage Quota System
Track AI feature usage per user with a free-tier daily limit and upgrade prompts when limits are reached.

---

## New Database Tables

### `job_applications`
Track which jobs users applied to, with which resume and cover letter.
- Links to `resumes` and `cover_letters` tables
- Status field: applied, interviewing, offer, rejected
- Notes, URL, and timestamps

### `resume_versions`
Automatic snapshots of resume state over time.
- Stores full resume data as JSONB
- Version number auto-incremented per resume
- Change summary for quick scanning

### `ai_credits`
One row per user tracking daily and total AI usage.
- Daily usage count with auto-reset date
- Daily limit (default 20 for free tier)
- Total lifetime usage counter

All tables get Row Level Security scoped to `auth.uid() = user_id`.

---

## New Frontend Features

### Job Applications Page (`/applications`)
- Kanban-style board or list view showing applications by status
- Quick-add from the editor (after tailoring a resume)
- Filter by status, sort by date
- New bottom tab bar entry

### Resume Version History
- "History" button in the editor toolbar
- Sheet showing previous versions with timestamps
- One-tap restore to any previous version
- Auto-save a version snapshot on each significant edit

### AI Usage Indicator
- Small badge in the AI Studio bar showing remaining daily credits
- Toast warning when approaching the limit
- Upgrade prompt sheet when limit is reached

---

## Technical Details

### Database Migration SQL

```text
-- Job Applications
CREATE TABLE public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_id UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
  cover_letter_id UUID REFERENCES public.cover_letters(id) ON DELETE SET NULL,
  job_title TEXT NOT NULL,
  company TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'applied',
  applied_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Resume Versions
CREATE TABLE public.resume_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id UUID NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  snapshot JSONB NOT NULL,
  change_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.resume_versions ENABLE ROW LEVEL SECURITY;

-- AI Credits
CREATE TABLE public.ai_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_usage INTEGER DEFAULT 0,
  daily_limit INTEGER DEFAULT 20,
  usage_date DATE DEFAULT CURRENT_DATE,
  total_usage INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ai_credits ENABLE ROW LEVEL SECURITY;
```

RLS policies: Standard `auth.uid() = user_id` for SELECT, INSERT, UPDATE, DELETE on all three tables.

### New Files to Create

- `src/hooks/useJobApplications.ts` -- React Query hooks for CRUD on job applications
- `src/hooks/useResumeVersions.ts` -- Hook to save/list/restore versions
- `src/hooks/useAICredits.ts` -- Hook to check/increment daily AI usage
- `src/pages/ApplicationsPage.tsx` -- Job tracker page with status columns
- `src/components/applications/ApplicationCard.tsx` -- Individual application card
- `src/components/applications/AddApplicationSheet.tsx` -- Sheet to add/edit an application
- `src/components/applications/StatusFilter.tsx` -- Filter chips for status
- `src/components/editor/VersionHistorySheet.tsx` -- Sheet showing resume versions
- `src/components/editor/ai/AICreditsIndicator.tsx` -- Badge showing remaining credits

### Files to Modify

- `src/App.tsx` -- Add `/applications` route
- `src/components/layout/BottomTabBar.tsx` -- Add "Applications" tab
- `src/hooks/useResumes.ts` -- Auto-save version on update
- `src/components/editor/AIAssistantBar.tsx` -- Show credits indicator
- `src/hooks/useAIEnhance.ts` -- Check credits before AI calls
- `src/pages/EditorPage.tsx` -- Add version history button

### Implementation Order

1. Run database migration (create 3 tables + RLS policies)
2. Create hooks (`useJobApplications`, `useResumeVersions`, `useAICredits`)
3. Build the Applications page and components
4. Add version history to the editor
5. Wire up AI credits checking in AI hooks
6. Update routing and navigation

