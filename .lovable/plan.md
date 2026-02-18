
# Fix: Employment Gap "Explain" Button Visibility

## The Problem

In `src/components/editor/ExperienceTimeline.tsx`, the inline gap row (mobile cards, lines 165–190) renders two action buttons inside a `bg-destructive/5` dark card:

- **"Explain"** — `variant="ghost"` + `className="text-warning-foreground"` → ghost gives no background fill, and `text-warning-foreground` on the deep red/dark background is nearly invisible (screenshot shows it as a barely-readable dim label)
- **"Fill Gap"** — `variant="ghost"` + `className="text-primary"` → slightly better (primary red is visible) but still ghosted

The entire row also crowds `AlertCircle + "Employment gap" label + two buttons` into a single flex row with `gap-2`, leaving almost no space for the buttons to breathe.

## The Fix — One File, 20 Lines

**File:** `src/components/editor/ExperienceTimeline.tsx` (lines 165–191)

### Visual changes

1. **"Explain" button** — change from `ghost` to `outline` variant, use `border-warning/50 bg-warning/10 text-warning hover:bg-warning/20` so the warning amber color is clearly visible with a subtle tinted background
2. **"Fill Gap" button** — change from `ghost` to `outline` variant, use `border-primary/50 bg-primary/10 text-primary hover:bg-primary/20` for consistent styling with a visible tinted pill
3. **Layout** — change the single cramped flex row into two rows:
   - Row 1: `AlertCircle + "Employment gap" label` (the descriptor)
   - Row 2: `flex gap-2` with the two action buttons side by side, so they have full width and breathing room

### Before → After

**Before (all jammed in one row, ghost buttons):**
```tsx
<div className="flex items-center gap-2">
  <AlertCircle ... /> <span>Employment gap</span>
  <Button variant="ghost" className="text-warning-foreground">Explain</Button>
  <Button variant="ghost" className="text-primary">Fill Gap</Button>
</div>
```

**After (two rows, visible outline pill buttons):**
```tsx
<div className="flex flex-col gap-1.5">
  <div className="flex items-center gap-1.5">
    <AlertCircle className="w-3.5 h-3.5 text-destructive/70 shrink-0" />
    <span className="text-xs font-medium text-destructive/90">Employment gap</span>
  </div>
  <div className="flex items-center gap-2">
    {onExplainGap && (
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExplainGap(segment)}
        className="h-8 text-xs gap-1.5 border-warning/50 bg-warning/10 text-warning hover:bg-warning/20 active:scale-95"
      >
        <Sparkles className="w-3 h-3" />
        Explain
      </Button>
    )}
    {onFillGap && (
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleFillGap(segment)}
        className="h-8 text-xs gap-1.5 border-primary/50 bg-primary/10 text-primary hover:bg-primary/20 active:scale-95"
      >
        <Wand2 className="w-3 h-3" />
        Fill Gap
      </Button>
    )}
  </div>
</div>
```

### Why these classes work

- `border-warning/50 bg-warning/10 text-warning` — The amber/yellow warning color stands out clearly on both dark and light backgrounds. The `bg-warning/10` tint gives the button a visible pill shape even without a full solid fill.
- `border-primary/50 bg-primary/10 text-primary` — Matches the existing design system's primary red color, consistent with other CTA buttons in the editor.
- Two-row layout ensures the label is always fully readable and the buttons are never squashed.
- `h-8` instead of `min-h-[44px]` since these are inline secondary actions inside an already-pressable card; the card itself provides the touch target.

## What is NOT Changed

- The bottom alert banner (lines 244–270) with "Explain with AI" + "Fill Gap" — those are already styled with `border-warning/30 text-warning-foreground hover:bg-warning/10` and are more visible, so they stay as-is
- Desktop horizontal bar view — untouched
- All gap detection logic, callbacks, `GapInfo` types — untouched
- `GapExplainerSheet` and `GapFillerSheet` — untouched
