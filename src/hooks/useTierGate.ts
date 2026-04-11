import { useState, useCallback, useRef } from 'react';
import { usePlan } from './usePlan';

interface GateOptions {
  featureName: string;
  description?: string;
  bypassCondition?: boolean;
}

export interface TierGateDialogState {
  requiredPlan: 'pro' | 'premium';
  featureName: string;
  description?: string;
}

interface UseTierGateResult {
  gate: (
    requiredPlan: 'pro' | 'premium',
    action: () => void,
    opts: GateOptions
  ) => () => void;
  triggerGate: (state: TierGateDialogState) => void;
  dialogOpen: boolean;
  dialogState: TierGateDialogState | null;
  closeDialog: () => void;
  isPro: boolean;
  isLoading: boolean;
}

/**
 * Hook that gates an action behind a plan requirement.
 *
 * If the user's plan satisfies the requirement (or bypassCondition is true),
 * the action runs normally. Otherwise the UpgradeDialog is shown and the action
 * is blocked — the tool sheet never opens.
 *
 * Usage (button handler):
 *   const { gate, dialogOpen, dialogState, closeDialog } = useTierGate();
 *   <button onClick={gate('pro', () => setOpen(true), { featureName: 'Smart Tailoring' })} />
 *   <UpgradeDialog open={dialogOpen} onClose={closeDialog} {...(dialogState ?? { requiredPlan: 'pro', featureName: '' })} />
 *
 * Usage (programmatic trigger, e.g. URL auto-open):
 *   triggerGate({ requiredPlan: 'pro', featureName: 'Smart Tailoring' });
 */
export function useTierGate(): UseTierGateResult {
  const { isPro, isPremium, isLoading } = usePlan();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogState, setDialogState] = useState<TierGateDialogState | null>(null);

  const gate = useCallback(
    (
      requiredPlan: 'pro' | 'premium',
      action: () => void,
      opts: GateOptions
    ) => {
      return () => {
        if (isLoading) return;

        const meetsRequirement =
          requiredPlan === 'pro' ? isPro : isPremium;

        if (meetsRequirement || opts.bypassCondition) {
          action();
        } else {
          setDialogState({
            requiredPlan,
            featureName: opts.featureName,
            description: opts.description,
          });
          setDialogOpen(true);
        }
      };
    },
    [isPro, isPremium, isLoading]
  );

  const triggerGate = useCallback((state: TierGateDialogState) => {
    setDialogState(state);
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => setDialogOpen(false), []);

  return { gate, triggerGate, dialogOpen, dialogState, closeDialog, isPro, isLoading };
}
