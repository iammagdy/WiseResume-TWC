# WiseResume / WiseHire Design Brief for AI Agents

This is the single-file design brief for AI agents such as Stitch, Claude Design, Claude Code, Replit, Codex, v0, Lovable, or any agent that needs to understand the WiseResume design direction quickly.

Read this file first. Then use the rest of this package for deeper detail.

---

## 1. What this product is

WiseResume / WiseHire is a two-sided AI career platform.

### WiseResume

WiseResume is the job-seeker side. It helps candidates create, improve, tailor, score, and export resumes using AI.

Core WiseResume jobs:

- Create a professional resume.
- Parse or upload an existing CV.
- Edit resume sections with a clean live preview.
- Tailor the resume to a job description.
- Improve weak bullets into stronger achievement-focused bullets.
- Show ATS / job-match score.
- Explain what changed and why.
- Export or share the final resume.
- Support career tools such as cover letters, interview prep, portfolios, and application tracking.

### WiseHire

WiseHire is the recruiter/employer side. It helps hiring teams screen candidates, write job descriptions, build shortlists, and manage hiring workflows.

Core WiseHire jobs:

- Create and manage roles.
- Generate job descriptions.
- Bulk screen CVs.
- Compare candidates.
- Use scorecards.
- Manage candidate pipelines.
- Reduce manual screening time.

Both products are related, but their brand identities must stay separate.

---

## 2. The most important design rule

WiseResume and WiseHire share the same design system, but they must not visually blend into one mixed product.

- WiseResume = crimson/red career assistant for job seekers.
- WiseHire = royal-blue hiring console for recruiters.

The active product owns the full screen.

Do not use crimson and blue as two primary colors on the same product surface unless it is a deliberate marketing comparison or product switch.

---

## 3. Brand identities

### WiseResume brand

WiseResume should feel:

- Professional
- Clear
- Encouraging
- AI-assisted
- Career-focused
- Premium but not cold
- Simple enough for non-technical users

Primary brand color:

```txt
Crimson: #9E1B22
```

Use crimson for:

- Primary CTA buttons
- Active nav states
- Focus rings
- Brand pills
- Important highlights
- Hero glow
- Resume/action emphasis

### WiseHire brand

WiseHire should feel:

- Fast
- Operational
- Trustworthy
- B2B SaaS
- Recruiter-focused
- Structured and efficient

Primary brand color:

```txt
Royal Blue: #1D4ED8
Bright Blue: #3B82F6
```

Use blue for:

- Primary CTA buttons
- Active sidebar states
- Pipeline highlights
- Recruiter dashboard accents
- WiseHire hero glow

---

## 4. Visual style

The UI should feel like a modern AI SaaS product.

Preferred visual language:

- Clean white or near-neutral backgrounds
- Soft cards
- Rounded corners
- Subtle shadows
- Clear hierarchy
- Spacious layouts
- Strong CTAs
- Minimal visual noise
- Productive dashboard feel
- AI assistance shown through helpful panels, not flashy gimmicks

Avoid:

- Overly colorful dashboards
- Random gradients everywhere
- Heavy borders
- Dense text blocks
- Tiny labels
- Multiple competing primary buttons
- Mixing WiseResume red and WiseHire blue inside the same app flow
- Copying preview code directly into production without adapting it to the app architecture

---

## 5. Typography

Use Inter as the main font.

### Font implementation

The package does not include binary font files. Agents should treat `FONT_SYSTEM.md` as the official font source of truth. In production, load Inter centrally through `@fontsource/inter` with weights `400`, `500`, `600`, `700`, and `800`. Preview files may use Google Fonts only for convenience. Do not invent extra fonts, do not add serif/decorative fonts, and do not copy font-loading snippets into every component.

Typography should be:

- Direct
- Readable
- Confident
- Clean
- Slightly bold for headlines
- Practical inside app screens

Rules:

- Marketing headlines can be large and expressive.
- Product UI should be compact but readable.
- Do not use too many text sizes inside one card.
- Use sentence case for most UI copy.
- Use Title Case for main CTA buttons when appropriate.
- Use short labels and helper text.

Example tone:

```txt
Optimize your resume.
Get more interviews.
Tailor to this job.
Apply AI changes.
Export PDF.
Screen candidates faster.
Generate job description.
```

---

## 6. Layout principles

The product should prioritize clarity over decoration.

### General layout

- Use a clear page title and one obvious primary action.
- Group related actions inside cards.
- Use whitespace to separate sections.
- Keep CTAs close to the task they affect.
- Avoid hiding important actions behind too many menus.

### Dashboard

The dashboard should quickly answer:

- What should I do next?
- What is my resume/job-match status?
- Which resume or job am I working on?
- What AI action can help me now?

### Editor

The resume editor should feel like a workspace.

It should include:

- Section navigation
- Editable resume fields
- Live preview or preview access
- AI tools that are easy to reach
- Clear save/export/tailor actions
- Mobile-safe editing

### Tailor flow

The tailor flow is one of the most important WiseResume flows.

It should feel guided and explainable:

1. Select resume.
2. Add job description.
3. Choose tailoring intensity if available.
4. Run optimization.
5. Show what changed.
6. Explain why each change helps.
7. Let the user review before applying.
8. Apply changes safely.
9. Show verified score/result.
10. Export or continue editing.

Do not make the user trust AI blindly. Show reasoning and before/after changes.

---

## 7. Core product flows

### WiseResume primary flow

```txt
Upload/Create Resume → Parse/Edit → Tailor to Job → Review Changes → Apply → Export
```

Each step needs:

- Primary CTA
- Loading state
- Error state
- Empty state when relevant
- Success state
- Mobile behavior
- Clear explanation of what happens next

### WiseResume AI flow

```txt
User asks for help → AI suggests changes → user reviews → user accepts/rejects → result updates
```

AI suggestions must be transparent. The user should know:

- What changed
- Why it changed
- Whether it affects ATS score
- Whether it changes meaning
- Whether it is safe to apply

### WiseHire primary flow

```txt
Create Role → Add/Upload Candidates → Screen → Review Scores → Shortlist → Move through Pipeline
```

Recruiter screens should prioritize speed, comparison, and structured decision-making.

---

## 8. Component system

The design system should include both core components and product-specific components.

### Core components

- Button
- Input
- Textarea
- Select / Combobox
- Card
- Badge
- Tabs
- Dialog
- Sheet
- Toast
- Tooltip
- Dropdown menu
- Table
- Empty state
- Loading state
- Error state
- Navigation item
- Progress indicator

### WiseResume-specific components

- ResumeCard
- ResumeEditorLayout
- ResumePreview
- UploadResumeBox
- ParseStatus
- AtsScoreRing
- JobMatchScore
- TailorInputPanel
- TailorResultCard
- TailorChangeCard
- KeywordMatchBadge
- AiSuggestionSheet
- BulletTransformationCard
- BeforeAfterDiff
- ExportPanel
- ApplicationTrackerCard

### WiseHire-specific components

- RoleCard
- CandidateCard
- PipelineBoard
- CandidateScoreRing
- BulkScreenDropzone
- ScreeningResultTable
- ScorecardTemplateCard
- JDWriterPanel
- ClientCard
- TalentPoolSearch

---

## 9. States every important component needs

Every important interactive component should define:

- Default
- Hover
- Focus
- Active/pressed
- Disabled
- Loading
- Empty
- Error
- Success
- Mobile layout

Do not design only the happy path.

---

## 10. Mobile-first rules

Mobile is a priority.

Rules:

- Cards become full-width.
- Sidebars become bottom nav or drawer.
- Tables become stacked cards.
- Important CTAs can become sticky bottom actions.
- AI sheets become bottom sheets.
- Touch targets must be at least 44px.
- Avoid horizontal scrolling.
- Resume preview should not crush the editor.
- Long forms need clear sectioning.
- Job description input must be comfortable on mobile.
- Tailor result cards must be easy to review one by one.

Mobile should not feel like a broken desktop layout.

---

## 11. Accessibility rules

The UI must be usable with keyboard, screen readers, and reduced motion.

Minimum rules:

- Visible focus states.
- Proper labels for inputs.
- Do not use placeholder as label.
- Keyboard-accessible dialogs and sheets.
- Escape closes overlays.
- Focus returns to trigger after closing modal/sheet.
- Buttons must have accessible names.
- Color cannot be the only way to communicate state.
- Text contrast must be readable.
- Loading states must explain what is happening.
- Reduced motion should disable large animations, shimmer, typewriter, and count-up effects.

---

## 12. Copywriting style

Voice:

- Direct
- Helpful
- Confident
- Practical
- Outcome-focused

WiseResume talks to job seekers:

```txt
Optimize your resume.
Get more interviews.
Tailor this resume to the job.
Review AI suggestions before applying.
Export your final resume.
```

WiseHire talks to recruiters:

```txt
Screen candidates faster.
Generate a job description.
Shortlist the strongest matches.
Move candidates through your pipeline.
```

Avoid:

- Generic AI hype
- Long paragraphs inside UI
- Technical backend language
- Unclear button labels like “Submit” when a specific action is known

---

## 13. Interactive preview

This package includes an interactive visual preview inside:

```txt
interactive-preview/
```

Open:

```txt
interactive-preview/WiseResume Design System.html
```

Use the preview to understand the visual direction.

It includes examples for:

- Foundations
- Brand switching
- Colors
- Type
- Motion
- Buttons
- Inputs
- Cards
- Badges
- ATS score ring
- AI sheet
- Toasts
- Dashboard patterns
- Editor patterns

Important:

The preview is a visual reference. Do not copy its code directly into production without adapting it to the actual app architecture.

---

## 14. Preview-to-production mapping

| Preview item | Production component or concept |
|---|---|
| Crimson primary button | WiseResume `Button variant="primary"` |
| Blue primary button | WiseHire `Button variant="primary"` |
| ATS score ring | `AtsScoreRing` / `JobMatchScore` |
| AI sheet | `AiSuggestionSheet` |
| Resume/editor pattern | `ResumeEditorLayout` |
| Dashboard cards | `MetricCard`, `ResumeCard`, `ActionCard` |
| Keyword badges | `KeywordMatchBadge` |
| Toasts | App notification system |
| Product switch | Marketing `ProductToggle` |
| WiseHire pipeline cards | `PipelineBoard`, `CandidateCard` |

---

## 15. Implementation guidance for coding agents

When using a coding agent, do not ask it to redesign the whole app in one pass.

Safe workflow:

1. Audit the existing app against this design system.
2. Identify mismatches and duplicated components.
3. Create a phased plan.
4. Map tokens to Tailwind/CSS variables.
5. Update core components first.
6. Update product-specific components second.
7. Apply to screens gradually.
8. Test mobile and accessibility after each phase.

Rules for coding agents:

- Do not rewrite the app.
- Do not change backend logic.
- Do not change business logic.
- Do not rename routes without approval.
- Do not remove existing features.
- Do not copy preview code blindly.
- Use existing shadcn/ui primitives where possible.
- Use tokens instead of hardcoded styles.
- Keep WiseResume and WiseHire identities separate.
- Make minimal safe changes.
- Produce a plan before implementation.

---

## 16. Recommended file reading order

For any AI agent:

1. `design.md`
2. `README.md`
3. `VISUAL_REFERENCE_GUIDE.md`
4. `DESIGN_SYSTEM.md`
5. `DESIGN_TOKENS.md`
6. `COMPONENT_LIBRARY.md`
7. `PRODUCT_FLOWS.md`
8. `MOBILE_RULES.md`
9. `ACCESSIBILITY.md`
10. `IMPLEMENTATION_GUIDE.md`
11. `AUDIT_CHECKLIST.md`
12. `CLAUDE_CODE_PROMPTS.md`
13. `interactive-preview/WiseResume Design System.html`

---

## 17. Best prompt to give an AI design agent

Use this when giving the package to a design AI such as Stitch or Claude Design:

```txt
Read the attached WiseResume design system package. Start with design.md.

WiseResume is the crimson/red job-seeker AI resume platform. WiseHire is the royal-blue recruiter/hiring platform. They share one design system but must keep separate brand identities.

Use interactive-preview/WiseResume Design System.html as the visual reference. Use the markdown documentation as the production rules.

Create designs that follow the existing system: clean SaaS UI, Inter typography, rounded cards, subtle shadows, strong hierarchy, mobile-first behavior, accessible states, and clear AI-assisted flows.

Do not invent a new brand. Do not mix WiseResume crimson and WiseHire blue in the same product surface unless it is a deliberate product switch or marketing comparison.

For any new screen, include desktop and mobile behavior, loading/empty/error/success states, and explain which components/tokens from the design system are used.
```

---

## 18. Best prompt to give a coding agent

Use this when giving the package to Claude Code, Codex, Replit, or similar:

```txt
Read the attached WiseResume design system package. Start with design.md, then README.md, VISUAL_REFERENCE_GUIDE.md, DESIGN_TOKENS.md, COMPONENT_LIBRARY.md, MOBILE_RULES.md, ACCESSIBILITY.md, IMPLEMENTATION_GUIDE.md, and AUDIT_CHECKLIST.md.

Your first task is audit only. Do not code yet.

Compare the current app against the design system. Identify token mismatches, duplicated UI components, inconsistent colors, typography issues, spacing issues, mobile problems, accessibility gaps, missing states, and screens that do not match the design system.

Use interactive-preview/WiseResume Design System.html only as a visual reference. Do not copy preview code directly into production.

After the audit, produce a phased implementation plan with files touched, risk level, testing steps, and rollback plan. Do not implement until I approve the plan.
```

---

## 19. Definition of done

The design system is successfully used when:

- WiseResume screens consistently use the crimson system.
- WiseHire screens consistently use the blue system.
- Core components are reusable.
- Product-specific components are documented and consistent.
- Mobile screens feel intentionally designed.
- AI suggestions are explainable and reviewable.
- Empty/loading/error/success states exist.
- Accessibility basics are respected.
- New screens can be created without inventing new styles.
- AI agents can understand the design direction from this package alone.

---

## 20. Short summary for agents

WiseResume is a crimson AI resume platform for job seekers. WiseHire is a royal-blue AI hiring platform for recruiters. The design should be clean, modern, SaaS-like, mobile-first, accessible, and centered around clear AI-assisted workflows. Use the interactive preview for visuals, the docs for implementation rules, and never mix the two brands randomly.
