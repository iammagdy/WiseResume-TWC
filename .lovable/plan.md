

# Analyze Job -- User Flow Audit and Gap Report

## Overview

There are actually **two separate "analyze job" features** that serve different purposes but overlap confusingly:

1. **AnalyzeJobSheet** (Dashboard) -- Parses a job URL/description, shows title + company, then lets you save the job or pick a resume to tailor.
2. **JobAnalysisSheet** (Editor / AI Studio) -- Takes a job description and runs AI-powered match scoring against the current resume (skills match, ATS score, gap analysis).

Both are called "Analyze" in some form, creating user confusion. Here are the issues found:

---

## CRITICAL: `parseJobUrl()` Discards Rich Data from the Backend

The `parse-job-url` edge function returns a rich payload:
- `experienceLevel`, `salaryRange`, `workMode`
- `mustHaveSkills`, `niceToHaveSkills`
- `companyCultureSignals`, `benefits`, `redFlags`
- `yearsExperience`, `applicationDeadline`

But the client-side `parseJobUrl()` function in `aiTailor.ts` types its return as `{ title, company, description }` only. All the rich intelligence the AI extracts is thrown away. The `AnalyzeJobSheet` results phase only shows title, company, and a 300-character truncated description -- making the "Analyze" button feel like it does almost nothing.

**Fix:** Update `parseJobUrl()` return type to include all fields. Update `AnalyzeJobSheet` results phase to display the rich data (experience level badge, salary range, must-have vs nice-to-have skills, work mode, red flags).

---

## HIGH: JobAnalysisSheet Bypasses Credit System

`JobAnalysisSheet` calls `analyzeResume()` directly -- no `useAIAction` wrapper. This means:
- No credit check before the expensive AI call
- No credit deduction after
- `'analyze'` is not even in `AI_COST_MAP`

Every other AI feature uses `useAIAction`. This is an unmetered bypass.

**Fix:** Add `'analyze': 2` to `AI_COST_MAP` and wrap the `analyzeResume()` call in `useAIAction({ operation: 'analyze' }).execute()`.

---

## HIGH: AnalyzeJobSheet Fake "Analyzing" Progress

When the user pastes a URL and `JobUrlParser` already parsed title/company, tapping "Analyze Job" runs a fake animation (5 steps x 300ms = 1.5s) that does nothing new -- it just updates `parsedJob.description` and switches to results. For manual text input, it uses a crude heuristic (regex for "company" or "at") to guess company name, which fails for most real job descriptions.

This is misleading. If we're already showing rich parsed data from Step 1 above, the "Analyze" button becomes meaningful. For manual text input, the heuristic should be replaced with actual AI extraction.

**Fix:** For manual text input, send the text to `parse-job-url` edge function (or a new lightweight edge function) to extract structured data via AI instead of using the broken regex heuristic. For URL-parsed jobs, skip the fake progress entirely and go straight to results.

---

## MEDIUM: No "Start Over" or "Edit" from Results

Once `AnalyzeJobSheet` shows results, the only options are "Tailor a Resume" or "Save Job for Later". There's no way to:
- Edit the job description
- Analyze a different job
- Go back to the input phase

Users are stuck unless they close and reopen the sheet.

**Fix:** Add a "Start Over" or back-arrow button in the results phase header.

---

## MEDIUM: JobAnalysisSheet Shows Stale Results

`JobAnalysisSheet` reads `matchScore` and `gapAnalysis` from the Zustand store. These persist across open/close cycles. If a user analyzes Job A, closes the sheet, edits their resume, then reopens the sheet, they see stale scores from Job A with no indication the data is outdated.

**Fix:** Clear `matchScore` and `gapAnalysis` from the store when the sheet closes, or show a "Results may be outdated" warning if the resume was modified since the last analysis.

---

## LOW: AnalyzeJobSheet Doesn't Use Credits for URL Parsing

The `parse-job-url` edge function uses `recordUsage()` server-side but the client doesn't gate it with `useAIAction`. This means no credit check before the AI call. Given that URL parsing is a lighter operation and already rate-limited server-side, this is lower priority but should be consistent with the rest of the app.

---

## LOW: "Supported Sites" Badges Are Misleading

`JobUrlParser` shows badges for LinkedIn, Indeed, Glassdoor, and "Any URL". But the backend whitelist includes 25+ domains, and "Any URL" is false -- arbitrary domains are rejected. The badge should say "25+ job sites" or list the actual supported ones.

---

## Implementation Plan

### Step 1: Surface rich parsed data in AnalyzeJobSheet

- Update `parseJobUrl()` return type in `aiTailor.ts` to include all fields from the edge function
- Redesign the `AnalyzeJobSheet` results phase to show: experience level badge, salary range, work mode, must-have skills, nice-to-have skills, benefits, red flags, culture signals
- Remove fake progress animation when URL already parsed; go straight to rich results
- For manual text input, send the text to the backend for AI extraction instead of using the heuristic regex

### Step 2: Add credit gating to JobAnalysisSheet

- Add `'analyze': 2` to `AI_COST_MAP`
- Wrap `analyzeResume()` in `useAIAction({ operation: 'analyze' }).execute()`

### Step 3: Add "Start Over" to AnalyzeJobSheet results

- Add a back button/link in the results phase that calls `resetState()` to return to the input phase

### Step 4: Clear stale results in JobAnalysisSheet

- On sheet close (`onOpenChange(false)`), clear `matchScore` and `gapAnalysis` from the Zustand store so reopening always starts fresh

### Step 5: Minor fixes

- Update supported sites badges to be accurate ("25+ job sites supported")
- Ensure consistent credit gating pattern

### Files to modify:

| File | Change |
|------|--------|
| `src/lib/aiTailor.ts` | Expand `parseJobUrl()` return type to include all rich fields |
| `src/components/dashboard/AnalyzeJobSheet.tsx` | Show rich parsed data, remove fake progress, add "Start Over" button |
| `src/components/editor/JobAnalysisSheet.tsx` | Add `useAIAction` credit gating, clear stale results on close |
| `src/lib/aiCostEstimates.ts` | Add `'analyze': 2` entry |
| `src/components/editor/tailor/JobUrlParser.tsx` | Fix supported sites badges |

