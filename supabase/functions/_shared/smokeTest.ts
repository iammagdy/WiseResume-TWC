/**
 * Smoke-test bypass utilities for Editor AI edge functions.
 *
 * Functions that honour `x-smoke-test: true` can return a minimal synthetic
 * response without calling the AI provider or deducting credits. This keeps
 * DevKit smoke runs fast and free.
 *
 * Security: `isSmokeTest` must only be acted on AFTER authentication
 * succeeds so unauthenticated callers cannot exploit the bypass.
 *
 * Usage:
 *   // After requireAuth / tryAuth succeeds:
 *   if (isSmokeTest(req)) {
 *     return smokeResponse(corsHeaders, { function_name: 'my-fn' });
 *   }
 */

/**
 * Returns true when the request carries the `x-smoke-test: true` header.
 */
export function isSmokeTest(req: Request): boolean {
  return req.headers.get('x-smoke-test') === 'true';
}

/**
 * Build a minimal synthetic 200 response for a smoke test invocation.
 *
 * @param corsHeaders  CORS headers to attach.
 * @param extra        Extra fields merged into the JSON body alongside `_smoke: true`.
 */
export function smokeResponse(
  corsHeaders: Record<string, string>,
  extra: Record<string, unknown> = {},
): Response {
  return new Response(
    JSON.stringify({ _smoke: true, provider_used: 'smoke-test', error_type: null, ...extra }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}
