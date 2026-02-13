

## Fix Privacy Section Empty Card and Move Footer Below Developer Card

### Changes to `src/pages/SettingsPage.tsx`

#### 1. Fix Empty Privacy & Security Card
The `<div className="rounded-2xl glass-elevated overflow-hidden">` (line 457) renders as an empty visible box when biometric is not available on web. Wrap the entire glass card in the same `biometricAvailable` condition so it only renders when there's content inside it.

**Lines 457-486** -- move the `biometricAvailable` condition to wrap the glass card div itself:
```tsx
{biometricAvailable && (
  <div className="rounded-2xl glass-elevated overflow-hidden">
    <SettingsRow
      type="toggle"
      label="Biometric Lock"
      description="Protect your resumes"
      icon={<Fingerprint className="w-4 h-4" />}
      checked={biometricLockEnabled}
      onCheckedChange={handleBiometricToggle}
    />
    {biometricLockEnabled && (
      <>
        <Separator className="bg-border/30" />
        <SettingsRow
          type="navigation"
          label="Require Authentication After"
          ...
        />
      </>
    )}
  </div>
)}
```

#### 2. Move Footer Below Developer Card
Swap the order so the developer card comes first, then the version/tagline footer, then the bottom padding.

Current order: Footer text -> Developer Card -> padding
New order: Developer Card -> Footer text -> padding

**Lines 587-604** become:
```tsx
{/* Developer Credit Card */}
<Suspense fallback={null}>
  <DeveloperCreditCard ... />
</Suspense>

{/* Footer */}
<div className="text-center pt-2 pb-10">
  <p className="text-xs text-muted-foreground">WiseResume v1.0.0</p>
  <p className="text-xs text-muted-foreground mt-1">Made with ❤️ in Egypt</p>
</div>
```

Remove the separate `<div className="pb-10" />` and merge the padding into the footer div.

### Files Modified
1. `src/pages/SettingsPage.tsx`
