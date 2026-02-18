

## Resume A/B Comparison Tool in AI Studio

### Overview

A new "A/B Compare" tool in the AI Studio that lets users pick two resume versions, paste a job description, and get a side-by-side comparison showing which resume performs better for that role. It uses the existing deterministic `score-resume` edge function for ATS scoring plus the existing `analyze-resume` edge function for AI-powered job match analysis.

### User Flow

1. User taps "A/B Compare" in the Featured Tools section of AI Studio
2. A bottom sheet opens with two resume pickers (dropdown selects from user's resumes list)
3. User pastes a job description in a textarea
4. Taps "Compare" -- both resumes are scored in parallel
5. Results show:
   - Side-by-side ATS score rings (overall + 6 category bars)
   - AI job match scores (overall, skills, experience, keywords)
   - A "Winner" badge on the better-performing resume
   - A summary of key differences (which has better keywords, metrics, etc.)

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/ai-studio/ResumeABCompareSheet.tsx` | Main bottom sheet with resume pickers, job description input, comparison results UI |

### Files to Modify

| File | Change |
|------|---------|
| `src/pages/AIStudioPage.tsx` | Add lazy import for `ResumeABCompareSheet`, add state + button in Featured Tools, wire sheet |

### Technical Details

**`ResumeABCompareSheet.tsx`** (new file, ~350 lines):

- Props: `{ open: boolean; onOpenChange: (open: boolean) => void }`
- Uses `useResumes()` to fetch the user's resume list for the pickers
- Uses `dbToResumeData()` to convert DB resumes to `ResumeData` format for scoring
- Step 1 (input): Two `Select` dropdowns to pick Resume A and Resume B, plus a `Textarea` for the job description
- Step 2 (loading): Shows skeleton cards while scoring runs in parallel
- Step 3 (results): Side-by-side comparison with animated score rings

**Scoring approach** (no new edge functions needed):

1. Call `score-resume` edge function for Resume A and Resume B in parallel (deterministic ATS scores)
2. Call `analyze-resume` edge function for Resume A and Resume B in parallel (AI job match scores)
3. Combine results into a comparison view

**Results UI components** (all inline in the sheet):

- `ScoreRing`: Reuse the existing `ScoreRing` from `src/components/dashboard/ScoreRing.tsx`
- Winner determination: Compare `overallScore` from ATS + `score.overall` from job match, weighted 50/50
- Category bars: Show 6 ATS categories side-by-side with color-coded progress bars
- Key insights: Auto-generated text like "Resume A has 15% better keyword optimization" based on score deltas

**Integration into AI Studio page:**

- Add to imports: `const ResumeABCompareSheet = lazy(() => import(...))`
- Add state: `const [showABCompare, setShowABCompare] = useState(false)`
- Add a new Featured Tool button between Smart Tailor and Job Match Analysis with a `GitCompareArrows` icon and label "A/B Compare"
- Add sheet render in the Suspense block
- The tool does NOT require a pre-selected resume (user picks both in the sheet), so no `requireResume` guard

**Error handling:**

- If either score call fails, show a toast and allow retrying
- Rate limit errors (429) surface as user-friendly messages
- Auth errors (401) prompt re-login

