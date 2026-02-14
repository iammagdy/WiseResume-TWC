

## Career Planning & Job Search Enhancement

Builds on top of the existing `CareerPathSheet`, `career-path-advisor` edge function, `jobs` table, and `ApplicationsPage`. No external job board APIs (Indeed, LinkedIn) are used -- instead, we enhance the existing job management system with AI-powered features and add a standalone career planning page.

---

### What Already Exists (No Changes Needed)

- `CareerPathSheet.tsx` -- AI career analysis with next roles, skill gaps, industry alternatives, action plan
- `career-path-advisor` edge function -- Lovable AI gateway integration
- `jobs` table -- Full CRUD for saved jobs
- `job_applications` table -- Application tracking with status pipeline
- `ApplicationsPage.tsx` -- Tabs for applications + saved jobs
- `ApplicationTrackerPage.tsx` -- Status timeline for individual applications
- `JobDetailPage.tsx` -- Job detail view with apply flow

### Part 1: Career Planning Page

A new `/career` page that promotes the existing career path analysis from a hidden sheet into a first-class feature with persistent results and a visual roadmap.

#### Database Changes

New `career_assessments` table:
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL)
- `resume_id` (uuid, nullable) -- which resume was analyzed
- `result` (jsonb, NOT NULL) -- full CareerPathResult
- `quiz_answers` (jsonb, default '{}') -- career quiz responses
- `completed_milestones` (jsonb, default '[]') -- tracked progress
- `created_at`, `updated_at` (timestamps)
- RLS: users can only access their own assessments

#### New Files

**1. `src/pages/CareerPage.tsx`** -- Career planning dashboard
- Header with back button and "Career Plan" title
- If no assessment exists: shows career quiz intro card with "Start Assessment" button
- If assessment exists: shows results in a scrollable card layout:
  - Current position summary card (field, level, years)
  - Visual roadmap timeline (Now -> 3mo -> 6mo -> 1yr -> 3yr) as vertical cards with milestone checkboxes
  - Skill gaps section with priority badges
  - Next roles section with match scores
  - Action plan steps with progress tracking
- "Re-analyze" button at bottom
- Pull-to-refresh

**2. `src/components/career/CareerQuizSheet.tsx`** -- Career assessment quiz (bottom sheet, 90% height)
- 10 mobile-friendly questions (swipeable):
  1. Current role satisfaction (1-5 scale)
  2. Career goal (promotion / switch role / switch industry / freelance / leadership)
  3. Skills to develop (multi-select chips)
  4. Work preference (remote / hybrid / office)
  5. Timeline for next move (3mo / 6mo / 1yr / 2yr+)
  6. Salary priority (critical / important / flexible)
  7. Industry interest (multi-select from 12 industries)
  8. Biggest career challenge (free text, optional)
  9. Learning preference (courses / mentorship / hands-on / certifications)
  10. Geographic flexibility (yes / no / partially)
- Progress bar at top
- Large touch-friendly option buttons (48px height)
- "Back" and "Next" navigation
- On completion: triggers AI analysis combining quiz + resume data

**3. `src/components/career/CareerRoadmap.tsx`** -- Visual roadmap component
- Vertical timeline with milestone cards at 5 time horizons
- Each card shows: skills to learn, certifications, estimated salary range, relevant job titles
- Tap to expand/collapse details
- "Mark Complete" checkbox per milestone (persisted to DB)
- Progress percentage calculated from completed milestones

**4. `src/components/career/SkillGapAnalyzer.tsx`** -- Skill comparison component
- Takes user's current skills vs required skills for target role
- Visual bar chart showing match percentage per skill category
- Missing skills highlighted with "Add to Learning Plan" action
- Color-coded priority: critical (red), important (amber), nice-to-have (gray)

**5. `src/hooks/useCareerAssessment.ts`** -- Data hook
- `useCareerAssessment()` -- fetches latest assessment for user
- `useCareerMutations()` -- create/update assessment, toggle milestones
- Uses TanStack Query with `career-assessments` query key

**6. `supabase/functions/career-assessment/index.ts`** -- Enhanced edge function
- Accepts `{ resume, quizAnswers }` 
- Extends existing career-path-advisor prompt with quiz context
- Returns enhanced `CareerPathResult` plus roadmap milestones
- Uses `google/gemini-2.5-flash` via Lovable AI gateway

#### Files to Modify

- `src/App.tsx` -- Add lazy route for `/career`
- `src/components/layout/AppShell.tsx` -- Add `/career` to TAB_ROUTES
- `src/pages/DashboardPage.tsx` -- Add "Career Plan" action card in the quick actions grid

---

### Part 2: Job Search Enhancement

Enhance the existing `ApplicationsPage` with search/filter capabilities and AI resume-job match scoring. No external APIs -- users manually save jobs (or jobs are captured from the tailor flow), and the app provides AI-powered matching.

#### New Files

**7. `src/components/applications/JobSearchSheet.tsx`** -- Search/filter bottom sheet
- Search input for job title/company keywords
- Filter chips: job type (full-time, part-time, contract, remote), location, salary range
- Applied filters shown as removable badges
- Results update the existing jobs list in ApplicationsPage

**8. `src/components/applications/JobMatchScore.tsx`** -- AI match score badge
- Small circular score badge (0-100%) shown on each job card
- Tap to expand breakdown: skills match, experience match, keyword overlap
- "Tailor Resume" button that navigates to editor with TailorSheet pre-opened
- Score is computed client-side by comparing job requirements text against resume skills/experience

**9. `src/lib/jobMatchScorer.ts`** -- Client-side match scoring
- `scoreJobMatch(resume: ResumeData, job: Job): JobMatchResult`
- Keyword extraction from job description/requirements
- Skill matching against resume skills array
- Experience level estimation from years
- Returns `{ overall: number, skillMatch: number, experienceMatch: number, keywords: { found: string[], missing: string[] } }`
- No AI call needed -- pure text comparison for instant results

**10. `src/components/applications/SaveJobSheet.tsx`** -- Quick save job sheet
- Compact bottom sheet for manually saving a job
- Fields: title, company, location, job type, salary range, source URL, description
- "Paste Job URL" button that auto-fills from clipboard
- Integrates with existing `useJobMutations().createJob`

#### Files to Modify

- `src/pages/ApplicationsPage.tsx` -- Add search icon in header that opens JobSearchSheet, add match score badge to job cards, add "Save Job" FAB
- `src/components/applications/JobActivityStats.tsx` -- Add "Career Plan" quick link card

---

### Technical Details

**Database migration (1 new table):**
```sql
CREATE TABLE public.career_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  resume_id uuid,
  result jsonb NOT NULL DEFAULT '{}',
  quiz_answers jsonb NOT NULL DEFAULT '{}',
  completed_milestones jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.career_assessments ENABLE ROW LEVEL SECURITY;
-- RLS policies for own data only
```

**No external API integrations** -- all job data is user-entered or captured from the tailor flow. Match scoring is client-side keyword comparison. Career analysis uses the existing Lovable AI gateway.

**Edge function reuse** -- The new `career-assessment` function extends the existing `career-path-advisor` pattern but adds quiz context to the prompt and returns roadmap milestones. The original function remains untouched.

**Mobile patterns:**
- Quiz uses full-width option buttons (48px height) with `active:scale-95` + haptics
- Roadmap timeline uses vertical scroll with expandable cards
- Match scores are lightweight badges that expand on tap
- All sheets use 85% height with drag handle
- Safe areas respected on all new pages

**Performance:**
- Career assessment results are persisted (not re-computed on every visit)
- Job match scoring is client-side (instant, no API call)
- Career page is lazy-loaded via `lazyWithRetry`
- Quiz state is held in component state (not persisted until submission)

#### Implementation Order

1. Database migration (career_assessments table)
2. Types and data hook (`useCareerAssessment.ts`)
3. Career assessment edge function
4. Career quiz sheet component
5. Career roadmap and skill gap components
6. Career page
7. Job match scorer (client-side)
8. Job search/filter sheet
9. Save job sheet
10. Update ApplicationsPage with search + match scores
11. Update App.tsx and AppShell with new route
12. Add dashboard access point

