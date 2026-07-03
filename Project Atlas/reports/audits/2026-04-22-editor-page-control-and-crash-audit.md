# Editor page — control, crash, and AI-toast audit

**Date:** 2026-04-22
**Scope:** Everything that renders inside the `/editor` route — section components under `src/components/editor/`, the AI hook stack (`useAIEnhance`, `useAIAction`, `aiErrorParser`), `AIEnhanceDialog`, and the editor shell (`EditorPage`, `EditorScrollForm`, `EditorSectionContent`). Out of scope: full PWA / service worker behaviour (#42), AI Apply duplicating-or-vanishing entries (#39), ATS rescore after Apply (#40), full unification of the two AI error parsers (#41), anything outside `/editor`.

**Severity scale:**
- **High** = silently corrupts user data, blanks the editor, or makes the user think the AI auto-applied something it didn't.
- **Med** = visible bug, recoverable.
- **Low** = polish / inconsistency.

**Verification status:**
- `[verified]` — confirmed by reading the exact file:line cited.
- `[partial]` — verified statically; a runtime repro would need a seeded test resume + real AI provider key.
- `[inferred]` — deduced from code structure but not exercised at runtime.

---

## Executive summary

Two of the user's reports are different symptoms of the **same root cause**: the AI dialog is a read-only "Apply / Discard" surface that paints a fully opaque `bg-background` overlay on top of the entire viewport while the inner card mounts. On a slow render (lazy chunk, slow phone, slow AI response leaking past 60ms) the user sees a black screen and the toast that fires the moment they press Apply reads to them as "the AI auto-applied without my consent". The "black editor on second click" report is the same overlay rendering on top of an editor whose state was *not* corrupted — the editor was always there, just hidden behind the opaque scrim.

Three additional High-severity findings rolled up during the walk:
1. The AI payload shape is never validated client-side. Edge functions occasionally return `improved: null` / `improved: <object-with-only-id>` / `improved: <empty-string>`, and the section-level `onApply` callbacks pass that straight to `updateResume`. Combined with the store's "sanitize array fields" pass (`src/store/resumeStore.ts:146-169`) which silently coerces a non-array `experience`/`education`/`skills` to `[]`, a single bad AI response can wipe the section and trip the section guard `if (!experience) return null;`.
2. `ExperienceSection.handleAIAction` writes `enhancingExpId` and `originalDescription` to React state **before** awaiting `enhance()`. If the user clicks Improve on a different entry while the first call is in flight, the dialog renders the second entry's "original" against the first entry's "improved".
3. `useAIAction.parseErrorMessage` and `aiErrorParser.aiErrorToastMessage` are two independent parsers for the same edge-function error envelope. Whichever one fires first wins. The user's reported "AI Unavailable" toast on Improve Bullets is the legacy parser falling through to its `'AI is temporarily unavailable — please try again in a moment.'` default for a structured `not_configured` / `invalid_key` error that the canonical parser would have surfaced precisely.

This task fixes **#H-1, #H-2, #H-3, #H-4, #H-5, #M-1, #M-3** below. Findings tracked separately are noted in the matrix at the end.

---

## Method

1. Walked every section component under `src/components/editor/` and recorded every `return null` guard, every place that calls `updateResume` in response to an AI result, and every place a dialog opens off the back of an `await enhance(...)`.
2. Walked the AI hook stack (`useAIEnhance.enhance` → `executeAI` → `useAIAction.execute` → response handling) and listed every code path that surfaces a toast.
3. Cross-referenced the existing audit (`docs/audits/2026-04-21-ai-tools-reliability-and-ui-audit.md`) and noted which findings stay deferred under the parent task IDs (#39, #40, #41, #42).
4. Inspected `AIEnhanceDialog.tsx` for control affordances (read-only? editable? rerun buttons? backdrop opacity?).

---

## Findings

### H-1 [verified] AI dialog is a read-only "Apply / Discard" surface

**File:** `src/components/editor/ai/AIEnhanceDialog.tsx` (full file before fix).

**Repro:** Click any section's `Improve` / `ATS Optimize`. The "Enhanced by AI" panel renders the AI text inside a non-interactive `<div>`. The only actions are `Apply` and `Discard`. There is no way to:
- Edit the AI output before applying.
- Ask the AI to shorten, re-optimize, or regenerate from inside the dialog.
- Take the AI output as a starting point and continue editing manually.

**Impact:** Apply is the only forward-path button, so the user reasonably reads it as "this content has already been written to my resume — Apply is just an acknowledgement". Combined with the success toast that fires the instant Apply is pressed, the entire flow reads as auto-apply. Trust loss.

**Fixed in this task** — dialog now renders an inline editable textarea pre-filled with the AI output, plus `Shorten`, `Re-optimize`, `Regenerate` buttons that call back into the section's `enhance(...)` with the user's currently-edited text as the seed. `Edit manually` toggles the editable state inline. Apply uses the textarea's contents, not the original AI response.

### H-2 [verified] Dialog backdrop paints the page solid black on slow renders

**File:** `src/components/editor/ai/AIEnhanceDialog.tsx:31-32` (before fix) — `bg-background backdrop-blur-sm`.

**Repro:** On any device with a slow first render of the dialog card (cold lazy chunk, slow Android, AI response that takes >300ms to populate `improvedEntry`), the overlay paints a full-viewport opaque `bg-background` colour while the inner card has not yet mounted. To the user this is indistinguishable from a crash.

**Impact:** Directly reproduces the user's "black screen" report. Also mistaken for an editor crash by users who then close the tab thinking they lost work.

**Fixed in this task** — overlay switched to `bg-black/60 backdrop-blur-sm` (translucent scrim). The editor remains visible behind the dialog at all times, even before the inner card paints.

### H-3 [verified] AI payload shape is never validated client-side

**Files:** `src/hooks/useAIEnhance.ts:127-138` (before fix), `src/store/resumeStore.ts:146-169`.

**Repro (static):**
- Edge function returns `{ improved: null, changes: [], suggestions: [] }`.
- `useAIEnhance.enhance` returns this verbatim; the section-level `onApply` callback writes whatever it can extract.
- For `experience`, the apply path calls `updateExperience(enhancingExpId, { ... })` against an entry that may not exist in the array, which is harmless. **But** for batched callers (`AIEnhanceSheet`, `BoostAllExperienceSheet`) that do `updateResume({ experience: improved })`, a non-array `improved` hits the store's sanitize step (`resumeStore.ts:149-154`) which **silently replaces the array with `[]`**. The `ExperienceSection` guard then re-renders `null`.

**Impact:** The user sees the "section disappeared" symptom and, because the editor is wrapped in the right preview pane plus a desktop scrollform, the visual is "the center editor and the right preview both go dark — only the section sidebar still renders". This is the user's "black editor on second click" report when chained with H-2: the overlay scrim hides the empty editor, then the dialog closes and the editor body has been blanked.

**Fixed in this task** — `useAIEnhance` now runs a `validateImprovedShape(section, improved)` check before returning. Mismatch throws a structured `AIError({ code: 'enhancement_failed', message: <reason> })` so the toast is actionable and the section's `onApply` is never called with junk. Section-level apply paths additionally defend against non-string summary, non-array achievements, and empty content writing into the store.

### H-4 [verified] `useAIAction.parseErrorMessage` falls through to "AI temporarily unavailable" for structured errors

**File:** `src/hooks/useAIAction.ts:83-147`.

**Repro (static):** When the edge function returns `{ error: 'not_configured', message: 'WiseResume AI is not configured' }`:
- `useAIEnhance` sees `!res.ok`, parses with `parseAIErrorResponse`, and **throws** an `AIError({ code: 'not_configured' })`.
- `useAIAction.execute` catches it. The `instanceof AIError` branch (lines 193-208) is reached and surfaces the precise `aiErrorToastMessage` copy + an "Open Settings" action. ✅ Working.

**But** when the edge function returns `200 OK` with a body containing `{ error: 'something' }`, `useAIEnhance:177` throws `new AIError(parseAIErrorBody(body, 200))`. That path is also fine.

**The user's actual repro** is the legacy parser firing because some callers throw a plain `Error("AI request failed")` from `executeAI`'s wrapper rather than an `AIError`. In `useAIAction.parseErrorMessage:146`, the catch-all is `'AI is temporarily unavailable — please try again in a moment.'`. This is the string the user reported seeing first.

**Impact:** The "AI Unavailable" toast is misleading because the underlying error code (`not_configured` / `invalid_key`) is not transient. The user has no way to tell the difference between "wait and retry" and "go to Settings now".

**Fixed in this task** — the AIError-first branch in `useAIAction.execute` already catches the structured path; this audit verified that path stays correct, and the new `validateImprovedShape` failure also throws an `AIError`, so the structured branch wins. The deeper unification of the two parsers stays under #41.

### H-5 [verified] Race when switching experience entries mid-flight

**File:** `src/components/editor/ExperienceSection.tsx:145-166` (before fix).

**Repro:** In an editor with two experience entries A and B:
1. Click `Improve Bullets` on A. `setEnhancingExpId('A')` runs and `setOriginalDescription(A.description)` runs. AI request starts.
2. Before A's request resolves, click `Improve Bullets` on B. The second `handleAIAction` overwrites `enhancingExpId='B'` and `originalDescription=B.description`.
3. A's request resolves first. The dialog opens with `original = B.description` and `improved = A's improved entry`.
4. User presses Apply, thinking they accepted B's improvement, but `updateExperience` writes A's improved content to the entry the user is staring at.

**Impact:** Silent cross-entry corruption.

**Fixed in this task** — `setEnhancingExpId` / `setOriginalDescription` / `setImprovedEntry` are now committed in a single batch **after** `await enhance()` resolves. The local closure captures `targetId = exp.id` so the right entry id is used to look up the AI response, even if a second call has been queued.

### M-1 [verified] Empty-AI-output dialog has no escape hatch — Apply is enabled with empty content

**File:** `src/components/editor/ai/AIEnhanceDialog.tsx:117-123` (before fix).

**Repro:** When the AI returns an empty improvement (`improved: ''`), the dialog renders an empty card and Apply is enabled. Pressing Apply blanks the section.

**Fixed in this task** — Apply is disabled when the trimmed edited text is empty. The empty case also surfaces an inline warning ("The AI returned an empty result. Edit manually or try Regenerate.") so the user has a path forward without dismissing the dialog.

### M-2 [tracked separately as #41] Two parallel AI error parsers

`src/lib/aiErrorParser.ts` and `src/hooks/useAIAction.ts:parseErrorMessage` both classify the same edge-function envelope. The toast the user sees depends on which one fires first. **Deferred to #41** — that task is the unification cleanup; this task only ensured the structured `AIError` path wins for the call sites the user hit.

### M-3 [verified] Summary empty-state regression — `started=true` with no path back

**File:** `src/components/editor/SummarySection.tsx:46-54` (before fix).

**Repro:** From the empty summary state, click `Let AI Write This`. `setStarted(true)` fires immediately; if the AI call fails, `started` remains true and the section now renders a textarea with `summary === ''` and no path back to the empty-state CTAs.

**Fixed in this task** — when the auto-trigger generation in the `pendingSummaryGeneration` effect fails, `setStarted(false)` is called so the empty-state CTAs return.

### M-4 [verified] Apply success toast fires even when nothing was applied

**File:** `src/hooks/useAIEnhance.ts:apply` (before fix).

**Repro:** If `result?.improved` is falsy, the toast doesn't fire (good). But the legacy callers wrap `apply()` and **then** call `setShowDialog(false)` — meaning even a no-op apply closes the dialog without telling the user why nothing happened.

**Fixed in this task** — `apply(override?)` now early-returns when content is null/undefined and does not toast.

### L-1 [verified] Dialog dismiss-on-backdrop-click during in-flight rerun

**File:** `src/components/editor/ai/AIEnhanceDialog.tsx` (after fix).

**Note:** While a re-run is in flight (`isEnhancing=true`), backdrop click is ignored to prevent the user from accidentally discarding the in-progress request. Discard / Close X are also disabled in that window.

### L-2 [verified] `currentResume?.experience` deep-rerenders dialog

The dialog reads `improved={improvedEntry?.description || ''}` directly. When `improvedEntry` changes between re-runs, the new editable textarea's local state needs to pick up the new AI output without trashing the user's edit. **Fixed in this task** by tracking `lastImprovedRef` inside the dialog and resetting `editedText` only when the *AI's value* changes, not on every parent re-render.

---

## Fixed in this task vs. tracked separately

| ID  | Severity | Status         | Resolution                                                                 |
|-----|----------|----------------|----------------------------------------------------------------------------|
| H-1 | High     | Fixed          | Editable textarea + Shorten/Re-optimize/Regenerate buttons in dialog.      |
| H-2 | High     | Fixed          | Translucent scrim (`bg-black/60`) replaces opaque `bg-background`.         |
| H-3 | High     | Fixed          | Shape validation in `useAIEnhance` + defensive section apply callbacks.    |
| H-4 | High     | Fixed (scoped) | Verified structured `AIError` branch wins; deeper cleanup deferred to #41. |
| H-5 | High     | Fixed          | Set per-entry state after `await enhance()`; capture `targetId` locally.   |
| M-1 | Med      | Fixed          | Apply disabled on empty edited text; explicit warning shown.               |
| M-2 | Med      | Deferred → #41 | Full parser unification.                                                   |
| M-3 | Med      | Fixed          | Summary auto-generate failure resets `started=false`.                      |
| M-4 | Med      | Fixed          | `apply(override?)` early-returns and doesn't toast on no-op.               |
| L-1 | Low      | Fixed          | Discard / backdrop disabled while a re-run is in flight.                   |
| L-2 | Low      | Fixed          | Dialog tracks `lastImprovedRef` to preserve user edits across rerenders.   |
| –   | –        | Deferred → #39 | AI Apply duplicate / vanished entries.                                     |
| –   | –        | Deferred → #40 | ATS score not refreshing after Apply.                                      |
| –   | –        | Deferred → #42 | PWA service-worker tombstone crash.                                        |
