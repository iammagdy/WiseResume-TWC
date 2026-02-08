

# Add Timeline View to Work Experience Section

## Overview

Add a visual timeline feature to the Work Experience tab that helps users see their career history at a glance, including employment dates and gaps between jobs.

## What You'll See

When viewing the Work tab:
1. **Each job card will show the date range** (e.g., "Jan 2020 - Present") directly in the collapsed header
2. **A visual timeline bar** will appear at the top showing your career span with colored segments for each job
3. **Gap indicators** will highlight periods without employment so you can address them

## Visual Design

```
+------------------------------------------+
|  Work Experience     [AI] [+ Add]        |
+------------------------------------------+
|                                          |
|  TIMELINE BAR                            |
|  [====2018====][gap][===2020-2023===]    |
|   TE Data           Teleperformance      |
|                                          |
|  "1 gap detected: 6 months"              |
|                                          |
+------------------------------------------+
|                                          |
|  Guest Transport Supervisor      v       |
|  Etihad Airways                          |
|  Jan 2023 - Present  (2 yrs 1 mo)        |
|                                          |
+------------------------------------------+
|                                          |
|  Airline Services Coordinator    v       |
|  Teleperformance                         |
|  Mar 2020 - Dec 2022  (2 yrs 10 mo)      |
|                                          |
+------------------------------------------+
```

## Technical Details

### File Changes

| File | Change |
|------|--------|
| `src/components/editor/ExperienceSection.tsx` | Add timeline component and date display to card headers |
| `src/components/editor/ExperienceTimeline.tsx` | **NEW** - Visual timeline bar component |
| `src/lib/dateUtils.ts` | **NEW** - Date parsing and gap calculation utilities |

### Key Features

**1. Date Display in Card Header**
- Show date range (e.g., "Jan 2020 - Present") below the company name
- Calculate and show duration (e.g., "2 yrs 3 mo")
- Use a subtle calendar icon for visual clarity

**2. Visual Timeline Bar (Optional Enhancement)**
- Horizontal bar showing career span
- Each job appears as a colored segment
- Gaps shown as dashed/striped sections
- Hover/tap shows job details

**3. Gap Detection**
- Calculate gaps between consecutive jobs
- Show a summary like "1 gap detected: 6 months between jobs"
- Optional: AI suggestion to help explain gaps

### Date Parsing Logic

The dates are stored as strings (e.g., "Jan 2020"). The utilities will:
- Parse various formats: "Jan 2020", "January 2020", "2020-01", etc.
- Handle "Present" for current jobs
- Calculate duration between dates
- Detect gaps of 1+ month between jobs

### UI Component Changes

**ExperienceSection.tsx - Card Header Update:**
```
Current:
  Position Title
  Company Name

After:
  Position Title
  Company Name
  Jan 2020 - Present • 2 yrs 1 mo
```

The date line will use muted text styling to not overwhelm the primary info while still being clearly visible.

### Gap Detection Alert

When gaps are found, a subtle info banner appears:
- Shows count and total duration of gaps
- Non-intrusive design (dismissible)
- Optional: "AI can help explain gaps" action button

## Implementation Priority

1. **First**: Add dates to card headers (quick win, immediately useful)
2. **Second**: Create date utility functions for parsing and duration calculation
3. **Third**: Add visual timeline bar (visual polish)
4. **Fourth**: Add gap detection and alerts (advanced feature)

This feature helps users quickly scan their work history and identify any gaps that recruiters might question, making it easier to build a complete and polished resume.

