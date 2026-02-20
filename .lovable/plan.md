

# Smart Shake-to-Report: Auto-Detect Active Feature and Recent Issues

## What This Changes

Right now, shaking your phone to report a bug sends a generic message ("Bug report via shake gesture") with only the page route. The app has no idea whether you were in the middle of tailoring a resume, running a mock interview, or exporting a PDF. You have to manually explain everything.

This improvement makes the shake report **automatically detect** what you were doing, what tool or feature was open, and any recent errors that happened -- so the report is pre-filled with rich context before you even type a word.

---

## How It Works for Users

1. You're using the Tailor tool and it fails silently or produces a weird result
2. You shake your phone
3. The bug report dialog opens and **already shows**:
   - Screen: "Resume Editor"
   - Active Tool: "Smart Tailor"
   - Recent Issue: "Tailor resume error: Rate limit reached" (if one occurred)
   - Category: "AI Feature" (auto-detected from the error)
4. You can optionally add your own description, or just hit "Send Report" immediately

If no error occurred recently (you just want to report a general concern), the dialog shows the active tool but labels the report as "General Feedback" -- the user can write their concern freely.

---

## Implementation

### New File: `src/lib/activityTracker.ts`

A lightweight singleton that any component can push context into:

```text
- setActiveFeature(name: string | null)  -- called when a sheet/tool opens or closes
- pushRecentError(message: string, stack?: string)  -- called from catch blocks / showErrorToast
- getSnapshot()  -- returns { activeFeature, recentErrors: last 5 within 60s }
- clearErrors()  -- called after a bug report is sent
```

The tracker stores:
- `activeFeature`: string like "Smart Tailor", "Mock Interview", "Job Match Analysis", "Proofread", etc.
- `recentErrors`: circular buffer of the last 5 errors with timestamps (auto-expires after 60 seconds)

No Zustand, no persistence -- just a plain module-level object. It only lives in memory because it's transient debugging context.

### Updated File: `src/lib/errorToast.ts`

After calling `haptics.error()` and before showing the toast, also push the error into the activity tracker:

```text
activityTracker.pushRecentError(message, error?.message)
```

This means every `showErrorToast()` call across the entire app automatically feeds the shake reporter.

### Updated File: `src/hooks/useShakeDetect.ts`

When triggering the bug report, read the activity tracker snapshot and pass it into `triggerBugReport()`:

```text
const snapshot = activityTracker.getSnapshot();
triggerBugReport({
  errorMessage: snapshot.recentErrors[0]?.message || 'Bug report via shake gesture',
  errorStack: snapshot.recentErrors[0]?.stack,
  route: location.pathname,
  action: snapshot.activeFeature || undefined,
  source: 'shake',
  detectedContext: {
    activeFeature: snapshot.activeFeature,
    recentErrors: snapshot.recentErrors,
  },
});
```

### Updated File: `src/lib/bugReport.ts`

Extend the `BugReportData` interface:

```text
detectedContext?: {
  activeFeature: string | null;
  recentErrors: Array<{ message: string; stack?: string; timestamp: number }>;
};
```

Update `categorizeError` to also check the active feature name for better category detection (e.g., if activeFeature is "Smart Tailor", default to "AI Feature" category even if the error message is generic).

### Updated File: `src/components/BugReportDialog.tsx`

Enhance the `DetectedContextCard` to show:
- The **active tool name** (e.g., "Smart Tailor") with a wrench icon
- The **most recent error** (truncated to 100 chars) with an alert icon
- A toggle to switch between "Report this issue" (pre-filled with the detected error) and "Report something else" (clears the pre-fill and shows a blank textarea)

The dialog header changes:
- If a recent error exists: "We noticed an issue" with the error auto-filled
- If no error but a tool is active: "Report an issue with [Tool Name]"
- If nothing detected: "What went wrong?" (general feedback mode)

### Instrument Key Tools (add `setActiveFeature` calls)

Each sheet/tool sets the active feature on open and clears it on close:

| File | Feature Name |
|------|-------------|
| `src/components/editor/TailorSheet.tsx` | "Smart Tailor" |
| `src/components/editor/JobAnalysisSheet.tsx` | "Job Match Analysis" |
| `src/components/editor/ai/RecruiterSimSheet.tsx` | "Recruiter Simulator" |
| `src/components/editor/ai/AIDetectorSheet.tsx` | "AI Humanizer" |
| `src/components/editor/ai/LinkedInOptimizerSheet.tsx` | "LinkedIn Optimizer" |
| `src/pages/InterviewPage.tsx` | "Mock Interview" |
| `src/components/editor/ai/AIEnhanceSheet.tsx` | "AI Enhance" |
| `src/hooks/useProofread.ts` | "Proofread" |
| `src/components/editor/GapFillerSheet.tsx` | "Gap Filler" |
| `src/components/ai-studio/ResumeABCompareSheet.tsx` | "A/B Compare" |

Each tool just needs two lines:
- `useEffect(() => { setActiveFeature('Tool Name'); return () => setActiveFeature(null); }, [open])`

### Updated Edge Function: `supabase/functions/send-bug-report/index.ts`

Add `active_feature` and `recent_errors` fields to the payload accepted and stored in the `bug_reports` table. The email sent to the developer will include these in the "Context" section for faster debugging.

### Database Migration

Add two columns to the `bug_reports` table:
- `active_feature TEXT` (nullable)
- `recent_errors JSONB` (nullable, default null)

---

## Files Changed Summary

| File | Change |
|------|--------|
| `src/lib/activityTracker.ts` | **New** -- singleton context tracker |
| `src/lib/bugReport.ts` | Extend `BugReportData` with `detectedContext` |
| `src/lib/errorToast.ts` | Push errors to activity tracker |
| `src/hooks/useShakeDetect.ts` | Read snapshot and pass to `triggerBugReport` |
| `src/components/BugReportDialog.tsx` | Show active tool, recent error, report mode toggle |
| `src/components/editor/TailorSheet.tsx` | `setActiveFeature('Smart Tailor')` |
| `src/components/editor/JobAnalysisSheet.tsx` | `setActiveFeature('Job Match Analysis')` |
| `src/components/editor/ai/RecruiterSimSheet.tsx` | `setActiveFeature('Recruiter Simulator')` |
| `src/components/editor/ai/AIDetectorSheet.tsx` | `setActiveFeature('AI Humanizer')` |
| `src/components/editor/ai/LinkedInOptimizerSheet.tsx` | `setActiveFeature('LinkedIn Optimizer')` |
| `src/pages/InterviewPage.tsx` | `setActiveFeature('Mock Interview')` |
| `src/components/editor/ai/AIEnhanceSheet.tsx` | `setActiveFeature('AI Enhance')` |
| `src/hooks/useProofread.ts` | `setActiveFeature('Proofread')` |
| `src/components/editor/GapFillerSheet.tsx` | `setActiveFeature('Gap Filler')` |
| `src/components/ai-studio/ResumeABCompareSheet.tsx` | `setActiveFeature('A/B Compare')` |
| `supabase/functions/send-bug-report/index.ts` | Accept and store new context fields |
| Database migration | Add `active_feature` and `recent_errors` columns |

