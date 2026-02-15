

## Expand Resume Editor "More" Sections

### Current State

The editor already has 6 "More" sub-sections: Awards, Projects, Publications, Volunteering, Hobbies, and References -- all with full form components and TypeScript types. What's **missing** from the user's request:

1. **Certifications section** -- type exists (`Certification` in resume.ts), but no `CertificationsSection` editor component
2. **Languages section** -- neither the type nor the component exist
3. **Item count badges** on the AddSectionSheet grid tiles
4. **AI Assist buttons** on each "More" sub-section's SectionCard
5. **Drag-and-drop reordering** within each section's entry list

Drag-and-drop reordering is a significant feature that would require adding a drag library. To keep the scope manageable and avoid introducing instability in the editor (which has had render-loop issues), I recommend implementing **manual reorder buttons** (up/down arrows) instead. This is simpler, touch-friendly, and doesn't require any new dependencies.

### Changes

#### 1. New Type: `Language` in `src/types/resume.ts`

Add the `Language` interface and update `ResumeData` to include `languages?: Language[]`:

```text
interface Language {
  id: string;
  name: string;
  proficiency: 'native' | 'fluent' | 'professional' | 'basic';
}
```

Also add `'languages'` to the `SectionId` union type and `'certifications'` if not already there.

#### 2. New Component: `src/components/editor/CertificationsSection.tsx`

Follows the exact same pattern as `AwardsSection`:
- Reads `certifications` from `useResumeStore`
- Accordion-style expand/collapse per entry
- Fields: Name, Issuing Organization, Date, Expiry Date (optional), Credential ID (optional), Credential URL (optional)
- Add/Delete buttons with haptic feedback
- 44px minimum touch targets, h-12 inputs

#### 3. New Component: `src/components/editor/LanguagesSection.tsx`

Simpler card-based layout (similar to HobbiesSection):
- Reads `languages` from `useResumeStore`
- Each entry: language name input + proficiency dropdown (Native, Fluent, Professional, Basic)
- Add/Delete with haptic feedback
- Uses a simple `<select>` or styled radio group for proficiency level

#### 4. Update `src/components/editor/AddSectionSheet.tsx`

- Add Certifications and Languages to the `OPTIONAL_SECTIONS` array (with `Award` icon for Certifications, `Globe` icon for Languages)
- Show item count badges: a small pill showing the number of entries (e.g., "3") next to the check icon for sections with content

#### 5. Update `src/pages/EditorPage.tsx`

- Import `CertificationsSection` and `LanguagesSection`
- Add routing for `moreSubSection === 'certifications'` and `moreSubSection === 'languages'` in the "more" tab
- Add `SectionAIAction` to each "More" sub-section's `SectionCard` (Awards, Projects, Publications, Volunteering, Certifications, Languages) -- Hobbies and References don't benefit from AI assist

#### 6. Update `src/components/editor/InlineAIButton.tsx`

- Expand `SectionType` union to include the new section types: `'awards' | 'projects' | 'publications' | 'volunteering' | 'certifications' | 'languages'`
- Add AI action configs for each new section type (e.g., "Generate" and "Improve" actions)

#### 7. Update `src/components/editor/SectionAIAction.tsx`

- Expand the `contentMap` and `onApply` switch to handle the new section types, mapping them to the correct resume data fields

#### 8. Add Reorder Controls to All "More" Sections

Add up/down arrow buttons to each entry's header row in all 8 "More" section components (Awards, Projects, Publications, Volunteering, Hobbies, References, Certifications, Languages). These swap adjacent entries in the array via `updateResume`. No new dependencies needed.

### What Does NOT Change

- Contact, Summary, Work, Education, Skills sections -- completely untouched
- StepperNav and the 6-step structure
- AI Studio bar and all sheet functionality
- Bottom tab bar
- Progress tracking and completion percentages
- Auto-save logic
- Template rendering
- Live Preview feature

### File Summary

| File | Action |
|------|--------|
| `src/types/resume.ts` | Add `Language` interface, update `ResumeData` and `SectionId` |
| `src/components/editor/CertificationsSection.tsx` | Create new |
| `src/components/editor/LanguagesSection.tsx` | Create new |
| `src/components/editor/AddSectionSheet.tsx` | Add 2 new tiles + item count badges |
| `src/pages/EditorPage.tsx` | Add imports + 2 new routing entries + AI actions on More sub-sections |
| `src/components/editor/InlineAIButton.tsx` | Expand `SectionType` + add action configs |
| `src/components/editor/SectionAIAction.tsx` | Expand content map + apply handlers |
| `src/components/editor/AwardsSection.tsx` | Add reorder (up/down) buttons |
| `src/components/editor/ProjectsSection.tsx` | Add reorder buttons |
| `src/components/editor/PublicationsSection.tsx` | Add reorder buttons |
| `src/components/editor/VolunteeringSection.tsx` | Add reorder buttons |
| `src/components/editor/HobbiesSection.tsx` | Add reorder buttons |
| `src/components/editor/ReferencesSection.tsx` | Add reorder buttons |

