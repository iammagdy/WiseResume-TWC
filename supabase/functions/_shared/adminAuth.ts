/**
 * Shared admin authentication middleware for edge functions.
 * Verifies: (1) shared password, (2) caller JWT, (3) caller email in ADMIN_EMAILS allowlist.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

/**
 * Verifies admin identity by checking:
 * 1. The provided password against DEV_KIT_PASSWORD env var
 * 2. The Bearer JWT from the Authorization header
 * 3. The caller's email against the ADMIN_EMAILS allowlist
 *
 * @returns The verified caller email on success
 * @throws A Response object with appropriate HTTP status on any failure
 */
export async function requireAdminAuth(req: Request, password: string): Promise<string> {
  const SECRET_PASSWORD = Deno.env.get('DEV_KIT_PASSWORD');

  if (!SECRET_PASSWORD) {
    throw new Response(
      JSON.stringify({ success: false, error: 'Admin functions are not configured' }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!password || password !== SECRET_PASSWORD) {
    throw new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const ADMIN_EMAILS = Deno.env.get('ADMIN_EMAILS');
  const allowed = (ADMIN_EMAILS ?? '')
    .split(',')
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);

  if (allowed.length === 0) {
    throw new Response(
      JSON.stringify({
        success: false,
        error: 'ADMIN_EMAILS is not configured. Set it in Supabase Edge Function Secrets.',
      }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Response(
      JSON.stringify({ success: false, error: 'Authorization header with Bearer token required' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const callerEmail = user?.email ?? null;

  if (!callerEmail || !allowed.includes(callerEmail.toLowerCase())) {
    throw new Response(
      JSON.stringify({ success: false, error: 'Forbidden: email not in admin allowlist' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return callerEmail;
}
