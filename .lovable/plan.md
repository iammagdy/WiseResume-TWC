
# Multi-Job Comparison: Compare Tailoring Results Side-by-Side

## Overview

Add the ability for users to tailor the same resume to multiple jobs and compare the results. Since this is a mobile-first app, the comparison uses a **swipeable carousel** pattern instead of a traditional side-by-side grid.

---

## User Flow

```text
1. Open Tailor Sheet → Tailor to Job A → Save Result
2. Click "Compare to Another Job" → Enter Job B → Tailor
3. View comparison carousel: Swipe between Job A and Job B results
4. Pick the best fit → Apply that version
```

---

## Mobile-First Design Decisions

| Challenge | Desktop Solution | Mobile Solution (Used Here) |
|-----------|------------------|----------------------------|
| Side-by-side comparison | Two-column grid | Swipeable carousel with dot indicators |
| Viewing full results | All visible | Collapsed cards with expand |
| Selecting winner | Radio buttons | Prominent tap-to-select cards |
| Quick metrics | Table rows | Stacked comparison bars |

---

## New Components

### 1. `MultiJobCompareSheet.tsx`
Full-screen sheet for managing multi-job comparisons.

**Features:**
- Carousel of job comparison cards (swipe left/right)
- Dot indicators showing current position
- "Add Another Job" button (max 4 jobs)
- "Pick Best Match" selection at bottom

**UI Layout:**
```text
┌─────────────────────────────────────────┐
│ ← Compare Jobs                    [Add] │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  Senior Engineer @ Amazon        │  │
│  │  ━━━━━━━━━━━━━ 92%              │  │
│  │                                   │  │
│  │  Skills: +90  |  ATS: +85        │  │
│  │  Experience: +72                 │  │
│  │                                   │  │
│  │  [View Full Details]             │  │
│  └───────────────────────────────────┘  │
│                                         │
│            ●  ○  ○                      │
│         Swipe to compare                │
│                                         │
├─────────────────────────────────────────┤
│ Best Match: Amazon @ 92%                │
│                                         │
│  [Apply This Version]                   │
└─────────────────────────────────────────┘
```

### 2. `JobCompareCard.tsx`
Individual job comparison card for the carousel.

**Shows:**
- Job title and company
- Overall match score with animated ring
- Score breakdown (Skills, Experience, Keywords, ATS)
- Key improvements count
- "View Details" to expand full tailor result

### 3. `CompareScoreBars.tsx`
Visual bar chart comparing scores across all jobs.

**UI:**
```text
Skills Match
Amazon     ████████████████████ 90%
Google     ███████████████░░░░░ 75%
Meta       ██████████████████░░ 85%
```

---

## Data Flow

### New State in `resumeStore.ts`

```typescript
interface MultiJobComparison {
  id: string;
  resumeId: string;
  jobs: {
    id: string;
    jobTitle: string;
    company: string;
    jobDescription: string;
    tailorResult: SuperTailorResult;
    createdAt: string;
  }[];
  selectedJobId: string | null;
  createdAt: string;
}

// Add to ResumeState:
multiJobComparisons: MultiJobComparison[];
currentComparison: MultiJobComparison | null;
addJobToComparison: (job: {...}) => void;
removeJobFromComparison: (jobId: string) => void;
selectBestJob: (jobId: string) => void;
clearComparison: () => void;
```

### Integration Points

1. **TailorSheet.tsx** - Add "Compare to Another Job" button after tailoring
2. **AIHubSheet.tsx** - Add "Multi-Job Compare" option in the menu
3. **TailorHistorySheet.tsx** - Option to add historical result to comparison

---

## New Types

### `src/types/resume.ts`

```typescript
export interface JobComparisonEntry {
  id: string;
  jobTitle: string;
  company: string;
  jobDescription: string;
  tailorResult: SuperTailorResult;
  createdAt: string;
}

export interface MultiJobComparison {
  id: string;
  resumeId: string;
  jobs: JobComparisonEntry[];
  selectedJobId: string | null;
  createdAt: string;
}
```

---

## Implementation Details

### File 1: `src/components/editor/tailor/MultiJobCompareSheet.tsx`

```typescript
// Main sheet component with:
// - Embla carousel for swipeable job cards
// - Dot indicators for navigation
// - "Add Another Job" floating button
// - Bottom selection bar with "Apply" button
// - Haptic feedback on swipe and selection
```

### File 2: `src/components/editor/tailor/JobCompareCard.tsx`

```typescript
// Individual comparison card showing:
// - Job title with company badge
// - Animated score circle (reuse AnimatedNumber pattern)
// - Score breakdown grid (2x2 for mobile)
// - Expand button for full details
// - Selection indicator (checkmark when selected)
```

### File 3: `src/components/editor/tailor/CompareScoreBars.tsx`

```typescript
// Horizontal bar chart component:
// - Each job as a labeled bar
// - Animated fill based on score
// - Color coding (green/amber/red by score)
// - Tap bar to select that job
```

### File 4: `src/store/resumeStore.ts` (modifications)

```typescript
// Add new state:
multiJobComparisons: [],
currentComparison: null,

// Add new actions:
startNewComparison: (resumeId, firstJob) => {...},
addJobToComparison: (job) => {...},
removeJobFromComparison: (jobId) => {...},
selectBestJob: (jobId) => {...},
applySelectedJob: () => {...}, // Apply winner and close
clearComparison: () => {...},
```

### File 5: `src/components/editor/TailorSheet.tsx` (modifications)

After tailoring completes, add:
```tsx
{tailorResult && !isTailoring && (
  <Button
    variant="outline"
    className="w-full"
    onClick={() => {
      startNewComparison(currentResume.id, {
        jobTitle: parsedJobInfo?.title,
        company: parsedJobInfo?.company,
        jobDescription,
        tailorResult,
      });
      setShowMultiCompare(true);
    }}
  >
    <GitCompare className="w-4 h-4 mr-2" />
    Compare to Another Job
  </Button>
)}
```

---

## Mobile UX Features

1. **Swipe gestures** - Natural carousel swiping with momentum
2. **Haptic feedback** - Light haptic on card change, success on selection
3. **Pull-down dismiss** - Swipe down to close the sheet
4. **Touch-optimized cards** - 48px minimum touch targets
5. **Dot indicators** - Clear position in carousel
6. **Animation** - Score numbers animate on card entry
7. **Skeleton loading** - While tailoring additional jobs

---

## Accessibility

- Screen reader announcements for carousel position
- Focus management when adding/removing jobs
- Proper ARIA labels for comparison elements
- Color-blind friendly score indicators (icons + colors)

---

## Files to Create

| File | Description |
|------|-------------|
| `src/components/editor/tailor/MultiJobCompareSheet.tsx` | Main comparison sheet |
| `src/components/editor/tailor/JobCompareCard.tsx` | Individual job card |
| `src/components/editor/tailor/CompareScoreBars.tsx` | Bar chart visualization |

## Files to Modify

| File | Changes |
|------|---------|
| `src/types/resume.ts` | Add comparison types |
| `src/store/resumeStore.ts` | Add comparison state and actions |
| `src/components/editor/TailorSheet.tsx` | Add "Compare to Another Job" button |
| `src/components/editor/AIHubSheet.tsx` | Add comparison entry point |

---

## Edge Cases

1. **Max 4 jobs** - Prevent adding more than 4 for comparison
2. **Same job twice** - Warn if job description is similar
3. **Empty comparison** - Handle when all jobs removed
4. **Offline** - Show cached comparisons, disable "Add Job"
5. **Resume changed** - Warn if resume was modified since tailoring

---

## Expected Outcome

Users can:
1. Tailor their resume to multiple jobs in one session
2. Easily swipe between results to compare scores
3. See visual bar charts showing which job is the best fit
4. Select and apply their preferred version with one tap
5. Make informed decisions about which jobs to prioritize
