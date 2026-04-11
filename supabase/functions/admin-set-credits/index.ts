import { getServiceClient } from '../_shared/dbClient.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SECRET_PASSWORD = Deno.env.get('DEV_KIT_PASSWORD');
  if (!SECRET_PASSWORD) {
    return new Response(
      JSON.stringify({ success: false, error: 'Admin functions are not configured' }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    const { password, target_user_id, daily_limit, bonus_credits } = body;

    if (!password || password !== SECRET_PASSWORD) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    // Fetch current row so we can compute new daily_usage when bonus_credits is set
    const { data: currentRow, error: fetchError } = await supabase
      .from('ai_credits')
      .select('daily_usage, daily_limit, usage_date')
      .eq('user_id', target_user_id)
      .maybeSingle();

    if (fetchError) {
      console.error('[admin-set-credits] fetch error:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!currentRow) {
      // No ai_credits row yet — insert a fresh row with the given values
      const limitToSet = parsedLimit !== undefined ? parsedLimit : 5;

      const { error: insertError } = await supabase
        .from('ai_credits')
        .insert({
          user_id: target_user_id,
          daily_limit: limitToSet,
          daily_usage: 0,
          total_usage: 0,
          usage_date: today,
          updated_at: now,
        });

      if (insertError && insertError.code !== '23505') {
        console.error('[admin-set-credits] insert error:', insertError);
        return new Response(
          JSON.stringify({ success: false, error: insertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Existing row — build update payload
      const updates: Record<string, unknown> = { updated_at: now };

      if (parsedLimit !== undefined) {
        updates.daily_limit = parsedLimit;
      }

      if (parsedBonus > 0) {
        // Bonus credits reduce today's usage (gives the user more remaining credits today)
        const currentUsage: number =
          currentRow.usage_date === today ? (currentRow.daily_usage ?? 0) : 0;
        updates.daily_usage = Math.max(0, currentUsage - parsedBonus);
      }

      const { error: updateError } = await supabase
        .from('ai_credits')
        .update(updates)
        .eq('user_id', target_user_id);

      if (updateError) {
        console.error('[admin-set-credits] update error:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
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
        daily_limit: parsedLimit ?? null,
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
