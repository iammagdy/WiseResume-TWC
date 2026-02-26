# WiseResume — Sequential Rebuild Prompts

> **Purpose**: This file contains a complete, ordered set of prompts that an AI tool can follow step-by-step to recreate the entire WiseResume app from scratch. It also includes Google Stitch prompts for generating screen designs.
>
> **Source of Truth**: All prompts reference `docs/APP_BLUEPRINT.md` for design specs, color tokens, component trees, and data models.

---

## MASTER SYSTEM PROMPT

> **Paste this at the start of your AI conversation before sending any build prompt.**

```
You are an expert full-stack developer building "WiseResume" — an AI-powered resume builder web app. You are following a sequential build plan of 52 prompts.

RULES YOU MUST FOLLOW IN EVERY RESPONSE:

1. PROGRESS TRACKER: Start every response with:
   "✅ PROMPT [X/52] — [Title]"
   Then list:
   - ✅ Completed prompts (numbers only)
   - 🔄 Current prompt
   - 📋 Remaining prompts (numbers only, grouped by phase)

2. ASK QUESTIONS: If any instruction is unclear or you need credentials/keys/choices from me, ASK before proceeding. Never guess.

3. SUGGEST IMPROVEMENTS: After completing each prompt, suggest 1-3 improvements or optimizations you noticed. Label them as "[💡 SUGGESTION]".

4. CONFIRM COMPLETION: End each response with:
   "Ready for PROMPT [X+1]? Or do you want me to adjust anything?"

5. REFERENCE THE BLUEPRINT: The file `docs/APP_BLUEPRINT.md` is your design bible. Follow its color tokens, component trees, spacing utilities, and data models exactly.

6. TECH STACK: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + Framer Motion + Zustand + React Query v5 + React Router v6 + Supabase (Auth, Postgres, Edge Functions).

7. MOBILE-FIRST: Always design for xs (375px iPhone SE) first, then scale up. Use the BottomTabBar for primary nav, not desktop navbars.

8. DESIGN SYSTEM: Never use raw hex/rgb colors. Always use HSL CSS variables from index.css consumed via Tailwind tokens (e.g., bg-primary, text-muted-foreground). Use the glass surface system, gradient utilities, and animation classes defined in the blueprint.

9. SKELETONS: Every page that fetches data MUST have a matching Skeleton component shown during loading. Never show a blank screen.

10. NO SPAGHETTI: Keep components small and focused. Extract reusable patterns. Use proper TypeScript types.
```

---

---

# PART A — GOOGLE STITCH SCREEN DESIGN PROMPTS

> Use these prompts in [Google Stitch](https://stitch.withgoogle.com/) to generate UI mockups for each screen group. Feed the generated designs to the build AI as visual references.

---

### STITCH PROMPT 1 — Auth Screens (4 screens)

```
Design a mobile-first (375px wide) authentication flow for "WiseResume", a dark-themed AI resume builder app. The design language is space-inspired with deep blacks, vibrant red primary (#E63946 equivalent), cyan accents, and glass morphism surfaces.

Create these 4 screens:

1. EMAIL ENTRY SCREEN:
   - Dark background (near-black #0A0A12)
   - Centered app icon (48x48) with purple glow drop-shadow
   - "Welcome to WiseResume" heading in Space Grotesk bold
   - "Sign in or create an account" subtitle in muted gray
   - Email input field with Mail icon prefix, glass surface background
   - "Continue" gradient button (red-to-pink gradient, full width, h-14, rounded-2xl)
   - Divider with "or" text
   - "Continue with Google" outlined button with Google icon
   - Bottom text: "Don't have an account? Sign up" with red link

2. LOGIN SCREEN:
   - Same layout as email entry but with:
   - Email field (pre-filled, muted)
   - Password field with Lock icon prefix and Eye toggle suffix
   - "Sign in with email link" small link in red
   - "Forgot password?" link in muted gray
   - Same gradient CTA button "Sign In"

3. SIGNUP SCREEN:
   - Same layout with:
   - Email field (pre-filled)
   - Password field with strength indicator below
   - Confirm password field
   - Terms checkbox: "I agree to Terms and Privacy Policy"
   - "Create Account" gradient button

4. RESET PASSWORD SCREEN:
   - Minimal layout
   - Back arrow top-left
   - Lock icon centered (large, 64px, muted)
   - "Reset Password" heading
   - "Enter your email to receive a reset link" subtitle
   - Email input
   - "Send Reset Link" gradient button

Style: All inputs have rounded-xl borders, subtle border-border color, glass-input background. Buttons have glow shadow. Font: Inter for body, Space Grotesk for headings.
```

---

### STITCH PROMPT 2 — Dashboard + FAB

```
Design a mobile dashboard screen (375px wide) for "WiseResume" resume builder app. Dark theme, space-inspired aesthetic.

Layout top to bottom:
1. HEADER BAR (h-14): Glass surface background, "WiseResume" brand text left, gear icon right. Subtle bottom border.

2. PROFILE ROW: Round avatar (40x40) with red border-2, "Good morning, Sarah" greeting, "Software Engineer" subtitle, gear icon navigates to settings.

3. STATS CARD: Rounded-2xl card with gradient border glow. Inside: flame emoji "5-day streak", document icon "3 Resumes", lightbulb "Tip: Quantify your achievements". Glass card background.

4. QUICK ACTION CHIPS: Horizontal scroll row of pill buttons — "+ Create", "📄 Upload", "🎯 Tailor", "📋 Templates". Each is rounded-full with muted background and subtle border.

5. RESUME TABS: Two tabs "My CVs" and "Tailored" with swipeable content area.

6. SEARCH + FILTERS: Search input with magnifier icon, sort dropdown.

7. RESUME CARDS (list): Each card is rounded-2xl with border. Left: template thumbnail (48x64). Center: resume title (bold), target job subtitle, "2 days ago" timestamp. Right: circular score ring showing "92" in green (>=80 = green, >=50 = yellow, <50 = red).

8. FLOATING ACTION BUTTON: Fixed bottom-right (bottom-20 right-4), 56x56 rounded-full, red-to-pink gradient, white Plus icon, glow shadow.

9. BOTTOM TAB BAR: 5 tabs — Home (active, with animated pill indicator), Editor, AI Tools (sparkle), Activity (chart), Portfolio (globe). Glass surface background, rounded top corners.

Colors: Background #0A0A12, cards rgba(20,20,35,0.7) with blur, primary red #E63946, cyan accent, success green for high scores.
```

---

### STITCH PROMPT 3 — Resume Editor

```
Design a mobile resume editor screen (375px wide) for "WiseResume". Dark theme.

Layout:
1. TOP BAR: Back arrow, truncated resume title center, cloud sync icon (✓ or spinner), undo/redo arrows right. h-10.

2. PROGRESS BAR: Thin gradient bar (red-to-pink) showing 65% completion. Below header, full width.

3. STEPPER NAV: Horizontal scrollable pills — [Contact] [Summary] [Experience] [Education] [Skills] → more. Active pill has primary background, others are muted with border. Each pill has small icon + label.

4. ACTIVE SECTION (Experience shown): Rounded-2xl card with border. Header row: "💼 Experience" with sparkle AI button right. Below: Experience entries as sub-cards. Each entry: Company name bold, position, date range, bullet points. "+" button to add entry.

5. AI FLOATING BUTTON: Small circular button (w-10 h-10) at bottom-right of section, gradient background, sparkle icon. Triggers AI enhancement sheet.

6. BOTTOM TOOLBAR: Glass surface bar with icon buttons — Template (grid), Customize (palette), Share (link), Export (download), More (dots). Each icon in small rounded container.

7. BOTTOM TAB BAR: Same as dashboard but "Editor" tab active.

Typography: Section titles in Space Grotesk semibold. Field labels in xs muted. Input text in sm regular Inter.
```

---

### STITCH PROMPT 4 — Preview + Upload

```
Design 2 mobile screens (375px wide) for "WiseResume". Dark theme.

SCREEN 1 — RESUME PREVIEW:
- Back arrow + "Preview" title in header
- Large rendered resume preview centered (white page on dark background)
- Zoom controls (+ / - buttons) floating top-right of preview area
- Page navigation at bottom of preview: "Page 1 of 2" with left/right arrows
- Bottom bar with actions: "Template" button, "Export" gradient button
- Bottom tab bar with Editor tab active

SCREEN 2 — UPLOAD / IMPORT:
- Back arrow + "Import Resume" title
- Upload zone: Large dashed-border rectangle (rounded-2xl), centered cloud-upload icon (48px, muted), "Drag & drop or tap to upload" text, "PDF, DOCX, or Image" subtitle in muted text
- File type tabs below: [PDF] [Word] [Image] [LinkedIn] — horizontal pills
- Below upload zone: 3-step progress indicator (Upload → Parse → Review) with connecting lines, step circles numbered, active step highlighted in primary
- Tips card at bottom: rounded-2xl card, lightbulb icon, "For best results, use a text-based PDF" tip text

Colors: Same dark theme, dashed border in muted color, progress steps use primary for active/completed.
```

---

### STITCH PROMPT 5 — AI Studio + Interview

```
Design 2 mobile screens (375px) for "WiseResume". Dark theme, space-inspired.

SCREEN 1 — AI STUDIO:
- Header with back arrow + "AI Tools"
- AI Engine badge: small pill "Powered by Gemini" in muted rounded-full
- AI Credits: "12/20 credits today" text-xs muted
- WISE AI CHAT CARD: Rounded-2xl card at top. Left: gradient circle avatar (red-to-pink) with sparkles icon. Right: "How can I help with your resume?" text. Below: suggestion chips in rounded-full pills.
- TOOL GRID: 2-column grid of tool cards. Each card: rounded-2xl border bg-card, colored icon circle (w-10 h-10 rounded-xl) top-left, tool name bold, one-line description muted. Tools: Tailor, Enhance, ATS Scan, Proofread, Cover Letter, Interview Prep, Career Path, Detect AI.
- Category headers between groups: "✍️ Writing Tools", "📊 Analysis", "🎯 Career"
- Bottom: chat input bar, rounded-2xl, placeholder "Ask Wise AI...", send button right

SCREEN 2 — MOCK INTERVIEW (Active):
- Header: back arrow + "Interview" + timer "03:24" right
- Chat transcript: AI messages left-aligned (bg-muted rounded-2xl), user messages right-aligned (bg-primary rounded-2xl)
- Audio waveform visualization in center (horizontal bar segments of varying height)
- Bottom controls: Large mic button (w-16 h-16 rounded-full bg-primary) center, stop button (w-12 h-12 bg-destructive) right
```

---

### STITCH PROMPT 6 — Applications + Job Detail

```
Design 2 mobile screens (375px) for "WiseResume". Dark theme.

SCREEN 1 — APPLICATIONS:
- Header: back arrow + "Activity"
- Tabs: [Applications] [Jobs] — horizontal, active has bottom border
- Status filter: Horizontal scroll pills — [All 12] [Applied 5] [Interviewing 3] [Offered 1] [Rejected 2]. Active pill = primary filled, others = outlined
- Application cards (list): Each rounded-2xl card. Company name bold, job title below, status badge (small colored pill: green=offered, blue=interviewing, red=rejected, gray=applied), applied date. Action buttons row: Notes, Edit, overflow menu.
- Stats card: "12 total | 3 this week | 8% response rate" in rounded card
- Streak: flame icon "3-day streak"
- Timeline: Vertical line with dots, events listed chronologically

SCREEN 2 — JOB DETAIL:
- Header: back arrow + "Job Details"
- Company header: Company logo placeholder (w-12 h-12 rounded-xl), company name, job title large
- Info pills: Location, Job type, Salary range — horizontal row of outlined pills
- Tabs: [Description] [Requirements] [Company]
- Description text content area
- Bottom: "Apply" gradient button full-width, "Save" outlined button
```

---

### STITCH PROMPT 7 — Portfolio Editor + Public Portfolio

```
Design 2 mobile screens (375px) for "WiseResume". Dark theme.

SCREEN 1 — PORTFOLIO EDITOR:
- Header: back arrow + "Portfolio"
- Toggle row: "Enable Portfolio" label + Switch toggle right
- Username field: "/p/" prefix label + text input for username
- Theme picker: horizontal scroll of color circles (w-8 h-8), active has ring-2 primary
- Sections list: Draggable rows with grip handle, section name, checkbox toggle. Sections: About, Experience, Education, Skills, Projects
- QR Code card: Rounded card with QR code image (120x120), "Share" copy button
- Analytics mini stats: Eye icon "142 views", person icon "89 visitors"

SCREEN 2 — PUBLIC PORTFOLIO:
- Standalone page (no app shell/bottom nav)
- Centered avatar (96x96 rounded-full border-4 accent)
- Name "John Doe" large heading
- Title "Software Engineer" muted
- Social icons row: LinkedIn, GitHub, Twitter, Website — small icon buttons
- Sections with accent left border (w-1 rounded-full):
  - About: paragraph text
  - Experience: company/role/dates + bullets
  - Education: university/degree
  - Skills: tag pills
- Floating "Ask AI ✨" button bottom-right (gradient, rounded-full)
- Footer: "Built with WiseResume" muted text centered
```

---

### STITCH PROMPT 8 — Settings + Profile

```
Design 2 mobile screens (375px) for "WiseResume". Dark theme.

SCREEN 1 — SETTINGS:
- Header: back arrow + "Settings"
- Category chips: horizontal scroll pills with icons — [👤 Account] [🎨 Appearance] [🤖 AI] [✏️ Editor] [🔔 Notifications] [🔒 Privacy]. Active = filled primary.
- Profile card: Large avatar (h-16 w-16) with progress ring overlay showing "72% complete", name, email
- Settings rows grouped by section. Each row: h-[56px] min, icon in colored rounded-lg (w-8 h-8), label text, right side = chevron / Switch toggle / value text. Examples:
  - 🔐 Account: Edit Profile ›, Change Email ›, Biometric Lock [toggle]
  - 🎨 Appearance: Theme "Dark" ›, Accent Color ›
  - 🤖 AI: AI Provider "WiseResume" ›, Usage "12/20" ›
- Section headers: Vertical primary bar (w-1 h-5 rounded-full bg-primary) + icon + label
- Sign Out row: destructive red text
- Developer Credit Card at bottom: animated gradient holographic card

SCREEN 2 — PROFILE EDITOR (Sheet/Page):
- Header: back arrow + "Edit Profile"
- Avatar section: Large avatar centered (h-20 w-20), camera icon overlay button
- Form fields stacked: Full Name, Job Title, Industry (select), Career Level (select), Location, LinkedIn URL, GitHub URL, Website, Phone
- "Save Changes" gradient button at bottom
```

---

### STITCH PROMPT 9 — Cover Letters + Resignation Letters

```
Design 2 mobile screens (375px) for "WiseResume". Dark theme.

SCREEN 1 — COVER LETTERS LIST:
- Header: back arrow + "Cover Letters"
- Empty state (if no letters): Large gradient circle icon (FileText), "No cover letters yet" heading, "Create your first AI-powered cover letter" subtitle muted, "Create Cover Letter" gradient button
- List view: Cards for each letter. Each card rounded-2xl: Title bold, company name, job title, preview snippet (2 lines, muted), created date, action buttons (edit, duplicate, delete, export)
- FAB or top-right "+" button to create new

SCREEN 2 — COVER LETTER EDITOR:
- Header: back arrow + "Cover Letter"
- Form fields: Job Title input, Company input
- Tone selector: Horizontal pills — [Professional] [Friendly] [Enthusiastic] [Formal]. Active = primary filled.
- Template style selector: Similar pills
- Resume selector: Dropdown to pick which resume to base it on
- "Generate with AI ✨" gradient button
- Content area: Rich text editor (textarea with formatting hints), editable content
- Bottom actions: "Save" gradient button, "Export" outlined button
```

---

### STITCH PROMPT 10 — Onboarding + Templates

```
Design 2 mobile screens (375px) for "WiseResume". Dark theme.

SCREEN 1 — ONBOARDING WIZARD:
- Step indicator at top: 4 dots, current filled primary, others muted
- Step 1 shown: 
  - Large welcome illustration or gradient icon
  - "Welcome to WiseResume!" heading large
  - "Let's set up your profile" subtitle muted
  - Name input field (glass input style)
  - "Continue" gradient button full-width at bottom
- Design should feel inviting, clean, spacious with generous padding

SCREEN 2 — TEMPLATES GALLERY:
- Header: back arrow + "Templates"
- Category filter: horizontal pills — [All] [Professional] [Tech] [Creative] [Minimalist]
- ATS filter: small toggle "ATS Optimized"
- Template grid: 2-column grid of template preview cards. Each card: 
  - Template thumbnail (aspect ratio ~0.7, white page preview on dark card)
  - Template name below
  - Small ATS badge (green "High ATS" / yellow "Medium")
  - Tap to select
- Active/selected template has primary border ring
```

---

### STITCH PROMPT 11 — Help, Analytics, Subscription, Referral, Achievements

```
Design 5 mobile screens (375px) for "WiseResume". Dark theme.

SCREEN 1 — HELP & FAQ:
- Header: back arrow + "Help"
- Search input at top: glass input with magnifier icon
- FAQ categories: Accordion sections — Getting Started, Resume Editor, AI Features, Account, Billing
- Each FAQ item: Collapsible with chevron, question text bold, answer text muted when expanded
- Bottom: "Contact Support" card with email/chat options

SCREEN 2 — ANALYTICS / INSIGHTS:
- Header: back arrow + "Insights"
- Stats overview cards: Resume count, application count, average ATS score (in score ring)
- ATS Score Trend Chart: Line chart (Recharts) showing score over time, primary color line, muted grid
- Activity chart: Bar chart showing applications per week
- Section breakdown: Which resume sections need improvement

SCREEN 3 — SUBSCRIPTION / PRICING:
- Header: back arrow + "Upgrade"
- Plan cards (stacked): Free (current, muted outline), Pro ($9.99/mo, primary border glow), Premium ($19.99/mo, accent border glow)
- Each card: Plan name, price, feature bullet list with check icons, CTA button
- Free card: "Current Plan" muted badge
- Pro card: "Most Popular" accent badge, gradient CTA
- Feature comparison table below

SCREEN 4 — REFERRAL:
- Header: back arrow + "Invite Friends"
- Referral code card: Large code display, copy button, share button
- QR code for referral link
- Stats: "3 friends invited", "1 reward earned"
- Reward tiers: Visual progress bar showing reward milestones

SCREEN 5 — ACHIEVEMENTS:
- Header: back arrow + "Achievements"
- Badge grid: 3-column grid of circular badge icons
- Earned badges: Full color with glow
- Locked badges: Muted/grayscale with lock overlay
- Each badge: Icon, name below, progress bar for partially complete
- Categories: Resume Master, AI Explorer, Career Builder, Social Butterfly
```

---

### STITCH PROMPT 12 — Career Path + Notifications + 404

```
Design 3 mobile screens (375px) for "WiseResume". Dark theme.

SCREEN 1 — CAREER PATH:
- Header: back arrow + "Career Path"
- Current role card: Rounded card with user's current job title
- Career roadmap visualization: Vertical tree/flowchart showing:
  - Current position (highlighted node)
  - 2-3 suggested next roles (branching paths)
  - Required skills for each path (tag pills)
  - Timeline estimate ("2-3 years")
- "Take Career Quiz" button at top or bottom
- Skill gap section: List of skills needed vs current, with progress bars

SCREEN 2 — NOTIFICATIONS:
- Header: back arrow + "Notifications"
- Notification list: Each item = rounded card, icon left (type-specific: bell, briefcase, star), title bold, message text muted, timestamp right, unread indicator (primary dot)
- Empty state: Bell icon large, "No notifications" heading, "You're all caught up!" subtitle
- Mark all read button at top

SCREEN 3 — 404 NOT FOUND:
- Centered layout, full page
- Large "404" text in gradient (primary to accent), very bold, text-6xl
- Space-themed illustration or floating astronaut icon
- "Page not found" heading
- "The page you're looking for doesn't exist" subtitle muted
- "Go Home" gradient button
- Animated floating particles/stars in background
```

---

---

# PART B — WEB APP BUILD PROMPTS (52 Prompts)

---

## Phase 1: Foundation (Prompts 1–5)

---

### PROMPT 1/52 — Project Setup + Design System

```
Set up a new React + TypeScript + Vite project for "WiseResume", an AI-powered resume builder.

TECH STACK:
- React 18 + TypeScript + Vite
- Tailwind CSS with tailwindcss-animate plugin
- shadcn/ui (Radix primitives)
- Framer Motion v12+

DESIGN SYSTEM TO IMPLEMENT:

1. FONTS: Import "Inter" (400-700) as body font and "Space Grotesk" (600) as display font. Configure in Tailwind as font-sans and font-display.

2. CSS VARIABLES in index.css — Define ALL HSL color tokens for dark mode (default) and light mode (.light class):

   Dark mode (:root):
   - --background: 240 20% 4% (deep space black)
   - --foreground: 0 0% 98%
   - --card: 240 15% 8%
   - --primary: 355 90% 60% (vibrant red)
   - --secondary: 185 100% 50% (cyan)
   - --accent: 330 100% 65% (hot pink)
   - --muted: 240 15% 15%
   - --muted-foreground: 240 10% 68%
   - --destructive: 0 84% 60%
   - --success: 145 100% 50%
   - --warning: 45 100% 55%
   - --border: 240 15% 18%
   - --input: 240 15% 12%
   - --ring: 355 90% 60%
   - --radius: 1rem

   Light mode (.light):
   - --background: 0 0% 100%
   - --foreground: 240 10% 10%
   - --card: 0 0% 98%
   - --primary: 355 75% 50%
   - (see APP_BLUEPRINT Section 3.3 for all light mode values)

   Space theme tokens (dark only):
   - --space-deep: 240 30% 3%
   - --space-nebula: 270 60% 15%
   - --space-star: 45 100% 75%
   - --space-cyan: 185 100% 60%
   - --space-glow: 270 100% 70%

   Sidebar tokens for both modes.

3. UTILITY CLASSES in index.css:
   - Typography: .text-h1, .text-h2, .text-h3, .text-body, .text-caption, .text-tiny, .text-page-title, .text-section-header, .text-label
   - Spacing: .px-edge, .space-section, .p-card, .safe-top/bottom/left/right
   - Glass surfaces: .glass, .glass-card, .glass-surface, .glass-elevated, .glass-input, .glass-header
   - Gradients: .gradient-primary, .gradient-secondary, .gradient-text, .glow-primary, .glow-accent
   - (Exact values in APP_BLUEPRINT Section 3.4 through 3.7)

4. ANIMATIONS in Tailwind config:
   - fade-in, slide-up, scale-in, shimmer, gradient-shift, float, glow-pulse, twinkle, orbit, float-slow, pulse-glow-cosmic, shooting-star
   - (Exact keyframes in APP_BLUEPRINT Section 3.8)

5. DARK MODE: Class-based toggling (.dark / .light on <html>), smooth transitions on background-color (0.4s) and color (0.3s).

6. Install shadcn/ui components: Button, Input, Dialog, Sheet (Vaul), Tabs, Select, Switch, Checkbox, Avatar, Badge, Card, Separator, Tooltip, Popover, Dropdown Menu, Accordion, Progress, Scroll Area, Toggle, Slider, Radio Group, Label, Textarea.

Deliver: Fully configured project with all tokens, utilities, and shadcn components ready. No pages yet.
```

---

### PROMPT 2/52 — Authentication System

```
Implement the complete authentication system for WiseResume.

SUPABASE AUTH SETUP:
- Email/password signup + login
- OAuth providers: Google, Apple
- Magic link (email link) login
- Password reset flow
- Email verification required (do NOT auto-confirm)

PAGES & COMPONENTS:
1. AuthPage (/auth) with multi-step flow:
   - EmailEntryStep: Email input → determines if user exists (login) or new (signup)
   - LoginForm: Password input, "Forgot password?" link, "Sign in with email link" option
   - SignupForm: Password + confirm, terms checkbox
   - MagicLinkSent: Confirmation UI after magic link sent
   - VerifyEmail: Post-signup verification prompt ("Check your email")
   - Social Auth Buttons: Google, Apple (use @capacitor/browser for native)
   - Rate limiting / cooldown UI after failed attempts

2. AuthCallbackPage (/auth/callback): Handle OAuth redirect, PKCE exchange

3. ResetPasswordPage (/reset-password): New password form after email link click

4. AuthProvider component:
   - Wrap entire app
   - Eagerly fetch session at module load (parallel with splash)
   - Track activeUserIdRef to prevent session hijacking
   - Detect unexpected sign-outs (app:session-expired event)
   - Update profiles.last_active_at on login
   - 5s timeout fallback if session fetch hangs

5. ProtectedRoute component: Redirect to /auth if not authenticated

6. useAuth hook: Expose user, session, signOut, isAuthenticated

SKELETON: AuthSkeleton for the auth page loading state.

DESIGN: Follow APP_BLUEPRINT Section 18.3 for exact layout. Gradient CTA buttons, glass inputs, Space Grotesk headings.

DATABASE: Create the profiles table (see Prompt 3) or at minimum ensure the auth trigger creates a profile row on signup.
```

---

### PROMPT 3/52 — Database Schema (All Tables + RLS + RPCs)

```
Create the complete Supabase database schema for WiseResume. This is the most critical prompt — all 21+ tables with Row Level Security and database functions.

TABLES TO CREATE (with columns, types, defaults, and RLS):

1. profiles — user_id (uuid, NOT NULL), full_name, avatar_url, username (unique), job_title, industry, career_level, location, linkedin_url, github_url, website_url, twitter_url, contact_email, phone_number, onboarding_completed (bool, default false), profile_completed (bool, default false), portfolio_enabled (bool, default false), portfolio_resume_id (uuid → resumes), portfolio_bio, portfolio_theme, portfolio_layout, portfolio_accent_color, portfolio_font, portfolio_style, portfolio_sync_mode, portfolio_meta_title, portfolio_meta_description, portfolio_sections (jsonb), portfolio_extras (jsonb), open_to_work (bool), availability_headline, views (int, default 0), login_streak (int, default 1), last_login_date (date), last_active_at, hired_at, digest_enabled (bool, default true), created_at, updated_at
   RLS: Users can SELECT/INSERT/UPDATE own profile (auth.uid() = user_id). No DELETE.
   TRIGGER: Auto-create profile row on auth.users INSERT.

2. resumes — id (uuid, PK), user_id (uuid, NOT NULL), title (text, default 'Untitled Resume'), contact_info (jsonb, default '{}'), summary (text), experience (jsonb, default '[]'), education (jsonb, default '[]'), skills (jsonb, default '[]'), certifications (jsonb, default '[]'), awards (jsonb, default '[]'), projects (jsonb, default '[]'), publications (jsonb, default '[]'), volunteering (jsonb, default '[]'), hobbies (jsonb, default '[]'), references (jsonb, default '[]'), template_id (text, default 'modern'), customization (jsonb, default '{}'), is_primary (bool, default false), job_match_score (int), target_job_title, target_company, job_url, parent_resume_id (uuid, self-ref), created_at, updated_at
   RLS: Full CRUD restricted to auth.uid() = user_id.

3. resume_versions — id, resume_id (→ resumes), user_id, version_number (int, default 1), snapshot (jsonb, NOT NULL), change_summary, created_at
   RLS: SELECT/INSERT/DELETE own. No UPDATE.

4. resume_shares — id, resume_id (→ resumes), user_id, token (text, NOT NULL), password (text, nullable — bcrypt hashed), expires_at, is_active (bool, default true), view_count (int, default 0), created_at
   RLS: ALL restricted to auth.uid() = user_id.

5. share_comments — id, share_id (→ resume_shares), author_name, content, section, is_resolved (bool, default false), created_at
   RLS: Anyone can INSERT/SELECT on active shares. Share owners can UPDATE/DELETE.

6. cover_letters — id, user_id, resume_id (→ resumes), job_title, company, content, tone (default 'professional'), template_style (default 'professional'), title, created_at, updated_at
   RLS: Full CRUD own.

7. resignation_letters — id, user_id, title, company, position, recipient_name, content, tone (default 'professional'), template_style (default 'standard'), last_working_day (date), notice_period (default '2_weeks'), reason, additions (jsonb), checklist_progress (jsonb), created_at, updated_at
   RLS: Full CRUD own.

8. jobs — id, user_id, title, company, company_logo, description, requirements, location, salary_range, job_type (default 'full-time'), source_url, is_saved (bool, default true), posted_date, created_at, updated_at
   RLS: Full CRUD own.

9. job_applications — id, user_id, job_title, company, status (default 'applied'), job_id (→ jobs), resume_id (→ resumes), cover_letter_id (→ cover_letters), applied_at, deadline, url, notes, remind_at, created_at, updated_at
   RLS: Full CRUD own.

10. interview_sessions — id, user_id, resume_id (→ resumes), job_title, job_description, interview_type (default 'general'), messages (jsonb, default '[]'), overall_score, strengths (jsonb), improvements (jsonb), duration_seconds, created_at
    RLS: Full CRUD own.

11. tailor_history — id, user_id, resume_id (→ resumes), job_title, company, job_description, tailor_result (jsonb), applied_sections (jsonb), score_before, score_after, created_at
    RLS: SELECT/INSERT/DELETE own. No UPDATE.

12. career_assessments — id, user_id, resume_id (→ resumes), quiz_answers (jsonb), result (jsonb), completed_milestones (jsonb), created_at, updated_at
    RLS: Full CRUD own.

13. ai_credits — id, user_id, usage_date (date, default CURRENT_DATE), daily_usage (int, default 0), daily_limit (int, default 20), total_usage (int, default 0), updated_at
    RLS: SELECT/INSERT own. No UPDATE/DELETE (managed by RPC).

14. ai_usage_logs — id, user_id, action_type, section, resume_id (→ resumes), metadata (jsonb), created_at
    RLS: SELECT/INSERT/DELETE own. No UPDATE.

15. user_api_keys — id, user_id, provider, encrypted_key, key_tier (default 'unknown'), created_at, updated_at
    RLS: Full CRUD own.

16. user_preferences — id, user_id, ai_provider (default 'wiseresume'), default_template (default 'modern'), biometric_enabled (bool, default false), biometric_timeout (int, default 30000), pdf_defaults (jsonb), onboarding_flags (jsonb), updated_at
    RLS: SELECT/INSERT/UPDATE own. No DELETE.

17. notifications — id, user_id, title, message, type (default 'system'), link, is_read (bool, default false), created_at
    RLS: Full CRUD own.

18. push_subscriptions — id, user_id, endpoint, p256dh, auth, created_at
    RLS: SELECT/INSERT/DELETE own. No UPDATE.

19. portfolio_visits — id, username, short_link_id (→ short_links), referrer, country, city, sections_viewed (jsonb), time_spent_seconds, visited_at
    RLS: No direct inserts (INSERT = false, use RPC). Owner can SELECT where username matches their profile.

20. short_links — id (text, custom), owner_user_id, label (default 'My Link'), portfolio_username, target_url, click_count (int, default 0), created_at
    RLS: ALL restricted to auth.uid() = owner_user_id.

21. audit_logs — id, user_id, action, category, metadata (jsonb), created_at
    RLS: SELECT/INSERT/DELETE own. No UPDATE.

22. bug_reports — id, user_id, user_email, error_message, error_stack, component_stack, route, session_id, user_agent, additional_context, app_version, status (default 'open'), active_feature, recent_errors (jsonb), created_at
    RLS: INSERT/SELECT own. No UPDATE/DELETE.

23. feature_requests — id, user_id, user_email, feature_title, feature_description, route, user_agent, app_version, status (default 'new'), created_at
    RLS: INSERT own only. No SELECT/UPDATE/DELETE.

DATABASE FUNCTIONS (RPCs):
- get_public_portfolio(p_username) → JSON
- get_portfolio_analytics(p_username) → JSON
- get_portfolio_active_status(p_username) → text
- increment_portfolio_views(p_username) → void
- record_portfolio_visit(...) → void (SECURITY DEFINER to bypass INSERT RLS)
- get_shared_resume(share_token, password_attempt?) → JSON
- increment_share_view_count(share_token) → void
- add_share_comment(p_share_token, p_author_name, p_content, p_section?) → JSON
- get_share_comments(p_share_token) → JSON
- check_username_available(p_user_id, p_username) → boolean
- resolve_short_link(p_link_id) → JSON
- hash_share_password(raw_password) → text (uses pgcrypto)
- verify_share_password(hashed, raw) → boolean
- increment_ai_usage(p_user_id) → void
- cleanup_stale_data() → void (remove old logs, excess versions)
- get_user_api_key_info(p_user_id) → table

VIEW:
- user_api_keys_safe: Exposes provider, key_tier, created_at, updated_at — hides encrypted_key

TRIGGER:
- update_updated_at: Auto-set updated_at on UPDATE for all relevant tables
- Auto-create profile on auth.users INSERT

Enable pgcrypto extension for password hashing.
```

---

### PROMPT 4/52 — State Management (Zustand + React Query)

```
Set up the state management layer for WiseResume.

ZUSTAND STORES (8 stores, all with persist middleware):

1. resumeStore (key: 'resume-storage'):
   State: currentResume (ResumeData | null), currentResumeId (string | null), jobDescription, matchScore, gapAnalysis, selectedTemplate, tailorHistory, tailorHistoryByResume, coverLetterHistory, currentComparison, pendingTailor*, pageBreakSettings
   Actions: updateResume(), setCurrentResume(), setCurrentResumeId(), addTailorHistory(), restoreTailorVersion(), setPendingTailor(), startNewComparison(), addJobToComparison(), applySelectedJob()
   Persist: Only currentResume, currentResumeId, selectedTemplate, pageBreakSettings, tailorHistory, tailorHistoryByResume, coverLetterHistory, jobDescription

2. settingsStore (key: 'wiseresume-settings'):
   State: theme ('light' | 'dark' | 'system'), aiProvider, geminiApiKey, biometricLockEnabled, hasSeenSplash, hasSeenAIIntro, autoProofread, shakeToReportEnabled, quiet hours config
   Actions: setTheme(), setAIProvider(), setGeminiApiKey(), incrementGeminiDailyUsage(), resetSettings()
   Persist: Exclude geminiApiKey, elevenlabsApiKey (stored server-side)

3. offlineSyncStore (key: 'offline-sync'):
   State: pendingChanges queue
   Actions: Queue mutations when offline, flush on reconnect

4. proofreadStore: Proofread session state
5. aiHealthStore: AI service health status
6. atsScoreHistoryStore: ATS score trend data
7. contentLibraryStore: Reusable content snippets
8. guidesStore: Guide read progress

REACT QUERY CONFIG:
- QueryClient with: staleTime 5min, gcTime 10min, refetchOnWindowFocus false, retry 1
- Query hooks to create (stubs for now, implement data fetching in later prompts):
  useResumes, useJobs, useJobApplications, useCoverLetters, useResignationLetters, useProfile, useNotifications, usePortfolioAnalytics, useInterviewHistory, useResumeVersions, useResumeShares, useShareComments

TYPESCRIPT TYPES (src/types/resume.ts):
Define all types from APP_BLUEPRINT Section 9:
- ContactInfo, Experience, Education, Certification, Award, Project, Publication, Volunteering, Hobby, Reference, Language
- ResumeData (combines all above)
- ResumeCustomization (colors, fonts, spacing, margins, lineHeight, pageFormat, sectionOrder)
- TemplateId (union of 30 template IDs)
- JobMatchScore, GapAnalysis, JobIntelligence, SuperTailorResult
- SectionId, TailorSectionId, ExportType, PDFOptions, PageBreakSettings
```

---

### PROMPT 5/52 — Layout System (AppShell + Navigation)

```
Build the app layout system for WiseResume.

COMPONENTS TO BUILD:

1. AppShell (src/components/layout/AppShell.tsx):
   Component tree:
   - Skip-to-content link (sr-only)
   - OfflineBanner (shown when navigator.onLine === false)
   - SlowConnectionBanner (shown when network quality is poor)
   - Mobile header (lg:hidden): h-10, glass-surface, "WiseResume" brand + page title breadcrumb
   - DesktopNav (lg:block): Sidebar navigation
   - <main> with scroll container (ref for scroll-to-top on route change):
     - ScrollProgressBar
     - SwipeBackWrapper (not on editor/exit routes)
     - <Outlet /> with fade-in animation
   - BottomTabBar (lg:hidden)
   - SyncConflictDialog

2. BottomTabBar (src/components/layout/BottomTabBar.tsx):
   5 tabs with icons and labels:
   - Home (Home icon) → /dashboard (matches /dashboard, /settings, /profile, /notifications, /templates, /examples, /guides, /resume, /onboarding)
   - Editor (FileText icon) → /editor (matches /editor, /preview)
   - AI Tools (Sparkles icon) → /ai-studio (matches /ai-studio, /career, /cover-letter*, /resignation-letter*, /interview)
   - Activity (BarChart3 icon) → /applications (matches /applications, /application, /job)
   - Portfolio (Globe icon) → /portfolio
   
   Features:
   - Animated pill indicator using Framer Motion layoutId with spring animation (stiffness:500, damping:35)
   - Discovery dots for first-time users (AI Tools, Portfolio)
   - Changelog badge on Home tab
   - Offline sync pending count on Home tab
   - Haptic feedback on tap
   - Editor tab is "guarded" — auto-loads latest resume or prompts creation
   - glass-surface background with rounded top corners

3. DesktopNav (src/components/layout/DesktopNav.tsx):
   Desktop sidebar (lg: and above) with same nav structure + branding

4. Header (mobile only):
   - h-10, glass-surface with border
   - "WiseResume" brand text + "/ Page Title" breadcrumb
   - Hidden on editor routes
   - Uses getPageTitle() from src/lib/pageTitles.ts

5. pageTitles.ts: Map of route → page title (see APP_BLUEPRINT Section 6)

6. TAB_ROUTES constant: List of routes where bottom nav appears

ROUTING SETUP (src/App.tsx):
- Public routes: /, /auth, /auth/callback, /privacy, /terms, /reset-password, /share/:token, /p/:username, /l/:linkId
- Protected routes (inside AppShell + ProtectedRoute): /dashboard, /editor, /preview, /upload, /settings, /interview, /applications, /onboarding, /profile, /templates, /resume/:id, /job/:id, /application/:id, /notifications, /portfolio, /cover-letters, /cover-letter/*, /examples, /career, /resignation-letter/*, /guides, /guides/:slug, /ai-studio
- Redirects: /activity → /applications, /jobs → /applications
- All pages except Index use lazyWithRetry() for code splitting
- Each lazy page has a Suspense fallback with appropriate skeleton

Provider tree: QueryClientProvider > TooltipProvider > ErrorBoundary > Toaster > BrowserRouter > AuthProvider > AppRoutes

useBackButton hook: Handle Android hardware back with BACK_ROUTES mapping (see APP_BLUEPRINT Section 14)
```

---

## Phase 2: Core Screens (Prompts 6–15)

---

### PROMPT 6/52 — Landing Page

```
Build the landing page (/) for WiseResume. This is eagerly loaded (not lazy) for fast LCP.

COMPONENTS (see APP_BLUEPRINT Section 7.1 + 18.2):

1. SpaceBackground: Fixed fullscreen animated background
   - Canvas or div-based animated stars (twinkle animation)
   - 3 gradient nebula divs (blur-3xl, animate-float, positioned absolute)
   - Shooting star animation (diagonal translate + fade)

2. HeroSection:
   - App logo (120x120) with animate-glow-pulse and red drop-shadow
   - "Build Your Perfect Resume" gradient headline (text-3xl, Space Grotesk)
   - Subtitle with **bold** keywords
   - "Get Started Free →" gradient CTA (h-14 rounded-2xl full-width, glow shadow)
   - Trust bar: "✓ Free ✓ No card ✓ ATS" in text-xs with Check icons

3. ComparisonTable: Two-column strip
   - Left: competitor features with line-through text-muted
   - Right: WiseResume features in font-bold text-primary

4. HowItWorks: 3-step section with pink circle number icons

5. FeaturesGrid: Feature cards in grid (1 col mobile, 3 cols desktop)
   - Each card: rounded-2xl card pattern, icon, title, description

6. PortfolioDemo: Phone frame mockup (aspect-[9/16] border-8 rounded-[2.5rem])

7. EditorDemo: Interactive preview

8. Footer: Brand, Privacy/Terms links, social links, © 2025 WiseUniverse

HEADER: Sticky glass surface h-14, logo left, "Sign In" outlined button right (links to /auth)

ANIMATION: Use Framer Motion for scroll-triggered fade-in on each section (useInView).
```

---

### PROMPT 7/52 — Dashboard Page

```
Build the Dashboard page (/dashboard) for WiseResume.

COMPONENTS (see APP_BLUEPRINT Section 7.3 + 18.4):

1. ProfileHeader: Avatar (h-10 w-10 rounded-full border-2 border-primary) with Popover for profile actions. Greeting "Good morning, [Name]" + job title subtitle.

2. DashboardStats: Gradient-bordered rounded-2xl card with:
   - Login streak (flame emoji)
   - Resume count
   - Daily AI tip

3. QuickActionChips: Horizontal scroll pills — Create, Upload, Tailor, Templates. Each rounded-full with muted bg.

4. OnboardingCarousel: First-time user tips (conditionally shown).

5. Resume Tabs (My CVs / Tailored) with Embla Carousel swipe.

6. ResumeFilters: Search input, sort dropdown (recent/name/score), category filter, score range filter.

7. ResumeGroup + ResumeListCard: List of resume cards with template thumbnail, title, target job, score ring, last modified, action buttons (edit, duplicate, delete, share).

8. WhatsNextCard, DailyTipCard, FeatureDiscoveryCard: Contextual suggestion cards.

9. ATSScoreBreakdown + ATSScoreTrendChart: Score visualization.

10. FloatingCreateButton (FAB): Fixed bottom-20 right-4, w-14 h-14 gradient rounded-full, Plus icon with glow shadow. Mobile: popup menu (New, Tailor, Analyze). Desktop: pill button.

11. CreateResumeDialog: Modal for new resume creation.

12. AnalyzeJobSheet: Paste job description for analysis.

DATA: Use useResumes hook to fetch user's resumes from Supabase. Use useProfile for greeting.

SKELETON: DashboardSkeleton matching the layout.
```

---

### PROMPT 8/52 — Resume Editor (Core)

```
Build the Resume Editor page (/editor) — the most complex screen.

CORE STRUCTURE (see APP_BLUEPRINT Section 7.4 + 18.5):

1. Editor Header: Back button (with unsaved changes guard), truncated resume title, cloud sync status icon, undo/redo buttons.

2. ProgressBar: Thin gradient bar showing section completion percentage.

3. StepperNav: Horizontal scrollable section pills — Contact, Summary, Experience, Education, Skills, + optional sections. Active pill = primary bg. Each has small icon + label.

4. Section Components (one active at a time):
   - ContactSection: Form fields (name, email, phone, location, linkedin, portfolio, photo upload)
   - SummarySection: Textarea + AI enhance button + character count
   - ExperienceSection: Experience timeline, cards (company, position, dates, achievements), InlineAIButton per bullet, GapFiller, GapExplainer
   - EducationSection: Institution, degree, field, dates, GPA
   - SkillsSection: Tag input with categorization, AI suggestions
   - CertificationsSection, AwardsSection, ProjectsSection, PublicationsSection, VolunteeringSection, HobbiesSection, LanguagesSection, ReferencesSection

5. KeyboardToolbar: Mobile formatting shortcuts above keyboard.

6. Undo/Redo: useUndoRedo hook with 50-step history.

7. Cloud sync status indicator.

8. Bottom Toolbar: Icon buttons — Template, Customize, Share, Export, More (each triggers a Sheet).

HOOKS NEEDED:
- useUndoRedo (50-step history)
- useUnsavedChangesGuard (warn before leaving)
- useResumeStore (current resume state)

AUTO-SAVE: Debounced save to Supabase on resume changes.

SKELETON: EditorSkeleton.
```

---

### PROMPT 9/52 — Editor Sheets + Toolbar Actions

```
Build all the Editor toolbar sheets and overlays.

SHEETS TO BUILD (each triggered from the bottom toolbar):

1. TemplateSelector Sheet: Gallery of 30 templates with preview thumbnails, apply button.

2. CustomizeSheet: Color picker, font selector, spacing slider, margin controls, line height, page format (A4/Letter).

3. ShareSheet: Generate share link, toggle password protection, set expiry date, copy link button.

4. ShareFeedbackSheet: View reviewer comments (useShareComments), resolve comments.

5. ExportOptionsSheet: Export types — PDF, DOCX, plain text, ATS-optimized, LinkedIn. Each with icon + description.

6. ATSScanSheet: ATS compatibility analysis results, improvement suggestions.

7. ATSParserPreview: See how ATS systems parse the resume.

8. ProofreadSheet: Grammar/style checking results (useProofread hook).

9. VersionHistorySheet: Browse past versions (useResumeVersions), restore.

10. AddSectionSheet: Toggle optional sections on/off.

11. PageBreakSheet: Control page breaks (auto/manual mode).

12. ContentLibrarySheet: Save/reuse content snippets (contentLibraryStore).

13. CompareSheet: Side-by-side resume comparison.

14. AIHubSheet: Access all AI tools from editor.

15. AgenticChatSheet: General AI assistant conversation.

16. CareerPathSheet: Career trajectory advice.

17. JobAnalysisSheet: Analyze job description.

18. TailorSheet: AI resume tailoring workflow with before/after scoring.

19. KeyboardShortcutsSheet: Shortcut reference card.

All sheets use Vaul drawer component, rounded-t-3xl, grab handle bar.
```

---

### PROMPT 10/52 — Preview Page

```
Build the Resume Preview page (/preview).

COMPONENTS (see APP_BLUEPRINT Section 7.5 + 18.4):

1. Template rendering: Apply the selected template to the current resume data. Render as a styled div that matches the template layout.

2. Page navigation: For multi-page resumes, show "Page 1 of N" with left/right arrow buttons.

3. Zoom controls: +/- buttons floating top-right of preview area.

4. Page break indicators: Visual markers where page breaks occur.

5. Export button: Triggers ExportOptionsSheet.

6. Template switch shortcut.

The preview should render a white "page" on the dark background, properly formatted to look like a real printed resume.

SKELETON: PreviewSkeleton.

NOTE: The actual template rendering components (30 templates) will be built in Prompt 14. For now, create the preview page structure with a placeholder template renderer.
```

---

### PROMPT 11/52 — Upload / Import Page

```
Build the Upload / Import page (/upload).

COMPONENTS (see APP_BLUEPRINT Section 7.6):

1. UploadZone: Drag & drop area (dashed border rounded-2xl, cloud-upload icon, "Drag & drop or tap to upload", accepts PDF/DOCX/DOC/PNG/JPG).

2. FileTypeSelector: Tabs — PDF, Word, Image, LinkedIn.

3. UploadProgressSteps: Animated 3-step progress (Upload → Parse → Review) with connecting lines, numbered circles.

4. OCRPromptDialog: For image uploads, confirm OCR processing. Show estimated time (estimateOCRTime).

5. ImportReviewSheet: Review parsed data before importing. Show extracted contact info, experience, education, skills. Allow editing before save.

6. ATSScorePreview: Quick score of uploaded resume.

7. ATSValidationChecklist: Validation results.

PARSING LIBRARIES:
- PDF: pdfjs-dist for text extraction, with layout-aware preservation
- Word: mammoth for DOCX reading
- OCR: tesseract.js for image-based PDFs and photos
- AI: Call parse-resume edge function for structured data extraction

FLOW:
1. User drops/selects file
2. Detect file type
3. Extract text (pdfjs-dist / mammoth / tesseract.js)
4. If text extraction yields little content → prompt OCR
5. Send text to AI (parse-resume edge function) for structured parsing
6. Show ImportReviewSheet with parsed data
7. User confirms → create new resume in Supabase

SKELETON: UploadSkeleton.
```

---

### PROMPT 12/52 — Templates Gallery

```
Build the Templates Gallery page (/templates) and the 30 template rendering components.

GALLERY PAGE (see APP_BLUEPRINT Section 7.16):
1. Category filters: Horizontal pills — All, Professional, Tech, Creative, Minimalist.
2. ATS compatibility filter: High, Medium, Low toggle.
3. Template grid: 2-column grid on mobile, 3-4 on desktop.
4. Each card: Preview thumbnail, template name, ATS score badge, select button.
5. Live preview on selection.

30 TEMPLATES TO BUILD (see APP_BLUEPRINT Section 8):
Each template is a React component that receives ResumeData and renders a formatted resume page.

| ID | Name | Category | ATS |
|----|------|----------|-----|
| modern | Modern | professional | high |
| classic | Classic | professional | high |
| minimal | Minimal | minimalist | high |
| professional | Professional | professional | high |
| developer | Developer | tech | high |
| creative | Creative | creative | medium |
| executive | Executive | professional | high |
| compact | Compact | minimalist | high |
| academic | Academic | professional | high |
| healthcare | Healthcare | professional | high |
| sales | Sales | professional | high |
| elegant | Elegant | creative | medium |
| corporate | Corporate | professional | high |
| banking | Banking | professional | high |
| consulting | Consulting | professional | high |
| federal | Federal | professional | high |
| legal | Legal | professional | high |
| marketing | Marketing | creative | medium |
| designer | Designer | creative | medium |
| portfolio | Portfolio | creative | low |
| startup | Startup | tech | medium |
| infographic | Infographic | creative | low |
| data-science | Data Science | tech | high |
| devops | DevOps | tech | high |
| cyber | Cybersecurity | tech | high |
| product | Product | tech | high |
| clean | Clean | minimalist | high |
| swiss | Swiss | minimalist | high |
| mono | Mono | minimalist | high |
| zen | Zen | minimalist | high |

Each template should respect:
- ResumeCustomization (colors, fonts, spacing, margins)
- Page format (A4/Letter dimensions)
- Section ordering from customization
- Print-friendly layout (white background, proper margins)

SKELETON: TemplatesPageSkeleton.
```

---

### PROMPT 13/52 — Onboarding Wizard

```
Build the Onboarding Wizard page (/onboarding).

COMPONENTS (see APP_BLUEPRINT Section 7.17):

4-step wizard flow:
1. Step 1 — Welcome: Name entry, large welcome heading, inviting illustration/icon
2. Step 2 — Career Level: Selection cards (Entry Level, Mid-Level, Senior, Executive)
3. Step 3 — Primary Goal: Selection (Finding new job, Career change, Update resume, First resume)
4. Step 4 — Template Selection: Pick a starter template → navigate to /editor

FEATURES:
- Step indicator (4 dots at top, current = primary, others = muted)
- Animated transitions between steps (Framer Motion slide)
- Save onboarding data to profile (career_level, onboarding_completed = true)
- Save default_template to user_preferences
- Skip option available
- Progress persists if user leaves and returns

DESIGN: Spacious, inviting, clean with generous padding. Gradient CTA buttons.

SKELETON: OnboardingSkeleton.
```

---

### PROMPT 14/52 — Profile Editor + Settings Page

```
Build the Profile Editor and Settings page.

PROFILE EDITOR (/profile) — see APP_BLUEPRINT Section 18.8 (Settings):
- Large avatar centered (h-20 w-20) with camera icon overlay for upload
- Form fields: Full Name, Job Title, Industry (select), Career Level (select), Location, LinkedIn URL, GitHub URL, Website, Twitter URL, Phone
- "Save Changes" gradient button
- Profile completion percentage indicator

SETTINGS PAGE (/settings) — see APP_BLUEPRINT Section 7.12 + 18.13:
- Category chips: horizontal scroll pills with icons — Account, Appearance, AI & Voice, Editor, Notifications, Privacy, About
- Profile card: Avatar with progress ring, name, email
- Settings sections grouped:

  Account: Edit Profile (→ /profile), Change Email, Change Password, Biometric Lock toggle
  Appearance: ThemeToggle (Light/Dark/System), Reduced motion toggle
  AI & Voice: AISettingsSheet (provider selection, API key management, usage display), ElevenLabsKeySheet, Auto-proofread toggle
  Editor: Default template, PDF defaults (page numbers, branding), Auto-save
  Notifications: Toast mode, AI tip frequency, Quiet hours, Push toggle
  Privacy: BiometricSetupSheet, timeout, Shake-to-report, Local-only, Analytics, DataExportSheet
  About: App version, DeveloperCreditCard (holographic animated card), Privacy/Terms links, DeleteDataDialog

- Sign Out button (destructive red)
- Reset settings button

SKELETONS: ProfilePageSkeleton, SettingsSkeleton.
```

---

### PROMPT 15/52 — 404 Page + Error Boundary + Animated Splash

```
Build utility screens:

1. 404 NOT FOUND PAGE (/*):
   - Centered layout
   - Large "404" in gradient text (primary → accent), text-6xl bold
   - Space-themed floating astronaut or rocket icon
   - "Page not found" heading
   - "The page you're looking for doesn't exist" subtitle muted
   - "Go Home" gradient button → /dashboard (or / if not authenticated)
   - Animated floating particles in background

2. ERROR BOUNDARY (src/components/ErrorBoundary.tsx):
   - Catch React render errors
   - Show friendly error message
   - "Try Again" button (reload)
   - "Report Bug" button (triggers bug report)
   - Error details in collapsible (dev mode)

3. ANIMATED SPLASH (src/components/AnimatedSplash.tsx):
   - Full-screen dark background
   - App logo centered with scale-in animation
   - "WiseResume" text fades in below
   - Auto-dismiss after 2s or when auth resolves
   - Only shown on first launch (hasSeenSplash in settingsStore)

4. BIOMETRIC LOCK SCREEN (src/components/BiometricLockScreen.tsx):
   - Full-screen overlay
   - Lock icon centered
   - "Unlock WiseResume" text
   - Fingerprint/Face ID button
   - Integrates with useBiometricLock hook
```

---

## Phase 3: AI Features (Prompts 16–25)

---

### PROMPT 16/52 — Shared AI Client + Edge Function Infrastructure

```
Build the shared AI infrastructure for all edge functions.

SHARED MODULES (supabase/functions/_shared/):

1. aiClient.ts — 3-tier AI provider fallback:
   Tier 1: Check if user has BYOK key (query user_api_keys table for the user)
   Tier 2: Use server GEMINI_API_KEY secret
   Tier 3: Fallback to EMERGENT_LLM_KEY secret
   
   Export a function that accepts: user_id, prompt, options (model, temperature, maxTokens)
   Returns: AI response text
   Handle errors gracefully with appropriate error messages

2. authMiddleware.ts — JWT validation:
   - Extract Bearer token from Authorization header
   - Verify JWT with Supabase
   - Return user object or 401 error
   - Export authenticateRequest() function

3. cors.ts — CORS headers:
   - Allow all origins (for Capacitor + web)
   - Handle OPTIONS preflight
   - Export corsHeaders object

4. rateLimiter.ts — Per-user rate limiting:
   - Check ai_credits table for daily usage
   - Call increment_ai_usage RPC
   - Return 429 if over limit
   - Export checkRateLimit(userId) function

CLIENT-SIDE AI UTILITIES:

1. src/lib/aiProvider.ts:
   - handleAIError(): Parse edge function error responses, throw typed errors for rate limits, credit exhaustion, network failures
   - getAIProviderInfo(): Return current provider name and status

2. src/hooks/useAIAction.ts:
   - Generic hook for executing AI edge function calls
   - Handles loading state, error handling, credit checking
   - Refreshes auth token before each call
   - Logs usage to ai_usage_logs

3. src/hooks/useAICredits.ts:
   - Fetch current daily usage from ai_credits table
   - Display remaining credits
   - Real-time updates after AI actions
```

---

### PROMPT 17/52 — AI Studio Page

```
Build the AI Studio page (/ai-studio).

COMPONENTS (see APP_BLUEPRINT Section 7.7 + 18.8):

1. AIEngineBadge: Small chip showing current AI provider name.

2. AICreditsIndicator: "12/20 credits today" display.

3. Wise AI Chat Card: Rounded-2xl card at top, gradient avatar (sparkle icon), greeting message, suggestion chips.

4. Tool Grid: 2-column grid of 18 AI tool cards, grouped by category:

   ✍️ Writing Tools: Tailor, Enhance, Summary Writer, Proofread
   📊 Analysis: ATS Scan, Score Resume, Detect & Humanize
   🎯 Career: Career Path, Career Assessment, Company Briefing
   📄 Documents: Cover Letter, Resignation Letter
   🎤 Interview: Mock Interview, Recruiter Simulation
   🔗 Optimization: LinkedIn Optimizer, One-Page Optimizer
   💬 Advanced: Agentic Chat, Fill Gap, Explain Gap, Portfolio Bio

   Each card: rounded-2xl border bg-card/60, colored icon circle (w-10 h-10 rounded-xl), title font-medium, description text-xs muted. Optional "Featured" badge.

5. Recent Tools row: Horizontal scroll of recently used tools.

6. Chat input: Rounded-2xl input at bottom, "Ask Wise AI..." placeholder, send button.

7. AI Studio Tour: First-time walkthrough overlay.

Each tool card opens a lazy-loaded sheet when tapped. The actual sheet implementations come in following prompts.

SKELETON: AIStudioSkeleton.
```

---

### PROMPT 18/52 — Resume Analysis + Scoring Edge Functions

```
Build the resume analysis and scoring AI features.

EDGE FUNCTIONS:

1. analyze-resume (supabase/functions/analyze-resume/index.ts):
   Input: { resume: ResumeData, jobDescription: string, jobTitle?: string }
   Output: JobMatchScore { overallScore, skillsMatch, experienceRelevance, keywordAlignment, atsCompatibility, strengths[], improvements[] }
   + GapAnalysis { missingKeywords[], missingSkills[], suggestedSections[], recommendedPhrases[], priorityImprovements[] }
   Uses: authMiddleware, aiClient, rateLimiter

2. score-resume (supabase/functions/score-resume/index.ts):
   Input: { resume: ResumeData }
   Output: ATS compatibility score (0-100) with breakdown by category
   Lighter-weight than analyze-resume (no job description needed)

CLIENT-SIDE:

1. useResumeScore hook: Fetch/cache ATS score for current resume
2. ATSScanSheet component: Display analysis results with visual score ring, category breakdowns, and improvement suggestions
3. ATSParserPreview component: Show how ATS systems would parse the resume
4. AnalyzeJobSheet: Paste job description → trigger analysis → show results

INTEGRATION:
- Dashboard score badges on resume cards
- Editor toolbar ATS scan button
- Score trend tracking in atsScoreHistoryStore
```

---

### PROMPT 19/52 — Resume Tailoring

```
Build the AI resume tailoring feature.

EDGE FUNCTION — tailor-resume:
Input: { resume: ResumeData, jobDescription: string, jobTitle: string, company?: string }
Output: SuperTailorResult {
  enhancedSummary, enhancedSkills[], enhancedExperience[],
  jobIntelligence (experienceLevel, salaryRange, workMode, mustHaveSkills, niceToHaveSkills, companyCultureSignals, redFlags),
  interviewTalkingPoints[], atsAnalysis, bulletTransformations[],
  strengthsAnalysis[], scoreBefore, scoreAfter
}

CLIENT-SIDE:

1. TailorSheet (editor/TailorSheet.tsx):
   Multi-step flow:
   a. Paste job description (or paste URL → call parse-job-url)
   b. Loading state with progress animation
   c. Results view:
      - Score improvement bar (before → after)
      - Job Intelligence card (experience level, salary, work mode)
      - Section-by-section changes with diff highlighting
      - "Apply" button per section or "Apply All"
      - Interview talking points card
   d. History list (tailorHistoryByResume from store)

2. useAITailor hook: Execute tailor request, save to tailor_history table, update resumeStore.

3. TailorHistory: View past tailoring results, restore previous versions.

INTEGRATION:
- AI Studio "Tailor" tool card
- Dashboard QuickActionChip "Tailor"
- Editor AIHubSheet
```

---

### PROMPT 20/52 — Section Enhancement + Proofreading

```
Build AI section enhancement and proofreading features.

EDGE FUNCTIONS:

1. enhance-section:
   Input: { section: SectionId, content: string, resumeContext?: Partial<ResumeData>, jobDescription?: string }
   Output: { enhanced: string, changes: { original: string, improved: string, reason: string }[] }

2. proofread-resume:
   Input: { resume: ResumeData }
   Output: { issues: { section, text, suggestion, type: 'grammar'|'style'|'clarity'|'consistency', severity: 'error'|'warning'|'info' }[] }

3. detect-and-humanize:
   Input: { text: string }
   Output: { aiScore: number, humanizedText: string, changes: string[] }

CLIENT-SIDE:

1. useAIEnhance hook: Enhance any section with loading state
2. InlineAIButton component: Small sparkle button next to each editable field/bullet
3. AIFloatingButton: Global AI action trigger in editor
4. AIAssistantBar: Inline AI suggestions bar
5. AIContextualNudge: Context-aware improvement tips

6. useProofread hook: Run proofreading on entire resume
7. ProofreadSheet: Display issues with accept/reject actions, categorized by severity

8. DetectHumanizeSheet: Check AI content score, humanize text
```

---

### PROMPT 21/52 — Cover Letter Generation

```
Build cover letter generation feature.

EDGE FUNCTION — generate-cover-letter:
Input: { resume: ResumeData, jobTitle: string, company?: string, tone: 'professional'|'friendly'|'enthusiastic'|'formal', templateStyle: string }
Output: { content: string, title: string }

PAGES (see APP_BLUEPRINT Section 7.13):

1. CoverLettersPage (/cover-letters):
   - List of saved cover letters as cards
   - Each card: title, company, job title, preview snippet, date, actions (edit, duplicate, delete, export)
   - Empty state with gradient icon + CTA
   - Create button → /cover-letter/new

2. CoverLetterNewPage (/cover-letter/new):
   - Job title + company inputs
   - Tone selector pills
   - Template style selector
   - Resume selector dropdown
   - "Generate with AI ✨" button
   - Content textarea for manual edits
   - Save + Export buttons

3. CoverLetterEditPage (/cover-letter/edit/:id):
   - Load existing cover letter
   - Same form as new page, pre-filled
   - Update button

HOOKS: useCoverLetters (CRUD with React Query)
DATA: Save to cover_letters table

SKELETONS: CoverLettersSkeleton.
```

---

### PROMPT 22/52 — Resignation Letter Generation

```
Build resignation letter generation feature.

EDGE FUNCTION — generate-resignation-letter:
Input: { company, position, recipientName, lastWorkingDay, noticePeriod, reason, tone, additions?: string[] }
Output: { content: string, title: string }

PAGES (see APP_BLUEPRINT Section 7.14):

1. ResignationLettersPage (/resignation-letters):
   - Similar structure to cover letters list
   - Cards with title, company, position, date, actions

2. ResignationLetterNewPage (/resignation-letter/new):
   - Company, position, recipient name inputs
   - Last working day date picker
   - Notice period selector
   - Reason selector
   - Tone selector pills
   - "Generate with AI ✨" button
   - Content textarea
   - ResignationChecklist: Step-by-step departure checklist (give notice, transition responsibilities, return property, update benefits)
   - Save + Export buttons

3. ResignationLetterEditPage (/resignation-letter/edit/:id):
   - Load existing, pre-fill form, update

HOOKS: useResignationLetters (CRUD)
DATA: Save to resignation_letters table

SKELETONS: ResignationLettersSkeleton.
```

---

### PROMPT 23/52 — Mock Interview (Voice + Web Speech)

```
Build the Mock Interview feature with voice support.

EDGE FUNCTION — interview-chat:
Input: { messages: ChatMessage[], resumeData?: ResumeData, jobTitle?: string, jobDescription?: string, interviewType: 'behavioral'|'technical'|'case-study'|'mixed' }
Output: { reply: string, isComplete: boolean, summary?: InterviewSummary }

InterviewSummary: { overallScore, categoryScores: { communication, technical, problemSolving, behavioral }, strengths[], improvements[] }

PAGE (/interview) — see APP_BLUEPRINT Section 7.8 + 18.9:

1. InterviewSetup: Mode selection cards (Behavioral, Technical, Case Study, Mixed), job title input, job description (optional), start button.

2. InterviewPreview: Question category breakdown before starting.

3. Voice Conversation UI:
   - TranscriptBubble: AI messages (bg-muted, left) + user messages (bg-primary, right)
   - Audio waveform visualization (animated bars)
   - Voice recording controls (start/stop/pause)
   - Timer display
   - Web Speech API for speech-to-text (primary)
   - ElevenLabs Scribe as enhanced option (useElevenLabsScribe hook)

4. InterviewSummary: Score ring (80px), category score bars, strengths list, improvements list.

5. InterviewHistorySheet: Past sessions list (useInterviewHistory).

6. CompanyBriefingSheet: Research company before interview (calls company-briefing edge function).

HOOKS:
- useVoiceInterview: Session state management
- useElevenLabsScribe: ElevenLabs transcription
- useWebSpeechFallback: Browser Speech API
- useInterviewHistory: Past sessions CRUD

DATA: Save to interview_sessions table.

SKELETON: InterviewSkeleton.
```

---

### PROMPT 24/52 — Career Path + Quiz

```
Build the Career Path feature.

EDGE FUNCTIONS:
1. career-assessment: Evaluate quiz answers → career recommendations
2. career-path-advisor: Given current role + skills → suggest career trajectories

PAGE (/career) — see APP_BLUEPRINT Section 7.15:

1. CareerQuizSheet: Multi-step assessment quiz
   - Questions about skills, interests, values, experience
   - Progress indicator
   - Submit → AI evaluation

2. CareerRoadmap: Visual career path
   - Current position node (highlighted)
   - 2-3 suggested next roles (branching paths)
   - Required skills for each path (tag pills)
   - Timeline estimates

3. SkillGapAnalyzer: Compare current skills vs target role requirements, show gaps with progress bars.

HOOKS:
- useCareerAssessment: Quiz state + results
- useCareerMilestones: Track career milestones

DATA: Save to career_assessments table.
```

---

### PROMPT 25/52 — Agentic Chat + Gap Tools

```
Build the remaining AI tools.

EDGE FUNCTIONS:

1. agentic-chat: General AI assistant for resume questions
   Input: { messages: ChatMessage[], resumeContext?: ResumeData }
   Output: { reply: string }

2. fill-gap: Generate content to fill employment gaps
   Input: { gapStart: string, gapEnd: string, context: string }
   Output: { suggestion: string, type: 'freelance'|'education'|'personal'|'volunteer' }

3. explain-gap: Generate professional gap explanations
   Input: { gapStart: string, gapEnd: string, reason?: string }
   Output: { explanation: string }

CLIENT-SIDE:

1. AgenticChatSheet: Full conversation UI with message history, input, suggestion chips. Accessible from editor toolbar and AI Studio.

2. GapFiller component (inside ExperienceSection): Detect timeline gaps between experience entries, offer to fill them with AI suggestions.

3. GapExplainer component: Generate professional explanations for employment gaps.

4. useAgenticChat hook: Conversation state management.

INTEGRATION: Wire these into the Editor's AIHubSheet and AI Studio tool grid.
```

---

## Phase 4: Job Tracking (Prompts 26–29)

---

### PROMPT 26/52 — Applications Page

```
Build the Applications / Job Tracker page (/applications).

COMPONENTS (see APP_BLUEPRINT Section 7.9 + 18.10):

1. Tabs: [Applications] [Jobs] with swipeable Embla content.

2. StatusFilter: Horizontal scroll pills — All, Applied, Interviewing, Offered, Rejected, Saved. Active = primary filled. Each shows count.

3. ApplicationCard: Rounded-2xl card for each application. Company (bold), job title, status badge (colored pill), applied date, deadline indicator, action buttons (update status, notes, delete).

4. JobActivityStats: "12 total | 3 this week | 8% response" card.

5. ActivityStreak: Flame icon + consecutive days.

6. ActivityTimeline: Vertical timeline with dots and chronological events.

7. AddApplicationSheet: Create new application form (job title, company, status, URL, notes, deadline, resume link, cover letter link).

8. SaveJobSheet: Save a job for later.

9. JobSearchSheet: Search/browse saved jobs.

Status badge colors:
- Offered: bg-success/10 text-success
- Interviewing: bg-primary/10 text-primary
- Rejected: bg-destructive/10 text-destructive
- Applied: bg-muted text-muted-foreground

HOOKS: useJobApplications (CRUD), useJobs (CRUD), useJobActivityStats
DATA: job_applications + jobs tables

SKELETON: ApplicationsSkeleton.
```

---

### PROMPT 27/52 — Application Detail + Job Detail

```
Build detail pages for applications and jobs.

1. ApplicationTrackerPage (/application/:id):
   - Load application by ID
   - Status timeline showing status changes over time
   - Status update dropdown
   - Notes section (editable textarea)
   - Linked resume preview (if resume_id set)
   - Linked cover letter (if cover_letter_id set)
   - Deadline countdown
   - Reminder setting
   - Delete application button

2. JobDetailPage (/job/:id):
   - Load job by ID
   - Company header: logo placeholder, company name, job title
   - Info pills: Location, Job type, Salary range
   - Tabs: Description, Requirements, Company
   - Description/requirements text content
   - "Apply" gradient button (creates job application)
   - "Save" toggle button
   - "Tailor Resume" button (→ tailor flow with this job's description)

SKELETONS: DetailSkeleton for both.
```

---

### PROMPT 28/52 — Job Parsing Edge Functions

```
Build job parsing edge functions.

1. parse-job-url:
   Input: { url: string }
   Output: { title, company, location, description, requirements, salaryRange, jobType }
   Scrape job listing page and extract structured data using AI.

2. parse-job-text:
   Input: { text: string }
   Output: Same structure as parse-job-url
   Parse pasted job description text into structured data.

INTEGRATION:
- AnalyzeJobSheet on Dashboard: Paste URL or text → parse → analyze against resume
- AddApplicationSheet: Auto-fill from URL
- TailorSheet: Parse job before tailoring
```

---

### PROMPT 29/52 — Notifications System

```
Build the notifications system.

PAGE (/notifications):
- List of notification cards, each with: type-specific icon (bell, briefcase, star), title (bold), message (muted), timestamp, unread indicator (primary dot)
- Mark all read button
- Empty state: Bell icon, "No notifications", "You're all caught up!"
- Swipe to dismiss (mobile)

BACKEND:
- notifications table already exists
- Create notifications when:
  - Application status changes
  - Resume shared and viewed
  - AI analysis complete
  - Application deadline approaching

EDGE FUNCTION — send-push-notification:
- Send web push via VAPID to push_subscriptions endpoints

CLIENT HOOKS:
- useNotifications: Fetch, mark read, delete
- usePushNotifications: Subscribe/unsubscribe from push

SKELETON: NotificationsSkeleton.
```

---

## Phase 5: Portfolio (Prompts 30–34)

---

### PROMPT 30/52 — Portfolio Editor

```
Build the Portfolio Editor page (/portfolio).

COMPONENTS (see APP_BLUEPRINT Section 7.10 + 18.11):

1. Enable toggle: Switch to enable/disable public portfolio.

2. Username picker: /p/ prefix + text input. Check availability (check_username_available RPC). Show available/taken status.

3. Theme selection: Horizontal scroll of color circles (w-8 h-8), active = ring-2 primary. Themes: midnight, ocean, forest, sunset, lavender, etc.

4. Section arrangement: Draggable list (grip handle + checkbox toggle). Sections: About, Experience, Education, Skills, Projects, Contact.

5. Accent color picker.

6. Font selection dropdown.

7. Layout options (single/split).

8. SEO settings: Meta title, meta description inputs.

9. Resume selector: Pick which resume powers the portfolio.

10. Bio editor: Textarea for custom bio (or "Generate with AI" button → generate-portfolio-bio edge function).

11. Preview button: Opens /p/username in new tab.

Save all settings to profiles table (portfolio_* columns).
```

---

### PROMPT 31/52 — Public Portfolio Page

```
Build the Public Portfolio page (/p/:username).

COMPONENTS (see APP_BLUEPRINT Section 7.11 + 18.12):

This is a STANDALONE page — no AppShell, no auth required, no bottom nav.

1. Portfolio theme applied (colors, fonts from profile settings).

2. Profile header: Name (text-2xl bold), job title (muted), avatar (h-24 w-24 rounded-full border-4 accent), social icons row (LinkedIn, GitHub, Twitter, Website).

3. Bio section: Paragraph text with accent left border (w-1 rounded-full).

4. Experience timeline: Company, role, dates, bullet points.

5. Education section.

6. Skills visualization: Tag pills.

7. Projects gallery.

8. Contact section.

9. "Ask AI" floating button: Bottom-right (fixed), gradient bg, sparkle icon. Opens a chat sheet where visitors can ask questions about the portfolio owner (calls ask-portfolio edge function).

10. Footer: "Built with WiseResume" badge, centered, muted.

DATA: Use get_public_portfolio RPC to fetch all data. Increment views with increment_portfolio_views RPC. Track visit with record_portfolio_visit RPC.

EDGE FUNCTIONS NEEDED:
- ask-portfolio: AI Q&A about the portfolio owner
- portfolio-meta: Return SEO metadata for the page
- og-image: Generate dynamic Open Graph image

SEO: Proper meta tags, JSON-LD structured data, og:image from og-image function.
```

---

### PROMPT 32/52 — QR Codes + Short Links

```
Build QR code generation and short link management.

QR CODES:
- Use qr-code-styling library
- Generate QR for portfolio URL (/p/username)
- Customizable: foreground color, background, logo in center
- Download as PNG
- Display in portfolio editor

SHORT LINKS:
- Create branded short URLs (/l/linkId)
- short_links table with custom ID, label, target URL, click count
- ShortLinkPage (/l/:linkId): Resolve link (resolve_short_link RPC), redirect to target, increment click_count

PORTFOLIO EDITOR INTEGRATION:
- QR code card in portfolio editor
- Short link manager: Create/edit/delete short links
- Copy link button
- Share button (native share API)
```

---

### PROMPT 33/52 — Portfolio Analytics

```
Build portfolio analytics features.

COMPONENTS (inside Portfolio Editor):

1. VisitorsPanel:
   - Total views count
   - Unique visitors (approximate from portfolio_visits)
   - Geographic distribution (country/city breakdown)
   - Referrer sources (direct, social, other)
   - Section engagement (which sections viewed most)
   - Time spent (average)

2. Analytics charts (Recharts):
   - Views over time (line chart)
   - Geographic map or bar chart
   - Section engagement bar chart

DATA: 
- Use get_portfolio_analytics RPC
- portfolio_visits table
- usePortfolioAnalytics hook

EDGE FUNCTION — track-portfolio-view:
- Called from public portfolio page
- Records visit with geo data (from request headers), referrer, sections viewed, time spent
- Uses SECURITY DEFINER to bypass RLS on portfolio_visits INSERT
```

---

### PROMPT 34/52 — Portfolio AI Features

```
Build portfolio AI features.

EDGE FUNCTIONS:

1. generate-portfolio-bio:
   Input: { resume: ResumeData, tone?: string }
   Output: { bio: string }
   Generate a compelling portfolio bio from resume data.

2. ask-portfolio:
   Input: { question: string, portfolioData: any }
   Output: { answer: string }
   Allow visitors to ask questions about the portfolio owner. Uses portfolio data as context.

CLIENT-SIDE:

1. "Generate Bio" button in portfolio editor → calls generate-portfolio-bio → fills bio textarea.

2. AskAIWidget on public portfolio:
   - Floating button (bottom-right, gradient)
   - Opens chat sheet
   - Visitor types question
   - AI answers based on portfolio data
   - Max 5 questions per session (client-side limit)
```

---

## Phase 6: Sharing & Documents (Prompts 35–38)

---

### PROMPT 35/52 — Resume Sharing

```
Build the resume sharing system.

SHARE CREATION (from Editor's ShareSheet):
1. Generate unique share token
2. Optional password protection:
   - User enters password
   - Hash with hash_share_password RPC
   - Store hashed password in resume_shares
3. Optional expiry date
4. Copy share link (/share/token)

SHARE VIEWER PAGE (/share/:token):
Standalone page (outside AppShell).
1. Call get_shared_resume RPC with token
2. If password required → show password input form
3. Verify with verify_share_password
4. If expired → show "Link expired" message
5. If valid → render resume preview with selected template
6. Increment view count (increment_share_view_count)
7. Show comment section (see Prompt 36)

HOOKS: useResumeShares (CRUD for share links)
SKELETON: ShareSkeleton.
```

---

### PROMPT 36/52 — Share Comments

```
Build the share comments feature.

ON SHARE VIEWER PAGE (/share/:token):
1. Comments section below resume preview
2. Add comment form: Author name input, content textarea, optional section selector
3. Submit → add_share_comment RPC
4. Display comments list (get_share_comments RPC)
5. Show section badge if comment is for specific section

IN EDITOR (ShareFeedbackSheet):
1. View all comments from all shares of this resume
2. Each comment: Author name, content, section, timestamp
3. Resolve/unresolve toggle (mark as addressed)
4. Delete comment (share owner only)

HOOKS: useShareComments
```

---

### PROMPT 37/52 — Resume Versions

```
Build the resume version history feature.

VERSION CREATION:
- Auto-create version snapshot before significant changes:
  - Before applying AI tailor results
  - Before importing over existing resume
  - Manual "Save Version" action
- Store full resume data as JSONB snapshot
- Auto-increment version_number
- Optional change_summary

VERSION HISTORY SHEET (in Editor):
1. List of versions sorted by date
2. Each entry: Version number, date, change summary, preview button
3. "Restore" button → replace current resume with snapshot
4. Delete old versions button
5. Max 50 versions per resume (cleanup_stale_data handles excess)

HOOKS: useResumeVersions (CRUD)
DATA: resume_versions table
```

---

### PROMPT 38/52 — PDF + DOCX Export

```
Build the document export system.

PDF EXPORT:
- Use pdf-lib + html2canvas
- Render resume template to canvas → PDF pages
- Support multi-page (automatic page breaks)
- Page number options: simple ("1") or full ("Page 1 of 2")
- Optional branding footer
- A4 and Letter format support
- ATS-optimized variant (simpler layout for ATS parsing)

DOCX EXPORT:
- Use docx library
- Convert resume data to structured Word document
- Proper headings, bullet lists, formatting
- Template-agnostic (content-focused)

PLAIN TEXT EXPORT:
- Simple text format for copy-paste

LINKEDIN EXPORT:
- Formatted for LinkedIn profile sections

EXPORT FLOW:
1. ExportOptionsSheet lists available formats with icons + descriptions
2. User selects format
3. Show progress (useExportProgress hook)
4. Generate document
5. Trigger download

HOOKS: useExportProgress
```

---

## Phase 7: Advanced Features (Prompts 39–45)

---

### PROMPT 39/52 — Help & FAQ Page

```
Build the Help & FAQ page (/help).

COMPONENTS:
1. Search input: Glass input with magnifier icon, filters FAQ items
2. FAQ categories: Accordion sections — Getting Started, Resume Editor, AI Features, Account & Billing, Portfolio, Troubleshooting
3. Each FAQ item: Collapsible with chevron, question text bold, answer content with markdown support
4. Contact support card: Email link, in-app bug report button
5. Guides shortcut: Link to /guides

CONTENT: Hardcode 20-30 common FAQ items covering all major features.
```

---

### PROMPT 40/52 — Analytics / Insights Page

```
Build the Analytics / Insights page (/analytics).

COMPONENTS:
1. Stats overview cards: Resume count, application count, average ATS score (score ring), cover letters count
2. ATS Score Trend: Line chart (Recharts) showing score changes over time
3. Application Activity: Bar chart showing applications per week/month
4. Section Improvement: Which resume sections need the most work (based on AI analysis)
5. AI Usage: Credits used this month, most used AI tools
6. Career Progress: Milestones achieved

DATA: Aggregate from resumes, job_applications, ai_usage_logs, tailor_history tables.
Some charts may use mock data for now (score trend).
```

---

### PROMPT 41/52 — Subscription / Pricing Page

```
Build the Subscription / Pricing page (/subscription).

COMPONENTS:
1. Plan cards (3 tiers stacked):
   - Free (current): Muted outline, "Current Plan" badge
     Features: 3 resumes, 20 AI credits/day, 5 templates, basic export
   - Pro ($9.99/mo): Primary border glow, "Most Popular" badge, gradient CTA
     Features: Unlimited resumes, 100 AI credits/day, all 30 templates, DOCX export, portfolio
   - Premium ($19.99/mo): Accent border glow
     Features: Everything in Pro + unlimited AI, priority support, custom domain

2. Feature comparison table below plans

3. FAQ section about billing

NOTE: This is UI-only for now. Actual Stripe integration comes in Prompt 50.
Each plan card has a CTA button that will later link to Stripe checkout.
```

---

### PROMPT 42/52 — Referral Page

```
Build the Referral / Invite Friends page (/referral).

COMPONENTS:
1. Referral code card: Large code display (generated from user ID), copy button, share button (native share API)
2. QR code for referral link (qr-code-styling)
3. Stats: Friends invited count, rewards earned count
4. Reward tiers: Visual progress bar showing milestones (invite 3 → free month, invite 10 → premium month)
5. Invited friends list (placeholder)

NOTE: This is UI-only. No backend referral tracking tables yet. Referral code is derived client-side from user profile.
```

---

### PROMPT 43/52 — Achievements / Badges Page

```
Build the Achievements / Badges page (/achievements).

COMPONENTS:
1. Badge grid: 3-column grid of circular badge icons
2. Earned badges: Full color with glow effect
3. Locked badges: Grayscale with lock overlay
4. Each badge: Icon, name, description, progress bar (for partially complete)

BADGE CATEGORIES (hardcoded):
- Resume Master: Created first resume, Exported 5 PDFs, Scored 90+ ATS, etc.
- AI Explorer: Used 5 AI tools, Generated cover letter, Mock interview, etc.
- Career Builder: Applied to 10 jobs, Got first interview, etc.
- Social Butterfly: Shared resume, Enabled portfolio, Got 100 views, etc.

NOTE: Badges are rendered from hardcoded definitions with client-side tracking (localStorage). No persistent DB tracking yet.
```

---

### PROMPT 44/52 — Guides & Examples Pages

```
Build the Guides and Examples pages.

1. GuidesPage (/guides):
   - List of career guide cards
   - Each card: Title, description, reading time, category badge
   - Categories: Resume Writing, Interview Prep, Career Growth, Job Search
   - Tap → /guides/:slug

2. GuidePage (/guides/:slug):
   - Full guide content in markdown (react-markdown)
   - Table of contents sidebar (desktop)
   - Read progress tracking (guidesStore)
   - "Was this helpful?" feedback buttons
   - Related guides at bottom

3. ExamplesPage (/examples):
   - Gallery of example resumes by industry
   - Each example: Template preview, industry label, "Use as Template" button
   - Click → opens template with pre-filled sample data

CONTENT: Hardcode 10-15 guides and 5-10 example resumes.

SKELETONS: GuidesExamplesSkeleton.
```

---

### PROMPT 45/52 — Command Palette + Bug Report

```
Build utility features.

1. COMMAND PALETTE (Cmd+K / Ctrl+K):
   - cmdk library integration
   - Search across: Pages, actions, resumes, recent AI tools
   - Categories: Navigation, Actions, Resumes, AI Tools
   - Keyboard navigation (arrow keys + Enter)
   - DeferredProvider: Loads 2s after app mount

2. BUG REPORT DIALOG:
   - Triggered by: shake gesture (useShakeDetect), menu item, error boundary
   - Form: Error description textarea, optional context
   - Auto-captures: route, app version, user agent, session ID, recent console errors, active feature
   - Submits to bug_reports table + send-bug-report edge function
   - DeferredProvider: Loads 2s after app mount

3. FEATURE REQUEST:
   - Simple form: Title, description
   - Submits to feature_requests table + send-feature-request edge function

EDGE FUNCTIONS:
- send-bug-report: Process and optionally notify developers
- send-feature-request: Same pattern
```

---

## Phase 8: Native & Platform (Prompts 46–49)

---

### PROMPT 46/52 — PWA + Service Worker

```
Build PWA support.

1. vite-plugin-pwa configuration:
   - Auto-update strategy
   - Service worker registration in main.tsx
   - Manifest.json with app name, icons, theme color, display: standalone
   - Offline page fallback

2. InstallPrompt component:
   - Detect if app is installable (beforeinstallprompt event)
   - Show install banner/prompt
   - "Install App" button
   - Dismissible with "Not now"
   - Don't show on standalone routes (/share, /p, /l)

3. UpdateBanner component:
   - Detect service worker update available
   - Show "New version available" banner
   - "Update" button (skipWaiting + reload)

DESIGN: Install prompt as bottom sheet, update banner as top toast.
```

---

### PROMPT 47/52 — Capacitor Native Setup

```
Set up Capacitor for native Android/iOS builds.

1. Capacitor configuration:
   - App ID: com.wiseresume.app
   - Deep linking scheme: wiseresume://
   - Status bar: transparent, dark content on light, light content on dark

2. NATIVE HOOKS:

   a. useBiometricLock:
      - @capgo/capacitor-native-biometric
      - Fingerprint/Face ID authentication
      - Configurable timeout (0s, 30s, 60s, 5min)
      - BiometricLockScreen shown when locked

   b. useStatusBarThemeSync:
      - @capacitor/status-bar
      - Sync status bar color with app theme

   c. useDeepLinking:
      - @capacitor/app
      - Handle wiseresume:// URLs
      - Parse portfolio and resume links
      - PKCE exchange for auth callbacks
      - Regex fallback for URL parsing

   d. useBackButton (already built in Prompt 5, enhance for native):
      - @capacitor/app backButton event
      - BACK_ROUTES mapping

   e. useShakeDetect:
      - Device motion API
      - Triggers bug report dialog on shake
      - Configurable on/off in settings

3. NATIVE APK OPTIMIZATIONS:
   - Disable all backdrop-filter (body.native-app CSS)
   - Opaque fallback backgrounds
   - Touch manipulation on interactive elements
   - -webkit-overflow-scrolling: touch
```

---

### PROMPT 48/52 — Offline Support + Sync Queue

```
Build offline support.

1. OfflineBanner component:
   - Shown when navigator.onLine === false
   - "You're offline — changes will sync when you reconnect"
   - Dismissible

2. SlowConnectionBanner component:
   - useNetworkQuality hook (measures connection speed)
   - Show warning when connection is slow

3. offlineSyncStore:
   - Queue mutations when offline
   - Track pending changes count
   - Flush queue on reconnect (in order)
   - Handle conflicts (SyncConflictDialog)

4. useNetworkStatus hook: Online/offline detection
5. useNetworkQuality hook: Connection speed estimation

6. useAppLifecycle hook:
   - Listen to visibilitychange + Capacitor appStateChange
   - Dispatch app:save-draft event when going to background
   - Auto-save current resume on background

7. Local persistence:
   - All Zustand stores already persist to localStorage
   - Resume data available offline
   - Queue any Supabase mutations for later sync

8. Sync badge on Home tab: Show pending sync count
```

---

### PROMPT 49/52 — Push Notifications

```
Build web push notifications.

1. VAPID key generation and storage (server secret).

2. Client-side subscription:
   - usePushNotifications hook
   - Request notification permission
   - Subscribe to push via service worker
   - Save subscription to push_subscriptions table
   - Unsubscribe option in settings

3. EDGE FUNCTION — send-push-notification:
   - Input: { userId, title, message, link? }
   - Fetch user's push subscriptions
   - Send via web-push library
   - Handle expired subscriptions (clean up)

4. EDGE FUNCTION — send-resume-reminder:
   - Scheduled reminder to update resume
   - Triggered by cron or manual

5. EDGE FUNCTION — weekly-digest:
   - Weekly summary email/push
   - Activity stats, tips, updates
   - Respects digest_enabled profile setting

NOTIFICATIONS TRIGGERED BY:
- Application deadline approaching (2 days before)
- Resume shared and viewed
- AI analysis complete
- Weekly digest (if enabled)
```

---

## Phase 9: Polish & Launch (Prompts 50–52)

---

### PROMPT 50/52 — Stripe Payment Integration

```
Integrate Stripe for subscription payments.

DATABASE:
- Create subscriptions table: id, user_id, stripe_customer_id, stripe_subscription_id, plan ('free'|'pro'|'premium'), status ('active'|'canceled'|'past_due'), current_period_start, current_period_end, created_at, updated_at
- RLS: Users can SELECT own subscription. No direct INSERT/UPDATE/DELETE (managed by webhook).

EDGE FUNCTIONS:

1. create-checkout-session:
   Input: { planId: 'pro'|'premium', billingPeriod: 'monthly'|'yearly' }
   - Create Stripe customer (if not exists)
   - Create checkout session
   - Return session URL

2. stripe-webhook:
   - Handle: checkout.session.completed → create/update subscription
   - Handle: customer.subscription.updated → update status
   - Handle: customer.subscription.deleted → mark canceled
   - Handle: invoice.payment_failed → mark past_due
   - Verify webhook signature

3. create-portal-session:
   - Create Stripe customer portal session
   - Return portal URL (for managing subscription)

CLIENT-SIDE:

1. Update Subscription page:
   - Free plan: Show current, upgrade buttons
   - Pro/Premium: "Subscribe" → redirect to Stripe checkout
   - Active subscription: "Manage Subscription" → Stripe portal

2. useSubscription hook:
   - Fetch current plan from subscriptions table
   - Check if feature is available for current plan
   - Provide upgrade prompt

STRIPE SECRETS NEEDED: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
```

---

### PROMPT 51/52 — AI Credit Enforcement

```
Enforce AI credit limits across all edge functions.

CHANGES TO EVERY AI EDGE FUNCTION:

At the start of each AI function (analyze-resume, tailor-resume, enhance-section, score-resume, proofread-resume, generate-cover-letter, generate-resignation-letter, interview-chat, career-assessment, career-path-advisor, company-briefing, detect-and-humanize, optimize-for-linkedin, one-page-optimizer, agentic-chat, fill-gap, explain-gap, generate-portfolio-bio, ask-portfolio, recruiter-simulation, generate-headshot):

1. Call rateLimiter.checkRateLimit(userId)
2. Check user's subscription plan
3. Apply tier limits:
   - Free: 20 credits/day
   - Pro: 100 credits/day
   - Premium: Unlimited
4. If over limit: Return 429 with { error: "Daily AI credit limit reached", upgradeUrl: "/subscription" }
5. If valid: Proceed + increment usage

CLIENT-SIDE:

1. Update useAIAction to handle 429 responses:
   - Show "Credits exhausted" toast
   - Show upgrade CTA button → /subscription
   - Prevent further AI actions until reset

2. Update AICreditsIndicator:
   - Show tier-aware limits (e.g., "12/100" for Pro)
   - Color code: green (>50%), yellow (25-50%), red (<25%)
   - "Upgrade" link for free users near limit

3. Feature gating:
   - Free users: Limited templates (5), no DOCX export, no portfolio
   - Pro users: All templates, DOCX, portfolio, 100 AI/day
   - Premium: Everything unlimited
```

---

### PROMPT 52/52 — Final QA Checklist + Polish

```
Final quality assurance and polish pass.

CHECKLIST:

1. RESPONSIVE TESTING:
   - Test all 41 screens at xs (375px), sm (640px), md (768px), lg (1024px)
   - Ensure BottomTabBar hidden on desktop, DesktopNav hidden on mobile
   - Verify safe area insets (notch, home indicator)

2. DARK/LIGHT MODE:
   - Toggle between modes on every screen
   - Verify all colors use CSS variables (no raw hex/rgb)
   - Check contrast ratios

3. LOADING STATES:
   - Every data-fetching page has matching Skeleton
   - No blank screens during loading
   - Proper error states with retry buttons

4. OFFLINE:
   - Test each critical flow offline
   - Verify sync queue works on reconnect
   - Check offline banner appears

5. ACCESSIBILITY:
   - Skip-to-content link
   - Proper heading hierarchy (single H1 per page)
   - Alt text on all images
   - Focus management on modals/sheets
   - Keyboard navigation in command palette

6. SEO:
   - Title tags (<60 chars) on all pages
   - Meta descriptions (<160 chars)
   - JSON-LD on public portfolio
   - og:image for shared content

7. PERFORMANCE:
   - Lazy loading for all pages except landing
   - Image lazy loading
   - Code splitting verification
   - Bundle size check

8. ERROR HANDLING:
   - Error boundary catches all React errors
   - API errors show user-friendly messages
   - Network errors show retry options
   - Auth errors redirect appropriately

9. PWA:
   - Installable on Chrome, Safari, Firefox
   - Service worker caches correctly
   - Update prompt works

10. SECURITY:
    - All RLS policies verified
    - No sensitive data exposed in client
    - API keys encrypted
    - Share passwords properly hashed

Fix any issues found during this audit.
```

---

## Quick Reference: Prompt Phase Map

```
Phase 1: Foundation     → Prompts 1-5    (Setup, Auth, DB, State, Layout)
Phase 2: Core Screens   → Prompts 6-15   (Landing, Dashboard, Editor, Preview, Upload, Templates, Onboarding, Settings, 404)
Phase 3: AI Features    → Prompts 16-25  (AI Client, Studio, Analysis, Tailor, Enhance, Cover Letter, Resignation, Interview, Career, Chat)
Phase 4: Job Tracking   → Prompts 26-29  (Applications, Detail, Parsing, Notifications)
Phase 5: Portfolio      → Prompts 30-34  (Editor, Public, QR/Links, Analytics, AI)
Phase 6: Sharing & Docs → Prompts 35-38  (Sharing, Comments, Versions, Export)
Phase 7: Advanced       → Prompts 39-45  (Help, Analytics, Subscription, Referral, Achievements, Guides, Cmd Palette)
Phase 8: Native         → Prompts 46-49  (PWA, Capacitor, Offline, Push)
Phase 9: Launch         → Prompts 50-52  (Stripe, Credit Enforcement, QA)
```

---

*Generated from WiseResume APP_BLUEPRINT.md — the single source of truth for all design specs, data models, and component trees.*
