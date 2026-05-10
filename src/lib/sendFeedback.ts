import { captureFeedback } from './captureErrorShim';
import { appwriteFunctions } from '@/lib/appwrite-functions';

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
   * Legacy flag — kept for call-site compatibility. With Appwrite all channels
   * route through the same Appwrite Functions pathway, so this option is a no-op.
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
 * BOTH Sentry's User Feedback API AND the Resend email pipeline (Appwrite
 * Function: `send-contact-email`).
 *
 * Each channel is awaited independently via Promise.allSettled so a failure
 * in one does not abort the other. Callers should treat the operation as
 * successful when `result.anyDelivered === true`.
 *
 * Note: the email Functions (`send-contact-email`, `submit-contact-request`)
 * are being rebuilt on Appwrite. Until they are deployed, the email channel
 * will return `emailOk: false` while Sentry continues to work.
 */
export async function sendFeedback(
  input: SendFeedbackInput,
  opts: SendFeedbackOptions = {},
): Promise<SendFeedbackResult> {
  const tags: Record<string, string> = {
    feedback_type: input.type,
    ...(input.tags ?? {}),
  };

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

  const emailBody = {
    type: input.type,
    email: input.email,
    subject: input.subject,
    message: input.message,
    metadata: input.metadata,
  };

  const emailPromise = (async (): Promise<{
    ok: boolean;
    saved: boolean;
    res?: EdgeResponse;
    err?: unknown;
  }> => {
    try {
      const { data, error } = await appwriteFunctions.invoke<EdgeResponse>(
        'send-contact-email',
        { body: emailBody },
      );
      if (error) throw new Error(error.message);
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
      return { ok: false, saved: false, res, err: new Error('Unknown response shape') };
    } catch (err) {
      if (opts.skipFallback) return { ok: false, saved: false, err };
      try {
        const { data: fbData, error: fbError } = await appwriteFunctions.invoke<EdgeResponse>(
          'submit-contact-request',
          { body: emailBody },
        );
        if (!fbError && fbData?.success) {
          return { ok: true, saved: true, res: fbData ?? undefined };
        }
        return { ok: false, saved: false, err: fbError ?? err };
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
