# Feature Specification: [FEATURE NAME]

**Feature Branch**: `[###-feature-name]`  
**Created**: [DATE]  
**Status**: Draft  
**Input**: User description: "$ARGUMENTS"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Real-time Portfolio Updates (Priority: P1)

As a user, when I update my CV or portfolio settings, I want my public portfolio to reflect those changes immediately so that potential recruiters see the most up-to-date version of my profile.

**Why this priority**: Correctness of data is paramount for a professional portfolio tool. Stale data undermines user trust and professional image.

**Independent Test**: Can be tested by modification of CV data in the editor, saving, and verifying the change on the public URL within 30 seconds.

**Acceptance Scenarios**:

1. **Given** a user has a published portfolio, **When** they update their "Experience" in the CV editor and save, **Then** the public portfolio page shows the new experience item after a manual refresh.
2. **Given** a user has changed their theme in the Portfolio Editor, **When** they save changes, **Then** the public portfolio page renders with the new theme immediately upon refresh.

---

### User Story 2 - Robust Public Presence (Priority: P1)

As a visitor, I want to see a reliable and professional-looking portfolio even if some non-essential metadata is missing or corrupted, so that I can still view the candidate's core resume data.

**Why this priority**: A crash on the public page is a catastrophic failure. The system must degrade gracefully.

**Independent Test**: Simulate missing `portfolioExtras` fields in the database and verify the page still renders core sections (Hero, Education, Experience).

**Acceptance Scenarios**:

1. **Given** a portfolio row with a `null` or empty `portfolioExtras` field, **When** a visitor navigates to the public URL, **Then** the page renders successfully using safe defaults for sections like "Testimonials" and "Case Studies".
2. **Given** a malformed JSONB structure in `portfolioExtras`, **When** the page loads, **Then** the system does not throw a JavaScript error and displays all valid sections.

---

### User Story 3 - Smooth Editor Onboarding (Priority: P2)

As a user, when I open the Portfolio Editor, I want to see a loading indicator or skeleton so that I know the application is working and not frozen on a blank screen.

**Why this priority**: Prevents perceived performance issues and accidental page refreshes during data hydration.

**Independent Test**: Use network throttling (Slow 3G) and verify that a `PortfolioEditorSkeleton` is displayed instead of a white screen.

**Acceptance Scenarios**:

1. **Given** the app is fetching the user's profile and resumes, **When** the user navigates to `/portfolio/editor`, **Then** the skeleton UI is displayed until the data is ready.

---

### User Story 4 - Accurate AI Content Generation (Priority: P2)

As a user, when I generate a professional bio using the AI tool, I want it to be based on the specific resume I have chosen for my portfolio, so that the summary is contextually accurate.

**Why this priority**: Prevents misleading or incorrect professional summaries being generated from irrelevant documents.

**Independent Test**: Create two resumes with different job titles, select the second one for the portfolio, and verify the AI-generated bio reflects the second resume's content.

**Acceptance Scenarios**:

1. **Given** a user with multiple resumes, **When** they trigger "Generate Bio", **Then** the content is derived from the resume ID stored in the portfolio settings, not just the first resume in the list.

---

### Edge Cases

- **No Resumes Found**: How does the AI bio generator handle a user with 0 resumes? (Should show an error or prompt to create one).
- **Network Failure during Save**: If the cache invalidation fails but the save succeeds, how do we inform the user?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST reduce the React Query `staleTime` for public portfolio data to 30 seconds.
- **FR-002**: The system MUST explicitly invalidate the `public-portfolio` query cache whenever a user successfully saves portfolio settings.
- **FR-003**: The data fetching hook MUST provide safe default empty arrays for all experimental fields in `portfolioExtras`.
- **FR-004**: The `PortfolioEditorPage` MUST render `PortfolioEditorSkeleton` while `loading` is true or profile data is unhydrated.
- **FR-005**: AI Bio generation MUST verify that resume data is fully loaded and matches the target `portfolioResumeId` before proceeding.

### Key Entities

- **Profile**: Contains basic user info, `portfolioEnabled`, `theme`, and `portfolioExtras`.
- **Resume**: The source data for experience, skills, and education rendered in the portfolio.
- **PortfolioExtras**: A JSONB field containing extended data like testimonials, case studies, and services.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of public portfolio loads succeed even if `portfolioExtras` is missing.
- **SC-002**: Public portfolio updates appear within 30 seconds of a save operation.
- **SC-003**: ZERO blank-screen flashes observed during Portfolio Editor mount on Slow 3G connections.
- **SC-004**: AI generated bios match the keywords of the linked resume in 100% of successful generations.
