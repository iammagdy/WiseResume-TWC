> [!CAUTION]
> Historical / archived document. Do not treat as current project truth. Use Project Atlas/SOURCE_OF_TRUTH_MAP.md and living specs for current references.

# AI Feature Enhancements Technical Design Document

This document outlines the architecture, Supabase database schema changes, and UI components required to implement 8 new AI-powered features for the Wise Resume application.

## Table of Contents
1.  [Core Infrastructure Assumptions](#core-infrastructure-assumptions)
2.  [Feature 1: Cover Letter Generator](#feature-1-cover-letter-generator)
3.  [Feature 2: Real-Time ATS Score Panel](#feature-2-real-time-ats-score-panel)
4.  [Feature 3: Interview Performance Dashboard & Trends](#feature-3-interview-performance-dashboard--trends)
5.  [Feature 4: Skill Gap Analyzer](#feature-4-skill-gap-analyzer)
6.  [Feature 5: Portfolio Chat Personalization & Analytics](#feature-5-portfolio-chat-personalization--analytics)
7.  [Feature 6: Bulk Resume Section Booster](#feature-6-bulk-resume-section-booster)
8.  [Feature 7: AI-Powered Job Match Scoring](#feature-7-ai-powered-job-match-scoring)
9.  [Feature 8: Interview Question Bank & Custom Practice](#feature-8-interview-question-bank--custom-practice)
10. [Phased Implementation Plan](#phased-implementation-plan)

---

## Core Infrastructure Assumptions

- **Backend:** Supabase (Database + Edge Functions).
- **Frontend:** React + Vite + Zustand for state management.
- **AI Integration:** Shared `callAIWithRetry` client located in `supabase/functions/_shared/aiClient.ts` communicating with Gemini by default.
- **Charting Library:** We will use **Recharts** (`recharts`) for all dashboards (Features 2, 3, and 5) due to its seamless React integration, robust accessibility, and ease of customizing SVGs to match the existing Tailwind CSS design system.
- **Persistence:** All data is strictly persisted in Supabase tables. There is no Bolt Database.

---

## Feature 1: Cover Letter Generator

### Architecture
Add a new Edge Function `supabase/functions/generate-cover-letter` using the standard `serve` pattern. It will take a resume ID (to fetch normalized resume data) or raw JSON, a job description, and a `tone` parameter. It will leverage `callAIWithRetry` and prompt Gemini to generate the letter structured in three distinct sections (Opening, Body, Closing).

### Database Schema Changes
Create a new table `cover_letters`.
```sql
CREATE TABLE cover_letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
    job_title TEXT NOT NULL,
    company_name TEXT,
    job_description TEXT,
    tone TEXT DEFAULT 'professional',
    content JSONB NOT NULL, -- { opening: string, body: string, closing: string }
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### UI Components
- **`src/pages/CoverLetterGeneratorPage.tsx`**: A new tab alongside the resume editor. Contains a split-pane layout: a form on the left (Job Description, Tone Selector) and the generated preview on the right.
- **`src/components/CoverLetterPreview.tsx`**: Renders the generated letter. Allows clicking on individual sections (Opening, Body, Closing) to reveal a "Regenerate" button for targeted edge function calls.
- **`src/store/useCoverLetterStore.ts`**: Zustand store to hold the active cover letter state and generation status.

---

## Feature 2: Real-Time ATS Score Panel

### Architecture
The deterministic scoring logic currently exists entirely within `supabase/functions/score-resume`. It already calculates `keywordOptimization`, `contentQuality`, `sectionStructure`, `parsability`, `contactCompleteness`, and `lengthDensity`.
The `enhance-section` edge function is used for AI text manipulation. We will connect the existing output of `score-resume` to a new real-time UI component.
*Note: The prompt mentions the logic is in `enhance-section`, but the codebase reveals it's cleanly isolated in `score-resume` and `_shared/scoringFunctions.ts`. We will utilize the existing `score-resume` endpoint.*

### Database Schema Changes
None strictly required. Scores are computed on-the-fly based on the JSON resume payload.

### UI Components
- **`src/components/editor/ATSScoreSidebar.tsx`**: A collapsible sidebar component in the EditorPage.
- **`src/components/charts/ScoreRadarChart.tsx`**: Uses Recharts `<RadarChart>` to visually display the 6 scoring pillars.
- **`src/components/editor/ATSFixAllButton.tsx`**: Triggers a sequence of `enhance-section` calls (action: `ats_improve`) on the lowest-scoring sections in the background.

---

## Feature 3: Interview Performance Dashboard & Trends

### Architecture
Aggregate historical interview sessions saved in the database. Add a new RPC (Remote Procedure Call) function in Supabase or handle aggregation in a lightweight edge function `supabase/functions/analyze-interview-trends` to offload complex grouping and averaging from the client.

### Database Schema Changes
Ensure an `interview_sessions` table exists (or create/modify it) to track specific answers, question categories, and AI-graded scores.
```sql
CREATE TABLE interview_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    mode TEXT NOT NULL, -- 'general' | 'job_targeted'
    overall_score INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE interview_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES interview_sessions(id) ON DELETE CASCADE,
    question_text TEXT,
    category TEXT, -- 'behavioral', 'technical', etc.
    user_answer TEXT,
    ai_score INTEGER,
    ai_feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### UI Components
- **`src/pages/InterviewDashboardPage.tsx`**: The main hub for interview prep.
- **`src/components/charts/ScoreTrendLineChart.tsx`**: Uses Recharts `<LineChart>` showing overall score progression over time.
- **`src/components/charts/CategoryBarChart.tsx`**: Uses Recharts `<BarChart>` comparing scores across behavioral vs. technical questions.
- **`src/components/interview/RecommendationsPanel.tsx`**: Displays AI-generated practice suggestions based on the lowest scoring `category` in recent sessions.

---

## Feature 4: Skill Gap Analyzer

### Architecture
Create a new edge function `supabase/functions/analyze-skill-gap`. It accepts the user's current resume JSON and a target job description. It prompts the AI to output a JSON array of missing skills, a match percentage, and bullet point suggestions.

### Database Schema Changes
None strictly required. Results can be transient or saved as part of Feature 7 (Job Match Scoring).

### UI Components
- **`src/components/editor/SkillGapModal.tsx`**: A modal accessible from the Skills section of the resume editor. Prompts the user to paste a job description.
- **`src/components/editor/MissingSkillItem.tsx`**: Renders a missing skill with an "Add to Resume" button that appends the skill to the Zustand store and triggers an auto-save.

---

## Feature 5: Portfolio Chat Personalization & Analytics

### Architecture
Extend the existing `ask-portfolio` edge function to accept a `persona` system prompt injected before the main context. For analytics, log every chat interaction to a new Supabase table.

### Database Schema Changes
Update existing portfolio settings and add chat persistence.
```sql
-- Assuming a portfolio_settings table exists, add:
ALTER TABLE portfolio_settings ADD COLUMN chat_persona TEXT DEFAULT 'professional and concise';

CREATE TABLE portfolio_chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL, -- Link to portfolio/user
    visitor_id TEXT NOT NULL, -- Cookie or fingerprint based
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE portfolio_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES portfolio_chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'user' | 'assistant'
    content TEXT NOT NULL,
    was_deflected BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE portfolio_faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### UI Components
- **`src/pages/PortfolioAnalyticsPage.tsx`**: A dashboard for portfolio owners.
- **`src/components/portfolio/ChatSettingsPanel.tsx`**: Allows setting the AI tone and pre-populating FAQs.
- **`src/components/portfolio/UnansweredQuestionsList.tsx`**: Queries `portfolio_chat_messages` where `was_deflected = true`.

---

## Feature 6: Bulk Resume Section Booster

### Architecture
Client-side orchestration in the React application. The frontend will sequence calls to the existing `enhance-section` edge function for each section (Summary, Experience items, etc.), respecting the AI credit limits and rate limits.

### Database Schema Changes
None required.

### UI Components
- **`src/components/editor/BulkBoosterModal.tsx`**: Displays a progress bar (`<progress>` or custom Tailwind component) as it iterates through sections.
- **`src/components/editor/DiffViewer.tsx`**: Shows a side-by-side or inline highlight of changes made by the AI, with "Accept" and "Reject" buttons for each section.

---

## Feature 7: AI-Powered Job Match Scoring

### Architecture
Combine web scraping (if URL provided) via a utility function and a new edge function `supabase/functions/score-job-match`. The function uses Gemini to evaluate the resume against the parsed job text, returning a structured JSON scoring breakdown.

### Database Schema Changes
```sql
CREATE TABLE job_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    resume_id UUID REFERENCES resumes(id) ON DELETE CASCADE,
    job_title TEXT NOT NULL,
    company_name TEXT,
    job_url TEXT,
    match_score INTEGER NOT NULL,
    category_scores JSONB NOT NULL, -- { skills: 80, experience: 90, education: 100, keywords: 60 }
    improvement_suggestions JSONB NOT NULL, -- Array of strings
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### UI Components
- **`src/pages/JobMatchTrackerPage.tsx`**: A Kanban board or table view of saved `job_matches`.
- **`src/components/JobMatchScoreCard.tsx`**: Displays the 0-100% score and the category breakdown.

---

## Feature 8: Interview Question Bank & Custom Practice

### Architecture
Update the frontend mock interview setup flow to pull from a custom question bank table rather than purely generating questions on the fly via `interview-chat`. Modify `interview-chat` to accept a `difficulty` parameter (entry, mid, senior) to adjust the system prompt.

### Database Schema Changes
```sql
CREATE TABLE interview_question_bank (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    question_text TEXT NOT NULL,
    category TEXT NOT NULL,
    difficulty TEXT DEFAULT 'mid-level',
    needs_practice BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### UI Components
- **`src/pages/QuestionBankPage.tsx`**: A data grid allowing users to add, edit, tag, and organize questions.
- **`src/components/interview/InterviewSetupModal.tsx`**: Updated to include a Difficulty Slider and checkboxes to select specific question categories from the bank.

---

## Phased Implementation Plan

To ensure manageable, high-quality delivery, we will begin with the two highest-impact features identified.

### Phase 1: Real-Time ATS Score Panel
**Why first?** The backend logic (`supabase/functions/score-resume`) is already fully implemented and returning the exact data we need. This is a pure frontend UI/UX task that provides immediate, high visibility value to the user.

**Steps:**
1. Install `recharts` for the radar chart visualization.
2. Build `ScoreRadarChart.tsx` to visualize the 6 pillars.
3. Build `ATSScoreSidebar.tsx` and integrate it into `EditorPage.tsx`. Connect it to the existing `useResumeStore` to re-fetch/re-calculate scores when the resume changes (debounced).
4. Implement the "Fix All ATS Issues" orchestration logic in the client, sequentially calling `enhance-section` for low-scoring fields.

### Phase 2: Cover Letter Generator
**Why second?** A completely missing feature with high user demand. It requires building a new edge function and new UI views from scratch, establishing the pattern for subsequent new AI features.

**Steps:**
1. Create the `cover_letters` table in Supabase via a migration script.
2. Develop the `supabase/functions/generate-cover-letter` edge function, utilizing `callAIWithRetry` and enforcing a strict JSON output schema (Opening, Body, Closing).
3. Build the `CoverLetterGeneratorPage.tsx` and its associated Zustand store.
4. Implement the split-pane UI and the targeted section regeneration logic.
