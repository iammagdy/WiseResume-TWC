import { getCorsHeaders } from './cors.ts';
import { getServiceClient } from './dbClient.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1';
import { logger } from './logger.ts';
import { decodeJwtPayloadUnsafe } from './jwtUtils.ts';

const log = logger('authMiddleware');

export interface AuthResult {
  userId: string;
  client: SupabaseClient;
}

export class AuthError extends Error {
  status: number;

  constructor(message = 'Unauthorized', status = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

/**
 * `requireAuth` is the only approved way to extract JWT claims in edge functions.
 *
 * Token verification is delegated to Supabase Auth's own `/auth/v1/user` endpoint
 * via `supabase.auth.getUser(token)`. This handles all JWT algorithms (HS256, ES256)
 * and is always authoritative — it never fails due to key algorithm mismatches or
 * JWKS fetch issues. The anon key is used to initialize the client; the user's
 * Bearer token is passed explicitly to `getUser()`.
 *
 * Never bypass this by decoding JWT payloads manually for any security decision.
 */
export async function requireAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('Missing authorization header', 401);
  }

  const token = authHeader.replace('Bearer ', '');

  const supabaseUrl = Deno.env.get('EXT_SUPABASE_URL') || Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is not set');
  }
  if (!anonKey) {
    throw new Error('SUPABASE_ANON_KEY environment variable is not set');
  }

  // Use the anon-key client to call auth.getUser() — Supabase Auth validates
  // the token's signature, expiry, and revocation status on the server side.
  const anonClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error } = await anonClient.auth.getUser(token);

  if (error || !user?.id) {
    log.warn('Token validation failed', { reason: error?.message ?? 'no user returned' });
    throw new AuthError('Invalid or expired auth token', 401);
  }

  const client = getServiceClient();

  // Task #18: enforce admin "End session now" revocation. Impersonation tokens
  // carry `is_impersonation: true`. We peek at the (already signature-verified
  // by Supabase Auth) payload and reject if a revocation row exists with
  // revoked_at >= the token's iat. Re-issuing impersonation for the same user
  // produces a newer iat and starts working again without clearing the row.
  let claims: Record<string, unknown> = {};
  try {
    claims = decodeJwtPayloadUnsafe(token);
  } catch {
    // Malformed payload would have failed getUser above — just skip the
    // denylist check rather than 500.
  }
  if (claims.is_impersonation === true) {
    const iat = typeof claims.iat === 'number' ? claims.iat : null;
    if (iat !== null) {
      const { data: revocation, error: revErr } = await client
        .from('impersonation_revocations')
        .select('revoked_at')
        .eq('target_user_id', user.id)
        .maybeSingle();
      // Fail closed when the lookup itself errors — an admin pressing
      // "End session now" must not be silently ignored if the table is
      // unreachable. The cost is a 401 the admin can resolve by retrying.
      if (revErr) {
        log.warn('Impersonation revocation lookup failed', { reason: revErr.message });
        throw new AuthError('Could not verify impersonation session', 401);
      }
      if (revocation?.revoked_at) {
        const revokedSec = Math.floor(new Date(revocation.revoked_at).getTime() / 1000);
        if (revokedSec >= iat) {
          log.warn('Impersonation token revoked', { target_user_id: user.id });
          throw new AuthError('Impersonation session revoked', 401);
        }
      }
    }
  }

  return { userId: user.id, client };
}

/**
 * Non-throwing variant of `requireAuth`. Returns either the `AuthResult` on
 * success OR a fully-formed 401 `Response` on auth failure (with the caller's
 * CORS headers attached). This is the architectural contract called for by
 * audit task #65 §6 H1: callers can early-return the Response BEFORE entering
 * their main `try { … } catch (toUserError)` block, so unauthenticated POSTs
 * surface as a clean 401 instead of being collapsed into a generic 500 by the
 * outer error translator. Non-auth errors (e.g. missing env, transient
 * Supabase Auth call failures) are still re-thrown so they remain visible.
 *
 * Pattern at the call site:
 *
 *   const auth = await tryAuth(req, corsHeaders);
 *   if (auth instanceof Response) return auth;
 *   const { userId, client } = auth;
 *   try {
 *     // …feature work…
 *   } catch (error) {
 *     return new Response(JSON.stringify(toUserError(error)), { … });
 *   }
 */
export async function tryAuth(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<AuthResult | Response> {
  try {
    return await requireAuth(req);
  } catch (err) {
    if (err instanceof AuthError) {
      return new Response(
        JSON.stringify({ error: 'unauthorized', message: err.message }),
        { status: err.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    throw err;
  }
}

/**
 * Helper to build an auth error response with CORS headers.
 */
export function authErrorResponse(err: unknown, origin: string | null): Response {
  const corsHeaders = getCorsHeaders(origin);
  const status = typeof err === 'object' && err !== null && 'status' in err
    ? (err as { status: number }).status
    : 401;
  const message = typeof err === 'object' && err !== null && 'message' in err
    ? (err as { message: string }).message
    : 'Unauthorized';

  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
