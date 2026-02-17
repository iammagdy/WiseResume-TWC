

## Phase 3 Assessment and Implementation Plan

### Tasks Already Complete (No Work Needed)

| Task | Status | Evidence |
|------|--------|----------|
| 3.1 Empty State UX | Done | Already shows only 2 CTAs + 3-step guide + template previews + tips carousel. No "8 action cards" issue exists. |
| 3.4 Version History UI | Done | `VersionHistorySheet.tsx` has full timeline, restore, compare, checkpoint creation, delete, and date formatting. |
| 3.5 Auto-Scoring Performance | Done | Uses `requestIdleCallback`, sequential scoring with cancellation, in-memory cache keyed by `updated_at`, and 1s debounce. |
| 3.6 Template Preview/Guidance | Done | `templateData.ts` includes `atsScore` (high/medium) and `category` (professional/creative/tech/minimalist) for all 30 templates. The Templates page already has category filtering. |

### Task 3.3: Link Tailored Resumes to Applications -- Deferred

This requires a database migration (`job_application_id` on resumes table) and cross-feature wiring. It is a substantial feature that should be scoped as its own project rather than bundled here.

### Task 3.2: Add Resume Filtering and Sorting -- Ready to Implement

This is the one genuinely missing feature. Currently the dashboard only has text search.

**What will be added:**

1. A compact filter/sort bar below the search input on the Dashboard
2. Sort options: Last edited (default), Alphabetical, ATS Score (high to low)
3. Filter chips: Template category (Professional, Creative, Tech, Minimalist), Score range (needs work / good / excellent)
4. "Clear all" button when any filter is active
5. Filters stored in component state (no URL persistence needed for this scope)

**Implementation details:**

**New file: `src/components/dashboard/ResumeFilters.tsx`**
- A horizontal scrollable chip bar with sort dropdown and filter chips
- Sort dropdown using a Popover with radio options
- Filter chips that toggle on/off
- "Clear" button when filters are active
- Compact mobile-first design using existing glass-surface styling

**Modified file: `src/pages/DashboardPage.tsx`**
- Add sort and filter state variables
- Import and render `ResumeFilters` between the search input and the resume list
- Apply sorting logic after the existing search filter
- Apply category/score filters to the filtered list
- Pass filter state and handlers to `ResumeFilters`

The filter bar will only appear when the user has 2+ resumes (hidden in empty state). Sort defaults to "Last edited" matching the current behavior.

