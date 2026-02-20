

# Fix 5 Low-Priority Interview UX Issues

## Issue 1: "AI-POWERED FEEDBACK" Badge -- Make Non-Interactive

The badge at lines 151-160 of `InterviewSetup.tsx` is a `motion.div` with a pulsing scale animation that looks tappable but does nothing.

**Approach:** Use the simpler fallback -- restyle as a purely decorative, non-interactive chip. Remove the pulsing `animate` and add `cursor-default pointer-events-none` to prevent any tap impression.

**File: `src/components/interview/InterviewSetup.tsx`**
- Remove `animate={{ scale: [1, 1.02, 1] }}` and `transition` from the badge
- Add `cursor-default select-none` classes
- Keep the existing styling (bg-primary/15, border, etc.) since it already matches the brand

---

## Issue 2: Mic Test Auto-Reset After Success/Failure

Currently the mic test button at lines 216-260 stays stuck in `success` or `failed` state permanently.

**File: `src/components/interview/InterviewSetup.tsx`**
- After `setMicTestStatus('success')` or `setMicTestStatus('failed')` in `handleMicTest`, add a `setTimeout(() => setMicTestStatus('idle'), 3000)` to auto-reset
- Add a `useEffect` cleanup to clear the timeout on unmount
- Add a subtle scale animation on the success/failed state transition using existing `motion` support (wrap the button content in `AnimatePresence` with key based on `micTestStatus`)

---

## Issue 3: Persist Voice and Mode Preferences via localStorage

Currently `mode` defaults to `'general'` and voice is controlled by the parent.

**File: `src/components/interview/InterviewSetup.tsx`**
- Initialize `mode` state from `localStorage.getItem('wiseresume_interview_mode')` or `'general'`
- In `handleModeChange`, add `localStorage.setItem('wiseresume_interview_mode', newMode)`

**File: `src/pages/InterviewPage.tsx`** (or `src/hooks/useVoiceInterview.ts`)
- The `voiceGender` state lives in `useVoiceInterview` hook. Initialize it from `localStorage.getItem('wiseresume_interview_voice')` or `'female'`
- In `setVoiceGender` (or a wrapper), persist to `localStorage.setItem('wiseresume_interview_voice', gender)`
- Since `InterviewSetup` calls `onVoiceGenderChange` which maps to `setVoiceGender`, we also need to persist inside `handleVoiceChange` in `InterviewSetup.tsx`

**File: `src/hooks/useVoiceInterview.ts`**
- Change the initial `voiceGender` state from `'female'` to reading from localStorage

---

## Issue 4: "Save as PDF" via window.print()

**File: `src/components/interview/InterviewSummary.tsx`**
- Add a `Download` icon import from lucide-react
- Reorganize the bottom buttons into a 2x2 grid:
  - Row 1: Try Again | Home
  - Row 2: Share Results | Save as PDF
- Move "Practice Tips" to a subtle text link below the grid
- "Save as PDF" button calls `window.print()` with a toast "Opening print dialog..."
- Add a `@media print` stylesheet block (in the component or in `index.css`) that:
  - Hides all buttons, nav, app chrome
  - Shows only the summary content with black-on-white styling
  - Adds "WiseResume" header and "wiseresume.magdysaber.com" footer

**File: `src/index.css`** (add print styles)
- Add `@media print` block targeting the interview summary content

---

## Issue 5: Sticky Header on Summary Screen

**File: `src/components/interview/InterviewSummary.tsx`**
- Add a new `onGoBack` prop (maps to same handler as `onGoHome` or a dedicated back handler)
- At the top of the component, render a sticky header bar:
  - `position: sticky`, `top: 0`, `z-50`
  - Left: ArrowLeft back button (44x44px tap target) calling `onGoHome`
  - Center: "Interview Summary" text
  - Right: compact score pill (reuse `ScoreBadge` with `overallScore`)
  - Background: `bg-background/80 backdrop-blur-md border-b border-border/20`
- Fade-in animation on mount
- Score pill scales in with `initial={{ scale: 0.8 }}` to `scale: 1`

**File: `src/pages/InterviewPage.tsx`**
- No changes needed for the prop since `onGoHome` already exists and navigates to dashboard

---

## Files Changed Summary

| File | Issues | Changes |
|---|---|---|
| `src/components/interview/InterviewSetup.tsx` | 1, 2, 3 | Make badge non-interactive; add mic test auto-reset timer; persist mode to localStorage |
| `src/components/interview/InterviewSummary.tsx` | 4, 5 | Add sticky header with back button + score pill; reorganize buttons into 2x2 grid; add Save as PDF button |
| `src/hooks/useVoiceInterview.ts` | 3 | Initialize voiceGender from localStorage; persist on change |
| `src/index.css` | 4 | Add @media print styles for summary content |

## Technical Notes
- No new dependencies needed (window.print, localStorage are browser APIs)
- All animations use Framer Motion (already imported) with `useReducedMotion` checks
- 44px minimum touch targets on all new interactive elements
- No changes to API calls, voice engine logic, scoring, session state, or data models

