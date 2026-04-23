import { create } from 'zustand';
import type { ActionType } from '@/hooks/useAIEnhance';
import type { SectionType } from '@/components/editor/InlineAIButton';

/**
 * Single-source-of-truth bridge for per-section AI flows.
 *
 * Each editor section has multiple entry points that can request an AI
 * suggestion (the section-card sparkle button, empty-state CTAs, the
 * contextual nudge, the intake auto-generate effect, etc.). Without
 * coordination each path could spawn its own enhance call and its own
 * preview dialog, racing each other and silently dropping the user's
 * edits — and crucially, secondary entry points used to bypass the
 * preview dialog entirely and write the AI's payload straight to the
 * resume.
 *
 * `SectionAIAction` (the only place that renders `AIEnhanceDialog`)
 * registers a single trigger per section in this bridge. All other
 * entry points invoke that trigger so every AI request flows through
 * one hook instance and one dialog, giving the user a chance to
 * review/edit/approve before any change is written.
 */
type Trigger = (action: ActionType) => void;

interface SectionAIBridgeState {
  triggers: Partial<Record<SectionType, Trigger>>;
  setTrigger: (section: SectionType, fn: Trigger | null) => void;
}

export const useSectionAIBridge = create<SectionAIBridgeState>((set) => ({
  triggers: {},
  setTrigger: (section, fn) =>
    set((state) => {
      const next = { ...state.triggers };
      if (fn) {
        next[section] = fn;
      } else {
        delete next[section];
      }
      return { triggers: next };
    }),
}));

/** Convenience hook: read just one section's trigger. */
export function useSectionAITrigger(section: SectionType): Trigger | null {
  return useSectionAIBridge((state) => state.triggers[section] ?? null);
}
