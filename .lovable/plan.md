

## Fix: Wise AI Chat Sheet Empty State UI Polish

### Issues Identified (from screenshot)
1. The large gradient circle + "Wise AI" title in the scrollable content **duplicates** the header, creating redundancy and visual clutter
2. The gradient circle overlaps/bleeds into the header border area
3. Suggestion buttons look flat and lack clear tap affordance
4. The input area and Close button feel disconnected from the content flow
5. Overall vertical spacing is off, causing content to feel cramped at top and cut off at bottom

### Changes

**File: `src/components/editor/AgenticChatSheet.tsx`**

**1. Remove redundant hero block from empty state (lines 304-311)**
Remove the large gradient circle icon and duplicate "Wise AI" heading from the scrollable content area. The header already shows the branding, so repeating it wastes valuable screen space and causes the overlap issue.

Replace with a compact intro paragraph:
```tsx
<div className="flex flex-col items-center text-center pt-6 pb-2">
  <p className="text-sm text-muted-foreground max-w-[260px]">
    I can edit your resume directly. Just tell me what to change.
  </p>
</div>
```

**2. Upgrade suggestion buttons styling (lines 318-325)**
Add subtle left accent, icon hint, and better padding for professional look:
```tsx
<button
  key={s}
  onClick={() => handleSuggestion(s)}
  className="w-full text-left text-sm px-4 py-3 rounded-xl border border-border/50 
             bg-card/50 hover:bg-primary/5 hover:border-primary/30 
             active:scale-[0.98] transition-all touch-manipulation 
             flex items-center gap-3"
>
  <Sparkles className="w-3.5 h-3.5 text-primary/50 shrink-0" />
  <span>{s}</span>
</button>
```

**3. Move AIProviderBadge inline with the header title (lines 291-295)**
Instead of a separate row below the title, place the badge on the same line as the title for a tighter header. Remove the extra `space-y-2` from SheetHeader.

**4. Remove the "Close" button from the bottom footer (line 430-435)**
The sheet already has a native X close button in the header and can be dismissed by swiping down. The "Close" text button wastes vertical space and pushes the input field up unnecessarily.

### Summary of visual improvements
- No more overlapping gradient circle at the top
- Single, clean header with title + provider badge inline
- Professional suggestion chips with sparkle icons and border accents
- More vertical space for content by removing redundant close button
- Cleaner overall layout aligned with the Cosmic Glass UI system
