import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAuth, authErrorResponse } from '../_shared/authMiddleware.ts';

const ENCRYPTION_SECRET = Deno.env.get('API_KEY_ENCRYPTION_SECRET');
if (!ENCRYPTION_SECRET) throw new Error('API_KEY_ENCRYPTION_SECRET env var is required');

/**
 * Derives an AES-GCM key using PBKDF2.
 *
 * key_version=1 (legacy): salt is the static string 'user-api-keys-salt'
 * key_version=2 (current): salt is 'user-api-keys-salt-v2-<userId>' — a leaked
 *   master secret alone is insufficient to decrypt any user's keys without their
 *   specific user ID.
 */
async function deriveKey(userId?: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(ENCRYPTION_SECRET),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // Per-user salt: concatenate a fixed prefix with the userId so each user's key
  // requires a distinct secret derivation even with the same master secret.
  const saltString = userId
    ? `user-api-keys-salt-v2-${userId}`
    : 'user-api-keys-salt'; // legacy v1 fallback (no userId)

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: encoder.encode(saltString), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encrypt(plaintext: string, userId: string): Promise<string> {
  const key = await deriveKey(userId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

/**
 * Curated allow-list of OpenRouter slugs the WiseResume managed account is
 * permitted to use, plus the Auto sentinel. **Mirror of OPENROUTER_CURATED_MODELS
 * in src/lib/aiDefaults.ts and supabase/functions/_shared/aiClient.ts** —
 * keep these three lists in lockstep. Server-side enforcement (Task #24): we
 * reject any save / update_model write for provider==='openrouter' whose model
 * is not in this list. Defense-in-depth against a stale or tampered client
 * sending a decommissioned slug.
 */
const OPENROUTER_CURATED_MODELS: readonly string[] = [
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'minimax/minimax-m2.5:free',
  'liquid/lfm-2.5-1.2b-thinking:free',
  'google/gemma-4-26b-a4b-it:free',
  'openrouter/elephant-alpha',
  'liquid/lfm-2.5-1.2b-instruct:free',
  'openai/gpt-oss-120b:free',
];
const OPENROUTER_AUTO_SENTINEL = '__auto__';

function isAllowedOpenRouterModel(model: string | null): boolean {
  if (!model) return false;
  if (model === OPENROUTER_AUTO_SENTINEL) return true;
  return OPENROUTER_CURATED_MODELS.includes(model);
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let userId: string;
    let supabase: any;
    try {
      const auth = await requireAuth(req);
      userId = auth.userId;
      supabase = auth.client;
    } catch (authErr) {
      return authErrorResponse(authErr, req.headers.get('origin'));
    }

    // All requests come via POST (supabase.functions.invoke always uses POST)
    // Route by `action` field in body: 'save' | 'delete' | 'get'
    if (req.method === 'POST') {
      const body = await req.json();
      const action = body.action || 'save'; // default to save for backward compat

      // ===== GET: return user's saved keys (provider + tier, NOT the actual key) =====
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

      // ===== UPDATE_MODEL: update only the model field without touching the encrypted key =====
      if (action === 'update_model') {
        const { provider, model } = body;
        if (!provider) {
          return new Response(JSON.stringify({ error: 'provider is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const normalizedModel = normalizeOptionalString(model);
        // Task #24: server-side OpenRouter allow-list enforcement.
        if (provider === 'openrouter' && normalizedModel && !isAllowedOpenRouterModel(normalizedModel)) {
          return new Response(
            JSON.stringify({ error: 'Model is not in the OpenRouter curated allow-list' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        const { error } = await supabase
          .from('user_api_keys')
          .update({ model: normalizedModel })
          .eq('user_id', userId)
          .eq('provider', provider);

        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // ===== SAVE (default): upsert a provider's key =====
      const { provider, apiKey, keyTier, baseUrl, base_url, model } = body;
      const keyTierTrimmed = normalizeOptionalString(keyTier) || '';
      const tierFallbackTrimmed = normalizeOptionalString(body.tier) || '';
      const normalizedKeyTier = keyTierTrimmed || tierFallbackTrimmed || 'unknown';
      const normalizedModel = normalizeOptionalString(model);
      if (!provider || !apiKey) {
        return new Response(JSON.stringify({ error: 'provider and apiKey are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      // Task #24: server-side OpenRouter allow-list enforcement.
      if (provider === 'openrouter' && normalizedModel && !isAllowedOpenRouterModel(normalizedModel)) {
        return new Response(
          JSON.stringify({ error: 'Model is not in the OpenRouter curated allow-list' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // Encrypt with per-user salt (key_version=2)
      const encryptedKey = await encrypt(apiKey, userId);

      const upsertData: Record<string, unknown> = {
        user_id: userId,
        provider,
        encrypted_key: encryptedKey,
        key_tier: normalizedKeyTier,
        key_version: 2,
      };
      if (provider === 'ollama') {
        const resolvedBaseUrl = baseUrl || base_url;
        upsertData.base_url = normalizeOptionalString(resolvedBaseUrl);
        upsertData.model = normalizedModel;
      } else {
        // All other providers: save model if provided, clear base_url
        upsertData.base_url = null;
        upsertData.model = normalizedModel;
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
