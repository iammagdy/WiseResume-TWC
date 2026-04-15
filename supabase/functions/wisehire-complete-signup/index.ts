import { getServiceClient } from '../_shared/dbClient.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

async function hmacVerify(message: string, signature: string, secret: string): Promise<boolean> {
  const keyData = new TextEncoder().encode(secret);
  const msgData = new TextEncoder().encode(message);
  const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, msgData);
  const expected = [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
  return expected === signature;
}

function json(data: unknown, status = 200, corsHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Verify the user is authenticated via their bridge JWT
    const authHeader = req.headers.get('authorization') ?? '';
    const bridgeToken = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!bridgeToken) {
      return json({ success: false, error: 'unauthorized' }, 401, corsHeaders);
    }

    const serviceClient = getServiceClient();

    const { data: { user }, error: userErr } = await serviceClient.auth.getUser(bridgeToken);
    if (userErr || !user?.id) {
      console.error('[wisehire-complete-signup] getUser failed:', userErr?.message);
      return json({ success: false, error: 'unauthorized' }, 401, corsHeaders);
    }

    const userId = user.id;

    const body = await req.json();
    const { invite_token, early_access_code, full_name, company_name, company_size } = body as {
      invite_token?: string;
      early_access_code?: string;
      full_name?: string;
      company_name?: string;
      company_size?: string;
    };

    const hasInvite = !!invite_token?.trim();
    const hasEarlyAccess = !!early_access_code?.trim();

    if (!hasInvite && !hasEarlyAccess) {
      return json({ success: false, error: 'invite_token or early_access_code is required' }, 400, corsHeaders);
    }

    // ── Check idempotency: already HR ──
    const { data: existingProfile } = await serviceClient
      .from('profiles')
      .select('account_type')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingProfile?.account_type === 'hr') {
      return json({ success: true, already_completed: true }, 200, corsHeaders);
    }

    // ════════════════════════════════════════════════════════════
    // PATH A — Invite token (existing behaviour, fully unchanged)
    // ════════════════════════════════════════════════════════════
    if (hasInvite) {
      const WISEHIRE_INVITE_SECRET =
        Deno.env.get('WISEHIRE_INVITE_SECRET') ?? Deno.env.get('DEV_KIT_PASSWORD') ?? '';

      const { data: invite, error: fetchErr } = await serviceClient
        .from('wisehire_invites')
        .select('token, token_signature, recipient_email, expires_at, used_at, is_revoked')
        .eq('token', invite_token!.trim())
        .maybeSingle();

      if (fetchErr) {
        console.error('[wisehire-complete-signup] DB fetch error:', fetchErr.message);
        return json({ success: false, error: 'server_error' }, 500, corsHeaders);
      }

      if (!invite) return json({ success: false, error: 'invite_not_found' }, 404, corsHeaders);
      if (invite.is_revoked) return json({ success: false, error: 'invite_revoked' }, 400, corsHeaders);
      if (invite.used_at) return json({ success: false, error: 'invite_already_used' }, 400, corsHeaders);
      if (new Date(invite.expires_at) < new Date()) {
        return json({ success: false, error: 'invite_expired' }, 400, corsHeaders);
      }

      const signatureOk = await hmacVerify(invite.token, invite.token_signature, WISEHIRE_INVITE_SECRET);
      if (!signatureOk) {
        return json({ success: false, error: 'invalid_signature' }, 400, corsHeaders);
      }

      // Set account_type = 'hr'
      const profileUpdates: Record<string, unknown> = { account_type: 'hr' };
      if (full_name?.trim()) profileUpdates.full_name = full_name.trim();

      const { error: profileErr } = await serviceClient
        .from('profiles')
        .update(profileUpdates)
        .eq('user_id', userId);

      if (profileErr) {
        console.error('[wisehire-complete-signup] profile update failed:', profileErr.message);
        return json({ success: false, error: 'profile_update_failed' }, 500, corsHeaders);
      }

      // Mark invite as used
      const { error: inviteErr } = await serviceClient
        .from('wisehire_invites')
        .update({ used_at: new Date().toISOString() })
        .eq('token', invite_token!.trim());

      if (inviteErr) {
        console.error('[wisehire-complete-signup] invite update failed:', inviteErr.message);
      }

      // Create wisehire_companies row
      try {
        const companyName = company_name?.trim() || 'My Company';
        await serviceClient
          .from('wisehire_companies')
          .upsert(
            { owner_id: userId, name: companyName, size: company_size?.trim() ?? '1-10', onboarding_completed: false },
            { onConflict: 'owner_id', ignoreDuplicates: true },
          );
      } catch (ex) {
        console.warn('[wisehire-complete-signup] company upsert exception:', ex);
      }

      // Grant 7-day Professional trial
      try {
        const now = new Date().toISOString();
        const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        await serviceClient
          .from('subscriptions')
          .upsert(
            {
              user_id: userId,
              plan_name: 'wisehire_starter',
              trial_plan: 'wisehire_professional',
              trial_expires_at: trialEnd,
              status: 'active',
              current_period_start: now,
              current_period_end: trialEnd,
            },
            { onConflict: 'user_id', ignoreDuplicates: true },
          );
      } catch (ex) {
        console.warn('[wisehire-complete-signup] trial grant exception:', ex);
      }

      // Audit log
      try {
        await serviceClient.from('audit_logs').insert({
          user_id: userId,
          category: 'auth',
          action: 'wisehire_signup_complete',
          metadata: {
            invite_token: invite_token!.trim(),
            recipient_email: invite.recipient_email,
            company_name: company_name ?? null,
            completed_at: new Date().toISOString(),
          },
        });
      } catch { /* non-fatal */ }

      return json({ success: true }, 200, corsHeaders);
    }

    // ════════════════════════════════════════════════════════════
    // PATH B — Early access code (coupon-gated, no invite needed)
    // ════════════════════════════════════════════════════════════
    // Delegate entirely to an atomic PL/pgSQL RPC that runs all steps
    // (validate + lock coupon → increment uses_count → update profile →
    //  upsert company → upsert subscription → audit log) inside one
    // transaction.  Any failure rolls back the coupon increment automatically.
    const { data: rpcRows, error: rpcErr } = await serviceClient
      .rpc('wisehire_activate_early_access', {
        p_user_id:      userId,
        p_code:         early_access_code!.trim(),
        p_full_name:    full_name?.trim() ?? null,
        p_company_name: company_name?.trim() ?? null,
        p_company_size: company_size?.trim() ?? null,
        p_now:          new Date().toISOString(),
      })
      .returns<{ success: boolean; error_code: string | null; plan_override: string | null }[]>();

    if (rpcErr) {
      console.error('[wisehire-complete-signup] EA activate RPC error:', rpcErr.message);
      return json({ success: false, error: 'server_error' }, 500, corsHeaders);
    }

    const rpcResult = rpcRows?.[0];
    if (!rpcResult?.success) {
      const errCode = rpcResult?.error_code ?? 'invalid_early_access_code';
      const status = errCode === 'early_access_code_exhausted' ? 409 : 400;
      return json({ success: false, error: errCode }, status, corsHeaders);
    }

    // Defence-in-depth: the RPC already enforces wisehire_ prefix inside the DB,
    // but we verify here as well so a client bypassing the public validator cannot
    // obtain HR access via a non-WiseHire coupon.
    const planOverride = rpcResult.plan_override ?? '';
    if (!planOverride.startsWith('wisehire_')) {
      console.error('[wisehire-complete-signup] EA plan_override not a wisehire plan:', planOverride);
      return json({ success: false, error: 'invalid_early_access_code' }, 400, corsHeaders);
    }

    return json({ success: true }, 200, corsHeaders);
  } catch (err) {
    console.error('[wisehire-complete-signup]', err);
    return json({ success: false, error: 'server_error' }, 500, corsHeaders);
  }
});
