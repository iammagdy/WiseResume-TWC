

## Phase 4 Assessment and Implementation Plan

### Tasks Already Complete (No Work Needed)

| Task | Status | Evidence |
|------|--------|----------|
| 4.1 Contrast Issues | Done | `--muted-foreground` already uses optimized HSL values: 65% lightness in dark mode, 40% in light mode for WCAG AA compliance |
| 4.2 Offline Mode UX | Done | `OfflineBanner`, `OfflineIndicator`, `SyncConflictDialog`, and `useOfflineSync` are fully implemented with conflict resolution, pending change tracking, and reconnection banners |
| 4.3 Advanced Search | Done | Resume filtering and sorting was just added in Phase 3 (sort by date/alpha/score, filter by category and score range) |
| 4.4 Editor 320px | Done | Editor uses Tabs layout on mobile, responsive text hiding with `hidden xs:block`, and stepper uses a dropdown sheet pattern on small screens |
| 4.6 Export Formats | Done | 10 export types already exist: PDF, ATS-PDF, DOCX, One-Page, LinkedIn, Plain Text, Share Link, Interview Prep, Cover Letter, Combined Package |
| 4.8 Profile Pulse | Done | Pulse animation fires only on first visit using `localStorage('wr-profile-pulse-seen')` with a 4-ping CSS animation, dismissed on popover open |

### Tasks to Implement

Three genuinely missing features remain. Ranked by impact-to-effort ratio:

---

### 1. Add Keyboard Shortcuts Help Section (Task 4.5)

The app has keyboard shortcuts (Ctrl+S save, Ctrl+P preview, Ctrl+D download, Ctrl+Z/Y undo/redo) but no discoverable documentation.

**Changes:**
- **`src/components/settings/HelpSheet.tsx`**: Add a "Keyboard Shortcuts" row that opens a simple list of available shortcuts
- **`src/components/editor/KeyboardShortcutsSheet.tsx`** (new): A bottom sheet displaying all shortcuts in a clean table format, reusable from both Settings and the Editor

---

### 2. Add Bulk Resume Operations (Task 4.7)

Users cannot select multiple resumes to delete or export at once.

**Changes:**
- **`src/pages/DashboardPage.tsx`**: Add a selection mode toggle, `selectedIds` state, "Select All" / "Delete Selected" / "Export Selected" toolbar
- **`src/components/dashboard/ResumeListCard.tsx`**: Add a checkbox overlay when in selection mode
- **`src/hooks/useResumes.ts`**: Add a `deleteMultiple` mutation

---

### 3. Add AI Cost Estimation (Task 4.10)

Before running an AI operation, show the user how many credits it will consume.

**Changes:**
- **`src/lib/aiCostEstimates.ts`** (new): A simple map of operation type to credit cost (e.g., tailor = 2, score = 1, enhance = 1)
- **`src/components/ai/AICostBadge.tsx`** (new): A small badge showing "~X credits" next to AI action buttons
- Update key AI trigger points (TailorSheet, ATSScanSheet, AIEnhanceSheet) to show the badge

---

### Task 4.9 (Resume Analytics Dashboard) -- Deferred

This is a full new page with charts, historical data tracking, and potentially new database tables. It should be scoped as its own feature project rather than bundled into a polish phase.

---

### Recommended Implementation Order

1. **Keyboard Shortcuts Help** -- smallest scope, highest discoverability win
2. **AI Cost Estimation** -- improves credit transparency (complements Phase 1 credits work)
3. **Bulk Operations** -- largest scope, most complex state management

All three can be implemented independently. I recommend starting with shortcuts help and cost estimation in a single pass, then tackling bulk operations separately.
