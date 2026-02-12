
## Add "Help & Support" Section to Settings Page

### Current State Analysis

The Settings page already has a "Take Tour Again" button in the **Account** section (lines 432-447 in `SettingsPage.tsx`). This button:
- Resets the onboarding flag for both authenticated users (`onboarding_completed: false` in profiles table) and guests (`localStorage.removeItem('wr-onboarding-seen')`)
- Shows a toast: "Onboarding reset — redirecting…"
- Navigates to `/dashboard`

The structure follows this pattern:
1. **Section header** with "text-xs font-semibold uppercase tracking-wider"
2. **Container** with "rounded-2xl glass-elevated overflow-hidden"
3. **SettingsRow components** separated by `<Separator>`

### What Needs to Change

**Move and reorganize** the "Take Tour Again" button:
1. Create a new section called **"Help & Support"** positioned **between "Editor Preferences" (line 288) and "AI & Voice" (line 290)**
2. Move the existing "Take Tour Again" `SettingsRow` from the Account section (lines 432-447) into this new Help & Support section
3. Remove the duplicated `SettingsRow` and its preceding `<Separator>` from the Account section to keep it clean
4. Maintain the same functionality - no logic changes needed

### Technical Details

**File: `src/pages/SettingsPage.tsx`**

#### Step 1: Insert new Help & Support section after Editor Preferences (after line 288)
```
/* Help & Support */
<div>
  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1 flex items-center gap-2">
    <span className="w-6 h-px bg-gradient-to-r from-primary/40 to-transparent" />
    Help & Support
  </h2>
  <div className="rounded-2xl glass-elevated overflow-hidden">
    <SettingsRow
      type="button"
      label="Take Tour Again"
      description="Replay the welcome onboarding"
      icon={<RotateCcw className="w-4 h-4" />}
      onClick={async () => {
        haptics.light();
        if (user) {
          await supabase.from('profiles').update({ onboarding_completed: false }).eq('user_id', user.id);
        } else {
          localStorage.removeItem('wr-onboarding-seen');
        }
        toast.success('Onboarding reset — redirecting…');
        navigate('/dashboard');
      }}
    />
  </div>
</div>
```

#### Step 2: Remove from Account section
- Delete the existing "Take Tour Again" `SettingsRow` (currently lines 432-447)
- Delete the `<Separator>` immediately before it
- This keeps the Account section clean with just Language, Delete All Data, and Sign Out

### Why This Approach

- **Better UX**: "Replay Welcome Tour" logically belongs in Help & Support rather than Account settings
- **Clear organization**: Separates user account actions from feature help/support actions
- **No logic changes**: Reuses existing working code, just relocates it
- **Minimal changes**: Only adding a section and moving a row - no new imports or complex refactoring needed
- `RotateCcw` icon is already imported (line 27)
- All dependencies (`haptics`, `toast`, `navigate`, `supabase`, `user`) are already available in scope
