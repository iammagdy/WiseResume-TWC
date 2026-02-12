

# Settings Tab Overhaul: Auth Provider Fix + Premium Redesign

## Issue 1: Auth Provider Confusion

**Root Cause**: The profile card in Settings shows your email address as the subtitle (e.g., `magdyysaber@gmail.com`), which looks identical whether you signed in with Google or with email/password. There is no visual indicator of HOW you signed in. The app has the data (`user.app_metadata.provider` = "google"), but it never displays it.

**Fix**: Add a small badge/chip below your name in the profile card showing the sign-in method:
- "Signed in with Google" (with Google icon)
- "Signed in with Apple" (with Apple icon)  
- "Signed in with Email" (with mail icon)

This is read from `user.app_metadata.provider` which is already available on the auth user object. The profile subtitle will also be cleaned up to show your job title or "Tap to complete your profile" instead of just the raw email.

## Issue 2: Settings Cleanup + Premium Feel

### Remove/Merge These Items

| Item | Reason |
|------|--------|
| **Default Template** (Editor Preferences) | Rarely used -- users pick templates when creating/editing a resume, not in settings. Remove the entire row and its sheet. |
| **Reset Onboarding** (Account) | Developer/debug tool, not useful for real users. Remove it. |
| **Local-Only Mode** (Privacy) | Confusing for most users and not functionally meaningful in this cloud-backed app. Remove it. |
| **Analytics toggle** (Privacy) | No real analytics system behind it. Remove it. |

### Keep These (They're Useful)

- Appearance (theme toggle)
- PDF Export Settings
- AI Provider
- ElevenLabs API Key
- Auto-save Toasts
- AI Enhancement Tips
- Export Resumes
- Biometric Lock
- Delete All Data
- Sign Out
- Developer Credit Card

### Add These New Premium Options

1. **"Signed in as" info row** -- Shows auth provider (Google/Apple/Email) with icon, non-editable, informational. Placed in the profile card area.

2. **"Language" setting** (Account section) -- A selector for app language (English only for now, but shows the app is ready for i18n). Displays "English" with a globe icon. Tapping shows a sheet with English selected and "More coming soon" note.

3. **"Resume Count" info row** (Data section) -- Shows "X resumes created" as a subtle informational stat next to Export. Makes the data section feel richer.

4. **"Rate WiseResume"** (About section) -- A row with a star icon that opens the app store rating link. Premium apps always have this.

5. **"Share WiseResume"** (About section) -- A row with a share icon that triggers the native share API with the app link.

### New Section Order (Top to Bottom)

1. **Profile Card** -- Avatar, name, job title, auth provider badge, completion progress
2. **Appearance** -- Theme toggle (unchanged)
3. **Editor Preferences** -- PDF Export Settings only (template row removed)
4. **AI & Voice** -- AI Provider, ElevenLabs Key (unchanged)
5. **Notifications** -- Auto-save Toasts, AI Enhancement Tips (unchanged)
6. **Data & Export** -- Export Resumes (with resume count inline)
7. **Privacy & Security** -- Biometric Lock only (removed Local-Only and Analytics)
8. **Account** -- Language, Delete All Data, Sign Out
9. **About** -- Developer Card, Rate WiseResume, Share WiseResume, Version info

## Technical Details

### Files to Modify

**`src/pages/SettingsPage.tsx`**
- Import `Globe, Star, Share2` from lucide-react
- Remove imports for `RotateCcw, CloudOff, BarChart3`
- Remove `DefaultTemplateSheet` lazy import and its state/rendering
- Remove `handleResetOnboarding` function
- Add auth provider detection: `const authProvider = user?.app_metadata?.provider || 'email'`
- Add provider badge JSX in the profile card (below display name)
- Remove the "Default Template" `SettingsRow`
- Remove "Reset Onboarding", "Local-Only Mode", "Analytics" rows
- Add "Language" row (shows "English", taps to show toast "More languages coming soon")
- Add "Rate WiseResume" row (opens external link or triggers `useRateApp`)
- Add "Share WiseResume" row (triggers `navigator.share()` or copies link)
- Show resume count inline on the Export row description

**`src/store/settingsStore.ts`**
- No changes needed (the removed settings stay in the store for backward compat, they just won't render in UI)

**`src/components/settings/DefaultTemplateSheet.tsx`**
- No deletion needed (keep the file for potential future use elsewhere), just stop importing/rendering it from SettingsPage

### Auth Provider Badge Logic
```
const providerLabel = {
  google: 'Google',
  apple: 'Apple',
  email: 'Email',
}[authProvider] || 'Email';
```
Display as a small chip with the provider icon next to the email/subtitle text.

## Result
- Users will always see clearly HOW they signed in (Google badge vs Email badge)
- Settings page is cleaner with 4 less rows of clutter
- New rows (Language, Rate, Share) give a premium, polished feel
- The page feels intentional and well-curated, not like a developer debug panel

