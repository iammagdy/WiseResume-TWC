

# Apply Glass Theme Across All UI Components

## Overview

The app already has a well-defined glass utility system (`.glass`, `.glass-card`, `.glass-elevated`, `.glass-input`, `.glass-header`, `.icon-glow`, `.border-glow`), but several core UI primitives still use opaque `bg-popover`, `bg-background`, or plain `border` styles instead of the translucent glassmorphism treatment. This plan updates every remaining UI component to use the glass theme consistently.

## Changes

### 1. Dialog (Alert Dialog + Dialog)

**File: `src/components/ui/dialog.tsx`**
- Replace opaque `border bg-background` on `DialogContent` with `glass-elevated` + `border-border/30` + subtle glow shadow
- Update overlay from `bg-black/80` to `bg-black/60 backdrop-blur-sm` for a frosted overlay effect

**File: `src/components/ui/alert-dialog.tsx`**
- Same treatment: replace `border bg-background` on `AlertDialogContent` with `glass-elevated` + `border-border/30`
- Update overlay to `bg-black/60 backdrop-blur-sm`

### 2. Dropdown Menu

**File: `src/components/ui/dropdown-menu.tsx`**
- Replace `border bg-popover` on `DropdownMenuContent` and `DropdownMenuSubContent` with glass-surface styling: `glass-surface rounded-xl` with glow shadow
- Update menu item focus states to use `focus:bg-primary/10` instead of `focus:bg-accent` for a subtler glass-compatible highlight

### 3. Select

**File: `src/components/ui/select.tsx`**
- Update `SelectTrigger` from `border border-input bg-background` to `glass-input rounded-xl`
- Update `SelectContent` from `border bg-popover` to `glass-surface rounded-xl` with glow shadow

### 4. Popover

**File: `src/components/ui/popover.tsx`**
- Replace `border bg-popover` on `PopoverContent` with `glass-elevated rounded-xl` + glow shadow

### 5. Tooltip

**File: `src/components/ui/tooltip.tsx`**
- Replace `border bg-popover` on `TooltipContent` with glass surface styling: translucent background with backdrop-blur

### 6. Context Menu

**File: `src/components/ui/context-menu.tsx`**
- Replace `border bg-popover` on `ContextMenuContent` and `ContextMenuSubContent` with `glass-surface rounded-xl`

### 7. Sheet Overlay

**File: `src/components/ui/sheet.tsx`**
- Update overlay from `bg-black/80` to `bg-black/60 backdrop-blur-sm` for consistency with dialog overlays

### 8. Progress Bar

**File: `src/components/ui/progress.tsx`**
- Replace opaque `bg-secondary` track with translucent `bg-secondary/30 backdrop-blur-sm`
- Add glow effect to the indicator: `gradient-primary` with subtle shadow

### 9. Switch

**File: `src/components/ui/switch.tsx`**
- Add a subtle glow when checked: `data-[state=checked]:shadow-[0_0_12px_-2px_hsl(var(--primary)/0.4)]`
- Make the unchecked track translucent: `data-[state=unchecked]:bg-input/60`

### 10. Floating Create Button

**File: `src/components/dashboard/FloatingCreateButton.tsx`**
- Add `backdrop-blur-md` and a glass border to the FAB for consistency with the glass theme

## Summary Table

| Component | Current Style | Glass Treatment |
|-----------|--------------|-----------------|
| Dialog overlay | `bg-black/80` | `bg-black/60 backdrop-blur-sm` |
| Dialog content | `border bg-background` | `glass-elevated border-border/30` |
| AlertDialog overlay | `bg-black/80` | `bg-black/60 backdrop-blur-sm` |
| AlertDialog content | `border bg-background` | `glass-elevated border-border/30` |
| Sheet overlay | `bg-black/80` | `bg-black/60 backdrop-blur-sm` |
| DropdownMenu content | `border bg-popover` | `glass-surface rounded-xl` |
| Select trigger | `border bg-background` | `glass-input rounded-xl` |
| Select content | `border bg-popover` | `glass-surface rounded-xl` |
| Popover content | `border bg-popover` | `glass-elevated rounded-xl` |
| Tooltip content | `border bg-popover` | Glass surface with blur |
| Context menu | `border bg-popover` | `glass-surface rounded-xl` |
| Progress track | `bg-secondary` | `bg-secondary/30` with blur |
| Switch | Opaque track | Translucent track + glow |
| FAB | Solid gradient | Glass border + blur |

## Technical Notes
- All glass utilities are already defined in `src/index.css` -- no new CSS needed
- The `glass-surface` and `glass-elevated` classes include `backdrop-filter: blur()`, translucent backgrounds, and subtle borders
- Overlay blur creates a frosted-glass effect behind dialogs/sheets, reinforcing the premium feel
- All changes are in UI primitive files, so every usage across the app benefits automatically

