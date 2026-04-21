import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { target_user_id, daily_limit, bonus_credits } = body;

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

    const parsedLimit: number | undefined =
      daily_limit !== undefined && daily_limit !== null ? Number(daily_limit) : undefined;
    const parsedBonus: number =
      bonus_credits !== undefined && bonus_credits !== null ? Number(bonus_credits) : 0;

    if (parsedLimit === undefined && parsedBonus === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Provide daily_limit, bonus_credits, or both' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getServiceClient();
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // Fetch current row to compute correct values for the upsert
    const { data: currentRow, error: fetchError } = await supabase
      .from('ai_credits')
      .select('daily_usage, daily_limit, usage_date, total_usage')
      .eq('user_id', target_user_id)
      .maybeSingle();

    if (fetchError) {
      console.error('[admin-set-credits] fetch error:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Compute new daily_usage (bonus_credits reduce today's usage, floored at 0)
    const existingUsage: number =
      currentRow && currentRow.usage_date === today ? (currentRow.daily_usage ?? 0) : 0;
    const newUsage: number =
      parsedBonus > 0 ? Math.max(0, existingUsage - parsedBonus) : existingUsage;

    // Determine the correct daily_limit for the upsert:
    //  - If admin explicitly set one → use it
    //  - If row exists → keep it unchanged
    //  - If no row AND bonus-only → look up subscription to get the plan's limit
    let newLimit: number;
    if (parsedLimit !== undefined) {
      newLimit = parsedLimit;
    } else if (currentRow?.daily_limit !== undefined && currentRow.daily_limit !== null) {
      newLimit = currentRow.daily_limit;
    } else {
      // No row and no explicit limit: infer from subscription plan (fallback Free=5)
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('plan_name')
        .eq('user_id', target_user_id)
        .maybeSingle();
      const planName = String((sub as { plan_name?: string } | null)?.plan_name ?? 'free').toLowerCase();
      const PLAN_LIMITS: Record<string, number> = { free: 5, pro: 100, premium: -1 };
      newLimit = PLAN_LIMITS[planName] ?? 5;
    }

    // Single upsert — no race window, handles both new and existing rows
    const { error: upsertError } = await supabase
      .from('ai_credits')
      .upsert(
        {
          user_id: target_user_id,
          daily_limit: newLimit,
          daily_usage: newUsage,
          total_usage: currentRow?.total_usage ?? 0,
          usage_date: today,
          updated_at: now,
        },
        { onConflict: 'user_id' }
      );

    if (upsertError) {
      console.error('[admin-set-credits] upsert error:', upsertError);
      return new Response(
        JSON.stringify({ success: false, error: upsertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Write audit log — non-fatal
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        user_id: target_user_id,
        action: 'credits_override',
        category: 'credits',
        metadata: {
          daily_limit: parsedLimit ?? null,
          bonus_credits: parsedBonus,
          resolved_daily_limit: newLimit,
          updated_by: 'dev-kit',
          updated_at: now,
        },
        created_at: now,
      });

    if (auditError) {
      console.warn('[admin-set-credits] audit log error (non-fatal):', auditError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        daily_limit: newLimit,
        bonus_credits: parsedBonus,
        updated_at: now,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[admin-set-credits] Unexpected error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
