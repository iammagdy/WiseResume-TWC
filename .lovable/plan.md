

## Fix: Allow Multiple "More" Sub-Sections to Be Tracked and Counted

### Problem

The stepper counter and section sheet treat "More" as a single slot. When a user adds Awards AND Projects AND Languages, the counter still only shows "X of 6 complete" (5 core + 1 "more"). It should show "X of 8 complete" (5 core + 3 added sections). The section sheet also only shows 6 rows instead of listing each added sub-section individually.

### Root Cause

Three things cap it at 6:

1. **`steps` array** is static with one `{ id: 'more', label: 'More' }` entry
2. **`sectionStatus`** only tracks 5 core sections -- no completion status for sub-sections
3. **Counter logic** counts the `more` entry as 0 or 1

### Solution

Dynamically detect which "more" sub-sections have data in the resume, and include them in both the steps list and the completion tracking.

### Changes

#### File: `src/pages/EditorPage.tsx`

**1. Make `steps` dynamic based on resume data**

Instead of a static array, derive it from the resume. Detect which optional sections have data (non-empty arrays) and insert them before the "More" entry:

```tsx
const steps = useMemo(() => {
  const base = [
    { id: 'contact', label: 'Contact' },
    { id: 'summary', label: 'Summary' },
    { id: 'experience', label: 'Work' },
    { id: 'education', label: 'Education' },
    { id: 'skills', label: 'Skills' },
  ];
  // Detect which optional sections have data
  if (currentResume) {
    const MORE_SECTION_META: Record<string, string> = {
      awards: 'Awards', projects: 'Projects', certifications: 'Certifications',
      publications: 'Publications', volunteering: 'Volunteering',
      languages: 'Languages', hobbies: 'Hobbies', references: 'References',
    };
    for (const [id, label] of Object.entries(MORE_SECTION_META)) {
      const data = currentResume[id as keyof typeof currentResume];
      if (Array.isArray(data) && data.length > 0) {
        base.push({ id, label });
      }
    }
  }
  // Always add "More" as the last entry to allow adding new sections
  base.push({ id: 'more', label: 'More' });
  return base;
}, [currentResume]);
```

**2. Expand `sectionStatus` to include optional sections**

Add completion checks for optional sections (has at least 1 item = complete):

```tsx
const sectionStatus = useMemo(() => {
  const status: Record<string, boolean> = {
    contact: sectionScores.contact >= 100,
    summary: sectionScores.summary >= 100,
    experience: sectionScores.experience >= 100,
    education: sectionScores.education >= 100,
    skills: sectionScores.skills >= 100,
  };
  if (currentResume) {
    const optionalIds = ['awards','projects','certifications','publications','volunteering','languages','hobbies','references'];
    for (const id of optionalIds) {
      const data = currentResume[id as keyof typeof currentResume];
      if (Array.isArray(data) && data.length > 0) {
        status[id] = true;
      }
    }
  }
  return status;
}, [sectionScores, currentResume]);
```

**3. Handle clicking on added sub-sections in the stepper**

Update `handleTabChange` so that clicking an optional section ID (e.g., "awards") navigates to the `more` tab with that sub-section active:

```tsx
const handleTabChange = useCallback((newTab: string) => {
  const optionalIds = ['awards','projects','certifications','publications','volunteering','languages','hobbies','references'];
  if (optionalIds.includes(newTab)) {
    setActiveTab('more');
    setMoreSubSection(newTab);
  } else {
    if (newTab !== 'more') {
      setMoreSubSection(null);
    }
    setActiveTab(newTab);
  }
  haptics.light();
}, []);
```

#### File: `src/components/editor/StepperNav.tsx`

**4. Update counter to exclude only the "more" pseudo-step**

The counter should count all steps except the `more` entry (which is just the "add more" button):

```tsx
{steps.filter(s => s.id !== 'more' && completedSteps[s.id]).length} of {steps.filter(s => s.id !== 'more').length} complete
```

This reverts to the simpler logic since optional sections are now their own entries in `steps`.

**5. Add icons for optional section IDs to `STEP_ICONS`**

Extend the icon map so optional sections show correct icons in the stepper and sheet:

```tsx
const STEP_ICONS: Record<string, typeof User> = {
  contact: User, summary: AlignLeft, experience: Briefcase,
  education: GraduationCap, skills: Wrench, more: Plus,
  awards: Trophy, projects: Rocket, certifications: Award,
  publications: BookOpen, volunteering: Heart,
  languages: Globe, hobbies: Palette, references: Users,
};
```

### Result

- User adds Awards: counter shows "X of 6 complete", sheet lists 6 real sections + "More" button
- User adds Awards + Projects + Languages: counter shows "X of 8 complete", sheet lists 8 sections + "More"
- Clicking any listed section in the sheet navigates directly to it
- "More" row at the bottom always available for adding additional sections
- When all optional data is removed, counter returns to "X of 5 complete"

### What Stays the Same

- All button handlers, export logic, and routes unchanged
- No component or prop renames
- Resume data model unchanged
- Desktop stepper still works the same way (just with more steps when sections are added)

### Summary

| File | Change |
|------|--------|
| `src/pages/EditorPage.tsx` | Dynamic `steps` array, expanded `sectionStatus`, updated `handleTabChange` for optional sections |
| `src/components/editor/StepperNav.tsx` | Revert counter to exclude only `more`, add optional section icons to `STEP_ICONS` |
