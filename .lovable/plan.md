

## In-Page ATS Optimization Suggestions

### Overview
Add persistent, inline ATS optimization tips directly within each editor section card -- visible without opening sheets or dialogs. When a user sets a target job description, the system analyzes each section and surfaces specific, actionable keyword and formatting suggestions right below the section content. One-tap application of each suggestion speeds up the optimization loop.

---

### Current State
- Each section already has an "AI Assist" button (SectionAIAction) with an "ATS Optimize" action, but it requires: click button, pick action, wait for response, review dialog, apply
- The AIContextualNudge component shows one nudge per section but only for content completeness (empty summary, missing metrics, etc.)
- The ATS score is shown as a collapsible completeness bar in the editor header area
- The AIEnhanceSheet allows batch enhancement but opens a full-height sheet

### What's New
An **inline ATS suggestion panel** that appears directly under each section's content when the user has set a job description. No extra clicks needed -- suggestions appear automatically and can be applied or dismissed one by one.

---

### Implementation Steps

**Step 1: Create `useATSSuggestions` hook**

New file: `src/hooks/useATSSuggestions.ts`

- Accepts the current resume data and job description
- Computes lightweight, client-side keyword analysis per section (no API call):
  - Extracts keywords from job description (split, normalize, deduplicate)
  - Checks which keywords appear in each section's content
  - Returns missing keywords per section with relevance scores
- Provides a `fetchDeepSuggestions(section)` function that calls the existing `enhance-section` edge function with `ats_optimize` action for AI-powered suggestions (on-demand, not automatic)
- Caches suggestions per section + job description hash to avoid redundant API calls
- Returns: `{ getSuggestions(section): ATSSuggestion[], isAnalyzing, fetchDeepSuggestions(section) }`

Interface:
```text
ATSSuggestion {
  id: string
  type: 'missing_keyword' | 'weak_verb' | 'add_metrics' | 'formatting'
  message: string        // e.g. "Add keyword: React.js"
  section: SectionType
  priority: 'high' | 'medium' | 'low'
  autoFix?: string       // Pre-computed fix text (for keywords, can auto-add to skills)
}
```

**Step 2: Create `ATSInlineSuggestions` component**

New file: `src/components/editor/ATSInlineSuggestions.tsx`

A compact card that renders inside each SectionCard, below the content:
- Shows only when job description is set and there are suggestions for this section
- Displays a count badge: "3 ATS tips"
- Expandable/collapsible (default collapsed after first visit)
- Each suggestion is a single row with:
  - Icon (colored by priority: red/amber/blue)
  - Message text
  - "Apply" chip button (for auto-fixable items like adding a keyword to skills)
  - "Dismiss" button (X icon)
- "Deep Analyze" button at the bottom calls `fetchDeepSuggestions` for AI-powered section-specific ATS optimization (reuses existing edge function)
- Matches existing glass-card styling, uses `active:scale-95` for touch targets

**Step 3: Integrate into `renderEditorContent` in EditorPage**

- Import the new `ATSInlineSuggestions` component
- Add it inside each SectionCard render block (after the section content, before the navigation buttons)
- Pass the current section type and resume data
- The component self-manages visibility based on whether a job description exists

**Step 4: Add "Quick ATS Scan" action to editor tools**

- Add a new action in the mobile tools sheet and desktop header
- Triggers a full-resume client-side keyword scan that opens a summary bottom sheet showing:
  - Per-section missing keyword counts
  - Tap any section to jump to it (calls `handleTabChange`)
  - Overall keyword match percentage
- Reuses the hook from Step 1

---

### Technical Details

**Client-side keyword extraction (no API cost):**
```text
1. Split job description by whitespace and punctuation
2. Normalize: lowercase, remove common stop words
3. Extract multi-word phrases (bigrams) for technical terms
4. For each section, check presence of keywords in content
5. Return missing keywords sorted by frequency in job description
```

**Auto-fix for skills section:**
When a missing keyword suggestion has `autoFix`, tapping "Apply" directly adds the keyword to the skills array via `updateResume({ skills: [...currentSkills, keyword] })`.

**For other sections:**
Tapping "Apply" on a non-auto-fixable suggestion opens the existing AI Assist flow with `ats_optimize` pre-selected, so the existing enhancement pipeline handles the actual content rewriting.

**Performance:**
- Client-side keyword analysis runs synchronously (fast, no debounce needed)
- AI-powered deep suggestions are on-demand only (user taps "Deep Analyze")
- Suggestions are memoized per section + job description hash
- Component uses `React.memo` to prevent unnecessary re-renders

**Files to create:**
| File | Purpose |
|------|---------|
| `src/hooks/useATSSuggestions.ts` | Client-side keyword analysis + AI deep analysis wrapper |
| `src/components/editor/ATSInlineSuggestions.tsx` | Inline suggestion cards per section |
| `src/components/editor/ATSScanSheet.tsx` | Full-resume scan summary sheet |

**Files to modify:**
| File | Change |
|------|--------|
| `src/pages/EditorPage.tsx` | Add ATSInlineSuggestions inside each section render block; add Quick ATS Scan to tools |
| `src/store/resumeStore.ts` | Add `jobDescription` getter if not already exposed (it is) |

No database changes or new edge functions needed -- reuses the existing `enhance-section` function with the `ats_optimize` action.

