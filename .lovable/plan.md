
## Smart Template-Aware Page Break System

### Problem
The current page break system treats all 7 templates identically, but they have fundamentally different layouts:

- **Single-column templates** (Minimal, Classic, Modern, Developer): Page breaks work naturally - content flows linearly from top to bottom
- **Multi-column/sidebar templates** (Creative, Professional): These are "single-page optimized" - the sidebar runs full height alongside the main content. Page breaks would slice through the sidebar awkwardly
- **Hybrid templates** (Executive): Single column with a bottom grid - works with page breaks but needs special handling for the footer grid

### Solution: AI-Powered Template Intelligence

Create a **template metadata system** that defines each template's pagination capabilities, then use this to:
1. Show/hide page break controls based on template type
2. Adjust the pagination algorithm per template
3. Provide smart warnings/suggestions to users

---

### Template Categories

| Template | Category | Page Breaks | Reasoning |
|----------|----------|-------------|-----------|
| Minimal | `linear` | Full support | Single column, linear flow |
| Classic | `linear` | Full support | Single column, linear flow |
| Modern | `linear` | Full support | Single column, linear flow |
| Developer | `linear` | Full support | Single column, linear flow |
| Executive | `linear-grid` | Partial support | Linear except bottom grid |
| Professional | `fixed-sidebar` | Not recommended | Sidebar runs full height |
| Creative | `fixed-sidebar` | Not recommended | Sidebar runs full height |

---

### Implementation Plan

#### 1. Create Template Metadata Configuration
**File:** `src/lib/templateConfig.ts` (new)

Define a configuration object for each template:

```typescript
interface TemplateConfig {
  id: TemplateId;
  layout: 'linear' | 'linear-grid' | 'fixed-sidebar';
  supportsPageBreaks: boolean;
  supportsManualBreaks: boolean;
  maxRecommendedPages: number;
  singlePageOptimized: boolean;
  breakableSections: SectionId[]; // Which sections can have breaks after them
  warningMessage?: string;
}
```

Example configurations:
- **Minimal/Classic/Modern/Developer**: `layout: 'linear'`, full page break support
- **Professional/Creative**: `layout: 'fixed-sidebar'`, `supportsPageBreaks: false`, warning: "This template is optimized for single-page resumes"
- **Executive**: `layout: 'linear-grid'`, manual breaks only for sections above the footer grid

#### 2. Update PreviewPage with Template Intelligence
**File:** `src/pages/PreviewPage.tsx`

- Import template configuration
- Conditionally show/hide page break controls based on current template
- Show a subtle badge for "single-page optimized" templates
- When user switches to a fixed-sidebar template, auto-disable manual breaks

#### 3. Update PageBreakSheet with Smart UI
**File:** `src/components/editor/PageBreakSheet.tsx`

- Accept `templateConfig` prop
- If template doesn't support page breaks, show explanation instead of controls
- Suggest switching templates if user wants page breaks
- Show available breakable sections based on template config

#### 4. Update PageBreakIndicator
**File:** `src/components/editor/PageBreakIndicator.tsx`

- Accept `templateConfig` prop
- Don't render indicators for fixed-sidebar templates
- For linear-grid templates, only show breaks above the grid section

#### 5. Update PDF Generator with Template Awareness
**File:** `src/lib/pdfGenerator.ts`

- Import template configuration
- For `fixed-sidebar` templates: Skip multi-page rendering entirely - capture as single page
- For `linear-grid` templates: Ensure grid sections are never split
- For `linear` templates: Full smart pagination as currently implemented

#### 6. AI-Powered Content Fit Suggestion (Optional Enhancement)
**File:** `supabase/functions/analyze-layout/index.ts` (new edge function)

For sidebar templates that overflow, use AI to suggest:
- "Your content may overflow. Consider switching to the Modern template for multi-page support"
- "Reduce experience entries from 5 to 3 to fit on one page"
- "Shorten summary by 2 sentences for optimal fit"

---

### File Changes Summary

| File | Change |
|------|--------|
| `src/lib/templateConfig.ts` | **NEW** - Template metadata and capabilities |
| `src/pages/PreviewPage.tsx` | Import config, conditionally render page break UI |
| `src/components/editor/PageBreakSheet.tsx` | Template-aware UI, smart messaging |
| `src/components/editor/PageBreakIndicator.tsx` | Skip indicators for non-paginated templates |
| `src/lib/pdfGenerator.ts` | Template-aware PDF generation |

---

### User Experience Flow

**When user selects "Creative" or "Professional" template:**
1. Page break button shows "Single-page layout" badge instead of section count
2. Clicking it opens sheet with explanation:
   - "This template is designed for single-page resumes"
   - "The sidebar layout doesn't support page breaks"
   - "💡 Switch to Modern or Classic for multi-page support"
3. No page break indicators shown in preview

**When user selects "Executive" template:**
1. Page break controls work normally
2. But the bottom grid (Education/Skills) is marked as an unbreakable unit
3. Manual breaks only allowed for sections above the grid

**When user selects linear templates:**
1. Full page break functionality as before
2. Both auto and manual modes available

---

### Template Configuration Details

```typescript
// src/lib/templateConfig.ts

export const TEMPLATE_CONFIGS: Record<TemplateId, TemplateConfig> = {
  minimal: {
    id: 'minimal',
    layout: 'linear',
    supportsPageBreaks: true,
    supportsManualBreaks: true,
    maxRecommendedPages: 3,
    singlePageOptimized: false,
    breakableSections: ['summary', 'experience', 'education', 'skills', 'certifications'],
  },
  classic: {
    id: 'classic',
    layout: 'linear',
    supportsPageBreaks: true,
    supportsManualBreaks: true,
    maxRecommendedPages: 3,
    singlePageOptimized: false,
    breakableSections: ['summary', 'experience', 'education', 'skills', 'certifications'],
  },
  modern: {
    id: 'modern',
    layout: 'linear',
    supportsPageBreaks: true,
    supportsManualBreaks: true,
    maxRecommendedPages: 3,
    singlePageOptimized: false,
    breakableSections: ['summary', 'experience', 'education', 'skills', 'certifications'],
  },
  developer: {
    id: 'developer',
    layout: 'linear',
    supportsPageBreaks: true,
    supportsManualBreaks: true,
    maxRecommendedPages: 2,
    singlePageOptimized: false,
    breakableSections: ['summary', 'experience', 'education', 'skills', 'certifications'],
  },
  executive: {
    id: 'executive',
    layout: 'linear-grid',
    supportsPageBreaks: true,
    supportsManualBreaks: true,
    maxRecommendedPages: 2,
    singlePageOptimized: false,
    breakableSections: ['summary', 'experience'], // Cannot break in/after the bottom grid
  },
  professional: {
    id: 'professional',
    layout: 'fixed-sidebar',
    supportsPageBreaks: false,
    supportsManualBreaks: false,
    maxRecommendedPages: 1,
    singlePageOptimized: true,
    breakableSections: [],
    warningMessage: "This template uses a sidebar layout optimized for single-page resumes. For longer resumes, try Modern or Classic.",
  },
  creative: {
    id: 'creative',
    layout: 'fixed-sidebar',
    supportsPageBreaks: false,
    supportsManualBreaks: false,
    maxRecommendedPages: 1,
    singlePageOptimized: true,
    breakableSections: [],
    warningMessage: "This creative layout is designed for impactful single-page resumes. Switch to Developer or Modern for multi-page support.",
  },
};
```

---

### Expected Results

1. **No more broken sidebars**: Creative/Professional templates render as single-page documents
2. **Clear user guidance**: Users understand why some templates don't support page breaks
3. **Smart suggestions**: The app guides users to appropriate templates for their content length
4. **Template-specific behavior**: Each template type gets optimized pagination logic
5. **Professional output**: Downloaded PDFs look clean regardless of template choice
