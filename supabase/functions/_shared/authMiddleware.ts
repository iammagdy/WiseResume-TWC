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
 * @deprecated Use `requireAuth()` for authenticated edge functions. This function
 * does NOT verify the JWT signature and should only be used for optional/public auth
 * where no security decision depends on the token being valid.
 */
export function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new AuthError('Invalid token format', 401);
  const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const json = atob(b64.padEnd(b64.length + (4 - b64.length % 4) % 4, '='));
  return JSON.parse(json);
}

import * as jose from 'https://deno.land/x/jose@v4.15.5/index.ts';

export async function requireAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('Missing authorization header', 401);
  }

  const token = authHeader.replace('Bearer ', '');
  const secretStr = Deno.env.get('EXT_SUPABASE_JWT_SECRET');
  
  if (!secretStr) {
    throw new Error('EXT_SUPABASE_JWT_SECRET environment variable is not set');
  }

  let claims: jose.JWTPayload;
  try {
    const secret = new TextEncoder().encode(secretStr);
    const { payload } = await jose.jwtVerify(token, secret);
    claims = payload;
  } catch (err: unknown) {
    console.error('JWT verification failed:', err);
    throw new AuthError('Unauthorized - invalid signature', 401);
  }

  // With Supabase Auth, sub is the user UUID directly
  const userId = claims['sub'] as string;
  if (!userId) {
    throw new AuthError('Missing sub claim (unauthorized)', 401);
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
