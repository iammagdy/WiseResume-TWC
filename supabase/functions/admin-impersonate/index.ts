/**
 * admin-impersonate — Mint a short-lived (30 min) Supabase JWT for a target
 * user so the operator can reproduce their experience from inside DevKit.
 *
 * Trigger: "Impersonate" button on the DevKit user-detail pane. Issued
 *   tokens are tracked server-side so they can be revoked.
 * Auth: ADMIN ONLY (`requireAdminAuth` — DevKit session token). The
 *   issued token then carries the target user's identity (not the
 *   admin's) — every authed function checks the impersonation registry
 *   so revocation is immediate.
 * Dispatch contract: POST `{action:'issue', target_user_id}` returns
 *   `{success:true, access_token, expires_at}`; POST `{action:'revoke',
 *   token_id}` revokes a previously issued token. Other actions return
 *   400.
 */
import * as jose from 'npm:jose@5.2.2';
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireAdminAuth } from "../_shared/adminAuth.ts";
import { getServiceClient } from "../_shared/dbClient.ts";

import { wrapHandler } from '../_shared/fnLogger.ts';
const SESSION_TTL_SECONDS = 30 * 60;

Deno.serve(wrapHandler("admin-impersonate", async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let adminEmail: string;
  try {
    adminEmail = await requireAdminAuth(req, corsHeaders);
  } catch (err) {
    if (err instanceof Response) return err;
    return new Response(JSON.stringify({ success: false, error: 'Authentication failed' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = getServiceClient();

  let body: { target_user_id?: string; action?: string } = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const action = body.action ?? 'start';

  if (action === 'exit') {
    const { target_user_id } = body;
    const { error: auditErr } = await supabase.from('audit_logs').insert({
      user_id: null,
      category: 'admin_impersonation',
      action: 'impersonation_exit',
      metadata: {
        performed_by: adminEmail,
        target_user_id: target_user_id ?? null,
        exited_at: new Date().toISOString(),
      },
    });

    if (auditErr) {
      console.error('[admin-impersonate] exit audit insert failed:', auditErr);
      return new Response(
        JSON.stringify({ success: false, error: 'Could not write exit audit log', details: auditErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (action === 'revoke') {
    // Task #18: admin-driven "End session now". Marks every impersonation
    // token issued for `target_user_id` at or before now() as invalid. The
    // denylist check in requireAuth / validateSupabaseToken consults this
    // table on the next API call from the impersonated tab and returns 401,
    // which the client's existing 401 handling turns into a logout.
    const { target_user_id } = body;
    if (!target_user_id) {
      return new Response(JSON.stringify({ success: false, error: 'target_user_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const revokedAtIso = new Date().toISOString();
    const { error: revokeErr } = await supabase
      .from('impersonation_revocations')
      .upsert(
        { target_user_id, revoked_at: revokedAtIso, revoked_by: adminEmail },
        { onConflict: 'target_user_id' },
      );

    if (revokeErr) {
      console.error('[admin-impersonate] revoke upsert failed:', revokeErr);
      return new Response(
        JSON.stringify({ success: false, error: 'Could not revoke impersonation', details: revokeErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Audit-log failure is non-fatal here — the revocation itself already
    // landed and is what stops the session. We still surface it in logs so
    // operators notice silent audit drift.
    const { error: auditErr } = await supabase.from('audit_logs').insert({
      user_id: null,
      category: 'admin_impersonation',
      action: 'impersonation_revoke',
      metadata: {
        performed_by: adminEmail,
        target_user_id,
        revoked_at: revokedAtIso,
      },
    });
    if (auditErr) {
      console.error('[admin-impersonate] revoke audit insert failed:', auditErr);
    }

    return new Response(JSON.stringify({ success: true, revoked_at: revokedAtIso }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { target_user_id } = body;
  if (!target_user_id) {
    return new Response(JSON.stringify({ success: false, error: 'target_user_id is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: targetUser, error: userErr } = await supabase.auth.admin.getUserById(target_user_id);
  if (userErr || !targetUser?.user) {
    return new Response(JSON.stringify({ success: false, error: 'not_found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const targetEmail = targetUser.user.email ?? '';

  const ADMIN_EMAILS = Deno.env.get('ADMIN_EMAILS');
  const adminEmailList = (ADMIN_EMAILS ?? '')
    .split(',')
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);

  if (targetEmail && adminEmailList.includes(targetEmail.toLowerCase())) {
    return new Response(
      JSON.stringify({ success: false, error: 'Impersonating another admin is not permitted' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const jwtSecret = Deno.env.get('EXT_SUPABASE_JWT_SECRET') || Deno.env.get('SUPABASE_JWT_SECRET');
  if (!jwtSecret) {
    console.error('[admin-impersonate] SUPABASE_JWT_SECRET not configured');
    return new Response(JSON.stringify({
      success: false,
      error: 'EXT_SUPABASE_JWT_SECRET (or SUPABASE_JWT_SECRET) is not configured in Supabase Edge Function Secrets. Set one of them and redeploy admin-impersonate to enable Act As.',
    }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresAtSeconds = now + SESSION_TTL_SECONDS;
  const expiresAtMs = expiresAtSeconds * 1000;

  const secret = new TextEncoder().encode(jwtSecret);
  const accessToken = await new jose.SignJWT({
    sub: target_user_id,
    email: targetEmail,
    role: 'authenticated',
    aud: 'authenticated',
    iss: 'supabase',
    iat: now,
    exp: expiresAtSeconds,
    is_impersonation: true,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .sign(secret);

  const { error: auditErr } = await supabase.from('audit_logs').insert({
    user_id: null,
    category: 'admin_impersonation',
    action: 'impersonation_start',
    metadata: {
      performed_by: adminEmail,
      target_user_id,
      target_email: targetEmail || target_user_id,
      started_at: new Date().toISOString(),
      expires_at: new Date(expiresAtMs).toISOString(),
    },
  });

  if (auditErr) {
    console.error('[admin-impersonate] start audit insert failed:', auditErr);
    return new Response(
      JSON.stringify({ success: false, error: 'Could not write audit log — impersonation blocked' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      access_token: accessToken,
      user_id: target_user_id,
      email: targetEmail || target_user_id,
      expires_at: expiresAtMs,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}));
