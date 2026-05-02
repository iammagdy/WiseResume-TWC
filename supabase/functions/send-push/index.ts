import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/dbClient.ts';
import { wrapHandler } from '../_shared/fnLogger.ts';

interface PushPayload {
  user_ids: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  category?: 'interview' | 'application' | 'resume' | 'account' | 'broadcast';
}

/**
 * Server-to-server endpoint for fanning out push notifications to one
 * or more users. Authenticated via the shared `EDGE_INTERNAL_TOKEN`
 * secret (NOT a user JWT) since it's invoked by other edge functions
 * (cron jobs, webhooks, admin tools) — no `verify_jwt` is needed.
 *
 * Honors the per-category notification preference recorded in the
 * `device_push_tokens.notification_prefs` JSON column so users always
 * get the channels they opted into and never get the ones they didn't.
 */
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

serve(wrapHandler('send-push', async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const internalToken = Deno.env.get('EDGE_INTERNAL_TOKEN');
  const provided = req.headers.get('x-internal-token');
  if (!internalToken || provided !== internalToken) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let payload: PushPayload;
  try {
    payload = (await req.json()) as PushPayload;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!Array.isArray(payload.user_ids) || payload.user_ids.length === 0) {
    return new Response(JSON.stringify({ error: 'user_ids must be a non-empty array' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const client = getServiceClient();
  const { data: tokens, error } = await client
    .from('device_push_tokens')
    .select('token, notification_prefs')
    .in('user_id', payload.user_ids)
    .is('revoked_at', null);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const category = payload.category ?? 'broadcast';
  const messages = (tokens ?? [])
    .filter((row) => {
      const prefs = (row.notification_prefs ?? {}) as Record<string, boolean>;
      return prefs[category] !== false;
    })
    .map((row) => ({
      to: row.token,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      channelId: 'default',
    }));

  if (messages.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0 }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const expoRes = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  const expoBody = await expoRes.json().catch(() => null);
  return new Response(JSON.stringify({ ok: expoRes.ok, sent: messages.length, expo: expoBody }), {
    status: expoRes.ok ? 200 : 502,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}));
