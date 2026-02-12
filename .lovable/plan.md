

## Compact Daily Tip Card

### Changes

**File: `src/components/dashboard/DailyTipCard.tsx`**

Make the expanded card a single-line horizontal strip instead of a multi-line card:

- **Remove** the "Daily Tip" label row entirely -- saves the most vertical space
- **Flatten layout** to a single horizontal row: `items-center` instead of `items-start`, remove the icon container's extra sizing
- **Reduce padding** from `p-3.5` to `px-3 py-2`
- **Reduce rounding** from `rounded-2xl` to `rounded-xl`
- **Shrink icon** container from `w-8 h-8 rounded-lg` to `w-6 h-6 rounded-md`; icon from `w-4 h-4` to `w-3.5 h-3.5`
- **Tip text**: change from `text-xs` to `text-[11px]`, add `line-clamp-1` so it truncates to one line by default
- **Dismiss button**: keep as-is (already compact)

Result: card goes from ~56px tall to ~34px -- roughly 40% reduction.

**No changes to `DashboardPage.tsx` or `FloatingCreateButton.tsx`** -- position and pulse logic stay the same.

### Before vs After (approximate)

```text
Before (~56px):
+------------------------------------------+
| [icon]  DAILY TIP                    [X] |
|         Tailoring your resume to...      |
+------------------------------------------+

After (~34px):
+------------------------------------------+
| [o] Tailoring your resume to each... [X] |
+------------------------------------------+
```

