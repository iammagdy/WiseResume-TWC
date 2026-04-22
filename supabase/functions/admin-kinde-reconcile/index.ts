/**
 * admin-kinde-reconcile — Backfill DB records for existing Kinde users.
 *
 * Auth posture: ADMIN ONLY (requireAdminAuth — DevKit session token).
 *
 * Required env vars:
 *   DEV_KIT_PASSWORD          — DevKit admin session secret (existing).
 *   ADMIN_EMAILS              — Comma-separated allowlist (existing).
 *   KINDE_DOMAIN              — Kinde tenant base URL (e.g. https://acme.kinde.com).
 *   KINDE_M2M_CLIENT_ID       — Client ID of a Kinde M2M app with "read:users" scope.
 *   KINDE_M2M_CLIENT_SECRET   — Client secret for the M2M app above.
 *
 * How to set up the Kinde M2M app:
 *   1. In the Kinde dashboard go to Applications → Add application → Machine to Machine.
 *   2. Grant the "read:users" permission on the Management API.
 *   3. Copy Client ID and Client Secret; save them as Supabase edge function secrets
 *      KINDE_M2M_CLIENT_ID and KINDE_M2M_CLIENT_SECRET.
 *
 * What it does:
 *   Pages through all users in the Kinde Management API, computes the
 *   deterministic Supabase UUID for each, checks whether a public.profiles
 *   row exists, and calls provisionUser() for any that are missing. Returns
 *   a JSON summary: { found, already_provisioned, newly_provisioned, errors }.
 *
 * Usage (one-time backfill):
 *   POST /functions/v1/admin-kinde-reconcile
 *   Authorization: Bearer <devkit-session-token>
 *
 * Optional body params:
 *   { "dry_run": true }   — check and report without writing any rows.
 *   { "page_size": 100 }  — Kinde users per page (default 100, max 100).
 */

import { getCorsHeaders } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { provisionUser, kindeSubToUserId, ProvisionError } from '../_shared/provisionUser.ts';

function json(data: unknown, status = 200, corsHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Obtain a Kinde Management API access token via client_credentials flow. */
async function getKindeManagementToken(
  kindeDomain: string,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const res = await fetch(`${kindeDomain}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      audience: `${kindeDomain}/api`,
    }).toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to get Kinde management token: ${res.status} ${text}`);
  }
  const data = await res.json() as { access_token: string };
  if (!data.access_token) throw new Error('Kinde token response missing access_token');
  return data.access_token;
}

type KindeUser = {
  id: string;
  email?: string;
  is_password_reset_requested?: boolean;
  is_suspended?: boolean;
  email_verified?: boolean;
};

/** Fetch one page of users from the Kinde Management API. */
async function fetchKindeUsersPage(
  kindeDomain: string,
  accessToken: string,
  nextToken?: string,
  pageSize = 100,
): Promise<{ users: KindeUser[]; next_token?: string; total_count?: number }> {
  const url = new URL(`${kindeDomain}/api/v1/users`);
  url.searchParams.set('page_size', String(Math.min(pageSize, 100)));
  if (nextToken) url.searchParams.set('next_token', nextToken);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Kinde list-users failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<{ users: KindeUser[]; next_token?: string; total_count?: number }>;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Admin auth — throws a Response on failure.
  try {
    await requireAdminAuth(req, corsHeaders);
  } catch (authErr) {
    if (authErr instanceof Response) return authErr;
    throw authErr;
  }

  // Parse optional body params.
  let dryRun = false;
  let pageSize = 100;
  try {
    const body = await req.json() as { dry_run?: boolean; page_size?: number };
    dryRun = body.dry_run === true;
    pageSize = Math.min(Math.max(1, Number(body.page_size) || 100), 100);
  } catch { /* no body / not JSON — use defaults */ }

  // Validate required env vars for Kinde Management API.
  const kindeDomain = Deno.env.get('KINDE_DOMAIN')?.trim();
  const m2mClientId = Deno.env.get('KINDE_M2M_CLIENT_ID')?.trim();
  const m2mClientSecret = Deno.env.get('KINDE_M2M_CLIENT_SECRET')?.trim();

  if (!kindeDomain || !m2mClientId || !m2mClientSecret) {
    return json(
      {
        success: false,
        error:
          'Missing required env vars: KINDE_DOMAIN, KINDE_M2M_CLIENT_ID, KINDE_M2M_CLIENT_SECRET. ' +
          'See function header comments for setup instructions.',
      },
      503,
      corsHeaders,
    );
  }

  // Obtain Kinde Management API token.
  let accessToken: string;
  try {
    accessToken = await getKindeManagementToken(kindeDomain, m2mClientId, m2mClientSecret);
  } catch (err) {
    console.error('[admin-kinde-reconcile] Failed to get management token:', err);
    return json({ success: false, error: String(err) }, 502, corsHeaders);
  }

  const serviceClient = getServiceClient();

  const summary = {
    found: 0,
    already_provisioned: 0,
    newly_provisioned: 0,
    errors: 0,
    error_details: [] as Array<{ kindeSub: string; code: string; message: string }>,
    dry_run: dryRun,
  };

  // Page through all Kinde users.
  let nextToken: string | undefined;
  do {
    let page: { users: KindeUser[]; next_token?: string };
    try {
      page = await fetchKindeUsersPage(kindeDomain, accessToken, nextToken, pageSize);
    } catch (err) {
      console.error('[admin-kinde-reconcile] Failed to fetch Kinde users page:', err);
      return json({ success: false, error: String(err), partial_summary: summary }, 502, corsHeaders);
    }

    const kindeUsers = page.users ?? [];
    nextToken = page.next_token;
    summary.found += kindeUsers.length;

    if (kindeUsers.length === 0) break;

    // Compute all deterministic UUIDs for this page.
    const uuidEntries = await Promise.all(
      kindeUsers.map(async (u) => ({
        kindeSub: u.id,
        email: u.email ?? '',
        emailVerified: u.email_verified === true,
        userId: await kindeSubToUserId(u.id),
      })),
    );

    // Batch-check which UUIDs already have profile rows.
    const uuids = uuidEntries.map((e) => e.userId);
    const { data: existingProfiles } = await serviceClient
      .from('profiles')
      .select('user_id')
      .in('user_id', uuids);

    const existingSet = new Set((existingProfiles ?? []).map((p: { user_id: string }) => p.user_id));

    // Provision missing users (skip if dry_run).
    for (const entry of uuidEntries) {
      if (existingSet.has(entry.userId)) {
        summary.already_provisioned++;
        continue;
      }

      if (dryRun) {
        summary.newly_provisioned++;
        console.log(`[admin-kinde-reconcile] DRY RUN — would provision ${entry.kindeSub} → ${entry.userId}`);
        continue;
      }

      try {
        await provisionUser(serviceClient, entry.kindeSub, entry.email, entry.emailVerified);
        summary.newly_provisioned++;
        console.log(`[admin-kinde-reconcile] Provisioned ${entry.kindeSub} → ${entry.userId}`);
      } catch (err) {
        summary.errors++;
        const code = err instanceof ProvisionError ? err.code : 'UNKNOWN';
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[admin-kinde-reconcile] Failed to provision ${entry.kindeSub}: ${code} — ${message}`);
        summary.error_details.push({ kindeSub: entry.kindeSub, code, message });
      }
    }
  } while (nextToken);

  console.log('[admin-kinde-reconcile] Complete', summary);
  return json({ success: true, summary }, 200, corsHeaders);
});
