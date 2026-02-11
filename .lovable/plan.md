
# Enhanced AI Tailor: Loading, Results, and Auto-Save Tailored CVs

## Overview

This plan enhances three areas of the AI Tailor experience: (1) a premium loading/progress screen, (2) a polished results screen with better visual hierarchy, and (3) automatic creation of a new tailored CV in the database while keeping the original untouched.

---

## Part 1: Enhanced Tailoring Progress Screen

The current progress screen is functional but flat. Enhancements:

- **Animated gradient progress bar** with a shimmer effect instead of the plain bar
- **Step icons** that animate from a spinning loader to a green checkmark with a subtle scale pop
- **Live stats preview** that appears mid-progress: "Found 12 keyword matches", "Projected score: +38"
- **Rotating fun facts** that cycle every 3 seconds instead of showing a single static one
- **Pulsing header icon** with a glow effect for the "Supercharging" title
- **Remove framer-motion** from `TailorProgress.tsx` and `ScoreComparison.tsx` (both still use `motion.div` and `AnimatePresence` which could cause the same crash)

---

## Part 2: Enhanced Results Screen

Based on the reference screenshot, the results screen should feel more premium:

- **Score circles with animated ring strokes** using SVG `stroke-dasharray` and CSS transitions (replacing framer-motion's `AnimatedNumber`)
- **Section change cards** with a colored left accent border (red/green) and a point-impact badge ("+55pts")
- **Remove framer-motion** from `SectionChangeCard.tsx` (uses `motion.div`)
- **Confetti/celebration effect** on the success header using CSS keyframes
- **Tabbed results** already exist -- keep as-is but ensure Radix Tabs here don't cause the same crash (wrap in error boundary or replace with manual tabs if needed)

---

## Part 3: Auto-Create Tailored CV in Database

When the user clicks "Apply Changes", the system will:

1. **Create a new resume** in the database with `parent_resume_id` set to the original resume's ID
2. **Title format**: `"{Original Title} - Tailored for {Job Title} @ {Company}"`
3. **Set `target_job_title` and `target_company`** on the new resume
4. **Set `job_match_score`** to the after-score
5. **Navigate to the new resume** in the editor (or stay and show success)
6. **Original resume stays untouched** -- no changes applied to it

The dashboard already has `ResumeGroup` and `organizeResumeHierarchy` which groups tailored versions under their parent using `parent_resume_id`. So the new tailored CV will automatically appear grouped under the original on the dashboard.

---

## Technical Details

### Files to modify:

| File | Changes |
|------|---------|
| `src/components/editor/tailor/TailorProgress.tsx` | Remove framer-motion, add CSS animations, rotating fun facts timer, live stats preview |
| `src/components/editor/tailor/ScoreComparison.tsx` | Remove framer-motion, use SVG stroke-dasharray with CSS transitions for score circles |
| `src/components/editor/tailor/SectionChangeCard.tsx` | Remove framer-motion, add colored accent border, enhanced impact badge |
| `src/components/editor/TailorSheet.tsx` | Remove framer-motion (AnimatePresence, motion.div), update `handleApplyChanges` to create new DB resume instead of modifying original, add Radix Tabs crash guard |
| `src/components/editor/tailor/TailorHistorySheet.tsx` | Remove framer-motion from history entry cards |

### Apply Changes Flow (updated):

```text
User clicks "Apply" -->
  1. Create new resume in DB via createResume mutation
     - parent_resume_id = currentResume.id
     - title = "{name} - Tailored for {jobTitle} @ {company}"
     - content = merged tailored sections
     - target_job_title, target_company, job_match_score set
  2. Save to tailor history (existing logic)
  3. Toast: "Tailored resume created! Original preserved."
  4. Navigate to new resume in editor OR close sheet
  5. Original resume remains unchanged
```

### Tabs Safety:
The results screen uses Radix `Tabs` which could trigger the same infinite loop. The plan is to replace them with a manual tab implementation using `useState` and `div` buttons, consistent with the pattern used to fix `InlineAIButton`.

### Fun Facts Rotation:
Add a `useEffect` with `setInterval` (every 4s) to cycle through fun facts during the progress phase, instead of picking one randomly at render time.

### Score Circle Enhancement:
Replace the framer-motion `AnimatedNumber` with a `useEffect` + `requestAnimationFrame` counter that animates from 0 to the target value over ~1.2s. SVG circles will use `stroke-dashoffset` with CSS `transition: stroke-dashoffset 1.2s ease-out`.
