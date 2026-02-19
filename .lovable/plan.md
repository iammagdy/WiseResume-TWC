

# Company Research Briefing Feature

## Overview

Add a "Company Research Briefing" tool that generates a one-page AI briefing before interviews. When a user has a job-targeted interview or a saved job, they can tap "Research Company" to get a structured briefing covering recent context, culture signals, key people, and personalized talking points connecting their resume to the company mission.

## Where It Lives

The briefing will be accessible from two entry points:

1. **Interview Setup page** -- When the user selects "Job-Targeted" mode and pastes a job description, a "Research Company" button appears below the textarea. Tapping it generates the briefing in a bottom sheet before launching the interview.
2. **AI Studio secondary tools** -- A new "Company Briefing" tool tile in the "More AI Tools" collapsible, which opens a sheet where users paste a company name + job description.

## User Flow

1. User pastes a job description (or selects a saved job)
2. Taps "Research Company"
3. Loading state with skeleton cards
4. AI returns structured briefing sections
5. User reads briefing, then proceeds to interview or closes

## Briefing Sections (AI-generated)

| Section | Content |
|---|---|
| Company Snapshot | Name, industry, size, HQ, founding year, mission statement |
| Recent Highlights | 3-5 recent developments (product launches, funding, partnerships, leadership changes) |
| Culture Signals | Work style, values, employee sentiment, Glassdoor-style insights inferred from the JD |
| Key People | Likely hiring manager role, team lead profiles based on department context |
| Talking Points | 3-5 personalized bullet points connecting the user's resume experience to the company's mission/needs |
| Questions to Ask | 3 smart questions the user can ask the interviewer |

## Technical Implementation

### 1. New Edge Function: `supabase/functions/company-briefing/index.ts`

- Accepts: `{ companyName, jobDescription, resumeData }`
- Auth: JWT verification via shared helper
- Rate limit: 10 requests/minute via `checkRateLimit`
- AI model: `google/gemini-2.5-flash` via shared `callAIWithRetry`
- Uses tool calling to return structured JSON with the six sections above
- Records usage via shared `recordUsage(userId, 'company_briefing')`
- Returns structured JSON matching a `CompanyBriefing` TypeScript type

### 2. New Types: `src/types/companyBriefing.ts`

```text
CompanyBriefing {
  companySnapshot: { name, industry, size, hq, founded, mission }
  recentHighlights: Array<{ title, summary, relevance }>
  cultureSignals: Array<{ signal, detail }>
  keyPeople: Array<{ role, context }>
  talkingPoints: Array<{ point, connection }>
  questionsToAsk: Array<{ question, why }>
}
```

### 3. New Hook: `src/hooks/useCompanyBriefing.ts`

- Wraps the edge function call in a TanStack `useMutation`
- Integrates with `useAIAction` for credit deduction (1 credit)
- Returns `{ generate, briefing, isLoading, error }`

### 4. New Component: `src/components/interview/CompanyBriefingSheet.tsx`

- Bottom sheet (Vaul drawer on mobile) displaying the briefing
- Skeleton loading state matching the final layout (6 card skeletons)
- Each section rendered as a compact card with icon + content
- "Talking Points" section highlighted with primary accent (most valuable)
- Scroll area for long content
- "Close" button and optional "Copy Summary" action

### 5. Integration into InterviewSetup

- In `InterviewSetup.tsx`, when mode is `job-targeted` and `jobDescription` has content, show a secondary ghost button: "Research Company" with a `Building2` icon
- Tapping opens `CompanyBriefingSheet` and triggers generation
- Non-blocking: user can still launch the interview without waiting

### 6. Integration into AI Studio

- Add a new entry in the `secondaryTools` array in `AIStudioPage.tsx`
- Opens a small sheet with company name + JD input, then shows the briefing

### 7. AI Cost Registration

- Add `'company_briefing'` to the `AI_COST_MAP` in `src/lib/aiCostEstimates.ts` with cost of 1 credit

### Files Created

| File | Purpose |
|---|---|
| `supabase/functions/company-briefing/index.ts` | Edge function for AI briefing generation |
| `src/types/companyBriefing.ts` | TypeScript types for briefing data |
| `src/hooks/useCompanyBriefing.ts` | React hook wrapping the mutation |
| `src/components/interview/CompanyBriefingSheet.tsx` | Bottom sheet UI for displaying the briefing |

### Files Modified

| File | Changes |
|---|---|
| `src/components/interview/InterviewSetup.tsx` | Add "Research Company" button in job-targeted mode |
| `src/pages/AIStudioPage.tsx` | Add Company Briefing to secondary tools list |
| `src/lib/aiCostEstimates.ts` | Register `company_briefing` cost |
| `supabase/config.toml` | Register new edge function with `verify_jwt = false` |

