/**
 * Structured logger + Sentry integration for Edge Functions.
 *
 * Outputs JSON-formatted log entries to stdout. Supabase captures these in the
 * Edge Runtime logs, searchable in the Dashboard and exportable to external
 * aggregators (Datadog, Loki, etc.).
 *
 * When SENTRY_DSN is set, ERROR-level events are also forwarded to Sentry via
 * their envelope REST API — no Deno SDK import required.
 *
 * Usage:
 *   import { logger } from '../_shared/logger.ts';
 *   const log = logger('my-function');
 *
 *   log.info('Credit deducted', { userId, credits: 1 });
 *   log.warn('BYOK key missing', { userId, provider: 'openai' });
 *   log.error('AI call failed', error, { userId, endpoint: 'generate-summary' });
 */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogEntry {
  level: LogLevel;
  fn: string;
  msg: string;
  ts: string;
  [key: string]: unknown;
}

function emit(level: LogLevel, fn: string, msg: string, extra?: Record<string, unknown>): void {
  const entry: LogEntry = {
    level,
    fn,
    msg,
    ts: new Date().toISOString(),
    ...extra,
  };
  console.log(JSON.stringify(entry));
}

function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      errorName: err.name,
      errorMessage: err.message,
      errorStack: err.stack,
    };
  }
  return { rawError: String(err) };
}

/**
 * Forward an error event to Sentry via the envelope API.
 * This is fire-and-forget (non-blocking); failures are swallowed.
 *
 * Requires SENTRY_DSN to be set in Edge Function environment secrets.
 * Format: https://<key>@<host>/sentry.io/<project-id>
 */
async function sendToSentry(
  functionName: string,
  msg: string,
  err: unknown,
  extra?: Record<string, unknown>,
): Promise<void> {
  const dsn = Deno.env.get('SENTRY_DSN');
  if (!dsn) return;

  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace('/', '');
    const sentryIngestUrl = `${url.protocol}//${url.host}/api/${projectId}/envelope/`;

    const errorFields = serializeError(err);
    const eventId = crypto.randomUUID().replace(/-/g, '');
    const now = new Date().toISOString();

    const envelope = [
      JSON.stringify({ event_id: eventId, sent_at: now }),
      JSON.stringify({ type: 'event' }),
      JSON.stringify({
        event_id: eventId,
        timestamp: now,
        platform: 'javascript',
        logger: functionName,
        level: 'error',
        message: msg,
        exception: {
          values: [
            {
              type: errorFields.errorName ?? 'Error',
              value: errorFields.errorMessage ?? String(err),
              stacktrace: errorFields.errorStack
                ? {
                    frames: (errorFields.errorStack as string)
                      .split('\n')
                      .slice(1)
                      .map((line: string) => ({ filename: line.trim() })),
                  }
                : undefined,
            },
          ],
        },
        extra: { functionName, ...extra },
        tags: { fn: functionName },
      }),
    ].join('\n');

    await fetch(sentryIngestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${url.username}`,
      },
      body: envelope,
    });
  } catch {
    // Sentry reporting must never interfere with primary function behavior
  }
}

export interface Logger {
  debug(msg: string, extra?: Record<string, unknown>): void;
  info(msg: string, extra?: Record<string, unknown>): void;
  warn(msg: string, extra?: Record<string, unknown>): void;
  error(msg: string, err?: unknown, extra?: Record<string, unknown>): void;
}

/**
 * Create a scoped logger for the given Edge Function name.
 * @param functionName - The edge function name (e.g. 'generate-summary')
 */
export function logger(functionName: string): Logger {
  return {
    debug(msg, extra) {
      emit('DEBUG', functionName, msg, extra);
    },
    info(msg, extra) {
      emit('INFO', functionName, msg, extra);
    },
    warn(msg, extra) {
      emit('WARN', functionName, msg, extra);
    },
    error(msg, err, extra) {
      const errorFields = err !== undefined ? serializeError(err) : {};
      emit('ERROR', functionName, msg, { ...errorFields, ...extra });
      if (err !== undefined) {
        sendToSentry(functionName, msg, err, extra).catch(() => {});
      }
    },
  };
}
