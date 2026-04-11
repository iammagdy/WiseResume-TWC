import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAuth, authErrorResponse } from '../_shared/authMiddleware.ts';

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, client } = await requireAuth(req);

    // Extract kinde_sub from JWT claims — signature already verified by requireAuth above
    let kindeSub: string | null = null;
    try {
      const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
      const b64 = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/') || '';
      const claims = JSON.parse(atob(b64.padEnd(b64.length + (4 - b64.length % 4) % 4, '=')));
      kindeSub = (claims.kinde_sub as string) || null;
    } catch { /* ignore — kinde_sub is optional */ }

    // Fetch profile, preferences, subscription, and ai_credits in parallel.
    // Using service client (from requireAuth) bypasses RLS — no auth.uid() dependency.
    const [profileResult, prefsResult, subsResult, creditsResult] = await Promise.all([
      client.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
      client.from('user_preferences').select('*').eq('user_id', userId).maybeSingle(),
      client.from('subscriptions')
        .select('plan_name, status, plan_updated_at, trial_plan, trial_expires_at')
        .eq('user_id', userId)
        .maybeSingle(),
      client.from('ai_credits').select('daily_usage, daily_limit, usage_date, total_usage, updated_at').eq('user_id', userId).maybeSingle(),
    ]);

    // Suspension check — return 403 if account is suspended
    const profile = profileResult.data;
    if (profile?.is_suspended) {
      return new Response(
        JSON.stringify({
          suspended: true,
          reason: profile.suspension_reason ?? null,
          message: 'Your account has been suspended. Please contact support.',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Compute effective plan: trial takes precedence over plan_name when active
    const sub = subsResult.data;
    let effectivePlan: string = sub?.plan_name ?? 'free';
    if (sub?.trial_plan && sub?.trial_expires_at) {
      const expiresAt = new Date(sub.trial_expires_at as string);
      if (expiresAt > new Date()) {
        effectivePlan = sub.trial_plan as string;
      }
    }

    const subscriptionPayload = sub
      ? { ...sub, effective_plan: effectivePlan }
      : null;

    return new Response(
      JSON.stringify({
        userId,
        kinde_sub: kindeSub,
        profile: profile || null,
        preferences: prefsResult.data || null,
        subscription: subscriptionPayload,
        ai_credits: creditsResult.data || null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return authErrorResponse(err, origin);
  }
});
