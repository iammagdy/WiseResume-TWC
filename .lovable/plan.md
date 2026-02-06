

# Smart Template Button Integration

## Problem Analysis

The current template button is a floating circular icon (`Palette`) positioned at `bottom-[88px]` with no label or context. Based on the screenshot, it appears as a small, inconspicuous grey circle next to the AI Studio bar's "No job set" indicator. This creates several UX issues:

1. **Discoverability**: Users don't know what this button does
2. **No feedback**: No indication of which template is currently selected
3. **Awkward positioning**: Floats in dead space between elements
4. **Inconsistent design**: Doesn't match the polished AI Studio aesthetic

## Proposed Solutions

I'll implement **Option 3: Integrated Template Chip in AI Studio Bar** as it's the smartest approach for this app:

### Solution: Template Chip Inside AI Studio Bar

Add a small, tappable template indicator chip next to the "No job set" / match score area. This:
- Shows the current template name (e.g., "Modern", "Classic")
- Uses a small icon for visual recognition
- Opens the template selector when tapped
- Feels native to the AI Studio experience

```text
+--------------------------------------------------+
| [✨] AI Studio     [Modern ▾]  [Score] [▲]      |
+--------------------------------------------------+
                         ↑
                  Template chip (tappable)
```

## Implementation Details

### Visual Design

The template chip will:
- Display the current template name in a compact badge
- Use a `Palette` icon (small, 14px)
- Have a subtle dropdown indicator (ChevronDown)
- Use muted styling to not compete with AI features
- Animate when tapped (scale feedback)

```text
┌─────────────────┐
│ 🎨 Modern  ▼   │  ← Tappable chip
└─────────────────┘
```

### Responsive Behavior

- **Default**: Show template name + icon
- **Small screens**: Just show icon + chevron if space is tight
- **Tapped state**: Opens existing `TemplateSelector` sheet

## File Changes

### 1. `src/components/editor/AIAssistantBar.tsx`

Add new props and template chip:

```typescript
interface AIAssistantBarProps {
  // ... existing props
  currentTemplate: TemplateId;  // NEW
  onChangeTemplate: () => void; // NEW
}
```

Add a template chip between the title and the score badge:

```tsx
<div className="flex items-center gap-3">
  {/* AI Studio title */}
  <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
    <Sparkles className="w-4 h-4 text-primary-foreground" />
  </div>
  <span className="font-medium text-sm">AI Studio</span>
</div>

<div className="flex items-center gap-2">
  {/* Template Chip - NEW */}
  <button
    onClick={(e) => {
      e.stopPropagation();
      onChangeTemplate();
    }}
    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/50 border border-border 
               hover:border-primary/30 text-xs text-muted-foreground transition-colors"
  >
    <Palette className="w-3.5 h-3.5" />
    <span className="max-w-[60px] truncate">{TEMPLATE_NAMES[currentTemplate]}</span>
    <ChevronDown className="w-3 h-3" />
  </button>

  {/* Match Score Badge */}
  {matchScore ? (...) : (...)}

  {/* Expand/Collapse chevron */}
  <motion.div>...</motion.div>
</div>
```

Add template name mapping:
```typescript
const TEMPLATE_NAMES: Record<TemplateId, string> = {
  modern: 'Modern',
  classic: 'Classic',
  minimal: 'Minimal',
  professional: 'Professional',
  developer: 'Developer',
  creative: 'Creative',
  executive: 'Executive',
};
```

### 2. `src/pages/EditorPage.tsx`

- Remove the standalone floating template button (lines 281-291)
- Pass template props to AIAssistantBar

```tsx
<AIAssistantBar
  matchScore={matchScore}
  jobDescription={jobDescription}
  currentTemplate={selectedTemplate}           // NEW
  onChangeTemplate={() => setShowTemplates(true)}  // NEW
  onTailor={() => setShowTailor(true)}
  onAnalyze={() => setShowJobSheet(true)}
  onImprove={handleImproveSection}
/>

{/* Remove this: */}
{/* <motion.button onClick={() => setShowTemplates(true)} ... /> */}
```

Also import `selectedTemplate` from the store:
```tsx
const { currentResume, matchScore, jobDescription, selectedTemplate } = useResumeStore();
```

## Visual Outcome

### Before (Current)
```text
+----------------------------------------------+
| [✨] AI Studio     No job set          [▲]  |
+----------------------------------------------+
                                     [🎨] ← Mysterious floating button
```

### After (Proposed)
```text
+--------------------------------------------------+
| [✨] AI Studio   [🎨 Modern ▾]  No job set  [▲]  |
+--------------------------------------------------+
                        ↑
              Integrated, labeled, clear!
```

## Benefits

1. **Clear purpose**: Users see "Modern" and understand it's a template
2. **Current state visible**: Always shows which template is active
3. **Discoverable**: The chevron suggests it's actionable
4. **Consistent**: Matches the polished AI Studio design language
5. **Space efficient**: No floating button taking up screen real estate
6. **Smart**: Feels like an intelligent feature, not a hidden button

## Alternative Considered

**Header Button**: Using the `headerRight` prop in `MobileLayout` to add a template button in the header. This was rejected because:
- The header already has back button and title
- Template selection feels more related to the "design tools" than navigation
- Putting it near AI features creates a cohesive "resume enhancement" zone

