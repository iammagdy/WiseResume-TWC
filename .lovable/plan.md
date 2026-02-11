

# Fix: Remove framer-motion from components inside Radix TabsContent

## Root Cause

The `SectionCard` component uses `motion.div` from framer-motion and is rendered **inside** Radix `TabsContent`. Radix's `TabsContent` uses an internal `Presence` component that manages visibility through composed refs and `setState`. When framer-motion's `motion.div` is a child, both systems fight over ref management, creating an infinite `setState` loop.

The `NextStepBanner` also uses `AnimatePresence` + `motion.div` which can trigger the same conflict.

## Changes

### 1. `src/components/editor/SectionCard.tsx`
- Replace `motion.div` with a plain `div`
- Add CSS animation class (`animate-in fade-in-0 slide-in-from-bottom-2 duration-300`) to preserve the fade-in effect
- Remove the `framer-motion` import

### 2. `src/components/editor/NextStepBanner.tsx`
- Replace `AnimatePresence` + `motion.div` with a plain `div`
- Add CSS animation class for the fade-in effect
- Remove the `framer-motion` import

| File | Change |
|------|--------|
| `src/components/editor/SectionCard.tsx` | Replace `motion.div` with CSS-animated `div` |
| `src/components/editor/NextStepBanner.tsx` | Replace `AnimatePresence`/`motion.div` with CSS-animated `div` |
