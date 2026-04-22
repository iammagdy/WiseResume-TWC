import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { callAI, getUserKeyAndUrlFromDB } from "../_shared/aiClient.ts";
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAuth, authErrorResponse } from '../_shared/authMiddleware.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getServiceClient } from '../_shared/dbClient.ts';
import { checkRateLimit } from '../_shared/rateLimiter.ts';
import { checkAndDeductCredit } from '../_shared/creditUtils.ts';
import { logger } from '../_shared/logger.ts';
import {
  WISERESUME_OPENROUTER_MODEL,
  WISERESUME_OPENROUTER2_MODEL,
  WISERESUME_GROQ_MODEL,
  LEGACY_GROQ_MODEL,
  LEGACY_OPENROUTER2_MODEL,
  BYOK_DEFAULT_MODELS,
} from '../_shared/modelDefaults.ts';
const log = logger('ai-test');


/**
 * ADMIN AUTH PATTERN FOR EDGE FUNCTIONS
 * ──────────────────────────────────────
 * All admin-gated edge functions use `requireAdminAuth` from
 * `_shared/adminAuth.ts`. It verifies a DevKit session token (HMAC-SHA-256,
 * issued by `verify-dev-kit`) from the `Authorization: Bearer <token>` header,
 * checks the token against the `admin_sessions` table, and confirms the
 * session email is in the ADMIN_EMAILS allow-list.
 *
 * Never use email-matching JWT checks (isJwtAdmin-style) in new functions.
 * Always import and call `requireAdminAuth(req, corsHeaders)` instead.
 */

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // ── Parse body first ─────────────────────────────────────────────────────
    // We need to inspect the body before choosing the auth mechanism: the
    // `wiseresumeSubProvider` field is exclusively for admin DevKit calls
    // and requires a different token (HMAC DevKit session) than regular user
    // requests (Supabase Bearer JWT).
    let checkOnly = false;
    let bodySubProvider: 'openrouter' | 'groq' | 'auto' | 'openrouter2' | undefined;
    let isAdminRequest = false;
    let rawBodySubProvider: unknown;
    // Task #24: per-request OpenRouter overrides forwarded from the DevKit
    // OpenRouter sub-panel so the admin's curated-model / Auto-fallback
    // selection drives the test call instead of the server-side defaults.
    let bodyOpenrouterModel: string | undefined;
    let bodyOpenrouterAuto = false;
    try {
      const text = await req.clone().text();
      if (text) {
        const body = JSON.parse(text);
        checkOnly = body?.checkOnly === true;
        rawBodySubProvider = body?.wiseresumeSubProvider;
        if (typeof body?.openrouterModel === 'string') {
          bodyOpenrouterModel = body.openrouterModel;
        }
        bodyOpenrouterAuto = body?.openrouterAuto === true;
      }
    } catch {
      // Ignore parse errors for empty/invalid bodies
    }

    // ── Auth: admin path vs regular-user path ────────────────────────────────
    // Admin sub-provider overrides use requireAdminAuth (HMAC DevKit session
    // token). All other requests use requireAuth (Supabase Bearer JWT).
    // This is the canonical admin-auth pattern — see _shared/adminAuth.ts.
    let userId: string;
    let supabaseAdmin: ReturnType<typeof getServiceClient>;

    if (rawBodySubProvider !== undefined) {
      const VALID_SUB_PROVIDERS = ['openrouter', 'groq', 'auto', 'openrouter2'] as const;
      type ValidSubProvider = typeof VALID_SUB_PROVIDERS[number];
      if (!VALID_SUB_PROVIDERS.includes(rawBodySubProvider as ValidSubProvider)) {
        return new Response(JSON.stringify({
          success: false,
          error: `Invalid wiseresumeSubProvider: ${JSON.stringify(rawBodySubProvider)}. Expected one of ${VALID_SUB_PROVIDERS.join(', ')}.`,
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // requireAdminAuth throws a Response (401/403/503) if the token is
      // missing, invalid, expired, revoked, or not in ADMIN_EMAILS.
      await requireAdminAuth(req, corsHeaders);
      bodySubProvider = rawBodySubProvider as ValidSubProvider;
      isAdminRequest = true;
      // Admin diagnostic requests bypass per-user rate limiting, cooldown,
      // and credit deduction (each guarded by isAdminRequest below).
      userId = 'admin';
      supabaseAdmin = getServiceClient();
    } else {
      const auth = await requireAuth(req);
      userId = auth.userId;
      supabaseAdmin = auth.client;
    }

    if (!isAdminRequest) {
      const { allowed } = await checkRateLimit(userId, { actionType: 'test_check', maxRequests: 10, windowSeconds: 60 });
      if (!allowed) {
        return new Response(JSON.stringify({ success: false, error: "Rate limit exceeded" }), { status: 429, headers: corsHeaders });
      }
    }

    // Get user's preferred provider (use service-role client for cross-project DB)
    const { data: prefs } = await supabaseAdmin
      .from('user_preferences')
      .select('ai_provider')
      .eq('user_id', userId)
      .maybeSingle();

    // When an admin body sub-provider is supplied (Dev Kit engine test),
    // force the WiseResume managed path regardless of the admin's own AI preference.
    const preferredProvider = bodySubProvider
      ? 'wiseresume'
      : (prefs?.ai_provider || 'wiseresume');

    // Determine WiseResume sub-provider:
    // body-provided value (admin Dev Kit override) takes priority;
    // otherwise fall back to the global wiseresume_ai_engine app setting.
    let wiseresumeSubProvider: 'openrouter' | 'groq' | 'auto' | 'openrouter2' = bodySubProvider ?? 'auto';
    if (!bodySubProvider) {
      const { data: engineRow } = await supabaseAdmin
        .from('app_settings')
        .select('value')
        .eq('key', 'wiseresume_ai_engine')
        .maybeSingle();
      const engineVal = engineRow?.value as string | undefined;
      if (engineVal === 'openrouter' || engineVal === 'groq' || engineVal === 'auto' || engineVal === 'openrouter2') {
        wiseresumeSubProvider = engineVal;
      }
    }

    // ===== Cooldown Check for WiseResume AI =====
    // Admin engine diagnostic requests bypass the cooldown so both engines can be tested sequentially.
    if (preferredProvider === 'wiseresume' && !isAdminRequest) {
      const COOLDOWN_SECONDS = 300; // 5 minutes
      console.log(`[ai-test] Checking cooldown for user: ${userId}`);
      
      const { data: lastTest, error: logError } = await supabaseAdmin
        .from('ai_usage_logs')
        .select('created_at')
        .eq('user_id', userId)
        .eq('action_type', 'test')
        .filter('metadata->>provider', 'eq', 'wiseresume')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (logError) {
        console.error('[ai-test] Error fetching usage logs:', logError);
      }

      if (lastTest) {
        const lastTestAt = new Date(lastTest.created_at).getTime();
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - lastTestAt) / 1000);
        console.log(`[ai-test] Last test was ${elapsedSeconds}s ago`);
        
        if (elapsedSeconds < COOLDOWN_SECONDS) {
          const secondsRemaining = COOLDOWN_SECONDS - elapsedSeconds;
          return new Response(JSON.stringify({
            success: false,
            reason: 'cooldown',
            secondsRemaining,
            cooldownEndsAt: new Date(lastTestAt + COOLDOWN_SECONDS * 1000).toISOString(),
            message: `Please wait ${Math.ceil(secondsRemaining / 60)} more minutes before testing again.`
          }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } else {
        console.log('[ai-test] No previous test found for WiseResume AI');
      }
    }

    // If checkOnly was requested and we passed the cooldown check, return OK
    if (checkOnly) {
      console.log('[ai-test] Cooldown check passed (checkOnly)');
      return new Response(JSON.stringify({ success: true, cooldownActive: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Set the expected model based on provider/sub-provider so admin diagnostics show accurate info.
    // For WiseResume managed: OpenRouter uses Gemma 4, Groq uses Qwen 3 32B.
    // For BYOK providers: read the stored model from DB; fall back to a safe per-provider default.
    // Model slug constants are centralised in _shared/modelDefaults.ts — update them there,
    // not here, to change which model is used.
    const BYOK_PROVIDERS_LIST = ['openai', 'anthropic', 'groq', 'mistral', 'xai', 'cohere', 'gemini', 'openrouter', 'ollama'];
    // Task #24: default to the curated default so any non-overridden test
    // path uses the same baseline as production routing.
    let testModel = WISERESUME_OPENROUTER_MODEL;
    let storedByokModel: string | null = null;

    if (BYOK_PROVIDERS_LIST.includes(preferredProvider)) {
      const byokData = await getUserKeyAndUrlFromDB(userId, preferredProvider);
      storedByokModel = byokData?.model || null;
      const defaultModel = BYOK_DEFAULT_MODELS[preferredProvider] || '';

      if (!storedByokModel && !defaultModel) {
        // Providers like OpenRouter/Ollama require a model to be explicitly set
        return new Response(JSON.stringify({
          success: false,
          error: `No model selected for ${preferredProvider}. Please choose a model in AI Settings before testing.`,
          latencyMs: Date.now() - startTime,
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      testModel = storedByokModel || defaultModel;
    } else if (preferredProvider === 'wiseresume') {
      if (wiseresumeSubProvider === 'groq') {
        testModel = WISERESUME_GROQ_MODEL;
      } else if (wiseresumeSubProvider === 'openrouter2') {
        testModel = WISERESUME_OPENROUTER2_MODEL;
      } else {
        testModel = WISERESUME_OPENROUTER_MODEL;
      }
    }

    // Credit enforcement: placed after cooldown, checkOnly, and model-validation branches
    // so that credits are only deducted when the actual AI call is guaranteed to proceed.
    // Admin diagnostic requests bypass credit deduction entirely.
    if (!isAdminRequest) {
      const creditCheck = await checkAndDeductCredit(userId);
      if (!creditCheck.hasCredits) {
        return new Response(
          JSON.stringify({ success: false, error: 'Daily AI credit limit reached. Upgrade your plan or use your own API key.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const identityMap: Record<string, string> = {
      wiseresume: "Hello! I'm Wise Resume AI",
      gemini: "Hello! I'm Gemini AI",
      ollama: "Hello! I'm Ollama AI",
      openrouter: "Hello! I'm OpenRouter AI",
      openai: "Hello! I'm OpenAI",
      anthropic: "Hello! I'm Claude",
      groq: "Hello! I'm Groq",
      mistral: "Hello! I'm Mistral AI",
      xai: "Hello! I'm Grok",
      cohere: "Hello! I'm Cohere",
    };
    const expectedGreeting = identityMap[preferredProvider] || identityMap.wiseresume;

    console.log(`[ai-test] Calling AI for provider: ${preferredProvider}, sub: ${wiseresumeSubProvider}, model: ${testModel}`);
    const aiResponse = await callAI({
      model: testModel,
      messages: [
        { role: 'system', content: `Reply with exactly this text and nothing else: "${expectedGreeting}"` },
        { role: 'user', content: 'Say hello and identify yourself.' },
      ],
      temperature: 0,
      maxTokens: 50,
      timeout: 20000,
      preferredProvider,
      wiseresumeSubProvider,
      // Task #24: forward DevKit OpenRouter sub-panel selection so the
      // managed openrouter sub-engine pins to the chosen curated slug,
      // or iterates the full curated chain when Auto is on.
      openrouterCuratedModel: bodyOpenrouterModel,
      openrouterAutoFallback: bodyOpenrouterAuto,
      userId,
    });

    const latencyMs = Date.now() - startTime;
    const providerUsed = aiResponse.providerUsed || preferredProvider;
    console.log(`[ai-test] AI responded in ${latencyMs}ms using ${providerUsed}`);

    // Task #24: when the routing layer reports the answering model in the
    // providerUsed suffix (formats: "openrouter:<slug>", "wiseresume/openrouter:<slug>",
    // "wiseresume/groq:<slug>", "wiseresume/openrouter2:<slug>"), surface
    // that as the source-of-truth model so the DevKit Test card shows the
    // ACTUAL slug that answered — not a request-time heuristic. This is
    // important for the curated/Auto chain where the answering model can
    // differ from the one the request was started with.
    const colonIdx = providerUsed.indexOf(':');
    if (colonIdx > -1 && colonIdx < providerUsed.length - 1) {
      const realModel = providerUsed.slice(colonIdx + 1).trim();
      if (realModel) testModel = realModel;
    } else if (preferredProvider === 'wiseresume' && wiseresumeSubProvider === 'auto') {
      // No suffix available — fall back to the legacy heuristic for the
      // auto path so older edge function deployments don't regress.
      if (providerUsed.includes('groq')) testModel = LEGACY_GROQ_MODEL;
      else if (providerUsed.includes('openrouter2')) testModel = LEGACY_OPENROUTER2_MODEL;
      else testModel = WISERESUME_OPENROUTER_MODEL;
    } else if (BYOK_PROVIDERS_LIST.includes(preferredProvider) && storedByokModel) {
      // BYOK path without suffix — fall back to the stored slug.
      testModel = storedByokModel;
    }

    // Log test call — skipped for admin diagnostic requests because userId is a
    // synthetic sentinel ('admin'), not a valid UUID, which would cause a silent
    // insert failure on UUID-typed user_id columns.
    if (!isAdminRequest) {
      const { error: insertError } = await supabaseAdmin.from('ai_usage_logs').insert({
        user_id: userId,
        action_type: 'test',
        metadata: {
          provider: providerUsed,
          model: testModel,
          latencyMs,
          response: (aiResponse.content?.trim() || 'OK').slice(0, 100),
          fallbackUsed: aiResponse.fallbackUsed || false,
        },
      });

      if (insertError) {
        console.error('[ai-test] Failed to log usage:', insertError);
      }
    }

    // Brand the response for WiseResume AI so clients never see raw sub-provider names
    const isWiseresumeMode = preferredProvider === 'wiseresume' && !bodySubProvider;
    const displayProvider = isWiseresumeMode ? 'WiseResume AI' : providerUsed;
    const displayModel = isWiseresumeMode ? 'WiseResume AI' : testModel;

    return new Response(JSON.stringify({
      success: true,
      providerUsed,
      displayProvider,
      displayModel,
      latencyMs,
      response: aiResponse.content?.trim() || 'OK',
      model: testModel,
      fallbackUsed: aiResponse.fallbackUsed || false,
      fallbackReason: aiResponse.fallbackReason || null,
      // Task #18: echo back the sub-provider that was actually used so the
      // client can verify the response matches the tab the admin clicked.
      // `requestedSubProvider` is non-null only for admin Dev Kit overrides.
      wiseresumeSubProvider,
      requestedSubProvider: bodySubProvider ?? null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    log.error('Unhandled error', err);
    // requireAdminAuth throws a fully-formed Response — return it as-is.
    if (err instanceof Response) return err;
    // AuthError (from requireAuth) — wrap with CORS headers.
    if (typeof err === 'object' && err !== null && 'status' in err) {
      return authErrorResponse(err, req.headers.get('origin'));
    }
    const latencyMs = Date.now() - startTime;
    // Surface typed AIError details so the client can render an actionable
    // message ("OpenRouter rate limited", "Managed credits exhausted", etc.)
    // instead of a generic "internal". The .type / .status / .attempts fields
    // are produced by createAIError() inside callWiseresumeAI / callAI and are
    // the only way the front-end can distinguish a 503 fallback exhaustion
    // from a 401 bad key from a 408 timeout — all of which surfaced as
    // "internal" before this change.
    const e = err as Partial<{ type: string; status: number; message: string; attempts: unknown[] }> & { message?: string };
    const errType = typeof e?.type === 'string' ? e.type : 'internal';
    const errStatus = typeof e?.status === 'number' ? e.status : 500;
    const errMessage = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({
      success: false,
      error: errMessage,
      reason: errType,
      message: errMessage,
      attempts: Array.isArray(e?.attempts) ? e.attempts : undefined,
      latencyMs,
    }), {
      status: errStatus >= 400 && errStatus < 600 ? errStatus : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
