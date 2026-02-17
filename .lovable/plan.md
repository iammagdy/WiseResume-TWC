

## Rename "Jobs" Tab to "Activity" + Enhancements

### 1. Rename the Tab

Update the bottom navigation bar label from **"Jobs"** to **"Activity"** in `BottomTabBar.tsx`, and change the icon from `Briefcase` to `BarChart3` (which already appears in the page header, creating consistency).

**Files:**
- `src/components/layout/BottomTabBar.tsx` -- change label from `'Jobs'` to `'Activity'`, swap icon to `BarChart3`

### 2. Proposed Enhancements

After analyzing the page, here are practical improvements:

#### A. Empty State for Applications (Missing)
When there are no applications AND no timeline entries, the "My Applications" tab shows nothing -- just the stats (all zeros) and an empty timeline. Add a proper empty state with a call-to-action guiding users to tailor a resume or add an application manually.

**File:** `src/pages/ApplicationsPage.tsx`

#### B. Status Badge Colors
Application status badges currently use a plain `variant="outline"` with no color differentiation. Map each status to a semantic color:
- `saved` -- muted/default
- `applied` -- blue/primary
- `screening` -- yellow/warning
- `interviewing` -- purple/accent
- `offer` -- green/success
- `rejected` -- red/destructive

**File:** `src/pages/ApplicationsPage.tsx` (application card badges)

#### C. Deadline Warning Badge
Applications with upcoming deadlines (within 3 days) should show a warning badge, similar to the existing "Follow-up due" badge but for deadlines approaching on saved/applied jobs.

**File:** `src/pages/ApplicationsPage.tsx`

#### D. Confirmation Before Delete
The delete button in `ApplicationTrackerPage.tsx` has no confirmation dialog. Add an alert dialog to prevent accidental deletion.

**File:** `src/pages/ApplicationTrackerPage.tsx`

---

### Technical Details

| File | Change |
|------|--------|
| `src/components/layout/BottomTabBar.tsx` | Rename label `Jobs` to `Activity`, change icon from `Briefcase` to `BarChart3` |
| `src/pages/ApplicationsPage.tsx` | Add empty state for zero applications; add colored status badges; add deadline warning |
| `src/pages/ApplicationTrackerPage.tsx` | Wrap delete in AlertDialog confirmation |

