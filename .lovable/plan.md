

# Activity Tab Improvements (rename "Jobs" to "Activity")

## 1. Rename the tab from "Jobs" to "Activity"

The tab is already titled "My Activity" in the page header, but the bottom tab bar and desktop nav both say "Jobs". This creates a mismatch. The tab covers applications, saved jobs, timelines, streaks, and stats -- "Activity" is a much better label.

### Files to change
- **BottomTabBar.tsx** line 62: Change `label: 'Jobs'` to `label: 'Activity'`
- **DesktopNav.tsx** line 40: Change `label: 'Jobs'` to `label: 'Activity'`

---

## 2. Performance: Per-item entrance animations on application cards

Every application card and job card has its own `motion.div` with `initial={{ opacity: 0, y: 8 }}` and `animate`. For users with 20+ applications, this means 20+ Framer Motion instances animating simultaneously on mount.

### Fix
- Remove individual `motion.div` wrappers from the application card loop (lines 307-367) and `JobCard` component (lines 43-91). Replace with plain `div` elements -- the list appears instantly which feels snappier on mobile.

---

## 3. Performance: AI scoring runs on every mount

The `useEffect` at lines 144-177 fires background AI scoring for all uncached jobs every time the component mounts, even when the user is on the "applications" tab and never views jobs.

### Fix
- Gate the AI scoring effect behind `activeTab === 'jobs'` so it only runs when the user actually views saved jobs.

---

## 4. UX: Tab bar is disconnected from content

The current tab bar (lines 267-279) uses the same `glass-elevated` style as other cards, making it blend in. The active tab uses a solid primary background that doesn't match the page's overall style.

### Fix
- Use a cleaner pill-style tab bar with a subtle indicator rather than a heavy filled background. Add a bottom border accent on the active tab similar to what we did for the Editor tabs.

---

## 5. UX: StatusFilter only visible in applications tab but counts include all statuses

The `StatusFilter` shows counts but the "screening" status is missing from the filter chips. Users with applications in "screening" status have no way to filter to them.

### Fix
- Add `screening` to the `STATUSES` array in `StatusFilter.tsx` between "Applied" and "Interviewing".

---

## 6. UX: The "Add Application" FAB is missing from the applications tab

When on the "applications" tab, there's no floating action button -- only the "Saved Jobs" tab has a FAB (lines 489-499). Users have to scroll up to find the "+ Add" in the empty state or the header area.

### Fix
- Show a FAB on the applications tab too, wired to `setShowAdd(true)`.

---

## 7. UX: Activity stats card is buried below applications

The `JobActivityStatsCard` only shows after scrolling past the timeline and all application cards (line 417). It should be more prominent -- at least above the application cards list.

### Fix
- Move the `JobActivityStatsCard` block above the "Applications" cards section (before line 299), so users see their stats summary without scrolling past individual cards.

---

## 8. UX: ResumeCompletionCard feels out of place

The `ResumeCompletionCard` belongs more on the Dashboard/Home tab. On the Activity tab it adds noise between the streak and the timeline.

### Fix
- Remove `ResumeCompletionCard` from this page -- it's already accessible from the Home tab.

---

## Summary

| Area | Issue | Fix |
|---|---|---|
| Tab label | "Jobs" vs "My Activity" mismatch | Rename to "Activity" in nav |
| Card animations | 20+ motion.div on mount | Remove per-card motion wrappers |
| AI scoring | Runs even on applications tab | Gate behind activeTab === 'jobs' |
| Tab bar style | Heavy filled active state | Cleaner pill with border accent |
| StatusFilter | Missing "screening" status | Add screening chip |
| Applications FAB | No FAB on applications tab | Add FAB for adding applications |
| Stats placement | Buried below all cards | Move above application cards |
| ResumeCompletionCard | Out of place on Activity tab | Remove from this page |

All changes are additive to UX -- no features removed, just better organization and fewer wasted CPU cycles.

### Technical Details

**BottomTabBar.tsx**: Single line change on line 62.

**DesktopNav.tsx**: Single line change on line 40.

**ApplicationsPage.tsx**:
- Remove `ResumeCompletionCard` import and usage
- Move `JobActivityStatsCard` rendering above application cards
- Replace `motion.div` wrappers in application card loop with plain `div`
- Remove `motion` wrapper from `JobCard` component
- Add `activeTab === 'jobs'` guard to AI scoring `useEffect`
- Add a FAB for the applications tab (similar to existing Save Job FAB)
- Update tab bar styling to use border-accent approach

**StatusFilter.tsx**: Add `{ value: 'screening', label: 'Screening', color: 'bg-blue-500/15 text-blue-500' }` after the "Applied" entry.

