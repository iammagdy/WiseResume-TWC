

## Fix: Remove Radix Tooltip from InlineAIButton (Persistent Maximum Update Depth)

### Root Cause

The previous fix removed the Tooltip from the EditorPage header, but the same Radix Tooltip is still used inside `src/components/editor/InlineAIButton.tsx` (lines 85-100). This component renders inside every section card on the editor page via `SectionAIAction`. The Radix Tooltip's internal Popper/composeRefs mechanism triggers the same infinite `setRef` loop.

### Fix (1 file)

**File: `src/components/editor/InlineAIButton.tsx`**

Remove the `TooltipProvider`, `Tooltip`, `TooltipTrigger`, and `TooltipContent` wrapper around the AI Assist button. Replace with a plain `<Button>` -- the button already has visible text ("AI Assist") and the dropdown menu provides full context, so a tooltip adds no value (especially on mobile where hover doesn't exist).

Remove these imports (line 3):
```ts
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
```

Replace the TooltipProvider/Tooltip/TooltipTrigger/TooltipContent block (lines 85-100) with just the `<Button>` element, keeping all its existing props and children intact.

### Why This Works

- Eliminates the last Radix Popper component from the editor render tree
- The button already displays "AI Assist" text and has clear visual affordance
- On mobile (primary target), tooltips provide zero value since there is no hover interaction
- Aligns with the documented architectural rule: "The editor page specifically avoids Radix UI Popper components"

