import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/dbClient.ts';
import * as jose from 'https://deno.land/x/jose@v5.2.2/index.ts';

// Fixed namespace UUID for deterministic v5 generation
const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // DNS namespace

/**
 * Generate a deterministic UUID v5 from a Kinde user ID string.
 * Uses Web Crypto API (available in Deno).
 */
async function uuidV5(name: string, namespace: string): Promise<string> {
  // Parse namespace UUID into bytes
  const nsBytes = new Uint8Array(16);
  const hex = namespace.replace(/-/g, '');
  for (let i = 0; i < 16; i++) {
    nsBytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }

  const nameBytes = new TextEncoder().encode(name);
  const data = new Uint8Array(nsBytes.length + nameBytes.length);
  data.set(nsBytes);
  data.set(nameBytes, nsBytes.length);

  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashBytes = new Uint8Array(hashBuffer);

  // Set version (5) and variant bits
  hashBytes[6] = (hashBytes[6] & 0x0f) | 0x50;
  hashBytes[8] = (hashBytes[8] & 0x3f) | 0x80;

  const hex2 = Array.from(hashBytes.slice(0, 16))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `${hex2.slice(0, 8)}-${hex2.slice(8, 12)}-${hex2.slice(12, 16)}-${hex2.slice(16, 20)}-${hex2.slice(20, 32)}`;
}

// Cache JWKS for 1 hour
let cachedJWKS: jose.JSONWebKeySet | null = null;
let jwksCachedAt = 0;
const JWKS_CACHE_MS = 60 * 60 * 1000;

async function getKindeJWKS(): Promise<jose.JSONWebKeySet> {
  if (cachedJWKS && Date.now() - jwksCachedAt < JWKS_CACHE_MS) {
    return cachedJWKS;
  }
  const res = await fetch('https://thewisecloud.kinde.com/.well-known/jwks');
  if (!res.ok) throw new Error(`Failed to fetch JWKS: ${res.status}`);
  cachedJWKS = await res.json();
  jwksCachedAt = Date.now();
  return cachedJWKS!;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Extract Kinde token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const kindeToken = authHeader.replace('Bearer ', '');

    // 2. Verify Kinde token via JWKS
    const jwks = await getKindeJWKS();
    const keySet = jose.createLocalJWKSet(jwks);

    let payload: jose.JWTPayload;
    try {
      const result = await jose.jwtVerify(kindeToken, keySet, {
        issuer: 'https://thewisecloud.kinde.com',
      });
      payload = result.payload;
    } catch (verifyErr) {
      console.error('[token-exchange] JWT verification failed:', verifyErr);
      return new Response(JSON.stringify({ error: 'Invalid or expired Kinde token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Extract Kinde user info
    const kindeUserId = payload.sub;
    if (!kindeUserId) {
      return new Response(JSON.stringify({ error: 'Token missing sub claim' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const email = (payload as Record<string, unknown>).email as string ||
      (payload as Record<string, unknown>).preferred_username as string ||
      '';

    // 4. Generate deterministic UUID from Kinde ID
    const supabaseUserId = await uuidV5(kindeUserId, NAMESPACE);

    // 5. Upsert profile so the user exists in DB
    const serviceClient = getServiceClient();

    // Create shadow user in auth.users so FK constraints are satisfied
    const { error: createUserError } = await serviceClient.auth.admin.createUser({
      id: supabaseUserId,
      email: email || `${kindeUserId}@kinde.placeholder`,
      email_confirm: true,
    });
    if (createUserError && !createUserError.message?.includes('already been registered')) {
      console.error('[token-exchange] Failed to create shadow user:', createUserError);
    }

    await serviceClient.from('profiles').upsert(
      {
        user_id: supabaseUserId,
        contact_email: email || null,
      },
      { onConflict: 'user_id', ignoreDuplicates: true }
    );

    // Also upsert user_preferences
    await serviceClient.from('user_preferences').upsert(
      { user_id: supabaseUserId },
      { onConflict: 'user_id', ignoreDuplicates: true }
    );

    // 6. Sign Supabase-compatible JWT
    const jwtSecret = Deno.env.get('EXT_SUPABASE_JWT_SECRET');
    if (!jwtSecret) {
      console.error('[token-exchange] EXT_SUPABASE_JWT_SECRET not configured');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 3600; // 1 hour

    const secret = new TextEncoder().encode(jwtSecret);
    const supabaseToken = await new jose.SignJWT({
      sub: supabaseUserId,
      email: email,
      role: 'authenticated',
      aud: 'authenticated',
      iss: 'supabase',
      iat: now,
      exp: expiresAt,
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .sign(secret);

    // 7. Return the signed JWT
    return new Response(
      JSON.stringify({
        supabaseToken,
        userId: supabaseUserId,
        expiresAt,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('[token-exchange] Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
