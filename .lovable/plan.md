

## Add FloatingPanel and ActionsPanel Components

### Overview

Introduce the Cult UI FloatingPanel as a new primitive component, then build a reusable `ActionsPanel` wrapper on top of it for mobile-first action menus. No existing screens are modified -- this is a foundation-only change.

### What Changes

Two new files are created:

1. **FloatingPanel primitive** -- the Cult UI component adapted for this project
2. **ActionsPanel wrapper** -- a strongly-typed, mobile-first action menu built on FloatingPanel

### Technical Details

**1. File: `src/components/ui/floating-panel.tsx`**

- Copy the Cult UI FloatingPanel source code
- Adapt the `motion/react` import to `framer-motion` (the project uses `framer-motion ^12.29.2`, which exports `AnimatePresence`, `motion`, `MotionConfig` from the main entry)
- Remove the `"use client"` directive (not needed in Vite/React)
- Keep all composable exports: `FloatingPanelRoot`, `FloatingPanelTrigger`, `FloatingPanelContent`, `FloatingPanelBody`, `FloatingPanelHeader`, `FloatingPanelFooter`, `FloatingPanelButton`, `FloatingPanelCloseButton`, etc.
- Apply glass-elevated styling to match the Cosmic Glass UI theme

**2. File: `src/components/ActionsPanel.tsx`**

Reusable wrapper with this API:

```typescript
interface ActionsPanelAction {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'ghost' | 'destructive';
  onClick: () => void;
}

interface ActionsPanelGroup {
  id: string;
  title?: string;
  actions: ActionsPanelAction[];
}

interface ActionsPanelProps {
  trigger: React.ReactNode;
  title?: string;
  groups: ActionsPanelGroup[];
}
```

Renders inside `FloatingPanelContent` with:
- `w-[100vw] max-w-md` for full-width mobile feel
- `max-h-[80dvh] overflow-y-auto` for scroll safety
- `pb-safe` for device safe area
- `backdrop-blur-xl bg-background/95` glass treatment
- Each action as a `Button` with `min-h-[44px] w-full justify-start touch-manipulation active:scale-95`
- Destructive variant uses `text-destructive` styling
- Groups separated by `Separator` with optional group title
- Haptic feedback on action tap

**3. No existing files are modified.** The component is standalone and can be wired into screens in a follow-up task.

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/ui/floating-panel.tsx` | Cult UI FloatingPanel adapted for Vite + framer-motion |
| `src/components/ActionsPanel.tsx` | Reusable mobile-first action menu wrapper |

### Dependencies

- `framer-motion` (already installed at ^12.29.2) -- no new packages needed
- `lucide-react` (already installed) -- used for ArrowLeftIcon in FloatingPanel

