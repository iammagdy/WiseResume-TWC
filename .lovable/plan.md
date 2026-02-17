

## Fix: Filter-Aware Empty States for Applications

### Problem
The filters work correctly at the API level (confirmed: returns 200 with proper query params). The database has zero applications for this user. The issue is that when a filter is selected, the empty state still shows the generic "No applications yet" message, making it seem like filters are broken.

### Solution
Update the empty state in `ApplicationsPage.tsx` to show filter-specific messaging when a status filter is active.

### Changes

**File: `src/pages/ApplicationsPage.tsx`**

Update the empty state block (inside `applications.length === 0`) to check if a filter is active:

- When `statusFilter !== 'all'`: Show "No {status} applications" with a "Clear filter" button that resets to "all"
- When `statusFilter === 'all'`: Keep the existing generic empty state with "Add Application" CTA

```text
Before (all cases):
  "No applications yet"
  "Start tracking your job applications..."
  [Add Application]

After (filter active):
  "No {interviewing/saved/...} applications"  
  "Try a different filter or add a new application"
  [Show All]  [Add Application]

After (no filter):  
  "No applications yet"
  "Start tracking your job applications..."
  [Add Application]
```

This is a single-file, ~15-line change that makes the filter behavior feel responsive and intentional.
