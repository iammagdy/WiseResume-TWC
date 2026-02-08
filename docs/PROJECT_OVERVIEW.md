# WiseResume - Project Overview

> **AI-Powered Resume Builder & Interview Coach**
> 
> A mobile-first Progressive Web App that transforms job seekers into confident candidates through intelligent resume optimization and AI-powered interview practice.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Application Architecture](#application-architecture)
4. [Core Features](#core-features)
5. [AI Capabilities & Edge Functions](#ai-capabilities--edge-functions)
6. [Data Models & Types](#data-models--types)
7. [User Flows](#user-flows)
8. [Database Schema](#database-schema)
9. [Current State & Known Issues](#current-state--known-issues)
10. [Future Enhancement Ideas](#future-enhancement-ideas)

---

## Project Overview

### App Identity
- **Name:** WiseResume (part of "WiseUniverse" brand)
- **Tagline:** "Your AI career companion"
- **Mascot/AI:** "Wise AI" - the intelligent assistant
- **Target Platform:** Mobile-first PWA with Capacitor for native Android/iOS

### Value Proposition
WiseResume solves the #1 job seeker pain point: "Is my resume good enough?" It provides:
1. **Instant AI feedback** - Know exactly how your resume scores against any job
2. **One-click optimization** - AI rewrites your resume for specific roles
3. **Interview practice** - Voice-based mock interviews with real-time scoring
4. **Multiple perspectives** - Feedback from 4 different recruiter personas

### Target Users
- Job seekers actively applying (primary)
- Career changers pivoting to new industries
- Recent graduates entering the workforce
- Professionals updating resumes after years

---

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.1 | UI framework |
| TypeScript | Latest | Type safety |
| Vite | Latest | Build tool & dev server |
| Tailwind CSS | Latest | Styling with custom design system |
| Framer Motion | 12.x | Animations & transitions |
| Radix UI | Latest | Accessible UI primitives |
| shadcn/ui | Latest | Pre-built component library |

### State Management
| Technology | Purpose |
|------------|---------|
| Zustand | Global state with persistence |
| TanStack Query | Server state & caching |
| React Hook Form | Form state management |

### Backend (Lovable Cloud / Supabase)
| Service | Purpose |
|---------|---------|
| Supabase Auth | Email/password authentication |
| Supabase Database | PostgreSQL for data persistence |
| Supabase Edge Functions | 11 serverless AI functions |
| Lovable AI Gateway | Access to Gemini & GPT models |

### Native Capabilities (Capacitor)
| Plugin | Purpose |
|--------|---------|
| @capacitor/app | App lifecycle management |
| @capgo/capacitor-native-biometric | Fingerprint/Face ID lock |

### PDF & Document Processing
| Library | Purpose |
|---------|---------|
| html2canvas | Screenshot DOM for PDF |
| pdf-lib | PDF generation & manipulation |
| pdfjs-dist | PDF text extraction |
| tesseract.js | OCR for image-based resumes |
| mammoth | Word document parsing |

### Voice & Audio
| Technology | Purpose |
|------------|---------|
| ElevenLabs Scribe | Real-time speech-to-text |
| Web Speech API | Text-to-speech for AI responses |

---

## Application Architecture

### Directory Structure
```
src/
├── components/
│   ├── brand/           # Logo, icons
│   ├── dashboard/       # Resume list, create dialog
│   ├── editor/          # Resume sections, AI tools
│   │   ├── ai/          # AI-specific components
│   │   └── tailor/      # Job tailoring components
│   ├── home/            # Landing page components
│   ├── interview/       # Mock interview UI
│   ├── landing/         # Public landing page
│   ├── layout/          # Shell, nav, mobile layout
│   ├── onboarding/      # First-time user flow
│   ├── settings/        # Settings sheets
│   ├── templates/       # 12 resume templates
│   ├── ui/              # Base UI components
│   └── upload/          # File upload & parsing
├── hooks/               # Custom React hooks
├── lib/                 # Utility functions
├── pages/               # Route components
├── store/               # Zustand stores
├── types/               # TypeScript interfaces
└── integrations/        # Supabase client & types

supabase/
└── functions/           # 11 Edge Functions
    ├── analyze-resume/
    ├── elevenlabs-scribe-token/
    ├── enhance-section/
    ├── generate-cover-letter/
    ├── generate-headshot/
    ├── interview-chat/
    ├── parse-job-url/
    ├── parse-linkedin/
    ├── parse-resume/
    ├── recruiter-simulation/
    └── tailor-resume/
```

### State Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    Zustand Stores                       │
├─────────────────────────────────────────────────────────┤
│ resumeStore         │ Current resume, job matching,    │
│                     │ tailor history, multi-job compare│
├─────────────────────┼───────────────────────────────────┤
│ settingsStore       │ User preferences, PDF defaults,  │
│                     │ biometric settings, API keys     │
└─────────────────────┴───────────────────────────────────┘
          ↓ persisted to localStorage
          ↓ synced to Supabase for auth users
```

---

## Core Features

### 1. Resume Management
**Files:** `DashboardPage.tsx`, `ResumeListCard.tsx`, `CreateResumeDialog.tsx`

- Create new resumes (blank or from template)
- Duplicate existing resumes
- Delete with confirmation
- Group "master" resumes with their tailored versions
- Search/filter resumes
- Pull-to-refresh for cloud sync

### 2. Resume Editor
**Files:** `EditorPage.tsx`, `ContactSection.tsx`, `SummarySection.tsx`, `ExperienceSection.tsx`, `EducationSection.tsx`, `SkillsSection.tsx`

**Sections:**
- **Contact Info:** Name, email, phone, location, LinkedIn, portfolio, photo
- **Summary:** Professional summary with AI enhancement
- **Experience:** Work history with achievements (supports projects)
- **Education:** Degrees, institutions, GPA
- **Skills:** Tag-based skill management

**Features:**
- Tab-based navigation with smart scrolling
- Section completion indicators
- Auto-save for authenticated users (2s debounce)
- Cloud sync status indicator
- AI intro tooltip for first-time users

### 3. Resume Templates
**Files:** `src/components/templates/*.tsx`, `TemplateSelector.tsx`

| Template | ATS Score | Best For |
|----------|-----------|----------|
| Modern | High | Tech, startups |
| Classic | High | Corporate, finance |
| Minimal | High | Design, UX |
| Professional | High | General use |
| Developer | High | Software engineers |
| Creative | Medium | Marketing, design |
| Executive | High | C-suite, directors |
| Compact | High | One-page resumes |
| Academic | High | Research, academia |
| Healthcare | High | Medical professionals |
| Sales | Medium | Sales, business dev |
| Elegant | Medium | Luxury, hospitality |

### 4. PDF Upload & Parsing
**Files:** `UploadPage.tsx`, `pdfParser.ts`, `textExtractor.ts`, `ocrExtractor.ts`

**Supported Formats:**
- PDF (text-based and image-based)
- Word documents (.docx)
- Images (.jpg, .png) with OCR

**Process:**
1. User uploads file
2. Extract text (PDF.js or Mammoth)
3. If text extraction fails → OCR with Tesseract.js
4. AI parses text into structured resume data
5. Review & confirm imported data

### 5. AI Resume Analysis
**Edge Function:** `analyze-resume/index.ts`

Analyzes resume against job description and provides:
- **Overall Score** (0-100)
- **Skills Match** score
- **Experience Relevance** score
- **Keyword Alignment** score
- **ATS Compatibility** score
- **Strengths** list
- **Improvement** suggestions
- **Gap Analysis:** Missing keywords, skills, sections

### 6. AI Resume Tailoring ("SUPERCHARGED" Engine)
**Edge Function:** `tailor-resume/index.ts`

The crown jewel feature. Uses Gemini 2.5 Pro to:

**Input:**
- Full resume data
- Target job description

**Output:**
- Rewritten summary optimized for the role
- Reordered & enhanced skills list
- Transformed experience bullets with metrics
- Education highlighting relevant coursework
- Section-by-section before/after scores
- Missing skills to add
- Skills to boost/emphasize
- Job intelligence (experience level, salary range, work mode)
- ATS keyword analysis
- Interview talking points
- Strengths analysis with percentile estimates

**Bullet Transformation Example:**
```
BEFORE: "Worked on frontend development"
AFTER:  "Architected and shipped 15+ React components serving 
         50K+ daily users, reducing page load time by 40%"
```

### 7. Cover Letter Generation
**Edge Function:** `generate-cover-letter/index.ts`

**Features:**
- Three tone options: Professional, Enthusiastic, Conversational
- Tailored to specific job description
- References resume achievements
- 300-400 word output
- Avoids generic phrases

### 8. Recruiter Simulation
**Edge Function:** `recruiter-simulation/index.ts`
**UI:** `RecruiterSimSheet.tsx`

Four distinct AI personas provide brutally honest feedback:

| Persona | Name | Focus |
|---------|------|-------|
| Fortune 500 | Sarah Chen | Structure, progression, brand names |
| Startup | Marcus Rivera | Scrappiness, ownership, impact |
| Tech/FAANG | Priya Sharma | Technical depth, scale, growth |
| Executive | James O'Connor | Career narrative, P&L, board presence |

**Analysis includes:**
- Hireability score (1-100)
- First impression
- Red flags with severity & fixes
- Interview questions they'd ask
- "Call me" factors (strengths)
- Overall verdict: Would call / Maybe / Pass
- Top priority fix

### 9. Mock Interview Mode (Voice-Based)
**Edge Function:** `interview-chat/index.ts`
**Files:** `InterviewPage.tsx`, `useVoiceInterview.ts`, `useElevenLabsScribe.ts`

**Flow:**
1. Setup: Choose general or job-targeted interview
2. Preview: See key skills & question categories (job-targeted)
3. Interview: Voice conversation with Wise AI
4. Summary: Performance score, strengths, improvements

**Technical Features:**
- ElevenLabs Scribe for real-time speech-to-text
- Web Speech API for AI voice responses
- Voice gender selection (male/female)
- Real-time audio level visualization
- Silence detection (1.5s timeout)
- Per-answer STAR-method scoring
- AI can be interrupted mid-speech
- Text fallback for non-voice users

**Scoring System:**
Each answer receives:
- Score (1-10)
- Specific improvement tip
- Improved answer suggestion

### 10. Multi-Job Comparison
**Files:** `MultiJobCompareSheet.tsx`, `JobCompareCard.tsx`

Compare how your resume matches against up to 4 different jobs:
- Side-by-side score comparison
- Quick visual indicators
- Select best match to apply tailoring

### 11. PDF Export
**Files:** `PreviewPage.tsx`, `pdfGenerator.ts`, `ExportOptionsSheet.tsx`

**Features:**
- High-quality PDF generation (html2canvas + pdf-lib)
- Multiple templates render correctly
- Page break control (auto or manual)
- Page numbers (simple or "Page X of Y")
- Optional WiseResume branding stamp
- Export resume, cover letter, or combined

### 12. User Authentication
**Files:** `AuthPage.tsx`, `useAuth.ts`

- Email/password signup with verification
- Email/password login
- Session persistence
- Protected routes
- Guest mode with local storage

### 13. Cloud Sync
**Files:** `useResumes.ts`, `EditorPage.tsx`

- Automatic sync for authenticated users
- 2-second debounced saves
- Real-time save status indicator
- Resume hierarchy (master → tailored versions)
- Pull-to-refresh on dashboard

### 14. Biometric Lock (Native)
**Files:** `BiometricLockScreen.tsx`, `useBiometricLock.ts`

- Fingerprint/Face ID protection
- Configurable timeout (instant, 30s, 1min, 5min)
- Graceful fallback if unavailable

### 15. Onboarding Flow
**Files:** `OnboardingCarousel.tsx`, `OnboardingStep.tsx`

4-step carousel for first-time users:
1. Welcome & value prop
2. Resume building intro
3. AI features overview
4. Get started

### 16. Settings
**Files:** `SettingsPage.tsx`, `settingsStore.ts`

**Categories:**
- **Profile:** Edit name, avatar, job title
- **Preferences:** Default template, PDF settings
- **Privacy:** Local-only mode, analytics opt-out
- **Security:** Biometric lock settings
- **Integrations:** ElevenLabs API key
- **Data:** Export data, delete account

---

## AI Capabilities & Edge Functions

### Model Usage
| Model | Functions Using It |
|-------|-------------------|
| `google/gemini-2.5-pro` | `tailor-resume` (needs deep reasoning) |
| `google/gemini-3-flash-preview` | `analyze-resume`, `interview-chat`, `generate-cover-letter`, `parse-job-url` |
| `google/gemini-2.5-flash-image` | `generate-headshot` (image input/output) |
| `openai/gpt-5-mini` | `recruiter-simulation` |

### Edge Function Details

#### `analyze-resume`
- **Input:** Resume data, job description
- **Output:** Scoring object + gap analysis
- **Model:** Gemini 3 Flash

#### `enhance-section`
- **Input:** Section content, enhancement type
- **Output:** Improved section text
- **Purpose:** Inline AI improvements for specific sections

#### `generate-cover-letter`
- **Input:** Resume, job description, tone
- **Output:** 300-400 word cover letter
- **Model:** Gemini 3 Flash

#### `generate-headshot`
- **Input:** User photo (base64)
- **Output:** Professional headshot (AI-generated)
- **Model:** Gemini 2.5 Flash Image
- **Note:** Transforms casual photos into corporate headshots

#### `interview-chat`
- **Input:** Conversation history, resume, job description
- **Output:** AI interviewer response with scoring
- **Features:**
  - Role analysis mode for job-targeted prep
  - STAR-method answer scoring
  - Interview summary generation
- **Model:** Gemini 3 Flash

#### `parse-job-url`
- **Input:** Job posting URL
- **Output:** Extracted job details (title, company, requirements)
- **Purpose:** Auto-fill job description from LinkedIn, Indeed, etc.

#### `parse-linkedin`
- **Input:** LinkedIn profile URL
- **Output:** Structured resume data
- **Purpose:** Import resume from LinkedIn profile

#### `parse-resume`
- **Input:** Extracted text from PDF/Word/OCR
- **Output:** Structured resume data
- **Purpose:** AI-powered resume parsing

#### `recruiter-simulation`
- **Input:** Resume, persona selection, target role
- **Output:** Detailed recruiter feedback
- **Model:** GPT-5 Mini
- **Personas:** Fortune 500, Startup, Tech, Executive

#### `tailor-resume`
- **Input:** Full resume, job description
- **Output:** Completely optimized resume + intelligence
- **Model:** Gemini 2.5 Pro (8000 tokens)
- **Features:**
  - Bullet transformation with metrics
  - ATS keyword optimization
  - Job intelligence extraction
  - Interview prep talking points
  - Strength percentile analysis

#### `elevenlabs-scribe-token`
- **Input:** None (uses stored API key)
- **Output:** Temporary WebSocket token
- **Purpose:** Secure token generation for voice transcription

---

## Data Models & Types

### Core Resume Types
```typescript
interface ResumeData {
  id?: string;
  contactInfo: ContactInfo;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  certifications: Certification[];
  templateId: TemplateId;
  createdAt?: string;
  updatedAt?: string;
}

interface Experience {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
  achievements: string[];
  isProject?: boolean; // For project entries
}
```

### AI Analysis Types
```typescript
interface JobMatchScore {
  overallScore: number;
  skillsMatch: number;
  experienceRelevance: number;
  keywordAlignment: number;
  atsCompatibility: number;
  strengths: string[];
  improvements: string[];
}

interface SuperTailorResult extends EnhancedTailorResult {
  jobIntelligence?: JobIntelligence;
  interviewTalkingPoints?: InterviewTalkingPoint[];
  atsAnalysis?: ATSAnalysis;
  bulletTransformations?: BulletTransformation[];
  strengthsAnalysis?: StrengthAnalysis[];
}
```

### Recruiter Simulation Types
```typescript
type RecruiterPersona = 'fortune500' | 'startup' | 'tech' | 'agency';

interface RecruiterAnalysis {
  hireabilityScore: number;
  scoreExplanation: string;
  firstImpression: string;
  redFlags: RedFlag[];
  questionsIdAsk: InterviewQuestion[];
  callMeFactors: CallMeFactor[];
  overallVerdict: 'would_call' | 'maybe_call' | 'pass';
  verdictReasoning: string;
  topPriorityFix: string;
}
```

---

## User Flows

### Flow 1: New User First Resume
```
Landing Page → Sign Up → Email Verification → Dashboard (Onboarding) 
→ Create Resume → Upload PDF / Start Blank → Editor → Preview → Export
```

### Flow 2: Tailor Resume for Job
```
Dashboard → Select Resume → Editor → AI Bar → "Tailor" 
→ Paste Job Description → AI Processing → Review Changes 
→ Accept/Decline per Section → Export Tailored Resume
```

### Flow 3: Mock Interview
```
Dashboard → Interview Tab → Select Resume → Choose Mode 
→ (Optional) Paste Job Description → Preview Questions 
→ Start Interview → Voice Q&A → End → View Summary
```

### Flow 4: Recruiter Feedback
```
Editor → AI Bar → Recruiter Sim → Choose Persona 
→ AI Analysis → Review Red Flags → Apply Suggested Fixes
```

---

## Database Schema

### Tables

#### `profiles`
```sql
- id: UUID (PK)
- user_id: UUID (FK to auth.users)
- full_name: TEXT
- avatar_url: TEXT
- job_title: TEXT
- career_level: TEXT
- industry: TEXT
- location: TEXT
- linkedin_url: TEXT
- onboarding_completed: BOOLEAN
- profile_completed: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### `resumes`
```sql
- id: UUID (PK)
- user_id: UUID (FK to auth.users)
- title: TEXT
- contact_info: JSONB
- summary: TEXT
- experience: JSONB
- education: JSONB
- skills: JSONB
- certifications: JSONB
- template_id: TEXT
- is_primary: BOOLEAN
- parent_resume_id: UUID (self-reference for tailored versions)
- target_job_title: TEXT
- target_company: TEXT
- job_match_score: INTEGER
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### `ai_usage_logs`
```sql
- id: UUID (PK)
- user_id: UUID (FK to auth.users)
- resume_id: UUID (FK to resumes)
- action_type: TEXT (tailor, analyze, interview, etc.)
- section: TEXT
- metadata: JSONB
- created_at: TIMESTAMP
```

---

## Current State & Known Issues

### What Works Well ✅
- Complete resume editing experience
- All 12 templates render correctly
- PDF generation is high quality
- AI tailoring produces excellent results
- Voice interview feels natural
- Recruiter personas provide unique insights
- Cloud sync is reliable
- Mobile-first design is responsive

### Known Issues / Limitations ⚠️
1. **Edge Function Auth:** Some functions still use `getClaims()` which can fail - need migration to `getUser()`
2. **OCR Performance:** Tesseract.js is slow on large documents
3. **Voice on iOS:** Web Speech API has inconsistent support
4. **PDF Page Breaks:** Manual breaks don't always respect content
5. **Offline Mode:** Limited functionality when offline
6. **Rate Limits:** No client-side rate limit handling UI

### Technical Debt
- `src/types/resume.ts` is 280 lines and should be split
- Some components have prop drilling that could use context
- Test coverage is minimal

---

## Future Enhancement Ideas

### High Impact Features
1. **LinkedIn Easy Apply Integration** - One-click apply with tailored resume
2. **Job Board Aggregator** - Browse jobs within the app
3. **Resume Version Control** - Git-like history with diffs
4. **Collaborative Editing** - Share resume for feedback
5. **ATS Simulator** - See exactly how your resume is parsed

### AI Enhancements
1. **Salary Negotiator** - AI-powered salary research & scripts
2. **Career Path Advisor** - Long-term career planning AI
3. **Rejection Analyzer** - Pattern detection from failed applications
4. **Skills Gap Roadmap** - Learning paths for missing skills
5. **Networking Assistant** - LinkedIn message templates

### Interview Features
1. **Video Interview Practice** - Camera-based with body language feedback
2. **Industry-Specific Question Banks** - Curated questions by role
3. **Answer Recording Library** - Save & review past answers
4. **Peer Interview Matching** - Practice with other users

### Gamification
1. **Resume Score Leaderboard** - Compare anonymously
2. **Achievement Badges** - Unlock for milestones
3. **Daily Application Goals** - Streak tracking
4. **XP System** - Level up your job search

### Monetization Ideas
1. **Premium Templates** - Exclusive designs
2. **AI Credits** - Pay-per-use for power users
3. **Expert Resume Review** - Human + AI review
4. **Priority AI Queue** - Faster processing
5. **White-Label for Recruiters** - B2B offering

---

## Contact & Resources

- **App Name:** WiseResume
- **Brand:** WiseUniverse
- **AI Assistant:** Wise AI
- **Platform:** Lovable.dev
- **Backend:** Lovable Cloud (Supabase)

---

*Last Updated: February 2026*
