# Feature Specification: Phase 3 - Low Priority Interview Fixes

**Feature Branch**: `005-interview-phase-3`
**Created**: 2026-03-13
**Status**: Draft

## Feature Goal
The goal of Phase 3 is to polish the UX and refine configuration limits for the WiseResume Interview feature. This involves fixing hardcoded placeholder text, adjusting backend rate limits to accommodate normal interview sessions, and tweaking the STT timeout to better suit mobile users.

## In-Scope (Issues 7-9)
- **Issue 7**: Passing a meaningful `jobTitle` to `QuestionBankSheet` in `InterviewSetup.tsx` instead of a static "Target Role".
- **Issue 8**: Increasing the rate limit in `supabase/functions/interview-chat/index.ts` so a standard 15-20 minute interview doesn't prematurely block users.
- **Issue 9**: Reducing `NO_SPEECH_TIMEOUT_MS` in `useVoiceInterview.ts` to provide faster feedback on mobile when the user hasn't started speaking.

## Out-of-Scope
- Issues 1-2 (Phase 1, Critical) which are already handled.
- Issues 3-6 (Phase 2, Medium) which are already handled.
- Any new features or major layout redesigns.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Contextual Question Bank (Priority: P3)
When users generate a question bank in Job-Targeted mode, the title should reflect the actual role they are applying for based on the provided job description, rather than always saying "Target Role".

**Why this priority**: It's a minor Polish / UI detail that enhances realism but doesn't block functionality.
**Independent Test**: Paste a job description for a "Software Engineer" role and open the Question Bank. The sheet's title or context should reflect the specific role, not a generic string.
**Acceptance Scenarios**:
1. **Given** a user has pasted a job description, **When** they open the Question Bank, **Then** the interface utilizes a contextually derived or user-specified job title (or falls back safely if parsing isn't yet complete).

### User Story 2 - Uninterrupted Interview Sessions (Priority: P3)
Users conducting a full, 20-minute mock interview (which might generate 40-50 chat messages back and forth) should not hit a restrictive "Rate limit exceeded" error.

**Why this priority**: While the rate limit protects the system, the current threshold cuts off genuine, intended usage.
**Independent Test**: Simulate 50 back-and-forth messages in a single mock interview. The Edge Function should process all 50 without returning a 429 status code, provided they are spread across a normal mock interview cadence.
**Acceptance Scenarios**:
1. **Given** a user is conducting a protracted mock interview, **When** they submit their 40th answer, **Then** the Edge Function processes the request successfully without rate-limiting them, while still protecting against massive abuse (e.g., 200 requests/minute).

### User Story 3 - Responsive Voice Prompts on Mobile (Priority: P3)
When a user launches a voice interview but takes a long time to start speaking, the app should gently nudge them sooner rather than later, making the app feel responsive.

**Why this priority**: 15 seconds feels like an eternity on mobile; users might assume the app froze or the microphone isn't working.
**Independent Test**: Start the interview, stay completely silent, and verify the first "I'm still listening" nudge appears in about 8-10 seconds instead of 15.
**Acceptance Scenarios**:
1. **Given** the STT engine is actively listening, **When** the user remains completely silent, **Then** the `NO_SPEECH_TIMEOUT_MS` triggers its first escalation (nudge) significantly faster (e.g., 8-10s) than the previous 15s limit.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `InterviewSetup.tsx` MUST derive or provide a meaningful string for `jobTitle` when rendering `QuestionBankSheet`, falling back to `undefined` or a safe generic if no JD is present (Issue 7).
- **FR-002**: `supabase/functions/interview-chat/index.ts` MUST configure `checkRateLimit` to allow enough requests for a standard 15-20 minute mock interview (Issue 8).
- **FR-003**: `useVoiceInterview.ts` MUST redefine the `NO_SPEECH_TIMEOUT_MS` constant from `15000` to a lower, more responsive value (e.g. `8000` or `10000`) (Issue 9).

### Key Entities

- **Question Bank Context**: UI property bindings for contextual framing.
- **Backend Rate Limiter Config**: The connection threshold governing the Edge Function usage.
- **STT Silence Timers**: The `setTimeout` duration governing the silence/nudge loop.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of generated question banks from JDs display an appropriate title, or gracefully handle missing data.
- **SC-002**: A user can manually invoke the mock interview endpoint up to ~50-60 times within an hour without hitting the rate limiter.
- **SC-003**: The mobile nudge triggers in under 10 seconds of silence.
- **SC-004**: All existing unit tests pass without modification required.

## Testing Expectations

The following testing logic should apply:
- The behavior is best validated via Manual/End-to-End browser testing to verify the actual feel of the timeline and titles.
- Existing unit suites (`npm run test`) must continue to pass untouched.
