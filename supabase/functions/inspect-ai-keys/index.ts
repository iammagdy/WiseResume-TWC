import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/dbClient.ts';
import { wrapHandler } from '../_shared/fnLogger.ts';
import {
  AI_TEST_DEFAULT_MODELS,
  AI_TEST_MODEL_ALLOWLIST,
  isAITestProvider,
  isAllowedAITestModel,
  type AITestProvider,
} from '../_shared/modelDefaults.ts';

/**
 * Admin-only endpoint that reports which of the 9 AI keys are present on
 * the server (3 OpenRouter + 3 Groq + 3 DeepSeek), with a tail-only mask
 * preview. The raw key value is NEVER returned.
 *
 * DeepSeek slot 1 resolves from DEEPSEEK_KEY first, then DEEPSEEK_KEY_1.
 * The envName returned for slot 1 is always "DEEPSEEK_KEY" (canonical name)
 * regardless of which env var is actually populated.
 *
 * Per-slot test model selection is persisted in the `app_settings` row keyed
 * by `ai_test_slot_models` — a JSON object of the shape:
 *   { "openrouter:1": "model/x", "groq:2": "model/y", ... }
 * Supabase remains the sole source of truth; nothing about the selection is
 * cached on the client beyond the in-memory React state.
 *
 * Methods:
 *   GET  → { success: true, keys: [...], modelOptions: {...}, defaultModels: {...} }
 *   POST → { provider, slot, model } persists one slot's selected model.
 *
 * Response shape (GET):
 *   {
 *     success: true,
 *     keys: [{ provider, slot, configured, masked, model, envName }],
 *     modelOptions: { openrouter: [...], groq: [...], deepseek: [...] },
 *     defaultModels: { openrouter: "...", groq: "...", deepseek: "..." }
 *   }
 */

const SLOT_MODELS_KEY = 'ai_test_slot_models';

function mask(value: string | undefined): string | null {
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

/**
 * Atomically merge one slot's model selection into app_settings.ai_test_slot_models.
 *
 * Uses the `set_ai_test_slot_model(p_slot_key, p_model)` SQL function (added
 * in migration 20260517000001) which performs an `INSERT … ON CONFLICT DO
 * UPDATE` with a single JSONB `||` merge. This preserves keys for other
 * slots so two concurrent admin updates to *different* slots can no longer
 * lose each other's writes.
 *
 * Returns the post-merge map so the caller can echo canonical state back
 * to the client without a second DB roundtrip.
 */
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

Deno.serve(wrapHandler("inspect-ai-keys", async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    try {
      await requireAdminAuth(req, corsHeaders);
    } catch (authErr) {
      if (authErr instanceof Response) return authErr;
      throw authErr;
    }

    // ── POST: persist a single slot's selected model ──────────────────────
    // The supabase-js `functions.invoke()` helper defaults to POST even when
    // the caller doesn't pass a body — so the existing "fetch all keys"
    // call from AIKeySlotPanels.fetchKeys() arrives here as POST with an
    // empty body. We only treat a POST as a save when ALL save fields are
    // present; otherwise we fall through to the read/inspect path so old
    // callers keep working without a frontend change.
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
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
        if (!trimmed || !isAllowedAITestModel(provider, trimmed)) {
          return json({
            success: false,
            error: 'model is not in the allow-list for this provider',
            allowed: AI_TEST_MODEL_ALLOWLIST[provider],
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
        // Echo the canonical post-merge map so the UI can reconcile against
        // any concurrent edits to other slots that landed between fetches.
        return json({
          success: true,
          provider,
          slot: slotNum,
          model: trimmed,
          slotModels: merged,
        });
      }
      // empty POST → fall through to GET-style inspect response.
    }

    // ── GET (default) / empty POST: inspect all 9 slots + return allow-list ─
    const saved = await loadSavedSlotModels();
    const modelFor = (provider: AITestProvider, slot: 1 | 2 | 3): string => {
      const v = saved[slotKey(provider, slot)];
      return v && isAllowedAITestModel(provider, v) ? v : AI_TEST_DEFAULT_MODELS[provider];
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
        masked: mask(raw),
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
        masked: mask(raw),
        model: modelFor('groq', slot),
        envName: `GROQ_KEY_${slot}`,
      });
    }

    // DeepSeek: slot 1 checks DEEPSEEK_KEY first, then DEEPSEEK_KEY_1.
    // Always display "DEEPSEEK_KEY" for slot 1 regardless of which env var
    // is actually set, since that is the canonical name shown in docs.
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
        masked: mask(raw),
        model: modelFor('deepseek', slot),
        envName,
      });
    }

    return json({
      success: true,
      keys,
      modelOptions: AI_TEST_MODEL_ALLOWLIST,
      defaultModels: AI_TEST_DEFAULT_MODELS,
    });
  } catch (err) {
    return json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }, 500);
  }
}));
