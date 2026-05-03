/**
 * admin-get-identity — Resolve a Supabase user_id (or email) to a unified
 * identity record across Supabase Auth + Kinde Management API.
 *
 * Trigger: called from the DevKit "User detail" pane and from
 *   `admin-merge-identity` when the operator needs a side-by-side view of
 *   the auth/Kinde state for one user.
 * Auth: ADMIN ONLY (`requireAdminAuth` — DevKit session token).
 * Dispatch contract: POST `{user_id?, email?}` (one is required). Returns
 *   `{success:true, identity:{supabase, kinde}}` on success. The Kinde
 *   lookup degrades gracefully — if `KINDE_M2M_CLIENT_ID/SECRET` are
 *   unset or the API call fails, `identity.kinde` is `null` and the
 *   response still succeeds (200) so the UI can render the Supabase side.
 */
import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

import { wrapHandler } from '../_shared/fnLogger.ts';
/**
 * Fetch a Kinde Management API access token using the M2M client credentials.
 * Returns null (does not throw) when credentials are missing or the request fails,
 * so the caller can degrade gracefully.
 */
async function getKindeM2MToken(
  kindeDomain: string,
  clientId: string,
  clientSecret: string,
): Promise<string | null> {
  try {
    const base = kindeDomain.startsWith('http') ? kindeDomain : `https://${kindeDomain}.kinde.com`;
    const res = await fetch(`${base}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        audience: `${base}/api`,
      }).toString(),
    });
    if (!res.ok) return null;
    const json = await res.json() as { access_token?: string };
    return json.access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetch a single Kinde user's real email via the Management API.
 * Returns null on any failure so the identity section degrades gracefully.
 */
async function fetchKindeUserEmail(
  kindeDomain: string,
  accessToken: string,
  kindeSub: string,
): Promise<string | null> {
  try {
    const base = kindeDomain.startsWith('http') ? kindeDomain : `https://${kindeDomain}.kinde.com`;
    const res = await fetch(`${base}/api/v1/user?id=${encodeURIComponent(kindeSub)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const json = await res.json() as { preferred_email?: string; email?: string };
    return json.preferred_email ?? json.email ?? null;
  } catch {
    return null;
  }
}

Deno.serve(wrapHandler("admin-get-identity", async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { target_user_id } = body as { target_user_id?: string };

    try {
      await requireAdminAuth(req);
    } catch (authErr) {
      if (authErr instanceof Response) return authErr;
      throw authErr;
    }

    if (!target_user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'target_user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getServiceClient();

    // Fetch auth.users record — includes email, created_at, last_sign_in_at
    const { data: authData } = await supabase.auth.admin.getUserById(target_user_id);
    const authEmail = authData?.user?.email ?? null;
    const isCollision = (authEmail ?? '').endsWith('@collision.kinde.placeholder') ||
                        (authEmail ?? '').endsWith('@kinde.placeholder');
    const signedUpAt = authData?.user?.created_at ?? null;
    const lastSignInAt = authData?.user?.last_sign_in_at ?? null;

    // Fetch profile contact_email
    const { data: profileData } = await supabase
      .from('profiles')
      .select('contact_email, full_name, avatar_url')
      .eq('user_id', target_user_id)
      .maybeSingle();

    const contactEmail = (profileData as Record<string, unknown> | null)?.contact_email as string | null ?? null;

    // Fetch most recent kinde_sub from token_exchanges
    const { data: exchangeData } = await supabase
      .from('token_exchanges')
      .select('kinde_sub, created_at, status')
      .eq('user_id', target_user_id)
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const kindeSub = (exchangeData as Record<string, unknown> | null)?.kinde_sub as string | null ?? null;
    const lastExchangeAt = (exchangeData as Record<string, unknown> | null)?.created_at as string | null ?? null;

    // Attempt Kinde Management API email lookup when:
    //   • the auth email is a placeholder (most common case), OR contact_email is blank
    //   • AND we have a kinde_sub to query with
    //   • AND all three M2M env vars are present
    let kindeEmail: string | null = null;
    let kindeEmailStatus: 'found' | 'lookup_failed' | 'not_needed' | 'credentials_missing' = 'not_needed';
    const needsKindeLookup = kindeSub && (isCollision || !contactEmail);
    if (needsKindeLookup) {
      const kindeDomain = Deno.env.get('KINDE_DOMAIN')?.trim();
      const m2mClientId = Deno.env.get('KINDE_M2M_CLIENT_ID')?.trim();
      const m2mClientSecret = Deno.env.get('KINDE_M2M_CLIENT_SECRET')?.trim();
      if (kindeDomain && m2mClientId && m2mClientSecret) {
        const token = await getKindeM2MToken(kindeDomain, m2mClientId, m2mClientSecret);
        if (token) {
          kindeEmail = await fetchKindeUserEmail(kindeDomain, token, kindeSub);
          kindeEmailStatus = kindeEmail !== null ? 'found' : 'lookup_failed';
        } else {
          kindeEmailStatus = 'lookup_failed';
        }
      } else {
        kindeEmailStatus = 'credentials_missing';
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: target_user_id,
        auth_email: authEmail,
        contact_email: contactEmail,
        kinde_sub: kindeSub,
        kinde_email: kindeEmail,
        kinde_email_status: kindeEmailStatus,
        last_exchange_at: lastExchangeAt,
        signed_up_at: signedUpAt,
        last_sign_in_at: lastSignInAt,
        is_collision: isCollision,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[admin-get-identity] Unexpected error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
