
# Add Spring Bounce to Active Tab Indicator

## Overview
Replace the static CSS-based active tab styling with a `motion.div` layout animation that slides behind the active tab with a spring bounce effect.

## Changes

### `src/pages/PortfolioEditorPage.tsx` (lines 398-417)

Replace the current tab row with a `position: relative` container that includes:

1. **A `motion.div` background indicator** using `layoutId="activeTab"` that automatically animates between tab positions with a spring transition:
   - `transition={{ type: "spring", stiffness: 400, damping: 28 }}` for a snappy bounce
   - Styled with the existing `glass-elevated` class and the primary glow shadow
   - Positioned absolutely behind the active tab button

2. **Tab buttons become relative** so they layer above the sliding indicator. Each button keeps its text styling but the active background class moves to the `motion.div`.

The structure becomes:
```
<div className="relative flex gap-1.5 p-1 ...">
  {tabs.map(tab => (
    <button key={tab.id} className="relative z-10 flex-1 ...">
      {activeTab === tab.id && (
        <motion.div
          layoutId="activeTab"
          className="absolute inset-0 rounded-lg glass-elevated shadow-..."
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
        />
      )}
      <span className="relative z-10">{tab.label}</span>
    </button>
  ))}
</div>
```

This gives a smooth, physics-based sliding indicator that bounces subtly into position when switching tabs -- no extra state needed, just `layoutId` magic from framer-motion.
