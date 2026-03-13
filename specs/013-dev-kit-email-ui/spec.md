# Feature Specification: Dev Kit & UI Readability Improvements

**Feature Branch**: `013-dev-kit-email-ui`  
**Created**: 2026-03-13  
**Status**: Draft  
**Input**: User description: "Dev Kit / Developer Tools reliability, Email tools (Report Bug, Request Feature, Contact Us), UI readability for Settings and public pages"

## Clarifications

### Session 2026-03-13

- Q: How does the system handle an email submittal attempt from an unauthenticated user?  
  → A: Allow unauthenticated submissions but require an explicit email address input field for replies.

- Q: How should we protect these unauthenticated email endpoints from being abused by bots?  
  → A: Implement strict IP-based rate limiting in the edge function (e.g., max 3 emails per IP per hour).

- Q: What should the limit and pagination behavior be for the Usage Events Dev Kit test?  
  → A: Hardcode a small limit (e.g., N=10) with no pagination; it purely proves the read pathway is healthy.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reliable Dev Kit Testing (Priority: P1)

As a developer or administrator ("Vibe Coder"), I want to use the Dev Kit to test features like AI connections and Usage Events so that I can genuinely verify if the production application is healthy and working correctly.

**Why this priority**: If Dev Kit tests are unreliable (showing "Success" for broken features), they provide false confidence and make debugging impossible from a mobile phone.

**Independent Test**: Can be fully tested by opening the Dev Kit, running an AI test or usage event query, and verifying that it hits the real backend flow and returns the real backend response.

**Acceptance Scenarios**:

1. **Given** a feature is fully operational, **When** I run its test in the Dev Kit, **Then** it shows a "Success" result and the underlying UI feature works.
2. **Given** a feature is broken (e.g. edge function returns 500), **When** I run its test in the Dev Kit, **Then** it turns red and displays the first error message to help me debug.

---

### User Story 2 - Working Outbound Email Tools (Priority: P1)

As a user, I want to use the "Report Bug", "Request Feature", and "Contact Us" tools so that I can communicate with the necessary product admins directly from the application.

**Why this priority**: Broken contact mechanisms prevent users from reporting critical issues or providing feedback, hindering continuous product improvement.

**Independent Test**: Can be independently tested by filling out the Contact Us form and verifying that the backend uses `RESEND_API_KEY` to send an email and returns a success confirmation.

**Acceptance Scenarios**:

1. **Given** valid input, **When** I submit a bug report or contact request, **Then** the app sends the email via the edge function using Resend and confirms success.
2. **Given** an invalid "from" address or unverified domain in Resend, **When** the email fails to send, **Then** the backend returns a clear error code.
3. **Given** I am in the Dev Kit, **When** I run the "Email tools health check", **Then** it runs all three tests and accurately reports passes/fails.

---

### User Story 3 - Settings and Public Page UI Readability (Priority: P2)

As a user, I want the Settings screen and public pages to be easy to read in both Light and Dark themes, with section headers clearly placed inside readable containers rather than blending into the animated cloud background.

**Why this priority**: Poor readability makes the app look unprofessional and makes reading terms or configuring settings difficult for the user.

**Independent Test**: Can be fully tested by opening the Settings page in both Light and Dark modes and visually confirming the section headers are legible and grouped within translucent cards.

**Acceptance Scenarios**:

1. **Given** the app is in Light theme, **When** I open the Privacy & Security settings, **Then** the text over the cloud background uses darker, high-contrast colors.
2. **Given** the app is in Dark theme, **When** I open a public page like "About", **Then** the text uses lighter, high-contrast colors.
3. **Given** I open any Settings section, **When** I look at the section header, **Then** it is visually contained inside the same translucent card as its settings, not floating directly over the cloud background.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Dev Kit Tests (FR-DK)

- **FR-DK-001**  
  Each Dev Kit test MUST call the same endpoints and auth flows as the real UI feature (no separate “demo” paths).

- **FR-DK-002**  
  A Dev Kit test MUST be marked “Success” only if the HTTP response status is 2xx, the JSON payload has no `error` field, and any required fields for that feature are present.

- **FR-DK-003**  
  The system MUST include specific Dev Kit tests for Bug report, Feature request, and Contact Us email endpoints.

- **FR-DK-004**  
  The Usage Events Dev Kit test MUST actually read from the real `usage_events` table (or correct equivalent), hardcoded to a small limit (e.g., N=10) with no pagination to act purely as a fast health check.

- **FR-DK-005**  
  The Dev Kit MUST surface the first error message from the backend/Resend instead of hiding it on failure.

- **FR-DK-006 (Dev Kit Sections)**  
  The Dev Kit UI MUST group tests into clear, logical sections (for example: “Core Smoke”, “AI & Backend”, “Email Tools”, “Usage & Storage”, “UI & Theme Readability”). Each section MUST have a clear title and short description so that a developer can quickly understand what is being tested.

- **FR-DK-007 (Collapsible Sections, Mobile-first)**  
  Each Dev Kit section SHOULD be implemented as a collapsible panel. Non-critical sections (for example “Usage & Storage”, “UI & Theme Readability”) MUST be collapsed by default, especially on mobile viewports, to keep the interface compact and reduce scrolling.

- **FR-DK-008 (Run All Smoke Action)**  
  The Dev Kit MUST expose a single “Run All Smoke” action. This action MUST execute a minimal set of critical health checks in one click, including at least:
  - an AI backend test (simple completion or ping),
  - the Email tools health check (Bug Report, Feature Request, Contact Us),
  - the Usage Events health check (reading last N=10 events),
  - and a basic auth/storage connectivity check (for example Supabase or equivalent).  
  The Dev Kit MUST present a consolidated summary indicating overall PASS/FAIL and which specific checks failed.

- **FR-DK-009 (Raw JSON Response Visibility)**  
  For each Dev Kit test run, the raw JSON response from the backend MUST be available directly in the Dev Kit UI. The result panel for each test MUST include an expandable “View raw JSON” area so that developers can inspect the exact payload (status, error fields, metadata) when debugging issues.

- **FR-DK-010 (No Demo or Mock Data)**  
  Dev Kit tests MUST NOT use mock or demo data sources. All Dev Kit checks MUST call the same real endpoints, authentication flows, and databases that the production UI features use for the current environment, so that a failing production dependency always results in a failing Dev Kit test instead of a false positive.

- **FR-DK-011 (Error Surfacing in Smoke Summary)**  
  When any smoke test fails (including via “Run All Smoke”), the Dev Kit MUST surface the first meaningful error message from the backend (for example “Missing API Key”, “Invalid Domain”, “Auth token expired”) in the summary so that a developer can immediately see why the check failed without digging into logs.

#### Email Tools (FR-EM)

- **FR-EM-001**  
  Bug Report, Feature Request, and Contact Us forms MUST call a backend/edge endpoint that uses `RESEND_API_KEY`.

- **FR-EM-002**  
  On success, the API MUST confirm that the email was accepted (e.g. Resend returns 200/202) and MUST return clear success JSON.

- **FR-EM-003**  
  On failure, the API MUST return a clear error code (e.g. domain not verified, invalid “from” address) suitable for the Dev Kit.

- **FR-EM-004**  
  The Dev Kit MUST include an "Email tools health check" that runs all three contact methods and shows which ones pass/fail.

- **FR-EM-005**  
  The email edge function MUST implement IP-based rate limiting (e.g., maximum 3 submissions per IP per hour) to prevent abuse.

#### UI Readability & Sections (FR-UI)

- **FR-UI-001**  
  For Settings sections, the section header and description MUST live inside the same translucent card/sheet container, avoiding floating text over the cloud background.

- **FR-UI-002**  
  The application MUST enforce theme-aware text colors over cloud backgrounds: darker, high-contrast colors in Light theme, and lighter, high-contrast colors in Dark theme.

- **FR-UI-003**  
  All major public pages MUST ensure text stays comfortably readable without "washed out" headers against the cloud animation.

- **FR-UI-004**  
  The Dev Kit MUST include a “UI Readability Check” entry documenting how to manually verify one example Settings section and one public page in both themes.

---

### Responsive & Mobile-friendly Requirements (FR-RWD)

- **FR-RWD-001 (Responsive Layout Across Viewports)**  
  All application pages, including the Dev Kit, MUST use a responsive layout that adapts to common smartphone widths (≤480px), tablet widths (≈768px), and desktop widths without requiring horizontal scrolling in normal usage.

- **FR-RWD-002 (Single-column Dev Kit on Mobile)**  
  On smartphone-sized viewports, the Dev Kit layout MUST collapse into a single-column layout. Test cards and sections MUST stack vertically, and wide tables or code blocks MUST be horizontally scrollable within their own containers instead of forcing the entire page to scroll sideways.

- **FR-RWD-003 (Touch-friendly Controls)**  
  Interactive elements (buttons, toggles, list items) on all pages, including Dev Kit test entries, MUST be touch-friendly on mobile. Controls MUST have adequate spacing and hit area so that users can reliably tap the intended action with a finger.

- **FR-RWD-004 (Text Legibility on Small Screens)**  
  All text content (labels, descriptions, results, JSON previews) MUST remain legible on small screens without requiring pinch-zoom. Font sizes, line heights, and contrast MUST be tuned so that test names and statuses are easy to read on a typical smartphone.

- **FR-RWD-005 (Responsive Verification Process)**  
  As part of the QA process, the app MUST be manually verified in Chrome DevTools (or equivalent) device emulation for at least:
  - one iPhone-sized viewport,
  - one common Android phone viewport,
  - and one tablet viewport.  
  The reviewer MUST confirm that the main flows (Authentication, Dashboard, Dev Kit, Settings, and public pages) render correctly and remain usable without layout breakage or hidden actions on these viewports.

---

## Edge Cases

- What happens when the Resend API is temporarily unavailable?  
  → Handled by surfacing the actual API error in the Dev Kit without crashing the app.

- How does the system handle an email submittal attempt from an unauthenticated user?  
  → Unauthenticated submissions are permitted, but the UI MUST require the user to input an explicit return email address so support can reply.

- How does the system protect unauthenticated endpoints from spam/abuse?  
  → The email edge function MUST implement IP-based rate limiting (e.g., maximum 3 submissions per IP per hour) to prevent quota exhaustion.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**  
  100% of Dev Kit test outcomes match the actual health of the corresponding production endpoints (no false positives).

- **SC-002**  
  Bug Report, Feature Request, and Contact Us submissions result in a delivered email verifiable within Resend's delivery logs.

- **SC-003**  
  Dev Kit surfaces the exact error message from backend services (e.g. "Missing API Key", "Invalid Domain") when an email fails to send.

- **SC-004**  
  Manual visual review confirms 100% of Settings section headers are contained within translucent cards and meet WCAG AA contrast ratios against their immediate backgrounds in both Light and Dark themes.

- **SC-005**  
  Manual responsive review MUST confirm that 100% of core flows (including the Dev Kit) are usable on smartphone and tablet viewports, with no blocking layout issues, no overlapping controls, and no unreadable text.

---

## Assumptions & Dependencies

- It is assumed `RESEND_API_KEY` is already present or will be provided correctly to the backend.
- Modifying the Settings UI containers to enclose headers will not fundamentally break the existing navigation or page structure.
- Public page themes share enough layout taxonomy to allow a unified fix for cloud background contrast issues.
