/**
 * Non-security JWT utilities for extracting payload claims without signature verification.
 *
 * IMPORTANT: These functions do NOT verify JWT signatures. They must NEVER be used for
 * any security decision (authentication, authorization, data access gating, etc.).
 *
 * Intended use cases:
 *  - Extracting a rate-limit key (sub) from client-supplied tokens that may originate
 *    from a different Supabase project (e.g. mobile clients) where verifying against
 *    SUPABASE_JWT_SECRET would incorrectly reject valid tokens.
 *
 * For any security-sensitive auth check, use requireAuth() from authMiddleware.ts instead.
 */

/**
 * Decodes the payload of a JWT without verifying the signature.
 * Returns the parsed claims object, or throws if the token is malformed.
 *
 * DO NOT use for authentication or authorization decisions.
 */
export function decodeJwtPayloadUnsafe(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token format');
  const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const json = atob(b64.padEnd(b64.length + (4 - b64.length % 4) % 4, '='));
  return JSON.parse(json);
}
