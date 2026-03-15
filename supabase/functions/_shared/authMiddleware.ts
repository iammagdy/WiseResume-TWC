import { getCorsHeaders } from './cors.ts';
import { getServiceClient } from './dbClient.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
 * Decodes a JWT payload without verifying the signature.
 */
export function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new AuthError('Invalid token format', 401);
  const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const json = atob(b64.padEnd(b64.length + (4 - b64.length % 4) % 4, '='));
  return JSON.parse(json);
}

/**
 * Validates the Authorization header and returns the authenticated user's ID
 * and a service-role Supabase client that targets the EXTERNAL database project.
 * Uses the service client's getUser() method to verify the JWT signature.
 */
export async function requireAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('Missing authorization header', 401);
  }

  const token = authHeader.replace('Bearer ', '');
  const client = getServiceClient();

  try {
    const { data: { user }, error } = await client.auth.getUser(token);

    if (error || !user) {
      console.warn('requireAuth: Invalid JWT signature or user not found:', error?.message);
      throw new AuthError('Unauthorized', 401);
    }

    return { userId: user.id, client };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AuthError') throw err;
    throw new AuthError('Unauthorized', 401);
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
