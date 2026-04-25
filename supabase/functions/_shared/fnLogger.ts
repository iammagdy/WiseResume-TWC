/**
 * Edge function invocation logger.
 *
 * Exports two helpers:
 *
 *   logInvocation(name, statusCode, latencyMs, isError)
 *     Fire-and-forget insert into `edge_function_logs`.
 *     All errors are silently swallowed — instrumentation must never
 *     affect the primary function response path.
 *
 *   wrapHandler(functionName, handler)
 *     Wraps a serve/Deno.serve handler to automatically log every
 *     invocation. OPTIONS pre-flights are skipped (noise).
 */

import { getServiceClient } from './dbClient.ts';

export function logInvocation(
  functionName: string,
  statusCode: number,
  latencyMs: number,
  isError: boolean,
): void {
  try {
    const db = getServiceClient();
    db.from('edge_function_logs')
      .insert({
        function_name: functionName,
        status_code: statusCode,
        latency_ms: latencyMs,
        error: isError,
      })
      .then(({ error }) => {
        if (error) {
          console.warn(`[fnLogger] insert failed (non-fatal): ${error.message}`);
        }
      })
      .catch(() => { /* swallow */ });
  } catch {
    /* swallow — never let logging break the caller */
  }
}

export function wrapHandler(
  functionName: string,
  inner: (req: Request) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return inner(req);
    const start = Date.now();
    let status = 200;
    try {
      const res = await inner(req);
      status = res.status;
      return res;
    } catch (err) {
      status = 500;
      throw err;
    } finally {
      const latencyMs = Date.now() - start;
      logInvocation(functionName, status, latencyMs, status >= 400);
    }
  };
}
