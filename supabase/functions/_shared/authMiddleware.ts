import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from './cors.ts';

export interface AuthResult {
  userId: string;
  client: ReturnType<typeof createClient>;
}

/**
 * Decodes a JWT payload without verifying the signature.
 * Clerk-signed tokens cannot be verified by Supabase's auth secret,
 * so we extract claims client-side. PostgREST verifies the token at the DB layer.
 */
export function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3) throw { status: 401, message: 'Invalid token format' };
  const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const json = atob(b64.padEnd(b64.length + (4 - b64.length % 4) % 4, '='));
  return JSON.parse(json);
}

/**
 * Validates the Authorization header and returns the authenticated user's ID
 * and a scoped Supabase client. Throws an object with { status, message }
 * on failure so callers can catch and return the appropriate HTTP response.
 */
export async function requireAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw { status: 401, message: 'Missing authorization header' };
  }

  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace('Bearer ', '');

  let claims: Record<string, unknown>;
  try {
    claims = decodeJwtPayload(token);
  } catch {
    throw { status: 401, message: 'Unauthorized' };
  }

  // Use supabaseUuid custom claim from Clerk JWT, fall back to sub
  const userId = (claims['supabaseUuid'] as string) || (claims['sub'] as string);
  if (!userId) {
    throw { status: 401, message: 'Unauthorized' };
  }

  return { userId, client };
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
