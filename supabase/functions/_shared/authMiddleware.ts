import { getCorsHeaders } from './cors.ts';
import { getServiceClient } from './dbClient.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logger } from './logger.ts';

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

  return { userId: user.id, client };
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
