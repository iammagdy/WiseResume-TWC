

# Fix: Remove framer-motion from ALL remaining editor child components

## Root Cause (confirmed)

The editor page still freezes because **5 child components** directly rendered in the editor tree still use `framer-motion` with `AnimatePresence` and `layout` props. These cause the same infinite `setState` loop via framer-motion's internal ref management conflicting with React 18's commit phase.

The offending components:
- **ExperienceSection.tsx** -- `AnimatePresence` wrapping the list + `motion.div` with `layout` prop on each experience card + nested `AnimatePresence` for expand/collapse
- **EducationSection.tsx** -- Same pattern as ExperienceSection: `AnimatePresence` + `motion.div` with `layout` + nested `AnimatePresence`
- **SkillsSection.tsx** -- `AnimatePresence` + `motion.div` with `layout` prop on each skill badge + `motion.div` for suggested skills
- **AIContextualNudge.tsx** -- `AnimatePresence` + `motion.div` (rendered inside Summary, Experience, Education, Skills sections)
- **AIEnhanceDialog.tsx** -- `AnimatePresence` + nested `motion.div` elements for the dialog overlay and content

## Changes

### 1. `src/components/editor/ExperienceSection.tsx`
- Remove `framer-motion` import
- Replace outer `AnimatePresence` with a plain conditional
- Replace `motion.div` (empty state) with a plain `div` with `animate-in fade-in-0`
- Replace `motion.div` with `layout` prop (each experience card) with a plain `div`
- Replace inner `AnimatePresence` + `motion.div` (expand/collapse) with conditional rendering and CSS transition

### 2. `src/components/editor/EducationSection.tsx`
- Same pattern as ExperienceSection:
- Remove `framer-motion` import
- Replace all `AnimatePresence` and `motion.div` elements with plain `div` elements using CSS animations
- Remove `layout` prop usage

### 3. `src/components/editor/SkillsSection.tsx`
- Remove `framer-motion` import
- Replace `AnimatePresence` + `motion.div` with `layout` (skill badges) with plain `div` elements
- Replace `motion.div` for suggested skills section with plain `div` using `animate-in`

### 4. `src/components/editor/AIContextualNudge.tsx`
- Remove `framer-motion` import
- Replace `AnimatePresence` + `motion.div` with a conditional `div` using `animate-in fade-in-0 slide-in-from-top-2`

### 5. `src/components/editor/ai/AIEnhanceDialog.tsx`
- Remove `framer-motion` import
- Replace `AnimatePresence` + nested `motion.div` elements with plain `div` elements using CSS animations (`animate-in fade-in-0` for overlay, `animate-in fade-in-0 slide-in-from-bottom-4` for dialog content)

## Technical Details

All replacements follow the same pattern established in previous fixes:

```text
BEFORE: <AnimatePresence>{show && <motion.div initial={...} animate={...} exit={...}>...</motion.div>}</AnimatePresence>
AFTER:  {show && <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200">...</div>}

BEFORE: <motion.div layout initial={...} animate={...} exit={...} className="...">
AFTER:  <div className="... transition-all duration-200">
```

## Summary

| File | Change |
|------|--------|
| `src/components/editor/ExperienceSection.tsx` | Remove all framer-motion usage, replace with CSS |
| `src/components/editor/EducationSection.tsx` | Remove all framer-motion usage, replace with CSS |
| `src/components/editor/SkillsSection.tsx` | Remove all framer-motion usage, replace with CSS |
| `src/components/editor/AIContextualNudge.tsx` | Remove AnimatePresence/motion, use conditional CSS |
| `src/components/editor/ai/AIEnhanceDialog.tsx` | Remove AnimatePresence/motion, use CSS animations |

This removes the **last remaining** framer-motion components from the editor's rendering tree, which should fully resolve the infinite loop crash.
