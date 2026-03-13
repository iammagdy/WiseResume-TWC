# Feature Specification: Portfolio Phase 3 – Low Portfolio Fixes

**Feature Branch**: `008-portfolio-phase-3`  
**Created**: 2026-03-13  
**Status**: Draft  
**Input**: Issues 9–12 from `docs/issues/portfolio-feature-issues.md`

## Feature Goal
Polish UX and output quality for the Portfolio feature. This phase addresses visual fidelity in exports (PDF), ensures all saved data is rendered (Summary), validates user input (Social Links), and improves the internal consistency of the design preview.

## Clarifications
### Session 2026-03-13
- Q: What should be the primary visual strategy for the "print-safe" fallback when exporting to PDF? → A: A – flattened modern, keep original colors (Solid colors, no transparency/filters).
- Q: Should the normalization also include validation that the link matches the platform's domain? → A: Yes, accept recommendation A (Basic Protocol Normalization Only).
- Q: Where specifically should the portfolioSummary be rendered in the public portfolio layout relative to other bio sections? → A: A – Below Hero (Introduction/Tagline).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Professional PDF Export (Priority: P2)
As a user, I want to download a PDF version of my portfolio that looks professional and matches the core content of my online profile, even if some advanced browser-only CSS effects are simplified, so that I can share my portfolio offline or via email.

**Why this priority**: A broken-looking PDF export reflects poorly on the user and the WiseResume product.

**Independent Test**: Use the "Download PDF" button on a portfolio using a premium theme (e.g., `glass-pro` or `neon-cyber`) and verify the resulting PDF is readable and visually cohesive.

**Acceptance Scenarios**:
1. **Given** a user is using a theme with complex CSS (e.g. `backdrop-filter`), **When** they export to PDF, **Then** the system uses a simplified fallback style that preserves layout and readability without showing broken artifacts.

---

### User Story 2 - Complete Content Visibility (Priority: P2)
As a user, when I fill out the "Summary" field in the Portfolio Editor, I want to see that summary displayed on my public portfolio page so that my visitors can read my introduction.

**Why this priority**: Users expect data they provide in the editor to be visible in the final product.

**Independent Test**: Enter text in the "Portfolio Summary" field, save, and verify it appears in the expected section on the public URL.

**Acceptance Scenarios**:
1. **Given** a user has saved a `portfolioSummary`, **When** the public portfolio is loaded, **Then** the summary is rendered (e.g. below the hero or in the About section).

---

### User Story 3 - Resilient Social Connectivity (Priority: P2)
As a user, I want my social media links to work correctly even if I forget to type "https://" in the input field, so that visitors can easily navigate to my professional profiles.

**Why this priority**: Broken social links are a high-friction UX issue and unprofessional for a candidate.

**Independent Test**: Enter `linkedin.com/in/username` in the LinkedIn field, save, and verify the link on the public page correctly navigates to the LinkedIn profile.

**Acceptance Scenarios**:
1. **Given** a user enters a domain-only URL (e.g., `github.com/user`), **When** saved, **Then** the system automatically prefixes it with `https://` if missing.

---

### User Story 4 - High-Fidelity Design Preview (Priority: P3)
As a user, I want the theme preview in the Design tab to look exactly like the theme will look in reality, regardless of whether my editor theme is set to dark or light mode, so that I can make accurate design choices.

**Why this priority**: Inconsistent previews lead to user confusion and poor design outcomes.

**Independent Test**: Switch the editor to Dark Mode, then preview a Light theme (e.g., `classic-clean`) in the Design tab and verify it still shows white backgrounds/proper colors.

**Acceptance Scenarios**:
1. **Given** the user's browser/editor is in Dark Mode, **When** they view the Design Tab, **Then** the mini-previews for all themes (including light ones) display with their native color palettes.

---

### Questions/Assumptions (Clarify)

- **Assumption (Issue 9)**: For the PDF fix, we will implement a "PDF-friendly" CSS override or a simplified rendering mode rather than trying to make `html2canvas` support advanced CSS like `color-mix`.
- **Assumption (Issue 10)**: The `portfolioSummary` will be rendered in a prominent location, likely as a secondary bio or lead-in text.
- **Question**: Are there specific "Print" styles we should adopt for the PDF export?
- **Question**: For social links, should we also validate that the links lead to the correct platform (e.g., "linkedin.com" in the LinkedIn field)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The PDF generation loop MUST apply a "print-safe" stylesheet that disables modern CSS features (transparency, backdrop-filters, color-mix) in favor of a "flattened modern" look using solid color tokens from the theme.
- **FR-002**: `PublicPortfolioPage` MUST fetch and render the `portfolioSummary` field as an introductory tagline section below the Hero.
- **FR-003**: The Portfolio Editor MUST normalize social URLs by adding `https://` if the protocol is missing, without enforcing platform-specific domain validation in this phase.
- **FR-004**: The `DesignTab` theme previews MUST be isolated from the parent editor's theme context to ensure accurate color representation.

### Key Entities

- **PortfolioSummary**: A user-defined introductory text.
- **Social Links**: External profile URLs.
- **Design Preview**: A micro-representation of the selected theme.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: PDF exports show 0 visual artifacts from unsupported CSS (no black boxes or missing text).
- **SC-002**: 100% of stored `portfolioSummary` entries are visible on the public page.
- **SC-003**: 100% of social links on the public page are absolute URLs (starting with `http://` or `https://`).
- **SC-004**: `DesignTab` previews match the intended theme appearance in both browser color modes.
- **SC-005**: `npm run test` passes without errors.
