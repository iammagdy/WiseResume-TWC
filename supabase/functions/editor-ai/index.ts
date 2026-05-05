// editor-ai — consolidated router for 4 Editor AI functions.
//
// Consolidates analyze-resume, recruiter-simulation, suggest-template, and
// optimize-for-linkedin into a single Edge Function. All sub-handlers use
// featureName: 'editor-ai' so a single ai_routing_config row controls the
// provider for all 4 actions. The original 4 functions remain deployed for
// rollback: reverting USE_MERGED_EDITOR_AI in edgeFunctions.ts restores
// direct calls without redeploying.
//
// Dispatch
// ────────
//   - Primary: x-editor-ai-action header (recommended — avoids body.action
//     collision in callers that already use body.action for their own routing)
//   - Fallback: top-level body.action field
//
// Auth
// ────
// requireAuth runs ONCE at the router boundary BEFORE body parsing.
// Per-handler rate-limit, credit-deduct, and refund-on-AI-error stay in
// each sub-handler so billing semantics are preserved per-action.
//
// Kill switch
// ───────────
// isKillSwitchActive('editor-ai') at the router level covers all 4 actions.
import { getCorsHeaders } from '../_shared/cors.ts';
import { isKillSwitchActive } from '../_shared/featureFlags.ts';
import { requireAuth, authErrorResponse } from '../_shared/authMiddleware.ts';
import { toUserError } from '../_shared/aiClient.ts';
import { checkPayloadSize } from '../_shared/requestUtils.ts';
import { checkSmokeBypass } from '../_shared/smokeTest.ts';
import { wrapHandler } from '../_shared/fnLogger.ts';
import { logger } from '../_shared/logger.ts';
import { handleAnalyze } from './analyze.ts';
import { handleRecruiterSim } from './recruiterSim.ts';
import { handleSuggestTemplate } from './suggestTemplate.ts';
import { handleOptimizeLinkedIn } from './optimizeLinkedIn.ts';

const log = logger('editor-ai');

type RouterAction = 'analyze' | 'recruiter-sim' | 'suggest-template' | 'optimize-for-linkedin';

const VALID_ACTIONS: ReadonlySet<RouterAction> = new Set([
  'analyze',
  'recruiter-sim',
  'suggest-template',
  'optimize-for-linkedin',
]);

function isRouterAction(value: unknown): value is RouterAction {
  return typeof value === 'string' && VALID_ACTIONS.has(value as RouterAction);
}

function resolveAction(req: Request, bodyText: string): RouterAction | null {
  const headerVal = req.headers.get('x-editor-ai-action');
  if (isRouterAction(headerVal)) return headerVal;

  if (!bodyText) return null;
  try {
    const parsed = JSON.parse(bodyText) as { action?: unknown };
    if (isRouterAction(parsed?.action)) return parsed.action;
  } catch {
    // Not valid JSON or no action field — sub-handler will reject with its own 400.
  }
  return null;
}

/** Action-specific synthetic responses for smoke-test bypass. */
function smokeResponse(action: string | null): Record<string, unknown> {
  switch (action) {
    case 'analyze':
      return { score: { overallScore: 80, skillsMatch: 75, atsCompatibility: 80 }, gaps: { missingKeywords: [], missingSkills: [] } };
    case 'recruiter-sim':
      return { success: true, analysis: { hireabilityScore: 75, overallVerdict: 'maybe_call', questionsIdAsk: [], redFlags: [], callMeFactors: [] } };
    case 'suggest-template':
      return { recommendedTemplateId: 'professional', customization: { accentColor: '#1e3a5f', fontHeading: 'Inter', fontBody: 'Inter', fontSize: 'medium', spacing: 'normal' }, reasoning: 'Smoke test.' };
    case 'optimize-for-linkedin':
      return { success: true, headlines: ['Experienced Professional | Results-Driven'], aboutSections: { short: 'Smoke test.', medium: 'Smoke test.', long: 'Smoke test.' }, experienceRewrites: [], suggestedSkills: [], keywords: [], tips: [] };
    default:
      return { function_name: 'editor-ai', action: action ?? 'unknown', result: { ok: true } };
  }
}

Deno.serve(wrapHandler('editor-ai', async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (await isKillSwitchActive('editor-ai')) {
    return new Response(
      JSON.stringify({ success: false, error: 'Feature temporarily unavailable' }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Smoke-test bypass — BEFORE requireAuth so the DevKit HMAC token in
  // Authorization: Bearer is consumed by admin auth, not mis-validated as a
  // Supabase JWT. Action-specific synthetic responses are returned.
  {
    const editorAction = req.headers.get('x-editor-ai-action');
    const smokeRes = await checkSmokeBypass(req, corsHeaders, 'editor-ai', smokeResponse(editorAction));
    if (smokeRes !== null) return smokeRes;
  }

  // Single auth gate — BEFORE body is consumed.
  let userId: string;
  try {
    const auth = await requireAuth(req);
    userId = auth.userId;
  } catch (authErr) {
    return authErrorResponse(authErr, req.headers.get('origin'));
  }

  // Payload size check — AFTER auth so oversized unauthenticated requests are
  // rejected as 401 before touching body buffering, matching resume-section-ai.
  const sizeError = checkPayloadSize(req, 500 * 1024);
  if (sizeError) {
    const text = await sizeError.text();
    return new Response(text, {
      status: sizeError.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Buffer body once at the router boundary.
  let bodyText = '';
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    try {
      bodyText = await req.text();
    } catch {
      bodyText = '';
    }
  }

  const action = resolveAction(req, bodyText);
  const _fnStart = Date.now();

  if (!action) {
    log.warn('invalid action', { function_name: 'editor-ai', provider_used: null, error_type: 'InvalidActionError', duration_ms: Date.now() - _fnStart });
    return new Response(
      JSON.stringify({
        error: 'invalid_action',
        message: "Missing or unknown action. Provide 'x-editor-ai-action' header or top-level body.action ∈ {analyze, recruiter-sim, suggest-template, optimize-for-linkedin}.",
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    let res: Response;
    switch (action) {
      case 'analyze':
        res = await handleAnalyze(req, userId, bodyText, corsHeaders);
        break;
      case 'recruiter-sim':
        res = await handleRecruiterSim(req, userId, bodyText, corsHeaders);
        break;
      case 'suggest-template':
        res = await handleSuggestTemplate(req, userId, bodyText, corsHeaders);
        break;
      case 'optimize-for-linkedin':
        res = await handleOptimizeLinkedIn(req, userId, bodyText, corsHeaders);
        break;
    }
    log.info('request completed', { function_name: 'editor-ai', provider_used: null, error_type: null, duration_ms: Date.now() - _fnStart, action });
    return res!;
  } catch (err) {
    log.error('Unhandled error', err, { function_name: 'editor-ai', provider_used: null, error_type: (err as Error)?.name ?? 'Error', duration_ms: Date.now() - _fnStart });
    const userError = toUserError(err);
    return new Response(
      JSON.stringify({ error: userError.message }),
      { status: userError.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
}));
