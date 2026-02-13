

## Guest vs Signed-In UX — Remaining Refinements

### What's Already Done
- Guest CTA card with benefits and "Get Started Free" button (profile section slot)
- "Export Resumes" row shows "Requires account" badge for guests
- Account section (Sign Out, Delete Data) is hidden entirely for guests
- Signed-in users see normal controls with no guest prompts

### What's Missing

The request specifies:
1. A **subtle top banner** saying "You're using WiseResume as a guest. Create a free account to save and sync your resumes." with a "Sign in / Sign up" button — distinct from the existing CTA card
2. Locked actions should show a **"Sign in to continue" button** with a 1-line benefit hint, not just a badge

### Proposed Changes

**File: `src/pages/SettingsPage.tsx`**

**1. Add a subtle guest banner at the top of the scrollable area (before all sections)**

Insert a dismissible amber/muted banner above the profile section for guests:
```
You're using WiseResume as a guest. Create a free account to save and sync your resumes.  [Sign Up]
```
- Style: `bg-primary/5 border border-primary/20 rounded-xl px-4 py-3` — subtle, not competing with the CTA card below
- Includes a small "Sign Up" button (size="sm", variant="outline")
- Dismissible via sessionStorage key `wr-settings-guest-banner-dismissed`
- Only shows for unauthenticated users

**2. Update locked "Export Resumes" row to show a "Sign in to continue" inline button**

Replace the current `requiresAccount` badge approach with a more actionable pattern:
- Keep the Lock icon and description ("Sign in to backup your data")
- Instead of the "Requires account" badge, render a small primary `Button` saying "Sign in" on the right side
- This requires adding a `rightAction` render prop or simply inlining the button in the SettingsPage JSX

Since modifying SettingsRow for a one-off button is over-engineered, the simplest approach is to replace the locked SettingsRow with a custom inline row in SettingsPage that includes the button directly.

### Technical Details

**Guest banner (new JSX block, ~15 lines):**
```tsx
{!user && !guestBannerDismissed && (
  <div className="flex items-center gap-3 rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
    <div className="flex-1 min-w-0">
      <p className="text-sm">
        You're using WiseResume as a guest.{' '}
        <span className="text-muted-foreground">Create a free account to save and sync your resumes.</span>
      </p>
    </div>
    <Button size="sm" variant="outline" onClick={() => navigate('/auth')} className="shrink-0">
      Sign Up
    </Button>
    <button onClick={dismissGuestBanner} className="p-1 rounded-full hover:bg-muted" aria-label="Dismiss">
      <X className="w-3.5 h-3.5 text-muted-foreground" />
    </button>
  </div>
)}
```

State: `const [guestBannerDismissed, setGuestBannerDismissed] = useState(() => sessionStorage.getItem('wr-settings-guest-banner-dismissed') === '1');`

**Locked Export row replacement (~12 lines):**
Replace the locked SettingsRow with a custom div that includes a "Sign in to continue" button:
```tsx
<div className="flex items-center gap-3 px-4 py-3.5">
  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
    <Lock className="w-4 h-4 text-muted-foreground" />
  </div>
  <div className="flex-1 min-w-0">
    <p className="text-sm font-medium">Export Resumes</p>
    <p className="text-xs text-muted-foreground">Sign in to backup your data</p>
  </div>
  <Button size="sm" variant="default" onClick={() => navigate('/auth')} className="shrink-0 text-xs h-7">
    Sign in
  </Button>
</div>
```

### Files Modified
- `src/pages/SettingsPage.tsx` — add guest top banner, replace locked Export row with inline button variant, add `X` to imports from lucide-react

### No New Dependencies
Uses existing `Button`, `X` icon, and `sessionStorage` patterns already in the codebase.

