# Tasks: Dev Kit & UI Readability Improvements

**Input**: Design documents from `/specs/013-dev-kit-email-ui/`
**Prerequisites**: plan.md, spec.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure
*(No shared foundational setup is strictly required for this specific feature as it extends existing infrastructure.)*

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented
*(No blocking prerequisites for this specific feature. We proceed directly to user stories.)*

---

## Phase 3: User Story 1 - Reliable Dev Kit Testing (Priority: P1) 🎯 MVP

**Goal**: Dev Kit tests like AI connections and Usage Events are reliable, actually hitting real backend flows, with properly grouped sections and a "Run All Smoke" action.

**Independent Test**: Can be fully tested by opening the Dev Kit, running an AI test or usage event query, and verifying that it hits the real backend flow and returns the real backend response.

### Implementation for User Story 1

- [ ] T002 [P] [US1] Upgrade Usage Events Endpoint in `supabase/functions/usage-events/index.ts` (or equivalent endpoint) to hardcode N=10 and read from the real `usage_events` table.
- [ ] T003 [P] [US1] Enforce Dev Kit Endpoint Strictness across Dev Kit backend handlers (e.g., removing any "demo" mock data pathways) in `supabase/functions/` handlers.
- [ ] T004 [P] [US1] Restructure Dev Kit UI Sections into logical, collapsible groups in `src/components/dev-kit/DevKitRunner.tsx` (or equivalent Dev Kit UI file).
- [ ] T005 [US1] Update Dev Kit Test Validation Logic to strictly validate 2xx status, lack of `error` fields, and surface raw JSON and errors in `src/components/dev-kit/`. (Depends on T004)
- [ ] T007 [US1] Implement "Run All Smoke" Action to execute AI, Email, Usage, and Auth baseline concurrently in `src/components/dev-kit/`. (Depends on T005)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Working Outbound Email Tools (Priority: P1)

**Goal**: "Report Bug", "Request Feature", and "Contact Us" tools communicate with admins using `RESEND_API_KEY` and are protected by rate limiting.

**Independent Test**: Can be independently tested by filling out the Contact Us form and verifying that the backend uses `RESEND_API_KEY` to send an email and returns a success confirmation.

### Implementation for User Story 2

- [ ] T001 [P] [US2] Implement Email Edge Function for Bug Reports, Feature Requests, and Contact Us in `supabase/functions/send-contact-email/index.ts` with IP-based rate limiting.
- [ ] T006 [US2] Integrate Email Tools Health Check into the Dev Kit UI in `src/components/dev-kit/`. (Depends on T001)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Settings and Public Page UI Readability (Priority: P2)

**Goal**: The Settings screen and public pages are easy to read in both Light and Dark themes, with section headers cleanly placed inside readable containers.

**Independent Test**: Can be fully tested by opening the Settings page in both Light and Dark modes and visually confirming the section headers are legible and grouped within translucent cards.

### Implementation for User Story 3

- [ ] T008 [P] [US3] Wrap section headers and descriptions inside translucent cards in `src/components/settings/` (e.g., `PrivacySecuritySettings.tsx`, `AppearanceSettings.tsx`).
- [ ] T009 [P] [US3] Apply theme contrast text adjustments to Settings and public pages in `src/` component files to ensure dark text on Light theme and light text on Dark theme over the cloud background.
- [ ] T010 [P] [US3] Implement RWD Layout Fixes to clean up horizontal scrolling and container padding across smartphone sizes for Dev Kit and Settings pages in `src/`.

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T011 [P] Perform comprehensive manual review on mobile viewports to confirm FR-RWD requirements.
- [ ] T012 [P] Clean up any obsolete dev mock data files removed after strictness enforcement.

---

## Dependencies & Execution Order

### User Story Dependencies

- **User Story 1 (P1)**: Can start immediately.
- **User Story 2 (P1)**: Can start immediately. Integrates Email tools health check into the shared Dev Kit UI.
- **User Story 3 (P2)**: Can start immediately. Primarily touches frontend UI presentation.

### Parallel Opportunities

- The Edge Function updates (T001, T002, T003) can be performed entirely in parallel with the Dev Kit styling and Settings card wrapping (T004, T008, T009, T010).
- User Story 1 and User Story 2 can be developed simultaneously.
- Within User Story 3, T008, T009, and T010 touch independent layout areas and can run in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 & 2 Core)

1. Enforce Edge function strictness and build the `send-contact-email` function (T001, T003).
2. Upgrade the Usage Events endpoint (T002).
3. Overhaul the Dev Kit validation and layout (T004, T005, T006, T007).
4. **STOP and VALIDATE**: Test Dev Kit functionality and outbound emails.

### Incremental UI Delivery (User Story 3)

5. Update Settings section cards for readability (T008).
6. Adjust application-wide text contrast on public pages (T009) and perform RWD mobile cleanup (T010). 
7. Final responsive QA.
