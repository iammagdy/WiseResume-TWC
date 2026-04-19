import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireAuth, authErrorResponse } from "../_shared/authMiddleware.ts";
import { checkUserRateLimit } from "../_shared/userRateLimiter.ts";
import { checkAndDeductCredit, refundCredit } from "../_shared/creditUtils.ts";
import { logger } from "../_shared/logger.ts";
const log = logger('elevenlabs-scribe-token');


// Mirrors the AES-GCM decrypt from manage-api-keys/index.ts and aiClient.ts
const ENCRYPTION_SECRET = Deno.env.get('API_KEY_ENCRYPTION_SECRET');
if (!ENCRYPTION_SECRET) throw new Error('API_KEY_ENCRYPTION_SECRET env var is required');

/** Resolves the correct PBKDF2 salt based on key_version and userId — mirrors aiClient.ts resolveKeySalt. */
function resolveKeySalt(keyVersion: number | null | undefined, userId: string): string {
  if (keyVersion === 2) return `user-api-keys-salt-v2-${userId}`;
  return 'user-api-keys-salt';
}

async function deriveDecryptionKey(salt: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(ENCRYPTION_SECRET),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
}

async function decrypt(encoded: string, salt: string): Promise<string> {
  const combined = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const key = await deriveDecryptionKey(salt);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return new TextDecoder().decode(decrypted);
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate via shared middleware (decodes JWT sub, returns service-role client)
    let userId: string;
    let client: any;
    try {
      const auth = await requireAuth(req);
      userId = auth.userId;
      client = auth.client;
    } catch (authErr) {
      return authErrorResponse(authErr, req.headers.get('origin'));
    }

    // Per-user rate limit: 10 token vends per 60 seconds to prevent abuse
    const rateCheck = await checkUserRateLimit(userId, 'elevenlabs_scribe_token', 10, 60);
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve API key — strict BYOK mode:
    // If the user has a stored ElevenLabs key, use it exclusively.
    // If decryption fails on their stored key, return an error (never fall back silently).
    // Only use the platform key when the user has NO stored ElevenLabs key at all.
    let apiKey: string | undefined;
    let hasByokKey = false;

    const { data: keyRow } = await client
      .from('user_api_keys')
      .select('encrypted_key, key_version')
      .eq('user_id', userId)
      .eq('provider', 'elevenlabs')
      .maybeSingle();

    if (keyRow?.encrypted_key) {
      hasByokKey = true;
      try {
        const salt = resolveKeySalt(keyRow.key_version, userId);
        apiKey = await decrypt(keyRow.encrypted_key, salt);
      } catch (decryptErr) {
        console.error('Failed to decrypt user ElevenLabs key:', decryptErr);
        // Strict BYOK mode: key exists but is unreadable — refuse rather than silently fall back
        return new Response(
          JSON.stringify({ error: 'Failed to read your ElevenLabs API key. Please re-add it in AI Settings.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    let creditCheck: Awaited<ReturnType<typeof checkAndDeductCredit>> | undefined;
    if (!hasByokKey) {
      // No BYOK key stored — use platform key and enforce credits
      creditCheck = await checkAndDeductCredit(userId);
      if (!creditCheck.hasCredits) {
        return new Response(
          JSON.stringify({ error: 'Daily AI credit limit reached. Upgrade your plan or add your own ElevenLabs API key.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      apiKey = Deno.env.get('ELEVENLABS_API_KEY');
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'No ElevenLabs API key configured. Please add your own key in AI Settings.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let fetchResponse;
    try {
      fetchResponse = await fetch(
        'https://api.elevenlabs.io/v1/single-use-token/realtime_scribe',
        {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
          },
        }
      );
    } catch (fetchErr) {
      if (creditCheck) await refundCredit(userId, creditCheck, 1);
      throw fetchErr;
    }

    if (!fetchResponse.ok) {
      const errorBody = await fetchResponse.text();
      console.error(`ElevenLabs token request failed [${fetchResponse.status}]: ${errorBody}`);
      if (creditCheck) await refundCredit(userId, creditCheck, 1);
      return new Response(
        JSON.stringify({ error: `Failed to get scribe token: ${fetchResponse.status}` }),
        { status: fetchResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await fetchResponse.json();

    return new Response(
      JSON.stringify({ token: data.token }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    log.error('Unhandled error', error);
    return new Response(
      JSON.stringify({ error: 'internal', message: 'Something went wrong. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
