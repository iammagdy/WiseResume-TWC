

# Change Tab Active Color from Purple to Red + Add Tab Transition Animations

## What Changes

The active tab color across the app (bottom tab bar, editor stepper nav) is currently purple (`--primary: 270 100% 65%`). This will be changed to a vibrant red, and smooth animations will be added for tab-to-tab transitions.

## Changes

### 1. Update Primary Color to Red

Modify `src/index.css` to change the `--primary` CSS variable from purple (hue 270) to red (hue 0/355) in both dark and light themes. This automatically updates every component using `text-primary`, `bg-primary`, `gradient-primary`, etc.

- Dark mode: `--primary: 355 90% 60%` (vibrant red)
- Light mode: `--primary: 355 75% 50%` (slightly deeper red for contrast)
- Also update `--ring` and `--sidebar-primary` to match
- Update gradient stops (`--gradient-start`, `--gradient-mid`) to use red hues

### 2. Enhance Bottom Tab Bar Animations

Modify `src/components/layout/BottomTabBar.tsx`:
- Add a scale bounce animation on the active icon (icon scales up briefly when selected)
- Add a vertical slide-up micro-animation on the label when it becomes active
- The existing `layoutId="tab-pill"` sliding pill already animates between tabs -- keep it but ensure it uses the new red gradient

### 3. Enhance Editor Stepper Nav Animations

Modify `src/components/editor/StepperNav.tsx`:
- Update the glow ring animation to use the new red hue instead of purple (hue 270)
- Add a scale-in bounce when a step becomes active
- The connecting progress line already animates -- it will automatically pick up the new red color via `gradient-primary`

### Files to Modify

| File | Change |
|------|--------|
| `src/index.css` | Change `--primary` from purple to red in both `:root` and `.light`, update gradient stops and ring color |
| `src/components/layout/BottomTabBar.tsx` | Add icon bounce + label slide animations on tab switch |
| `src/components/editor/StepperNav.tsx` | Update glow animation hue from 270 to 355, add step bounce |

