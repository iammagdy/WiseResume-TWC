

# Clean Up Dashboard and Compact AI Intro Tooltip

## Issue 1: Dashboard Feels Crowded

The dashboard stacks too many sections vertically on mobile, creating visual overload:

1. **DailyTipCard** -- auto-shows, then leaves a "Daily Tip" collapsed dot
2. **PortfolioActivityCard** -- full card with spark chart
3. **DashboardStats** -- glass hero card with greeting, streak, badges
4. **CareerMilestonesRow** -- another full glass card with scrollable badge row + progress bar
5. **QuickActionChips** -- 4-column grid of action buttons
6. **Search bar + filters**
7. **Resume list or EmptyState** (EmptyState itself has a 9-card action grid + tips carousel + steps)

That's 5-6 distinct card sections before the user even sees their resumes. Every section uses `glass-elevated` or `glass-surface` with rounded corners, padding, and borders, making them all compete for attention equally.

### Changes

**a) Merge DailyTipCard into DashboardStats**
- Remove DailyTipCard as a standalone component from the dashboard layout
- Instead, show the daily tip as a single-line text under the greeting inside DashboardStats (with a dismiss X)
- This eliminates one entire card + its collapsed dot state

**b) Collapse CareerMilestonesRow by default**
- Show only a compact summary line: "Career Milestones: 2/6 earned" with a chevron to expand
- Tapping expands the badge row with an animation
- This reclaims ~120px of vertical space on initial load

**c) Simplify QuickActionChips**
- Reduce from 4 chips to 3 (remove "Cover Letter" -- it's accessible from the Studio tab)
- Make them horizontal pills instead of tall cards: icon + label in a single row, not stacked vertically
- This reduces height from ~100px to ~48px

**d) Reduce spacing between sections**
- Tighten `pb-3` gaps to `pb-2` between dashboard sections
- Remove extra `mt-2`, `mb-3` margins on cards

**e) EmptyState: fewer action cards**
- The 9-card action grid when no resumes exist is overwhelming
- Reduce to 4 primary actions: New Resume, Import PDF, Import LinkedIn, Browse Jobs
- Move the rest (Examples, Career Plan, Resign Letter, Guides, Portfolio) into the bottom tab destinations where they already live

---

## Issue 2: AI Intro Tooltip Too Tall for Mobile

The "Meet Your AI Assistant" modal has:
- 64px icon (w-16 h-16)
- Title + subtitle
- 3 feature rows, each with 40px icon + 2 lines of text + padding (p-3)
- Hint text
- 48px "Got It!" button
- Container padding: p-6 pt-8

Total estimated height: ~480px. On iPhone SE (568px viewport minus keyboard/nav), the "Got It!" button is pushed below the fold.

### Changes

- Shrink the header icon from `w-16 h-16` to `w-12 h-12` (icon from `w-8 h-8` to `w-6 h-6`)
- Reduce title margin from `mb-6` to `mb-3`
- Shrink feature row icons from `w-10 h-10` to `w-8 h-8`
- Reduce feature row padding from `p-3` to `p-2.5`
- Reduce space between features from `space-y-3` to `space-y-2`
- Remove the feature description lines (keep only the bold title per feature)
- Reduce bottom margin of features from `mb-6` to `mb-3`
- Reduce container padding from `p-6 pt-8` to `p-5 pt-6`
- Reduce outer padding from `p-6` to `p-4` so the card can be wider on small screens

This should bring total height to ~320px, well within iPhone SE viewport.

---

## Summary of File Changes

| File | Changes |
|---|---|
| `src/pages/DashboardPage.tsx` | Remove DailyTipCard; reduce EmptyState action cards from 9 to 4; tighten section spacing |
| `src/components/dashboard/DashboardStats.tsx` | Integrate daily tip as inline text under greeting |
| `src/components/dashboard/CareerMilestonesRow.tsx` | Add collapsed/expanded toggle; default to collapsed |
| `src/components/dashboard/QuickActionChips.tsx` | Reduce to 3 chips; make them horizontal pill-style |
| `src/components/editor/AIIntroTooltip.tsx` | Compact all sizes, remove feature descriptions, tighten padding |

## Technical Notes

### CareerMilestonesRow collapsed state

```text
// Default: collapsed
const [expanded, setExpanded] = useState(false);

// Collapsed view: single row
<button onClick={() => setExpanded(v => !v)}>
  Trophy icon | "Career Milestones" | "2/6" | ChevronDown (rotates on expand)
</button>

// Expanded: existing badge row + progress bar, wrapped in AnimatePresence
```

### QuickActionChips horizontal pills

```text
// From vertical stacked (icon above label, min-h-[72px])
// To horizontal pill (icon beside label, h-10)
<button className="flex items-center gap-2 px-4 py-2 rounded-full glass-surface">
  <Icon className="w-4 h-4" />
  <span className="text-xs font-medium">Label</span>
</button>
```

### DashboardStats with inline tip

```text
// Add tip line under greeting, with X dismiss
<div className="flex items-center gap-2 mt-1">
  <Lightbulb className="w-3 h-3 text-warning shrink-0" />
  <p className="text-[11px] text-muted-foreground truncate">{tip}</p>
  <button onClick={dismissTip}><X className="w-3 h-3" /></button>
</div>
```

