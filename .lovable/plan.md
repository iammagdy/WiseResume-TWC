

# Fix Interview Page Back Button

## Problem

`window.history.length > 1` is unreliable across browsers and Capacitor webviews. The history length is often > 1 even when there's no meaningful page to go back to, so `navigate(-1)` fires but has no visible effect.

## Solution

Replace all `navigate(-1)` fallback logic on the Interview page with a direct `navigate('/dashboard')`. The interview page is always logically "one level below" the dashboard, so navigating there is always correct.

## Changes

**`src/pages/InterviewPage.tsx`** -- Two lines to update:

- **Line 162** (setup phase back button):
  ```typescript
  // Before
  onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/dashboard')}
  // After
  onClick={() => navigate('/dashboard')}
  ```

- **Line 187** (active interview back button):
  ```typescript
  // Before
  onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/dashboard')}
  // After
  onClick={() => navigate('/dashboard')}
  ```

This is a two-line change in one file. No other files are affected.
