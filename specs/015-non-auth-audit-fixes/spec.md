# Feature Specification: Non-Authentication Audit Fixes

**Feature Branch**: `015-non-auth-audit-fixes`  
**Created**: 2026-03-15  
**Status**: Draft  
**Input**: User description: "Audit Report: Non-Authentication Issues"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Resolve Critical Logic & Data Bugs (Priority: P1)

As a system operator and end-user, I need the core tracking, portfolio, and RPC functionalities to be free of silent crashes, race conditions, and data leaks so that the application is secure and stable.

**Why this priority**: These issues cause immediate runtime failures (null pointers), compromise data integrity (race conditions on click counts), and breach data privacy (soft-deleted portfolios remaining public).

**Independent Test**: Can be tested by invoking the `ask-portfolio` and `track-portfolio-view` edge functions under various states (null resumes, missing usernames) and verifying SQL atomic increments under load. Public portfolio RPC can be tested by attempting to fetch a soft-deleted user.

**Acceptance Scenarios**:

1. **Given** a portfolio request where nested resume data is missing, **When** the `ask-portfolio` edge function executes, **Then** it handles the null gracefully instead of crashing.
2. **Given** multiple concurrent clicks on a short link, **When** `track-portfolio-view` executes, **Then** the click count increments accurately without race conditions using atomic SQL updates.
3. **Given** a soft-deleted user account, **When** `get_public_portfolio` is called for that username, **Then** the system returns a not-found state rather than exposing the deleted data.

---

### User Story 2 - Improve Database Schema, Performance, and Security (Priority: P2)

As a database administrator, I need properly indexed tables, robust constraints, and secure RLS policies so that the application scales safely and prevents unauthorized access to messages.

**Why this priority**: Missing indexes cause full table scans which will degrade performance at scale. Hardcoded admin emails bypass proper role-based access control.

**Independent Test**: Can be tested by inspecting query execution plans for `ai_usage_logs`, verifying `INSERT` constraints on the `messages` table, and verifying RLS blocks requests from non-admin authenticated users.

**Acceptance Scenarios**:

1. **Given** a high volume of AI requests, **When** the rate limiter queries `ai_usage_logs`, **Then** the database utilizes a composite index for fast lookups rather than a table scan.
2. **Given** a query to the `messages` table, **When** RLS evaluates the request, **Then** access is granted based on a secure role or claim check rather than a hardcoded email string.
3. **Given** an incomplete contact inquiry, **When** a record is inserted into `messages`, **Then** the database rejects it if `full_name`, `subject`, or `status` are null.

---

### User Story 3 - Stabilize React State and Frontend Resource Management (Priority: P3)

As a user navigating the frontend, I need smooth UI updates without phantom timers, stale data, or redundant network calls so that the application feels responsive and reliable.

**Why this priority**: Stale closures, memory leaks from uncleaned event listeners/timers, and out-of-sync caching states degrade the user experience over long sessions.

**Independent Test**: Can be tested by disconnecting/reconnecting network to observe toast behavior, navigating away from the interview page early to ensure mic timers stop, and updating a resume to verify instant UI sync.

**Acceptance Scenarios**:

1. **Given** a rapid series of network disconnects and reconnects, **When** `useNetworkStatus` triggers, **Then** pending timers are cleared to prevent multiple overlapping "back online" toasts.
2. **Given** a resume update action, **When** the React Query cache is invalidated, **Then** the local Zustand store synchronizes immediately to show the fresh data.
3. **Given** the user typing in the resume editor, **When** `useVoiceInterview` re-evaluates, **Then** the `analyzeRole` callback does not cause cascading re-renders across consumers.

---

### User Story 4 - Fix Business Logic & UX Gaps (Priority: P3)

As an interview candidate, I need accurate feedback tracking and validation errors to guide my actions so that I don't lose data or get stuck.

**Why this priority**: The current quick practice mode runs indefinitely instead of stopping at 5 questions, session saves silently fail, and AI score parsing is overly fragile.

**Independent Test**: Run a quick practice interview to ensure it ends at 5 questions. Force a network error during session saving to verify error toasts.

**Acceptance Scenarios**:

1. **Given** a Quick Practice interview, **When** the user answers the 5th question, **Then** the interview automatically concludes as advertised limit.
2. **Given** a failed network connection during interview completion, **When** the session attempts to save, **Then** a user-friendly error toast is displayed.
3. **Given** a taken username in the portfolio editor, **When** the field validates, **Then** a localized, clear error message appears on the input field itself.

### Edge Cases

- What happens when a user rapid-fires the AI test endpoint? Rate limits must engage properly across all AI pathways.
- How does the system handle database outages during rate limiting? The system must have a documented fail-open or fail-closed strategy that aligns across `rateLimiter` and `creditUtils`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST handle null pointer checks securely on `profile` and `resume` fields within `ask-portfolio`.
- **FR-002**: System MUST increment click_count via atomic database operations in `track-portfolio-view`.
- **FR-003**: System MUST verify `profileRow` exists before inserting notifications in `track-portfolio-view`.
- **FR-004**: System MUST filter by `is_deleted = false` when retrieving the public portfolio RPC.
- **FR-005**: System MUST utilize composite indexes on `ai_usage_logs` and `portfolio_visits`, and standard indexes on `profiles`.
- **FR-006**: System MUST enforce consistent soft vs. hard delete cascade policies and document intentional hard-deletions if any.
- **FR-007**: System MUST validate RLS across `messages` using roles/claims instead of a hardcoded email literal.
- **FR-008**: System MUST apply `NOT NULL` constraints to critical messaging columns.
- **FR-009**: System MUST base chat rate limiting on actual edge-function chat requests, not merely portfolio page views.
- **FR-010**: System MUST apply explicit rate limiting to `ai-health` and `ai-test` endpoints.
- **FR-011**: System MUST memoize callbacks with primitive dependencies in `useVoiceInterview` to prevent render thrashing.
- **FR-012**: System MUST synchronize external state managers (Zustand) with server state (React Query) upon successful resume mutations.
- **FR-013**: System MUST properly unmount and clear timers in `InterviewSetup`, `useNetworkStatus`, `useEditorAutosave`, and `useWebSpeechFallback`.
- **FR-014**: System MUST strictly terminate the quick practice mode loop after 5 inputs.
- **FR-015**: System MUST implement UI-level error `.catch()` toast notifications on `saveSession.mutate()`.
- **FR-016**: System MUST instruct standard structured JSON outputs for AI grading to eliminate unstable regex score extraction.

### Key Entities

- **ai_usage_logs**: Requires indexing for rate limiting lookups.
- **portfolio_visits**: Requires indexing for reporting and analytics lookups.
- **messages**: Requires data constraint hardening and RLS improvements.
- **profiles & resumes**: Soft delete mechanisms require full enforcement in public facing views.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 0% occurrence of null pointer exceptions in `ask-portfolio` telemetry after deployment.
- **SC-002**: 100% of the active database queries listed in the audit hit utilizing indexes rather than performing sequential table scans.
- **SC-003**: 100% of unmounted React components correctly clear their associated `setTimeout` and `requestAnimationFrame` loops.
- **SC-004**: Quick practice interview sessions enforce a strict boundary terminating exactly after the 5th candidate answer.
- **SC-005**: Rate limiters successfully intercept repetitive abusive requests across `ai-health`, `ai-test`, and chat functions independent of page views.
