

# Add Editable Gap Explanation Feature

## Overview

Currently, the AI-generated gap explanation is displayed as read-only text. This update will convert it to an editable textarea, allowing users to refine the AI's output before copying or adding to their resume summary.

## User Experience

After the AI generates an explanation:

1. The explanation appears in an **editable text area** (not read-only text)
2. Users can modify the wording to better match their voice or add details
3. The "Copy" and "Add to Summary" buttons use the **edited version**
4. A subtle "Edited" indicator shows when the user has made changes

### Visual Change

```text
Before (read-only):
+------------------------------------------+
|  Your Explanation                        |
|                                          |
|  "During this period, I focused on..."   |  ← Plain text, not editable
|                                          |
|  [Copy]  [Add to Summary]                |
+------------------------------------------+

After (editable):
+------------------------------------------+
|  Your Explanation                (Edited)|
|                                          |
|  +--------------------------------------+|
|  | During this period, I focused on... ||  ← Editable textarea
|  |                                      ||
|  +--------------------------------------+|
|                                          |
|  [Copy]  [Add to Summary]                |
+------------------------------------------+
```

## Technical Changes

### File: `src/components/editor/GapExplainerSheet.tsx`

**Change 1: Add state to track if content was edited**
```typescript
const [isEdited, setIsEdited] = useState(false);
```

**Change 2: Replace read-only paragraph with editable Textarea**

Current code (line 264):
```tsx
<p className="text-sm leading-relaxed">{explanation}</p>
```

Will become:
```tsx
<Textarea
  value={explanation}
  onChange={(e) => {
    setExplanation(e.target.value);
    setIsEdited(true);
  }}
  className="min-h-[120px] text-sm resize-none"
  placeholder="Edit your explanation..."
/>
```

**Change 3: Add "Edited" indicator in the label**
```tsx
<Label className="text-primary flex items-center gap-2">
  Your Explanation
  {isEdited && (
    <span className="text-xs font-normal text-muted-foreground">(Edited)</span>
  )}
</Label>
```

**Change 4: Reset edited state when regenerating**

In the `handleGenerate` function, after setting the new explanation:
```typescript
setExplanation(data.explanation);
setIsEdited(false);  // Reset since it's a fresh AI generation
```

**Change 5: Reset edited state in handleClose**
```typescript
setIsEdited(false);
```

## Implementation Summary

| Change | Location | Purpose |
|--------|----------|---------|
| Add `isEdited` state | Line ~46 | Track if user modified text |
| Replace `<p>` with `<Textarea>` | Line 264 | Enable editing |
| Add "(Edited)" indicator | Line 263 | Visual feedback |
| Reset state on regenerate | Line 114-115 | Clear flag for fresh AI content |
| Reset state on close | Line 152 | Clean slate for next use |

## Behavior Notes

- The "Copy" and "Add to Summary" buttons already use the `explanation` state variable, so they will automatically use any edits the user makes
- The textarea will be styled to match the existing design (rounded corners, proper padding)
- Users can still regenerate to get a fresh AI suggestion, which resets their edits

This small but impactful change gives users full control over their gap explanation before finalizing it.

