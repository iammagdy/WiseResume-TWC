import { create } from 'zustand';
import type { ActionType } from '@/hooks/useAIEnhance';

/**
 * Single-source-of-truth bridge for the Summary AI flow.
 *
 * Multiple entry points trigger AI on the Professional Summary:
 *   1. The section card sparkle button (owned by `SectionAIAction`).
 *   2. `SummarySection` empty-state "Let AI Write This" CTA.
 *   3. `SummarySection` contextual nudge button.
 *   4. `SummarySection` intake auto-generation effect.
 *
 * Without coordination each path could spawn its own enhance call and
 * its own preview dialog, racing each other and silently dropping the
 * user's edits. This bridge lets the dialog owner (`SectionAIAction`,
 * the only place that renders `AIEnhanceDialog` for summary) register a
 * single trigger; all other entry points invoke that trigger so every
 * summary AI request flows through one hook instance and one dialog.
 */
interface SummaryAIBridgeState {
  trigger: ((action: ActionType) => void) | null;
  setTrigger: (fn: ((action: ActionType) => void) | null) => void;
}

export const useSummaryAIBridge = create<SummaryAIBridgeState>((set) => ({
  trigger: null,
  setTrigger: (fn) => set({ trigger: fn }),
}));
