/**
 * Manage BYOK API keys for the authenticated user.
 *
 * GET    /manage-api-keys        → list keys (masked, never plaintext)
 * POST   /manage-api-keys        → save an already-validated key
 * DELETE /manage-api-keys?id=... → remove one key
 * PATCH  /manage-api-keys        → { byok_enabled: boolean } toggle
 *
 * Keys are AES-GCM encrypted using API_KEY_ENCRYPTION_SECRET before
 * being written to user_api_keys. Only the masked hint is returned.
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/authMiddleware.ts';
import { getServiceClient } from '../_shared/dbClient.ts';
import { encrypt, maskKey } from '../_shared/encryption.ts';
import { SUPPORTED_PROVIDERS } from '../_shared/providers.ts';

import { wrapHandler } from '../_shared/fnLogger.ts';
serve(wrapHandler("manage-api-keys", async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const { userId } = await requireAuth(req);
    const db = getServiceClient();

    // ── GET — list saved keys (masked) ──────────────────────────────────────
    if (req.method === 'GET') {
      const [keysRes, prefsRes] = await Promise.all([
        db.from('user_api_keys')
          .select('id, provider, key_hint, is_active, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        db.from('user_preferences')
          .select('byok_enabled, byok_provider')
          .eq('user_id', userId)
          .maybeSingle(),
      ]);

      return json({
        keys: keysRes.data ?? [],
        byok_enabled: prefsRes.data?.byok_enabled ?? false,
        byok_provider: prefsRes.data?.byok_provider ?? null,
      });
    }

    // ── DELETE — remove one key ──────────────────────────────────────────────
    if (req.method === 'DELETE') {
      // Accept id from body (preferred) or query param
      const url = new URL(req.url);
      let id = url.searchParams.get('id');
      if (!id) {
        const body = await req.json().catch(() => ({}));
        id = (body as { id?: string }).id ?? null;
      }
      if (!id) return json({ error: 'id is required (body or query param)' }, 400);

      const { error } = await db.from('user_api_keys')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
      return json({ ok: true });
    }

    // ── PATCH — toggle byok_enabled (and optionally set byok_provider) ───────
    if (req.method === 'PATCH') {
      const body = await req.json().catch(() => ({}));
      const { byok_enabled, byok_provider } = body as {
        byok_enabled?: boolean;
        byok_provider?: string | null;
      };

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (typeof byok_enabled === 'boolean') updates.byok_enabled = byok_enabled;
      if ('byok_provider' in body) updates.byok_provider = byok_provider ?? null;

      // Upsert preferences row
      const { error } = await db.from('user_preferences')
        .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' });

      if (error) throw error;
      return json({ ok: true });
    }

    // ── POST — save an already-tested key ───────────────────────────────────
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const { provider, key } = body as { provider?: string; key?: string };

      if (!provider || !SUPPORTED_PROVIDERS.includes(provider)) {
        return json({ error: 'Invalid or unsupported provider' }, 400);
      }
      if (!key || key.length < 8) {
        return json({ error: 'key is required' }, 400);
      }

      let encryptedKey: string;
      let hint: string;
      try {
        encryptedKey = await encrypt(key);
        hint = maskKey(key);
      } catch (err) {
        const e = err as Error & { code?: string };
        if (e.code === 'encryption_not_configured') {
          return json({ error: 'encryption_not_configured', message: e.message }, 503);
        }
        throw err;
      }

      // Remove any existing key for this provider (one key per provider per user)
      await db.from('user_api_keys')
        .delete()
        .eq('user_id', userId)
        .eq('provider', provider);

      const { data: inserted, error } = await db.from('user_api_keys')
        .insert({
          user_id: userId,
          provider,
          encrypted_key: encryptedKey,
          key_hint: hint,
          is_active: true,
        })
        .select('id, provider, key_hint, is_active, created_at')
        .single();

      if (error) throw error;
      return json({ ok: true, key: inserted });
    }

    return json({ error: 'Method not allowed' }, 405);
  } catch (err) {
    console.error('[manage-api-keys]', err);
    return json({ error: 'Internal server error', message: (err as Error).message }, 500);
  }
}));
