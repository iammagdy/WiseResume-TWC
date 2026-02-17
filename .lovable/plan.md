

## Phase 3 Completion: Contrast Audit Fix for Muted Foreground

### Problem
The audit identified that `muted-foreground` text on `muted` backgrounds has borderline contrast (~3:1 ratio), below the WCAG AA minimum of 4.5:1 for normal text. This affects helper text, placeholders, and secondary labels throughout the app.

### Current Values

**Dark mode** (`:root` / `.dark`):
- `--muted`: `240 15% 15%` (background ~#222233)
- `--muted-foreground`: `240 10% 60%` (text ~#8E8EA0)
- Estimated contrast: ~3.5:1

**Light mode** (`.light`):
- `--muted`: `240 5% 92%` (background ~#EAEBEE)
- `--muted-foreground`: `240 5% 45%` (text ~#6D6E75)
- Estimated contrast: ~3.8:1

### Fix

Bump `muted-foreground` lightness to achieve ~5:1 contrast while keeping the subdued aesthetic:

**Dark mode**: `240 10% 60%` --> `240 10% 65%` (lighter text on dark bg)
**Light mode**: `240 5% 45%` --> `240 5% 40%` (darker text on light bg)

This brings both themes comfortably above the 4.5:1 WCAG AA threshold.

### Changes

**Modified: `src/index.css`** (3 edits)

1. **Line 44** (`:root` block): Change `--muted-foreground: 240 10% 60%` to `240 10% 65%`
2. **Line 105** (`.light` block): Change `--muted-foreground: 240 5% 45%` to `240 5% 40%`
3. **Line 145** (`.dark` block): Change `--muted-foreground: 240 10% 60%` to `240 10% 65%`

### Impact
- All secondary text, placeholders, helper labels, and muted UI elements gain improved readability
- No visual design changes -- the shift is subtle (5% lightness) but measurable for accessibility compliance
- Single file change, zero risk of layout breakage

