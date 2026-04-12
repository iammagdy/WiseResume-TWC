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

    // Override daily_limit in ai_credits based on the effective plan so that
    // premium/pro users see the correct limit instead of the free-tier value
    // stored in the database.
    // Sentinel -1 means "unlimited" (handled on the client side).
    const PRO_DAILY_LIMIT = 100;
    const rawCredits = creditsResult.data;
    const today = new Date().toISOString().split('T')[0];
    let aiCreditsPayload: typeof rawCredits | { daily_usage: number; daily_limit: number; usage_date: string; total_usage: number; updated_at: string } | null = null;
    if (rawCredits) {
      if (effectivePlan === 'premium') {
        aiCreditsPayload = { ...rawCredits, daily_limit: -1 };
      } else if (effectivePlan === 'pro') {
        aiCreditsPayload = { ...rawCredits, daily_limit: PRO_DAILY_LIMIT };
      } else {
        aiCreditsPayload = rawCredits;
      }
    } else {
      // No ai_credits row yet — synthesize a default payload from effective plan
      // so the frontend always receives accurate credit info.
      let defaultLimit: number;
      if (effectivePlan === 'premium') {
        defaultLimit = -1; // Unlimited sentinel
      } else if (effectivePlan === 'pro') {
        defaultLimit = PRO_DAILY_LIMIT;
      } else {
        defaultLimit = 5;
      }
      aiCreditsPayload = {
        daily_usage: 0,
        daily_limit: defaultLimit,
        usage_date: today,
        total_usage: 0,
        updated_at: new Date().toISOString(),
      };
    }

    return new Response(
      JSON.stringify({
        userId,
        kinde_sub: kindeSub,
        profile: profile || null,
        preferences: prefsResult.data || null,
        subscription: subscriptionPayload,
        ai_credits: aiCreditsPayload,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return authErrorResponse(err, origin);
  }
});
