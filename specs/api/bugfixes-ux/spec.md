# Feature Specification: 013-api-bugfixes-ux

**Title**: API Bug Fixes and UX Polish
**Status**: Draft
**Priority**: P1
**Owner**: WiseResume AI

## User Scenarios & Testing

### Scenario 1: Authentication Resilience
**GIVEN** the `EXT_SUPABASE_JWT_SECRET` is set in Supabase Secrets
**WHEN** a user logs in via Kinde
**THEN** the `token-exchange` edge function successfully mints a valid Supabase JWT
**AND** Row Level Security (RLS) accepts the token without being bypassed.

### Scenario 2: Active Resume Recognition
**GIVEN** a user creates or duplicates a new resume
**WHEN** they navigate to AI Tools or the Editor
**THEN** the app immediately recognizes the active resume status
**AND** they are not incorrectly told to "Create a resume first".

### Scenario 3: Accurate Connection Banner
**GIVEN** the application encounters a network or backend issue
**WHEN** it is a genuine database or backend data/auth connectivity failure
**THEN** the "We couldn't connect your data" banner appears
**AND** if the issue is purely an offline or local network failure, it is represented entirely separately (e.g., standard offline banner).

### Scenario 4: Deep Analyze Clarity
**GIVEN** a user opens the Deep Analyze/Job Analysis tool without a job description
**WHEN** they attempt to click the Analyze button
**THEN** a clear message or toast appears instructing them to "Add Job Description"
**AND** the button does not feel like a silent "dead" click.

### Scenario 5: Reliable PDF Exports
**GIVEN** a user exports a completed resume
**WHEN** the file is downloaded
**THEN** it generates a valid `.pdf` file with a proper extension and filename (e.g., `WiseResume.pdf` or tailored)
**AND** the root cause (such as blob typing, filename generation, download handling, or headers) has been properly investigated and resolved so the file is never corrupted or missing extensions.

### Scenario 6: UI and Layout Polish
**GIVEN** a user opens floating panels (Settings, Ask Wise AI) over dynamic backgrounds
**WHEN** the background is busy or animated
**THEN** a light backdrop blur maintains perfect text readability in both Light and Dark themes
**AND** the "Ask Wise AI" and "Settings" buttons on the bottom edge are cleanly arranged without visual overlap.

## Requirements

### R1: Backend & Data Flow
- **FR-001**: Ensure the frontend payload correctly triggers the `token-exchange` workflow. Codebase logic must correctly use the secret context without managing the actual environmental secret variable itself. RLS remains fully intact.
- **FR-002**: Provide explicit active-state tracking upon creating a new resume so `useResumeStore` correctly anchors it immediately.
- **FR-003**: Separate `bridgeError` states to clearly delineate between real API rejections/backend 500s (triggering the backend banner) and generic offline fetch drops (handled separately).

### R2: Frontend Experience
- **FR-004**: Convert silent `disabled` states on AI Tool triggers into actionable feedback patterns (toasts + logical intercepts).
- **FR-005**: Exhaustively inspect the client-side export pipelines (including blob typing, filename assignments, return handlers, and anchoring logic) to determine the exact root cause of download corruption before deploying a fix.
- **FR-006**: Apply CSS variable-backed `backdrop-blur` on global sheets/dialogs. Restructure the bottom action layout to elegantly contain the Ask floating FAB and Settings items securely.

## Success Criteria
- [ ] No 401/500 Supabase rejections exist in the console upon valid Kinde login.
- [ ] Resume creation routes to valid editor/AI tools seamlessly.
- [ ] Global banner does not trigger on minor UI state changes.
- [ ] Clicking Analyze without a JD triggers an actionable toast.
- [ ] PDF downloaded correctly with explicit `.pdf` extension.
- [ ] Settings sheets feature a premium blur effect preserving text legibility on both Light and Cloud visual backgrounds. Ask AI button doesn't obstruct other bottom nav elements.
