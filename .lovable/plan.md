

## Mobile UX Polish Pass -- Audit and Fixes

### Audit Findings

After scanning all FloatingPanel usages, the editor header, dashboard cards, settings header, and bottom tab bar, here are the concrete issues found on small screens (320-400px):

| # | Issue | Location | Severity |
|---|-------|----------|----------|
| 1 | StepperNav mobile FloatingPanel missing width constraint -- relies on base `inset-x-4` which is fine but lacks explicit `backdrop-blur` override for consistency | `StepperNav.tsx` line 177 | Low |
| 2 | StepperNav desktop FloatingPanel also missing width constraint and backdrop styling | `StepperNav.tsx` line 315 | Low |
| 3 | Settings "Jump to Section" FloatingPanel missing width constraint | `SettingsPage.tsx` line 299 | Low |
| 4 | Settings SectionJumpButton lacks explicit `min-h-[44px]` and `touch-manipulation` -- relies only on base FloatingPanelButton which now has it, but this is a custom component, not FloatingPanelButton | `SettingsPage.tsx` SectionJumpButton | Medium |
| 5 | Editor header title can overflow on 320px screens when resume name is long -- `truncate` is present but the undo/redo buttons and tools trigger compete for space | `EditorPage.tsx` line 671 | Low |
| 6 | ResumeListCard action menu trigger uses `h-10 w-10` which is smaller than the 44px touch target min | `ResumeListCard.tsx` line 311 | Low |

Most things are already well-polished. The base `FloatingPanelContent` component bakes in `bg-background/95 backdrop-blur-xl border-border/40` and `inset-x-4 bottom-4` positioning, so per-instance width classes like `w-[100vw]` are unnecessary (and would conflict). The base `FloatingPanelButton` already has the 44px / touch-manipulation / active:scale-95 treatment from the previous polish pass.

### Planned Changes (styling only, no logic)

**File: `src/components/editor/StepperNav.tsx`**

1. **Mobile FloatingPanelContent (line 177)**: Add `backdrop-blur-xl bg-background/95` for explicit depth consistency (the base has it, but className merge means explicit wins for readability).

2. **Desktop FloatingPanelContent (line 315)**: Add `backdrop-blur-xl bg-background/95` to match.

**File: `src/pages/SettingsPage.tsx`**

3. **SectionJumpButton**: Ensure the button element has `min-h-[44px]`, `touch-manipulation`, and `active:scale-95` classes. Currently it's a custom `<button>` element, not using `FloatingPanelButton`, so it doesn't inherit the base styles.

4. **FloatingPanelContent (line 299)**: Add `backdrop-blur-xl bg-background/95` for consistency.

**File: `src/components/dashboard/ResumeListCard.tsx`**

5. **ActionsPanel trigger Button (line 311)**: Change `h-10 w-10` to `h-11 w-11` to meet 44px minimum touch target.

### What is NOT changing

- No business logic, handlers, props, or types are modified
- No component renames
- ActionsPanel already fully polished (confirmed)
- BottomTabBar already has `pb-safe`, 48px touch targets, `touch-manipulation` -- no changes needed
- Editor header already has `pt-safe`, truncation, and responsive hiding -- no changes needed
- Base FloatingPanelButton already has 44px / touch / scale -- no changes needed
- viewport meta tag already includes `viewport-fit=cover` -- confirmed correct

### Summary

| File | Lines | Change |
|------|-------|--------|
| `src/components/editor/StepperNav.tsx` | 177 | Add `backdrop-blur-xl bg-background/95` to mobile panel |
| `src/components/editor/StepperNav.tsx` | 315 | Add `backdrop-blur-xl bg-background/95` to desktop panel |
| `src/pages/SettingsPage.tsx` | 299 | Add `backdrop-blur-xl bg-background/95` to jump panel |
| `src/pages/SettingsPage.tsx` | SectionJumpButton | Add `min-h-[44px] touch-manipulation active:scale-95` to button |
| `src/components/dashboard/ResumeListCard.tsx` | 311 | Change `h-10 w-10` to `h-11 w-11` for 44px touch target |

5 small class-string changes. Zero logic changes.

