

## ATS-Targeted Resume Import Flow

### Overview
Add an ATS score preview step to the existing resume import pipeline. After the AI parses the uploaded file and before the user selects sections to import, the system automatically scores the resume and displays a visual ATS health breakdown. This gives users immediate insight into their resume's ATS readiness before they start editing.

---

### How It Works

1. User uploads a resume (PDF, Word, Image, JSON, HTML) -- unchanged
2. AI parses the file into structured data -- unchanged
3. **NEW: ATS Score Step** -- after parsing completes, the system calls the `score-resume` edge function and shows results in the Import Review Sheet
4. User reviews sections + ATS score, then imports -- enhanced UI

---

### Implementation Steps

**Step 1: Add ATS scoring to `ImportReviewSheet`**

File: `src/components/upload/ImportReviewSheet.tsx`

- Add a new `atsScore` prop of type `ResumeHealthScore | null` and an `isScoring` boolean prop
- Insert an ATS Score Card at the top of the scrollable content (above the section cards):
  - Reuses the existing `ScoreRing` component to show the overall score with animated ring
  - Shows 4 category bars (Completeness, ATS Readiness, Impact Language, Formatting) using the same layout as `ATSScoreBreakdown`
  - Displays `topStrength` and `topImprovement` as short text badges
  - While scoring is in progress, shows a skeleton/pulse state with "Analyzing ATS compatibility..." text
- Below the score card, show a contextual tip based on the score:
  - Score >= 80: "Your resume is well-optimized for ATS systems"
  - Score 50-79: "Consider improving weak areas before applying"
  - Score < 50: "Significant improvements recommended"

**Step 2: Trigger ATS scoring in `UploadPage` after parse completes**

File: `src/pages/UploadPage.tsx`

- Import `useResumeScore` hook
- Add state: `importATSScore` (ResumeHealthScore | null) and `isImportScoring` (boolean)
- In every handler that sets `pendingResumeData` + opens the review sheet (PDF, Word, Image, HTML, JSON flows):
  - After setting `setPendingResumeData(resumeData)` and `setShowImportReview(true)`
  - Fire off `scoreResume(tempId, resumeData, now)` asynchronously (non-blocking)
  - On completion, set `importATSScore` to the result
  - Reset `importATSScore` to null when the review sheet closes
- Pass `atsScore={importATSScore}` and `isScoring={isImportScoring}` to `ImportReviewSheet`

**Step 3: Style the ATS preview card**

The card will use the existing design system:
- `glass-elevated` card background with rounded-2xl corners
- `ScoreRing` component (already exists) for the circular score visualization
- Colored progress bars for each category (reuse `getScoreBarBg` from `ATSScoreBreakdown`)
- Priority badge colors: green for >= 80, amber for 50-79, red for < 50
- All touch targets maintain 44x44px minimum
- `active:scale-95` on interactive elements

---

### Technical Details

**Score invocation is non-blocking:**
The review sheet opens immediately after parsing. The ATS score loads asynchronously in the background -- users can already review and toggle sections while the score computes. This avoids adding latency to the import flow.

**Temp ID for scoring:**
Since the resume isn't saved yet, we generate a temporary UUID for the score cache key. This prevents cache collisions with real resume IDs.

**No new edge functions or database changes needed.**
Reuses the existing `score-resume` edge function and `useResumeScore` hook.

**Files to modify:**

| File | Change |
|------|--------|
| `src/components/upload/ImportReviewSheet.tsx` | Add ATS score card with ScoreRing, category bars, and contextual tip |
| `src/pages/UploadPage.tsx` | Trigger `scoreResume` after parse, pass results to review sheet |

**No new files required.**

