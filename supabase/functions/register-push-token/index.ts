import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAuth, AuthError } from '../_shared/authMiddleware.ts';
import { wrapHandler } from '../_shared/fnLogger.ts';

interface RegisterPayload {
  token: string;
  platform: 'ios' | 'android' | 'web';
  app_version?: string;
  device_id?: string;
  locale?: string;
}

/**
 * Stores an Expo / FCM / APNs push token for the calling user.
 * Tokens are upserted on (user_id, token) so re-registration after a
 * cold start is idempotent. Stale rows are pruned by the
 * `mobile-cleanup` cron job (defined in the migration).
 */
serve(wrapHandler('register-push-token', async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { userId, client } = await requireAuth(req);
    const body = (await req.json().catch(() => ({}))) as Partial<RegisterPayload>;

    if (!body.token || typeof body.token !== 'string') {
      return new Response(JSON.stringify({ error: 'token is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!body.platform || !['ios', 'android', 'web'].includes(body.platform)) {
      return new Response(JSON.stringify({ error: 'platform must be ios|android|web' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error } = await client.from('device_push_tokens').upsert(
      {
        user_id: userId,
        token: body.token,
        platform: body.platform,
        app_version: body.app_version ?? null,
        device_id: body.device_id ?? null,
        locale: body.locale ?? null,
        last_seen_at: new Date().toISOString(),
        revoked_at: null,
      },
      { onConflict: 'user_id,token' },
    );

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: err.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}));
