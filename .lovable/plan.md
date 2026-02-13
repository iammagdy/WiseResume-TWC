
## Part 3: Controls and States – Improve Visual Feedback and Clarity

### Current State

The Settings page has the following control elements:
1. **Theme Toggle** (`ThemeToggle` component) – radio/segmented UI with three labeled options (Light, Dark, Auto) — already well-implemented
2. **Toggle Controls** (switches for Auto-save Toasts, AI Enhancement Tips, Biometric Lock) — use the `Switch` component which shows visual state (on/off color + position) but lacks explicit On/Off labels
3. **Guest-Locked Features** ("Export Resumes" for unauthenticated users) — currently shown as disabled with opacity-60 and a lock icon, but no "Requires account" badge

### Issues to Address

1. **Toggles lack explicit On/Off labels** — Users must infer state from switch color and position. Adding text labels (On/Off) would make the state unmistakably clear, especially important on small mobile screens.
2. **Guest-locked features lack visual clarity** — The locked "Export Resumes" row uses opacity and a lock icon but no badge to signal "Requires account". This is less discoverable than a dedicated badge.
3. **No unified pattern for locked/guest features** — Currently only "Export Resumes" shows a locked state; other guest-only features (like "Biometric Lock" on non-mobile) use the `disabled` prop without a badge.

### Proposed Changes

**File: `src/components/settings/SettingsRow.tsx`**

1. **Add toggle state label support to SettingsRow**
   - Add optional `showStateLabel` prop (boolean, defaults to `true`)
   - When `showStateLabel=true` and `type="toggle"`, render an inline label next to the Switch showing "On" or "Off"
   - Positioning: label appears to the left of the Switch in a smaller, subtle style (text-xs, muted-foreground)
   - The label text is controlled by a `stateLabel` prop that accepts `{ on: string; off: string }` with defaults of `{ on: "On", off: "Off" }`

2. **Add badge support for locked/disabled states**
   - Add optional `requiresAccount` boolean prop to SettingsRowNavigationProps
   - When `requiresAccount=true`, render a small "Requires account" badge in the right area, replacing or alongside the chevron
   - Badge uses `variant="outline"` for a subtle appearance that doesn't compete with primary actions

3. **Update SettingsPage to use new props**
   - Toggle rows (Auto-save Toasts, AI Enhancement Tips): set `showStateLabel={true}` (leveraging the default)
   - "Export Resumes" locked row: set `requiresAccount={true}` on the SettingsRow props
   - Biometric Lock disabled rows: optionally set `requiresAccount={true}` to unify the pattern

**File: `src/pages/SettingsPage.tsx`**

1. Update the three toggle rows to pass `showStateLabel={true}` (or rely on default)
2. Update the guest-locked "Export Resumes" row to pass `requiresAccount={true}`
3. Refactor the `<div className="opacity-60">` wrapper around the locked "Export Resumes" row to use the new prop instead, simplifying the JSX

### Technical Details

**SettingsRow toggle state label:**
```tsx
// In toggle type rendering, after the Switch:
{showStateLabel && (
  <span className="text-xs text-muted-foreground ml-2">
    {props.checked 
      ? (props.stateLabel?.on ?? 'On') 
      : (props.stateLabel?.off ?? 'Off')}
  </span>
)}
```

**SettingsRow requiresAccount badge:**
```tsx
// In navigation type rendering, in the right-side flex div:
{props.requiresAccount && (
  <Badge variant="outline" className="text-[10px] px-2 py-0.5">
    Requires account
  </Badge>
)}
// The chevron only renders if NOT requiresAccount
```

**Updated SettingsRowToggleProps interface:**
```tsx
interface SettingsRowToggleProps extends SettingsRowBaseProps {
  type: 'toggle';
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  showStateLabel?: boolean;
  stateLabel?: { on: string; off: string };
}
```

**Updated SettingsRowNavigationProps interface:**
```tsx
interface SettingsRowNavigationProps extends SettingsRowBaseProps {
  type: 'navigation';
  value?: string;
  onClick: () => void;
  requiresAccount?: boolean;
}
```

### UX Impact

- **Toggles are now self-explanatory** – even at a glance, users see "On" or "Off" without relying on switch color/position interpretation
- **Guest-locked features are discoverable** – the "Requires account" badge is a clear call-to-action that encourages sign-up
- **Consistent visual language** – all guest-restricted features use the same badge pattern
- **Minimal visual overhead** – state labels and badges are subtle (small text, muted colors) so they don't clutter the interface

### Files Modified

- `src/components/settings/SettingsRow.tsx` – add `showStateLabel`, `stateLabel`, and `requiresAccount` props with rendering logic
- `src/pages/SettingsPage.tsx` – pass new props to toggle rows and guest-locked "Export Resumes" row; simplify the opacity wrapper
