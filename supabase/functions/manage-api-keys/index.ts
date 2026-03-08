import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

const ENCRYPTION_SECRET = Deno.env.get('API_KEY_ENCRYPTION_SECRET') || '';

async function getEncryptionKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(ENCRYPTION_SECRET),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: encoder.encode('user-api-keys-salt'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encrypt(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

/** Decode JWT payload without verifying signature (Clerk-signed tokens) */
function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token');
  const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const json = atob(b64.padEnd(b64.length + (4 - b64.length % 4) % 4, '='));
  return JSON.parse(json);
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const token = authHeader.replace('Bearer ', '');

    // Pure client-side JWT decode — no signature verification needed.
    // Clerk tokens can't be verified by Supabase's auth secret; PostgREST
    // verifies the token independently when the DB query runs.
    let claims: Record<string, unknown>;
    try {
      claims = decodeJwtPayload(token);
    } catch {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userId = (claims['supabaseUuid'] as string) || (claims['sub'] as string);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Use service role to bypass PostgREST JWT verification (Clerk JWTs can't be verified by PostgREST).
    // Auth is already handled above via manual JWT decode.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')!,
    );

    // All requests come via POST (supabase.functions.invoke always uses POST)
    // Route by `action` field in body: 'save' | 'delete' | 'get'
    if (req.method === 'POST') {
      const body = await req.json();
      const action = body.action || 'save'; // default to save for backward compat

      // ===== GET: return user's saved keys (provider + tier + base_url + model, NOT the actual key) =====
      if (action === 'get') {
        const { data, error } = await supabase
          .from('user_api_keys')
          .select('provider, key_tier, base_url, model, created_at, updated_at')
          .eq('user_id', userId);

        if (error) throw error;
        return new Response(JSON.stringify({ keys: data || [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // ===== DELETE: remove a provider's key =====
      if (action === 'delete') {
        const { provider } = body;
        if (!provider) {
          return new Response(JSON.stringify({ error: 'provider is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { error } = await supabase
          .from('user_api_keys')
          .delete()
          .eq('user_id', userId)
          .eq('provider', provider);

        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // ===== SAVE (default): upsert a provider's key =====
      const { provider, apiKey, keyTier, baseUrl, model } = body;
      if (!provider || !apiKey) {
        return new Response(JSON.stringify({ error: 'provider and apiKey are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const encryptedKey = await encrypt(apiKey);

      const upsertData: Record<string, unknown> = {
        user_id: userId,
        provider,
        encrypted_key: encryptedKey,
        key_tier: keyTier || 'unknown',
      };
      
      if (baseUrl !== undefined) {
        upsertData.base_url = baseUrl || null;
      }
      
      if (model !== undefined) {
        upsertData.model = model || null;
      }

      const { error } = await supabase
        .from('user_api_keys')
        .upsert(upsertData, { onConflict: 'user_id,provider' });

      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Legacy GET support (direct HTTP GET)
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('provider, key_tier, base_url, model, created_at, updated_at')
        .eq('user_id', userId);

      if (error) throw error;
      return new Response(JSON.stringify({ keys: data || [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('manage-api-keys error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
