

## Touch Target Compliance: 44px Minimum with 8px Spacing

### Overview

Audit and fix all interactive elements across the app to meet mobile accessibility guidelines: 44x44px minimum touch targets (iOS HIG), 48x48px for primary actions, 56x56px for hero/floating actions, and 8px minimum spacing between tappable elements. The Button component's `sm` size (40px) is the main offender -- it appears in 27+ editor files.

### Current State

**Already compliant:**
- Button `default` size: `h-11 min-h-[44px]` -- good
- Button `icon` size: `h-11 w-11 min-h-[44px] min-w-[44px]` -- good
- Button `lg` size: `h-14 min-h-[52px]` -- good
- Back buttons across pages: `min-w-[48px] min-h-[48px]` -- good
- BottomTabBar buttons: `min-w-[52px]` + full height -- good
- StepperNav steps: `min-w-[48px] min-h-[48px]` -- good
- Skill badges: `h-10` (40px) -- borderline, needs bump

**Non-compliant (under 44px):**
- Button `sm` size: `h-10 min-h-[40px]` -- 4px short
- InlineAIButton trigger: `h-8` (32px) -- 12px short
- AI nudge action/dismiss buttons: `h-8` (32px)
- AI nudge close X button: `p-1` only (~24px)
- AgenticChatSheet clear button: `h-8 w-8` (32px)
- AgenticChatSheet accept/reject buttons: `h-8` (32px)
- ExperienceTimeline dismiss button: `h-6 w-6` (24px) -- worst offender
- InlineAIButton dropdown items: `py-1.5 px-2` (~28px)
- Common Skills badges: `h-9` (36px)
- JobCompareCard remove button: `h-7 w-7` (28px)
- AIDetectorSheet button: `h-7` (28px)
- SkillSuggestionList buttons: `h-7` (28px)
- TailorSheet tab buttons: no explicit min-height

### Changes

**1. `src/components/ui/button.tsx` -- Fix `sm` size to meet 44px minimum**

Change `sm` variant from `h-10 min-h-[40px]` to `h-11 min-h-[44px]`. This is the single highest-impact fix since `size="sm"` is used in 27+ files across the editor.

**2. `src/components/editor/InlineAIButton.tsx` -- Fix trigger and dropdown items**

- Trigger button: change `h-8` to `min-h-[44px]`
- Dropdown menu items: change `py-1.5` to `py-2.5` for ~44px row height
- Add `min-h-[44px]` to each dropdown item

**3. `src/components/editor/AIContextualNudge.tsx` -- Fix action buttons and close X**

- Action and Dismiss buttons: remove `h-8` override (will use updated `sm` = 44px)
- Close X button: change from `p-1` to `p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center`

**4. `src/components/editor/AgenticChatSheet.tsx` -- Fix clear and accept/reject buttons**

- Clear chat button (trash icon): change `h-8 w-8` to `min-h-[44px] min-w-[44px]`
- Accept/reject buttons: remove `h-8` override so they inherit 44px from updated `sm`

**5. `src/components/editor/ExperienceTimeline.tsx` -- Fix dismiss X button**

- Change `h-6 w-6 p-0` to `min-h-[44px] min-w-[44px] p-2` with flex centering

**6. `src/components/editor/SkillsSection.tsx` -- Fix common skills badges**

- Common Skills badges: change `h-9` to `min-h-[44px]`
- Already-added skill badges: `h-10` to `min-h-[44px]`

**7. `src/components/editor/tailor/JobCompareCard.tsx` -- Fix remove button**

- Change `h-7 w-7` to `min-h-[44px] min-w-[44px]`

**8. `src/components/editor/ai/AIDetectorSheet.tsx` -- Fix small button**

- Change `h-7` to remove the override (inherits 44px from `sm`)

**9. `src/components/editor/tailor/SkillSuggestionList.tsx` -- Fix action buttons**

- Change `h-7` overrides to remove them (inherits 44px from `sm`)

**10. `src/components/editor/TailorSheet.tsx` -- Fix tab buttons**

- Add `min-h-[44px]` to the tab buttons in the manual tab strip

**11. `src/components/dashboard/FloatingCreateButton.tsx` -- Upgrade to 56px (primary action)**

- Change `h-12` to `h-14` for the floating primary action (56px comfortable target)

### Spacing Audit

Most layouts already use `gap-2` (8px) or larger between interactive elements. Key areas already compliant:
- BottomTabBar: flex items fill full width with natural spacing
- QuickActionChips: `gap-2` (8px) between chips
- Skill badges: `gap-2` (8px) in flex-wrap

One area to fix:
- AgenticChatSheet accept/reject buttons: `gap-1.5` in the suggestion prompts area, needs `gap-2`

### Technical Details

The `sm` button size change is the highest-leverage fix. By updating it from 40px to 44px at the component level, all 230+ usages across 27 editor files automatically become compliant without touching each file individually.

For elements that override the height with explicit classes like `h-8` or `h-7`, those need individual fixes since the CSS specificity of the inline class overrides the variant.

All icon-only buttons that lack explicit dimensions should use `size="icon"` (already 44x44px) rather than custom padding hacks.

### Files Modified

- `src/components/ui/button.tsx` -- bump `sm` to 44px minimum
- `src/components/editor/InlineAIButton.tsx` -- fix trigger and dropdown item heights
- `src/components/editor/AIContextualNudge.tsx` -- fix close X and action button heights
- `src/components/editor/AgenticChatSheet.tsx` -- fix clear, accept/reject button heights
- `src/components/editor/ExperienceTimeline.tsx` -- fix dismiss X button
- `src/components/editor/SkillsSection.tsx` -- fix badge heights
- `src/components/editor/tailor/JobCompareCard.tsx` -- fix remove button
- `src/components/editor/ai/AIDetectorSheet.tsx` -- fix small button
- `src/components/editor/tailor/SkillSuggestionList.tsx` -- fix action button heights
- `src/components/editor/TailorSheet.tsx` -- fix tab button heights
- `src/components/dashboard/FloatingCreateButton.tsx` -- upgrade to 56px

