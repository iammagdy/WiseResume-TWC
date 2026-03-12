# SPEC.md
> Living specification of the application's current state. Keep this up-to-date as features ship.

---

## 1. Current Features

### Resume Management
- Create resume from blank, file upload, duplicate, or AI-tailored copy
- Edit all sections: Contact Info, Summary, Experience, Education, Skills, Certifications, Awards, Projects, Publications, Volunteering, Hobbies, References, Languages
- 30+ templates (modern, classic, minimal, developer, executive, banking, legal, marketing, etc.)
- Live side-by-side preview with zoom control in the editor
- Export: PDF, ATS-optimized PDF, DOCX, plain text, JSON, image snapshot
- Soft-delete/trash system: resumes move to trash (30-day retention), can be restored or permanently deleted
- Resume version history: auto-versioned snapshots with restore
- Master CV (primary resume) designation

### AI Tools
- **AI Tailor**: match resume to a job description or job URL (light / moderate / aggressive intensity)
- **AI Section Enhancement**: rewrite or improve individual sections (summary, bullets, skills)
- **ATS Scoring**: deterministic + AI scoring with per-category breakdown and trend chart
- **AI Detect & Humanize**: detect AI-written text and optionally rewrite it
- **Cover Letter Generator**: AI-generated, multiple tones and template styles, saved to DB
- **Resignation Letter Generator**: AI-generated, with notice period, recipient, checklist
- **AI Interview Simulator**: live chat-based mock interview with scoring and feedback
- **Career Assessment**: AI-driven career path advisor with quiz and milestones
- **AI Studio**: agentic chat with BYOK support (Gemini, Ollama) — provider reverts on close if key not validated
- **Wise AI**: universal floating chat button (mobile) + desktop nav pill, context-aware category filters (Resumes, Cover Letters, Applications, Portfolio, Activity), clickable resume cards in responses, `add_project` tool support

### Resume Upload & Parsing
- PDF (with optional OCR), Word (.docx), image (OCR via Tesseract), JSON, HTML
- LinkedIn Smart Import: guided paste wizard (About → Experience → Education → Skills)
- LinkedIn PDF import with client-side OCR fallback

### Sharing & Portfolio
- Resume sharing: tokenized share link with optional password, expiry, view count, reviewer comments
- QR code generator per resume (with styling), batch QR export, QR scanner
- Public portfolio page at `/p/:username`, synced from chosen resume
- Portfolio editor: 4-tab layout (Setup / Content / Design / More)
  - Setup: username, resume selection, bio
  - Content: section visibility, availability, case studies, services, testimonials, highlights
  - Design: theme, layout, accent color, font, style
  - More: social links, SEO, analytics, career card
- Branded short links (`/l/:linkId`) with click tracking
- Portfolio analytics: visitor stats, country breakdown, time spent

### Job Tracking
- Job application tracker: Kanban-style status tracking linked to resumes and cover letters
- Saved job listings with detail view

### Account & Settings
- Supabase Auth (email/password, Google OAuth with implicit flow)
- OTP signup: 6-digit numeric code via email with 10-min expiry
- Onboarding wizard on dedicated `/onboarding` page route
- Delete All Data: thorough deletion of all user tables + profile + localStorage, with sign-out
- Backup export/import: JSON format with whitelist column approach
- Profile page with completion tracking
- Dark / light / system theme
- Desktop nav: conditional Settings tab (appears on `/settings`, disappears on leave, returns to previous page)
- Biometric lock (Face ID / fingerprint via Capacitor)
- Offline sync: editor changes queue when offline and sync on reconnect
- PWA installable + Capacitor-wrapped for native Android
- Notifications: in-app center + Web Push support
- Achievements/gamification: login streaks, milestones, badges
- Subscription and referral pages

---

## 2. Current Screens / Pages

### Public Routes
| Route | Description |
|-------|-------------|
| `/` | Landing page with feature overview and CTAs |
| `/auth` | Sign in / sign up with OTP or link confirmation |
| `/auth/confirm-email` | OTP/link email confirmation page |
| `/auth/callback` | OAuth callback handler |
| `/sign-in` | Dedicated sign-in page |
| `/reset-password` | Password reset flow |
| `/share/:token` | Public read-only resume view via tokenized share link |
| `/p/:username` | Public portfolio page |
| `/l/:linkId` | Short link redirect |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |

### Protected Routes
| Route | Description |
|-------|-------------|
| `/dashboard` | Resume list with search, quick actions, stats, trash sheet |
| `/editor` | Tabbed resume editor with live preview, autosave, ATS bar |
| `/preview` | Full-page preview with multi-format export |
| `/upload` | File upload and parsing flow |
| `/resume/:id` | Resume detail: stats, ATS health, AI tools, share/duplicate/delete |
| `/templates` | Template gallery (30+ templates) |
| `/cover-letters` | Cover letters list |
| `/cover-letter/new` | AI cover letter generator |
| `/cover-letter/edit/:id` | Edit cover letter |
| `/resignation-letters` | Resignation letters list |
| `/resignation-letter/new` | AI resignation letter generator |
| `/resignation-letter/edit/:id` | Edit resignation letter |
| `/interview` | AI mock interview simulator |
| `/applications` | Job application tracker |
| `/application/:id` | Application detail |
| `/job/:id` | Job detail |
| `/career` | Career advisor |
| `/portfolio` | Portfolio editor (4-tab: Setup/Content/Design/More) |
| `/analytics` | Portfolio analytics |
| `/ai-studio` | AI Studio with BYOK |
| `/guides` | Resume writing guides |
| `/guides/:slug` | Individual guide article |
| `/examples` | Resume examples gallery |
| `/notifications` | Notification center |
| `/qr-code` | QR code generator |
| `/qr-batch` | Batch QR export |
| `/qr-scan` | QR scanner |
| `/subscription` | Billing/plan page |
| `/referral` | Referral program |
| `/achievements` | Gamification page |
| `/profile` | User profile editor |
| `/settings` | App settings |
| `/help` | Help center |
| `/onboarding` | First-run wizard |

---

## 3. Data Model

### Core Resume Shape (`ResumeData`)
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
| `resumes` | Central entity with JSONB columns, soft-delete via `deleted_at` |
| `profiles` | User profile, portfolio config, social links, username, login streak |
| `cover_letters` | AI-generated cover letters linked to a resume |
| `resignation_letters` | AI-generated resignation letters with checklist |
| `interview_sessions` | AI mock interview sessions with messages, scores |
| `tailor_history` | Each AI tailor run: before/after scores, applied sections |
| `resume_versions` | Version snapshots for history/restore |
| `resume_shares` | Tokenized share links with optional password, expiry |
| `share_comments` | Reviewer comments on shared resumes |
| `jobs` | User-saved job listings |
| `job_applications` | Application tracker with status, linked resume/cover letter |
| `notifications` | In-app notifications |
| `portfolio_visits` | Analytics per portfolio page visit |
| `short_links` | Branded short URLs (uses `owner_user_id` not `user_id`) |
| `ai_credits` | Daily AI usage tracking per user |
| `ai_usage_logs` | Per-action AI audit log |
| `user_api_keys` | Encrypted BYOK API keys |
| `user_preferences` | Per-user settings: template, PDF defaults, biometric, AI provider |
| `career_assessments` | Career quiz results and milestones |
| `bug_reports` | User-submitted error reports (with `screen`, `error_category`) |
| `feature_requests` | User-submitted feature requests |
| `contact_inquiries` | User contact submissions with department |
| `push_subscriptions` | Web Push subscription endpoints |
| `audit_logs` | General audit trail |
| `signup_otps` | 6-digit OTP codes for signup (10-min expiry) |
| `store_screenshots` | App store screenshot assets (read-only) |

### Edge Functions (48 total)

**Core AI**: `tailor-resume`, `score-resume`, `analyze-resume`, `enhance-section`, `parse-resume`

**Writing**: `generate-cover-letter`, `generate-resignation-letter`, `generate-question-bank`, `detect-and-humanize`

**Parsing**: `parse-job-url`, `parse-job-text`, `parse-linkedin`

**Interview**: `interview-chat`, `recruiter-simulation`, `company-briefing`

**Portfolio**: `generate-portfolio-bio`, `ask-portfolio`, `portfolio-meta`, `track-portfolio-view`, `fetch-github-projects`, `og-image`

**Career**: `career-assessment`, `career-path-advisor`

**Export/Optimization**: `one-page-optimizer`, `optimize-for-linkedin`

**Gap Analysis**: `explain-gap`, `fill-gap`

**AI Utility**: `agentic-chat`, `ai-health`, `ai-test`, `manage-api-keys`, `validate-api-key`

**Auth**: `auth-email-hook`, `send-signup-otp`, `verify-signup-otp`

**System**: `send-bug-report`, `send-feature-request`, `send-contact-inquiry`, `send-push-notification`, `send-resume-reminder`, `weekly-digest`, `resolve-short-link`, `generate-headshot`, `generate-store-screenshots`, `suggest-template`, `elevenlabs-scribe-token`, `migrate-user-data`

### Database Functions (RPCs)
- `soft_delete_resume(p_resume_id)` — soft-delete a resume (set `deleted_at`)
- `soft_delete_resumes(p_resume_ids)` — bulk soft-delete
- `restore_resume(p_resume_id)` — restore from trash (clear `deleted_at`)
- `get_shared_resume(share_token, password_attempt?)` — fetch shared resume with password validation
- `get_public_portfolio(p_username)` — fetch portfolio data (returns empty resume skeleton if none exist)
- `check_username_available(p_username, p_user_id)` — check portfolio username availability
- `increment_ai_usage(p_user_id)` — increment daily AI usage counter
- `record_portfolio_visit(...)` — record analytics visit
- `resolve_short_link(p_link_id)` — resolve branded short URL
- `handle_new_user()` — trigger: auto-create profile on signup
- `handle_new_profile_preferences()` — trigger: auto-create user_preferences
- `cleanup_stale_data()` — purge old logs, notifications, versions

---

## 4. Key User Flows

### Create Resume from Blank
1. Dashboard → **+ New Resume** → title + template selection
2. New `resumes` row inserted → navigate to `/editor?id=<id>`
3. Fill sections tab by tab; autosave debounces writes every 3s
4. ATS score computed in background

### Upload and Parse Resume
1. `/upload` → drop PDF/Word/image/JSON → OCR prompt if needed
2. `parse-resume` edge function extracts `ResumeData`
3. Import review sheet → select sections → save as new resume

### AI Tailor to Job Description
1. Dashboard or Resume Detail → **Tailor** → paste JD or job URL
2. Pick intensity → `tailor-resume` rewrites sections
3. Diff-style preview → select sections to apply → merge + save `tailor_history`

### Delete Resume (Soft Delete)
1. Dashboard → three-dot menu → Delete → confirmation dialog
2. Direct `.update({ deleted_at: timestamp })` on `resumes` table
3. Resume appears in Trash sheet → can restore or permanently delete
4. Empty Trash deletes all trashed resumes permanently

### Delete All Data
1. Settings → Delete All Data → type "DELETE" → confirm
2. Deletes all user tables in order (dependents first, then resumes, then profile)
3. Clears all localStorage keys → signs user out
4. `handle_new_user` trigger recreates empty profile on next login

---

## 5. Architecture Notes

- **Auth**: Supabase Auth (email/password + Google OAuth, implicit flow) on external project `jnsfmkzgxsviuthaqlyy`
- **Edge Functions**: deployed on Lovable Cloud (`hjnnamwgztlhzkeuufln`), connect to external DB via `EXT_SUPABASE_URL` + `EXT_SUPABASE_SERVICE_ROLE_KEY`
- **GitHub CI**: `.github/workflows/deploy-edge-functions.yml` uses `supabase/setup-cli@v1` to deploy all functions
- **RPC functions** (`soft_delete_resume`, etc.) exist on external DB but app currently uses direct `.update()` calls with `as any` cast to bypass stale TypeScript types
- **AI provider**: defaults to WiseResume AI (Lovable AI gateway); BYOK Gemini/Ollama supported; provider selection reverts if key not validated on sheet close

---

## 6. Known Issues / Technical Debt

- `AppShell` uses `bg-transparent` — components must set their own backgrounds
- Resume JSONB blobs have no full-text search; Dashboard search is client-side only
- Several Suspense skeletons don't match final layout — causes layout shift
- `useResumeStore` persists to localStorage — can be evicted on low-storage devices
- `EditorPage` is ~1,400 lines — should be decomposed into sub-components/hooks
- `SkyWallpaper` GPU animation runs on all routes including public pages
- No pagination/virtual list on Dashboard resume list — may degrade with 20+ resumes
- Legacy resume JSON shapes may surface `undefined` fields in older resumes
- `tailor_history` and `ai_credits` have no UPDATE RLS policy (intentional)
- No server-side validation on resume content length — potential token overflow
- `feature_requests` and `contact_inquiries` have no DELETE RLS policy — cannot be removed by users
- `bug_reports` has no DELETE or UPDATE RLS policy
- `portfolio_visits` has no DELETE RLS policy — visits cannot be purged by users
- This spec must be manually kept in sync as features ship

---

## Issue Ticket Template

- Issue ID: ISSUE-XXX
- Problem:
- Scope (pages/files/components):
- Do Not Break (required behaviors):
- Proposed Small Change:
- Notes / Edge Cases:
