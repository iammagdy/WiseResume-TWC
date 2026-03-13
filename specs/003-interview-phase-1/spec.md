# Feature Specification: Phase 1 - Critical Interview Bug Fixes

**Feature Branch**: `003-interview-phase-1`
**Created**: 2026-03-13
**Status**: Draft

## Feature Goal
The goal of Phase 1 is to resolve two critical blocking bugs in the WiseResume Interview feature.
1. The `analyzeRole` functionality crashes due to a `ReferenceError`.
2. The AI interview chat function (`callAI`) exhibits stale state behavior regarding credit usage.

## In-Scope
- Fixing the `ReferenceError` crash when a user clicks "Research Company" in Job-Targeted mode (Issue 1).
- Ensuring the `callAI` function always correctly reads and increments user credits without using stale functions (Issue 2).

## Out-of-Scope
- Fixing Medium and Low priority issues (Issues 3-9).
- Any UI/UX redesigns or layout changes.
- Adding new features to the interview flow.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run Role Analysis without crashing (Priority: P1)

Users targeting specific jobs need Wise AI to analyze the job description to tailor the interview. This action must succeed without a server crash.

**Why this priority**: It is currently completely broken and blocks a core feature of the Job-Targeted interview mode.

**Independent Test**: Can be fully tested by pasting a job description and clicking "Research Company".

**Acceptance Scenarios**:

1. **Given** the user is on the Interview Setup screen in Job-Targeted mode, **When** the user pastes a job description and clicks "Research Company", **Then** the `analyzeRole` path in the edge function executes successfully using the decoded `userId` and returns the analysis without throwing a `ReferenceError`.

---

### User Story 2 - Accurate Credit Tracking during Interview (Priority: P1)

Users participating in an AI mock interview must have their AICredits accurately checked and decremented for every single interaction.

**Why this priority**: Failing to check credits allows users to bypass limits, or alternatively, prevents users with valid credits from continuing their interview.

**Independent Test**: Can be fully tested by launching an interview and ensuring credits decrement correctly in the database after each AI response.

**Acceptance Scenarios**:

1. **Given** an ongoing mock interview, **When** the user provides an answer and `callAI` is triggered, **Then** the hook uses the most up-to-date `checkCredits` and `incrementUsage` functions to accurately process the transaction.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The `interview-chat` edge function MUST use the decoded `userId` from the `requireAuth` middleware for all `callAIWithRetry` and `recordUsage` invocations (Issue 1).
- **FR-002**: No `ReferenceError` MUST occur in the edge function due to `user.id` being undefined.
- **FR-003**: The `useVoiceInterview` hook MUST include `checkCredits` and `incrementUsage` in the dependency array of the `callAI` `useCallback` (Issue 2).
- **FR-004**: The `callAI` function MUST respect the latest credit checking and usage incrementing logic during the entire interview session.

### Key Entities

- **Interview Session (`callAI`)**: The frontend logic that drives the conversation and relies on accurate credit counts.
- **`interview-chat` Edge Function**: The backend endpoint that handles the prompt generation, validation, and analytics tracking (`recordUsage`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of "Research Company" requests execute without a `ReferenceError` crash.
- **SC-002**: 100% of AI interview responses accurately trigger the latest `checkCredits` and `incrementUsage` functions.
- **SC-003**: All existing related tests (`src/hooks/__tests__/useAICredits.test.tsx` and `src/components/interview/__tests__/InterviewSetup.test.tsx`) continue to pass.
- **SC-004**: No new UI elements or layout changes are introduced.

## Testing Expectations

The following existing test files are relevant and should continue to pass:
- `src/hooks/__tests__/useAICredits.test.tsx`
- `src/components/interview/__tests__/InterviewSetup.test.tsx`

*Note: Additional tests MAY be added later to cover `analyzeRole` not throwing on "Research Company", and `callAI` always using current credit functions.*
