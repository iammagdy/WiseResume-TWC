

# Empty State Redesign - Transform Blank Sections into Learning Opportunities

## Overview

Replace the current minimal empty states in each editor section with rich, instructional cards featuring real examples (using the Wise Megz persona), collapsible example panels, and prominent action buttons including AI quick-start options.

## What Changes

### New Reusable Component: `src/components/editor/SectionEmptyState.tsx`

A shared empty state wrapper accepting:
- `icon` - section icon (LucideIcon)
- `title` - section name
- `exampleContent` - ReactNode for the example card
- `actions` - array of `{ label, icon, onClick, variant }` button configs
- `showExample` / `onToggleExample` - collapsible example toggle

Features:
- Glass-surface card with dashed border
- Collapsible "Show Example / Hide Example" toggle using Collapsible from Radix
- Staggered entrance animation via framer-motion
- Stored toggle preference in localStorage (`wr-show-examples`) so users who hide examples keep them hidden

### New Config File: `src/lib/emptyStateExamples.ts`

A pure data file containing all example content and action definitions per section. This keeps example data (Wise Megz persona content) separate from component logic and easy to update.

Contains:
- Contact example data object
- Summary example text
- Experience example entries (with bullet points)
- Education example entry
- Skills example categories (Technical, Soft, Languages)

### Modified: `src/components/editor/ContactSection.tsx`

When all contact fields are empty (no fullName, no email, no phone), render the `SectionEmptyState` instead of the form fields.

**Example card content:**
- Wise Megz
- wise.megz@email.com
- +20 123 456 7890
- Cairo, Egypt
- linkedin.com/in/wisemegz

**Actions:**
- "Start Adding Your Info" (primary) - focuses the fullName input by scrolling to it and triggering a state change to show the form
- The form always renders but is hidden behind the empty state when all fields are blank. Clicking the button sets a `started` state to true, hiding the empty state and showing the form.

### Modified: `src/components/editor/SummarySection.tsx`

When summary is empty or undefined, show the empty state.

**Example card content:**
> "Experienced software engineer with 5+ years building scalable web applications. Specialized in React and Node.js with a track record of improving system performance by up to 40%. Passionate about clean code and mentoring junior developers."

**Actions:**
- "Start Writing" (outline) - sets `started` to true, shows the textarea, focuses it
- "Let AI Write This" (primary, Sparkles icon) - triggers the existing `handleAction('generate')` to invoke AI summary generation

### Modified: `src/components/editor/ExperienceSection.tsx`

Replace the current minimal empty state (lines 162-169).

**Example card content:**
A formatted mock job entry:
- **Senior Developer**
- Tech Company | 2022 - Present
- Three bullet points with metrics (40% performance, team of 5, 30% bug reduction)

**Actions:**
- "Add Your First Job" (outline) - calls existing `addExperience()`
- "Import from LinkedIn" (outline, with LinkedIn icon) - navigates to `/upload` with a query param or opens the upload sheet
- "See More Examples" (ghost) - toggles the example visibility with additional industry-specific examples

### Modified: `src/components/editor/EducationSection.tsx`

Replace the current minimal empty state (lines 111-118).

**Example card content:**
- Bachelor of Science in Computer Science
- Cairo University | 2018 - 2022
- GPA: 3.8/4.0
- Relevant coursework: Data Structures, Algorithms, Machine Learning

**Actions:**
- "Add Education" (outline) - calls existing `addEducation()`
- "I'm Self-Taught" (ghost) - adds a pre-configured education entry with institution "Self-Taught / Online Learning" and degree "Professional Certifications & Courses", then expands it for editing

### Modified: `src/components/editor/SkillsSection.tsx`

Replace the current minimal empty text (lines 139-143).

**Example card content:**
A categorized grid:
- **Technical:** React, Node.js, Python, SQL, Git
- **Soft Skills:** Leadership, Communication, Problem-solving, Team collaboration
- **Languages:** English (Fluent), Arabic (Native)

**Actions:**
- "Add Your Skills" (outline) - focuses the existing skill input field
- "AI Suggest Skills" (primary, Sparkles icon) - triggers existing `handleAIAction('generate')` to auto-suggest skills based on work experience

## Technical Details

### SectionEmptyState Component Structure

```
<div className="p-6 rounded-xl border border-dashed border-border animate-in fade-in-0 duration-300">
  <Icon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
  
  <Collapsible open={showExample} onOpenChange={onToggleExample}>
    <CollapsibleTrigger className="...">
      {showExample ? 'Hide Example' : 'Show Example'}
      <ChevronDown / ChevronUp />
    </CollapsibleTrigger>
    <CollapsibleContent>
      <div className="mt-3 p-4 rounded-lg bg-muted/30 border border-border/50">
        <p className="text-xs text-muted-foreground mb-2 font-medium">Example</p>
        {exampleContent}
      </div>
    </CollapsibleContent>
  </Collapsible>
  
  <div className="flex flex-col sm:flex-row gap-2 mt-4">
    {actions.map(action => <Button ... />)}
  </div>
</div>
```

### Detection Logic

Each section component adds a simple check:
- **Contact**: `!contactInfo.fullName && !contactInfo.email && !contactInfo.phone`
- **Summary**: `!summary || summary.trim() === ''`
- **Experience**: `experience.length === 0` (already exists)
- **Education**: `education.length === 0` (already exists)
- **Skills**: `skills.length === 0` (already exists)

A `started` state (useState boolean, default false) lets users dismiss the empty state and see the actual form/input even before adding content. This resets if content is cleared.

### Files to Create
1. `src/components/editor/SectionEmptyState.tsx` - Reusable empty state wrapper
2. `src/lib/emptyStateExamples.ts` - Example content and action configs

### Files to Modify
1. `src/components/editor/ContactSection.tsx` - Add empty state with example card and "Start Adding" button
2. `src/components/editor/SummarySection.tsx` - Add empty state with example and "Let AI Write This" button
3. `src/components/editor/ExperienceSection.tsx` - Replace minimal empty state with rich example
4. `src/components/editor/EducationSection.tsx` - Replace minimal empty state with example and "I'm Self-Taught" option
5. `src/components/editor/SkillsSection.tsx` - Replace minimal empty text with categorized example grid and "AI Suggest Skills"

### No Database Changes Required

All changes are purely UI/client-side within existing section components.

