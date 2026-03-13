# Implementation Plan: 013-dev-kit-email-ui

**Branch**: `013-dev-kit-email-ui` | **Date**: 2026-03-13 | **Spec**: [specs/013-dev-kit-email-ui/spec.md](specs/013-dev-kit-email-ui/spec.md)
**Input**: Feature specification from `/specs/013-dev-kit-email-ui/spec.md`

## Summary

This plan outlines the steps to implement reliable Dev Kit health checks, operational outbound email endpoints, and UI readability improvements for Settings and public pages. The work is split between robust backend edge functions (for email and strict Dev Kit checks) and resilient frontend UI updates (for responsiveness, themes, and Dev Kit action tracking).

## Technical Context

**Language/Version**: TypeScript / Node.js
**Primary Dependencies**: React (Next.js/Vite), Supabase Edge Functions, Resend API
**Storage**: Supabase PostgreSQL (`usage_events` table)
**Target Platform**: Web Browsers (Mobile and Desktop)
**Project Type**: Fullstack Web Application
**Constraints**: Edge functions must enforce IP rate limiting; Settings headers must be contained in cards; UI colors must contrast against the cloud background.

## Constitution Check

*GATE: Passed. No new architectural libraries or breaking changes introduced. The plan relies on existing tools (Resend, Supabase) and standard React UI layout behaviors.*

## Phase 0: Outline & Research

No `[NEEDS CLARIFICATION]` markers exist in the specification. 
Research is considered complete via the prior `speckit.clarify` workflow. IP rate limiting will be implemented within the Supabase boundary.

## Phase 1: Design & Tasks

### Task Breakdown

#### Backend: Edge Functions

- **T001: Implement Email Edge Function**
  - Create/update an edge function (e.g., `send-contact-email`) to handle Bug Reports, Feature Requests, and Contact Us.
  - Integrate `RESEND_API_KEY` for dispatching.
  - Implement IP-based rate limiting (max 3 per IP per hour).
  - Return clear JSON success (200/202) or standard error codes.
  - *Maps to: FR-EM-001, FR-EM-002, FR-EM-003*

- **T002: Upgrade Usage Events Endpoint**
  - Ensure the usage events retrieval mechanism reads directly from the `usage_events` table.
  - Hardcode limit `N=10` with no pagination for fast health checking.
  - *Maps to: FR-DK-004*

- **T003: Dev Kit Endpoint Strictness**
  - Ensure backend endpoints invoked by the Dev Kit use the genuine authentication flows and models, rejecting any "demo" mock data paths.
  - *Maps to: FR-DK-001, FR-DK-010*

#### Frontend: Dev Kit Upgrades

- **T004: Restructure Dev Kit UI Sections**
  - Group existing and new tests into logical, collapsible sections ("Core Smoke", "AI & Backend", "Email Tools", etc.).
  - Default non-critical sections to collapsed (mobile-first).
  - *Maps to: FR-DK-006, FR-DK-007, FR-RWD-002, FR-RWD-003*

- **T005: Dev Kit Test Validation Logic**
  - Update the client-side Dev Kit runner to strictly validate HTTP 2xx and absence of the `error` field in JSON payloads before marking "Success".
  - Build UI to extract and prominently display raw error messages from failed backend requests.
  - Add "View raw JSON" expansion toggles to all test results.
  - *Maps to: FR-DK-002, FR-DK-005, FR-DK-009*

- **T006: Integrate Email Tools Health Check**
  - Add specific Dev Kit entries to trigger the Bug Report, Feature Request, and Contact Us endpoints.
  - Ensure the test validates the returning JSON.
  - *Maps to: FR-DK-003, FR-EM-004*

- **T007: Implement "Run All Smoke" Action**
  - Add a master button to execute a critical path: AI test, Email check, Usage (N=10), and Auth/Storage baseline.
  - Provide a consolidated summary with surfaced error text on failure.
  - *Maps to: FR-DK-008, FR-DK-011*

#### Frontend: UI Readability & RWD

- **T008: Settings UI Card Grouping**
  - Modify the Settings page layouts (Privacy, Appearance, etc.) so that section headers and descriptions are wrapped inside the same visually distinct translucent card elements.
  - *Maps to: FR-UI-001*

- **T009: Theme Contrast Adjustments**
  - Implement CSS variables or Tailwind classes to enforce dark text on Light theme and light text on Dark theme over the cloud background.
  - Verify public pages (About, Terms) for contrast.
  - *Maps to: FR-UI-002, FR-UI-003, FR-UI-004*

- **T010: RWD Layout Fixes**
  - Clean up horizontal scrolling and container padding across smartphone sizes for the Dev Kit and Settings pages.
  - Ensure legibility of labels and JSON payloads on small viewports.
  - *Maps to: FR-RWD-001, FR-RWD-004*

## Project Structure

### Documentation

```text
specs/013-dev-kit-email-ui/
├── plan.md              # This file
├── spec.md              # Requirements and goals
└── checklists/          # QC checklists
```

### Source Code Mapping

```text
supabase/functions/
├── [email-function]/    # Email sending endpoint with IP rate-limiting (T001)

src/
├── components/          
│   ├── dev-kit/         # Dev kit UI, test running logic, formatting (T004 - T007)
│   ├── settings/        # Settings cards, headers, contrast fixes (T008 - T010)
│   └── public/          # Public page theme legibility (T009)
```

**Structure Decision**: No new global architectural patterns are required; work takes place in the existing Next.js/React folder hierarchy and standard Supabase Edge Functions structure.
