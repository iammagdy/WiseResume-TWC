

## Enhance AI Generation Feedback: Stepped Progress + Cancel

### Overview
Add a cancel button to `TailorProgressComponent`, add stepped progress with cancel support to `CoverLetterGenerator`, and wire AbortController through the tailor/cover-letter generation flows.

### Changes

**1. New shared component: `src/components/ui/GenerationProgress.tsx`**

A reusable stepped progress indicator used by both cover letter and tailor flows. Features:
- Timer-based step advancement (every 2.5s) through configurable step labels
- Animated circular progress ring (reused from TailorProgress pattern)
- "Cancel Generation" button that appears after 5 seconds, becomes prominent (destructive variant) after 30s
- Accepts `onCancel` callback and `steps` array as props
- Compact design that fits inside existing Sheet content without changing dimensions

**2. Modified: `src/components/editor/tailor/TailorProgress.tsx`**

- Add `onCancel?: () => void` to `TailorProgressProps`
- Render a "Cancel" button below the progress bar when `onCancel` is provided and generation has been running for 5+ seconds
- After 30s elapsed, button text changes to "Taking too long? Cancel" with destructive styling
- No layout dimension changes -- button fits within existing padding

**3. Modified: `src/lib/aiTailor.ts`**

- `tailorResumeWithProgress`: Accept optional `signal?: AbortSignal` parameter
- Pass `signal` to `supabase.functions.invoke` via fetch options
- `generateCoverLetter`: Accept optional `signal?: AbortSignal` parameter and pass it through

**4. Modified: `src/components/editor/TailorSheet.tsx`**

- Create an `AbortController` ref (`abortRef`)
- Pass `abortRef.current.signal` to `tailorResumeWithProgress`
- Pass `onCancel` callback to `TailorProgressComponent` that calls `abortRef.current.abort()`, sets `isTailoring = false`, and shows a toast
- Reset controller on each new tailor attempt

**5. Modified: `src/components/editor/tailor/CoverLetterGenerator.tsx`**

- Replace the simple `Loader2` spinner during generation with a stepped progress UI inline (no new component import needed -- built directly into the file for simplicity)
- Steps: "Analyzing Job Description...", "Matching Keywords...", "Optimizing Structure...", "Finalizing Content..."
- Timer advances active step every 2.5s
- Add `AbortController` ref; pass `signal` to `generateCoverLetter`
- Show "Cancel Generation" button after 5s, destructive after 30s
- On cancel: abort controller, reset `isGenerating`, show info toast

### Technical Details

**AbortController wiring:**

```text
TailorSheet                          aiTailor.ts
  abortRef = new AbortController()
  tailorResumeWithProgress(           signal passed to
    ..., abortRef.signal)  --------> supabase.functions.invoke({ signal })
  
  onCancel:
    abortRef.abort()
    setIsTailoring(false)
```

**CoverLetterGenerator stepped progress (inline):**

```text
State: generationStep (0-3), timer increments every 2.5s
Steps array: ["Analyzing Job Description...", "Matching Keywords...", 
              "Optimizing Structure...", "Finalizing Content..."]

UI: replaces Loader2 spinner with:
  - Step dots (4 circles, active one pulses)
  - Current step label with fade transition
  - Cancel button (appears after 5s)
```

**Cancel button behavior:**
- Hidden for first 5 seconds (most generations complete quickly)
- Appears as ghost/outline variant: "Cancel"
- After 30s: switches to destructive variant with "Taking too long? Cancel generation"
- Min touch target: 44x44px with `active:scale-95` haptic feedback

### Files Changed
- `src/components/editor/tailor/TailorProgress.tsx` -- add onCancel prop + cancel button
- `src/lib/aiTailor.ts` -- add signal param to `tailorResumeWithProgress` and `generateCoverLetter`
- `src/components/editor/TailorSheet.tsx` -- wire AbortController + onCancel
- `src/components/editor/tailor/CoverLetterGenerator.tsx` -- stepped progress + cancel button

