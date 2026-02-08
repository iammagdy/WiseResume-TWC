

# Project Documentation for AI Brainstorming

I'll create a comprehensive markdown file that describes WiseResume - a mobile-first AI-powered resume builder application. This document will be suitable for sharing with another AI for brainstorming new features and improvements.

## Document Structure

The markdown file will cover:

1. **Project Overview** - What the app is and its core value proposition
2. **Technology Stack** - All frameworks, libraries, and services used
3. **Application Architecture** - How the app is structured
4. **Core Features** - Detailed breakdown of every feature
5. **AI Capabilities** - All AI-powered features and edge functions
6. **Data Models** - Key types and data structures
7. **User Flows** - Main user journeys through the app
8. **Current State & Known Issues** - What works well and what needs improvement
9. **Future Enhancement Ideas** - Potential areas for expansion

## File Details

**File to create:** `docs/PROJECT_OVERVIEW.md`

The document will be comprehensive (~2000+ words) covering:

### 1. App Identity
- **Name:** WiseResume
- **Tagline:** AI-powered resume builder with interview coaching
- **Target Platform:** Mobile-first PWA with Capacitor for native apps

### 2. Tech Stack Details
- Frontend: React 18, Vite, TypeScript, Tailwind CSS
- State: Zustand with persistence
- UI: Radix UI primitives, shadcn/ui components
- Animations: Framer Motion
- Backend: Supabase (via Lovable Cloud)
- AI: Lovable AI Gateway (Gemini, GPT models)
- Voice: ElevenLabs Scribe for speech-to-text, Web Speech API for TTS
- PDF: html2canvas + pdf-lib

### 3. Feature Documentation
Each feature will be documented with:
- What it does
- How it works technically
- Key files involved
- Edge functions if applicable

### 4. Complete Feature List
1. **Resume Management** - Create, edit, duplicate, delete resumes
2. **Resume Editor** - Contact, summary, experience, education, skills sections
3. **12 Resume Templates** - Modern, Classic, Minimal, Professional, Developer, Creative, Executive, Compact, Academic, Healthcare, Sales, Elegant
4. **PDF Upload & Parsing** - PDF, Word, Image support with OCR fallback
5. **AI Resume Analysis** - Job match scoring and gap analysis
6. **AI Tailoring** - Rewrite resume for specific jobs with section-by-section comparison
7. **Cover Letter Generation** - AI-generated cover letters with tone options
8. **Recruiter Simulation** - Get feedback from 4 different recruiter personas
9. **Mock Interview Mode** - Voice-based AI interview practice with STAR-method scoring
10. **Multi-Job Comparison** - Compare resume fit across multiple jobs
11. **PDF Export** - High-quality PDF generation with page break control
12. **User Authentication** - Email/password auth with email verification
13. **Cloud Sync** - Automatic cloud backup for authenticated users
14. **Biometric Lock** - Fingerprint/Face ID protection (Capacitor)
15. **Onboarding Flow** - First-time user tutorial carousel
16. **Settings** - Theme, PDF defaults, privacy controls, integrations

### 5. Edge Functions Documentation
All 11 edge functions will be documented:
- `analyze-resume` - Job match scoring
- `enhance-section` - Improve a specific section
- `generate-cover-letter` - Create cover letters
- `generate-headshot` - AI headshot generation
- `interview-chat` - Mock interview conversations
- `parse-job-url` - Extract job details from URLs
- `parse-linkedin` - Import from LinkedIn
- `parse-resume` - AI-powered resume parsing
- `recruiter-simulation` - Persona-based feedback
- `tailor-resume` - Full resume optimization
- `elevenlabs-scribe-token` - Voice transcription tokens

This comprehensive document will enable another AI to understand the full scope of the project and provide meaningful suggestions for improvements or new features.

