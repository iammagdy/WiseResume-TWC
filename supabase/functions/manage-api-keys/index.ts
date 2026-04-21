import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, isOriginAllowed, isNativeClient } from '../_shared/cors.ts';
import { requireAuth, authErrorResponse } from '../_shared/authMiddleware.ts';
import { validateBaseUrl } from '../_shared/urlSafety.ts';
import { isAllowedOpenRouterModel } from '../_shared/aiProviders.ts';

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

// AI-4 (Task #24): the curated OpenRouter slug list, the auto sentinel,
// and the validator now live in `_shared/aiProviders.ts` (backed by
// `aiProviders.json`). Server-side enforcement is unchanged: we reject
// any save / update_model write for provider==='openrouter' whose model
// is not in the shared allow-list. Defense-in-depth against a stale or
// tampered client sending a decommissioned slug.

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
    // Route by `action` field in body: 'save' | 'delete' | 'get' | 'update_model'
    if (req.method === 'POST') {
      const body = await req.json();
      const action = body.action || 'save'; // default to save for backward compat

      // AI-4 (Task #24): Origin / CSRF defence on write actions.
      //
      // The endpoint already requires a valid Supabase JWT (requireAuth above),
      // but JWT-only auth is insufficient against a logged-in user being lured
      // to a different origin that holds their session — that origin can
      // invoke this function via `supabase.functions.invoke` and rotate or
      // delete keys. We therefore additionally require an in-allow-list
      // Origin for browser write actions, with a documented native fallback.
      //
      // Matrix:
      //   Action               Browser caller          Native (Capacitor) caller
      //   ──────────────────── ─────────────────────── ─────────────────────────
      //   get                  No Origin check         No Origin check
      //                        (read-only; no CSRF
      //                        write surface)
      //   save / delete /      Origin MUST be in the   Origin missing/'null'
      //   update_model         CORS allow-list         AND x-client-info MUST
      //                                                match NATIVE_CLIENT_INFO
      //                                                (env, comma-separated)
      //
      // The native fallback exists because Capacitor webviews on iOS/Android
      // do not consistently send a meaningful Origin header. Native callers
      // SHOULD set a custom `x-client-info` (e.g. via the Supabase client
      // headers option) and the platform admin SHOULD configure
      // NATIVE_CLIENT_INFO with the exact value(s) that callers send.
      // If NATIVE_CLIENT_INFO is unset, the native path is closed (fail-safe).
      const isWriteAction = action === 'save' || action === 'delete' || action === 'update_model';
      if (isWriteAction) {
        const originHeader = req.headers.get('origin');
        let originOk = false;
        if (isNativeClient(originHeader)) {
          // Native fallback: no Origin → require known x-client-info value.
          const allowedClients = (Deno.env.get('NATIVE_CLIENT_INFO') || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
          const clientInfo = req.headers.get('x-client-info') || '';
          originOk = allowedClients.length > 0 && allowedClients.includes(clientInfo);
        } else {
          originOk = isOriginAllowed(originHeader);
        }
        if (!originOk) {
          console.warn('manage-api-keys: rejecting write — Origin not allowed', {
            action,
            origin: originHeader,
            hasClientInfo: !!req.headers.get('x-client-info'),
          });
          return new Response(
            JSON.stringify({ error: 'Origin not allowed' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      }

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
        const normalizedBaseUrl = normalizeOptionalString(resolvedBaseUrl);
        if (!normalizedBaseUrl) {
          return new Response(
            JSON.stringify({ error: 'Ollama base URL is required.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        // AI-1: validate Ollama base URL to block SSRF / cloud metadata /
        // private IP exfil before we ever store a row.
        const safety = await validateBaseUrl(normalizedBaseUrl);
        if (!safety.ok) {
          return new Response(
            JSON.stringify({ error: `Invalid Ollama base URL: ${safety.message}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        upsertData.base_url = safety.url;
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
