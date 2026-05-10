import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { hasAcceptedAIPrivacy } from '@/components/ai/AIPrivacyDisclosure';
import { useAIPrivacyDisclosure } from '@/components/ai/AIPrivacyDisclosureProvider';
import { AIError, aiErrorToastMessage, parseAIErrorBody } from '@/lib/aiErrorParser';

interface UseAIActionOptions {
  /** The operation type key from AI_COST_MAP (e.g. 'enhance', 'tailor') */
  operation: string;
}

/**
 * Coerce an arbitrary thrown error into a typed AIError so every error path
 * goes through the single `aiErrorToastMessage` mapping. This replaces the
 * legacy `parseErrorMessage` regex sniffer that was running in parallel
 * with the structured parser and producing inconsistent toast copy.
 */
function coerceToAIError(err: unknown): AIError {
  if (err instanceof AIError) return err;
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return new AIError({ code: 'offline', status: 0, message: 'Offline' });
  }
  // Pull any structured fields off the thrown value (works for both plain
  // objects AND Error subclasses that carry status/code/body, e.g. the
  // shapes that `appwriteFunctions.functions.invoke` and our own fetch wrapper
  // throw). We *prefer* explicit status/code over message sniffing.
  if (err && typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    const status =
      typeof obj.status === 'number'
        ? obj.status
        : typeof obj.statusCode === 'number'
          ? (obj.statusCode as number)
          : 500;
    const body =
      obj.body && typeof obj.body === 'object'
        ? (obj.body as Record<string, unknown>)
        : (obj as Record<string, unknown>);
    // If we have at least one structured signal (status/code/error_code),
    // route through parseAIErrorBody so explicit codes win over the
    // message text.
    if (
      typeof obj.status === 'number' ||
      typeof obj.statusCode === 'number' ||
      typeof body.code === 'string' ||
      typeof body.error_code === 'string'
    ) {
      return new AIError(parseAIErrorBody(body, status));
    }
    // Plain Error with only a message — try JSON-parsing the message
    // before falling through to the message-based classifier.
    const raw = err instanceof Error ? err.message : String((obj as { message?: unknown }).message ?? '');
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return new AIError(parseAIErrorBody(parsed as Record<string, unknown>, status));
      }
    } catch {
      /* not JSON */
    }
    return new AIError(parseAIErrorBody({ message: raw }, status));
  }
  // Primitive throw (string/number/etc.) — last-ditch coercion.
  const raw = String(err ?? '');
  return new AIError(parseAIErrorBody({ message: raw }, 500));
}

/* legacy parseErrorMessage / classifyErrorBody removed in Task #3 — every
 * error now flows through `coerceToAIError` → `aiErrorToastMessage` so a
 * single mapping owns the user-visible copy. */

/**
 * Universal wrapper for all AI actions.
 * Credits are now deducted atomically server-side inside each edge function.
 * This hook handles: privacy disclosure gate (one-time) → execute action → cache invalidation.
 *
 * Requires <AIPrivacyDisclosureProvider> in the component tree.
 *
 * Usage:
 *   const { execute } = useAIAction({ operation: 'tailor' });
 *   const result = await execute(async () => { ... });
 */
export function useAIAction({ operation }: UseAIActionOptions) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { requestDisclosure } = useAIPrivacyDisclosure();
  const navigate = useNavigate();

  const execute = useCallback(
    async <T>(
      action: () => Promise<T>,
      opts?: { silent?: boolean },
    ): Promise<T | null> => {
      // 0. Privacy disclosure gate (one-time per device, stored in localStorage)
      if (!hasAcceptedAIPrivacy()) {
        const accepted = await requestDisclosure();
        if (!accepted) return null;
      }

      let result: T;
      try {
        result = await action();
      } catch (err: unknown) {
        // In silent mode, the caller wants to handle the error itself
        // (e.g. per-section retry / inline error in batch flows). Re-throw
        // without showing a global toast so transient section failures don't
        // surface as repeated "AI temporarily unavailable" banners.
        if (opts?.silent) {
          throw err;
        }

        // Single error path (Task #3): coerce anything thrown into a typed
        // AIError, then drive the toast off the structured `code`. This
        // replaces the legacy `parseErrorMessage` regex sniffer that ran in
        // parallel with the structured parser and produced inconsistent
        // copy. Keep "Open Settings" affordances on the codes that actually
        // require a user-side fix.
        const aiErr = coerceToAIError(err);
        const msg = aiErrorToastMessage({
          code: aiErr.code,
          message: aiErr.message,
          status: aiErr.status,
        });
        const settingsCodes = new Set([
          'not_configured',
          'invalid_key',
          'quota_exceeded',
          'profile_incomplete',
        ]);
        if (settingsCodes.has(aiErr.code)) {
          toast.error(msg, {
            duration: 8000,
            action: {
              label: 'Open Settings',
              onClick: () => navigate('/settings'),
            },
          });
        } else {
          toast.error(msg);
        }
        return null;
      }

      // Invalidate credits cache so the UI reflects the server-side deduction
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['me'], refetchType: 'all' });
        queryClient.invalidateQueries({ queryKey: ['ai-usage-breakdown'], refetchType: 'all' });
      }

      return result;
    },
    [queryClient, user, operation, requestDisclosure, navigate],
  );

  return { execute };
}
