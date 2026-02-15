

## Fix: Collapse Tips When Summary Has Content

### Problem

The "Tips for a great summary" box (lines 128-136) is always visible, even when the user has already written a full summary. It takes up valuable screen space and adds visual clutter. It should be:
- **Collapsed** when the summary has content (50+ characters)
- **Expanded** when the summary is empty or too short

### Fix

**File: `src/components/editor/SummarySection.tsx`**

1. Import `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from `@/components/ui/collapsible` and `ChevronDown` from `lucide-react`
2. Replace the static tips `div` (lines 128-136) with a `Collapsible` component:
   - `defaultOpen` set to `true` when summary is empty/short (less than 50 chars), `false` otherwise
   - The header ("Tips for a great summary") becomes a `CollapsibleTrigger` with a chevron icon that rotates on open/close
   - The bullet list wraps inside `CollapsibleContent`

### Technical Details

```tsx
// Replace lines 128-136 with:
<Collapsible defaultOpen={!summary || summary.trim().length < 50}>
  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-xl bg-muted/50 border border-border group">
    <h4 className="font-semibold text-sm">Tips for a great summary</h4>
    <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
  </CollapsibleTrigger>
  <CollapsibleContent className="px-4 pb-4 rounded-b-xl bg-muted/50 border border-t-0 border-border">
    <ul className="text-sm text-muted-foreground space-y-2 pt-3">
      <li>-- Start with your years of experience and specialty</li>
      <li>-- Include 2-3 key achievements with metrics</li>
      <li>-- Mention skills relevant to your target role</li>
      <li>-- Keep it concise (3-4 sentences)</li>
    </ul>
  </CollapsibleContent>
</Collapsible>
```

### Result

- Summary is empty or short: tips expanded by default so user sees guidance
- Summary has 50+ characters: tips collapsed to save space, user can still expand manually
- Chevron icon indicates expandable state

### Summary

| File | Change |
|------|--------|
| `src/components/editor/SummarySection.tsx` | Wrap tips in Collapsible, auto-collapse when summary has content |

