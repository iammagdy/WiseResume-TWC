# Editor ATS panel relabelled as "Job Match Analysis" / "Keyword Match Score"

**Last verified:** 2026-04-23
**Type:** stability fix (clarity / honesty)
**Sources:**
- `src/pages/EditorPage.tsx` (Tools-sheet entry, mobile inline ATS Scan summary footnote)
- `src/components/editor/JobAnalysisSheet.tsx` (overall score header relabeled, breakdown ScoreCard relabeled, footnote added)
- `src/components/editor/ATSScanSheet.tsx` (footnote under keyword-match score)
- `src/components/editor/ATSInlineSuggestions.tsx` (caption clarifying suggestions reflect keyword overlap, not layout or external-tool scores)
- `src/components/editor/TailorSheet.tsx` (toast + error copy "ATS score" → "Keyword match score")
- `src/components/editor/tailor/TailorProgress.tsx` (step label "Calculating ATS score" → "Calculating keyword match score")
- `src/components/editor/ai/AIEnhanceSheet.tsx` (sheet title "ATS Score Optimization" → "ATS Keyword Optimization")
- `.local/tasks/task-12.md` (per-task brief)

**Canonical owner:** `project-governance/CHANGELOG.md` entry dated 2026-04-23 — Task #12 ATS clarity

---

## Why it exists

The editor's "ATS Score" panel had been labelled and copywritten as if it predicted what an external applicant-tracking system (Jobscan, Resumeworded, Greenhouse parser, Workday parser, etc.) would score the resume at. It does not. The score is a **keyword and content overlap metric** computed against the user's pasted job description — it has no visibility into template-layout parsability, no calibration against any third-party ATS, and no signal about whether real ATSes will reject the file.

Two real-user risks followed from the misleading label:

1. **False confidence.** A user seeing "ATS Score: 87" might submit the resume believing it would survive an external ATS pass, then be silently rejected by a parser that disliked the template's two-column layout or photo header.
2. **False panic.** A user seeing "ATS Score: 42" might assume their template was the problem and switch to a different style — when in reality the score reflected only that the resume was missing keywords from the JD, which is fixable in five minutes by editing the bullet points.

Either outcome erodes trust the moment the user discovers what the metric actually measures.

## How it works now

The score is unchanged. Only the copy around it changed, in a coordinated pass across the editor surface, so that every place the score appears tells the user the same true story: this number measures how well your resume's content matches the job description's keywords, not whether an external ATS will parse the file correctly.

### Editor Tools sheet (`src/pages/EditorPage.tsx`)

The Tools-sheet entry that previously read **"ATS Check — Score against ATS systems"** now reads **"Job Match Analysis — Keyword & content match vs your job description"**. The mobile inline ATS Scan summary now carries the same one-line explanatory footnote as the bottom-sheet version.

### Job Analysis sheet (`src/components/editor/JobAnalysisSheet.tsx`)

The overall score header is relabelled **"Keyword Match Score"** and a plain-language footnote underneath explains the metric scope (keyword and content overlap with the pasted JD). The breakdown ScoreCard previously titled **"ATS Score"** is renamed **"ATS Keywords"**.

### ATS Scan sheet (`src/components/editor/ATSScanSheet.tsx`)

The same explanatory footnote appears under the keyword-match score, so a user who lands here from the inline shortcut sees the same framing as the user who comes from the dedicated Job Analysis sheet.

### Inline suggestions (`src/components/editor/ATSInlineSuggestions.tsx`)

When missing-keyword suggestions are surfaced beside an Experience or Education bullet, a small caption now clarifies the suggestions reflect keyword overlap with the pasted JD — not layout problems and not external ATS-tool scores.

### Tailor sheet (`src/components/editor/TailorSheet.tsx`)

Toast and error copy that previously surfaced "ATS score" are updated to **"Keyword match score"**, matching the rest of the editor.

### Tailor progress steps (`src/components/editor/tailor/TailorProgress.tsx`)

Step label **"Calculating ATS score"** → **"Calculating keyword match score"**.

### AI Enhance sheet (ATS mode) (`src/components/editor/ai/AIEnhanceSheet.tsx`)

Sheet title **"ATS Score Optimization"** → **"ATS Keyword Optimization"**.

## Out of scope (proposed as follow-ups #47 and #48)

- The Dashboard / Analytics ATS Score widgets, and the Multi-Job Compare / AI Studio A/B compare sheets, are tracked separately. The same relabelling discipline should be applied there but the current pass kept its blast radius to the editor's main tabs.

## What this does NOT change

- The scoring algorithm (`src/hooks/useResumeScore.ts`, `score-resume` edge function) is unchanged — same keyword extraction, same coverage maths, same weighting, same returned shape.
- No tests reference the changed strings, so there is no test churn from the rename.
- No change to the dashboard's per-resume ATS badge, the AI Studio A/B comparison, or any external integration that consumes the score field name.
