

## Add Guest Info Banner to Editor

### What Changes
A subtle, dismissible blue banner will appear at the very top of the editor content area (between the header and the progress bar) for unauthenticated users. It uses `sessionStorage` so it reappears each new session.

### Implementation

**File: `src/pages/EditorPage.tsx`**

1. Add a `guestBannerDismissed` state initialized from `sessionStorage` key `'wr-editor-guest-dismissed'`
2. Between the `</header>` (line 385) and the Progress Bar section (line 386), insert a conditional banner block:
   - **Condition:** `!user && !guestBannerDismissed`
   - **UI:** A `div` with `bg-blue-500/10 border-b border-blue-500/20 px-4 py-2` containing:
     - An `Info` icon (from lucide-react) in blue, size `w-4 h-4`
     - Text: "Working as guest -- Sign in to save permanently"
     - A "Sign In" small button navigating to `/auth`
     - An `X` close button that sets the sessionStorage key and hides the banner
3. Import `Info` from lucide-react (already importing other icons on line 4)

### Visual Design
- Semi-transparent blue background (`bg-blue-500/10`) so it's subtle and doesn't clash with the amber `GuestSaveBanner` in the AppShell
- Small text (`text-sm`), compact height (`py-2`)
- Dismissed state stored in `sessionStorage` (resets per session, persists until sign-in)

### No Other Files Changed
This is a self-contained addition to `EditorPage.tsx` only. No database or backend changes needed.
