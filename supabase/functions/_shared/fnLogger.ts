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
 *
 *     Every non-OPTIONS response emits a structured console log with
 *     the four canonical fields required for Task #39:
 *       function_name, provider_used (null — per-call logs carry actual value),
 *       error_type (null on 2xx/3xx, 'HttpError' on 4xx/5xx),
 *       duration_ms.
 *     This ensures every request path — including early returns for
 *     rate-limit, credit, feature-gate, and validation errors — is
 *     covered without per-branch instrumentation.
 */

import { getServiceClient } from './dbClient.ts';

export function logInvocation(
  functionName: string,
  statusCode: number,
  latencyMs: number,
  isError: boolean,
): void {
  void (async () => {
    try {
      const db = getServiceClient();
      const { error } = await db.from('edge_function_logs')
        .insert({
          function_name: functionName,
          status_code: statusCode,
          latency_ms: latencyMs,
          error: isError,
        });
      if (error) {
        console.warn(`[fnLogger] insert failed (non-fatal): ${error.message}`);
      }
    } catch {
      /* swallow — never let logging break the caller */
    }
  })();
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
      const duration_ms = Date.now() - start;
      logInvocation(functionName, status, duration_ms, status >= 400);
      console.log(JSON.stringify({
        level: status >= 400 ? 'WARN' : 'INFO',
        fn: functionName,
        msg: 'invocation',
        function_name: functionName,
        provider_used: null,
        error_type: status >= 400 ? 'HttpError' : null,
        duration_ms,
        status_code: status,
        ts: new Date().toISOString(),
      }));
    }
  };
}
