// refresh-ai-test-models: refresh the curated DevKit "Send test request"
// model allow-list by fetching each provider's `/models` endpoint and
// persisting the result in `app_settings.ai_test_model_allowlist`.
//
// Auth posture: dual-mode (service-to-service AND admin-on-demand).
//   Cron / service callers: supply CRON_SECRET in `x-cron-secret`.
//   Admins: invoke from the DevKit with the standard admin auth header.
//   At least one of the two must validate or the request is rejected 401.
//
// Designed to be called nightly by pg_cron, but admins can also invoke
// it on-demand from the DevKit AI Keys panel (e.g. when a provider
// announces a new model and they want it in the dropdown immediately).
//
// Idempotency: writes to a single app_settings row; running the function
// multiple times in quick succession is safe (the row is replaced atomically).

import { getServiceClient } from '../_shared/dbClient.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { wrapHandler } from '../_shared/fnLogger.ts';
import { requireCronSecret } from '../_shared/webhookAuth.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import {
  AI_TEST_MODEL_ALLOWLIST_KEY,
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

const FETCH_TIMEOUT_MS = 15_000;

interface ProviderResult {
  provider: AITestProvider;
  fetchOk: boolean;
  fetchError?: string;
  modelCount: number;
  fetchedAt: string;
  models: CuratedModel[];
}

/**
 * Authenticate the caller as either a cron job (x-cron-secret) or an
 * authenticated admin. Returns void on success; throws a Response on
 * failure that the top-level handler will return as-is.
 *
 * Admin auth is tried only if the cron header is absent — this keeps the
 * common cron path fast (no DB roundtrip for admin lookup) while still
 * letting an admin manually trigger a refresh from the DevKit panel.
 */
async function authenticate(req: Request, corsHeaders: Record<string, string>): Promise<void> {
  if (req.headers.get('x-cron-secret')) {
    requireCronSecret(req, corsHeaders);
    return;
  }
  await requireAdminAuth(req, corsHeaders);
}

/**
 * Fetch and curate one provider's `/models` endpoint with a hard timeout.
 * Errors are caught and returned as a structured `ProviderResult` so a
 * single upstream outage cannot block the other two providers from
 * refreshing.
 */
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

Deno.serve(wrapHandler('refresh-ai-test-models', async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    try {
      await authenticate(req, corsHeaders);
    } catch (resp) {
      if (resp instanceof Response) return resp;
      throw resp;
    }

    // Pull the API keys we need for the auth-required `/models` endpoints.
    // OpenRouter exposes its model list publicly, but Groq and DeepSeek both
    // require a Bearer token. We use slot 1 for each since it's the canonical
    // env name and is the most likely to be configured.
    const openRouterKey = Deno.env.get('OPENROUTER_KEY_1')?.trim();
    const groqKey = Deno.env.get('GROQ_KEY_1')?.trim();
    const deepSeekKey = (Deno.env.get('DEEPSEEK_KEY')?.trim()
                      || Deno.env.get('DEEPSEEK_KEY_1')?.trim());

    const [openrouter, groq, deepseek] = await Promise.all([
      refreshProvider(
        'openrouter',
        'https://openrouter.ai/api/v1/models',
        openRouterKey,
        curateOpenRouter,
      ),
      refreshProvider(
        'groq',
        'https://api.groq.com/openai/v1/models',
        groqKey,
        curateGroq,
      ),
      refreshProvider(
        'deepseek',
        'https://api.deepseek.com/v1/models',
        deepSeekKey,
        curateDeepSeek,
      ),
    ]);

    // Build the catalog payload. We only persist `models` for providers that
    // returned at least one entry — keeping a stale fetch's old models in
    // the row is preferable to clobbering them with an empty array on a
    // single upstream blip.
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
}));

/**
 * Read the current persisted catalog row so we can preserve the previous
 * fetch's models when a single provider's refresh fails. Returns an
 * empty-but-shaped object when no row exists yet.
 */
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

/**
 * Decide what to persist for one provider given the existing row and the
 * fresh refresh result. Successful refreshes always win; a failed refresh
 * keeps the previous fetch's models so the dropdown doesn't suddenly empty.
 */
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
  // Fetch failed — keep the previous models but record the new error so
  // the UI can show a "stale catalog" hint.
  return {
    fetchedAt: existing.fetchedAt || fresh.fetchedAt,
    fetchOk: false,
    fetchError: fresh.fetchError,
    models: existing.models,
  };
}
