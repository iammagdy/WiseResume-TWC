

# AI Feature Enhancements for WiseResume

## Overview
Five high-impact AI features ranked by user value and implementation feasibility, building on the existing edge function architecture and Lovable AI gateway.

---

## Feature 1: Smart Resume Scoring Dashboard (Quick Win)

**What it does:** A persistent AI score widget on the Dashboard that auto-analyzes each resume on creation/edit and shows an at-a-glance "Resume Health" score (ATS readiness, completeness, impact language) -- without needing a job description.

**Why it matters:** Users currently need to paste a job description to get any score. A standalone quality score gives instant, always-visible feedback.

**Implementation:**
- New edge function `score-resume` that evaluates resume quality standalone (no job description needed)
- Scores: ATS format compliance, bullet strength, keyword density, completeness
- Cache score in `resumeStore` and display as a colored ring on each `ResumeListCard`
- Auto-trigger on resume save (debounced, background)

**Effort:** 1 edge function + minor UI changes to Dashboard cards

---

## Feature 2: AI Job Description Generator (Reverse Tailor)

**What it does:** Given a resume, the AI generates an ideal job description that the resume is best suited for. Users can then search for matching real jobs or use it to identify positioning gaps.

**Why it matters:** Many users don't know what roles they're best qualified for. This flips the tailor flow.

**Implementation:**
- New edge function `generate-ideal-job` using Gemini Flash
- Input: resume data; Output: ideal job title, description, salary range, key requirements
- New sheet accessible from AI Studio or Career Path
- Option to use the generated JD to auto-tailor the resume (circular optimization)

**Effort:** 1 edge function + 1 new UI sheet

---

## Feature 3: AI Writing Coach (Real-Time Inline Suggestions)

**What it does:** As users type in the Summary or Experience sections, subtle inline suggestions appear (like autocomplete) offering stronger action verbs, metrics prompts, or grammar fixes.

**Why it matters:** Current AI enhancement is batch-mode (click button, wait, review dialog). Real-time nudges feel more natural and educational.

**Implementation:**
- Debounced calls (3-5s after typing stops) to a lightweight `writing-coach` edge function using Gemini Flash Lite
- Returns 1-2 micro-suggestions (e.g., "Replace 'helped' with 'spearheaded'", "Add a metric here")
- Render as a subtle ghost-text or tooltip below the active field
- User can accept with Tab or dismiss
- Rate-limited to avoid excessive API calls (max 1 call per 10 seconds)

**Effort:** 1 edge function + inline suggestion component + hook

---

## Feature 4: Application Tracker with AI Follow-Up Generator

**What it does:** A simple job application tracker (company, role, date applied, status) with AI-powered follow-up email generation and smart reminders.

**Why it matters:** Resume building is step 1. Users need help with the application lifecycle. This keeps them inside the app post-resume.

**Implementation:**
- New database table `job_applications` (user_id, company, role, status, applied_at, followed_up_at, notes)
- New page `/applications` with status columns (Applied, Interviewing, Offer, Rejected)
- New edge function `generate-followup` that creates personalized follow-up emails based on resume + job details + days since application
- AI can analyze rejection patterns across applications (leveraging the existing `RejectionAnalysis` types in `aiStudio.ts`)

**Effort:** 1 migration + 1 page + 1 edge function + bottom tab update

---

## Feature 5: AI Skills Gap Roadmap with Learning Resources

**What it does:** Extends the existing Career Path Advisor to generate a personalized learning roadmap with specific free/paid course recommendations, estimated time to acquire each skill, and progress tracking.

**Why it matters:** The current career path feature identifies skill gaps but doesn't tell users HOW to close them. Actionable next steps increase retention.

**Implementation:**
- Enhance existing `career-path-advisor` edge function to include learning resource suggestions (course names, platforms, estimated hours)
- New `SkillRoadmapSheet` component showing a visual timeline of skills to learn
- Checkboxes for completed skills that persist in `settingsStore`
- Weekly AI nudge: "You planned to learn TypeScript this week -- here's a 2-hour crash course"

**Effort:** Edge function enhancement + 1 new sheet + store updates

---

## Recommended Priority Order

| Priority | Feature | User Impact | Effort |
|----------|---------|-------------|--------|
| 1 | Smart Resume Scoring Dashboard | High -- instant value, no friction | Low |
| 2 | AI Writing Coach | High -- transforms editing experience | Medium |
| 3 | AI Job Description Generator | Medium -- unique differentiator | Low |
| 4 | Application Tracker + Follow-Ups | High -- extends app lifecycle | Medium-High |
| 5 | Skills Gap Roadmap | Medium -- long-term retention | Medium |

---

## Which features would you like to implement?

Pick one or more from the list above and I'll build them out. I'd recommend starting with Feature 1 (Smart Resume Scoring) as it adds immediate visible value with minimal effort.
