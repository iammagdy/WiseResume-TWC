

# Audit: Ensure All Tools Provide Real, Reliable Data

## Audit Results

After a thorough analysis of every scoring tool, AI feature, and content generator in the app, the codebase is in strong shape. All AI-powered tools call real backend functions with actual AI models -- there are zero fake data generators or mocked AI responses anywhere.

## One Issue Found

### Client-Side Job Match Scorer Uses Rough Heuristics

**File:** `src/lib/jobMatchScorer.ts`

The `scoreJobMatch` function runs entirely on the client using basic keyword matching and simple rules. It does NOT call AI. This means:

- **Skill matching** is just keyword overlap between job text and resume text. If no job keywords are found, it defaults to 50%.
- **Experience matching** uses only job title keywords ("senior", "junior") and estimated years. A generic title defaults to 50% or 80% based on a 2-year threshold.
- **Overall score** is a weighted average (70% skills + 30% experience) that can be misleading for edge cases.

This scorer is used on the **Applications page** to show match scores next to saved jobs. Users may perceive these as AI-generated insights when they are really rough text comparisons.

### Recommended Fix

Replace the client-side heuristic with real AI analysis by reusing the existing `analyze-resume` edge function (which already produces AI-powered skill/experience/keyword scores). For performance, cache the result per job+resume pair and compute it in the background.

**Changes:**

1. **`src/lib/jobMatchScorer.ts`** -- Add an async `scoreJobMatchAI` function that calls `analyze-resume` and maps the response to the existing `JobMatchResult` shape. Keep the current `scoreJobMatch` as an instant preview fallback while AI loads.

2. **`src/pages/ApplicationsPage.tsx`** -- Update the scoring logic to:
   - Show the instant heuristic score immediately (with a subtle indicator like a shimmer or "Quick estimate" label)
   - Fire background AI scoring for each job
   - Replace the heuristic score with the AI score once it arrives
   - Cache AI scores in memory keyed by `resumeId:jobId` to avoid redundant calls

3. **`src/components/applications/JobMatchScore.tsx`** -- Add a small visual indicator distinguishing "AI-verified" scores from "quick estimate" scores (e.g., a sparkle icon for AI scores, a tilde prefix for estimates).

## Everything Else Is Clean

| Tool | Data Source | Status |
|---|---|---|
| ATS Health Score | Deterministic code-based engine (server) | Real -- by design |
| Resume Completion Score | Deterministic field-presence rules (client) | Real -- by design |
| AI Job Analysis | `analyze-resume` edge function + Gemini | Real AI |
| Smart Tailor | `tailor-resume` edge function + Gemini | Real AI |
| Career Path Advisor | `career-path-advisor` edge function + Gemini | Real AI |
| Company Briefing | `company-briefing` edge function + Gemini | Real AI |
| Interview Coach | `interview-chat` edge function + Gemini | Real AI |
| Recruiter Simulation | `recruiter-simulation` edge function + Gemini | Real AI |
| LinkedIn Optimizer | `optimize-for-linkedin` edge function + Gemini | Real AI |
| AI Detector/Humanizer | `detect-and-humanize` edge function + Gemini | Real AI |
| Cover Letter Generator | `generate-cover-letter` edge function + Gemini | Real AI |
| Career Assessment | `career-assessment` edge function + Gemini | Real AI |
| Section AI Enhance | `enhance-section` edge function + Gemini | Real AI |
| Gap Explainer | `explain-gap` edge function + Gemini | Real AI |
| Gap Filler | `fill-gap` edge function + Gemini | Real AI |
| One-Page Optimizer | `one-page-optimizer` edge function + Gemini | Real AI |
| Agentic Chat | `agentic-chat` edge function + Gemini | Real AI |
| Resume Parser (PDF/LinkedIn) | `parse-resume` / `parse-linkedin` + Gemini | Real AI |
| Salary Coach | Not implemented (shows "Soon") | No fake data |
| Reverse Engineer | Not implemented (shows "Soon") | No fake data |
| Rejection Analyzer | Not implemented (shows "Soon") | No fake data |

## Summary

Only the **Job Match Score on the Applications page** uses a client-side heuristic that could mislead users. The fix adds background AI scoring with the existing `analyze-resume` function, while keeping the heuristic as an instant preview clearly labeled as an estimate.

