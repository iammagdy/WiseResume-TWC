
## Enhanced Tailor Error Experience -- "We've Got Your Back"

### What Changes

When the tailor flow fails (rate limit, AI overload, network error, or scores unavailable), the user currently sees a generic toast error. This plan upgrades every failure point to feel premium and supportive, offering actionable next steps including using their own API key for unlimited access.

---

### Change 1: Upgrade the "Score unavailable" banner in TailorSheet

**File:** `src/components/editor/TailorSheet.tsx` (lines 456-465)

Replace the current minimal "Score unavailable" message with a richer card that:
- Uses a friendly tone: "Our servers are experiencing high demand right now"
- Reassures: "Your tailored content is 100% valid -- only the score couldn't be calculated"
- Adds a "Retry Score" button that re-invokes just the scoring (not the full tailor)
- Adds a "Use Your Own AI Key" link that opens the AI Settings sheet for unlimited access
- Uses a warm amber/yellow color scheme (not red/destructive)

### Change 2: Upgrade the catch block error handling in handleTailor

**File:** `src/components/editor/TailorSheet.tsx` (lines 162-165)

Currently shows a plain `toast.error()`. Replace with smarter error detection:
- **Rate limit (429 / "Rate limit")**: Show a custom error card inline (not just a toast) saying "High traffic on WiseResume AI servers. Please try again in a moment or use your own Gemini API key for uninterrupted access."
- **Credits exhausted (402)**: Show "AI credits used up" with link to settings
- **Auth errors**: Keep existing "Please log in again" behavior
- **Generic errors**: Show friendly message with "Report Issue" + "Try Again" + "Use Own Key" buttons

Add state `tailorError` to track the error so it renders inline in the sheet (visible, not just a fleeting toast).

### Change 3: Add inline error card component

**File:** `src/components/editor/TailorSheet.tsx` (new inline component)

A `TailorErrorCard` rendered inside the sheet when `tailorError` is set, with:
- Warm illustration area with a calming icon (Heart or Shield)
- "We're on it" messaging: "Our AI servers are experiencing high demand. This is temporary."
- Three action buttons:
  1. "Try Again" -- re-runs `handleTailor()`
  2. "Use Your Own Key" -- opens AI Settings sheet (already exists as `AISettingsSheet`)
  3. "Report Issue" -- triggers `reportBug()`
- A subtle note: "Tip: Adding your own Gemini API key gives you unlimited, uninterrupted access"
- Dismiss button to clear the error and go back to the job description input

### Change 4: Wire up AI Settings sheet access from TailorSheet

**File:** `src/components/editor/TailorSheet.tsx`

Add state `showAISettings` and render `AISettingsSheet` when true. Import already exists at the top for `AISettingsSheet`. Add a small "AI Settings" icon button in the sheet header area so users always know they can configure their own key.

### Change 5: Smarter error parsing in aiTailor.ts

**File:** `src/lib/aiTailor.ts` (lines 99-104)

Currently wraps all errors as "Failed to tailor resume". Improve to pass through meaningful error messages:
- Parse the response body for `error` field
- Detect 429 status and throw with "rate_limit" marker
- Detect 402 status and throw with "credits_exhausted" marker
- Pass the original error message through so TailorSheet can differentiate

---

### Files to Modify

| File | Change |
|------|--------|
| `src/lib/aiTailor.ts` | Better error classification (429/402/generic) |
| `src/components/editor/TailorSheet.tsx` | Add `tailorError` state, inline error card, AI Settings access, upgraded score-unavailable banner |

### No new files needed -- everything fits within existing components.

### Visual Result

When things go wrong, instead of a brief toast, users see a full inline card inside the tailor sheet with:
- A warm, empathetic message acknowledging the issue
- Clear explanation that it's temporary server load
- Three prominent action buttons (Try Again / Use Own Key / Report)
- Subtle branding that positions the app as premium with real support
