

## Fix Privacy Section and Reorder Help Section

### Changes to `src/pages/SettingsPage.tsx`

#### 1. Fix Empty Privacy & Security Section
The section still shows an empty header + description when biometric is not available. Wrap the entire Privacy & Security section (header, description, card, and privacy text) in the `biometricAvailable` condition, along with its preceding `<Separator>`. This removes the empty section entirely on web.

**Lines 448-496** -- wrap everything in `biometricAvailable`:
```tsx
{biometricAvailable && (
  <>
    <Separator />
    <div>
      <h2 className="...">
        <Shield className="w-4 h-4 text-primary/60" />
        Privacy & Security
      </h2>
      <p className="...">Biometric lock and data protection</p>
      <div className="rounded-2xl glass-elevated overflow-hidden">
        {/* biometric rows as-is */}
      </div>
      <p className="...">Your resumes are stored securely... Privacy Policy</p>
    </div>
  </>
)}
```

#### 2. Move "Get Help" Below "Share WiseResume"
Move the "Get Help" `SettingsRow` card (lines 539-547) from above the main About card to below "Share WiseResume" (after line 582). This merges it into a single card or places it as a separate card below.

New order in About & Help section:
1. Take Tour Again
2. Rate WiseResume
3. Share WiseResume
4. Get Help (separate card below, with `mt-3`)

### Files Modified
1. `src/pages/SettingsPage.tsx`
