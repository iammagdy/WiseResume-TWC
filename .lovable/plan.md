

# Tailor Tool -- User Flow Analysis and Gap Report

## Summary

The Tailor tool is feature-rich but has several broken navigation flows, a credit bypass, and UX friction points that will confuse users in production. Here are the issues ranked by impact.

---

## CRITICAL: Broken Deep-Link (`?tailor=true` Never Opens TailorSheet)

Two navigation flows use `?tailor=true` to open the tailor sheet from outside the editor:

- **AnalyzeJobSheet** navigates to `/editor?tailor=true&jobTitle=...&jobCompany=...`
- **ApplicationsPage** navigates to `/editor?tailor=true&jobTitle=...&company=...`

But **EditorPage only handles `?openTailor=1`** -- it never checks for `?tailor=true`. This means users who tap "Tailor Resume" from the dashboard job analysis or from the applications page land in the editor with **nothing happening**. The tailor sheet silently fails to open.

**Fix:** Update EditorPage's `useEffect` to also handle `?tailor=true`, and pre-populate the job description in the store from the query params when available. Alternatively, standardize all callers to use `?openTailor=1`.

---

## HIGH: SetTargetJobSheet Bypasses Credit System

`SetTargetJobSheet` (opened from the resume detail page) calls `tailorResumeWithProgress()` directly without wrapping it in `useAIAction({ operation: 'tailor' })`. This means:

- No credit check before the AI call
- No credit deduction after
- Users can run unlimited tailoring from this entry point

Every other AI feature uses `useAIAction`. This is the only bypass.

**Fix:** Wrap the `tailorResumeWithProgress` call in `useAIAction({ operation: 'tailor' }).execute()`.

---

## HIGH: Job Description Lost Between Screens

When users navigate from `AnalyzeJobSheet` or `ApplicationsPage` to the editor with tailor intent, the job description they already entered is **not carried over**. The `AnalyzeJobSheet` only passes `jobTitle` and `jobCompany` as query params, but not the full job description text. Users have to paste the job description a second time in the TailorSheet.

**Fix:** Before navigating, store the job description in the Zustand store (`setJobDescription()`), which the TailorSheet already reads from on open. This eliminates the need to pass it via URL params.

---

## MEDIUM: No Resume Selection When TailorSheet Opens Without Context

When TailorSheet is opened from AI Studio (`AIStudioPage`), it relies on `currentResume` being set in the Zustand store. If the user hasn't recently edited a resume, `currentResume` is null, and tapping "Tailor My Resume" shows a toast error: "No resume to tailor". There's no way to select a resume from within the sheet.

**Fix:** Add a resume picker at the top of TailorSheet when `currentResume` is null -- a simple dropdown or list of the user's resumes that sets `currentResumeId` when selected.

---

## MEDIUM: Confusing Input Flow in JobUrlParser

The `JobUrlParser` component has an unintuitive interaction pattern:

1. It starts in "URL mode" showing a URL input field
2. If the user starts typing plain text, `handleInputChange` is defined but **never actually connected** as an event handler -- the URL input has its own inline onChange
3. The "Or paste manually" toggle switches to a textarea, but there's no clear visual indication of which mode is active
4. If URL parsing fails, it auto-shows the manual textarea, but the URL input remains visible above with stale content

**Fix:** Simplify to a single smart input: one textarea that auto-detects URLs. If the pasted content contains a URL, show a "Parse URL" button inline. Remove the mode toggle entirely.

---

## LOW: Inconsistent Param Names Across Callers

- `AnalyzeJobSheet` uses `jobCompany` as a query param
- `ApplicationsPage` uses `company` as a query param
- Neither is read by EditorPage anyway (since `?tailor=true` isn't handled)

This will cause bugs when the deep-link is fixed if the param names aren't standardized.

**Fix:** Standardize on `jobTitle` and `company` across all callers.

---

## LOW: "What's new in AI Tailor" Tips Section

The initial state of TailorSheet shows a permanent "What's new" tips section at the bottom. For returning users, this is wasted space that pushes the "Tailor My Resume" button further down. For new users, it's useful context.

**Fix:** Show this section only once per user, then collapse it. Use `localStorage` or `onboarding_flags` in user_preferences.

---

## Implementation Plan

### Step 1: Fix the broken deep-link (Critical)

In `EditorPage.tsx`, extend the existing `useEffect` to also handle `?tailor=true`:

```tsx
useEffect(() => {
  if (searchParams.get('openTailor') === '1' || searchParams.get('tailor') === 'true') {
    setShowTailor(true);
    // Clean up all tailor-related params
    searchParams.delete('openTailor');
    searchParams.delete('tailor');
    searchParams.delete('jobTitle');
    searchParams.delete('company');
    searchParams.delete('jobCompany');
    setSearchParams(searchParams, { replace: true });
  }
}, [searchParams, setSearchParams]);
```

### Step 2: Carry job description through navigation

In `AnalyzeJobSheet.handleTailor()` and `ApplicationsPage`, call `setJobDescription(description)` on the Zustand store before navigating. TailorSheet already reads `jobDescription` from the store on open, so it will be pre-populated.

### Step 3: Add credit gating to SetTargetJobSheet

Add `useAIAction({ operation: 'tailor' })` and wrap the `tailorResumeWithProgress` call in `execute()`.

### Step 4: Add resume picker fallback to TailorSheet

When `currentResume` is null, show a compact resume selector (list of user's resumes from `useResumes()`) instead of the job input form.

### Step 5: Minor fixes

- Standardize query param names to `jobTitle` and `company`
- Auto-dismiss the "What's new" tips after first view

### Files to modify:

| File | Change |
|------|--------|
| `src/pages/EditorPage.tsx` | Handle `?tailor=true` in addition to `?openTailor=1` |
| `src/components/dashboard/AnalyzeJobSheet.tsx` | Store job description in Zustand before navigating; standardize param names |
| `src/pages/ApplicationsPage.tsx` | Store job description in Zustand before navigating |
| `src/components/dashboard/SetTargetJobSheet.tsx` | Wrap AI call in `useAIAction` for credit gating |
| `src/components/editor/TailorSheet.tsx` | Add resume picker when no resume is loaded; auto-hide tips |

