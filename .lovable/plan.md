

## LinkedIn Import Enhancement + 18 New Templates

This plan adds a PDF upload option to the existing LinkedIn import flow and expands the template library from 12 to 30 templates, organized into 4 categories.

---

### Part 1: LinkedIn Import with PDF Upload

The existing `LinkedInImportSheet.tsx` already has a robust paste-to-parse flow. We'll enhance it with a second import method (PDF upload) by adding a method selection step before the paste/upload screen.

**Changes to existing files:**

1. **`src/components/settings/LinkedInImportSheet.tsx`** -- Major update
   - Add a new initial state `'method-select'` before `'idle'`
   - Show two method cards: "Paste Profile Text" and "Upload LinkedIn PDF"
   - "Paste" flows into the existing paste textarea (current `'idle'` state)
   - "Upload PDF" opens a file picker (`.pdf` only), sends file to `parse-resume` edge function (already exists and handles PDF parsing), then feeds the result into the same preview/selection flow
   - Add file upload state management, progress indicator
   - Both methods converge at the same `'preview'` state with section checkboxes

2. **`src/pages/DashboardPage.tsx`** -- Minor update
   - Add "Import LinkedIn" as a new `ActionCard` in the empty-state grid (alongside existing New Resume, Import PDF, etc.)
   - Opens the `LinkedInImportSheet` directly from the dashboard
   - Wire `onImport` callback to create a new resume from imported data

3. **`src/hooks/useCoverLetters.ts`** -- No change (already updated)

**No new edge functions needed** -- the existing `parse-resume` edge function already handles PDF extraction, and `parse-linkedin` handles text parsing. The PDF upload will use `parse-resume` with LinkedIn PDF format detection.

**No database changes needed** -- all data flows into the existing `resumes` table.

---

### Part 2: Template Expansion (12 to 30)

**New template categories** (updating from 3 to 4):
- Professional (expanded)
- Creative (expanded)
- Tech (expanded)
- Minimalist (new category)

**18 new template components to create:**

| # | ID | Name | Category | ATS | Layout |
|---|------|------|----------|-----|--------|
| 1 | `corporate` | Corporate | professional | high | linear |
| 2 | `banking` | Banking | professional | high | linear |
| 3 | `consulting` | Consulting | professional | high | linear |
| 4 | `federal` | Federal | professional | high | linear |
| 5 | `legal` | Legal | professional | high | linear |
| 6 | `marketing` | Marketing | creative | medium | linear |
| 7 | `designer` | Designer | creative | medium | fixed-sidebar |
| 8 | `portfolio` | Portfolio | creative | medium | linear |
| 9 | `startup` | Startup | creative | high | linear |
| 10 | `infographic` | Infographic | creative | low | linear |
| 11 | `data-science` | Data Science | tech | high | linear |
| 12 | `devops` | DevOps | tech | high | linear |
| 13 | `cyber` | Cybersecurity | tech | high | linear |
| 14 | `product` | Product | tech | high | linear |
| 15 | `clean` | Clean | minimalist | high | linear |
| 16 | `swiss` | Swiss | minimalist | high | linear |
| 17 | `mono` | Mono | minimalist | high | linear |
| 18 | `zen` | Zen | minimalist | high | linear |

**Files to create (18 new template files):**
- `src/components/templates/CorporateTemplate.tsx`
- `src/components/templates/BankingTemplate.tsx`
- `src/components/templates/ConsultingTemplate.tsx`
- `src/components/templates/FederalTemplate.tsx`
- `src/components/templates/LegalTemplate.tsx`
- `src/components/templates/MarketingTemplate.tsx`
- `src/components/templates/DesignerTemplate.tsx`
- `src/components/templates/PortfolioTemplate.tsx`
- `src/components/templates/StartupTemplate.tsx`
- `src/components/templates/InfographicTemplate.tsx`
- `src/components/templates/DataScienceTemplate.tsx`
- `src/components/templates/DevOpsTemplate.tsx`
- `src/components/templates/CyberTemplate.tsx`
- `src/components/templates/ProductTemplate.tsx`
- `src/components/templates/CleanTemplate.tsx`
- `src/components/templates/SwissTemplate.tsx`
- `src/components/templates/MonoTemplate.tsx`
- `src/components/templates/ZenTemplate.tsx`

Each template follows the established pattern: `memo()` wrapped, accepts `ResumeData` prop, renders a 612x792 layout with inline styles for PDF generation compatibility.

**Files to modify:**

1. **`src/types/resume.ts`** -- Expand `TemplateId` union type with 18 new IDs, add `'minimalist'` to the `TemplateInfo.category` type

2. **`src/lib/templateData.ts`** -- Add 18 new entries to the `templates` array with names, descriptions, ATS scores, and categories

3. **`src/lib/templateConfig.ts`** -- Add 18 new entries to `TEMPLATE_CONFIGS` with layout, page break, and photo support settings

4. **`src/components/editor/TemplateThumbnail.tsx`** -- Add 18 new lazy imports and entries in `templateComponents` map

5. **`src/components/editor/TemplateSelector.tsx`** -- No structural changes needed (already loops over `templates` array dynamically)

6. **`src/pages/TemplatesPage.tsx`** -- Add `'minimalist'` to `FilterCategory` type and `FILTER_CHIPS` array

7. **`src/lib/pdfGenerator.ts`** -- Add template imports for PDF export (lazy loaded)

8. **`src/hooks/useProfile.ts`** -- Update `CAREER_LEVEL_RECOMMENDATIONS` in TemplateSelector to include new template IDs

---

### Technical Details

**Template design approach:**
- Each template uses Tailwind classes for screen rendering and inline styles where needed for PDF
- All templates follow the same section structure: Contact Header, Summary, Experience, Education, Skills, Certifications
- `data-section` attributes on section elements for page break support
- Responsive within the 612px container (US Letter proportions)

**Mobile gallery improvements:**
- The `'minimalist'` filter chip is added to both `TemplatesPage` and `TemplateSelector`
- Lazy loading via `React.lazy()` in `TemplateThumbnail` ensures only visible templates load
- `useInView` with `triggerOnce` prevents re-rendering off-screen templates

**LinkedIn PDF upload flow:**
- User taps "Upload LinkedIn PDF" in method selection
- File picker opens with `.pdf` accept filter
- PDF is sent to the existing `parse-resume` edge function
- The AI prompt in `parse-resume` already extracts structured resume data from PDFs
- Extracted data maps to the same `LinkedInData` interface for the preview/checkbox step
- User selects sections and confirms import

**Implementation order:**
1. Update TypeScript types (`TemplateId`, `TemplateInfo`)
2. Create all 18 template components (batch)
3. Update `templateData.ts`, `templateConfig.ts`, `TemplateThumbnail.tsx`
4. Update `TemplatesPage.tsx` filter chips
5. Update `pdfGenerator.ts` template map
6. Enhance `LinkedInImportSheet.tsx` with method selection + PDF upload
7. Add LinkedIn import card to `DashboardPage.tsx`
8. Test on 375px viewport

