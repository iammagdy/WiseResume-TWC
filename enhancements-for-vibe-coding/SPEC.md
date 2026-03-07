# SPEC.md
> Living specification of the application's current state. Keep this up-to-date as features ship.

---

## 1. Current Features

- Create resume from blank, from file upload, by duplicating, or from an AI-tailored copy
- Edit all resume sections: Contact Info, Summary, Experience, Education, Skills, Certifications, Awards, Projects, Publications, Volunteering, Hobbies, References, Languages
- 30+ resume templates (modern, classic, minimal, developer, executive, banking, legal, marketing, etc.)
- Live side-by-side preview with zoom control in the editor
- Export formats: PDF, ATS-optimized PDF, DOCX, plain text, JSON, image snapshot
- AI Tailor: match resume to a job description or job URL (light / moderate / aggressive intensity)
- AI section enhancement: rewrite or improve individual sections (summary, bullets, skills)
- ATS scoring: deterministic + AI scoring with per-category breakdown and trend chart
- Resume upload parsing: PDF (with optional OCR), Word (.docx), image (OCR via Tesseract), JSON, HTML
- AI detect-and-humanize: detect AI-written text and optionally rewrite it
- Cover letter generator: AI-generated, multiple tones and template styles, saved to DB
- Resignation letter generator: AI-generated, with notice period, recipient, checklist
- AI interview simulator: live chat-based mock interview with scoring and feedback
- Job application tracker: Kanban-style status tracking linked to resumes and cover letters
- Public portfolio page: shareable at `/p/:username`, synced from a chosen resume
- Resume sharing: tokenized share link with optional password, expiry, view count, and reviewer comments
- QR code generator per resume (with styling), batch QR export, QR scanner
- Career assessment and career path advisor (AI-driven)
- AI Studio: agentic chat, bring-your-own-key (BYOK) support for Gemini and Ollama
- Resume version history: auto-versioned snapshots with restore
- Notifications: in-app notification center + push notification support (Web Push)
- Achievements and gamification: login streaks, milestones, badges
- Subscription and referral pages (billing/upgrade flow)
- Onboarding wizard: first-run flow for new users
- Biometric lock: Face ID / fingerprint via Capacitor on supported devices
- Offline sync: editor changes queue when offline and sync on reconnect
- Dark / light / system theme
- PWA installable + Capacitor-wrapped for native Android

---

## 2. Current Screens / Pages

### Public Routes
| Route | Screen Name | Description |
|-------|-------------|-------------|
| `/` | Landing / Home | Marketing landing page with feature overview and CTAs |
| `/auth` | Auth | Sign in and sign up via Clerk |
| `/sign-in` | Sign In | Dedicated Clerk-hosted sign-in page |
| `/reset-password` | Reset Password | Password reset flow |
| `/share/:token` | Shared Resume View | Public read-only resume view via tokenized share link |
| `/p/:username` | Public Portfolio | Public-facing portfolio page synced from user's resume |
| `/l/:linkId` | Short Link Redirect | Branded short URL redirect to portfolio or resume |
| `/privacy` | Privacy Policy | Legal privacy page |
| `/terms` | Terms of Service | Legal terms page |

### Protected Routes (require sign-in)
| Route | Screen Name | Description |
|-------|-------------|-------------|
| `/dashboard` | Dashboard | Lists all user resumes with search, filter, quick actions, and stats |
| `/editor` | Resume Editor | Tabbed editor with live preview, autosave, undo/redo, ATS score bar |
| `/preview` | Resume Preview | Full-page preview with export (PDF, DOCX, etc.) |
| `/upload` | Upload Resume | File upload and parsing flow to import an existing resume |
| `/resume/:id` | Resume Detail | Single resume stats, ATS health, AI tools entry points, share/duplicate/delete |
| `/templates` | Templates Gallery | Browse and select from 30+ resume templates |
| `/cover-letters` | Cover Letters List | List of saved cover letters with preview and actions |
| `/cover-letter/new` | New Cover Letter | AI cover letter generator form |
| `/cover-letter/edit/:id` | Edit Cover Letter | Edit a saved cover letter |
| `/resignation-letters` | Resignation Letters List | List of saved resignation letters |
| `/resignation-letter/new` | New Resignation Letter | AI resignation letter generator form |
| `/resignation-letter/edit/:id` | Edit Resignation Letter | Edit a saved resignation letter |
| `/interview` | AI Interview | Chat-based mock interview simulator with scoring |
| `/applications` | Job Applications | Kanban/list tracker for job applications |
| `/application/:id` | Application Detail | Detail view for a single job application |
| `/job/:id` | Job Detail | Detail view for a saved job listing |
| `/career` | Career Advisor | AI-driven career assessment and path recommendations |
| `/portfolio` | Portfolio Editor | Configure public portfolio: theme, sections, bio, links |
| `/analytics` | Portfolio Analytics | Visitor stats for the user's public portfolio page |
| `/ai-studio` | AI Studio | Agentic AI chat with BYOK support |
| `/guides` | Guides | Resume writing guides index |
| `/guides/:slug` | Guide Detail | Individual resume writing guide article |
| `/examples` | Examples Gallery | Curated resume examples by industry/role |
| `/notifications` | Notifications | In-app notification center |
| `/qr-code` | QR Code Generator | Styled QR code generator for a resume |
| `/qr-batch` | Batch QR Export | Bulk QR code generation and download |
| `/qr-scan` | QR Scanner | Camera-based QR code scanner |
| `/subscription` | Subscription | Billing and plan upgrade page |
| `/referral` | Referral | Referral program page |
| `/achievements` | Achievements | Gamification — streaks, badges, milestones |
| `/profile` | User Profile | Edit user profile info (name, photo, social links, industry) |
| `/settings` | Settings | App settings: theme, notifications, biometric, AI provider, API keys |
| `/help` | Help Center | In-app help and support links |
| `/onboarding` | Onboarding | First-run wizard guiding new users through setup |

---

## 3. Current API / Data Model

### Core Resume Shape (`ResumeData` in `src/types/resume.ts`)
```
ResumeData {
  id?, contactInfo, summary, experience[], education[], skills[],
  certifications[], awards?, projects?, publications?, volunteering?,
  hobbies?, references?, languages?,
  templateId, customization?, createdAt?, updatedAt?
}
```

### Database Tables

| Table | Purpose |
|-------|---------|
| `resumes` | Central entity. Stores all resume content as JSONB columns. One row per resume version. |
| `profiles` | User public profile, portfolio config, social links, username, GitHub cache, login streak |
| `cover_letters` | AI-generated cover letters linked to a resume |
| `resignation_letters` | AI-generated resignation letters with notice period and checklist |
| `interview_sessions` | AI mock interview sessions — messages JSON, scores, job context |
| `tailor_history` | Snapshot of each AI tailor run: before/after scores, applied sections |
| `resume_versions` | Version snapshots of resume JSON for history/restore |
| `resume_shares` | Tokenized share links with optional password, expiry, view count |
| `share_comments` | Reviewer comments attached to a shared resume |
| `jobs` | User-saved job listings |
| `job_applications` | Job application tracker: status, linked resume, cover letter, deadlines |
| `notifications` | In-app notifications (system, AI, reminder types) |
| `portfolio_visits` | Analytics rows per public portfolio page visit |
| `short_links` | Branded short URLs pointing to portfolio or resume |
| `ai_credits` | Daily AI usage tracking per user (limit + usage) |
| `ai_usage_logs` | Per-action AI audit log (action_type, section, resume_id) |
| `user_api_keys` | Encrypted BYOK API keys (Gemini, ElevenLabs, Ollama) |
| `user_preferences` | Per-user settings: default template, PDF defaults, biometric, AI provider |
| `career_assessments` | Career quiz results and milestone tracking |
| `bug_reports` | User-submitted error reports |
| `feature_requests` | User-submitted feature request submissions |
| `push_subscriptions` | Web Push subscription endpoints per device |
| `audit_logs` | General audit trail for user actions |
| `store_screenshots` | App store screenshot assets (read-only to users) |

### Edge Functions (45 total)

**Core AI**
- `tailor-resume` — AI job-tailoring: rewrites summary, skills, experience bullets to match a JD
- `score-resume` — Deterministic ATS scoring with category breakdown and feedback
- `analyze-resume` — Deep resume analysis (gaps, strengths, improvements)
- `enhance-section` — AI rewrite of a single resume section
- `parse-resume` — Extract structured ResumeData from raw text/PDF content

**Writing**
- `generate-cover-letter` — AI cover letter generation (tone, style, job context)
- `generate-resignation-letter` — AI resignation letter with notice period and checklist
- `generate-question-bank` — Generate interview questions based on resume + JD
- `detect-and-humanize` — Detect AI-written text; optionally rewrite to sound human

**Parsing**
- `parse-job-url` — Scrape and parse a job posting from a URL
- `parse-job-text` — Extract structured job data from pasted text
- `parse-linkedin` — Parse LinkedIn profile data into resume format

**Interview**
- `interview-chat` — Streaming AI interviewer chat (general, behavioral, technical)
- `recruiter-simulation` — Simulate a recruiter screening call
- `company-briefing` — Generate company intel and culture notes for interview prep

**Portfolio**
- `generate-portfolio-bio` — AI-generated professional bio for portfolio page
- `ask-portfolio` — AI chatbot that answers questions about a user's portfolio
- `portfolio-meta` — Generate SEO meta title/description for portfolio
- `track-portfolio-view` — Record a portfolio page visit (analytics)
- `fetch-github-projects` — Sync public GitHub repos into portfolio projects
- `og-image` — Generate Open Graph social preview image for portfolio

**Career**
- `career-assessment` — Evaluate resume against career goals and suggest paths
- `career-path-advisor` — AI career path recommendations

**Export / Optimization**
- `one-page-optimizer` — Condense resume content to fit one page
- `optimize-for-linkedin` — Reformat resume data for LinkedIn import

**Gap Analysis**
- `explain-gap` — Explain employment gaps in a positive framing
- `fill-gap` — Suggest content to fill identified resume gaps

**AI Utility**
- `agentic-chat` — General-purpose AI chat for the AI Studio
- `ai-health` — Health check for AI provider availability
- `ai-test` — Internal AI model test harness
- `manage-api-keys` — CRUD for encrypted user API keys
- `validate-api-key` — Validate a user-provided API key against the provider

**System**
- `clerk-webhook` — Clerk auth event handler (user created/deleted)
- `provision-clerk-user` — Bootstrap DB records for a new Clerk user
- `send-bug-report` — Email bug report to admin
- `send-feature-request` — Email feature request to admin
- `send-push-notification` — Send Web Push notification to a user's subscribed devices
- `send-resume-reminder` — Scheduled reminder to update resume
- `weekly-digest` — Weekly email digest of activity/tips
- `resolve-short-link` — Resolve a short link ID to its target URL
- `generate-headshot` — AI headshot generation from uploaded photo
- `generate-store-screenshots` — Generate app store marketing screenshots
- `suggest-template` — AI template suggestion based on job/industry/skills
- `elevenlabs-scribe-token` — Generate a single-use ElevenLabs speech token

---

## 4. Key User Flows

### Flow 1: Create a New Resume from Blank
1. User opens Dashboard and taps **+ New Resume**
2. `CreateResumeDialog` prompts for a title and optional template selection
3. A new `resumes` row is inserted with default empty JSON fields
4. User is navigated to `/editor?id=<resumeId>`
5. User fills sections tab by tab; autosave debounces writes to DB every 3s
6. ATS score is computed in the background and displayed in the progress bar

### Flow 2: Upload and Parse an Existing Resume
1. User navigates to `/upload` or taps the upload option in the Dashboard
2. User drops a PDF, Word, image, or JSON file onto the upload zone
3. If PDF: app checks if text-layer exists; if not, prompts OCR confirmation
4. `parse-resume` edge function extracts structured `ResumeData` from the file
5. `ImportReviewSheet` shows the parsed sections; user selects which to keep
6. Confirmed data is saved as a new `resumes` row; user is sent to `/editor`

### Flow 3: AI Tailor Resume to a Job Description
1. From Dashboard or Resume Detail, user taps **Tailor**
2. User pastes a job description or a job URL (parsed via `parse-job-url`)
3. User picks tailor intensity (light / moderate / aggressive)
4. `tailor-resume` edge function rewrites summary, skills, and experience bullets
5. Results shown in a diff-style preview; user selects which sections to apply
6. Applied changes are merged into the resume; a `tailor_history` row is saved; ATS score is re-computed

### Flow 4: Preview and Export
1. From the editor or Resume Detail, user taps **Preview** or **Download**
2. `/preview` renders the resume using the chosen template at A4/Letter size
3. User selects export format: PDF, ATS PDF, DOCX, plain text, image, JSON
4. For PDF: `html2canvas` captures the DOM; `pdf-lib` assembles the file
5. For DOCX: the `docx` library builds the document from resume data
6. File is downloaded to the user's device

### Flow 5: Share Resume via Link
1. From Resume Detail or Preview, user taps **Share**
2. App calls `resume_shares` insert to create a token; optional password and expiry are set
3. A shareable URL (`/share/:token`) is copied to clipboard
4. Recipient opens the URL; if password-protected, they enter it first
5. `get_shared_resume` RPC validates token and returns resume data
6. Recipient can leave section comments (stored in `share_comments`)

---

## 5. Known Issues / Technical Debt

- `AppShell` uses `bg-transparent` — card/panel components must set their own backgrounds explicitly or they will be invisible over `SkyWallpaper`
- Resume content (experience bullets, skills) is stored as JSONB blobs — no full-text search or column-level indexing; search on Dashboard is client-side only
- Several Suspense fallback skeletons are generic and do not match the final layout of the page they guard — causes layout shift on slow loads
- `useResumeStore` persists to `localStorage` — OS or browser can silently evict this on low-storage mobile devices without user warning
- `EditorPage` is ~1,400 lines handling autosave, undo/redo, AI scoring, section routing, and rendering — should be decomposed into focused sub-components/hooks
- `SkyWallpaper` GPU animation runs on all routes including public standalone pages (`/share`, `/p/:username`) — should be disabled or reduced on those routes
- No pagination or virtual list on the Dashboard resume list — may degrade for users with 20+ resumes
- Legacy resume JSON shapes from earlier schema versions may surface `undefined` fields in older resumes not yet migrated to the current `ResumeData` shape
- `tailor_history` table has no UPDATE RLS policy — completed tailor runs cannot be edited or flagged as applied after the fact
- `ai_credits` table has no UPDATE RLS policy — credit deduction is handled only via `increment_ai_usage` RPC; direct client updates are not possible (intentional but worth noting)
- No server-side validation on resume section content length before saving — very long inputs could cause edge function token overflows
- `enhancements-for-vibe-coding/SPEC.md` (this file) must be manually kept in sync as features ship

---

## Issue Ticket Template

- Issue ID: ISSUE-XXX  

- Problem:  

- Scope (pages/files/components):  

- Do Not Break (required behaviors):  

- Proposed Small Change:  

- Notes / Edge Cases:  
