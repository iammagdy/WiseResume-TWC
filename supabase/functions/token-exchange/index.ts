import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/dbClient.ts';
import * as jose from 'https://deno.land/x/jose@v5.2.2/index.ts';

// Fixed namespace UUID for deterministic v5 generation
const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // DNS namespace

async function uuidV5(name: string, namespace: string): Promise<string> {
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

/** Structured error response helper */
function errorResponse(
  code: string,
  message: string,
  status: number,
  corsHeaders: Record<string, string>,
) {
  return new Response(
    JSON.stringify({ code, message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

/** Fire-and-forget audit log insert */
function logExchange(
  serviceClient: ReturnType<typeof getServiceClient>,
  kindeSub: string,
  userId: string,
  status: 'success' | 'error',
  errorCode?: string,
) {
  serviceClient
    .from('token_exchanges')
    .insert({ kinde_sub: kindeSub, user_id: userId, status, error_code: errorCode || null })
    .then(({ error }) => {
      if (error) console.warn('[token-exchange] audit log insert failed:', error.message);
    });
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Track for audit logging
  let kindeSub = 'unknown';
  let supabaseUserId = '00000000-0000-0000-0000-000000000000';

  try {
    // 1. Extract Kinde token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse('MISSING_AUTH_HEADER', 'Missing authorization header', 401, corsHeaders);
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
      const serviceClient = getServiceClient();
      logExchange(serviceClient, kindeSub, supabaseUserId, 'error', 'INVALID_KINDE_TOKEN');
      return errorResponse('INVALID_KINDE_TOKEN', 'Kinde token invalid or expired', 401, corsHeaders);
    }

    // 3. Extract Kinde user info
    kindeSub = (payload.sub as string) || '';
    if (!kindeSub) {
      const serviceClient = getServiceClient();
      logExchange(serviceClient, 'missing', supabaseUserId, 'error', 'MISSING_SUB_CLAIM');
      return errorResponse('MISSING_SUB_CLAIM', 'Token missing sub claim', 401, corsHeaders);
    }

    const email = (payload as Record<string, unknown>).email as string ||
      (payload as Record<string, unknown>).preferred_username as string ||
      '';

    // 4. Generate deterministic UUID from Kinde ID
    supabaseUserId = await uuidV5(kindeSub, NAMESPACE);

    // 5. Upsert profile so the user exists in DB
    const serviceClient = getServiceClient();

    const extUrl = Deno.env.get('EXT_SUPABASE_URL') || Deno.env.get('SUPABASE_URL') || '(none)';
    console.log(`[token-exchange] Creating shadow user — id=${supabaseUserId}, email=${email || '(empty)'}, target=${extUrl}`);

    // Create shadow user in auth.users so FK constraints are satisfied
    const { data: createUserData, error: createUserError } = await serviceClient.auth.admin.createUser({
      id: supabaseUserId,
      email: email || `${kindeSub}@kinde.placeholder`,
      email_confirm: true,
    });

    if (createUserError) {
      const msg = createUserError.message?.toLowerCase() || '';
      const isAlreadyExists = msg.includes('already') || msg.includes('duplicate') || msg.includes('exists');
      if (isAlreadyExists) {
        console.log(`[token-exchange] Shadow user already exists (expected): ${createUserError.message}`);
      } else {
        console.error(`[token-exchange] createUser FAILED: status=${createUserError.status}, message=${createUserError.message}`);
        // Verify user actually exists before proceeding
        const { data: existingUser, error: getUserErr } = await serviceClient.auth.admin.getUserById(supabaseUserId);
        if (getUserErr || !existingUser?.user) {
          console.error(`[token-exchange] getUserById also failed — user does NOT exist in auth.users. Returning 500.`);
          logExchange(serviceClient, kindeSub, supabaseUserId, 'error', 'SHADOW_USER_FAILED');
          return errorResponse('SHADOW_USER_FAILED', 'Could not create or verify shadow user account', 500, corsHeaders);
        }
        console.log(`[token-exchange] getUserById confirmed user exists despite createUser error`);
      }
    } else {
      console.log(`[token-exchange] Shadow user created successfully: id=${createUserData?.user?.id}`);
    }

    // Upsert profile
    const { error: profileError } = await serviceClient.from('profiles').upsert(
      { user_id: supabaseUserId, contact_email: email || null },
      { onConflict: 'user_id', ignoreDuplicates: true },
    );
    if (profileError) {
      console.error(`[token-exchange] Profile upsert failed: ${profileError.message}`);
      logExchange(serviceClient, kindeSub, supabaseUserId, 'error', 'PROFILE_UPSERT_FAILED');
      return errorResponse('PROFILE_UPSERT_FAILED', 'Could not create user profile', 500, corsHeaders);
    }

    // Upsert user_preferences
    const { error: prefsError } = await serviceClient.from('user_preferences').upsert(
      { user_id: supabaseUserId },
      { onConflict: 'user_id', ignoreDuplicates: true },
    );
    if (prefsError) {
      console.error(`[token-exchange] Preferences upsert failed: ${prefsError.message}`);
      logExchange(serviceClient, kindeSub, supabaseUserId, 'error', 'PROFILE_UPSERT_FAILED');
      return errorResponse('PROFILE_UPSERT_FAILED', 'Could not create user preferences', 500, corsHeaders);
    }

    // 6. Sign Supabase-compatible JWT
    const jwtSecret = Deno.env.get('EXT_SUPABASE_JWT_SECRET');
    if (!jwtSecret) {
      console.error('[token-exchange] EXT_SUPABASE_JWT_SECRET not configured');
      logExchange(serviceClient, kindeSub, supabaseUserId, 'error', 'JWT_SECRET_MISSING');
      return errorResponse('JWT_SECRET_MISSING', 'Server configuration error', 500, corsHeaders);
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
      kinde_sub: kindeSub,
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .sign(secret);

    // 7. Log success
    logExchange(serviceClient, kindeSub, supabaseUserId, 'success');

    // 8. Return the signed JWT
    return new Response(
      JSON.stringify({ supabaseToken, userId: supabaseUserId, expiresAt }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[token-exchange] Unexpected error:', err);
    try {
      const serviceClient = getServiceClient();
      logExchange(serviceClient, kindeSub, supabaseUserId, 'error', 'INTERNAL_ERROR');
    } catch { /* ignore audit failure */ }
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500, corsHeaders);
  }
});
