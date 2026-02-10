

# Enhance AI Tailor with Powerful New Features

## Current State

The tailor feature is already comprehensive with: section-by-section control, score comparison, job intelligence, ATS analysis, bullet transformations, interview prep, skills gap analysis, cover letter generation, multi-job comparison, and tailor history.

## Proposed Enhancements

### 1. Auto-Tailor on URL Paste (Zero-Click Flow)

Currently, after pasting a URL and parsing it, the user must manually click "Tailor My Resume." With this enhancement, once a job URL is successfully parsed, tailoring starts automatically -- reducing the flow from 3 clicks to 1 paste.

**File: `src/components/editor/TailorSheet.tsx`**
- Add an `autoTailorOnParse` flag; when `JobUrlParser` calls `onParsed`, if a job description was returned and there's a current resume, automatically trigger `handleTailor()`
- Show a brief "Auto-tailoring..." toast so the user knows what's happening

### 2. Keyword Heatmap in Job Description

Show the user which keywords from the job description are already in their resume (green), missing (red), or partially matched (yellow). This gives instant visual feedback before even tailoring.

**New file: `src/components/editor/tailor/KeywordHeatmap.tsx`**
- Accepts `jobDescription` (string) and `resumeSkills` (string[]) plus `resumeText` (full resume text)
- Extracts significant keywords from the job description
- Color-codes them: green (found in resume), red (missing), amber (partial match)
- Shows a small summary: "12/18 keywords found (67%)"
- Displayed in TailorSheet between the job input and the "Tailor" button

### 3. Tailoring Intensity Selector

Let the user choose how aggressively the AI rewrites their resume: Light (minor keyword tweaks), Moderate (default), or Aggressive (full rewrite with maximum keyword density).

**File: `src/components/editor/TailorSheet.tsx`**
- Add a 3-option radio/toggle group: "Light / Moderate / Aggressive"
- Pass the selected intensity to `tailorResumeWithProgress`
- Default to "Moderate"

**File: `src/lib/aiTailor.ts`**
- Add `intensity` parameter to `tailorResumeWithProgress`
- Pass it through to the edge function

**File: `supabase/functions/tailor-resume/index.ts`**
- Accept `intensity` from the request body
- Adjust the system prompt based on intensity:
  - Light: "Make minimal changes. Only adjust keywords and phrasing to better match. Preserve the candidate's original voice."
  - Moderate: (current behavior)
  - Aggressive: "Maximize ATS compatibility. Rewrite extensively using exact job description terminology. Transform every bullet point."

### 4. "What If" Quick Actions Post-Tailor

After tailoring, add quick one-tap actions in the results view:
- "Add a Projects section" -- suggests adding relevant side projects based on job requirements
- "Reorder sections" -- AI recommends optimal section ordering for this specific job
- "Quantify more" -- re-processes only the bullets that lack metrics and tries harder to add numbers

**File: `src/components/editor/tailor/QuickActions.tsx`** (new)
- Card-based UI with 3 quick actions
- Each triggers a lightweight AI call to `enhance-section` with specific instructions
- Results appear inline with one-tap apply

**File: `src/components/editor/TailorSheet.tsx`**
- Add `QuickActions` component below the action buttons in the results view

### 5. Fit Score Badge on Dashboard

After tailoring, show a small badge on the resume card in the dashboard indicating the last tailor match score (e.g., "87% match - Software Engineer @ Google").

**File: `src/components/dashboard/ResumeListCard.tsx`**
- Check if the resume has tailor history in the store
- If yes, show a small badge with the most recent score and job title

**File: `src/store/resumeStore.ts`**
- Ensure tailor history is keyed by resume ID so dashboard cards can look it up

## Technical Summary

| Change | Files | Complexity |
|--------|-------|------------|
| Auto-tailor on parse | TailorSheet.tsx | Low |
| Keyword Heatmap | New KeywordHeatmap.tsx, TailorSheet.tsx | Medium |
| Intensity Selector | TailorSheet.tsx, aiTailor.ts, tailor-resume edge function | Medium |
| Quick Actions | New QuickActions.tsx, TailorSheet.tsx | Medium |
| Fit Score Badge | ResumeListCard.tsx, resumeStore.ts | Low |

All enhancements are additive and don't break existing functionality. The edge function update for intensity is backward-compatible (defaults to "moderate" if not provided).
