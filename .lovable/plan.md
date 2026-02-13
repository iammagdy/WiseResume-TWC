

## Enhanced Toggle Switch UX

### Overview
Add micro-interaction animations to the Switch component and SettingsRow toggle for a more polished, native-app feel. Four enhancements: haptic-style bounce animation on toggle, loading spinner state, success checkmark flash, and a 10% size increase for mobile touch targets.

### Changes

**File: `src/components/ui/switch.tsx`**

Increase the Switch size by ~10%:
- Root: `h-6 w-11` becomes `h-7 w-12` (28px tall, 48px wide)
- Thumb: `h-5 w-5` becomes `h-[22px] w-[22px]`
- Thumb translate: `translate-x-5` becomes `translate-x-[22px]`
- Add a subtle scale bounce on state change using CSS: `transition-all duration-200` and `active:scale-95` on the root for press feedback

**File: `src/components/settings/SettingsRow.tsx`**

Add optional `loading` and `showSuccess` props to the toggle variant:

```typescript
interface SettingsRowToggleProps extends SettingsRowBaseProps {
  type: 'toggle';
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  loading?: boolean;          // NEW
  showStateLabel?: boolean;
  stateLabel?: { on: string; off: string };
}
```

In the toggle render:
1. **Haptic bounce animation**: Add a brief scale animation on the toggle row when toggled. Use a local state + `setTimeout` to apply a CSS class (`scale-[1.02]` for 150ms then back to `scale-100`) for a subtle "pop" effect.
2. **Loading state**: When `loading` is true, replace the Switch with a small spinning `Loader2` icon (from lucide-react) at the same position, and disable the row.
3. **Success checkmark**: After loading completes (loading goes from true to false), briefly show a green `Check` icon (from lucide-react) with a fade-in scale animation for 800ms before restoring the Switch.

**File: `src/index.css`** (or inline in switch.tsx)

Add a keyframe for the toggle bounce:
```css
@keyframes toggle-bounce {
  0% { transform: scale(1); }
  40% { transform: scale(1.04); }
  100% { transform: scale(1); }
}
```

### Technical Details

- The `loading` and success states are opt-in props -- existing toggles that don't pass `loading` behave exactly as before (no breaking changes).
- The success checkmark uses a `useEffect` watching `loading` transitions from `true` to `false` to trigger the animation.
- The bounce animation uses `requestAnimationFrame`-friendly CSS transforms for smooth 60fps performance.
- The Switch size increase applies globally but is subtle enough (28px vs 24px) to not disrupt layouts.

### Files Modified
1. `src/components/ui/switch.tsx` -- size increase + active press scale
2. `src/components/settings/SettingsRow.tsx` -- loading, success, bounce animations
3. `src/index.css` -- toggle-bounce keyframe

