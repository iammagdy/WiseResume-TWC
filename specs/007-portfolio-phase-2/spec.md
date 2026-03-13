# Feature Specification: Portfolio Phase 2 – Medium Portfolio Fixes

**Feature Branch**: `007-portfolio-phase-2`  
**Created**: 2026-03-13  
**Status**: Draft  
**Input**: Issues 5–8 from `docs/issues/portfolio-feature-issues.md`

## Feature Goal
Improve stability and performance of the Portfolio feature without changing the core product behavior. This phase focuses on preventing environmental crashes, optimizing page load via code splitting, and refining UI feedback mechanisms.

## Clarifications
### Session 2026-03-13
- Q: Are there specific Time-to-Interactive (TTI) or bundle size targets beyond the 30% chunk reduction? → A: No, stick to the 30% chunk size reduction target only as a proxy for TTI improvement.
- Q: Should the "Publish your portfolio" tip still be visible as an advisory item in the Strength section? → A: Yes, keep as an advisory tip (0% weight) to guide the user on the next critical step.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Multi-Environment Stability (Priority: P1)
As a user or developer, I want the Portfolio Editor to load without crashing regardless of whether I am in a standard browser, an SSR environment, or a Capacitor webview, so that the app remains reliable across all supported platforms.

**Why this priority**: Preventing ReferenceErrors and crashes is fundamental to product stability.

**Independent Test**: Mount the `PortfolioEditorPage` in an environment where `window.matchMedia` is undefined (or mocked to throw) and verify no crash occurs.

**Acceptance Scenarios**:
1. **Given** the app is running in an environment without `window.matchMedia`, **When** the user opens the Portfolio Editor, **Then** the page renders successfully and defaults to standard motion (reduced motion disabled).

---

### User Story 2 - Performance Optimized Portfolio (Priority: P2)
As a public visitor, I want the portfolio page to load quickly on my device, especially on mobile, so that I can see the candidate's profile without waiting for unnecessary code to download.

**Why this priority**: Public portfolios are marketing tools for users; slow load times negatively impact the "first impression" for recruiters.

**Independent Test**: Perform a build analysis or check network tabs to verify that different themes or large chunks of logic are split into separate files.

**Acceptance Scenarios**:
1. **Given** a visitor navigates to a public portfolio, **When** the page loads, **Then** only the necessary code for that specific theme and core functionality is downloaded initially.
2. **Given** the `PublicPortfolioPage` is loaded, **When** inspected by a developer, **Then** the logic is split into smaller, maintainable components rather than a single monolithic file.

---

### User Story 3 - Flicker-Free Navigation (Priority: P2)
As a visitor, I want a smooth visual experience as I scroll and interact with a portfolio, with no flickering or jumping of elements like the sticky header when data is loading or refreshing.

**Why this priority**: Visual polish and "premium feel" are core to the WiseResume brand.

**Independent Test**: Trigger a data refresh while at a scroll position that shows the sticky header and verify the header does not disappear and reappear.

**Acceptance Scenarios**:
1. **Given** the sticky header is visible, **When** the underlying portfolio data changes (e.g. background fetch), **Then** the header remains stable and the `IntersectionObserver` is not redundantly re-initialized.

---

### User Story 4 - Rational Strength Score (Priority: P3)
As a user, I want my portfolio "Strength Score" to reflect how complete my profile content is, rather than whether I have made the portfolio public yet, so that I have an accurate checklist of what content I still need to add.

**Why this priority**: Avoids pressuring users to publish prematurely and provides better guidance on content completeness.

**Independent Test**: Fill out all portfolio fields but keep `portfolioEnabled` set to `false`, and verify the strength score reaches 100%.

**Acceptance Scenarios**:
1. **Given** a user has filled all content sections, **When** they view the strength score, **Then** it shows 100% even if the portfolio is currently in "Draft" mode.

---

### Questions/Assumptions (Clarify)

- **Assumption (Issue 6)**: Code splitting for `PublicPortfolioPage` will focus on splitting by component/section and potentially by theme-specific logic if one theme is significantly heavier than others.
- **Assumption (Issue 7)**: The flicker fix will involve moving the `IntersectionObserver` initialization to use a more stable dependency or a `useRef` based approach that doesn't trigger on every data change.
- **Question**: Are there specific performance targets (e.g., bundle size reduction or TTI improvement) for the `PublicPortfolioPage` split?
- **Question**: Should the "Publish" tip still be visible in the Strength section even if it doesn't count towards the score percentage? (e.g. as an "Optional Step" or "Call to Action").

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST guard `window.matchMedia` calls in `PortfolioEditorPage` to prevent crashes in non-DOM or SSR environments.
- **FR-002**: `PublicPortfolioPage` MUST be refactored into smaller, logically separated components.
- **FR-003**: Theme-specific rendering logic SHOULD be dynamic or code-split to reduce the initial JS payload for public visitors.
- **FR-004**: The `IntersectionObserver` dependency in `PublicPortfolioPage` MUST be decoupled from the full `portfolio` data object to prevent unnecessary re-binds.
- **FR-005**: The `strengthChecks` logic in `PortfolioEditorPage` MUST exclude `portfolioEnabled` from the percentage calculation, retaining it only as a P0 weight (advisory) checklist item.

### Key Entities

- **PortfolioEditorPage**: The primary configuration interface for users.
- **PublicPortfolioPage**: The public-facing entry point for visitors.
- **Strength Score**: A calculated metric of content completeness.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero `ReferenceError` crashes related to `matchMedia` on mount across all target environments.
- SC-002**: Reduction in the main JS chunk size for the `PublicPortfolioPage` by at least 30% via code splitting, ensuring faster initial delivery without specific sub-second TTI mandates in this phase.
- **SC-003**: `IntersectionObserver` for the sticky header executes its `useEffect` cleanup/setup logic only when the `heroRef` or relevant scroll target changes, not on data updates.
- **SC-004**: Users see "100% Strength" when all fields are filled, regardless of the `portfolioEnabled` toggle state.
- **SC-005**: `npm run test` passes without errors.
