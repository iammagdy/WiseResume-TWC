
# Template Unification & AI Superpowers for Every Section

## Overview
This plan addresses two major improvements:
1. **Fix template mismatch**: Ensure the preview matches exactly what gets exported as PDF
2. **Add AI superpowers**: Integrate AI assistance into every editor section (Contact, Summary, Work, Education, Skills)

---

## Part 1: Template Preview-to-PDF Alignment

### The Problem
Currently, there are two separate rendering systems:
- **Preview**: React components using Tailwind CSS (e.g., `ModernTemplate.tsx`)
- **PDF Export**: Manual drawing with `pdf-lib` (e.g., `generateModernPDF()`)

These don't match because they're completely independent implementations.

### Solution: Use HTML-to-Canvas-to-PDF Approach
Instead of maintaining two rendering systems, we'll render the actual React template to a canvas and convert it to PDF. This guarantees what you see is what you get (WYSIWYG).

### Technical Approach
1. Install `html2canvas` library for capturing the rendered template
2. Create a hidden render container that matches PDF dimensions exactly (612x792 pixels for Letter size)
3. Capture the template as a high-resolution canvas
4. Convert the canvas to PDF using `pdf-lib`

### Files to Modify
| File | Changes |
|------|---------|
| `package.json` | Add `html2canvas` dependency |
| `src/lib/pdfGenerator.ts` | Rewrite to use HTML capture approach |
| `src/pages/PreviewPage.tsx` | Add hidden render container for accurate capture |

### Benefits
- Perfect visual match between preview and PDF
- Single source of truth for template styling
- Easier to maintain (only update React components)
- All templates automatically work

---

## Part 2: AI Superpowers for Every Section

Add intelligent AI assistance to each editor section, giving users the power to generate, improve, and optimize their resume content with a single tap.

### AI Features by Section

#### 1. Contact Section
- **Suggest LinkedIn URL format**: Auto-format LinkedIn URL properly
- **Validate email format**: Check and suggest corrections
- **Format phone number**: Standardize phone format
- **Generate portfolio suggestions**: Based on skills

#### 2. Summary Section (Most Impactful)
- **Generate from scratch**: AI writes summary based on experience/skills
- **Improve existing**: Enhance current summary for impact
- **Make it ATS-friendly**: Optimize for applicant tracking systems
- **Tailor to job**: Rewrite for specific job descriptions
- **Make it shorter/longer**: Adjust length

#### 3. Experience Section
- **Improve description**: Rewrite for impact with action verbs
- **Add metrics**: Suggest quantifiable achievements
- **Generate bullet points**: Create achievement bullets from description
- **Suggest missing achievements**: Based on role/industry
- **Reorder for impact**: Prioritize most impressive content

#### 4. Education Section
- **Suggest relevant coursework**: Based on target role
- **Add honors/awards**: Suggest formatting
- **Improve GPA presentation**: Format appropriately

#### 5. Skills Section (Partially exists)
- **Suggest skills from experience**: Extract from job descriptions
- **Categorize skills**: Group by type (Technical, Soft, Tools)
- **Identify missing skills**: Based on industry standards
- **Remove outdated skills**: Flag skills that may hurt ATS

### UI Design: AI Action Bar

Each section will have an AI action bar with relevant quick actions:

```text
┌─────────────────────────────────────────────────────────────────┐
│  [Section Content]                                              │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ✨ AI Assist                                                   │
│  ┌─────────┐ ┌─────────────┐ ┌──────────────┐ ┌───────┐        │
│  │Generate │ │ Improve     │ │ ATS Optimize │ │ More ▼│        │
│  └─────────┘ └─────────────┘ └──────────────┘ └───────┘        │
└─────────────────────────────────────────────────────────────────┘
```

### New Edge Function: `enhance-section`

Create a single, versatile edge function that handles all section enhancements:

```typescript
// Request format
{
  section: "summary" | "experience" | "education" | "skills" | "contact",
  action: "generate" | "improve" | "ats_optimize" | "shorten" | "expand" | "add_metrics",
  currentContent: { ... },  // Current section data
  context: {
    resume: { ... },        // Full resume for context
    jobDescription?: string  // Optional job to tailor for
  }
}

// Response format
{
  improved: { ... },        // Improved section data
  changes: string[],        // List of changes made
  suggestions?: string[]    // Additional suggestions
}
```

### Component Architecture

```text
src/components/editor/
├── ai/
│   ├── AIActionBar.tsx           # Reusable AI action bar component
│   ├── AIEnhanceDialog.tsx       # Dialog showing AI suggestions
│   └── useAIEnhance.ts           # Hook for AI enhancement logic
├── ContactSection.tsx            # + AI suggestions
├── SummarySection.tsx            # + AI generate/improve
├── ExperienceSection.tsx         # + AI for each entry
├── EducationSection.tsx          # + AI suggestions
└── SkillsSection.tsx             # + AI suggestions (enhance existing)
```

### Implementation Details

#### AIActionBar Component
```typescript
interface AIActionBarProps {
  section: string;
  onAction: (action: string) => void;
  isLoading: boolean;
  primaryActions: { id: string; label: string; icon: ReactNode }[];
  moreActions?: { id: string; label: string }[];
}
```

#### useAIEnhance Hook
```typescript
const { 
  enhance, 
  isEnhancing, 
  result, 
  apply, 
  discard 
} = useAIEnhance({
  section: "summary",
  onApply: (newContent) => updateResume({ summary: newContent })
});
```

### Files to Create
| File | Purpose |
|------|---------|
| `supabase/functions/enhance-section/index.ts` | AI enhancement edge function |
| `src/components/editor/ai/AIActionBar.tsx` | Reusable AI action bar |
| `src/components/editor/ai/AIEnhanceDialog.tsx` | Shows AI results with apply/discard |
| `src/hooks/useAIEnhance.ts` | AI enhancement hook |
| `src/lib/aiEnhance.ts` | API wrapper for enhance endpoint |

### Files to Modify
| File | Changes |
|------|---------|
| `supabase/config.toml` | Add `enhance-section` function |
| `src/components/editor/ContactSection.tsx` | Add AI action bar |
| `src/components/editor/SummarySection.tsx` | Add AI generate/improve buttons |
| `src/components/editor/ExperienceSection.tsx` | Add AI per experience entry |
| `src/components/editor/EducationSection.tsx` | Add AI suggestions |
| `src/components/editor/SkillsSection.tsx` | Enhance existing AI suggestions |

---

## User Experience Flow

### Example: Improving Summary

1. User is on Summary tab
2. Sees their current summary text
3. Below the textarea, sees AI action bar: `[✨ Generate] [Improve] [ATS Optimize] [▼ More]`
4. Clicks "Improve"
5. Loading spinner shows with "AI is improving your summary..."
6. Dialog appears showing:
   - Original summary
   - Improved summary (with diff highlighting)
   - What changed: "Added metrics", "Used stronger action verbs", "Improved ATS keywords"
7. User clicks "Apply" or "Discard"
8. If applied, summary updates with smooth animation

### Example: Improving Experience Entry

1. User expands an experience entry
2. Sees description field with current text
3. Below it, sees: `[✨ Add Metrics] [Improve] [Generate Bullets]`
4. Clicks "Add Metrics"
5. AI analyzes the role and suggests quantifiable improvements
6. User reviews and applies

---

## Implementation Order

1. **Phase 1: PDF Fix** (Quick win)
   - Install html2canvas
   - Update pdfGenerator to capture HTML
   - Test all templates

2. **Phase 2: AI Infrastructure**
   - Create enhance-section edge function
   - Create AIActionBar component
   - Create useAIEnhance hook

3. **Phase 3: Summary AI** (Most impactful)
   - Add AI to SummarySection
   - Generate, Improve, ATS Optimize

4. **Phase 4: Experience AI**
   - Add AI to each experience entry
   - Add metrics, improve descriptions

5. **Phase 5: Other Sections**
   - Skills AI enhancements
   - Education suggestions
   - Contact validation

---

## Technical Notes

### Error Handling
- Show toast on rate limits (429)
- Show toast on payment required (402)
- Graceful fallback if AI fails
- Loading states on all AI actions

### Rate Limiting Considerations
- Debounce rapid clicks
- Show "Try again in X seconds" on rate limits
- Consider batching multiple improvements

### Mobile UX
- AI action bar scrolls horizontally on small screens
- Dialog is full-screen on mobile
- Touch-friendly button sizes
