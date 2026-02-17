

## Update Settings Profile Card to Navigate to Profile Page

### What Changes

The profile card at the top of the Settings page will be updated to:

1. **Navigate to `/profile`** when tapped, instead of opening the inline Edit Profile sheet
2. **Show the user's email** below their name
3. **Keep the sign-up method badge** (Google/Apple/Email) visible
4. **Remove** the "Tap to complete your profile" fallback text and the profile completion progress bar from this card (the Profile page already has its own completion section)
5. **Add a subtle subtitle** like "View & edit profile" to make it clear it's tappable

### Technical Details

**File: `src/components/editor/ai/AIDetectorSheet.tsx`** -- No changes needed.

**File: `src/pages/SettingsPage.tsx`** (lines 309-348):
- Change the `onClick` from `handleOpenEditProfile` (which opens the sheet) to `navigate('/profile')`
- Replace the job title / "Tap to complete your profile" line with the user's email
- Add a second line showing "View & edit profile" as a muted hint
- Keep the provider badge (Google/Apple/Email)
- Remove the `profileCompletion` progress bar and "Profile complete" checkmark from this card since the Profile page handles that
- The `EditProfileSheet` lazy import and state can remain for any other usage, but the card itself won't trigger it

### Visual Result

The card will look like:

```text
[Avatar]  John Doe
          john@example.com
          [Google badge]
          View & edit profile          [>]
```

Tapping it navigates to the full Profile page where the user can edit their profile, manage their portfolio, etc.

