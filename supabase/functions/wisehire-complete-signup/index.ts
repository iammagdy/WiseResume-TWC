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
    const upperCode = early_access_code!.trim().toUpperCase();

    const { data: coupon, error: couponErr } = await serviceClient
      .from('discount_codes')
      .select('id, code, is_active, expires_at, max_uses, uses_count, plan_override, plan_days')
      .eq('code', upperCode)
      .maybeSingle();

    if (couponErr) {
      console.error('[wisehire-complete-signup] coupon fetch error:', couponErr.message);
      return json({ success: false, error: 'server_error' }, 500, corsHeaders);
    }

    if (!coupon || !coupon.is_active) {
      return json({ success: false, error: 'invalid_early_access_code' }, 400, corsHeaders);
    }

    if (coupon.expires_at && new Date(coupon.expires_at as string) < new Date()) {
      return json({ success: false, error: 'early_access_code_expired' }, 400, corsHeaders);
    }

    if ((coupon.max_uses as number) > 0 && (coupon.uses_count as number) >= (coupon.max_uses as number)) {
      return json({ success: false, error: 'early_access_code_exhausted' }, 400, corsHeaders);
    }

    // ── Step 1: Atomic coupon validation + increment via DB RPC ──
    // The RPC acquires a FOR UPDATE row lock so concurrent requests serialise;
    // the server-side increment (uses_count = uses_count + 1) prevents lost updates.
    const { data: rpcRows, error: rpcErr } = await serviceClient
      .rpc('wisehire_redeem_early_access_code', { p_code: upperCode })
      .returns<{ success: boolean; error_code: string | null; plan_override: string | null; plan_days: number | null }[]>();

    if (rpcErr) {
      console.error('[wisehire-complete-signup] EA redeem RPC error:', rpcErr.message);
      return json({ success: false, error: 'server_error' }, 500, corsHeaders);
    }

    const rpcResult = rpcRows?.[0];
    if (!rpcResult?.success) {
      const errCode = rpcResult?.error_code ?? 'invalid_early_access_code';
      const status = errCode === 'early_access_code_exhausted' ? 409 : 400;
      return json({ success: false, error: errCode }, status, corsHeaders);
    }

    const planOverride = rpcResult.plan_override as string;
    // Defence-in-depth: ensure the RPC returned a WiseHire plan even if called
    // directly without going through the public validation endpoint.
    if (!planOverride || !planOverride.startsWith('wisehire_')) {
      console.error('[wisehire-complete-signup] EA plan_override is not a wisehire plan:', planOverride);
      return json({ success: false, error: 'invalid_early_access_code' }, 400, corsHeaders);
    }
    const planDays = (rpcResult.plan_days as number | null) ?? 7;

    // ── Step 2: Set account_type = 'hr' ──
    const profileUpdatesEA: Record<string, unknown> = { account_type: 'hr' };
    if (full_name?.trim()) profileUpdatesEA.full_name = full_name.trim();

    const { error: profileEAErr } = await serviceClient
      .from('profiles')
      .update(profileUpdatesEA)
      .eq('user_id', userId);

    if (profileEAErr) {
      console.error('[wisehire-complete-signup] EA profile update failed:', profileEAErr.message);
      return json({ success: false, error: 'profile_update_failed' }, 500, corsHeaders);
    }

    // ── Step 3: Create wisehire_companies row (required) ──
    const companyName = company_name?.trim() || 'My Company';
    const { error: companyErr } = await serviceClient
      .from('wisehire_companies')
      .upsert(
        { owner_id: userId, name: companyName, size: company_size?.trim() ?? '1-10', onboarding_completed: false },
        { onConflict: 'owner_id', ignoreDuplicates: true },
      );

    if (companyErr) {
      console.error('[wisehire-complete-signup] EA company upsert failed:', companyErr.message);
      await serviceClient.from('profiles').update({ account_type: 'jobseeker' }).eq('user_id', userId);
      return json({ success: false, error: 'company_setup_failed' }, 500, corsHeaders);
    }

    // ── Step 4: Apply coupon plan to subscription (required) ──
    const now = new Date().toISOString();
    const planEnd = new Date(Date.now() + planDays * 24 * 60 * 60 * 1000).toISOString();

    const { error: subErr } = await serviceClient
      .from('subscriptions')
      .upsert(
        {
          user_id: userId,
          plan_name: planOverride,
          trial_plan: planOverride,
          trial_expires_at: planEnd,
          status: 'active',
          current_period_start: now,
          current_period_end: planEnd,
          coupon_code: upperCode,
        },
        { onConflict: 'user_id', ignoreDuplicates: false },
      );

    if (subErr) {
      console.error('[wisehire-complete-signup] EA subscription upsert failed:', subErr.message);
      await serviceClient.from('profiles').update({ account_type: 'jobseeker' }).eq('user_id', userId);
      await serviceClient.from('wisehire_companies').delete().eq('owner_id', userId);
      return json({ success: false, error: 'plan_activation_failed' }, 500, corsHeaders);
    }

    // ── Audit log (non-fatal) ──
    try {
      await serviceClient.from('audit_logs').insert({
        user_id: userId,
        category: 'auth',
        action: 'wisehire_early_access_complete',
        metadata: {
          early_access_code: upperCode,
          plan_override: planOverride,
          plan_days: planDays,
          company_name: companyName,
          completed_at: new Date().toISOString(),
        },
      });
    } catch { /* non-fatal */ }

    return json({ success: true }, 200, corsHeaders);
  } catch (err) {
    console.error('[wisehire-complete-signup]', err);
    return json({ success: false, error: 'server_error' }, 500, corsHeaders);
  }
});
