

# Fix Slow Tab/Page Navigation

## Problem
When navigating between tabs (Dashboard, Editor, Preview, Settings, etc.), pages take a long time to load because each page eagerly imports many heavy dependencies at the module level, even though most aren't needed immediately.

## Root Causes

1. **PreviewPage imports all 12 template components eagerly** -- every template is statically imported at the top, meaning the entire bundle for all templates loads before the page renders.

2. **EditorPage imports 9+ sheet/dialog components eagerly** -- TailorSheet, JobAnalysisSheet, RecruiterSimSheet, AIDetectorSheet, LinkedInOptimizerSheet, OnePageWizardSheet, AgenticChatSheet, CareerPathSheet, and TemplateSelector are all imported at module level but only rendered when the user opens them.

3. **UploadPage imports `mammoth` eagerly** -- this is a large DOCX parsing library loaded immediately even though it's only needed when a user uploads a .docx file.

4. **SettingsPage imports many sheet components eagerly** -- EditProfileSheet, DefaultTemplateSheet, PDFDefaultsSheet, DataExportSheet, DeleteDataDialog, BiometricSetupSheet, BiometricTimeoutSheet, ElevenLabsKeySheet, AISettingsSheet are all loaded upfront.

## Solution: Lazy-load heavy sub-components

Convert eagerly imported sheets, dialogs, and templates to `React.lazy()` so they only load when actually needed (i.e., when the user opens them).

---

## Technical Details

### 1. `src/pages/EditorPage.tsx` -- Lazy-load all sheet components

Convert these imports to lazy:

```tsx
const JobAnalysisSheet = lazy(() => import('@/components/editor/JobAnalysisSheet').then(m => ({ default: m.JobAnalysisSheet })));
const TemplateSelector = lazy(() => import('@/components/editor/TemplateSelector').then(m => ({ default: m.TemplateSelector })));
const TailorSheet = lazy(() => import('@/components/editor/TailorSheet').then(m => ({ default: m.TailorSheet })));
const RecruiterSimSheet = lazy(() => import('@/components/editor/ai/RecruiterSimSheet').then(m => ({ default: m.RecruiterSimSheet })));
const AIDetectorSheet = lazy(() => import('@/components/editor/ai/AIDetectorSheet').then(m => ({ default: m.AIDetectorSheet })));
const LinkedInOptimizerSheet = lazy(() => import('@/components/editor/ai/LinkedInOptimizerSheet').then(m => ({ default: m.LinkedInOptimizerSheet })));
const OnePageWizardSheet = lazy(() => import('@/components/editor/ai/OnePageWizardSheet').then(m => ({ default: m.OnePageWizardSheet })));
const AgenticChatSheet = lazy(() => import('@/components/editor/AgenticChatSheet').then(m => ({ default: m.AgenticChatSheet })));
const CareerPathSheet = lazy(() => import('@/components/editor/CareerPathSheet').then(m => ({ default: m.CareerPathSheet })));
```

Wrap each sheet render in `<Suspense fallback={null}>` since sheets have their own loading states.

### 2. `src/pages/PreviewPage.tsx` -- Lazy-load template components

Convert all 12 template imports to lazy:

```tsx
const ModernTemplate = lazy(() => import('@/components/templates/ModernTemplate').then(m => ({ default: m.ModernTemplate })));
// ... same for all 12 templates
```

Also lazy-load the sheets (PageBreakSheet, ExportOptionsSheet, ResumePhotoSheet, OnePageWizardSheet).

### 3. `src/pages/UploadPage.tsx` -- Dynamic import for mammoth

Change from:
```tsx
import mammoth from 'mammoth';
```
To using dynamic import inside the handler function:
```tsx
const mammoth = await import('mammoth');
```

### 4. `src/pages/SettingsPage.tsx` -- Lazy-load all sheet/dialog components

Convert EditProfileSheet, DefaultTemplateSheet, PDFDefaultsSheet, DataExportSheet, DeleteDataDialog, BiometricSetupSheet, BiometricTimeoutSheet, ElevenLabsKeySheet, AISettingsSheet to lazy imports.

### 5. `src/pages/DashboardPage.tsx` -- Lazy-load dialogs

Convert CreateResumeDialog and OnboardingCarousel to lazy imports.

---

## Expected Impact

- **Faster initial page render**: Each page loads only its core UI immediately; heavy sub-components load on-demand
- **Smaller per-route chunks**: Code splitting moves sheet/template code into separate chunks
- **No UX degradation**: Sheets and dialogs have inherent open/close transitions that mask the lazy load time

