# Feature Specification: Theme-Level Code Splitting

**Feature Branch**: `011-theme-code-splitting`
**Created**: 2026-03-13
**Status**: Draft
**Input**: User description: "Implement theme-level code splitting in PublicSections to reduce initial JS payload by dynamically loading theme-specific portfolio section renderers on demand"

## Feature Goal

Reduce the initial JavaScript bundle size for visitors loading a public portfolio by splitting the `PublicSections` component's rendering logic on a per-theme basis. Currently, all theme-specific styling and layout logic is loaded in a single monolithic `PublicSections.tsx` file — even though a visitor only ever sees one theme. This feature makes the system load only the rendering code needed for the active theme.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Faster Initial Load for Visitors (Priority: P1)

As a public portfolio visitor, I want the portfolio page to start displaying content faster so that I can see the candidate's profile without waiting for theme-specific code I'll never use to download.

**Why this priority**: Public portfolios are marketing tools for WiseResume users — slow load times negatively impact the professional impression made on recruiters, which is the core value proposition.

**Independent Test**: Can be verified by performing a build analysis (bundle size inspection) and comparing the initial chunk size of `PublicPortfolioPage` before and after the change. A reduction in initial payload is the success signal.

**Acceptance Scenarios**:

1. **Given** a visitor navigating to a portfolio using the "Minimal" theme, **When** the page loads, **Then** only the "Minimal" theme rendering code is downloaded initially — other theme renderers are not included in the initial payload.
2. **Given** a visitor navigating to a portfolio using the "Glass Pro" theme, **When** the page loads, **Then** only the "Glass Pro" theme rendering code is downloaded — "Minimal" and all other themes are excluded from the initial payload.

---

### User Story 2 - Clean Developer Experience (Priority: P2)

As a developer, I want each theme's rendering logic to live in its own dedicated file so that adding or modifying a theme does not require editing a large, complex monolithic component.

**Why this priority**: Maintainability directly affects development velocity and reduces the risk of one theme change accidentally breaking another.

**Independent Test**: Can be verified by inspecting the file structure and confirming each supported theme has a dedicated, self-contained rendering component file.

**Acceptance Scenarios**:

1. **Given** the refactored codebase, **When** a developer needs to change how the "Neon Cyber" theme displays the Skills section, **Then** they only need to edit the "Neon Cyber" specific component file, not a shared monolith.
2. **Given** a new theme is being added, **When** a developer creates the new theme's rendering file, **Then** it is automatically available as a dynamically loadable option without modifying the core loading logic.

---

### User Story 3 - No Regression in Portfolio Rendering (Priority: P1)

As a portfolio owner, I want my public portfolio to look and behave exactly as it did before the refactoring, so that a technical infrastructure change has no visible impact on my professional profile.

**Why this priority**: A refactoring that changes visual output or causes runtime errors is worse than no refactoring at all.

**Independent Test**: Can be verified by loading a public portfolio in each supported theme before and after the change and performing a visual comparison to confirm identical rendering.

**Acceptance Scenarios**:

1. **Given** any supported theme, **When** the public portfolio is loaded after code splitting is applied, **Then** all expected sections (Hero, Experience, Skills, Education, Projects) render identically to the pre-split version.
2. **Given** a slow network connection, **When** a visitor loads the portfolio, **Then** a loading skeleton is displayed while the theme chunk downloads, and the final render is correct once loaded.

---

### Edge Cases

- What happens if a visitor's network drops between the initial page load and the theme-specific chunk download?
- How does the system handle an unsupported or unknown theme ID that has no corresponding split bundle?
- What occurs if a theme's dedicated bundle fails to load after multiple retries?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The `PublicSections` component MUST be refactored to dynamically load theme-specific rendering sub-components on demand rather than bundling all themes together.
- **FR-002**: Each supported portfolio theme MUST have a dedicated self-contained rendering component that encapsulates its layout and styling logic for all portfolio sections.
- **FR-003**: The dynamic loading mechanism MUST display a loading skeleton or placeholder while the theme-specific bundle is being fetched.
- **FR-004**: Portfolios MUST continue to render correctly for all existing supported themes after the refactoring — zero visual regressions are acceptable.
- **FR-005**: An unknown or unsupported theme ID MUST gracefully fall back to a default theme renderer rather than throwing an error.
- **FR-006**: The initial JS payload for the public portfolio page MUST be measurably smaller after this change compared to the current monolithic approach.

### Key Entities

- **Theme Renderer**: A self-contained component responsible for rendering all portfolio sections using a specific theme's layout and styling rules.
- **PublicSections**: The orchestrating component that selects and dynamically loads the correct Theme Renderer based on the active portfolio theme.
- **Theme ID**: The identifier stored in the user's portfolio settings that determines which Theme Renderer to load.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The initial JavaScript chunk size for the public portfolio page decreases by at least 30% compared to the pre-split baseline, as measured by the production build output.
- **SC-002**: 100% of existing portfolio themes render without visual regression (verified by loading each theme before and after the change).
- **SC-003**: A visitor navigating to a portfolio using any supported theme sees the correct content — unknown theme IDs fall back gracefully without a blank screen or error.
- **SC-004**: The time-to-first-meaningful-content for a public portfolio page improves on a simulated slow connection (3G throttling), visible as a faster skeleton-to-content transition.
- **SC-005**: `npm run test` passes with zero regressions after the refactoring.
