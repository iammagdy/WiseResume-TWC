
# Fix Infrastructure Issues for New Templates

## Problems Identified

After analyzing the codebase, I found that **PreviewPage.tsx** is missing support for the 5 new templates that were added. This causes:

1. **Template Quick Switcher** (lines 29-37): Only shows 7 templates instead of 12
2. **TemplateComponent mapping** (lines 308-316): Only maps 7 templates, meaning the new templates won't render in the preview
3. **Missing template imports** (lines 8-14): New template components are not imported

The affected templates are:
- Compact
- Academic
- Healthcare
- Sales
- Elegant

When a user selects one of these new templates from the TemplateSelector sheet, the PreviewPage will fail to render it because:
1. The template won't appear in the quick switcher chips
2. The `TemplateComponent` lookup will return `undefined`
3. The page will crash or show nothing

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/PreviewPage.tsx` | Add missing imports, update templates array, update TemplateComponent mapping |

---

## Technical Changes

### 1. Add Missing Template Imports
Add imports for the 5 new template components at lines 8-14:
```typescript
import { CompactTemplate } from '@/components/templates/CompactTemplate';
import { AcademicTemplate } from '@/components/templates/AcademicTemplate';
import { HealthcareTemplate } from '@/components/templates/HealthcareTemplate';
import { SalesTemplate } from '@/components/templates/SalesTemplate';
import { ElegantTemplate } from '@/components/templates/ElegantTemplate';
```

### 2. Update Templates Array (Quick Switcher)
Expand the templates array at lines 29-37 to include all 12 templates:
```typescript
const templates: { id: TemplateId; name: string }[] = [
  { id: 'modern', name: 'Modern' },
  { id: 'classic', name: 'Classic' },
  { id: 'minimal', name: 'Minimal' },
  { id: 'professional', name: 'Professional' },
  { id: 'developer', name: 'Developer' },
  { id: 'creative', name: 'Creative' },
  { id: 'executive', name: 'Executive' },
  { id: 'compact', name: 'Compact' },
  { id: 'academic', name: 'Academic' },
  { id: 'healthcare', name: 'Healthcare' },
  { id: 'sales', name: 'Sales' },
  { id: 'elegant', name: 'Elegant' },
];
```

### 3. Update TemplateComponent Mapping
Expand the TemplateComponent record at lines 308-316 to include all 12 templates:
```typescript
const TemplateComponent = {
  modern: ModernTemplate,
  classic: ClassicTemplate,
  minimal: MinimalTemplate,
  professional: ProfessionalTemplate,
  developer: DeveloperTemplate,
  creative: CreativeTemplate,
  executive: ExecutiveTemplate,
  compact: CompactTemplate,
  academic: AcademicTemplate,
  healthcare: HealthcareTemplate,
  sales: SalesTemplate,
  elegant: ElegantTemplate,
}[selectedTemplate];
```

---

## Summary of Changes

| Location | Before | After |
|----------|--------|-------|
| Template imports | 7 templates | 12 templates |
| Quick switcher array | 7 templates | 12 templates |
| TemplateComponent mapping | 7 templates | 12 templates |

---

## Expected Results

After these changes:
1. All 12 templates appear in the quick switcher on the Preview page
2. Selecting any template renders correctly in the preview area
3. PDF export works for all 12 templates
4. No crashes when switching between new and old templates
