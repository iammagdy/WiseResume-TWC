

## Fix AI Health Popover + Settings AI Provider Selection

### Issues

1. The health popover shows a useless "Last Check" row. Replace it with a persistent "Use Your Own Key" link at the bottom (always visible, not just when status is unhealthy).
2. The Settings page shows "Gemini" as the AI Provider value, but when the AI Provider sheet opens, neither option appears selected. This is because the `RadioGroup` component may not be receiving the correct initial value on mount.

### Changes

**1. `src/components/ai/AIHealthBadge.tsx`**

- Remove the "Last Check" row (lines 78-81) and the `lastChecked` variable/computation (lines 34, 39-41).
- Move the "Use Your Own Key" button outside the conditional so it always shows at the bottom of the popover (currently it only shows when `provider === 'wiseresume' && status !== 'healthy'`).
- Add a state + import for `AISettingsSheet` so clicking "Use Your Own Key" opens the AI provider sheet directly (instead of navigating to `/settings`).

**2. `src/components/settings/AISettingsSheet.tsx`**

- The `RadioGroup` uses `value={aiProvider}` which should work, but the issue is that on mount, the `aiProvider` value from the store might be `'wiseresume'` while the Settings row displays "Gemini". This means the store value is correct but the display label on the Settings page is wrong, or vice versa.
- Add a `key={aiProvider}` to the `RadioGroup` to force re-render when the value changes.
- Ensure the `useEffect` that syncs `keyInput` also doesn't interfere with the provider state.

**3. `src/pages/SettingsPage.tsx`**

- The Settings row shows `aiProvider === 'wiseresume' ? 'WiseResume AI' : 'Gemini'` (line 377). If the store says `'wiseresume'` but it displays "Gemini", the store value might have been corrupted in localStorage. Adding a defensive check and ensuring the RadioGroup reads fresh state on open will fix this.

### Technical Summary

| File | Change |
|------|--------|
| `src/components/ai/AIHealthBadge.tsx` | Remove "Last Check" row; always show "Use Your Own Key" link that opens AISettingsSheet |
| `src/components/settings/AISettingsSheet.tsx` | Add `key` prop to RadioGroup for reliable selection rendering |

