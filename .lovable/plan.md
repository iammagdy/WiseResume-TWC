

## Show Privacy & Security Section with "Mobile Only" Indicator

### Problem
The Privacy & Security section is completely hidden when biometric hardware isn't detected (desktop/web browsers). Users don't know the feature exists.

### Solution
Always render the section, but when biometrics are unavailable, show it in a collapsed/disabled state with a tooltip and badge explaining it's a mobile-only feature.

### Changes to `src/pages/SettingsPage.tsx`

#### 1. Remove the `biometricAvailable` conditional wrapper (line 528)

Instead of `{biometricAvailable && (<>...</>)}`, always render the section. The `<Separator>` and `<div className="glass-surface-alt">` wrapper are always shown.

#### 2. Add "Mobile only" badge to the section header

Next to the "Privacy & Security" heading text, add a small badge when biometrics are unavailable:

```tsx
<h2 className="... flex items-center gap-2">
  <Shield className="w-4 h-4 text-primary/60" />
  Privacy & Security
  {!biometricAvailable && (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className="text-[10px] px-2 py-0.5 ml-1 cursor-help">
          Mobile only
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        Biometric lock requires a device with fingerprint or face recognition
      </TooltipContent>
    </Tooltip>
  )}
</h2>
```

#### 3. Show disabled card when biometrics unavailable

When `!biometricAvailable`, render the card with reduced opacity and a brief explanation instead of the toggle:

```tsx
{biometricAvailable ? (
  {/* existing Biometric Lock toggle + timeout row */}
) : (
  <div className="rounded-2xl glass-elevated overflow-hidden opacity-50 pointer-events-none">
    <div className="flex items-center gap-3 py-3.5 px-4 min-h-[56px]">
      <div className="w-8 h-8 rounded-lg icon-glow flex items-center justify-center text-primary">
        <Fingerprint className="w-4 h-4" />
      </div>
      <div>
        <p className="font-medium">Biometric Lock</p>
        <p className="text-xs text-muted-foreground">Available on mobile devices with biometrics</p>
      </div>
    </div>
  </div>
)}
```

The privacy reassurance text and Privacy Policy link remain visible in both states.

#### 4. Add imports

Import `Tooltip`, `TooltipTrigger`, `TooltipContent` from `@/components/ui/tooltip` and wrap the section area with the existing `TooltipProvider` (check if one already wraps the page; if not, add it).

### Summary

| File | Change |
|------|--------|
| `src/pages/SettingsPage.tsx` | Remove `biometricAvailable` guard; always render section; add "Mobile only" badge with tooltip when unavailable; show disabled card placeholder |

