import { getCorsHeaders } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAuth, AuthError, authErrorResponse } from '../_shared/authMiddleware.ts';
import { checkRateLimit, getUserPlan } from '../_shared/rateLimiter.ts';

import { wrapHandler } from '../_shared/fnLogger.ts';
function json(data: unknown, status = 200, cors: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(wrapHandler("wisehire-talent-search", async (req) => {
  const origin = req.headers.get('origin');
  const cors = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    const { userId } = await requireAuth(req);
    const supabase = getServiceClient();

    // HR guard
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_type')
      .eq('user_id', userId)
      .single();

    if (profile?.account_type !== 'hr') {
      return json({ error: 'WiseHire HR account required' }, 403, cors);
    }

    // Rate limit: Starter 10/day, Pro/Business+ 200/day (plan from subscriptions)
    const effectivePlan = await getUserPlan(userId);
    const isPro = ['wisehire_professional', 'wisehire_business', 'wisehire_enterprise'].includes(effectivePlan);
    const limit = isPro ? 200 : 10;
    const rl = await checkRateLimit(userId, {
      actionType: 'wisehire_talent_search',
      maxRequests: limit,
      windowSeconds: 86_400,
    });
    if (!rl.allowed) {
      return json({ error: 'Daily search limit reached', remaining: 0 }, 429, cors);
    }

    const { skills, experience_level, availability, remote_ok, query, limit: qLimit = 20, offset = 0 } =
      await req.json().catch(() => ({}));

    let dbQuery = supabase
      .from('talent_pool_profiles')
      .select('id, full_name, headline, skills, experience_level, availability, location, remote_ok, profile_slug, view_count, opted_in_at', { count: 'exact' })
      .eq('opted_in', true)
      .order('opted_in_at', { ascending: false });

    if (experience_level) dbQuery = dbQuery.eq('experience_level', experience_level);
    if (availability) dbQuery = dbQuery.eq('availability', availability);
    if (remote_ok !== undefined) dbQuery = dbQuery.eq('remote_ok', remote_ok);
    if (skills && skills.length > 0) dbQuery = dbQuery.overlaps('skills', skills);

    // Text search via SQL ilike so pagination and count stay correct.
    // Skills exact-tag matching remains via .overlaps() above.
    if (query?.trim()) {
      const q = query.trim();
      dbQuery = dbQuery.or(`full_name.ilike.%${q}%,headline.ilike.%${q}%`);
    }

    dbQuery = dbQuery.range(Number(offset), Number(offset) + Number(qLimit) - 1);

    const { data: results, error, count } = await dbQuery;
    if (error) throw error;

    const filtered = results ?? [];

    return json({ results: filtered, total: count ?? filtered.length, remaining: rl.remaining }, 200, cors);
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin);
    console.error('[wisehire-talent-search]', err);
    return json({ error: 'Internal error' }, 500, getCorsHeaders(origin));
  }
}));
