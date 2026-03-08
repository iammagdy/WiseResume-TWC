import { getCorsHeaders } from './cors.ts';
import { getServiceClient } from './dbClient.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface AuthResult {
  userId: string;
  client: SupabaseClient;
}

/**
 * Decodes a JWT payload without verifying the signature.
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
 * and a service-role Supabase client that targets the EXTERNAL database project.
 * With pure Supabase Auth, the `sub` claim IS the user UUID directly.
 */
export async function requireAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw { status: 401, message: 'Missing authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');

  let claims: Record<string, unknown>;
  try {
    claims = decodeJwtPayload(token);
  } catch {
    throw { status: 401, message: 'Unauthorized' };
  }

  // With Supabase Auth, sub is the user UUID directly
  const userId = claims['sub'] as string;
  if (!userId) {
    throw { status: 401, message: 'Unauthorized' };
  }

  const client = getServiceClient();

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
