

# Add AI Suggestion for Employment Gap Explanation

## Overview

When gaps are detected between jobs, the app will offer an AI-powered feature that helps users generate professional explanations for their employment gaps. This helps users address a common resume concern proactively.

## User Experience

When you have employment gaps detected:

1. The existing amber gap alert will gain a new "Get AI Help" button
2. Tapping it opens a bottom sheet with gap-specific suggestions
3. The AI analyzes the gap duration and surrounding job context
4. Users receive professional wording they can add to their resume or prepare for interviews

### Visual Flow

```text
+------------------------------------------+
|  Gap Alert Banner                        |
|  "1 gap detected: 6 months"              |
|  [Explain with AI]  [X Dismiss]          |
+------------------------------------------+
                   |
                   v (tap "Explain with AI")
+------------------------------------------+
|  AI Gap Assistant Sheet                  |
|                                          |
|  Gap: Jan 2022 - Jun 2022 (6 months)     |
|                                          |
|  [Select a reason v]                     |
|  - Career transition                     |
|  - Personal development                  |
|  - Family/caregiving                     |
|  - Health-related                        |
|  - Relocation                            |
|  - Education/training                    |
|                                          |
|  [Generate Explanation]                  |
+------------------------------------------+
                   |
                   v (AI generates)
+------------------------------------------+
|  Your explanation:                       |
|  "During this period, I focused on       |
|  upskilling in data analytics through    |
|  online certifications, preparing for    |
|  my transition into tech."               |
|                                          |
|  [Copy]  [Add to Summary]  [Close]       |
+------------------------------------------+
```

## Technical Implementation

### New Files

| File | Purpose |
|------|---------|
| `src/components/editor/GapExplainerSheet.tsx` | Bottom sheet UI for gap explanation |
| `supabase/functions/explain-gap/index.ts` | Edge function to generate gap explanations |

### Modified Files

| File | Change |
|------|--------|
| `src/components/editor/ExperienceTimeline.tsx` | Add "Explain with AI" button to gap alert |
| `src/components/editor/ExperienceSection.tsx` | Manage sheet open/close state |

### Edge Function: `explain-gap`

The edge function will:
1. Accept gap details (duration, surrounding jobs)
2. Accept a selected reason category
3. Use Lovable AI (google/gemini-3-flash-preview) to generate a professional explanation
4. Return the explanation with optional variations

**Request payload:**
```json
{
  "gap": {
    "startDate": "Jan 2022",
    "endDate": "Jun 2022",
    "months": 6
  },
  "reason": "career_transition",
  "previousJob": {
    "position": "Marketing Coordinator",
    "company": "ABC Corp"
  },
  "nextJob": {
    "position": "Data Analyst",
    "company": "XYZ Inc"
  }
}
```

**Response:**
```json
{
  "explanation": "During this 6-month period, I strategically transitioned from marketing to data analytics by completing Google's Data Analytics Professional Certificate and building a portfolio of projects. This prepared me for my role at XYZ Inc.",
  "tips": [
    "Be honest but positive about the gap",
    "Focus on what you learned or accomplished",
    "Connect the gap to your career progression"
  ]
}
```

### Component: `GapExplainerSheet`

Features:
- Displays gap details (dates, duration)
- Shows context from surrounding jobs
- Dropdown to select reason category
- Optional text input for additional context
- Loading state during AI generation
- Copy-to-clipboard for the explanation
- Option to add explanation to resume summary

### Reason Categories

- Career transition / exploring new paths
- Personal development / skill building
- Family or caregiving responsibilities
- Health-related leave
- Relocation
- Education or training
- Entrepreneurial venture
- Volunteer work / sabbatical
- Other (custom input)

### UI Integration in ExperienceTimeline

The existing gap alert banner at lines 141-165 will be enhanced:

```text
Before:
[AlertCircle] 1 gap detected: 6 months between jobs [X]

After:
[AlertCircle] 1 gap detected: 6 months between jobs
              [Explain with AI]                      [X]
```

## Implementation Details

### State Management

The `ExperienceSection` will manage:
- `showGapSheet: boolean` - controls sheet visibility
- `selectedGap: GapInfo | null` - the gap being explained
- Pass down `onExplainGap` callback to `ExperienceTimeline`

### Copy to Clipboard

Use the Clipboard API:
```typescript
await navigator.clipboard.writeText(explanation);
toast.success('Copied to clipboard!');
```

### Add to Summary Option

When user chooses "Add to Summary", the explanation will be appended to the resume summary section with a transition note like:

```text
[Existing summary...]

Career Note: During my transition from [Previous Role] to [Next Role], I [explanation].
```

## Security & Rate Limiting

- The edge function will require authentication (same pattern as `enhance-section`)
- Standard rate limit handling for 429/402 errors
- Show user-friendly messages when limits are reached

## Summary

This feature helps users address employment gaps professionally by:
1. Detecting gaps automatically (already implemented)
2. Offering AI-powered explanation generation (new)
3. Providing ready-to-use professional wording
4. Giving options to copy or add to resume

