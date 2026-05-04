/**
 * admin-ai-ops — merged router for the 4 AI control-plane edge functions.
 *
 * Task #53 (2026-05-03): consolidates `admin-ai-caps`, `admin-ai-routing`,
 * `inspect-ai-keys`, and `refresh-ai-test-models` into a single deployment
 * to free 3 slots under Supabase's 100-function project limit.
 *
 * Excluded (kept isolated): `ai-test`, `ai-health` — both are non-admin
 * surfaces with different auth postures.
 *
 * Dispatch contract:
 *   PRIMARY:  body.action ∈ {"caps","routing","inspect-keys","refresh-test-models"}
 *   FALLBACK: x-admin-ai-op header (used for `caps` + `routing`, whose
 *             original handlers read body.action for THEIR OWN inner
 *             sub-routing — clobbering body.action would break parity).
 *
 * Auth posture:
 *   * caps / routing / inspect-keys: single `requireAdminAuth` at the top
 *     of `serve` (per task spec).
 *   * refresh-test-models: dual-mode auth — `x-cron-secret` OR
 *     `requireAdminAuth`. The router special-cases this action so the
 *     nightly pg_cron caller still reaches it without an admin session,
 *     preserving the original `authenticate()` semantics byte-for-byte.
 *
 * Each handler is byte-for-byte equivalent to its original (response
 * envelopes, status codes, key-masking rules, audit-log writes).
 */

import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { requireCronSecret } from '../_shared/webhookAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { wrapHandler } from '../_shared/fnLogger.ts';
import {
  AI_TEST_DEFAULT_MODELS,
  AI_TEST_MODEL_ALLOWLIST_KEY,
  isAITestProvider,
  isAllowedAITestModelDynamic,
  loadAITestModelCatalog,
  type AITestProvider,
} from '../_shared/modelDefaults.ts';
import {
  curateOpenRouter,
  curateGroq,
  curateDeepSeek,
  type CuratedAllowlist,
  type CuratedModel,
  type CuratedProviderEntry,
} from '../_shared/aiTestModelCatalog.ts';

// ── Shared types / constants ────────────────────────────────────────────
type RouterAction = 'caps' | 'routing' | 'inspect-keys' | 'refresh-test-models';
const ROUTER_ACTIONS: ReadonlySet<RouterAction> = new Set([
  'caps', 'routing', 'inspect-keys', 'refresh-test-models',
]);

// ============================================================================
// admin-ai-caps (verbatim handler)
// ============================================================================
const PLAN_CAP_KEYS = ['daily_cap_free', 'daily_cap_trial', 'daily_cap_pro'] as const;
type PlanCapKey = typeof PLAN_CAP_KEYS[number];
const ALL_CAP_KEYS = [...PLAN_CAP_KEYS, 'global_daily_limit'] as const;

async function handleCaps(
  bodyText: string,
  isGet: boolean,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  try {
    const supabase = getServiceClient();
    const body = isGet ? {} : JSON.parse(bodyText || '{}');
    const action: string = body.action ?? 'get_caps';

    if (action === 'get_caps') {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ALL_CAP_KEYS as unknown as string[]);

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const caps: Record<string, string | null> = {
        daily_cap_free: null,
        daily_cap_trial: null,
        daily_cap_pro: null,
        global_daily_limit: null,
      };
      for (const row of (data ?? [])) {
        if (ALL_CAP_KEYS.includes(row.key as typeof ALL_CAP_KEYS[number])) {
          caps[row.key] = row.value as string | null;
        }
      }

      return new Response(
        JSON.stringify({ success: true, caps }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (action === 'set_plan_cap') {
      const { plan, value } = body;
      const capKey = `daily_cap_${plan}` as PlanCapKey;
      if (!PLAN_CAP_KEYS.includes(capKey)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid plan. Must be one of: free, trial, pro' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      let resolvedValue: string | null = null;
      if (value !== null && value !== undefined && value !== '') {
        const n = Number(value);
        if (isNaN(n) || n < -1) {
          return new Response(
            JSON.stringify({ success: false, error: 'value must be a number >= -1, or null to clear the override' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        resolvedValue = String(n);
      }

      const now = new Date().toISOString();
      if (resolvedValue === null) {
        const { error } = await supabase.from('app_settings').delete().eq('key', capKey);
        if (error) {
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      } else {
        const { error } = await supabase
          .from('app_settings')
          .upsert({ key: capKey, value: resolvedValue }, { onConflict: 'key' });
        if (error) {
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      }

      await supabase.from('audit_logs').insert({
        action: 'ai_cap_update',
        category: 'ai_caps',
        metadata: { cap_key: capKey, value: resolvedValue, updated_by: 'dev-kit', updated_at: now },
        created_at: now,
      }).then(({ error: auditErr }) => {
        if (auditErr) console.warn('[admin-ai-caps] audit log error (non-fatal):', auditErr);
      });

      return new Response(
        JSON.stringify({ success: true, plan, cap_key: capKey, value: resolvedValue }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (action === 'set_global_cap') {
      const { value } = body;

      let resolvedValue: string | null = null;
      if (value !== null && value !== undefined && value !== '') {
        const n = Number(value);
        if (isNaN(n) || n < -1) {
          return new Response(
            JSON.stringify({ success: false, error: 'value must be a number >= -1, or null to clear the global cap' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        resolvedValue = String(n);
      }

      const now = new Date().toISOString();
      if (resolvedValue === null) {
        const { error } = await supabase.from('app_settings').delete().eq('key', 'global_daily_limit');
        if (error) {
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      } else {
        const { error } = await supabase
          .from('app_settings')
          .upsert({ key: 'global_daily_limit', value: resolvedValue }, { onConflict: 'key' });
        if (error) {
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      }

      await supabase.from('audit_logs').insert({
        action: 'ai_global_cap_update',
        category: 'ai_caps',
        metadata: { cap_key: 'global_daily_limit', value: resolvedValue, updated_by: 'dev-kit', updated_at: now },
        created_at: now,
      }).then(({ error: auditErr }) => {
        if (auditErr) console.warn('[admin-ai-caps] audit log error (non-fatal):', auditErr);
      });

      return new Response(
        JSON.stringify({ success: true, cap_key: 'global_daily_limit', value: resolvedValue }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (action === 'get_user_cap') {
      const { user_id } = body;
      if (!user_id || typeof user_id !== 'string' || user_id.trim() === '') {
        return new Response(
          JSON.stringify({ success: false, error: 'user_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      const capKey = `user_limit_${user_id.trim()}`;
      const { data, error } = await supabase.from('app_settings').select('value').eq('key', capKey).maybeSingle();
      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify({ success: true, user_id: user_id.trim(), cap_key: capKey, value: data?.value ?? null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (action === 'set_user_cap') {
      const { user_id, value } = body;

      if (!user_id || typeof user_id !== 'string' || user_id.trim() === '') {
        return new Response(
          JSON.stringify({ success: false, error: 'user_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const capKey = `user_limit_${user_id.trim()}`;

      let resolvedValue: string | null = null;
      if (value !== null && value !== undefined && value !== '') {
        const n = Number(value);
        if (isNaN(n) || n < -1) {
          return new Response(
            JSON.stringify({ success: false, error: 'value must be a number >= -1, or null to clear the user cap' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        resolvedValue = String(n);
      }

      const now = new Date().toISOString();
      if (resolvedValue === null) {
        const { error } = await supabase.from('app_settings').delete().eq('key', capKey);
        if (error) {
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      } else {
        const { error } = await supabase
          .from('app_settings')
          .upsert({ key: capKey, value: resolvedValue }, { onConflict: 'key' });
        if (error) {
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      }

      await supabase.from('audit_logs').insert({
        action: 'ai_user_cap_update',
        category: 'ai_caps',
        metadata: { cap_key: capKey, user_id: user_id.trim(), value: resolvedValue, updated_by: 'dev-kit', updated_at: now },
        created_at: now,
      }).then(({ error: auditErr }) => {
        if (auditErr) console.warn('[admin-ai-caps] audit log error (non-fatal):', auditErr);
      });

      return new Response(
        JSON.stringify({ success: true, user_id: user_id.trim(), cap_key: capKey, value: resolvedValue }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error('[admin-ai-caps] Unexpected error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
}

// ============================================================================
// admin-ai-routing (verbatim handler)
// ============================================================================
const SUPPORTED_FEATURES = [
  'tailor-resume',
  'enhance-section',
  'analyze-resume',
  'generate-cover-letter',
  'agentic-chat',
  'wise-ai-chat',
  'resume-section-ai',
  'recruiter-simulation',
  'suggest-template',
  'optimize-for-linkedin',
  'smart-fit-rewrite',
] as const;
const VALID_PROVIDERS = ['auto', 'openrouter', 'groq', 'deepseek'];

async function handleRouting(
  bodyText: string,
  isGet: boolean,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  try {
    const supabase = getServiceClient();
    const body = isGet ? {} : JSON.parse(bodyText || '{}');
    const action: string = body.action ?? 'get_config';

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
          JSON.stringify({ success: false, error: 'Invalid ab_secondary_provider. Must be openrouter, groq, or deepseek.' }),
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

    if (action === 'bulk_update_features') {
      const { feature_names, provider, model, ab_secondary_provider, ab_secondary_model, ab_split_pct } = body;

      if (!Array.isArray(feature_names) || feature_names.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'feature_names must be a non-empty array' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const invalidFeatures = (feature_names as string[]).filter(f => !SUPPORTED_FEATURES.includes(f as typeof SUPPORTED_FEATURES[number]));
      if (invalidFeatures.length > 0) {
        return new Response(
          JSON.stringify({ success: false, error: `Invalid feature_names: ${invalidFeatures.join(', ')}` }),
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
      const now = new Date().toISOString();
      const rows = (feature_names as string[]).map((f) => ({
        feature_name: f,
        provider: resolvedProvider,
        model: model ?? '',
        ab_secondary_provider: ab_secondary_provider || null,
        ab_secondary_model: ab_secondary_model ?? '',
        ab_split_pct: splitPct,
        updated_by: 'dev-kit',
        updated_at: now,
      }));

      const { error: upsertErr } = await supabase
        .from('ai_routing_config')
        .upsert(rows, { onConflict: 'feature_name' });

      if (upsertErr) {
        return new Response(
          JSON.stringify({ success: false, error: upsertErr.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      await supabase.from('audit_logs').insert({
        action: 'ai_routing_bulk_update',
        category: 'ai_routing',
        metadata: { feature_names, provider: resolvedProvider, updated_by: 'dev-kit', updated_at: now },
        created_at: now,
      }).then(({ error: auditErr }) => {
        if (auditErr) console.warn('[admin-ai-routing] audit log error (non-fatal):', auditErr);
      });

      return new Response(
        JSON.stringify({ success: true, updated: feature_names, provider: resolvedProvider }),
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
}

// ============================================================================
// inspect-ai-keys (verbatim handler)
// ============================================================================
const SLOT_MODELS_KEY = 'ai_test_slot_models';

function maskKey(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const tail = trimmed.length >= 4 ? trimmed.slice(-4) : trimmed;
  return `••••${tail}`;
}

function slotKey(provider: AITestProvider, slot: 1 | 2 | 3): string {
  return `${provider}:${slot}`;
}

async function loadSavedSlotModels(): Promise<Record<string, string>> {
  try {
    const db = getServiceClient();
    const { data, error } = await db
      .from('app_settings')
      .select('value')
      .eq('key', SLOT_MODELS_KEY)
      .maybeSingle();
    if (error) return {};
    const v = data?.value;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const out: Record<string, string> = {};
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        if (typeof val === 'string' && val.trim()) out[k] = val.trim();
      }
      return out;
    }
    return {};
  } catch {
    return {};
  }
}

async function saveSlotModel(
  provider: AITestProvider,
  slot: 1 | 2 | 3,
  model: string,
): Promise<Record<string, string>> {
  const db = getServiceClient();
  const { data, error } = await db.rpc('set_ai_test_slot_model', {
    p_slot_key: slotKey(provider, slot),
    p_model: model,
  });
  if (error) throw error;

  const out: Record<string, string> = {};
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      if (typeof v === 'string' && v.trim()) out[k] = v.trim();
    }
  }
  return out;
}

async function handleInspectKeys(
  bodyText: string,
  isPost: boolean,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    if (isPost) {
      let body: Record<string, unknown> = {};
      try { body = JSON.parse(bodyText || '{}'); } catch { body = {}; }
      const { provider, slot, model } = body as {
        provider?: string;
        slot?: number;
        model?: string;
      };
      const looksLikeSave =
        provider !== undefined || slot !== undefined || model !== undefined;
      if (looksLikeSave) {
        if (!isAITestProvider(provider)) {
          return json({ success: false, error: 'invalid provider' }, 400);
        }
        const slotNum = Number(slot);
        if (![1, 2, 3].includes(slotNum)) {
          return json({ success: false, error: 'invalid slot' }, 400);
        }
        const trimmed = typeof model === 'string' ? model.trim() : '';
        const catalog = await loadAITestModelCatalog(getServiceClient());
        if (!trimmed || !isAllowedAITestModelDynamic(provider, trimmed, catalog)) {
          return json({
            success: false,
            error: 'model is not in the allow-list for this provider',
            allowed: catalog.allowlist[provider],
          }, 400);
        }
        let merged: Record<string, string>;
        try {
          merged = await saveSlotModel(provider, slotNum as 1 | 2 | 3, trimmed);
        } catch (err) {
          return json({
            success: false,
            error: err instanceof Error ? err.message : String(err),
          }, 500);
        }
        return json({
          success: true,
          provider,
          slot: slotNum,
          model: trimmed,
          slotModels: merged,
        });
      }
    }

    // ── GET (default) / empty POST: inspect all 9 slots + return allow-list ─
    const [saved, catalog] = await Promise.all([
      loadSavedSlotModels(),
      loadAITestModelCatalog(getServiceClient()),
    ]);
    const modelFor = (provider: AITestProvider, slot: 1 | 2 | 3): string => {
      const v = saved[slotKey(provider, slot)];
      return v && isAllowedAITestModelDynamic(provider, v, catalog)
        ? v
        : AI_TEST_DEFAULT_MODELS[provider];
    };

    const keys: Array<{
      provider: AITestProvider;
      slot: 1 | 2 | 3;
      configured: boolean;
      masked: string | null;
      model: string;
      envName: string;
    }> = [];

    for (const slot of [1, 2, 3] as const) {
      const raw = Deno.env.get(`OPENROUTER_KEY_${slot}`)?.trim();
      keys.push({
        provider: 'openrouter',
        slot,
        configured: !!raw,
        masked: maskKey(raw),
        model: modelFor('openrouter', slot),
        envName: `OPENROUTER_KEY_${slot}`,
      });
    }

    for (const slot of [1, 2, 3] as const) {
      const raw = Deno.env.get(`GROQ_KEY_${slot}`)?.trim();
      keys.push({
        provider: 'groq',
        slot,
        configured: !!raw,
        masked: maskKey(raw),
        model: modelFor('groq', slot),
        envName: `GROQ_KEY_${slot}`,
      });
    }

    for (const slot of [1, 2, 3] as const) {
      let raw: string | undefined;
      let envName: string;
      if (slot === 1) {
        const primary = Deno.env.get('DEEPSEEK_KEY')?.trim();
        const fallback = Deno.env.get('DEEPSEEK_KEY_1')?.trim();
        raw = primary || fallback;
        envName = 'DEEPSEEK_KEY';
      } else {
        raw = Deno.env.get(`DEEPSEEK_KEY_${slot}`)?.trim();
        envName = `DEEPSEEK_KEY_${slot}`;
      }
      keys.push({
        provider: 'deepseek',
        slot,
        configured: !!raw,
        masked: maskKey(raw),
        model: modelFor('deepseek', slot),
        envName,
      });
    }

    const modelOptions: Record<AITestProvider, string[]> = {
      openrouter: catalog.allowlist.openrouter,
      groq: catalog.allowlist.groq,
      deepseek: catalog.allowlist.deepseek,
    };

    return json({
      success: true,
      keys,
      modelOptions,
      modelOptionsDetailed: catalog.detailed,
      modelCatalogRefreshedAt: catalog.lastRefreshedAt,
      modelCatalogProviderMeta: catalog.providerMeta,
      defaultModels: AI_TEST_DEFAULT_MODELS,
      slotModels: saved,
    });
  } catch (err) {
    return json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }, 500);
  }
}

// ============================================================================
// refresh-ai-test-models (verbatim handler)
// ============================================================================
const FETCH_TIMEOUT_MS = 15_000;

interface ProviderResult {
  provider: AITestProvider;
  fetchOk: boolean;
  fetchError?: string;
  modelCount: number;
  fetchedAt: string;
  models: CuratedModel[];
}

async function refreshProvider(
  provider: AITestProvider,
  url: string,
  apiKey: string | undefined,
  curate: (raw: unknown) => CuratedModel[],
): Promise<ProviderResult> {
  const fetchedAt = new Date().toISOString();
  if (!apiKey && provider !== 'openrouter') {
    return {
      provider,
      fetchOk: false,
      fetchError: `No API key configured for ${provider}; skipped.`,
      modelCount: 0,
      fetchedAt,
      models: [],
    };
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://thewise.cloud';
    headers['X-Title'] = 'WiseResume';
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return {
        provider,
        fetchOk: false,
        fetchError: `HTTP ${res.status}: ${body.slice(0, 200)}`,
        modelCount: 0,
        fetchedAt,
        models: [],
      };
    }
    const json: unknown = await res.json();
    const models = curate(json);
    return {
      provider,
      fetchOk: true,
      modelCount: models.length,
      fetchedAt,
      models,
    };
  } catch (err) {
    return {
      provider,
      fetchOk: false,
      fetchError: err instanceof Error ? err.message : String(err),
      modelCount: 0,
      fetchedAt,
      models: [],
    };
  } finally {
    clearTimeout(timer);
  }
}

async function loadExistingCatalog(): Promise<CuratedAllowlist> {
  const empty: CuratedAllowlist = {
    lastRefreshedAt: '',
    providers: {
      openrouter: { fetchedAt: '', fetchOk: false, models: [] },
      groq: { fetchedAt: '', fetchOk: false, models: [] },
      deepseek: { fetchedAt: '', fetchOk: false, models: [] },
    },
  };
  try {
    const db = getServiceClient();
    const { data, error } = await db
      .from('app_settings')
      .select('value')
      .eq('key', AI_TEST_MODEL_ALLOWLIST_KEY)
      .maybeSingle();
    if (error || !data) return empty;
    const v = (data as { value?: unknown }).value;
    if (!v || typeof v !== 'object' || Array.isArray(v)) return empty;
    const parsed = v as Partial<CuratedAllowlist>;
    if (!parsed.providers || typeof parsed.providers !== 'object') return empty;
    for (const p of ['openrouter', 'groq', 'deepseek'] as const) {
      const e = (parsed.providers as Record<string, unknown>)[p];
      if (e && typeof e === 'object' && !Array.isArray(e)) {
        const ent = e as CuratedProviderEntry;
        if (Array.isArray(ent.models)) {
          empty.providers[p] = {
            fetchedAt: typeof ent.fetchedAt === 'string' ? ent.fetchedAt : '',
            fetchOk: ent.fetchOk === true,
            models: ent.models,
          };
        }
      }
    }
    if (typeof parsed.lastRefreshedAt === 'string') {
      empty.lastRefreshedAt = parsed.lastRefreshedAt;
    }
    return empty;
  } catch {
    return empty;
  }
}

function mergeProviderResult(
  existing: CuratedProviderEntry,
  fresh: ProviderResult,
): CuratedProviderEntry {
  if (fresh.fetchOk) {
    return {
      fetchedAt: fresh.fetchedAt,
      fetchOk: true,
      models: fresh.models,
    };
  }
  return {
    fetchedAt: existing.fetchedAt || fresh.fetchedAt,
    fetchOk: false,
    fetchError: fresh.fetchError,
    models: existing.models,
  };
}

async function handleRefreshTestModels(
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const openRouterKey = Deno.env.get('OPENROUTER_KEY_1')?.trim();
    const groqKey = Deno.env.get('GROQ_KEY_1')?.trim();
    const deepSeekKey = (Deno.env.get('DEEPSEEK_KEY')?.trim()
                      || Deno.env.get('DEEPSEEK_KEY_1')?.trim());

    const [openrouter, groq, deepseek] = await Promise.all([
      refreshProvider('openrouter', 'https://openrouter.ai/api/v1/models', openRouterKey, curateOpenRouter),
      refreshProvider('groq', 'https://api.groq.com/openai/v1/models', groqKey, curateGroq),
      refreshProvider('deepseek', 'https://api.deepseek.com/v1/models', deepSeekKey, curateDeepSeek),
    ]);

    const existing = await loadExistingCatalog();
    const providers: Record<AITestProvider, CuratedProviderEntry> = {
      openrouter: mergeProviderResult(existing.providers.openrouter, openrouter),
      groq: mergeProviderResult(existing.providers.groq, groq),
      deepseek: mergeProviderResult(existing.providers.deepseek, deepseek),
    };

    const payload: CuratedAllowlist = {
      lastRefreshedAt: new Date().toISOString(),
      providers,
    };

    const db = getServiceClient();
    const { error: writeErr } = await db
      .from('app_settings')
      .upsert({
        key: AI_TEST_MODEL_ALLOWLIST_KEY,
        value: payload,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });

    if (writeErr) {
      return json({
        success: false,
        error: `Failed to persist allow-list: ${writeErr.message}`,
        results: [openrouter, groq, deepseek],
      }, 500);
    }

    return json({
      success: true,
      lastRefreshedAt: payload.lastRefreshedAt,
      results: [openrouter, groq, deepseek].map(r => ({
        provider: r.provider,
        fetchOk: r.fetchOk,
        fetchError: r.fetchError,
        modelCount: r.modelCount,
      })),
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }, 500);
  }
}

// ============================================================================
// Router
// ============================================================================
function pickAction(req: Request, bodyText: string): RouterAction | null {
  // Header is checked first because it's how the web helper dispatches
  // `caps` and `routing` (whose handlers read body.action for inner
  // sub-routing — clobbering it would break parity). The web helper sends
  // BOTH header and body.action for spec compliance; either is sufficient.
  const headerVal = req.headers.get('x-admin-ai-op');
  if (headerVal && ROUTER_ACTIONS.has(headerVal as RouterAction)) {
    return headerVal as RouterAction;
  }
  if (bodyText) {
    try {
      const parsed = JSON.parse(bodyText);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const a = (parsed as Record<string, unknown>).action;
        if (typeof a === 'string' && ROUTER_ACTIONS.has(a as RouterAction)) {
          return a as RouterAction;
        }
      }
    } catch {
      // soft-parse only
    }
  }
  return null;
}

Deno.serve(wrapHandler('admin-ai-ops', async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Buffer the body once as text; each handler does its own JSON.parse so
  // its original parse-vs-validation semantics are preserved byte-for-byte.
  let bodyText = '';
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    try {
      bodyText = await req.text();
    } catch {
      bodyText = '';
    }
  }
  const isGet = req.method === 'GET';
  const isPost = req.method === 'POST';

  const action = pickAction(req, bodyText);
  if (!action) {
    // Auth still runs before unknown-action 400 so unauthenticated callers
    // get the canonical 401 envelope, matching every original.
    try {
      await requireAdminAuth(req, corsHeaders);
    } catch (authErr) {
      if (authErr instanceof Response) return authErr;
      throw authErr;
    }
    return new Response(
      JSON.stringify({ success: false, error: 'Unknown action. Expected one of: caps, routing, inspect-keys, refresh-test-models.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Auth gate. refresh-test-models keeps its dual-mode auth (cron secret
  // OR admin) so the nightly pg_cron caller still works. All other actions
  // use the single requireAdminAuth gate at the top.
  try {
    if (action === 'refresh-test-models' && req.headers.get('x-cron-secret')) {
      requireCronSecret(req, corsHeaders);
    } else {
      await requireAdminAuth(req, corsHeaders);
    }
  } catch (authErr) {
    if (authErr instanceof Response) return authErr;
    throw authErr;
  }

  switch (action) {
    case 'caps':                 return await handleCaps(bodyText, isGet, corsHeaders);
    case 'routing':              return await handleRouting(bodyText, isGet, corsHeaders);
    case 'inspect-keys':         return await handleInspectKeys(bodyText, isPost, corsHeaders);
    case 'refresh-test-models':  return await handleRefreshTestModels(corsHeaders);
  }
}));
