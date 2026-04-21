/**
 * Operator-visible signal for fail-OPEN events.
 *
 * Both `userRateLimiter.checkUserRateLimit` and `aiClient.isBreakerOpen`
 * deliberately return "allow" on infrastructure errors (a misbehaving
 * rate-limit table or breaker would otherwise take down every AI feature
 * in the product). That trade-off is correct, but without an external
 * signal both layers can silently degrade abuse prevention indefinitely.
 *
 * `recordFailOpen` writes a best-effort row into `ops_health_events`. The
 * write is fire-and-forget: we never await it on the request critical
 * path, and we swallow ANY error so a broken health table cannot itself
 * cause an outage. An admin RPC (`ops_health_recent_counts`) returns the
 * per-event counts in the last hour for an on-call dashboard.
 */

import { getServiceClient } from './dbClient.ts';

export type FailOpenEvent =
  | 'rate_limiter_fail_open'
  | 'rate_limiter_insert_fail_open'
  | 'breaker_read_fail_open'
  | 'admin_settings_db_error';

interface RecordOpts {
  /** Free-form feature/provider tag, e.g. "tailor" or "openrouter". */
  feature?: string;
  /** Short, redacted reason — capped at 200 chars before insert. */
  reason?: string;
}

export function recordFailOpen(event: FailOpenEvent, opts: RecordOpts = {}): void {
  // Fire-and-forget; never block a request on the health table.
  queueMicrotask(async () => {
    try {
      const supabase = getServiceClient();
      await supabase.from('ops_health_events').insert({
        event,
        feature: opts.feature ?? null,
        reason: (opts.reason ?? '').slice(0, 200) || null,
      });
    } catch (err) {
      // Last-resort log. Intentionally not console.error so it cannot
      // create a feedback loop with anything that scrapes error counts.
      console.warn('[opsHealth] recordFailOpen swallowed error:', err instanceof Error ? err.message : err);
    }
  });
}
