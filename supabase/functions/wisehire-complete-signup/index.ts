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

    // Use service client to verify JWT and get user
    const { data: { user }, error: userErr } = await serviceClient.auth.getUser(bridgeToken);
    if (userErr || !user?.id) {
      console.error('[wisehire-complete-signup] getUser failed:', userErr?.message);
      return json({ success: false, error: 'unauthorized' }, 401, corsHeaders);
    }

    const userId = user.id;

    const body = await req.json();
    const { invite_token, full_name, company_name, company_size } = body as {
      invite_token?: string;
      full_name?: string;
      company_name?: string;
      company_size?: string;
    };

    if (!invite_token?.trim()) {
      return json({ success: false, error: 'invite_token is required' }, 400, corsHeaders);
    }

    const WISEHIRE_INVITE_SECRET =
      Deno.env.get('WISEHIRE_INVITE_SECRET') ?? Deno.env.get('DEV_KIT_PASSWORD') ?? '';

    // Re-validate invite token (prevents replay after expiry/revoke)
    const { data: invite, error: fetchErr } = await serviceClient
      .from('wisehire_invites')
      .select('token, token_signature, recipient_email, expires_at, used_at, is_revoked')
      .eq('token', invite_token.trim())
      .maybeSingle();

    if (fetchErr) {
      console.error('[wisehire-complete-signup] DB fetch error:', fetchErr.message);
      return json({ success: false, error: 'server_error' }, 500, corsHeaders);
    }

    if (!invite) return json({ success: false, error: 'invite_not_found' }, 404, corsHeaders);
    if (invite.is_revoked) return json({ success: false, error: 'invite_revoked' }, 400, corsHeaders);

    // Allow re-completion if invite was already used by the same user (idempotent)
    // We check if the profile already has account_type = hr
    const { data: existingProfile } = await serviceClient
      .from('profiles')
      .select('account_type')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingProfile?.account_type === 'hr') {
      // Already completed — idempotent success
      return json({ success: true, already_completed: true }, 200, corsHeaders);
    }

    if (invite.used_at) return json({ success: false, error: 'invite_already_used' }, 400, corsHeaders);
    if (new Date(invite.expires_at) < new Date()) {
      return json({ success: false, error: 'invite_expired' }, 400, corsHeaders);
    }

    const signatureOk = await hmacVerify(invite.token, invite.token_signature, WISEHIRE_INVITE_SECRET);
    if (!signatureOk) {
      return json({ success: false, error: 'invalid_signature' }, 400, corsHeaders);
    }

    // Set account_type = 'hr' on the profile
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
      .eq('token', invite_token.trim());

    if (inviteErr) {
      console.error('[wisehire-complete-signup] invite update failed:', inviteErr.message);
      // Non-fatal — profile already updated
    }

    // Create draft wisehire_companies row (non-fatal on error)
    try {
      const companyName = company_name?.trim() || 'My Company';
      const { error: companyErr } = await serviceClient
        .from('wisehire_companies')
        .upsert(
          {
            owner_id: userId,
            name: companyName,
            size: company_size?.trim() ?? '1-10',
            onboarding_completed: false,
          },
          { onConflict: 'owner_id', ignoreDuplicates: true },
        );

      if (companyErr) {
        console.warn('[wisehire-complete-signup] company upsert skipped:', companyErr.message);
      }
    } catch (companyEx) {
      console.warn('[wisehire-complete-signup] company upsert exception:', companyEx);
    }

    // Grant 7-day Professional trial (non-fatal on error)
    try {
      const now = new Date().toISOString();
      const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error: subErr } = await serviceClient
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

      if (subErr) {
        console.warn('[wisehire-complete-signup] trial grant skipped:', subErr.message);
      }
    } catch (subEx) {
      console.warn('[wisehire-complete-signup] trial grant exception:', subEx);
    }

    // Audit log
    try {
      await serviceClient.from('audit_logs').insert({
        user_id: userId,
        category: 'auth',
        action: 'wisehire_signup_complete',
        metadata: {
          invite_token: invite_token.trim(),
          recipient_email: invite.recipient_email,
          company_name: company_name ?? null,
          completed_at: new Date().toISOString(),
        },
      });
    } catch {
      // Non-fatal
    }

    return json({ success: true }, 200, corsHeaders);
  } catch (err) {
    console.error('[wisehire-complete-signup]', err);
    return json({ success: false, error: 'server_error' }, 500, corsHeaders);
  }
});
