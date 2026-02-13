

## Visual & UX Polish Pass

### What Changes

**File: `src/pages/SettingsPage.tsx`**

All section headers currently use a gradient line decoration but no icons. This pass adds a small icon to each section header for improved scanability, and ensures consistent capitalization and spacing.

### Section Header Icon Mapping

Each `<h2>` section header gets a small icon inserted after the gradient line:

| Section | Icon | Import Status |
|---------|------|---------------|
| Appearance | `Palette` | New import needed |
| AI & Voice | `Brain` | Already imported |
| Editor & Export | `Download` | Already imported |
| Notifications | `Bell` | Already imported |
| Privacy & Security | `Shield` | Already imported |
| Account | `LogOut` | Already imported |
| About & Help | `Info` | Already imported |

### Example Change (repeated for each section)

Before:
```tsx
<h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1 flex items-center gap-2">
  <span className="w-6 h-px bg-gradient-to-r from-primary/40 to-transparent" />
  Appearance
</h2>
```

After:
```tsx
<h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1 flex items-center gap-2">
  <Palette className="w-3.5 h-3.5 text-primary/60" />
  Appearance
</h2>
```

This replaces the gradient line span with a small themed icon for each section, improving scanability while keeping the layout clean.

### Additional Polish

- Add `Palette` to the lucide-react import (line 4-33)
- Remove the gradient `<span>` from all 7 section headers (they become redundant with icons)
- Consistent subtitle pattern already in place -- no changes needed there

### Files Modified
- `src/pages/SettingsPage.tsx` -- add `Palette` import, replace gradient spans with icons on all 7 section headers

