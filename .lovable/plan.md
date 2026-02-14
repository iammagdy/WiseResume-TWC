

## Resignation Letter Builder + Enhanced Interview Prep

### Part 1: Resignation Letter Builder

Reuses the existing cover letter architecture (DB table, hooks, edge function, multi-page flow) adapted for resignation letters.

#### Database Changes

New `resignation_letters` table (mirrors `cover_letters` structure):
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL)
- `title` (text, nullable)
- `recipient_name` (text) -- manager's name
- `company` (text)
- `position` (text) -- user's current position
- `last_working_day` (date)
- `notice_period` (text) -- '2_weeks', '1_month', 'immediate'
- `reason` (text) -- 'new_opportunity', 'career_growth', 'relocation', etc.
- `tone` (text, default 'professional') -- 'formal', 'grateful', 'direct'
- `template_style` (text) -- 'standard', 'short', 'grateful', 'career_growth', 'immediate', 'retirement'
- `additions` (jsonb, default '[]') -- selected optional additions
- `content` (text, NOT NULL)
- `checklist_progress` (jsonb, default '[]') -- completed checklist items
- `created_at`, `updated_at` (timestamps)
- RLS: users can only access their own letters

#### New Edge Function

**`supabase/functions/generate-resignation-letter/index.ts`**
- Accepts: `{ recipientName, company, position, lastWorkingDay, noticePeriod, reason, tone, templateStyle, additions, resumeData? }`
- Uses Lovable AI gateway (`google/gemini-3-flash-preview`)
- System prompt instructs AI to generate a professional resignation letter with:
  - Proper business letter format
  - Selected tone (formal to friendly slider maps to tone values)
  - Optional additions (gratitude, transition help, reference request, etc.)
  - Appropriate length (1 page)
- Auth check follows existing edge function pattern
- Input validation with size limits

#### New Files

**1. `src/hooks/useResignationLetters.ts`** -- Data hook (mirrors `useCoverLetters.ts`)
- `useResignationLetters()` -- fetch all for user
- `useResignationLetter(id)` -- fetch single
- `useResignationLetterMutations()` -- save, update, delete

**2. `src/pages/ResignationLettersPage.tsx`** -- Dashboard listing all letters
- Header with back button
- List of saved resignation letters (cards with company, date, status)
- "New Letter" FAB
- Empty state with illustration

**3. `src/pages/ResignationLetterNewPage.tsx`** -- Guided creation flow
- Step 1: Basic Info (name auto-filled from resume, position, company, manager name, last working day date picker, notice period selector, reason dropdown)
- Step 2: Tone + Template (tone slider: Formal/Balanced/Friendly, template style cards: Standard, Short, Grateful, Career Growth, Immediate, Retirement)
- Step 3: Optional Additions (checkbox list: transition assistance, gratitude, positive experiences, train replacement, request reference, include contact info)
- Step 4: AI generates letter, shows editable result
- StepperNav-style progress indicator at top
- Bottom toolbar with Copy, PDF, Save buttons (same pattern as `CoverLetterNewPage`)

**4. `src/pages/ResignationLetterEditPage.tsx`** -- Edit existing letter
- Load letter by ID
- Full text editor with preview toggle
- Regenerate button
- Resignation checklist section at bottom:
  - 10 checklist items (review contract, schedule meeting, document work, return property, etc.)
  - Progress persisted to `checklist_progress` in DB
  - Progress percentage shown
- Export: PDF, DOCX, clipboard copy

**5. `src/components/resignation/ResignationChecklist.tsx`** -- Checklist component
- 10 pre-defined items with descriptions
- Swipe-to-complete or tap checkbox
- Progress bar at top
- Haptic feedback on completion

#### Files to Modify

- `src/App.tsx` -- Add 3 lazy routes: `/resignation-letters`, `/resignation-letter/new`, `/resignation-letter/edit/:id`
- `src/components/layout/AppShell.tsx` -- Add `/resignation-letter` to TAB_ROUTES
- `src/pages/DashboardPage.tsx` -- Add "Resignation Letter" action card in the quick actions grid (with `FileSignature` icon)

---

### Part 2: Enhanced Interview Prep

Layers new features on top of the existing voice interview without modifying its core. The existing `useVoiceInterview`, `InterviewSetup`, `InterviewSummary`, and `interview-chat` edge function remain untouched.

#### Database Changes

Add columns to existing `interview_sessions` table:
- `interview_type` already exists (default 'general')
- `job_title` already exists
- `job_description` already exists
- No new columns needed -- the table already supports all required data

#### New Files

**6. `src/components/interview/InterviewHistorySheet.tsx`** -- Past sessions bottom sheet
- Fetches from `interview_sessions` table
- Shows cards: date, duration, overall score, job title
- Tap to view full transcript and score breakdown
- Delete option per session

**7. `src/hooks/useInterviewHistory.ts`** -- Data hook
- `useInterviewHistory()` -- fetches all sessions for user, ordered by date
- `useSaveInterviewSession()` -- mutation to persist session after completion

**8. `src/components/interview/InterviewTipsSheet.tsx`** -- Tips library bottom sheet
- Accordion sections:
  - STAR Method Reminder (with examples)
  - Body Language Tips
  - Common Mistakes to Avoid
  - Salary Negotiation Scripts
  - Questions to Ask the Interviewer (10+ curated)
  - Thank You Email Template
- Static content, no API calls

**9. `src/components/interview/InterviewStatsCard.tsx`** -- Performance analytics card
- Shows on InterviewSetup page when user has past sessions
- Average score trend (sparkline using recharts)
- Total sessions count
- Best score badge
- "View History" button

#### Files to Modify

**10. `src/pages/InterviewPage.tsx`** -- Enhance setup phase
- Add "History" button in header (opens InterviewHistorySheet)
- Add "Tips" button in header (opens InterviewTipsSheet)
- Add InterviewStatsCard above the mode selection (when history exists)
- After interview ends (summary phase), auto-save session to `interview_sessions` table

**11. `src/components/interview/InterviewSetup.tsx`** -- Add practice mode selector
- Add a third mode card: "Quick Practice" (5 questions, no job description needed)
- Quick practice passes a flag to `interview-chat` to limit to 5 questions
- Existing General and Job-Targeted modes remain unchanged

**12. `src/components/interview/InterviewSummary.tsx`** -- Add save + share
- "Save Session" button (persists to DB if authenticated)
- "Share Results" button (copies summary text)
- "Practice Tips" link to tips sheet

**13. `supabase/functions/interview-chat/index.ts`** -- Minor prompt enhancement
- Add `quickPractice` flag handling: when true, system prompt instructs AI to ask exactly 5 questions then provide summary
- No other changes to existing logic

---

### Technical Details

**Database migration (1 new table + no column changes needed):**
The `interview_sessions` table already has all needed columns. Only `resignation_letters` needs creation.

**Edge function pattern:** The resignation letter edge function follows the exact same pattern as `generate-cover-letter` -- auth check, input validation, Lovable AI gateway call, return generated text.

**Mobile patterns:**
- Guided creation flow uses step indicators with large touch targets (48px buttons)
- Date picker uses existing Shadcn Calendar in Popover with `pointer-events-auto`
- Checklist items have swipe-to-complete with `active:scale-95` + haptics
- All sheets use 85% height with drag handle
- Safe areas: `pt-safe` on headers, `pb-safe` on bottom actions

**Performance:**
- All new pages lazy-loaded via `lazyWithRetry`
- Interview history uses TanStack Query with `interview-sessions` key
- Resignation letters use same caching strategy as cover letters
- Tips content is static (no API calls)

**Interview session persistence flow:**
1. User completes interview (summary phase)
2. `InterviewSummary` calls `useSaveInterviewSession().mutate()` with transcript, scores, duration, job info
3. Session saved to `interview_sessions` table
4. Next visit to InterviewSetup shows stats from history

#### Implementation Order

1. Database migration (resignation_letters table)
2. Generate resignation letter edge function
3. useResignationLetters hook
4. ResignationLettersPage (listing)
5. ResignationLetterNewPage (guided creation)
6. ResignationLetterEditPage + ResignationChecklist
7. useInterviewHistory hook
8. InterviewHistorySheet + InterviewTipsSheet
9. InterviewStatsCard
10. Update InterviewPage with history/tips integration
11. Update InterviewSetup with quick practice mode
12. Update InterviewSummary with save/share
13. Minor interview-chat prompt update
14. Route registration in App.tsx + AppShell + Dashboard access point

