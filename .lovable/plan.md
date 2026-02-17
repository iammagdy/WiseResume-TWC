

## Fix AI Credits Indicator: Add Bolt Icon + Fix Number Mismatch

### Problem 1: No visual context
The CreditRing on the dashboard is just a circle with a number. Users can't tell it represents AI credits -- it looks like a notification badge.

### Problem 2: Misleading numbers
The ring shows **remaining credits** (11 = 20 - 9) while the sheet inside shows **used credits** (9/20). The user sees "11" outside and "9" inside and thinks there's a bug.

### Fix

**File: `src/components/editor/ai/AICreditsIndicator.tsx`**

- Add a small Zap (bolt) icon next to the CreditRing to visually signal "AI credits"
- Wrap both in a row layout with a subtle label or just the icon

```
[Zap icon] [Ring with number]
```

**File: `src/components/ai/CreditRing.tsx`**

- Change the center number from `remaining` to `used` so it matches the sheet
- This way the ring shows "9" and the sheet shows "9 / 20" -- consistent

### Technical Details

| File | Change |
|------|--------|
| `src/components/ai/CreditRing.tsx` | Line 17: change `remaining` to `used`; Line 61: display `used` instead of `remaining` |
| `src/components/editor/ai/AICreditsIndicator.tsx` | Add `Zap` icon from lucide-react next to the ring button, sized at 14px with primary color |

The ring's color logic stays the same (based on percentage used), keeping the visual warning system intact.

