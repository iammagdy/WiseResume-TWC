import { captureFeedback } from './captureErrorShim';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { supabase } from '@/integrations/supabase/safeClient';
import { USE_MERGED_TRANSACTIONAL_EMAIL } from '@/integrations/supabase/transactionalEmailFlag';

export type FeedbackType = 'bug' | 'feature' | 'contact' | 'auto-crash-report';

export interface SendFeedbackInput {
  type: FeedbackType;
  email: string;
  name?: string;
  subject?: string;
  message: string;
  metadata?: Record<string, unknown>;
  /** Sentry event id to associate this feedback with (auto-crash flows). */
  associatedEventId?: string;
  /** Extra Sentry tags merged with the default `feedback_type` tag. */
  tags?: Record<string, string>;
}

export interface SendFeedbackOptions {
  /**
   * Use the supabase JS client directly instead of the /api/fn proxy.
   * Required for ErrorBoundary, where the Express proxy may itself be
   * the thing that crashed.
   */
  useDirectSupabase?: boolean;
  /** Skip the submit-contact-request fallback when send-contact-email fails. */
  skipFallback?: boolean;
}

export interface SendFeedbackResult {
  /** True if the email pipeline accepted the request (sent OR saved-to-DB). */
  emailOk: boolean;
  /** True if email was saved-but-not-sent (config missing / delivery failed). */
  emailSaved: boolean;
  /** Raw edge-function response, when available. */
  emailRes?: { success?: boolean; saved?: boolean; reason?: string; error?: string };
  emailError?: unknown;
  /** True if the Sentry feedback channel accepted the submission. */
  sentryOk: boolean;
  /** True if at least one channel accepted the submission. */
  anyDelivered: boolean;
}

interface EdgeResponse {
  success?: boolean;
  saved?: boolean;
  reason?: string;
  error?: string;
}

/**
 * Submit feedback (bug report / feature request / contact / auto-crash) to
 * BOTH Sentry's User Feedback API AND the existing Resend email pipeline.
 *
 * Each channel is awaited independently via Promise.allSettled so a failure
 * in one does not abort the other. Callers should treat the operation as
 * successful when `result.anyDelivered === true`.
 */
export async function sendFeedback(
  input: SendFeedbackInput,
  opts: SendFeedbackOptions = {},
): Promise<SendFeedbackResult> {
  const tags: Record<string, string> = {
    feedback_type: input.type,
    ...(input.tags ?? {}),
  };

  // Sentry channel — synchronous, returns true when the SDK accepted the
  // submission (or buffered it for flush after Sentry finishes loading).
  // Note: associatedEventId is ONLY taken from the explicit input. Callers
  // that have an originating event (auto-crash, auto-detected error
  // reports) must opt in by passing it; we deliberately do not fall back
  // to getLastSentryEventId() here because for ad-hoc bug reports the
  // "last event" is unrelated and would mis-link the feedback.
  const sentryMessage = input.subject
    ? `[${input.subject}]\n${input.message}`
    : input.message;

  const sentryPromise = Promise.resolve().then(() =>
    captureFeedback({
      name: input.name,
      email: input.email,
      message: sentryMessage,
      associatedEventId: input.associatedEventId,
      tags,
    }),
  );

  // Email channel — preserves existing edge-function semantics including
  // the submit-contact-request fallback when send-contact-email fails.
  const emailBody = {
    type: input.type,
    email: input.email,
    subject: input.subject,
    message: input.message,
    metadata: input.metadata,
  };

  // Task #55: useDirectSupabase path bypasses our rewrite helper, so it
  // honours the shared `USE_MERGED_TRANSACTIONAL_EMAIL` flag (single
  // source of truth in
  // `src/integrations/supabase/transactionalEmailFlag.ts`).
  const invokePrimary = opts.useDirectSupabase
    ? (USE_MERGED_TRANSACTIONAL_EMAIL
        ? supabase.functions.invoke<EdgeResponse>('transactional-email', {
            body: { ...emailBody, action: 'contact-email' },
            headers: { 'x-transactional-email-action': 'contact-email' },
          })
        : supabase.functions.invoke<EdgeResponse>('send-contact-email', { body: emailBody }))
    : edgeFunctions.functions.invoke('send-contact-email', { body: emailBody });

  const emailPromise = (async (): Promise<{
    ok: boolean;
    saved: boolean;
    res?: EdgeResponse;
    err?: unknown;
  }> => {
    try {
      const { data, error } = (await invokePrimary) as {
        data: EdgeResponse | null;
        error: unknown;
      };
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const res = data ?? undefined;
      if (res?.success === true) {
        return { ok: true, saved: false, res };
      }
      if (
        res?.saved === true ||
        res?.reason === 'email_not_configured' ||
        res?.reason === 'email_delivery_failed'
      ) {
        return { ok: true, saved: true, res };
      }
      // Unknown shape — treat as soft failure so caller can fall back.
      return { ok: false, saved: false, res, err: new Error('Unknown response shape') };
    } catch (err) {
      if (opts.skipFallback) return { ok: false, saved: false, err };
      try {
        // Task #55: useDirectSupabase fallback respects the same flag.
        const fbInvoke = opts.useDirectSupabase
          ? (USE_MERGED_TRANSACTIONAL_EMAIL
              ? supabase.functions.invoke<EdgeResponse>('transactional-email', {
                  body: { ...emailBody, action: 'contact-request' },
                  headers: { 'x-transactional-email-action': 'contact-request' },
                })
              : supabase.functions.invoke<EdgeResponse>('submit-contact-request', { body: emailBody }))
          : edgeFunctions.functions.invoke('submit-contact-request', { body: emailBody });
        const { data: fbData, error: fbErr } = (await fbInvoke) as {
          data: EdgeResponse | null;
          error: unknown;
        };
        if (!fbErr && fbData?.success) {
          return { ok: true, saved: true, res: fbData ?? undefined };
        }
        return { ok: false, saved: false, err: fbErr ?? err };
      } catch (fallbackErr) {
        return { ok: false, saved: false, err: fallbackErr };
      }
    }
  })();

  const [sentryResult, emailResult] = await Promise.allSettled([sentryPromise, emailPromise]);

  const sentryOk = sentryResult.status === 'fulfilled' && sentryResult.value === true;
  const emailFulfilled = emailResult.status === 'fulfilled';
  const emailOk = emailFulfilled && emailResult.value.ok;
  const emailSaved = emailFulfilled && emailResult.value.saved;
  const emailRes = emailFulfilled ? emailResult.value.res : undefined;
  const emailError = emailFulfilled ? emailResult.value.err : emailResult.reason;

  return {
    emailOk,
    emailSaved,
    emailRes,
    emailError,
    sentryOk,
    anyDelivered: emailOk || sentryOk,
  };
}
