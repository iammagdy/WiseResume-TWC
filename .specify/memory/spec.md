# Feature Specification: WiseResume Product Definition
**Feature Branch**: `[prd-wiseresume]`  
**Status**: Active / Source of Truth for Current Product 

## 1. Product Overview
**WiseResume** is an AI-powered, resume-first career platform designed to help job seekers, students, career switchers, and high-volume applicants land their next opportunity. It is a core application within **The Wise Cloud** ecosystem and is powered by **Wise AI**.

The core value proposition of WiseResume is providing an all-in-one career toolkit. It replaces fragmented workflows by offering a resume builder with 30 professional templates, AI-driven job tailoring, automated ATS scoring, cover letter generation, voice-assisted mock interviews, portfolio hosting, and a centralized job application tracker—all featuring a cohesive, modern, polished design.

## 2. Target Users & Personas
- **Job Seekers (General):** Need to quickly create, update, and manage multiple versions of a professional resume to apply for various roles. Pain point: Formatting resumes for different jobs takes too much manual effort.
- **Students & Fresh Graduates:** Need guidance on what to include with limited experience, looking to lean on AI for content suggestions and gap explanations. Pain point: Blank page syndrome and lack of industry knowledge.
- **Career Switchers:** Need to translate their existing skills into a new industry context. Pain point: Unsure how to frame their past experiences to appeal to recruiters in a new domain.
- **High-Volume Applicants:** Keep track of dozens of applications and need to rapidly tailor their resume to specific job descriptions to beat Applicant Tracking Systems (ATS). Pain point: Disorganization and resume rejection without human review.

## 3. Core User Journeys
1. **Onboarding and Profile Setup:**
   A user signs up (via email, magic link, or OAuth) and completes a 4-step wizard setting up their basic profile (Career level, industry, target job) before exploring the dashboard.
2. **Creating a New Resume from Scratch:**
   The user enters the Editor, sequentially visiting sections (Contact, Summary, Experience, etc.) with a live "Stepper" and progress bar. They rely on "Wise AI" tools to enhance bullet points or generate summaries from scratch.
3. **Importing and Improving an Existing Resume:**
   A user uploads a PDF, DOCX, or image of their current resume. The document is parsed (via tesseract OCR/pdfjs/docx parsers), the user reviews the imported data, and saves it to the Editor to begin improving its content and template.
4. **Tailoring a Resume to a Specific Job:**
   From the Editor or Dashboard, users paste a job description. The AI targets specific keywords, restructures content, and presents a before/after ATS score before the user commits the changes.
5. **Using AI Studio Tools:**
   Users navigate to the "AI Studio" hub to access tools utilizing their daily AI credits or Custom "Bring Your Own Key" (BYOK) setup. They can generate cover letters, resignation letters, take a career assessment quiz, or prepare for interviews.
6. **Tracking Job Applications and Interviews:**
   Within the "Activity/Applications" area, users manage a kanban/list of jobs (Applied, Interviewing, Offered, Rejected). They log notes, set deadlines, and track their application streak.
7. **Managing Portfolio and Public Profile:**
   Users toggle their public portfolio on, claim a `/p/username` link, select a distinct theme (separate from their resume template), sync their resume data, and track visitor analytics.
8. **Managing Account, Settings, and Security:**
   Users access Settings to adjust dark/light mode, manage their Kinde authentication credentials, view AI credit usage, configure their BYOK setup (e.g. Gemini/ElevenLabs keys), configure biometric lock features, and manage notification preferences.

## 4. Feature Breakdown

### Resume & Editor
- **What it does:** A comprehensive multi-step resume builder with real-time visual preview capabilities. Supports 13+ standard and custom sections.
- **Why it exists:** Provides non-technical users a foolproof way to generate beautifully formatted, ATS-compliant PDFs without battling word processors.
- **Key Behaviors:**
  - 30 customizable templates, adjustable fonts, colors, and layout configurations.
  - "Undo/Redo" history with snapshot versioning.
  - Generates PDFs, DOCX, plain text, and ATS-optimized raw exports.

### Upload & Parsing
- **What it does:** Extracts structured resume data from uploaded PDFs, Word docs, Images, and LinkedIn profiles.
- **Why it exists:** Lowers the barrier to entry, so users don't have to manually type out their entire work history to use the platform.
- **Key Behaviors:** File dropzone, parsing progress indicator, user review and correction step before finalizing the import.

### AI Studio & AI Tools 
- **What it does:** A centralized hub providing 18+ varied career tools powered by Wise AI.
- **Why it exists:** Delivers the primary "AI" value of the platform, automating the hardest parts of job hunting (writing and analyzing).
- **Key Behaviors:** Track daily AI credits, ATS Resume Scanning and Scoring, Job Tailoring, Section Enhancement, Cover Letter/Resignation Letter generation, and Agentic "Ask AI" Career Chat.

### Applications & Job Tracking
- **What it does:** Serves as a lightweight CRM for a user's job hunt.
- **Why it exists:** Keeps high-volume applicants organized and motivated through tracking metrics and streaks.
- **Key Behaviors:** Add jobs, update pipeline status (Applied → Interviewing → Offered), view analytics (response rate, activity streak).

### Interview & Voice Features
- **What it does:** Provides dynamic mock interview simulations utilizing voice APIs (ElevenLabs/Web Speech).
- **Why it exists:** Helps users practice behavioral and technical questions in a low-pressure environment before the real thing.
- **Key Behaviors:** Chat UI with voice recording controls, continuous audio transcriptions, and post-interview grading (strengths, weaknesses, communication score).

### Portfolio & Public Profile
- **What it does:** Exposes a customized public landing page (`/p/username`) based on a user's resume data.
- **Why it exists:** Provides users an easy way to establish a professional web presence to link in their emails and LinkedIn profiles.
- **Key Behaviors:** Claim custom URL, modify themes independently from resumes, generate QR codes, create tracking short-links, and view basic traffic analytics.

### Settings, Security & Preferences
- **What it does:** Manages user configuration, including app themes, AI providers, and PWA security features.
- **Why it exists:** Empowers users to customize their experience and control data privacy elements (like Biometric locks).
- **Key Behaviors:** Dark/Light/System theme toggle, BYOK (Bring Your Own Key) setup for advanced users, data export, account deletion, and biometric lock enablement.

## 5. Non-Functional Requirements
- **Performance:** Ensure mobile-first, responsive layouts capable of running as a fast Progressive Web App (PWA). App must be eager-loaded for initial paints, utilizing Skeletons during data fetching to eliminate blank screens.
- **Reliability & Offline:** The application implements local-first capabilities with offline detection and action queuing to ensure work is not lost during sync disruptions.
- **Security & Privacy:** 
  - Kinde is used strictly for authentication.
  - Supabase utilizes Row-Level Security (RLS) to ensure users can only ever query/mutate their own information.
  - Secure, encrypted handling of "Bring Your Own Key" (BYOK) inputs.
  - Public routes must expose only intentionally shared data (e.g., specific Portfolio URLs).
- **Accessibility:** Must comply with basic usability standards, maintain high readability with appropriate color contrast (no raw hex codes, strict HSL tokens), and offer clear form labeling.

## 6. Constraints & Governance
- **Branding Limits:** "WiseResume", "Wise AI", and "The Wise Cloud" are the ONLY approved brands. No legacy placeholders or Vibe-coding platform references (Lovable, Bolt, etc.) are permitted.
- **Architecture Limits:** 
  - **Auth:** Strict adherence to Kinde for all authentication needs. 
  - **Backend:** Supabase is reserved exclusively for the database, edge functions, and storage. Supabase Auth is expressly prohibited.
- **Deployment:** Targets automated Hostinger deployments. The repository enforces strict git sync and pull behaviors, avoiding manual overrides.
- **Agent Governance:** No feature decisions are to be taken without proposing trade-offs in simple language, as the owner is non-technical. Do not guess routes or database structures; inspect prior to modifying.

## 7. Out-of-Scope for Current Version
The following items, despite appearing in legacy or historical documentation (`legacy-docs/`), are explicitly excluded from the current product scope:
- Use of Supabase Auth (or any auth other than Kinde).
- Branding under the moniker "WiseUniverse" or any associated old branding sets.
- Monetization/Stripe integration, Subscription paywalls, and Referral rewards systems (as they lack backend implementation and are blocked per `PROGRESS_TILL_NOW.md`).
- Experimental backend systems not integrated cleanly into the verified Supabase schema.
