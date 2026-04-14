/**
 * Shared utilities for portfolio visitor session tokens.
 *
 * Tokens are HMAC-SHA256 signed short-lived credentials issued by
 * create-portfolio-session and consumed by ask-portfolio. They replace
 * IP-header-based identity with a non-bypassable server-issued credential.
 *
 * Token format: base64(payload_json).base64(hmac_sig)
 */

const SECRET = Deno.env.get('API_KEY_ENCRYPTION_SECRET');

export interface PortfolioSessionPayload {
  portfolioUsername: string;
  sessionId: string;
  expiresAt: number;
}

async function getHmacKey(): Promise<CryptoKey> {
  if (!SECRET) throw new Error('API_KEY_ENCRYPTION_SECRET env var is required');
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

async function signPayload(payloadB64: string): Promise<string> {
  const key = await getHmacKey();
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

/** Issues a signed portfolio visitor session token (1 hour TTL). */
export async function createSessionToken(
  portfolioUsername: string,
): Promise<{ token: string; expiresAt: number; sessionId: string }> {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const sessionId = crypto.randomUUID();
  const payload: PortfolioSessionPayload = { portfolioUsername, sessionId, expiresAt };
  const payloadB64 = btoa(JSON.stringify(payload));
  const sig = await signPayload(payloadB64);
  return { token: `${payloadB64}.${sig}`, expiresAt, sessionId };
}

/** Validates a signed portfolio visitor session token.
 * Returns the decoded payload or null if invalid / expired / tampered. */
export async function verifySessionToken(
  token: string,
): Promise<PortfolioSessionPayload | null> {
  try {
    const dotIdx = token.lastIndexOf('.');
    if (dotIdx === -1) return null;

    const payloadB64 = token.slice(0, dotIdx);
    const sig = token.slice(dotIdx + 1);

    const expectedSig = await signPayload(payloadB64);
    if (expectedSig !== sig) return null;

    const payload = JSON.parse(atob(payloadB64)) as PortfolioSessionPayload;
    if (!payload.portfolioUsername || !payload.sessionId || !payload.expiresAt) return null;
    if (Date.now() / 1000 > payload.expiresAt) return null;

    return payload;
  } catch {
    return null;
  }
}
