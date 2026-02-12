

# Authentication Flow Improvement - Guest Mode and Strategic Prompts

## Overview

Remove the forced auth redirect from Settings, introduce guest mode limitations (1 resume, gated advanced features), create a reusable sign-in prompt modal that appears at strategic moments, and redesign the Settings page to work for both guests and authenticated users.

## What Changes

### 1. Settings Page: Remove Forced Auth Redirect

**Current behavior:** `SettingsPage.tsx` line 115-119 redirects unauthenticated users to `/auth`.

**New behavior:** Show the full Settings page to everyone. Sections that require auth (Profile card, Data Export, Delete Data, Sign Out) are replaced with a "Sign in to access" card for guests. Available-to-all sections (Appearance, Editor Preferences, AI & Voice, Notifications, Language, Take Tour Again, About) remain fully functional.

The profile card at the top becomes a "Sign in" call-to-action card for guests, showing the AppIcon and a "Sign in to manage your account" message with a button.

### 2. New Component: `SignInPromptDialog`

A reusable modal (`src/components/auth/SignInPromptDialog.tsx`) that accepts:
- `open` / `onOpenChange` - dialog control
- `title` - headline (e.g., "Secure Your Progress")
- `description` - context message
- `benefits` - array of benefit strings to show with checkmarks
- `onContinueAsGuest` - optional callback for dismissing

**Design:**
- Centered modal with gradient header accent
- Benefit list with checkmark icons
- "Continue with Email" button (navigates to `/auth?mode=signup`)
- "Continue with Google" button (triggers Google OAuth directly)
- "Continue as guest" text link at the bottom

### 3. Guest Mode Limitations

**One resume limit:**
In `DashboardPage.tsx`, when a guest (no user) clicks "Create New" and already has a resume in the local store, show the `SignInPromptDialog` with title "Create Unlimited Resumes" instead of opening the CreateResumeDialog.

**Gated features (show prompt on click):**
- **Tailor Sheet** (`EditorPage.tsx`): When guest clicks Tailor, show prompt with "Sign in to unlock AI-tailored resumes"
- **Cover Letter** (inside TailorSheet): Already behind tailor, so covered
- **Jobs tab** (`ApplicationsPage.tsx`): Show prompt when guest navigates there
- **Export/Download** (`PreviewPage.tsx`): Allow free download (keeps value visible), but show a gentle prompt after first download encouraging sign-up

Each gated action checks `if (!user)` before proceeding and shows the `SignInPromptDialog` instead.

### 4. Strategic Sign-In Prompts

**After completing 2 sections** (`EditorPage.tsx`):
Track section completion count. When a guest completes their second section (score reaches 100 for 2 sections), show the `SignInPromptDialog` once per session with:
- Title: "You're making great progress!"
- Benefits: "Access your resume anywhere", "Tailor to unlimited jobs", "Generate AI cover letters"
- Store dismissal in sessionStorage so it only shows once per browser session

**On Preview page** (`PreviewPage.tsx`):
When a guest visits Preview for the first time, show a subtle toast (not a blocking modal) after 3 seconds: "Sign in to save and download in multiple formats" with a "Sign Up" action button.

### 5. Improved GuestSaveBanner

Update `GuestSaveBanner.tsx`:
- Change color from `bg-primary/10` to `bg-amber-500/10 border-amber-500/20` (gentle yellow/amber as specified)
- Reappear each session by using `sessionStorage` instead of `useState` for dismissal (so it comes back on new sessions)
- Keep the existing content and dismiss behavior

## Technical Details

### Files to Create

1. **`src/components/auth/SignInPromptDialog.tsx`** - Reusable sign-in prompt modal
   - Uses Dialog from Radix
   - Accepts configurable title, description, benefits array
   - Has "Continue with Email", "Continue with Google", and "Continue as guest" options
   - Google sign-in uses `lovable.auth.signInWithOAuth('google', ...)`
   - Email navigates to `/auth?mode=signup`

### Files to Modify

2. **`src/pages/SettingsPage.tsx`**
   - Remove the `useEffect` redirect on lines 115-119
   - Wrap auth-only sections (Profile card, Data Export, Delete Data, Sign Out) in `{user && ...}`
   - Add a guest profile card: glass-elevated card with AppIcon, "Sign in to manage your account", and a "Sign In" button navigating to `/auth`
   - Guest sees: Appearance, Editor Preferences, AI & Voice, Notifications, Language, Take Tour Again, About
   - Auth-only sections show as disabled cards with lock icon and "Sign in to access" text for guests

3. **`src/components/layout/GuestSaveBanner.tsx`**
   - Change background to amber: `bg-amber-500/10 border-amber-500/20`
   - Change icon color to `text-amber-600 dark:text-amber-400`
   - Use `sessionStorage` for dismissal tracking so banner reappears each new session
   - Keep all existing logic for detecting progress

4. **`src/pages/EditorPage.tsx`**
   - Add strategic prompt: track when guest completes 2 sections
   - Use a ref + sessionStorage flag `wr-signin-prompt-shown` to show `SignInPromptDialog` once
   - Add state for `showSignInPrompt` and the prompt component at the bottom of the JSX
   - Gate the Tailor button: if `!user`, show sign-in prompt instead of opening TailorSheet

5. **`src/pages/DashboardPage.tsx`**
   - Gate "Create New" for guests: if `!user && currentResume exists in store`, show sign-in prompt instead of CreateResumeDialog
   - Add `showSignInPrompt` state and render `SignInPromptDialog`

6. **`src/pages/PreviewPage.tsx`**
   - Add a one-time toast for guests after 3 seconds on first visit (tracked via sessionStorage `wr-preview-signin-hint`)
   - Keep downloads working for guests (no blocking)

### No Database Changes Required

All guest limitations are enforced client-side. The existing local storage resume workflow for guests remains unchanged.

### Sign-In Prompt Benefits (reusable constant)

```
const SIGN_IN_BENEFITS = [
  'Save your resume permanently',
  'Access from any device',
  'Tailor to unlimited job postings',
  'Generate custom cover letters',
  'Track your applications',
];
```

### Guest Detection Pattern

All checks use the existing `useAuth` hook: `const { user } = useAuth()`. When `user` is null, the visitor is a guest.

