

## Fix: "Report Issue" Button Not Working on Crash Screen

### Problem
The `BugReportDialog` is mounted **inside** the `ErrorBoundary` (App.tsx line 166). When the ErrorBoundary catches an error and renders its crash fallback UI, React unmounts all children -- including `BugReportDialog`. So when the user clicks "Report Issue", `triggerBugReport()` fires but there is no listener alive to open the dialog. The button does nothing.

### Solution
Move `BugReportDialog` **outside** the `ErrorBoundary` so it remains mounted even when the app crashes. This way the event listener stays active and the dialog can open on the crash screen.

### Change

**File: `src/App.tsx`** (single edit)

Before:
```
<ErrorBoundary>
  <Toaster />
  <BugReportDialog />
  <BrowserRouter>
    ...
  </BrowserRouter>
</ErrorBoundary>
```

After:
```
<BugReportDialog />
<ErrorBoundary>
  <Toaster />
  <BrowserRouter>
    ...
  </BrowserRouter>
</ErrorBoundary>
```

Moving `BugReportDialog` one level up (still inside `TooltipProvider` and `QueryClientProvider`) ensures:
- It stays mounted when ErrorBoundary activates its fallback
- The global `onBugReport` listener remains registered
- Normal (non-crash) bug reporting continues to work identically
- No other components or imports change
