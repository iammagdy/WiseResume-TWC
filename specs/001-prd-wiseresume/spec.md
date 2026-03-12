# Feature Specification: WiseResume Product Definition

**Feature Branch**: `001-prd-wiseresume`  
**Created**: 2026-03-12  
**Status**: Active / Source of Truth for Current Product  
**Input**: User description: "Create a comprehensive PRD-style feature specification for the existing WiseResume application."

## 1. Product Overview
**WiseResume** is an AI-powered, resume-first career platform designed to help job seekers, students, career switchers, and high-volume applicants land their next opportunity. It is a core application within **The Wise Cloud** ecosystem and is powered by **Wise AI**.

The core value proposition of WiseResume is providing an all-in-one career toolkit. It replaces fragmented workflows by offering a resume builder with 30 professional templates, AI-driven job tailoring, automated ATS scoring, cover letter generation, voice-assisted mock interviews, portfolio hosting, and a centralized job application tracker—all featuring a cohesive, modern, polished design.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create a New Resume (Priority: P1)

A user signs up and completes onboarding. They enter the Editor to generate a resume from scratch using the step-by-step wizard. They use Wise AI to enhance their bullet points and export an ATS-compliant PDF.

**Why this priority**: Building a resume is the primary value proposition of the platform.

**Independent Test**: Can be fully tested by a new user signing up, filling out standard details in the editor, clicking "Enhance with AI", and successfully downloading a formatted PDF.

**Acceptance Scenarios**:
1. **Given** a new user account, **When** they click "Create Resume", **Then** the Editor wizard loads.
2. **Given** the user is in the Experience section, **When** they click "Enhance with AI" on a bullet point, **Then** AI rewrites the bullet professionally.
3. **Given** a completed resume in the editor, **When** the user clicks "Download", **Then** a high-quality PDF matches their chosen template.

---

### User Story 2 - Upload and Edit Existing Resume (Priority: P1)

A user with an existing resume uploads their PDF. The system extracts their information so they don't have to retype it. They save the parsed data and apply a new design template.

**Why this priority**: Greatly lowers the barrier to entry and time-to-value for existing professionals.

**Independent Test**: Can be tested by uploading a standard PDF resume and verifying that the parsed output populates the Editor correctly.

**Acceptance Scenarios**:
1. **Given** the user is on the dashboard, **When** they upload a PDF resume, **Then** the parsing screen displays a loader and eventually shows extracted structured data.
2. **Given** parsed data is presented, **When** the user clicks "Save to Editor", **Then** the Editor opens with all prior experience pre-filled.

---

### User Story 3 - AI Job Tailoring (Priority: P2)

A user pastes a job description into the Tailor tool. The AI analyzes their current resume against the job description, provides an ATS Match Score, and suggests keyword optimizations.

**Why this priority**: Solves the problem of high-volume applicants needing targeted variations of their resume to pass ATS filters.

**Independent Test**: Can be tested by pasting a target job description and observing the dynamic ATS score update and keyword suggestions.

**Acceptance Scenarios**:
1. **Given** an active resume and a pasted job description, **When** the user clicks "Tailor", **Then** the system calculates an ATS match score.
2. **Given** the Tailored view, **When** the user reviews AI suggestions, **Then** they can accept or reject specific changes to their document.

---

### User Story 4 - Voice-Assisted Mock Interviews (Priority: P2)

A user preparing for an interview uses the AI Studio mock interview tool. They speak to the AI via microphone, receiving dynamic questions based on their resume, and receive a performance grade afterward.

**Why this priority**: Extends the platform from just document creation to full career preparation, leveraging unique AI voice capabilities.

**Independent Test**: Can be tested by initiating an interview session, speaking into the microphone, and receiving appropriate synthesized voice responses and a final grade.

**Acceptance Scenarios**:
1. **Given** the Mock Interview tool, **When** the user enables microphone access and speaks, **Then** the AI transcribes the audio and responds contextually.
2. **Given** the end of an interview session, **When** the user clicks "Finish", **Then** they receive a scorecard grading their strengths and weaknesses.

---

### User Story 5 - Job Application Tracking (Priority: P3)

A user logs a new job application in the Kanban board. They move it from "Applied" to "Interviewing", add personal notes, and view their application metrics.

**Why this priority**: Keeps the user engaged with the platform post-resume-creation as their daily career hub.

**Independent Test**: Can be tested by adding a job, dragging it across kanban columns, and seeing the analytics dashboard update.

**Acceptance Scenarios**:
1. **Given** the Applications board, **When** the user clicks "Add Job", **Then** a modal appears to input job details.
2. **Given** an existing job card, **When** it is dragged to a new column, **Then** the database status updates instantly.

### Edge Cases
- What happens when a user runs out of daily AI credits? (Prompted to use BYOK or wait 24hrs. Subscription upsells are Out Of Scope).
- How does the system handle an unreadable resume upload? (Fails gracefully, advising the user to type manually).
- What happens when BYOK (Bring Your Own Key) is invalid? (Displays a clear validation error without crashing the app).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST authenticate users exclusively via Kinde.
- **FR-002**: System MUST utilize Supabase exclusively for backend database and edge functions, enforcing Row-Level Security (RLS) so users only access their own data.
- **FR-003**: System MUST provide a Resume Editor with at least 30 customizable templates.
- **FR-004**: System MUST allow users to export resumes in PDF format.
- **FR-005**: System MUST parse uploaded resumes (PDF, DOCX, Img) into structured data.
- **FR-006**: System MUST track daily AI credits for users.
- **FR-007**: System MUST offer a BYOK (Bring Your Own Key) configuration for Gemini/ElevenLabs, storing keys securely.
- **FR-008**: System MUST provide a Kanban board for tracking job applications.
- **FR-009**: System MUST allow users to claim a `/p/username` public portfolio URL.
- **FR-010**: System MUST NOT include any legacy branding (e.g., Lovable, Bolt, WiseUniverse). Allowed branding only includes "WiseResume", "Wise AI", and "The Wise Cloud".

### Key Entities 

- **User Profile**: Core user data linked to Kinde Auth ID. Contains AI credit balance, BYOK keys (encrypted), and preferences.
- **Resume**: A structured document entity containing sections (Experience, Education, etc.), selected template ID, and content blocks.
- **Job Application**: A record of a job applied to, related to a User Profile, containing status (Applied, Interviewing, Rejected, Offered), company name, role, and notes.
- **Portfolio**: A public-facing entity wrapping a specific Resume version with dedicated theme settings and a custom URL slug.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can successfully register via Kinde and reach the dashboard in under 1 minute.
- **SC-002**: Users can generate a complete PDF resume from scratch using AI in under 10 minutes.
- **SC-003**: Existing resumes (standard PDF format) parse with at least 80% accuracy of textual content.
- **SC-004**: Application loads eagerly (mobile-first PWA) with First Contentful Paint (FCP) under 1.5 seconds.
- **SC-005**: 100% of API endpoints enforcing user-specific data access via Supabase RLS.
