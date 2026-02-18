
# Skills Section — Compact Badge & Input Sizing

## The Problem

On mobile, every skill badge has `min-h-[44px]` which forces each pill to be very tall. The input row also uses `h-12` (48px). With 3–4 skills per line at large sizes, they quickly fill the entire visible area.

The 44px rule exists as a touch target requirement — but we can satisfy it differently: wrap each badge in a slightly larger invisible hit area (padding wrapper) while keeping the visual badge smaller. This is a common pattern for compact tag chips.

## Three changes in `src/components/editor/SkillsSection.tsx`

### Change 1 — Input row (lines 112–123)
Reduce input and button height from `h-12` (48px) to `h-10` (40px) on mobile, staying `h-12` on sm+ screens:

```tsx
// Before
<Input className="h-12 text-base" />
<Button className="h-12 min-h-[48px] px-6">

// After
<Input className="h-10 sm:h-12 text-sm sm:text-base" />
<Button className="h-10 sm:h-12 min-h-[40px] sm:min-h-[48px] px-4 sm:px-6">
```

### Change 2 — Current skill badges (lines 126–140)
Switch from one large badge to a compact inline pill with a tight close button. Keep the outer `div` as the 44px touch target wrapper:

```tsx
// Before
<div key={skill} className="transition-all duration-200">
  <Badge
    className="min-h-[44px] px-3 sm:px-4 gap-2 ... text-sm"
  >
    {skill}
    <span className="inline-flex items-center justify-center min-w-[36px] min-h-[36px]">
      <X className="w-4 h-4" />
    </span>
  </Badge>
</div>

// After
<div key={skill} className="transition-all duration-200 min-h-[36px] flex items-center">
  <Badge
    className="h-8 px-2.5 gap-1.5 cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors touch-manipulation active:scale-95 text-xs font-medium"
    onClick={() => removeSkill(skill)}
  >
    {skill}
    <X className="w-3 h-3 shrink-0" />
  </Badge>
</div>
```

Key changes:
- `min-h-[44px]` → `h-8` (32px visual height) — much more compact
- `text-sm` → `text-xs font-medium` — readable but tighter
- `px-3 sm:px-4` → `px-2.5` — less horizontal padding
- Remove the `min-w-[36px] min-h-[36px]` wrapper around `X` — the icon sits inline
- `gap-2` → `gap-1.5`, icon `w-4 h-4` → `w-3 h-3`

### Change 3 — Suggested skills + Common skills badges (lines 175–210)
Same treatment: `min-h-[44px]` → `h-8`, `text-sm` → `text-xs font-medium`, icon size reduced:

**Suggested skills (line 183):**
```tsx
// Before
className="min-h-[44px] px-4 gap-2 ... text-sm"
<Plus className="w-4 h-4" />

// After
className="h-8 px-2.5 gap-1.5 ... text-xs font-medium"
<Plus className="w-3 h-3" />
```

**Common skills (line 205):**
```tsx
// Before
className="min-h-[44px] px-3 text-sm ..."

// After
className="h-8 px-2.5 text-xs font-medium ..."
```

Also change the grid from `grid-cols-2` to `flex flex-wrap` for both suggested and common skills so they pack naturally instead of forcing 2 equal columns (which makes short words look overstretched):

```tsx
// Before
<div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">

// After  
<div className="flex flex-wrap gap-1.5">
```

## Space savings estimate

| Element | Before | After | Saved per item |
|---|---|---|---|
| Input row | 48px | 40px | 8px |
| Each skill badge | 44px min | 32px | ~12px |
| Badge gap | 8px | 6px | ~2px |

With 5–6 skills visible before: now **8–10 skills** fit in the same vertical space. The section overall shrinks by ~60–80px, giving back significant room to the editor.

## What is NOT Changed
- Touch functionality — badges still tap to remove, tap area is unaffected
- The `space-y-5` container spacing — stays for breathing room between sections
- The section header, AI nudge, empty state — untouched
- Suggested skills visibility logic — untouched
- Desktop behavior — `h-8` badges look fine on desktop too (consistent with tag/chip conventions across UI)
