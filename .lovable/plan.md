

# Redesign AI Studio Provider Badge for Mobile

## Current Issues

Based on the screenshot, the AI Provider Badge has several problems:

| Issue | Description |
|-------|-------------|
| **Plain Appearance** | Simple pill badge looks flat and boring compared to the cosmic glass UI |
| **No Visual Interest** | Static design doesn't match the animated, premium feel of other elements |
| **Poor Hierarchy** | Centered placement feels disconnected from the content sections |
| **Missing Premium Feel** | Lacks the glow, shimmer, and depth of other AI Studio components |

## New Design Concept: "Cosmic AI Engine Badge"

A premium, animated badge that matches the cosmic glass aesthetic with subtle pulsing glow and shimmer effects.

### Visual Preview

```text
Current (Plain):
┌─────────────────────────────┐
│     ✦ WiseResume AI  ⚙     │
└─────────────────────────────┘

New (Cosmic Glass):
╭─────────────────────────────────────╮
│  ⟨ animated glow border ⟩          │
│                                     │
│   ✦  Powered by WiseResume AI  ⚙   │ ← shimmer text
│      ↑ pulsing icon                 │ ← floating particles
│                                     │
╰─────────────────────────────────────╯
```

### Design Features

1. **Animated Gradient Border** - Subtle rotating gradient like the Developer Card
2. **Pulsing AI Icon** - Sparkles icon with breathing glow animation
3. **Shimmer Text Effect** - Moving gradient across "WiseResume AI" text
4. **Glass Background** - Matches the cosmic theme with blur effect
5. **Floating Micro-Particles** - 2-3 tiny dots for ambient motion
6. **Full-Width Layout** - Spans the panel width instead of being a compact pill

---

## Technical Implementation

### Phase 1: Create New AIEngineBadge Component

**New File: `src/components/editor/ai/AIEngineBadge.tsx`**

A completely redesigned badge component specifically for AI Studio:

```typescript
interface AIEngineBadgeProps {
  showSettingsLink?: boolean;
  className?: string;
}
```

Component structure:
- Full-width container with animated gradient border
- Glass morphism background
- Flexbox layout with pulsing icon, shimmer text, and settings gear
- 2 floating particles for ambient motion

### Phase 2: Create AIEngineBadge Styles

**New File: `src/components/editor/ai/AIEngineBadge.css`**

Key animations:

1. **Icon Pulse**
```css
@keyframes ai-icon-pulse {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 4px hsl(var(--primary) / 0.4)); }
  50% { transform: scale(1.1); filter: drop-shadow(0 0 8px hsl(var(--primary) / 0.6)); }
}
```

2. **Text Shimmer**
```css
@keyframes ai-text-shimmer {
  0% { background-position: 200% center; }
  100% { background-position: -200% center; }
}
```

3. **Border Glow Rotate**
```css
@keyframes ai-border-rotate {
  0% { --angle: 0deg; }
  100% { --angle: 360deg; }
}
```

4. **Floating Particles**
```css
@keyframes ai-particle-float {
  0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
  50% { transform: translateY(-10px) translateX(5px); opacity: 0.6; }
}
```

### Phase 3: Update AIAssistantBar

**File: `src/components/editor/AIAssistantBar.tsx`**

Replace the simple `AIProviderBadge` with the new `AIEngineBadge`:

```tsx
// Before
<motion.div variants={itemVariants} className="flex items-center justify-center">
  <AIProviderBadge size="md" showSettingsLink />
</motion.div>

// After
<motion.div variants={itemVariants}>
  <AIEngineBadge showSettingsLink />
</motion.div>
```

Also remove the divider below the badge since the new design is visually distinct.

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/editor/ai/AIEngineBadge.tsx` | Create | New premium badge component for AI Studio |
| `src/components/editor/ai/AIEngineBadge.css` | Create | Animations and styles for the badge |
| `src/components/editor/AIAssistantBar.tsx` | Modify | Use AIEngineBadge instead of AIProviderBadge |

---

## Animation Timing

| Animation | Duration | Effect |
|-----------|----------|--------|
| Border rotate | 6s | Slow, premium feel |
| Icon pulse | 3s | Breathing effect |
| Text shimmer | 4s | Moving gradient |
| Particles float | 4s, 5s | Staggered ambient motion |

---

## Benefits

1. **Matches AI Studio Theme** - Same cosmic glass aesthetic as action cards
2. **Eye-Catching on Mobile** - Animations work without hover interactions
3. **Premium Feel** - Communicates the AI engine as a first-class feature
4. **Clear CTA** - Full-width design makes it easy to tap
5. **Brand Consistency** - Uses the same animation patterns as Developer Card

