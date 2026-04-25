import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

// score-resume is excluded: it is fully deterministic and never calls an LLM,
// so routing config has no effect on it.
const SUPPORTED_FEATURES = [
  'tailor-resume',
  'enhance-section',
  'analyze-resume',
  'generate-cover-letter',
  'agentic-chat',
  'wise-ai-chat',
] as const;

const VALID_PROVIDERS = ['auto', 'openrouter', 'groq'];

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    try {
      await requireAdminAuth(req);
    } catch (authErr) {
      if (authErr instanceof Response) return authErr;
      throw authErr;
    }

    const supabase = getServiceClient();
    const body = req.method === 'GET' ? {} : await req.json();
    const action: string = body.action ?? 'get_config';

    // ── GET_CONFIG ───────────────────────────────────────────────────────────
    // Also accepts legacy 'get_all' action name for backward compat.
    if (action === 'get_config' || action === 'get_all') {
      const { data, error } = await supabase
        .from('ai_routing_config')
        .select('*')
        .order('feature_name');

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // Ensure all supported features appear even if not yet in DB
      const byName = new Map((data ?? []).map((r: Record<string, unknown>) => [r.feature_name, r]));
      const configs = SUPPORTED_FEATURES.map((f) => byName.get(f) ?? {
        feature_name: f,
        provider: 'auto',
        model: '',
        ab_secondary_provider: null,
        ab_secondary_model: '',
        ab_split_pct: 0,
        updated_by: null,
        updated_at: null,
      });

      return new Response(
        JSON.stringify({ success: true, configs }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── UPDATE_FEATURE ───────────────────────────────────────────────────────
    if (action === 'update_feature') {
      const { feature_name, provider, model, ab_secondary_provider, ab_secondary_model, ab_split_pct } = body;

      if (!feature_name || !SUPPORTED_FEATURES.includes(feature_name)) {
        return new Response(
          JSON.stringify({ success: false, error: `Invalid feature_name. Must be one of: ${SUPPORTED_FEATURES.join(', ')}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const resolvedProvider = provider ?? 'auto';
      if (!VALID_PROVIDERS.includes(resolvedProvider)) {
        return new Response(
          JSON.stringify({ success: false, error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const splitPct = typeof ab_split_pct === 'number' ? Math.min(100, Math.max(0, Math.round(ab_split_pct))) : 0;

      if (ab_secondary_provider && !VALID_PROVIDERS.filter(p => p !== 'auto').includes(ab_secondary_provider)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid ab_secondary_provider. Must be openrouter or groq.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const now = new Date().toISOString();
      const { error: upsertErr } = await supabase
        .from('ai_routing_config')
        .upsert({
          feature_name,
          provider: resolvedProvider,
          model: model ?? '',
          ab_secondary_provider: ab_secondary_provider || null,
          ab_secondary_model: ab_secondary_model ?? '',
          ab_split_pct: splitPct,
          updated_by: 'dev-kit',
          updated_at: now,
        }, { onConflict: 'feature_name' });

      if (upsertErr) {
        return new Response(
          JSON.stringify({ success: false, error: upsertErr.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // Audit log — non-fatal
      await supabase.from('audit_logs').insert({
        action: 'ai_routing_update',
        category: 'ai_routing',
        metadata: {
          feature_name,
          provider: resolvedProvider,
          model: model ?? '',
          ab_secondary_provider: ab_secondary_provider || null,
          ab_split_pct: splitPct,
          updated_by: 'dev-kit',
          updated_at: now,
        },
        created_at: now,
      }).then(({ error: auditErr }) => {
        if (auditErr) console.warn('[admin-ai-routing] audit log error (non-fatal):', auditErr);
      });

      return new Response(
        JSON.stringify({ success: true, feature_name, provider: resolvedProvider }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── RESET_FEATURE ────────────────────────────────────────────────────────
    // Deletes the config row so the feature falls back to random pool selection.
    if (action === 'reset_feature') {
      const { feature_name } = body;

      if (!feature_name || !SUPPORTED_FEATURES.includes(feature_name)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid feature_name' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const now = new Date().toISOString();
      const { error: deleteErr } = await supabase
        .from('ai_routing_config')
        .delete()
        .eq('feature_name', feature_name);

      if (deleteErr) {
        return new Response(
          JSON.stringify({ success: false, error: deleteErr.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // Audit log — non-fatal
      await supabase.from('audit_logs').insert({
        action: 'ai_routing_reset',
        category: 'ai_routing',
        metadata: { feature_name, reset_to: 'auto', updated_by: 'dev-kit', updated_at: now },
        created_at: now,
      }).then(({ error: auditErr }) => {
        if (auditErr) console.warn('[admin-ai-routing] audit log error (non-fatal):', auditErr);
      });

      return new Response(
        JSON.stringify({ success: true, feature_name, reset: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error('[admin-ai-routing] Unexpected error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
