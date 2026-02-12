

# Backend Growth Plan: Production-Ready Database

## The Problem

Right now, WiseResume only has 3 database tables (`resumes`, `profiles`, `ai_usage_logs`). Most valuable user data lives in **localStorage only** via Zustand stores. This means:

- Reinstalling the app = all tailor history, cover letters, interview results are **gone**
- Switching devices = starting over
- Clearing browser/app data = everything lost

For a production Android app, this is unacceptable.

## What Needs to Move to the Database

### Priority 1 -- Critical for Launch

**1. Cover Letters Table**
Users generate cover letters but they only exist in localStorage. These should persist in the cloud.

- Fields: id, user_id, resume_id, job_title, company, tone, content, created_at
- RLS: Users can only access their own cover letters

**2. Tailor History Table**
Every time a user tailors their resume to a job, the result (before/after scores, changes, job details) is stored locally. This is high-value data.

- Fields: id, user_id, resume_id, job_title, company, job_description, tailor_result (JSONB), score_before, score_after, applied_sections (JSONB), created_at
- RLS: Users can only access their own history

**3. User Preferences Table**
Settings like default template, PDF options, biometric preferences, and onboarding flags are all localStorage-only.

- Fields: id, user_id, default_template, pdf_defaults (JSONB), biometric_enabled, biometric_timeout, onboarding_flags (JSONB), ai_provider, updated_at
- RLS: Users can only access their own preferences

### Priority 2 -- Important for Growth

**4. Interview Sessions Table**
Mock interview results (scores, transcript, feedback) are not persisted at all. Users cannot review past interviews.

- Fields: id, user_id, resume_id, job_title, job_description, interview_type, messages (JSONB), overall_score, strengths (JSONB), improvements (JSONB), duration_seconds, created_at
- RLS: Users can only access their own sessions

**5. Job Applications Tracker (Future)**
Not built yet, but a natural next feature -- let users track which jobs they applied to with which resume version.

- Fields: id, user_id, resume_id, cover_letter_id, job_title, company, status (applied/interviewing/offer/rejected), applied_at, notes, url
- RLS: Users can only access their own applications

### Priority 3 -- Nice to Have

**6. Feedback / App Ratings Table**
Capture in-app feedback and ratings for product improvement.

## Implementation Approach

### Database Changes
- Create 4 new tables (cover_letters, tailor_history, user_preferences, interview_sessions) with proper RLS policies
- All tables use `user_id` referencing `auth.users(id)` with `ON DELETE CASCADE`
- All tables have RLS enabled with policies scoped to `auth.uid() = user_id`

### Frontend Changes
- Update Zustand stores to sync with the database when user is authenticated
- Keep localStorage as offline cache / guest mode fallback
- Add migration logic: on first login, push any existing localStorage data to the database
- Update hooks (`useResumes.ts` pattern) for each new table

### Sync Strategy
- **Authenticated users**: Read/write to database, cache in Zustand
- **Guest users**: localStorage only (existing behavior)
- **First login**: One-time migration of localStorage data to database

## Technical Details

```sql
-- Cover Letters
CREATE TABLE public.cover_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_id UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
  job_title TEXT NOT NULL,
  company TEXT,
  tone TEXT DEFAULT 'professional',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.cover_letters ENABLE ROW LEVEL SECURITY;

-- Tailor History
CREATE TABLE public.tailor_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_id UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
  job_title TEXT NOT NULL,
  company TEXT,
  job_description TEXT,
  tailor_result JSONB NOT NULL DEFAULT '{}'::jsonb,
  score_before INTEGER,
  score_after INTEGER,
  applied_sections JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.tailor_history ENABLE ROW LEVEL SECURITY;

-- User Preferences
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  default_template TEXT DEFAULT 'modern',
  pdf_defaults JSONB DEFAULT '{}'::jsonb,
  biometric_enabled BOOLEAN DEFAULT false,
  biometric_timeout INTEGER DEFAULT 30000,
  onboarding_flags JSONB DEFAULT '{}'::jsonb,
  ai_provider TEXT DEFAULT 'wiseresume',
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Interview Sessions
CREATE TABLE public.interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_id UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
  job_title TEXT,
  job_description TEXT,
  interview_type TEXT DEFAULT 'general',
  messages JSONB DEFAULT '[]'::jsonb,
  overall_score INTEGER,
  strengths JSONB DEFAULT '[]'::jsonb,
  improvements JSONB DEFAULT '[]'::jsonb,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
```

Each table gets standard RLS policies:
- SELECT: `auth.uid() = user_id`
- INSERT: `auth.uid() = user_id`
- UPDATE: `auth.uid() = user_id` (where applicable)
- DELETE: `auth.uid() = user_id`

## Scope

This plan covers creating the 4 Priority 1 and Priority 2 tables with RLS, plus updating the frontend stores and hooks to sync with the database. The job applications tracker (Priority 3) can be added later as a new feature.

