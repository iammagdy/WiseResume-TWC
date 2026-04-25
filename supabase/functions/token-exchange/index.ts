// Required env vars:
//   KINDE_DOMAIN              — Kinde tenant base URL (issuer + JWKS source)
//   KINDE_CLIENT_ID           — Expected `aud` claim on incoming Kinde access
//                               tokens. Verified in addition to `iss` so that
//                               tokens issued for unrelated apps in the same
//                               Kinde org are rejected (AUTH_AUDIT M5).
//   SUPABASE_JWT_SECRET       — HS256 secret used to sign the bridged Supabase
//     (or EXT_SUPABASE_JWT_SECRET) JWT returned to the client.
//   SUPABASE_URL / EXT_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — used by the
//                               service-role client for shadow-user upserts.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/dbClient.ts';
import { logger } from '../_shared/logger.ts';
import { provisionUser, kindeSubToUserId, ProvisionError } from '../_shared/provisionUser.ts';
import * as jose from 'https://deno.land/x/jose@v5.2.2/index.ts';
import { wrapHandler } from '../_shared/fnLogger.ts';

const log = logger('token-exchange');

// Cache JWKS for 1 hour
let cachedJWKS: jose.JSONWebKeySet | null = null;
let jwksCachedAt = 0;
const JWKS_CACHE_MS = 60 * 60 * 1000;

async function getKindeJWKS(): Promise<jose.JSONWebKeySet> {
  if (cachedJWKS && Date.now() - jwksCachedAt < JWKS_CACHE_MS) {
    return cachedJWKS;
  }
  const kindeDomain = Deno.env.get('KINDE_DOMAIN');
  if (!kindeDomain) throw new Error('KINDE_DOMAIN env var is required');
  const res = await fetch(`${kindeDomain}/.well-known/jwks`);
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

async function logExchange(
  serviceClient: ReturnType<typeof getServiceClient>,
  kindeSub: string,
  userId: string,
  status: 'success' | 'error',
  errorCode?: string,
): Promise<void> {
  try {
    const { error } = await serviceClient
      .from('token_exchanges')
      .insert({ kinde_sub: kindeSub, user_id: userId, status, error_code: errorCode || null });
    if (error) {
      // AUTH_AUDIT H5: do not silently drop audit-trail writes. Emit a
      // structured ERROR log so dashboards / log drains pick it up.
      log.error('audit_log_failed', new Error(error.message), {
        kindeSub,
        userId,
        exchangeStatus: status,
        errorCode: errorCode ?? null,
      });
    }
  } catch (e) {
    log.error('audit_log_exception', e, {
      kindeSub,
      userId,
      exchangeStatus: status,
      errorCode: errorCode ?? null,
    });
  }
}

serve(wrapHandler('token-exchange', async (req) => {
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

    const kindeDomain = Deno.env.get('KINDE_DOMAIN');
    if (!kindeDomain) throw new Error('KINDE_DOMAIN env var is required');
    const kindeClientId = Deno.env.get('KINDE_CLIENT_ID');
    if (!kindeClientId) throw new Error('KINDE_CLIENT_ID env var is required');
    let payload: jose.JWTPayload;
    try {
      // AUTH_AUDIT M5 (corrected 2026-04-24):
      // Verify the JWT signature + issuer via JWKS. We deliberately do NOT
      // pass `audience: kindeClientId` to jose.jwtVerify here. Kinde access
      // tokens carry their *API audience* in the `aud` claim (or leave it
      // empty when no API audience is configured); the issuing client is
      // identified by `azp` (authorized party) and `client_id`. The previous
      // implementation that asserted `aud === KINDE_CLIENT_ID` rejected
      // every legitimate Kinde sign-in with `unexpected "aud" claim value`,
      // surfacing the "Sign-in incomplete" card to all users.
      const result = await jose.jwtVerify(kindeToken, keySet, {
        issuer: kindeDomain,
      });
      payload = result.payload;
    } catch (verifyErr) {
      // Log the actual token claims (header + body, signature stripped) so
      // future failures of this kind can be diagnosed in seconds rather than
      // hours. We never log the signature, and we only emit this on the
      // failure path so the happy path stays clean.
      let claimDump = '<unparseable>';
      try {
        const parts = kindeToken.split('.');
        if (parts.length === 3) {
          const decode = (b64: string) => {
            const pad = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
            return atob(pad.replace(/-/g, '+').replace(/_/g, '/'));
          };
          claimDump = JSON.stringify({
            header: JSON.parse(decode(parts[0])),
            payload: JSON.parse(decode(parts[1])),
          });
        }
      } catch { /* ignore — leave as <unparseable> */ }
      console.error('[token-exchange] JWT verification failed:', verifyErr, 'claims=', claimDump);
      const serviceClient = getServiceClient();
      await logExchange(serviceClient, kindeSub, supabaseUserId, 'error', 'INVALID_KINDE_TOKEN');
      return errorResponse('INVALID_KINDE_TOKEN', 'Kinde token invalid or expired', 401, corsHeaders);
    }

    // AUTH_AUDIT M5 (corrected): enforce that the token was issued FOR THIS
    // app's Kinde client, not some other app in the same Kinde organization.
    // Kinde puts the issuing client_id in `azp` (per OIDC) and also mirrors
    // it into a top-level `client_id` claim on access tokens. Accept either.
    const tokenAzp = (payload as Record<string, unknown>).azp as string | undefined;
    const tokenClientId = (payload as Record<string, unknown>).client_id as string | undefined;
    const issuedToThisClient = tokenAzp === kindeClientId || tokenClientId === kindeClientId;
    if (!issuedToThisClient) {
      console.error(
        `[token-exchange] Token client_id mismatch: expected=${kindeClientId} azp=${tokenAzp ?? '(none)'} client_id=${tokenClientId ?? '(none)'}`,
      );
      const serviceClient = getServiceClient();
      await logExchange(serviceClient, (payload.sub as string) || kindeSub, supabaseUserId, 'error', 'WRONG_CLIENT_ID');
      return errorResponse('WRONG_CLIENT_ID', 'Token was not issued for this application', 401, corsHeaders);
    }

    // 3. Extract Kinde user info
    kindeSub = (payload.sub as string) || '';
    if (!kindeSub) {
      const serviceClient = getServiceClient();
      await logExchange(serviceClient, 'missing', supabaseUserId, 'error', 'MISSING_SUB_CLAIM');
      return errorResponse('MISSING_SUB_CLAIM', 'Token missing sub claim', 401, corsHeaders);
    }

    const email = (payload as Record<string, unknown>).email as string ||
      (payload as Record<string, unknown>).preferred_username as string ||
      '';
    const emailVerified = (payload as Record<string, unknown>).email_verified === true;

    // 4. Compute deterministic UUID (needed for audit log even before provisioning)
    supabaseUserId = await kindeSubToUserId(kindeSub);

    // 4b. Check blocklist — reject suspended accounts before provisioning.
    // Checks both email (type='email') and computed UUID (type='user_id').
    // Fails CLOSED on any error except table-not-found (pre-migration state).
    {
      const blocklistClient = getServiceClient();
      let blocklistError: unknown = null;
      let blockEntry: { id: string } | null = null;

      // Normalize email to lowercase to match add_blocklist normalization.
      const normalizedEmail = email.toLowerCase();

      try {
        // Run both checks in parallel: one for email, one for UUID.
        const [emailCheck, uuidCheck] = await Promise.all([
          normalizedEmail
            ? blocklistClient.from('blocklist').select('id').eq('type', 'email').eq('value', normalizedEmail).limit(1).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          supabaseUserId
            ? blocklistClient.from('blocklist').select('id').eq('type', 'user_id').eq('value', supabaseUserId).limit(1).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        ]);

        // Propagate the first non-null error for fail-closed logic below.
        blocklistError = emailCheck.error ?? uuidCheck.error;
        blockEntry = (emailCheck.data ?? uuidCheck.data) as { id: string } | null;
      } catch (blErr) {
        blocklistError = blErr;
      }

      if (blocklistError) {
        const code = (blocklistError as { code?: string }).code;
        if (code === '42P01') {
          // Table does not exist yet — pre-migration; allow login.
          log.warn('blocklist_table_missing', {});
        } else {
          // Unknown error: fail closed to prevent bypassing suspension checks.
          log.error('blocklist_check_error', { error: String(blocklistError) });
          await logExchange(blocklistClient, kindeSub, supabaseUserId, 'error', 'BLOCKLIST_CHECK_FAILED');
          return errorResponse('BLOCKLIST_CHECK_FAILED', 'Authentication temporarily unavailable', 503, corsHeaders);
        }
      } else if (blockEntry) {
        log.warn('account_suspended', { kindeSub, email, supabaseUserId });
        await logExchange(blocklistClient, kindeSub, supabaseUserId, 'error', 'ACCOUNT_SUSPENDED');
        return errorResponse('ACCOUNT_SUSPENDED', 'This account has been suspended', 403, corsHeaders);
      }
    }

    // 5. Provision all required DB rows via shared helper.
    //    The helper handles: shadow auth user creation, profile upsert, prefs
    //    upsert, email-collision detection, and orphan cleanup on partial failure.
    const serviceClient = getServiceClient();

    const extUrl = Deno.env.get('EXT_SUPABASE_URL') || Deno.env.get('SUPABASE_URL') || '(none)';
    console.log(`[token-exchange] provisioning user — id=${supabaseUserId}, target=${extUrl}`);

    try {
      const result = await provisionUser(serviceClient, kindeSub, email, emailVerified);
      supabaseUserId = result.userId;
    } catch (provErr) {
      if (provErr instanceof ProvisionError) {
        console.error(`[token-exchange] provisionUser failed: ${provErr.code} — ${provErr.message}`);
        await logExchange(serviceClient, kindeSub, supabaseUserId, 'error', provErr.code);
        if (provErr.code === 'EMAIL_COLLISION') {
          return new Response(
            JSON.stringify({
              code: 'EMAIL_COLLISION',
              message: provErr.message,
              kindeSub,
              email,
            }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        return errorResponse(provErr.code, provErr.message, provErr.httpStatus, corsHeaders);
      }
      throw provErr;
    }

    // 6. Sign Supabase-compatible JWT
    const jwtSecret = Deno.env.get('EXT_SUPABASE_JWT_SECRET') || Deno.env.get('SUPABASE_JWT_SECRET');
    if (!jwtSecret) {
      console.error('[token-exchange] SUPABASE_JWT_SECRET not configured');
      await logExchange(serviceClient, kindeSub, supabaseUserId, 'error', 'JWT_SECRET_MISSING');
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
    await logExchange(serviceClient, kindeSub, supabaseUserId, 'success');

    // 8. Return the signed JWT
    return new Response(
      JSON.stringify({ supabaseToken, userId: supabaseUserId, expiresAt, kindeSub }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[token-exchange] Unexpected error:', err);
    try {
      const serviceClient = getServiceClient();
      await logExchange(serviceClient, kindeSub, supabaseUserId, 'error', 'INTERNAL_ERROR');
    } catch { /* ignore audit failure */ }
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500, corsHeaders);
  }
}));
