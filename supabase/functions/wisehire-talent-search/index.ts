import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getAuthUser } from '../_shared/authMiddleware.ts';
import { checkRateLimit } from '../_shared/rateLimiter.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const user = await getAuthUser(req);
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // HR guard
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_type, plan')
      .eq('user_id', user.id)
      .single();

    if (profile?.account_type !== 'hr') {
      return new Response(JSON.stringify({ error: 'WiseHire HR account required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Rate limit: Starter 10/day, Pro unlimited (200/day)
    const limit = profile.plan === 'pro' ? 200 : 10;
    const rl = await checkRateLimit(user.id, 'wisehire-talent-search', limit, 86400);
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: 'Daily search limit reached', remaining: 0 }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { skills, experience_level, availability, remote_ok, query, limit: qLimit = 20, offset = 0 } =
      await req.json().catch(() => ({}));

    let dbQuery = supabase
      .from('talent_pool_profiles')
      .select('id, full_name, headline, skills, experience_level, availability, location, remote_ok, profile_slug, view_count, opted_in_at')
      .eq('opted_in', true)
      .order('opted_in_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(qLimit) - 1);

    if (experience_level) dbQuery = dbQuery.eq('experience_level', experience_level);
    if (availability) dbQuery = dbQuery.eq('availability', availability);
    if (remote_ok !== undefined) dbQuery = dbQuery.eq('remote_ok', remote_ok);
    if (skills && skills.length > 0) dbQuery = dbQuery.overlaps('skills', skills);

    const { data: results, error, count } = await dbQuery;
    if (error) throw error;

    let filtered = results ?? [];

    // Text search across name/headline if query provided
    if (query?.trim()) {
      const q = query.trim().toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.full_name?.toLowerCase().includes(q) ||
          p.headline?.toLowerCase().includes(q) ||
          p.skills?.some((s: string) => s.toLowerCase().includes(q)),
      );
    }

    return new Response(
      JSON.stringify({ results: filtered, total: count ?? filtered.length, remaining: rl.remaining }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[wisehire-talent-search]', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
