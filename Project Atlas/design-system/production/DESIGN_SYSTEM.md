# WiseResume / WiseHire Production Design System

This document turns the existing visual reference kit into a production design-system contract for the WiseResume codebase.

It should be used as the source of truth for UI decisions before implementation. The existing `README.md`, `colors_and_type.css`, `preview/`, and `ui_kits/` remain visual references. This file defines how those references become reusable product rules.

---

## 1. Design-system goals

The system must make the product feel:

- Consistent across WiseResume and WiseHire.
- Fast and clear on mobile.
- Professional enough for career/recruiting workflows.
- AI-powered without looking noisy or gimmicky.
- Easy for Claude Code, Replit, Codex, or a developer to apply safely.

The design system should not cause a full rewrite. It should standardize the current app gradually.

---

## 2. Product identities

### WiseResume

WiseResume is the candidate/job-seeker product.

Use it for:

- Resume builder
- Resume editor
- ATS scan
- Tailor to job
- AI rewrite/boost
- Cover letter tools
- Portfolio tools
- Applications tracker
- Candidate onboarding
- Pricing for job seekers

Primary brand color: Crimson Red `#9E1B22`.

Personality:

- Confident
- Helpful
- Career-focused
- Outcome-oriented
- Direct but not harsh

Example UI language:

- “Optimize your resume.”
- “Get more interviews.”
- “Tailor this resume.”
- “Review AI changes.”
- “Export your final resume.”

### WiseHire

WiseHire is the recruiter/company product.

Use it for:

- Recruiter dashboard
- Job description writer
- Candidate pipeline
- Bulk CV screening
- Scorecards
- Talent pool
- Client/company hiring workflows
- WiseHire pricing and subscription

Primary brand color: Royal Blue `#1D4ED8` with companion blue `#3B82F6`.

Personality:

- Efficient
- Operational
- Data-driven
- Clear
- Trustworthy

Example UI language:

- “Hire smarter.”
- “Screen faster.”
- “Rank candidates.”
- “Generate job description.”
- “Review shortlist.”

---

## 3. Non-negotiable rules

1. Do not mix WiseResume crimson and WiseHire blue inside the same product surface.
2. Use one primary CTA per screen section.
3. Every important action must have loading, success, error, and disabled states.
4. Mobile must be designed first for the main WiseResume flows.
5. No decorative emoji in product UI.
6. Use Lucide-style icons for semantic meaning only.
7. Do not create new visual styles unless they are added to this design system first.
8. Do not duplicate component styling across screens. Extract repeated UI into reusable components.
9. Do not change product logic, backend logic, or data models when applying the design system.
10. Prefer minimal, reversible implementation steps.

---

## 4. Foundation stack

Recommended production stack:

- React / TypeScript
- Tailwind CSS
- CSS variables for tokens
- shadcn/ui for accessible primitives when already available
- Framer Motion for meaningful transitions only
- Lucide React for icons
- Inter via `@fontsource/inter` in production

The visual kit may use CDN imports for previews. Production should not rely on preview-only CDN setup.

---

## 5. Design-system layers

The system is organized into five layers:

### Layer 1 — Tokens

Documented in `DESIGN_TOKENS.md`.

Includes:

- Color
- Typography
- Spacing
- Radius
- Shadow
- Motion
- Z-index
- Breakpoints
- State tokens

### Layer 2 — Core components

Documented in `COMPONENT_LIBRARY.md`.

Includes:

- Button
- Input
- Textarea
- Select
- Card
- Badge
- Tabs
- Dialog
- Sheet
- Toast
- Tooltip
- Dropdown
- Table
- Empty state
- Loading state
- Error state

### Layer 3 — Product components

Documented in `COMPONENT_LIBRARY.md`.

Includes WiseResume-specific and WiseHire-specific components.

Examples:

- ATS Score Ring
- Resume Card
- Resume Section Card
- AI Suggestion Panel
- Tailor Result Card
- Keyword Match Badge
- Upload Resume Box
- Candidate Score Card
- Pipeline Column
- JD Writer Panel

### Layer 4 — Product flows

Documented in `PRODUCT_FLOWS.md`.

Includes:

- Upload CV flow
- Parse flow
- Resume editor flow
- Tailor flow
- Review changes flow
- Apply changes flow
- Export flow
- Onboarding flow
- Pricing/subscription flow
- WiseHire screening flow

### Layer 5 — Implementation governance

Documented in:

- `IMPLEMENTATION_GUIDE.md`
- `AUDIT_CHECKLIST.md`
- `MOBILE_RULES.md`
- `ACCESSIBILITY.md`

This layer tells AI agents and developers how to safely apply the system.

---

## 6. Screen hierarchy rules

Every app screen should follow this order:

1. Product shell
2. Page header
3. Primary task area
4. Secondary context/actions
5. Help/AI/supportive guidance
6. Feedback states

### Page header

Each major screen should have:

- Clear title
- One-sentence description
- Optional status badge
- One primary CTA when relevant

Bad example:

> “Dashboard” only.

Good example:

> “Optimize your resume.”  
> “Upload, edit, and tailor your resume for better job matches.”

---

## 7. Main WiseResume product areas

### Dashboard

Purpose: help the user take the next best action.

Must include:

- Current resume status
- ATS score summary
- Primary CTA
- Resume list
- Recent activity or applications
- Onboarding/checklist if incomplete

Primary CTA examples:

- “Build a Resume”
- “Optimize for a Job”
- “Continue Editing”

### Resume Editor

Purpose: edit structured resume content with confidence.

Must include:

- Section navigation
- Form editing area
- Preview area on desktop
- AI assistance entry point
- Save state
- Export/Tailor CTAs

Mobile behavior:

- Editor and preview should not fight for space.
- Use tabs or segmented control: “Edit” / “Preview”.
- Primary CTA should be sticky when the user is deep in the flow.

### Tailor Page

Purpose: match a resume to a job description.

Must include:

- Resume selector
- Job description input
- Tailoring intensity/settings
- Clear parse/tailor CTA
- Helper copy explaining what will happen
- Loading progress
- Safe error recovery

### Tailor Results

Purpose: explain changes before applying them.

Must include:

- Overall score / verified score if available
- Prioritized changed sections
- Before/after comparison
- Keyword matches and missing keywords
- AI reasoning where useful
- Apply CTA
- Undo/review path

### Export

Purpose: help user get final output.

Must include:

- Format choices
- Preview confirmation
- Download/export CTA
- Clear note if formatting may differ by format

---

## 8. Main WiseHire product areas

### WiseHire Dashboard

Purpose: show hiring activity and next operational task.

Must include:

- Pipeline summary
- Trial/subscription status if relevant
- Candidate volume
- Open roles
- Primary CTA: create role, upload CVs, or generate JD

### Pipeline

Purpose: move candidates through stages.

Must include:

- Kanban or grouped stage view
- Candidate score signal
- Clear candidate card
- Stage actions
- Empty state per column

### Bulk Screen

Purpose: upload and rank many CVs.

Must include:

- Bulk upload area
- Job/role context
- Screening progress
- Score results
- Error handling for failed files

### JD Writer

Purpose: generate job descriptions with structured inputs.

Must include:

- Role basics
- Requirements
- Tone/seniority controls
- Generate CTA
- Editable output
- Copy/export action

---

## 9. AI interaction rules

AI should feel like a guided assistant, not a black box.

Every AI action should answer:

1. What will AI do?
2. What input does it need?
3. What will change?
4. Can the user review before applying?
5. What happens if AI fails?

### AI buttons

Good:

- “Rewrite with AI”
- “Tailor to this job”
- “Generate cover letter”
- “Improve bullet points”

Avoid:

- “Magic”
- “Do AI”
- “Enhance everything”

### AI loading states

Use specific progress language:

- “Reading your resume…”
- “Comparing against the job description…”
- “Finding missing keywords…”
- “Preparing suggested changes…”

Avoid vague loading:

- “Loading…”
- “Processing…”

---

## 10. State coverage requirements

Every reusable component and screen must cover:

- Default
- Hover
- Focus
- Active/pressed
- Loading
- Disabled
- Empty
- Error
- Success
- Mobile
- Dark mode when supported

No screen should ship with only the ideal filled-data state.

---

## 11. Documentation ownership

When the visual language changes, update these files in this order:

1. `DESIGN_TOKENS.md`
2. `COMPONENT_LIBRARY.md`
3. `PRODUCT_FLOWS.md` if behavior changed
4. `MOBILE_RULES.md` if layout changed
5. `ACCESSIBILITY.md` if interaction changed
6. `IMPLEMENTATION_GUIDE.md` if rollout rules changed
7. `README.md` index if new files are added

---

## 12. Definition of done

The design system becomes production-ready when:

- Tokens are mapped to real Tailwind/CSS variables.
- Core components use the tokens.
- WiseResume product components are documented and reused.
- WiseHire product components are documented and reused.
- Main flows have mobile rules.
- Accessibility rules are applied.
- Empty/loading/error/success states are implemented.
- There is a safe rollout plan.
- Developers/AI agents can apply it screen by screen without guessing.
