
## Additional Resume Sections + PDF Import Enhancement

Two additive features: 6 new optional resume sections in the editor, and improvements to the existing PDF import flow. No existing files are deleted or broken.

---

### Part 1: Additional Resume Sections

**Strategy**: Add 6 new optional sections to `ResumeData` as optional arrays. The editor gets a new "More Sections" tab that shows an "Add Section" grid. Sections only appear when they have content, keeping the default 5-step flow unchanged.

#### Type Changes

**`src/types/resume.ts`** -- Add new interfaces and update `ResumeData`:

```
Award { id, title, issuer, date, description? }
Project { id, name, role, startDate, endDate, technologies: string[], description, url?, githubUrl? }
Publication { id, title, publisher, date, coAuthors?, url?, description? }
Volunteering { id, organization, role, startDate, endDate, description, hours? }
Hobby { id, name, description?, visible: boolean }
Reference { id, name, title, company, email, phone, relationship, availableOnRequest?: boolean }
```

Add to `ResumeData`:
```
awards?: Award[]
projects?: Project[]
publications?: Publication[]
volunteering?: Volunteering[]
hobbies?: Hobby[]
references?: Reference[]
```

Update `SectionId` type to include new sections.

#### Database Migration

Add 6 new JSONB columns to the `resumes` table:
```sql
ALTER TABLE public.resumes
  ADD COLUMN IF NOT EXISTS awards jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS projects jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS publications jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS volunteering jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS hobbies jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "references" jsonb DEFAULT '[]';
```

#### Data Flow Updates

**`src/hooks/useResumes.ts`** -- Update `dbToResumeData()` and `resumeDataToDb()` to include the 6 new fields. Update `parseDbResume()` to handle the new columns.

**`src/store/resumeStore.ts`** -- Update `defaultResume` to include empty arrays for new sections.

#### New Editor Components

6 new section editor components following the existing pattern (like `ExperienceSection.tsx`):

- **`src/components/editor/AwardsSection.tsx`** -- List of award entries with add/edit/delete
- **`src/components/editor/ProjectsSection.tsx`** -- Project entries with technology tags
- **`src/components/editor/PublicationsSection.tsx`** -- Publication entries
- **`src/components/editor/VolunteeringSection.tsx`** -- Volunteering entries
- **`src/components/editor/HobbiesSection.tsx`** -- Simple list with visibility toggles
- **`src/components/editor/ReferencesSection.tsx`** -- Reference entries with "Available upon request" toggle

Each component:
- Uses `useResumeStore` to read/write data
- 48px height inputs, 16px font (no iOS zoom)
- "Add Another" button with haptic feedback
- `active:scale-95` on all interactive elements
- Tag input for technologies (Projects section)

#### Add Section Sheet

**`src/components/editor/AddSectionSheet.tsx`** -- Bottom sheet (75% height)
- 2-column grid of section cards
- Each card: icon + section name + brief description
- Already-added sections show a checkmark
- Tap to add section (creates empty array, navigates to that section tab)

#### Editor Integration

**`src/pages/EditorPage.tsx`** -- Changes:
- Add a 6th step to the stepper: "More" (with a `Plus` icon)
- The "More" tab renders `AddSectionSheet` inline (not as a bottom sheet) showing which optional sections are active
- When a section is active, it appears as a sub-tab under "More"
- Add states for each new section's visibility
- Import lazy-loaded section components
- Wire section rendering in the tab content area

**`src/lib/resumeCompletionRules.ts`** -- No changes needed. The 5 core sections remain the completion criteria. Optional sections are bonus content.

#### Template Rendering

**All 30 template components** -- Add rendering blocks for the new sections at the bottom, after certifications. Each template renders sections conditionally (only when array has entries). Example pattern:

```tsx
{resume.awards?.length > 0 && (
  <section data-section="awards">
    <h2>Awards</h2>
    {resume.awards.map(award => (...))}
  </section>
)}
```

This is a non-breaking change -- templates that don't have the new sections yet will simply not render them (undefined/empty arrays).

#### PDF Generation

**`src/lib/pdfGenerator.ts`** -- Add rendering for new sections in PDF output. Same conditional pattern as templates.

#### AI Parsing

**`supabase/functions/parse-resume/index.ts`** -- Update the AI prompt to also extract awards, projects, publications, volunteering from uploaded resumes when detected.

---

### Part 2: PDF Import Enhancement

The PDF import flow already exists and is fully functional (`UploadPage.tsx` with `ImportUploadSheet`, `ImportReviewSheet`, OCR fallback, multi-format support). The user's request describes features that are **already implemented**:

- Upload modal with file type selector (PDF, Word, Image, JSON, HTML)
- Processing steps with progress indicators
- Review sheet with section checkboxes
- OCR fallback for scanned PDFs
- Error handling (password protected, corrupted, no text)
- Template selection before save

**Enhancements to add:**

1. **`src/components/upload/ImportReviewSheet.tsx`** -- Add checkboxes for new sections (awards, projects, publications, volunteering) when detected in parsed data

2. **`src/pages/UploadPage.tsx`** -- Update `handleImportConfirm` to include new section fields in the filtered data

3. **`src/lib/pdfParser.ts`** -- Update `getExtractionSummary` to count new sections

4. **Dashboard access** -- The dashboard already has an "Import PDF" action card that navigates to `/upload`. No changes needed.

---

### Technical Details

**New files to create (7):**
- `src/components/editor/AwardsSection.tsx`
- `src/components/editor/ProjectsSection.tsx`
- `src/components/editor/PublicationsSection.tsx`
- `src/components/editor/VolunteeringSection.tsx`
- `src/components/editor/HobbiesSection.tsx`
- `src/components/editor/ReferencesSection.tsx`
- `src/components/editor/AddSectionSheet.tsx`

**Files to modify:**
- `src/types/resume.ts` -- New interfaces + update ResumeData
- `src/hooks/useResumes.ts` -- DB mapping for new fields
- `src/store/resumeStore.ts` -- Default resume includes new empty arrays
- `src/pages/EditorPage.tsx` -- "More" tab with sub-section navigation
- `src/components/editor/StepperNav.tsx` -- Support 6th "More" step (may need minor layout adjustment)
- `src/lib/pdfParser.ts` -- Update extraction summary
- `src/components/upload/ImportReviewSheet.tsx` -- Checkboxes for new sections
- `src/pages/UploadPage.tsx` -- Filter new sections in import confirm
- `supabase/functions/parse-resume/index.ts` -- Expand AI prompt for new sections
- All 30 template files -- Add conditional rendering for new sections
- `src/lib/pdfGenerator.ts` -- PDF rendering for new sections

**Database migration:**
- Add 6 JSONB columns to `resumes` table (all default to `'[]'`)

**Mobile-first patterns:**
- 48px input heights, 44px touch targets
- Tag inputs use chip-style with X button to remove
- "Add Another" buttons with `active:scale-95` + haptic
- Section cards in 2-column grid for "Add Section" UI
- All new sections scrollable within the existing editor scroll container

**Implementation order:**
1. Database migration (add 6 columns)
2. Type updates (`resume.ts`)
3. Data flow updates (`useResumes.ts`, `resumeStore.ts`)
4. Create 6 section editor components
5. Create AddSectionSheet
6. Update EditorPage with "More" tab
7. Update all 30 templates with new section rendering
8. Update PDF generator
9. Update parse-resume edge function prompt
10. Update import review sheet for new sections
11. Test on 375px viewport
