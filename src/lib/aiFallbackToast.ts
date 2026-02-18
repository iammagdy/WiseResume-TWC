/**
 * AI Fallback Toast
 * Shows a one-per-session notification when BYOK key fails and system falls back to default AI.
 */
import { toast } from 'sonner';

let hasShownFallbackToast = false;

/**
 * Call this after receiving a response from an AI edge function.
 * If the response contains `_fallbackUsed: true`, shows a toast once per session.
 */
export function checkAIFallback(responseData: unknown): void {
  if (!responseData || typeof responseData !== 'object') return;
  const data = responseData as Record<string, unknown>;

  if (data._fallbackUsed && !hasShownFallbackToast) {
    hasShownFallbackToast = true;

    const reason = data._fallbackReason;
    let message = 'Your API key failed — using WiseResume AI instead.';
    if (reason === 'quota_exceeded') {
      message = 'Your API key quota is exhausted — using WiseResume AI instead.';
    } else if (reason === 'rate_limit') {
      message = 'Your API key hit rate limits — using WiseResume AI instead.';
    } else if (reason === 'invalid_key') {
      message = 'Your API key is invalid — using WiseResume AI instead.';
    }

    toast.warning(message, { duration: 5000 });
  }
}

/** Reset the flag (e.g. when user changes provider settings) */
export function resetFallbackToast(): void {
  hasShownFallbackToast = false;
}
