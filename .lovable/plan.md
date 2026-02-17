

## On-Page Deep Analyze for Section-Specific ATS Improvements

### Problem
The "Deep Analyze" button already exists in `ATSInlineSuggestions`, but it is broken and lacks a proper results UI:

1. **Wrong request body**: `fetchDeepSuggestions` sends `{ section, content, action, resumeData, jobDescription }` but the `enhance-section` edge function expects `{ section, action, currentContent, context: { resume, jobDescription } }` -- so the call silently fails or returns malformed results.
2. **Unparsed results**: The AI returns `{ improved, changes, suggestions }` where `suggestions` is an array of plain strings, but the hook tries to read `.message`, `.type`, `.priority` as if they were structured objects.
3. **No dedicated results display**: Deep analysis results (the rewritten content + change list) are just merged into the same keyword-tip rows, losing the most valuable output -- the actual improved content the user can apply.

### Solution
Fix the request/response pipeline and add a rich inline results panel that shows the AI-rewritten content with an "Apply" button, plus a list of specific changes made.

---

### Step 1: Fix `useATSSuggestions.fetchDeepSuggestions`

File: `src/hooks/useATSSuggestions.ts`

- Fix the request body to match the edge function's expected shape:
  ```text
  body: {
    section,
    action: 'ats_optimize',
    currentContent: getSectionContent(resume, section),
    context: { resume, jobDescription }
  }
  ```
- Store the full AI result (`improved`, `changes`, `suggestions`) in a new `deepResults` state map keyed by section, rather than trying to convert everything into `ATSSuggestion` objects.
- Parse the `suggestions` array (plain strings) into proper `ATSSuggestion` objects for the tips list.
- Expose `deepResults` and a `clearDeepResult(section)` function.

### Step 2: Add Deep Analysis Results Panel to `ATSInlineSuggestions`

File: `src/components/editor/ATSInlineSuggestions.tsx`

Add new props and UI:
- Accept `deepResult?: { improved: unknown; changes: string[]; suggestions?: string[] }` and `onApplyDeep`, `onDiscardDeep` callbacks.
- When `deepResult` is present, render a results card below the tips list:
  - A header: "AI Optimized Content Ready" with a sparkle icon.
  - A bulleted list of `changes` (e.g., "Added metrics to bullet 2", "Strengthened action verb").
  - Two action buttons: "Apply Changes" (primary) and "Discard" (ghost).
  - Tapping "Apply Changes" calls `onApplyDeep(deepResult.improved)` which updates the resume store for that section.
  - Tapping "Discard" calls `onDiscardDeep` to clear the result.
- Show a stepped progress indicator while `isAnalyzing` is true (Analyzing... -> Optimizing... -> Finalizing...).

### Step 3: Wire up apply/discard in `EditorPage`

File: `src/pages/EditorPage.tsx`

- Destructure `deepResults` and `clearDeepResult` from `useATSSuggestions`.
- Create a `handleApplyDeep(section, improved)` callback that applies the AI content to the resume store using the same section-to-field mapping already used by `SectionAIAction`.
- Pass `deepResult`, `onApplyDeep`, and `onDiscardDeep` to each `ATSInlineSuggestions` instance.

---

### Technical Details

**Request body fix (useATSSuggestions.ts line ~162):**
```text
Before: { section, content, action: 'ats_optimize', resumeData: resume, jobDescription }
After:  { section, action: 'ats_optimize', currentContent, context: { resume, jobDescription } }
```

**New state shape in hook:**
```text
deepResults: Record<SectionId, {
  improved: unknown;
  changes: string[];
  suggestions?: string[];
}>
```

**Apply mapping (reuses existing pattern from SectionAIAction):**
```text
summary  -> updateResume({ summary: improved })
experience -> updateResume({ experience: improved })
education -> updateResume({ education: improved })
skills -> updateResume({ skills: improved })
```

**Files to modify:**

| File | Change |
|------|--------|
| `src/hooks/useATSSuggestions.ts` | Fix request body, add `deepResults` state, expose `clearDeepResult` |
| `src/components/editor/ATSInlineSuggestions.tsx` | Add deep result panel with Apply/Discard, stepped progress |
| `src/pages/EditorPage.tsx` | Wire `deepResults`, `handleApplyDeep`, `clearDeepResult` to inline suggestions |

No new files, edge functions, or database changes required.
