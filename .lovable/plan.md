

## Polish All FloatingPanel Usages for Native Mobile Feel

### Overview

Standardize styling across all 4 `FloatingPanelContent` usages and update the base `FloatingPanelButton` component to enforce consistent mobile-friendly touch targets. The base `FloatingPanelContent` component already applies `bg-background/95 backdrop-blur-xl border-border/40`, so per-usage fixes focus on scroll constraints and safe areas.

### What Changes

**File: `src/components/ui/floating-panel.tsx`**

Update `FloatingPanelButton` base styles (line 409-411) to add mobile touch target defaults:

| Before | After |
|--------|-------|
| `flex w-full items-center gap-2 rounded-md px-4 py-2 text-left text-sm hover:bg-muted transition-colors` | `flex w-full items-center gap-2 rounded-md px-4 py-2 text-left text-sm hover:bg-muted transition-all min-h-[44px] touch-manipulation active:scale-95` |

This ensures every button rendered via `FloatingPanelButton` (used in `ActionsPanel`) automatically meets 44px touch targets with tactile feedback.

---

**File: `src/components/ActionsPanel.tsx`**

The `FloatingPanelContent` (line 54-59) already has `w-[calc(100vw-2rem)] max-w-md` and `backdrop-blur-xl bg-background/95`. Add missing mobile constraints:

| Before | After |
|--------|-------|
| `w-[calc(100vw-2rem)] max-w-md`, `max-h-[80dvh] overflow-y-auto`, `pb-safe`, `backdrop-blur-xl bg-background/95 border-border/40` | Same -- already correct, no changes needed |

ActionsPanel is already fully polished. No changes.

---

**File: `src/components/editor/StepperNav.tsx`**

Two FloatingPanelContent usages:

1. **Mobile panel (line 177)**: Add `overflow-y-auto`
   - Before: `max-h-[80dvh] pb-safe`
   - After: `max-h-[80dvh] overflow-y-auto pb-safe`

2. **Desktop panel (line 315)**: Add scroll and safe area classes
   - Before: no className
   - After: `max-h-[80dvh] overflow-y-auto pb-safe`

3. **Desktop grid buttons (line 324)**: Add `min-h-[44px]` (already present, confirmed correct)

---

**File: `src/pages/SettingsPage.tsx`**

The `FloatingPanelContent` (line 299) already has `max-h-[80dvh] overflow-y-auto pb-safe`. No changes needed -- already correct.

---

### Summary of Actual Edits

| File | Lines | Change |
|------|-------|--------|
| `src/components/ui/floating-panel.tsx` | 410 | Add `min-h-[44px] touch-manipulation active:scale-95` to `FloatingPanelButton` base class |
| `src/components/editor/StepperNav.tsx` | 177 | Add `overflow-y-auto` to mobile FloatingPanelContent |
| `src/components/editor/StepperNav.tsx` | 315 | Add `max-h-[80dvh] overflow-y-auto pb-safe` to desktop FloatingPanelContent |

Only 3 small class-string changes. No logic, handler, or structural changes.

