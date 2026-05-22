# Component Library

This document defines the reusable component system for WiseResume and WiseHire.

The current `ui_kits/` files are visual references. Production components should live in the app source and consume tokens from `DESIGN_TOKENS.md`.

---

## 1. Component principles

1. Components must be reusable across screens.
2. Styling must come from tokens, not one-off hardcoded values.
3. Each component must document variants, states, and mobile behavior.
4. Product-specific components should be separated from generic core components.
5. Components must be accessible by default.
6. Do not create a new component if an existing shadcn/ui primitive can be themed safely.

---

## 2. Core components

### Button

Purpose: trigger user actions.

Variants:

- `primary`
- `secondary`
- `outline`
- `ghost`
- `destructive`
- `link`
- `ai`

Sizes:

- `sm`
- `md`
- `lg`
- `icon`

States:

- Default
- Hover
- Focus
- Active
- Loading
- Disabled

Rules:

- Minimum touch target: 44px.
- Primary button uses active product primary.
- Only one primary CTA per major screen region.
- Loading button shows spinner and keeps width stable.
- Destructive actions need confirm dialog if irreversible.

Example copy:

- WiseResume: “Optimize Resume”, “Tailor to Job”, “Export PDF”
- WiseHire: “Screen Candidates”, “Generate JD”, “Create Role”

---

### Input

Purpose: collect short user text.

Variants:

- Default
- Search
- With icon
- Error
- Success
- Disabled

Rules:

- Label is required unless placeholder is purely decorative.
- Placeholder is not a replacement for label.
- Error message should explain how to fix the issue.
- Focus ring uses product primary.

---

### Textarea

Purpose: collect longer content such as job descriptions, summaries, notes, or prompts.

Variants:

- Default
- Large job description input
- AI prompt input
- Error
- Disabled

Rules:

- Job description textareas need helper text.
- Long textareas should have character/word feedback when useful.
- Mobile textareas should not be shorter than 160px for job descriptions.

---

### Select / Combobox

Purpose: choose from known options.

Use for:

- Resume selector
- Template selector
- Tailoring intensity
- Role/seniority selector
- Candidate pipeline stage

Rules:

- Use searchable combobox for long lists.
- Show selected item clearly.
- On mobile, use sheet-style selection if menu becomes cramped.

---

### Card

Purpose: group related content.

Variants:

- Default
- Elevated
- Interactive
- Metric
- AI suggestion
- Empty state
- Warning
- Success

Anatomy:

1. Optional icon/visual
2. Title
3. Description or metric
4. Supporting metadata
5. Action area

Rules:

- Use border + shadow together.
- Use `rounded-2xl` for normal product cards.
- Interactive cards must have hover and focus states.
- Avoid too many actions in one card.

---

### Badge / Pill

Purpose: show status or compact metadata.

Variants:

- Neutral
- Brand
- Success
- Warning
- Error
- Info
- Outline

Use for:

- ATS status
- Plan status
- Job status
- Candidate stage
- Keyword match
- AI-generated marker

Rules:

- Keep text short.
- Do not use badges as buttons unless they are explicitly interactive chips.

---

### Tabs / Segmented Control

Purpose: switch between related panels.

Use for:

- Edit / Preview
- Before / After
- Resume sections
- Candidate views
- Pricing intervals

Rules:

- On mobile, prefer segmented controls for 2-3 options.
- For many tabs, use scrollable tab list or dropdown.

---

### Dialog

Purpose: interrupt for confirmation or focused task.

Use for:

- Delete confirmation
- Export settings
- Unsaved changes
- Subscription upgrade

Rules:

- Dialogs must have clear title and action hierarchy.
- Escape and outside click behavior should be intentional.
- Avoid large forms inside dialogs on mobile; use sheets instead.

---

### Sheet / Drawer

Purpose: side or bottom panel for contextual workflows.

Use for:

- AI suggestions
- Mobile navigation
- Resume section editor on mobile
- Candidate details
- Export options

Rules:

- Desktop: side sheet is acceptable.
- Mobile: bottom sheet or full-height sheet.
- Include close button and clear heading.
- Do not hide primary action below the fold on mobile.

---

### Toast

Purpose: brief feedback after actions.

Variants:

- Success
- Error
- Info
- Warning

Rules:

- Toasts are not a substitute for inline form errors.
- Use short copy.
- Include recovery action when possible.

Examples:

- “Resume saved.”
- “Export failed. Try again.”
- “AI changes applied.”

---

### Empty State

Purpose: guide the user when there is no data.

Anatomy:

1. Simple icon
2. Clear title
3. Helpful description
4. Primary action
5. Optional secondary action

Examples:

- “No resumes yet — create your first resume.”
- “No applications yet — track your first job.”
- “No candidates yet — upload CVs to start screening.”

---

### Loading State

Purpose: communicate progress.

Variants:

- Skeleton
- Spinner
- Progress steps
- Inline saving state

Rules:

- Use skeleton for page/card content.
- Use step progress for AI jobs.
- Avoid only showing a spinner for long AI tasks.

---

### Error State

Purpose: explain what went wrong and how to recover.

Rules:

- Show human-readable cause when possible.
- Provide retry or alternative action.
- Preserve user input.
- Do not blame the user.

---

## 3. WiseResume product components

### Resume Card

Purpose: represent one saved resume.

Must include:

- Resume name/title
- Last updated date
- ATS/match score if available
- Status badge
- Primary action: Continue/Edit
- Secondary actions: Tailor, Export, Duplicate, Delete

Mobile:

- Actions collapse into menu if crowded.

---

### ATS Score Ring

Purpose: show resume/job match score.

States:

- No score
- Low
- Medium
- Strong
- Loading
- Verified

Rules:

- Never show score without explaining what it means.
- Use label like “ATS Match” or “Resume Score”.
- Pair numeric score with suggestions.

---

### Resume Section Card

Purpose: edit or review resume sections.

Sections:

- Contact
- Summary
- Experience
- Skills
- Education
- Projects
- Certifications
- Languages

Rules:

- Show completion state.
- Show validation issues.
- Show AI suggestions where available.
- Allow collapse/expand.

---

### AI Suggestion Panel

Purpose: explain AI recommendations.

Must include:

- Suggested change
- Reason for change
- Before/after when relevant
- Accept action
- Reject action
- Edit manually action

Rules:

- User should review before applying important changes.
- Avoid auto-applying resume content changes without confirmation.

---

### Tailor Result Card

Purpose: show changes from tailoring.

Must include:

- Section name
- Impact/score delta if available
- Before text
- After text
- Reason
- Keywords affected
- Accept/reject/edit controls

Rules:

- Sort by impact, not fixed section order.
- Collapsed cards must still summarize the change.

---

### Keyword Match Badge

Purpose: show matched, missing, or added keywords.

Variants:

- Matched
- Missing
- Added
- Removed
- Recommended

Rules:

- Missing keywords should not encourage keyword stuffing.
- Explain keyword relevance when possible.

---

### Upload Resume Box

Purpose: upload CV/resume.

Must include:

- Drag/drop area
- File type support
- Max size note
- Browse file action
- Upload progress
- Error state

Mobile:

- Must show regular file picker button.
- Drag/drop copy should not be the only instruction.

---

### Export Panel

Purpose: choose export format and finalize.

Must include:

- PDF export
- DOCX export if supported
- Template/style choice if supported
- Preview note
- Download action

---

## 4. WiseHire product components

### Candidate Card

Purpose: represent one candidate.

Must include:

- Candidate name or anonymized label
- Role/source
- Score
- Key strengths
- Concerns/missing requirements
- Stage
- Primary action

---

### Candidate Score Card

Purpose: explain candidate match.

Must include:

- Overall score
- Skills match
- Experience fit
- Missing requirements
- AI reasoning summary

---

### Pipeline Column

Purpose: group candidates by hiring stage.

Must include:

- Stage name
- Count
- Candidate cards
- Empty state
- Drop/move behavior if supported

---

### Bulk Upload Panel

Purpose: upload multiple CVs.

Must include:

- Upload box
- File list
- Per-file progress
- Failed file recovery
- Screening status

---

### JD Writer Panel

Purpose: collect input and generate job descriptions.

Must include:

- Role title
- Seniority
- Requirements
- Responsibilities
- Tone
- Generate action
- Editable output
- Copy/export action

---

## 5. Component acceptance checklist

For every component:

- [ ] Uses tokens.
- [ ] Has responsive behavior.
- [ ] Has accessible label/name.
- [ ] Has keyboard support where interactive.
- [ ] Has loading state when action-based.
- [ ] Has disabled state.
- [ ] Has error state where data/input can fail.
- [ ] Has examples for WiseResume and/or WiseHire.
- [ ] Does not hardcode product-specific color unless scoped intentionally.

---

## Preview-to-production component mapping

Use this table when translating the interactive preview into production components.

| Interactive preview item | Production component | Notes |
|---|---|---|
| Crimson primary button | `Button variant="primary"` | Scoped to WiseResume product context. |
| Blue primary button | `Button variant="primary"` | Scoped to WiseHire product context. |
| Secondary/ghost buttons | `Button variant="secondary"`, `ghost`, `outline` | Reuse existing button primitive where possible. |
| ATS score ring | `AtsScoreRing` / `JobMatchScore` | Must support score tiers, loading, empty, and tooltip/help state. |
| AI sheet | `AiSuggestionSheet` | On mobile it should behave as a bottom sheet. |
| Dashboard stat card | `MetricCard` | Should include icon, title, value, trend/helper text. |
| Resume card | `ResumeCard` | Should include title, updated date, score, actions, and status. |
| Editor layout | `ResumeEditorLayout` | Must support editor + preview behavior and mobile fallback. |
| Keyword badges | `KeywordMatchBadge` | Distinguish matched, missing, added, removed, unchanged. |
| Tailor change card | `TailorChangeCard` / `BeforeAfterDiff` | Must show what changed and why. |
| Toast patterns | `Toast` | Use for short feedback only; important failures need inline error too. |
| WiseHire pipeline card | `CandidateCard` | Must expose score, stage, status, and next action. |
| WiseHire bulk upload | `BulkScreenDropzone` | Must show file validation, progress, failure, retry, and summary. |
