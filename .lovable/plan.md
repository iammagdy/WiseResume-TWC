

## Fix: "New Section / More" Content Not Rendering

### Root Cause Analysis

After tracing the entire section flow end-to-end, the architecture works as follows:

1. **Steps** are static: `[contact, summary, experience, education, skills, more]`
2. **"More" tab** uses a secondary state `moreSubSection` to select which optional section to show
3. **Two entry points** set this state:
   - `AddSectionSheet` (inside the More tab content): calls `setMoreSubSection(s)` directly
   - `StepperNav "More Sections"` button/sheet: calls `handleMoreSectionSelect(sectionId)` which sets BOTH `activeTab='more'` AND `moreSubSection`

4. **Content rendering** (lines 565-588 of EditorPage.tsx): When `activeTab === 'more'`, it checks `moreSubSection` and renders the matching component via a chain of `{moreSubSection === 'awards' && ...}` conditionals

The chain of conditionals works correctly for all 8 sections. However, the fragility is that:
- There is **no fallback** if `moreSubSection` has an unrecognized value (silent blank render)
- The section mapping is **duplicated in 3 places**: EditorPage rendering, AddSectionSheet definition, and StepperNav MORE_SECTIONS -- any ID mismatch between them causes a silent failure
- The `renderEditorContent` callback depends on `moreSubSection` in its `useCallback` deps, which is correct

**Most likely root cause**: The content renders correctly when `handleMoreSectionSelect` is called (sets both states atomically), but if a user navigates to "More" via the section dropdown (which only calls `handleTabChange('more')` without touching `moreSubSection`), and `moreSubSection` is null, they see the AddSectionSheet picker -- not a blank screen. This flow actually works.

The real risk is an **edge case where `moreSubSection` gets set to a value that doesn't match any conditional** (e.g., from a stale store or URL param), resulting in a blank content area with only the "All Sections" back button visible. The fix is to add robustness via a config-driven lookup.

### Proposed Changes

**File: `src/pages/EditorPage.tsx`**

1. **Create a section component map** replacing the chain of 8 conditionals with a single config-driven lookup. This eliminates the possibility of ID mismatches causing blank renders:

```typescript
const MORE_SECTION_COMPONENTS: Record<string, {
  icon: typeof Trophy;
  title: string;
  hasAI: boolean;
  Component: React.LazyExoticComponent<React.ComponentType>;
}> = {
  awards: { icon: Trophy, title: 'Awards & Achievements', hasAI: true, Component: AwardsSection },
  projects: { icon: Rocket, title: 'Projects', hasAI: true, Component: ProjectsSection },
  certifications: { icon: Award, title: 'Certifications', hasAI: true, Component: CertificationsSection },
  publications: { icon: BookOpen, title: 'Publications', hasAI: true, Component: PublicationsSection },
  volunteering: { icon: Heart, title: 'Volunteering', hasAI: true, Component: VolunteeringSection },
  languages: { icon: Globe, title: 'Languages', hasAI: true, Component: LanguagesSection },
  hobbies: { icon: Palette, title: 'Hobbies & Interests', hasAI: false, Component: HobbiesSection },
  references: { icon: Users, title: 'References', hasAI: false, Component: ReferencesSection },
};
```

2. **Replace the conditional chain** (lines 576-584) with a config lookup:

```tsx
{(() => {
  const config = MORE_SECTION_COMPONENTS[moreSubSection!];
  if (!config) {
    // Fallback: unknown sub-section, reset to picker
    setMoreSubSection(null);
    return null;
  }
  const { icon, title, hasAI, Component } = config;
  return (
    <SectionCard icon={icon} title={title} action={hasAI ? <SectionAIAction section={moreSubSection!} /> : undefined}>
      <Component />
    </SectionCard>
  );
})()}
```

3. **Add a guard in `handleTabChange`**: When switching TO the "more" tab via the section dropdown (not via "More Sections"), reset `moreSubSection` to null so users always see the section picker first:

```typescript
const handleTabChange = useCallback((newTab: string) => {
  if (newTab !== 'more') {
    // Clear sub-section when leaving More
    setMoreSubSection(null);
  }
  setActiveTab(newTab);
  scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
}, []);
```

This way, tapping "More" in the section dropdown always shows the AddSectionSheet picker, while tapping a specific section via "More Sections" sheet goes directly to that section.

### What Stays the Same

- All 8 lazy-loaded section components (unchanged)
- All handlers (handleMoreSectionSelect, etc.)
- StepperNav component (unchanged)
- AddSectionSheet component (unchanged)
- Data model, types, API calls (unchanged)
- All built-in sections (Contact, Summary, Work, Education, Skills) (unchanged)

### Technical Summary

| File | Change |
|------|--------|
| `src/pages/EditorPage.tsx` | Add `MORE_SECTION_COMPONENTS` config map; replace 8-line conditional chain with config lookup + fallback; clear `moreSubSection` on tab change away from "more" |

3 targeted changes. Zero logic changes to existing sections. Adds a fallback for unknown sub-section IDs that prevents blank renders.

