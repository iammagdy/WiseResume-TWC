import { toast } from 'sonner';
import { reportBug } from './bugReport';
import { haptics } from './haptics';

/**
 * Shows an error toast with an optional "Report Bug" action button.
 * Use this for all AI / edge-function errors so users can easily report issues.
 */
export function showErrorToast(message: string, error?: unknown) {
  haptics.error();
  toast.error(message, {
    duration: 5000,
    action: {
      label: 'Report Bug',
      onClick: () => reportBug(error ?? new Error(message), message),
    },
  });
}

/**
 * Extracts the user-facing message from a supabase.functions.invoke error + data pair.
 * Server returns { error: code, message: "friendly text" } via toUserError helper.
 */
export function extractErrorMessage(
  error: { message?: string } | null,
  data: { error?: string; message?: string } | null,
  fallback: string
): string {
  if (data?.message) return data.message;
  if (data?.error && typeof data.error === 'string' && data.error.length > 3) return data.error;
  if (error?.message) return error.message;
  return fallback;
}
