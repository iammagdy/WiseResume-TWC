/**
 * Smoke-test bypass for Editor AI edge functions.
 *
 * `checkSmokeBypass` is the single entry point:
 *   1. Returns null immediately if `x-smoke-test: true` is absent
 *      (caller proceeds with its normal flow).
 *   2. Validates the caller is a DevKit admin via `requireAdminAuth`
 *      (reads the `Authorization: Bearer <devkit-token>` header).
 *   3. On valid admin auth: emits a structured log and returns a
 *      synthetic 200 without calling the AI provider or deducting credits.
 *   4. On invalid admin auth: forwards the 401 / 403 from requireAdminAuth.
 *
 * Security contract:
 *   - Regular users cannot trigger the bypass because they do not hold a
 *     valid DevKit admin token; `requireAdminAuth` will reject their JWT.
 *   - `checkSmokeBypass` MUST be called BEFORE `requireAuth` / `tryAuth`
 *     so that the DevKit admin token in the Authorization header is
 *     consumed here and not mis-validated as a Supabase JWT.
 *
 * Frontend callers must include BOTH headers:
 *     headers: { 'x-smoke-test': 'true', ...devKitAuthHeaders() }
 */

import { requireAdminAuth } from './adminAuth.ts';
import { logger } from './logger.ts';

/**
 * Check for the smoke-test admin bypass.  See module doc for the full contract.
 *
 * @param req           Incoming request.
 * @param corsHeaders   CORS headers to attach to any emitted Response.
 * @param functionName  Edge function name — used for structured logging.
 * @param synthetic     Extra fields merged into the synthetic response body.
 * @returns Response (synthetic 200 or admin-auth error) | null (no bypass).
 */
export async function checkSmokeBypass(
  req: Request,
  corsHeaders: Record<string, string>,
  functionName: string,
  synthetic: Record<string, unknown> = {},
): Promise<Response | null> {
  if (req.headers.get('x-smoke-test') !== 'true') return null;

  const log = logger(functionName);
  const start = Date.now();

  try {
    await requireAdminAuth(req, corsHeaders);
  } catch (err) {
    if (err instanceof Response) return err;
    log.error('Unexpected error during smoke-test admin auth', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal error during smoke-test auth' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const duration_ms = Date.now() - start;
  log.info('smoke-test bypass', {
    function_name: functionName,
    provider_used: 'smoke-test',
    error_type: null,
    duration_ms,
  });

  return new Response(
    JSON.stringify({
      _smoke: true,
      provider_used: 'smoke-test',
      error_type: null,
      ...synthetic,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}
