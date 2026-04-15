# Feature Specification: WiseHire — HR Platform

  **Feature Branch**: `001-wisehire-hr-platform`
  **Created**: 2026-04-15
  **Last Updated**: 2026-04-15
  **Status**: Draft v2 — Awaiting Final User Approval
  **Input**: Full brainstorming session + four-point review + decisions session

  ---

  ## Overview

  WiseResume is expanding to serve the other side of the hiring table. **WiseHire** is a new AI-powered HR SaaS tool built into the same platform, accessible via a toggle on the existing landing page. It targets HR professionals, recruiters, and hiring managers at small-to-medium companies.

  The platform splits cleanly into two sides after sign-up: job seekers use WiseResume, companies use WiseHire. The two sides are connected via the Talent Pool (opted-in job seekers discoverable by HR). Account type is permanent — no switching after creation.

  **Current release status**: WiseHire is in pre-launch. No new sign-ups are accepted. Visitors can join a waiting list. Existing accounts can log in. Admin can invite users directly via the dev kit email tool.

  ---

  ## User Scenarios & Testing

  ### User Story 1 — Landing Page Toggle with Full Theme Switch (Priority: P1)

  A visitor lands on the WiseResume homepage. A clear toggle sits at the very top — above everything, including the nav — with two options: **"For Job Seekers"** and **"For Companies."** The default is the WiseResume view. When the visitor clicks "For Companies," the ENTIRE page transforms: the color theme switches from the WiseResume crimson to a WiseHire professional blue, the hero headline changes, the typewriter text cycles through HR-relevant roles ("Hiring Manager," "Recruiter," "HR Director"), the feature sections change to WiseHire tools, the "see it in action" demos change to WiseHire demos, the pricing section changes to WiseHire pricing, and all CTAs change to "Join the Waitlist" (pre-launch state). The transition takes under 400ms with no layout jump or page reload. The URL updates so the WiseHire mode is shareable and bookmarkable.

  **Why this priority**: The toggle is the entry gate to everything. It also defines the visual brand identity of WiseHire from the very first interaction.

  **Independent Test**: A visitor can click "For Companies," experience the full theme and content switch, copy the URL, and return to the WiseHire landing page directly.

  **Full theme switch specification (WiseHire mode)**:
  - **Primary color**: Professional blue (e.g., `#1B4ED8` or indigo — to be finalised in the plan phase, must pass WCAG AA contrast).
  - **Hero headline**: Changes to a WiseHire-specific headline (e.g., "Hire Smarter. Screen Faster.").
  - **Typewriter text**: Cycles through HR roles instead of job seeker roles.
  - **Trust section**: Shows "companies hiring smarter with WiseHire" social proof instead of job seeker logos.
  - **Feature ticker**: WiseHire feature names instead of WiseResume feature names.
  - **Feature sections**: 5 WiseHire pillars — Brief Generator, JD Writer, Pipeline, Bulk Screening, Talent Pool.
  - **"See it in action" demos**: WiseHire-specific animated demos (brief output, pipeline board, JD writer).
  - **Pricing section**: WiseHire tiers ($49 / $149 / $399 / Enterprise) — with "Early Access" badge and "Join Waitlist" CTA.
  - **CTA buttons**: All CTAs say "Join the Waitlist" and open the waitlist flow during pre-launch. After launch, CTA becomes "Get Started."
  - **Aurora/background effects**: Hue shifts to match the WiseHire blue palette.
  - **Nav**: Same structure, but "Sign In" links to WiseHire login.

  **Acceptance Scenarios**:

  1. **Given** a visitor arrives with no URL parameter, **When** they view the page, **Then** they see the WiseResume (crimson) landing page by default.
  2. **Given** a visitor clicks "For Companies," **When** the transition completes, **Then** the entire page — colors, content, demos, pricing, CTAs — reflects WiseHire. Transition takes under 400ms.
  3. **Given** the visitor copies the URL after switching to WiseHire mode, **When** someone else opens it, **Then** they land directly in WiseHire mode.
  4. **Given** a visitor clicks "For Job Seekers" from WiseHire mode, **When** the transition completes, **Then** the page returns fully to WiseResume mode.
  5. **Given** the visitor clicks any CTA during pre-launch, **When** the action triggers, **Then** they are taken to the waitlist flow — not a sign-up form.

  ---

  ### User Story 2 — Waitlist (Pre-Launch Gate) (Priority: P1)

  WiseHire is not open for sign-ups yet. Any visitor who clicks "Get Started" or "Join the Waitlist" on the WiseHire landing page sees the waitlist experience instead of a sign-up form. They enter their name, email, company name, and company size. On submit, the system sends a confirmation email to the user and a notification email to `contact@thewise.cloud`. The visitor sees a confirmation message: "You're on the list. We'll be in touch." Existing WiseHire accounts can still log in via a "Log In" link. Admin can bypass the waitlist and send a direct invite link to any email address from the dev kit.

  **Why this priority**: WiseHire must not accept open sign-ups before the product is fully ready. The waitlist captures early demand and gives admin full control over who gets access.

  **Independent Test**: A visitor can join the waitlist, receive a confirmation email, and the admin receives a notification — all without any sign-up being created.

  **Acceptance Scenarios**:

  1. **Given** a visitor clicks "Join the Waitlist," **When** the form appears, **Then** they see fields for name, email, company name, and company size.
  2. **Given** the visitor submits the form, **When** submission succeeds, **Then** they see a confirmation message and receive a confirmation email from `contact@thewise.cloud`.
  3. **Given** a valid waitlist submission, **When** it is processed, **Then** `contact@thewise.cloud` receives a notification with the submitter's details.
  4. **Given** an existing WiseHire account holder arrives at the landing page, **When** they click "Log In," **Then** they are taken to the login flow and routed to the WiseHire dashboard.
  5. **Given** an admin sends a direct invite link via the dev kit email tool, **When** the recipient clicks the link, **Then** they bypass the waitlist and land on the WiseHire sign-up form directly.
  6. **Given** email delivery is tested via the dev kit, **When** a test email is sent, **Then** it arrives in the recipient inbox and is recorded in the audit log.

  ---

  ### User Story 3 — Separate WiseHire Sign-Up & Account Type (Priority: P1)

  An invited HR professional receives a direct invite link and creates their account. The sign-up flow knows they are a WiseHire user (via the invite link parameter). They are asked for company name and company size. After sign-up, they land on the WiseHire onboarding. Their account is permanently typed as `hr` in the database — this is visible in the dev kit as a clear "HR Account" badge and visible in Supabase as the `account_type` column on the `profiles` table.

  **Why this priority**: The account type split is the architectural foundation every other WiseHire feature depends on.

  **Independent Test**: An invited user creates an account, their Supabase profile shows `account_type = 'hr'`, and the dev kit user detail view shows an "HR Account" badge.

  **Acceptance Scenarios**:

  1. **Given** an invited user clicks the direct invite link, **When** they complete sign-up, **Then** their profile has `account_type = 'hr'` in Supabase.
  2. **Given** a standard job seeker signs up via the normal flow, **When** their profile is created, **Then** `account_type = 'job_seeker'`.
  3. **Given** an admin opens the dev kit user list, **When** they view any user row, **Then** they see a clearly visible account type badge — "HR" or "Job Seeker."
  4. **Given** an admin opens the user detail drawer, **When** they view an HR user, **Then** the account type is prominently displayed alongside plan, suspension status, and other existing fields.
  5. **Given** an HR user is logged in, **When** they look for a way to switch to job seeker mode, **Then** no such option exists anywhere in the app.
  6. **Given** a job seeker is logged in, **When** they look for WiseHire tools, **Then** they do not appear in any part of the WiseResume dashboard.

  ---

  ### User Story 4 — WiseHire Onboarding (Priority: P1)

  After sign-up, an HR user goes through a dedicated WiseHire onboarding flow — completely separate from the WiseResume job seeker onboarding. The flow has 5 steps: (1) Welcome to WiseHire, (2) Company identity — company name (pre-filled) and team size, (3) Hiring context — what types of roles they typically hire for and how many candidates they screen per month, (4) AI setup — if on Starter tier, they are prompted to add their own AI key; Professional and above skip this, (5) "You're ready" — entry point to create their first Role. Progress is saved to localStorage and the completion flag is stored in Supabase. Users can skip at any time.

  **Why this priority**: Onboarding sets up the data WiseHire needs to personalise the experience (AI key routing, role type context) and establishes the HR user's first action in the product.

  **Independent Test**: An HR user completes onboarding and lands on the WiseHire dashboard with their first Role creation prompt, independently of any other WiseHire feature.

  **Acceptance Scenarios**:

  1. **Given** a new HR user completes sign-up, **When** they are routed post-sign-up, **Then** they land on the WiseHire onboarding — not the WiseResume onboarding.
  2. **Given** the HR user completes all 5 steps, **When** they finish, **Then** `onboarding_completed = true` is saved to their profile and they land on the WiseHire dashboard.
  3. **Given** the HR user skips onboarding, **When** they arrive at the dashboard, **Then** a banner nudges them to complete setup (same pattern as WiseResume dashboard).
  4. **Given** the HR user is on Starter tier, **When** they reach step 4 (AI setup), **Then** they are shown a clear prompt to enter their AI key before they can use brief generation.
  5. **Given** an HR user returns after partial completion, **When** they navigate to onboarding, **Then** their progress is restored from localStorage.

  ---

  ### User Story 5 — Trial Period & Early Access (Priority: P1)

  WiseHire has no payment gateway yet. The subscription page shows WiseHire pricing tiers with an "Early Access" badge, making it clear the product is in early access and billing is not yet active. New HR users get a 7-day free trial with full Professional tier capabilities automatically on account creation. Admin can create coupon codes from the dev kit to grant any HR user any WiseHire tier for any duration. HR users can redeem coupon codes on the WiseHire subscription page. A trial countdown badge is shown throughout the WiseHire dashboard during the trial period.

  **Why this priority**: This mirrors the existing WiseResume early access model exactly, reusing the coupon and trial infrastructure that already exists.

  **Independent Test**: An HR user can see their trial status and an admin can create and grant a coupon without any payment gateway being present.

  **Acceptance Scenarios**:

  1. **Given** a new HR user signs up, **When** their account is created, **Then** they automatically receive a 7-day Professional tier trial.
  2. **Given** an HR user's trial is active, **When** they view the WiseHire dashboard, **Then** a trial countdown badge shows days remaining.
  3. **Given** the WiseHire subscription page loads, **When** an HR user views it, **Then** they see WiseHire tiers with an "Early Access" badge and no active payment button.
  4. **Given** an admin creates a coupon code in the dev kit, **When** the HR user enters it on the subscription page, **Then** the specified plan is activated for the specified duration.
  5. **Given** an admin wants to invite a specific user to WiseHire Professional, **When** they create a plan-upgrade coupon for that user in the dev kit, **Then** the coupon can be sent via the dev kit email tool in the same workflow.

  ---

  ### User Story 6 — Dev Kit: WiseHire Admin Panel (Priority: P1)

  The dev kit gains WiseHire-specific admin capabilities: (1) The overview panel shows a separate count of HR accounts vs. job seeker accounts, (2) the user list shows account type badge for every user, (3) the user detail drawer shows the `account_type` field prominently, (4) admin can create WiseHire-specific coupon codes (for WiseHire tiers: `starter`, `professional`, `business`, `enterprise`), and (5) admin can send a WiseHire direct invite link to any email from the email tool — generating a branded WiseHire invite email.

  **Why this priority**: Admin visibility and control are required before any HR user can be onboarded, since onboarding is invite-only during pre-launch.

  **Independent Test**: Admin can see HR vs. job seeker split in the overview, find any HR user in the list, and send them an invite link — all within the existing dev kit.

  **Acceptance Scenarios**:

  1. **Given** the admin opens the dev kit Overview, **When** they view platform stats, **Then** they see total job seeker accounts and total HR accounts as separate figures.
  2. **Given** the admin opens the Users tab, **When** they scan the list, **Then** every user row has an account type badge.
  3. **Given** the admin opens a user detail drawer for an HR user, **When** the drawer loads, **Then** account type appears prominently alongside existing fields.
  4. **Given** the admin opens Coupons and creates a new coupon, **When** they set the plan, **Then** WiseHire tiers (`starter`, `professional`, `business`) are available as options alongside existing WiseResume tiers.
  5. **Given** the admin wants to invite someone to WiseHire, **When** they use the email tool, **Then** they can select "Send WiseHire Invite" as an action type, enter the recipient email, and the system sends a branded WiseHire invite email with a direct sign-up link.
  6. **Given** an invite email is sent, **When** delivery completes, **Then** the action is recorded in the audit log under `admin_email` category.

  ---

  ### User Story 7 — AI Candidate Brief Generator (Priority: P1 — Phase 1 MVP)

  An HR user uploads a resume PDF and pastes a job description. Within 30 seconds, WiseHire produces a Candidate Brief: a match score (0–100), 3 strengths, 3 concerns/gaps, 8 personalised interview questions based on the specific candidate's background, and an employment pattern note (tenure, gaps, trajectory). The brief can be exported as a PDF or shared via a public read-only link (no account required to view).

  **Why this priority**: The core differentiator. No standard ATS produces a narrative brief with personalised interview questions. This is the "WOW" feature that retains early HR customers.

  **Independent Test**: An HR user generates a complete Candidate Brief as a standalone action delivering immediate, complete value.

  **Acceptance Scenarios**:

  1. **Given** an HR user uploads a resume and pastes a JD, **When** they click "Generate Brief," **Then** within 30 seconds they receive a structured brief with all required sections.
  2. **Given** a brief is generated, **When** the HR user clicks "Export PDF," **Then** they receive a clean one-page PDF.
  3. **Given** a brief is generated, **When** the HR user clicks "Share," **Then** a public read-only link is generated — no account required to view.
  4. **Given** the AI service is unavailable, **When** a brief is requested, **Then** the user sees a clear error and the system does not silently fail.
  5. **Given** an HR user on Starter tier has not configured an AI key, **When** they try to generate a brief, **Then** they are shown a clear prompt to configure their AI key — pointing them to Settings.

  ---

  ### User Story 8 — AI Job Description Writer (Priority: P1 — Phase 1 MVP)

  An HR user types a short plain-English description of a role. The AI produces a complete, professional, bias-reduced job description. The HR user can edit it inline, save it to their JD library, and copy it to post externally.

  **Why this priority**: Writing JDs is one of the most painful HR tasks. Fast to build, high perceived value.

  **Independent Test**: An HR user types 2 sentences and receives a full usable JD.

  **Acceptance Scenarios**:

  1. **Given** an HR user types a short role description, **When** they click "Write JD," **Then** they receive a full job description including title, responsibilities, requirements, and a "What we offer" section within 20 seconds.
  2. **Given** a JD is generated, **When** the HR user edits and saves it, **Then** the updated JD is saved to their account and attached to the relevant role.
  3. **Given** a JD is saved, **When** the HR user clicks "Copy," **Then** the full text is copied to clipboard.
  4. **Given** an HR user has multiple saved JDs, **When** they open the JD library, **Then** they see all JDs with role name and creation date.

  ---

  ### User Story 9 — Candidate Pipeline Board (Priority: P1 — Phase 1 MVP)

  An HR user manages candidates for open roles on a Kanban-style board with fixed columns: Shortlisted, Contacted, Interviewing, Offer Sent, Hired, Rejected. They can drag candidates between columns, add private notes, and filter by role.

  **Why this priority**: The pipeline turns WiseHire into a daily workflow tool that drives retention.

  **Independent Test**: An HR user adds candidates and moves them through stages independently of Brief or JD Writer.

  **Acceptance Scenarios**:

  1. **Given** an HR user has candidates, **When** they open the Pipeline, **Then** they see all candidates in stage columns.
  2. **Given** a candidate is in Shortlisted, **When** dragged to Interviewing, **Then** the change persists after refresh.
  3. **Given** the HR user clicks a candidate card, **When** the detail panel opens, **Then** they can read the Candidate Brief, add a private note, and see stage history.
  4. **Given** an HR user has candidates across multiple roles, **When** they filter by role, **Then** only that role's candidates are shown.

  ---

  ### User Story 10 — Bulk Resume Screening (Priority: P2 — Phase 2)

  An HR user uploads up to 50 resume PDFs at once with a JD. The system scores and ranks all candidates by fit, showing match percentage, top 3 strengths, and top 2 concerns per candidate on one screen.

  **Why this priority**: Saves hours — but requires the single-candidate brief (P1) working first.

  **Independent Test**: 5 resumes uploaded with one JD produce a ranked list within 2 minutes.

  **Acceptance Scenarios**:

  1. **Given** multiple resumes are uploaded, **When** "Screen All" is clicked, **Then** all candidates are ranked by fit score.
  2. **Given** the ranked list is displayed, **When** "Add to Pipeline" is clicked for a candidate, **Then** they are added to Shortlisted.
  3. **Given** Bias Reduction is enabled, **When** the list renders, **Then** names, photos, and schools are hidden.

  ---

  ### User Story 11 — Bias Reduction Mode (Priority: P2 — Phase 2)

  HR user toggles "Bias Reduction Mode" which hides candidate names, photos, university names, and graduation years. Only skills and experience are shown. After shortlisting, bias mode can be disabled to reveal identities.

  **Acceptance Scenarios**:

  1. **Given** bias mode is enabled, **When** cards render, **Then** names, schools, and photos are replaced with anonymous labels.
  2. **Given** a candidate is shortlisted in bias mode, **When** bias mode is disabled, **Then** full identity is revealed.

  ---

  ### User Story 12 — Interview Scorecard (Priority: P2 — Phase 2)

  After a Candidate Brief is generated, the HR user opens a structured scorecard pre-populated with the 8 personalised questions. They rate each (1–5) with notes, submit, and share via a read-only link.

  **Acceptance Scenarios**:

  1. **Given** a brief exists, **When** the scorecard is opened, **Then** the 8 brief questions are pre-populated.
  2. **Given** the scorecard is submitted, **When** saved, **Then** it appears on the candidate's profile with score and notes.
  3. **Given** the scorecard is saved, **When** "Share Scorecard" is clicked, **Then** a read-only link is generated.

  ---

  ### User Story 13 — Talent Pool Discovery (Priority: P3 — Phase 3)

  WiseResume job seekers can toggle "Make my profile discoverable to HR" in portfolio settings. HR users can search the Talent Pool by skills, experience level, and availability. When an HR user views a job seeker's Talent Pool profile, the job seeker receives an in-app notification within 60 seconds — showing only the date/time, not the company identity.

  **Acceptance Scenarios**:

  1. **Given** a job seeker enables discoverability, **When** an HR user searches Talent Pool, **Then** the job seeker appears in results.
  2. **Given** a job seeker has not opted in, **When** HR searches, **Then** they do not appear.
  3. **Given** an HR user views a Talent Pool profile, **When** the view is registered, **Then** the job seeker receives a notification within 60 seconds showing date/time only.
  4. **Given** an HR user clicks "Add to Pipeline" on a Talent Pool profile, **Then** the candidate is added to Shortlisted with a link to their public portfolio.
  5. **Given** a job seeker deletes their account, **When** deletion completes, **Then** they are immediately removed from the Talent Pool.

  ---

  ### User Story 14 — HR Analytics Dashboard (Priority: P3 — Phase 3)

  HR user opens Analytics and sees: total candidates screened, average match score, time-to-hire per role, top skills in applicant pool, Talent Pool views — all with no setup required.

  **Acceptance Scenarios**:

  1. **Given** at least 5 candidates are screened, **When** Analytics is opened, **Then** all stats are shown with no configuration.
  2. **Given** a role is moved to Hired, **When** analytics are viewed, **Then** time-to-hire is calculated and shown.

  ---

  ### User Story 15 — Team Collaboration & Multi-Seat (Priority: P4 — Phase 4)

  HR manager invites team members by email to join their WiseHire account. Each gets their own login sharing the same pipeline, candidates, and JD library. Notes and scorecards show the author's name.

  **Acceptance Scenarios**:

  1. **Given** an owner invites a team member, **When** accepted, **Then** they share the same pipeline.
  2. **Given** two users are on the same account, **When** one adds a candidate, **Then** the other sees them immediately.
  3. **Given** a team member submits a scorecard, **When** the owner views it, **Then** the submitter's name is shown.

  ---

  ### Edge Cases

  - Job seeker opted into Talent Pool deletes their account → removed from Talent Pool immediately.
  - HR user uploads a non-English resume → AI handles gracefully or shows a clear accuracy warning.
  - HR user's AI credits run out mid-batch screening → batch stops, completed results shown, user prompted to upgrade.
  - Same email tries to create both account types → system routes based on existing type and explains clearly.
  - HR subscription cancelled → candidate data accessible for 30 days for export, then deleted.
  - Waitlist submission with an email that already joined → system acknowledges receipt without creating a duplicate.
  - Admin sends invite link but the recipient already has a job seeker account with that email → system detects conflict and shows a clear message.

  ---

  ## Requirements

  ### Functional Requirements

  **Landing Page**
  - **FR-001**: System MUST display a toggle above the nav with labels "For Job Seekers" and "For Companies."
  - **FR-002**: Default mode MUST be WiseResume (job seeker) view when no URL parameter is present.
  - **FR-003**: Clicking "For Companies" MUST transition the ENTIRE page — colors, headline, typewriter text, demos, feature sections, pricing, and CTAs — to the WiseHire view within 400ms.
  - **FR-004**: URL MUST update to reflect the active mode (e.g. `/?for=companies`) so the link is shareable and bookmarkable.
  - **FR-005**: WiseHire mode MUST use a distinct professional color palette (blue/indigo) separate from WiseResume crimson — implemented via the existing `--lp-*` CSS variable system.
  - **FR-006**: WiseHire landing page MUST include its own "see it in action" animated demo section showing Brief generation, Pipeline, and JD Writer.
  - **FR-007**: During pre-launch, ALL WiseHire CTAs MUST open the waitlist flow — not a sign-up form.

  **Waitlist**
  - **FR-008**: Waitlist form MUST collect: name, email, company name, company size.
  - **FR-009**: On submission, system MUST send a confirmation email to the submitter via Resend.
  - **FR-010**: On submission, system MUST send a notification email to `contact@thewise.cloud` with the submitter's details.
  - **FR-011**: Waitlist submissions MUST be stored in a new `wisehire_waitlist` table in Supabase.
  - **FR-012**: A "Log In" link MUST be visible on the WiseHire landing page for users who already have accounts.

  **Account Type & Identity**
  - **FR-013**: The `profiles` table MUST have an `account_type` column with values `job_seeker` or `hr`.
  - **FR-014**: Account type MUST be set at sign-up and MUST NOT be changeable by the user after creation.
  - **FR-015**: The dev kit user list MUST show an account type badge on every user row.
  - **FR-016**: The dev kit user detail drawer MUST display `account_type` prominently.
  - **FR-017**: The dev kit Overview panel MUST show total HR accounts and total job seeker accounts as separate figures.

  **WiseHire Sign-Up & Onboarding**
  - **FR-018**: HR sign-up MUST collect company name and company size in addition to standard name/email.
  - **FR-019**: After HR sign-up, users MUST be routed to the WiseHire onboarding — not the WiseResume onboarding.
  - **FR-020**: WiseHire onboarding MUST have 5 steps: Welcome, Company Identity, Hiring Context, AI Setup (Starter tier only), Get Started.
  - **FR-021**: Onboarding progress MUST be saved to localStorage and completion MUST be stored in Supabase.
  - **FR-022**: After HR sign-up, users MUST land on the WiseHire dashboard — completely separate from the WiseResume dashboard.
  - **FR-023**: No WiseHire tools, routes, or navigation items MUST be visible to job seeker accounts, and vice versa.

  **Trial, Early Access & Coupons**
  - **FR-024**: New HR accounts MUST automatically receive a 7-day Professional tier trial on account creation.
  - **FR-025**: A trial countdown badge MUST be shown in the WiseHire dashboard throughout the trial period.
  - **FR-026**: The WiseHire subscription page MUST show WiseHire tiers with an "Early Access" badge and no active payment buttons.
  - **FR-027**: The existing coupon system MUST be extended to support WiseHire tiers: `wisehire_starter`, `wisehire_professional`, `wisehire_business`.
  - **FR-028**: Admin MUST be able to create WiseHire tier coupon codes from the dev kit Coupons panel.
  - **FR-029**: HR users MUST be able to redeem coupon codes on the WiseHire subscription page.

  **Dev Kit — WiseHire Admin Tools**
  - **FR-030**: Admin MUST be able to send a "WiseHire Invite" email type from the dev kit email tool — generating a branded invite email with a direct sign-up link.
  - **FR-031**: All admin email actions for WiseHire invites MUST be recorded in the audit log under `admin_email` category.
  - **FR-032**: The WiseHire invite sign-up link MUST bypass the waitlist gate and route directly to the HR sign-up form.

  **AI Features**
  - **FR-033**: Candidate Brief MUST be generated within 30 seconds and MUST include: match score (0–100), 3 strengths, 3 concerns, 8 personalised interview questions, employment pattern note.
  - **FR-034**: Candidate Brief MUST be exportable as PDF and shareable via a public read-only link (no account required to view).
  - **FR-035**: JD Writer MUST produce a full JD from a minimum 2-sentence input within 20 seconds.
  - **FR-036**: All WiseHire AI features MUST use the existing AI provider infrastructure (`_shared/aiClient.ts`).
  - **FR-037**: HR users on Starter tier MUST be prompted to configure their own AI key before using any AI feature.

  **Pipeline**
  - **FR-038**: Pipeline board MUST support drag-and-drop between stages that persists after refresh.
  - **FR-039**: Pipeline stages MUST be: Shortlisted, Contacted, Interviewing, Offer Sent, Hired, Rejected.
  - **FR-040**: Each candidate card MUST link to the full Candidate Brief and any associated scorecards.

  **Bulk & Bias**
  - **FR-041**: Bulk screening MUST support up to 50 simultaneous resume uploads.
  - **FR-042**: Bias Reduction Mode MUST hide: names, photos, university names, graduation years.

  **Talent Pool**
  - **FR-043**: Job seekers MUST have an opt-in toggle in portfolio settings for Talent Pool discoverability, changeable at any time.
  - **FR-044**: Talent Pool view notification MUST be delivered within 60 seconds and MUST NOT reveal company or HR user identity — only date/time.
  - **FR-045**: Deleting a WiseResume account MUST immediately remove the user from the Talent Pool.

  **Data Retention**
  - **FR-046**: All candidate data under an HR account MUST remain accessible for 30 days after subscription cancellation for export purposes, then be permanently deleted.

  **General**
  - **FR-047**: All new WiseHire edge functions MUST include `requireAuth` middleware and `botGuard` protection from `_shared/`.
  - **FR-048**: All database schema changes MUST use `npm run db:push` — no hand-written SQL migrations. Schema lives in `shared/schema.ts`.

  ---

  ### Key Entities

  - **HR Account**: Profile with `account_type = 'hr'`. Has company name, size, subscription tier, WiseHire-specific plan fields. Permanently separate from job seeker accounts.
  - **WiseHire Waitlist Entry**: Stores: name, email, company name, company size, submitted_at. Separate `wisehire_waitlist` table.
  - **Candidate**: Person being evaluated by an HR user. Can be external (PDF upload only) or a linked WiseResume user (via Talent Pool). Has: resume data, briefs, pipeline stage, notes, scorecards.
  - **Role**: Open position. Has: title, JD, pipeline of candidates, open/closed status. Belongs to an HR account.
  - **Candidate Brief**: AI-generated assessment. Has: match score, strengths, concerns, interview questions, employment notes, share token, export state.
  - **Pipeline Stage**: Fixed stage — Shortlisted → Contacted → Interviewing → Offer Sent → Hired / Rejected.
  - **Interview Scorecard**: Post-interview rating. Has: questions, per-question score (1–5) and notes, total score, submitting user, timestamp, share token.
  - **Job Description**: AI-written or edited text saved to HR account's JD library.
  - **Talent Pool Entry**: Opted-in WiseResume job seeker. Visible to HR in search. Triggers notifications on view.
  - **Portfolio View Notification**: In-app alert to job seeker. Contains: timestamp only, no company identity.

  ---

  ## Success Criteria

  - **SC-001**: A new HR user (invited via admin) can sign up, complete onboarding, and generate their first Candidate Brief within 5 minutes.
  - **SC-002**: Candidate Brief generation completes in under 30 seconds for a standard single-page resume.
  - **SC-003**: Bulk screening of 10 resumes completes in under 3 minutes.
  - **SC-004**: Landing page toggle transition completes in under 400ms with no visible layout jump.
  - **SC-005**: Job seeker receives Talent Pool view notification within 60 seconds of an HR user viewing their profile.
  - **SC-006**: Waitlist submission confirmation email arrives within 60 seconds.
  - **SC-007**: Admin receives waitlist notification email within 60 seconds.
  - **SC-008**: Admin can create a WiseHire coupon and send an invite email entirely within the dev kit in under 2 minutes.
  - **SC-009**: Phase 1 MVP is sufficient to onboard and retain the first 10 invited HR users.

  ---

  ## Pricing Model (WiseHire — separate from WiseResume)

  | Tier | Internal Key | Price | Limits | Target |
  |------|-------------|-------|--------|--------|
  | **Starter** | `wisehire_starter` | $49/month | 3 active roles, 30 briefs/month, 1 seat, BYOK required | Founders, solo recruiters |
  | **Professional** | `wisehire_professional` | $149/month | Unlimited roles & briefs, 3 seats, platform AI included | Growing HR teams |
  | **Business** | `wisehire_business` | $399/month | Unlimited everything, 10 seats, analytics, custom-branded reports | HR departments |
  | **Enterprise** | `wisehire_enterprise` | Custom | SSO, API, unlimited seats, dedicated support | Large organisations |

  **Early Access**: No payment gateway active. Billing page shows tiers with "Early Access" badge. Access granted via admin coupon codes or 7-day automatic trial.

  ---

  ## Build Phases

  | Phase | Features | Goal |
  |-------|----------|------|
  | **Phase 1 — Foundation** | Landing toggle + full theme switch, Waitlist, Admin invite flow, Account type split, WiseHire onboarding, Dev kit enhancements, Candidate Brief, JD Writer, Pipeline | First 10 invited HR users |
  | **Phase 2** | Bulk screening, Bias Reduction Mode, Interview Scorecard, Shareable reports | Full screening workflow |
  | **Phase 3** | Talent Pool discovery, Portfolio view notifications, HR Analytics | Network effect & retention |
  | **Phase 4** | Team collaboration, Multi-seat, Enterprise features | B2B scaling |

  ---

  ## Assumptions

  - The existing Kinde auth system is reused. `account_type` is set as a flag on the `profiles` table at sign-up.
  - The existing AI infrastructure (`_shared/aiClient.ts`) is reused for all WiseHire AI features. No new AI providers needed.
  - The existing Supabase database is extended. All schema changes use `npm run db:push`. Schema in `shared/schema.ts`.
  - All new WiseHire edge functions follow the existing pattern: `requireAuth` + `botGuard` from `supabase/functions/_shared/`.
  - The existing coupon system (`discount_codes`, `coupon_redemptions`, `admin-manage-coupons`, `redeem-coupon`) is extended to support WiseHire tier keys.
  - The existing email tool (Resend, `admin-email-actions` edge function, branded templates in `_shared/email-templates/`) is extended with a WiseHire invite email template.
  - Waitlist notification emails are sent to `contact@thewise.cloud` using the existing Resend integration.
  - Mobile support for WiseHire is desktop-first in Phase 1 and 2. Mobile optimisation is Phase 3+.
  - The landing page `--lp-*` CSS variable system and `data-lp-scheme` attribute are extended to support a third mode: `wisehire`.
  - The WiseHire landing page "see it in action" demos are new React components following the existing pattern (`EditorDemo.tsx`, `TailoringDemo.tsx`, etc.).
  - Stripe / payment gateway integration is out of scope for all phases covered by this spec. Early Access model applies throughout.
  - Phase 1 is invite-only and single-seat. Waitlist is the only public-facing entry point.
  - The shareable Candidate Brief link and Scorecard link are public and read-only with no auth required — consistent with how public portfolios work.
  
  ---

  ## Gap Analysis Resolutions (v2 → v3)

  The following gaps were identified during spec analysis against the project constitution, governance files, and existing codebase. Each is resolved below.

  ---

  ### G-001 — WiseHire Brand Approval
  **Gap**: `BRANDING.md` only approves WiseResume, Wise AI, and The Wise Cloud. WiseHire is not listed.
  **Resolution**: As part of this feature, `BRANDING.md` MUST be updated to officially add **WiseHire** as an approved brand name alongside WiseResume. WiseHire's primary color palette (blue/indigo) and any logo guidelines must also be documented there.

  ---

  ### G-002 — Row Level Security (RLS)
  **Gap**: No RLS policies were mentioned for any new WiseHire tables.
  **Resolution**: Every new WiseHire table MUST have explicit RLS policies. The rule is: an HR user can only see their own account's data. No HR user may read another HR user's candidates, roles, briefs, scorecards, or JDs. Waitlist entries are admin-only (no user-facing RLS needed). See FR-049.

  ---

  ### G-003 — Mobile Responsiveness
  **Gap**: The spec said "desktop-first in Phase 1 and 2," which conflicts with PRODUCT.md's "Mobile-first quality is MANDATORY."
  **Resolution**: WiseHire Phase 1 and 2 are explicitly a documented exception to the mobile-first rule. The WiseHire dashboard and tools are desktop-first. Mobile responsive support is a planned future task, deferred to Phase 3. This exception must be recorded in DECISIONS.md as Decision #7. See FR-062.

  ---

  ### G-004 — Post-Trial State
  **Gap**: What happens when the 7-day trial expires with no active coupon?
  **Resolution**: HR users whose trial has expired and who have no active plan are shown a "Contact Us" lockout screen — not a downgraded free tier. WiseHire has no free tier. See FR-063.

  ---

  ### G-005 — Invite Link Bypass Mechanism
  **Gap**: How does the signed invite link bypass the waitlist securely?
  **Resolution**: Admin generates an invite via the dev kit. The system creates a signed token (UUID v4 + HMAC-SHA256 signature using a server-side secret) stored in a new `wisehire_invites` table with: token, recipient email, created_at, used_at, expires_at (72-hour expiry). The sign-up page verifies the token's signature and expiry before bypassing the waitlist gate. See FR-064.

  ---

  ### G-006 — Candidate PDF File Storage
  **Gap**: Where are uploaded candidate resume PDFs stored?
  **Resolution**: A new Supabase Storage bucket `candidate-resumes` is created. Files are stored as `{hr_user_id}/{candidate_id}/{filename}.pdf`. Bucket RLS ensures only the owning HR user can read/write their candidates' files. Files are deleted when a candidate is hard-deleted after the 30-day post-cancellation period. See FR-065.

  ---

  ### G-007 — Soft-Delete Policy for WiseHire Entities
  **Gap**: Decision #5 (soft-delete default) not applied to WiseHire entities.
  **Resolution**: Candidates and Talent Pool entries use `is_deleted = true` soft-delete (consistent with Decision #5). All queries filter `is_deleted = false`. Hard delete of candidate data only occurs after the 30-day post-cancellation period. Talent Pool entries for deleted job seekers are soft-deleted immediately when the job seeker's account is soft-deleted.

  ---

  ### G-008 — AI Rate Limits Per WiseHire Tier
  **Gap**: The existing rate limiter needs per-tier daily limits for WiseHire.
  **Resolution**: WiseHire tier rate limits (brief generation, JD writer, bulk screening) are defined as follows:

  | Tier | Daily Brief Limit | Bulk Batch Max | JD Generations/Day |
  |------|------------------|----------------|--------------------|
  | Starter (wisehire_starter) | 5/day | 10 resumes | 10/day |
  | Professional (wisehire_professional) | 50/day | 50 resumes | Unlimited |
  | Business (wisehire_business) | Unlimited | 50 resumes | Unlimited |

  Monthly caps (Starter: 30 briefs/month) are enforced separately via a monthly usage counter. See FR-066.

  ---

  ### G-009 — Dev Kit Waitlist Management Panel
  **Gap**: Admin had no way to view waitlist entries in the dev kit.
  **Resolution**: The dev kit gains a new "WiseHire Waitlist" panel tab showing all waitlist entries with: name, email, company, size, submitted_at, and an "Invite" action button that triggers the invite email flow directly. See FR-067.

  ---

  ### G-010 — PDF Parsing (Reuse Existing)
  **Gap**: Spec didn't clarify whether to reuse the existing `parse-resume` edge function.
  **Resolution**: The existing `parse-resume` edge function (with its two-pass AI extraction, OCR fallback, and local regex parser) IS reused for WiseHire candidate PDF processing. No new parser is built. The parsed text is passed to the Brief Generator edge function.

  ---

  ### G-011 — BYOK for WiseHire (Scope)
  **Gap**: BYOK is currently per-user. WiseHire is company-level in Phase 4 (multi-seat).
  **Resolution**: In Phase 1 (single-seat), WiseHire BYOK uses the existing `user_api_keys` table — stored per HR user, identical to job seeker BYOK. In Phase 4 (multi-seat), BYOK will need to be elevated to company-level (shared across team members). This is a Phase 4 concern, flagged here for forward compatibility.

  ---

  ### G-012 — Share Token (Expiry & Revocation)
  **Gap**: Brief and scorecard share tokens had no expiry or revocation spec.
  **Resolution**: Share tokens are UUID v4 stored in the `candidate_briefs` and `interview_scorecards` tables as `share_token`. Links do NOT expire by default (the HR user may need to share them weeks later). The HR user CAN revoke a link by regenerating the token — the old link immediately becomes invalid. See FR-068.

  ---

  ### G-013 — WiseHire Routing Structure
  **Gap**: No routing structure defined for WiseHire.
  **Resolution**: WiseHire uses a dedicated route prefix. All WiseHire routes are protected and require `account_type = 'hr'`. Job seeker routes remain unchanged.

  | Route | Page |
  |-------|------|
  | `/wisehire/dashboard` | WiseHire main dashboard |
  | `/wisehire/brief` | Candidate Brief generator |
  | `/wisehire/brief/:id` | View saved brief |
  | `/wisehire/jd-writer` | Job Description writer |
  | `/wisehire/pipeline` | Candidate pipeline board |
  | `/wisehire/subscription` | WiseHire plan management |
  | `/wisehire/settings` | WiseHire account & AI settings |
  | `/wisehire/onboarding` | WiseHire onboarding flow |
  | `/share/brief/:token` | Public read-only brief (no auth) |
  | `/share/scorecard/:token` | Public read-only scorecard (no auth) |

  Phase 2+ routes: `/wisehire/bulk-screen`, `/wisehire/analytics`
  Phase 3+ routes: `/wisehire/talent-pool`

  ---

  ### G-014 — Accessibility
  **Gap**: Accessibility not mentioned despite PRODUCT.md making it mandatory.
  **Resolution**: All WiseHire UI components MUST meet WCAG AA. Specific requirements: drag-and-drop pipeline must have keyboard alternative for stage movement; all form inputs must have visible labels; color contrast must pass AA in both WiseHire blue theme and system dark/light modes. See FR-069.

  ---

  ### G-015 — Loading States & Skeletons
  **Gap**: PRODUCT.md mandates no blank screens; spec had no loading state requirements.
  **Resolution**: All WiseHire data views (pipeline board, brief viewer, JD library, dashboard stats) MUST use matching skeleton components during data fetching. No blank screens permitted. See FR-070.

  ---

  ### G-016 — Fail-Closed Rate Limiting
  **Gap**: Decision #6 (fail-closed) not explicitly applied to WiseHire AI endpoints.
  **Resolution**: All WiseHire AI edge functions (wisehire-generate-brief, wisehire-write-jd, wisehire-bulk-screen) MUST fail-closed. If the rate limiter database is unreachable, requests are blocked — not passed through. This is consistent with Decision #6.

  ---

  ### G-017 — SkyWallpaper in WiseHire Dashboard
  **Gap**: BRANDING.md mandates SkyWallpaper as global background; WiseHire dashboard not addressed.
  **Resolution**: The WiseHire dashboard uses the existing `AppShell` component with `SkyWallpaper`. No custom background override. All WiseHire page content sits at `z-10` or higher, consistent with the global branding rule.

  ---

  ### G-018 — Meta Tags for WiseHire Landing Mode
  **Gap**: Shared WiseHire landing URL shows WiseResume meta tags.
  **Resolution**: When the page is in WiseHire mode (`/?for=companies`), the document `<title>` and `<meta name="description">` update dynamically to reflect WiseHire. Open Graph tags also update so shared links on LinkedIn and WhatsApp preview correctly. See FR-071.

  ---

  ### G-019 — PRODUCT.md Dual Audience Update
  **Gap**: PRODUCT.md defines target audience as job seekers only.
  **Resolution**: `PRODUCT.md` MUST be updated as part of this feature to reflect the dual-audience platform: WiseResume for job seekers (existing) and WiseHire for HR professionals (new). The update is a governance task, not a code task.

  ---

  ### G-020 — DECISIONS.md New Entry
  **Gap**: No ADR for the WiseHire account type split architectural decision.
  **Resolution**: A new Decision #7 entry must be added to `DECISIONS.md` documenting the choice to build WiseHire as a same-codebase, same-platform expansion with permanent account type separation — rather than a separate subdomain or repository. Rationale: shared infrastructure (AI, auth, storage, admin tools), cost efficiency, unified billing future.

  ---

  ## Additional Functional Requirements (Gap Resolutions)

  - **FR-049**: Every new WiseHire Supabase table MUST have RLS policies ensuring HR users can only access their own account's data.
  - **FR-050**: Waitlist bypass MUST use HMAC-SHA256 signed URL tokens with 72-hour expiry, stored in a new `wisehire_invites` table.
  - **FR-051**: Candidate resume PDFs MUST be stored in a Supabase Storage bucket `candidate-resumes` with RLS limiting access to the owning HR user.
  - **FR-052**: All WiseHire AI edge functions MUST fail-closed when the rate limiter database is unreachable.
  - **FR-053**: All WiseHire UI components MUST meet WCAG AA accessibility standards. The pipeline board MUST have a keyboard-accessible alternative to drag-and-drop.
  - **FR-054**: All WiseHire data views MUST use skeleton loading states. No blank screens during data fetching.
  - **FR-055**: WiseHire dashboard MUST use the existing `AppShell` and `SkyWallpaper` — no custom background overrides.
  - **FR-056**: WiseHire landing mode MUST update document title, meta description, and Open Graph tags dynamically.
  - **FR-057**: HR users with an expired trial and no active plan MUST see a "Contact Us" lockout screen — there is no free tier for WiseHire.
  - **FR-058**: All authenticated WiseHire routes MUST use the `/wisehire/` prefix and MUST redirect job seeker accounts away with a clear message.
  - **FR-059**: Dev kit MUST include a WiseHire Waitlist panel showing all entries with an inline "Invite" action.
  - **FR-060**: Candidates and Talent Pool entries MUST use `is_deleted = true` soft-delete (consistent with Decision #5). Hard deletes occur only after the 30-day post-cancellation window.
  - **FR-061**: WiseHire tier rate limits MUST be enforced: Starter 5 briefs/day + 30/month cap, Professional 50/day, Business unlimited.
  - **FR-062**: WiseHire Phase 1 and 2 are explicitly desktop-first. Mobile responsive support is deferred to Phase 3 and must be tracked as a future task.
  - **FR-063**: Post-trial lockout MUST show a "Contact Us" screen — no free tier, no partial access.
  - **FR-064**: The existing `parse-resume` edge function MUST be reused for WiseHire candidate PDF processing.
  - **FR-065**: Brief and scorecard share tokens MUST be UUID v4, stored on the entity record, revocable by HR user (regenerating invalidates the old link), with no automatic expiry.
  - **FR-066**: WiseHire brief generation MUST reuse the existing `aiClient.ts` and BYOK system via the `user_api_keys` table.

  ---

  ## Governance Updates Required (Non-Code Tasks)

  The following governance documents MUST be updated as part of this feature or as a parallel task before implementation begins:

  1. **`BRANDING.md`**: Add WiseHire as an approved brand name. Define WiseHire primary color (blue/indigo), usage rules, and relationship to the WiseResume brand.
  2. **`PRODUCT.md`**: Update target audience section to reflect dual-audience platform (WiseResume for job seekers + WiseHire for HR). Add WiseHire product scope.
  3. **`DECISIONS.md`**: Add Decision #7 — WiseHire same-codebase expansion with permanent account type split.
  4. **`ARCHITECTURE.md`**: Document all 77+ edge functions, all tables, all storage buckets, WiseHire routing structure, and the new tables being added.
  5. **`CONSTITUTION.md`**: Update to reflect WiseHire as a second product under the same governance umbrella. Add WiseHire-specific governance rules.
  6. **`CHANGELOG.md`**: All governance file updates must be recorded here per the changelog discipline rule.

  ---

  ## Spec Status

  **Version**: 3 (Final — all gaps resolved)
  **Date**: 2026-04-15
  **Status**: Ready for plan phase pending user approval
  