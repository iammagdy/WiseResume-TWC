

## Fix Three Bugs: Interview Crash, Rename Not Working, Share Link Broken

### Bug 1: Interview Page Crash -- "Cannot read properties of undefined (reading 'cancel')"

**Root Cause:** In `src/hooks/useVoiceInterview.ts` line 286, `window.speechSynthesis.cancel()` is called **without** optional chaining (`?.`). On the user's Android WebView (V2205, Android 14), `window.speechSynthesis` can be `undefined`, causing the crash. The interview also hangs indefinitely if the `interview-chat` edge function times out, leaving the user stuck.

**Fix:**
- Add optional chaining to the `speak` function's `window.speechSynthesis.cancel()` call (line 286)
- Wrap the entire `speak` function body and the `callAI` function in try/catch to prevent unhandled rejections from crashing the page
- Add a safety timeout (30 seconds) to `callAI` so the interview never hangs forever

**File:** `src/hooks/useVoiceInterview.ts`

---

### Bug 2: Rename Option Not Working from Three-Dot Menu

**Root Cause:** In `src/components/dashboard/ResumeListCard.tsx` line 365, when the user taps "Rename," the action sheet closes (`setShowActionsSheet(false)`) and `setIsRenaming(true)` is set simultaneously. The sheet's exit animation steals focus from the auto-focused rename input, so the user never sees or can interact with the rename field. Additionally, on mobile the inline input may be too small or blend in with the title.

**Fix:**
- Delay `setIsRenaming(true)` by ~350ms (after the sheet close animation completes) so focus isn't stolen
- Keep the rename input implementation as-is (it's correct), just fix the timing

**File:** `src/components/dashboard/ResumeListCard.tsx`

---

### Bug 3: Share Button Generates Localhost Link

**Root Cause:** In `src/components/dashboard/ResumeListCard.tsx` line 396, the share URL is built using `window.location.origin`, which returns `https://localhost` on the Capacitor Android APK. This produces a non-functional link.

**Fix:**
- Replace `window.location.origin` with the published production URL (`https://wiseresume.lovable.app`) using a constant
- Create a shared constant `APP_PUBLIC_URL` that can be referenced throughout the app for any share links

**File:** `src/components/dashboard/ResumeListCard.tsx`

---

### Summary of Changes

| File | Change |
|------|--------|
| `src/hooks/useVoiceInterview.ts` | Add `?.` to `speechSynthesis.cancel()` in `speak()`; add try/catch in `callAI` and `speak`; add 30s timeout to AI calls |
| `src/components/dashboard/ResumeListCard.tsx` | Delay rename activation by 350ms after sheet close; replace `window.location.origin` with production URL constant for share links |

