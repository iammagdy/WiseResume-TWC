# Product Flows

This document defines the required UX behavior for the main WiseResume and WiseHire flows.

A production design system must cover flows, not just screens.

---

## 1. WiseResume core flow

Primary journey:

```text
Upload CV → Parse CV → Edit Resume → Tailor to Job → Review AI Changes → Apply Changes → Export
```

This is the most important WiseResume path. Design implementation should prioritize it before lower-frequency pages.

---

## 2. Upload CV flow

### Goal

Help the user start quickly by uploading an existing resume.

### Required states

- Empty/default
- Drag active
- File selected
- Uploading
- Upload failed
- Unsupported file
- Upload complete

### Required copy

- Supported file types
- File size limit
- Privacy reassurance if available
- Clear CTA

### Mobile rules

- Show large “Choose File” button.
- Do not rely on drag/drop copy.
- Keep instructions short.

### Success behavior

After upload success, move user into parsing/progress state or editor depending on product logic.

---

## 3. Parse CV flow

### Goal

Turn uploaded file into editable structured resume content.

### Required states

- Reading file
- Extracting sections
- Validating content
- Done
- Failed with retry
- Partial parse with manual correction

### UI pattern

Use step-based progress instead of generic spinner.

Example steps:

1. “Reading your resume…”
2. “Finding your sections…”
3. “Structuring your experience…”
4. “Preparing your editor…”

### Failure behavior

If parsing fails:

- Preserve uploaded file if possible.
- Offer retry.
- Offer manual resume creation.
- Explain accepted formats.

---

## 4. Resume editor flow

### Goal

Let user edit resume confidently while understanding completeness and quality.

### Required layout

Desktop:

- Left or top section navigation
- Main form editing area
- Right preview panel when space allows

Mobile:

- “Edit” / “Preview” segmented control
- Sticky save/continue action
- Section list should be compact

### Required states

- Unsaved changes
- Saving
- Saved
- Save failed
- Section validation errors
- Empty section
- AI suggestion available

### UX rules

- Do not overwhelm with every section open.
- Show completion state per section.
- Keep AI actions contextual.
- Preview should be easy to access but should not block editing.

---

## 5. Tailor to job flow

### Goal

Optimize a resume for a specific job description.

### Required inputs

- Resume selector
- Job description
- Optional job title/company
- Tailoring intensity or mode if supported

### Required helper copy

Explain that AI will compare the resume against the job description and suggest changes for review.

### Required states

- Empty job description
- Invalid/too short job description
- Ready
- Tailoring/loading
- Success
- Failure

### Loading steps

1. “Reading the job description…”
2. “Comparing against your resume…”
3. “Finding missing keywords…”
4. “Rewriting weak bullets…”
5. “Preparing review…”

### Safety rule

Tailoring should produce reviewable suggestions before applying major content changes.

---

## 6. Tailor results flow

### Goal

Help the user understand what changed and why before applying.

### Required sections

- Overall match/ATS score
- Top changes summary
- Section-level changes
- Keyword analysis
- Before/after comparison
- AI reasoning
- Apply/accept controls

### Sorting rule

Cards should be ordered by impact/importance when data is available, not fixed resume section order.

### Collapsed card rule

A collapsed card must still show:

- Section name
- Number of changes
- Expected benefit
- Status

### Required actions

- Accept all safe changes
- Review individually
- Reject individual change
- Edit before applying
- Apply final changes

---

## 7. Apply changes flow

### Goal

Save selected AI changes into the real resume safely.

### Required states

- Confirming changes
- Applying
- Validating saved result if supported
- Success
- Failure

### Success state

Show:

- What changed
- New score if available
- Next recommended action

Primary next action examples:

- “Export PDF”
- “Continue Editing”
- “Track This Application”

### Failure state

Show:

- What failed
- Whether changes were saved or not
- Retry action
- Return to review action

---

## 8. Export flow

### Goal

Let user download/share final resume.

### Required states

- Select format
- Preparing export
- Download ready
- Export failed

### Required options

- PDF export
- DOCX export if supported
- Template/style if supported

### UX rules

- Warn if unsupported elements may render differently.
- Keep export action obvious.
- On mobile, ensure download behavior is explained if needed.

---

## 9. Onboarding flow

### Goal

Get user to first useful resume outcome quickly.

### Recommended steps

1. Choose goal: create resume, optimize resume, tailor for job.
2. Upload or start from scratch.
3. Add basic profile information.
4. Reach editor/dashboard.
5. Show next best action.

### Rules

- Do not ask for everything upfront.
- Let users skip optional steps.
- Show progress.
- Avoid long forms on mobile.

---

## 10. Pricing/subscription flow

### Goal

Explain value and plans clearly.

### Required states

- Free/current plan
- Upgrade plan
- Trial plan if available
- Payment failed
- Subscription active
- Cancel/downgrade path if applicable

### Rules

- Plan cards should be comparable.
- Primary recommended plan can be highlighted.
- Do not hide limits.
- Use clear benefit language.

---

## 11. WiseHire screening flow

Primary journey:

```text
Create Role / Add JD → Upload CVs → Screen Candidates → Review Scores → Move to Pipeline → Export/Share Shortlist
```

### Required states

- No role yet
- JD missing
- Uploading CVs
- Screening progress
- Candidate results
- Failed files
- Empty shortlist
- Pipeline updated

### Candidate score review

Each result should show:

- Overall match
- Strengths
- Missing requirements
- Experience fit
- Recommended next action

---

## 12. Flow acceptance checklist

Before a flow is considered complete:

- [ ] It has a clear start and end.
- [ ] It has one dominant next action per step.
- [ ] It has loading/error/empty/success states.
- [ ] It works on mobile.
- [ ] It preserves user input on failure.
- [ ] It explains AI actions before applying changes.
- [ ] It avoids destructive or irreversible surprises.
