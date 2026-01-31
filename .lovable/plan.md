
# Manual Page Break Controls - User-Defined Section Breaks

## Problem Analysis

Looking at the screenshot, page 3 shows:
1. **Education and Skills crammed at top** with excessive white space below
2. The smart algorithm is making decisions automatically, but the result isn't ideal
3. Users need **direct control** over where page breaks occur

The current smart break algorithm works well for avoiding cuts through content, but it can't know user preferences like:
- "I want Experience to fill pages 1-2, then Education starts fresh on page 3"
- "Keep all my skills on the same page as education"

## Solution: Section-Based Page Break Controls

Allow users to **insert manual page breaks after specific sections** in the Preview page. This gives full control while keeping the UI simple.

### User Experience

```
┌─────────────────────────────────────────┐
│ [Modern] [Classic] [Minimal] ...        │  ← Template switcher
├─────────────────────────────────────────┤
│ ✓ ATS-Ready       [Page breaks ▾]       │  ← Dropdown instead of toggle
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  CONTACT INFO                   │   │
│  │  ...                            │   │
│  │  ────────────────────────────── │   │
│  │  SUMMARY                        │   │
│  │  ...                            │   │
│  │  ────────────────────────────── │   │
│  │  EXPERIENCE                     │   │
│  │  Job 1...                       │   │
│  │  Job 2...                       │   │
│  │                                 │   │
│  │  ═══ Page 1 ends ═══════════    │   │  ← Auto break indicator
│  │                                 │   │
│  │  Job 3...                       │   │
│  │  Job 4...                       │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### Page Break Settings Sheet

When user clicks "Page breaks", show a settings sheet:

```
┌─────────────────────────────────────────┐
│  Page Break Settings                  ✕ │
├─────────────────────────────────────────┤
│                                         │
│  Force page break after:                │
│                                         │
│  ○ Auto (smart detection)               │
│                                         │
│  Or select sections:                    │
│  ┌─────────────────────────────────────┐│
│  │ [ ] After Summary                   ││
│  │ [✓] After Experience     ← PAGE 1   ││
│  │ [ ] After Education                 ││
│  │ [ ] After Skills                    ││
│  └─────────────────────────────────────┘│
│                                         │
│  Preview shows X pages                  │
│                                         │
│  [Apply Changes]                        │
│                                         │
└─────────────────────────────────────────┘
```

## Technical Implementation

### 1. Data Model Changes

Add page break preferences to the resume store:

```typescript
// src/types/resume.ts
export type SectionId = 'summary' | 'experience' | 'education' | 'skills' | 'certifications';

export interface PageBreakSettings {
  mode: 'auto' | 'manual';
  breakAfterSections: SectionId[];  // e.g., ['experience'] means break after experience
}

// src/store/resumeStore.ts
interface ResumeState {
  // ... existing fields
  pageBreakSettings: PageBreakSettings;
  setPageBreakSettings: (settings: PageBreakSettings) => void;
}
```

### 2. Template Changes

Add `data-section` attributes to each major section for identification:

```tsx
// All templates
<section data-section="summary" className="mb-6">
  <h2>Summary</h2>
  ...
</section>

<section data-section="experience" className="mb-6">
  <h2>Experience</h2>
  ...
</section>
// etc.
```

### 3. PDF Generator Updates

Modify `findSmartBreakPositions` to accept manual break positions:

```typescript
export function findSmartBreakPositions(
  sourceElement: HTMLElement,
  sourceHeightPerPage: number,
  totalHeight: number,
  manualBreakSections?: string[]  // NEW: sections after which to force break
): number[] {
  // If manual sections specified, find their bottom positions
  if (manualBreakSections && manualBreakSections.length > 0) {
    const manualBreaks: number[] = [];
    const containerRect = sourceElement.getBoundingClientRect();
    
    manualBreakSections.forEach(sectionId => {
      const section = sourceElement.querySelector(`[data-section="${sectionId}"]`);
      if (section) {
        const rect = section.getBoundingClientRect();
        manualBreaks.push(rect.bottom - containerRect.top + 8); // 8px padding
      }
    });
    
    return manualBreaks.filter(b => b < totalHeight && b > 0).sort((a, b) => a - b);
  }
  
  // Existing smart break logic...
}
```

### 4. New Components

**PageBreakSheet.tsx** - Settings panel for page break configuration:

```tsx
interface PageBreakSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: PageBreakSettings;
  onSettingsChange: (settings: PageBreakSettings) => void;
  availableSections: SectionId[];
}
```

### 5. PreviewPage Updates

- Replace toggle button with dropdown that opens PageBreakSheet
- Pass manual break sections to PDF generator
- Update PageBreakIndicator to show manual vs auto breaks

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/types/resume.ts` | Modify | Add `SectionId` and `PageBreakSettings` types |
| `src/store/resumeStore.ts` | Modify | Add `pageBreakSettings` state and setter |
| `src/lib/pdfGenerator.ts` | Modify | Accept manual break sections parameter |
| `src/components/templates/*.tsx` | Modify | Add `data-section` attributes to all 7 templates |
| `src/components/editor/PageBreakSheet.tsx` | Create | New settings sheet component |
| `src/components/editor/PageBreakIndicator.tsx` | Modify | Support manual break mode with different styling |
| `src/pages/PreviewPage.tsx` | Modify | Integrate PageBreakSheet and pass settings |

## Detailed Component Design

### PageBreakSheet Component

```tsx
// src/components/editor/PageBreakSheet.tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const SECTION_LABELS: Record<SectionId, string> = {
  summary: 'Summary',
  experience: 'Experience', 
  education: 'Education',
  skills: 'Skills',
  certifications: 'Certifications',
};

export function PageBreakSheet({ 
  open, 
  onOpenChange, 
  settings, 
  onSettingsChange,
  availableSections 
}: PageBreakSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[70vh]">
        <SheetHeader>
          <SheetTitle>Page Break Settings</SheetTitle>
        </SheetHeader>
        
        <div className="py-4 space-y-6">
          {/* Mode Selection */}
          <RadioGroup 
            value={settings.mode} 
            onValueChange={(mode) => onSettingsChange({ ...settings, mode: mode as 'auto' | 'manual' })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="auto" id="auto" />
              <Label htmlFor="auto">Auto (smart detection)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="manual" id="manual" />
              <Label htmlFor="manual">Manual (choose sections)</Label>
            </div>
          </RadioGroup>
          
          {/* Section Checkboxes (only when manual) */}
          {settings.mode === 'manual' && (
            <div className="space-y-3 pl-4 border-l-2 border-primary/20">
              <p className="text-sm text-muted-foreground">Force page break after:</p>
              {availableSections.map((section) => (
                <div key={section} className="flex items-center space-x-2">
                  <Checkbox 
                    id={section}
                    checked={settings.breakAfterSections.includes(section)}
                    onCheckedChange={(checked) => {
                      const newSections = checked 
                        ? [...settings.breakAfterSections, section]
                        : settings.breakAfterSections.filter(s => s !== section);
                      onSettingsChange({ ...settings, breakAfterSections: newSections });
                    }}
                  />
                  <Label htmlFor={section}>{SECTION_LABELS[section]}</Label>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <Button className="w-full" onClick={() => onOpenChange(false)}>
          Apply
        </Button>
      </SheetContent>
    </Sheet>
  );
}
```

### Updated PreviewPage Flow

```tsx
// In PreviewPage.tsx
const { pageBreakSettings, setPageBreakSettings } = useResumeStore();
const [showPageBreakSheet, setShowPageBreakSheet] = useState(false);

// Determine which sections exist in resume
const availableSections = useMemo(() => {
  const sections: SectionId[] = [];
  if (currentResume.summary) sections.push('summary');
  if (currentResume.experience.length > 0) sections.push('experience');
  if (currentResume.education.length > 0) sections.push('education');
  if (currentResume.skills.length > 0) sections.push('skills');
  if (currentResume.certifications.length > 0) sections.push('certifications');
  return sections;
}, [currentResume]);

// Pass to indicator and PDF generator
const manualBreakSections = pageBreakSettings.mode === 'manual' 
  ? pageBreakSettings.breakAfterSections 
  : undefined;
```

### Updated PageBreakIndicator

```tsx
export function PageBreakIndicator({ 
  containerWidth, 
  containerHeight,
  templateRef,
  manualBreakSections,  // NEW
  className 
}: PageBreakIndicatorProps) {
  const breaks = useMemo(() => {
    const scaleFactor = PAGE_WIDTH / containerWidth;
    const sourceHeightPerPage = PAGE_HEIGHT / scaleFactor;
    
    if (templateRef?.current) {
      return findSmartBreakPositions(
        templateRef.current,
        sourceHeightPerPage,
        containerHeight,
        manualBreakSections  // Pass through
      );
    }
    // ... fallback
  }, [containerWidth, containerHeight, templateRef, manualBreakSections]);

  // Different styling for manual vs auto breaks
  const isManualMode = manualBreakSections && manualBreakSections.length > 0;
  
  return (
    <div className={cn("absolute inset-0 pointer-events-none", className)}>
      {breaks.map((breakPosition, index) => (
        <div
          key={index}
          className="absolute left-0 right-0 flex items-center gap-2 z-10"
          style={{ top: `${breakPosition}px` }}
        >
          <div className={cn(
            "flex-1 border-t-2 border-dashed",
            isManualMode ? "border-blue-400/60" : "border-orange-400/60"
          )} />
          <span className={cn(
            "px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap shadow-sm",
            isManualMode 
              ? "text-blue-600 bg-blue-100" 
              : "text-orange-600 bg-orange-100"
          )}>
            Page {index + 1} ends
          </span>
          <div className={cn(
            "flex-1 border-t-2 border-dashed",
            isManualMode ? "border-blue-400/60" : "border-orange-400/60"
          )} />
        </div>
      ))}
    </div>
  );
}
```

## Edge Cases

1. **No sections selected in manual mode**: Fall back to auto mode
2. **Section doesn't exist**: Skip it (e.g., user removed all education)
3. **Break after last section**: Ignore (no need to break after final content)
4. **Overlapping manual breaks**: Sort by position, remove duplicates

## Testing Checklist

1. Open Preview page with multi-page resume
2. Click "Page breaks" to open settings sheet
3. Select "Manual" mode
4. Check "After Experience" - verify page 1 ends after experience section
5. Check "After Education" - verify 3 pages with education on page 2
6. Switch back to "Auto" - verify smart breaks resume
7. Download PDF - verify breaks match preview
8. Test with different templates
