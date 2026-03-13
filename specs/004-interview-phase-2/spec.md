# Feature Specification: Phase 2 - Medium Priority Interview Fixes

**Feature Branch**: `004-interview-phase-2`
**Created**: 2026-03-13
**Status**: Draft

## Feature Goal
The goal of Phase 2 is to improve the stability and performance of the WiseResume Interview feature by resolving four medium-priority issues. This includes eliminating memory leaks, preventing duplicate AI requests, handling browser API unavailability gracefully, and ensuring robust fallback parsing.

## In-Scope (Issues 3-6)
- **Issue 3**: Adding a `typeof window !== 'undefined'` guard for `localStorage` access in `InterviewSetup.tsx` state initializers.
- **Issue 4**: Managing the `AudioContext` lifecycle in `useVoiceInterview.ts` to prevent global memory leaks during repeated interview sessions.
- **Issue 5**: Providing a meaningful default `tip` and `improvedAnswer` when `parseScoreBlock` uses its non-JSON fallback path in `useVoiceInterview.ts`.
- **Issue 6**: Preventing duplicate submissions when a text message is manually submitted while a Speech-to-Text (STT) silence timer is active in `useVoiceInterview.ts`.

## Out-of-Scope
- Issues 1-2 (Phase 1, Critical) which are already handled in a previous phase.
- Issues 7-9 (Phase 3, Low Priority).
- Any UI/layout redesigns or changes.
- Creation of new interview features.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - App Stability on Non-Browser Environments (Priority: P1)
Users accessing or rendering the app in an environment without the `window` object (such as during SSR or in certain Capacitor contexts) must not experience a crash when the `InterviewSetup` component mounts.

**Why this priority**: Crashing on load prevents app usage entirely in specific environments, which breaks the initial onboarding or page rendering.
**Independent Test**: Load the app in an environment where `localStorage` is unavailable and verify it renders without a ReferenceError.
**Acceptance Scenarios**:
1. **Given** the app is rendering in an environment without the `window` object, **When** `InterviewSetup` initializes state, **Then** it safely falls back to defaults instead of throwing.

### User Story 2 - Memory Stability Across Sessions (Priority: P2)
Users who start, end, and restart multiple mock interviews should not experience degraded performance or browser warnings due to excessive `AudioContext` allocations.

**Why this priority**: Repeated use could easily hit browser hardware limits (usually ~6 concurrent AudioContexts).
**Independent Test**: Open the interview page, start and stop the interview 10 times, and verify via DevTools that `AudioContext` instances are being collected and closed.
**Acceptance Scenarios**:
1. **Given** an active interview session, **When** the session is ended or the component unmounts, **Then** the associated `AudioContext` is properly closed or safely managed without leaking.

### User Story 3 - Guaranteed Feedback Formatting (Priority: P2)
Users receiving feedback for their answers should always see a tip and an improved answer, even if the AI model fails to output perfect JSON.

**Why this priority**: "Empty tip" scenarios make the feedback UI look broken.
**Independent Test**: Simulate an AI response with a malformed score block and verify the UI displays a generic fallback tip and improved answer.
**Acceptance Scenarios**:
1. **Given** the AI responds with a score block that cannot be parsed as JSON, **When** `parseScoreBlock` falls back to regex, **Then** it returns the matched score along with a generic placeholder `tip` and `improvedAnswer`.

### User Story 4 - Single Submission per Turn (Priority: P2)
Users who use voice input but then manually type and click "Send" before the voice silence timer triggers should only send one message to the AI.

**Why this priority**: Sending duplicate messages wastes AI credits, causes race conditions in the UI, and results in confusing double replies from the coach.
**Independent Test**: Speak into the microphone, then immediately type a word and click send within 1 second. Verify only one message appears in the chat log.
**Acceptance Scenarios**:
1. **Given** the user is speaking (STT is active), **When** they manually submit a text message, **Then** the STT silence timer is canceled or ignored, and only one message is sent to the backend.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `useState` initializers in `InterviewSetup.tsx` MUST check `typeof window !== 'undefined'` prior to calling `localStorage.getItem` (Issue 3).
- **FR-002**: `useVoiceInterview.ts` MUST clean up the global `sharedAudioContext` object or properly scope it lifecycle-wise to prevent memory leaks across re-mounts (Issue 4).
- **FR-003**: `parseScoreBlock` in `useVoiceInterview.ts` MUST return meaningful string defaults (e.g., "Keep practicing to improve this answer.") for `tip` and `improvedAnswer` when the JSON parsed block fails (Issue 5).
- **FR-004**: The `handleCommittedTranscript` or message submission flow in `useVoiceInterview.ts` MUST include a state flag/guard that prevents the STT module from triggering a message send if the user has just manually submitted a text message (Issue 6).

### Key Entities

- **Interview Configuration**: Safe persistence handling.
- **Audio Resources (`AudioContext`)**: Hardware-limited browser resources requiring deterministic lifecycle management.
- **Message Pipeline**: The state tracking the current user input mode (voice vs text) to prevent collisions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The application renders successfully in SSR/non-browser contexts without `localStorage` errors.
- **SC-002**: Repeatedly mounting and unmounting the interview component 10+ times does not trigger browser `AudioContext` allocation limits.
- **SC-003**: 100% of fallback regex parses in `parseScoreBlock` produce a non-empty `tip` and `improvedAnswer`.
- **SC-004**: Zero duplicate AI messages occur when quickly alternating between STT and text submission.

## Testing Expectations

The following existing test files are relevant:
- `src/hooks/__tests__/useVoiceInterview.test.tsx` (if it exists)
- `src/components/interview/__tests__/InterviewSetup.test.tsx`
- General `npm run test` suite.

*Note: Additional tests MAY be added later to specifically verify: No crash without window, No duplicate messages on mixed input, and AudioContext lifecycle cleanup.*
