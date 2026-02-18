

## Mobile AI UX Polish -- 2 Issues Found

### Audit Summary

Tested all AI entry points and flows on 360x640: AI Studio tools grid, chat suggestions, InlineAIButton (section-level), AIEnhanceDialog, AIEnhanceSheet, AIContextualNudge (compact and non-compact), SectionEmptyState AI buttons, and the editor stepper. Most are already solid with 44px+ targets. Found **2 components** with undersized touch targets on AI action buttons.

---

### Issue 1: AIContextualNudge compact action button and dismiss are tiny (HIGH)

**Screen:** Editor -- appears inside expanded experience entries and other sections when AI suggestions are available.

**Problem:** The compact variant's action button is `h-5` (20px) with `text-[10px]` and the dismiss X button is `p-0.5` (~19px effective area). Both are under half the 44px standard. On a phone, these nudges are the primary way users discover and trigger AI improvements on individual resume entries, but the buttons are nearly impossible to tap accurately with a thumb.

The non-compact variant's action button is `h-6` (24px) -- also below standard but less critical since the non-compact nudge dismiss button was already fixed to 44px in a prior round.

**Fix:**
- Compact action button: change `h-5 px-2 text-[10px]` to `h-8 px-3 text-xs` (32px height -- a practical compromise that stays inline without blowing out the layout, paired with 12px readable text)
- Compact dismiss button: change `p-0.5` to `p-2 min-w-[36px] min-h-[36px] flex items-center justify-center` (36px -- compromise for inline layout)
- Non-compact action button: change `h-6 px-3 text-xs` to `h-8 px-3 text-xs` (32px -- matches compact)

**File:** `src/components/editor/AIContextualNudge.tsx` (lines 43, 48-49, 66)

---

### Issue 2: AI Studio chat suggestion chips below 44px (LOW)

**Screen:** AI Studio (`/ai-studio`) -- the quick suggestion chips inside the Wise AI Chat card ("Write a summary...", "Add metrics...", "Proofread my resume")

**Problem:** These chips use `min-h-[36px]` which is 8px below the 44px standard. They're the first thing users see and tap in AI Studio to start an AI interaction.

**Fix:** Change `min-h-[36px]` to `min-h-[44px]` on the suggestion chips.

**File:** `src/pages/AIStudioPage.tsx` (line 298)

---

### Components Verified as Working (no changes needed)

| Component | Touch Target | Status |
|-----------|-------------|--------|
| InlineAIButton (section AI Assist) | 44px+ via Button component | OK |
| InlineAIButton mobile sheet actions | 64px min-h | OK |
| AIEnhanceDialog Apply/Discard | h-12 (48px) | OK |
| AIEnhanceSheet mode chips | min-h-[44px] | OK |
| AIEnhanceSheet section checkboxes | min-h-[44px] | OK |
| AIEnhanceSheet Enhance button | h-12 (48px) | OK |
| SectionEmptyState AI buttons | min-h-[44px] | OK |
| AI Studio Featured Tool cards | min-h-[100px] | OK |
| AI Studio "More AI Tools" grid | min-h-[100px] | OK |
| AI Studio chat input | Good size | OK |
| StepperNav mobile dropdown | min-h-[56px] | OK |
| Non-compact nudge dismiss button | min-w/h-[44px] | OK (already fixed) |

---

### Technical Changes

| File | Change | Lines |
|------|--------|-------|
| `src/components/editor/AIContextualNudge.tsx` | Increase compact action button to h-8, compact dismiss to p-2 min-w/h-[36px], non-compact action to h-8 | Lines 43, 48-49, 66 |
| `src/pages/AIStudioPage.tsx` | Change suggestion chip min-h-[36px] to min-h-[44px] | Line 298 |

Total: 2 files, 4 line changes. No logic changes, no component removals, desktop unaffected.

